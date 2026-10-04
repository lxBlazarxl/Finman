import os
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import get_db, Base

# Use an isolated test database
TEST_DATABASE_URL = "sqlite:///./test_finance.db"

# Create a new engine instance
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# Enforce foreign keys for SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def test_db_setup():
    """Create all tables and yield the engine."""
    Base.metadata.create_all(bind=engine)
    yield
    # Cleanup after test session
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_finance.db"):
        os.remove("./test_finance.db")
    # Also attempt to remove wal and shm files if they exist
    if os.path.exists("./test_finance.db-wal"):
        os.remove("./test_finance.db-wal")
    if os.path.exists("./test_finance.db-shm"):
        os.remove("./test_finance.db-shm")

@pytest.fixture
def db(test_db_setup):
    """Provide a transactional DB session for each test."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def client(db):
    """Provide a TestClient with overridden get_db dependency."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
