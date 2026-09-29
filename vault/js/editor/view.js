/* The markdown view: a note in live preview, source mode or reading view,
   like Obsidian's MarkdownView. Its DOM follows Obsidian's so themes and
   CSS snippets apply:

   .workspace-leaf-content[data-type=markdown][data-mode=source|preview]
     .view-content
       .document-search-container
       .markdown-source-view.cm-s-obsidian.mod-cm6(.is-live-preview.is-readable-line-width.is-folding.show-properties)
         .cm-editor > .cm-scroller > .cm-sizer > .inline-title + .metadata-container + .cm-contentContainer > .cm-content
       .markdown-reading-view > .markdown-preview-view.markdown-rendered > .markdown-preview-sizer.markdown-preview-section */

import { TextFileView, Workspace } from '../core/workspace.js';
import { Component } from '../core/events.js';
import { h, icon, Notice, SuggestModal } from '../core/ui.js';
import { resolveSubpath, parseMarkdown } from '../core/metadata.js';
import { joinPath } from '../core/fs.js';
import {
  EditorView, EditorState, EditorSelection, StateEffect, StateField, Decoration, Annotation, Transaction, keymap, Prec
} from '../../../assets/vendor/codemirror/codemirror.js';
import * as presentation from './presentation.js';
import { Editor } from './editor.js';
import { EditorConfig, hiddenFrontmatter } from './extensions.js';
import { listKeymap } from './lists.js';
import { folding, getFoldLines, applyFoldLines } from './folding.js';
import { SuggestPopup } from './suggest.js';
import { DocumentSearch } from './search.js';
import { handlePaste, handleDragOver, handleDrop } from './clipboard.js';
import { onContextMenu } from './context-menu.js';
import { linkUnderCursor } from './editing.js';
import { frontmatterRange, parsePrefix } from './text.js';

/* Changes that came from the file on disk, not from typing. */
const External = Annotation.define();

/* Cursor and scroll position per note, for this session. */
export const sessionState = new Map();

/* --- briefly highlighting a heading, block or line ------------------------------- */

const flashEffect = StateEffect.define();
const flashField = StateField.define({
  create: () => Decoration.none,
  update(value, tr) {
    value = value.map(tr.changes);
    for (const e of tr.effects) if (e.is(flashEffect)) {
      if (!e.value) value = Decoration.none;
      else {
        const doc = tr.state.doc;
        const a = doc.lineAt(Math.min(e.value.from, doc.length)).number, b = doc.lineAt(Math.min(e.value.to, doc.length)).number;
        const decos = [];
        for (let n = a; n <= Math.min(b, a + 200); n++) decos.push(Decoration.line({ class: 'is-flashing' }).range(doc.line(n).from));
        value = Decoration.set(decos);
      }
    }
    return value;
  },
  provide: f => EditorView.decorations.from(f)
});

function safe(fn, label) {
  try { return fn() || []; }
  catch (e) { console.error('[vault] ' + label + ' failed', e); return []; }
}

const norm = t => String(t).replace(/\r\n?/g, '\n');

/* The one change that turns `a` into `b`: common start and end kept. */
function diffRange(a, b) {
  const n = Math.min(a.length, b.length);
  let p = 0;
  while (p < n && a.charCodeAt(p) === b.charCodeAt(p)) p++;
  let s = 0;
  while (s < n - p && a.charCodeAt(a.length - 1 - s) === b.charCodeAt(b.length - 1 - s)) s++;
  return { from: p, toA: a.length - s, toB: b.length - s };
}

export class MarkdownView extends TextFileView {
  constructor(leaf) {
    super(leaf);
    const app = this.app;
    this.icon = 'file-text';
    this.editor = new Editor(this);
    this.config = new EditorConfig(app);
    this.mode = app.config.get('defaultViewMode') === 'preview' ? 'preview' : 'source';
    this.sourceFlag = app.config.get('livePreview') === false;
    this.eol = '\n';
    this.previewComponent = null;
    this.pendingEState = null;

    this.inlineTitleEl = h('div.inline-title', { contenteditable: 'true', spellcheck: 'false', tabindex: '-1', enterkeyhint: 'done', autocapitalize: 'on', 'data-placeholder': 'Untitled' });
    this.metadataEl = h('div.metadata-host', { style: { display: 'none' } });
    this.sourceEl = h('div.markdown-source-view.cm-s-obsidian.mod-cm6.node-insert-event');
    this.suggest = new SuggestPopup(this);
    this.search = new DocumentSearch(this);
    this.cm = new EditorView({ state: this.createState(''), parent: this.sourceEl });
    this.restructure();
    this.cm.scrollDOM.addEventListener('scroll', () => { if (this.suggest.isOpen) this.suggest.position(); }, { passive: true });

    this.previewSizerEl = h('div.markdown-preview-sizer.markdown-preview-section');
    this.previewEl = h('div.markdown-preview-view.markdown-rendered.node-insert-event', { tabindex: '-1' }, this.previewSizerEl);
    this.readingEl = h('div.markdown-reading-view', this.previewEl);
    this.contentEl.append(this.search.containerEl, this.sourceEl, this.readingEl);

    this.modeButton = this.addAction('book-open', 'Reading view', e => this.onModeButton(e));
    this.modeButton.classList.add('mod-mode-toggle');

    /* Obsidian's names for the two halves. */
    this.sourceMode = { cmEditor: this.cm, containerEl: this.sourceEl, get: () => this.getViewData(), set: (d) => this.setViewData(d, false) };
    this.previewMode = {
      containerEl: this.readingEl,
      rerender: () => this.renderPreview(),
      get: () => this.getViewData(),
      set: () => this.renderPreview(),
      getScroll: () => this.previewTopLine(),
      applyScroll: line => this.previewScrollToLine(line)
    };

    this.setupInlineTitle();
    this.applyClasses();
    this.showMode();
  }

