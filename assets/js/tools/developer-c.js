/* developer-c tools: a curl converter, a chmod calculator, code screenshots
   and a regex explainer. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  document.head.appendChild(el('style', { text: [
    '.g-devc textarea{min-height:140px;font-family:var(--mono);font-size:13px}',
    '.g-devc textarea.tall{min-height:260px}',
    '.g-devc .code{font-family:var(--mono);font-size:13px;white-space:pre-wrap;word-break:break-all;background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--radius);padding:10px;margin:0;max-height:420px;overflow:auto}',
    '.g-devc .perm-grid{display:grid;grid-template-columns:110px repeat(3,1fr);gap:6px 12px;align-items:center;max-width:520px}',
    '.g-devc .perm-grid > b{font-size:13px}',
    '.g-devc .perm-grid .hd{font-size:12px;color:var(--fg-muted);font-weight:600;text-align:center}',
    '.g-devc .perm-grid .check{justify-content:center}',
    '.g-devc .big{font-family:var(--mono);font-size:34px;font-weight:800;letter-spacing:2px}',
    '.g-devc .mid{font-family:var(--mono);font-size:20px;font-weight:600}',
    '.g-devc .shot-wrap{overflow:auto;background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--radius);padding:10px;display:grid;place-items:center}',
    '.g-devc .shot-wrap canvas{max-width:100%;height:auto}',
    '.g-devc .tree{list-style:none;padding-left:0;margin:0;font-size:14px}',
    '.g-devc .tree ul{list-style:none;padding-left:22px;margin:2px 0;border-left:1px dashed var(--border)}',
    '.g-devc .tree li{margin:3px 0}',
    '.g-devc .tree code{font-family:var(--mono);background:var(--bg-sunken);border:1px solid var(--border);border-radius:4px;padding:0 5px;margin-right:6px}',
    '.g-devc .tree .q{color:var(--accent);font-weight:600}',
    '.g-devc .hit{background:color-mix(in srgb,var(--accent) 35%,transparent);border-radius:2px}',
    '.g-devc .kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 14px;font-size:14px}',
    '.g-devc .kv b{color:var(--fg-muted);font-weight:600}',
    '.g-devc .hrow{display:grid;grid-template-columns:1fr 2fr auto;gap:6px;margin-bottom:6px}'
  ].join('\n') }));

  function reg(def) {
    var render = def.render;
    def.category = def.category || 'developer';
    def.render = function (root) { root.classList.add('g-devc'); render(root); };
    Tools.register(def);
  }
  function ta(value, placeholder, cls) { return el('textarea', { class: cls || '', value: value || '', placeholder: placeholder || '', spellcheck: false }); }
  function codeOut(k) { return el('pre', { class: 'code', dataset: { k: k || 'out' } }); }
  function copyRow(get, filename) {
    var row = [U.copyBtn('Copy', get)];
    if (filename) row.push(U.downloadBtn('Download', filename, get));
    return U.btnrow.apply(null, row);
  }

  /* ======================================================================
     curl to Code Converter
     ====================================================================== */

  /* Shell-style tokeniser: single quotes, double quotes (with \" and \\),
     $'…' ANSI quoting, backslash continuation lines. */
  function shellTokens(src) {
    var s = String(src).replace(/\\\r?\n/g, ' ').trim(), toks = [], i = 0, cur = '', has = false;
    function push() { if (has) toks.push(cur); cur = ''; has = false; }
    while (i < s.length) {
      var ch = s[i];
      if (/\s/.test(ch)) { push(); i++; continue; }
      if (ch === "'" ) {
        var j = s.indexOf("'", i + 1); if (j < 0) j = s.length;
        cur += s.slice(i + 1, j); has = true; i = j + 1; continue;
      }
      if (ch === '$' && s[i + 1] === "'") {
        i += 2; has = true;
        while (i < s.length && s[i] !== "'") {
          if (s[i] === '\\') { var e = s[i + 1]; cur += e === 'n' ? '\n' : e === 't' ? '\t' : e === 'r' ? '\r' : e; i += 2; }
          else cur += s[i++];
        }
        i++; continue;
      }
      if (ch === '"') {
        i++; has = true;
        while (i < s.length && s[i] !== '"') {
          if (s[i] === '\\' && /["\\$`\n]/.test(s[i + 1] || '')) { cur += s[i + 1]; i += 2; }
          else cur += s[i++];
        }
        i++; continue;
      }
      if (ch === '\\') { cur += s[i + 1] || ''; has = true; i += 2; continue; }
      cur += ch; has = true; i++;
    }
    push();
    return toks;
  }

  var CURL_FLAGS_WITH_VALUE = {
    '-X': 'method', '--request': 'method', '-H': 'header', '--header': 'header', '-d': 'data', '--data': 'data', '--data-raw': 'data',
    '--data-binary': 'data', '--data-ascii': 'data', '--data-urlencode': 'dataurl', '--json': 'json', '-F': 'form', '--form': 'form',
    '-u': 'user', '--user': 'user', '-b': 'cookie', '--cookie': 'cookie', '-A': 'ua', '--user-agent': 'ua', '-e': 'referer', '--referer': 'referer',
    '--url': 'url', '-o': 'skip', '--output': 'skip', '-m': 'timeout', '--max-time': 'timeout', '--connect-timeout': 'skip', '-x': 'proxy', '--proxy': 'proxy',
    '-T': 'upload', '--upload-file': 'upload', '--retry': 'skip', '-w': 'skip', '--write-out': 'skip', '-c': 'skip', '--cookie-jar': 'skip', '--cacert': 'skip', '--cert': 'skip', '--key': 'skip',
    '-r': 'range', '--range': 'range', '--resolve': 'skip', '--interface': 'skip', '--data-basic': 'data'
  };
  var CURL_BOOL = { '-k': 'insecure', '--insecure': 'insecure', '-L': 'follow', '--location': 'follow', '--compressed': 'compressed', '-G': 'get', '--get': 'get',
    '-s': null, '--silent': null, '-S': null, '--show-error': null, '-v': null, '--verbose': null, '-i': 'include', '--include': 'include', '-I': 'head', '--head': 'head',
    '-f': null, '--fail': null, '-O': null, '--remote-name': null, '-#': null, '--progress-bar': null, '-N': null, '--no-buffer': null, '--http1.1': null, '--http2': null, '-4': null, '-6': null };

  function parseCurl(text) {
    var toks = shellTokens(text);
    if (toks[0] === 'curl' || /(^|\/)curl(\.exe)?$/.test(toks[0] || '')) toks.shift();
    else if (toks.length && toks[0] !== 'curl') { /* allow a bare command */ }
    var req = { method: '', url: '', headers: [], data: [], form: [], auth: null, insecure: false, follow: false, compressed: false, get: false, cookies: '', warnings: [] };
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (t === '--') continue;
      /* -XPOST style, and combined short booleans like -sSL */
      if (/^-[A-Za-z]/.test(t) && t.length > 2 && t[1] !== '-') {
        var f = t.slice(0, 2);
        if (CURL_FLAGS_WITH_VALUE[f]) { toks.splice(i + 1, 0, t.slice(2)); t = f; }
        else if (t.slice(1).split('').every(function (c) { return ('-' + c) in CURL_BOOL; })) { t.slice(1).split('').forEach(function (c) { applyBool('-' + c); }); continue; }
      }
      if (t.indexOf('--') === 0 && t.indexOf('=') > 0) { var eq = t.indexOf('='); toks.splice(i + 1, 0, t.slice(eq + 1)); t = t.slice(0, eq); }
      if (t in CURL_BOOL) { applyBool(t); continue; }
      if (t in CURL_FLAGS_WITH_VALUE) {
        var kind = CURL_FLAGS_WITH_VALUE[t], v = toks[++i];
        if (v === undefined) { req.warnings.push(t + ' has no value'); continue; }
        if (kind === 'method') req.method = v.toUpperCase();
        else if (kind === 'header') { var m = /^([^:]+):\s*(.*)$/.exec(v); if (m) req.headers.push([m[1].trim(), m[2]]); else if (/;$/.test(v)) req.headers.push([v.slice(0, -1).trim(), '']); }
        else if (kind === 'data') req.data.push(v.replace(/^@/, function (x) { req.warnings.push('the body is read from a file (' + v + ')'); return ''; }));
        else if (kind === 'dataurl') req.data.push(v.indexOf('=') > 0 ? v.split('=')[0] + '=' + encodeURIComponent(v.slice(v.indexOf('=') + 1)) : encodeURIComponent(v));
        else if (kind === 'json') { req.data.push(v); req.headers.push(['Content-Type', 'application/json']); req.headers.push(['Accept', 'application/json']); }
        else if (kind === 'form') { var fm = /^([^=]+)=(.*)$/.exec(v); if (fm) req.form.push([fm[1], fm[2]]); }
        else if (kind === 'user') { var up = v.split(':'); req.auth = { user: up[0], pass: up.slice(1).join(':') }; }
        else if (kind === 'cookie') req.cookies = req.cookies ? req.cookies + '; ' + v : v;
        else if (kind === 'ua') req.headers.push(['User-Agent', v]);
        else if (kind === 'referer') req.headers.push(['Referer', v]);
        else if (kind === 'url') req.url = v;
        else if (kind === 'timeout') req.timeout = parseFloat(v);
        else if (kind === 'proxy') req.warnings.push('proxy setting ignored (' + v + ')');
        else if (kind === 'upload') { req.method = req.method || 'PUT'; req.warnings.push('uploads a file (' + v + '); the body is left for you to fill in'); }
        else if (kind === 'range') req.headers.push(['Range', 'bytes=' + v]);
        continue;
      }
      if (t[0] === '-' && t.length > 1) { req.warnings.push('ignored option ' + t); if (i + 1 < toks.length && toks[i + 1][0] !== '-' && !/^https?:/.test(toks[i + 1]) && !req.url) { /* probably its value */ i++; } continue; }
      if (!req.url) req.url = t; else req.warnings.push('ignored extra argument ' + t);
    }
    function applyBool(flag) { var k = CURL_BOOL[flag]; if (k) req[k] = true; }
    if (req.cookies) req.headers.push(['Cookie', req.cookies]);
    if (req.get && req.data.length) { req.url += (req.url.indexOf('?') > -1 ? '&' : '?') + req.data.join('&'); req.data = []; }
    if (req.head) req.method = 'HEAD';
    if (!req.method) req.method = req.data.length || req.form.length ? 'POST' : 'GET';
    if (req.url && !/^[a-z]+:\/\//i.test(req.url)) req.url = 'http://' + req.url;
    if (req.data.length && !req.headers.some(function (h) { return h[0].toLowerCase() === 'content-type'; }) && !req.form.length) {
      req.headers.push(['Content-Type', /^\s*[\[{]/.test(req.data[0]) ? 'application/json' : 'application/x-www-form-urlencoded']);
    }
    return req;
  }

  function headerObj(req) { var o = {}; req.headers.forEach(function (h) { o[h[0]] = h[1]; }); return o; }
  function bodyOf(req) { return req.data.length ? req.data.join('&') : ''; }
  function isJsonBody(req) { var ct = headerObj(req)['Content-Type'] || headerObj(req)['content-type'] || ''; return /json/i.test(ct) && /^\s*[\[{]/.test(bodyOf(req)); }
  function jsStr(s) { return JSON.stringify(String(s)); }
  function pyStr(s) { var j = JSON.stringify(String(s)); return j.indexOf("'") === -1 ? "'" + j.slice(1, -1).replace(/\\"/g, '"') + "'" : j; }
  function indentJson(text, pad) { try { return JSON.stringify(JSON.parse(text), null, 2).replace(/\n/g, '\n' + pad); } catch (e) { return null; } }

  function toCurl(req) {
    var first = ['curl'], parts;
    function q(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }
    if (req.method !== 'GET' && !(req.method === 'POST' && (req.data.length || req.form.length))) first.push('-X ' + req.method);
    if (req.follow) first.push('-L'); if (req.insecure) first.push('-k'); if (req.compressed) first.push('--compressed');
    first.push(q(req.url));
    parts = [first.join(' ')];
    req.headers.forEach(function (h) { parts.push('-H ' + q(h[0] + ': ' + h[1])); });
    if (req.auth) parts.push('-u ' + q(req.auth.user + ':' + req.auth.pass));
    req.form.forEach(function (f) { parts.push('-F ' + q(f[0] + '=' + f[1])); });
    if (req.data.length) parts.push('--data-raw ' + q(bodyOf(req)));
    return parts.join(' \\\n  ');
  }
  function toFetch(req, node) {
    var opts = [], h = headerObj(req), lines = [];
    if (req.auth) h.Authorization = 'Basic ' + btoa(req.auth.user + ':' + req.auth.pass);
    if (req.method !== 'GET') opts.push('  method: ' + jsStr(req.method));
    if (Object.keys(h).length) opts.push('  headers: {\n' + Object.keys(h).map(function (k) { return '    ' + jsStr(k) + ': ' + jsStr(h[k]); }).join(',\n') + '\n  }');
    if (req.form.length) {
      lines.push('const form = new FormData();');
      req.form.forEach(function (f) { lines.push(/^@/.test(f[1]) ? 'form.append(' + jsStr(f[0]) + ', fileInput.files[0]); // ' + f[1] : 'form.append(' + jsStr(f[0]) + ', ' + jsStr(f[1]) + ');'); });
      opts.push('  body: form');
    } else if (req.data.length) {
      var j = isJsonBody(req) ? indentJson(bodyOf(req), '  ') : null;
      opts.push('  body: ' + (j ? 'JSON.stringify(' + j + ')' : jsStr(bodyOf(req))));
    }
    if (req.follow === false) { /* fetch follows by default */ }
    lines.push('const response = await fetch(' + jsStr(req.url) + (opts.length ? ', {\n' + opts.join(',\n') + '\n}' : '') + ');');
    lines.push(node ? 'const data = await response.json(); // or response.text()' : 'const data = await response.json(); // or response.text()');
    lines.push('console.log(response.status, data);');
    return lines.join('\n');
  }
  function toAxios(req) {
    var h = headerObj(req), cfg = ['  method: ' + jsStr(req.method.toLowerCase()), '  url: ' + jsStr(req.url)];
    if (Object.keys(h).length) cfg.push('  headers: {\n' + Object.keys(h).map(function (k) { return '    ' + jsStr(k) + ': ' + jsStr(h[k]); }).join(',\n') + '\n  }');
    if (req.auth) cfg.push('  auth: { username: ' + jsStr(req.auth.user) + ', password: ' + jsStr(req.auth.pass) + ' }');
    if (req.form.length) cfg.push('  data: form');
    else if (req.data.length) { var j = isJsonBody(req) ? indentJson(bodyOf(req), '  ') : null; cfg.push('  data: ' + (j || jsStr(bodyOf(req)))); }
    if (req.timeout) cfg.push('  timeout: ' + Math.round(req.timeout * 1000));
    var pre = req.form.length ? 'const form = new FormData();\n' + req.form.map(function (f) { return 'form.append(' + jsStr(f[0]) + ', ' + jsStr(f[1]) + ');'; }).join('\n') + '\n\n' : '';
    return "import axios from 'axios';\n\n" + pre + 'const response = await axios({\n' + cfg.join(',\n') + '\n});\nconsole.log(response.status, response.data);';
  }
  function toPython(req) {
    var h = headerObj(req), lines = ['import requests', ''];
    if (Object.keys(h).length) lines.push('headers = {\n' + Object.keys(h).map(function (k) { return '    ' + pyStr(k) + ': ' + pyStr(h[k]) + ','; }).join('\n') + '\n}');
    var args = [pyStr(req.url)];
    if (Object.keys(h).length) args.push('headers=headers');
    if (req.form.length) { lines.push('files = {\n' + req.form.map(function (f) { return '    ' + pyStr(f[0]) + ': ' + (/^@/.test(f[1]) ? 'open(' + pyStr(f[1].slice(1)) + ", 'rb')" : '(None, ' + pyStr(f[1]) + ')') + ','; }).join('\n') + '\n}'); args.push('files=files'); }
    else if (req.data.length) {
      if (isJsonBody(req)) { var j = indentJson(bodyOf(req), ''); lines.push('payload = ' + j.replace(/\btrue\b/g, 'True').replace(/\bfalse\b/g, 'False').replace(/\bnull\b/g, 'None')); args.push('json=payload'); }
      else { lines.push('data = ' + pyStr(bodyOf(req))); args.push('data=data'); }
    }
    if (req.auth) args.push('auth=(' + pyStr(req.auth.user) + ', ' + pyStr(req.auth.pass) + ')');
    if (req.insecure) args.push('verify=False');
    if (req.timeout) args.push('timeout=' + req.timeout);
    if (req.follow === false && req.method !== 'GET') { /* requests follows by default */ }
    lines.push('', 'response = requests.' + (['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].indexOf(req.method.toLowerCase()) > -1 ? req.method.toLowerCase() + '(' : 'request(' + pyStr(req.method) + ', ') + args.join(', ') + ')');
    lines.push('print(response.status_code)', 'print(response.text)');
    return lines.join('\n');
  }
  function toGo(req) {
    var h = headerObj(req), lines = ['package main', '', 'import (', '\t"fmt"', '\t"io"', '\t"net/http"'];
    if (req.data.length) lines.push('\t"strings"');
    lines.push(')', '', 'func main() {');
    lines.push('\treq, err := http.NewRequest(' + jsStr(req.method) + ', ' + jsStr(req.url) + ', ' + (req.data.length ? 'strings.NewReader(' + jsStr(bodyOf(req)) + ')' : 'nil') + ')');
    lines.push('\tif err != nil {\n\t\tpanic(err)\n\t}');
    Object.keys(h).forEach(function (k) { lines.push('\treq.Header.Set(' + jsStr(k) + ', ' + jsStr(h[k]) + ')'); });
    if (req.auth) lines.push('\treq.SetBasicAuth(' + jsStr(req.auth.user) + ', ' + jsStr(req.auth.pass) + ')');
    lines.push('\tresp, err := http.DefaultClient.Do(req)', '\tif err != nil {\n\t\tpanic(err)\n\t}', '\tdefer resp.Body.Close()', '\tbody, _ := io.ReadAll(resp.Body)', '\tfmt.Println(resp.StatusCode, string(body))', '}');
    if (req.form.length) lines.splice(lines.length - 1, 0, '\t// multipart form fields were in the curl command; build them with mime/multipart');
    return lines.join('\n');
  }
  function toPhp(req) {
    var h = headerObj(req), lines = ['<?php', '$ch = curl_init(' + pyStr(req.url) + ');', 'curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);'];
    if (req.method !== 'GET') lines.push("curl_setopt($ch, CURLOPT_CUSTOMREQUEST, " + pyStr(req.method) + ');');
    if (Object.keys(h).length) lines.push('curl_setopt($ch, CURLOPT_HTTPHEADER, [\n' + Object.keys(h).map(function (k) { return '    ' + pyStr(k + ': ' + h[k]) + ','; }).join('\n') + '\n]);');
    if (req.data.length) lines.push('curl_setopt($ch, CURLOPT_POSTFIELDS, ' + pyStr(bodyOf(req)) + ');');
    if (req.form.length) lines.push('curl_setopt($ch, CURLOPT_POSTFIELDS, [' + req.form.map(function (f) { return pyStr(f[0]) + ' => ' + (/^@/.test(f[1]) ? 'new CURLFile(' + pyStr(f[1].slice(1)) + ')' : pyStr(f[1])); }).join(', ') + ']);');
    if (req.auth) lines.push('curl_setopt($ch, CURLOPT_USERPWD, ' + pyStr(req.auth.user + ':' + req.auth.pass) + ');');
    if (req.follow) lines.push('curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);');
    if (req.insecure) lines.push('curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);');
    lines.push('$response = curl_exec($ch);', '$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);', 'curl_close($ch);', 'echo $status, "\\n", $response;');
    return lines.join('\n');
  }
  function toPowerShell(req) {
    var h = headerObj(req), lines = [];
    function ps(s) { return "'" + String(s).replace(/'/g, "''") + "'"; }
    if (Object.keys(h).length) lines.push('$headers = @{\n' + Object.keys(h).map(function (k) { return '    ' + ps(k) + ' = ' + ps(h[k]); }).join('\n') + '\n}');
    var args = ['-Uri ' + ps(req.url), '-Method ' + req.method];
    if (Object.keys(h).length) args.push('-Headers $headers');
    if (req.data.length) { lines.push('$body = @' + "'\n" + bodyOf(req) + "\n'@"); args.push('-Body $body'); }
    if (req.form.length) { lines.push('$form = @{ ' + req.form.map(function (f) { return ps(f[0]) + ' = ' + (/^@/.test(f[1]) ? 'Get-Item ' + ps(f[1].slice(1)) : ps(f[1])); }).join('; ') + ' }'); args.push('-Form $form'); }
    if (req.auth) { lines.push('$cred = New-Object PSCredential(' + ps(req.auth.user) + ', (ConvertTo-SecureString ' + ps(req.auth.pass) + ' -AsPlainText -Force))'); args.push('-Credential $cred -Authentication Basic'); }
    if (req.insecure) args.push('-SkipCertificateCheck');
    lines.push('$response = Invoke-RestMethod ' + args.join(' `\n    '), '$response');
    return lines.join('\n');
  }
  var CODE_TARGETS = [
    ['fetch', 'JavaScript fetch', toFetch, 'request.js'], ['axios', 'Axios', toAxios, 'request.js'], ['python', 'Python requests', toPython, 'request.py'],
    ['go', 'Go net/http', toGo, 'main.go'], ['php', 'PHP cURL', toPhp, 'request.php'], ['ps', 'PowerShell', toPowerShell, 'request.ps1'], ['curl', 'curl (tidied)', toCurl, 'request.sh']
  ];

  reg({
    id: 'curl-converter', name: 'curl to Code Converter',
    description: 'Paste a curl command and get the same request as fetch, Axios, Python requests, Go, PHP or PowerShell, or build one and get the curl.',
    keywords: ['curl', 'fetch', 'axios', 'python requests', 'http', 'api', 'request', 'convert', 'code generator', 'powershell', 'go', 'php', 'postman'],
    render: function (root) {
      var input = ta("curl 'https://api.example.com/v1/users' \\\n  -X POST \\\n  -H 'Content-Type: application/json' \\\n  -H 'Authorization: Bearer YOUR_TOKEN' \\\n  --data-raw '{\"name\": \"Ada\", \"role\": \"admin\"}'", 'Paste a curl command…', 'tall');
      var method = U.select({ options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'], value: 'GET' });
      var url = el('input', { type: 'url', placeholder: 'https://…', spellcheck: false });
      var headers = ta('', 'One header per line, e.g.\nAccept: application/json', '');
      headers.style.minHeight = '80px';
      var body = ta('', 'Request body (JSON, form data…)', '');
      body.style.minHeight = '80px';
      var auth = el('input', { type: 'text', placeholder: 'user:password (optional)', spellcheck: false });
      var flags = el('div', { class: 'row' });
      var follow = U.checkbox('Follow redirects (-L)'), insecure = U.checkbox('Skip TLS check (-k)'), compressed = U.checkbox('--compressed');
      flags.append(follow, insecure, compressed);
      var target = U.chips(CODE_TARGETS.map(function (t) { return { value: t[0], label: t[1] }; }), function () { render(); }, 'fetch');
      var out = codeOut('out');
      var warn = U.note('');
      var current = null, syncing = false;

      function fromForm() {
        var r = { method: method.value, url: url.value.trim(), headers: [], data: [], form: [], auth: null, insecure: insecure.input.checked, follow: follow.input.checked, compressed: compressed.input.checked, warnings: [] };
        headers.value.split('\n').forEach(function (l) { var m = /^([^:]+):\s*(.*)$/.exec(l.trim()); if (m) r.headers.push([m[1].trim(), m[2]]); });
        if (body.value.trim()) r.data.push(body.value);
        if (auth.value.trim()) { var up = auth.value.split(':'); r.auth = { user: up[0], pass: up.slice(1).join(':') }; }
        return r;
      }
      function toForm(r) {
        syncing = true;
        method.value = r.method; url.value = r.url;
        headers.value = r.headers.map(function (h) { return h[0] + ': ' + h[1]; }).join('\n');
        body.value = r.form.length ? '' : bodyOf(r);
        auth.value = r.auth ? r.auth.user + ':' + r.auth.pass : '';
        follow.input.checked = !!r.follow; insecure.input.checked = !!r.insecure; compressed.input.checked = !!r.compressed;
        syncing = false;
      }
      function render() {
        if (!current) return;
        var t = CODE_TARGETS.filter(function (x) { return x[0] === target.value; })[0];
        out.textContent = current.url ? t[2](current) : '';
        out.dataset.file = t[3];
        var w = current.warnings.slice();
        if (current.form.length) w.push('multipart form fields: ' + current.form.map(function (f) { return f[0]; }).join(', '));
        warn.className = 'note' + (w.length ? ' err' : '');
        warn.textContent = current.url ? (w.length ? 'Note: ' + w.join('; ') : '') : 'Enter a URL (or paste a curl command) to generate code.';
      }
      function fromCurl() {
        try { current = parseCurl(input.value); toForm(current); render(); }
        catch (e) { warn.className = 'note err'; warn.textContent = e.message; }
      }
      function fromFields() {
        if (syncing) return;
        current = fromForm();
        syncing = true; input.value = current.url ? toCurl(current) : ''; syncing = false;
        render();
      }
      input.addEventListener('input', U.debounce(fromCurl, 150));
      [method, url, headers, body, auth, follow.input, insecure.input, compressed.input].forEach(function (n) { n.addEventListener('input', U.debounce(fromFields, 150)); n.addEventListener('change', fromFields); });
      fromCurl();

      root.appendChild(U.split(
        U.panel('curl command', input, U.note('Handles -X, -H, -d/--data-raw/--json, -F, -u, -b, -A, -e, -L, -k, -G, --compressed, quoting and line continuations.')),
        U.panel('Request', U.row(U.field('Method', method), U.field('URL', url)), U.field('Headers', headers), U.field('Body', body), U.field('Basic auth', auth), flags)));
      root.appendChild(U.panel('Code', target, out, warn, U.btnrow(U.copyBtn('Copy code', function () { return out.textContent; }),
        U.button('Download', function () { if (out.textContent) U.saveText(out.dataset.file || 'request.txt', out.textContent); }))));
    }
  });

  /* ======================================================================
     chmod Calculator
     ====================================================================== */

  var PERM_WHO = [['u', 'Owner'], ['g', 'Group'], ['o', 'Others']], PERM_WHAT = [['r', 'Read', 4], ['w', 'Write', 2], ['x', 'Execute', 1]];
  function octalToSymbolic(oct) {
    var s = '', n = parseInt(oct, 8), special = oct.length === 4 ? parseInt(oct[0], 8) : 0;
    var digits = oct.slice(-3).split('').map(function (d) { return parseInt(d, 8); });
    digits.forEach(function (d, i) {
      s += (d & 4 ? 'r' : '-') + (d & 2 ? 'w' : '-');
      var x = !!(d & 1), sp = i === 0 ? special & 4 : i === 1 ? special & 2 : special & 1;
      s += sp ? (i === 2 ? (x ? 't' : 'T') : (x ? 's' : 'S')) : (x ? 'x' : '-');
    });
    return s;
  }
  function symbolicToOctal(sym) {
    sym = sym.replace(/^[-dlcbps]/, '').replace(/[@+.]$/, '');
    if (!/^[rwxsStT-]{9}$/.test(sym)) return null;
    var special = 0, out = '';
    for (var i = 0; i < 3; i++) {
      var tri = sym.slice(i * 3, i * 3 + 3), d = 0;
      if (tri[0] === 'r') d += 4; if (tri[1] === 'w') d += 2;
      if (/[xst]/.test(tri[2])) d += 1;
      if (/[sS]/.test(tri[2])) special += i === 0 ? 4 : 2;
      if (/[tT]/.test(tri[2])) special += 1;
      out += d;
    }
    return (special ? String(special) : '') + out;
  }
  function describePerm(d) { var p = []; if (d & 4) p.push('read'); if (d & 2) p.push('write'); if (d & 1) p.push('execute'); return p.length ? p.join(', ') : 'no access'; }

  reg({
    id: 'chmod-calculator', name: 'chmod Calculator',
    description: 'Tick the permissions and get the octal, symbolic and chmod command; or paste 755 or rwxr-xr-x and see what it means.',
    keywords: ['chmod', 'permissions', 'unix', 'linux', 'octal', '755', '644', 'rwx', 'file permissions', 'setuid', 'sticky bit', 'umask'],
    render: function (root) {
      var boxes = {}, special = {};
      var octal = el('input', { type: 'text', value: '755', maxLength: 4, style: { width: '110px', fontFamily: 'var(--mono)', fontSize: '20px' }, inputMode: 'numeric', 'aria-label': 'Octal' });
      var symbolic = el('input', { type: 'text', value: 'rwxr-xr-x', maxLength: 10, style: { width: '160px', fontFamily: 'var(--mono)', fontSize: '20px' }, spellcheck: false, 'aria-label': 'Symbolic' });
      var cmd = codeOut('cmd'); cmd.style.maxHeight = '';
      var explain = el('div', { class: 'kv' });
      var grid = el('div', { class: 'perm-grid' }, el('span'), PERM_WHAT.map(function (w) { return el('span', { class: 'hd', text: w[1] }); }));
      PERM_WHO.forEach(function (who) {
        grid.appendChild(el('b', { text: who[1] }));
        PERM_WHAT.forEach(function (what) {
          var c = U.checkbox('', {}); c.input.dataset.p = who[0] + what[0];
          boxes[who[0] + what[0]] = c.input;
          c.input.addEventListener('change', fromBoxes);
          grid.appendChild(c);
        });
      });
      var specialRow = el('div', { class: 'row' }, [['s', 'setuid (4)'], ['g', 'setgid (2)'], ['t', 'sticky bit (1)']].map(function (s) {
        var c = U.checkbox(s[1], {}); special[s[0]] = c.input; c.input.addEventListener('change', fromBoxes); return c;
      }));

      function fromBoxes() {
        var sp = (special.s.checked ? 4 : 0) + (special.g.checked ? 2 : 0) + (special.t.checked ? 1 : 0);
        var oct = PERM_WHO.map(function (who) { return PERM_WHAT.reduce(function (a, w) { return a + (boxes[who[0] + w[0]].checked ? w[2] : 0); }, 0); }).join('');
        setAll((sp ? String(sp) : '') + oct);
      }
      function setAll(oct) {
        oct = String(oct).replace(/[^0-7]/g, '');
        if (oct.length < 3) oct = oct.padStart(3, '0');
        if (oct.length > 4) oct = oct.slice(-4);
        octal.value = oct; symbolic.value = octalToSymbolic(oct);
        var sp = oct.length === 4 ? parseInt(oct[0], 8) : 0;
        var digits = oct.slice(-3).split('').map(function (d) { return parseInt(d, 8); });
        PERM_WHO.forEach(function (who, i) { PERM_WHAT.forEach(function (w) { boxes[who[0] + w[0]].checked = !!(digits[i] & w[2]); }); });
        special.s.checked = !!(sp & 4); special.g.checked = !!(sp & 2); special.t.checked = !!(sp & 1);
        var sym = octalToSymbolic(oct), three = oct.slice(-3);
        cmd.textContent = 'chmod ' + oct + ' filename\nchmod u=' + sym.slice(0, 3).replace(/-/g, '').replace(/[sS]/, 'x') + ',g=' + sym.slice(3, 6).replace(/-/g, '').replace(/[sS]/, 'x') + ',o=' + sym.slice(6).replace(/-/g, '').replace(/[tT]/, 'x') + ' filename' +
          (sp ? '\n# special bits: ' + [sp & 4 ? 'u+s' : '', sp & 2 ? 'g+s' : '', sp & 1 ? '+t' : ''].filter(Boolean).join(' ') : '') +
          '\nchmod -R ' + oct + ' directory/   # recursive';
        explain.replaceChildren(
          el('b', { text: 'Owner (' + three[0] + ')' }), el('span', { text: describePerm(digits[0]) }),
          el('b', { text: 'Group (' + three[1] + ')' }), el('span', { text: describePerm(digits[1]) }),
          el('b', { text: 'Others (' + three[2] + ')' }), el('span', { text: describePerm(digits[2]) }),
          el('b', { text: 'ls -l shows' }), el('code', { text: '-' + sym }),
          el('b', { text: 'umask that gives it' }), el('code', { text: '0' + three.split('').map(function (d) { return 7 - parseInt(d, 8); }).join('') + ' (for 777 defaults)' }),
          sp ? el('b', { text: 'Special' }) : null, sp ? el('span', { text: [sp & 4 ? 'setuid: runs as the file owner' : '', sp & 2 ? 'setgid: runs as the group / new files inherit the directory group' : '', sp & 1 ? 'sticky: only owners can delete inside the directory' : ''].filter(Boolean).join('; ') }) : null);
        var note = { 644: 'The usual setting for files: you can edit, everyone else can read.', 755: 'The usual setting for directories and scripts: everyone can enter or run, only you can change.', 600: 'Private file: SSH keys, credentials.', 700: 'Private directory, e.g. ~/.ssh.', 664: 'Group-writable file, common on shared projects.', 775: 'Group-writable directory.', 777: 'Everyone can do everything. Almost always a mistake on a server.', 400: 'Read-only, even for you (like an AWS .pem key).', 444: 'Read-only for everyone.', 666: 'Everyone can edit, nobody can execute.', 1777: 'World-writable with the sticky bit, like /tmp.', 4755: 'setuid root binary such as passwd or sudo.' }[oct];
        meaning.textContent = note || '';
      }
      var meaning = U.note('');
      octal.addEventListener('input', function () { if (/^[0-7]{3,4}$/.test(octal.value)) setAll(octal.value); });
      symbolic.addEventListener('input', function () { var o = symbolicToOctal(symbolic.value.trim()); if (o !== null) { setAll(o); symbolic.value = symbolic.value.trim(); } });
      var presets = el('div', { class: 'chips' }, ['644', '755', '600', '700', '664', '775', '777', '400', '1777', '4755'].map(function (p) {
        return el('button', { type: 'button', class: 'chip', onclick: function () { setAll(p); } }, p);
      }));
      setAll('755');
      root.appendChild(U.panel(null, grid, specialRow, presets));
      root.appendChild(U.panel('Result', U.row(U.field('Octal', octal), U.field('Symbolic', symbolic)), meaning, cmd, U.btnrow(U.copyBtn('Copy command', function () { return cmd.textContent.split('\n')[0]; })), explain));
      root.appendChild(U.panel('How it works', U.note('Each of owner, group and others gets one octal digit: read = 4, write = 2, execute = 1, added together. A fourth leading digit carries setuid (4), setgid (2) and the sticky bit (1). On a directory, execute means "can enter it" and read means "can list it".')));
    }
  });

  /* ======================================================================
     Code Screenshot
     ====================================================================== */

  var SHOT_THEMES = {
    dark:   { name: 'Midnight', bg: '#1e1e2e', fg: '#cdd6f4', kw: '#cba6f7', str: '#a6e3a1', num: '#fab387', com: '#6c7086', fn: '#89b4fa', pun: '#94a3b8', bar: '#181825', gutter: '#585b70', frame: ['#f38ba8', '#f9e2af', '#a6e3a1'] },
    github: { name: 'GitHub light', bg: '#ffffff', fg: '#24292f', kw: '#cf222e', str: '#0a3069', num: '#0550ae', com: '#6e7781', fn: '#8250df', pun: '#57606a', bar: '#f6f8fa', gutter: '#8c959f', frame: ['#ff5f57', '#febc2e', '#28c840'] },
    monokai:{ name: 'Monokai', bg: '#272822', fg: '#f8f8f2', kw: '#f92672', str: '#e6db74', num: '#ae81ff', com: '#75715e', fn: '#a6e22e', pun: '#f8f8f2', bar: '#1e1f1a', gutter: '#75715e', frame: ['#ff5f57', '#febc2e', '#28c840'] },
    nord:   { name: 'Nord', bg: '#2e3440', fg: '#d8dee9', kw: '#81a1c1', str: '#a3be8c', num: '#b48ead', com: '#616e88', fn: '#88c0d0', pun: '#eceff4', bar: '#272c36', gutter: '#4c566a', frame: ['#bf616a', '#ebcb8b', '#a3be8c'] },
    solar:  { name: 'Solarized light', bg: '#fdf6e3', fg: '#657b83', kw: '#859900', str: '#2aa198', num: '#d33682', com: '#93a1a1', fn: '#268bd2', pun: '#586e75', bar: '#eee8d5', gutter: '#93a1a1', frame: ['#dc322f', '#b58900', '#859900'] }
  };
  var SHOT_BACKGROUNDS = { indigo: ['#6366f1', '#a855f7'], sunset: ['#f97316', '#ec4899'], ocean: ['#06b6d4', '#3b82f6'], forest: ['#10b981', '#84cc16'], slate: ['#334155', '#0f172a'], none: null };
  var KEYWORDS = {
    js: 'const let var function return if else for while do switch case break continue new class extends import export from default async await try catch finally throw typeof instanceof this null undefined true false of in yield static get set delete void super',
    ts: 'const let var function return if else for while do switch case break continue new class extends import export from default async await try catch finally throw typeof instanceof this null undefined true false of in yield static get set delete void super interface type enum implements public private protected readonly namespace declare as keyof',
    python: 'def class return if elif else for while in not and or is None True False import from as with try except finally raise lambda yield pass break continue global nonlocal assert del async await print self',
    bash: 'if then else elif fi for while do done case esac function return in echo exit export local read set unset source sudo cd ls rm cp mv mkdir cat grep sed awk curl',
    sql: 'select from where and or not insert into values update set delete create table drop alter join inner left right outer on group by order having limit offset as distinct union all null is in like between exists primary key foreign references index view case when then else end count sum avg min max',
    css: 'important', html: '', json: 'true false null', go: 'package import func return if else for range var const type struct interface map chan go defer select switch case break continue default nil true false',
    rust: 'fn let mut pub struct enum impl trait for in if else match return use mod crate self Self where loop while break continue as const static ref move async await dyn Box Vec Option Some None Result Ok Err true false',
    java: 'public private protected class interface extends implements static final void int long double float boolean char String new return if else for while do switch case break continue try catch finally throw throws import package this super null true false abstract enum',
    csharp: 'public private protected internal class interface struct enum static readonly void int long double float bool char string var new return if else for foreach while do switch case break continue try catch finally throw using namespace this base null true false async await get set',
    plain: ''
  };
  function tokenize(code, lang) {
    var kw = {}; (KEYWORDS[lang] || '').split(' ').forEach(function (k) { if (k) kw[k] = 1; });
    var out = [], i = 0, s = code;
    var lineComment = lang === 'python' || lang === 'bash' ? '#' : lang === 'sql' ? '--' : lang === 'css' || lang === 'html' || lang === 'json' || lang === 'plain' ? null : '//';
    while (i < s.length) {
      var ch = s[i], rest = s.slice(i), m;
      if (ch === '\n') { out.push(['nl', '\n']); i++; continue; }
      if (lang === 'html' && rest.indexOf('<!--') === 0) { var e = rest.indexOf('-->'); m = e < 0 ? rest : rest.slice(0, e + 3); out.push(['com', m]); i += m.length; continue; }
      if (lang !== 'python' && lang !== 'bash' && lang !== 'plain' && lang !== 'json' && rest.indexOf('/*') === 0) { var e2 = rest.indexOf('*/'); m = e2 < 0 ? rest : rest.slice(0, e2 + 2); out.push(['com', m]); i += m.length; continue; }
      if (lineComment && rest.indexOf(lineComment) === 0) { m = /^[^\n]*/.exec(rest)[0]; out.push(['com', m]); i += m.length; continue; }
      if (lang === 'python' && (rest.indexOf('"""') === 0 || rest.indexOf("'''") === 0)) { var q3 = rest.slice(0, 3), e3 = rest.indexOf(q3, 3); m = e3 < 0 ? rest : rest.slice(0, e3 + 3); out.push(['str', m]); i += m.length; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { m = new RegExp('^' + ch + '(?:\\\\.|[^' + ch + '\\\\\\n])*' + ch + '?').exec(rest)[0]; out.push(['str', m]); i += m.length; continue; }
      if (lang === 'html' && (m = /^<\/?[A-Za-z][^\s>\/]*/.exec(rest))) { out.push(['kw', m[0]]); i += m[0].length; continue; }
      if (lang === 'css' && (m = /^[.#][A-Za-z_-][\w-]*/.exec(rest))) { out.push(['fn', m[0]]); i += m[0].length; continue; }
      if (lang === 'css' && (m = /^[a-z-]+(?=\s*:)/.exec(rest))) { out.push(['kw', m[0]]); i += m[0].length; continue; }
      if ((m = /^(?:0x[\da-fA-F]+|\d+\.?\d*(?:e[+-]?\d+)?)(?:px|em|rem|%|ms|s|deg|vh|vw)?/.exec(rest))) { out.push(['num', m[0]]); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_$@][\w$]*/.exec(rest))) {
        var w = m[0], after = s.slice(i + w.length);
        if (lang === 'json') out.push([/^\s*:/.test(after) ? 'fn' : kw[w] ? 'kw' : 'id', w]);
        else out.push([kw[w] || (lang === 'sql' && kw[w.toLowerCase()]) ? 'kw' : /^\s*\(/.test(after) ? 'fn' : 'id', w]);
        i += w.length; continue;
      }
      if ((m = /^\s+/.exec(rest))) { out.push(['ws', m[0]]); i += m[0].length; continue; }
      out.push(['pun', ch]); i++;
    }
    return out;
  }
  function guessLang(code) {
    if (/^\s*[\[{][\s\S]*[\]}]\s*$/.test(code) && /"[^"]*"\s*:/.test(code)) return 'json';
    if (/<\/?[a-z][\s\S]*>/i.test(code) && /<\/(div|p|html|body|span|a|ul|li|h\d)>/i.test(code)) return 'html';
    if (/^\s*(def |class |import |from .+ import|print\()/m.test(code) && !/[;{]\s*$/m.test(code)) return 'python';
    if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)\b/im.test(code)) return 'sql';
    if (/^\s*(#!\/bin\/|\$ |sudo |apt |npm |git |echo )/m.test(code)) return 'bash';
    if (/^\s*[.#a-z][\w-]*\s*\{[\s\S]*:\s*[^;]+;/m.test(code) && !/function|=>/.test(code)) return 'css';
    if (/\b(func |package main|:=)/.test(code)) return 'go';
    if (/\b(fn |let mut|impl |pub fn)/.test(code)) return 'rust';
    if (/\b(public static void|System\.out)/.test(code)) return 'java';
    if (/\b(interface \w+ \{|: string|: number|<T>)/.test(code)) return 'ts';
    return 'js';
  }

  reg({
    id: 'code-screenshot', name: 'Code Screenshot',
    description: 'Turn a snippet into a polished PNG with syntax colours, a window frame and a gradient backdrop, like Carbon.',
    keywords: ['code screenshot', 'carbon', 'snippet image', 'syntax highlight', 'share code', 'png', 'twitter', 'presentation', 'ray.so', 'pretty code'],
    render: function (root) {
      var code = ta("function greet(name) {\n  // say hello\n  const message = `Hello, ${name}!`;\n  console.log(message);\n  return message.length > 0;\n}\n\ngreet('world');", 'Paste code here…', 'tall');
      var lang = U.select({ options: [{ value: 'auto', label: 'Auto-detect' }, { value: 'js', label: 'JavaScript' }, { value: 'ts', label: 'TypeScript' }, { value: 'python', label: 'Python' }, { value: 'html', label: 'HTML' }, { value: 'css', label: 'CSS' }, { value: 'json', label: 'JSON' }, { value: 'bash', label: 'Shell' }, { value: 'sql', label: 'SQL' }, { value: 'go', label: 'Go' }, { value: 'rust', label: 'Rust' }, { value: 'java', label: 'Java' }, { value: 'csharp', label: 'C#' }, { value: 'plain', label: 'Plain text' }], value: 'auto' });
      var theme = U.select({ options: Object.keys(SHOT_THEMES).map(function (k) { return { value: k, label: SHOT_THEMES[k].name }; }), value: 'dark' });
      var bg = U.select({ options: Object.keys(SHOT_BACKGROUNDS).map(function (k) { return { value: k, label: k === 'none' ? 'No background' : k.charAt(0).toUpperCase() + k.slice(1) }; }), value: 'indigo' });
      var title = el('input', { type: 'text', value: 'greet.js', placeholder: 'Window title (optional)', spellcheck: false });
      var fontSize = el('input', { type: 'range', min: 11, max: 24, value: 15 });
      var padding = el('input', { type: 'range', min: 0, max: 96, value: 48 });
      var lineNos = U.checkbox('Line numbers', { checked: true });
      var frame = U.checkbox('Window frame', { checked: true });
      var canvas = el('canvas');
      var wrap = el('div', { class: 'shot-wrap' }, canvas);
      var info = U.note('');
      var detected = U.note('');

      function draw() {
        var t = SHOT_THEMES[theme.value], L = lang.value === 'auto' ? guessLang(code.value) : lang.value;
        detected.textContent = lang.value === 'auto' ? 'Detected: ' + (L === 'js' ? 'JavaScript' : L) : '';
        var fs = +fontSize.value, lh = Math.round(fs * 1.55), pad = +padding.value, scale = 2;
        var font = fs + 'px ' + 'ui-monospace, "Cascadia Mono", "JetBrains Mono", Menlo, Consolas, monospace';
        var ctx = canvas.getContext('2d');
        ctx.font = font;
        var lines = code.value.replace(/\t/g, '    ').split('\n');
        var gutter = lineNos.input.checked ? ctx.measureText(String(lines.length)).width + fs * 1.6 : 0;
        var widest = 0; lines.forEach(function (l) { widest = Math.max(widest, ctx.measureText(l).width); });
        var inner = 28, cardW = Math.max(320, Math.ceil(widest + gutter + inner * 2)), barH = frame.input.checked ? 40 : 0;
        var cardH = Math.ceil(lines.length * lh + inner * 2 + barH);
        var W = cardW + pad * 2, H = cardH + pad * 2;
        canvas.width = W * scale; canvas.height = H * scale;
        canvas.style.width = Math.min(W, 900) + 'px';
        ctx = canvas.getContext('2d'); ctx.scale(scale, scale);
        var g = SHOT_BACKGROUNDS[bg.value];
        if (g) { var grad = ctx.createLinearGradient(0, 0, W, H); grad.addColorStop(0, g[0]); grad.addColorStop(1, g[1]); ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H); }
        else ctx.clearRect(0, 0, W, H);
        /* card with shadow */
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
        ctx.fillStyle = t.bg; roundRect(ctx, pad, pad, cardW, cardH, 12); ctx.fill(); ctx.restore();
        if (frame.input.checked) {
          ctx.save(); roundRect(ctx, pad, pad, cardW, cardH, 12); ctx.clip(); ctx.fillStyle = t.bar; ctx.fillRect(pad, pad, cardW, barH); ctx.restore();
          t.frame.forEach(function (c, i) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(pad + 22 + i * 20, pad + barH / 2, 6, 0, Math.PI * 2); ctx.fill(); });
          if (title.value.trim()) { ctx.fillStyle = t.gutter; ctx.font = '500 ' + (fs - 2) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(title.value.trim(), pad + cardW / 2, pad + barH / 2); }
        }
        ctx.font = font; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        var x0 = pad + inner + gutter, y0 = pad + barH + inner + lh / 2;
        if (gutter) { ctx.fillStyle = t.gutter; ctx.textAlign = 'right'; lines.forEach(function (_, i) { ctx.fillText(String(i + 1), pad + inner + gutter - fs * 1.1, y0 + i * lh); }); ctx.textAlign = 'left'; }
        var x = x0, y = y0, colors = { kw: t.kw, str: t.str, num: t.num, com: t.com, fn: t.fn, pun: t.pun, id: t.fg, ws: t.fg };
        tokenize(code.value.replace(/\t/g, '    '), L).forEach(function (tk) {
          if (tk[0] === 'nl') { x = x0; y += lh; return; }
          var parts = tk[1].split('\n');
          parts.forEach(function (p, i) {
            if (i) { x = x0; y += lh; }
            ctx.fillStyle = colors[tk[0]] || t.fg; ctx.fillText(p, x, y); x += ctx.measureText(p).width;
          });
        });
        info.textContent = (W * scale) + ' × ' + (H * scale) + ' px (2× for sharp text)';
      }
      function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
      function blob() { return new Promise(function (res, rej) { canvas.toBlob(function (b) { b ? res(b) : rej(new Error('Could not encode')); }, 'image/png'); }); }
      U.live([code, lang, theme, bg, title, fontSize, padding, lineNos, frame], draw);
      root.appendChild(U.split(
        U.panel('Code', code, detected),
        U.panel('Style', U.row(U.field('Language', lang), U.field('Theme', theme), U.field('Background', bg)), U.field('Title', title),
          U.row(U.field('Font size', fontSize), U.field('Padding', padding)), U.row(lineNos, frame))));
      root.appendChild(U.panel('Preview', wrap, info, U.btnrow(
        U.button('Download PNG', function () { blob().then(function (b) { U.saveBlob((title.value.trim() || 'code').replace(/[^\w.-]+/g, '-') + '.png', b); }); }, 'primary'),
        U.button('Copy image', function () { blob().then(function (b) { return navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); }).then(function () { U.toast('Copied'); }).catch(function () { U.toast('This browser cannot copy images. Download instead.', 'err'); }); }))));
    }
  });

  /* ======================================================================
     Regex Explainer
     ====================================================================== */

  var ESCAPES = { d: 'a digit (0-9)', D: 'anything but a digit', w: 'a word character (letter, digit or underscore)', W: 'anything but a word character', s: 'whitespace (space, tab, newline…)', S: 'anything but whitespace',
    b: 'a word boundary', B: 'not a word boundary', n: 'a newline', r: 'a carriage return', t: 'a tab', v: 'a vertical tab', f: 'a form feed', '0': 'a NUL character' };

  function parseRegex(src, flags) {
    var i = 0, groupCount = 0, names = [];
    function peek() { return src[i]; }
    function next() { return src[i++]; }
    function parseAlternation() {
      var alts = [parseSequence()];
      while (peek() === '|') { next(); alts.push(parseSequence()); }
      return alts.length === 1 ? alts[0] : { type: 'alt', alts: alts };
    }
    function parseSequence() {
      var items = [];
      while (i < src.length && peek() !== '|' && peek() !== ')') items.push(parseQuantified());
      return { type: 'seq', items: items };
    }
    function parseQuantified() {
      var atom = parseAtom(), m;
      var rest = src.slice(i);
      if ((m = /^(\*|\+|\?|\{(\d+)(,(\d*))?\})(\?)?/.exec(rest))) {
        i += m[0].length;
        var q = { type: 'quant', atom: atom, lazy: !!m[5], raw: m[1] };
        if (m[1] === '*') { q.min = 0; q.max = Infinity; } else if (m[1] === '+') { q.min = 1; q.max = Infinity; } else if (m[1] === '?') { q.min = 0; q.max = 1; }
        else { q.min = +m[2]; q.max = m[3] ? (m[4] ? +m[4] : Infinity) : +m[2]; }
        return q;
      }
      return atom;
    }
    function parseAtom() {
      var ch = next();
      if (ch === '(') {
        var g = { type: 'group', capture: true };
        if (peek() === '?') {
          next(); var k = next();
          if (k === ':') g.capture = false;
          else if (k === '=') { g.look = 'ahead'; g.capture = false; }
          else if (k === '!') { g.look = 'ahead'; g.negative = true; g.capture = false; }
          else if (k === '<') {
            if (peek() === '=') { next(); g.look = 'behind'; g.capture = false; }
            else if (peek() === '!') { next(); g.look = 'behind'; g.negative = true; g.capture = false; }
            else { var nm = ''; while (i < src.length && peek() !== '>') nm += next(); next(); g.name = nm; names.push(nm); }
          } else throw new Error('Unknown group type at position ' + (i - 1));
        }
        if (g.capture) g.index = ++groupCount;
        g.body = parseAlternation();
        if (next() !== ')') throw new Error('Missing closing bracket for a group');
        return g;
      }
      if (ch === '[') return parseClass();
      if (ch === '.') return { type: 'any' };
      if (ch === '^') return { type: 'anchor', which: 'start' };
      if (ch === '$') return { type: 'anchor', which: 'end' };
      if (ch === '\\') return parseEscape();
      if (ch === undefined) throw new Error('Unexpected end of pattern');
      if (ch === ')') throw new Error('Unmatched closing bracket');
      if (/[*+?]/.test(ch)) throw new Error('Nothing to repeat at position ' + (i - 1));
      return { type: 'char', ch: ch };
    }
    function parseEscape() {
      var ch = next(), m;
      if (ch === undefined) throw new Error('Pattern ends with a backslash');
      if (/[1-9]/.test(ch)) { var n = ch; while (/\d/.test(peek() || '')) n += next(); return { type: 'backref', index: +n }; }
      if (ch === 'k' && peek() === '<') { next(); var nm = ''; while (peek() !== '>') nm += next(); next(); return { type: 'backref', name: nm }; }
      if (ch === 'x' && (m = /^[0-9a-fA-F]{2}/.exec(src.slice(i)))) { i += 2; return { type: 'char', ch: String.fromCharCode(parseInt(m[0], 16)), esc: '\\x' + m[0] }; }
      if (ch === 'u' && (m = /^[0-9a-fA-F]{4}/.exec(src.slice(i)))) { i += 4; return { type: 'char', ch: String.fromCharCode(parseInt(m[0], 16)), esc: '\\u' + m[0] }; }
      if (ch === 'u' && peek() === '{') { var hex = ''; next(); while (peek() !== '}') hex += next(); next(); return { type: 'char', ch: String.fromCodePoint(parseInt(hex, 16)), esc: '\\u{' + hex + '}' }; }
      if (ch === 'p' || ch === 'P') { if (peek() === '{') { var prop = ''; next(); while (peek() !== '}') prop += next(); next(); return { type: 'esc', text: (ch === 'P' ? 'anything but ' : '') + 'a character with the Unicode property ' + prop, raw: '\\' + ch + '{' + prop + '}' }; } }
      if (ESCAPES[ch]) return { type: 'esc', text: ESCAPES[ch], raw: '\\' + ch };
      return { type: 'char', ch: ch, esc: '\\' + ch };
    }
    function parseClass() {
      var neg = false, items = [];
      if (peek() === '^') { neg = true; next(); }
      var first = true;
      while (i < src.length && (peek() !== ']' || first)) {
        first = false;
        var a = classAtom();
        if (peek() === '-' && src[i + 1] !== ']' && i + 1 < src.length && a.type === 'char') {
          next(); var b = classAtom();
          if (b.type !== 'char') { items.push(a); items.push({ type: 'char', ch: '-' }); items.push(b); }
          else items.push({ type: 'range', from: a.ch, to: b.ch });
        } else items.push(a);
      }
      if (next() !== ']') throw new Error('Missing closing ] for a character class');
      return { type: 'class', negative: neg, items: items };
    }
    function classAtom() {
      var ch = next();
      if (ch === '\\') { var e = parseEscape(); if (e.type === 'esc' && e.raw === '\\b') return { type: 'char', ch: '\b', esc: '\\b (backspace)' }; return e; }
      return { type: 'char', ch: ch };
    }
    var ast = parseAlternation();
    if (i < src.length) throw new Error('Unmatched closing bracket at position ' + i);
    return { ast: ast, groups: groupCount, names: names };
  }

  function showChar(c) {
    if (c === ' ') return 'a space';
    if (c === '\n') return 'a newline'; if (c === '\t') return 'a tab'; if (c === '\r') return 'a carriage return';
    return '"' + c + '"';
  }
  function describe(node, flags) {
    var li = el('li'), code = function (t) { return el('code', { text: t }); };
    function quantText(q) {
      var n = q.min === q.max ? 'exactly ' + q.min + (q.min === 1 ? ' time' : ' times') : q.max === Infinity ? (q.min === 0 ? 'zero or more times' : q.min === 1 ? 'one or more times' : q.min + ' or more times') : q.min === 0 && q.max === 1 ? 'zero or one time (optional)' : 'between ' + q.min + ' and ' + q.max + ' times';
      return n + (q.lazy ? ', as few as possible (lazy)' : q.max !== q.min && q.max > 1 ? ', as many as possible (greedy)' : '');
    }
    switch (node.type) {
      case 'seq':
        if (!node.items.length) { li.append('an empty match (matches nothing)'); return li; }
        if (node.items.length === 1) return describe(node.items[0], flags);
        /* collapse runs of plain characters into one literal */
        var ul = el('ul'), run = '';
        function flush() { if (run) { ul.appendChild(el('li', {}, code(run), 'the text ' + showChar(run).replace(/^a /, '') + (flags.i ? ' (any case)' : ''))); run = ''; } }
        node.items.forEach(function (it) { if (it.type === 'char' && !it.esc) run += it.ch; else { flush(); ul.appendChild(describe(it, flags)); } });
        flush();
        li.append('in order:', ul); return li;
      case 'alt':
        var ul2 = el('ul'); node.alts.forEach(function (a) { ul2.appendChild(describe(a, flags)); });
        li.append(el('span', { class: 'q', text: 'either' }), ' one of these alternatives (tried left to right):', ul2); return li;
      case 'char':
        li.append(code(node.esc || node.ch), showChar(node.ch) + (node.esc && !/^\\[xu]/.test(node.esc) ? ' (escaped, taken literally)' : '')); return li;
      case 'any':
        li.append(code('.'), flags.s ? 'any character at all' : 'any character except a line break'); return li;
      case 'anchor':
        li.append(code(node.which === 'start' ? '^' : '$'), node.which === 'start' ? (flags.m ? 'the start of a line' : 'the start of the text') : (flags.m ? 'the end of a line' : 'the end of the text')); return li;
      case 'esc':
        li.append(code(node.raw), node.text); return li;
      case 'backref':
        li.append(code(node.name ? '\\k<' + node.name + '>' : '\\' + node.index), 'the same text that group ' + (node.name ? '"' + node.name + '"' : node.index) + ' captured'); return li;
      case 'class':
        var parts = node.items.map(function (it) {
          if (it.type === 'range') return showChar(it.from).replace(/^a /, '') + ' to ' + showChar(it.to).replace(/^a /, '');
          if (it.type === 'esc') return it.text;
          return showChar(it.ch).replace(/^a /, '');
        });
        li.append(code(rawOf(node)), (node.negative ? 'any character except: ' : 'one character from: ') + parts.join(', ')); return li;
      case 'group':
        var ul3 = el('ul'); ul3.appendChild(describe(node.body, flags));
        var label = node.look ? (node.negative ? 'only if what follows is NOT' : 'only if what follows is') : node.capture ? 'group ' + node.index + (node.name ? ' "' + node.name + '"' : '') + ' captures' : 'a group (not captured) of';
        if (node.look === 'behind') label = node.negative ? 'only if what comes BEFORE is NOT' : 'only if what comes before is';
        li.append(el('span', { class: 'q', text: label }), ':', ul3); return li;
      case 'quant':
        var inner = describe(node.atom, flags);
        li.append(el('span', { class: 'q', text: quantText(node) }), ' the following:', el('ul', {}, inner)); return li;
    }
    li.textContent = JSON.stringify(node); return li;
  }
  function rawOf(node) {
    return '[' + (node.negative ? '^' : '') + node.items.map(function (it) {
      if (it.type === 'range') return it.from + '-' + it.to;
      if (it.type === 'esc') return it.raw;
      return it.esc && !/backspace/.test(it.esc) ? it.esc : it.ch;
    }).join('') + ']';
  }

  reg({
    id: 'regex-explainer', name: 'Regex Explainer',
    description: 'Paste a regular expression and read, piece by piece, what it matches, with a live test box.',
    keywords: ['regex', 'regular expression', 'explain', 'explainer', 'plain english', 'pattern', 'decode regex', 'what does this regex do', 'regex101'],
    render: function (root) {
      var pattern = el('input', { type: 'text', value: '^(?<user>[\\w.+-]+)@([\\w-]+\\.)+[a-z]{2,}$', spellcheck: false, style: { fontFamily: 'var(--mono)', fontSize: '15px' }, 'aria-label': 'Pattern' });
      var flagsIn = el('input', { type: 'text', value: 'gim', maxLength: 7, spellcheck: false, style: { width: '80px', fontFamily: 'var(--mono)' }, 'aria-label': 'Flags' });
      var tree = el('ul', { class: 'tree' });
      var summary = el('div', { class: 'kv' });
      var status = U.note('');
      var sample = ta('ada.lovelace@example.co.uk\nnot an email\nbob+news@mail-server.org', 'Text to test against…');
      var matches = el('div', { class: 'code', style: { whiteSpace: 'pre-wrap' } });
      var presets = [['Email', '^[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+$', 'i'], ['URL', 'https?:\\/\\/[^\\s/$.?#].[^\\s]*', 'gi'], ['UK postcode', '^[A-Z]{1,2}\\d[A-Z\\d]? ?\\d[A-Z]{2}$', 'i'], ['Date (ISO)', '^(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$', ''], ['IPv4', '^(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)$', ''], ['Hex colour', '#(?:[0-9a-f]{3}){1,2}\\b', 'gi'], ['Strong password', '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\w\\s]).{8,}$', '']];

      function run() {
        var src = pattern.value, fl = flagsIn.value.replace(/[^dgimsuyv]/g, '');
        flagsIn.value = fl;
        var flags = {}; fl.split('').forEach(function (f) { flags[f] = true; });
        tree.replaceChildren(); summary.replaceChildren(); matches.replaceChildren();
        if (!src) { status.textContent = 'Type a pattern.'; return; }
        var re;
        try { re = new RegExp(src, fl); } catch (e) { status.className = 'note err'; status.textContent = e.message; return; }
        try {
          var parsed = parseRegex(src, flags);
          tree.appendChild(describe(parsed.ast, flags));
          var flagText = { g: 'global (find every match, not just the first)', i: 'ignore case', m: 'multiline (^ and $ match at line breaks)', s: 'dot-all (. also matches newlines)', u: 'unicode', y: 'sticky (match only at lastIndex)', d: 'indices', v: 'unicode sets' };
          summary.append(el('b', { text: 'Pattern' }), el('code', { text: '/' + src + '/' + fl }),
            el('b', { text: 'Flags' }), el('span', { text: fl ? fl.split('').map(function (f) { return f + ' = ' + flagText[f]; }).join('; ') : 'none' }),
            el('b', { text: 'Capturing groups' }), el('span', { text: parsed.groups + (parsed.names.length ? ' (named: ' + parsed.names.join(', ') + ')' : '') }));
          status.className = 'note'; status.textContent = '';
        } catch (e) { status.className = 'note err'; status.textContent = 'Could not explain: ' + e.message; }
        /* test */
        var text = sample.value, gre = new RegExp(src, fl.indexOf('g') > -1 ? fl : fl + 'g'), m, last = 0, count = 0, frag = document.createDocumentFragment();
        while ((m = gre.exec(text)) && count < 500) {
          if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
          frag.appendChild(el('span', { class: 'hit', title: m.length > 1 ? m.slice(1).map(function (g, k) { return 'group ' + (k + 1) + ': ' + g; }).join('\n') : '', text: m[0] }));
          last = m.index + m[0].length; count++;
          if (!m[0].length) { gre.lastIndex++; }
        }
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        matches.appendChild(frag);
        matchCount.textContent = count + (count === 1 ? ' match' : ' matches') + (fl.indexOf('g') === -1 && count > 1 ? ' (only the first is used without the g flag)' : '');
      }
      var matchCount = U.note('');
      U.live([pattern, flagsIn, sample], run);
      root.appendChild(U.panel(null, U.row(U.field('Pattern', pattern), U.field('Flags', flagsIn)),
        el('div', { class: 'chips' }, presets.map(function (p) { return el('button', { type: 'button', class: 'chip', onclick: function () { pattern.value = p[1]; flagsIn.value = p[2]; run(); } }, p[0]); })), status));
      root.appendChild(U.split(U.panel('Explanation', summary, tree), U.panel('Test it', sample, matchCount, matches)));
    }
  });

  window.DevCKit = { parseCurl: parseCurl, shellTokens: shellTokens, toFetch: toFetch, toPython: toPython, parseRegex: parseRegex, tokenize: tokenize, symbolicToOctal: symbolicToOctal, octalToSymbolic: octalToSymbolic };
})();
