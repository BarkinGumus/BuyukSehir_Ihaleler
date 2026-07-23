from datetime import date

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    clerk_issuer: str

    model_config = {"env_file": ".env"}


settings = Settings()

# Uygulama genelinde geçerli kural: bu tarihten önceki ihaleler hiçbir şehirde kabul edilmez.
MIN_TENDER_DATE = date(2026, 1, 1)
