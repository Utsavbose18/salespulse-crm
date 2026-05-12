from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
import models

# Create all tables
Base.metadata.create_all(bind=engine)

# Import routers
from routers import auth, users, leads, followups, dashboard, value_adders

app = FastAPI(
    title="CRM Lead Management System",
    description="Backend API for CRM Sales Lead Management",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["User Management"])
app.include_router(leads.router, prefix="/api/leads", tags=["Lead Management"])
app.include_router(followups.router, prefix="/api/followups", tags=["Follow-Up Management"])
app.include_router(value_adders.router, prefix="/api/value-adders", tags=["Value Adders"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard & Analytics"])


@app.get("/")
def root():
    return {"message": "CRM Lead Management System API", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}