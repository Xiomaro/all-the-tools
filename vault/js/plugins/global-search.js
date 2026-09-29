/* Search: the search pane in the left sidebar, with Obsidian's search
   language (see panes/search-query.js), live results grouped by file,
   and the options Obsidian keeps in the view's state in workspace.json
   (matchingCase, explainSearch, collapseAll, extraContext, sortOrder).

   Also sets app.search for other features:
     app.search.open(query)            show the pane with a query
     app.search.matches(query, opts)   [{ file, matches, nameMatches, content }]
     app.search.compile(query, opts)   { test(file) } for checking many files
     app.search.parse(query)           the query as a tree */

import { View } from '../core/workspace.js';
import { h, clickableIcon, Setting, Menu, debounce } from '../core/ui.js';
import { parseQuery, explainQuery, compileQuery, searchVault } from '../panes/search-query.js';
import { ResultList } from '../panes/results.js';
import { FILE_SORTS, fileComparator, sortMenu, searchBox, copyText, stored, store, vaultKey, nextFrame } from '../panes/util.js';

export const VIEW_TYPE_SEARCH = 'search';

/* The operators offered when the box is empty, as in Obsidian. */
const OPTIONS = [
  ['path:', 'match path of the file'],
  ['file:', 'match file name'],
  ['tag:', 'search for tags'],
  ['line:', 'search keywords on same line'],
  ['section:', 'search keywords under same heading'],
  ['[property]', 'match property']
];

class SearchView extends View {
  constructor(leaf) {
    super(leaf);
    this.icon = 'search';
    this.state = { query: '', matchingCase: false, explainSearch: false, collapseAll: false, extraContext: false, sortOrder: 'alphabetical' };
    this.showParams = false;
    this.results = [];
    this.token = null;
    this.contentEl.classList.add('search-pane');
    this.contentEl.tabIndex = -1;

    this.box = searchBox({
      placeholder: 'Search...',
      cls: 'global-search-input-container',
      onInput: v => { this.state.query = v; this.hideSuggestions(); this.requestSearch(); this.saveState(); if (!v) this.showSuggestions(); },
      onKeyDown: e => this.onKeyDown(e)
    });
    this.caseButton = clickableIcon('case-sensitive', 'Match case', () => this.setOption('matchingCase', !this.state.matchingCase), 'input-right-decorator');
    this.box.containerEl.appendChild(this.caseButton);
    this.box.inputEl.addEventListener('focus', () => { if (!this.box.getValue()) this.showSuggestions(); });
    this.box.inputEl.addEventListener('blur', () => setTimeout(() => this.hideSuggestions(), 150));

    this.paramsButton = clickableIcon('sliders-horizontal', 'Search settings', () => { this.showParams = !this.showParams; this.renderParams(); }, 'nav-action-button');
    this.paramsEl = h('div.search-params');
    this.infoEl = h('div.search-info-container');
    this.countEl = h('div.search-results-result-count');
    this.sortButton = clickableIcon('arrow-up-narrow-wide', 'Change sort order', e => sortMenu(e, FILE_SORTS, this.state.sortOrder, id => this.setOption('sortOrder', id)), 'nav-action-button');
    this.moreButton = clickableIcon('more-horizontal', 'More options', e => this.showMoreMenu(e), 'nav-action-button');
    this.resultsInfoEl = h('div.search-results-info', this.countEl, h('div.search-results-info-buttons', this.sortButton, this.moreButton));
    this.list = new ResultList(this.app, { cls: 'mod-global-search', hoverSource: 'search' });
    this.emptyEl = h('div.search-empty-state', { text: 'No matches found.' });
    this.suggestEl = h('div.suggestion-container.mod-search-suggestion');

    this.contentEl.append(
      h('div.search-row', this.box.containerEl, this.paramsButton),
      this.paramsEl, this.infoEl, this.resultsInfoEl, this.list.containerEl, this.emptyEl);
    this.requestSearch = debounce(() => this.search(), 250);
    this.recordRecent = debounce(() => this.remember(this.state.query), 2000);
    this.refresh = debounce(() => { if (this.state.query.trim()) this.search(true); }, 800);
  }

  getViewType() { return VIEW_TYPE_SEARCH; }
  getDisplayText() { return 'Search'; }
  getState() { return Object.assign({}, this.state); }

  async setState(state) {
    if (!state) return;
    for (const k of Object.keys(this.state)) if (state[k] !== undefined) this.state[k] = state[k];
    if (!FILE_SORTS.some(s => s[0] === this.state.sortOrder)) this.state.sortOrder = 'alphabetical';
    this.box.setValue(this.state.query || '');
    this.renderParams();
    this.list.collapseAll = !!this.state.collapseAll;
    this.list.extraContext = !!this.state.extraContext;
    this.search();
  }

