/* Daily notes, templates, unique notes, random note, note composer and the
   format converter. */
module.exports = async ({ page, assert }) => {
  const r = await page.evaluate(async () => {
    const a = window.app;
    const out = {};
    const tpl = await import('/vault/js/plugins/lib/template.js');
    const m = window.moment;

    /* Template variables. */
    const d = m('2026-03-04 09:05', 'YYYY-MM-DD HH:mm');
    out.filled = tpl.fillTemplate('{{title}}|{{date}}|{{time}}|{{date:dddd D MMMM}}|{{time:HH}}|{{date+1d:DD}}|{{yesterday}}|{{ DATE }}|{{other}}',
      { title: 'Note', date: d, dateFormat: 'YYYY/MM/DD', timeFormat: 'h:mm A' });

    /* Properties merged into a note's: new keys added, lists combined, values kept. */
    out.merged = tpl.insertIntoText('---\ntags: [a]\nstatus: draft\n---\nBody\n', '---\ntags: [b, a]\nstatus: done\ntype: meeting\n---\n## Agenda\n', '---\ntags: [a]\nstatus: draft\n---\nBody\n'.length);
    out.noFm = tpl.insertIntoText('Hello\n', '---\ntype: x\n---\nT', 6);
    out.unchanged = tpl.mergeProperties('---\nx: 1\n---\n', { x: 2 });

    /* Daily notes: today's note from the template in Daily/. */
    await a.commands.execute('daily-notes');
    await new Promise(r => setTimeout(r, 300));
    const today = m().format('YYYY-MM-DD');
    const f = a.vault.getFileByPath('Daily/' + today + '.md');
    out.daily = f ? await a.vault.read(f) : null;
    out.dailyOpen = (a.workspace.getActiveFile() || {}).path;
    out.todayTitle = m().format('dddd D MMMM YYYY');
    /* Previous from today is the fixture's 2026-09-28 (or the newest before today). */
    await a.commands.execute('daily-notes:goto-prev');
    await new Promise(r => setTimeout(r, 200));
    out.prev = (a.workspace.getActiveFile() || {}).path;
    await a.commands.execute('daily-notes:goto-next');
    await new Promise(r => setTimeout(r, 200));
    out.next = (a.workspace.getActiveFile() || {}).path;

    const dn = await import('/vault/js/plugins/daily-notes.js');
    out.nested = dn.dailyNotePath({ folder: 'Journal/', format: 'YYYY/MM/YYYY-MM-DD' }, m('2026-01-02', 'YYYY-MM-DD'));
    out.parsed = !!dn.dailyNoteDate({ folder: 'Daily', format: 'YYYY-MM-DD' }, a.vault.getFileByPath('Daily/2026-09-28.md'));
    out.notDaily = dn.dailyNoteDate({ folder: 'Daily', format: 'YYYY-MM-DD' }, a.vault.getFileByPath('Ideas.md'));

    /* Unique note creator. */
    const beforeCount = a.vault.getMarkdownFiles().length;
    await a.commands.execute('zk-prefixer');
    await new Promise(r => setTimeout(r, 300));
    out.zk = (a.workspace.getActiveFile() || {}).basename;
    out.zkCount = a.vault.getMarkdownFiles().length - beforeCount;

    /* Random note never picks the open note. */
    await a.workspace.openFile(a.vault.getFileByPath('Ideas.md'));
    let same = 0;
    for (let i = 0; i < 8; i++) {
      const cur = a.workspace.getActiveFile();
      a.commands.execute('random-note');
      await new Promise(r => setTimeout(r, 60));
      if (a.workspace.getActiveFile() === cur) same++;
    }
    out.randomSame = same;

    /* Note composer: merge Project Beta into Ideas; links follow. */
    const nc = await import('/vault/js/plugins/note-composer.js');
    await nc.mergeFiles(a, a.vault.getFileByPath('Projects/Project Beta.md'), a.vault.getFileByPath('Ideas.md'), false);
    await new Promise(r => setTimeout(r, 300));
    out.betaGone = !a.vault.getFileByPath('Projects/Project Beta.md');
    out.ideas = await a.vault.read(a.vault.getFileByPath('Ideas.md'));
    out.alpha = await a.vault.read(a.vault.getFileByPath('Projects/Project Alpha.md'));

    /* Format converter. */
    const fc = await import('/vault/js/plugins/markdown-importer.js');
    await a.vault.create('Zettel/202401011200 First idea.md', 'x');
    const all = Object.fromEntries(fc.CONVERSIONS.map(c => [c.id, true]));
    out.converted = fc.convertText(a, [
      '- {{[[TODO]]}} buy milk', '{{[[DONE]]}} done', 'A ^^roam^^ and ::bear:: highlight, key:: value', '#multi word tag# and #single',
      'See [[202401011200]] &amp; &nbsp;x &lt;b&gt;', '`^^code^^`', '```', '^^fenced^^', '```'].join('\n'), all);

    /* Word counting. */
    const t = await import('/vault/js/plugins/lib/text.js');
    out.words = [t.countWords('Hello, world! It’s a well-known fact.'), t.countWords('日本語のテキスト'), t.countWords('한국어 문장 입니다'), t.countWords('mixed 中文 words'), t.countWords('')];
    out.chars = t.countCharacters('héllo 😀');
    out.countable = t.countableText('---\na: 1\n---\nbody');
    out.diff = t.diffLines('a\nb\nc', 'a\nc\nd').map(x => x.type[0] + x.text).join(',');

    /* Slash command trigger. */
    const sc = await import('/vault/js/plugins/slash-command.js');
    out.slash = [sc.slashTrigger('/tem', 4), sc.slashTrigger('text /bo', 8), sc.slashTrigger('a/b', 3), sc.slashTrigger('http://x', 8)];
    return out;
  });

  assert.strictEqual(r.filled, 'Note|2026/03/04|9:05 AM|Wednesday 4 March|09|05|2026/03/03|2026/03/04|{{other}}');
  assert.strictEqual(r.merged, '---\ntags:\n  - a\n  - b\nstatus: draft\ntype: meeting\n---\nBody\n## Agenda\n', 'merged: ' + JSON.stringify(r.merged));
  assert.strictEqual(r.noFm, '---\ntype: x\n---\nHello\nT');
  assert.strictEqual(r.unchanged, null, 'existing values are kept, and unchanged YAML is left alone');

  assert.ok(r.daily && r.daily.startsWith('# ' + r.todayTitle + '\n'), 'daily note from the template: ' + JSON.stringify(r.daily));
  assert.ok(/Created \d\d:\d\d for \d{4}-\d\d-\d\d\./.test(r.daily), 'time and title filled: ' + r.daily);
  assert.ok(/^Daily\/\d{4}-\d\d-\d\d\.md$/.test(r.dailyOpen), 'daily note opened');
  assert.strictEqual(r.prev, 'Daily/2026-09-28.md');
  assert.strictEqual(r.next, r.dailyOpen);
  assert.strictEqual(r.nested, 'Journal/2026/01/2026-01-02.md');
  assert.ok(r.parsed && r.notDaily === null);

  assert.ok(/^\d{12}$/.test(r.zk) && r.zkCount === 1, 'unique note: ' + r.zk);
  assert.strictEqual(r.randomSame, 0, 'random note opens a different note');

  assert.ok(r.betaGone, 'merged note deleted');
  assert.ok(r.ideas.includes('# Project Beta') || r.ideas.length > 199, 'content appended: ' + r.ideas);
  assert.ok(r.alpha.includes('[[Ideas]]') && !r.alpha.includes('Project Beta]]'), 'links to the merged note point at the target: ' + r.alpha);

  const conv = r.converted.split('\n');
  assert.strictEqual(conv[0], '- [ ] buy milk');
  assert.strictEqual(conv[1], '- [x] done');
  assert.strictEqual(conv[2], 'A ==roam== and ==bear== highlight, key:: value');
  assert.strictEqual(conv[3], '#multi-word-tag and #single');
  assert.strictEqual(conv[4], 'See [[202401011200 First idea]] & \u00a0x &lt;b&gt;');
  assert.strictEqual(conv[5], '`^^code^^`');
  assert.strictEqual(conv[7], '^^fenced^^');

  assert.deepStrictEqual(r.words, [6, 8, 3, 4, 0]);
  assert.strictEqual(r.chars, 7);
  assert.strictEqual(r.countable, 'body');
  assert.strictEqual(r.diff, 'sa,db,sc,ad');
  assert.deepStrictEqual(r.slash[0], { startCh: 0, query: 'tem' });
  assert.deepStrictEqual(r.slash[1], { startCh: 5, query: 'bo' });
  assert.strictEqual(r.slash[2], null);
  assert.strictEqual(r.slash[3], null);
};
