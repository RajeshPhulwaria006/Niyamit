"""
@file routes_inspect.py
@description Core LMPC statutory audit, rule evaluation, history, and analytics API.
Stores all inspection dossiers in PostgreSQL and evaluates compliance across all 10 statutory provisions.
"""

import json
import re
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.database import execute, fetch_all, fetch_one
from app.engine.calibration import calibrate_optical_metrics
from app.engine.ocr_parser import extract_declarations_from_text
from app.engine.panchnama import generate_form_viii_notice
from app.engine.rules import evaluate_all_lmpc_rules
from app.engine.sample_data import SAMPLE_PACKAGES
from app.schemas import (
    AuditRequestPayload,
    ExtractedPackageDeclarations,
    GS1ProductRecord,
    InspectionDossier,
    OverallInspectionStatus,
    PhysicalCalibrationMetrics,
    StatutoryRuleEvaluation,
)

router = APIRouter(prefix="/api", tags=["LMPC Inspection"])


@router.get("/samples")
async def get_test_samples():
    """
    Returns pre-configured statutory test samples for 1-click benchmarking.
    """
    return SAMPLE_PACKAGES


@router.post("/inspect", response_model=InspectionDossier)
async def run_inspection(payload: AuditRequestPayload):
    """
    Executes comprehensive Legal Metrology inspection audit against the package declarations.
    """
    audit_id = f"AUD-{uuid.uuid4().hex[:8].upper()}"
    timestamp = datetime.now().isoformat()
    inspector_id = payload.inspector_id or "INS-LMPC-DL-402"
    inspection_location = (
        payload.inspection_location or "Retail Inspection, Connaught Place, New Delhi"
    )

    declarations: ExtractedPackageDeclarations | None = None
    calibration: PhysicalCalibrationMetrics | None = None
    gs1_record: GS1ProductRecord | None = None
    barcode = payload.barcode

    # 1. Handle Sample ID if specified
    if payload.sample_id:
        sample = next((s for s in SAMPLE_PACKAGES if s["id"] == payload.sample_id), None)
        if not sample:
            raise HTTPException(status_code=404, detail=f"Sample '{payload.sample_id}' not found")
        barcode = sample.get("barcode", barcode)
        declarations = ExtractedPackageDeclarations(**sample["declarations"])
        calibration = PhysicalCalibrationMetrics(**sample["calibration"])
    else:
        # 2. Handle Custom or OCR-parsed declarations
        if payload.custom_declarations:
            declarations = payload.custom_declarations
            if not barcode and declarations.barcode:
                barcode = declarations.barcode
        elif payload.raw_text:
            declarations = extract_declarations_from_text(
                payload.raw_text, detected_barcode=barcode
            )
            if not barcode and declarations.barcode:
                barcode = declarations.barcode
        elif barcode:
            clean_bc = "".join(c for c in barcode if c.isdigit())
            row = await fetch_one("SELECT * FROM gs1_registry WHERE gtin = $1", clean_bc)
            if row:
                gs1_record = GS1ProductRecord(
                    gtin=row["gtin"],
                    brand_name=row["brand_name"],
                    product_name=row["product_name"],
                    company_name=row["company_name"],
                    category=row["category"],
                    registered_net_qty=row["registered_net_qty"],
                    registered_mrp=float(row["registered_mrp"]),
                    is_lmpc_registered=row["is_lmpc_registered"],
                )
                qty_val, qty_unit = None, None
                qty_match = re.search(
                    r"(\d+(?:\.\d+)?)\s*([a-zA-Z]+)", gs1_record.registered_net_qty
                )
                if qty_match:
                    qty_val = float(qty_match.group(1))
                    qty_unit = qty_match.group(2).lower()
                calc_usp = round(gs1_record.registered_mrp / qty_val, 2) if qty_val else None

                declarations = ExtractedPackageDeclarations(
                    mrp=gs1_record.registered_mrp,
                    mrp_raw_text=f"MRP ₹{gs1_record.registered_mrp:.2f} (Incl. of all taxes)",
                    has_inclusive_of_taxes=True,
                    net_quantity_value=qty_val,
                    net_quantity_unit=qty_unit,
                    net_quantity_raw_text=gs1_record.registered_net_qty,
                    is_standard_unit_symbol=True,
                    declared_usp=calc_usp,
                    declared_usp_unit=f"per {qty_unit}" if qty_unit else None,
                    calculated_usp=calc_usp,
                    usp_discrepancy_percent=0.0,
                    manufacturer_name=gs1_record.company_name,
                    country_of_origin="India",
                    manufacturing_date="Current Active Registration (GS1 India DataKart)",
                    consumer_care_phone="1800-11-4000",
                    consumer_care_email="compliance@gs1india.org",
                    barcode=gs1_record.gtin,
                    is_dual_price_or_sticker_detected=False,
                )
            else:
                declarations = ExtractedPackageDeclarations(
                    barcode=clean_bc, is_dual_price_or_sticker_detected=False
                )
        else:
            raise HTTPException(
                status_code=400,
                detail="Must provide either sample_id, barcode, raw_text, or custom_declarations",
            )

        # Handle Calibration
        if payload.custom_calibration:
            calibration = PhysicalCalibrationMetrics(**payload.custom_calibration)
        else:
            calibration = calibrate_optical_metrics()

    # 3. Look up official GS1 India DataKart Master Record if not already fetched
    if barcode and not gs1_record:
        row = await fetch_one("SELECT * FROM gs1_registry WHERE gtin = $1", barcode.strip())
        if row:
            gs1_record = GS1ProductRecord(
                gtin=row["gtin"],
                brand_name=row["brand_name"],
                product_name=row["product_name"],
                company_name=row["company_name"],
                category=row["category"],
                registered_net_qty=row["registered_net_qty"],
                registered_mrp=float(row["registered_mrp"]),
                is_lmpc_registered=row["is_lmpc_registered"],
            )

    # 4. Evaluate all 10 Statutory Rules
    evaluations, computed_status, critical_count = evaluate_all_lmpc_rules(
        declarations, calibration, gs1_record
    )

    # 5. Determine Overall Compliance Status
    overall_status: OverallInspectionStatus
    if declarations.mrp is None or declarations.net_quantity_value is None:
        overall_status = "INCOMPLETE_DECLARATION"
    else:
        overall_status = computed_status

    # 6. Generate Statutory Form VIII Panchnama Notice
    legal_notice = generate_form_viii_notice(
        audit_id=audit_id,
        inspector_id=inspector_id,
        inspection_location=inspection_location,
        declarations=declarations,
        calibration=calibration,
        evaluations=evaluations,
        gs1_record=gs1_record,
    )

    brand_name = (
        gs1_record.brand_name
        if gs1_record
        else (declarations.manufacturer_name or "Specimen Commodity")
    )

    # 7. Persist Dossier into PostgreSQL
    try:
        query = """
            INSERT INTO inspection_audits (
                id, audit_id, inspector_id, inspection_location, gtin, barcode, brand_name, product_name,
                image_url, overall_status, critical_violations_count, declarations,
                calibration, evaluations, legal_notice_draft, timestamp, created_at
            ) VALUES ($1, $1, $2, $3, $4, $4, $5, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
        """
        await execute(
            query,
            audit_id,
            inspector_id,
            inspection_location,
            barcode or (gs1_record.gtin if gs1_record else None),
            brand_name,
            payload.image_url,
            overall_status,
            critical_count,
            declarations.model_dump_json(),
            calibration.model_dump_json() if calibration else None,
            json.dumps([e.model_dump() for e in evaluations]),
            legal_notice,
        )
    except Exception as e:
        print(f"[Warning] Failed to persist audit {audit_id} in DB: {e}")

    return InspectionDossier(
        audit_id=audit_id,
        timestamp=timestamp,
        inspector_id=inspector_id,
        inspection_location=inspection_location,
        image_url=payload.image_url,
        overall_status=overall_status,
        critical_violations_count=critical_count,
        evaluations=evaluations,
        calibration=calibration,
        declarations=declarations,
        gs1_record=gs1_record,
        legal_notice_draft=legal_notice,
    )


