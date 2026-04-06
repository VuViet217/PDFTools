import os
import logging
import asyncio
import time
import uuid
import socket
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# Import routers
from routers.split_merge import router as split_merge_router
from routers.editor import router as editor_router
from routers.compress import router as compress_router
from routers.security import router as security_router
from routers.image_converter import router as image_converter_router
from routers.word_compare import router as word_compare_router
from routers.excel_compare import router as excel_compare_router
from routers.pdf_to_image import router as pdf_to_image_router
from routers.pdf_to_excel import router as pdf_to_excel_router
from routers.annotate import router as annotate_router
from routers.extract_images import router as extract_images_router

# Import services
from services.visitor_tracker import visitor_tracker

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create uploads directory if not exists
UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

# Hàm lấy IP LAN của máy tính
def get_local_ip():
    """Lấy IP LAN của máy tính hiện tại"""
    try:
        # Tạo socket để xác định IP LAN (không thực sự connect)
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        try:
            # Fallback: lấy từ hostname
            hostname = socket.gethostname()
            ip = socket.gethostbyname(hostname)
            return ip
        except:
            return "127.0.0.1"

# Hàm chạy ngầm dọn rác định kỳ (Mỗi 5 phút dọn 1 lần các file quá cũ - nhanh hơn cho image files)
def cleanup_old_files():
    try:
        now = time.time()
        count = 0
        total_size = 0
        # Dọn file cũ hơn 5 phút (300 giây) cho image converter files
        for filename in os.listdir(UPLOADS_DIR):
            file_path = os.path.join(UPLOADS_DIR, filename)
            if os.path.isfile(file_path):
                file_age = now - os.stat(file_path).st_mtime
                # Dọn file .zip sau 60 giây, file khác sau 300 giây (5 phút)
                max_age = 60 if filename.endswith('.zip') else 300
                
                if file_age > max_age:
                    try:
                        file_size = os.path.getsize(file_path)
                        os.remove(file_path)
                        count += 1
                        total_size += file_size
                    except Exception as e:
                        logger.debug(f"Failed to delete {filename}: {e}")
        
        if count > 0:
            size_mb = total_size / (1024 * 1024)
            logger.info(f"✨ Auto cleanup: Deleted {count} files ({size_mb:.1f}MB)")
    except Exception as e:
        logger.debug(f"Cleanup error: {e}")


# Background cleanup task
async def background_cleanup():
    """Run cleanup every 5 minutes in the background"""
    while True:
        try:
            await asyncio.sleep(300)  # 5 minutes
            cleanup_old_files()
        except Exception as e:
            logger.debug(f"Background cleanup error: {e}")


# Lifespan context
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("✅ PDF Tools App started")
    cleanup_old_files()  # Clean once on startup
    
    # Start background cleanup task
    cleanup_task = asyncio.create_task(background_cleanup())
    
    yield
    
    # Cancel cleanup task on shutdown
    cleanup_task.cancel()
    logger.info("🛑 PDF Tools App shutdown")

# Initialize FastAPI app
app = FastAPI(
    title="PDF Tools",
    description="Internal PDF Processing Application",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - Allow internal network
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Internal network only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Original-Size", "X-New-Size"] # Mở headers để JS đọc % nén
)

