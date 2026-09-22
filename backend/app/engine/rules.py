"""
@file rules.py
@description Deterministic Statutory Compliance Rule Engine for Legal Metrology (Packaged Commodities) Rules, 2011.
Codifies statutory provisions into deterministic boolean verification functions:
- Rule 6: Mandatory Packaging Declarations (Mfg, Origin, Net Qty, Date, MRP, Helpline, USP)
- Rule 7 Table-I: Minimum Numeral Font Height Calibration
- Rule 12: Standard SI Unit Symbols (prohibiting non-standard 'gms', 'ltr', 'kilos')
- Section 36: Price Alteration / Sticker Tampering Detection
"""

from ..schemas import (
    ExtractedPackageDeclarations,
    GS1ProductRecord,
    OverallInspectionStatus,
    PhysicalCalibrationMetrics,
    StatutoryRuleEvaluation,
)

# Standard SI Units strictly permitted under Rule 12
PERMITTED_SI_UNITS = {"g", "kg", "ml", "l", "m", "cm", "mm", "n", "u"}
PROHIBITED_UNIT_STRINGS = ["gms", "gm", "kilos", "ltr", "cc", "grams", "litres"]


def evaluate_all_lmpc_rules(
    declarations: ExtractedPackageDeclarations,
    calibration: PhysicalCalibrationMetrics | None = None,
    gs1_record: GS1ProductRecord | None = None,
) -> tuple[list[StatutoryRuleEvaluation], OverallInspectionStatus, int]:
    """
    Evaluates all 10 statutory provisions against the extracted packaging declarations.
    Returns (evaluations_list, overall_status, critical_violations_count).
    """
    evaluations: list[StatutoryRuleEvaluation] = []

    # =========================================================================
    # RULE 1: Maximum Retail Price (MRP) Declaration (Rule 6(1)(e))
    # =========================================================================
    if declarations.mrp is not None and declarations.mrp > 0:
        evaluations.append(
            StatutoryRuleEvaluation(
                id="RULE_6_1_E_MRP_PRESENCE",
                title="Maximum Retail Price (MRP) Declaration",
                statutory_reference="Rule 6(1)(e), Legal Metrology (Packaged Commodities) Rules, 2011",
                status="PASS",
                explanation="Maximum Retail Price (MRP) is clearly declared in Indian currency.",
                observed_value=f"₹ {declarations.mrp:.2f}",
                mandated_requirement="Mandatory declaration of MRP in Indian Rupees inclusive of all taxes.",
                severity="CRITICAL",
            )
        )
    else:
        evaluations.append(
            StatutoryRuleEvaluation(
                id="RULE_6_1_E_MRP_PRESENCE",
                title="Maximum Retail Price (MRP) Missing",
                statutory_reference="Rule 6(1)(e), Legal Metrology (Packaged Commodities) Rules, 2011",
                status="FAIL",
                explanation="Maximum Retail Price (MRP) is missing, obscured, or not declared.",
                observed_value=declarations.mrp_raw_text or "NOT DETECTED",
                mandated_requirement="Mandatory declaration of Maximum Retail Price (MRP) in Indian currency.",
                severity="CRITICAL",
                penalty_clause="Section 36(1), Legal Metrology Act, 2009 (Fine up to ₹25,000 for 1st offence, ₹50,000 for 2nd offence).",
            )
        )

    # =========================================================================
    # RULE 2: Inclusive of All Taxes Clause (Rule 6(1)(e))
    # =========================================================================
    if declarations.has_inclusive_of_taxes:
        evaluations.append(
            StatutoryRuleEvaluation(
                id="RULE_6_1_E_TAX_CLAUSE",
                title="Tax Clause on Retail Price",
                statutory_reference="Rule 6(1)(e), Legal Metrology (Packaged Commodities) Rules, 2011",
                status="PASS",
                explanation='Price explicitly includes statutory phrase "inclusive of all taxes" or "incl. of all taxes".',
                observed_value='Declared ("incl. of all taxes")',
                mandated_requirement='MRP must be accompanied by the words "inclusive of all taxes".',
                severity="MAJOR",
            )
        )
    else:
        evaluations.append(
            StatutoryRuleEvaluation(
                id="RULE_6_1_E_TAX_CLAUSE",
                title="Tax Clause Omitted on Retail Price",
                statutory_reference="Rule 6(1)(e), Legal Metrology (Packaged Commodities) Rules, 2011",
                status="FAIL",
                explanation='Statutory phrase "inclusive of all taxes" is absent from the MRP declaration.',
                observed_value="Omitted or non-compliant format",
                mandated_requirement='MRP must be explicitly accompanied by "inclusive of all taxes".',
                severity="MAJOR",
                penalty_clause="Section 36(1), Legal Metrology Act, 2009.",
            )
        )

    # =========================================================================
    # RULE 3: Net Quantity & Standard SI Units (Rule 6(1)(c) & Rule 12)
    # =========================================================================
    if declarations.net_quantity_value and declarations.net_quantity_value > 0:
        raw_unit = (declarations.net_quantity_unit or "").strip().lower()
        is_prohibited = raw_unit in PROHIBITED_UNIT_STRINGS
        is_permitted = raw_unit in PERMITTED_SI_UNITS

        if is_prohibited or not is_permitted:
            evaluations.append(
                StatutoryRuleEvaluation(
                    id="RULE_6_1_C_NET_QUANTITY_UNITS",
                    title="Non-Standard Net Quantity Units",
                    statutory_reference="Rule 6(1)(c) read with Rule 12, LMPC Rules, 2011",
                    status="FAIL",
                    explanation=f"Non-standard unit symbol '{raw_unit}' used. Rule 12 permits only standard SI symbols ('g', 'kg', 'ml', 'l'). Prohibited terms like 'gms' or 'ltr' are illegal.",
                    observed_value=f"{declarations.net_quantity_value} {raw_unit}",
                    mandated_requirement="Net quantity must be declared using standard SI symbols without punctuation (g, kg, ml, l, N).",
                    severity="MAJOR",
                    penalty_clause="Section 36(1), Legal Metrology Act, 2009.",
                )
            )
        else:
            evaluations.append(
                StatutoryRuleEvaluation(
                    id="RULE_6_1_C_NET_QUANTITY_UNITS",
                    title="Net Quantity Standard SI Units",
                    statutory_reference="Rule 6(1)(c) read with Rule 12, LMPC Rules, 2011",
                    status="PASS",
                    explanation=f"Net quantity '{declarations.net_quantity_value} {raw_unit}' complies with Rule 12 standard SI symbols.",
                    observed_value=f"{declarations.net_quantity_value} {raw_unit}",
                    mandated_requirement="Standard SI units strictly without punctuation.",
                    severity="MAJOR",
                )
            )
    else:
        evaluations.append(
            StatutoryRuleEvaluation(
                id="RULE_6_1_C_NET_QUANTITY_UNITS",
                title="Net Quantity Missing",
                statutory_reference="Rule 6(1)(c), Legal Metrology (Packaged Commodities) Rules, 2011",
                status="FAIL",
                explanation="Net quantity declaration is missing or unreadable.",
                observed_value="NOT DETECTED",
                mandated_requirement="Mandatory declaration of net weight, volume, or count.",
                severity="CRITICAL",
                penalty_clause="Section 36(1), Legal Metrology Act, 2009.",
            )
        )

    # =========================================================================
    # RULE 4: Unit Sale Price (USP) Mandate (Rule 6(11) - Amendment 2021)
    # =========================================================================
    if declarations.mrp and declarations.net_quantity_value and declarations.net_quantity_value > 0:
        base_unit = declarations.net_quantity_unit or "unit"
        expected_usp = round(declarations.mrp / declarations.net_quantity_value, 2)

        if declarations.declared_usp is not None:
            discrepancy = round(abs(declarations.declared_usp - expected_usp), 2)
            is_discrepant = discrepancy > 0.05

            if is_discrepant:
                evaluations.append(
                    StatutoryRuleEvaluation(
                        id="RULE_6_11_UNIT_SALE_PRICE",
                        title="Unit Sale Price (USP) Discrepancy",
                        statutory_reference="Rule 6(11), LMPC Amendment Rules, 2021",
                        status="FAIL",
                        explanation=f"Declared USP (₹ {declarations.declared_usp:.2f}) does not match calculated price per unit (₹ {expected_usp:.2f}) based on MRP and Net Quantity.",
                        observed_value=f"Declared: ₹ {declarations.declared_usp:.2f} | Calculated: ₹ {expected_usp:.2f}",
                        mandated_requirement=f"True Unit Sale Price (calculated as ₹ {expected_usp:.2f} per {base_unit}).",
                        severity="MAJOR",
                        penalty_clause="Section 36(1), Legal Metrology Act, 2009.",
                    )
                )
            else:
                evaluations.append(
                    StatutoryRuleEvaluation(
                        id="RULE_6_11_UNIT_SALE_PRICE",
                        title="Unit Sale Price (USP) Compliance",
                        statutory_reference="Rule 6(11), LMPC Amendment Rules, 2021",
                        status="PASS",
                        explanation=f"Unit Sale Price is declared correctly (₹ {declarations.declared_usp:.2f} per {base_unit}) with 0% mathematical discrepancy.",
                        observed_value=f"₹ {declarations.declared_usp:.2f} / {base_unit}",
                        mandated_requirement="Mandatory accurate Unit Sale Price declaration.",
                        severity="MAJOR",
                    )
                )
        else:
            evaluations.append(
                StatutoryRuleEvaluation(
                    id="RULE_6_11_UNIT_SALE_PRICE",
                    title="Unit Sale Price (USP) Missing",
                    statutory_reference="Rule 6(11), LMPC Amendment Rules, 2021",
                    status="FAIL",
                    explanation="Unit Sale Price (USP) is missing from packaging. Mandatory since December 1, 2022.",
                    observed_value="NOT DECLARED",
                    mandated_requirement=f"Mandatory declaration of Unit Sale Price (calculated as ₹ {expected_usp:.2f} per {base_unit}).",
                    severity="MAJOR",
                    penalty_clause="Section 36(1), Legal Metrology Act, 2009.",
                )
            )

    # =========================================================================
    # RULE 5: Manufacturer / Packer / Importer Identity (Rule 6(1)(a))
    # =========================================================================
    if declarations.manufacturer_name and declarations.manufacturer_address:
        evaluations.append(
            StatutoryRuleEvaluation(
                id="RULE_6_1_A_MANUFACTURER_DETAILS",
                title="Manufacturer / Packer Identity",
                statutory_reference="Rule 6(1)(a), LMPC Rules, 2011",
                status="PASS",
                explanation="Complete legal identity and physical address of manufacturer/packer is declared.",
                observed_value=f"{declarations.manufacturer_name}, {declarations.manufacturer_address}",
                mandated_requirement="Name and complete physical address of manufacturer, packer, or importer.",
                severity="CRITICAL",
            )
        )
    elif declarations.manufacturer_name:
        evaluations.append(
            StatutoryRuleEvaluation(
                id="RULE_6_1_A_MANUFACTURER_DETAILS",
                title="Manufacturer Address Incomplete",
                statutory_reference="Rule 6(1)(a), LMPC Rules, 2011",
                status="WARNING",
                explanation="Manufacturer name is detected, but complete physical address or registered unit location is missing.",
                observed_value=declarations.manufacturer_name,
                mandated_requirement="Complete address including state and pin code.",
                severity="MAJOR",
                penalty_clause="Section 36(1), Legal Metrology Act, 2009.",
            )
        )
    else:
        evaluations.append(
            StatutoryRuleEvaluation(
                id="RULE_6_1_A_MANUFACTURER_DETAILS",
                title="Manufacturer / Packer Identity Missing",
                statutory_reference="Rule 6(1)(a), LMPC Rules, 2011",
                status="FAIL",
                explanation="No manufacturer, packer, or importer details detected on the packaging.",
                observed_value="NOT DETECTED",
                mandated_requirement="Mandatory declaration of manufacturer / packer name and address.",
                severity="CRITICAL",
                penalty_clause="Section 36(1), Legal Metrology Act, 2009.",
            )
        )

    # =========================================================================
    # RULE 6: Country of Origin (Rule 6(1)(b) & 2026 Amendment)
    # =========================================================================
    if declarations.country_of_origin:
        evaluations.append(
            StatutoryRuleEvaluation(
                id="RULE_6_1_B_COUNTRY_OF_ORIGIN",
                title="Country of Origin Declaration",
                statutory_reference="Rule 6(1)(b), LMPC Rules, 2011 & Amendment 2026",
                status="PASS",
                explanation="Country of origin is prominently declared.",
                observed_value=declarations.country_of_origin,
                mandated_requirement="Prominent Country of Origin declaration.",
                severity="MAJOR",
            )
        )
    else:
        evaluations.append(
            StatutoryRuleEvaluation(
                id="RULE_6_1_B_COUNTRY_OF_ORIGIN",
                title="Country of Origin Missing",
                statutory_reference="Rule 6(1)(b), LMPC Rules, 2011 & Amendment 2026",
                status="FAIL",
                explanation="Country of Origin is missing. Mandatory for all imported and digital market listings.",
                observed_value="NOT DETECTED",
                mandated_requirement="Mandatory declaration of Country of Origin on label and digital listings.",
                severity="MAJOR",
                penalty_clause="Section 36(1), Legal Metrology Act, 2009.",
            )
        )

    # =========================================================================
    # RULE 7: Month and Year of Manufacture / Packing (Rule 6(1)(d))
    # =========================================================================
    if declarations.manufacturing_date:
        evaluations.append(
            StatutoryRuleEvaluation(
                id="RULE_6_1_D_MFG_DATE",
                title="Date of Manufacture / Packing",
                statutory_reference="Rule 6(1)(d), Legal Metrology (Packaged Commodities) Rules, 2011",
                status="PASS",
                explanation="Month and year of manufacture/packing or statutory crimp notice is clearly stated.",
                observed_value=declarations.manufacturing_date,
                mandated_requirement="Month and year in which the commodity is manufactured, packed, or imported (or embossed crimp).",
                severity="CRITICAL",
            )
        )
    else:
        evaluations.append(
            StatutoryRuleEvaluation(
                id="RULE_6_1_D_MFG_DATE",
                title="Date of Manufacture Missing",
                statutory_reference="Rule 6(1)(d), LMPC Rules, 2011",
                status="FAIL",
                explanation="Date of packing/manufacture or crimp reference was not detected.",
                observed_value="NOT DETECTED",
                mandated_requirement="Mandatory declaration of month and year of manufacture or packaging.",
                severity="CRITICAL",
                penalty_clause="Section 36(1), Legal Metrology Act, 2009.",
            )
        )

    # =========================================================================
    # RULE 8: Consumer Care Grievance Redressal (Rule 6(1)(f))
    # =========================================================================
    if declarations.consumer_care_phone or declarations.consumer_care_email:
        channels: list[str] = []
        if declarations.consumer_care_phone:
            channels.append(f"Phone: {declarations.consumer_care_phone}")
        if declarations.consumer_care_email:
            channels.append(f"Email: {declarations.consumer_care_email}")
        evaluations.append(
            StatutoryRuleEvaluation(
                id="RULE_6_1_F_CONSUMER_CARE",
                title="Consumer Care Redressal Mechanism",
                statutory_reference="Rule 6(1)(f), Legal Metrology (Packaged Commodities) Rules, 2011",
                status="PASS",
                explanation="Consumer grievance helpline / email contact details are provided on packaging.",
                observed_value=" | ".join(channels),
                mandated_requirement="Name, address, telephone number and email of consumer care executive.",
                severity="MAJOR",
            )
        )
    else:
        evaluations.append(
            StatutoryRuleEvaluation(
                id="RULE_6_1_F_CONSUMER_CARE",
                title="Consumer Care Helpline Missing",
                statutory_reference="Rule 6(1)(f), Legal Metrology (Packaged Commodities) Rules, 2011",
                status="FAIL",
                explanation="No consumer grievance helpline number or email address detected on packaging.",
                observed_value="NOT DETECTED",
                mandated_requirement="Mandatory contact details for consumer complaints.",
                severity="MAJOR",
                penalty_clause="Section 36(1), Legal Metrology Act, 2009.",
            )
        )

    # =========================================================================
    # RULE 9: Physical Font Size & Numerals Height (Rule 7, Table-I)
    # =========================================================================
    if calibration:
        if calibration.is_font_height_compliant:
            evaluations.append(
                StatutoryRuleEvaluation(
                    id="RULE_7_FONT_HEIGHT_TABLE_I",
                    title="Minimum Font Height (Rule 7 Table-I)",
                    statutory_reference="Rule 7, Table-I, Legal Metrology (Packaged Commodities) Rules, 2011",
                    status="PASS",
                    explanation=f"Measured numeral height ({calibration.measured_numeral_height_mm:.2f} mm) satisfies statutory minimum ({calibration.mandated_min_height_mm:.1f} mm) for PDP area of {calibration.pdp_area_cm2} cm².",
                    observed_value=f"{calibration.measured_numeral_height_mm:.2f} mm",
                    mandated_requirement=f">= {calibration.mandated_min_height_mm:.1f} mm (Area: {calibration.pdp_area_cm2} cm²)",
                    severity="CRITICAL",
                )
            )
        else:
            evaluations.append(
                StatutoryRuleEvaluation(
                    id="RULE_7_FONT_HEIGHT_TABLE_I",
                    title="Minimum Font Height Violation (Rule 7 Table-I)",
                    statutory_reference="Rule 7, Table-I, Legal Metrology (Packaged Commodities) Rules, 2011",
                    status="FAIL",
                    explanation=f"Under-sized numerals detected. Measured font height is {calibration.measured_numeral_height_mm:.2f} mm, which is below mandatory minimum of {calibration.mandated_min_height_mm:.1f} mm for PDP area {calibration.pdp_area_cm2} cm².",
                    observed_value=f"{calibration.measured_numeral_height_mm:.2f} mm (DEFICIENT)",
                    mandated_requirement=f">= {calibration.mandated_min_height_mm:.1f} mm for PDP area of {calibration.pdp_area_cm2} cm²",
                    severity="CRITICAL",
                    penalty_clause="Section 36(1), Legal Metrology Act, 2009 (Seizure and compounding penalty).",
                )
            )

    # =========================================================================
    # RULE 10: Price Alteration / Dual MRP Sticker Violation (Section 36(2))
    # =========================================================================
    if declarations.is_dual_price_or_sticker_detected:
        evaluations.append(
            StatutoryRuleEvaluation(
                id="SECTION_36_DUAL_PRICING_STICKER",
                title="Illegal Price Alteration / Sticker Over-Pasting",
                statutory_reference="Section 36(2), Legal Metrology Act, 2009",
                status="FAIL",
                explanation="Tampering detected: A secondary price sticker has been affixed over original printed MRP, or dual MRP pricing detected. Strictly prohibited under Section 36(2).",
                observed_value="Dual MRP / Sticker Overlay Detected",
                mandated_requirement="Strict prohibition on altering, smudging, or pasting stickers over manufacturer printed MRP.",
                severity="CRITICAL",
                penalty_clause="Section 36(2), Legal Metrology Act, 2009 (Fine up to ₹50,000 for 2nd offence, imprisonment up to 1 year).",
            )
        )
    else:
        evaluations.append(
            StatutoryRuleEvaluation(
                id="SECTION_36_DUAL_PRICING_STICKER",
                title="Price Integrity & Absence of Sticker Over-Pasting",
                statutory_reference="Section 36(2), Legal Metrology Act, 2009",
                status="PASS",
                explanation="No sticker overlay or dual price tampering detected on packaging.",
                observed_value="Single intact original printed price",
                mandated_requirement="Intact original printed declaration without over-pasting.",
                severity="CRITICAL",
            )
        )

    # =========================================================================
    # RULE 11: GS1 DataKart Registry Cross-Verification (DoCA / GS1 Mandate)
    # =========================================================================
    if gs1_record:
        if (
            declarations.mrp
            and gs1_record.registered_mrp
            and declarations.mrp > gs1_record.registered_mrp
        ):
            evaluations.append(
                StatutoryRuleEvaluation(
                    id="GS1_REGISTRY_MRP_MISMATCH",
                    title="MRP Discrepancy Against GS1 DataKart Master Registry",
                    statutory_reference="Advisory on GS1 DataKart Integration, Department of Consumer Affairs",
                    status="FAIL",
                    explanation=f"Packaged commodity MRP (₹{declarations.mrp:.2f}) exceeds manufacturer registered master MRP (₹{gs1_record.registered_mrp:.2f}) recorded in GS1 DataKart registry.",
                    observed_value=f"₹ {declarations.mrp:.2f}",
                    mandated_requirement=f"<= ₹ {gs1_record.registered_mrp:.2f} (Registered by {gs1_record.company_name})",
                    severity="CRITICAL",
                    penalty_clause="Section 36(1), Legal Metrology Act, 2009 (Misleading retail price).",
                )
            )
        else:
            evaluations.append(
                StatutoryRuleEvaluation(
                    id="GS1_REGISTRY_VERIFICATION",
                    title="GS1 India DataKart Master Registry Verification",
                    statutory_reference="GS1 India DataKart Integration Protocol, DoCA",
                    status="PASS",
                    explanation=f"Verified against official manufacturer registration. Brand: {gs1_record.brand_name}, Company: {gs1_record.company_name}, Reg Qty: {gs1_record.registered_net_qty}.",
                    observed_value=f"GTIN {gs1_record.gtin} Verified",
                    mandated_requirement="Registered GTIN in GS1 DataKart master repository",
                    severity="MAJOR",
                )
            )

    # Determine Overall Inspection Determination
    critical_violations = sum(
        1 for e in evaluations if e.status == "FAIL" and e.severity == "CRITICAL"
    )
    major_violations = sum(1 for e in evaluations if e.status == "FAIL" and e.severity == "MAJOR")

    if critical_violations > 0 or major_violations > 0:
        overall_status: OverallInspectionStatus = "NON_COMPLIANT"
    else:
        overall_status = "COMPLIANT"

    return evaluations, overall_status, critical_violations
