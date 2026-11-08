import io, hashlib, time, json
from datetime import timedelta
from sqlalchemy import select, func, delete
from PIL import Image
import pyotp, pytest
from .conftest import PASSWORD
from app.main import cleanup, normalize
from app.models import *
from app.db import SessionLocal
from app.security import decrypt, encrypt, passwords


def sign(c, kind="officer", username="officer.a", password=PASSWORD, otp=""):
    return c.post(
        "/api/" + kind + "/login",
        json={"username": username, "password": password, "otp": otp},
    )


def csrf(c, kind="officer"):
    return {"X-CSRF-Token": c.cookies.get("aw_csrf_" + kind, "")}


def pow_data(c):
    challenge = c.get("/api/public/config").json()["challenge"]
    for n in range(10_000_000):
        if hashlib.sha256((challenge + ":" + str(n)).encode()).digest()[:2] == b"\0\0":
            return {"challenge_token": challenge, "proof": str(n)}
    raise AssertionError()


def submit(c, school="A", files=None):
    r = c.post(
        "/api/cases",
        data={
            "school_id": school,
            "text": "A private school message describing what happened.",
            "role": "witness",
            **pow_data(c),
        },
        files=files,
    )
    assert r.status_code == 201, r.text
    code = r.json()["case_code"]
    h = {"X-Case-Code": code}
    case = c.get("/api/student/case", headers=h).json()
    return code, h, case


def test_student_code_encryption_no_cookie_and_school_route(client):
    code, h, case = submit(client)
    assert (
        len(normalize(code)) == 16
        and case["school"] == "School A"
        and case["status"] == "New"
    )
    assert not client.cookies
    assert "notes" not in case and "Private Officer A" not in json.dumps(case)
    assert client.get("/api/student/case").status_code == 401
    assert (
        client.get(
            "/api/student/case", headers={"X-Case-Code": "XXXX-XXXX-XXXX-XXXX"}
        ).status_code
        == 401
    )
    with SessionLocal() as db:
        row = db.scalar(select(Case))
        m = db.scalar(select(Message))
        assert (
            code not in row.case_code_hash
            and m.body != "A private school message describing what happened."
        )
        assert decrypt(m.body, "message:" + row.id).startswith("A private")
        assert db.scalar(select(Notification)).officer_id == "officer-a"
        assert not any(
            k in Case.__table__.columns
            for k in ["ip", "device", "email", "phone", "name", "city"]
        )


def test_active_schools_validation_and_pow_replay(client):
    assert [s["id"] for s in client.get("/api/schools").json()] == ["A", "B"]
    puzzle = pow_data(client)
    payload = {"school_id": "A", "text": "Valid fictional school report", **puzzle}
    assert client.post("/api/cases", data=payload).status_code == 201
    assert client.post("/api/cases", data=payload).status_code == 429
    for changes in [
        {"school_id": "C"},
        {"text": "x"},
        {"role": "bad"},
        {"website": "bot"},
    ]:
        r = client.post("/api/cases", data=payload | pow_data(client) | changes)
        assert r.status_code == 422
    assert (
        client.post("/api/cases", data=payload | {"proof": "wrong"}).status_code == 422
    )


def test_strict_cross_school_permissions_all_case_paths(client, blobs):
    image = Image.new("RGB", (10, 10))
    data = io.BytesIO()
    image.save(data, "PNG")
    _, h, a = submit(
        client, files={"attachment": ("identity.png", data.getvalue(), "image/png")}
    )
    _, _, b = submit(client, school="B")
    assert sign(client).status_code == 200
    assert [r["id"] for r in client.get("/api/officer/cases").json()] == [a["id"]]
    assert client.get("/api/officer/cases/" + b["id"]).status_code == 404
    for suffix, payload, method in [
        ("messages", {"text": "secret"}, "post"),
        ("notes", {"text": "secret"}, "post"),
        ("status", {"status": "Closed"}, "patch"),
    ]:
        assert (
            getattr(client, method)(
                f"/api/officer/cases/{b['id']}/{suffix}",
                json=payload,
                headers=csrf(client),
            ).status_code
            == 404
        )
    mid = a["messages"][0]["attachment"]["id"]
    assert sign(client, username="officer.b").status_code == 200
    assert client.get("/api/officer/attachments/" + mid).status_code == 404
    assert client.get("/api/officer/cases/" + a["id"]).status_code == 404
    assert client.get("/api/student/attachments/" + mid, headers=h).status_code == 200


