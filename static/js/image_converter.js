// ═════════════════════════════════════════════════════════════════════════════
// image_converter.js - Image Converter (Format Conversion)
// ═════════════════════════════════════════════════════════════════════════════

let selectedFile = null;
let selectedFormat = null;
let selectedQuality = 95;

const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const fileInfo = document.getElementById('fileInfo');
const rasterFormats = document.getElementById('rasterFormats');
const rawFormats = document.getElementById('rawFormats');
const qualityControl = document.getElementById('qualityControl');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const actionButtons = document.getElementById('actionButtons');
const convertBtn = document.getElementById('convertBtn');
const resetBtn = document.getElementById('resetBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultSection = document.getElementById('resultSection');
const downloadLink = document.getElementById('downloadLink');

// Supported formats
const FORMAT_LIST = {
    raster: ['PNG', 'JPG', 'JPEG', 'BMP', 'GIF', 'TIFF', 'WebP', 'ICO'],
    raw: ['ORF', 'CR2', 'NEF', 'ARW', 'DNG', 'RAW']
};

// Initialize format buttons
function initializeFormats() {
    // Raster formats
    FORMAT_LIST.raster.forEach(format => {
        const btn = document.createElement('button');
        btn.className = 'format-btn';
        btn.textContent = format;
        btn.onclick = () => selectFormat(format.toLowerCase());
        rasterFormats.appendChild(btn);
    });

    // Raw formats
    FORMAT_LIST.raw.forEach(format => {
        const btn = document.createElement('button');
        btn.className = 'format-btn';
        btn.textContent = format;
        btn.onclick = () => selectFormat(format.toLowerCase());
        rawFormats.appendChild(btn);
    });
}

initializeFormats();

// Upload area click handler
uploadArea.addEventListener('click', () => imageInput.click());

// Drag and drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('active');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('active');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('active');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        selectFile(files[0]);
    }
});

// File input change
imageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        selectFile(e.target.files[0]);
    }
});

// Select file
function selectFile(file) {
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/bmp', 'image/gif', 
                        'image/tiff', 'image/webp', 'application/x-icon'];
    
    if (!validTypes.includes(file.type)) {
        // Allow raw formats by extension
        const validExtensions = ['orf', 'cr2', 'nef', 'arw', 'dng', 'raw'];
        const ext = file.name.split('.').pop().toLowerCase();
        if (!validExtensions.includes(ext)) {
            showToast(t('toast_invalid_image'), 'error');
            return;
        }
    }

    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
        showToast(t('toast_file_large'), 'error');
        return;
    }

    selectedFile = file;
    selectedFormat = null;
    
    // Update file info
    document.getElementById('infoFileName').textContent = file.name;
    document.getElementById('infoFileSize').textContent = formatFileSize(file.size);
    document.getElementById('infoFileFormat').textContent = file.type || 'Unknown';
    
    fileInfo.style.display = 'block';
    uploadArea.style.opacity = '0.5';
    
    // Show action buttons
    actionButtons.style.display = 'flex';
    
    // Update quality control visibility
    const ext = file.name.split('.').pop().toLowerCase();
    const lossyFormats = ['jpg', 'jpeg'];
    if (lossyFormats.includes(ext)) {
        qualityControl.style.display = 'block';
    }
}

// Select format
function selectFormat(format) {
    selectedFormat = format;
    
    // Update button states
    document.querySelectorAll('.format-btn').forEach(btn => {
        if (btn.textContent.toLowerCase() === format) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
    
    // Show quality control for lossy formats
    const lossyFormats = ['jpg', 'jpeg'];
    if (lossyFormats.includes(format)) {
        qualityControl.style.display = 'block';
    } else {
        qualityControl.style.display = 'none';
    }
}

// Quality slider change
qualitySlider.addEventListener('input', (e) => {
    selectedQuality = parseInt(e.target.value);
    qualityValue.textContent = selectedQuality + '%';
});

// Convert image
convertBtn.addEventListener('click', async () => {
    if (!selectedFile) {
        showToast(t('toast_no_file'), 'warning');
        return;
    }

    if (!selectedFormat) {
        showToast(t('image_select_format'), 'warning');
        return;
    }

    convertImage();
});

// Reset
resetBtn.addEventListener('click', () => {
    selectedFile = null;
    selectedFormat = null;
    imageInput.value = '';
    fileInfo.style.display = 'none';
    uploadArea.style.opacity = '1';
    actionButtons.style.display = 'none';
    resultSection.style.display = 'none';
    qualityControl.style.display = 'none';
    
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
});

// Convert image function
async function convertImage() {
    loadingIndicator.style.display = 'block';
    convertBtn.disabled = true;
    resetBtn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('target_format', selectedFormat);
        formData.append('quality', selectedQuality);

        const response = await fetch('/api/image/convert', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'Conversion failed');
        }

        // Show result
        displayResult(result);
        showToast(t('image_convert_success'), 'success');

    } catch (error) {
        showToast(error.message || t('toast_error'), 'error');
    } finally {
        loadingIndicator.style.display = 'none';
        convertBtn.disabled = false;
        resetBtn.disabled = false;
    }
}

// Display result
function displayResult(result) {
    const { metadata, download_url, download_filename } = result;
    
    // Update result info
    const resultInfo = document.getElementById('resultInfo');
    resultInfo.innerHTML = `
        <div class="result-item">
            <div class="result-item-label">Định dạng</div>
            <div class="result-item-value">${metadata.output_format}</div>
        </div>
        <div class="result-item">
            <div class="result-item-label">Kích thước</div>
            <div class="result-item-value">${metadata.dimensions}</div>
        </div>
        <div class="result-item">
            <div class="result-item-label">Dung lượng gốc</div>
            <div class="result-item-value">${formatFileSize(metadata.original_size)}</div>
        </div>
        <div class="result-item">
            <div class="result-item-label">Dung lượng sau</div>
            <div class="result-item-value">${formatFileSize(metadata.converted_size)}</div>
        </div>
        <div class="result-item">
            <div class="result-item-label">Nén</div>
            <div class="result-item-value">${metadata.compression_ratio}%</div>
        </div>
    `;
    
    // Update download link
    downloadLink.href = download_url;
    downloadLink.download = download_filename;
    
    resultSection.style.display = 'block';
    
    // Scroll to result
    setTimeout(() => {
        resultSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Listen for language change
document.addEventListener('languageChanged', () => {
    // Update any dynamic text if needed
});
