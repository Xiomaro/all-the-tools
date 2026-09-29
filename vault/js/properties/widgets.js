/* The editor for a property value of each type, with Obsidian's markup:
   text (.metadata-input-longtext, links shown as .metadata-link), lists,
   tags and aliases (.multi-select-container of .multi-select-pill), number,
   checkbox, date and date & time. Bases uses the same editors for its
   table cells.

   createValueEditor(app, {
     type, value, name, sourcePath, editable,
     onChange(value),          // the new value, as it should be stored
     onKey(key, e)             // 'enter' | 'escape' | 'up' | 'down' after the editor is done with it
   }) -> { el, focus(), destroy() } */

import { h, icon, fuzzyMatch, highlighted } from '../core/ui.js';
import { Workspace } from '../core/workspace.js';
import { listValue } from '../core/metadata.js';
import { InputSuggest } from './suggest.js';
import { TYPES, valueFits, convertValue, DATE_RE, DATETIME_RE } from './types.js';

const WIKI_ONLY = /^\s*!?\[\[([^\[\]]+?)\]\]\s*$/;
const MD_ONLY = /^\s*\[([^\]]*)\]\(([^)\s]+)\)\s*$/;
const URL_ONLY = /^\s*([a-z][a-z0-9+.-]*:\/\/[^\s]+|www\.[^\s]+)\s*$/i;

export function parseWikilink(s) {
  const m = WIKI_ONLY.exec(String(s));
  if (!m) return null;
  const inner = m[1];
  const bar = inner.indexOf('|');
  return { linktext: (bar < 0 ? inner : inner.slice(0, bar)).trim(), display: bar < 0 ? null : inner.slice(bar + 1) };
}

/* A link to a note, as Obsidian draws it: a.internal-link that opens on
   click (Ctrl for a new tab) and shows a preview on hover. */
export function internalLink(app, linktext, display, sourcePath, cls) {
  const dest = app.metadataCache.getFirstLinkpathDest(linktext.split('#')[0], sourcePath || '');
  const text = display || linktext;
  const a = h('a.internal-link' + (cls ? '.' + cls : ''), { text, href: linktext, dataset: { href: linktext }, target: '_blank', rel: 'noopener' });
  if (!dest && linktext.split('#')[0]) a.classList.add('is-unresolved');
  a.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    app.workspace.openLinkText(linktext, sourcePath || '', Workspace.leafFromEvent(e));
  });
  a.addEventListener('auxclick', e => { if (e.button === 1) { e.preventDefault(); app.workspace.openLinkText(linktext, sourcePath || '', 'tab'); } });
  a.addEventListener('mouseover', event => app.workspace.trigger('hover-link', {
    event, source: 'properties', hoverParent: a, targetEl: a, linktext, sourcePath: sourcePath || ''
  }));
  return a;
}

export function externalLink(url, text) {
  const href = /^www\./i.test(url) ? 'https://' + url : url;
  return h('a.external-link', { href, text: text || url, target: '_blank', rel: 'noopener noreferrer', onclick: e => e.stopPropagation() });
}

/* Text that may be a link, drawn as a link; anything else as text. */
export function renderLinkish(app, value, sourcePath) {
  const s = value === null || value === undefined ? '' : String(value);
  const wl = parseWikilink(s);
  if (wl) return internalLink(app, wl.linktext, wl.display, sourcePath);
  const md = MD_ONLY.exec(s);
  if (md) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(md[2])) return externalLink(md[2], md[1]);
    let target = md[2];
    try { target = decodeURI(target); } catch (e) { /* as written */ }
    return internalLink(app, target, md[1], sourcePath);
  }
  const url = URL_ONLY.exec(s);
  if (url) return externalLink(url[1]);
  return document.createTextNode(s);
}

