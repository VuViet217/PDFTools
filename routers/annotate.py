"""
API Router - PDF Annotate (add text, highlight, draw, sign, image on PDF)
"""
import io
import os
import time
import json
import base64
import logging
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
import fitz  # PyMuPDF

logger = logging.getLogger(__name__)
router = APIRouter()


def remove_file(path: str):
    try:
        time.sleep(5)
        if os.path.exists(path):
            os.remove(path)
    except:
        pass


@router.post('/annotate/save')
async def save_annotated_pdf(
    file: UploadFile = File(...),
    annotations: str = Form(...),
    background_tasks: BackgroundTasks = None
):
    """
    Burn annotations into PDF and return the result.
    annotations: JSON string with array of annotation objects per page.
    Format: { "pages": { "0": [...], "1": [...] } }
    Each annotation: { type, x, y, width, height, ... type-specific fields }
    Coordinates are in PDF points (1/72 inch), origin top-left.
    """
    try:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail='Only PDF files are supported')

        contents = await file.read()
        if len(contents) > 100 * 1024 * 1024:
            raise HTTPException(status_code=413, detail='File too large (max 100MB)')

        annotation_data = json.loads(annotations)
        pages_annotations = annotation_data.get('pages', {})

        doc = fitz.open(stream=contents, filetype="pdf")

        for page_idx_str, annots in pages_annotations.items():
            page_idx = int(page_idx_str)
            if page_idx < 0 or page_idx >= len(doc):
                continue
            page = doc[page_idx]
            page_rect = page.rect
            pw = page_rect.width
            ph = page_rect.height

            for annot in annots:
                a_type = annot.get('type', '')
                # Scale factors from canvas coords to PDF coords
                scale_x = annot.get('scaleX', 1)
                scale_y = annot.get('scaleY', 1)

                if a_type == 'text':
                    _draw_text(page, annot, pw, ph)
                elif a_type == 'highlight':
                    _draw_highlight(page, annot, pw, ph)
                elif a_type == 'drawing':
                    _draw_path(page, annot, pw, ph)
                elif a_type == 'image':
                    _draw_image(page, annot, pw, ph)
                elif a_type == 'signature':
                    _draw_image(page, annot, pw, ph)
                elif a_type == 'shape':
                    _draw_shape(page, annot, pw, ph)

        # Save to temp file
        base_name = os.path.splitext(file.filename)[0]
        tmp_fd, tmp_path = tempfile.mkstemp(suffix=".pdf")
        with os.fdopen(tmp_fd, 'wb') as f:
            doc.save(f)
        doc.close()

        if background_tasks:
            background_tasks.add_task(remove_file, tmp_path)

        return FileResponse(
            path=tmp_path,
            filename=f"{base_name}_annotated.pdf",
            media_type="application/pdf"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving annotated PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color to (r, g, b) tuple in 0-1 range"""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 3:
        hex_color = ''.join(c * 2 for c in hex_color)
    r = int(hex_color[0:2], 16) / 255
    g = int(hex_color[2:4], 16) / 255
    b = int(hex_color[4:6], 16) / 255
    return (r, g, b)


def _draw_text(page, annot, pw, ph):
    """Insert text annotation"""
    x = annot.get('x', 0)
    y = annot.get('y', 0)
    text = annot.get('text', '')
    font_size = annot.get('fontSize', 16)
    color = annot.get('color', '#000000')

    if not text:
        return

    rgb = _hex_to_rgb(color)
    point = fitz.Point(x, y + font_size)  # fitz uses baseline
    page.insert_text(
        point,
        text,
        fontsize=font_size,
        color=rgb,
        fontname="helv"
    )


def _draw_highlight(page, annot, pw, ph):
    """Draw highlight rectangle"""
    x = annot.get('x', 0)
    y = annot.get('y', 0)
    w = annot.get('width', 100)
    h = annot.get('height', 30)
    color = annot.get('color', '#FFFF00')
    opacity = annot.get('opacity', 0.35)

    rgb = _hex_to_rgb(color)
    rect = fitz.Rect(x, y, x + w, y + h)
    shape = page.new_shape()
    shape.draw_rect(rect)
    shape.finish(color=None, fill=rgb, fill_opacity=opacity)
    shape.commit()


def _draw_path(page, annot, pw, ph):
    """Draw freehand path"""
    path_data = annot.get('path', [])
    color = annot.get('color', '#000000')
    stroke_width = annot.get('strokeWidth', 2)
    offset_x = annot.get('x', 0)
    offset_y = annot.get('y', 0)

    if not path_data or len(path_data) < 2:
        return

    rgb = _hex_to_rgb(color)
    shape = page.new_shape()

    for i, segment in enumerate(path_data):
        if isinstance(segment, list) and len(segment) >= 2:
            px, py = segment[0] + offset_x, segment[1] + offset_y
            if i == 0:
                shape.draw_line(fitz.Point(px, py), fitz.Point(px, py))
                last_point = fitz.Point(px, py)
            else:
                new_point = fitz.Point(px, py)
                shape.draw_line(last_point, new_point)
                last_point = new_point

    shape.finish(color=rgb, width=stroke_width, closePath=False)
    shape.commit()


def _draw_shape(page, annot, pw, ph):
    """Draw shape annotations (rectangle, ellipse, line, polygon, polyline)"""
    shape_type = annot.get('shape', '')
    stroke_color = annot.get('stroke', '#000000')
    fill_color = annot.get('fill', '')
    stroke_width = annot.get('strokeWidth', 2)
    opacity = annot.get('opacity', 1)
    dash_array = annot.get('dashArray', None)

    rgb_stroke = _hex_to_rgb(stroke_color)
    rgb_fill = _hex_to_rgb(fill_color) if fill_color and fill_color != 'transparent' else None

    shape = page.new_shape()

    # Build dashes string for PyMuPDF
    dashes = None
    if dash_array and isinstance(dash_array, list) and len(dash_array) >= 2:
        dashes = f"[{' '.join(str(int(d)) for d in dash_array)}] 0"

    if shape_type == 'rectangle':
        x = annot.get('x', 0)
        y = annot.get('y', 0)
        w = annot.get('width', 0)
        h = annot.get('height', 0)
        rect = fitz.Rect(x, y, x + w, y + h)
        shape.draw_rect(rect)

    elif shape_type == 'ellipse':
        x = annot.get('x', 0)
        y = annot.get('y', 0)
        rx = annot.get('rx', 0)
        ry = annot.get('ry', 0)
        rect = fitz.Rect(x, y, x + rx * 2, y + ry * 2)
        shape.draw_oval(rect)

    elif shape_type == 'line':
        ox = annot.get('offsetX', 0)
        oy = annot.get('offsetY', 0)
        x1 = annot.get('x1', 0) + ox
        y1 = annot.get('y1', 0) + oy
        x2 = annot.get('x2', 0) + ox
        y2 = annot.get('y2', 0) + oy
        shape.draw_line(fitz.Point(x1, y1), fitz.Point(x2, y2))

    elif shape_type in ('polygon', 'polyline'):
        points = annot.get('points', [])
        if len(points) < 2:
            return
        fitz_points = [fitz.Point(p['x'], p['y']) for p in points]
        for i in range(len(fitz_points) - 1):
            shape.draw_line(fitz_points[i], fitz_points[i + 1])
        if shape_type == 'polygon' and len(fitz_points) >= 3:
            shape.draw_line(fitz_points[-1], fitz_points[0])

    else:
        return

    shape.finish(
        color=rgb_stroke,
        fill=rgb_fill,
        width=stroke_width,
        fill_opacity=opacity if rgb_fill else 0,
        stroke_opacity=opacity,
        dashes=dashes,
        closePath=(shape_type in ('rectangle', 'ellipse', 'polygon'))
    )
    shape.commit()


def _draw_image(page, annot, pw, ph):
    """Insert image or signature"""
    img_data = annot.get('imageData', '')
    x = annot.get('x', 0)
    y = annot.get('y', 0)
    w = annot.get('width', 100)
    h = annot.get('height', 100)

    if not img_data:
        return

    # Remove data URL prefix if present
    if ',' in img_data:
        img_data = img_data.split(',', 1)[1]

    try:
        img_bytes = base64.b64decode(img_data)
        rect = fitz.Rect(x, y, x + w, y + h)
        page.insert_image(rect, stream=img_bytes)
    except Exception as e:
        logger.warning(f"Failed to insert image: {e}")
