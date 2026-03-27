import os
import logging
import asyncio
import time
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# Import routers
from routers.split_merge import router as split_merge_router
from routers.editor import router as editor_router
from routers.compress import router as compress_router
from routers.security import router as security_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create uploads directory if not exists
UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

# Hàm chạy ngầm dọn rác định kỳ (Mỗi giờ dọn 1 lần các file quá cũ)
def cleanup_old_files():
    try:
        now = time.time()
        count = 0
        for filename in os.listdir(UPLOADS_DIR):
            file_path = os.path.join(UPLOADS_DIR, filename)
            # Nếu file là file rác (temp) và đã tồn tại quá 1 giờ (3600 giây)
            if os.path.isfile(file_path):
                if os.stat(file_path).st_mtime < now - 3600:
                    os.remove(file_path)
                    count += 1
        if count > 0:
            logger.info(f"✨ Đã tự động dọn dẹp {count} file rác cũ!")
    except Exception as e:
        pass

# Lifespan context
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("✅ PDF Tools App started")
    cleanup_old_files() # Dọn rác một lần lúc khởi động server
    yield
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

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers
app.include_router(split_merge_router, prefix="/api", tags=["split_merge"])
app.include_router(editor_router, prefix="/api", tags=["editor"])
app.include_router(compress_router, prefix="/api", tags=["compress"])
app.include_router(security_router, prefix="/api", tags=["security"])

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

# Health check
@app.get("/health")
async def health_check():
    return {"status": "ok", "app": "PDF Tools"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
