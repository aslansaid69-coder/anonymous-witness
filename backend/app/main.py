import hashlib, hmac, secrets, os
from datetime import datetime, timedelta, timezone, date
from pathlib import Path
from urllib.parse import quote
from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    Request,
    Response,
    UploadFile,
    File,
    Form,
)
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import select, delete, func
from sqlalchemy.orm import Session as DB
from .config import settings
from .db import get_db
from .models import (
    User,
    Report,
    Evidence,
    Message,
    StatusHistory,
    AuditLog,
    Session,
    RateBucket,
    SubmissionUpload,
    SubmissionChunk,
    now,
    uid,
    CATEGORIES,
    STATUSES,
)
from .security import encrypt, decrypt, seal_bytes, open_bytes, digest, token, passwords
from .schemas import (
    ReportInput,
    Credentials,
    Login,
    MessageInput,
    StatusInput,
    PasswordInput,
)

app = FastAPI(
    title="Anonymous Witness — University Prototype", docs_url=None, redoc_url=None
)
DUMMY_PASSWORD = passwords.hash(secrets.token_urlsafe(32))


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    # FastAPI's default error includes submitted values; never echo secrets or report text.
    return JSONResponse(
        status_code=422,
        content={
            "detail": [
                {"field": ".".join(map(str, e["loc"][1:])), "message": e["msg"]}
                for e in exc.errors()
            ]
        },
    )


@app.middleware("http")
async def protection(request: Request, call_next):
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        allowed_origins = {settings.allowed_origin} | {
            value.strip()
            for value in settings.allowed_origins.split(",")
            if value.strip()
        }
        # These exact hostnames are injected by Vercel, never taken from request headers.
        for key in ("VERCEL_URL", "VERCEL_PROJECT_PRODUCTION_URL"):
            hostname = os.environ.get(key, "")
            if hostname and "/" not in hostname and hostname.endswith(".vercel.app"):
                allowed_origins.add("https://" + hostname)
        if (
            request.headers.get("x-witness-request") != "1"
            or request.headers.get("origin", settings.allowed_origin)
            not in allowed_origins
        ):
            return JSONResponse({"detail": "Request origin rejected"}, status_code=403)
    response = await call_next(request)
    response.headers.update(
        {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "no-referrer",
            "Cache-Control": "no-store",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
            "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
        }
    )
    if settings.secure_cookies:
        response.headers["Strict-Transport-Security"] = "max-age=31536000"
    return response


