/* Network tools: URL parsing and building, IP/subnet maths, user agents,
   header reference, server config generators, and a few online lookups
   (IP info, DNS, WHOIS/RDAP, ping, speed test) against public keyless APIs. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  document.head.appendChild(el('style', { text: [
    '.g-net .kv{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}',
    '.g-net .kv > div{border:1px solid var(--border);border-radius:var(--radius);padding:8px 10px;background:var(--bg-sunken)}',
    '.g-net .kv b{display:block;font-size:12px;color:var(--fg-muted);font-weight:600;margin-bottom:2px}',
    '.g-net .kv code{font-family:var(--mono);word-break:break-all}',
    '.g-net .links{display:flex;flex-direction:column;gap:8px}',
    '.g-net .links a{display:flex;justify-content:space-between;gap:10px;border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px;text-decoration:none;color:var(--fg);background:var(--bg-elev)}',
    '.g-net .links a small{display:block;color:var(--fg-muted);font-family:var(--mono);word-break:break-all}',
    '.g-net .hdr{border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px;display:flex;justify-content:space-between;gap:10px;align-items:flex-start}',
    '.g-net .hdr b{font-family:var(--mono)}',
    '.g-net .hdrlist{display:flex;flex-direction:column;gap:6px}',
    '.g-net .pill{font-size:11px;padding:2px 8px;border-radius:10px;border:1px solid var(--border);white-space:nowrap}',
    '.g-net .param{display:flex;gap:8px;margin-bottom:6px;align-items:center}',
    '.g-net .rule{border:1px solid var(--border);border-radius:var(--radius);padding:10px;margin-bottom:10px}',
    '.g-net .rule header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}',
    '.g-net .switches{display:flex;flex-direction:column;gap:6px}',
    '.g-net .big{font-size:34px;font-weight:800}',
    '.g-net .ok{color:var(--ok)} .g-net .bad{color:var(--err)}',
    '.g-net .binary{font-family:var(--mono);font-size:13px;display:grid;grid-template-columns:80px 1fr;gap:4px 10px}',
    '.g-net .urlout{font-family:var(--mono);word-break:break-all;font-size:15px;padding:10px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-sunken)}'
  ].join('\n') }));

  function kv(pairs) {
    return el('div', { class: 'kv' }, pairs.map(function (p) {
      return el('div', { dataset: { key: p[0] } }, el('b', { text: p[0] }), el('code', { text: p[1] === undefined || p[1] === null || p[1] === '' ? '—' : String(p[1]) }));
    }));
  }

  function extLink(title, href, sub) {
    return el('a', { href: href, target: '_blank', rel: 'noopener noreferrer' },
      el('span', {}, el('b', { text: title }), el('small', { text: sub || href })), el('span', { text: '→' }));
  }

  function cleanHost(s) {
    return String(s || '').trim().replace(/^[a-z]+:\/\//i, '').replace(/[\/?#].*$/, '').replace(/:\d+$/, '').toLowerCase();
  }

  function fetchTimeout(url, opts, ms) {
    var ctl = new AbortController();
    var t = setTimeout(function () { ctl.abort(); }, ms || 10000);
    return fetch(url, Object.assign({ signal: ctl.signal, cache: 'no-store' }, opts || {})).finally(function () { clearTimeout(t); });
  }

  /* --- IP Address Info (online) ----------------------------------------------- */

  Tools.register({
    id: 'ip-address', category: 'network', name: 'IP Address Info',
    description: 'Show your public IP, or look up any IP, with location, ISP and time zone.',
    keywords: ['ip', 'my ip', 'geolocation', 'isp', 'lookup', 'whats my ip'],
    online: 'looks up IP addresses with ipapi.co',
    render: function (root) {
      root.classList.add('g-net');
      var input = el('input', { type: 'text', placeholder: 'Enter IP address (leave blank for your IP)' });
      var out = el('div', {}, U.note('Loading your IP info…'));
      var btn = U.button('Lookup', lookup, 'primary');

      function lookup() {
        var ip = input.value.trim();
        if (ip && !/^[0-9a-f:.]+$/i.test(ip)) { out.replaceChildren(U.note('Enter a valid IPv4 or IPv6 address.', 'err')); return; }
        out.replaceChildren(U.note(ip ? 'Looking up ' + ip + '…' : 'Loading your IP info…'));
        btn.disabled = true;
        fetchTimeout(ip ? 'https://ipapi.co/' + encodeURIComponent(ip) + '/json/' : 'https://ipapi.co/json/')
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (d.error) throw new Error(d.reason || 'Lookup failed');
            out.replaceChildren(
              el('div', { class: 'big', dataset: { out: 'ip' }, text: d.ip }),
              U.note((d.country_code || '') + ' · ' + (ip ? 'Looked-up IP' : 'Your IP')),
              kv([['Country', d.country_name ? d.country_name + ' (' + d.country_code + ')' : ''], ['Region', d.region], ['City', d.city],
                ['Postal code', d.postal], ['Organization / ISP', d.org], ['ASN', d.asn], ['Timezone', d.timezone],
                ['UTC offset', d.utc_offset], ['Currency', d.currency], ['Coordinates', d.latitude != null ? d.latitude + ', ' + d.longitude : ''],
                ['IP version', d.version], ['Network', d.network]]),
              U.btnrow(U.copyBtn('Copy IP', d.ip)));
          })
          .catch(function (e) {
            out.replaceChildren(U.note('Could not reach ipapi.co (' + (e.name === 'AbortError' ? 'timed out' : e.message) + '). Check your connection or try again in a minute — the free service is rate limited.', 'err'));
          })
          .then(function () { btn.disabled = false; });
      }
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') lookup(); });
      lookup();

      root.appendChild(U.panel('', U.row(el('div', { class: 'grow' }, input), btn)));
      root.appendChild(U.panel('', out));
    }
  });

  /* --- User Agent Parser --------------------------------------------------------- */

  var UA_BROWSERS = [
    [/Edg(?:e|A|iOS)?\/([\d.]+)/, 'Microsoft Edge'], [/OPR\/([\d.]+)/, 'Opera'], [/Opera[ \/]([\d.]+)/, 'Opera'],
    [/SamsungBrowser\/([\d.]+)/, 'Samsung Internet'], [/Vivaldi\/([\d.]+)/, 'Vivaldi'], [/YaBrowser\/([\d.]+)/, 'Yandex Browser'],
    [/UCBrowser\/([\d.]+)/, 'UC Browser'], [/Brave\/([\d.]+)/, 'Brave'], [/DuckDuckGo\/([\d.]+)/, 'DuckDuckGo'],
    [/Firefox\/([\d.]+)/, 'Mozilla Firefox'], [/FxiOS\/([\d.]+)/, 'Mozilla Firefox'],
    [/CriOS\/([\d.]+)/, 'Google Chrome'], [/HeadlessChrome\/([\d.]+)/, 'Headless Chrome'], [/Chrome\/([\d.]+)/, 'Google Chrome'],
    [/Version\/([\d.]+).*Safari/, 'Safari'], [/MSIE ([\d.]+)/, 'Internet Explorer'], [/Trident\/.*rv:([\d.]+)/, 'Internet Explorer'],
    [/(?:Googlebot|bingbot|DuckDuckBot|YandexBot|Baiduspider)\/?([\d.]*)/i, 'Bot / Crawler'],
    [/curl\/([\d.]+)/, 'curl'], [/Wget\/([\d.]+)/, 'Wget'], [/python-requests\/([\d.]+)/, 'Python Requests']
  ];
  var UA_OS = [
    [/Windows NT 10\.0/, 'Windows 10/11'], [/Windows NT 6\.3/, 'Windows 8.1'], [/Windows NT 6\.2/, 'Windows 8'],
    [/Windows NT 6\.1/, 'Windows 7'], [/Windows NT 6\.0/, 'Windows Vista'], [/Windows NT 5\.1/, 'Windows XP'],
    [/Windows Phone/, 'Windows Phone'], [/Windows/, 'Windows'],
    [/iPhone OS ([\d_]+)/, 'iOS'], [/iPad.*OS ([\d_]+)/, 'iPadOS'], [/Mac OS X ([\d_.]+)/, 'macOS'], [/Macintosh/, 'macOS'],
    [/CrOS/, 'Chrome OS'], [/Android ([\d.]+)/, 'Android'], [/Ubuntu/, 'Ubuntu'], [/Fedora/, 'Fedora'], [/Linux/, 'Linux']
  ];

  function parseUA(ua) {
    var r = { browser: 'Unknown', version: '—', os: 'Unknown', device: 'Desktop', engine: 'Unknown' };
    for (var i = 0; i < UA_BROWSERS.length; i++) {
      var m = ua.match(UA_BROWSERS[i][0]);
      if (m) { r.browser = UA_BROWSERS[i][1]; r.version = m[1] || '—'; break; }
    }
    for (var j = 0; j < UA_OS.length; j++) {
      var o = ua.match(UA_OS[j][0]);
      if (o) { r.os = UA_OS[j][1] + (o[1] ? ' ' + o[1].replace(/_/g, '.') : ''); break; }
    }
    if (/Trident|MSIE/.test(ua)) r.engine = 'Trident';
    else if (/EdgeHTML|Edge\//.test(ua)) r.engine = 'EdgeHTML';
    else if (/Gecko\//.test(ua) && !/like Gecko/.test(ua)) r.engine = 'Gecko';
    else if (/AppleWebKit/.test(ua)) r.engine = 'WebKit/Blink';
    else if (/Presto/.test(ua)) r.engine = 'Presto';
    if (/bot|crawler|spider|crawl|slurp/i.test(ua)) r.device = 'Bot';
    else if (/iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(ua)) r.device = 'Tablet';
    else if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua)) r.device = 'Mobile';
    else if (/SmartTV|SMART-TV|AppleTV|GoogleTV|HbbTV|\bTV\b/i.test(ua)) r.device = 'TV';
    return r;
  }

  Tools.register({
    id: 'user-agent', category: 'network', name: 'User Agent Parser',
    description: 'Decode a User-Agent string into browser, version, OS, device and engine.',
    keywords: ['user agent', 'ua', 'browser', 'detect', 'parse', 'os'],
    render: function (root) {
      root.classList.add('g-net');
      var input = el('textarea', { rows: 4, spellcheck: false, value: navigator.userAgent, style: { fontFamily: 'var(--mono)' } });
      var out = el('div');
      function run() {
        var ua = input.value.trim();
        if (!ua) { out.replaceChildren(U.note('Paste a User-Agent string.')); return; }
        var p = parseUA(ua);
        out.replaceChildren(kv([['Browser', p.browser], ['Version', p.version], ['Os', p.os], ['Device', p.device], ['Engine', p.engine]]));
      }
      input.addEventListener('input', run);
      run();
      root.appendChild(U.panel('User-Agent String', input, U.btnrow(U.button('Use My Browser UA', function () { input.value = navigator.userAgent; run(); }, 'primary'))));
      root.appendChild(U.panel('Parsed', out));
      root.appendChild(U.panel('Your current UA:', el('code', { style: { fontFamily: 'var(--mono)', wordBreak: 'break-all' }, text: navigator.userAgent })));
    }
  });

  /* --- HTTP Headers Info ----------------------------------------------------------- */

  var HEADERS = [
    ['Content-Type', 'Indicates the media type of the resource or data', 'Entity', 'Content-Type: application/json; charset=utf-8'],
    ['Authorization', 'Contains credentials to authenticate a request', 'Request', 'Authorization: Bearer <token>'],
    ['Cache-Control', 'Directives for caching in requests and responses', 'General', 'Cache-Control: max-age=3600, public'],
    ['Accept', 'Media types the client can understand', 'Request', 'Accept: text/html, application/json'],
    ['Accept-Encoding', 'Content encoding (compression) the client understands', 'Request', 'Accept-Encoding: gzip, deflate, br'],
    ['Accept-Language', 'Natural languages the client prefers', 'Request', 'Accept-Language: en-GB,en;q=0.9'],
    ['Access-Control-Allow-Origin', 'Indicates which origins can read the response (CORS)', 'Response', 'Access-Control-Allow-Origin: *'],
    ['Content-Length', 'Size of the message body in bytes', 'Entity', 'Content-Length: 348'],
    ['Content-Encoding', 'Encoding applied to the resource body', 'Entity', 'Content-Encoding: gzip'],
    ['Cookie', 'Previously set cookies sent back to server', 'Request', 'Cookie: session=abc123; theme=dark'],
    ['Set-Cookie', 'Send a cookie from server to client', 'Response', 'Set-Cookie: id=a3fWa; Secure; HttpOnly; SameSite=Lax'],
    ['ETag', 'Unique identifier for a resource version', 'Response', 'ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"'],
    ['Host', 'Specifies the host and port for the request', 'Request', 'Host: example.com'],
    ['If-Modified-Since', 'Returns 304 if resource unchanged since this date', 'Request', 'If-Modified-Since: Wed, 21 Oct 2015 07:28:00 GMT'],
    ['Last-Modified', 'Date/time the resource was last modified', 'Response', 'Last-Modified: Wed, 21 Oct 2015 07:28:00 GMT'],
    ['Location', 'URL to redirect a request to', 'Response', 'Location: https://example.com/new-page'],
    ['Origin', 'Indicates where a request originated from', 'Request', 'Origin: https://example.com'],
    ['Referer', 'Address of the page that linked to the current resource', 'Request', 'Referer: https://example.com/page'],
    ['Server', 'Server software information', 'Response', 'Server: nginx/1.25.3'],
    ['Strict-Transport-Security', 'Forces HTTPS, prevents protocol downgrade (HSTS)', 'Response', 'Strict-Transport-Security: max-age=31536000; includeSubDomains'],
    ['Transfer-Encoding', 'Form of encoding used to transfer the body', 'General', 'Transfer-Encoding: chunked'],
    ['User-Agent', 'Identifies the client application making the request', 'Request', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)'],
    ['Vary', 'Tells caches which headers affect the response', 'Response', 'Vary: Accept-Encoding'],
    ['WWW-Authenticate', 'Defines authentication method for protected resource', 'Response', 'WWW-Authenticate: Basic realm="Access to site"'],
    ['X-Content-Type-Options', 'Prevents MIME type sniffing', 'Response', 'X-Content-Type-Options: nosniff'],
    ['X-Frame-Options', 'Controls whether page can be loaded in iframe', 'Response', 'X-Frame-Options: DENY'],
    ['X-XSS-Protection', 'Legacy XSS filtering control', 'Response', 'X-XSS-Protection: 0'],
    ['Content-Security-Policy', 'Controls resources the browser is allowed to load', 'Response', "Content-Security-Policy: default-src 'self'"]
  ];

  Tools.register({
    id: 'http-headers', category: 'network', name: 'HTTP Headers Info',
    description: 'Browse and search common HTTP request, response, entity and general headers.',
    keywords: ['http', 'headers', 'reference', 'request', 'response', 'cors', 'cache-control'],
    render: function (root) {
      root.classList.add('g-net');
      var cat = 'All';
      var search = el('input', { type: 'text', placeholder: 'Search headers…' });
      var list = el('div', { class: 'hdrlist' });
      var count = U.note('');
      function draw() {
        var q = search.value.trim().toLowerCase();
        var hits = HEADERS.filter(function (h) {
          return (cat === 'All' || h[2] === cat) && (!q || h[0].toLowerCase().indexOf(q) > -1 || h[1].toLowerCase().indexOf(q) > -1);
        });
        count.textContent = hits.length + ' of ' + HEADERS.length + ' headers';
        list.replaceChildren.apply(list, hits.length ? hits.map(function (h) {
          return el('div', { class: 'hdr', dataset: { header: h[0] } },
            el('div', {}, el('b', { text: h[0] }), el('div', { text: h[1] }), el('code', { class: 'note', style: { fontFamily: 'var(--mono)' }, text: 'e.g. ' + h[3] })),
            el('span', { class: 'pill', text: h[2] }));
        }) : [U.note('No headers match.')]);
      }
      var chips = U.chips(['All', 'Request', 'Response', 'Entity', 'General'], function (v) { cat = v; draw(); }, 'All');
      search.addEventListener('input', draw);
      draw();
      root.appendChild(U.panel('', search, chips, count));
      root.appendChild(U.panel('', list));
    }
  });

  /* --- DNS Lookup (online) ---------------------------------------------------------- */

  var DNS_TYPES = { 1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 12: 'PTR', 15: 'MX', 16: 'TXT', 28: 'AAAA', 33: 'SRV', 257: 'CAA', 65: 'HTTPS' };
  var DNS_STATUS = { 1: 'Format error', 2: 'Server failure', 3: 'Domain does not exist (NXDOMAIN)', 4: 'Not implemented', 5: 'Refused' };

  function ptrName(s) {
    var v4 = s.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (v4) return [v4[4], v4[3], v4[2], v4[1]].join('.') + '.in-addr.arpa';
    return s;
  }

  Tools.register({
    id: 'dns-lookup', category: 'network', name: 'DNS Lookup',
    description: 'Query A, AAAA, MX, NS, TXT, CNAME, SOA and PTR records over DNS-over-HTTPS.',
    keywords: ['dns', 'lookup', 'records', 'mx', 'txt', 'nameserver', 'a record', 'doh'],
    online: 'looks up DNS records with Cloudflare DNS-over-HTTPS',
    render: function (root) {
      root.classList.add('g-net');
      var domain = el('input', { type: 'text', placeholder: 'example.com', value: 'example.com' });
      var type = U.select({ options: ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA', 'PTR'], value: 'A' });
      var out = el('div', {}, U.note('Enter a domain name and select record type, then click Lookup. Uses Cloudflare 1.1.1.1 DNS over HTTPS.'));
      var btn = U.button('Lookup', lookup, 'primary');
      function lookup() {
        var name = cleanHost(domain.value);
        if (!name) { out.replaceChildren(U.note('Enter a domain name.', 'err')); return; }
        if (type.value === 'PTR') name = ptrName(name);
        out.replaceChildren(U.note('Querying ' + name + ' ' + type.value + '…'));
        btn.disabled = true;
        fetchTimeout('https://cloudflare-dns.com/dns-query?name=' + encodeURIComponent(name) + '&type=' + type.value, { headers: { accept: 'application/dns-json' } })
          .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
          .then(function (d) {
            var ans = (d.Answer || []);
            var head = el('div', {}, el('b', { text: name }), U.note(type.value + ' records · ' + ans.length + ' result' + (ans.length === 1 ? '' : 's')));
            if (d.Status && d.Status !== 0) { out.replaceChildren(head, U.note(DNS_STATUS[d.Status] || ('DNS status ' + d.Status), 'err')); return; }
            if (!ans.length) { out.replaceChildren(head, U.note('No ' + type.value + ' records found.')); return; }
            out.replaceChildren(head, U.table(['Name', 'Type', 'TTL', 'Data'], ans.map(function (a) {
              return [a.name.replace(/\.$/, ''), DNS_TYPES[a.type] || String(a.type), a.TTL + 's', a.data];
            })));
          })
          .catch(function (e) { out.replaceChildren(U.note('DNS query failed: ' + (e.name === 'AbortError' ? 'timed out' : e.message) + '. Check your internet connection.', 'err')); })
          .then(function () { btn.disabled = false; });
      }
      domain.addEventListener('keydown', function (e) { if (e.key === 'Enter') lookup(); });
      root.appendChild(U.panel('', U.row(el('div', { class: 'grow' }, domain), type, btn)));
      root.appendChild(U.panel('Results', out));
    }
  });

  /* --- WHOIS Lookup (online, RDAP) ------------------------------------------------------ */

  function rdapSummary(d) {
    var ev = {};
    (d.events || []).forEach(function (e) { ev[e.eventAction] = e.eventDate; });
    var registrar = '';
    (d.entities || []).forEach(function (e) {
      if ((e.roles || []).indexOf('registrar') > -1) {
        var fn = ((e.vcardArray || [])[1] || []).filter(function (v) { return v[0] === 'fn'; })[0];
        registrar = fn ? fn[3] : (e.handle || '');
      }
    });
    function day(s) { return s ? s.slice(0, 10) : ''; }
    return [
      ['Domain', (d.ldhName || d.handle || '').toLowerCase()], ['Registrar', registrar],
      ['Registered', day(ev.registration)], ['Expires', day(ev.expiration)], ['Last changed', day(ev['last changed'])],
      ['Status', (d.status || []).join(', ')], ['Name servers', (d.nameservers || []).map(function (n) { return (n.ldhName || '').toLowerCase(); }).join(', ')],
      ['DNSSEC', d.secureDNS ? (d.secureDNS.delegationSigned ? 'signed' : 'unsigned') : ''],
      ['Network', d.startAddress ? d.startAddress + ' – ' + d.endAddress : ''], ['Name', d.name], ['Country', d.country]
    ].filter(function (p) { return p[1]; });
  }

  Tools.register({
    id: 'whois-lookup', category: 'network', name: 'WHOIS Lookup',
    description: 'Look up domain registration details via RDAP, with links to trusted WHOIS services.',
    keywords: ['whois', 'domain', 'registrar', 'expiry', 'rdap', 'registration'],
    online: 'queries domain registration data from rdap.org',
    render: function (root) {
      root.classList.add('g-net');
      var input = el('input', { type: 'text', placeholder: 'example.com', value: 'example.com' });
      var tld = el('span', { class: 'pill' });
      var links = el('div', { class: 'links' });
      var rdap = el('div');
      function update() {
        var d = cleanHost(input.value) || 'example.com';
        var m = d.match(/(\.[a-z0-9-]+)$/i);
        tld.textContent = /^[\d.]+$/.test(d) ? 'IP' : (m ? m[1] : '');
        var q = encodeURIComponent(d);
        links.replaceChildren(
          extLink('ICANN Lookup', 'https://lookup.icann.org/lookup?name=' + q),
          extLink('DomainTools', 'https://whois.domaintools.com/' + q),
          extLink('Who.is', 'https://who.is/whois/' + q),
          extLink('ARIN (IP/ASN)', 'https://search.arin.net/rdap/?query=' + q));
      }
      function lookup() {
        update();
        var d = cleanHost(input.value);
        if (!d) { rdap.replaceChildren(U.note('Enter a domain or IP.', 'err')); return; }
        var isIp = /^[\d.]+$/.test(d) || d.indexOf(':') > -1;
        rdap.replaceChildren(U.note('Querying RDAP for ' + d + '…'));
        fetchTimeout('https://rdap.org/' + (isIp ? 'ip/' : 'domain/') + encodeURIComponent(d), { headers: { accept: 'application/rdap+json, application/json' } }, 15000)
          .then(function (r) { if (r.status === 404) throw new Error('No registration record found for ' + d); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
          .then(function (j) { rdap.replaceChildren(kv(rdapSummary(j))); })
          .catch(function (e) { rdap.replaceChildren(U.note('RDAP lookup failed: ' + (e.name === 'AbortError' ? 'timed out' : e.message) + '. Use one of the services below for full details.', 'err')); });
      }
      input.addEventListener('input', update);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') lookup(); });
      update();
      var quick = U.btnrow.apply(null, ['google.com', 'github.com', 'cloudflare.com', 'amazon.com', 'microsoft.com', 'example.com'].map(function (d) {
        return U.button(d, function () { input.value = d; lookup(); }, 'ghost');
      }));
      root.appendChild(U.panel('', U.row(el('div', { class: 'grow' }, input), U.button('Lookup', lookup, 'primary')), el('div', { class: 'row' }, el('span', { text: 'Quick:' }), quick)));
      root.appendChild(U.panel('Registration (RDAP)', el('div', {}, tld), rdap));
      root.appendChild(U.panel('Full WHOIS', U.note('WHOIS data requires a trusted registry lookup. Choose a service below to view full registration details.'), links));
      root.appendChild(U.panel('What WHOIS shows', el('ul', {},
        el('li', { text: 'Registrar name and registration date' }), el('li', { text: 'Expiry date and renewal information' }),
        el('li', { text: 'Name servers (DNS delegation)' }), el('li', { text: 'Registrant contact info (if not privacy-protected)' }))));
    }
  });

  /* --- Port Scanner / reference -------------------------------------------------------- */

  var PORTS = [
    [21, 'FTP', 'File Transfer Protocol'], [22, 'SSH', 'Secure Shell'], [23, 'Telnet', 'Telnet (insecure)'],
    [25, 'SMTP', 'Simple Mail Transfer'], [53, 'DNS', 'Domain Name System'], [80, 'HTTP', 'Web (unencrypted)'],
    [110, 'POP3', 'Post Office Protocol 3'], [143, 'IMAP', 'Internet Message Access'], [443, 'HTTPS', 'Web (encrypted)'],
    [3306, 'MySQL', 'MySQL Database'], [3389, 'RDP', 'Remote Desktop Protocol'], [5432, 'PostgreSQL', 'PostgreSQL Database'],
    [6379, 'Redis', 'Redis Cache'], [8080, 'HTTP-Alt', 'Alternate HTTP port'], [27017, 'MongoDB', 'MongoDB Database']
  ];

  Tools.register({
    id: 'port-checker', category: 'network', name: 'Port Reference',
    description: 'Common port reference with ready-made links to external open-port checkers.',
    keywords: ['port', 'scanner', 'open port', 'tcp', 'firewall', 'reference'],
    render: function (root) {
      root.classList.add('g-net');
      var host = el('input', { type: 'text', placeholder: 'hostname or IP' });
      var port = el('input', { type: 'number', placeholder: 'Port', min: 1, max: 65535 });
      var ports = [];
      var list = el('div', { class: 'links' });
      var status = U.note('');
      function draw() {
        var h = cleanHost(host.value);
        var links = [];
        (ports.length ? ports : [0]).forEach(function (p) {
          var hp = encodeURIComponent(h || ''), pp = p || '';
          var svc = PORTS.filter(function (x) { return x[0] === p; })[0];
          var label = p ? 'Port ' + p + (svc ? ' (' + svc[1] + ')' : '') + ' — ' : '';
          links.push(extLink(label + 'YouGetSignal', 'https://www.yougetsignal.com/tools/open-ports/?remoteAddress=' + hp + '&portNumber=' + pp));
          links.push(extLink(label + 'CanYouSeeMe.org', 'https://canyouseeme.org/?action=check&port=' + pp, 'checks your own public IP'));
        });
        list.replaceChildren.apply(list, links);
        status.textContent = ports.length ? 'Ports to check: ' + ports.join(', ') : '';
      }
      function add(p) {
        p = parseInt(p, 10);
        if (!(p >= 1 && p <= 65535)) { status.className = 'note err'; status.textContent = 'Ports run from 1 to 65535.'; return; }
        status.className = 'note';
        if (ports.indexOf(p) === -1) ports.push(p);
        draw();
      }
      host.addEventListener('input', draw);
      draw();
      root.appendChild(U.panel('', U.row(el('div', { class: 'grow' }, host), port,
        U.button('Add', function () { add(port.value); port.value = ''; }, 'primary'),
        U.button('All Common', function () { ports = PORTS.map(function (p) { return p[0]; }); draw(); }, 'ghost'),
        U.button('Clear', function () { ports = []; draw(); }, 'ghost')), status,
        el('p', { class: 'note', text: 'ℹ Browser security prevents direct TCP port scanning. Use the external tools below or server-side utilities like nmap for actual port checks.' })));
      root.appendChild(U.panel('External checkers', list));
      root.appendChild(U.panel('Common Port Reference', U.table(['Port', 'Service', 'Description'], PORTS.map(function (p) {
        return [el('button', { class: 'btn ghost mini', text: String(p[0]), onclick: function () { add(p[0]); } }), p[1], p[2]];
      }))));
    }
  });

  /* --- Ping Test (online) --------------------------------------------------------------- */

  Tools.register({
    id: 'ping-tool', category: 'network', name: 'Ping Test',
    description: 'Measure HTTP round-trip time and reachability for a website from your browser.',
    keywords: ['ping', 'latency', 'reachability', 'response time', 'uptime'],
    online: 'times HTTP requests to the host you enter',
    render: function (root) {
      root.classList.add('g-net');
      var host = el('input', { type: 'text', placeholder: 'google.com or IP', value: 'google.com' });
      var stats = el('div');
      var log = el('div');
      var status = U.note('');
      var results = [], busy = false, stopped = false;
      var btn = U.button('Ping', function () { run(cleanHost(host.value)); }, 'primary');

      function drawStats() {
        var ok = results.filter(function (r) { return r.ok; }).map(function (r) { return r.ms; });
        var loss = results.length ? Math.round((results.length - ok.length) / results.length * 100) : 0;
        stats.replaceChildren(U.stats([
          { value: ok.length ? Math.round(ok.reduce(function (a, b) { return a + b; }, 0) / ok.length) + 'ms' : '—', label: 'Avg Latency' },
          { value: ok.length ? Math.min.apply(null, ok) + 'ms' : '—', label: 'Min' },
          { value: ok.length ? Math.max.apply(null, ok) + 'ms' : '—', label: 'Max' },
          { value: loss + '%', label: 'Packet Loss' }]));
        log.replaceChildren(U.table(['Time', 'Host', 'Latency', 'Status'], results.slice().reverse().map(function (r) {
          return [r.time, r.host, r.ok ? r.ms + 'ms' : '—', el('span', { class: r.ok ? 'ok' : 'bad', text: r.ok ? 'ok' : r.err })];
        })));
      }

      function once(h) {
        var t0 = performance.now();
        return fetchTimeout('https://' + h + '/?_=' + Date.now(), { mode: 'no-cors' }, 5000)
          .then(function () { return { ok: true, ms: Math.round(performance.now() - t0) }; },
            function (e) { return { ok: false, err: e.name === 'AbortError' ? 'timeout' : 'unreachable' }; });
      }

      function run(h) {
        if (busy) return;
        if (!h || !/^[a-z0-9.-]+$|^\[[0-9a-f:]+\]$/i.test(h)) { status.className = 'note err'; status.textContent = 'Enter a valid host name or IP.'; return; }
        busy = true; stopped = false; btn.disabled = true;
        status.className = 'note';
        var i = 0;
        (function next() {
          if (stopped || i >= 4) { busy = false; btn.disabled = false; status.textContent = stopped ? '' : 'Done — 4 requests to ' + h; return; }
          i++;
          status.textContent = 'Pinging ' + i + '/4…';
          once(h).then(function (r) {
            r.host = h; r.time = new Date().toLocaleTimeString();
            results.push(r); drawStats();
            setTimeout(next, 1000);
          });
        })();
      }
      U.onTeardown(root, function () { stopped = true; });

      var quick = U.btnrow.apply(null, ['google.com', 'github.com', 'cloudflare.com', 'amazon.com', '1.1.1.1'].map(function (d) {
        return U.button(d, function () { host.value = d; run(d); }, 'ghost');
      }));
      drawStats();
      root.appendChild(U.panel('', el('p', { class: 'note', text: 'ℹ Browser ping uses HTTP fetch (no-cors), not ICMP. Results show HTTP reachability and latency, not raw network ping.' }),
        U.row(el('div', { class: 'grow' }, host), btn, U.button('Clear', function () { results = []; drawStats(); status.textContent = ''; }, 'ghost')),
        el('div', { class: 'row' }, el('span', { text: 'Quick test:' }), quick), status));
      root.appendChild(U.panel('Results', stats, log));
    }
  });

  /* --- SSL Checker --------------------------------------------------------------------- */

  Tools.register({
    id: 'ssl-checker', category: 'network', name: 'SSL Checker',
    description: 'Check this connection and open trusted SSL/TLS analysers for any domain.',
    keywords: ['ssl', 'tls', 'certificate', 'https', 'hsts', 'security headers'],
    render: function (root) {
      root.classList.add('g-net');
      var input = el('input', { type: 'text', placeholder: 'example.com', value: 'example.com' });
      var links = el('div', { class: 'links' });
      function draw() {
        var d = encodeURIComponent(cleanHost(input.value) || 'example.com');
        links.replaceChildren(
          extLink('SSL Labs (Qualys)', 'https://www.ssllabs.com/ssltest/analyze.html?d=' + d + '&latest', 'Comprehensive SSL/TLS analysis and grading'),
          extLink('SSL Shopper', 'https://www.sslshopper.com/ssl-checker.html#hostname=' + d, 'Quick SSL certificate checker'),
          extLink('DigiCert SSL Tools', 'https://www.digicert.com/help/', 'Certificate installer check'),
          extLink('SecurityHeaders.com', 'https://securityheaders.com/?q=' + d, 'HTTP security headers analysis'));
      }
      input.addEventListener('input', draw);
      draw();
      var secure = location.protocol === 'https:';
      var local = /^(localhost|127\.|\[::1\])/.test(location.hostname);
      root.appendChild(U.panel('', el('div', { class: secure || local ? 'ok' : 'bad' },
        el('b', { text: (secure ? '✓' : local ? '✓' : '✗') + " This site's connection" }),
        el('div', { text: 'Protocol: ' + location.protocol.replace(':', '') + ' (' + (secure ? 'HTTPS' : 'HTTP') + ') · Host: ' + (location.host || 'local file') +
          (local && !secure ? ' — local connections never leave this computer' : '') }))));
      root.appendChild(U.panel('Check SSL with trusted services', input, links));
      root.appendChild(U.panel('What to check in an SSL audit', U.table(['Check', 'What to look for'], [
        ['Certificate Validity', "Check if the certificate is issued by a trusted CA and hasn't expired."],
        ['TLS Version', 'Ensure TLS 1.2 or 1.3 is used. TLS 1.0 and 1.1 are deprecated and insecure.'],
        ['Cipher Suites', 'Strong ciphers like AES-256-GCM and ChaCha20-Poly1305 are recommended.'],
        ['HSTS Header', 'HTTP Strict Transport Security forces HTTPS connections for returning visitors.'],
        ['Certificate Chain', 'The full certificate chain must be properly installed, including intermediate certs.'],
        ['Subject Alternative Names', 'Ensure all domain variants (www, non-www) are covered by the certificate.']
      ])));
    }
  });

  /* --- Htaccess Generator ----------------------------------------------------------- */

  function htaccess(domain, o) {
    var d = domain.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '') || 'example.com';
    var out = ['# .htaccess - Generated by All The Tools', ''];
    if (o.https) out.push('# Force HTTPS', 'RewriteEngine On', 'RewriteCond %{HTTPS} off', 'RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]', '');
    if (o.www) out.push('# Force www', 'RewriteEngine On', 'RewriteCond %{HTTP_HOST} !^www\\. [NC]', 'RewriteRule ^(.*)$ https://www.' + d + '/$1 [L,R=301]', '');
    if (o.nowww) out.push('# Remove www', 'RewriteEngine On', 'RewriteCond %{HTTP_HOST} ^www\\.(.+)$ [NC]', 'RewriteRule ^(.*)$ https://%1/$1 [L,R=301]', '');
    if (o.noindex) out.push('# Disable directory listing', 'Options -Indexes', '');
    if (o.gzip) out.push('# Enable Gzip Compression', '<IfModule mod_deflate.c>',
      '  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json', '</IfModule>', '');
    if (o.cache) out.push('# Browser Caching', '<IfModule mod_expires.c>', '  ExpiresActive On',
      '  ExpiresByType image/jpeg "access plus 1 year"', '  ExpiresByType image/png "access plus 1 year"',
      '  ExpiresByType image/gif "access plus 1 year"', '  ExpiresByType image/webp "access plus 1 year"',
      '  ExpiresByType text/css "access plus 1 month"', '  ExpiresByType application/javascript "access plus 1 month"', '</IfModule>', '');
    if (o.errors) out.push('# Custom Error Pages', 'ErrorDocument 404 /404.html', 'ErrorDocument 500 /500.html', 'ErrorDocument 403 /403.html', '');
    return out.join('\n');
  }

  Tools.register({
    id: 'htaccess-generator', category: 'network', name: '.htaccess Generator',
    description: 'Generate Apache .htaccess rules for HTTPS, www, compression, caching and error pages.',
    keywords: ['htaccess', 'apache', 'redirect', 'https', 'gzip', 'cache', 'rewrite'],
    render: function (root) {
      root.classList.add('g-net');
      var domain = el('input', { type: 'text', value: 'example.com' });
      var defs = [['https', 'Force HTTPS redirect', true], ['www', 'Force www redirect', false], ['nowww', 'Remove www', false],
        ['gzip', 'Enable Gzip compression', true], ['cache', 'Browser cache control', true], ['errors', 'Custom error pages', true], ['noindex', 'Disable directory listing', true]];
      var boxes = {};
      var switches = el('div', { class: 'switches' }, defs.map(function (d) {
        var c = U.checkbox(d[1], { checked: d[2], role: 'switch' });
        c.dataset.opt = d[0];
        boxes[d[0]] = c.input;
        return c;
      }));
      var out = el('textarea', { rows: 22, spellcheck: false, style: { fontFamily: 'var(--mono)', fontSize: '13px' } });
      function run() {
        var o = {};
        Object.keys(boxes).forEach(function (k) { o[k] = boxes[k].checked; });
        out.value = htaccess(domain.value, o);
      }
      /* www and non-www redirects contradict each other. */
      boxes.www.addEventListener('change', function () { if (boxes.www.checked) boxes.nowww.checked = false; run(); });
      boxes.nowww.addEventListener('change', function () { if (boxes.nowww.checked) boxes.www.checked = false; run(); });
      Object.keys(boxes).forEach(function (k) { boxes[k].addEventListener('change', run); });
      domain.addEventListener('input', run);
      run();
      root.appendChild(U.split(U.panel('Options', U.field('Domain', domain), switches),
        U.panel('.htaccess Output', out, U.btnrow(U.copyBtn('Copy', function () { return out.value; }),
          U.downloadBtn('Download', '.htaccess', function () { return out.value; })))));
    }
  });

  /* --- Robots.txt Generator ----------------------------------------------------------- */

  Tools.register({
    id: 'robots-txt', category: 'seo', name: 'robots.txt Generator',
    description: 'Build a robots.txt with per-crawler allow and disallow rules, crawl delay and sitemap.',
    keywords: ['robots.txt', 'crawler', 'seo', 'googlebot', 'disallow', 'sitemap'],
    render: function (root) {
      root.classList.add('g-net');
      var sitemap = el('input', { type: 'text', value: 'https://example.com/sitemap.xml' });
      var delay = el('input', { type: 'number', min: 0 });
      var rules = [{ agent: '*', allow: '/', disallow: '/admin/\n/private/' }, { agent: 'Googlebot', allow: '/', disallow: '' }];
      var rulesBox = el('div');
      var out = el('textarea', { rows: 16, spellcheck: false, style: { fontFamily: 'var(--mono)' } });

      function lines(s) { return s.split('\n').map(function (l) { return l.trim(); }).filter(Boolean); }
      function build() {
        var d = delay.value.trim();
        var blocks = rules.map(function (r) {
          var b = ['User-agent: ' + (r.agent.trim() || '*')];
          lines(r.allow).forEach(function (p) { b.push('Allow: ' + p); });
          lines(r.disallow).forEach(function (p) { b.push('Disallow: ' + p); });
          if (d && +d > 0) b.push('Crawl-delay: ' + d);
          return b.join('\n');
        });
        if (sitemap.value.trim()) blocks.push('Sitemap: ' + sitemap.value.trim());
        out.value = blocks.join('\n\n');
      }
      function drawRules() {
        rulesBox.replaceChildren.apply(rulesBox, rules.map(function (r, i) {
          var agent = el('input', { type: 'text', placeholder: 'User-agent (e.g. * or Googlebot)', value: r.agent });
          var allow = el('textarea', { rows: 3, placeholder: 'Allow paths (one per line)', value: r.allow });
          var dis = el('textarea', { rows: 3, placeholder: 'Disallow paths (one per line)', value: r.disallow });
          agent.addEventListener('input', function () { r.agent = agent.value; build(); });
          allow.addEventListener('input', function () { r.allow = allow.value; build(); });
          dis.addEventListener('input', function () { r.disallow = dis.value; build(); });
          return el('div', { class: 'rule' }, el('header', {}, el('b', { text: 'Rule ' + (i + 1) }),
            U.button('Remove', function () { rules.splice(i, 1); drawRules(); build(); }, 'ghost')),
            agent, U.split(allow, dis));
        }));
      }
      sitemap.addEventListener('input', build);
      delay.addEventListener('input', build);
      drawRules(); build();
      root.appendChild(U.panel('Settings', U.field('Sitemap URL', sitemap), U.field('Crawl Delay (seconds, optional)', delay)));
      root.appendChild(U.panel('Rules', rulesBox, U.btnrow(U.button('+ Add Rule', function () {
        rules.push({ agent: '*', allow: '', disallow: '' }); drawRules(); build();
      }, 'ghost'))));
      root.appendChild(U.panel('robots.txt Output', out, U.btnrow(U.copyBtn('Copy', function () { return out.value; }),
        U.downloadBtn('Download', 'robots.txt', function () { return out.value; }))));
    }
  });

  /* --- IP Subnet Calculator -------------------------------------------------------------- */

  function parseIPv4(t) {
    var p = String(t).trim().split('.');
    if (p.length !== 4) return null;
    var o = [];
    for (var i = 0; i < 4; i++) {
      if (!/^\d{1,3}$/.test(p[i]) || +p[i] > 255) return null;
      o.push(+p[i]);
    }
    return o;
  }
  function toLong(o) { return ((o[0] * 16777216) + (o[1] * 65536) + (o[2] * 256) + o[3]) >>> 0; }
  function fromLong(v) { v >>>= 0; return [v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]; }
  function dotted(o) { return o.join('.'); }
  function bin(o) { return o.map(function (x) { return x.toString(2).padStart(8, '0'); }).join('.'); }

  function subnet(ip, cidr) {
    var o = parseIPv4(ip);
    if (!o) throw new Error('Enter a valid IPv4 address, e.g. 192.168.1.100');
    if (!(cidr >= 0 && cidr <= 32) || Math.floor(cidr) !== cidr) throw new Error('CIDR must be a whole number from 0 to 32.');
    var mask = cidr === 0 ? 0 : (0xFFFFFFFF << (32 - cidr)) >>> 0;
    var addr = toLong(o), net = (addr & mask) >>> 0, bc = (net | (~mask >>> 0)) >>> 0;
    var usable = cidr === 32 ? 1 : cidr === 31 ? 2 : Math.pow(2, 32 - cidr) - 2;
    var first = cidr >= 31 ? net : net + 1, last = cidr >= 31 ? bc : bc - 1;
    var cls = o[0] < 128 ? 'Class A' : o[0] < 192 ? 'Class B' : o[0] < 224 ? 'Class C' : o[0] < 240 ? 'Class D (Multicast)' : 'Class E (Reserved)';
    return {
      ip: dotted(o), mask: dotted(fromLong(mask)), cidr: dotted(o) + '/' + cidr, network: dotted(fromLong(net)),
      broadcast: dotted(fromLong(bc)), first: dotted(fromLong(first)), last: dotted(fromLong(last)), usable: usable,
      total: Math.pow(2, 32 - cidr), wildcard: dotted(fromLong(~mask >>> 0)), cls: cls,
      binIp: bin(o), binMask: bin(fromLong(mask)), binNet: bin(fromLong(net))
    };
  }

  Tools.register({
    id: 'ip-subnet-calc', category: 'network', name: 'IP Subnet Calculator',
    description: 'Work out the network, broadcast, host range and mask for an IPv4 address and CIDR.',
    keywords: ['subnet', 'cidr', 'netmask', 'ipv4', 'broadcast', 'network', 'hosts'],
    render: function (root) {
      root.classList.add('g-net');
      var ip = el('input', { type: 'text', placeholder: '192.168.1.0', value: '192.168.1.100' });
      var cidr = el('input', { type: 'number', min: 0, max: 32, value: 24 });
      var out = el('div');
      function calc() {
        var r;
        try { r = subnet(ip.value, parseInt(cidr.value, 10)); }
        catch (e) { out.replaceChildren(U.note(e.message, 'err')); return; }
        out.replaceChildren(kv([['IP Address', r.ip], ['Subnet Mask', r.mask], ['CIDR Notation', r.cidr], ['Network Address', r.network],
          ['Broadcast Address', r.broadcast], ['First Host', r.first], ['Last Host', r.last], ['Usable Hosts', r.usable.toLocaleString('en-US')],
          ['Total Addresses', r.total.toLocaleString('en-US')], ['Wildcard Mask', r.wildcard], ['IP Class', r.cls]]),
          el('h3', { text: 'Binary Representation' }),
          el('div', { class: 'binary' }, el('b', { text: 'IP:' }), el('span', { text: r.binIp }), el('b', { text: 'Subnet:' }), el('span', { text: r.binMask }),
            el('b', { text: 'Network:' }), el('span', { text: r.binNet })));
      }
      [ip, cidr].forEach(function (n) { n.addEventListener('keydown', function (e) { if (e.key === 'Enter') calc(); }); });
      var chips = U.btnrow.apply(null, [8, 16, 24, 25, 26, 27, 28, 29, 30].map(function (n) {
        return U.button('/' + n, function () { cidr.value = n; calc(); }, 'ghost');
      }));
      calc();
      root.appendChild(U.panel('', U.row(U.field('IP Address', ip), U.field('CIDR (/)', cidr), U.button('Calculate', calc, 'primary')), chips));
      root.appendChild(U.panel('Result', out));
    }
  });

  /* --- URL Builder & Parser -------------------------------------------------------------- */

  /* The old URL Parser lives on here: pasting a URL splits it into the
     builder fields, and the Components panel lists every part of the URL the
     builder produces, down to userinfo, port and a decoded query table. */
  var URL_SCHEMES = ['https', 'http', 'ftp', 'ws', 'wss'];
  var DEFAULT_PORTS = { http: '80', https: '443', ftp: '21', ws: '80', wss: '443' };

  function decodeSafe(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }

  /* Reads text as a URL the way people paste them: a scheme is optional
     ("example.com/x" means https), but "localhost:8080" is a host and port,
     not a scheme called localhost. */
  function readUrl(raw) {
    var m = /^([a-z][a-z0-9+.-]*):(.*)$/i.exec(raw);
    var hasScheme = m && !/^\d/.test(m[2]);
    try { return { url: new URL(hasScheme ? raw : 'https://' + raw), assumed: !hasScheme }; }
    catch (e) { return null; }
  }

  function queryRows(search) {
    var raw = search.replace(/^\?/, '');
    if (!raw) return [];
    var seen = Object.create(null);
    return raw.split('&').filter(Boolean).map(function (pair, i) {
      var eq = pair.indexOf('=');
      var k = eq > -1 ? pair.slice(0, eq) : pair, v = eq > -1 ? pair.slice(eq + 1) : '';
      /* URLSearchParams rules: "+" is a space in query strings */
      var key = decodeSafe(k.replace(/\+/g, ' ')), value = decodeSafe(v.replace(/\+/g, ' '));
      seen[key] = (seen[key] || 0) + 1;
      return { n: i + 1, key: key, value: value, raw: pair, hasEq: eq > -1 };
    }).map(function (r) { r.repeated = seen[r.key] > 1; return r; });
  }

  Tools.register({
    id: 'url-builder', category: 'network', name: 'URL Builder & Parser',
    description: 'Build a URL from scheme, userinfo, host, port, path, query parameters and fragment, or paste one to split it into every component with a decoded query table.',
    keywords: ['url', 'builder', 'parser', 'url parser', 'parse', 'query string', 'query', 'parameters', 'uri', 'utm', 'encode', 'decode',
      'link', 'analyze', 'analyse', 'components', 'port', 'userinfo', 'username', 'password', 'fragment', 'hash', 'origin', 'split url'],
    render: function (root) {
      root.classList.add('g-net');
      var scheme = U.select({ options: URL_SCHEMES, value: 'https' });
      var host = el('input', { type: 'text', value: 'example.com', placeholder: 'example.com', spellcheck: false });
      var port = el('input', { type: 'text', inputMode: 'numeric', placeholder: 'default', spellcheck: false });
      var user = el('input', { type: 'text', placeholder: 'optional', spellcheck: false, autocomplete: 'off' });
      var pass = el('input', { type: 'text', placeholder: 'optional', spellcheck: false, autocomplete: 'off' });
      var path = el('input', { type: 'text', value: '/api/users', placeholder: '/path', spellcheck: false });
      var frag = el('input', { type: 'text', placeholder: 'section-id', spellcheck: false });
      var params = [{ k: 'page', v: '1' }, { k: 'limit', v: '20' }];
      var box = el('div');
      var out = el('div', { class: 'urlout', dataset: { out: 'url' } });
      var buildNote = U.note('');
      var parseIn = el('input', { type: 'text', placeholder: 'Paste a URL to split it into the fields below', spellcheck: false });
      var parseStatus = U.note('');
      var parts = el('div', { dataset: { k: 'parts' } });
      var paramBox = el('div', { dataset: { k: 'params' } });

      function build() {
        var h = host.value.trim().replace(/^[a-z]+:\/\//i, '').replace(/\/.*$/, '');
        var p = path.value.trim();
        if (p && p[0] !== '/') p = '/' + p;
        p = p.split('/').map(function (seg) { return encodeURIComponent(decodeSafe(seg)); }).join('/');
        var q = params.filter(function (x) { return x.k.trim(); }).map(function (x) {
          return encodeURIComponent(x.k.trim()) + '=' + encodeURIComponent(x.v);
        }).join('&');
        var auth = '';
        if (user.value || pass.value) auth = encodeURIComponent(user.value) + (pass.value ? ':' + encodeURIComponent(pass.value) : '') + '@';
        var pt = port.value.trim();
        var notes = [];
        if (pt && !(/^\d{1,5}$/.test(pt) && +pt <= 65535)) { notes.push('The port must be a number from 0 to 65535.'); pt = ''; }
        if (pt && DEFAULT_PORTS[scheme.value] === String(+pt)) notes.push(pt + ' is the default port for ' + scheme.value + ', so browsers drop it from the URL.');
        if (pass.value) notes.push('A password in a URL is visible to anyone who sees the link, and browsers strip or warn about it.');
        var url = scheme.value + '://' + auth + h + (pt ? ':' + pt : '') + p + (q ? '?' + q : '') + (frag.value.trim() ? '#' + encodeURIComponent(frag.value.trim().replace(/^#/, '')) : '');
        out.textContent = url;
        buildNote.textContent = notes.join(' ');
        analyse(url);
        return url;
      }

      function analyse(text) {
        var u;
        try { u = new URL(text); } catch (e) {
          parts.replaceChildren(U.note('Not a complete URL yet: add a host.', 'err'));
          paramBox.replaceChildren();
          return;
        }
        var sch = u.protocol.replace(/:$/, '');
        parts.replaceChildren(kv([
          ['Protocol', sch], ['Username', decodeSafe(u.username)], ['Password', decodeSafe(u.password)],
          ['Host', u.host], ['Hostname', u.hostname],
          ['Port', u.port || (DEFAULT_PORTS[sch] ? '(default ' + DEFAULT_PORTS[sch] + ')' : '(default)')],
          ['Origin', u.origin === 'null' ? '(opaque)' : u.origin], ['Pathname', u.pathname], ['Path (decoded)', decodeSafe(u.pathname)],
          ['Query String', u.search], ['Fragment', u.hash]
        ]));
        var rows = queryRows(u.search);
        paramBox.replaceChildren(rows.length ? el('div', { class: 'scroll' }, U.table(['#', 'Key', 'Value (decoded)', 'Raw'], rows.map(function (r) {
          return [String(r.n), r.key + (r.repeated ? ' (repeated)' : ''), r.hasEq ? r.value : '(no value)', r.raw];
        }))) : U.note('No query parameters.'));
      }

      function drawParams() {
        box.replaceChildren.apply(box, params.map(function (x, i) {
          var k = el('input', { type: 'text', placeholder: 'key', value: x.k, spellcheck: false });
          var v = el('input', { type: 'text', placeholder: 'value', value: x.v, spellcheck: false });
          k.addEventListener('input', function () { x.k = k.value; build(); });
          v.addEventListener('input', function () { x.v = v.value; build(); });
          var rm = U.button('✕', function () { params.splice(i, 1); drawParams(); build(); }, 'ghost');
          rm.setAttribute('aria-label', 'Remove parameter');
          return el('div', { class: 'param' }, k, v, rm);
        }));
      }

      function parseInto() {
        var raw = parseIn.value.trim();
        if (!raw) { parseStatus.className = 'note'; parseStatus.textContent = ''; build(); return; }
        var got = readUrl(raw);
        if (!got) { parseStatus.className = 'note err'; parseStatus.textContent = 'That is not a valid URL.'; return; }
        var u = got.url, sch = u.protocol.replace(':', '');
        if (!u.host) {
          /* mailto:, tel:, data: and friends have no host to build around */
          parseStatus.className = 'note';
          parseStatus.textContent = 'A ' + sch + ': URL has no host, so it cannot go into the builder; its parts are listed below.';
          analyse(u.href);
          return;
        }
        if (URL_SCHEMES.indexOf(sch) === -1 && !Array.prototype.some.call(scheme.options, function (o) { return o.value === sch; })) {
          scheme.appendChild(el('option', { value: sch, text: sch }));
        }
        scheme.value = sch;
        host.value = u.hostname;
        port.value = u.port;
        user.value = decodeSafe(u.username);
        pass.value = decodeSafe(u.password);
        path.value = decodeSafe(u.pathname);
        params = queryRows(u.search).map(function (r) { return { k: r.key, v: r.value }; });
        frag.value = decodeSafe(u.hash.replace(/^#/, ''));
        drawParams();
        var rebuilt = build();
        parseStatus.className = 'note ok';
        parseStatus.textContent = (got.assumed ? 'No scheme given, so read as https://. ' : '') + 'Split into ' + params.length + ' parameter' + (params.length === 1 ? '' : 's') + '.' +
          (rebuilt !== u.href && rebuilt !== raw ? ' Rebuilt with normalised encoding: ' + rebuilt : '');
      }

      [scheme, host, port, user, pass, path, frag].forEach(function (n) { n.addEventListener('input', build); n.addEventListener('change', build); });
      parseIn.addEventListener('input', parseInto);
      drawParams(); build();

      root.appendChild(U.panel('Parse a URL', parseIn, parseStatus));
      root.appendChild(U.panel('Build', U.row(U.field('Scheme', scheme), el('div', { class: 'grow' }, U.field('Host', host)), U.field('Port', port)),
        U.row(el('div', { class: 'grow' }, U.field('Username', user)), el('div', { class: 'grow' }, U.field('Password', pass))),
        U.field('Path', path),
        el('div', { class: 'field' }, el('label', { text: 'Query Parameters' }), box,
          U.btnrow(U.button('+ Add', function () { params.push({ k: '', v: '' }); drawParams(); build(); }, 'ghost'))),
        U.field('Fragment (#)', frag)));
      root.appendChild(U.panel('URL', out, buildNote, U.btnrow(U.copyBtn('Copy URL', function () { return out.textContent; }),
        U.button('Open in New Tab', function () { window.open(out.textContent, '_blank', 'noopener'); }, 'ghost'))));
      root.appendChild(U.panel('Components', parts));
      root.appendChild(U.panel('Query Parameters (decoded)', paramBox));
    }
  });

  /* --- Network Speed Test (online) -------------------------------------------------------- */

  Tools.register({
    id: 'network-speed-test', category: 'network', name: 'Network Speed Test',
    description: 'Estimate your download speed, latency and jitter from the browser.',
    keywords: ['speed test', 'bandwidth', 'download', 'latency', 'internet speed', 'mbps'],
    online: 'downloads test files from Cloudflare to time your connection',
    render: function (root) {
      root.classList.add('g-net');
      var prog = U.progress();
      var out = el('div');
      var stopped = false;
      var btn = U.button('Start Speed Test', start, 'primary');

      function rating(mbps) {
        return mbps < 1 ? 'Basic email, very slow browsing' : mbps < 5 ? 'SD video streaming' : mbps < 25 ? 'HD streaming, video calls'
          : mbps < 100 ? '4K streaming, gaming, remote work' : 'Multiple 4K streams, large downloads';
      }

      function start() {
        stopped = false;
        btn.disabled = true;
        out.replaceChildren();
        var pings = [];
        var i = 0;
        prog.set('Measuring latency…', 0);
        (function ping() {
          if (stopped) return;
          if (i >= 6) return download(pings);
          var t0 = performance.now();
          fetchTimeout('https://www.cloudflare.com/cdn-cgi/trace?_=' + Date.now(), {}, 5000)
            .then(function (r) { return r.text(); })
            .then(function () { if (i > 0) pings.push(performance.now() - t0); i++; prog.set('Measuring latency…', i / 6 * 0.2); ping(); })
            .catch(function (e) { fail(e); });
        })();
      }

      function download(pings) {
        var sizes = [1e5, 1e6, 1e7, 2.5e7], results = [], k = 0, deadline = performance.now() + 15000;
        (function next() {
          if (stopped) return;
          if (k >= sizes.length || performance.now() > deadline) return finish(pings, results);
          var n = sizes[k], t0 = performance.now();
          prog.set('Downloading ' + U.bytes(n) + '…', 0.2 + k / sizes.length * 0.8);
          fetchTimeout('https://speed.cloudflare.com/__down?bytes=' + n + '&_=' + Date.now(), {}, 20000)
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
            .then(function (buf) {
              var secs = (performance.now() - t0) / 1000;
              results.push({ bytes: buf.byteLength, secs: secs, mbps: buf.byteLength * 8 / secs / 1e6 });
              k++;
              if (secs > 4) k = sizes.length;
              next();
            })
            .catch(function (e) { if (results.length) finish(pings, results); else fail(e); });
        })();
      }

      function finish(pings, results) {
        var avg = pings.reduce(function (a, b) { return a + b; }, 0) / (pings.length || 1);
        var jitter = 0;
        for (var j = 1; j < pings.length; j++) jitter += Math.abs(pings[j] - pings[j - 1]);
        jitter = pings.length > 1 ? jitter / (pings.length - 1) : 0;
        /* The largest transfers are the least skewed by request overhead. */
        var best = results.slice().sort(function (a, b) { return b.bytes - a.bytes; })[0];
        var mbps = best ? best.mbps : 0;
        out.replaceChildren(
          el('div', { class: 'big', dataset: { out: 'speed' }, text: mbps.toFixed(1) + ' Mbps' }),
          U.note(rating(mbps)),
          U.stats([{ value: Math.round(avg) + ' ms', label: 'Latency' }, { value: Math.round(jitter) + ' ms', label: 'Jitter' },
            { value: U.bytes(results.reduce(function (a, r) { return a + r.bytes; }, 0)), label: 'Data used' }]),
          U.table(['Transfer', 'Time', 'Speed'], results.map(function (r) { return [U.bytes(r.bytes), r.secs.toFixed(2) + ' s', r.mbps.toFixed(1) + ' Mbps']; })));
        prog.done('Test complete');
        btn.disabled = false;
      }

      function fail(e) {
        prog.fail('Speed test failed: ' + (e && e.name === 'AbortError' ? 'timed out' : (e && e.message) || e) + '. Check your internet connection.');
        btn.disabled = false;
      }
      U.onTeardown(root, function () { stopped = true; });

      root.appendChild(U.panel('', U.note('Results are approximate estimates. For accurate testing, use a dedicated service like speedtest.net.'), U.btnrow(btn), prog, out));
      root.appendChild(U.panel('Speed Guide', U.table(['Speed', 'Good for'], [
        ['< 1 Mbps', 'Basic email, very slow browsing'], ['1–5 Mbps', 'SD video streaming'], ['5–25 Mbps', 'HD streaming, video calls'],
        ['25–100 Mbps', '4K streaming, gaming, remote work'], ['> 100 Mbps', 'Multiple 4K streams, large downloads']])));
    }
  });


  /* --- IPv6 Expand & Compress --------------------------------------------- */

  function parseIPv6(text) {
    var s = String(text || '').trim().toLowerCase().replace(/^\[|\]$/g, ''), prefix = null;
    var slash = s.indexOf('/');
    if (slash > -1) { prefix = parseInt(s.slice(slash + 1), 10); s = s.slice(0, slash); if (!(prefix >= 0 && prefix <= 128)) throw new Error('The prefix length must be between 0 and 128.'); }
    var zone = s.indexOf('%') > -1 ? s.slice(s.indexOf('%') + 1) : null; if (zone) s = s.slice(0, s.indexOf('%'));
    if (!s) throw new Error('Enter an IPv6 address.');
    /* embedded IPv4 at the end */
    var v4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(s);
    if (v4) {
      var o = v4[1].split('.').map(Number);
      if (o.some(function (x) { return x > 255; })) throw new Error('The embedded IPv4 address is not valid.');
      s = s.slice(0, -v4[1].length) + ((o[0] << 8) | o[1]).toString(16) + ':' + ((o[2] << 8) | o[3]).toString(16);
    }
    if (!/^[0-9a-f:]+$/.test(s)) throw new Error('Only hex digits and colons are allowed.');
    if ((s.match(/::/g) || []).length > 1) throw new Error('"::" may only appear once.');
    if (/:::/.test(s)) throw new Error('Too many colons in a row.');
    var halves = s.split('::'), head = halves[0] ? halves[0].split(':') : [], tail = halves.length > 1 && halves[1] ? halves[1].split(':') : [];
    if (halves.length === 1 && head.length !== 8) throw new Error('An address without "::" needs exactly 8 groups (this has ' + head.length + ').');
    if (head.length + tail.length > (halves.length > 1 ? 7 : 8)) throw new Error('Too many groups.');
    var groups = head.concat(new Array(8 - head.length - tail.length).fill('0'), tail);
    groups = groups.map(function (g) { if (g.length > 4) throw new Error('Group "' + g + '" is longer than 4 hex digits.'); return parseInt(g || '0', 16); });
    var big = 0n; groups.forEach(function (g) { big = (big << 16n) | BigInt(g); });
    return { groups: groups, big: big, prefix: prefix, zone: zone };
  }
  function ipv6Groups(big) { var g = []; for (var i = 7; i >= 0; i--) g.push(Number((big >> BigInt(i * 16)) & 0xffffn)); return g; }
  function ipv6Expand(groups) { return groups.map(function (g) { return g.toString(16).padStart(4, '0'); }).join(':'); }
  /* RFC 5952: longest run of two or more zero groups becomes ::, lowercase, no leading zeros. */
  function ipv6Compress(groups) {
    var best = -1, bestLen = 0, cur = -1, len = 0;
    for (var i = 0; i <= 8; i++) {
      if (i < 8 && groups[i] === 0) { if (cur < 0) { cur = i; len = 1; } else len++; }
      else { if (len > bestLen && len >= 2) { best = cur; bestLen = len; } cur = -1; len = 0; }
    }
    var hex = groups.map(function (g) { return g.toString(16); });
    if (best < 0) return hex.join(':');
    var left = hex.slice(0, best).join(':'), right = hex.slice(best + bestLen).join(':');
    return left + '::' + right;
  }
  function ipv6Type(groups, big) {
    var g0 = groups[0];
    if (big === 0n) return 'Unspecified address (::)';
    if (big === 1n) return 'Loopback (::1)';
    if (big >> 32n === 0xffffn) return 'IPv4-mapped address (::ffff:a.b.c.d)';
    if (groups[0] === 0x64 && groups[1] === 0xff9b && !groups[2] && !groups[3] && !groups[4] && !groups[5]) return 'IPv4/IPv6 translation (64:ff9b::/96, NAT64)';
    if ((g0 & 0xffc0) === 0xfe80) return 'Link-local unicast (fe80::/10): only valid on one network segment';
    if ((g0 & 0xfe00) === 0xfc00) return 'Unique local address (fc00::/7): private, like 10.0.0.0/8 in IPv4';
    if ((g0 & 0xff00) === 0xff00) { var scope = { 1: 'interface-local', 2: 'link-local', 4: 'admin-local', 5: 'site-local', 8: 'organisation-local', 14: 'global' }[groups[0] & 0xf] || 'unknown scope'; return 'Multicast (ff00::/8), ' + scope; }
    if (g0 === 0x2001 && groups[1] === 0x0db8) return 'Documentation prefix (2001:db8::/32): reserved for examples, never routed';
    if (g0 === 0x2001 && groups[1] === 0) return 'Teredo tunnelling (2001::/32)';
    if (g0 === 0x2002) return '6to4 (2002::/16), deprecated';
    if (g0 === 0x2001 && groups[1] >= 0x20 && groups[1] <= 0x2f) return 'ORCHIDv2 (2001:20::/28)';
    if ((g0 & 0xe000) === 0x2000) return 'Global unicast (2000::/3): a public, routable address';
    if ((g0 & 0xff00) === 0x0100 && groups[1] === 0 && groups[2] === 0 && groups[3] === 0) return 'Discard-only (100::/64)';
    return 'Reserved or unassigned range';
  }
  function ipv6Reverse(groups) {
    return ipv6Expand(groups).replace(/:/g, '').split('').reverse().join('.') + '.ip6.arpa';
  }

  Tools.register({
    id: 'ipv6-tool', category: 'network', name: 'IPv6 Expand & Compress',
    description: 'Expand, compress and classify an IPv6 address, work out its /prefix range and reverse DNS name.',
    keywords: ['ipv6', 'ip6', 'expand', 'compress', 'shorten', 'subnet', 'prefix', 'cidr', 'link-local', 'ip6.arpa', 'reverse dns', 'ipv4 mapped', 'address'],
    render: function (root) {
      root.classList.add('g-net');
      var ip = el('input', { type: 'text', value: '2001:0db8:0000:0000:0000:ff00:0042:8329/64', spellcheck: false, placeholder: '2001:db8::1 or fe80::1%eth0 or ::ffff:192.0.2.1' });
      var out = el('div');
      function calc() {
        var r;
        try { r = parseIPv6(ip.value); } catch (e) { out.replaceChildren(U.note(e.message, 'err')); return; }
        var rows = [['Compressed (RFC 5952)', ipv6Compress(r.groups) + (r.zone ? '%' + r.zone : '')], ['Expanded', ipv6Expand(r.groups)], ['Type', ipv6Type(r.groups, r.big)],
          ['Reverse DNS (PTR)', ipv6Reverse(r.groups)], ['Integer', r.big.toString()], ['Hex (128-bit)', '0x' + r.big.toString(16).padStart(32, '0')], ['URL form', '[' + ipv6Compress(r.groups) + ']']];
        if (r.big >> 32n === 0xffffn) { var v4 = Number(r.big & 0xffffffffn); rows.push(['Embedded IPv4', [v4 >>> 24, (v4 >>> 16) & 255, (v4 >>> 8) & 255, v4 & 255].join('.')]); }
        var pfx = r.prefix === null ? 64 : r.prefix;
        var mask = pfx === 0 ? 0n : ((1n << 128n) - 1n) ^ ((1n << BigInt(128 - pfx)) - 1n);
        var net = r.big & mask, last = net | (~mask & ((1n << 128n) - 1n));
        var count = 1n << BigInt(128 - pfx);
        var pRows = [['Prefix', ipv6Compress(ipv6Groups(net)) + '/' + pfx + (r.prefix === null ? ' (assumed /64)' : '')], ['First address', ipv6Compress(ipv6Groups(net))], ['Last address', ipv6Compress(ipv6Groups(last))],
          ['Addresses', count > 1000000000000n ? '2^' + (128 - pfx) + ' (' + Number(count).toExponential(2) + ')' : count.toLocaleString('en-US')], ['/64 subnets inside', pfx <= 64 ? (1n << BigInt(64 - pfx)).toLocaleString('en-US') : '0 (smaller than a /64)'],
          ['Netmask', ipv6Expand(ipv6Groups(mask))]];
        var bin = ipv6Expand(r.groups).split(':').map(function (h) { return parseInt(h, 16).toString(2).padStart(16, '0'); }).join(' ');
        out.replaceChildren(kv(rows), el('h3', { text: 'Prefix' }), kv(pRows), el('h3', { text: 'Binary' }), el('div', { class: 'binary', style: { gridTemplateColumns: '1fr' } }, el('span', { text: bin })));
      }
      ip.addEventListener('input', U.debounce(calc, 120));
      var chips = U.btnrow.apply(null, [['::1', 'Loopback'], ['fe80::1ff:fe23:4567:890a', 'Link-local'], ['::ffff:192.0.2.128', 'IPv4-mapped'], ['2001:db8::/32', 'Documentation'], ['ff02::1', 'Multicast'], ['fd12:3456:789a:1::1/48', 'Unique local']].map(function (p) {
        return U.button(p[1], function () { ip.value = p[0]; calc(); }, 'ghost');
      }));
      calc();
      root.appendChild(U.panel('', U.field('IPv6 address (optionally with /prefix)', ip), chips));
      root.appendChild(U.panel('Result', out, U.note('Compression follows RFC 5952: lowercase hex, no leading zeros, and the longest run of zero groups (two or more) becomes "::", the leftmost when tied.')));
    }
  });

  /* Shared with network-b.js (loaded right after this file). */
  window.NetKit = {
    subnet: subnet, parseUA: parseUA, htaccess: htaccess, kv: kv, cleanHost: cleanHost, fetchTimeout: fetchTimeout,
    parseIPv4: parseIPv4, toLong: toLong, fromLong: fromLong,
    parseIPv6: parseIPv6, ipv6Groups: ipv6Groups, ipv6Expand: ipv6Expand, ipv6Compress: ipv6Compress
  };
})();
