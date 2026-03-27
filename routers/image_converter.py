"""
API Router - Image Converter endpoints
"""
import os
import time
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from pathlib import Path

from services.image_converter import convert_image, get_image_info, SUPPORTED_FORMATS

router = APIRouter()

UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)


def remove_file(path: str):
    """Remove file after sending"""
    try:
        time.sleep(5)
        if os.path.exists(path):
            os.remove(path)
    except:
        pass


@router.post("/image/convert")
async def convert_image_endpoint(
    file: UploadFile = File(...),
    target_format: str = Form(...),
    quality: int = Form(95)
):
    """
    Convert image to target format
    
    Args:
        file: Uploaded image file
        target_format: Target format (png, jpg, webp, etc.)
        quality: Quality level for lossy formats (1-100)
    
    Response:
        - success: bool
        - download_url: str (URL to download converted file)
        - metadata: dict (file info)
    """
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Validate file size (max 100MB)
        contents = await file.read()
        if len(contents) > 100 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large (max 100MB)")
        
        # Save uploaded file
        input_filename = file.filename.replace(" ", "_")
        input_path = UPLOADS_DIR / input_filename
        
        with open(input_path, "wb") as f:
            f.write(contents)
        
        # Validate format
        target_format = target_format.lower().strip()
        if target_format not in SUPPORTED_FORMATS:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {target_format}")
        
        # Quality validation
        quality = max(1, min(100, quality))
        
        # Convert image
        output_path, metadata = convert_image(str(input_path), target_format, quality)
        
        # Get download filename
        output_filename = Path(output_path).name
        
        return {
            "success": True,
            "download_url": f"/uploads/{output_filename}",
            "download_filename": output_filename,
            "metadata": metadata
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Clean up
        try:
            os.remove(input_path)
        except:
            pass
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/image/formats")
async def get_supported_formats():
    """Get list of supported image formats"""
    formats = {
        'raster': ['PNG', 'JPG', 'JPEG', 'BMP', 'GIF', 'TIFF', 'WebP', 'ICO'],
        'raw': ['ORF', 'CR2', 'NEF', 'ARW', 'DNG', 'RAW']
    }
    return {
        "supported_formats": formats,
        "total": sum(len(v) for v in formats.values())
    }