  getViewType() { return 'markdown'; }
  canAcceptExtension(ext) { return ext === 'md'; }
  getMode() { return this.mode; }
  get currentMode() { return this.mode === 'preview' ? this.previewMode : this.sourceMode; }
  isLivePreview() { return !this.sourceFlag; }
  cfg(key) { return this.app.config.get(key); }

  onload() {
    const app = this.app;
    this.registerEvent(app.config.on('changed', key => this.onConfigChanged(key)));
    this.registerEvent(app.workspace.on('editor-extensions-changed', () => {
      this.cm.dispatch({ effects: this.config.c.plugins.reconfigure(app.editorExtensions.slice()) });
    }));
    /* The workspace doesn't pass vault events to views, so listen here. */
    this.registerEvent(app.vault.on('modify', f => { if (f === this.file) this.onModify(f); }));
    this.registerEvent(app.vault.on('rename', (f, old) => { if (f === this.file) this.onRename(f, old); }));
    this.registerEvent(app.vault.on('delete', f => { if (f === this.file) this.onDelete(f); }));
    this.register(() => this.suggest.destroy());
  }

  /* --- building the editor ------------------------------------------------------------ */

  createState(doc, selection) {
    return EditorState.create({
      doc, selection,
      extensions: this.config.build(this, {
        first: [this.suggest.keymap(), this.viewKeymap()],
        syntax: safe(() => presentation.markdownSyntax(this.app), 'markdownSyntax'),
        presentation: this.presentationExtension(),
        frontmatter: this.frontmatterExtension(),
        keys: listKeymap(() => ({ smartIndentList: this.cfg('smartIndentList') !== false })),
        last: [flashField, this.listeners()]
      })
    });
  }

  presentationExtension() {
    return this.isLivePreview() ? safe(() => presentation.livePreview(this.app, this), 'livePreview') : safe(() => presentation.sourceMode(this.app, this), 'sourceMode');
  }

  /* Live preview hides the YAML when the Properties block stands in for
     it. The live-preview extension does the hiding when it offers the
     hideFrontmatter facet; otherwise a simpler version here does. */
  frontmatterExtension() {
    const hide = this.isLivePreview() && this.cfg('propertiesInDocument') !== 'source';
    if (presentation.hideFrontmatter) return presentation.hideFrontmatter.of(hide);
    return hide ? hiddenFrontmatter() : [];
  }

  foldingExtension() {
    return folding(() => ({ heading: !!this.cfg('foldHeading'), indent: !!this.cfg('foldIndent') }), () => this.saveFoldsSoon());
  }

  viewKeymap() {
    return Prec.high(keymap.of([{
      key: 'ArrowUp',
      run: cm => {
        const sel = cm.state.selection;
        if (sel.ranges.length > 1 || !sel.main.empty || this.cfg('showInlineTitle') === false) return false;
        const first = this.bodyStart();
        if (cm.state.doc.lineAt(sel.main.head).from !== cm.state.doc.lineAt(first).from) return false;
        /* Only from the first visual line of a wrapped paragraph. */
        const a = cm.coordsAtPos(first, 1), b = cm.coordsAtPos(sel.main.head, -1);
        if (a && b && b.top - a.top > 2) return false;
        this.focusTitle('end');
        return true;
      }
    }]));
  }

  listeners() {
    return [
      EditorView.updateListener.of(u => this.onEditorUpdate(u)),
      EditorView.domEventHandlers({
        paste: e => handlePaste(this, e),
        dragover: e => handleDragOver(this, e),
        drop: e => handleDrop(this, e),
        contextmenu: e => onContextMenu(this, e),
        mousedown: e => this.onEditorMouseDown(e)
      })
    ];
  }

  /* Put CodeMirror's content inside Obsidian's sizer, below the inline
     title and the properties. CodeMirror inserts its gutters before the
     content element, so those inserts are redirected into the sizer too. */
  restructure() {
    const cm = this.cm;
    const scroller = cm.scrollDOM;
    this.sizerEl = h('div.cm-sizer');
    this.contentContainerEl = h('div.cm-contentContainer');
    scroller.insertBefore(this.sizerEl, cm.contentDOM);
    Array.from(scroller.children).filter(el => el.classList.contains('cm-gutters') && !el.classList.contains('cm-gutters-after'))
      .forEach(el => this.contentContainerEl.appendChild(el));
    this.contentContainerEl.appendChild(cm.contentDOM);
    this.sizerEl.append(this.inlineTitleEl, this.metadataEl, this.contentContainerEl);
    const native = Node.prototype.insertBefore;
    scroller.insertBefore = function (node, ref) {
      if (ref && ref.parentNode && ref.parentNode !== scroller) return native.call(ref.parentNode, node, ref);
      return native.call(scroller, node, ref);
    };
    /* A click below the text puts the cursor at the end. */
    scroller.addEventListener('mousedown', e => {
      if (e.button !== 0 || !(e.target === scroller || e.target === this.sizerEl || e.target === this.contentContainerEl)) return;
      const r = cm.contentDOM.getBoundingClientRect();
      if (e.clientY < r.bottom) return;
      e.preventDefault();
      cm.focus();
      cm.dispatch({ selection: EditorSelection.cursor(cm.state.doc.length), scrollIntoView: true });
    });
  }

  /* --- settings ------------------------------------------------------------------------ */

