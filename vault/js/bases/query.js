/* Running a base: which files match its filters, their property and
   formula values, sorting, grouping, limits and summaries.

   A .base file (or a ```base block) is YAML:

     filters: <filter>            and/or/not trees of formula strings
     formulas: { name: "formula" }
     properties: { id: { displayName } }
     summaries: { name: "formula over values" }
     views:
       - type: table | cards | list
         name, limit, filters, order: [ids], sort: [{ property, direction }],
         groupBy: { property, direction }, summaries: { id: summary },
         columnSize: { id: px }, image, imageFit, imageAspectRatio, cardSize

   Property ids: "note.status" (or just "status"), "file.name",
   "formula.overdue". */

import { parse, evaluate, BaseError } from './expr.js';
import { BDate, BLink, BFile, toDate, truthy, isEmpty, toText, toNumber, sortCompare, compare, equals, typeOf } from './values.js';
import { parseWikilink } from '../properties/widgets.js';

export const VIEW_TYPES = {
  table: { name: 'Table', icon: 'table' },
  cards: { name: 'Cards', icon: 'layout-grid' },
  list: { name: 'List', icon: 'list' }
};

export const FILE_PROPS = {
  'file.name': 'file name', 'file.basename': 'file base name', 'file.path': 'file path', 'file.folder': 'folder',
  'file.ext': 'file extension', 'file.size': 'file size', 'file.ctime': 'created time', 'file.mtime': 'modified time',
  'file.tags': 'file tags', 'file.links': 'file links', 'file.backlinks': 'backlinks', 'file.embeds': 'embeds',
  'file.properties': 'file properties'
};

export const FILE_ICONS = {
  'file.name': 'file', 'file.basename': 'file', 'file.path': 'folder-tree', 'file.folder': 'folder', 'file.ext': 'file-type',
  'file.size': 'hard-drive', 'file.ctime': 'clock', 'file.mtime': 'clock', 'file.tags': 'tags', 'file.links': 'link',
  'file.backlinks': 'links-coming-in', 'file.embeds': 'image', 'file.properties': 'archive'
};

/* "status" -> { kind: 'note', name: 'status', id: 'note.status' } */
export function parseProp(id) {
  const s = String(id);
  if (s.startsWith('file.')) return { kind: 'file', name: s.slice(5), id: s };
  if (s.startsWith('formula.')) return { kind: 'formula', name: s.slice(8), id: s };
  if (s.startsWith('note.')) return { kind: 'note', name: s.slice(5), id: s };
  return { kind: 'note', name: s, id: 'note.' + s };
}

export function sameProp(a, b) { return parseProp(a).id === parseProp(b).id; }

/* Normalise what was read from YAML, keeping everything else as it was so
   saving writes back what we didn't touch. */
export function normalizeConfig(data) {
  const c = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  if (!c.formulas || typeof c.formulas !== 'object') delete c.formulas;
  if (!c.properties || typeof c.properties !== 'object') delete c.properties;
  if (!c.summaries || typeof c.summaries !== 'object') delete c.summaries;
  if (!Array.isArray(c.views) || !c.views.length) c.views = [{ type: 'table', name: 'Table' }];
  c.views = c.views.map((v, i) => {
    const view = v && typeof v === 'object' ? v : {};
    if (!view.type) view.type = 'table';
    if (!view.name) view.name = VIEW_TYPES[view.type] ? VIEW_TYPES[view.type].name + (i ? ' ' + (i + 1) : '') : 'View ' + (i + 1);
    return view;
  });
  return c;
}

export function displayName(config, id) {
  const p = parseProp(id);
  const props = config.properties || {};
  const own = props[id] || props[p.id] || (p.kind === 'note' ? props[p.name] : null);
  if (own && own.displayName) return String(own.displayName);
  if (p.kind === 'file') return FILE_PROPS[p.id] || p.name;
  return p.name;
}

