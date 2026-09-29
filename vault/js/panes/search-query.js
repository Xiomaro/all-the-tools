/* Obsidian's search language: words (all must match), OR, -negation,
   "exact phrases", ( ) grouping, /regex/, the operators file: path:
   content: tag: line: block: section: task: task-todo: task-done:
   match-case: ignore-case:, and properties [name], [name:value],
   [name:null].

   parseQuery(text) gives a tree; compileQuery(app, text, opts).test(file)
   gives null or { matches, nameMatches } where matches are [start, end]
   offsets in the note's text and nameMatches are offsets in its displayed
   name. Notes are read from app.vault.texts, so a search of thousands of
   notes never touches the disk. */

import { lineOffsets } from '../core/metadata.js';
import { isExcluded } from './util.js';

const OPS = ['file', 'path', 'content', 'tag', 'line', 'block', 'section', 'task', 'task-todo', 'task-done', 'match-case', 'ignore-case'];
const SCOPES = new Set(['line', 'block', 'section', 'task', 'task-todo', 'task-done']);

/* --- parsing ------------------------------------------------------------------------- */

export function parseQuery(input) {
  const p = { s: String(input || ''), i: 0 };
  return parseOr(p, false);
}

function skipWs(p) { while (p.i < p.s.length && /\s/.test(p.s[p.i])) p.i++; }

