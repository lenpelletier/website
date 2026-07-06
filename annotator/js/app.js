'use strict';

window.AppState = {
  image: null,
  imageData: null,
  annotations: [],
  selectedId: null,
  inProgress: null,
  activeTool: 'select',
  toolOptions: {
    color: '#ff0000',
    width: 2,
    fill: false,
    fillColor: 'rgba(255,0,0,0.2)',
    fontSize: 18,
    fontFamily:   'default',
    bold:         true,
    italic:       false,
    outline:      false,
    outlineColor: '#000000',
    outlineWidth: 2,
    shadow:       true,
    shadowColor:  '#000000',
    shadowBlur:   6,
  },
  zoom: 1,
  pan: { x: 0, y: 0 },
  markerCounter: 0,
  notes: '',
  canvas: null,
  stampSrcs: {},   // id → dataURL, kept outside history to avoid large JSON snapshots
};

const App = {
  history: null,
  _autoSaveTimer: null,
  _toastTimer: null,

  init() {
    const canvas = document.getElementById('main-canvas');
    window.AppState.canvas = canvas;
    this.history = new window.History(20);

    window.CanvasRenderer.init(canvas);
    this._setupCanvasEvents();
    this._setupToolbar();
    this._setupFileHandlers();
    this._setupSidePanel();
    this._setupModal();
    this._setupActionButtons();
    this._setupStampHandler();
    window.IconPicker.init();

    this.loadFromLocalStorage();
    this.pushHistory();
    this.setTool('select');
    window.CanvasRenderer.render();
  },

  _setupCanvasEvents() {
    const canvas = window.AppState.canvas;
    canvas.addEventListener('mousedown',  e => window.Tools.onMouseDown(e));
    canvas.addEventListener('mousemove',  e => window.Tools.onMouseMove(e));
    canvas.addEventListener('mouseup',    e => window.Tools.onMouseUp(e));
    canvas.addEventListener('mouseleave', e => { if (window.Tools.isDown) window.Tools.onMouseUp(e); });
    canvas.addEventListener('wheel',      e => window.Tools.onWheel(e), { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    // Touch events
    canvas.addEventListener('touchstart',  e => window.Tools.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove',   e => window.Tools.onTouchMove(e),  { passive: false });
    canvas.addEventListener('touchend',    e => window.Tools.onTouchEnd(e),   { passive: false });
    canvas.addEventListener('touchcancel', e => window.Tools.onTouchEnd(e),   { passive: false });
    document.addEventListener('keydown', e => window.Tools.onKeyDown(e));
    document.addEventListener('keyup',   e => window.Tools.onKeyUp(e));

    window.addEventListener('resize', () => {
      window.CanvasRenderer.resize();
      window.CanvasRenderer.render();
    });
  },

  _setupToolbar() {
    // Tool buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setTool(btn.dataset.tool));
    });

    // Color presets
    document.querySelectorAll('.color-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        window.AppState.toolOptions.color = btn.dataset.color;
        document.getElementById('color-picker').value = btn.dataset.color;
        this._updateToolOptionsUI();
        this._applyPropertyToSelected('color', btn.dataset.color);
      });
    });

    document.getElementById('color-picker').addEventListener('input', e => {
      window.AppState.toolOptions.color = e.target.value;
      this._updateToolOptionsUI();
      this._applyPropertyToSelected('color', e.target.value);
    });

    // Width buttons
    document.querySelectorAll('.width-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.width) {
          const v = parseInt(btn.dataset.width);
          window.AppState.toolOptions.width = v;
          this._updateToolOptionsUI();
          this._applyPropertyToSelected('width', v);
        } else if (btn.dataset.outlineWidth) {
          const v = parseInt(btn.dataset.outlineWidth);
          window.AppState.toolOptions.outlineWidth = v;
          this._updateToolOptionsUI();
          this._applyPropertyToSelected('outlineWidth', v);
        } else if (btn.dataset.shadowBlur) {
          const v = parseInt(btn.dataset.shadowBlur);
          window.AppState.toolOptions.shadowBlur = v;
          this._updateToolOptionsUI();
          this._applyPropertyToSelected('shadowBlur', v);
        }
      });
    });

    // Fill toggle
    document.getElementById('fill-toggle').addEventListener('change', e => {
      window.AppState.toolOptions.fill = e.target.checked;
      this._applyPropertyToSelected('fill', e.target.checked);
    });

    // Font size
    document.querySelectorAll('.fontsize-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = parseInt(btn.dataset.size);
        window.AppState.toolOptions.fontSize = v;
        this._updateToolOptionsUI();
        this._applyPropertyToSelected('fontSize', v);
      });
    });

    // Font family
    document.getElementById('font-family-select').addEventListener('change', e => {
      window.AppState.toolOptions.fontFamily = e.target.value;
      this._applyPropertyToSelected('fontFamily', e.target.value);
    });

    // Bold / Italic toggles — read current value from annotation if one is selected,
    // so the toggle works correctly even when toolOptions has drifted.
    document.getElementById('bold-btn').addEventListener('click', () => {
      const state = window.AppState;
      const ann = state.selectedId ? state.annotations.find(a => a.id === state.selectedId) : null;
      const cur = ann ? ann.bold !== false : state.toolOptions.bold !== false;
      const newVal = !cur;
      state.toolOptions.bold = newVal;
      this._updateToolOptionsUI();
      this._applyPropertyToSelected('bold', newVal);
    });
    document.getElementById('italic-btn').addEventListener('click', () => {
      const state = window.AppState;
      const ann = state.selectedId ? state.annotations.find(a => a.id === state.selectedId) : null;
      const cur = ann ? !!ann.italic : !!state.toolOptions.italic;
      const newVal = !cur;
      state.toolOptions.italic = newVal;
      this._updateToolOptionsUI();
      this._applyPropertyToSelected('italic', newVal);
    });

    // Outline
    document.getElementById('outline-toggle').addEventListener('change', e => {
      window.AppState.toolOptions.outline = e.target.checked;
      this._applyPropertyToSelected('outline', e.target.checked);
    });
    document.getElementById('outline-color-picker').addEventListener('input', e => {
      window.AppState.toolOptions.outlineColor = e.target.value;
      this._applyPropertyToSelected('outlineColor', e.target.value);
    });

    // Shadow
    document.getElementById('shadow-toggle').addEventListener('change', e => {
      window.AppState.toolOptions.shadow = e.target.checked;
      this._applyPropertyToSelected('shadow', e.target.checked);
    });
    document.getElementById('shadow-color-picker').addEventListener('input', e => {
      window.AppState.toolOptions.shadowColor = e.target.value;
      this._applyPropertyToSelected('shadowColor', e.target.value);
    });

    // Undo/Redo
    document.getElementById('undo-btn').addEventListener('click', () => this.undo());
    document.getElementById('redo-btn').addEventListener('click', () => this.redo());

    // Zoom
    document.getElementById('zoom-in').addEventListener('click', () => this._zoomBy(1.25));
    document.getElementById('zoom-out').addEventListener('click', () => this._zoomBy(0.8));
    document.getElementById('zoom-fit').addEventListener('click', () => {
      if (window.AppState.image) {
        window.CanvasRenderer.fitImage(window.AppState.image);
        window.CanvasRenderer.render();
      }
    });
  },

  _setupFileHandlers() {
    const dropZone   = document.getElementById('drop-zone');
    const fileInput  = document.getElementById('file-input');
    const container  = document.getElementById('canvas-container');

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => {
      if (e.target.files[0]) this.loadImage(e.target.files[0]);
      e.target.value = '';
    });

    container.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    container.addEventListener('drop', e => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        if (window.AppState.image) {
          if (confirm('Replace the current map? Annotations will be kept.')) this.loadImage(file);
        } else {
          this.loadImage(file);
        }
      }
    });

    // Replace image
    const replaceBtn   = document.getElementById('replace-image-btn');
    const replaceInput = document.getElementById('replace-image-input');
    replaceBtn.addEventListener('click', () => replaceInput.click());
    replaceInput.addEventListener('change', e => {
      if (e.target.files[0]) {
        if (confirm('Replace the current map? Annotations will be kept.')) this.loadImage(e.target.files[0]);
        e.target.value = '';
      }
    });
  },

  _setupSidePanel() {
    document.getElementById('apply-markdown').addEventListener('click', () => this.applyMarkdown());
    document.getElementById('copy-markdown').addEventListener('click', () => this.copyMarkdown());

    // Mobile panel toggle
    const panelToggleBtn = document.getElementById('panel-toggle');
    const rightPanel     = document.getElementById('right-panel');
    const backdrop       = document.getElementById('panel-backdrop');
    if (panelToggleBtn) {
      const closePanel = () => {
        rightPanel.classList.remove('open');
        backdrop.classList.remove('visible');
        panelToggleBtn.classList.remove('open');
      };
      panelToggleBtn.addEventListener('click', () => {
        const isOpen = rightPanel.classList.toggle('open');
        backdrop.classList.toggle('visible', isOpen);
        panelToggleBtn.classList.toggle('open', isOpen);
      });
      backdrop.addEventListener('click', closePanel);
    }
  },

  _setupModal() {
    document.getElementById('export-modal-close').addEventListener('click', () => {
      document.getElementById('export-modal').classList.add('hidden');
    });
    document.getElementById('export-modal').addEventListener('click', e => {
      if (e.target === document.getElementById('export-modal')) {
        document.getElementById('export-modal').classList.add('hidden');
      }
    });
  },

  _setupActionButtons() {
    document.getElementById('export-image').addEventListener('click', () => window.Export.exportImage());
    document.getElementById('copy-forum').addEventListener('click', () => window.Export.uploadToImgbb());

    document.getElementById('save-session').addEventListener('click', () => this.saveSession());

    const loadSessionBtn   = document.getElementById('load-session-btn');
    const loadSessionInput = document.getElementById('load-session-input');
    loadSessionBtn.addEventListener('click', () => loadSessionInput.click());
    loadSessionInput.addEventListener('change', e => {
      if (e.target.files[0]) this.loadSession(e.target.files[0]);
      e.target.value = '';
    });
  },

  // ---- TOOLS ----
  setTool(tool) {
    // Stamp opens the icon picker panel instead of switching modes
    if (tool === 'stamp') {
      if (!window.AppState.image) {
        this.showToast('Load a map image first.', 2500);
        return;
      }
      window.IconPicker.open();
      return;
    }

    const state = window.AppState;
    state.activeTool = tool;
    state.inProgress = null;

    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });

    const cursors = {
      select: 'default', pan: 'grab', text: 'text', arrow: 'crosshair',
      line: 'crosshair', circle: 'crosshair', rect: 'crosshair',
      freehand: 'crosshair', marker: 'crosshair',
    };
    state.canvas.style.cursor = cursors[tool] || 'default';

    // Show/hide context-sensitive options
    document.getElementById('fill-option').style.display     = ['circle','rect'].includes(tool)   ? 'flex' : 'none';
    document.getElementById('fontsize-option').style.display = ['text','marker'].includes(tool)   ? 'flex' : 'none';
    this._syncTextOptionsVisibility();

    window.CanvasRenderer.render();
  },

  _updateToolOptionsUI() {
    const opts = window.AppState.toolOptions;
    document.getElementById('color-picker').value = opts.color;
    document.querySelectorAll('.color-preset').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color.toLowerCase() === opts.color.toLowerCase());
    });
    document.querySelectorAll('.width-btn[data-width]').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.width) === opts.width);
    });
    document.querySelectorAll('.fontsize-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.size) === opts.fontSize);
    });
    document.getElementById('fill-toggle').checked = opts.fill;

    // Text-specific
    document.getElementById('font-family-select').value = opts.fontFamily || 'default';
    document.getElementById('bold-btn').classList.toggle('active', opts.bold !== false);
    document.getElementById('italic-btn').classList.toggle('active', !!opts.italic);
    document.getElementById('outline-toggle').checked = !!opts.outline;
    document.getElementById('outline-color-picker').value = opts.outlineColor || '#000000';
    document.querySelectorAll('.width-btn[data-outline-width]').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.outlineWidth) === (opts.outlineWidth || 2));
    });
    document.getElementById('shadow-toggle').checked = opts.shadow !== false;
    document.getElementById('shadow-color-picker').value = opts.shadowColor || '#000000';
    document.querySelectorAll('.width-btn[data-shadow-blur]').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.shadowBlur) === (opts.shadowBlur || 6));
    });
  },

  // Apply a single changed property to the selected annotation.
  // This prevents toolbar interactions from clobbering unrelated annotation
  // properties when toolOptions has drifted from the annotation's current state.
  _applyPropertyToSelected(key, value) {
    const state = window.AppState;
    if (!state.selectedId) return;
    const ann = state.annotations.find(a => a.id === state.selectedId);
    if (!ann) return;

    switch (key) {
      case 'color':
        if (ann.type === 'stamp' && ann.stockIcon) {
          ann.iconColor = value;
          delete window.CanvasRenderer._stampImages[ann.id];
          delete state.stampSrcs[ann.id];
        } else {
          ann.color = value;
          if ('fill' in ann) ann.fillColor = 'rgba(' + this._hexToRgb(value) + ',0.25)';
        }
        break;
      case 'width':    if ('width'    in ann) ann.width    = value; break;
      case 'fill':     if ('fill'     in ann) { ann.fill = value; ann.fillColor = 'rgba(' + this._hexToRgb(ann.color || '#ff0000') + ',0.25)'; } break;
      case 'fontSize': if ('fontSize' in ann) ann.fontSize = value; break;
      case 'fontFamily':   if (ann.type === 'text') ann.fontFamily   = value; break;
      case 'bold':         if (ann.type === 'text') ann.bold         = value; break;
      case 'italic':       if (ann.type === 'text') ann.italic       = value; break;
      case 'outline':      if (ann.type === 'text') ann.outline      = value; break;
      case 'outlineColor': if (ann.type === 'text') ann.outlineColor = value; break;
      case 'outlineWidth': if (ann.type === 'text') ann.outlineWidth = value; break;
      case 'shadow':       if (ann.type === 'text') ann.shadow       = value; break;
      case 'shadowColor':  if (ann.type === 'text') ann.shadowColor  = value; break;
      case 'shadowBlur':   if (ann.type === 'text') ann.shadowBlur   = value; break;
    }

    window.CanvasRenderer.render();
    this.syncMarkdown();
  },

  // Called whenever an annotation is selected or deselected (from canvas or list).
  // Syncs toolOptions and text-specific UI from the annotation's actual values.
  onAnnotationSelected(ann) {
    const state = window.AppState;
    if (ann) {
      if (ann.type === 'stamp' && ann.stockIcon) {
        state.toolOptions.color = ann.iconColor || '#4466ff';
      } else {
        if (ann.color)     state.toolOptions.color    = ann.color;
        if (ann.width)     state.toolOptions.width    = ann.width;
        if ('fill' in ann) state.toolOptions.fill     = ann.fill;
        if (ann.fontSize)  state.toolOptions.fontSize = ann.fontSize;
      }
      if (ann.type === 'text') {
        const opts = state.toolOptions;
        opts.fontFamily   = ann.fontFamily   || 'default';
        opts.bold         = ann.bold !== false;
        opts.italic       = !!ann.italic;
        opts.outline      = !!ann.outline;
        opts.outlineColor = ann.outlineColor || '#000000';
        opts.outlineWidth = ann.outlineWidth || 2;
        opts.shadow       = ann.shadow !== false;
        opts.shadowColor  = ann.shadowColor  || '#000000';
        opts.shadowBlur   = typeof ann.shadowBlur === 'number' ? ann.shadowBlur : 6;
      }
    }
    this._updateToolOptionsUI();
    this._syncTextOptionsVisibility();
  },

  _syncTextOptionsVisibility() {
    const state = window.AppState;
    const isText = state.activeTool === 'text' ||
      (state.selectedId && state.annotations.find(a => a.id === state.selectedId && a.type === 'text'));
    const d = isText ? 'flex' : 'none';
    document.getElementById('text-sep').style.display           = isText ? 'block' : 'none';
    document.getElementById('text-font-option').style.display   = d;
    document.getElementById('text-style-option').style.display  = d;
    document.getElementById('text-outline-option').style.display = d;
    document.getElementById('text-shadow-option').style.display  = d;
  },

  _hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
  },

  // ---- STAMP ----
  _setupStampHandler() {
    document.getElementById('stamp-input').addEventListener('change', e => {
      if (e.target.files[0]) this._addStamp(e.target.files[0]);
      e.target.value = '';
    });
  },

  _addStamp(file) {
    const state = window.AppState;
    const reader = new FileReader();
    reader.onload = e => {
      const src = e.target.result;
      const img = new Image();
      img.onload = () => {
        // Place at viewport center, cap natural size to 300px
        const { width: cw, height: ch } = window.CanvasRenderer.getCSSSize();
        const center = window.CanvasRenderer.screenToImage(cw / 2, ch / 2);
        const maxDim = 300;
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > maxDim || h > maxDim) {
          const scale = maxDim / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        const ann = window.Annotations.createStamp(
          center.x - w / 2, center.y - h / 2, w, h, ''
        );
        state.stampSrcs[ann.id] = src;
        state.annotations.push(ann);
        state.selectedId = ann.id;
        this.pushHistory();
        this.syncMarkdown();
        this.updateAnnotationList();
        window.CanvasRenderer.render();
        this.setTool('select');
        this.showToast('Image added — uploading to imgbb…', 5000);
        window.Export.uploadBase64ToImgbb(src.split(',')[1])
          .then(url => {
            ann.imgbbUrl = url;
            this.syncMarkdown();
            this.showToast('Image stamp uploaded to imgbb!');
          })
          .catch(err => {
            this.showToast('imgbb upload failed: ' + err.message, 5000);
          });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  },

  // Place a stock icon stamp at the centre of the current viewport
  _addStampFromIcon(icon) {
    const state = window.AppState;
    const { width: cw, height: ch } = window.CanvasRenderer.getCSSSize();
    const center = window.CanvasRenderer.screenToImage(cw / 2, ch / 2);
    // Default to ~80 screen-pixels regardless of current zoom
    const size = Math.max(20, Math.round(80 / state.zoom));
    const ann  = window.Annotations.createStamp(
      center.x - size / 2, center.y - size / 2, size, size,
      '', icon.author + '/' + icon.slug, state.toolOptions.color
    );
    state.annotations.push(ann);
    state.selectedId = ann.id;
    this.pushHistory();
    this.syncMarkdown();
    this.updateAnnotationList();
    window.CanvasRenderer.render();
    window.IconPicker.close();
    this.setTool('select');
  },

  // ---- IMAGE ----
  loadImage(file) {
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      if (dataUrl.length > 5 * 1024 * 1024) {
        this.showToast('Large image (>5MB) — auto-save may be slow.', 4000);
      }
      const img = new Image();
      img.onload = () => {
        window.AppState.image    = img;
        window.AppState.imageData = dataUrl;
        document.getElementById('drop-zone').classList.add('hidden');
        document.getElementById('replace-image-btn').classList.remove('hidden');
        window.CanvasRenderer.fitImage(img);
        window.CanvasRenderer.render();
        this.autoSave();
        this.showToast('Image loaded.');
      };
      img.onerror = () => this.showToast('Failed to load image.', 3000);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  },

  // ---- MARKDOWN SYNC ----
  applyMarkdown() {
    const text = document.getElementById('markdown-editor').value;
    const result = window.MarkdownParser.parseMarkdown(text);
    const state = window.AppState;

    // Stamps with an imgbbUrl are now round-tripped through markdown.
    // For any freshly-parsed stamp, try to restore the local data URL from the
    // existing stampSrcs (matched by imgbbUrl) so the canvas doesn't re-fetch.
    for (const ann of result.annotations) {
      if (ann.type === 'stamp' && ann.imgbbUrl) {
        const prev = state.annotations.find(a => a.type === 'stamp' && a.imgbbUrl === ann.imgbbUrl);
        if (prev && state.stampSrcs[prev.id]) {
          state.stampSrcs[ann.id] = state.stampSrcs[prev.id];
        }
      }
    }

    // Stamps still pending upload (no imgbbUrl, no stockIcon) aren't in markdown yet — preserve them
    const pendingStamps = state.annotations.filter(a => a.type === 'stamp' && !a.imgbbUrl && !a.stockIcon);
    state.annotations   = [...pendingStamps, ...result.annotations];
    state.notes         = result.notes;
    state.markerCounter = result.markerCounter;
    this.pushHistory();
    this.updateAnnotationList();
    window.CanvasRenderer.render();
    this.showToast('Markdown applied.');
  },

  syncMarkdown() {
    const state = window.AppState;
    const text = window.MarkdownParser.generateMarkdown(state.annotations, state.notes);
    document.getElementById('markdown-editor').value = text;
    this.autoSave();
  },

  copyMarkdown() {
    const text = document.getElementById('markdown-editor').value;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => this.showToast('Markdown copied!'));
    } else {
      window.prompt('Copy markdown:', text);
    }
  },

  // ---- ANNOTATION LIST ----
  updateAnnotationList() {
    const state = window.AppState;
    const list  = document.getElementById('annotation-list');
    list.innerHTML = '';

    if (state.annotations.length === 0) {
      list.innerHTML = '<div class="ann-empty">No annotations yet.</div>';
      return;
    }

    // Show in reverse order (top = most recent)
    for (let i = state.annotations.length - 1; i >= 0; i--) {
      const ann  = state.annotations[i];
      const item = document.createElement('div');
      item.className = 'annotation-item' + (ann.id === state.selectedId ? ' selected' : '');
      item.dataset.id = ann.id;

      const label = this._annLabel(ann);
      const dotColor = (ann.type === 'stamp' && ann.stockIcon)
        ? (ann.iconColor || '#4466ff')
        : (ann.color || '#ff0000');
      const colorDot = `<span class="ann-color-dot" style="background:${dotColor}"></span>`;

      item.innerHTML = `
        <div class="ann-left">
          ${colorDot}
          <span class="ann-type-badge ann-${ann.type}">${this._annTypeName(ann)}</span>
          <span class="ann-label" title="${label}">${label}</span>
        </div>
        <div class="ann-controls">
          <button class="ann-btn ann-vis-btn" title="${ann.visible ? 'Hide' : 'Show'}">${ann.visible ? '●' : '○'}</button>
          <button class="ann-btn ann-del-btn" title="Delete (Del)">✕</button>
        </div>`;

      item.addEventListener('click', e => {
        if (e.target.closest('.ann-controls')) return;
        state.selectedId = ann.id;
        this.onAnnotationSelected(ann);
        this.updateAnnotationList();
        window.CanvasRenderer.render();
      });

      item.querySelector('.ann-vis-btn').addEventListener('click', e => {
        e.stopPropagation();
        ann.visible = !ann.visible;
        this.updateAnnotationList();
        window.CanvasRenderer.render();
        this.syncMarkdown();
      });

      item.querySelector('.ann-del-btn').addEventListener('click', e => {
        e.stopPropagation();
        state.annotations = state.annotations.filter(a => a.id !== ann.id);
        if (state.selectedId === ann.id) state.selectedId = null;
        this.pushHistory();
        this.updateAnnotationList();
        this.syncMarkdown();
        window.CanvasRenderer.render();
      });

      list.appendChild(item);
    }
  },

  _annTypeName(ann) {
    const names = { marker:'#', text:'T', arrow:'→', line:'—', circle:'○', rect:'□', freehand:'~', stamp:'IMG' };
    return names[ann.type] || ann.type;
  },

  _annLabel(ann) {
    const esc = s => (s || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    switch (ann.type) {
      case 'marker':   return esc(`[${ann.number}] ${ann.label || ''}`);
      case 'text':     return esc(`"${ann.text || ''}"`);
      case 'arrow':    return esc(`Arrow ${ann.label ? '"'+ann.label+'"' : ''}`);
      case 'line':     return esc(`Line ${ann.label ? '"'+ann.label+'"' : ''}`);
      case 'circle':   return esc(`Circle ${ann.label ? '"'+ann.label+'"' : ''}`);
      case 'rect':     return esc(`Rect ${ann.label ? '"'+ann.label+'"' : ''}`);
      case 'freehand': return esc(`Path ${ann.label ? '"'+ann.label+'"' : ''}`);
      case 'stamp':    return esc(`Image ${ann.imgbbUrl ? '(imgbb)' : '(local)'}`);
    }
    return ann.type;
  },

  // ---- TEXT INPUT OVERLAY ----
  showTextInput(imgX, imgY, screenX, screenY) {
    const state = window.AppState;

    // Get or create the overlay element
    let overlay = document.getElementById('text-input-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'text-input-overlay';
      document.getElementById('canvas-container').appendChild(overlay);
    }

    // Rebuild innerHTML each call so event listeners are always fresh
    overlay.innerHTML = `
      <input type="text" placeholder="Enter label text..." autocomplete="off">
      <button class="ok-btn">OK</button>
      <button class="cancel-btn">✕</button>`;

    const container = document.getElementById('canvas-container');
    const cRect = container.getBoundingClientRect();
    overlay.style.left    = Math.min(screenX, cRect.width - 280) + 'px';
    overlay.style.top     = Math.min(screenY + 10, cRect.height - 50) + 'px';
    overlay.style.display = 'flex';

    const field = overlay.querySelector('input');
    field.focus();

    const finalize = () => {
      const text = field.value.trim();
      overlay.style.display = 'none';
      if (text) {
        const ann = window.Annotations.createText(imgX, imgY, text, state.toolOptions);
        state.annotations.push(ann);
        state.selectedId = ann.id;
        this.pushHistory();
        this.syncMarkdown();
        this.updateAnnotationList();
        window.CanvasRenderer.render();
      }
    };

    const cancel = () => { overlay.style.display = 'none'; };

    overlay.querySelector('.ok-btn').addEventListener('click', finalize);
    overlay.querySelector('.cancel-btn').addEventListener('click', cancel);
    field.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); finalize(); }
      if (e.key === 'Escape') cancel();
    });
  },

  // ---- HISTORY ----
  pushHistory() {
    const state = window.AppState;
    this.history.push({
      annotations:   state.annotations,
      notes:         state.notes,
      markerCounter: state.markerCounter,
    });
    this._updateUndoRedoBtns();
  },

  undo() {
    const snap = this.history.undo();
    if (snap) this._restoreSnapshot(snap);
    this._updateUndoRedoBtns();
  },

  redo() {
    const snap = this.history.redo();
    if (snap) this._restoreSnapshot(snap);
    this._updateUndoRedoBtns();
  },

  _restoreSnapshot(snap) {
    const state = window.AppState;
    state.annotations   = snap.annotations;
    state.notes         = snap.notes;
    state.markerCounter = snap.markerCounter;
    state.selectedId    = null;
    this._syncTextOptionsVisibility();
    this.syncMarkdown();
    this.updateAnnotationList();
    window.CanvasRenderer.render();
  },

  _updateUndoRedoBtns() {
    document.getElementById('undo-btn').disabled = !this.history.canUndo();
    document.getElementById('redo-btn').disabled = !this.history.canRedo();
  },

  // ---- ZOOM ----
  _zoomBy(factor) {
    const state = window.AppState;
    const { width: cw, height: ch } = window.CanvasRenderer.getCSSSize();
    const cx = cw / 2, cy = ch / 2;
    const newZoom = Math.max(0.05, Math.min(20, state.zoom * factor));
    state.pan.x = cx - (cx - state.pan.x) * (newZoom / state.zoom);
    state.pan.y = cy - (cy - state.pan.y) * (newZoom / state.zoom);
    state.zoom  = newZoom;
    window.CanvasRenderer.render();
  },

  // ---- AUTO-SAVE ----
  autoSave() {
    clearTimeout(this._autoSaveTimer);
    this._autoSaveTimer = setTimeout(() => this.saveToLocalStorage(), 2000);
  },

  saveToLocalStorage() {
    try {
      const state = window.AppState;
      const payload = JSON.stringify({
        annotations:   state.annotations,
        notes:         state.notes,
        markerCounter: state.markerCounter,
        imageData:     state.imageData,
        stampSrcs:     state.stampSrcs,
      });
      localStorage.setItem('pbp-annotator-v1', payload);
    } catch (err) {
      console.warn('Auto-save failed:', err);
    }
  },

  loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem('pbp-annotator-v1');
      if (!raw) return;
      const data = JSON.parse(raw);

      window.AppState.annotations   = data.annotations   || [];
      window.AppState.notes         = data.notes         || '';
      window.AppState.markerCounter = data.markerCounter || 0;
      window.AppState.stampSrcs     = data.stampSrcs     || {};

      if (data.imageData) {
        const img = new Image();
        img.onload = () => {
          window.AppState.image     = img;
          window.AppState.imageData = data.imageData;
          document.getElementById('drop-zone').classList.add('hidden');
          document.getElementById('replace-image-btn').classList.remove('hidden');
          window.CanvasRenderer.fitImage(img);
          window.CanvasRenderer.render();
        };
        img.src = data.imageData;
      }

      this.syncMarkdown();
      this.updateAnnotationList();
      this.showToast('Session restored.', 2000);
    } catch (err) {
      console.warn('Could not restore session:', err);
    }
  },

  // ---- SESSION SAVE/LOAD ----
  saveSession() {
    const state = window.AppState;
    const data  = {
      version:       1,
      annotations:   state.annotations,
      notes:         state.notes,
      markerCounter: state.markerCounter,
      imageData:     state.imageData,
      markdown:      document.getElementById('markdown-editor').value,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'map-session.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    this.showToast('Session saved!');
  },

  loadSession(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        const state = window.AppState;

        state.annotations   = data.annotations   || [];
        state.notes         = data.notes         || '';
        state.markerCounter = data.markerCounter || 0;
        state.selectedId    = null;
        state.stampSrcs     = data.stampSrcs     || {};

        const restoreUI = () => {
          if (data.markdown) {
            document.getElementById('markdown-editor').value = data.markdown;
          } else {
            this.syncMarkdown();
          }
          this.pushHistory();
          this.updateAnnotationList();
          window.CanvasRenderer.render();
          this.showToast('Session loaded!');
        };

        if (data.imageData) {
          const img = new Image();
          img.onload = () => {
            state.image     = img;
            state.imageData = data.imageData;
            document.getElementById('drop-zone').classList.add('hidden');
            document.getElementById('replace-image-btn').classList.remove('hidden');
            window.CanvasRenderer.fitImage(img);
            restoreUI();
          };
          img.src = data.imageData;
        } else {
          restoreUI();
        }
      } catch (err) {
        alert('Could not load session: ' + err.message);
      }
    };
    reader.readAsText(file);
  },

  // ---- TOAST ----
  showToast(message, duration) {
    duration = duration || 2000;
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('visible'), duration);
  },
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
