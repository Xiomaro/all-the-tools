/* Commands and hotkeys. Commands use Obsidian's ids ("editor:toggle-bold",
   "switcher:open", "daily-notes") so a vault's hotkeys.json applies as it
   is. A command is

     { id, name, icon?, hotkeys?: [{ modifiers: ['Mod', 'Shift'], key: 'F' }],
       callback?(), checkCallback?(checking) -> boolean,
       editorCallback?(editor, ctx), editorCheckCallback?(checking, editor, ctx) }

   "Mod" is Ctrl on Windows and Linux and Cmd on a Mac, as in Obsidian.

   Browsers keep a few shortcuts for themselves and never pass them to a
   page (Ctrl+N, Ctrl+T, Ctrl+W, Ctrl+Tab, Ctrl+Shift+T/N/W). A command
   whose hotkey is one of those also answers to the same key with Alt
   added, so "close tab" (Ctrl+W) is Ctrl+Alt+W here. */

import { isMac } from './ui.js';

const RESERVED = new Set(['Mod+N', 'Mod+T', 'Mod+W', 'Mod+Shift+N', 'Mod+Shift+T', 'Mod+Shift+W', 'Mod+Tab', 'Mod+Shift+Tab',
  'Ctrl+Tab', 'Ctrl+Shift+Tab', 'Mod+Q', 'Mod+PageDown', 'Mod+PageUp']);

export class Commands {
  constructor(app) {
    this.app = app;
    this.commands = new Map();
  }

  add(cmd) {
    if (!cmd.id || !cmd.name) throw new Error('A command needs an id and a name');
    cmd.defaultHotkeys = cmd.hotkeys || DEFAULT_HOTKEYS[cmd.id] || [];
    this.commands.set(cmd.id, cmd);
    return cmd;
  }

  remove(id) { this.commands.delete(id); }
  find(id) { return this.commands.get(id) || null; }
  list() { return Array.from(this.commands.values()).sort((a, b) => a.name.localeCompare(b.name)); }

  /* The hotkeys that apply: the vault's own list if it has one, else the
     defaults. */
  hotkeysFor(id) {
    const cmd = this.find(id);
    const own = this.app.config.hotkeys(id);
    return own || (cmd ? cmd.defaultHotkeys : []);
  }

  editorContext() {
    const view = this.app.workspace.activeEditor;
    return view && view.editor ? view : null;
  }

  isAvailable(cmd) {
    try {
      if (cmd.checkCallback) return !!cmd.checkCallback(true);
      if (cmd.editorCheckCallback || cmd.editorCallback) {
        const ctx = this.editorContext();
        if (!ctx) return false;
        return cmd.editorCheckCallback ? !!cmd.editorCheckCallback(true, ctx.editor, ctx) : true;
      }
      return true;
    } catch (e) { return false; }
  }

  listAvailable() { return this.list().filter(c => this.isAvailable(c)); }

  execute(id) {
    const cmd = typeof id === 'string' ? this.find(id) : id;
    if (!cmd || !this.isAvailable(cmd)) return false;
    try {
      if (cmd.checkCallback) cmd.checkCallback(false);
      else if (cmd.editorCheckCallback || cmd.editorCallback) {
        const ctx = this.editorContext();
        if (cmd.editorCheckCallback) cmd.editorCheckCallback(false, ctx.editor, ctx);
        else cmd.editorCallback(ctx.editor, ctx);
      } else if (cmd.callback) cmd.callback();
      this.app.workspace.trigger('command-executed', cmd);
    } catch (err) {
      console.error('[vault] command ' + cmd.id + ' failed', err);
    }
    return true;
  }

  /* Run the command bound to this key press, if any. */
  handleKey(e) {
    if (e.isComposing || e.key === 'Dead') return false;
    const pressed = eventToHotkey(e);
    if (!pressed || !pressed.key) return false;
    const want = hotkeyString(pressed);
    for (const cmd of this.commands.values()) {
      for (const hk of this.hotkeysFor(cmd.id)) {
        const s = hotkeyString(hk);
        if (s === want || (RESERVED.has(s) && hotkeyString(withAlt(hk)) === want)) {
          if (this.inInput && (cmd.editorCallback || cmd.editorCheckCallback)) continue;
          if (!this.isAvailable(cmd)) continue;
          e.preventDefault();
          e.stopPropagation();
          this.execute(cmd);
          return true;
        }
      }
    }
    return false;
  }

  /* Other commands that use the same hotkey, for the settings screen. */
  conflicts(hotkey, exceptId) {
    const s = hotkeyString(hotkey);
    return this.list().filter(c => c.id !== exceptId && this.hotkeysFor(c.id).some(h => hotkeyString(h) === s));
  }
}

function withAlt(hk) { return { modifiers: (hk.modifiers || []).concat(['Alt']), key: hk.key }; }

export function isReserved(hk) { return RESERVED.has(hotkeyString(hk)); }

/* Keys as Obsidian writes them: letters in capitals, arrows as ArrowUp,
   everything else as KeyboardEvent.key. */
function normaliseKey(e) {
  let k = e.key;
  if (!k) return '';
  if (e.code && /^Key[A-Z]$/.test(e.code)) return e.code.slice(3);
  if (e.code && /^Digit[0-9]$/.test(e.code)) return e.code.slice(5);
  if (k.length === 1) k = k.toUpperCase();
  if (k === ' ') k = 'Space';
  return k;
}

export function eventToHotkey(e) {
  if (['Control', 'Shift', 'Alt', 'Meta', 'OS'].includes(e.key)) return null;
  const mods = [];
  if (isMac ? e.metaKey : e.ctrlKey) mods.push('Mod');
  if (isMac && e.ctrlKey) mods.push('Ctrl');
  if (!isMac && e.metaKey) mods.push('Meta');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  return { modifiers: mods, key: normaliseKey(e) };
}

