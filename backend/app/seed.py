"""Explicit opt-in simulated data; never runs on application startup."""

import os
from datetime import date, time
from sqlalchemy import select
from .db import SessionLocal
from .models import User, Report, StatusHistory, Message, uid
from .security import passwords, encrypt, digest, token


def seed():
    password = os.environ.get("DEMO_PASSWORD", "")
    if len(password) < 12:
        raise RuntimeError("Set DEMO_PASSWORD to at least 12 characters")
    with SessionLocal() as db:
        for username, role in [("demo.admin", "admin"), ("demo.officer", "officer")]:
            if not db.scalar(select(User).where(User.username == username)):
                db.add(
                    User(
                        username=username,
                        role=role,
                        password_hash=passwords.hash(password),
                    )
                )
        db.flush()
        if db.scalar(select(Report.id).limit(1)):
            db.commit()
            return
        samples = [
            (
                "Theft",
                "Almaty, Bostandyk district",
                "A bicycle was taken from a shared courtyard. This is a fictional university demonstration report.",
                "Under Review",
            ),
            (
                "Cybercrime",
                "Astana, Saryarka district",
                "A simulated phishing website is impersonating a delivery service. Fictional demonstration only.",
                "In Progress",
            ),
            (
                "Fraud",
                "Shymkent, Abay district",
                "A fictional online seller accepted payment but did not deliver the advertised goods.",
                "Submitted",
            ),
            (
                "Suspicious activity",
                "Almaty, Medeu district",
                "An unattended package was noticed near a closed shop. This entire scenario is simulated.",
                "Resolved",
            ),
            (
                "Corruption",
                "Karaganda, Kazybek Bi district",
                "A fictional request for an unofficial payment was made during an application process.",
                "Additional Information Requested",
            ),
            (
                "Other",
                "Astana, Yesil district",
                "A damaged street light is causing poor visibility on a pedestrian path. Fictional scenario.",
                "Rejected",
            ),
        ]
        for i, (cat, loc, desc, status) in enumerate(samples):
            rid = uid()
            r = Report(
                id=rid,
                report_number=f"AW-DEMO-{i+1:04}",
                category=cat,
                encrypted_description=encrypt(desc, rid + ":description"),
                encrypted_location=encrypt(loc, rid + ":location"),
                incident_date=date(2026, 10, 20 + i),
                incident_time=time(18, i * 5),
                status=status,
                access_token_hash=digest(token()),
            )
            db.add(r)
            db.flush()
            db.add(StatusHistory(report_id=rid, new_status="Submitted"))
            if status != "Submitted":
                db.add(
                    StatusHistory(
                        report_id=rid, old_status="Submitted", new_status=status
                    )
                )
            if status == "Additional Information Requested":
                db.add(
                    Message(
                        report_id=rid,
                        sender_type="officer",
                        encrypted_message=encrypt(
                            "Please share an approximate time if you remember. Do not include personal information.",
                            rid + ":message",
                        ),
                    )
                )
        db.commit()
    print(
        "Simulated reports and demonstration users created. Use DEMO_PASSWORD to sign in."
    )


if __name__ == "__main__":
    seed()
