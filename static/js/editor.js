// ═════════════════════════════════════════════════════════════════════════════
// editor.js - Chỉnh sửa PDF (xoay, xoá, sắp xếp, chèn)
// ═════════════════════════════════════════════════════════════════════════════

// State
let sessionId = null;
let totalPages = 0;
let thumbnails = [];
let operations = [];
let selectedPages = new Set();
let pageOrder = []; // Quản lý thứ tự thực tế đang hiển thị trên UI
let pageRotations = {}; // Lưu độ xoay hiện tại của từng trang { 1: 90, 2: 180... }

const editorUploadArea = document.getElementById("editorUploadArea");
const editorFileInput = document.getElementById("editorFileInput");
const editorMain = document.getElementById("editorMain");
const editorThumbnails = document.getElementById("editorThumbnails");
const selectAllBtn = document.getElementById("selectAllBtn");
const deselectAllBtn = document.getElementById("deselectAllBtn");
const rotateBtn = document.getElementById("rotateBtn");
const deleteBlankBtn = document.getElementById("deleteBlankBtn");
const reverseBtn = document.getElementById("reverseBtn");
const bulkDeleteBtn = document.getElementById("bulkDeleteBtn");
const exportBtn = document.getElementById("exportBtn");
const insertPdfBtn = document.getElementById("insertPdfBtn");
const insertFileInput = document.getElementById("insertFileInput");

// Preview Modal Setup
const previewModal = document.getElementById("previewModal");
const closeModalBtn = document.querySelector(".modal-close");
const previewImage = document.getElementById("previewImage");
const previewContainer = document.getElementById("previewContainer");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const zoomResetBtn = document.getElementById("zoomResetBtn");
const zoomLevelText = document.getElementById("zoomLevel");

let currentZoom = 1; // 1 = 100%
let baseHeight = 0; // Chiều cao gốc (khi màn hình chưa zoom)
let isDragging = false;
let startX, startY, scrollLeft, scrollTop;

// Reset zoom when opening modal
function resetZoom() {
    currentZoom = 1;
    // Base height là 85% chiều cao cửa sổ
    baseHeight = window.innerHeight * 0.85;
    updateZoom();
    // Reset scroll to top
    if (previewContainer) {
        previewContainer.scrollTop = 0;
        previewContainer.scrollLeft = 0;
    }
}

function updateZoom() {
    if (previewImage) {
        // Thay vì dùng transform: scale(), thay đổi height trực tiếp
        // Điều này giúp trình duyệt sinh ra thanh cuộn (scrollbars) và kéo chuẩn
        previewImage.style.height = `${baseHeight * currentZoom}px`;
        previewImage.style.width = 'auto'; // Width tuỳ chỉnh theo height (tỉ lệ PDF)

        zoomLevelText.textContent = `${Math.round(currentZoom * 100)}%`;
    }
}

if (zoomInBtn) {
    zoomInBtn.onclick = function (e) {
        e.stopPropagation();
        if (currentZoom < 4) { // Max 400%
            currentZoom += 0.25;
            updateZoom();
        }
    }
}

if (zoomOutBtn) {
    zoomOutBtn.onclick = function (e) {
        e.stopPropagation();
        if (currentZoom > 0.5) { // Min 50%
            currentZoom -= 0.25;
            updateZoom();
        }
    }
}

if (zoomResetBtn) {
    zoomResetBtn.onclick = function (e) {
        e.stopPropagation();
        resetZoom();
    }
}

