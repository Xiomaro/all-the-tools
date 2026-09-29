/* Reads the structure out of a note without rendering it: frontmatter,
   headings, links, embeds, tags, block ids, list items and tasks, footnotes
   and top-level sections. The shape follows Obsidian's CachedMetadata, so
   positions are { start: { line, col, offset }, end: { line, col, offset } }
   with zero-based lines and columns.

   It is a line scanner rather than a full parser: fast enough to index a
   large vault on open, and it agrees with Obsidian on the things that
   matter for links and search (code, math and comments hide links and
   tags; frontmatter tags and aliases count). */

import yaml from './yaml.js';

const FENCE = /^( {0,3})(`{3,}|~{3,})(.*)$/;
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const LIST = /^([ \t]*)([-*+]|\d{1,9}[.)])([ \t]+|$)/;
const TASK = /^([ \t]*)([-*+]|\d{1,9}[.)])[ \t]+\[(.)\](?=[ \t]|$)/;
const BLOCK_ID = /(?:^|[ \t])\^([A-Za-z0-9-]+)[ \t]*$/;
const HR = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const TABLE_SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const FOOTNOTE_DEF = /^\[\^([^\]\s]+)\]:[ \t]?/;
export const TAG_RE = /(^|[\s(\[{,;:!?"'`])#([\p{L}\p{N}\p{M}_\-/]*[\p{L}\p{M}_\-/][\p{L}\p{N}\p{M}_\-/]*)/gu;
export const WIKILINK_RE = /(!?)\[\[([^\[\]\n]+?)\]\]/g;
export const MDLINK_RE = /(!?)\[((?:\\.|[^\]\\\n])*)\]\(\s*(<[^>\n]+>|(?:\\.|\([^)\s]*\)|[^()\s\\])+)(?:\s+(?:"[^"\n]*"|'[^'\n]*'))?\s*\)/g;
const EXTERNAL = /^[a-z][a-z0-9+.-]*:/i;

export function lineOffsets(text) {
  const offs = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) offs.push(i + 1);
  return offs;
}

function pos(offs, line, col) { return { line, col, offset: offs[line] + col }; }
function span(offs, line, c1, line2, c2) { return { start: pos(offs, line, c1), end: pos(offs, line2, c2) }; }

/* Frontmatter is a YAML block between "---" lines at the very top. */
export function splitFrontmatter(text) {
  const m = /^---[ \t]*\r?\n/.exec(text);
  if (!m) return null;
  const re = /^(?:---|\.\.\.)[ \t]*$/gm;
  re.lastIndex = m[0].length;
  let close = re.exec(text);
  /* An empty block ("---\n---") closes on the second line. */
  if (!close && /^---[ \t]*\r?\n---[ \t]*$/.test(text)) close = { index: m[0].length, 0: '---' };
  if (!close) return null;
  const raw = text.slice(m[0].length, close.index);
  let end = close.index + close[0].length;
  const endLine = text.slice(0, end).split('\n').length - 1;
  let data = null, error = null;
  try { data = raw.trim() ? yaml.load(raw) : {}; } catch (e) { error = e.message; }
  if (data !== null && (typeof data !== 'object' || Array.isArray(data))) { data = null; error = error || 'Frontmatter is not a set of properties'; }
  return { raw, data, error, start: 0, end, endLine, bodyStart: text[end] === '\r' ? end + 2 : text[end] === '\n' ? end + 1 : end };
}

/* Values Obsidian treats as a list of tags or aliases: a YAML list, or a
   string separated by commas or spaces. */
export function listValue(v, splitSpaces) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.flatMap(x => listValue(x, splitSpaces));
  const s = String(v);
  return s.split(splitSpaces ? /[,\s]+/ : /,/).map(x => x.trim()).filter(Boolean);
}

export function parseLinktext(linktext) {
  const i = linktext.indexOf('#');
  return i < 0 ? { path: linktext, subpath: '' } : { path: linktext.slice(0, i), subpath: linktext.slice(i) };
}

/* Blank out spans where links and tags don't count: inline code, inline
   math and %% comments %%. Lengths are kept so columns still line up. */
