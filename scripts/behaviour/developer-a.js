/* Behaviour checks for the developer-a group. */
'use strict';

const TA = n => `#view textarea >> nth=${n}`;
const ok = (cond, detail) => ({ ok: !!cond, detail: String(detail).slice(0, 200) });

async function fill(page, n, text) { await page.fill(TA(n), text); }
async function val(page, n) { return page.inputValue(TA(n)); }
async function click(page, label) { await page.click(`#view button:text-is("${label}")`); }
async function waitVal(page, n, pred, ms = 8000) {
  const end = Date.now() + ms;
  let v = '';
  while (Date.now() < end) {
    v = await val(page, n);
    if (pred(v)) return v;
    await page.waitForTimeout(100);
  }
  return v;
}
async function waitText(page, sel, pred, ms = 8000) {
  const end = Date.now() + ms;
  let v = '';
  while (Date.now() < end) {
    v = (await page.textContent(sel)) || '';
    if (pred(v)) return v;
    await page.waitForTimeout(100);
  }
  return v;
}

module.exports = [
  {
    name: 'json-formatter formats with 4-space indent and reports errors', tool: 'json-formatter',
    run: async page => {
      await fill(page, 0, '{"a":[1,2],"b":{"c":null}}');
      await click(page, '4');
      await click(page, 'Format');
      const v = await val(page, 1);
      await fill(page, 0, '{"a":1,}');
      await click(page, 'Validate');
      const err = await page.textContent('#view .note.err');
      await fill(page, 0, '{ "x" : [ 1 , 2 ] }');
      await click(page, 'Minify');
      const m = await val(page, 1);
      return ok(v === '{\n    "a": [\n        1,\n        2\n    ],\n    "b": {\n        "c": null\n    }\n}' && /line 1/.test(err) && m === '{"x":[1,2]}', v + ' | ' + err + ' | ' + m);
    }
  },
  {
    name: 'json-to-code generates types for every language', tool: 'json-to-code',
    run: async page => {
      await click(page, 'Load sample');
      await page.waitForTimeout(300);
      const out = {};
      for (const l of ['TypeScript', 'Go', 'Python', 'Java', 'C#', 'Rust']) {
        await click(page, l);
        await page.waitForTimeout(80);
        out[l] = await page.textContent('#view .out');
      }
      const good = /export interface Root \{[\s\S]*projects: Project\[\];[\s\S]*published\?: boolean;/.test(out.TypeScript) &&
        /ID\s+int\s+`json:"id"`/.test(out.Go) && /Published\s+bool\s+`json:"published,omitempty"`/.test(out.Go) &&
        /class Project:[\s\S]*published: Optional\[bool\] = None/.test(out.Python) &&
        /private List<Project> projects;/.test(out.Java) && /private Boolean published;/.test(out.Java) &&
        /public bool\? Published \{ get; set; \}/.test(out['C#']) &&
        /pub score: f64,/.test(out.Rust) && /pub published: Option<bool>,/.test(out.Rust);
      return ok(good, JSON.stringify(out).slice(0, 200));
    }
  },
  {
    name: 'json-to-code handles root arrays, renamed keys and bad JSON', tool: 'json-to-code',
    run: async page => {
      await fill(page, 0, '[{"user-name":"a","n":1},{"user-name":"b","n":2.5,"x":true}]');
      await page.waitForTimeout(300);
      await click(page, 'Rust');
      await page.waitForTimeout(100);
      const rust = await page.textContent('#view .out');
      await fill(page, 0, '{bad');
      await page.waitForTimeout(300);
      const err = await page.textContent('#view .note.err');
      return ok(/#\[serde\(rename = "user-name"\)\]\s+pub user_name: String/.test(rust) && /pub n: f64/.test(rust) && /Option<bool>/.test(rust) && /Invalid JSON/.test(err), rust + ' | ' + err);
    }
  },
  {
    name: 'json-to-csv converts the sample and flattens nested objects', tool: 'json-to-csv',
    run: async page => {
      const first = await waitVal(page, 1, v => v.length > 0);
      await fill(page, 0, '[{"a":{"b":1},"c":"x, y"}]');
      await page.selectOption('#view select', ';');
      const v = await waitVal(page, 1, s => s.startsWith('a.b'));
      return ok(first === 'name,age,city\nAlice,30,New York\nBob,25,London' && v === 'a.b;c\n1;x, y', first + ' | ' + v);
    }
  },
  {
    name: 'csv-to-json converts with types and quoted fields', tool: 'csv-to-json',
    run: async page => {
      await fill(page, 0, 'name,age,note\n"Smith, J",42,"say ""hi"""');
      await click(page, 'Convert to JSON');
      const v = JSON.parse(await val(page, 1));
      return ok(v.length === 1 && v[0].name === 'Smith, J' && v[0].age === 42 && v[0].note === 'say "hi"', JSON.stringify(v));
    }
  },
  {
    name: 'xml-formatter indents the sample and flags invalid XML', tool: 'xml-formatter',
    run: async page => {
      await click(page, 'Format');
      const v = await val(page, 1);
      await fill(page, 0, '<a><b></a>');
      await click(page, 'Format');
      const err = await page.textContent('#view .note.err');
      await fill(page, 0, '<a>\n  <b> x </b>\n</a>');
      await click(page, 'Minify');
      const m = await val(page, 1);
      return ok(v.includes('\n  <users>\n    <user id="1">\n      <name>Alice</name>') && /Invalid XML/.test(err) && m === '<a><b>x</b></a>', v.slice(0, 120) + ' | ' + err + ' | ' + m);
    }
  },
  {
    name: 'html-formatter beautifies with the chosen indent and minifies', tool: 'html-formatter',
    run: async page => {
      await page.fill('#view input[type=number]', '4');
      await fill(page, 0, '<div><p>Hi</p><ul><li>a</li><li>b</li></ul></div>');
      const v = await waitVal(page, 1, s => s.includes('<li>'), 15000);
      await click(page, 'Minified');
      const m = await waitVal(page, 1, s => !s.includes('\n'));
      return ok(v.includes('\n    <p>Hi</p>') && v.includes('\n        <li>a</li>') && m === '<div><p>Hi</p><ul><li>a</li><li>b</li></ul></div>', v + ' | ' + m);
    }
  },
  {
    name: 'css-formatter formats and minifies CSS', tool: 'css-formatter',
    run: async page => {
      await fill(page, 0, 'a{color:#FFFFFF;margin:0 auto}/* c */b{padding:1px}');
      const v = await waitVal(page, 1, s => s.includes('{'), 15000);
      await click(page, 'Minified');
      const m = await waitVal(page, 1, s => !s.includes('\n') && s.length > 0);
      return ok(v.includes('a {\n  color: #ffffff;\n  margin: 0 auto;\n}') && m === 'a{color:#fff;margin:0 auto}b{padding:1px}', v + ' | ' + m);
    }
  },
  {
    name: 'js-formatter formats the sample and minifies', tool: 'js-formatter',
    run: async page => {
      const v = await waitVal(page, 1, s => s.includes('const msg'), 15000);
      await click(page, 'Minified');
      const m = await waitVal(page, 1, s => s.startsWith('function greet(name){'), 15000);
      return ok(v === 'function greet(name) {\n  const msg = "Hello, " + name + "!";\n  console.log(msg);\n  return msg;\n}\n' &&
        m === 'function greet(name){const msg="Hello, "+name+"!";console.log(msg);return msg}', JSON.stringify(v) + ' | ' + m);
    }
  },
  {
    name: 'sql-formatter lays out clauses on separate lines', tool: 'sql-formatter',
    run: async page => {
      await fill(page, 0, 'select a, b from t where x = 1 order by a');
      const v = await waitVal(page, 1, s => s.includes('FROM\n  t'));
      return ok(v === 'SELECT\n  a,\n  b\nFROM\n  t\nWHERE\n  x = 1\nORDER BY\n  a', v);
    }
  },
  {
    name: 'base64-encode encodes UTF-8 text', tool: 'base64-encode',
    run: async page => {
      await fill(page, 0, 'Hello, World! ✓');
      const v = await waitVal(page, 1, s => s.length > 0);
      return ok(v === 'SGVsbG8sIFdvcmxkISDinJM=', v);
    }
  },
  {
    name: 'base64-encode encodes an uploaded file', tool: 'base64-encode',
    run: async page => {
      await page.setInputFiles('#view input[type=file]', { name: 'a.bin', mimeType: 'application/octet-stream', buffer: Buffer.from([0, 1, 2, 250, 255]) });
      const v = await waitVal(page, 2, s => s.length > 0);
      return ok(v === 'AAEC+v8=', v);
    }
  },
  {
    name: 'url-encode percent-encodes a component', tool: 'url-encode',
    run: async page => {
      await fill(page, 0, 'a b&c=d/é');
      const v = await waitVal(page, 1, s => s.length > 0);
      return ok(v === 'a%20b%26c%3Dd%2F%C3%A9', v);
    }
  },
  {
    name: 'regex-tester finds the two default matches', tool: 'regex-tester',
    run: async page => {
      await page.waitForTimeout(200);
      const t = await page.textContent('#view .mlist');
      const s = await page.textContent('#view .kv');
      return ok(/Hello.*at 0/.test(t) && /World.*at 6/.test(t) && /2Total Matches/.test(s) && /ValidRegex Status/.test(s), t + ' | ' + s);
    }
  },
  {
    name: 'regex-tester shows groups, flags and invalid patterns', tool: 'regex-tester',
    run: async page => {
      await page.fill('#view .regex-row input >> nth=0', '(\\d+)-(?<b>\\d+)');
      await page.fill('#view .regex-row input >> nth=1', 'g');
      await fill(page, 0, 'x 12-34 y 5-6');
      await page.waitForTimeout(300);
      const t = await page.textContent('#view .mlist');
      await page.fill('#view .regex-row input >> nth=0', '(');
      await page.waitForTimeout(300);
      const s = await page.textContent('#view .kv');
      return ok(/12-34.*\$1: "12".*b: "34".*at 2/.test(t) && /5-6/.test(t) && /Invalid/.test(s), t + ' | ' + s);
    }
  },
  {
    name: 'jwt-decoder decodes the sample and verifies its HS256 signature', tool: 'jwt-decoder',
    run: async page => {
      await page.waitForTimeout(200);
      const outs = await page.$$eval('#view .out', ns => ns.map(n => n.textContent));
      await page.fill('#view textarea >> nth=1', 'your-256-bit-secret');
      await click(page, 'Verify');
      const good = await waitText(page, '#view section:last-child .note', s => /verified|Invalid/.test(s));
      await page.fill('#view textarea >> nth=1', 'wrong');
      await click(page, 'Verify');
      const bad = await waitText(page, '#view section:last-child .note', s => /Invalid/.test(s));
      const alg = await page.textContent('#view h3 .meta');
      return ok(JSON.parse(outs[0]).alg === 'HS256' && JSON.parse(outs[1]).name === 'John Doe' && alg === 'Algorithm: HS256' && /verified/.test(good) && /Invalid signature/.test(bad),
        outs.join(' ') + ' | ' + good + ' | ' + bad);
    }
  },
  {
    name: 'yaml-to-json converts both ways', tool: 'yaml-to-json',
    run: async page => {
      const v = await waitVal(page, 1, s => s.length > 0);
      await fill(page, 0, 'list:\n  - 1\n  - two\nnested:\n  a: null');
      const w = await waitVal(page, 1, s => s.includes('nested'));
      await click(page, 'JSON → YAML');
      await fill(page, 0, '{"k":[1,{"a":"b"}]}');
      const y = await waitVal(page, 1, s => s.startsWith('k:'));
      return ok(v === '{\n  "name": "John",\n  "age": 30,\n  "city": "New York",\n  "active": true\n}' &&
        JSON.stringify(JSON.parse(w)) === '{"list":[1,"two"],"nested":{"a":null}}' && y === 'k:\n  - 1\n  - a: b', v + ' | ' + w + ' | ' + y);
    }
  },
  {
    name: 'css-unit-converter converts 24px against the defaults', tool: 'css-unit-converter',
    run: async page => {
      await page.waitForTimeout(200);
      const rows = await page.$$eval('#view table tbody tr', trs => trs.map(t => t.children[0].textContent + '=' + t.children[1].textContent));
      const want = ['px=24', 'em=1.5', 'rem=1.5', 'vw=1.6667', 'vh=2.6667', 'pt=18', 'pc=1.5', 'cm=0.635', 'mm=6.35', 'in=0.25', '%=150'];
      await page.fill('#view input[type=number] >> nth=4', '2');
      await page.selectOption('#view select', 'rem');
      await page.waitForTimeout(300);
      const r2 = await page.$$eval('#view table tbody tr', trs => trs.map(t => t.children[0].textContent + '=' + t.children[1].textContent));
      return ok(JSON.stringify(rows) === JSON.stringify(want) && r2[0] === 'px=32' && r2[5] === 'pt=24', rows.join(' ') + ' | ' + r2.join(' '));
    }
  },
  {
    name: 'diff-checker counts the sample changes', tool: 'diff-checker',
    run: async page => {
      await page.waitForTimeout(250);
      const s = await page.textContent('#view .kv');
      const lines = await page.$$eval('#view .diff > div', ds => ds.map(d => d.children[1].textContent));
      return ok(s === '3Lines Added3Lines Removed1Unchanged' && lines.join('') === '--++ -+', s + ' | ' + lines.join(''));
    }
  },
  {
    name: 'markdown-to-html converts the sample', tool: 'markdown-to-html',
    run: async page => {
      const v = await waitVal(page, 1, s => s.length > 0);
      return ok(v === '<h1>Hello World</h1>\n<p>This is <strong>bold</strong> and <em>italic</em> text.</p>\n<h2>Features</h2>\n<ul>\n<li>Item one</li>\n<li>Item two</li>\n<li>Item three</li>\n</ul>\n<p><a href="https://example.com">Visit example</a></p>\n<pre><code class="language-javascript">console.log(&quot;Hello!&quot;);\n</code></pre>\n', v);
    }
  },
  {
    name: 'html-to-markdown converts headings, lists, code and tables', tool: 'html-to-markdown',
    run: async page => {
      await fill(page, 0, '<h2>T</h2><p>A <strong>b</strong> <a href="https://x.org">l</a></p><ul><li>one</li></ul><pre><code>x = 1</code></pre><table><tr><th>h</th></tr><tr><td>c</td></tr></table>');
      const v = await waitVal(page, 1, s => s.includes('## T'));
      return ok(v === '## T\n\nA **b** [l](https://x.org)\n\n-   one\n\n```\nx = 1\n```\n\n| h |\n| --- |\n| c |', JSON.stringify(v));
    }
  },
  {
    name: 'graphql-formatter formats the sample and minifies', tool: 'graphql-formatter',
    run: async page => {
      const v = await waitVal(page, 1, s => s.length > 0, 15000);
      const lines = await page.textContent('#view section:nth-of-type(3) h3 .meta').catch(() => '');
      const min = await page.evaluate(() => new Promise(r => {
        const orig = navigator.clipboard.writeText.bind(navigator.clipboard);
        navigator.clipboard.writeText = t => { r(t); return orig(t).catch(() => {}); };
        [...document.querySelectorAll('#view button')].find(b => b.textContent === 'Copy Minified').click();
      }));
      return ok(v.startsWith('query GetUser($id: ID!) {\n  user(id: $id) {\n    id\n    name\n') &&
        min === 'query GetUser($id:ID!){user(id:$id){id name email posts{id title createdAt}friends{id name}}}', v + ' | ' + lines + ' | ' + min);
    }
  }
];
