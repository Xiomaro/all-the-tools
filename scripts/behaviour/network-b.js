/* Behaviour checks for the network-b tools and url-builder (which absorbed the
   URL Parser). Expected values are worked out by hand from each fixture or
   come from outside references: RFC 3492/IANA IDN test domains (also checked
   against Node's url.domainToASCII), the IEEE OUI registry via the oui-data
   package, RSA keys generated here with Node's crypto, and CIDR arithmetic. */
'use strict';

const crypto = require('crypto');
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
  await page.waitForTimeout(300);
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
async function rows(page, k) { return page.$$eval(Q(k) + ' tbody tr', trs => trs.map(tr => [...tr.children].map(td => td.textContent))); }
const flat = s => s.replace(/\s+/g, ' ').trim();
const res = (ok, detail) => ({ ok: !!ok, detail: String(detail).slice(0, 220) });
function all(list) {
  const bad = list.filter(x => !x[0]);
  return bad.length ? res(false, bad.map(x => x[1]).join(' | ')) : res(true, '');
}

module.exports = [
  /* ---------------- url-builder (merged URL Parser) ---------------- */
  { name: 'url-builder: parsing lists every component and decodes the query (from url-parser)', tool: 'url-builder', run: async page => {
    await page.fill(`${V} input[placeholder^="Paste a URL"]`, 'https://user:pass@example.com:8080/path/to/page?q=hello&lang=en&page=2&name=J%C3%B6rg+M#section');
    await page.waitForTimeout(200);
    const tiles = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#view [data-k="parts"] [data-key]')].map(n => [n.dataset.key, n.querySelector('code').textContent])));
    const params = await rows(page, 'params');
    const built = await page.$eval(`${V} [data-out=url]`, n => n.textContent);
    await page.fill(`${V} input[placeholder^="Paste a URL"]`, 'not a url at all ::');
    await page.waitForTimeout(200);
    const err = await page.evaluate(() => [...document.querySelectorAll('#view .note.err')].some(n => /not a valid URL/.test(n.textContent)));
    const want = { Protocol: 'https', Username: 'user', Password: 'pass', Host: 'example.com:8080', Hostname: 'example.com', Port: '8080', Origin: 'https://example.com:8080',
      Pathname: '/path/to/page', 'Query String': '?q=hello&lang=en&page=2&name=J%C3%B6rg%20M', Fragment: '#section' };
    return all([
      [Object.keys(want).every(k => tiles[k] === want[k]), JSON.stringify(tiles)],
      [JSON.stringify(params) === JSON.stringify([['1', 'q', 'hello', 'q=hello'], ['2', 'lang', 'en', 'lang=en'], ['3', 'page', '2', 'page=2'], ['4', 'name', 'Jörg M', 'name=J%C3%B6rg%20M']]), JSON.stringify(params)],
      [built === 'https://user:pass@example.com:8080/path/to/page?q=hello&lang=en&page=2&name=J%C3%B6rg%20M#section', built], [err, 'invalid URL message']
    ]);
  } },

  /* ---------------- email-header-analyzer ---------------- */
  { name: 'email-header-analyzer: hop table, delays, verdicts and DKIM details of the sample', tool: 'email-header-analyzer', run: async page => {
    const hops = await rows(page, 'hops');
    const total = await get(page, 'total');
    const verdict = flat(await get(page, 'summary'));
    const dkim = await rows(page, 'dkim');
    const spam = flat(await get(page, 'spam'));
    const w = (await items(page, 'warnings')).join(' | ');
    return all([
      [hops.length === 4 && JSON.stringify(hops.map(h => h[5])) === JSON.stringify(['—', '2 s', '1 min 5 s', '2 s']), JSON.stringify(hops.map(h => h[5]))],
      [hops[1][1] === 'app01.internal.shop.example [10.0.4.17]' && hops[1][2] === 'mail.shop.example' && hops[1][3] === 'ESMTP' && hops[1][4] === '22/09/2026 17:14:35 +0100', JSON.stringify(hops[1])],
      [hops[2][4] === '22/09/2026 09:15:40 −0700' && hops[2][3] === 'ESMTPS', JSON.stringify(hops[2])],
      [total === '3 hops; total delivery time 1 min 9 s.', total],
      [verdict === 'SPF pass DKIM pass DMARC pass ARC none', verdict],
      [dkim.length === 1 && dkim[0][0] === 'shop.example' && dkim[0][1] === 's2026' && dkim[0][2] === 'rsa-sha256', JSON.stringify(dkim)],
      [/Not spam: score -0\.8 of 5\.0 needed/.test(spam), spam],
      [/warn: Replies go to support@helpdesk\.example\.net/.test(w) && /Return-Path \(bounces@mailer\.shop\.example\)/.test(w) === false, w]
    ]);
  } },
  { name: 'email-header-analyzer: DMARC failure, display-name spoofing, clock skew and Microsoft verdicts', tool: 'email-header-analyzer', run: async page => {
    await set(page, 'in', ['Received: from evil.example (unknown [203.0.113.9]) by mx.example.org with SMTP; Wed, 23 Sep 2026 10:00:00 +0000',
      'Authentication-Results: mx.example.org; spf=softfail smtp.mailfrom=bank.example; dkim=none; dmarc=fail (p=REJECT) header.from=bank.example',
      'From: "support@bank.example" <alerts@evil.example>', 'Reply-To: <collect@evil.example>', 'Subject: Verify your account', 'Date: Wed, 23 Sep 2026 10:00:05 +0000',
      'X-Forefront-Antispam-Report: CIP:203.0.113.9;CTRY:GB;LANG:en;SCL:5;SRV:;IPV:NLI;SFV:SPM;H:evil.example;PTR:;CAT:PHSH;SFTY:;SFS:(13230040);DIR:INB;',
      'X-Microsoft-Antispam: BCL:7;', '', 'Body text here'].join('\r\n'));
    const verdict = flat(await get(page, 'summary'));
    const w = (await items(page, 'warnings')).join(' | ');
    const spam = flat(await get(page, 'spam'));
    return all([
      [verdict === 'SPF softfail DKIM none DMARC fail ARC none', verdict],
      [/err: DMARC failed/.test(w) && /warn: SPF softfail/.test(w), 'auth warnings ' + w],
      [/err: The From display name shows support@bank\.example but the real address is alerts@evil\.example/.test(w), 'spoof'],
      [/Hop 1 is timestamped 5 s before the previous one/.test(w), 'skew'], [/no Message-ID/.test(w), 'message-id'],
      [/err: Microsoft flagged this message as phishing/.test(w), 'phish'], [!/Replies go to/.test(w), 'reply-to same domain'],
      [spam.includes('SCL 5 (spam); SFV SPM (spam); CAT PHSH (phishing); IPV NLI (IP not on any reputation list); DIR INB (inbound); connecting IP 203.0.113.9; country GB') &&
        spam.includes('Bulk complaint level 7 of 9'), spam]
    ]);
  } },

  /* ---------------- spf-dmarc-tool ---------------- */
  { name: 'spf-dmarc-tool: SPF terms, lookup count and syntax errors', tool: 'spf-dmarc-tool', run: async page => {
    const s1 = flat(await get(page, 'stats'));
    const ex = await rows(page, 'explain');
    await set(page, 'record', 'v=spf1 ip4:192.0.2.300 ptr +all include:a.test');
    const w = (await items(page, 'issues')).join(' | ');
    await set(page, 'record', 'v=spf1 ' + Array.from({ length: 11 }, (_, i) => 'include:s' + i + '.test').join(' ') + ' -all');
    const w2 = (await items(page, 'issues')).join(' | ');
    return all([
      [s1 === '5 Terms 3 / 10 DNS lookups (this record) 2 Includes', s1],
      [ex.length === 5 && ex[1][0] === 'include:_spf.google.com' && ex[1][3] === '1' && ex[3][3] === '0' && ex[4][2] === 'Everything else: softfail.', JSON.stringify(ex[4])],
      [/"ip4:192\.0\.2\.300" is not a valid IPv4 address/.test(w) && /ptr is slow/.test(w) && /err: \+all lets any server/.test(w) && /"include:a\.test" comes after "all"/.test(w), w],
      [/err: 11 DNS lookups before counting nested includes/.test(w2), w2]
    ]);
  } },
  { name: 'spf-dmarc-tool: DMARC tags explained and checked', tool: 'spf-dmarc-tool', run: async page => {
    await set(page, 'record', 'v=DMARC1; p=quarantine; pct=50; rua=mailto:d@example.com; adkim=s');
    const kind = await get(page, 'kind'), st = flat(await get(page, 'stats')), ex = await rows(page, 'explain'), w = (await items(page, 'issues')).join(' | ');
    await set(page, 'record', 'p=reject; v=DMARC1; rua=dmarc@example.com');
    const w2 = (await items(page, 'issues')).join(' | ');
    await set(page, 'record', 'v=DMARC1; p=none');
    const w3 = (await items(page, 'issues')).join(' | ');
    return all([[kind === 'DMARC record' && st === 'quarantine Policy quarantine Subdomains 50% Applies to', st],
      [ex.length === 5 && ex[4][2] === 'Strict: the domain must match exactly' && ex[3][2] === 'Aggregate reports to d@example.com', JSON.stringify(ex)],
      [/info: pct=50 applies the policy to only part/.test(w), w],
      [/v=DMARC1 must be the first tag/.test(w2) && /should be a mailto: address/.test(w2), w2],
      [/warn: Add rua=mailto/.test(w3) && /info: p=none only monitors/.test(w3), w3]]);
  } },
  { name: 'spf-dmarc-tool: DKIM key length read from generated RSA and Ed25519 keys', tool: 'spf-dmarc-tool', run: async page => {
    const spki = bits => crypto.generateKeyPairSync('rsa', { modulusLength: bits }).publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
    const pk1 = crypto.generateKeyPairSync('rsa', { modulusLength: 1024 }).publicKey.export({ type: 'pkcs1', format: 'der' }).toString('base64');
    const ed = crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64');
    await set(page, 'record', 'v=DKIM1; k=rsa; p=' + spki(2048).replace(/(.{80})/g, '$1 '));
    const a = flat(await get(page, 'stats')), wa = (await items(page, 'issues')).join(' | ');
    await set(page, 'record', 'v=DKIM1; k=rsa; p=' + pk1);
    const b = flat(await get(page, 'stats')), wb = (await items(page, 'issues')).join(' | ');
    await set(page, 'record', 'v=DKIM1; k=ed25519; p=' + ed);
    const c = flat(await get(page, 'stats'));
    await set(page, 'record', 'v=DKIM1; k=rsa; t=y; p=');
    const wd = (await items(page, 'issues')).join(' | ');
    return all([[a === 'RSA Key type 2048 bits Key length' && /ok: 2048-bit RSA key/.test(wa), a + ' ' + wa],
      [b === 'RSA Key type 1024 bits Key length' && /warn: 1024-bit RSA is weak/.test(wb) && /PKCS#1 form/.test(wb), b + ' ' + wb],
      [c === 'ED25519 Key type 256 bits Key length', c], [/p= is empty: this key has been revoked/.test(wd) && /t=y/.test(wd), wd]]);
  } },
  { name: 'spf-dmarc-tool: builders write records; Look up refuses a bad domain without a request', tool: 'spf-dmarc-tool', run: async page => {
    const spf1 = await get(page, 'built');
    await clickBtn(page, 'Microsoft 365');
    const spf2 = await get(page, 'built');
    await chip(page, 'builder', 'DMARC');
    const dm = await get(page, 'built');
    let requests = 0;
    page.on('request', r => { if (/cloudflare-dns/.test(r.url())) requests++; });
    await set(page, 'domain', 'not a domain');
    await clickBtn(page, 'Look up');
    const st = await get(page, 'lookup-status');
    return all([[spf1 === 'v=spf1 mx include:_spf.google.com ~all', spf1], [spf2 === 'v=spf1 mx include:_spf.google.com include:spf.protection.outlook.com ~all', spf2],
      [dm === 'v=DMARC1; p=none; rua=mailto:dmarc-reports@example.com', dm], [/Enter a domain name/.test(st) && requests === 0, st + ' ' + requests]]);
  } },

  /* ---------------- mac-lookup ---------------- */
  { name: 'mac-lookup: vendor, flags and formats for 00:1B:63:84:45:E6; bulk table', tool: 'mac-lookup', run: async page => {
    await page.waitForFunction(() => /prefixes/.test((document.querySelector('#view [data-k="source"]') || {}).textContent || ''), null, { timeout: 20000 });
    const vendor = await get(page, 'vendor');
    const tiles = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#view [data-k="result"] [data-key]')].map(n => [n.dataset.key, n.querySelector('code').textContent])));
    const src = await get(page, 'source');
    await set(page, 'bulk', ['00-00-0C-12-34-56 gateway', 'b827.eb00.0001', 'C8:5C:E2:1A:BC:DE', '00:1B:C5:00:01:23', 'da:a1:19:00:00:01', '01:00:5e:00:00:fb', '? (192.168.1.9) at 0:50:56:c0:0:8 on en0', 'nonsense'].join('\n'));
    const t = await rows(page, 'bulk-table');
    return all([
      [vendor === 'Apple, Inc.', vendor],
      [tiles['IPv6 link-local (EUI-64)'] === 'fe80::21b:63ff:fe84:45e6' && tiles['Cisco form'] === '001b.6384.45e6' && tiles['Unicast or multicast'] === 'Unicast (one device)' && tiles['Registry block'] === 'MA-L (24-bit)', JSON.stringify(tiles)],
      [/54,000 prefixes, as published on 22\/09\/2026/.test(src), src],
      [t[0][1] === 'Cisco Systems, Inc' && t[1][1] === 'Raspberry Pi Foundation' && t[2][1] === 'Annapurna labs' && t[3][1] === 'Converging Systems Inc.', JSON.stringify(t.slice(0, 4).map(r => r[1]))],
      [t[4][1] === '(locally administered)' && /ELI/.test(t[4][3]) && t[5][2] === 'multicast, global' && /IPv4 multicast/.test(t[5][3]), JSON.stringify(t.slice(4, 6))],
      [t[6][0] === '00:50:56:C0:00:08' && t[6][1] === 'VMware, Inc.' && t[7][2] === 'Not a MAC address', JSON.stringify(t.slice(6))]
    ]);
  } },

  /* ---------------- punycode-converter ---------------- */
  { name: 'punycode-converter: IDNA both ways, homograph warning, emails and bad Punycode', tool: 'punycode-converter', run: async page => {
    await page.waitForFunction(() => (document.querySelector('#view [data-k="out"]') || {}).textContent, null, { timeout: 10000 });
    const out = await get(page, 'out');
    const w = (await items(page, 'warnings')).join(' | ');
    await chip(page, 'mode', 'To Unicode');
    await set(page, 'in', 'xn--bcher-kva.example\nhttps://xn--mnchen-3ya.de/path?x=1\nxn--ab$c.com');
    const back = await get(page, 'out');
    const w2 = (await items(page, 'warnings')).join(' | ');
    return all([
      [out === 'xn--bcher-kva.example\nmünchen.de\nnoreply@xn--e1afmkfd.xn--80akhbyknj4f\nxn--pple-43d.com', JSON.stringify(out)],
      [/err: "\u0430pple" looks like the plain ASCII "apple"/.test(w) && /mixes (Latin and Cyrillic|Cyrillic and Latin) letters, the classic look-alike/.test(w), w],
      [back.split('\n')[0] === 'bücher.example' && back.split('\n')[1] === 'https://münchen.de/path?x=1', back],
      [/"xn--ab\$c" is not valid Punycode/.test(w2), w2]
    ]);
  } },

  /* ---------------- webrtc-leak-test ---------------- */
  { name: 'webrtc-leak-test: parses and classifies candidates from a stubbed RTCPeerConnection', tool: 'webrtc-leak-test', run: async page => {
    await page.evaluate(() => {
      window.RTCPeerConnection = class {
        constructor(cfg) { window.__rtcCfg = cfg; }
        createDataChannel() {}
        createOffer() { return Promise.resolve({ type: 'offer', sdp: '' }); }
        setLocalDescription() {
          setTimeout(() => {
            ['candidate:1 1 udp 2122260223 3f2a9c1e-1234-4bcd-9f00-abcdef012345.local 54321 typ host generation 0',
              'candidate:2 1 udp 1686052607 203.0.113.7 61000 typ srflx raddr 0.0.0.0 rport 0 generation 0',
              'candidate:3 1 udp 2122194687 192.168.1.20 54322 typ host generation 0'].forEach(c => this.onicecandidate({ candidate: { candidate: c } }));
            this.onicecandidate({ candidate: null });
          }, 30);
          return Promise.resolve();
        }
        close() {}
      };
    });
    await clickBtn(page, 'Start');
    await page.waitForFunction(() => /Finished/.test(document.querySelector('#view [data-k="status"]').textContent), null, { timeout: 10000 });
    const t = await rows(page, 'cand-table');
    const s = (await items(page, 'summary')).join(' | ');
    const cfg = await page.evaluate(() => JSON.stringify(window.__rtcCfg));
    return all([[t.length === 3 && t[0][4] === 'mDNS name (hides the local IP)' && t[1][0] === 'server-reflexive' && t[1][1] === '203.0.113.7' && t[2][4] === 'Private IPv4 (local network)', JSON.stringify(t)],
      [/The STUN server sees you as 203\.0\.113\.7/.test(s) && /visible to websites: 192\.168\.1\.20/.test(s), s], [cfg === '{"iceServers":[{"urls":["stun:stun.l.google.com:19302"]}]}', cfg]]);
  } },
  { name: 'webrtc-leak-test: real local-only gathering, bad STUN address and missing WebRTC', tool: 'webrtc-leak-test', run: async page => {
    await set(page, 'stun', 'http://example.com');
    await clickBtn(page, 'Start');
    const bad = await get(page, 'status');
    await set(page, 'stun', '');
    await clickBtn(page, 'Start');
    await page.waitForFunction(() => /Finished/.test(document.querySelector('#view [data-k="status"]').textContent), null, { timeout: 15000 });
    const s = (await items(page, 'summary')).join(' | ');
    await page.evaluate(() => { window.RTCPeerConnection = undefined; window.webkitRTCPeerConnection = undefined; });
    await clickBtn(page, 'Start');
    const none = await get(page, 'status');
    return all([[/STUN servers look like stun:host:port/.test(bad), bad], [/No STUN server was used/.test(s), s], [/has no WebRTC/.test(none), none]]);
  } },

  /* ---------------- cidr-calculator ---------------- */
  { name: 'cidr-calculator: merge IPv4 and IPv6 lists into the fewest CIDRs', tool: 'cidr-calculator', run: async page => {
    const out = await get(page, 'out'), st = flat(await get(page, 'stats'));
    return all([[out === '10.0.0.0/22\n192.168.1.10/31\n192.168.1.12/30\n192.168.1.16/28\n192.168.1.32/27\n192.168.1.64/27\n192.168.1.96/30\n192.168.1.100/32\n2001:db8::/32', JSON.stringify(out)],
      [st === '6 In 9 CIDRs out 1,115 IPv4 addresses 2^96 IPv6 addresses', st]]);
  } },
  { name: 'cidr-calculator: subtract, range → CIDRs, CIDR → range and membership', tool: 'cidr-calculator', run: async page => {
    await chip(page, 'mode', 'Subtract');
    await set(page, 'in', '10.0.0.0/24\n2001:db8::/32'); await set(page, 'in2', '10.0.0.64/26\n2001:db8::/33');
    const sub = await get(page, 'out');
    await chip(page, 'mode', 'Range → CIDRs');
    await set(page, 'in', '2001:db8::1 - 2001:db8::4');
    const rng = await get(page, 'out');
    await chip(page, 'mode', 'CIDR → range');
    await set(page, 'in', '10.0.0.0/22\n10.0.0.1/24');
    const info = await rows(page, 'info-table'), notes = (await items(page, 'issues')).join(' | ');
    await chip(page, 'mode', 'Is it in the list?');
    await set(page, 'in', '10.0.0.0/8, 192.168.0.0/16');
    await set(page, 'in2', '10.1.2.3\n172.16.0.1\n192.168.1.0/24\n192.167.255.0 - 192.168.0.10');
    const has = (await rows(page, 'contains-table')).map(r => r[1]);
    return all([[sub === '10.0.0.0/26\n10.0.0.128/25\n2001:db8:8000::/33', JSON.stringify(sub)], [rng === '2001:db8::1/128\n2001:db8::2/127\n2001:db8::4/128', JSON.stringify(rng)],
      [JSON.stringify(info[0]) === JSON.stringify(['10.0.0.0/22', '10.0.0.0', '10.0.3.255', '1,024', '255.255.252.0', '1,022']) && info[1][0] === '10.0.0.0/24', JSON.stringify(info)],
      [/"10\.0\.0\.1\/24" has host bits set; read as 10\.0\.0\.0\/24/.test(notes), notes],
      [JSON.stringify(has) === JSON.stringify(['Yes', 'No', 'Yes', 'Partly']), JSON.stringify(has)]]);
  } }
];
