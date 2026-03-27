// ═════════════════════════════════════════════════════════════════════════════
// split_merge.js - Tách & Nối PDF
// ═════════════════════════════════════════════════════════════════════════════

// State
let splitFile = null;
let mergeFiles = [];
let splitBlob = null;
let mergeBlob = null;

// ════════════════════════════════════════════════════════════════════════════
// TAB SWITCHING
// ════════════════════════════════════════════════════════════════════════════

document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const tabName = btn.getAttribute("data-tab");
        
        // Remove active from all
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
        
        // Add active
        btn.classList.add("active");
        document.getElementById(tabName).classList.add("active");
    });
});

// ════════════════════════════════════════════════════════════════════════════
// SPLIT FUNCTIONALITY
// ════════════════════════════════════════════════════════════════════════════

const splitUploadArea = document.getElementById("splitUploadArea");
const splitFileInput = document.getElementById("splitFileInput");
const splitFileInfo = document.getElementById("splitFileInfo");
const splitFileName = document.getElementById("splitFileName");
const splitPageCount = document.getElementById("splitPageCount");
const splitPagesInput = document.getElementById("splitPagesInput");
const splitBtn = document.getElementById("splitBtn");
const splitResult = document.getElementById("splitResult");
const splitDownloadBtn = document.getElementById("splitDownloadBtn");

// Drag & drop for split
splitUploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    splitUploadArea.classList.add("dragover");
});

splitUploadArea.addEventListener("dragleave", () => {
    splitUploadArea.classList.remove("dragover");
});

splitUploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    splitUploadArea.classList.remove("dragover");
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleSplitFile(files[0]);
    }
});

splitUploadArea.addEventListener("click", () => {
    splitFileInput.click();
});

splitFileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
        handleSplitFile(e.target.files[0]);
    }
});

function handleSplitFile(file) {
    if (file.type !== "application/pdf") {
        showToast(t("toast_error") || "Lỗi định dạng", "error");
        return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
        showToast(t("toast_file_large") || "File quá lớn", "error");
        return;
    }
    
    splitFile = file;
    splitFileName.textContent = file.name;
    splitPageCount.textContent = "..."; // Reset text
    splitFileInfo.style.display = "block";
    splitResult.style.display = "none";
    
    // Request server for accurate PDF Page Count
    const formData = new FormData();
    formData.append("file", file);
    
    fetch("/api/info", {
        method: "POST",
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.total_pages) {
            splitPageCount.textContent = data.total_pages;
        } else {
            splitPageCount.textContent = "Không xác định";
        }
    })
    .catch(err => {
        splitPageCount.textContent = "Lỗi đọc trang";
    });
}

splitBtn.addEventListener("click", async () => {
    if (!splitFile) {
        showToast(t("toast_no_file"), "error");
        return;
    }
    
    const pageInput = splitPagesInput.value;
    
    // Create form data
    const formData = new FormData();
    formData.append("file", splitFile);
    formData.append("pages", pageInput);
    
    // Show loading
    const originalText = splitBtn.textContent;
    splitBtn.textContent = t("processing");
    splitBtn.disabled = true;
    
    try {
        const response = await fetch("/api/split", {
            method: "POST",
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || t("toast_error"));
        }
        
        splitBlob = await response.blob();
        splitResult.style.display = "block";
        
        // Setup download
        const url = URL.createObjectURL(splitBlob);
        splitDownloadBtn.href = url;
        splitDownloadBtn.download = `split_${Date.now()}.zip`;
        
        showToast(t("toast_process_ok"), "success");
    } catch (err) {
        showToast(err.message || t("toast_error"), "error");
    } finally {
        splitBtn.textContent = originalText;
        splitBtn.disabled = false;
    }
});

// ════════════════════════════════════════════════════════════════════════════
// MERGE FUNCTIONALITY
// ════════════════════════════════════════════════════════════════════════════

const mergeAddBtn = document.getElementById("mergeAddBtn");
const mergeFileInput = document.getElementById("mergeFileInput");
const mergeFileList = document.getElementById("mergeFileList");
const mergeBtn = document.getElementById("mergeBtn");
const mergeResult = document.getElementById("mergeResult");
const mergeDownloadBtn = document.getElementById("mergeDownloadBtn");

mergeAddBtn.addEventListener("click", () => {
    mergeFileInput.click();
});

mergeFileInput.addEventListener("change", (e) => {
    const files = e.target.files;
    for (let file of files) {
        if (file.type === "application/pdf" && file.size <= 50 * 1024 * 1024) {
            mergeFiles.push(file);
        }
    }
    
    if (mergeFiles.length === 0) {
        showToast(t("toast_no_file"), "error");
    } else {
        showToast(t("toast_upload_ok"), "success");
    }
    
    renderMergeList();
});

function renderMergeList() {
    mergeFileList.innerHTML = "";
    
    if (mergeFiles.length === 0) {
        mergeFileList.innerHTML = `<p data-i18n="file_list_label" style="color: #999; text-align: center;">Danh sách file</p>`;
        applyLang(); // Re-apply translations
        return;
    }
    
    mergeFiles.forEach((file, idx) => {
        const item = document.createElement("div");
        item.className = "merge-file-item";
        item.draggable = true;
        item.innerHTML = `
            <span>${idx + 1}. ${file.name}</span>
            <button class="btn btn-small btn-danger" data-i18n="btn_remove">Xoá</button>
        `;
        
        // Drag start
        item.addEventListener("dragstart", (e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", idx);
        });
        
        // Drag over
        item.addEventListener("dragover", (e) => {
            e.preventDefault();
            item.classList.add("dragover");
        });
        
        item.addEventListener("dragleave", () => {
            item.classList.remove("dragover");
        });
        
        // Drop
        item.addEventListener("drop", (e) => {
            e.preventDefault();
            item.classList.remove("dragover");
            const fromIdx = parseInt(e.dataTransfer.getData("text/plain"));
            if (fromIdx !== idx) {
                // Swap
                [mergeFiles[fromIdx], mergeFiles[idx]] = [mergeFiles[idx], mergeFiles[fromIdx]];
                renderMergeList();
            }
        });
        
        // Remove button
        item.querySelector(".btn-danger").addEventListener("click", () => {
            mergeFiles.splice(idx, 1);
            renderMergeList();
        });
        
        mergeFileList.appendChild(item);
    });
    
    applyLang(); // Re-apply translations
}

mergeBtn.addEventListener("click", async () => {
    if (mergeFiles.length === 0) {
        showToast(t("toast_no_file"), "error");
        return;
    }
    
    const formData = new FormData();
    mergeFiles.forEach(file => {
        formData.append("files", file);
    });
    
    // Show loading
    const originalText = mergeBtn.textContent;
    mergeBtn.textContent = t("processing");
    mergeBtn.disabled = true;
    
    try {
        const response = await fetch("/api/merge", {
            method: "POST",
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || t("toast_error"));
        }
        
        mergeBlob = await response.blob();
        mergeResult.style.display = "block";
        
        // Setup download
        const url = URL.createObjectURL(mergeBlob);
        mergeDownloadBtn.href = url;
        mergeDownloadBtn.download = `merged_${Date.now()}.pdf`;
        
        showToast(t("toast_process_ok"), "success");
    } catch (err) {
        showToast(err.message || t("toast_error"), "error");
    } finally {
        mergeBtn.textContent = originalText;
        mergeBtn.disabled = false;
    }
});

// Listen for language changes to update UI
document.addEventListener("languageChanged", () => {
    renderMergeList();
});
