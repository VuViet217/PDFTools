// ═════════════════════════════════════════════════════════════════════════════
// image_converter.js - Image Converter (Format Conversion) - Multiple Files Support
// ═════════════════════════════════════════════════════════════════════════════

console.log('🎨 image_converter.js LOADING...');

// State
let selectedFiles = [];
let selectedFormat = null;
let selectedQuality = 95;

// Get DOM elements
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const thumbnailsContainer = document.getElementById('thumbnailsContainer');
const thumbnailsGrid = document.getElementById('thumbnailsGrid');
const selectedCount = document.getElementById('selectedCount');
const addMoreBtn = document.getElementById('addMoreBtn');
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

// Verify elements
console.log('✓ Elements loaded:', {
    uploadArea: !!uploadArea,
    imageInput: !!imageInput,
    thumbnailsContainer: !!thumbnailsContainer,
    rasterFormats: !!rasterFormats,
    rawFormats: !!rawFormats
});

// Supported formats
const FORMAT_LIST = {
    raster: ['PNG', 'JPG', 'JPEG', 'BMP', 'GIF', 'TIFF', 'WebP', 'ICO'],
    raw: ['ORF', 'CR2', 'NEF', 'ARW', 'DNG', 'RAW']
};

// Initialize format buttons
function initializeFormats() {
    console.log('📌 Creating format buttons...');
    
    FORMAT_LIST.raster.forEach(format => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'format-btn';
        btn.textContent = format;
        btn.onclick = () => selectFormat(format.toLowerCase());
        rasterFormats.appendChild(btn);
    });

    FORMAT_LIST.raw.forEach(format => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'format-btn';
        btn.textContent = format;
        btn.onclick = () => selectFormat(format.toLowerCase());
        rawFormats.appendChild(btn);
    });
    
    console.log('✓ Format buttons created');
}

initializeFormats();

// Upload area click handler
uploadArea.addEventListener('click', function(e) {
    console.log('📂 Upload area clicked');
    imageInput.click();
});

// Add more button handler
addMoreBtn.addEventListener('click', function(e) {
    console.log('📂 Add more button clicked');
    imageInput.click();
});

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
    console.log('📥 Drop event with', e.dataTransfer.files.length, 'files');
    
    if (e.dataTransfer.files.length > 0) {
        const filesArray = Array.from(e.dataTransfer.files);
        addFiles(filesArray);
    }
});

// File input change
imageInput.addEventListener('change', (e) => {
    console.log('📥 File input changed with', e.target.files.length, 'files');
    if (e.target.files.length > 0) {
        const filesArray = Array.from(e.target.files);
        addFiles(filesArray);
        imageInput.value = '';
    }
});

// Add files to selection
function addFiles(files) {
    console.log('🖼️ addFiles() - Processing', files.length, 'files');
    
    files.forEach(file => {
        console.log('   Checking:', file.name, '|', file.type);
        
        const validTypes = [
            'image/png', 'image/jpeg', 'image/bmp', 'image/gif', 
            'image/tiff', 'image/webp', 'application/x-icon'
        ];
        
        let isValid = validTypes.includes(file.type);
        
        if (!isValid) {
            const validExtensions = ['orf', 'cr2', 'nef', 'arw', 'dng', 'raw'];
            const ext = file.name.split('.').pop().toLowerCase();
            isValid = validExtensions.includes(ext);
            
            if (!isValid) {
                console.warn('❌ Invalid file:', file.name);
                showToast(`${file.name}: ${t('toast_invalid_image')}`, 'error');
                return;
            }
        }

        if (file.size > 100 * 1024 * 1024) {
            console.warn('❌ File too large:', file.name);
            showToast(`${file.name}: ${t('toast_file_large')}`, 'error');
            return;
        }

        const exists = selectedFiles.some(f => f.name === file.name && f.size === file.size);
        if (exists) {
            console.warn('⚠️ File already selected:', file.name);
            showToast(`${file.name}: Đã được chọn rồi`, 'warning');
            return;
        }

        console.log('✅ Adding:', file.name);
        selectedFiles.push(file);
    });

    console.log('📊 Total files:', selectedFiles.length);
    
    if (selectedFiles.length > 0) {
        console.log('🎯 Updating thumbnails...');
        updateThumbnails();
        actionButtons.style.display = 'flex';
        uploadArea.style.opacity = '0.5';
    }
}

// Update thumbnails display
function updateThumbnails() {
    console.log('🎨 updateThumbnails() - Processing', selectedFiles.length, 'files');
    
    selectedCount.textContent = selectedFiles.length;
    thumbnailsGrid.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        console.log(`   [${index}] Reading ${file.name}`);
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            console.log(`   [${index}] Preview ready for ${file.name}`);
            
            const item = document.createElement('div');
            item.className = 'thumbnail-item';
            item.dataset.index = index;
            
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'thumbnail-img';
            img.alt = file.name;
            
            const info = document.createElement('div');
            info.className = 'thumbnail-info';
            info.textContent = file.name.substring(0, 20);
            info.title = file.name;
            
            const overlay = document.createElement('div');
            overlay.className = 'thumbnail-overlay';
            
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'thumbnail-remove-btn';
            removeBtn.textContent = '✕ Xoá';
            removeBtn.onclick = (evt) => {
                evt.stopPropagation();
                removeFile(index);
            };
            
            overlay.appendChild(removeBtn);
            item.appendChild(img);
            item.appendChild(info);
            item.appendChild(overlay);
            
            thumbnailsGrid.appendChild(item);
            console.log(`   [${index}] Added to grid`);
        };
        
        reader.onerror = () => {
            console.error(`❌ FileReader error for ${file.name}`);
        };
        
        reader.readAsDataURL(file);
    });
    
    console.log('📦 Showing thumbnail container...');
    thumbnailsContainer.style.display = 'block';
    console.log('✓ Done');
}

