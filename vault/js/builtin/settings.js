/* Settings: the settings window (vault/js/settings/), opened with
   "Open settings" (Ctrl/Cmd+,) or the cog at the foot of the ribbon, and
   app.setting = { open(tabId?), close(), openTabById(id) } as in Obsidian.

   Also here because they belong to the appearance settings: the theme
   commands, Ctrl/Cmd+scroll to change the font size ("Quick font size
   adjustment"), and applying Show inline title / Show tab title bar at once
   when app.json changes. */

import { SettingsModal } from '../settings/modal.js';

export default {
  id: 'settings',
  name: 'Settings',
  description: 'The settings window.',
  builtin: true,
  async onload(plugin) {
    const app = plugin.app;
    let modal = null;
    let lastTab = 'about';

    const setting = {
      get isOpen() { return !!modal; },
      get activeTab() { return modal && modal.activeTab; },
      open(tabId) {
        if (!modal) {
          modal = new SettingsModal(app);
          modal.onClosed = () => { if (modal && modal.lastTabId) lastTab = modal.lastTabId; modal = null; };
          modal.open();
        }
        modal.openTab(tabId || (modal.activeTab ? modal.activeTab.id : lastTab));
        return modal;
      },
      openTabById(id) { return setting.open(id); },
      close() { if (modal) modal.close(); }
    };
    app.setting = setting;
    plugin.register(() => { setting.close(); if (app.setting === setting) delete app.setting; });

    plugin.addCommand({ id: 'app:open-settings', name: 'Open settings', icon: 'settings', callback: () => setting.open() });
    const cog = app.workspace.addRibbonSetting('settings', 'Open settings', () => setting.open());
    if (cog) plugin.register(() => cog.remove());

    const scheme = v => app.config.setAppearance('theme', v);
    plugin.addCommand({ id: 'theme:use-dark', name: 'Use dark mode', icon: 'moon', callback: () => scheme('obsidian') });
    plugin.addCommand({ id: 'theme:use-light', name: 'Use light mode', icon: 'sun', callback: () => scheme('moonstone') });
    plugin.addCommand({ id: 'theme:switch', name: 'Change theme', icon: 'palette', callback: () => setting.open('appearance') });

    plugin.registerEvent(app.config.on('changed', key => {
      if (key === 'showInlineTitle' || key === 'showViewHeader') app.appearance.apply(key);
    }));

    /* Quick font size adjustment: Ctrl/Cmd+scroll (and a trackpad pinch,
       which browsers report as a wheel event with ctrlKey) over the notes
       changes the font size, as in Obsidian, instead of zooming the page. */
    let wheelAcc = 0;
    plugin.registerDomEvent(window, 'wheel', e => {
      if (!(e.ctrlKey || e.metaKey) || app.config.appearance('baseFontSizeAction') === false) return;
      const t = e.target;
      if (!t || !t.closest || !t.closest('.workspace-split.mod-root, .workspace-leaf-content') || t.closest('.modal-container')) return;
      e.preventDefault();
      wheelAcc += e.deltaY;
      if (Math.abs(wheelAcc) < 40) return;
      const step = wheelAcc < 0 ? 1 : -1;
      wheelAcc = 0;
      const size = +app.config.appearance('baseFontSize') || 16;
      const next = Math.max(10, Math.min(30, size + step));
      if (next !== size) app.config.setAppearance('baseFontSize', next);
    }, { passive: false });
  }
};
