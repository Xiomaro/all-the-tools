/* The Bases toolbar and its menus: the view switcher, results (limit,
   copy, export), sort and group, filters (for all views and for this
   view), properties (columns) and formulas, and view settings. Every
   change goes into the base's config and is saved through
   renderer.save(), which writes the .base file or the ```base block. */

import { h, icon, Menu, Modal, Setting, Notice, promptText, confirmDialog, fuzzyMatch, highlighted, debounce, saveBlob } from '../core/ui.js';
import { parse, evaluate } from './expr.js';
import { VIEW_TYPES, FILE_PROPS, FILE_ICONS, parseProp, sameProp, displayName, normalizeSort, normalizeGroupBy, CellError } from './query.js';
import { toText, typeOf } from './values.js';

/* --- popovers ------------------------------------------------------------------ */

let openPopover = null;

export class Popover {
  constructor(anchorEl, cls, onClose) {
    this.anchorEl = anchorEl;
    this.onClose = onClose;
    this.el = h('div.bases-popover' + (cls ? '.' + cls : ''), { tabindex: '-1' });
  }
  open() {
    if (openPopover) openPopover.close();
    openPopover = this;
    document.body.appendChild(this.el);
    this.position();
    this._outside = e => {
      const t = e.target;
      if (this.el.contains(t) || this.anchorEl.contains(t) || (t.closest && t.closest('.menu, .suggestion-container, .modal-container'))) return;
      this.close();
    };
    this._key = e => { if (e.key === 'Escape' && !document.querySelector('.menu, .modal-container')) { e.preventDefault(); e.stopPropagation(); this.close(); this.anchorEl.focus(); } };
    setTimeout(() => {
      document.addEventListener('mousedown', this._outside, true);
      document.addEventListener('keydown', this._key, true);
    });
    this.anchorEl.classList.add('has-active-menu');
    return this;
  }
  position() {
    const r = this.anchorEl.getBoundingClientRect();
    const w = this.el.offsetWidth, hgt = this.el.offsetHeight;
    let x = r.left;
    if (x + w > window.innerWidth - 8) x = Math.max(8, r.right - w);
    let y = r.bottom + 4;
    if (y + hgt > window.innerHeight - 8) y = Math.max(8, window.innerHeight - 8 - hgt);
    this.el.style.left = x + 'px';
    this.el.style.top = y + 'px';
  }
  close() {
    if (openPopover === this) openPopover = null;
    if (!this.el.isConnected) return;
    this.el.remove();
    this.anchorEl.classList.remove('has-active-menu');
    document.removeEventListener('mousedown', this._outside, true);
    document.removeEventListener('keydown', this._key, true);
    if (this.onClose) this.onClose();
  }
}

export function isPopoverOpen() { return !!openPopover; }
export function currentPopover() { return openPopover; }

/* --- properties --------------------------------------------------------------------- */

export function propIcon(app, config, id) {
  const p = parseProp(id);
  if (p.kind === 'file') return FILE_ICONS[p.id] || 'file';
  if (p.kind === 'formula') return 'square-function';
  const t = app.properties ? app.properties.types.getType(p.name) : 'text';
  return (app.properties && app.properties.TYPES[t] ? app.properties.TYPES[t].icon : 'text');
}

/* Every property a view can show: note properties in the vault, file
   properties and the base's formulas. */
export function availableProps(app, config) {
  const out = [];
  const notes = app.properties ? app.properties.allNames().sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)) : [];
  for (const n of notes) out.push({ id: 'note.' + n.name, kind: 'note' });
  for (const id of Object.keys(FILE_PROPS)) out.push({ id, kind: 'file' });
  for (const f of Object.keys(config.formulas || {})) out.push({ id: 'formula.' + f, kind: 'formula' });
  return out.map(p => Object.assign(p, { name: displayName(config, p.id), icon: propIcon(app, config, p.id) }));
}

/* How a property is written in a formula: status, note["due date"],
   file.name, formula.x */
export function propExpr(id) {
  const p = parseProp(id);
  if (p.kind !== 'note') return p.id;
  return /^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(p.name) && !['file', 'note', 'formula', 'this', 'true', 'false', 'null'].includes(p.name)
    ? p.name : 'note[' + JSON.stringify(p.name) + ']';
}

