/* Pieces the sidebar panes share: Obsidian's nav header and tree items,
   the search box, sort orders, excluded-file filters, and following the
   active note. Markup and class names are Obsidian's so themes style the
   panes as they do there. */

import { h, icon, clickableIcon, addIcon, Notice, Menu } from '../core/ui.js';

/* Obsidian's own icons that Lucide doesn't have. */
addIcon('right-triangle', [['path', { d: 'M3 8L12 17L21 8' }]]);
addIcon('links-coming-in', [['path', { d: 'M14 17h3a5 5 0 0 0 0-10h-3' }], ['path', { d: 'M2 12h12' }], ['path', { d: 'M10 8l4 4-4 4' }]]);
addIcon('links-going-out', [['path', { d: 'M10 7H7a5 5 0 0 0 0 10h3' }], ['path', { d: 'M9 12h13' }], ['path', { d: 'M18 8l4 4-4 4' }]]);

/* Drag type for files and folders dragged out of the file explorer (a JSON
   list of vault paths); FILE_MIME carries a single file for the editor. */
export const PATHS_MIME = 'application/x-vault-paths';

export const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/* Sort orders as Obsidian names them in workspace.json. */
export const FILE_SORTS = [
  ['alphabetical', 'File name (A to Z)'],
  ['alphabeticalReverse', 'File name (Z to A)'],
  ['byModifiedTime', 'Modified time (new to old)'],
  ['byModifiedTimeReverse', 'Modified time (old to new)'],
  ['byCreatedTime', 'Created time (new to old)'],
  ['byCreatedTimeReverse', 'Created time (old to new)']
];

export function displayName(file) {
  return file.isFolder ? (file.name || '/') : file.extension === 'md' ? file.basename : file.name;
}

/* Compare two files for a sort order. Folders use names in every order,
   as in Obsidian, and only flip for Z to A. */
export function fileComparator(order) {
  const name = (a, b) => collator.compare(a.isFolder ? a.name : a.basename, b.isFolder ? b.name : b.basename) || collator.compare(a.name, b.name);
  return (a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    if (a.isFolder) return order === 'alphabeticalReverse' ? -name(a, b) : name(a, b);
    switch (order) {
      case 'alphabeticalReverse': return -name(a, b);
      case 'byModifiedTime': return (b.stat.mtime - a.stat.mtime) || name(a, b);
      case 'byModifiedTimeReverse': return (a.stat.mtime - b.stat.mtime) || name(a, b);
      case 'byCreatedTime': return (b.stat.ctime - a.stat.ctime) || name(a, b);
      case 'byCreatedTimeReverse': return (a.stat.ctime - b.stat.ctime) || name(a, b);
      default: return name(a, b);
    }
  };
}

export function sortMenu(e, sorts, current, onPick) {
  const menu = new Menu();
  sorts.forEach(([id, label], i) => {
    menu.addItem(item => item.setTitle(label).setSection('s' + Math.floor(i / 2)).setChecked(id === current).onClick(() => onPick(id)));
  });
  const r = e.currentTarget && e.currentTarget.getBoundingClientRect ? e.currentTarget.getBoundingClientRect() : null;
  if (r) menu.showAtPosition({ x: r.left, y: r.bottom + 4 }); else menu.showAtMouseEvent(e);
  return menu;
}

/* "Excluded files" (userIgnoreFilters): path prefixes, or /regex/. */
let filterKey = null, filterList = [];
export function isExcluded(app, path) {
  const filters = app.config.get('userIgnoreFilters') || [];
  const key = JSON.stringify(filters);
  if (key !== filterKey) {
    filterKey = key;
    filterList = filters.filter(Boolean).map(f => {
      if (f.length > 2 && f.startsWith('/') && f.endsWith('/')) {
        try { const re = new RegExp(f.slice(1, -1)); return p => re.test(p); } catch (e) { return () => false; }
      }
      const bare = f.replace(/\/$/, '');
      return p => p === bare || p.startsWith(bare + (f.endsWith('/') ? '/' : '')) ;
    });
  }
  for (const test of filterList) if (test(path)) return true;
  return false;
}

/* --- markup ------------------------------------------------------------------------ */

export function navHeader(...buttons) {
  const buttonsEl = h('div.nav-buttons-container', buttons);
  return { headerEl: h('div.nav-header', buttonsEl), buttonsEl };
}

export function navButton(iconName, title, onClick) {
  return clickableIcon(iconName, title, onClick, 'nav-action-button');
}

/* A toggle button in a nav header: .is-active while on. */
export function navToggle(iconName, title, get, set) {
  const el = navButton(iconName, title, () => { set(!get()); el.classList.toggle('is-active', !!get()); });
  el.classList.toggle('is-active', !!get());
  return el;
}

export function setButton(el, iconName, title) {
  el.replaceChildren(icon(iconName));
  el.setAttribute('aria-label', title);
  el.title = title;
}

export function collapseIcon(collapsed) {
  return h('div.tree-item-icon.collapse-icon' + (collapsed ? '.is-collapsed' : ''), icon('right-triangle'));
}

