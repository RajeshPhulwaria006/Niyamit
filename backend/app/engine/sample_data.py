"""
@file sample_data.py
@description Curated test cases and benchmark scenarios for Legal Metrology Packaged Commodities (LMPC).
Provides 1-click test datasets for testing all compliance rules, optical calibration, and edge cases.
"""

from typing import Any

SAMPLE_PACKAGES: list[dict[str, Any]] = [
    {
        "id": "SAMPLE_FACEWASH_CRIMP",
        "name": "Cipla Astaberry Rice Water Face Wash (100ml Squeeze Tube)",
        "category": "Cosmetics & Personal Care",
        "summary": "Real-world squeeze tube with embossed crimp seal manufacturing date under Rule 6(1)(d) proviso, verified via PaddleOCR.",
        "expected_outcome": "COMPLIANT",
        "barcode": "8904035402011",
        "raw_text": """Astaberry
RICE WATER
BRIGHTENING FACE WASH
Manufactured by: Pontika Aerotech Limited, Village Johron, PO Puruwala, Nahan Road, Paonta Sahib, Distt Sirmour, Himachal Pradesh-173001
Marketed by: Cipla Health Limited, F/12, 1st Floor, Trade World, C-Wing, Kamala City, Senapati Bapat Marg, Lower Parel, Mumbai-400013, Maharashtra
Toll Free: 1800-1201-43143 | Email: contactus@ciplahealth.in
Country of Origin: India
Net Volume: 100ml
M.R.P.: 195.00 (Incl. of all taxes)
USP per ml: 1.95
Batch No., Mfg. Date See on the crimp
Use before 24 months from date of manufacturing""",
        "calibration": {
            "barcode_width_px": 350.0,
            "barcode_height_px": 240.0,
            "mm_per_pixel": 0.1065,
            "pdp_area_cm2": 95.0,
            "measured_numeral_height_mm": 2.02,
            "measured_numeral_width_mm": 0.95,
            "mandated_min_height_mm": 1.5,
            "is_font_height_compliant": True,
            "width_to_height_ratio": 0.47,
        },
        "declarations": {
            "mrp": 195.0,
            "mrp_raw_text": "M.R.P.: 195.00 (Incl. of all taxes)",
            "has_inclusive_of_taxes": True,
            "net_quantity_value": 100.0,
            "net_quantity_unit": "ml",
            "net_quantity_raw_text": "Net Volume: 100ml",
            "is_standard_unit_symbol": True,
            "declared_usp": 1.95,
            "declared_usp_unit": "per ml",
            "calculated_usp": 1.95,
            "usp_discrepancy_percent": 0.0,
            "manufacturer_name": "Cipla Health Limited",
            "manufacturer_address": "Trade World, Kamala City, Lower Parel, Mumbai-400013",
            "country_of_origin": "India",
            "manufacturing_date": "Embossed on crimp / seal (Rule 6(1)(d) statutory proviso)",
            "expiry_date": "Use before 24 months from date of manufacturing",
            "consumer_care_phone": "1800-1201-43143",
            "consumer_care_email": "contactus@ciplahealth.in",
            "barcode": "8904035402011",
            "is_dual_price_or_sticker_detected": False,
        },
    },
    {
        "id": "SAMPLE_COMPLIANT_BISCUITS",
        "name": "Britannia Good Day Butter Cookies (120g)",
        "category": "Bakery & FMCG",
        "summary": "Fully compliant retail pack meeting all Rule 6 declarations, USP formula, and Rule 7 font standards.",
        "expected_outcome": "COMPLIANT",
        "barcode": "8901063012011",
        "raw_text": """BRITANNIA GOOD DAY BUTTER COOKIES
Mfd by: Britannia Industries Limited
Plot No. 1, Sector 2, Industrial Area, Bidadi, Bengaluru, Karnataka - 562109
Net Quantity: 120 g
MRP: Rs. 30.00 (incl. of all taxes)
USP: Rs. 0.25 / g
Country of Origin: India
PKD: 08/2024
Customer Care: 18004254449
Email: feedback@britindia.com
Barcode: 8901063012011""",
        "calibration": {
            "barcode_width_px": 380.0,
            "barcode_height_px": 260.0,
            "mm_per_pixel": 0.098,
            "pdp_area_cm2": 120.0,
            "measured_numeral_height_mm": 3.1,
            "measured_numeral_width_mm": 1.5,
            "mandated_min_height_mm": 2.0,
            "is_font_height_compliant": True,
            "width_to_height_ratio": 0.48,
        },
        "declarations": {
            "mrp": 30.0,
            "mrp_raw_text": "MRP: Rs. 30.00 (incl. of all taxes)",
            "has_inclusive_of_taxes": True,
            "net_quantity_value": 120.0,
            "net_quantity_unit": "g",
            "net_quantity_raw_text": "Net Quantity: 120 g",
            "is_standard_unit_symbol": True,
            "declared_usp": 0.25,
            "declared_usp_unit": "per g",
            "calculated_usp": 0.25,
            "usp_discrepancy_percent": 0.0,
            "manufacturer_name": "Britannia Industries Limited",
            "manufacturer_address": "Plot No. 1, Sector 2, Industrial Area, Bidadi, Bengaluru, Karnataka - 562109",
            "country_of_origin": "India",
            "manufacturing_date": "08/2024",
            "expiry_date": "Best before 6 months from packaging",
            "consumer_care_phone": "18004254449",
            "consumer_care_email": "feedback@britindia.com",
            "barcode": "8901063012011",
            "is_dual_price_or_sticker_detected": False,
        },
    },
    {
        "id": "SAMPLE_VIOLATION_POTATO_CHIPS",
        "name": "Spicy Crunch Potato Chips (Common Violations)",
        "category": "Snacks & Packaged Food",
        "summary": "Violations: Missing Unit Sale Price (Rule 6(11)), Prohibited unit symbol 'gms' (Rule 12), and font size 1.2mm below Table-I mandate (2.0mm).",
        "expected_outcome": "NON_COMPLIANT",
        "barcode": "8908823192011",
        "raw_text": """SPICY CRUNCH POTATO CHIPS
Manufactured by: Sunrise Snack Foods Pvt Ltd, GIDC Vatva, Ahmedabad, Gujarat - 382445
Net Wt: 85 gms
MRP Rs. 20.00 incl. of all taxes
PKD 06/2024
Country of Origin: India
Helpline: 9876543210
Email: support@sunrisesnacks.in""",
        "calibration": {
            "barcode_width_px": 370.0,
            "barcode_height_px": 250.0,
            "mm_per_pixel": 0.101,
            "pdp_area_cm2": 180.0,
            "measured_numeral_height_mm": 1.2,
            "measured_numeral_width_mm": 0.5,
            "mandated_min_height_mm": 2.0,
            "is_font_height_compliant": False,
            "width_to_height_ratio": 0.42,
        },
        "declarations": {
            "mrp": 20.0,
            "mrp_raw_text": "MRP Rs. 20.00 incl. of all taxes",
            "has_inclusive_of_taxes": True,
            "net_quantity_value": 85.0,
            "net_quantity_unit": "gms",
            "net_quantity_raw_text": "Net Wt: 85 gms",
            "is_standard_unit_symbol": False,
            "declared_usp": None,
            "declared_usp_unit": None,
            "calculated_usp": 0.24,
            "usp_discrepancy_percent": None,
            "manufacturer_name": "Sunrise Snack Foods Pvt Ltd",
            "manufacturer_address": "GIDC Vatva, Ahmedabad, Gujarat - 382445",
            "country_of_origin": "India",
            "manufacturing_date": "06/2024",
            "expiry_date": None,
            "consumer_care_phone": "9876543210",
            "consumer_care_email": "support@sunrisesnacks.in",
            "barcode": "8908823192011",
            "is_dual_price_or_sticker_detected": False,
        },
    },
    {
        "id": "SAMPLE_VIOLATION_STICKER_TAMPERING",
        "name": "Sparkle Energy Drink (Dual Price / Sticker Alteration)",
        "category": "Beverages",
        "summary": "Critical Offence under Section 36: Retail sticker pasting revising printed MRP from ₹60 to ₹75, violating Legal Metrology Act.",
        "expected_outcome": "NON_COMPLIANT",
        "barcode": "8901234567890",
        "raw_text": """SPARKLE ENERGY DRINK 250ml
Original MRP: Rs. 60.00
REVISED STICKER MRP: Rs. 75.00
Mfd: Sparkle Beverages Pvt Ltd, Pune, MH - 411001
Origin: India
PKD: 07/2024""",
        "calibration": {
            "barcode_width_px": 360.0,
            "barcode_height_px": 240.0,
            "mm_per_pixel": 0.103,
            "pdp_area_cm2": 150.0,
            "measured_numeral_height_mm": 2.2,
            "measured_numeral_width_mm": 1.0,
            "mandated_min_height_mm": 2.0,
            "is_font_height_compliant": True,
            "width_to_height_ratio": 0.45,
        },
        "declarations": {
            "mrp": 75.0,
            "mrp_raw_text": "REVISED STICKER MRP: Rs. 75.00",
            "has_inclusive_of_taxes": False,
            "net_quantity_value": 250.0,
            "net_quantity_unit": "ml",
            "net_quantity_raw_text": "250ml",
            "is_standard_unit_symbol": True,
            "declared_usp": None,
            "declared_usp_unit": None,
            "calculated_usp": 0.30,
            "usp_discrepancy_percent": None,
            "manufacturer_name": "Sparkle Beverages Pvt Ltd",
            "manufacturer_address": "Pune, MH - 411001",
            "country_of_origin": "India",
            "manufacturing_date": "07/2024",
            "expiry_date": None,
            "consumer_care_phone": None,
            "consumer_care_email": None,
            "barcode": "8901234567890",
            "is_dual_price_or_sticker_detected": True,
        },
    },
]
