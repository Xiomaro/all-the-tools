/* The Bases formula language and query engine: operators, functions on
   each kind of value, file functions, formulas, `this`, filters, sorting,
   grouping and summaries, against the fixture vault. */
module.exports = async ({ page, assert }) => {
  const r = await page.evaluate(async () => {
    const { parse, evaluate } = await import('/vault/js/bases/expr.js');
    const { Row, BaseContext, runView, normalizeConfig, summarize } = await import('/vault/js/bases/query.js');
    const { toText } = await import('/vault/js/bases/values.js');
    const a = window.app;
    const config = normalizeConfig({ formulas: { twice: 'rating * 2', label: 'file.basename + " (" + formula.twice + ")"', loop: 'formula.loop + 1' } });
    const welcome = a.vault.getFileByPath('Welcome.md');
    const alpha = a.vault.getFileByPath('Projects/Project Alpha.md');
    const ctx = new BaseContext(a, config, { sourcePath: 'Welcome.md', thisFile: alpha });
    const row = new Row(ctx, welcome);
    const ev = src => { try { return toText(evaluate(parse(src), ctx.scope(row))); } catch (e) { return 'ERR: ' + e.message; } };
    const cases = {
      arith: '1 + 2 * 3 - 4 / 2',
      mod: '7 % 3',
      concat: '"a" + 1 + true',
      cmp: '2 >= 2 && 3 > 2 && !(1 == 2) && "b" > "a"',
      ternary: 'rating > 3 ? "high" : "low"',
      ifFn: 'if(done, "yes", "no")',
      prop: 'rating',
      noteIndex: 'note["rating"] + note.rating',
      missing: 'nothing',
      missingMethod: 'nothing.contains("x")',
      date: 'created',
      dateField: 'created.year + "-" + created.month + "-" + created.day',
      dateAdd: '(created + "1M").format("YYYY-MM-DD")',
      dateAddDays: '(date("2026-01-31") + "2d").format("YYYY-MM-DD")',
      dateSub: '(date("2026-01-03") - date("2026-01-01")) / 86400000',
      durationDays: '(date("2026-01-10") - date("2026-01-01")).days',
      dateCmp: 'created < date("2026-02-01") && created == "2026-01-15"',
      dateOnly: 'date("2026-01-15T10:30").date() == created',
      relative: 'date("2020-01-01").relative()',
      today: 'today() - "1d" < today()',
      strFns: '"Hello World".lower().replace("world", "there").title() + "|" + "a,b,c".split(",").length + "|" + " x ".trim() + "|" + "abc".slice(1) + "|" + "ab".repeat(2) + "|" + "abc".reverse()',
      strTests: '"hello".startsWith("he") && "hello".endsWith("lo") && "hello".contains("ell") && "hello".containsAll("h", "o") && "hello".containsAny("z", "e")',
      num: '(3.14159).toFixed(2) + "|" + (2.5).round() + "|" + (3.14159).round(2) + "|" + (-4).abs() + "|" + (2.1).ceil() + "|" + (2.9).floor()',
      list: '[3, 1, 2].sort().join("-") + "|" + [1, 2, 2].unique().length + "|" + [1, [2, 3]].flat().length + "|" + [1, 2, 3].reverse()[0] + "|" + [1, 2, 3].slice(1).length',
      lambda: '[1, 2, 3, 4].filter(value > 2).map(value * 10).join(",") + "|" + [1, 2, 3].reduce(acc + value, 0)',
      listStats: '[1, 2, 3, 4].mean() + "|" + [1, 2, 3, 4].median() + "|" + [1, 2, 3].sum() + "|" + max(1, 5, 3) + "|" + min(4, 2)',
      tags: 'tags.contains("start") && tags.length == 2',
      aliases: 'aliases.join(" / ")',
      link: 'related',
      linkEq: 'related == link("Projects/Project Alpha") && related.asFile().name == "Project Alpha.md"',
      fileFields: 'file.name + "|" + file.basename + "|" + file.path + "|" + file.folder + "|" + file.ext',
      fileTags: 'file.tags.join(",")',
      hasTag: 'file.hasTag("start") && file.hasTag("nested") && !file.hasTag("nest") && file.hasTag("missing", "guide")',
      inFolder: 'file.inFolder("") && !file.inFolder("Projects")',
      hasLink: 'file.hasLink("Ideas") && file.hasLink(link("Projects/Project Alpha")) && !file.hasLink("Daily/2026-09-28")',
      hasProperty: 'file.hasProperty("rating") && !file.hasProperty("status")',
      links: 'file.links.length > 3',
      backlinks: 'file.backlinks.length >= 2',
      mtime: 'file.mtime > date("2000-01-01") && file.size > 10',
      formula: 'formula.twice + "|" + formula.label',
      loop: 'formula.loop',
      thisFile: 'this.file.name + "|" + this.status',
      linksToThis: 'file.hasLink(this.file)',
      isType: 'rating.isType("number") && "x".isType("string") && tags.isType("list") && created.isType("date")',
      isEmpty: '"".isEmpty() && [].isEmpty() && !"x".isEmpty() && nothing.isEmpty()',
      regex: '/^Wel/.matches(file.name) && file.name.matches(/come/)',
      numberFn: 'number("12") + number(true)',
      objectFns: 'file.properties.keys().length',
      image: 'image("pixel.png")',
      unknownFn: 'foo(1)',
      badSyntax: 'rating >',
      durationFn: 'duration("1h") / 1000',
      escapeHTML: 'escapeHTML("<b>")',
      listFn: 'list("x").length + list(["a", "b"]).length'
    };
    const out = {};
    for (const k in cases) out[k] = ev(cases[k]);

    /* A whole view: the fixture base's filters and sort. */
    const baseText = await a.vault.adapter.read('Projects.base');
    const yaml = (await import('/vault/js/core/yaml.js')).default;
    const cfg = normalizeConfig(yaml.load(baseText));
    const res = runView(a, cfg, 0, { sourcePath: 'Projects.base' });
    out.viewRows = res.rows.map(r => r.file.basename).join(',');
    out.viewCols = res.columns.join(',');
    out.overdue = res.rows.map(r => toText(r.safeGet('formula.overdue'))).join(',');

    const cfg2 = normalizeConfig({ views: [{ type: 'table', filters: { or: ['file.hasTag("project")', 'rating > 3'] }, sort: [{ property: 'file.name', direction: 'DESC' }], groupBy: { property: 'status', direction: 'ASC' } }] });
    const res2 = runView(a, cfg2, 0, {});
    out.groups = res2.groups.map(g => toText(g.value) + ':' + g.rows.map(r => r.file.basename).join('+')).join(' ');
    const cfg3 = normalizeConfig({ filters: { not: ['file.ext == "md"'] }, views: [{ type: 'table', limit: 2 }] });
    const res3 = runView(a, cfg3, 0, {});
    out.notMd = res3.rows.length + '/' + res3.total;
    out.summary = [summarize(res2.ctx, 'Filled', 'status', res2.rows), summarize(res2.ctx, 'Unique', 'status', res2.rows)].join(',');
    const cfg4 = normalizeConfig({ summaries: { half: 'values.length / 2' }, views: [{}] });
    out.customSummary = String(summarize(new BaseContext(a, cfg4), 'half', 'file.name', res2.rows));
    out.errorFilter = runView(a, normalizeConfig({ filters: 'nonsense(', views: [{}] }), 0, {}).errors.length;
    return out;
  });
  const expect = {
    arith: '5', mod: '1', concat: 'a1true', cmp: 'true', ternary: 'high', ifFn: 'no', prop: '4', noteIndex: '8',
    missing: '', missingMethod: 'false', date: '2026-01-15', dateField: '2026-1-15', dateAdd: '2026-02-15', dateAddDays: '2026-02-02',
    dateSub: '2', durationDays: '9', dateCmp: 'true', dateOnly: 'true', today: 'true',
    strFns: 'Hello There|3|x|bc|abab|cba', strTests: 'true', num: '3.14|3|3.14|4|3|2',
    list: '1-2-3|2|3|3|2', lambda: '30,40|6', listStats: '2.5|2.5|6|5|2', tags: 'true', aliases: 'Home / Start here',
    link: 'Projects/Project Alpha', linkEq: 'true', fileFields: 'Welcome.md|Welcome|Welcome.md|/|md',
    hasTag: 'true', inFolder: 'true', hasLink: 'true', hasProperty: 'true', links: 'true', backlinks: 'true', mtime: 'true',
    formula: '8|Welcome (8)', thisFile: 'Project Alpha.md|active', linksToThis: 'true', isType: 'true', isEmpty: 'true', regex: 'true',
    numberFn: '13', objectFns: '6', image: 'pixel.png', durationFn: '3600', escapeHTML: '&lt;b&gt;', listFn: '3',
    viewRows: 'Project Alpha,Project Beta', viewCols: 'file.name,status,due', groups: 'active:Project Alpha paused:Project Beta :Welcome',
    notMd: '2/4', summary: '2,2', customSummary: '1.5', errorFilter: 1
  };
  for (const k of Object.keys(expect)) assert.strictEqual(r[k], expect[k], k + ': got ' + JSON.stringify(r[k]));
  assert.ok(/^ERR: .*itself/.test(r.loop), 'formula loop: ' + r.loop);
  assert.ok(/^ERR: Unknown function/.test(r.unknownFn), r.unknownFn);
  assert.ok(/^ERR: /.test(r.badSyntax), r.badSyntax);
  assert.ok(/ago/.test(r.relative), r.relative);
  assert.ok(r.fileTags.includes('#start') && r.fileTags.includes('#nested/tag'), r.fileTags);
  assert.ok(/^(true|false),(true|false)$/.test(r.overdue), 'overdue formula: ' + r.overdue);
};