export function tagLink(app, tag) {
  const t = String(tag).replace(/^#/, '');
  return h('a.tag', { href: '#' + t, text: '#' + t, onclick: e => {
    e.preventDefault(); e.stopPropagation();
    if (app.search && app.search.open) app.search.open('tag:#' + t);
  } });
}

/* --- link and value suggestions ------------------------------------------ */

/* Notes to suggest after "[[", best first. */
export function linkSuggestions(app, query, limit = 30) {
  const q = query.trim();
  const out = [];
  for (const s of app.metadataCache.getLinkSuggestions()) {
    const text = s.alias || (s.file ? (s.file.extension === 'md' ? s.file.path.replace(/\.md$/, '') : s.file.path) : s.path);
    const m = q ? fuzzyMatch(q, text) : { score: 0, matches: [] };
    if (m) out.push(Object.assign({ score: m.score, matches: m.matches, text }, s));
  }
  out.sort((a, b) => b.score - a.score || a.text.length - b.text.length);
  return out.slice(0, limit);
}

export function renderLinkSuggestion(item, el) {
  const title = item.alias || (item.file ? (item.file.extension === 'md' ? item.file.basename : item.file.name) : item.path);
  el.classList.add('mod-complex');
  el.append(h('div.suggestion-content',
    h('div.suggestion-title', title),
    item.file && (item.alias || item.file.path !== item.file.name) ? h('div.suggestion-note', { text: item.file.path }) : null,
    !item.file ? h('div.suggestion-note', { text: 'Not created yet' }) : null),
  item.alias ? h('div.suggestion-aux', h('span.suggestion-flair', icon('forward'))) : null);
}

/* The text of a link to a suggested note, from `sourcePath`. */
export function linkTextFor(app, item, sourcePath) {
  if (!item.file) return '[[' + item.path + ']]';
  const lt = app.metadataCache.fileToLinktext(item.file, sourcePath || '', true);
  return '[[' + lt + (item.alias ? '|' + item.alias : '') + ']]';
}

/* An open "[[" before the end of the text, or null. */
function openLink(text) {
  const i = text.lastIndexOf('[[');
  if (i < 0 || text.indexOf(']]', i) > -1) return null;
  return { start: i, query: text.slice(i + 2) };
}

function valueSuggestions(app, name, query, exclude) {
  const q = query.trim().toLowerCase();
  const values = app.properties ? app.properties.types.valuesOf(name) : [];
  return values.filter(v => (!exclude || !exclude.includes(v)) && (!q || v.toLowerCase().includes(q)) && v !== query).slice(0, 20)
    .map(v => ({ value: v }));
}

function placeCaretAtEnd(el) {
  el.focus();
  const sel = window.getSelection();
  if (!sel) return;
  const r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(false);
  sel.removeAllRanges();
  sel.addRange(r);
}

/* Contenteditable divs take pasted text only. */
function plainPaste(el) {
  el.addEventListener('paste', e => {
    e.preventDefault();
    const text = (e.clipboardData && e.clipboardData.getData('text/plain') || '').replace(/[\r\n]+/g, ' ');
    document.execCommand('insertText', false, text);
  });
}

/* --- editors ------------------------------------------------------------------ */

export function createValueEditor(app, o) {
  const type = TYPES[o.type] ? o.type : 'text';
  if (!valueFits(type, o.value)) return mismatchEditor(app, o, type);
  if (type === 'multitext' || type === 'tags' || type === 'aliases') return multiSelect(app, o, type);
  if (type === 'number') return numberEditor(o);
  if (type === 'checkbox') return checkboxEditor(o);
  if (type === 'date' || type === 'datetime') return dateEditor(o, type);
  return textEditor(app, o);
}

function textEditor(app, o) {
  const wrap = h('div.metadata-text-value');
  let value = o.value === null || o.value === undefined ? '' : String(o.value);
  const input = h('div.metadata-input-longtext.mod-truncate', { contenteditable: o.editable ? 'true' : 'false', placeholder: 'Empty', spellcheck: 'false', tabindex: o.editable ? '0' : '-1' });
  plainPaste(input);
  input.textContent = value;
  let suggest = null;
  if (o.editable) {
    suggest = new InputSuggest(app, input, {
      noOpenOnFocus: true,
      getSuggestions: text => {
        const open = openLink(text);
        if (open) return linkSuggestions(app, open.query).map(s => ({ link: s }));
        return valueSuggestions(app, o.name, text);
      },
      renderSuggestion: (item, el) => item.link ? renderLinkSuggestion(item.link, el) : el.append(h('div.suggestion-content', h('div.suggestion-title', { text: item.value }))),
      onSelect: item => {
        const text = input.textContent;
        if (item.link) { const open = openLink(text); input.textContent = text.slice(0, open.start) + linkTextFor(app, item.link, o.sourcePath); }
        else input.textContent = item.value;
        placeCaretAtEnd(input);
        commit();
      }
    });
    input.addEventListener('keydown', e => {
      if (e.isComposing) return;
      if (e.key === 'Enter') { e.preventDefault(); commit(); o.onKey && o.onKey('enter', e); }
      else if (e.key === 'Escape') { e.preventDefault(); input.textContent = value; o.onKey && o.onKey('escape', e); }
      else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !suggest.isOpen) { o.onKey && o.onKey(e.key === 'ArrowUp' ? 'up' : 'down', e); }
    });
    input.addEventListener('input', () => { if (!input.textContent) input.replaceChildren(); });
    input.addEventListener('blur', () => { commit(); showLinkIfAny(); });
  }
  function commit() {
    const next = input.textContent;
    if (next === value) return;
    value = next;
    o.onChange(next.trim() === '' ? null : next);
  }
  /* A value that is only a link shows as the link until clicked. */
  function showLinkIfAny() {
    const link = value && (parseWikilink(value) || MD_ONLY.test(value) || URL_ONLY.test(value)) ? renderLinkish(app, value, o.sourcePath) : null;
    if (!link || link.nodeType !== 1) { wrap.replaceChildren(input); return; }
    const inner = h('div.metadata-link-inner', link);
    const box = h('div.metadata-link', inner);
    if (o.editable) {
      box.append(h('div.metadata-link-flair', { 'aria-label': 'Edit', title: 'Edit', onclick: e => { e.stopPropagation(); edit(); } }, icon('pencil')));
      box.addEventListener('click', e => { if (!e.target.closest('a')) edit(); });
      box.tabIndex = 0;
      box.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.target.closest('a')) { e.preventDefault(); edit(); } });
    }
    wrap.replaceChildren(box);
  }
  function edit() { wrap.replaceChildren(input); placeCaretAtEnd(input); }
  showLinkIfAny();
  return {
    el: wrap,
    focus() { if (!o.editable) return; if (!input.isConnected) wrap.replaceChildren(input); placeCaretAtEnd(input); },
    destroy() { if (suggest) suggest.destroy(); }
  };
}

