from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .database import engine, Base, get_db
from .routers import products, customers, orders
from . import crud, schemas

# Initialize database tables
try:
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully.")
except Exception as e:
    print(f"Error initializing database tables: {e}")

app = FastAPI(
    title="Inventory & Order Management System API",
    description="Backend API for managing products, customers, and orders.",
    version="1.0.0"
)

# CORS configuration to allow access from local frontend and standard hostings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://inventory-manager-kappa-nine.vercel.app"],  # For production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import asyncio
from .crud.orders import settle_orders_cron

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(settle_orders_cron())

# Healthcheck Endpoint
@app.get("/health", tags=["Health"], status_code=status.HTTP_200_OK)
def health_check(db: Session = Depends(get_db)):
    try:
        # Perform a basic query to verify database health
        db.execute(Base.metadata.tables["products"].select().limit(1))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database connection failed: {str(e)}"
        )

# Dashboard Summary Endpoint
@app.get("/api/dashboard", response_model=schemas.DashboardSummary, tags=["Dashboard"])
def get_dashboard(low_stock_threshold: int = 10, db: Session = Depends(get_db)):
    return crud.get_dashboard_summary(db, low_stock_threshold=low_stock_threshold)

# Include Routers
app.include_router(products.router, prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(orders.router, prefix="/api")

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to the Inventory & Order Management API. Visit /docs for documentation.",
        "docs_url": "/docs"
    }
