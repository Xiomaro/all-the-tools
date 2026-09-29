/* Obsidian Sync is a paid service run by Obsidian with its own encrypted
   protocol and account; this app can't use it. When the plugin is turned
   on it explains that and how to keep devices in step another way. */

import { h, Setting } from '../core/ui.js';
import { unavailableModal } from './publish.js';

const TEXT = [
  'Obsidian Sync isn’t available in this app. It is a paid service that works through Obsidian’s own apps and account.',
  'This app edits the vault folder directly, so any service that syncs a folder works: keep the vault in Dropbox, OneDrive, Google Drive, iCloud Drive or Syncthing, open that folder here, and changes made elsewhere are picked up automatically.',
  'If you already use Obsidian Sync, keep it running in Obsidian on this computer: it updates the same folder this app edits.'
];

export default {
  id: 'sync',
  name: 'Sync',
  description: 'Obsidian Sync (not available in the browser).',
  async onload(plugin) {
    const show = () => unavailableModal(plugin.app, 'Sync', TEXT);
    plugin.addCommand({ id: 'sync:setup', name: 'Sync: Set up sync', icon: 'refresh-cw', callback: show });
    plugin.addRibbonIcon('refresh-cw', 'Sync', show);
    plugin.addSettingTab(containerEl => {
      TEXT.forEach(t => containerEl.appendChild(h('p.setting-item-description', { text: t })));
      new Setting(containerEl).setName('Not available').setDesc('Sync needs Obsidian’s desktop or mobile app.');
    });
  }
};
