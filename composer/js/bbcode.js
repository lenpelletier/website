'use strict';
/* =========================================================
   BBCode renderer for Gamers' Plane
   Converts GP-flavored BBCode to HTML for preview.
   ========================================================= */
const BBCode = (() => {

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function ytId(url) {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?[^#]*v=|embed\/))([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  // Apply regex replacement iteratively (handles simple nesting)
  function rep(text, re, fn) {
    let prev = '';
    while (prev !== text) { prev = text; text = text.replace(re, fn); }
    return text;
  }

  // Attr pattern: handles both "val" and &quot;val&quot;
  const Q = '(?:&quot;|")';

  function render(raw) {
    if (!raw) return '';
    let t = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // ── 1. Extract [code] blocks ──────────────────────────────
    const codes = [];
    t = t.replace(/\[code\]([\s\S]*?)\[\/code\]/gi, (_, c) => {
      codes.push(c);
      return `\x00C${codes.length - 1}\x00`;
    });

    // ── 2. HTML-escape remaining text (BBCode [] unaffected) ──
    t = esc(t);

    // ── 3. Block-level tags ───────────────────────────────────

    // [ooc]
    t = rep(t, /\[ooc\]([\s\S]*?)\[\/ooc\]/gi,
      (_, c) => `<div class="bb-ooc"><span class="bb-ooc-label">OOC</span><div class="bb-ooc-body">${c.trim()}</div></div>`);

    // [quote="Author"] or [quote]
    t = rep(t, new RegExp(`\\[quote(?:=${Q}([^"&\\]<>]*)${Q})?\\]([\\s\\S]*?)\\[/quote\\]`, 'gi'),
      (_, author, c) => {
        const cite = author ? `<cite>${esc(author)} wrote:</cite>` : '';
        return `<blockquote class="bb-quote">${cite}<div class="bb-quote-body">${c.trim()}</div></blockquote>`;
      });

    // [spoiler="Title"] or [spoiler]
    t = rep(t, new RegExp(`\\[spoiler(?:=${Q}([^"&\\]<>]*)${Q})?\\]([\\s\\S]*?)\\[/spoiler\\]`, 'gi'),
      (_, title, c) => {
        const label = title ? esc(title) : 'Spoiler';
        return `<details class="bb-spoiler"><summary class="bb-spoiler-toggle">${label}</summary><div class="bb-spoiler-body">${c.trim()}</div></details>`;
      });

    // [note="User"]
    t = rep(t, new RegExp(`\\[note=${Q}([^"&\\]<>]*)${Q}\\]([\\s\\S]*?)\\[/note\\]`, 'gi'),
      (_, user, c) => `<div class="bb-note"><span class="bb-note-label">&#128274; Note to ${esc(user)}</span><div class="bb-note-body">${c.trim()}</div></div>`);

    // [private="User"]
    t = rep(t, new RegExp(`\\[private=${Q}([^"&\\]<>]*)${Q}\\]([\\s\\S]*?)\\[/private\\]`, 'gi'),
      (_, user, c) => `<div class="bb-private"><span class="bb-private-label">&#128274; Private: ${esc(user)}</span><div class="bb-private-body">${c.trim()}</div></div>`);

    // [list] / [list=type]
    t = rep(t, /\[list(?:=([a-z#1i]+))?\]([\s\S]*?)\[\/list\]/gi, (_, type, content) => {
      const items = content.split('[*]').slice(1).map(s => `<li>${s.replace(/^\n|\n$/g, '').trim()}</li>`).join('');
      if (!type || type === 'bullet') return `<ul class="bb-list">${items}</ul>`;
      if (type === '#' || type === '1') return `<ol class="bb-list">${items}</ol>`;
      if (type === 'a') return `<ol class="bb-list" type="a">${items}</ol>`;
      if (type === 'i') return `<ol class="bb-list" type="i">${items}</ol>`;
      return `<ul class="bb-list">${items}</ul>`;
    });

    // [table="options"] or [table]
    t = rep(t, new RegExp(`\\[table(?:=${Q}([^"&\\]<>]*)${Q})?\\]([\\s\\S]*?)\\[/table\\]`, 'gi'), (_, opts, content) => {
      const o = (opts || '').toLowerCase().split(/\s+/);
      const headTop  = o.includes('ht') || o.includes('htl');
      const headLeft = o.includes('hl') || o.includes('htl');
      const grid   = o.includes('grid')   ? ' bb-table-grid'   : '';
      const zebra  = o.includes('zebra')  ? ' bb-table-zebra'  : '';
      const center = (o.includes('center') || o.includes('centre')) ? ' bb-table-center' : '';
      const compact= o.includes('compact') ? ' bb-table-compact' : '';
      const rows = content.trim().split('\n').filter(r => r.trim());
      let html = `<div class="bb-table-wrap"><table class="bb-table${grid}${zebra}${center}${compact}">`;
      rows.forEach((row, ri) => {
        const cells = row.split('|');
        html += '<tr>';
        cells.forEach((cell, ci) => {
          const isHead = (headTop && ri === 0) || (headLeft && ci === 0);
          html += isHead ? `<th>${cell.trim()}</th>` : `<td>${cell.trim()}</td>`;
        });
        html += '</tr>';
      });
      html += '</table></div>';
      return html;
    });

    // [2column] / [3column] with [col] children
    t = rep(t, /\[2column\]([\s\S]*?)\[\/2column\]/gi, (_, content) => {
      const cols = []; content.replace(/\[col\]([\s\S]*?)\[\/col\]/gi, (_, c) => cols.push(c));
      return `<div class="bb-cols bb-2col">${cols.map(c => `<div class="bb-col">${c.trim()}</div>`).join('')}</div>`;
    });
    t = rep(t, /\[3column\]([\s\S]*?)\[\/3column\]/gi, (_, content) => {
      const cols = []; content.replace(/\[col\]([\s\S]*?)\[\/col\]/gi, (_, c) => cols.push(c));
      return `<div class="bb-cols bb-3col">${cols.map(c => `<div class="bb-col">${c.trim()}</div>`).join('')}</div>`;
    });

    // [abilities="Title"]
    t = rep(t, new RegExp(`\\[abilities=${Q}([^"&\\]<>]*)${Q}\\]([\\s\\S]*?)\\[/abilities\\]`, 'gi'), (_, title, content) => {
      const lines = content.trim().split('\n');
      let html = `<div class="bb-abilities"><div class="bb-abilities-title">${esc(title)}</div><div class="bb-abilities-body">`;
      lines.forEach(line => {
        if (line.startsWith('# ')) html += `<h4>${line.slice(2)}</h4>`;
        else if (line.trim()) html += `<p>${line}</p>`;
      });
      return html + '</div></div>';
    });

    // [poll="Question" flags]
    t = rep(t, new RegExp(`\\[poll=${Q}([^"&\\]<>]*)${Q}[^\\]]*\\]([\\s\\S]*?)\\[/poll\\]`, 'gi'), (_, question, content) => {
      const options = content.trim().split('\n').filter(Boolean);
      const opts = options.map(o => `<li class="bb-poll-opt"><span class="bb-poll-bar"></span>${o.trim()}</li>`).join('');
      return `<div class="bb-poll"><div class="bb-poll-question">&#128200; ${esc(question)}</div><ul class="bb-poll-opts">${opts}</ul><div class="bb-poll-note">[poll — voting not available in preview]</div></div>`;
    });

    // ── 4. Inline tags ────────────────────────────────────────

    t = rep(t, /\[b\]([\s\S]*?)\[\/b\]/gi,   (_, c) => `<strong>${c}</strong>`);
    t = rep(t, /\[i\]([\s\S]*?)\[\/i\]/gi,   (_, c) => `<em>${c}</em>`);
    t = rep(t, /\[u\]([\s\S]*?)\[\/u\]/gi,   (_, c) => `<u>${c}</u>`);
    t = rep(t, /\[s\]([\s\S]*?)\[\/s\]/gi,   (_, c) => `<s>${c}</s>`);

    // [color="value"] — supports named, hex, or CSS extension (starts with ;)
    t = rep(t, /\[color=(?:&quot;|")?([^"&\]\n]+?)(?:&quot;|")?\]([\s\S]*?)\[\/color\]/gi, (_, color, c) => {
      color = color.trim();
      const style = color.startsWith(';') ? color : `color:${color}`;
      return `<span style="${esc(style)}">${c}</span>`;
    });

    // [size="150"] — percentage
    t = rep(t, /\[size=(?:&quot;|")?(\d+)(?:&quot;|")?\]([\s\S]*?)\[\/size\]/gi,
      (_, sz, c) => `<span style="font-size:${sz}%">${c}</span>`);

    // [f=params] — advanced format
    t = rep(t, /\[f=([^\]]+)\]([\s\S]*?)\[\/f\]/gi, (_, params, c) => {
      const sizeMap = { tiny: '0.6em', small: '0.8em', medium: '1em', large: '1.3em', xlarge: '1.8em' };
      const styles = [];
      params.trim().split(/\s+/).forEach(p => {
        if (sizeMap[p]) styles.push(`font-size:${sizeMap[p]}`);
        else if (/^(left|center|right|justify)$/.test(p)) styles.push(`text-align:${p}`);
      });
      return `<span${styles.length ? ` style="${styles.join(';')}"` : ''}>${c}</span>`;
    });

    // [url=href]text[/url] and [url]href[/url]
    t = rep(t, /\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi,
      (_, href, c) => `<a href="${href.trim()}" target="_blank" rel="noopener">${c}</a>`);
    t = rep(t, /\[url\]([\s\S]*?)\[\/url\]/gi,
      (_, href) => `<a href="${href.trim()}" target="_blank" rel="noopener">${href.trim()}</a>`);

    // [email]
    t = rep(t, /\[email\]([\s\S]*?)\[\/email\]/gi,
      (_, e) => `<a href="mailto:${e.trim()}">${e.trim()}</a>`);

    // [img]
    t = rep(t, /\[img\]([\s\S]*?)\[\/img\]/gi,
      (_, src) => `<img src="${src.trim()}" class="bb-img" alt="image" loading="lazy">`);

    // [youtube]
    t = rep(t, /\[youtube\]([\s\S]*?)\[\/youtube\]/gi, (_, url) => {
      const id = ytId(url.trim());
      return id
        ? `<div class="bb-youtube"><iframe src="https://www.youtube.com/embed/${id}" allowfullscreen loading="lazy"></iframe></div>`
        : `<a href="${url.trim()}" target="_blank" rel="noopener">${url.trim()}</a>`;
    });

    // [linebreak]
    t = t.replace(/\[linebreak\]/gi, '<hr class="bb-hr">');

    // @mentions
    t = t.replace(/@(\w+)/g, '<span class="bb-mention">@$1</span>');

    // ── 5. Newlines → <br> then clean up around block elements ──
    t = t.replace(/\n/g, '<br>');
    const BLOCKS = 'div|blockquote|ul|ol|li|details|table|tr|td|th|summary|pre';
    const BRE = new RegExp(`(<(?:${BLOCKS})[^>]*>)<br>`, 'gi');
    const BRL = new RegExp(`<br>(<\/(?:${BLOCKS})>)`, 'gi');
    for (let i = 0; i < 3; i++) { t = t.replace(BRE, '$1').replace(BRL, '$1'); }

    // ── 6. Restore code blocks ────────────────────────────────
    t = t.replace(/\x00C(\d+)\x00/g, (_, i) =>
      `<pre class="bb-code"><code>${esc(codes[+i])}</code></pre>`);

    return t;
  }

  // Strip all BBCode tags for plain text excerpts
  function toPlainText(raw) {
    if (!raw) return '';
    return raw
      .replace(/\[\/?\w[^\]]*\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return { render, toPlainText };
})();
