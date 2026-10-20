"""
Configuration settings for CloudPulse backend.

This file loads environment variables and provides configuration settings
for the application. We use Pydantic Settings for type-safe configuration.

LEARNING EXERCISE:
- Try changing the SECRET_KEY in your .env file and see how it affects the app
- What happens if you don't set DATABASE_URL? (Pydantic will raise an error)
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "sqlite:///./cloudpulse.db"

    # Security
    secret_key: str = "your-secret-key-change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours

    # Cross-origin browser access. Override with a comma-separated list in deployment.
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"

    # Application
    app_name: str = "CloudPulse API"
    debug: bool = False

    model_config = {
        "env_file": ".env",
        "case_sensitive": False
    }


# Create a global settings instance
settings = Settings()
