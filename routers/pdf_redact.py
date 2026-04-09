import os
import json
import uuid
import asyncio
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse

from services.pdf_redact import scan_pdf, scan_keywords, redact_auto, redact_keywords, redact_pdf

router = APIRouter()

UPLOAD_DIR = "uploads"
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB


def cleanup_file(path: str, delay: float = 10):
    """Schedule file cleanup after delay."""
    import threading
    def _remove():
        import time
        time.sleep(delay)
        try:
            if os.path.exists(path):
                os.remove(path)
        except Exception:
            pass
    threading.Thread(target=_remove, daemon=True).start()


@router.post("/redact-scan")
async def scan_for_sensitive(
    file: UploadFile = File(...),
    mode: str = Form("auto"),
    keywords: str = Form(""),
    categories: str = Form(""),
):
    """Scan PDF for sensitive data without modifying it."""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(400, "Only PDF files are supported")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, "File too large (max 100MB)")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    unique_id = str(uuid.uuid4())[:8]
    input_path = os.path.join(UPLOAD_DIR, f"scan_{unique_id}.pdf")

    with open(input_path, "wb") as f:
        f.write(content)

    try:
        if mode == "keyword" and keywords.strip():
            kw_list = [k.strip() for k in keywords.split(",") if k.strip()]
            result = scan_keywords(input_path, kw_list)
        else:
            cat_list = [c.strip() for c in categories.split(",") if c.strip()] if categories else None
            result = scan_pdf(input_path, cat_list)

        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(500, f"Scan error: {str(e)}")
    finally:
        cleanup_file(input_path, 5)


@router.post("/redact-apply")
async def apply_redaction(
    file: UploadFile = File(...),
    mode: str = Form("auto"),
    keywords: str = Form(""),
    categories: str = Form(""),
    fill_color: str = Form("black"),
    redactions_json: str = Form(""),
):
    """Apply redaction to PDF - permanently removes content."""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(400, "Only PDF files are supported")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, "File too large (max 100MB)")

    # Parse fill color
    color_map = {
        "black": (0, 0, 0),
        "white": (1, 1, 1),
    }
    fill = color_map.get(fill_color, (0, 0, 0))

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    unique_id = str(uuid.uuid4())[:8]
    input_path = os.path.join(UPLOAD_DIR, f"redact_in_{unique_id}.pdf")
    output_path = os.path.join(UPLOAD_DIR, f"redact_out_{unique_id}.pdf")

    with open(input_path, "wb") as f:
        f.write(content)

    try:
        if mode == "keyword" and keywords.strip():
            kw_list = [k.strip() for k in keywords.split(",") if k.strip()]
            result = redact_keywords(input_path, output_path, kw_list, fill)
        elif mode == "manual" and redactions_json.strip():
            redaction_data = json.loads(redactions_json)
            result = redact_pdf(input_path, output_path, redaction_data, fill)
        else:
            # Auto mode
            cat_list = [c.strip() for c in categories.split(",") if c.strip()] if categories else None
            result = redact_auto(input_path, output_path, cat_list, fill)

        orig_name = os.path.splitext(file.filename)[0]
        download_name = f"{orig_name}_redacted.pdf"

        response = FileResponse(
            output_path,
            media_type="application/pdf",
            filename=download_name,
            headers={
                "X-Total-Redacted": str(result["total_redacted"]),
                "X-Total-Pages": str(result["total_pages"]),
                "X-Original-Size": str(result["original_size"]),
                "X-New-Size": str(result["new_size"]),
                "Access-Control-Expose-Headers": "X-Total-Redacted, X-Total-Pages, X-Original-Size, X-New-Size",
            }
        )

        cleanup_file(input_path, 10)
        cleanup_file(output_path, 10)
        return response

    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid redaction data format")
    except Exception as e:
        cleanup_file(input_path, 0)
        cleanup_file(output_path, 0)
        raise HTTPException(500, f"Redaction error: {str(e)}")
