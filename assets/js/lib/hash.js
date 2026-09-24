/* Pure-JS digests. MD5/SHA-1/SHA-256 are implemented here so hashing works
   even when the page is opened straight off disk and WebCrypto is unavailable;
   SHA-384/512 defer to WebCrypto because they need 64-bit arithmetic. */
(function (global) {
  'use strict';

  var encoder = new TextEncoder();

  function toBytes(input) {
    if (typeof input === 'string') return encoder.encode(input);
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    return input;
  }

  function toHex(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
    return s;
  }

  function rotl(x, n) { return (x << n) | (x >>> (32 - n)); }

  /* --- MD5 -------------------------------------------------------------- */

  var MD5_S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
               5,  9, 14, 20, 5,  9, 14, 20, 5,  9, 14, 20, 5,  9, 14, 20,
               4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
               6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];

  var MD5_K = (function () {
    var k = new Uint32Array(64);
    for (var i = 0; i < 64; i++) k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
    return k;
  })();

  function md5(input) {
    var msg = pad(toBytes(input), true);
    var h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
    var words = new Int32Array(16);

    for (var off = 0; off < msg.length; off += 64) {
      for (var w = 0; w < 16; w++) {
        words[w] = msg[off + w * 4] | (msg[off + w * 4 + 1] << 8) |
                   (msg[off + w * 4 + 2] << 16) | (msg[off + w * 4 + 3] << 24);
      }
      var a = h[0], b = h[1], c = h[2], d = h[3];

      for (var i = 0; i < 64; i++) {
        var f, g;
        if (i < 16)      { f = (b & c) | (~b & d);          g = i; }
        else if (i < 32) { f = (d & b) | (~d & c);          g = (5 * i + 1) & 15; }
        else if (i < 48) { f = b ^ c ^ d;                   g = (3 * i + 5) & 15; }
        else             { f = c ^ (b | ~d);                g = (7 * i) & 15; }

        var tmp = d;
        d = c; c = b;
        var sum = (a + f + MD5_K[i] + words[g]) | 0;
        b = (b + rotl(sum, MD5_S[i])) | 0;
        a = tmp;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0;
      h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
    }

    var outBytes = new Uint8Array(16);
    for (var j = 0; j < 4; j++) {
      outBytes[j * 4]     =  h[j]        & 0xff;
      outBytes[j * 4 + 1] = (h[j] >>> 8) & 0xff;
      outBytes[j * 4 + 2] = (h[j] >>> 16) & 0xff;
      outBytes[j * 4 + 3] = (h[j] >>> 24) & 0xff;
    }
    return outBytes;
  }

  /* Append 0x80, zero-fill, then the bit length. MD5 stores the length
     little-endian; the SHA family stores it big-endian. */
  function pad(bytes, littleEndian) {
    var total = Math.ceil((bytes.length + 9) / 64) * 64;
    var msg = new Uint8Array(total);
    msg.set(bytes);
    msg[bytes.length] = 0x80;

    var bitsLow = (bytes.length * 8) >>> 0;
    var bitsHigh = Math.floor(bytes.length / 536870912) >>> 0;

    if (littleEndian) {
      writeU32LE(msg, total - 8, bitsLow);
      writeU32LE(msg, total - 4, bitsHigh);
    } else {
      writeU32BE(msg, total - 8, bitsHigh);
      writeU32BE(msg, total - 4, bitsLow);
    }
    return msg;
  }

  function writeU32LE(a, i, v) { a[i] = v & 0xff; a[i+1] = (v >>> 8) & 0xff; a[i+2] = (v >>> 16) & 0xff; a[i+3] = (v >>> 24) & 0xff; }
  function writeU32BE(a, i, v) { a[i] = (v >>> 24) & 0xff; a[i+1] = (v >>> 16) & 0xff; a[i+2] = (v >>> 8) & 0xff; a[i+3] = v & 0xff; }

  /* --- SHA-1 ------------------------------------------------------------ */

  function sha1(input) {
    var msg = pad(toBytes(input), false);
    var h = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];
    var w = new Int32Array(80);

    for (var off = 0; off < msg.length; off += 64) {
      for (var i = 0; i < 16; i++) {
        w[i] = (msg[off + i * 4] << 24) | (msg[off + i * 4 + 1] << 16) |
               (msg[off + i * 4 + 2] << 8) | msg[off + i * 4 + 3];
      }
      for (i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);

      var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4];
      for (i = 0; i < 80; i++) {
        var f, k;
        if (i < 20)      { f = (b & c) | (~b & d);       k = 0x5A827999; }
        else if (i < 40) { f = b ^ c ^ d;                k = 0x6ED9EBA1; }
        else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
        else             { f = b ^ c ^ d;                k = 0xCA62C1D6; }

        var t = (rotl(a, 5) + f + e + k + w[i]) | 0;
        e = d; d = c; c = rotl(b, 30); b = a; a = t;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0;
      h[3] = (h[3] + d) | 0; h[4] = (h[4] + e) | 0;
    }

    var res = new Uint8Array(20);
    for (var j = 0; j < 5; j++) writeU32BE(res, j * 4, h[j] >>> 0);
    return res;
  }

  /* --- SHA-256 ---------------------------------------------------------- */

  var SHA256_K = new Uint32Array([
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);

  function sha256(input) {
    var msg = pad(toBytes(input), false);
    var h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var w = new Uint32Array(64);

    for (var off = 0; off < msg.length; off += 64) {
      for (var i = 0; i < 16; i++) {
        w[i] = ((msg[off + i * 4] << 24) | (msg[off + i * 4 + 1] << 16) |
                (msg[off + i * 4 + 2] << 8) | msg[off + i * 4 + 3]) >>> 0;
      }
      for (i = 16; i < 64; i++) {
        var s0 = (rotr(w[i-15], 7) ^ rotr(w[i-15], 18) ^ (w[i-15] >>> 3)) >>> 0;
        var s1 = (rotr(w[i-2], 17) ^ rotr(w[i-2], 19) ^ (w[i-2] >>> 10)) >>> 0;
        w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
      }

      var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (i = 0; i < 64; i++) {
        var S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
        var ch = ((e & f) ^ (~e & g)) >>> 0;
        var t1 = (hh + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
        var S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
        var maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
        var t2 = (S0 + maj) >>> 0;

        hh = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
      h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
    }

    var res = new Uint8Array(32);
    for (var j = 0; j < 8; j++) writeU32BE(res, j * 4, h[j]);
    return res;
  }

  function rotr(x, n) { return ((x >>> n) | (x << (32 - n))) >>> 0; }

  /* --- CRC-32 ----------------------------------------------------------- */

  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(input) {
    var bytes = toBytes(input), c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  /* --- public surface --------------------------------------------------- */

  var LOCAL = { 'MD5': md5, 'SHA-1': sha1, 'SHA-256': sha256 };

  function digest(algorithm, input) {
    if (LOCAL[algorithm]) return Promise.resolve(LOCAL[algorithm](input));
    if (!global.crypto || !global.crypto.subtle) {
      return Promise.reject(new Error(algorithm + ' needs WebCrypto, which this browser only exposes over http(s). Serve the folder with the bundled server script.'));
    }
    return global.crypto.subtle.digest(algorithm, toBytes(input)).then(function (buf) { return new Uint8Array(buf); });
  }

  global.Hash = {
    algorithms: ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'],
    digest: digest,
    hex: function (algorithm, input) { return digest(algorithm, input).then(toHex); },
    md5: function (i) { return toHex(md5(i)); },
    sha1: function (i) { return toHex(sha1(i)); },
    sha256: function (i) { return toHex(sha256(i)); },
    crc32: crc32,
    toHex: toHex,
    toBytes: toBytes
  };
})(window);
