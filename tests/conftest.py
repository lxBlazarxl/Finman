import os
import pytest

# Ensure isolated SQLite database before loading application settings and engine
TEST_DATABASE_URL = "sqlite:///./test_finance.db"
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import get_db, engine as core_engine
from app.models.base import Base
import app.models.user
import app.models.household
import app.models.account
import app.models.transaction

# Use the configured engine which now binds to TEST_DATABASE_URL
engine = core_engine
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def test_db_setup():
    """Create all tables and cleanup test DB files after the test session."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    for suffix in ["", "-wal", "-shm"]:
        path = f"./test_finance.db{suffix}"
        if os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass

@pytest.fixture
def db(test_db_setup):
    """Provide a transactional DB session for tests that request it."""
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
