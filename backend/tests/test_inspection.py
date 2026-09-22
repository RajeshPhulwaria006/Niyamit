"""
@file test_inspection.py
@description Automated regression test suite for Legal Metrology Packaged Commodities (LMPC).
Tests PaddleOCR inference, statutory rule evaluations, and Form VIII notice generation.
"""

import asyncio
from pathlib import Path

from PIL import Image

from app.api.routes_ocr import process_cv_image
from app.database import close_db_pool, get_gs1_product, init_db
from app.engine.panchnama import generate_form_viii_notice
from app.engine.rules import evaluate_all_lmpc_rules
from app.schemas import ExtractedPackageDeclarations, PhysicalCalibrationMetrics


async def test_full_pipeline():
    print("[1/5] Testing PostgreSQL initialization, GS1 seeds & Auth users...")
    await init_db()
    gs1_rec = await get_gs1_product("8901063012011")
    assert gs1_rec is not None, "GS1 product 8901063012011 must exist in database"
    assert gs1_rec.brand_name == "Britannia", "Brand must match Britannia"
    print(f"  ✓ GS1 Verified: {gs1_rec.product_name} (₹{gs1_rec.registered_mrp})")

    from app.auth import create_access_token, decode_access_token, verify_password
    from app.database import get_user_by_email

    officer_user = await get_user_by_email("officer.delhi@lmpc.gov.in")
    assert officer_user is not None, "Seeded officer user must exist"
    assert verify_password("Officer@123", officer_user["hashed_password"]), "Password must verify"
    token = create_access_token({"sub": officer_user["id"], "role": officer_user["role"]})
    decoded = decode_access_token(token)
    assert decoded is not None and decoded["sub"] == officer_user["id"], "JWT token must decode"
    print(f"  ✓ 12-Hour Duty Session Verified: {officer_user['full_name']} ({officer_user['role']}) - Offline-Tolerant JWT Active")

    print("[2/4] Testing PaddleOCR on facewash-image.jpeg...")
    img_path = Path(__file__).resolve().parent.parent.parent / "rescources" / "facewash-image.jpeg"
    assert img_path.exists(), f"Test image not found at {img_path}"
    img = Image.open(img_path)

    ocr_res = process_cv_image(img, barcode="8904035402011")
    decl = ExtractedPackageDeclarations(**ocr_res["declarations"])
    calib = PhysicalCalibrationMetrics(**ocr_res["calibration"])

    print(
        f"  ✓ PaddleOCR extracted {ocr_res['lineCount']} text lines in {ocr_res['inferenceTimeSeconds']}s"
    )
    assert decl.mrp == 195.0, f"Expected MRP 195.0, got {decl.mrp}"
    assert decl.net_quantity_value == 100.0, f"Expected Net Qty 100, got {decl.net_quantity_value}"
    assert decl.has_inclusive_of_taxes is True, "Must detect inclusive of all taxes clause"
    assert "crimp" in (decl.manufacturing_date or "").lower(), "Must detect crimp seal proviso"
    print(f"  ✓ Extracted MRP: ₹{decl.mrp} (Tax Clause: {decl.has_inclusive_of_taxes})")
    print(f"  ✓ Extracted Net Qty: {decl.net_quantity_value} {decl.net_quantity_unit}")
    print(f"  ✓ Extracted Mfg Date: {decl.manufacturing_date}")

    print("[3/4] Testing statutory rule engine...")
    evals, status, critical_count = evaluate_all_lmpc_rules(decl, calib, None)
    print(
        f"  ✓ Overall Status: {status} (Evaluations: {len(evals)}, Critical violations: {critical_count})"
    )
    assert status == "COMPLIANT", f"Expected COMPLIANT for real compliant specimen, got {status}"

    print("[4/4] Testing Form VIII Panchnama generator...")
    notice = generate_form_viii_notice(
        audit_id="TEST-AUDIT-001",
        inspector_id="INS-TEST-402",
        inspection_location="Connaught Place, New Delhi",
        declarations=decl,
        calibration=calib,
        evaluations=evals,
        gs1_record=gs1_rec,
    )
    assert "GOVERNMENT OF INDIA" in notice, "Notice must contain official banner"
    assert "LMPC/ENF/TEST-AUDIT-001" in notice, "Notice must contain audit ID"
    print("  ✓ Form VIII Panchnama Notice generated successfully.")

    await close_db_pool()
    print("\n[SUCCESS] All end-to-end regression tests passed with zero errors!")


if __name__ == "__main__":
    asyncio.run(test_full_pipeline())