@router.get("/history", response_model=list[InspectionDossier])
async def get_inspection_history():
    """
    Returns chronological audit dossiers stored in PostgreSQL.
    """
    rows = await fetch_all("""
        SELECT audit_id, inspector_id, inspection_location, gtin, brand_name,
               image_url, overall_status, critical_violations_count, declarations,
               calibration, evaluations, legal_notice_draft, created_at
        FROM inspection_audits
        ORDER BY created_at DESC
        LIMIT 50
    """)

    results = []
    for r in rows:
        try:
            decl_dict = (
                json.loads(r["declarations"])
                if isinstance(r["declarations"], str)
                else r["declarations"]
            )
            calib_dict = (
                json.loads(r["calibration"])
                if r["calibration"] and isinstance(r["calibration"], str)
                else r["calibration"]
            )
            evals_list = (
                json.loads(r["evaluations"])
                if isinstance(r["evaluations"], str)
                else r["evaluations"]
            )

            results.append(
                InspectionDossier(
                    audit_id=r["audit_id"],
                    timestamp=r["created_at"].isoformat()
                    if hasattr(r["created_at"], "isoformat")
                    else str(r["created_at"]),
                    inspector_id=r["inspector_id"],
                    inspection_location=r["inspection_location"],
                    image_url=r["image_url"],
                    overall_status=r["overall_status"],
                    critical_violations_count=r["critical_violations_count"],
                    evaluations=[StatutoryRuleEvaluation(**e) for e in evals_list],
                    calibration=PhysicalCalibrationMetrics(**calib_dict) if calib_dict else None,
                    declarations=ExtractedPackageDeclarations(**decl_dict),
                    legal_notice_draft=r["legal_notice_draft"],
                )
            )
        except Exception as err:
            print(f"[Warning] Failed parsing dossier {r.get('audit_id')}: {err}")
            continue

    return results


@router.get("/stats")
async def get_compliance_stats():
    """
    Computes overall enforcement statistics from inspection audits.
    """
    row = await fetch_one("""
        SELECT
            COUNT(*) as total_inspected,
            COUNT(*) FILTER (WHERE overall_status = 'COMPLIANT') as compliant_count,
            COUNT(*) FILTER (WHERE overall_status = 'NON_COMPLIANT') as non_compliant_count,
            COALESCE(SUM(critical_violations_count), 0) as total_critical_violations
        FROM inspection_audits
    """)

    total = int(row["total_inspected"]) if row else 0
    compliant = int(row["compliant_count"]) if row else 0
    non_compliant = int(row["non_compliant_count"]) if row else 0
    critical = int(row["total_critical_violations"]) if row else 0
    rate = round((compliant / total) * 100.0, 1) if total > 0 else 100.0

    return {
        "total_inspected": total,
        "compliant_count": compliant,
        "non_compliant_count": non_compliant,
        "critical_violations": critical,
        "compliance_rate_percent": rate,
    }
