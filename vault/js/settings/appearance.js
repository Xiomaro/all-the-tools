/* Settings → Appearance: colour scheme, accent, interface toggles, themes,
   fonts and CSS snippets. Everything goes through
   app.config.setAppearance, which writes appearance.json and applies the
   change at once. Themes and snippets are files in .obsidian, which a web
   page can't show in a file manager, so they can be added and edited here. */

import { Setting, Modal, h, icon, Notice, promptText, confirmDialog } from '../core/ui.js';
import { APPEARANCE_DEFAULTS } from '../core/config.js';
import { heading, desc, browserNote, unavailable, readShared, writeShared, pickFiles } from './helpers.js';
import { sliderValue } from './editor.js';
import { isMac } from '../core/ui.js';

const DEFAULT_ACCENT = hslToHex(254, 80, 68);

export async function renderAppearance(app, el, ctx) {
  const cfg = app.config;

  new Setting(el).setName('Base color scheme').setDesc('Choose the default color scheme.')
    .addDropdown(d => d.addOptions({ system: 'Adapt to system', moonstone: 'Light', obsidian: 'Dark' })
      .setValue(['system', 'moonstone', 'obsidian'].includes(cfg.appearance('theme')) ? cfg.appearance('theme') : 'obsidian')
      .onChange(v => cfg.setAppearance('theme', v)));

  const accent = cfg.appearance('accentColor');
  new Setting(el).setName('Accent color').setDesc('Choose the accent color used throughout the app.')
    .then(s => {
      if (accent) s.addExtraButton(b => b.setIcon('rotate-ccw').setTooltip('Restore default').onClick(() => { cfg.setAppearance('accentColor', ''); ctx.refresh(); }));
    })
    .addColorPicker(c => c.setValue(/^#[0-9a-f]{6}$/i.test(accent || '') ? accent : DEFAULT_ACCENT)
      .onChange(v => {
        const first = !cfg.appearance('accentColor');
        cfg.setAppearance('accentColor', v);
        /* Show the reset button once there is something to reset. */
        if (first) c.colorPickerEl.addEventListener('change', () => ctx.refresh(), { once: true });
      }));

  const themes = await app.appearance.listThemes();
  const current = cfg.appearance('cssTheme') || '';
  new Setting(el).setName('Themes')
    .setDesc(desc('Choose one of the themes installed in .obsidian/themes.'))
    .then(s => s.descEl.append(browserNote('Browsing and installing community themes from Obsidian’s theme store isn’t available here. Install a theme with “Install from files” (its theme.css and manifest.json), or copy its folder into .obsidian/themes.')))
    .addExtraButton(b => b.setIcon('refresh-cw').setTooltip('Reload themes').onClick(async () => { await app.appearance.apply('cssTheme'); ctx.refresh(); }))
    .addButton(b => b.setButtonText('Install from files').onClick(() => installTheme(app, ctx)))
    .addDropdown(d => {
      d.addOption('', 'Default');
      themes.forEach(t => d.addOption(t, t));
      if (current && !themes.includes(current)) d.addOption(current, current + ' (not installed)');
      d.setValue(current).onChange(v => cfg.setAppearance('cssTheme', v));
    });

  heading(el, 'Interface');
  new Setting(el).setName('Show inline title').setClass('mod-toggle')
    .setDesc('Display the filename as an editable title inline with the file contents.')
    .addToggle(t => t.setValue(cfg.get('showInlineTitle') !== false).onChange(v => writeShared(app, 'showInlineTitle', v)));
  new Setting(el).setName('Show tab title bar').setClass('mod-toggle')
    .setDesc('Display the header at the top of every tab.')
    .addToggle(t => t.setValue(readShared(app, 'showViewHeader')).onChange(v => writeShared(app, 'showViewHeader', v)));
  new Setting(el).setName('Show ribbon').setClass('mod-toggle')
    .setDesc('Display vertical toolbar on the side of the window.')
    .addToggle(t => t.setValue(cfg.appearance('showRibbon') !== false).onChange(v => cfg.setAppearance('showRibbon', v)));

  heading(el, 'Font');
  fontRow(app, el, ctx, 'interfaceFontFamily', 'Interface font', 'Set base font for all of the app.');
  fontRow(app, el, ctx, 'textFontFamily', 'Text font', 'Set font for editing and reading views.');
  fontRow(app, el, ctx, 'monospaceFontFamily', 'Monospace font', 'Set font for places like code blocks and frontmatter.');
  const size = +cfg.appearance('baseFontSize') || APPEARANCE_DEFAULTS.baseFontSize;
  new Setting(el).setName('Font size').setDesc('Font size in pixels that affects editing and reading views.')
    .then(s => {
      if (size !== APPEARANCE_DEFAULTS.baseFontSize) s.addExtraButton(b => b.setIcon('rotate-ccw').setTooltip('Restore default')
        .onClick(() => { cfg.setAppearance('baseFontSize', APPEARANCE_DEFAULTS.baseFontSize); ctx.refresh(); }));
    })
    .addSlider(sl => sl.setLimits(10, 30, 1).setValue(size).setDynamicTooltip().onChange(v => cfg.setAppearance('baseFontSize', v)))
    .then(s => s.controlEl.prepend(sliderValue(s, v => v + 'px')));
  new Setting(el).setName('Quick font size adjustment').setClass('mod-toggle')
    .setDesc('Adjust the font size using ' + (isMac ? 'Cmd' : 'Ctrl') + ' + Scroll over a note, or using the trackpad pinch-zoom gesture.')
    .addToggle(t => t.setValue(cfg.appearance('baseFontSizeAction') !== false).onChange(v => cfg.setAppearance('baseFontSizeAction', v)));

  heading(el, 'Advanced');
  unavailable(el, 'Zoom level', 'Controls the overall zoom level of the app.',
    'Use the browser’s zoom instead: ' + (isMac ? 'Cmd' : 'Ctrl') + ' + = and ' + (isMac ? 'Cmd' : 'Ctrl') + ' + − (or ' + (isMac ? 'Cmd' : 'Ctrl') + ' + 0 to reset).');
  unavailable(el, 'Native menus', 'Menus throughout the app will match the operating system. They will not be affected by your theme.',
    'Desktop app only: a web page can’t use the operating system’s menus.');
  unavailable(el, 'Window frame style', 'Determines the styling of the title bar of Obsidian windows.',
    'Desktop app only: the browser draws its own window frame.');
  unavailable(el, 'Translucent window', 'Make the window translucent. Only available on macOS and Windows 11.',
    'Desktop app only: a web page can’t make the browser window translucent.');
  unavailable(el, 'Hardware acceleration', 'Turns on hardware acceleration, which uses your GPU to make the app smoother.',
    'Set by the browser (in its own settings), not by the page.');

  await renderSnippets(app, el, ctx);
}

/* --- fonts ----------------------------------------------------------------- */

export function parseFonts(value) {
  return String(value || '').split(',').map(f => f.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}

function fontRow(app, el, ctx, key, name, description) {
  const fonts = parseFonts(app.config.appearance(key));
  new Setting(el).setName(name)
    .setDesc(desc(description, fonts.length ? h('div.settings-font-current', { text: fonts.join(', '), style: { fontFamily: app.config.appearance(key) } }) : ''))
    .addButton(b => b.setButtonText('Manage').onClick(() => new FontModal(app, key, name, () => ctx.refresh()).open()));
}

const COMMON_FONTS = ['Arial', 'Avenir', 'Calibri', 'Cambria', 'Cascadia Code', 'Cascadia Mono', 'Consolas', 'Courier New', 'Fira Code',
  'Georgia', 'Helvetica', 'Helvetica Neue', 'IBM Plex Mono', 'IBM Plex Sans', 'Inter', 'JetBrains Mono', 'Lato', 'Literata', 'Menlo',
  'Merriweather', 'Monaco', 'Noto Sans', 'Noto Serif', 'Open Sans', 'Palatino', 'Roboto', 'Roboto Mono', 'SF Mono', 'SF Pro Text',
  'Segoe UI', 'Source Code Pro', 'Source Sans Pro', 'Source Serif Pro', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Ubuntu',
  'Ubuntu Mono', 'Verdana', 'iA Writer Quattro S', 'serif', 'sans-serif', 'monospace', 'system-ui'];

/* Obsidian's font list: the first font that's installed is used, the rest
   are fallbacks. Kept in appearance.json as one comma-separated string. */
class FontModal extends Modal {
  constructor(app, key, name, done) {
    super(app);
    this.key = key;
    this.done = done;
    this.setTitle(name);
    this.modalEl.classList.add('mod-settings-list-editor', 'mod-font-picker');
    this.localFonts = null;
  }
  onOpen() { this.draw(); }
  onClose() { this.done(); }

  draw() {
    const cfg = this.app.config;
    const list = parseFonts(cfg.appearance(this.key));
    const save = next => { cfg.setAppearance(this.key, next.join(', ')); this.draw(); };
    const id = 'vault-fonts-' + this.key;
    const names = Array.from(new Set((this.localFonts || []).concat(COMMON_FONTS))).sort((a, b) => a.localeCompare(b));
    const input = h('input', { type: 'text', placeholder: 'Font name', spellcheck: false, list: id });
    const add = () => {
      const v = input.value.trim().replace(/^['"]|['"]$/g, '');
      if (!v) return;
      if (list.some(f => f.toLowerCase() === v.toLowerCase())) return new Notice('That font is already in the list.');
      save(list.concat([v]));
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); add(); } });
    const move = (i, d) => { const next = list.slice(); const [x] = next.splice(i, 1); next.splice(i + d, 0, x); save(next); };
    this.contentEl.replaceChildren(
      h('p.setting-item-description', { text: 'The first font in the list that is installed on this device is used; the others are fallbacks. Leave the list empty to use the default font.' }),
      h('div.settings-list-editor',
        list.length ? list.map((f, i) => h('div.settings-list-editor-item',
          h('span.settings-list-editor-text', { text: f, style: { fontFamily: '"' + f + '", var(--font-interface)' } }),
          i > 0 ? h('div.clickable-icon', { 'aria-label': 'Move up', title: 'Move up', role: 'button', onclick: () => move(i, -1) }, icon('arrow-up')) : '',
          i < list.length - 1 ? h('div.clickable-icon', { 'aria-label': 'Move down', title: 'Move down', role: 'button', onclick: () => move(i, 1) }, icon('arrow-down')) : '',
          h('div.clickable-icon', { 'aria-label': 'Remove', title: 'Remove', role: 'button', onclick: () => save(list.filter((_, j) => j !== i)) }, icon('x'))))
          : h('div.settings-list-editor-empty', { text: 'Using the default font.' })),
      h('div.settings-list-editor-add', input, h('datalist', { id }, names.map(n => h('option', { value: n }))), h('button.mod-cta', { text: 'Add', onclick: add })),
      typeof window.queryLocalFonts === 'function' && !this.localFonts
        ? h('div.settings-list-editor-foot', h('button', { text: 'Suggest installed fonts', onclick: () => this.loadLocalFonts() }))
        : typeof window.queryLocalFonts !== 'function'
          ? browserNote('This browser can’t list the fonts installed on this device; type a font’s name as the system knows it.')
          : '');
    /* Focus now, so Escape pressed straight after a redraw reaches this window. */
    input.focus();
  }

  async loadLocalFonts() {
    try {
      const fonts = await window.queryLocalFonts();
      this.localFonts = Array.from(new Set(fonts.map(f => f.family)));
      new Notice(this.localFonts.length + ' installed fonts found.');
    } catch (e) {
      this.localFonts = [];
      new Notice('The browser didn’t allow listing installed fonts.');
    }
    this.draw();
  }
}

/* --- themes ------------------------------------------------------------------ */

async function installTheme(app, ctx) {
  const files = await pickFiles({ accept: '.css,.json', multiple: true });
  if (!files.length) return;
  const css = files.find(f => /^theme\.css$/i.test(f.name)) || files.find(f => /\.css$/i.test(f.name));
  if (!css) return new Notice('Pick the theme’s theme.css (and its manifest.json if it has one).');
  const manifestFile = files.find(f => /manifest\.json$/i.test(f.name));
  let manifest = null;
  if (manifestFile) { try { manifest = JSON.parse(await manifestFile.text()); } catch (e) { manifest = null; } }
  let name = manifest && manifest.name || (/^theme\.css$/i.test(css.name) ? '' : css.name.replace(/\.css$/i, ''));
  if (!name) name = await promptText(app, 'Name of the theme', '', { cta: 'Install', description: 'The theme is saved in .obsidian/themes under this name.' });
  name = String(name || '').replace(/[\\/:*?"<>|]/g, '').trim();
  if (!name) return;
  const dir = app.vault.configDir + '/themes/' + name;
  await app.vault.adapter.write(dir + '/theme.css', await css.text());
  if (manifestFile) await app.vault.adapter.write(dir + '/manifest.json', await manifestFile.text());
  else await app.vault.adapter.write(dir + '/manifest.json', JSON.stringify({ name, version: '0.0.0', minAppVersion: '1.0.0', author: '' }, null, 2));
  new Notice('Installed the theme “' + name + '”.');
  if (await confirmDialog(app, 'Use “' + name + '” now?', 'The theme is installed in .obsidian/themes/' + name + '.', 'Use theme')) {
    app.config.setAppearance('cssTheme', name);
  }
  ctx.refresh();
}

/* --- CSS snippets --------------------------------------------------------------- */

async function renderSnippets(app, el, ctx) {
  const cfg = app.config;
  const snippets = await app.appearance.listSnippets();
  const enabled = () => cfg.appearance('enabledCssSnippets') || [];
  const dir = app.vault.configDir + '/snippets';
  new Setting(el).setName('CSS snippets').setHeading()
    .setDesc(desc('Apply CSS snippets from your vault configuration folder (' + dir + ').'))
    .addExtraButton(b => b.setIcon('refresh-cw').setTooltip('Reload snippets').onClick(async () => {
      await app.appearance.apply('enabledCssSnippets'); ctx.refresh(); new Notice('Snippets reloaded.');
    }))
    .addExtraButton(b => b.setIcon('folder-open').setTooltip('Open snippets folder').onClick(() => new Notice(
      'A web page can’t open folders in your file manager. Snippets live in ' + dir + ' inside the vault; add or edit them here with “New snippet” and the pencil icons.', 8000)))
    .addExtraButton(b => b.setIcon('plus').setTooltip('New snippet').onClick(() => newSnippet(app, ctx)));
  if (!snippets.length) {
    el.append(h('div.setting-item.settings-empty', h('div.setting-item-info', h('div.setting-item-description', { text: 'No CSS snippets yet. Use the + button to write one.' }))));
    return;
  }
  for (const name of snippets) {
    new Setting(el).setName(name).setClass('mod-toggle').setDesc(dir + '/' + name + '.css')
      .addExtraButton(b => b.setIcon('pencil').setTooltip('Edit snippet').onClick(() => new SnippetModal(app, name, ctx).open()))
      .addToggle(t => t.setValue(enabled().includes(name)).onChange(on => {
        const list = enabled().filter(n => n !== name);
        if (on) list.push(name);
        cfg.setAppearance('enabledCssSnippets', list);
      }));
  }
}

async function newSnippet(app, ctx) {
  let name = await promptText(app, 'New CSS snippet', '', { cta: 'Create', placeholder: 'my-snippet', description: 'The snippet is saved as a .css file in ' + app.vault.configDir + '/snippets.' });
  name = String(name || '').replace(/\.css$/i, '').replace(/[\\/:*?"<>|]/g, '').trim();
  if (!name) return;
  const path = app.vault.configDir + '/snippets/' + name + '.css';
  if (await app.vault.adapter.exists(path)) return new Notice('There is already a snippet called “' + name + '”.');
  await app.vault.adapter.write(path, '/* ' + name + ' */\n\n');
  await ctx.refresh();
  new SnippetModal(app, name, ctx).open();
}

/* A plain editor for one snippet file. */
class SnippetModal extends Modal {
  constructor(app, name, ctx) {
    super(app);
    this.name = name;
    this.ctx = ctx;
    this.path = app.vault.configDir + '/snippets/' + name + '.css';
    this.setTitle(name + '.css');
    this.modalEl.classList.add('mod-snippet-editor');
  }
  async onOpen() {
    const text = await this.app.vault.adapter.read(this.path).catch(() => '');
    this.textarea = h('textarea.settings-snippet-textarea', { spellcheck: false, value: text, 'aria-label': 'CSS' });
    this.textarea.addEventListener('keydown', e => {
      if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); document.execCommand('insertText', false, '  '); }
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.save(false); }
    });
    const enabled = (this.app.config.appearance('enabledCssSnippets') || []).includes(this.name);
    this.contentEl.replaceChildren(
      h('p.setting-item-description', { text: enabled ? 'This snippet is on; saving applies it at once.' : 'This snippet is off; turn it on in Appearance → CSS snippets to apply it.' }),
      this.textarea,
      h('div.modal-button-container',
        h('button.mod-warning', { text: 'Delete', onclick: () => this.remove() }),
        h('span.settings-spacer'),
        h('button', { text: 'Cancel', onclick: () => this.close() }),
        h('button.mod-cta', { text: 'Save', onclick: () => this.save(true) })));
    setTimeout(() => this.textarea.focus());
  }
  async save(close) {
    await this.app.vault.adapter.write(this.path, this.textarea.value);
    await this.app.appearance.apply('enabledCssSnippets');
    new Notice('Saved ' + this.name + '.css');
    if (close) this.close();
  }
  async remove() {
    if (!await confirmDialog(this.app, 'Delete “' + this.name + '”?', 'This deletes ' + this.path + '.', 'Delete', true)) return;
    await this.app.vault.adapter.remove(this.path);
    const list = (this.app.config.appearance('enabledCssSnippets') || []).filter(n => n !== this.name);
    this.app.config.setAppearance('enabledCssSnippets', list);
    this.close();
    this.ctx.refresh();
  }
}

export function hslToHex(hh, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + hh / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}
