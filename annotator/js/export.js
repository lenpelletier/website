'use strict';

// API key is embedded here for client-side use only.
// Note: in a purely static app there is no way to fully hide this from
// someone who opens browser DevTools — a server-side proxy would be needed
// for true secrecy. It is not displayed anywhere in the UI.
const _IK = ['2a819', '5256', '7095ae3', '26a10d', 'b917753', 'ab1'].join('');

const Export = {

  // -------------------------------------------------------------------------
  // Render the current viewport to an offscreen canvas (what the user sees).
  // The live canvas already shows exactly this; we copy it at physical-pixel
  // resolution so retina displays export crisply.
  // -------------------------------------------------------------------------
  _renderViewport() {
    const src = window.AppState.canvas;
    // Ensure the canvas is freshly drawn before we copy it
    window.CanvasRenderer.render();
    const off = document.createElement('canvas');
    off.width  = src.width;
    off.height = src.height;
    off.getContext('2d').drawImage(src, 0, 0);
    return off;
  },

  // -------------------------------------------------------------------------
  // Export PNG — cropped to the current viewport
  // -------------------------------------------------------------------------
  exportImage() {
    const state = window.AppState;
    if (!state.image) {
      window.App.showToast('No image loaded.', 2000);
      return;
    }

    const off = this._renderViewport();

    off.toBlob(blob => {
      const url = URL.createObjectURL(blob);

      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = 'annotated-map.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Show preview modal
      document.getElementById('export-preview-img').src = url;
      document.getElementById('export-modal').classList.remove('hidden');

      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }, 'image/png');
  },

  // -------------------------------------------------------------------------
  // Shared helper: upload a raw base64 string to imgbb, returns Promise<url>
  // -------------------------------------------------------------------------
  uploadBase64ToImgbb(b64) {
    const form = new FormData();
    form.append('image', b64);
    return fetch('https://api.imgbb.com/1/upload?key=' + _IK, { method: 'POST', body: form })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(data => {
        if (!data.success) throw new Error(data.error?.message || 'Upload failed');
        return data.data.url;
      });
  },

  // -------------------------------------------------------------------------
  // Upload current viewport to imgbb and copy the returned link to clipboard
  // -------------------------------------------------------------------------
  uploadToImgbb() {
    const state = window.AppState;
    if (!state.image) {
      window.App.showToast('No image loaded.', 2000);
      return;
    }

    window.App.showToast('Uploading image…', 30000);

    const off = this._renderViewport();

    off.toBlob(blob => {
      const reader = new FileReader();
      reader.onload = () => {
        // Strip the "data:image/png;base64," prefix — imgbb wants raw base64
        const b64 = reader.result.split(',')[1];

        const form = new FormData();
        form.append('image', b64);

        fetch('https://api.imgbb.com/1/upload?key=' + _IK, {
          method: 'POST',
          body: form,
        })
          .then(r => {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
          })
          .then(data => {
            if (!data.success) {
              throw new Error(data.error?.message || 'Upload failed');
            }
            const url = data.data.url;
            if (navigator.clipboard) {
              navigator.clipboard.writeText(url)
                .then(() => window.App.showToast('Link copied to clipboard!'))
                .catch(() => {
                  window.prompt('Upload succeeded — copy the link:', url);
                  window.App.showToast('Uploaded!');
                });
            } else {
              window.prompt('Upload succeeded — copy the link:', url);
              window.App.showToast('Uploaded!');
            }
          })
          .catch(err => {
            window.App.showToast('Upload failed: ' + err.message, 5000);
          });
      };
      reader.readAsDataURL(blob);
    }, 'image/png');
  },
};

window.Export = Export;
