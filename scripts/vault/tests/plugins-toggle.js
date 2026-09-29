/* Each everyday core plugin turns off and on cleanly: its commands, ribbon
   icons and status bar items go and come back. */
module.exports = async ({ page, assert }) => {
  const ids = ['switcher', 'command-palette', 'daily-notes', 'templates', 'note-composer', 'zk-prefixer', 'random-note',
    'word-count', 'editor-status', 'file-recovery', 'audio-recorder', 'workspaces', 'slash-command', 'markdown-importer',
    'webviewer', 'publish', 'sync'];
  const r = await page.evaluate(async ids => {
    const a = window.app;
    const count = () => ({
      commands: a.commands.list().length,
      ribbon: document.querySelectorAll('.side-dock-ribbon-action').length,
      status: document.querySelectorAll('.status-bar-item').length,
      suggests: a.editorSuggests.length
    });
    const out = {};
    for (const id of ids) {
      const was = a.plugins.isEnabled(id);
      if (!was) await a.plugins.enable(id);
      const on = count();
      await a.plugins.disable(id);
      const off = count();
      await a.plugins.enable(id);
      const again = count();
      if (!was) await a.plugins.disable(id);
      out[id] = { on, off, again, commandsWhileOn: on.commands - off.commands };
    }
    return out;
  }, ids);
  for (const id of ids) {
    const x = r[id];
    assert.deepStrictEqual(x.on, x.again, id + ' comes back the same');
    assert.ok(x.on.commands >= x.off.commands && x.on.ribbon >= x.off.ribbon && x.on.status >= x.off.status, id + ' removes what it added');
  }
  for (const id of ['switcher', 'command-palette', 'daily-notes', 'templates', 'note-composer', 'zk-prefixer', 'random-note', 'file-recovery', 'audio-recorder', 'workspaces', 'markdown-importer', 'webviewer', 'publish', 'sync']) {
    assert.ok(r[id].commandsWhileOn >= 1, id + ' adds commands');
  }
  assert.strictEqual(r['slash-command'].on.suggests - r['slash-command'].off.suggests, 1, 'slash commands register an editor suggest');
  assert.strictEqual(r['word-count'].on.status - r['word-count'].off.status, 1);
};
