/* The Properties block: types from types.json and inferred, each type's
   editor, edits written back with Obsidian's YAML formatting, adding,
   renaming, reordering and removing properties, and invalid YAML. */
module.exports = async ({ page, assert, h }) => {
  const wait = ms => page.waitForTimeout(ms);
  await page.evaluate(() => {
    const host = document.createElement('div');
    host.id = 'props-host';
    host.className = 'markdown-source-view';
    host.style.cssText = 'position:fixed;left:360px;top:60px;width:620px;z-index:20;background:var(--background-primary);padding:16px';
    document.body.appendChild(host);
    window.__block = app.properties.render(host, app.vault.getFileByPath('Welcome.md'), { editable: true });
  });

  const rows = await page.evaluate(() => Array.from(document.querySelectorAll('#props-host .metadata-property'))
    .map(r => [r.dataset.propertyKey, r.dataset.propertyType]));
  assert.deepStrictEqual(rows, [['tags', 'tags'], ['aliases', 'aliases'], ['created', 'date'], ['rating', 'number'], ['done', 'checkbox'], ['related', 'text']]);
  const shape = await page.evaluate(() => {
    const q = s => document.querySelector('#props-host ' + s);
    return {
      heading: q('.metadata-properties-heading .metadata-properties-title').textContent,
      pills: Array.from(document.querySelectorAll('#props-host [data-property-key="tags"] .multi-select-pill')).map(p => p.textContent),
      date: q('[data-property-key="created"] input[type=date]').value,
      number: q('[data-property-key="rating"] input[type=number]').value,
      checkbox: q('[data-property-key="done"] input[type=checkbox]').checked,
      link: q('[data-property-key="related"] .metadata-link a.internal-link').textContent,
      add: !!q('.metadata-add-button')
    };
  });
  assert.strictEqual(shape.heading, 'Properties');
  assert.deepStrictEqual(shape.pills, ['start', 'guide']);
  assert.strictEqual(shape.date, '2026-01-15');
  assert.strictEqual(shape.number, '4');
  assert.strictEqual(shape.checkbox, false);
  assert.strictEqual(shape.link, 'Projects/Project Alpha', 'a text value that is a link shows as the link');
  assert.ok(shape.add);

  /* Edit: tick the checkbox, change the number, add a tag. */
  await page.click('#props-host [data-property-key="done"] input[type=checkbox]');
  await page.fill('#props-host [data-property-key="rating"] input.metadata-input-number', '5');
  await page.press('#props-host [data-property-key="rating"] input.metadata-input-number', 'Enter');
  await page.click('#props-host [data-property-key="tags"] .multi-select-input');
  await page.keyboard.type('extra');
  await page.keyboard.press('Enter');
  await wait(600);
  let text = await h.readFile(page, 'Welcome.md');
  assert.ok(/^done: true$/m.test(text), 'checkbox written: ' + text.slice(0, 200));
  assert.ok(/^rating: 5$/m.test(text), "number written: " + text.slice(0, 300));
  assert.ok(text.includes('tags:\n  - start\n  - guide\n  - extra\n'), 'tags written as a block list: ' + text.slice(0, 200));
  assert.ok(text.includes('aliases: [Home, Start here]'), 'untouched keys keep their formatting');
  assert.ok(text.includes('related: "[[Projects/Project Alpha]]"'), 'untouched link keeps its quotes');

  /* Add a property with a name suggestion, then give it a value. */
  await page.click('#props-host .metadata-add-button');
  await page.keyboard.type('status');
  await wait(100);
  const sugg = await page.evaluate(() => Array.from(document.querySelectorAll('.suggestion-container.mod-property-suggest .suggestion-item')).map(e => e.textContent));
  assert.ok(sugg.includes('status'), 'name suggestions from the vault: ' + sugg);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Tab');
  await wait(50);
  await page.keyboard.type('draft');
  await page.keyboard.press('Enter');
  await wait(600);
  text = await h.readFile(page, 'Welcome.md');
  assert.ok(/^status: draft$/m.test(text), 'new property written: ' + text.slice(0, 260));

  /* Rename a key, remove one, reorder with Alt+Up. */
  await page.fill('#props-host [data-property-key="rating"] input.metadata-property-key-input', 'score');
  await page.press('#props-host [data-property-key="rating"] input.metadata-property-key-input', 'Enter');
  await wait(50);
  await page.focus('#props-host [data-property-key="done"]');
  await page.keyboard.press('Delete');
  await page.focus('#props-host [data-property-key="status"]');
  await page.keyboard.press('Alt+ArrowUp');
  await wait(600);
  text = await h.readFile(page, 'Welcome.md');
  const keys = text.split('---')[1].split('\n').filter(l => /^\w/.test(l)).map(l => l.split(':')[0]);
  assert.deepStrictEqual(keys, ['tags', 'aliases', 'created', 'score', 'status', 'related'], 'keys after rename, remove, move: ' + keys);

  /* The block follows changes made elsewhere. */
  await page.evaluate(() => app.fileManager.processFrontMatter(app.vault.getFileByPath('Welcome.md'), d => { d.created = '2026-02-01'; }));
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await wait(300);
  const created = await page.$eval('#props-host [data-property-key="created"] input.metadata-input', i => i.value);
  assert.strictEqual(created, '2026-02-01');

  /* Changing a type writes types.json. */
  await page.click('#props-host [data-property-key="status"] .metadata-property-icon');
  await page.click('.menu .menu-item:has-text("List")');
  await wait(700);
  const types = JSON.parse(await h.readFile(page, '.obsidian/types.json'));
  assert.strictEqual(types.types.status, 'multitext');
  assert.strictEqual(await page.$eval('#props-host [data-property-key="status"]', r => r.dataset.propertyType), 'multitext');
  assert.ok(await page.$('#props-host [data-property-key="status"] .multi-select-pill'), 'a text value shows as one pill in a list');

  /* Invalid YAML shows the raw text. */
  await page.evaluate(async () => {
    const f = await app.vault.create('Broken.md', '---\ntitle: [unclosed\n---\nBody\n');
    window.__broken = app.properties.render(document.getElementById('props-host'), f, { editable: true });
  });
  const err = await page.evaluate(() => ({
    title: (document.querySelector('#props-host .metadata-error-title') || {}).textContent,
    raw: (document.querySelector('#props-host .metadata-error-raw') || {}).value
  }));
  assert.strictEqual(err.title, 'Invalid properties');
  assert.ok(err.raw.includes('title: [unclosed'));

  /* A note without properties shows nothing until one is added. */
  const hidden = await page.evaluate(() => {
    const b = app.properties.render(document.getElementById('props-host'), app.vault.getFileByPath('Ideas.md'), { editable: true });
    const before = b.rootEl.hidden;
    b.addProperty();
    return [before, b.rootEl.hidden, !!document.activeElement.matches('.metadata-property-key-input')];
  });
  assert.deepStrictEqual(hidden, [true, false, true]);
  await page.keyboard.press('Escape');
};