// Mouse wheel to zoom
if (previewContainer) {
    previewContainer.addEventListener('wheel', function (e) {
        if (e.ctrlKey || e.metaKey) { // Only zoom if holding Ctrl/Cmd
            e.preventDefault();
            const prevZoom = currentZoom;
            if (e.deltaY < 0 && currentZoom < 4) {
                currentZoom += 0.25;
            } else if (e.deltaY > 0 && currentZoom > 0.5) {
                currentZoom -= 0.25;
            }
            if (prevZoom !== currentZoom) {
                updateZoom();
            }
        }
    }, { passive: false });

    // Drag to pan image
    previewContainer.addEventListener('mousedown', (e) => {
        // Prevent drag if clicking on buttons or not dragging the image
        if (e.target.tagName.toLowerCase() === 'button') return;

        isDragging = true;
        // Bắt đầu từ tọa độ nào trên Container
        startX = e.pageX - previewContainer.offsetLeft;
        startY = e.pageY - previewContainer.offsetTop;

        // Vị trí con lăn hiện tại
        scrollLeft = previewContainer.scrollLeft;
        scrollTop = previewContainer.scrollTop;

        previewContainer.style.cursor = "grabbing"; // thay đổi con trỏ
    });

    previewContainer.addEventListener('mouseleave', () => {
        isDragging = false;
        previewContainer.style.cursor = "grab";
    });

    previewContainer.addEventListener('mouseup', () => {
        isDragging = false;
        previewContainer.style.cursor = "grab";
    });

    previewContainer.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();

        const x = e.pageX - previewContainer.offsetLeft;
        const y = e.pageY - previewContainer.offsetTop;

        // Quãng đường chuột đi được
        const walkX = (x - startX);
        const walkY = (y - startY);

        // Tính toán vị trí lăn mới
        previewContainer.scrollLeft = scrollLeft - walkX;
        previewContainer.scrollTop = scrollTop - walkY;
    });
}

if (closeModalBtn) {
    closeModalBtn.onclick = function () {
        previewModal.style.display = "none";
        resetZoom();
    }
}

if (previewModal) {
    previewModal.onclick = function (e) {
        if (e.target === previewModal || e.target === previewContainer) {
            previewModal.style.display = "none";
            resetZoom();
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
// UPLOAD
// ════════════════════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
    // Re-query elements just to be safe they exist in DOM
    const area = document.getElementById("editorUploadArea");
    const input = document.getElementById("editorFileInput");

    if (area) {
        area.addEventListener("click", (e) => {
            // Không trigger click nếu click thẳng vào input (tránh lặp vô hạn)
            if (e.target.id === "editorFileInput") return;
            if (input) input.click();
        });

        area.addEventListener("dragover", (e) => {
            e.preventDefault();
            area.classList.add("dragover");
        });

        area.addEventListener("dragleave", () => {
            area.classList.remove("dragover");
        });

        area.addEventListener("drop", (e) => {
            e.preventDefault();
            area.classList.remove("dragover");
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleEditorUpload(e.dataTransfer.files[0]);
            }
        });
    }

    if (input) {
        input.addEventListener("change", (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleEditorUpload(e.target.files[0]);
                e.target.value = ''; // Reset input để có thể up lại cùng file nếu cần
            }
        });
    }
});

async function handleEditorUpload(file) {
    if (file.type !== "application/pdf") {
        showToast(t("toast_error") || "Chỉ hỗ trợ file PDF", "error");
        return;
    }

    if (file.size > 50 * 1024 * 1024) {
        showToast(t("toast_file_large") || "File quá lớn", "error");
        return;
    }
    
    if (sessionId) {
        triggerCleanup(); // Xóa rác cũ ngay
    }
    
    // An toàn: không xoá thẻ <input>, chỉ lấy thẻ <p> để update Text
    const editorUploadArea = document.getElementById("editorUploadArea");
    const textElem = editorUploadArea.querySelector("p");
    const oldText = textElem ? textElem.textContent : "Upload PDF để bắt đầu chỉnh sửa";
    if (textElem) textElem.textContent = t("processing") || "Đang xử lý...";

    editorUploadArea.style.opacity = "0.7";
    editorUploadArea.style.pointerEvents = "none";

    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/editor/upload", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || t("toast_error"));
        }

        const result = await response.json();

        sessionId = result.session_id;
        totalPages = result.total_pages;
        thumbnails = result.thumbnails;
        operations = [];
        selectedPages.clear();
        pageRotations = {};

        // Khởi tạo thứ tự trang ban đầu
        pageOrder = Array.from({ length: totalPages }, (_, i) => i + 1);

        showToast(t("toast_upload_ok") || "Tải lên thành công", "success");

        // Hiện khung Editor
        editorUploadArea.style.display = "none";
        editorMain.style.display = "block";

        renderThumbnails();
    } catch (err) {
        showToast(err.message || t("toast_error"), "error");
    } finally {
        // Phục hồi lại nút upload nếu có lỗi hoặc khi ẩn/hiện lại
        if (textElem) textElem.textContent = oldText;
        editorUploadArea.style.opacity = "1";
        editorUploadArea.style.pointerEvents = "auto";
    }
}

