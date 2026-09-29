/* How Enter, Shift+Enter, Tab, Shift+Tab and Backspace behave around
   lists, tasks, quotes and callouts, as in Obsidian: Enter continues the
   item (a new unchecked task, the next number), Enter on an empty item
   outdents it or ends the list, Tab and Shift+Tab move an item and its
   children a level in or out, Backspace right after a marker removes it,
   and ordered lists renumber themselves. */

import {
  EditorSelection, Annotation, EditorState, Prec, keymap, indentUnit, indentMore, indentLess
} from '../../../assets/vendor/codemirror/codemirror.js';
import { parsePrefix, indentWidth, isBlank, nextMarker, blockContext } from './text.js';

/* Marks a transaction whose ordered lists should be renumbered. The value
   may list lines (1-based, in the new document) that were just indented
   and should restart numbering at 1 when they open a sublist. */
export const renumber = Annotation.define();

const tabSize = state => state.facet(EditorState.tabSize);

/* --- Enter -------------------------------------------------------------------- */

function plainNewline(state, range) {
  const line = state.doc.lineAt(range.from);
  const ws = /^[ \t]*/.exec(line.text)[0].slice(0, range.from - line.from);
  const insert = '\n' + ws;
  return { changes: { from: range.from, to: range.to, insert }, range: EditorSelection.cursor(range.from + insert.length) };
}

function outdentOnce(indent, state) {
  if (!indent) return indent;
  if (indent[0] === '\t') return indent.slice(1);
  const unit = Math.max(1, indentWidth(state.facet(indentUnit), tabSize(state)));
  let n = 0;
  while (n < unit && indent[n] === ' ') n++;
  return indent.slice(n || 1);
}

function dropQuoteLevel(quote) {
  const rest = quote.replace(/[ \t]*>[ \t]?$/, '');
  return rest ? rest.replace(/[ \t]*$/, '') + ' ' : '';
}

export function continueMarkup(view) {
  const { state } = view;
  if (state.readOnly) return false;
  let handled = false;
  const spec = state.changeByRange(range => {
    const line = state.doc.lineAt(range.from);
    if (state.doc.lineAt(range.to).number !== line.number) return plainNewline(state, range);
    const p = parsePrefix(line.text);
    const col = range.from - line.from;
    if ((!p.isList && !p.quote) || col < p.prefixEnd) return plainNewline(state, range);
    if (blockContext(state.doc, line.number)) return plainNewline(state, range);
    handled = true;
    const content = line.text.slice(p.prefixEnd);
    if (isBlank(content)) {
      let next;
      if (p.isList && indentWidth(p.indent, tabSize(state)) > 0) {
        next = p.quote + outdentOnce(p.indent, state) + p.marker + p.space + (p.task !== null ? '[ ] ' : '');
      } else if (p.isList) {
        next = p.quote;
      } else {
        next = dropQuoteLevel(p.quote);
      }
      return { changes: { from: line.from, to: line.to, insert: next }, range: EditorSelection.cursor(line.from + next.length) };
    }
    let prefix = p.quote + p.indent;
    if (p.isList) prefix += nextMarker(p) + p.space + (p.task !== null ? '[ ] ' : '');
    else if (!/[ \t]$/.test(prefix)) prefix += ' ';
    /* Spaces before the cursor stay on the old line only if there's text. */
    const insert = '\n' + prefix;
    return { changes: { from: range.from, to: range.to, insert }, range: EditorSelection.cursor(range.from + insert.length) };
  });
  if (!handled) return false;
  view.dispatch(state.update(spec, { scrollIntoView: true, userEvent: 'input', annotations: renumber.of(true) }));
  return true;
}

/* Shift+Enter: a line break inside the item, lined up with its text. */
export function softBreak(view) {
  const { state } = view;
  const spec = state.changeByRange(range => {
    const line = state.doc.lineAt(range.from);
    const p = parsePrefix(line.text);
    let pad = '';
    if (p.isList) pad = p.quote + p.indent + ' '.repeat(p.marker.length + p.space.length);
    else if (p.quote) pad = p.quote;
    const insert = '\n' + pad;
    return { changes: { from: range.from, to: range.to, insert }, range: EditorSelection.cursor(range.from + insert.length) };
  });
  view.dispatch(state.update(spec, { scrollIntoView: true, userEvent: 'input' }));
  return true;
}

/* --- Tab and Shift+Tab ------------------------------------------------------------ */

/* The lines of a list item and everything nested under it (1-based). */
export function itemSubtree(doc, lineNo, ts = 4) {
  const p = parsePrefix(doc.line(lineNo).text);
  const base = indentWidth(p.indent, ts);
  let end = lineNo;
  for (let n = lineNo + 1; n <= doc.lines; n++) {
    const t = doc.line(n).text;
    if (isBlank(t)) continue;
    const q = parsePrefix(t);
    if (q.quote !== p.quote) break;
    if (indentWidth(q.isList ? q.indent : /^[ \t]*/.exec(t.slice(q.quote.length))[0], ts) <= base) break;
    end = n;
  }
  return [lineNo, end];
}

