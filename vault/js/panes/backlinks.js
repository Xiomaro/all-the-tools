/* The backlinks panel for one note: linked mentions and unlinked mentions,
   grouped by note, with Obsidian's options (collapse results, more
   context, sort order, filter). Used by the Backlinks pane and by
   "Backlinks in document" at the foot of notes. */

import { Component } from '../core/events.js';
import { h, debounce } from '../core/ui.js';
import { compileQuery } from './search-query.js';
import { ResultList } from './results.js';
import { backlinksFor, unlinkedMentionsOf, linkMention } from './mentions.js';
import { FILE_SORTS, fileComparator, sortMenu, navHeader, navButton, searchBox, paneHeader } from './util.js';

export const BACKLINK_DEFAULTS = { collapseAll: false, extraContext: false, sortOrder: 'alphabetical', showSearch: false, searchQuery: '', backlinkCollapsed: false, unlinkedCollapsed: true };

export class BacklinkPane extends Component {
  constructor(app, opts = {}) {
    super();
    this.app = app;
    this.opts = opts;
    this.file = null;
    this.state = Object.assign({}, BACKLINK_DEFAULTS, opts.state || {});

    const toggleBtn = (iconName, title, key, after) => {
      const b = navButton(iconName, title, () => { this.state[key] = !this.state[key]; b.classList.toggle('is-active', this.state[key]); after(); this.changed(); });
      b.classList.toggle('is-active', !!this.state[key]);
      return b;
    };
    const lists = () => [this.linked, this.unlinked].forEach(l => l.setOptions({ collapseAll: this.state.collapseAll, extraContext: this.state.extraContext }));
    this.collapseBtn = toggleBtn('list-collapse', 'Collapse results', 'collapseAll', lists);
    this.contextBtn = toggleBtn('unfold-vertical', 'Show more context', 'extraContext', lists);
    this.sortBtn = navButton('arrow-up-narrow-wide', 'Change sort order', e => sortMenu(e, FILE_SORTS, this.state.sortOrder, id => { this.state.sortOrder = id; this.update(); this.changed(); }));
    this.searchBtn = toggleBtn('search', 'Show search filter', 'showSearch', () => this.renderSearch());
    const { headerEl } = navHeader(this.collapseBtn, this.contextBtn, this.sortBtn, this.searchBtn);
    this.box = searchBox({ placeholder: 'Search...', value: this.state.searchQuery, onInput: v => { this.state.searchQuery = v; this.requestUpdate(); this.changed(); } });
    headerEl.appendChild(this.box.containerEl);

    const listOpts = { collapseAll: this.state.collapseAll, extraContext: this.state.extraContext, hoverSource: 'backlink' };
    this.linked = new ResultList(app, listOpts);
    this.unlinked = new ResultList(app, Object.assign({}, listOpts, { matchButton: (r, sn) => this.linkButton(r, sn) }));
    this.linkedHeader = paneHeader('Linked mentions', this.state.backlinkCollapsed, () => this.toggleSection('backlinkCollapsed'));
    this.unlinkedHeader = paneHeader('Unlinked mentions', this.state.unlinkedCollapsed, () => this.toggleSection('unlinkedCollapsed'));
    this.linkedEmpty = h('div.search-empty-state', { text: 'No backlinks found.' });
    this.unlinkedEmpty = h('div.search-empty-state', { text: 'No unlinked mentions found.' });
    this.paneEl = h('div.backlink-pane.node-insert-event',
      this.linkedHeader.el, this.linked.containerEl, this.linkedEmpty,
      this.unlinkedHeader.el, this.unlinked.containerEl, this.unlinkedEmpty);
    this.containerEl = opts.embedded
      ? h('div.embedded-backlinks', headerEl, this.paneEl)
      : h('div.backlink-pane-container', headerEl, this.paneEl);
    this.headerEl = headerEl;
    this.requestUpdate = debounce(() => this.update(), 300);
    this.renderSearch();
  }

  onload() {
    const refresh = () => this.requestUpdate();
    this.registerEvent(this.app.metadataCache.on('resolved', refresh));
    this.registerEvent(this.app.vault.on('rename', refresh));
    this.registerEvent(this.app.vault.on('delete', refresh));
  }

  onunload() { this.linked.destroy(); this.unlinked.destroy(); this.containerEl.remove(); }

  changed() { if (this.opts.onStateChange) this.opts.onStateChange(this.state); }

