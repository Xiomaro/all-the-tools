/* Audio recorder, with the microphone replaced by a generated tone: the
   recording lands in the attachment folder and is embedded in the note. */
module.exports = async ({ page, assert }) => {
  const r = await page.evaluate(async () => {
    const a = window.app;
    const ctx = new AudioContext();
    navigator.mediaDevices.getUserMedia = async () => {
      const osc = ctx.createOscillator();
      const dest = ctx.createMediaStreamDestination();
      osc.connect(dest); osc.start();
      return dest.stream;
    };
    await a.workspace.openFile(a.vault.getFileByPath('Ideas.md'));
    const out = {};
    out.stopBefore = a.commands.isAvailable(a.commands.find('audio-recorder:stop'));
    a.commands.execute('audio-recorder:start');
    await new Promise(r => setTimeout(r, 900));
    out.recording = document.querySelector('.side-dock-ribbon-action.is-recording') !== null;
    out.status = (document.querySelector('.status-bar-item.plugin-audio-recorder') || {}).textContent;
    out.startDuring = a.commands.isAvailable(a.commands.find('audio-recorder:start'));
    a.commands.execute('audio-recorder:stop');
    await new Promise(r => setTimeout(r, 800));
    const rec = a.vault.getFiles().find(f => /^Recording \d{14}\.(webm|ogg|m4a)$/.test(f.name));
    out.path = rec && rec.path;
    out.size = rec && rec.stat.size;
    out.note = await a.vault.read(a.vault.getFileByPath('Ideas.md'));
    ctx.close();
    return out;
  });
  assert.strictEqual(r.stopBefore, false);
  assert.ok(r.recording && /Recording 0:0\d/.test(r.status), 'recording shown: ' + r.status);
  assert.strictEqual(r.startDuring, false);
  assert.ok(r.path && r.path.startsWith('Attachments/'), 'saved in the attachment folder: ' + r.path);
  assert.ok(r.size > 0);
  /* At the cursor when the note is open in the editor, as Obsidian does. */
  assert.ok(r.note.includes('![[' + r.path.split('/').pop() + ']]'), 'embedded: ' + r.note.slice(0, 120));
};
