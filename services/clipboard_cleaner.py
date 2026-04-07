"""
Service - Clipboard Cleaner
Làm sạch và chuẩn hóa văn bản copy từ PDF, web, email, Excel…
"""
import re
import unicodedata


def clean_text(text: str, options: dict) -> str:
    """
    Làm sạch văn bản theo các tùy chọn.

    Args:
        text: Văn bản cần xử lý
        options: Dict các tùy chọn bật/tắt

    Returns:
        Văn bản đã được làm sạch
    """
    if not text:
        return ""

    result = text

    # (1) Xóa ký tự đặc biệt / ký tự ẩn
    if options.get("remove_special_chars", True):
        result = _remove_special_chars(result)

    # (2) Chuẩn hóa khoảng trắng
    if options.get("remove_extra_spaces", True):
        result = _remove_extra_spaces(result)

    # (3) Gộp dòng bị ngắt không hợp lý
    if options.get("merge_lines", False):
        result = _merge_lines(result)

    # (4) Chuẩn hóa dấu câu
    if options.get("fix_punctuation", False):
        result = _fix_punctuation(result)

    # (5) Bỏ dấu tiếng Việt
    if options.get("remove_vietnamese_accents", False):
        result = _remove_vietnamese_accents(result)

    # (6) Chuyển chữ hoa/thường
    case_option = options.get("change_case", "")
    if case_option == "upper":
        result = result.upper()
    elif case_option == "lower":
        result = result.lower()
    elif case_option == "title":
        result = result.title()

    return result


def _remove_special_chars(text: str) -> str:
    """Xóa ký tự ẩn, zero-width, non-breaking space…"""
    # Non-breaking space → space
    text = text.replace("\u00A0", " ")
    # Zero-width chars
    text = re.sub(r"[\u200B\u200C\u200D\uFEFF\u2060]", "", text)
    # Soft hyphen
    text = text.replace("\u00AD", "")
    # BOM
    text = text.replace("\uFFFE", "")
    # Other control chars (keep \n \r \t)
    text = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", text)
    return text


def _remove_extra_spaces(text: str) -> str:
    """Xóa khoảng trắng thừa, tab thừa."""
    lines = text.split("\n")
    cleaned = []
    for line in lines:
        # Tab → space
        line = line.replace("\t", " ")
        # Nhiều space → 1 space
        line = re.sub(r" {2,}", " ", line)
        # Trim đầu/cuối
        line = line.strip()
        cleaned.append(line)
    return "\n".join(cleaned)


def _merge_lines(text: str) -> str:
    """Gộp các dòng bị ngắt không hợp lý thành đoạn văn."""
    lines = text.split("\n")
    merged = []
    buffer = ""

    for line in lines:
        stripped = line.strip()

        # Dòng trống = kết thúc đoạn
        if not stripped:
            if buffer:
                merged.append(buffer)
                buffer = ""
            merged.append("")
            continue

        # Nếu buffer đang có và dòng hiện tại không bắt đầu bằng dấu đặc biệt
        # (bullet, số thứ tự, heading…), gộp vào
        if buffer and not re.match(r"^(\d+[.)]\s|[-•●▪▸►]\s|#{1,6}\s|[A-Z]{2,}:)", stripped):
            buffer += " " + stripped
        else:
            if buffer:
                merged.append(buffer)
            buffer = stripped

    if buffer:
        merged.append(buffer)

    # Xóa dòng trống cuối thừa
    while merged and merged[-1] == "":
        merged.pop()

    return "\n".join(merged)


def _fix_punctuation(text: str) -> str:
    """Chuẩn hóa khoảng trắng quanh dấu câu."""
    # Xóa space trước dấu câu
    text = re.sub(r"\s+([.,;:!?。、！？）\)」』】》])", r"\1", text)
    # Đảm bảo 1 space sau dấu câu (trừ cuối dòng)
    text = re.sub(r"([.,;:!?。、！？])(\S)", r"\1 \2", text)
    # Xóa space sau dấu mở ngoặc
    text = re.sub(r"([（\(「『【《])\s+", r"\1", text)
    return text


def _remove_vietnamese_accents(text: str) -> str:
    """Bỏ dấu tiếng Việt."""
    # Mapping đặc biệt cho đ/Đ
    text = text.replace("đ", "d").replace("Đ", "D")
    # NFD decomposition rồi bỏ combining marks
    nfkd = unicodedata.normalize("NFD", text)
    return "".join(c for c in nfkd if unicodedata.category(c) != "Mn")
