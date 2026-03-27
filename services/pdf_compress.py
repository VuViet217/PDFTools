"""
PDF Compress Service - Nén dung lượng file PDF
"""
import os
import io
from datetime import datetime
import fitz  # PyMuPDF

async def compress_pdf(file_path: str) -> dict:
    """
    Nén PDF sử dụng thuật toán garbage collection và deflate của PyMuPDF
    """
    try:
        if not os.path.exists(file_path):
            return {"success": False, "error": "File không tồn tại"}
            
        # Mở file PDF
        doc = fitz.open(file_path)
        output_buffer = io.BytesIO()
        
        # Save file với mức độ nén cao nhất
        # garbage=4: Xoá tất cả rác, deduplicate object (font, ảnh giống nhau)
        # deflate=True: Nén lại các luồng uncompressed
        # clean=True: Dọn dẹp luồng PDF
        doc.save(
            output_buffer, 
            garbage=4, 
            deflate=True, 
            clean=True
        )
        doc.close()
        output_buffer.seek(0)
        
        original_size = os.path.getsize(file_path)
        new_size = len(output_buffer.getvalue())
        
        return {
            "success": True,
            "output_pdf": output_buffer.getvalue(),
            "filename": f"compressed_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
            "original_size": original_size,
            "new_size": new_size
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}