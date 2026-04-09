"""
API Router - Làm rõ PDF scan endpoint
"""
import os
import tempfile
import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pathlib import Path

from services.pdf_enhance import enhance_pdf

router = APIRouter()

UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)


def remove_file(path: str):
    try:
        time.sleep(10)
        if os.path.exists(path):
            os.remove(path)
    except:
        pass


@router.post("/enhance-pdf")
async def enhance_pdf_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    mode: str = Form("auto"),
    dpi: int = Form(200),
):
    try:
        if file.content_type not in ["application/pdf"]:
            raise HTTPException(status_code=400, detail="File phải là PDF")

        contents = await file.read()
        if len(contents) > 100 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File quá lớn (max 100MB)")

        # Validate
        if mode not in ["auto", "text", "photo"]:
            mode = "auto"
        dpi = max(150, min(dpi, 300))

        tmp_fd, tmp_path = tempfile.mkstemp(suffix=".pdf")
        try:
            with os.fdopen(tmp_fd, "wb") as tmp:
                tmp.write(contents)

            result = await enhance_pdf(tmp_path, mode=mode, dpi=dpi)

            if not result["success"]:
                raise HTTPException(
                    status_code=400, detail=result.get("error", "Lỗi xử lý PDF")
                )

            pdf_path = UPLOADS_DIR / result["filename"]
            with open(pdf_path, "wb") as f:
                f.write(result["output_pdf"])

            background_tasks.add_task(remove_file, str(pdf_path))

            headers = {
                "X-Total-Pages": str(result["total_pages"]),
                "X-Original-Size": str(result["original_size"]),
                "X-New-Size": str(result["new_size"]),
            }

            return FileResponse(
                pdf_path,
                filename=result["filename"],
                media_type="application/pdf",
                headers=headers,
            )

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