/* Turn a note property's YAML value into a formula value, by its type. */
export function propValue(app, name, raw, sourcePath) {
  if (raw === null || raw === undefined) return null;
  const type = app.properties ? app.properties.types.getType(name, raw) : null;
  const one = x => {
    if (typeof x === 'string') {
      const wl = parseWikilink(x);
      if (wl) return new BLink(wl.linktext, wl.display, sourcePath);
      if (type === 'date' || type === 'datetime') return toDate(x) || x;
    }
    return x;
  };
  if (Array.isArray(raw)) return raw.map(one);
  if ((type === 'multitext' || type === 'tags' || type === 'aliases') && typeof raw === 'string') {
    return (type === 'tags' ? raw.split(/[,\s]+/) : raw.split(',')).map(s => s.trim()).filter(Boolean).map(one);
  }
  return one(raw);
}

export class Row {
  constructor(ctx, file) {
    this.ctx = ctx;
    this.file = file;
    this.notes = new Map();
    this.formulas = new Map();
    this.busy = new Set();
  }

  get frontmatter() {
    if (this._fm === undefined) {
      const cache = this.file.extension === 'md' ? this.ctx.app.metadataCache.getFileCache(this.file) : null;
      this._fm = (cache && cache.frontmatter) || null;
    }
    return this._fm;
  }

  /* The YAML key a property name means in this note (names ignore case). */
  keyFor(name) {
    const fm = this.frontmatter;
    if (!fm) return null;
    if (Object.prototype.hasOwnProperty.call(fm, name)) return name;
    const lower = name.toLowerCase();
    return Object.keys(fm).find(k => k.toLowerCase() === lower) ?? null;
  }

  raw(name) { const k = this.keyFor(name); return k === null ? null : this.frontmatter[k]; }

  note(name) {
    if (this.notes.has(name)) return this.notes.get(name);
    const v = propValue(this.ctx.app, name, this.raw(name), this.file.path);
    this.notes.set(name, v);
    return v;
  }

  formula(name) {
    if (this.formulas.has(name)) {
      const v = this.formulas.get(name);
      if (v instanceof BaseError) throw v;
      return v;
    }
    const src = this.ctx.formulas[name];
    if (src === undefined) throw new BaseError('There’s no formula called “' + name + '”');
    if (this.busy.has(name)) throw new BaseError('The formula “' + name + '” refers to itself');
    this.busy.add(name);
    try {
      const v = evaluate(parse(src), this.ctx.scope(this));
      this.formulas.set(name, v);
      return v;
    } catch (e) {
      const err = e instanceof BaseError ? e : new BaseError(e.message);
      this.formulas.set(name, err);
      throw err;
    } finally { this.busy.delete(name); }
  }

  /* Any property id's value. Throws a BaseError for a formula that fails. */
  get(id) {
    const p = parseProp(id);
    if (p.kind === 'note') return this.note(p.name);
    if (p.kind === 'formula') return this.formula(p.name);
    return evaluate({ t: 'member', obj: { t: 'id', name: 'file' }, name: p.name }, this.ctx.scope(this));
  }

  /* The value, or a CellError when it can't be worked out. */
  safeGet(id) {
    try { return this.get(id); } catch (e) { return new CellError(e.message || String(e)); }
  }
}

export class CellError { constructor(message) { this.message = message; } toString() { return this.message; } }

export class BaseContext {
  constructor(app, config, opts = {}) {
    this.app = app;
    this.config = config;
    this.formulas = Object.assign({}, config.formulas || {});
    this.sourcePath = opts.sourcePath || '';
    this.thisFile = opts.thisFile || null;
    this.thisRow = this.thisFile ? new Row(this, this.thisFile) : null;
    this._backlinks = null;
    this.errors = [];
  }

  scope(row, locals) {
    return { app: this.app, row, thisRow: this.thisRow, sourcePath: this.sourcePath, locals: locals || {}, backlinks: f => this.backlinks(f) };
  }

  /* Paths of the notes linking to a file (built once per run). */
  backlinks(file) {
    if (!this._backlinks) {
      const map = new Map();
      const rl = this.app.metadataCache.resolvedLinks;
      for (const src of Object.keys(rl)) for (const dest of Object.keys(rl[src])) {
        if (!map.has(dest)) map.set(dest, []);
        map.get(dest).push(src);
      }
      this._backlinks = map;
    }
    return this._backlinks.get(file.path) || [];
  }

