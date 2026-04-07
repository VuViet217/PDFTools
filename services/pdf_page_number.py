"""
PDF Page Number Service - Đánh số trang PDF
"""
import os
import io
from datetime import datetime
import fitz  # PyMuPDF


async def add_page_numbers(
    file_path: str,
    position: str = "bottom-center",
    start_number: int = 1,
    font_size: float = 11,
    margin_bottom: float = 30,
    format_template: str = "{n}",
    color_hex: str = "#000000",
) -> dict:
    """
    Thêm số trang vào mỗi trang PDF.

    Args:
        file_path: Đường dẫn file PDF
        position: Vị trí số trang (bottom-left, bottom-center, bottom-right)
        start_number: Số trang bắt đầu
        font_size: Cỡ chữ
        margin_bottom: Khoảng cách từ dưới lên (pt)
        format_template: Format hiển thị, {n} = số trang, {total} = tổng trang
        color_hex: Mã màu hex
    """
    try:
        if not os.path.exists(file_path):
            return {"success": False, "error": "File không tồn tại"}

        doc = fitz.open(file_path)
        total_pages = len(doc)

        # Parse color hex -> RGB (0-1 range)
        color_hex = color_hex.lstrip("#")
        r = int(color_hex[0:2], 16) / 255
        g = int(color_hex[2:4], 16) / 255
        b = int(color_hex[4:6], 16) / 255
        color = (r, g, b)

        for i, page in enumerate(doc):
            page_num = start_number + i
            rect = page.rect
            width = rect.width

            # Format text
            text = format_template.replace("{n}", str(page_num)).replace(
                "{total}", str(total_pages)
            )

            # Tính vị trí x theo position
            # Dùng fontsize để estimate chiều rộng text
            text_width = fitz.get_text_length(text, fontname="helv", fontsize=font_size)

            if position == "bottom-left":
                x = 50
            elif position == "bottom-right":
                x = width - text_width - 50
            else:  # bottom-center
                x = (width - text_width) / 2

            y = rect.height - margin_bottom

            # Chèn text
            page.insert_text(
                fitz.Point(x, y),
                text,
                fontname="helv",
                fontsize=font_size,
                color=color,
            )

        output_buffer = io.BytesIO()
        doc.save(output_buffer, garbage=3, deflate=True)
        doc.close()
        output_buffer.seek(0)

        return {
            "success": True,
            "output_pdf": output_buffer.getvalue(),
            "filename": f"numbered_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
            "total_pages": total_pages,
        }

    except Exception as e:
        return {"success": False, "error": str(e)}
