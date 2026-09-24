/* Behaviour checks for the colour, crypto and network tools. Reference values
   come from the published algorithms (RFC test vectors, NIST/known digests)
   or were worked out by hand for the same inputs. */
'use strict';

const V = '#view';

/* A self-signed P-256 certificate and CSR for the decoder checks (generated with openssl, 2026-09-21). */
const TEST_CRT = `-----BEGIN CERTIFICATE-----
MIICezCCAiGgAwIBAgIUfsZUO6JhADfGjLQQzb1lXlXnaX8wCgYIKoZIzj0EAwIw
YzELMAkGA1UEBhMCR0IxEDAOBgNVBAgMB0VuZ2xhbmQxDzANBgNVBAcMBkxvbmRv
bjEWMBQGA1UECgwNQWxsIFRoZSBUb29sczEZMBcGA1UEAwwQdGVzdC5leGFtcGxl
LmNvbTAeFw0yNjA5MjQxODM5NDBaFw0zNjA5MjExODM5NDBaMGMxCzAJBgNVBAYT
AkdCMRAwDgYDVQQIDAdFbmdsYW5kMQ8wDQYDVQQHDAZMb25kb24xFjAUBgNVBAoM
DUFsbCBUaGUgVG9vbHMxGTAXBgNVBAMMEHRlc3QuZXhhbXBsZS5jb20wWTATBgcq
hkjOPQIBBggqhkjOPQMBBwNCAASV6nCIs/yuDar82Eu4KkObKkNGgDAe2qnkeKfi
PPbhmYlthicpwb239C/jqIFBM+ekY45l7viqtILi1Zab7A4Lo4GyMIGvMB0GA1Ud
DgQWBBRPreluGomo+vpKqumQdzhG+wFHeDAfBgNVHSMEGDAWgBRPreluGomo+vpK
qumQdzhG+wFHeDAPBgNVHRMBAf8EBTADAQH/MDcGA1UdEQQwMC6CEHRlc3QuZXhh
bXBsZS5jb22CFHd3dy50ZXN0LmV4YW1wbGUuY29thwTAAAIBMA4GA1UdDwEB/wQE
AwIHgDATBgNVHSUEDDAKBggrBgEFBQcDATAKBggqhkjOPQQDAgNIADBFAiEAzWL8
amOmNK+zw7uWQ+7ILIxGBh9msGzC/T0B4K+neAwCIGa7ddV6yxRyQZkk6SiPmDCW
LF3EAEreUiaJR+Ogfgt2
-----END CERTIFICATE-----`;
const TEST_CSR = `-----BEGIN CERTIFICATE REQUEST-----
MIIBFDCBuwIBADAsMRgwFgYDVQQDDA9jc3IuZXhhbXBsZS5jb20xEDAOBgNVBAoM
B0NTUiBPcmcwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAARNC+B25mxUvlvAaC9M
YpxSJMKo0Xzx2STmttlfcyCigD0Q+HyqQQmClDdlZk278ExtL+9WVuqpvCJw5mKC
u+eNoC0wKwYJKoZIhvcNAQkOMR4wHDAaBgNVHREEEzARgg9jc3IuZXhhbXBsZS5j
b20wCgYIKoZIzj0EAwIDSAAwRQIgOA6tU8P4WPFhC1nTMDRRrVhbTf4LkRGWfmHj
2siP6gsCIQC5mP9+1C0UyoTyi87L9J1Dk2leuFgVVjV5ajZ8n4RKiw==
-----END CERTIFICATE REQUEST-----`;

async function fill(page, sel, value) {
  await page.fill(V + ' ' + sel, value);
  await page.waitForTimeout(150);
}
async function click(page, text, scope) {
  await page.locator(V + ' ' + (scope || 'button'), { hasText: text }).first().click();
  await page.waitForTimeout(150);
}
async function clickExact(page, text) {
  await page.evaluate(t => {
    const b = [...document.querySelectorAll('#view button')].find(x => x.textContent.trim() === t);
    if (!b) throw new Error('no button ' + t);
    b.click();
  }, text);
  await page.waitForTimeout(150);
}
async function tile(page, key) {
  return page.evaluate(k => {
    const n = document.querySelector('#view [data-key="' + k + '"] code');
    return n ? n.textContent : null;
  }, key);
}
async function text(page, sel) {
  return page.evaluate(s => { const n = document.querySelector('#view ' + s); return n ? (n.value !== undefined && n.tagName !== 'DIV' && n.tagName !== 'CODE' ? n.value : n.textContent) : null; }, sel);
}
async function swatches(page) {
  return page.evaluate(() => [...document.querySelectorAll('#view .sw')].map(b => b.dataset.hex));
}
async function hashes(page) {
  return page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#view .hashrow[data-algo]')].map(r => [r.dataset.algo, r.querySelector('code').textContent])));
}
async function waitFor(page, fn, arg, ms) {
  await page.waitForFunction(fn, arg, { timeout: ms || 10000 });
}
function eq(got, want) { return { ok: JSON.stringify(got) === JSON.stringify(want), detail: JSON.stringify(got).slice(0, 160) }; }
function all(list) {
  const bad = list.filter(x => !x.ok);
  return bad.length ? { ok: false, detail: bad.map(b => b.detail).join(' | ') } : { ok: true, detail: '' };
}

