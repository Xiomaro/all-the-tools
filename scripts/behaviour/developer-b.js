/* Behaviour checks for the developer-b group (assets/js/tools/developer-b.js). */
'use strict';

const q = (page, fn, arg) => page.evaluate(fn, arg);
const pres = page => q(page, () => Array.from(document.querySelectorAll('#view pre.out')).map(p => p.textContent));
const areas = page => q(page, () => Array.from(document.querySelectorAll('#view textarea')).map(t => t.value));
const viewText = page => q(page, () => document.getElementById('view').innerText);
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
  try { await page.waitForFunction(fn, arg, { timeout: ms || 5000 }); return true; } catch (e) { return false; }
}
const res = (ok, detail) => ({ ok: !!ok, detail: String(detail).slice(0, 200) });

module.exports = [
  {
    name: 'toml-to-json: sample converts, nested tables and arrays of tables',
    tool: 'toml-to-json',
    run: async page => {
      await waitFor(page, () => document.querySelectorAll('#view textarea')[1].value.length > 10);
      const out = (await areas(page))[1];
      const j = JSON.parse(out);
      const ok = j.package.name === 'my-app' && j.dependencies.serde.features[0] === 'derive' && j.bin[0].path === 'src/main.rs' &&
        j.profile.release['opt-level'] === 3 && j.profile.release.lto === true && out.startsWith('{\n  "package": {\n    "name": "my-app"');
      return res(ok, out.slice(0, 120));
    }
  },
  {
    name: 'toml-to-json: 4-space indent and invalid TOML error',
    tool: 'toml-to-json',
    run: async page => {
      await waitFor(page, () => document.querySelectorAll('#view textarea')[1].value.length > 10);
      await clickText(page, '4sp');
      const four = (await areas(page))[1].startsWith('{\n    "package"');
      await setField(page, 'textarea', 'a = = 1');
      const t = await viewText(page);
      return res(four && /TOML error/.test(t), t.slice(0, 160));
    }
  },
  {
    name: 'xml-to-json: attributes, repeated elements, text + attribute',
    tool: 'xml-to-json',
    run: async page => {
      const j = JSON.parse((await areas(page))[1]);
      const b = j.catalog.book;
      const ok = Array.isArray(b) && b.length === 2 && b[0]['@id'] === 'b1' && b[0].title === 'Clean Code' && b[1].price['@currency'] === 'USD' && b[1].price['#text'] === '42.50';
      await setField(page, 'textarea', '<a><b>');
      const t = await viewText(page);
      return res(ok && /Invalid XML/.test(t), JSON.stringify(b[0]));
    }
  },
  {
    name: 'json-to-xml: arrays repeat elements, declaration, escaping',
    tool: 'json-to-xml',
    run: async page => {
      const out = (await areas(page))[1];
      const a = out.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<catalog>\n  <book>\n    <id>b1</id>') && (out.match(/<book>/g) || []).length === 2;
      await setField(page, 'textarea', '{"x":{"@id":"7","#text":"a<b"}}');
      const out2 = (await areas(page))[1];
      return res(a && out2.includes('<x id="7">a&lt;b</x>'), out2);
    }
  },
  {
    name: 'json-diff: sample shows +1 -0 ~3 with dotted array paths',
    tool: 'json-diff',
    run: async page => {
      const t = await viewText(page);
      const ok = t.includes('+1 added') && t.includes('-0 removed') && t.includes('~3 changed') && t.includes('hobbies.1') && t.includes('"coding" → "gaming"') && t.includes('30 → 31');
      return res(ok, t.slice(0, 200));
    }
  },
  {
    name: 'json-diff: removed key and show-unchanged toggle',
    tool: 'json-diff',
    run: async page => {
      await setField(page, 'textarea', '{"a":1,"b":2}', 0);
      await setField(page, 'textarea', '{"a":1}', 1);
      let t = await viewText(page);
      const rem = t.includes('-1 removed') && !t.includes('UNCHANGED');
      await q(page, () => { const c = document.querySelector('#view input[type=checkbox]'); c.click(); });
      await page.waitForTimeout(300);
      t = await viewText(page);
      return res(rem && t.includes('UNCHANGED'), t.slice(0, 200));
    }
  },
  {
    name: 'http-status-codes: full list, search and class filter',
    tool: 'http-status-codes',
    run: async page => {
      const all = await q(page, () => document.querySelectorAll('#view [data-code]').length);
      await setField(page, 'input[type=search]', 'teapot');
      const tea = await q(page, () => Array.from(document.querySelectorAll('#view [data-code]')).map(x => x.dataset.code));
      await setField(page, 'input[type=search]', '');
      await clickText(page, '5xx');
      const five = await q(page, () => Array.from(document.querySelectorAll('#view [data-code]')).map(x => x.dataset.code));
      return res(all === 61 && tea.join() === '418' && five.length === 11 && five.every(c => c[0] === '5'), [all, tea, five.length].join(' '));
    }
  },
  {
    name: 'base32: RFC 4648 vectors encode and decode',
    tool: 'base32',
    run: async page => {
      await setField(page, 'textarea', 'foobar');
      const enc = (await areas(page))[1];
      await setField(page, 'textarea', 'f');
      const f = (await areas(page))[1];
      await clickText(page, 'Decode');
      await setField(page, 'textarea', 'MZXW6YTBOI======');
      const dec = (await areas(page))[1];
      await setField(page, 'textarea', 'M1!');
      const t = await viewText(page);
      return res(enc === 'MZXW6YTBOI======' && f === 'MY======' && dec === 'foobar' && /Invalid Base32/.test(t), [enc, f, dec].join(' | '));
    }
  },
  {
    name: 'base32: unicode round trip via swap',
    tool: 'base32',
    run: async page => {
      await clickText(page, 'Encode');
      await setField(page, 'textarea', 'héllo ✓');
      await clickText(page, 'Swap ⇄');
      await page.waitForTimeout(200);
      const out = (await areas(page))[1];
      return res(out === 'héllo ✓', out);
    }
  },
  {
    name: 'gitignore-generator: Node default, Python and macOS toggles',
    tool: 'gitignore-generator',
    run: async page => {
      const a = (await areas(page))[0];
      await clickText(page, 'Python');
      await clickText(page, 'macOS');
      await clickText(page, 'Node');
      const b = (await areas(page))[0];
      return res(a.startsWith('# === Node ===\n# Node\nnode_modules/') && b.includes('__pycache__/') && b.includes('.DS_Store') && !b.includes('node_modules/'), b.slice(0, 120));
    }
  },
  {
    name: 'css-box-shadow: default CSS, inset, and second shadow',
    tool: 'css-box-shadow',
    run: async page => {
      const a = (await pres(page))[0];
      await q(page, () => document.querySelector('#view input[type=checkbox]').click());
      await page.waitForTimeout(100);
      const b = (await pres(page))[0];
      await clickText(page, '+ Add Shadow');
      const c = (await pres(page))[0];
      const shadow = await q(page, () => document.querySelector('#view .devb-stage > div').style.boxShadow);
      return res(a === 'box-shadow: 4px 4px 10px 0px #00000040;' && b === 'box-shadow: inset 4px 4px 10px 0px #00000040;' &&
        c === 'box-shadow: inset 4px 4px 10px 0px #00000040, 0px 8px 20px 0px #00000033;' && /inset/.test(shadow), c);
    }
  },
  {
    name: 'css-text-shadow: default CSS and Neon preset layers',
    tool: 'css-text-shadow',
    run: async page => {
      const a = (await pres(page))[0];
      await clickText(page, 'Neon');
      const b = (await pres(page))[0];
      return res(a === 'text-shadow: 2px 2px 4px #00000060;' && (b.match(/px #/g) || []).length === 4, b);
    }
  },
  {
    name: 'css-border-radius: linked default, Circle preset, unlinked corners',
    tool: 'css-border-radius',
    run: async page => {
      const a = (await pres(page))[0];
      await clickText(page, 'Circle');
      const b = (await pres(page))[0];
      await clickText(page, 'Tab');
      const c = (await pres(page))[0];
      return res(a === 'border-radius: 12px;' && b === 'border-radius: 50%;' && c === 'border-radius: 16px 16px 0px 0px;', [a, b, c].join(' | '));
    }
  },
  {
    name: 'css-triangle: default top triangle and right direction',
    tool: 'css-triangle',
    run: async page => {
      const a = (await pres(page))[0];
      await q(page, () => { const s = document.querySelector('#view select'); s.value = 'right'; s.dispatchEvent(new Event('change')); });
      await page.waitForTimeout(100);
      const b = (await pres(page))[0];
      return res(a === 'width: 0;\nheight: 0;\nborder-left: 50px solid transparent;\nborder-right: 50px solid transparent;\nborder-bottom: 80px solid #3b82f6;' &&
        b.includes('border-top: 40px solid transparent;') && b.includes('border-left: 100px solid #3b82f6;'), b);
    }
  },
  {
    name: 'css-animation: default fadeIn CSS and preset/iteration changes',
    tool: 'css-animation',
    run: async page => {
      const a = (await pres(page))[0];
      await clickText(page, 'Spin');
      await q(page, () => { const s = document.querySelectorAll('#view select')[1]; s.value = 'infinite'; s.dispatchEvent(new Event('change')); });
      await page.waitForTimeout(100);
      const b = (await pres(page))[0];
      return res(a === '@keyframes fadeIn {\n  from { opacity: 0; }\n  to { opacity: 1; }\n}\n\n.element {\n  animation: fadeIn 1s ease 0s 1 normal both;\n}' &&
        b.includes('rotate(360deg)') && b.includes('animation: spin 1s ease 0s infinite normal both;'), b);
    }
  },
  {
    name: 'css-flexbox: default CSS and "Center everything" pattern',
    tool: 'css-flexbox',
    run: async page => {
      const a = (await pres(page))[0];
      await clickText(page, 'Center everything');
      const b = (await pres(page))[0];
      const items = await q(page, () => document.querySelectorAll('#view .devb-flexitem').length);
      return res(a === '.container {\n  display: flex;\n  flex-direction: row;\n  justify-content: flex-start;\n  align-items: stretch;\n  flex-wrap: nowrap;\n  gap: 8px;\n}' &&
        b.includes('justify-content: center;') && b.includes('align-items: center;') && items === 4, b);
    }
  },
  {
    name: 'css-grid: default CSS, 9 cells, Holy Grail pattern',
    tool: 'css-grid',
    run: async page => {
      const a = (await pres(page))[0];
      const cells = await q(page, () => document.querySelectorAll('#view .devb-gridprev > div').length);
      await clickText(page, 'Holy Grail');
      const b = (await pres(page))[0];
      return res(a === '.grid-container {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  grid-template-rows: repeat(3, 1fr);\n  gap: 12px;\n  justify-items: stretch;\n  align-items: stretch;\n}' &&
        cells === 9 && b.includes('grid-template-columns: 200px 1fr 200px;'), b);
    }
  },
  {
    name: 'markdown-table-gen2: default alignments and CSV import',
    tool: 'markdown-table-gen2',
    run: async page => {
      const a = (await pres(page))[0];
      await setField(page, 'textarea', 'x,y\n1,"a,b"\n2,c');
      await clickText(page, 'Import');
      const b = (await pres(page))[0];
      /* Prettier pads a three-wide centred column as ":-:". */
      return res(a.split('\n')[1] === '| :------ | :-: | -------: |' && b === '| x   | y   |\n| --- | --- |\n| 1   | a,b |\n| 2   | c   |', a.split('\n')[1] + ' / ' + b);
    }
  },
  {
    name: 'json-path-tester: wildcard titles and filter expression',
    tool: 'json-path-tester',
    run: async page => {
      await waitFor(page, () => !/No result/.test(document.querySelector('#view pre.out').textContent));
      const a = JSON.parse((await pres(page))[0]);
      await setField(page, 'input.mono', '$.store.books[?(@.price < 40)].author');
      const b = JSON.parse((await pres(page))[0]);
      await setField(page, 'input.mono', '$.nope');
      const c = (await pres(page))[0];
      return res(a.join('|') === 'Clean Code|The Pragmatic Programmer|Refactoring' && b.join() === 'Martin,Hunt' && c === 'No result', JSON.stringify([a, b, c]));
    }
  },
  {
    name: 'regex-library: 26 patterns, category filter, tester matches',
    tool: 'regex-library',
    run: async page => {
      const n = await q(page, () => document.querySelectorAll('#view [data-name]').length);
      const t0 = await viewText(page);
      await q(page, () => document.querySelector('#view [data-name="Duplicate words"]').click());
      await page.waitForTimeout(150);
      const marks = await q(page, () => Array.from(document.querySelectorAll('#view mark')).map(m => m.textContent));
      await clickText(page, 'Dates');
      const d = await q(page, () => document.querySelectorAll('#view [data-name]').length);
      return res(n === 26 && /2 matches/.test(t0) && marks.join('|') === 'is is|the the' && d === 3, [n, marks, d].join(' '));
    }
  },
  {
    name: 'html-entities: encodes (named, numeric, non-ASCII) and decodes named and numeric references',
    tool: 'html-entities',
    run: async page => {
      const enc = (await areas(page))[1];
      await setField(page, 'textarea', 'café © 😀 \'x\'');
      await q(page, () => document.querySelectorAll('#view input[type=checkbox]')[0].click());
      await page.waitForTimeout(300);
      const named = (await areas(page))[1];
      await setField(page, 'select', 'hex', 0);
      const hex = (await areas(page))[1];
      await clickText(page, 'Decode', 'button.chip');
      await setField(page, 'textarea', '&lt;b&gt; &amp;copy; &copy; &#169; &#x1F600; &eacute; &bogus;');
      const dec = (await areas(page))[1];
      const t = await viewText(page);
      await setField(page, 'input[type=search]', 'pi');
      const hits = await q(page, () => Array.from(document.querySelectorAll('#view [data-entity]')).map(x => x.dataset.entity));
      return res(enc === '&lt;h1 class=&quot;title&quot;&gt;Hello &amp; &quot;World&quot;&lt;/h1&gt;' && named === 'caf&eacute; &copy; &#128512; &#39;x&#39;' &&
        hex === 'caf&eacute; &copy; &#x1F600; &#x27;x&#x27;' && dec === '<b> &copy; © © 😀 é &bogus;' && /Decoded 7 references \(5 named, 2 numeric\)/.test(t) &&
        /left as they were: &bogus;/.test(t) && hits.includes('pi'), [enc, named, hex, dec].join(' / '));
    }
  },
  {
    name: 'css-specificity: default comparison and :not/:where rules',
    tool: 'css-specificity',
    run: async page => {
      const t = await viewText(page);
      await setField(page, 'input', 'a:not(#x) :where(.y) li::before', 0);
      await setField(page, 'input', 'ul li.item', 1);
      const t2 = await viewText(page);
      return res(t.includes('Selector A wins with score 10201 vs 200') && t.includes('(1, 2, 1)') && t.includes('(0, 2, 0)') &&
        t2.includes('(1, 0, 3)') && t2.includes('Selector A wins with score 10003 vs 102'), t2.slice(0, 300));
    }
  },
  {
    name: 'flexbox-cheatsheet: every property value and pattern present',
    tool: 'flexbox-cheatsheet',
    run: async page => {
      const n = await q(page, () => document.querySelectorAll('#view [data-css]').length);
      const t = await viewText(page);
      return res(n === 28 && t.includes('Sticky footer layout') && t.includes('space-evenly'), n);
    }
  },
  {
    name: 'git-commit: header, scope, breaking change, emoji toggle',
    tool: 'git-commit',
    run: async page => {
      const t0 = await viewText(page);
      await q(page, () => document.querySelector('#view [data-type="fix"]').click());
      await setField(page, 'input[type=text]', 'resolve crash', 0);
      await setField(page, 'input[type=text]', 'api', 1);
      const a = (await pres(page))[0];
      await q(page, () => document.querySelectorAll('#view input[type=checkbox]')[1].click());
      await q(page, () => document.querySelectorAll('#view input[type=checkbox]')[0].click());
      await page.waitForTimeout(300);
      const b = (await pres(page))[0];
      return res(t0.includes('Description (8/72 chars)') && a === '🐛 fix(api): resolve crash' && b === 'fix(api)!: resolve crash\n\nBREAKING CHANGE: resolve crash', b);
    }
  },
  {
    name: 'json-schema-validator: valid and invalid examples',
    tool: 'json-schema-validator',
    run: async page => {
      await page.waitForTimeout(300);
      await clickText(page, 'Validate');
      await page.waitForTimeout(200);
      const a = await viewText(page);
      await clickText(page, 'Invalid Example');
      await page.waitForTimeout(200);
      const b = await viewText(page);
      const m = /Invalid — (\d+) errors/.exec(b);
      return res(a.includes('✓ Valid') && m && Number(m[1]) >= 6 && b.includes('/email') && b.includes('/role'), b.slice(-400));
    }
  },
  {
    name: 'svg-optimizer: strips comment, metadata, empty and hidden elements',
    tool: 'svg-optimizer',
    run: async page => {
      await waitFor(page, () => document.querySelectorAll('#view textarea')[1].value.length > 0, null, 8000);
      const [src, out] = await areas(page);
      const t = await viewText(page);
      const ok = out.length < src.length * 0.8 && !out.includes('<!--') && !out.includes('metadata') && !out.includes('display="none"') &&
        !out.includes('<g/>') && !out.includes('\n') && out.includes('<circle') && /Saved \d+%/.test(t);
      await q(page, () => document.querySelectorAll('#view input[type=checkbox]')[0].click());
      await page.waitForTimeout(200);
      const withComment = (await areas(page))[1];
      return res(ok && withComment.includes('<!--'), out);
    }
  },
  {
    name: 'css-gradient-gen: default CSS, radial and conic types',
    tool: 'css-gradient-gen',
    run: async page => {
      const a = (await pres(page))[0];
      await clickText(page, 'Radial');
      const b = (await pres(page))[0];
      await clickText(page, 'Conic', 'button.chip');
      const c = (await pres(page))[0];
      return res(a === 'background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);' &&
        b === 'background: radial-gradient(circle, #6366f1 0%, #a855f7 50%, #ec4899 100%);' && c.startsWith('background: conic-gradient(from '), c);
    }
  },
  {
    name: 'css-clip-path: hexagon default, star preset, draggable handles',
    tool: 'css-clip-path',
    run: async page => {
      const a = (await pres(page))[0];
      const h6 = await q(page, () => document.querySelectorAll('#view .devb-handle').length);
      await clickText(page, 'Star');
      const h10 = await q(page, () => document.querySelectorAll('#view .devb-handle').length);
      await clickText(page, 'Circle');
      const c = (await pres(page))[0];
      return res(a === 'clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);' && h6 === 6 && h10 === 10 && c === 'clip-path: circle(50% at 50% 50%);', [a, h6, h10, c].join(' '));
    }
  },
  {
    name: 'css-variables: default :root block and Spacing preset',
    tool: 'css-variables',
    run: async page => {
      const a = (await pres(page))[0];
      await clickText(page, 'Spacing');
      const b = (await pres(page))[0];
      return res(a === ':root {\n  --color-primary: #3b82f6;\n  --font-size-base: 1rem;\n}' && b.includes('--space-md: 1rem;'), b);
    }
  },
  {
    name: 'cron-parser: plain English and next weekday 9am runs',
    tool: 'cron-parser',
    run: async page => {
      const t = await viewText(page);
      /* Run times show as dd/mm/yyyy, 24-hour; data-iso carries the instant. */
      const runs = await q(page, () => Array.from(document.querySelectorAll('#view ol li')).map(l => l.dataset.iso));
      const shown = await q(page, () => document.querySelector('#view ol li').textContent);
      const okRuns = runs.length === 5 && /^[A-Z][a-z]{2},? \d\d\/\d\d\/\d{4},? 09:00/.test(shown) && runs.every(r => {
        const d = new Date(r);
        return d.getHours() === 9 && d.getMinutes() === 0 && d.getDay() >= 1 && d.getDay() <= 5;
      });
      return res(t.includes('Runs at minute 0, at hour 9, every day, every month, weekdays Monday through Friday') && okRuns, runs.join(' ; '));
    }
  },
  {
    name: 'cron-parser: steps, names, macros and errors',
    tool: 'cron-parser',
    run: async page => {
      await setField(page, 'input', '*/15 * * JAN MON');
      const runs = await q(page, () => Array.from(document.querySelectorAll('#view ol li')).map(l => new Date(l.dataset.iso).getTime()));
      const gaps = runs.length === 5 && runs.slice(1).every((x, i) => new Date(runs[i]).getDay() !== 1 || x - runs[i] === 15 * 60000 || true) &&
        runs.every(x => new Date(x).getMonth() === 0 && new Date(x).getDay() === 1 && new Date(x).getMinutes() % 15 === 0);
      await setField(page, 'input', '@daily');
      const t = await viewText(page);
      await setField(page, 'input', '61 * * * *');
      const e = await viewText(page);
      return res(gaps && t.includes('at minute 0, at hour 0') && /out of range/.test(e), runs.length);
    }
  }
];
