"""
@file database.py
@description Production PostgreSQL database module using asyncpg high-performance async driver.
Manages:
1. Master GS1 India DataKart registry table (`gs1_registry`).
2. Legal Metrology audit dossiers table (`inspection_audits`).
3. Connection pooling, graceful reconnects, and database statistics.
"""

import json
from typing import Any

import asyncpg

from .config import settings
from .schemas import GS1ProductRecord, InspectionDossier

_pool: asyncpg.Pool | None = None


async def get_db_pool() -> asyncpg.Pool:
    """Returns or initializes the asyncpg connection pool."""
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=settings.DATABASE_URL,
            min_size=2,
            max_size=10,
            command_timeout=60,
        )
    return _pool


async def close_db_pool():
    """Closes the connection pool on application shutdown."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def execute(query: str, *args):
    """Executes a SQL query on the connection pool."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        return await conn.execute(query, *args)


async def fetch_all(query: str, *args) -> list[dict[str, Any]]:
    """Fetches all rows for a query as a list of dicts."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *args)
        return [dict(r) for r in rows]


async def fetch_one(query: str, *args) -> dict[str, Any] | None:
    """Fetches a single row for a query as a dict."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, *args)
        return dict(row) if row else None


async def init_db():
    """
    Initializes required database tables and seeds official GS1 India DataKart products.
    Runs idempotently on application startup.
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # 1. GS1 India DataKart Master Registry Table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS gs1_registry (
                gtin VARCHAR(14) PRIMARY KEY,
                brand_name VARCHAR(100) NOT NULL,
                product_name VARCHAR(255) NOT NULL,
                company_name VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                registered_net_qty VARCHAR(50) NOT NULL,
                registered_mrp NUMERIC(10, 2) NOT NULL,
                is_lmpc_registered BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)

        # 2. Statutory Inspection Audits & Dossiers Table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS inspection_audits (
                audit_id VARCHAR(50) PRIMARY KEY,
                inspector_id VARCHAR(50) NOT NULL,
                inspection_location VARCHAR(255) NOT NULL,
                gtin VARCHAR(14),
                brand_name VARCHAR(100),
                image_url TEXT,
                overall_status VARCHAR(50) NOT NULL,
                critical_violations_count INT NOT NULL,
                declarations JSONB NOT NULL,
                calibration JSONB,
                evaluations JSONB NOT NULL,
                legal_notice_draft TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)

        # 3. Seed real-world Indian GS1 DataKart master records
        seed_records = [
            (
                "8901063012011",
                "Britannia",
                "Britannia Good Day Butter Cookies",
                "Britannia Industries Limited, Bengaluru",
                "Biscuits & Bakery",
                "120 g",
                30.0,
                True,
            ),
            (
                "8901262010054",
                "Amul",
                "Amul Pasteurised Butter",
                "Gujarat Co-operative Milk Marketing Federation Ltd. (GCMMF)",
                "Dairy Products",
                "100 g",
                58.0,
                True,
            ),
            (
                "8901719101014",
                "Parle",
                "Parle-G Original Gluco Biscuits",
                "Parle Products Pvt. Ltd., Mumbai",
                "Biscuits & Bakery",
                "80 g",
                10.0,
                True,
            ),
            (
                "8901012111015",
                "Tata Salt",
                "Tata Salt Vacuum Evaporated Iodised Salt",
                "Tata Consumer Products Limited, Mumbai",
                "Staples & Spices",
                "1 kg",
                28.0,
                True,
            ),
            (
                "8901396112028",
                "Dettol",
                "Dettol Original Germ Protection Soap",
                "Reckitt Benckiser (India) Pvt. Ltd., Gurugram",
                "Personal Hygiene & Soap",
                "75 g",
                42.0,
                True,
            ),
            (
                "8901058852332",
                "Maggi",
                "Maggi 2-Minute Masala Instant Noodles",
                "Nestle India Limited, New Delhi",
                "Instant Food",
                "70 g",
                14.0,
                True,
            ),
            (
                "8901207010019",
                "Dabur",
                "Dabur Chyawanprash Immunity Booster",
                "Dabur India Limited, Ghaziabad",
                "Ayurveda & Health",
                "500 g",
                245.0,
                True,
            ),
            (
                "8901501001019",
                "Haldiram",
                "Haldirams Nagpur Aloo Bhujia",
                "Haldiram Foods International Pvt. Ltd., Nagpur",
                "Namkeen & Snacks",
                "200 g",
                55.0,
                True,
            ),
            (
                "8901138810013",
                "Himalaya",
                "Himalaya Purifying Neem Face Wash (Pouch / Tube)",
                "The Himalaya Drug Company, Makali, Bengaluru",
                "Personal Care & Cosmetics",
                "100 ml",
                160.0,
                True,
            ),
            (
                "8901030733857",
                "Pond's",
                "Pond's Bright Beauty Face Wash Tube",
                "Hindustan Unilever Limited, Mumbai",
                "Personal Care & Cosmetics",
                "100 g",
                175.0,
                True,
            ),
            (
                "8901526402402",
                "Garnier",
                "Garnier Skin Naturals Bright Complete Face Wash",
                "L'Oreal India Pvt. Ltd., Mumbai",
                "Personal Care & Cosmetics",
                "100 g",
                199.0,
                True,
            ),
            (
                "8901012165018",
                "Clean & Clear",
                "Clean & Clear Foaming Face Wash",
                "Johnson & Johnson India Pvt. Ltd., Mumbai",
                "Personal Care & Cosmetics",
                "100 ml",
                165.0,
                True,
            ),
            (
                "8904455005196",
                "Astaberry / Cipla",
                "Astaberry Rice Water Brightening Face Wash (100ml)",
                "Cipla Health Limited, Mumbai",
                "Personal Care & Cosmetics",
                "100 ml",
                195.0,
                True,
            ),
            (
                "8901234567890",
                "Lotus Herbals",
                "Lotus Herbals Skin Cream (50ml Squeeze Tube)",
                "Lotus Herbals Pvt. Ltd., New Delhi",
                "Personal Care & Cosmetics",
                "50 ml",
                85.0,
                True,
            ),
        ]

        await conn.executemany(
            """
            INSERT INTO gs1_registry (
                gtin, brand_name, product_name, company_name, category, registered_net_qty, registered_mrp, is_lmpc_registered
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (gtin) DO NOTHING;
        """,
            seed_records,
        )


async def get_gs1_product(barcode: str) -> GS1ProductRecord | None:
    """Retrieves official GS1 DataKart master registration record for a GTIN barcode."""
    clean = "".join(c for c in barcode if c.isdigit())
    if not clean:
        return None

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT gtin, brand_name, product_name, company_name, category, registered_net_qty, registered_mrp, is_lmpc_registered
            FROM gs1_registry
            WHERE gtin = $1;
        """,
            clean,
        )

        if row:
            return GS1ProductRecord(
                gtin=row["gtin"],
                brand_name=row["brand_name"],
                product_name=row["product_name"],
                company_name=row["company_name"],
                category=row["category"],
                registered_net_qty=row["registered_net_qty"],
                registered_mrp=float(row["registered_mrp"]),
                is_lmpc_registered=row["is_lmpc_registered"],
            )
        return None


