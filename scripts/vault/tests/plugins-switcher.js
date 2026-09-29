/* Quick switcher and command palette. */
module.exports = async ({ page, assert }) => {
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
  const results = () => page.$$eval('.prompt .suggestion-item', els => els.map(e => ({
    title: (e.querySelector('.suggestion-title') || {}).textContent,
    note: (e.querySelector('.suggestion-note') || {}).textContent || '',
    alias: !!e.querySelector('.suggestion-flair[aria-label="Alias"]'),
    unresolved: e.classList.contains('mod-unresolved'),
    hotkeys: Array.from(e.querySelectorAll('.suggestion-hotkey')).map(k => k.textContent),
    pinned: !!e.querySelector('.suggestion-flair[aria-label="Pinned"]'),
    selected: e.classList.contains('is-selected')
  })));
  const type = async text => { await page.fill('.prompt-input', text); await page.waitForTimeout(80); };

  /* Recent files, the current one left out. */
  await page.evaluate(async () => {
    const a = window.app;
    await a.workspace.openFile(a.vault.getFileByPath('Ideas.md'));
    await a.workspace.openFile(a.vault.getFileByPath('Welcome.md'));
  });
  await page.keyboard.press(mod + '+O');
  await page.waitForSelector('.prompt.mod-quick-switcher');
  let r = await results();
  assert.strictEqual(r[0].title, 'Ideas', 'recent files first, current left out: ' + JSON.stringify(r));
  assert.ok(!r.some(x => x.title === 'Welcome'));
  const footer = await page.$eval('.prompt-instructions', el => el.textContent);
  assert.ok(/to open in new tab/.test(footer) && /to create/.test(footer), 'instructions: ' + footer);

  /* Names, folders, aliases and unresolved links. */
  await type('alpha');
  r = await results();
  assert.strictEqual(r[0].title, 'Project Alpha');
  assert.strictEqual(r[0].note, 'Projects/');
  await type('start here');
  r = await results();
  assert.ok(r[0].alias && r[0].title === 'Start here' && r[0].note === 'Welcome', 'alias: ' + JSON.stringify(r[0]));
  await type('unwritten');
  r = await results();
  assert.ok(r.some(x => x.unresolved && x.title === 'Unwritten note'), 'unresolved link listed');
  await type('pixel');
  r = await results();
  assert.ok(r.some(x => x.title === 'pixel.png'), 'attachments shown by default');

  /* Tab autocompletes the path; Enter opens. */
  await type('beta');
  await page.keyboard.press('Tab');
  assert.strictEqual(await page.inputValue('.prompt-input'), 'Projects/Project Beta');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window.app.workspace.getActiveFile() || {}).path === 'Projects/Project Beta.md');

  /* Ctrl+Enter opens in a new tab. */
  const before = await page.evaluate(() => window.app.workspace.mainLeaves().length);
  await page.keyboard.press(mod + '+O');
  await type('ideas');
  await page.keyboard.press(mod + '+Enter');
  await page.waitForFunction(n => window.app.workspace.mainLeaves().length === n + 1 && window.app.workspace.getActiveFile().path === 'Ideas.md', before);

  /* Shift+Enter creates a note, with folders from the typed path. */
  await page.keyboard.press(mod + '+O');
  await type('New folder/Fresh note');
  await page.keyboard.press('Shift+Enter');
  await page.waitForFunction(() => (window.app.workspace.getActiveFile() || {}).path === 'New folder/Fresh note.md');

  /* Enter with no results creates too, in the folder for new notes. */
  await page.keyboard.press(mod + '+O');
  await type('Zzqx brand new');
  assert.ok(await page.$('.prompt .suggestion-empty'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window.app.workspace.getActiveFile() || {}).path === 'Zzqx brand new.md');

  /* Settings: only existing notes, no attachments. */
  await page.evaluate(() => window.app.config.writeJson('switcher', { showExistingOnly: true, showAttachments: false, showAllFileTypes: false }, true));
  await page.keyboard.press(mod + '+O');
  await type('unwritten');
  r = await results();
  assert.ok(!r.some(x => x.unresolved), 'showExistingOnly hides unresolved links');
  await type('pixel');
  r = await results();
  assert.ok(!r.some(x => x.title === 'pixel.png'), 'showAttachments off hides images');
  await page.keyboard.press('Escape');

  /* Command palette: hotkeys shown, pinned first, recent next, runs on Enter. */
  await page.evaluate(() => window.app.config.writeJson('command-palette', { pinned: ['random-note'] }, true));
  await page.keyboard.press(mod + '+P');
  await page.waitForSelector('.prompt.mod-command-palette');
  r = await results();
  assert.strictEqual(r[0].title, 'Random note: Open random note');
  assert.ok(r[0].pinned);
  await type('open quick switcher');
  r = await results();
  assert.strictEqual(r[0].title, 'Quick switcher: Open quick switcher');
  assert.ok(r[0].hotkeys.length === 1 && /O$/.test(r[0].hotkeys[0]), 'hotkey shown: ' + r[0].hotkeys);
  await type('daily today');
  await page.keyboard.press('Enter');
  const today = await page.evaluate(() => window.moment().format('YYYY-MM-DD'));
  await page.waitForFunction(p => (window.app.workspace.getActiveFile() || {}).path === p, 'Daily/' + today + '.md');
  await page.keyboard.press(mod + '+P');
  await page.waitForFunction(() => document.activeElement && document.activeElement.classList.contains('prompt-input'));
  r = await results();
  assert.strictEqual(r[1].title, "Daily notes: Open today's daily note", 'recently used after pinned: ' + r.slice(0, 3).map(x => x.title));
  await page.keyboard.press('Escape');
  assert.ok(!(await page.$('.modal-container')), 'Escape closes');
};