  test(filter, row) {
    if (filter === null || filter === undefined) return true;
    if (typeof filter === 'boolean') return filter;
    if (typeof filter === 'string') {
      if (!filter.trim()) return true;
      try { return truthy(evaluate(parse(filter), this.scope(row))); }
      catch (e) { this.noteError(filter, e); return false; }
    }
    if (Array.isArray(filter)) return filter.every(f => this.test(f, row));
    if (typeof filter === 'object') {
      if (Array.isArray(filter.and)) return filter.and.every(f => this.test(f, row));
      if (Array.isArray(filter.or)) return !filter.or.length || filter.or.some(f => this.test(f, row));
      if (Array.isArray(filter.not)) return !filter.not.some(f => this.test(f, row));
      if (filter.and || filter.or || filter.not) return this.test(filter.and || filter.or || [filter.not], row);
    }
    return true;
  }

  noteError(where, e) {
    const msg = (e && e.message) || String(e);
    if (!this.errors.some(x => x.where === where)) this.errors.push({ where, message: msg });
  }
}

/* All the files a base looks through: every file in the vault, apart from
   the config folder and hidden ones. */
function candidateFiles(app) {
  const cfg = app.vault.configDir || '.obsidian';
  return app.vault.getFiles().filter(f => !f.path.startsWith(cfg + '/') && !f.path.split('/').some(s => s.startsWith('.')));
}

/* Run one view. Returns { rows, groups: [{ value, key, rows }] | null,
   total, columns, errors }. */
export function runView(app, config, viewIndex, opts = {}) {
  const view = config.views[viewIndex] || config.views[0];
  const ctx = new BaseContext(app, config, opts);
  const all = candidateFiles(app).map(f => new Row(ctx, f));
  let rows = all.filter(r => ctx.test(config.filters, r) && ctx.test(view.filters, r));
  const sorts = normalizeSort(view.sort);
  const byPath = (a, b) => a.file.path.localeCompare(b.file.path);
  rows.sort((a, b) => {
    for (const s of sorts) {
      const c = sortCompare(sortable(a.safeGet(s.property)), sortable(b.safeGet(s.property)));
      if (c) return s.direction === 'DESC' ? -c : c;
    }
    return byPath(a, b);
  });
  const total = rows.length;
  const limit = Number(view.limit) > 0 ? Number(view.limit) : null;
  let groups = null;
  const gb = normalizeGroupBy(view.groupBy);
  if (gb) {
    const map = new Map();
    for (const r of rows) {
      const v = r.safeGet(gb.property);
      const bad = v instanceof CellError;
      const key = bad ? '' : groupKey(v);
      if (!map.has(key)) map.set(key, { key, value: bad ? null : v, rows: [] });
      map.get(key).rows.push(r);
    }
    groups = Array.from(map.values());
    groups.sort((a, b) => {
      const c = sortCompare(sortable(a.value), sortable(b.value));
      return gb.direction === 'DESC' ? -c : c;
    });
    if (limit) {
      let left = limit;
      groups = groups.map(g => { const take = g.rows.slice(0, Math.max(0, left)); left -= take.length; return Object.assign({}, g, { rows: take }); }).filter(g => g.rows.length);
    }
    rows = groups.flatMap(g => g.rows);
  } else if (limit) rows = rows.slice(0, limit);
  const columns = Array.isArray(view.order) && view.order.length ? view.order.map(String) : ['file.name'];
  return { view, ctx, rows, groups, total, columns, errors: ctx.errors };
}

function sortable(v) { return v instanceof CellError ? null : v; }

function groupKey(v) {
  if (isEmpty(v)) return '';
  if (v instanceof BDate) return v.hasTime ? String(v.ms) : window.moment(v.ms).format('YYYY-MM-DD');
  if (v instanceof BLink) return 'link:' + v.path.toLowerCase();
  return typeOf(v) + ':' + toText(v).toLowerCase();
}

