/* The Bases formula language: what goes in filters, formulas and
   summaries. Obsidian's syntax:

     status == "active" && due < today() + "7d"
     file.hasTag("book") || file.inFolder("Reading")
     if(price, (price * 1.2).toFixed(2) + " €", "")
     tags.filter(value.startsWith("project")).length
     note["due date"], formula.overdue, this.file.name

   parse(source) -> AST (throws BaseError with a readable message)
   evaluate(ast, scope) -> value, where scope = new Scope(...) (see query.js)

   Functions follow Obsidian's Bases reference: global functions (date,
   today, now, if, link, file, image, icon, html, list, number, max, min,
   duration, escapeHTML), and methods on strings, numbers, dates, lists,
   links, files, objects and regular expressions. */

import {
  BDate, BLink, BFile, BImage, BIcon, BHtml, BaseError,
  toDate, parseDuration, durationMs, addDuration, typeOf, isEmpty, truthy, toText, toNumber,
  equals, compare, sortCompare, naturalCompare
} from './values.js';
import { getAllTags, parseLinktext } from '../core/metadata.js';

/* --- tokens ------------------------------------------------------------------ */

const PUNCT = ['===', '!==', '==', '!=', '<=', '>=', '&&', '||', '(', ')', '[', ']', '{', '}', ',', '.', '!', '<', '>', '+', '-', '*', '/', '%', ':', '?'];

function tokenize(src) {
  const out = [];
  let i = 0;
  const operandExpected = () => {
    const t = out[out.length - 1];
    return !t || (t.type === 'punct' && !')]}'.includes(t.v));
  };
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1, s = '';
      while (j < src.length && src[j] !== ch) {
        if (src[j] === '\\' && j + 1 < src.length) {
          const n = src[j + 1];
          s += n === 'n' ? '\n' : n === 't' ? '\t' : n;
          j += 2;
        } else s += src[j++];
      }
      if (j >= src.length) throw new BaseError('A string isn’t closed: ' + src.slice(i, i + 20));
      out.push({ type: 'str', v: s, at: i });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      const m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i));
      out.push({ type: 'num', v: parseFloat(m[0]), at: i });
      i += m[0].length;
      continue;
    }
    if (ch === '/' && operandExpected()) {
      let j = i + 1, inClass = false;
      while (j < src.length && (src[j] !== '/' || inClass)) {
        if (src[j] === '\\') j++;
        else if (src[j] === '[') inClass = true;
        else if (src[j] === ']') inClass = false;
        j++;
      }
      if (j >= src.length) throw new BaseError('A regular expression isn’t closed.');
      const body = src.slice(i + 1, j);
      const flags = /^[a-z]*/.exec(src.slice(j + 1))[0];
      try { out.push({ type: 'regex', v: new RegExp(body, flags), at: i }); }
      catch (e) { throw new BaseError('Bad regular expression: ' + e.message); }
      i = j + 1 + flags.length;
      continue;
    }
    const id = /^[\p{L}_$][\p{L}\p{N}_$]*/u.exec(src.slice(i));
    if (id) { out.push({ type: 'id', v: id[0], at: i }); i += id[0].length; continue; }
    const p = PUNCT.find(x => src.startsWith(x, i));
    if (p) { out.push({ type: 'punct', v: p === '===' ? '==' : p === '!==' ? '!=' : p, at: i }); i += p.length; continue; }
    throw new BaseError('Unexpected “' + ch + '”');
  }
  return out;
}

/* --- parser ------------------------------------------------------------------ */

const BINARY = [['||'], ['&&'], ['==', '!='], ['<', '<=', '>', '>='], ['+', '-'], ['*', '/', '%']];
const cache = new Map();

