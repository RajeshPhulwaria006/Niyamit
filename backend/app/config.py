"""
@file config.py
@description Central configuration management for the LMPC Compliance Verification Backend.
Loads environment variables with robust production defaults.
"""

import os

from pydantic import BaseModel


class Settings(BaseModel):
    PROJECT_NAME: str = "Legal Metrology Compliance Verification System (LMPC 2011)"
    APP_NAME: str = "Legal Metrology Compliance Verification System (LMPC 2011)"
    VERSION: str = "2.0.0"
    DEBUG: bool = False
    DESCRIPTION: str = (
        "Statutory compliance verification engine for Legal Metrology (Packaged Commodities) Rules, 2011. "
        "SIH 2026 Problem Statement 26034 (Department of Consumer Affairs)."
    )

    # PostgreSQL Configuration
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/lmpc_db"
    )

    # API Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # GS1 EAN-13 Optical Calibration Standards
    EAN13_NOMINAL_WIDTH_MM: float = 37.29  # Nominal width of standard GS1 barcode in millimeters
    EAN13_NOMINAL_HEIGHT_MM: float = 25.93  # Nominal height of standard GS1 barcode in millimeters


settings = Settings()
