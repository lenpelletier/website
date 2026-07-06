'use strict';

const COLOR_NAMES = {
  red: '#ff0000',
  blue: '#0066ff',
  green: '#00aa00',
  yellow: '#ffff00',
  white: '#ffffff',
  black: '#000000',
  orange: '#ff8800',
  purple: '#aa00ff',
  cyan: '#00ffff',
  pink: '#ff66aa',
};

const FONT_SIZES = { small: 12, medium: 16, large: 24 };

function parseColor(str) {
  if (!str) return null;
  const s = str.trim();
  if (s.startsWith('#')) return s;
  return COLOR_NAMES[s.toLowerCase()] || null;
}

function colorToName(hex) {
  if (!hex) return 'red';
  const lower = hex.toLowerCase();
  for (const [name, val] of Object.entries(COLOR_NAMES)) {
    if (val === lower) return name;
  }
  return hex;
}

function parseFontSize(str) {
  if (!str) return 18;
  const named = { small: 12, medium: 18, large: 28 };
  const lower = str.trim().toLowerCase();
  if (named[lower] !== undefined) return named[lower];
  const n = parseInt(str);
  return isNaN(n) ? 18 : Math.max(6, n);
}

// Parse (x, y) returning {x, y} or null
function parsePoint(str) {
  const m = str.match(/\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/);
  if (!m) return null;
  return { x: parseFloat(m[1]), y: parseFloat(m[2]) };
}

