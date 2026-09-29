/* The editor: notes in live preview, source mode and reading view, with
   Obsidian's editing commands, suggestions for links and tags, find and
   replace, and pasting or dropping attachments. The pieces live in
   ../editor/; this registers them. */

import { MarkdownView } from '../editor/view.js';
import { registerEditorCommands } from '../editor/commands.js';
import { loadTurndown } from '../editor/clipboard.js';

export { MarkdownView };

export default {
  id: 'markdown',
  name: 'Editor',
  description: 'Notes in live preview, source mode and reading view.',
  builtin: true,
  async onload(plugin) {
    const app = plugin.app;
    plugin.registerView('markdown', leaf => new MarkdownView(leaf));
    plugin.registerExtensions(['md'], 'markdown');
    registerEditorCommands(plugin);

    /* Write an open note's unsaved text to disk before something else
       reads, changes and writes the same file (the Properties editor,
       templates, other plugins), so neither side's change is lost. */
    const flush = async file => {
      const jobs = [];
      app.workspace.iterateAllLeaves(l => {
        const v = l.view;
        if (v instanceof MarkdownView && v.file === file && v.isDirty()) { v.requestSave.cancel(); jobs.push(v.save()); }
      });
      await Promise.all(jobs);
    };
    const vault = app.vault;
    const origProcess = vault.process;
    vault.process = async function (file, fn) { await flush(file); return origProcess.call(this, file, fn); };
    plugin.register(() => { vault.process = origProcess; });

    /* The HTML converter is only needed for pasting; fetch it once idle. */
    if (app.config.get('autoConvertHtml')) setTimeout(() => loadTurndown().catch(() => {}), 1500);
  }
};
