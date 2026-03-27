"""
PDF Security Service - Khóa/Mở khóa file PDF
"""
import os
import io
from datetime import datetime
from pypdf import PdfReader, PdfWriter

async def protect_pdf(file_path: str, password: str) -> dict:
    """
    Đặt mật khẩu bảo vệ file PDF
    """
    try:
        if not os.path.exists(file_path):
            return {"success": False, "error": "File không tồn tại"}
            
        reader = PdfReader(file_path)
        writer = PdfWriter()
        
        # Đọc tất cả các trang
        for page in reader.pages:
            writer.add_page(page)
            
        # Mã hóa (Encryption) với thuật toán AES-128 chuẩn
        writer.encrypt(password, algorithm="AES-128")
        
        output_buffer = io.BytesIO()
        writer.write(output_buffer)
        output_buffer.seek(0)
        
        return {
            "success": True,
            "output_pdf": output_buffer.getvalue(),
            "filename": f"protected_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

async def unlock_pdf(file_path: str, password: str) -> dict:
    """
    Mở khóa và gỡ bỏ mật khẩu vĩnh viễn khỏi file PDF
    """
    try:
        if not os.path.exists(file_path):
            return {"success": False, "error": "File không tồn tại"}
            
        reader = PdfReader(file_path)
        
        if reader.is_encrypted:
            # Giải mã bằng password cung cấp
            decrypted = reader.decrypt(password)
            if not decrypted:
                return {"success": False, "error": "Mật khẩu không chính xác!"}
        
        writer = PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
            
        output_buffer = io.BytesIO()
        writer.write(output_buffer)
        output_buffer.seek(0)
        
        return {
            "success": True,
            "output_pdf": output_buffer.getvalue(),
            "filename": f"unlocked_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}