/* Behaviour checks for the text and seo tool groups. Elements are addressed
   through data-k attributes set by the tools. */
'use strict';

const Q = k => `#view [data-k="${k}"]`;
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
const res = (ok, detail) => ({ ok: !!ok, detail: String(detail).slice(0, 160) });
const eq = (got, want) => res(got === want, JSON.stringify(got));

module.exports = [
  { name: 'word-count: words/sentences/paragraphs/lines', tool: 'word-count', run: async page => {
    await set(page, 'in', 'Hello world. How are you?\n\nFine.');
    const s = (await get(page, 'stats')).replace(/\s+/g, ' ');
    return res(/^6 Words 32 Characters 26 Characters \(no spaces\) 32 Graphemes 3 Sentences 2 Paragraphs 3 Lines 32 UTF-8 bytes$/.test(s.trim()), s);
  } },
  { name: 'text-case: default and snake/camel of new input', tool: 'text-case', run: async page => {
    const d = await get(page, 'case-alternating');
    if (d !== 'hElLo wOrLd eXaMpLe tExT') return res(false, d);
    await set(page, 'in', 'user ID-number');
    const a = await get(page, 'case-snake'), b = await get(page, 'case-camel'), c = await get(page, 'case-inverse');
    return res(a === 'user_id_number' && b === 'userIdNumber' && c === 'USER id-NUMBER', [a, b, c].join(' | '));
  } },
  { name: 'text-reverse: characters, then word order', tool: 'text-reverse', run: async page => {
    await set(page, 'in', 'abc\ndef');
    const a = await get(page, 'out');
    await set(page, 'in', 'one two three');
    await tick(page, 'words', true);
    const b = await get(page, 'out');
    return res(a === 'fed\ncba' && b === 'three two one', a + ' / ' + b);
  } },
  { name: 'text-lorem: 5 words starting with Lorem', tool: 'text-lorem', run: async page => {
    await chip(page, 'type', 'Words');
    await set(page, 'count', '5');
    const o = await get(page, 'out');
    return res(o.split(' ').length === 5 && o.startsWith('Lorem ipsum dolor sit amet'), o);
  } },
  { name: 'text-to-html: escaping, paragraphs and links', tool: 'text-to-html', run: async page => {
    await set(page, 'in', 'a < b\n\nsee https://x.io');
    const a = await get(page, 'out');
    await tick(page, 'links', true);
    const b = await get(page, 'out');
    return res(a === '<p>a &lt; b</p>\n<p>see https://x.io</p>' && b.includes('<a href="https://x.io">https://x.io</a>'), a + ' / ' + b);
  } },
  { name: 'text-truncate: chars default, words and sentences', tool: 'text-truncate', run: async page => {
    const i = await get(page, 'info');
    await set(page, 'by', 'Words'); await set(page, 'limit', '3');
    const w = await get(page, 'out');
    await set(page, 'by', 'Sentences'); await set(page, 'limit', '1'); await set(page, 'suffix', ' […]');
    const s = await get(page, 'out');
    return res(i === '103 chars · 18 words' && w === 'The quick brown...' && s === 'The quick brown fox jumps over the lazy dog. […]', [i, w, s].join(' | '));
  } },
  { name: 'text-repeat: 3 times with comma separator', tool: 'text-repeat', run: async page => {
    const d = await get(page, 'info');
    await set(page, 'count', '3'); await set(page, 'sep', ', '); await set(page, 'in', 'ab');
    return res(d === '5× · 59 chars' && (await get(page, 'out')) === 'ab, ab, ab', d);
  } },
  { name: 'text-extract-emails: unique addresses', tool: 'text-extract-emails', run: async page => {
    await set(page, 'in', 'Mail a@b.com or A@B.com, else c.d+x@e-f.org.');
    const a = await get(page, 'out'), c = await get(page, 'count');
    return res(a === 'a@b.com\nc.d+x@e-f.org' && c === '2 found', a + ' / ' + c);
  } },
  { name: 'text-extract-urls: strips trailing punctuation', tool: 'text-extract-urls', run: async page => {
    await set(page, 'in', 'see https://x.com/a, and (http://y.org/b). Also https://x.com/a');
    return eq(await get(page, 'out'), 'https://x.com/a\nhttp://y.org/b');
  } },
  { name: 'text-extract-numbers: values and sum', tool: 'text-extract-numbers', run: async page => {
    await set(page, 'in', '3 apples, 4.5 kg and -2 degrees; 1,000 people');
    const o = await get(page, 'out');
    const stats = (await page.$eval('#view .stats', n => n.innerText)).replace(/\s+/g, ' ');
    return res(o === '3\n4.5\n-2\n1000' && stats.includes('1005.5 Sum'), o + ' / ' + stats);
  } },
  { name: 'roman-numerals: both directions and validation', tool: 'roman-numerals', run: async page => {
    const d = await get(page, 'roman');
    await set(page, 'num', '1994');
    const a = await get(page, 'roman');
    await set(page, 'rin', 'mmmcmxcix');
    const b = await get(page, 'arabic');
    await set(page, 'rin', 'IIII');
    const c = await get(page, 'arabic');
    return res(d === 'MMXXIV' && a === 'MCMXCIV' && b === '3999' && c === 'Invalid numeral', [d, a, b, c].join(' '));
  } },
  { name: 'morse-code: encode default, decode SOS', tool: 'morse-code', run: async page => {
    const d = await get(page, 'out');
    await chip(page, 'mode', 'Morse → Text');
    await set(page, 'in', '... --- ... / .-. ..-');
    return res(d === '.... . .-.. .-.. --- / .-- --- .-. .-.. -..' && (await get(page, 'out')) === 'SOS RU', d);
  } },
  { name: 'binary-text: encode and decode binary + hex', tool: 'binary-text', run: async page => {
    await set(page, 'in', 'Hi€');
    const b = await get(page, 'bin'), h = await get(page, 'hex');
    await chip(page, 'mode', 'Binary/Hex → Text');
    await set(page, 'din', '01001000 01101001');
    const t1 = await get(page, 'dout');
    await set(page, 'din', '48 69 e2 82 ac');
    const t2 = await get(page, 'dout');
    return res(b === '01001000 01101001 11100010 10000010 10101100' && h === '48 69 e2 82 ac' && t1 === 'Hi' && t2 === 'Hi€', [b, h, t1, t2].join(' | '));
  } },
  { name: 'text-wrap: wraps at 10 with line numbers', tool: 'text-wrap', run: async page => {
    await set(page, 'in', 'aaa bbb ccc ddd');
    await set(page, 'width', '10');
    const a = await get(page, 'out');
    await tick(page, 'nums', true);
    const b = await get(page, 'out');
    return res(a === 'aaa bbb\nccc ddd' && b === '1  aaa bbb\n2  ccc ddd', a + ' / ' + b);
  } },
  { name: 'text-number-lines: start 9, zero-pad, colon', tool: 'text-number-lines', run: async page => {
    await set(page, 'in', 'a\nb\n\nc');
    await set(page, 'start', '9'); await set(page, 'sep', ': ');
    await tick(page, 'pad', true); await tick(page, 'skip', true);
    return eq(await get(page, 'out'), '09: a\n10: b\n\n11: c');
  } },
  { name: 'ssml-generator: default length and prosody changes', tool: 'ssml-generator', run: async page => {
    const i = await get(page, 'info');
    await set(page, 'rate', 'fast'); await set(page, 'emph', 'none'); await set(page, 'in', 'Hi & bye. Again!');
    const o = await get(page, 'out');
    return res(i === '313 chars' && o.includes('rate="fast"') && !o.includes('<emphasis') && o.includes('Hi &amp; bye.<break strength="medium"/> Again!'), i + ' / ' + o);
  } },
  { name: 'palindrome-checker: yes and no cases', tool: 'palindrome-checker', run: async page => {
    await set(page, 'in', 'A man, a plan, a canal: Panama');
    const a = await get(page, 'verdict');
    await set(page, 'in', 'hello level');
    const b = await get(page, 'verdict'), t = await get(page, 'out');
    return res(a.includes('Yes') && b.includes('Not') && t.includes('level (5 chars)'), a + ' / ' + b);
  } },
  { name: 'rot13: ROT13 and ROT47', tool: 'rot13', run: async page => {
    await set(page, 'in', 'Hello, World!');
    const a = await get(page, 'out');
    await chip(page, 'mode', 'ROT47');
    const b = await get(page, 'out');
    return res(a === 'Uryyb, Jbeyq!' && b === 'w6==@[ (@C=5P', a + ' / ' + b);
  } },
  { name: 'text-padding: centre with asterisks', tool: 'text-padding', run: async page => {
    await set(page, 'in', 'ab\nabcd'); await set(page, 'width', '7'); await set(page, 'char', '*'); await set(page, 'align', 'Center');
    return eq(await get(page, 'out'), '**ab***\n*abcd**');
  } },
  { name: 'unicode-inspector: code points and UTF-8 bytes', tool: 'unicode-inspector', run: async page => {
    const d = await get(page, 'info');
    await set(page, 'in', 'é€');
    const i = await get(page, 'info'), t = await get(page, 'table');
    return res(d === '7 characters · 10 UTF-8 bytes' && i === '2 characters · 5 UTF-8 bytes' && t.includes('U+20AC') && t.includes('E2 82 AC') && t.includes('Latin-1 Supplement'), i + ' / ' + t);
  } },
  { name: 'ascii-art-text: block font and double box', tool: 'ascii-art-text', run: async page => {
    const a = await get(page, 'out');
    await chip(page, 'mode', 'Text Box');
    await set(page, 'in', 'Hi');
    const b = await get(page, 'out');
    return res(a.split('\n')[0] === '█ █ █▀▀ █   █   █▀█ ' && b === '╔════╗\n║ Hi ║\n╚════╝', JSON.stringify(b));
  } },
  { name: 'emoji-picker: search finds pizza, Food tab lists it', tool: 'emoji-picker', run: async page => {
    await page.waitForFunction(() => document.querySelectorAll('#view [data-k="grid"] button').length > 50);
    await set(page, 'search', 'pizza');
    const s = await get(page, 'grid');
    await set(page, 'search', '');
    await chip(page, 'cat', 'Food');
    const f = await get(page, 'grid');
    const count = await page.evaluate(() => document.querySelectorAll('#view [data-k="grid"] button').length);
    return res(s.includes('🍕') && f.includes('🍕') && count > 100, s.slice(0, 20) + ' / ' + count);
  } },
  { name: 'speed-typing: completing the passage reports 100% accuracy', tool: 'speed-typing', run: async page => {
    const text = await get(page, 'target');
    await page.fill(Q('in'), text.slice(0, -1));
    await page.type(Q('in'), text.slice(-1));
    await page.waitForTimeout(200);
    const r = await get(page, 'result');
    return res(/^Finished! \d+ WPM at 100% accuracy/.test(r), r);
  } },
  { name: 'text-replacer: literal default and regex rule with groups', tool: 'text-replacer', run: async page => {
    const d = await get(page, 'out');
    await clickBtn(page, '+ Add Rule');
    await page.$$eval('#view [data-k="rules"] .gt-rule', rows => {
      const r = rows[1];
      const ins = r.querySelectorAll('input');
      ins[0].value = '(\\w+) again'; ins[1].value = '$1 once more'; ins[2].checked = true;
      ins[0].dispatchEvent(new Event('input')); ins[2].dispatchEvent(new Event('change'));
    });
    await page.waitForTimeout(200);
    const o = await get(page, 'out');
    return res(d === 'Hi World!\nThe quick brown fox jumps over the lazy dog.\nHi again, World!' && o.endsWith('Hi once more, World!'), o);
  } },
  { name: 'slug-generator: underscore, accents and bulk', tool: 'slug-generator', run: async page => {
    const d = await get(page, 'out');
    await chip(page, 'sep', '_');
    await set(page, 'in', 'Ünïcödé Straße Test');
    const a = await get(page, 'out');
    await set(page, 'bulk', 'First Post!\nSecond — Post');
    const b = await get(page, 'bulkout');
    return res(d === 'hello-world-this-is-a-test' && a === 'unicode_strasse_test' && b === 'first_post\nsecond_post', [d, a, b].join(' | '));
  } },
  { name: 'braille-translator: letters, numbers and back', tool: 'braille-translator', run: async page => {
    await set(page, 'in', 'abc 123');
    const a = await get(page, 'out');
    await chip(page, 'mode', 'Braille → Text');
    const b = await get(page, 'out');
    return res(a === '⠁⠃⠉⠀⠼⠁⠃⠉' && b === 'abc 123', a + ' / ' + b);
  } },
  { name: 'text-cleaner: smart quotes, dashes, tags, ellipsis', tool: 'text-cleaner', run: async page => {
    await set(page, 'in', '  “Hi”—there…   <b>bold</b>\r\n\r\n next  ');
    const a = await get(page, 'out');
    await tick(page, 'punct', true);
    const b = await get(page, 'out');
    return res(a === '"Hi"-there... bold\nnext' && b === 'Hithere bold\nnext', JSON.stringify(a) + ' / ' + JSON.stringify(b));
  } },
  { name: 'duplicate-lines: remove, extract and keep-last', tool: 'duplicate-lines', run: async page => {
    const a = await get(page, 'out');
    await chip(page, 'mode', 'Extract Dupes');
    const b = await get(page, 'out');
    await chip(page, 'mode', 'Remove Dupes');
    await tick(page, 'cs', true); await tick(page, 'first', false);
    const c = await get(page, 'out');
    return res(a === 'apple\nbanana\ncherry\ndates' && b === 'apple\nbanana\ncherry' && c === 'Apple\ncherry\nbanana\ndates\nCherry\napple', [a, b, c].join(' | '));
  } },
  { name: 'word-frequency-map: filtered counts', tool: 'word-frequency-map', run: async page => {
    const i = await get(page, 'info'), t = await get(page, 'table');
    await tick(page, 'stop', false); await set(page, 'min', '1');
    const j = await get(page, 'info');
    return res(i === '16 unique words · 22 total (filtered)' && /1\tfox\t3\t13\.6%/.test(t) && j === '19 unique words · 30 total', i + ' / ' + j);
  } },
  { name: 'html-to-text: entities, breaks, links, scripts', tool: 'html-to-text', run: async page => {
    await set(page, 'in', '<p>A &amp; B</p><p>C<br>D <a href="https://z.io">z</a></p><script>x()</script>');
    const a = await get(page, 'out');
    await tick(page, 'links', false);
    const b = await get(page, 'out');
    return res(a === 'A & B\n\nC\nD z [https://z.io]' && b === 'A & B\n\nC\nD z', JSON.stringify(a));
  } },
  { name: 'text-sorter: longest first and 9 → 1', tool: 'text-sorter', run: async page => {
    await chip(page, 'mode', 'Longest first');
    const a = (await get(page, 'out')).split('\n')[0];
    await set(page, 'in', 'item 2\nitem 10\nitem 1');
    await chip(page, 'mode', '9 → 1');
    const b = await get(page, 'out');
    return res(a === 'elderberry' && b === 'item 10\nitem 2\nitem 1', a + ' / ' + b);
  } },
  { name: 'meta-tag-generator: escapes and reflects inputs', tool: 'meta-tag-generator', run: async page => {
    await set(page, 'title', 'Tom & "Jerry"'); await set(page, 'robots', 'noindex, nofollow'); await set(page, 'type', 'article');
    const o = await get(page, 'out');
    return res(o.includes('<title>Tom &amp; &quot;Jerry&quot;</title>') && o.includes('<meta name="robots" content="noindex, nofollow">') &&
      o.includes('<meta property="og:type" content="article">') && o.includes('<link rel="canonical" href="https://example.com">'), o.slice(0, 120));
  } },
  { name: 'sitemap-generator: bulk add URLs', tool: 'sitemap-generator', run: async page => {
    await set(page, 'bulk', '/blog\nhttps://other.example/x');
    await clickBtn(page, 'Add Bulk');
    const o = await get(page, 'out');
    const n = (o.match(/<url>/g) || []).length;
    return res(n === 5 && o.includes('<loc>https://example.com/blog</loc>') && o.includes('<loc>https://other.example/x</loc>') && o.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), n);
  } },
  { name: 'keyword-density: single word and phrase', tool: 'keyword-density', run: async page => {
    const a = (await get(page, 'stats')).replace(/\s+/g, ' ');
    await set(page, 'kw', 'search engine');
    const b = (await get(page, 'stats')).replace(/\s+/g, ' ');
    return res(a.trim() === '26 Total Words 4 Occurrences 15.38% Density' && b.trim() === '26 Total Words 1 Occurrences 7.69% Density', a + ' / ' + b);
  } },
  { name: 'schema-generator: article, product and FAQ JSON-LD', tool: 'schema-generator', run: async page => {
    const a = JSON.parse(await get(page, 'out'));
    await set(page, 'type', 'Product');
    await set(page, 'name', 'Widget'); await set(page, 'price', '9.99');
    const p = JSON.parse(await get(page, 'out'));
    await set(page, 'type', 'FAQPage');
    const f = JSON.parse(await get(page, 'out'));
    await page.$$eval('#view [data-k="fmt"] button', bs => bs[1].click());
    await page.waitForTimeout(150);
    const s = await get(page, 'out');
    return res(a.headline === 'My Article Title' && a.author.name === 'John Doe' && p.offers.price === '9.99' && p.offers.priceCurrency === 'USD' && p.name === 'Widget' &&
      f.mainEntity.length === 2 && f.mainEntity[0]['@type'] === 'Question' && s.startsWith('<script type="application/ld+json">'), JSON.stringify(p));
  } },
  { name: 'text-encoding-converter: mojibake repaired to the original accents', tool: 'text-encoding-converter', run: async page => {
    await set(page, 'in', 'cafÃ© â€“ donâ€™t Â£20 naÃ¯ve');
    const out = await get(page, 'out');
    const cp = new TextDecoder('windows-1252'), once = cp.decode(Buffer.from('£5 — double', 'utf8')), twice = cp.decode(Buffer.from(once, 'utf8'));
    await set(page, 'in', twice);
    const dbl = await get(page, 'out');
    return res(out === 'café – don’t £20 naïve' && dbl === '£5 — double', out + ' | ' + dbl);
  } },
  { name: 'text-encoding-converter: pasted text saves as Windows-1252 bytes', tool: 'text-encoding-converter', run: async page => {
    await set(page, 'paste', 'café €');
    await set(page, 'to', 'windows-1252');
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), clickBtn(page, 'Download converted file')]);
    const buf = require('fs').readFileSync(await dl.path());
    return res(buf.toString('hex') === '636166e92080' && dl.suggestedFilename() === 'text-windows-1252.txt', buf.toString('hex') + ' ' + dl.suggestedFilename());
  } },
  { name: 'utm-builder: defaults tag the URL; lowercase and warnings apply', tool: 'utm-builder', run: async page => {
    const a = await get(page, 'out');
    await set(page, 'source', 'Google'); await set(page, 'medium', 'Banner Ad'); await set(page, 'url', 'https://example.com/page?ref=1');
    const b = await get(page, 'out');
    const warns = await page.$$eval('#view ul li', ns => ns.map(n => n.textContent));
    return res(a === 'https://example.com/landing-page?utm_source=newsletter&utm_medium=email&utm_campaign=spring_sale' && b === 'https://example.com/page?ref=1&utm_source=google&utm_medium=banner+ad&utm_campaign=spring_sale' && warns.some(w => /contains spaces/.test(w)) && warns.some(w => /not a standard GA4 medium/.test(w)), a + ' | ' + b + ' | ' + warns.length);
  } },
  { name: 'serp-preview: long title is cut with an ellipsis, short one fits', tool: 'serp-preview', run: async page => {
    await set(page, 'title', 'All The Tools: three hundred and ninety free browser utilities for text, code, colour, images, PDFs and video that never upload your files anywhere');
    const long = await get(page, 'serp-title');
    /* the container may have no Arial, so trust the page's own pixel measurement: cut iff it reports more than 600 px */
    const px = +(await page.$eval('#view .note', n => (n.textContent.match(/(\d+) px of 600/) || [0, 0])[1]));
    const cutOk = px > 600 ? /…$/.test(long) && long.length < 75 : long.length > 100;
    await set(page, 'title', 'Merge PDF files free, right in your browser');
    const short = await get(page, 'serp-title');
    const meta = await page.$eval('#view .note', n => n.textContent);
    const checks = await page.$$eval('#view ul li', ns => ns.map(n => n.textContent));
    return res(cutOk && short === 'Merge PDF files free, right in your browser' && /Title: 43 characters/.test(meta) && /Description: \d+ characters/.test(meta) && checks.some(c => /^(Title fits|The title is short)/.test(c)), px + 'px | ' + long.slice(-20) + ' | ' + short + ' | ' + meta);
  } }
];
