// ═════════════════════════════════════════════════════════════════════════════
// compress.js - Nén giảm dung lượng PDF
// ═════════════════════════════════════════════════════════════════════════════

const uploadArea = document.getElementById("compressUploadArea");
const fileInput = document.getElementById("compressFileInput");
const fileInfo = document.getElementById("compressFileInfo");
const fileName = document.getElementById("compressFileName");
const originalSize = document.getElementById("compressOriginalSize");
const newSizeWrapper = document.getElementById("compressNewSizeWrapper");
const newSize = document.getElementById("compressNewSize");
const compressBtn = document.getElementById("compressBtn");
const resultArea = document.getElementById("compressResult");
const downloadBtn = document.getElementById("compressDownloadBtn");

let selectedFile = null;

// Hàm hỗ trợ format kích thước file (Bytes -> KB, MB)
function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// ════════════════════════════════════════════════════════════════════════════
// UPLOAD HANDLING
// ════════════════════════════════════════════════════════════════════════════

uploadArea.addEventListener("click", () => fileInput.click());

uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
});

uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    if (file.type !== "application/pdf") {
        showToast(t("toast_error") || "Chỉ hỗ trợ PDF", "error");
        return;
    }
    // Nới rộng giới hạn file nén lên tới 100MB cho thoải mái
    if (file.size > 100 * 1024 * 1024) {
        showToast(t("toast_file_large") || "File quá lớn (Tối đa 100MB)", "error");
        return;
    }
    
    selectedFile = file;
    fileName.textContent = file.name;
    originalSize.textContent = formatBytes(file.size);
    newSizeWrapper.style.display = "none";
    
    fileInfo.style.display = "block";
    resultArea.style.display = "none";
    compressBtn.disabled = false;
    showToast(t("toast_upload_ok") || "Đã chọn file", "info");
}

// ════════════════════════════════════════════════════════════════════════════
// GỬI LỆNH NÉN LÊN SERVER
// ════════════════════════════════════════════════════════════════════════════

compressBtn.addEventListener("click", async () => {
    if (!selectedFile) return;
    
    const originalText = compressBtn.textContent;
    compressBtn.textContent = t("processing") || "Đang xử lý...";
    compressBtn.disabled = true;
    
    const formData = new FormData();
    formData.append("file", selectedFile);
    
    try {
        const response = await fetch("/api/compress", {
            method: "POST",
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || t("toast_error"));
        }
        
        // Nhận file và đọc thông số nén từ Headers do Server gửi về
        const origSizeStr = response.headers.get("X-Original-Size");
        const compSizeStr = response.headers.get("X-New-Size");
        
        if (origSizeStr && compSizeStr) {
            const origSize = parseInt(origSizeStr);
            const compSize = parseInt(compSizeStr);
            
            // Tính phần trăm dung lượng giảm được
            const percent = Math.round((origSize - compSize) / origSize * 100);
            
            newSize.textContent = formatBytes(compSize) + ` (Giảm ${percent > 0 ? percent : 0}%)`;
            newSizeWrapper.style.display = "block";
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        downloadBtn.href = url;
        downloadBtn.download = `compressed_${selectedFile.name}`;
        
        resultArea.style.display = "block";
        showToast(t("toast_compress_ok") || "Nén thành công", "success");
        
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        compressBtn.textContent = originalText;
        compressBtn.disabled = false;
    }
});