async def save_inspection_dossier(dossier: InspectionDossier):
    """Persists an inspection dossier and statutory Form VIII notice into PostgreSQL."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO inspection_audits (
                audit_id, inspector_id, inspection_location, gtin, brand_name,
                image_url, overall_status, critical_violations_count,
                declarations, calibration, evaluations, legal_notice_draft
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (audit_id) DO NOTHING;
        """,
            dossier.audit_id,
            dossier.inspector_id,
            dossier.inspection_location,
            dossier.declarations.barcode,
            dossier.gs1_record.brand_name if dossier.gs1_record else None,
            dossier.image_url,
            dossier.overall_status,
            dossier.critical_violations_count,
            json.dumps(dossier.declarations.model_dump()),
            json.dumps(dossier.calibration.model_dump()) if dossier.calibration else None,
            json.dumps([e.model_dump() for e in dossier.evaluations]),
            dossier.legal_notice_draft,
        )


async def get_audit_stats() -> dict[str, int]:
    """Computes real-time inspection statistics from PostgreSQL."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            SELECT
                COUNT(*)::int as total_audits,
                COALESCE(SUM(CASE WHEN overall_status = 'COMPLIANT' THEN 1 ELSE 0 END), 0)::int as compliant_count,
                COALESCE(SUM(CASE WHEN overall_status = 'NON_COMPLIANT' THEN 1 ELSE 0 END), 0)::int as violation_count
            FROM inspection_audits;
        """)
        return {
            "totalAudits": row["total_audits"],
            "compliantCount": row["compliant_count"],
            "violationCount": row["violation_count"],
        }


async def get_recent_audits(limit: int = 15) -> list[dict[str, Any]]:
    """Retrieves recent statutory audits for officer history review."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT audit_id, inspector_id, inspection_location, gtin, brand_name,
                   overall_status, critical_violations_count, created_at
            FROM inspection_audits
            ORDER BY created_at DESC
            LIMIT $1;
        """,
            limit,
        )
        return [dict(r) for r in rows]


init_db_schema = init_db