# Visitor tracking middleware
@app.middleware("http")
async def track_visitors(request, call_next):
    """Theo dõi số lượng người dùng truy cập - mỗi phiên chỉ tính 1 lần"""
    client_ip = request.client.host if request.client else "unknown"
    
    # Lấy session_id từ cookie, nếu không có thì tạo mới
    session_id = request.cookies.get("session_id")
    if not session_id:
        session_id = str(uuid.uuid4())
    
    # Track visit với session_id
    visitor_tracker.track_visit(session_id, client_ip)
    
    response = await call_next(request)
    
    # Set cookie với session_id (15 ngày)
    response.set_cookie(
        key="session_id",
        value=session_id,
        max_age=15*24*60*60,  # 15 days
        httponly=True,
        samesite="lax"
    )
    
    return response

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers
app.include_router(split_merge_router, prefix="/api", tags=["split_merge"])
app.include_router(editor_router, prefix="/api", tags=["editor"])
app.include_router(compress_router, prefix="/api", tags=["compress"])
app.include_router(security_router, prefix="/api", tags=["security"])
app.include_router(image_converter_router, prefix="/api", tags=["image_converter"])
app.include_router(word_compare_router, prefix="/api", tags=["word_compare"])
app.include_router(excel_compare_router, prefix="/api", tags=["excel_compare"])
app.include_router(pdf_to_image_router, prefix="/api", tags=["pdf_to_image"])
app.include_router(pdf_to_excel_router, prefix="/api", tags=["pdf_to_excel"])
app.include_router(annotate_router, prefix="/api", tags=["annotate"])
app.include_router(extract_images_router, prefix="/api", tags=["extract_images"])

# Root route - serve tools.html (main dashboard)
@app.get("/", response_class=HTMLResponse)
async def read_root():
    with open("templates/tools.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

# PDF Tools page
@app.get("/pdf", response_class=HTMLResponse)
async def pdf_page():
    with open("templates/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

# PDF to Image page
@app.get("/pdf-to-image", response_class=HTMLResponse)
async def pdf_to_image_page():
    with open("templates/pdf_to_image.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

# Split/Merge page
@app.get("/split-merge", response_class=HTMLResponse)
async def split_merge_page():
    with open("templates/split_merge.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

# Editor page
@app.get("/editor", response_class=HTMLResponse)
async def editor_page():
    with open("templates/editor.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

# Compress page
@app.get("/compress", response_class=HTMLResponse)
async def compress_page():
    with open("templates/compress.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

# Security page
@app.get("/security", response_class=HTMLResponse)
async def security_page():
    with open("templates/security.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

# Image Converter page
@app.get("/image-converter", response_class=HTMLResponse)
async def image_converter_page():
    with open("templates/image_converter.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

# Password Generator page
@app.get("/password-generator", response_class=HTMLResponse)
async def password_generator_page():
    with open("templates/password_generator.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

# Word Compare page
@app.get("/word-compare", response_class=HTMLResponse)
async def word_compare_page():
    with open("templates/word_compare.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

# Excel Compare page
@app.get("/excel-compare", response_class=HTMLResponse)
async def excel_compare_page():
    with open("templates/excel_compare.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

# Extract Pages page
@app.get("/extract-pages", response_class=HTMLResponse)
async def extract_pages_page():
    with open("templates/extract_pages.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

# PDF to Excel page
@app.get("/pdf-to-excel", response_class=HTMLResponse)
async def pdf_to_excel_page():
    with open("templates/pdf_to_excel.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

# Extract Images from PDF page
@app.get("/extract-images", response_class=HTMLResponse)
async def extract_images_page():
    with open("templates/extract_images.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

# Annotate PDF page
@app.get("/annotate", response_class=HTMLResponse)
async def annotate_page():
    with open("templates/annotate.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

# Manual cleanup endpoint - người dùng có thể gọi khi kết thúc session
@app.post("/api/cleanup")
async def manual_cleanup():
    """Xóa file tạm cũ - gọi khi người dùng đóng tab/trình duyệt"""
    cleanup_old_files()
    return {"status": "cleaned"}

# Visitor stats endpoint
@app.get("/api/visitor-stats")
async def get_visitor_stats():
    """Lấy thống kê truy cập"""
    return visitor_tracker.get_stats()

# Client IP endpoint
@app.get("/api/client-ip")
async def get_client_ip(request: Request):
    """Lấy IP LAN của người truy cập"""
    # Ưu tiên header X-Forwarded-For (nếu qua proxy/reverse proxy)
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "unknown"
    return {"ip": ip}

# Health check
@app.get("/health")
async def health_check():
    return {"status": "ok", "app": "PDF Tools"}

# 404 Error Page - Catch all undefined routes
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    """Xử lý tất cả route không được định nghĩa và trả về trang 404"""
    with open("templates/404.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read(), status_code=404)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
