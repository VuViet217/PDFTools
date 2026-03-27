"""
PDF Editor Service - Xử lý chỉnh sửa PDF (xoay, xoá, sắp xếp, chèn trang)
"""
import os
import io
import uuid
import asyncio
from datetime import datetime
from pathlib import Path
from pypdf import PdfReader, PdfWriter
import pypdfium2 as pdfium
from PIL import Image

# Session storage cho PDF-temp files
SESSIONS = {}

async def auto_cleanup(session_id: str, delay_seconds: int = 1800):
    """
    Tự động xoá session và các file temp sau khoảng thời gian nhất định (Mặc định 30 phút)
    """
    await asyncio.sleep(delay_seconds)
    if session_id in SESSIONS:
        # Xoá files ảnh tạm
        try:
            for thumb_path in SESSIONS[session_id].get("thumbnails_files", []):
                if os.path.exists(thumb_path):
                    os.unlink(thumb_path)
        except:
            pass
        # Xoá session trên RAM
        del SESSIONS[session_id]
        print(f"Đã dọn dẹp session: {session_id}")

async def upload_pdf_editor(file_path: str, session_id: str = None) -> dict:
    """
    Upload PDF để chỉnh sửa - tạo session + thumbnails
    
    Args:
        file_path: Đường dẫn file PDF upload
        session_id: ID session (nếu None -> tạo mới)
    
    Returns:
        dict với keys:
        - success: bool
        - session_id: str
        - total_pages: int
        - thumbnails: list URL thumbnails
        - error: str (nếu có lỗi)
    """
    try:
        if not os.path.exists(file_path):
            return {"success": False, "error": "File không tồn tại"}
        
        if session_id is None:
            session_id = str(uuid.uuid4())
        
        # Đọc PDF
        with open(file_path, "rb") as f:
            pdf_data = f.read()
        
        # Kiểm tra số trang
        reader = PdfReader(io.BytesIO(pdf_data))
        total_pages = len(reader.pages)
        
        if total_pages == 0:
            return {"success": False, "error": "PDF không có trang"}
        
        # Tạo thumbnails từ pypdfium2
        thumbnails = []
        thumbnail_paths = []
        try:
            # Sử dụng context manager (with) để đảm bảo file được đóng lại
            with pdfium.PdfDocument(file_path) as pdf:
                for page_idx in range(total_pages):
                    try:
                        page = pdf.get_page(page_idx)
                        
                        # 1. Render ảnh lớn để xem (Preview)
                        pil_preview = page.render(scale=2.5).to_pil()
                        
                        # Resize preview image limit chiều cao/rộng max 1200px cho nhẹ
                        pil_preview.thumbnail((1200, 1600), Image.Resampling.LANCZOS)
                        
                        preview_filename = f".preview_{session_id}_{page_idx}.png"
                        preview_path = Path("uploads") / preview_filename
                        pil_preview.save(preview_path, format="PNG")
                        thumbnail_paths.append(str(preview_path))
                        
                        # 2. Render ảnh nhỏ (Thumbnail) cho grid
                        # Copy từ preview lớn thu nhỏ lại để nhanh hơn
                        pil_thumb = pil_preview.copy()
                        pil_thumb.thumbnail((150, 200), Image.Resampling.LANCZOS)
                        
                        thumb_filename = f".thumb_{session_id}_{page_idx}.png"
                        thumb_path = Path("uploads") / thumb_filename
                        pil_thumb.save(thumb_path, format="PNG")
                        thumbnail_paths.append(str(thumb_path))
                        
                        # Trả về cả đường dẫn thumb (nhỏ) và preview (lớn) (Dạng dict hoặc ghép chuỗi - ở đây tôi dùng mảng dict)
                        thumbnails.append({
                            "thumb": f"/uploads/{thumb_filename}",
                            "preview": f"/uploads/{preview_filename}"
                        })
                    except Exception as e:
                        print(f"Lỗi render trang {page_idx}: {e}")
                        # Fallback SVG cho trang lỗi
                        svg_data = f'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="200"%3E%3Crect fill="%23f5f5f5" width="150" height="200"/%3E%3Ctext x="50%" y="50%" font-size="14" text-anchor="middle" dominant-baseline="middle" fill="%23999"%3EPage {page_idx + 1}%3C/text%3E%3C/svg%3E'
                        thumbnails.append({"thumb": svg_data, "preview": svg_data})
        except Exception as thumb_err:
            # Fallback toàn bộ nếu lỗi đọc PDF
            print(f"Lỗi tạo thumbnails: {thumb_err}")
            thumbnails = [
                {
                    "thumb": f'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="200"%3E%3Crect fill="%23f5f5f5" width="150" height="200"/%3E%3Ctext x="50%" y="50%" font-size="14" text-anchor="middle" dominant-baseline="middle" fill="%23999"%3EPage {i + 1}%3C/text%3E%3C/svg%3E',
                    "preview": f'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"%3E%3Crect fill="%23f5f5f5" width="800" height="1000"/%3E%3Ctext x="50%" y="50%" font-size="24" text-anchor="middle" dominant-baseline="middle" fill="%23999"%3EPage {i + 1}%3C/text%3E%3C/svg%3E'
                }
                for i in range(total_pages)
            ]
        
        # Lưu session
        SESSIONS[session_id] = {
            "pdf_path": file_path,
            "pdf_data": pdf_data,
            "total_pages": total_pages,
            "thumbnails": thumbnails,
            "thumbnails_files": thumbnail_paths,
            "operations": []
        }
        
        # Thiết lập bộ đếm thời gian tự huỷ sau 30 phút (1800 giây)
        asyncio.create_task(auto_cleanup(session_id))
        
        return {
            "success": True,
            "session_id": session_id,
            "total_pages": total_pages,
            "thumbnails": thumbnails
        }
    
    except Exception as e:
        return {"success": False, "error": str(e)}

