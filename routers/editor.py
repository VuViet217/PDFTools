"""
API Router - PDF Editor endpoints
"""
import os
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
from typing import List, Dict, Any

from services.pdf_editor import upload_pdf_editor, apply_operations, cleanup_session

router = APIRouter()

UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

class OperationRequest(BaseModel):
    session_id: str
    operations: List[Dict[str, Any]]

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

@router.post("/editor/apply")
async def editor_apply_endpoint(req: OperationRequest):
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
        
        return FileResponse(pdf_path, filename=result["filename"], media_type="application/pdf")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/editor/cleanup")
async def editor_cleanup_endpoint(session_id: str):
    """Cleanup session resources"""
    try:
        cleanup_session(session_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
