import base64, hashlib, hmac, secrets
from argon2 import PasswordHasher
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from .config import settings

try:
    key = base64.b64decode(settings.encryption_key, validate=True)
except Exception as exc:
    raise RuntimeError("ENCRYPTION_KEY must be base64 encoded") from exc
if len(key) != 32 or len(settings.token_pepper) < 32:
    raise RuntimeError(
        "A 32-byte encryption key and >=32-character TOKEN_PEPPER are required"
    )
aes = AESGCM(key)
passwords = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)


def seal_bytes(value: bytes, context: str) -> bytes:
    nonce = secrets.token_bytes(12)
    return nonce + aes.encrypt(nonce, value, context.encode())


def open_bytes(value: bytes, context: str) -> bytes:
    return aes.decrypt(value[:12], value[12:], context.encode())


def encrypt(value: str, context: str) -> str:
    return base64.b64encode(seal_bytes(value.encode(), context)).decode()


def decrypt(value: str, context: str) -> str:
    return open_bytes(base64.b64decode(value), context).decode()


def digest(value: str) -> str:
    return hmac.new(
        settings.token_pepper.encode(), value.encode(), hashlib.sha256
    ).hexdigest()


def token():
    return secrets.token_urlsafe(32)
