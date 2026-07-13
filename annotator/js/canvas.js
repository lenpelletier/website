'use strict';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _numericFontSize(fontSize) {
  if (typeof fontSize === 'number') return fontSize;
  return { small: 12, medium: 18, large: 28 }[fontSize] || 18;
}

// Hex color → rgba string with given alpha
function _hexAlpha(hex, alpha) {
  const h = (hex || '#000000').replace('#', '').padEnd(6, '0');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

// Font id → CSS font-family string
const _FONT_MAP = {
  'default':      'sans-serif',
  'bangers':      '"Bangers", cursive',
  'anton':        '"Anton", sans-serif',
  'bebas':        '"Bebas Neue", sans-serif',
  'cinzel':       '"Cinzel", serif',
  'exo2':         '"Exo 2", sans-serif',
  'im-fell':      '"IM Fell English", serif',
  'metamorphous': '"Metamorphous", cursive',
  'orbitron':     '"Orbitron", sans-serif',
  'pirata':       '"Pirata One", cursive',
  'uncial':       '"Uncial Antiqua", cursive',
};

// White on dark colours, black on light colours
function _contrastColor(hex) {
  const h = (hex || '#ff0000').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 140 ? '#000000' : '#ffffff';
}

function _distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// ---------------------------------------------------------------------------
// CanvasRenderer
// ---------------------------------------------------------------------------

const CanvasRenderer = {
  canvas: null,
  ctx: null,
  cssWidth: 0,
  cssHeight: 0,
  _stampImages: {},
  _exportMode: false,   // when true, fog renders at full (solid) opacity

  init(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    console.log('[canvas.js] CanvasRenderer initialised (v3)');
  },

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    this.canvas.width  = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cssWidth  = w;
    this.cssHeight = h;
  },

  getCSSSize() {
    return { width: this.cssWidth, height: this.cssHeight };
  },

  fitImage(image) {
    const { width: cw, height: ch } = this.getCSSSize();
    const zoom = Math.min(cw / image.width, ch / image.height) * 0.95;
    const state = window.AppState;
    state.zoom  = zoom;
    state.pan   = { x: (cw - image.width * zoom) / 2, y: (ch - image.height * zoom) / 2 };
  },

  imageToScreen(ix, iy) {
    const { zoom, pan } = window.AppState;
    return { x: pan.x + ix * zoom, y: pan.y + iy * zoom };
  },

  screenToImage(sx, sy) {
    const { zoom, pan } = window.AppState;
    return { x: (sx - pan.x) / zoom, y: (sy - pan.y) / zoom };
  },

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------
  render() {
    const state = window.AppState;
    const ctx   = this.ctx;
    const { width: cw, height: ch } = this.getCSSSize();

    // Reset ALL context state so nothing leaks between frames
    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    ctx.globalAlpha          = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur           = 0;
    ctx.shadowColor          = 'transparent';
    ctx.setLineDash([]);

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, cw, ch);

    if (!state.image) {
      // Grid pattern while no image is loaded
      ctx.strokeStyle = '#252540';
      ctx.lineWidth = 1;
      const gs = 40;
      for (let x = 0; x < cw; x += gs) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,ch); ctx.stroke(); }
      for (let y = 0; y < ch; y += gs) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(cw,y); ctx.stroke(); }
      return;
    }

    // Base image
    const { x: imgX, y: imgY } = this.imageToScreen(0, 0);
    ctx.drawImage(state.image, imgX, imgY, state.image.width * state.zoom, state.image.height * state.zoom);

    // Fog of war — over the base image, under the annotations
    const fog = state.fog;
    if (fog && fog.enabled && window.FogRenderer) {
      const fc = window.FogRenderer.getFogCanvas(true);
      if (fc) {
        ctx.save();
        ctx.globalAlpha = this._exportMode ? 1 : fog.opacity;
        ctx.drawImage(fc, imgX, imgY, state.image.width * state.zoom, state.image.height * state.zoom);
        ctx.restore();
      }
    }

    // Annotations
    for (const ann of state.annotations) {
      if (!ann.visible) continue;
      this.drawAnnotation(ctx, ann, state.zoom, state.pan, false);
    }

    // In-progress (while drawing)
    if (state.inProgress) {
      this.drawAnnotation(ctx, state.inProgress, state.zoom, state.pan, false);
    }

    // Selection overlay
    if (state.selectedId) {
      const ann = state.annotations.find(a => a.id === state.selectedId);
      if (ann) this.drawSelection(ctx, ann, state.zoom, state.pan);
    }

    // Fog brush cursor ring
    if (!this._exportMode && state.activeTool === 'fog-brush' && fog && fog.enabled &&
        window.Tools && window.Tools._hoverX != null) {
      const r = (fog.brushSize || 60) / 2;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(window.Tools._hoverX, window.Tools._hoverY, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  },

  // ---------------------------------------------------------------------------
  // Draw a single annotation
  // ---------------------------------------------------------------------------
  drawAnnotation(ctx, ann, zoom, pan, forExport) {
    if (!ann.visible && !forExport) return;

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap  = 'round';

    switch (ann.type) {
      case 'marker':   this._drawMarker(ctx, ann, zoom, pan, forExport); break;
      case 'text':     this._drawText(ctx, ann, zoom, pan, forExport);   break;
      case 'arrow':    this._drawArrow(ctx, ann, zoom, pan, forExport);  break;
      case 'line':     this._drawLine(ctx, ann, zoom, pan, forExport);   break;
      case 'circle':   this._drawCircle(ctx, ann, zoom, pan, forExport); break;
      case 'rect':     this._drawRect(ctx, ann, zoom, pan, forExport);   break;
      case 'freehand': this._drawFreehand(ctx, ann, zoom, pan, forExport); break;
      case 'stamp':    this._drawStamp(ctx, ann, zoom, pan, forExport);  break;
    }

    ctx.restore();
  },

  // ---------------------------------------------------------------------------
  // Individual shape drawers
  // ---------------------------------------------------------------------------

  _drawMarker(ctx, ann, zoom, pan, forExport) {
    const sx   = pan.x + ann.x * zoom;
    const sy   = pan.y + ann.y * zoom;
    const base = _numericFontSize(ann.fontSize);
    const fs   = forExport ? base : Math.max(1, base * zoom);
    const r    = fs * 1.2;
    const col  = ann.color || '#ff0000';

    // No shadow — keep the fill crisp
    ctx.shadowBlur  = 0;
    ctx.shadowColor = 'transparent';

    // --- Solid filled circle ---
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();

    // --- Thin dark border for contrast on any background ---
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth   = Math.max(0.5, zoom);
    ctx.stroke();

    // --- Label (number or letter) in contrasting colour ---
    ctx.fillStyle    = _contrastColor(col);
    ctx.font         = 'bold ' + Math.round(fs) + 'px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(ann.number), sx, sy + 0.5);

    console.log('[canvas.js] marker drawn', ann.number, col, 'r=' + r.toFixed(1), 'at', Math.round(sx) + ',' + Math.round(sy));
  },

  _drawText(ctx, ann, zoom, pan, forExport) {
    const sx   = pan.x + ann.x * zoom;
    const sy   = pan.y + ann.y * zoom;
    const base = _numericFontSize(ann.fontSize);
    const fs   = forExport ? base : Math.max(1, base * zoom);

    // Font
    const fontFamily = _FONT_MAP[ann.fontFamily] || 'sans-serif';
    const bold   = ann.bold !== false;   // undefined (old annotations) → true
    const italic = ann.italic || false;
    const fontStr = (italic ? 'italic ' : '') + (bold ? 'bold ' : '') + Math.round(fs) + 'px ' + fontFamily;
    ctx.font         = fontStr;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';

    // Shadow (undefined → treat as enabled, for backward compat)
    const hasShadow   = ann.shadow !== false;
    const shadowColor = ann.shadowColor || '#000000';
    const shadowBlur  = typeof ann.shadowBlur === 'number' ? ann.shadowBlur : 6;
    if (hasShadow) {
      const scale          = forExport ? 1 : zoom;
      const blurScaled     = Math.max(2, shadowBlur * scale);
      const offsetScaled   = Math.max(1, shadowBlur * 0.6 * scale);
      ctx.shadowColor   = _hexAlpha(shadowColor, 0.92);
      ctx.shadowBlur    = blurScaled;
      ctx.shadowOffsetX = -offsetScaled;   // left
      ctx.shadowOffsetY =  offsetScaled;   // down
    } else {
      ctx.shadowColor   = 'transparent';
      ctx.shadowBlur    = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    ctx.fillStyle = ann.color || '#ff0000';
    ctx.fillText(ann.text || '', sx, sy);

    // Outline drawn on top with no shadow bleed
    if (ann.outline) {
      ctx.shadowColor   = 'transparent';
      ctx.shadowBlur    = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = ann.outlineColor || '#000000';
      ctx.lineWidth   = (ann.outlineWidth || 2) * (forExport ? 1 : zoom);
      ctx.lineJoin    = 'round';
      ctx.strokeText(ann.text || '', sx, sy);
    }
  },

  _drawArrow(ctx, ann, zoom, pan, forExport) {
    const x1 = pan.x + ann.x1 * zoom;
    const y1 = pan.y + ann.y1 * zoom;
    const x2 = pan.x + ann.x2 * zoom;
    const y2 = pan.y + ann.y2 * zoom;
    const w  = (ann.width || 2) * (forExport ? 1 : zoom);

    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur  = 3;
    ctx.strokeStyle = ann.color || '#ff0000';
    ctx.lineWidth   = w;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const angle   = Math.atan2(y2 - y1, x2 - x1);
    const headLen = Math.max(12, w * 4);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  },

  _drawLine(ctx, ann, zoom, pan, forExport) {
    const w = (ann.width || 2) * (forExport ? 1 : zoom);
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur  = 3;
    ctx.strokeStyle = ann.color || '#ff0000';
    ctx.lineWidth   = w;
    ctx.beginPath();
    ctx.moveTo(pan.x + ann.x1 * zoom, pan.y + ann.y1 * zoom);
    ctx.lineTo(pan.x + ann.x2 * zoom, pan.y + ann.y2 * zoom);
    ctx.stroke();
  },

  _drawCircle(ctx, ann, zoom, pan, forExport) {
    const cx = pan.x + ann.cx * zoom;
    const cy = pan.y + ann.cy * zoom;
    const r  = ann.r * zoom;
    const w  = (ann.width || 2) * (forExport ? 1 : zoom);

    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur  = 3;
    ctx.strokeStyle = ann.color || '#ff0000';
    ctx.lineWidth   = w;

    if (ann.fill) {
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = ann.fillColor || 'rgba(255,0,0,0.2)';
      ctx.fill();
      ctx.shadowBlur = 3;
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  },

  _drawRect(ctx, ann, zoom, pan, forExport) {
    const x1 = pan.x + ann.x1 * zoom;
    const y1 = pan.y + ann.y1 * zoom;
    const x2 = pan.x + ann.x2 * zoom;
    const y2 = pan.y + ann.y2 * zoom;
    const rx = Math.min(x1,x2), ry = Math.min(y1,y2);
    const rw = Math.abs(x2-x1),  rh = Math.abs(y2-y1);
    const w  = (ann.width || 2) * (forExport ? 1 : zoom);

    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur  = 3;
    ctx.strokeStyle = ann.color || '#ff0000';
    ctx.lineWidth   = w;

    if (ann.fill) {
      ctx.shadowBlur = 0;
      ctx.fillStyle  = ann.fillColor || 'rgba(255,0,0,0.2)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.shadowBlur = 3;
    }
    ctx.strokeRect(rx, ry, rw, rh);
  },

  _drawStamp(ctx, ann, zoom, pan, forExport) {
    const img = this._getStampImage(ann);
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const sx = pan.x + ann.x * zoom;
    const sy = pan.y + ann.y * zoom;
    const sw = ann.width  * zoom;
    const sh = ann.height * zoom;
    ctx.drawImage(img, sx, sy, sw, sh);
  },

  _getStampImage(ann) {
    // Return cached Image immediately (may still be loading — drawStamp checks .complete)
    if (this._stampImages[ann.id]) return this._stampImages[ann.id];

    const img = new Image();
    img.crossOrigin = 'anonymous';
    this._stampImages[ann.id] = img;   // store before async so duplicate calls hit cache

    const state = window.AppState;
    const cachedSrc = state.stampSrcs && state.stampSrcs[ann.id];

    if (cachedSrc) {
      // Uploaded image or previously-colorised stock icon
      img.onload = () => window.CanvasRenderer.render();
      img.src = cachedSrc;
    } else if (ann.stockIcon) {
      // Fetch SVG from CDN, colorize background with iconColor, cache as data URL
      window.IconPicker.loadIconSrc(ann.stockIcon, ann.iconColor)
        .then(dataUrl => {
          state.stampSrcs[ann.id] = dataUrl;
          img.onload = () => window.CanvasRenderer.render();
          img.src = dataUrl;
        })
        .catch(() => { /* icon unavailable — stays blank */ });
    } else if (ann.imgbbUrl) {
      img.onload = () => window.CanvasRenderer.render();
      img.src = ann.imgbbUrl;
    }

    return img;
  },

  _drawFreehand(ctx, ann, zoom, pan, forExport) {
    if (!ann.points || ann.points.length < 2) return;
    const w = (ann.width || 2) * (forExport ? 1 : zoom);
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur  = 3;
    ctx.strokeStyle = ann.color || '#ff0000';
    ctx.lineWidth   = w;
    ctx.beginPath();
    ctx.moveTo(pan.x + ann.points[0].x * zoom, pan.y + ann.points[0].y * zoom);
    for (let i = 1; i < ann.points.length; i++) {
      ctx.lineTo(pan.x + ann.points[i].x * zoom, pan.y + ann.points[i].y * zoom);
    }
    ctx.stroke();
  },

  // ---------------------------------------------------------------------------
  // Selection overlay
  // ---------------------------------------------------------------------------

  drawSelection(ctx, ann, zoom, pan) {
    ctx.save();
    ctx.shadowBlur  = 0;
    ctx.shadowColor = 'transparent';
    ctx.setLineDash([]);

    // Dashed bounding box
    ctx.strokeStyle = '#00ccff';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([5, 3]);
    const bbox = this.getBBox(ann, zoom, pan);
    if (bbox) {
      ctx.strokeRect(bbox.x - 8, bbox.y - 8, bbox.w + 16, bbox.h + 16);
    }
    ctx.setLineDash([]);

    // Handles
    for (const h of this.getHandles(ann, zoom, pan)) {
      if (h.role === 'scale') {
        // Orange diamond — resize handle
        const hs = 7;
        ctx.fillStyle   = '#ff9900';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(h.x,      h.y - hs);
        ctx.lineTo(h.x + hs, h.y     );
        ctx.lineTo(h.x,      h.y + hs);
        ctx.lineTo(h.x - hs, h.y     );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // Cyan square — move/endpoint handle
        const hs = 5;
        ctx.fillStyle   = '#00ccff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth   = 1.5;
        ctx.fillRect(h.x - hs, h.y - hs, hs * 2, hs * 2);
        ctx.strokeRect(h.x - hs, h.y - hs, hs * 2, hs * 2);
      }
    }

    ctx.restore();
  },

  // ---------------------------------------------------------------------------
  // Bounding boxes
  // ---------------------------------------------------------------------------

  getBBox(ann, zoom, pan) {
    switch (ann.type) {
      case 'marker': {
        const sx = pan.x + ann.x * zoom, sy = pan.y + ann.y * zoom;
        const r  = _numericFontSize(ann.fontSize) * 1.2 * zoom;
        return { x: sx - r, y: sy - r, w: r * 2, h: r * 2 };
      }
      case 'text': {
        const sx = pan.x + ann.x * zoom, sy = pan.y + ann.y * zoom;
        const fs = _numericFontSize(ann.fontSize) * zoom;
        return { x: sx, y: sy, w: fs * 5, h: fs * 1.4 };
      }
      case 'arrow': case 'line': {
        const x1 = pan.x + ann.x1 * zoom, y1 = pan.y + ann.y1 * zoom;
        const x2 = pan.x + ann.x2 * zoom, y2 = pan.y + ann.y2 * zoom;
        return { x: Math.min(x1,x2), y: Math.min(y1,y2), w: Math.abs(x2-x1), h: Math.abs(y2-y1) };
      }
      case 'circle': {
        const cx = pan.x + ann.cx * zoom, cy = pan.y + ann.cy * zoom;
        const r  = ann.r * zoom;
        return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
      }
      case 'rect': {
        const x1 = pan.x + ann.x1 * zoom, y1 = pan.y + ann.y1 * zoom;
        const x2 = pan.x + ann.x2 * zoom, y2 = pan.y + ann.y2 * zoom;
        return { x: Math.min(x1,x2), y: Math.min(y1,y2), w: Math.abs(x2-x1), h: Math.abs(y2-y1) };
      }
      case 'freehand': {
        if (!ann.points || !ann.points.length) return null;
        let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
        for (const p of ann.points) {
          const sx = pan.x + p.x * zoom, sy = pan.y + p.y * zoom;
          mnX = Math.min(mnX, sx); mnY = Math.min(mnY, sy);
          mxX = Math.max(mxX, sx); mxY = Math.max(mxY, sy);
        }
        return { x: mnX, y: mnY, w: mxX - mnX, h: mxY - mnY };
      }
      case 'stamp': {
        const sx = pan.x + ann.x * zoom;
        const sy = pan.y + ann.y * zoom;
        return { x: sx, y: sy, w: ann.width * zoom, h: ann.height * zoom };
      }
    }
    return null;
  },

  // ---------------------------------------------------------------------------
  // Handles (returned in screen coordinates)
  // ---------------------------------------------------------------------------

  getHandles(ann, zoom, pan) {
    switch (ann.type) {
      case 'marker': {
        const fs = _numericFontSize(ann.fontSize);
        const r  = fs * 1.2;
        // Scale handle is placed clearly outside the circle edge
        const scaleX = pan.x + (ann.x + r + 10 / zoom) * zoom;
        const scaleY = pan.y + ann.y * zoom;
        return [
          { x: pan.x + ann.x * zoom, y: pan.y + ann.y * zoom, role: 'center' },
          { x: scaleX,                y: scaleY,                role: 'scale'  },
        ];
      }
      case 'text': {
        const fs = _numericFontSize(ann.fontSize);
        // Scale handle is to the right of where text ends (estimated)
        const scaleX = pan.x + (ann.x + fs * 2 + 10 / zoom) * zoom;
        const scaleY = pan.y + ann.y * zoom;
        return [
          { x: pan.x + ann.x * zoom, y: pan.y + ann.y * zoom, role: 'origin' },
          { x: scaleX,                y: scaleY,                role: 'scale'  },
        ];
      }
      case 'arrow': case 'line':
        return [
          { x: pan.x + ann.x1 * zoom, y: pan.y + ann.y1 * zoom, role: 'p1' },
          { x: pan.x + ann.x2 * zoom, y: pan.y + ann.y2 * zoom, role: 'p2' },
        ];
      case 'circle':
        return [
          { x: pan.x + ann.cx * zoom,           y: pan.y + ann.cy * zoom, role: 'center' },
          { x: pan.x + (ann.cx + ann.r) * zoom, y: pan.y + ann.cy * zoom, role: 'radius' },
        ];
      case 'rect':
        return [
          { x: pan.x + ann.x1 * zoom, y: pan.y + ann.y1 * zoom, role: 'tl' },
          { x: pan.x + ann.x2 * zoom, y: pan.y + ann.y1 * zoom, role: 'tr' },
          { x: pan.x + ann.x1 * zoom, y: pan.y + ann.y2 * zoom, role: 'bl' },
          { x: pan.x + ann.x2 * zoom, y: pan.y + ann.y2 * zoom, role: 'br' },
        ];
      case 'stamp': {
        const sx = pan.x + ann.x * zoom;
        const sy = pan.y + ann.y * zoom;
        const sw = ann.width  * zoom;
        const sh = ann.height * zoom;
        return [
          { x: sx,      y: sy,      role: 'tl' },
          { x: sx + sw, y: sy,      role: 'tr' },
          { x: sx,      y: sy + sh, role: 'bl' },
          { x: sx + sw, y: sy + sh, role: 'br' },
        ];
      }
      default:
        return [];
    }
  },

  // ---------------------------------------------------------------------------
  // Hit testing
  // ---------------------------------------------------------------------------

  hitTest(screenX, screenY) {
    const state = window.AppState;
    const { zoom, pan } = state;
    for (let i = state.annotations.length - 1; i >= 0; i--) {
      const ann = state.annotations[i];
      if (!ann.visible) continue;
      if (this._hitTestOne(ann, screenX, screenY, zoom, pan)) return ann;
    }
    return null;
  },

  _hitTestOne(ann, sx, sy, zoom, pan) {
    const T = 8;
    switch (ann.type) {
      case 'marker': {
        const r = _numericFontSize(ann.fontSize) * 1.2 * zoom;
        return Math.hypot(sx - (pan.x + ann.x * zoom), sy - (pan.y + ann.y * zoom)) <= r + T;
      }
      case 'text': {
        const tx = pan.x + ann.x * zoom, ty = pan.y + ann.y * zoom;
        return sx >= tx - T && sx <= tx + 150 + T && sy >= ty - T && sy <= ty + 30 + T;
      }
      case 'arrow': case 'line':
        return _distToSegment(sx, sy,
          pan.x + ann.x1 * zoom, pan.y + ann.y1 * zoom,
          pan.x + ann.x2 * zoom, pan.y + ann.y2 * zoom) <= T;
      case 'circle': {
        const cx = pan.x + ann.cx * zoom, cy = pan.y + ann.cy * zoom;
        const r  = ann.r * zoom;
        const d  = Math.hypot(sx - cx, sy - cy);
        return ann.fill ? d <= r + T : Math.abs(d - r) <= T;
      }
      case 'rect': {
        const x1 = pan.x + ann.x1 * zoom, y1 = pan.y + ann.y1 * zoom;
        const x2 = pan.x + ann.x2 * zoom, y2 = pan.y + ann.y2 * zoom;
        const mnX = Math.min(x1,x2), mxX = Math.max(x1,x2);
        const mnY = Math.min(y1,y2), mxY = Math.max(y1,y2);
        if (ann.fill) return sx >= mnX-T && sx <= mxX+T && sy >= mnY-T && sy <= mxY+T;
        return (Math.abs(sx-mnX)<=T && sy>=mnY-T && sy<=mxY+T) ||
               (Math.abs(sx-mxX)<=T && sy>=mnY-T && sy<=mxY+T) ||
               (Math.abs(sy-mnY)<=T && sx>=mnX-T && sx<=mxX+T) ||
               (Math.abs(sy-mxY)<=T && sx>=mnX-T && sx<=mxX+T);
      }
      case 'freehand': {
        if (!ann.points || ann.points.length < 2) return false;
        for (let i = 0; i < ann.points.length - 1; i++) {
          if (_distToSegment(sx, sy,
            pan.x + ann.points[i].x * zoom,   pan.y + ann.points[i].y * zoom,
            pan.x + ann.points[i+1].x * zoom, pan.y + ann.points[i+1].y * zoom) <= T) return true;
        }
        return false;
      }
      case 'stamp': {
        const bx = pan.x + ann.x * zoom;
        const by = pan.y + ann.y * zoom;
        const bw = ann.width  * zoom;
        const bh = ann.height * zoom;
        return sx >= bx - T && sx <= bx + bw + T && sy >= by - T && sy <= by + bh + T;
      }
    }
    return false;
  },

  hitTestHandle(ann, sx, sy, zoom, pan) {
    for (const h of this.getHandles(ann, zoom, pan)) {
      if (Math.abs(sx - h.x) <= 8 && Math.abs(sy - h.y) <= 8) return h;
    }
    return null;
  },
};

window.CanvasRenderer = CanvasRenderer;
