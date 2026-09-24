/* Behaviour checks for the text-b tools, and for the features merged into
   text.js survivors today (Word Counter, Lorem Ipsum, Slug Generator, Remove
   Duplicate Lines, Sort Lines, Word Wrap, Word Frequency, Text Cleaner).
   Expected values are worked out by hand from the rules or formulas named in
   each check. Elements are addressed through data-k attributes. */
'use strict';

const Q = k => `#view [data-k="${k}"]`;
const U = String.fromCodePoint;
async function get(page, k) {
  return page.$eval(Q(k), n => (/^(TEXTAREA|INPUT|SELECT)$/.test(n.tagName) ? n.value : n.innerText));
}
async function set(page, k, v) {
  await page.$eval(Q(k), (n, v) => {
    n.value = v;
    n.dispatchEvent(new Event('input', { bubbles: true }));
    n.dispatchEvent(new Event('change', { bubbles: true }));
  }, v);
  await page.waitForTimeout(260);
}
async function tick(page, k, on) {
  await page.$eval(Q(k), (n, on) => { n.checked = on; n.dispatchEvent(new Event('change', { bubbles: true })); n.dispatchEvent(new Event('input', { bubbles: true })); }, on);
  await page.waitForTimeout(260);
}
async function chip(page, k, label) {
  await page.$$eval(Q(k) + ' button', (bs, label) => { const b = bs.find(x => x.textContent.trim() === label); if (!b) throw new Error('no chip ' + label); b.click(); }, label);
  await page.waitForTimeout(260);
}
async function clickBtn(page, label) {
  await page.$$eval('#view button', (bs, label) => { const b = bs.find(x => x.textContent.trim() === label); if (!b) throw new Error('no button ' + label); b.click(); }, label);
  await page.waitForTimeout(260);
}
async function pieces(page) { return page.$$eval('#view [data-k="chunks"] pre', ns => ns.map(n => n.textContent)); }
async function words(page) { return page.$$eval('#view [data-k="results"] .gb-word', ns => ns.map(n => n.dataset.w)); }
const flat = s => s.replace(/\s+/g, ' ').trim();
const res = (ok, detail) => ({ ok: !!ok, detail: String(detail).slice(0, 220) });

