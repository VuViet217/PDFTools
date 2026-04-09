"""
PDF Scan Enhancer Service - Làm rõ PDF scan
Sử dụng OpenCV để xử lý ảnh trong PDF scan
"""
import os
import io
from datetime import datetime
import fitz  # PyMuPDF
import cv2
import numpy as np


def _detect_quality(img_gray: np.ndarray) -> dict:
    """Phát hiện chất lượng ảnh scan"""
    h, w = img_gray.shape

    # Blur detection (Laplacian variance)
    laplacian_var = cv2.Laplacian(img_gray, cv2.CV_64F).var()
    is_blurry = laplacian_var < 100

    # Noise detection (standard deviation of high-freq)
    high_freq = cv2.subtract(img_gray, cv2.GaussianBlur(img_gray, (21, 21), 0))
    noise_level = np.std(high_freq)
    is_noisy = noise_level > 15

    # Background detection (mean brightness)
    mean_brightness = np.mean(img_gray)
    is_dark = mean_brightness < 100
    is_too_bright = mean_brightness > 220
    has_gray_bg = 150 < mean_brightness < 210

    # Contrast detection
    contrast = np.std(img_gray)
    is_low_contrast = contrast < 50

    return {
        "is_blurry": is_blurry,
        "blur_score": laplacian_var,
        "is_noisy": is_noisy,
        "noise_level": noise_level,
        "is_dark": is_dark,
        "is_too_bright": is_too_bright,
        "has_gray_bg": has_gray_bg,
        "is_low_contrast": is_low_contrast,
        "mean_brightness": mean_brightness,
        "contrast": contrast,
    }


def _enhance_image(img: np.ndarray, mode: str = "auto") -> np.ndarray:
    """Pipeline xử lý ảnh scan"""
    # Convert to grayscale for analysis
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        is_color = True
    else:
        gray = img.copy()
        is_color = False

    quality = _detect_quality(gray)

    if mode == "auto":
        # Auto pipeline based on detected quality
        result = img.copy()

        # 1. Denoise
        if quality["is_noisy"] or mode == "auto":
            if is_color:
                result = cv2.fastNlMeansDenoisingColored(result, None, 8, 8, 7, 21)
            else:
                result = cv2.fastNlMeansDenoising(result, None, 8, 7, 21)

        # 2. Contrast & Brightness normalization
        if is_color:
            lab = cv2.cvtColor(result, cv2.COLOR_BGR2LAB)
            l_channel = lab[:, :, 0]
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l_channel = clahe.apply(l_channel)
            lab[:, :, 0] = l_channel
            result = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
        else:
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            result = clahe.apply(result)

        # 3. Sharpen text
        kernel = np.array([[-0.5, -0.5, -0.5],
                           [-0.5,  5.0, -0.5],
                           [-0.5, -0.5, -0.5]])
        result = cv2.filter2D(result, -1, kernel)

        # 4. Background whitening (if gray/yellow background)
        if quality["has_gray_bg"]:
            if is_color:
                gray_result = cv2.cvtColor(result, cv2.COLOR_BGR2GRAY)
            else:
                gray_result = result.copy()
            # Threshold to find background
            _, bg_mask = cv2.threshold(gray_result, 200, 255, cv2.THRESH_BINARY)
            if is_color:
                result[bg_mask == 255] = [255, 255, 255]
            else:
                result[bg_mask == 255] = 255

    elif mode == "text":
        # Optimize for text readability
        if is_color:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img.copy()

        # Denoise
        gray = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)

        # Adaptive threshold for clean text
        result = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 8
        )
        is_color = False

    elif mode == "photo":
        # Enhance for photo-like scans
        result = img.copy()
        if is_color:
            result = cv2.fastNlMeansDenoisingColored(result, None, 6, 6, 7, 21)
            lab = cv2.cvtColor(result, cv2.COLOR_BGR2LAB)
            l_channel = lab[:, :, 0]
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            l_channel = clahe.apply(l_channel)
            lab[:, :, 0] = l_channel
            result = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
            # Moderate sharpen
            kernel = np.array([[0, -0.5, 0],
                               [-0.5, 3.0, -0.5],
                               [0, -0.5, 0]])
            result = cv2.filter2D(result, -1, kernel)
        else:
            result = cv2.fastNlMeansDenoising(result, None, 6, 7, 21)
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            result = clahe.apply(result)

    else:
        result = img.copy()

    return result


async def enhance_pdf(file_path: str, mode: str = "auto", dpi: int = 200) -> dict:
    """
    Làm rõ PDF scan.

    Args:
        file_path: Đường dẫn file PDF
        mode: Chế độ xử lý (auto / text / photo)
        dpi: Độ phân giải render (150-300)
    """
    try:
        if not os.path.exists(file_path):
            return {"success": False, "error": "File không tồn tại"}

        doc = fitz.open(file_path)
        total_pages = len(doc)
        new_doc = fitz.open()

        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)

        for i, page in enumerate(doc):
            # Render page to image
            pix = page.get_pixmap(matrix=mat)

            # Convert to numpy array
            img_data = pix.samples
            if pix.n == 4:  # RGBA
                img = np.frombuffer(img_data, dtype=np.uint8).reshape(pix.h, pix.w, 4)
                img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
            elif pix.n == 3:  # RGB
                img = np.frombuffer(img_data, dtype=np.uint8).reshape(pix.h, pix.w, 3)
                img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            else:  # Grayscale
                img = np.frombuffer(img_data, dtype=np.uint8).reshape(pix.h, pix.w)

            # Enhance
            enhanced = _enhance_image(img, mode)

            # Convert back to PDF page
            if len(enhanced.shape) == 2:
                # Grayscale
                enhanced_rgb = cv2.cvtColor(enhanced, cv2.COLOR_GRAY2RGB)
            else:
                enhanced_rgb = cv2.cvtColor(enhanced, cv2.COLOR_BGR2RGB)

            # Encode to PNG bytes
            _, png_data = cv2.imencode(".png", enhanced_rgb)
            png_bytes = png_data.tobytes()

            # Insert as new page with original dimensions
            img_doc = fitz.open("png", png_bytes)
            rect = page.rect
            new_page = new_doc.new_page(width=rect.width, height=rect.height)
            new_page.insert_image(rect, stream=png_bytes)
            img_doc.close()

        output_buffer = io.BytesIO()
        new_doc.save(output_buffer, garbage=3, deflate=True)
        new_doc.close()
        doc.close()
        output_buffer.seek(0)

        original_size = os.path.getsize(file_path)
        new_size = len(output_buffer.getvalue())

        return {
            "success": True,
            "output_pdf": output_buffer.getvalue(),
            "filename": f"enhanced_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
            "total_pages": total_pages,
            "original_size": original_size,
            "new_size": new_size,
        }

    except Exception as e:
        return {"success": False, "error": str(e)}