async function handleInsertPdf(file) {
    if (!sessionId) return;
    
    if (file.type !== "application/pdf") {
        showToast(t("toast_error") || "Chỉ hỗ trợ file PDF", "error");
        return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
        showToast(t("toast_file_large") || "File quá lớn", "error");
        return;
    }

    showToast(t("processing") || "Đang xử lý...", "info");
    
    try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("session_id", sessionId); // Gửi id báo cho Server biết gộp vào phiên nào
        
        const response = await fetch("/api/editor/insert", {
            method: "POST",
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || t("toast_error"));
        }
        
        const result = await response.json();
        
        // Cập nhật State nội bộ
        const oldTotal = totalPages;
        totalPages = result.total_pages; // Tổng số trang mới
        
        // Thêm hình thu nhỏ mới nối tiếp vào cuối danh sách
        thumbnails = thumbnails.concat(result.new_thumbnails);
        
        // Thêm các số trang mới vào pageOrder để hiển thị
        for (let i = oldTotal + 1; i <= totalPages; i++) {
            pageOrder.push(i);
        }
        
        showToast(t("toast_process_ok") || "Chèn PDF thành công", "success");
        
        // Vẽ lại grid hiển thị toàn bộ trang
        renderThumbnails();
    } catch (err) {
        showToast(err.message || t("toast_error"), "error");
    }
}

// ════════════════════════════════════════════════════════════════════════════
// THUMBNAIL RENDERING
// ════════════════════════════════════════════════════════════════════════════

