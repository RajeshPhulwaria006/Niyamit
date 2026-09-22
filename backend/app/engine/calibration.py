"""
@file calibration.py
@description Optical fiducial scale calibration and Rule 7 Table-I font geometry verification.
Calibrates camera pixel coordinates to physical millimeters using the standard GS1 EAN-13 barcode fiducial (37.29 mm nominal width).
"""

from app.schemas import PhysicalCalibrationMetrics

# Standard GS1 General Specifications nominal dimensions for EAN-13 Barcode (100% magnification)
NOMINAL_EAN13_WIDTH_MM = 37.29
NOMINAL_EAN13_HEIGHT_MM = 25.93


def get_mandated_font_height_mm(pdp_area_cm2: float, is_blown_or_moulded: bool = False) -> float:
    """
    Computes mandatory minimum numeral height based on Principal Display Panel (PDP) area
    under Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 7, Table-I.

    Table-I Statutory Thresholds:
    1. Area <= 50 cm²: Normal: 1.0 mm, Blown/Moulded: 1.5 mm
    2. 50 cm² < Area <= 100 cm²: Normal: 1.5 mm, Blown/Moulded: 3.0 mm
    3. 100 cm² < Area <= 500 cm²: Normal: 2.0 mm, Blown/Moulded: 4.0 mm
    4. 500 cm² < Area <= 2500 cm²: Normal: 4.0 mm, Blown/Moulded: 6.0 mm
    5. Area > 2500 cm²: Normal: 6.0 mm, Blown/Moulded: 6.0 mm
    """
    if pdp_area_cm2 <= 50.0:
        return 1.5 if is_blown_or_moulded else 1.0
    elif pdp_area_cm2 <= 100.0:
        return 3.0 if is_blown_or_moulded else 1.5
    elif pdp_area_cm2 <= 500.0:
        return 4.0 if is_blown_or_moulded else 2.0
    elif pdp_area_cm2 <= 2500.0:
        return 6.0 if is_blown_or_moulded else 4.0
    else:
        return 6.0


def calibrate_optical_metrics(
    barcode_width_px: float | None = None,
    barcode_height_px: float | None = None,
    numeral_box_height_px: float | None = None,
    numeral_box_width_px: float | None = None,
    package_type: str = "RECTANGULAR",
    package_width_cm: float = 7.5,
    package_height_cm: float = 16.0,
    is_blown_or_moulded: bool = False,
    image_width_px: int = 1280,
) -> PhysicalCalibrationMetrics:
    """
    Derives physical dimensions (in mm) from image pixel bounding boxes using optical fiducial scaling.
    If barcode width is provided, uses 37.29 mm / barcode_width_px.
    Otherwise estimates mm_per_pixel based on typical smartphone focal distance / sensor width.
    """
    if barcode_width_px and barcode_width_px > 10.0:
        mm_per_pixel = NOMINAL_EAN13_WIDTH_MM / barcode_width_px
        b_width_px = float(barcode_width_px)
        b_height_px = (
            float(barcode_height_px)
            if barcode_height_px
            else (b_width_px * (NOMINAL_EAN13_HEIGHT_MM / NOMINAL_EAN13_WIDTH_MM))
        )
    else:
        # Standard calibration fallback for 1080p-1440p smartphone cameras at ~25cm distance
        # Typical FOV at 25cm is ~200mm across the sensor width
        mm_per_pixel = 200.0 / max(float(image_width_px), 800.0)
        b_width_px = NOMINAL_EAN13_WIDTH_MM / mm_per_pixel
        b_height_px = NOMINAL_EAN13_HEIGHT_MM / mm_per_pixel

    # Calculate Principal Display Panel Area per Rule 2(h)
    if package_type.upper() in ["CYLINDRICAL", "TUBE", "BOTTLE"]:
        # For cylindrical/tube container: 40% of height x circumference (or 40% of height x width x pi)
        # Using projected frontal dimensions: 0.4 * height * (width * 3.14159)
        pdp_area_cm2 = 0.40 * package_height_cm * (package_width_cm * 3.14159)
    else:
        # Standard rectangular carton/pouch: Height x Width
        pdp_area_cm2 = package_height_cm * package_width_cm

    mandated_min_h = get_mandated_font_height_mm(pdp_area_cm2, is_blown_or_moulded)

    # Measured font height in mm
    if numeral_box_height_px and numeral_box_height_px > 0:
        measured_numeral_height_mm = round(numeral_box_height_px * mm_per_pixel, 2)
    else:
        # Default typical measured size if no specific box provided
        measured_numeral_height_mm = round(22.0 * mm_per_pixel, 2)

    if numeral_box_width_px and numeral_box_width_px > 0:
        measured_numeral_width_mm = round(numeral_box_width_px * mm_per_pixel, 2)
    else:
        measured_numeral_width_mm = round(measured_numeral_height_mm * 0.45, 2)

    width_ratio = round(measured_numeral_width_mm / max(measured_numeral_height_mm, 0.1), 2)
    is_compliant = (measured_numeral_height_mm >= mandated_min_h) and (width_ratio >= 0.33)

    return PhysicalCalibrationMetrics(
        barcode_width_px=round(b_width_px, 1),
        barcode_height_px=round(b_height_px, 1),
        mm_per_pixel=round(mm_per_pixel, 4),
        pdp_area_cm2=round(pdp_area_cm2, 2),
        measured_numeral_height_mm=measured_numeral_height_mm,
        measured_numeral_width_mm=measured_numeral_width_mm,
        mandated_min_height_mm=mandated_min_h,
        is_font_height_compliant=is_compliant,
        width_to_height_ratio=width_ratio,
    )
