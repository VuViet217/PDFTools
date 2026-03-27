"""
PDF Merge Service - Xử lý nối PDF
"""
import os
import io
from datetime import datetime
from pypdf import PdfReader, PdfWriter

async def merge_pdfs(file_paths: list) -> dict:
    """
    Nối nhiều PDF thành 1 file
    
    Args:
        file_paths: Danh sách đường dẫn file PDF (thứ tự sắp xếp)
    
    Returns:
        dict với keys:
        - success: bool
        - output_pdf: bytes của file PDF kết quả
        - filename: Tên file output
        - error: str (nếu có lỗi)
    """
    try:
        if not file_paths or len(file_paths) == 0:
            return {"success": False, "error": "Không có file PDF"}
        
        # Kiểm tra tất cả file tồn tại
        for fp in file_paths:
            if not os.path.exists(fp):
                return {"success": False, "error": f"File không tồn tại: {fp}"}
        
        # Nối PDF
        writer = PdfWriter()
        
        for file_path in file_paths:
            with open(file_path, "rb") as f:
                reader = PdfReader(f)
                for page in reader.pages:
                    writer.add_page(page)
        
        # Ghi vào buffer
        output_buffer = io.BytesIO()
        writer.write(output_buffer)
        output_buffer.seek(0)
        
        return {
            "success": True,
            "output_pdf": output_buffer.getvalue(),
            "filename": f"merged_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        }
    
    except Exception as e:
        return {"success": False, "error": str(e)}

async def merge_pdfs_from_order(file_paths: list, new_order: list) -> dict:
    """
    Nối PDF có xác định thứ tự
    
    Args:
        file_paths: Danh sách đường dẫn file PDF
        new_order: Danh sách idx thứ tự (VD: [2, 0, 1])
    
    Returns:
        dict kết quả giống merge_pdfs
    """
    try:
        if not file_paths or len(file_paths) == 0:
            return {"success": False, "error": "Không có file PDF"}
        
        # Sắp xếp theo new_order
        ordered_paths = [file_paths[i] for i in new_order if i < len(file_paths)]
        
        return await merge_pdfs(ordered_paths)
    
    except Exception as e:
        return {"success": False, "error": str(e)}
