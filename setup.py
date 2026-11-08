"""Generate unique local configuration after installing backend requirements."""

import base64, secrets
from pathlib import Path
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization

root = Path(__file__).resolve().parent
p = root / ".env"
if p.exists():
    raise SystemExit(".env already exists; preserving its secrets.")
key = ec.generate_private_key(ec.SECP256R1())
b64 = lambda b: base64.urlsafe_b64encode(b).decode().rstrip("=")
password = secrets.token_urlsafe(32)
values = {
    "POSTGRES_PASSWORD": secrets.token_urlsafe(32),
    "ENCRYPTION_KEY": base64.b64encode(secrets.token_bytes(32)).decode(),
    "TOKEN_PEPPER": secrets.token_urlsafe(48),
    "OWNER_USERNAME": "school.owner",
    "OWNER_PASSWORD": password,
    "VAPID_PRIVATE_KEY": b64(key.private_numbers().private_value.to_bytes(32, "big")),
    "VAPID_PUBLIC_KEY": b64(
        key.public_key().public_bytes(
            serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
        )
    ),
    "VAPID_SUBJECT": "https://anonymous-witness.vercel.app",
    "CRON_SECRET": secrets.token_urlsafe(32),
    "ALLOWED_ORIGIN": "http://localhost:8080",
    "ALLOWED_ORIGINS": "http://127.0.0.1:8080,http://127.0.0.1:5173",
    "SECURE_COOKIES": "false",
    "SESSION_MINUTES": "30",
}
p.write_text("\n".join(k + "=" + v for k, v in values.items()) + "\n")
p.chmod(0o600)
access = root / "SCHOOL-OWNER-ДОСТУПЫ.txt"
access.write_text(
    "Local owner: school.owner\nTemporary password: "
    + password
    + "\nOpen /owner and change the temporary password on first sign-in.\n"
)
access.chmod(0o600)
print(
    "Created private .env and owner access file. Configure hosted private Blob before accepting uploads. No demo records were created."
)