export function parse(src) {
  src = String(src ?? '');
  if (cache.has(src)) { const c = cache.get(src); if (c instanceof Error) throw c; return c; }
  try {
    const toks = tokenize(src);
    let pos = 0;
    const peek = () => toks[pos];
    const isP = v => toks[pos] && toks[pos].type === 'punct' && toks[pos].v === v;
    const expect = v => {
      if (!isP(v)) throw new BaseError('Expected “' + v + '”' + (toks[pos] ? ' near “' + src.slice(toks[pos].at, toks[pos].at + 12) + '”' : ' at the end'));
      pos++;
    };
    const binary = level => {
      if (level === BINARY.length) return unary();
      let left = binary(level + 1);
      while (toks[pos] && toks[pos].type === 'punct' && BINARY[level].includes(toks[pos].v)) {
        const op = toks[pos++].v;
        left = { t: 'bin', op, left, right: binary(level + 1) };
      }
      return left;
    };
    const ternary = () => {
      const cond = binary(0);
      if (isP('?')) { pos++; const a = ternary(); expect(':'); const b = ternary(); return { t: 'call', callee: { t: 'id', name: 'if' }, args: [cond, a, b] }; }
      return cond;
    };
    const unary = () => {
      if (isP('!')) { pos++; return { t: 'unary', op: '!', arg: unary() }; }
      if (isP('-')) { pos++; return { t: 'unary', op: '-', arg: unary() }; }
      if (isP('+')) { pos++; return unary(); }
      return postfix(primary());
    };
    const args = () => {
      const list = [];
      expect('(');
      if (!isP(')')) { do { list.push(ternary()); } while (isP(',') && ++pos); }
      expect(')');
      return list;
    };
    const postfix = node => {
      for (;;) {
        if (isP('.')) {
          pos++;
          const t = peek();
          if (!t || t.type !== 'id') throw new BaseError('Expected a name after “.”');
          pos++;
          node = { t: 'member', obj: node, name: t.v };
        } else if (isP('[')) {
          pos++;
          const index = ternary();
          expect(']');
          node = { t: 'index', obj: node, index };
        } else if (isP('(')) {
          node = { t: 'call', callee: node, args: args() };
        } else return node;
      }
    };
    const primary = () => {
      const t = peek();
      if (!t) throw new BaseError('The formula ends too soon.');
      if (t.type === 'num') { pos++; return { t: 'lit', v: t.v }; }
      if (t.type === 'str') { pos++; return { t: 'lit', v: t.v }; }
      if (t.type === 'regex') { pos++; return { t: 'lit', v: t.v }; }
      if (t.type === 'id') {
        pos++;
        if (t.v === 'true') return { t: 'lit', v: true };
        if (t.v === 'false') return { t: 'lit', v: false };
        if (t.v === 'null') return { t: 'lit', v: null };
        return { t: 'id', name: t.v };
      }
      if (isP('(')) { pos++; const e = ternary(); expect(')'); return e; }
      if (isP('[')) {
        pos++;
        const items = [];
        if (!isP(']')) { do { if (isP(']')) break; items.push(ternary()); } while (isP(',') && ++pos); }
        expect(']');
        return { t: 'list', items };
      }
      if (isP('{')) {
        pos++;
        const entries = [];
        if (!isP('}')) {
          do {
            const k = peek();
            if (!k || (k.type !== 'str' && k.type !== 'id')) throw new BaseError('Expected a key in the object');
            pos++;
            expect(':');
            entries.push([k.v, ternary()]);
          } while (isP(',') && ++pos);
        }
        expect('}');
        return { t: 'obj', entries };
      }
      throw new BaseError('Unexpected “' + (t.v instanceof RegExp ? t.v : t.v) + '”');
    };
    if (!toks.length) throw new BaseError('The formula is empty.');
    const ast = ternary();
    if (pos < toks.length) throw new BaseError('Unexpected “' + src.slice(toks[pos].at, toks[pos].at + 12) + '”');
    cache.set(src, ast);
    if (cache.size > 2000) cache.delete(cache.keys().next().value);
    return ast;
  } catch (e) {
    const err = e instanceof BaseError ? e : new BaseError(e.message);
    cache.set(src, err);
    throw err;
  }
}

