"""
Service - Extract specific pages from PDF
Support: Vietnamese (vi), Japanese (ja), English (en)
"""
import io
from typing import List
from PyPDF2 import PdfReader, PdfWriter


# Messages for different languages
MESSAGES = {
    "vi": {
        "invalid_range_format": "Định dạng khoảng không hợp lệ: {part}",
        "invalid_page_numbers": "Số trang không hợp lệ trong khoảng: {part}",
        "page_gt_1": "Số trang phải >= 1",
        "page_exceeds_total": "Số trang vượt quá tổng số trang ({total_pages})",
        "invalid_range": "Khoảng không hợp lệ: {start} > {end}",
        "invalid_page_number": "Số trang không hợp lệ: {part}",
        "page_exceeds": "Trang {page_num} vượt quá tổng số trang ({total_pages})",
        "no_valid_pages": "Không có trang hợp lệ nào được chỉ định",
        "pdf_empty": "PDF trống",
        "extract_error": "Lỗi khi tách trang từ PDF: {error}"
    },
    "ja": {
        "invalid_range_format": "無効な範囲形式です: {part}",
        "invalid_page_numbers": "範囲内の無効なページ番号: {part}",
        "page_gt_1": "ページ番号は1以上である必要があります",
        "page_exceeds_total": "ページ番号は総ページ数を超えています ({total_pages})",
        "invalid_range": "無効な範囲です: {start} > {end}",
        "invalid_page_number": "無効なページ番号: {part}",
        "page_exceeds": "ページ {page_num} は総ページ数を超えています ({total_pages})",
        "no_valid_pages": "有効なページが指定されていません",
        "pdf_empty": "PDFが空です",
        "extract_error": "PDFからのページ抽出エラー: {error}"
    },
    "en": {
        "invalid_range_format": "Invalid range format: {part}",
        "invalid_page_numbers": "Invalid page numbers in range: {part}",
        "page_gt_1": "Page numbers must be >= 1",
        "page_exceeds_total": "Page number exceeds total pages ({total_pages})",
        "invalid_range": "Invalid range: {start} > {end}",
        "invalid_page_number": "Invalid page number: {part}",
        "page_exceeds": "Page {page_num} exceeds total pages ({total_pages})",
        "no_valid_pages": "No valid pages specified",
        "pdf_empty": "PDF is empty",
        "extract_error": "Error extracting pages from PDF: {error}"
    }
}


def get_message(key: str, lang: str = "en", **kwargs) -> str:
    """Get message in specified language"""
    lang = lang.lower() if lang else "en"
    if lang not in MESSAGES:
        lang = "en"
    
    message = MESSAGES[lang].get(key, MESSAGES["en"][key])
    return message.format(**kwargs) if kwargs else message


def parse_page_range(page_range_str: str, total_pages: int, lang: str = "en") -> List[int]:
    """
    Parse page range string and return list of page numbers.
    
    Examples:
        "1,2,5-10" -> [1, 2, 5, 6, 7, 8, 9, 10]  (1-indexed)
        "1-3,5" -> [1, 2, 3, 5]
    
    Args:
        page_range_str: String containing page numbers/ranges
        total_pages: Total number of pages in PDF
        lang: Language code (vi, ja, en)
    
    Returns:
        List of 0-indexed page numbers
    
    Raises:
        ValueError: Invalid format or page number out of range
    """
    pages = set()
    
    # Split by comma
    parts = page_range_str.split(',')
    
    for part in parts:
        part = part.strip()
        if not part:
            continue
        
        if '-' in part:
            # Handle range like "5-10"
            range_parts = part.split('-')
            if len(range_parts) != 2:
                raise ValueError(get_message("invalid_range_format", lang, part=part))
            
            try:
                start = int(range_parts[0].strip())
                end = int(range_parts[1].strip())
            except ValueError:
                raise ValueError(get_message("invalid_page_numbers", lang, part=part))
            
            if start < 1 or end < 1:
                raise ValueError(get_message("page_gt_1", lang))
            if start > total_pages or end > total_pages:
                raise ValueError(get_message("page_exceeds_total", lang, total_pages=total_pages))
            if start > end:
                raise ValueError(get_message("invalid_range", lang, start=start, end=end))
            
            # Add pages from start to end (inclusive, 1-indexed)
            for page_num in range(start, end + 1):
                pages.add(page_num - 1)  # Convert to 0-indexed
        else:
            # Handle single page like "5"
            try:
                page_num = int(part)
            except ValueError:
                raise ValueError(get_message("invalid_page_number", lang, part=part))
            
            if page_num < 1:
                raise ValueError(get_message("page_gt_1", lang))
            if page_num > total_pages:
                raise ValueError(get_message("page_exceeds", lang, page_num=page_num, total_pages=total_pages))
            
            pages.add(page_num - 1)  # Convert to 0-indexed
    
    if not pages:
        raise ValueError(get_message("no_valid_pages", lang))
    
    # Return sorted pages
    return sorted(list(pages))


def extract_pages(pdf_bytes: bytes, page_range_str: str, lang: str = "en") -> bytes:
    """
    Extract specific pages from PDF and return as new PDF in memory.
    
    Args:
        pdf_bytes: Original PDF file as bytes
        page_range_str: Page range string (e.g., "1,2,5-10")
        lang: Language code (vi, ja, en)
    
    Returns:
        New PDF file as bytes containing only the specified pages
    
    Raises:
        ValueError: Invalid page range
        Exception: PDF processing error
    """
    try:
        # Read PDF from bytes
        pdf_reader = PdfReader(io.BytesIO(pdf_bytes))
        total_pages = len(pdf_reader.pages)
        
        if total_pages == 0:
            raise ValueError(get_message("pdf_empty", lang))
        
        # Parse page range
        page_indices = parse_page_range(page_range_str, total_pages, lang)
        
        # Create new PDF with selected pages
        pdf_writer = PdfWriter()
        
        for page_idx in page_indices:
            pdf_writer.add_page(pdf_reader.pages[page_idx])
        
        # Write to bytes buffer
        output_buffer = io.BytesIO()
        pdf_writer.write(output_buffer)
        output_buffer.seek(0)
        
        return output_buffer.getvalue()
    
    except ValueError:
        raise
    except Exception as e:
        raise Exception(get_message("extract_error", lang, error=str(e)))
