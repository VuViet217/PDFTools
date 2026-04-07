"""
API Router - Đánh số trang PDF endpoint
"""
import os
import tempfile
import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pathlib import Path

from services.pdf_page_number import add_page_numbers

router = APIRouter()

UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)


def remove_file(path: str):
    try:
        time.sleep(5)
        if os.path.exists(path):
            os.remove(path)
    except:
        pass


@router.post("/add-page-numbers")
async def add_page_numbers_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    position: str = Form("bottom-center"),
    start_number: int = Form(1),
    font_size: float = Form(11),
    margin_bottom: float = Form(30),
    format_template: str = Form("{n}"),
    color: str = Form("#000000"),
):
    try:
        if file.content_type not in ["application/pdf"]:
            raise HTTPException(status_code=400, detail="File phải là PDF")

        contents = await file.read()
        if len(contents) > 100 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File quá lớn (max 100MB)")

        # Validate inputs
        if position not in ["bottom-left", "bottom-center", "bottom-right"]:
            position = "bottom-center"
        start_number = max(1, min(start_number, 9999))
        font_size = max(6, min(font_size, 36))
        margin_bottom = max(10, min(margin_bottom, 100))

        tmp_fd, tmp_path = tempfile.mkstemp(suffix=".pdf")
        try:
            with os.fdopen(tmp_fd, "wb") as tmp:
                tmp.write(contents)

            result = await add_page_numbers(
                tmp_path,
                position=position,
                start_number=start_number,
                font_size=font_size,
                margin_bottom=margin_bottom,
                format_template=format_template,
                color_hex=color,
            )

            if not result["success"]:
                raise HTTPException(
                    status_code=400, detail=result.get("error", "Lỗi đánh số trang")
                )

            pdf_path = UPLOADS_DIR / result["filename"]
            with open(pdf_path, "wb") as f:
                f.write(result["output_pdf"])

            background_tasks.add_task(remove_file, str(pdf_path))

            headers = {"X-Total-Pages": str(result["total_pages"])}

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
