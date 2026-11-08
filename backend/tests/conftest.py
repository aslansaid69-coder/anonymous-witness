import os, base64, secrets, tempfile, types
from pathlib import Path
import pytest

scratch = tempfile.TemporaryDirectory(prefix="school-tests-")
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL", "sqlite:///" + str(Path(scratch.name) / "tests.db")
)
os.environ["ENCRYPTION_KEY"] = base64.b64encode(secrets.token_bytes(32)).decode()
os.environ["TOKEN_PEPPER"] = secrets.token_urlsafe(40)
os.environ["SECURE_COOKIES"] = "false"
os.environ["ALLOWED_ORIGIN"] = "http://testserver"
from fastapi.testclient import TestClient
from app.db import Base, engine, SessionLocal
from app.models import Officer, School, OfficerSchool, SchoolSettings
from app.security import passwords
from app.main import app

PASSWORD = "Test-only-strong-password-2026"
HASH = passwords.hash(PASSWORD)


@pytest.fixture(autouse=True)
def database():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        db.add_all(
            [
                School(id="A", name="School A", number="1", active=True),
                School(id="B", name="School B", number="2", active=True),
                School(id="C", name="Inactive school", number="3", active=False),
            ]
        )
        db.add_all(
            [
                Officer(
                    id="owner",
                    name="Owner",
                    username="owner",
                    password_hash=HASH,
                    role="owner",
                    must_change_password=False,
                ),
                Officer(
                    id="officer-a",
                    name="Private Officer A",
                    username="officer.a",
                    password_hash=HASH,
                    must_change_password=False,
                ),
                Officer(
                    id="officer-b",
                    name="Private Officer B",
                    username="officer.b",
                    password_hash=HASH,
                    must_change_password=False,
                ),
            ]
        )
        db.flush()
        db.add_all(
            [
                OfficerSchool(officer_id="officer-a", school_id="A"),
                OfficerSchool(officer_id="officer-b", school_id="B"),
                SchoolSettings(id=1, retention_days=30),
            ]
        )
        db.commit()
    yield


@pytest.fixture
def client():
    with TestClient(app, headers={"X-Witness-Request": "1"}) as c:
        yield c


@pytest.fixture
def blobs(monkeypatch):
    from vercel.blob import sync

    files = {}

    def put(name, data, **kwargs):
        assert kwargs["access"] == "private"
        assert name.startswith("school/") and name.endswith(".enc")
        url = "https://test.private.blob.vercel-storage.com/" + name
        files[url] = data
        return types.SimpleNamespace(url=url)

    def get(url, **kwargs):
        assert kwargs["access"] == "private"
        return types.SimpleNamespace(body=files[url])

    monkeypatch.setattr(sync, "put_blob", put)
    monkeypatch.setattr(sync, "get_blob", get)
    monkeypatch.setattr(sync, "delete_blob", lambda path: files.pop(path, None))
    return files
