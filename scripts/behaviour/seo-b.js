/* Behaviour checks for the seo-b tools and og-preview (which absorbed the Open
   Graph and Twitter Card generators). Expected values come from the specs
   the tools implement (Open Graph, RFC 9116, llms.txt v2, Google's hreflang
   rules, mod_rewrite/nginx/Netlify/Vercel syntax) and are worked out by hand
   from each fixture. */
'use strict';

const V = '#view';
const Q = k => `${V} [data-k="${k}"]`;
async function get(page, k) {
  return page.$eval(Q(k), n => (/^(TEXTAREA|INPUT|SELECT)$/.test(n.tagName) ? n.value : n.innerText));
}
async function set(page, k, v) {
  await page.$eval(Q(k), (n, v) => {
    n.value = v;
    n.dispatchEvent(new Event('input', { bubbles: true }));
    n.dispatchEvent(new Event('change', { bubbles: true }));
  }, v);
  await page.waitForTimeout(250);
}
async function clickBtn(page, label) {
  await page.$$eval(`${V} button`, (bs, label) => { const b = bs.find(x => x.textContent.trim() === label); if (!b) throw new Error('no button ' + label); b.click(); }, label);
  await page.waitForTimeout(250);
}
async function chip(page, k, label) {
  await page.$$eval(Q(k) + ' button', (bs, label) => { const b = bs.find(x => x.textContent.trim() === label); if (!b) throw new Error('no chip ' + label); b.click(); }, label);
  await page.waitForTimeout(250);
}
async function items(page, k) { return page.$$eval(Q(k) + ' li', ls => ls.map(l => l.className + ': ' + l.textContent)); }
const res = (ok, detail) => ({ ok: !!ok, detail: String(detail).slice(0, 200) });
function all(list) {
  const bad = list.filter(x => !x[0]);
  return bad.length ? res(false, bad.map(x => x[1]).join(' | ')) : res(true, '');
}

