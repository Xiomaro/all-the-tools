/* Editor status: the status bar icon that shows how the active note is
   shown (Live Preview, Source mode or Reading view). Clicking it offers
   the other modes, as Obsidian's does. */

import { h, icon, Menu } from '../core/ui.js';

const MODES = {
  live: { label: 'Live Preview', icon: 'pencil' },
  source: { label: 'Source mode', icon: 'code-2' },
  preview: { label: 'Reading view', icon: 'book-open' }
};

function markdownLeaf(app) {
  const leaf = app.workspace.getMostRecentLeaf();
  return leaf && leaf.view && leaf.view.getViewType() === 'markdown' ? leaf : null;
}

/* The mode from the view's state, Obsidian's shape: { mode: 'source' |
   'preview', source: true for source mode }. */
function currentMode(app, leaf) {
  const v = leaf.view;
  const mode = v.getMode ? v.getMode() : (v.getState().mode || app.config.get('defaultViewMode'));
  if (mode === 'preview') return 'preview';
  const st = v.getState ? v.getState() : {};
  const source = 'source' in st ? !!st.source : !app.config.get('livePreview');
  return source ? 'source' : 'live';
}

async function setMode(app, leaf, mode) {
  const vs = leaf.getViewState();
  const state = Object.assign({}, vs.state, mode === 'preview' ? { mode: 'preview' } : { mode: 'source', source: mode === 'source' });
  await leaf.setViewState(Object.assign({}, vs, { state }));
  app.workspace.trigger('editor-status-changed');
}

export default {
  id: 'editor-status',
  name: 'Editor status',
  description: 'Show and change how the note is shown (Live Preview, Source mode, Reading view) from the status bar.',
  async onload(plugin) {
    const app = plugin.app;
    const el = plugin.addStatusBarItem();
    el.classList.add('plugin-editor-status', 'mod-clickable');
    el.setAttribute('role', 'button');

    const update = () => {
      const leaf = markdownLeaf(app);
      if (!leaf) { el.style.display = 'none'; return; }
      const mode = currentMode(app, leaf);
      el.style.display = '';
      el.replaceChildren(h('span.status-bar-item-icon', icon(MODES[mode].icon)));
      el.setAttribute('aria-label', MODES[mode].label);
      el.title = MODES[mode].label;
      el.dataset.mode = mode;
    };

    plugin.registerDomEvent(el, 'click', () => {
      const leaf = markdownLeaf(app);
      if (!leaf) return;
      const cur = currentMode(app, leaf);
      const menu = new Menu();
      for (const [key, m] of Object.entries(MODES)) {
        menu.addItem(i => i.setTitle(m.label).setIcon(m.icon).setChecked(key === cur).onClick(() => setMode(app, leaf, key).then(update)));
      }
      const r = el.getBoundingClientRect();
      menu.showAtPosition({ x: r.left, y: r.top - 4, bottom: r.top - 4 });
    });

    for (const ev of ['active-leaf-change', 'layout-change', 'file-open', 'editor-status-changed']) plugin.registerEvent(app.workspace.on(ev, update));
    plugin.registerEvent(app.config.on('changed', key => { if (!key || key === 'livePreview') update(); }));
    update();
  }
};
