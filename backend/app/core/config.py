from typing import List
import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "IoT Smart Rack Inventory Management System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = Field(default="development", description="development / test / production")
    
    # Database
    # Supports PostgreSQL as standard or SQLite for lightweight local dev/test if Postgres is offline
    DATABASE_URL: str = Field(
        default="sqlite:///./smart_rack.db",
        description="Database connection URL (PostgreSQL in docker/prod e.g. postgresql://smartrack:secret@localhost:5432/smartrack_db)"
    )
    
    # Security
    JWT_SECRET: str = Field(default="smartrack_super_secure_jwt_secret_key_change_in_production_2026", description="JWT secret key")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # IoT Device Security
    DEVICE_API_KEY: str = Field(default="SR-IOT-DEVICE-KEY-98421-ESP8266-A1", description="API key required for ESP8266 REST API calls")
    
    # IoT Debounce & Timeouts
    RFID_DEBOUNCE_SECONDS: float = Field(default=3.0, description="Debounce period in seconds for duplicate tag detections")
    DEVICE_OFFLINE_TIMEOUT_SECONDS: int = Field(default=60, description="Seconds without heartbeat before marking device OFFLINE")
    
    # Critical Stock Threshold (when not custom configured)
    CRITICAL_STOCK_DEFAULT: int = 2
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
        "*"
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow"
    )

settings = Settings()
