"""Database initialization and session management"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from backend.db.models import Base
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./arbet.db")

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Initialize database schema"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Dependency for getting DB session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class DatabaseManager:
    """Database operations manager"""

    def __init__(self, session: Session):
        self.session = session

    def commit(self):
        """Commit transaction"""
        self.session.commit()

    def rollback(self):
        """Rollback transaction"""
        self.session.rollback()

    def close(self):
        """Close session"""
        self.session.close()
