/* Obsidian Publish is a paid service run by Obsidian, reached through the
   desktop app's account sign-in; this app can't use it. When the plugin is
   turned on it explains that and points to alternatives. */

import { Modal, h, Setting } from '../core/ui.js';

export function unavailableModal(app, title, paragraphs) {
  const m = new Modal(app);
  m.setTitle(title);
  m.modalEl.classList.add('mod-service-unavailable');
  m.contentEl.append(...paragraphs.map(p => h('p', { text: p })),
    h('div.modal-button-container', h('button.mod-cta', { text: 'OK', onclick: () => m.close() })));
  m.open();
  return m;
}

const TEXT = [
  'Obsidian Publish isn’t available in this app. It is a paid service that works through Obsidian’s own apps and account.',
  'Your notes are plain Markdown files, so you can still publish them: open this vault in Obsidian to use Publish, or use a static site tool such as Quartz, MkDocs or Jekyll on the same folder.'
];

export default {
  id: 'publish',
  name: 'Publish',
  description: 'Obsidian Publish (not available in the browser).',
  async onload(plugin) {
    const show = () => unavailableModal(plugin.app, 'Publish', TEXT);
    plugin.addCommand({ id: 'publish:view-changes', name: 'Publish: Publish changes...', icon: 'send', callback: show });
    plugin.addRibbonIcon('send', 'Publish changes...', show);
    plugin.addSettingTab(containerEl => {
      TEXT.forEach(t => containerEl.appendChild(h('p.setting-item-description', { text: t })));
      new Setting(containerEl).setName('Not available').setDesc('Publish needs Obsidian’s desktop or mobile app.');
    });
  }
};
