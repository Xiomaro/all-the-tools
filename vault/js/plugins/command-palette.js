/* Command palette (Ctrl/Cmd+P): every command available right now, with
   its hotkeys. Pinned commands (command-palette.json { pinned: [ids] })
   come first, then the ones used recently. */

import { SuggestModal, fuzzyMatch, highlighted, h, icon, Setting } from '../core/ui.js';
import { hotkeyLabel } from '../core/commands.js';
import { loadSettings } from './lib/template.js';

const DEFAULTS = { pinned: [] };
const RECENT_MAX = 20;

function recentKey(app) { return 'vault-recent-commands:' + (app.meta && app.meta.id || app.vault.getName()); }
function loadRecent(app) {
  try { const v = JSON.parse(localStorage.getItem(recentKey(app)) || '[]'); return Array.isArray(v) ? v : []; }
  catch (e) { return []; }
}
function pushRecent(app, id) {
  const list = [id].concat(loadRecent(app).filter(x => x !== id)).slice(0, RECENT_MAX);
  try { localStorage.setItem(recentKey(app), JSON.stringify(list)); } catch (e) { /* private mode */ }
}

class CommandPalette extends SuggestModal {
  constructor(app, settings) {
    super(app, { placeholder: 'Select a command...', emptyText: 'No commands found.' });
    this.pinned = (settings.pinned || []).slice();
    this.modalEl.classList.add('mod-command-palette');
    /* Availability depends on the note that was active when it opened. */
    this.commands = app.commands.listAvailable();
  }

  getSuggestions(query) {
    const pinned = new Set(this.pinned);
    const q = query.trim();
    if (!q) {
      const byId = new Map(this.commands.map(c => [c.id, c]));
      const out = [];
      const add = c => { if (c && !out.includes(c)) out.push(c); };
      this.pinned.forEach(id => add(byId.get(id)));
      loadRecent(this.app).forEach(id => add(byId.get(id)));
      this.commands.forEach(add);
      return out.map(cmd => ({ cmd, matches: [], pinned: pinned.has(cmd.id) }));
    }
    const recent = loadRecent(this.app);
    const out = [];
    for (const cmd of this.commands) {
      const m = fuzzyMatch(q, cmd.name);
      if (!m) continue;
      const r = recent.indexOf(cmd.id);
      out.push({ cmd, matches: m.matches, pinned: pinned.has(cmd.id), score: m.score + (r > -1 ? 2 - r * 0.05 : 0) });
    }
    return out.sort((a, b) => b.score - a.score || a.cmd.name.localeCompare(b.cmd.name));
  }

  renderSuggestion(item, el) {
    el.classList.add('mod-complex');
    const aux = h('div.suggestion-aux');
    if (item.pinned) aux.appendChild(h('span.suggestion-flair', { 'aria-label': 'Pinned', title: 'Pinned' }, icon('pin')));
    for (const hk of this.app.commands.hotkeysFor(item.cmd.id)) aux.appendChild(h('kbd.suggestion-hotkey', { text: hotkeyLabel(hk) }));
    el.append(h('div.suggestion-content', h('div.suggestion-title', highlighted(item.cmd.name, item.matches))), aux);
  }

  onChooseSuggestion(item) {
    pushRecent(this.app, item.cmd.id);
    this.app.commands.execute(item.cmd.id);
  }
}

export default {
  id: 'command-palette',
  name: 'Command palette',
  description: 'Run any command with the keyboard.',
  async onload(plugin) {
    const app = plugin.app;
    /* Open at once, with the settings from the config cache (loaded at
       start-up, updated on every save): waiting on the disk here would lose
       the first keys typed. */
    loadSettings(plugin, DEFAULTS);
    const open = () => {
      const data = app.config.json.get(plugin.id);
      new CommandPalette(app, Object.assign({}, DEFAULTS, data && typeof data === 'object' ? data : {})).open();
    };
    plugin.addCommand({ id: 'command-palette:open', name: 'Command palette: Open command palette', icon: 'terminal-square', callback: open });
    plugin.addRibbonIcon('terminal-square', 'Open command palette', open);

    plugin.addSettingTab(async containerEl => {
      const s = await loadSettings(plugin, DEFAULTS);
      if (!Array.isArray(s.pinned)) s.pinned = [];
      const save = () => plugin.saveData(s);
      const render = () => {
        containerEl.replaceChildren();
        new Setting(containerEl).setName('Pinned commands')
          .setDesc('Pinned commands are shown at the top of the command palette.').setHeading();
        s.pinned.forEach((id, i) => {
          const cmd = app.commands.find(id);
          new Setting(containerEl).setClass('mod-pinned-command')
            .setName(cmd ? cmd.name : id)
            .setDesc(cmd ? '' : 'This command isn’t available (its plugin may be turned off).')
            .addExtraButton(b => b.setIcon('arrow-up').setTooltip('Move up').setDisabled(i === 0).onClick(() => {
              if (i === 0) return;
              [s.pinned[i - 1], s.pinned[i]] = [s.pinned[i], s.pinned[i - 1]]; save(); render();
            }))
            .addExtraButton(b => b.setIcon('arrow-down').setTooltip('Move down').setDisabled(i === s.pinned.length - 1).onClick(() => {
              if (i === s.pinned.length - 1) return;
              [s.pinned[i + 1], s.pinned[i]] = [s.pinned[i], s.pinned[i + 1]]; save(); render();
            }))
            .addExtraButton(b => b.setIcon('x').setTooltip('Unpin').onClick(() => { s.pinned.splice(i, 1); save(); render(); }));
        });
        new Setting(containerEl).setName('New pinned command')
          .addButton(b => b.setButtonText('Select command').onClick(() => {
            new SuggestModal(app, {
              placeholder: 'Select a command to pin...',
              getSuggestions: q => app.commands.list().filter(c => !s.pinned.includes(c.id))
                .map(c => ({ c, m: fuzzyMatch(q, c.name) })).filter(x => x.m)
                .sort((a, b) => b.m.score - a.m.score || a.c.name.localeCompare(b.c.name)),
              renderSuggestion: (x, el) => el.append(h('div.suggestion-content', h('div.suggestion-title', highlighted(x.c.name, x.m.matches)))),
              onChoose: x => { s.pinned.push(x.c.id); save(); render(); }
            }).open();
          }));
      };
      render();
    });
  }
};
