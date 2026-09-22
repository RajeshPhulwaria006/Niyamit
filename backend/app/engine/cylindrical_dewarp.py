"""
@file cylindrical_dewarp.py
@description Cylindrical surface de-warping and unrolling transform for bottles, cans, and squeeze tubes.
Reverses perspective distortion and non-linear horizontal compression near the curved edges of cylindrical packaging
using inverse cylindrical coordinate mapping: x = R * arcsin(x' / R).
"""

import cv2
import numpy as np
from PIL import Image


def dewarp_cylindrical_surface(
    image: np.ndarray,
    radius_factor: float = 1.15,
    crop_factor: float = 0.95,
) -> np.ndarray:
    """
    Unrolls a curved cylindrical package surface into a flat rectangular label representation.
    Applies inverse cylindrical projection via cv2.remap.

    :param image: Input RGB or Grayscale numpy image
    :param radius_factor: Factor controlling estimated cylinder curvature radius relative to image width
    :param crop_factor: Factor to clip extreme edge singularities near 90 degrees
    :return: Dewarped, unrolled planar image
    """
    h, w = image.shape[:2]
    xc = w / 2.0
    radius = (w * radius_factor) / 2.0

    map_x = np.zeros((h, w), dtype=np.float32)
    map_y = np.zeros((h, w), dtype=np.float32)

    # Vectorized cylindrical coordinate mapping
    # theta ranges across the cylinder frontal view
    angles = np.linspace(-np.pi / 3.0 * crop_factor, np.pi / 3.0 * crop_factor, w, dtype=np.float32)
    src_x_row = xc + radius * np.sin(angles)

    for y in range(h):
        map_y[y, :] = y
        map_x[y, :] = src_x_row

    dewarped = cv2.remap(
        image,
        map_x,
        map_y,
        interpolation=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_REPLICATE,
    )
    return dewarped


def preprocess_cylindrical_pill_image(img: Image.Image) -> Image.Image:
    """
    Takes a PIL Image of a curved bottle/tube, runs cylindrical de-warping,
    and returns a normalized PIL Image ready for PaddleOCR.
    """
    np_img = np.array(img.convert("RGB"))
    dewarped_np = dewarp_cylindrical_surface(np_img)
    return Image.fromarray(dewarped_np)
