import os
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import OperationalError

# Retrieve database URL and fallback parameters from environment variables
DATABASE_URL = os.getenv("DATABASE_URL")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "inventory_db")

# Engine options dictionary
engine_options = {}

if not DATABASE_URL:
    # 1. Try connecting to postgres service (Docker Compose default or custom host)
    try:
        docker_host = os.getenv("DB_HOST_DOCKER", "postgres")
        url = f"postgresql://{DB_USER}:{DB_PASSWORD}@{docker_host}:{DB_PORT}/{DB_NAME}"
        engine = create_engine(url, connect_timeout=2)
        with engine.connect() as conn:
            DATABASE_URL = url
            print("Connected to Docker Postgres.")
    except Exception:
        # 2. Try connecting to localhost postgres
        try:
            url = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
            engine = create_engine(url, connect_timeout=2)
            with engine.connect() as conn:
                DATABASE_URL = url
                print("Connected to Localhost Postgres.")
        except Exception:
            # 3. Fallback to SQLite (absolute path relative to backend folder)
            BASE_DIR = os.path.dirname(os.path.abspath(__file__))
            BACKEND_DIR = os.path.dirname(BASE_DIR)
            SQLITE_PATH = os.path.join(BACKEND_DIR, "inventory_db.sqlite")
            DATABASE_URL = f"sqlite:///{SQLITE_PATH}"
            engine_options["connect_args"] = {"check_same_thread": False}
            print(f"Postgres not available. Falling back to SQLite database at {SQLITE_PATH}")

# Connect with database and retry if it's a PostgreSQL URL (in case services boot in sequence)
def get_engine_with_retry(url, max_retries=10, delay=2):
    if url.startswith("sqlite"):
        return create_engine(url, **engine_options)
        
    retries = 0
    while retries < max_retries:
        try:
            print(f"Connecting to database (Attempt {retries + 1}/{max_retries})...")
            engine = create_engine(url)
            with engine.connect() as connection:
                print("Database connection successful!")
                return engine
        except OperationalError as e:
            retries += 1
            print(f"Database not ready. Retrying in {delay} seconds... Error: {e}")
            time.sleep(delay)
    # Final fallback if Postgres fails to connect after retries is to use SQLite
    print("PostgreSQL connection failed. Falling back to SQLite.")
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    BACKEND_DIR = os.path.dirname(BASE_DIR)
    SQLITE_PATH = os.path.join(BACKEND_DIR, "inventory_db.sqlite")
    return create_engine(f"sqlite:///{SQLITE_PATH}", connect_args={"check_same_thread": False})

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
