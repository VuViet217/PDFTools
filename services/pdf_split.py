"""
PDF Split Service - Xử lý tách trang PDF
"""
import os
import io
import zipfile
from pathlib import Path
from datetime import datetime
from pypdf import PdfReader, PdfWriter

async def split_pdf(file_path: str, pages_input: str = None) -> dict:
    """
    Tách PDF theo nhóm trang
    
    Args:
        file_path: Đường dẫn file PDF
        pages_input: Chuỗi nhóm trang (VD: "1,2-3,4-6")
                    Nếu None/rỗng -> tách từng trang riêng
    
    Returns:
        dict với keys:
        - success: bool
        - output_zip: bytes của file .zip
        - error: str (nếu có lỗi)
    """
    try:
        # Kiểm tra file tồn tại
        if not os.path.exists(file_path):
            return {"success": False, "error": "File không tồn tại"}
        
        # Đọc PDF
        with open(file_path, "rb") as f:
            reader = PdfReader(f)
            total_pages = len(reader.pages)
        
        if total_pages == 0:
            return {"success": False, "error": "PDF không có trang"}
        
        # Parse pages_input
        page_groups = _parse_page_groups(pages_input, total_pages)
        if not page_groups:
            # Tách từng trang
            page_groups = [[i+1] for i in range(total_pages)]
        
        # Tạo file ZIP chứa các PDF đã tách
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zipf:
            with open(file_path, "rb") as f:
                reader = PdfReader(f)
                
                for idx, group in enumerate(page_groups, 1):
                    writer = PdfWriter()
                    
                    # Thêm trang vào writer
                    for page_num in group:
                        if 1 <= page_num <= total_pages:
                            writer.add_page(reader.pages[page_num - 1])
                    
                    # Ghi vào buffer
                    pdf_buffer = io.BytesIO()
                    writer.write(pdf_buffer)
                    pdf_buffer.seek(0)
                    
                    # Thêm vào ZIP
                    filename = f"pages_{'-'.join(map(str, group))}.pdf"
                    zipf.writestr(filename, pdf_buffer.getvalue())
        
        zip_buffer.seek(0)
        return {
            "success": True,
            "output_zip": zip_buffer.getvalue(),
            "filename": f"split_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        }
    
    except Exception as e:
        return {"success": False, "error": str(e)}

def _parse_page_groups(pages_input: str, total_pages: int) -> list:
    """
    Parse chuỗi nhóm trang
    VD: "1,2-3,4-6" -> [[1], [2, 3], [4, 5, 6]]
    
    Args:
        pages_input: Chuỗi input
        total_pages: Tổng số trang trong PDF
    
    Returns:
        List các nhóm trang (danh sách số trang)
    """
    if not pages_input or pages_input.strip() == "":
        return []
    
    groups = []
    try:
        parts = pages_input.split(",")
        
        for part in parts:
            part = part.strip()
            if "-" in part:
                # Range: "2-5" -> [2, 3, 4, 5]
                start, end = part.split("-")
                start, end = int(start.strip()), int(end.strip())
                if 1 <= start <= total_pages and 1 <= end <= total_pages:
                    groups.append(list(range(start, end + 1)))
            else:
                # Single page
                page_num = int(part)
                if 1 <= page_num <= total_pages:
                    groups.append([page_num])
        
        return groups
    except:
        return []
