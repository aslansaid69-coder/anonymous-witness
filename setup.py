"""Create local-only secrets. Does not print secret values or overwrite existing .env."""

import base64, secrets
from pathlib import Path

root = Path(__file__).resolve().parent
path = root / ".env"
if path.exists():
    raise SystemExit(
        ".env already exists; preserving its keys. Back it up before any rotation."
    )
with path.open("x") as f:
    f.write("POSTGRES_PASSWORD=" + secrets.token_urlsafe(32) + "\n")
    f.write(
        "ENCRYPTION_KEY=" + base64.b64encode(secrets.token_bytes(32)).decode() + "\n"
    )
    f.write("TOKEN_PEPPER=" + secrets.token_urlsafe(48) + "\n")
    f.write("DEMO_PASSWORD=" + secrets.token_urlsafe(20) + "\n")
    f.write(
        "SECURE_COOKIES=false\nALLOWED_ORIGIN=http://localhost:8080\nSESSION_MINUTES=30\nALLOWED_ORIGINS=http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173\n"
    )
path.chmod(0o600)
print(
    "Created .env with unique secrets. Keep it private and back it up. Read DEMO_PASSWORD there to sign in."
)
