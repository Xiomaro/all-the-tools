/* Line-level Markdown helpers for the editor: list and quote prefixes,
   whether a line sits in code, maths or frontmatter, the link under a
   position, and paired formatting markers. They work on plain text so they
   agree with Obsidian (which reads lines, not a full parse) whatever
   syntax extension the editor is running. */

import { MDLINK_RE, TAG_RE, splitFrontmatter } from '../core/metadata.js';

const HR = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const QUOTE = /^(?:[ \t]{0,3}>[ \t]?)+/;
const MARKER = /^([ \t]*)([-*+]|(\d{1,9})([.)]))([ \t]+)/;
const TASK = /^\[(.)\](?:[ \t]+|$)/;
const FENCE = /^[ \t]*(?:>[ \t]?)*[ \t]*(`{3,}|~{3,})/;

/* The markup at the start of a line:
   { quote, indent, marker, number, delim, space, task, taskEnd, prefixEnd, isList }
   quote: "> > " etc; indent: whitespace before the marker; marker: "-", "*",
   "+" or "1." ; task: the character in [ ] or null; prefixEnd: offset where
   the content starts. */
export function parsePrefix(text) {
  const q = QUOTE.exec(text);
  const quote = q ? q[0] : '';
  const rest = text.slice(quote.length);
  const out = { quote, indent: '', marker: '', bullet: '', number: null, delim: '', space: '', task: null, isList: false, prefixEnd: quote.length };
  if (HR.test(rest)) return out;
  const m = MARKER.exec(rest);
  if (!m) {
    out.indent = /^[ \t]*/.exec(rest)[0];
    return out;
  }
  out.isList = true;
  out.indent = m[1];
  out.marker = m[2];
  out.bullet = m[3] ? '' : m[2];
  out.number = m[3] ? parseInt(m[3], 10) : null;
  out.delim = m[4] || '';
  out.space = m[5];
  let end = quote.length + m[0].length;
  const t = TASK.exec(text.slice(end));
  if (t) { out.task = t[1]; out.taskStart = end; end += t[0].length; if (!/[ \t]$/.test(t[0])) out.taskNoSpace = true; }
  out.markerStart = quote.length + m[1].length;
  out.prefixEnd = end;
  return out;
}

/* Columns of leading whitespace, tabs counting to the next tab stop. */
export function indentWidth(ws, tabSize = 4) {
  let n = 0;
  for (const ch of ws) n = ch === '\t' ? n + tabSize - (n % tabSize) : n + 1;
  return n;
}

export function isBlank(text) { return !/\S/.test(text); }

/* The next marker in a list: the same bullet, or the next number. */
export function nextMarker(p) {
  return p.number !== null ? (p.number + 1) + p.delim : p.marker;
}

/* --- where a line is: frontmatter, fenced code, maths ---------------------- */

/* Scans from the top of the document to `lineNo` (1-based) and says what
   block the line is in: 'yaml', 'code', 'math', or null. Linear, but only
   used on key presses and commands, not while scrolling. */
export function blockContext(doc, lineNo) {
  const first = doc.line(1).text;
  let start = 1;
  if (/^---[ \t]*$/.test(first)) {
    for (let i = 2; i <= doc.lines; i++) {
      if (/^(---|\.\.\.)[ \t]*$/.test(doc.line(i).text)) {
        if (lineNo <= i) return lineNo === 1 || lineNo === i ? 'yaml-fence' : 'yaml';
        start = i + 1;
        break;
      }
      if (i === doc.lines) start = 1;
    }
  }
  let fence = null, math = false;
  for (let i = start; i < lineNo; i++) {
    const text = doc.line(i).text;
    if (fence) {
      const m = FENCE.exec(text);
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length && !text.slice(text.indexOf(m[1]) + m[1].length).trim()) fence = null;
      continue;
    }
    if (math) { if (/\$\$\s*$/.test(text)) math = false; continue; }
    const m = FENCE.exec(text);
    if (m && !(m[1][0] === '`' && text.slice(text.indexOf(m[1]) + m[1].length).includes('`'))) { fence = m[1]; continue; }
    if (/^\s*\$\$/.test(text) && !/^\s*\$\$.+\$\$\s*$/.test(text)) math = true;
  }
  if (fence) return 'code';
  if (math) return 'math';
  return null;
}

/* The frontmatter block at the top of the doc: { from, to, endLine, valid }
   (to = end of the closing line), or null. */
const fmCache = new WeakMap();
export function frontmatterRange(doc) {
  if (fmCache.has(doc)) return fmCache.get(doc);
  let out = null;
  if (/^---[ \t]*$/.test(doc.line(1).text)) {
    for (let i = 2; i <= Math.min(doc.lines, 2000); i++) {
      const t = doc.line(i).text;
      if (/^(---|\.\.\.)[ \t]*$/.test(t)) {
        const to = doc.line(i).to;
        const fm = splitFrontmatter(doc.sliceString(0, Math.min(doc.length, to + 1)));
        out = { from: 0, to, endLine: i, valid: !!(fm && !fm.error), raw: doc.sliceString(0, to) };
        break;
      }
    }
  }
  fmCache.set(doc, out);
  return out;
}

/* Is `col` inside inline code or maths on this line (before it, an odd
   number of backticks or unescaped single dollars)? */
export function inInlineCode(lineText, col) {
  const before = lineText.slice(0, col);
  let i = 0;
  while (i < before.length) {
    if (before[i] === '\\') { i += 2; continue; }
    if (before[i] === '`') {
      let n = 1; while (before[i + n] === '`') n++;
      const close = lineText.indexOf('`'.repeat(n), i + n);
      if (close < 0) { i += n; continue; }
      if (close >= col) return true;
      i = close + n; continue;
    }
    i++;
  }
  return false;
}

