'use strict';
/* =========================================================
   App — navigation, dashboard, post lifecycle
   ========================================================= */
const App = (() => {
  let _currentId = null;

  // ── Boot ─────────────────────────────────────────────────

  async function init() {
    // Show a loading state in the dashboard while fetching from server
    document.getElementById('posts-container').innerHTML =
      '<div class="loading-indicator">Loading posts\u2026</div>';
    document.getElementById('empty-state').classList.add('hidden');

    // Wire up App-level event handlers first so _appToast is available
    // before Storage.loadFromServer() can emit error toasts.
    window._appToast = _showToast;

    document.getElementById('new-post-btn').addEventListener('click', newPost);
    document.getElementById('back-btn').addEventListener('click', _backToDashboard);
    document.getElementById('save-btn').addEventListener('click', savePost);
    document.getElementById('post-title').addEventListener('input', () => Editor.setDirty(true));

    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target === document.getElementById('modal-overlay')) Editor.closeModal();
    });

    document.querySelectorAll('.modal input').forEach(input => {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          const btn = input.closest('.modal').querySelector('.btn-primary');
          if (btn) btn.click();
        }
      });
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.tool-dropdown-wrap')) {
        document.querySelectorAll('.tool-dropdown.open').forEach(d => d.classList.remove('open'));
      }
    });

    // Fetch posts from server (falls back to localStorage on error)
    await Storage.loadFromServer();

    Editor.init();
    Editor.initImageUpload();

    showDashboard();
  }

  // ── Views ─────────────────────────────────────────────────

  function showDashboard() {
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('editor').classList.add('hidden');
    _currentId = null;
    _renderDashboard();
  }

  function showEditor(id) {
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('editor').classList.remove('hidden');
    _currentId = id;

    const post = id ? Storage.getPost(id) : null;
    Editor.setTitle(post ? post.title : '');
    Editor.setContent(post ? post.content : '');
    Editor.setViewMode('split');
    Editor.focusEditor();
  }

  // ── Dashboard ─────────────────────────────────────────────

  function _renderDashboard() {
    const posts = Storage.getPosts();
    const container = document.getElementById('posts-container');
    const empty     = document.getElementById('empty-state');

    if (!posts.length) {
      container.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    container.innerHTML = posts.map(post => {
      const excerpt = BBCode.toPlainText(post.content).slice(0, 160);
      const words   = post.content.trim().split(/\s+/).length;
      const date    = _fmtDate(post.updatedAt);
      return `
        <div class="post-card" data-id="${post.id}">
          <div class="post-card-body">
            <div class="post-card-title">${_escH(post.title) || '<em class="untitled">Untitled</em>'}</div>
            <div class="post-card-meta">${date} &middot; ${words} word${words !== 1 ? 's' : ''}</div>
            <div class="post-card-excerpt">${_escH(excerpt)}${excerpt.length >= 160 ? '…' : ''}</div>
          </div>
          <div class="post-card-actions">
            <button class="btn btn-ghost btn-sm" onclick="App.editPost('${post.id}')">Edit</button>
            <button class="btn btn-copy btn-sm" onclick="App.copyBBCode('${post.id}')" title="Copy BBCode to clipboard">
              <span class="copy-icon">⎘</span> Copy BBCode
            </button>
            <button class="btn btn-danger btn-sm" onclick="App.deletePost('${post.id}')" title="Delete post">✕</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Post actions ──────────────────────────────────────────

  function newPost() {
    showEditor(null);
    _currentId = Storage.newId();
  }

  function editPost(id) {
    showEditor(id);
  }

  function savePost() {
    const title   = Editor.getTitle();
    const content = Editor.getContent();
    const id      = _currentId || Storage.newId();
    _currentId    = id;
    Storage.savePost({ id, title, content });
    Editor.setDirty(false);
    _showToast('Post saved');
  }

  function deletePost(id) {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    Storage.deletePost(id);
    _renderDashboard();
    _showToast('Post deleted');
  }

  function copyBBCode(id) {
    const post = Storage.getPost(id);
    if (!post) return;
    navigator.clipboard.writeText(post.content)
      .then(() => _showToast('BBCode copied to clipboard!'))
      .catch(() => {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = post.content;
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        _showToast('BBCode copied!');
      });
  }

  function closeModal(e) {
    if (!e || e.target === document.getElementById('modal-overlay')) {
      Editor.closeModal();
    }
  }

  // ── Navigation guard ──────────────────────────────────────

  function _backToDashboard() {
    if (Editor.isDirty()) {
      if (!confirm('You have unsaved changes. Go back without saving?')) return;
    }
    showDashboard();
  }

  // ── Toast ─────────────────────────────────────────────────

  function _showToast(msg, duration = 2500) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden', 'fade-out');
    t.classList.add('visible');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => {
      t.classList.add('fade-out');
      setTimeout(() => t.classList.remove('visible', 'fade-out'), 400);
    }, duration);
  }

  // ── Utils ─────────────────────────────────────────────────

  function _escH(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function _fmtDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' });
  }

  return {
    init, showDashboard, newPost, editPost, savePost,
    deletePost, copyBBCode, closeModal,
  };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
