'use strict';

let _idCounter = 0;

function _numericFontSize(fontSize) {
  if (typeof fontSize === 'number') return fontSize;
  return { small: 12, medium: 18, large: 28 }[fontSize] || 18;
}

function generateId() {
  return 'ann_' + (++_idCounter) + '_' + Math.random().toString(36).substr(2, 9);
}

function createMarker(x, y, number, label, options) {
  label = label || '';
  options = options || {};
  return {
    id: generateId(),
    type: 'marker',
    x, y,
    number: String(number),
    label,
    color: options.color || '#ff0000',
    fontSize: _numericFontSize(options.fontSize),
    visible: true,
  };
}

function createText(x, y, text, options) {
  options = options || {};
  return {
    id: generateId(),
    type: 'text',
    x, y,
    text: text || '',
    color:        options.color    || '#ff0000',
    fontSize:     _numericFontSize(options.fontSize),
    fontFamily:   options.fontFamily   || 'default',
    bold:         options.bold   !== undefined ? options.bold   : true,
    italic:       options.italic || false,
    outline:      options.outline || false,
    outlineColor: options.outlineColor || '#000000',
    outlineWidth: options.outlineWidth || 2,
    shadow:       options.shadow !== undefined ? options.shadow : true,
    shadowColor:  options.shadowColor  || '#000000',
    shadowBlur:   options.shadowBlur   !== undefined ? options.shadowBlur : 6,
    visible: true,
  };
}

function createArrow(x1, y1, x2, y2, options) {
  options = options || {};
  return {
    id: generateId(),
    type: 'arrow',
    x1, y1, x2, y2,
    color: options.color || '#ff0000',
    width: options.width || 2,
    label: options.label || '',
    visible: true,
  };
}

function createLine(x1, y1, x2, y2, options) {
  options = options || {};
  return {
    id: generateId(),
    type: 'line',
    x1, y1, x2, y2,
    color: options.color || '#ff0000',
    width: options.width || 2,
    label: options.label || '',
    visible: true,
  };
}

function createCircle(cx, cy, r, options) {
  options = options || {};
  return {
    id: generateId(),
    type: 'circle',
    cx, cy, r,
    color: options.color || '#ff0000',
    width: options.width || 2,
    fill: options.fill || false,
    fillColor: options.fillColor || 'rgba(255,0,0,0.2)',
    label: options.label || '',
    visible: true,
  };
}

function createRect(x1, y1, x2, y2, options) {
  options = options || {};
  return {
    id: generateId(),
    type: 'rect',
    x1, y1, x2, y2,
    color: options.color || '#ff0000',
    width: options.width || 2,
    fill: options.fill || false,
    fillColor: options.fillColor || 'rgba(255,0,0,0.2)',
    label: options.label || '',
    visible: true,
  };
}

function createFreehand(points, options) {
  options = options || {};
  return {
    id: generateId(),
    type: 'freehand',
    points: (points || []).slice(),
    color: options.color || '#ff0000',
    width: options.width || 2,
    label: options.label || '',
    visible: true,
  };
}

function createStamp(x, y, width, height, imgbbUrl, stockIcon, iconColor) {
  return {
    id: generateId(),
    type: 'stamp',
    x, y,
    width, height,
    imgbbUrl:  imgbbUrl  || '',
    stockIcon: stockIcon || '',   // 'author/slug' for stock icons, empty for uploads
    iconColor: iconColor || '#4466ff', // background fill for stock icons
    visible: true,
  };
}

window.Annotations = {
  generateId,
  createMarker,
  createText,
  createArrow,
  createLine,
  createCircle,
  createRect,
  createFreehand,
  createStamp,
};