/* --- evaluation ------------------------------------------------------------------ */

/* The objects behind `note`, `formula` and `this`. */
export class NoteRef { constructor(row) { this.row = row; } }
export class FormulaRef { constructor(row) { this.row = row; } }
export class ThisRef { constructor(row) { this.row = row; } }

export function evaluate(ast, scope) {
  switch (ast.t) {
    case 'lit': return ast.v;
    case 'list': return ast.items.map(x => evaluate(x, scope));
    case 'obj': { const o = {}; for (const [k, v] of ast.entries) o[k] = evaluate(v, scope); return o; }
    case 'id': return lookup(ast.name, scope);
    case 'member': return member(evaluate(ast.obj, scope), ast.name, scope);
    case 'index': return index(evaluate(ast.obj, scope), evaluate(ast.index, scope), scope);
    case 'unary': {
      const v = evaluate(ast.arg, scope);
      if (ast.op === '!') return !truthy(v);
      const n = toNumber(v);
      return n === null ? null : -n;
    }
    case 'bin': return binary(ast, scope);
    case 'call': return call(ast, scope);
  }
  throw new BaseError('Can’t evaluate this formula.');
}

function lookup(name, scope) {
  if (scope.locals && Object.prototype.hasOwnProperty.call(scope.locals, name)) return scope.locals[name];
  const row = scope.row;
  switch (name) {
    case 'file': return row ? new BFile(row.file) : null;
    case 'note': return row ? new NoteRef(row) : null;
    case 'formula': return row ? new FormulaRef(row) : null;
    case 'this': return scope.thisRow ? new ThisRef(scope.thisRow) : null;
  }
  /* Anything else is a note property ("status" means note.status). */
  return row ? row.note(name) : null;
}

function index(obj, key, scope) {
  if (obj === null || obj === undefined) return null;
  if (obj instanceof NoteRef) return obj.row.note(toText(key));
  if (obj instanceof FormulaRef) return obj.row.formula(toText(key));
  if (obj instanceof ThisRef) return obj.row.note(toText(key));
  if (Array.isArray(obj) || typeof obj === 'string') {
    let i = toNumber(key);
    if (i === null) return null;
    if (i < 0) i += obj.length;
    const v = obj[i];
    return v === undefined ? null : v;
  }
  if (typeOf(obj) === 'object') { const v = obj[toText(key)]; return v === undefined ? null : v; }
  return member(obj, toText(key), scope);
}

/* Fields (no brackets). */
function member(obj, name, scope) {
  if (obj === null || obj === undefined) return null;
  const app = scope.app;
  if (obj instanceof NoteRef) return obj.row.note(name);
  if (obj instanceof FormulaRef) return obj.row.formula(name);
  if (obj instanceof ThisRef) {
    if (name === 'file') return new BFile(obj.row.file);
    if (name === 'note') return new NoteRef(obj.row);
    if (name === 'formula') return new FormulaRef(obj.row);
    return obj.row.note(name);
  }
  const t = typeOf(obj);
  if (t === 'file') return fileField(app, obj.file, name, scope);
  if (t === 'date') {
    const d = obj.date;
    switch (name) {
      case 'year': return d.getFullYear();
      case 'month': return d.getMonth() + 1;
      case 'day': return d.getDate();
      case 'hour': return d.getHours();
      case 'minute': return d.getMinutes();
      case 'second': return d.getSeconds();
      case 'millisecond': return d.getMilliseconds();
    }
  }
  if (name === 'length' && (t === 'string' || t === 'list')) return obj.length;
  /* The difference of two dates is milliseconds; these read it as a
     duration: (today() - due).days */
  if (t === 'number' && DURATION_FIELDS[name]) return Math.trunc(obj / DURATION_FIELDS[name]);
  if (t === 'link') {
    if (name === 'display') return obj.display;
    if (name === 'path') return obj.path;
  }
  if (t === 'object') { const v = obj[name]; return v === undefined ? null : v; }
  return null;
}

