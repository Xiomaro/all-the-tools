/* Outgoing links: the links in the active note (resolved and not yet
   created), and the other notes it mentions by name without linking,
   each with a Link button. */

import { View, Workspace, FILE_MIME } from '../core/workspace.js';
import { h, debounce } from '../core/ui.js';
import { parseLinktext } from '../core/metadata.js';
import { ResultList } from '../panes/results.js';
import { outgoingMentionsOf, linkMention } from '../panes/mentions.js';
import { followActiveFile, paneHeader, navHeader, navButton, openFileAt, hoverLink, displayName } from '../panes/util.js';

export const VIEW_TYPE_OUTGOING = 'outgoing-link';

class OutgoingLinkView extends View {
  constructor(leaf) {
    super(leaf);
    this.icon = 'links-going-out';
    this.file = null;
    this.target = null;
    this.pinnedFile = null;
    this.state = { linksCollapsed: false, unlinkedCollapsed: true, collapseAll: false, extraContext: false };

    const toggleBtn = (iconName, title, key) => {
      const b = navButton(iconName, title, () => {
        this.state[key] = !this.state[key];
        b.classList.toggle('is-active', this.state[key]);
        this.unlinked.setOptions({ collapseAll: this.state.collapseAll, extraContext: this.state.extraContext });
        this.app.workspace.saveLayout();
      });
      return b;
    };
    this.collapseBtn = toggleBtn('list-collapse', 'Collapse results', 'collapseAll');
    this.contextBtn = toggleBtn('unfold-vertical', 'Show more context', 'extraContext');
    const { headerEl } = navHeader(this.collapseBtn, this.contextBtn);

    this.linksHeader = paneHeader('Links', false, () => this.toggle('linksCollapsed'));
    this.linksEl = h('div.search-result-container', h('div.search-results-children'));
    this.linksEmpty = h('div.search-empty-state', { text: 'No links found.' });
    this.unlinkedHeader = paneHeader('Unlinked mentions', true, () => this.toggle('unlinkedCollapsed'));
    this.unlinked = new ResultList(this.app, {
      hoverSource: 'outgoing-link',
      /* A match is in the active note; its title is the note mentioned. */
      onMatchClick: (r, sn, e, eState) => openFileAt(this.app, this.target, eState, Workspace.leafFromEvent(e)),
      matchButton: (r, sn) => h('button.search-result-file-match-replace-button.mod-cta', { text: 'Link', 'aria-label': 'Link this mention',
        onclick: async e => { e.stopPropagation(); await linkMention(this.app, this.target, r.file, sn.matches[0][0], sn.matches[0][1]); } })
    });
    this.unlinkedEmpty = h('div.search-empty-state', { text: 'No unlinked mentions found.' });
    this.paneEl = h('div.outgoing-link-pane.node-insert-event',
      this.linksHeader.el, this.linksEl, this.linksEmpty, this.unlinkedHeader.el, this.unlinked.containerEl, this.unlinkedEmpty);
    this.contentEl.append(headerEl, this.paneEl);
    this.requestUpdate = debounce(() => this.update(), 300);
  }

  getViewType() { return VIEW_TYPE_OUTGOING; }
  getDisplayText() { return this.target ? 'Outgoing links from ' + this.target.basename : 'Outgoing links'; }
  getState() { return Object.assign({ file: this.target ? this.target.path : undefined }, this.state); }

  async setState(state) {
    state = state || {};
    for (const k of Object.keys(this.state)) if (state[k] !== undefined) this.state[k] = !!state[k];
    if (this.leaf.isMain() && state.file) this.pinnedFile = this.app.vault.getFileByPath(state.file);
    this.collapseBtn.classList.toggle('is-active', this.state.collapseAll);
    this.contextBtn.classList.toggle('is-active', this.state.extraContext);
    this.unlinked.collapseAll = this.state.collapseAll;
    this.unlinked.extraContext = this.state.extraContext;
    if (this.pinnedFile) this.target = this.pinnedFile;
    this.update();
  }

  async onOpen() {
    const refresh = () => this.requestUpdate();
    this.registerEvent(this.app.metadataCache.on('resolved', refresh));
    this.registerEvent(this.app.vault.on('rename', () => { refresh(); this.leaf.updateHeader(); }));
    followActiveFile(this, f => {
      if (this.pinnedFile) return;
      this.target = f;
      this.update();
      this.leaf.updateHeader();
    }).check();
  }

  async onClose() { this.unlinked.destroy(); }

  toggle(key) {
    this.state[key] = !this.state[key];
    this.update();
    this.app.workspace.saveLayout();
  }