/* A <select> of properties. */
function propSelect(app, config, value, onChange, extra) {
  const sel = h('select.dropdown.bases-prop-select');
  if (extra) for (const [v, label] of extra) sel.append(h('option', { value: v, text: label }));
  const props = availableProps(app, config);
  const groups = { note: 'Note properties', file: 'File properties', formula: 'Formulas' };
  for (const kind of ['note', 'file', 'formula']) {
    const list = props.filter(p => p.kind === kind);
    if (!list.length) continue;
    const g = h('optgroup', { label: groups[kind] });
    list.forEach(p => g.append(h('option', { value: p.id, text: p.name })));
    sel.append(g);
  }
  if (value && !Array.from(sel.options).some(o => sameProp(o.value, value))) sel.append(h('option', { value, text: displayName(config, value) }));
  const match = Array.from(sel.options).find(o => o.value === value) || Array.from(sel.options).find(o => value && sameProp(o.value, value));
  sel.value = match ? match.value : (extra ? extra[0][0] : '');
  sel.addEventListener('change', () => onChange(sel.value));
  return sel;
}

/* --- the view menu ---------------------------------------------------------------------- */

export function showViewsMenu(r, anchor) {
  const menu = new Menu();
  const views = r.config.views;
  views.forEach((v, i) => menu.addItem(it => it.setSection('views').setTitle(v.name).setIcon((VIEW_TYPES[v.type] || VIEW_TYPES.table).icon)
    .setChecked(i === r.viewIndex).onClick(() => r.setView(i))));
  if (r.editable) {
    for (const t of Object.keys(VIEW_TYPES)) {
      menu.addItem(it => it.setSection('add').setTitle('Add ' + VIEW_TYPES[t].name.toLowerCase() + ' view').setIcon('plus').onClick(() => {
        const cur = r.view;
        const view = { type: t, name: uniqueViewName(views, VIEW_TYPES[t].name) };
        if (cur.order) view.order = cur.order.slice();
        views.push(view);
        r.save();
        r.setView(views.length - 1);
      }));
    }
    menu.addItem(it => it.setSection('view').setTitle('View settings').setIcon('settings-2').onClick(() => new ViewSettingsModal(r).open()));
    menu.addItem(it => it.setSection('view').setTitle('Rename view').setIcon('pencil').onClick(async () => {
      const name = await promptText(r.app, 'Rename view', r.view.name, { cta: 'Rename' });
      if (name && name.trim()) { r.view.name = name.trim(); r.save(); r.render(); }
    }));
    menu.addItem(it => it.setSection('view').setTitle('Duplicate view').setIcon('copy').onClick(() => {
      const copy = JSON.parse(JSON.stringify(r.view));
      copy.name = uniqueViewName(views, r.view.name);
      views.splice(r.viewIndex + 1, 0, copy);
      r.save();
      r.setView(r.viewIndex + 1);
    }));
    menu.addItem(it => it.setSection('danger').setTitle('Delete view').setIcon('trash-2').setWarning(true).setDisabled(views.length < 2).onClick(async () => {
      if (!(await confirmDialog(r.app, 'Delete view', 'Delete the view “' + r.view.name + '”?', 'Delete', true))) return;
      views.splice(r.viewIndex, 1);
      r.save();
      r.setView(Math.max(0, r.viewIndex - 1));
    }));
  }
  const b = anchor.getBoundingClientRect();
  menu.showAtPosition({ x: b.left, y: b.bottom + 4 });
}

function uniqueViewName(views, base) {
  let name = base, n = 2;
  while (views.some(v => v.name === name)) name = base + ' ' + n++;
  return name;
}

class ViewSettingsModal extends Modal {
  constructor(r) { super(r.app); this.r = r; }
  onOpen() {
    const r = this.r, v = r.view;
    this.setTitle('View settings');
    const el = this.contentEl;
    el.classList.add('bases-view-settings');
    const changed = () => { r.save(); r.render(); };
    new Setting(el).setName('Name').addText(t => t.setValue(v.name).onChange(x => { if (x.trim()) { v.name = x.trim(); changed(); } }));
    new Setting(el).setName('Layout').addDropdown(d => {
      Object.keys(VIEW_TYPES).forEach(k => d.addOption(k, VIEW_TYPES[k].name));
      d.setValue(v.type).onChange(x => { v.type = x; changed(); this.close(); new ViewSettingsModal(r).open(); });
    });
    new Setting(el).setName('Limit').setDesc('Show at most this many results. Empty for no limit.')
      .addText(t => { t.inputEl.type = 'number'; t.inputEl.min = '1'; t.setValue(v.limit || '').onChange(x => { const n = parseInt(x, 10); if (n > 0) v.limit = n; else delete v.limit; changed(); }); });
    if (v.type === 'cards') {
      new Setting(el).setName('Image property').setDesc('A property holding an image (a link, a path or a URL) or a colour, shown as each card’s cover.')
        .then(s => s.controlEl.append(propSelect(r.app, r.config, v.image || '', x => { if (x) v.image = x; else delete v.image; changed(); }, [['', 'None']])));
      new Setting(el).setName('Image fit').addDropdown(d => d.addOption('cover', 'Cover').addOption('contain', 'Contain')
        .setValue(v.imageFit || 'cover').onChange(x => { v.imageFit = x; changed(); }));
      new Setting(el).setName('Image aspect ratio').setDesc('Height as a share of the width.')
        .addSlider(s => s.setLimits(0.25, 2.5, 0.05).setValue(v.imageAspectRatio || 0.5).setDynamicTooltip().onChange(x => { v.imageAspectRatio = x; changed(); }));
      new Setting(el).setName('Card size')
        .addSlider(s => s.setLimits(100, 800, 10).setValue(v.cardSize || 250).setDynamicTooltip().onChange(x => { v.cardSize = x; changed(); }));
    }
    if (v.type === 'table') {
      new Setting(el).setName('Row height').addDropdown(d => d.addOptions({ short: 'Short', medium: 'Medium', tall: 'Tall', 'extra-tall': 'Extra tall' })
        .setValue(v.rowHeight || 'short').onChange(x => { if (x === 'short') delete v.rowHeight; else v.rowHeight = x; changed(); }));
    }
  }
}

