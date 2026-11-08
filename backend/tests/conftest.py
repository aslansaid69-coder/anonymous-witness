import os, base64, secrets, tempfile
from pathlib import Path
import pytest

scratch = tempfile.TemporaryDirectory(prefix="witness-test-")
os.environ.setdefault(
    "ENCRYPTION_KEY", base64.b64encode(secrets.token_bytes(32)).decode()
)
os.environ.setdefault("TOKEN_PEPPER", secrets.token_urlsafe(40))
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL", "sqlite:///" + str(Path(scratch.name) / "test.db")
)
os.environ["STORAGE_DIR"] = str(Path(scratch.name) / "evidence")
os.environ["SECURE_COOKIES"] = "false"
os.environ["ALLOWED_ORIGIN"] = "http://testserver"
from fastapi.testclient import TestClient
from app.db import Base, engine, SessionLocal
from app.models import User
from app.security import passwords
from app.main import app

PASSWORD = "A-test-password-only-2026!"


@pytest.fixture(autouse=True)
def reset():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        db.add_all(
            [
                User(
                    username="admin",
                    role="admin",
                    password_hash=passwords.hash(PASSWORD),
                ),
                User(
                    username="officer",
                    role="officer",
                    password_hash=passwords.hash(PASSWORD),
                ),
            ]
        )
        db.commit()
    yield


@pytest.fixture
def client():
    with TestClient(app, headers={"X-Witness-Request": "1"}) as c:
        yield c


@pytest.fixture
def payload():
    return {
        "category": "Theft",
        "description": "A fictional bicycle was taken from a shared courtyard.",
        "location": "Almaty, Bostandyk district",
        "incident_date": "2026-01-01",
        "incident_time": "12:30",
    }


def csrf(c, kind):
    return {"X-CSRF-Token": c.cookies.get("aw_csrf_" + kind, "")}


def sign_in(c, username="officer"):
    return c.post(
        "/api/officer/login", json={"username": username, "password": PASSWORD}
    )