function maskInline(line, state) {
  let out = '';
  let i = 0;
  while (i < line.length) {
    if (state.comment) {
      const end = line.indexOf('%%', i);
      if (end < 0) { out += ' '.repeat(line.length - i); i = line.length; break; }
      out += ' '.repeat(end + 2 - i); i = end + 2; state.comment = false; continue;
    }
    const ch = line[i];
    if (ch === '\\' && i + 1 < line.length) { out += line.slice(i, i + 2); i += 2; continue; }
    if (ch === '%' && line[i + 1] === '%') { state.comment = true; out += '  '; i += 2; continue; }
    if (ch === '`') {
      let n = 1; while (line[i + n] === '`') n++;
      const ticks = '`'.repeat(n);
      const end = line.indexOf(ticks, i + n);
      if (end > -1) { out += ' '.repeat(end + n - i); i = end + n; continue; }
      out += line.slice(i, i + n); i += n; continue;
    }
    if (ch === '$' && line[i + 1] !== '$' && line[i + 1] && line[i + 1] !== ' ') {
      const end = line.indexOf('$', i + 1);
      if (end > i + 1 && line[end - 1] !== ' ' && !/\d/.test(line[end + 1] || '')) { out += ' '.repeat(end + 1 - i); i = end + 1; continue; }
    }
    out += ch; i++;
  }
  return out;
}