/* Lines touched by the selection that start list items, with their
   subtrees, or null when the cursor isn't in a list. */
function listLines(state) {
  const doc = state.doc;
  const lines = new Set();
  let sawList = false;
  for (const r of state.selection.ranges) {
    const a = doc.lineAt(r.from).number;
    let b = doc.lineAt(r.to).number;
    if (b > a && r.to === doc.line(b).from) b--;
    for (let n = a; n <= b; n++) {
      const t = doc.line(n).text;
      const p = parsePrefix(t);
      if (p.isList) {
        sawList = true;
        const [s, e] = itemSubtree(doc, n, tabSize(state));
        for (let k = s; k <= e; k++) lines.add(k);
      } else if (!isBlank(t) && n === a && a === b) return null;
      else if (!isBlank(t)) lines.add(n);
    }
  }
  return sawList ? Array.from(lines).sort((x, y) => x - y) : null;
}

export function indentListItems(view, dir, force) {
  const { state } = view;
  const lines = listLines(state);
  if (!lines) return false;
  if (!force && lines.length && blockContext(state.doc, lines[0])) return false;
  const unit = state.facet(indentUnit);
  const changes = [];
  const moved = [];
  for (const n of lines) {
    const line = state.doc.line(n);
    const p = parsePrefix(line.text);
    const at = line.from + p.quote.length;
    const ws = p.isList ? p.indent : /^[ \t]*/.exec(line.text.slice(p.quote.length))[0];
    if (dir > 0) {
      changes.push({ from: at, insert: unit });
    } else {
      const next = outdentOnce(ws, state);
      if (next.length === ws.length) {
        if (p.isList && n === lines[0]) return true;   /* already at the left edge */
        continue;
      }
      changes.push({ from: at, to: at + ws.length - next.length });
    }
    if (p.isList && p.number !== null) moved.push(n);
  }
  if (!changes.length) return true;
  view.dispatch(state.update({ changes, userEvent: dir > 0 ? 'input.indent' : 'delete.dedent', annotations: renumber.of(dir > 0 ? { restart: moved } : true) }));
  return true;
}

function insertIndent(view) {
  const { state } = view;
  if (state.selection.ranges.some(r => !r.empty)) return indentMore(view);
  /* YAML doesn't allow tabs. */
  const yaml = (blockContext(state.doc, state.doc.lineAt(state.selection.main.head).number) || '').startsWith('yaml');
  const unit = yaml ? '  ' : state.facet(indentUnit);
  const spec = state.changeByRange(range => {
    let insert = unit;
    if (unit !== '\t') {
      const line = state.doc.lineAt(range.from);
      const col = indentWidth(line.text.slice(0, range.from - line.from).replace(/[^\t]/g, ' '), tabSize(state));
      const w = unit.length;
      insert = ' '.repeat(w - (col % w));
    }
    return { changes: { from: range.from, to: range.to, insert }, range: EditorSelection.cursor(range.from + insert.length) };
  });
  view.dispatch(state.update(spec, { scrollIntoView: true, userEvent: 'input' }));
  return true;
}

/* --- Backspace ------------------------------------------------------------------------ */

export function deleteMarkup(view) {
  const { state } = view;
  const ranges = state.selection.ranges;
  if (ranges.some(r => !r.empty)) return false;
  const plans = [];
  for (const r of ranges) {
    const line = state.doc.lineAt(r.from);
    const col = r.from - line.from;
    const p = parsePrefix(line.text);
    if (!(p.isList || p.quote) || col !== p.prefixEnd || col === 0) return false;
    if (/[^ \t>]/.test(line.text.slice(0, p.quote.length))) return false;
    if (blockContext(state.doc, line.number)) return false;
    if (p.task !== null) plans.push({ from: line.from + p.taskStart, to: line.from + p.prefixEnd });
    else if (p.isList) plans.push({ from: line.from + p.markerStart, to: line.from + p.prefixEnd });
    else {
      const next = dropQuoteLevel(p.quote);
      plans.push({ from: line.from + next.length, to: line.from + p.quote.length });
    }
  }
  const spec = state.changeByRange(range => {
    const plan = plans.find(pl => pl.to === range.from);
    return { changes: plan, range: EditorSelection.cursor(plan.from) };
  });
  view.dispatch(state.update(spec, { scrollIntoView: true, userEvent: 'delete.backward', annotations: renumber.of(true) }));
  return true;
}

/* --- renumbering ordered lists -------------------------------------------------------- */

