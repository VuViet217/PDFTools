"""
Service - Convert PDF to Images
Hỗ trợ chuyển đổi PDF thành ảnh PNG hoặc JPG
"""
import os
import tempfile
from pathlib import Path
import asyncio
import fitz  # PyMuPDF
from PIL import Image
import io
import uuid

async def convert_pdf_to_images(pdf_path: str, image_format: str = "png", quality: int = 85) -> dict:
    """
    Chuyển đổi PDF sang ảnh
    
    Args:
        pdf_path: Đường dẫn file PDF
        image_format: Định dạng ảnh (png, jpg)
        quality: Chất lượng ảnh (1-100) cho JPG
    
    Returns:
        {
            "success": bool,
            "images": [bytes, bytes, ...],  # Danh sách ảnh dạng bytes
            "filenames": [str, str, ...],   # Tên file ảnh tương ứng
            "error": str (nếu có lỗi)
        }
    """
    images = []
    filenames = []
    
    try:
        # Validate input
        if not os.path.exists(pdf_path):
            return {"success": False, "error": "File PDF không tồn tại"}
        
        if image_format.lower() not in ["png", "jpg"]:
            return {"success": False, "error": f"Định dạng {image_format} không được hỗ trợ"}
        
        # Mở PDF
        pdf_document = fitz.open(pdf_path)
        total_pages = len(pdf_document)
        
        if total_pages == 0:
            return {"success": False, "error": "PDF không có trang"}
        
        # Chuyển đổi từng trang thành ảnh
        for page_num in range(total_pages):
            page = pdf_document[page_num]
            
            # Render trang thành ảnh với độ phân giải cao (300 DPI)
            # Tính toán zoom để có độ phân giải cao
            mat = fitz.Matrix(2, 2)  # 2x zoom = ~192 DPI
            pix = page.get_pixmap(matrix=mat)
            
            # Convert PyMuPDF pixmap to Pillow Image
            img_data = pix.tobytes("ppm")
            img = Image.open(io.BytesIO(img_data))
            
            # Convert RGBA to RGB nếu cần
            if img.mode == 'RGBA':
                bg = Image.new('RGB', img.size, (255, 255, 255))
                bg.paste(img, mask=img.split()[3])
                img = bg
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Lưu ảnh vào bytes
            img_bytes = io.BytesIO()
            
            # Format định dạng file
            img_format = "PNG" if image_format.lower() == "png" else "JPEG"
            
            if image_format.lower() == "jpg":
                img.save(img_bytes, format=img_format, quality=quality, optimize=True)
            else:
                img.save(img_bytes, format=img_format, optimize=True)
            
            img_bytes.seek(0)
            images.append(img_bytes.getvalue())
            
            # Tên file: page_1.png, page_2.png, ...
            filename = f"page_{page_num + 1}.{image_format.lower()}"
            filenames.append(filename)
        
        pdf_document.close()
        
        return {
            "success": True,
            "images": images,
            "filenames": filenames,
            "total_pages": total_pages
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": f"Lỗi chuyển đổi: {str(e)}"
        }


async def get_pdf_page_count(pdf_path: str) -> dict:
    """
    Lấy số trang của PDF
    
    Returns:
        {"success": bool, "page_count": int or "error": str}
    """
    try:
        if not os.path.exists(pdf_path):
            return {"success": False, "error": "File PDF không tồn tại"}
        
        pdf_document = fitz.open(pdf_path)
        page_count = len(pdf_document)
        pdf_document.close()
        
        return {"success": True, "page_count": page_count}
    except Exception as e:
        return {"success": False, "error": str(e)}
