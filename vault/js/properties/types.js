/* Property types, as Obsidian keeps them: one type per property name for
   the whole vault, saved in .obsidian/types.json as
   { "types": { "due": "date", ... } }. Properties without a saved type get
   one inferred from their values, as Obsidian does. Also an index of every
   property name in the vault with how many notes use it. */

import { Events } from '../core/events.js';
import { listValue } from '../core/metadata.js';

export const TYPES = {
  text: { name: 'Text', icon: 'text' },
  multitext: { name: 'List', icon: 'list' },
  number: { name: 'Number', icon: 'binary' },
  checkbox: { name: 'Checkbox', icon: 'check-square' },
  date: { name: 'Date', icon: 'calendar' },
  datetime: { name: 'Date & time', icon: 'clock' },
  aliases: { name: 'Aliases', icon: 'forward', reserved: true },
  tags: { name: 'Tags', icon: 'tags', reserved: true }
};

/* The types a user can pick in the menu. */
export const PICKABLE = ['text', 'multitext', 'number', 'checkbox', 'date', 'datetime'];

/* Names whose type Obsidian fixes. */
const FIXED = { tags: 'tags', aliases: 'aliases', cssclasses: 'multitext' };

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;

export function inferType(value) {
  if (typeof value === 'boolean') return 'checkbox';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value)) return 'multitext';
  if (typeof value === 'string') {
    if (DATE_RE.test(value)) return 'date';
    if (DATETIME_RE.test(value)) return 'datetime';
  }
  return 'text';
}

/* Whether a value can be shown with the editor for `type`. */
export function valueFits(type, v) {
  if (v === null || v === undefined || v === '') return true;
  switch (type) {
    case 'text': return typeof v !== 'object';
    case 'multitext': case 'tags': case 'aliases':
      return (Array.isArray(v) && v.every(x => x === null || typeof x !== 'object')) || typeof v === 'string' || typeof v === 'number';
    case 'number': return typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)));
    case 'checkbox': return typeof v === 'boolean' || v === 'true' || v === 'false';
    case 'date': return typeof v === 'string' && (DATE_RE.test(v) || DATETIME_RE.test(v));
    case 'datetime': return typeof v === 'string' && (DATE_RE.test(v) || DATETIME_RE.test(v));
  }
  return true;
}

