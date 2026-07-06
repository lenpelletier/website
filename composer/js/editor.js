'use strict';
/* =========================================================
   Editor — toolbar logic, view modes, image upload
   ========================================================= */
const _IK = ['2a819', '5256', '7095ae3', '26a10d', 'b917753', 'ab1'].join('');

const Editor = (() => {
  let _ta = null;       // textarea
  let _preview = null;  // preview div
  let _debounce = null;
  let _dirty = false;
  let _activeModal = null;
  let _pendingAction = null;   // toolbar action awaiting modal result
  let _selStart = 0;
  let _selEnd = 0;
  let _viewMode = 'split'; // split | source | preview

  // ── Init ─────────────────────────────────────────────────

  function init() {
    _ta      = document.getElementById('bbcode-input');
    _preview = document.getElementById('preview-output');

    _ta.addEventListener('input',   _onInput);
    _ta.addEventListener('keydown', _onKeyDown);
    _ta.addEventListener('paste',   _onPaste);
    // Save selection whenever the textarea loses focus so toolbar actions
    // can still insert at the right position (works on desktop and mobile).
    _ta.addEventListener('blur',    _saveSelection);
    document.getElementById('editor-toolbar').addEventListener('click', _onToolbar);

    // view mode buttons (header) + mobile tab bar
    document.querySelectorAll('.view-mode-btn, .mobile-tab').forEach(btn => {
      btn.addEventListener('click', () => setViewMode(btn.dataset.mode));
    });

    // resizable divider
    _initDivider();

    // Default: source on narrow screens (mobile), split on desktop
    setViewMode(window.innerWidth <= 640 ? 'source' : 'split');
    _renderPreview();
  }

  // ── Dirty tracking ───────────────────────────────────────

  function setDirty(val) {
    _dirty = val;
    document.getElementById('save-btn').classList.toggle('dirty', val);
  }

  function isDirty() { return _dirty; }

  // ── Input handler ────────────────────────────────────────

  function _onInput() {
    setDirty(true);
    clearTimeout(_debounce);
    _debounce = setTimeout(_renderPreview, 250);
  }

  function _renderPreview() {
    _preview.innerHTML = BBCode.render(_ta.value);
    // Make spoilers work
    _preview.querySelectorAll('details.bb-spoiler').forEach(d => {
      d.open = false;
    });
  }

  // Expose for external callers
  function renderPreview() { _renderPreview(); }

  // ── Paste → imgbb ────────────────────────────────────────

  function _onPaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) _pasteUpload(file);
        return;
      }
    }
  }

  function _pasteUpload(file) {
    const uid = 'img-' + Math.random().toString(36).slice(2, 8);
    const placeholder = `[uploading:${uid}]`;
    // Insert placeholder at current cursor, record it by value (not position)
    _ta.setRangeText(placeholder, _ta.selectionStart, _ta.selectionEnd, 'end');
    _onInput();
    if (window._appToast) window._appToast('Uploading pasted image\u2026', 60000);

    _readAndUpload(file,
      url => {
        _ta.value = _ta.value.replace(placeholder, `[img]${url}[/img]`);
        _onInput();
        if (window._appToast) window._appToast('Image uploaded!');
      },
      err => {
        _ta.value = _ta.value.replace(placeholder, '');
        _onInput();
        if (window._appToast) window._appToast('Image upload failed: ' + err.message, 4000);
      }
    );
  }

  // ── Keyboard shortcuts ───────────────────────────────────

  function _onKeyDown(e) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); _wrap('[b]', '[/b]'); }
      if (e.key === 'i') { e.preventDefault(); _wrap('[i]', '[/i]'); }
      if (e.key === 'u') { e.preventDefault(); _wrap('[u]', '[/u]'); }
      if (e.key === 's') { e.preventDefault(); App.savePost(); }
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = _ta.selectionStart, e2 = _ta.selectionEnd;
      _ta.value = _ta.value.slice(0, s) + '    ' + _ta.value.slice(e2);
      _ta.selectionStart = _ta.selectionEnd = s + 4;
    }
  }

  // ── Toolbar dispatcher ───────────────────────────────────

  function _onToolbar(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    // Close any open dropdowns
    document.querySelectorAll('.tool-dropdown.open').forEach(d => d.classList.remove('open'));

    const action = btn.dataset.action;

    // Actions that open dropdowns
    if (action === 'size') {
      const dd = document.getElementById('size-dropdown');
      dd.classList.toggle('open');
      dd.querySelectorAll('button').forEach(b => {
        b.onclick = () => { _wrap(`[size="${b.dataset.size}"]`, '[/size]'); dd.classList.remove('open'); };
      });
      return;
    }
    if (action === 'list') {
      const dd = document.getElementById('list-dropdown');
      dd.classList.toggle('open');
      dd.querySelectorAll('button').forEach(b => {
        b.onclick = () => {
          const t = b.dataset.list;
          const tag = t === 'bullet' ? '[list]' : `[list=${t}]`;
          _wrapBlock(tag, '[/list]', '[*]Item\n[*]Item');
          dd.classList.remove('open');
        };
      });
      return;
    }
    if (action === 'layout') {
      const dd = document.getElementById('layout-dropdown');
      dd.classList.toggle('open');
      dd.querySelectorAll('button').forEach(b => {
        b.onclick = () => { _layoutAction(b.dataset.layout); dd.classList.remove('open'); };
        return;
      });
      return;
    }

    // Color
    if (action === 'color') {
      _saveSelection();
      _showColorPopover(btn);
      return;
    }

    // Modal-based actions
    if (action === 'link')    { _saveSelection(); _openModal('link');    return; }
    if (action === 'image')   { _saveSelection(); _openModal('image');   return; }
    if (action === 'youtube') { _saveSelection(); _openModal('youtube'); return; }
    if (action === 'quote')   { _saveSelection(); _openModal('quote');   return; }
    if (action === 'spoiler') { _saveSelection(); _openModal('spoiler'); return; }

    // Direct inserts
    if (action === 'bold')       _wrap('[b]', '[/b]');
    if (action === 'italic')     _wrap('[i]', '[/i]');
    if (action === 'underline')  _wrap('[u]', '[/u]');
    if (action === 'strike')     _wrap('[s]', '[/s]');
    if (action === 'ooc')        _wrapBlock('[ooc]', '[/ooc]', '');
    if (action === 'code')       _wrapBlock('[code]', '[/code]', '');
    if (action === 'hr')         _insertAt('\n[linebreak]\n');
    if (action === 'note')    { _saveSelection(); _openModal('note');    }
    if (action === 'private') { _saveSelection(); _openModal('private'); }
  }

  // ── Color popover ────────────────────────────────────────

  function _showColorPopover(anchor) {
    // Remove any existing popover
    document.getElementById('color-popover')?.remove();

    const pop = document.createElement('div');
    pop.id = 'color-popover';
    pop.className = 'color-popover';
    pop.innerHTML = `
      <div class="color-presets">
        ${['#ff0000','#ff6600','#ffcc00','#00cc00','#0066ff','#9900cc','#ff99cc','#ffffff','#aaaaaa','#555555'].map(c =>
          `<button class="color-swatch" style="background:${c}" data-color="${c}" title="${c}"></button>`
        ).join('')}
      </div>
      <div class="color-custom">
        <input type="color" id="color-picker-native" value="#ff6600">
        <input type="text" id="color-picker-text" placeholder="red / #ff6600" maxlength="30">
        <button class="btn btn-primary btn-sm" id="color-apply-btn">Apply</button>
      </div>
    `;

    document.body.appendChild(pop);
    if (window.innerWidth > 700) {
      // Desktop: float below the button
      const rect = anchor.getBoundingClientRect();
      pop.style.top  = (rect.bottom + 4) + 'px';
      pop.style.left = rect.left + 'px';
    }
    // Mobile: CSS anchors it as a bottom sheet (no inline top/left set)

    const native = pop.querySelector('#color-picker-native');
    const text   = pop.querySelector('#color-picker-text');

    native.addEventListener('input', () => { text.value = native.value; });
    text.addEventListener('input',   () => {
      if (/^#[0-9a-f]{6}$/i.test(text.value)) native.value = text.value;
    });

    pop.querySelectorAll('.color-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        text.value = sw.dataset.color;
        native.value = sw.dataset.color;
      });
    });

    pop.querySelector('#color-apply-btn').addEventListener('click', () => {
      const color = text.value.trim() || native.value;
      _restoreSelection();
      _wrap(`[color="${color}"]`, '[/color]');
      pop.remove();
    });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!pop.contains(e.target) && e.target !== anchor) {
          pop.remove();
          document.removeEventListener('click', handler);
        }
      });
    }, 0);
  }

  // ── Selection save/restore (for modals) ─────────────────

  function _saveSelection() {
    _selStart = _ta.selectionStart;
    _selEnd   = _ta.selectionEnd;
  }

  function _restoreSelection() {
    _ta.focus();
    _ta.setSelectionRange(_selStart, _selEnd);
  }

  // ── Core wrap / insert helpers ───────────────────────────

  function _wrap(open, close) {
    const s = _ta.selectionStart, e = _ta.selectionEnd;
    const selected = _ta.value.slice(s, e);
    const replacement = open + selected + close;
    _ta.setRangeText(replacement, s, e, 'select');
    if (!selected) {
      // place cursor inside tags
      _ta.setSelectionRange(s + open.length, s + open.length);
    }
    _ta.focus();
    _onInput();
  }

  function _wrapBlock(open, close, placeholder) {
    const s = _ta.selectionStart, e = _ta.selectionEnd;
    const selected = _ta.value.slice(s, e).trim() || placeholder;
    const replacement = open + '\n' + selected + '\n' + close;
    _ta.setRangeText(replacement, s, e, 'end');
    _ta.focus();
    _onInput();
  }

  function _insertAt(text) {
    const s = _ta.selectionStart;
    _ta.setRangeText(text, s, _ta.selectionEnd, 'end');
    _ta.focus();
    _onInput();
  }

  function _insertAtSaved(text) {
    _ta.focus();
    _ta.setRangeText(text, _selStart, _selEnd, 'end');
    _onInput();
  }

  function _layoutAction(type) {
    if (type === '2col')  _wrapBlock('[2column]', '[/2column]', '[col]Column 1[/col]\n[col]Column 2[/col]');
    if (type === '3col')  _wrapBlock('[3column]', '[/3column]', '[col]Column 1[/col]\n[col]Column 2[/col]\n[col]Column 3[/col]');
    if (type === 'table') _wrapBlock('[table="grid ht"]', '[/table]', 'Header 1 | Header 2 | Header 3\nRow 1 | Cell | Cell\nRow 2 | Cell | Cell');
  }

  // ── Modals ───────────────────────────────────────────────

  function _openModal(name) {
    _activeModal = name;
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('hidden');
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    const m = document.getElementById('modal-' + name);
    if (m) {
      m.classList.remove('hidden');
      const first = m.querySelector('input, textarea');
      if (first) setTimeout(() => first.focus(), 50);
    }
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    _activeModal = null;
    _ta.focus();
  }

  // Modal insert functions (called by HTML onclick or modal buttons)

  function insertLink() {
    const url  = document.getElementById('link-url').value.trim();
    const text = document.getElementById('link-text').value.trim();
    if (!url) return;
    const tag = text ? `[url=${url}]${text}[/url]` : `[url]${url}[/url]`;
    _insertAtSaved(tag);
    document.getElementById('link-url').value = '';
    document.getElementById('link-text').value = '';
    closeModal();
  }

  function insertImageUrl() {
    const url = document.getElementById('img-url').value.trim();
    if (!url) return;
    _insertAtSaved(`[img]${url}[/img]`);
    document.getElementById('img-url').value = '';
    closeModal();
  }

  function insertYoutube() {
    const url = document.getElementById('yt-url').value.trim();
    if (!url) return;
    _insertAtSaved(`[youtube]${url}[/youtube]`);
    document.getElementById('yt-url').value = '';
    closeModal();
  }

  function insertQuote() {
    const author = document.getElementById('quote-author').value.trim();
    const tag = author ? `[quote="${author}"]` : '[quote]';
    const s = _selStart, e = _selEnd;
    const selected = _ta.value.slice(s, e).trim();
    const inner = selected || 'Quoted text here';
    _ta.focus();
    _ta.setRangeText(`${tag}\n${inner}\n[/quote]`, s, e, 'end');
    document.getElementById('quote-author').value = '';
    closeModal();
    _onInput();
  }

  function insertSpoiler() {
    const title = document.getElementById('spoiler-title').value.trim();
    const tag = title ? `[spoiler="${title}"]` : '[spoiler]';
    const s = _selStart, e = _selEnd;
    const selected = _ta.value.slice(s, e).trim();
    const inner = selected || 'Hidden content';
    _ta.focus();
    _ta.setRangeText(`${tag}\n${inner}\n[/spoiler]`, s, e, 'end');
    document.getElementById('spoiler-title').value = '';
    closeModal();
    _onInput();
  }

  function insertNote() {
    const user = document.getElementById('note-user').value.trim();
    if (!user) return;
    _restoreSelection();
    _wrapBlock(`[note="${user}"]`, '[/note]', 'Note content');
    document.getElementById('note-user').value = '';
    closeModal();
  }

  function insertPrivate() {
    const user = document.getElementById('private-user').value.trim();
    if (!user) return;
    _restoreSelection();
    _wrapBlock(`[private="${user}"]`, '[/private]', 'Private content');
    document.getElementById('private-user').value = '';
    closeModal();
  }

  // ── Shared imgbb helpers ─────────────────────────────────

  function _imgbbUpload(b64) {
    const form = new FormData();
    form.append('image', b64);
    return fetch('https://api.imgbb.com/1/upload?key=' + _IK, { method: 'POST', body: form })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(data => {
        if (!data.success) throw new Error(data.error?.message || 'Upload failed');
        return data.data.url;
      });
  }

  function _readAndUpload(file, onSuccess, onError) {
    const reader = new FileReader();
    reader.onload = ev => {
      _imgbbUpload(ev.target.result.split(',')[1]).then(onSuccess).catch(onError);
    };
    reader.readAsDataURL(file);
  }

  // ── Image upload modal (imgbb) ───────────────────────────

  function initImageUpload() {
    const dropArea  = document.getElementById('img-drop-area');
    const fileInput = document.getElementById('img-file-input');
    const browseBtn = document.getElementById('img-browse-btn');

    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => {
      const f = e.target.files[0];
      if (f) _uploadFile(f);
      e.target.value = '';
    });
    dropArea.addEventListener('dragover', e => { e.preventDefault(); dropArea.classList.add('drag-over'); });
    dropArea.addEventListener('dragleave', () => dropArea.classList.remove('drag-over'));
    dropArea.addEventListener('drop', e => {
      e.preventDefault();
      dropArea.classList.remove('drag-over');
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) _uploadFile(f);
    });

    // Also allow dropping images directly onto the textarea
    _ta.addEventListener('dragover', e => {
      if ([...e.dataTransfer.types].includes('Files')) {
        e.preventDefault();
        _ta.classList.add('drag-over');
      }
    });
    _ta.addEventListener('dragleave', () => _ta.classList.remove('drag-over'));
    _ta.addEventListener('drop', e => {
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) {
        e.preventDefault();
        _ta.classList.remove('drag-over');
        _pasteUpload(f); // reuse paste upload path (inserts at cursor)
      }
    });
  }

  function _uploadFile(file) {
    const status = document.getElementById('img-upload-status');
    status.textContent = 'Uploading\u2026';
    status.className = 'upload-status uploading';
    _readAndUpload(file,
      url => {
        status.textContent = 'Uploaded!';
        status.className = 'upload-status success';
        _insertAtSaved(`[img]${url}[/img]`);
        setTimeout(() => { status.textContent = ''; status.className = 'upload-status'; closeModal(); }, 800);
      },
      err => {
        status.textContent = 'Upload failed: ' + err.message;
        status.className = 'upload-status error';
      }
    );
  }

  // ── View modes ───────────────────────────────────────────

  function setViewMode(mode) {
    _viewMode = mode;
    document.querySelectorAll('.view-mode-btn, .mobile-tab').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    const src = document.getElementById('source-pane');
    const pre = document.getElementById('preview-pane');
    const div = document.getElementById('pane-divider');
    if (mode === 'split') {
      src.style.display = ''; pre.style.display = ''; div.style.display = '';
      src.style.flex = ''; pre.style.flex = '';
    } else if (mode === 'source') {
      src.style.display = ''; pre.style.display = 'none'; div.style.display = 'none';
      src.style.flex = '1';
    } else if (mode === 'preview') {
      src.style.display = 'none'; pre.style.display = ''; div.style.display = 'none';
      pre.style.flex = '1';
    }
  }

  // ── Resizable divider ────────────────────────────────────

  function _initDivider() {
    const divider   = document.getElementById('pane-divider');
    const area      = document.getElementById('editor-area');
    const srcPane   = document.getElementById('source-pane');
    const prePane   = document.getElementById('preview-pane');
    let dragging = false, startX = 0, startLeft = 0;

    divider.addEventListener('mousedown', e => {
      dragging = true;
      startX = e.clientX;
      startLeft = srcPane.getBoundingClientRect().width;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const totalW = area.getBoundingClientRect().width - divider.offsetWidth;
      const newLeft = Math.max(100, Math.min(totalW - 100, startLeft + (e.clientX - startX)));
      const frac = newLeft / totalW;
      srcPane.style.flex = `0 0 ${frac * 100}%`;
      prePane.style.flex = `0 0 ${(1 - frac) * 100}%`;
    });
    document.addEventListener('mouseup', () => {
      if (dragging) { dragging = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; }
    });
  }

  // ── Get/Set content ──────────────────────────────────────

  function getContent()     { return _ta.value; }
  function setContent(val)  { _ta.value = val || ''; _renderPreview(); setDirty(false); }
  function getTitle()       { return document.getElementById('post-title').value.trim(); }
  function setTitle(val)    { document.getElementById('post-title').value = val || ''; }
  function focusEditor()    { _ta.focus(); }

  return {
    init, setDirty, isDirty, renderPreview,
    closeModal, insertLink, insertImageUrl, insertYoutube,
    insertQuote, insertSpoiler, insertNote, insertPrivate,
    initImageUpload, setViewMode,
    getContent, setContent, getTitle, setTitle, focusEditor,
  };
})();
