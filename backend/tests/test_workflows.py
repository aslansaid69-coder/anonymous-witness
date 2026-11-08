import hashlib
from datetime import timedelta
from sqlalchemy import select
from .conftest import csrf, sign_in, PASSWORD
from app.db import SessionLocal
from app.models import Report, Message, Evidence, AuditLog, Session, now
from app.security import encrypt, decrypt, open_bytes
from app.config import settings


def create(c, payload, files=None):
    result = c.post("/api/reports", data=payload, files=files)
    assert result.status_code == 201, result.text
    return result.json()


def access(c, creds):
    assert c.post("/api/citizen/access", json=creds).status_code == 200
    return c.get("/api/citizen/report").json()


def test_complete_anonymous_and_officer_workflow(client, payload):
    creds = create(client, payload)
    assert len(creds["token"]) >= 40
    r = access(client, creds)
    assert r["status"] == "Submitted" and r["description"] == payload["description"]
    rid = r["id"]
    assert sign_in(client).status_code == 200
    h = csrf(client, "officer")
    assert (
        client.patch(
            f"/api/officer/reports/{rid}/status",
            json={"status": "Under Review"},
            headers=h,
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/api/officer/reports/{rid}/messages",
            json={"text": "What time did this happen?"},
            headers=h,
        ).status_code
        == 201
    )
    assert (
        client.patch(
            f"/api/officer/reports/{rid}/status",
            json={"status": "Additional Information Requested"},
            headers=h,
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/api/officer/reports/{rid}/messages?internal=true",
            json={"text": "Private investigation note"},
            headers=h,
        ).status_code
        == 201
    )
    own = client.get("/api/citizen/report").json()
    assert len(own["messages"]) == 1 and own["messages"][0]["read_at"]
    assert "Private investigation note" not in str(own)
    assert (
        client.post(
            "/api/citizen/messages",
            json={"text": "Around 12:30."},
            headers=csrf(client, "citizen"),
        ).status_code
        == 201
    )
    detail = client.get(f"/api/officer/reports/{rid}").json()
    assert len(detail["messages"]) == 3
    assert detail["messages"][-1]["read_at"]
    assert (
        client.patch(
            f"/api/officer/reports/{rid}/status",
            json={"status": "In Progress"},
            headers=h,
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/api/officer/reports/{rid}/status", json={"status": "Resolved"}, headers=h
        ).status_code
        == 200
    )
    assert len(client.get("/api/citizen/report").json()["history"]) == 5
    assert client.get("/api/officer/audit").json()


def test_encryption_and_no_plaintext(client, payload):
    creds = create(client, payload)
    with SessionLocal() as db:
        r = db.scalar(select(Report))
        assert payload["description"] not in r.encrypted_description
        assert payload["location"] not in r.encrypted_location
        assert creds["token"] != r.access_token_hash and len(r.access_token_hash) == 64
        assert (
            decrypt(r.encrypted_description, r.id + ":description")
            == payload["description"]
        )


def test_aes_authentication_and_context_binding():
    import pytest
    from cryptography.exceptions import InvalidTag

    value = encrypt("sensitive", "report-a")
    assert decrypt(value, "report-a") == "sensitive"
    assert encrypt("sensitive", "report-a") != value
    with pytest.raises(InvalidTag):
        decrypt(value, "report-b")
    import base64

    raw = bytearray(base64.b64decode(value))
    raw[-1] ^= 1
    with pytest.raises(InvalidTag):
        decrypt(base64.b64encode(raw).decode(), "report-a")


def test_invalid_forms(client, payload):
    for changes in [
        {"description": "short"},
        {"description": " " * 30},
        {"category": "invalid"},
        {"incident_date": "2099-01-01"},
        {"incident_time": "25:00"},
        {"location": "x"},
    ]:
        assert client.post("/api/reports", data=payload | changes).status_code == 422
    assert client.post("/api/reports", data={}).status_code == 422