function renderThumbnails() {
    editorThumbnails.innerHTML = "";

    pageOrder.forEach((pageNumber, index) => {
        const i = pageNumber - 1; // index gốc của thumbnail (0-based)

        const container = document.createElement("div");
        container.className = "thumbnail-container";
        container.draggable = true;
        container.dataset.page = pageNumber;

        if (selectedPages.has(pageNumber)) {
            container.classList.add("selected");
        }

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "thumbnail-checkbox";
        checkbox.checked = selectedPages.has(pageNumber);
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                selectedPages.add(pageNumber);
                container.classList.add("selected");
            } else {
                selectedPages.delete(pageNumber);
                container.classList.remove("selected");
            }
        });

        const label = document.createElement("label");
        label.className = "page-number";
        label.textContent = (index + 1); // Hiện số thứ tự mới

        // Render thumbnail image
        const thumbnail = document.createElement("div");
        thumbnail.className = "thumbnail-placeholder";

        let thumbUrl = "";
        let previewUrl = "";
        if (typeof thumbnails[i] === 'object') {
            thumbUrl = thumbnails[i].thumb;
            previewUrl = thumbnails[i].preview;
        } else {
            // Backward compatibility
            thumbUrl = thumbnails[i];
            previewUrl = thumbnails[i];
        }

        const img = document.createElement("img");
        if (thumbUrl && thumbUrl.startsWith("data:")) {
            img.src = thumbUrl;
        } else if (thumbUrl) {
            img.src = thumbUrl;
            img.onerror = () => {
                thumbnail.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; height:100%; background:#f5f5f5; color:#999;">PDF Page</div>`;
            };
        }

        img.alt = `Page ${pageNumber}`;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "contain";
        img.style.transition = "transform 0.3s ease";

        // Apply current rotation if any
        if (pageRotations[pageNumber]) {
            img.style.transform = `rotate(${pageRotations[pageNumber]}deg)`;
        }

        thumbnail.appendChild(img);

        const actions = document.createElement("div");
        actions.className = "thumbnail-actions";

        const previewActionBtn = document.createElement("button");
        previewActionBtn.className = "btn btn-small";
        previewActionBtn.title = t("btn_preview") || "Xem lớn";
        previewActionBtn.textContent = "🔍";
        previewActionBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const modal = document.getElementById("previewModal");
            const modalImg = document.getElementById("previewImage");
            const captionText = document.getElementById("previewCaption");

            modal.style.display = "flex";
            modalImg.src = previewUrl;

            // Apply current rotation to preview
            if (pageRotations[pageNumber]) {
                modalImg.style.transform = `rotate(${pageRotations[pageNumber]}deg) scale(${currentZoom})`;
            } else {
                modalImg.style.transform = `scale(${currentZoom})`;
            }

            captionText.innerHTML = t("page_label") + " " + (index + 1);
            resetZoom();
        });

        const rotateActionBtn = document.createElement("button");
        rotateActionBtn.className = "btn btn-small";
        rotateActionBtn.title = t("btn_rotate");
        rotateActionBtn.textContent = "↻";
        rotateActionBtn.addEventListener("click", () => {
            addOperation({ type: "rotate", page: pageNumber, angle: 90 });
            // Cập nhật giao diện lập tức
            pageRotations[pageNumber] = (pageRotations[pageNumber] || 0) + 90;
            img.style.transform = `rotate(${pageRotations[pageNumber]}deg)`;
        });

        const deleteActionBtn = document.createElement("button");
        deleteActionBtn.className = "btn btn-small btn-danger";
        deleteActionBtn.title = t("btn_delete_page");
        deleteActionBtn.textContent = "🗑";
        deleteActionBtn.addEventListener("click", () => {
            if (confirm(t("confirm_delete"))) {
                addOperation({ type: "delete", page: pageNumber });
                // Cập nhật giao diện lập tức
                pageOrder = pageOrder.filter(p => p !== pageNumber);
                selectedPages.delete(pageNumber);
                renderThumbnails();
            }
        });

        actions.appendChild(previewActionBtn);
        actions.appendChild(rotateActionBtn);
        actions.appendChild(deleteActionBtn);

        container.appendChild(checkbox);
        container.appendChild(label);
        container.appendChild(thumbnail);
        container.appendChild(actions);

        // Drag to reorder logic
        container.addEventListener("dragstart", (e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("pageId", pageNumber);
            setTimeout(() => container.style.opacity = "0.4", 0);
        });

        container.addEventListener("dragend", () => {
            container.style.opacity = "1";
        });

        container.addEventListener("dragover", (e) => {
            e.preventDefault();
            container.classList.add("dragover");
        });

        container.addEventListener("dragleave", () => {
            container.classList.remove("dragover");
        });

        container.addEventListener("drop", (e) => {
            e.preventDefault();
            container.classList.remove("dragover");

            const draggedPageId = parseInt(e.dataTransfer.getData("pageId"));
            const targetPageId = pageNumber;

            if (draggedPageId !== targetPageId) {
                // Đổi vị trí trong mảng pageOrder
                const fromIndex = pageOrder.indexOf(draggedPageId);
                const toIndex = pageOrder.indexOf(targetPageId);

                // Remove from old position
                pageOrder.splice(fromIndex, 1);
                // Insert at new position
                pageOrder.splice(toIndex, 0, draggedPageId);

                // Ghi lại operation reorder
                addOperation({ type: "reorder", new_order: [...pageOrder] });

                // Render lại để đánh số lại và đổi vị trí grid
                renderThumbnails();
            }
        });

        editorThumbnails.appendChild(container);
    });
}

// ════════════════════════════════════════════════════════════════════════════
// OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

function addOperation(op) {
    operations.push(op);
}

// ════════════════════════════════════════════════════════════════════════════
// CLEANUP SESSION WHEN LEAVING PAGE OR UPLOADING NEW FILE
// ════════════════════════════════════════════════════════════════════════════
function triggerCleanup() {
    if (sessionId) {
        // Gửi lệnh xóa rác nhẹ nhàng không cần đợi phản hồi
        navigator.sendBeacon(`/api/editor/cleanup?session_id=${sessionId}`);
        sessionId = null;
    }
}

