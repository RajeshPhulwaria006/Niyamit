"""
@file main.py
@description FastAPI backend application entry point for Legal Metrology Packaged Commodities (LMPC).
Includes asynchronous lifespan management for PostgreSQL connection pools, schema initialization,
and statutory inspection / OCR endpoints.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_gs1 import router as gs1_router
from app.api.routes_inspect import router as inspect_router
from app.api.routes_ocr import router as ocr_router
from app.config import settings
from app.database import close_db_pool, init_db_schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Asynchronous lifespan context manager for FastAPI.
    Initializes database connection pool and tables on startup,
    and cleanly releases connections on shutdown.
    """
    print(f"[*] Initializing LMPC Engine backend on {settings.HOST}:{settings.PORT}...")
    try:
        await init_db_schema()
        print("[+] PostgreSQL database initialized successfully with GS1 master records.")
    except Exception as e:
        print(f"[!] Warning: PostgreSQL initialization error: {e}")

    yield

    print("[*] Shutting down LMPC Engine backend...")
    await close_db_pool()
    print("[+] Database connections closed.")


app = FastAPI(
    title=settings.APP_NAME,
    description="Statutory Compliance Engine for Legal Metrology (Packaged Commodities) Rules, 2011",
    version="2.0.0",
    lifespan=lifespan,
)

# Enable CORS for Next.js frontend and mobile devices on local network
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(ocr_router)
app.include_router(inspect_router)
app.include_router(gs1_router)


@app.get("/")
async def root():
    return {
        "status": "online",
        "app": settings.APP_NAME,
        "version": "2.0.0",
        "engine": "PaddleOCR PP-OCRv4 + OpenCV + AsyncPG",
        "docs_url": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "lmpc-fastapi-backend"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