/* Changes that renumber the ordered lists around `lineNos` in `doc` (1-based
   line numbers). Runs of siblings count up from their first item;
   `restart` lines that open a sublist become 1. */
export function renumberChanges(doc, lineNos, ts, restart = []) {
  const changes = [];
  const done = new Set();
  /* List items and the indented lines that continue them. */
  const isItemish = t => { const p = parsePrefix(t); return p.isList || /^[ \t]+\S/.test(t.slice(p.quote.length)); };
  for (const n0 of lineNos) {
    if (n0 < 1 || n0 > doc.lines || done.has(n0)) continue;
    const t0 = doc.line(n0).text;
    if (!parsePrefix(t0).isList && isBlank(t0)) continue;
    /* The extent of the list around the line. */
    let a = n0, b = n0;
    while (a > 1) {
      const t = doc.line(a - 1).text;
      if (isBlank(t)) { if (a - 2 >= 1 && parsePrefix(doc.line(a - 2).text).isList) { a--; continue; } break; }
      if (!isItemish(t)) break;
      a--;
    }
    while (b < doc.lines) {
      const t = doc.line(b + 1).text;
      if (isBlank(t)) { if (b + 2 <= doc.lines && isItemish(doc.line(b + 2).text)) { b++; continue; } break; }
      if (!isItemish(t)) break;
      b++;
    }
    const stack = [];
    for (let n = a; n <= b; n++) {
      done.add(n);
      const line = doc.line(n);
      const p = parsePrefix(line.text);
      if (!p.isList) continue;
      const w = indentWidth(p.indent, ts) + p.quote.length * 100;
      while (stack.length && stack[stack.length - 1].w > w) stack.pop();
      const top = stack[stack.length - 1];
      if (top && top.w === w) {
        if (p.number !== null && top.last !== null && top.delim === p.delim) {
          const want = top.last + 1;
          if (p.number !== want) {
            const from = line.from + p.markerStart;
            changes.push({ from, to: from + String(p.number).length, insert: String(want) });
          }
          top.last = want;
        } else {
          top.last = p.number;
          top.delim = p.delim;
        }
      } else {
        let first = p.number;
        if (p.number !== null && stack.length && restart.includes(n) && p.number !== 1) {
          const from = line.from + p.markerStart;
          changes.push({ from, to: from + String(p.number).length, insert: '1' });
          first = 1;
        }
        stack.push({ w, last: first, delim: p.delim });
      }
    }
  }
  return changes;
}

const renumberFilter = EditorState.transactionFilter.of(tr => {
  if (!tr.docChanged) return tr;
  const ann = tr.annotation(renumber);
  if (!ann && !tr.isUserEvent('delete') && !tr.isUserEvent('move') && !tr.isUserEvent('input.paste') && !tr.isUserEvent('input.drop')) return tr;
  const doc = tr.newDoc;
  const lines = new Set();
  tr.changes.iterChangedRanges((fA, tA, fB, tB) => {
    const a = doc.lineAt(Math.min(fB, doc.length)).number, b = doc.lineAt(Math.min(tB, doc.length)).number;
    for (let n = Math.max(1, a - 1); n <= Math.min(doc.lines, b + 1); n++) lines.add(n);
  });
  if (!lines.size || lines.size > 2000) return tr;
  /* Quick exit when no ordered list is anywhere near. */
  let any = false;
  for (const n of lines) if (/^(?:[ \t]*>?)*[ \t]*\d{1,9}[.)][ \t]/.test(doc.line(n).text)) { any = true; break; }
  if (!any) return tr;
  const restart = ann && ann.restart ? ann.restart.map(n => {
    const pos = tr.changes.mapPos(tr.startState.doc.line(n).from, 1);
    return doc.lineAt(pos).number;
  }) : [];
  const changes = renumberChanges(doc, Array.from(lines).sort((x, y) => x - y), tr.startState.facet(EditorState.tabSize), restart);
  if (!changes.length) return tr;
  return [tr, { changes, sequential: true }];
});

/* The keys, given a function returning the editor options
   ({ smartIndentList }). */
export function listKeymap(options) {
  const tab = dir => view => {
    if (options().smartIndentList && indentListItems(view, dir)) return true;
    return dir > 0 ? insertIndent(view) : indentLess(view);
  };
  /* Ahead of the Markdown language's own Enter and Backspace, which differ
     from Obsidian's. Tab stays lower so live-preview tables can take it. */
  return [
    renumberFilter,
    Prec.highest(keymap.of([
      { key: 'Enter', run: continueMarkup, shift: softBreak },
      { key: 'Backspace', run: deleteMarkup }
    ])),
    Prec.high(keymap.of([{ key: 'Tab', run: tab(1), shift: tab(-1) }]))
  ];
}