// Khi người dùng đóng tab hoặc chuyển sang trang khác
window.addEventListener("beforeunload", triggerCleanup);

document.addEventListener("DOMContentLoaded", () => {
    // Buttons
    const btnSelectAll = document.getElementById("selectAllBtn");
    const btnDeselectAll = document.getElementById("deselectAllBtn");
    const btnRotate = document.getElementById("rotateBtn");
    const btnReverse = document.getElementById("reverseBtn");
    const btnBulkDelete = document.getElementById("bulkDeleteBtn");
    const btnDeleteBlank = document.getElementById("deleteBlankBtn");
    const btnExport = document.getElementById("exportBtn");
    const btnInsertPdf = document.getElementById("insertPdfBtn");

    if (btnInsertPdf) {
        btnInsertPdf.addEventListener("click", () => {
            if (insertFileInput) insertFileInput.click();
        });
    }

    if (insertFileInput) {
        insertFileInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleInsertPdf(e.target.files[0]);
                e.target.value = ''; // Reset
            }
        });
    }

    if (btnSelectAll) btnSelectAll.addEventListener("click", () => {
        selectedPages.clear();
        pageOrder.forEach(p => selectedPages.add(p));
        renderThumbnails();
    });

    if (btnDeselectAll) btnDeselectAll.addEventListener("click", () => {
        selectedPages.clear();
        renderThumbnails();
    });

    if (btnRotate) btnRotate.addEventListener("click", () => {
        if (selectedPages.size === 0) {
            showToast(t("toast_no_file") || "Vui lòng chọn trang", "error");
            return;
        }

        selectedPages.forEach(pageNum => {
            addOperation({ type: "rotate", page: pageNum, angle: 90 });
            pageRotations[pageNum] = (pageRotations[pageNum] || 0) + 90;
        });

        renderThumbnails();
        showToast(t("toast_process_ok") || "Đã xoay trang", "success");
    });

    if (btnReverse) btnReverse.addEventListener("click", () => {
        // Đảo ngược thứ tự hiện tại
        pageOrder.reverse();
        addOperation({ type: "reorder", new_order: [...pageOrder] });

        renderThumbnails();
        showToast(t("toast_process_ok") || "Đã đảo thứ tự", "success");
    });

    if (btnBulkDelete) btnBulkDelete.addEventListener("click", () => {
        if (selectedPages.size === 0) {
            showToast(t("toast_no_file") || "Vui lòng chọn trang", "error");
            return;
        }

        if (confirm(t("confirm_delete"))) {
            selectedPages.forEach(pageNum => {
                addOperation({ type: "delete", page: pageNum });
                pageOrder = pageOrder.filter(p => p !== pageNum);
            });

            selectedPages.clear();
            renderThumbnails();
            showToast(t("toast_process_ok") || "Đã xoá", "success");
        }
    });

    if (btnDeleteBlank) btnDeleteBlank.addEventListener("click", () => {
        addOperation({ type: "delete_blank" });
        showToast(t("toast_process_ok") || "Ghi nhận lệnh xoá trang trắng", "info");
    });

    if (btnExport) btnExport.addEventListener("click", async () => {
        if (!sessionId) {
            showToast(t("toast_error"), "error");
            return;
        }

        // Xây dựng State hiện tại dựa vào pageOrder và pageRotations
        const currentState = pageOrder.map(pageNum => ({
            page: pageNum,
            rotation: pageRotations[pageNum] || 0
        }));

        const originalText = btnExport.textContent;
        btnExport.textContent = t("processing");
        btnExport.disabled = true;

        try {
            const response = await fetch("/api/editor/apply", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    operations: currentState
                })  // ✅ FIX: đóng JSON.stringify()
            });  // ✅ FIX: đóng fetch options object và fetch()

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || t("toast_error"));
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `edited_${Date.now()}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast(t("toast_process_ok"), "success");
        } catch (err) {
            showToast(err.message || t("toast_error"), "error");
        } finally {
            btnExport.textContent = originalText;
            btnExport.disabled = false;
        }
    });
});