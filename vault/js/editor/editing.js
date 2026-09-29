/* The editing operations behind the editor commands: toggling inline
   formatting, headings, quotes, lists and tasks, and inserting links,
   callouts, code and maths blocks, tables, rules and footnotes. Each takes
   the CodeMirror EditorView and works on every selection, as Obsidian's
   commands do. */

import { EditorSelection } from '../../../assets/vendor/codemirror/codemirror.js';
import { parsePrefix, enclosingPair, stripFormatting, blockContext, isBlank, linkAt } from './text.js';
import { renumber } from './lists.js';

const run = (view, spec, extra = {}) => view.dispatch(view.state.update(spec, Object.assign({ userEvent: 'input', scrollIntoView: true }, extra)));

/* Does a run of the marker character at the start (or end) of `text` stand
   for exactly this marker? ("**" is bold, not two italics.) */
function runMatches(text, marker, atEnd) {
  const ch = marker[0];
  if (!marker.split('').every(c => c === ch)) return atEnd ? text.endsWith(marker) : text.startsWith(marker);
  let n = 0;
  if (atEnd) { while (n < text.length && text[text.length - 1 - n] === ch) n++; }
  else { while (n < text.length && text[n] === ch) n++; }
  return n === marker.length || (n === 3 && marker.length < 3 && (ch === '*' || ch === '_'));
}

function wrapRange(state, range, marker) {
  const len = marker.length;
  const { from, to } = range;
  const text = state.sliceDoc(from, to);
  if (text.length >= 2 * len && runMatches(text, marker, false) && runMatches(text, marker, true)) {
    return { changes: [{ from, to: from + len }, { from: to - len, to }], range: EditorSelection.range(from, to - 2 * len) };
  }
  const before = state.sliceDoc(Math.max(0, from - 3), from), after = state.sliceDoc(to, to + 3);
  if (runMatches(before, marker, true) && runMatches(after, marker, false)) {
    return { changes: [{ from: from - len, to: from }, { from: to, to: to + len }], range: EditorSelection.range(from - len, to - len) };
  }
  const lead = /^\s*/.exec(text)[0].length, trail = /\s*$/.exec(text)[0].length;
  if (lead >= text.length) return { changes: { from, insert: marker + marker }, range: EditorSelection.cursor(from + len) };
  const a = from + lead, b = to - trail;
  return { changes: [{ from: a, insert: marker }, { from: b, insert: marker }], range: EditorSelection.range(a + len, b + len) };
}

/* Bold, italics, strikethrough, highlight, code, maths, comment. With
   nothing selected: remove the formatting around the cursor, or format the
   word under it, or insert an empty pair to type into. */
export function toggleMarker(view, marker) {
  const { state } = view;
  const len = marker.length;
  const spec = state.changeByRange(range => {
    const line = state.doc.lineAt(range.from);
    if (range.empty) {
      const col = range.from - line.from;
      const pair = enclosingPair(line.text, col, marker);
      if (pair) {
        const from = line.from + pair[0], close = line.from + pair[1];
        let pos = range.from;
        if (pos > from) pos -= Math.min(len, pos - from);
        if (range.from > close) pos -= Math.min(len, range.from - close);
        return { changes: [{ from, to: from + len }, { from: close, to: close + len }], range: EditorSelection.cursor(pos) };
      }
      const word = state.wordAt(range.from);
      if (word && word.from < range.from && word.to > range.from) {
        return { changes: [{ from: word.from, insert: marker }, { from: word.to, insert: marker }], range: EditorSelection.cursor(range.from + len) };
      }
      return { changes: { from: range.from, insert: marker + marker }, range: EditorSelection.cursor(range.from + len) };
    }
    const endLine = state.doc.lineAt(range.to);
    if (endLine.number === line.number) {
      const r = wrapRange(state, range, marker);
      if (range.head < range.anchor) r.range = EditorSelection.range(r.range.to, r.range.from);
      return r;
    }
    /* Several lines: format each line's text, leaving list and quote
       markers outside. */
    const segs = [];
    for (let n = line.number; n <= endLine.number; n++) {
      const l = state.doc.line(n);
      const p = parsePrefix(l.text);
      const a = Math.max(range.from, l.from + p.prefixEnd), b = Math.min(range.to, l.to);
      const t = state.sliceDoc(a, b);
      if (b <= a || isBlank(t)) continue;
      const lead = /^\s*/.exec(t)[0].length, trail = /\s*$/.exec(t)[0].length;
      segs.push({ from: a + lead, to: b - trail });
    }
    const allWrapped = segs.length && segs.every(s => {
      const t = state.sliceDoc(s.from, s.to);
      return t.length >= 2 * len && runMatches(t, marker, false) && runMatches(t, marker, true);
    });
    const changes = [];
    for (const s of segs) {
      if (allWrapped) changes.push({ from: s.from, to: s.from + len }, { from: s.to - len, to: s.to });
      else changes.push({ from: s.from, insert: marker }, { from: s.to, insert: marker });
    }
    const set = state.changes(changes);
    return { changes: set, range: EditorSelection.range(set.mapPos(range.anchor, range.anchor <= range.head ? -1 : 1), set.mapPos(range.head, range.head < range.anchor ? -1 : 1)) };
  });
  run(view, spec);
  return true;
}

