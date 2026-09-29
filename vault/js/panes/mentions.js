/* Links and unlinked mentions between notes, for the backlinks and
   outgoing links panes. An unlinked mention is a note's name (or one of
   its aliases) written as plain text, as a whole word, outside links,
   code and the frontmatter. */

import { parseLinktext } from '../core/metadata.js';
import { lowerText } from './search-query.js';
import { isExcluded } from './util.js';

const WORD = /[\p{L}\p{N}_]/u;

/* Link references in `src` that resolve to `target`. */
export function refsTo(app, src, target) {
  const mc = app.metadataCache;
  const cache = mc.getCache(src);
  if (!cache) return [];
  const out = [];
  for (const l of (cache.links || []).concat(cache.embeds || [], cache.frontmatterLinks || [])) {
    const lp = parseLinktext(l.link).path;
    const dest = lp ? mc.getFirstLinkpathDest(lp, src) : (src === target.path ? target : null);
    if (dest === target) out.push(l);
  }
  return out;
}

/* Map of source path -> references, using resolvedLinks to skip notes
   that don't link here. */
export function backlinksFor(app, file) {
  const out = new Map();
  const rl = app.metadataCache.resolvedLinks || {};
  for (const src in rl) {
    if (!rl[src] || !rl[src][file.path]) continue;
    const refs = refsTo(app, src, file);
    if (refs.length) out.set(src, refs);
  }
  return out;
}

/* Ranges of `text` where mentions don't count. */
function blockedRanges(cache) {
  const out = [];
  if (!cache) return out;
  if (cache.frontmatterPosition) out.push([0, cache.frontmatterPosition.end.offset]);
  for (const l of (cache.links || []).concat(cache.embeds || [])) if (l.position) out.push([l.position.start.offset, l.position.end.offset]);
  for (const s of cache.sections || []) if (s.type === 'code' || s.type === 'math' || s.type === 'comment') out.push([s.position.start.offset, s.position.end.offset]);
  return out;
}

/* Where any of `names` appears as plain words in `text`. */
export function findMentions(text, lower, cache, names) {
  const blocked = blockedRanges(cache);
  const hits = [];
  for (const name of names) {
    const n = name.toLowerCase();
    if (!n.trim()) continue;
    let i = lower.indexOf(n);
    while (i > -1) {
      const e = i + n.length;
      const before = i > 0 ? text[i - 1] : '', after = e < text.length ? text[e] : '';
      if (!(before && WORD.test(before)) && !(after && WORD.test(after)) && !blocked.some(([a, b]) => i < b && e > a) && !hits.some(([a, b]) => i < b && e > a)) hits.push([i, e]);
      i = lower.indexOf(n, i + 1);
    }
  }
  return hits.sort((a, b) => a[0] - b[0]);
}

export function namesOf(app, file) {
  const names = [file.basename].concat(app.metadataCache.getAliases(file) || []);
  return [...new Set(names.filter(n => n && n.trim().length > 1))];
}

/* Notes that mention `file` without linking to it:
   [{ file: source, matches, content }]. */
export function unlinkedMentionsOf(app, file) {
  const names = namesOf(app, file);
  if (!names.length) return [];
  const lowers = names.map(n => n.toLowerCase());
  const rl = app.metadataCache.resolvedLinks || {};
  const out = [];
  for (const src of app.vault.getMarkdownFiles()) {
    if (src === file || isExcluded(app, src.path)) continue;
    const text = app.vault.texts.get(src.path) || '';
    if (!text) continue;
    const lower = lowerText(src.path, text);
    if (!lowers.some(n => lower.includes(n))) continue;
    const matches = findMentions(text, lower, app.metadataCache.getCache(src.path), names);
    if (matches.length) out.push({ file: src, matches, content: text, linked: !!(rl[src.path] && rl[src.path][file.path]) });
  }
  return out;
}

/* Other notes that `file`'s text mentions without linking:
   [{ file: target, matches (in file's text), content }]. */
export function outgoingMentionsOf(app, file) {
  const text = app.vault.texts.get(file.path) || '';
  if (!text) return [];
  const lower = lowerText(file.path, text);
  const words = new Set(lower.split(/[^\p{L}\p{N}_]+/u).filter(Boolean));
  const cache = app.metadataCache.getCache(file.path);
  const linked = (app.metadataCache.resolvedLinks || {})[file.path] || {};
  const out = [];
  for (const target of app.vault.getMarkdownFiles()) {
    if (target === file || linked[target.path] || isExcluded(app, target.path)) continue;
    const names = namesOf(app, target).filter(n => {
      const first = n.toLowerCase().split(/[^\p{L}\p{N}_]+/u).filter(Boolean)[0];
      return first && words.has(first);
    });
    if (!names.length) continue;
    const matches = findMentions(text, lower, cache, names);
    if (matches.length) out.push({ file: target, matches, content: text });
  }
  return out;
}

/* Turn the mention at [start, end) of `src` into a link to `target`. */
export async function linkMention(app, src, target, start, end) {
  const names = namesOf(app, target).map(n => n.toLowerCase());
  await app.vault.process(src, text => {
    const found = text.slice(start, end);
    if (!names.includes(found.toLowerCase())) return text;
    const alias = found === target.basename ? '' : found;
    const link = app.fileManager.generateMarkdownLink(target, src.path, '', alias);
    return text.slice(0, start) + link + text.slice(end);
  });
}