export function parseMarkdown(text) {
  const offs = lineOffsets(text);
  const lines = text.split('\n').map(l => l.endsWith('\r') ? l.slice(0, -1) : l);
  const cache = { links: [], embeds: [], tags: [], headings: [], sections: [], listItems: [], blocks: {}, footnotes: [], footnoteRefs: [] };

  let startLine = 0;
  const fm = splitFrontmatter(text);
  if (fm) {
    cache.frontmatterPosition = span(offs, 0, 0, fm.endLine, lines[fm.endLine].length);
    cache.sections.push({ type: 'yaml', position: cache.frontmatterPosition });
    if (fm.data) {
      cache.frontmatter = fm.data;
      const links = [];
      const visit = (key, v) => {
        if (typeof v === 'string') {
          WIKILINK_RE.lastIndex = 0;
          let m; while ((m = WIKILINK_RE.exec(v))) links.push(makeLink(m[2], m[0], key));
        } else if (Array.isArray(v)) v.forEach(x => visit(key, x));
      };
      Object.keys(fm.data).forEach(k => visit(k, fm.data[k]));
      if (links.length) cache.frontmatterLinks = links;
      const fmTags = listValue(fm.data.tags ?? fm.data.tag, true).map(t => '#' + t.replace(/^#/, ''));
      if (fmTags.length) cache.frontmatterTags = fmTags;
    } else if (fm.error) cache.frontmatterError = fm.error;
    startLine = fm.endLine + 1;
  }

  let fence = null, math = null, comment = null;
  let section = null;
  const inline = { comment: false };
  const listStack = [];   /* { indent, line } of open list items, for parents */
  let lastBlockStart = null;

  function openSection(type, line) {
    if (section && section.type === type && (type === 'list' || type === 'paragraph' || type === 'blockquote' || type === 'callout' || type === 'table')) {
      section.end = line; return;
    }
    closeSection();
    section = { type, start: line, end: line };
  }
  function closeSection() {
    if (!section) return;
    cache.sections.push({ type: section.type, position: span(offs, section.start, 0, section.end, lines[section.end].length) });
    section = null;
  }

  for (let ln = startLine; ln < lines.length; ln++) {
    const line = lines[ln];

    if (fence) {
      section.end = ln;
      const m = FENCE.exec(line);
      if (m && m[2][0] === fence.ch && m[2].length >= fence.len && !m[3].trim()) { fence = null; closeSection(); }
      continue;
    }
    if (math) {
      section.end = ln;
      if (/\$\$\s*$/.test(line)) { math = null; closeSection(); }
      continue;
    }
    if (comment) {
      section.end = ln;
      if (line.includes('%%')) { comment = null; closeSection(); }
      continue;
    }

    const fm2 = FENCE.exec(line);
    if (fm2 && !(fm2[2][0] === '`' && fm2[3].includes('`'))) {
      openSection('code', ln); fence = { ch: fm2[2][0], len: fm2[2].length };
      continue;
    }
    if (/^\s*\$\$/.test(line)) {
      openSection('math', ln);
      if (!/^\s*\$\$.*\$\$\s*$/.test(line) || line.trim() === '$$') math = true; else closeSection();
      continue;
    }
    if (/^\s*%%/.test(line) && !inline.comment) {
      const rest = line.slice(line.indexOf('%%') + 2);
      openSection('comment', ln);
      if (!rest.includes('%%')) comment = true; else closeSection();
      continue;
    }

    if (!line.trim()) { closeSection(); listStack.length = 0; lastBlockStart = null; continue; }

    const masked = maskInline(line, inline);
    const h = HEADING.exec(line);
    if (h) {
      closeSection();
      openSection('heading', ln);
      closeSection();
      const text = (h[2] || '').replace(/[ \t]+\^[A-Za-z0-9-]+$/, '');
      cache.headings.push({ heading: text, level: h[1].length, position: span(offs, ln, 0, ln, line.length) });
      lastBlockStart = ln;
    } else if (HR.test(line) && !(section && section.type === 'paragraph' && /^\s*-+\s*$/.test(line))) {
      closeSection(); openSection('thematicBreak', ln); closeSection();
    } else if (/^\s*>/.test(line)) {
      const isCallout = /^\s*>\s*\[!/.test(line);
      if (isCallout || !section || (section.type !== 'blockquote' && section.type !== 'callout')) {
        if (section && section.type !== 'blockquote' && section.type !== 'callout') closeSection();
        if (isCallout && section) closeSection();
        if (!section) { section = { type: isCallout ? 'callout' : 'blockquote', start: ln, end: ln }; lastBlockStart = ln; }
      } else section.end = ln;
    } else if (LIST.test(line)) {
      const lm = LIST.exec(line);
      const indent = lm[1].replace(/\t/g, '    ').length;
      if (!section || section.type !== 'list') { closeSection(); section = { type: 'list', start: ln, end: ln }; listStack.length = 0; }
      else section.end = ln;
      while (listStack.length && listStack[listStack.length - 1].indent >= indent) listStack.pop();
      const parent = listStack.length ? listStack[listStack.length - 1].line : -(section.start + 1);
      const item = { position: span(offs, ln, lm[1].length, ln, line.length), parent };
      const tm = TASK.exec(line);
      if (tm) item.task = tm[3];
      cache.listItems.push(item);
      listStack.push({ indent, line: ln });
      lastBlockStart = ln;
    } else if (FOOTNOTE_DEF.test(line)) {
      closeSection(); openSection('footnoteDefinition', ln);
      const id = FOOTNOTE_DEF.exec(line)[1];
      cache.footnotes.push({ id, position: span(offs, ln, 0, ln, line.length) });
      lastBlockStart = ln;
    } else if (line.includes('|') && ln + 1 < lines.length && TABLE_SEP.test(lines[ln + 1]) && (!section || section.type !== 'table')) {
      closeSection(); section = { type: 'table', start: ln, end: ln }; lastBlockStart = ln;
    } else if (section && section.type === 'table' && line.includes('|')) {
      section.end = ln;
    } else if (section && section.type === 'list' && /^\s+\S/.test(line)) {
      section.end = ln;   /* continuation of a list item */
    } else if (section && (section.type === 'footnoteDefinition') && /^\s+\S/.test(line)) {
      section.end = ln;
    } else if (/^\s*</.test(line) && (!section || section.type !== 'paragraph')) {
      openSection('html', ln); lastBlockStart = lastBlockStart ?? ln;
    } else {
      if (!section || (section.type !== 'paragraph' && section.type !== 'html')) { closeSection(); section = { type: 'paragraph', start: ln, end: ln }; lastBlockStart = ln; }
      else section.end = ln;
    }

    /* Block ids: "^id" at the end of a line. A line that is only the id
       names the block above it. */
    const bm = BLOCK_ID.exec(line);
    if (bm && !h) {
      const id = bm[1];
      const own = line.trim() === '^' + id;
      let first = ln, last = ln;
      if (own) {
        const prev = cache.sections[cache.sections.length - 1];
        if (section && section.start < ln) { first = section.start; last = ln - 1; }
        else if (prev) { first = prev.position.start.line; last = prev.position.end.line; }
      } else if (section && section.type !== 'list') first = section.start;
      cache.blocks[id.toLowerCase()] = { id, position: span(offs, first, 0, last, lines[last].length) };
    }

    scanInline(masked, ln, offs, cache);
  }
  closeSection();
  cache.sections.sort((a, b) => a.position.start.offset - b.position.start.offset);
  for (const k of Object.keys(cache)) if (Array.isArray(cache[k]) && !cache[k].length) delete cache[k];
  if (!Object.keys(cache.blocks).length) delete cache.blocks;
  return cache;
}

function makeLink(inner, original, key) {
  const bar = inner.indexOf('|');
  const link = (bar < 0 ? inner : inner.slice(0, bar)).trim();
  const out = { link, original };
  if (bar > -1) out.displayText = inner.slice(bar + 1);
  else out.displayText = link;
  if (key) out.key = key;
  return out;
}

function scanInline(masked, ln, offs, cache) {
  let m;
  WIKILINK_RE.lastIndex = 0;
  while ((m = WIKILINK_RE.exec(masked))) {
    const l = makeLink(m[2], m[0]);
    l.position = span(offs, ln, m.index, ln, m.index + m[0].length);
    (m[1] ? cache.embeds : cache.links).push(l);
  }
  MDLINK_RE.lastIndex = 0;
  while ((m = MDLINK_RE.exec(masked))) {
    let url = m[3];
    if (url[0] === '<') url = url.slice(1, -1);
    if (EXTERNAL.test(url) || url.startsWith('#') && !url.slice(1)) continue;
    let decoded = url;
    try { decoded = decodeURI(url); } catch (e) { /* leave as written */ }
    const l = { link: decoded, original: m[0], displayText: m[2], position: span(offs, ln, m.index, ln, m.index + m[0].length) };
    (m[1] ? cache.embeds : cache.links).push(l);
  }
  /* Tags: not inside links or URLs. */
  const noLinks = masked.replace(WIKILINK_RE, s => ' '.repeat(s.length)).replace(MDLINK_RE, s => ' '.repeat(s.length))
    .replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, s => ' '.repeat(s.length));
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(noLinks))) {
    const start = m.index + m[1].length;
    cache.tags.push({ tag: '#' + m[2], position: span(offs, ln, start, ln, start + 1 + m[2].length) });
  }
  const fre = /\[\^([^\]\s]+)\](?!:)/g;
  while ((m = fre.exec(masked))) cache.footnoteRefs.push({ id: m[1], position: span(offs, ln, m.index, ln, m.index + m[0].length) });
}