export function setCollapsed(treeItemEl, collapsed) {
  treeItemEl.classList.toggle('is-collapsed', collapsed);
  const self = treeItemEl.firstElementChild;
  const ci = self && self.querySelector(':scope > .collapse-icon');
  if (ci) ci.classList.toggle('is-collapsed', collapsed);
}

/* A section header such as "Linked mentions" with a count. */
export function paneHeader(text, collapsed, onToggle) {
  const countEl = h('span.tree-item-flair');
  const el = h('div.tree-item-self.is-clickable', { 'aria-expanded': String(!collapsed) },
    collapseIcon(collapsed), h('div.tree-item-inner', { text }), h('div.tree-item-flair-outer', countEl));
  el.addEventListener('click', () => onToggle());
  return { el, countEl, setCollapsed(c) { el.querySelector('.collapse-icon').classList.toggle('is-collapsed', c); el.setAttribute('aria-expanded', String(!c)); } };
}

/* Obsidian's search box: an input with a clear button. */
export function searchBox({ placeholder = 'Search...', value = '', onInput, onKeyDown, cls = '' } = {}) {
  const inputEl = h('input', { type: 'search', enterkeyhint: 'search', spellcheck: false, placeholder, value });
  const clearEl = h('div.search-input-clear-button', { 'aria-label': 'Clear search', title: 'Clear search' });
  const containerEl = h('div.search-input-container' + (cls ? '.' + cls : ''), inputEl, clearEl);
  const sync = () => containerEl.classList.toggle('has-value', !!inputEl.value);
  inputEl.addEventListener('input', () => { sync(); onInput && onInput(inputEl.value); });
  if (onKeyDown) inputEl.addEventListener('keydown', onKeyDown);
  clearEl.addEventListener('click', () => { inputEl.value = ''; sync(); onInput && onInput(''); inputEl.focus(); });
  sync();
  return { containerEl, inputEl, clearEl, setValue(v) { inputEl.value = v; sync(); }, getValue: () => inputEl.value };
}

/* Text with ranges wrapped in a highlight span; offsets are relative to
   `base`. */
export function highlightText(text, ranges, cls = 'search-result-file-matched-text', base = 0) {
  const frag = document.createDocumentFragment();
  let at = 0;
  for (const [s0, e0] of ranges || []) {
    const s = Math.max(at, s0 - base), e = Math.min(text.length, e0 - base);
    if (e <= s) continue;
    if (s > at) frag.append(text.slice(at, s));
    frag.append(h('span.' + cls, { text: text.slice(s, e) }));
    at = e;
  }
  frag.append(text.slice(at));
  return frag;
}

/* --- behaviour ----------------------------------------------------------------------- */

export function copyText(text, what = 'Copied to your clipboard') {
  const done = () => new Notice(what);
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(done, () => new Notice('The browser blocked the clipboard.'));
  new Notice('The browser blocked the clipboard.');
}

/* Calls cb(file) when the note in the main area changes: the view
   follows the active note, as Obsidian's side panes do. */
export function followActiveFile(view, cb) {
  const ws = view.app.workspace;
  let last;
  const check = () => {
    const f = ws.getActiveFile();
    if (f === last) return;
    last = f;
    cb(f);
  };
  view.registerEvent(ws.on('file-open', check));
  view.registerEvent(ws.on('active-leaf-change', check));
  view.registerEvent(ws.on('layout-change', check));
  return { check, reset() { last = undefined; check(); } };
}

/* Main leaf showing `file`, preferring the most recent one. */
export function leafForFile(app, file) {
  const ws = app.workspace;
  const cur = ws.getMostRecentLeaf();
  if (cur && cur.view && cur.view.file === file) return cur;
  return ws.mainLeaves().find(l => l.view && l.view.file === file) || null;
}

/* Open a file at a line (or with other ephemeral state), in the leaf a
   click asks for. */
export async function openFileAt(app, file, eState, newLeaf) {
  const ws = app.workspace;
  if (!newLeaf) {
    const leaf = leafForFile(app, file);
    if (leaf) {
      ws.setActiveLeaf(leaf, { focus: true });
      if (eState) leaf.view.setEphemeralState(eState);
      return leaf;
    }
  }
  const leaf = ws.getLeaf(newLeaf);
  await leaf.openFile(file, { active: true, eState });
  return leaf;
}

/* Ask the page-preview plugin for a hover popover. */
export function hoverLink(app, e, source, parent, targetEl, linktext, sourcePath = '') {
  app.workspace.trigger('hover-link', { event: e, source, hoverParent: parent, targetEl, linktext, sourcePath });
}

/* Per-browser memory (expanded folders and the like). Private windows
   can refuse storage, so failures are ignored. */
export function stored(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
}
export function store(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
}
export function vaultKey(app, name) { return 'vault:' + ((app.meta && app.meta.id) || app.vault.getName()) + ':' + name; }

/* Yield to the browser so long jobs stay responsive. */
export function nextFrame() { return new Promise(r => setTimeout(r, 0)); }