def test_conversation_private_notes_status_and_anonymous_labels(client):
    code, h, c = submit(client)
    cid = c["id"]
    sign(client)
    head = csrf(client)
    assert (
        client.post(
            f"/api/officer/cases/{cid}/messages",
            json={"text": "Can you tell me more?"},
            headers=head,
        ).status_code
        == 201
    )
    assert (
        client.post(
            f"/api/officer/cases/{cid}/notes",
            json={"text": "Private investigation note"},
            headers=head,
        ).status_code
        == 201
    )
    result = client.get("/api/student/case", headers=h).json()
    assert len(result["messages"]) == 2 and "notes" not in result
    assert "Private investigation note" not in json.dumps(
        result
    ) and "Private Officer A" not in json.dumps(result)
    assert (
        client.post(
            "/api/student/messages", data={"text": "An anonymous answer"}, headers=h
        ).status_code
        == 201
    )
    assert client.get("/api/officer/cases").json()[0]["unanswered"] is True
    assert (
        client.patch(
            f"/api/officer/cases/{cid}/status",
            json={"status": "In progress"},
            headers=head,
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/api/officer/cases/{cid}/status", json={"status": "Closed"}, headers=head
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/api/student/messages", data={"text": "another"}, headers=h
        ).status_code
        == 409
    )
    assert (
        client.post(
            f"/api/officer/cases/{cid}/messages", json={"text": "another"}, headers=head
        ).status_code
        == 409
    )
    assert (
        client.patch(
            f"/api/officer/cases/{cid}/status", json={"status": "New"}, headers=head
        ).status_code
        == 200
    )


def test_owner_statistics_never_return_conversation_and_no_officer_bypass(client):
    _, _, c = submit(client)
    assert sign(client, "owner", "owner").status_code == 200
    overview = client.get("/api/owner/overview").json()
    assert overview["schools"][1]["cases"] >= 0
    assert "A private school message" not in json.dumps(overview)
    assert client.get("/api/officer/cases").status_code == 401
    assert client.get("/api/officer/cases/" + c["id"]).status_code == 401
    assert client.get("/api/student/case").status_code == 401
    assert all("password" not in u for u in client.get("/api/owner/officers").json())


def test_first_login_password_rotation_csrf_and_revocation(client):
    with SessionLocal() as db:
        db.get(Officer, "officer-a").must_change_password = True
        db.commit()
    r = sign(client)
    assert r.json()["must_change_password"] is True
    assert client.get("/api/officer/cases").status_code == 403
    assert (
        client.post(
            "/api/officer/password",
            json={
                "current_password": PASSWORD,
                "new_password": "new-strong-password-2026",
            },
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/officer/password",
            json={
                "current_password": PASSWORD,
                "new_password": "new-strong-password-2026",
            },
            headers=csrf(client),
        ).status_code
        == 200
    )
    assert client.get("/api/officer/me").status_code == 401
    assert sign(client, password="new-strong-password-2026").status_code == 200
    assert client.get("/api/officer/cases").status_code == 200


