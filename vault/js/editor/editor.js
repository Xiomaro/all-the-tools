/* The Editor API a markdown view exposes as `view.editor`, shaped like
   Obsidian's Editor so plugins and commands read the same: positions are
   { line, ch } with zero-based lines, and `cm` is the CodeMirror
   EditorView underneath. */

import {
  EditorSelection, EditorView, undo, redo, cursorLineUp, cursorLineDown, cursorCharLeft, cursorCharRight,
  cursorDocStart, cursorDocEnd, cursorGroupLeft, cursorGroupRight, cursorLineBoundaryBackward, cursorLineBoundaryForward,
  indentMore, indentLess, insertNewlineAndIndent, moveLineUp, moveLineDown, deleteLine, selectAll, toggleFold, foldAll, unfoldAll
} from '../../../assets/vendor/codemirror/codemirror.js';

const EXEC = {
  goUp: cursorLineUp, goDown: cursorLineDown, goLeft: cursorCharLeft, goRight: cursorCharRight,
  goStart: cursorDocStart, goEnd: cursorDocEnd, goWordLeft: cursorGroupLeft, goWordRight: cursorGroupRight,
  goLineStart: cursorLineBoundaryBackward, goLineEnd: cursorLineBoundaryForward,
  indentMore, indentLess, newlineAndIndent: insertNewlineAndIndent, swapLineUp: moveLineUp, swapLineDown: moveLineDown,
  deleteLine, selectAll, toggleFold, foldAll, unfoldAll, undo, redo
};

export class Editor {
  constructor(view) { this.view = view; }

  get cm() { return this.view.cm; }
  get containerEl() { return this.view.sourceEl; }
  get state() { return this.cm.state; }
  get doc() { return this.cm.state.doc; }

  getDoc() { return this; }
  refresh() { this.cm.requestMeasure(); }

  /* --- positions --------------------------------------------------------------- */

  clampPos(pos) {
    const doc = this.doc;
    const line = Math.max(0, Math.min(doc.lines - 1, pos.line | 0));
    const l = doc.line(line + 1);
    return { line, ch: Math.max(0, Math.min(l.length, pos.ch | 0)) };
  }

  posToOffset(pos) {
    const p = this.clampPos(pos);
    return this.doc.line(p.line + 1).from + p.ch;
  }

  offsetToPos(offset) {
    const doc = this.doc;
    const o = Math.max(0, Math.min(doc.length, offset));
    const l = doc.lineAt(o);
    return { line: l.number - 1, ch: o - l.from };
  }

  /* --- text ----------------------------------------------------------------------- */

  getValue() { return this.view.getViewData(); }

  setValue(text) {
    text = String(text).replace(/\r\n?/g, '\n');
    this.cm.dispatch({ changes: { from: 0, to: this.doc.length, insert: text } });
  }

  getLine(n) { return n >= 0 && n < this.doc.lines ? this.doc.line(n + 1).text : ''; }

  setLine(n, text) {
    if (n < 0 || n >= this.doc.lines) return;
    const l = this.doc.line(n + 1);
    this.cm.dispatch({ changes: { from: l.from, to: l.to, insert: text } });
  }

  lineCount() { return this.doc.lines; }
  lastLine() { return this.doc.lines - 1; }

  getRange(from, to) {
    const a = this.posToOffset(from), b = this.posToOffset(to);
    return this.state.sliceDoc(Math.min(a, b), Math.max(a, b));
  }

  replaceRange(text, from, to, origin) {
    const a = this.posToOffset(from), b = to ? this.posToOffset(to) : a;
    this.cm.dispatch({ changes: { from: Math.min(a, b), to: Math.max(a, b), insert: text }, userEvent: origin || 'input', scrollIntoView: false });
  }

  /* --- selection ------------------------------------------------------------------- */

  getSelection() {
    const r = this.state.selection.main;
    return this.state.sliceDoc(r.from, r.to);
  }

  replaceSelection(text, origin) {
    this.cm.dispatch(this.state.replaceSelection(text), { userEvent: origin || 'input', scrollIntoView: true });
  }

  getCursor(which = 'head') {
    const r = this.state.selection.main;
    const off = which === 'anchor' ? r.anchor : which === 'from' ? r.from : which === 'to' ? r.to : r.head;
    return this.offsetToPos(off);
  }

  listSelections() {
    return this.state.selection.ranges.map(r => ({ anchor: this.offsetToPos(r.anchor), head: this.offsetToPos(r.head) }));
  }

