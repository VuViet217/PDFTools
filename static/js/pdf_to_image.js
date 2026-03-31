// PDF to Image Conversion Handler
(function() {
    const uploadArea = document.getElementById("pdfToImageUploadArea");
    const fileInput = document.getElementById("pdfToImageFileInput");
    const fileInfo = document.getElementById("pdfToImageFileInfo");
    const fileName = document.getElementById("pdfToImageFileName");
    const fileSize = document.getElementById("pdfToImageFileSize");
    const pageCount = document.getElementById("pdfToImagePageCount");
    const previewImg = document.getElementById("pdfToImagePreviewImg");
    const convertBtn = document.getElementById("pdfToImageBtn");
    const resetBtn = document.getElementById("pdfToImageResetBtn");
    const formatSelect = document.getElementById("pdfToImageFormat");
    const qualitySlider = document.getElementById("pdfToImageQuality");
    const qualityValue = document.getElementById("qualityValue");
    const conversionOptions = document.getElementById("conversionOptions");
    const progress = document.getElementById("conversionProgress");
    const conversionStatus = document.getElementById("conversionStatus");
    const result = document.getElementById("pdfToImageResult");
    const downloadBtn = document.getElementById("pdfToImageDownloadBtn");
    const imageCountSpan = document.getElementById("imageCount");
    const toastContainer = document.getElementById("toastContainer");

    let selectedFile = null;
    let downloadUrl = null;
    let currentPageCount = 0;

    // Quality slider update
    qualitySlider.addEventListener("input", (e) => {
        qualityValue.textContent = e.target.value;
    });

    // Upload area click
    uploadArea.addEventListener("click", () => {
        fileInput.click();
    });

    // Drag and drop
    uploadArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadArea.style.backgroundColor = "#f0f8ff";
    });

    uploadArea.addEventListener("dragleave", () => {
        uploadArea.style.backgroundColor = "";
    });

    uploadArea.addEventListener("drop", async (e) => {
        e.preventDefault();
        uploadArea.style.backgroundColor = "";

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type === "application/pdf") {
                await handleFileSelect(file);
            } else {
                showToast("Vui lòng chọn file PDF", "error");
            }
        }
    });

    // File input change
    fileInput.addEventListener("change", async (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            if (file.type === "application/pdf") {
                await handleFileSelect(file);
            } else {
                showToast("Vui lòng chọn file PDF", "error");
            }
        }
    });

    // Handle file selection
    async function handleFileSelect(file) {
        // Check file size (50MB max)
        if (file.size > 50 * 1024 * 1024) {
            showToast("File quá lớn (tối đa 50MB)", "error");
            return;
        }

        selectedFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileInfo.style.display = "block";
        conversionOptions.style.display = "block";
        convertBtn.disabled = false;
        result.style.display = "none";
        uploadArea.style.opacity = "0.5";

        // Get preview and page count
        await getPreview(file);
    }

    // Get preview
    async function getPreview(file) {
        try {
            progress.style.display = "block";
            progress.querySelector("p").textContent = "Đang xem trước...";

            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/pdf-to-image/preview", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Lỗi tạo preview");
            }

            const data = await response.json();

            if (data.success) {
                pageCount.textContent = data.page_count;
                previewImg.src = data.preview;
                currentPageCount = data.page_count;
            } else {
                throw new Error(data.error || "Lỗi tạo preview");
            }

            progress.style.display = "none";
        } catch (error) {
            showToast("Lỗi: " + error.message, "error");
            progress.style.display = "none";
        }
    }

    // Convert PDF to images
    convertBtn.addEventListener("click", async () => {
        if (!selectedFile) {
            showToast("Vui lòng chọn file PDF", "error");
            return;
        }

        try {
            progress.style.display = "block";
            conversionStatus.textContent = "Đang chuyển đổi PDF thành ảnh...";
            convertBtn.disabled = true;
            resetBtn.style.display = "none";

            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("format", formatSelect.value);
            formData.append("quality", qualitySlider.value);

            const response = await fetch("/api/pdf-to-image/convert", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Lỗi chuyển đổi");
            }

            // Get total pages from header
            const totalPages = response.headers.get("X-Total-Pages") || currentPageCount;

            // Download file
            const blob = await response.blob();
            downloadUrl = window.URL.createObjectURL(blob);

            // Set download button
            downloadBtn.href = downloadUrl;
            downloadBtn.download = `pdf_to_images.zip`;

            // Show result
            imageCountSpan.textContent = totalPages;
            result.style.display = "block";
            progress.style.display = "none";
            resetBtn.style.display = "inline-block";

            showToast("Chuyển đổi thành công!", "success");
        } catch (error) {
            showToast("Lỗi: " + error.message, "error");
            progress.style.display = "none";
            convertBtn.disabled = false;
        }
    });

    // Reset
    resetBtn.addEventListener("click", () => {
        selectedFile = null;
        fileInput.value = "";
        fileInfo.style.display = "none";
        conversionOptions.style.display = "none";
        result.style.display = "none";
        convertBtn.disabled = true;
        resetBtn.style.display = "none";
        uploadArea.style.opacity = "1";

        if (downloadUrl) {
            window.URL.revokeObjectURL(downloadUrl);
            downloadUrl = null;
        }
    });

    // Download
    downloadBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (downloadUrl) {
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = `pdf_to_images.zip`;
            a.click();
        }
    });

    // Format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    }

    // Show toast
    function showToast(message, type = "info") {
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add("remove");
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Apply language on language change
    document.addEventListener("languageChanged", (e) => {
        // Update data-i18n attributes
        const i18nElements = document.querySelectorAll("[data-i18n]");
        i18nElements.forEach((el) => {
            const key = el.getAttribute("data-i18n");
            if (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) {
                el.textContent = TRANSLATIONS[currentLang][key];
            }
        });
    });
})();
