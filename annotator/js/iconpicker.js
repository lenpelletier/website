'use strict';

const ICON_CDN = 'https://cdn.jsdelivr.net/gh/game-icons/icons@master';

const IconPicker = {
  _panel:       null,
  _grid:        null,
  _search:      null,
  _activeCat:   'All',
  _cache:       {},   // 'author/slug' → data URL (colorized white SVG)
  _categories:  ['All', 'Weapons', 'Magic', 'Hazards', 'Terrain', 'Creatures', 'Status'],

  init() {
    this._panel  = document.getElementById('icon-picker');
    this._grid   = document.getElementById('icon-grid');
    this._search = document.getElementById('icon-search');

    // Category tabs
    document.getElementById('icon-category-tabs').querySelectorAll('.cat-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._activeCat = tab.dataset.cat;
        this._renderGrid();
      });
    });

    // Search
    this._search.addEventListener('input', () => this._renderGrid());

    // Close button
    document.getElementById('icon-picker-close').addEventListener('click', () => this.close());

    // Upload button inside picker
    document.getElementById('icon-picker-upload').addEventListener('click', () => {
      this.close();
      document.getElementById('stamp-input').click();
    });

    // Click outside to close
    document.addEventListener('mousedown', e => {
      if (this._panel.classList.contains('hidden')) return;
      if (!this._panel.contains(e.target) && !e.target.closest('[data-tool="stamp"]')) {
        this.close();
      }
    });
  },

  open() {
    this._panel.classList.remove('hidden');
    this._search.value = '';
    this._activeCat = 'All';
    document.querySelectorAll('.cat-tab').forEach(t => t.classList.toggle('active', t.dataset.cat === 'All'));
    this._renderGrid();
    this._search.focus();
  },

  close() {
    this._panel.classList.add('hidden');
  },

  _renderGrid() {
    const term = this._search.value.toLowerCase().trim();
    const cat  = this._activeCat;

    const icons = window.IconManifest.filter(ic => {
      if (cat !== 'All' && ic.category !== cat) return false;
      if (term && !ic.name.toLowerCase().includes(term))   return false;
      return true;
    });

    this._grid.innerHTML = '';

    if (icons.length === 0) {
      this._grid.innerHTML = '<div class="icon-grid-empty">No icons found.</div>';
      return;
    }

    for (const icon of icons) {
      const cell  = document.createElement('div');
      cell.className = 'icon-cell';
      cell.title = icon.name;

      const img = document.createElement('img');
      img.alt = icon.name;
      img.width  = 40;
      img.height = 40;
      img.className = 'icon-thumb';

      const path  = icon.author + '/' + icon.slug;
      const color = window.AppState ? window.AppState.toolOptions.color : '#4466ff';
      this.loadIconSrc(path, color)
        .then(src  => { img.src = src; })
        .catch(()  => { img.classList.add('icon-load-error'); });

      const lbl = document.createElement('span');
      lbl.textContent = icon.name;

      cell.appendChild(img);
      cell.appendChild(lbl);
      cell.addEventListener('click', () => window.App._addStampFromIcon(icon));
      this._grid.appendChild(cell);
    }
  },

  // Fetches the SVG from jsDelivr and returns a data URL ready for canvas use.
  // Game-icons SVGs contain two layers: a solid black background rect and white
  // icon paths. We strip the background so the stamp has a transparent backing.
  // Results are cached so each icon is only fetched once per session.
  // Fetches the SVG from jsDelivr, recolors its background to `color`, and
  // returns a data URL. The white icon paths are left unchanged.
  // Cached per path+color combination so each combo is only fetched once.
  async loadIconSrc(path, color) {
    color = color || '#4466ff';
    const key = path + ':' + color;
    if (this._cache[key]) return this._cache[key];

    const [author, slug] = path.split('/');
    const url = `${ICON_CDN}/${author}/${slug}.svg`;

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Icon not found: ${path} (${resp.status})`);
    const svg = await resp.text();

    // Replace the solid black background square with the chosen color.
    // The icon shapes already carry fill="#fff" so they stay white.
    const colorized = svg.replace(
      /<path d="M0 0h512v512H0z"[^>]*\/?>/g,
      `<path d="M0 0h512v512H0z" fill="${color}"/>`
    );
    const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(colorized);

    this._cache[key] = dataUrl;
    return dataUrl;
  },
};

window.IconPicker = IconPicker;
