/* The local graph: opens in the right sidebar for the active note,
   follows the active file, walks links to the chosen depth and direction,
   and keeps its options in the view state as Obsidian does. */
module.exports = async ({ page, assert }) => {
  const until = (fn, arg, what) => page.waitForFunction(fn, arg, { timeout: 5000 }).catch(() => { throw new Error('timed out waiting for ' + what); });
  const local = () => page.evaluate(() => {
    const leaf = app.workspace.getLeavesOfType('localgraph')[0];
    const r = leaf.view.renderer;
    const ids = r.nodes.map(n => n.id);
    const edges = [];
    for (let k = 0; k < r.edges.length; k += 2) edges.push([ids[r.edges[k]], ids[r.edges[k + 1]]].sort().join(' — '));
    return { ids: ids.slice().sort(), edges: edges.sort(), center: r.nodes.filter(n => n.center).map(n => n.id), file: leaf.view.file && leaf.view.file.path,
      centerColor: r.colorOf[r.nodes.findIndex(n => n.center)], side: !leaf.isMain() };
  });
  const setOption = (key, value) => page.evaluate(({ key, value }) => {
    const v = app.workspace.getLeavesOfType('localgraph')[0].view;
    v.changeOption(key, value);
  }, { key, value });
  const settle = () => page.waitForTimeout(150);

  /* No active note: the command isn't available. */
  assert.strictEqual(await page.evaluate(() => app.commands.isAvailable(app.commands.find('graph:open-local'))), false);
  await page.evaluate(() => app.workspace.openFile(app.vault.getFileByPath('Welcome.md')));
  await page.evaluate(() => app.commands.execute('graph:open-local'));
  await until(() => { const l = app.workspace.getLeavesOfType('localgraph')[0]; return l && l.view.renderer && l.view.renderer.nodes.length > 1; }, null, 'the local graph');
  let g = await local();
  assert.ok(g.side, 'opens in a sidebar');
  assert.strictEqual(g.file, 'Welcome.md');
  assert.deepStrictEqual(g.center, ['Welcome.md']);
  assert.strictEqual(g.centerColor, 1, 'the centre node uses --graph-node-focused');
  assert.deepStrictEqual(g.ids, ['Archive/Old/Deep note.md', 'Ideas.md', 'Projects/Project Alpha.md', 'Unicode é note.md', 'Welcome.md', 'unresolved:Unwritten note'], 'depth 1: ' + g.ids);
  assert.ok(!g.edges.includes('Archive/Old/Deep note.md — Ideas.md'), 'no neighbour links by default');
  const controls = await page.evaluate(() => {
    const c = document.querySelector('.workspace-leaf-content[data-type="localgraph"] .graph-controls');
    return { close: c.classList.contains('is-close'), title: document.querySelector('.workspace-tab-header[data-type="localgraph"]').getAttribute('aria-label') };
  });
  assert.ok(controls.close, 'settings start closed');
  assert.strictEqual(controls.title, 'Graph of Welcome');
  await page.click('.workspace-leaf-content[data-type="localgraph"] .graph-controls .mod-open');
  await page.click('.workspace-leaf-content[data-type="localgraph"] .graph-control-section.mod-filter .tree-item-self');
  const rows = await page.evaluate(() => Array.from(document.querySelectorAll('.workspace-leaf-content[data-type="localgraph"] .mod-filter .setting-item .setting-item-name')).map(x => x.textContent));
  assert.deepStrictEqual(rows, ['Depth', 'Incoming links', 'Outgoing links', 'Neighbor links', 'Tags', 'Attachments', 'Existing files only']);

  /* Neighbour links, depth, direction. */
  await setOption('localInterlinks', true); await settle();
  g = await local();
  assert.ok(g.edges.includes('Archive/Old/Deep note.md — Ideas.md'), 'neighbour links on: ' + g.edges);
  await setOption('localInterlinks', false);
  await page.evaluate(() => {
    const s = document.querySelector('.workspace-leaf-content[data-type="localgraph"] .mod-filter .mod-slider input');
    s.value = '2'; s.dispatchEvent(new Event('input'));
  });
  await settle();
  g = await local();
  assert.ok(g.ids.includes('Projects/Project Beta.md'), 'depth 2 reaches Project Beta');
  await setOption('localJumps', 1);
  await setOption('localBacklinks', false); await settle();
  g = await local();
  assert.ok(!g.ids.includes('Archive/Old/Deep note.md') && !g.ids.includes('Unicode é note.md'), 'incoming off hides notes that only link in: ' + g.ids);
  assert.ok(g.ids.includes('Ideas.md') && g.ids.includes('Projects/Project Alpha.md'));
  await setOption('localBacklinks', true);
  await setOption('localForelinks', false); await settle();
  g = await local();
  assert.ok(!g.ids.includes('unresolved:Unwritten note') && g.ids.includes('Unicode é note.md'), 'outgoing off: ' + g.ids);
  await setOption('localForelinks', true);
  await setOption('showAttachments', true); await settle();
  assert.ok((await local()).ids.includes('pixel.png'), 'attachments');

  /* Options live in the view state (and so in workspace.json). */
  const state = await page.evaluate(() => app.workspace.getLeavesOfType('localgraph')[0].getViewState());
  assert.strictEqual(state.type, 'localgraph');
  assert.strictEqual(state.state.file, 'Welcome.md');
  assert.strictEqual(state.state.options.showAttachments, true);
  assert.strictEqual(state.state.options.localJumps, 1);
  assert.strictEqual(state.state.options.close, false);
  const layout = await page.evaluate(() => JSON.stringify(app.workspace.getLayout().right));
  assert.ok(layout.includes('"localgraph"') && layout.includes('"localForelinks":true'), 'saved with the layout');
  const globalJson = await page.evaluate(() => app.vault.adapter.read('.obsidian/graph.json'));
  assert.ok(!JSON.parse(globalJson).localJumps, 'graph.json untouched');

  /* Follows the active note. */
  await page.evaluate(() => app.workspace.openFile(app.vault.getFileByPath('Ideas.md')));
  await until(() => app.workspace.getLeavesOfType('localgraph')[0].view.file.path === 'Ideas.md', null, 'the local graph to follow');
  await settle();
  g = await local();
  assert.deepStrictEqual(g.center, ['Ideas.md']);
  assert.ok(g.ids.includes('Projects/Project Beta.md'));

  /* "Open local graph" from a file menu: a tab of its own that stays on
     its note, and starts from the options last used. */
  await page.evaluate(() => {
    const file = app.vault.getFileByPath('Projects/Project Beta.md');
    const items = [];
    const menu = { addItem(fn) { const it = { setSection() { return it; }, setTitle(t) { it.title = t; return it; }, setIcon() { return it; }, onClick(cb) { it.cb = cb; return it; } }; fn(it); items.push(it); return menu; } };
    app.workspace.trigger('file-menu', menu, file, 'file-explorer-context-menu');
    items.find(i => i.title === 'Open local graph').cb();
  });
  await until(() => app.workspace.getLeavesOfType('localgraph').some(l => l.isMain() && l.view.renderer && l.view.renderer.nodes.length > 1), null, 'a local graph tab');
  const tab = await page.evaluate(() => { const l = app.workspace.getLeavesOfType('localgraph').find(x => x.isMain()); return { file: l.view.file.path, attachments: l.view.options.showAttachments }; });
  assert.strictEqual(tab.file, 'Projects/Project Beta.md');
  assert.strictEqual(tab.attachments, true, 'new local graphs start from the last options');
  await page.evaluate(() => app.workspace.openFile(app.vault.getFileByPath('Welcome.md'), 'tab'));
  await page.waitForTimeout(200);
  const kept = await page.evaluate(() => app.workspace.getLeavesOfType('localgraph').find(x => x.isMain()).view.file.path);
  assert.strictEqual(kept, 'Projects/Project Beta.md', 'a local graph tab keeps its note');
  const sideFollowed = await page.evaluate(() => app.workspace.getLeavesOfType('localgraph').find(x => !x.isMain()).view.file.path);
  assert.strictEqual(sideFollowed, 'Welcome.md');

  /* Restored from its view state. */
  const restored = await page.evaluate(async () => {
    const leaf = app.workspace.getLeavesOfType('localgraph').find(x => x.isMain());
    await leaf.setViewState({ type: 'empty' });
    await leaf.setViewState({ type: 'localgraph', state: { file: 'Ideas.md', options: { localJumps: 3, showTags: true } } });
    await new Promise(r => setTimeout(r, 300));
    return { file: leaf.view.file.path, jumps: leaf.view.options.localJumps, tags: leaf.view.renderer.nodes.some(n => n.type === 'tag'), defaults: leaf.view.options.repelStrength };
  });
  assert.deepStrictEqual(restored, { file: 'Ideas.md', jumps: 3, tags: true, defaults: 10 });

  /* Renaming the note retitles its local graph. */
  await page.evaluate(() => app.fileManager.renameFile(app.vault.getFileByPath('Ideas.md'), 'Ideas moved.md'));
  await until(() => { const l = app.workspace.getLeavesOfType('localgraph').find(x => x.isMain()); return l.getDisplayText() === 'Graph of Ideas moved'; }, null, 'the new title');

  /* Turning the core plugin off closes the graphs and removes the ribbon
     icon and commands; turning it on brings them back. */
  const off = await page.evaluate(async () => {
    const renderers = app.workspace.getLeavesOfType('localgraph').map(l => l.view.renderer);
    await app.plugins.disable('graph');
    await new Promise(r => setTimeout(r, 200));
    return { leaves: app.workspace.getLeavesOfType('localgraph').length, stopped: renderers.every(r => r.destroyed && !r.raf),
      ribbon: !!document.querySelector('.side-dock-ribbon-action[aria-label="Open graph view"]'), cmd: !!app.commands.find('graph:open') };
  });
  assert.deepStrictEqual(off, { leaves: 0, stopped: true, ribbon: false, cmd: false });
  const on = await page.evaluate(async () => {
    await app.plugins.enable('graph');
    await app.commands.execute('graph:open');
    await new Promise(r => setTimeout(r, 300));
    return { ribbon: !!document.querySelector('.side-dock-ribbon-action[aria-label="Open graph view"]'), graph: app.workspace.getLeavesOfType('graph').length };
  });
  assert.deepStrictEqual(on, { ribbon: true, graph: 1 });
};
