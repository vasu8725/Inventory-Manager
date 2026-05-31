import os
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import OperationalError

# Retrieve database URL from environment variables
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:password@postgres:5432/inventory_db"
)

# Connect with database and retry if it's not ready yet
def get_engine_with_retry(url, max_retries=10, delay=3):
    retries = 0
    while retries < max_retries:
        try:
            print(f"Connecting to database (Attempt {retries + 1}/{max_retries})...")
            engine = create_engine(url)
            # Try connecting to verify
            with engine.connect() as connection:
                print("Database connection successful!")
                return engine
        except OperationalError as e:
            retries += 1
            print(f"Database not ready. Retrying in {delay} seconds... Error: {e}")
            time.sleep(delay)
    # Final attempt that raises the error if failed
    return create_engine(url)

engine = get_engine_with_retry(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get db session in endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
