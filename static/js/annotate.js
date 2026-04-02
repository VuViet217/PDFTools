/**
 * PDF Annotate Tool - Main JS (v2)
 * Uses PDF.js for rendering and Fabric.js for annotation canvas
 * Supports: Select, Text, Highlight, Draw, Eraser, Shapes (rect, ellipse, line, arrow, polygon, polyline), Sign, Image
 */
(function () {
    'use strict';

    // PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    // ============ STATE ============
    let pdfDoc = null;
    let pdfBytes = null;
    let pdfFileName = '';
    let currentPage = 0;
    let totalPagesCount = 0;
    let scale = 1.5;
    let fabricCanvas = null;
    let currentTool = 'select';
    let currentShape = 'rectangle';

    const pageAnnotations = {};
    const undoStacks = {};
    const redoStacks = {};

    // Shape drawing state
    let _shapeStartX = 0, _shapeStartY = 0;
    let _tempShape = null, _isDrawingShape = false;
    // Highlight drawing state
    let _hlStartX = 0, _hlStartY = 0, _hlRect = null, _isDrawingHL = false;
    // Polyline/Polygon state
    let _polyPoints = [], _polyTempLine = null;

    // ============ DOM REFS ============
    const uploadScreen = document.getElementById('uploadScreen');
    const editorScreen = document.getElementById('editorScreen');
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const thumbnailsList = document.getElementById('thumbnailsList');
    const pageContainer = document.getElementById('pageContainer');
    const pageNumInput = document.getElementById('pageNumInput');
    const totalPagesEl = document.getElementById('totalPages');
    const zoomLevelEl = document.getElementById('zoomLevel');
    const toolOptionsBar = document.getElementById('toolOptionsBar');

    // ============ INIT ============
    function init() {
        // Upload events
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
        uploadArea.addEventListener('drop', e => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length) handleFile(fileInput.files[0]);
        });

        // Toolbar
        document.getElementById('btnBack').addEventListener('click', resetToUpload);
        document.getElementById('btnUndo').addEventListener('click', undo);
        document.getElementById('btnRedo').addEventListener('click', redo);
        document.getElementById('btnDelete').addEventListener('click', deleteSelected);
        document.getElementById('btnSave').addEventListener('click', savePDF);

        // Tool buttons (except shapes dropdown items)
        document.querySelectorAll('[data-tool]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (btn.dataset.tool === 'shapes') {
                    e.stopPropagation();
                    toggleShapesMenu();
                    return;
                }
                setTool(btn.dataset.tool);
            });
        });

        // Shape dropdown items
        document.querySelectorAll('.dropdown-shape-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                currentShape = btn.dataset.shape;
                document.getElementById('shapesMenu').classList.remove('show');
                // Update shapes button label
                const label = btn.querySelector('span:last-child');
                if (label) document.querySelector('#btnShapes .tool-label').textContent = label.textContent;
                setTool('shapes');
                // Show/hide polygon sides
                const pg = document.getElementById('polygonSidesGroup');
                if (pg) pg.style.display = (currentShape === 'polygon') ? 'inline-flex' : 'none';
            });
        });

        // Close shapes menu on outside click
        document.addEventListener('click', () => {
            const menu = document.getElementById('shapesMenu');
            if (menu) menu.classList.remove('show');
        });

        // Page navigation
        document.getElementById('btnPrevPage').addEventListener('click', () => goToPage(currentPage - 1));
        document.getElementById('btnNextPage').addEventListener('click', () => goToPage(currentPage + 1));
        pageNumInput.addEventListener('change', () => goToPage(parseInt(pageNumInput.value) - 1));

        // Zoom
        document.getElementById('btnZoomIn').addEventListener('click', () => setZoom(scale + 0.25));
        document.getElementById('btnZoomOut').addEventListener('click', () => setZoom(scale - 0.25));

        // Draw options live update
        document.getElementById('optDrawWidth').addEventListener('input', e => {
            document.getElementById('drawWidthVal').textContent = e.target.value + 'px';
            if (fabricCanvas && fabricCanvas.isDrawingMode) {
                fabricCanvas.freeDrawingBrush.width = parseInt(e.target.value);
            }
        });
        document.getElementById('optDrawColor').addEventListener('input', e => {
            if (fabricCanvas && fabricCanvas.isDrawingMode) {
                fabricCanvas.freeDrawingBrush.color = e.target.value;
            }
        });

        // Eraser size display
        document.getElementById('optEraserSize').addEventListener('input', e => {
            document.getElementById('eraserSizeVal').textContent = e.target.value + 'px';
        });

        // Shape opacity display
        document.getElementById('optShapeOpacity').addEventListener('input', e => {
            document.getElementById('shapeOpacityVal').textContent = e.target.value + '%';
        });

        // No-fill checkbox
        document.getElementById('optShapeNoFill').addEventListener('change', e => {
            document.getElementById('optShapeFillColor').disabled = e.target.checked;
        });

        // Signature modal
        document.getElementById('btnCancelSign').addEventListener('click', closeSignModal);
        document.getElementById('btnConfirmSign').addEventListener('click', applySignature);
        document.getElementById('btnClearSign').addEventListener('click', clearSignCanvas);
        document.querySelectorAll('.sign-tab').forEach(tab => {
            tab.addEventListener('click', () => switchSignTab(tab.dataset.tab));
        });
        document.getElementById('signFileInput').addEventListener('change', handleSignUpload);

        // Keyboard shortcuts
        document.addEventListener('keydown', e => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
            if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (document.activeElement === document.body) deleteSelected();
            }
            if (e.key === 'Escape') finishPolygon(false);
        });
    }

    function toggleShapesMenu() {
        document.getElementById('shapesMenu').classList.toggle('show');
    }

    // ============ FILE HANDLING ============
    async function handleFile(file) {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            showToast('Only PDF files are supported', 'error');
            return;
        }
        if (file.size > 100 * 1024 * 1024) {
            showToast('File too large (max 100MB)', 'error');
            return;
        }

        pdfFileName = file.name;
        pdfBytes = await file.arrayBuffer();

        try {
            pdfDoc = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;
            totalPagesCount = pdfDoc.numPages;
            totalPagesEl.textContent = totalPagesCount;
            pageNumInput.max = totalPagesCount;

            uploadScreen.style.display = 'none';
            editorScreen.style.display = 'flex';

            await buildThumbnails();
            initFabricCanvas();
            await goToPage(0);
        } catch (err) {
            console.error('Error loading PDF:', err);
            showToast('Failed to load PDF', 'error');
        }
    }

    // ============ THUMBNAILS ============
    async function buildThumbnails() {
        thumbnailsList.innerHTML = '';
        const thumbScale = 0.3;
        for (let i = 0; i < totalPagesCount; i++) {
            const page = await pdfDoc.getPage(i + 1);
            const vp = page.getViewport({ scale: thumbScale });
            const canvas = document.createElement('canvas');
            canvas.width = vp.width;
            canvas.height = vp.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

            const thumb = document.createElement('div');
            thumb.className = 'thumbnail-item' + (i === 0 ? ' active' : '');
            thumb.dataset.page = i;
            thumb.innerHTML = '<div class="thumb-canvas-wrap"></div><span class="thumb-label">' + (i + 1) + '</span>';
            thumb.querySelector('.thumb-canvas-wrap').appendChild(canvas);
            thumb.addEventListener('click', () => goToPage(i));
            thumbnailsList.appendChild(thumb);
        }
    }

    // ============ FABRIC CANVAS ============
    let _restoring = false;

    function initFabricCanvas() {
        if (fabricCanvas) fabricCanvas.dispose();
        fabricCanvas = new fabric.Canvas('fabricCanvas', {
            selection: true,
            preserveObjectStacking: true
        });

        fabricCanvas.on('object:added', () => { if (!_restoring) saveState(); });
        fabricCanvas.on('object:modified', () => saveState());
        fabricCanvas.on('object:removed', () => { if (!_restoring) saveState(); });

        fabricCanvas.on('mouse:dblclick', (e) => {
            if (e.target && e.target.type === 'i-text') {
                fabricCanvas.setActiveObject(e.target);
                e.target.enterEditing();
            }
        });

        fabricCanvas.on('mouse:down', onCanvasMouseDown);
        fabricCanvas.on('mouse:move', onCanvasMouseMove);
        fabricCanvas.on('mouse:up', onCanvasMouseUp);
    }

    // ============ PAGE RENDERING ============
    async function renderPage(pageIdx) {
        const page = await pdfDoc.getPage(pageIdx + 1);
        const vp = page.getViewport({ scale: scale });

        fabricCanvas.setWidth(vp.width);
        fabricCanvas.setHeight(vp.height);
        pageContainer.style.width = vp.width + 'px';
        pageContainer.style.height = vp.height + 'px';

        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = vp.width;
        tmpCanvas.height = vp.height;
        await page.render({ canvasContext: tmpCanvas.getContext('2d'), viewport: vp }).promise;

        const dataURL = tmpCanvas.toDataURL();
        fabric.Image.fromURL(dataURL, (img) => {
            fabricCanvas.setBackgroundImage(img, fabricCanvas.renderAll.bind(fabricCanvas), {
                scaleX: 1, scaleY: 1, originX: 'left', originY: 'top'
            });
        });
    }

    async function goToPage(idx) {
        if (idx < 0 || idx >= totalPagesCount) return;
        savePageAnnotations(currentPage);
        currentPage = idx;
        pageNumInput.value = idx + 1;

        _restoring = true;
        fabricCanvas.clear();
        _restoring = false;

        await renderPage(idx);
        restorePageAnnotations(idx);

        document.querySelectorAll('.thumbnail-item').forEach(t => {
            t.classList.toggle('active', parseInt(t.dataset.page) === idx);
        });
        const activeThumb = thumbnailsList.querySelector('.thumbnail-item.active');
        if (activeThumb) activeThumb.scrollIntoView({ block: 'nearest' });

        applyToolMode();
        updateUndoRedoButtons();
    }

    function savePageAnnotations(pageIdx) {
        if (!fabricCanvas) return;
        const objects = fabricCanvas.getObjects();
        if (objects.length > 0) {
            pageAnnotations[pageIdx] = fabricCanvas.toJSON(['annotType', 'annotData']);
        } else {
            delete pageAnnotations[pageIdx];
        }
    }

    function restorePageAnnotations(pageIdx) {
        if (!pageAnnotations[pageIdx]) return;
        _restoring = true;
        fabricCanvas.loadFromJSON(pageAnnotations[pageIdx], () => {
            renderPage(pageIdx).then(() => {
                _restoring = false;
                fabricCanvas.renderAll();
            });
        });
    }

    // ============ ZOOM ============
    function setZoom(newScale) {
        if (newScale < 0.5 || newScale > 4) return;
        savePageAnnotations(currentPage);
        const oldScale = scale;
        const ratio = newScale / oldScale;
        scale = newScale;
        zoomLevelEl.textContent = Math.round(scale * 100) + '%';

        _restoring = true;
        fabricCanvas.clear();
        _restoring = false;

        renderPage(currentPage).then(() => {
            if (pageAnnotations[currentPage]) {
                _restoring = true;
                fabricCanvas.loadFromJSON(pageAnnotations[currentPage], () => {
                    fabricCanvas.getObjects().forEach(obj => {
                        obj.set({
                            left: obj.left * ratio,
                            top: obj.top * ratio,
                            scaleX: (obj.scaleX || 1) * ratio,
                            scaleY: (obj.scaleY || 1) * ratio
                        });
                        obj.setCoords();
                    });
                    pageAnnotations[currentPage] = fabricCanvas.toJSON(['annotType', 'annotData']);
                    _restoring = false;
                    fabricCanvas.renderAll();
                });
            }
        });
    }

    // ============ TOOL MANAGEMENT ============
    function setTool(tool) {
        if (tool === 'sign') { openSignModal(); return; }
        if (tool === 'image') { triggerImageUpload(); return; }

        // Finish any poly in progress
        if (currentTool === 'shapes' && (currentShape === 'polyline' || currentShape === 'polygon') && _polyPoints.length > 0) {
            finishPolygon(true);
        }

        currentTool = tool;

        document.querySelectorAll('[data-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });

        applyToolMode();
        showToolOptions(tool);
    }

    function applyToolMode() {
        if (!fabricCanvas) return;

        fabricCanvas.isDrawingMode = false;
        fabricCanvas.selection = true;
        fabricCanvas.defaultCursor = 'default';
        fabricCanvas.hoverCursor = 'move';

        fabricCanvas.getObjects().forEach(obj => {
            obj.selectable = (currentTool === 'select');
            obj.evented = (currentTool === 'select' || currentTool === 'eraser');
        });

        if (currentTool === 'draw') {
            fabricCanvas.isDrawingMode = true;
            fabricCanvas.freeDrawingBrush.color = document.getElementById('optDrawColor').value;
            fabricCanvas.freeDrawingBrush.width = parseInt(document.getElementById('optDrawWidth').value);
            fabricCanvas.freeDrawingBrush.decimate = 5;
        } else if (currentTool === 'text') {
            fabricCanvas.defaultCursor = 'text';
            fabricCanvas.hoverCursor = 'text';
            fabricCanvas.selection = false;
        } else if (currentTool === 'highlight') {
            fabricCanvas.defaultCursor = 'crosshair';
            fabricCanvas.hoverCursor = 'crosshair';
            fabricCanvas.selection = false;
        } else if (currentTool === 'eraser') {
            fabricCanvas.defaultCursor = 'pointer';
            fabricCanvas.hoverCursor = 'pointer';
            fabricCanvas.selection = false;
            fabricCanvas.getObjects().forEach(obj => {
                obj.selectable = false;
                obj.evented = true;
                obj.hoverCursor = 'pointer';
            });
        } else if (currentTool === 'shapes') {
            fabricCanvas.defaultCursor = 'crosshair';
            fabricCanvas.hoverCursor = 'crosshair';
            fabricCanvas.selection = false;
        }

        fabricCanvas.renderAll();
    }

    function showToolOptions(tool) {
        var allOpts = ['textOptions', 'highlightOptions', 'drawOptions', 'eraserOptions', 'shapeOptions'];
        allOpts.forEach(function(id) { document.getElementById(id).style.display = 'none'; });

        var map = {
            'text': 'textOptions',
            'highlight': 'highlightOptions',
            'draw': 'drawOptions',
            'eraser': 'eraserOptions',
            'shapes': 'shapeOptions'
        };

        if (map[tool]) {
            toolOptionsBar.style.display = 'flex';
            document.getElementById(map[tool]).style.display = 'flex';
        } else {
            toolOptionsBar.style.display = 'none';
        }
    }

    // ============ SHAPE OPTIONS HELPERS ============
    function getShapeStroke() { return document.getElementById('optShapeStrokeColor').value; }
    function getShapeFill() {
        return document.getElementById('optShapeNoFill').checked ? 'transparent' : document.getElementById('optShapeFillColor').value;
    }
    function getShapeStrokeWidth() { return parseInt(document.getElementById('optShapeStrokeWidth').value); }
    function getShapeOpacity() { return parseInt(document.getElementById('optShapeOpacity').value) / 100; }
    function getShapeDashArray() {
        var style = document.getElementById('optShapeLineStyle').value;
        var w = getShapeStrokeWidth();
        if (style === 'dashed') return [w * 4, w * 2];
        if (style === 'dotted') return [w, w * 2];
        return null;
    }

    // ============ CANVAS MOUSE EVENTS ============
    function onCanvasMouseDown(opt) {
        var pointer = fabricCanvas.getPointer(opt.e);

        // --- TEXT ---
        if (currentTool === 'text' && !opt.target) {
            var fontSize = parseInt(document.getElementById('optFontSize').value) || 16;
            var color = document.getElementById('optTextColor').value;
            var itext = new fabric.IText('Text', {
                left: pointer.x, top: pointer.y,
                fontSize: fontSize, fill: color, fontFamily: 'Arial',
                annotType: 'text'
            });
            fabricCanvas.add(itext);
            fabricCanvas.setActiveObject(itext);
            itext.enterEditing();
            itext.selectAll();
            return;
        }

        // --- HIGHLIGHT ---
        if (currentTool === 'highlight' && !opt.target) {
            _hlStartX = pointer.x;
            _hlStartY = pointer.y;
            _isDrawingHL = true;
            var hlColor = document.getElementById('optHighlightColor').value;
            var hlOpacity = parseInt(document.getElementById('optHighlightOpacity').value) / 100;
            _hlRect = new fabric.Rect({
                left: pointer.x, top: pointer.y, width: 0, height: 0,
                fill: hlColor, opacity: hlOpacity, selectable: false, evented: false,
                annotType: 'highlight'
            });
            fabricCanvas.add(_hlRect);
            return;
        }

        // --- ERASER ---
        if (currentTool === 'eraser' && opt.target) {
            fabricCanvas.remove(opt.target);
            fabricCanvas.renderAll();
            return;
        }

        // --- SHAPES ---
        if (currentTool === 'shapes') {
            if (currentShape === 'polyline' || currentShape === 'polygon') {
                handlePolyClick(pointer, opt.e);
                return;
            }
            if (!opt.target) {
                _shapeStartX = pointer.x;
                _shapeStartY = pointer.y;
                _isDrawingShape = true;
                _tempShape = createTempShape(pointer.x, pointer.y);
                if (_tempShape) fabricCanvas.add(_tempShape);
            }
        }
    }

    function onCanvasMouseMove(opt) {
        var pointer = fabricCanvas.getPointer(opt.e);

        if (_isDrawingHL && _hlRect) {
            var w = pointer.x - _hlStartX;
            var h = pointer.y - _hlStartY;
            _hlRect.set({
                left: w >= 0 ? _hlStartX : pointer.x,
                top: h >= 0 ? _hlStartY : pointer.y,
                width: Math.abs(w), height: Math.abs(h)
            });
            fabricCanvas.renderAll();
            return;
        }

        if (_isDrawingShape && _tempShape) {
            updateTempShape(pointer);
            fabricCanvas.renderAll();
            return;
        }

        if (currentTool === 'shapes' && (currentShape === 'polyline' || currentShape === 'polygon') && _polyPoints.length > 0) {
            updatePolyTempLine(pointer);
        }
    }

    function onCanvasMouseUp(opt) {
        // Highlight finish
        if (_isDrawingHL && _hlRect) {
            _isDrawingHL = false;
            if (_hlRect.width < 5 && _hlRect.height < 5) {
                fabricCanvas.remove(_hlRect);
            } else {
                _hlRect.set({ selectable: true, evented: true });
            }
            _hlRect = null;
            return;
        }

        // Shape finish
        if (_isDrawingShape && _tempShape) {
            _isDrawingShape = false;
            var isLine = (currentShape === 'line' || currentShape === 'arrow');

            if (currentShape === 'arrow') {
                // Convert line to arrow with head
                finalizeArrow(_tempShape);
                _tempShape = null;
                return;
            }

            var tw = _tempShape.width || 0;
            var th = _tempShape.height || 0;
            if (!isLine && tw < 3 && th < 3) {
                fabricCanvas.remove(_tempShape);
            } else {
                _tempShape.set({ selectable: true, evented: true });
            }
            _tempShape = null;
        }
    }

    // ============ SHAPE CREATION ============
    function createTempShape(x, y) {
        var stroke = getShapeStroke();
        var fill = getShapeFill();
        var sw = getShapeStrokeWidth();
        var opacity = getShapeOpacity();
        var dashArray = getShapeDashArray();
        var base = {
            left: x, top: y,
            stroke: stroke, fill: fill === 'transparent' ? '' : fill,
            strokeWidth: sw, opacity: opacity,
            strokeDashArray: dashArray,
            selectable: false, evented: false,
            annotType: 'shape',
            annotData: currentShape
        };

        switch (currentShape) {
            case 'rectangle':
                return new fabric.Rect(Object.assign({}, base, { width: 0, height: 0 }));
            case 'ellipse':
                return new fabric.Ellipse(Object.assign({}, base, { rx: 0, ry: 0 }));
            case 'line':
                return new fabric.Line([x, y, x, y], Object.assign({}, base, { fill: undefined }));
            case 'arrow':
                return new fabric.Line([x, y, x, y], Object.assign({}, base, { fill: undefined }));
            default:
                return null;
        }
    }

    function updateTempShape(pointer) {
        if (!_tempShape) return;
        var dx = pointer.x - _shapeStartX;
        var dy = pointer.y - _shapeStartY;

        switch (currentShape) {
            case 'rectangle':
                _tempShape.set({
                    left: dx >= 0 ? _shapeStartX : pointer.x,
                    top: dy >= 0 ? _shapeStartY : pointer.y,
                    width: Math.abs(dx), height: Math.abs(dy)
                });
                break;
            case 'ellipse':
                _tempShape.set({
                    left: dx >= 0 ? _shapeStartX : pointer.x,
                    top: dy >= 0 ? _shapeStartY : pointer.y,
                    rx: Math.abs(dx) / 2, ry: Math.abs(dy) / 2
                });
                break;
            case 'line':
            case 'arrow':
                _tempShape.set({ x2: pointer.x, y2: pointer.y });
                break;
        }
    }

    function finalizeArrow(lineObj) {
        if (!lineObj) return;
        var x1 = lineObj.x1, y1 = lineObj.y1, x2 = lineObj.x2, y2 = lineObj.y2;

        // Calculate line length; skip if too small
        var len = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
        if (len < 5) { fabricCanvas.remove(lineObj); return; }

        var angle = Math.atan2(y2 - y1, x2 - x1);
        var headLen = Math.max(lineObj.strokeWidth * 4, 12);

        var line = new fabric.Line([x1, y1, x2, y2], {
            stroke: lineObj.stroke,
            strokeWidth: lineObj.strokeWidth,
            strokeDashArray: lineObj.strokeDashArray,
            opacity: lineObj.opacity
        });

        var head = new fabric.Triangle({
            left: x2, top: y2,
            width: headLen, height: headLen,
            fill: lineObj.stroke,
            opacity: lineObj.opacity,
            angle: (angle * 180 / Math.PI) + 90,
            originX: 'center', originY: 'center'
        });

        fabricCanvas.remove(lineObj);

        _restoring = true;
        var group = new fabric.Group([line, head], {
            annotType: 'shape',
            annotData: 'arrow',
            selectable: true, evented: true
        });
        fabricCanvas.add(group);
        _restoring = false;
        saveState();
        fabricCanvas.renderAll();
    }

    // ============ POLYGON / POLYLINE ============
    function handlePolyClick(pointer, event) {
        _polyPoints.push({ x: pointer.x, y: pointer.y });

        var dot = new fabric.Circle({
            left: pointer.x - 3, top: pointer.y - 3,
            radius: 3, fill: getShapeStroke(),
            selectable: false, evented: false,
            _polyHelper: true
        });
        fabricCanvas.add(dot);

        // Double-click finishes
        if (_polyPoints.length >= 3 && event.detail >= 2) {
            finishPolygon(true);
        }
    }

    function updatePolyTempLine(pointer) {
        if (_polyTempLine) fabricCanvas.remove(_polyTempLine);
        if (_polyPoints.length === 0) return;
        var last = _polyPoints[_polyPoints.length - 1];
        _polyTempLine = new fabric.Line([last.x, last.y, pointer.x, pointer.y], {
            stroke: getShapeStroke(),
            strokeWidth: getShapeStrokeWidth(),
            strokeDashArray: [5, 5],
            selectable: false, evented: false,
            _polyHelper: true
        });
        fabricCanvas.add(_polyTempLine);
        fabricCanvas.renderAll();
    }

    function finishPolygon(commit) {
        // Remove all helper objects
        var helpers = fabricCanvas.getObjects().filter(function(o) { return o._polyHelper; });
        helpers.forEach(function(o) { fabricCanvas.remove(o); });
        _polyTempLine = null;

        if (commit && _polyPoints.length >= 2) {
            var stroke = getShapeStroke();
            var fill = getShapeFill();
            var sw = getShapeStrokeWidth();
            var opacity = getShapeOpacity();
            var dashArray = getShapeDashArray();

            if (currentShape === 'polygon' && _polyPoints.length >= 3) {
                var poly = new fabric.Polygon(
                    _polyPoints.map(function(p) { return { x: p.x, y: p.y }; }),
                    {
                        stroke: stroke, fill: fill === 'transparent' ? '' : fill,
                        strokeWidth: sw, opacity: opacity, strokeDashArray: dashArray,
                        annotType: 'shape', annotData: 'polygon',
                        selectable: true, evented: true
                    }
                );
                fabricCanvas.add(poly);
            } else {
                // Polyline
                var pl = new fabric.Polyline(
                    _polyPoints.map(function(p) { return { x: p.x, y: p.y }; }),
                    {
                        stroke: stroke, fill: '',
                        strokeWidth: sw, opacity: opacity, strokeDashArray: dashArray,
                        annotType: 'shape', annotData: 'polyline',
                        selectable: true, evented: true
                    }
                );
                fabricCanvas.add(pl);
            }
        }

        _polyPoints = [];
        fabricCanvas.renderAll();
    }

    // ============ IMAGE INSERTION ============
    function triggerImageUpload() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = function(e) {
            if (!e.target.files.length) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
                fabric.Image.fromURL(ev.target.result, function(img) {
                    var maxW = fabricCanvas.width * 0.5;
                    var maxH = fabricCanvas.height * 0.5;
                    if (img.width > maxW || img.height > maxH) {
                        img.scale(Math.min(maxW / img.width, maxH / img.height));
                    }
                    img.set({ left: fabricCanvas.width / 4, top: fabricCanvas.height / 4, annotType: 'image' });
                    fabricCanvas.add(img);
                    fabricCanvas.setActiveObject(img);
                    setTool('select');
                });
            };
            reader.readAsDataURL(e.target.files[0]);
        };
        input.click();
    }

    // ============ SIGNATURE ============
    var signCtx = null, signDrawing = false, signImageData = null;

    function openSignModal() {
        document.getElementById('signModal').style.display = 'flex';
        initSignCanvas();
    }

    function closeSignModal() {
        document.getElementById('signModal').style.display = 'none';
        setTool('select');
    }

    function initSignCanvas() {
        var c = document.getElementById('signCanvas');
        signCtx = c.getContext('2d');
        signCtx.fillStyle = '#fff';
        signCtx.fillRect(0, 0, c.width, c.height);
        signCtx.strokeStyle = '#000';
        signCtx.lineWidth = 2;
        signCtx.lineCap = 'round';
        signDrawing = false;

        c.onmousedown = c.ontouchstart = function(e) {
            e.preventDefault(); signDrawing = true;
            var pos = getSignPos(e, c);
            signCtx.beginPath(); signCtx.moveTo(pos.x, pos.y);
        };
        c.onmousemove = c.ontouchmove = function(e) {
            if (!signDrawing) return; e.preventDefault();
            var pos = getSignPos(e, c);
            signCtx.lineTo(pos.x, pos.y); signCtx.stroke();
        };
        c.onmouseup = c.ontouchend = function() { signDrawing = false; };
        c.onmouseleave = function() { signDrawing = false; };
    }

    function getSignPos(e, canvas) {
        var rect = canvas.getBoundingClientRect();
        var touch = e.touches ? e.touches[0] : e;
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }

    function clearSignCanvas() {
        var c = document.getElementById('signCanvas');
        signCtx.fillStyle = '#fff';
        signCtx.fillRect(0, 0, c.width, c.height);
    }

    function switchSignTab(tab) {
        document.querySelectorAll('.sign-tab').forEach(function(t) { t.classList.toggle('active', t.dataset.tab === tab); });
        document.getElementById('signDrawPanel').style.display = tab === 'draw' ? 'block' : 'none';
        document.getElementById('signUploadPanel').style.display = tab === 'upload' ? 'block' : 'none';
    }

    function handleSignUpload(e) {
        if (!e.target.files.length) return;
        var reader = new FileReader();
        reader.onload = function(ev) {
            signImageData = ev.target.result;
            document.getElementById('signPreview').innerHTML = '<img src="' + signImageData + '" style="max-width:100%;max-height:180px;">';
        };
        reader.readAsDataURL(e.target.files[0]);
    }

    function applySignature() {
        var activeTab = document.querySelector('.sign-tab.active').dataset.tab;
        var dataURL = null;
        if (activeTab === 'draw') {
            dataURL = document.getElementById('signCanvas').toDataURL('image/png');
        } else if (activeTab === 'upload' && signImageData) {
            dataURL = signImageData;
        }
        if (!dataURL) {
            showToast(t('annotate_sign_empty') || 'Please draw or upload a signature', 'warning');
            return;
        }
        fabric.Image.fromURL(dataURL, function(img) {
            var ratio = (fabricCanvas.width * 0.25) / img.width;
            img.scale(ratio);
            img.set({ left: fabricCanvas.width / 3, top: fabricCanvas.height / 2, annotType: 'signature' });
            fabricCanvas.add(img);
            fabricCanvas.setActiveObject(img);
        });
        closeSignModal();
        setTool('select');
    }

    // ============ UNDO / REDO ============
    function saveState() {
        var key = currentPage;
        if (!undoStacks[key]) undoStacks[key] = [];
        undoStacks[key].push(fabricCanvas.toJSON(['annotType', 'annotData']));
        if (undoStacks[key].length > 50) undoStacks[key].shift();
        redoStacks[key] = [];
        updateUndoRedoButtons();
    }

    function undo() {
        var key = currentPage;
        if (!undoStacks[key] || undoStacks[key].length === 0) return;
        if (!redoStacks[key]) redoStacks[key] = [];
        redoStacks[key].push(fabricCanvas.toJSON(['annotType', 'annotData']));
        var state = undoStacks[key].pop();
        _restoring = true;
        fabricCanvas.loadFromJSON(state, function() {
            renderPage(currentPage).then(function() {
                _restoring = false;
                applyToolMode();
                fabricCanvas.renderAll();
                updateUndoRedoButtons();
            });
        });
    }

    function redo() {
        var key = currentPage;
        if (!redoStacks[key] || redoStacks[key].length === 0) return;
        if (!undoStacks[key]) undoStacks[key] = [];
        undoStacks[key].push(fabricCanvas.toJSON(['annotType', 'annotData']));
        var state = redoStacks[key].pop();
        _restoring = true;
        fabricCanvas.loadFromJSON(state, function() {
            renderPage(currentPage).then(function() {
                _restoring = false;
                applyToolMode();
                fabricCanvas.renderAll();
                updateUndoRedoButtons();
            });
        });
    }

    function updateUndoRedoButtons() {
        var key = currentPage;
        document.getElementById('btnUndo').disabled = !undoStacks[key] || undoStacks[key].length === 0;
        document.getElementById('btnRedo').disabled = !redoStacks[key] || redoStacks[key].length === 0;
    }

    // ============ DELETE ============
    function deleteSelected() {
        var active = fabricCanvas.getActiveObjects();
        if (active.length === 0) return;
        active.forEach(function(obj) { fabricCanvas.remove(obj); });
        fabricCanvas.discardActiveObject();
        fabricCanvas.renderAll();
    }

    // ============ SAVE PDF ============
    async function savePDF() {
        savePageAnnotations(currentPage);
        var pagesData = {};

        for (var pageIdxStr in pageAnnotations) {
            var json = pageAnnotations[pageIdxStr];
            var pageIdx = parseInt(pageIdxStr);
            var page = await pdfDoc.getPage(pageIdx + 1);
            var vpScaled = page.getViewport({ scale: scale });
            var scaleRatio = 1 / scale;

            var annots = [];
            var tempCanvas = new fabric.Canvas(null, { width: vpScaled.width, height: vpScaled.height });
            await new Promise(function(resolve) { tempCanvas.loadFromJSON(json, resolve); });

            tempCanvas.getObjects().forEach(function(obj) {
                var a = extractAnnotation(obj, scaleRatio);
                if (a) annots.push(a);
            });
            tempCanvas.dispose();

            if (annots.length > 0) pagesData[pageIdxStr] = annots;
        }

        if (Object.keys(pagesData).length === 0) {
            showToast(t('annotate_no_changes') || 'No annotations to save', 'warning');
            return;
        }

        var formData = new FormData();
        formData.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), pdfFileName);
        formData.append('annotations', JSON.stringify({ pages: pagesData }));

        try {
            document.getElementById('btnSave').disabled = true;
            document.getElementById('btnSave').innerHTML = '<span>⏳</span> ' + (t('processing') || 'Processing...');

            var resp = await fetch('/api/annotate/save', { method: 'POST', body: formData });
            if (!resp.ok) {
                var err = await resp.json().catch(function() { return {}; });
                throw new Error(err.detail || 'Save failed');
            }

            var blob = await resp.blob();
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = pdfFileName.replace('.pdf', '_annotated.pdf');
            a.click();
            URL.revokeObjectURL(url);
            showToast(t('annotate_save_success') || 'PDF saved successfully!', 'success');
        } catch (err) {
            console.error('Save error:', err);
            showToast(err.message || 'Failed to save PDF', 'error');
        } finally {
            document.getElementById('btnSave').disabled = false;
            document.getElementById('btnSave').innerHTML = '<span>💾</span> ' + (t('annotate_save') || 'Lưu PDF');
        }
    }

    function extractAnnotation(obj, scaleRatio) {
        var type = obj.annotType;
        var subType = obj.annotData;

        // Freehand drawing paths
        if (!type && obj.type === 'path') {
            return {
                type: 'drawing',
                path: obj.path ? obj.path.map(function(seg) {
                    return seg.slice(1).map(function(v) { return typeof v === 'number' ? v * scaleRatio : v; });
                }).filter(function(s) { return s.length >= 2; }) : [],
                x: (obj.left || 0) * scaleRatio,
                y: (obj.top || 0) * scaleRatio,
                color: obj.stroke || '#000000',
                strokeWidth: (obj.strokeWidth || 2) * scaleRatio
            };
        }

        if (!type) return null;

        var base = { x: (obj.left || 0) * scaleRatio, y: (obj.top || 0) * scaleRatio };

        if (type === 'text') {
            return Object.assign({}, base, { type: 'text', text: obj.text || '', fontSize: (obj.fontSize || 16) * scaleRatio * (obj.scaleX || 1), color: obj.fill || '#000000' });
        }

        if (type === 'highlight') {
            return Object.assign({}, base, { type: 'highlight', width: (obj.width || 0) * (obj.scaleX || 1) * scaleRatio, height: (obj.height || 0) * (obj.scaleY || 1) * scaleRatio, color: obj.fill || '#FFFF00', opacity: obj.opacity || 0.35 });
        }

        if (type === 'image' || type === 'signature') {
            var imageData = '';
            try { imageData = obj.toCanvasElement().toDataURL('image/png'); } catch (e) {}
            return Object.assign({}, base, { type: type, width: (obj.width || 0) * (obj.scaleX || 1) * scaleRatio, height: (obj.height || 0) * (obj.scaleY || 1) * scaleRatio, imageData: imageData });
        }

        if (type === 'shape') {
            var strokeColor = obj.stroke || '#000000';
            var fillColor = obj.fill || '';
            var strokeWidth = (obj.strokeWidth || 2) * scaleRatio;
            var opacity = obj.opacity || 1;
            var dashArray = obj.strokeDashArray || null;

            if (subType === 'rectangle') {
                return Object.assign({}, base, { type: 'shape', shape: 'rectangle', width: (obj.width || 0) * (obj.scaleX || 1) * scaleRatio, height: (obj.height || 0) * (obj.scaleY || 1) * scaleRatio, stroke: strokeColor, fill: fillColor, strokeWidth: strokeWidth, opacity: opacity, dashArray: dashArray });
            }
            if (subType === 'ellipse') {
                return Object.assign({}, base, { type: 'shape', shape: 'ellipse', rx: (obj.rx || 0) * (obj.scaleX || 1) * scaleRatio, ry: (obj.ry || 0) * (obj.scaleY || 1) * scaleRatio, stroke: strokeColor, fill: fillColor, strokeWidth: strokeWidth, opacity: opacity, dashArray: dashArray });
            }
            if (subType === 'line') {
                return { type: 'shape', shape: 'line', x1: (obj.x1 || 0) * scaleRatio, y1: (obj.y1 || 0) * scaleRatio, x2: (obj.x2 || 0) * scaleRatio, y2: (obj.y2 || 0) * scaleRatio, stroke: strokeColor, strokeWidth: strokeWidth, opacity: opacity, dashArray: dashArray, offsetX: (obj.left || 0) * scaleRatio, offsetY: (obj.top || 0) * scaleRatio };
            }
            if (subType === 'arrow') {
                var arrowImg = '';
                try { arrowImg = obj.toCanvasElement().toDataURL('image/png'); } catch (e) {}
                return Object.assign({}, base, { type: 'image', width: (obj.width || 0) * (obj.scaleX || 1) * scaleRatio, height: (obj.height || 0) * (obj.scaleY || 1) * scaleRatio, imageData: arrowImg });
            }
            if (subType === 'polygon' || subType === 'polyline') {
                var points = (obj.points || []).map(function(p) { return { x: p.x * scaleRatio, y: p.y * scaleRatio }; });
                return { type: 'shape', shape: subType, points: points, stroke: strokeColor, fill: fillColor, strokeWidth: strokeWidth, opacity: opacity, dashArray: dashArray };
            }
        }

        return null;
    }

    // ============ RESET ============
    function resetToUpload() {
        if (fabricCanvas) { fabricCanvas.clear(); fabricCanvas.dispose(); fabricCanvas = null; }
        pdfDoc = null; pdfBytes = null; pdfFileName = '';
        currentPage = 0; totalPagesCount = 0; scale = 1.5;
        Object.keys(pageAnnotations).forEach(function(k) { delete pageAnnotations[k]; });
        Object.keys(undoStacks).forEach(function(k) { delete undoStacks[k]; });
        Object.keys(redoStacks).forEach(function(k) { delete redoStacks[k]; });
        _polyPoints = [];
        thumbnailsList.innerHTML = '';
        fileInput.value = '';
        editorScreen.style.display = 'none';
        uploadScreen.style.display = 'flex';
        setTool('select');
    }

    // ============ i18n helper ============
    function t(key) {
        if (typeof window.t === 'function') return window.t(key);
        if (typeof TRANSLATIONS !== 'undefined') {
            var lang = localStorage.getItem('lang') || 'vi';
            return TRANSLATIONS[lang] && TRANSLATIONS[lang][key] || key;
        }
        return key;
    }

    // ============ BOOT ============
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