const DURATION_FIELDS = { milliseconds: 1, seconds: 1e3, minutes: 6e4, hours: 36e5, days: 864e5, weeks: 6048e5, months: 2629746e3, years: 31556952e3 };

const FILE_FIELDS = ['name', 'basename', 'path', 'folder', 'ext', 'size', 'ctime', 'mtime', 'tags', 'links', 'backlinks', 'embeds', 'properties', 'file'];

function fileField(app, file, name, scope) {
  const cache = file.extension === 'md' ? app.metadataCache.getFileCache(file) : null;
  switch (name) {
    case 'name': return file.name;
    case 'basename': return file.basename;
    case 'path': return file.path;
    case 'folder': return file.parent ? file.parent.path || '/' : '/';
    case 'ext': return file.extension;
    case 'size': return file.stat ? file.stat.size : null;
    case 'ctime': return file.stat ? new BDate(file.stat.ctime, true) : null;
    case 'mtime': return file.stat ? new BDate(file.stat.mtime, true) : null;
    case 'tags': return uniq(getAllTags(cache));
    case 'links': return ((cache && cache.links) || []).concat((cache && cache.frontmatterLinks) || []).map(l => new BLink(l.link, null, file.path));
    case 'embeds': return ((cache && cache.embeds) || []).map(l => new BLink(l.link, null, file.path));
    case 'backlinks': return scope.backlinks(file).map(p => new BLink(p.replace(/\.md$/, ''), null, ''));
    case 'properties': return (cache && cache.frontmatter) ? Object.assign({}, cache.frontmatter) : {};
    case 'file': return new BFile(file);
  }
  return null;
}

function uniq(list) { return Array.from(new Set(list)); }

function binary(ast, scope) {
  const op = ast.op;
  if (op === '&&') { const a = evaluate(ast.left, scope); return truthy(a) ? truthy(evaluate(ast.right, scope)) : false; }
  if (op === '||') { const a = evaluate(ast.left, scope); return truthy(a) ? true : truthy(evaluate(ast.right, scope)); }
  const a = evaluate(ast.left, scope), b = evaluate(ast.right, scope);
  const app = scope.app;
  switch (op) {
    case '==': return equals(app, a, b);
    case '!=': return !equals(app, a, b);
    case '<': { const c = compare(a, b); return c !== null && c < 0; }
    case '<=': { const c = compare(a, b); return c !== null && c <= 0; }
    case '>': { const c = compare(a, b); return c !== null && c > 0; }
    case '>=': { const c = compare(a, b); return c !== null && c >= 0; }
    case '+': return plus(a, b);
    case '-': return minus(a, b);
    case '*': case '/': case '%': {
      const x = toNumber(a), y = toNumber(b);
      if (x === null || y === null) return null;
      return op === '*' ? x * y : op === '/' ? x / y : x % y;
    }
  }
  return null;
}

function plus(a, b) {
  const ta = typeOf(a), tb = typeOf(b);
  if (ta === 'date' && (tb === 'string' || tb === 'number')) {
    const d = tb === 'number' ? [[b, 'milliseconds']] : parseDuration(b);
    if (d) return addDuration(a, d, 1);
    if (tb === 'string') return toText(a) + b;
  }
  if (tb === 'date' && ta === 'string') { const d = parseDuration(a); if (d) return addDuration(b, d, 1); }
  if (ta === 'list' && tb === 'list') return a.concat(b);
  if (ta === 'list') return a.concat([b]);
  if (ta === 'number' && tb === 'number') return a + b;
  if (ta === 'null' && tb === 'number') return b;
  if (tb === 'null' && ta === 'number') return a;
  if (ta === 'string' || tb === 'string' || ta === 'link' || tb === 'link' || ta === 'file' || tb === 'file' || ta === 'date' || tb === 'date') return toText(a) + toText(b);
  const x = toNumber(a), y = toNumber(b);
  return x === null || y === null ? null : x + y;
}