// Extract key:value options from a string
function parseOptions(str) {
  const opts = {};
  const colorMatch = str.match(/color:(\S+)/);
  if (colorMatch) {
    const c = parseColor(colorMatch[1]);
    if (c) opts.color = c;
  }
  const widthMatch = str.match(/width:(\d+)/);
  if (widthMatch) opts.width = parseInt(widthMatch[1]);
  const sizeMatch = str.match(/size:(\w+)/);
  if (sizeMatch) opts.fontSize = parseFontSize(sizeMatch[1]);
  const fillMatch = str.match(/fill:(true|1|yes)/i);
  if (fillMatch) opts.fill = true;

  // Text-specific options
  const fontMatch = str.match(/\bfont:([\w-]+)/);
  if (fontMatch) opts.fontFamily = fontMatch[1];
  if (/\bnobold\b/.test(str)) opts.bold = false;
  if (/\bitalic\b/.test(str)) opts.italic = true;
  const outlineMatch = str.match(/\boutline:(#[\da-fA-F]{3,8}):(\d+)/);
  if (outlineMatch) {
    opts.outline      = true;
    opts.outlineColor = outlineMatch[1];
    opts.outlineWidth = parseInt(outlineMatch[2]);
  }
  if (/\bnoshadow\b/.test(str)) {
    opts.shadow = false;
  } else {
    const shadowMatch = str.match(/\bshadow:(#[\da-fA-F]{3,8}):(\d+)/);
    if (shadowMatch) {
      opts.shadow      = true;
      opts.shadowColor = shadowMatch[1];
      opts.shadowBlur  = parseInt(shadowMatch[2]);
    }
  }

  return opts;
}

// Extract first quoted string
function parseLabel(str) {
  const m = str.match(/"((?:[^"\\]|\\.)*)"/);
  return m ? m[1] : '';
}

function parseMarkdown(text) {
  const lines = text.split('\n');
  const annotations = [];
  const noteLines = [];
  let markerCounter = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Section headers — skip
    if (trimmed.startsWith('#')) continue;

    // Notes lines
    if (trimmed.startsWith('>')) {
      noteLines.push(trimmed.slice(1).trim());
      continue;
    }

    // Annotation lines start with '-'
    if (!trimmed.startsWith('-')) continue;
    const content = trimmed.slice(1).trim();

    // Marker: [label] (x, y) [options] ["description"]
    // label can be any non-bracket characters: digits, letters, symbols
    const markerM = content.match(/^\[([^\]]+)\]\s+(\([^)]+\))(.*)/);
    if (markerM) {
      const markerLabel = markerM[1].trim();
      const pt = parsePoint(markerM[2]);
      if (pt) {
        const opts = parseOptions(markerM[3]);
        const label = parseLabel(markerM[3]);
        annotations.push(window.Annotations.createMarker(pt.x, pt.y, markerLabel, label, opts));
        // Only advance the numeric counter when the label is a plain integer
        const asInt = parseInt(markerLabel, 10);
        if (!isNaN(asInt) && String(asInt) === markerLabel) {
          markerCounter = Math.max(markerCounter, asInt);
        }
      }
      continue;
    }

    // Arrow: arrow (x1,y1) -> (x2,y2) [opts] ["label"]
    const arrowM = content.match(/^arrow\s+(\([^)]+\))\s*->\s*(\([^)]+\))(.*)/);
    if (arrowM) {
      const p1 = parsePoint(arrowM[1]);
      const p2 = parsePoint(arrowM[2]);
      if (p1 && p2) {
        const opts = parseOptions(arrowM[3]);
        opts.label = parseLabel(arrowM[3]);
        annotations.push(window.Annotations.createArrow(p1.x, p1.y, p2.x, p2.y, opts));
      }
      continue;
    }

    // Line: line (x1,y1) -> (x2,y2) [opts] ["label"]
    const lineM = content.match(/^line\s+(\([^)]+\))\s*->\s*(\([^)]+\))(.*)/);
    if (lineM) {
      const p1 = parsePoint(lineM[1]);
      const p2 = parsePoint(lineM[2]);
      if (p1 && p2) {
        const opts = parseOptions(lineM[3]);
        opts.label = parseLabel(lineM[3]);
        annotations.push(window.Annotations.createLine(p1.x, p1.y, p2.x, p2.y, opts));
      }
      continue;
    }

    // Circle: circle (cx,cy) r:N [opts] ["label"]
    const circleM = content.match(/^circle\s+(\([^)]+\))\s+r:(\d+(?:\.\d+)?)(.*)/);
    if (circleM) {
      const pt = parsePoint(circleM[1]);
      const r = parseFloat(circleM[2]);
      if (pt) {
        const opts = parseOptions(circleM[3]);
        opts.label = parseLabel(circleM[3]);
        annotations.push(window.Annotations.createCircle(pt.x, pt.y, r, opts));
      }
      continue;
    }

    // Rect: rect (x1,y1) (x2,y2) [opts] ["label"]
    const rectM = content.match(/^rect\s+(\([^)]+\))\s+(\([^)]+\))(.*)/);
    if (rectM) {
      const p1 = parsePoint(rectM[1]);
      const p2 = parsePoint(rectM[2]);
      if (p1 && p2) {
        const opts = parseOptions(rectM[3]);
        opts.label = parseLabel(rectM[3]);
        annotations.push(window.Annotations.createRect(p1.x, p1.y, p2.x, p2.y, opts));
      }
      continue;
    }

    // Path/freehand: path (x1,y1) (x2,y2) ... [opts] ["label"]
    if (content.startsWith('path')) {
      const pointRe = /\((-?[\d.]+),\s*(-?[\d.]+)\)/g;
      const points = [];
      let pm;
      while ((pm = pointRe.exec(content)) !== null) {
        points.push({ x: parseFloat(pm[1]), y: parseFloat(pm[2]) });
      }
      if (points.length >= 2) {
        const lastClose = content.lastIndexOf(')');
        const rest = content.slice(lastClose + 1);
        const opts = parseOptions(rest);
        opts.label = parseLabel(rest);
        annotations.push(window.Annotations.createFreehand(points, opts));
      }
      continue;
    }

    // Stamp: stamp (x,y) WxH url:https://...  OR  stamp (x,y) WxH stock:author/slug
    const stampM = content.match(/^stamp\s+(\([^)]+\))\s+(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)(.*)/);
    if (stampM) {
      const pt = parsePoint(stampM[1]);
      const w  = parseFloat(stampM[2]);
      const h  = parseFloat(stampM[3]);
      if (pt && w > 0 && h > 0) {
        const urlMatch   = stampM[4].match(/url:(\S+)/);
        const stockMatch = stampM[4].match(/stock:(\S+)/);
        const colorMatch = stampM[4].match(/color:(#[\da-fA-F]{3,8})/);
        const imgbbUrl   = urlMatch   ? urlMatch[1]   : '';
        const stockIcon  = stockMatch ? stockMatch[1] : '';
        const iconColor  = colorMatch ? colorMatch[1] : '#4466ff';
        annotations.push(window.Annotations.createStamp(pt.x, pt.y, w, h, imgbbUrl, stockIcon, iconColor));
      }
      continue;
    }

    // Text: text (x,y) "label" [opts]
    const textM = content.match(/^text\s+(\([^)]+\))(.*)/);
    if (textM) {
      const pt = parsePoint(textM[1]);
      if (pt) {
        const opts = parseOptions(textM[2]);
        const text = parseLabel(textM[2]);
        annotations.push(window.Annotations.createText(pt.x, pt.y, text, opts));
      }
      continue;
    }
  }

  return { annotations, notes: noteLines.join('\n'), markerCounter };
}