/* --- results ---------------------------------------------------------------------------- */

export function showResultsMenu(r, anchor) {
  const pop = new Popover(anchor, 'bases-results-menu', () => r.popoverClosed());
  const v = r.view;
  const limit = h('input', { type: 'number', min: '1', placeholder: 'No limit', value: v.limit || '' });
  limit.addEventListener('change', () => { const n = parseInt(limit.value, 10); if (n > 0) v.limit = n; else delete v.limit; r.save(); r.render(); });
  pop.el.append(
    h('div.bases-popover-row', h('label', { text: 'Limit results' }), limit),
    h('div.menu-separator'),
    item('copy', 'Copy to clipboard', () => { navigator.clipboard.writeText(toMarkdownTable(r)).then(() => new Notice('Copied ' + r.result.rows.length + ' results as a Markdown table.'), () => new Notice('The browser didn’t allow copying.')); pop.close(); }),
    item('download', 'Export CSV', () => { saveBlob((r.title || 'base') + ' - ' + v.name + '.csv', new Blob([toCsv(r)], { type: 'text/csv' })); pop.close(); }));
  pop.open();
}

function item(ic, title, fn) {
  return h('div.menu-item.tappable', { onclick: fn, tabindex: '0', onkeydown: e => { if (e.key === 'Enter') fn(); } },
    h('div.menu-item-icon', icon(ic)), h('div.menu-item-title', { text: title }));
}