  applyClasses() {
    const cfg = k => this.cfg(k);
    const lp = this.isLivePreview();
    const s = this.sourceEl.classList, p = this.previewEl.classList;
    s.toggle('is-live-preview', lp);
    s.toggle('is-readable-line-width', !!cfg('readableLineLength'));
    s.toggle('is-folding', !!(cfg('foldHeading') || cfg('foldIndent')));
    s.toggle('show-properties', lp && cfg('propertiesInDocument') === 'visible');
    s.toggle('show-indentation-guide', !!cfg('showIndentGuide'));
    s.toggle('is-rtl', !!cfg('rightToLeft'));
    s.toggle('show-line-number', !!cfg('showLineNumber'));
    p.toggle('is-readable-line-width', !!cfg('readableLineLength'));
    p.toggle('show-indentation-guide', !!cfg('showIndentGuide'));
    p.toggle('allow-fold-headings', !!cfg('foldHeading'));
    p.toggle('allow-fold-lists', !!cfg('foldIndent'));
    p.toggle('show-properties', cfg('propertiesInDocument') === 'visible');
    p.toggle('is-rtl', !!cfg('rightToLeft'));
    if (cfg('rightToLeft')) this.previewEl.setAttribute('dir', 'rtl'); else this.previewEl.removeAttribute('dir');
    this.inlineTitleEl.style.display = cfg('showInlineTitle') === false ? 'none' : '';
  }

  onConfigChanged(key) {
    const names = EditorConfig.affected(key);
    if (names.length) this.cm.dispatch({ effects: names.map(n => this.config.c[n].reconfigure(this.config.value(this, n))) });
    if (!key || key === 'propertiesInDocument') {
      this.cm.dispatch({ effects: this.config.c.frontmatter.reconfigure(this.frontmatterExtension()) });
      this.renderProperties();
    }
    this.applyClasses();
    if (this.mode === 'preview' && (!key || ['strictLineBreaks', 'showInlineTitle', 'propertiesInDocument', 'readableLineLength', 'foldHeading', 'foldIndent'].includes(key))) this.renderPreview();
  }

  /* Live preview or source mode, for this tab. */
  setSourceFlag(on) {
    on = !!on;
    if (on === this.sourceFlag) return;
    const keep = this.sourceTopLine();
    this.sourceFlag = on;
    this.cm.dispatch({ effects: [
      this.config.c.presentation.reconfigure(this.presentationExtension()),
      this.config.c.frontmatter.reconfigure(this.frontmatterExtension())
    ] });
    this.applyClasses();
    this.renderProperties();
    if (this.mode === 'source') requestAnimationFrame(() => this.scrollSourceToLine(keep));
    this.app.workspace.onLayoutChange();
  }

  toggleSource() { this.setSourceFlag(!this.sourceFlag); }

  /* --- modes -------------------------------------------------------------------------- */

  showMode() {
    const preview = this.mode === 'preview';
    this.containerEl.dataset.mode = this.mode;
    this.sourceEl.style.display = preview ? 'none' : '';
    this.readingEl.style.display = preview ? '' : 'none';
    const mod = /Mac/.test(navigator.platform) ? 'Cmd' : 'Ctrl';
    const label = preview ? 'Current view: reading\nClick to edit\n' + mod + '+click to open to the right' : 'Current view: editing\nClick to read\n' + mod + '+click to open to the right';
    this.modeButton.replaceChildren();
    this.modeButton.appendChild(icon(preview ? 'edit-3' : 'book-open'));
    this.modeButton.setAttribute('aria-label', label);
    this.modeButton.title = label;
  }

  /* Obsidian's plugin API names. */
  showSearch(replace) { this.search.open(!!replace); }

  async setMode(mode) {
    if (mode === this.previewMode) mode = 'preview';
    else if (mode === this.sourceMode) mode = 'source';
    if (mode !== 'source' && mode !== 'preview') return;
    if (mode === this.mode) return;
    const line = this.mode === 'source' ? this.sourceTopLine() : this.previewTopLine();
    if (this.mode === 'source') this.remember();
    this.mode = mode;
    this.showMode();
    this.suggest.close();
    if (mode === 'preview') {
      await this.renderPreview();
      this.previewScrollToLine(line);
    } else {
      this.cm.requestMeasure();
      this.renderProperties();
      requestAnimationFrame(() => this.scrollSourceToLine(line));
    }
    this.search.onModeChanged();
    if (this.app.workspace.activeLeaf === this.leaf) this.focus();
    this.app.workspace.onLayoutChange();
    this.app.workspace.trigger('layout-change');
  }

  toggleMode() { return this.setMode(this.mode === 'source' ? 'preview' : 'source'); }

  onModeButton(e) {
    const other = this.mode === 'source' ? 'preview' : 'source';
    if ((e.ctrlKey || e.metaKey) && this.file) {
      const ws = this.app.workspace;
      const leaf = ws.getLeafNear(this.leaf, 'vertical');
      leaf.setViewState({ type: 'markdown', state: { file: this.file.path, mode: other, source: this.sourceFlag }, active: true });
      return;
    }
    this.setMode(other);
  }

  /* --- state -------------------------------------------------------------------------- */

  getState() {
    const s = super.getState();
    if (this.file) { s.mode = this.mode; s.source = this.sourceFlag; }
    return s;
  }

