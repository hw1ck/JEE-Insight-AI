import os
import sys

# Prevent Windows Application Control policy blocks on compiled SQLAlchemy Cython extensions
os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"

from pathlib import Path

# Ensure project root and backend directory are in sys.path
backend_dir = Path(__file__).resolve().parent.parent
project_root = backend_dir.parent
for p in [str(project_root), str(backend_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import engine, SessionLocal, Base
from backend.app.seed.seeder import seed_database
from backend.app.routers import (
    system, tests, attempts, analytics, tasks, profile, coach
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and run baseline seeds idempotently
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield
    # Shutdown logic if any
    pass


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-grade API backend for JEE InsightAI — Adaptive Examination, Performance Intelligence & Personalized Learning Platform",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan
)

# CORS Middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(system.router, prefix=settings.API_V1_PREFIX)
app.include_router(tests.router, prefix=settings.API_V1_PREFIX)
app.include_router(attempts.router, prefix=settings.API_V1_PREFIX)
app.include_router(analytics.router, prefix=settings.API_V1_PREFIX)
app.include_router(tasks.router, prefix=settings.API_V1_PREFIX)
app.include_router(profile.router, prefix=settings.API_V1_PREFIX)
app.include_router(coach.router, prefix=settings.API_V1_PREFIX)
app.include_router(coach.ai_coach_router, prefix=settings.API_V1_PREFIX)




@app.get("/")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docsUrl": "/docs",
        "healthUrl": f"{settings.API_V1_PREFIX}/health"
    }