async def insert_pdf_editor(session_id: str, file_path: str) -> dict:
    """
    Chèn thêm một file PDF mới vào cuối file đang chỉnh sửa
    """
    try:
        if session_id not in SESSIONS:
            return {"success": False, "error": "Session không tồn tại"}
            
        session = SESSIONS[session_id]
        
        # Gộp file mới vào pdf_data hiện tại trên RAM
        old_pdf_data = session["pdf_data"]
        old_reader = PdfReader(io.BytesIO(old_pdf_data))
        new_reader = PdfReader(file_path)
        
        writer = PdfWriter()
        # Thêm các trang cũ
        for page in old_reader.pages:
            writer.add_page(page)
            
        # Thêm các trang mới
        new_pages_count = len(new_reader.pages)
        for page in new_reader.pages:
            writer.add_page(page)
            
        output_buffer = io.BytesIO()
        writer.write(output_buffer)
        output_buffer.seek(0)
        
        session["pdf_data"] = output_buffer.getvalue()
        
        # Tạo thumbnails chỉ cho các trang mới
        start_idx = session["total_pages"]
        session["total_pages"] += new_pages_count
        
        new_thumbnails = []
        try:
            with pdfium.PdfDocument(file_path) as pdf:
                for idx in range(new_pages_count):
                    page_idx = start_idx + idx
                    try:
                        page = pdf.get_page(idx)
                        
                        pil_preview = page.render(scale=2.5).to_pil()
                        pil_preview.thumbnail((1200, 1600), Image.Resampling.LANCZOS)
                        preview_filename = f".preview_{session_id}_{page_idx}.png"
                        preview_path = Path("uploads") / preview_filename
                        pil_preview.save(preview_path, format="PNG")
                        session["thumbnails_files"].append(str(preview_path))
                        
                        pil_thumb = pil_preview.copy()
                        pil_thumb.thumbnail((150, 200), Image.Resampling.LANCZOS)
                        thumb_filename = f".thumb_{session_id}_{page_idx}.png"
                        thumb_path = Path("uploads") / thumb_filename
                        pil_thumb.save(thumb_path, format="PNG")
                        session["thumbnails_files"].append(str(thumb_path))
                        
                        thumb_obj = {
                            "thumb": f"/uploads/{thumb_filename}",
                            "preview": f"/uploads/{preview_filename}"
                        }
                        session["thumbnails"].append(thumb_obj)
                        new_thumbnails.append(thumb_obj)
                    except Exception as e:
                        svg_data = f'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="200"%3E%3Crect fill="%23f5f5f5" width="150" height="200"/%3E%3Ctext x="50%" y="50%" font-size="14" text-anchor="middle" dominant-baseline="middle" fill="%23999"%3EPage {page_idx + 1}%3C/text%3E%3C/svg%3E'
                        obj = {"thumb": svg_data, "preview": svg_data}
                        session["thumbnails"].append(obj)
                        new_thumbnails.append(obj)
        except Exception as thumb_err:
            for idx in range(new_pages_count):
                page_idx = start_idx + idx
                svg_data = f'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="200"%3E%3Crect fill="%23f5f5f5" width="150" height="200"/%3E%3Ctext x="50%" y="50%" font-size="14" text-anchor="middle" dominant-baseline="middle" fill="%23999"%3EPage {page_idx + 1}%3C/text%3E%3C/svg%3E'
                obj = {"thumb": svg_data, "preview": svg_data}
                session["thumbnails"].append(obj)
                new_thumbnails.append(obj)
                
        return {
            "success": True,
            "new_thumbnails": new_thumbnails,
            "total_pages": session["total_pages"]
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

async def insert_blank_page(session_id: str) -> dict:
    """
    Chèn thêm một trang trắng vào cuối file đang chỉnh sửa
    """
    try:
        if session_id not in SESSIONS:
            return {"success": False, "error": "Session không tồn tại"}
            
        session = SESSIONS[session_id]
        
        # Đọc dữ liệu pdf hiện tại
        old_pdf_data = session["pdf_data"]
        reader = PdfReader(io.BytesIO(old_pdf_data))
        writer = PdfWriter()
        
        # Mặc định kích thước là A4
        width, height = 595.28, 841.89
        
        # Giữ lại các trang cũ, và lấy kích thước trang cuối cùng để làm trang trắng
        for page in reader.pages:
            writer.add_page(page)
            try:
                width = float(page.mediabox.width)
                height = float(page.mediabox.height)
            except:
                pass                
                
        # Thêm 1 trang trắng ở cuối với kích thước tương tự
        writer.add_blank_page(width=width, height=height)
        
        # Cập nhật pdf_data
        output_buffer = io.BytesIO()
        writer.write(output_buffer)
        output_buffer.seek(0)
        
        session["pdf_data"] = output_buffer.getvalue()
        
        # Thêm 1 trang vào tổng
        page_idx = session["total_pages"]
        session["total_pages"] += 1
        
        # Khởi tạo thumbnail placeholder cho trang trắng (trang trống thì không cần render)
        svg_data = f'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="200"%3E%3Crect fill="%23fdfdfd" width="150" height="200"/%3E%3Ctext x="50%" y="50%" font-size="14" text-anchor="middle" dominant-baseline="middle" fill="%23ccc"%3ETrang Trắng%3C/text%3E%3C/svg%3E'
        thumb_obj = {
            "thumb": svg_data,
            "preview": svg_data
        }
        
        session["thumbnails"].append(thumb_obj)
        
        return {
            "success": True,
            "new_thumbnails": [thumb_obj],
            "total_pages": session["total_pages"]
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

async def apply_operations(session_id: str, operations: list) -> dict:
    """
    Áp dụng các thao tác chỉnh sửa lên PDF dựa trên state cuối cùng
    
    Args:
        session_id: ID session
        operations: Danh sách [{ "page": 1, "rotation": 90 }, { "page": 3, "rotation": 0 }]
                   Nó thể hiện đúng danh sách trang giữ lại, thứ tự, và độ xoay của từng trang.
    """
    try:
        if session_id not in SESSIONS:
            return {"success": False, "error": "Session không tồn tại"}
        
        session = SESSIONS[session_id]
        pdf_data = session["pdf_data"]
        reader = PdfReader(io.BytesIO(pdf_data))
        writer = PdfWriter()
        
        # operations bây giờ chính là danh sách cấu hình của từng trang cuối cùng
        for op in operations:
            page_num_1_based = op.get("page")
            rotation = op.get("rotation", 0)
            
            # Convert sang 0-based
            page_idx = page_num_1_based - 1
            
            if 0 <= page_idx < len(reader.pages):
                page = reader.pages[page_idx]
                
                # Copy page để tránh thay đổi bản gốc trong reader (nếu xuất nhiều lần)
                import copy
                new_page = copy.copy(page)
                
                if rotation != 0:
                    new_page.rotate(rotation)
                    
                writer.add_page(new_page)
        
        # Ghi output
        output_buffer = io.BytesIO()
        writer.write(output_buffer)
        output_buffer.seek(0)
        
        # KHÔNG XOÁ SESSION Ở ĐÂY NỮA
        # Để người dùng có thể tải xuống nhiều lần hoặc sửa tiếp tục
        # del SESSIONS[session_id]
        
        return {
            "success": True,
            "output_pdf": output_buffer.getvalue(),
            "filename": f"edited_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        }
    
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_session(session_id: str):
    """Lấy session info"""
    return SESSIONS.get(session_id)

def cleanup_session(session_id: str):
    """Xoá session và toàn bộ file rác thủ công ngay lập tức"""
    if session_id in SESSIONS:
        # Xoá files ảnh tạm trên ổ cứng
        try:
            for thumb_path in SESSIONS[session_id].get("thumbnails_files", []):
                if os.path.exists(thumb_path):
                    os.unlink(thumb_path)
        except Exception as e:
            print(f"Lỗi khi xoá ảnh tạm: {e}")
            
        # Xoá session trên RAM
        del SESSIONS[session_id]
        print(f"Đã xoá ngay lập tức session: {session_id}")