  async setState(state, result) {
    state = state || {};
    const want = state.mode === 'preview' || state.mode === 'source' ? state.mode : null;
    const sameFile = this.file && state.file === this.file.path;
    if (typeof state.source === 'boolean' && state.source !== this.sourceFlag) {
      if (sameFile) this.setSourceFlag(state.source);
      else { this.sourceFlag = state.source; this.cm.dispatch({ effects: [this.config.c.presentation.reconfigure(this.presentationExtension()), this.config.c.frontmatter.reconfigure(this.frontmatterExtension())] }); this.applyClasses(); }
    }
    if (want && !sameFile && want !== this.mode) { this.mode = want; this.showMode(); }
    await super.setState(state, result);
    if (want && want !== this.mode) await this.setMode(want);
  }

  getEphemeralState() {
    const out = {};
    if (!this.file) return out;
    if (this.mode === 'source') {
      const sel = this.cm.state.selection.main;
      out.cursor = { from: this.editor.offsetToPos(sel.anchor), to: this.editor.offsetToPos(sel.head) };
      out.scroll = this.sourceTopLine();
    } else out.scroll = this.previewTopLine();
    return out;
  }

  setEphemeralState(state) {
    if (!state) return;
    if (!this.file) { this.pendingEState = state; return; }
    if (this.mode === 'preview' && this.rendering) { this.pendingEState = state; return; }
    if (state.rename) { this.focusTitle(state.rename); return; }
    if (state.subpath) { this.goToSubpath(state.subpath); return; }
    if (state.match && state.match.matches && state.match.matches.length) {
      const [a, b] = state.match.matches[0];
      this.goToRange(a, b, true);
      return;
    }
    if (typeof state.line === 'number') { this.goToLine(state.line); return; }
    if (state.cursor && this.mode === 'source') {
      const c = state.cursor;
      const off = p => typeof p === 'number' ? Math.min(p, this.cm.state.doc.length) : this.editor.posToOffset(p);
      const a = off(c.from), b = off(c.to == null ? c.from : c.to);
      this.cm.dispatch({ selection: EditorSelection.range(a, b) });
    }
    if (typeof state.scroll === 'number') {
      if (this.mode === 'source') { const line = state.scroll; requestAnimationFrame(() => this.scrollSourceToLine(line)); }
      else this.previewScrollToLine(state.scroll);
    }
    if (state.focus) this.focus();
  }

  /* Remember where the reader was in this note. */
  remember() {
    if (!this.file) return;
    const e = this.getEphemeralState();
    const prev = sessionState.get(this.file.path) || {};
    sessionState.set(this.file.path, Object.assign(prev, e));
  }

  /* --- loading and saving --------------------------------------------------------------- */

  getViewData() {
    const t = this.cm.state.doc.toString();
    return this.eol === '\n' ? t : t.replace(/\n/g, this.eol);
  }

  setViewData(data, clear) {
    const text = norm(data);
    this.data = data;
    if (clear) {
      this.eol = /\r\n/.test(data) ? '\r\n' : '\n';
      const saved = this.file && sessionState.get(this.file.path);
      this.cm.setState(this.createState(text));
      this.restoreFolds();
      let sel = null;
      if (saved && saved.cursor) {
        const a = this.editor.posToOffset(saved.cursor.from), b = this.editor.posToOffset(saved.cursor.to || saved.cursor.from);
        sel = EditorSelection.range(a, b);
      } else sel = EditorSelection.cursor(this.bodyStart());
      this.cm.dispatch({ selection: sel });
      const top = saved && typeof saved.scroll === 'number' ? saved.scroll : 0;
      this.cm.scrollDOM.scrollTop = 0;
      if (top > 0) requestAnimationFrame(() => this.scrollSourceToLine(top));
      this.updateTitle();
      this.renderProperties();
      this.search.close(false);
    } else {
      this.applyExternal(text);
    }
    if (this.mode === 'preview') this.renderPreview();
  }

  clear() {
    this.cm.setState(this.createState(''));
    this.previewSizerEl.replaceChildren();
    this.inlineTitleEl.textContent = '';
    this.metadataEl.replaceChildren();
    this.suggest.close();
  }

  async onUnloadFile(file) {
    this.remember();
    return super.onUnloadFile(file);
  }

  /* Replace the text with a new version from disk, touching only the part
     that differs so the cursor and scroll stay put. */
  applyExternal(text) {
    const cur = this.cm.state.doc.toString();
    if (cur === text) return;
    const d = diffRange(cur, text);
    this.cm.dispatch({
      changes: { from: d.from, to: d.toA, insert: text.slice(d.from, d.toB) },
      annotations: [External.of(true), Transaction.addToHistory.of(false)]
    });
  }

  /* The note changed on disk (Obsidian, a sync client, another tab here, or
     a plugin writing to it). An unmodified editor takes the new text; with
     unsaved edits the two are merged when they touch different parts, and
     otherwise the edits here win. */
  async onModify(file) {
    if (file !== this.file) return;
    const vault = this.app.vault;
    const disk = vault.texts.has(file.path) ? vault.texts.get(file.path) : await vault.read(file);
    if (file !== this.file) return;
    const cur = this.getViewData();
    if (disk === cur) { this.lastSaved = disk; return; }
    if (disk === this.lastSaved) return;
    const base = this.lastSaved == null ? null : norm(this.lastSaved);
    const ours = norm(cur), theirs = norm(disk);
    if (base === null || ours === base) {
      this.applyExternal(theirs);
      this.lastSaved = disk;
      this.data = disk;
      if (this.mode === 'preview') this.renderPreview();
      return;
    }
    const dO = diffRange(base, ours), dT = diffRange(base, theirs);
    const disjoint = dT.toA < dO.from || dT.from > dO.toA;
    if (disjoint) {
      const shift = dT.from > dO.toA ? ours.length - base.length : 0;
      this.cm.dispatch({
        changes: { from: dT.from + shift, to: dT.toA + shift, insert: theirs.slice(dT.from, dT.toB) },
        annotations: [External.of(true), Transaction.addToHistory.of(false)]
      });
      this.lastSaved = disk;
      this.requestSave();
    } else {
      this.lastSaved = disk;
      this.requestSave();
      new Notice('“' + file.basename + '” changed on disk while you were editing it. Your version is kept.');
    }
    if (this.mode === 'preview') this.renderPreview();
  }

