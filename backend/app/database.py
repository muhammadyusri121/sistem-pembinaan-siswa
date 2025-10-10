"""Konfigurasi koneksi database dan dependency session SQLAlchemy."""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency FastAPI yang menyediakan sesi database per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