export function normalizeSort(sort) {
  if (!sort) return [];
  const list = Array.isArray(sort) ? sort : [sort];
  return list.map(s => typeof s === 'string' ? { property: s, direction: 'ASC' } : s)
    .filter(s => s && s.property).map(s => ({ property: String(s.property), direction: String(s.direction || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC' }));
}

export function normalizeGroupBy(g) {
  if (!g) return null;
  if (typeof g === 'string') return { property: g, direction: 'ASC' };
  if (!g.property) return null;
  return { property: String(g.property), direction: String(g.direction || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC' };
}

/* --- summaries ------------------------------------------------------------------ */

const numbers = vs => vs.map(v => typeof v === 'boolean' ? null : toNumber(v)).filter(n => n !== null && !isNaN(n));
const dates = vs => vs.map(v => (v instanceof BDate ? v : null)).filter(Boolean);

/* Obsidian's built-in summaries, by the name stored in the view. */
export const SUMMARIES = {
  Average: { name: 'Average', fn: vs => { const n = numbers(vs); return n.length ? round(n.reduce((a, b) => a + b, 0) / n.length) : null; } },
  Median: { name: 'Median', fn: vs => { const n = numbers(vs).sort((a, b) => a - b); if (!n.length) return null; const m = n.length >> 1; return n.length % 2 ? n[m] : round((n[m - 1] + n[m]) / 2); } },
  Min: { name: 'Min', fn: vs => { const n = numbers(vs); return n.length ? Math.min(...n) : null; } },
  Max: { name: 'Max', fn: vs => { const n = numbers(vs); return n.length ? Math.max(...n) : null; } },
  Sum: { name: 'Sum', fn: vs => round(numbers(vs).reduce((a, b) => a + b, 0)) },
  Range: { name: 'Range', fn: vs => {
    const d = dates(vs);
    if (d.length && d.length === vs.filter(v => !isEmpty(v)).length) {
      const ms = Math.max(...d.map(x => x.ms)) - Math.min(...d.map(x => x.ms));
      return window.moment.duration(ms).humanize();
    }
    const n = numbers(vs); return n.length ? round(Math.max(...n) - Math.min(...n)) : null;
  } },
  Stddev: { name: 'Std dev', fn: vs => { const n = numbers(vs); if (!n.length) return null; const m = n.reduce((a, b) => a + b, 0) / n.length; return round(Math.sqrt(n.reduce((a, b) => a + (b - m) ** 2, 0) / n.length)); } },
  Earliest: { name: 'Earliest', fn: vs => { const d = dates(vs); return d.length ? d.reduce((a, b) => (b.ms < a.ms ? b : a)) : null; } },
  Latest: { name: 'Latest', fn: vs => { const d = dates(vs); return d.length ? d.reduce((a, b) => (b.ms > a.ms ? b : a)) : null; } },
  Checked: { name: 'Checked', fn: vs => vs.filter(v => v === true).length },
  Unchecked: { name: 'Unchecked', fn: vs => vs.filter(v => v === false).length },
  Empty: { name: 'Empty', fn: vs => vs.filter(v => isEmpty(v)).length },
  Filled: { name: 'Filled', fn: vs => vs.filter(v => !isEmpty(v)).length },
  Unique: { name: 'Unique', fn: vs => new Set(vs.filter(v => !isEmpty(v)).map(v => toText(v).toLowerCase())).size }
};

function round(n) { return Math.round(n * 1000) / 1000; }

/* Summaries that make sense for a kind of value, for the menu. */
export function summariesFor(sampleType) {
  const all = Object.keys(SUMMARIES);
  if (sampleType === 'number') return ['Average', 'Median', 'Min', 'Max', 'Sum', 'Range', 'Stddev', 'Empty', 'Filled', 'Unique'];
  if (sampleType === 'date') return ['Earliest', 'Latest', 'Range', 'Empty', 'Filled', 'Unique'];
  if (sampleType === 'boolean') return ['Checked', 'Unchecked', 'Empty', 'Filled'];
  return all.filter(k => ['Empty', 'Filled', 'Unique'].includes(k));
}

/* The summary `name` (built in, or a formula in the base's summaries)
   over the rows' values of property `id`. */
export function summarize(ctx, name, id, rows) {
  const values = rows.map(r => sortable(r.safeGet(id)));
  if (SUMMARIES[name]) return SUMMARIES[name].fn(values);
  const custom = ctx.config.summaries && ctx.config.summaries[name];
  if (custom === undefined) throw new BaseError('Unknown summary “' + name + '”');
  return evaluate(parse(custom), ctx.scope(null, { values }));
}

export { equals, compare, toText, truthy, isEmpty, typeOf };
