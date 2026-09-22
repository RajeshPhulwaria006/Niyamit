"""
@file routes_ocr.py
@description PaddleOCR / RapidOCR PP-OCRv4 image inference endpoints.
Accepts image uploads via JSON body (Base64 data URL) or multipart/form-data,
runs high-accuracy ONNX inference, and returns extracted text, bounding metrics, and declarations.
"""

import base64
import io

import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from PIL import Image
from rapidocr_onnxruntime import RapidOCR

from app.engine.calibration import calibrate_optical_metrics
from app.engine.ocr_parser import (
    extract_bounding_boxes_and_font_height,
    extract_declarations_from_text,
)
from app.schemas import ExtractedPackageDeclarations

router = APIRouter(prefix="/api/ocr", tags=["OCR Engine"])

# Initialize RapidOCR engine with PaddleOCR PP-OCRv4 ONNX models
ocr_engine = RapidOCR()


def process_cv_image(img: Image.Image, barcode: str | None = None):
    """
    Executes PaddleOCR inference on PIL image, extracts text lines, bounding boxes,
    calibrates font heights, and extracts Rule 6 declarations.
    """
    img_rgb = img.convert("RGB")
    np_img = np.array(img_rgb)
    width, _height = img.size

    result, elapse = ocr_engine(np_img)

    lines = []
    if result:
        for item in result:
            lines.append(item[1])

    raw_text = "\n".join(lines)

    b_width, b_height, avg_numeral_h, avg_numeral_w = extract_bounding_boxes_and_font_height(result)

    declarations = extract_declarations_from_text(raw_text, detected_barcode=barcode)

    calibration = calibrate_optical_metrics(
        barcode_width_px=b_width,
        barcode_height_px=b_height,
        numeral_box_height_px=avg_numeral_h,
        numeral_box_width_px=avg_numeral_w,
        image_width_px=width,
    )

    return {
        "rawText": raw_text,
        "raw_text": raw_text,
        "lineCount": len(lines),
        "detectedNumeralHeightPx": round(avg_numeral_h, 1) if avg_numeral_h else 24.0,
        "declarations": declarations.model_dump(by_alias=True),
        "calibration": calibration.model_dump(by_alias=True),
        "inferenceTimeSeconds": round(sum(elapse) if elapse else 0.0, 3),
    }


@router.post("")
async def run_ocr(
    request: Request,
    file: UploadFile | None = File(None),
    image_base64: str | None = Form(None),
    barcode: str | None = Form(None),
):
    """
    Packaging OCR inference endpoint.
    Accepts:
    1. JSON: {"imageBase64": "data:image/jpeg;base64,...", "barcode": "..."}
    2. Multipart: file or form data (image_base64, barcode)
    """
    try:
        clean_barcode = barcode
        img_bytes = None

        content_type = request.headers.get("content-type", "")

        if "application/json" in content_type:
            body = await request.json()
            images_list = body.get("images") or []
            raw_b64 = body.get("imageBase64") or body.get("image_base64")
            clean_barcode = body.get("barcode", clean_barcode)

            # Check if multi-shot angles were submitted
            if images_list and isinstance(images_list, list) and len(images_list) > 1:
                from app.engine.ocr_parser import merge_declarations
                combined_texts = []
                declarations_list = []
                total_lines = 0
                max_numeral_h = 24.0

                for img_item in images_list:
                    if "," in img_item:
                        img_item = img_item.split(",", 1)[1]
                    item_bytes = base64.b64decode(img_item)
                    sub_img = Image.open(io.BytesIO(item_bytes))
                    sub_res = process_cv_image(sub_img, barcode=clean_barcode)
                    combined_texts.append(sub_res["rawText"])
                    total_lines += sub_res["lineCount"]
                    max_numeral_h = max(max_numeral_h, sub_res.get("detectedNumeralHeightPx", 24.0))
                    declarations_list.append(ExtractedPackageDeclarations(**sub_res["declarations"]))

                merged_decl = merge_declarations(declarations_list)
                combined_raw = "\n---\n".join(combined_texts)

                return {
                    "rawText": combined_raw,
                    "raw_text": combined_raw,
                    "lineCount": total_lines,
                    "detectedNumeralHeightPx": max_numeral_h,
                    "declarations": merged_decl.model_dump(by_alias=True),
                    "calibration": calibrate_optical_metrics().model_dump(by_alias=True),
                    "isMultiShot": True,
                    "shotCount": len(images_list)
                }

            if not raw_b64 and images_list:
                raw_b64 = images_list[0]

            if not raw_b64:
                raise HTTPException(status_code=400, detail="Missing 'imageBase64' or 'images' in JSON payload")
            if "," in raw_b64:
                raw_b64 = raw_b64.split(",", 1)[1]
            img_bytes = base64.b64decode(raw_b64)
        elif file:
            img_bytes = await file.read()
        elif image_base64:
            clean_b64 = image_base64
            if "," in clean_b64:
                clean_b64 = clean_b64.split(",", 1)[1]
            img_bytes = base64.b64decode(clean_b64)
        else:
            raise HTTPException(
                status_code=400, detail="No image file or imageBase64 data provided"
            )

        img = Image.open(io.BytesIO(img_bytes))
        return process_cv_image(img, barcode=clean_barcode)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR inference failed: {e!s}") from e
