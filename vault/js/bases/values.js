/* Values in Bases formulas besides plain strings, numbers, booleans, lists
   and objects: dates, links, files, and the few things only drawn in a
   cell (images, icons, HTML). Plus how any value compares, adds and
   prints. */

export class BDate {
  constructor(ms, hasTime) { this.ms = ms; this.hasTime = !!hasTime; }
  get date() { return new Date(this.ms); }
  toString() {
    const m = window.moment(this.ms);
    return this.hasTime ? m.format('YYYY-MM-DD HH:mm') : m.format('YYYY-MM-DD');
  }
}

export class BLink {
  constructor(linktext, display, sourcePath) { this.linktext = linktext; this.display = display || null; this.sourcePath = sourcePath || ''; }
  get path() { return this.linktext.split('#')[0]; }
  resolve(app) { return this.path ? app.metadataCache.getFirstLinkpathDest(this.path, this.sourcePath) : app.vault.getFileByPath(this.sourcePath); }
  toString() { return this.display || this.linktext; }
}

export class BFile {
  constructor(file) { this.file = file; }
  toString() { return this.file.extension === 'md' ? this.file.basename : this.file.name; }
}

export class BImage { constructor(src) { this.src = src; } toString() { return String(this.src); } }
export class BIcon { constructor(name) { this.name = name; } toString() { return String(this.name); } }
export class BHtml { constructor(html) { this.html = html; } toString() { return String(this.html).replace(/<[^>]*>/g, ''); } }

export class BaseError extends Error {}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/* A date from a string ("2025-01-31", "2025-01-31T10:30", or anything
   moment can read), a number (ms) or a Date. */
export function toDate(v) {
  if (v instanceof BDate) return v;
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? new BDate(v, true) : null;
  if (v instanceof Date) return isNaN(v) ? null : new BDate(v.getTime(), true);
  if (v instanceof BFile) return null;
  const s = String(v).trim();
  let m = DATE_ONLY.exec(s);
  if (m) return new BDate(new Date(+m[1], +m[2] - 1, +m[3]).getTime(), false);
  m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}:?\d{2})?$/.exec(s);
  if (m) {
    if (m[8]) return new BDate(Date.parse(s.replace(' ', 'T')), true);
    return new BDate(new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0), +((m[7] || '0') + '00').slice(0, 3)).getTime(), true);
  }
  const mo = window.moment(s, window.moment.ISO_8601, true);
  if (mo.isValid()) return new BDate(mo.valueOf(), true);
  return null;
}

/* "1d", "2 weeks", "-3h", "1y 2M". Returns [[amount, unit], ...] with
   moment's units, or null. Obsidian's units: y, M, w, d, h, m, s (and
   their long forms). */
const UNITS = {
  y: 'years', yr: 'years', yrs: 'years', year: 'years', years: 'years',
  M: 'months', month: 'months', months: 'months',
  w: 'weeks', wk: 'weeks', wks: 'weeks', week: 'weeks', weeks: 'weeks',
  d: 'days', day: 'days', days: 'days',
  h: 'hours', hr: 'hours', hrs: 'hours', hour: 'hours', hours: 'hours',
  m: 'minutes', min: 'minutes', mins: 'minutes', minute: 'minutes', minutes: 'minutes',
  s: 'seconds', sec: 'seconds', secs: 'seconds', second: 'seconds', seconds: 'seconds',
  ms: 'milliseconds', millisecond: 'milliseconds', milliseconds: 'milliseconds'
};
export function parseDuration(s) {
  if (typeof s !== 'string') return null;
  const parts = [];
  const re = /\s*([+-]?\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s*/y;
  let m, at = 0;
  const str = s.trim();
  if (!str) return null;
  re.lastIndex = 0;
  while (at < str.length && (m = re.exec(str))) {
    /* "M" is months and "m" minutes; other units ignore case. */
    const unit = UNITS[m[2]] || UNITS[m[2].toLowerCase()];
    if (!unit) return null;
    parts.push([parseFloat(m[1]), unit]);
    at = re.lastIndex;
  }
  return at === str.length && parts.length ? parts : null;
}
const UNIT_MS = { milliseconds: 1, seconds: 1e3, minutes: 6e4, hours: 36e5, days: 864e5, weeks: 6048e5, months: 2629746e3, years: 31556952e3 };
export function durationMs(parts) { return parts.reduce((t, [n, u]) => t + n * UNIT_MS[u], 0); }

export function addDuration(date, parts, sign) {
  const m = window.moment(date.ms);
  for (const [n, u] of parts) m.add(sign * n, u);
  const hasTime = date.hasTime || parts.some(([n, u]) => UNIT_MS[u] < 864e5 || n % 1 !== 0);
  return new BDate(m.valueOf(), hasTime);
}

/* --- type checks, truth, text ------------------------------------------------------- */

export function typeOf(v) {
  if (v === null || v === undefined) return 'null';
  if (Array.isArray(v)) return 'list';
  if (v instanceof BDate) return 'date';
  if (v instanceof BLink) return 'link';
  if (v instanceof BFile) return 'file';
  if (v instanceof RegExp) return 'regexp';
  if (v instanceof BImage) return 'image';
  if (v instanceof BIcon) return 'icon';
  if (v instanceof BHtml) return 'html';
  if (typeof v === 'object') return 'object';
  return typeof v;   /* string, number, boolean */
}

export function isEmpty(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0 || v.every(isEmpty);
  if (typeOf(v) === 'object') return Object.keys(v).length === 0;
  if (typeof v === 'number') return isNaN(v);
  return false;
}

export function truthy(v) {
  if (v === null || v === undefined || v === false) return false;
  if (typeof v === 'number') return v !== 0 && !isNaN(v);
  if (typeof v === 'string') return v !== '';
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export function toText(v) {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(toText).join(', ');
  if (typeof v === 'number') return isFinite(v) ? String(Math.round(v * 1e10) / 1e10) : String(v);
  if (typeOf(v) === 'object') return JSON.stringify(v);
  return String(v);
}

export function toNumber(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof BDate) return v.ms;
  if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v);
  if (typeof v === 'string') { const d = parseDuration(v); if (d) return durationMs(d); }
  return null;
}