function atOr(p) {
  return p.s.startsWith('OR', p.i) && (p.i + 2 >= p.s.length || /[\s(]/.test(p.s[p.i + 2]));
}

function parseOr(p, inGroup) {
  const alts = [parseAnd(p, inGroup)];
  for (;;) {
    skipWs(p);
    if (!atOr(p)) break;
    p.i += 2;
    alts.push(parseAnd(p, inGroup));
  }
  const kids = alts.filter(Boolean);
  if (!kids.length) return null;
  return kids.length === 1 ? kids[0] : { type: 'or', children: kids };
}

function parseAnd(p, inGroup) {
  const kids = [];
  for (;;) {
    skipWs(p);
    if (p.i >= p.s.length) break;
    if (inGroup && p.s[p.i] === ')') break;
    if (atOr(p) && kids.length) break;
    const n = parseUnary(p, inGroup);
    if (n) kids.push(n);
  }
  if (!kids.length) return null;
  return kids.length === 1 ? kids[0] : { type: 'and', children: kids };
}

function parseUnary(p, inGroup) {
  if (p.s[p.i] === '-' && p.i + 1 < p.s.length && !/\s/.test(p.s[p.i + 1])) {
    p.i++;
    const c = parseUnary(p, inGroup);
    return c ? { type: 'not', child: c } : null;
  }
  return parsePrimary(p, inGroup, false);
}

function parseGroup(p) {
  p.i++;
  const n = parseOr(p, true);
  skipWs(p);
  if (p.s[p.i] === ')') p.i++;
  return n;
}

function parsePrimary(p, inGroup, operand) {
  const c = p.s[p.i];
  if (c === '(') return parseGroup(p);
  if (c === '"') return parseQuoted(p);
  if (c === '/') { const r = tryRegex(p); if (r) return r; }
  if (c === '[' && !operand) { const r = tryProperty(p); if (r) return r; }
  const m = /^([a-zA-Z-]+):/.exec(p.s.slice(p.i, p.i + 16));
  if (m && OPS.includes(m[1].toLowerCase())) {
    p.i += m[0].length;
    const nc = p.s[p.i];
    const child = nc === undefined || /\s/.test(nc) || (inGroup && nc === ')') ? null : parsePrimary(p, inGroup, true);
    return { type: 'op', op: m[1].toLowerCase(), child };
  }
  return parseWord(p, inGroup);
}

function parseQuoted(p) {
  let i = p.i + 1, out = '';
  while (i < p.s.length && p.s[i] !== '"') {
    if (p.s[i] === '\\' && (p.s[i + 1] === '"' || p.s[i + 1] === '\\')) { out += p.s[i + 1]; i += 2; }
    else out += p.s[i++];
  }
  p.i = Math.min(i + 1, p.s.length);
  return { type: 'term', text: out, exact: true };
}

function tryRegex(p) {
  let i = p.i + 1;
  while (i < p.s.length) {
    if (p.s[i] === '\\') { i += 2; continue; }
    if (p.s[i] === '/') break;
    i++;
  }
  if (i >= p.s.length || i === p.i + 1) return null;
  const source = p.s.slice(p.i + 1, i);
  p.i = i + 1;
  let error = null;
  try { new RegExp(source); } catch (e) { error = e.message; }
  return { type: 'regex', source, error };
}

function tryProperty(p) {
  let i = p.i + 1, quoted = false;
  for (; i < p.s.length; i++) {
    const ch = p.s[i];
    if (ch === '"') quoted = !quoted;
    else if (ch === ']' && !quoted) break;
  }
  if (i >= p.s.length) return null;
  const inner = p.s.slice(p.i + 1, i);
  p.i = i + 1;
  const colon = inner.indexOf(':');
  const name = (colon < 0 ? inner : inner.slice(0, colon)).trim().replace(/^"(.*)"$/, '$1');
  if (!name) return null;
  if (colon < 0) return { type: 'prop', name, value: null };
  const vtext = inner.slice(colon + 1).trim();
  if (vtext === 'null') return { type: 'prop', name, isNull: true };
  return { type: 'prop', name, value: parseQuery(vtext) };
}

function parseWord(p, inGroup) {
  const start = p.i;
  while (p.i < p.s.length && !/\s/.test(p.s[p.i]) && !(inGroup && p.s[p.i] === ')')) p.i++;
  if (p.i === start) { p.i++; return null; }
  return { type: 'term', text: p.s.slice(start, p.i) };
}

/* --- explaining ------------------------------------------------------------------------ */

const OP_TEXT = {
  file: 'Match file name', path: 'Match path of the file', content: 'Match only in content', tag: 'Match tag',
  line: 'Match on the same line', block: 'Match in the same block', section: 'Match in the same section',
  task: 'Match in tasks', 'task-todo': 'Match in tasks not done', 'task-done': 'Match in completed tasks',
  'match-case': 'Match case', 'ignore-case': 'Ignore case'
};

/* Lines describing the query, for "Explain search term". */
export function explainQuery(node, depth = 0, out = []) {
  const pad = '  '.repeat(depth);
  if (!node) return out;
  switch (node.type) {
    case 'and': out.push(pad + 'Match all of:'); node.children.forEach(c => explainQuery(c, depth + 1, out)); break;
    case 'or': out.push(pad + 'Match any of:'); node.children.forEach(c => explainQuery(c, depth + 1, out)); break;
    case 'not': out.push(pad + 'Do not match:'); explainQuery(node.child, depth + 1, out); break;
    case 'term': out.push(pad + (node.text ? 'Match "' + node.text + '"' + (depth === 0 || !node.exact ? '' : ' exactly') : 'Match everything')); break;
    case 'regex': out.push(pad + (node.error ? 'Invalid regular expression /' + node.source + '/: ' + node.error : 'Match regular expression /' + node.source + '/')); break;
    case 'op':
      out.push(pad + OP_TEXT[node.op] + (node.child ? ':' : ' (any)'));
      if (node.child) explainQuery(node.child, depth + 1, out);
      break;
    case 'prop':
      if (node.isNull) out.push(pad + 'Match property "' + node.name + '" when it is empty');
      else if (!node.value) out.push(pad + 'Match notes with the property "' + node.name + '"');
      else { out.push(pad + 'Match property "' + node.name + '" with value:'); explainQuery(node.value, depth + 1, out); }
      break;
  }
  return out;
}

/* --- matching --------------------------------------------------------------------------- */

const NONE = null;
const hit = (m = [], n = [], meta = false) => ({ m, n, meta });

/* Lower-case copies of note texts, kept while the text is unchanged. */
const lowerCache = new Map();
export function lowerText(path, text) {
  const c = lowerCache.get(path);
  if (c && c.text === text) return c.lower;
  const lower = text.toLowerCase();
  lowerCache.set(path, { text, lower });
  return lower;
}

class Doc {
  constructor(app, file, text) {
    this.app = app;
    this.file = file;
    this.text = text;
    this.title = file ? (file.extension === 'md' ? file.basename : file.name) : '';
    this._lower = null;
  }
  get lower() {
    if (this._lower !== null) return this._lower;
    const path = this.file && this.file.path;
    return (this._lower = path ? lowerText(path, this.text) : this.text.toLowerCase());
  }
  get cache() {
    if (this._cache === undefined) this._cache = (this.file && this.file.extension === 'md' && this.app.metadataCache.getFileCache(this.file)) || null;
    return this._cache;
  }
  get lineStarts() { return this._ls || (this._ls = lineOffsets(this.text)); }

  /* [start, end] ranges of lines, blocks, sections or tasks. */
  ranges(kind) {
    this._ranges = this._ranges || {};
    if (this._ranges[kind]) return this._ranges[kind];
    const text = this.text, ls = this.lineStarts, cache = this.cache || {};
    const lineEnd = l => (l + 1 < ls.length ? ls[l + 1] - 1 : text.length);
    let out = [];
    if (kind === 'line') out = ls.map((s, l) => [s, lineEnd(l)]);
    else if (kind === 'section') {
      const heads = cache.headings || [];
      let start = cache.frontmatterPosition ? Math.min(text.length, cache.frontmatterPosition.end.offset + 1) : 0;
      for (const hd of heads) {
        if (hd.position.start.offset > start) out.push([start, hd.position.start.offset]);
        start = hd.position.start.offset;
      }
      out.push([start, text.length]);
    } else if (kind === 'block') {
      const items = cache.listItems || [];
      for (const s of cache.sections || []) {
        if (s.type === 'yaml') continue;
        if (s.type === 'list') {
          const inside = items.filter(i => i.position.start.line >= s.position.start.line && i.position.start.line <= s.position.end.line);
          inside.forEach((it, k) => {
            const next = inside[k + 1];
            const endLine = next ? next.position.start.line - 1 : s.position.end.line;
            out.push([ls[it.position.start.line], lineEnd(endLine)]);
          });
          if (!inside.length) out.push([s.position.start.offset, s.position.end.offset]);
        } else out.push([s.position.start.offset, s.position.end.offset]);
      }
    } else {
      for (const it of cache.listItems || []) {
        if (it.task === undefined) continue;
        if (kind === 'task-todo' && it.task !== ' ') continue;
        if (kind === 'task-done' && it.task === ' ') continue;
        out.push([ls[it.position.start.line], lineEnd(it.position.end.line)]);
      }
    }
    return (this._ranges[kind] = out);
  }
}

function findText(doc, needle, scope) {
  const out = [];
  if (!needle) return out;
  const cs = scope.cs;
  let hay = cs ? doc.text : doc.lower;
  let nd = cs ? needle : needle.toLowerCase();
  if (!cs && (hay.length !== doc.text.length || nd.length !== needle.length)) {
    return findRegex(doc, needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), scope);
  }
  let i = hay.indexOf(nd, scope.from);
  while (i > -1 && i + nd.length <= scope.to) {
    out.push([i, i + nd.length]);
    if (out.length >= 5000) break;
    i = hay.indexOf(nd, i + nd.length);
  }
  return out;
}

