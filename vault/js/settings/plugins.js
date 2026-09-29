/* Settings → Core plugins (turn each on or off; the cog opens its options
   page) and Settings → Community plugins (not supported: explained, and
   any installed in the vault are listed so it's clear why they don't run). */

import { Setting, h, Notice } from '../core/ui.js';
import { heading, desc, browserNote } from './helpers.js';

/* Core plugins that need Obsidian's servers and an Obsidian account. */
const UNAVAILABLE = {
  publish: 'Needs Obsidian’s Publish service and account, which a web page can’t reach. Export a zip and publish it with Obsidian instead.',
  sync: 'Needs Obsidian’s Sync service and account, which a web page can’t reach. A folder vault synced by another tool (a cloud drive, Git) works, since changes on disk are picked up.'
};

export function renderCorePlugins(app, el, ctx) {
  const defs = app.plugins.list().slice().sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
  const on = defs.filter(d => app.plugins.isEnabled(d.id)).length;
  el.append(h('div.setting-item-description.settings-page-intro', { text: on + ' of ' + defs.length + ' core plugins are on. Which ones are on is saved in .obsidian/core-plugins.json.' }));
  for (const def of defs) {
    const s = new Setting(el).setName(def.name || def.id).setClass('mod-toggle');
    s.settingEl.dataset.pluginId = def.id;
    s.descEl.append(desc(def.description || ''));
    const enabled = app.plugins.isEnabled(def.id);
    const reason = UNAVAILABLE[def.id];
    if (reason) s.descEl.append(browserNote(reason));
    const plugin = app.plugins.get(def.id);
    if (enabled && plugin && plugin.settingTab) {
      s.addExtraButton(b => b.setIcon('settings').setTooltip('Options').onClick(() => ctx.openTab(plugin.settingTab.id || def.id)));
    }
    s.addToggle(t => {
      t.setValue(enabled);
      /* Publish and Sync can be turned off but not on. */
      if (reason && !enabled) t.setDisabled(true).setTooltip('Not available in the browser');
      t.onChange(async v => {
        t.setDisabled(true);
        try {
          if (v) await app.plugins.enable(def.id);
          else await app.plugins.disable(def.id);
        } catch (err) {
          console.error(err);
          new Notice('Couldn’t turn ' + (def.name || def.id) + (v ? ' on.' : ' off.'));
        }
        ctx.refresh();
      });
    });
  }
}

export async function renderCommunityPlugins(app, el) {
  heading(el, 'Community plugins');
  new Setting(el).setName('Not available in the browser').setClass('mod-unavailable')
    .setDesc(desc('Community plugins are programs written for Obsidian’s desktop and mobile apps. They rely on Obsidian’s own internals, Node.js and Electron, which a web page doesn’t have, so they can’t run here.\n',
      'Many of their jobs are covered by the core plugins. Plugins installed in this vault are kept as they are, so they still work when the vault is opened in Obsidian.'));
  unavailableRow(el, 'Restricted mode', 'Turn on to prevent community plugins from running.', 'Always on here.');
  unavailableRow(el, 'Browse community plugins', 'Find and install plugins made by the community.', 'Obsidian’s plugin directory can’t be installed from here.');

  const dir = app.vault.configDir;
  const list = await app.config.readJson('community-plugins', []);
  const installed = await listInstalled(app, dir + '/plugins');
  if (!installed.length) return;
  heading(el, 'Installed in this vault');
  for (const p of installed) {
    const on = Array.isArray(list) && list.includes(p.id);
    new Setting(el).setName(p.name + (p.version ? ' ' + p.version : '')).setClass('mod-unavailable')
      .setDesc(desc(p.description || '', p.author ? '\nBy ' + p.author : '', '\n' + (on ? 'On in Obsidian' : 'Off in Obsidian') + ' · ' + dir + '/plugins/' + p.dir));
  }
}

function unavailableRow(el, name, description, reason) {
  const s = new Setting(el).setName(name).setClass('mod-unavailable');
  s.descEl.append(desc(description), browserNote(reason));
  return s;
}

async function listInstalled(app, path) {
  const out = [];
  let dir;
  try { dir = await app.vault.adapter.dir(path); } catch (e) { return out; }
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind !== 'directory') continue;
    let manifest = {};
    try { manifest = JSON.parse(await app.vault.adapter.read(path + '/' + name + '/manifest.json')); } catch (e) { /* no manifest */ }
    out.push({ dir: name, id: manifest.id || name, name: manifest.name || name, version: manifest.version, author: manifest.author, description: manifest.description });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
