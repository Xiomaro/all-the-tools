/* Behaviour checks for the developer group's merges (developer-a/b) and the
   new tools in assets/js/tools/developer-d.js. Expected values come from the
   specs and real implementations: JSON.stringify, npm's semver package,
   js-yaml, the SPDX licence texts, and escapes checked against python3,
   go, rustc, gcc, javac and php. */
'use strict';

const q = (page, fn, arg) => page.evaluate(fn, arg);
const areas = page => q(page, () => Array.from(document.querySelectorAll('#view textarea')).map(t => t.value));
const viewText = page => q(page, () => document.getElementById('view').innerText);
const k = (page, key) => q(page, key => { const n = document.querySelector('#view [data-k="' + key + '"]'); return !n ? null : n.tagName === 'TEXTAREA' || n.tagName === 'INPUT' ? n.value : n.textContent; }, key);
const clickText = (page, text, sel) => q(page, ([t, s]) => {
  const b = Array.from(document.querySelectorAll('#view ' + (s || 'button'))).find(x => x.textContent.trim() === t);
  if (!b) throw new Error('No button "' + t + '"');
  b.click();
}, [text, sel]);
async function setField(page, selector, value, index) {
  await q(page, ([s, v, i]) => {
    const n = document.querySelectorAll('#view ' + s)[i || 0];
    n.value = v;
    n.dispatchEvent(new Event('input', { bubbles: true }));
    n.dispatchEvent(new Event('change', { bubbles: true }));
  }, [selector, value, index]);
  await page.waitForTimeout(350);
}
async function waitFor(page, fn, arg, ms) {
  try { await page.waitForFunction(fn, arg, { timeout: ms || 8000 }); return true; } catch (e) { return false; }
}
/* Follow an old link: the shell redirects merged ids to their survivor. */
async function via(page, oldId, newId) {
  await q(page, id => { location.hash = '#/t/' + id; }, oldId);
  await waitFor(page, id => location.hash === '#/t/' + id, newId);
  await page.waitForTimeout(500);
}
const onChip = page => q(page, () => Array.from(document.querySelectorAll('#view .chip.on')).map(c => c.textContent.trim()));
const res = (ok, detail) => ({ ok: !!ok, detail: String(detail).slice(0, 400) });

