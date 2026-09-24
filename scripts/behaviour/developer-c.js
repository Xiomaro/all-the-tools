/* Behaviour checks for the developer-c additions: curl converter, chmod,
   code screenshot and the regex explainer. */
'use strict';

const q = (page, fn, arg) => page.evaluate(fn, arg);
const viewText = page => q(page, () => document.getElementById('view').innerText);
async function setField(page, selector, value, index) {
  await q(page, ([s, v, i]) => {
    const n = document.querySelectorAll('#view ' + s)[i || 0];
    n.value = v; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true }));
  }, [selector, value, index || 0]);
  await page.waitForTimeout(300);
}
async function chip(page, label) {
  await q(page, l => { const b = [...document.querySelectorAll('#view .chip, #view button')].find(x => x.textContent.trim() === l); if (!b) throw new Error('no chip ' + l); b.click(); }, label);
  await page.waitForTimeout(250);
}
const out = (page, k) => q(page, k => document.querySelector('#view [data-k="' + (k || 'out') + '"]').textContent, k);
const res = (ok, detail) => ({ ok: !!ok, detail: String(detail).slice(0, 700) });

module.exports = [
  { name: 'curl-converter: the sample POST becomes fetch, Python and PowerShell', tool: 'curl-converter', run: async page => {
    const fetchCode = await out(page);
    await chip(page, 'Python requests');
    const py = await out(page);
    await chip(page, 'PowerShell');
    const ps = await out(page);
    const method = await q(page, () => document.querySelector('#view select').value);
    return res(/method: "POST"/.test(fetchCode) && /"Authorization": "Bearer YOUR_TOKEN"/.test(fetchCode) && /body: JSON\.stringify\(\{\n {4}"name": "Ada",/.test(fetchCode) &&
      /response = requests\.post\('https:\/\/api\.example\.com\/v1\/users', headers=headers, json=payload\)/.test(py) && /payload = \{\n {2}"name": "Ada",/.test(py) &&
      /Invoke-RestMethod -Uri 'https:\/\/api\.example\.com\/v1\/users' `\n {4}-Method POST/.test(ps) && method === 'POST', fetchCode.slice(0, 120) + ' || ' + py.slice(-90));
  } },
  { name: 'curl-converter: tricky quoting, -G, -u, --data-urlencode and the round trip back to curl', tool: 'curl-converter', run: async page => {
    const r = await q(page, () => {
      const K = window.DevCKit;
      const a = K.parseCurl("curl -sSL -XPUT 'https://x.io/p?z=1' -H \"Accept: text/*\" -H 'X-Note: it'\\''s' --data-urlencode 'q=a b' -u user:p:ss --compressed");
      const b = K.parseCurl('curl -G https://x.io/s --data-urlencode "q=hello world" -d page=2 -A "My UA/1.0" -b "a=1; b=2"');
      const c = K.parseCurl('curl --request DELETE --url https://x.io/i/9 \\\n  --header "Authorization: Bearer t"');
      return { a: { m: a.method, url: a.url, h: a.headers, d: a.data, auth: a.auth, f: a.follow, c: a.compressed }, b: { m: b.method, url: b.url, h: b.headers }, c: { m: c.method, url: c.url, h: c.headers } };
    });
    await setField(page, 'textarea', 'curl -X PATCH https://x.io/a -H "Content-Type: application/json" -d \'{"ok":true}\'', 0);
    const method = await q(page, () => document.querySelector('#view select').value);
    await setField(page, 'select', 'DELETE', 0);
    const back = await q(page, () => document.querySelector('#view textarea').value);
    const want = { a: { m: 'PUT', url: 'https://x.io/p?z=1', h: [['Accept', 'text/*'], ['X-Note', "it's"], ['Content-Type', 'application/x-www-form-urlencoded']], d: ['q=a%20b'], auth: { user: 'user', pass: 'p:ss' }, f: true, c: true },
      b: { m: 'GET', url: 'https://x.io/s?q=hello%20world&page=2', h: [['User-Agent', 'My UA/1.0'], ['Cookie', 'a=1; b=2']] }, c: { m: 'DELETE', url: 'https://x.io/i/9', h: [['Authorization', 'Bearer t']] } };
    return res(JSON.stringify(r) === JSON.stringify(want) && method === 'PATCH' && back === "curl -X DELETE 'https://x.io/a' \\\n  -H 'Content-Type: application/json' \\\n  --data-raw '{\"ok\":true}'", JSON.stringify(r) + ' | ' + back.replace(/\n/g, ' '));
  } },
  { name: 'chmod-calculator: 755 ↔ rwxr-xr-x, symbolic input, presets and the sticky bit', tool: 'chmod-calculator', run: async page => {
    const a = await q(page, () => [document.querySelector('#view input[aria-label="Octal"]').value, document.querySelector('#view input[aria-label="Symbolic"]').value, document.querySelector('#view [data-k="cmd"]').textContent.split('\n')[0]]);
    await setField(page, 'input[aria-label="Symbolic"]', 'rw-r--r--');
    const b = await q(page, () => [document.querySelector('#view input[aria-label="Octal"]').value, [...document.querySelectorAll('#view input[data-p]')].filter(i => i.checked).map(i => i.dataset.p).join(',')]);
    await chip(page, '1777');
    const c = await q(page, () => [document.querySelector('#view input[aria-label="Symbolic"]').value, document.querySelector('#view .note').textContent]);
    await q(page, () => { const i = document.querySelector('#view input[data-p="ux"]'); i.click(); });
    await page.waitForTimeout(150);
    const d = await q(page, () => document.querySelector('#view input[aria-label="Octal"]').value);
    return res(a.join('|') === '755|rwxr-xr-x|chmod 755 filename' && b.join('|') === '644|ur,uw,gr,or' && c[0] === 'rwxrwxrwt' && /sticky bit, like \/tmp/.test(c[1]) && d === '1677', a.join('|') + ' / ' + b.join('|') + ' / ' + c[0] + ' / ' + d);
  } },
  { name: 'code-screenshot: renders a 2× PNG and the tokeniser classifies JS and Python', tool: 'code-screenshot', run: async page => {
    const r = await q(page, () => {
      const c = document.querySelector('#view canvas');
      const kinds = src => window.DevCKit.tokenize(src[0], src[1]).filter(t => t[0] !== 'ws' && t[0] !== 'nl').map(t => t[0] + ':' + t[1]).join(' ');
      const js = kinds(["const x = f('a', 42); // hi", 'js']), py = kinds(['def go(n): # c\n    return None', 'python']);
      const d = c.getContext('2d').getImageData(0, 0, 1, 1).data;
      return { w: c.width, h: c.height, js, py, corner: Array.from(d) };
    });
    await setField(page, 'input[type=range]', '24', 0);
    const bigger = await q(page, () => document.querySelector('#view canvas').height);
    return res(r.w > 600 && r.h > 300 && r.w % 2 === 0 && r.js === "kw:const id:x pun:= fn:f pun:( str:'a' pun:, num:42 pun:) pun:; com:// hi" && r.py === 'kw:def fn:go pun:( id:n pun:) pun:: com:# c kw:return kw:None' && r.corner[3] === 255 && bigger > r.h, JSON.stringify(r).slice(0, 200) + ' bigger=' + bigger);
  } },
  { name: 'regex-explainer: the email pattern is narrated, tested, and errors are caught', tool: 'regex-explainer', run: async page => {
    const t = await viewText(page);
    const hits = await q(page, () => [...document.querySelectorAll('#view .hit')].map(h => h.textContent));
    await setField(page, 'input[aria-label="Pattern"]', '(a|b)+?\\d{2,}$');
    const t2 = await viewText(page);
    await setField(page, 'input[aria-label="Pattern"]', '(abc');
    const err = await q(page, () => document.querySelector('#view .note.err').textContent);
    return res(/group 1 "user" captures/.test(t) && /one character from: a word character \(letter, digit or underscore\), "\.", "\+", "-"/.test(t) && /the end of a line/.test(t) && /Capturing groups\s+2 \(named: user\)/.test(t) && hits.join() === 'ada.lovelace@example.co.uk,bob+news@mail-server.org' && /2 matches/.test(t) &&
      /one or more times, as few as possible \(lazy\) the following:/.test(t2) && /either one of these alternatives/.test(t2) && /2 or more times, as many as possible \(greedy\)/.test(t2) && /a digit \(0-9\)/.test(t2) && /Unterminated group|Missing closing bracket/.test(err),
      hits.join() + ' | ' + err + ' | ' + (t.match(/Capturing groups[^\n]*\n[^\n]*/) || [''])[0]);
  } }
];