function numberEditor(o) {
  const input = h('input.metadata-input.metadata-input-number', { type: 'number', placeholder: 'Empty', disabled: !o.editable, step: 'any' });
  let value = o.value === null || o.value === undefined || o.value === '' ? '' : String(Number(o.value));
  input.value = value;
  const commit = () => {
    if (input.value === value) return;
    if (input.value !== '' && isNaN(Number(input.value))) { input.value = value; return; }
    value = input.value;
    o.onChange(value === '' ? null : Number(value));
  };
  input.addEventListener('change', commit);
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); o.onKey && o.onKey('enter', e); }
    else if (e.key === 'Escape') { e.preventDefault(); input.value = value; o.onKey && o.onKey('escape', e); }
  });
  return { el: input, focus() { input.focus(); input.select(); }, destroy() {} };
}

function checkboxEditor(o) {
  const on = o.value === true || o.value === 'true';
  const input = h('input.metadata-input-checkbox', { type: 'checkbox', checked: on, disabled: !o.editable, dataset: { indeterminate: String(o.value === null || o.value === undefined) } });
  input.addEventListener('change', () => { input.dataset.indeterminate = 'false'; o.onChange(input.checked); });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); input.checked = !input.checked; input.dispatchEvent(new Event('change')); }
    else if (e.key === 'Escape') { e.preventDefault(); o.onKey && o.onKey('escape', e); }
  });
  return { el: input, focus() { input.focus(); }, destroy() {} };
}

