/* crypto-d tools: Password Manager. Logins live in an encrypted vault that is
   kept in this browser (localStorage) and can be downloaded as a .vault file:
   the same encrypted envelope, so it is safe to keep anywhere. Opening a
   .vault file can merge it into the browser's copy, which is how a vault
   moves between computers.

   The .vault format is JSON:
     { format: 'all-the-tools-vault', version: 1, id, revision, saved,
       kdf: { name: 'PBKDF2-SHA-256', iterations, salt },
       cipher: { name: 'AES-256-GCM', iv }, data }
   salt, iv and data are base64. The key is PBKDF2-SHA-256 over the master
   password (NFC-normalised, UTF-8) with the salt, and data is AES-256-GCM
   over the JSON { entries, deleted, saved }, with every other field bound
   in as additional data (see aadFor) so none of them can be changed
   unnoticed.

   Merging goes by entry id: the copy with the later `updated` wins, and
   `deleted` keeps the time each entry was deleted, so a deletion on one copy
   carries over to the other unless the entry was edited after it.

   Uses CryptoKit from crypto.js for scoring, generating and the breach
   check. */
(function () {
  'use strict';
  var U = window.UI, el = U.el, CK = window.CryptoKit || {};

  if (!document.getElementById('g-crypto-d-style')) {
    document.head.appendChild(el('style', { id: 'g-crypto-d-style', text: [
      '.g-pm [hidden]{display:none!important}',
      '.g-pm .pm-head{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}',
      '.g-pm .pm-head h3{margin:0}',
      '.g-pm .pm-status{font-size:13px;color:var(--fg-muted)}',
      '.g-pm .pm-warn{padding:10px 12px;border-radius:var(--radius-s);border:1px solid var(--warn);color:var(--warn);background:var(--bg-sunken);font-size:13px;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;justify-content:space-between}',
      '.g-pm .pm-list{display:flex;flex-direction:column;gap:6px}',
      '.g-pm .pm-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;border:1px solid var(--border);border-radius:var(--radius);padding:8px 10px;background:var(--bg-elev)}',
      '.g-pm .pm-av{flex:none;width:34px;height:34px;border-radius:8px;display:grid;place-items:center;color:#fff;font-weight:700;font-size:15px}',
      '.g-pm .pm-main{flex:1 1 180px;min-width:0}',
      '.g-pm .pm-main.link{cursor:pointer}',
      '.g-pm .pm-main b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.g-pm .pm-main>span{display:block;font-size:12px;color:var(--fg-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.g-pm .pm-acts{display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end}',
      '.g-pm .pm-acts .btn{padding:4px 9px;font-size:12px}',
      '.g-pm .pm-flag{display:inline-block;font-size:11px;font-weight:700;padding:0 6px;border-radius:9px;border:1px solid currentColor;margin-left:6px;vertical-align:1px}',
      '.g-pm .pm-flag.bad{color:var(--err)}',
      '.g-pm .pm-flag.meh{color:var(--warn)}',
      '.g-pm .pm-pw{display:flex;gap:6px;align-items:center}',
      '.g-pm .pm-pw input{flex:1;min-width:0;font-family:var(--mono)}',
      '.g-pm .pm-tag{font-size:12px;font-weight:700}',
      '.g-pm .btn.pm-danger{color:var(--err);border-color:var(--err)}',
      '.g-pm .pm-group{border:1px solid var(--border);border-radius:var(--radius);padding:8px 10px;display:flex;flex-direction:column;gap:6px}',
      '.g-pm .pm-group h4{margin:0;font-size:13px}',
      '.g-pm .pm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px 12px}',
      '.g-pm .row>.pm-folder{flex:0 1 220px;width:auto;min-width:0}',
      '.g-pm .pm-search{flex:1 1 220px;min-width:0}',
      '.g-pm textarea{min-height:90px}'
    ].join('\n') }));
  }

  var STORE = 'att:vault', PREFS = 'att:vault-prefs';
  var FORMAT = 'all-the-tools-vault', VERSION = 1, ITER = 600000, MIN_ITER = 100000, MAX_ITER = 10000000;
  var AUTOLOCK = [1, 5, 15, 30, 60];
  var enc = new TextEncoder(), dec = new TextDecoder();

  function toB64(b) { var s = ''; for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }
  function fromB64(t) {
    if (typeof t !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(t)) throw new Error('not base64');
    var s = atob(t), b = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  }
  function randomBytes(n) { var b = new Uint8Array(n); crypto.getRandomValues(b); return b; }
  function randomHex(n) { var b = randomBytes(n), s = ''; for (var i = 0; i < n; i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16); return s; }
  function now() { return Date.now(); }
  function plural(n, word) { return n.toLocaleString('en-GB') + ' ' + word + (n === 1 ? '' : 's'); }
  function fmtDate(t) { return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function fmtWhen(t) {
    var d = new Date(t);
    return isNaN(d) ? 'an unknown date' : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  /* --- the envelope ----------------------------------------------------------- */

  function needSubtle() {
    if (!window.crypto || !crypto.subtle) throw new Error('The password manager needs WebCrypto, which browsers only offer over http(s). Run "python serve.py" and open the page from there.');
  }

  function deriveKey(password, salt, iterations) {
    needSubtle();
    return crypto.subtle.importKey('raw', enc.encode(String(password).normalize('NFC')), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' }, base,
          { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      });
  }

  function aadFor(env) {
    return enc.encode(JSON.stringify([env.format, env.version, env.id, env.revision, env.saved,
      env.kdf.name, env.kdf.iterations, env.kdf.salt, env.cipher.name, env.cipher.iv]));
  }

  /* Encrypt an open vault into a fresh envelope, with a new IV every time. */
  function seal(v) {
    needSubtle();
    var saved = new Date().toISOString(), iv = randomBytes(12);
    var env = { format: FORMAT, version: VERSION, id: v.id, revision: v.revision, saved: saved,
      kdf: { name: 'PBKDF2-SHA-256', iterations: v.iterations, salt: toB64(v.salt) },
      cipher: { name: 'AES-256-GCM', iv: toB64(iv) } };
    var plain = enc.encode(JSON.stringify({ entries: v.entries, deleted: v.deleted, saved: saved }));
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: aadFor(env) }, v.key, plain)
      .then(function (ct) { env.data = toB64(new Uint8Array(ct)); return env; });
  }

  function parseEnvelope(text) {
    var env;
    try { env = JSON.parse(text); } catch (e) { env = null; }
    if (!env || typeof env !== 'object' || env.format !== FORMAT) throw new Error('This isn’t a .vault file from this password manager.');
    if (env.version !== VERSION) throw new Error('This vault was saved by a newer version of this tool (format ' + env.version + ').');
    var kdf = env.kdf || {}, cipher = env.cipher || {};
    var ok = typeof env.id === 'string' && /^[0-9a-f]{16,64}$/.test(env.id) && Number.isInteger(env.revision) && env.revision >= 0 &&
      typeof env.saved === 'string' && kdf.name === 'PBKDF2-SHA-256' && Number.isInteger(kdf.iterations) &&
      kdf.iterations >= MIN_ITER && kdf.iterations <= MAX_ITER && cipher.name === 'AES-256-GCM' && typeof env.data === 'string';
    if (ok) {
      try { ok = fromB64(kdf.salt).length >= 16 && fromB64(cipher.iv).length === 12 && fromB64(env.data).length >= 16; } catch (e) { ok = false; }
    }
    if (!ok) throw new Error('This .vault file is damaged or incomplete.');
    return env;
  }

  function decryptWith(env, key) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(env.cipher.iv), additionalData: aadFor(env) }, key, fromB64(env.data))
      .then(function (plain) { return JSON.parse(dec.decode(plain)); });
  }

  /* Unlock an envelope with a password. Resolves to an open vault. */
  function openEnvelope(env, password) {
    var salt = fromB64(env.kdf.salt);
    return deriveKey(password, salt, env.kdf.iterations).then(function (key) {
      return decryptWith(env, key).then(function (body) {
        return fromBody(body, { key: key, salt: salt, iterations: env.kdf.iterations, id: env.id, revision: env.revision });
      }, function () { throw new Error('That password doesn’t open this vault.'); });
    });
  }

  var TEXT_FIELDS = ['title', 'username', 'password', 'url', 'notes', 'folder'];

  function cleanEntry(e) {
    e = e && typeof e === 'object' ? e : {};
    var out = { id: typeof e.id === 'string' && e.id ? e.id : randomHex(8) };
    TEXT_FIELDS.forEach(function (f) { out[f] = e[f] === undefined || e[f] === null ? '' : String(e[f]); });
    out.created = typeof e.created === 'number' ? e.created : now();
    out.updated = typeof e.updated === 'number' ? e.updated : out.created;
    return out;
  }

  function fromBody(body, v) {
    v.entries = (body && Array.isArray(body.entries) ? body.entries : []).map(cleanEntry);
    v.deleted = {};
    var d = body && body.deleted;
    if (d && typeof d === 'object') Object.keys(d).forEach(function (id) { if (typeof d[id] === 'number') v.deleted[id] = d[id]; });
    return v;
  }

  /* Fold `theirs` into `mine`. Returns the merged entries and deletions and
     what changed in `mine`. */
  function mergeData(mine, theirs) {
    var deleted = Object.assign({}, mine.deleted);
    Object.keys(theirs.deleted || {}).forEach(function (id) { deleted[id] = Math.max(deleted[id] || 0, theirs.deleted[id]); });
    var out = [], at = Object.create(null), fromTheirs = Object.create(null), replaced = Object.create(null);
    mine.entries.forEach(function (e) { at[e.id] = out.length; out.push(e); });
    theirs.entries.forEach(function (e) {
      if (at[e.id] === undefined) { at[e.id] = out.length; out.push(e); fromTheirs[e.id] = true; }
      else if (e.updated > out[at[e.id]].updated) { out[at[e.id]] = e; replaced[e.id] = true; }
    });
    var kept = out.filter(function (e) { return !(deleted[e.id] >= e.updated); });
    var keptIds = Object.create(null);
    kept.forEach(function (e) { keptIds[e.id] = true; });
    return {
      entries: kept, deleted: deleted,
      added: kept.filter(function (e) { return fromTheirs[e.id]; }).length,
      updated: kept.filter(function (e) { return replaced[e.id]; }).length,
      removed: mine.entries.filter(function (e) { return !keptIds[e.id]; }).length
    };
  }

  /* --- this browser's copy ------------------------------------------------------ */

  var BLOCKED = 'This browser is blocking site storage, so a vault can’t be kept here. You can still open a .vault file and download your changes.';

  function readStored() {
    var text;
    try { text = localStorage.getItem(STORE); } catch (e) { return { blocked: true, error: BLOCKED }; }
    if (!text) return null;
    try { return { env: parseEnvelope(text), text: text }; } catch (e) { return { error: e.message, text: text }; }
  }

  function writeStored(env) {
    try { localStorage.setItem(STORE, JSON.stringify(env)); } catch (e) {
      throw new Error(e && e.name === 'QuotaExceededError' ? 'this browser’s storage is full' : 'this browser won’t let the page save anything');
    }
  }

  function prefs() { try { return JSON.parse(localStorage.getItem(PREFS)) || {}; } catch (e) { return {}; } }
  function setPref(k, value) {
    var p = prefs();
    p[k] = value;
    try { localStorage.setItem(PREFS, JSON.stringify(p)); } catch (e) { /* blocked storage */ }
  }
  function backupOf(id) { return (prefs().backups || {})[id] || null; }
  function noteBackup(id, revision) { var b = prefs().backups || {}; b[id] = { revision: revision, time: now() }; setPref('backups', b); }
  function autolockMins() { var m = +prefs().autolock; return AUTOLOCK.indexOf(m) > -1 ? m : 5; }

  /* Ask the browser not to clear this site's storage under pressure. */
  function askPersist() {
    try {
      if (navigator.storage && navigator.storage.persisted) {
        navigator.storage.persisted().then(function (p) { if (!p) return navigator.storage.persist(); }).catch(function () {});
      }
    } catch (e) { /* not supported */ }
  }

  /* --- the open vault --------------------------------------------------------------
     S is the unlocked vault: { key, salt, iterations, id, revision, entries,
     deleted, stored, breach }. `stored` is false for a vault opened from a
     file without keeping it here; that one lives in `loose` (still
     encrypted, and kept while locked) until it is downloaded or closed. */
  var S = null;
  var loose = null;   /* { env, fileName, downloaded: revision } */
  var views = [];     /* redraw functions of the manager panes on screen */
  var lockNote = '';
  var lastActive = now(), lockTimer = null;
  var saving = Promise.resolve();

  function refresh(kind) { views.slice().forEach(function (fn) { fn(kind); }); }
  function touch() { lastActive = now(); }

  function start(v) {
    if (v.stored) loose = null;
    S = v;
    lockNote = '';
    touch();
    if (!lockTimer) lockTimer = setInterval(function () {
      if (!S) { clearInterval(lockTimer); lockTimer = null; return; }
      var m = autolockMins();
      if (now() - lastActive > m * 60000) lock('Locked after ' + plural(m, 'minute') + ' without use.');
    }, 5000);
    refresh('lock');
  }

  function lock(note) {
    S = null;
    lockNote = note || '';
    refresh('lock');
  }

  /* Save the open vault after a change: to this browser, or, for a vault
     opened from a file without keeping it, to memory until it is
     downloaded. Saves run one after another. */
  function persist() {
    var v = S;
    v.revision++;
    var job = saving.then(function () {
      return v.stored ? storeVault(v) : seal(v).then(function (env) { if (loose) loose.env = env; });
    });
    saving = job.catch(function () {});
    job.catch(function (e) { U.toast('Not saved: ' + e.message, 'err'); });
    return job;
  }

  function storeVault(v) {
    return seal(v).then(function (env) {
      var cur = readStored();
      if (!cur || !cur.env || cur.env.id !== v.id) {
        lock('The vault in this browser was removed or replaced in another tab, so the last change wasn’t saved.');
        throw new Error('the vault was removed or replaced in another tab');
      }
      if (cur.env.revision >= env.revision) {
        /* Another tab saved first: fold its changes in and go again. */
        if (cur.env.kdf.salt !== env.kdf.salt) {
          lock('The master password was changed in another tab. Unlock with the new one.');
          throw new Error('the master password was changed in another tab');
        }
        return decryptWith(cur.env, v.key).then(function (body) {
          var m = mergeData(v, fromBody(body, {}));
          v.entries = m.entries; v.deleted = m.deleted; v.revision = cur.env.revision + 1;
          refresh('data');
          return storeVault(v);
        });
      }
      writeStored(env);
    });
  }

  /* Another tab saved: take its changes, or lock if the vault went away. */
  window.addEventListener('storage', function (e) {
    if (e.key !== STORE || !S || !S.stored) return;
    var v = S, cur = readStored();
    if (!cur || !cur.env || cur.env.id !== v.id) { lock('The vault in this browser was removed or replaced in another tab.'); return; }
    if (cur.env.revision <= v.revision) return;
    if (cur.env.kdf.salt !== toB64(v.salt)) { lock('The master password was changed in another tab. Unlock with the new one.'); return; }
    decryptWith(cur.env, v.key).then(function (body) {
      if (S !== v || cur.env.revision <= v.revision) return;
      var m = mergeData(v, fromBody(body, {}));
      v.entries = m.entries; v.deleted = m.deleted; v.revision = cur.env.revision;
      refresh('data');
    }).catch(function () { lock('The vault was changed in another tab. Unlock it again to load the changes.'); });
  });

  window.addEventListener('beforeunload', function (e) {
    if (loose && loose.env && loose.env.revision !== loose.downloaded) { e.preventDefault(); e.returnValue = ''; }
  });

  function fileName() { return 'passwords-' + new Date().toISOString().slice(0, 10) + '.vault'; }
  function saveEnvelope(env, name) { U.saveText(name || fileName(), JSON.stringify(env, null, 1) + '\n', 'application/json'); }

  function downloadOpen() {
    var v = S;
    return saving.then(function () { return seal(v); }).then(function (env) {
      saveEnvelope(env);
      if (v.stored) noteBackup(v.id, env.revision);
      else if (loose) { loose.env = env; loose.downloaded = env.revision; }
      refresh('data');
    }).catch(function (e) { U.toast(e.message, 'err'); });
  }

  /* Copied passwords are wiped from the clipboard after 30 seconds. */
  var clipTimer = null;
  function copySecret(text) {
    U.copy(text).then(function (ok) {
      if (!ok) return;
      clearTimeout(clipTimer);
      clipTimer = setTimeout(function () {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText('').catch(function () {});
      }, 30000);
    });
  }

  /* --- health ------------------------------------------------------------------------ */

  function weakReasons(pw) {
    var a = CK.analyse(pw), why = [];
    if (a.length < 10) why.push('only ' + plural(a.length, 'character'));
    if (a.score <= 4) why.push('rated ' + a.label.toLowerCase());
    if (!a.checks[6][1] && a.length < 20) why.push('contains a common word or pattern');
    return why;
  }

  function healthOf(entries) {
    var weak = [], groups = Object.create(null);
    entries.forEach(function (e) {
      if (!e.password) return;
      var why = weakReasons(e.password);
      if (why.length) weak.push({ entry: e, reasons: why });
      (groups[e.password] = groups[e.password] || []).push(e);
    });
    var reused = Object.keys(groups).map(function (k) { return groups[k]; }).filter(function (g) { return g.length > 1; });
    return { weak: weak, reused: reused };
  }

  /* Pwned Passwords counts for every distinct password, one request per
     distinct 5-character hash prefix, three at a time. */
  function checkBreaches(entries, onProgress) {
    var pws = [];
    entries.forEach(function (e) { if (e.password && pws.indexOf(e.password) === -1) pws.push(e.password); });
    return Promise.all(pws.map(function (pw) { return CK.sha1Hex(pw).then(function (h) { return [pw, h]; }); })).then(function (pairs) {
      var byPrefix = Object.create(null);
      pairs.forEach(function (p) { (byPrefix[p[1].slice(0, 5)] = byPrefix[p[1].slice(0, 5)] || []).push(p); });
      var prefixes = Object.keys(byPrefix), next = 0, done = 0, counts = new Map();
      function worker() {
        if (next >= prefixes.length) return Promise.resolve();
        var pre = prefixes[next++];
        return CK.pwnedRange(pre).then(function (text) {
          byPrefix[pre].forEach(function (p) { counts.set(p[0], CK.pwnedCountIn(text, p[1].slice(5))); });
          onProgress(++done, prefixes.length);
          return worker();
        });
      }
      return Promise.all([worker(), worker(), worker()]).then(function () { return counts; });
    });
  }

  /* --- importing from other password managers ----------------------------------------
     CSV exports differ only in their column names, so columns are matched
     by name (listed most likely first) and can be changed before importing. */
  var FIELDS = [
    { k: 'title', label: 'Name', names: ['name', 'title', 'account', 'accountname', 'itemname', 'displayname'] },
    { k: 'url', label: 'Website', names: ['url', 'loginuri', 'website', 'uri', 'loginurl', 'urls', 'hostname', 'address', 'site'] },
    { k: 'username', label: 'Username', names: ['username', 'loginusername', 'loginname', 'user', 'login', 'email', 'emailaddress', 'userid'] },
    { k: 'password', label: 'Password', names: ['password', 'loginpassword', 'pass', 'pwd'] },
    { k: 'notes', label: 'Notes', names: ['note', 'notes', 'comments', 'comment', 'extra', 'description'] },
    { k: 'folder', label: 'Folder', names: ['folder', 'group', 'grouping', 'category', 'vault', 'collection', 'tags', 'path'] },
    { k: 'totp', label: '2FA secret', names: ['totp', 'logintotp', 'otpauth', 'otpsecret', 'otp', 'authenticatorkey', 'twofactorsecret'] }
  ];
  /* Columns only one exporter writes, checked in this order. */
  var SOURCES = [
    ['Bitwarden', ['loginuri', 'loginusername', 'loginpassword']],
    ['LastPass', ['grouping', 'extra', 'fav']],
    ['Firefox', ['httprealm', 'formactionorigin']],
    ['Dashlane', ['username2', 'otpsecret']],
    ['Proton Pass', ['createtime', 'modifytime', 'vault']],
    ['NordPass', ['cardholdername']],
    ['1Password', ['title', 'url', 'username', 'password', 'otpauth', 'favorite', 'archived']],
    ['KeePassXC', ['group', 'title', 'username', 'password', 'url', 'notes']],
    ['KeePass', ['account', 'loginname', 'password', 'website', 'comments']],
    ['Apple Passwords or Safari', ['title', 'url', 'username', 'password', 'notes', 'otpauth']],
    ['Chrome, Edge or another Chromium browser', ['name', 'url', 'username', 'password']]
  ];

  function norm(h) { return String(h).toLowerCase().replace(/[^a-z0-9]/g, ''); }

  function readCsv(text) {
    var rows = CSV.parse(text, CSV.sniff(text)).filter(function (r) { return r.some(function (c) { return c.trim(); }); });
    if (rows.length < 2) throw new Error('That file has no logins under its header row.');
    var head = rows[0].map(norm);
    var source = SOURCES.filter(function (s) { return s[1].every(function (n) { return head.indexOf(n) > -1; }); })[0];
    var auto = {}, map = {};
    FIELDS.forEach(function (f) {
      var found = [];
      f.names.forEach(function (n) { head.forEach(function (h, i) { if (h === n && found.indexOf(i) === -1) found.push(i); }); });
      auto[f.k] = found;
      map[f.k] = found.length ? found[0] : -1;
    });
    return { header: rows[0], rows: rows.slice(1), source: source ? source[0] : null, auto: auto, map: map };
  }

  function hostOf(url) {
    url = String(url || '').trim();
    if (!url) return '';
    try { return new URL(/^[a-z][a-z0-9+.-]*:/i.test(url) ? url : 'https://' + url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  }

  /* Only web addresses become links. */
  function safeHref(url) {
    url = String(url || '').trim();
    if (/^https?:\/\//i.test(url)) return url;
    if (/^[a-z0-9-]+(\.[a-z0-9-]+)+([/:?#]|$)/i.test(url)) return 'https://' + url;
    return null;
  }

  function dupKey(e) { return (hostOf(e.url) || e.title.toLowerCase()) + '\n' + e.username + '\n' + e.password; }

  function csvEntries(parsed, map, existing, skipDupes) {
    var seen = Object.create(null), t = now(), entries = [], dupes = 0, empty = 0;
    existing.forEach(function (e) { seen[dupKey(e)] = true; });
    function cell(row, k) {
      var i = map[k], v = i > -1 ? row[i] || '' : '';
      /* Left on the automatic choice, fall back to the next likely column
         (Proton Pass fills in email but often not username). */
      if (!v && parsed.auto[k][0] === i) {
        for (var j = 1; j < parsed.auto[k].length && !v; j++) v = row[parsed.auto[k][j]] || '';
      }
      return k === 'password' || k === 'notes' ? v : v.trim();
    }
    parsed.rows.forEach(function (row) {
      var e = {};
      FIELDS.forEach(function (f) { e[f.k] = cell(row, f.k); });
      if (!e.password && !e.username && !e.url && !e.notes.trim()) { empty++; return; }
      if (parsed.source === 'KeePassXC') e.folder = e.folder.replace(/^Root(\/|$)/, '');
      if (e.totp) e.notes = (e.notes ? e.notes + '\n' : '') + '2FA secret: ' + e.totp;
      var entry = cleanEntry({ title: e.title || hostOf(e.url) || e.username || 'Untitled', username: e.username, password: e.password,
        url: e.url, notes: e.notes, folder: e.folder, created: t, updated: t });
      var key = dupKey(entry);
      if (skipDupes && seen[key]) { dupes++; return; }
      seen[key] = true;
      entries.push(entry);
    });
    return { entries: entries, dupes: dupes, empty: empty };
  }

  /* Chrome's column names, which most managers can import, plus folder. */
  function toCsv(entries) {
    return CSV.stringify([['name', 'url', 'username', 'password', 'note', 'folder']].concat(entries.map(function (e) {
      return [e.title, e.url, e.username, e.password, e.notes, e.folder];
    })));
  }

  /* --- small pieces ----------------------------------------------------------------- */

  function passwordInput(label, autocomplete) {
    var input = el('input', { type: 'password', autocomplete: autocomplete || 'off', spellcheck: false, 'aria-label': label });
    var btn = U.button('Show', function () { show(input.type === 'password'); }, 'ghost');
    function show(on) { input.type = on ? 'text' : 'password'; btn.textContent = on ? 'Hide' : 'Show'; }
    return { input: input, wrap: el('div', { class: 'pm-pw' }, input, btn), show: show };
  }

  /* A button that asks again before doing something that can't be undone. */
  function confirmBtn(label, sure, fn, variant) {
    var armed = false, timer = null;
    var b = U.button(label, function () {
      if (!armed) {
        armed = true;
        b.textContent = sure;
        b.classList.add('pm-danger');
        timer = setTimeout(function () { armed = false; b.textContent = label; b.classList.remove('pm-danger'); }, 5000);
        return;
      }
      clearTimeout(timer);
      fn();
    }, variant);
    return b;
  }

  function avatar(name) {
    var s = String(name || '?').trim() || '?', h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return el('span', { class: 'pm-av', 'aria-hidden': 'true', style: { background: 'hsl(' + h + ' 45% 40%)' }, text: Array.from(s)[0].toUpperCase() });
  }

  function flag(text, kind) { return el('span', { class: 'pm-flag ' + kind, text: text }); }

  function suggestMaster(fields) {
    return U.button('Suggest a passphrase', function () {
      CK.loadWords().then(function (words) {
        var p = CK.makePassphrase(words, { count: 5, sep: '-', caps: true, digit: true });
        fields.forEach(function (f) { f.input.value = p; f.show(true); f.input.dispatchEvent(new Event('input')); });
      }).catch(function (e) { U.toast(e.message, 'err'); });
    }, 'ghost');
  }

  /* --- the tool ------------------------------------------------------------------------ */

  function render(root) {
    root.classList.add('g-pm');
    var ui = { view: 'logins', editing: null, search: '', folder: '', message: null };
    var host = el('div', { class: 'stack' });
    root.appendChild(host);

    function draw(kind) {
      if (kind === 'data' && ui.editing) return;
      if (!S) ui.editing = null;
      host.replaceChildren.apply(host, S ? unlockedView(S) : lockedView());
    }
    views.push(draw);
    U.onTeardown(root, function () { views = views.filter(function (fn) { return fn !== draw; }); });
    root.addEventListener('pointerdown', touch, true);
    root.addEventListener('keydown', touch, true);

    function say(slot, text, kind) { slot.className = 'note' + (kind ? ' ' + kind : ''); slot.textContent = text; }

    /* ---- locked: create, unlock or open a file ---- */

    function lockedView() {
      var st = readStored(), out = [];
      if (lockNote) out.push(el('p', { class: 'note', dataset: { out: 'pm-locked' }, text: lockNote }));
      if (loose) out.push(unlockLoosePanel());
      else if (st && st.env) out.push(unlockPanel(st.env));
      else if (st && st.text) out.push(damagedPanel(st));
      else out.push(createPanel(st && st.blocked));
      out.push(openFilePanel(st));
      out.push(U.panel('How it works',
        U.note('Your logins are encrypted with AES-256-GCM, using a key made from your master password with PBKDF2-SHA-256 (600,000 rounds). The master password isn’t stored anywhere, so nobody, including this page, can recover the vault if you forget it.'),
        U.note('The vault is kept in this browser, for this address (' + location.host + '). Clearing the browser’s site data deletes it, so download it as a .vault file now and then. That file is the same encrypted vault, safe to keep in cloud storage or send to yourself, and opening it here or in another browser brings your logins back.'),
        U.note('It locks itself after a few minutes without use.')));
      return out;
    }

    function unlockForm(label, buttonText, onPassword) {
      var pw = passwordInput(label), msg = U.note('');
      var btn = el('button', { class: 'btn primary', type: 'submit', text: buttonText });
      var form = el('form', { class: 'stack', onsubmit: function (e) {
        e.preventDefault();
        if (!pw.input.value) { say(msg, 'Enter the master password.', 'err'); return; }
        btn.disabled = true;
        say(msg, 'Unlocking…');
        onPassword(pw.input.value).catch(function (err) {
          btn.disabled = false;
          say(msg, err.message, 'err');
          pw.input.select();
        });
      } }, U.field(label, pw.wrap), el('div', { class: 'btnrow' }, btn), msg);
      setTimeout(function () { if (document.activeElement === document.body) pw.input.focus(); }, 0);
      return form;
    }

    function unlockPanel(env) {
      return U.panel('Unlock your vault',
        U.note('Saved in this browser, last changed ' + fmtWhen(env.saved) + '.'),
        unlockForm('Master password', 'Unlock', function (password) {
          return openEnvelope(env, password).then(function (v) { v.stored = true; start(v); });
        }));
    }

    function unlockLoosePanel() {
      var unsaved = loose.env.revision !== loose.downloaded;
      return U.panel('Unlock ' + loose.fileName,
        U.note('Opened from a file and not saved in this browser.' + (unsaved ? ' It has changes you haven’t downloaded yet.' : ''), unsaved ? 'err' : ''),
        unlockForm('Master password', 'Unlock', function (password) {
          return openEnvelope(loose.env, password).then(function (v) { v.stored = false; start(v); });
        }),
        U.btnrow(U.button('Download .vault', function () { saveEnvelope(loose.env); loose.downloaded = loose.env.revision; draw(); }),
          unsaved ? confirmBtn('Close it', 'Close without downloading?', closeLoose) : U.button('Close it', closeLoose)));
    }

    function closeLoose() { loose = null; lockNote = ''; draw(); }

    function damagedPanel(st) {
      return U.panel('The vault in this browser can’t be read',
        U.note(st.error, 'err'),
        U.note('Download it as it is before doing anything else, in case it can be repaired. Removing it lets you create a new vault or open a .vault file.'),
        U.btnrow(U.button('Download it as it is', function () { U.saveText('damaged-' + fileName(), st.text, 'application/json'); }),
          confirmBtn('Remove it', 'Remove it for good?', function () {
            try { localStorage.removeItem(STORE); } catch (e) { /* blocked */ }
            draw();
          })));
    }

    function createPanel(blocked) {
      if (blocked) return U.panel('Create a vault', U.note(BLOCKED, 'err'));
      var pw1 = passwordInput('Master password', 'new-password'), pw2 = passwordInput('Type it again', 'new-password');
      var rating = el('span', { class: 'pm-tag' }), msg = U.note('');
      var btn = el('button', { class: 'btn primary', type: 'submit', text: 'Create vault' });
      pw1.input.addEventListener('input', function () {
        var p = pw1.input.value;
        if (!p) { rating.textContent = ''; return; }
        var a = CK.analyse(p);
        rating.textContent = a.label + ' · ' + plural(a.length, 'character');
        rating.style.color = a.colour;
      });
      var form = el('form', { class: 'stack', onsubmit: function (e) {
        e.preventDefault();
        var p = pw1.input.value;
        if (Array.from(p).length < 10) { say(msg, 'Use at least 10 characters. A few random words, like the suggestion, are long and easy to remember.', 'err'); return; }
        if (p !== pw2.input.value) { say(msg, 'The two passwords don’t match.', 'err'); return; }
        btn.disabled = true;
        say(msg, 'Creating…');
        var salt = randomBytes(16);
        deriveKey(p, salt, ITER).then(function (key) {
          var v = { key: key, salt: salt, iterations: ITER, id: randomHex(16), revision: 1, entries: [], deleted: {}, stored: true };
          return seal(v).then(function (env) { writeStored(env); askPersist(); start(v); });
        }).catch(function (err) { btn.disabled = false; say(msg, err.message, 'err'); });
      } },
        U.field('Master password', pw1.wrap), rating,
        U.field('Type it again', pw2.wrap),
        U.btnrow(btn, suggestMaster([pw1, pw2])), msg);
      return U.panel('Create a vault',
        U.note('Pick a master password you won’t forget and don’t use anywhere else. It can’t be reset or recovered.'), form);
    }

    function openFilePanel(st) {
      var slot = el('div', { class: 'stack' });
      var zone = U.dropzone({ accept: '.vault,.json,application/json', label: 'Drop a .vault file here', onFiles: function (files) {
        if (loose && loose.env.revision !== loose.downloaded) {
          slot.replaceChildren(U.note('The vault you opened from ' + loose.fileName + ' has changes you haven’t downloaded. Download or close it first.', 'err'));
          return;
        }
        U.readAs(files[0], 'text').then(function (text) {
          slot.replaceChildren(fileUnlock(files[0].name, parseEnvelope(text), st, slot));
        }).catch(function (e) { slot.replaceChildren(U.note(e.message, 'err')); });
      } });
      var hasVault = st && st.env;
      return U.panel(hasVault || loose ? 'Or open a .vault file' : 'Open a .vault file',
        U.note(hasVault ? 'Open a vault you downloaded here or in another browser. You can merge it into the vault in this browser, replace it, or just open the file.'
          : 'Open a vault you downloaded here or in another browser.'), zone, slot);
    }

    function fileUnlock(name, env, st, slot) {
      var canKeep = !(st && (st.blocked || st.env || st.text));
      var keep = canKeep ? U.checkbox('Keep it in this browser', { checked: true }) : null;
      return el('div', { class: 'stack' },
        U.note(name + ' · saved ' + fmtWhen(env.saved)),
        unlockForm('Master password for this file', 'Open', function (password) {
          return openEnvelope(env, password).then(function (v) {
            if (st && st.env) { slot.replaceChildren(chooser(v, env, name, password, st.env)); return; }
            if (keep && keep.input.checked) {
              writeStored(env);
              askPersist();
              noteBackup(env.id, env.revision);
              v.stored = true;
            } else {
              loose = { env: env, fileName: name, downloaded: env.revision };
              v.stored = false;
            }
            start(v);
          });
        }),
        keep);
    }

    /* The file is open and this browser has a vault too: merge, replace or neither. */
    function chooser(fileV, env, name, password, storedEnv) {
      var same = storedEnv.id === env.id, msg = U.note(''), extra = el('div', { class: 'stack' });
      var about = same
        ? 'This file is a copy of the vault in this browser' + (env.revision > storedEnv.revision ? ', with newer changes.' : env.revision < storedEnv.revision ? ', but older than the browser’s copy.' : ', saved at the same point.')
        : 'This browser already has a different vault.';

      function mergeWith(browserV) {
        var m = mergeData(browserV, fileV);
        browserV.entries = m.entries; browserV.deleted = m.deleted;
        browserV.revision = Math.max(storedEnv.revision, env.revision);
        browserV.stored = true;
        start(browserV);
        persist();
        U.toast('Merged: ' + m.added + ' added, ' + m.updated + ' updated, ' + m.removed + ' removed');
      }

      function tryMerge() {
        say(msg, 'Merging…');
        openEnvelope(storedEnv, password).then(mergeWith, function () {
          say(msg, 'The vault in this browser has a different master password. Enter it to merge.');
          extra.replaceChildren(unlockForm('Master password for the vault in this browser', 'Merge', function (p2) {
            return openEnvelope(storedEnv, p2).then(mergeWith);
          }));
        });
      }

      return el('div', { class: 'stack' },
        U.note(about),
        U.btnrow(U.button('Merge into this browser’s vault', tryMerge, 'primary'),
          confirmBtn('Replace this browser’s vault', 'Replace it for good?', function () {
            try { writeStored(env); } catch (e) { say(msg, e.message, 'err'); return; }
            noteBackup(env.id, env.revision);
            fileV.stored = true;
            start(fileV);
          }),
          U.button('Just open the file', function () {
            loose = { env: env, fileName: name, downloaded: env.revision };
            fileV.stored = false;
            start(fileV);
          })),
        U.note('Merging keeps every login from both, the newest version of each, and the master password of the vault in this browser. “Just open the file” leaves this browser’s vault alone; changes to the file are kept until you close the tab, so download it when you’re done.'),
        msg, extra);
    }

    /* ---- unlocked ---- */

    function unlockedView(v) {
      var head = U.panel('',
        el('div', { class: 'pm-head' },
          el('div', {}, el('h3', { text: 'Your vault' }), el('div', { class: 'pm-status', dataset: { out: 'pm-status' }, text: statusText(v) })),
          U.btnrow(U.button('Add login', function () { ui.view = 'logins'; ui.editing = 'new'; draw(); }, 'primary'),
            U.button('Download .vault', downloadOpen),
            U.button('Lock', function () { lock(''); }))),
        backupNudge(v),
        U.chips([{ value: 'logins', label: 'Logins' }, { value: 'health', label: 'Health check' },
          { value: 'io', label: 'Import & export' }, { value: 'settings', label: 'Settings' }],
          function (x) { ui.view = x; ui.editing = null; ui.message = null; draw(); }, ui.view));
      var body = ui.editing ? editorView(v) : ui.view === 'health' ? healthView(v) : ui.view === 'io' ? ioView(v)
        : ui.view === 'settings' ? settingsView(v) : listView(v);
      return [head].concat(body);
    }

    function statusText(v) {
      return plural(v.entries.length, 'login') + ' · ' + (v.stored ? 'saved in this browser' : 'opened from ' + (loose ? loose.fileName : 'a file') + ', not saved in this browser');
    }

    function backupNudge(v) {
      if (!v.stored) {
        if (!loose || v.revision === loose.downloaded) return null;
        var canKeep = !readStored();
        return el('div', { class: 'pm-warn' },
          el('span', { text: 'Changes to this vault are only kept until you close the tab. Download the .vault file to keep them' + (canKeep ? ', or keep it in this browser.' : '.') }),
          U.btnrow(U.button('Download .vault', downloadOpen), canKeep ? U.button('Keep it in this browser', function () { keepHere(v); }) : null));
      }
      var b = backupOf(v.id);
      if (!b) {
        return el('div', { class: 'pm-warn', dataset: { out: 'pm-nudge' } },
          el('span', { text: 'You haven’t downloaded a backup yet. If this browser’s site data is cleared, the vault goes with it.' }),
          U.button('Download .vault', downloadOpen));
      }
      var since = v.revision - b.revision;
      if (since > 0 && (since >= 10 || now() - b.time > 14 * 86400000)) {
        return el('div', { class: 'pm-warn', dataset: { out: 'pm-nudge' } },
          el('span', { text: plural(since, 'change') + ' since your last backup on ' + fmtDate(b.time) + '.' }),
          U.button('Download .vault', downloadOpen));
      }
      return null;
    }

    function keepHere(v) {
      seal(v).then(function (env) {
        writeStored(env);
        askPersist();
        if (loose) noteBackup(v.id, loose.downloaded);
        v.stored = true;
        loose = null;
        draw();
        U.toast('Saved in this browser');
      }).catch(function (e) { U.toast(e.message, 'err'); });
    }

    function edit(id) { ui.editing = id; draw(); }

    function flagsFor(v) {
      var h = healthOf(v.entries), f = Object.create(null);
      function get(id) { return f[id] || (f[id] = {}); }
      h.weak.forEach(function (w) { get(w.entry.id).weak = true; });
      h.reused.forEach(function (g) { g.forEach(function (e) { get(e.id).reused = true; }); });
      if (v.breach) v.entries.forEach(function (e) { if (e.password && v.breach.get(e.password) > 0) get(e.id).breached = true; });
      return f;
    }

    function entryRow(e, detail, flags, full) {
      var href = safeHref(e.url);
      var sub = detail !== null ? detail : [e.username, hostOf(e.url)].filter(Boolean).join(' · ');
      flags = flags || {};
      return el('div', { class: 'pm-row', dataset: { id: e.id } },
        avatar(e.title),
        el('div', { class: 'pm-main link', title: 'Edit', onclick: function () { edit(e.id); } },
          el('b', {}, e.title,
            flags.breached ? flag('Breached', 'bad') : null, flags.reused ? flag('Reused', 'meh') : null, flags.weak ? flag('Weak', 'meh') : null),
          el('span', { text: sub || ' ' })),
        el('div', { class: 'pm-acts' },
          full && e.username ? U.button('Copy username', function () { U.copy(e.username); }, 'ghost') : null,
          full && e.password ? U.button('Copy password', function () { copySecret(e.password); }, 'ghost') : null,
          full && href ? el('a', { class: 'btn ghost', href: href, target: '_blank', rel: 'noopener noreferrer', text: 'Open' }) : null,
          U.button('Edit', function () { edit(e.id); }, 'ghost')));
    }

    function listView(v) {
      var search = el('input', { type: 'search', class: 'pm-search', placeholder: 'Search logins', value: ui.search, 'aria-label': 'Search logins' });
      var folders = [];
      v.entries.forEach(function (e) { if (e.folder && folders.indexOf(e.folder) === -1) folders.push(e.folder); });
      folders.sort(function (a, b) { return a.localeCompare(b, 'en-GB', { sensitivity: 'base' }); });
      if (ui.folder && folders.indexOf(ui.folder) === -1) ui.folder = '';
      var folderSel = folders.length ? U.select({ options: [{ value: '', label: 'All folders' }].concat(folders), value: ui.folder, 'aria-label': 'Folder', class: 'pm-folder' }) : null;
      var list = el('div', { class: 'pm-list', dataset: { out: 'pm-list' } });
      var flags = flagsFor(v);

      function fill() {
        var q = ui.search.trim().toLowerCase();
        var rows = v.entries.filter(function (e) {
          return (!ui.folder || e.folder === ui.folder) &&
            (!q || [e.title, e.username, e.url, e.folder, e.notes].join('\n').toLowerCase().indexOf(q) > -1);
        }).sort(function (a, b) { return a.title.localeCompare(b.title, 'en-GB', { sensitivity: 'base' }); });
        list.replaceChildren.apply(list, rows.length ? rows.map(function (e) { return entryRow(e, null, flags[e.id], true); })
          : [U.note(v.entries.length ? 'No logins match.' : 'No logins yet. Add one, or bring them over from another password manager under Import & export.')]);
      }
      search.addEventListener('input', function () { ui.search = search.value; fill(); });
      if (folderSel) folderSel.addEventListener('change', function () { ui.folder = folderSel.value; fill(); });
      fill();
      return [U.panel('Logins', el('div', { class: 'row' }, search, folderSel), list,
        U.note('Copied passwords are cleared from the clipboard after 30 seconds.'))];
    }

    function editorView(v) {
      var isNew = ui.editing === 'new';
      var e = isNew ? cleanEntry({}) : v.entries.filter(function (x) { return x.id === ui.editing; })[0];
      if (!e) { ui.editing = null; return listView(v); }
      var title = el('input', { type: 'text', value: e.title, placeholder: 'e.g. Amazon', 'aria-label': 'Name' });
      var user = el('input', { type: 'text', value: e.username, autocomplete: 'off', spellcheck: false, 'aria-label': 'Username' });
      var pw = passwordInput('Password', 'new-password');
      pw.input.value = e.password;
      var rating = el('span', { class: 'pm-tag' });
      var url = el('input', { type: 'text', value: e.url, placeholder: 'https://', spellcheck: false, 'aria-label': 'Website' });
      var listId = 'pm-folders-' + randomHex(3);
      var folder = el('input', { type: 'text', value: e.folder, list: listId, 'aria-label': 'Folder' });
      var folderList = el('datalist', { id: listId });
      v.entries.forEach(function (x) {
        if (x.folder && !folderList.querySelector('option[value="' + CSS.escape(x.folder) + '"]')) folderList.appendChild(el('option', { value: x.folder }));
      });
      var notes = el('textarea', { value: e.notes, 'aria-label': 'Notes' });

      function rate() {
        if (!pw.input.value) { rating.textContent = ''; return; }
        var a = CK.analyse(pw.input.value);
        rating.textContent = a.label;
        rating.style.color = a.colour;
      }
      pw.input.addEventListener('input', rate);
      rate();

      function done() { ui.editing = null; draw(); }
      var form = el('form', { class: 'stack', onsubmit: function (ev) {
        ev.preventDefault();
        if (S !== v) return;
        var vals = { title: title.value.trim() || hostOf(url.value) || user.value.trim() || 'Untitled', username: user.value.trim(),
          password: pw.input.value, url: url.value.trim(), folder: folder.value.trim(), notes: notes.value, updated: now() };
        if (isNew) v.entries.push(cleanEntry(Object.assign(vals, { created: vals.updated })));
        else Object.assign(e, vals);
        persist().then(function () { U.toast('Saved'); });
        done();
      } },
        el('div', { class: 'pm-grid' }, U.field('Name', title), U.field('Username or email', user)),
        U.field('Password', pw.wrap), rating,
        U.btnrow(U.button('Generate random', function () {
          pw.input.value = CK.makePassword(20, { upper: true, lower: true, digits: true, symbols: true });
          pw.show(true); rate();
        }, 'ghost'), U.button('Generate from words', function () {
          CK.loadWords().then(function (words) {
            pw.input.value = CK.makePassphrase(words, { count: 5, sep: '-', caps: true, digit: true });
            pw.show(true); rate();
          }).catch(function (err) { U.toast(err.message, 'err'); });
        }, 'ghost')),
        el('div', { class: 'pm-grid' }, U.field('Website', url), U.field('Folder', folder)), folderList,
        U.field('Notes', notes),
        U.btnrow(el('button', { class: 'btn primary', type: 'submit', text: 'Save' }), U.button('Cancel', done),
          isNew ? null : confirmBtn('Delete', 'Delete for good?', function () {
            if (S !== v) return;
            v.entries = v.entries.filter(function (x) { return x !== e; });
            v.deleted[e.id] = now();
            persist();
            done();
          })));
      setTimeout(function () { (isNew ? title : pw.input).focus(); }, 0);
      return [U.panel(isNew ? 'Add a login' : 'Edit ' + e.title, form)];
    }

    function healthView(v) {
      var h = healthOf(v.entries);
      var withPw = v.entries.filter(function (e) { return e.password; }).length;
      var reusedCount = h.reused.reduce(function (n, g) { return n + g.length; }, 0);
      var breached = v.breach ? v.entries.filter(function (e) { return e.password && v.breach.get(e.password) > 0; }) : null;
      var prog = U.progress();
      var btn = U.button(v.breach ? 'Check again' : 'Check for breaches', function () {
        if (!withPw) { prog.fail('There are no passwords to check.'); return; }
        btn.disabled = true;
        prog.set('Checking…', 0);
        checkBreaches(v.entries, function (d, t) { prog.set('Checked ' + d + ' of ' + t, d / t); }).then(function (counts) {
          prog.done('Checked');
          v.breach = counts;
          if (S === v && !ui.editing && ui.view === 'health') draw();
        }).catch(function (e) { btn.disabled = false; prog.fail(e); });
      }, 'primary');

      var out = [
        U.panel('Password health', U.stats([
          { value: String(withPw), label: 'Logins with a password' }, { value: String(h.weak.length), label: 'Weak' },
          { value: String(reusedCount), label: 'Reused' }, { value: breached ? String(breached.length) : '—', label: 'Found in breaches' }]),
          U.note('Checks for breaches send the first 5 characters of each password’s SHA-1 hash to Have I Been Pwned (api.pwnedpasswords.com) and compare the replies here. The passwords themselves never leave this page.'),
          U.btnrow(btn), prog)
      ];
      if (breached && breached.length) {
        out.push(U.panel('Found in data breaches',
          U.note('Change these first. Attackers try passwords from breaches on every site they can.'),
          el('div', { class: 'pm-list' }, breached.map(function (e) {
            return entryRow(e, (e.username ? e.username + ' · ' : '') + 'seen ' + plural(v.breach.get(e.password), 'time') + ' in breaches', null, false);
          }))));
      }
      if (h.reused.length) {
        out.push(U.panel('Reused passwords',
          U.note('If one of these sites is breached, every login that shares the password is exposed. Give each one its own.'),
          el('div', { class: 'stack' }, h.reused.map(function (g) {
            return el('div', { class: 'pm-group' }, el('h4', { text: 'Shared by ' + plural(g.length, 'login') }),
              g.map(function (e) { return entryRow(e, null, null, false); }));
          }))));
      }
      if (h.weak.length) {
        out.push(U.panel('Weak passwords',
          el('div', { class: 'pm-list' }, h.weak.map(function (w) {
            var why = w.reasons.join(', ');
            return entryRow(w.entry, why[0].toUpperCase() + why.slice(1), null, false);
          }))));
      }
      if (withPw && !h.weak.length && !h.reused.length && !(breached && breached.length)) {
        out.push(U.panel('', U.note(breached ? '✓ No weak, reused or breached passwords.' : '✓ No weak or reused passwords. Check for breaches to finish the job.', 'ok')));
      }
      return out;
    }

    function ioView(v) {
      var out = [];
      if (ui.message) out.push(U.panel('', U.note(ui.message[0], ui.message[1])));

      var importSlot = el('div', { class: 'stack' });
      out.push(U.panel('Import from another password manager',
        U.note('Export your passwords as a CSV file from Chrome, Edge, Firefox, Safari or Apple Passwords, Bitwarden, 1Password, LastPass, KeePass or KeePassXC, Dashlane, Proton Pass or NordPass, then drop it here. It is read in this tab; nothing is uploaded.'),
        U.dropzone({ accept: '.csv,text/csv', label: 'Drop a CSV export here', onFiles: function (files) {
          U.readAs(files[0], 'text').then(function (text) { importPreview(importSlot, readCsv(text), v); })
            .catch(function (e) { importSlot.replaceChildren(U.note(e.message, 'err')); });
        } }),
        importSlot));

      var mergeSlot = el('div', { class: 'stack' });
      out.push(U.panel('Merge a .vault file',
        U.note('Bring in the logins from a vault downloaded here or in another browser. You get every login from both, and the newest version of each.'),
        U.dropzone({ accept: '.vault,.json,application/json', label: 'Drop a .vault file here', onFiles: function (files) {
          U.readAs(files[0], 'text').then(function (text) {
            var env = parseEnvelope(text);
            mergeSlot.replaceChildren(U.note(files[0].name + ' · saved ' + fmtWhen(env.saved) + (env.id === v.id ? ' · a copy of this vault' : '')),
              unlockForm('Master password for this file', 'Merge', function (password) {
                return openEnvelope(env, password).then(function (fileV) {
                  if (S !== v) return;
                  var m = mergeData(v, fileV);
                  v.entries = m.entries; v.deleted = m.deleted;
                  persist();
                  ui.message = ['Merged ' + files[0].name + ': ' + m.added + ' added, ' + m.updated + ' updated, ' + m.removed + ' removed.', 'ok'];
                  draw();
                });
              }));
          }).catch(function (e) { mergeSlot.replaceChildren(U.note(e.message, 'err')); });
        } }),
        mergeSlot));

      out.push(U.panel('Download',
        U.note('The .vault file is your whole vault, still encrypted with your master password. Keep a copy somewhere other than this computer.'),
        U.btnrow(U.button('Download .vault', downloadOpen, 'primary'),
          confirmBtn('Export as CSV (not encrypted)', 'Download passwords unencrypted?', function () {
            U.saveText('passwords-' + new Date().toISOString().slice(0, 10) + '.csv', toCsv(v.entries), 'text/csv');
          })),
        U.note('The CSV uses Chrome’s column names, which most password managers can import. Anyone who gets the CSV can read every password in it, so delete it once you’ve used it.')));
      return out;
    }

    function importPreview(slot, parsed, v) {
      var selects = {};
      var fields = FIELDS.map(function (f) {
        var s = U.select({ options: [{ value: '-1', label: '(not in the file)' }].concat(parsed.header.map(function (h, i) { return { value: String(i), label: h || 'Column ' + (i + 1) }; })),
          value: String(parsed.map[f.k]), 'aria-label': f.label + ' column' });
        selects[f.k] = s;
        s.addEventListener('change', update);
        return U.field(f.label, s);
      });
      var skip = U.checkbox('Skip logins already in the vault', { checked: true });
      skip.input.addEventListener('change', update);
      var summary = U.note('');
      summary.dataset.out = 'pm-import-summary';
      var table = el('div', { style: { overflowX: 'auto' } });
      var go = U.button('Import', doImport, 'primary');
      var result = null;

      function update() {
        var map = {};
        FIELDS.forEach(function (f) { map[f.k] = +selects[f.k].value; });
        result = csvEntries(parsed, map, v.entries, skip.input.checked);
        summary.className = 'note' + (map.password < 0 ? ' err' : '');
        summary.textContent = (map.password < 0 ? 'No password column found: pick it above. ' : '') +
          plural(parsed.rows.length, 'row') + ': ' + result.entries.length + ' to import' +
          (result.dupes ? ', ' + result.dupes + ' already in the vault' : '') + (result.empty ? ', ' + result.empty + ' empty' : '') + '.';
        go.textContent = 'Import ' + plural(result.entries.length, 'login');
        go.disabled = !result.entries.length;
        table.replaceChildren(result.entries.length ? U.table(['Name', 'Website', 'Username', 'Password', 'Folder'], result.entries.slice(0, 5).map(function (e) {
          return [e.title, e.url, e.username, e.password ? '•'.repeat(Math.min(12, Array.from(e.password).length)) : '', e.folder];
        })) : '');
      }

      function doImport() {
        if (S !== v || !result) return;
        var n = result.entries.length;
        v.entries = v.entries.concat(result.entries);
        persist();
        ui.message = ['Imported ' + plural(n, 'login') + '. Now delete the CSV file you exported: it holds your passwords unencrypted.', 'ok'];
        draw();
      }

      update();
      var source = U.note(parsed.source ? 'This looks like an export from ' + parsed.source + '. Check the columns, then import.' : 'Check which column holds what, then import.');
      source.dataset.out = 'pm-import-source';
      slot.replaceChildren(source,
        el('div', { class: 'pm-grid' }, fields), skip, summary, table, U.btnrow(go));
    }

    function settingsView(v) {
      var out = [];
      var auto = U.select({ options: AUTOLOCK.map(function (m) { return { value: String(m), label: 'After ' + plural(m, 'minute') + ' without use' }; }),
        value: String(autolockMins()), 'aria-label': 'Lock automatically' });
      auto.addEventListener('change', function () { setPref('autolock', +auto.value); U.toast('Saved'); });
      out.push(U.panel('Lock automatically', auto, U.note('Only time spent in the password manager counts as use. This setting is kept in this browser.')));

      var cur = passwordInput('Current master password'), p1 = passwordInput('New master password', 'new-password'), p2 = passwordInput('Type the new one again', 'new-password');
      var msg = U.note(''), btn = el('button', { class: 'btn primary', type: 'submit', text: 'Change master password' });
      out.push(U.panel('Change the master password', el('form', { class: 'stack', onsubmit: function (e) {
        e.preventDefault();
        var np = p1.input.value;
        if (Array.from(np).length < 10) { say(msg, 'Use at least 10 characters.', 'err'); return; }
        if (np !== p2.input.value) { say(msg, 'The new passwords don’t match.', 'err'); return; }
        btn.disabled = true;
        say(msg, 'Checking…');
        seal(v).then(function (env) { return openEnvelope(env, cur.input.value); }).then(function () {
          var salt = randomBytes(16);
          return deriveKey(np, salt, ITER).then(function (key) {
            if (S !== v) return;
            v.key = key; v.salt = salt; v.iterations = ITER;
            return persist().then(function () {
              btn.disabled = false;
              [cur, p1, p2].forEach(function (f) { f.input.value = ''; });
              say(msg, '✓ Changed. Download a new .vault file: copies you downloaded before still open with the old password.', 'ok');
            });
          });
        }).catch(function (err) {
          btn.disabled = false;
          say(msg, /doesn’t open/.test(err.message) ? 'The current master password isn’t right.' : err.message, 'err');
        });
      } }, U.field('Current master password', cur.wrap), U.field('New master password', p1.wrap), U.field('Type the new one again', p2.wrap),
        U.btnrow(btn, suggestMaster([p1, p2])), msg)));

      if (v.stored) {
        var b = backupOf(v.id);
        out.push(U.panel('Remove the vault from this browser',
          U.note(b ? 'Your last backup was downloaded on ' + fmtDate(b.time) + '. Anything changed since then will be lost.' : 'You have never downloaded this vault, so removing it deletes every login in it for good.', 'err'),
          U.btnrow(confirmBtn('Remove from this browser', 'Remove it for good?', function () {
            try { localStorage.removeItem(STORE); } catch (e) { /* blocked */ }
            lock('The vault was removed from this browser.');
          }))));
      } else {
        out.push(U.panel('Close this vault',
          U.note('It isn’t saved in this browser, so download it first if you’ve changed anything.'),
          U.btnrow(confirmBtn('Close it', 'Close it now?', function () { loose = null; lock(''); }))));
      }
      return out;
    }

    draw();
  }

  Tools.register({
    id: 'password-manager', category: 'crypto', name: 'Password Manager',
    description: 'Keep your logins in an encrypted vault, saved in this browser and as a .vault file you can download. Import them from another password manager, and find weak, reused and breached passwords.',
    keywords: ['password manager', 'vault', 'passwords', 'logins', 'keepass', 'bitwarden', 'lastpass', '1password', 'import passwords', 'password health'],
    online: 'api.pwnedpasswords.com, only when you press Check for breaches, and only with the first 5 characters of each password’s SHA-1 hash',
    render: render
  });

  window.VaultKit = { FORMAT: FORMAT, ITER: ITER, seal: seal, parseEnvelope: parseEnvelope, openEnvelope: openEnvelope, deriveKey: deriveKey,
    mergeData: mergeData, readCsv: readCsv, csvEntries: csvEntries, toCsv: toCsv, healthOf: healthOf, hostOf: hostOf, safeHref: safeHref };
})();