def aware(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def rate(request: Request, db: DB, scope: str, limit: int, seconds=900):
    # HMAC prevents raw IP storage. Ignore forwarded headers; configure the trusted proxy separately.
    key = digest(scope + ":" + (request.client.host if request.client else "unknown"))
    dialect = db.bind.dialect.name
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    from sqlalchemy.dialects.sqlite import insert as sq_insert

    insert = pg_insert if dialect == "postgresql" else sq_insert
    expiry = now() + timedelta(seconds=seconds)
    from sqlalchemy import case

    stmt = insert(RateBucket).values(key=key, count=1, expires_at=expiry)
    stmt = stmt.on_conflict_do_update(
        index_elements=["key"],
        set_={
            "count": case(
                (RateBucket.expires_at < now(), 1), else_=RateBucket.count + 1
            ),
            "expires_at": case(
                (RateBucket.expires_at < now(), expiry), else_=RateBucket.expires_at
            ),
        },
    ).returning(RateBucket.count)
    count = db.execute(stmt).scalar_one()
    db.commit()
    if count > limit:
        raise HTTPException(
            429,
            "Too many requests. Try again later.",
            headers={"Retry-After": str(seconds)},
        )


def audit(db, user, action, report=None):
    db.add(
        AuditLog(
            user_id=user.id, action=action, report_id=report.id if report else None
        )
    )


def issue_session(db, response, kind, user_id=None, report_id=None):
    raw, csrf = token(), token()
    db.execute(delete(Session).where(Session.expires_at < now()))
    db.add(
        Session(
            id_hash=digest(raw),
            user_id=user_id,
            report_id=report_id,
            csrf_hash=digest(csrf),
            expires_at=now() + timedelta(minutes=settings.session_minutes),
        )
    )
    response.set_cookie(
        "aw_" + kind,
        raw,
        httponly=True,
        secure=settings.secure_cookies,
        samesite="strict",
        max_age=settings.session_minutes * 60,
        path="/api",
    )
    response.set_cookie(
        "aw_csrf_" + kind,
        csrf,
        httponly=False,
        secure=settings.secure_cookies,
        samesite="strict",
        max_age=settings.session_minutes * 60,
        path="/",
    )


def session_for(request, db, kind):
    value = request.cookies.get("aw_" + kind, "")
    session = db.get(Session, digest(value)) if value else None
    if (
        not session
        or aware(session.expires_at) < now()
        or (kind == "officer" and not session.user_id)
        or (kind == "citizen" and not session.report_id)
    ):
        raise HTTPException(401, "Session expired. Please sign in again.")
    if request.method not in ("GET", "HEAD") and not hmac.compare_digest(
        session.csrf_hash, digest(request.headers.get("x-csrf-token", ""))
    ):
        raise HTTPException(403, "Invalid CSRF token")
    return session


def officer(request: Request, db: DB = Depends(get_db)):
    s = session_for(request, db, "officer")
    u = db.get(User, s.user_id)
    if not u or u.role not in ("officer", "admin"):
        raise HTTPException(403, "Officer access required")
    return u


def citizen(request: Request, db: DB = Depends(get_db)):
    s = session_for(request, db, "citizen")
    return db.get(Report, s.report_id)


def get_report(db, report_id):
    r = db.get(Report, report_id)
    if not r:
        raise HTTPException(404, "Report not found")
    return r


def report_view(db, r, internal=False):
    messages = db.scalars(
        select(Message).where(Message.report_id == r.id).order_by(Message.created_at)
    ).all()
    visible = [m for m in messages if internal or m.sender_type != "internal"]
    for m in visible:
        if (
            m.sender_type == ("citizen" if internal else "officer")
            and m.read_at is None
        ):
            m.read_at = now()
    data = {
        "id": r.id,
        "report_number": r.report_number,
        "category": r.category,
        "description": decrypt(r.encrypted_description, r.id + ":description"),
        "location": decrypt(r.encrypted_location, r.id + ":location"),
        "incident_date": r.incident_date,
        "incident_time": r.incident_time,
        "status": r.status,
        "created_at": r.created_at,
        "messages": [
            {
                "id": m.id,
                "sender_type": m.sender_type,
                "text": decrypt(m.encrypted_message, r.id + ":message"),
                "created_at": m.created_at,
                "read_at": m.read_at,
            }
            for m in visible
        ],
        "history": [
            {"status": h.new_status, "created_at": h.created_at}
            for h in db.scalars(
                select(StatusHistory)
                .where(StatusHistory.report_id == r.id)
                .order_by(StatusHistory.created_at)
            )
        ],
        "evidence": [
            {
                "id": e.id,
                "filename": decrypt(e.original_filename, r.id + ":filename"),
                "mime_type": e.mime_type,
                "size": e.file_size,
                "sha256": e.file_hash,
            }
            for e in db.scalars(select(Evidence).where(Evidence.report_id == r.id))
        ],
    }
    db.commit()
    return data


@app.get("/api/health")
def health(db: DB = Depends(get_db)):
    db.execute(select(1))
    return {"status": "ok", "environment": "university demonstration"}


# Only these formats are supported; magic bytes must agree with both extension and declared MIME.
FORMATS = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".pdf": "application/pdf",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
}


def validate_file(name, mime, data):
    ext = Path(name).suffix.lower()
    valid = (
        (mime == "image/jpeg" and data.startswith(b"\xff\xd8\xff"))
        or (mime == "image/png" and data.startswith(b"\x89PNG\r\n\x1a\n"))
        or (mime == "application/pdf" and data.startswith(b"%PDF-"))
        or (mime == "video/mp4" and len(data) > 12 and data[4:8] == b"ftyp")
        or (mime == "video/webm" and data.startswith(b"\x1aE\xdf\xa3"))
    )
    if FORMATS.get(ext) != mime or not valid or not data:
        raise HTTPException(
            422,
            "Unsupported evidence. Use JPG, PNG, PDF, MP4 or WebM with matching content.",
        )
    if len(data) > settings.max_file_bytes:
        raise HTTPException(413, "Each file must be 10 MB or less")