function minus(a, b) {
  const ta = typeOf(a), tb = typeOf(b);
  if (ta === 'date') {
    if (tb === 'date' || (tb === 'string' && toDate(b) && !parseDuration(b))) return a.ms - toDate(b).ms;
    const d = tb === 'number' ? [[b, 'milliseconds']] : parseDuration(b);
    if (d) return addDuration(a, d, -1);
    return null;
  }
  const x = toNumber(a), y = toNumber(b);
  return x === null || y === null ? null : x - y;
}

/* --- calls ------------------------------------------------------------------------------ */

function call(ast, scope) {
  const callee = ast.callee;
  if (callee.t === 'id') {
    const fn = GLOBALS[callee.name];
    if (!fn) throw new BaseError('Unknown function “' + callee.name + '”');
    if (fn.lazy) return fn(ast.args, scope);
    return fn(...ast.args.map(a => evaluate(a, scope)), scope);
  }
  if (callee.t === 'member') {
    const obj = evaluate(callee.obj, scope);
    return method(obj, callee.name, ast.args, scope);
  }
  throw new BaseError('This can’t be called like a function.');
}

const GLOBALS = {
  if: Object.assign((args, scope) => {
    if (args.length < 2) throw new BaseError('if() needs a condition and a value');
    return truthy(evaluate(args[0], scope)) ? evaluate(args[1], scope) : args[2] ? evaluate(args[2], scope) : null;
  }, { lazy: true }),
  date: v => {
    if (v === null || v === undefined) return null;
    const d = toDate(v instanceof BLink || v instanceof BFile ? toText(v) : v);
    if (!d) throw new BaseError('Not a date: ' + toText(v));
    return d;
  },
  today: () => new BDate(window.moment().startOf('day').valueOf(), false),
  now: () => new BDate(Date.now(), true),
  duration: v => {
    const d = parseDuration(toText(v));
    if (!d) throw new BaseError('Not a duration: ' + toText(v));
    return durationMs(d);
  },
  number: v => {
    if (v === null || v === undefined) return null;
    const n = toNumber(v);
    if (n === null) throw new BaseError('Not a number: ' + toText(v));
    return n;
  },
  list: v => v === null || v === undefined ? [] : Array.isArray(v) ? v : [v],
  link: (path, display, scope) => {
    if (scope === undefined) { scope = display; display = null; }
    if (path instanceof BFile) return new BLink(scope.app.metadataCache.fileToLinktext(path.file, '', true), display ? toText(display) : null, '');
    if (path instanceof BLink) return display ? new BLink(path.linktext, toText(display), path.sourcePath) : path;
    const s = toText(path).replace(/^\[\[|\]\]$/g, '');
    return new BLink(s, display ? toText(display) : null, scope.sourcePath || '');
  },
  file: (path, scope) => {
    if (path instanceof BFile) return path;
    const app = scope.app;
    const f = path instanceof BLink ? path.resolve(app)
      : app.vault.getFileByPath(toText(path)) || app.metadataCache.getFirstLinkpathDest(toText(path).replace(/^\[\[|\]\]$/g, ''), scope.sourcePath || '');
    return f ? new BFile(f) : null;
  },
  image: v => v === null || v === undefined ? null : new BImage(v instanceof BLink || v instanceof BFile ? v : toText(v)),
  icon: v => v === null || v === undefined ? null : new BIcon(toText(v)),
  html: v => v === null || v === undefined ? null : new BHtml(toText(v)),
  escapeHTML: v => toText(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
  max: (...args) => { args.pop(); return extreme(args.flat(), 1); },
  min: (...args) => { args.pop(); return extreme(args.flat(), -1); }
};

function extreme(list, sign) {
  let best = null;
  for (const v of list) {
    if (isEmpty(v)) continue;
    if (best === null) { best = v; continue; }
    const c = compare(v, best);
    if (c !== null && c * sign > 0) best = v;
  }
  return best;
}

/* Methods: name -> fn(obj, args, scope) with args already evaluated,
   unless listed in LAZY. */
const LAZY = new Set(['filter', 'map', 'reduce', 'any', 'all', 'find']);

function method(obj, name, argAsts, scope) {
  const app = scope.app;
  const t = typeOf(obj);
  if (obj instanceof NoteRef || obj instanceof FormulaRef || obj instanceof ThisRef) {
    throw new BaseError('Unknown function “' + name + '”');
  }
  if (t === 'list' && LAZY.has(name)) return listLazy(obj, name, argAsts, scope);
  const args = argAsts.map(a => evaluate(a, scope));
  /* Any value */
  switch (name) {
    case 'isTruthy': return truthy(obj);
    case 'isEmpty': return isEmpty(obj);
    case 'isType': return typeMatches(obj, toText(args[0]));
    case 'toString': return toText(obj);
  }
  if (obj === null || obj === undefined) {
    /* Methods on a missing value give nothing rather than an error, so
       formulas over notes without the property still work. */
    if (['contains', 'containsAll', 'containsAny', 'startsWith', 'endsWith', 'hasTag', 'hasLink', 'hasProperty', 'inFolder', 'matches'].includes(name)) return false;
    return null;
  }
  const fn = (METHODS[t] && METHODS[t][name]) || null;
  if (fn) return fn(obj, args, scope);
  /* Strings of dates and lists of one kind answer to the other's methods. */
  if (t === 'string' && METHODS.date[name]) { const d = toDate(obj); if (d) return METHODS.date[name](d, args, scope); }
  if (t === 'link' && METHODS.string[name]) return METHODS.string[name](toText(obj), args, scope);
  if (t !== 'list' && METHODS.list[name] && !METHODS.string[name]) return METHODS.list[name]([obj], args, scope);
  throw new BaseError('Unknown function “' + name + '” for a ' + (t === 'null' ? 'missing value' : t));
}

function typeMatches(v, want) {
  const t = typeOf(v);
  want = want.toLowerCase();
  if (want === 'null' || want === 'empty') return t === 'null';
  if (want === 'list' || want === 'array') return t === 'list';
  return t === want;
}

function listLazy(list, name, argAsts, scope) {
  const expr = argAsts[0];
  if (!expr) throw new BaseError(name + '() needs an expression');
  const each = (value, i, extra) => evaluate(expr, Object.assign({}, scope, { locals: Object.assign({}, scope.locals, { value, index: i }, extra) }));
  switch (name) {
    case 'filter': return list.filter((v, i) => truthy(each(v, i)));
    case 'map': return list.map((v, i) => each(v, i));
    case 'any': return list.some((v, i) => truthy(each(v, i)));
    case 'all': return list.every((v, i) => truthy(each(v, i)));
    case 'find': { const i = list.findIndex((v, n) => truthy(each(v, n))); return i < 0 ? null : list[i]; }
    case 'reduce': {
      let acc = argAsts[1] ? evaluate(argAsts[1], scope) : null;
      list.forEach((v, i) => { acc = each(v, i, { acc }); });
      return acc;
    }
  }
  return null;
}

function strContains(app, hay, needle) {
  if (Array.isArray(hay)) return hay.some(x => equals(app, x, needle) || (typeof x === 'string' && typeof needle === 'string' && x === needle));
  return toText(hay).includes(toText(needle));
}

const num = v => { const n = toNumber(v); if (n === null) throw new BaseError('Expected a number, got ' + (toText(v) || 'nothing')); return n; };

const METHODS = {
  string: {
    contains: (s, [x]) => s.includes(toText(x)),
    containsAll: (s, xs) => xs.every(x => s.includes(toText(x))),
    containsAny: (s, xs) => xs.some(x => s.includes(toText(x))),
    startsWith: (s, [x]) => s.startsWith(toText(x)),
    endsWith: (s, [x]) => s.endsWith(toText(x)),
    lower: s => s.toLowerCase(),
    upper: s => s.toUpperCase(),
    title: s => s.replace(/\p{L}[\p{L}\p{M}']*/gu, w => w[0].toUpperCase() + w.slice(1).toLowerCase()),
    trim: s => s.trim(),
    reverse: s => Array.from(s).reverse().join(''),
    repeat: (s, [n]) => s.repeat(Math.max(0, num(n))),
    slice: (s, [a, b]) => s.slice(a === undefined || a === null ? 0 : num(a), b === undefined || b === null ? undefined : num(b)),
    split: (s, [sep, n]) => {
      const parts = s.split(sep instanceof RegExp ? sep : toText(sep ?? ','));
      return n === undefined || n === null ? parts : parts.slice(0, num(n));
    },
    replace: (s, [a, b]) => a instanceof RegExp ? s.replace(a, toText(b)) : s.split(toText(a)).join(toText(b)),
    replaceAll: (s, [a, b]) => a instanceof RegExp ? s.replace(new RegExp(a.source, a.flags.includes('g') ? a.flags : a.flags + 'g'), toText(b)) : s.split(toText(a)).join(toText(b)),
    matches: (s, [re]) => re instanceof RegExp ? re.test(s) : s.includes(toText(re)),
    toNumber: s => toNumber(s)
  },
  number: {
    abs: n => Math.abs(n),
    ceil: n => Math.ceil(n),
    floor: n => Math.floor(n),
    round: (n, [d]) => { const p = Math.pow(10, d === undefined || d === null ? 0 : num(d)); return Math.round(n * p) / p; },
    toFixed: (n, [d]) => n.toFixed(Math.max(0, Math.min(100, d === undefined ? 0 : num(d)))),
    toString: n => toText(n)
  },
  boolean: {},
  date: {
    date: d => new BDate(window.moment(d.ms).startOf('day').valueOf(), false),
    time: d => window.moment(d.ms).format('HH:mm:ss'),
    format: (d, [f]) => window.moment(d.ms).format(f === undefined || f === null ? 'YYYY-MM-DD' : toText(f)),
    relative: d => d.hasTime ? window.moment(d.ms).fromNow() : relativeDay(d),
    year: d => d.date.getFullYear()
  },
  list: {
    contains: (l, [x], scope) => strContains(scope.app, l, x),
    containsAll: (l, xs, scope) => xs.every(x => strContains(scope.app, l, x)),
    containsAny: (l, xs, scope) => xs.some(x => strContains(scope.app, l, x)),
    join: (l, [sep]) => l.map(toText).join(sep === undefined ? ', ' : toText(sep)),
    reverse: l => l.slice().reverse(),
    sort: l => l.slice().sort(sortCompare),
    unique: (l, a, scope) => l.filter((x, i) => l.findIndex(y => equals(scope.app, x, y)) === i),
    flat: l => l.flat(Infinity),
    slice: (l, [a, b]) => l.slice(a === undefined || a === null ? 0 : num(a), b === undefined || b === null ? undefined : num(b)),
    first: l => l.length ? l[0] : null,
    last: l => l.length ? l[l.length - 1] : null,
    sum: l => numbers(l).reduce((a, b) => a + b, 0),
    mean: l => { const n = numbers(l); return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null; },
    average: l => METHODS.list.mean(l),
    median: l => {
      const n = numbers(l).sort((a, b) => a - b);
      if (!n.length) return null;
      const m = Math.floor(n.length / 2);
      return n.length % 2 ? n[m] : (n[m - 1] + n[m]) / 2;
    },
    stddev: l => {
      const n = numbers(l);
      if (!n.length) return null;
      const mean = n.reduce((a, b) => a + b, 0) / n.length;
      return Math.sqrt(n.reduce((a, b) => a + (b - mean) * (b - mean), 0) / n.length);
    },
    min: l => extreme(l, -1),
    max: l => extreme(l, 1),
    count: l => l.length
  },
  link: {
    asFile: (l, a, scope) => { const f = l.resolve(scope.app); return f ? new BFile(f) : null; },
    linksTo: (l, [x], scope) => {
      const f = l.resolve(scope.app);
      return !!f && fileHasLink(scope.app, f, x, scope);
    }
  },
  file: {
    hasTag: (f, tags, scope) => {
      const cache = scope.app.metadataCache.getFileCache(f.file);
      const have = getAllTags(cache).map(t => t.slice(1).toLowerCase());
      return tags.flat().some(t => {
        const want = toText(t).replace(/^#/, '').toLowerCase();
        return have.some(x => x === want || x.startsWith(want + '/'));
      });
    },
    inFolder: (f, [folder]) => {
      const p = (folder instanceof BFile ? folder.file.path : toText(folder)).replace(/^\/+|\/+$/g, '');
      if (!p) return true;
      return f.file.path.toLowerCase().startsWith(p.toLowerCase() + '/');
    },
    hasLink: (f, [x], scope) => fileHasLink(scope.app, f.file, x, scope),
    hasProperty: (f, [name], scope) => {
      const fm = (scope.app.metadataCache.getFileCache(f.file) || {}).frontmatter;
      const n = toText(name).toLowerCase();
      return !!fm && Object.keys(fm).some(k => k.toLowerCase() === n);
    },
    asLink: (f, [display], scope) => new BLink(scope.app.metadataCache.fileToLinktext(f.file, '', true), display ? toText(display) : null, ''),
    linksTo: (f, [x], scope) => fileHasLink(scope.app, f.file, x, scope)
  },
  object: {
    keys: o => Object.keys(o),
    values: o => Object.values(o)
  },
  regexp: {
    matches: (re, [s]) => { re.lastIndex = 0; return re.test(toText(s)); }
  },
  image: {}, icon: {}, html: {}
};

function numbers(l) { return l.map(toNumber).filter(n => n !== null && !isNaN(n)); }

function relativeDay(d) {
  const days = Math.round((window.moment(d.ms).startOf('day') - window.moment().startOf('day')) / 864e5);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return window.moment(d.ms).startOf('day').from(window.moment().startOf('day'));
}

function fileHasLink(app, file, target, scope) {
  let dest = null, text = null;
  if (target instanceof BFile) dest = target.file;
  else if (target instanceof BLink) { dest = target.resolve(app); text = target.path; }
  else if (target !== null && target !== undefined) {
    text = toText(target).replace(/^\[\[|\]\]$/g, '');
    text = parseLinktext(text.split('|')[0]).path;
    dest = app.metadataCache.getFirstLinkpathDest(text, file.path);
  }
  if (dest) {
    const r = app.metadataCache.resolvedLinks[file.path];
    return !!(r && r[dest.path]);
  }
  if (text) {
    const u = app.metadataCache.unresolvedLinks[file.path];
    return !!(u && Object.keys(u).some(k => k.toLowerCase() === text.toLowerCase()));
  }
  return false;
}

/* Names offered while typing a formula. */
export const FUNCTION_NAMES = Object.keys(GLOBALS);
export const FILE_PROPERTIES = FILE_FIELDS.filter(f => f !== 'file');
export const METHOD_NAMES = Object.fromEntries(Object.entries(METHODS).map(([k, v]) => [k, Object.keys(v)]));

export { truthy, toText, isEmpty, sortCompare, naturalCompare, typeOf, BaseError };
