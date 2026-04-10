import os
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "SecureDoc-RAG"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    
    # Database
    DATABASE_URL: str
    
    # JWT
    JWT_SECRET_KEY: str
    JWT_REFRESH_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Encryption
    ENCRYPTION_KEY: str
    
    # Chroma
    CHROMA_HOST: str = "chroma"
    CHROMA_PORT: int = 8000
    CHROMA_COLLECTION_NAME: str = "securedoc_embeddings"
    
    # Redis
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    
    # Rate Limiting
    RATE_LIMIT_LOGIN_REQUESTS: int = 5
    RATE_LIMIT_LOGIN_WINDOW: int = 300  # 5 minutes
    RATE_LIMIT_CHAT_REQUESTS: int = 20
    RATE_LIMIT_CHAT_WINDOW: int = 60  # 1 minute
    
    # File Upload
    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: str = "pdf,docx,txt,doc"
    UPLOAD_DIRECTORY: str = "/app/uploads"
    
    # Password Policy
    PASSWORD_MIN_LENGTH: int = 10
    PASSWORD_REQUIRE_SPECIAL: bool = True
    PASSWORD_REQUIRE_NUMBER: bool = True
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    
    # Argon2 Configuration
    ARGON2_TIME_COST: int = 2
    ARGON2_MEMORY_COST: int = 65536
    ARGON2_PARALLELISM: int = 4
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    @property
    def allowed_extensions_list(self) -> List[str]:
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",")]
    
    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