module.exports = [
  /* ---------------------------------------------------------- Word Counter */
  { name: 'word-count: readability scores match the published formulas', tool: 'word-count', run: async page => {
    /* 17 words, 3 sentences, 32 syllables by dictionary (Read-ing, use-ful, hab-it, Chil-dren, of-ten, be-come, bet-ter, writ-ers,
       Ed-u-ca-tion, im-por-tant, ev-ery-one), 91 letters, 3 words of 3+ syllables:
       Flesch 206.835-1.015*17/3-84.6*32/17 = 41.8; F-K 0.39*17/3+11.8*32/17-15.59 = 8.8; Fog 0.4*(17/3+100*3/17) = 9.3;
       SMOG 1.043*sqrt(3*30/3)+3.1291 = 8.8; ARI 4.71*91/17+0.5*17/3-21.43 = 6.6; Coleman-Liau 0.0588*535.29-0.296*17.65-15.8 = 10.5 */
    await set(page, 'in', 'Reading is a useful habit. Children who read often become better writers. Education is important for everyone.');
    const got = {};
    for (const k of ['fre', 'fk', 'fog', 'smog', 'ari', 'cli', 'syllables', 'words', 'sentences']) got[k] = await get(page, k);
    const want = { fre: '41.8', fk: '8.8', fog: '9.3', smog: '8.8', ari: '6.6', cli: '10.5', syllables: '32', words: '17Words', sentences: '3Sentences' };
    const ok = Object.keys(want).every(k => got[k].replace(/\s+/g, '') === want[k]);
    return res(ok, JSON.stringify(got));
  } },
  { name: 'word-count: reading, speaking and scanning time follow the speed', tool: 'word-count', run: async page => {
    /* 476 words: 476/238 = 2 min; 476/150 = 3.173 min = 3 min 10 sec; 476/700 min = 40.8 s; at 400 wpm 71.4 s */
    await set(page, 'in', Array(476).fill('word').join(' '));
    const r = flat(await get(page, 't-read')), s = flat(await get(page, 't-speak')), c = flat(await get(page, 't-scan'));
    await set(page, 'wpmnum', '400');
    const f = flat(await get(page, 't-read'));
    return res(r === '2 min Reading time' && s === '3 min 10 sec Speaking time' && c === '41 sec Scanning time' && f === '1 min 11 sec Reading time', [r, s, c, f].join(' | '));
  } },
  { name: 'word-count: opening a text file counts it (was File Statistics)', tool: 'word-count', run: async page => {
    await page.setInputFiles('#view input[type=file]', { name: 'sample.txt', mimeType: 'text/plain', buffer: Buffer.from('Hello world\nSecond line\n') });
    await page.waitForFunction(() => /sample\.txt/.test(document.querySelector('#view [data-k="file"]').textContent), null, { timeout: 10000 });
    const t = flat(await get(page, 'stats')), note = await get(page, 'file');
    const avg = await get(page, 'avg-word'), line = await get(page, 'long-line'), uniq = await get(page, 'unique');
    return res(/^4 Words 24 Characters 20 Characters \(no spaces\) 24 Graphemes \d+ Sentences 1 Paragraphs 3 Lines 24 UTF-8 bytes$/.test(t) &&
      /24 bytes · text\/plain/.test(note) && avg === '5.0 characters' && line === '11 characters' && uniq === '4', [t, note, avg, line, uniq].join(' | '));
  } },
  { name: 'word-count: graphemes, bytes and character types', tool: 'word-count', run: async page => {
    /* thumbs up + medium skin tone: 1 grapheme, 2 code points, 4+4 UTF-8 bytes */
    await set(page, 'in', U(0x1F44D, 0x1F3FD));
    const g = flat(await get(page, 'graphemes')), c = flat(await get(page, 'chars')), b = flat(await get(page, 'bytes'));
    await set(page, 'in', 'Ab1 !€' + U(0x1F600));
    const types = await page.$$eval('#view [data-k="types"] tbody tr', rs => rs.map(r => r.children[0].textContent + '=' + r.children[1].textContent).join(','));
    return res(g === '1 Graphemes' && c === '2 Characters' && b === '8 UTF-8 bytes' &&
      types === 'Letters=2,Upper case=1,Lower case=1,Digits=1,Spaces and tabs=1,Line breaks=0,Punctuation=1,Symbols=1,Emoji=1,Other (accents, joiners, controls)=0', [g, c, b, types].join(' | '));
  } },
  { name: 'word-count: top words skip common words, longest words listed', tool: 'word-count', run: async page => {
    await set(page, 'in', 'the cat and the hat and the extraordinary bat');
    const a = flat(await get(page, 'top'));
    await tick(page, 'skip', false);
    const b = flat(await get(page, 'top')), l = flat(await get(page, 'longest'));
    return res(/^# Word Count 1 cat 1 2 hat 1 3 extraordinary 1 4 bat 1$/i.test(a) && /^# Word Count 1 the 3 2 and 2/i.test(b) && /^# Word Length 1 extraordinary 13 characters/i.test(l), [a, b, l].join(' | '));
  } },

  /* ------------------------------------------------------------ merges */
  { name: 'text-lorem: hipster style, 7 words in <p> (was Lorem Ipsum Pro)', tool: 'text-lorem', run: async page => {
    await chip(page, 'style', 'Hipster'); await chip(page, 'type', 'Words');
    await set(page, 'count', '7'); await tick(page, 'p', true);
    const o = await get(page, 'out'), i = await get(page, 'info');
    const disabled = await page.$eval(Q('start'), n => n.disabled);
    return res(/^<p>(\S+ ){6}\S+<\/p>$/.test(o) && !/lorem/i.test(o) && /^7 words/.test(i) && disabled, o + ' | ' + i);
  } },
  { name: 'slug-generator: accents, &, custom separator, length and little words (was Text to Slug)', tool: 'slug-generator', run: async page => {
    await set(page, 'in', 'Crème Brûlée & Café!');
    const a = await get(page, 'out');
    await chip(page, 'sep', 'Custom'); await set(page, 'custom', '+');
    const b = await get(page, 'out');
    await chip(page, 'sep', '-'); await set(page, 'max', '14');
    const c = await get(page, 'out');
    await set(page, 'max', '0'); await tick(page, 'stop', true); await set(page, 'in', 'The Art of War');
    const d = await get(page, 'out');
    return res(a === 'creme-brulee-and-cafe' && b === 'creme+brulee+and+cafe' && c === 'creme-brulee' && d === 'art-war', [a, b, c, d].join(' | '));
  } },
  { name: 'duplicate-lines: counts, trimming and case (was Remove Duplicates)', tool: 'duplicate-lines', run: async page => {
    await tick(page, 'cs', true);
    await set(page, 'in', 'apple\nbanana\napple\ncherry\nbanana\ndate');
    const i = await get(page, 'info');
    await set(page, 'in', 'x\nX\n y\ny');
    const a = await get(page, 'out');
    await tick(page, 'cs', false);
    const b = await get(page, 'out');
    await set(page, 'in', 'pear\n\nfig\n\npear\nApple'); await tick(page, 'blank', true); await tick(page, 'sort', true);
    const c = await get(page, 'out');
    return res(i === '4 unique · 2 removed' && a === 'x\nX\ny' && b === 'x\ny' && c === 'Apple\nfig\npear', [i, a, b, c].join(' | '));
  } },
  { name: 'text-sorter: numeric, dedupe, natural order (was Text Sort)', tool: 'text-sorter', run: async page => {
    await set(page, 'in', 'b10\na2\nc1\na2');
    await chip(page, 'mode', '1 → 9');
    const n = await get(page, 'out');
    await tick(page, 'dd', true); await chip(page, 'mode', '9 → 1');
    const r = await get(page, 'out');
    await tick(page, 'dd', false); await set(page, 'in', 'file10\nfile2\nFile1'); await chip(page, 'mode', 'A → Z');
    const nat = await get(page, 'out');
    await tick(page, 'natural', false);
    const plain = await get(page, 'out');
    await set(page, 'in', 'x\n3\n10'); await chip(page, 'mode', '9 → 1');
    const last = await get(page, 'out');
    return res(n === 'c1\na2\na2\nb10' && r === 'b10\na2\nc1' && nat === 'File1\nfile2\nfile10' && plain === 'File1\nfile10\nfile2' && last === '10\n3\nx', [n, r, nat, plain, last].join(' | '));
  } },
  { name: 'text-wrap: HTML <br> mode, re-flow and long words (was Word Wrap / Line Breaker)', tool: 'text-wrap', run: async page => {
    await set(page, 'width', '20'); await chip(page, 'mode', 'HTML <br>');
    await set(page, 'in', 'one two three four five six seven');
    const o = await get(page, 'out'), i = await get(page, 'info');
    await chip(page, 'mode', 'Hard line breaks'); await tick(page, 'reflow', true); await set(page, 'in', 'aaa\nbbb ccc\n\nddd');
    const f = await get(page, 'out');
    await tick(page, 'reflow', false); await set(page, 'width', '10'); await set(page, 'in', 'abcdefghijkl');
    const brk = await get(page, 'out');
    await tick(page, 'break', false);
    const keep = await get(page, 'out');
    return res(o === 'one two three four<br>\nfive six seven' && i === 'Lines: 2 · Longest line: 18 · Target width: 20' && f === 'aaa bbb ccc\n\nddd' &&
      brk === 'abcdefghij\nkl' && keep === 'abcdefghijkl', [JSON.stringify(o), i, JSON.stringify(f), JSON.stringify(brk)].join(' | '));
  } },
  { name: 'word-frequency-map: share of the whole text column (was Word Frequency, SEO)', tool: 'word-frequency-map', run: async page => {
    /* 15 words: fox and dog 2 each = 13.3%, the 4 = 26.7% */
    await set(page, 'min', '1'); await set(page, 'in', 'The quick brown fox jumps over the lazy dog. The dog barked at the fox.');
    const t = await get(page, 'table'), all = await get(page, 'all');
    await tick(page, 'stop', false);
    const u = await get(page, 'table');
    return res(/\tfox\t2\t\d+\.\d%\t13\.3%/.test(t) && /\tdog\t2\t\d+\.\d%\t13\.3%/.test(t) && /1\tthe\t4\t26\.7%\t26\.7%/.test(u) && all === '15 words in the whole text', t.slice(0, 120) + ' | ' + all);
  } },
  { name: 'text-cleaner: whitespace fixes and remove all spaces (was Remove Extra Spaces)', tool: 'text-cleaner', run: async page => {
    /* 69 characters in, 49 out */
    await set(page, 'in', '  Hello   World  \n  This   has   extra   spaces  \n\n\nAnd blank lines  ');
    const a = await get(page, 'out'), d = await get(page, 'delta');
    await tick(page, 'allspaces', true);
    const b = await get(page, 'out');
    await clickBtn(page, 'Whitespace only'); await set(page, 'in', '<b>x</b>  “y”');
    const c = await get(page, 'out');
    return res(a === 'Hello World\nThis has extra spaces\nAnd blank lines' && d === '−20 characters (69 → 49)' && b === 'HelloWorld\nThishasextraspaces\nAndblanklines' && c === '<b>x</b> “y”', [a, d, b, c].join(' | '));
  } },

  /* ------------------------------------------------ Add Prefix & Suffix */
  { name: 'text-prefix-suffix: {n} counter, start/step/padding, blank lines, trim and presets', tool: 'text-prefix-suffix', run: async page => {
    await set(page, 'in', 'apple\n\nbanana'); await set(page, 'prefix', '{n}. '); await set(page, 'suffix', ';');
    const a = await get(page, 'out'), i = await get(page, 'info');
    await set(page, 'start', '8'); await set(page, 'step', '2'); await set(page, 'pad', '3');
    const b = await get(page, 'out');
    await set(page, 'in', '  x  \n'); await tick(page, 'trim', true);
    await page.$$eval(Q('presets') + ' button', bs => bs.find(x => x.textContent === '[…]').click()); await page.waitForTimeout(200);
    const c = await get(page, 'out');
    await tick(page, 'skip', false);
    const d = await get(page, 'out');
    return res(a === '1. apple;\n\n2. banana;' && i === '2 lines changed' && b === '008. apple;\n\n010. banana;' && c === '[x]\n' && d === '[x]\n[]', [a, i, b, JSON.stringify(c), JSON.stringify(d)].join(' | '));
  } },

  /* ------------------------------------------------ List & Delimiter Converter */
  { name: 'list-converter: JSON, SQL IN, Python, CSV, Markdown and numbered presets', tool: 'list-converter', run: async page => {
    const preset = async label => { await page.$$eval(Q('presets') + ' button', (bs, l) => bs.find(x => x.textContent === l).click(), label); await page.waitForTimeout(250); return get(page, 'out'); };
    await set(page, 'in', 'apple\nbanana split\nsay "hi"\n\napple'); await tick(page, 'dedupe', true);
    const json = await preset('JSON array');
    let parsed = null; try { parsed = JSON.parse(json); } catch (e) { /* reported below */ }
    await set(page, 'in', "O'Brien\nSmith\n42");
    const sql = await preset('SQL IN (…)');
    await tick(page, 'bare', true);
    const sqlBare = await get(page, 'out');
    await tick(page, 'bare', false);
    const py = await preset('Python list');
    await set(page, 'in', 'a\nb,c\nd"e');
    const csv = await preset('CSV row');
    await set(page, 'in', 'x\ny');
    const md = await preset('Markdown bullets'), num = await preset('Numbered list');
    const ok = JSON.stringify(parsed) === JSON.stringify(['apple', 'banana split', 'say "hi"']) && sql === "IN ('O''Brien', 'Smith', '42')" &&
      sqlBare === "IN ('O''Brien', 'Smith', 42)" && py === "['O\\'Brien', 'Smith', '42']" && csv === 'a,"b,c","d""e"' && md === '- x\n- y' && num === '1. x\n2. y';
    return res(ok, [json, sql, sqlBare, py, csv, md, num].join(' | '));
  } },
  { name: 'list-converter: splits lists back into lines, honouring quotes', tool: 'list-converter', run: async page => {
    await chip(page, 'dir', 'List → lines');
    await set(page, 'in', 'a, "b, c", \'d\'');
    const a = await get(page, 'out');
    await set(page, 'in', '["x", "y\\"z", "tab\\there"]');
    const b = await get(page, 'out');
    await set(page, 'in', "WHERE id IN ('O''Brien', 'Smith')".slice(9));
    const c = await get(page, 'out');
    await set(page, 'in', 'one\ttwo\tthree');
    const d = await get(page, 'out'), i = await get(page, 'info');
    return res(a === 'a\nb, c\nd' && b === 'x\ny"z\ntab\there' && c === "O'Brien\nSmith" && d === 'one\ntwo\nthree' && i === '3 items', [a, b, c, d, i].map(s => JSON.stringify(s)).join(' | '));
  } },

  /* ------------------------------------------------ Extract Columns */
  { name: 'column-extractor: CSV quotes, reorder 3,1, header names and output quoting', tool: 'column-extractor', run: async page => {
    await set(page, 'in', 'name,age,city\n"Smith, Jo",42,Leeds\nAl,7,"York"');
    await set(page, 'cols', '3,1');
    const a = await get(page, 'out'), info = await get(page, 'info');
    await tick(page, 'keephead', false);
    const b = await get(page, 'out');
    await tick(page, 'keephead', true); await set(page, 'cols', 'age, name'); await set(page, 'join', 'comma');
    const c = await get(page, 'out');
    const pv = await page.$$eval(Q('preview') + ' th', ns => ns.map(n => n.textContent + (n.classList.contains('on') ? '*' : '')).join('|'));
    return res(a === 'city\tname\nLeeds\tSmith, Jo\nYork\tAl' && info === '2 rows plus a header · 3 columns' && b === 'Leeds\tSmith, Jo\nYork\tAl' &&
      c === 'age,name\n42,"Smith, Jo"\n7,Al' && pv === '1 · name*|2 · age*|3 · city', [a, info, b, c, pv].map(s => JSON.stringify(s)).join(' | '));
  } },
  { name: 'column-extractor: fixed widths, runs of spaces, regex and the last column', tool: 'column-extractor', run: async page => {
    await tick(page, 'header', false);
    await set(page, 'split', 'fixed'); await set(page, 'widths', '4,4'); await set(page, 'in', 'AB  123 X\nCD  456 Y'); await set(page, 'cols', '2');
    const a = await get(page, 'out');
    await set(page, 'cols', '-1');
    const last = await get(page, 'out');
    await set(page, 'split', 'spaces'); await set(page, 'in', 'a   b c\n d  e  f'); await set(page, 'cols', '2');
    const b = await get(page, 'out');
    await set(page, 'split', 'regex'); await set(page, 'regex', '\\s*[;,]\\s*'); await set(page, 'in', 'a ; b,c'); await set(page, 'cols', '3,2');
    const c = await get(page, 'out');
    return res(a === '123\n456' && last === 'X\nY' && b === 'b\ne' && c === 'c\tb', [a, last, b, c].map(s => JSON.stringify(s)).join(' | '));
  } },

  /* ------------------------------------------------ Invisible Characters */
  { name: 'invisible-characters: finds each kind, decodes tag text and cleans', tool: 'invisible-characters', run: async page => {
    const tags = s => Array.from(s).map(c => U(0xE0000 + c.charCodeAt(0))).join('');
    /* ZWSP, NBSP, RLO, BOM, soft hyphen, two tag characters, and a word with Cyrillic er and a */
    const text = 'a' + U(0x200B) + 'b' + U(0xA0) + 'c' + U(0x202E) + 'd' + U(0xFEFF) + 'e' + U(0xAD) + 'f' + tags('Hi') + ' ' + U(0x440, 0x430) + 'ypal';
    await set(page, 'in', text);
    const n = {};
    for (const k of ['zero', 'space', 'bidi', 'bom', 'shy', 'tag', 'glyph', 'control', 'vs']) n[k] = await get(page, 'n-' + k);
    const s = await get(page, 'summary'), h = await get(page, 'hidden'), out = await get(page, 'out');
    const badges = await page.$$eval(Q('view') + ' .gb-badge', bs => bs.map(b => b.textContent).join(','));
    await tick(page, 'clean-space', false);
    const keep = await get(page, 'out');
    const want = { zero: '1', space: '1', bidi: '1', bom: '1', shy: '1', tag: '2', glyph: '2', control: '0', vs: '0' };
    return res(JSON.stringify(n) === JSON.stringify(want) && s === '9 hidden or suspicious characters of 7 kinds (look-alike letters in 1 word)' &&
      /“Hi”/.test(h) && out === 'ab cdef paypal' && badges === 'ZWSP,NBSP,RLO,BOM,SHY,TAG H,TAG i' && keep === 'ab' + U(0xA0) + 'cdef paypal', JSON.stringify(n) + ' ' + s + ' ' + JSON.stringify(out) + ' ' + badges);
  } },
  { name: 'invisible-characters: emoji joiners and the Scotland flag are harmless; hidden bytes and controls found', tool: 'invisible-characters', run: async page => {
    const benign = 'Hi ' + U(0x1F468, 0x200D, 0x1F469, 0x200D, 0x1F467) + ' ' + U(0x2764, 0xFE0F) + ' ' + U(0x1F3F4, 0xE0067, 0xE0062, 0xE0073, 0xE0063, 0xE0074, 0xE007F);
    await set(page, 'in', benign);
    const a = await get(page, 'summary'), outA = await get(page, 'out');
    /* "ok" smuggled as variation selectors: o = 111 -> VS17+95 (U+E015F), k = 107 -> U+E015B */
    await set(page, 'in', 'A' + U(0xE015F, 0xE015B) + ' bell' + U(0x7));
    const vs = await get(page, 'n-vs'), ctl = await get(page, 'n-control'), h = await get(page, 'hidden');
    return res(a.startsWith('Nothing hidden found') && outA === benign && vs === '2' && ctl === '1' && /variation selectors: “ok”/.test(h), [a, vs, ctl, h].join(' | '));
  } },

  /* ------------------------------------------------ Anagram tool */
  { name: 'anagram-tool: checker says yes/no and lists the letters left over', tool: 'anagram-tool', run: async page => {
    const a = await get(page, 'verdict');
    /* listen has a t that silence lacks; silence has c and a second e */
    await set(page, 'a', 'listen'); await set(page, 'b', 'Silence!');
    const b = await get(page, 'verdict'), d = flat(await get(page, 'diff'));
    await set(page, 'a', 'Café'); await set(page, 'b', 'face');
    const c = await get(page, 'verdict');
    return res(a === 'Yes, these are anagrams' && b === 'No, these are not anagrams' && d === 'Only in the first: t Only in the second: c, e' && c === 'Yes, these are anagrams', [a, b, d, c].join(' | '));
  } },
  { name: 'anagram-tool: solver finds exact anagrams, blanks and shorter words from the British list', tool: 'anagram-tool', run: async page => {
    await chip(page, 'mode', 'Find words');
    await page.waitForFunction(() => /Found/.test(document.querySelector('#view [data-k="status"]').textContent), null, { timeout: 20000 });
    const sorted = w => w.split('').sort().join('');
    const exact = await words(page);
    const okExact = ['enlist', 'inlets', 'listen', 'silent', 'tinsel'].every(w => exact.includes(w)) && exact.every(w => sorted(w) === 'eilnst');
    await set(page, 'letters', 'c?t');
    await page.waitForTimeout(300);
    const wild = await words(page);
    const marked = await page.$$eval('#view [data-k="results"] .gb-word i', ns => ns.length);
    /* c, t and one blank, in any order: act, cat, cot, cut... */
    const okWild = ['act', 'cat', 'cot', 'cut'].every(w => wild.includes(w)) && wild.every(w => w.length === 3 && /c/.test(w) && /t/.test(w)) && marked === wild.length;
    await chip(page, 'find', 'Use some of the letters'); await set(page, 'min', '2'); await set(page, 'letters', 'tea');
    await page.waitForTimeout(300);
    const sub = await words(page);
    const heads = await page.$$eval('#view [data-k="results"] h4', ns => ns.map(n => n.textContent.replace(/ \(.*/, '')).join(','));
    const fits = w => { const pool = { t: 1, e: 1, a: 1 }; return w.split('').every(c => pool[c]-- > 0); };
    const okSub = ['at', 'ate', 'eat', 'tea'].every(w => sub.includes(w)) && sub.every(fits) && heads === '3 letters,2 letters';
    await chip(page, 'find', 'Use all the letters'); await set(page, 'letters', 'ruolco');
    await page.waitForTimeout(300);
    const gb = await words(page);
    await set(page, 'letters', 'rolco');
    await page.waitForTimeout(300);
    const us = await words(page);
    return res(okExact && okWild && okSub && gb.includes('colour') && !us.includes('color'), [exact.join(','), wild.join(','), marked, sub.join(','), heads, gb.join(','), us.join(',')].join(' | '));
  } },

  /* ------------------------------------------------ Text Splitter */
  { name: 'text-splitter: thread fits the limit with 1/N numbering counted in', tool: 'text-splitter', run: async page => {
    /* limit 30, " 1/3" takes 4: "One two three." (14) + " Four five six seven." would be 35 > 26 */
    await set(page, 'platform', 'custom'); await set(page, 'limit', '30');
    await set(page, 'in', 'One two three. Four five six seven. Eight.');
    const a = await pieces(page), s = await get(page, 'summary');
    await set(page, 'numpos', 'start'); await set(page, 'numstyle', 'paren');
    const b = await pieces(page);
    return res(JSON.stringify(a) === JSON.stringify(['One two three. 1/3', 'Four five six seven. 2/3', 'Eight. 3/3']) && s === '3 posts' &&
      JSON.stringify(b) === JSON.stringify(['(1/3) One two three.', '(2/3) Four five six seven.', '(3/3) Eight.']), JSON.stringify(a) + ' ' + JSON.stringify(b));
  } },
  { name: 'text-splitter: X counts links as 23 and emoji as 2; Bluesky counts graphemes', tool: 'text-splitter', run: async page => {
    await set(page, 'numstyle', 'none');
    /* "See " 4 + link 23 + " for more " 10 + thumbs-up with skin tone 2 = 39 */
    await set(page, 'in', 'See https://example.com/a/very/long/path/that/goes/on/and/on for more ' + U(0x1F44D, 0x1F3FD));
    const x = await get(page, 'count-1');
    await set(page, 'platform', 'bluesky');
    const bs = await get(page, 'count-1');
    const len = 'See https://example.com/a/very/long/path/that/goes/on/and/on for more '.length + 1;
    return res(x === 'Post 1 · 39/280' && bs === 'Post 1 · ' + len + '/300', x + ' | ' + bs);
  } },
  { name: 'text-splitter: chunks by words with overlap, characters, sentences, lines and paragraphs', tool: 'text-splitter', run: async page => {
    await chip(page, 'mode', 'Chunks');
    await set(page, 'by', 'words'); await set(page, 'size', '3'); await set(page, 'overlap', '1'); await set(page, 'in', 'a b c d e f g');
    const w = await pieces(page);
    await set(page, 'overlap', '0'); await set(page, 'by', 'characters'); await set(page, 'size', '5'); await tick(page, 'whole', false); await set(page, 'in', 'abcdefghij');
    const c = await pieces(page);
    await tick(page, 'whole', true); await set(page, 'size', '10'); await set(page, 'in', 'The quick brown fox');
    const cw = await pieces(page);
    await set(page, 'by', 'sentences'); await set(page, 'size', '2'); await set(page, 'in', 'One. Two. Three.');
    const s = await pieces(page);
    await set(page, 'by', 'lines'); await set(page, 'in', '1\n2\n3\n');
    const l = await pieces(page);
    await set(page, 'by', 'paragraphs'); await set(page, 'size', '1'); await set(page, 'in', 'p1\n\np2');
    const p = await pieces(page);
    const want = [['a b c', 'c d e', 'e f g'], ['abcde', 'fghij'], ['The quick', 'brown fox'], ['One. Two.', 'Three.'], ['1\n2', '3'], ['p1', 'p2']];
    const got = [w, c, cw, s, l, p];
    return res(JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got));
  } }
];
