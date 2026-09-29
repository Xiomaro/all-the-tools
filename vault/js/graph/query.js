/* Which files a search query matches, for the graph's filter and its
   colour groups. Uses the search plugin's app.search.matches(query) when
   it's there, so the graph understands the same syntax as Search;
   otherwise a smaller built-in matcher: words (in file names, paths and
   note text), "quoted phrases", -negation, OR, and the operators file:,
   path:, tag:, content:, line:, section: and /regex/. */

import { getAllTags } from '../core/metadata.js';

/* A Set of matching file paths, or null for an empty query. */
export async function matchQuery(app, query) {
  query = String(query || '').trim();
  if (!query) return null;
  const search = app.search;
  if (search && typeof search.matches === 'function') {
    try {
      const set = toPathSet(await search.matches(query));
      if (set) return set;
    } catch (e) { /* fall back to the built-in matcher */ }
  }
  return fallbackMatch(app, query);
}

/* Accept whatever shape the search plugin hands back: a Map or object
   keyed by file or path, or a list of files, paths or { file } results. */
function toPathSet(res) {
  if (!res) return null;
  const out = new Set();
  const add = v => {
    if (!v) return;
    if (typeof v === 'string') out.add(v);
    else if (typeof v.path === 'string' && !v.file) out.add(v.path);
    else if (v.file) add(v.file);
  };
  if (res instanceof Map) { for (const k of res.keys()) add(k); return out; }
  if (res instanceof Set || Array.isArray(res)) { for (const v of res) add(v); return out; }
  if (Array.isArray(res.results)) { res.results.forEach(add); return out; }
  if (typeof res === 'object') { Object.keys(res).forEach(add); return out; }
  return null;
}

export function fallbackMatch(app, query) {
  const alts = parse(query);
  const out = new Set();
  if (!alts.length) return null;
  for (const file of app.vault.getFiles()) {
    const ctx = context(app, file);
    if (alts.some(terms => terms.every(t => test(t, ctx) !== t.neg))) out.add(file.path);
  }
  return out;
}

function context(app, file) {
  let text = null, tags = null;
  return {
    file,
    name: file.name.toLowerCase(),
    path: file.path.toLowerCase(),
    get text() {
      if (text === null) text = file.extension === 'md' ? String(app.vault.texts.get(file.path) || '').toLowerCase() : '';
      return text;
    },
    get tags() {
      if (tags === null) tags = getAllTags(app.metadataCache.getFileCache(file)).map(t => t.replace(/^#/, '').toLowerCase());
      return tags;
    }
  };
}

function test(t, ctx) {
  const v = t.value;
  if (t.re) {
    if (t.op === 'file') return t.re.test(ctx.file.name);
    if (t.op === 'path') return t.re.test(ctx.file.path);
    return t.re.test(ctx.file.path) || t.re.test(ctx.text);
  }
  switch (t.op) {
    case 'file': return ctx.name.includes(v);
    case 'path': return ctx.path.includes(v);
    case 'tag': { const tag = v.replace(/^#/, ''); return ctx.tags.some(x => x === tag || x.startsWith(tag + '/')); }
    case 'content': case 'line': case 'section': case 'block': return ctx.text.includes(v);
    default: return ctx.path.includes(v) || ctx.text.includes(v);
  }
}

/* "a b OR c -d" -> [[a, b], [c, -d]] */
function parse(query) {
  const tokens = [];
  const re = /(-?)(?:([a-z-]+):)?("([^"]*)"|\/((?:[^/\\]|\\.)+)\/|\(([^)]*)\)|(\S+))/gi;
  let m;
  while ((m = re.exec(query))) {
    const [, neg, op, , quoted, regex, group, word] = m;
    if (!op && !neg && word === 'OR') { tokens.push('OR'); continue; }
    let value = quoted !== undefined ? quoted : group !== undefined ? group : word;
    const t = { neg: !!neg, op: (op || '').toLowerCase(), value: String(value || '').toLowerCase() };
    if (regex !== undefined) { try { t.re = new RegExp(regex, 'i'); } catch (e) { t.value = regex.toLowerCase(); } }
    if (!t.re && !t.value) continue;
    tokens.push(t);
  }
  const alts = [[]];
  for (const t of tokens) {
    if (t === 'OR') alts.push([]);
    else alts[alts.length - 1].push(t);
  }
  return alts.filter(a => a.length);
}
