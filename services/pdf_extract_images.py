"""
Service - Extract images from PDF
Trích xuất tất cả hình ảnh từ file PDF
"""
import io
import fitz  # PyMuPDF
from PIL import Image


async def extract_images_from_pdf(pdf_bytes: bytes) -> dict:
    """
    Trích xuất tất cả hình ảnh từ PDF.

    Args:
        pdf_bytes: Nội dung file PDF dạng bytes

    Returns:
        {
            "success": bool,
            "images": [bytes, ...],
            "filenames": [str, ...],
            "total_images": int,
            "error": str (nếu có)
        }
    """
    images = []
    filenames = []

    try:
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")

        if len(pdf_document) == 0:
            pdf_document.close()
            return {"success": False, "error": "PDF_EMPTY"}

        img_index = 0
        seen_xrefs = set()

        for page_num in range(len(pdf_document)):
            page = pdf_document[page_num]
            image_list = page.get_images(full=True)

            for img_info in image_list:
                xref = img_info[0]

                # Bỏ qua ảnh trùng (cùng xref = cùng ảnh nhúng)
                if xref in seen_xrefs:
                    continue
                seen_xrefs.add(xref)

                try:
                    base_image = pdf_document.extract_image(xref)
                    if not base_image:
                        continue

                    image_bytes = base_image["image"]
                    image_ext = base_image.get("ext", "png")

                    # Bỏ qua ảnh quá nhỏ (< 2KB, thường là mask/artifact)
                    if len(image_bytes) < 2048:
                        continue

                    # Validate bằng Pillow và kiểm tra kích thước pixel
                    try:
                        img = Image.open(io.BytesIO(image_bytes))
                        w, h = img.size
                        # Bỏ qua ảnh quá nhỏ (icon, dot, ...)
                        if w < 50 or h < 50:
                            continue
                    except Exception:
                        continue

                    # Chuẩn hóa ext
                    if image_ext in ("jpeg", "jpg"):
                        image_ext = "jpg"
                    elif image_ext not in ("png", "jpg", "bmp", "tiff"):
                        # Convert sang PNG cho các định dạng lạ
                        buf = io.BytesIO()
                        img.save(buf, format="PNG")
                        buf.seek(0)
                        image_bytes = buf.getvalue()
                        image_ext = "png"

                    img_index += 1
                    filename = f"image_{img_index}_page{page_num + 1}.{image_ext}"
                    images.append(image_bytes)
                    filenames.append(filename)

                except Exception:
                    continue

        pdf_document.close()

        if not images:
            return {"success": False, "error": "NO_IMAGES"}

        return {
            "success": True,
            "images": images,
            "filenames": filenames,
            "total_images": len(images),
        }

    except Exception as e:
        return {"success": False, "error": str(e)}