def test_access_control_and_wrong_tokens(client, payload):
    creds = create(client, payload)
    assert client.get("/api/officer/reports").status_code == 401
    assert client.get("/api/citizen/report").status_code == 401
    assert (
        client.post("/api/citizen/access", json=creds | {"token": "wrong"}).status_code
        == 401
    )
    assert (
        client.post(
            "/api/citizen/access", json=creds | {"report_number": "AW-NONEXISTENT"}
        ).status_code
        == 401
    )
    access(client, creds)
    assert client.get("/api/officer/reports").status_code == 401
    assert client.get("/api/admin/settings").status_code == 401


def test_officer_auth_rbac_csrf_origin_and_logout(client, payload):
    assert (
        client.post(
            "/api/officer/login", json={"username": "officer", "password": "wrong"}
        ).status_code
        == 401
    )
    assert sign_in(client).status_code == 200
    assert client.get("/api/admin/settings").status_code == 403
    assert client.get("/api/officer/me").json()["role"] == "officer"
    assert client.post("/api/logout/officer").status_code == 403
    assert (
        client.post(
            "/api/logout/officer",
            headers=csrf(client, "officer") | {"Origin": "https://evil.test"},
        ).status_code
        == 403
    )
    assert (
        client.post("/api/logout/officer", headers=csrf(client, "officer")).status_code
        == 200
    )
    assert client.get("/api/officer/me").status_code == 401
    assert sign_in(client, "admin").status_code == 200
    assert client.get("/api/admin/settings").status_code == 200


def test_status_transitions(client, payload):
    creds = create(client, payload)
    rid = access(client, creds)["id"]
    sign_in(client)
    h = csrf(client, "officer")
    assert (
        client.patch(
            f"/api/officer/reports/{rid}/status", json={"status": "Resolved"}, headers=h
        ).status_code
        == 409
    )
    assert (
        client.patch(
            f"/api/officer/reports/{rid}/status", json={"status": "Hacked"}, headers=h
        ).status_code
        == 422
    )
    assert (
        client.patch(
            f"/api/officer/reports/{rid}/status", json={"status": "Under Review"}
        ).status_code
        == 403
    )
    assert (
        client.patch(
            f"/api/officer/reports/{rid}/status",
            json={"status": "Under Review"},
            headers=h,
        ).status_code
        == 200
    )


def test_file_restrictions(client, payload):
    files = [("files", ("malware.exe", b"MZfake", "application/octet-stream"))]
    assert client.post("/api/reports", data=payload, files=files).status_code == 422
    files = [("files", ("fake.png", b"not an image", "image/png"))]
    assert client.post("/api/reports", data=payload, files=files).status_code == 422
    files = [
        (
            "files",
            ("document.pdf", b"%PDF-" + b"x" * (10 * 1024 * 1024), "application/pdf"),
        )
    ]
    assert client.post("/api/reports", data=payload, files=files).status_code == 413
    files = [
        ("files", (f"{i}.pdf", b"%PDF-1.7 example", "application/pdf"))
        for i in range(6)
    ]
    assert client.post("/api/reports", data=payload, files=files).status_code == 422


def test_evidence_integrity_and_report_isolation(client, payload):
    content = b"%PDF-1.7 fictional demonstration evidence"
    creds = create(
        client, payload, [("files", ("demo.pdf", content, "application/pdf"))]
    )
    r = access(client, creds)
    eid = r["evidence"][0]["id"]
    assert client.get("/api/evidence/" + eid).content == content
    v = client.post("/api/evidence/" + eid + "/verify", headers=csrf(client, "citizen"))
    assert v.json()["sha256"] == hashlib.sha256(content).hexdigest()
    with SessionLocal() as db:
        e = db.get(Evidence, eid)
        path = settings.storage_dir / e.stored_filename
        assert content not in path.read_bytes()
        assert e.original_filename != "demo.pdf"
    second = create(client, payload)
    access(client, second)
    assert client.get("/api/evidence/" + eid).status_code == 404
    sign_in(client)
    assert client.get("/api/evidence/" + eid).content == content
    encrypted = bytearray(path.read_bytes())
    encrypted[-1] ^= 1
    path.write_bytes(encrypted)
    assert client.get("/api/evidence/" + eid).status_code == 409
    assert (
        client.post(
            "/api/evidence/" + eid + "/verify", headers=csrf(client, "officer")
        ).status_code
        == 409
    )


