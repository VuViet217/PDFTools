"""
API Router - Split & Merge PDF endpoints
"""
import os
import tempfile
import asyncio
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pathlib import Path

from services.pdf_split import split_pdf
from services.pdf_merge import merge_pdfs

router = APIRouter()

UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

def remove_file(path: str):
    """Hàm background để xóa file sau khi đã tải xuống"""
    try:
        import time
        # Đợi 5 giây đảm bảo mạng truyền xong file về client rồi mới xóa
        time.sleep(5) 
        if os.path.exists(path):
            os.remove(path)
            print(f"Đã xoá rác: {path}")
    except Exception as e:
        print(f"Lỗi khi xoá {path}: {e}")

@router.post("/split")
async def split_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    pages: str = Form("")
):
    """
    API endpoint tách PDF
    
    Request:
        - file: PDF upload
        - pages: string nhóm trang (VD: "1,2-3,4-6")
    
    Response:
        - File: ZIP chứa các PDF đã tách
    """
    try:
        # Kiểm tra file type
        if file.content_type not in ["application/pdf"]:
            raise HTTPException(status_code=400, detail="File phải là PDF")
        
        # Kiểm tra kích thước (50MB max)
        contents = await file.read()
        if len(contents) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File quá lớn (max 50MB)")
        
        # Lưu temp file
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name
        
        try:
            # Gọi service
            result = await split_pdf(tmp_path, pages if pages.strip() else None)
            
            if not result["success"]:
                raise HTTPException(status_code=400, detail=result.get("error", "Lỗi tách PDF"))
            
            # Response file
            zip_path = UPLOADS_DIR / result["filename"]
            with open(zip_path, "wb") as f:
                f.write(result["output_zip"])
            
            # Lên lịch tự động xoá ZIP sau khi tải về
            background_tasks.add_task(remove_file, str(zip_path))
            
            return FileResponse(zip_path, filename=result["filename"], media_type="application/zip")
        
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/info")
async def get_pdf_info(file: UploadFile = File(...)):
    """
    API lấy thông tin PDF (số trang)
    """
    try:
        if file.content_type not in ["application/pdf"]:
            raise HTTPException(status_code=400, detail="File phải là PDF")
        
        contents = await file.read()
        if len(contents) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File quá lớn")
            
        import io
        from pypdf import PdfReader
        
        reader = PdfReader(io.BytesIO(contents))
        return {
            "success": True,
            "total_pages": len(reader.pages)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/merge")
async def merge_endpoint(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...)
):
    """
    API endpoint nối PDF
    
    Request:
        - files[]: List PDF upload
    
    Response:
        - File: PDF đã nối
    """
    try:
        if not files or len(files) == 0:
            raise HTTPException(status_code=400, detail="Phải có ít nhất 1 file PDF")
        
        temp_paths = []
        
        try:
            # Lưu tất cả file tạm
            for file in files:
                if file.content_type not in ["application/pdf"]:
                    raise HTTPException(status_code=400, detail="Tất cả file phải là PDF")
                
                contents = await file.read()
                if len(contents) > 50 * 1024 * 1024:
                    raise HTTPException(status_code=413, detail="File quá lớn (max 50MB)")
                
                with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                    tmp.write(contents)
                    temp_paths.append(tmp.name)
            
            # Gọi service
            result = await merge_pdfs(temp_paths)
            
            if not result["success"]:
                raise HTTPException(status_code=400, detail=result.get("error", "Lỗi nối PDF"))
            
            # Response file
            pdf_path = UPLOADS_DIR / result["filename"]
            with open(pdf_path, "wb") as f:
                f.write(result["output_pdf"])
            
            # Lên lịch tự động xoá file kết quả sau khi gửi
            background_tasks.add_task(remove_file, str(pdf_path))
            
            return FileResponse(pdf_path, filename=result["filename"], media_type="application/pdf")
        
        finally:
            # Cleanup temp files
            for tmp_path in temp_paths:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
