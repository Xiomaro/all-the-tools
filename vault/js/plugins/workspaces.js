/* Workspaces: save the layout of tabs, splits and sidebars under a name
   and bring it back later. Kept in .obsidian/workspaces.json as Obsidian
   does: { workspaces: { name: layout }, active: name }. */

import { Modal, SuggestModal, Setting, Notice, h, fuzzyMatch, highlighted, confirmDialog } from '../core/ui.js';

async function readData(app) {
  const d = await app.config.readJson('workspaces', null);
  const data = d && typeof d === 'object' ? d : {};
  if (!data.workspaces || typeof data.workspaces !== 'object') data.workspaces = {};
  return data;
}
function writeData(app, data) { return app.config.writeJson('workspaces', data, true); }

/* The layout to save: what workspace.json holds, less the recent-files
   list (that stays with the vault, not the layout). */
function currentLayout(app) {
  const layout = JSON.parse(JSON.stringify(app.workspace.getLayout()));
  delete layout.lastOpenFiles;
  return layout;
}

export async function saveWorkspace(app, name) {
  const data = await readData(app);
  data.workspaces[name] = currentLayout(app);
  data.active = name;
  await writeData(app, data);
  new Notice('Saved workspace layout "' + name + '".');
}

/* Close every open view properly (saving unsaved edits) before building
   the saved layout, then keep the recent-files list. */
export async function loadWorkspace(app, name) {
  const data = await readData(app);
  const layout = data.workspaces[name];
  if (!layout) { new Notice('There is no workspace layout called "' + name + '".'); return false; }
  const ws = app.workspace;
  const keep = ws.getLayout();
  const leaves = [];
  ws.iterateAllLeaves(l => leaves.push(l));
  for (const leaf of leaves) {
    const v = leaf.view;
    if (v) {
      try {
        if (v.save) await v.save();
        await v.onClose();
      } catch (e) { console.error(e); }
      v.unload();
      leaf.view = null;
    }
    ws.leaves.delete(leaf.id);
  }
  await ws.setLayout(Object.assign({}, ws.savedExtra || {}, JSON.parse(JSON.stringify(layout)),
    { lastOpenFiles: keep.lastOpenFiles, 'left-ribbon': keep['left-ribbon'] }));
  ws.onLayoutChange();
  ws.onResize();
  data.active = name;
  await writeData(app, data);
  return true;
}

function pickWorkspace(app, names, placeholder, onChoose) {
  new SuggestModal(app, {
    placeholder,
    emptyText: names.length ? 'No matching layouts.' : 'No saved workspace layouts yet.',
    getSuggestions: q => names.map(n => ({ n, m: fuzzyMatch(q, n) })).filter(x => x.m).sort((a, b) => b.m.score - a.m.score || a.n.localeCompare(b.n)),
    renderSuggestion: (x, el) => el.append(h('div.suggestion-content', h('div.suggestion-title', highlighted(x.n, x.m.matches)))),
    onChoose: x => onChoose(x.n)
  }).open();
}

class ManageModal extends Modal {
  constructor(app) {
    super(app);
    this.setTitle('Manage workspace layouts');
    this.modalEl.classList.add('mod-workspaces');
  }
  async onOpen() {
    const data = await readData(this.app);
    this.contentEl.replaceChildren();
    let name = data.active || '';
    new Setting(this.contentEl).setName('Save current layout').setDesc('Saving under an existing name replaces that layout.')
      .addText(t => {
        t.setPlaceholder('Name of the layout').setValue(name).onChange(v => { name = v; });
        t.inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
      })
      .addButton(b => b.setButtonText('Save').setCta().onClick(() => go()));
    const go = async () => {
      const n = name.trim();
      if (!n) { new Notice('Give the layout a name.'); return; }
      await saveWorkspace(this.app, n);
      this.onOpen();
    };
    const names = Object.keys(data.workspaces).sort((a, b) => a.localeCompare(b));
    if (!names.length) this.contentEl.appendChild(h('div.workspaces-empty', { text: 'No saved layouts yet.' }));
    for (const n of names) {
      new Setting(this.contentEl).setClass('workspaces-item').setName(n)
        .setDesc(n === data.active ? 'Active' : '')
        .addButton(b => b.setButtonText('Load').onClick(async () => { this.close(); await loadWorkspace(this.app, n); }))
        .addExtraButton(b => b.setIcon('trash-2').setTooltip('Delete').onClick(async () => {
          if (!await confirmDialog(this.app, 'Delete layout', 'Delete the workspace layout "' + n + '"?', 'Delete', true)) return;
          const d = await readData(this.app);
          delete d.workspaces[n];
          if (d.active === n) delete d.active;
          await writeData(this.app, d);
          this.onOpen();
        }));
    }
  }
}

export default {
  id: 'workspaces',
  name: 'Workspaces',
  description: 'Save and load layouts of tabs and sidebars.',
  async onload(plugin) {
    const app = plugin.app;
    const manage = () => new ManageModal(app).open();
    plugin.addCommand({ id: 'workspaces:open-modal', name: 'Workspaces: Manage workspace layouts', icon: 'layout', callback: manage });
    plugin.addCommand({ id: 'workspaces:load', name: 'Workspaces: Load workspace layout', icon: 'layout', callback: async () => {
      const data = await readData(app);
      pickWorkspace(app, Object.keys(data.workspaces), 'Choose a layout to load...', n => loadWorkspace(app, n));
    } });
    plugin.addCommand({ id: 'workspaces:save', name: 'Workspaces: Save current workspace layout', icon: 'layout', callback: async () => {
      const data = await readData(app);
      if (data.active && data.workspaces[data.active]) return saveWorkspace(app, data.active);
      manage();
    } });
    plugin.addCommand({ id: 'workspaces:save-and-load', name: 'Workspaces: Save and load another workspace layout', icon: 'layout', callback: async () => {
      const data = await readData(app);
      const names = Object.keys(data.workspaces).filter(n => n !== data.active);
      pickWorkspace(app, names, 'Choose a layout to load...', async n => {
        if (data.active) await saveWorkspace(app, data.active);
        await loadWorkspace(app, n);
      });
    } });
    plugin.addRibbonIcon('layout', 'Manage workspace layouts', manage);
  }
};