/* --- sections for embeds and links to headings or blocks ---------------- */

export function stripHeading(s) {
  return String(s).replace(/[\[\]#|^:\\]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

/* The part of a note that "#Heading", "#Heading#Sub" or "#^block" points
   at, as { start, end } offsets, or null when it isn't there. */
export function resolveSubpath(cache, subpath, text) {
  if (!subpath || !cache) return null;
  const parts = subpath.split('#').filter(Boolean);
  if (!parts.length) return null;
  if (parts[0].startsWith('^')) {
    const b = cache.blocks && cache.blocks[parts[0].slice(1).toLowerCase()];
    if (!b) return null;
    let end = b.position.end.offset;
    /* A list item's block takes its nested items with it. */
    const item = cache.listItems && cache.listItems.find(i => i.position.start.line === b.position.start.line);
    if (item) {
      const lines = cache.listItems.filter(i => isDescendant(cache.listItems, i, item.position.start.line));
      if (lines.length) end = Math.max(end, ...lines.map(i => i.position.end.offset));
    }
    return { type: 'block', block: b, start: b.position.start.offset, end };
  }
  const heads = cache.headings || [];
  let from = 0, found = null;
  for (const want of parts) {
    const w = stripHeading(want);
    found = null;
    for (let i = from; i < heads.length; i++) {
      if (stripHeading(heads[i].heading) === w) { found = i; break; }
    }
    if (found == null) return null;
    from = found + 1;
  }
  const h = heads[found];
  let end = text != null ? text.length : Infinity;
  for (let i = found + 1; i < heads.length; i++) if (heads[i].level <= h.level) { end = heads[i].position.start.offset; break; }
  return { type: 'heading', heading: h, start: h.position.start.offset, end };
}

function isDescendant(items, item, ancestorLine) {
  let p = item.parent;
  while (p >= 0) {
    if (p === ancestorLine) return true;
    const parent = items.find(i => i.position.start.line === p);
    if (!parent) return false;
    p = parent.parent;
  }
  return false;
}

/* All tags of a note, frontmatter ones included, each with its "#". */
export function getAllTags(cache) {
  if (!cache) return [];
  const out = (cache.frontmatterTags || []).slice();
  (cache.tags || []).forEach(t => out.push(t.tag));
  return out;
}

export function getAliases(cache) {
  const fm = cache && cache.frontmatter;
  if (!fm) return [];
  return listValue(fm.aliases ?? fm.alias, false);
}
