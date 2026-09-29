/* Note composer: merge a note into another (links to it follow), or move
   the selection or a heading's section out into a note of its own, leaving
   a link or embed behind. Options in note-composer.json: template,
   replacementText ("link" | "embed" | "none"), askBeforeMerging. */

import { SuggestModal, Setting, Notice, h, fuzzyMatch, highlighted, confirmDialog } from '../core/ui.js';
import { parseMarkdown, splitFrontmatter } from '../core/metadata.js';
import { parentPath, joinPath } from '../core/fs.js';
import { fillTemplate, splitTemplate, mergeProperties, findTemplateFile, loadSettings } from './lib/template.js';
import { noteSuggest } from './lib/suggest.js';

const DEFAULTS = { template: '', replacementText: 'link', askBeforeMerging: true };

/* Pick a note, or type a name for a new one. */
class NotePicker extends SuggestModal {
  constructor(app, opts) {
    super(app, Object.assign({ limit: 100 }, opts));
    this.exclude = opts.exclude;
    this.allowCreate = opts.allowCreate;
  }
  getSuggestions(q) {
    const query = q.trim();
    const out = [];
    for (const f of this.app.vault.getMarkdownFiles()) {
      if (f === this.exclude) continue;
      const full = f.path.slice(0, -3);
      const m = fuzzyMatch(query, f.basename) || fuzzyMatch(query, full);
      if (m) out.push({ file: f, m, score: m.score + (f.basename.toLowerCase() === query.toLowerCase() ? 50 : 0) });
    }
    out.sort((a, b) => b.score - a.score || a.file.path.localeCompare(b.file.path));
    if (this.allowCreate && query && !out.some(x => x.file.basename.toLowerCase() === query.toLowerCase())) {
      out.unshift({ create: query });
    }
    return out;
  }
  renderSuggestion(x, el) {
    el.classList.add('mod-complex');
    if (x.create) {
      el.append(h('div.suggestion-content', h('div.suggestion-title', { text: x.create }), h('div.suggestion-note', { text: 'Create new note' })),
        h('div.suggestion-aux', h('kbd.suggestion-hotkey', { text: '↵' })));
      return;
    }
    const title = x.file.basename;
    const onName = fuzzyMatch(this.inputEl.value.trim(), title);
    el.append(h('div.suggestion-content',
      h('div.suggestion-title', onName ? highlighted(title, onName.matches) : title),
      parentPath(x.file.path) ? h('div.suggestion-note', { text: parentPath(x.file.path) + '/' }) : null));
  }
}

/* Where a new note from an extraction goes, and its text. */
async function newNoteFor(app, s, name, source, content) {
  const typed = name.replace(/\.md$/i, '').trim();
  const base = typed.split('/').pop();
  const err = app.fileManager.checkName(base);
  if (err) throw new Error(err);
  const dir = typed.includes('/') ? parentPath(typed) : (app.fileManager.getNewFileParent(source.path).path || '');
  if (dir && !app.vault.getFolder(dir)) await app.vault.createFolder(dir);
  const path = app.vault.getAvailablePath(joinPath(dir, base), 'md');
  let text = content;
  const tpl = findTemplateFile(app, s.template);
  if (tpl) {
    const raw = await app.vault.read(tpl);
    const title = path.slice(path.lastIndexOf('/') + 1, -3);
    text = fillTemplate(raw, { title, vars: { content, fromTitle: source.basename, newTitle: title } });
    if (!/{{\s*content\s*}}/i.test(raw)) text = text.replace(/\s*$/, '\n\n') + content;
  }
  return app.vault.create(path, text);
}

/* Add `content` (which may have properties) to the end or the start of
   another note's body, merging properties. */
function combine(targetText, content, atStart) {
  const { data, body } = splitTemplate(content);
  const fm = splitFrontmatter(targetText);
  const head = fm ? targetText.slice(0, fm.bodyStart) : '';
  const tbody = fm ? targetText.slice(fm.bodyStart) : targetText;
  const piece = body.replace(/^\s*\n/, '').replace(/\s+$/, '');
  let next;
  if (!tbody.trim()) next = head + piece + '\n';
  else if (atStart) next = head + piece + '\n\n' + tbody.replace(/^\s*\n/, '');
  else next = head + tbody.replace(/\s+$/, '') + '\n\n' + piece + '\n';
  const props = mergeProperties(next, data);
  return props ? props.text + next.slice(props.to) : next;
}

