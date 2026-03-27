"""
Image Converter Service - Convert between different image formats
Supports: PNG, JPG, BMP, GIF, TIFF, WebP, ICO, ORF, CR2, NEF, ARW, DNG, RAW, SVG
"""
import os
import base64
import tempfile
from pathlib import Path
from PIL import Image
import imageio
import cv2
import piexif

# Supported formats with extensions
SUPPORTED_FORMATS = {
    'png': 'PNG',
    'jpg': 'JPEG',
    'jpeg': 'JPEG',
    'bmp': 'BMP',
    'gif': 'GIF',
    'tiff': 'TIFF',
    'tif': 'TIFF',
    'webp': 'WEBP',
    'ico': 'ICO',
    'orf': 'RAW',  # Olympus RAW
    'cr2': 'RAW',  # Canon RAW
    'nef': 'RAW',  # Nikon RAW
    'arw': 'RAW',  # Sony RAW
    'dng': 'DNG',  # Adobe RAW
    'raw': 'RAW',
}

LOSSLESS_FORMATS = {'png', 'bmp', 'tiff', 'tif', 'gif', 'ico', 'webp'}
LOSSY_FORMATS = {'jpg', 'jpeg'}
RAW_FORMATS = {'orf', 'cr2', 'nef', 'arw', 'dng', 'raw', 'svg'}


def convert_image(input_path: str, output_format: str, quality: int = 95) -> tuple:
    """
    Convert image to target format
    
    Args:
        input_path: Path to input image file
        output_format: Target format (png, jpg, webp, etc.)
        quality: Quality level (1-100), only for lossy formats
    
    Returns:
        (output_path, metadata) - tuple of output file path and file info
    """
    input_format = Path(input_path).suffix.lstrip('.').lower()
    output_format = output_format.lower()
    
    if output_format not in SUPPORTED_FORMATS:
        raise ValueError(f"Unsupported format: {output_format}")
    
    try:
        # Handle RAW formats using imageio or cv2
        if input_format in RAW_FORMATS and input_format != 'svg':
            img_array = imageio.imread(input_path)
            # Convert numpy array to PIL Image
            image = Image.fromarray(img_array.astype('uint8'))
        else:
            # Open regular image
            image = Image.open(input_path)
            
            # Preserve EXIF data for JPEG
            if input_format.lower() in ['jpg', 'jpeg']:
                try:
                    exif_dict = piexif.load(input_path)
                except:
                    exif_dict = None
            else:
                exif_dict = None
        
        # Handle RGBA to RGB conversion for JPEG
        if output_format in ['jpg', 'jpeg'] and image.mode in ['RGBA', 'LA', 'P']:
            # Create white background
            rgb_image = Image.new('RGB', image.size, (255, 255, 255))
            rgb_image.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = rgb_image
        
        # Create output file
        output_dir = Path("uploads")
        output_dir.mkdir(exist_ok=True)
        
        output_filename = f"converted_{Path(input_path).stem}.{output_format}"
        output_path = output_dir / output_filename
        
        # Save with appropriate settings
        save_kwargs = {}
        
        if output_format in ['jpg', 'jpeg']:
            save_kwargs['quality'] = quality
            save_kwargs['optimize'] = True
        elif output_format == 'webp':
            save_kwargs['quality'] = quality
            save_kwargs['method'] = 6  # Slower but better compression
        elif output_format == 'png':
            save_kwargs['optimize'] = True
        elif output_format == 'gif':
            save_kwargs['optimize'] = True
        
        image.save(str(output_path), format=SUPPORTED_FORMATS[output_format], **save_kwargs)
        
        # Get file info
        original_size = os.path.getsize(input_path)
        converted_size = os.path.getsize(output_path)
        compression_ratio = ((original_size - converted_size) / original_size * 100) if original_size > 0 else 0
        
        metadata = {
            'original_size': original_size,
            'converted_size': converted_size,
            'compression_ratio': round(compression_ratio, 2),
            'dimensions': f"{image.width}x{image.height}",
            'output_format': output_format.upper()
        }
        
        return str(output_path), metadata
        
    except Exception as e:
        raise Exception(f"Conversion failed: {str(e)}")


def get_image_info(file_path: str) -> dict:
    """Get image information"""
    try:
        image = Image.open(file_path)
        return {
            'format': image.format,
            'size': os.path.getsize(file_path),
            'dimensions': f"{image.width}x{image.height}",
            'mode': image.mode
        }
    except Exception as e:
        return {'error': str(e)}
