/* The global graph: opens from the command, shows the fixture's notes and
   links with Obsidian's options from graph.json, filters, colour groups,
   hover, click, context menu, zoom, drag, live updates, themes and
   cleanup. */
module.exports = async ({ h, page, assert }) => {
  const graph = () => page.evaluate(() => {
    const leaf = app.workspace.getLeavesOfType('graph')[0];
    const r = leaf && leaf.view.renderer;
    if (!r) return null;
    const colorClass = i => i < 11 ? ['fill', 'fill-focused', 'fill-tag', 'fill-attachment', 'fill-unresolved', 'fill-highlight', 'line', 'line-highlight', 'arrow', 'text', 'circle'][i] : 'group-' + (i - 11);
    return {
      ids: r.nodes.map(n => n.id).sort(),
      types: Object.fromEntries(r.nodes.map(n => [n.id, n.type])),
      colors: Object.fromEntries(r.nodes.map((n, i) => [n.id, colorClass(r.colorOf[i])])),
      weights: Object.fromEntries(r.nodes.map(n => [n.id, n.weight])),
      edges: r.edges.length / 2,
      scale: r.scale,
      running: !!r.raf
    };
  });
  /* Stop the layout so nodes hold still, bring a node into view and give
     its position on the page. */
  const nodeAt = id => page.evaluate(id => {
    const r = app.workspace.getLeavesOfType('graph')[0].view.renderer;
    r.sim.alpha = 0; r.sim.alphaTarget = 0;
    /* Centre on it, clear of the settings panel. */
    const i = r.index.get(id);
    if (i === undefined) return null;
    r.cx = r.sim.x[i] + 150 / r.scale; r.cy = r.sim.y[i]; r.draw();
    const p = r.nodeScreenPosition(id);
    const rect = r.canvas.getBoundingClientRect();
    return p && { x: rect.left + p.x, y: rect.top + p.y, r: p.r };
  }, id);
  const nodePos = id => page.evaluate(id => {
    const r = app.workspace.getLeavesOfType('graph')[0].view.renderer;
    r.sim.alpha = 0;
    const p = r.nodeScreenPosition(id), rect = r.canvas.getBoundingClientRect();
    return { x: rect.left + p.x, y: rect.top + p.y };
  }, id);
  const until = (fn, arg, what) => page.waitForFunction(fn, arg, { timeout: 5000 }).catch(() => { throw new Error('timed out waiting for ' + what); });
  const graphJson = async () => JSON.parse(await h.readFile(page, '.obsidian/graph.json'));

  /* --- opening -------------------------------------------------------------- */
  const hasRibbon = await page.evaluate(() => !!document.querySelector('.side-dock-ribbon-action[aria-label="Open graph view"]'));
  assert.ok(hasRibbon, 'ribbon icon');
  /* The fixture unbinds Ctrl+G in hotkeys.json; with it unbound the key
     does nothing, and back on the default it opens the graph. */
  await page.keyboard.press('Control+g');
  await page.waitForTimeout(200);
  assert.strictEqual(await page.evaluate(() => app.workspace.getLeavesOfType('graph').length), 0, 'hotkeys.json unbinding is respected');
  await page.evaluate(() => app.config.setHotkeys('graph:open', null));
  await page.keyboard.press('Control+g');
  await until(() => { const l = app.workspace.getLeavesOfType('graph')[0]; return l && l.view.renderer && l.view.renderer.nodes.length; }, null, 'the graph to open with Ctrl+G');
  let g = await graph();
  assert.deepStrictEqual(g.ids, ['Archive/Old/Deep note.md', 'Daily/2026-09-28.md', 'Ideas.md', 'Projects/Project Alpha.md', 'Projects/Project Beta.md',
    'Templates/Daily template.md', 'Templates/Meeting.md', 'Unicode é note.md', 'Welcome.md', 'unresolved:Unwritten note'], 'notes and unresolved links: ' + g.ids);
  assert.strictEqual(g.types['unresolved:Unwritten note'], 'unresolved');
  assert.strictEqual(g.colors['Projects/Project Alpha.md'], 'group-0', 'colour group from graph.json (path:Projects)');
  assert.strictEqual(g.colors['Welcome.md'], 'fill');
  assert.strictEqual(g.colors['unresolved:Unwritten note'], 'fill-unresolved');
  assert.ok(g.weights['Welcome.md'] > g.weights['Projects/Project Beta.md'], 'weights follow link counts');
  const dom = await page.evaluate(() => {
    const c = document.querySelector('.workspace-leaf-content[data-type="graph"] .graph-controls');
    const canvas = document.querySelector('.workspace-leaf-content[data-type="graph"] canvas');
    return {
      sections: Array.from(c.querySelectorAll('.graph-control-section')).map(s => s.className),
      headers: Array.from(c.querySelectorAll('.graph-control-section-header')).map(x => x.textContent),
      toggles: Array.from(c.querySelectorAll('.mod-filter .setting-item.mod-toggle .setting-item-name')).map(x => x.textContent),
      group: c.querySelector('.graph-color-group input[type=search]').value,
      groupColor: c.querySelector('.graph-color-group input[type=color]').value,
      dpr: canvas.width / canvas.getBoundingClientRect().width,
      title: document.querySelector('.workspace-tab-header[data-type="graph"]').textContent
    };
  });
  assert.deepStrictEqual(dom.headers, ['Filters', 'Groups', 'Display', 'Forces']);
  assert.ok(dom.sections[3].includes('is-collapsed'), 'Forces collapsed per collapse-forces');
  assert.deepStrictEqual(dom.toggles, ['Tags', 'Attachments', 'Existing files only', 'Orphans']);
  assert.strictEqual(dom.group, 'path:Projects');
  assert.strictEqual(dom.groupColor, '#e05252');
  assert.ok(Math.abs(dom.dpr - (await page.evaluate(() => devicePixelRatio))) < 0.01, 'canvas is devicePixelRatio aware');
  assert.ok(dom.title.includes('Graph view'));

  /* --- filters (the toggles in the panel write graph.json) --------------------- */
  const toggle = name => page.evaluate(name => {
    const row = Array.from(document.querySelectorAll('.graph-controls .setting-item.mod-toggle')).find(r => r.querySelector('.setting-item-name').textContent === name);
    row.querySelector('.checkbox-container').click();
  }, name);
  await toggle('Tags');
  await until(() => app.workspace.getLeavesOfType('graph')[0].view.renderer.nodes.some(n => n.type === 'tag'), null, 'tag nodes');
  g = await graph();
  assert.ok(g.ids.includes('tag:#start') && g.ids.includes('tag:#nested/tag'), 'tags: ' + g.ids.filter(i => i.startsWith('tag:')));
  assert.strictEqual(g.colors['tag:#start'], 'fill-tag');
  await toggle('Attachments');
  await until(() => app.workspace.getLeavesOfType('graph')[0].view.renderer.nodes.some(n => n.type === 'attachment'), null, 'attachment nodes');
  g = await graph();
  assert.strictEqual(g.types['pixel.png'], 'attachment');
  assert.ok(g.ids.includes('Attachments/photo.png'), 'unlinked attachments show as orphans');
  await toggle('Existing files only');
  await toggle('Orphans');
  await until(() => !app.workspace.getLeavesOfType('graph')[0].view.renderer.nodes.some(n => n.type === 'unresolved' || n.id === 'Templates/Meeting.md'), null, 'unresolved and orphans hidden');
  g = await graph();
  assert.ok(!g.ids.includes('Attachments/photo.png'), 'orphan attachment hidden');
  assert.ok(g.ids.includes('pixel.png'), 'linked attachment stays');
  await page.waitForTimeout(500);
  let saved = await graphJson();
  assert.strictEqual(saved.showTags, true);
  assert.strictEqual(saved.showAttachments, true);
  assert.strictEqual(saved.hideUnresolved, true);
  assert.strictEqual(saved.showOrphans, false);
  assert.strictEqual(saved.colorGroups[0].color.rgb, 14701138, 'other keys kept');
  for (const t of ['Tags', 'Attachments', 'Existing files only', 'Orphans']) await toggle(t);

  /* Search filter. */
  await page.fill('.graph-controls .mod-search-setting input', 'path:Projects');
  await until(() => app.workspace.getLeavesOfType('graph')[0].view.renderer.nodes.length === 2, null, 'the search filter');
  g = await graph();
  assert.deepStrictEqual(g.ids, ['Projects/Project Alpha.md', 'Projects/Project Beta.md']);
  await page.fill('.graph-controls .mod-search-setting input', '');
  await until(() => app.workspace.getLeavesOfType('graph')[0].view.renderer.nodes.length === 10, null, 'the filter to clear');

  /* A new colour group, recoloured live. */
  await page.click('.graph-color-button-container button');
  await page.fill('.graph-color-group:nth-child(2) input[type=search]', 'file:Ideas');
  await until(() => { const v = app.workspace.getLeavesOfType('graph')[0].view; return v.renderer.colorOf[v.renderer.index.get('Ideas.md')] === 12; }, null, 'the new group to colour Ideas');
  await page.waitForTimeout(500);
  saved = await graphJson();
  assert.strictEqual(saved.colorGroups.length, 2);
  assert.strictEqual(saved.colorGroups[1].query, 'file:Ideas');
  assert.ok(typeof saved.colorGroups[1].color.rgb === 'number' && saved.colorGroups[1].color.a === 1, 'Obsidian colour format');
  await page.click('.graph-color-group:nth-child(2) .clickable-icon');
  await page.waitForTimeout(400);
  assert.strictEqual((await graphJson()).colorGroups.length, 1, 'group removed');

  /* Display and forces sliders. */
  await page.click('.graph-control-section.mod-forces .tree-item-self');
  const sliders = await page.evaluate(() => Array.from(document.querySelectorAll('.graph-controls .mod-slider .setting-item-name')).map(x => x.textContent));
  assert.deepStrictEqual(sliders, ['Text fade threshold', 'Node size', 'Link thickness', 'Center force', 'Repel force', 'Link force', 'Link distance']);
  await page.evaluate(() => {
    const s = Array.from(document.querySelectorAll('.graph-controls .mod-slider')).find(r => r.textContent.includes('Node size')).querySelector('input');
    s.value = '2'; s.dispatchEvent(new Event('input'));
    const d = Array.from(document.querySelectorAll('.graph-controls .mod-slider')).find(r => r.textContent.includes('Link distance')).querySelector('input');
    d.value = '100'; d.dispatchEvent(new Event('input'));
  });
  const applied = await page.evaluate(() => { const r = app.workspace.getLeavesOfType('graph')[0].view.renderer; return { size: r.display.nodeSizeMultiplier, dist: r.sim.params.linkDistance, alpha: r.sim.alpha, r0: r.radius[0] }; });
  assert.strictEqual(applied.size, 2);
  assert.strictEqual(applied.dist, 100);
  assert.ok(applied.alpha > 0.2 && applied.r0 >= 16, 'a force change reheats the layout; node size applies');
  await page.waitForTimeout(500);
  saved = await graphJson();
  assert.strictEqual(saved.nodeSizeMultiplier, 2);
  assert.strictEqual(saved.linkDistance, 100);
  assert.strictEqual(saved['collapse-forces'], false);

  /* Restore defaults (keeps the colour groups). */
  await page.hover('.graph-controls');
  await page.evaluate(() => document.querySelector('.graph-controls .mod-reset').click());
  await page.waitForTimeout(500);
  saved = await graphJson();
  assert.strictEqual(saved.nodeSizeMultiplier, 1);
  assert.strictEqual(saved.linkDistance, 250);
  assert.strictEqual(saved.colorGroups.length, 1);

  /* --- pointer --------------------------------------------------------------- */
  await page.waitForTimeout(300);
  let p = await nodeAt('Welcome.md');
  await page.mouse.move(p.x, p.y);
  await until(() => { const r = app.workspace.getLeavesOfType('graph')[0].view.renderer; return r.fade === 1; }, null, 'the hover highlight to fade in');
  const hover = await page.evaluate(() => {
    const r = app.workspace.getLeavesOfType('graph')[0].view.renderer;
    const lit = r.nodes.filter((n, i) => r.bright[i]).map(n => n.id).sort();
    return { hover: r.nodes[r.hover].id, lit, cursor: r.canvas.style.cursor };
  });
  assert.strictEqual(hover.hover, 'Welcome.md');
  assert.ok(hover.lit.includes('Ideas.md') && hover.lit.includes('unresolved:Unwritten note') && !hover.lit.includes('Templates/Meeting.md'), 'neighbours lit: ' + hover.lit);
  assert.strictEqual(hover.cursor, 'pointer');
  await page.mouse.move(p.x + 400, p.y + 300);
  await until(() => { const r = app.workspace.getLeavesOfType('graph')[0].view.renderer; return r.fade === 0 && r.hover === -1; }, null, 'the highlight to fade out');

  /* Wheel zooms around the pointer and saves the scale. */
  const before = await nodeAt('Welcome.md');
  await page.mouse.move(before.x, before.y);
  await page.mouse.wheel(0, -300);
  await until(() => { const r = app.workspace.getLeavesOfType('graph')[0].view.renderer; return r.zoomTarget === null && r.scale > 1.5; }, null, 'the zoom');
  const after = await nodePos('Welcome.md');
  assert.ok(Math.hypot(after.x - before.x, after.y - before.y) < 3, 'zoom keeps the point under the pointer still');
  await page.waitForTimeout(800);
  saved = await graphJson();
  assert.ok(saved.scale > 1.5, 'scale saved: ' + saved.scale);

  /* Drag the background to pan. */
  const pan0 = await page.evaluate(() => { const r = app.workspace.getLeavesOfType('graph')[0].view.renderer; return [r.cx, r.cy, r.scale]; });
  const empty = await page.evaluate(() => { const r = app.workspace.getLeavesOfType('graph')[0].view.renderer; const b = r.canvas.getBoundingClientRect();
    for (let y = 20; y < b.height; y += 20) for (let x = 20; x < b.width - 260; x += 20) if (r.hitTest(x, y) < 0) return { x: b.left + x, y: b.top + y }; });
  await page.mouse.move(empty.x, empty.y);
  await page.mouse.down();
  await page.mouse.move(empty.x + 100, empty.y + 50, { steps: 5 });
  await page.mouse.up();
  const pan1 = await page.evaluate(() => { const r = app.workspace.getLeavesOfType('graph')[0].view.renderer; return [r.cx, r.cy]; });
  assert.ok(Math.abs((pan0[0] - pan1[0]) * pan0[2] - 100) < 1 && Math.abs((pan0[1] - pan1[1]) * pan0[2] - 50) < 1, 'pans with the pointer');

  /* Two fingers pinch to zoom. */
  const pinch = await page.evaluate(() => {
    const r = app.workspace.getLeavesOfType('graph')[0].view.renderer;
    const b = r.canvas.getBoundingClientRect(), s0 = r.scale;
    const ev = (type, id, x, y) => r.canvas.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: b.left + x, clientY: b.top + y, bubbles: true, button: 0 }));
    ev('pointerdown', 11, 300, 400); ev('pointerdown', 12, 400, 400);
    ev('pointermove', 11, 250, 400); ev('pointermove', 12, 450, 400);
    ev('pointerup', 11, 250, 400); ev('pointerup', 12, 450, 400);
    return r.scale / s0;
  });
  assert.ok(Math.abs(pinch - 2) < 0.05, 'pinch doubles the zoom: ' + pinch);

  /* Drag a node: it's pinned while held and the layout reheats. */
  p = await nodeAt('Ideas.md');
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 60, p.y + 40, { steps: 6 });
  const held = await page.evaluate(() => { const r = app.workspace.getLeavesOfType('graph')[0].view.renderer; const i = r.index.get('Ideas.md'); return { fixed: r.sim.fixed[i], target: r.sim.alphaTarget, running: r.sim.running }; });
  assert.strictEqual(held.fixed, 1);
  assert.ok(held.target > 0 && held.running, 'reheats while dragging');
  await page.mouse.up();
  const released = await page.evaluate(() => { const r = app.workspace.getLeavesOfType('graph')[0].view.renderer; const i = r.index.get('Ideas.md'); return { fixed: r.sim.fixed[i], target: r.sim.alphaTarget, active: app.workspace.getActiveFile() }; });
  assert.strictEqual(released.fixed, 0, 'let go after the drag');
  assert.strictEqual(released.target, 0);
  assert.strictEqual(released.active, null, 'a drag is not a click');

  /* Right-click: Obsidian's file menu, with the local graph item. */
  p = await nodeAt('Ideas.md');
  await page.mouse.click(p.x, p.y, { button: 'right' });
  const menu = await page.evaluate(() => Array.from(document.querySelectorAll('.menu .menu-item-title')).map(x => x.textContent));
  assert.ok(menu.includes('Open in new tab') && menu.includes('Open local graph'), 'menu: ' + menu);
  await page.keyboard.press('Escape');

  /* Ctrl+click opens in a new tab; a click opens in place (the graph tab
     navigates, and Back returns to it). */
  const tabs0 = await page.evaluate(() => app.workspace.mainLeaves().length);
  p = await nodeAt('Ideas.md');
  await page.keyboard.down('Control');
  await page.mouse.click(p.x, p.y);
  await page.keyboard.up('Control');
  await until(n => app.workspace.mainLeaves().length === n + 1, tabs0, 'a new tab');
  const newTab = await page.evaluate(() => app.workspace.mainLeaves().some(l => l.view.file && l.view.file.path === 'Ideas.md'));
  assert.ok(newTab, 'Ctrl+click opened Ideas in a new tab');
  await page.evaluate(() => { const l = app.workspace.getLeavesOfType('graph')[0]; app.workspace.setActiveLeaf(l, { focus: true }); });
  await page.waitForTimeout(100);
  const focusCleared = await page.evaluate(() => app.workspace.getLeavesOfType('graph')[0].view.renderer.focusId);
  assert.strictEqual(focusCleared, null);
  p = await nodeAt('Projects/Project Beta.md');
  await page.mouse.click(p.x, p.y);
  await until(() => { const f = app.workspace.getActiveFile(); return f && f.path === 'Projects/Project Beta.md'; }, null, 'the click to open the note');
  const stopped = await page.evaluate(() => ({ graphs: app.workspace.getLeavesOfType('graph').length }));
  assert.strictEqual(stopped.graphs, 0, 'the graph tab navigated to the note (and closed its view)');
  await page.evaluate(() => app.commands.execute('app:go-back'));
  await until(() => app.workspace.getLeavesOfType('graph').length === 1 && app.workspace.getLeavesOfType('graph')[0].view.renderer, null, 'Back to return to the graph');

  /* --- live updates keep the layout ---------------------------------------------------- */
  await until(() => app.workspace.getLeavesOfType('graph')[0].view.renderer.nodes.length === 10, null, 'the graph to rebuild');
  const pos0 = await page.evaluate(() => { const r = app.workspace.getLeavesOfType('graph')[0].view.renderer; r.sim.alpha = 0; const i = r.index.get('Welcome.md'); return [r.sim.x[i], r.sim.y[i]]; });
  await page.evaluate(() => app.vault.create('Fresh.md', 'Links to [[Welcome]] and [[Nowhere]].'));
  await until(() => app.workspace.getLeavesOfType('graph')[0].view.renderer.index.has('Fresh.md'), null, 'the new note to appear');
  const live = await page.evaluate(() => { const r = app.workspace.getLeavesOfType('graph')[0].view.renderer; const i = r.index.get('Welcome.md'), j = r.index.get('Fresh.md');
    return { w: [r.sim.x[i], r.sim.y[i]], f: [r.sim.x[j], r.sim.y[j]], nowhere: r.index.has('unresolved:Nowhere'), alpha: r.sim.alpha }; });
  assert.ok(Math.hypot(live.w[0] - pos0[0], live.w[1] - pos0[1]) < 60, 'existing nodes keep their place');
  assert.ok(Math.hypot(live.f[0] - live.w[0], live.f[1] - live.w[1]) < 200, 'a new node starts beside its neighbour');
  assert.ok(live.nowhere, 'its unresolved link appears too');
  assert.ok(live.alpha > 0.1, 'the layout reheats a little');
  await page.evaluate(() => app.fileManager.renameFile(app.vault.getFileByPath('Fresh.md'), 'Fresher.md'));
  await until(() => app.workspace.getLeavesOfType('graph')[0].view.renderer.index.has('Fresher.md'), null, 'the rename');

  /* --- colours follow the theme ------------------------------------------------------- */
  const dark = await page.evaluate(() => app.workspace.getLeavesOfType('graph')[0].view.renderer.palette[0].css);
  await page.evaluate(() => app.config.setAppearance('theme', 'moonstone'));
  await until(d => app.workspace.getLeavesOfType('graph')[0].view.renderer.palette[0].css !== d, dark, 'light theme colours');
  await page.evaluate(() => { document.body.style.setProperty('--graph-node', 'rgb(1, 2, 3)'); app.workspace.trigger('css-change'); });
  const custom = await page.evaluate(() => app.workspace.getLeavesOfType('graph')[0].view.renderer.palette[0].css);
  assert.strictEqual(custom, 'rgb(1, 2, 3)', 'reads --graph-node');
  await page.evaluate(() => { document.body.style.removeProperty('--graph-node'); app.config.setAppearance('theme', 'obsidian'); });

  /* --- the loop sleeps when idle, hidden or closed ------------------------------------------- */
  await page.evaluate(() => { const r = app.workspace.getLeavesOfType('graph')[0].view.renderer; r.sim.alpha = 0; });
  await until(() => !app.workspace.getLeavesOfType('graph')[0].view.renderer.raf, null, 'the loop to stop when settled');
  await page.evaluate(() => app.workspace.newTab());
  await page.waitForTimeout(100);
  const hidden = await page.evaluate(() => { const r = app.workspace.getLeavesOfType('graph')[0].view.renderer; r.sim.reheat(1); r.wake(); return { raf: r.raf, visible: r.visible }; });
  assert.ok(!hidden.raf && !hidden.visible, 'no animation while the tab is hidden');
  await page.evaluate(() => { const l = app.workspace.getLeavesOfType('graph')[0]; app.workspace.setActiveLeaf(l, { focus: true }); });
  await until(() => !!app.workspace.getLeavesOfType('graph')[0].view.renderer.raf || app.workspace.getLeavesOfType('graph')[0].view.renderer.stats.draws > 0, null, 'the loop to resume');

  /* Animate (the timelapse) grows the graph back to full. */
  await page.evaluate(() => app.commands.execute('graph:animate'));
  const mid = await page.evaluate(() => new Promise(r => setTimeout(() => r(app.workspace.getLeavesOfType('graph')[0].view.renderer.nodes.length), 400)));
  await until(() => { const v = app.workspace.getLeavesOfType('graph')[0].view; return !v.timelapse && v.renderer.nodes.length === 12; }, null, 'the timelapse to finish');
  assert.ok(mid < 12, 'the timelapse starts small: ' + mid);

  const closed = await page.evaluate(async () => {
    const leaf = app.workspace.getLeavesOfType('graph')[0];
    const r = leaf.view.renderer;
    await leaf.detach();
    await new Promise(res => setTimeout(res, 300));
    return { raf: r.raf, destroyed: r.destroyed, canvas: !!document.querySelector('.graph-view-container canvas') };
  });
  assert.ok(closed.destroyed && !closed.raf && !closed.canvas, 'closing the view stops and removes the renderer');
};
