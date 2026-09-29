/* The .base view: the table and cards from the fixture base, editing a
   cell writes the note, the toolbar's sort, filter, properties and
   formula editors write the .base YAML, live updates, the New button,
   ```base blocks, embeds and the commands. */
module.exports = async ({ page, assert, h }) => {
  const wait = ms => page.waitForTimeout(ms);
  await page.evaluate(() => app.workspace.openFile(app.vault.getFileByPath('Projects.base')));
  await page.waitForSelector('.bases-view .bases-table');

  const table = () => page.evaluate(() => Array.from(document.querySelectorAll('.bases-view .bases-tbody tr.bases-tr[data-path]'))
    .map(tr => Array.from(tr.children).map(td => td.innerText.trim())));
  const heads = () => page.evaluate(() => Array.from(document.querySelectorAll('.bases-view .bases-th')).map(th => th.innerText.trim()));
  assert.deepStrictEqual(await heads(), ['file name', 'Status', 'due'], 'columns with display names');
  assert.deepStrictEqual(await table(), [['Project Alpha', 'active', '2026-10-01'], ['Project Beta', 'paused', '']]);
  assert.strictEqual(await page.$eval('.bases-toolbar-results-menu', e => e.innerText.trim()), '2 results');

  /* Edit a cell: the note's frontmatter changes. */
  await page.click('.bases-td[data-path="Projects/Project Beta.md"][data-property="status"]');
  await page.waitForSelector('.bases-table-cell.is-editing .metadata-input-longtext');
  await page.keyboard.press('Control+A');
  await page.keyboard.type('active');
  await page.keyboard.press('Enter');
  await wait(700);
  const beta = await h.readFile(page, 'Projects/Project Beta.md');
  assert.ok(/^status: active$/m.test(beta), 'cell edit written: ' + beta);
  assert.ok(beta.includes('tags: project'), 'other keys untouched');
  assert.deepStrictEqual((await table())[1], ['Project Beta', 'active', '']);

  /* Sort from the header menu: written to the .base file. */
  await page.click('.bases-th[data-property="file.name"]');
  await page.click('.menu .menu-item:has-text("Sort Z → A")');
  await wait(500);
  assert.deepStrictEqual((await table()).map(r => r[0]), ['Project Beta', 'Project Alpha']);
  let base = await h.readFile(page, 'Projects.base');
  assert.ok(/property: file\.name\n\s+direction: DESC/.test(base), 'sort saved: ' + base);
  assert.ok(base.includes('file.inFolder("Projects")'), 'filters kept: ' + base);

  /* Add a column from the Properties menu. */
  await page.click('.bases-toolbar-properties-menu');
  await page.fill('.bases-properties-search', 'tags');
  await page.click('.bases-properties-item[data-property="note.tags"]');
  await page.keyboard.press('Escape');
  await wait(500);
  assert.deepStrictEqual(await heads(), ['file name', 'Status', 'due', 'tags']);
  base = await h.readFile(page, 'Projects.base');
  assert.ok(/order:\n(\s+- .*\n){3}\s+- tags/.test(base), 'order saved: ' + base);

  /* A formula column. */
  await page.evaluate(() => {
    const r = app.workspace.getLeavesOfType('bases')[0].view.renderer;
    r.config.formulas.days = '(due - today()) / 86400000 > 0';
    r.view.order.push('formula.overdue');
    r.save(); r.render();
  });
  await wait(400);
  const overdue = (await table()).map(r => r[4]);
  assert.ok(overdue.every(x => x === 'true' || x === 'false' || x === ''), 'formula column: ' + overdue);

  /* Filter for this view, through the filter editor. */
  await page.click('.bases-toolbar-filter-menu');
  await page.click('.bases-filter-tab:has-text("This view")');
  await page.click('.bases-popover button:has-text("Add filter")');
  await page.selectOption('.bases-filter-row .bases-prop-select', 'note.status');
  await page.selectOption('.bases-filter-row .bases-filter-operator', 'is');
  await page.fill('.bases-filter-row .bases-filter-value', 'paused');
  await wait(700);
  await page.keyboard.press('Escape');
  await wait(300);
  base = await h.readFile(page, 'Projects.base');
  assert.ok(base.includes('status == \\"paused\\"') || base.includes('status == "paused"'), 'view filter saved: ' + base);
  assert.strictEqual((await table()).length, 0, 'no project is paused now');

  /* Live update: a note changed elsewhere shows up. */
  await page.evaluate(() => app.fileManager.processFrontMatter(app.vault.getFileByPath('Projects/Project Alpha.md'), d => { d.status = 'paused'; }));
  await wait(600);
  assert.deepStrictEqual((await table()).map(r => r[0]), ['Project Alpha']);

  /* New: the note gets the filter's property and folder. */
  await page.click('.bases-toolbar-new-item-menu');
  await wait(600);
  const created = await page.evaluate(() => app.vault.getMarkdownFiles().map(f => f.path).find(p => /Untitled/.test(p)));
  assert.strictEqual(created, 'Projects/Untitled.md');
  const text = await h.readFile(page, created);
  assert.ok(/status: paused/.test(text), 'new note has the filtered property: ' + text);
  const editing = await page.$('.bases-td[data-path="Projects/Untitled.md"] .bases-cell-input');
  assert.ok(editing, 'the new row’s name is being edited');
  await page.keyboard.type('Gamma');
  await page.keyboard.press('Enter');
  await wait(600);
  assert.ok(await page.evaluate(() => !!app.vault.getFileByPath('Projects/Gamma.md')), 'renamed from the table');

  /* Cards view with a cover image. */
  await page.evaluate(() => {
    const r = app.workspace.getLeavesOfType('bases')[0].view.renderer;
    r.config.views[1].image = 'note.cover';
    r.config.views[1].order = ['file.name', 'status'];
    r.setView(1);
  });
  await page.evaluate(() => app.fileManager.processFrontMatter(app.vault.getFileByPath('Projects/Project Beta.md'), d => { d.cover = '[[pixel.png]]'; }));
  await wait(600);
  const cards = await page.evaluate(() => Array.from(document.querySelectorAll('.bases-cards-item')).map(c => ({
    title: c.querySelector('.mod-title').innerText.trim(), img: !!c.querySelector('.bases-cards-cover img'), label: (c.querySelector('.bases-cards-label') || {}).innerText
  })));
  assert.ok(cards.length >= 3, 'cards: ' + JSON.stringify(cards));
  assert.ok(cards.find(c => c.title === 'Project Beta').img, 'cover image from a property');
  assert.strictEqual(cards[0].label, 'Status');

  /* A ```base block in a note, drawn by the code block processor. */
  const block = await page.evaluate(async () => {
    const note = await app.vault.create('Base block.md', '# Notes\n\n```base\nfilters: file.hasTag("project")\nviews:\n  - type: table\n    name: Tagged\n    order: [file.name, status]\n```\n');
    const el = document.createElement('div');
    el.className = 'markdown-rendered';
    el.style.cssText = 'position:fixed;left:400px;top:400px;width:700px;z-index:30;background:var(--background-primary)';
    document.body.appendChild(el);
    const fn = app.codeBlockProcessors.get('base');
    const src = 'filters: file.hasTag("project")\nviews:\n  - type: table\n    name: Tagged\n    order: [file.name, status]\n';
    const r = fn(src, el, { sourcePath: note.path });
    await new Promise(res => setTimeout(res, 100));
    const rows = Array.from(el.querySelectorAll('tr.bases-tr[data-path]')).map(tr => tr.dataset.path);
    /* Edit from the block's toolbar: the note's block is rewritten. */
    r.view.limit = 1;
    await r.save();
    const after = await app.vault.adapter.read(note.path);
    el.remove();
    return { rows, after };
  });
  assert.deepStrictEqual(block.rows.sort(), ['Projects/Project Alpha.md', 'Projects/Project Beta.md']);
  assert.ok(/```base\n[\s\S]*limit: 1[\s\S]*```/.test(block.after) && block.after.startsWith('# Notes'), 'block rewritten in the note: ' + block.after);

  /* Embeds and the commands. */
  const misc = await page.evaluate(async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await app.bases.renderEmbed(app.vault.getFileByPath('Projects.base'), el, '#Cards', 'Welcome.md');
    const embedView = el.querySelector('.bases-toolbar-views-menu').innerText.trim();
    el.remove();
    const cmds = ['bases:new', 'bases:insert', 'properties:open', 'properties:open-local', 'markdown:add-metadata-property'].map(id => !!app.commands.find(id));
    app.commands.execute('bases:new');
    await new Promise(r => setTimeout(r, 400));
    const leaf = app.workspace.getMostRecentLeaf();
    return { embedView, cmds, newBase: leaf.view.file && leaf.view.file.path, newText: leaf.view.file && await app.vault.adapter.read(leaf.view.file.path) };
  });
  assert.strictEqual(misc.embedView, 'Cards', 'embed with #View shows that view');
  assert.ok(misc.cmds.every(Boolean), 'commands registered: ' + misc.cmds);
  assert.strictEqual(misc.newBase, 'Untitled.base');
  assert.ok(misc.newText.includes('type: table'));
};
