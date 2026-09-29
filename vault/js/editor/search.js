/* Find and replace in the current note: Obsidian's bar at the top of the
   view (.document-search-container). In the editor it uses CodeMirror's
   search (matches are highlighted, the current one selected); in reading
   view it highlights matches in the rendered page, where replacing isn't
   offered. */

import {
  SearchQuery, setSearchQuery, openSearchPanel, closeSearchPanel, findNext, findPrevious, replaceNext, replaceAll,
  EditorSelection, EditorView
} from '../../../assets/vendor/codemirror/codemirror.js';
import { h, icon } from '../core/ui.js';

export class DocumentSearch {
  constructor(view) {
    this.view = view;
    this.caseSensitive = false;
    this.regexp = false;
    this.previewMatches = [];
    this.previewIndex = -1;

    const iconButton = (name, label, cb, cls = '') => {
      const el = h('div.document-search-button.clickable-icon' + cls, { 'aria-label': label, title: label, role: 'button', tabindex: '-1' }, icon(name));
      el.addEventListener('mousedown', e => e.preventDefault());
      el.addEventListener('click', cb);
      return el;
    };
    this.searchInput = h('input.document-search-input-el', { type: 'search', placeholder: 'Find...', spellcheck: false, enterkeyhint: 'search' });
    this.replaceInput = h('input.document-replace-input-el', { type: 'text', placeholder: 'Replace...', spellcheck: false, enterkeyhint: 'done' });
    this.countEl = h('div.document-search-count');
    this.caseButton = iconButton('case-sensitive', 'Match case', () => { this.caseSensitive = !this.caseSensitive; this.caseButton.classList.toggle('is-active', this.caseSensitive); this.update(true); }, '.mod-case');
    this.regexButton = iconButton('regex', 'Use regular expression', () => { this.regexp = !this.regexp; this.regexButton.classList.toggle('is-active', this.regexp); this.update(true); }, '.mod-regex');
    this.replaceToggle = iconButton('replace', 'Toggle replace', () => this.setReplace(!this.replacing));
    this.clearButton = h('div.search-input-clear-button', { 'aria-label': 'Clear search', onclick: () => { this.searchInput.value = ''; this.update(true); this.searchInput.focus(); } });

    this.replaceEl = h('div.document-replace',
      h('div.search-input-container.document-replace-input', this.replaceInput),
      h('div.document-replace-buttons',
        h('button.document-replace-button', { text: 'Replace', onclick: () => this.replace() }),
        h('button.document-replace-button', { text: 'Replace all', onclick: () => this.replaceAll() })));
    this.containerEl = h('div.document-search-container', { style: { display: 'none' } },
      h('div.document-search',
        this.replaceToggle,
        h('div.search-input-container.document-search-input', this.searchInput, this.clearButton),
        this.countEl,
        h('div.document-search-buttons',
          this.caseButton, this.regexButton,
          iconButton('arrow-up', 'Previous (Shift+Enter)', () => this.find(-1)),
          iconButton('arrow-down', 'Next (Enter)', () => this.find(1))),
        iconButton('x', 'Exit search', () => this.close(true), '.document-search-close-button')),
      this.replaceEl);

    this.searchInput.addEventListener('input', () => this.update(false));
    this.searchInput.addEventListener('keydown', e => this.onKey(e, false));
    this.replaceInput.addEventListener('keydown', e => this.onKey(e, true));
    /* Escape anywhere in the bar; buttons don't take the focus from the inputs. */
    this.containerEl.addEventListener('keydown', e => { if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); this.close(true); } });
    this.replaceEl.querySelectorAll('button').forEach(b => b.addEventListener('mousedown', e => e.preventDefault()));
  }

  get isOpen() { return this.containerEl.style.display !== 'none'; }

  open(replace) {
    const view = this.view;
    const mode = view.getMode();
    const wasOpen = this.isOpen;
    this.containerEl.style.display = '';
    this.setReplace(!!replace && mode === 'source');
    this.replaceToggle.style.display = mode === 'source' ? '' : 'none';
    if (mode === 'source') {
      const sel = view.cm.state.selection.main;
      const text = view.cm.state.sliceDoc(sel.from, sel.to);
      if (text && !text.includes('\n')) this.searchInput.value = this.regexp ? text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : text;
      this.origin = sel.from;
      if (!wasOpen) openSearchPanel(view.cm);
    }
    this.update(true, true);
    (replace && mode === 'source' && this.searchInput.value ? this.replaceInput : this.searchInput).focus();
    this.searchInput.select();
  }

  setReplace(on) {
    this.replacing = on;
    this.replaceEl.style.display = on ? '' : 'none';
    this.containerEl.classList.toggle('mod-replace-mode', on);
    this.replaceToggle.classList.toggle('is-active', on);
  }

  close(focus) {
    if (!this.isOpen) return;
    this.containerEl.style.display = 'none';
    const view = this.view;
    if (view.cm) {
      view.cm.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: '' })) });
      closeSearchPanel(view.cm);
    }
    this.clearPreview();
    if (focus) view.focus();
  }

  query() {
    return new SearchQuery({ search: this.searchInput.value, caseSensitive: this.caseSensitive, regexp: this.regexp, replace: this.replaceInput.value });
  }

  onKey(e, inReplace) {
    if (e.isComposing) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.close(true); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inReplace) { if ((e.ctrlKey || e.metaKey) && e.altKey) this.replaceAll(); else this.replace(); }
      else this.find(e.shiftKey ? -1 : 1);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'f' || e.key === 'F')) { e.preventDefault(); e.stopPropagation(); this.searchInput.select(); }
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'h' || e.key === 'H') && this.view.getMode() === 'source') { e.preventDefault(); e.stopPropagation(); this.setReplace(true); this.replaceInput.focus(); }
  }

  /* The query changed: highlight, and (while typing) jump to the first
     match after where the search started. */
  update(keepPlace, opening) {
    const view = this.view;
    this.searchInput.classList.remove('is-invalid');
    if (view.getMode() === 'preview') return this.searchPreview();
    const cm = view.cm;
    const q = this.query();
    if (this.regexp && this.searchInput.value && !q.valid) this.searchInput.classList.add('is-invalid');
    cm.dispatch({ effects: setSearchQuery.of(q) });
    if (q.valid && this.searchInput.value && (!keepPlace || opening)) {
      const start = this.origin != null ? this.origin : cm.state.selection.main.from;
      const m = nextMatch(cm.state, q, start);
      if (m) cm.dispatch({ selection: EditorSelection.range(m.from, m.to), effects: EditorView.scrollIntoView(m.from, { y: 'center' }) });
    }
    this.updateCount();
  }

  updateCount() {
    const view = this.view;
    if (!this.searchInput.value) { this.countEl.textContent = ''; return; }
    if (view.getMode() === 'preview') {
      this.countEl.textContent = this.previewMatches.length ? (this.previewIndex + 1) + ' / ' + this.previewMatches.length : 'No results';
      return;
    }
    const state = view.cm.state;
    const q = this.query();
    if (!q.valid) { this.countEl.textContent = ''; return; }
    const sel = state.selection.main;
    let n = 0, cur = 0;
    const cursor = q.getCursor(state);
    for (let r = cursor.next(); !r.done; r = cursor.next()) {
      n++;
      if (r.value.from === sel.from && r.value.to === sel.to) cur = n;
      if (n > 9999) break;
    }
    this.countEl.textContent = n ? (cur ? cur + ' / ' + n : n + (n === 1 ? ' result' : ' results')) : 'No results';
  }

  find(dir) {
    const view = this.view;
    if (view.getMode() === 'preview') return this.stepPreview(dir);
    const cm = view.cm;
    cm.dispatch({ effects: setSearchQuery.of(this.query()) });
    (dir > 0 ? findNext : findPrevious)(cm);
    this.origin = cm.state.selection.main.from;
    this.updateCount();
  }

  replace() {
    const cm = this.view.cm;
    if (!cm || this.view.getMode() !== 'source') return;
    cm.dispatch({ effects: setSearchQuery.of(this.query()) });
    const sel = cm.state.selection.main;
    const m = nextMatch(cm.state, this.query(), sel.from);
    if (!m || m.from !== sel.from || m.to !== sel.to) { findNext(cm); this.updateCount(); return; }
    replaceNext(cm);
    this.updateCount();
  }

  replaceAll() {
    const cm = this.view.cm;
    if (!cm || this.view.getMode() !== 'source') return;
    cm.dispatch({ effects: setSearchQuery.of(this.query()) });
    replaceAll(cm);
    this.updateCount();
  }

  /* The editor changed while the bar is open. */
  onDocChanged() { if (this.isOpen && this.view.getMode() === 'source') this.updateCount(); }

  /* --- reading view ----------------------------------------------------------------- */

  clearPreview() {
    for (const mark of this.previewMatches) {
      const parent = mark.parentNode;
      if (!parent) continue;
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parent.normalize();
    }
    this.previewMatches = [];
    this.previewIndex = -1;
  }

  searchPreview() {
    this.clearPreview();
    const text = this.searchInput.value;
    const root = this.view.previewSizerEl;
    if (!text || !root) { this.updateCount(); return; }
    let re;
    try { re = new RegExp(this.regexp ? text : text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), this.caseSensitive ? 'g' : 'gi'); }
    catch (e) { this.searchInput.classList.add('is-invalid'); this.updateCount(); return; }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => n.parentElement && n.parentElement.closest('.inline-title, .metadata-container, script, style, .katex-mathml') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    const nodes = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);
    for (const node of nodes) {
      const value = node.nodeValue;
      re.lastIndex = 0;
      let m, last = 0;
      const frag = document.createDocumentFragment();
      let found = false;
      while ((m = re.exec(value))) {
        if (!m[0].length) { re.lastIndex++; continue; }
        found = true;
        frag.append(value.slice(last, m.index));
        const mark = h('mark.obsidian-search-match-highlight', { text: m[0] });
        frag.append(mark);
        this.previewMatches.push(mark);
        last = m.index + m[0].length;
        if (this.previewMatches.length > 5000) break;
      }
      if (!found) continue;
      frag.append(value.slice(last));
      node.parentNode.replaceChild(frag, node);
    }
    if (this.previewMatches.length) this.stepPreview(0);
    else this.updateCount();
  }

  stepPreview(dir) {
    const list = this.previewMatches;
    if (!list.length) return this.updateCount();
    if (this.previewIndex >= 0 && list[this.previewIndex]) list[this.previewIndex].classList.remove('is-active');
    this.previewIndex = dir === 0 ? 0 : (this.previewIndex + dir + list.length) % list.length;
    const el = list[this.previewIndex];
    el.classList.add('is-active');
    el.scrollIntoView({ block: 'center' });
    this.updateCount();
  }

  /* The reading view re-rendered: search it again. */
  onPreviewRendered() { if (this.isOpen && this.view.getMode() === 'preview') this.searchPreview(); }

  /* Switching between editing and reading keeps the bar and the query. */
  onModeChanged() {
    if (!this.isOpen) return;
    const mode = this.view.getMode();
    this.replaceToggle.style.display = mode === 'source' ? '' : 'none';
    if (mode !== 'source') this.setReplace(false);
    if (mode === 'source') { this.clearPreview(); openSearchPanel(this.view.cm); }
    this.update(true);
  }
}

function nextMatch(state, query, from) {
  let cursor = query.getCursor(state, from);
  let r = cursor.next();
  if (r.done) { cursor = query.getCursor(state, 0, from); r = cursor.next(); }
  return r.done ? null : r.value;
}
