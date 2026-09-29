/* Word count in the status bar: words and characters in the note, or in
   the selection when there is one. CJK characters count as words, as in
   Obsidian; properties don't count. */

import { h } from '../core/ui.js';
import { countWords, countCharacters, countableText } from './lib/text.js';

function plural(n, one, many) { return n.toLocaleString() + ' ' + (n === 1 ? one : many); }

export default {
  id: 'word-count',
  name: 'Word count',
  description: 'Show the number of words and characters in the status bar.',
  async onload(plugin) {
    const app = plugin.app;
    const el = plugin.addStatusBarItem();
    el.classList.add('plugin-word-count');
    const words = h('span.status-bar-item-segment');
    const chars = h('span.status-bar-item-segment');
    el.append(words, chars);

    const show = text => {
      if (text === null) { el.style.display = 'none'; return; }
      el.style.display = '';
      words.textContent = plural(countWords(text), 'word', 'words');
      chars.textContent = plural(countCharacters(text), 'character', 'characters');
    };

    /* The editor's text (or selection) when the active tab is editing a
       note; otherwise the note's saved text (reading view). */
    const update = () => {
      const leaf = app.workspace.getMostRecentLeaf();
      const view = leaf && leaf.view;
      const file = view && view.file;
      if (!file || file.extension !== 'md') return show(null);
      const editor = view.editor && (!view.getMode || view.getMode() === 'source') ? view.editor : null;
      if (editor) {
        try {
          if (editor.somethingSelected && editor.somethingSelected()) return show(editor.getSelection());
          return show(countableText(editor.getValue()));
        } catch (e) { /* editor not ready yet */ }
      }
      const text = app.vault.texts.get(file.path);
      show(text === undefined ? null : countableText(text));
    };
    let timer = null;
    const soon = () => { clearTimeout(timer); timer = setTimeout(update, 50); };
    plugin.register(() => clearTimeout(timer));

    plugin.registerEvent(app.workspace.on('editor-change', soon));
    plugin.registerEvent(app.workspace.on('editor-selection-change', soon));
    plugin.registerEvent(app.workspace.on('file-open', soon));
    plugin.registerEvent(app.workspace.on('active-leaf-change', soon));
    plugin.registerEvent(app.workspace.on('layout-change', soon));
    plugin.registerEvent(app.vault.on('modify', f => { if (f === app.workspace.getActiveFile()) soon(); }));
    update();
  }
};
