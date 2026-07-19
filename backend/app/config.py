from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "IPL Prediction API"
    DATABASE_URL: str = "sqlite:///./ipl_prediction.db"
    SECRET_KEY: str = "ipl-secret-key-change-in-production-2025"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