def test_owner_schools_officers_reset_disable_delete_assignments(client):
    sign(client, "owner", "owner")
    h = csrf(client, "owner")
    school = client.post(
        "/api/owner/schools",
        json={"name": "Partner school", "number": "148", "active": False},
        headers=h,
    ).json()["id"]
    assert school not in [s["id"] for s in client.get("/api/schools").json()]
    assert (
        client.patch(
            "/api/owner/schools/" + school,
            json={"name": "Partner school edited", "number": "148", "active": True},
            headers=h,
        ).status_code
        == 200
    )
    r = client.post(
        "/api/owner/officers",
        json={
            "name": "Hidden personal name",
            "username": "new.officer",
            "school_ids": [school],
        },
        headers=h,
    )
    assert r.status_code == 201
    oid = r.json()["id"]
    pw = r.json()["temporary_password"]
    assert sign(client, username="new.officer", password=pw).json()[
        "must_change_password"
    ]
    assert (
        client.patch(
            "/api/owner/officers/" + oid,
            json={"name": "Hidden personal name", "school_ids": ["B"], "active": False},
            headers=h,
        ).status_code
        == 200
    )
    assert client.get("/api/officer/me").status_code == 401
    assert sign(client, username="new.officer", password=pw).status_code == 401
    assert (
        client.post("/api/owner/officers/" + oid + "/reset", headers=h).status_code
        == 200
    )
    assert client.delete("/api/owner/officers/" + oid, headers=h).status_code == 200
    assert oid not in [o["id"] for o in client.get("/api/owner/officers").json()]
    assert any(
        a["action"] == "officer.deleted" for a in client.get("/api/owner/audit").json()
    )


def test_disabled_and_owner_roles_cannot_escape_access_checks(client):
    sign(client)
    assert client.get("/api/owner/overview").status_code == 401
    with SessionLocal() as db:
        db.get(Officer, "officer-a").active = False
        db.commit()
    assert client.get("/api/officer/cases").status_code == 401
    assert sign(client).status_code == 401


def test_totp_enrollment_login_and_replay(client):
    sign(client, "owner", "owner")
    h = csrf(client, "owner")
    secret = client.post("/api/owner/2fa/setup", headers=h).json()["secret"]
    valid = pyotp.TOTP(secret).now()
    invalid = "000000" if valid != "000000" else "999999"
    assert (
        client.post(
            "/api/owner/2fa/enable", json={"code": invalid}, headers=h
        ).status_code
        == 422
    )
    valid = pyotp.TOTP(secret).now()
    assert (
        client.post(
            "/api/owner/2fa/enable", json={"code": valid}, headers=h
        ).status_code
        == 200
    )
    assert sign(client, "owner", "owner").status_code == 401
    assert sign(client, "owner", "owner", otp=valid).status_code == 200
    assert sign(client, "owner", "owner", otp=valid).status_code == 401
    with SessionLocal() as db:
        assert secret not in db.get(Officer, "owner").totp_secret


def test_metadata_removal_encrypted_blob_file_access_and_owner_denial(client, blobs):
    image = Image.new("RGB", (30, 30), "red")
    exif = image.getexif()
    exif[315] = "Private Student Name"
    exif[270] = "GPS location secret"
    b = io.BytesIO()
    image.save(b, "JPEG", exif=exif)
    _, h, c = submit(
        client, files={"attachment": ("student-name.jpg", b.getvalue(), "image/jpeg")}
    )
    mid = c["messages"][0]["attachment"]["id"]
    response = client.get("/api/student/attachments/" + mid, headers=h)
    assert response.status_code == 200
    clean = Image.open(io.BytesIO(response.content))
    assert not clean.getexif()
    assert b"Private Student Name" not in response.content
    assert b"GPS location secret" not in response.content
    assert "student-name" not in json.dumps(c)
    assert all(b"Private Student Name" not in data for data in blobs.values())
    assert client.get("/api/student/attachments/" + mid).status_code == 401
    sign(client, "owner", "owner")
    assert client.get("/api/officer/attachments/" + mid).status_code == 401
    _, other, _ = submit(client, school="B")
    assert (
        client.get("/api/student/attachments/" + mid, headers=other).status_code == 404
    )


def test_pdf_rasterization_removes_metadata_and_scripts():
    import pymupdf
    from app.storage import sanitize

    doc = pymupdf.open()
    doc.new_page().insert_text((50, 50), "Visible report")
    doc.set_metadata({"author": "Private Author", "subject": "GPS private coordinates"})
    clean, mime = sanitize(doc.tobytes(), "application/pdf")
    result = pymupdf.open(stream=clean, filetype="pdf")
    assert mime == "application/pdf" and len(result) == 1
    assert not result.metadata.get("author")
    assert b"Private Author" not in clean and b"GPS private coordinates" not in clean
    assert result[0].get_images()


