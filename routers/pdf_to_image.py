"""
API Router - PDF to Image conversion endpoints
"""
import os
import tempfile
import zipfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pathlib import Path

from services.pdf_to_image import convert_pdf_to_images, get_pdf_page_count

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


@router.post("/pdf-to-image/convert")
async def pdf_to_image_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    format: str = Form("png"),
    quality: int = Form(85)
):
    """
    API endpoint chuyển đổi PDF sang ảnh
    
    Request:
        - file: PDF upload
        - format: Định dạng ảnh (png hoặc jpg)
        - quality: Chất lượng ảnh (1-100), chỉ áp dụng cho JPG
    
    Response:
        - File: ZIP chứa các ảnh
    """
    try:
        # Kiểm tra file type
        if file.content_type not in ["application/pdf"]:
            raise HTTPException(status_code=400, detail="File phải là PDF")
        
        # Kiểm tra kích thước (50MB max)
        contents = await file.read()
        if len(contents) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File quá lớn (max 50MB)")
        
        # Validate format
        if format.lower() not in ["png", "jpg"]:
            raise HTTPException(status_code=400, detail="Định dạng phải là 'png' hoặc 'jpg'")
        
        # Validate quality
        try:
            quality = int(quality)
            if quality < 1 or quality > 100:
                quality = 85
        except:
            quality = 85
        
        # Lưu temp file
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name
        
        try:
            # Gọi service
            result = await convert_pdf_to_images(tmp_path, format.lower(), quality)
            
            if not result["success"]:
                raise HTTPException(status_code=400, detail=result.get("error", "Lỗi chuyển đổi PDF"))
            
            # Tạo ZIP chứa các ảnh
            zip_filename = f"pdf_to_images_{os.urandom(8).hex()}.zip"
            zip_path = UPLOADS_DIR / zip_filename
            
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for img_bytes, filename in zip(result["images"], result["filenames"]):
                    zip_file.writestr(filename, img_bytes)
            
            # Lên lịch tự động xóa ZIP sau khi tải về
            background_tasks.add_task(remove_file, str(zip_path))
            
            return FileResponse(
                zip_path,
                filename=zip_filename,
                media_type="application/zip",
                headers={
                    "X-Total-Pages": str(result["total_pages"])
                }
            )
        
        finally:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except:
                    pass
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pdf-to-image/preview")
async def pdf_preview_endpoint(file: UploadFile = File(...)):
    """
    API endpoint lấy preview (trang đầu tiên) của PDF
    """
    try:
        # Kiểm tra file type
        if file.content_type not in ["application/pdf"]:
            raise HTTPException(status_code=400, detail="File phải là PDF")
        
        contents = await file.read()
        
        # Lưu temp file
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name
        
        try:
            # Lấy số trang
            page_info = await get_pdf_page_count(tmp_path)
            
            if not page_info["success"]:
                raise HTTPException(status_code=400, detail=page_info.get("error", "Lỗi đọc PDF"))
            
            # Chuyển đổi trang đầu tiên thành preview
            result = await convert_pdf_to_images(tmp_path, "png", 85)
            
            if not result["success"]:
                raise HTTPException(status_code=400, detail=result.get("error", "Lỗi tạo preview"))
            
            # Trả lại thông tin: số trang và ảnh trang đầu tiên dạng base64
            import base64
            preview_base64 = base64.b64encode(result["images"][0]).decode('utf-8')
            
            return {
                "success": True,
                "page_count": page_info["page_count"],
                "preview": f"data:image/png;base64,{preview_base64}"
            }
        
        finally:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except:
                    pass
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
