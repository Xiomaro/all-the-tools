/* Crypto & security tools: digests, HMAC, bcrypt, AES, JWT, OTP, RSA keys,
   classic ciphers and password tools. Everything runs locally. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  document.head.appendChild(el('style', { text: [
    '.g-crypto .hashlist{display:flex;flex-direction:column;gap:8px}',
    '.g-crypto .hashrow{border:1px solid var(--border);border-radius:var(--radius);padding:8px 10px;background:var(--bg-sunken)}',
    '.g-crypto .hashrow header{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px}',
    '.g-crypto .hashrow code{font-family:var(--mono);word-break:break-all;font-size:13px;display:block}',
    '.g-crypto .hashrow.match{border-color:var(--ok);box-shadow:0 0 0 1px var(--ok)}',
    '.g-crypto .mini{padding:2px 8px;font-size:12px}',
    '.g-crypto .algos{display:flex;flex-wrap:wrap;gap:6px 16px}',
    '.g-crypto .pwlist{display:flex;flex-direction:column;gap:6px}',
    '.g-crypto .pwrow{display:flex;gap:10px;align-items:center;border:1px solid var(--border);border-radius:var(--radius);padding:6px 10px}',
    '.g-crypto .pwrow code{flex:1;font-family:var(--mono);word-break:break-all}',
    '.g-crypto .tag{font-size:12px;font-weight:700}',
    '.g-crypto .meter{height:10px;border-radius:5px;background:var(--bg-sunken);overflow:hidden;border:1px solid var(--border)}',
    '.g-crypto .meter i{display:block;height:100%}',
    '.g-crypto .checks{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:4px}',
    '.g-crypto .ok{color:var(--ok)}',
    '.g-crypto .bad{color:var(--err)}',
    '.g-crypto .otp{font-family:var(--mono);font-size:40px;font-weight:800;letter-spacing:6px}',
    '.g-crypto .jwt{font-family:var(--mono);word-break:break-all;background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--radius);padding:10px}',
    '.g-crypto .jwt .h{color:#e11d48}.g-crypto .jwt .p{color:#7c3aed}.g-crypto .jwt .s{color:#0891b2}',
    '.g-crypto .legend span{margin-right:12px;font-size:12px;font-weight:700}',
    '.g-crypto .brute{display:grid;grid-template-columns:70px 1fr;gap:2px 10px;font-family:var(--mono);font-size:13px}',
    '.g-crypto .brute b{color:var(--fg-muted)}',
    '.g-crypto .brute .cur{color:var(--accent)}',
    '.g-crypto textarea.pem{min-height:180px;font-family:var(--mono);font-size:12px}'
  ].join('\n') }));

  var enc = new TextEncoder(), dec = new TextDecoder();
  function bytes(s) { return typeof s === 'string' ? enc.encode(s) : s; }
  function toHex(b) { var s = ''; for (var i = 0; i < b.length; i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16); return s; }
  function toB64(b) { var s = ''; for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }
  function fromB64(t) { var s = atob(t.replace(/\s+/g, '')); var b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
  function b64url(b) { return toB64(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function concat() {
    var parts = Array.prototype.slice.call(arguments), n = 0, o = 0;
    parts.forEach(function (p) { n += p.length; });
    var out = new Uint8Array(n);
    parts.forEach(function (p) { out.set(p, o); o += p.length; });
    return out;
  }
  function randomBytes(n) { var b = new Uint8Array(n); crypto.getRandomValues(b); return b; }
  function randomInt(max) {
    var limit = Math.floor(0x100000000 / max) * max, buf = new Uint32Array(1);
    do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
    return buf[0] % max;
  }
  function needSubtle() {
    if (!window.crypto || !crypto.subtle) throw new Error('This needs WebCrypto, which browsers only offer over http(s). Run "python serve.py" and open the page from there.');
  }

  /* --- streaming digests ------------------------------------------------------
     hashCore() is self-contained so that its source can also run inside a Web
     Worker: hashing a big file there keeps the page responsive. create(name)
     returns { update(bytes), digest() -> Uint8Array }, so a file can be fed in
     chunks of any size. The SHA-2 constants are derived from the prime roots
     that define them (FIPS 180-4 §4.2 and §5.3) and the Keccak round constants
     and rotations from the FIPS 202 LFSR and ρ walk, rather than typed in.
     "SHA-3" here is Keccak-512 with the original 0x01 padding: what CryptoJS
     calls SHA3, and so what most online "SHA-3" boxes print. */
  function hashCore() {
    'use strict';
    var Big = BigInt;

    function iroot(n, k) {
      /* Newton's method on integers: floor(n^(1/k)). */
      var K = Big(k), K1 = Big(k - 1), x = Big(1) << Big(Math.ceil(n.toString(2).length / k));
      for (;;) {
        var p = Big(1);
        for (var i = 0; i < k - 1; i++) p *= x;
        var y = (K1 * x + n / p) / K;
        if (y >= x) return x;
        x = y;
      }
    }
    var PRIMES = [];
    for (var cand = 2; PRIMES.length < 80; cand++) {
      var prime = true;
      for (var q = 0; q < PRIMES.length && prime; q++) if (cand % PRIMES[q] === 0) prime = false;
      if (prime) PRIMES.push(cand);
    }
    var M64 = (Big(1) << Big(64)) - Big(1), M32 = Big(0xffffffff);
    function frac64(p, k) { return iroot(Big(p) << Big(64 * k), k) & M64; }
    var K512 = new Int32Array(160), IV512 = new Int32Array(16), IV384 = new Int32Array(16);
    var K256 = new Int32Array(64), IV256 = new Int32Array(8), IV224 = new Int32Array(8);
    function put(arr, i, v) { arr[i] = Number(v >> Big(32)) | 0; arr[i + 1] = Number(v & M32) | 0; }
    for (var i = 0; i < 80; i++) put(K512, 2 * i, frac64(PRIMES[i], 3));
    for (i = 0; i < 8; i++) { put(IV512, 2 * i, frac64(PRIMES[i], 2)); put(IV384, 2 * i, frac64(PRIMES[i + 8], 2)); }
    for (i = 0; i < 64; i++) K256[i] = K512[2 * i];
    for (i = 0; i < 8; i++) { IV256[i] = IV512[2 * i]; IV224[i] = IV384[2 * i + 1]; }

    function words(h, n, littleEndian) {
      var out = new Uint8Array(n * 4);
      for (var j = 0; j < n; j++) {
        var v = h[j], o = j * 4;
        if (littleEndian) { out[o] = v; out[o + 1] = v >>> 8; out[o + 2] = v >>> 16; out[o + 3] = v >>> 24; }
        else { out[o] = v >>> 24; out[o + 1] = v >>> 16; out[o + 2] = v >>> 8; out[o + 3] = v; }
      }
      return out;
    }

    /* Merkle–Damgård framing shared by MD5, SHA-1, SHA-2 and RIPEMD-160:
       buffer to whole blocks, then 0x80, zeros and the bit length. */
    function md(blockSize, lenBytes, littleEndian, compress, finish) {
      var buf = new Uint8Array(blockSize), fill = 0, total = 0;
      function feed(data) {
        var n = data.length, at = 0;
        if (fill) {
          var take = Math.min(blockSize - fill, n);
          buf.set(data.subarray(0, take), fill);
          fill += take; at = take;
          if (fill < blockSize) return;
          compress(buf, 0);
          fill = 0;
        }
        for (; at + blockSize <= n; at += blockSize) compress(data, at);
        if (at < n) { buf.set(data.subarray(at), 0); fill = n - at; }
      }
      return {
        update: function (data) { total += data.length; feed(data); },
        digest: function () {
          var pad = new Uint8Array((fill + 1 + lenBytes > blockSize ? 2 : 1) * blockSize - fill), L = pad.length;
          var lo = (total * 8) >>> 0, hi = Math.floor(total / 0x20000000) >>> 0;
          pad[0] = 0x80;
          if (littleEndian) { pad[L - 8] = lo; pad[L - 7] = lo >>> 8; pad[L - 6] = lo >>> 16; pad[L - 5] = lo >>> 24; pad[L - 4] = hi; pad[L - 3] = hi >>> 8; pad[L - 2] = hi >>> 16; pad[L - 1] = hi >>> 24; }
          else { pad[L - 8] = hi >>> 24; pad[L - 7] = hi >>> 16; pad[L - 6] = hi >>> 8; pad[L - 5] = hi; pad[L - 4] = lo >>> 24; pad[L - 3] = lo >>> 16; pad[L - 2] = lo >>> 8; pad[L - 1] = lo; }
          feed(pad);
          return finish();
        }
      };
    }

    var MD5K = new Int32Array(64), MD5S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    for (i = 0; i < 64; i++) MD5K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;

    function md5() {
      var h = new Int32Array([0x67452301, 0xefcdab89 | 0, 0x98badcfe | 0, 0x10325476]), w = new Int32Array(16);
      return md(64, 8, true, function (b, o) {
        for (var j = 0; j < 16; j++, o += 4) w[j] = b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24);
        var a = h[0], bb = h[1], c = h[2], d = h[3], f, g, t, s, r;
        for (j = 0; j < 64; j++) {
          if (j < 16) { f = (bb & c) | (~bb & d); g = j; }
          else if (j < 32) { f = (d & bb) | (~d & c); g = (5 * j + 1) & 15; }
          else if (j < 48) { f = bb ^ c ^ d; g = (3 * j + 5) & 15; }
          else { f = c ^ (bb | ~d); g = (7 * j) & 15; }
          t = d; d = c; c = bb;
          s = (a + f + MD5K[j] + w[g]) | 0; r = MD5S[(j >> 4) * 4 + (j & 3)];
          bb = (bb + ((s << r) | (s >>> (32 - r)))) | 0;
          a = t;
        }
        h[0] = (h[0] + a) | 0; h[1] = (h[1] + bb) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
      }, function () { return words(h, 4, true); });
    }

    function sha1() {
      var h = new Int32Array([0x67452301, 0xefcdab89 | 0, 0x98badcfe | 0, 0x10325476, 0xc3d2e1f0 | 0]), w = new Int32Array(80);
      return md(64, 8, false, function (b, o) {
        for (var j = 0; j < 16; j++, o += 4) w[j] = (b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3];
        for (; j < 80; j++) { var x = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16]; w[j] = (x << 1) | (x >>> 31); }
        var a = h[0], bb = h[1], c = h[2], d = h[3], e = h[4], f, k, t;
        for (j = 0; j < 80; j++) {
          if (j < 20) { f = (bb & c) | (~bb & d); k = 0x5a827999; }
          else if (j < 40) { f = bb ^ c ^ d; k = 0x6ed9eba1; }
          else if (j < 60) { f = (bb & c) | (bb & d) | (c & d); k = 0x8f1bbcdc | 0; }
          else { f = bb ^ c ^ d; k = 0xca62c1d6 | 0; }
          t = (((a << 5) | (a >>> 27)) + f + e + k + w[j]) | 0;
          e = d; d = c; c = (bb << 30) | (bb >>> 2); bb = a; a = t;
        }
        h[0] = (h[0] + a) | 0; h[1] = (h[1] + bb) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0; h[4] = (h[4] + e) | 0;
      }, function () { return words(h, 5, false); });
    }

    function sha256(iv, outWords) {
      var h = new Int32Array(iv), w = new Int32Array(64);
      return md(64, 8, false, function (b, o) {
        for (var j = 0; j < 16; j++, o += 4) w[j] = (b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3];
        for (; j < 64; j++) {
          var x = w[j - 15], y = w[j - 2];
          var s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
          var s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
          w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
        }
        var a = h[0], bb = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
        for (j = 0; j < 64; j++) {
          var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
          var t1 = (hh + S1 + ((e & f) ^ (~e & g)) + K256[j] + w[j]) | 0;
          var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
          var t2 = (S0 + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
          hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
        }
        h[0] = (h[0] + a) | 0; h[1] = (h[1] + bb) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
        h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
      }, function () { return words(h, outWords, false); });
    }

    /* SHA-384/512 need 64-bit words: each is kept as a (high, low) pair of
       32-bit halves, and additions carry by hand. */
    var C32 = 4294967296;
    function add64(h, j, hi, lo) { var l = (h[j + 1] >>> 0) + (lo >>> 0); h[j] = (h[j] + hi + (l >= C32 ? 1 : 0)) | 0; h[j + 1] = l | 0; }
    function sha512(iv, outWords) {
      var h = new Int32Array(iv), w = new Int32Array(160);
      return md(128, 16, false, function (b, o) {
        var j, lo, hi, xh, xl;
        for (j = 0; j < 32; j++, o += 4) w[j] = (b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3];
        for (j = 16; j < 80; j++) {
          xh = w[2 * j - 30]; xl = w[2 * j - 29];
          var s0h = ((xh >>> 1) | (xl << 31)) ^ ((xh >>> 8) | (xl << 24)) ^ (xh >>> 7);
          var s0l = ((xl >>> 1) | (xh << 31)) ^ ((xl >>> 8) | (xh << 24)) ^ ((xl >>> 7) | (xh << 25));
          xh = w[2 * j - 4]; xl = w[2 * j - 3];
          var s1h = ((xh >>> 19) | (xl << 13)) ^ ((xl >>> 29) | (xh << 3)) ^ (xh >>> 6);
          var s1l = ((xl >>> 19) | (xh << 13)) ^ ((xh >>> 29) | (xl << 3)) ^ ((xl >>> 6) | (xh << 26));
          lo = (s0l >>> 0) + (s1l >>> 0) + (w[2 * j - 13] >>> 0) + (w[2 * j - 31] >>> 0);
          hi = s0h + s1h + w[2 * j - 14] + w[2 * j - 32] + Math.floor(lo / C32);
          w[2 * j] = hi | 0; w[2 * j + 1] = lo | 0;
        }
        var ah = h[0], al = h[1], bh = h[2], bl = h[3], ch = h[4], cl = h[5], dh = h[6], dl = h[7],
          eh = h[8], el = h[9], fh = h[10], fl = h[11], gh = h[12], gl = h[13], hh = h[14], hl = h[15];
        for (j = 0; j < 80; j++) {
          var S1h = ((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((el >>> 9) | (eh << 23));
          var S1l = ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((eh >>> 9) | (el << 23));
          var chh = (eh & fh) ^ (~eh & gh), chl = (el & fl) ^ (~el & gl);
          lo = (hl >>> 0) + (S1l >>> 0) + (chl >>> 0) + (K512[2 * j + 1] >>> 0) + (w[2 * j + 1] >>> 0);
          hi = hh + S1h + chh + K512[2 * j] + w[2 * j] + Math.floor(lo / C32);
          var t1h = hi | 0, t1l = lo | 0;
          var S0h = ((ah >>> 28) | (al << 4)) ^ ((al >>> 2) | (ah << 30)) ^ ((al >>> 7) | (ah << 25));
          var S0l = ((al >>> 28) | (ah << 4)) ^ ((ah >>> 2) | (al << 30)) ^ ((ah >>> 7) | (al << 25));
          var mjh = (ah & bh) ^ (ah & ch) ^ (bh & ch), mjl = (al & bl) ^ (al & cl) ^ (bl & cl);
          lo = (S0l >>> 0) + (mjl >>> 0);
          var t2h = (S0h + mjh + Math.floor(lo / C32)) | 0, t2l = lo | 0;
          hh = gh; hl = gl; gh = fh; gl = fl; fh = eh; fl = el;
          lo = (dl >>> 0) + (t1l >>> 0); eh = (dh + t1h + Math.floor(lo / C32)) | 0; el = lo | 0;
          dh = ch; dl = cl; ch = bh; cl = bl; bh = ah; bl = al;
          lo = (t1l >>> 0) + (t2l >>> 0); ah = (t1h + t2h + Math.floor(lo / C32)) | 0; al = lo | 0;
        }
        add64(h, 0, ah, al); add64(h, 2, bh, bl); add64(h, 4, ch, cl); add64(h, 6, dh, dl);
        add64(h, 8, eh, el); add64(h, 10, fh, fl); add64(h, 12, gh, gl); add64(h, 14, hh, hl);
      }, function () { return words(h, outWords, false); });
    }

    var RL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
      3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12, 1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2,
      4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13];
    var RR = [5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12, 6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2,
      15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13, 8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14,
      12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11];
    var SL = [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8, 7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12,
      11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5, 11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12,
      9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6];
    var SR = [8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6, 9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11,
      9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5, 15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8,
      8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11];
    var KL = [0x00000000, 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc | 0, 0xa953fd4e | 0];
    var KR = [0x50a28be6, 0x5c4dd124, 0x6d703ef3, 0x7a6d76e9, 0x00000000];

    function ripemd160() {
      var h = new Int32Array([0x67452301, 0xefcdab89 | 0, 0x98badcfe | 0, 0x10325476, 0xc3d2e1f0 | 0]), X = new Int32Array(16);
      function rotl(x, n) { return (x << n) | (x >>> (32 - n)); }
      function f(j, x, y, z) {
        if (j < 16) return x ^ y ^ z;
        if (j < 32) return (x & y) | (~x & z);
        if (j < 48) return (x | ~y) ^ z;
        if (j < 64) return (x & z) | (y & ~z);
        return x ^ (y | ~z);
      }
      return md(64, 8, true, function (b, o) {
        for (var j = 0; j < 16; j++, o += 4) X[j] = b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24);
        var al = h[0], bl = h[1], cl = h[2], dl = h[3], el = h[4], ar = al, br = bl, cr = cl, dr = dl, er = el, t;
        for (j = 0; j < 80; j++) {
          t = (rotl((al + f(j, bl, cl, dl) + X[RL[j]] + KL[j >> 4]) | 0, SL[j]) + el) | 0;
          al = el; el = dl; dl = rotl(cl, 10); cl = bl; bl = t;
          t = (rotl((ar + f(79 - j, br, cr, dr) + X[RR[j]] + KR[j >> 4]) | 0, SR[j]) + er) | 0;
          ar = er; er = dr; dr = rotl(cr, 10); cr = br; br = t;
        }
        t = (h[1] + cl + dr) | 0; h[1] = (h[2] + dl + er) | 0; h[2] = (h[3] + el + ar) | 0;
        h[3] = (h[4] + al + br) | 0; h[4] = (h[0] + bl + cr) | 0; h[0] = t;
      }, function () { return words(h, 5, true); });
    }

    /* Keccak-f[1600] on 25 lanes held as (low, high) 32-bit halves. */
    var RCl = new Int32Array(24), RCh = new Int32Array(24), ROT = new Int32Array(25);
    (function () {
      function rc(t) {
        if (t % 255 === 0) return 1;
        var R = [1, 0, 0, 0, 0, 0, 0, 0];
        for (var k = 1; k <= t % 255; k++) {
          R.unshift(0);
          R[0] ^= R[8]; R[4] ^= R[8]; R[5] ^= R[8]; R[6] ^= R[8];
          R.length = 8;
        }
        return R[0];
      }
      for (var ir = 0; ir < 24; ir++) {
        for (var j = 0; j < 7; j++) {
          if (!rc(j + 7 * ir)) continue;
          var bit = (1 << j) - 1;
          if (bit < 32) RCl[ir] |= 1 << bit; else RCh[ir] |= 1 << (bit - 32);
        }
      }
      var x = 1, y = 0;
      for (var t = 0; t < 24; t++) {
        ROT[x + 5 * y] = ((t + 1) * (t + 2) / 2) % 64;
        var nx = y; y = (2 * x + 3 * y) % 5; x = nx;
      }
    })();
    /* Index tables for the π step and χ neighbours, so the rounds do no
       modulo arithmetic. */
    var KC = new Int32Array(10), KB = new Int32Array(50), PI = new Int32Array(25), N1 = new Int32Array(25), N2 = new Int32Array(25);
    for (var kx = 0; kx < 5; kx++) {
      for (var ky = 0; ky < 5; ky++) {
        PI[kx + 5 * ky] = ky + 5 * ((2 * kx + 3 * ky) % 5);
        N1[kx + 5 * ky] = (kx + 1) % 5 + 5 * ky;
        N2[kx + 5 * ky] = (kx + 2) % 5 + 5 * ky;
      }
    }
    function keccakF(s) {
      var round, x, y, at, j, lo, hi, r, dl, dh, n, p, t;
      for (round = 0; round < 24; round++) {
        for (x = 0; x < 10; x += 2) {
          KC[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
          KC[x + 1] = s[x + 1] ^ s[x + 11] ^ s[x + 21] ^ s[x + 31] ^ s[x + 41];
        }
        for (x = 0; x < 5; x++) {
          n = x === 4 ? 0 : 2 * x + 2; p = x === 0 ? 8 : 2 * x - 2;
          dl = KC[p] ^ ((KC[n] << 1) | (KC[n + 1] >>> 31));
          dh = KC[p + 1] ^ ((KC[n + 1] << 1) | (KC[n] >>> 31));
          for (y = 2 * x; y < 50; y += 10) { s[y] ^= dl; s[y + 1] ^= dh; }
        }
        for (at = 0; at < 25; at++) {
          lo = s[2 * at]; hi = s[2 * at + 1]; r = ROT[at]; j = 2 * PI[at];
          if (r >= 32) { t = lo; lo = hi; hi = t; r -= 32; }
          if (r) { KB[j] = (lo << r) | (hi >>> (32 - r)); KB[j + 1] = (hi << r) | (lo >>> (32 - r)); }
          else { KB[j] = lo; KB[j + 1] = hi; }
        }
        for (at = 0; at < 25; at++) {
          n = 2 * N1[at]; p = 2 * N2[at];
          s[2 * at] = KB[2 * at] ^ (~KB[n] & KB[p]);
          s[2 * at + 1] = KB[2 * at + 1] ^ (~KB[n + 1] & KB[p + 1]);
        }
        s[0] ^= RCl[round]; s[1] ^= RCh[round];
      }
    }
    function keccak512() {
      var rate = 72, s = new Int32Array(50), buf = new Uint8Array(rate), fill = 0;
      function absorb(b, o) {
        for (var m = 0; m < rate / 4; m++, o += 4) s[m] ^= b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24);
        keccakF(s);
      }
      return {
        update: function (data) {
          var n = data.length, at = 0;
          if (fill) {
            var take = Math.min(rate - fill, n);
            buf.set(data.subarray(0, take), fill);
            fill += take; at = take;
            if (fill < rate) return;
            absorb(buf, 0);
            fill = 0;
          }
          for (; at + rate <= n; at += rate) absorb(data, at);
          if (at < n) { buf.set(data.subarray(at), 0); fill = n - at; }
        },
        digest: function () {
          var last = new Uint8Array(rate);
          last.set(buf.subarray(0, fill));
          last[fill] ^= 0x01;
          last[rate - 1] ^= 0x80;
          absorb(last, 0);
          return words(s, 16, true);
        }
      };
    }

    var MAKERS = {
      'MD5': md5,
      'SHA-1': sha1,
      'SHA-224': function () { return sha256(IV224, 7); },
      'SHA-256': function () { return sha256(IV256, 8); },
      'SHA-384': function () { return sha512(IV384, 12); },
      'SHA-512': function () { return sha512(IV512, 16); },
      'SHA-3': keccak512,
      'RIPEMD-160': ripemd160
    };
    return {
      names: Object.keys(MAKERS),
      create: function (name) {
        if (!MAKERS[name]) throw new Error('Unknown hash algorithm ' + name);
        return MAKERS[name]();
      },
      hash: function (name, data) { var hs = this.create(name); hs.update(data); return hs.digest(); }
    };
  }

  var HC = hashCore();
  function md5b(input) { return HC.hash('MD5', bytes(input)); }
  function sha224(input) { return HC.hash('SHA-224', bytes(input)); }
  function ripemd160(input) { return HC.hash('RIPEMD-160', bytes(input)); }
  function keccak512(input) { return HC.hash('SHA-3', bytes(input)); }

  /* Any digest by name; resolves to bytes. */
  function digest(name, input) {
    try { return Promise.resolve(HC.hash(name, bytes(input))); }
    catch (e) { return Promise.reject(e); }
  }

  /* HMAC over a synchronous hash (RFC 2104). */
  function hmacSync(hashFn, blockSize, key, msg) {
    key = bytes(key);
    if (key.length > blockSize) key = hashFn(key);
    var k = new Uint8Array(blockSize);
    k.set(key);
    var ipad = new Uint8Array(blockSize), opad = new Uint8Array(blockSize);
    for (var i = 0; i < blockSize; i++) { ipad[i] = k[i] ^ 0x36; opad[i] = k[i] ^ 0x5c; }
    return hashFn(concat(opad, hashFn(concat(ipad, bytes(msg)))));
  }

  function hmac(name, key, msg) {
    if (name === 'MD5') return Promise.resolve(hmacSync(md5b, 64, key, msg));
    if (name === 'SHA-3') return Promise.resolve(hmacSync(keccak512, 72, key, msg));
    needSubtle();
    var k = bytes(key);
    /* WebCrypto refuses empty HMAC keys, so fall back to a zero block. */
    return crypto.subtle.importKey('raw', k.length ? k : new Uint8Array(1), { name: 'HMAC', hash: name }, false, ['sign'])
      .then(function (ck) {
        if (!k.length) return hmacEmptyKey(name, msg);
        return crypto.subtle.sign('HMAC', ck, bytes(msg)).then(function (s) { return new Uint8Array(s); });
      });
  }

  /* An empty key and a single zero byte give the same HMAC (keys are
     zero-padded), so reuse WebCrypto with that. */
  function hmacEmptyKey(name, msg) {
    return crypto.subtle.importKey('raw', new Uint8Array(1), { name: 'HMAC', hash: name }, false, ['sign'])
      .then(function (ck) { return crypto.subtle.sign('HMAC', ck, bytes(msg)); })
      .then(function (s) { return new Uint8Array(s); });
  }

  function hashRow(algo, value, label) {
    var code = el('code', { text: value });
    return el('div', { class: 'hashrow', dataset: { algo: algo } },
      el('header', {}, el('b', { text: label || algo }), U.button('Copy', function () { U.copy(code.textContent); }, 'ghost mini')), code);
  }

  /* --- Hash Generator & Checksum Checker ------------------------------------ */

  var HASH_ALGOS = ['MD5', 'SHA-1', 'SHA-224', 'SHA-256', 'SHA-384', 'SHA-512', 'SHA-3', 'RIPEMD-160'];
  var HASH_LABEL = { 'SHA-3': 'SHA-3 (Keccak-512)' };
  /* Rough relative cost per byte, used to share algorithms between workers. */
  var HASH_COST = { 'MD5': 1, 'SHA-1': 1.2, 'SHA-224': 2, 'SHA-256': 2, 'SHA-384': 2.6, 'SHA-512': 2.6, 'SHA-3': 3, 'RIPEMD-160': 2 };
  var HASH_BY_LEN = { 32: ['MD5'], 40: ['SHA-1', 'RIPEMD-160'], 56: ['SHA-224'], 64: ['SHA-256'], 96: ['SHA-384'], 128: ['SHA-512', 'SHA-3'] };
  var HASH_HINTS = { md5: 'MD5', sha1: 'SHA-1', sha224: 'SHA-224', sha256: 'SHA-256', sha384: 'SHA-384', sha512: 'SHA-512', sha3: 'SHA-3', keccak512: 'SHA-3', ripemd160: 'RIPEMD-160', rmd160: 'RIPEMD-160' };
  var HASH_CHUNK = 4 * 1024 * 1024;

  /* Pull a digest out of whatever was pasted: bare hex (any case, with spaces,
     colons or 0x), a sha256sum line ("hash  file"), a BSD line
     ("SHA256 (file) = hash"), an SRI value ("sha384-…") or bare Base64.
     Returns { hex, hint } or null when nothing digest-like is there. */
  function parseChecksum(text) {
    var t = String(text || '').trim(), hint = null, m;
    if (!t) return null;
    function hintOf(s) { return HASH_HINTS[s.toLowerCase().replace(/[^a-z0-9]/g, '')] || null; }
    function b64hex(s) {
      try { var b = fromB64(s); return HASH_BY_LEN[b.length * 2] ? toHex(b) : null; } catch (e) { return null; }
    }
    if ((m = /^([A-Za-z0-9-]+)\s*\(.*\)\s*=\s*([0-9A-Fa-f]+)$/.exec(t))) return { hex: m[2].toLowerCase(), hint: hintOf(m[1]) };
    if ((m = /^(sha256|sha384|sha512)-([A-Za-z0-9+\/]+={0,2})$/i.exec(t))) { var h = b64hex(m[2]); return h ? { hex: h, hint: hintOf(m[1]) } : null; }
    if ((m = /^(?:0x)?([0-9A-Fa-f]{32,128})\s+\*?\S/.exec(t))) t = m[1];
    var hex = t.replace(/^0x/i, '').replace(/[\s:]/g, '');
    if (/^[0-9a-fA-F]+$/.test(hex)) return { hex: hex.toLowerCase(), hint: hint };
    if (/^[A-Za-z0-9+\/]+={0,2}$/.test(t)) { var fromB = b64hex(t); if (fromB) return { hex: fromB, hint: hint }; }
    return null;
  }

  /* The worker's side: hash one File in chunks with the named algorithms. */
  var HASH_WORKER = [
    'var core = hashCore();',
    'onmessage = async function (e) {',
    '  var file = e.data.file, chunk = e.data.chunk, hs = e.data.names.map(function (n) { return core.create(n); });',
    '  try {',
    '    for (var off = 0; off < file.size; off += chunk) {',
    '      var buf = new Uint8Array(await file.slice(off, off + chunk).arrayBuffer());',
    '      for (var i = 0; i < hs.length; i++) hs[i].update(buf);',
    '      postMessage({ type: "progress", done: Math.min(file.size, off + chunk) });',
    '    }',
    '    postMessage({ type: "done", digests: hs.map(function (h) { return h.digest(); }) });',
    '  } catch (err) { postMessage({ type: "error", message: String((err && err.message) || err) }); }',
    '};'
  ].join('\n');
  var hashWorkerUrl = null;

  /* Hash a File with several algorithms, sharing them between up to four
     workers so the slow ones run side by side. Falls back to chunked hashing
     on the page when workers are unavailable. Returns { promise, cancel }. */
  function hashFile(file, names, onProgress) {
    var cancelled = false, workers = [];
    function cancel() { cancelled = true; workers.forEach(function (w) { w.terminate(); }); }
    var promise = new Promise(function (resolve, reject) {
      var n = Math.max(1, Math.min(4, names.length, (navigator.hardwareConcurrency || 2) - 1));
      var groups = [];
      for (var g = 0; g < n; g++) groups.push({ names: [], cost: 0, done: 0 });
      names.slice().sort(function (a, b) { return HASH_COST[b] - HASH_COST[a]; }).forEach(function (name) {
        var least = groups.reduce(function (p, c) { return c.cost < p.cost ? c : p; });
        least.names.push(name); least.cost += HASH_COST[name];
      });
      var total = groups.reduce(function (s, gr) { return s + gr.cost; }, 0), out = {}, finished = 0;
      function report() { onProgress(file.size ? groups.reduce(function (s, gr) { return s + gr.cost * gr.done; }, 0) / (total * file.size) : 1); }
      try {
        if (!hashWorkerUrl) hashWorkerUrl = URL.createObjectURL(new Blob(['var hashCore = ' + hashCore.toString() + ';\n' + HASH_WORKER], { type: 'text/javascript' }));
        groups.forEach(function (gr) {
          var w = new Worker(hashWorkerUrl);
          workers.push(w);
          w.onmessage = function (e) {
            if (cancelled) return;
            if (e.data.type === 'progress') { gr.done = e.data.done; report(); }
            else if (e.data.type === 'error') { cancel(); reject(new Error(e.data.message)); }
            else {
              gr.names.forEach(function (name, i) { out[name] = e.data.digests[i]; });
              w.terminate();
              if (++finished === groups.length) resolve(out);
            }
          };
          w.onerror = function (e) { e.preventDefault(); if (!cancelled) { cancel(); reject(new Error(e.message || 'The hashing worker failed.')); } };
          w.postMessage({ file: file, names: gr.names, chunk: HASH_CHUNK });
        });
      } catch (e) {
        /* No workers (an old browser or a locked-down page): hash here, one
           chunk at a time, yielding so the progress bar can move. */
        workers.forEach(function (w) { w.terminate(); });
        workers = [];
        var hs = names.map(function (name) { return HC.create(name); });
        (async function () {
          for (var off = 0; off < file.size; off += HASH_CHUNK) {
            if (cancelled) return;
            var buf = new Uint8Array(await file.slice(off, off + HASH_CHUNK).arrayBuffer());
            hs.forEach(function (h) { h.update(buf); });
            onProgress(Math.min(1, (off + HASH_CHUNK) / file.size));
            await new Promise(function (r) { setTimeout(r, 0); });
          }
          names.forEach(function (name, i) { out[name] = hs[i].digest(); });
          resolve(out);
        })().catch(reject);
      }
    });
    return { promise: promise, cancel: cancel };
  }

  Tools.register({
    id: 'hash-generator', category: 'crypto', name: 'Hash Generator & Checksum Checker',
    description: 'Hash text or files with MD5, SHA-1, SHA-2, SHA-3 (Keccak) and RIPEMD-160, and check a download against a published checksum.',
    keywords: ['hash', 'checksum', 'checksum calculator', 'file hash', 'verify', 'verify download', 'integrity', 'compare hash',
      'md5', 'sha1', 'sha-1', 'sha224', 'sha256', 'sha-256', 'sha384', 'sha512', 'sha3', 'keccak', 'ripemd', 'ripemd160',
      'digest', 'fingerprint', 'sha256sum', 'md5sum', 'crypto'],
    render: function (root) {
      root.classList.add('g-crypto');
      var mode = 'text', file = null, job = null, values = {}, shownFor = null;

      var input = el('textarea', { placeholder: 'Enter text to hash...', rows: 6, spellcheck: false });
      var fileInfo = U.note('');
      fileInfo.dataset.k = 'file';
      var zone = U.dropzone({ label: 'Drop a file here', hint: 'or click to choose. It is read on this device and never uploaded.', onFiles: function (f) {
        file = f[0];
        fileInfo.textContent = file.name + ' · ' + U.bytes(file.size) + (file.size >= 1024 ? ' (' + file.size.toLocaleString('en-GB') + ' bytes)' : '');
        run();
      } });
      var textPane = el('div', {}, input);
      var filePane = el('div', { class: 'stack', style: { display: 'none' } }, zone, fileInfo);

      var picks = HASH_ALGOS.map(function (a) {
        var c = U.checkbox(HASH_LABEL[a] || a, { checked: true });
        c.input.dataset.algo = a;
        return c;
      });
      var upper = U.checkbox('Uppercase');
      var prog = U.progress();
      var results = el('div', { class: 'hashlist' });
      var verifyIn = el('input', { type: 'text', placeholder: 'Paste the checksum you were given…', spellcheck: false, autocomplete: 'off', style: { fontFamily: 'var(--mono)' } });
      var detected = el('span', { class: 'hint' });
      var verdict = U.note('');
      verdict.dataset.k = 'verify';
      var genBtn = U.button('Generate Hashes', function () { run(); }, 'primary');
      var cancelBtn = U.button('Cancel', function () { if (job) { job.cancel(); job = null; busy(false); prog.fail('Cancelled.'); } }, 'ghost');
      cancelBtn.style.display = 'none';

      var tabs = U.chips(['Text', 'File'], function (v) {
        mode = v.toLowerCase();
        textPane.style.display = mode === 'text' ? '' : 'none';
        filePane.style.display = mode === 'file' ? '' : 'none';
        genBtn.textContent = mode === 'text' ? 'Generate Hashes' : 'Hash File';
        clearResults();
      }, 'Text');

      function chosen() { return picks.filter(function (c) { return c.input.checked; }).map(function (c) { return c.input.dataset.algo; }); }
      function fmt(hex) { return upper.input.checked ? hex.toUpperCase() : hex; }
      function busy(on) { genBtn.disabled = on; cancelBtn.style.display = on ? '' : 'none'; }
      function clearResults() { values = {}; shownFor = null; results.replaceChildren(); prog.set(''); check(); }

      function show(digests, label) {
        values = {};
        shownFor = label;
        var rows = HASH_ALGOS.filter(function (a) { return digests[a]; }).map(function (a) {
          values[a] = toHex(digests[a]);
          return hashRow(a, fmt(values[a]), HASH_LABEL[a]);
        });
        results.replaceChildren.apply(results, [el('h3', { text: 'Hash Results' + (label ? ' for ' + label : '') })].concat(rows,
          values['SHA-3'] ? [U.note('SHA-3 here is Keccak-512 with the original padding, which is what CryptoJS and most online tools print. It differs from the final FIPS 202 SHA3-512.')] : []));
        check();
      }

      function run() {
        var names = chosen();
        if (!names.length) { prog.fail('Tick at least one algorithm.'); return; }
        if (mode === 'text') {
          var data = enc.encode(input.value), out = {};
          names.forEach(function (a) { out[a] = HC.hash(a, data); });
          prog.set('');
          show(out, '');
          return;
        }
        if (!file) { prog.fail('Choose a file first.'); return; }
        if (job) job.cancel();
        var f = file, t0 = performance.now();
        busy(true);
        prog.set('Hashing ' + f.name + '…', 0);
        job = hashFile(f, names, function (fr) {
          var secs = (performance.now() - t0) / 1000;
          prog.set('Hashing ' + f.name + '… ' + Math.floor(fr * 100) + '%' + (secs > 1 ? ' · ' + U.bytes(f.size * fr / secs) + '/s' : ''), fr);
        });
        var mine = job;
        mine.promise.then(function (out) {
          if (job !== mine) return;
          job = null;
          busy(false);
          show(out, f.name);
          prog.done('Hashed ' + U.bytes(f.size) + ' in ' + ((performance.now() - t0) / 1000).toFixed(1) + ' s.');
        }).catch(function (e) {
          if (job !== mine) return;
          job = null;
          busy(false);
          prog.fail(e);
        });
      }

      function check() {
        var p = parseChecksum(verifyIn.value);
        Array.prototype.forEach.call(results.querySelectorAll('.hashrow'), function (r) { r.classList.remove('match'); });
        detected.textContent = '';
        if (!verifyIn.value.trim()) { verdict.className = 'note'; verdict.textContent = ''; return; }
        if (!p) { verdict.className = 'note err'; verdict.textContent = 'That does not look like a checksum: expected hex digits (or Base64).'; return; }
        var cands = p.hint ? [p.hint] : HASH_BY_LEN[p.hex.length];
        if (!cands) {
          verdict.className = 'note err';
          verdict.textContent = p.hex.length + ' hex digits is not the length of a supported hash (MD5 32, SHA-1 40, SHA-256 64, SHA-384 96, SHA-512 128).';
          return;
        }
        detected.textContent = 'Looks like ' + cands.map(function (a) { return HASH_LABEL[a] || a; }).join(' or ') + ' (' + p.hex.length + ' hex digits).';
        if (shownFor === null) { verdict.className = 'note'; verdict.textContent = mode === 'file' ? 'Choose a file to compare.' : 'Generate the hashes to compare.'; return; }
        var have = cands.filter(function (a) { return values[a]; });
        if (!have.length) { verdict.className = 'note err'; verdict.textContent = 'Tick ' + cands.join(' or ') + ' and hash again to compare.'; return; }
        var hit = have.filter(function (a) { return values[a] === p.hex; })[0];
        if (hit) { var row = results.querySelector('.hashrow[data-algo="' + hit + '"]'); if (row) row.classList.add('match'); }
        verdict.className = 'note ' + (hit ? 'ok' : 'err');
        verdict.textContent = hit ? '✓ Matches the ' + hit + ' hash' + (shownFor ? ' of ' + shownFor : '')
          : '✗ Does not match the ' + have.join(' or ') + ' hash' + (shownFor ? ' of ' + shownFor : '') + '. The ' + (mode === 'file' ? 'file' : 'text') + ' differs from the one the checksum was made from.';
      }

      verifyIn.addEventListener('input', check);
      upper.input.addEventListener('change', function () {
        Array.prototype.forEach.call(results.querySelectorAll('.hashrow'), function (r) { r.querySelector('code').textContent = fmt(values[r.dataset.algo]); });
      });
      input.addEventListener('input', U.debounce(function () { if (mode === 'text' && (input.value || shownFor !== null)) run(); }, 200));
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run(); });
      U.onTeardown(root, function () { if (job) job.cancel(); });

      root.appendChild(U.panel('Input', tabs, textPane, filePane,
        el('div', { class: 'field' }, el('label', { text: 'Algorithms' }), el('div', { class: 'algos' }, picks),
          el('span', { class: 'hint', text: 'For big files, untick the ones you do not need: SHA-3 and SHA-512 are the slowest.' })),
        U.row(upper),
        U.btnrow(genBtn, cancelBtn, U.button('Clear', function () { input.value = ''; file = null; fileInfo.textContent = ''; clearResults(); }, 'ghost')), prog));
      root.appendChild(U.panel('Verify a checksum', verifyIn, detected, verdict,
        U.note('Paste the hash published next to a download. The algorithm is worked out from its length; sha256sum lines, "SHA256 (file) = …" lines and Base64 also work.')));
      root.appendChild(U.panel('', results, U.btnrow(
        U.copyBtn('Copy all', function () { return HASH_ALGOS.filter(function (a) { return values[a]; }).map(function (a) { return a + '  ' + fmt(values[a]); }).join('\n'); }))));
    }
  });

  /* --- Bcrypt Generator ----------------------------------------------------- */

  function loadBcrypt() { return U.script('assets/vendor/bcryptjs/bcrypt.js').then(function () { return window.bcrypt; }); }

  Tools.register({
    id: 'bcrypt-generator', category: 'crypto', name: 'Bcrypt Generator',
    description: 'Hash passwords with bcrypt at a chosen cost, and verify a password against a hash.',
    keywords: ['bcrypt', 'password', 'hash', 'salt', 'verify', 'security'],
    render: function (root) {
      root.classList.add('g-crypto');
      var pw = el('input', { type: 'password', placeholder: 'Enter password to hash', autocomplete: 'off' });
      var show = U.checkbox('Show password');
      show.input.addEventListener('change', function () { pw.type = show.input.checked ? 'text' : 'password'; });
      var cost = el('input', { type: 'range', min: 4, max: 14, value: 12, 'aria-label': 'Cost factor' });
      var costLabel = el('label', { text: 'Cost Factor (rounds): 12' });
      var iters = U.note('~4,096 iterations');
      var prog = U.progress();
      var result = el('div');

      function syncCost() {
        costLabel.textContent = 'Cost Factor (rounds): ' + cost.value;
        iters.textContent = '~' + Math.pow(2, +cost.value).toLocaleString('en-US') + ' iterations';
      }
      cost.addEventListener('input', syncCost);

      var genBtn = U.button('Generate Bcrypt Hash', function () {
        if (!pw.value) { prog.fail('Enter a password first.'); return; }
        genBtn.disabled = true;
        prog.set('Hashing…', 0);
        var rounds = +cost.value, t0 = performance.now();
        loadBcrypt().then(function (bcrypt) {
          return new Promise(function (resolve, reject) {
            bcrypt.hash(pw.value, rounds, function (err, h) { if (err) reject(err); else resolve(h); },
              function (p) { prog.set('Hashing… ' + Math.round(p * 100) + '%', p); });
          });
        }).then(function (h) {
          var code = el('code', { text: h, dataset: { out: 'bcrypt' } });
          result.replaceChildren(el('div', { class: 'hashrow' },
            el('header', {}, el('b', { text: 'Hash Result' }), U.button('Copy', function () { U.copy(h); }, 'ghost mini')), code,
            U.note('Cost: ' + rounds + ' · Version: ' + h.slice(1, 3) + ' · ' + Math.round(performance.now() - t0) + ' ms')));
          prog.done('Done');
        }).catch(function (e) { prog.fail(e); }).then(function () { genBtn.disabled = false; });
      }, 'primary');

      var plain = el('input', { type: 'text', placeholder: 'Password to check', autocomplete: 'off' });
      var hashIn = el('input', { type: 'text', placeholder: '$2b$12$...', spellcheck: false });
      var verdict = U.note('');
      verdict.dataset.out = 'verify';
      var verifyBtn = U.button('Verify', function () {
        var h = hashIn.value.trim();
        if (!plain.value || !h) { verdict.className = 'note err'; verdict.textContent = 'Enter both a password and a hash.'; return; }
        if (!/^\$2[abxy]?\$\d{2}\$[./A-Za-z0-9]{53}$/.test(h)) { verdict.className = 'note err'; verdict.textContent = '✗ That is not a valid bcrypt hash.'; return; }
        verdict.className = 'note'; verdict.textContent = 'Checking…';
        verifyBtn.disabled = true;
        loadBcrypt().then(function (bcrypt) {
          return new Promise(function (resolve, reject) { bcrypt.compare(plain.value, h, function (err, ok) { if (err) reject(err); else resolve(ok); }); });
        }).then(function (ok) {
          verdict.className = 'note ' + (ok ? 'ok' : 'err');
          verdict.textContent = ok ? '✓ Password matches the hash' : '✗ Password does not match';
        }).catch(function (e) { verdict.className = 'note err'; verdict.textContent = e.message; })
          .then(function () { verifyBtn.disabled = false; });
      }, 'primary');

      root.appendChild(U.panel('Generate Hash', U.field('Password', pw), show,
        el('div', { class: 'field' }, costLabel, cost, iters,
          el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--fg-muted)' } },
            el('span', { text: '4 (fast)' }), el('span', { text: '10 (default)' }), el('span', { text: '14 (slow/secure)' }))),
        U.btnrow(genBtn), prog, result));
      root.appendChild(U.panel('Verify Password', U.field('Plain Password', plain), U.field('Bcrypt Hash', hashIn), U.btnrow(verifyBtn), verdict));
    }
  });

  /* --- Password strength scoring (shared) ------------------------------------- */

  var COMMON = /password|passw0rd|123|qwerty|letmein|admin|welcome|monkey|dragon|iloveyou|111|000|football|baseball|login|master|sunshine|princess|trustno1/i;

  function analyse(pw) {
    var checks = [
      ['At least 8 characters', pw.length >= 8],
      ['At least 12 characters', pw.length >= 12],
      ['Uppercase letters (A-Z)', /[A-Z]/.test(pw)],
      ['Lowercase letters (a-z)', /[a-z]/.test(pw)],
      ['Numbers (0-9)', /[0-9]/.test(pw)],
      ['Special characters (!@#$...)', /[^A-Za-z0-9]/.test(pw)],
      ['No common patterns', !COMMON.test(pw)],
      ['No repeated characters', !/(.)\1\1/.test(pw)]
    ];
    var score = pw ? checks.filter(function (c) { return c[1]; }).length : 0;
    var pool = (/[a-z]/.test(pw) ? 26 : 0) + (/[A-Z]/.test(pw) ? 26 : 0) + (/[0-9]/.test(pw) ? 10 : 0) + (/[^A-Za-z0-9]/.test(pw) ? 32 : 0);
    var length = Array.from(pw).length;
    var entropy = pool ? Math.round(length * Math.log2(pool)) : 0;
    var label = score <= 2 ? 'Very Weak' : score <= 4 ? 'Weak' : score === 5 ? 'Fair' : score === 6 ? 'Good' : score === 7 ? 'Strong' : 'Very Strong';
    var crack = entropy < 28 ? 'Instant' : entropy < 36 ? 'Seconds' : entropy < 45 ? 'Minutes' : entropy < 50 ? 'Hours'
      : entropy < 70 ? 'Days' : entropy < 100 ? 'Years' : 'Centuries';
    var colour = score <= 2 ? '#dc2626' : score <= 4 ? '#f97316' : score === 5 ? '#eab308' : score === 6 ? '#84cc16' : '#16a34a';
    return { checks: checks, score: score, entropy: entropy, label: label, crack: crack, length: length, colour: colour };
  }

  /* --- Password Generator ----------------------------------------------------- */

  var SETS = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', lower: 'abcdefghijklmnopqrstuvwxyz',
    digits: '0123456789', symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  };

  function makePassword(len, opts) {
    var sets = [];
    ['upper', 'lower', 'digits', 'symbols'].forEach(function (k) {
      if (!opts[k]) return;
      var s = SETS[k];
      if (opts.excludeSimilar) s = s.replace(/[il1Lo0O|I]/g, '');
      sets.push(s);
    });
    if (!sets.length) return null;
    var pool = sets.join('');
    var chars = [];
    /* Guarantee one of each chosen set, then fill and shuffle. */
    sets.forEach(function (s) { if (chars.length < len) chars.push(s[randomInt(s.length)]); });
    while (chars.length < len) chars.push(pool[randomInt(pool.length)]);
    for (var i = chars.length - 1; i > 0; i--) { var j = randomInt(i + 1), t = chars[i]; chars[i] = chars[j]; chars[j] = t; }
    return chars.join('');
  }

  Tools.register({
    id: 'password-generator', category: 'crypto', name: 'Password Generator',
    description: 'Generate strong random passwords with the character sets you choose.',
    keywords: ['password', 'generate', 'random', 'secure', 'strong'],
    render: function (root) {
      root.classList.add('g-crypto');
      var len = el('input', { type: 'range', min: 4, max: 128, value: 16, 'aria-label': 'Length' });
      var lenNum = el('input', { type: 'number', min: 4, max: 128, value: 16, style: { width: '80px' }, 'aria-label': 'Length value' });
      var count = U.chips([{ value: 1, label: '1' }, { value: 5, label: '5' }, { value: 10, label: '10' }], null, 5);
      var upper = U.checkbox('Uppercase (A-Z)', { checked: true });
      var lower = U.checkbox('Lowercase (a-z)', { checked: true });
      var digits = U.checkbox('Numbers (0-9)', { checked: true });
      var symbols = U.checkbox('Symbols (!@#$...)', { checked: true });
      var similar = U.checkbox('Exclude Similar (i, l, 1, o, 0)');
      var list = el('div', { class: 'pwlist' }, U.note('Click generate to create passwords'));
      var made = [];

      len.addEventListener('input', function () { lenNum.value = len.value; });
      lenNum.addEventListener('input', function () { len.value = Math.max(4, Math.min(128, +lenNum.value || 16)); });

      function generate() {
        var n = +count.value, size = Math.max(4, Math.min(128, +len.value));
        var opts = { upper: upper.input.checked, lower: lower.input.checked, digits: digits.input.checked, symbols: symbols.input.checked, excludeSimilar: similar.input.checked };
        made = [];
        for (var i = 0; i < n; i++) {
          var p = makePassword(size, opts);
          if (!p) { list.replaceChildren(U.note('Pick at least one character set.', 'err')); return; }
          made.push(p);
        }
        list.replaceChildren.apply(list, made.map(function (p) {
          var a = analyse(p);
          return el('div', { class: 'pwrow' }, el('code', { text: p }),
            el('span', { class: 'tag', style: { color: a.colour }, text: a.label }),
            U.button('Copy', function () { U.copy(p); }, 'ghost mini'));
        }));
      }

      root.appendChild(U.panel('Options',
        el('div', { class: 'field' }, el('label', { text: 'Length' }), el('div', { class: 'row' }, len, lenNum),
          el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--fg-muted)' } }, el('span', { text: '4' }), el('span', { text: '128' }))),
        el('div', { class: 'field' }, el('label', { text: 'Count' }), count),
        U.row(upper, lower, digits, symbols, similar),
        U.btnrow(U.button('Generate Passwords', generate, 'primary'))));
      root.appendChild(U.panel('Generated Passwords', list, U.btnrow(
        U.copyBtn('Copy all', function () { return made.join('\n'); }),
        U.downloadBtn('Download', 'passwords.txt', function () { return made.join('\n'); }))));
    }
  });

  /* --- Password Strength ------------------------------------------------------ */

  Tools.register({
    id: 'password-strength', category: 'crypto', name: 'Password Strength',
    description: 'Score a password, estimate its entropy and cracking time, and list what to improve.',
    keywords: ['password', 'strength', 'entropy', 'security', 'checker'],
    render: function (root) {
      root.classList.add('g-crypto');
      var input = el('input', { type: 'password', placeholder: 'Enter your password...', autocomplete: 'off' });
      var show = U.checkbox('Show password');
      show.input.addEventListener('change', function () { input.type = show.input.checked ? 'text' : 'password'; });
      var outWrap = el('div');

      function draw() {
        var pw = input.value;
        if (!pw) { outWrap.replaceChildren(); return; }
        var a = analyse(pw);
        outWrap.replaceChildren(
          U.panel('', el('h2', { style: { color: a.colour, margin: '0 0 10px' }, dataset: { out: 'label' }, text: a.label }),
            U.stats([{ value: String(a.length), label: 'Length' }, { value: String(a.entropy), label: 'Entropy (bits)' }, { value: a.crack, label: 'Time to Crack' }])),
          U.panel('Strength Meter', el('div', { class: 'meter' }, el('i', { style: { width: (a.score / 8 * 100) + '%', background: a.colour } })),
            el('div', { class: 'note', dataset: { out: 'score' }, text: a.score + '/8' })),
          U.panel('Security Checks', el('ul', { class: 'checks' }, a.checks.map(function (c) {
            return el('li', { class: c[1] ? 'ok' : 'bad', text: (c[1] ? '✓ ' : '✗ ') + c[0] });
          }))));
      }
      input.addEventListener('input', draw);

      root.appendChild(U.panel('Password to Analyze', input, show, U.note('Nothing you type leaves this page.')));
      root.appendChild(outWrap);
    }
  });

  /* --- HMAC Generator ----------------------------------------------------------- */

  var HMAC_ALGOS = [['HMAC-MD5', 'MD5'], ['HMAC-SHA1', 'SHA-1'], ['HMAC-SHA256', 'SHA-256'], ['HMAC-SHA512', 'SHA-512'], ['HMAC-SHA3', 'SHA-3']];

  Tools.register({
    id: 'hmac-generator', category: 'crypto', name: 'HMAC Generator',
    description: 'Sign a message with a secret key using HMAC-MD5, SHA-1, SHA-256, SHA-512 or SHA-3.',
    keywords: ['hmac', 'signature', 'sha256', 'secret', 'webhook', 'mac'],
    render: function (root) {
      root.classList.add('g-crypto');
      var msg = el('textarea', { rows: 5, value: 'Hello, World!' });
      var key = el('input', { type: 'password', value: 'secret-key', autocomplete: 'off' });
      var algo = U.select({ options: HMAC_ALGOS.map(function (a) { return { value: a[1], label: a[0] }; }), value: 'SHA-256' });
      var format = U.select({ options: ['Hex', 'Base64'], value: 'Hex' });
      var out = el('code', { dataset: { out: 'hmac' }, style: { fontFamily: 'var(--mono)', wordBreak: 'break-all', display: 'block' } });
      var status = U.note('');
      var seq = 0;

      function run() {
        var mine = ++seq;
        try {
          hmac(algo.value, key.value, msg.value).then(function (sig) {
            if (mine !== seq) return;
            out.textContent = format.value === 'Base64' ? toB64(sig) : toHex(sig);
            status.textContent = '';
          }).catch(function (e) { status.className = 'note err'; status.textContent = e.message; });
        } catch (e) { status.className = 'note err'; status.textContent = e.message; }
      }
      [msg, key, algo, format].forEach(function (n) { n.addEventListener('input', run); n.addEventListener('change', run); });
      run();

      root.appendChild(U.panel('Input', U.field('Message', msg), U.field('Secret Key', key),
        U.row(U.field('Algorithm', algo), U.field('Output Format', format))));
      root.appendChild(U.panel('HMAC Result', el('div', { class: 'hashrow' }, out), status,
        U.btnrow(U.copyBtn('Copy', function () { return out.textContent; }))));
    }
  });

  /* --- AES Encrypt/Decrypt ----------------------------------------------------------- */

  /* OpenSSL / CryptoJS passphrase format: "Salted__" + salt + AES-256-CBC,
     key and IV from EVP_BytesToKey with MD5. Output interoperates with
     `openssl enc -aes-256-cbc -md md5 -a` and CryptoJS.AES. */
  function evpKdf(pass, salt, keyLen) {
    var out = new Uint8Array(0), prev = new Uint8Array(0);
    while (out.length < keyLen + 16) {
      prev = md5b(concat(prev, pass, salt));
      out = concat(out, prev);
    }
    return { key: out.slice(0, keyLen), iv: out.slice(keyLen, keyLen + 16) };
  }

  function aesEncrypt(text, pass) {
    needSubtle();
    var salt = randomBytes(8), kv = evpKdf(bytes(pass), salt, 32);
    return crypto.subtle.importKey('raw', kv.key, 'AES-CBC', false, ['encrypt'])
      .then(function (k) { return crypto.subtle.encrypt({ name: 'AES-CBC', iv: kv.iv }, k, bytes(text)); })
      .then(function (ct) { return toB64(concat(enc.encode('Salted__'), salt, new Uint8Array(ct))); });
  }

  function aesDecrypt(b64, pass) {
    needSubtle();
    var raw;
    try { raw = fromB64(b64.trim()); } catch (e) { return Promise.reject(new Error('The ciphertext is not valid Base64.')); }
    if (raw.length < 32 || dec.decode(raw.slice(0, 8)) !== 'Salted__') return Promise.reject(new Error('The ciphertext is not in the salted OpenSSL/CryptoJS format (it should start with U2FsdGVkX1).'));
    var salt = raw.slice(8, 16), kv = evpKdf(bytes(pass), salt, 32);
    return crypto.subtle.importKey('raw', kv.key, 'AES-CBC', false, ['decrypt'])
      .then(function (k) { return crypto.subtle.decrypt({ name: 'AES-CBC', iv: kv.iv }, k, raw.slice(16)); })
      .then(function (pt) { return new TextDecoder('utf-8', { fatal: true }).decode(pt); })
      .catch(function () { throw new Error('Decryption failed — wrong key or corrupted ciphertext.'); });
  }

  Tools.register({
    id: 'aes-cipher', category: 'crypto', name: 'AES Encrypt/Decrypt',
    description: 'Encrypt and decrypt text with a passphrase using AES (OpenSSL/CryptoJS compatible).',
    keywords: ['aes', 'encrypt', 'decrypt', 'cipher', 'passphrase', 'cryptojs', 'openssl'],
    render: function (root) {
      root.classList.add('g-crypto');
      var mode = 'encrypt';
      var key = el('input', { type: 'password', placeholder: 'Enter your secret key...', autocomplete: 'off' });
      var keySize = U.chips(['128-bit', '192-bit', '256-bit'], null, '256-bit');
      var inLabel = el('label', { text: 'Plaintext' });
      var input = el('textarea', { rows: 6, placeholder: 'Enter text to encrypt...' });
      var output = el('textarea', { rows: 6, placeholder: 'Output will appear here...', readOnly: true });
      var outLabel = el('label', { text: 'Encrypted Output' });
      var status = U.note('');
      var action = U.button('Encrypt', go, 'primary');

      var tabs = U.chips([{ value: 'encrypt', label: 'Encrypt' }, { value: 'decrypt', label: 'Decrypt' }], function (v) {
        mode = v;
        inLabel.textContent = v === 'encrypt' ? 'Plaintext' : 'Ciphertext';
        input.placeholder = v === 'encrypt' ? 'Enter text to encrypt...' : 'Paste Base64 ciphertext (U2FsdGVkX1...)';
        outLabel.textContent = v === 'encrypt' ? 'Encrypted Output' : 'Decrypted Output';
        action.textContent = v === 'encrypt' ? 'Encrypt' : 'Decrypt';
        output.value = ''; status.textContent = '';
      }, 'encrypt');

      function go() {
        if (!key.value) { status.className = 'note err'; status.textContent = 'Enter a secret key.'; return; }
        if (!input.value) { status.className = 'note err'; status.textContent = 'Enter some text first.'; return; }
        status.className = 'note'; status.textContent = '';
        var p;
        try { p = mode === 'encrypt' ? aesEncrypt(input.value, key.value) : aesDecrypt(input.value, key.value); }
        catch (e) { p = Promise.reject(e); }
        p.then(function (r) { output.value = r; status.className = 'note ok'; status.textContent = mode === 'encrypt' ? 'Encrypted with AES-CBC (passphrase, salted).' : 'Decrypted.'; })
          .catch(function (e) { output.value = ''; status.className = 'note err'; status.textContent = e.message; });
      }

      root.appendChild(U.panel('', tabs, U.field('Secret Key', key), el('div', { class: 'field' }, el('label', { text: 'Key Size' }), keySize),
        U.note('Passphrase mode always derives a 256-bit key (the OpenSSL/CryptoJS convention), so any key-size choice decrypts the same data.'),
        el('div', { class: 'field' }, inLabel, input), U.btnrow(action), status));
      root.appendChild(U.panel('', el('div', { class: 'field' }, outLabel, output), U.btnrow(U.copyBtn('Copy', function () { return output.value; }))));
    }
  });

  /* --- JWT Generator ------------------------------------------------------------------ */

  Tools.register({
    id: 'jwt-generator', category: 'crypto', name: 'JWT Generator',
    description: 'Build and sign JSON Web Tokens with HS256, HS384 or HS512.',
    keywords: ['jwt', 'json web token', 'hs256', 'sign', 'token', 'auth'],
    render: function (root) {
      root.classList.add('g-crypto');
      var algo = U.select({ options: [{ value: 'HS256', label: 'HS256 (HMAC-SHA256)' }, { value: 'HS384', label: 'HS384 (HMAC-SHA384)' }, { value: 'HS512', label: 'HS512 (HMAC-SHA512)' }], value: 'HS256' });
      var secret = el('input', { type: 'password', placeholder: 'Enter secret key', value: 'your-256-bit-secret', autocomplete: 'off' });
      var now = Math.floor(Date.now() / 1000);
      var payload = el('textarea', { rows: 9, spellcheck: false, style: { fontFamily: 'var(--mono)' },
        value: JSON.stringify({ sub: '1234567890', name: 'Jane Doe', email: 'jane@example.com', iat: now, exp: now + 3600 }, null, 2) });
      var token = el('div', { class: 'jwt', dataset: { out: 'jwt' } });
      var status = U.note('');
      var current = '', seq = 0;

      function run() {
        var mine = ++seq, body;
        try { body = JSON.parse(payload.value); }
        catch (e) { status.className = 'note err'; status.textContent = 'Invalid JSON: ' + e.message; return; }
        var header = { alg: algo.value, typ: 'JWT' };
        var h = b64url(enc.encode(JSON.stringify(header))), p = b64url(enc.encode(JSON.stringify(body)));
        var hash = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' }[algo.value];
        try {
          hmac(hash, secret.value, h + '.' + p).then(function (sig) {
            if (mine !== seq) return;
            var s = b64url(sig);
            current = h + '.' + p + '.' + s;
            token.replaceChildren(el('span', { class: 'h', text: h }), '.', el('span', { class: 'p', text: p }), '.', el('span', { class: 's', text: s }));
            status.className = 'note'; status.textContent = '';
          }).catch(function (e) { status.className = 'note err'; status.textContent = e.message; });
        } catch (e) { status.className = 'note err'; status.textContent = e.message; }
      }
      [algo, secret, payload].forEach(function (n) { n.addEventListener('input', run); n.addEventListener('change', run); });
      run();

      root.appendChild(U.panel('', U.field('Algorithm', algo), U.field('Secret Key', secret), U.field('Payload (JSON)', payload),
        U.btnrow(U.button('Refresh iat/exp', function () {
          try {
            var o = JSON.parse(payload.value), t = Math.floor(Date.now() / 1000);
            o.iat = t; o.exp = t + 3600;
            payload.value = JSON.stringify(o, null, 2); run();
          } catch (e) { U.toast('Fix the JSON first', 'err'); }
        }, 'ghost')), status));
      root.appendChild(U.panel('Generated JWT', token,
        el('div', { class: 'legend' }, el('span', { class: 'h', style: { color: '#e11d48' }, text: 'Header' }),
          el('span', { style: { color: '#7c3aed' }, text: 'Payload' }), el('span', { style: { color: '#0891b2' }, text: 'Signature' })),
        U.btnrow(U.copyBtn('Copy JWT', function () { return current; }))));
    }
  });

  /* --- OTP Generator (RFC 4226 / RFC 6238) ------------------------------------------ */

  var B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  function base32Decode(s) {
    s = s.toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '');
    if (!s) throw new Error('Enter a Base32 secret.');
    var bits = 0, value = 0, out = [];
    for (var i = 0; i < s.length; i++) {
      var idx = B32.indexOf(s[i]);
      if (idx < 0) throw new Error('"' + s[i] + '" is not a Base32 character (A–Z, 2–7).');
      value = (value << 5) | idx; bits += 5;
      if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
    }
    return new Uint8Array(out);
  }
  function base32Encode(b) {
    var bits = 0, value = 0, out = '';
    for (var i = 0; i < b.length; i++) {
      value = (value << 8) | b[i]; bits += 8;
      while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
    }
    if (bits > 0) out += B32[(value << (5 - bits)) & 31];
    return out;
  }

  function hotp(keyBytes, counter, digits) {
    var msg = new Uint8Array(8), c = counter;
    for (var i = 7; i >= 0; i--) { msg[i] = c % 256; c = Math.floor(c / 256); }
    return hmac('SHA-1', keyBytes, msg).then(function (h) {
      var o = h[h.length - 1] & 15;
      var code = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
      return String(code % Math.pow(10, digits || 6)).padStart(digits || 6, '0');
    });
  }

  Tools.register({
    id: 'otp-generator', category: 'crypto', name: 'OTP Generator',
    description: 'Generate TOTP and HOTP one-time passwords from a Base32 secret, like an authenticator app.',
    keywords: ['otp', 'totp', 'hotp', '2fa', 'authenticator', 'mfa', 'one-time password'],
    render: function (root) {
      root.classList.add('g-crypto');
      var secret = el('input', { type: 'text', placeholder: 'JBSWY3DPEHPK3PXP', value: 'JBSWY3DPEHPK3PXP', spellcheck: false, style: { fontFamily: 'var(--mono)' } });
      var status = U.note('Enter a Base32 encoded secret (compatible with Google Authenticator, Authy, etc.)');
      var totpEl = el('div', { class: 'otp', dataset: { out: 'totp' }, text: '------' });
      var refresh = U.note('');
      var hotpEl = el('div', { class: 'otp', dataset: { out: 'hotp' }, text: '------' });
      var counterEl = U.note('Counter: 0');
      var counter = 0, timer = 0, lastStep = -1;

      function key() { return base32Decode(secret.value); }

      function tick(force) {
        var now = Date.now() / 1000, step = Math.floor(now / 30);
        refresh.textContent = 'Refreshes in ' + (30 - Math.floor(now % 30)) + 's';
        if (step === lastStep && !force) return;
        lastStep = step;
        var k;
        try { k = key(); } catch (e) { totpEl.textContent = '------'; status.className = 'note err'; status.textContent = e.message; return; }
        status.className = 'note';
        status.textContent = 'Enter a Base32 encoded secret (compatible with Google Authenticator, Authy, etc.)';
        hotp(k, step, 6).then(function (c) { totpEl.textContent = c; }).catch(function (e) { status.className = 'note err'; status.textContent = e.message; });
      }

      function showHotp() {
        counterEl.textContent = 'Counter: ' + counter;
        var k;
        try { k = key(); } catch (e) { hotpEl.textContent = '------'; return; }
        hotp(k, counter, 6).then(function (c) { hotpEl.textContent = c; }).catch(function () {});
      }

      secret.addEventListener('input', function () { tick(true); counter = 0; showHotp(); });
      timer = setInterval(function () { tick(false); }, 1000);
      U.onTeardown(root, function () { clearInterval(timer); });
      tick(true); showHotp();

      root.appendChild(U.panel('Base32 Secret Key', U.row(el('div', { class: 'grow' }, secret),
        U.button('Generate Random', function () { secret.value = base32Encode(randomBytes(20)); secret.dispatchEvent(new Event('input')); }, 'ghost')), status));
      root.appendChild(U.split(
        U.panel('TOTP (Time-based)', totpEl, refresh, U.btnrow(U.copyBtn('Copy OTP', function () { return totpEl.textContent; }))),
        U.panel('HOTP (Counter-based)', hotpEl, counterEl, U.btnrow(
          U.button('Generate Next OTP', function () { counter++; showHotp(); }, 'primary'),
          U.button('Reset counter', function () { counter = 0; showHotp(); }, 'ghost'),
          U.copyBtn('Copy', function () { return hotpEl.textContent; })))));
      root.appendChild(U.panel('Usage tip', U.note('To use with authenticator apps: enter the secret key manually in Google Authenticator, Authy, or any TOTP-compatible app. The generated OTPs will match.')));
    }
  });

  /* --- Caesar Cipher --------------------------------------------------------------- */

  function caesar(text, shift) {
    shift = ((shift % 26) + 26) % 26;
    return text.replace(/[a-z]/gi, function (ch) {
      var base = ch <= 'Z' ? 65 : 97;
      return String.fromCharCode((ch.charCodeAt(0) - base + shift) % 26 + base);
    });
  }

  Tools.register({
    id: 'caesar-cipher', category: 'crypto', name: 'Caesar Cipher',
    description: 'Shift letters to encrypt or decrypt a Caesar cipher, with every shift listed for brute force.',
    keywords: ['caesar', 'rot13', 'cipher', 'shift', 'encrypt', 'decrypt', 'brute force'],
    render: function (root) {
      root.classList.add('g-crypto');
      var mode = 'encrypt';
      var input = el('textarea', { rows: 4, value: 'Hello, World!' });
      var shift = el('input', { type: 'range', min: 1, max: 25, value: 13, 'aria-label': 'Shift' });
      var shiftLabel = el('label', { text: 'Shift: 13' });
      var rot = el('span', { class: 'tag', text: 'ROT13' });
      var outLabel = el('label', { text: 'Encrypted' });
      var output = el('textarea', { rows: 4, readOnly: true, placeholder: 'Output will appear here...' });
      var brute = el('div', { class: 'brute' });

      function run() {
        var n = +shift.value;
        shiftLabel.textContent = 'Shift: ' + n;
        rot.textContent = 'ROT' + n;
        outLabel.textContent = mode === 'encrypt' ? 'Encrypted' : 'Decrypted';
        output.value = caesar(input.value, mode === 'encrypt' ? n : -n);
        var rows = [];
        for (var i = 0; i < 26; i++) {
          rows.push(el('b', { class: i === n ? 'cur' : '', text: 'ROT' + i }), el('span', { text: caesar(input.value, i) }));
        }
        brute.replaceChildren.apply(brute, rows);
      }
      var tabs = U.chips([{ value: 'encrypt', label: 'Encrypt' }, { value: 'decrypt', label: 'Decrypt' }], function (v) { mode = v; run(); }, 'encrypt');
      input.addEventListener('input', run);
      shift.addEventListener('input', run);
      run();

      root.appendChild(U.panel('', tabs, U.field('Input Text', input), el('div', { class: 'field' }, el('div', {}, shiftLabel, ' ', rot), shift),
        el('div', { class: 'field' }, outLabel, output), U.btnrow(U.copyBtn('Copy', function () { return output.value; }))));
      root.appendChild(U.panel('All Shifts (Brute Force)', brute));
    }
  });

  /* --- Vigenere Cipher ------------------------------------------------------------ */

  function vigenere(text, key, decrypt) {
    var k = key.toUpperCase().replace(/[^A-Z]/g, '');
    if (!k) return text;
    var j = 0;
    return text.replace(/[a-z]/gi, function (ch) {
      var base = ch <= 'Z' ? 65 : 97;
      var s = k.charCodeAt(j++ % k.length) - 65;
      if (decrypt) s = 26 - s;
      return String.fromCharCode((ch.charCodeAt(0) - base + s) % 26 + base);
    });
  }

  Tools.register({
    id: 'vigenere-cipher', category: 'crypto', name: 'Vigenère Cipher',
    description: 'Encrypt or decrypt text with the Vigenère keyword cipher.',
    keywords: ['vigenere', 'cipher', 'polyalphabetic', 'keyword', 'encrypt', 'decrypt'],
    render: function (root) {
      root.classList.add('g-crypto');
      var mode = 'encrypt';
      var key = el('input', { type: 'text', placeholder: 'e.g. SECRET', value: 'SECRET' });
      var inLabel = el('label', { text: 'Plaintext' }), outLabel = el('label', { text: 'Ciphertext' });
      var input = el('textarea', { rows: 5, value: 'Hello World' });
      var output = el('textarea', { rows: 5, readOnly: true });
      var status = U.note('');

      function run() {
        var clean = key.value.replace(/[^A-Za-z]/g, '');
        status.className = clean ? 'note' : 'note err';
        status.textContent = clean ? '' : 'The key needs at least one letter.';
        output.value = vigenere(input.value, key.value, mode === 'decrypt');
      }
      var tabs = U.chips([{ value: 'encrypt', label: 'Encrypt' }, { value: 'decrypt', label: 'Decrypt' }], function (v) {
        var prev = output.value;
        mode = v;
        inLabel.textContent = v === 'encrypt' ? 'Plaintext' : 'Ciphertext';
        outLabel.textContent = v === 'encrypt' ? 'Ciphertext' : 'Plaintext';
        input.value = prev;
        run();
      }, 'encrypt');
      key.addEventListener('input', run);
      input.addEventListener('input', run);
      run();

      root.appendChild(U.panel('', U.field('Key (letters only)', key), status, tabs,
        U.split(el('div', { class: 'field' }, inLabel, input), el('div', { class: 'field' }, outLabel, output)),
        U.btnrow(U.copyBtn('Copy', function () { return output.value; })),
        U.note('The Vigenère cipher uses a keyword to shift letters — stronger than Caesar cipher as the shift varies per character.')));
    }
  });

  /* --- RSA Key Generator ------------------------------------------------------------ */

  function pem(label, buf) {
    var b64 = toB64(new Uint8Array(buf)).replace(/(.{64})/g, '$1\n').replace(/\n$/, '');
    return '-----BEGIN ' + label + '-----\n' + b64 + '\n-----END ' + label + '-----';
  }

  Tools.register({
    id: 'rsa-keygen', category: 'crypto', name: 'RSA Key Generator',
    description: 'Generate RSA public/private key pairs in PEM format with WebCrypto.',
    keywords: ['rsa', 'key pair', 'public key', 'private key', 'pem', 'pkcs8', 'spki'],
    render: function (root) {
      root.classList.add('g-crypto');
      var size = U.select({ options: [{ value: '1024', label: '1024 bits (legacy)' }, { value: '2048', label: '2048 bits (standard)' }, { value: '4096', label: '4096 bits (high security)' }], value: '2048' });
      var prog = U.progress();
      var out = el('div');
      var btn = U.button('Generate Key Pair', function () {
        try { needSubtle(); } catch (e) { prog.fail(e); return; }
        var bits = +size.value, t0 = performance.now();
        btn.disabled = true;
        prog.set('Generating ' + bits + '-bit key pair…');
        crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: bits, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])
          .then(function (pair) { return Promise.all([crypto.subtle.exportKey('spki', pair.publicKey), crypto.subtle.exportKey('pkcs8', pair.privateKey)]); })
          .then(function (keys) {
            var pub = pem('PUBLIC KEY', keys[0]), priv = pem('PRIVATE KEY', keys[1]);
            var pubTa = el('textarea', { class: 'pem', readOnly: true, value: pub, dataset: { out: 'public' } });
            var privTa = el('textarea', { class: 'pem', readOnly: true, value: priv, dataset: { out: 'private' } });
            out.replaceChildren(
              U.note('RSA-' + bits + ' / SHA-256 / SPKI'),
              U.field('Public Key (SPKI / PEM)', pubTa),
              U.btnrow(U.copyBtn('Copy', pub), U.downloadBtn('Download public.pem', 'public.pem', pub)),
              U.field('Private Key (PKCS#8 / PEM)', privTa),
              U.btnrow(U.copyBtn('Copy', priv), U.downloadBtn('Download private.pem', 'private.pem', priv)),
              U.note('⚠ Never share your private key. Store it securely and never transmit it over unsecured channels.', 'err'));
            prog.done('Generated in ' + Math.round(performance.now() - t0) + ' ms');
          })
          .catch(function (e) { prog.fail(e); })
          .then(function () { btn.disabled = false; });
      }, 'primary');

      root.appendChild(U.panel('', U.field('Key Size', size), U.btnrow(btn), prog, out));
      root.appendChild(U.panel('Key generation info', U.note('Keys are generated entirely in your browser using the WebCrypto API. Nothing is sent to any server.'),
        U.note('2048-bit is the current standard for most uses. 4096-bit provides extra security at the cost of performance.')));
    }
  });

  window.CryptoKit = { digest: digest, hasher: function (name) { return HC.create(name); }, parseChecksum: parseChecksum,
    hmac: hmac, toHex: toHex, toB64: toB64, fromB64: fromB64, sha224: sha224, ripemd160: ripemd160, keccak512: keccak512,
    aesEncrypt: aesEncrypt, aesDecrypt: aesDecrypt, hotp: hotp, base32Decode: base32Decode, analyse: analyse, caesar: caesar, vigenere: vigenere };

  /* --- X.509 Certificate Decoder ------------------------------------------ */

  var OIDS = {
    '2.5.4.3': 'CN', '2.5.4.6': 'C', '2.5.4.7': 'L', '2.5.4.8': 'ST', '2.5.4.10': 'O', '2.5.4.11': 'OU', '2.5.4.5': 'serialNumber', '2.5.4.9': 'street', '2.5.4.17': 'postalCode',
    '1.2.840.113549.1.9.1': 'emailAddress', '0.9.2342.19200300.100.1.25': 'DC', '2.5.4.4': 'SN', '2.5.4.42': 'givenName', '2.5.4.12': 'title', '2.5.4.15': 'businessCategory',
    '1.3.6.1.4.1.311.60.2.1.3': 'jurisdictionC', '1.3.6.1.4.1.311.60.2.1.2': 'jurisdictionST',
    '1.2.840.113549.1.1.1': 'RSA', '1.2.840.113549.1.1.5': 'SHA-1 with RSA', '1.2.840.113549.1.1.11': 'SHA-256 with RSA', '1.2.840.113549.1.1.12': 'SHA-384 with RSA', '1.2.840.113549.1.1.13': 'SHA-512 with RSA',
    '1.2.840.113549.1.1.10': 'RSA-PSS', '1.2.840.10045.2.1': 'EC', '1.2.840.10045.4.3.2': 'ECDSA with SHA-256', '1.2.840.10045.4.3.3': 'ECDSA with SHA-384', '1.2.840.10045.4.3.4': 'ECDSA with SHA-512',
    '1.3.101.112': 'Ed25519', '1.3.101.113': 'Ed448', '1.2.840.10045.3.1.7': 'P-256 (prime256v1)', '1.3.132.0.34': 'P-384 (secp384r1)', '1.3.132.0.35': 'P-521 (secp521r1)', '1.3.132.0.10': 'secp256k1',
    '2.5.29.14': 'Subject Key Identifier', '2.5.29.15': 'Key Usage', '2.5.29.17': 'Subject Alternative Name', '2.5.29.19': 'Basic Constraints', '2.5.29.31': 'CRL Distribution Points',
    '2.5.29.32': 'Certificate Policies', '2.5.29.35': 'Authority Key Identifier', '2.5.29.37': 'Extended Key Usage', '1.3.6.1.5.5.7.1.1': 'Authority Information Access',
    '1.3.6.1.4.1.11129.2.4.2': 'Signed Certificate Timestamps', '2.5.29.18': 'Issuer Alternative Name', '2.5.29.30': 'Name Constraints', '2.5.29.36': 'Policy Constraints', '2.5.29.9': 'Subject Directory Attributes',
    '1.3.6.1.5.5.7.3.1': 'TLS server authentication', '1.3.6.1.5.5.7.3.2': 'TLS client authentication', '1.3.6.1.5.5.7.3.3': 'Code signing', '1.3.6.1.5.5.7.3.4': 'Email protection', '1.3.6.1.5.5.7.3.8': 'Time stamping', '1.3.6.1.5.5.7.3.9': 'OCSP signing',
    '1.3.6.1.5.5.7.48.1': 'OCSP', '1.3.6.1.5.5.7.48.2': 'CA issuers', '2.23.140.1.2.1': 'Domain validated (CA/B)', '2.23.140.1.2.2': 'Organisation validated (CA/B)', '2.23.140.1.1': 'Extended validation (CA/B)',
    '1.2.840.113549.1.9.14': 'extensionRequest', '1.2.840.113549.1.9.7': 'challengePassword'
  };
  function derParse(bytes, offset, end, depth) {
    var out = [], i = offset || 0;
    end = end === undefined ? bytes.length : end;
    while (i < end) {
      var start = i, tag = bytes[i++];
      if ((tag & 0x1f) === 0x1f) { tag = 0; while (bytes[i] & 0x80) i++; i++; }
      if (i >= end) throw new Error('Truncated DER data');
      var len = bytes[i++];
      if (len & 0x80) { var n = len & 0x7f; len = 0; for (var k = 0; k < n; k++) len = len * 256 + bytes[i++]; }
      var node = { tag: tag, cls: tag >> 6, constructed: !!(tag & 0x20), num: tag & 0x1f, start: start, hstart: i, len: len, end: i + len, children: null, depth: depth || 0 };
      if (node.end > end) throw new Error('DER length runs past the end of the data');
      if (node.constructed) node.children = derParse(bytes, i, node.end, (depth || 0) + 1);
      out.push(node);
      i = node.end;
    }
    return out;
  }
  function derOid(b, n) {
    var s = '', v = 0, first = true;
    for (var i = n.hstart; i < n.end; i++) {
      v = v * 128 + (b[i] & 0x7f);
      if (!(b[i] & 0x80)) { if (first) { s += Math.floor(v / 40) + '.' + (v % 40); first = false; } else s += '.' + v; v = 0; }
    }
    return s;
  }
  function derStr(b, n) { return new TextDecoder(n.num === 30 ? 'utf-16be' : 'utf-8').decode(b.subarray(n.hstart, n.end)); }
  function derInt(b, n) { var h = toHex(b.subarray(n.hstart, n.end)); return h.replace(/^00(?=..)/, ''); }
  function derTime(b, n) {
    var s = derStr(b, n), m = n.num === 23 ? /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?Z?$/.exec(s) : /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?(\.\d+)?Z?$/.exec(s);
    if (!m) return new Date(NaN);
    var y = n.num === 23 ? (+m[1] < 50 ? 2000 : 1900) + +m[1] : +m[1];
    return new Date(Date.UTC(y, +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));
  }
  function derName(b, seq) {
    /* Name ::= SEQUENCE OF SET OF SEQUENCE { OID, value } */
    var parts = [];
    (seq.children || []).forEach(function (set) {
      (set.children || []).forEach(function (atv) {
        var oid = derOid(b, atv.children[0]), v = atv.children[1];
        parts.push([OIDS[oid] || oid, v.constructed ? '(complex)' : derStr(b, v)]);
      });
    });
    return parts;
  }
  function nameText(parts) { return parts.map(function (p) { return p[0] + '=' + p[1]; }).join(', '); }
  function bitStringFlags(b, n, names) {
    var unused = b[n.hstart], bits = [], out = [];
    for (var i = n.hstart + 1; i < n.end; i++) for (var k = 7; k >= 0; k--) bits.push((b[i] >> k) & 1);
    bits.length = Math.max(0, bits.length - unused);
    bits.forEach(function (bit, i) { if (bit && names[i]) out.push(names[i]); });
    return out;
  }
  function pemBlocks(text) {
    var out = [], re = /-----BEGIN ([^-]+)-----([\s\S]*?)-----END \1-----/g, m;
    while ((m = re.exec(text))) out.push({ label: m[1].trim(), bytes: fromB64(m[2].replace(/[^A-Za-z0-9+\/=]/g, '')) });
    return out;
  }
  function generalNames(b, node) {
    return (node.children || []).map(function (gn) {
      var kinds = { 0: 'other', 1: 'email', 2: 'DNS', 4: 'dir', 6: 'URI', 7: 'IP', 8: 'RID' };
      if (gn.num === 7) { var ip = b.subarray(gn.hstart, gn.end); return 'IP: ' + (ip.length === 4 ? Array.from(ip).join('.') : Array.from(ip).map(function (x, i) { return (i % 2 ? '' : (i ? ':' : '')) + x.toString(16).padStart(2, '0'); }).join('').replace(/(:?)([0-9a-f]{4})/g, '$1$2')); }
      if (gn.num === 4) return 'dirName: ' + nameText(derName(b, gn.children[0]));
      return (kinds[gn.num] || 'name') + ': ' + (gn.constructed ? '(complex)' : derStr(b, gn));
    });
  }
  function decodeCertificate(b) {
    var top = derParse(b)[0];
    if (!top || !top.children || top.children.length < 3) throw new Error('This is not a DER certificate.');
    var tbs = top.children[0], sigAlg = top.children[1], sig = top.children[2], c = tbs.children, i = 0, info = { extensions: [] };
    if (c[0].cls === 2 && c[0].num === 0) { info.version = 'v' + (b[c[0].children[0].hstart] + 1); i = 1; } else info.version = 'v1';
    info.serial = derInt(b, c[i++]);
    info.tbsSigAlg = derOid(b, c[i++].children[0]);
    info.issuer = derName(b, c[i++]);
    var val = c[i++]; info.notBefore = derTime(b, val.children[0]); info.notAfter = derTime(b, val.children[1]);
    info.subject = derName(b, c[i++]);
    var spki = c[i++]; info.keyAlg = derOid(b, spki.children[0].children[0]);
    var bs = spki.children[1];
    if (info.keyAlg === '1.2.840.113549.1.1.1') { var rsa = derParse(b, bs.hstart + 1, bs.end)[0]; info.keyBits = (rsa.children[0].len - (b[rsa.children[0].hstart] === 0 ? 1 : 0)) * 8; info.exponent = parseInt(derInt(b, rsa.children[1]), 16); }
    else if (info.keyAlg === '1.2.840.10045.2.1') { info.curve = spki.children[0].children[1] ? (OIDS[derOid(b, spki.children[0].children[1])] || derOid(b, spki.children[0].children[1])) : ''; info.keyBits = { 'P-256 (prime256v1)': 256, 'P-384 (secp384r1)': 384, 'P-521 (secp521r1)': 521, 'secp256k1': 256 }[info.curve] || (bs.len - 2) * 4; }
    else info.keyBits = (bs.len - 1) * 8;
    info.spkiBytes = b.subarray(spki.start, spki.end);
    for (; i < c.length; i++) {
      if (c[i].cls === 2 && c[i].num === 3) {
        (c[i].children[0].children || []).forEach(function (ext) {
          var oid = derOid(b, ext.children[0]), critical = false, valNode = ext.children[1];
          if (valNode.num === 1) { critical = !!b[valNode.hstart]; valNode = ext.children[2]; }
          var inner, text = '';
          try { inner = derParse(b, valNode.hstart, valNode.end)[0]; } catch (e) { inner = null; }
          try {
            if (oid === '2.5.29.17' || oid === '2.5.29.18') text = generalNames(b, inner).join('\n');
            else if (oid === '2.5.29.19') { var ca = inner.children && inner.children[0] && inner.children[0].num === 1 ? !!b[inner.children[0].hstart] : false; text = 'CA: ' + (ca ? 'TRUE' : 'FALSE') + (inner.children && inner.children.length > 1 ? ', path length ' + parseInt(derInt(b, inner.children[inner.children.length - 1]), 16) : ''); }
            else if (oid === '2.5.29.15') text = bitStringFlags(b, inner, ['Digital signature', 'Non-repudiation', 'Key encipherment', 'Data encipherment', 'Key agreement', 'Certificate signing', 'CRL signing', 'Encipher only', 'Decipher only']).join(', ');
            else if (oid === '2.5.29.37') text = inner.children.map(function (o) { var id = derOid(b, o); return OIDS[id] || id; }).join(', ');
            else if (oid === '2.5.29.14') text = toHex(b.subarray(inner.hstart, inner.end)).replace(/(..)(?=.)/g, '$1:');
            else if (oid === '2.5.29.35') { var kid = inner.children.filter(function (x) { return x.num === 0; })[0]; text = kid ? 'keyid: ' + toHex(b.subarray(kid.hstart, kid.end)).replace(/(..)(?=.)/g, '$1:') : '(issuer name form)'; }
            else if (oid === '2.5.29.31') text = inner.children.map(function (dp) { var names = []; (function walk(n) { if (n.num === 6 && !n.constructed) names.push(derStr(b, n)); (n.children || []).forEach(walk); })(dp); return names.join(', '); }).join('\n');
            else if (oid === '1.3.6.1.5.5.7.1.1') text = inner.children.map(function (ad) { var m = derOid(b, ad.children[0]); return (OIDS[m] || m) + ': ' + derStr(b, ad.children[1]); }).join('\n');
            else if (oid === '2.5.29.32') text = inner.children.map(function (pi) { var p = derOid(b, pi.children[0]); return OIDS[p] || p; }).join(', ');
            else if (oid === '1.3.6.1.4.1.11129.2.4.2') text = 'present (' + valNode.len + ' bytes)';
            else text = toHex(b.subarray(valNode.hstart, valNode.end)).slice(0, 80) + (valNode.len > 40 ? '…' : '');
          } catch (e) { text = '(could not decode)'; }
          info.extensions.push({ oid: oid, name: OIDS[oid] || oid, critical: critical, text: text });
        });
      }
    }
    info.sigAlg = derOid(b, sigAlg.children[0]);
    info.sigBits = (sig.len - 1) * 8;
    info.tbsBytes = b.subarray(tbs.start, tbs.end);
    return info;
  }
  function decodeCsr(b) {
    var top = derParse(b)[0], cri = top.children[0], c = cri.children, info = { csr: true, extensions: [], attributes: [] };
    info.version = 'v' + (b[c[0].hstart] + 1);
    info.subject = derName(b, c[1]);
    var spki = c[2]; info.keyAlg = derOid(b, spki.children[0].children[0]);
    var bs = spki.children[1];
    if (info.keyAlg === '1.2.840.113549.1.1.1') { var rsa = derParse(b, bs.hstart + 1, bs.end)[0]; info.keyBits = (rsa.children[0].len - (b[rsa.children[0].hstart] === 0 ? 1 : 0)) * 8; }
    else if (info.keyAlg === '1.2.840.10045.2.1') { info.curve = OIDS[derOid(b, spki.children[0].children[1])] || ''; info.keyBits = { 'P-256 (prime256v1)': 256, 'P-384 (secp384r1)': 384, 'P-521 (secp521r1)': 521 }[info.curve] || 0; }
    (c[3] && c[3].children || []).forEach(function (attr) {
      var oid = derOid(b, attr.children[0]);
      if (oid === '1.2.840.113549.1.9.14') {
        (attr.children[1].children[0].children || []).forEach(function (ext) {
          var eo = derOid(b, ext.children[0]), vn = ext.children[ext.children.length - 1], text = '';
          try { var inner = derParse(b, vn.hstart, vn.end)[0]; if (eo === '2.5.29.17') text = generalNames(b, inner).join('\n'); else if (eo === '2.5.29.15') text = bitStringFlags(b, inner, ['Digital signature', 'Non-repudiation', 'Key encipherment', 'Data encipherment', 'Key agreement', 'Certificate signing', 'CRL signing']).join(', '); else if (eo === '2.5.29.37') text = inner.children.map(function (o) { var id = derOid(b, o); return OIDS[id] || id; }).join(', '); else if (eo === '2.5.29.19') text = 'CA: ' + (inner.children && inner.children[0] && b[inner.children[0].hstart] ? 'TRUE' : 'FALSE'); else text = toHex(b.subarray(vn.hstart, vn.end)).slice(0, 60); } catch (e) { text = '(could not decode)'; }
          info.extensions.push({ oid: eo, name: OIDS[eo] || eo, critical: false, text: text });
        });
      } else info.attributes.push((OIDS[oid] || oid) + (oid === '1.2.840.113549.1.9.7' ? ': (present)' : ''));
    });
    info.sigAlg = derOid(b, top.children[1].children[0]);
    info.sigBits = (top.children[2].len - 1) * 8;
    return info;
  }

  Tools.register({
    id: 'certificate-decoder', category: 'crypto', name: 'X.509 Certificate Decoder',
    description: 'Paste a PEM or DER certificate, CSR or public key and read its subject, issuer, validity, SANs, key and fingerprints. Nothing is sent anywhere.',
    keywords: ['x509', 'certificate', 'ssl', 'tls', 'pem', 'der', 'crt', 'cer', 'csr', 'decoder', 'fingerprint', 'san', 'expiry', 'public key', 'asn.1', 'openssl x509 -text'],
    render: function (root) {
      root.classList.add('g-crypto');
      var input = el('textarea', { class: 'pem', placeholder: '-----BEGIN CERTIFICATE-----\nMIIB…\n-----END CERTIFICATE-----\n\nAlso accepts CERTIFICATE REQUEST, PUBLIC KEY, and raw base64 or a .der/.crt/.cer file dropped below.', spellcheck: false });
      var out = el('div', { class: 'stack' });
      var zone = U.dropzone({ accept: '.pem,.crt,.cer,.der,.csr,.pub,.key,application/x-x509-ca-cert,application/pkix-cert', label: 'Drop a certificate file here', hint: '.pem, .crt, .cer, .der, .csr', onFiles: function (f) { loadFile(f[0]); } });
      function row(label, value, mono) { return el('div', { class: 'hashrow' }, el('header', {}, el('b', { text: label })), el('code', { text: value === undefined || value === '' ? '—' : String(value), style: mono === false ? { fontFamily: 'inherit', whiteSpace: 'pre-wrap' } : { whiteSpace: 'pre-wrap' } })); }
      function fmtDate(d) { return isNaN(d) ? '?' : d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC'); }
      async function fingerprints(bytes) {
        var sha1 = toHex(new Uint8Array(await crypto.subtle.digest('SHA-1', bytes))), sha256 = toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
        return { sha1: sha1.toUpperCase().replace(/(..)(?=.)/g, '$1:'), sha256: sha256.toUpperCase().replace(/(..)(?=.)/g, '$1:') };
      }
      async function renderCert(info, bytes, label) {
        var now = Date.now(), days = Math.floor((info.notAfter - now) / 86400000);
        var state = now < info.notBefore ? ['Not yet valid', 'bad'] : now > info.notAfter ? ['Expired ' + (-days) + ' days ago', 'bad'] : ['Valid, expires in ' + days + ' days', days < 30 ? 'bad' : 'ok'];
        var fp = await fingerprints(bytes);
        var cn = info.subject.filter(function (p) { return p[0] === 'CN'; })[0];
        var selfSigned = nameText(info.subject) === nameText(info.issuer);
        var sans = info.extensions.filter(function (e) { return e.oid === '2.5.29.17'; })[0];
        var box = el('div', { class: 'stack' },
          el('div', { class: 'hashlist' },
            el('div', { class: 'hashrow' }, el('header', {}, el('b', { text: label || 'Certificate' }), el('span', { class: 'tag ' + state[1], dataset: { k: 'state' }, text: state[0] })),
              el('code', { style: { fontSize: '16px', fontFamily: 'inherit' }, text: cn ? cn[1] : nameText(info.subject) })),
            row('Subject', nameText(info.subject), false), row('Issuer', nameText(info.issuer) + (selfSigned ? '  (self-signed)' : ''), false),
            row('Valid from', fmtDate(info.notBefore)), row('Valid until', fmtDate(info.notAfter)),
            row('Serial number', info.serial.toUpperCase().replace(/(..)(?=.)/g, '$1:')),
            row('Public key', (OIDS[info.keyAlg] || info.keyAlg) + ' ' + (info.keyBits ? info.keyBits + '-bit' : '') + (info.curve ? ', ' + info.curve : '') + (info.exponent ? ', e = ' + info.exponent : '')),
            row('Signature algorithm', (OIDS[info.sigAlg] || info.sigAlg) + (info.sigBits ? ' (' + info.sigBits + '-bit signature)' : '')),
            row('Version', info.version),
            sans ? row('Subject Alternative Names', sans.text) : null,
            row('SHA-256 fingerprint', fp.sha256), row('SHA-1 fingerprint', fp.sha1)),
          info.extensions.length ? el('h4', { text: 'Extensions (' + info.extensions.length + ')', style: { margin: '6px 0 0' } }) : null,
          info.extensions.length ? el('div', { class: 'hashlist' }, info.extensions.map(function (e) { return el('div', { class: 'hashrow' }, el('header', {}, el('b', { text: e.name + (e.critical ? ' (critical)' : '') }), el('span', { class: 'tag', style: { color: 'var(--fg-muted)', fontWeight: '400' }, text: e.oid })), el('code', { style: { whiteSpace: 'pre-wrap' }, text: e.text || '—' })); })) : null,
          U.btnrow(U.copyBtn('Copy SHA-256 fingerprint', function () { return fp.sha256; }), U.copyBtn('Copy summary', function () { return ['Subject: ' + nameText(info.subject), 'Issuer: ' + nameText(info.issuer), 'Valid: ' + fmtDate(info.notBefore) + ' to ' + fmtDate(info.notAfter), 'Serial: ' + info.serial, 'Key: ' + (OIDS[info.keyAlg] || info.keyAlg) + ' ' + info.keyBits, 'SHA-256: ' + fp.sha256].join('\n'); })));
        return box;
      }
      async function renderCsr(info, bytes) {
        var fp = await fingerprints(bytes);
        return el('div', { class: 'stack' }, el('div', { class: 'hashlist' },
          el('div', { class: 'hashrow' }, el('header', {}, el('b', { text: 'Certificate Signing Request' })), el('code', { style: { fontFamily: 'inherit', fontSize: '16px' }, text: nameText(info.subject) })),
          row('Subject', nameText(info.subject), false), row('Public key', (OIDS[info.keyAlg] || info.keyAlg) + ' ' + (info.keyBits ? info.keyBits + '-bit' : '') + (info.curve ? ', ' + info.curve : '')),
          row('Signature algorithm', OIDS[info.sigAlg] || info.sigAlg), row('Attributes', info.attributes.join(', ') || 'none'), row('SHA-256 of the request', fp.sha256)),
          info.extensions.length ? el('div', { class: 'hashlist' }, info.extensions.map(function (e) { return el('div', { class: 'hashrow' }, el('header', {}, el('b', { text: 'Requested: ' + e.name })), el('code', { style: { whiteSpace: 'pre-wrap' }, text: e.text })); })) : null);
      }
      async function renderKey(bytes, label) {
        var top = derParse(bytes)[0], alg = '', bits = 0;
        try {
          if (/PUBLIC/.test(label)) { alg = derOid(bytes, top.children[0].children[0]); var bs = top.children[1]; if (alg === '1.2.840.113549.1.1.1') { var rsa = derParse(bytes, bs.hstart + 1, bs.end)[0]; bits = (rsa.children[0].len - 1) * 8; } else if (alg === '1.2.840.10045.2.1') { alg = OIDS[derOid(bytes, top.children[0].children[1])] || alg; } }
          else if (label === 'RSA PRIVATE KEY') { alg = 'RSA (PKCS#1)'; bits = (top.children[1].len - 1) * 8; }
          else if (label === 'PRIVATE KEY') { alg = derOid(bytes, top.children[1].children[0]); if (alg === '1.2.840.113549.1.1.1') { var inner = derParse(bytes, top.children[2].hstart, top.children[2].end)[0]; bits = (inner.children[1].len - 1) * 8; } }
          else if (label === 'EC PRIVATE KEY') { alg = 'EC'; var cv = top.children.filter(function (n) { return n.cls === 2 && n.num === 0; })[0]; if (cv) alg = OIDS[derOid(bytes, cv.children[0])] || alg; }
          else if (label === 'ENCRYPTED PRIVATE KEY') alg = 'encrypted (PKCS#8)';
        } catch (e) { /* leave partial */ }
        var fp = await fingerprints(bytes);
        return el('div', { class: 'hashlist' }, row('Type', label), row('Algorithm', (OIDS[alg] || alg || 'unknown') + (bits ? ', ' + bits + '-bit' : '')), row('Size', bytes.length + ' bytes DER'), row('SHA-256', fp.sha256),
          /PRIVATE/.test(label) ? U.note('This is a private key. It was decoded locally and has not left this page, but do not paste private keys into websites you do not control.', 'err') : null);
      }
      async function decodeAll(text, rawBytes) {
        out.replaceChildren();
        var blocks = rawBytes ? [{ label: rawBytes[0] === 0x30 ? 'DER' : 'unknown', bytes: rawBytes }] : pemBlocks(text);
        if (!blocks.length && text.trim()) { try { blocks = [{ label: 'base64', bytes: fromB64(text.replace(/[^A-Za-z0-9+\/=]/g, '')) }]; } catch (e) { /* not base64 */ } }
        if (!blocks.length) { out.appendChild(U.note(text.trim() ? 'No PEM block found. Paste the whole thing including the BEGIN and END lines.' : 'Paste a certificate to decode it.', text.trim() ? 'err' : '')); return; }
        for (var i = 0; i < blocks.length; i++) {
          var bl = blocks[i];
          try {
            if (bl.bytes[0] !== 0x30) throw new Error('This does not look like DER data (it should start with a SEQUENCE).');
            var node;
            if (/REQUEST/.test(bl.label)) node = await renderCsr(decodeCsr(bl.bytes), bl.bytes);
            else if (/KEY/.test(bl.label)) node = await renderKey(bl.bytes, bl.label);
            else {
              try { node = await renderCert(decodeCertificate(bl.bytes), bl.bytes, blocks.length > 1 ? 'Certificate ' + (i + 1) + ' of ' + blocks.length : 'Certificate'); }
              catch (e) { try { node = await renderCsr(decodeCsr(bl.bytes), bl.bytes); } catch (e2) { throw e; } }
            }
            out.appendChild(node);
          } catch (err) { out.appendChild(U.note('Block ' + (i + 1) + ' (' + bl.label + '): ' + (err.message || err), 'err')); }
        }
      }
      function loadFile(f) {
        U.readAs(f).then(function (buf) {
          var bytes = new Uint8Array(buf);
          var asText = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
          if (/-----BEGIN/.test(asText)) { input.value = asText; decodeAll(asText); }
          else { input.value = '(binary DER file: ' + f.name + ', ' + bytes.length + ' bytes)'; decodeAll('', bytes); }
        });
      }
      input.addEventListener('input', U.debounce(function () { decodeAll(input.value); }, 200));
      root.appendChild(U.panel(null, input, zone, U.btnrow(U.button('Decode', function () { decodeAll(input.value); }, 'primary'), U.button('Clear', function () { input.value = ''; out.replaceChildren(); }, 'ghost'))));
      root.appendChild(U.panel('Decoded', out, U.note('Get a site\'s certificate with: openssl s_client -connect example.com:443 -showcerts </dev/null. On Windows, export it from the padlock icon as Base-64 encoded X.509.')));
      /* The CSR generator hands over what it just made. */
      var pending = window.CryptoKit && window.CryptoKit.pending;
      if (pending) { window.CryptoKit.pending = null; input.value = pending; }
      decodeAll(input.value);
    }
  });

  window.CryptoKit.decodeCertificate = decodeCertificate;
  window.CryptoKit.decodeCsr = decodeCsr;
  window.CryptoKit.derParse = derParse;
})();
