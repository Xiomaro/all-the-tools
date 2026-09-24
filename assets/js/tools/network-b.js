/* network-b tools: email header analyser, SPF/DKIM/DMARC record checker, MAC
   vendor lookup, Punycode converter, WebRTC leak test and CIDR aggregator.
   Everything runs in the tab; only the record checker's Look up button and
   the WebRTC test's STUN request touch the network, and only when pressed. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  var STYLE = [
    '.g-netb .nb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px 14px}',
    '.g-netb .nb-issues{margin:0;padding-left:18px;font-size:13px;display:grid;gap:4px}',
    '.g-netb .nb-issues .err{color:var(--err)}',
    '.g-netb .nb-issues .warn{color:var(--warn)}',
    '.g-netb .nb-issues .ok{color:var(--ok)}',
    '.g-netb .nb-issues .info{color:var(--fg-muted)}',
    '.g-netb .nb-pills{display:flex;flex-wrap:wrap;gap:8px}',
    '.g-netb .nb-pill{border:1px solid var(--border);border-radius:999px;padding:4px 12px;font-size:13px;background:var(--bg-sunken)}',
    '.g-netb .nb-pill.ok b{color:var(--ok)} .g-netb .nb-pill.err b{color:var(--err)} .g-netb .nb-pill.warn b{color:var(--warn)} .g-netb .nb-pill.info b{color:var(--fg-muted)}',
    '.g-netb .nb-kv{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}',
    '.g-netb .nb-kv>div{border:1px solid var(--border);border-radius:var(--radius-s);padding:8px 10px;background:var(--bg-sunken);min-width:0}',
    '.g-netb .nb-kv b{display:block;font-size:12px;color:var(--fg-muted);font-weight:600;margin-bottom:2px}',
    '.g-netb .nb-kv code{font-family:var(--mono);word-break:break-all;font-size:13px}',
    '.g-netb .nb-big{font-size:22px;font-weight:700;word-break:break-word}',
    '.g-netb table.data td{vertical-align:top}',
    '.g-netb td.wrap,.g-netb td.mono{word-break:break-word}',
    '.g-netb .nb-tree{font-family:var(--mono);font-size:13px;white-space:pre-wrap;margin:0}',
    '.g-netb details>summary{cursor:pointer;font-weight:600;color:var(--fg-muted);font-size:13px}'
  ].join('\n');

  function reg(def) {
    var render = def.render;
    def.category = 'network';
    def.render = function (root) {
      if (!document.getElementById('g-netb-style')) document.head.appendChild(el('style', { id: 'g-netb-style', text: STYLE }));
      root.classList.add('g-netb');
      render(root);
    };
    Tools.register(def);
  }

  function area(k, value, rows, placeholder) {
    return el('textarea', { rows: rows || 6, value: value || '', placeholder: placeholder || '', spellcheck: false, dataset: k ? { k: k } : undefined });
  }
  function txt(k, value, placeholder) { return el('input', { type: 'text', value: value || '', placeholder: placeholder || '', spellcheck: false, dataset: k ? { k: k } : undefined }); }
  function issueList(node, items, emptyText) {
    node.replaceChildren.apply(node, (items.length ? items : [['ok', emptyText || 'No problems found.']]).map(function (i) { return el('li', { class: i[0], text: i[1] }); }));
    return node;
  }
  function issuesNode(k) { return el('ul', { class: 'nb-issues', dataset: k ? { k: k } : undefined }); }
  function kv(pairs, k) {
    return el('div', { class: 'nb-kv', dataset: k ? { k: k } : undefined }, pairs.map(function (p) {
      return el('div', { dataset: { key: p[0] } }, el('b', { text: p[0] }), el('code', { text: p[1] === undefined || p[1] === null || p[1] === '' ? '—' : String(p[1]) }));
    }));
  }
  function table(k, headers, rows) {
    var t = U.table(headers, rows);
    return el('div', { class: 'scroll', dataset: k ? { k: k } : undefined }, t);
  }
  function plural(n, w, many) { return n + ' ' + (n === 1 ? w : (many || w + 's')); }
  function pad2(n) { return String(n).padStart(2, '0'); }

  /* ======================================================================
     Email Header Analyser
     ====================================================================== */

  var EH_ZONES = { UT: 0, UTC: 0, GMT: 0, Z: 0, EST: -300, EDT: -240, CST: -360, CDT: -300, MST: -420, MDT: -360, PST: -480, PDT: -420, BST: 60, CET: 60, CEST: 120 };
  var EH_MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

  /* RFC 5322 date → { ms, off (minutes east of UTC) }. */
  function mailDate(s) {
    var t = String(s || '').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
    var m = /(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*([+-]\d{4}|[A-Za-z]{1,5})?/.exec(t);
    if (!m || EH_MON[m[2].toLowerCase()] === undefined) {
      var p = Date.parse(t);
      return isNaN(p) ? null : { ms: p, off: 0 };
    }
    var y = +m[3];
    if (m[3].length === 2) y += y < 50 ? 2000 : 1900;
    var off = 0, z = m[7] || '+0000';
    if (/^[+-]\d{4}$/.test(z)) off = (z.charAt(0) === '-' ? -1 : 1) * (+z.slice(1, 3) * 60 + +z.slice(3));
    else off = EH_ZONES[z.toUpperCase()] || 0;
    return { ms: Date.UTC(y, EH_MON[m[2].toLowerCase()], +m[1], +m[4], +m[5], +(m[6] || 0)) - off * 60000, off: off };
  }
  function showDate(d) {
    if (!d) return '—';
    var x = new Date(d.ms + d.off * 60000), a = Math.abs(d.off);
    return pad2(x.getUTCDate()) + '/' + pad2(x.getUTCMonth() + 1) + '/' + x.getUTCFullYear() + ' ' + pad2(x.getUTCHours()) + ':' + pad2(x.getUTCMinutes()) + ':' + pad2(x.getUTCSeconds()) +
      ' ' + (d.off < 0 ? '−' : '+') + pad2(Math.floor(a / 60)) + pad2(a % 60);
  }
  function span(sec) {
    if (sec === null || sec === undefined || isNaN(sec)) return '—';
    var neg = sec < 0, s = Math.abs(Math.round(sec)), out;
    if (s < 60) out = s + ' s';
    else if (s < 3600) out = Math.floor(s / 60) + ' min ' + (s % 60) + ' s';
    else if (s < 86400) out = Math.floor(s / 3600) + ' h ' + Math.floor(s % 3600 / 60) + ' min';
    else out = Math.floor(s / 86400) + ' d ' + Math.floor(s % 86400 / 3600) + ' h';
    return (neg ? '−' : '') + out;
  }

  /* Unfolds continuation lines and splits the header block into fields. */
  function parseHeaders(raw) {
    var list = [], cur = null;
    var rows = String(raw || '').replace(/\r\n?/g, '\n').replace(/^\s*\n/, '').split('\n');
    for (var i = 0; i < rows.length; i++) {
      var line = rows[i];
      if (/^[ \t]/.test(line) && cur) { cur.value += ' ' + line.trim(); continue; }
      if (!line.trim()) { if (list.length) break; continue; }
      var m = /^([!-9;-~]+):[ \t]?(.*)$/.exec(line);
      if (m) { cur = { name: m[1], lower: m[1].toLowerCase(), value: m[2].trim() }; list.push(cur); }
    }
    return list;
  }
  function addrOf(v) {
    var m = /<([^<>]*)>/.exec(v || '');
    var a = (m ? m[1] : String(v || '').replace(/\([^)]*\)/g, '')).trim();
    var e = /[^\s<>"',;]+@[^\s<>"',;]+/.exec(a);
    return e ? e[0].toLowerCase() : a.toLowerCase();
  }
  function domainOf(a) { var i = String(a).lastIndexOf('@'); return i > -1 ? a.slice(i + 1).replace(/[>\s]+$/, '').toLowerCase() : ''; }
  /* Rough organisational domain: the last two labels, or three under
     second-level registries such as co.uk. */
  function orgDomain(d) {
    var p = String(d || '').toLowerCase().split('.').filter(Boolean);
    if (p.length <= 2) return p.join('.');
    var two = p.slice(-2).join('.');
    return /^(co|com|org|net|gov|ac|edu|ltd|plc|me|sch|nhs|police|mod|or|ne|go)\.[a-z]{2}$/.test(two) ? p.slice(-3).join('.') : two;
  }
  /* Splits "a; b (c; d); e" at top-level semicolons. */
  function splitSemis(s) {
    var out = [], depth = 0, cur = '', q = false;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c === '"') q = !q;
      if (!q && c === '(') depth++;
      if (!q && c === ')') depth = Math.max(0, depth - 1);
      if (!q && !depth && c === ';') { out.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function parseAuthResults(value, source) {
    var parts = splitSemis(value), res = [];
    parts.forEach(function (p, i) {
      var m = /^([a-z0-9_.-]+)\s*=\s*([a-z0-9_-]+)\s*(.*)$/i.exec(p);
      if (!m) return;
      if (i === 0 && /^i$/i.test(m[1])) return;
      res.push({ source: source, method: m[1].toLowerCase(), result: m[2].toLowerCase(), detail: m[3].replace(/\s+/g, ' ').trim() });
    });
    return res;
  }
  function tags(value) {
    var o = {};
    String(value || '').split(';').forEach(function (p) {
      var i = p.indexOf('=');
      if (i > 0) o[p.slice(0, i).trim().toLowerCase()] = p.slice(i + 1).trim();
    });
    return o;
  }
  var FOREFRONT = {
    SFV: { NSPM: 'not spam', SPM: 'spam', SKS: 'marked spam before filtering (mail flow rule)', SKN: 'marked not spam before filtering', SKA: 'sender on an allow list', SKB: 'sender on a block list', SFE: 'on the user\'s safe senders list', BLK: 'on the user\'s blocked senders list', SKQ: 'released from quarantine', SKI: 'intra-organisation mail', SKT: 'matched a mail flow rule' },
    CAT: { NONE: 'no verdict', SPM: 'spam', HSPM: 'high-confidence spam', PHSH: 'phishing', HPHSH: 'high-confidence phishing', BULK: 'bulk mail', MALW: 'malware', SPOOF: 'spoofing', DIMP: 'domain impersonation', UIMP: 'user impersonation', GIMP: 'mailbox intelligence impersonation', AMP: 'anti-malware', SAP: 'safe attachments', OSPM: 'outbound spam', INTOS: 'intra-organisation phishing' },
    IPV: { CAL: 'IP address on the connection allow list', NLI: 'IP not on any reputation list' },
    DIR: { INB: 'inbound', OUT: 'outbound', INT: 'internal' }
  };
  function sclMeaning(n) {
    n = +n;
    return n === -1 ? 'bypassed spam filtering' : n <= 1 ? 'not spam' : n <= 4 ? 'not spam (4 and below are delivered to the inbox)' : n <= 6 ? 'spam' : 'high-confidence spam';
  }

  var EH_SAMPLE = [
    'Delivered-To: jo.bloggs@example.org',
    'Received: by 2002:a05:6a10:1234:b0:5ab:cdef:1234 with SMTP id x12csp123456;',
    '        Tue, 22 Sep 2026 09:15:42 -0700 (PDT)',
    'Received: from mail.shop.example (mail.shop.example. [192.0.2.25])',
    '        by mx.example.org with ESMTPS id a1b2c3d4e5.12.2026.09.22.09.15.40',
    '        for <jo.bloggs@example.org>',
    '        (version=TLS1_3 cipher=TLS_AES_256_GCM_SHA384 bits=256/256);',
    '        Tue, 22 Sep 2026 09:15:40 -0700 (PDT)',
    'Received: from app01.internal.shop.example (app01.internal.shop.example [10.0.4.17])',
    '        by mail.shop.example (Postfix) with ESMTP id 4F2B81C0042',
    '        for <jo.bloggs@example.org>; Tue, 22 Sep 2026 17:14:35 +0100 (BST)',
    'Authentication-Results: mx.example.org;',
    '       dkim=pass header.i=@shop.example header.s=s2026 header.b=Hq3LfL0v;',
    '       spf=pass (mx.example.org: domain of bounces@mailer.shop.example designates 192.0.2.25 as permitted sender) smtp.mailfrom=bounces@mailer.shop.example;',
    '       dmarc=pass (p=QUARANTINE sp=QUARANTINE dis=NONE) header.from=shop.example',
    'Return-Path: <bounces@mailer.shop.example>',
    'DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d=shop.example; s=s2026;',
    '        t=1790093675; h=from:to:subject:date:message-id:mime-version;',
    '        bh=47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=; b=Hq3LfL0vRz1s0mGq',
    'From: "Shop Example" <orders@shop.example>',
    'Reply-To: support@helpdesk.example.net',
    'To: jo.bloggs@example.org',
    'Subject: Your order has shipped',
    'Date: Tue, 22 Sep 2026 17:14:33 +0100',
    'Message-ID: <20260922161433.4F2B81C0042@mail.shop.example>',
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'X-Spam-Status: No, score=-0.8 required=5.0 tests=DKIM_SIGNED,DKIM_VALID,SPF_PASS autolearn=ham'
  ].join('\n');

  reg({
    id: 'email-header-analyzer', name: 'Email Header Analyser',
    description: 'Paste raw email headers to trace the delivery path hop by hop with delays, read SPF, DKIM, DMARC and ARC results, and spot mismatched sender addresses and spam scores.',
    keywords: ['email headers', 'email header analyzer', 'email header analyser', 'message headers', 'received', 'trace email', 'spf', 'dkim', 'dmarc', 'arc',
      'authentication-results', 'phishing', 'spoofing', 'spam score', 'x-spam-status', 'scl', 'return-path', 'reply-to', 'message-id', 'delay', 'analyze', 'analyse'],
    render: function (root) {
      var input = area('in', EH_SAMPLE, 12, 'Paste the full headers (Gmail: ⋮ › Show original; Outlook: File › Properties › Internet headers)');
      var summary = el('div', { class: 'nb-pills', dataset: { k: 'summary' } });
      var basics = el('div', { dataset: { k: 'basics' } });
      var hops = el('div', { dataset: { k: 'hops' } });
      var total = el('p', { class: 'note', dataset: { k: 'total' } });
      var auth = el('div', { dataset: { k: 'auth' } });
      var dkim = el('div', { dataset: { k: 'dkim' } });
      var warns = issuesNode('warnings');
      var spam = el('div', { dataset: { k: 'spam' } });
      var all = el('div', { dataset: { k: 'all' } });

      function run() {
        var H = parseHeaders(input.value);
        function get(n) { var h = H.filter(function (x) { return x.lower === n; }); return h.length ? h[0].value : ''; }
        function every(n) { return H.filter(function (x) { return x.lower === n; }).map(function (x) { return x.value; }); }
        var W = [];
        if (!H.length) {
          summary.replaceChildren(); basics.replaceChildren(); hops.replaceChildren(); auth.replaceChildren(); dkim.replaceChildren(); spam.replaceChildren(); all.replaceChildren();
          total.textContent = '';
          issueList(warns, [['info', 'Paste some headers to analyse.']]);
          return;
        }

        /* delivery path: Received headers are newest first */
        var dateH = get('date') ? mailDate(get('date')) : null;
        var rec = every('received').map(function (v) {
          var semi = v.lastIndexOf(';');
          var body = semi > -1 ? v.slice(0, semi) : v, when = semi > -1 ? mailDate(v.slice(semi + 1)) : null;
          var from = /\bfrom\s+(\S+)(?:\s+\(([^)]*)\))?/i.exec(body), by = /\bby\s+(\S+)/i.exec(body), wth = /\bwith\s+([A-Za-z0-9-]+)/i.exec(body);
          var ip = /\[(?:IPv6:)?([0-9a-fA-F:.]+)\]/.exec(from ? from[0] : body);
          return { from: from ? from[1].replace(/\.$/, '') : '', ip: ip ? ip[1] : '', by: by ? by[1].replace(/[;.]$/, '') : '', with: wth ? wth[1] : '', when: when };
        }).reverse();
        var rows = [], prev = dateH, firstT = dateH, lastT = null;
        if (dateH) rows.push(['0', 'Sender (Date header)', '', '', showDate(dateH), '—']);
        rec.forEach(function (r, i) {
          var d = r.when && prev ? (r.when.ms - prev.ms) / 1000 : null;
          if (d !== null && d < 0) W.push(['warn', 'Hop ' + (i + 1) + ' is timestamped ' + span(-d) + ' before the previous one: a server clock is wrong, or the header was forged.']);
          rows.push([String(i + 1), (r.from || '—') + (r.ip ? ' [' + r.ip + ']' : ''), r.by || '—', r.with || '—', showDate(r.when), span(d)]);
          if (r.when) { prev = r.when; lastT = r.when; if (!firstT) firstT = r.when; }
        });
        hops.replaceChildren(rows.length ? table('hop-table', ['Hop', 'From', 'By', 'With', 'Time', 'Delay'], rows) : U.note('No Received headers.'));
        var tot = firstT && lastT ? (lastT.ms - firstT.ms) / 1000 : null;
        total.textContent = rec.length ? plural(rec.length, 'hop') + (tot !== null ? '; total delivery time ' + span(tot) + '.' : '.') : '';
        if (tot !== null && tot > 3600) W.push(['warn', 'Delivery took ' + span(tot) + ': the message sat in a queue somewhere (look for the biggest delay).']);

        /* authentication */
        var results = [];
        every('authentication-results').forEach(function (v, i) { results = results.concat(parseAuthResults(v, 'Authentication-Results' + (i ? ' #' + (i + 1) : ''))); });
        every('arc-authentication-results').forEach(function (v) { var i = (/\bi=(\d+)/.exec(v) || [])[1]; results = results.concat(parseAuthResults(v.replace(/^\s*i=\d+\s*;/, ''), 'ARC-Authentication-Results i=' + (i || '?'))); });
        every('received-spf').forEach(function (v) {
          var m = /^\s*([a-z]+)\s*(.*)$/i.exec(v);
          if (m) results.push({ source: 'Received-SPF', method: 'spf', result: m[1].toLowerCase(), detail: m[2] });
        });
        auth.replaceChildren(results.length ? table('auth-table', ['Check', 'Result', 'Details', 'Header'], results.map(function (r) {
          return [r.method.toUpperCase(), el('b', { style: { color: /^pass$/.test(r.result) ? 'var(--ok)' : /^(fail|permerror|softfail)$/.test(r.result) ? 'var(--err)' : 'var(--warn)' }, text: r.result }), r.detail, r.source];
        })) : U.note('No Authentication-Results, ARC or Received-SPF headers.'));
        var verdict = {};
        ['spf', 'dkim', 'dmarc', 'arc'].forEach(function (m) {
          var hit = results.filter(function (r) { return r.method === m && r.source.indexOf('ARC-') !== 0; })[0] || results.filter(function (r) { return r.method === m; })[0];
          verdict[m] = hit ? hit.result : 'none';
        });
        summary.replaceChildren.apply(summary, ['spf', 'dkim', 'dmarc', 'arc'].map(function (m) {
          var v = verdict[m], cls = v === 'pass' ? 'ok' : /fail|permerror/.test(v) ? 'err' : v === 'none' ? 'info' : 'warn';
          return el('span', { class: 'nb-pill ' + cls, dataset: { k: 'verdict-' + m } }, m.toUpperCase() + ' ', el('b', { text: v }));
        }));
        if (verdict.dmarc === 'fail') W.push(['err', 'DMARC failed: the From domain did not pass aligned SPF or DKIM. Treat the sender as unverified.']);
        if (verdict.spf === 'fail' || verdict.spf === 'softfail') W.push(['warn', 'SPF ' + verdict.spf + ': the sending server is not listed in the envelope domain\'s SPF record.']);
        if (verdict.dkim === 'fail') W.push(['warn', 'DKIM failed: the message was changed in transit or the signature is forged.']);

        /* DKIM signatures */
        var sigs = every('dkim-signature').map(function (v) { return tags(v); });
        dkim.replaceChildren(sigs.length ? table('dkim-table', ['Domain (d=)', 'Selector (s=)', 'Algorithm (a=)', 'Canonicalisation', 'Signed', 'Signed headers'], sigs.map(function (t) {
          var ts = /^\d+$/.test(t.t || '') ? new Date(+t.t * 1000) : null;
          return [t.d || '—', t.s || '—', t.a || '—', t.c || 'simple/simple', ts ? showDate({ ms: ts.getTime(), off: 0 }) : '—', (t.h || '').replace(/\s+/g, '').split(':').join(', ')];
        })) : U.note('No DKIM-Signature header.'));
        sigs.forEach(function (t) {
          if (t.l) W.push(['warn', 'A DKIM signature for ' + t.d + ' uses l= (only the first ' + t.l + ' bytes of the body are signed), so text can be appended without breaking it.']);
          if (/sha1/i.test(t.a || '')) W.push(['warn', 'The DKIM signature for ' + t.d + ' uses SHA-1, which RFC 8301 says verifiers must no longer accept.']);
          if (t.x && /^\d+$/.test(t.x) && +t.x * 1000 < Date.now()) W.push(['info', 'The DKIM signature for ' + t.d + ' has expired (x=), which is normal for old messages.']);
        });

        /* sender addresses */
        var from = addrOf(get('from')), fromDom = domainOf(from), rp = addrOf(get('return-path')), reply = addrOf(get('reply-to')), sender = addrOf(get('sender'));
        var mid = get('message-id'), midDom = (/@([^>\s]+)/.exec(mid) || [])[1] || '';
        if (rp && fromDom && orgDomain(domainOf(rp)) !== orgDomain(fromDom)) W.push(['info', 'Return-Path (' + rp + ') is on a different domain from From (' + fromDom + '). Normal for mailing services, but SPF then vouches for ' + domainOf(rp) + ', not the From domain.']);
        if (reply && fromDom && orgDomain(domainOf(reply)) !== orgDomain(fromDom)) W.push(['warn', 'Replies go to ' + reply + ', a different domain from the sender (' + fromDom + '). Common for help desks, and a classic phishing trick.']);
        var disp = /^\s*"?([^"<]*)"?\s*</.exec(get('from'));
        if (disp && /@/.test(disp[1]) && addrOf(disp[1]) !== from) W.push(['err', 'The From display name shows ' + addrOf(disp[1]) + ' but the real address is ' + from + ': a spoofing trick.']);
        if (midDom && fromDom && orgDomain(midDom.toLowerCase()) !== orgDomain(fromDom)) W.push(['info', 'The Message-ID was created on ' + midDom + ', not the From domain; normal when a service sends on the sender\'s behalf.']);
        if (!get('message-id')) W.push(['warn', 'There is no Message-ID, which legitimate mail servers always add.']);
        basics.replaceChildren(kv([['From', get('from')], ['Return-Path', get('return-path')], ['Reply-To', get('reply-to')], ['Sender', sender ? get('sender') : ''],
          ['To', get('to')], ['Subject', get('subject')], ['Date', dateH ? showDate(dateH) : get('date')], ['Message-ID', mid],
          ['Mailer', get('x-mailer') || get('user-agent')], ['Originating IP', get('x-originating-ip')]].filter(function (p) { return p[1]; })));

        /* spam filter headers */
        var S = [];
        H.forEach(function (h) {
          var v = h.value, m;
          if (h.lower === 'x-spam-status' && (m = /^(yes|no)\b.*?score=(-?[\d.]+)(?:.*?required=(-?[\d.]+))?(?:.*?tests=([^\s]+))?/i.exec(v))) {
            S.push([h.name, (m[1].toLowerCase() === 'yes' ? 'Marked as spam' : 'Not spam') + ': score ' + m[2] + (m[3] ? ' of ' + m[3] + ' needed' : '') + (m[4] ? '. Rules: ' + m[4].split(',').join(', ') : '')]);
          } else if (h.lower === 'x-forefront-antispam-report') {
            var t = {};
            v.split(';').forEach(function (p) { var i = p.indexOf(':'); if (i > 0) t[p.slice(0, i).trim().toUpperCase()] = p.slice(i + 1).trim(); });
            var bits = [];
            if (t.SCL) bits.push('SCL ' + t.SCL + ' (' + sclMeaning(t.SCL) + ')');
            ['SFV', 'CAT', 'IPV', 'DIR'].forEach(function (k) { if (t[k]) bits.push(k + ' ' + t[k] + (FOREFRONT[k][t[k].toUpperCase()] ? ' (' + FOREFRONT[k][t[k].toUpperCase()] + ')' : '')); });
            if (t.CIP) bits.push('connecting IP ' + t.CIP);
            if (t.CTRY) bits.push('country ' + t.CTRY);
            S.push([h.name, bits.join('; ') || v]);
            if (t.CAT && /PHSH|SPOOF|IMP|MALW/i.test(t.CAT)) W.push(['err', 'Microsoft flagged this message as ' + (FOREFRONT.CAT[t.CAT.toUpperCase()] || t.CAT) + '.']);
          } else if (h.lower === 'x-ms-exchange-organization-scl') S.push([h.name, 'SCL ' + v + ' (' + sclMeaning(v) + ')']);
          else if (h.lower === 'x-microsoft-antispam' && (m = /BCL:(\d)/i.exec(v))) S.push([h.name, 'Bulk complaint level ' + m[1] + ' of 9 (higher means more likely to be unwanted bulk mail)']);
          else if (/^x-(spam-score|spam-level|spam-flag|spamd-result|rspamd-score|mimecast-spam-score|barracuda-spam-score|proofpoint-spam-details|spam-report|spam-checker-version|vr-spamscore|ham-report)$/.test(h.lower)) S.push([h.name, v]);
        });
        spam.replaceChildren(S.length ? table('spam-table', ['Header', 'Meaning'], S) : U.note('No spam-filter headers found.'));
        all.replaceChildren(el('details', {}, el('summary', { text: 'All ' + H.length + ' headers' }), table('all-table', ['Header', 'Value'], H.map(function (h) { return [h.name, h.value]; }))));
        issueList(warns, W, 'Nothing suspicious in these headers.');
      }

      U.live([input], run);
      root.appendChild(U.panel('Raw headers', input, U.note('Everything is analysed in this tab. Nothing is looked up, so IP addresses and domains are shown as the headers state them.')));
      root.appendChild(U.panel('Verdicts', summary, el('div', { style: { marginTop: '12px' } }, warns)));
      root.appendChild(U.panel('Message', basics));
      root.appendChild(U.panel('Delivery path (oldest first)', hops, total));
      root.appendChild(U.panel('Authentication', auth));
      root.appendChild(U.panel('DKIM signatures', dkim));
      root.appendChild(U.panel('Spam filter verdicts', spam));
      root.appendChild(U.panel('', all));
    }
  });

  /* ======================================================================
     SPF, DKIM & DMARC Record Checker
     ====================================================================== */

  var SPF_QUAL = { '+': 'pass', '-': 'fail', '~': 'softfail', '?': 'neutral' };
  var SPF_LOOKUP = { include: 1, a: 1, mx: 1, ptr: 1, exists: 1 };

  function v4ok(s) { return /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(s) && s.split('.').every(function (x) { return +x <= 255; }); }
  function v6ok(s) { try { window.NetKit.parseIPv6(s); return s.indexOf(':') > -1; } catch (e) { return false; } }

  /* SPF (RFC 7208): explains each term and counts DNS-querying terms. */
  function spfCheck(rec) {
    var terms = rec.trim().split(/\s+/), rows = [], L = [], lookups = 0, seenAll = false, mods = {}, includes = [];
    if (!/^v=spf1$/i.test(terms[0] || '')) L.push(['err', 'An SPF record must start with v=spf1.']);
    terms.slice(1).forEach(function (t) {
      var mod = /^([a-z][a-z0-9_.-]*)=(.*)$/i.exec(t);
      if (mod) {
        var name = mod[1].toLowerCase();
        mods[name] = (mods[name] || 0) + 1;
        if (mods[name] === 2 && (name === 'redirect' || name === 'exp')) L.push(['err', name + '= may appear only once.']);
        if (name === 'redirect') {
          lookups++; includes.push({ kind: 'redirect', domain: mod[2] });
          rows.push([t, 'Modifier', seenAll ? 'Ignored, because the record already has an "all".' : 'If nothing above matched, use the SPF record of ' + mod[2] + ' instead.', '1']);
        } else if (name === 'exp') rows.push([t, 'Modifier', 'On failure, explain using the text in the TXT record at ' + mod[2] + '.', '1']);
        else { rows.push([t, 'Modifier', 'Unknown modifier: receivers ignore it.', '0']); L.push(['warn', '"' + t + '" is not a standard modifier.']); }
        return;
      }
      var m = /^([+\-~?]?)([a-z0-9]+)(?::([^/]*))?(\/\d+)?(\/\/\d+)?$/i.exec(t);
      if (!m) { rows.push([t, '?', 'Not a valid SPF term.', '0']); L.push(['err', '"' + t + '" is not valid SPF syntax.']); return; }
      var q = m[1] || '+', mech = m[2].toLowerCase(), arg = m[3], c4 = m[4], c6 = m[5], verdict = SPF_QUAL[q];
      if (mech === 'ip6' && t.indexOf(':') > -1) { var raw = t.replace(/^[+\-~?]?ip6:/i, ''), sl = raw.indexOf('/'); arg = sl > -1 ? raw.slice(0, sl) : raw; c4 = sl > -1 ? raw.slice(sl) : ''; c6 = ''; }
      if (seenAll) L.push(['warn', '"' + t + '" comes after "all", so it is never reached.']);
      var text = '', cost = SPF_LOOKUP[mech] || 0;
      var target = arg || 'this domain';
      if (mech === 'all') { text = 'Everything else: ' + verdict + '.'; seenAll = true; if (q === '+') L.push(['err', '+all lets any server on the internet send as this domain.']); if (q === '?') L.push(['warn', '?all gives no protection: failures are treated as neutral.']); }
      else if (mech === 'include') { if (!arg) L.push(['err', 'include needs a domain.']); text = 'If ' + (arg || '?') + '\'s SPF record passes the sender: ' + verdict + '.'; includes.push({ kind: 'include', domain: arg }); }
      else if (mech === 'a') text = 'If the sender\'s IP is an A/AAAA address of ' + target + (c4 ? ' (within ' + c4 + ')' : '') + ': ' + verdict + '.';
      else if (mech === 'mx') text = 'If the sender\'s IP belongs to one of ' + target + '\'s MX servers' + (c4 ? ' (within ' + c4 + ')' : '') + ': ' + verdict + '. Each MX host is looked up too (up to 10).';
      else if (mech === 'ptr') { text = 'If the sender\'s reverse DNS ends in ' + target + ': ' + verdict + '.'; L.push(['warn', 'ptr is slow and unreliable; RFC 7208 says not to use it.']); }
      else if (mech === 'exists') text = 'If ' + (arg || '?') + ' has an A record: ' + verdict + '.';
      else if (mech === 'ip4') {
        if (!arg || !v4ok(arg)) L.push(['err', '"' + t + '" is not a valid IPv4 address.']);
        if (c4 && +c4.slice(1) > 32) L.push(['err', '"' + t + '": IPv4 prefixes go up to /32.']);
        text = 'If the sender is ' + (arg || '?') + (c4 || '') + ': ' + verdict + '.';
      } else if (mech === 'ip6') {
        if (!arg || !v6ok(arg)) L.push(['err', '"' + t + '" is not a valid IPv6 address.']);
        if (c4 && +c4.slice(1) > 128) L.push(['err', '"' + t + '": IPv6 prefixes go up to /128.']);
        text = 'If the sender is ' + (arg || '?') + (c4 || '') + ': ' + verdict + '.';
      } else { text = 'Unknown mechanism.'; L.push(['err', '"' + mech + '" is not an SPF mechanism.']); }
      if (arg && /%\{/.test(arg)) L.push(['info', '"' + t + '" uses SPF macros, which are expanded per message.']);
      lookups += cost;
      rows.push([t, mech === 'all' || mech.indexOf('ip') === 0 ? 'Mechanism' : 'Mechanism (DNS lookup)', text, String(cost)]);
    });
    if (!seenAll && !mods.redirect) L.push(['warn', 'No "all" at the end, so unmatched senders get "neutral". End with ~all or -all.']);
    if (seenAll && mods.redirect) L.push(['info', 'redirect= is ignored because the record has an "all".']);
    if (lookups > 10) L.push(['err', lookups + ' DNS lookups before counting nested includes: over the limit of 10, so SPF fails with permerror.']);
    else if (lookups >= 8) L.push(['warn', lookups + ' DNS lookups here, and includes add their own; the limit is 10.']);
    if (rec.length > 255) L.push(['info', 'The record is ' + rec.length + ' characters: publish it as several quoted strings of up to 255 characters each.']);
    return { rows: rows, issues: L, lookups: lookups, includes: includes };
  }

  var DMARC_TAGS = {
    v: 'Version: must be DMARC1 and come first.', p: 'Policy for the domain itself', sp: 'Policy for subdomains', np: 'Policy for subdomains that do not exist (DMARCbis)',
    pct: 'Share of failing mail the policy applies to', rua: 'Where to send daily aggregate reports', ruf: 'Where to send failure (forensic) reports',
    adkim: 'DKIM alignment', aspf: 'SPF alignment', fo: 'When to send failure reports', rf: 'Failure report format', ri: 'Aggregate report interval',
    t: 'Testing mode (DMARCbis)', psd: 'Public suffix domain flag (DMARCbis)'
  };
  var DMARC_P = { none: 'none: monitor only, deliver as normal', quarantine: 'quarantine: treat failing mail as suspicious (spam folder)', reject: 'reject: refuse failing mail' };

  function dmarcCheck(rec) {
    var parts = rec.split(';').map(function (s) { return s.trim(); }).filter(Boolean), rows = [], L = [], t = {};
    parts.forEach(function (p, i) {
      var eq = p.indexOf('=');
      if (eq < 0) { L.push(['err', '"' + p + '" is not a tag=value pair.']); return; }
      var k = p.slice(0, eq).trim().toLowerCase(), v = p.slice(eq + 1).trim(), mean = '';
      if (t[k] !== undefined) L.push(['err', 'The ' + k + ' tag appears twice.']);
      t[k] = v;
      if (k === 'v') { if (i !== 0) L.push(['err', 'v=DMARC1 must be the first tag.']); if (v !== 'DMARC1') L.push(['err', 'The version must be exactly DMARC1.']); mean = 'DMARC version 1'; }
      else if (k === 'p' || k === 'sp' || k === 'np') { if (!DMARC_P[v.toLowerCase()]) L.push(['err', k + '=' + v + ': use none, quarantine or reject.']); mean = DMARC_P[v.toLowerCase()] || 'invalid'; }
      else if (k === 'pct') { if (!/^\d+$/.test(v) || +v > 100) L.push(['err', 'pct must be a whole number from 0 to 100.']); mean = 'Apply the policy to ' + v + '% of failing mail (the rest gets the next milder treatment). DMARCbis drops pct in favour of t=.'; }
      else if (k === 'rua' || k === 'ruf') {
        var uris = v.split(',').map(function (s) { return s.trim(); });
        uris.forEach(function (u) { if (!/^mailto:[^@\s]+@[^@\s!]+(![0-9]+[kmgt]?)?$/i.test(u) && !/^https:\/\//i.test(u)) L.push(['err', k + ': "' + u + '" should be a mailto: address, e.g. mailto:dmarc@example.com.']); });
        mean = (k === 'rua' ? 'Aggregate reports to ' : 'Failure reports to ') + uris.map(function (u) { return u.replace(/^mailto:/i, ''); }).join(', ');
      }
      else if (k === 'adkim' || k === 'aspf') { if (!/^[rs]$/i.test(v)) L.push(['err', k + ' must be r (relaxed) or s (strict).']); mean = (v.toLowerCase() === 's' ? 'Strict: the domain must match exactly' : 'Relaxed: subdomains of the same organisational domain count'); }
      else if (k === 'fo') { if (!/^[01ds](:[01ds])*$/i.test(v)) L.push(['err', 'fo takes 0, 1, d or s, separated by colons.']); mean = v.split(':').map(function (x) { return { '0': 'report when all checks fail', '1': 'report when any check fails', d: 'report DKIM failures', s: 'report SPF failures' }[x.toLowerCase()] || x; }).join('; '); }
      else if (k === 'rf') mean = v === 'afrf' ? 'Authentication Failure Reporting Format' : 'Unknown format';
      else if (k === 'ri') { if (!/^\d+$/.test(v)) L.push(['err', 'ri must be a number of seconds.']); mean = 'Every ' + (/^\d+$/.test(v) ? (+v / 3600) + ' hours' : v) + ' (most receivers send daily regardless)'; }
      else if (k === 't') mean = v.toLowerCase() === 'y' ? 'Testing: receivers apply one step milder than p=' : 'Not in testing mode';
      else if (k === 'psd') mean = v;
      else { L.push(['warn', '"' + k + '" is not a DMARC tag; receivers ignore it.']); mean = 'Unknown tag'; }
      rows.push([k + '=' + v, DMARC_TAGS[k] || '?', mean]);
    });
    if (t.v === undefined) L.push(['err', 'The record must start with v=DMARC1.']);
    if (t.p === undefined) L.push(['err', 'p= is required (none, quarantine or reject).']);
    else if (parts[1] && !/^p\s*=/i.test(parts[1])) L.push(['info', 'Put p= straight after v=DMARC1; some receivers expect that order.']);
    if ((t.p || '').toLowerCase() === 'none') L.push(['info', 'p=none only monitors: spoofed mail is still delivered. Move to quarantine, then reject, once the reports look clean.']);
    if (t.pct !== undefined && +t.pct < 100) L.push(['info', 'pct=' + t.pct + ' applies the policy to only part of the failing mail.']);
    if (!t.rua) L.push(['warn', 'Add rua=mailto:… to receive aggregate reports; without them you cannot see who sends as your domain.']);
    if (t.ruf) L.push(['info', 'Few receivers send failure (ruf) reports, and they can contain personal data.']);
    return { rows: rows, issues: L, tags: t };
  }

  /* Minimal DER reader: enough to find an RSA modulus in SPKI or PKCS#1. */
  function der(b, pos) {
    var tag = b[pos], len = b[pos + 1], hdr = 2;
    if (len & 0x80) { var n = len & 0x7f; len = 0; for (var i = 0; i < n; i++) len = len * 256 + b[pos + 2 + i]; hdr = 2 + n; }
    if (pos + hdr + len > b.length) throw new Error('truncated key');
    return { tag: tag, start: pos + hdr, len: len, end: pos + hdr + len };
  }
  function intBits(b, node) {
    var s = node.start, e = node.end;
    while (s < e && b[s] === 0) s++;
    if (s >= e) return 0;
    return (e - s - 1) * 8 + b[s].toString(2).length;
  }
  function keyInfo(b64) {
    var bin = atob(b64), b = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    if (b.length === 32) return { type: 'ed25519', bits: 256 };
    var top = der(b, 0);
    if (top.tag !== 0x30) throw new Error('not a DER key');
    var first = der(b, top.start);
    if (first.tag === 0x02) return { type: 'rsa', bits: intBits(b, first), format: 'PKCS#1' };
    if (first.tag !== 0x30) throw new Error('unknown key structure');
    var oid = der(b, first.start), hex = Array.prototype.map.call(b.subarray(oid.start, oid.end), function (x) { return x.toString(16).padStart(2, '0'); }).join('');
    if (hex === '2b6570') return { type: 'ed25519', bits: 256, format: 'SPKI' };
    if (hex !== '2a864886f70d010101') throw new Error('not an RSA or Ed25519 key');
    var bits = der(b, first.end);
    var rsa = der(b, bits.start + 1);
    return { type: 'rsa', bits: intBits(b, der(b, rsa.start)), format: 'SPKI' };
  }

  function dkimCheck(rec) {
    var t = {}, rows = [], L = [], order = [];
    rec.split(';').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (p) {
      var eq = p.indexOf('=');
      if (eq < 0) { L.push(['err', '"' + p + '" is not a tag=value pair.']); return; }
      var k = p.slice(0, eq).trim().toLowerCase(), v = p.slice(eq + 1).replace(/\s+/g, '');
      order.push(k); t[k] = v;
    });
    if (t.v !== undefined && (order[0] !== 'v' || t.v !== 'DKIM1')) L.push(['err', 'v= must be DKIM1 and come first.']);
    var k = (t.k || 'rsa').toLowerCase();
    if (k !== 'rsa' && k !== 'ed25519') L.push(['err', 'k=' + k + ' is not a DKIM key type (rsa or ed25519).']);
    var key = null;
    if (t.p === undefined) L.push(['err', 'p= (the public key) is required.']);
    else if (t.p === '') L.push(['warn', 'p= is empty: this key has been revoked, so signatures with it fail.']);
    else {
      try { key = keyInfo(t.p); } catch (e) { L.push(['err', 'The p= value is not a valid base64 public key (' + e.message + ').']); }
      if (key && key.type !== k) L.push(['err', 'The key is ' + key.type + ' but k=' + k + '.']);
      if (key && key.type === 'rsa') {
        if (key.bits < 1024) L.push(['err', key.bits + '-bit RSA: receivers must reject keys under 1024 bits (RFC 8301).']);
        else if (key.bits < 2048) L.push(['warn', key.bits + '-bit RSA is weak; use a 2048-bit key.']);
        else L.push(['ok', key.bits + '-bit RSA key.']);
        if (key.format === 'PKCS#1') L.push(['warn', 'The key is in PKCS#1 form; DKIM expects a SubjectPublicKeyInfo (the "BEGIN PUBLIC KEY" kind).']);
      }
      if (key && key.type === 'ed25519') L.push(['ok', 'Ed25519 key (RFC 8463). Sign with RSA too: not every receiver checks Ed25519 yet.']);
    }
    if (/y/i.test(t.t || '')) L.push(['warn', 't=y: the domain is testing DKIM, so receivers treat failures as if unsigned.']);
    if (t.h && !/sha256/i.test(t.h)) L.push(['warn', 'h=' + t.h + ' does not allow SHA-256.']);
    var mean = {
      v: 'Version', k: 'Key type: ' + k, p: key ? (key.type === 'rsa' ? key.bits + '-bit RSA public key' : 'Ed25519 public key') : (t.p === '' ? 'Revoked (empty)' : 'Public key'),
      h: 'Hash algorithms allowed: ' + (t.h || '').split(':').join(', '), s: 'Service types: ' + t.s, t: 'Flags: ' + (t.t || '').split(':').map(function (f) { return f === 'y' ? 'testing' : f === 's' ? 'strict (i= must match d= exactly)' : f; }).join(', '), n: 'Notes'
    };
    order.forEach(function (x) { rows.push([x + '=' + (x === 'p' && t.p.length > 40 ? t.p.slice(0, 36) + '…' : t[x]), mean[x] || 'Unknown tag']); });
    return { rows: rows, issues: L, key: key };
  }

  /* TXT data from DNS JSON arrives as one or more quoted strings. */
  function txtJoin(data) {
    var parts = String(data).match(/"((?:[^"\\]|\\.)*)"/g);
    return parts ? parts.map(function (p) { return p.slice(1, -1).replace(/\\(.)/g, '$1'); }).join('') : String(data);
  }
  function dohTxt(name) {
    return window.NetKit.fetchTimeout('https://cloudflare-dns.com/dns-query?name=' + encodeURIComponent(name) + '&type=TXT', { headers: { accept: 'application/dns-json' } }, 10000)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        if (d.Status === 3) return [];
        if (d.Status) throw new Error('DNS status ' + d.Status);
        return (d.Answer || []).filter(function (a) { return a.type === 16; }).map(function (a) { return txtJoin(a.data); });
      });
  }

  var SPF_PRESETS = [['Google Workspace', '_spf.google.com'], ['Microsoft 365', 'spf.protection.outlook.com'], ['Mailchimp', 'servers.mcsv.net'],
    ['SendGrid', 'sendgrid.net'], ['Amazon SES', 'amazonses.com'], ['Mailgun', 'mailgun.org'], ['Zoho (EU)', 'zoho.eu'], ['Fastmail', 'spf.messagingengine.com']];

  reg({
    id: 'spf-dmarc-tool', name: 'SPF, DKIM & DMARC Record Checker',
    description: 'Paste or build an SPF, DMARC or DKIM record and get every part explained, validated and counted against SPF\'s 10-lookup limit, with the RSA key length read from DKIM keys.',
    keywords: ['spf', 'dkim', 'dmarc', 'spf checker', 'dmarc checker', 'dkim checker', 'spf generator', 'dmarc generator', 'email authentication', 'txt record',
      'dns', 'deliverability', 'spoofing', 'rua', 'dns lookups', '10 lookup limit', 'dkim key length', 'bimi', 'email security'],
    online: 'Cloudflare DNS-over-HTTPS, only when you press Look up',
    render: function (root) {
      var rec = area('record', 'v=spf1 mx include:_spf.google.com include:sendgrid.net ip4:192.0.2.0/24 ~all', 3, 'Paste a TXT record: v=spf1 …, v=DMARC1; … or v=DKIM1; …');
      var kind = el('div', { class: 'nb-big', dataset: { k: 'kind' } });
      var stats = el('div', { dataset: { k: 'stats' } });
      var explain = el('div', { dataset: { k: 'explain' } });
      var issues = issuesNode('issues');
      var nested = el('pre', { class: 'nb-tree', dataset: { k: 'nested' } });

      function detect(r) {
        if (/^\s*v=spf1\b/i.test(r)) return 'spf';
        if (/(^|;)\s*v=DMARC1\b/i.test(r)) return 'dmarc';
        if (/^\s*v=DKIM1\b/i.test(r) || /(^|;)\s*p=/.test(r) && /(^|;)\s*k=/.test(r)) return 'dkim';
        if (/(^|;)\s*p=[A-Za-z0-9+/]{40,}/.test(r)) return 'dkim';
        return '';
      }
      function run() {
        var r = rec.value.trim().replace(/^"|"$/g, '').replace(/"\s*"/g, ''), type = detect(r);
        nested.textContent = '';
        if (!r) { kind.textContent = ''; stats.replaceChildren(); explain.replaceChildren(); issueList(issues, [['info', 'Paste a record, look one up or build one below.']]); return; }
        if (!type) { kind.textContent = 'Unknown record'; stats.replaceChildren(); explain.replaceChildren(); issueList(issues, [['err', 'This does not look like an SPF (v=spf1), DMARC (v=DMARC1) or DKIM (v=DKIM1; k=…; p=…) record.']]); return; }
        var res;
        if (type === 'spf') {
          res = spfCheck(r);
          kind.textContent = 'SPF record';
          stats.replaceChildren(U.stats([{ label: 'Terms', value: String(res.rows.length) }, { label: 'DNS lookups (this record)', value: res.lookups + ' / 10' }, { label: 'Includes', value: String(res.includes.length) }]));
          explain.replaceChildren(table('explain-table', ['Term', 'Kind', 'Meaning', 'Lookups'], res.rows));
          res.issues.push(['info', 'Includes and redirects add their own lookups. Press Look up with a domain to count the whole tree.']);
        } else if (type === 'dmarc') {
          res = dmarcCheck(r);
          kind.textContent = 'DMARC record';
          stats.replaceChildren(U.stats([{ label: 'Policy', value: res.tags.p || '—' }, { label: 'Subdomains', value: res.tags.sp || res.tags.p || '—' }, { label: 'Applies to', value: (res.tags.pct || '100') + '%' }]));
          explain.replaceChildren(table('explain-table', ['Tag', 'What it is', 'Meaning'], res.rows));
        } else {
          res = dkimCheck(r);
          kind.textContent = 'DKIM record';
          stats.replaceChildren(U.stats([{ label: 'Key type', value: res.key ? res.key.type.toUpperCase() : '—' }, { label: 'Key length', value: res.key ? res.key.bits + ' bits' : '—' }]));
          explain.replaceChildren(table('explain-table', ['Tag', 'Meaning'], res.rows));
        }
        issueList(issues, res.issues);
      }

      /* --- look up (only on click) --------------------------------------------- */
      var domain = txt('domain', '', 'example.com');
      var ltype = U.select({ options: [{ value: 'spf', label: 'SPF' }, { value: 'dmarc', label: 'DMARC' }, { value: 'dkim', label: 'DKIM' }], value: 'spf' });
      ltype.dataset.k = 'ltype';
      var selector = txt('selector', '', 'selector, e.g. google or s1');
      var status = el('p', { class: 'note', dataset: { k: 'lookup-status' } });
      var btn = U.button('Look up', lookup, 'primary');
      function lookup() {
        var d = window.NetKit.cleanHost(domain.value);
        if (!d || !/^[a-z0-9.-]+\.[a-z0-9-]+$/i.test(d)) { status.className = 'note err'; status.textContent = 'Enter a domain name such as example.com.'; return; }
        var t = ltype.value, name = d;
        if (t === 'dmarc') name = '_dmarc.' + d;
        if (t === 'dkim') {
          var s = selector.value.trim();
          if (!s) { status.className = 'note err'; status.textContent = 'DKIM keys live under a selector: enter it (look for s= in a DKIM-Signature header).'; return; }
          name = s + '._domainkey.' + d;
        }
        btn.disabled = true;
        status.className = 'note'; status.textContent = 'Asking Cloudflare DNS for TXT records at ' + name + '…';
        dohTxt(name).then(function (list) {
          var re = t === 'spf' ? /^v=spf1\b/i : t === 'dmarc' ? /^v=DMARC1\b/i : /(^|;)\s*(v=DKIM1|p=)/i;
          var hits = list.filter(function (x) { return re.test(x.trim()); });
          if (!hits.length) { status.className = 'note err'; status.textContent = 'No ' + t.toUpperCase() + ' record at ' + name + (list.length ? ' (found ' + plural(list.length, 'other TXT record') + ').' : '.'); return null; }
          rec.value = hits[0];
          run();
          status.className = 'note ok';
          status.textContent = 'Found at ' + name + '.' + (hits.length > 1 ? ' Warning: ' + hits.length + ' ' + t.toUpperCase() + ' records; there must be only one, or checks fail with permerror.' : '');
          if (hits.length > 1) issues.appendChild(el('li', { class: 'err', text: name + ' has ' + hits.length + ' ' + t.toUpperCase() + ' records; receivers treat that as an error (permerror).' }));
          if (t === 'spf') return countTree(hits[0]);
          return null;
        }).catch(function (e) {
          status.className = 'note err';
          status.textContent = 'Lookup failed: ' + (e.name === 'AbortError' ? 'timed out' : e.message) + '.';
        }).then(function () { btn.disabled = false; });
      }
      /* Follows include: and redirect= to count every DNS lookup, as a receiver would. */
      function countTree(record) {
        var queries = 0, lines = [];
        function walk(r, depth) {
          var res = spfCheck(r), total = res.lookups;
          return res.includes.reduce(function (p, inc) {
            return p.then(function () {
              if (!inc.domain || /%\{/.test(inc.domain)) return;
              if (depth > 9 || queries >= 40) { lines.push('  '.repeat(depth + 1) + inc.kind + ':' + inc.domain + '  (not followed: too deep)'); return; }
              queries++;
              return dohTxt(inc.domain).then(function (list) {
                var sub = list.filter(function (x) { return /^v=spf1\b/i.test(x.trim()); })[0];
                var at = lines.length;
                lines.push('  '.repeat(depth + 1) + inc.kind + ':' + inc.domain + (sub ? '' : '  (no SPF record: permerror)'));
                if (!sub) return;
                return walk(sub, depth + 1).then(function (n) { lines[at] += '  (' + plural(n, 'lookup') + ' inside)'; total += n; });
              });
            });
          }, Promise.resolve()).then(function () { return total; });
        }
        status.textContent += ' Counting nested lookups…';
        return walk(record, 0).then(function (n) {
          nested.textContent = 'This record: ' + spfCheck(record).lookups + ' lookup(s)\n' + lines.join('\n') + '\nTotal: ' + n + ' of 10';
          status.textContent = status.textContent.replace(' Counting nested lookups…', '') + ' The whole tree needs ' + plural(n, 'DNS lookup') + '.';
          issues.appendChild(el('li', { class: n > 10 ? 'err' : n >= 9 ? 'warn' : 'ok', text: 'Including every nested include, SPF needs ' + n + ' of the 10 allowed DNS lookups' + (n > 10 ? ': receivers return permerror and SPF fails.' : '.') }));
        });
      }

      /* --- builders ------------------------------------------------------------- */
      var built = el('pre', { class: 'out', dataset: { k: 'built' } });
      var bSpf = {
        mx: U.checkbox('The domain\'s mail servers (mx)', { checked: true }), a: U.checkbox('The domain\'s web server address (a)'),
        ip4: txt('b-ip4', '', '192.0.2.10, 198.51.100.0/24'), ip6: txt('b-ip6', '', '2001:db8::/32'), inc: txt('b-inc', '_spf.google.com', 'include domains, comma-separated'),
        all: U.select({ options: [{ value: '~all', label: '~all: soft fail (safe while testing)' }, { value: '-all', label: '-all: fail (strict)' }, { value: '?all', label: '?all: neutral (no protection)' }], value: '~all' })
      };
      var presetBox = el('div', { class: 'chips' }, SPF_PRESETS.map(function (p) {
        return el('button', { type: 'button', class: 'chip', text: p[0], title: 'include:' + p[1], onclick: function () {
          var list = bSpf.inc.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          if (list.indexOf(p[1]) < 0) list.push(p[1]);
          bSpf.inc.value = list.join(', ');
          buildSpf();
        } });
      }));
      function buildSpf() {
        var t = ['v=spf1'];
        if (bSpf.mx.input.checked) t.push('mx');
        if (bSpf.a.input.checked) t.push('a');
        bSpf.ip4.value.split(/[,\s]+/).filter(Boolean).forEach(function (x) { t.push('ip4:' + x); });
        bSpf.ip6.value.split(/[,\s]+/).filter(Boolean).forEach(function (x) { t.push('ip6:' + x); });
        bSpf.inc.value.split(/[,\s]+/).filter(Boolean).forEach(function (x) { t.push('include:' + x.replace(/^include:/i, '')); });
        t.push(bSpf.all.value);
        built.textContent = t.join(' ');
      }
      var bDm = {
        p: U.select({ options: ['none', 'quarantine', 'reject'], value: 'none' }), sp: U.select({ options: [{ value: '', label: '(same as p)' }, 'none', 'quarantine', 'reject'], value: '' }),
        pct: el('input', { type: 'number', min: 0, max: 100, value: 100 }), rua: txt('b-rua', 'dmarc-reports@example.com', 'aggregate report address'), ruf: txt('b-ruf', '', 'failure report address (optional)'),
        adkim: U.select({ options: [{ value: 'r', label: 'relaxed' }, { value: 's', label: 'strict' }], value: 'r' }), aspf: U.select({ options: [{ value: 'r', label: 'relaxed' }, { value: 's', label: 'strict' }], value: 'r' })
      };
      function buildDmarc() {
        var t = ['v=DMARC1', 'p=' + bDm.p.value];
        if (bDm.sp.value) t.push('sp=' + bDm.sp.value);
        if (bDm.pct.value !== '' && +bDm.pct.value !== 100) t.push('pct=' + Math.max(0, Math.min(100, Math.round(+bDm.pct.value))));
        function uris(s) { return s.split(/[,\s]+/).filter(Boolean).map(function (x) { return /^mailto:/i.test(x) ? x : 'mailto:' + x; }).join(','); }
        if (bDm.rua.value.trim()) t.push('rua=' + uris(bDm.rua.value));
        if (bDm.ruf.value.trim()) t.push('ruf=' + uris(bDm.ruf.value), 'fo=1');
        if (bDm.adkim.value === 's') t.push('adkim=s');
        if (bDm.aspf.value === 's') t.push('aspf=s');
        built.textContent = t.join('; ');
      }
      var bDk = { pem: area('b-pem', '', 4, '-----BEGIN PUBLIC KEY-----\n…\n-----END PUBLIC KEY-----'), type: U.select({ options: ['rsa', 'ed25519'], value: 'rsa' }) };
      function buildDkim() {
        var b64 = bDk.pem.value.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
        built.textContent = 'v=DKIM1; k=' + bDk.type.value + '; p=' + b64;
      }
      var which = U.chips([{ value: 'spf', label: 'SPF' }, { value: 'dmarc', label: 'DMARC' }, { value: 'dkim', label: 'DKIM' }], function () { showBuilder(); }, 'spf');
      which.dataset.k = 'builder';
      var spfForm = el('div', { class: 'stack' }, el('div', { class: 'row' }, bSpf.mx, bSpf.a), presetBox,
        el('div', { class: 'nb-grid' }, U.field('Include (services that send for you)', bSpf.inc), U.field('IPv4 addresses', bSpf.ip4), U.field('IPv6 addresses', bSpf.ip6), U.field('Everything else', bSpf.all)),
        U.note('Publish as a TXT record on the domain itself (@).'));
      var dmForm = el('div', { class: 'stack' }, el('div', { class: 'nb-grid' }, U.field('Policy (p)', bDm.p), U.field('Subdomain policy (sp)', bDm.sp), U.field('Percentage (pct)', bDm.pct),
        U.field('Aggregate reports (rua)', bDm.rua), U.field('Failure reports (ruf)', bDm.ruf), U.field('DKIM alignment', bDm.adkim), U.field('SPF alignment', bDm.aspf)),
        U.note('Publish as a TXT record at _dmarc.<your domain>. Start with p=none and read the reports before tightening.'));
      var dkForm = el('div', { class: 'stack' }, U.field('Public key (PEM or base64)', bDk.pem), U.field('Key type', bDk.type),
        U.note('Publish as a TXT record at <selector>._domainkey.<your domain>.'));
      function showBuilder() {
        spfForm.style.display = which.value === 'spf' ? '' : 'none';
        dmForm.style.display = which.value === 'dmarc' ? '' : 'none';
        dkForm.style.display = which.value === 'dkim' ? '' : 'none';
        (which.value === 'spf' ? buildSpf : which.value === 'dmarc' ? buildDmarc : buildDkim)();
      }
      [bSpf.mx.input, bSpf.a.input, bSpf.ip4, bSpf.ip6, bSpf.inc, bSpf.all].forEach(function (n) { n.addEventListener('input', buildSpf); n.addEventListener('change', buildSpf); });
      Object.keys(bDm).forEach(function (k) { bDm[k].addEventListener('input', buildDmarc); bDm[k].addEventListener('change', buildDmarc); });
      [bDk.pem, bDk.type].forEach(function (n) { n.addEventListener('input', buildDkim); n.addEventListener('change', buildDkim); });

      U.live([rec], run);
      domain.addEventListener('keydown', function (e) { if (e.key === 'Enter') lookup(); });
      showBuilder();

      root.appendChild(U.panel('Record', rec, el('div', { style: { marginTop: '10px' } }, kind), stats));
      root.appendChild(U.panel('Checks', issues, nested));
      root.appendChild(U.panel('Explained', explain));
      root.appendChild(U.panel('Look up a domain', U.row(el('div', { class: 'grow' }, U.field('Domain', domain)), U.field('Record', ltype), U.field('DKIM selector', selector), btn), status,
        U.note('Sends the DNS question to Cloudflare\'s 1.1.1.1 DNS-over-HTTPS service, only when you press Look up.')));
      root.appendChild(U.panel('Build a record', which, el('div', { style: { marginTop: '12px' } }, spfForm, dmForm, dkForm), built,
        U.btnrow(U.copyBtn('Copy', function () { return built.textContent; }), U.button('Check it', function () { rec.value = built.textContent; run(); rec.scrollIntoView({ block: 'center' }); }))));
    }
  });

  /* ======================================================================
     MAC Address Vendor Lookup
     assets/data/oui.json is generated from the oui-data npm package
     (BSD-2-Clause), itself built from the IEEE Registration Authority's
     MA-L, MA-M and MA-S registries; only organisation names are kept, each
     followed by its prefixes ("Org|001B63 F0DBF8 …").
     ====================================================================== */

  var ouiLoad = null;
  function loadOui() {
    if (!ouiLoad) {
      ouiLoad = fetch('assets/data/oui.json').then(function (r) {
        if (!r.ok) throw new Error('Could not load the vendor list (HTTP ' + r.status + ')');
        return r.json();
      }).then(function (d) {
        var map = new Map();
        d.orgs.forEach(function (line) {
          var bar = line.indexOf('|'), org = line.slice(0, bar);
          line.slice(bar + 1).split(' ').forEach(function (p) { map.set(p, org); });
        });
        return { map: map, date: d.date, count: d.count, source: d.source };
      }).catch(function (e) { ouiLoad = null; throw e; });
    }
    return ouiLoad;
  }

  /* The first MAC-looking thing in a string, as 12 (or fewer) hex digits.
     Accepts 00:1b:63:84:45:e6, 00-1B-…, 001b.6384.45e6, 001B638445E6,
     macOS-style 0:1b:63:84:45:e6, and bare OUIs such as 00:1B:63. */
  function findMac(s) {
    var m = /(?:^|[^0-9a-f:.-])((?:[0-9a-f]{1,2}[:-]){5}[0-9a-f]{1,2})(?![0-9a-f:-])/i.exec(' ' + s);
    if (m) return m[1].split(/[:-]/).map(function (x) { return x.padStart(2, '0'); }).join('').toUpperCase();
    m = /\b([0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4})\b/i.exec(s);
    if (m) return m[1].replace(/\./g, '').toUpperCase();
    m = /\b([0-9a-f]{12})\b/i.exec(s);
    if (m) return m[1].toUpperCase();
    m = /(?:^|[^0-9a-f:-])((?:[0-9a-f]{2}[:-]){2,4}[0-9a-f]{2})(?![0-9a-f:-])/i.exec(' ' + s);
    if (m) return m[1].replace(/[:-]/g, '').toUpperCase();
    m = /^\s*([0-9a-f]{6,11})\s*$/i.exec(s);
    return m ? m[1].toUpperCase() : null;
  }
  function macInfo(hex, db) {
    var first = parseInt(hex.slice(0, 2), 16), multicast = !!(first & 1), local = !!(first & 2);
    var vendor = db.map.get(hex.slice(0, 9)) || db.map.get(hex.slice(0, 7)) || db.map.get(hex.slice(0, 6)) || '';
    var block = db.map.has(hex.slice(0, 9)) && hex.length >= 9 ? 'MA-S (36-bit)' : db.map.has(hex.slice(0, 7)) && hex.length >= 7 ? 'MA-M (28-bit)' : db.map.has(hex.slice(0, 6)) ? 'MA-L (24-bit)' : '';
    var note = '';
    if (hex === 'FFFFFFFFFFFF') note = 'Broadcast address';
    else if (/^01005E/.test(hex)) note = 'IPv4 multicast (01:00:5E)';
    else if (/^3333/.test(hex)) note = 'IPv6 multicast (33:33)';
    else if (/^0180C2/.test(hex)) note = 'IEEE 802.1 link-local multicast (spanning tree, LLDP, pause frames)';
    else if (local && !multicast) {
      var q = { 2: 'AAI (administratively assigned)', 6: 'reserved', 10: 'ELI (extended local identifier, company-assigned)', 14: 'SAI (standard assigned identifier)' }[first & 15];
      note = 'Locally administered: typically a randomised (private) Wi-Fi address, a virtual machine or a container' + (q ? '. SLAP quadrant: ' + q : '');
    }
    return { hex: hex, vendor: vendor, block: block, multicast: multicast, local: local, note: note };
  }
  function macFormats(hex) {
    var pairs = hex.match(/.{2}/g);
    var out = { colon: pairs.join(':'), hyphen: pairs.join('-'), cisco: hex.toLowerCase().match(/.{4}/g).join('.'), bare: hex };
    /* modified EUI-64 link-local address: flip the U/L bit, insert FFFE */
    var b = pairs.map(function (p) { return parseInt(p, 16); });
    b[0] ^= 2;
    var e = [b[0], b[1], b[2], 0xff, 0xfe, b[3], b[4], b[5]];
    var g = [];
    for (var i = 0; i < 8; i += 2) g.push(((e[i] << 8) | e[i + 1]).toString(16));
    out.eui64 = window.NetKit ? window.NetKit.ipv6Compress([0xfe80, 0, 0, 0].concat(g.map(function (x) { return parseInt(x, 16); }))) : 'fe80::' + g.join(':');
    return out;
  }

  reg({
    id: 'mac-lookup', name: 'MAC Address Vendor Lookup',
    description: 'Find the manufacturer behind a MAC address from the IEEE registry, offline, in any format or in bulk, and see whether it is multicast or a randomised, locally administered address.',
    keywords: ['mac address', 'mac lookup', 'oui', 'oui lookup', 'vendor', 'manufacturer', 'ieee', 'ethernet', 'wifi', 'wi-fi', 'bluetooth', 'hardware address',
      'randomised mac', 'randomized mac', 'private address', 'locally administered', 'arp', 'eui-64', 'network card'],
    render: function (root) {
      var input = txt('mac', '00:1B:63:84:45:E6', '00:1B:63:84:45:E6 or 001b.6384.45e6');
      var single = el('div', { dataset: { k: 'result' } });
      var bulk = area('bulk', '', 7, 'One per line; other text on the line is ignored, so ARP tables and DHCP lists paste straight in');
      var bulkOut = el('div', { dataset: { k: 'table' } });
      var source = el('p', { class: 'note', dataset: { k: 'source' } }, 'Loading the IEEE vendor list…');
      var db = null, bulkRows = [];

      function one() {
        if (!db) return;
        var raw = input.value.trim();
        if (!raw) { single.replaceChildren(); return; }
        var hex = findMac(raw);
        if (!hex || hex.length < 6) { single.replaceChildren(U.note('Enter at least the first three bytes (six hex digits) of a MAC address.', 'err')); return; }
        var i = macInfo(hex, db);
        var rows = [['Vendor', i.local && !i.multicast ? '(none: locally administered)' : i.vendor || 'Not in the IEEE registry'], ['Registry block', i.block],
          ['Unicast or multicast', i.multicast ? 'Multicast (group) address' : 'Unicast (one device)'], ['Scope', i.local ? 'Locally administered' : 'Globally unique (assigned by the maker)']];
        if (hex.length === 12) {
          var f = macFormats(hex);
          rows.push(['Colon form', f.colon], ['Hyphen form', f.hyphen], ['Cisco form', f.cisco], ['Bare', f.bare], ['IPv6 link-local (EUI-64)', f.eui64]);
        } else rows.push(['Prefix', hex.match(/.{1,2}/g).join(':')]);
        single.replaceChildren(el('div', { class: 'nb-big', dataset: { k: 'vendor' }, text: rows[0][1] }), i.note ? U.note(i.note) : null, kv(rows));
      }
      function many() {
        if (!db) return;
        bulkRows = [];
        var rows = bulk.value.split(/\r?\n/).filter(function (l) { return l.trim(); }).map(function (l) {
          var hex = findMac(l);
          if (!hex || hex.length < 6) { bulkRows.push([l.trim(), '', 'not a MAC address', '']); return [l.trim().slice(0, 40), '—', 'Not a MAC address', '']; }
          var i = macInfo(hex, db);
          var flags = [i.multicast ? 'multicast' : 'unicast', i.local ? 'local (random?)' : 'global'].join(', ');
          var vendor = i.local && !i.multicast ? '(locally administered)' : i.vendor || 'Unknown';
          var shown = hex.length === 12 ? macFormats(hex).colon : hex;
          bulkRows.push([shown, vendor, flags, i.note]);
          return [shown, vendor, flags, i.note || ''];
        });
        bulkOut.replaceChildren(rows.length ? table('bulk-table', ['MAC', 'Vendor', 'Type', 'Notes'], rows) : U.note('Paste MAC addresses above, one per line.'));
      }
      function csv() { return window.CSV.stringify([['MAC', 'Vendor', 'Type', 'Notes']].concat(bulkRows)); }

      input.addEventListener('input', U.debounce(one, 120));
      bulk.addEventListener('input', U.debounce(many, 200));
      loadOui().then(function (d) {
        db = d;
        var dt = d.date.split('-');
        source.textContent = 'Vendor data: IEEE Registration Authority (MA-L, MA-M and MA-S), ' + d.count.toLocaleString('en-GB') + ' prefixes, as published on ' + dt[2] + '/' + dt[1] + '/' + dt[0] + ' (oui-data package). Looked up in this tab.';
        one(); many();
      }).catch(function (e) { source.className = 'note err'; source.textContent = e.message; });

      root.appendChild(U.panel('MAC address', input, el('div', { style: { marginTop: '12px' } }, single), source));
      root.appendChild(U.panel('Bulk lookup', bulk, bulkOut, U.btnrow(U.downloadBtn('Download CSV', 'mac-vendors.csv', function () { return bulkRows.length ? csv() : ''; }, 'text/csv'))));
    }
  });

  /* ======================================================================
     Punycode & IDN Converter
     Punycode from punycode.js (MIT); the browser's URL parser applies the
     full UTS #46 IDNA mapping. Confusable letters come from Unicode's UTS
     #39 confusables.txt 17.0.0 (Unicode licence): only characters that stay
     non-ASCII after IDNA and look like an ASCII letter or digit.
     ====================================================================== */

  var CONFUSABLE_SRC = [
    '\ua75a2 \u01a72 \u03e82 \ua6442 \u14bf2 \ua6ef2 \u{1d206}3 \u09693 \u0ae93 \ua7ab3 \u021c3 \u01b73 \ua76a3 ',
    '\u2c9c3 \u2cc43 \u2ccc3 \u04173 \u04e03 \u{16f3b}3 \u{118ca}3 \u13ce4 \u{118af}4 \u01bc5 \u{118bb}5 \u2cd36 ',
    '\u2cd26 \u03ec6 \u2cdc6 \u04316 \u13ee6 \u{118d5}6 \u{1d212}7 \u{104d2}7 \u{118c6}7 \u09ea8 \u0a6a8 \u02238 ',
    '\u02228 \u{1031a}8 \u0a679 \u0b689 \u09ed9 \u0d6d9 \ua76e9 \u2ccb9 \u2cca9 \u{118cc}9 \u{118ac}9 \u{118d6}9 ',
    '\u237aa \u0251a \u03b1a \u{1d6c2}a \u{1d6fc}a \u{1d736}a \u{1d770}a \u{1d7aa}a \u0430a \u0391a \u{1d6a8}a ',
    '\u{1d6e2}a \u{1d71c}a \u{1d756}a \u{1d790}a \u0410a \u13aaa \u15c5a \ua4eea \u{16f40}a \u{102a0}a \ua733aa ',
    '\ua732aa \u00e6ae \u04d5ae \u00c6ae \u04d4ae \ua735ao \ua734ao \u{1f707}ar \ua737au \ua736au \ua739av ',
    '\ua73bav \ua738av \ua73aav \ua73day \ua73cay \u0184b \u042cb \u13cfb \u1472b \u15afb \ua7b4b \u0392b ',
    '\u{1d6a9}b \u{1d6e3}b \u{1d71d}b \u{1d757}b \u{1d791}b \u2c82b \u0412b \u13f4b \u15f7b \ua4d0b \u{10282}b ',
    '\u{102a1}b \u{10301}b \u042bbl \u1d04c \u03f2c \u2ca5c \u0441c \u1004c \u105ac \uabafc \u{1043d}c \u{1f74c}c ',
    '\u{118e9}c \u{118f2}c \u03f9c \u2ca4c \u0421c \u13dfc \ua4dac \u{102a2}c \u{10302}c \u{10415}c \u{1051c}c ',
    '\u0501d \u13e7d \u146fd \ua4d2d \u13a0d \u15ded \u15ead \ua4d3d \u02a3dz \u212ee \uab32e \u0435e \u04bde ',
    '\u22ffe \u0395e \u{1d6ac}e \u{1d6e6}e \u{1d720}e \u{1d75a}e \u{1d794}e \u0415e \u2d39e \u13ace \ua4f0e ',
    '\u{118a6}e \u{118ae}e \u{10286}e \uab35f \ua799f \u0192f \u1e9df \u0584f \u{1d213}f \ua798f \u03dcf ',
    '\u{1d7ca}f \u15b4f \ua4ddf \u{118c2}f \u{118a2}f \u{10287}f \u{102a5}f \u{10525}f \u0261g \u1d83g \u018dg ',
    '\u0581g \u050cg \u13c0g \u13f3g \ua4d6g \u04bbh \u0570h \u13c2h \u0397h \u{1d6ae}h \u{1d6e8}h \u{1d722}h ',
    '\u{1d75c}h \u{1d796}h \u2c8eh \u041dh \u13bbh \u157ch \ua4e7h \u{102cf}h \u2373i \u0131i \u{1d6a4}i \u026ai ',
    '\u0269i \u03b9i \u1fbei \u{1d6ca}i \u{1d704}i \u{1d73e}i \u{1d778}i \u{1d7b2}i \u2c93i \u0456i \ua647i ',
    '\u0582i \uab75i \u13a5i \u{118c3}i \u03f3j \u0458j \ua7b2j \u037fj \u0408j \u13abj \u148dj \ua4d9j \u039ak ',
    '\u{1d6b1}k \u{1d6eb}k \u{1d725}k \u{1d75f}k \u{1d799}k \u2c94k \u041ak \u13e6k \u16d5k \ua4d7k \u{10518}k ',
    '\u2223l \u23fdl \uffe8l \u06f1l \u{10320}l \u0196l \u01c0l \u0399l \u{1d6b0}l \u{1d6ea}l \u{1d724}l ',
    '\u{1d75e}l \u{1d798}l \u2c92l \u0406l \u04cfl \u2d4fl \u16c1l \ua4f2l \u{16f28}l \u{1028a}l \u{10309}l ',
    '\u{1d22a}l \u2cd0l \u13del \u14aal \ua4e1l \u{16f16}l \u{118a3}l \u{118b2}l \u{1041b}l \u{10526}l \u2016ll ',
    '\u2225ll \u01c1ll \u042elo \u02aals \u20b6lt \u02ablz \u039cm \u{1d6b3}m \u{1d6ed}m \u{1d727}m \u{1d761}m ',
    '\u{1d79b}m \u03fam \u2c98m \u041cm \u13b7m \u15f0m \u16d6m \ua4dfm \u{102b0}m \u{10311}m \u{1f76b}mb \u0578n ',
    '\u057cn \u039dn \u{1d6b4}n \u{1d6ee}n \u{1d728}n \u{1d762}n \u{1d79c}n \u2c9an \ua4e0n \u{10513}n \u0966o ',
    '\u09e6o \u0a66o \u0ae6o \u0b66o \u0be6o \u0c66o \u0d66o \u0e50o \u0ed0o \u1040o \u17e0o \u{114d0}o \u06f5o ',
    '\u1d0fo \u1d11o \uab3do \u03bfo \u{1d6d0}o \u{1d70a}o \u{1d744}o \u{1d77e}o \u{1d7b8}o \u03c3o \u{1d6d4}o ',
    '\u{1d70e}o \u{1d748}o \u{1d782}o \u{1d7bc}o \u2c9fo \u03edo \u043eo \u10ffo \u0585o \u0d20o \u101do ',
    '\u{104ea}o \u{118c8}o \u{118d7}o \u{1042c}o \u0ce6o \u3007o \u{118e0}o \u039fo \u{1d6b6}o \u{1d6f0}o ',
    '\u{1d72a}o \u{1d764}o \u{1d79e}o \u2c9eo \u041eo \u0555o \u2d54o \u12d0o \u0b20o \u{104c2}o \ua4f3o ',
    '\u{118b5}o \u{10292}o \u{102ab}o \u{10404}o \u{10516}o \u0153oe \u0152oe \u221eoo \ua74foo \ua699oo \ua74eoo ',
    '\ua698oo \u2374p \u00fep \u01bfp \u03c1p \u03f1p \u{1d6d2}p \u{1d6e0}p \u{1d70c}p \u{1d71a}p \u{1d746}p ',
    '\u{1d754}p \u{1d780}p \u{1d78e}p \u{1d7ba}p \u{1d7c8}p \u03f8p \u2ca3p \u2ccfp \u0440p \u03a1p \u{1d6b8}p ',
    '\u{1d6f2}p \u{1d72c}p \u{1d766}p \u{1d7a0}p \u2ca2p \u2ccep \u0420p \u13e2p \u146dp \ua4d1p \u{10295}p ',
    '\u051bq \u0563q \u0566q \u2d55q \u{1f700}qe \uab47r \uab48r \u1d26r \u2c85r \u0433r \uab81r \u{1d216}r ',
    '\u01a6r \u13a1r \u13d2r \u{104b4}r \u1587r \ua4e3r \u{16f35}r \u{118e3}rn \u{11700}rn \ua731s \u01bds ',
    '\u0455s \u0d1fs \uabaas \u{118c1}s \u{10448}s \u0405s \u054fs \u13d5s \u13das \ua4e2s \u{16f3a}s \u{10296}s ',
    '\u{10420}s \u{1f75c}sss \u22a4t \u27d9t \u{1f768}t \u03a4t \u{1d6bb}t \u{1d6f5}t \u{1d72f}t \u{1d769}t ',
    '\u{1d7a3}t \u2ca6t \u0422t \u13a2t \ua4d4t \u{16f0a}t \u{118bc}t \u{10297}t \u{102b1}t \u{10315}t \ua728t3 ',
    '\ua777tf \u02a6ts \ua79fu \u1d1cu \uab4eu \uab52u \u028bu \u03c5u \u{1d6d6}u \u{1d710}u \u{1d74a}u ',
    '\u{1d784}u \u{1d7be}u \u057du \u{104f6}u \u{118d8}u \u222au \u22c3u \u054du \u1200u \u{104ce}u \u144cu ',
    '\ua4f4u \u{16f42}u \u{118b8}u \u1d6bue \uab63uo \u2228v \u22c1v \u1d20v \u03bdv \u{1d6ce}v \u{1d708}v ',
    '\u{1d742}v \u{1d77c}v \u{1d7b6}v \u0475v \u{11706}v \uaba9v \u{118c0}v \u{1d20d}v \u06f7v \u0474v \u2d38v ',
    '\u13d9v \u142fv \ua6dfv \ua4e6v \u{16f08}v \u{118a0}v \u{1051d}v \u{1f76c}vb \u026fw \u1d21w \u2cbdw \u0461w ',
    '\u0448w \u051dw \u0561w \u{1170a}w \u{1170e}w \u{1170f}w \uab83w \u{118e6}w \u{118ef}w \u051cw \u13b3w ',
    '\u13d4w \ua4eaw \u166ex \u00d7x \u292bx \u292cx \u2a2fx \u0445x \u1541x \u157dx \u166dx \u2573x \u{10322}x ',
    '\u{118ec}x \ua7b3x \u03a7x \u{1d6be}x \u{1d6f8}x \u{1d732}x \u{1d76c}x \u{1d7a6}x \u2cacx \u0425x \u2d5dx ',
    '\u16b7x \ua4ebx \u{10290}x \u{102b4}x \u{10317}x \u{10527}x \u0263y \u1d8cy \u028fy \u1effy \uab5ay \u03b3y ',
    '\u213dy \u{1d6c4}y \u{1d6fe}y \u{1d738}y \u{1d772}y \u{1d7ac}y \u2ca9y \u0443y \u04afy \u10e7y \u{118dc}y ',
    '\u03a5y \u03d2y \u{1d6bc}y \u{1d6f6}y \u{1d730}y \u{1d76a}y \u{1d7a4}y \u2ca8y \u0423y \u04aey \u13a9y ',
    '\u13bdy \ua4ecy \u{16f43}y \u{118a4}y \u{102b2}y \u1d22z \uab93z \u{118c4}z \u{118e5}z \u{102f5}z \u0396z ',
    '\u{1d6ad}z \u{1d6e7}z \u{1d721}z \u{1d75b}z \u{1d795}z \u13c3z \ua4dcz \u{118a9}z'
  ].join('');
  var confusableMap = null;
  function confusables() {
    if (!confusableMap) {
      confusableMap = new Map();
      CONFUSABLE_SRC.split(' ').forEach(function (e) { var cps = Array.from(e); if (cps.length > 1) confusableMap.set(cps[0], cps.slice(1).join('')); });
    }
    return confusableMap;
  }
  var SCRIPTS = ['Latin', 'Greek', 'Cyrillic', 'Armenian', 'Hebrew', 'Arabic', 'Devanagari', 'Bengali', 'Gurmukhi', 'Gujarati', 'Tamil', 'Telugu', 'Kannada',
    'Malayalam', 'Sinhala', 'Thai', 'Lao', 'Tibetan', 'Georgian', 'Hangul', 'Ethiopic', 'Cherokee', 'Khmer', 'Mongolian', 'Hiragana', 'Katakana', 'Bopomofo', 'Han'];
  var SCRIPT_RE = SCRIPTS.map(function (s) { return [s, new RegExp('\\p{Script=' + s + '}', 'u')]; });
  var CJK_OK = [['Latin', 'Han', 'Hiragana', 'Katakana'], ['Latin', 'Han', 'Bopomofo'], ['Latin', 'Han', 'Hangul']];
  function scriptsOf(label) {
    var set = [];
    Array.from(label).forEach(function (ch) {
      if (/[0-9-]/.test(ch)) return;
      for (var i = 0; i < SCRIPT_RE.length; i++) if (SCRIPT_RE[i][1].test(ch)) { if (set.indexOf(SCRIPT_RE[i][0]) < 0) set.push(SCRIPT_RE[i][0]); return; }
      if (!/[\p{Script=Common}\p{Script=Inherited}]/u.test(ch) && set.indexOf('Other') < 0) set.push('Other');
    });
    return set;
  }

  /* Checks one Unicode label for homograph tricks and IDNA limits. */
  function labelWarnings(uni, ascii) {
    var W = [], sc = scriptsOf(uni);
    if (sc.length > 1 && !CJK_OK.some(function (ok) { return sc.every(function (s) { return ok.indexOf(s) > -1; }); })) {
      var danger = sc.indexOf('Latin') > -1 && sc.some(function (s) { return /Cyrillic|Greek|Armenian|Cherokee/.test(s); });
      W.push([danger ? 'err' : 'warn', '"' + uni + '" mixes ' + sc.join(' and ') + ' letters' + (danger ? ', the classic look-alike (homograph) trick.' : '.')]);
    }
    if (/[^\x00-\x7f]/.test(uni)) {
      var map = confusables(), looks = Array.from(uni.toLowerCase()).map(function (c) { return c.charCodeAt(0) < 128 ? c : (map.get(c) || c); }).join('');
      if (/^[a-z0-9-]+$/.test(looks)) W.push(['err', '"' + uni + '" looks like the plain ASCII "' + looks + '" but is a different address (' + ascii + ').']);
    }
    if (/[​-‍⁠﻿­]/.test(uni)) W.push(['warn', '"' + uni + '" contains invisible characters.']);
    if (ascii.length > 63) W.push(['err', 'The label ' + ascii + ' is ' + ascii.length + ' characters in ASCII form; the limit is 63.']);
    if (/^-|-$/.test(ascii)) W.push(['err', 'Labels cannot start or end with a hyphen (' + ascii + ').']);
    if (/^..--/.test(ascii) && !/^xn--/i.test(ascii)) W.push(['warn', ascii + ' has "--" in positions 3 and 4, which is reserved for encodings like xn--.']);
    return W;
  }

  reg({
    id: 'punycode-converter', name: 'Punycode & IDN Converter',
    description: 'Convert internationalised domain names and email addresses between Unicode and Punycode (xn--), label by label, with look-alike and mixed-script warnings and a bulk mode.',
    keywords: ['punycode', 'idn', 'idna', 'xn--', 'internationalised domain', 'internationalized domain', 'unicode domain', 'emoji domain', 'homograph',
      'confusable', 'look-alike', 'phishing', 'uts 46', 'ace', 'domain converter', 'email address', 'eai'],
    render: function (root) {
      var input = area('in', 'bücher.example\nxn--mnchen-3ya.de\nnoreply@пример.испытание\nаpple.com', 6, 'One domain, email address or URL per line');
      var mode = U.chips([{ value: 'auto', label: 'Auto' }, { value: 'ascii', label: 'To Punycode' }, { value: 'unicode', label: 'To Unicode' }], function () { run(); }, 'auto');
      mode.dataset.k = 'mode';
      var out = el('pre', { class: 'out', dataset: { k: 'out' } });
      var labels = el('div', { dataset: { k: 'labels' } });
      var warns = issuesNode('warnings');
      var status = el('p', { class: 'note' }, 'Loading punycode.js…');
      var pc = null;

      function convertHost(host, dir, W) {
        var parts = host.split(/[.。．｡]/), rows = [];
        var res = parts.map(function (label) {
          if (!label) return { uni: '', ascii: '' };
          var uni = label, ascii = label, note = '';
          if (/^xn--/i.test(label)) {
            try { uni = pc.toUnicode(label.toLowerCase()); } catch (e) { W.push(['err', '"' + label + '" is not valid Punycode.']); uni = label; note = 'invalid'; }
            if (uni !== label && /^[\x00-\x7f]*$/.test(uni)) { W.push(['err', '"' + label + '" decodes to plain ASCII ("' + uni + '"), which IDNA forbids.']); note = 'invalid'; }
            ascii = label.toLowerCase();
          } else if (/[^\x00-\x7f]/.test(label)) {
            var mapped = label;
            try { mapped = new URL('http://' + label + '.test/').hostname.replace(/\.test$/, ''); } catch (e) { W.push(['err', '"' + label + '" cannot be used in a domain name (the browser\'s IDNA rules reject it).']); note = 'rejected by IDNA'; }
            ascii = /^xn--/.test(mapped) || /^[\x00-\x7f]+$/.test(mapped) ? mapped : 'xn--' + pc.encode(label.toLowerCase());
            uni = /^xn--/.test(ascii) ? pc.toUnicode(ascii) : ascii;
            if (uni !== label) note = 'normalised from "' + label + '"';
            if (label.normalize('NFC') !== label) W.push(['info', '"' + label + '" was not in NFC form; IDNA normalises it.']);
          } else { ascii = label.toLowerCase(); uni = ascii; }
          labelWarnings(uni, ascii).forEach(function (w) { W.push(w); });
          rows.push([uni, ascii, scriptsOf(uni).join(', ') || 'ASCII', note]);
          return { uni: uni, ascii: ascii };
        });
        var asciiHost = res.map(function (r) { return r.ascii; }).join('.'), uniHost = res.map(function (r) { return r.uni; }).join('.');
        if (asciiHost.length > 253) W.push(['err', host + ' is ' + asciiHost.length + ' characters in ASCII form; domain names are limited to 253.']);
        return { text: dir === 'unicode' ? uniHost : asciiHost, rows: rows, ascii: asciiHost, uni: uniHost };
      }

      function run() {
        if (!pc) return;
        var W = [], outLines = [], allRows = [];
        input.value.split(/\r?\n/).forEach(function (line) {
          var s = line.trim();
          if (!s) { outLines.push(''); return; }
          var dir = mode.value === 'auto' ? (/(^|[.@/])xn--/i.test(s) && /^[\x00-\x7f]*$/.test(s) ? 'unicode' : 'ascii') : mode.value;
          var m = /^([a-z][a-z0-9+.-]*:\/\/)([^/?#:]+)(.*)$/i.exec(s), prefix = '', host = s, suffix = '';
          if (m) { prefix = m[1]; host = m[2]; suffix = m[3]; }
          else {
            var at = s.lastIndexOf('@');
            if (at > 0) {
              prefix = s.slice(0, at + 1); host = s.slice(at + 1);
              if (/[^\x00-\x7f]/.test(prefix)) W.push(['warn', 'The mailbox part of ' + s + ' is not ASCII: only mail servers with SMTPUTF8 (EAI) support can deliver it, and Punycode does not apply to it.']);
            }
          }
          var r = convertHost(host, dir, W);
          r.rows.forEach(function (row) { allRows.push([host].concat(row)); });
          outLines.push(prefix + r.text + suffix);
        });
        out.textContent = outLines.join('\n').replace(/\n+$/, '');
        labels.replaceChildren(allRows.length ? table('label-table', ['Domain', 'Unicode', 'ASCII (Punycode)', 'Scripts', 'Notes'], allRows) : U.note('Nothing to convert.'));
        issueList(warns, W, 'No look-alike or mixed-script labels.');
      }

      U.live([input], run);
      U.module('assets/vendor/punycode/punycode.es6.js').then(function (m) {
        pc = m.default || m;
        status.textContent = 'Converted in this tab with punycode.js ' + (pc.version || '') + ' and the browser\'s IDNA (UTS #46) rules.';
        run();
      }).catch(function (e) { status.className = 'note err'; status.textContent = 'Could not load punycode.js: ' + e.message; });

      root.appendChild(U.panel('Domains, emails or URLs', input, el('div', { style: { marginTop: '10px' } }, mode), status));
      root.appendChild(U.panel('Converted', out, U.btnrow(U.copyBtn('Copy', function () { return out.textContent; }))));
      root.appendChild(U.panel('Warnings', warns));
      root.appendChild(U.panel('Labels', labels));
    }
  });

  /* ======================================================================
     WebRTC Leak Test
     ====================================================================== */

  function parseCandidate(line) {
    var p = String(line).replace(/^a=/, '').replace(/^candidate:/, '').trim().split(/\s+/);
    var c = { foundation: p[0], component: p[1], protocol: (p[2] || '').toLowerCase(), priority: p[3], address: p[4] || '', port: p[5] || '', type: '', raddr: '', rport: '', tcptype: '' };
    for (var i = 6; i < p.length - 1; i += 2) {
      if (p[i] === 'typ') c.type = p[i + 1];
      else if (p[i] === 'raddr') c.raddr = p[i + 1];
      else if (p[i] === 'rport') c.rport = p[i + 1];
      else if (p[i] === 'tcptype') c.tcptype = p[i + 1];
    }
    return c;
  }
  /* What kind of address a candidate reveals. */
  function addrKind(a) {
    if (/\.local$/i.test(a)) return { kind: 'mdns', label: 'mDNS name (hides the local IP)' };
    var v4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(a);
    if (v4) {
      var x = +v4[1], y = +v4[2];
      if (x === 10 || (x === 172 && y >= 16 && y <= 31) || (x === 192 && y === 168)) return { kind: 'private', label: 'Private IPv4 (local network)' };
      if (x === 100 && y >= 64 && y <= 127) return { kind: 'private', label: 'Carrier-grade NAT (100.64.0.0/10)' };
      if (x === 169 && y === 254) return { kind: 'private', label: 'Link-local IPv4' };
      if (x === 127) return { kind: 'private', label: 'Loopback' };
      if (x === 0) return { kind: 'private', label: 'Unspecified' };
      return { kind: 'public', label: 'Public IPv4' };
    }
    if (a.indexOf(':') > -1) {
      var h = a.toLowerCase();
      if (/^fe[89ab]/.test(h)) return { kind: 'private', label: 'Link-local IPv6' };
      if (/^f[cd]/.test(h)) return { kind: 'private', label: 'Unique local IPv6 (private)' };
      if (h === '::1') return { kind: 'private', label: 'Loopback' };
      return { kind: 'public', label: 'Public IPv6' };
    }
    return { kind: 'other', label: 'Unknown' };
  }

  reg({
    id: 'webrtc-leak-test', name: 'WebRTC Leak Test',
    description: 'See which IP addresses your browser reveals through WebRTC: local (mDNS), public (via a STUN server) and relay candidates, and what a VPN user should expect.',
    keywords: ['webrtc', 'webrtc leak', 'ip leak', 'vpn leak', 'vpn test', 'stun', 'ice candidates', 'mdns', 'local ip', 'public ip', 'privacy', 'rtcpeerconnection', 'turn'],
    online: 'a STUN server (Google by default) when you press Start',
    render: function (root) {
      var stun = txt('stun', 'stun:stun.l.google.com:19302', 'stun:host:port (leave empty for local candidates only)');
      var btn = U.button('Start', start, 'primary');
      var status = el('p', { class: 'note', dataset: { k: 'status' } }, 'Nothing is sent until you press Start.');
      var cands = el('div', { dataset: { k: 'candidates' } });
      var verdict = issuesNode('summary');
      var pc = null, timer = null, list = [], errors = [], done = true;

      function stop() {
        clearTimeout(timer);
        if (pc) { try { pc.close(); } catch (e) { /* already closed */ } }
        pc = null;
      }
      U.onTeardown(root, stop);

      function draw() {
        cands.replaceChildren(list.length ? table('cand-table', ['Type', 'Address', 'Port', 'Protocol', 'What it reveals'], list.map(function (c) {
          var k = addrKind(c.address);
          var what = c.type === 'host' ? k.label : c.type === 'srflx' ? 'Public address seen by the STUN server' + (c.raddr && c.raddr !== '0.0.0.0' ? ' (local ' + c.raddr + ')' : '') : c.type === 'relay' ? 'TURN relay address' : c.type === 'prflx' ? 'Address seen by the other peer' : '';
          return [{ host: 'host', srflx: 'server-reflexive', relay: 'relay', prflx: 'peer-reflexive' }[c.type] || c.type, c.address, c.port, c.protocol + (c.tcptype ? ' ' + c.tcptype : ''), what];
        })) : U.note(done ? 'No candidates yet.' : 'Gathering…'));
      }

      function finish(reason) {
        if (done) return;
        done = true;
        stop();
        btn.disabled = false;
        var V = [], hosts = list.filter(function (c) { return c.type === 'host'; }), srflx = list.filter(function (c) { return c.type === 'srflx'; });
        var publicIps = srflx.map(function (c) { return c.address; }).filter(function (a, i, arr) { return arr.indexOf(a) === i; });
        var rawLocal = hosts.filter(function (c) { return addrKind(c.address).kind === 'private'; });
        var rawPublic = hosts.filter(function (c) { return addrKind(c.address).kind === 'public'; });
        if (!list.length) V.push(['warn', 'The browser produced no candidates' + (reason ? ' (' + reason + ')' : '') + '. WebRTC may be disabled or blocked by an extension, which also means it cannot leak.']);
        if (hosts.length && !rawLocal.length && !rawPublic.length) V.push(['ok', 'Local addresses are hidden behind mDNS names (' + hosts.length + ' host candidate' + (hosts.length === 1 ? '' : 's') + '), so sites cannot read your local IP.']);
        if (rawLocal.length) V.push(['warn', 'Your local network address' + (rawLocal.length > 1 ? 'es are' : ' is') + ' visible to websites: ' + rawLocal.map(function (c) { return c.address; }).filter(function (a, i, arr) { return arr.indexOf(a) === i; }).join(', ') + '.']);
        if (rawPublic.length) V.push(['err', 'A public address appears in a host candidate (' + rawPublic.map(function (c) { return c.address; }).join(', ') + '). If you use a VPN, this address bypasses it.']);
        if (publicIps.length) V.push(['info', 'The STUN server sees you as ' + publicIps.join(', ') + '. With a VPN on, this must be the VPN\'s address; if it is your own ISP address, WebRTC is leaking it. Compare with the IP Address Info tool.']);
        else if (stun.value.trim() && list.length) V.push(['ok', 'The STUN server gave no public address' + (errors.length ? ' (' + errors[0] + ')' : '') + ': it is unreachable from here, so nothing leaked through it.']);
        if (!stun.value.trim()) V.push(['info', 'No STUN server was used, so only local candidates were gathered.']);
        issueList(verdict, V);
        status.className = 'note';
        status.textContent = 'Finished: ' + plural(list.length, 'candidate') + (reason ? ' (' + reason + ')' : '') + '.';
        draw();
      }

      function start() {
        var PC = window.RTCPeerConnection || window.webkitRTCPeerConnection;
        if (!PC) { status.className = 'note err'; status.textContent = 'This browser has no WebRTC (RTCPeerConnection), so it cannot leak through it.'; return; }
        stop();
        list = []; errors = []; done = false;
        var urls = stun.value.trim().split(/[\s,]+/).filter(Boolean);
        if (urls.some(function (u) { return !/^(stun|stuns|turn|turns):/i.test(u); })) { status.className = 'note err'; status.textContent = 'STUN servers look like stun:host:port.'; done = true; return; }
        try { pc = new PC({ iceServers: urls.length ? [{ urls: urls }] : [] }); }
        catch (e) { status.className = 'note err'; status.textContent = 'The browser rejected that server: ' + e.message; done = true; return; }
        btn.disabled = true;
        status.className = 'note';
        status.textContent = 'Gathering ICE candidates' + (urls.length ? ' (asking ' + urls.join(', ') + ')' : '') + '…';
        draw();
        pc.onicecandidate = function (e) {
          if (e.candidate && e.candidate.candidate) { list.push(parseCandidate(e.candidate.candidate)); draw(); }
          else if (!e.candidate) finish('');
        };
        pc.onicecandidateerror = function (e) { errors.push('error ' + e.errorCode + (e.errorText ? ': ' + e.errorText : '')); };
        pc.onicegatheringstatechange = function () { if (pc && pc.iceGatheringState === 'complete') finish(''); };
        try { pc.createDataChannel('probe'); } catch (e) { /* a data channel is only there to trigger gathering */ }
        pc.createOffer().then(function (o) { return pc && pc.setLocalDescription(o); })
          .catch(function (e) { status.className = 'note err'; status.textContent = 'Could not start WebRTC: ' + e.message; finish('failed'); });
        timer = setTimeout(function () { finish('stopped after 10 seconds'); }, 10000);
      }

      draw();
      root.appendChild(U.panel('Test', U.row(el('div', { class: 'grow' }, U.field('STUN server', stun)), btn), status));
      root.appendChild(U.panel('Result', verdict));
      root.appendChild(U.panel('ICE candidates', cands));
      root.appendChild(U.panel('What a VPN user should see', el('ul', { class: 'nb-issues' },
        el('li', { class: 'info', text: 'Host candidates: .local mDNS names, never your real local or public IP (Chrome, Edge, Firefox and Safari hide them by default).' }),
        el('li', { class: 'info', text: 'Server-reflexive candidates: only the VPN server\'s public address. Your ISP address here is a leak.' }),
        el('li', { class: 'info', text: 'Public IPv6 host candidates are a common leak when the VPN only tunnels IPv4.' }),
        el('li', { class: 'info', text: 'To stop leaks: use the VPN app\'s WebRTC protection, a browser setting that limits WebRTC to proxied connections, or disable IPv6 if the VPN cannot tunnel it.' }))));
    }
  });

  /* ======================================================================
     CIDR Aggregator & IP Range Converter (IPv4 and IPv6, with BigInt)
     ====================================================================== */

  function ipParse(s) {
    s = String(s).trim().replace(/^\[|\]$/g, '');
    if (/^\d+\.\d+\.\d+\.\d+$/.test(s)) {
      var o = window.NetKit.parseIPv4(s);
      if (!o) throw new Error('"' + s + '" is not a valid IPv4 address');
      return { v: 4, n: BigInt(window.NetKit.toLong(o)) };
    }
    if (s.indexOf(':') > -1) {
      var r;
      try { r = window.NetKit.parseIPv6(s); } catch (e) { throw new Error('"' + s + '": ' + e.message); }
      if (r.prefix !== null) throw new Error('"' + s + '" has a prefix where an address was expected');
      return { v: 6, n: r.big };
    }
    throw new Error('"' + s + '" is not an IP address');
  }
  function ipBits(v) { return v === 4 ? 32 : 128; }
  function ipFmt(v, n) {
    if (v === 4) { var x = Number(n); return [x >>> 24, (x >>> 16) & 255, (x >>> 8) & 255, x & 255].join('.'); }
    return window.NetKit.ipv6Compress(window.NetKit.ipv6Groups(n));
  }
  function bitLen(n) { return n === 0n ? 0 : n.toString(2).length; }
  /* One line → { v, start, end, text, note }: a CIDR, a range or an address. */
  function ipItem(line) {
    var s = line.trim().replace(/\s+#.*$/, '');
    var rg = /^(\S+)\s*(?:-|–|to)\s*(\S+)$/i.exec(s);
    if (rg && !/^[^:]*-[^:]*:/.test(s)) {
      var a = ipParse(rg[1]), b = ipParse(rg[2]);
      if (a.v !== b.v) throw new Error('"' + s + '" mixes IPv4 and IPv6');
      if (a.n > b.n) throw new Error('"' + s + '" ends before it starts');
      return { v: a.v, start: a.n, end: b.n, text: s };
    }
    var slash = s.lastIndexOf('/');
    if (slash > -1) {
      var ip = ipParse(s.slice(0, slash)), p = s.slice(slash + 1);
      if (!/^\d{1,3}$/.test(p) || +p > ipBits(ip.v)) throw new Error('"' + s + '": the prefix must be 0–' + ipBits(ip.v));
      var host = BigInt(ipBits(ip.v) - +p), size = 1n << host, net = ip.n & ~(size - 1n);
      return { v: ip.v, start: net, end: net + size - 1n, text: s, note: net !== ip.n ? '"' + s + '" has host bits set; read as ' + ipFmt(ip.v, net) + '/' + p : '' };
    }
    var one = ipParse(s);
    return { v: one.v, start: one.n, end: one.n, text: s };
  }
  function toCidrs(v, start, end) {
    var out = [], bits = ipBits(v);
    while (start <= end) {
      var tz = start === 0n ? bits : bitLen(start & -start) - 1;
      var k = Math.min(tz, bitLen(end - start + 1n) - 1);
      out.push({ v: v, start: start, prefix: bits - k, end: start + (1n << BigInt(k)) - 1n });
      start += 1n << BigInt(k);
    }
    return out;
  }
  function mergeRanges(items) {
    var sorted = items.slice().sort(function (a, b) { return a.v - b.v || (a.start < b.start ? -1 : a.start > b.start ? 1 : 0); }), out = [];
    sorted.forEach(function (r) {
      var last = out[out.length - 1];
      if (last && last.v === r.v && r.start <= last.end + 1n) { if (r.end > last.end) last.end = r.end; }
      else out.push({ v: r.v, start: r.start, end: r.end });
    });
    return out;
  }
  function subtractRanges(keep, remove) {
    var out = [];
    keep.forEach(function (k) {
      var pieces = [{ v: k.v, start: k.start, end: k.end }];
      remove.filter(function (r) { return r.v === k.v; }).forEach(function (r) {
        pieces = pieces.reduce(function (acc, p) {
          if (r.end < p.start || r.start > p.end) { acc.push(p); return acc; }
          if (r.start > p.start) acc.push({ v: p.v, start: p.start, end: r.start - 1n });
          if (r.end < p.end) acc.push({ v: p.v, start: r.end + 1n, end: p.end });
          return acc;
        }, []);
      });
      out = out.concat(pieces);
    });
    return out;
  }
  function count(n) { return n > 10n ** 15n ? '2^' + (bitLen(n) - 1) + (n & (n - 1n) ? '+' : '') : n.toLocaleString('en-GB'); }
  function cidrText(c) { return ipFmt(c.v, c.start) + '/' + c.prefix; }

  reg({
    id: 'cidr-calculator', name: 'CIDR Aggregator & IP Range Converter',
    description: 'Merge lists of IPv4 and IPv6 addresses, ranges and CIDR blocks into the fewest CIDRs, turn ranges into CIDRs and back, subtract a subnet from a block and test whether an IP is covered.',
    keywords: ['cidr', 'cidr calculator', 'aggregate', 'summarise', 'summarize', 'supernet', 'merge subnets', 'ip range', 'range to cidr', 'cidr to range', 'subnet',
      'subtract subnet', 'exclude', 'ipv4', 'ipv6', 'allowlist', 'whitelist', 'firewall', 'prefix', 'route summarisation', 'ip in range'],
    render: function (root) {
      var MODES = [{ value: 'merge', label: 'Merge list' }, { value: 'range', label: 'Range → CIDRs' }, { value: 'info', label: 'CIDR → range' },
        { value: 'subtract', label: 'Subtract' }, { value: 'contains', label: 'Is it in the list?' }];
      var mode = U.chips(MODES, function () { run(); }, 'merge');
      mode.dataset.k = 'mode';
      var input = area('in', '10.0.0.0/24\n10.0.1.0/24\n10.0.2.0/23\n192.168.1.10 - 192.168.1.100\n2001:db8::/33\n2001:db8:8000::/33', 7);
      var input2 = area('in2', '10.0.1.64/26\n192.168.1.50', 4);
      var label1 = el('label'), label2 = el('label');
      var box2 = el('div', { class: 'field', style: { marginTop: '10px' } }, label2, input2);
      var stats = el('div', { dataset: { k: 'stats' } });
      var out = el('pre', { class: 'out', dataset: { k: 'out' } });
      var tbl = el('div', { dataset: { k: 'table' } });
      var issues = issuesNode('issues');

      function read(text, W) {
        var items = [];
        text.split(/\r?\n/).forEach(function (l, i) {
          if (!l.trim() || /^\s*#/.test(l)) return;
          l.split(/[,;]\s*|\s{2,}|\t/).filter(function (x) { return x.trim(); }).forEach(function (part) {
            try { var it = ipItem(part); items.push(it); if (it.note) W.push(['info', it.note + '.']); }
            catch (e) { W.push(['err', 'Line ' + (i + 1) + ': ' + e.message + '.']); }
          });
        });
        return items;
      }
      function total(list) { return list.reduce(function (a, r) { return a + (r.end - r.start + 1n); }, 0n); }

      function run() {
        var m = mode.value, W = [], lines = [], rows = null;
        label1.textContent = { merge: 'Addresses, ranges and CIDRs (one per line)', range: 'Ranges, e.g. 192.168.1.10 - 192.168.1.100', info: 'CIDR blocks, e.g. 10.0.0.0/22', subtract: 'Start with these blocks', contains: 'The list to check against' }[m];
        label2.textContent = m === 'subtract' ? 'Remove these' : 'Addresses (or ranges) to test';
        box2.style.display = m === 'subtract' || m === 'contains' ? '' : 'none';
        var items = read(input.value, W), st = [];
        if (m === 'merge' || m === 'subtract') {
          var merged = mergeRanges(items);
          if (m === 'subtract') merged = subtractRanges(merged, mergeRanges(read(input2.value, W)));
          var cidrs = [];
          merged.forEach(function (r) { cidrs = cidrs.concat(toCidrs(r.v, r.start, r.end)); });
          lines = cidrs.map(cidrText);
          st = [{ label: 'In', value: String(items.length) }, { label: 'CIDRs out', value: String(cidrs.length) },
            { label: 'IPv4 addresses', value: count(total(merged.filter(function (r) { return r.v === 4; }))) }, { label: 'IPv6 addresses', value: count(total(merged.filter(function (r) { return r.v === 6; }))) }];
          if (m === 'subtract' && !cidrs.length && items.length) W.push(['info', 'Nothing is left: the blocks removed cover everything.']);
        } else if (m === 'range') {
          rows = [];
          items.forEach(function (r) {
            var cs = toCidrs(r.v, r.start, r.end);
            lines = lines.concat(cs.map(cidrText));
            rows.push([ipFmt(r.v, r.start) + ' – ' + ipFmt(r.v, r.end), cs.map(cidrText).join(', '), count(r.end - r.start + 1n)]);
          });
          rows = rows.length ? table('range-table', ['Range', 'CIDRs', 'Addresses'], rows) : null;
          st = [{ label: 'Ranges', value: String(items.length) }, { label: 'CIDRs', value: String(lines.length) }];
        } else if (m === 'info') {
          var r2 = items.map(function (r) {
            var size = r.end - r.start + 1n, cs = toCidrs(r.v, r.start, r.end), single = cs.length === 1;
            lines.push(ipFmt(r.v, r.start) + ' - ' + ipFmt(r.v, r.end));
            var mask = r.v === 4 && single ? ipFmt(4, ((1n << 32n) - 1n) ^ (size - 1n)) : '—';
            var hosts = r.v === 4 && single ? (cs[0].prefix >= 31 ? size : size - 2n) : size;
            return [single ? cidrText(cs[0]) : r.text, ipFmt(r.v, r.start), ipFmt(r.v, r.end), count(size), mask, r.v === 4 ? count(hosts) : '—'];
          });
          rows = r2.length ? table('info-table', ['Block', 'First', 'Last', 'Addresses', 'Netmask', 'Usable hosts'], r2) : null;
          st = [{ label: 'Blocks', value: String(items.length) }];
        } else {
          var list = mergeRanges(items), tests = read(input2.value, W), inside = 0;
          var r3 = tests.map(function (t) {
            var hit = items.filter(function (r) { return r.v === t.v && t.start >= r.start && t.end <= r.end; })[0];
            var covered = list.some(function (r) { return r.v === t.v && t.start >= r.start && t.end <= r.end; });
            var partly = !covered && list.some(function (r) { return r.v === t.v && t.start <= r.end && t.end >= r.start; });
            if (covered) inside++;
            lines.push(t.text + ': ' + (covered ? 'yes' : partly ? 'partly' : 'no'));
            return [t.text, el('b', { style: { color: covered ? 'var(--ok)' : partly ? 'var(--warn)' : 'var(--err)' }, text: covered ? 'Yes' : partly ? 'Partly' : 'No' }), hit ? hit.text : covered ? '(several entries together)' : '—'];
          });
          rows = r3.length ? table('contains-table', ['Tested', 'In the list?', 'Matched by'], r3) : null;
          st = [{ label: 'Tested', value: String(tests.length) }, { label: 'Inside', value: String(inside) }, { label: 'Outside', value: String(tests.length - inside) }];
        }
        out.textContent = lines.join('\n');
        tbl.replaceChildren(rows || '');
        stats.replaceChildren(U.stats(st));
        issueList(issues, W, 'All lines read.');
      }

      U.live([input, input2], run);
      root.appendChild(U.panel(null, mode, el('div', { class: 'field', style: { marginTop: '12px' } }, label1, input), box2,
        U.note('Accepts IPv4 and IPv6: single addresses, CIDR blocks (10.0.0.0/8, 2001:db8::/32) and ranges (a - b). Separate entries with new lines or commas.')));
      root.appendChild(stats);
      root.appendChild(U.panel('Result', out, U.btnrow(U.copyBtn('Copy', function () { return out.textContent; })), tbl));
      root.appendChild(U.panel('Notes', issues));
    }
  });
})();