/* --- comparing ---------------------------------------------------------------------- */

function linkTarget(app, v) {
  if (v instanceof BFile) return v.file;
  if (v instanceof BLink) return v.resolve(app);
  return null;
}

export function equals(app, a, b) {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return (a ?? null) === (b ?? null);
  const ta = typeOf(a), tb = typeOf(b);
  if (ta === 'date' || tb === 'date') {
    const da = toDate(a), db = toDate(b);
    if (!da || !db) return false;
    if (!da.hasTime || !db.hasTime) return window.moment(da.ms).isSame(db.ms, 'day');
    return da.ms === db.ms;
  }
  if (ta === 'link' || tb === 'link' || ta === 'file' || tb === 'file') {
    const fa = linkTarget(app, a) || (ta === 'string' ? app.metadataCache.getFirstLinkpathDest(a, '') : null);
    const fb = linkTarget(app, b) || (tb === 'string' ? app.metadataCache.getFirstLinkpathDest(b, '') : null);
    if (fa && fb) return fa === fb;
    const sa = ta === 'link' ? a.path : String(a), sb = tb === 'link' ? b.path : String(b);
    return sa.toLowerCase() === sb.toLowerCase();
  }
  if (ta === 'list' && tb === 'list') return a.length === b.length && a.every((x, i) => equals(app, x, b[i]));
  if (ta === 'number' || tb === 'number') {
    const na = toNumber(a), nb = toNumber(b);
    return na !== null && nb !== null && na === nb;
  }
  if (ta === 'boolean' || tb === 'boolean') return String(a) === String(b);
  if (ta === 'object' && tb === 'object') return JSON.stringify(a) === JSON.stringify(b);
  return toText(a) === toText(b);
}

/* Order two values; null for "can't compare". */
export function compare(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) return null;
  const ta = typeOf(a), tb = typeOf(b);
  if (ta === 'date' || tb === 'date') {
    const da = toDate(a), db = toDate(b);
    if (!da || !db) return null;
    if (!da.hasTime || !db.hasTime) {
      const x = window.moment(da.ms).startOf('day').valueOf(), y = window.moment(db.ms).startOf('day').valueOf();
      return x - y;
    }
    return da.ms - db.ms;
  }
  if (ta === 'number' || tb === 'number' || ta === 'boolean') {
    const na = toNumber(a), nb = toNumber(b);
    if (na === null || nb === null) return null;
    return na - nb;
  }
  return naturalCompare(toText(a), toText(b));
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
export function naturalCompare(a, b) { return collator.compare(a, b); }

/* For sorting: every value has a place, empty ones last. */
export function sortCompare(a, b) {
  const ea = isEmpty(a), eb = isEmpty(b);
  if (ea || eb) return ea === eb ? 0 : ea ? 1 : -1;
  const c = compare(Array.isArray(a) ? a[0] : a, Array.isArray(b) ? b[0] : b);
  if (c === null || isNaN(c)) return naturalCompare(toText(a), toText(b));
  return c;
}