@app.post("/api/reports", status_code=201)
async def submit(
    request: Request,
    category: str = Form(...),
    description: str = Form(...),
    location: str = Form(...),
    incident_date: str = Form(...),
    incident_time: str = Form(...),
    files: list[UploadFile] = File(default=[]),
    db: DB = Depends(get_db),
):
    if not getattr(request.state, "submission_rate_checked", False):
        rate(request, db, "submission", 10)
    try:
        data = ReportInput(
            category=category,
            description=description,
            location=location,
            incident_date=incident_date,
            incident_time=incident_time,
        )
    except Exception:
        raise HTTPException(
            422,
            "Check category, description (20–10000 characters), location (3–500 characters), and incident date/time.",
        )
    if len(files) > 5:
        raise HTTPException(422, "Maximum 5 evidence files")
    buffers = []
    for file in files:
        content = await file.read(settings.max_file_bytes + 1)
        name = Path((file.filename or "evidence").replace("\\", "/")).name[:200]
        validate_file(name, file.content_type, content)
        buffers.append((name, file.content_type, content))
    rid, secret = uid(), token()
    r = Report(
        id=rid,
        report_number="AW-" + now().strftime("%Y") + "-" + secrets.token_hex(5).upper(),
        category=data.category,
        encrypted_description=encrypt(data.description, rid + ":description"),
        encrypted_location=encrypt(data.location, rid + ":location"),
        incident_date=data.incident_date,
        incident_time=data.incident_time,
        access_token_hash=digest(secret),
    )
    db.add(r)
    db.flush()
    paths = []
    try:
        if settings.storage_backend == "filesystem":
            settings.storage_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
        for name, mime, content in buffers:
            eid = uid()
            stored = uid() + ".enc"
            path = settings.storage_dir / stored
            encrypted = seal_bytes(content, rid + ":" + eid)
            if settings.storage_backend == "filesystem":
                with path.open("xb") as target:
                    target.write(encrypted)
                path.chmod(0o600)
                paths.append(path)
            db.add(
                Evidence(
                    id=eid,
                    report_id=rid,
                    original_filename=encrypt(name, rid + ":filename"),
                    stored_filename=stored,
                    mime_type=mime,
                    file_size=len(content),
                    file_hash=hashlib.sha256(content).hexdigest(),
                    encrypted_content=(
                        encrypted if settings.storage_backend == "database" else None
                    ),
                )
            )
        db.add(StatusHistory(report_id=rid, new_status="Submitted"))
        db.commit()
    except Exception:
        db.rollback()
        for path in paths:
            path.unlink(missing_ok=True)
        raise
    return {"report_number": r.report_number, "token": secret}


@app.post("/api/citizen/access")
def access(
    data: Credentials, request: Request, response: Response, db: DB = Depends(get_db)
):
    rate(request, db, "access", 15)
    r = db.scalar(
        select(Report).where(Report.report_number == data.report_number.strip().upper())
    )
    expected = r.access_token_hash if r else digest("nonexistent")
    if not hmac.compare_digest(expected, digest(data.token)) or not r:
        raise HTTPException(401, "Invalid report ID or secret token")
    old = request.cookies.get("aw_citizen")
    if old:
        db.execute(delete(Session).where(Session.id_hash == digest(old)))
    issue_session(db, response, "citizen", report_id=r.id)
    db.commit()
    return {"ok": True}


@app.get("/api/citizen/report")
def own_report(r: Report = Depends(citizen), db: DB = Depends(get_db)):
    return report_view(db, r)


@app.post("/api/citizen/messages", status_code=201)
def citizen_message(
    data: MessageInput,
    request: Request,
    r: Report = Depends(citizen),
    db: DB = Depends(get_db),
):
    rate(request, db, "messages:" + r.id, 40)
    db.add(
        Message(
            report_id=r.id,
            sender_type="citizen",
            encrypted_message=encrypt(data.text, r.id + ":message"),
        )
    )
    db.commit()
    return {"ok": True}


@app.post("/api/officer/login")
def login(data: Login, request: Request, response: Response, db: DB = Depends(get_db)):
    rate(request, db, "login", 8)
    u = db.scalar(select(User).where(User.username == data.username))
    try:
        valid = passwords.verify(
            u.password_hash if u else DUMMY_PASSWORD, data.password
        )
    except Exception:
        valid = False
    if not valid or not u:
        raise HTTPException(401, "Invalid username or password")
    old = request.cookies.get("aw_officer")
    if old:
        db.execute(delete(Session).where(Session.id_hash == digest(old)))
    issue_session(db, response, "officer", user_id=u.id)
    audit(db, u, "login")
    db.commit()
    return {"username": u.username, "role": u.role}


