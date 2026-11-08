"""One-time owner only. No demo schools, officers, cases, messages or files."""

from sqlalchemy import select
from .db import SessionLocal
from .models import Officer, SchoolSettings
from .config import settings
from .security import passwords


def seed():
    username = (settings.owner_username or "").strip().lower()
    password = settings.owner_password or ""
    if len(username) < 3 or len(password) < 16:
        raise RuntimeError(
            "Set OWNER_USERNAME and a unique OWNER_PASSWORD of at least 16 characters"
        )
    with SessionLocal() as db:
        if db.scalar(select(Officer.id).where(Officer.role == "owner")):
            print("Owner already exists; preserving credentials.")
            return
        db.add(
            Officer(
                name="Owner",
                username=username,
                password_hash=passwords.hash(password),
                role="owner",
                must_change_password=True,
            )
        )
        if not db.get(SchoolSettings, 1):
            db.add(SchoolSettings(id=1, retention_days=30))
        db.commit()
    print(
        "Owner created. First sign-in requires a password change. No demonstration data was added."
    )


if __name__ == "__main__":
    seed()
