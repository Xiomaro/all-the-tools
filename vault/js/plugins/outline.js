/* Outline: the headings of the active note as a collapsible tree. Click
   to jump, the heading you're in is highlighted as the cursor moves or
   the note scrolls, a filter box narrows the list, and headings can be
   dragged to move their whole section, as in Obsidian 1.x. */

import { View, Workspace } from '../core/workspace.js';
import { h, Notice, debounce } from '../core/ui.js';
import { parseMarkdown } from '../core/metadata.js';
import { followActiveFile, navHeader, navButton, setButton, collapseIcon, setCollapsed, searchBox, highlightText, leafForFile, openFileAt } from '../panes/util.js';

export const VIEW_TYPE_OUTLINE = 'outline';

/* The heading as it reads, without Markdown punctuation. */
export function headingText(s) {
  return String(s)
    .replace(/!?\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
    .replace(/!?\[\[([^\]]*)\]\]/g, '$1')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/(\*\*|__|==|~~|`)/g, '')
    .replace(/(^|\W)[*_](\S(?:.*?\S)?)[*_](?=\W|$)/g, '$1$2')
    .trim();
}

/* Move the section under heading `from` to before heading `to` (or after
   its section). Returns the new text, or null if it wouldn't move. */
export function moveSection(text, headings, from, to, after) {
  const end = k => {
    const lv = headings[k].level;
    for (let m = k + 1; m < headings.length; m++) if (headings[m].level <= lv) return headings[m].position.start.offset;
    return text.length;
  };
  const s = headings[from].position.start.offset, e = end(from);
  let at = after ? end(to) : headings[to].position.start.offset;
  if (at >= s && at <= e) return null;
  let chunk = text.slice(s, e);
  if (!chunk.endsWith('\n')) chunk += '\n';
  const rest = text.slice(0, s) + text.slice(e);
  if (at > e) at -= e - s;
  let head = rest.slice(0, at);
  if (head && !head.endsWith('\n')) head += '\n';
  let out = head + chunk + rest.slice(at);
  if (!text.endsWith('\n') && out.endsWith('\n')) out = out.slice(0, -1);
  return out;
}

class OutlineView extends View {
  constructor(leaf) {
    super(leaf);
    this.icon = 'list';
    this.file = null;
    this.target = null;
    this.pinnedFile = null;
    this.state = { followCursor: true, showSearch: false, searchQuery: '' };
    this.collapsed = new Set();   /* heading lines, per note */
    this.selfEls = [];
    this.activeIndex = -1;

    this.collapseBtn = navButton('chevrons-down-up', 'Collapse all', () => this.toggleAll());
    this.searchBtn = navButton('search', 'Show search filter', () => {
      this.state.showSearch = !this.state.showSearch;
      this.renderSearch();
      if (this.state.showSearch) this.box.inputEl.focus();
      else if (this.state.searchQuery) { this.state.searchQuery = ''; this.box.setValue(''); this.render(); }
      this.save();
    });
    const { headerEl } = navHeader(this.collapseBtn, this.searchBtn);
    this.box = searchBox({ placeholder: 'Search...', onInput: v => { this.state.searchQuery = v; this.render(); this.save(); } });
    headerEl.appendChild(this.box.containerEl);
    this.treeEl = h('div.outline-tree');
    this.indicator = h('div.outline-drop-indicator');
    this.contentEl.append(headerEl, this.treeEl);
    this.contentEl.classList.add('outline');
    this.requestRender = debounce(() => this.render(), 250);
    this.bindDrag();
  }

  getViewType() { return VIEW_TYPE_OUTLINE; }
  getDisplayText() { return this.target ? 'Outline of ' + this.target.basename : 'Outline'; }
  getState() { return Object.assign({ file: this.target ? this.target.path : undefined }, this.state); }
  save() { this.app.workspace.saveLayout(); }

  async setState(state) {
    state = state || {};
    for (const k of Object.keys(this.state)) if (state[k] !== undefined) this.state[k] = state[k];
    if (this.leaf.isMain() && state.file) { this.pinnedFile = this.app.vault.getFileByPath(state.file); this.target = this.pinnedFile; }
    this.box.setValue(this.state.searchQuery || '');
    this.renderSearch();
    this.render();
  }

  renderSearch() {
    this.box.containerEl.style.display = this.state.showSearch ? '' : 'none';
    this.searchBtn.classList.toggle('is-active', !!this.state.showSearch);
  }

  async onOpen() {
    const ws = this.app.workspace;
    this.registerEvent(this.app.metadataCache.on('changed', f => { if (f === this.target) this.requestRender(); }));
    this.registerEvent(this.app.vault.on('rename', f => { if (f === this.target) this.leaf.updateHeader(); }));
    this.registerEvent(ws.on('editor-selection-change', (editor, view) => {
      if (!view || view.file !== this.target || !editor || !editor.getCursor) return;
      this.setActiveLine(editor.getCursor().line);
    }));
    this.registerDomEvent(document, 'scroll', e => this.onScroll(e), true);
    followActiveFile(this, f => {
      if (this.pinnedFile) return;
      if (f !== this.target) { this.collapsed.clear(); this.activeIndex = -1; }
      this.target = f;
      this.render();
      this.leaf.updateHeader();
    }).check();
  }

  headings() {
    const f = this.target;
    const cache = f && f.extension === 'md' ? this.app.metadataCache.getFileCache(f) : null;
    return (cache && cache.headings) || [];
  }

  render() {
    this.requestRender.cancel();
    const heads = this.headings();
    this.heads = heads;
    const q = (this.state.searchQuery || '').trim().toLowerCase();
    /* Nest by level; with a filter, keep matches and the headings above them. */
    const root = { children: [], level: 0 };
    const stack = [root];
    const nodes = heads.map((hd, i) => ({ i, hd, text: headingText(hd.heading), children: [], level: hd.level }));
    for (const n of nodes) {
      while (stack.length > 1 && stack[stack.length - 1].level >= n.level) stack.pop();
      stack[stack.length - 1].children.push(n);
      stack.push(n);
    }
    const keep = n => {
      n.children = n.children.filter(keep);
      n.match = q ? n.text.toLowerCase().indexOf(q) : -1;
      return !q || n.match > -1 || n.children.length > 0;
    };
    root.children = root.children.filter(keep);
    this.selfEls = [];
    this.treeEl.replaceChildren(...root.children.map(n => this.renderNode(n, q)));
    if (!heads.length) this.treeEl.appendChild(h('div.pane-empty', { text: this.target && this.target.extension === 'md' ? 'No headings found.' : 'No file is open.' }));
    else if (!root.children.length) this.treeEl.appendChild(h('div.pane-empty', { text: 'No matching headings.' }));
    this.updateCollapseButton();
    if (this.activeIndex > -1) this.markActive(this.activeIndex);
  }

  renderNode(n, q) {
    const line = n.hd.position.start.line;
    const nested = n.children.length > 0;
    const collapsed = nested && !q && this.collapsed.has(line);
    const selfEl = h('div.tree-item-self.is-clickable' + (nested ? '.mod-collapsible' : ''), { draggable: q ? null : 'true', dataset: { index: String(n.i), level: String(n.level) } },
      nested ? collapseIcon(collapsed) : '',
      h('div.tree-item-inner', q && n.match > -1 ? highlightText(n.text, [[n.match, n.match + q.length]], 'search-result-file-matched-text') : n.text));
    this.selfEls[n.i] = selfEl;
    const el = h('div.tree-item' + (collapsed ? '.is-collapsed' : ''), selfEl,
      nested ? h('div.tree-item-children', n.children.map(c => this.renderNode(c, q))) : '');
    selfEl.addEventListener('click', e => {
      if (nested && e.target.closest('.collapse-icon')) {
        const now = !el.classList.contains('is-collapsed');
        setCollapsed(el, now);
        if (now) this.collapsed.add(line); else this.collapsed.delete(line);
        this.updateCollapseButton();
        return;
      }
      this.jump(n.hd, e);
    });
    return el;
  }

  jump(hd, e) {
    const file = this.target;
    if (!file) return;
    const heads = this.heads || [];
    const unique = heads.filter(x => x.heading === hd.heading).length === 1;
    const eState = { line: hd.position.start.line };
    if (unique) eState.subpath = '#' + hd.heading;
    openFileAt(this.app, file, eState, Workspace.leafFromEvent(e));
    this.setActiveLine(hd.position.start.line);
  }

  updateCollapseButton() {
    const any = this.collapsed.size > 0;
    setButton(this.collapseBtn, any ? 'chevrons-up-down' : 'chevrons-down-up', any ? 'Expand all' : 'Collapse all');
  }

  toggleAll() {
    if (this.collapsed.size) this.collapsed.clear();
    else {
      const heads = this.headings();
      heads.forEach((hd, i) => { if (heads[i + 1] && heads[i + 1].level > hd.level) this.collapsed.add(hd.position.start.line); });
    }
    this.render();
  }

  /* --- the heading you're in ------------------------------------------------------------------- */

  setActiveLine(line) {
    const heads = this.heads || [];
    let idx = -1;
    for (let i = 0; i < heads.length; i++) { if (heads[i].position.start.line <= line) idx = i; else break; }
    this.markActive(idx);
  }

  markActive(idx) {
    const prev = this.selfEls[this.activeIndex];
    if (prev) prev.classList.remove('is-active');
    this.activeIndex = idx;
    const el = this.selfEls[idx];
    if (!el) return;
    el.classList.add('is-active');
    const r = el.getBoundingClientRect(), c = this.contentEl.getBoundingClientRect();
    if (c.height && (r.top < c.top || r.bottom > c.bottom)) el.scrollIntoView({ block: 'nearest' });
  }

  onScroll(e) {
    if (this.scrollQueued || !this.target) return;
    const leaf = leafForFile(this.app, this.target);
    const view = leaf && leaf.view;
    if (!view || !(e.target instanceof Node) || !view.containerEl.contains(e.target)) return;
    this.scrollQueued = true;
    requestAnimationFrame(() => {
      this.scrollQueued = false;
      try {
        const mode = view.getMode ? view.getMode() : 'source';
        const cm = view.editor && view.editor.cm;
        if (mode !== 'preview' && cm && cm.lineBlockAtHeight) {
          const top = cm.scrollDOM.getBoundingClientRect().top;
          const block = cm.lineBlockAtHeight(Math.max(0, top - cm.documentTop + 4));
          this.setActiveLine(cm.state.doc.lineAt(block.from).number - 1);
        } else if (mode === 'preview') {
          const box = e.target.getBoundingClientRect ? e.target.getBoundingClientRect() : view.containerEl.getBoundingClientRect();
          const els = [...view.containerEl.querySelectorAll('.markdown-preview-view h1, .markdown-preview-view h2, .markdown-preview-view h3, .markdown-preview-view h4, .markdown-preview-view h5, .markdown-preview-view h6')]
            .filter(x => !x.closest('.markdown-embed, .embedded-backlinks, .inline-title'));
          let idx = -1;
          els.forEach((x, i) => { if (x.getBoundingClientRect().top <= box.top + 12) idx = i; });
          this.markActive(idx);
        }
      } catch (err) { /* the editor isn't ready */ }
    });
  }

  /* --- dragging headings to move sections ------------------------------------------------------ */

  bindDrag() {
    const el = this.treeEl;
    const selfOf = e => e.target.closest && e.target.closest('.tree-item-self[data-index]');
    el.addEventListener('dragstart', e => {
      const s = selfOf(e);
      if (!s || !this.target) return;
      this.dragIndex = +s.dataset.index;
      const hd = this.heads[this.dragIndex];
      e.dataTransfer.effectAllowed = 'copyMove';
      e.dataTransfer.setData('application/x-vault-heading', String(this.dragIndex));
      e.dataTransfer.setData('text/plain', this.app.fileManager.generateMarkdownLink(this.target, '', '#' + hd.heading));
      s.classList.add('is-being-dragged');
    });
    el.addEventListener('dragend', () => {
      this.dragIndex = null;
      this.indicator.remove();
      el.querySelectorAll('.is-being-dragged').forEach(x => x.classList.remove('is-being-dragged'));
    });
    el.addEventListener('dragover', e => {
      if (this.dragIndex == null) return;
      const s = selfOf(e);
      if (!s) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      const r = s.getBoundingClientRect(), box = el.getBoundingClientRect();
      const after = e.clientY > r.top + r.height / 2;
      this.dropAt = { index: +s.dataset.index, after };
      Object.assign(this.indicator.style, { top: ((after ? r.bottom : r.top) - box.top + el.scrollTop - 1) + 'px', left: (r.left - box.left) + 'px', width: r.width + 'px' });
      if (!this.indicator.isConnected) el.appendChild(this.indicator);
    });
    el.addEventListener('dragleave', e => { if (!el.contains(e.relatedTarget)) this.indicator.remove(); });
    el.addEventListener('drop', e => {
      if (this.dragIndex == null || !this.dropAt) return;
      e.preventDefault();
      e.stopPropagation();
      this.indicator.remove();
      const from = this.dragIndex, { index: to, after } = this.dropAt;
      this.dragIndex = null;
      if (from !== to) this.moveHeading(from, to, after);
    });
  }

  async moveHeading(from, to, after) {
    const file = this.target;
    const want = this.heads[from] && this.heads[from].heading;
    const apply = text => {
      const heads = parseMarkdown(text).headings || [];
      if (!heads[from] || heads[from].heading !== want || !heads[to]) return null;
      return moveSection(text, heads, from, to, after);
    };
    const leaf = leafForFile(this.app, file);
    const ed = leaf && leaf.view && leaf.view.editor;
    if (ed && ed.getValue && ed.replaceRange && ed.offsetToPos) {
      const cur = ed.getValue();
      const next = apply(cur);
      if (next == null) return;
      /* Replace only the part that changed, so the editor keeps its place and undo. */
      let a = 0;
      while (a < cur.length && a < next.length && cur[a] === next[a]) a++;
      let b = 0;
      while (b < cur.length - a && b < next.length - a && cur[cur.length - 1 - b] === next[next.length - 1 - b]) b++;
      ed.replaceRange(next.slice(a, next.length - b), ed.offsetToPos(a), ed.offsetToPos(cur.length - b));
      return;
    }
    let moved = false;
    await this.app.vault.process(file, text => { const next = apply(text); if (next == null) return text; moved = true; return next; });
    if (!moved) new Notice('The note changed; try again.');
  }
}

export default {
  id: 'outline',
  name: 'Outline',
  description: 'Show the headings in the current note.',
  async onload(plugin) {
    const ws = plugin.app.workspace;
    plugin.registerView(VIEW_TYPE_OUTLINE, leaf => new OutlineView(leaf));
    plugin.addCommand({ id: 'outline:open', name: 'Show outline', icon: 'list',
      callback: () => ws.ensureSideLeaf(VIEW_TYPE_OUTLINE, 'right', { reveal: true }) });
    plugin.addCommand({ id: 'outline:open-for-current', name: 'Open outline for the current file', icon: 'list', checkCallback: checking => {
      const f = ws.getActiveFile();
      if (!f || f.extension !== 'md') return false;
      if (!checking) {
        const cur = ws.getMostRecentLeaf();
        const leaf = cur ? ws.getLeafNear(cur, 'vertical') : ws.getLeaf('split');
        leaf.setViewState({ type: VIEW_TYPE_OUTLINE, state: { file: f.path } });
      }
      return true;
    } });
  }
};