/* Merge `source` into `target`: links to the source point at the target
   afterwards, then the source is deleted. */
export async function mergeFiles(app, source, target, atStart) {
  const incoming = app.metadataCache.getBacklinksForFile(source);
  /* Links in the target itself are fixed before its text moves. */
  if (incoming.has(target.path)) await app.fileManager.rewriteLinks(target, incoming.get(target.path).map(ref => ({ ref, target })));
  const text = await app.vault.read(source);
  await app.vault.process(target, t => combine(t, text, atStart));
  let count = 0;
  for (const [src, refs] of incoming) {
    if (src === target.path || src === source.path) continue;
    const f = app.vault.getFileByPath(src);
    if (!f) continue;
    await app.fileManager.rewriteLinks(f, refs.map(ref => ({ ref, target })));
    count += refs.length;
  }
  /* Tabs showing the source show the target instead. */
  const leaves = [];
  app.workspace.iterateAllLeaves(l => { if (l.view && l.view.file === source) leaves.push(l); });
  for (const l of leaves) await l.openFile(target);
  await app.fileManager.trashFile(source, true);
  return count;
}

/* The range of a heading's section: from the heading line to the next
   heading of the same or a higher level. */
function headingSection(text, line) {
  const cache = parseMarkdown(text);
  const hs = cache.headings || [];
  const i = hs.findIndex(x => x.position.start.line === line);
  if (i < 0) return null;
  const hd = hs[i];
  const next = hs.slice(i + 1).find(x => x.level <= hd.level);
  return { heading: hd.heading, level: hd.level, from: hd.position.start.offset, bodyFrom: hd.position.end.offset, to: next ? next.position.start.offset : text.length };
}