  update() {
    this.requestUpdate.cancel();
    const file = this.target && this.target.extension === 'md' ? this.target : null;
    this.linksHeader.setCollapsed(this.state.linksCollapsed);
    this.unlinkedHeader.setCollapsed(this.state.unlinkedCollapsed);
    const kids = this.linksEl.firstElementChild;
    kids.replaceChildren();
    this.paneEl.classList.toggle('is-empty', !file);
    if (!file) {
      this.linksHeader.countEl.textContent = this.unlinkedHeader.countEl.textContent = '';
      this.linksEmpty.style.display = this.unlinkedEmpty.style.display = 'none';
      this.unlinked.setResults([]);
      return;
    }
    /* Links, once each, in the order they appear. */
    const mc = this.app.metadataCache;
    const cache = mc.getFileCache(file) || {};
    const refs = (cache.links || []).concat(cache.embeds || []).sort((a, b) => a.position.start.offset - b.position.start.offset).concat(cache.frontmatterLinks || []);
    const groups = new Map();
    for (const ref of refs) {
      const { path } = parseLinktext(ref.link);
      if (!path) continue;
      const dest = mc.getFirstLinkpathDest(path, file.path);
      const key = dest ? dest.path : 'unresolved:' + path.toLowerCase();
      const g = groups.get(key) || { dest, path, link: ref.link, count: 0 };
      g.count++;
      groups.set(key, g);
    }
    this.linksHeader.countEl.textContent = String(groups.size);
    this.linksEl.style.display = this.state.linksCollapsed ? 'none' : '';
    this.linksEmpty.style.display = !this.state.linksCollapsed && !groups.size ? '' : 'none';
    if (!this.state.linksCollapsed) {
      for (const g of groups.values()) kids.appendChild(this.renderLink(file, g));
    }
    if (this.state.unlinkedCollapsed) {
      this.unlinked.containerEl.style.display = 'none';
      this.unlinkedEmpty.style.display = 'none';
      this.unlinkedHeader.countEl.textContent = '';
      return;
    }
    const mentions = outgoingMentionsOf(this.app, file).sort((a, b) => displayName(a.file).localeCompare(displayName(b.file)));
    this.unlinkedHeader.countEl.textContent = String(mentions.length);
    this.unlinked.containerEl.style.display = '';
    this.unlinkedEmpty.style.display = mentions.length ? 'none' : '';
    this.unlinked.setResults(mentions);
  }

  renderLink(file, g) {
    const title = g.dest ? displayName(g.dest) : g.path;
    const selfEl = h('div.tree-item-self.search-result-file-title.is-clickable' + (g.dest ? '' : '.is-unresolved'), { draggable: g.dest ? 'true' : null },
      h('div.tree-item-inner', { text: title }),
      g.count > 1 ? h('div.tree-item-flair-outer', h('span.tree-item-flair', { text: String(g.count) })) : '');
    selfEl.addEventListener('click', e => this.app.workspace.openLinkText(g.link, file.path, Workspace.leafFromEvent(e)));
    selfEl.addEventListener('auxclick', e => { if (e.button === 1) this.app.workspace.openLinkText(g.link, file.path, 'tab'); });
    selfEl.addEventListener('mouseover', e => hoverLink(this.app, e, 'outgoing-link', this, selfEl, g.link, file.path));
    if (g.dest) selfEl.addEventListener('dragstart', e => {
      e.dataTransfer.setData(FILE_MIME, g.dest.path);
      e.dataTransfer.setData('text/plain', this.app.fileManager.generateMarkdownLink(g.dest, ''));
    });
    selfEl.title = g.dest ? g.dest.path : 'Not created yet: ' + g.path;
    return h('div.tree-item.search-result', selfEl);
  }
}

export default {
  id: 'outgoing-link',
  name: 'Outgoing links',
  description: 'Show the links in the current note.',
  async onload(plugin) {
    const ws = plugin.app.workspace;
    plugin.registerView(VIEW_TYPE_OUTGOING, leaf => new OutgoingLinkView(leaf));
    plugin.addCommand({ id: 'outgoing-links:open', name: 'Show outgoing links', icon: 'links-going-out',
      callback: () => ws.ensureSideLeaf(VIEW_TYPE_OUTGOING, 'right', { reveal: true }) });
    plugin.addCommand({ id: 'outgoing-links:open-for-current', name: 'Open outgoing links for the current file', icon: 'links-going-out', checkCallback: checking => {
      const f = ws.getActiveFile();
      if (!f || f.extension !== 'md') return false;
      if (!checking) {
        const cur = ws.getMostRecentLeaf();
        const leaf = cur ? ws.getLeafNear(cur, 'vertical') : ws.getLeaf('split');
        leaf.setViewState({ type: VIEW_TYPE_OUTGOING, state: { file: f.path } });
      }
      return true;
    } });
  }
};