/* Turn a value into what `type` stores, or undefined if it can't be. */
export function convertValue(type, v) {
  if (v === null || v === undefined) return null;
  switch (type) {
    case 'text':
      if (Array.isArray(v)) return v.join(', ');
      return typeof v === 'object' ? JSON.stringify(v) : String(v);
    case 'multitext': case 'aliases': return Array.isArray(v) ? v.map(String) : listValue(v, false);
    case 'tags': return listValue(v, true).map(t => t.replace(/^#/, ''));
    case 'number': { const n = Number(Array.isArray(v) ? v[0] : v); return isNaN(n) ? undefined : n; }
    case 'checkbox': return v === true || v === 'true' ? true : v === false || v === 'false' ? false : undefined;
    case 'date': { const s = String(v); return DATE_RE.test(s) ? s : DATETIME_RE.test(s) ? s.slice(0, 10) : undefined; }
    case 'datetime': { const s = String(v); return DATETIME_RE.test(s) ? s.slice(0, 16) + (s.length > 16 && s[16] === ':' ? s.slice(16, 19) : '') : DATE_RE.test(s) ? s + 'T00:00' : undefined; }
  }
  return v;
}

export class PropertyTypes extends Events {
  constructor(app) {
    super();
    this.app = app;
    this.data = { types: {} };
    this.index = null;          /* lower-case name -> { name, count, sample } */
    const dirty = () => { this.index = null; this.trigger('index-changed'); };
    app.metadataCache.on('changed', dirty);
    app.metadataCache.on('deleted', dirty);
    app.vault.on('rename', dirty);
    /* types.json edited elsewhere (Obsidian, sync) is read again when the
       tab comes back into focus. */
    window.addEventListener('focus', () => { clearTimeout(this._reload); this._reload = setTimeout(() => this.reload(), 500); });
  }

  async load() {
    const d = await this.app.config.readJson('types', null);
    this.data = d && typeof d === 'object' && !Array.isArray(d) ? d : {};
    if (!this.data.types || typeof this.data.types !== 'object') this.data.types = {};
  }

  /* Pick up a types.json changed on disk (Obsidian or sync). */
  async reload() {
    if (Date.now() - (this.lastWrite || 0) < 2000) return;
    const before = JSON.stringify(this.data.types);
    this.app.config.json.delete('types');
    await this.load();
    if (JSON.stringify(this.data.types) !== before) this.trigger('types-changed');
  }

  savedType(name) {
    const t = this.data.types;
    if (Object.prototype.hasOwnProperty.call(t, name)) return t[name];
    const lower = String(name).toLowerCase();
    const k = Object.keys(t).find(x => x.toLowerCase() === lower);
    return k ? t[k] : null;
  }

  /* The type a property shows with. `value`, when given, is used to infer
     the type of a property that has none saved. */
  getType(name, value) {
    const lower = String(name).toLowerCase();
    if (FIXED[lower]) return FIXED[lower];
    const saved = this.savedType(name);
    if (saved && TYPES[saved]) return saved;
    if (value !== undefined && value !== null) return inferType(value);
    const entry = this.getIndex().get(lower);
    return entry && entry.sample !== undefined ? inferType(entry.sample) : 'text';
  }

  isFixed(name) { return !!FIXED[String(name).toLowerCase()]; }

  setType(name, type) {
    if (!TYPES[type] || this.isFixed(name)) return;
    const t = this.data.types;
    const lower = String(name).toLowerCase();
    Object.keys(t).forEach(k => { if (k.toLowerCase() === lower && k !== name) delete t[k]; });
    t[name] = type;
    this.lastWrite = Date.now();
    this.app.config.writeJson('types', this.data);
    this.trigger('types-changed', name, type);
  }

  /* Move a saved type when a property is renamed. */
  renameType(from, to) {
    const saved = this.savedType(from);
    if (!saved) return;
    const lower = String(from).toLowerCase();
    Object.keys(this.data.types).forEach(k => { if (k.toLowerCase() === lower) delete this.data.types[k]; });
    this.data.types[to] = saved;
    this.lastWrite = Date.now();
    this.app.config.writeJson('types', this.data);
    this.trigger('types-changed', to, saved);
  }

  getIndex() {
    if (this.index) return this.index;
    const idx = new Map();
    for (const [, cache] of this.app.metadataCache.cache) {
      const fm = cache.frontmatter;
      if (!fm) continue;
      for (const k of Object.keys(fm)) {
        const lower = k.toLowerCase();
        let e = idx.get(lower);
        if (!e) idx.set(lower, e = { name: k, count: 0, sample: undefined });
        e.count++;
        if (e.sample === undefined && fm[k] !== null && fm[k] !== undefined) e.sample = fm[k];
      }
    }
    this.index = idx;
    return idx;
  }

  /* Every property name in the vault: [{ name, count, type }]. */
  allNames() {
    return Array.from(this.getIndex().values()).map(e => ({ name: e.name, count: e.count, type: this.getType(e.name) }));
  }

  /* The values a property has across the vault, most used first, for
     suggestions. */
  valuesOf(name) {
    const lower = String(name).toLowerCase();
    const counts = new Map();
    for (const [, cache] of this.app.metadataCache.cache) {
      const fm = cache.frontmatter;
      if (!fm) continue;
      const k = Object.keys(fm).find(x => x.toLowerCase() === lower);
      if (k === undefined) continue;
      const v = fm[k];
      for (const x of Array.isArray(v) ? v : [v]) {
        if (x === null || x === undefined || typeof x === 'object' || x === '') continue;
        const s = String(x);
        counts.set(s, (counts.get(s) || 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  }
}