const reCache = new Map();
function findRegex(doc, source, scope) {
  const key = source + (scope.cs ? '\u0000c' : '\u0000i');
  let re = reCache.get(key);
  if (re === undefined) {
    try { re = new RegExp(source, 'gm' + (scope.cs ? '' : 'i')); } catch (e) { re = null; }
    if (reCache.size > 200) reCache.clear();
    reCache.set(key, re);
  }
  const out = [];
  if (!re) return out;
  const slice = scope.from === 0 && scope.to === doc.text.length ? doc.text : doc.text.slice(scope.from, scope.to);
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(slice))) {
    if (m[0].length === 0) { re.lastIndex++; if (m.index === 0 && slice.length === 0) break; continue; }
    out.push([scope.from + m.index, scope.from + m.index + m[0].length]);
    if (out.length >= 5000) break;
  }
  return out;
}

/* All matches of a term in the whole note, worked out once per note and
   then narrowed to the scope, so line:( ) and friends stay linear. */
function termMatches(doc, node, scope) {
  const len = doc.text.length;
  const key = (node.type === 'term' ? 't' : 'r') + (scope.cs ? 'c' : 'i') + (node.type === 'term' ? node.text : node.source);
  doc._tm = doc._tm || new Map();
  let all = doc._tm.get(key);
  if (!all) {
    const whole = { from: 0, to: len, cs: scope.cs };
    all = node.type === 'term' ? findText(doc, node.text, whole) : findRegex(doc, node.source, whole);
    doc._tm.set(key, all);
  }
  if (scope.from <= 0 && scope.to >= len) return all;
  let lo = 0, hi = all.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (all[mid][0] < scope.from) lo = mid + 1; else hi = mid; }
  const out = [];
  for (let i = lo; i < all.length && all[i][0] < scope.to; i++) if (all[i][1] <= scope.to) out.push(all[i]);
  return out;
}

