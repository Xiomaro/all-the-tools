/* The editor's CodeMirror extensions that follow the vault's settings
   (app.json), each in its own Compartment so a setting changed in
   Settings, or in app.json by Obsidian, applies at once to every open
   note. */

import {
  Compartment, EditorState, EditorView, EditorSelection, StateField, Transaction, Decoration, Prec,
  keymap, lineNumbers, indentUnit, closeBrackets, closeBracketsKeymap, history, historyKeymap, redo, standardKeymap,
  simplifySelection, drawSelection, dropCursor, rectangularSelection, crosshairCursor, bracketMatching,
  search, vim, Vim
} from '../../../assets/vendor/codemirror/codemirror.js';
import { frontmatterRange } from './text.js';

/* --- frontmatter hidden in live preview ------------------------------------------ */

/* In live preview, with "Properties in document" set to visible or hidden,
   the YAML block is replaced by the Properties editor above the text. The
   lines stay in the document but the cursor and typing keep out of them.
   While someone is typing a new block by hand it stays visible until the
   cursor leaves it. */
export function hiddenFrontmatter() {
  const compute = (state, prev) => {
    const fm = frontmatterRange(state.doc);
    if (!fm || !fm.valid) return { hidden: false, to: -1 };
    const head = state.selection.main.head;
    const typing = head > 0 && head <= fm.to;
    return { hidden: !!(prev && prev.hidden) || !typing, to: fm.to };
  };
  const field = StateField.define({
    create: state => compute(state, null),
    update: (value, tr) => (tr.docChanged || tr.selection) ? compute(tr.state, value) : value,
    provide: f => [
      EditorView.decorations.from(f, v => v.hidden ? Decoration.set([Decoration.replace({ block: true }).range(0, v.to)]) : Decoration.none),
      EditorView.atomicRanges.of(view => {
        const v = view.state.field(f);
        return v.hidden ? Decoration.set([Decoration.mark({}).range(0, v.to)]) : Decoration.none;
      })
    ]
  });
  /* Keep the selection below the block, and typing out of it. A note that
     is nothing but frontmatter gets its first line when typing starts. */
  const guard = EditorState.transactionFilter.of(tr => {
    const v = tr.startState.field(field, false);
    const event = tr.annotation(Transaction.userEvent);
    if (!v || !v.hidden || !event) return tr;
    const bodyStart = Math.min(v.to + 1, tr.startState.doc.length);
    if (tr.docChanged) {
      let touches = false, count = 0, first = null;
      tr.changes.iterChanges((fA, tA, fB, tB, ins) => { count++; if (!first) first = { fA, tA, ins }; if (fA <= v.to) touches = true; });
      if (!touches) return tr;
      if (count === 1 && first.fA === v.to && first.tA === v.to && v.to === tr.startState.doc.length && event.startsWith('input')) {
        const text = '\n' + first.ins.toString();
        return { changes: { from: v.to, insert: text }, selection: EditorSelection.cursor(v.to + text.length), userEvent: 'input.type', scrollIntoView: true };
      }
      return {};
    }
    if (tr.selection) {
      const clamp = p => p <= v.to ? bodyStart : p;
      const sel = tr.selection;
      if (sel.ranges.some(r => r.from <= v.to)) {
        return [tr, { selection: EditorSelection.create(sel.ranges.map(r => EditorSelection.range(clamp(r.anchor), clamp(r.head))), sel.mainIndex), sequential: true }];
      }
    }
    return tr;
  });
  return [field, guard];
}

/* --- pairing ------------------------------------------------------------------------ */

/* With text selected, typing * _ ~ = ` $ or % wraps it (twice for ** and
   so on), as Obsidian's "Auto pair Markdown syntax" does. */
const WRAP = new Set(['*', '_', '~', '=', '`', '$', '%']);
export function markdownPairs() {
  return EditorView.inputHandler.of((view, from, to, text) => {
    if (!WRAP.has(text) || view.state.readOnly) return false;
    const { state } = view;
    if (state.selection.ranges.every(r => r.empty)) return false;
    const spec = state.changeByRange(r => {
      if (r.empty) return { changes: { from: r.from, insert: text }, range: EditorSelection.cursor(r.from + 1) };
      return {
        changes: [{ from: r.from, insert: text }, { from: r.to, insert: text }],
        range: EditorSelection.range(r.anchor + 1, r.head + 1)
      };
    });
    view.dispatch(state.update(spec, { userEvent: 'input.type', scrollIntoView: true }));
    return true;
  });
}

export function bracketPairs() {
  return [
    closeBrackets(),
    EditorState.languageData.of(() => [{ closeBrackets: { brackets: ['(', '[', '{'], before: ')]}:;>.,!?' } }]),
    Prec.high(keymap.of(closeBracketsKeymap))
  ];
}

/* --- vim ---------------------------------------------------------------------------- */

