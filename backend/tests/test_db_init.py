"""Test database initialization"""
from backend.db import init_db

def test_database_init():
    """Test that database initializes without errors"""
    init_db()
    assert True
