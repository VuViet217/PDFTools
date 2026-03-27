"""
API Router - Bảo mật PDF endpoint
"""
import os
import tempfile
import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pathlib import Path

from services.pdf_security import protect_pdf, unlock_pdf

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

@router.post("/protect")
async def protect_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    password: str = Form(...)
):
    """
    API endpoint Đặt mật khẩu PDF
    """
    try:
        if file.content_type not in ["application/pdf"]:
            raise HTTPException(status_code=400, detail="File phải là PDF")
            
        contents = await file.read()
        if len(contents) > 100 * 1024 * 1024: 
            raise HTTPException(status_code=413, detail="File quá lớn (max 100MB)")
            
        tmp_fd, tmp_path = tempfile.mkstemp(suffix=".pdf")
        try:
            with os.fdopen(tmp_fd, 'wb') as tmp:
                tmp.write(contents)
                
            result = await protect_pdf(tmp_path, password)
            
            if not result["success"]:
                raise HTTPException(status_code=400, detail=result.get("error", "Lỗi mã hóa PDF"))
                
            pdf_path = UPLOADS_DIR / result["filename"]
            with open(pdf_path, "wb") as f:
                f.write(result["output_pdf"])
                
            background_tasks.add_task(remove_file, str(pdf_path))
            
            return FileResponse(pdf_path, filename=result["filename"], media_type="application/pdf")
            
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

@router.post("/unlock")
async def unlock_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    password: str = Form(...)
):
    """
    API endpoint Gỡ mật khẩu PDF
    """
    try:
        if file.content_type not in ["application/pdf"]:
            raise HTTPException(status_code=400, detail="File phải là PDF")
            
        contents = await file.read()
        if len(contents) > 100 * 1024 * 1024: 
            raise HTTPException(status_code=413, detail="File quá lớn (max 100MB)")
            
        tmp_fd, tmp_path = tempfile.mkstemp(suffix=".pdf")
        try:
            with os.fdopen(tmp_fd, 'wb') as tmp:
                tmp.write(contents)
                
            result = await unlock_pdf(tmp_path, password)
            
            if not result["success"]:
                raise HTTPException(status_code=400, detail=result.get("error", "Lỗi mở khóa PDF. Mật khẩu có thể không đúng."))
                
            pdf_path = UPLOADS_DIR / result["filename"]
            with open(pdf_path, "wb") as f:
                f.write(result["output_pdf"])
                
            background_tasks.add_task(remove_file, str(pdf_path))
            
            return FileResponse(pdf_path, filename=result["filename"], media_type="application/pdf")
            
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