function dateEditor(o, type) {
  const isDT = type === 'datetime';
  const input = h('input.metadata-input.metadata-input-text' + (isDT ? '.mod-datetime' : '.mod-date'), {
    type: isDT ? 'datetime-local' : 'date', placeholder: 'Empty', disabled: !o.editable, max: isDT ? '9999-12-31T23:59' : '9999-12-31'
  });
  let value = o.value === null || o.value === undefined ? '' : (convertValue(type, o.value) || '');
  input.value = value;
  const commit = () => {
    const v = input.value;
    if (v === value) return;
    if (v && !(isDT ? DATETIME_RE : DATE_RE).test(v)) return;
    value = v;
    o.onChange(v || null);
  };
  input.addEventListener('change', commit);
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); o.onKey && o.onKey('enter', e); }
    else if (e.key === 'Escape') { e.preventDefault(); input.value = value; o.onKey && o.onKey('escape', e); }
  });
  return { el: input, focus() { input.focus(); }, destroy() {} };
}

/* A value that doesn't fit its property's type: shown as text with a
   warning, and converted to the type when edited (as Obsidian offers). */
function mismatchEditor(app, o, type) {
  const raw = typeof o.value === 'object' ? JSON.stringify(o.value) : String(o.value);
  const wrap = h('div.metadata-property-mismatch');
  const warn = h('div.metadata-property-warning-icon', { 'aria-label': 'Type mismatch, expected ' + TYPES[type].name, title: 'Type mismatch, expected ' + TYPES[type].name }, icon('alert-triangle'));
  const text = h('div.metadata-input-longtext.mod-truncate', { text: raw, contenteditable: 'false' });
  wrap.append(text);
  if (o.editable) {
    const fix = h('button.mod-muted', { text: 'Update', title: 'Convert the value to ' + TYPES[type].name, onclick: e => {
      e.stopPropagation();
      const v = convertValue(type, o.value);
      o.onChange(v === undefined ? null : v);
    } });
    wrap.append(warn, fix);
  } else wrap.append(warn);
  return { el: wrap, focus() { const b = wrap.querySelector('button'); if (b) b.focus(); }, destroy() {} };
}

