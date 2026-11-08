import httpx
from sqlalchemy import select, func
from app.db import SessionLocal
from app.models import SubmissionUpload, SubmissionChunk, Report, Evidence
from app.main import CHUNK_BYTES
from app.config import settings
from .conftest import csrf, sign_in


def encoded(payload, content, filename="demo.pdf", mime="application/pdf"):
    request = httpx.Request(
        "POST",
        "http://testserver/api/reports",
        data=payload,
        files={"files": (filename, content, mime)},
    )
    return request.read(), request.headers["content-type"]


def begin(client, payload):
    body, content_type = payload
    response = client.post(
        "/api/submissions",
        json={"total_bytes": len(body), "content_type": content_type},
    )
    assert response.status_code == 201, response.text
    upload = response.json()
    return upload, {
        "X-Upload-Token": upload["token"],
        "Content-Type": "application/octet-stream",
    }


def test_large_serverless_submission_persistent_storage_and_download(
    client, payload, monkeypatch
):
    monkeypatch.setattr(settings, "storage_backend", "database")
    content = b"%PDF-1.7 fictional evidence\n" + b"x" * (6 * 1024 * 1024)
    body, ct = encoded(payload, content)
    upload, headers = begin(client, (body, ct))
    url = "/api/submissions/" + upload["id"]
    assert client.post(url + "/complete", headers=headers).status_code == 409
    assert (
        client.put(
            url + "/chunks/0",
            content=body[:CHUNK_BYTES],
            headers=headers | {"X-Upload-Token": "wrong"},
        ).status_code
        == 404
    )
    for position, start in enumerate(range(0, len(body), CHUNK_BYTES)):
        chunk = body[start : start + CHUNK_BYTES]
        assert (
            client.put(
                url + f"/chunks/{position}", content=chunk, headers=headers
            ).status_code
            == 200
        )
    assert (
        client.put(
            url + "/chunks/0", content=body[:CHUNK_BYTES], headers=headers
        ).status_code
        == 200
    )
    assert (
        client.put(
            url + "/chunks/0", content=b"!" * CHUNK_BYTES, headers=headers
        ).status_code
        == 409
    )
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(Report)) == 0
        stored = db.scalar(select(SubmissionChunk))
        assert body[:100] not in stored.encrypted_content
        assert db.get(SubmissionUpload, upload["id"]).token_hash != upload["token"]
    result = client.post(url + "/complete", headers=headers)
    assert result.status_code == 201, result.text
    assert client.post(url + "/complete", headers=headers).status_code == 404
    assert client.post("/api/citizen/access", json=result.json()).status_code == 200
    r = client.get("/api/citizen/report").json()
    e = r["evidence"][0]
    eid = e["id"]
    with SessionLocal() as db:
        stored = db.get(Evidence, eid)
        assert stored.encrypted_content is not None
        assert content not in stored.encrypted_content
        assert db.scalar(select(func.count()).select_from(SubmissionChunk)) == 0
        assert db.scalar(select(func.count()).select_from(SubmissionUpload)) == 0
    chunks = []
    for pos in range((len(content) + CHUNK_BYTES - 1) // CHUNK_BYTES):
        chunk = client.get(
            f"/api/evidence/{eid}/chunks/{pos}", headers={"X-Witness-Role": "citizen"}
        )
        assert chunk.status_code == 200
        assert len(chunk.content) <= CHUNK_BYTES
        chunks.append(chunk.content)
    assert b"".join(chunks) == content
    assert client.get(f"/api/evidence/{eid}/chunks/999").status_code == 404
    assert client.post(
        f"/api/evidence/{eid}/verify", headers=csrf(client, "citizen")
    ).json()["verified"]
    assert (
        client.post("/api/logout/citizen", headers=csrf(client, "citizen")).status_code
        == 200
    )
    assert client.get(f"/api/evidence/{eid}/chunks/0").status_code == 401
    sign_in(client)
    assert client.get(f"/api/evidence/{eid}/chunks/0").status_code == 200


def test_chunk_validation_and_failed_finalization_keeps_no_report(
    client, payload, monkeypatch
):
    monkeypatch.setattr(settings, "storage_backend", "database")
    body, ct = encoded(payload, b"not a PDF")
    upload, headers = begin(client, (body, ct))
    url = "/api/submissions/" + upload["id"]
    assert (
        client.put(url + "/chunks/-1", content=body, headers=headers).status_code == 422
    )
    assert (
        client.put(url + "/chunks/0", content=body[:-1], headers=headers).status_code
        == 422
    )
    assert (
        client.put(
            url + "/chunks/0", content=b"x" * (CHUNK_BYTES + 1), headers=headers
        ).status_code
        == 413
    )
    assert (
        client.put(url + "/chunks/0", content=body, headers=headers).status_code == 200
    )
    assert client.post(url + "/complete", headers=headers).status_code == 422
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(Report)) == 0
        assert db.scalar(select(func.count()).select_from(Evidence)) == 0
        assert db.get(SubmissionUpload, upload["id"]) is not None
    for data in [
        {"total_bytes": 0, "content_type": ct},
        {"total_bytes": 53 * 1024 * 1024, "content_type": ct},
        {"total_bytes": 1, "content_type": "text/plain"},
    ]:
        assert client.post("/api/submissions", json=data).status_code in (413, 422)