/* Evaluate the query on a plain string (a file name, path or property
   value). */
function evalOnString(app, node, str, cs) {
  const doc = new Doc(app, null, String(str));
  return evalNode(node, doc, { from: 0, to: doc.text.length, name: false, whole: true, cs });
}

function merge(into, r) {
  if (r.m.length) into.m.push(...r.m);
  if (r.n.length) into.n.push(...r.n);
  if (r.meta) into.meta = true;
}

function evalNode(node, doc, scope) {
  if (!node) return hit();
  switch (node.type) {
    case 'and': {
      const acc = hit();
      for (const c of node.children) {
        const r = evalNode(c, doc, scope);
        if (!r) return NONE;
        merge(acc, r);
      }
      return acc;
    }
    case 'or': {
      let acc = NONE;
      for (const c of node.children) {
        const r = evalNode(c, doc, scope);
        if (r) { acc = acc || hit(); merge(acc, r); }
      }
      return acc;
    }
    case 'not':
      return evalNode(node.child, doc, scope) ? NONE : hit();
    case 'term':
    case 'regex': {
      if (node.type === 'term' && !node.text) return scope.whole ? hit() : hit([[scope.from, scope.to]]);
      if (node.type === 'regex' && node.error) return NONE;
      const m = termMatches(doc, node, scope);
      let n = [];
      if (scope.name && doc.title) {
        const t = new Doc(doc.app, null, doc.title);
        const ts = { from: 0, to: doc.title.length, cs: scope.cs };
        n = node.type === 'term' ? findText(t, node.text, ts) : findRegex(t, node.source, ts);
      }
      return m.length || n.length ? hit(m, n) : NONE;
    }
    case 'op': return evalOp(node, doc, scope);
    case 'prop': return evalProp(node, doc, scope);
  }
  return NONE;
}

function evalOp(node, doc, scope) {
  const { op, child } = node;
  if (op === 'match-case' || op === 'ignore-case') return evalNode(child, doc, Object.assign({}, scope, { cs: op === 'match-case' }));
  if (op === 'content') return evalNode(child, doc, Object.assign({}, scope, { name: false }));
  if (op === 'file' || op === 'path') {
    if (!doc.file || !scope.whole) return NONE;
    const str = op === 'file' ? doc.file.name : doc.file.path;
    const r = child ? evalOnString(doc.app, child, str, scope.cs) : hit();
    if (!r) return NONE;
    const shift = str.length - doc.file.name.length;
    const n = r.m.map(([s, e]) => [s - shift, e - shift]).filter(([s, e]) => e > 0 && s < doc.title.length)
      .map(([s, e]) => [Math.max(0, s), Math.min(doc.title.length, e)]);
    return hit([], n, true);
  }
  if (op === 'tag') return evalTag(child, doc, scope);
  if (SCOPES.has(op)) {
    const ranges = doc.ranges(op);
    const acc = hit();
    let any = false;
    for (const [s, e] of ranges) {
      if (e < scope.from || s > scope.to) continue;
      const sub = { from: Math.max(s, scope.from), to: Math.min(e, scope.to), name: false, whole: false, cs: scope.cs };
      const r = child ? evalNode(child, doc, sub) : hit([[sub.from, sub.to]]);
      if (r) {
        any = true;
        if (r.m.length) acc.m.push(...r.m);
        else acc.m.push([sub.from, sub.to]);
      }
    }
    return any ? acc : NONE;
  }
  return NONE;
}