/* Lists, tags and aliases: a pill per item and a box to type the next. */
function multiSelect(app, o, type) {
  const isTags = type === 'tags';
  let items = type === 'tags' ? listValue(o.value, true).map(t => t.replace(/^#/, ''))
    : Array.isArray(o.value) ? o.value.filter(x => x !== null && x !== undefined).map(String) : listValue(o.value, false);
  const box = h('div.multi-select-container', { tabindex: '-1' });
  const input = h('div.multi-select-input', { contenteditable: o.editable ? 'true' : 'false', tabindex: o.editable ? '0' : '-1', spellcheck: 'false', placeholder: items.length ? '' : 'Empty' });
  plainPaste(input);
  let suggest = null;

  const commit = () => o.onChange(items.length ? items.slice() : null);

  function pill(text, i) {
    const content = h('div.multi-select-pill-content');
    if (isTags) content.append(h('span', { text }));
    else {
      const node = renderLinkish(app, text, o.sourcePath);
      content.append(node.nodeType === 1 ? node : h('span', { text }));
    }
    const el = h('div.multi-select-pill', { tabindex: o.editable ? '0' : '-1', dataset: isTags ? { tag: text } : {} }, content);
    if (isTags) el.addEventListener('click', e => {
      if (e.target.closest('.multi-select-pill-remove-button')) return;
      if (app.search && app.search.open) app.search.open('tag:#' + text);
    });
    if (o.editable) {
      el.append(h('div.multi-select-pill-remove-button', { 'aria-label': 'Remove', onclick: e => { e.stopPropagation(); remove(i, false); } }, icon('x')));
      el.addEventListener('dblclick', e => { e.preventDefault(); editPill(i); });
      el.addEventListener('keydown', e => {
        if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); remove(i, true); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); focusPill(i - 1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); focusPill(i + 1); }
        else if (e.key === 'Enter') { e.preventDefault(); editPill(i); }
        else if (e.key === 'Escape') { e.preventDefault(); o.onKey && o.onKey('escape', e); }
      });
    }
    return el;
  }

  function render() {
    box.replaceChildren(...items.map(pill), o.editable ? input : '');
    input.setAttribute('placeholder', items.length ? '' : 'Empty');
    if (!o.editable && !items.length) box.append(h('div.multi-select-empty', { text: '' }));
  }
  function focusPill(i) {
    const pills = box.querySelectorAll('.multi-select-pill');
    if (i < 0) i = 0;
    if (i >= pills.length) { placeCaretAtEnd(input); return; }
    pills[i].focus();
  }
  function remove(i, keyboard) {
    items.splice(i, 1);
    render();
    commit();
    if (keyboard) focusPill(Math.max(0, i - 1));
  }
  function editPill(i) {
    const text = items[i];
    items.splice(i, 1);
    render();
    commit();
    input.textContent = isTags ? text : text;
    placeCaretAtEnd(input);
  }
  function addFromInput() {
    let text = input.textContent.trim();
    if (!text) { input.replaceChildren(); return false; }
    const parts = isTags ? text.split(/[\s,]+/).map(t => t.replace(/^#/, '')).filter(Boolean) : [text];
    let added = false;
    for (const p of parts) if (!items.includes(p)) { items.push(p); added = true; }
    input.replaceChildren();
    render();
    if (added) commit();
    placeCaretAtEnd(input);
    return true;
  }

  if (o.editable) {
    suggest = new InputSuggest(app, input, {
      noOpenOnFocus: true,
      getSuggestions: text => {
        if (type === 'aliases') return [];
        const open = openLink(text);
        if (open && !isTags) return linkSuggestions(app, open.query).map(s => ({ link: s }));
        if (isTags) {
          const q = text.trim().replace(/^#/, '').toLowerCase();
          if (!q) return [];
          return Object.keys(app.metadataCache.getTags()).map(t => t.slice(1))
            .filter(t => t.toLowerCase().includes(q) && !items.includes(t)).sort().slice(0, 20).map(t => ({ value: t }));
        }
        return text.trim() ? valueSuggestions(app, o.name, text, items) : [];
      },
      renderSuggestion: (item, el) => item.link ? renderLinkSuggestion(item.link, el)
        : el.append(h('div.suggestion-content', h('div.suggestion-title', { text: (isTags ? '#' : '') + item.value }))),
      onSelect: item => {
        const text = input.textContent;
        if (item.link) { const open = openLink(text); input.textContent = text.slice(0, open.start) + linkTextFor(app, item.link, o.sourcePath); }
        else input.textContent = item.value;
        addFromInput();
      }
    });
    input.addEventListener('keydown', e => {
      if (e.isComposing) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!addFromInput()) o.onKey && o.onKey('enter', e);
      } else if (isTags && (e.key === ' ' || e.key === ',')) {
        e.preventDefault();
        addFromInput();
      } else if (e.key === 'Backspace' && !input.textContent && items.length) {
        e.preventDefault();
        focusPill(items.length - 1);
      } else if (e.key === 'ArrowLeft' && !input.textContent && items.length) {
        e.preventDefault();
        focusPill(items.length - 1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        input.replaceChildren();
        o.onKey && o.onKey('escape', e);
      } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !suggest.isOpen) {
        o.onKey && o.onKey(e.key === 'ArrowUp' ? 'up' : 'down', e);
      }
    });
    input.addEventListener('blur', () => { if (input.textContent.trim()) addFromInput(); });
    box.addEventListener('click', e => { if (e.target === box) placeCaretAtEnd(input); });
  }
  render();
  return {
    el: box,
    focus() { if (o.editable) placeCaretAtEnd(input); },
    destroy() { if (suggest) suggest.destroy(); }
  };
}

/* Show a value read-only the way the Properties block would, for places
   that only display (Bases cards, previews). */
export function renderValue(app, type, value, sourcePath) {
  if (value === null || value === undefined || value === '') return h('span.metadata-empty', { text: '' });
  if (type === 'checkbox') return h('input.metadata-input-checkbox', { type: 'checkbox', checked: value === true, disabled: true });
  if (Array.isArray(value) || type === 'multitext' || type === 'tags' || type === 'aliases') {
    const list = Array.isArray(value) ? value : listValue(value, type === 'tags');
    return h('div.multi-select-container.mod-readonly', list.map(v => h('div.multi-select-pill', h('div.multi-select-pill-content',
      type === 'tags' ? h('span', { text: String(v).replace(/^#/, '') }) : (n => n.nodeType === 1 ? n : h('span', { text: String(v) }))(renderLinkish(app, v, sourcePath))))));
  }
  return h('span', renderLinkish(app, typeof value === 'object' ? JSON.stringify(value) : value, sourcePath));
}
