/* Backlinks: the notes that link to the active note (linked mentions)
   and the ones that name it without a link (unlinked mentions, with a
   Link button), in the right sidebar; optionally at the foot of every
   note too ("Backlink in document", backlink.json backlinkInDocument);
   and a backlink count in the status bar. */

import { View } from '../core/workspace.js';
import { Setting } from '../core/ui.js';
import { BacklinkPane, BACKLINK_DEFAULTS } from '../panes/backlinks.js';
import { backlinksFor } from '../panes/mentions.js';
import { followActiveFile } from '../panes/util.js';

export const VIEW_TYPE_BACKLINK = 'backlink';

class BacklinkView extends View {
  constructor(leaf) {
    super(leaf);
    this.icon = 'links-coming-in';
    this.file = null;
    this.pinnedFile = null;   /* set when opened for one note ("Open backlinks for the current file") */
    this.pane = new BacklinkPane(this.app, { onStateChange: () => this.app.workspace.saveLayout() });
    this.contentEl.appendChild(this.pane.containerEl);
    this.contentEl.classList.add('backlink-view');
  }

  getViewType() { return VIEW_TYPE_BACKLINK; }
  getDisplayText() { const f = this.pane.file; return f ? 'Backlinks for ' + f.basename : 'Backlinks'; }
  getState() { return Object.assign({ file: this.pane.file ? this.pane.file.path : undefined }, this.pane.state); }

  async setState(state) {
    state = state || {};
    const st = {};
    for (const k of Object.keys(BACKLINK_DEFAULTS)) if (state[k] !== undefined) st[k] = state[k];
    if (this.leaf.isMain() && state.file) this.pinnedFile = this.app.vault.getFileByPath(state.file);
    this.pane.setState(st);
    if (this.pinnedFile) this.pane.setFile(this.pinnedFile);
  }

  async onOpen() {
    this.addChild(this.pane);
    this.follow = followActiveFile(this, f => {
      if (this.pinnedFile) return;
      this.pane.setFile(f);
      this.leaf.updateHeader();
    });
    this.registerEvent(this.app.vault.on('rename', () => this.leaf.updateHeader()));
    this.follow.check();
  }
}

export default {
  id: 'backlink',
  name: 'Backlinks',
  description: 'Show the notes that link to the current note.',
  async onload(plugin) {
    const app = plugin.app;
    const ws = app.workspace;
    const settings = Object.assign({ backlinkInDocument: false }, await plugin.loadData() || {});
    const save = () => plugin.saveData(settings);

    plugin.registerView(VIEW_TYPE_BACKLINK, leaf => new BacklinkView(leaf));

    const show = () => ws.ensureSideLeaf(VIEW_TYPE_BACKLINK, 'right', { reveal: true });
    plugin.addCommand({ id: 'backlink:open', name: 'Show backlinks', icon: 'links-coming-in', callback: show });
    plugin.addCommand({ id: 'backlink:open-backlinks', name: 'Open backlinks for the current file', icon: 'links-coming-in', checkCallback: checking => {
      const f = ws.getActiveFile();
      if (!f || f.extension !== 'md') return false;
      if (!checking) {
        const cur = ws.getMostRecentLeaf();
        const leaf = cur ? ws.getLeafNear(cur, 'vertical') : ws.getLeaf('split');
        leaf.setViewState({ type: VIEW_TYPE_BACKLINK, state: { file: f.path } });
      }
      return true;
    } });
    plugin.addCommand({ id: 'backlink:toggle-backlinks-in-document', name: 'Toggle backlinks in document', icon: 'links-coming-in', callback: () => {
      settings.backlinkInDocument = !settings.backlinkInDocument;
      save();
      syncEmbeds();
    } });

    plugin.addSettingTab(containerEl => {
      new Setting(containerEl).setName('Backlink in document').setDesc('Show backlinks at the bottom of notes.')
        .addToggle(t => t.setValue(settings.backlinkInDocument).onChange(v => { settings.backlinkInDocument = v; save(); syncEmbeds(); }));
    });

    /* --- backlinks in document --------------------------------------------------------------- */

    const embeds = new Map();   /* leaf -> BacklinkPane */
    const hostOf = view => {
      const mode = view.getMode ? view.getMode() : 'source';
      if (mode === 'preview') {
        const sizer = view.containerEl.querySelector('.markdown-preview-sizer');
        return sizer ? sizer.querySelector(':scope > .mod-footer') || sizer : null;
      }
      return view.containerEl.querySelector('.cm-sizer');
    };
    const drop = leaf => { const p = embeds.get(leaf); if (p) { p.unload(); embeds.delete(leaf); } };
    function syncEmbeds() {
      const seen = new Set();
      ws.iterateRootLeaves(leaf => {
        const v = leaf.view;
        const file = v && v.getViewType() === 'markdown' ? v.file : null;
        const host = settings.backlinkInDocument && file ? hostOf(v) : null;
        if (!host) { drop(leaf); return; }
        seen.add(leaf);
        let pane = embeds.get(leaf);
        if (!pane) {
          pane = new BacklinkPane(app, { embedded: true });
          /* Keep the editor from treating clicks here as its own. */
          ['mousedown', 'keydown', 'dragstart'].forEach(t => pane.containerEl.addEventListener(t, e => e.stopPropagation()));
          pane.load();
          embeds.set(leaf, pane);
        }
        if (pane.containerEl.parentElement !== host || host.lastElementChild !== pane.containerEl) host.appendChild(pane.containerEl);
        pane.setFile(file);
      });
      for (const leaf of [...embeds.keys()]) if (!seen.has(leaf)) drop(leaf);
    }
    const soon = () => { clearTimeout(soon.t); soon.t = setTimeout(syncEmbeds, 50); };
    plugin.registerEvent(ws.on('file-open', soon));
    plugin.registerEvent(ws.on('layout-change', soon));
    plugin.registerEvent(ws.on('active-leaf-change', soon));
    /* Editors rebuild their DOM when switching modes; put the panel back. */
    plugin.registerInterval(setInterval(() => { if (settings.backlinkInDocument) syncEmbeds(); }, 1000));
    plugin.register(() => { for (const leaf of [...embeds.keys()]) drop(leaf); });

    /* --- status bar ---------------------------------------------------------------------------- */

    const status = plugin.addStatusBarItem();
    status.classList.add('plugin-backlink', 'mod-clickable');
    status.setAttribute('aria-label', 'Show backlinks');
    status.addEventListener('click', show);
    const updateStatus = () => {
      const f = ws.getActiveFile();
      if (!f || f.extension !== 'md') { status.style.display = 'none'; return; }
      let n = 0;
      for (const refs of backlinksFor(app, f).values()) n += refs.length;
      status.style.display = '';
      status.textContent = n + (n === 1 ? ' backlink' : ' backlinks');
    };
    const later = () => { clearTimeout(later.t); later.t = setTimeout(updateStatus, 200); };
    plugin.registerEvent(ws.on('file-open', later));
    plugin.registerEvent(ws.on('active-leaf-change', later));
    plugin.registerEvent(app.metadataCache.on('resolved', later));
    updateStatus();
  }
};
