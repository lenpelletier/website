'use strict';

// ---------------------------------------------------------------------------
// FogRenderer — "fog of war" cover layer.
//
// The fog is a black layer the size of the base image. The user "erases" it
// with reveal operations (brush strokes, rectangles, ellipses) that cut
// feathered holes into the cover. The composited image-space fog canvas is
// cached and only rebuilt when the reveal set or feather amount changes.
//
// Serializable fog state lives on AppState.fog (enabled/opacity/feather/
// brushSize/reveals). The canvas cache + in-progress reveal live here so they
// never end up in JSON snapshots or localStorage.
// ---------------------------------------------------------------------------

const FogRenderer = {
  _cache:      null,   // image-space canvas of the committed fog
  _dirty:      true,
  _inProgress: null,   // reveal currently being drawn (preview only)

  markDirty() { this._dirty = true; },

  // Bounding box of a reveal in image coordinates (excludes brush radius/feather)
  _revealBBox(rv) {
    switch (rv.type) {
      case 'brush': {
        let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
        for (const p of rv.points) {
          mnX = Math.min(mnX, p.x); mnY = Math.min(mnY, p.y);
          mxX = Math.max(mxX, p.x); mxY = Math.max(mxY, p.y);
        }
        if (!isFinite(mnX)) return { x: 0, y: 0, w: 0, h: 0 };
        return { x: mnX, y: mnY, w: mxX - mnX, h: mxY - mnY };
      }
      case 'rect':
        return {
          x: Math.min(rv.x1, rv.x2), y: Math.min(rv.y1, rv.y2),
          w: Math.abs(rv.x2 - rv.x1), h: Math.abs(rv.y2 - rv.y1),
        };
      case 'ellipse':
        return { x: rv.cx - rv.rx, y: rv.cy - rv.ry, w: rv.rx * 2, h: rv.ry * 2 };
    }
    return { x: 0, y: 0, w: 0, h: 0 };
  },

  // Trace a reveal shape (fill/stroke already set to white by caller)
  _pathReveal(ctx, rv) {
    switch (rv.type) {
      case 'brush': {
        const r = Math.max(0.5, rv.size || 1);
        if (rv.points.length === 1) {
          const p = rv.points[0];
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.lineWidth = r * 2;
          ctx.lineCap   = 'round';
          ctx.lineJoin  = 'round';
          ctx.beginPath();
          ctx.moveTo(rv.points[0].x, rv.points[0].y);
          for (let i = 1; i < rv.points.length; i++) ctx.lineTo(rv.points[i].x, rv.points[i].y);
          ctx.stroke();
        }
        break;
      }
      case 'rect': {
        const x = Math.min(rv.x1, rv.x2), y = Math.min(rv.y1, rv.y2);
        ctx.fillRect(x, y, Math.abs(rv.x2 - rv.x1), Math.abs(rv.y2 - rv.y1));
        break;
      }
      case 'ellipse': {
        if (rv.rx <= 0 || rv.ry <= 0) break;
        ctx.beginPath();
        ctx.ellipse(rv.cx, rv.cy, rv.rx, rv.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
  },

  // Erase a single reveal (with feather) out of an already-black fog context.
  // The shape is rendered white on a padded temp canvas, blurred, then punched
  // through with destination-out — so blur cost scales with the shape, not the
  // whole map.
  _eraseReveal(ctx, rv, feather) {
    const bbox = this._revealBBox(rv);
    const pad  = feather + (rv.size || 0) + 4;
    const x0 = Math.floor(bbox.x - pad), y0 = Math.floor(bbox.y - pad);
    const tw = Math.ceil(bbox.w + pad * 2), th = Math.ceil(bbox.h + pad * 2);
    if (tw <= 0 || th <= 0) return;

    const tmp = document.createElement('canvas');
    tmp.width = tw; tmp.height = th;
    const t = tmp.getContext('2d');
    t.translate(-x0, -y0);
    t.fillStyle = '#fff';
    t.strokeStyle = '#fff';
    this._pathReveal(t, rv);

    let src = tmp;
    if (feather > 0) {
      const b = document.createElement('canvas');
      b.width = tw; b.height = th;
      const bc = b.getContext('2d');
      bc.filter = 'blur(' + feather + 'px)';
      bc.drawImage(tmp, 0, 0);
      src = b;
    }

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(src, x0, y0);
    ctx.restore();
  },

  // Build an image-space fog canvas from the given reveals
  _build(reveals, feather, w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    for (const rv of reveals) this._eraseReveal(ctx, rv, feather);
    return c;
  },

  // Return the current image-space fog canvas. When includeInProgress is set
  // and a reveal is being drawn, a clone with that reveal additionally erased
  // is returned so the drag previews live without invalidating the cache.
  getFogCanvas(includeInProgress) {
    const state = window.AppState;
    const img = state.image;
    if (!img) return null;
    const fog = state.fog;

    if (this._dirty || !this._cache ||
        this._cache.width !== img.width || this._cache.height !== img.height) {
      this._cache = this._build(fog.reveals, fog.feather, img.width, img.height);
      this._dirty = false;
    }

    if (includeInProgress && this._inProgress) {
      const c = document.createElement('canvas');
      c.width = this._cache.width; c.height = this._cache.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(this._cache, 0, 0);
      this._eraseReveal(ctx, this._inProgress, fog.feather);
      return c;
    }
    return this._cache;
  },
};

window.FogRenderer = FogRenderer;