  async onOpen() {
    const refresh = () => this.refresh();
    this.registerEvent(this.app.vault.on('modify', refresh));
    this.registerEvent(this.app.vault.on('create', refresh));
    this.registerEvent(this.app.vault.on('delete', refresh));
    this.registerEvent(this.app.vault.on('rename', refresh));
    this.registerEvent(this.app.metadataCache.on('resolved', refresh));
    this.renderParams();
    this.search();
  }

  async onClose() { this.token = null; this.list.destroy(); this.suggestEl.remove(); }

  focus() { this.box.inputEl.focus(); }
  getQuery() { return this.state.query; }

  setQuery(query) {
    this.state.query = query;
    this.box.setValue(query);
    this.saveState();
    this.search();
    if (query) this.remember(query);
  }

  setOption(key, value) {
    this.state[key] = value;
    this.renderParams();
    if (key === 'collapseAll' || key === 'extraContext') this.list.setOptions({ collapseAll: this.state.collapseAll, extraContext: this.state.extraContext });
    else this.search();
    this.saveState();
  }

  saveState() { this.app.workspace.saveLayout && this.app.workspace.saveLayout(); }

  renderParams() {
    this.caseButton.classList.toggle('is-active', !!this.state.matchingCase);
    this.paramsButton.classList.toggle('is-active', this.showParams);
    this.paramsEl.replaceChildren();
    this.paramsEl.style.display = this.showParams ? '' : 'none';
    if (this.showParams) {
      const toggle = (name, key) => new Setting(this.paramsEl).setName(name).setClass('mod-toggle')
        .addToggle(t => t.setValue(!!this.state[key]).onChange(v => this.setOption(key, v)));
      toggle('Match case', 'matchingCase');
      toggle('Explain search term', 'explainSearch');
      toggle('Collapse results', 'collapseAll');
      toggle('Show more context', 'extraContext');
    }
    this.renderExplain();
  }

  renderExplain() {
    const ast = parseQuery(this.state.query);
    const on = this.state.explainSearch && ast;
    this.infoEl.style.display = on ? '' : 'none';
    this.infoEl.replaceChildren(...(on ? explainQuery(ast).map(line => h('div.search-info-more', { text: line })) : []));
  }

