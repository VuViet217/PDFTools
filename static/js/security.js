// ═════════════════════════════════════════════════════════════════════════════
// security.js - Khóa và Mở khóa PDF
// ═════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// TAB SWITCHING
// ════════════════════════════════════════════════════════════════════════════

document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const tabName = btn.getAttribute("data-tab");
        
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
        
        btn.classList.add("active");
        document.getElementById(tabName).classList.add("active");
    });
});

// ════════════════════════════════════════════════════════════════════════════
// PROTECT FUNCTIONALITY (KHÓA PDF)
// ════════════════════════════════════════════════════════════════════════════

let protectFile = null;
const protectUploadArea = document.getElementById("protectUploadArea");
const protectFileInput = document.getElementById("protectFileInput");
const protectFileInfo = document.getElementById("protectFileInfo");
const protectFileName = document.getElementById("protectFileName");
const protectBtn = document.getElementById("protectBtn");
const protectResult = document.getElementById("protectResult");
const protectDownloadBtn = document.getElementById("protectDownloadBtn");
const protectPassword = document.getElementById("protectPassword");

protectUploadArea.addEventListener("click", () => protectFileInput.click());
protectUploadArea.addEventListener("dragover", (e) => { e.preventDefault(); protectUploadArea.classList.add("dragover"); });
protectUploadArea.addEventListener("dragleave", () => protectUploadArea.classList.remove("dragover"));
protectUploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    protectUploadArea.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) handleProtectFile(e.dataTransfer.files[0]);
});
protectFileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) handleProtectFile(e.target.files[0]);
});

function handleProtectFile(file) {
    if (file.type !== "application/pdf") {
        showToast(t("toast_error") || "Chỉ hỗ trợ PDF", "error");
        return;
    }
    if (file.size > 100 * 1024 * 1024) {
        showToast(t("toast_file_large") || "File quá lớn", "error");
        return;
    }
    protectFile = file;
    protectFileName.textContent = file.name;
    protectFileInfo.style.display = "block";
    protectResult.style.display = "none";
}

protectBtn.addEventListener("click", async () => {
    if (!protectFile) {
        showToast(t("toast_no_file") || "Vui lòng chọn file PDF", "error");
        return;
    }
    const password = protectPassword.value;
    if (!password) {
        showToast("Vui lòng nhập mật khẩu!", "warning");
        return;
    }
    
    const formData = new FormData();
    formData.append("file", protectFile);
    formData.append("password", password);
    
    const originalText = protectBtn.textContent;
    protectBtn.textContent = t("processing") || "Đang xử lý...";
    protectBtn.disabled = true;
    
    try {
        const response = await fetch("/api/protect", { method: "POST", body: formData });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || t("toast_error"));
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        protectDownloadBtn.href = url;
        protectDownloadBtn.download = `protected_${protectFile.name}`;
        protectResult.style.display = "block";
        showToast("Đã khóa PDF thành công!", "success");
        
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        protectBtn.textContent = originalText;
        protectBtn.disabled = false;
    }
});

// ════════════════════════════════════════════════════════════════════════════
// UNLOCK FUNCTIONALITY (GỠ KHÓA PDF)
// ════════════════════════════════════════════════════════════════════════════

let unlockFile = null;
const unlockUploadArea = document.getElementById("unlockUploadArea");
const unlockFileInput = document.getElementById("unlockFileInput");
const unlockFileInfo = document.getElementById("unlockFileInfo");
const unlockFileName = document.getElementById("unlockFileName");
const unlockBtn = document.getElementById("unlockBtn");
const unlockResult = document.getElementById("unlockResult");
const unlockDownloadBtn = document.getElementById("unlockDownloadBtn");
const unlockPassword = document.getElementById("unlockPassword");

unlockUploadArea.addEventListener("click", () => unlockFileInput.click());
unlockUploadArea.addEventListener("dragover", (e) => { e.preventDefault(); unlockUploadArea.classList.add("dragover"); });
unlockUploadArea.addEventListener("dragleave", () => unlockUploadArea.classList.remove("dragover"));
unlockUploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    unlockUploadArea.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) handleUnlockFile(e.dataTransfer.files[0]);
});
unlockFileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) handleUnlockFile(e.target.files[0]);
});

function handleUnlockFile(file) {
    if (file.type !== "application/pdf") {
        showToast(t("toast_error") || "Chỉ hỗ trợ PDF", "error");
        return;
    }
    if (file.size > 100 * 1024 * 1024) {
        showToast(t("toast_file_large") || "File quá lớn", "error");
        return;
    }
    unlockFile = file;
    unlockFileName.textContent = file.name;
    unlockFileInfo.style.display = "block";
    unlockResult.style.display = "none";
}

unlockBtn.addEventListener("click", async () => {
    if (!unlockFile) {
        showToast(t("toast_no_file") || "Vui lòng chọn file PDF bị khóa", "error");
        return;
    }
    const password = unlockPassword.value;
    if (!password) {
        showToast("Vui lòng nhập mật khẩu hiện tại của file!", "warning");
        return;
    }
    
    const formData = new FormData();
    formData.append("file", unlockFile);
    formData.append("password", password);
    
    const originalText = unlockBtn.textContent;
    unlockBtn.textContent = t("processing") || "Đang xử lý...";
    unlockBtn.disabled = true;
    
    try {
        const response = await fetch("/api/unlock", { method: "POST", body: formData });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || t("toast_error"));
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        unlockDownloadBtn.href = url;
        unlockDownloadBtn.download = `unlocked_${unlockFile.name}`;
        unlockResult.style.display = "block";
        showToast("Đã mở khóa PDF thành công!", "success");
        
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        unlockBtn.textContent = originalText;
        unlockBtn.disabled = false;
    }
});