let vimReady = false;
export function vimMode(app) {
  if (!vimReady) {
    vimReady = true;
    const view = () => app.workspace.activeEditor;
    Vim.defineEx('write', 'w', () => { const v = view(); if (v) v.save(); });
    Vim.defineEx('quit', 'q', () => { const v = view(); if (v) v.leaf.detach(); });
    Vim.defineEx('wq', 'wq', () => { const v = view(); if (v) v.save().then(() => v.leaf.detach()); });
    Vim.defineEx('nohlsearch', 'noh', () => {});
  }
  return vim({ status: true });
}

/* --- everything a note's editor gets --------------------------------------------- */

export class EditorConfig {
  constructor(app) {
    this.app = app;
    this.c = {
      vim: new Compartment(), syntax: new Compartment(), presentation: new Compartment(), frontmatter: new Compartment(),
      lineNumbers: new Compartment(), folding: new Compartment(), tabs: new Compartment(),
      rtl: new Compartment(), spell: new Compartment(), brackets: new Compartment(), markdownPairs: new Compartment(),
      plugins: new Compartment()
    };
  }

  get(key) { return this.app.config.get(key); }

  tabs() {
    const size = Math.max(1, Math.min(16, +this.get('tabSize') || 4));
    return [EditorState.tabSize.of(size), indentUnit.of(this.get('useTab') !== false ? '\t' : ' '.repeat(size))];
  }

  /* The extension for one setting's compartment, for Compartment.of and
     reconfigure. */
  value(view, name) {
    const cfg = key => this.get(key);
    switch (name) {
      case 'vim': return cfg('vimMode') ? vimMode(this.app) : [];
      case 'lineNumbers': return cfg('showLineNumber') ? lineNumbers() : [];
      case 'folding': return (cfg('foldHeading') || cfg('foldIndent')) ? view.foldingExtension() : [];
      case 'tabs': return this.tabs();
      case 'rtl': return cfg('rightToLeft') ? [EditorView.contentAttributes.of({ dir: 'rtl' })] : [EditorView.perLineTextDirection.of(true)];
      case 'spell': return EditorView.contentAttributes.of({ spellcheck: cfg('spellcheck') ? 'true' : 'false', autocorrect: cfg('spellcheck') ? 'on' : 'off', autocapitalize: 'sentences', translate: 'no' });
      case 'brackets': return cfg('autoPairBrackets') ? bracketPairs() : [];
      case 'markdownPairs': return cfg('autoPairMarkdown') ? markdownPairs() : [];
      case 'plugins': return this.app.editorExtensions.slice();
    }
    return [];
  }

  /* Which compartments a changed app.json key affects. */
  static affected(key) {
    const map = {
      vimMode: ['vim'], showLineNumber: ['lineNumbers'], foldHeading: ['folding'], foldIndent: ['folding'],
      tabSize: ['tabs'], useTab: ['tabs'], rightToLeft: ['rtl'], spellcheck: ['spell'],
      autoPairBrackets: ['brackets'], autoPairMarkdown: ['markdownPairs']
    };
    if (!key) return Object.values(map).flat().filter((v, i, a) => a.indexOf(v) === i);
    return map[key] || [];
  }

  /* The full list for a new EditorState. `parts` holds the pieces owned by
   the view: syntax, presentation, frontmatter, keymaps and listeners. */
  build(view, parts) {
    const v = {};
    for (const name of Object.keys(this.c)) v[name] = this.value(view, name);
    const c = this.c;
    return [
      /* Vim first: in normal mode it takes every key. */
      c.vim.of(v.vim),
      parts.first || [],
      c.syntax.of(parts.syntax),
      c.presentation.of(parts.presentation),
      c.frontmatter.of(parts.frontmatter),
      c.plugins.of(v.plugins),
      parts.keys || [],
      c.lineNumbers.of(v.lineNumbers),
      c.folding.of(v.folding),
      c.tabs.of(v.tabs),
      c.rtl.of(v.rtl),
      c.spell.of(v.spell),
      c.brackets.of(v.brackets),
      c.markdownPairs.of(v.markdownPairs),
      history(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      /* Ctrl/Cmd+click follows links, so Alt+click adds a cursor and
         Alt+drag selects a rectangle, as in Obsidian. */
      EditorView.clickAddsSelectionRange.of(e => e.altKey),
      rectangularSelection({ eventFilter: e => e.altKey && e.button === 0 }),
      crosshairCursor({ key: 'Alt' }),
      bracketMatching(),
      EditorView.lineWrapping,
      search({ createPanel: () => { const dom = document.createElement('div'); dom.className = 'cm-hidden-search-panel'; return { dom, top: true }; } }),
      keymap.of([
        { key: 'Escape', run: simplifySelection },
        ...standardKeymap,
        ...historyKeymap.filter(b => !/Mod-u|Alt-u/.test(b.key || '')),
        { key: 'Mod-Shift-z', run: redo, preventDefault: true }
      ]),
      parts.last || []
    ];
  }
}
