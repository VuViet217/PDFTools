import os
import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# Import routers
from routers.split_merge import router as split_merge_router
from routers.editor import router as editor_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create uploads directory if not exists
UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

# Lifespan context
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("✅ PDF Tools App started")
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
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers
app.include_router(split_merge_router, prefix="/api", tags=["split_merge"])
app.include_router(editor_router, prefix="/api", tags=["editor"])

# Root route - serve index.html
@app.get("/", response_class=HTMLResponse)
async def read_root():
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

# Health check
@app.get("/health")
async def health_check():
    return {"status": "ok", "app": "PDF Tools"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