function tableData(r) {
  const cols = r.result.columns;
  const head = cols.map(c => displayName(r.config, c));
  const rows = r.result.rows.map(row => cols.map(c => { const v = row.safeGet(c); return v instanceof CellError ? '' : toText(v); }));
  return { head, rows };
}
function toMarkdownTable(r) {
  const { head, rows } = tableData(r);
  const esc = s => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  return '| ' + head.map(esc).join(' | ') + ' |\n|' + head.map(() => ' --- ').join('|') + '|\n' + rows.map(x => '| ' + x.map(esc).join(' | ') + ' |').join('\n') + '\n';
}
function toCsv(r) {
  const { head, rows } = tableData(r);
  const q = s => /[",\n]/.test(s) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s);
  return [head].concat(rows).map(x => x.map(q).join(',')).join('\r\n') + '\r\n';
}

/* --- sort and group ------------------------------------------------------------------------- */

export function showSortMenu(r, anchor) {
  const pop = new Popover(anchor, 'bases-sort-menu', () => r.popoverClosed());
  const draw = () => {
    const v = r.view;
    const sorts = normalizeSort(v.sort);
    const set = list => { if (list.length) v.sort = list; else delete v.sort; r.save(); r.render(); draw(); pop.position(); };
    const rows = sorts.map((s, i) => h('div.bases-sort-row',
      h('span.bases-sort-handle', icon('grip-vertical')),
      propSelect(r.app, r.config, s.property, x => { sorts[i].property = x; set(sorts); }),
      dirSelect(s.direction, x => { sorts[i].direction = x; set(sorts); }),
      h('div.clickable-icon', { 'aria-label': 'Remove sort', onclick: () => { sorts.splice(i, 1); set(sorts); } }, icon('x'))));
    const gb = normalizeGroupBy(v.groupBy);
    const group = h('div.bases-sort-row.mod-group',
      propSelect(r.app, r.config, gb ? gb.property : '', x => { if (x) v.groupBy = { property: x, direction: gb ? gb.direction : 'ASC' }; else delete v.groupBy; r.save(); r.render(); draw(); }, [['', 'None']]),
      gb ? dirSelect(gb.direction, x => { v.groupBy = { property: gb.property, direction: x }; r.save(); r.render(); }) : null);
    pop.el.replaceChildren(
      h('div.bases-popover-heading', { text: 'Sort' }),
      sorts.length ? h('div.bases-sort-list', rows) : h('div.bases-popover-empty', { text: 'No sorting: results are in file order.' }),
      h('div.bases-popover-actions', h('button.mod-muted', { onclick: () => { sorts.push({ property: 'file.name', direction: 'ASC' }); set(sorts); } }, icon('plus'), 'Add sort')),
      h('div.menu-separator'),
      h('div.bases-popover-heading', { text: 'Group by' }),
      group);
  };
  draw();
  pop.open();
}

function dirSelect(value, onChange) {
  const sel = h('select.dropdown', h('option', { value: 'ASC', text: 'Ascending' }), h('option', { value: 'DESC', text: 'Descending' }));
  sel.value = value === 'DESC' ? 'DESC' : 'ASC';
  sel.addEventListener('change', () => onChange(sel.value));
  return sel;
}

/* --- filters ------------------------------------------------------------------------------------ */

const CONJ = { and: 'All the following are true', or: 'Any of the following are true', not: 'None of the following are true' };

/* Operators the filter rows offer, by the kind of property. `op` is the
   formula operator or function; `neg` puts "!" in front. */
const OPS = {
  is: { label: 'is', op: '==' }, isNot: { label: 'is not', op: '!=' },
  contains: { label: 'contains', fn: 'contains' }, notContains: { label: 'does not contain', fn: 'contains', neg: true },
  startsWith: { label: 'starts with', fn: 'startsWith' }, endsWith: { label: 'ends with', fn: 'endsWith' },
  empty: { label: 'is empty', fn: 'isEmpty', noValue: true }, notEmpty: { label: 'is not empty', fn: 'isEmpty', neg: true, noValue: true },
  eq: { label: '=', op: '==' }, ne: { label: '≠', op: '!=' }, lt: { label: '<', op: '<' }, le: { label: '≤', op: '<=' }, gt: { label: '>', op: '>' }, ge: { label: '≥', op: '>=' },
  on: { label: 'on', op: '==' }, notOn: { label: 'not on', op: '!=' }, before: { label: 'before', op: '<' }, onBefore: { label: 'on or before', op: '<=' },
  after: { label: 'after', op: '>' }, onAfter: { label: 'on or after', op: '>=' },
  hasTag: { label: 'has tag', file: 'hasTag' }, notHasTag: { label: 'does not have tag', file: 'hasTag', neg: true },
  inFolder: { label: 'is in folder', file: 'inFolder' }, notInFolder: { label: 'is not in folder', file: 'inFolder', neg: true },
  linksTo: { label: 'links to', file: 'hasLink' }, notLinksTo: { label: 'does not link to', file: 'hasLink', neg: true },
  hasProp: { label: 'has property', file: 'hasProperty' }, notHasProp: { label: 'does not have property', file: 'hasProperty', neg: true }
};

function opsFor(app, id) {
  const p = parseProp(id);
  if (p.id === 'file.tags') return ['hasTag', 'notHasTag'];
  if (p.id === 'file.folder' || p.id === 'file.path') return ['inFolder', 'notInFolder', 'is', 'isNot', 'contains', 'notContains', 'startsWith', 'endsWith'];
  if (p.id === 'file.links') return ['linksTo', 'notLinksTo'];
  if (p.id === 'file.properties') return ['hasProp', 'notHasProp'];
  let type = 'text';
  if (p.id === 'file.ctime' || p.id === 'file.mtime') type = 'date';
  else if (p.id === 'file.size') type = 'number';
  else if (p.kind === 'note' && app.properties) type = app.properties.types.getType(p.name);
  if (type === 'number') return ['eq', 'ne', 'lt', 'le', 'gt', 'ge', 'empty', 'notEmpty'];
  if (type === 'date' || type === 'datetime') return ['on', 'notOn', 'before', 'onBefore', 'after', 'onAfter', 'empty', 'notEmpty'];
  if (type === 'checkbox') return ['is', 'isNot'];
  if (type === 'multitext' || type === 'tags' || type === 'aliases') return ['contains', 'notContains', 'empty', 'notEmpty'];
  return ['is', 'isNot', 'contains', 'notContains', 'startsWith', 'endsWith', 'empty', 'notEmpty'];
}

function valueKind(app, id) {
  const p = parseProp(id);
  if (p.id === 'file.ctime' || p.id === 'file.mtime') return 'date';
  if (p.id === 'file.size') return 'number';
  if (p.kind === 'note' && app.properties) {
    const t = app.properties.types.getType(p.name);
    if (t === 'number' || t === 'checkbox' || t === 'date' || t === 'datetime') return t;
  }
  return 'text';
}

function literal(value, kind) {
  if (kind === 'number' && value !== '' && !isNaN(Number(value))) return String(Number(value));
  if (kind === 'checkbox') return value === 'false' ? 'false' : 'true';
  return JSON.stringify(String(value ?? ''));
}

export function buildFilter(id, opKey, value, kind) {
  const o = OPS[opKey];
  const neg = o.neg ? '!' : '';
  if (o.file) return neg + 'file.' + o.file + '(' + JSON.stringify(String(value ?? '')) + ')';
  const prop = propExpr(id);
  if (o.fn) return neg + prop + '.' + o.fn + '(' + (o.noValue ? '' : literal(value, kind)) + ')';
  return prop + ' ' + o.op + ' ' + literal(value, kind);
}

const PROP_RE = String.raw`(note\[(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\]|[\p{L}_$][\p{L}\p{N}_$]*(?:\.[\p{L}_$][\p{L}\p{N}_$]*)?)`;
const LIT_RE = String.raw`("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|-?\d+(?:\.\d+)?|true|false)`;

function unLit(s) {
  if (s === undefined) return '';
  if (/^["']/.test(s)) { try { return s[0] === '"' ? JSON.parse(s) : s.slice(1, -1).replace(/\\(.)/g, '$1'); } catch (e) { return s.slice(1, -1); } }
  return s;
}
function unProp(s) {
  const m = /^note\[(.*)\]$/.exec(s);
  if (m) return 'note.' + unLit(m[1]);
  return parseProp(s).id;
}

/* Read a filter string back into { id, op, value } when it's one the rows
   can show; null for anything else (shown as a formula). */
export function parseFilterRow(app, src) {
  const s = String(src).trim();
  let m = new RegExp('^(!)?\\s*file\\.(hasTag|inFolder|hasLink|hasProperty)\\(' + LIT_RE + '\\)$', 'u').exec(s);
  if (m) {
    const byFn = { hasTag: ['file.tags', 'hasTag', 'notHasTag'], inFolder: ['file.folder', 'inFolder', 'notInFolder'], hasLink: ['file.links', 'linksTo', 'notLinksTo'], hasProperty: ['file.properties', 'hasProp', 'notHasProp'] }[m[2]];
    return { id: byFn[0], op: m[1] ? byFn[2] : byFn[1], value: unLit(m[3]) };
  }
  m = new RegExp('^(!)?\\s*' + PROP_RE + '\\.(contains|startsWith|endsWith|isEmpty)\\((' + LIT_RE + ')?\\)$', 'u').exec(s);
  if (m) {
    const id = unProp(m[2]);
    const fn = m[3];
    const key = fn === 'isEmpty' ? (m[1] ? 'notEmpty' : 'empty') : fn === 'contains' ? (m[1] ? 'notContains' : 'contains') : m[1] ? null : fn;
    if (!key || !opsFor(app, id).includes(key)) return null;
    return { id, op: key, value: unLit(m[5]) };
  }
  m = new RegExp('^' + PROP_RE + '\\s*(==|!=|<=|>=|<|>)\\s*' + LIT_RE + '$', 'u').exec(s);
  if (m) {
    const id = unProp(m[1]);
    const ops = opsFor(app, id);
    const key = ops.find(k => OPS[k].op === m[2]);
    if (!key) return null;
    return { id, op: key, value: unLit(m[3]) };
  }
  return null;
}

/* Filters as a group we can edit: { and|or|not: [...] }. */
export function asGroup(f) {
  if (f === null || f === undefined || f === '') return { and: [] };
  if (typeof f === 'string') return { and: [f] };
  if (Array.isArray(f)) return { and: f };
  if (typeof f === 'object' && (Array.isArray(f.and) || Array.isArray(f.or) || Array.isArray(f.not))) return f;
  return { and: [f] };
}

function conjOf(g) { return Array.isArray(g.or) ? 'or' : Array.isArray(g.not) ? 'not' : 'and'; }

export function showFilterMenu(r, anchor) {
  const pop = new Popover(anchor, 'bases-filter-menu', () => r.popoverClosed());
  let tab = r.view.filters ? 'view' : 'all';
  const save = debounce(() => { r.save(); r.render(); }, 400);
  const draw = () => {
    const target = tab === 'all' ? r.config : r.view;
    const group = asGroup(target.filters);
    const commit = () => {
      const c = conjOf(group);
      if (!group[c].length) delete target.filters; else target.filters = group;
      save();
    };
    const tabs = h('div.bases-filter-tabs',
      h('div.bases-filter-tab' + (tab === 'all' ? '.is-active' : ''), { text: 'All views', onclick: () => { tab = 'all'; draw(); } }),
      h('div.bases-filter-tab' + (tab === 'view' ? '.is-active' : ''), { text: 'This view', onclick: () => { tab = 'view'; draw(); } }));
    pop.el.replaceChildren(tabs, groupEditor(r, group, commit, () => { draw(); pop.position(); }, 0));
    pop.position();
  };
  draw();
  pop.open();
}

function groupEditor(r, group, commit, redraw, depth) {
  const app = r.app;
  const conj = conjOf(group);
  const items = group[conj];
  const conjSel = h('select.dropdown.bases-filter-conjunction', Object.keys(CONJ).map(k => h('option', { value: k, text: CONJ[k] })));
  conjSel.value = conj;
  conjSel.addEventListener('change', () => {
    const list = group[conj];
    delete group[conj];
    group[conjSel.value] = list;
    commit(); redraw();
  });
  const box = h('div.bases-filter-group' + (depth ? '.mod-nested' : ''), h('div.bases-filter-group-header', conjSel));
  items.forEach((item, i) => {
    const remove = h('div.clickable-icon', { 'aria-label': 'Remove filter', onclick: () => { items.splice(i, 1); commit(); redraw(); } }, icon('trash-2'));
    if (item && typeof item === 'object') {
      const sub = asGroup(item);
      if (sub !== item) items[i] = sub;
      box.append(h('div.bases-filter-row.mod-group', groupEditor(r, sub, commit, redraw, depth + 1), remove));
      return;
    }
    const parsed = parseFilterRow(app, item);
    if (parsed) box.append(h('div.bases-filter-row', ...structuredRow(r, parsed, src => { items[i] = src; commit(); }, redraw), rowMenu(r, items, i, commit, redraw)));
    else {
      const input = h('input.bases-filter-formula', { type: 'text', value: String(item ?? ''), spellcheck: false, placeholder: 'Formula' });
      const status = h('div.bases-filter-formula-status');
      const check = () => {
        try { parse(input.value); status.replaceChildren(); input.classList.remove('is-invalid'); }
        catch (e) { status.replaceChildren(icon('alert-triangle')); status.title = e.message; input.classList.add('is-invalid'); }
      };
      input.addEventListener('input', () => { items[i] = input.value; check(); commit(); });
      check();
      box.append(h('div.bases-filter-row.mod-formula', input, status, remove));
    }
  });
  if (!items.length) box.append(h('div.bases-popover-empty', { text: 'No filters.' }));
  box.append(h('div.bases-popover-actions',
    h('button.mod-muted', { onclick: () => { items.push(buildFilter('file.name', 'contains', '', 'text')); commit(); redraw(); } }, icon('plus'), 'Add filter'),
    depth < 3 ? h('button.mod-muted', { onclick: () => { items.push({ and: [] }); commit(); redraw(); } }, icon('plus'), 'Add filter group') : null));
  return box;
}

function rowMenu(r, items, i, commit, redraw) {
  return h('div.clickable-icon', { 'aria-label': 'More options', onclick: e => {
    const menu = new Menu();
    menu.addItem(it => it.setTitle('Edit as formula').setIcon('square-function').onClick(() => {
      /* Brackets change nothing but make the row show as a formula box. */
      items[i] = '(' + String(items[i]) + ')';
      commit(); redraw();
    }));
    menu.addItem(it => it.setTitle('Remove filter').setIcon('trash-2').setWarning(true).onClick(() => { items.splice(i, 1); commit(); redraw(); }));
    menu.showAtMouseEvent(e);
  } }, icon('more-horizontal'));
}

function structuredRow(r, parsed, set, redraw) {
  const app = r.app;
  let { id, op, value } = parsed;
  const kind = () => valueKind(app, id);
  const emit = () => set(buildFilter(id, op, value, kind()));
  const propSel = propSelect(app, r.config, id, x => {
    id = x;
    const ops = opsFor(app, id);
    if (!ops.includes(op)) op = ops[0];
    emit(); redraw();
  });
  const opSel = h('select.dropdown.bases-filter-operator', opsFor(app, id).map(k => h('option', { value: k, text: OPS[k].label })));
  opSel.value = op;
  opSel.addEventListener('change', () => { op = opSel.value; emit(); redraw(); });
  let valueEl = null;
  if (!OPS[op].noValue) {
    const k = OPS[op].file ? 'text' : kind();
    if (k === 'checkbox') {
      valueEl = h('select.dropdown', h('option', { value: 'true', text: 'true' }), h('option', { value: 'false', text: 'false' }));
      valueEl.value = value === 'false' || value === false ? 'false' : 'true';
      valueEl.addEventListener('change', () => { value = valueEl.value; emit(); });
    } else {
      valueEl = h('input.bases-filter-value', { type: k === 'date' ? 'date' : k === 'datetime' ? 'datetime-local' : k === 'number' ? 'number' : 'text', value: value ?? '', spellcheck: false, placeholder: 'Value' });
      valueEl.addEventListener('input', () => { value = valueEl.value; emit(); });
    }
  }
  return [propSel, opSel, valueEl || h('span.bases-filter-value-spacer')];
}

/* --- properties (columns) ------------------------------------------------------------------------- */

export function showPropertiesMenu(r, anchor) {
  const pop = new Popover(anchor, 'bases-properties-menu', () => r.popoverClosed());
  const search = h('input.bases-properties-search', { type: 'search', placeholder: 'Search properties…', spellcheck: false });
  const list = h('div.bases-properties-list');
  const draw = () => {
    const v = r.view;
    const order = Array.isArray(v.order) && v.order.length ? v.order.slice() : ['file.name'];
    const q = search.value.trim();
    const all = availableProps(r.app, r.config);
    const shown = order.map(id => all.find(p => sameProp(p.id, id)) || { id, name: displayName(r.config, id), icon: propIcon(r.app, r.config, id), kind: parseProp(id).kind });
    const hidden = all.filter(p => !order.some(o => sameProp(o, p.id)));
    const rowFor = (p, on) => {
      const m = q ? fuzzyMatch(q, p.name) : null;
      if (q && !m) return null;
      const box = h('input', { type: 'checkbox', checked: on, tabindex: '-1' });
      const el = h('div.bases-properties-item' + (on ? '.is-shown' : ''), { tabindex: '0', dataset: { property: p.id }, draggable: on && !q ? 'true' : null },
        on && !q ? h('span.bases-properties-handle', icon('grip-vertical')) : h('span.bases-properties-handle'),
        box, h('span.bases-properties-icon', icon(p.icon)), h('span.bases-properties-name', m ? highlighted(p.name, m.matches) : p.name),
        p.kind === 'formula' ? h('div.clickable-icon', { 'aria-label': 'Edit formula', onclick: e => { e.stopPropagation(); pop.close(); openFormulaModal(r, parseProp(p.id).name); } }, icon('pencil')) : null);
      const toggle = () => {
        const cur = Array.isArray(v.order) && v.order.length ? v.order.slice() : ['file.name'];
        const at = cur.findIndex(o => sameProp(o, p.id));
        if (at > -1) cur.splice(at, 1); else cur.push(p.kind === 'note' ? parseProp(p.id).name : p.id);
        v.order = cur;
        r.save(); r.render(); draw();
      };
      el.addEventListener('click', e => { if (!e.target.closest('.clickable-icon')) toggle(); });
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      if (on && !q) {
        el.addEventListener('dragstart', e => { e.dataTransfer.setData('text/x-bases-property', p.id); e.dataTransfer.effectAllowed = 'move'; el.classList.add('is-being-dragged'); });
        el.addEventListener('dragend', () => el.classList.remove('is-being-dragged'));
        el.addEventListener('dragover', e => { if (e.dataTransfer.types.includes('text/x-bases-property')) { e.preventDefault(); el.classList.add('is-drop-target'); } });
        el.addEventListener('dragleave', () => el.classList.remove('is-drop-target'));
        el.addEventListener('drop', e => {
          e.preventDefault();
          el.classList.remove('is-drop-target');
          const from = e.dataTransfer.getData('text/x-bases-property');
          const cur = Array.isArray(v.order) && v.order.length ? v.order.slice() : ['file.name'];
          const i = cur.findIndex(o => sameProp(o, from)), j = cur.findIndex(o => sameProp(o, p.id));
          if (i < 0 || j < 0 || i === j) return;
          const [moved] = cur.splice(i, 1);
          cur.splice(j, 0, moved);
          v.order = cur;
          r.save(); r.render(); draw();
        });
      }
      return el;
    };
    list.replaceChildren(...shown.map(p => rowFor(p, true)).filter(Boolean),
      shown.length && hidden.length ? h('div.menu-separator') : null,
      ...hidden.map(p => rowFor(p, false)).filter(Boolean));
  };
  search.addEventListener('input', draw);
  draw();
  pop.el.append(search, list, h('div.menu-separator'),
    h('div.bases-popover-actions', h('button.mod-muted', { onclick: () => { pop.close(); openFormulaModal(r, null); } }, icon('plus'), 'Add formula')));
  pop.open();
  setTimeout(() => search.focus());
}

/* --- formulas ------------------------------------------------------------------------------------- */

export function openFormulaModal(r, name) {
  const app = r.app;
  const m = new Modal(app);
  m.setTitle(name ? 'Edit formula' : 'Add formula');
  m.modalEl.classList.add('bases-formula-modal');
  const nameInput = h('input', { type: 'text', value: name || '', placeholder: 'Formula name', spellcheck: false });
  const src = h('textarea.bases-formula-input', { spellcheck: false, rows: 4, placeholder: 'e.g. if(due < today(), "Overdue", "")', value: name ? String((r.config.formulas || {})[name] ?? '') : '' });
  const preview = h('div.bases-formula-preview');
  const first = r.result && r.result.rows[0];
  const update = () => {
    if (!src.value.trim()) { preview.replaceChildren(); return; }
    try {
      const ast = parse(src.value);
      if (first) {
        const val = evaluate(ast, first.ctx.scope(first));
        preview.replaceChildren(h('span.bases-formula-preview-label', { text: (first.file.basename) + ': ' }), h('span', { text: toText(val) || '(empty)' }));
      } else preview.replaceChildren(h('span', { text: 'The formula reads correctly.' }));
      preview.classList.remove('is-error');
    } catch (e) {
      preview.replaceChildren(icon('alert-triangle'), h('span', { text: e.message }));
      preview.classList.add('is-error');
    }
  };
  src.addEventListener('input', debounce(update, 150));
  update();
  const save = () => {
    const n = nameInput.value.trim();
    if (!n) { new Notice('Give the formula a name.'); return; }
    if (!/^[\p{L}_$][\p{L}\p{N}_$ -]*$/u.test(n)) { new Notice('Formula names can use letters, numbers, spaces, “-” and “_”.'); return; }
    const formulas = r.config.formulas || (r.config.formulas = {});
    if (n !== name && Object.prototype.hasOwnProperty.call(formulas, n)) { new Notice('There’s already a formula called “' + n + '”.'); return; }
    if (name && n !== name) {
      renameFormulaEverywhere(r.config, name, n);
      delete formulas[name];
    }
    formulas[n] = src.value.trim();
    if (!name) {
      const v = r.view;
      v.order = (Array.isArray(v.order) && v.order.length ? v.order : ['file.name']).concat(['formula.' + n]);
    }
    m.close();
    r.save(); r.render();
  };
  src.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); } });
  m.contentEl.append(
    h('label.bases-formula-label', { text: 'Name' }), nameInput,
    h('label.bases-formula-label', { text: 'Formula' }), src, preview,
    h('div.modal-button-container',
      name ? h('button.mod-warning', { text: 'Delete', onclick: async () => {
        if (!(await confirmDialog(app, 'Delete formula', 'Delete the formula “' + name + '”?', 'Delete', true))) return;
        delete r.config.formulas[name];
        if (!Object.keys(r.config.formulas).length) delete r.config.formulas;
        for (const v of r.config.views) if (Array.isArray(v.order)) v.order = v.order.filter(o => !sameProp(o, 'formula.' + name));
        m.close(); r.save(); r.render();
      } }) : null,
      h('button.mod-cta', { text: 'Save', onclick: save }),
      h('button', { text: 'Cancel', onclick: () => m.close() })));
  m.open();
  setTimeout(() => (name ? src : nameInput).focus());
}

