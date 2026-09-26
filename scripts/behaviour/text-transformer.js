/* Behaviour checks for the Text Transformer. The first group are the checks
   of the twelve tools it replaced, rewritten to run through it: each keeps
   the old tool's id, so the harness opens #/t/<old id>, which redirects to
   #/t/text-transformer?tab=<step>, and the check also proves the preset
   opened with its step (and the old sample text) in place. Expected values
   are the ones the old tools gave, worked out by hand from their rules.
   Step controls are addressed as [data-step="i"] [data-k="…"]. */
'use strict';

const Q = k => `#view [data-k="${k}"]`;
const S = (k, i = 0) => `#view [data-step="${i}"] [data-k="${k}"]`;
async function read(page, sel) {
  return page.$eval(sel, n => (/^(TEXTAREA|INPUT|SELECT)$/.test(n.tagName) ? n.value : n.innerText));
}
/* textContent, so a trailing new line in the output survives. */
const out = page => page.$eval(Q('out'), n => n.textContent);
const get = (page, k, i = 0) => read(page, S(k, i));
async function fill(page, sel, v) {
  await page.$eval(sel, (n, v) => {
    n.value = v;
    n.dispatchEvent(new Event('input', { bubbles: true }));
    n.dispatchEvent(new Event('change', { bubbles: true }));
  }, v);
  await page.waitForTimeout(260);
}
const setIn = (page, v) => fill(page, Q('in'), v);
const set = (page, k, v, i = 0) => fill(page, S(k, i), v);
async function tick(page, k, on, i = 0) {
  await page.$eval(S(k, i), (n, on) => { n.checked = on; n.dispatchEvent(new Event('change', { bubbles: true })); n.dispatchEvent(new Event('input', { bubbles: true })); }, on);
  await page.waitForTimeout(260);
}
async function chip(page, k, label, i = 0) {
  await page.$$eval(S(k, i) + ' button', (bs, label) => { const b = bs.find(x => x.textContent.trim() === label); if (!b) throw new Error('no chip ' + label); b.click(); }, label);
  await page.waitForTimeout(260);
}
/* A button inside step i, by its text. */
async function stepBtn(page, label, i = 0) {
  await page.$$eval(`#view [data-step="${i}"] button`, (bs, label) => { const b = bs.find(x => x.textContent.trim() === label); if (!b) throw new Error('no button ' + label); b.click(); }, label);
  await page.waitForTimeout(260);
}
async function addStep(page, type) {
  await page.selectOption(Q('add'), type);
  await page.$$eval('#view button', bs => bs.find(x => x.textContent.trim() === 'Add step').click());
  await page.waitForTimeout(200);
}
const order = page => page.$$eval('#view [data-k="steps"] > li', ns => ns.map(n => n.dataset.step + ':' + n.dataset.type).join(','));
const res = (ok, detail) => ({ ok: !!ok, detail: String(detail).slice(0, 220) });
const eq = (got, want) => res(got === want, JSON.stringify(got));