  onRename(file, oldPath) {
    super.onRename(file);
    if (oldPath && sessionState.has(oldPath)) { sessionState.set(file.path, sessionState.get(oldPath)); sessionState.delete(oldPath); }
    this.moveFolds(oldPath, file.path);
    this.updateTitle();
  }

  onDelete(file) {
    if (this.deleted) return;
    this.deleted = true;
    this.requestSave.cancel();
    this.lastSaved = this.getViewData();
    this.file = null;
    this.leaf.detachOrEmpty();
  }

  async onClose() {
    this.remember();
    await super.onClose();
    this.search.close(false);
    if (this.previewComponent) { this.previewComponent.unload(); this.previewComponent = null; }
    this.cm.destroy();
  }

  onResize() { this.cm.requestMeasure(); }

  focus() {
    /* Never take the keyboard from an open dialog. */
    if (document.querySelector('.modal-container')) return;
    if (this.mode === 'preview') this.previewEl.focus({ preventScroll: true });
    else if (!this.inlineTitleEl.contains(document.activeElement)) this.cm.focus();
  }

  /* After every change in the editor. */
  onEditorUpdate(u) {
    if (u.docChanged) {
      const external = u.transactions.some(tr => tr.annotation(External));
      if (this.file) {
        const a = frontmatterRange(u.startState.doc), b = frontmatterRange(u.state.doc);
        const fmChanged = (a && a.raw) !== (b && b.raw);
        if (!external) { this.requestSave(); if (fmChanged) this.saveSoon(); }
        if (fmChanged) this.renderProperties();
      }
      this.app.workspace.trigger('editor-change', this.editor, this);
      this.search.onDocChanged();
    }
    if (u.selectionSet) this.app.workspace.trigger('editor-selection-change', this.editor, this);
    this.suggest.onUpdate(u);
  }

  /* Save shortly, so the metadata cache (and the Properties editor) see a
     frontmatter edit made in the text. */
  saveSoon() {
    clearTimeout(this._saveSoon);
    this._saveSoon = setTimeout(() => { this.requestSave.cancel(); this.save(); }, 400);
  }

  /* The first position after the frontmatter. */
  bodyStart() {
    const doc = this.cm.state.doc;
    const fm = frontmatterRange(doc);
    if (!fm) return 0;
    return Math.min(doc.length, fm.to + 1);
  }

  /* --- folds remembered per note ---------------------------------------------------------- */

  foldKey(path) { return 'vault-folds:' + (this.app.meta && this.app.meta.id || this.app.vault.getName()) + ':' + path; }

  saveFoldsSoon() {
    clearTimeout(this._foldTimer);
    const file = this.file;
    this._foldTimer = setTimeout(() => {
      if (!file || file !== this.file) return;
      const lines = getFoldLines(this.cm.state);
      try {
        if (lines.length) localStorage.setItem(this.foldKey(file.path), JSON.stringify({ folds: lines, lines: this.cm.state.doc.lines }));
        else localStorage.removeItem(this.foldKey(file.path));
      } catch (e) { /* storage full or blocked */ }
    }, 300);
  }

  restoreFolds() {
    if (!this.file || !(this.cfg('foldHeading') || this.cfg('foldIndent'))) return;
    let data = null;
    try { data = JSON.parse(localStorage.getItem(this.foldKey(this.file.path)) || 'null'); } catch (e) { data = null; }
    if (data && data.folds) applyFoldLines(this.cm, data.folds, { heading: !!this.cfg('foldHeading'), indent: !!this.cfg('foldIndent') });
  }

  moveFolds(from, to) {
    if (!from) return;
    try {
      const v = localStorage.getItem(this.foldKey(from));
      if (v) { localStorage.setItem(this.foldKey(to), v); localStorage.removeItem(this.foldKey(from)); }
    } catch (e) { /* ignore */ }
  }

  /* --- inline title --------------------------------------------------------------------- */