def test_file_restrictions(client, blobs):
    for name, data, mime in [
        ("bad.exe", b"MZexe", "application/octet-stream"),
        ("fake.jpg", b"not image", "image/jpeg"),
        ("large.jpg", b"x" * (3 * 1024 * 1024 + 1), "image/jpeg"),
    ]:
        r = client.post(
            "/api/cases",
            data={"school_id": "A", "text": "A school message", **pow_data(client)},
            files={"attachment": (name, data, mime)},
        )
        assert r.status_code in (413, 422)
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(Case)) == 0
    assert not blobs


def test_retention_deletes_closed_messages_notes_files_and_keeps_open_cases(
    client, blobs
):
    image = Image.new("RGB", (10, 10))
    b = io.BytesIO()
    image.save(b, "PNG")
    _, _, c = submit(
        client, files={"attachment": ("file.png", b.getvalue(), "image/png")}
    )
    _, _, keep = submit(client, school="B")
    with SessionLocal() as db:
        row = db.get(Case, c["id"])
        row.status = "Closed"
        row.closed_at = now() - timedelta(days=31)
        db.add(
            Note(
                case_id=row.id,
                officer_id="officer-a",
                body=encrypt("private", "note:" + row.id),
            )
        )
        db.commit()
        assert cleanup(db) == 1
        assert db.get(Case, c["id"]) is None and db.get(Case, keep["id"])
        assert not db.scalar(select(Message.id).where(Message.case_id == c["id"]))
    assert not blobs


def test_notifications_only_school_label_and_correct_officer(client, monkeypatch):
    from app.main import deliver_notifications
    from app.config import settings
    import pywebpush

    monkeypatch.setattr(settings, "vapid_private_key", "test-key")
    received = []
    monkeypatch.setattr(
        pywebpush,
        "webpush",
        lambda **kwargs: received.append(json.loads(kwargs["data"])),
    )
    with SessionLocal() as db:
        for oid in ["officer-a", "officer-b"]:
            db.add(
                PushSubscription(
                    officer_id=oid,
                    endpoint_hash=oid,
                    encrypted_subscription=encrypt(
                        json.dumps(
                            {
                                "endpoint": "https://fcm.googleapis.com/x",
                                "keys": {"auth": "x", "p256dh": "y"},
                            }
                        ),
                        "push:" + oid,
                    ),
                )
            )
        db.commit()
    submit(client)
    assert received == [{"title": "New message for School School A", "url": "/officer"}]
    assert "private school message" not in json.dumps(received)


def test_origin_lockout_session_expiry_and_error_redaction(client):
    assert (
        client.post(
            "/api/owner/login",
            json={"username": "owner", "password": PASSWORD},
            headers={"Origin": "https://evil.test"},
        ).status_code
        == 403
    )
    for _ in range(8):
        assert sign(client, password="wrong").status_code == 401
    assert sign(client).status_code == 429
    sign(client, "owner", "owner")
    with SessionLocal() as db:
        db.scalar(select(StaffSession)).expires_at = now() - timedelta(seconds=1)
        db.commit()
    assert client.get("/api/owner/me").status_code == 401
    secret = "sensitive-input" * 20
    r = client.post("/api/owner/login", json={"username": "owner", "password": secret})
    assert r.status_code == 422 and secret not in r.text


def test_clean_owner_bootstrap_idempotent_no_demo_accounts(monkeypatch):
    from app.seed import seed
    from app.config import settings

    with SessionLocal() as db:
        db.execute(delete(OfficerSchool))
        db.execute(delete(Officer))
        db.execute(delete(School))
        db.commit()
    monkeypatch.setattr(settings, "owner_username", "school.owner")
    monkeypatch.setattr(settings, "owner_password", "Unique-owner-temporary-password")
    seed()
    seed()
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(Officer)) == 1
        owner = db.scalar(select(Officer))
        assert owner.must_change_password and owner.role == "owner"
        assert db.scalar(select(func.count()).select_from(School)) == 0
        assert db.scalar(select(func.count()).select_from(Case)) == 0
