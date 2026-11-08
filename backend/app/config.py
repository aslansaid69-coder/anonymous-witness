from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str
    encryption_key: str
    token_pepper: str
    allowed_origin: str = "https://anonymous-witness.vercel.app"
    allowed_origins: str = ""
    secure_cookies: bool = True
    session_minutes: int = 30
    owner_username: str | None = None
    owner_password: str | None = None
    vapid_private_key: str = ""
    vapid_public_key: str = ""
    vapid_subject: str = "https://anonymous-witness.vercel.app"
    cron_secret: str = ""
    max_file_bytes: int = 3 * 1024 * 1024


settings = Settings()