@app.get("/api/officer/me")
def me(u: User = Depends(officer)):
    return {"username": u.username, "role": u.role}


@app.post("/api/logout/{kind}")
def logout(kind: str, request: Request, response: Response, db: DB = Depends(get_db)):
    if kind not in ("officer", "citizen"):
        raise HTTPException(404)
    s = session_for(request, db, kind)
    db.delete(s)
    db.commit()
    response.delete_cookie("aw_" + kind, path="/api")
    response.delete_cookie("aw_csrf_" + kind, path="/")
    return {"ok": True}


@app.get("/api/officer/reports")
def reports(
    category: str = "",
    status: str = "",
    q: str = "",
    location: str = "",
    start: date | None = None,
    end: date | None = None,
    u: User = Depends(officer),
    db: DB = Depends(get_db),
):
    stmt = select(Report).order_by(Report.created_at.desc())
    if category:
        stmt = stmt.where(Report.category == category)
    if status:
        stmt = stmt.where(Report.status == status)
    if start:
        stmt = stmt.where(Report.incident_date >= start)
    if end:
        stmt = stmt.where(Report.incident_date <= end)
    rows = []
    for r in db.scalars(stmt):
        loc = decrypt(r.encrypted_location, r.id + ":location")
        if location and location.casefold() not in loc.casefold():
            continue
        if (
            q
            and q.casefold()
            not in (
                r.report_number
                + " "
                + decrypt(r.encrypted_description, r.id + ":description")
                + " "
                + loc
            ).casefold()
        ):
            continue
        rows.append(
            {
                "id": r.id,
                "report_number": r.report_number,
                "category": r.category,
                "location": loc,
                "status": r.status,
                "incident_date": r.incident_date,
                "created_at": r.created_at,
            }
        )
    audit(db, u, "list_reports")
    db.commit()
    return rows


@app.get("/api/officer/reports/{rid}")
def details(rid: str, u: User = Depends(officer), db: DB = Depends(get_db)):
    r = get_report(db, rid)
    audit(db, u, "view_report", r)
    return report_view(db, r, True)


TRANSITIONS = {
    "Submitted": {"Under Review", "Rejected"},
    "Under Review": {
        "Additional Information Requested",
        "In Progress",
        "Resolved",
        "Rejected",
    },
    "Additional Information Requested": {
        "Under Review",
        "In Progress",
        "Resolved",
        "Rejected",
    },
    "In Progress": {"Additional Information Requested", "Resolved", "Rejected"},
    "Resolved": {"Under Review"},
    "Rejected": {"Under Review"},
}


@app.patch("/api/officer/reports/{rid}/status")
def change_status(
    rid: str, data: StatusInput, u: User = Depends(officer), db: DB = Depends(get_db)
):
    r = db.scalar(select(Report).where(Report.id == rid).with_for_update())
    if not r:
        raise HTTPException(404, "Report not found")
    if data.status not in TRANSITIONS[r.status]:
        raise HTTPException(409, "That status transition is not allowed")
    db.add(
        StatusHistory(
            report_id=r.id, old_status=r.status, new_status=data.status, changed_by=u.id
        )
    )
    r.status = data.status
    audit(db, u, "status_changed", r)
    db.commit()
    return {"status": r.status}


@app.post("/api/officer/reports/{rid}/messages", status_code=201)
def officer_message(
    rid: str,
    data: MessageInput,
    request: Request,
    internal: bool = False,
    u: User = Depends(officer),
    db: DB = Depends(get_db),
):
    r = get_report(db, rid)
    rate(request, db, "officer_messages:" + u.id, 100)
    db.add(
        Message(
            report_id=rid,
            sender_type="internal" if internal else "officer",
            encrypted_message=encrypt(data.text, rid + ":message"),
        )
    )
    audit(db, u, "internal_note_added" if internal else "message_sent", r)
    db.commit()
    return {"ok": True}


def evidence_access(eid, request, db):
    e = db.get(Evidence, eid)
    if not e:
        raise HTTPException(404, "Evidence not found")
    kind = request.headers.get("x-witness-role")
    if kind not in (None, "officer", "citizen"):
        raise HTTPException(400, "Invalid role")
    if kind == "officer" or (kind is None and request.cookies.get("aw_officer")):
        u = officer(request, db)
        audit(db, u, "evidence_access", get_report(db, e.report_id))
    else:
        s = session_for(request, db, "citizen")
        if s.report_id != e.report_id:
            raise HTTPException(404, "Evidence not found")
    return e


