/* Tags: every tag in the vault with how often it's used, nested tags
   (#a/b/c) as a tree when "Show nested tags" is on, sorted by name or
   frequency (the view's sortOrder and useHierarchy, as in Obsidian's
   workspace.json). Clicking a tag searches for it. */

import { View } from '../core/workspace.js';
import { h, Menu, debounce } from '../core/ui.js';
import { getAllTags } from '../core/metadata.js';
import { collator, navHeader, navButton, setButton, collapseIcon, setCollapsed, sortMenu } from '../panes/util.js';

export const VIEW_TYPE_TAG = 'tag';

const TAG_SORTS = [
  ['alphabetical', 'Tag name (A to Z)'],
  ['alphabeticalReverse', 'Tag name (Z to A)'],
  ['frequency', 'Frequency (high to low)'],
  ['frequencyReverse', 'Frequency (low to high)']
];

/* { lowercase tag -> { name (first spelling seen), count } } counting each
   use, as Obsidian does. */
export function collectTags(app) {
  const out = new Map();
  for (const cache of app.metadataCache.cache.values()) {
    for (const t of getAllTags(cache)) {
      const name = t.replace(/^#/, '');
      const key = name.toLowerCase();
      const e = out.get(key);
      if (e) e.count++;
      else out.set(key, { name, count: 1 });
    }
  }
  return out;
}

class TagView extends View {
  constructor(leaf) {
    super(leaf);
    this.icon = 'tags';
    this.state = { sortOrder: 'frequency', useHierarchy: true };
    this.expanded = new Set();
    this.hierarchyBtn = navButton('list-tree', 'Show nested tags', () => { this.state.useHierarchy = !this.state.useHierarchy; this.render(); this.save(); });
    this.sortBtn = navButton('arrow-up-narrow-wide', 'Change sort order', e => sortMenu(e, TAG_SORTS, this.state.sortOrder, id => { this.state.sortOrder = id; this.render(); this.save(); }));
    this.collapseBtn = navButton('chevrons-up-down', 'Expand all', () => this.toggleAll());
    const { headerEl } = navHeader(this.hierarchyBtn, this.sortBtn, this.collapseBtn);
    this.listEl = h('div.tag-container');
    this.contentEl.append(headerEl, this.listEl);
    this.contentEl.classList.add('tag-pane');
    this.requestRender = debounce(() => this.render(), 300);
  }

  getViewType() { return VIEW_TYPE_TAG; }
  getDisplayText() { return 'Tags'; }
  getState() { return Object.assign({}, this.state); }
  save() { this.app.workspace.saveLayout(); }

  async setState(state) {
    state = state || {};
    if (TAG_SORTS.some(s => s[0] === state.sortOrder)) this.state.sortOrder = state.sortOrder;
    if (state.useHierarchy !== undefined) this.state.useHierarchy = !!state.useHierarchy;
    this.render();
  }

  async onOpen() {
    this.registerEvent(this.app.metadataCache.on('resolved', () => this.requestRender()));
    this.registerEvent(this.app.metadataCache.on('changed', () => this.requestRender()));
    this.render();
  }

  /* A tree of { name, full, count, total, children: Map }. */
  buildTree(tags) {
    const root = { children: new Map() };
    for (const { name, count } of tags.values()) {
      if (!this.state.useHierarchy) { root.children.set(name.toLowerCase(), { name, full: name, count, total: count, children: new Map() }); continue; }
      const parts = name.split('/').filter(Boolean);
      let node = root, path = '';
      parts.forEach((part, i) => {
        path = path ? path + '/' + part : part;
        const key = part.toLowerCase();
        let child = node.children.get(key);
        if (!child) { child = { name: part, full: path, count: 0, total: 0, children: new Map() }; node.children.set(key, child); }
        child.total += count;
        if (i === parts.length - 1) child.count += count;
        node = child;
      });
    }
    return root;
  }

  sorted(nodes) {
    const o = this.state.sortOrder;
    const byName = (a, b) => collator.compare(a.name, b.name);
    return [...nodes].sort((a, b) => {
      if (o === 'alphabeticalReverse') return -byName(a, b);
      if (o === 'frequency') return (b.total - a.total) || byName(a, b);
      if (o === 'frequencyReverse') return (a.total - b.total) || byName(a, b);
      return byName(a, b);
    });
  }

  render() {
    this.hierarchyBtn.classList.toggle('is-active', this.state.useHierarchy);
    const tree = this.buildTree(collectTags(this.app));
    const scroll = this.contentEl.scrollTop;
    this.listEl.replaceChildren(...this.sorted(tree.children.values()).map(n => this.renderNode(n)));
    if (!tree.children.size) this.listEl.appendChild(h('div.pane-empty', { text: 'No tags found.' }));
    this.contentEl.scrollTop = scroll;
    this.hasNested = [...tree.children.values()].some(n => n.children.size);
    const any = this.expanded.size > 0;
    setButton(this.collapseBtn, any ? 'chevrons-down-up' : 'chevrons-up-down', any ? 'Collapse all' : 'Expand all');
    this.collapseBtn.style.display = this.state.useHierarchy && this.hasNested ? '' : 'none';
  }

  renderNode(node) {
    const nested = node.children.size > 0;
    const collapsed = nested && !this.expanded.has(node.full.toLowerCase());
    const selfEl = h('div.tree-item-self.tag-pane-tag.is-clickable' + (nested ? '.mod-collapsible' : ''), { dataset: { tag: '#' + node.full } },
      nested ? collapseIcon(collapsed) : '',
      h('div.tree-item-inner', h('span.tree-item-inner-text.tag-pane-tag-text', { text: node.name })),
      h('div.tree-item-flair-outer', h('span.tree-item-flair.tag-pane-tag-count', { text: String(node.total) })));
    const childrenEl = h('div.tree-item-children');
    const el = h('div.tree-item' + (collapsed ? '.is-collapsed' : ''), selfEl, nested ? childrenEl : '');
    const fill = () => { if (!childrenEl.childElementCount) childrenEl.append(...this.sorted(node.children.values()).map(n => this.renderNode(n))); };
    if (nested && !collapsed) fill();
    selfEl.addEventListener('click', e => {
      if (nested && e.target.closest('.collapse-icon')) {
        const now = !el.classList.contains('is-collapsed');
        setCollapsed(el, now);
        if (now) this.expanded.delete(node.full.toLowerCase()); else { this.expanded.add(node.full.toLowerCase()); fill(); }
        return;
      }
      this.searchTag(node.full, e);
    });
    selfEl.addEventListener('contextmenu', e => {
      const menu = new Menu();
      menu.addItem(i => i.setTitle('Search for #' + node.full).setIcon('search').onClick(() => this.searchTag(node.full)));
      this.app.workspace.trigger('tag-menu', menu, '#' + node.full, 'tag-pane');
      menu.showAtMouseEvent(e);
    });
    return el;
  }

  /* Shift-click adds the tag to the current search, as in Obsidian. */
  searchTag(tag, e) {
    if (!this.app.search) return;
    const term = 'tag:#' + tag;
    const view = this.app.search.getView && this.app.search.getView();
    const cur = view ? view.getQuery().trim() : '';
    this.app.search.open(e && e.shiftKey && cur ? cur + ' ' + term : term, false);
  }

  toggleAll() {
    if (this.expanded.size) this.expanded.clear();
    else {
      const add = (n) => { if (n.children.size) { this.expanded.add(n.full.toLowerCase()); n.children.forEach(add); } };
      this.buildTree(collectTags(this.app)).children.forEach(add);
    }
    this.render();
  }
}

export default {
  id: 'tag-pane',
  name: 'Tags view',
  description: 'Show every tag in the vault.',
  async onload(plugin) {
    plugin.registerView(VIEW_TYPE_TAG, leaf => new TagView(leaf));
    plugin.addCommand({ id: 'tag-pane:open', name: 'Show tags', icon: 'tags',
      callback: () => plugin.app.workspace.ensureSideLeaf(VIEW_TYPE_TAG, 'right', { reveal: true }) });
  }
};
