/* Unique note creator: a new note named with a timestamp ("202609291530"),
   for Zettelkasten-style IDs. Options in zk-prefixer.json: folder, format,
   template. */

import { Setting, Notice, h } from '../core/ui.js';
import { Workspace } from '../core/workspace.js';
import { normalizePath, joinPath, parentPath } from '../core/fs.js';
import { loadSettings } from './lib/template.js';
import { createFromTemplate } from './templates.js';
import { folderSuggest, noteSuggest } from './lib/suggest.js';

const DEFAULTS = { folder: '', format: 'YYYYMMDDHHmm', template: '' };

export default {
  id: 'zk-prefixer',
  name: 'Unique note creator',
  description: 'Create notes with a unique timestamp name, for a Zettelkasten.',
  async onload(plugin) {
    const app = plugin.app;
    const settings = () => loadSettings(plugin, DEFAULTS);

    const create = async newLeaf => {
      const s = await settings();
      const now = window.moment();
      const name = now.format((s.format || '').trim() || DEFAULTS.format);
      const err = app.fileManager.checkName(name.split('/').pop());
      if (err) { new Notice('The unique note format makes an invalid name: ' + err); return; }
      let dir = normalizePath((s.folder || '').trim());
      if (!dir) {
        const active = app.workspace.getActiveFile();
        dir = app.fileManager.getNewFileParent(active ? active.path : '').path || '';
      }
      const path = app.vault.getAvailablePath(joinPath(dir, name), 'md');
      const title = path.slice(path.lastIndexOf('/') + 1, -3);
      try {
        const text = s.template ? await createFromTemplate(app, s.template, { title, date: now }) : '';
        const parent = parentPath(path);
        if (parent && !app.vault.getFolder(parent)) await app.vault.createFolder(parent);
        const file = await app.vault.create(path, text);
        await app.workspace.openFile(file, newLeaf || false);
      } catch (e) { new Notice('Couldn’t create the note: ' + (e.message || e)); }
    };

    plugin.addCommand({ id: 'zk-prefixer', name: 'Unique note creator: Create new unique note', icon: 'file-plus-2', callback: () => create(false) });
    plugin.addRibbonIcon('file-plus-2', 'Create new unique note', e => create(Workspace.leafFromEvent(e)));

    plugin.addSettingTab(async containerEl => {
      const s = await settings();
      const save = () => plugin.saveData(s);
      new Setting(containerEl).setName('New file location')
        .setDesc('New unique notes will be placed here. Leave empty to use the location for new notes.')
        .addText(t => { t.setPlaceholder('Example: folder 1/folder 2').setValue(s.folder).onChange(v => { s.folder = v.trim(); save(); }); folderSuggest(app, t.inputEl); });
      const sample = h('b.u-pop');
      const show = () => { sample.textContent = window.moment().format((s.format || '').trim() || DEFAULTS.format); };
      show();
      new Setting(containerEl).setName('Unique prefix format')
        .setDesc(h('div', 'For more syntax, refer to ',
          h('a', { href: 'https://momentjs.com/docs/#/displaying/format/', target: '_blank', rel: 'noopener', text: 'format reference' }),
          '.', h('br'), 'Your current syntax looks like this: ', sample))
        .addText(t => t.setPlaceholder(DEFAULTS.format).setValue(s.format).onChange(v => { s.format = v; show(); save(); }));
      new Setting(containerEl).setName('Template file location')
        .setDesc('Choose the file to use as a template.')
        .addText(t => { t.setPlaceholder('Example: folder/note').setValue(s.template).onChange(v => { s.template = v.trim(); save(); }); noteSuggest(app, t.inputEl); });
    });
  }
};