def evidence_content(e):
    try:
        data = open_bytes(
            (
                e.encrypted_content
                if e.encrypted_content is not None
                else (settings.storage_dir / e.stored_filename).read_bytes()
            ),
            e.report_id + ":" + e.id,
        )
        if not hmac.compare_digest(hashlib.sha256(data).hexdigest(), e.file_hash):
            raise ValueError()
        return data
    except Exception:
        raise HTTPException(409, "Evidence integrity verification failed")


@app.get("/api/evidence/{eid}")
def download(eid: str, request: Request, db: DB = Depends(get_db)):
    e = evidence_access(eid, request, db)
    data = evidence_content(e)
    db.commit()
    name = decrypt(e.original_filename, e.report_id + ":filename")
    return Response(
        data,
        media_type=e.mime_type,
        headers={"Content-Disposition": "attachment; filename*=UTF-8''" + quote(name)},
    )


@app.post("/api/evidence/{eid}/verify")
def verify(eid: str, request: Request, db: DB = Depends(get_db)):
    e = evidence_access(eid, request, db)
    evidence_content(e)
    db.commit()
    return {"verified": True, "sha256": e.file_hash, "size": e.file_size}


@app.get("/api/officer/audit")
def logs(u: User = Depends(officer), db: DB = Depends(get_db)):
    return [
        {
            "action": a.action,
            "report_id": a.report_id,
            "timestamp": a.timestamp,
            "username": name,
        }
        for a, name in db.execute(
            select(AuditLog, User.username)
            .join(User, User.id == AuditLog.user_id)
            .order_by(AuditLog.timestamp.desc())
            .limit(100)
        )
    ]


@app.post("/api/officer/password")
def password(
    data: PasswordInput,
    request: Request,
    u: User = Depends(officer),
    db: DB = Depends(get_db),
):
    rate(request, db, "password:" + u.id, 5)
    try:
        valid = passwords.verify(u.password_hash, data.current_password)
    except Exception:
        valid = False
    if not valid:
        raise HTTPException(401, "Current password is incorrect")
    u.password_hash = passwords.hash(data.new_password)
    db.execute(delete(Session).where(Session.user_id == u.id))
    audit(db, u, "password_changed")
    db.commit()
    return {"ok": True, "message": "Password changed. Sign in again."}


@app.get("/api/admin/settings")
def admin_settings(u: User = Depends(officer)):
    if u.role != "admin":
        raise HTTPException(403, "Administrator access required")
    return {
        "environment": "University demonstration",
        "encryption": "AES-256-GCM",
        "max_file_mb": 10,
        "session_minutes": settings.session_minutes,
        "categories": CATEGORIES,
        "statuses": STATUSES,
        "secure_cookies": settings.secure_cookies,
    }


CHUNK_BYTES = 512 * 1024
MAX_SUBMISSION_BYTES = 52 * 1024 * 1024


def upload_for(request, db, upload_id):
    upload = db.scalar(
        select(SubmissionUpload)
        .where(SubmissionUpload.id == upload_id)
        .with_for_update()
    )
    supplied = request.headers.get("x-upload-token", "")
    if (
        not upload
        or aware(upload.expires_at) < now()
        or not hmac.compare_digest(upload.token_hash, digest(supplied))
    ):
        raise HTTPException(404, "Upload not found or expired")
    return upload


@app.post("/api/submissions", status_code=201)
def begin_submission(request: Request, data: dict, db: DB = Depends(get_db)):
    rate(request, db, "upload_begin", 10)
    size = data.get("total_bytes")
    content_type = data.get("content_type", "")
    if type(size) is not int or not 0 < size <= MAX_SUBMISSION_BYTES:
        raise HTTPException(413, "Submission is too large")
    if (
        not isinstance(content_type, str)
        or len(content_type) > 200
        or not content_type.startswith("multipart/form-data; boundary=")
        or "\r" in content_type
        or "\n" in content_type
    ):
        raise HTTPException(422, "Invalid multipart content type")
    expired = select(SubmissionUpload.id).where(SubmissionUpload.expires_at < now())
    db.execute(delete(SubmissionChunk).where(SubmissionChunk.upload_id.in_(expired)))
    db.execute(delete(SubmissionUpload).where(SubmissionUpload.expires_at < now()))
    raw, identifier = token(), uid()
    db.add(
        SubmissionUpload(
            id=identifier,
            token_hash=digest(raw),
            content_type=content_type,
            total_bytes=size,
            expires_at=now() + timedelta(minutes=30),
        )
    )
    db.commit()
    return {"id": identifier, "token": raw, "chunk_bytes": CHUNK_BYTES}


