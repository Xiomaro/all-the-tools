/* Settings → General: vault details, export as zip, importing a zip into a
   browser vault, the browser notes; and the theme commands. */
module.exports = async ({ page, assert }) => {
  const wait = ms => page.waitForTimeout(ms);
  const row = name => page.locator('.vertical-tab-content .setting-item', { has: page.locator('.setting-item-name', { hasText: new RegExp('^' + name + '$') }) }).first();

  await page.evaluate(() => app.setting.open());
  await page.waitForSelector('.mod-settings .vertical-tab-content .setting-item');
  const text = await page.locator('.vertical-tab-content').textContent();
  assert.ok(text.includes('check-settings-general') && text.includes('browser vault'), 'names the vault and its kind');
  assert.ok(text.includes('Community plugins, Obsidian Sync and Obsidian Publish'), 'lists what the browser can’t do');
  await page.waitForFunction(() => /used by this site/.test(document.querySelector('.vertical-tab-content').textContent), null, { timeout: 5000 });

  /* Export downloads the whole vault as a zip. */
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), row('Export vault as zip').locator('button').click()]);
  assert.strictEqual(download.suggestedFilename(), 'check-settings-general.zip');

  /* Import a zip: its files land in the vault and are indexed. */
  const zip = await page.evaluate(async () => {
    const zip = new window.JSZip();
    zip.file('Imported/From zip.md', '# From a zip\n\n[[Welcome]]\n');
    zip.file('Welcome.md', 'replaced');
    const b64 = await zip.generateAsync({ type: 'base64' });
    return b64;
  });
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), row('Import files').locator('button', { hasText: 'Import zip' }).click()]);
  await chooser.setFiles({ name: 'notes.zip', mimeType: 'application/zip', buffer: Buffer.from(zip, 'base64') });
  /* Welcome.md exists, so it asks first; cancel keeps everything as it was. */
  await page.waitForSelector('.modal-container .modal-button-container button.mod-cta');
  assert.ok((await page.locator('.modal-container:last-child').textContent()).includes('1 of the 2 files already exist'));
  await page.locator('.modal-container:last-child .modal-button-container button', { hasText: 'Cancel' }).click();
  await wait(200);
  assert.strictEqual(await page.evaluate(() => !!app.vault.getFileByPath('Imported/From zip.md')), false, 'cancelled');
  const [chooser2] = await Promise.all([page.waitForEvent('filechooser'), row('Import files').locator('button', { hasText: 'Import zip' }).click()]);
  await chooser2.setFiles({ name: 'notes.zip', mimeType: 'application/zip', buffer: Buffer.from(zip, 'base64') });
  await page.locator('.modal-container:last-child .modal-button-container button.mod-cta').click();
  await page.waitForFunction(() => !!app.vault.getFileByPath('Imported/From zip.md'), null, { timeout: 10000 });
  assert.strictEqual(await page.evaluate(() => app.vault.adapter.read('Welcome.md')), 'replaced');

  /* Theme commands. */
  await page.evaluate(() => app.setting.close());
  await page.evaluate(() => app.commands.execute('theme:use-light'));
  await wait(100);
  assert.ok(await page.evaluate(() => document.body.classList.contains('theme-light')));
  await page.evaluate(() => app.commands.execute('theme:use-dark'));
  await wait(100);
  assert.ok(await page.evaluate(() => document.body.classList.contains('theme-dark')));
  await page.evaluate(() => app.commands.execute('theme:switch'));
  assert.strictEqual(await page.evaluate(() => app.setting.activeTab && app.setting.activeTab.id), 'appearance', '“Change theme” opens Appearance');
  await page.evaluate(() => app.setting.close());

  /* Obsidian's tab ids and a few aliases all resolve. */
  for (const [id, want] of [['file', 'file'], ['files', 'file'], ['core-plugins', 'plugins'], ['general', 'about'], ['community-plugins', 'community-plugins']]) {
    await page.evaluate(id => app.setting.openTabById(id), id);
    assert.strictEqual(await page.evaluate(() => app.setting.activeTab.id), want, id);
  }
  await page.evaluate(() => app.setting.close());
  assert.strictEqual(await page.evaluate(() => app.setting.isOpen), false);
};