  onKeyDown(e) {
    if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      const items = this.suggestEl.isConnected ? this.suggestItems || [] : [];
      if (items[this.suggestIndex]) { items[this.suggestIndex].pick(); return; }
      this.hideSuggestions();
      this.requestSearch.run();
      this.remember(this.state.query);
    } else if (e.key === 'Escape') {
      this.hideSuggestions();
    } else if (e.key === 'ArrowDown' && this.suggestEl.isConnected) {
      e.preventDefault();
      this.moveSuggestion(1);
    } else if (e.key === 'ArrowUp' && this.suggestEl.isConnected) {
      e.preventDefault();
      this.moveSuggestion(-1);
    }
  }

  /* --- running a search --------------------------------------------------------------- */

  async search(keepScroll) {
    this.requestSearch.cancel();
    const token = this.token = {};
    const query = this.state.query;
    this.renderExplain();
    const compiled = compileQuery(this.app, query, { matchCase: this.state.matchingCase });
    if (compiled.empty) {
      this.results = [];
      this.list.setResults([]);
      this.resultsInfoEl.style.display = 'none';
      this.emptyEl.style.display = 'none';
      return;
    }
    this.contentEl.classList.add('is-searching');
    const files = this.app.vault.getFiles();
    const out = [];
    let t0 = performance.now();
    for (let i = 0; i < files.length; i++) {
      const r = compiled.test(files[i]);
      if (r) out.push(r);
      if ((i & 31) === 0 && performance.now() - t0 > 12) {
        await nextFrame();
        if (token !== this.token) return;
        t0 = performance.now();
      }
    }
    if (token !== this.token) return;
    this.contentEl.classList.remove('is-searching');
    const cmp = fileComparator(this.state.sortOrder);
    out.sort((a, b) => cmp(a.file, b.file));
    this.results = out;
    const scroller = this.contentEl;
    const top = scroller.scrollTop;
    this.list.setResults(out);
    if (keepScroll) scroller.scrollTop = top;
    this.resultsInfoEl.style.display = '';
    this.countEl.textContent = out.length + (out.length === 1 ? ' result' : ' results');
    this.emptyEl.style.display = out.length ? 'none' : '';
    if (!keepScroll) this.recordRecent();
  }

  showMoreMenu(e) {
    const menu = new Menu();
    menu.addItem(i => i.setTitle('Copy search results').setIcon('copy').onClick(() => {
      const lines = this.results.map(r => '- ' + this.app.fileManager.generateMarkdownLink(r.file, ''));
      copyText(lines.join('\n'), 'Copied ' + this.results.length + ' results');
    }));
    this.app.workspace.trigger('search:results-menu', menu, this);
    const r = e.currentTarget.getBoundingClientRect();
    menu.showAtPosition({ x: r.left, y: r.bottom + 4 });
  }

  /* --- recent searches and operator hints ------------------------------------------------ */

  recent() { return stored(vaultKey(this.app, 'recent-searches'), []); }

  remember(query) {
    query = (query || '').trim();
    if (!query) return;
    store(vaultKey(this.app, 'recent-searches'), [query].concat(this.recent().filter(q => q !== query)).slice(0, 10));
  }

  showSuggestions() {
    const items = [];
    const add = (el, pick) => { el.pick = pick; el.addEventListener('mousedown', e => { e.preventDefault(); pick(); }); items.push(el); return el; };
    const kids = [h('div.suggestion-group-title', { text: 'Search options' })];
    for (const [op, desc] of OPTIONS) {
      kids.push(add(h('div.suggestion-item.mod-complex', h('div.suggestion-content', h('span.search-suggest-item-mod', { text: op }), h('span.search-suggest-info-text', { text: ' ' + desc }))),
        () => this.insertOperator(op)));
    }
    const recent = this.recent();
    if (recent.length) {
      kids.push(h('div.suggestion-group-title', h('span', { text: 'History' }),
        h('span.search-suggest-clear', { text: 'Clear', onmousedown: e => { e.preventDefault(); store(vaultKey(this.app, 'recent-searches'), []); this.showSuggestions(); } })));
      for (const q of recent) kids.push(add(h('div.suggestion-item', { text: q }), () => { this.setQuery(q); this.hideSuggestions(); }));
    }
    this.suggestItems = items;
    this.suggestIndex = -1;
    this.suggestEl.replaceChildren(h('div.suggestion', kids));
    if (!this.contentEl.isConnected || !this.contentEl.offsetParent) return;
    const r = this.box.containerEl.getBoundingClientRect();
    Object.assign(this.suggestEl.style, { left: r.left + 'px', top: (r.bottom + 4) + 'px', width: Math.max(260, r.width) + 'px' });
    if (!this.suggestEl.isConnected) document.body.appendChild(this.suggestEl);
  }

  moveSuggestion(d) {
    const items = this.suggestItems || [];
    if (!items.length) return;
    this.suggestIndex = (this.suggestIndex + d + items.length) % items.length;
    items.forEach((el, i) => el.classList.toggle('is-selected', i === this.suggestIndex));
  }

  hideSuggestions() { this.suggestEl.remove(); this.suggestIndex = -1; }

  insertOperator(op) {
    const input = this.box.inputEl;
    const v = input.value;
    const at = input.selectionStart == null ? v.length : input.selectionStart;
    const sep = at > 0 && !/\s$/.test(v.slice(0, at)) ? ' ' : '';
    const next = v.slice(0, at) + sep + op + v.slice(at);
    this.box.setValue(next);
    this.state.query = next;
    const caret = op === '[property]' ? at + sep.length + 1 : at + sep.length + op.length;
    input.focus();
    if (op === '[property]') input.setSelectionRange(caret, caret + 'property'.length);
    else input.setSelectionRange(caret, caret);
    this.hideSuggestions();
    this.requestSearch();
  }
}

export default {
  id: 'global-search',
  name: 'Search',
  description: 'Search every note in the vault.',
  async onload(plugin) {
    const app = plugin.app;
    plugin.registerView(VIEW_TYPE_SEARCH, leaf => new SearchView(leaf));

    const openSearch = async (query, focus = true) => {
      const leaf = await app.workspace.ensureSideLeaf(VIEW_TYPE_SEARCH, 'left', { active: true, reveal: true });
      const view = leaf.view;
      if (query !== undefined && query !== null) view.setQuery(query);
      if (focus) setTimeout(() => { view.box.inputEl.focus(); view.box.inputEl.select(); }, 0);
      return view;
    };

    app.search = {
      open: openSearch,
      matches: (query, opts) => searchVault(app, query, opts),
      compile: (query, opts) => compileQuery(app, query, opts),
      parse: parseQuery,
      explain: q => explainQuery(parseQuery(q)),
      getView: () => { const l = app.workspace.getLeavesOfType(VIEW_TYPE_SEARCH)[0]; return l ? l.view : null; }
    };
    plugin.register(() => { delete app.search; });

    plugin.addCommand({ id: 'global-search:open', name: 'Search in all files', icon: 'search', callback: () => {
      const ed = app.workspace.activeEditor;
      let sel = '';
      try { sel = ed && ed.editor && ed.editor.getSelection ? ed.editor.getSelection() : ''; } catch (e) { sel = ''; }
      openSearch(sel && !sel.includes('\n') ? sel : undefined);
    } });
  }
};
