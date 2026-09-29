/* Slash commands: type "/" at the start of a line or after a space to
   pick a command from a list at the cursor, as in Obsidian. The editor
   shows the list (app.editorSuggests); this supplies it. */

import { h, fuzzyMatch, highlighted } from '../core/ui.js';
import { hotkeyLabel } from '../core/commands.js';

const TRIGGER = /(?:^|\s)\/([^\s/][^/]{0,39})?$/;

export function slashTrigger(line, ch) {
  const before = line.slice(0, ch);
  const m = TRIGGER.exec(before);
  if (!m) return null;
  const query = m[1] || '';
  /* A query that ends in two spaces is prose, not a command. */
  if (/\s{2}$/.test(query)) return null;
  return { startCh: ch - query.length - 1, query };
}

export default {
  id: 'slash-command',
  name: 'Slash commands',
  description: 'Run commands by typing "/" in the editor.',
  async onload(plugin) {
    const app = plugin.app;
    plugin.registerEditorSuggest({
      id: 'slash-command',
      onTrigger(cursor, editor) {
        const t = slashTrigger(editor.getLine(cursor.line), cursor.ch);
        if (!t) return null;
        return { start: { line: cursor.line, ch: t.startCh }, end: cursor, query: t.query };
      },
      getSuggestions(ctx) {
        this.lastContext = ctx;
        const q = ctx.query.trim();
        const out = [];
        for (const cmd of app.commands.listAvailable()) {
          if (cmd.id === 'command-palette:open') continue;
          const m = q ? fuzzyMatch(q, cmd.name) : { score: 0, matches: [] };
          if (m) out.push({ cmd, matches: m.matches, score: m.score });
        }
        /* Nothing matches: close the list so "/" stays plain text. */
        return out.sort((a, b) => b.score - a.score || a.cmd.name.localeCompare(b.cmd.name)).slice(0, 50);
      },
      renderSuggestion(item, el) {
        el.classList.add('mod-complex');
        const aux = h('div.suggestion-aux');
        for (const hk of app.commands.hotkeysFor(item.cmd.id)) aux.appendChild(h('kbd.suggestion-hotkey', { text: hotkeyLabel(hk) }));
        el.append(h('div.suggestion-content', h('div.suggestion-title', highlighted(item.cmd.name, item.matches))), aux);
      },
      selectSuggestion(item, evt, ctx) {
        /* The contract passes (item, evt); take the context the editor set
           on us, else the one we last answered. */
        ctx = ctx || this.context || this.lastContext;
        if (ctx && ctx.editor) ctx.editor.replaceRange('', ctx.start, ctx.end);
        app.commands.execute(item.cmd.id);
      }
    });
  }
};