/* Comment syntax by code block language (the language's own parser may
   not have loaded yet, so it isn't asked). */
const HASH = 'python py ruby rb sh bash shell zsh fish yaml yml r perl pl toml ini conf dockerfile makefile powershell ps1 coffee elixir ex julia nim tcl nix graphql gql'.split(' ');
const DASHES = 'sql lua haskell hs elm ada vhdl applescript'.split(' ');
const PERCENT = 'latex tex matlab erlang erl prolog'.split(' ');
const SEMI = 'lisp clojure clj scheme scm asm nasm autohotkey ahk'.split(' ');
function commentTokens(lang) {
  lang = (lang || '').toLowerCase();
  if (HASH.includes(lang)) return { line: '#' };
  if (DASHES.includes(lang)) return { line: '--' };
  if (PERCENT.includes(lang)) return { line: '%' };
  if (SEMI.includes(lang)) return { line: ';' };
  if (['html', 'xml', 'svg', 'md', 'markdown', 'vue', 'svelte'].includes(lang)) return { open: '<!--', close: '-->' };
  if (['css', 'scss', 'less'].includes(lang)) return { open: '/*', close: '*/' };
  return { line: '//' };
}

function toggleCodeComment(view) {
  const { state } = view;
  const lines = selectedLines(state);
  let lang = '';
  for (let n = lines[0] - 1; n >= 1; n--) {
    const m = /^[ \t]*(?:>[ \t]?)*[ \t]*(?:`{3,}|~{3,})[ \t]*([\w+#.-]*)/.exec(state.doc.line(n).text);
    if (m) { lang = m[1]; break; }
  }
  const tok = commentTokens(lang);
  const changes = [];
  if (tok.line) {
    const texts = lines.map(n => state.doc.line(n));
    const nonBlank = texts.filter(l => !isBlank(l.text));
    const commented = nonBlank.length && nonBlank.every(l => l.text.trimStart().startsWith(tok.line));
    const col = Math.min(...nonBlank.map(l => /^[ \t]*/.exec(l.text)[0].length));
    for (const l of nonBlank) {
      const ws = /^[ \t]*/.exec(l.text)[0].length;
      if (commented) {
        const len = tok.line.length + (l.text[ws + tok.line.length] === ' ' ? 1 : 0);
        changes.push({ from: l.from + ws, to: l.from + ws + len });
      } else changes.push({ from: l.from + col, insert: tok.line + ' ' });
    }
  } else {
    for (const n of lines) {
      const l = state.doc.line(n);
      const t = l.text.trim();
      if (!t) continue;
      const ws = /^[ \t]*/.exec(l.text)[0].length;
      if (t.startsWith(tok.open) && t.endsWith(tok.close)) {
        const inner = t.slice(tok.open.length, t.length - tok.close.length).trim();
        changes.push({ from: l.from + ws, to: l.to, insert: inner });
      } else changes.push({ from: l.from + ws, to: l.to, insert: tok.open + ' ' + l.text.slice(ws) + ' ' + tok.close });
    }
  }
  return applyLineChanges(view, changes);
}

export function toggleCommentCmd(view) {
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  if (blockContext(view.state.doc, line.number) === 'code') return toggleCodeComment(view);
  return toggleMarker(view, '%%');
}

export function clearFormatting(view) {
  const { state } = view;
  const spec = state.changeByRange(range => {
    let { from, to } = range;
    if (range.empty) {
      const line = state.doc.lineAt(from);
      from = line.from + parsePrefix(line.text).prefixEnd;
      to = line.to;
    }
    const text = state.sliceDoc(from, to);
    const clean = stripFormatting(text);
    if (clean === text) return { range };
    return { changes: { from, to, insert: clean }, range: range.empty ? EditorSelection.cursor(Math.min(range.head, from + clean.length)) : EditorSelection.range(from, from + clean.length) };
  });
  run(view, spec);
  return true;
}

/* --- line operations ------------------------------------------------------------------ */

/* The distinct lines the selection touches (1-based). */
export function selectedLines(state) {
  const set = new Set();
  for (const r of state.selection.ranges) {
    const a = state.doc.lineAt(r.from).number;
    let b = state.doc.lineAt(r.to).number;
    if (b > a && r.to === state.doc.line(b).from) b--;
    for (let n = a; n <= b; n++) set.add(n);
  }
  return Array.from(set).sort((x, y) => x - y);
}

function applyLineChanges(view, changes, annotate) {
  if (!changes.length) return true;
  const set = view.state.changes(changes);
  view.dispatch({ changes: set, selection: view.state.selection.map(set, 1), userEvent: 'input', scrollIntoView: true, annotations: annotate ? renumber.of(true) : undefined });
  return true;
}

export function setHeading(view, level) {
  const { state } = view;
  const lines = selectedLines(state);
  const current = n => { const m = /^((?:[ \t]{0,3}>[ \t]?)*)( {0,3})(#{1,6})(?:[ \t]+|$)/.exec(state.doc.line(n).text); return m ? m[3].length : 0; };
  const toggleOff = level > 0 && lines.every(n => current(n) === level);
  const changes = [];
  for (const n of lines) {
    const line = state.doc.line(n);
    const q = /^(?:[ \t]{0,3}>[ \t]?)*/.exec(line.text)[0];
    const m = /^( {0,3})(#{1,6})(?:[ \t]+|$)/.exec(line.text.slice(q.length));
    const want = toggleOff || !level ? '' : '#'.repeat(level) + ' ';
    const from = line.from + q.length;
    if (m) changes.push({ from, to: from + m[0].length, insert: want });
    else if (want) {
      /* A list marker gives way to the heading. */
      const p = parsePrefix(line.text);
      changes.push({ from, to: p.isList ? line.from + p.prefixEnd : from, insert: want });
    }
  }
  return applyLineChanges(view, changes);
}

export function toggleBlockquote(view) {
  const { state } = view;
  const lines = selectedLines(state);
  const quoted = lines.filter(n => !isBlank(state.doc.line(n).text)).every(n => /^[ \t]{0,3}>/.test(state.doc.line(n).text));
  const changes = [];
  for (const n of lines) {
    const line = state.doc.line(n);
    if (quoted) {
      const m = /^[ \t]{0,3}>[ \t]?/.exec(line.text);
      if (m) changes.push({ from: line.from, to: line.from + m[0].length });
    } else changes.push({ from: line.from, insert: isBlank(line.text) ? '>' : '> ' });
  }
  return applyLineChanges(view, changes);
}

export function toggleBulletList(view) {
  const { state } = view;
  const lines = selectedLines(state).filter(n => !isBlank(state.doc.line(n).text) || selectedLines(state).length === 1);
  const all = lines.every(n => { const p = parsePrefix(state.doc.line(n).text); return p.isList && p.number === null && p.task === null; });
  const changes = [];
  for (const n of lines) {
    const line = state.doc.line(n);
    const p = parsePrefix(line.text);
    if (all) changes.push({ from: line.from + p.markerStart, to: line.from + p.prefixEnd });
    else if (p.isList) changes.push({ from: line.from + p.markerStart, to: line.from + p.prefixEnd, insert: '- ' });
    else changes.push({ from: line.from + p.quote.length + p.indent.length, insert: '- ' });
  }
  return applyLineChanges(view, changes, true);
}

export function toggleNumberedList(view) {
  const { state } = view;
  const lines = selectedLines(state).filter(n => !isBlank(state.doc.line(n).text) || selectedLines(state).length === 1);
  const all = lines.every(n => parsePrefix(state.doc.line(n).text).number !== null);
  const changes = [];
  let k = 1;
  /* Carry on from a numbered item just above. */
  if (!all && lines.length && lines[0] > 1) {
    const above = parsePrefix(state.doc.line(lines[0] - 1).text);
    if (above.number !== null) k = above.number + 1;
  }
  for (const n of lines) {
    const line = state.doc.line(n);
    const p = parsePrefix(line.text);
    if (all) changes.push({ from: line.from + p.markerStart, to: line.from + p.prefixEnd });
    else if (p.isList) changes.push({ from: line.from + p.markerStart, to: line.from + p.prefixEnd, insert: (k++) + '. ' });
    else changes.push({ from: line.from + p.quote.length + p.indent.length, insert: (k++) + '. ' });
  }
  return applyLineChanges(view, changes, true);
}

/* Mod+L: plain text becomes a task, a list item gains a checkbox, and a
   task is ticked or unticked. */
export function toggleChecklist(view) {
  const { state } = view;
  const changes = [];
  for (const n of selectedLines(state)) {
    const line = state.doc.line(n);
    const p = parsePrefix(line.text);
    if (p.task !== null) {
      const at = line.from + p.taskStart + 1;
      changes.push({ from: at, to: at + 1, insert: p.task === ' ' ? 'x' : ' ' });
    } else if (p.isList) changes.push({ from: line.from + p.prefixEnd, insert: '[ ] ' });
    else changes.push({ from: line.from + p.quote.length + p.indent.length, insert: '- [ ] ' });
  }
  return applyLineChanges(view, changes);
}

/* Cycle bullet/checkbox: text, then a bullet, then a task, then text again. */
export function cycleListChecklist(view) {
  const { state } = view;
  const changes = [];
  for (const n of selectedLines(state)) {
    const line = state.doc.line(n);
    const p = parsePrefix(line.text);
    if (p.task !== null) changes.push({ from: line.from + p.markerStart, to: line.from + p.prefixEnd });
    else if (p.isList) changes.push({ from: line.from + p.prefixEnd, insert: '[ ] ' });
    else changes.push({ from: line.from + p.quote.length + p.indent.length, insert: '- ' });
  }
  return applyLineChanges(view, changes, true);
}

/* Tick or untick the task on the cursor's line, if it has one. */
export function toggleTaskAtCursor(view, checking) {
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  const p = parsePrefix(line.text);
  if (p.task === null) return false;
  if (!checking) {
    const at = line.from + p.taskStart + 1;
    view.dispatch({ changes: { from: at, to: at + 1, insert: p.task === ' ' ? 'x' : ' ' }, userEvent: 'input' });
  }
  return true;
}

/* --- inserting ------------------------------------------------------------------------ */

const URLISH = /^(?:[a-z][a-z0-9+.-]*:\/\/|mailto:|obsidian:)\S+$/i;

export function insertMarkdownLink(view) {
  const { state } = view;
  const spec = state.changeByRange(range => {
    const text = state.sliceDoc(range.from, range.to);
    if (!text) return { changes: { from: range.from, insert: '[]()' }, range: EditorSelection.cursor(range.from + 1) };
    if (URLISH.test(text.trim())) return { changes: { from: range.from, to: range.to, insert: '[](' + text.trim() + ')' }, range: EditorSelection.cursor(range.from + 1) };
    const insert = '[' + text + ']()';
    return { changes: { from: range.from, to: range.to, insert }, range: EditorSelection.cursor(range.from + insert.length - 1) };
  });
  run(view, spec);
  return true;
}

export function insertWikilink(view, embed) {
  const { state } = view;
  const open = (embed ? '!' : '') + '[[';
  const spec = state.changeByRange(range => {
    const text = state.sliceDoc(range.from, range.to);
    return { changes: { from: range.from, to: range.to, insert: open + text + ']]' }, range: EditorSelection.cursor(range.from + open.length + text.length) };
  });
  run(view, spec, { userEvent: 'input.type' });
  return true;
}

/* Put a block of lines at the cursor: on its own lines, wrapping any
   selected text. `make(text)` returns { text, cursor } with cursor an
   offset into text. */
function insertBlock(view, make) {
  const { state } = view;
  const r = state.selection.main;
  const first = state.doc.lineAt(r.from), last = state.doc.lineAt(r.to);
  let from, to, inner;
  if (!r.empty) { from = first.from; to = last.to; inner = state.sliceDoc(r.from, r.to); if (r.from > first.from) { from = r.from; } if (r.to < last.to) { to = r.to; } }
  else { from = to = r.from; inner = ''; }
  const out = make(inner);
  let text = out.text, cursor = out.cursor;
  /* Blocks start and end on lines of their own. */
  const before = state.sliceDoc(state.doc.lineAt(from).from, from);
  const after = state.sliceDoc(to, state.doc.lineAt(to).to);
  if (!isBlank(before)) { text = '\n' + text; cursor += 1; }
  if (!isBlank(after)) text += '\n';
  view.dispatch({ changes: { from, to, insert: text }, selection: EditorSelection.cursor(from + cursor), userEvent: 'input', scrollIntoView: true });
  return true;
}

export function insertCallout(view) {
  const { state } = view;
  const r = state.selection.main;
  if (r.empty) {
    const line = state.doc.lineAt(r.from);
    if (!isBlank(line.text)) {
      const text = '> [!note]\n> ' + line.text;
      view.dispatch({ changes: { from: line.from, to: line.to, insert: text }, selection: EditorSelection.cursor(line.from + text.length), userEvent: 'input', scrollIntoView: true });
      return true;
    }
  }
  return insertBlock(view, inner => {
    const body = inner ? inner.split('\n').map(l => '> ' + l).join('\n') : '> ';
    const text = '> [!note]\n' + body;
    return { text, cursor: text.length };
  });
}

export function insertCodeBlock(view) {
  return insertBlock(view, inner => ({ text: '```\n' + inner + '\n```', cursor: 3 }));
}

export function insertMathBlock(view) {
  return insertBlock(view, inner => ({ text: '$$\n' + inner + '\n$$', cursor: 3 + inner.length }));
}

export function insertTable(view) {
  return insertBlock(view, () => {
    const text = '|     |     |\n| --- | --- |\n|     |     |';
    return { text, cursor: 2 };
  });
}

export function insertHorizontalRule(view) {
  const { state } = view;
  const line = state.doc.lineAt(state.selection.main.head);
  if (isBlank(line.text)) {
    const text = '---\n';
    view.dispatch({ changes: { from: line.from, to: line.to, insert: text }, selection: EditorSelection.cursor(line.from + text.length), userEvent: 'input', scrollIntoView: true });
  } else {
    const text = '\n\n---\n';
    view.dispatch({ changes: { from: line.to, insert: text }, selection: EditorSelection.cursor(line.to + text.length), userEvent: 'input', scrollIntoView: true });
  }
  return true;
}

/* A numbered footnote at the cursor, with its definition at the end of the
   note, and the cursor moved there to write it. */
export function insertFootnote(view) {
  const { state } = view;
  const text = state.doc.toString();
  let max = 0;
  const re = /\[\^(\d+)\]/g;
  let m;
  while ((m = re.exec(text))) max = Math.max(max, +m[1]);
  const id = max + 1;
  const ref = '[^' + id + ']';
  const at = state.selection.main.to;
  const end = state.doc.length;
  /* Straight after other definitions, or after a blank line. */
  const lastLine = text.replace(/\s+$/, '').split('\n').pop();
  let sep;
  if (!text.trim()) sep = text.endsWith('\n') || !text ? '' : '\n';
  else if (/^\[\^[^\]]+\]:/.test(lastLine)) sep = text.endsWith('\n') ? '' : '\n';
  else sep = text.endsWith('\n\n') ? '' : text.endsWith('\n') ? '\n' : '\n\n';
  const defText = sep + ref + ': ';
  view.dispatch({
    changes: [{ from: at, insert: ref }, { from: end, insert: defText }],
    selection: EditorSelection.cursor(end + ref.length + defText.length),
    userEvent: 'input', scrollIntoView: true
  });
  return true;
}

/* --- links under the cursor ------------------------------------------------------------ */

export function linkUnderCursor(state, pos = state.selection.main.head) {
  const line = state.doc.lineAt(pos);
  const info = linkAt(line.text, pos - line.from);
  if (!info) return null;
  return Object.assign(info, { from: line.from + info.from, to: line.from + info.to });
}