export default {
  id: 'note-composer',
  name: 'Note composer',
  description: 'Merge notes, and move selections or sections into new notes.',
  async onload(plugin) {
    const app = plugin.app;
    const settings = () => loadSettings(plugin, DEFAULTS);

    const replacement = (s, file, source) => {
      if (s.replacementText === 'none') return '';
      const link = app.fileManager.generateMarkdownLink(file, source.path);
      return s.replacementText === 'embed' ? '!' + link : link;
    };

    const merge = source => {
      const modal = new NotePicker(app, {
        exclude: source,
        placeholder: 'Select a note to merge "' + source.basename + '" into...',
        emptyText: 'No notes found.',
        instructions: [
          { command: '↑↓', purpose: 'to navigate' },
          { command: '↵', purpose: 'to merge at the end' },
          { command: 'shift ↵', purpose: 'to merge at the start' },
          { command: 'esc', purpose: 'to dismiss' }
        ],
        onChoose: async (x, evt) => {
          const target = x.file;
          const s = await settings();
          if (s.askBeforeMerging !== false) {
            const ok = await confirmDialog(app, 'Merge file',
              'Merge "' + source.basename + '" into "' + target.basename + '"? "' + source.basename + '" will be deleted and links to it will point at "' + target.basename + '".', 'Merge', true);
            if (!ok) return;
          }
          try {
            const n = await mergeFiles(app, source, target, !!(evt && evt.shiftKey));
            new Notice('Merged "' + source.basename + '" into "' + target.basename + '"' + (n ? ' and updated ' + n + ' link' + (n === 1 ? '' : 's') : '') + '.');
          } catch (e) { new Notice('Couldn’t merge: ' + (e.message || e)); }
        }
      });
      modal.open();
    };

    /* Move `content` into a note picked or named in the picker; `from`..`to`
       in the editor (or the selection, when not given) is replaced. */
    const extract = (editor, source, content, from, to, suggested) => {
      const modal = new NotePicker(app, {
        exclude: source,
        allowCreate: true,
        placeholder: 'Type a name for the new note, or choose one to add to...',
        emptyText: 'Type a name to create a new note.',
        instructions: [
          { command: '↑↓', purpose: 'to navigate' },
          { command: '↵', purpose: 'to extract' },
          { command: 'shift ↵', purpose: 'to add at the start of an existing note' },
          { command: 'esc', purpose: 'to dismiss' }
        ],
        onChoose: async (x, evt) => {
          const s = await settings();
          try {
            let file;
            if (x.create) file = await newNoteFor(app, s, x.create, source, content);
            else {
              file = x.file;
              await app.vault.process(file, t => combine(t, content, !!(evt && evt.shiftKey)));
            }
            const rep = replacement(s, file, source);
            if (from) editor.replaceRange(rep, from, to);
            else editor.replaceSelection(rep);
            new Notice((x.create ? 'Extracted to the new note "' : 'Added to "') + file.basename + '".');
          } catch (e) { new Notice('Couldn’t extract: ' + (e.message || e)); }
        }
      });
      modal.open();
      if (suggested) { modal.inputEl.value = suggested; modal.update(); }
    };

    plugin.addCommand({ id: 'note-composer:merge-file', name: 'Note composer: Merge current file with another file...', icon: 'git-merge',
      checkCallback: checking => {
        const f = app.workspace.getActiveFile();
        if (!f || f.extension !== 'md') return false;
        if (!checking) merge(f);
        return true;
      } });

    plugin.addCommand({ id: 'note-composer:split-file', name: 'Note composer: Extract current selection...', icon: 'scissors',
      editorCheckCallback: (checking, editor, view) => {
        if (!view.file || !editor.somethingSelected()) return false;
        if (!checking) extract(editor, view.file, editor.getSelection(), null, null, '');
        return true;
      } });

    plugin.addCommand({ id: 'note-composer:extract-heading', name: 'Note composer: Extract this heading...', icon: 'scissors',
      editorCheckCallback: (checking, editor, view) => {
        if (!view.file) return false;
        const line = editor.getCursor().line;
        if (!/^ {0,3}#{1,6}[ \t]/.test(editor.getLine(line))) return false;
        if (!checking) {
          const text = editor.getValue();
          const sec = headingSection(text, line);
          if (!sec) return false;
          const body = text.slice(sec.bodyFrom, sec.to).replace(/^\r?\n/, '').replace(/\s+$/, '') + '\n';
          const name = sec.heading.replace(/[\\/:*?"<>|#^[\]]/g, ' ').replace(/\s+/g, ' ').trim();
          /* The section goes and a link (or nothing) takes its place,
             keeping the blank lines before the next heading. */
          const to = sec.to - text.slice(sec.from, sec.to).match(/\s*$/)[0].length;
          extract(editor, view.file, body, editor.offsetToPos(sec.from), editor.offsetToPos(to), name);
        }
        return true;
      } });

    /* In the file menu too, as in Obsidian. */
    plugin.registerEvent(app.workspace.on('file-menu', (menu, file) => {
      if (!file || file.isFolder || file.extension !== 'md') return;
      menu.addItem(i => i.setSection('action').setTitle('Merge entire file with...').setIcon('git-merge').onClick(() => merge(file)));
    }));

    plugin.addSettingTab(async containerEl => {
      const s = await settings();
      const save = () => plugin.saveData(s);
      new Setting(containerEl).setName('Text after extraction')
        .setDesc('What to show in place of the selected text after extracting it.')
        .addDropdown(d => d.addOptions({ link: 'Link to new file', embed: 'Embed new file', none: 'None' })
          .setValue(s.replacementText || 'link').onChange(v => { s.replacementText = v; save(); }));
      new Setting(containerEl).setName('Template file location')
        .setDesc(h('div', 'Template to use when creating a note by extracting. Besides {{title}}, {{date}} and {{time}} it can use {{content}}, {{fromTitle}} and {{newTitle}}.'))
        .addText(t => { t.setPlaceholder('Example: folder/note').setValue(s.template).onChange(v => { s.template = v.trim(); save(); }); noteSuggest(app, t.inputEl); });
      new Setting(containerEl).setName('Confirm file merge')
        .setDesc('Ask before merging two notes.')
        .addToggle(t => t.setValue(s.askBeforeMerging !== false).onChange(v => { s.askBeforeMerging = v; save(); }));
    });
  }
};