/* --- links under the cursor --------------------------------------------------- */

const WIKI = /(!?)\[\[([^\[\]\n]+?)\]\]/g;
const URL_RE = /\b(?:https?|obsidian|file|mailto|ftp):(?:\/\/)?[^\s<>()\[\]"'`]+(?:\([^\s()]*\)[^\s<>()\[\]"'`]*)*/gi;
const FOOTREF = /\[\^([^\]\s]+)\]/g;

/* What is at column `col` of a line:
   { type: 'internal' | 'external' | 'tag' | 'footnote', link, from, to, embed, display }
   or null. `col` may sit on either bracket. */
export function linkAt(text, col) {
  let m;
  WIKI.lastIndex = 0;
  while ((m = WIKI.exec(text))) {
    if (col >= m.index && col <= m.index + m[0].length) {
      const inner = m[2];
      const bar = inner.indexOf('|');
      return { type: 'internal', link: (bar < 0 ? inner : inner.slice(0, bar)).trim(), display: bar < 0 ? null : inner.slice(bar + 1), from: m.index, to: m.index + m[0].length, embed: !!m[1] };
    }
  }
  const md = new RegExp(MDLINK_RE.source, 'g');
  while ((m = md.exec(text))) {
    if (col >= m.index && col <= m.index + m[0].length) {
      let url = m[3];
      if (url[0] === '<') url = url.slice(1, -1);
      const out = { from: m.index, to: m.index + m[0].length, embed: !!m[1], display: m[2] };
      if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return Object.assign(out, { type: 'external', link: url });
      let decoded = url;
      try { decoded = decodeURI(url); } catch (e) { /* keep it as written */ }
      return Object.assign(out, { type: 'internal', link: decoded });
    }
  }
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(text))) {
    let url = m[0].replace(/[.,;:!?]+$/, '');
    if (col >= m.index && col <= m.index + url.length) return { type: 'external', link: url, from: m.index, to: m.index + url.length };
  }
  FOOTREF.lastIndex = 0;
  while ((m = FOOTREF.exec(text))) {
    if (col >= m.index && col <= m.index + m[0].length && text[m.index + m[0].length] !== ':') return { type: 'footnote', link: m[1], from: m.index, to: m.index + m[0].length };
  }
  const tags = new RegExp(TAG_RE.source, 'gu');
  while ((m = tags.exec(text))) {
    const start = m.index + m[1].length;
    if (col >= start && col <= start + 1 + m[2].length) return { type: 'tag', link: '#' + m[2], from: start, to: start + 1 + m[2].length };
  }
  return null;
}

/* --- paired formatting markers ------------------------------------------------- */

/* Positions of `marker` pairs on a line as [[openStart, closeStart], ...].
   Runs of the marker's character count only when they're the marker's
   length, or three long for * and _ (bold and italic together). */
export function markerPairs(text, marker) {
  const ch = marker[0];
  const same = marker.split('').every(c => c === ch);
  const tokens = [];
  if (!same) {
    let i = text.indexOf(marker);
    while (i > -1) { tokens.push({ at: i }); i = text.indexOf(marker, i + marker.length); }
  } else {
    let i = 0;
    while (i < text.length) {
      if (text[i] === '\\') { i += 2; continue; }
      if (text[i] !== ch) { i++; continue; }
      let n = 1; while (text[i + n] === ch) n++;
      if (n === marker.length) tokens.push({ at: i, run: n, start: i });
      else if (n === 3 && marker.length < 3 && (ch === '*' || ch === '_')) tokens.push({ at: i, run: n, start: i, triple: true });
      i += n;
    }
  }
  const pairs = [];
  for (let k = 0; k + 1 < tokens.length; k += 2) {
    const open = tokens[k], close = tokens[k + 1];
    /* In a run of three, the closing marker is the tail of the run. */
    const closeAt = close.triple ? close.at + close.run - marker.length : close.at;
    pairs.push([open.at, closeAt]);
  }
  return pairs;
}

/* The pair enclosing column `col`, or null. */
export function enclosingPair(text, col, marker) {
  for (const [o, c] of markerPairs(text, marker)) {
    if (col >= o + marker.length && col <= c) return [o, c];
    if (col >= o && col <= c + marker.length && (col < o + marker.length || col > c)) return [o, c];
  }
  return null;
}

/* Remove Markdown formatting from a piece of text. */
export function stripFormatting(text) {
  let prev;
  do {
    prev = text;
    text = text
      .replace(/(\*\*|__|~~|==|%%)(?=\S)([\s\S]*?\S)\1/g, '$2')
      .replace(/(^|[^*\\])\*(?=\S)([^*]*?\S)\*/g, '$1$2')
      .replace(/(^|[^_\w\\])_(?=\S)([^_]*?\S)_/g, '$1$2')
      .replace(/(`+)([^`]+?)\1/g, '$2')
      .replace(/(^|[^$\\])\$(?=\S)([^$]*?\S)\$/g, '$1$2')
      .replace(/<\/?(?:u|b|i|em|strong|mark|s|del|sub|sup)>/gi, '');
  } while (text !== prev);
  return text;
}

/* A block id Obsidian would make: six lower-case letters and digits. */
export function randomBlockId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/* Heading text as it can appear after "#" in a link. */
export function headingForLink(heading) {
  return String(heading).replace(/[#|^\\:\[\]]+/g, ' ').replace(/\s+/g, ' ').trim();
}