@app.put("/api/submissions/{upload_id}/chunks/{position}")
async def put_submission_chunk(
    upload_id: str, position: int, request: Request, db: DB = Depends(get_db)
):
    upload = upload_for(request, db, upload_id)
    count = (upload.total_bytes + CHUNK_BYTES - 1) // CHUNK_BYTES
    if position < 0 or position >= count:
        raise HTTPException(422, "Invalid chunk position")
    data = bytearray()
    async for part in request.stream():
        data.extend(part)
        if len(data) > CHUNK_BYTES:
            raise HTTPException(413, "Chunk too large")
    expected = min(CHUNK_BYTES, upload.total_bytes - position * CHUNK_BYTES)
    if len(data) != expected:
        raise HTTPException(422, "Invalid chunk length")
    context = f"upload:{upload.id}:{position}"
    existing = db.get(SubmissionChunk, (upload.id, position))
    if existing:
        if open_bytes(existing.encrypted_content, context) != bytes(data):
            raise HTTPException(409, "Chunk already uploaded with different content")
    else:
        db.add(
            SubmissionChunk(
                upload_id=upload.id,
                position=position,
                encrypted_content=seal_bytes(bytes(data), context),
            )
        )
    db.commit()
    return {"ok": True}


@app.post("/api/submissions/{upload_id}/complete", status_code=201)
async def complete_submission(
    upload_id: str, request: Request, db: DB = Depends(get_db)
):
    upload = upload_for(request, db, upload_id)
    chunks = db.scalars(
        select(SubmissionChunk)
        .where(SubmissionChunk.upload_id == upload_id)
        .order_by(SubmissionChunk.position)
    ).all()
    count = (upload.total_bytes + CHUNK_BYTES - 1) // CHUNK_BYTES
    if [c.position for c in chunks] != list(range(count)):
        raise HTTPException(409, "Upload is incomplete")
    payload = b"".join(
        open_bytes(c.encrypted_content, f"upload:{upload_id}:{c.position}")
        for c in chunks
    )
    if len(payload) != upload.total_bytes:
        raise HTTPException(409, "Upload length mismatch")
    sent = False

    async def receive():
        nonlocal sent
        if sent:
            return {"type": "http.disconnect"}
        sent = True
        return {"type": "http.request", "body": payload, "more_body": False}

    scope = dict(request.scope)
    scope["headers"] = [
        (b"content-type", upload.content_type.encode()),
        (b"content-length", str(len(payload)).encode()),
    ]
    parsed_request = Request(scope, receive)
    try:
        form = await parsed_request.form(
            max_files=5, max_fields=10, max_part_size=1024 * 1024
        )
        required = (
            "category",
            "description",
            "location",
            "incident_date",
            "incident_time",
        )
        if any(not isinstance(form.get(k), str) for k in required):
            raise HTTPException(422, "Missing required report fields")
        files = form.getlist("files")
        from starlette.datastructures import UploadFile as StarletteUploadFile

        if any(not isinstance(f, StarletteUploadFile) for f in files):
            raise HTTPException(422, "Invalid evidence upload")
        rate(request, db, "submission", 10)
        request.state.submission_rate_checked = True
        # Persist the report and remove the encrypted staging data in one commit.
        db.execute(
            delete(SubmissionChunk).where(SubmissionChunk.upload_id == upload_id)
        )
        db.delete(upload)
        result = await submit(
            request, **{k: form[k] for k in required}, files=files, db=db
        )
        return result
    finally:
        if "form" in locals():
            await form.close()


@app.get("/api/evidence/{eid}/chunks/{position}")
def evidence_chunk(eid: str, position: int, request: Request, db: DB = Depends(get_db)):
    e = evidence_access(eid, request, db)
    count = (e.file_size + CHUNK_BYTES - 1) // CHUNK_BYTES
    if position < 0 or position >= count:
        raise HTTPException(404, "Chunk not found")
    data = evidence_content(e)
    db.commit()
    return Response(
        data[position * CHUNK_BYTES : (position + 1) * CHUNK_BYTES],
        media_type="application/octet-stream",
    )
