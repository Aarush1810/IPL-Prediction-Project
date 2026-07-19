import os


class Settings:
    APP_NAME: str = "IPL Prediction API"
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "sqlite:///./ipl_prediction.db")
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "ipl-secret-key-change-in-production-2025")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    FRONTEND_URL: str = os.environ.get("FRONTEND_URL", "http://localhost:3000")


settings = Settings()

if os.environ.get("VERCEL"):
    settings.DATABASE_URL = "sqlite:////tmp/ipl_prediction.db"
