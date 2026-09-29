/* Drawing formula values in cells and cards, and editing note properties
   in place (with the Properties editors, so a cell edits exactly like the
   Properties block and writes the same YAML). */

import { h, icon, Notice } from '../core/ui.js';
import { BDate, BLink, BFile, BImage, BIcon, BHtml, typeOf, toText, isEmpty } from './values.js';
import { CellError, parseProp } from './query.js';
import { internalLink, renderLinkish, tagLink } from '../properties/widgets.js';
import { saveOpenEditors } from '../properties/block.js';

/* The Properties type a column shows with, or null for values that aren't
   note properties. */
export function propType(app, id, row) {
  const p = parseProp(id);
  if (p.kind !== 'note' || !app.properties) return null;
  return app.properties.types.getType(p.name, row ? row.raw(p.name) : undefined);
}

export function renderCellValue(app, value, opts = {}) {
  const sourcePath = opts.sourcePath || '';
  if (value instanceof CellError) {
    return h('span.bases-cell-error', { 'aria-label': value.message, title: value.message }, icon('alert-triangle'), h('span', { text: 'Error' }));
  }
  if (value === null || value === undefined || (typeof value === 'string' && value === '')) return h('span.bases-cell-empty');
  const t = typeOf(value);
  if (t === 'boolean') return h('input.metadata-input-checkbox', { type: 'checkbox', checked: value, disabled: true });
  if (t === 'link') return internalLink(app, value.linktext, value.display, value.sourcePath || sourcePath);
  if (t === 'file') {
    const f = value.file;
    const a = internalLink(app, app.metadataCache.fileToLinktext(f, '', f.extension === 'md'), f.extension === 'md' ? f.basename : f.name, '');
    return a;
  }
  if (t === 'date') return h('span.bases-date', { text: value.toString() });
  if (t === 'image') return renderImage(app, value.src, sourcePath);
  if (t === 'icon') return h('span.bases-icon', icon(value.name));
  if (t === 'html') { const s = h('span.bases-html'); s.innerHTML = sanitize(value.html); return s; }
  if (t === 'list') {
    const isTags = opts.tags || (value.length && value.every(v => typeof v === 'string' && v.startsWith('#')));
    return h('div.multi-select-container.mod-readonly', value.filter(v => !isEmpty(v)).map(v => {
      if (isTags && typeof v === 'string') return h('div.multi-select-pill.mod-tag', h('div.multi-select-pill-content', tagLink(app, v)));
      const inner = renderCellValue(app, v, { sourcePath });
      return h('div.multi-select-pill', h('div.multi-select-pill-content', inner.nodeType === 1 ? inner : h('span', inner)));
    }));
  }
  if (t === 'number') return h('span.bases-number', { text: toText(value) });
  if (t === 'object') return h('span.bases-object', { text: JSON.stringify(value) });
  const node = renderLinkish(app, value, sourcePath);
  return node.nodeType === 1 ? node : h('span', { text: String(value) });
}

/* An image from a vault path, a [[link]], a URL, or a colour. */
export function renderImage(app, src, sourcePath, cls = 'bases-image') {
  const img = h('img.' + cls, { alt: '', loading: 'lazy', draggable: 'false' });
  const url = imageUrl(app, src, sourcePath);
  if (url && url.then) url.then(u => { if (u) img.src = u; else img.replaceWith(h('span.bases-cell-empty')); });
  else if (url) img.src = url;
  return img;
}

export function isColour(s) { return typeof s === 'string' && /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([^)]*\))$/i.test(s.trim()); }

/* A URL an <img> can load, or a promise of one. */
export function imageUrl(app, src, sourcePath) {
  if (src === null || src === undefined) return null;
  let file = null;
  if (src instanceof BFile) file = src.file;
  else if (src instanceof BLink) file = src.resolve(app);
  else {
    const s = toText(Array.isArray(src) ? src[0] : src).trim();
    if (!s) return null;
    if (/^(https?:|data:|blob:)/i.test(s)) return s;
    const wl = /^!?\[\[([^\]|#]+)/.exec(s);
    const path = wl ? wl[1] : s;
    file = app.vault.getFileByPath(path) || app.metadataCache.getFirstLinkpathDest(path, sourcePath || '');
  }
  return file ? app.vault.getResourceUrl(file) : null;
}

/* Keep formatting, drop anything that runs code. */
function sanitize(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = String(html);
  tpl.content.querySelectorAll('script, style, iframe, object, embed, link, meta').forEach(n => n.remove());
  tpl.content.querySelectorAll('*').forEach(el => {
    for (const a of Array.from(el.attributes)) {
      if (/^on/i.test(a.name) || /^\s*javascript:/i.test(a.value)) el.removeAttribute(a.name);
    }
  });
  return tpl.innerHTML;
}

/* Write one property of one note. A null value keeps the key, empty, as
   the Properties block does. */
export async function writeProperty(app, file, name, value) {
  if (!file || file.extension !== 'md') return;
  try {
    await saveOpenEditors(app, file);
    await app.fileManager.processFrontMatter(file, data => {
      const lower = name.toLowerCase();
      const key = Object.keys(data).find(k => k.toLowerCase() === lower) ?? name;
      data[key] = value;
    });
  } catch (e) { new Notice('Couldn’t save the property: ' + (e.message || e)); }
}

/* Put an editor in `el` for property `id` of the row's note. Returns the
   editor, or null for values that can't be edited here. */
export function mountCellEditor(app, el, row, id, onDone) {
  const p = parseProp(id);
  if (p.kind !== 'note' || row.file.extension !== 'md' || !app.properties) return null;
  const raw = row.raw(p.name);
  const type = app.properties.types.getType(p.name, raw);
  let finished = false;
  const done = how => { if (finished) return; finished = true; onDone(how); };
  const editor = app.properties.createValueEditor(app, {
    type, value: raw, name: p.name, sourcePath: row.file.path, editable: true,
    onChange: v => writeProperty(app, row.file, row.keyFor(p.name) ?? p.name, v),
    onKey: key => { if (key === 'enter' || key === 'escape') done(key); }
  });
  el.replaceChildren(editor.el);
  el.classList.add('is-editing');
  const onOut = () => setTimeout(() => {
    if (!el.contains(document.activeElement) && !document.querySelector('.suggestion-container.mod-property-suggest')) {
      el.removeEventListener('focusout', onOut);
      done('blur');
    }
  }, 0);
  el.addEventListener('focusout', onOut);
  editor.focus();
  return editor;
}