function generateMarkdown(annotations, notes) {
  const markers = annotations.filter(a => a.type === 'marker');
  const shapes  = annotations.filter(a => ['arrow','line','circle','rect','freehand'].includes(a.type));
  const texts   = annotations.filter(a => a.type === 'text');
  // Include stamps that have a permanent reference (imgbbUrl or stockIcon)
  // Stamps still uploading (neither set) are omitted until the upload completes
  const stamps  = annotations.filter(a => a.type === 'stamp' && (a.imgbbUrl || a.stockIcon));

  const lines = ['# Map Annotations', ''];

  if (markers.length > 0) {
    lines.push('## Markers');
    for (const m of markers) {
      const colorStr = m.color && m.color !== '#ff0000' ? ` color:${colorToName(m.color)}` : '';
      const fs = typeof m.fontSize === 'number' ? m.fontSize : ({ small:12, medium:18, large:28 }[m.fontSize] || 18);
      const sizeStr  = fs !== 18 ? ` size:${fs}` : '';
      const labelStr = m.label ? ` "${m.label}"` : '';
      lines.push(`- [${m.number}] (${Math.round(m.x)}, ${Math.round(m.y)})${colorStr}${sizeStr}${labelStr}`);
    }
    lines.push('');
  }

  if (shapes.length > 0) {
    lines.push('## Shapes');
    for (const s of shapes) {
      const colorStr = s.color && s.color !== '#ff0000' ? ` color:${colorToName(s.color)}` : '';
      const widthStr = s.width && s.width !== 2 ? ` width:${s.width}` : '';
      const fillStr  = s.fill ? ' fill:true' : '';
      const labelStr = s.label ? ` "${s.label}"` : '';

      if (s.type === 'arrow') {
        lines.push(`- arrow (${Math.round(s.x1)}, ${Math.round(s.y1)}) -> (${Math.round(s.x2)}, ${Math.round(s.y2)})${colorStr}${widthStr}${labelStr}`);
      } else if (s.type === 'line') {
        lines.push(`- line (${Math.round(s.x1)}, ${Math.round(s.y1)}) -> (${Math.round(s.x2)}, ${Math.round(s.y2)})${colorStr}${widthStr}${labelStr}`);
      } else if (s.type === 'circle') {
        lines.push(`- circle (${Math.round(s.cx)}, ${Math.round(s.cy)}) r:${Math.round(s.r)}${colorStr}${widthStr}${fillStr}${labelStr}`);
      } else if (s.type === 'rect') {
        lines.push(`- rect (${Math.round(s.x1)}, ${Math.round(s.y1)}) (${Math.round(s.x2)}, ${Math.round(s.y2)})${colorStr}${widthStr}${fillStr}${labelStr}`);
      } else if (s.type === 'freehand') {
        const pts = s.points.map(p => `(${Math.round(p.x)},${Math.round(p.y)})`).join(' ');
        lines.push(`- path ${pts}${colorStr}${widthStr}${labelStr}`);
      }
    }
    lines.push('');
  }

  if (texts.length > 0) {
    lines.push('## Labels');
    for (const t of texts) {
      const colorStr = t.color && t.color !== '#ff0000' ? ` color:${colorToName(t.color)}` : '';
      const tfs = typeof t.fontSize === 'number' ? t.fontSize : ({ small:12, medium:18, large:28 }[t.fontSize] || 18);
      const sizeStr     = tfs !== 18 ? ` size:${tfs}` : '';
      const fontStr     = t.fontFamily && t.fontFamily !== 'default' ? ` font:${t.fontFamily}` : '';
      const boldStr     = t.bold === false ? ' nobold' : '';
      const italicStr   = t.italic ? ' italic' : '';
      const outlineStr  = t.outline ? ` outline:${t.outlineColor || '#000000'}:${t.outlineWidth || 2}` : '';
      const noshadow    = t.shadow === false;
      const customShadow = !noshadow && t.shadow !== undefined &&
        ((t.shadowColor && t.shadowColor !== '#000000') || (typeof t.shadowBlur === 'number' && t.shadowBlur !== 6));
      const shadowStr   = noshadow ? ' noshadow'
        : customShadow ? ` shadow:${t.shadowColor || '#000000'}:${t.shadowBlur || 6}`
        : '';
      lines.push(`- text (${Math.round(t.x)}, ${Math.round(t.y)}) "${t.text || ''}"${fontStr}${boldStr}${italicStr}${outlineStr}${shadowStr}${sizeStr}${colorStr}`);
    }
    lines.push('');
  }

  if (stamps.length > 0) {
    lines.push('## Images');
    for (const s of stamps) {
      const ref = s.stockIcon
        ? `stock:${s.stockIcon} color:${s.iconColor || '#4466ff'}`
        : `url:${s.imgbbUrl}`;
      lines.push(`- stamp (${Math.round(s.x)}, ${Math.round(s.y)}) ${Math.round(s.width)}x${Math.round(s.height)} ${ref}`);
    }
    lines.push('');
  }

  if (notes && notes.trim()) {
    lines.push('## Notes');
    for (const noteLine of notes.split('\n')) {
      if (noteLine.trim()) lines.push('> ' + noteLine);
    }
    lines.push('');
  }

  return lines.join('\n');
}

window.MarkdownParser = { parseMarkdown, generateMarkdown, FONT_SIZES, COLOR_NAMES };
