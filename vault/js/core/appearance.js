/* Applies appearance.json: light or dark, the accent colour, fonts and
   font size, the installed community theme (.obsidian/themes/<name>/
   theme.css) and the enabled CSS snippets (.obsidian/snippets/<name>.css).
   Themes and snippets work because the app uses Obsidian's class names and
   CSS variables. */

export class Appearance {
  constructor(app) {
    this.app = app;
    this.themeEl = document.createElement('style');
    this.themeEl.id = 'vault-theme';
    this.snippetsEl = document.createElement('style');
    this.snippetsEl.id = 'vault-snippets';
    this.varsEl = document.createElement('style');
    this.varsEl.id = 'vault-appearance';
    document.head.append(this.varsEl, this.themeEl, this.snippetsEl);
    this.media = window.matchMedia('(prefers-color-scheme: dark)');
    this.media.addEventListener('change', () => this.applyMode());
    app.config.on('appearance-changed', key => this.apply(key));
  }

  get config() { return this.app.config; }

  async apply(key) {
    this.applyMode();
    this.applyVars();
    if (!key || key === 'cssTheme') await this.loadTheme();
    if (!key || key === 'enabledCssSnippets') await this.loadSnippets();
    this.app.workspace.trigger('css-change');
  }

  isDark() {
    const t = this.config.appearance('theme');
    if (t === 'system') return this.media.matches;
    return t !== 'moonstone';
  }

  applyMode() {
    const dark = this.isDark();
    document.body.classList.toggle('theme-dark', dark);
    document.body.classList.toggle('theme-light', !dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }

  applyVars() {
    const c = this.config;
    const body = document.body;
    const rules = [];
    const accent = c.appearance('accentColor');
    if (accent && /^#[0-9a-f]{6}$/i.test(accent)) {
      const [hh, s, l] = hexToHsl(accent);
      rules.push('--accent-h: ' + hh + ';', '--accent-s: ' + s + '%;', '--accent-l: ' + l + '%;');
    }
    const size = +c.appearance('baseFontSize');
    if (size) rules.push('--font-text-size: ' + size + 'px;');
    const fonts = { interfaceFontFamily: '--font-interface-override', textFontFamily: '--font-text-override', monospaceFontFamily: '--font-monospace-override' };
    for (const k in fonts) {
      const v = c.appearance(k);
      if (v) rules.push(fonts[k] + ': ' + v.split(',').map(f => /^['"]|^(serif|sans-serif|monospace|system-ui|ui-\w+)$/.test(f.trim()) ? f.trim() : "'" + f.trim() + "'").join(', ') + ';');
    }
    this.varsEl.textContent = rules.length ? 'body { ' + rules.join(' ') + ' }' : '';
    body.classList.toggle('show-ribbon', c.appearance('showRibbon') !== false);
    body.classList.toggle('show-view-header', c.get('showViewHeader') !== false && c.appearance('showViewHeader') !== false);
    body.classList.toggle('show-inline-title', c.get('showInlineTitle') !== false);
    body.classList.toggle('is-translucent', !!c.appearance('translucency'));
  }

  async readCss(path) {
    try { return await this.app.vault.adapter.read(path); } catch (e) { return null; }
  }

  /* A theme can use url()s relative to its own folder; blob URLs would be
     needed for those, so relative urls are left as they are and fonts from
     the web still load. */
  async loadTheme() {
    const name = this.config.appearance('cssTheme');
    let css = '';
    if (name) {
      const dir = this.app.vault.configDir + '/themes/';
      css = await this.readCss(dir + name + '/theme.css') ?? await this.readCss(dir + name + '.css') ?? '';
    }
    this.themeEl.textContent = css;
    document.body.classList.toggle('has-community-theme', !!css);
  }

  async loadSnippets() {
    const list = this.config.appearance('enabledCssSnippets') || [];
    const parts = [];
    for (const name of list) {
      const css = await this.readCss(this.app.vault.configDir + '/snippets/' + name + '.css');
      if (css) parts.push('/* ' + name + ' */\n' + css);
    }
    this.snippetsEl.textContent = parts.join('\n\n');
  }

  async listThemes() { return this.listDir(this.app.vault.configDir + '/themes', true); }
  async listSnippets() { return (await this.listDir(this.app.vault.configDir + '/snippets', false)).filter(n => n.endsWith('.css')).map(n => n.slice(0, -4)); }

  async listDir(path, dirs) {
    const out = [];
    try {
      const d = await this.app.vault.adapter.dir(path);
      for await (const [name, h] of d.entries()) {
        if (dirs ? h.kind === 'directory' : h.kind === 'file') out.push(name);
        else if (dirs && name.endsWith('.css')) out.push(name.slice(0, -4));
      }
    } catch (e) { /* no such folder */ }
    return out.sort((a, b) => a.localeCompare(b));
  }
}

export function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hh = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    hh = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hh *= 60;
  }
  return [Math.round(hh), Math.round(s * 100), Math.round(l * 100)];
}
