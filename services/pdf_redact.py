import os
import re
import fitz  # PyMuPDF
import json
from datetime import datetime


# Regex patterns for sensitive data detection
PATTERNS = {
    "email": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
    "phone_vn": r'\b(?:\+84|0)(?:\d[\s.-]?){8,10}\b',
    "phone_jp": r'\b(?:\+81|0)(?:\d[\s.-]?){9,10}\b',
    "cccd": r'\b\d{9}(?:\d{3})?\b',  # 9 or 12 digits (CMND/CCCD)
    "bank_account": r'\b\d{4}[\s.-]?\d{4}[\s.-]?\d{4}(?:[\s.-]?\d{4})?\b',
    "credit_card": r'\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[\s.-]?\d{4}[\s.-]?\d{4}[\s.-]?\d{4}\b',
    "address_vn": r'\b(?:số|đường|phố|phường|quận|huyện|xã|tỉnh|thành phố|tp\.|TP\.)[\s\w,.-]{5,60}\b',
}


def auto_detect_sensitive(text: str, categories: list = None) -> list:
    """Detect sensitive data in text using regex patterns."""
    if categories is None:
        categories = list(PATTERNS.keys())

    findings = []
    for cat in categories:
        if cat not in PATTERNS:
            continue
        pattern = PATTERNS[cat]
        for match in re.finditer(pattern, text, re.IGNORECASE):
            findings.append({
                "category": cat,
                "text": match.group(),
                "start": match.start(),
                "end": match.end(),
            })
    return findings


def scan_pdf(file_path: str, categories: list = None) -> dict:
    """Scan PDF for sensitive data, return findings per page."""
    doc = fitz.open(file_path)
    results = {"total_pages": len(doc), "pages": []}

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")
        findings = auto_detect_sensitive(text, categories)

        page_findings = []
        for f in findings:
            # Find text instances on page for accurate positioning
            instances = page.search_for(f["text"])
            for inst in instances:
                page_findings.append({
                    "category": f["category"],
                    "text": f["text"],
                    "rect": [inst.x0, inst.y0, inst.x1, inst.y1],
                })

        results["pages"].append({
            "page": page_num + 1,
            "findings": page_findings,
            "count": len(page_findings),
        })

    doc.close()
    return results


def scan_keywords(file_path: str, keywords: list) -> dict:
    """Scan PDF for specific keywords, return findings per page."""
    doc = fitz.open(file_path)
    results = {"total_pages": len(doc), "pages": [], "keywords": keywords}

    for page_num in range(len(doc)):
        page = doc[page_num]
        page_findings = []

        for keyword in keywords:
            if not keyword.strip():
                continue
            instances = page.search_for(keyword.strip())
            for inst in instances:
                page_findings.append({
                    "category": "keyword",
                    "text": keyword.strip(),
                    "rect": [inst.x0, inst.y0, inst.x1, inst.y1],
                })

        results["pages"].append({
            "page": page_num + 1,
            "findings": page_findings,
            "count": len(page_findings),
        })

    doc.close()
    return results


def redact_pdf(file_path: str, output_path: str, redactions: list,
               fill_color: tuple = (0, 0, 0)) -> dict:
    """
    Permanently redact PDF content.

    Args:
        file_path: Input PDF path
        output_path: Output PDF path
        redactions: List of {"page": int, "rects": [[x0,y0,x1,y1], ...]}
                    OR {"page": int, "keywords": ["word1", ...]}
        fill_color: RGB tuple (0-1 range) for redaction box color

    Returns:
        dict with stats
    """
    doc = fitz.open(file_path)
    total_redacted = 0
    redacted_items = []

    for redaction in redactions:
        page_num = redaction.get("page", 1) - 1  # Convert to 0-based
        if page_num < 0 or page_num >= len(doc):
            continue

        page = doc[page_num]

        # Handle keyword-based redactions
        keywords = redaction.get("keywords", [])
        for keyword in keywords:
            instances = page.search_for(keyword)
            for inst in instances:
                page.add_redact_annot(
                    inst,
                    fill=fill_color,
                )
                total_redacted += 1
                redacted_items.append({
                    "page": page_num + 1,
                    "text": keyword,
                    "type": "keyword",
                })

        # Handle rect-based redactions
        rects = redaction.get("rects", [])
        for rect_data in rects:
            rect = fitz.Rect(rect_data)
            page.add_redact_annot(
                rect,
                fill=fill_color,
            )
            # Get text in the rect for logging
            text_in_rect = page.get_text("text", clip=rect).strip()
            total_redacted += 1
            redacted_items.append({
                "page": page_num + 1,
                "text": text_in_rect[:50] if text_in_rect else "[area]",
                "type": "rect",
            })

        # Apply redactions - this PERMANENTLY removes content
        page.apply_redactions()

    # Remove metadata that might contain sensitive info
    doc.set_metadata({
        "producer": "OVNC PDF Tools",
        "creator": "OVNC PDF Redaction",
        "creationDate": "",
        "modDate": "",
        "title": "",
        "author": "",
        "subject": "",
        "keywords": "",
    })

    # Save with garbage collection and deflation for clean output
    doc.save(output_path, garbage=4, deflate=True, clean=True)

    original_size = os.path.getsize(file_path)
    new_size = os.path.getsize(output_path)

    doc.close()

    return {
        "total_redacted": total_redacted,
        "total_pages": len(fitz.open(output_path)),
        "original_size": original_size,
        "new_size": new_size,
        "items": redacted_items,
    }


def redact_auto(file_path: str, output_path: str,
                categories: list = None,
                fill_color: tuple = (0, 0, 0)) -> dict:
    """Auto-detect and redact all sensitive data."""
    scan_result = scan_pdf(file_path, categories)

    redactions = []
    for page_data in scan_result["pages"]:
        if page_data["count"] == 0:
            continue
        keywords = list(set(f["text"] for f in page_data["findings"]))
        redactions.append({
            "page": page_data["page"],
            "keywords": keywords,
        })

    if not redactions:
        # No sensitive data found, just copy
        import shutil
        shutil.copy2(file_path, output_path)
        return {
            "total_redacted": 0,
            "total_pages": scan_result["total_pages"],
            "original_size": os.path.getsize(file_path),
            "new_size": os.path.getsize(output_path),
            "items": [],
        }

    return redact_pdf(file_path, output_path, redactions, fill_color)


def redact_keywords(file_path: str, output_path: str,
                    keywords: list,
                    fill_color: tuple = (0, 0, 0)) -> dict:
    """Redact specific keywords from all pages."""
    doc = fitz.open(file_path)
    redactions = []

    for page_num in range(len(doc)):
        redactions.append({
            "page": page_num + 1,
            "keywords": keywords,
        })

    doc.close()
    return redact_pdf(file_path, output_path, redactions, fill_color)
