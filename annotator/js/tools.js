'use strict';

const Tools = {
  isDown: false,
  startX: 0, startY: 0,
  dragAnnotation: null,
  dragHandle: null,
  dragOffsetX: 0, dragOffsetY: 0,
  isPanning: false,
  panStartX: 0, panStartY: 0,
  panStartPanX: 0, panStartPanY: 0,
  isSpacePanning: false,
  lastFreehandPoint: null,
  _hoverX: null, _hoverY: null,   // screen-space cursor, for the fog brush ring

  // Touch / pinch state
  _pinching: false,
  _pinchStartDist: 0,
  _pinchStartZoom: 0,
  _pinchMidX: 0,
  _pinchMidY: 0,
  _pinchPanStartX: 0,
  _pinchPanStartY: 0,

  _pos(e) {
    const rect = window.AppState.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  },

  onMouseDown(e) {
    const state = window.AppState;
    if (!state.image) return;
    const { x, y } = this._pos(e);
    this.isDown = true;
    this.startX = x;
    this.startY = y;

    // Pan tool, middle mouse, or space+left = pan
    if (state.activeTool === 'pan' || e.button === 1 || (e.button === 0 && this.isSpacePanning)) {
      this.isPanning = true;
      this.panStartX = x; this.panStartY = y;
      this.panStartPanX = state.pan.x; this.panStartPanY = state.pan.y;
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;

    const img = window.CanvasRenderer.screenToImage(x, y);

    switch (state.activeTool) {
      case 'select':   this._selectDown(x, y, img); break;
      case 'text':     this._textDown(img, x, y); break;
      case 'marker':   this._markerDown(img); break;
      case 'arrow':
      case 'line':
      case 'circle':
      case 'rect':
      case 'freehand': this._drawDown(x, y, img); break;
      case 'fog-brush':
      case 'fog-rect':
      case 'fog-ellipse': this._fogDown(img); break;
      // 'pan' is handled above via the isPanning branch
    }
  },

  onMouseMove(e) {
    const state = window.AppState;
    if (!state.image) return;
    const { x, y } = this._pos(e);
    this._hoverX = x; this._hoverY = y;

    if (this.isPanning) {
      state.pan.x = this.panStartPanX + (x - this.panStartX);
      state.pan.y = this.panStartPanY + (y - this.panStartY);
      window.CanvasRenderer.render();
      return;
    }

    // Update cursor for select/pan tool hover
    if (!this.isDown) {
      if (state.activeTool === 'select') {
        const hit = window.CanvasRenderer.hitTest(x, y);
        state.canvas.style.cursor = hit ? 'move' : 'default';
      } else if (state.activeTool === 'pan') {
        state.canvas.style.cursor = 'grab';
      } else if (state.activeTool === 'fog-brush') {
        // Redraw so the brush ring follows the cursor
        window.CanvasRenderer.render();
      }
    }

    if (!this.isDown) return;
    const img = window.CanvasRenderer.screenToImage(x, y);

    switch (state.activeTool) {
      case 'select':   this._selectMove(x, y, img); break;
      case 'arrow':
      case 'line':
      case 'circle':
      case 'rect':     this._drawMove(img); break;
      case 'freehand': this._freehandMove(img); break;
      case 'fog-brush':
      case 'fog-rect':
      case 'fog-ellipse': this._fogMove(img); break;
    }
  },

  onMouseUp(e) {
    const state = window.AppState;
    const { x, y } = this._pos(e);

    if (this.isPanning) {
      this.isPanning = false;
      this.isDown = false;
      return;
    }
    if (!this.isDown) return;
    this.isDown = false;
    const img = window.CanvasRenderer.screenToImage(x, y);

    switch (state.activeTool) {
      case 'select':   this._selectUp(); break;
      case 'arrow':
      case 'line':
      case 'circle':
      case 'rect':     this._drawUp(x, y); break;
      case 'freehand': this._freehandUp(); break;
      case 'fog-brush':
      case 'fog-rect':
      case 'fog-ellipse': this._fogUp(); break;
    }
  },

  // ---- SELECT ----
  _selectDown(sx, sy, img) {
    const state = window.AppState;

    // Check handle on selected annotation first
    if (state.selectedId) {
      const ann = state.annotations.find(a => a.id === state.selectedId);
      if (ann) {
        const handle = window.CanvasRenderer.hitTestHandle(ann, sx, sy, state.zoom, state.pan);
        if (handle) {
          this.dragHandle = handle;
          this.dragAnnotation = ann;
          return;
        }
      }
    }

    const ann = window.CanvasRenderer.hitTest(sx, sy);
    if (ann) {
      state.selectedId = ann.id;
      this.dragAnnotation = ann;
      this.dragHandle = null;
      this.dragOffsetX = img.x - this._originX(ann);
      this.dragOffsetY = img.y - this._originY(ann);
      window.App.onAnnotationSelected(ann);
      window.App.updateAnnotationList();
    } else {
      state.selectedId = null;
      this.dragAnnotation = null;
      window.App.onAnnotationSelected(null);
      window.App.updateAnnotationList();
    }
    window.CanvasRenderer.render();
  },

  _selectMove(sx, sy, img) {
    if (!this.dragAnnotation) return;
    if (this.dragHandle) {
      this._resize(this.dragAnnotation, this.dragHandle, img);
    } else {
      this._move(this.dragAnnotation, img);
    }
    window.CanvasRenderer.render();
  },

  _selectUp() {
    if (this.dragAnnotation) {
      window.App.pushHistory();
      window.App.syncMarkdown();
    }
    this.dragAnnotation = null;
    this.dragHandle = null;
  },

  _originX(ann) {
    switch (ann.type) {
      case 'marker': case 'text':  return ann.x;
      case 'arrow':  case 'line':  return ann.x1;
      case 'circle':               return ann.cx;
      case 'rect':                 return ann.x1;
      case 'freehand': return ann.points[0] ? ann.points[0].x : 0;
      case 'stamp':                return ann.x;
    }
    return 0;
  },

  _originY(ann) {
    switch (ann.type) {
      case 'marker': case 'text':  return ann.y;
      case 'arrow':  case 'line':  return ann.y1;
      case 'circle':               return ann.cy;
      case 'rect':                 return ann.y1;
      case 'freehand': return ann.points[0] ? ann.points[0].y : 0;
      case 'stamp':                return ann.y;
    }
    return 0;
  },

  _move(ann, img) {
    const dx = img.x - this.dragOffsetX - this._originX(ann);
    const dy = img.y - this.dragOffsetY - this._originY(ann);
    switch (ann.type) {
      case 'marker': case 'text':
        ann.x += dx; ann.y += dy; break;
      case 'arrow': case 'line':
        ann.x1 += dx; ann.y1 += dy; ann.x2 += dx; ann.y2 += dy; break;
      case 'circle':
        ann.cx += dx; ann.cy += dy; break;
      case 'rect':
        ann.x1 += dx; ann.y1 += dy; ann.x2 += dx; ann.y2 += dy; break;
      case 'freehand':
        for (const p of ann.points) { p.x += dx; p.y += dy; } break;
      case 'stamp':
        ann.x += dx; ann.y += dy; break;
    }
    this.dragOffsetX = img.x - this._originX(ann);
    this.dragOffsetY = img.y - this._originY(ann);
  },

  _resize(ann, handle, img) {
    switch (ann.type) {
      case 'marker':
        if (handle.role === 'scale') {
          // Distance from center to cursor → derive font size
          const dist = Math.hypot(img.x - ann.x, img.y - ann.y);
          // r = fontSize * 1.2, so fontSize = dist / 1.2
          ann.fontSize = Math.max(6, Math.round(dist / 1.2));
        } else {
          // 'center' handle — reposition the marker
          ann.x = img.x; ann.y = img.y;
        }
        break;
      case 'text':
        if (handle.role === 'scale') {
          // Horizontal distance from origin → derive font size
          const dx = img.x - ann.x;
          // scale handle starts at ann.x + fontSize*2, so fontSize ≈ dx/2
          ann.fontSize = Math.max(6, Math.round(Math.abs(dx) / 2));
        } else {
          // 'origin' handle — reposition the text
          ann.x = img.x; ann.y = img.y;
        }
        break;
      case 'arrow': case 'line':
        if (handle.role === 'p1') { ann.x1 = img.x; ann.y1 = img.y; }
        else                      { ann.x2 = img.x; ann.y2 = img.y; }
        break;
      case 'circle':
        if (handle.role === 'center') { ann.cx = img.x; ann.cy = img.y; }
        else { ann.r = Math.max(2, Math.hypot(img.x - ann.cx, img.y - ann.cy)); }
        break;
      case 'rect':
        if      (handle.role === 'tl') { ann.x1 = img.x; ann.y1 = img.y; }
        else if (handle.role === 'tr') { ann.x2 = img.x; ann.y1 = img.y; }
        else if (handle.role === 'bl') { ann.x1 = img.x; ann.y2 = img.y; }
        else                           { ann.x2 = img.x; ann.y2 = img.y; }
        break;
      case 'stamp': {
        const right  = ann.x + ann.width;
        const bottom = ann.y + ann.height;
        if (handle.role === 'tl') {
          ann.width  = Math.max(10, right  - img.x);
          ann.height = Math.max(10, bottom - img.y);
          ann.x = right  - ann.width;
          ann.y = bottom - ann.height;
        } else if (handle.role === 'tr') {
          ann.width  = Math.max(10, img.x - ann.x);
          ann.height = Math.max(10, bottom - img.y);
          ann.y = bottom - ann.height;
        } else if (handle.role === 'bl') {
          ann.width  = Math.max(10, right - img.x);
          ann.height = Math.max(10, img.y - ann.y);
          ann.x = right - ann.width;
        } else {
          ann.width  = Math.max(10, img.x - ann.x);
          ann.height = Math.max(10, img.y - ann.y);
        }
        break;
      }
    }
  },

  // ---- DRAW tools ----
  _drawDown(sx, sy, img) {
    const state = window.AppState;
    const opts = Object.assign({}, state.toolOptions);

    switch (state.activeTool) {
      case 'arrow':
        state.inProgress = window.Annotations.createArrow(img.x, img.y, img.x, img.y, opts);
        break;
      case 'line':
        state.inProgress = window.Annotations.createLine(img.x, img.y, img.x, img.y, opts);
        break;
      case 'circle':
        state.inProgress = window.Annotations.createCircle(img.x, img.y, 1, opts);
        break;
      case 'rect':
        state.inProgress = window.Annotations.createRect(img.x, img.y, img.x, img.y, opts);
        break;
      case 'freehand':
        state.inProgress = window.Annotations.createFreehand([{ x: img.x, y: img.y }], opts);
        this.lastFreehandPoint = { x: img.x, y: img.y };
        break;
    }
  },

  _drawMove(img) {
    const state = window.AppState;
    if (!state.inProgress) return;

    switch (state.activeTool) {
      case 'arrow': case 'line':
        state.inProgress.x2 = img.x; state.inProgress.y2 = img.y; break;
      case 'circle': {
        const dx = img.x - state.inProgress.cx;
        const dy = img.y - state.inProgress.cy;
        state.inProgress.r = Math.max(1, Math.hypot(dx, dy));
        break;
      }
      case 'rect':
        state.inProgress.x2 = img.x; state.inProgress.y2 = img.y; break;
    }
    window.CanvasRenderer.render();
  },

  _drawUp(sx, sy) {
    const state = window.AppState;
    if (!state.inProgress) return;

    const dx = Math.abs(sx - this.startX);
    const dy = Math.abs(sy - this.startY);

    if (dx > 3 || dy > 3) {
      state.annotations.push(state.inProgress);
      state.selectedId = state.inProgress.id;
      window.App.pushHistory();
      window.App.syncMarkdown();
      window.App.updateAnnotationList();
    }
    state.inProgress = null;
    window.CanvasRenderer.render();
  },

  _freehandMove(img) {
    const state = window.AppState;
    if (!state.inProgress) return;
    const last = this.lastFreehandPoint;
    if (last && Math.hypot(img.x - last.x, img.y - last.y) < 2) return;
    state.inProgress.points.push({ x: img.x, y: img.y });
    this.lastFreehandPoint = { x: img.x, y: img.y };
    window.CanvasRenderer.render();
  },

  _freehandUp() {
    const state = window.AppState;
    if (!state.inProgress) return;
    if (state.inProgress.points.length >= 2) {
      state.annotations.push(state.inProgress);
      state.selectedId = state.inProgress.id;
      window.App.pushHistory();
      window.App.syncMarkdown();
      window.App.updateAnnotationList();
    }
    state.inProgress = null;
    this.lastFreehandPoint = null;
    window.CanvasRenderer.render();
  },

  // ---- TEXT ----
  _textDown(img, sx, sy) {
    window.App.showTextInput(img.x, img.y, sx, sy);
  },

  // ---- MARKER ----
  _markerDown(img) {
    const state = window.AppState;
    state.markerCounter++;
    const ann = window.Annotations.createMarker(img.x, img.y, String(state.markerCounter), '', state.toolOptions);
    state.annotations.push(ann);
    state.selectedId = ann.id;
    window.App.pushHistory();
    window.App.syncMarkdown();
    window.App.updateAnnotationList();
    window.CanvasRenderer.render();
  },

  // ---- FOG OF WAR ----
  _fogDown(img) {
    const state = window.AppState;
    const fr    = window.FogRenderer;
    switch (state.activeTool) {
      case 'fog-brush': {
        // brushSize is a screen-space diameter; store an image-space radius
        const size = Math.max(0.5, (state.fog.brushSize || 60) / state.zoom / 2);
        fr._inProgress = { type: 'brush', size, points: [{ x: img.x, y: img.y }] };
        this.lastFreehandPoint = { x: img.x, y: img.y };
        break;
      }
      case 'fog-rect':
        fr._inProgress = { type: 'rect', x1: img.x, y1: img.y, x2: img.x, y2: img.y };
        break;
      case 'fog-ellipse':
        fr._inProgress = { type: 'ellipse', cx: img.x, cy: img.y, rx: 0, ry: 0, _ax: img.x, _ay: img.y };
        break;
    }
    window.CanvasRenderer.render();
  },

  _fogMove(img) {
    const state = window.AppState;
    const fp    = window.FogRenderer._inProgress;
    if (!fp) return;
    switch (state.activeTool) {
      case 'fog-brush': {
        const last = this.lastFreehandPoint;
        if (last && Math.hypot(img.x - last.x, img.y - last.y) < 1) return;
        fp.points.push({ x: img.x, y: img.y });
        this.lastFreehandPoint = { x: img.x, y: img.y };
        break;
      }
      case 'fog-rect':
        fp.x2 = img.x; fp.y2 = img.y;
        break;
      case 'fog-ellipse':
        fp.cx = (fp._ax + img.x) / 2; fp.cy = (fp._ay + img.y) / 2;
        fp.rx = Math.abs(img.x - fp._ax) / 2; fp.ry = Math.abs(img.y - fp._ay) / 2;
        break;
    }
    window.CanvasRenderer.render();
  },

  _fogUp() {
    const state = window.AppState;
    const fr    = window.FogRenderer;
    const fp    = fr._inProgress;
    if (!fp) return;
    fr._inProgress = null;

    let valid = false;
    if      (fp.type === 'brush')   valid = fp.points.length >= 1;
    else if (fp.type === 'rect')    valid = Math.abs(fp.x2 - fp.x1) > 2 && Math.abs(fp.y2 - fp.y1) > 2;
    else if (fp.type === 'ellipse') valid = fp.rx > 1 && fp.ry > 1;

    if (valid) {
      if (fp.type === 'ellipse') { delete fp._ax; delete fp._ay; }
      state.fog.reveals.push(fp);
      fr.markDirty();
      window.App.pushHistory();
      window.App.autoSave();
    }
    this.lastFreehandPoint = null;
    window.CanvasRenderer.render();
  },

  // ---- WHEEL ----
  onWheel(e) {
    e.preventDefault();
    const state = window.AppState;

    if (e.ctrlKey) {
      // Pinch gesture (touchpad) or Ctrl+scroll (mouse) → zoom
      const { x, y } = this._pos(e);
      const delta = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY;
      const factor = delta < 0 ? 1.12 : 0.88;
      const newZoom = Math.max(0.05, Math.min(20, state.zoom * factor));
      state.pan.x = x - (x - state.pan.x) * (newZoom / state.zoom);
      state.pan.y = y - (y - state.pan.y) * (newZoom / state.zoom);
      state.zoom = newZoom;
    } else {
      // Two-finger scroll (touchpad) or plain scroll wheel (mouse) → pan
      let dx = e.deltaX;
      let dy = e.deltaY;
      if (e.deltaMode === 1) { dx *= 20; dy *= 20; }
      if (e.deltaMode === 2) { dx *= 400; dy *= 400; }
      state.pan.x -= dx;
      state.pan.y -= dy;
    }

    window.CanvasRenderer.render();
  },

  // ---- KEYBOARD ----
  onKeyDown(e) {
    const state = window.AppState;
    const inEditor = document.activeElement === document.getElementById('markdown-editor') ||
                     document.activeElement.tagName === 'INPUT' ||
                     document.activeElement.tagName === 'TEXTAREA';

    if (e.key === ' ' && !inEditor) {
      this.isSpacePanning = true;
      state.canvas.style.cursor = 'grab';
      e.preventDefault();
      return;
    }

    // Ctrl+Z / Ctrl+Shift+Z undo/redo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      if (e.shiftKey) window.App.redo();
      else            window.App.undo();
      e.preventDefault();
      return;
    }

    if (inEditor) return;

    // Tool shortcuts
    const toolMap = { v: 'select', h: 'pan', t: 'text', a: 'arrow', l: 'line', c: 'circle', r: 'rect', f: 'freehand', m: 'marker' };
    if (!e.ctrlKey && !e.metaKey && !e.altKey && toolMap[e.key.toLowerCase()]) {
      window.App.setTool(toolMap[e.key.toLowerCase()]);
      return;
    }

    // Delete selected annotation
    if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedId) {
      state.annotations = state.annotations.filter(a => a.id !== state.selectedId);
      state.selectedId = null;
      window.App.pushHistory();
      window.App.syncMarkdown();
      window.App.updateAnnotationList();
      window.CanvasRenderer.render();
      e.preventDefault();
    }
  },

  onKeyUp(e) {
    if (e.key === ' ') {
      this.isSpacePanning = false;
      const state = window.AppState;
      const cursors = { select:'default', pan:'grab', text:'text', arrow:'crosshair', line:'crosshair', circle:'crosshair', rect:'crosshair', freehand:'crosshair', marker:'crosshair', stamp:'crosshair', 'fog-brush':'crosshair', 'fog-rect':'crosshair', 'fog-ellipse':'crosshair' };
      if (state.canvas) state.canvas.style.cursor = cursors[state.activeTool] || 'default';
    }
  },

  // ---------------------------------------------------------------------------
  // Touch helpers
  // ---------------------------------------------------------------------------

  _pinchDist(t1, t2) {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  },

  _pinchMid(t1, t2) {
    const rect = window.AppState.canvas.getBoundingClientRect();
    return {
      x: (t1.clientX + t2.clientX) / 2 - rect.left,
      y: (t1.clientY + t2.clientY) / 2 - rect.top,
    };
  },

  // ---------------------------------------------------------------------------
  // Touch event handlers
  // ---------------------------------------------------------------------------

  onTouchStart(e) {
    e.preventDefault();
    const state = window.AppState;
    const touches = e.touches;

    if (touches.length >= 2) {
      // Cancel any in-progress single-touch operation and enter pinch mode
      state.inProgress = null;
      this.isDown      = false;
      this.isPanning   = false;
      this._pinching   = true;
      this._pinchStartDist  = this._pinchDist(touches[0], touches[1]);
      this._pinchStartZoom  = state.zoom;
      const mid = this._pinchMid(touches[0], touches[1]);
      this._pinchMidX       = mid.x;
      this._pinchMidY       = mid.y;
      this._pinchPanStartX  = state.pan.x;
      this._pinchPanStartY  = state.pan.y;
      return;
    }

    if (touches.length === 1 && !this._pinching) {
      const t = touches[0];
      this.onMouseDown({ clientX: t.clientX, clientY: t.clientY, button: 0, preventDefault() {} });
    }
  },

  onTouchMove(e) {
    e.preventDefault();
    const state   = window.AppState;
    const touches = e.touches;

    if (touches.length >= 2 && this._pinching) {
      const newDist = this._pinchDist(touches[0], touches[1]);
      const newMid  = this._pinchMid(touches[0], touches[1]);
      const scale   = newDist / this._pinchStartDist;
      const z       = Math.max(0.05, Math.min(20, this._pinchStartZoom * scale));

      // Zoom centered on original pinch midpoint, then translate by mid-point movement
      state.zoom  = z;
      state.pan.x = newMid.x - (this._pinchMidX - this._pinchPanStartX) * (z / this._pinchStartZoom);
      state.pan.y = newMid.y - (this._pinchMidY - this._pinchPanStartY) * (z / this._pinchStartZoom);
      window.CanvasRenderer.render();
      return;
    }

    if (touches.length === 1 && !this._pinching) {
      const t = touches[0];
      this.onMouseMove({ clientX: t.clientX, clientY: t.clientY });
    }
  },

  onTouchEnd(e) {
    e.preventDefault();
    // Reset pinch when fewer than 2 fingers remain
    if (e.touches.length < 2 && this._pinching) {
      this._pinching = false;
      this.isPanning = false;
      return;
    }
    if (!this._pinching) {
      const t = e.changedTouches[0];
      if (t) this.onMouseUp({ clientX: t.clientX, clientY: t.clientY });
    }
  },
};

window.Tools = Tools;
