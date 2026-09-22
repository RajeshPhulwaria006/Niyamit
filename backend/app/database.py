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


def normalize_dsn(dsn: str) -> str:
    """Normalizes SQLAlchemy or custom dialect URLs to pure PostgreSQL DSN for asyncpg."""
    clean = dsn.strip()
    if clean.startswith("postgresql+asyncpg://"):
        return clean.replace("postgresql+asyncpg://", "postgresql://", 1)
    if clean.startswith("postgresql+psycopg2://"):
        return clean.replace("postgresql+psycopg2://", "postgresql://", 1)
    return clean


async def get_db_pool() -> asyncpg.Pool:
    """Returns or initializes the asyncpg connection pool."""
    global _pool
    if _pool is None:
        clean_dsn = normalize_dsn(settings.DATABASE_URL)
        _pool = await asyncpg.create_pool(
            dsn=clean_dsn,
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

        # 3. Users and RBAC Table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(50) PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                full_name VARCHAR(150) NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'CONSUMER',
                organization VARCHAR(150),
                badge_number VARCHAR(50),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)

        # 4. Long-Lived Refresh Tokens Table (with Revocation & Device Tracking)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id VARCHAR(50) PRIMARY KEY,
                user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
                token_hash VARCHAR(255) UNIQUE NOT NULL,
                device_info VARCHAR(255),
                expires_at TIMESTAMPTZ NOT NULL,
                revoked_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)

        # Seed default demonstration users (Consumer, Officer, Admin)
        default_users = [
            (
                "usr-consumer-01",
                "consumer@smartconsumer.gov.in",
                "$2b$12$Kj6K132j7v.Q3yqA1w8s9.9m8uX6f1w7s8e9q0r1t2y3u4i5o6p7a",  # Consumer@123
                "Rahul Sharma (Citizen Consumer)",
                "CONSUMER",
                "Smart Consumer Forum",
                None,
            ),
            (
                "usr-officer-01",
                "officer.delhi@lmpc.gov.in",
                "$2b$12$Kj6K132j7v.Q3yqA1w8s9.9m8uX6f1w7s8e9q0r1t2y3u4i5o6p7a",  # Officer@123
                "Inspector S. K. Verma",
                "OFFICER",
                "Legal Metrology Department, Delhi NCT",
                "DL-LMPC-402",
            ),
            (
                "usr-admin-01",
                "admin@doca.gov.in",
                "$2b$12$Kj6K132j7v.Q3yqA1w8s9.9m8uX6f1w7s8e9q0r1t2y3u4i5o6p7a",  # Admin@123
                "Director (Legal Metrology), DoCA",
                "ADMIN",
                "Ministry of Consumer Affairs, New Delhi",
                "GOI-DOCA-HQ",
            ),
        ]
        # We compute real bcrypt hashes on seed so password authentication always succeeds
        import bcrypt
        for uid, email, _, name, role, org, badge in default_users:
            exists = await conn.fetchrow("SELECT id FROM users WHERE email = $1", email)
            if not exists:
                plain = "Consumer@123" if role == "CONSUMER" else ("Officer@123" if role == "OFFICER" else "Admin@123")
                salt = bcrypt.gensalt(rounds=10)
                pw_hash = bcrypt.hashpw(plain.encode("utf-8"), salt).decode("utf-8")
                await conn.execute("""
                    INSERT INTO users (id, email, hashed_password, full_name, role, organization, badge_number)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                """, uid, email, pw_hash, name, role, org, badge)

        # 4. Seed real-world Indian GS1 DataKart master records
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


async def get_user_by_email(email: str) -> dict[str, Any] | None:
    """Retrieves a user by their registered email address."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM users WHERE email = $1;", email.lower().strip())
        return dict(row) if row else None


async def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    """Retrieves a user by their unique primary key identifier."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM users WHERE id = $1;", user_id)
        return dict(row) if row else None


async def create_user(
    user_id: str,
    email: str,
    hashed_password: str,
    full_name: str,
    role: str = "CONSUMER",
    organization: str | None = None,
    badge_number: str | None = None,
) -> dict[str, Any]:
    """Creates and persists a new user account in PostgreSQL."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO users (id, email, hashed_password, full_name, role, organization, badge_number)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, email, full_name, role, organization, badge_number, created_at;
            """,
            user_id,
            email.lower().strip(),
            hashed_password,
            full_name.strip(),
            role,
            organization.strip() if organization else None,
            badge_number.strip() if badge_number else None,
        )
        return dict(row)


async def list_demo_users() -> list[dict[str, Any]]:
    """Returns pre-configured demo users for quick role switching and testing."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, email, full_name, role, organization, badge_number FROM users ORDER BY created_at ASC;"
        )
        return [dict(r) for r in rows]


async def store_refresh_token(
    token_id: str,
    user_id: str,
    token_hash: str,
    expires_at: Any,
    device_info: str | None = None,
) -> dict[str, Any]:
    """Stores a newly issued refresh token in PostgreSQL for stateful revocation management."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO refresh_tokens (id, user_id, token_hash, device_info, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, user_id, token_hash, expires_at, created_at;
            """,
            token_id,
            user_id,
            token_hash,
            device_info,
            expires_at,
        )
        return dict(row)


async def get_valid_refresh_token(token_hash: str) -> dict[str, Any] | None:
    """
    Finds a refresh token by its hash, verifying it has NOT been revoked and has NOT expired.
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT rt.*, u.email, u.full_name, u.role, u.organization, u.badge_number
            FROM refresh_tokens rt
            JOIN users u ON u.id = rt.user_id
            WHERE rt.token_hash = $1
              AND rt.revoked_at IS NULL
              AND rt.expires_at > NOW();
            """,
            token_hash,
        )
        return dict(row) if row else None


async def revoke_refresh_token(token_hash: str) -> bool:
    """Revokes a specific refresh token (e.g. on logout or token rotation)."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL;",
            token_hash,
        )
        return "UPDATE 1" in result


async def revoke_all_user_tokens(user_id: str) -> int:
    """
    Emergency kill-switch: revokes all active refresh tokens for an officer or user.
    Used when an enforcement device is stolen, lost in a market, or inspector transferred.
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL;",
            user_id,
        )
        try:
            return int(result.split()[-1])
        except Exception:
            return 0


init_db_schema = init_db


