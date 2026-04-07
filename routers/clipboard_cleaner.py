"""
API Router - Clipboard Cleaner
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.clipboard_cleaner import clean_text

router = APIRouter()


class CleanTextRequest(BaseModel):
    text: str = Field(..., max_length=500_000)
    options: dict = Field(default_factory=dict)


class CleanTextResponse(BaseModel):
    cleaned_text: str


@router.post("/clean-text", response_model=CleanTextResponse)
async def clean_text_endpoint(req: CleanTextRequest):
    """
    API endpoint làm sạch văn bản.

    Request:
        - text: Văn bản cần xử lý
        - options: Các tùy chọn bật/tắt

    Response:
        - cleaned_text: Văn bản đã làm sạch
    """
    cleaned = clean_text(req.text, req.options)
    return CleanTextResponse(cleaned_text=cleaned)
