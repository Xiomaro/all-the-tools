/* Canvas: .canvas files (JSON Canvas 1.0) on an infinite board of cards,
   notes, media, web pages and groups joined by edges, like Obsidian's
   Canvas core plugin. The board lives in js/canvas/; this module registers
   the view, the "Create new canvas" command and ribbon button, "New
   canvas" on folder menus, the settings page, ![[x.canvas]] embeds, and
   keeps file references in canvases up to date when files move. */

import { CanvasView, VIEW_TYPE_CANVAS } from '../canvas/view.js';
import { renderCanvasEmbed } from '../canvas/embed.js';
import { parseCanvas, serializeCanvas } from '../canvas/data.js';
import { Setting, Notice } from '../core/ui.js';
import { joinPath, parentPath, normalizePath } from '../core/fs.js';

/* Settings, in .obsidian/canvas.json. */
const DEFAULTS = {
  newFileLocation: 'root',        /* 'root' | 'current' | 'folder' */
  newFileFolderPath: '',
  defaultWheelBehavior: 'pan',    /* 'pan' | 'zoom' */
  snapToGrid: true,
  snapToObjects: true
};

export default {
  id: 'canvas',
  name: 'Canvas',
  description: 'Lay out notes, text and media on an infinite board.',

  async onload(plugin) {
    const app = plugin.app;
    const stored = (await plugin.loadData()) || {};
    plugin.settings = Object.assign({}, DEFAULTS, stored);
    plugin.updateSettings = async patch => {
      Object.assign(plugin.settings, patch);
      await plugin.saveData(Object.assign({}, stored, plugin.settings));
    };

    plugin.registerView(VIEW_TYPE_CANVAS, leaf => new CanvasView(leaf, plugin));
    plugin.registerExtensions(['canvas'], VIEW_TYPE_CANVAS);

    const create = async folder => {
      let dir = '';
      if (folder) dir = folder.path;
      else if (plugin.settings.newFileLocation === 'current') {
        const active = app.workspace.getActiveFile();
        dir = active ? parentPath(active.path) : '';
      } else if (plugin.settings.newFileLocation === 'folder') dir = normalizePath(plugin.settings.newFileFolderPath || '');
      try {
        if (dir && !app.vault.getFolder(dir)) await app.vault.createFolder(dir);
        const file = await app.vault.create(app.vault.getAvailablePath(dir ? joinPath(dir, 'Untitled') : 'Untitled', 'canvas'), '');
        await app.workspace.getLeaf(false).openFile(file, { active: true });
        return file;
      } catch (err) {
        new Notice('Couldn’t create the canvas: ' + (err.message || err));
        return null;
      }
    };
    plugin.createCanvas = create;

    plugin.addCommand({ id: 'canvas:new-file', name: 'Create new canvas', icon: 'layout-dashboard', callback: () => create() });
    plugin.addRibbonIcon('layout-dashboard', 'Create new canvas', () => create());

    plugin.registerEvent(app.workspace.on('file-menu', (menu, file) => {
      if (!file || !file.isFolder) return;
      menu.addItem(i => i.setSection('new').setTitle('New canvas').setIcon('layout-dashboard').onClick(() => create(file)));
    }));

    /* Canvases point at files by path; follow renames and moves. Open
       canvases change through their view (so undo and saving work as
       usual); the rest are rewritten on disk. */
    plugin.registerEvent(app.vault.on('rename', (file, oldPath) => {
      if (file.isFolder) return;
      updateReferences(app, oldPath, file.path).catch(err => console.warn('[canvas] couldn’t update links to ' + file.path, err));
    }));

    plugin.addSettingTab(el => renderSettings(el, plugin), 'Canvas');

    const embed = (file, el, subpath, component) => renderCanvasEmbed(app, file, el, { depth: 1, component, interactive: true });
    plugin.registerCanvasEmbed = () => {
      const reg = app.embedRegistry;
      if (!reg || typeof reg.set !== 'function' || reg.get('canvas') === embed) return;
      reg.set('canvas', embed);
      plugin.register(() => { if (reg.get('canvas') === embed) reg.delete('canvas'); });
    };
    plugin.registerCanvasEmbed();
  },

  /* The renderer may set up app.embedRegistry after this plugin loads. */
  onLayoutReady(plugin) {
    if (plugin.registerCanvasEmbed) plugin.registerCanvasEmbed();
  }
};

async function updateReferences(app, oldPath, newPath) {
  const open = new Map();
  for (const leaf of app.workspace.getLeavesOfType(VIEW_TYPE_CANVAS)) {
    const v = leaf.view;
    if (!v || !v.file) continue;
    if (!open.has(v.file)) open.set(v.file, []);
    open.get(v.file).push(v);
  }
  const needle = JSON.stringify(oldPath);
  for (const file of app.vault.getFiles()) {
    if (file.extension !== 'canvas') continue;
    if (open.has(file)) { open.get(file).forEach(v => v.renameReference(oldPath, newPath)); continue; }
    const text = await app.vault.read(file);
    if (!text.includes(needle)) continue;
    const { data } = parseCanvas(text);
    if (!data) continue;
    let changed = false;
    for (const n of data.nodes) {
      if (n.file === oldPath) { n.file = newPath; changed = true; }
      if (n.background === oldPath) { n.background = newPath; changed = true; }
    }
    if (changed) await app.vault.modify(file, serializeCanvas(data));
  }
}

function renderSettings(el, plugin) {
  const s = plugin.settings;
  const save = patch => plugin.updateSettings(patch);
  el.replaceChildren();
  let folderRow;
  new Setting(el).setName('Default location for new canvas files')
    .setDesc('Where newly created canvases are placed.')
    .addDropdown(d => d.addOptions({ root: 'Vault folder', current: 'Same folder as current file', folder: 'In the folder specified below' })
      .setValue(s.newFileLocation)
      .onChange(v => { save({ newFileLocation: v }); folderRow.settingEl.style.display = v === 'folder' ? '' : 'none'; }));
  folderRow = new Setting(el).setName('Folder to create new canvas files in')
    .setDesc('Newly created canvases will appear in this folder.')
    .addText(t => t.setPlaceholder('Example: folder 1/folder 2').setValue(s.newFileFolderPath).onChange(v => save({ newFileFolderPath: v })));
  folderRow.settingEl.style.display = s.newFileLocation === 'folder' ? '' : 'none';
  new Setting(el).setName('Default mouse wheel behavior')
    .setDesc('What the scroll wheel does on a canvas. Hold Ctrl (⌘ on macOS) to do the other.')
    .addDropdown(d => d.addOptions({ pan: 'Pan', zoom: 'Zoom' }).setValue(s.defaultWheelBehavior).onChange(v => save({ defaultWheelBehavior: v })));
  new Setting(el).setName('Snap to grid')
    .setDesc('Line cards up with the dot grid when moving and resizing them. Hold Ctrl (⌘) while dragging to place freely.')
    .addToggle(t => t.setValue(s.snapToGrid).onChange(v => save({ snapToGrid: v })));
  new Setting(el).setName('Snap to objects')
    .setDesc('Line up the edges and centres of cards with nearby cards while moving them.')
    .addToggle(t => t.setValue(s.snapToObjects).onChange(v => save({ snapToObjects: v })));
}