function renameFormulaEverywhere(config, from, to) {
  const re = new RegExp('formula\\.' + from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}\\p{N}_$])', 'gu');
  const fix = s => typeof s === 'string' ? s.replace(re, 'formula.' + to) : s;
  const fixFilter = f => typeof f === 'string' ? fix(f) : Array.isArray(f) ? f.map(fixFilter) : f && typeof f === 'object' ? Object.fromEntries(Object.entries(f).map(([k, v]) => [k, fixFilter(v)])) : f;
  if (config.filters) config.filters = fixFilter(config.filters);
  for (const k of Object.keys(config.formulas || {})) config.formulas[k] = fix(config.formulas[k]);
  if (config.properties && config.properties['formula.' + from]) { config.properties['formula.' + to] = config.properties['formula.' + from]; delete config.properties['formula.' + from]; }
  for (const v of config.views) {
    if (Array.isArray(v.order)) v.order = v.order.map(o => sameProp(o, 'formula.' + from) ? 'formula.' + to : o);
    if (v.filters) v.filters = fixFilter(v.filters);
    if (v.sort) v.sort = normalizeSort(v.sort).map(s => sameProp(s.property, 'formula.' + from) ? Object.assign(s, { property: 'formula.' + to }) : s);
    if (v.groupBy && sameProp(normalizeGroupBy(v.groupBy).property, 'formula.' + from)) v.groupBy = { property: 'formula.' + to, direction: normalizeGroupBy(v.groupBy).direction };
    if (v.summaries && v.summaries['formula.' + from]) { v.summaries['formula.' + to] = v.summaries['formula.' + from]; delete v.summaries['formula.' + from]; }
    if (v.columnSize && v.columnSize['formula.' + from]) { v.columnSize['formula.' + to] = v.columnSize['formula.' + from]; delete v.columnSize['formula.' + from]; }
  }
}

export { propSelect, typeOf };
