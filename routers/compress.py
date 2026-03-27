"""
API Router - Nén PDF endpoint
"""
import os
import tempfile
import time
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pathlib import Path

from services.pdf_compress import compress_pdf

router = APIRouter()

UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

def remove_file(path: str):
    """Hàm background để xóa file sau khi tải về"""
    try:
        time.sleep(5)
        if os.path.exists(path):
            os.remove(path)
    except:
        pass

@router.post("/compress")
async def compress_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    API endpoint nén file PDF
    """
    try:
        if file.content_type not in ["application/pdf"]:
            raise HTTPException(status_code=400, detail="File phải là PDF")
            
        contents = await file.read()
        if len(contents) > 100 * 1024 * 1024:  # 100MB cho file nén
            raise HTTPException(status_code=413, detail="File quá lớn (max 100MB)")
            
        tmp_fd, tmp_path = tempfile.mkstemp(suffix=".pdf")
        try:
            with os.fdopen(tmp_fd, 'wb') as tmp:
                tmp.write(contents)
                
            result = await compress_pdf(tmp_path)
            
            if not result["success"]:
                raise HTTPException(status_code=400, detail=result.get("error", "Lỗi nén PDF"))
                
            # Lưu file đã nén ra thư mục Uploads
            pdf_path = UPLOADS_DIR / result["filename"]
            with open(pdf_path, "wb") as f:
                f.write(result["output_pdf"])
                
            # Lên lịch xoá file sau 5 giây (sau khi client đã load xuống)
            background_tasks.add_task(remove_file, str(pdf_path))
            
            # Khai báo thông số nén để client lấy đọc thông qua Headers
            headers = {
                "X-Original-Size": str(result["original_size"]),
                "X-New-Size": str(result["new_size"])
            }
            
            return FileResponse(pdf_path, filename=result["filename"], media_type="application/pdf", headers=headers)
            
        finally:
            try:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
            except:
                pass
                
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))