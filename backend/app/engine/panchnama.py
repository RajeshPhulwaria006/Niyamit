"""
@file panchnama.py
@description Statutory Inspection Memorandum and Form VIII Legal Notice Generator.
Generates an official, court-admissible inspection report under Sections 15 & 36 of the
Legal Metrology Act, 2009 and Legal Metrology (Packaged Commodities) Rules, 2011.
"""

from datetime import datetime

from app.schemas import (
    ExtractedPackageDeclarations,
    GS1ProductRecord,
    PhysicalCalibrationMetrics,
    StatutoryRuleEvaluation,
)


def generate_form_viii_notice(
    audit_id: str,
    inspector_id: str,
    inspection_location: str,
    declarations: ExtractedPackageDeclarations,
    calibration: PhysicalCalibrationMetrics,
    evaluations: list[StatutoryRuleEvaluation],
    gs1_record: GS1ProductRecord = None,
) -> str:
    """
    Generates statutory Panchnama / Form VIII Inspection Memorandum in markdown format.
    """
    now = datetime.now()
    audit_date = now.strftime("%d %B %Y at %H:%M:%S IST")
    violations = [e for e in evaluations if e.status == "FAIL"]
    is_compliant = len(violations) == 0

    lines = [
        "# GOVERNMENT OF INDIA",
        "## MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION",
        "### DEPARTMENT OF CONSUMER AFFAIRS — LEGAL METROLOGY DIVISION",
        "**INSPECTION MEMORANDUM & FORM VIII SEIZURE NOTICE**",
        "*(Under Sections 15, 18, 36 & 53 of the Legal Metrology Act, 2009 read with LMPC Rules, 2011)*",
        "",
        "---",
        f"- **Memorandum Reference No:** LMPC/ENF/{audit_id}",
        f"- **Date & Time of Inspection:** {audit_date}",
        f"- **Inspecting Officer ID:** {inspector_id}",
        f"- **Inspection Premises / Location:** {inspection_location}",
        f"- **Overall Statutory Status:** {'COMPLIANT' if is_compliant else 'NON-COMPLIANT (STATUTORY OFFENCE DETECTED)'}",
        "---",
        "",
        "### 1. PARTICULARS OF THE PACKAGED COMMODITY INSPECTED",
        f"- **GTIN / Barcode:** {declarations.barcode or (gs1_record.gtin if gs1_record else 'Not Detected')}",
        f"- **Brand / Product Identity:** {gs1_record.product_name if gs1_record else (declarations.manufacturer_name or 'Commercial Pack')}",
        f"- **Manufacturer / Packer:** {declarations.manufacturer_name or (gs1_record.company_name if gs1_record else 'Not Declared')}",
        f"- **Registered Address:** {declarations.manufacturer_address or 'Deficient / Not Fully Declared'}",
        f"- **Country of Origin:** {declarations.country_of_origin or 'DEFICIENT (Mandatory Under Rule 6(1)(b))'}",
        f"- **Declared Net Quantity:** {declarations.net_quantity_value} {declarations.net_quantity_unit or ''}",
        f"- **Declared Retail Price (MRP):** ₹{declarations.mrp or '0.00'} {'(Inclusive of all taxes)' if declarations.has_inclusive_of_taxes else 'TAX CLAUSE DEFICIENT'}",
        f"- **Declared Unit Sale Price (USP):** {('₹' + str(declarations.declared_usp) + ' ' + (declarations.declared_usp_unit or '')) if declarations.declared_usp else 'NOT DECLARED'}",
        f"- **Date of Packaging / Manufacture:** {declarations.manufacturing_date or 'NOT FOUND'}",
        f"- **Consumer Grievance Care:** Phone: {declarations.consumer_care_phone or 'Nil'} | Email: {declarations.consumer_care_email or 'Nil'}",
        "",
        "### 2. PHYSICAL OPTICAL FIDUCIAL SCALE & FONT METRICS (RULE 7 TABLE-I)",
        f"- **Optical Scale Factor:** {calibration.mm_per_pixel:.4f} mm/pixel (GS1 EAN-13 nominal 37.29mm fiducial)",
        f"- **Principal Display Panel (PDP) Area:** {calibration.pdp_area_cm2:.1f} cm²",
        f"- **Measured Numeral Height:** {calibration.measured_numeral_height_mm:.2f} mm",
        f"- **Mandated Minimum Numeral Height:** {calibration.mandated_min_height_mm:.2f} mm",
        f"- **Width-to-Height Ratio:** {calibration.width_to_height_ratio:.2f} (Mandated >= 0.33)",
        f"- **Rule 7 Geometric Compliance:** {'PASSED' if calibration.is_font_height_compliant else 'FAILED — DEFICIENT FONT HEIGHT'}",
        "",
    ]

    if violations:
        lines.append("### 3. STATUTORY CONTRAVENTIONS & VIOLATIONS IDENTIFIED")
        for idx, v in enumerate(violations, 1):
            lines.append(f"#### Violation {idx}: {v.title}")
            lines.append(f"- **Statutory Provision:** {v.statutory_reference}")
            lines.append(f"- **Severity:** {v.severity}")
            lines.append(f"- **Observed Packaging Value:** {v.observed_value}")
            lines.append(f"- **Statutory Mandate:** {v.mandated_requirement}")
            lines.append(f"- **Legal Finding:** {v.explanation}")
            if v.penalty_clause:
                lines.append(f"- **Penalty & Cognizance:** {v.penalty_clause}")
            lines.append("")

        lines.extend(
            [
                "### 4. DIRECTIVE & SHOW-CAUSE NOTICE",
                "WHEREUPON, in exercise of powers conferred under Section 15(1) and Section 36 of the Legal Metrology Act, 2009,",
                "the undersigned Legal Metrology Officer hereby puts the Manufacturer, Packer, and Retailer on notice.",
                "You are directed to SHOW CAUSE within fifteen (15) days of service of this memorandum why prosecution",
                "or compound proceedings under Section 48/49 of the Act should not be initiated before the competent Court of Judicial Magistrate.",
                "",
                "Issued under my hand and official seal.",
                f"**Inspecting Officer:** {inspector_id}",
                "**Division:** Department of Consumer Affairs, Legal Metrology Enforcement Cell",
            ]
        )
    else:
        lines.extend(
            [
                "### 3. STATUTORY AUDIT SUMMARY",
                "All mandatory packaging declarations under Rule 6, font geometry under Rule 7 Table-I, SI units under Rule 12,",
                "and Unit Sale Price (USP) under Rule 6(11) were verified and found to be in complete statutory compliance.",
                "No compounding or enforcement seizure is warranted for this specimen.",
                "",
                f"**Inspecting Officer:** {inspector_id}",
                "**Division:** Department of Consumer Affairs, Legal Metrology Cell",
            ]
        )

    return "\n".join(lines)
