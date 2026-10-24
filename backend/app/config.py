from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    PROJECT_NAME: str = "JEE InsightAI Backend API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Database configuration (defaults to local SQLite; compatible with PostgreSQL & pgvector)
    DATABASE_URL: str = "sqlite:///./jee_insight.db"

    # CORS origins for frontend integration
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

    # AI Coach & LLM Configuration (Stage 5 Google Gemini Integration)
    GEMINI_API_KEY: Optional[str] = None
    AI_MODEL: str = "gemini-2.5-flash"
    AI_REQUEST_TIMEOUT_SECONDS: float = 30.0

    # Behavioral heuristics thresholds (configurable per blueprint)
    SPEED_FAST_THRESHOLD_SECONDS: float = 90.0
    SPEED_SLOW_THRESHOLD_SECONDS: float = 150.0
    ACCURACY_HIGH_THRESHOLD: float = 75.0
    ACCURACY_LOW_THRESHOLD: float = 50.0
    REPEATED_MISTAKES_CONSECUTIVE_ATTEMPTS: int = 3

    @property
    def sync_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql://", 1)
        return url

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()

