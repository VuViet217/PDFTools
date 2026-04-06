"""
API Router - Extract images from PDF
"""
import os
import tempfile
import zipfile
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pathlib import Path

from services.pdf_extract_images import extract_images_from_pdf

router = APIRouter()

UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)


def remove_file(path: str):
    """Background task để xóa file sau khi tải xong"""
    try:
        import time
        time.sleep(5)
        if os.path.exists(path):
            os.remove(path)
    except Exception as e:
        print(f"Lỗi khi xoá {path}: {e}")


@router.post("/extract-images")
async def extract_images_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """
    API endpoint trích xuất hình ảnh từ PDF

    Request:
        - file: PDF upload

    Response:
        - File: ZIP chứa các hình ảnh
    """
    # Kiểm tra file type
    if file.content_type not in ("application/pdf",):
        raise HTTPException(status_code=400, detail="File phải là PDF")

    # Đọc và kiểm tra kích thước (50MB max)
    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File quá lớn (max 50MB)")

    result = await extract_images_from_pdf(contents)

    if not result["success"]:
        error_code = result.get("error", "UNKNOWN")
        raise HTTPException(status_code=400, detail=error_code)

    # Tạo ZIP chứa các ảnh
    zip_filename = f"pdf_images_{os.urandom(8).hex()}.zip"
    zip_path = UPLOADS_DIR / zip_filename

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for img_bytes, fname in zip(result["images"], result["filenames"]):
            zf.writestr(fname, img_bytes)

    background_tasks.add_task(remove_file, str(zip_path))

    return FileResponse(
        zip_path,
        filename=zip_filename,
        media_type="application/zip",
        headers={"X-Total-Images": str(result["total_images"])},
    )
