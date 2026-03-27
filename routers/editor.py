"""
API Router - PDF Editor endpoints
"""
import os
import tempfile
import time
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
from typing import List, Dict, Any

from services.pdf_editor import upload_pdf_editor, apply_operations, cleanup_session, insert_pdf_editor, insert_blank_page

router = APIRouter()

UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

class OperationRequest(BaseModel):
    session_id: str
    operations: List[Dict[str, Any]]

def remove_file(path: str):
    """Xóa file sau khi gửi"""
    try:
        time.sleep(5)
        if os.path.exists(path):
            os.remove(path)
            print(f"Đã dọn dẹp: {path}")
    except:
        pass

@router.post("/editor/upload")
async def editor_upload_endpoint(file: UploadFile = File(...)):
    """
    Upload PDF để chỉnh sửa
    
    Response:
        - session_id: str
        - total_pages: int
        - thumbnails: list[str] URLs
    """
    try:
        if file.content_type not in ["application/pdf"]:
            raise HTTPException(status_code=400, detail="File phải là PDF")
        
        contents = await file.read()
        if len(contents) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File quá lớn (max 50MB)")
        
        # Lưu temp file
        tmp_fd, tmp_path = tempfile.mkstemp(suffix=".pdf")
        try:
            with os.fdopen(tmp_fd, 'wb') as tmp:
                tmp.write(contents)
                
            result = await upload_pdf_editor(tmp_path)
            
            if not result["success"]:
                raise HTTPException(status_code=400, detail=result.get("error", "Lỗi upload PDF"))
            
            return {
                "session_id": result["session_id"],
                "total_pages": result["total_pages"],
                "thumbnails": result["thumbnails"]
            }
        finally:
            try:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
            except Exception as e:
                print(f"Không thể xóa file tạm {tmp_path}: {e}")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/editor/insert")
async def editor_insert_endpoint(
    session_id: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Chèn thêm một file PDF mới vào session đang chỉnh sửa
    """
    try:
        if file.content_type not in ["application/pdf"]:
            raise HTTPException(status_code=400, detail="File phải là PDF")
        
        contents = await file.read()
        if len(contents) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File quá lớn (max 50MB)")
        
        # Lưu file tạm thứ 2
        tmp_fd, tmp_path = tempfile.mkstemp(suffix=".pdf")
        try:
            with os.fdopen(tmp_fd, 'wb') as tmp:
                tmp.write(contents)
                
            result = await insert_pdf_editor(session_id, tmp_path)
            
            if not result["success"]:
                raise HTTPException(status_code=400, detail=result.get("error", "Lỗi chèn PDF"))
            
            return {
                "total_pages": result["total_pages"],
                "new_thumbnails": result["new_thumbnails"]
            }
        finally:
            try:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
            except Exception as e:
                pass
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/editor/insert-blank")
async def editor_insert_blank_endpoint(
    session_id: str = Form(...)
):
    """
    Chèn thêm một trang trắng vào session đang chỉnh sửa
    """
    try:
        result = await insert_blank_page(session_id)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error", "Lỗi chèn trang trắng"))
        
        return {
            "total_pages": result["total_pages"],
            "new_thumbnails": result["new_thumbnails"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/editor/apply")
async def editor_apply_endpoint(
    req: OperationRequest,
    background_tasks: BackgroundTasks
):
    """
    Áp dụng các operations chỉnh sửa
    
    Request body:
        {
            "session_id": "abc123",
            "operations": [
                { "type": "rotate", "page": 2, "angle": 90 },
                { "type": "delete", "page": 4 },
                { "type": "reorder", "new_order": [1,3,2,4] }
            ]
        }
    
    Response:
        - File: PDF kết quả
    """
    try:
        result = await apply_operations(req.session_id, req.operations)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error", "Lỗi apply operations"))
        
        # Lưu kết quả
        pdf_path = UPLOADS_DIR / result["filename"]
        with open(pdf_path, "wb") as f:
            f.write(result["output_pdf"])
        
        # Thêm task xóa file kết quả sau 5 giây gửi về
        background_tasks.add_task(remove_file, str(pdf_path))
        
        return FileResponse(pdf_path, filename=result["filename"], media_type="application/pdf")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/editor/cleanup")
@router.get("/editor/cleanup")
async def editor_cleanup_endpoint(session_id: str):
    """Cleanup session resources - Nhận GET và POST"""
    try:
        cleanup_session(session_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