/* "Mod+Shift+F", a stable form for comparing. Ctrl on Windows means Mod. */
export function hotkeyString(hk) {
  if (!hk) return '';
  const order = ['Mod', 'Ctrl', 'Meta', 'Alt', 'Shift'];
  const mods = (hk.modifiers || []).map(m => (!isMac && m === 'Ctrl') ? 'Mod' : (isMac && m === 'Meta') ? 'Mod' : m);
  const uniq = order.filter(m => mods.includes(m));
  let key = String(hk.key || '');
  if (key.length === 1) key = key.toUpperCase();
  if (key === ' ') key = 'Space';
  return uniq.concat([key]).join('+');
}

const KEY_LABELS = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Enter: '↵', Escape: 'Esc', Backspace: '⌫', Delete: 'Del', Space: 'Space', ' ': 'Space' };

/* "Ctrl + Shift + F" (or "⌘ ⇧ F" on a Mac), for display. */
export function hotkeyLabel(hk) {
  const mods = (hk.modifiers || []).slice();
  const names = isMac ? { Mod: '⌘', Ctrl: '^', Meta: '⌘', Alt: '⌥', Shift: '⇧' } : { Mod: 'Ctrl', Ctrl: 'Ctrl', Meta: 'Win', Alt: 'Alt', Shift: 'Shift' };
  const order = ['Mod', 'Ctrl', 'Meta', 'Alt', 'Shift'];
  const parts = order.filter(m => mods.includes(m)).map(m => names[m]);
  parts.push(KEY_LABELS[hk.key] || hk.key);
  return parts.join(isMac ? ' ' : ' + ');
}

/* Obsidian's default hotkeys, by command id. Plugins pass their own when
   they add a command; this table is for the ones the core adds. */
export const DEFAULT_HOTKEYS = {
  'command-palette:open': [{ modifiers: ['Mod'], key: 'P' }],
  'switcher:open': [{ modifiers: ['Mod'], key: 'O' }],
  'global-search:open': [{ modifiers: ['Mod', 'Shift'], key: 'F' }],
  'app:open-settings': [{ modifiers: ['Mod'], key: ',' }],
  'app:go-back': [{ modifiers: ['Mod', 'Alt'], key: 'ArrowLeft' }],
  'app:go-forward': [{ modifiers: ['Mod', 'Alt'], key: 'ArrowRight' }],
  'app:open-help': [{ modifiers: [], key: 'F1' }],
  'file-explorer:new-file': [{ modifiers: ['Mod'], key: 'N' }],
  'workspace:new-tab': [{ modifiers: ['Mod'], key: 'T' }],
  'workspace:close': [{ modifiers: ['Mod'], key: 'W' }],
  'workspace:undo-close-pane': [{ modifiers: ['Mod', 'Shift'], key: 'T' }],
  'workspace:next-tab': [{ modifiers: ['Ctrl'], key: 'Tab' }, { modifiers: ['Mod'], key: 'PageDown' }],
  'workspace:previous-tab': [{ modifiers: ['Ctrl', 'Shift'], key: 'Tab' }, { modifiers: ['Mod'], key: 'PageUp' }],
  'workspace:goto-tab-1': [{ modifiers: ['Mod'], key: '1' }],
  'workspace:goto-tab-2': [{ modifiers: ['Mod'], key: '2' }],
  'workspace:goto-tab-3': [{ modifiers: ['Mod'], key: '3' }],
  'workspace:goto-tab-4': [{ modifiers: ['Mod'], key: '4' }],
  'workspace:goto-tab-5': [{ modifiers: ['Mod'], key: '5' }],
  'workspace:goto-tab-6': [{ modifiers: ['Mod'], key: '6' }],
  'workspace:goto-tab-7': [{ modifiers: ['Mod'], key: '7' }],
  'workspace:goto-tab-8': [{ modifiers: ['Mod'], key: '8' }],
  'workspace:goto-last-tab': [{ modifiers: ['Mod'], key: '9' }],
  'markdown:toggle-preview': [{ modifiers: ['Mod'], key: 'E' }],
  'editor:save-file': [{ modifiers: ['Mod'], key: 'S' }],
  'editor:open-search': [{ modifiers: ['Mod'], key: 'F' }],
  'editor:open-search-replace': [{ modifiers: ['Mod'], key: 'H' }],
  'editor:toggle-bold': [{ modifiers: ['Mod'], key: 'B' }],
  'editor:toggle-italics': [{ modifiers: ['Mod'], key: 'I' }],
  'editor:insert-link': [{ modifiers: ['Mod'], key: 'K' }],
  'editor:toggle-checklist-status': [{ modifiers: ['Mod'], key: 'L' }],
  'editor:toggle-comments': [{ modifiers: ['Mod'], key: '/' }],
  'editor:delete-paragraph': [{ modifiers: ['Mod'], key: 'D' }],
  'editor:follow-link': [{ modifiers: ['Alt'], key: 'Enter' }],
  'editor:open-link-in-new-leaf': [{ modifiers: ['Mod'], key: 'Enter' }],
  'editor:fold-all': [],
  'editor:unfold-all': [],
  'editor:toggle-fold': [],
  'editor:swap-line-up': [{ modifiers: ['Mod', 'Shift'], key: 'ArrowUp' }],
  'editor:swap-line-down': [{ modifiers: ['Mod', 'Shift'], key: 'ArrowDown' }],
  'editor:focus': [],
  'graph:open': [{ modifiers: ['Mod'], key: 'G' }],
  'editor:set-heading-1': [], 'editor:set-heading-2': [], 'editor:set-heading-3': []
};
