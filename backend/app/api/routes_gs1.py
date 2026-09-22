"""
@file routes_gs1.py
@description GS1 India DataKart Master Registry query endpoints.
Verifies GTIN barcodes against registered brand and company records in PostgreSQL.
"""

from fastapi import APIRouter, HTTPException

from app.database import fetch_all, fetch_one
from app.schemas import GS1ProductRecord

router = APIRouter(prefix="/api/gs1", tags=["GS1 DataKart Registry"])


@router.get("", response_model=list[GS1ProductRecord])
async def list_gs1_products():
    """
    Returns all verified GS1 DataKart master product records.
    """
    rows = await fetch_all("SELECT * FROM gs1_registry ORDER BY brand_name ASC")
    return [
        GS1ProductRecord(
            gtin=r["gtin"],
            brand_name=r["brand_name"],
            product_name=r["product_name"],
            company_name=r["company_name"],
            category=r["category"],
            registered_net_qty=r["registered_net_qty"],
            registered_mrp=float(r["registered_mrp"]),
            is_lmpc_registered=r["is_lmpc_registered"],
        )
        for r in rows
    ]


@router.get("/{barcode}", response_model=GS1ProductRecord)
async def get_gs1_product(barcode: str):
    """
    Queries GS1 DataKart database by EAN-13 or UPC barcode.
    """
    row = await fetch_one("SELECT * FROM gs1_registry WHERE gtin = $1", barcode.strip())
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"No GS1 DataKart registration found for barcode: {barcode}",
        )

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
