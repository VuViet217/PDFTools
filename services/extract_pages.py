"""
Service - Extract specific pages from PDF
"""
import io
from typing import List
from PyPDF2 import PdfReader, PdfWriter


def parse_page_range(page_range_str: str, total_pages: int) -> List[int]:
    """
    Parse page range string and return list of page numbers.
    
    Examples:
        "1,2,5-10" -> [1, 2, 5, 6, 7, 8, 9, 10]  (1-indexed)
        "1-3,5" -> [1, 2, 3, 5]
    
    Args:
        page_range_str: String containing page numbers/ranges
        total_pages: Total number of pages in PDF
    
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
                raise ValueError(f"Invalid range format: {part}")
            
            try:
                start = int(range_parts[0].strip())
                end = int(range_parts[1].strip())
            except ValueError:
                raise ValueError(f"Invalid page numbers in range: {part}")
            
            if start < 1 or end < 1:
                raise ValueError("Page numbers must be >= 1")
            if start > total_pages or end > total_pages:
                raise ValueError(f"Page number exceeds total pages ({total_pages})")
            if start > end:
                raise ValueError(f"Invalid range: {start} > {end}")
            
            # Add pages from start to end (inclusive, 1-indexed)
            for page_num in range(start, end + 1):
                pages.add(page_num - 1)  # Convert to 0-indexed
        else:
            # Handle single page like "5"
            try:
                page_num = int(part)
            except ValueError:
                raise ValueError(f"Invalid page number: {part}")
            
            if page_num < 1:
                raise ValueError("Page numbers must be >= 1")
            if page_num > total_pages:
                raise ValueError(f"Page {page_num} exceeds total pages ({total_pages})")
            
            pages.add(page_num - 1)  # Convert to 0-indexed
    
    if not pages:
        raise ValueError("No valid pages specified")
    
    # Return sorted pages
    return sorted(list(pages))


def extract_pages(pdf_bytes: bytes, page_range_str: str) -> bytes:
    """
    Extract specific pages from PDF and return as new PDF in memory.
    
    Args:
        pdf_bytes: Original PDF file as bytes
        page_range_str: Page range string (e.g., "1,2,5-10")
    
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
            raise ValueError("PDF is empty")
        
        # Parse page range
        page_indices = parse_page_range(page_range_str, total_pages)
        
        # Create new PDF with selected pages
        pdf_writer = PdfWriter()
        
        for page_idx in page_indices:
            pdf_writer.add_page(pdf_reader.pages[page_idx])
        
        # Write to bytes buffer
        output_buffer = io.BytesIO()
        pdf_writer.write(output_buffer)
        output_buffer.seek(0)
        
        return output_buffer.getvalue()
    
    except Exception as e:
        raise Exception(f"Error extracting pages from PDF: {str(e)}")
