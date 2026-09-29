/* The Properties view core plugin: All properties (names, counts, type
   icons, search, sort, rename across the vault, change type) and File
   properties (the active note's properties in the sidebar). Also the
   read-only block and the property commands. */
module.exports = async ({ page, assert, h }) => {
  const wait = ms => page.waitForTimeout(ms);
  await page.evaluate(() => app.commands.execute('properties:open'));
  await page.waitForSelector('.all-properties-view .tree-item-self');
  const list = () => page.evaluate(() => Array.from(document.querySelectorAll('.all-properties-view .tree-item-self'))
    .map(el => el.dataset.propertyKey + ':' + el.querySelector('.tree-item-flair').textContent));
  const names = await list();
  assert.ok(names.includes('tags:3') && names.includes('status:2') && names.includes('rating:1'), 'names with counts: ' + names);
  assert.strictEqual(names[0], 'tags:3', 'most used first');
  const icon = await page.$eval('.all-properties-view [data-property-key="due"] .tree-item-icon svg', s => s.getAttribute('class'));
  assert.ok(icon.includes('lucide-calendar'), 'type icon: ' + icon);

  /* Search */
  await page.click('.all-properties-view .nav-action-button[aria-label="Search"]');
  await page.fill('.all-properties-view .search-input-container input', 'stat');
  await wait(50);
  assert.deepStrictEqual(await list(), ['status:2']);
  await page.fill('.all-properties-view .search-input-container input', '');

  /* Rename across the vault from the context menu. */
  await page.click('.all-properties-view [data-property-key="status"]', { button: 'right' });
  await page.click('.menu .menu-item:has-text("Rename")');
  await page.fill('.modal input[type=text]', 'state');
  await page.keyboard.press('Enter');
  await wait(1200);
  const alpha = await h.readFile(page, 'Projects/Project Alpha.md');
  const beta = await h.readFile(page, 'Projects/Project Beta.md');
  assert.ok(alpha.startsWith('---\nstate: active\ndue: 2026-10-01\n'), 'renamed in place: ' + alpha);
  assert.ok(/^state: paused$/m.test(beta), beta);
  const types = JSON.parse(await h.readFile(page, '.obsidian/types.json'));
  assert.strictEqual(types.types.state, 'text');
  assert.ok(!('status' in types.types), 'type moved with the name');
  assert.ok((await list()).includes('state:2'));

  /* Change a type from the menu. */
  await page.click('.all-properties-view [data-property-key="rating"]', { button: 'right' });
  await page.click('.menu .menu-item:has-text("Text")');
  await wait(500);
  assert.strictEqual(JSON.parse(await h.readFile(page, '.obsidian/types.json')).types.rating, 'text');

  /* File properties follows the active note. */
  await page.evaluate(async () => {
    await app.workspace.openFile(app.vault.getFileByPath('Welcome.md'));
    await app.commands.execute('properties:open-local');
  });
  await page.waitForSelector('.file-properties-view .metadata-property');
  let keys = await page.evaluate(() => Array.from(document.querySelectorAll('.file-properties-view .metadata-property')).map(r => r.dataset.propertyKey));
  assert.deepStrictEqual(keys, ['tags', 'aliases', 'created', 'rating', 'done', 'related']);
  assert.ok(!(await page.$('.file-properties-view .metadata-properties-heading')), 'no heading in the sidebar');
  await page.evaluate(() => app.workspace.openFile(app.vault.getFileByPath('Ideas.md')));
  await wait(200);
  const empty = await page.$eval('.file-properties-view', el => el.innerText);
  assert.ok(/No properties/.test(empty) && /Add property/.test(empty), 'empty note: ' + empty);

  /* Add file property: a new name box in the note's Properties block (or
     the sidebar's, when the note view doesn't draw one). */
  await page.evaluate(() => app.commands.execute('markdown:add-metadata-property'));
  await wait(100);
  const focused = await page.evaluate(() => document.activeElement && document.activeElement.matches('.metadata-property-key-input'));
  assert.ok(focused, 'Add file property focuses a new name box');
  await page.keyboard.type('mood');
  await page.keyboard.press('Enter');
  await page.keyboard.type('good');
  await page.keyboard.press('Enter');
  await wait(600);
  const ideas = await h.readFile(page, 'Ideas.md');
  assert.ok(ideas.startsWith('---\nmood: good\n---\n# Ideas'), 'frontmatter added to a note without any: ' + ideas.slice(0, 60));

  /* Read-only rendering (reading view, embeds). */
  const ro = await page.evaluate(() => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    app.properties.render(el, app.vault.getFileByPath('Welcome.md'), { editable: false });
    const out = {
      add: !!el.querySelector('.metadata-add-button'),
      disabled: el.querySelector('[data-property-key="rating"] input.metadata-input-number, [data-property-key="rating"] .metadata-input-longtext'),
      removable: !!el.querySelector('.multi-select-pill-remove-button'),
      editableText: !!el.querySelector('[contenteditable="true"]')
    };
    out.disabled = out.disabled ? (out.disabled.disabled || out.disabled.getAttribute('contenteditable') === 'false') : null;
    el.remove();
    return out;
  });
  assert.deepStrictEqual(ro, { add: false, disabled: true, removable: false, editableText: false });

  /* The source-mode fallback of Add file property writes into the YAML. */
  const fold = await page.evaluate(() => !!app.commands.find('editor:toggle-fold-properties') && !!app.commands.find('markdown:clear-metadata-properties'));
  assert.ok(fold);
};