def test_rate_limit_and_error_redaction(client, payload):
    for _ in range(8):
        assert (
            client.post(
                "/api/officer/login", json={"username": "officer", "password": "wrong"}
            ).status_code
            == 401
        )
    assert sign_in(client).status_code == 429
    r = client.post(
        "/api/citizen/access", json={"report_number": "x", "token": "x" * 200}
    )
    assert r.status_code == 422 and "x" * 200 not in r.text


def test_password_change_invalidates_sessions(client):
    sign_in(client)
    h = csrf(client, "officer")
    assert (
        client.post(
            "/api/officer/password",
            json={"current_password": "wrong", "new_password": "new-password-long"},
            headers=h,
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/officer/password",
            json={"current_password": PASSWORD, "new_password": "new-password-long"},
            headers=h,
        ).status_code
        == 200
    )
    assert client.get("/api/officer/me").status_code == 401
    assert (
        client.post(
            "/api/officer/login",
            json={"username": "officer", "password": "new-password-long"},
        ).status_code
        == 200
    )


def test_expired_sessions(client):
    sign_in(client)
    with SessionLocal() as db:
        s = db.scalar(select(Session))
        s.expires_at = now() - timedelta(seconds=1)
        db.commit()
    assert client.get("/api/officer/reports").status_code == 401


def test_filters_and_security_headers(client, payload):
    create(client, payload)
    sign_in(client)
    assert (
        len(
            client.get(
                "/api/officer/reports?category=Theft&location=Almaty&start=2025-01-01&end=2026-12-31&q=bicycle"
            ).json()
        )
        == 1
    )
    assert client.get("/api/officer/reports?category=Fraud").json() == []
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.headers["cache-control"] == "no-store"
    assert r.headers["x-content-type-options"] == "nosniff"
    assert (
        client.post(
            "/api/citizen/access", json={}, headers={"X-Witness-Request": ""}
        ).status_code
        == 403
    )


def test_dual_sessions_use_explicit_evidence_role(client, payload):
    creds = create(
        client,
        payload,
        [("files", ("demo.pdf", b"%PDF-1.7 demonstration", "application/pdf"))],
    )
    r = access(client, creds)
    eid = r["evidence"][0]["id"]
    sign_in(client)
    # The citizen workspace must still work when an officer cookie also exists.
    response = client.post(
        "/api/evidence/" + eid + "/verify",
        headers=csrf(client, "citizen") | {"X-Witness-Role": "citizen"},
    )
    assert response.status_code == 200
    assert (
        client.post(
            "/api/evidence/" + eid + "/verify",
            headers=csrf(client, "citizen") | {"X-Witness-Role": "officer"},
        ).status_code
        == 403
    )


def test_explicit_local_origins_and_unlisted_origins(client, monkeypatch):
    from app.config import settings

    origins = [
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    monkeypatch.setattr(settings, "allowed_origins", ",".join(origins))
    for origin in origins:
        # Invalid credentials reach authentication, rather than failing origin validation.
        response = client.post(
            "/api/officer/login",
            json={"username": "officer", "password": "wrong"},
            headers={"Origin": origin},
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid username or password"
    for origin in [
        "https://evil.test",
        "http://localhost:5174",
        "http://127.0.0.1:5173.evil.test",
        "null",
    ]:
        response = client.post(
            "/api/officer/login",
            json={"username": "officer", "password": "wrong"},
            headers={"Origin": origin},
        )
        assert response.status_code == 403
        assert response.json()["detail"] == "Request origin rejected"
    assert (
        client.post(
            "/api/officer/login",
            json={"username": "officer", "password": "wrong"},
            headers={"Origin": origins[0], "X-Witness-Request": ""},
        ).status_code
        == 403
    )