  setState(state) {
    Object.assign(this.state, state);
    this.collapseBtn.classList.toggle('is-active', !!this.state.collapseAll);
    this.contextBtn.classList.toggle('is-active', !!this.state.extraContext);
    this.searchBtn.classList.toggle('is-active', !!this.state.showSearch);
    this.box.setValue(this.state.searchQuery || '');
    this.linked.collapseAll = this.unlinked.collapseAll = !!this.state.collapseAll;
    this.linked.extraContext = this.unlinked.extraContext = !!this.state.extraContext;
    this.renderSearch();
    this.update();
  }

  renderSearch() { this.box.containerEl.style.display = this.state.showSearch ? '' : 'none'; }

  toggleSection(key) {
    this.state[key] = !this.state[key];
    this.update();
    this.changed();
  }

  setFile(file) {
    if (file === this.file && this.rendered) return;
    this.file = file;
    this.update();
  }

  sortAndFilter(results) {
    const q = (this.state.searchQuery || '').trim();
    if (q) {
      const c = compileQuery(this.app, q, { includeExcluded: true });
      if (!c.empty) results = results.filter(r => c.test(r.file));
    }
    const cmp = fileComparator(this.state.sortOrder);
    return results.sort((a, b) => cmp(a.file, b.file));
  }

  update() {
    this.requestUpdate.cancel();
    this.rendered = true;
    const file = this.file;
    const st = this.state;
    this.linkedHeader.setCollapsed(st.backlinkCollapsed);
    this.unlinkedHeader.setCollapsed(st.unlinkedCollapsed);
    if (!file || file.extension !== 'md') {
      this.linked.setResults([]); this.unlinked.setResults([]);
      this.linkedHeader.countEl.textContent = ''; this.unlinkedHeader.countEl.textContent = '';
      this.linkedEmpty.style.display = this.unlinkedEmpty.style.display = 'none';
      this.linked.containerEl.style.display = this.unlinked.containerEl.style.display = 'none';
      this.paneEl.classList.add('is-empty');
      return;
    }
    this.paneEl.classList.remove('is-empty');

    /* Linked mentions. */
    const linked = [];
    for (const [src, refs] of backlinksFor(this.app, file)) {
      const f = this.app.vault.getFileByPath(src);
      if (!f) continue;
      const content = this.app.vault.texts.get(src) || '';
      const inProps = refs.filter(r => !r.position);
      const r = { file: f, content, matches: refs.filter(x => x.position).map(x => [x.position.start.offset, x.position.end.offset]), count: refs.length };
      if (inProps.length) r.extra = () => h('div.search-result-file-match.mod-properties', h('span.search-result-file-match-label', { text: 'Properties: ' }),
        inProps.map((p, i) => [i ? ', ' : '', (p.key ? p.key + ': ' : ''), h('span.search-result-file-matched-text', { text: p.original })]));
      linked.push(r);
    }
    const shownLinked = this.sortAndFilter(linked);
    const total = shownLinked.reduce((n, r) => n + r.count, 0);
    this.linkedHeader.countEl.textContent = String(total);
    this.linked.containerEl.style.display = st.backlinkCollapsed ? 'none' : '';
    this.linkedEmpty.style.display = !st.backlinkCollapsed && !shownLinked.length ? '' : 'none';
    if (!st.backlinkCollapsed) this.linked.setResults(shownLinked);

    /* Unlinked mentions are only worked out while their section is open. */
    this.unlinked.containerEl.style.display = st.unlinkedCollapsed ? 'none' : '';
    if (st.unlinkedCollapsed) {
      this.unlinkedHeader.countEl.textContent = '';
      this.unlinkedEmpty.style.display = 'none';
      return;
    }
    const un = this.sortAndFilter(unlinkedMentionsOf(this.app, file));
    this.unlinkedHeader.countEl.textContent = String(un.reduce((n, r) => n + r.matches.length, 0));
    this.unlinkedEmpty.style.display = un.length ? 'none' : '';
    this.unlinked.setResults(un);
  }

  linkButton(r, sn) {
    const target = this.file;
    return h('button.search-result-file-match-replace-button.mod-cta', { text: 'Link', 'aria-label': 'Link this mention',
      onclick: async e => {
        e.stopPropagation();
        /* A snippet can hold several mentions; the first is linked, the
           rest stay listed. */
        await linkMention(this.app, r.file, target, sn.matches[0][0], sn.matches[0][1]);
      } });
  }
}