module.exports = [
  /* ---------------- og-preview (merged Open Graph + Twitter Card generators) ---------------- */
  { name: 'og-preview: og:type, site name, article tags and card type (from og-tag-generator)', tool: 'og-preview', run: async page => {
    await set(page, 'type', 'article'); await set(page, 'site', 'Acme');
    await set(page, 'atags', 'baking, bread'); await set(page, 'section', 'Food');
    const o = await get(page, 'tags');
    await set(page, 'type', 'product'); await set(page, 'price', '£5');
    const p = await get(page, 'tags'), w = (await items(page, 'warnings')).join(' ');
    return all([
      [o.includes('<meta property="og:type" content="article">'), 'type'], [o.includes('<meta property="og:site_name" content="Acme">'), 'site'],
      [o.includes('<meta name="twitter:card" content="summary_large_image">'), 'card'], [o.includes('<meta property="article:tag" content="baking">') && o.includes('<meta property="article:tag" content="bread">'), 'tags'],
      [o.includes('<meta property="article:section" content="Food">'), 'section'], [o.includes('<meta property="og:locale" content="en_GB">'), 'locale'],
      [p.includes('<meta property="product:price:currency" content="GBP">') && !p.includes('article:tag'), 'product ' + p.slice(-300)], [/plain number/.test(w), 'price warning ' + w]
    ]);
  } },
  { name: 'og-preview: player card fields, creator handle and HTTPS check (from twitter-card-generator)', tool: 'og-preview', run: async page => {
    const d = await get(page, 'tags');
    await set(page, 'card', 'player'); await set(page, 'creator', 'someone');
    const o = await get(page, 'tags'), w1 = (await items(page, 'warnings')).join(' ');
    await set(page, 'player', 'https://example.com/embed/7');
    const w2 = (await items(page, 'warnings')).join(' ');
    await set(page, 'card', 'app');
    const a = (await items(page, 'warnings')).join(' ');
    await set(page, 'app-iphone', '307234931');
    const o2 = await get(page, 'tags');
    return all([
      [d.includes('<meta name="twitter:card" content="summary_large_image">') && d.includes('<meta name="twitter:site" content="@example">'), 'default'],
      [o.includes('<meta name="twitter:card" content="player">') && o.includes('<meta name="twitter:player:width" content="480">'), 'player'],
      [o.includes('<meta name="twitter:creator" content="@someone">'), 'creator'],
      [/HTTPS player URL/.test(w1) && !/HTTPS player URL/.test(w2), 'https warning'],
      [/at least one App Store/.test(a), 'app warning'], [o2.includes('<meta name="twitter:app:id:iphone" content="307234931">'), 'app id']
    ]);
  } },
  { name: 'og-preview: imports existing tags from pasted HTML and previews on each platform', tool: 'og-preview', run: async page => {
    await set(page, 'import', '<head><title>Old</title><meta property="og:title" content="Imported title"><meta property="og:image" content="https://cdn.test/i.png">' +
      '<meta property="og:image:width" content="800"><meta property="og:image:height" content="400"><meta name="twitter:card" content="summary"><meta property="og:url" content="https://news.test/a"></head>');
    await clickBtn(page, 'Read tags');
    const t = await get(page, 'title'), w = await get(page, 'w'), card = await get(page, 'card');
    const pv = [];
    for (const l of ['Facebook', 'LinkedIn', 'Slack', 'Discord', 'WhatsApp']) { await page.locator(V).getByRole('button', { name: l, exact: true }).first().click(); await page.waitForTimeout(80); pv.push(await get(page, 'preview')); }
    const tags = await get(page, 'tags');
    return all([[t === 'Imported title' && w === '800' && card === 'summary', t + '/' + w + '/' + card],
      [pv.every(x => x.includes('Imported title')), 'previews'], [pv[0].toLowerCase().includes('news.test'), 'fb domain'],
      [tags.includes('<meta property="og:image:type" content="image/png">'), 'image type']]);
  } },

  /* ---------------- web-manifest ---------------- */
  { name: 'web-manifest: manifest JSON and installability warnings', tool: 'web-manifest', run: async page => {
    const m = JSON.parse(await get(page, 'manifest'));
    await set(page, 'short', 'Toolbox Deluxe'); await set(page, 'display', 'browser');
    await set(page, 'start', '/app/'); await set(page, 'scope', '/admin/');
    const w = (await items(page, 'warnings')).join(' | ');
    const head = await get(page, 'head');
    return all([
      [m.name === 'Example App' && m.short_name === 'Example' && m.display === 'standalone' && m.start_url === '/?source=pwa', 'basics ' + JSON.stringify(m).slice(0, 120)],
      [m.icons.length === 4 && m.icons[1].sizes === '512x512' && m.icons[2].purpose === 'maskable' && m.icons[0].src === '/icons/icon-192.png', 'icons'],
      [/short_name is 14 characters/.test(w), 'short'], [/err: display "browser"/.test(w), 'browser'], [/err: start_url \(\/app\/\) is outside the scope/.test(w), 'scope'],
      [head.includes('<link rel="manifest" href="/manifest.webmanifest">') && head.includes('<meta name="theme-color" content="#4f46e5">'), 'head']
    ]);
  } },
  { name: 'web-manifest: icons from a 300 × 200 image land in the ZIP at the right sizes', tool: 'web-manifest', run: async page => {
    const b64 = await page.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 300; c.height = 200;
      const g = c.getContext('2d'); g.fillStyle = '#ff0000'; g.fillRect(0, 0, 300, 200);
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      const u = new Uint8Array(await blob.arrayBuffer()); let s = ''; u.forEach(x => { s += String.fromCharCode(x); }); return btoa(s);
    });
    await set(page, 'bg', '#123456');
    await page.setInputFiles(`${V} input[type=file]`, { name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') });
    await page.waitForFunction(() => document.querySelectorAll('#view [data-k="icons"] figure').length >= 6, null, { timeout: 10000 });
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), clickBtn(page, 'Download icons + manifest (ZIP)')]);
    const JSZip = require('jszip');
    const zip = await JSZip.loadAsync(require('fs').readFileSync(await dl.path()));
    const names = Object.keys(zip.files).filter(n => !zip.files[n].dir).sort();
    const dims = {};
    for (const n of names.filter(x => x.endsWith('.png'))) { const b = await zip.file(n).async('nodebuffer'); dims[n] = [b.readUInt32BE(16), b.readUInt32BE(20), b.toString('base64')]; }
    const px = await page.evaluate(async list => {
      const out = {};
      for (const [n, b64, x, y] of list) {
        const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
        const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; const g = c.getContext('2d'); g.drawImage(bmp, 0, 0);
        out[n + '@' + x + ',' + y] = Array.from(g.getImageData(x, y, 1, 1).data).join(',');
      }
      return out;
    }, [['any', dims['icons/icon-192.png'][2], 2, 2], ['any', dims['icons/icon-192.png'][2], 96, 96], ['mask', dims['icons/maskable-512.png'][2], 3, 3], ['mask', dims['icons/maskable-512.png'][2], 256, 256]]);
    const man = JSON.parse(await zip.file('manifest.webmanifest').async('string'));
    return all([
      [JSON.stringify(names) === JSON.stringify(['head-tags.html', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-192.png', 'icons/maskable-512.png', 'manifest.webmanifest']), names.join(',')],
      [dims['icons/icon-192.png'][0] === 192 && dims['icons/icon-512.png'][1] === 512 && dims['icons/maskable-512.png'][0] === 512 && dims['icons/apple-touch-icon.png'][0] === 180, 'sizes'],
      /* 300×200 contained in 192² leaves 32 px transparent bands top and bottom; maskable corners take the background colour */
      [px['any@2,2'].endsWith(',0') && px['any@96,96'] === '255,0,0,255', 'any ' + px['any@2,2'] + ' ' + px['any@96,96']],
      [px['mask@3,3'] === '18,52,86,255' && px['mask@256,256'] === '255,0,0,255', 'mask ' + px['mask@3,3'] + ' ' + px['mask@256,256']],
      [man.background_color === '#123456' && dl.suggestedFilename() === 'web-app-manifest.zip', 'manifest']
    ]);
  } },

  /* ---------------- security-txt ---------------- */
  { name: 'security-txt: fields, required checks and expiry rules (RFC 9116)', tool: 'security-txt', run: async page => {
    const o = await get(page, 'out');
    const expires = (o.match(/^Expires: (.*)$/m) || [])[1] || '';
    const days = (Date.parse(expires) - Date.now()) / 864e5;
    await set(page, 'domain', 'shop.test');
    const o2 = await get(page, 'out');
    await page.fill(`${V} [data-k="contacts"] input`, 'http://shop.test/report');
    await page.$eval(`${V} [data-k="contacts"] select`, s => { s.value = 'https'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.waitForTimeout(200);
    await set(page, 'expires', '2020-01-01T10:00');
    await set(page, 'langs', 'en, not a tag');
    const w = (await items(page, 'issues')).join(' | ');
    return all([
      [/^Contact: mailto:security@example\.com$/m.test(o) && /^Encryption: https:\/\/example\.com\/pgp-key\.txt$/m.test(o) && /^Preferred-Languages: en$/m.test(o), o.slice(0, 160)],
      [/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/.test(expires) && days > 300 && days < 366, 'expires ' + expires],
      [/^Canonical: https:\/\/shop\.test\/\.well-known\/security\.txt$/m.test(o2), 'canonical'],
      [/must use https/.test(w), 'https ' + w], [/expired on 01\/01\/2020/.test(w), 'expired'], [/not valid: not a tag/.test(w), 'langs']
    ]);
  } },
  { name: 'security-txt: checks and loads a signed file', tool: 'security-txt', run: async page => {
    const signed = ['-----BEGIN PGP SIGNED MESSAGE-----', 'Hash: SHA512', '', 'Contact: mailto:sec@corp.test', 'Contact: tel:+44-20-7946-0000',
      'Expires: 2099-01-31T12:00:00.000Z', 'Preferred-Languages: en, cy', 'Canonical: https://corp.test/.well-known/security.txt', 'Hiring: https://corp.test/jobs', 'Foo: bar',
      '-----BEGIN PGP SIGNATURE-----', '', 'iQIzBAEBCgAdFiEE', '-----END PGP SIGNATURE-----'].join('\n');
    await set(page, 'import', signed);
    await clickBtn(page, 'Check and load');
    const w = (await items(page, 'import-issues')).join(' | ');
    const o = await get(page, 'out');
    return all([[/ok: The file carries an OpenPGP cleartext signature/.test(w), w], [/warn: Expires is \d+ days away/.test(w), 'far expiry'],
      [/info: Foo is not an RFC 9116 field/.test(w), 'unknown field'],
      [o.includes('Contact: mailto:sec@corp.test\nContact: tel:+44-20-7946-0000\nExpires: 2099-01-31T12:00:00.000Z') && o.includes('Hiring: https://corp.test/jobs'), o.slice(0, 200)]]);
  } },

  /* ---------------- llms-txt ---------------- */
  { name: 'llms-txt: default file follows the proposal, and a loose file is normalised', tool: 'llms-txt', run: async page => {
    const d = await get(page, 'out');
    const i1 = (await items(page, 'issues')).join(' ');
    await set(page, 'check', '#  Acme API\n\n> Tools for rockets.\n\n## Docs\n\n* [Quick start]( https://acme.test/start.md ) :  Install and first call\n\n## Optional\n- [Changelog](https://acme.test/changes.md)\n');
    await clickBtn(page, 'Load into the editor');
    const o = await get(page, 'out');
    return all([
      [d.startsWith('# Example Docs\n\n> Example is a hosted API') && d.includes('\n## Docs\n\n- [Quick start](https://example.com/docs/quickstart.md): Create a key and send your first email\n') &&
        d.endsWith('## Optional\n\n- [Changelog](https://example.com/changelog.md)\n'), d.slice(0, 120)],
      [/2 sections, 3 links/.test(i1), i1],
      [o === '# Acme API\n\n> Tools for rockets.\n\n## Docs\n\n- [Quick start](https://acme.test/start.md): Install and first call\n\n## Optional\n\n- [Changelog](https://acme.test/changes.md)\n', JSON.stringify(o)]
    ]);
  } },
  { name: 'llms-txt: format errors are reported with line numbers', tool: 'llms-txt', run: async page => {
    await set(page, 'check', 'Intro line\n# Title\n# Second\n## Links\n- [Bad](https://x.test/a) - notes here\nSome prose\n### Deep\n- [Rel](docs/a.md)\n## Empty\n');
    await clickBtn(page, 'Check');
    const w = (await items(page, 'check-issues')).join(' | ');
    return all([[/err: Line 1: the file must open with an H1/.test(w), 'h1 first ' + w], [/err: Line 3: only one H1/.test(w), 'second h1'],
      [/Line 5: put a colon after the link/.test(w), 'colon'], [/Line 6: "Links" should hold only a list/.test(w), 'prose'], [/Line 7: H3 headings/.test(w), 'h3'],
      [/info: Line 8: docs\/a\.md is relative/.test(w), 'relative'], [/Section "Empty" \(line 9\) has no links/.test(w), 'empty']]);
  } },

  /* ---------------- hreflang-generator ---------------- */
  { name: 'hreflang-generator: tags, Link header and sitemap for two languages plus x-default', tool: 'hreflang-generator', run: async page => {
    await set(page, 'bulk', 'en-gb https://example.com/uk/\nde, https://example.com/de/\nx-default https://example.com/');
    await clickBtn(page, 'Replace versions');
    const html = await get(page, 'out');
    await chip(page, 'format', 'HTTP header');
    const hdr = await get(page, 'out');
    await chip(page, 'format', 'XML sitemap');
    const xml = await get(page, 'out');
    const w = (await items(page, 'issues')).join(' | ');
    return all([
      [html === '<link rel="alternate" hreflang="en-GB" href="https://example.com/uk/" />\n<link rel="alternate" hreflang="de" href="https://example.com/de/" />\n<link rel="alternate" hreflang="x-default" href="https://example.com/" />', html],
      [hdr === 'Link: <https://example.com/uk/>; rel="alternate"; hreflang="en-GB", <https://example.com/de/>; rel="alternate"; hreflang="de", <https://example.com/>; rel="alternate"; hreflang="x-default"', hdr],
      [(xml.match(/<url>/g) || []).length === 3 && (xml.match(/<xhtml:link /g) || []).length === 9 && xml.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'), 'sitemap'],
      [/ok: 2 versions checked/.test(w), w]
    ]);
  } },
  { name: 'hreflang-generator: bad codes, missing x-default and missing return links', tool: 'hreflang-generator', run: async page => {
    await set(page, 'bulk', 'en-UK https://example.com/uk/\njp https://example.com/jp/\nen_GB https://example.com/gb/\nes-419 https://example.com/latam/\nfr /fr/');
    await clickBtn(page, 'Replace versions');
    const w = (await items(page, 'issues')).join(' | ');
    await set(page, 'audit-in', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' +
      '<url><loc>https://a.test/en/</loc><xhtml:link rel="alternate" hreflang="en" href="https://a.test/en/"/><xhtml:link rel="alternate" hreflang="de" href="https://a.test/de/"/></url>' +
      '<url><loc>https://a.test/de/</loc><xhtml:link rel="alternate" hreflang="de" href="https://a.test/de/"/></url></urlset>');
    await clickBtn(page, 'Check return links');
    const a = (await items(page, 'audit')).join(' | ');
    return all([[/United Kingdom's code is GB/.test(w), 'UK'], [/"jp" is a country code, not a language code: did you mean ja\?/.test(w), 'jp'],
      [/use a hyphen, not an underscore \(en-GB\)/.test(w), 'underscore'], [/"419" is a UN M\.49 region/.test(w), '419'], [/"\/fr\/" must be a full URL/.test(w), 'relative'],
      [/Add an x-default URL/.test(w), 'x-default'],
      [/err: No return link: https:\/\/a\.test\/en\/ points to https:\/\/a\.test\/de\/ \(de\)/.test(a) && /Checked 2 pages: 1 error/.test(a), a]]);
  } },

  /* ---------------- heading-outline ---------------- */
  { name: 'heading-outline: outline, skipped level, empty and repeated h1, alt coverage', tool: 'heading-outline', run: async page => {
    await set(page, 'html', '<html><head><title>Short</title></head><body><h1>Main</h1><h2>A</h2><h4>Deep</h4><h3>  </h3><h1>Again</h1>' +
      '<div role="heading" aria-level="2">Aria <img src="x.png" alt="heading"></div><img src="a.png"><img src="b.png" alt=""><img src="c.png" alt="IMG_1234.jpg"></body></html>');
    const stats = (await get(page, 'stats')).replace(/\s+/g, ' ').trim();
    const outline = await page.$$eval(Q('outline') + ' li', ls => ls.map(l => l.textContent));
    const w = (await items(page, 'issues')).join(' | '), b = (await items(page, 'basics')).join(' | ');
    return all([
      [stats === '6 Headings 2 h1 3 Issues 3/4 Images with alt', stats],
      [JSON.stringify(outline) === JSON.stringify(['H1Main', 'H2A', 'H4Deep', 'H3(empty heading)', 'H1Again', 'H2Aria heading [role="heading"]']), JSON.stringify(outline)],
      [/warn: 2 h1 headings/.test(w) && /h4 "Deep" follows h2 "A": h3 is skipped/.test(w) && /err: An empty h3 \(heading 4\)/.test(w), w],
      [/3 of 4 images have an alt attribute \(75%\), 1 marked decorative/.test(b) && /No alt: a\.png/.test(b) && /just a file name: "IMG_1234\.jpg"/.test(b), b],
      [/Title: 5 characters \("Short"\): very short/.test(b) && /No meta description/.test(b), 'title/desc']
    ]);
  } },

  /* ---------------- jsonld-validator ---------------- */
  { name: 'jsonld-validator: blocks, JSON error position, required properties and value checks', tool: 'jsonld-validator', run: async page => {
    const l9 = '{"@context": "https://schema.org", "@type": "Article", "headline": "x",}';
    await set(page, 'in', ['<p>intro</p>', '<script type="application/ld+json">',
      '{"@context":"https://schema.org","@type":"Product","name":"Widget","offers":{"@type":"Offer","price":"£9.99","priceCurrency":"GBP","availability":"https://schema.org/InStock"}}',
      '</script>', '<script type="application/ld+json">', '{"@context":"https://schema.org","@type":"Event","name":"Gig","startDate":"2026-13-01"}', '</script>',
      '<script type="application/ld+json">', l9, '</script>'].join('\n'));
    const stats = (await get(page, 'stats')).replace(/\s+/g, ' ').trim();
    const w = (await items(page, 'issues')).join(' | ');
    const col = l9.lastIndexOf(',') + 1;
    return all([
      [/^3 Blocks 3 Items 4 Errors \d+ Warnings$/.test(stats), stats],
      [w.includes('Block 3: JSON error at line 9, column ' + col + ' (line 2 of the block): Trailing comma: remove the comma before }.'), 'json ' + w.slice(0, 200)],
      [/Block 1: Offer \(offers\) › price: "£9\.99" must be a plain number without a currency symbol/.test(w), 'price'],
      [/Block 2: Event: missing required location\./.test(w), 'location'], [/"2026-13-01" is not a valid ISO 8601 date/.test(w), 'date'],
      [/warn: Block 1: Product: add recommended image/.test(w), 'recommended']
    ]);
  } },
  { name: 'jsonld-validator: @graph with @id references, breadcrumbs, typos and missing @context', tool: 'jsonld-validator', run: async page => {
    await set(page, 'in', JSON.stringify({ '@context': 'https://schema.org', '@graph': [
      { '@type': 'Organization', '@id': '#org', name: 'Acme', url: 'https://acme.test/', logo: 'logo.png' },
      { '@type': 'NewsArticle', headline: 'Hi', author: { '@id': '#org' }, datePublished: '2026-09-22T09:00:00+01:00', dateModified: '2026-09-22', image: 'https://acme.test/a.jpg' },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://acme.test/' }, { '@type': 'ListItem', position: 3 }] },
      { '@type': 'Prodcut', name: 'x' }] }, null, 2));
    const w = (await items(page, 'issues')).join(' | ');
    await set(page, 'in', '{"@type": "Person", "name": "Ann", "author": "Bob"}');
    const w2 = (await items(page, 'issues')).join(' | ');
    return all([
      [!/NewsArticle[^|]*author/.test(w), 'author @id should resolve to the Organization ' + w],
      [/Organization › logo: "logo\.png" is not an absolute URL/.test(w), 'logo'],
      [/BreadcrumbList item 2: position is 3/.test(w) && /BreadcrumbList item 2: missing name/.test(w), 'crumbs'],
      [/"Prodcut" is not a schema\.org type\. Did you mean "Product"\?/.test(w), 'typo'],
      [/Person has no "@context"/.test(w2) && /author is plain text; Google expects Person or Organization/.test(w2), w2]
    ]);
  } },

  /* ---------------- redirect-generator ---------------- */
  { name: 'redirect-generator: Apache, nginx, Netlify, Vercel, Cloudflare, IIS and Caddy output', tool: 'redirect-generator', run: async page => {
    await set(page, 'bulk', 'old,new,status\n/old,/new,301\n/blog/*,/news/*,308');
    await clickBtn(page, 'Replace rows');
    const out = {};
    for (const f of ['Apache .htaccess', 'nginx', 'Netlify _redirects', 'Vercel vercel.json', 'Cloudflare bulk CSV', 'IIS web.config', 'Caddy']) { await chip(page, 'format', f); out[f] = await get(page, 'out'); }
    const v = JSON.parse(out['Vercel vercel.json']);
    const net = out['Netlify _redirects'].split('\n').slice(1).map(l => l.trim().split(/\s+/).join(' '));
    return all([
      [out['Apache .htaccess'].includes('RewriteEngine On') && out['Apache .htaccess'].includes('RewriteRule ^old/?$ /new [R=301,L]') && out['Apache .htaccess'].includes('RewriteRule ^blog/(.*)$ /news/$1 [R=308,L]'), out['Apache .htaccess']],
      [out.nginx.includes('location ~ "^/old/?$" {\n    return 301 /new$is_args$args;\n}') && out.nginx.includes('location ~ "^/blog/(.*)$" {\n    return 308 /news/$1$is_args$args;\n}'), out.nginx],
      [JSON.stringify(net) === JSON.stringify(['/old /new 301', '/blog/* /news/:splat 308']), JSON.stringify(net)],
      [JSON.stringify(v.redirects) === JSON.stringify([{ source: '/old{/}?', destination: '/new', statusCode: 301 }, { source: '/blog/:path*', destination: '/news/:path*', permanent: true }]), JSON.stringify(v)],
      [out['Cloudflare bulk CSV'] === 'example.com/old,https://example.com/new,301,TRUE,FALSE,FALSE,FALSE\nexample.com/blog/,https://example.com/news/,308,TRUE,FALSE,TRUE,TRUE', out['Cloudflare bulk CSV']],
      [out['IIS web.config'].includes('<match url="^old/?$" ignoreCase="false" />') && out['IIS web.config'].includes('<action type="Redirect" url="/news/{R:1}" redirectType="Permanent" appendQueryString="true" />'), 'iis'],
      [out.Caddy.includes('  @r1 {\n    path_regexp r1 ^/old/?$\n  }\n  redir @r1 /new{?query} 301') && out.Caddy.includes('redir @r2 /news/{re.r2.1}{?query} 308'), out.Caddy]
    ]);
  } },
  { name: 'redirect-generator: chains, loops, query-string rules and options', tool: 'redirect-generator', run: async page => {
    await set(page, 'bulk', '/a\t/b\n/b\t/c\n/x\t/y\n/y\t/x\n/shop/*\t/shop/new/*');
    await clickBtn(page, 'Replace rows');
    const w = (await items(page, 'issues')).join(' | ');
    await set(page, 'bulk', '/product.php?id=5,/products/5,301');
    await clickBtn(page, 'Replace rows');
    await page.$eval(Q('opt-nocase'), n => { n.checked = true; n.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.waitForTimeout(200);
    await chip(page, 'format', 'Apache .htaccess');
    const ap = await get(page, 'out');
    await chip(page, 'format', 'nginx');
    const ng = await get(page, 'out');
    return all([
      [/Chain of 2 redirects: \/a → \/b → \/c\. Send \/a straight to \/c\./.test(w), 'chain ' + w],
      [/Loop: \/x → \/y → \/x/.test(w), 'loop'], [/Loop: \/shop\/\* → \/shop\/new\/\*/.test(w), 'wild loop'],
      [ap.includes('RewriteCond %{QUERY_STRING} ^id=5$ [NC]\nRewriteRule ^product\\.php/?$ /products/5 [R=301,L,NC,QSD]'), ap],
      [ng.includes('location ~* "^/product\\.php/?$" {\n    if ($args = "id=5") { return 301 /products/5; }\n}'), ng]
    ]);
  } }
];
