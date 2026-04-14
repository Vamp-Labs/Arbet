"""Database initialization and migration utilities"""

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from .models import Base, User, Vault, Trade, Opportunity, AgentLog, RiskCheck, TradeEmbedding


def init_db(database_url: str = "sqlite:///./arbet.db") -> tuple:
    """
    Initialize SQLite database with all tables

    Args:
        database_url: SQLAlchemy database URL (default: local SQLite)

    Returns:
        Tuple of (engine, SessionLocal) for use in application
    """
    # Create engine
    engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False} if "sqlite" in database_url else {},
    )

    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Session factory
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    return engine, SessionLocal


def get_db_status(engine) -> dict:
    """
    Get database initialization status

    Args:
        engine: SQLAlchemy engine

    Returns:
        Dict with table creation status
    """
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    expected_tables = {
        "users",
        "vaults",
        "trades",
        "opportunities",
        "agent_logs",
        "risk_checks",
        "trade_embeddings",
    }

    return {
        "initialized": expected_tables.issubset(existing_tables),
        "existing_tables": list(existing_tables),
        "expected_tables": list(expected_tables),
        "missing_tables": list(expected_tables - existing_tables),
    }


def reset_db(database_url: str = "sqlite:///./arbet.db", confirm: bool = False) -> bool:
    """
    Drop and recreate all tables (⚠️ DESTRUCTIVE)

    Args:
        database_url: SQLAlchemy database URL
        confirm: Must be True to execute

    Returns:
        True if reset successful
    """
    if not confirm:
        return False

    engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False} if "sqlite" in database_url else {},
    )

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    return True
