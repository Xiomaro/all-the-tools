/* file-b tools: Unzip & Extract Archives, Bulk File Renamer, File Splitter &
   Joiner, Duplicate File Finder and Binary File Compare. Shared pieces
   (streaming SHA-256, TAR reader, bzip2 and xz decoders) are exported as
   window.FileKit. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  /* ==========================================================================
     Streaming SHA-256 (FIPS 180-4). WebCrypto can only hash a whole buffer,
     so big files are fed through this a chunk at a time.
     ========================================================================== */

  var SHA_K = new Int32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);

  function Sha256() {
    this.h = new Int32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    this.w = new Int32Array(64);
    this.buf = new Uint8Array(64);
    this.fill = 0;
    this.bytes = 0;
  }
  Sha256.prototype.block = function (d, o) {
    var w = this.w, h = this.h, i;
    for (i = 0; i < 16; i++, o += 4) w[i] = (d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3];
    for (i = 16; i < 64; i++) {
      var x = w[i - 15], y = w[i - 2];
      w[i] = (((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3)) + w[i - 16] +
             (((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10)) + w[i - 7] | 0;
    }
    var a = h[0], b = h[1], c = h[2], e = h[4], f = h[5], g = h[6], dd = h[3], hh = h[7];
    for (i = 0; i < 64; i++) {
      var t1 = hh + (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) + ((e & f) ^ (~e & g)) + SHA_K[i] + w[i] | 0;
      var t2 = (((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) + ((a & b) ^ (a & c) ^ (b & c)) | 0;
      hh = g; g = f; f = e; e = dd + t1 | 0; dd = c; c = b; b = a; a = t1 + t2 | 0;
    }
    h[0] = h[0] + a | 0; h[1] = h[1] + b | 0; h[2] = h[2] + c | 0; h[3] = h[3] + dd | 0;
    h[4] = h[4] + e | 0; h[5] = h[5] + f | 0; h[6] = h[6] + g | 0; h[7] = h[7] + hh | 0;
  };
  Sha256.prototype.update = function (data) {
    var i = 0, n = data.length;
    this.bytes += n;
    if (this.fill) {
      while (i < n && this.fill < 64) this.buf[this.fill++] = data[i++];
      if (this.fill < 64) return this;
      this.block(this.buf, 0);
      this.fill = 0;
    }
    for (; i + 64 <= n; i += 64) this.block(data, i);
    while (i < n) this.buf[this.fill++] = data[i++];
    return this;
  };
  Sha256.prototype.digest = function () {
    var bits = this.bytes * 8, pad = new Uint8Array(((this.fill + 9 + 63) & ~63) - this.fill);
    pad[0] = 0x80;
    var hi = Math.floor(bits / 4294967296), lo = bits >>> 0, L = pad.length;
    pad[L - 8] = hi >>> 24; pad[L - 7] = hi >>> 16; pad[L - 6] = hi >>> 8; pad[L - 5] = hi;
    pad[L - 4] = lo >>> 24; pad[L - 3] = lo >>> 16; pad[L - 2] = lo >>> 8; pad[L - 1] = lo;
    var saved = this.bytes;
    this.update(pad);
    this.bytes = saved;
    var out = new Uint8Array(32);
    for (var k = 0; k < 8; k++) { out[k * 4] = this.h[k] >>> 24; out[k * 4 + 1] = this.h[k] >>> 16; out[k * 4 + 2] = this.h[k] >>> 8; out[k * 4 + 3] = this.h[k]; }
    return out;
  };
  function toHex(b) { var s = ''; for (var i = 0; i < b.length; i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16); return s; }

  var CHUNK = 4 * 1024 * 1024;
  /* SHA-256 of a Blob/File (or part of one), read 4 MB at a time.
     opts: { start, end, onProgress(bytesDone), signal: { cancelled } } */
  async function sha256Blob(blob, opts) {
    opts = opts || {};
    var start = opts.start || 0, end = opts.end === undefined ? blob.size : opts.end, h = new Sha256();
    for (var off = start; off < end; off += CHUNK) {
      if (opts.signal && opts.signal.cancelled) throw new Error('Cancelled');
      h.update(new Uint8Array(await blob.slice(off, Math.min(end, off + CHUNK)).arrayBuffer()));
      if (opts.onProgress) opts.onProgress(Math.min(end, off + CHUNK) - start);
    }
    return toHex(h.digest());
  }

  /* ==========================================================================
     TAR (ustar, pax and GNU long names)
     ========================================================================== */

  function tarString(b, off, len) {
    var end = off;
    while (end < off + len && b[end]) end++;
    return new TextDecoder().decode(b.subarray(off, end));
  }
  function tarNumber(b, off, len) {
    if (b[off] & 0x80) {           /* base-256, for sizes over 8 GB */
      var v = b[off] & 0x7f;
      for (var i = 1; i < len; i++) v = v * 256 + b[off + i];
      return v;
    }
    var s = tarString(b, off, len).trim();
    return s ? parseInt(s, 8) || 0 : 0;
  }
  function looksLikeTar(b) {
    if (b.length < 512) return false;
    if (tarString(b, 257, 5) === 'ustar') return true;
    var sum = 0;
    for (var i = 0; i < 512; i++) sum += i >= 148 && i < 156 ? 32 : b[i];
    return b[0] !== 0 && sum === tarNumber(b, 148, 8);
  }
  /* Entries: { path, dir, size, date, data (subarray) } */
  function parseTar(b) {
    var out = [], off = 0, longName = null, pax = {}, globalPax = {};
    while (off + 512 <= b.length) {
      var h = b.subarray(off, off + 512);
      if (h.every ? h.every(function (x) { return x === 0; }) : false) break;
      var size = pax.size ? parseInt(pax.size, 10) : tarNumber(h, 124, 12), type = String.fromCharCode(h[156] || 48);
      var data = b.subarray(off + 512, off + 512 + size);
      off += 512 + Math.ceil(size / 512) * 512;
      if (type === 'L') { longName = tarString(data, 0, data.length); continue; }
      if (type === 'x' || type === 'g') {
        var target = type === 'x' ? pax : globalPax, text = new TextDecoder().decode(data), p = 0;
        while (p < text.length) {
          var sp = text.indexOf(' ', p), len = parseInt(text.slice(p, sp), 10);
          if (!(len > 0)) break;
          var rec = text.slice(sp + 1, p + len - 1), eq = rec.indexOf('=');
          target[rec.slice(0, eq)] = rec.slice(eq + 1);
          p += len;
        }
        continue;
      }
      if (type === 'K') continue;
      var name = tarString(h, 0, 100), prefix = tarString(h, 257, 5) === 'ustar' ? tarString(h, 345, 155) : '';
      var path = pax.path || globalPax.path || longName || (prefix ? prefix + '/' + name : name);
      var mtime = parseFloat(pax.mtime || globalPax.mtime) || tarNumber(h, 136, 12);
      longName = null; pax = {};
      var dir = type === '5' || /\/$/.test(path);
      if (type === '1' || type === '2') {
        out.push({ path: path, dir: false, size: 0, date: mtime ? new Date(mtime * 1000) : null, data: new Uint8Array(0), link: tarString(h, 157, 100) });
        continue;
      }
      if (type !== '0' && type !== '\0' && type !== '7' && type !== '5' && type !== String.fromCharCode(0)) continue;
      out.push({ path: path.replace(/\/+$/, ''), dir: dir, size: dir ? 0 : size, date: mtime ? new Date(mtime * 1000) : null, data: dir ? null : data });
    }
    return out;
  }

  /* ==========================================================================
     Growable byte buffer for the decoders
     ========================================================================== */

  function ByteSink(hint) { this.buf = new Uint8Array(Math.max(1024, hint || 0)); this.len = 0; }
  ByteSink.prototype.ensure = function (n) {
    if (this.len + n <= this.buf.length) return;
    var size = this.buf.length * 2;
    while (size < this.len + n) size *= 2;
    var nb = new Uint8Array(size); nb.set(this.buf.subarray(0, this.len)); this.buf = nb;
  };
  ByteSink.prototype.push = function (b) { if (this.len === this.buf.length) this.ensure(1); this.buf[this.len++] = b; };
  ByteSink.prototype.result = function () { return this.buf.slice(0, this.len); };

  /* ==========================================================================
     bzip2 decoder (all streams in the file; block CRCs checked)
     ========================================================================== */

  var BZ_CRC = (function () {
    var t = new Int32Array(256);
    for (var i = 0; i < 256; i++) { var c = i << 24; for (var k = 0; k < 8; k++) c = c & 0x80000000 ? (c << 1) ^ 0x04c11db7 : c << 1; t[i] = c; }
    return t;
  })();

  function bunzip2(src) {
    var pos = 0, bitBuf = 0, bitCount = 0, n = src.length;
    function bits(k) {
      while (bitCount < k) {
        if (pos >= n) throw new Error('The bzip2 data ends too early.');
        bitBuf = ((bitBuf << 8) | src[pos++]) >>> 0; bitCount += 8;
      }
      bitCount -= k;
      var v = (bitBuf >>> bitCount) & ((1 << k) - 1);
      bitBuf &= (1 << bitCount) - 1;
      return v;
    }
    var out = new ByteSink(src.length * 4);
    var streams = 0;
    while (pos < n) {
      bitBuf = 0; bitCount = 0;
      if (src[pos] !== 0x42 || src[pos + 1] !== 0x5A || src[pos + 2] !== 0x68) {
        if (streams) break;              /* trailing garbage after the last stream */
        throw new Error('Not bzip2 data.');
      }
      var level = src[pos + 3] - 48;
      if (level < 1 || level > 9) throw new Error('Not bzip2 data.');
      pos += 4;
      var maxBlock = level * 100000, tt = new Int32Array(maxBlock);
      for (;;) {
        var m1 = bits(24), m2 = bits(24);
        if (m1 === 0x177245 && m2 === 0x385090) { bits(16); bits(16); break; }
        if (m1 !== 0x314159 || m2 !== 0x265359) throw new Error('Damaged bzip2 data (bad block header).');
        var crc = ((bits(16) << 16) | bits(16)) | 0;
        if (bits(1)) throw new Error('This bzip2 file uses the obsolete randomised mode, which is not supported.');
        var origPtr = bits(24);
        /* symbol map */
        var used = bits(16), seqToUnseq = [];
        for (var i = 0; i < 16; i++) if (used & (0x8000 >> i)) { var w = bits(16); for (var j = 0; j < 16; j++) if (w & (0x8000 >> j)) seqToUnseq.push(i * 16 + j); }
        if (!seqToUnseq.length) throw new Error('Damaged bzip2 data.');
        var alpha = seqToUnseq.length + 2, nGroups = bits(3), nSel = bits(15);
        if (nGroups < 2 || nGroups > 6 || !nSel) throw new Error('Damaged bzip2 data.');
        var mtfG = [0, 1, 2, 3, 4, 5].slice(0, nGroups), selectors = new Uint8Array(nSel);
        for (i = 0; i < nSel; i++) {
          j = 0;
          while (bits(1)) { j++; if (j >= nGroups) throw new Error('Damaged bzip2 data.'); }
          var g = mtfG[j]; mtfG.splice(j, 1); mtfG.unshift(g); selectors[i] = g;
        }
        /* code lengths and canonical Huffman tables */
        var tables = [];
        for (var t = 0; t < nGroups; t++) {
          var lens = new Uint8Array(alpha), cur = bits(5);
          for (i = 0; i < alpha; i++) {
            for (;;) {
              if (cur < 1 || cur > 20) throw new Error('Damaged bzip2 data.');
              if (!bits(1)) break;
              cur += bits(1) ? -1 : 1;
            }
            lens[i] = cur;
          }
          var minL = 32, maxL = 0;
          for (i = 0; i < alpha; i++) { if (lens[i] < minL) minL = lens[i]; if (lens[i] > maxL) maxL = lens[i]; }
          var perm = [], limit = new Int32Array(22), base = new Int32Array(22), count = new Int32Array(22);
          for (var l = minL; l <= maxL; l++) for (i = 0; i < alpha; i++) if (lens[i] === l) perm.push(i);
          for (i = 0; i < alpha; i++) count[lens[i]]++;
          var code = 0, idx = 0;
          for (l = minL; l <= maxL; l++) {
            base[l] = idx - code;          /* symbol index = code + base */
            code += count[l]; idx += count[l];
            limit[l] = code - 1;
            code <<= 1;
          }
          tables.push({ minL: minL, maxL: maxL, perm: perm, limit: limit, base: base });
        }
        /* MTF + RLE2 symbols */
        var mtf = [], unzf = new Int32Array(256), nblock = 0, eob = alpha - 1, run = 0, runW = 1, sel = 0, left = 0, tab = null;
        for (i = 0; i < 256; i++) mtf[i] = i;
        for (;;) {
          if (!left) { if (sel >= nSel) throw new Error('Damaged bzip2 data.'); tab = tables[selectors[sel++]]; left = 50; }
          left--;
          var len = tab.minL, v = bits(len);
          while (len <= tab.maxL && v > tab.limit[len]) { len++; v = (v << 1) | bits(1); }
          if (len > tab.maxL) throw new Error('Damaged bzip2 data.');
          var sym = tab.perm[v + tab.base[len]];
          if (sym <= 1) { run += (sym + 1) * runW; runW <<= 1; continue; }
          if (run) {
            var ch = seqToUnseq[mtf[0]];
            if (nblock + run > maxBlock) throw new Error('Damaged bzip2 data.');
            unzf[ch] += run;
            while (run--) tt[nblock++] = ch;
            run = 0; runW = 1;
          }
          if (sym === eob) break;
          var k2 = sym - 1, mv = mtf[k2];
          for (; k2 > 0; k2--) mtf[k2] = mtf[k2 - 1];
          mtf[0] = mv;
          var ch2 = seqToUnseq[mv];
          if (nblock >= maxBlock) throw new Error('Damaged bzip2 data.');
          unzf[ch2]++; tt[nblock++] = ch2;
        }
        if (origPtr >= nblock) throw new Error('Damaged bzip2 data.');
        /* inverse BWT */
        var cf = new Int32Array(256), sum = 0;
        for (i = 0; i < 256; i++) { cf[i] = sum; sum += unzf[i]; }
        for (i = 0; i < nblock; i++) { var c8 = tt[i] & 0xff; tt[cf[c8]++] |= i << 8; }
        /* undo RLE1 while writing, and check the block CRC */
        var tPos = tt[origPtr] >> 8, blockCrc = -1, last = -1, same = 0;
        out.ensure(nblock * 2);
        for (i = 0; i < nblock; i++) {
          tPos = tt[tPos];
          var b = tPos & 0xff; tPos >>= 8;
          if (same === 4) {
            out.ensure(b);
            for (var r = 0; r < b; r++) { out.buf[out.len++] = last; blockCrc = (blockCrc << 8) ^ BZ_CRC[((blockCrc >>> 24) ^ last) & 0xff]; }
            same = 0; last = -1;
            continue;
          }
          same = b === last ? same + 1 : 1;
          last = b;
          out.push(b);
          blockCrc = (blockCrc << 8) ^ BZ_CRC[((blockCrc >>> 24) ^ b) & 0xff];
        }
        if ((~blockCrc | 0) !== crc) throw new Error('The bzip2 data is damaged (checksum mismatch).');
      }
      streams++;
    }
    return out.result();
  }

  /* ==========================================================================
     xz decoder: LZMA2 (+ delta filter), CRC32 / CRC64 / SHA-256 checks,
     concatenated streams. Other filters (BCJ) are left to libarchive.
     ========================================================================== */

  var CRC64_LO = new Uint32Array(256), CRC64_HI = new Uint32Array(256);
  (function () {
    for (var i = 0; i < 256; i++) {
      var lo = i, hi = 0;
      for (var k = 0; k < 8; k++) {
        var bit = lo & 1;
        lo = ((lo >>> 1) | (hi << 31)) >>> 0; hi = hi >>> 1;
        if (bit) { lo = (lo ^ 0xD7870F42) >>> 0; hi = (hi ^ 0xC96C5795) >>> 0; }
      }
      CRC64_LO[i] = lo; CRC64_HI[i] = hi;
    }
  })();
  function crc64(b) {
    var lo = 0xFFFFFFFF, hi = 0xFFFFFFFF;
    for (var i = 0; i < b.length; i++) {
      var t = (lo ^ b[i]) & 0xff;
      lo = (((lo >>> 8) | (hi << 24)) ^ CRC64_LO[t]) >>> 0;
      hi = ((hi >>> 8) ^ CRC64_HI[t]) >>> 0;
    }
    return [(~lo) >>> 0, (~hi) >>> 0];
  }
  var CRC32T = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(b, from, to) {
    var c = 0xFFFFFFFF;
    for (var i = from || 0, e = to === undefined ? b.length : to; i < e; i++) c = CRC32T[(c ^ b[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function u32le(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }

  /* LZMA decoder state shared across the chunks of one LZMA2 block. */
  function Lzma2Decoder(out) {
    this.out = out;
    this.lc = 0; this.lp = 0; this.pb = 0;
    this.probs = null;
    this.base = out.len;      /* where the dictionary was last reset: positions count from here */
  }
  /* Offsets into one Uint16Array of probabilities (LzmaSpec layout). */
  var P_ISMATCH = 0, P_ISREP = 192, P_ISREPG0 = 204, P_ISREPG1 = 216, P_ISREPG2 = 228, P_ISREP0LONG = 240,
    P_POSSLOT = 432, P_SPECPOS = 688, P_ALIGN = 803, P_LENCODER = 819, P_REPLEN = 1333, P_LITERAL = 1847;
  Lzma2Decoder.prototype.setProps = function (p) {
    if (p > 224) throw new Error('Damaged xz data (bad LZMA properties).');
    this.pb = Math.floor(p / 45); p %= 45; this.lp = Math.floor(p / 9); this.lc = p % 9;
    if (this.lc + this.lp > 4) throw new Error('Damaged xz data (bad LZMA properties).');
    this.probs = new Uint16Array(P_LITERAL + (0x300 << (this.lc + this.lp)));
  };
  Lzma2Decoder.prototype.resetState = function () {
    this.probs.fill(1024);
    this.state = 0; this.rep0 = this.rep1 = this.rep2 = this.rep3 = 0;
  };
  /* Decode one LZMA chunk: `packed` bytes from src[at], producing `size` bytes. */
  Lzma2Decoder.prototype.chunk = function (src, at, packed, size) {
    var probs = this.probs, out = this.out, lc = this.lc, lpMask = (1 << this.lp) - 1, pbMask = (1 << this.pb) - 1;
    var end = at + packed, p = at + 1;       /* first byte of the range coder is always 0 */
    var range = 0xFFFFFFFF, code = ((src[p] << 24) | (src[p + 1] << 16) | (src[p + 2] << 8) | src[p + 3]) >>> 0;
    p += 4;
    var state = this.state, rep0 = this.rep0, rep1 = this.rep1, rep2 = this.rep2, rep3 = this.rep3;
    out.ensure(size);
    var buf = out.buf, pos = out.len, stop = pos + size, base = this.base;
    function bit(i) {
      var pr = probs[i], bound = (range >>> 11) * pr;
      var b;
      if (code < bound) { range = bound; probs[i] = pr + ((2048 - pr) >>> 5); b = 0; }
      else { range = (range - bound) >>> 0; code = (code - bound) >>> 0; probs[i] = pr - (pr >>> 5); b = 1; }
      if (range < 0x1000000) { range = (range << 8) >>> 0; code = ((code << 8) | src[p++]) >>> 0; }
      return b;
    }
    function tree(base, nb) { var m = 1; for (var i = 0; i < nb; i++) m = (m << 1) | bit(base + m); return m - (1 << nb); }
    function rtree(base, nb) { var m = 1, s = 0; for (var i = 0; i < nb; i++) { var b = bit(base + m); m = (m << 1) | b; s |= b << i; } return s; }
    function direct(nb) {
      var r = 0;
      for (var i = 0; i < nb; i++) {
        range = range >>> 1;
        var b = code >= range ? 1 : 0;
        if (b) code = (code - range) >>> 0;
        r = ((r << 1) | b) >>> 0;
        if (range < 0x1000000) { range = (range << 8) >>> 0; code = ((code << 8) | src[p++]) >>> 0; }
      }
      return r;
    }
    function len(base, posState) {
      if (!bit(base)) return tree(base + 2 + (posState << 3), 3);
      if (!bit(base + 1)) return 8 + tree(base + 130 + (posState << 3), 3);
      return 16 + tree(base + 258, 8);
    }
    while (pos < stop) {
      var rel = pos - base, posState = rel & pbMask;
      if (!bit(P_ISMATCH + (state << 4) + posState)) {
        var prev = rel > 0 ? buf[pos - 1] : 0;
        var lb = P_LITERAL + 0x300 * (((rel & lpMask) << lc) + (prev >> (8 - lc)));
        var sym = 1;
        if (state >= 7) {
          var mb = buf[pos - rep0 - 1];
          do {
            var mbit = (mb >> 7) & 1; mb <<= 1;
            var bt = bit(lb + ((1 + mbit) << 8) + sym);
            sym = (sym << 1) | bt;
            if (mbit !== bt) break;
          } while (sym < 0x100);
        }
        while (sym < 0x100) sym = (sym << 1) | bit(lb + sym);
        buf[pos++] = sym & 0xff;
        state = state < 4 ? 0 : state < 10 ? state - 3 : state - 6;
        continue;
      }
      var l;
      if (bit(P_ISREP + state)) {
        if (rel === 0) throw new Error('Damaged xz data.');
        if (!bit(P_ISREPG0 + state)) {
          if (!bit(P_ISREP0LONG + (state << 4) + posState)) {
            state = state < 7 ? 9 : 11;
            buf[pos] = buf[pos - rep0 - 1]; pos++;
            continue;
          }
        } else {
          var dist;
          if (!bit(P_ISREPG1 + state)) dist = rep1;
          else { if (!bit(P_ISREPG2 + state)) dist = rep2; else { dist = rep3; rep3 = rep2; } rep2 = rep1; }
          rep1 = rep0; rep0 = dist;
        }
        l = len(P_REPLEN, posState);
        state = state < 7 ? 8 : 11;
      } else {
        rep3 = rep2; rep2 = rep1; rep1 = rep0;
        l = len(P_LENCODER, posState);
        state = state < 7 ? 7 : 10;
        var slot = tree(P_POSSLOT + (Math.min(l, 3) << 6), 6);
        if (slot < 4) rep0 = slot;
        else {
          var nd = (slot >> 1) - 1;
          rep0 = ((2 | (slot & 1)) << nd) >>> 0;
          if (slot < 14) rep0 = (rep0 + rtree(P_SPECPOS + rep0 - slot, nd)) >>> 0;
          else rep0 = (rep0 + ((direct(nd - 4) << 4) >>> 0) + rtree(P_ALIGN, 4)) >>> 0;
        }
        if (rep0 >= rel) throw new Error('Damaged xz data (distance out of range).');
      }
      l += 2;
      if (pos + l > stop) throw new Error('Damaged xz data (match runs past the chunk).');
      var from = pos - rep0 - 1;
      for (var q = 0; q < l; q++) buf[pos + q] = buf[from + q];
      pos += l;
    }
    if (p > end + 1) throw new Error('Damaged xz data (chunk overrun).');
    out.len = pos;
    this.state = state; this.rep0 = rep0; this.rep1 = rep1; this.rep2 = rep2; this.rep3 = rep3;
  };

  function readVarint(b, st) {
    var v = 0, mul = 1;
    for (var i = 0; i < 9; i++) {
      var x = b[st.p++];
      v += (x & 0x7f) * mul; mul *= 128;
      if (!(x & 0x80)) return v;
    }
    throw new Error('Damaged xz data.');
  }

  function unxz(src) {
    var out = new ByteSink(src.length * 4), st = { p: 0 };
    var streams = 0;
    while (st.p < src.length) {
      if (streams) { while (st.p < src.length && src[st.p] === 0) st.p++; if (st.p >= src.length) break; }
      var s = st.p;
      if (!(src[s] === 0xFD && src[s + 1] === 0x37 && src[s + 2] === 0x7A && src[s + 3] === 0x58 && src[s + 4] === 0x5A && src[s + 5] === 0)) {
        if (streams) break;
        throw new Error('Not xz data.');
      }
      if (crc32(src, s + 6, s + 8) !== u32le(src, s + 8)) throw new Error('Damaged xz data (stream header).');
      var check = src[s + 7] & 0x0F, checkSize = check === 0 ? 0 : check <= 3 ? 4 : check <= 6 ? 8 : check <= 9 ? 16 : check <= 12 ? 32 : 64;
      st.p = s + 12;
      for (;;) {
        var hs = st.p, hsize = src[hs];
        if (hsize === 0) break;                 /* index follows */
        hsize = (hsize + 1) * 4;
        if (crc32(src, hs, hs + hsize - 4) !== u32le(src, hs + hsize - 4)) throw new Error('Damaged xz data (block header).');
        var flags = src[hs + 1], nFilters = (flags & 3) + 1;
        st.p = hs + 2;
        if (flags & 0x40) readVarint(src, st);
        if (flags & 0x80) readVarint(src, st);
        var filters = [];
        for (var f = 0; f < nFilters; f++) {
          var id = readVarint(src, st), psize = readVarint(src, st);
          filters.push({ id: id, props: src.subarray(st.p, st.p + psize) });
          st.p += psize;
        }
        var lz = filters[filters.length - 1];
        if (lz.id !== 0x21) throw new Error('xz filter ' + lz.id + ' is not supported.');
        for (f = 0; f < filters.length - 1; f++) if (filters[f].id !== 0x03) throw new Error('xz filter 0x' + filters[f].id.toString(16) + ' is not supported.');
        st.p = hs + hsize;
        /* LZMA2 chunks */
        var blockStart = out.len, dec = new Lzma2Decoder(out), needProps = true, needDict = true;
        for (;;) {
          var c = src[st.p++];
          if (c === undefined) throw new Error('The xz data ends too early.');
          if (c === 0) break;
          if (c === 1 || c === 2) {
            if (c === 2 && needDict) throw new Error('Damaged xz data.');
            if (c === 1) dec.base = out.len;
            needDict = false;
            var usize = ((src[st.p] << 8) | src[st.p + 1]) + 1;
            st.p += 2;
            out.ensure(usize);
            out.buf.set(src.subarray(st.p, st.p + usize), out.len);
            out.len += usize; st.p += usize;
            continue;
          }
          if (c < 0x80) throw new Error('Damaged xz data (bad LZMA2 chunk).');
          var reset = (c >> 5) & 3;
          var unpacked = ((c & 0x1F) << 16) + (src[st.p] << 8) + src[st.p + 1] + 1;
          var packed = (src[st.p + 2] << 8) + src[st.p + 3] + 1;
          st.p += 4;
          if (reset >= 2) { dec.setProps(src[st.p++]); needProps = false; }
          else if (needProps) throw new Error('Damaged xz data (missing LZMA properties).');
          if (reset === 3) { needDict = false; dec.base = out.len; }
          else if (needDict) throw new Error('Damaged xz data.');
          if (reset >= 1) dec.resetState();
          dec.chunk(src, st.p, packed, unpacked);
          st.p += packed;
        }
        /* delta filters run over the block's output */
        for (f = filters.length - 2; f >= 0; f--) {
          var dist = filters[f].props[0] + 1, b = out.buf;
          for (var i = blockStart + dist; i < out.len; i++) b[i] = (b[i] + b[i - dist]) & 0xff;
        }
        while ((st.p - hs) % 4) st.p++;
        var block = out.buf.subarray(blockStart, out.len);
        if (check === 1 && crc32(block) !== u32le(src, st.p)) throw new Error('The xz data is damaged (checksum mismatch).');
        if (check === 4) {
          var c64 = crc64(block);
          if (c64[0] !== u32le(src, st.p) || c64[1] !== u32le(src, st.p + 4)) throw new Error('The xz data is damaged (checksum mismatch).');
        }
        if (check === 10 && toHex(new Sha256().update(block).digest()) !== toHex(src.subarray(st.p, st.p + 32))) throw new Error('The xz data is damaged (checksum mismatch).');
        st.p += checkSize;
      }
      /* skip the index and the stream footer */
      st.p++;
      var records = readVarint(src, st);
      for (var r = 0; r < records; r++) { readVarint(src, st); readVarint(src, st); }
      while (st.p % 4) st.p++;
      st.p += 4 + 12;
      streams++;
    }
    return out.result();
  }

  /* ==========================================================================
     Shared UI bits
     ========================================================================== */

  if (!document.getElementById('g-file-b-style')) {
    document.head.appendChild(el('style', { id: 'g-file-b-style', text: [
      '.g-fileb .scroll { overflow:auto; max-width:100%; }',
      '.g-fileb .muted { color:var(--fg-muted); font-weight:400; }',
      '.g-fileb .g-bar { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }',
      '.g-fileb .g-line { display:flex; flex-wrap:wrap; gap:6px 14px; align-items:center; font-weight:600; }',
      '.g-fileb .g-tree { font-size:14px; }',
      '.g-fileb .g-tree details { margin-left:14px; }',
      '.g-fileb .g-tree > details { margin-left:0; }',
      '.g-fileb .g-tree summary { cursor:pointer; padding:3px 0; }',
      '.g-fileb .g-row { display:flex; align-items:center; gap:8px; padding:3px 4px 3px 14px; border-radius:var(--radius-s); min-width:0; }',
      '.g-fileb .g-row:hover { background:var(--bg-sunken); }',
      '.g-fileb .g-row .nm { flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }',
      '.g-fileb .g-row .sz, .g-fileb .g-row .dt { color:var(--fg-muted); font-size:12px; white-space:nowrap; font-variant-numeric:tabular-nums; }',
      '.g-fileb .g-row .btn { padding:2px 8px; font-size:13px; }',
      '.g-fileb .g-sum { display:inline-flex; align-items:center; gap:8px; }',
      '.g-fileb .g-preview img { max-width:100%; max-height:420px; background:repeating-conic-gradient(#e6e6e6 0 25%, #fff 0 50%) 0 0/14px 14px; }',
      '.g-fileb table.data td, .g-fileb table.data th { white-space:nowrap; }',
      '.g-fileb tr.bad td { color:var(--err); }',
      '.g-fileb tr.same td { color:var(--fg-muted); }',
      '.g-fileb .g-rules { display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px; }',
      '.g-fileb .g-rule { border:1px solid var(--border); border-radius:var(--radius-s); padding:10px 12px; display:flex; flex-direction:column; gap:8px; background:var(--bg-sunken); }',
      '.g-fileb .g-rule > .check { font-weight:600; }',
      '.g-fileb .g-group { border:1px solid var(--border); border-radius:var(--radius-s); padding:10px 12px; display:flex; flex-direction:column; gap:4px; }',
      '.g-fileb .g-group .paths { font-family:var(--mono); font-size:12.5px; word-break:break-all; }',
      '.g-fileb .g-hex { font-family:var(--mono); font-size:12.5px; line-height:1.5; white-space:pre; }',
      '.g-fileb .g-hex .d { background:color-mix(in srgb, var(--err) 30%, transparent); color:var(--fg); border-radius:2px; }',
      '.g-fileb .g-hex .off { color:var(--fg-muted); }',
      '.g-fileb .g-hex .gap { color:var(--fg-muted); padding:0 8px; }',
      '.g-fileb .g-verdict { font-size:18px; font-weight:700; }',
      '.g-fileb .g-verdict.ok { color:var(--ok); } .g-fileb .g-verdict.err { color:var(--err); }',
      '.g-fileb code.h { font-family:var(--mono); font-size:12.5px; word-break:break-all; }'
    ].join('\n') }));
  }

  function plural(n, w) { return n.toLocaleString('en-GB') + ' ' + w + (n === 1 ? '' : 's'); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function when(d) {
    if (!d || isNaN(d) || d.getTime() < 315532800000) return '';   /* before 1980: unknown */
    return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }
  function natural(a, b) { return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }); }
  function csvCell(v) { v = String(v === null || v === undefined ? '' : v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function libZip() { return U.script('assets/vendor/jszip/jszip.min.js').then(function () { return window.JSZip; }); }
  function libPako() { return U.script('assets/vendor/pako/pako.min.js').then(function () { return window.pako; }); }
  function field(label, control, hint) { return U.field(label, control, hint); }
  function num(input, dflt) { var v = parseFloat(input.value); return isFinite(v) ? v : dflt; }
  function baseOf(path) { return String(path).split('/').pop(); }
  /* Paths from an archive, made safe to reuse: no leading slash, no "." or "..". */
  function cleanPath(p) {
    return String(p).replace(/\\/g, '/').split('/').filter(function (s) { return s && s !== '.' && s !== '..'; }).join('/');
  }

  /* Files (with relative paths) from a drop, including dropped folders. */
  function entriesFromDrop(dt) {
    var items = dt.items && dt.items.length && dt.items[0].webkitGetAsEntry ? Array.prototype.map.call(dt.items, function (i) { return i.webkitGetAsEntry(); }).filter(Boolean) : null;
    if (!items) return Promise.resolve(Array.prototype.map.call(dt.files, function (f) { return { file: f, path: f.name }; }));
    function walk(entry, prefix) {
      return new Promise(function (resolve) {
        if (entry.isFile) entry.file(function (f) { resolve([{ file: f, path: prefix + f.name }]); }, function () { resolve([]); });
        else if (entry.isDirectory) {
          var reader = entry.createReader(), all = [];
          (function next() {
            reader.readEntries(function (batch) {
              if (!batch.length) Promise.all(all.map(function (e) { return walk(e, prefix + entry.name + '/'); })).then(function (l) { resolve([].concat.apply([], l)); });
              else { all = all.concat(Array.prototype.slice.call(batch)); next(); }
            }, function () { resolve([]); });
          })();
        } else resolve([]);
      });
    }
    return Promise.all(items.map(function (e) { return walk(e, ''); })).then(function (l) { return [].concat.apply([], l); });
  }

  /* A drop zone for many files (and folders when dropped). */
  function multiDrop(opts) {
    var picker = el('input', { type: 'file', multiple: true, accept: opts.accept || '', style: { display: 'none' } });
    picker.addEventListener('change', function () {
      var list = Array.prototype.map.call(picker.files, function (f) { return { file: f, path: f.webkitRelativePath || f.name }; });
      picker.value = '';
      if (list.length) opts.onFiles(list);
    });
    var zone = el('div', { class: 'dropzone', tabIndex: 0, role: 'button',
        onclick: function () { picker.click(); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); picker.click(); } },
        ondragover: function (e) { e.preventDefault(); zone.classList.add('over'); },
        ondragleave: function () { zone.classList.remove('over'); },
        ondrop: function (e) {
          e.preventDefault(); zone.classList.remove('over');
          entriesFromDrop(e.dataTransfer).then(function (l) { if (l.length) opts.onFiles(l); });
        } },
      el('strong', { text: opts.label }), el('span', { text: opts.hint || 'or click to choose' }), picker);
    return zone;
  }

  /* ==========================================================================
     Unzip & Extract Archives
     ========================================================================== */

  function magic(b) {
    var a = function (o, n) { var s = ''; for (var i = o; i < o + n && i < b.length; i++) s += String.fromCharCode(b[i]); return s; };
    if (a(0, 2) === 'PK' && (b[2] === 3 || b[2] === 5 || b[2] === 7)) return 'zip';
    if (b[0] === 0x1F && b[1] === 0x8B) return 'gz';
    if (a(0, 3) === 'BZh') return 'bz2';
    if (b[0] === 0xFD && a(1, 5) === '7zXZ\0') return 'xz';
    if (b[0] === 0x37 && b[1] === 0x7A && b[2] === 0xBC && b[3] === 0xAF && b[4] === 0x27 && b[5] === 0x1C) return '7z';
    if (a(0, 6) === 'Rar!\x1a\x07') return 'rar';
    if (a(0, 4) === 'MSCF') return 'cab';
    if (a(0, 8) === '!<arch>\n') return 'ar';
    if (a(0, 4) === 'xar!') return 'xar';
    if (a(0, 6) === '070701' || a(0, 6) === '070707') return 'cpio';
    if (a(2, 3) === '-lh') return 'lha';
    if (looksLikeTar(b)) return 'tar';
    return '';
  }
  var KIND_NAMES = { zip: 'ZIP', gz: 'gzip', bz2: 'bzip2', xz: 'xz', '7z': '7-Zip', rar: 'RAR', cab: 'Cabinet', ar: 'ar', xar: 'XAR', cpio: 'cpio', lha: 'LHA', tar: 'TAR' };

  /* The single file inside a .gz: its stored name and time, if any. */
  function gzipHeader(b) {
    var flags = b[3], mtime = (b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24)) >>> 0, p = 10, name = '';
    if (flags & 4) p += 2 + (b[10] | (b[11] << 8));
    if (flags & 8) { var s = p; while (p < b.length && b[p]) p++; name = new TextDecoder('latin1').decode(b.subarray(s, p)); }
    return { name: name, date: mtime ? new Date(mtime * 1000) : null };
  }
  function stripExt(name, kind) {
    var m = { gz: /\.(t?gz|gzip)$/i, bz2: /\.(t?bz2?|tbz2)$/i, xz: /\.(t?xz)$/i }[kind];
    var base = m ? name.replace(m, '') : name;
    if (/\.(tgz|tbz2?|txz)$/i.test(name)) base += '.tar';
    return base || 'file';
  }

  var libarchivePromise = null;
  function libArchive() {
    if (!libarchivePromise) {
      libarchivePromise = U.module('assets/vendor/libarchive/libarchive.js').then(function (m) {
        m.Archive.init({ workerUrl: new URL('assets/vendor/libarchive/worker-bundle.js', document.baseURI).href });
        return m.Archive;
      }).catch(function (e) { libarchivePromise = null; throw e; });
    }
    return libarchivePromise;
  }

  function looksText(b) {
    var n = Math.min(b.length, 8192);
    for (var i = 0; i < n; i++) if (b[i] === 0) return false;
    try { new TextDecoder('utf-8', { fatal: true }).decode(b.subarray(0, Math.max(0, n - 4))); return true; } catch (e) { return false; }
  }
  var IMAGE_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml', avif: 'image/avif', ico: 'image/x-icon' };

  Tools.register({
    id: 'archive-extractor', category: 'file', name: 'Unzip & Extract Archives',
    description: 'Open ZIP, 7z, RAR, TAR, GZ, BZ2 and XZ archives, browse the files, preview text and pictures, and save what you need.',
    keywords: ['unzip', 'extract', 'zip', 'rar', '7z', '7-zip', 'tar', 'tar.gz', 'tgz', 'gz', 'gzip', 'bz2', 'bzip2', 'xz', 'decompress',
      'uncompress', 'open archive', 'unrar', 'archive viewer', 'password zip'],
    render: function (root) {
      root.classList.add('g-fileb');
      var arch = null, selected = new Set(), urls = [];
      U.onTeardown(root, function () { urls.forEach(function (u) { URL.revokeObjectURL(u); }); if (arch && arch.close) arch.close(); });
      var status = U.progress();
      var info = el('div', { class: 'g-line' });
      var passPanel = el('div');
      var treePanel = el('div'), previewPanel = el('div');
      var zone = U.dropzone({ label: 'Drop an archive here or click to choose', hint: 'ZIP, 7z, RAR, TAR, TAR.GZ, GZ, BZ2, XZ… It stays on this device.', onFiles: function (f) { open(f[0]); } });
      root.appendChild(U.panel(null, zone, info, status));
      root.appendChild(passPanel);
      root.appendChild(treePanel);
      root.appendChild(previewPanel);

      function entriesFromTar(tar) {
        return parseTar(tar).map(function (e) {
          return { path: cleanPath(e.path), dir: e.dir, size: e.size, date: e.date, link: e.link, get: function () { return Promise.resolve(e.data || new Uint8Array(0)); } };
        }).filter(function (e) { return e.path; });
      }
      async function fromDecompressed(bytes, file, kind, date, storedName) {
        if (looksLikeTar(bytes)) return { kind: KIND_NAMES[kind] + ' + TAR', entries: entriesFromTar(bytes) };
        var name = cleanPath(storedName || stripExt(file.name, kind));
        return { kind: KIND_NAMES[kind], entries: [{ path: name, dir: false, size: bytes.length, date: date || null, get: function () { return Promise.resolve(bytes); } }] };
      }

      async function viaLibarchive(file, kind) {
        var Archive = await libArchive();
        var a = await Archive.open(file);
        var enc = null;
        try { enc = await a.hasEncryptedData(); } catch (e) { enc = null; }
        var list;
        try { list = await a.getFilesArray(); }
        catch (e) { a.close(); throw archiveError(e, kind); }
        var cache = null;
        var res = {
          kind: KIND_NAMES[kind] || kind, encrypted: enc === true, close: function () { try { a.close(); } catch (e) { /* closed */ } },
          entries: list.map(function (x) {
            var path = cleanPath(x.path + (x.file.name || ''));
            return { path: path, dir: false, size: x.file.size || 0, date: null,
              get: async function () {
                if (cache) return cache[path];
                try { return new Uint8Array(await (await x.file.extract()).arrayBuffer()); }
                catch (e) { throw archiveError(e, kind); }
              } };
          }),
          usePassword: function (pw) { return a.usePassword(pw); },
          /* extract everything in one pass (the worker closes afterwards) */
          getAll: async function () {
            if (cache) return cache;
            var obj;
            try { obj = await a.extractFiles(); } catch (e) { throw archiveError(e, kind); }
            cache = {};
            (function walk(o, prefix) {
              Object.keys(o).forEach(function (k) {
                var v = o[k];
                if (v instanceof File) cache[cleanPath(prefix + k)] = v;
                else if (v && typeof v === 'object') walk(v, prefix + k + '/');
              });
            })(obj, '');
            var keys = Object.keys(cache);
            for (var i = 0; i < keys.length; i++) cache[keys[i]] = new Uint8Array(await cache[keys[i]].arrayBuffer());
            return cache;
          }
        };
        return res;
      }
      function archiveError(e, kind) {
        var m = (e && e.message) || String(e);
        var err;
        if (/Incorrect passphrase/i.test(m)) { err = new Error('That password is not right for this archive.'); err.code = 'BAD_PASSWORD'; }
        else if (/Passphrase required/i.test(m)) { err = new Error('This archive is password-protected. Enter the password to extract it.'); err.code = 'NEED_PASSWORD'; }
        else if (/crypt|passphrase/i.test(m)) { err = new Error('This ' + (KIND_NAMES[kind] || '') + ' archive uses encryption that cannot be opened in the browser (' + m + '). Use 7-Zip or WinRAR on a computer.'); err.code = 'UNSUPPORTED'; }
        else err = new Error('Could not read this archive: ' + m);
        return err;
      }

      async function open(file) {
        if (!file) return;
        if (arch && arch.close) arch.close();
        arch = null; selected = new Set();
        passPanel.replaceChildren(); treePanel.replaceChildren(); previewPanel.replaceChildren(); info.replaceChildren();
        try {
          status.set('Reading ' + file.name + '…');
          var head = new Uint8Array(await file.slice(0, 1024).arrayBuffer()), kind = magic(head), res;
          if (!kind) throw new Error(file.name + ' does not look like an archive this tool can open (ZIP, 7z, RAR, TAR, GZ, BZ2 or XZ).');
          if (kind === 'zip') {
            var JSZip = await libZip();
            try {
              var zip = await JSZip.loadAsync(file);
              res = { kind: 'ZIP', comment: zip.comment || '', entries: [] };
              zip.forEach(function (path, obj) {
                var p = cleanPath(path);
                if (!p) return;
                res.entries.push({ path: p, dir: obj.dir, size: obj._data && obj._data.uncompressedSize !== undefined ? obj._data.uncompressedSize : 0,
                  date: obj.date, get: function () { return obj.async('uint8array'); } });
              });
            } catch (e) {
              if (!/encrypt/i.test(e && e.message || '')) throw new Error('Could not read this ZIP: ' + (e.message || e));
              res = await viaLibarchive(file, 'zip');
              res.encrypted = true;
            }
          } else if (kind === 'gz') {
            var pako = await libPako(), gzb = new Uint8Array(await file.arrayBuffer()), gh = gzipHeader(gzb);
            status.set('Decompressing…');
            var raw;
            try { raw = pako.ungzip(gzb); } catch (e) { throw new Error('This gzip file is damaged or incomplete.'); }
            res = await fromDecompressed(raw, file, 'gz', gh.date, gh.name);
          } else if (kind === 'bz2' || kind === 'xz') {
            var cb = new Uint8Array(await file.arrayBuffer());
            status.set('Decompressing…');
            var out;
            try { out = kind === 'bz2' ? bunzip2(cb) : unxz(cb); }
            catch (e) {
              /* an xz filter we do not decode (BCJ…) inside a tarball: libarchive can */
              if (/not supported/.test(e.message) && /\.(tar\.xz|txz|tar\.bz2|tbz2?)$/i.test(file.name)) out = null;
              else throw e;
            }
            res = out ? await fromDecompressed(out, file, kind, new Date(file.lastModified), '') : await viaLibarchive(file, 'tar');
          } else if (kind === 'tar') {
            res = { kind: 'TAR', entries: entriesFromTar(new Uint8Array(await file.arrayBuffer())) };
          } else {
            res = await viaLibarchive(file, kind);
          }
          arch = res;
          arch.file = file;
          var files = res.entries.filter(function (e) { return !e.dir; });
          var total = files.reduce(function (s, e) { return s + (e.size || 0); }, 0);
          info.replaceChildren(el('span', { text: file.name }),
            el('span', { class: 'muted', dataset: { k: 'summary' }, text: res.kind + ' · ' + plural(files.length, 'file') + ' · ' + U.bytes(total) + ' unpacked (' + U.bytes(file.size) + ' packed)' }));
          status.set('');
          if (res.comment) info.appendChild(el('span', { class: 'muted', text: 'Comment: ' + res.comment }));
          if (res.encrypted) askPassword(); else drawTree();
        } catch (err) { status.fail(err); }
      }

      function askPassword() {
        var pw = U.input({ type: 'password', autocomplete: 'off', 'aria-label': 'Archive password' });
        var msg = U.note('');
        var go = U.button('Unlock', async function () {
          try {
            msg.className = 'note'; msg.textContent = 'Checking…';
            await arch.usePassword(pw.value);
            var first = arch.entries.filter(function (e) { return !e.dir; })[0];
            if (first) await first.get();
            passPanel.replaceChildren();
            drawTree();
          } catch (e) { msg.className = 'note err'; msg.textContent = e.message || String(e); }
        }, 'primary');
        pw.addEventListener('keydown', function (e) { if (e.key === 'Enter') go.click(); });
        setKidsSafe(passPanel, U.panel('Password needed', U.note('This archive is encrypted. The names are listed below; enter the password to open the files. It is used only on this device.'),
          U.row(el('div', { class: 'grow' }, field('Password', pw)), go), msg));
        drawTree();
      }
      function setKidsSafe(node) { node.replaceChildren.apply(node, Array.prototype.slice.call(arguments, 1)); }

      function buildTree(entries) {
        var rootNode = { dirs: {}, files: [], name: '' };
        entries.forEach(function (e) {
          var parts = e.path.split('/'), node = rootNode;
          var upto = e.dir ? parts.length : parts.length - 1;
          for (var i = 0; i < upto; i++) node = node.dirs[parts[i]] = node.dirs[parts[i]] || { dirs: {}, files: [], name: parts[i], path: parts.slice(0, i + 1).join('/') };
          if (!e.dir) node.files.push(e);
          else if (e.date) node.date = e.date;
        });
        return rootNode;
      }
      function filesUnder(node) {
        var out = node.files.slice();
        Object.keys(node.dirs).forEach(function (k) { out = out.concat(filesUnder(node.dirs[k])); });
        return out;
      }

      function drawTree() {
        var entries = arch.entries, files = entries.filter(function (e) { return !e.dir; });
        var tree = el('div', { class: 'g-tree scroll', role: 'tree' });
        var boxes = [];
        function refreshBoxes() {
          boxes.forEach(function (b) {
            var list = b.files, n = list.filter(function (e) { return selected.has(e.path); }).length;
            b.input.checked = n > 0 && n === list.length;
            b.input.indeterminate = n > 0 && n < list.length;
          });
          selNote.textContent = selected.size ? plural(selected.size, 'file') + ' selected' : 'Nothing selected';
        }
        function fileRow(e) {
          var cb = el('input', { type: 'checkbox', 'aria-label': 'Select ' + e.path, checked: selected.has(e.path) });
          cb.addEventListener('change', function () { if (cb.checked) selected.add(e.path); else selected.delete(e.path); refreshBoxes(); });
          boxes.push({ input: cb, files: [e] });
          return el('div', { class: 'g-row', role: 'treeitem', dataset: { path: e.path } }, cb,
            el('span', { class: 'nm', title: e.path, text: baseOf(e.path) + (e.link ? ' → ' + e.link : '') }),
            el('span', { class: 'sz', text: U.bytes(e.size || 0) }),
            el('span', { class: 'dt', text: when(e.date) }),
            U.button('View', function () { preview(e); }, 'ghost'),
            U.button('Save', function () { saveOne(e); }, 'ghost'));
        }
        function dirNode(node, depth) {
          var kids = [];
          Object.keys(node.dirs).sort(natural).forEach(function (k) {
            var d = node.dirs[k], under = filesUnder(d);
            var cb = el('input', { type: 'checkbox', 'aria-label': 'Select folder ' + d.path, onclick: function (ev) { ev.stopPropagation(); } });
            cb.addEventListener('change', function () { under.forEach(function (e) { if (cb.checked) selected.add(e.path); else selected.delete(e.path); }); refreshBoxes(); });
            boxes.push({ input: cb, files: under });
            var size = under.reduce(function (s, e) { return s + (e.size || 0); }, 0);
            kids.push(el('details', { open: depth < 2 || files.length < 200, dataset: { dir: d.path } },
              el('summary', {}, el('span', { class: 'g-sum' }, cb, el('b', { text: '📁 ' + d.name }), el('span', { class: 'muted', text: plural(under.length, 'file') + ' · ' + U.bytes(size) }))),
              dirNode(d, depth + 1)));
          });
          node.files.slice().sort(function (a, b) { return natural(a.path, b.path); }).forEach(function (e) { kids.push(fileRow(e)); });
          return kids;
        }
        tree.append.apply(tree, dirNode(buildTree(entries), 0));
        var selNote = el('span', { class: 'note', dataset: { k: 'selected' } });
        var zipSel = U.button('Save selected as ZIP', null, 'primary');
        var zipAll = U.button('Save everything as ZIP');
        zipSel.addEventListener('click', function () { if (!selected.size) return U.toast('Select some files first', 'err'); rezip(files.filter(function (e) { return selected.has(e.path); }), zipSel, '-selection'); });
        zipAll.addEventListener('click', function () { rezip(files, zipAll, arch.kind === 'ZIP' ? '-copy' : ''); });
        setKidsSafe(treePanel, U.panel('Contents', el('div', { class: 'g-bar' },
            U.button('Select all', function () { files.forEach(function (e) { selected.add(e.path); }); refreshBoxes(); }, 'ghost'),
            U.button('Select none', function () { selected.clear(); refreshBoxes(); }, 'ghost'),
            zipSel, zipAll, selNote),
          files.length ? tree : U.note('This archive is empty.')));
        refreshBoxes();
      }

      async function bytesOf(e) {
        var b = await e.get();
        if (!b) throw new Error('Could not extract ' + e.path + '.');
        return b;
      }
      async function saveOne(e) {
        try { U.saveBlob(baseOf(e.path), new Blob([await bytesOf(e)])); }
        catch (err) { U.toast(err.message || String(err), 'err'); if (err.code === 'NEED_PASSWORD' || err.code === 'BAD_PASSWORD') askPassword(); }
      }
      async function preview(e) {
        var box = el('div', { class: 'g-preview stack' });
        setKidsSafe(previewPanel, U.panel('Preview: ' + e.path, box));
        try {
          var b = await bytesOf(e), ext = (/\.([^.\/]+)$/.exec(e.path) || [, ''])[1].toLowerCase();
          if (IMAGE_TYPES[ext]) {
            var url = URL.createObjectURL(new Blob([b], { type: IMAGE_TYPES[ext] }));
            urls.push(url);
            box.appendChild(el('img', { src: url, alt: e.path }));
          } else if (looksText(b)) {
            var limit = 200 * 1024, text = new TextDecoder().decode(b.subarray(0, limit));
            box.appendChild(el('pre', { class: 'out', dataset: { k: 'preview' }, text: text }));
            if (b.length > limit) box.appendChild(U.note('Showing the first 200 KB of ' + U.bytes(b.length) + '.'));
          } else box.appendChild(U.note('No preview for this kind of file (' + U.bytes(b.length) + '). Save it to open it in another app.'));
          box.appendChild(U.btnrow(U.button('Save this file', function () { U.saveBlob(baseOf(e.path), new Blob([b])); })));
        } catch (err) { box.replaceChildren(U.note(err.message || String(err), 'err')); }
        previewPanel.scrollIntoView({ block: 'nearest' });
      }
      async function rezip(list, button, suffix) {
        if (button.disabled) return;
        var label = button.textContent;
        button.disabled = true; button.textContent = 'Working…';
        try {
          var JSZip = await libZip(), zip = new JSZip();
          if (arch.getAll && list.length > 10) { status.set('Extracting…'); await arch.getAll(); }
          for (var i = 0; i < list.length; i++) {
            status.set('Adding ' + list[i].path + '…', i / list.length);
            zip.file(list[i].path, await bytesOf(list[i]), list[i].date && when(list[i].date) ? { date: list[i].date } : {});
          }
          status.set('Compressing…');
          var blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
          var name = arch.file.name.replace(/\.(zip|7z|rar|tar|tgz|tbz2?|txz|gz|bz2|xz|cab|iso|lha|lzh)$/ig, '').replace(/\.tar$/i, '') + suffix + '.zip';
          U.saveBlob(name, blob);
          status.done('Saved ' + plural(list.length, 'file') + ' as ' + name + ' (' + U.bytes(blob.size) + ').');
        } catch (err) {
          status.fail(err);
          if (err.code === 'NEED_PASSWORD' || err.code === 'BAD_PASSWORD') askPassword();
        } finally { button.disabled = false; button.textContent = label; }
      }
    }
  });

  /* ==========================================================================
     Bulk File Renamer
     ========================================================================== */

  var RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
  function splitName(n) {
    var dot = n.lastIndexOf('.');
    return dot > 0 ? { stem: n.slice(0, dot), ext: n.slice(dot + 1) } : { stem: n, ext: '' };
  }
  function changeCase(s, mode) {
    var words = function () { return s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[\s_\-.]+/).filter(Boolean); };
    switch (mode) {
      case 'lower': return s.toLowerCase();
      case 'upper': return s.toUpperCase();
      case 'title': return s.toLowerCase().replace(/(^|[\s_\-(\[])(\p{L})/gu, function (m, a, b) { return a + b.toUpperCase(); });
      case 'sentence': return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
      case 'kebab': return words().join('-').toLowerCase();
      case 'snake': return words().join('_').toLowerCase();
      default: return s;
    }
  }
  function dateStamp(d, fmt) {
    var y = d.getFullYear(), m = pad2(d.getMonth() + 1), dd = pad2(d.getDate()), hh = pad2(d.getHours()), mi = pad2(d.getMinutes());
    return { ymd: y + '-' + m + '-' + dd, dmy: dd + '-' + m + '-' + y, compact: '' + y + m + dd, ymdhm: y + '-' + m + '-' + dd + '_' + hh + '-' + mi }[fmt];
  }
  function nameProblem(n) {
    if (!n.trim()) return 'Empty name';
    if (/[\\\/:*?"<>|\x00-\x1f]/.test(n)) return 'Not allowed: \\ / : * ? " < > |';
    if (/[. ]$/.test(n)) return 'Ends with a dot or space';
    if (RESERVED.test(n)) return 'Reserved name on Windows';
    if (n.length > 255) return 'Longer than 255 characters';
    return '';
  }

  Tools.register({
    id: 'bulk-renamer', category: 'file', name: 'Bulk File Renamer',
    description: 'Rename many files at once with find and replace, numbering, dates, case and extension rules, and download them renamed in a ZIP.',
    keywords: ['bulk rename', 'batch rename', 'rename files', 'mass rename', 'file renamer', 'regex rename', 'numbering', 'sequence', 'prefix', 'suffix', 'change extension', 'lowercase'],
    render: function (root) {
      root.classList.add('g-fileb');
      var files = [];      /* { file, path } */
      function rule(title, on, body) {
        var cb = U.checkbox(title, { checked: !!on });
        var wrap = el('div', { class: 'g-rule' }, cb, body);
        body.style.display = cb.input.checked ? '' : 'none';
        cb.input.addEventListener('change', function () { body.style.display = cb.input.checked ? '' : 'none'; });
        wrap.enabled = function () { return cb.input.checked; };
        wrap.toggle = cb.input;
        return wrap;
      }
      function inp(label, value, extra, aria) { var i = U.input(Object.assign({ value: value || '', 'aria-label': aria || label }, extra || {})); return { input: i, node: field(label, i) }; }
      function sel(label, options, value, aria) { var s = U.select({ options: options, value: value, 'aria-label': aria || label }); return { input: s, node: field(label, s) }; }

      var findIn = inp('Find', ''), replIn = inp('Replace with', ''), useRe = U.checkbox('Regular expression'), matchCase = U.checkbox('Match case'), wholeName = U.checkbox('Include the extension');
      var rFind = rule('Find and replace', true, el('div', { class: 'stack' }, U.row(el('div', { class: 'grow' }, findIn.node), el('div', { class: 'grow' }, replIn.node)), el('div', { class: 'g-bar' }, useRe, matchCase, wholeName)));
      var cutFirst = inp('Remove first (characters)', '0', { type: 'number', min: '0' }), cutLast = inp('Remove last', '0', { type: 'number', min: '0' }), cutChars = inp('Remove these characters', '');
      var rRemove = rule('Remove characters', false, el('div', { class: 'stack' }, U.row(cutFirst.node, cutLast.node), cutChars.node));
      var caseSel = sel('Case', [{ value: 'lower', label: 'lower case' }, { value: 'upper', label: 'UPPER CASE' }, { value: 'title', label: 'Title Case' }, { value: 'sentence', label: 'Sentence case' }, { value: 'kebab', label: 'kebab-case' }, { value: 'snake', label: 'snake_case' }], 'lower');
      var rCase = rule('Change case', false, caseSel.node);
      var prefixIn = inp('Prefix', ''), suffixIn = inp('Suffix', '');
      var rAffix = rule('Add prefix / suffix', false, U.row(el('div', { class: 'grow' }, prefixIn.node), el('div', { class: 'grow' }, suffixIn.node)));
      var dateFmt = sel('Date format', [{ value: 'ymd', label: '2026-09-22' }, { value: 'dmy', label: '22-09-2026' }, { value: 'compact', label: '20260922' }, { value: 'ymdhm', label: '2026-09-22_14-30' }], 'ymd');
      var datePos = sel('Position', [{ value: 'prefix', label: 'Before the name' }, { value: 'suffix', label: 'After the name' }], 'prefix', 'Date position');
      var dateSep = inp('Separator', '_', null, 'Date separator');
      var rDate = rule('Insert the date modified', false, U.row(dateFmt.node, datePos.node, dateSep.node));
      var numStart = inp('Start at', '1', { type: 'number' }), numStep = inp('Step', '1', { type: 'number' }), numPad = inp('Digits', '3', { type: 'number', min: '1', max: '12' });
      var numPos = sel('Position', [{ value: 'suffix', label: 'After the name' }, { value: 'prefix', label: 'Before the name' }, { value: 'replace', label: 'Replace the name' }], 'suffix', 'Number position');
      var numSep = inp('Separator', '-', null, 'Number separator'), numBase = inp('New name (for Replace)', '');
      var rNum = rule('Numbering', false, el('div', { class: 'stack' }, U.row(numStart.node, numStep.node, numPad.node), U.row(numPos.node, numSep.node, el('div', { class: 'grow' }, numBase.node))));
      var extMode = sel('Extension', [{ value: 'lower', label: 'Make lower case' }, { value: 'upper', label: 'Make upper case' }, { value: 'set', label: 'Change to…' }, { value: 'remove', label: 'Remove it' }], 'lower');
      var extNew = inp('New extension', '');
      var rExt = rule('Change the extension', false, U.row(extMode.node, extNew.node));
      var order = sel('Order for numbering', [{ value: 'added', label: 'As added' }, { value: 'name', label: 'Name' }, { value: 'date', label: 'Date modified' }, { value: 'size', label: 'Size' }], 'added');
      var reverse = U.checkbox('Reverse');
      var fixClash = U.checkbox('Fix clashes by adding (2), (3)…');
      var table = el('div', { class: 'scroll' }), status = U.note(''), summary = el('div', { class: 'g-bar' });
      var zipBtn = U.button('Download renamed files (ZIP)', null, 'primary');
      var csvBtn = U.button('Download list (CSV)', null, 'ghost');
      var result = [];

      function ordered() {
        var list = files.slice();
        var key = order.input.value;
        if (key === 'name') list.sort(function (a, b) { return natural(a.file.name, b.file.name); });
        else if (key === 'date') list.sort(function (a, b) { return a.file.lastModified - b.file.lastModified; });
        else if (key === 'size') list.sort(function (a, b) { return a.file.size - b.file.size; });
        if (reverse.input.checked) list.reverse();
        return list;
      }
      function rename(f, i) {
        var parts = splitName(f.file.name), stem = parts.stem, ext = parts.ext;
        if (rFind.enabled() && findIn.input.value) {
          var target = wholeName.input.checked ? f.file.name : stem, re;
          if (useRe.input.checked) re = new RegExp(findIn.input.value, matchCase.input.checked ? 'g' : 'gi');
          else re = new RegExp(findIn.input.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase.input.checked ? 'g' : 'gi');
          var replaced = target.replace(re, useRe.input.checked ? replIn.input.value : replIn.input.value.replace(/\$/g, '$$$$'));
          if (wholeName.input.checked) { var p2 = splitName(replaced); stem = p2.stem; ext = p2.ext; } else stem = replaced;
        }
        if (rRemove.enabled()) {
          var a = Math.max(0, Math.floor(num(cutFirst.input, 0))), b = Math.max(0, Math.floor(num(cutLast.input, 0)));
          stem = stem.slice(a, b ? Math.max(a, stem.length - b) : undefined);
          if (cutChars.input.value) stem = Array.from(stem).filter(function (ch) { return cutChars.input.value.indexOf(ch) < 0; }).join('');
        }
        if (rCase.enabled()) stem = changeCase(stem, caseSel.input.value);
        if (rAffix.enabled()) stem = prefixIn.input.value + stem + suffixIn.input.value;
        if (rDate.enabled()) {
          var ds = dateStamp(new Date(f.file.lastModified), dateFmt.input.value), sep = dateSep.input.value;
          stem = datePos.input.value === 'prefix' ? ds + sep + stem : stem + sep + ds;
        }
        if (rNum.enabled()) {
          var n = num(numStart.input, 1) + i * num(numStep.input, 1);
          var digits = Math.max(1, Math.min(12, Math.floor(num(numPad.input, 1))));
          var ns = (n < 0 ? '-' : '') + String(Math.abs(n)).padStart(digits, '0');
          var nsep = numSep.input.value;
          if (numPos.input.value === 'prefix') stem = ns + nsep + stem;
          else if (numPos.input.value === 'suffix') stem = stem + nsep + ns;
          else stem = numBase.input.value ? numBase.input.value + nsep + ns : ns;
        }
        if (rExt.enabled()) {
          var mode = extMode.input.value;
          if (mode === 'lower') ext = ext.toLowerCase();
          else if (mode === 'upper') ext = ext.toUpperCase();
          else if (mode === 'set') ext = extNew.input.value.replace(/^\.+/, '');
          else ext = '';
        }
        return ext ? stem + '.' + ext : stem;
      }
      function run() {
        status.className = 'note'; status.textContent = '';
        var list = ordered();
        try {
          result = list.map(function (f, i) { return { f: f, from: f.file.name, to: rename(f, i) }; });
        } catch (e) {
          result = [];
          status.className = 'note err'; status.textContent = 'Find: ' + (e.message || e);
        }
        var seen = {};
        result.forEach(function (r) { var k = r.to.toLowerCase(); seen[k] = (seen[k] || 0) + 1; });
        if (fixClash.input.checked) {
          var used = {};
          result.forEach(function (r) {
            var k = r.to.toLowerCase();
            if (seen[k] > 1) {
              used[k] = (used[k] || 0) + 1;
              if (used[k] > 1) { var p = splitName(r.to), n = used[k], cand; do { cand = p.stem + ' (' + n + ')' + (p.ext ? '.' + p.ext : ''); n++; } while (seen[cand.toLowerCase()]); r.to = cand; seen[cand.toLowerCase()] = 1; }
            }
          });
          seen = {};
          result.forEach(function (r) { var k = r.to.toLowerCase(); seen[k] = (seen[k] || 0) + 1; });
        }
        var problems = 0, changed = 0;
        result.forEach(function (r) {
          r.problem = nameProblem(r.to) || (seen[r.to.toLowerCase()] > 1 ? 'Same name as another file' : '');
          if (r.problem) problems++;
          if (r.to !== r.from) changed++;
        });
        table.replaceChildren(el('table', { class: 'data' },
          el('thead', el('tr', ['#', 'Current name', 'New name', ''].map(function (h) { return el('th', { text: h }); }))),
          el('tbody', result.slice(0, 2000).map(function (r, i) {
            return el('tr', { class: r.problem ? 'bad' : r.to === r.from ? 'same' : '' },
              el('td', { text: String(i + 1) }), el('td', { class: 'mono', text: r.from }),
              el('td', { class: 'mono', dataset: { k: 'new-name' }, text: r.to }),
              el('td', { text: r.problem || (r.to === r.from ? 'unchanged' : '') }));
          }))));
        summary.replaceChildren(el('span', { class: 'note', dataset: { k: 'rename-summary' }, text: plural(result.length, 'file') + ' · ' + changed + ' renamed' + (problems ? ' · ' + plural(problems, 'problem') : '') }));
        zipBtn.disabled = !result.length || problems > 0;
        if (problems && !status.textContent) { status.className = 'note err'; status.textContent = 'Fix the names marked in red before downloading (or tick "Fix clashes").'; }
      }
      var rerun = U.debounce(run, 150);
      root.addEventListener('input', function (e) { if (e.target.closest('.g-rules, .g-orderbar')) rerun(); });
      root.addEventListener('change', function (e) { if (e.target.closest('.g-rules, .g-orderbar')) rerun(); });

      zipBtn.addEventListener('click', async function () {
        if (zipBtn.disabled) return;
        zipBtn.disabled = true;
        try {
          var JSZip = await libZip(), zip = new JSZip();
          result.forEach(function (r) { zip.file(r.to, r.f.file, { date: new Date(r.f.file.lastModified || Date.now()) }); });
          status.className = 'note'; status.textContent = 'Building the ZIP…';
          var blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
          U.saveBlob('renamed-files.zip', blob);
          status.className = 'note ok'; status.textContent = 'Saved ' + plural(result.length, 'file') + ' (' + U.bytes(blob.size) + ').';
        } catch (e) { status.className = 'note err'; status.textContent = e.message || String(e); }
        zipBtn.disabled = false;
      });
      csvBtn.addEventListener('click', function () {
        if (!result.length) return U.toast('Add some files first', 'err');
        U.saveText('renames.csv', ['old_name,new_name'].concat(result.map(function (r) { return csvCell(r.from) + ',' + csvCell(r.to); })).join('\r\n') + '\r\n', 'text/csv');
      });

      var listInfo = el('span', { class: 'note' });
      root.appendChild(U.panel(null,
        multiDrop({ label: 'Drop files here or click to choose', hint: 'Add as many as you like; nothing is uploaded', onFiles: function (l) { files = files.concat(l); listInfo.textContent = plural(files.length, 'file') + ' added'; run(); } }),
        el('div', { class: 'g-bar' }, listInfo, U.button('Clear', function () { files = []; listInfo.textContent = ''; run(); }, 'ghost')),
        U.note('A web page cannot rename files on your disk, so you get renamed copies in a ZIP, plus a CSV of old and new names if you want a record.')));
      root.appendChild(U.panel('Rules (applied in this order)', el('div', { class: 'g-rules' }, rFind, rRemove, rCase, rAffix, rDate, rNum, rExt),
        el('div', { class: 'g-bar g-orderbar', style: { marginTop: '10px' } }, order.node, reverse, fixClash)));
      root.appendChild(U.panel('Preview', summary, table, status, U.btnrow(zipBtn, csvBtn)));
      run();
    }
  });

  /* ==========================================================================
     File Splitter & Joiner
     ========================================================================== */

  var SIZE_UNITS = { B: 1, KB: 1024, MB: 1048576, GB: 1073741824 };

  function parseManifest(text) {
    var out = {};
    text.split(/\r?\n/).forEach(function (line) {
      var m = /^([0-9a-f]{64}) [ *]?(.+)$/i.exec(line.trim());
      if (m) out[m[2]] = m[1].toLowerCase();
    });
    return out;
  }

  Tools.register({
    id: 'file-splitter', category: 'file', name: 'File Splitter & Joiner',
    description: 'Cut a big file into parts of a set size or number, with an optional SHA-256 manifest, and join the parts back and check them.',
    keywords: ['split file', 'join files', 'merge parts', 'chunk', 'hjsplit', '.001', 'file cutter', 'combine parts', 'sha256 manifest', 'checksum', 'email attachment limit'],
    render: function (root) {
      root.classList.add('g-fileb');
      var splitBox = el('div', { class: 'stack' }), joinBox = el('div', { class: 'stack' });
      var tabs = U.chips([{ value: 'split', label: 'Split a file' }, { value: 'join', label: 'Join parts' }], function (v) {
        splitBox.style.display = v === 'split' ? '' : 'none'; joinBox.style.display = v === 'join' ? '' : 'none';
      }, 'split');
      root.appendChild(U.panel(null, tabs));
      root.appendChild(splitBox);
      root.appendChild(joinBox);
      joinBox.style.display = 'none';

      /* --- split ------------------------------------------------------------- */
      var source = null, parts = [], manifestText = '';
      var mode = U.select({ options: [{ value: 'size', label: 'Parts of a set size' }, { value: 'count', label: 'A set number of parts' }], value: 'size', 'aria-label': 'Split by' });
      var sizeIn = U.input({ type: 'number', value: '10', min: '1', step: 'any', 'aria-label': 'Part size' });
      var unit = U.select({ options: [{ value: 'B', label: 'bytes' }, { value: 'KB', label: 'KB (1,024 bytes)' }, { value: 'MB', label: 'MB (1,048,576 bytes)' }, { value: 'GB', label: 'GB' }], value: 'MB', 'aria-label': 'Unit' });
      var countIn = U.input({ type: 'number', value: '3', min: '2', step: '1', 'aria-label': 'Number of parts' });
      var sizeRow = U.row(field('Part size', sizeIn), field('Unit', unit)), countRow = U.row(field('Number of parts', countIn));
      var withManifest = U.checkbox('Also make a SHA-256 manifest (to check the parts later)', { checked: true });
      var srcInfo = el('div', { class: 'g-line' });
      var splitGo = U.button('Split', null, 'primary');
      var splitOut = el('div', { class: 'stack' }), progress = U.progress();
      function syncMode() { sizeRow.style.display = mode.value === 'size' ? '' : 'none'; countRow.style.display = mode.value === 'count' ? '' : 'none'; }
      mode.addEventListener('change', syncMode); syncMode();
      splitBox.appendChild(U.panel(null,
        U.dropzone({ label: 'Drop the file to split here', hint: 'Any file, any size: it is read in pieces', onFiles: function (f) { source = f[0]; srcInfo.replaceChildren(el('span', { text: source.name }), el('span', { class: 'muted', text: U.bytes(source.size) + ' (' + source.size.toLocaleString('en-GB') + ' bytes)' })); splitOut.replaceChildren(); } }),
        srcInfo, U.row(field('Split into', mode)), sizeRow, countRow, withManifest, U.btnrow(splitGo), progress, splitOut));

      splitGo.addEventListener('click', async function () {
        if (!source) return U.toast('Choose a file first', 'err');
        if (splitGo.disabled) return;
        var size;
        if (mode.value === 'size') size = Math.floor(num(sizeIn, 0) * SIZE_UNITS[unit.value]);
        else { var n = Math.floor(num(countIn, 0)); if (n < 2) return U.toast('Choose at least 2 parts', 'err'); size = Math.ceil(source.size / n); }
        if (!(size >= 1)) return U.toast('Choose a part size', 'err');
        var count = Math.max(1, Math.ceil(source.size / size));
        if (count > 9999) return U.toast('That would make ' + count + ' parts; choose a bigger size', 'err');
        var digits = Math.max(3, String(count).length);
        parts = [];
        for (var i = 0; i < count; i++) parts.push({ name: source.name + '.' + String(i + 1).padStart(digits, '0'), start: i * size, end: Math.min(source.size, (i + 1) * size) });
        manifestText = '';
        splitGo.disabled = true;
        try {
          if (withManifest.input.checked) {
            /* one pass over the file: each chunk feeds its part's hash and the whole-file hash */
            var whole = new Sha256(), done = 0;
            for (var p = 0; p < parts.length; p++) {
              var h = new Sha256();
              for (var off = parts[p].start; off < parts[p].end; off += CHUNK) {
                var chunk = new Uint8Array(await source.slice(off, Math.min(parts[p].end, off + CHUNK)).arrayBuffer());
                h.update(chunk); whole.update(chunk);
                done += chunk.length;
                progress.set('Working out checksums… ' + Math.round(done / Math.max(1, source.size) * 100) + '%', done / Math.max(1, source.size));
              }
              parts[p].sha = toHex(h.digest());
            }
            var wholeSha = toHex(whole.digest());
            manifestText = parts.map(function (x) { return x.sha + '  ' + x.name; }).join('\n') + '\n' + wholeSha + '  ' + source.name + '\n';
          }
          progress.done('Split into ' + plural(parts.length, 'part') + '.');
          drawParts();
        } catch (e) { progress.fail(e); }
        splitGo.disabled = false;
      });
      function drawParts() {
        var rows = parts.map(function (x) {
          return [x.name, U.bytes(x.end - x.start), U.button('Download', function () { U.saveBlob(x.name, source.slice(x.start, x.end)); }, 'ghost')];
        });
        var allBtn = U.button('Download all parts', async function () {
          for (var i = 0; i < parts.length; i++) { U.saveBlob(parts[i].name, source.slice(parts[i].start, parts[i].end)); await new Promise(function (r) { setTimeout(r, 350); }); }
          if (manifestText) U.saveText(source.name + '.sha256', manifestText);
        }, 'primary');
        var zipBtn = U.button('Download as one ZIP', async function () {
          var JSZip = await libZip(), zip = new JSZip();
          parts.forEach(function (x) { zip.file(x.name, source.slice(x.start, x.end)); });
          if (manifestText) zip.file(source.name + '.sha256', manifestText);
          U.saveBlob(source.name + '-parts.zip', await zip.generateAsync({ type: 'blob', compression: 'STORE' }));
        });
        splitOut.replaceChildren(
          el('p', { class: 'note', dataset: { k: 'parts' }, text: plural(parts.length, 'part') + ' of up to ' + U.bytes(parts[0].end - parts[0].start) }),
          el('div', { class: 'scroll' }, U.table(['Part', 'Size', ''], rows)),
          U.btnrow(allBtn, zipBtn, manifestText ? U.button('Download manifest (.sha256)', function () { U.saveText(source.name + '.sha256', manifestText); }, 'ghost') : null),
          manifestText ? el('pre', { class: 'out', dataset: { k: 'manifest' }, text: manifestText }) : null,
          U.note('Browsers may ask before saving several files at once. The ZIP needs enough memory for the whole file.'));
      }

      /* --- join -------------------------------------------------------------- */
      var joinParts = [], manifest = null, manifestName = '';
      var joinList = el('div', { class: 'stack' }), joinOut = el('div', { class: 'stack' }), joinProgress = U.progress();
      var joinGo = U.button('Join and download', null, 'primary');
      function outputName() {
        if (manifest) {
          var names = Object.keys(manifest), partNames = joinParts.map(function (f) { return f.name; });
          var whole = names.filter(function (n) { return partNames.indexOf(n) < 0 && !/\.\d{2,}$/.test(n); })[0];
          if (whole) return whole;
        }
        return joinParts.length ? joinParts[0].name.replace(/\.(\d{2,}|part\d+)$/i, '') || 'joined' : 'joined';
      }
      function drawJoin() {
        joinParts.sort(function (a, b) { return natural(a.name, b.name); });
        var nums = joinParts.map(function (f) { var m = /\.(\d+)$/.exec(f.name); return m ? parseInt(m[1], 10) : null; });
        var gaps = [];
        for (var i = 1; i < nums.length; i++) if (nums[i] !== null && nums[i - 1] !== null && nums[i] !== nums[i - 1] + 1) gaps.push(nums[i - 1] + 1);
        var total = joinParts.reduce(function (s, f) { return s + f.size; }, 0);
        joinList.replaceChildren(
          el('div', { class: 'scroll' }, U.table(['#', 'Part', 'Size'], joinParts.map(function (f, i) { return [String(i + 1), f.name, U.bytes(f.size)]; }))),
          U.note(plural(joinParts.length, 'part') + ' · ' + U.bytes(total) + ' → ' + outputName() + (manifest ? ' · manifest: ' + manifestName : ' · no manifest (add the .sha256 file to check the result)')),
          gaps.length ? U.note('Parts seem to be missing before number ' + gaps.join(', ') + '.', 'err') : null);
      }
      joinBox.appendChild(U.panel(null,
        multiDrop({ label: 'Drop all the parts here (and the .sha256 manifest, if you have it)', hint: 'They are put in order by name', onFiles: async function (list) {
          for (var i = 0; i < list.length; i++) {
            var f = list[i].file;
            if (/\.(sha256|sha256sum)$/i.test(f.name) || (f.size < 1048576 && /\.txt$/i.test(f.name))) {
              var m = parseManifest(await f.text());
              if (Object.keys(m).length) { manifest = m; manifestName = f.name; continue; }
            }
            if (!joinParts.some(function (p) { return p.name === f.name && p.size === f.size; })) joinParts.push(f);
          }
          joinOut.replaceChildren();
          drawJoin();
        } }),
        joinList, U.btnrow(joinGo, U.button('Clear', function () { joinParts = []; manifest = null; joinList.replaceChildren(); joinOut.replaceChildren(); }, 'ghost')), joinProgress, joinOut));

      joinGo.addEventListener('click', async function () {
        if (!joinParts.length) return U.toast('Add the parts first', 'err');
        if (joinGo.disabled) return;
        joinGo.disabled = true;
        try {
          var blob = new Blob(joinParts), name = outputName(), rows = [], allOk = true;
          if (manifest) {
            var total = blob.size, done = 0, whole = new Sha256();
            for (var i = 0; i < joinParts.length; i++) {
              var h = new Sha256(), f = joinParts[i];
              for (var off = 0; off < f.size; off += CHUNK) {
                var c = new Uint8Array(await f.slice(off, Math.min(f.size, off + CHUNK)).arrayBuffer());
                h.update(c); whole.update(c); done += c.length;
                joinProgress.set('Checking… ' + Math.round(done / Math.max(1, total) * 100) + '%', done / Math.max(1, total));
              }
              var got = toHex(h.digest()), want = manifest[f.name];
              var good = want ? got === want : null;
              if (good === false) allOk = false;
              rows.push([f.name, want ? (good ? '✓ matches' : '✗ different') : 'not in manifest']);
            }
            var wg = toHex(whole.digest()), ww = manifest[name];
            if (ww) { rows.push([name + ' (joined)', ww === wg ? '✓ matches' : '✗ different']); if (ww !== wg) allOk = false; }
            var missing = Object.keys(manifest).filter(function (n) { return n !== name && !joinParts.some(function (p) { return p.name === n; }); });
            if (missing.length) allOk = false;
            joinOut.replaceChildren(
              el('p', { class: 'note ' + (allOk ? 'ok' : 'err'), dataset: { k: 'verify' }, text: allOk ? 'Every part and the joined file match the manifest.' :
                'Problem: ' + (missing.length ? 'missing ' + missing.join(', ') + '. ' : '') + 'Some checksums do not match; the joined file is probably damaged.' }),
              el('div', { class: 'scroll' }, U.table(['File', 'SHA-256 check'], rows)));
          } else joinOut.replaceChildren(el('p', { class: 'note', dataset: { k: 'verify' }, text: 'Joined without checking (no manifest).' }));
          U.saveBlob(name, blob);
          joinProgress.done('Joined ' + plural(joinParts.length, 'part') + ' into ' + name + ' (' + U.bytes(blob.size) + ').');
        } catch (e) { joinProgress.fail(e); }
        joinGo.disabled = false;
      });
    }
  });

  /* ==========================================================================
     Duplicate File Finder
     ========================================================================== */

  async function filesFromDirectoryHandle(dir, prefix, out, status) {
    for await (var entry of dir.values()) {
      if (entry.kind === 'file') { try { out.push({ file: await entry.getFile(), path: prefix + entry.name }); } catch (e) { /* unreadable */ } }
      else if (entry.kind === 'directory') await filesFromDirectoryHandle(entry, prefix + entry.name + '/', out, status);
      if (status && out.length % 200 === 0) status.set('Listing files… ' + out.length);
    }
    return out;
  }

  Tools.register({
    id: 'duplicate-finder', category: 'file', name: 'Duplicate File Finder',
    description: 'Find files with exactly the same content in a folder, however they are named, and see how much space the copies waste.',
    keywords: ['duplicate files', 'find duplicates', 'duplicate finder', 'same files', 'identical files', 'dedupe', 'deduplicate', 'free up space', 'wasted space', 'sha256', 'clean up'],
    render: function (root) {
      root.classList.add('g-fileb');
      var files = [], cancel = { cancelled: false }, groups = [];
      var ignoreEmpty = U.checkbox('Ignore empty files', { checked: true });
      var ignoreHidden = U.checkbox('Ignore hidden files (names starting with a dot)');
      var status = U.progress(), results = el('div', { class: 'stack' }), picked = el('span', { class: 'note' });
      var dirInput = el('input', { type: 'file', multiple: true, webkitdirectory: true, style: { display: 'none' } });
      dirInput.addEventListener('change', function () {
        var list = Array.prototype.map.call(dirInput.files, function (f) { return { file: f, path: f.webkitRelativePath || f.name }; });
        dirInput.value = '';
        take(list);
      });
      var pickBtn = U.button('Choose a folder', async function () {
        if (window.showDirectoryPicker) {
          try {
            var dir = await window.showDirectoryPicker({ mode: 'read' });
            status.set('Listing files…');
            take(await filesFromDirectoryHandle(dir, dir.name + '/', [], status));
            return;
          } catch (e) { if (e && e.name === 'AbortError') return; }
        }
        dirInput.click();
      }, 'primary');
      function take(list) { files = files.concat(list); picked.textContent = plural(files.length, 'file') + ' ready'; status.set(''); results.replaceChildren(); }
      var scanBtn = U.button('Find duplicates', null, 'primary');
      var stopBtn = U.button('Stop', function () { cancel.cancelled = true; }, 'ghost');

      scanBtn.addEventListener('click', async function () {
        if (!files.length) return U.toast('Choose a folder or drop files first', 'err');
        if (scanBtn.disabled) return;
        scanBtn.disabled = true; cancel = { cancelled: false };
        try { groups = await scan(); draw(); }
        catch (e) { status.fail(e); }
        scanBtn.disabled = false;
      });

      async function scan() {
        var list = files.filter(function (f) {
          if (ignoreEmpty.input.checked && !f.file.size) return false;
          if (ignoreHidden.input.checked && f.path.split('/').some(function (s) { return s.charAt(0) === '.'; })) return false;
          return true;
        });
        /* 1. same size */
        var bySize = new Map();
        list.forEach(function (f) { var g = bySize.get(f.file.size); if (g) g.push(f); else bySize.set(f.file.size, [f]); });
        var candidates = [];
        bySize.forEach(function (g) { if (g.length > 1) candidates.push(g); });
        /* 2. same first 64 KB, 3. same SHA-256 of everything */
        var toHash = candidates.reduce(function (s, g) { return s + g.reduce(function (t, f) { return t + f.file.size; }, 0); }, 0), hashed = 0, out = [];
        for (var i = 0; i < candidates.length; i++) {
          var g = candidates[i], size = g[0].file.size, sub = [g];
          if (size > 65536) {
            var byHead = new Map();
            for (var k = 0; k < g.length; k++) {
              var hh = await sha256Blob(g[k].file, { end: 65536, signal: cancel });
              (byHead.get(hh) || byHead.set(hh, []).get(hh)).push(g[k]);
            }
            sub = [];
            byHead.forEach(function (x) { if (x.length > 1) sub.push(x); else hashed += size; });
          }
          for (var s = 0; s < sub.length; s++) {
            var byFull = new Map();
            for (var j = 0; j < sub[s].length; j++) {
              var f = sub[s][j], base = hashed;
              status.set('Checking ' + f.path + '…', toHash ? hashed / toHash : 0);
              var full = await sha256Blob(f.file, { signal: cancel, onProgress: function (n) { status.set('Checking ' + f.path + '…', toHash ? (base + n) / toHash : 0); } });
              hashed += size;
              (byFull.get(full) || byFull.set(full, []).get(full)).push(f);
            }
            byFull.forEach(function (x, sha) { if (x.length > 1) out.push({ sha: sha, size: size, files: x.sort(function (a, b) { return natural(a.path, b.path); }) }); });
          }
        }
        out.sort(function (a, b) { return b.size * (b.files.length - 1) - a.size * (a.files.length - 1) || natural(a.files[0].path, b.files[0].path); });
        status.done('Checked ' + plural(list.length, 'file') + '.');
        out.scanned = list.length;
        return out;
      }

      function draw() {
        var dupFiles = groups.reduce(function (s, g) { return s + g.files.length - 1; }, 0);
        var wasted = groups.reduce(function (s, g) { return s + g.size * (g.files.length - 1); }, 0);
        results.replaceChildren(
          U.stats([{ label: 'files checked', value: String(groups.scanned) }, { label: 'groups of duplicates', value: String(groups.length) },
            { label: 'extra copies', value: String(dupFiles) }, { label: 'space the copies use', value: U.bytes(wasted) }]),
          el('p', { class: 'note', dataset: { k: 'dup-summary' }, text: groups.length ? plural(groups.length, 'group') + ' · ' + plural(dupFiles, 'extra copy').replace('copys', 'copies') + ' · ' + wasted.toLocaleString('en-GB') + ' bytes wasted' : 'No duplicates found.' }),
          groups.length ? U.btnrow(U.button('Export as CSV', exportCsv)) : null,
          el('div', { class: 'stack' }, groups.slice(0, 500).map(function (g, i) {
            return el('div', { class: 'g-group', dataset: { k: 'group' } },
              el('b', { text: 'Group ' + (i + 1) + ': ' + plural(g.files.length, 'copy').replace('copys', 'copies') + ' of ' + U.bytes(g.size) + ' · wastes ' + U.bytes(g.size * (g.files.length - 1)) }),
              el('code', { class: 'h', text: 'SHA-256 ' + g.sha }),
              el('div', { class: 'paths' }, g.files.map(function (f) { return el('div', { text: f.path }); })));
          })),
          U.note('A web page cannot delete files. Use this list (or the CSV) to remove the copies you do not need in your file manager.'));
      }
      function exportCsv() {
        var lines = ['group,sha256,size_bytes,path'];
        groups.forEach(function (g, i) { g.files.forEach(function (f) { lines.push([i + 1, g.sha, g.size, csvCell(f.path)].join(',')); }); });
        U.saveText('duplicates.csv', lines.join('\r\n') + '\r\n', 'text/csv');
      }

      root.appendChild(U.panel(null,
        el('div', { class: 'g-bar' }, pickBtn, picked, dirInput),
        multiDrop({ label: 'Or drop files and folders here', hint: 'Only files of the same size are read, in 4 MB pieces', onFiles: take }),
        el('div', { class: 'g-bar' }, ignoreEmpty, ignoreHidden),
        U.btnrow(scanBtn, stopBtn, U.button('Clear', function () { files = []; groups = []; picked.textContent = ''; results.replaceChildren(); }, 'ghost')), status));
      root.appendChild(U.panel('Duplicates', results));
    }
  });

  /* ==========================================================================
     Binary File Compare
     ========================================================================== */

  Tools.register({
    id: 'binary-compare', category: 'file', name: 'Binary File Compare',
    description: 'Compare two files byte by byte: whether they match, where they first differ, every changed range, a side-by-side hex view and both SHA-256 hashes.',
    keywords: ['binary compare', 'binary diff', 'compare files', 'hex compare', 'byte compare', 'fc /b', 'cmp', 'vbindiff', 'identical files', 'checksum', 'sha256'],
    render: function (root) {
      root.classList.add('g-fileb');
      var fa = null, fb = null, res = null, cancel = { cancelled: false };
      var status = U.progress(), out = el('div', { class: 'stack' }), hexBox = el('div', { class: 'stack' });
      function slot(label, set) {
        var line = el('div', { class: 'g-line' });
        var z = U.dropzone({ label: label, onFiles: function (f) { set(f[0]); line.replaceChildren(el('span', { text: f[0].name }), el('span', { class: 'muted', text: U.bytes(f[0].size) })); out.replaceChildren(); hexBox.replaceChildren(); } });
        return U.panel(null, z, line);
      }
      var go = U.button('Compare', null, 'primary');
      root.appendChild(U.split(slot('First file (A)', function (f) { fa = f; }), slot('Second file (B)', function (f) { fb = f; })));
      root.appendChild(U.panel(null, U.btnrow(go, U.button('Stop', function () { cancel.cancelled = true; }, 'ghost')), status, out));
      root.appendChild(hexBox);

      go.addEventListener('click', async function () {
        if (!fa || !fb) return U.toast('Choose both files first', 'err');
        if (go.disabled) return;
        go.disabled = true; cancel = { cancelled: false };
        try { res = await compare(fa, fb); draw(); }
        catch (e) { status.fail(e); }
        go.disabled = false;
      });

      async function compare(a, b) {
        var ha = new Sha256(), hb = new Sha256(), common = Math.min(a.size, b.size), longest = Math.max(a.size, b.size);
        var diff = 0, first = -1, ranges = [], cur = null, MAXR = 10000, extraRanges = 0;
        for (var off = 0; off < longest; off += CHUNK) {
          if (cancel.cancelled) throw new Error('Stopped.');
          var ca = new Uint8Array(await a.slice(off, off + CHUNK).arrayBuffer()), cb = new Uint8Array(await b.slice(off, off + CHUNK).arrayBuffer());
          ha.update(ca); hb.update(cb);
          var n = Math.min(ca.length, cb.length);
          for (var i = 0; i < n; i++) {
            if (ca[i] !== cb[i]) {
              var p = off + i;
              diff++;
              if (first < 0) first = p;
              if (cur && cur.end === p - 1) cur.end = p;
              else { cur = { start: p, end: p }; if (ranges.length < MAXR) ranges.push(cur); else extraRanges++; }
            }
          }
          status.set('Comparing… ' + Math.round(Math.min(longest, off + CHUNK) / Math.max(1, longest) * 100) + '%', Math.min(longest, off + CHUNK) / Math.max(1, longest));
        }
        if (first < 0 && a.size !== b.size) first = common;
        status.set('');
        return { a: a, b: b, diff: diff, first: first, ranges: ranges, extraRanges: extraRanges, common: common, shaA: toHex(ha.digest()), shaB: toHex(hb.digest()) };
      }
      function hx(n) { return '0x' + n.toString(16).toUpperCase(); }
      function draw() {
        var same = res.diff === 0 && res.a.size === res.b.size;
        var sizeDiff = res.b.size - res.a.size;
        var rangesRows = res.ranges.slice(0, 500).map(function (r, i) {
          return [String(i + 1), hx(r.start) + ' (' + r.start.toLocaleString('en-GB') + ')', hx(r.end), plural(r.end - r.start + 1, 'byte'),
            U.button('Show', function () { showHex(r.start, r.end); }, 'ghost')];
        });
        out.replaceChildren(
          el('div', { class: 'g-verdict ' + (same ? 'ok' : 'err'), dataset: { k: 'verdict' }, text: same ? '✓ The files are identical' : '✗ The files are different' }),
          U.stats([
            { label: 'size of A', value: U.bytes(res.a.size) }, { label: 'size of B', value: U.bytes(res.b.size) },
            { label: 'difference', value: (sizeDiff > 0 ? '+' : '') + sizeDiff.toLocaleString('en-GB') + ' bytes' },
            { label: 'differing bytes', value: res.diff.toLocaleString('en-GB') }]),
          el('dl', { class: 'stack', style: { margin: 0, gap: '4px' } },
            kv('First difference', res.first < 0 ? 'none' : hx(res.first) + ' (byte ' + res.first.toLocaleString('en-GB') + ')', 'first'),
            kv('Differing bytes', res.diff.toLocaleString('en-GB') + (res.a.size !== res.b.size ? ' in the first ' + res.common.toLocaleString('en-GB') + ' bytes, plus ' + Math.abs(sizeDiff).toLocaleString('en-GB') + ' more in ' + (sizeDiff > 0 ? 'B' : 'A') : ''), 'count'),
            kv('Changed ranges', String(res.ranges.length + res.extraRanges), 'ranges'),
            kv('SHA-256 of A', res.shaA, 'sha-a'), kv('SHA-256 of B', res.shaB, 'sha-b')),
          res.ranges.length ? el('div', { class: 'scroll' }, U.table(['#', 'From', 'To', 'Length', ''], rangesRows)) : null,
          res.ranges.length > 500 ? U.note('Showing the first 500 ranges.') : null);
        if (res.first >= 0) showHex(res.first, res.ranges.length ? res.ranges[0].end : res.first);
      }
      function kv(label, value, k) { return el('div', {}, el('b', { text: label + ': ' }), el('code', { class: 'h', dataset: { k: k }, text: value })); }

      async function showHex(start, end) {
        var from = Math.max(0, (start - 32) & ~15), to = Math.min(Math.max(res.a.size, res.b.size), ((end + 48) & ~15));
        if (to - from > 16 * 48) to = from + 16 * 48;
        var A = new Uint8Array(await res.a.slice(from, to).arrayBuffer()), B = new Uint8Array(await res.b.slice(from, to).arrayBuffer());
        var pre = el('div', { class: 'g-hex', dataset: { k: 'hex' } }), marked = 0;
        var width = Math.max(8, Math.max(res.a.size, res.b.size).toString(16).length);
        for (var o = from; o < to; o += 16) {
          var line = el('div', {}, el('span', { class: 'off', text: o.toString(16).padStart(width, '0') + '  ' }));
          [A, B].forEach(function (X, side) {
            var Y = side ? A : B, hexPart = el('span'), ascPart = el('span');
            for (var i = 0; i < 16; i++) {
              var idx = o - from + i;
              if (idx >= X.length) { hexPart.appendChild(document.createTextNode('   ')); ascPart.appendChild(document.createTextNode(' ')); continue; }
              var v = X[idx], d = idx >= Y.length || Y[idx] !== v;
              var hexText = (v < 16 ? '0' : '') + v.toString(16), ch = v >= 32 && v < 127 ? String.fromCharCode(v) : '·';
              if (d) { hexPart.appendChild(el('span', { class: 'd', text: hexText })); ascPart.appendChild(el('span', { class: 'd', text: ch })); if (!side) marked++; }
              else { hexPart.appendChild(document.createTextNode(hexText)); ascPart.appendChild(document.createTextNode(ch)); }
              hexPart.appendChild(document.createTextNode(' '));
            }
            line.append(hexPart, ascPart, el('span', { class: 'gap', text: side ? '' : '│' }));
          });
          pre.appendChild(line);
        }
        var idx = res.ranges.findIndex(function (r) { return r.start === start; });
        hexBox.replaceChildren(U.panel('Bytes ' + hx(from) + ' to ' + hx(Math.max(from, to - 1)) + ' (A on the left, B on the right)',
          el('div', { class: 'g-bar' },
            U.button('◀ Previous difference', function () { var r = res.ranges[idx - 1]; if (r) showHex(r.start, r.end); }, 'ghost'),
            U.button('Next difference ▶', function () { var r = res.ranges[idx + 1]; if (r) showHex(r.start, r.end); }, 'ghost'),
            el('span', { class: 'note', dataset: { k: 'hex-marked' }, text: plural(marked, 'differing byte') + ' shown' })),
          el('div', { class: 'scroll out' }, pre)));
      }
    }
  });

  window.FileKit = { Sha256: Sha256, sha256Blob: sha256Blob, toHex: toHex, parseTar: parseTar, looksLikeTar: looksLikeTar, bunzip2: bunzip2, unxz: unxz };
})();