  setupInlineTitle() {
    const el = this.inlineTitleEl;
    el.addEventListener('keydown', e => {
      if (e.isComposing) return;
      if (e.key === 'Enter') { e.preventDefault(); this.commitTitle(); this.focusBody(); }
      else if (e.key === 'Escape') { e.preventDefault(); this.updateTitle(); this.focusBody(); }
      else if (e.key === 'ArrowDown' || (e.key === 'ArrowRight' && caretAtEnd(el))) { e.preventDefault(); this.commitTitle(); this.focusBody(); }
    });
    el.addEventListener('blur', () => this.commitTitle());
    el.addEventListener('paste', e => {
      e.preventDefault();
      const text = (e.clipboardData.getData('text/plain') || '').replace(/[\r\n]+/g, ' ');
      document.execCommand('insertText', false, text);
    });
    el.addEventListener('input', () => {
      const bad = /[\\/:*?"<>|#^[\]]/.test(el.textContent);
      el.classList.toggle('mod-invalid', bad);
    });
    el.addEventListener('drop', e => e.preventDefault());
  }

  updateTitle() {
    const name = this.file ? this.file.basename : '';
    if (document.activeElement !== this.inlineTitleEl) this.inlineTitleEl.textContent = name;
    this.inlineTitleEl.classList.remove('mod-invalid');
    const t = this.previewSizerEl.querySelector(':scope > .mod-header > .inline-title');
    if (t) t.textContent = name;
  }

  async commitTitle() {
    const el = this.inlineTitleEl;
    const file = this.file;
    if (!file || this.committing) return;
    const name = el.textContent.replace(/\s+/g, ' ').trim();
    if (!name || name === file.basename) { el.textContent = file.basename; el.classList.remove('mod-invalid'); return; }
    this.committing = true;
    try {
      const ok = await this.app.renameFileByName(file, name);
      if (!ok) el.textContent = file.basename;
    } finally { this.committing = false; el.classList.remove('mod-invalid'); }
  }

  focusTitle(where = 'end') {
    if (this.mode === 'preview' || this.cfg('showInlineTitle') === false) { this.startRename(); return; }
    const el = this.inlineTitleEl;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    if (where === 'start') range.collapse(true);
    else if (where !== 'all') range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  focusBody() {
    this.cm.focus();
    this.cm.dispatch({ selection: EditorSelection.cursor(this.bodyStart()), scrollIntoView: true });
  }

  /* --- properties --------------------------------------------------------------------------- */

  /* The Properties block above the text (app.properties draws a
     .metadata-container inside the host, and updates it in place when
     called again). */
  renderProperties() {
    const host = this.metadataEl;
    const show = !!(this.file && this.mode === 'source' && this.isLivePreview() && this.cfg('propertiesInDocument') === 'visible' && this.app.properties);
    if (!show) { host.style.display = 'none'; host.replaceChildren(); return; }
    host.style.display = '';
    try { this.app.properties.render(host, this.file, { editable: true, text: this.getViewData() }); }
    catch (e) { console.error('[vault] properties failed', e); }
  }

  /* --- reading view ---------------------------------------------------------------------- */

  async renderPreview() {
    if (!this.file) { this.previewSizerEl.replaceChildren(); return; }
    const token = this.renderToken = {};
    this.rendering = true;
    const app = this.app;
    const file = this.file;
    const text = norm(this.getViewData());
    const comp = new Component();
    comp.load();
    const sizer = h('div.markdown-preview-sizer.markdown-preview-section', { style: { visibility: 'hidden', position: 'absolute', left: '0', right: '0', top: '0' } });
    this.previewEl.appendChild(sizer);
    const fmMode = this.cfg('propertiesInDocument');
    try {
      if (app.markdown && app.markdown.render) {
        await app.markdown.render(text, sizer, file.path, comp, {
          noFrontmatter: fmMode !== 'source',
          onTaskToggle: (line, checked) => this.setTaskLine(line, checked)
        });
      } else sizer.appendChild(h('pre.markdown-preview-fallback', { text }));
    } catch (e) {
      console.error('[vault] rendering failed', e);
      sizer.replaceChildren(h('pre.markdown-preview-fallback', { text }));
    }
    if (token !== this.renderToken || file !== this.file) { comp.unload(); sizer.remove(); return; }
    const header = h('div.mod-header');
    if (this.cfg('showInlineTitle') !== false) header.appendChild(h('div.inline-title', { text: file.basename }));
    /* Reading view shows the block only when the note has properties. */
    if (fmMode === 'visible' && app.properties && frontmatterRange(this.cm.state.doc)) {
      const props = h('div.metadata-host');
      header.appendChild(props);
      try { await Promise.resolve(app.properties.render(props, file, { editable: true, text })); }
      catch (e) { console.error('[vault] properties failed', e); }
    }
    if (token !== this.renderToken) { comp.unload(); sizer.remove(); return; }
    sizer.prepend(h('div.markdown-preview-pusher', { style: { width: '1px', height: '0.1px', marginBottom: '0px' } }), header);
    sizer.appendChild(h('div.mod-footer'));
    const scroll = this.previewEl.scrollTop;
    const old = this.previewSizerEl;
    sizer.removeAttribute('style');
    old.replaceWith(sizer);
    this.previewSizerEl = sizer;
    this.previewEl.scrollTop = scroll;
    if (this.previewComponent) this.previewComponent.unload();
    this.previewComponent = comp;
    this.rendering = false;
    this.search.onPreviewRendered();
    app.workspace.trigger('markdown-preview-rendered', this);
    if (this.pendingEState) { const e = this.pendingEState; this.pendingEState = null; this.setEphemeralState(e); }
  }

  /* A checkbox ticked in reading view. `line` is zero-based. */
  setTaskLine(line, checked) {
    const doc = this.cm.state.doc;
    if (line < 0 || line >= doc.lines) return;
    const l = doc.line(line + 1);
    const p = parsePrefix(l.text);
    if (p.task === null) return;
    const at = l.from + p.taskStart + 1;
    const want = checked === undefined ? (p.task === ' ' ? 'x' : ' ') : (checked ? 'x' : ' ');
    this.cm.dispatch({ changes: { from: at, to: at + 1, insert: want }, userEvent: 'input' });
  }

  /* Rendered elements that start at a known source line: the renderer's
     data-line attributes when it has them, else the headings in order. */
  previewAnchors() {
    const sizer = this.previewSizerEl;
    const withLine = Array.from(sizer.querySelectorAll('[data-line]')).filter(el => !el.closest('.markdown-embed'));
    if (withLine.length) return withLine.map(el => ({ line: +el.dataset.line, el })).filter(a => !isNaN(a.line));
    const heads = (parseMarkdown(norm(this.getViewData())).headings || []);
    const els = Array.from(sizer.querySelectorAll('h1, h2, h3, h4, h5, h6')).filter(el => !el.closest('.markdown-embed, .mod-header, .callout, blockquote, .markdown-preview-pusher'));
    const out = [];
    for (let i = 0; i < Math.min(heads.length, els.length); i++) out.push({ line: heads[i].position.start.line, el: els[i] });
    return out;
  }

  previewTopLine() {
    const top = this.previewEl.scrollTop;
    if (top <= 2) return 0;
    const base = this.previewEl.getBoundingClientRect().top;
    let best = 0;
    for (const a of this.previewAnchors()) {
      const y = a.el.getBoundingClientRect().top - base;
      if (y <= 4) best = a.line; else break;
    }
    return best;
  }

  previewScrollToLine(line, flash) {
    const el = this.previewEl;
    if (!line || line <= 0) { if (!flash) el.scrollTop = 0; return null; }
    let target = null;
    for (const a of this.previewAnchors()) { if (a.line <= line) target = a; else break; }
    if (!target) {
      const lines = Math.max(1, this.cm.state.doc.lines);
      el.scrollTop = (el.scrollHeight - el.clientHeight) * (line / lines);
      return null;
    }
    const base = el.getBoundingClientRect().top;
    el.scrollTop += target.el.getBoundingClientRect().top - base - 8;
    return target.el;
  }

  /* --- scrolling the editor --------------------------------------------------------------- */

  sourceTopLine() {
    const cm = this.cm;
    if (!this.sourceEl.isConnected || this.sourceEl.style.display === 'none') return this.lastSourceTop || 0;
    const top = cm.scrollDOM.getBoundingClientRect().top;
    const h0 = top - cm.documentTop;
    if (cm.scrollDOM.scrollTop <= 2 || h0 <= 0) return (this.lastSourceTop = 0);
    const block = cm.lineBlockAtHeight(h0);
    return (this.lastSourceTop = cm.state.doc.lineAt(block.from).number - 1);
  }

  scrollSourceToLine(line) {
    const cm = this.cm;
    if (!line || line <= 0) { cm.scrollDOM.scrollTop = 0; return; }
    const doc = cm.state.doc;
    this.scrollLineToTop(doc.line(Math.min(doc.lines, line + 1)).from);
  }

  /* Put the top of the line holding `pos` (spacing above a heading
     included) at the top of the editor. Lines far away only have estimated
     heights until drawn, so it measures again once they are. */
  scrollLineToTop(pos, passes = 3) {
    const cm = this.cm;
    cm.requestMeasure({
      read: view => {
        const delta = view.documentTop + view.lineBlockAt(Math.min(pos, view.state.doc.length)).top - view.scrollDOM.getBoundingClientRect().top;
        return { delta, target: view.scrollDOM.scrollTop + delta };
      },
      write: m => {
        if (Math.abs(m.delta) < 1) return;
        cm.scrollDOM.scrollTop = m.target;
        if (passes > 1) requestAnimationFrame(() => this.scrollLineToTop(pos, passes - 1));
      }
    });
  }

  flashSource(from, to) {
    this.cm.dispatch({ effects: flashEffect.of({ from, to }) });
    clearTimeout(this._flash);
    this._flash = setTimeout(() => { if (this.cm) this.cm.dispatch({ effects: flashEffect.of(null) }); }, 1500);
  }

  flashElement(el) {
    if (!el) return;
    el.classList.add('is-flashing');
    setTimeout(() => el.classList.remove('is-flashing'), 1500);
  }

  goToSubpath(subpath) {
    const text = norm(this.getViewData());
    const cache = parseMarkdown(text);
    const r = resolveSubpath(cache, subpath, text);
    if (!r) return;
    const doc = this.cm.state.doc;
    const startLine = doc.lineAt(Math.min(r.start, doc.length)).number - 1;
    if (this.mode === 'source') {
      const flashTo = r.type === 'heading' ? r.start : r.block.position.end.offset;
      /* The cursor goes to the start of the heading or block, as in Obsidian. */
      this.cm.dispatch({ selection: EditorSelection.cursor(Math.min(r.start, doc.length)) });
      requestAnimationFrame(() => {
        this.scrollLineToTop(Math.min(r.start, doc.length));
        this.flashSource(r.start, flashTo);
      });
    } else {
      let el = null;
      if (r.type === 'heading') {
        const want = r.heading.heading.trim();
        el = Array.from(this.previewSizerEl.querySelectorAll('h1, h2, h3, h4, h5, h6')).find(e => !e.closest('.markdown-embed') && (e.dataset.heading === want || e.textContent.trim() === want));
        if (el) this.previewEl.scrollTop += el.getBoundingClientRect().top - this.previewEl.getBoundingClientRect().top - 8;
      }
      if (!el) el = this.previewScrollToLine(startLine, true);
      if (r.type === 'block') {
        const id = r.block.id;
        const found = this.previewSizerEl.querySelector('[data-block-id="' + CSS.escape(id) + '"], [id="^' + CSS.escape(id) + '"]');
        if (found) { found.scrollIntoView({ block: 'center' }); el = found; }
      }
      this.flashElement(el && (el.closest('.markdown-preview-sizer > div') || el));
    }
  }

  goToLine(line) {
    const doc = this.cm.state.doc;
    const n = Math.max(0, Math.min(doc.lines - 1, line));
    if (this.mode === 'source') {
      const l = doc.line(n + 1);
      this.cm.dispatch({ selection: EditorSelection.cursor(l.from), effects: EditorView.scrollIntoView(l.from, { y: 'center' }) });
      this.flashSource(l.from, l.from);
    } else this.flashElement(this.previewScrollToLine(n, true));
  }

  goToRange(a, b) {
    const doc = this.cm.state.doc;
    a = Math.min(a, doc.length); b = Math.min(b, doc.length);
    if (this.mode === 'source') {
      this.cm.dispatch({ selection: EditorSelection.range(a, b), effects: EditorView.scrollIntoView(a, { y: 'center' }) });
    } else this.flashElement(this.previewScrollToLine(doc.lineAt(a).number - 1, true));
  }

  /* --- links ---------------------------------------------------------------------------- */

  openLink(info, newLeaf) {
    const app = this.app;
    const source = this.file ? this.file.path : '';
    if (!info) return false;
    if (info.type === 'internal') { app.workspace.openLinkText(info.link, source, newLeaf || false); return true; }
    if (info.type === 'external') {
      const m = /^obsidian:\/\/open\?(.*)$/i.exec(info.link);
      if (m) {
        const params = new URLSearchParams(m[1]);
        const f = params.get('file') || params.get('path');
        if (f) { app.workspace.openLinkText(f, '', newLeaf || false); return true; }
      }
      window.open(info.link, '_blank', 'noopener');
      return true;
    }
    if (info.type === 'tag') {
      if (app.search && app.search.open) app.search.open('tag:' + info.link);
      else app.commands.execute('global-search:open');
      return true;
    }
    if (info.type === 'footnote') {
      const doc = this.cm.state.doc;
      const want = '[^' + info.link + ']:';
      for (let n = 1; n <= doc.lines; n++) {
        const l = doc.line(n);
        if (l.text.startsWith(want)) {
          this.cm.dispatch({ selection: EditorSelection.cursor(l.from + want.length + (l.text[want.length] === ' ' ? 1 : 0)), scrollIntoView: true });
          this.flashSource(l.from, l.from);
          return true;
        }
      }
      return false;
    }
    return false;
  }

  followLinkUnderCursor(newLeaf) {
    const info = linkUnderCursor(this.cm.state);
    return info ? this.openLink(info, newLeaf) : false;
  }

  /* Ctrl/Cmd+click on a link. The live-preview extension handles links it
     recognises first (and plain clicks and hovering in live preview); this
     catches the rest, such as footnote references and bare URLs. */
  onEditorMouseDown(e) {
    if (e.button !== 0 || !(e.ctrlKey || e.metaKey) || (e.altKey && e.shiftKey)) return false;
    const pos = this.cm.posAtCoords({ x: e.clientX, y: e.clientY });
    if (pos == null) return false;
    const info = linkUnderCursor(this.cm.state, pos);
    if (!info) return false;
    e.preventDefault();
    this.openLink(info, Workspace.leafFromEvent(e));
    return true;
  }

  /* --- the pane's "More options" menu ------------------------------------------------------ */

  onPaneMenu(menu, source) {
    const file = this.file;
    const app = this.app;
    if (file) {
      menu.addItem(i => i.setSection('view').setTitle(this.mode === 'source' ? 'Reading view' : 'Editing view').setIcon(this.mode === 'source' ? 'book-open' : 'edit-3').onClick(() => this.toggleMode()));
      if (this.mode === 'source') menu.addItem(i => i.setSection('view').setTitle('Source mode').setIcon('code-2').setChecked(this.sourceFlag).onClick(() => this.toggleSource()));
      menu.addItem(i => i.setSection('find').setTitle('Find...').setIcon('search').onClick(() => this.search.open(false)));
      if (this.mode === 'source') menu.addItem(i => i.setSection('find').setTitle('Replace...').setIcon('replace').onClick(() => this.search.open(true)));
    }
    super.onPaneMenu(menu, source);
    if (!file) return;
    const titles = new Set(menu.items.filter(i => i !== 'separator' && i.titleEl).map(i => i.titleEl.textContent.toLowerCase().replace(/[.…\s]+$/, '')));
    const add = (section, title, iconName, cb, warning) => {
      if (titles.has(title.toLowerCase().replace(/[.…\s]+$/, ''))) return;
      menu.addItem(i => { i.setSection(section).setTitle(title).setIcon(iconName).onClick(cb); if (warning) i.setWarning(true); });
    };
    add('action', 'Rename...', 'pencil', () => this.focusTitle('all'));
    add('action', 'Move file to...', 'folder-input', () => moveFileModal(app, file));
    add('info', 'Copy path', 'clipboard-copy', () => app.commands.execute('workspace:copy-path'));
    add('info', 'Reveal file in navigation', 'locate', () => app.workspace.trigger('reveal-file', file));
    add('danger', 'Delete file', 'trash-2', () => app.fileManager.trashFile(file), true);
  }
}

function caretAtEnd(el) {
  const sel = window.getSelection();
  if (!sel.rangeCount || !sel.isCollapsed) return false;
  const r = document.createRange();
  r.selectNodeContents(el);
  r.setStart(sel.focusNode, sel.focusOffset);
  return r.toString().length === 0;
}

/* Pick a folder and move the note there, keeping links up to date. */
export function moveFileModal(app, file) {
  const folders = app.vault.getAllFolders(true).filter(f => !f.path.startsWith(app.vault.configDir) && f.path !== '.trash' && !f.path.startsWith('.trash/'));
  const modal = new SuggestModal(app, {
    placeholder: 'Type a folder',
    getSuggestions: q => folders.filter(f => (f.path || '/').toLowerCase().includes(q.toLowerCase())).slice(0, 200),
    renderSuggestion: (f, el) => { el.textContent = f.path || '/'; },
    onChoose: async f => {
      try { await app.fileManager.renameFile(file, joinPath(f.path, file.name)); }
      catch (e) { new Notice(e.message || String(e)); }
    }
  });
  modal.open();
}
