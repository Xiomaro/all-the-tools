/* The settings window: opening it, each page writing the right JSON file
   (keeping the keys it doesn't touch), appearance changes applying at
   once, the hotkey editor, core plugins, search, and reflecting changes
   made on disk. */
module.exports = async ({ h, page, assert, log }) => {
  const wait = ms => page.waitForTimeout(ms);
  const json = async name => JSON.parse(await h.readFile(page, '.obsidian/' + name + '.json'));
  /* Config writes are coalesced for 300 ms. */
  const settle = () => wait(500);

  const row = name => page.locator('.vertical-tab-content .setting-item', { has: page.locator('.setting-item-name', { hasText: new RegExp('^' + name.replace(/[[\]()]/g, '\\$&') + '$') }) }).first();
  const toggle = name => row(name).locator('.checkbox-container').first();
  const isOn = async name => (await toggle(name).getAttribute('class')).includes('is-enabled');
  const tab = id => page.evaluate(id => app.setting.openTabById(id), id).then(() => wait(150));

  /* --- opening ---------------------------------------------------------- */
  assert.ok(await page.locator('.side-dock-settings [aria-label="Open settings"]').count(), 'ribbon cog');
  await page.locator('.workspace').click({ position: { x: 600, y: 300 } }).catch(() => {});
  await page.keyboard.press('Control+,');
  await page.waitForSelector('.modal.mod-settings .vertical-tab-header .vertical-tab-nav-item.is-active', { timeout: 5000 });
  const nav = await page.$$eval('.vertical-tab-header-group', gs => gs.map(g => ({
    title: g.querySelector('.vertical-tab-header-group-title').textContent,
    items: Array.from(g.querySelectorAll('.vertical-tab-nav-item')).map(i => i.textContent) })));
  assert.deepStrictEqual(nav[0].items, ['General', 'Editor', 'Files and links', 'Appearance', 'Hotkeys', 'Core plugins', 'Community plugins']);
  assert.strictEqual(nav[0].title, 'Options');
  log('plugin pages:', nav[1] ? nav[1].items.join(', ') : '(none)');
  assert.ok(await page.locator('.vertical-tab-content-container > .vertical-tab-content .setting-item').count() > 5, 'General page rendered');
  await page.keyboard.press('Escape');
  assert.strictEqual(await page.locator('.mod-settings').count(), 0, 'Escape closes');
  await page.locator('.side-dock-settings [aria-label="Open settings"]').click();
  await page.waitForSelector('.mod-settings');
  assert.strictEqual(await page.evaluate(() => app.setting.activeTab.id), 'about', 'reopens on the last page');

  /* --- Editor: toggles and dropdowns write app.json, keeping other keys ---- */
  await tab('editor');
  assert.strictEqual(await isOn('Line numbers'), false);
  await toggle('Line numbers').click();
  await row('Default view for new tabs').locator('select').selectOption('preview');
  await row('Default editing mode').locator('select').selectOption('false');
  await row('Properties in document').locator('select').selectOption('source');
  await toggle('Vim key bindings').click();
  await settle();
  let appJson = await json('app');
  assert.strictEqual(appJson.showLineNumber, true);
  assert.strictEqual(appJson.defaultViewMode, 'preview');
  assert.strictEqual(appJson.livePreview, false, 'livePreview stored as a boolean');
  assert.strictEqual(appJson.propertiesInDocument, 'source');
  assert.strictEqual(appJson.vimMode, true);
  assert.strictEqual(appJson.alwaysUpdateLinks, true, 'other keys kept');
  assert.strictEqual(appJson.attachmentFolderPath, 'Attachments', 'other keys kept');
  assert.strictEqual(await page.evaluate(() => app.config.get('showLineNumber')), true);

  /* Inline title and tab title bar apply at once. */
  await toggle('Show inline title').click();
  await toggle('Show tab title bar').click();
  await settle();
  assert.ok(!(await page.evaluate(() => document.body.classList.contains('show-inline-title'))), 'inline title hidden');
  assert.ok(!(await page.evaluate(() => document.body.classList.contains('show-view-header'))), 'tab title bar hidden');
  appJson = await json('app');
  assert.strictEqual(appJson.showInlineTitle, false);
  assert.strictEqual((await json('appearance')).showViewHeader, false);
  await toggle('Show inline title').click();
  await toggle('Show tab title bar').click();

  /* --- Files and links ----------------------------------------------------- */
  await tab('file');
  assert.strictEqual(await isOn('Use [[Wikilinks]]'), true);
  await toggle('Use [[Wikilinks]]').click();
  await row('Deleted files').locator('select').selectOption('local');
  await row('Default location for new notes').locator('select').selectOption('folder');
  await wait(150);
  await row('Folder to create new notes in').locator('input').fill('Projects');
  assert.ok(await page.locator('.vertical-tab-content datalist option[value="Projects"]').count(), 'folder suggestions');
  await row('Default location for new attachments').locator('select').selectOption('subfolder');
  await wait(150);
  await row('Subfolder name').locator('input').fill('assets');
  await settle();
  appJson = await json('app');
  assert.strictEqual(appJson.useMarkdownLinks, true, 'Use [[Wikilinks]] off = useMarkdownLinks on');
  assert.strictEqual(appJson.trashOption, 'local');
  assert.strictEqual(appJson.newFileLocation, 'folder');
  assert.strictEqual(appJson.newFileFolderPath, 'Projects');
  assert.strictEqual(appJson.attachmentFolderPath, './assets');
  await row('Default location for new attachments').locator('select').selectOption('root');
  await settle();
  assert.strictEqual((await json('app')).attachmentFolderPath, '/');
  /* Excluded files list editor. */
  await row('Excluded files').locator('button').click();
  await page.locator('.mod-settings-list-editor input').fill('Archive/');
  await page.locator('.mod-settings-list-editor button.mod-cta').click();
  await page.locator('.mod-settings-list-editor input').fill('/\\.tmp$/');
  await page.keyboard.press('Enter');
  await page.locator('.mod-settings-list-editor .settings-list-editor-item').first().locator('.clickable-icon').click();
  await page.keyboard.press('Escape');
  await settle();
  assert.deepStrictEqual((await json('app')).userIgnoreFilters, ['/\\.tmp$/']);
  assert.strictEqual(await page.locator('.mod-settings-list-editor').count(), 0, 'Escape closes the list editor');
  assert.ok(await page.locator('.mod-settings').count(), 'closing the list editor leaves settings open');

  /* --- Appearance ---------------------------------------------------------- */
  await tab('appearance');
  await row('Base color scheme').locator('select').selectOption('moonstone');
  await wait(100);
  assert.ok(await page.evaluate(() => document.body.classList.contains('theme-light')), 'light mode applied');
  await row('Base color scheme').locator('select').selectOption('obsidian');
  await row('Accent color').locator('input[type=color]').evaluate(el => { el.value = '#ff0000'; el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change')); });
  await wait(200);
  assert.strictEqual(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--accent-h').trim()), '0', 'accent applied');
  assert.ok(await row('Accent color').locator('[aria-label="Restore default"]').count(), 'accent reset button');
  await row('Font size').locator('input.slider').evaluate(el => { el.value = '20'; el.dispatchEvent(new Event('input')); });
  await wait(100);
  assert.strictEqual(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--font-text-size').trim()), '20px', 'font size applied');
  await toggle('Show ribbon').click();
  await wait(100);
  assert.ok(!(await page.evaluate(() => document.body.classList.contains('show-ribbon'))), 'ribbon hidden');
  await toggle('Show ribbon').click();
  /* Fonts through the list editor. */
  await row('Text font').locator('button').click();
  await page.locator('.mod-font-picker input').fill('Georgia');
  await page.keyboard.press('Enter');
  await page.locator('.mod-font-picker input').fill('serif');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await wait(100);
  assert.ok((await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--font-text-override'))).includes('Georgia'), 'text font applied');
  /* Snippets: the fixture's snippet is on; turn it off. */
  assert.strictEqual(await isOn('fixture-snippet'), true);
  await toggle('fixture-snippet').click();
  await wait(300);
  assert.strictEqual(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--fixture-snippet-loaded').trim()), '', 'snippet removed');
  await settle();
  let appearance = await json('appearance');
  assert.strictEqual(appearance.accentColor, '#ff0000');
  assert.strictEqual(appearance.baseFontSize, 20);
  assert.strictEqual(appearance.theme, 'obsidian');
  assert.strictEqual(appearance.textFontFamily, 'Georgia, serif');
  assert.deepStrictEqual(appearance.enabledCssSnippets, []);
  /* An installed theme shows up and applies. */
  await page.evaluate(() => app.vault.adapter.write('.obsidian/themes/Test Theme/theme.css', 'body { --test-theme-loaded: 1; }'));
  await tab('appearance');
  await row('Themes').locator('select').selectOption('Test Theme');
  await wait(300);
  assert.strictEqual(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--test-theme-loaded').trim()), '1', 'theme applied');
  await row('Themes').locator('select').selectOption('');
  await settle();
  assert.strictEqual((await json('appearance')).cssTheme, '');

  /* --- Hotkeys --------------------------------------------------------------- */
  await tab('hotkeys');
  const hkRow = id => page.locator('.hotkey-list-container .setting-item[data-command-id="' + id + '"]');
  /* The browser keeps Ctrl+W: its chip warns and names Ctrl+Alt+W. */
  const warn = await hkRow('workspace:close').locator('.setting-hotkey-warning').getAttribute('title');
  assert.ok(/Alt/.test(warn), 'reserved hotkey warning: ' + warn);
  /* Record Ctrl+Shift+Y for "Toggle ribbon", then use it. */
  await page.locator('.hotkey-search-container input[type=search]').fill('toggle ribbon');
  assert.strictEqual(await page.locator('.hotkey-list-container .setting-item').count(), 1, 'filter by name');
  await hkRow('app:toggle-ribbon').locator('[aria-label="Customize this command"]').click();
  assert.ok(await hkRow('app:toggle-ribbon').locator('.setting-hotkey.mod-active').count(), 'recording');
  await page.keyboard.press('Control+Shift+Y');
  await wait(100);
  assert.strictEqual(await hkRow('app:toggle-ribbon').locator('.setting-hotkey:not(.mod-empty)').first().textContent(), 'Ctrl + Shift + Y');
  /* A conflict is marked. */
  await hkRow('app:toggle-ribbon').locator('[aria-label="Customize this command"]').click();
  await page.keyboard.press('Control+P');
  await wait(100);
  assert.ok(await hkRow('app:toggle-ribbon').locator('.setting-hotkey.has-conflict').count(), 'conflict with the command palette');
  await hkRow('app:toggle-ribbon').locator('.setting-hotkey.has-conflict [aria-label="Delete hotkey"]').click();
  /* Escape cancels recording without closing the window. */
  await hkRow('app:toggle-ribbon').locator('[aria-label="Customize this command"]').click();
  await page.keyboard.press('Escape');
  assert.ok(await page.locator('.mod-settings').count(), 'Escape while recording keeps the window open');
  assert.strictEqual(await hkRow('app:toggle-ribbon').locator('.setting-hotkey:not(.mod-empty)').count(), 1);
  await settle();
  let hotkeys = await json('hotkeys');
  assert.deepStrictEqual(hotkeys['app:toggle-ribbon'], [{ modifiers: ['Mod', 'Shift'], key: 'Y' }]);
  assert.ok(hotkeys['editor:toggle-highlight'] && Array.isArray(hotkeys['graph:open']), 'other entries kept');
  /* Filter by pressing a hotkey. */
  await page.locator('.hotkey-search-container input[type=search]').fill('');
  await page.locator('.setting-filter-by-hotkey').click();
  await page.keyboard.press('Control+Shift+Y');
  await wait(100);
  assert.deepStrictEqual(await page.$$eval('.hotkey-list-container .setting-item', els => els.map(e => e.dataset.commandId)), ['app:toggle-ribbon'], 'filter by hotkey');
  await page.locator('.setting-hotkey-filter [aria-label="Clear"]').click();
  /* The recorded hotkey runs the command. */
  await page.keyboard.press('Escape');
  const ribbonBefore = await page.evaluate(() => document.body.classList.contains('show-ribbon'));
  await page.keyboard.press('Control+Shift+Y');
  await wait(100);
  assert.strictEqual(await page.evaluate(() => document.body.classList.contains('show-ribbon')), !ribbonBefore, 'recorded hotkey runs the command');
  await page.keyboard.press('Control+Shift+Y');
  /* Restore default removes the entry from hotkeys.json. */
  await page.keyboard.press('Control+,');
  await page.waitForSelector('.mod-settings');
  await tab('hotkeys');
  await hkRow('app:toggle-ribbon').locator('[aria-label="Restore default"]').click();
  /* Removing a default hotkey writes an empty list. */
  await hkRow('switcher:open').locator('[aria-label="Delete hotkey"]').click();
  await settle();
  hotkeys = await json('hotkeys');
  assert.ok(!('app:toggle-ribbon' in hotkeys), 'restored to default');
  assert.deepStrictEqual(hotkeys['switcher:open'], [], 'no hotkeys = []');

  /* --- Core plugins -------------------------------------------------------------- */
  await tab('plugins');
  const pRow = id => page.locator('.vertical-tab-content .setting-item[data-plugin-id="' + id + '"]');
  await pRow('random-note').locator('.checkbox-container').click();
  await wait(300);
  assert.strictEqual(await page.evaluate(() => app.plugins.isEnabled('random-note')), false);
  await pRow('random-note').locator('.checkbox-container').click();
  await wait(300);
  assert.strictEqual(await page.evaluate(() => app.plugins.isEnabled('random-note')), true);
  await settle();
  assert.strictEqual((await json('core-plugins'))['random-note'], true);
  assert.strictEqual(await pRow('publish').locator('.checkbox-container.is-disabled').count(), 1, 'Publish can’t be turned on');
  /* The cog opens a plugin's options page, listed under "Core plugins". */
  const withTab = await page.evaluate(() => { const p = app.plugins.list().map(d => app.plugins.get(d.id)).find(p => p && p.settingTab); return p ? p.id : null; });
  if (withTab) {
    await pRow(withTab).locator('[aria-label="Options"]').click();
    await wait(200);
    assert.strictEqual(await page.evaluate(() => app.setting.activeTab.id), withTab, 'cog opens the plugin page');
    assert.ok(await page.locator('.vertical-tab-header-group:nth-child(2) .vertical-tab-nav-item.is-active').count(), 'plugin page highlighted in the Core plugins group');
  }
  await tab('community-plugins');
  assert.ok((await page.locator('.vertical-tab-content').textContent()).includes('can’t run here'));

  /* --- Search ---------------------------------------------------------------------- */
  await page.locator('.settings-search-container input').fill('line numbers');
  await wait(600);
  assert.ok(await row('Line numbers').count(), 'search finds Line numbers');
  await toggle('Line numbers').click();
  await settle();
  assert.strictEqual((await json('app')).showLineNumber, false, 'a row in the results works');
  await page.locator('.settings-search-container input').fill('zzzz-nothing');
  await wait(400);
  assert.ok(await page.locator('.settings-search-empty').count());
  await page.locator('.settings-search-container input').fill('');
  await wait(200);

  /* --- Changes on disk show when the window is reopened --------------------------- */
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.evaluate(async () => {
    const a = JSON.parse(await app.vault.adapter.read('.obsidian/app.json'));
    a.showLineNumber = true;
    await app.vault.adapter.write('.obsidian/app.json', JSON.stringify(a, null, 2));
    await app.config.reload();
  });
  await page.evaluate(() => app.setting.open('editor'));
  await wait(200);
  assert.strictEqual(await isOn('Line numbers'), true, 'reflects app.json changed on disk');
  await page.evaluate(() => app.setting.close());

  /* --- Ctrl+scroll changes the font size ----------------------------------------------- */
  const before = await page.evaluate(() => app.config.appearance('baseFontSize'));
  await page.mouse.move(800, 400);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -100);
  await page.keyboard.up('Control');
  await wait(200);
  assert.strictEqual(await page.evaluate(() => app.config.appearance('baseFontSize')), before + 1, 'Ctrl+scroll up makes text bigger');
};