module.exports = [
  /* ---------------------------------------------------------------- merges */
  {
    name: 'merged tools: old links open the survivor on the matching tab or mode',
    tool: 'base64-encode',
    run: async page => {
      const out = {};
      await via(page, 'base64-decode', 'base64-encode'); out.b64 = await onChip(page);
      await via(page, 'url-decode', 'url-encode'); out.url = await onChip(page);
      await via(page, 'json-to-yaml', 'yaml-to-json'); out.yaml = await onChip(page);
      await via(page, 'minify-css', 'css-formatter'); out.css = await onChip(page);
      await via(page, 'html-decode', 'html-entities'); out.ent = await onChip(page);
      await via(page, 'json-minify', 'json-formatter'); out.json = (await areas(page))[1];
      await via(page, 'text-diff', 'diff-checker'); out.diff = await q(page, () => document.querySelector('#view h1').textContent);
      return res(out.b64.includes('Decode') && out.url.includes('URL Decode') && out.yaml.includes('JSON → YAML') && out.css.includes('Minified') &&
        out.ent.includes('Decode') && out.json === '{"name":"All The Tools","version":"2.0","tools":["json","css","text"],"meta":{"author":"Ada","year":2026}}' &&
        out.diff === 'Diff Checker', JSON.stringify(out));
    }
  },
  {
    name: 'html-formatter Minified mode: old minify-html options and bytes saved',
    tool: 'html-formatter',
    run: async page => {
      const sample = '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8">\n    <title>My Page</title>\n  </head>\n  <body>\n    <!-- Main content -->\n    <div class="container">\n      <h1>Hello World</h1>\n      <p>This is a paragraph with   extra   spaces.</p>\n    </div>\n  </body>\n</html>';
      await clickText(page, 'Minified');
      await setField(page, 'textarea', sample);
      await waitFor(page, () => document.querySelectorAll('#view textarea')[1].value.startsWith('<!DOCTYPE'));
      const v = (await areas(page))[1], saved = await k(page, 'saved');
      await q(page, () => Array.from(document.querySelectorAll('#view label.check')).find(l => /Remove comments/.test(l.textContent)).querySelector('input').click());
      await waitFor(page, () => document.querySelectorAll('#view textarea')[1].value.includes('<!--'));
      const c = (await areas(page))[1];
      return res(v === '<!DOCTYPE html><html lang=en><head><meta charset=UTF-8><title>My Page</title></head><body><div class=container><h1>Hello World</h1><p>This is a paragraph with extra spaces.</p></div></body></html>' &&
        /^Saved \d+ bytes \(\d+%\)$/.test(saved) && c.includes('<!-- Main content -->'), v + ' | ' + saved);
    }
  },
  {
    name: 'css-formatter Minified mode: old minify-css output, savings and hex option',
    tool: 'css-formatter',
    run: async page => {
      const sample = '/* Main styles */\nbody {\n  margin: 0;\n  padding: 0;\n  font-family: Arial, sans-serif;\n  background-color: #ffffff;\n  color: #333333;\n}\n\n.container {\n  max-width: 1200px;\n  margin: 0 auto;\n  padding: 0 20px;\n}\n\nh1,\nh2,\nh3 {\n  font-weight: bold;\n  color: #111111;\n}';
      await clickText(page, 'Minified');
      await setField(page, 'textarea', sample);
      await waitFor(page, () => document.querySelectorAll('#view textarea')[1].value.startsWith('body{'));
      const v = (await areas(page))[1], saved = await k(page, 'saved');
      await q(page, () => Array.from(document.querySelectorAll('#view label.check')).find(l => /Shorten hex colours/.test(l.textContent)).querySelector('input').click());
      await waitFor(page, () => document.querySelectorAll('#view textarea')[1].value.includes('#ffffff'));
      const h = (await areas(page))[1];
      return res(v === 'body{margin:0;padding:0;font-family:Arial,sans-serif;background-color:#fff;color:#333}.container{max-width:1200px;margin:0 auto;padding:0 20px}h1,h2,h3{font-weight:bold;color:#111}' &&
        saved === 'Saved 83 bytes (32%)' && h.includes('#ffffff'), v + ' | ' + saved);
    }
  },
  {
    name: 'js-formatter Minified mode: old minify-js output and comment option',
    tool: 'js-formatter',
    run: async page => {
      const sample = '// Calculate factorial\nfunction factorial(n) {\n  // Base case\n  if (n <= 1) {\n    return 1;\n  }\n  // Recursive case\n  return n * factorial(n - 1);\n}\n\nconst result = factorial(10);\nconsole.log("Result:", result);';
      await clickText(page, 'Minified');
      await setField(page, 'textarea', sample);
      await waitFor(page, () => document.querySelectorAll('#view textarea')[1].value.startsWith('function factorial'), null, 15000);
      const v = (await areas(page))[1];
      await q(page, () => Array.from(document.querySelectorAll('#view label.check')).find(l => /Remove comments/.test(l.textContent)).querySelector('input').click());
      await waitFor(page, () => document.querySelectorAll('#view textarea')[1].value.includes('//'), null, 15000);
      const c = (await areas(page))[1];
      return res(v === 'function factorial(n){if(n<=1){return 1}return n*factorial(n-1)}const result=factorial(10);console.log("Result:",result);' && c.includes('// Base case'), v + ' | ' + c.slice(0, 80));
    }
  },
  {
    name: 'json-formatter: structure stats, minify savings, sort keys and exact big numbers',
    tool: 'json-formatter',
    run: async page => {
      const text = '{\n  "name": "x",\n  "tools": ["a", "b"],\n  "meta": { "author": "Bob", "year": 2024 },\n  "big": 12345678901234567890,\n  "f": 1.50\n}';
      await setField(page, 'textarea', text);
      await clickText(page, 'Minify');
      const m = (await areas(page))[1], saved = await k(page, 'saved');
      const stats = await q(page, () => ['keys', 'depth', 'containers', 'values'].map(x => document.querySelector('#view [data-k="' + x + '"] b').textContent));
      await q(page, () => Array.from(document.querySelectorAll('#view label.check')).find(l => /Sort keys/.test(l.textContent)).querySelector('input').click());
      await page.waitForTimeout(200);
      const sorted = (await areas(page))[1];
      const before = Buffer.byteLength(text), after = Buffer.byteLength('{"name":"x","tools":["a","b"],"meta":{"author":"Bob","year":2024},"big":12345678901234567890,"f":1.50}');
      return res(m === '{"name":"x","tools":["a","b"],"meta":{"author":"Bob","year":2024},"big":12345678901234567890,"f":1.50}' &&
        saved === 'Saved ' + (before - after) + ' bytes (' + Math.round((before - after) / before * 100) + '%)' &&
        stats.join('|') === '7|2|2 / 1|7' && sorted.startsWith('{"big":12345678901234567890,"f":1.50,"meta":{"author":"Bob","year":2024},"name"'), m + ' | ' + saved + ' | ' + stats + ' | ' + sorted);
    }
  },
  {
    name: 'base64-encode: decode tab (URL-safe, junk), URL-safe and MIME options, size ratio, image preview',
    tool: 'base64-encode',
    run: async page => {
      await setField(page, 'textarea', 'ÿþ?>');
      const std = (await areas(page))[1];
      await q(page, () => document.querySelectorAll('#view input[type=checkbox]')[0].click());
      await page.waitForTimeout(250);
      const safe = (await areas(page))[1];
      await q(page, () => { const c = document.querySelectorAll('#view input[type=checkbox]'); c[0].click(); c[1].click(); });
      await setField(page, 'textarea', 'Hello, World! This is a test of Base64 encoding.');
      const info = await k(page, 'info');
      await setField(page, 'textarea', 'x'.repeat(100));
      const wrapped = (await areas(page))[1];
      await clickText(page, 'Decode', 'button.chip');
      await setField(page, 'textarea', 'SGVsbG8sIFdvcmxkISDinJM');
      const dec = (await areas(page))[1];
      await setField(page, 'textarea', '@@@');
      const err = await q(page, () => document.querySelector('#view .note.err').textContent);
      await setField(page, 'textarea', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
      const img = await q(page, () => !!document.querySelector('#view img.b64img'));
      return res(std === 'w7/Dvj8+' && safe === 'w7_Dvj8-' && /Input 48 bytes · output 64 characters · size ratio 133\.3%/.test(info) && wrapped.split('\n')[0].length === 76 &&
        dec === 'Hello, World! ✓' && /Invalid Base64/.test(err) && img, [std, safe, info, dec, err, img].join(' | '));
    }
  },
  {
    name: 'url-encode: decode tab decodes, lists query parameters, repeats and reports malformed input',
    tool: 'url-encode',
    run: async page => {
      await clickText(page, 'URL Decode', 'button.chip');
      await setField(page, 'textarea', 'hello%20world%21%C3%A9');
      const a = (await areas(page))[1];
      await setField(page, 'textarea', 'https://x.org/s?q=caf%C3%A9+cr%C3%A8me&tag=a%26b#top');
      const params = await q(page, () => Array.from(document.querySelectorAll('#view table tbody tr')).map(r => r.children[0].textContent + '=' + r.children[1].textContent));
      await q(page, () => Array.from(document.querySelectorAll('#view label.check')).find(l => /double-encoded/.test(l.textContent)).querySelector('input').click());
      await setField(page, 'textarea', 'a%2520b');
      const twice = (await areas(page))[1];
      await setField(page, 'textarea', '%E0%A4%A');
      const err = await q(page, () => document.querySelector('#view .note.err').textContent);
      return res(a === 'hello world!é' && params.join('&') === 'q=café crème&tag=a&b' && twice === 'a b' && /Malformed/.test(err), [a, params, twice, err].join(' | '));
    }
  },
  {
    name: 'yaml-to-json: JSON → YAML gives the old json-to-yaml output; sort keys; 4-space indent',
    tool: 'yaml-to-json',
    run: async page => {
      await clickText(page, 'JSON → YAML', 'button.chip');
      await setField(page, 'textarea', '{\n  "name": "All The Tools",\n  "version": "1.0.0",\n  "features": ["fast", "free", "browser-based"],\n  "config": {\n    "theme": "dark",\n    "count": 42\n  }\n}');
      await waitFor(page, () => document.querySelectorAll('#view textarea')[1].value.startsWith('name:'));
      const y = (await areas(page))[1];
      await q(page, () => Array.from(document.querySelectorAll('#view label.check')).find(l => /Sort keys/.test(l.textContent)).querySelector('input').click());
      await setField(page, 'select', '4');
      const s = (await areas(page))[1];
      return res(y === 'name: All The Tools\nversion: 1.0.0\nfeatures:\n  - fast\n  - free\n  - browser-based\nconfig:\n  theme: dark\n  count: 42' &&
        s === 'config:\n    count: 42\n    theme: dark\nfeatures:\n    - fast\n    - free\n    - browser-based\nname: All The Tools\nversion: 1.0.0', y + ' || ' + s);
    }
  },
  {
    name: 'markdown-to-html: rendered preview beside the HTML, and the split/editor/preview layouts',
    tool: 'markdown-to-html',
    run: async page => {
      await setField(page, 'textarea', '# Hi\n\n**bold** text\n\n| a | b |\n|---|---|\n| 1 | 2 |');
      await page.waitForTimeout(500);
      const frame = page.frameLocator('#view iframe[data-k=preview]');
      const r = [await frame.locator('h1').textContent(), await frame.locator('strong').textContent(), await frame.locator('td').count()].join(',');
      const html = (await areas(page))[1];
      await clickText(page, 'Preview', 'button.chip');
      const hiddenEditor = await q(page, () => getComputedStyle(document.querySelector('#view .md-edit')).display === 'none' && getComputedStyle(document.querySelector('#view .md-prev')).display !== 'none');
      await clickText(page, 'Editor', 'button.chip');
      const hiddenPreview = await q(page, () => getComputedStyle(document.querySelector('#view .md-prev')).display === 'none');
      return res(r === 'Hi,bold,2' && html.startsWith('<h1>Hi</h1>') && html.includes('<td>1</td>') && hiddenEditor && hiddenPreview, r + ' | ' + hiddenEditor + ' ' + hiddenPreview);
    }
  },
  {
    name: 'markdown-table-gen2: imports a Markdown table (alignments kept) and compact output',
    tool: 'markdown-table-gen2',
    run: async page => {
      await setField(page, 'textarea', '| Fruit | Price |\n|:--|--:|\n| Apple | 1.20 |\n| Kiwi \\| Lime | 0.5 |');
      await clickText(page, 'Import');
      const a = await q(page, () => document.querySelector('#view pre.out').textContent);
      await q(page, () => Array.from(document.querySelectorAll('#view label.check')).find(l => /Compact/.test(l.textContent)).querySelector('input').click());
      await page.waitForTimeout(200);
      const b = await q(page, () => document.querySelector('#view pre.out').textContent);
      return res(a === '| Fruit        | Price |\n| :----------- | ----: |\n| Apple        |  1.20 |\n| Kiwi \\| Lime |   0.5 |' &&
        b === '| Fruit | Price |\n| :-- | --: |\n| Apple | 1.20 |\n| Kiwi \\| Lime | 0.5 |', a + ' || ' + b);
    }
  },
  {
    name: 'diff-checker: changed words highlighted, side-by-side view, ignore case',
    tool: 'diff-checker',
    run: async page => {
      const ins = await q(page, () => Array.from(document.querySelectorAll('#view .diff ins')).map(x => x.textContent));
      const del = await q(page, () => Array.from(document.querySelectorAll('#view .diff del')).map(x => x.textContent));
      await clickText(page, 'Side by side', 'button.chip');
      const rows = await q(page, () => Array.from(document.querySelectorAll('#view table.sbs tbody tr')).map(r => Array.from(r.children).map(c => c.className || '-').join(',')));
      await setField(page, 'textarea', 'Hello World', 0);
      await setField(page, 'textarea', 'hello world', 1);
      const before = await q(page, () => document.querySelector('#view .kv').textContent);
      await q(page, () => Array.from(document.querySelectorAll('#view label.check')).find(l => /Ignore case/.test(l.textContent)).querySelector('input').click());
      await page.waitForTimeout(300);
      const after = await q(page, () => document.querySelector('#view .kv').textContent);
      return res(ins.join('|') === 'cat|everyone|is a new |added here' && del.join('|') === 'dog|world|will be removed' &&
        rows.join(';') === 'ln,del,ln,add;ln,del,ln,add;ln,-,ln,-;ln,del,ln,add' && before === '1Lines Added1Lines Removed0Unchanged' && after === '0Lines Added0Lines Removed1Unchanged',
        JSON.stringify([ins, del, rows, before, after]));
    }
  },
  {
    name: 'css-gradient-gen: any CSS colour name, and new stops get a colour',
    tool: 'css-gradient-gen',
    run: async page => {
      await setField(page, '.devb-stop input[type=text]', 'rebeccapurple', 0);
      const a = await q(page, () => document.querySelector('#view pre.out').textContent);
      const pick = await q(page, () => document.querySelector('#view .devb-stop input[type=color]').value);
      await clickText(page, '+ Add Stop');
      const n = await q(page, () => document.querySelectorAll('#view .devb-stop').length);
      return res(a === 'background: linear-gradient(135deg, rebeccapurple 0%, #a855f7 50%, #ec4899 100%);' && pick === '#663399' && n === 4, a + ' ' + pick + ' ' + n);
    }
  },
  {
    name: 'cron-parser builder: per-field controls write the expression, and typing fills the builder',
    tool: 'cron-parser',
    run: async page => {
      const setMode = (i, m) => q(page, ([i, m]) => { const s = document.querySelector('#view .cronb-row[data-field="' + i + '"] select'); s.value = m; s.dispatchEvent(new Event('change', { bubbles: true })); }, [i, m]);
      await setMode(0, 'step');
      await page.waitForTimeout(150);
      const a = await q(page, () => document.querySelector('#view input').value);
      await setMode(1, 'range');
      await page.waitForTimeout(150);
      const b = await q(page, () => document.querySelector('#view input').value);
      await setField(page, 'input', '30 6,18 1 */3 *');
      const modes = await q(page, () => Array.from(document.querySelectorAll('#view .cronb-row > select')).map(s => s.value));
      const hours = await q(page, () => Array.from(document.querySelectorAll('#view .cronb-row[data-field="1"] .cronb-vals button.on')).map(x => x.textContent));
      const plain = await k(page, 'plain');
      return res(a === '*/15 9 * * 1-5' && b === '*/15 0-5 * * 1-5' && modes.join() === 'specific,specific,specific,step,every' && hours.join() === '06,18' && /every 3 months/.test(plain),
        [a, b, modes, hours, plain].join(' | '));
    }
  },

  /* ------------------------------------------------------------- new tools */
  {
    name: 'string-escape: escapes match JSON.stringify, Python repr/ascii, Go strconv.Quote and Rust Debug',
    tool: 'string-escape',
    run: async page => {
      const s = 'Tab\there "q" \\ é 😀\n\u0000';
      const got = await q(page, s => {
        const K = window.DevDKit, e = (id, o) => K.escape(id, s, Object.assign({ quotes: true }, o)).text;
        return { json: e('json'), py: e('python-single'), pyA: e('python-single', { ascii: true }), go: e('go'), goA: e('go', { ascii: true }), rust: e('rust'),
          sh: K.escape('sh-single', "it's", {}).text, sql: K.escape('sql', "O'Reilly", { quotes: true }).text, csv: K.escape('csv', 'a,"b"', {}).text,
          c: K.escape('c', 'a??=b', { quotes: true }).text, tpl: K.escape('js-template', 'a`b${c}', {}).text,
          xml: K.escape('xml', '<a href="x">&\n', {}).text, uni: K.escape('unicode', 'é😀', {}).text };
      }, s);
      /* python3 repr()/ascii(), go strconv.Quote/QuoteToASCII and rustc {:?} of the same string. */
      const want = { json: JSON.stringify(s), py: String.raw`'Tab\there "q" \\ é 😀\n\x00'`, pyA: String.raw`'Tab\there "q" \\ \xe9 \U0001f600\n\x00'`,
        go: String.raw`"Tab\there \"q\" \\ é 😀\n\x00"`, goA: String.raw`"Tab\there \"q\" \\ \u00e9 \U0001f600\n\x00"`, rust: String.raw`"Tab\there \"q\" \\ é 😀\n\0"`,
        sh: String.raw`'it'\''s'`, sql: "'O''Reilly'", csv: '"a,""b"""', c: String.raw`"a?\?=b"`, tpl: 'a\\`b\\${c}', xml: '&lt;a href=&quot;x&quot;&gt;&amp;&#10;', uni: String.raw`\u00E9\uD83D\uDE00` };
      const bad = Object.keys(want).filter(x => got[x] !== want[x]);
      return res(!bad.length, bad.map(x => x + ': ' + got[x] + ' ≠ ' + want[x]).join(' ; '));
    }
  },
  {
    name: 'string-escape: unescapes each language and names invalid escapes with their position',
    tool: 'string-escape',
    run: async page => {
      const r = await q(page, () => {
        const K = window.DevDKit, u = (id, s) => { try { return K.unescape(id, s, {}).text; } catch (e) { return 'ERR@' + e.pos + ':' + e.message; } };
        return { c: u('c', String.raw`"caf\303\251 \x41\101\?"`), go: u('go', String.raw`"\u00e9\U0001F600\101"`), java: u('java', String.raw`"\uuu0041\101\s"`),
          py: u('python-single', String.raw`'\N{BULLET}'`), rust: u('rust', String.raw`"\x80"`), goq: u('go', String.raw`"it\'s"`), json: u('json', String.raw`"a\qb"`),
          js: u('js-double', String.raw`"\u{1F600}\x41\
b"`), sh: u('sh-single', String.raw`'it'\''s' "a \"b\""`), rx: u('regex', String.raw`a\.b\d`), csv: u('csv', '"a,""b"""'), xml: u('xml', '&lt;x&gt; &amp; &#233; &nbsp;') };
      });
      return res(r.c === 'café AA?' && r.go === 'é😀A' && r.java === 'AA ' && /^ERR@1:\\N\{…\}/.test(r.py) && /^ERR@1:Out of range hex escape/.test(r.rust) &&
        /^ERR@3:Unknown escape sequence \\'/.test(r.goq) && /^ERR@2:Invalid escape \\q/.test(r.json) && r.js === '😀Ab' && r.sh === "it's a \"b\"" &&
        /^ERR@4:\\d is a character class/.test(r.rx) && r.csv === 'a,"b"' && r.xml === '<x> & é \u00a0', JSON.stringify(r));
    }
  },
  {
    name: 'string-escape UI: escape, swap back to unescape, and a located error',
    tool: 'string-escape',
    run: async page => {
      await setField(page, 'select', 'java');
      await setField(page, 'textarea', 'Line 1\n"quoted"\té');
      const esc = await k(page, 'out');
      await clickText(page, 'Swap ⇄');
      await page.waitForTimeout(300);
      const back = await k(page, 'out');
      await setField(page, 'textarea', '"ok\\qno"');
      const t = await viewText(page);
      return res(esc === String.raw`"Line 1\n\"quoted\"\té"` && back === 'Line 1\n"quoted"\té' && /Illegal escape character \\q.*\(line 1, column 4\)/.test(t), esc + ' | ' + back + ' | ' + t.slice(0, 300));
    }
  },
  {
    name: 'line-endings: pasted CRLF/mixed text is detected, converted to LF with trimmed whitespace and tabs',
    tool: 'line-endings',
    run: async page => {
      const out = await q(page, () => {
        const ta = document.querySelector('#view textarea');
        const dt = new DataTransfer();
        dt.setData('text/plain', '\ufeffif (x) {\r\n\tgo();  \r\n  \tstop();\n}');
        ta.focus();
        ta.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
        return true;
      });
      await page.waitForTimeout(400);
      const stats = await q(page, () => Array.from(document.querySelectorAll('#view [data-k=stats] .stat')).map(s => s.querySelector('span').textContent + '=' + s.querySelector('b').textContent));
      await setField(page, 'select', 'remove', 1);
      await setField(page, 'select', 'spaces', 2);
      await setField(page, 'input[type=number]', '4');
      await q(page, () => Array.from(document.querySelectorAll('#view label.check')).find(l => /Trim trailing/.test(l.textContent)).querySelector('input').click());
      await page.waitForTimeout(300);
      const conv = await q(page, () => { const K = window.DevDKit; return K.leConvert('\ufeffif (x) {\r\n\tgo();  \r\n  \tstop();\n}', { eol: 'lf', bom: 'remove', indent: 'spaces', width: 4, trim: true, final: 'ensure' }); });
      const shown = await k(page, 'out');
      return res(out && stats.join('|') === 'Line endings=Mixed: 2 CRLF, 1 LF|Byte order mark=Yes|Indentation=Tabs, 1 mixed|Trailing whitespace=1 line|Final newline=No|Lines=4' &&
        conv === 'if (x) {\n    go();\n    stop();\n}\n' && shown === 'if·(x)·{␊\n····go();␊\n····stop();␊\n}␊\n', stats.join('|') + ' || ' + JSON.stringify(conv) + ' || ' + JSON.stringify(shown));
    }
  },
  {
    name: 'line-endings: several files convert to CRLF and come back as a ZIP',
    tool: 'line-endings',
    run: async page => {
      await setField(page, 'select', 'crlf', 0);
      await page.setInputFiles('#view input[type=file]', [
        { name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('one\ntwo\n') },
        { name: 'b.py', mimeType: 'text/plain', buffer: Buffer.from([0xff, 0xfe, 0x78, 0x00, 0x0a, 0x00]) },
        { name: 'c.bin', mimeType: 'application/octet-stream', buffer: Buffer.from([1, 0, 2, 3]) }]);
      await waitFor(page, () => /Download all as ZIP/.test(document.getElementById('view').textContent));
      const t = await viewText(page);
      const [dl] = await Promise.all([page.waitForEvent('download'), clickText(page, 'Download all as ZIP')]);
      const JSZip = require('jszip');
      const zip = await JSZip.loadAsync(require('fs').readFileSync(await dl.path()));
      const a = await zip.file('a.txt').async('string'), b = await zip.file('b.py').async('nodebuffer');
      /* The UTF-16 file had a BOM, and "Keep" keeps it, now as the UTF-8 BOM. */
      return res(a === 'one\r\ntwo\r\n' && b.equals(Buffer.from('﻿x\r\n')) && !zip.file('c.bin') && /UTF-16 LE/.test(t) && /binary/.test(t), JSON.stringify(a) + ' ' + b.toString('hex') + ' ' + Object.keys(zip.files));
    }
  },
  {
    name: 'code-playground: renders HTML in the sandboxed preview (old html-viewer check) and captures console output',
    tool: 'code-playground',
    run: async page => {
      const sandbox = await q(page, () => document.querySelector('#view iframe[data-k=preview]').getAttribute('sandbox'));
      await setField(page, 'textarea', '<h2 id="t">Rendered here</h2>', 0);
      await setField(page, 'textarea', 'h2 { color: rgb(1, 2, 3); }', 1);
      await setField(page, 'textarea', "console.log('sum', 1 + 1, {a: [1, 'x']});\nconsole.warn('careful');\ntry { parent.document.title; console.log('leak'); } catch (e) { console.log('blocked'); }\ntry { localStorage.length; console.log('storage'); } catch (e) { console.log('no storage'); }\nnull.boom;", 2);
      await waitFor(page, () => document.querySelectorAll('#view [data-k=console] [data-level]').length >= 5, null, 8000);
      const frame = page.frameLocator('#view iframe[data-k=preview]');
      const t = await frame.locator('#t').textContent();
      const color = await frame.locator('#t').evaluate(n => getComputedStyle(n).color);
      const lines = await q(page, () => Array.from(document.querySelectorAll('#view [data-k=console] [data-level]')).map(d => d.dataset.level + ':' + d.textContent));
      return res(sandbox === 'allow-scripts' && t === 'Rendered here' && color === 'rgb(1, 2, 3)' && lines[0] === 'log:sum 2 {a: [1, "x"]}' && lines[1] === 'warn:careful' &&
        lines[2] === 'log:blocked' && lines[3] === 'log:no storage' && /^uncaught:Uncaught TypeError: .*null.*\(JS line 5\)$/.test(lines[4]), sandbox + ' | ' + t + ' | ' + color + ' | ' + lines.join(' ; '));
    }
  },
  {
    name: 'code-playground: auto-run off waits for Run; export is one HTML file with all three parts',
    tool: 'code-playground',
    run: async page => {
      await q(page, () => Array.from(document.querySelectorAll('#view label.check')).find(l => /Auto-run/.test(l.textContent)).querySelector('input').click());
      await setField(page, 'textarea', '<p id="p">new</p>', 0);
      await page.waitForTimeout(900);
      const frame = page.frameLocator('#view iframe[data-k=preview]');
      const stale = await frame.locator('#p').count();
      await clickText(page, '▶ Run');
      await page.waitForTimeout(700);
      const fresh = await frame.locator('#p').textContent();
      const [dl] = await Promise.all([page.waitForEvent('download'), clickText(page, 'Export HTML')]);
      const html = require('fs').readFileSync(await dl.path(), 'utf8');
      return res(stale === 0 && fresh === 'new' && dl.suggestedFilename() === 'playground.html' && /<style>\nbody \{ font-family/.test(html) && html.includes('<p id="p">new</p>') &&
        html.includes("document.getElementById('btn')") && !html.includes('__pg'), stale + ' ' + fresh + ' ' + html.slice(0, 200));
    }
  },
  {
    name: 'semver-calculator: parse, compare, ranges and bumps agree with npm semver',
    tool: 'semver-calculator',
    run: async page => {
      const semver = require('semver');
      const versions = ['0.0.3', '0.2.5', '0.3.0-0', '1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-beta.11', '1.0.0-beta.2', '1.0.0-rc.1', '1.0.0', '1.2.3-beta.4', '1.2.3', '1.2.9', '1.3.0-beta', '1.3.0', '2.0.0-0', '2.0.0', '2.3.4', '3.0.0'];
      const ranges = ['^1.2.3', '^0.2.3', '^0.0.3', '~1.2', '~0', '1.x', '*', '>=1.2.3-beta.1 <1.3.0', '1.2.3 - 2.3', '>1.2', '<=1.2', '^1.2.3-beta.2 || ~2.3', '>2.x', '1.2 - 2'];
      const mine = await q(page, ([v, r]) => {
        const S = window.DevDKit.semver;
        return { sat: r.map(x => v.map(y => S.satisfies(y, x))), sorted: v.slice().sort((a, b) => S.compare(S.parse(a), S.parse(b))),
          inc: v.map(y => ['major', 'minor', 'patch', 'premajor', 'prerelease'].map(t => S.inc(y, t, t === 'prerelease' ? 'rc' : undefined))) };
      }, [versions, ranges]);
      const want = { sat: ranges.map(x => versions.map(y => semver.satisfies(y, x))), sorted: versions.slice().sort(semver.compare),
        inc: versions.map(y => ['major', 'minor', 'patch', 'premajor', 'prerelease'].map(t => semver.inc(y, t, t === 'prerelease' ? 'rc' : undefined))) };
      const cmp = await k(page, 'cmp'), desugared = await k(page, 'desugared');
      const ticks = await q(page, () => Array.from(document.querySelectorAll('#view [data-k=matches] li')).map(li => li.dataset.v + (li.dataset.ok === '1' ? '+' : '-')).join(' '));
      return res(JSON.stringify(mine) === JSON.stringify(want) && cmp === '1.2.10 < 1.10.0-beta.2' && desugared === '>=1.2.3 <2.0.0-0' &&
        ticks === '1.0.0- 1.2.3+ 1.2.10+ 1.3.0-beta.1- 1.3.0+ 1.10.0+ 2.0.0-rc.1- 2.0.0- 0.9.7- v1.4.2+build.7+ not-a-version-', cmp + ' | ' + desugared + ' | ' + ticks);
    }
  },
  {
    name: 'docker-compose-converter: docker run → Compose (known answer, valid YAML) and back',
    tool: 'docker-compose-converter',
    run: async page => {
      await setField(page, 'textarea', 'docker run -d --name web -p 8080:80 -e TZ=Europe/London -v ./html:/usr/share/nginx/html:ro --restart unless-stopped nginx:1.27');
      const y = await k(page, 'out');
      await setField(page, 'textarea', "docker run -it --rm --network backend --network-alias db -v pgdata:/data --cpus 1.5 --gpus all --frob=x postgres:16 postgres -c 'max_connections=50'");
      const y2 = await k(page, 'out'), warns = await k(page, 'warnings');
      const Y = require('js-yaml'), d = Y.load(y2);
      await clickText(page, 'Compose → docker run', 'button.chip');
      await waitFor(page, () => /docker run/.test(document.querySelector('#view [data-k=out]').value));
      const back = await k(page, 'out');
      const s = d.services.postgres;
      return res(y === 'services:\n  web:\n    image: nginx:1.27\n    container_name: web\n    restart: unless-stopped\n    ports:\n      - "8080:80"\n    environment:\n      TZ: Europe/London\n    volumes:\n      - ./html:/usr/share/nginx/html:ro\n' &&
        s.image === 'postgres:16' && s.stdin_open && s.tty && s.cpus === 1.5 && s.command.join(' ') === 'postgres -c max_connections=50' && s.networks.backend.aliases[0] === 'db' &&
        d.networks.backend.external === true && JSON.stringify(d.volumes) === '{"pgdata":{}}' && s.deploy.resources.reservations.devices[0].capabilities[0] === 'gpu' &&
        /--rm has no Compose equivalent/.test(warns) && /Unsupported option --frob/.test(warns) &&
        back.includes('docker volume create pgdata') && back.includes('--network backend') && back.includes('--network-alias db') && back.includes('-it') && back.includes('postgres:16 postgres -c max_connections=50'),
        y2.slice(0, 200) + ' || ' + back.slice(0, 300));
    }
  },
  {
    name: 'license-generator: SPDX texts with year and holder filled, header snippet, rules and notices',
    tool: 'license-generator',
    run: async page => {
      await waitFor(page, () => document.querySelector('#view [data-k=licence]').textContent.length > 100);
      await setField(page, 'input', 'Ada Lovelace', 1);
      const mit = await k(page, 'licence'), header = await k(page, 'header');
      await setField(page, 'select', 'GPL-3.0-only', 0);
      const gpl = await k(page, 'licence'), rules = await k(page, 'rules');
      await q(page, () => Array.from(document.querySelectorAll('#view label.check')).find(l => /standard notice/.test(l.textContent)).querySelector('input').click());
      await setField(page, 'select', '#', 1);
      const gplHeader = await k(page, 'header');
      await setField(page, 'select', 'ISC', 0);
      const isc = await k(page, 'licence');
      const full = require('spdx-license-list/full'), year = String(new Date().getFullYear());
      const wantMit = full.MIT.licenseText.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trim().replace('<year>', year).replace('<copyright holders>', 'Ada Lovelace') + '\n';
      return res(mit === wantMit && header === '// SPDX-FileCopyrightText: ' + year + ' Ada Lovelace\n// SPDX-License-Identifier: MIT' &&
        gpl.startsWith('GNU GENERAL PUBLIC LICENSE\nVersion 3, 29 June 2007') && /Make the source available/.test(rules) && /Release changes under the same licence/.test(rules) &&
        gplHeader.startsWith('# SPDX-FileCopyrightText: ' + year + ' Ada Lovelace\n# SPDX-License-Identifier: GPL-3.0-only\n#\n# Copyright (C) ' + year + '  Ada Lovelace') && /Free Software Foundation, version 3\./.test(gplHeader.replace(/\n# /g, ' ')) &&
        isc.startsWith('ISC License\n\nCopyright (c) ' + year + ' Ada Lovelace\n') && isc.includes('THE AUTHOR DISCLAIMS'), mit.slice(0, 80) + ' | ' + header + ' | ' + gplHeader.slice(0, 200));
    }
  },
  {
    name: 'selector-tester: CSS matches, XPath node, attribute, number, string and boolean results, errors, XML namespaces',
    tool: 'selector-tester',
    run: async page => {
      const count = await k(page, 'count');
      const marks = await q(page, () => Array.from(document.querySelectorAll('#view [data-k=source] mark')).map(m => m.textContent));
      await clickText(page, 'XPath', 'button.chip');
      const r = {};
      for (const [key, x] of [['n', 'count(//li)'], ['s', 'string(//h1)'], ['b', 'boolean(//table)'], ['href', '//a/@href'], ['bad', '//li[']]) {
        await setField(page, 'input[data-k=query]', x);
        r[key] = [await k(page, 'count'), await q(page, () => Array.from(document.querySelectorAll('#view .sel-hit code')).map(c => c.textContent).join(',')), await q(page, () => (document.querySelector('#view .note.err') || {}).textContent || '')];
      }
      await clickText(page, 'Try the XML sample');
      await page.waitForTimeout(400);
      const xml = [await k(page, 'count'), await q(page, () => Array.from(document.querySelectorAll('#view .sel-hit code')).map(c => c.textContent).join(','))];
      return res(count === '2 matches' && marks.join('|') === '<li class="item">Apple</li>|<li class="item sale">Pear</li>' && r.n[0] === '3' && r.s[0] === '"Fruit & Veg"' && r.b[0] === 'false' &&
        r.href[0] === '2 matches' && r.href[1] === '@href="https://example.com/offers",@href="/contact"' && /Not a valid XPath expression/.test(r.bad[2]) &&
        xml[0] === '1 match' && xml[1] === '<dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">The Pragmatic Programmer</dc:title>', JSON.stringify([count, marks, r, xml]));
    }
  }
];
