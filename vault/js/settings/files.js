/* Settings → Files and links: deletion, link updating and format, where
   new notes and attachments go, and excluded files. */

import { Setting, Modal, h, icon, Notice } from '../core/ui.js';
import { heading, desc, browserNote, appToggle, appDropdown, unavailable } from './helpers.js';

export function renderFiles(app, el, ctx) {
  const cfg = app.config;

  heading(el, 'Deleting files');
  appToggle(app, el, 'promptDelete', 'Confirm file deletion', 'Prompt before deleting a file.');
  appDropdown(app, el, 'trashOption', 'Deleted files', 'What happens to a file after you delete it.',
    [['system', 'Move to system trash'], ['local', 'Move to Obsidian trash (.trash folder)'], ['none', 'Permanently delete']])
    .then(s => s.descEl.append(browserNote('A browser can’t reach the system trash, so “Move to system trash” also moves files to the vault’s .trash folder here. Obsidian on the desktop keeps using the system trash.')));

  heading(el, 'Links');
  appToggle(app, el, 'alwaysUpdateLinks', 'Automatically update internal links',
    'When you rename a file, automatically update links to it. When this is off, you’ll be asked.');
  appDropdown(app, el, 'newLinkFormat', 'New link format', 'What links to insert when auto-generating internal links.',
    [['shortest', 'Shortest path when possible'], ['relative', 'Relative path to file'], ['absolute', 'Absolute path in vault']]);
  appToggle(app, el, 'useMarkdownLinks', 'Use [[Wikilinks]]',
    'Auto-generate Wikilinks for [[links]] and ![[images]] instead of Markdown links and images. Disable this option to generate Markdown links instead.',
    { invert: true });
  appToggle(app, el, 'showUnsupportedFiles', 'Detect all file extensions',
    'Show files with any extension even if they can’t be opened here, so that you can link to them and see them in the file explorer and quick switcher.');

  heading(el, 'New notes');
  appDropdown(app, el, 'newFileLocation', 'Default location for new notes',
    'Where newly created notes are placed. Plugin settings will override this.',
    [['root', 'Vault folder'], ['current', 'Same folder as current file'], ['folder', 'In the folder specified below']],
    { onChange: () => ctx.refresh() });
  if (cfg.get('newFileLocation') === 'folder') {
    new Setting(el).setName('Folder to create new notes in')
      .setDesc('Newly created notes will appear under this folder. Plugin settings will override this.')
      .addText(t => { folderInput(app, t.inputEl); t.setPlaceholder('Example: folder 1/folder 2').setValue(cfg.get('newFileFolderPath') || '')
        .onChange(v => cfg.set('newFileFolderPath', v.trim().replace(/^\/+|\/+$/g, ''))); });
  }

  heading(el, 'Attachments');
  const path = String(cfg.get('attachmentFolderPath') ?? '/');
  const mode = path === '/' || path === '' ? 'root' : path === './' || path === '.' ? 'current' : path.startsWith('./') ? 'subfolder' : 'folder';
  new Setting(el).setName('Default location for new attachments').setDesc('Where newly added attachments are placed.')
    .addDropdown(d => d
      .addOptions({ root: 'Vault folder', folder: 'In the folder specified below', current: 'Same folder as current file', subfolder: 'In subfolder under current folder' })
      .setValue(mode)
      .onChange(v => {
        const last = cfg.get('attachmentFolderPath') || '';
        const name = String(last).replace(/^\.\/?/, '').replace(/^\/$/, '');
        cfg.set('attachmentFolderPath', v === 'root' ? '/' : v === 'current' ? './' : v === 'subfolder' ? './' + (name || 'attachments') : (name || 'attachments'));
        ctx.refresh();
      }));
  if (mode === 'folder') {
    new Setting(el).setName('Attachment folder path')
      .setDesc('Place newly created attachment files, such as images created via drag-and-drop or audio recordings, in this folder.')
      .addText(t => { folderInput(app, t.inputEl); t.setPlaceholder('Example: folder 1/folder 2').setValue(path)
        .onChange(v => { const x = v.trim().replace(/^\/+|\/+$/g, ''); cfg.set('attachmentFolderPath', x || '/'); }); });
  } else if (mode === 'subfolder') {
    new Setting(el).setName('Subfolder name')
      .setDesc('If your file is under “vault/folder”, and you set subfolder name to “attachments”, attachments will be saved to “vault/folder/attachments”.')
      .addText(t => t.setPlaceholder('attachments').setValue(path.slice(2))
        .onChange(v => { const x = v.trim().replace(/^\/+|\/+$/g, ''); cfg.set('attachmentFolderPath', './' + x); }));
  }

  heading(el, 'Advanced');
  const filters = () => (cfg.get('userIgnoreFilters') || []);
  new Setting(el).setName('Excluded files')
    .setDesc(desc('Excluded files will be hidden in Search, Graph View, and Unlinked Mentions, less noticeable in Quick Switcher and link suggestions.',
      filters().length ? '\n' + filters().length + (filters().length === 1 ? ' filter' : ' filters') + ': ' + filters().join(', ') : ''))
    .addButton(b => b.setButtonText('Manage').onClick(() => new ExcludedFilesModal(app, () => ctx.refresh()).open()));
  unavailable(el, 'Override config folder',
    'Use a different config folder than the default one. Must start with a dot.',
    'Not supported here: the settings are always read from and written to .obsidian.');
}

/* A text box that suggests the vault's folders as you type. */
export function folderInput(app, input) {
  const id = 'vault-folders-' + Math.random().toString(36).slice(2);
  const list = h('datalist', { id }, app.vault.getAllFolders(false).map(f => f.path).sort((a, b) => a.localeCompare(b)).map(p => h('option', { value: p })));
  input.setAttribute('list', id);
  input.after(list);
  return input;
}

/* The list editor behind Excluded files → Manage: one filter per line, a
   path prefix ("Archive/") or a /regex/, as Obsidian stores them. */
class ExcludedFilesModal extends Modal {
  constructor(app, done) { super(app); this.done = done; this.setTitle('Excluded files'); this.modalEl.classList.add('mod-settings-list-editor'); }

  onOpen() { this.draw(); }
  onClose() { this.done(); }

  draw() {
    const cfg = this.app.config;
    const list = (cfg.get('userIgnoreFilters') || []).slice();
    const save = next => { cfg.set('userIgnoreFilters', next); this.draw(); };
    const input = h('input', { type: 'text', placeholder: 'Folder path or /regex/', spellcheck: false });
    folderInput(this.app, input);
    const add = () => {
      const v = input.value.trim();
      if (!v) return;
      if (list.includes(v)) return new Notice('That filter is already in the list.');
      save(list.concat([v]));
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); add(); } });
    this.contentEl.replaceChildren(
      h('p.setting-item-description', { text: 'Files whose path starts with a filter, or matches a /regular expression/, are excluded.' }),
      h('div.settings-list-editor',
        list.length ? list.map((f, i) => h('div.settings-list-editor-item',
          h('span.settings-list-editor-text', { text: f }),
          h('div.clickable-icon', { 'aria-label': 'Remove', title: 'Remove', role: 'button', tabindex: '0',
            onclick: () => save(list.filter((_, j) => j !== i)) }, icon('x'))))
          : h('div.settings-list-editor-empty', { text: 'Nothing is excluded.' })),
      h('div.settings-list-editor-add', input, h('button.mod-cta', { text: 'Add', onclick: add })));
    /* Focus now, so Escape pressed straight after a redraw reaches this window. */
    input.focus();
  }
}
