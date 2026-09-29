/* Settings → Hotkeys: Obsidian's hotkey editor. Every command with its
   hotkeys as removable chips, "+" to record a new one, conflicts marked,
   "restore default" per command, and a search by name or by pressing a
   hotkey. Changes are written to hotkeys.json in Obsidian's format
   (command id → [{ modifiers, key }]); a command set back to its defaults
   is removed from the file, as Obsidian does. */

import { Setting, h, icon } from '../core/ui.js';
import { searchBox } from './helpers.js';
import { hotkeyLabel, hotkeyString, eventToHotkey, isReserved } from '../core/commands.js';

const MODIFIER_KEYS = ['Control', 'Shift', 'Alt', 'Meta', 'OS', 'AltGraph', 'CapsLock', 'Fn'];

export function renderHotkeys(app, el, ctx) {
  const state = ctx.modal.hotkeyState || (ctx.modal.hotkeyState = { query: '', hotkey: null, filter: 'all' });
  let recording = null;   /* { id, stop } while a hotkey is being recorded */

  const searchInput = h('input', { type: 'search', placeholder: 'Filter…', spellcheck: false, value: state.query, 'aria-label': 'Filter hotkeys' });
  const byKeyButton = h('div.clickable-icon.setting-filter-by-hotkey', { role: 'button', tabindex: '0',
    'aria-label': 'Filter by hotkey', title: 'Filter by hotkey' }, icon('keyboard'));
  const keyChip = h('div.setting-hotkey-filter');
  const filterSelect = h('select.dropdown', { 'aria-label': 'Show' },
    h('option', { value: 'all', text: 'All commands' }),
    h('option', { value: 'assigned', text: 'With hotkeys' }),
    h('option', { value: 'custom', text: 'Customized' }),
    h('option', { value: 'conflicts', text: 'With conflicts' }));
  filterSelect.value = state.filter;
  const countEl = h('div.setting-hotkey-count');
  const listEl = h('div.hotkey-list-container');

  const searchRow = new Setting(el).setClass('hotkey-search-container');
  searchRow.settingEl.replaceChildren(
    searchBox(searchInput, q => { state.query = q; draw(); }), keyChip, byKeyButton, filterSelect);
  el.append(h('div.setting-item-description.setting-hotkeys-note',
    'Hotkeys are saved to .obsidian/hotkeys.json, so they carry over to Obsidian. ',
    'Ctrl+N, Ctrl+T, Ctrl+W, Ctrl+Tab and Ctrl+Shift+N/T/W are kept by the browser, so they can’t be recorded here (pressing them acts on the browser’s tabs); commands bound to them in hotkeys.json also answer to the same keys with Alt added.'),
    countEl, listEl);

  filterSelect.addEventListener('change', () => { state.filter = filterSelect.value; draw(); });

  /* "Filter by hotkey": the next key pressed becomes the filter. */
  const toggleKeyFilter = () => {
    if (state.hotkey || byKeyButton.classList.contains('is-active')) { stopRecording(); state.hotkey = null; drawKeyChip(); draw(); return; }
    startRecording({ id: null, onKey: hk => { state.hotkey = hk; drawKeyChip(); draw(); }, onStop: () => byKeyButton.classList.remove('is-active') });
    byKeyButton.classList.add('is-active');
    keyChip.replaceChildren(h('span.setting-hotkey.mod-active', { text: 'Press a hotkey…' }));
  };
  byKeyButton.addEventListener('click', toggleKeyFilter);
  byKeyButton.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); toggleKeyFilter(); } });
  function drawKeyChip() {
    byKeyButton.classList.toggle('is-active', !!state.hotkey);
    keyChip.replaceChildren(state.hotkey ? h('span.setting-hotkey', { text: hotkeyLabel(state.hotkey) },
      h('span.setting-hotkey-icon.setting-delete-hotkey', { 'aria-label': 'Clear', title: 'Clear', onclick: e => { e.stopPropagation(); state.hotkey = null; drawKeyChip(); draw(); } }, icon('x'))) : '');
  }

  /* Recording listens on window before anything else, so the key isn't
     also run as a command, typed, or taken as Escape-closes-the-window. */
  function startRecording(rec) {
    stopRecording();
    const onKey = e => {
      if (e.isComposing || MODIFIER_KEYS.includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (e.key === 'Escape' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) { stopRecording(); return; }
      const hk = eventToHotkey(e);
      if (!hk || !hk.key) return;
      const done = recording;
      stopRecording();
      done.onKey(hk);
    };
    const onDown = e => { if (!e.target.closest('.setting-hotkey.mod-active, .setting-filter-by-hotkey')) stopRecording(); };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onDown, true);
    recording = Object.assign({}, rec, { stop: () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onDown, true);
    } });
  }
  function stopRecording() {
    if (!recording) return;
    const r = recording;
    recording = null;
    r.stop();
    if (r.onStop) r.onStop();
  }
  ctx.register(stopRecording);

  const same = (a, b) => a.length === b.length && a.every((x, i) => hotkeyString(x) === hotkeyString(b[i]));
  const isCustom = cmd => app.config.hotkeys(cmd.id) !== null && !same(app.config.hotkeys(cmd.id), cmd.defaultHotkeys || []);

  /* Write a command's list; the defaults again means "not in the file". */
  const save = (cmd, list) => {
    app.config.setHotkeys(cmd.id, same(list, cmd.defaultHotkeys || []) ? null : list);
    draw();
  };

  function matches(cmd) {
    const hks = app.commands.hotkeysFor(cmd.id);
    if (state.hotkey && !hks.some(k => hotkeyString(k) === hotkeyString(state.hotkey))) return false;
    if (state.filter === 'assigned' && !hks.length) return false;
    if (state.filter === 'custom' && !isCustom(cmd)) return false;
    if (state.filter === 'conflicts' && !hks.some(k => app.commands.conflicts(k, cmd.id).length)) return false;
    const words = state.query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    const text = (cmd.name + ' ' + cmd.id + ' ' + hks.map(hotkeyLabel).join(' ')).toLowerCase();
    return words.every(w => text.includes(w));
  }

  function row(cmd) {
    const hks = app.commands.hotkeysFor(cmd.id);
    const custom = isCustom(cmd);
    const s = new Setting(listEl).setName(cmd.name).setClass('setting-hotkey-row');
    s.settingEl.dataset.commandId = cmd.id;
    if (custom) s.settingEl.classList.add('has-custom-hotkeys');
    const chips = h('div.setting-command-hotkeys');
    for (const hk of hks) {
      const others = app.commands.conflicts(hk, cmd.id);
      const chip = h('span.setting-hotkey', { text: hotkeyLabel(hk) });
      if (others.length) {
        chip.classList.add('has-conflict');
        chip.title = 'Also used by: ' + others.map(c => c.name).join(', ');
      }
      if (isReserved(hk)) {
        const alt = { modifiers: (hk.modifiers || []).concat(['Alt']), key: hk.key };
        const tip = 'The browser keeps ' + hotkeyLabel(hk) + ' for itself. ' + hotkeyLabel(alt) + ' works instead.';
        chip.classList.add('is-reserved');
        chip.prepend(h('span.setting-hotkey-icon.setting-hotkey-warning', { 'aria-label': tip, title: tip }, icon('alert-triangle')));
        if (!others.length) chip.title = tip;
      }
      chip.append(h('span.setting-hotkey-icon.setting-delete-hotkey', { 'aria-label': 'Delete hotkey', title: 'Delete hotkey',
        onclick: () => save(cmd, hks.filter(x => x !== hk)) }, icon('x')));
      chips.append(chip);
    }
    if (!hks.length) chips.append(h('span.setting-hotkey.mod-empty', { text: 'Blank' }));
    s.controlEl.append(chips);
    if (custom) s.addExtraButton(b => b.setIcon('rotate-ccw').setTooltip('Restore default').onClick(() => {
      app.config.setHotkeys(cmd.id, null); draw();
    }));
    s.addExtraButton(b => {
      b.setIcon('plus-circle').setTooltip('Customize this command').onClick(() => {
        const rec = h('span.setting-hotkey.mod-active', { text: 'Press hotkey…' });
        chips.querySelectorAll('.mod-empty').forEach(x => x.remove());
        chips.append(rec);
        b.extraSettingsEl.classList.add('is-active');
        startRecording({ id: cmd.id,
          onKey: hk => {
            const cur = app.commands.hotkeysFor(cmd.id);
            if (cur.some(x => hotkeyString(x) === hotkeyString(hk))) return draw();
            save(cmd, cur.concat([hk]));
          },
          onStop: () => { if (rec.isConnected) draw(); } });
      });
    });
    return s;
  }

  let drawn = false;
  function draw() {
    stopRecording();
    /* Rows shown in the settings-wide search live outside this page's
       list, so redraw the search results instead. */
    if (drawn && !listEl.isConnected) return ctx.refresh();
    drawn = true;
    const scroll = ctx.modal.tabContentContainerEl.scrollTop;
    listEl.replaceChildren();
    const cmds = app.commands.list().filter(matches);
    cmds.forEach(row);
    const total = app.commands.list().length;
    countEl.textContent = cmds.length === total ? total + ' commands' : 'Showing ' + cmds.length + ' of ' + total + ' commands';
    if (!cmds.length) listEl.append(h('div.settings-empty', { text: 'No commands match.' }));
    ctx.modal.tabContentContainerEl.scrollTop = scroll;
  }

  drawKeyChip();
  draw();
}

