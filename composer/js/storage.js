'use strict';
/* =========================================================
   Storage — persists posts to server (api.php / posts.txt)
   with localStorage as an immediate-response cache.

   Public API is synchronous (reads from localStorage cache).
   Server sync is async and debounced; errors surface as
   toast notifications via window._appToast.
   ========================================================= */
const Storage = (() => {
  const LS_KEY   = 'composer_posts';
  const API      = 'api.php';
  const MAX_BYTES = 50 * 1024 * 1024;

  let _syncTimer  = null;
  let _syncPending = false;   // true while a fetch is in flight

  // ── LocalStorage helpers ──────────────────────────────────

  function _lsLoad() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
    catch { return []; }
  }

  function _lsSave(posts) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(posts)); } catch {}
  }

  // ── Server sync ───────────────────────────────────────────

  // Call after every mutation; debounced so rapid saves don't spam the server.
  function _scheduleSync(posts) {
    clearTimeout(_syncTimer);
    _syncTimer = setTimeout(() => _pushToServer(posts), 400);
  }

  async function _pushToServer(posts) {
    if (_syncPending) {
      // Re-schedule if a request is still in flight
      _syncTimer = setTimeout(() => _pushToServer(posts), 600);
      return;
    }
    _syncPending = true;
    const body = JSON.stringify(posts);

    // Client-side size guard (same limit as server)
    if (new Blob([body]).size > MAX_BYTES) {
      _toast('\u26a0 Cannot save: data exceeds 50 MB limit', 6000);
      _syncPending = false;
      return;
    }

    try {
      const res  = await fetch(API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
      // Success — no toast needed; App.savePost() already showed one.
    } catch (e) {
      _toast('\u26a0 Server save failed: ' + e.message, 6000);
    } finally {
      _syncPending = false;
    }
  }

  // ── Load from server on startup ───────────────────────────

  async function loadFromServer() {
    try {
      const res = await fetch(API + '?_=' + Date.now()); // bust cache
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const posts = await res.json();
      if (Array.isArray(posts)) {
        _lsSave(posts);
        return posts;
      }
      throw new Error('Server returned unexpected data');
    } catch (e) {
      console.warn('[Storage] Could not load from server, falling back to local cache:', e.message);
      _toast('\u26a0 Could not reach server \u2014 using local data: ' + e.message, 5000);
      return _lsLoad();
    }
  }

  // ── Write helper ──────────────────────────────────────────

  function _persist(posts) {
    _lsSave(posts);         // immediate, synchronous
    _scheduleSync(posts);   // async server write
  }

  // ── Toast helper (safe to call before App initialises) ────

  function _toast(msg, dur) {
    if (window._appToast) window._appToast(msg, dur);
    else setTimeout(() => { if (window._appToast) window._appToast(msg, dur); }, 1000);
  }

  // ── Public API ────────────────────────────────────────────

  function getPosts() {
    return _lsLoad().sort((a, b) => b.updatedAt - a.updatedAt);
  }

  function getPost(id) {
    return _lsLoad().find(p => p.id === id) || null;
  }

  function savePost(post) {
    const posts = _lsLoad();
    const idx   = posts.findIndex(p => p.id === post.id);
    const now   = Date.now();
    if (idx >= 0) {
      posts[idx] = { ...posts[idx], ...post, updatedAt: now };
    } else {
      posts.unshift({ ...post, createdAt: now, updatedAt: now });
    }
    _persist(posts);
    return posts.find(p => p.id === post.id);
  }

  function deletePost(id) {
    _persist(_lsLoad().filter(p => p.id !== id));
  }

  function newId() {
    return 'p_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
  }

  return { getPosts, getPost, savePost, deletePost, newId, loadFromServer };
})();
