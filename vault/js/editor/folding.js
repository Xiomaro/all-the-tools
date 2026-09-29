/* Folding headings and list items, with Obsidian's fold indicators
   (.cm-fold-indicator > .collapse-indicator.collapse-icon > svg.right-triangle)
   shown in the margin beside the line on hover, the folded "…" placeholder,
   the fold commands, and folds remembered per note in this browser. */

import {
  foldService, codeFolding, foldEffect, unfoldEffect, foldedRanges, foldState, unfoldAll,
  ViewPlugin, Decoration, WidgetType, RangeSetBuilder, syntaxTree, EditorState
} from '../../../assets/vendor/codemirror/codemirror.js';
import { icon } from '../core/ui.js';
import { parsePrefix, indentWidth, isBlank, frontmatterRange } from './text.js';
import { itemSubtree } from './lists.js';

const HEADING = /^ {0,3}(#{1,6})(?:[ \t]|$)/;
const FENCE = /^[ \t]*(?:>[ \t]?)*[ \t]*(`{3,}|~{3,})/;
const CODE_NODES = /^(FencedCode|CodeBlock|CodeText|HTMLBlock|CommentBlock|Frontmatter|YAML|Math|BlockMath|hmd-codeblock)/i;

/* Is the start of this line inside code, per the syntax tree? */
function inCodeTree(state, pos) {
  let node = syntaxTree(state).resolveInner(pos, 1);
  for (; node; node = node.parent) if (CODE_NODES.test(node.name)) return true;
  return false;
}

function inFrontmatter(state, pos) {
  const fm = frontmatterRange(state.doc);
  return !!(fm && pos <= fm.to);
}

export function headingLevel(text) {
  const m = HEADING.exec(text);
  return m ? m[1].length : 0;
}

/* The range a heading line folds: to the end of its section, leaving the
   blank lines before the next heading visible. */
export function headingRange(state, line) {
  const level = headingLevel(line.text);
  if (!level) return null;
  const doc = state.doc;
  let fence = null, last = line.number;
  for (let n = line.number + 1; n <= doc.lines; n++) {
    const t = doc.line(n).text;
    if (fence) {
      const m = FENCE.exec(t);
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
      last = n; continue;
    }
    const f = FENCE.exec(t);
    if (f) { fence = f[1]; last = n; continue; }
    const l = headingLevel(t);
    if (l && l <= level) break;
    if (!isBlank(t)) last = n;
  }
  if (last === line.number) return null;
  return { from: line.to, to: doc.line(last).to };
}

export function listRange(state, line) {
  const p = parsePrefix(line.text);
  if (!p.isList) return null;
  const [, end] = itemSubtree(state.doc, line.number, state.facet(EditorState.tabSize));
  if (end === line.number) return null;
  return { from: line.to, to: state.doc.line(end).to };
}

/* Indented text under a plain line (Obsidian's "fold indent"). */
function indentRange(state, line) {
  if (isBlank(line.text)) return null;
  const doc = state.doc, ts = state.facet(EditorState.tabSize);
  const base = indentWidth(/^[ \t]*/.exec(line.text)[0], ts);
  let end = line.number;
  for (let n = line.number + 1; n <= doc.lines; n++) {
    const t = doc.line(n).text;
    if (isBlank(t)) continue;
    if (indentWidth(/^[ \t]*/.exec(t)[0], ts) <= base) break;
    end = n;
  }
  return end > line.number ? { from: line.to, to: doc.line(end).to } : null;
}

/* What folds at this line, per the settings, and what kind it is. */
export function foldAt(state, line, opts) {
  if (opts.heading && headingLevel(line.text)) {
    if (inCodeTree(state, line.from) || inFrontmatter(state, line.from)) return null;
    const r = headingRange(state, line);
    return r && Object.assign(r, { kind: 'heading', depth: headingLevel(line.text) });
  }
  if (opts.indent) {
    if (inCodeTree(state, line.from) || inFrontmatter(state, line.from)) return null;
    const p = parsePrefix(line.text);
    const r = p.isList ? listRange(state, line) : indentRange(state, line);
    return r && Object.assign(r, { kind: 'list', depth: 7 + Math.floor(indentWidth(p.indent, state.facet(EditorState.tabSize)) / 2), markerCol: p.isList ? p.markerStart : 0 });
  }
  return null;
}

function isFolded(state, from, to) {
  let found = false;
  foldedRanges(state).between(from, from, (a, b) => { if (a === from) found = true; });
  return found;
}

/* The arrow beside a foldable line. It works out its range when clicked,
   so typing elsewhere doesn't redraw every arrow. */
class FoldWidget extends WidgetType {
  constructor(folded, opts) { super(); this.folded = folded; this.opts = opts; }
  eq(o) { return o.folded === this.folded; }
  toDOM(view) {
    const el = document.createElement('span');
    el.className = 'cm-fold-indicator' + (this.folded ? ' is-collapsed' : '');
    el.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span');
    inner.className = 'collapse-indicator collapse-icon';
    inner.appendChild(icon('chevron-down', 'right-triangle'));
    el.appendChild(inner);
    inner.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();
      let pos;
      try { pos = view.posAtDOM(el); } catch (err) { return; }
      const line = view.state.doc.lineAt(pos);
      let hit = null;
      foldedRanges(view.state).between(line.to, line.to, (a, b) => { if (a === line.to) hit = { from: a, to: b }; });
      if (hit) { view.dispatch({ effects: unfoldEffect.of(hit) }); return; }
      const r = foldAt(view.state, line, this.opts());
      if (r) view.dispatch({ effects: foldEffect.of({ from: r.from, to: r.to }) });
    });
    return el;
  }
  ignoreEvent() { return true; }
}

function indicators(opts) {
  return ViewPlugin.fromClass(class {
    constructor(view) { this.decorations = this.build(view); }
    update(u) {
      if (u.docChanged || u.viewportChanged || u.startState.field(foldState, false) !== u.state.field(foldState, false)) this.decorations = this.build(u.view);
    }
    build(view) {
      const b = new RangeSetBuilder();
      const { state } = view;
      for (const { from, to } of view.visibleRanges) {
        let pos = from;
        while (pos <= to) {
          const line = state.doc.lineAt(pos);
          const r = foldAt(state, line, opts());
          if (r) {
            const at = line.from + (r.kind === 'list' ? r.markerCol : 0);
            b.add(at, at, Decoration.widget({ widget: new FoldWidget(isFolded(state, r.from, r.to), opts), side: -1 }));
          }
          pos = line.to + 1;
        }
      }
      return b.finish();
    }
  }, { decorations: v => v.decorations });
}

function placeholderDOM(view, onclick) {
  const el = document.createElement('span');
  el.className = 'cm-foldPlaceholder';
  el.textContent = '…';
  el.setAttribute('aria-label', 'Unfold');
  el.title = 'Unfold';
  el.addEventListener('click', onclick);
  return el;
}

/* The folding extensions; `opts()` returns { heading, indent }. */
export function folding(opts, onFoldsChanged) {
  return [
    foldService.of((state, from) => {
      const r = foldAt(state, state.doc.lineAt(from), opts());
      return r ? { from: r.from, to: r.to } : null;
    }),
    codeFolding({ placeholderDOM }),
    indicators(opts),
    EditorStateListener(onFoldsChanged)
  ];
}

function EditorStateListener(cb) {
  return ViewPlugin.fromClass(class {
    update(u) {
      if (u.transactions.some(tr => tr.effects.some(e => e.is(foldEffect) || e.is(unfoldEffect)))) cb && cb(u.view);
    }
  });
}

/* --- commands --------------------------------------------------------------------- */

/* Every foldable range in the document, with its depth. */
export function allFoldables(state, opts) {
  const out = [];
  for (let n = 1; n <= state.doc.lines; n++) {
    const line = state.doc.line(n);
    const r = foldAt(state, line, opts);
    if (r) out.push(r);
  }
  return out;
}

export function toggleFoldAtCursor(view, opts) {
  const { state } = view;
  const pos = state.selection.main.head;
  let line = state.doc.lineAt(pos);
  /* A fold starting on this line? */
  let hit = null;
  foldedRanges(state).between(line.from, line.to, (a, b) => { if (a >= line.from && a <= line.to) hit = { from: a, to: b }; });
  if (hit) { view.dispatch({ effects: unfoldEffect.of(hit) }); return true; }
  /* Otherwise fold the innermost section or item holding the cursor. */
  for (let n = line.number; n >= 1; n--) {
    const l = state.doc.line(n);
    const r = foldAt(state, l, opts);
    if (r && (n === line.number || (pos > r.from && pos <= r.to))) {
      view.dispatch({ effects: foldEffect.of({ from: r.from, to: r.to }), selection: pos > r.from ? { anchor: l.to } : undefined });
      return true;
    }
  }
  return false;
}

export function foldAllRanges(view, opts) {
  const ranges = allFoldables(view.state, opts).filter(r => !isFolded(view.state, r.from, r.to));
  if (!ranges.length) return false;
  const pos = view.state.selection.main.head;
  const outer = ranges.filter(r => pos > r.from && pos <= r.to).sort((a, b) => a.from - b.from)[0];
  view.dispatch({ effects: ranges.map(r => foldEffect.of({ from: r.from, to: r.to })), selection: outer ? { anchor: outer.from } : undefined });
  return true;
}

export function unfoldAllRanges(view) { return unfoldAll(view); }

/* Fold more: fold the deepest level that isn't folded yet. Fold less:
   unfold the outermost folded level. */
export function foldMore(view, opts) {
  const { state } = view;
  const all = allFoldables(state, opts);
  const hidden = r => { let inside = false; foldedRanges(state).between(r.from, r.to, (a, b) => { if (a < r.from && b >= r.to) inside = true; }); return inside; };
  const open = all.filter(r => !isFolded(state, r.from, r.to) && !hidden(r));
  if (!open.length) return false;
  const depth = Math.max(...open.map(r => r.depth));
  view.dispatch({ effects: open.filter(r => r.depth === depth).map(r => foldEffect.of({ from: r.from, to: r.to })) });
  return true;
}

export function foldLess(view, opts) {
  const { state } = view;
  const all = allFoldables(state, opts).filter(r => isFolded(state, r.from, r.to));
  if (!all.length) return false;
  const depth = Math.min(...all.map(r => r.depth));
  view.dispatch({ effects: all.filter(r => r.depth === depth).map(r => unfoldEffect.of({ from: r.from, to: r.to })) });
  return true;
}

/* --- remembering folds ------------------------------------------------------------ */

/* Folds as line numbers, which survive edits made elsewhere. */
export function getFoldLines(state) {
  const out = [];
  foldedRanges(state).between(0, state.doc.length, (from, to) => {
    out.push({ from: state.doc.lineAt(from).number - 1, to: state.doc.lineAt(to).number - 1 });
  });
  return out;
}

export function applyFoldLines(view, lines, opts) {
  if (!lines || !lines.length) return;
  const { state } = view;
  const effects = [];
  for (const f of lines) {
    if (f.from + 1 > state.doc.lines) continue;
    const r = foldAt(state, state.doc.line(f.from + 1), opts);
    if (r) effects.push(foldEffect.of({ from: r.from, to: r.to }));
  }
  if (effects.length) view.dispatch({ effects });
}