/* A 4x4 PNG of a single colour, drawn in the page. */
async function pngOf(page, css) {
  const b64 = await page.evaluate(c => {
    const cv = document.createElement('canvas'); cv.width = 4; cv.height = 4;
    const x = cv.getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, 4, 4);
    return cv.toDataURL('image/png').split(',')[1];
  }, css);
  return Buffer.from(b64, 'base64');
}

module.exports = [
  /* ---------------- colour ---------------- */
  { name: 'color-converter: #6366f1 in every format, then #ff0000', tool: 'color-converter', run: async page => {
    const a = [await tile(page, 'hex'), await tile(page, 'rgb'), await tile(page, 'hsl'), await tile(page, 'cmyk')];
    await fill(page, 'input[type=text]', '#ff0000');
    const b = [await tile(page, 'rgb'), await tile(page, 'hsv'), await tile(page, 'cmyk')];
    const shades = (await swatches(page)).length;
    return eq([a, b, shades], [['#6366F1', 'rgb(99, 102, 241)', 'hsl(239, 84%, 67%)', 'cmyk(59%, 58%, 0%, 5%)'],
      ['rgb(255, 0, 0)', 'hsb(0, 100%, 100%)', 'cmyk(0%, 100%, 100%, 0%)'], 9]);
  } },
  { name: 'color-picker: formats and CSS var for #3b82f6', tool: 'color-picker', run: async page => {
    const a = [await tile(page, 'hex'), await tile(page, 'hsl'), await tile(page, 'css')];
    await fill(page, 'input[type=text]', '#000000');
    await page.waitForTimeout(700);
    const recent = await swatches(page);
    return eq([a, await tile(page, 'rgb'), recent.includes('#000000')], [['#3B82F6', 'hsl(217, 91%, 60%)', '--color: #3b82f6;'], 'rgb(0, 0, 0)', true]);
  } },
  { name: 'color-palette: all five schemes for #6366f1', tool: 'color-palette', run: async page => {
    const got = {};
    got.complementary = await swatches(page);
    for (const s of ['Monochromatic', 'Analogous', 'Triadic', 'Tetradic (square)']) { await clickExact(page, s); got[s] = await swatches(page); }
    return eq(got, {
      complementary: ['#1317DD', '#6366F1', '#C2C3FA', '#F2EF64', '#DDD913'],
      Monochromatic: ['#0F12AE', '#1E21EB', '#6366F1', '#ABACF8', '#F1F1FE'],
      Analogous: ['#64ADF2', '#648AF2', '#6366F1', '#8564F2', '#A864F2'],
      Triadic: ['#6366F1', '#F26467', '#67F264', '#E272E3', '#72E3E2'],
      'Tetradic (square)': ['#6366F1', '#F264AD', '#F2EF64', '#64F2A8']
    });
  } },
  { name: 'color-contrast: white on #6366f1 is 4.47:1 AA Large; black/white is 21:1', tool: 'color-contrast', run: async page => {
    const a = [await text(page, '[data-out=ratio]'), await text(page, '[data-out=level]')];
    const fails = await page.evaluate(() => [...document.querySelectorAll('#view [data-check]')].map(d => d.dataset.check + ':' + d.lastChild.textContent));
    await click(page, 'White / Black');
    const b = [await text(page, '[data-out=ratio]'), await text(page, '[data-out=level]')];
    return eq([a, fails, b], [['4.47:1', 'AA Large'], ['AA Normal:✗ Fail', 'AA Large:✓ Pass', 'AAA Normal:✗ Fail', 'AAA Large:✗ Fail'], ['21.00:1', 'AAA']]);
  } },
  { name: 'color-shades: 10-step shades and tints of #3b82f6', tool: 'color-shades', run: async page => {
    const s = await swatches(page);
    const labels = await page.evaluate(() => [...document.querySelectorAll('#view .sw small')].slice(0, 2).map(x => x.textContent));
    return eq([s.length, s[0], s[1], s[9], s[10], s[11], s[20], labels], [21, '#060d19', '#0c1a31', '#3b82f6', '#3b82f6', '#4f8ff7', '#ffffff', ['910', '820']]);
  } },
  { name: 'color-blindness: simulates protanopia and achromatopsia on a red PNG', tool: 'color-blindness', run: async (page) => {
    const buf = await pngOf(page, '#ff0000');
    await page.setInputFiles(V + ' .dropzone input[type=file]', { name: 'red.png', mimeType: 'image/png', buffer: buf });
    await waitFor(page, () => { const c = document.querySelector('#view canvas[data-role=simulated]'); return c && c.width === 4; });
    const px = () => page.evaluate(() => [...document.querySelector('#view canvas[data-role=simulated]').getContext('2d').getImageData(1, 1, 1, 1).data].slice(0, 3));
    const a = await px();
    await clickExact(page, 'Achromatopsia (total)');
    const b = await px();
    const title = await page.evaluate(() => document.querySelector('#view canvas[data-role=simulated]').previousSibling.textContent);
    return eq([a, b, title], [[145, 142, 0], [76, 76, 76], 'Achromatopsia (total)']);
  } },
  { name: 'color-mixer: 50% of #3b82f6 and #ef4444 is #95639d', tool: 'color-mixer', run: async page => {
    const a = await text(page, '[data-out=mix]');
    const steps = (await swatches(page)).slice(1);
    await page.fill(V + ' input[type=range]', '0');
    await page.waitForTimeout(150);
    return eq([a, steps.length, steps[1], await text(page, '[data-out=mix]')], ['#95639d', 11, '#4d7ce4', '#3b82f6']);
  } },
  { name: 'color-name: #3b82f6 is closest to royalblue (Δ33.2)', tool: 'color-name', run: async page => {
    const got = await page.evaluate(() => [...document.querySelectorAll('#view .names button')].map(b => b.dataset.name + ' ' + b.querySelector('small').textContent));
    await fill(page, 'input[type=text]', '#ff0001');
    const red = await page.evaluate(() => document.querySelector('#view .names button').dataset.name);
    return eq([got, red], [['royalblue Δ33.2', 'dodgerblue Δ33.4', 'cornflowerblue Δ46.1', 'steelblue Δ66.9', 'slateblue Δ74.1'], 'red']);
  } },
  { name: 'css-color-names: 140 colours, search by name and hex', tool: 'css-color-names', run: async page => {
    const a = await text(page, '[data-out=count]');
    await fill(page, 'input[type=text]', 'ff0000');
    const b = await page.evaluate(() => [...document.querySelectorAll('#view .names button')].map(x => x.dataset.name));
    await fill(page, 'input[type=text]', 'slate');
    return eq([a, b, await text(page, '[data-out=count]')], ['140 colors', ['red'], '6 colors']);
  } },
  { name: 'camera-color-picker: readout names a sampled colour; no camera gives a message', tool: 'camera-color-picker', run: async page => {
    const got = await page.evaluate(() => {
      const root = [...document.querySelectorAll('#view .g-color')].find(n => n.show);
      root.show({ r: 255, g: 0, b: 0 });
      const a = [root.querySelector('h3:not(:empty)') && [...root.querySelectorAll('h3')].map(h => h.textContent).find(t => t === 'Red'), root.querySelector('[data-key=hex] code').textContent, root.querySelector('[data-key=cmyk] code').textContent];
      root.show({ r: 30, g: 60, b: 200 });
      a.push([...root.querySelectorAll('h3')].map(h => h.textContent).includes('Blue'));
      return a;
    });
    return eq(got, ['Red', '#FF0000', 'cmyk(0%, 100%, 100%, 0%)', true]);
  } },

  /* ---------------- crypto ---------------- */
  { name: 'hash-generator: digests of "abc" (MD5, SHA-1/224/256/512, Keccak-512, RIPEMD-160)', tool: 'hash-generator', run: async page => {
    await fill(page, 'textarea', 'abc');
    await clickExact(page, 'Generate Hashes');
    await waitFor(page, () => document.querySelectorAll('#view .hashrow').length === 8);
    const h = await hashes(page);
    return eq([h.MD5, h['SHA-1'], h['SHA-224'], h['SHA-256'], h['SHA-512'].slice(0, 32), h['SHA-384'].slice(0, 16), h['SHA-3'].slice(0, 32), h['RIPEMD-160']], [
      '900150983cd24fb0d6963f7d28e17f72', 'a9993e364706816aba3e25717850c26c9cd0d89d',
      '23097d223405d8228642a477bda255b32aadbce4bda0b3f7e36c9da7',
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      'ddaf35a193617abacc417349ae204131', 'cb00753f45a35e8b', '18587dc2ea106b9a1563e32b3312421c',
      '8eb208f7e05d987a9b044a8e98c6b087f15a0bfc']);
  } },
  { name: 'hash-generator: empty and unicode input', tool: 'hash-generator', run: async page => {
    await fill(page, 'textarea', '');
    await clickExact(page, 'Generate Hashes');
    await waitFor(page, () => document.querySelectorAll('#view .hashrow').length === 8);
    const e = await hashes(page);
    await fill(page, 'textarea', 'héllo 🌍');
    await clickExact(page, 'Generate Hashes');
    await page.waitForTimeout(300);
    const u = await hashes(page);
    return eq([e.MD5, e['SHA-256'].slice(0, 16), e['RIPEMD-160'], u.MD5.length, u['SHA-3'].length], ['d41d8cd98f00b204e9800998ecf8427e', 'e3b0c44298fc1c14', '9c1185a5c5e9fc54612808977ee8f548b2258d31', 32, 128]);
  } },
  { name: 'bcrypt-generator: hash at cost 4, verify match and mismatch', tool: 'bcrypt-generator', run: async page => {
    await page.fill(V + ' input[type=range]', '4');
    await fill(page, 'input[type=password]', 'hunter2');
    await clickExact(page, 'Generate Bcrypt Hash');
    await waitFor(page, () => document.querySelector('#view [data-out=bcrypt]'), null, 20000);
    const h = await text(page, '[data-out=bcrypt]');
    await fill(page, 'input[placeholder="Password to check"]', 'hunter2');
    await fill(page, 'input[placeholder^="$2b$"]', h);
    await clickExact(page, 'Verify');
    await waitFor(page, () => /match/.test(document.querySelector('#view [data-out=verify]').textContent));
    const ok = await text(page, '[data-out=verify]');
    await fill(page, 'input[placeholder="Password to check"]', 'hunter3');
    await clickExact(page, 'Verify');
    await waitFor(page, () => /not match/.test(document.querySelector('#view [data-out=verify]').textContent));
    /* A hash from another implementation (OpenBSD test vector style). */
    await fill(page, 'input[placeholder="Password to check"]', 'U*U');
    await fill(page, 'input[placeholder^="$2b$"]', '$2a$05$CCCCCCCCCCCCCCCCCCCCC.E5YPO9kmyuRGyh0XouQYb4YMJKvyOeW');
    await clickExact(page, 'Verify');
    await waitFor(page, () => /✓|✗/.test(document.querySelector('#view [data-out=verify]').textContent) && !/Checking/.test(document.querySelector('#view [data-out=verify]').textContent));
    const vec = await text(page, '[data-out=verify]');
    return eq([h.slice(0, 7), h.length, ok, vec], ['$2b$04$', 60, '✓ Password matches the hash', '✓ Password matches the hash']);
  } },
  { name: 'password-generator: 5 x 16 by default, 10 x 32 digits-only', tool: 'password-generator', run: async page => {
    await clickExact(page, 'Generate Passwords');
    const a = await page.evaluate(() => [...document.querySelectorAll('#view .pwrow code')].map(c => c.textContent));
    await clickExact(page, '10');
    await page.fill(V + ' input[type=range]', '32');
    for (const l of ['Uppercase (A-Z)', 'Lowercase (a-z)', 'Symbols (!@#$...)']) await page.locator(V + ' label.check', { hasText: l }).click();
    await clickExact(page, 'Generate Passwords');
    const b = await page.evaluate(() => [...document.querySelectorAll('#view .pwrow code')].map(c => c.textContent));
    const setsOk = a.every(p => /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p));
    return eq([a.length, a.every(p => p.length === 16), setsOk, b.length, b.every(p => /^\d{32}$/.test(p))], [5, true, true, 10, true]);
  } },
  { name: 'password-strength: scores, entropy and crack time', tool: 'password-strength', run: async page => {
    const read = async pw => {
      await fill(page, 'input[type=password]', pw);
      return page.evaluate(() => {
        const s = [...document.querySelectorAll('#view .stat b')].map(b => b.textContent);
        return [document.querySelector('#view [data-out=label]').textContent, document.querySelector('#view [data-out=score]').textContent].concat(s);
      });
    };
    return eq([await read('password123'), await read('aaa'), await read('Xk9mQ2vLp7Rt!'), await read('Zq8#Lm3$Vt6@Wp1*Rk4%')], [
      ['Weak', '4/8', '11', '57', 'Days'], ['Very Weak', '2/8', '3', '14', 'Instant'],
      ['Very Strong', '8/8', '13', '85', 'Years'], ['Very Strong', '8/8', '20', '131', 'Centuries']]);
  } },
  { name: 'hmac-generator: "Hello, World!" / secret-key across algorithms', tool: 'hmac-generator', run: async page => {
    const out = async () => { await page.waitForTimeout(250); return text(page, '[data-out=hmac]'); };
    const a = await out();
    const sel = V + ' select';
    await page.selectOption(sel + ' >> nth=0', 'MD5'); const b = await out();
    await page.selectOption(sel + ' >> nth=0', 'SHA-1'); const c = await out();
    await page.selectOption(sel + ' >> nth=0', 'SHA-3'); const d = await out();
    await page.selectOption(sel + ' >> nth=0', 'SHA-1'); await page.selectOption(sel + ' >> nth=1', 'Base64'); const e = await out();
    /* RFC 4231 test case 2 */
    await page.selectOption(sel + ' >> nth=0', 'SHA-256'); await page.selectOption(sel + ' >> nth=1', 'Hex');
    await fill(page, 'textarea', 'what do ya want for nothing?'); await fill(page, 'input[type=password]', 'Jefe');
    const f = await out();
    return eq([a, b, c, d.slice(0, 32), e, f], ['16ee525f6c944ff49a368cd593eb7b72883b14456c7b583bba4ff973ff4b30f9',
      'e2c5b6e6f711a5c2775f93e5c7717cc9', '158046a772cae9f2a8cd6d08f2803f15393b8f9f', '43d53e6a613b6ff8011d1f99f4253bdd',
      'FYBGp3LK6fKozW0I8oA/FTk7j58=', '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843']);
  } },
  { name: 'aes-cipher: decrypts a CryptoJS ciphertext and round-trips', tool: 'aes-cipher', run: async page => {
    await fill(page, 'input[type=password]', 'mykey');
    await fill(page, 'textarea', 'hello world ✓');
    await clickExact(page, 'Encrypt'); await page.waitForTimeout(100);
    await page.locator(V + ' button.btn.primary', { hasText: 'Encrypt' }).click();
    await waitFor(page, () => document.querySelectorAll('#view textarea')[1].value.length > 10);
    const ct = await page.evaluate(() => document.querySelectorAll('#view textarea')[1].value);
    await page.locator(V + ' .chip', { hasText: 'Decrypt' }).click();
    await fill(page, 'textarea', ct);
    await page.locator(V + ' button.btn.primary', { hasText: 'Decrypt' }).click();
    await waitFor(page, () => document.querySelectorAll('#view textarea')[1].value.length > 0);
    const rt = await page.evaluate(() => document.querySelectorAll('#view textarea')[1].value);
    await fill(page, 'textarea', 'U2FsdGVkX1+CD5/j6LUfjpsp0jf5uF4sP//wZZUpqzw=');
    await page.locator(V + ' button.btn.primary', { hasText: 'Decrypt' }).click();
    await waitFor(page, () => document.querySelectorAll('#view textarea')[1].value === 'hello world');
    await fill(page, 'input[type=password]', 'wrong');
    await page.locator(V + ' button.btn.primary', { hasText: 'Decrypt' }).click();
    await page.waitForTimeout(300);
    const err = await page.evaluate(() => [...document.querySelectorAll('#view .note.err')].map(n => n.textContent).join(''));
    return eq([ct.slice(0, 10), rt, /wrong key/.test(err)], ['U2FsdGVkX1', 'hello world ✓', true]);
  } },
  { name: 'jwt-generator: jwt.io reference token for HS256', tool: 'jwt-generator', run: async page => {
    await fill(page, 'textarea', '{"sub":"1234567890","name":"John Doe","iat":1516239022}');
    await page.waitForTimeout(300);
    const a = await text(page, '[data-out=jwt]');
    await fill(page, 'textarea', '{bad json');
    const err = await page.evaluate(() => document.querySelector('#view .note.err') ? document.querySelector('#view .note.err').textContent : '');
    return eq([a, /Invalid JSON/.test(err)], ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c', true]);
  } },
  { name: 'otp-generator: RFC 4226 HOTP vectors and RFC 6238 TOTP step', tool: 'otp-generator', run: async page => {
    await fill(page, 'input[type=text]', 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    await page.waitForTimeout(250);
    const h = [await text(page, '[data-out=hotp]')];
    for (let i = 0; i < 3; i++) { await clickExact(page, 'Generate Next OTP'); await page.waitForTimeout(150); h.push(await text(page, '[data-out=hotp]')); }
    const t = await page.evaluate(async () => {
      const k = window.CryptoKit.base32Decode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
      const step59 = await window.CryptoKit.hotp(k, Math.floor(59 / 30), 8);
      const nowStep = await window.CryptoKit.hotp(k, Math.floor(Date.now() / 30000), 6);
      return [step59, nowStep === document.querySelector('#view [data-out=totp]').textContent];
    });
    await fill(page, 'input[type=text]', 'not base32!');
    const err = await page.evaluate(() => [...document.querySelectorAll('#view .note.err')].length > 0);
    return eq([h, t, err], [['755224', '287082', '359152', '969429'], ['94287082', true], true]);
  } },
  { name: 'caesar-cipher: ROT13 default, brute-force list and decrypt', tool: 'caesar-cipher', run: async page => {
    const out = () => page.evaluate(() => document.querySelectorAll('#view textarea')[1].value);
    const a = await out();
    const brute = await page.evaluate(() => [...document.querySelectorAll('#view .brute span')].map(s => s.textContent));
    await page.locator(V + ' .chip', { hasText: 'Decrypt' }).click();
    await page.fill(V + ' input[type=range]', '3');
    await fill(page, 'textarea', 'Khoor, Zruog!');
    return eq([a, brute.length, brute[3], brute[25], await out()], ['Uryyb, Jbeyq!', 26, 'Khoor, Zruog!', 'Gdkkn, Vnqkc!', 'Hello, World!']);
  } },
  { name: 'vigenere-cipher: SECRET default and ATTACKATDAWN/LEMON', tool: 'vigenere-cipher', run: async page => {
    const out = () => page.evaluate(() => document.querySelectorAll('#view textarea')[1].value);
    const a = await out();
    await page.locator(V + ' .chip', { hasText: 'Decrypt' }).click();
    const b = await out();
    await page.locator(V + ' .chip', { hasText: 'Encrypt' }).click();
    await fill(page, 'input[type=text]', 'LEMON');
    await fill(page, 'textarea', 'ATTACKATDAWN');
    return eq([a, b, await out()], ['Zincs Pgvnu', 'Hello World', 'LXFOPVEFRNHR']);
  } },
  { name: 'rsa-keygen: 1024-bit pair exports importable SPKI and PKCS#8 PEM', tool: 'rsa-keygen', run: async page => {
    await page.selectOption(V + ' select', '1024');
    await clickExact(page, 'Generate Key Pair');
    await waitFor(page, () => document.querySelector('#view [data-out=private]'), null, 30000);
    const r = await page.evaluate(async () => {
      const pub = document.querySelector('#view [data-out=public]').value, priv = document.querySelector('#view [data-out=private]').value;
      const der = p => Uint8Array.from(atob(p.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), c => c.charCodeAt(0));
      const alg = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
      const pk = await crypto.subtle.importKey('spki', der(pub), alg, true, ['verify']);
      const sk = await crypto.subtle.importKey('pkcs8', der(priv), alg, true, ['sign']);
      const sig = await crypto.subtle.sign(alg, sk, new TextEncoder().encode('hi'));
      return [pub.startsWith('-----BEGIN PUBLIC KEY-----'), priv.startsWith('-----BEGIN PRIVATE KEY-----'), pk.algorithm.modulusLength,
        await crypto.subtle.verify(alg, pk, sig, new TextEncoder().encode('hi'))];
    });
    return eq(r, [true, true, 1024, true]);
  } },

  /* ---------------- network ---------------- */
  { name: 'ip-address: rejects an invalid address without a request', tool: 'ip-address', run: async page => {
    await page.waitForTimeout(200);
    await fill(page, 'input', 'not-an-ip!');
    await clickExact(page, 'Lookup');
    const err = await page.evaluate(() => [...document.querySelectorAll('#view .note.err')].map(n => n.textContent).join(''));
    return { ok: /valid IPv4 or IPv6/.test(err), detail: err };
  } },
  { name: 'user-agent: Firefox on Ubuntu, Safari on iPhone, Edge on Windows', tool: 'user-agent', run: async page => {
    const read = async ua => {
      await fill(page, 'textarea', ua);
      return page.evaluate(() => ['Browser', 'Version', 'Os', 'Device', 'Engine'].map(k => document.querySelector('#view [data-key="' + k + '"] code').textContent));
    };
    return eq([
      await read('Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0'),
      await read('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'),
      await read('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.2210.91')
    ], [['Mozilla Firefox', '120.0', 'Ubuntu', 'Desktop', 'Gecko'], ['Safari', '17.0', 'iOS 17.0', 'Mobile', 'WebKit/Blink'],
      ['Microsoft Edge', '120.0.2210.91', 'Windows 10/11', 'Desktop', 'WebKit/Blink']]);
  } },
  { name: 'http-headers: category filter and search', tool: 'http-headers', run: async page => {
    const names = () => page.evaluate(() => [...document.querySelectorAll('#view .hdr')].map(h => h.dataset.header));
    const all = (await names()).length;
    await clickExact(page, 'General');
    const gen = await names();
    await clickExact(page, 'All');
    await fill(page, 'input', 'cors');
    return eq([all, gen, await names()], [28, ['Cache-Control', 'Transfer-Encoding'], ['Access-Control-Allow-Origin']]);
  } },
  { name: 'dns-lookup: record types offered and empty input rejected', tool: 'dns-lookup', run: async page => {
    const opts = await page.evaluate(() => [...document.querySelectorAll('#view select option')].map(o => o.value));
    await fill(page, 'input', '');
    await clickExact(page, 'Lookup');
    const err = await page.evaluate(() => !!document.querySelector('#view .note.err'));
    return eq([opts, err], [['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA', 'PTR'], true]);
  } },
  { name: 'whois-lookup: service links follow the domain', tool: 'whois-lookup', run: async page => {
    await fill(page, 'input', 'https://GitHub.com/some/path');
    const got = await page.evaluate(() => [...document.querySelectorAll('#view .links a')].map(a => a.getAttribute('href')));
    return eq(got, ['https://lookup.icann.org/lookup?name=github.com', 'https://whois.domaintools.com/github.com', 'https://who.is/whois/github.com', 'https://search.arin.net/rdap/?query=github.com']);
  } },
  { name: 'port-checker: add ports and build checker links', tool: 'port-checker', run: async page => {
    await fill(page, 'input[type=text]', 'example.org');
    await fill(page, 'input[type=number]', '22');
    await clickExact(page, 'Add');
    const a = await page.evaluate(() => [...document.querySelectorAll('#view .links a')].map(x => x.getAttribute('href')));
    await clickExact(page, 'All Common');
    const n = await page.evaluate(() => document.querySelectorAll('#view .links a').length);
    await fill(page, 'input[type=number]', '70000');
    await clickExact(page, 'Add');
    const err = await page.evaluate(() => !!document.querySelector('#view .note.err'));
    return eq([a, n, err], [['https://www.yougetsignal.com/tools/open-ports/?remoteAddress=example.org&portNumber=22', 'https://canyouseeme.org/?action=check&port=22'], 30, true]);
  } },
  { name: 'ping-tool: invalid host is rejected before any request', tool: 'ping-tool', run: async page => {
    await fill(page, 'input', 'bad host!');
    await clickExact(page, 'Ping');
    const err = await page.evaluate(() => [...document.querySelectorAll('#view .note.err')].map(n => n.textContent).join(''));
    return { ok: /valid host/.test(err), detail: err };
  } },
  { name: 'ssl-checker: analyser links use the domain', tool: 'ssl-checker', run: async page => {
    await fill(page, 'input', 'example.com');
    const got = await page.evaluate(() => [...document.querySelectorAll('#view .links a')].map(a => a.getAttribute('href')));
    return eq(got, ['https://www.ssllabs.com/ssltest/analyze.html?d=example.com&latest', 'https://www.sslshopper.com/ssl-checker.html#hostname=example.com',
      'https://www.digicert.com/help/', 'https://securityheaders.com/?q=example.com']);
  } },
  { name: 'htaccess-generator: default rules, www redirect toggle', tool: 'htaccess-generator', run: async page => {
    const out = () => page.evaluate(() => document.querySelector('#view textarea').value);
    const a = await out();
    await page.locator(V + ' label.check', { hasText: 'Force www redirect' }).click();
    await fill(page, 'input[type=text]', 'mysite.org');
    const b = await out();
    await page.locator(V + ' label.check', { hasText: 'Remove www' }).click();
    const c = await out();
    return eq([a.includes('RewriteCond %{HTTPS} off'), a.includes('Options -Indexes'), a.includes('ErrorDocument 404 /404.html'), a.includes('www'),
      b.includes('RewriteRule ^(.*)$ https://www.mysite.org/$1 [L,R=301]'), c.includes('# Force www'), c.includes('RewriteRule ^(.*)$ https://%1/$1 [L,R=301]')],
    [true, true, true, false, true, false, true]);
  } },
  { name: 'robots-txt: default output, crawl delay and removal', tool: 'robots-txt', run: async page => {
    const out = () => page.evaluate(() => [...document.querySelectorAll('#view textarea')].pop().value);
    const a = await out();
    await fill(page, 'input[type=number]', '10');
    const b = await out();
    await page.locator(V + ' .rule').nth(1).locator('button', { hasText: 'Remove' }).click();
    const c = await out();
    return eq([a, b.split('Crawl-delay: 10').length - 1, c], [
      'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /private/\n\nUser-agent: Googlebot\nAllow: /\n\nSitemap: https://example.com/sitemap.xml', 2,
      'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /private/\nCrawl-delay: 10\n\nSitemap: https://example.com/sitemap.xml']);
  } },
  { name: 'ip-subnet-calc: 192.168.1.100/24 and 10.0.0.5/30', tool: 'ip-subnet-calc', run: async page => {
    const read = () => page.evaluate(() => ['Subnet Mask', 'Network Address', 'Broadcast Address', 'First Host', 'Last Host', 'Usable Hosts', 'IP Class']
      .map(k => document.querySelector('#view [data-key="' + k + '"] code').textContent));
    const a = await read();
    await fill(page, 'input[type=text]', '10.0.0.5');
    await clickExact(page, '/30');
    const b = await read();
    await fill(page, 'input[type=text]', '300.1.1.1');
    await clickExact(page, 'Calculate');
    const err = await page.evaluate(() => !!document.querySelector('#view .note.err'));
    return eq([a, b, err], [['255.255.255.0', '192.168.1.0', '192.168.1.255', '192.168.1.1', '192.168.1.254', '254', 'Class C'],
      ['255.255.255.252', '10.0.0.4', '10.0.0.7', '10.0.0.5', '10.0.0.6', '2', 'Class A'], true]);
  } },
  { name: 'url-builder: default URL, encoding and parse-back', tool: 'url-builder', run: async page => {
    const out = () => text(page, '[data-out=url]');
    const a = await out();
    await page.locator(V + ' input[placeholder="value"]').first().fill('a b&c');
    await page.fill(V + ' input[placeholder="section-id"]', 'top');
    await page.waitForTimeout(100);
    const b = await out();
    await page.fill(V + ' input[placeholder^="Paste a URL"]', 'http://shop.test:81/items/list?sort=price&dir=asc#reviews');
    await page.waitForTimeout(100);
    return eq([a, b, await out()], ['https://example.com/api/users?page=1&limit=20', 'https://example.com/api/users?page=a%20b%26c&limit=20#top',
      'http://shop.test:81/items/list?sort=price&dir=asc#reviews']);
  } },
  { name: 'network-speed-test: start button and speed guide present', tool: 'network-speed-test', run: async page => {
    const got = await page.evaluate(() => [!!([...document.querySelectorAll('#view button')].find(b => b.textContent === 'Start Speed Test')),
      document.querySelectorAll('#view table tbody tr').length]);
    return eq(got, [true, 5]);
  } },
  { name: 'contrast-grid: pass count matches WCAG maths for the default palette', tool: 'contrast-grid', run: async page => {
    const cols = ['#ffffff', '#f6f7fb', '#14161f', '#5d6478', '#4f46e5', '#157f4a', '#b3261e', '#e0a94a'];
    const lum = h => { const ch = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; const n = parseInt(h.slice(1), 16); return 0.2126 * ch(n >> 16) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255); };
    let pass = 0, total = 0;
    cols.forEach(a => cols.forEach(b => { if (a === b) return; total++; const x = lum(a), y = lum(b); if ((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) >= 4.5) pass++; }));
    const got = await page.$eval('#view .note[data-pass]', n => [n.dataset.pass, n.dataset.total]);
    const cell = await page.evaluate(() => document.querySelector('#view td[title^="#14161f on #ffffff"] div').textContent);
    return eq([+got[0], +got[1], cell], [pass, total, '18.0']);
  } },
  { name: 'certificate-decoder: self-signed EC cert: subject, SANs, key, validity and fingerprint', tool: 'certificate-decoder', run: async page => {
    const cert = new (require('crypto').X509Certificate)(TEST_CRT);
    await fill(page, 'textarea', TEST_CRT);
    await waitFor(page, () => document.querySelector('#view [data-k="state"]'));
    const t = await page.evaluate(() => document.querySelector('#view .stack').innerText.replace(/\s+/g, ' '));
    const state = await page.$eval('#view [data-k="state"]', n => n.textContent);
    return all([
      eq(/CN=test.example.com, O=All The Tools, L=London, ST=England, C=GB|C=GB, ST=England, L=London, O=All The Tools, CN=test.example.com/.test(t), true),
      eq(/\(self-signed\)/.test(t), true),
      eq(/DNS: test.example.com DNS: www.test.example.com IP: 192.0.2.1/.test(t), true),
      eq(/EC 256-bit, P-256 \(prime256v1\)/.test(t), true),
      eq(/ECDSA with SHA-256/.test(t), true),
      eq(t.includes(cert.fingerprint256), true),
      eq(/Key Usage \(critical\)[^]*Digital signature/.test(t), true),
      eq(/TLS server authentication/.test(t), true),
      eq(/^Valid, expires in \d+ days$/.test(state), true)
    ].map((r, i) => ({ ok: r.ok, detail: 'check ' + i + ' failed: ' + t.slice(0, 200) })));
  } },
  { name: 'certificate-decoder: a CSR and an RSA public key decode too', tool: 'certificate-decoder', run: async page => {
    await fill(page, 'textarea', TEST_CSR);
    await waitFor(page, () => /Certificate Signing Request/.test(document.querySelector('#view .stack').innerText));
    const t = await page.evaluate(() => document.querySelector('#view .stack').innerText.replace(/\s+/g, ' '));
    const pub = require('crypto').generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ type: 'spki', format: 'pem' });
    await fill(page, 'textarea', pub);
    await waitFor(page, () => /PUBLIC KEY/.test(document.querySelector('#view .stack').innerText));
    const k = await page.evaluate(() => document.querySelector('#view .stack').innerText.replace(/\s+/g, ' '));
    return all([eq(/CN=csr.example.com, O=CSR Org/.test(t), true), eq(/Requested: Subject Alternative Name DNS: csr.example.com/.test(t), true), eq(/RSA, 2048-bit/.test(k), true)].map((r, i) => ({ ok: r.ok, detail: 'check ' + i + ': ' + (i < 2 ? t : k).slice(0, 200) })));
  } },
  { name: 'ipv6-tool: expand, compress, reverse DNS, prefix and IPv4-mapped', tool: 'ipv6-tool', run: async page => {
    const a = [await tile(page, 'Compressed (RFC 5952)'), await tile(page, 'Expanded'), await tile(page, 'Reverse DNS (PTR)'), await tile(page, 'Prefix'), await tile(page, 'Last address'), await tile(page, '/64 subnets inside')];
    await fill(page, 'input[type=text]', '::ffff:192.0.2.128');
    await page.waitForTimeout(200);
    const b = [await tile(page, 'Type'), await tile(page, 'Embedded IPv4'), await tile(page, 'Compressed (RFC 5952)')];
    await fill(page, 'input[type=text]', '2001:db8:0:0:1:0:0:1/48');
    await page.waitForTimeout(200);
    const c = [await tile(page, 'Compressed (RFC 5952)'), await tile(page, 'Prefix'), await tile(page, '/64 subnets inside')];
    await fill(page, 'input[type=text]', '2001:db8:::1');
    await page.waitForTimeout(200);
    const err = await text(page, '.note.err');
    return eq([a, b, c, err], [
      ['2001:db8::ff00:42:8329', '2001:0db8:0000:0000:0000:ff00:0042:8329', '9.2.3.8.2.4.0.0.0.0.f.f.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa', '2001:db8::/64', '2001:db8::ffff:ffff:ffff:ffff', '1'],
      ['IPv4-mapped address (::ffff:a.b.c.d)', '192.0.2.128', '::ffff:c000:280'],
      ['2001:db8::1:0:0:1', '2001:db8::/48', '65,536'],
      'Too many colons in a row.']);
  } }
];
