/* Random note: open a note chosen at random (never the one already open,
   when there's another to choose). */

import { Notice } from '../core/ui.js';
import { Workspace } from '../core/workspace.js';

export default {
  id: 'random-note',
  name: 'Random note',
  description: 'Open a random note from the vault.',
  async onload(plugin) {
    const app = plugin.app;
    const open = newLeaf => {
      const active = app.workspace.getActiveFile();
      let notes = app.vault.getMarkdownFiles();
      if (notes.length > 1 && active) notes = notes.filter(f => f !== active);
      if (!notes.length) { new Notice('There are no notes in this vault yet.'); return; }
      app.workspace.openFile(notes[Math.floor(Math.random() * notes.length)], newLeaf || false);
    };
    plugin.addCommand({ id: 'random-note', name: 'Random note: Open random note', icon: 'dices', callback: () => open(false) });
    plugin.addRibbonIcon('dices', 'Open random note', e => open(Workspace.leafFromEvent(e)));
  }
};
