/* Graph view: the global graph of every note (view type "graph", options
   in .obsidian/graph.json) and the local graph of one note ("localgraph",
   options in its view state), as in Obsidian. The views live in
   js/graph/. */

import { Events } from '../core/events.js';
import { GraphView, LocalGraphView } from '../graph/view.js';
import { GLOBAL_DEFAULTS, withDefaults } from '../graph/settings.js';

/* The global graph's options, shared by every graph tab and saved back to
   graph.json (keys we don't know are kept). */
class GraphStore extends Events {
  constructor(plugin) {
    super();
    this.plugin = plugin;
    this.options = withDefaults({}, GLOBAL_DEFAULTS);
    this.lastLocal = null;
  }
  async load() { this.options = withDefaults(await this.plugin.loadData(), GLOBAL_DEFAULTS); }
  save(source, key) {
    this.plugin.saveData(this.options);
    this.trigger('changed', source, key);
  }
}

export default {
  id: 'graph',
  name: 'Graph view',
  description: 'Show how notes link to each other.',
  async onload(plugin) {
    const app = plugin.app, ws = app.workspace;
    const store = new GraphStore(plugin);
    await store.load();
    plugin.store = store;

    plugin.registerView('graph', leaf => new GraphView(leaf, store));
    plugin.registerView('localgraph', leaf => new LocalGraphView(leaf, store));

    /* Reuse a graph tab if there is one; else open one, in place of an
       empty tab. */
    const openGraph = async () => {
      const existing = ws.getLeavesOfType('graph').find(l => l.isMain());
      if (existing) { ws.revealLeaf(existing); return existing; }
      const cur = ws.getMostRecentLeaf();
      const leaf = cur && cur.view && cur.view.getViewType() === 'empty' && !cur.pinned ? cur : ws.getLeaf('tab');
      await leaf.setViewState({ type: 'graph', state: {}, active: true });
      return leaf;
    };

    /* In the right sidebar, following the active note. */
    const openLocalSide = async () => {
      const leaf = await ws.ensureSideLeaf('localgraph', 'right', { active: true, reveal: true });
      return leaf;
    };

    /* In a tab of its own, for one note. */
    const openLocalTab = async (file, newLeaf = 'tab') => {
      const leaf = ws.getLeaf(newLeaf);
      await leaf.setViewState({ type: 'localgraph', state: { file: file.path }, active: true });
      return leaf;
    };
    plugin.openGraph = openGraph;
    plugin.openLocalGraph = openLocalSide;

    plugin.addRibbonIcon('git-fork', 'Open graph view', () => openGraph());

    plugin.addCommand({ id: 'graph:open', name: 'Graph view: Open graph view', icon: 'git-fork', callback: () => openGraph() });
    plugin.addCommand({ id: 'graph:open-local', name: 'Graph view: Open local graph', icon: 'git-fork',
      checkCallback: checking => {
        const file = ws.getActiveFile();
        if (!file) return false;
        if (!checking) openLocalSide();
        return true;
      } });
    plugin.addCommand({ id: 'graph:animate', name: 'Graph view: Start graph timelapse animation', icon: 'play',
      checkCallback: checking => {
        const leaf = ws.activeLeaf;
        const view = leaf && leaf.view;
        if (!(view instanceof GraphView)) return false;
        if (!checking) view.animate();
        return true;
      } });

    plugin.registerEvent(ws.on('file-menu', (menu, file, source) => {
      if (file.isFolder || source === 'link-context-menu') return;
      menu.addItem(i => i.setSection('view.linked').setTitle('Open local graph').setIcon('git-fork').onClick(() => openLocalTab(file)));
    }));
  }
};