/* tag:#a matches #a and nested tags such as #a/b, in any case. */
function evalTag(child, doc, scope) {
  if (!child) return NONE;
  if (child.type === 'or' || child.type === 'and' || child.type === 'not') {
    const wrap = c => ({ type: 'op', op: 'tag', child: c });
    if (child.type === 'not') return evalTag(child.child, doc, scope) ? NONE : hit();
    return evalNode({ type: child.type, children: child.children.map(wrap) }, doc, scope);
  }
  if (child.type !== 'term') return NONE;
  const want = child.text.replace(/^#/, '').toLowerCase();
  if (!want) return NONE;
  const cache = doc.cache;
  if (!cache) return NONE;
  const ok = t => { const x = t.replace(/^#/, '').toLowerCase(); return x === want || x.startsWith(want + '/'); };
  const m = (cache.tags || []).filter(t => ok(t.tag) && t.position.start.offset >= scope.from && t.position.end.offset <= scope.to)
    .map(t => [t.position.start.offset, t.position.end.offset]);
  const inFm = scope.whole && (cache.frontmatterTags || []).some(ok);
  return m.length || inFm ? hit(m, [], inFm) : NONE;
}

function evalProp(node, doc, scope) {
  const fm = doc.cache && doc.cache.frontmatter;
  if (!fm || !scope.whole) return NONE;
  const want = node.name.toLowerCase();
  const key = Object.keys(fm).find(k => k.toLowerCase() === want);
  if (key === undefined) return NONE;
  const v = fm[key];
  const empty = v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length);
  if (node.isNull) return empty ? hit([], [], true) : NONE;
  if (!node.value) return hit([], [], true);
  if (empty) return NONE;
  for (const x of Array.isArray(v) ? v : [v]) {
    const str = x !== null && typeof x === 'object' ? JSON.stringify(x) : String(x);
    if (evalOnString(doc.app, node.value, str, scope.cs)) return hit([], [], true);
  }
  return NONE;
}

export function mergeRanges(ranges) {
  const sorted = ranges.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else out.push([r[0], r[1]]);
  }
  return out;
}

/* A compiled query. test(file) returns null or
   { file, matches, nameMatches, content }. Excluded files are skipped
   unless opts.includeExcluded. */
export function compileQuery(app, query, opts = {}) {
  const ast = typeof query === 'string' ? parseQuery(query) : query;
  const cs = !!opts.matchCase;
  return {
    ast,
    empty: !ast,
    test(file, text) {
      if (!ast || file.isFolder) return null;
      if (!opts.includeExcluded && isExcluded(app, file.path)) return null;
      const md = file.extension === 'md';
      const content = text !== undefined ? text : md ? (app.vault.texts.get(file.path) || '') : '';
      const doc = new Doc(app, file, content);
      const r = evalNode(ast, doc, { from: 0, to: content.length, name: true, whole: true, cs });
      if (!r) return null;
      if (!md && !r.meta && !r.n.length) return null;
      return { file, matches: mergeRanges(r.m), nameMatches: mergeRanges(r.n), content };
    }
  };
}

/* Every file that matches, synchronously: for bookmarks, graph groups
   and bases. */
export function searchVault(app, query, opts = {}) {
  const q = compileQuery(app, query, opts);
  if (q.empty) return [];
  const out = [];
  for (const f of app.vault.getFiles()) {
    const r = q.test(f);
    if (r) out.push(r);
  }
  return out;
}
