"""School Edition API. All student access is a bearer case code, never a cookie."""

import os, secrets, hmac, hashlib, json, time, re, base64
from datetime import timedelta, timezone
from fastapi import (
    FastAPI,
    Request,
    Response,
    Depends,
    HTTPException,
    Form,
    File,
    UploadFile,
)
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy import select, delete, func, case as sqlcase
from sqlalchemy.orm import Session as DB
from .db import get_db
from .config import settings
from .models import *
from .schemas import *
from .security import passwords, digest, token, encrypt, decrypt
from . import storage

app = FastAPI(
    title="Anonymous Witness — School Edition",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
DUMMY = passwords.hash(token())


def aware(d):
    return d.replace(tzinfo=timezone.utc) if d.tzinfo is None else d


@app.exception_handler(RequestValidationError)
async def invalid(request, exc):
    return JSONResponse({"detail": "Please check the form fields"}, status_code=422)


@app.middleware("http")
async def safety(request, call_next):
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        allowed = {settings.allowed_origin} | {
            v.strip() for v in settings.allowed_origins.split(",") if v.strip()
        }
        for k in ("VERCEL_URL", "VERCEL_PROJECT_PRODUCTION_URL"):
            host = os.getenv(k, "")
            if host.endswith(".vercel.app") and "/" not in host:
                allowed.add("https://" + host)
        if (
            request.headers.get("x-witness-request") != "1"
            or request.headers.get("origin", settings.allowed_origin) not in allowed
        ):
            return JSONResponse({"detail": "Request origin rejected"}, status_code=403)
    response = await call_next(request)
    response.headers.update(
        {
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "no-referrer",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        }
    )
    if settings.secure_cookies:
        response.headers["Strict-Transport-Security"] = "max-age=31536000"
    return response


def audit(db, user, action, target=""):
    db.add(AuditLog(actor=user.username, action=action, target=target))


def rate(db, scope, identifier, limit, seconds=900):
    # Never derive this key from IP, user agent, device, fingerprint or a student cookie.
    db.execute(delete(RateLimit).where(RateLimit.expires_at < now()))
    from sqlalchemy.dialects.postgresql import insert as pg
    from sqlalchemy.dialects.sqlite import insert as sq

    insert = pg if db.bind.dialect.name == "postgresql" else sq
    key = digest(scope + ":" + identifier)
    expiry = now() + timedelta(seconds=seconds)
    stmt = insert(RateLimit).values(key=key, count=1, expires_at=expiry)
    stmt = stmt.on_conflict_do_update(
        index_elements=["key"],
        set_={
            "count": sqlcase(
                (RateLimit.expires_at < now(), 1), else_=RateLimit.count + 1
            ),
            "expires_at": sqlcase(
                (RateLimit.expires_at < now(), expiry), else_=RateLimit.expires_at
            ),
        },
    ).returning(RateLimit.count)
    count = db.execute(stmt).scalar_one()
    db.commit()
    if count > limit:
        raise HTTPException(
            429,
            "Too many attempts. Please try again later.",
            headers={"Retry-After": str(seconds)},
        )


def normalize(code):
    return re.sub(r"[\s-]", "", code).upper()


def new_code():
    return "-".join(
        "".join(secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(4))
        for _ in range(4)
    )


def challenge():
    value = str(int(time.time())) + "." + secrets.token_hex(12)
    return value + "." + digest("challenge:" + value)


def check_challenge(db, value, proof, honeypot):
    try:
        ts, nonce, signature = value.split(".")
        assert 0 <= time.time() - int(ts) < 300 and hmac.compare_digest(
            signature, digest("challenge:" + ts + "." + nonce)
        )
        assert proof.isdigit() and len(proof) < 12 and not honeypot
        assert (
            hashlib.sha256((value + ":" + proof).encode())
            .hexdigest()
            .startswith("0000")
        )
    except Exception:
        raise HTTPException(422, "Please refresh the form and try again")
    rate(db, "challenge", value, 1, 300)


def session(request, db, kind):
    raw = request.cookies.get("aw_" + kind, "")
    s = db.get(StaffSession, digest(raw)) if raw else None
    if not s or aware(s.expires_at) < now():
        raise HTTPException(401, "Please sign in again")
    u = db.get(Officer, s.officer_id)
    if not u or not u.active or u.role != kind:
        raise HTTPException(401, "Please sign in again")
    if request.method not in ("GET", "HEAD") and not hmac.compare_digest(
        s.csrf_hash, digest(request.headers.get("x-csrf-token", ""))
    ):
        raise HTTPException(403, "Invalid security token. Please sign in again")
    return u, s


def staff(request: Request, db: DB = Depends(get_db)):
    kind = "owner" if request.url.path.startswith("/api/owner") else "officer"
    u, s = session(request, db, kind)
    if u.must_change_password and request.url.path not in (
        "/api/" + kind + "/me",
        "/api/" + kind + "/password",
        "/api/" + kind + "/logout",
    ):
        raise HTTPException(403, "Change your temporary password first")
    return u


def school_ids(db, u):
    return list(
        db.scalars(
            select(OfficerSchool.school_id).where(OfficerSchool.officer_id == u.id)
        )
    )


def scoped_case(db, u, case_id):
    if u.role != "officer":
        raise HTTPException(403, "Officer access required")
    row = db.scalar(
        select(Case)
        .where(Case.id == case_id, Case.school_id.in_(school_ids(db, u)))
        .with_for_update()
    )
    if not row:
        raise HTTPException(404, "Case not found")
    return row


def student_case(request, db):
    code = normalize(request.headers.get("x-case-code", ""))
    if not re.fullmatch(r"[A-HJ-NP-Z2-9]{16}", code):
        raise HTTPException(401, "Invalid Case Code")
    row = db.scalar(
        select(Case)
        .where(Case.case_code_hash == digest("case:" + code))
        .with_for_update()
    )
    if not row:
        raise HTTPException(401, "Invalid Case Code")
    return row


def case_view(db, row, internal=False):
    school = db.get(School, row.school_id)
    messages = db.scalars(
        select(Message)
        .where(Message.case_id == row.id)
        .order_by(Message.created_at, Message.id)
    ).all()
    result = {
        "id": row.id,
        "school": school.name,
        "school_id": school.id,
        "role": row.role,
        "status": row.status,
        "created_at": row.created_at,
        "unanswered": row.unanswered,
        "messages": [
            {
                "id": m.id,
                "sender": m.sender,
                "text": decrypt(m.body, "message:" + row.id),
                "created_at": m.created_at,
                "attachment": (
                    {"id": m.id, "mime": m.mime_type, "size": m.attachment_size}
                    if m.attachment
                    else None
                ),
            }
            for m in messages
        ],
    }
    if internal:
        result["notes"] = [
            {
                "id": n.id,
                "text": decrypt(n.body, "note:" + row.id),
                "created_at": n.created_at,
            }
            for n in db.scalars(
                select(Note).where(Note.case_id == row.id).order_by(Note.created_at)
            )
        ]
    return result


def notify(db, school_id):
    for officer_id in db.scalars(
        select(OfficerSchool.officer_id)
        .join(Officer, Officer.id == OfficerSchool.officer_id)
        .where(OfficerSchool.school_id == school_id, Officer.active == True)
    ):
        db.add(Notification(school_id=school_id, officer_id=officer_id))


def deliver_notifications(db, only=None):
    if not settings.vapid_private_key:
        return
    from pywebpush import webpush, WebPushException

    query = (
        select(Notification)
        .where(Notification.delivered_at.is_(None), Notification.attempts < 5)
        .order_by(Notification.created_at)
        .limit(10)
    )
    if only:
        query = query.where(Notification.officer_id == only)
    for n in db.scalars(query).all():
        subscriptions = db.scalars(
            select(PushSubscription).where(PushSubscription.officer_id == n.officer_id)
        ).all()
        if not subscriptions:
            continue
        n.attempts += 1
        success = False
        for sub in subscriptions:
            try:
                payload = {
                    "title": "New message for School "
                    + db.get(School, n.school_id).name,
                    "url": "/officer",
                }
                webpush(
                    subscription_info=json.loads(
                        decrypt(sub.encrypted_subscription, "push:" + sub.officer_id)
                    ),
                    data=json.dumps(payload),
                    vapid_private_key=settings.vapid_private_key,
                    vapid_claims={"sub": settings.vapid_subject},
                    timeout=3,
                )
                success = True
            except WebPushException as exc:
                if exc.response is not None and exc.response.status_code in (404, 410):
                    db.delete(sub)
            except Exception:
                pass
        if success:
            n.delivered_at = now()
    db.commit()


@app.get("/api/health")
def health(db: DB = Depends(get_db)):
    db.execute(select(1))
    return {"status": "ok", "edition": "school"}


@app.get("/api/public/config")
def public_config():
    return {
        "vapid_public_key": settings.vapid_public_key,
        "max_file_bytes": settings.max_file_bytes,
        "challenge": challenge(),
    }


@app.get("/api/schools")
def schools(db: DB = Depends(get_db)):
    return [
        {"id": s.id, "name": s.name, "number": s.number}
        for s in db.scalars(
            select(School).where(School.active == True).order_by(School.name)
        )
    ]


@app.post("/api/cases", status_code=201)
async def submit_case(
    request: Request,
    school_id: str = Form(...),
    text: str = Form(...),
    role: str = Form(""),
    challenge_token: str = Form(...),
    proof: str = Form(...),
    website: str = Form(""),
    attachment: UploadFile | None = File(None),
    db: DB = Depends(get_db),
):
    check_challenge(db, challenge_token, proof, website)
    school = db.get(School, school_id)
    if not school or not school.active:
        raise HTTPException(422, "Please select an active school")
    if role not in ("", "victim", "witness") or not 5 <= len(text.strip()) <= 10000:
        raise HTTPException(422, "Please check the message")
    if not db.scalar(
        select(Officer.id)
        .join(OfficerSchool, Officer.id == OfficerSchool.officer_id)
        .where(OfficerSchool.school_id == school_id, Officer.active == True)
    ):
        raise HTTPException(409, "This school is not ready to receive messages yet")
    rate(db, "school_submissions", school_id, 500, 3600)
    code = new_code()
    cid = uid()
    mid = uid()
    upload = None
    if attachment:
        content = await attachment.read(settings.max_file_bytes + 1)
        upload = storage.put_attachment(content, attachment.content_type, mid)
    try:
        row = Case(
            id=cid,
            school_id=school_id,
            case_code_hash=digest("case:" + normalize(code)),
            role=role or None,
        )
        db.add(row)
        db.flush()
        db.add(
            Message(
                id=mid,
                case_id=cid,
                sender="student",
                body=encrypt(text.strip(), "message:" + cid),
                attachment=upload[0] if upload else None,
                mime_type=upload[1] if upload else None,
                attachment_size=upload[2] if upload else None,
                attachment_hash=upload[3] if upload else None,
            )
        )
        notify(db, school_id)
        db.commit()
    except Exception:
        db.rollback()
        if upload:
            db.add(BlobDeletion(pathname=upload[0]))
            db.commit()
        raise
    deliver_notifications(db)
    return {"case_code": code}


@app.get("/api/student/case")
def own_case(request: Request, db: DB = Depends(get_db)):
    row = student_case(request, db)
    return case_view(db, row)


@app.post("/api/student/messages", status_code=201)
async def student_message(
    request: Request,
    text: str = Form(...),
    attachment: UploadFile | None = File(None),
    db: DB = Depends(get_db),
):
    row = student_case(request, db)
    if row.status == "Closed":
        raise HTTPException(409, "This case is closed")
    if not 1 <= len(text.strip()) <= 10000:
        raise HTTPException(422, "Please check the message")
    rate(db, "student_messages", row.case_code_hash, 40, 3600)
    mid = uid()
    upload = None
    if attachment:
        upload = storage.put_attachment(
            await attachment.read(settings.max_file_bytes + 1),
            attachment.content_type,
            mid,
        )
    try:
        db.add(
            Message(
                id=mid,
                case_id=row.id,
                sender="student",
                body=encrypt(text.strip(), "message:" + row.id),
                attachment=upload[0] if upload else None,
                mime_type=upload[1] if upload else None,
                attachment_size=upload[2] if upload else None,
                attachment_hash=upload[3] if upload else None,
            )
        )
        row.unanswered = True
        row.updated_at = now()
        notify(db, row.school_id)
        db.commit()
    except Exception:
        db.rollback()
        if upload:
            db.add(BlobDeletion(pathname=upload[0]))
            db.commit()
        raise
    deliver_notifications(db)
    return {"ok": True}


@app.post("/api/{kind}/login")
def login(
    kind: str,
    data: Login,
    request: Request,
    response: Response,
    db: DB = Depends(get_db),
):
    if kind not in ("officer", "owner"):
        raise HTTPException(404)
    username = data.username.strip().lower()
    rate(db, "login:" + kind, username, 8)
    u = db.scalar(
        select(Officer)
        .where(Officer.username == username, Officer.role == kind)
        .with_for_update()
    )
    try:
        valid = passwords.verify(u.password_hash if u else DUMMY, data.password)
    except Exception:
        valid = False
    if not valid or not u or not u.active:
        raise HTTPException(401, "Invalid username or password")
    if u.totp_secret:
        import pyotp

        step = int(time.time() // 30)
        totp = pyotp.TOTP(decrypt(u.totp_secret, "totp:" + u.id))
        matched = next(
            (
                n
                for n in (step - 1, step, step + 1)
                if n > u.last_totp_step
                and hmac.compare_digest(totp.at(n * 30), data.otp)
            ),
            None,
        )
        if matched is None:
            raise HTTPException(401, "Enter a valid authenticator code")
        u.last_totp_step = matched
    raw, csrf = token(), token()
    old = request.cookies.get("aw_" + kind)
    if old:
        db.execute(delete(StaffSession).where(StaffSession.id_hash == digest(old)))
    db.execute(delete(StaffSession).where(StaffSession.expires_at < now()))
    db.add(
        StaffSession(
            id_hash=digest(raw),
            officer_id=u.id,
            csrf_hash=digest(csrf),
            expires_at=now() + timedelta(minutes=settings.session_minutes),
        )
    )
    audit(db, u, "staff.login")
    db.commit()
    response.set_cookie(
        "aw_" + kind,
        raw,
        httponly=True,
        secure=settings.secure_cookies,
        samesite="strict",
        path="/api",
        max_age=settings.session_minutes * 60,
    )
    response.set_cookie(
        "aw_csrf_" + kind,
        csrf,
        secure=settings.secure_cookies,
        samesite="strict",
        path="/",
        max_age=settings.session_minutes * 60,
    )
    return {"role": u.role, "must_change_password": u.must_change_password}


@app.get("/api/officer/me")
@app.get("/api/owner/me")
def me(u: Officer = Depends(staff)):
    return {
        "username": u.username,
        "role": u.role,
        "must_change_password": u.must_change_password,
        "two_factor": bool(u.totp_secret),
    }


@app.post("/api/officer/logout")
@app.post("/api/owner/logout")
def logout(
    request: Request,
    response: Response,
    u: Officer = Depends(staff),
    db: DB = Depends(get_db),
):
    kind = u.role
    _, s = session(request, db, kind)
    db.delete(s)
    audit(db, u, "staff.logout")
    db.commit()
    response.delete_cookie("aw_" + kind, path="/api")
    response.delete_cookie("aw_csrf_" + kind, path="/")
    return {"ok": True}


@app.post("/api/officer/password")
@app.post("/api/owner/password")
def password_change(
    data: PasswordChange, u: Officer = Depends(staff), db: DB = Depends(get_db)
):
    rate(db, "password", u.id, 5)
    try:
        valid = passwords.verify(u.password_hash, data.current_password)
    except Exception:
        valid = False
    if not valid:
        raise HTTPException(401, "Current password is incorrect")
    if data.new_password == data.current_password:
        raise HTTPException(422, "Choose a different password")
    u.password_hash = passwords.hash(data.new_password)
    u.must_change_password = False
    db.execute(delete(StaffSession).where(StaffSession.officer_id == u.id))
    audit(db, u, "staff.password_changed")
    db.commit()
    return {"ok": True}


@app.post("/api/officer/2fa/setup")
@app.post("/api/owner/2fa/setup")
def two_factor_setup(
    request: Request, u: Officer = Depends(staff), db: DB = Depends(get_db)
):
    import pyotp

    if u.totp_secret:
        raise HTTPException(409, "Two-factor authentication is already enabled")
    secret = pyotp.random_base32()
    _, s = session(request, db, u.role)
    s.pending_totp = encrypt(secret, "pending:" + s.id_hash)
    db.commit()
    return {
        "secret": secret,
        "uri": pyotp.TOTP(secret).provisioning_uri(
            name=u.username, issuer_name="School Workspace"
        ),
    }


@app.post("/api/officer/2fa/enable")
@app.post("/api/owner/2fa/enable")
def two_factor_enable(
    request: Request,
    data: TwoFactorInput,
    u: Officer = Depends(staff),
    db: DB = Depends(get_db),
):
    import pyotp

    rate(db, "totp_enable", u.id, 8)
    _, s = session(request, db, u.role)
    if not s.pending_totp or not pyotp.TOTP(
        decrypt(s.pending_totp, "pending:" + s.id_hash)
    ).verify(data.code, valid_window=1):
        raise HTTPException(422, "Enter a valid authenticator code")
    u.totp_secret = encrypt(
        decrypt(s.pending_totp, "pending:" + s.id_hash), "totp:" + u.id
    )
    s.pending_totp = None
    audit(db, u, "staff.2fa_enabled")
    db.commit()
    return {"ok": True}


@app.get("/api/officer/cases")
def case_list(
    status: str = "", q: str = "", u: Officer = Depends(staff), db: DB = Depends(get_db)
):
    query = (
        select(Case, School.name)
        .join(School)
        .where(Case.school_id.in_(school_ids(db, u)))
        .order_by(Case.updated_at.desc())
    )
    if status:
        query = query.where(Case.status == status)
    rows = [
        {
            "id": c.id,
            "school": name,
            "role": c.role,
            "status": c.status,
            "created_at": c.created_at,
            "unanswered": c.unanswered,
        }
        for c, name in db.execute(query)
    ]
    if q:
        rows = [r for r in rows if q.lower() in (r["school"] + " " + r["id"]).lower()]
    deliver_notifications(db, u.id)
    return rows


@app.get("/api/officer/cases/{cid}")
def officer_case(cid: str, u: Officer = Depends(staff), db: DB = Depends(get_db)):
    row = scoped_case(db, u, cid)
    audit(db, u, "case.viewed", cid)
    result = case_view(db, row, True)
    db.commit()
    return result


@app.post("/api/officer/cases/{cid}/messages", status_code=201)
def officer_message(
    cid: str, data: TextInput, u: Officer = Depends(staff), db: DB = Depends(get_db)
):
    row = scoped_case(db, u, cid)
    if row.status == "Closed":
        raise HTTPException(409, "This case is closed")
    db.add(
        Message(
            case_id=cid, sender="officer", body=encrypt(data.text, "message:" + cid)
        )
    )
    row.unanswered = False
    row.updated_at = now()
    audit(db, u, "case.replied", cid)
    db.commit()
    return {"ok": True}


@app.post("/api/officer/cases/{cid}/notes", status_code=201)
def add_note(
    cid: str, data: TextInput, u: Officer = Depends(staff), db: DB = Depends(get_db)
):
    scoped_case(db, u, cid)
    db.add(Note(case_id=cid, officer_id=u.id, body=encrypt(data.text, "note:" + cid)))
    audit(db, u, "case.note_added", cid)
    db.commit()
    return {"ok": True}


@app.patch("/api/officer/cases/{cid}/status")
def update_status(
    cid: str, data: StatusInput, u: Officer = Depends(staff), db: DB = Depends(get_db)
):
    row = scoped_case(db, u, cid)
    row.status = data.status
    row.closed_at = now() if data.status == "Closed" else None
    row.updated_at = now()
    audit(db, u, "case.status_" + data.status.replace(" ", "_").lower(), cid)
    db.commit()
    return {"ok": True}


@app.get("/api/student/attachments/{mid}")
@app.get("/api/officer/attachments/{mid}")
def get_attachment(mid: str, request: Request, db: DB = Depends(get_db)):
    m = db.get(Message, mid)
    if not m or not m.attachment:
        raise HTTPException(404, "File not found")
    if request.url.path.startswith("/api/student"):
        if student_case(request, db).id != m.case_id:
            raise HTTPException(404, "File not found")
    else:
        u = staff(request, db)
        scoped_case(db, u, m.case_id)
        audit(db, u, "case.file_viewed", m.case_id)
    content = storage.read_attachment(m)
    db.commit()
    return Response(
        content,
        media_type=m.mime_type,
        headers={
            "Content-Disposition": 'attachment; filename="attachment.'
            + ("pdf" if m.mime_type == "application/pdf" else "jpg")
            + '"'
        },
    )


@app.post("/api/officer/push")
def push_subscribe(data: dict, u: Officer = Depends(staff), db: DB = Depends(get_db)):
    endpoint = data.get("endpoint", "")
    keys = data.get("keys", {})
    # Only accept browser push services; avoid attacker-controlled server-side requests.
    from urllib.parse import urlparse

    host = urlparse(endpoint).hostname or ""
    hosts = (
        "fcm.googleapis.com",
        "updates.push.services.mozilla.com",
        "web.push.apple.com",
        "wns.windows.com",
        "notify.windows.com",
    )
    if (
        not endpoint.startswith("https://")
        or len(endpoint) > 2048
        or not any(host == h or host.endswith("." + h) for h in hosts)
        or not isinstance(keys, dict)
        or any(
            not isinstance(keys.get(k), str) or len(keys[k]) > 300
            for k in ("auth", "p256dh")
        )
    ):
        raise HTTPException(422, "Invalid push subscription")
    hashed = digest(endpoint)
    row = db.scalar(
        select(PushSubscription).where(PushSubscription.endpoint_hash == hashed)
    )
    if row and row.officer_id != u.id:
        db.delete(row)
        db.flush()
        row = None
    if not row:
        if (
            db.scalar(
                select(func.count())
                .select_from(PushSubscription)
                .where(PushSubscription.officer_id == u.id)
            )
            >= 5
        ):
            raise HTTPException(409, "Maximum notification devices reached")
        row = PushSubscription(
            officer_id=u.id,
            endpoint_hash=hashed,
            encrypted_subscription=encrypt(json.dumps(data), "push:" + u.id),
        )
        db.add(row)
    db.commit()
    deliver_notifications(db, u.id)
    return {"ok": True}


@app.get("/api/owner/overview")
def overview(u: Officer = Depends(staff), db: DB = Depends(get_db)):
    schools = db.scalars(select(School).order_by(School.name)).all()
    rows = []
    for s in schools:
        cases = db.scalars(select(Case).where(Case.school_id == s.id)).all()
        rows.append(
            {
                "id": s.id,
                "name": s.name,
                "number": s.number,
                "district": s.district,
                "active": s.active,
                "cases": len(cases),
                "new": sum(c.status == "New" for c in cases),
                "unanswered": sum(c.unanswered and c.status != "Closed" for c in cases),
                "officers": db.scalar(
                    select(func.count())
                    .select_from(OfficerSchool)
                    .join(Officer)
                    .where(OfficerSchool.school_id == s.id, Officer.active == True)
                ),
            }
        )
    config = db.get(SchoolSettings, 1)
    return {
        "schools": rows,
        "officers": db.scalar(
            select(func.count()).select_from(Officer).where(Officer.role == "officer")
        ),
        "retention_days": config.retention_days if config else 30,
    }


@app.post("/api/owner/schools", status_code=201)
def add_school(
    data: SchoolInput, u: Officer = Depends(staff), db: DB = Depends(get_db)
):
    row = School(**data.model_dump())
    db.add(row)
    db.flush()
    audit(db, u, "school.created", row.id)
    db.commit()
    return {"id": row.id}


@app.patch("/api/owner/schools/{sid}")
def edit_school(
    sid: str, data: SchoolInput, u: Officer = Depends(staff), db: DB = Depends(get_db)
):
    s = db.get(School, sid)
    if not s:
        raise HTTPException(404, "School not found")
    for k, v in data.model_dump().items():
        setattr(s, k, v)
    audit(db, u, "school.updated", sid)
    db.commit()
    return {"ok": True}


@app.get("/api/owner/officers")
def officers(u: Officer = Depends(staff), db: DB = Depends(get_db)):
    return [
        {
            "id": o.id,
            "name": o.name,
            "username": o.username,
            "active": o.active,
            "must_change_password": o.must_change_password,
            "school_ids": school_ids(db, o),
            "two_factor": bool(o.totp_secret),
        }
        for o in db.scalars(
            select(Officer).where(Officer.role == "officer").order_by(Officer.name)
        )
    ]


def assign(db, u, ids):
    if len(set(ids)) != len(ids) or any(not db.get(School, sid) for sid in ids):
        raise HTTPException(422, "Invalid school assignment")
    db.execute(delete(OfficerSchool).where(OfficerSchool.officer_id == u.id))
    for sid in ids:
        db.add(OfficerSchool(officer_id=u.id, school_id=sid))


@app.post("/api/owner/officers", status_code=201)
def create_officer(
    data: OfficerInput, u: Officer = Depends(staff), db: DB = Depends(get_db)
):
    username = data.username.lower()
    if db.scalar(select(Officer).where(Officer.username == username)):
        raise HTTPException(409, "Username already exists")
    temporary = token()
    row = Officer(
        name=data.name.strip(),
        username=username,
        password_hash=passwords.hash(temporary),
        active=data.active,
    )
    db.add(row)
    db.flush()
    assign(db, row, data.school_ids)
    audit(db, u, "officer.created", row.id)
    db.commit()
    return {"id": row.id, "temporary_password": temporary}


def target_officer(db, oid):
    row = db.get(Officer, oid)
    if not row or row.role != "officer":
        raise HTTPException(404, "Officer not found")
    return row


@app.patch("/api/owner/officers/{oid}")
def edit_officer(
    oid: str, data: OfficerEdit, u: Officer = Depends(staff), db: DB = Depends(get_db)
):
    row = target_officer(db, oid)
    row.name = data.name.strip()
    row.active = data.active
    assign(db, row, data.school_ids)
    db.execute(delete(StaffSession).where(StaffSession.officer_id == row.id))
    db.execute(
        delete(Notification).where(
            Notification.officer_id == row.id,
            Notification.school_id.not_in(data.school_ids),
        )
    )
    if not row.active:
        db.execute(
            delete(PushSubscription).where(PushSubscription.officer_id == row.id)
        )
        db.execute(delete(Notification).where(Notification.officer_id == row.id))
    audit(db, u, "officer.updated", oid)
    db.commit()
    return {"ok": True}


@app.post("/api/owner/officers/{oid}/reset")
def reset_officer(oid: str, u: Officer = Depends(staff), db: DB = Depends(get_db)):
    row = target_officer(db, oid)
    temporary = token()
    row.password_hash = passwords.hash(temporary)
    row.must_change_password = True
    row.totp_secret = None
    row.last_totp_step = 0
    db.execute(delete(StaffSession).where(StaffSession.officer_id == row.id))
    audit(db, u, "officer.password_reset", oid)
    db.commit()
    return {"temporary_password": temporary}


@app.delete("/api/owner/officers/{oid}")
def delete_officer(oid: str, u: Officer = Depends(staff), db: DB = Depends(get_db)):
    row = target_officer(db, oid)
    for model in (StaffSession, OfficerSchool, PushSubscription, Notification):
        db.execute(delete(model).where(model.officer_id == oid))
    for note in db.scalars(select(Note).where(Note.officer_id == oid)):
        note.officer_id = None
    db.delete(row)
    audit(db, u, "officer.deleted", oid)
    db.commit()
    return {"ok": True}


@app.get("/api/owner/audit")
def audit_list(u: Officer = Depends(staff), db: DB = Depends(get_db)):
    return [
        {
            "actor": a.actor,
            "action": a.action,
            "target": a.target,
            "created_at": a.created_at,
        }
        for a in db.scalars(
            select(AuditLog).order_by(AuditLog.created_at.desc()).limit(150)
        )
    ]


@app.patch("/api/owner/retention")
def retention(
    data: RetentionInput, u: Officer = Depends(staff), db: DB = Depends(get_db)
):
    config = db.get(SchoolSettings, 1)
    if not config:
        config = SchoolSettings(id=1)
        db.add(config)
    config.retention_days = data.days
    audit(db, u, "retention.updated", str(data.days))
    db.commit()
    return {"ok": True}


def cleanup(db):
    config = db.get(SchoolSettings, 1)
    days = config.retention_days if config else 30
    rows = db.scalars(
        select(Case).where(
            Case.status == "Closed", Case.closed_at < now() - timedelta(days=days)
        )
    ).all()
    for c in rows:
        for m in db.scalars(select(Message).where(Message.case_id == c.id)):
            if m.attachment:
                db.merge(BlobDeletion(pathname=m.attachment))
        db.execute(delete(Note).where(Note.case_id == c.id))
        db.execute(delete(Message).where(Message.case_id == c.id))
        db.delete(c)
    db.execute(delete(RateLimit).where(RateLimit.expires_at < now()))
    db.execute(delete(StaffSession).where(StaffSession.expires_at < now()))
    db.execute(
        delete(Notification).where(Notification.created_at < now() - timedelta(days=7))
    )
    db.commit()
    for item in db.scalars(select(BlobDeletion).limit(30)).all():
        try:
            storage.delete_attachment(item.pathname)
            db.delete(item)
            db.commit()
        except Exception:
            db.rollback()
    return len(rows)


@app.get("/api/cron/maintenance")
def maintenance(request: Request, db: DB = Depends(get_db)):
    if not settings.cron_secret or not hmac.compare_digest(
        request.headers.get("authorization", ""), "Bearer " + settings.cron_secret
    ):
        raise HTTPException(401)
    deleted = cleanup(db)
    deliver_notifications(db)
    return {"deleted_cases": deleted}
