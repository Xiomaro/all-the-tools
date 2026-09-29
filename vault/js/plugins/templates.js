/* Templates: insert a note from the template folder at the cursor, with
   {{title}}, {{date}}, {{time}} and {{date:FORMAT}} filled in and its
   properties merged into the note's. Options in templates.json. Other
   plugins create notes from templates with createFromTemplate. */

import { SuggestModal, fuzzyMatch, highlighted, h, Setting, Notice } from '../core/ui.js';
import { normalizePath } from '../core/fs.js';
import { fillTemplate, splitTemplate, mergeProperties, findTemplateFile, loadSettings } from './lib/template.js';
import { folderSuggest } from './lib/suggest.js';

export { fillTemplate, findTemplateFile };

const DEFAULTS = { folder: '', dateFormat: 'YYYY-MM-DD', timeFormat: 'HH:mm' };

/* The text of a new note made from `templatePath` (a setting's value),
   or '' when there's no template. opts as fillTemplate's. */
export async function createFromTemplate(app, templatePath, opts = {}) {
  const tpl = findTemplateFile(app, templatePath);
  if (!tpl) {
    if (templatePath) new Notice('Couldn’t find the template "' + templatePath + '".');
    return '';
  }
  return fillTemplate(await app.vault.read(tpl), opts);
}

/* Insert a template into an editor at the cursor (replacing any
   selection) and merge its properties into the note's. */
export function insertTemplate(editor, templateText) {
  const { data, body } = splitTemplate(templateText);
  editor.replaceSelection(body);
  const props = mergeProperties(editor.getValue(), data);
  if (props) editor.replaceRange(props.text, editor.offsetToPos(props.from), editor.offsetToPos(props.to));
}

function templateFiles(app, folder) {
  const dir = normalizePath(folder || '');
  return app.vault.getMarkdownFiles().filter(f => !dir || f.path.startsWith(dir + '/'))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export default {
  id: 'templates',
  name: 'Templates',
  description: 'Insert templates into the current note.',
  async onload(plugin) {
    const app = plugin.app;
    const settings = () => loadSettings(plugin, DEFAULTS);

    const chooseTemplate = async (editor, view) => {
      const s = await settings();
      if (!s.folder || !app.vault.getFolder(normalizePath(s.folder))) {
        new Notice(s.folder ? 'The template folder "' + s.folder + '" doesn’t exist. Set it in Settings → Templates.'
          : 'Set the template folder location in Settings → Templates first.');
        return;
      }
      const files = templateFiles(app, s.folder);
      if (!files.length) { new Notice('No templates found in "' + s.folder + '".'); return; }
      const dir = normalizePath(s.folder) + '/';
      new SuggestModal(app, {
        placeholder: 'Type to search templates...',
        emptyText: 'No templates found.',
        getSuggestions: q => files.map(f => ({ f, name: f.path.slice(dir.length, -3), m: fuzzyMatch(q, f.path.slice(dir.length, -3)) }))
          .filter(x => x.m).sort((a, b) => b.m.score - a.m.score || a.name.localeCompare(b.name)),
        renderSuggestion: (x, el) => el.append(h('div.suggestion-content', h('div.suggestion-title', highlighted(x.name, x.m.matches)))),
        onChoose: async x => {
          const text = fillTemplate(await app.vault.read(x.f), {
            title: view.file ? view.file.basename : '', dateFormat: s.dateFormat || DEFAULTS.dateFormat, timeFormat: s.timeFormat || DEFAULTS.timeFormat });
          insertTemplate(editor, text);
          editor.focus();
        }
      }).open();
    };

    plugin.addCommand({ id: 'templates:insert-template', name: 'Templates: Insert template', icon: 'files',
      editorCallback: (editor, view) => chooseTemplate(editor, view) });
    plugin.addCommand({ id: 'templates:insert-current-date', name: 'Templates: Insert current date', icon: 'calendar',
      editorCallback: async editor => { const s = await settings(); editor.replaceSelection(window.moment().format(s.dateFormat || DEFAULTS.dateFormat)); } });
    plugin.addCommand({ id: 'templates:insert-current-time', name: 'Templates: Insert current time', icon: 'clock',
      editorCallback: async editor => { const s = await settings(); editor.replaceSelection(window.moment().format(s.timeFormat || DEFAULTS.timeFormat)); } });
    plugin.addRibbonIcon('files', 'Insert template', () => {
      if (!app.commands.execute('templates:insert-template')) new Notice('Open a note in editing view to insert a template.');
    });

    plugin.addSettingTab(async containerEl => {
      const s = await settings();
      const save = () => plugin.saveData(s);
      new Setting(containerEl).setName('Template folder location')
        .setDesc('Files in this folder will be available as templates.')
        .addText(t => { t.setPlaceholder('Example: folder/subfolder').setValue(s.folder).onChange(v => { s.folder = normalizePath(v.trim()); save(); }); folderSuggest(app, t.inputEl); });
      const preview = (fmt, fallback) => h('span', 'Your current syntax looks like this: ', h('b.u-pop', { text: window.moment().format(fmt || fallback) }));
      const fmtSetting = (key, name, variable) => {
        const desc = h('div', 'Default format for ' + variable + '. For more syntax, see ',
          h('a', { href: 'https://momentjs.com/docs/#/displaying/format/', target: '_blank', rel: 'noopener', text: 'format reference' }), '.', h('br'));
        const out = h('span');
        desc.appendChild(out);
        out.replaceChildren(preview(s[key], DEFAULTS[key]));
        new Setting(containerEl).setName(name).setDesc(desc)
          .addText(t => t.setPlaceholder(DEFAULTS[key]).setValue(s[key]).onChange(v => { s[key] = v; out.replaceChildren(preview(v, DEFAULTS[key])); save(); }));
      };
      fmtSetting('dateFormat', 'Date format', '{{date}}');
      fmtSetting('timeFormat', 'Time format', '{{time}}');
    });
  }
};