module.exports = [
  /* ------------------------------------------------ the retired tools' checks */
  { name: 'text-case: default and snake/camel of new input', tool: 'text-case', run: async page => {
    const d = await get(page, 'case-alternating'), o = await out(page);
    if (d !== 'hElLo wOrLd eXaMpLe tExT' || o !== 'HELLO WORLD EXAMPLE TEXT') return res(false, d + ' / ' + o);
    await setIn(page, 'user ID-number');
    const a = await get(page, 'case-snake'), b = await get(page, 'case-camel'), c = await get(page, 'case-inverse');
    await set(page, 'to', 'kebab');
    const k = await out(page);
    return res(a === 'user_id_number' && b === 'userIdNumber' && c === 'USER id-NUMBER' && k === 'user-id-number', [a, b, c, k].join(' | '));
  } },
  { name: 'text-reverse: characters, then word order', tool: 'text-reverse', run: async page => {
    await setIn(page, 'abc\ndef');
    const a = await out(page);
    await setIn(page, 'one two three');
    await chip(page, 'what', 'Word order in each line');
    const b = await out(page);
    await setIn(page, 'a b\nc d');
    await chip(page, 'what', 'Line order');
    const c = await out(page);
    await chip(page, 'what', 'Line and word order');
    const d = await out(page);
    return res(a === 'fed\ncba' && b === 'three two one' && c === 'c d\na b' && d === 'd c\nb a', [a, b, c, d].map(x => JSON.stringify(x)).join(' / '));
  } },
  { name: 'text-truncate: chars default, words and sentences', tool: 'text-truncate', run: async page => {
    const i = await get(page, 'info');
    await set(page, 'by', 'words'); await set(page, 'limit', '3');
    const w = await out(page);
    await set(page, 'by', 'sentences'); await set(page, 'limit', '1'); await set(page, 'suffix', ' […]');
    const s = await out(page);
    return res(i.startsWith('103 chars · 18 words') && w === 'The quick brown...' && s === 'The quick brown fox jumps over the lazy dog. […]', [i, w, s].join(' | '));
  } },
  { name: 'text-repeat: 3 times with comma separator', tool: 'text-repeat', run: async page => {
    const d = await get(page, 'info');
    await set(page, 'count', '3'); await set(page, 'sep', ', '); await setIn(page, 'ab');
    return res(d === '5× · 59 chars' && (await out(page)) === 'ab, ab, ab', d);
  } },
  { name: 'text-wrap: wraps at 10 with line numbers', tool: 'text-wrap', run: async page => {
    await setIn(page, 'aaa bbb ccc ddd');
    await set(page, 'width', '10');
    const a = await out(page);
    await tick(page, 'nums', true);
    const b = await out(page);
    return res(a === 'aaa bbb\nccc ddd' && b === '1  aaa bbb\n2  ccc ddd', a + ' / ' + b);
  } },
  { name: 'text-wrap: HTML <br> mode, re-flow, long words and the ruler (was Word Wrap / Line Breaker)', tool: 'text-wrap', run: async page => {
    await set(page, 'width', '20'); await chip(page, 'mode', 'HTML <br>');
    await setIn(page, 'one two three four five six seven');
    const o = await out(page), i = await get(page, 'info');
    await page.$eval('#view [data-step="0"] details', d => { d.open = true; });
    await page.waitForTimeout(150);
    const ruler = await page.$eval('#view [data-step="0"] details pre', n => n.textContent);
    await chip(page, 'mode', 'Hard line breaks'); await tick(page, 'reflow', true); await setIn(page, 'aaa\nbbb ccc\n\nddd');
    const f = await out(page);
    await tick(page, 'reflow', false); await set(page, 'width', '10'); await setIn(page, 'abcdefghijkl');
    const brk = await out(page);
    await tick(page, 'brk', false);
    const keep = await out(page);
    return res(o === 'one two three four<br>\nfive six seven' && i === 'Lines: 2 · Longest line: 18 · Target width: 20' && /\n {19}\^ column 20$/.test(ruler) &&
      f === 'aaa bbb ccc\n\nddd' && brk === 'abcdefghij\nkl' && keep === 'abcdefghijkl', [JSON.stringify(o), i, JSON.stringify(f), JSON.stringify(brk), JSON.stringify(ruler.slice(-30))].join(' | '));
  } },
  { name: 'text-number-lines: start 9, zero-pad, colon', tool: 'text-number-lines', run: async page => {
    await setIn(page, 'a\nb\n\nc');
    await set(page, 'start', '9'); await set(page, 'sep', ': ');
    await tick(page, 'pad', true); await tick(page, 'skip', true);
    return eq(await out(page), '09: a\n10: b\n\n11: c');
  } },
  { name: 'text-padding: centre with asterisks', tool: 'text-padding', run: async page => {
    await setIn(page, 'ab\nabcd'); await set(page, 'width', '7'); await set(page, 'ch', '*'); await set(page, 'align', 'centre');
    return eq(await out(page), '**ab***\n*abcd**');
  } },
  { name: 'text-replacer: literal default, regex rule with groups, bad regex reported', tool: 'text-replacer', run: async page => {
    const d = await out(page), di = await get(page, 'info');
    await stepBtn(page, '+ Add rule');
    await page.$$eval('#view [data-step="0"] [data-k="rules"] .tt-rule', rows => {
      const ins = rows[1].querySelectorAll('input');
      ins[0].value = '(\\w+) again'; ins[1].value = '$1 once more'; ins[2].checked = true;
      ins[0].dispatchEvent(new Event('input')); ins[1].dispatchEvent(new Event('input')); ins[2].dispatchEvent(new Event('change'));
    });
    await page.waitForTimeout(260);
    const o = await out(page), oi = await get(page, 'info');
    await page.$eval('#view [data-step="0"] [data-k="rules"] .tt-rule:nth-child(2) [data-k="find"]', n => { n.value = '(unclosed'; n.dispatchEvent(new Event('input')); });
    await page.waitForTimeout(260);
    const bad = await page.$eval(S('info'), n => n.className + ' ' + n.textContent);
    return res(d === 'Hi World!\nThe quick brown fox jumps over the lazy dog.\nHi again, World!' && di === '2 replacements' &&
      o.endsWith('Hi once more, World!') && oi === '3 replacements' && /\berr\b.*Rule 2:/.test(bad), [o, oi, bad].join(' | '));
  } },
  { name: 'text-cleaner: smart quotes, dashes, tags, ellipsis', tool: 'text-cleaner', run: async page => {
    await setIn(page, '  “Hi”—there…   <b>bold</b>\r\n\r\n next  ');
    const a = await out(page);
    await tick(page, 'punct', true);
    const b = await out(page);
    return res(a === '"Hi"-there... bold\nnext' && b === 'Hithere bold\nnext', JSON.stringify(a) + ' / ' + JSON.stringify(b));
  } },
  { name: 'text-cleaner: whitespace fixes and remove all spaces (was Remove Extra Spaces)', tool: 'text-cleaner', run: async page => {
    /* 69 characters in, 49 out */
    await setIn(page, '  Hello   World  \n  This   has   extra   spaces  \n\n\nAnd blank lines  ');
    const a = await out(page), d = await get(page, 'info');
    await tick(page, 'allspaces', true);
    const b = await out(page);
    await stepBtn(page, 'Whitespace only'); await setIn(page, '<b>x</b>  “y”');
    const c = await out(page);
    return res(a === 'Hello World\nThis has extra spaces\nAnd blank lines' && d === '−20 characters (69 → 49)' && b === 'HelloWorld\nThishasextraspaces\nAndblanklines' && c === '<b>x</b> “y”', [a, d, b, c].join(' | '));
  } },
  { name: 'duplicate-lines: remove, extract, keep-last and highlight', tool: 'duplicate-lines', run: async page => {
    const a = await out(page);
    await chip(page, 'mode', 'Extract duplicates');
    const b = await out(page);
    await chip(page, 'mode', 'Remove duplicates');
    await tick(page, 'cs', true); await tick(page, 'first', false);
    const c = await out(page);
    await tick(page, 'cs', false); await chip(page, 'mode', 'Highlight duplicates');
    const h = await out(page), marked = await page.$$eval(S('hl') + ' span.hl', ns => ns.map(n => n.textContent).join('|'));
    return res(a === 'apple\nbanana\ncherry\ndates' && b === 'apple\nbanana\ncherry' && c === 'Apple\ncherry\nbanana\ndates\nCherry\napple' &&
      h === 'apple\nbanana\nApple\ncherry\nbanana\ndates\nCherry\napple' && marked === 'apple   (×3)|banana   (×2)|Apple   (×3)|cherry   (×2)|banana   (×2)|Cherry   (×2)|apple   (×3)',
    [a, b, c, marked].join(' | '));
  } },
  { name: 'duplicate-lines: counts, trimming and case (was Remove Duplicates)', tool: 'duplicate-lines', run: async page => {
    await tick(page, 'cs', true);
    await setIn(page, 'apple\nbanana\napple\ncherry\nbanana\ndate');
    const i = await get(page, 'info');
    await setIn(page, 'x\nX\n y\ny');
    const a = await out(page);
    await tick(page, 'cs', false);
    const b = await out(page);
    await setIn(page, 'pear\n\nfig\n\npear\nApple'); await tick(page, 'blank', true); await tick(page, 'sort', true);
    const c = await out(page);
    return res(i === '2 duplicates found · 4 unique · 2 removed' && a === 'x\nX\ny' && b === 'x\ny' && c === 'Apple\nfig\npear', [i, a, b, c].join(' | '));
  } },
  { name: 'text-sorter: longest first and 9 → 1', tool: 'text-sorter', run: async page => {
    await chip(page, 'mode', 'Longest first');
    const a = (await out(page)).split('\n')[0];
    await setIn(page, 'item 2\nitem 10\nitem 1');
    await chip(page, 'mode', '9 → 1');
    const b = await out(page);
    return res(a === 'elderberry' && b === 'item 10\nitem 2\nitem 1', a + ' / ' + b);
  } },
  { name: 'text-sorter: numeric, dedupe, natural order (was Text Sort)', tool: 'text-sorter', run: async page => {
    await setIn(page, 'b10\na2\nc1\na2');
    await chip(page, 'mode', '1 → 9');
    const n = await out(page);
    await tick(page, 'dd', true); await chip(page, 'mode', '9 → 1');
    const r = await out(page);
    await tick(page, 'dd', false); await setIn(page, 'file10\nfile2\nFile1'); await chip(page, 'mode', 'A → Z');
    const nat = await out(page);
    await tick(page, 'natural', false);
    const plain = await out(page);
    await setIn(page, 'x\n3\n10'); await chip(page, 'mode', '9 → 1');
    const last = await out(page);
    return res(n === 'c1\na2\na2\nb10' && r === 'b10\na2\nc1' && nat === 'File1\nfile2\nfile10' && plain === 'File1\nfile10\nfile2' && last === '10\n3\nx', [n, r, nat, plain, last].join(' | '));
  } },
  { name: 'text-prefix-suffix: {n} counter, start/step/padding, blank lines, trim and presets', tool: 'text-prefix-suffix', run: async page => {
    await setIn(page, 'apple\n\nbanana'); await set(page, 'prefix', '{n}. '); await set(page, 'suffix', ';');
    const a = await out(page), i = await get(page, 'info');
    await set(page, 'start', '8'); await set(page, 'step', '2'); await set(page, 'pad', '3');
    const b = await out(page);
    await setIn(page, '  x  \n'); await tick(page, 'trim', true);
    await page.$$eval(S('presets') + ' button', bs => bs.find(x => x.textContent === '[…]').click()); await page.waitForTimeout(260);
    const c = await out(page), p = (await get(page, 'prefix')) + (await get(page, 'suffix'));
    await tick(page, 'skip', false);
    const d = await out(page);
    return res(a === '1. apple;\n\n2. banana;' && i === '2 lines changed' && b === '008. apple;\n\n010. banana;' && c === '[x]\n' && p === '[]' && d === '[x]\n[]',
      [a, i, b, JSON.stringify(c), JSON.stringify(d)].join(' | '));
  } },

  /* ------------------------------------------------ the pipeline itself */
  { name: 'text-transformer: opens with no steps and a prompt; output and counts follow the input', tool: 'text-transformer', run: async page => {
    const steps = await order(page);
    const prompt = await page.$eval('#view .tt-empty', n => !n.hidden && /No steps yet/.test(n.textContent));
    await setIn(page, 'a b\nc');
    const o = await out(page), c = await read(page, Q('count'));
    return res(steps === '' && prompt && o === 'a b\nc' && c === '2 lines · 3 words · 5 characters', [steps, prompt, JSON.stringify(o), c].join(' | '));
  } },
  { name: 'text-transformer: four stacked steps run top to bottom', tool: 'text-transformer', run: async page => {
    await setIn(page, '  pear\napple\nPear  \n\nfig   tree');
    await addStep(page, 'clean');
    const a = await out(page);
    await addStep(page, 'duplicates');
    const b = await out(page);
    await addStep(page, 'sort');
    const c = await out(page);
    await addStep(page, 'case'); await set(page, 'to', 'title', 3);
    const d = await out(page), steps = await order(page), count = await read(page, Q('count'));
    const hidden = await page.$eval('#view .tt-empty', n => n.hidden);
    return res(a === 'pear\napple\nPear\nfig tree' && b === 'pear\napple\nfig tree' && c === 'apple\nfig tree\npear' && d === 'Apple\nFig Tree\nPear' &&
      steps === '0:clean,1:duplicates,2:sort,3:case' && count === '3 lines · 4 words · 19 characters' && hidden, [a, b, c, d, steps, count].map(x => JSON.stringify(x)).join(' | '));
  } },
  { name: 'text-transformer: steps move up and down from the keyboard', tool: 'text-transformer', run: async page => {
    await setIn(page, 'b\na');
    await addStep(page, 'sort'); await addStep(page, 'number-lines'); await addStep(page, 'reverse');
    await chip(page, 'what', 'Line order', 2);
    const start = await out(page);
    /* Move Reverse up one: sort, reverse, number. */
    await page.focus('#view [data-step="2"] .tt-move button:nth-child(1)');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    const moved = await out(page), steps1 = await order(page);
    const focus = await page.evaluate(() => { const a = document.activeElement; return a.closest('[data-step]').dataset.type + ' ' + a.getAttribute('aria-label'); });
    /* Move Sort down one: reverse, sort, number. */
    await page.focus('#view [data-step="0"] .tt-move button:nth-child(2)');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    const again = await out(page), steps2 = await order(page);
    const edges = await page.$$eval('#view [data-k="steps"] > li', ns => ns.map(n => { const b = n.querySelectorAll('.tt-move button'); return (b[0].disabled ? 'U' : 'u') + (b[1].disabled ? 'D' : 'd'); }).join(','));
    return res(start === '2. b\n1. a' && moved === '1. b\n2. a' && steps1 === '0:sort,1:reverse,2:number-lines' && focus === 'reverse Move step 2, Reverse up' &&
      again === '1. a\n2. b' && steps2 === '0:reverse,1:sort,2:number-lines' && edges === 'Ud,ud,uD', [start, moved, steps1, focus, again, steps2, edges].map(x => JSON.stringify(x)).join(' | '));
  } },
  { name: 'text-transformer: removing steps, down to none', tool: 'text-transformer', run: async page => {
    await setIn(page, 'b\na\nb');
    await addStep(page, 'duplicates'); await addStep(page, 'sort'); await addStep(page, 'prefix-suffix');
    const a = await out(page);
    await page.click('#view [data-step="1"] .tt-move button:nth-child(3)');
    await page.waitForTimeout(200);
    const b = await out(page), steps = await order(page);
    await page.click('#view [data-step="0"] .tt-move button:nth-child(3)');
    await page.click('#view [data-step="0"] .tt-move button:nth-child(3)');
    await page.waitForTimeout(200);
    const c = await out(page), left = await order(page), prompt = await page.$eval('#view .tt-empty', n => !n.hidden);
    return res(a === '"a",\n"b",' && b === '"b",\n"a",' && steps === '0:duplicates,1:prefix-suffix' && c === 'b\na\nb' && left === '' && prompt,
      [a, b, steps, c, left, prompt].map(x => JSON.stringify(x)).join(' | '));
  } },
  { name: 'text-transformer: steps copied as a link reopen with their options', tool: 'text-transformer', run: async page => {
    await page.evaluate(() => { window.__copied = null; navigator.clipboard.writeText = t => { window.__copied = t; return Promise.resolve(); }; });
    await addStep(page, 'replace');
    await set(page, 'find', 'cat', 0); await set(page, 'rep', 'dog', 0);
    await addStep(page, 'wrap'); await set(page, 'width', '12', 1);
    await page.$$eval('#view button', bs => bs.find(x => x.textContent.trim() === 'Copy steps as a link').click());
    await page.waitForTimeout(200);
    const link = await page.evaluate(() => window.__copied);
    await page.goto('about:blank');
    await page.goto(link, { waitUntil: 'load' });
    await page.waitForTimeout(200);
    await setIn(page, 'the cat sat on the cat mat');
    const o = await out(page), steps = await order(page), w = await get(page, 'width', 1);
    return res(/#\/t\/text-transformer\?steps=/.test(link) && steps === '0:replace,1:wrap' && w === '12' && o === 'the dog sat\non the dog\nmat', [link, steps, w, JSON.stringify(o)].join(' | '));
  } },
  { name: 'text-transformer: retired tools are shortcuts that open their preset', tool: 'text-transformer', run: async page => {
    const got = await page.evaluate(() => ({
      hrefs: ['duplicate-lines', 'text-prefix-suffix', 'text-sort', 'word-wrapper', 'text-remove-spaces'].map(id => Tools.href(id)).join(','),
      gone: ['text-case', 'text-cleaner', 'text-replacer'].filter(id => Tools.get(id)).length,
      found: Tools.search('remove duplicate lines', 3).map(t => t.id).join(',')
    }));
    return res(got.hrefs === '#/t/text-transformer?tab=duplicates,#/t/text-transformer?tab=prefix-suffix,#/t/text-transformer?tab=sort,#/t/text-transformer?tab=wrap,#/t/text-transformer?tab=clean' &&
      got.gone === 0 && got.found.split(',')[0] === 'duplicate-lines', JSON.stringify(got));
  } }
];
