from pathlib import Path
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "postgresql+psycopg://witness:witness@db/witness"
    encryption_key: str
    token_pepper: str
    storage_backend: Literal["filesystem", "database"] = "filesystem"
    storage_dir: Path = Path("/data/evidence")
    secure_cookies: bool = True
    allowed_origin: str = "http://localhost:8080"
    # Additional exact origins, explicitly configured for the local demonstration.
    allowed_origins: str = ""
    session_minutes: int = 30
    max_file_bytes: int = 10 * 1024 * 1024


settings = Settings()