// Remove file from selection
function removeFile(index) {
    console.log('❌ Removing file at', index);
    selectedFiles.splice(index, 1);
    
    if (selectedFiles.length === 0) {
        thumbnailsContainer.style.display = 'none';
        actionButtons.style.display = 'none';
        uploadArea.style.opacity = '1';
        resultSection.style.display = 'none';
    } else {
        updateThumbnails();
    }
}

// Select format
function selectFormat(format) {
    console.log('🎯 Format:', format);
    selectedFormat = format;
    
    document.querySelectorAll('.format-btn').forEach(btn => {
        if (btn.textContent.toLowerCase() === format) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
    
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

// Convert button
convertBtn.addEventListener('click', async () => {
    console.log('🚀 Convert clicked');
    
    if (selectedFiles.length === 0) {
        showToast(t('toast_no_file'), 'warning');
        return;
    }

    if (!selectedFormat) {
        showToast(t('image_select_format'), 'warning');
        return;
    }

    convertAllImages();
});

// Reset button
resetBtn.addEventListener('click', () => {
    console.log('🔄 Reset clicked');
    selectedFiles = [];
    selectedFormat = null;
    imageInput.value = '';
    thumbnailsContainer.style.display = 'none';
    uploadArea.style.opacity = '1';
    actionButtons.style.display = 'none';
    resultSection.style.display = 'none';
    qualityControl.style.display = 'none';
    
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    thumbnailsGrid.innerHTML = '';
});

// Convert all images
async function convertAllImages() {
    console.log('🎬 Batch conversion start:', selectedFiles.length, 'files');
    loadingIndicator.style.display = 'block';
    convertBtn.disabled = true;
    resetBtn.disabled = true;
    
    const results = [];
    const totalFiles = selectedFiles.length;
    
    try {
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            
            loadingIndicator.querySelector('p').textContent = 
                `Đang xử lý... (${i + 1}/${totalFiles})`;
            console.log(`[${i + 1}/${totalFiles}]`, file.name);
            
            try {
                const result = await convertSingleImage(file);
                results.push({ filename: file.name, success: true, ...result });
            } catch (error) {
                console.error(`❌`, file.name, error);
                results.push({ filename: file.name, success: false, error: error.message });
            }
        }
        
        displayBatchResults(results);
        const ok = results.filter(r => r.success).length;
        showToast(`${ok}/${totalFiles} ảnh thành công!`, 'success');
        
    } catch (error) {
        console.error('❌ Batch error:', error);
        showToast(error.message || t('toast_error'), 'error');
    } finally {
        loadingIndicator.style.display = 'none';
        convertBtn.disabled = false;
        resetBtn.disabled = false;
    }
}

// Convert single image
async function convertSingleImage(file) {
    const formData = new FormData();
    formData.append('file', file);
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

    return result;
}

// Display batch results
function displayBatchResults(results) {
    console.log('📊 Showing results');
    
    const resultInfo = document.getElementById('resultInfo');
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    let html = `
        <div class="result-item">
            <div class="result-item-label">Tổng số</div>
            <div class="result-item-value">${results.length}</div>
        </div>
        <div class="result-item">
            <div class="result-item-label">Thành công</div>
            <div class="result-item-value" style="color: #34a853;">✓ ${successCount}</div>
        </div>
    `;
    
    if (failCount > 0) {
        html += `
            <div class="result-item">
                <div class="result-item-label">Thất bại</div>
                <div class="result-item-value" style="color: #ea4335;">✗ ${failCount}</div>
            </div>
        `;
    }
    
    resultInfo.innerHTML = html;
    
    const downloadSection = document.createElement('div');
    downloadSection.style.marginTop = '15px';
    downloadSection.innerHTML = '<div style="font-size: 12px; font-weight: 600; color: #5f6368; margin-bottom: 10px;">Tải xuống:</div>';
    
    const downloadList = document.createElement('div');
    downloadList.style.display = 'flex';
    downloadList.style.flexWrap = 'wrap';
    downloadList.style.gap = '8px';
    
    results.forEach(result => {
        if (result.success) {
            const link = document.createElement('a');
            link.href = result.download_url;
            link.download = result.download_filename;
            link.className = 'download-btn';
            link.style.fontSize = '12px';
            link.style.padding = '8px 16px';
            link.textContent = `⬇ ${result.download_filename}`;
            downloadList.appendChild(link);
        }
    });
    
    if (downloadList.children.length > 0) {
        downloadSection.appendChild(downloadList);
        resultInfo.parentElement.appendChild(downloadSection);
    }
    
    resultSection.style.display = 'block';
    
    setTimeout(() => {
        resultSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

console.log('✅ image_converter.js LOADED!');