  setCursor(pos, ch) {
    if (typeof pos === 'number') pos = { line: pos, ch: ch || 0 };
    const o = this.posToOffset(pos);
    this.cm.dispatch({ selection: EditorSelection.cursor(o), scrollIntoView: true });
  }

  setSelection(anchor, head) {
    const a = this.posToOffset(anchor), b = head ? this.posToOffset(head) : a;
    this.cm.dispatch({ selection: EditorSelection.range(a, b), scrollIntoView: true });
  }

  setSelections(ranges, main) {
    if (!ranges || !ranges.length) return;
    const sel = EditorSelection.create(ranges.map(r => EditorSelection.range(this.posToOffset(r.anchor), this.posToOffset(r.head || r.anchor))), main || 0);
    this.cm.dispatch({ selection: sel, scrollIntoView: true });
  }

  somethingSelected() { return this.state.selection.ranges.some(r => !r.empty); }

  wordAt(pos) {
    const w = this.state.wordAt(this.posToOffset(pos));
    return w ? { from: this.offsetToPos(w.from), to: this.offsetToPos(w.to) } : null;
  }

  /* --- focus and scrolling -------------------------------------------------------------- */

  focus() { this.cm.focus(); }
  blur() { this.cm.contentDOM.blur(); }
  hasFocus() { return this.cm.hasFocus; }

  getScrollInfo() {
    const s = this.cm.scrollDOM;
    return { top: s.scrollTop, left: s.scrollLeft, height: s.scrollHeight, clientHeight: s.clientHeight, width: s.scrollWidth, clientWidth: s.clientWidth };
  }

  scrollTo(x, y) {
    const s = this.cm.scrollDOM;
    if (x != null) s.scrollLeft = x;
    if (y != null) s.scrollTop = y;
  }

  scrollIntoView(range, center) {
    const from = this.posToOffset(range.from), to = range.to ? this.posToOffset(range.to) : from;
    this.cm.dispatch({ effects: EditorView.scrollIntoView(EditorSelection.range(from, to), { y: center ? 'center' : 'nearest' }) });
  }

  /* --- history and commands --------------------------------------------------------------- */

  undo() { undo(this.cm); }
  redo() { redo(this.cm); }

  exec(command) {
    const fn = EXEC[command];
    return fn ? fn(this.cm) : false;
  }

  /* Obsidian's EditorTransaction: { replaceSelection?, changes?: [{ from, to?, text }],
     selection?: { from, to? }, selections?: [{ from, to? }] }. */
  transaction(tx, origin) {
    const spec = { userEvent: origin || 'input', scrollIntoView: true };
    if (tx.replaceSelection !== undefined) {
      const r = this.state.replaceSelection(tx.replaceSelection);
      spec.changes = r.changes;
      spec.selection = r.selection;
    }
    if (tx.changes) spec.changes = tx.changes.map(c => {
      const a = this.posToOffset(c.from), b = c.to ? this.posToOffset(c.to) : a;
      return { from: Math.min(a, b), to: Math.max(a, b), insert: c.text || '' };
    });
    const toRange = s => EditorSelection.range(this.posToOffset(s.from), this.posToOffset(s.to || s.from));
    if (tx.selection) spec.selection = EditorSelection.create([toRange(tx.selection)]);
    if (tx.selections && tx.selections.length) spec.selection = EditorSelection.create(tx.selections.map(toRange));
    if (spec.selection && spec.changes && !tx.replaceSelection) {
      /* Selections are given in the new document's coordinates. */
      this.cm.dispatch({ changes: spec.changes, userEvent: spec.userEvent });
      this.cm.dispatch({ selection: spec.selection, scrollIntoView: true });
      return;
    }
    this.cm.dispatch(spec);
  }

  /* Run read() over each selected line, then write() to change it, like
     Obsidian's processLines. */
  processLines(read, write, ignoreEmpty = false) {
    const lines = new Set();
    for (const r of this.state.selection.ranges) {
      const a = this.doc.lineAt(r.from).number, b = this.doc.lineAt(r.to).number;
      for (let n = a; n <= b; n++) lines.add(n);
    }
    const changes = [];
    for (const n of Array.from(lines).sort((x, y) => x - y)) {
      const line = this.doc.line(n);
      if (ignoreEmpty && !line.text.trim()) continue;
      const res = read(n - 1, line.text);
      const change = write(n - 1, line.text, res);
      if (change) changes.push({ from: this.posToOffset(change.from), to: change.to ? this.posToOffset(change.to) : this.posToOffset(change.from), insert: change.text });
    }
    if (changes.length) this.cm.dispatch({ changes, userEvent: 'input' });
  }
}
