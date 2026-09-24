/* QR Code encoder (ISO/IEC 18004 model 2), written from the published
   specification: numeric / alphanumeric / byte segments, Reed-Solomon error
   correction over GF(256), the eight data masks and penalty-based selection. */
(function (global) {
  'use strict';

  var ECL = { L: 0, M: 1, Q: 2, H: 3 };
  var ECL_FORMAT_BITS = { L: 1, M: 0, Q: 3, H: 2 };

  /* Error-correction codewords per block, indexed [ecl][version]. */
  var ECC_PER_BLOCK = {
    L: [null, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    M: [null, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    Q: [null, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    H: [null, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
  };

  /* Number of error-correction blocks, indexed [ecl][version]. */
  var NUM_BLOCKS = {
    L: [null, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    M: [null, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    Q: [null, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    H: [null, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
  };

  var ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

  /* --- GF(256) arithmetic, primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 -- */

  function gfMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xFF;
  }

  function rsDivisor(degree) {
    var result = new Uint8Array(degree);
    result[degree - 1] = 1;
    var root = 1;
    for (var i = 0; i < degree; i++) {
      for (var j = 0; j < degree; j++) {
        result[j] = gfMul(result[j], root);
        if (j + 1 < degree) result[j] ^= result[j + 1];
      }
      root = gfMul(root, 0x02);
    }
    return result;
  }

  function rsRemainder(data, divisor) {
    var result = new Uint8Array(divisor.length);
    for (var d = 0; d < data.length; d++) {
      var factor = data[d] ^ result[0];
      result.copyWithin(0, 1);
      result[result.length - 1] = 0;
      for (var i = 0; i < result.length; i++) result[i] ^= gfMul(divisor[i], factor);
    }
    return result;
  }

  /* --- capacity ---------------------------------------------------------- */

  function rawDataModules(version) {
    var result = (16 * version + 128) * version + 64;
    if (version >= 2) {
      var numAlign = Math.floor(version / 7) + 2;
      result -= (25 * numAlign - 10) * numAlign - 55;
      if (version >= 7) result -= 36;
    }
    return result;
  }

  function dataCodewords(version, ecl) {
    return Math.floor(rawDataModules(version) / 8) - ECC_PER_BLOCK[ecl][version] * NUM_BLOCKS[ecl][version];
  }

  function countBits(mode, version) {
    var table = { numeric: [10, 12, 14], alnum: [9, 11, 13], byte: [8, 16, 16] }[mode];
    return version <= 9 ? table[0] : version <= 26 ? table[1] : table[2];
  }

  /* --- segment building --------------------------------------------------- */

  function chooseMode(text) {
    if (/^[0-9]*$/.test(text)) return 'numeric';
    for (var i = 0; i < text.length; i++) if (ALNUM.indexOf(text[i]) === -1) return 'byte';
    return 'alnum';
  }

  function BitBuffer() { this.bits = []; }
  BitBuffer.prototype.push = function (value, length) {
    for (var i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  };

  function segmentBits(text, mode, version) {
    var buf = new BitBuffer();
    var indicator = { numeric: 1, alnum: 2, byte: 4 }[mode];
    var payload = mode === 'byte' ? new TextEncoder().encode(text) : text;

    buf.push(indicator, 4);
    buf.push(payload.length, countBits(mode, version));

    if (mode === 'numeric') {
      for (var i = 0; i < text.length; i += 3) {
        var chunk = text.substr(i, 3);
        buf.push(parseInt(chunk, 10), chunk.length * 3 + 1);
      }
    } else if (mode === 'alnum') {
      for (i = 0; i + 1 < text.length; i += 2) {
        buf.push(ALNUM.indexOf(text[i]) * 45 + ALNUM.indexOf(text[i + 1]), 11);
      }
      if (i < text.length) buf.push(ALNUM.indexOf(text[i]), 6);
    } else {
      for (i = 0; i < payload.length; i++) buf.push(payload[i], 8);
    }
    return buf.bits;
  }

  function segmentLength(text, mode, version) {
    var count = countBits(mode, version);
    if (mode === 'numeric') {
      var full = Math.floor(text.length / 3), rest = text.length % 3;
      return 4 + count + full * 10 + (rest === 2 ? 7 : rest === 1 ? 4 : 0);
    }
    if (mode === 'alnum') return 4 + count + Math.floor(text.length / 2) * 11 + (text.length % 2) * 6;
    return 4 + count + new TextEncoder().encode(text).length * 8;
  }

  /* --- matrix ------------------------------------------------------------- */

  function Matrix(version) {
    this.version = version;
    this.size = version * 4 + 17;
    this.modules = [];
    this.reserved = [];
    for (var y = 0; y < this.size; y++) {
      this.modules.push(new Uint8Array(this.size));
      this.reserved.push(new Uint8Array(this.size));
    }
  }

  Matrix.prototype.setFunction = function (x, y, dark) {
    this.modules[y][x] = dark ? 1 : 0;
    this.reserved[y][x] = 1;
  };

  /* Alignment centres are 6, then evenly spaced back from size - 7.
     Version 32 is the one case the spacing formula does not describe. */
  function alignmentPositions(version) {
    if (version === 1) return [];
    var count = Math.floor(version / 7) + 2;
    var step = version === 32 ? 26
      : Math.floor((version * 4 + count * 2 + 1) / (count * 2 - 2)) * 2;

    var positions = new Array(count);
    positions[0] = 6;
    for (var i = count - 1, pos = version * 4 + 10; i >= 1; i--, pos -= step) positions[i] = pos;
    return positions;
  }

  function drawFunctionPatterns(m) {
    var size = m.size, i, j;

    for (i = 0; i < size; i++) {
      m.setFunction(6, i, i % 2 === 0);
      m.setFunction(i, 6, i % 2 === 0);
    }

    [[0, 0], [size - 7, 0], [0, size - 7]].forEach(function (p) {
      for (var dy = -1; dy <= 7; dy++) {
        for (var dx = -1; dx <= 7; dx++) {
          var x = p[0] + dx, y = p[1] + dy;
          if (x < 0 || x >= size || y < 0 || y >= size) continue;
          var d = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
          m.setFunction(x, y, d !== 2 && d !== 4);
        }
      }
    });

    var align = alignmentPositions(m.version);
    for (i = 0; i < align.length; i++) {
      for (j = 0; j < align.length; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === align.length - 1) || (i === align.length - 1 && j === 0)) continue;
        for (var ay = -2; ay <= 2; ay++) {
          for (var ax = -2; ax <= 2; ax++) {
            m.setFunction(align[j] + ax, align[i] + ay, Math.max(Math.abs(ax), Math.abs(ay)) !== 1);
          }
        }
      }
    }

    /* Reserve the format-information strips (filled once the mask is known).
       Index 6 is skipped in both directions: those cells belong to the timing
       patterns, which the format strip steps around. */
    for (i = 0; i < 9; i++) {
      if (i === 6) continue;
      m.setFunction(8, i, false);
      m.setFunction(i, 8, false);
    }
    for (i = 0; i < 8; i++) { m.setFunction(size - 1 - i, 8, false); m.setFunction(8, size - 1 - i, false); }

    if (m.version >= 7) {
      var rem = m.version;
      for (i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      var bits = (m.version << 12) | rem;
      for (i = 0; i < 18; i++) {
        var bit = ((bits >>> i) & 1) === 1;
        var a = size - 11 + i % 3, b = Math.floor(i / 3);
        m.setFunction(a, b, bit);
        m.setFunction(b, a, bit);
      }
    }
  }

  function drawFormatBits(m, ecl, mask) {
    var data = (ECL_FORMAT_BITS[ecl] << 3) | mask;
    var rem = data;
    for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    var bits = ((data << 10) | rem) ^ 0x5412;
    var size = m.size;
    var bit = function (n) { return ((bits >>> n) & 1) === 1; };

    for (i = 0; i <= 5; i++) m.setFunction(8, i, bit(i));
    m.setFunction(8, 7, bit(6));
    m.setFunction(8, 8, bit(7));
    m.setFunction(7, 8, bit(8));
    for (i = 9; i < 15; i++) m.setFunction(14 - i, 8, bit(i));

    for (i = 0; i < 8; i++) m.setFunction(size - 1 - i, 8, bit(i));
    for (i = 8; i < 15; i++) m.setFunction(8, size - 15 + i, bit(i));
    m.setFunction(8, size - 8, true);
  }

  function addEccAndInterleave(data, version, ecl) {
    var blockCount = NUM_BLOCKS[ecl][version];
    var eccLen = ECC_PER_BLOCK[ecl][version];
    var rawCodewords = Math.floor(rawDataModules(version) / 8);
    var shortBlocks = blockCount - rawCodewords % blockCount;
    var shortLen = Math.floor(rawCodewords / blockCount);

    var divisor = rsDivisor(eccLen);
    var blocks = [];
    for (var i = 0, k = 0; i < blockCount; i++) {
      var len = shortLen - eccLen + (i < shortBlocks ? 0 : 1);
      var chunk = data.slice(k, k + len);
      k += len;
      var ecc = rsRemainder(chunk, divisor);
      var block = chunk.slice();
      if (i < shortBlocks) block.push(0);          /* placeholder, skipped below */
      for (var e = 0; e < ecc.length; e++) block.push(ecc[e]);
      blocks.push(block);
    }

    var result = [];
    for (i = 0; i < blocks[0].length; i++) {
      for (var b = 0; b < blocks.length; b++) {
        if (i !== shortLen - eccLen || b >= shortBlocks) result.push(blocks[b][i]);
      }
    }
    return result;
  }

  function drawCodewords(m, codewords) {
    var size = m.size, i = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var j = 0; j < 2; j++) {
          var x = right - j;
          var upward = ((right + 1) & 2) === 0;
          var y = upward ? size - 1 - vert : vert;
          if (!m.reserved[y][x] && i < codewords.length * 8) {
            m.modules[y][x] = (codewords[i >>> 3] >>> (7 - (i & 7))) & 1;
            i++;
          }
        }
      }
    }
  }

  var MASKS = [
    function (x, y) { return (x + y) % 2 === 0; },
    function (x, y) { return y % 2 === 0; },
    function (x) { return x % 3 === 0; },
    function (x, y) { return (x + y) % 3 === 0; },
    function (x, y) { return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; },
    function (x, y) { return x * y % 2 + x * y % 3 === 0; },
    function (x, y) { return (x * y % 2 + x * y % 3) % 2 === 0; },
    function (x, y) { return ((x + y) % 2 + x * y % 3) % 2 === 0; }
  ];

  function applyMask(m, mask) {
    for (var y = 0; y < m.size; y++) {
      for (var x = 0; x < m.size; x++) {
        if (!m.reserved[y][x] && MASKS[mask](x, y)) m.modules[y][x] ^= 1;
      }
    }
  }

  /* Rules 1, 2 and 4. Rule 3 is handled by penaltyFinders below. */
  function penalty(m) {
    var size = m.size, score = 0, x, y;

    for (y = 0; y < size; y++) {
      for (var dir = 0; dir < 2; dir++) {
        var run = 0, colour = -1;
        for (x = 0; x < size; x++) {
          var v = dir === 0 ? m.modules[y][x] : m.modules[x][y];
          if (v === colour) {
            run++;
            if (run === 5) score += 3;
            else if (run > 5) score += 1;
          } else {
            colour = v;
            run = 1;
          }
        }
      }
    }

    for (y = 0; y < size - 1; y++) {
      for (x = 0; x < size - 1; x++) {
        var a = m.modules[y][x];
        if (a === m.modules[y][x + 1] && a === m.modules[y + 1][x] && a === m.modules[y + 1][x + 1]) score += 3;
      }
    }

    var dark = 0;
    for (y = 0; y < size; y++) for (x = 0; x < size; x++) dark += m.modules[y][x];
    var total = size * size;
    score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;

    return score;
  }

  /* Rule 3: finder-pattern lookalikes, scanned along every row and column. */
  function penaltyFinders(m) {
    var size = m.size, score = 0;
    var pattern = [1, 0, 1, 1, 1, 0, 1];

    function scan(get) {
      for (var i = 0; i + 7 <= size; i++) {
        var match = true;
        for (var j = 0; j < 7; j++) if (get(i + j) !== pattern[j]) { match = false; break; }
        if (!match) continue;
        var before = true, after = true;
        for (j = 1; j <= 4; j++) {
          if (i - j >= 0 && get(i - j) !== 0) before = false;
          if (i + 6 + j < size && get(i + 6 + j) !== 0) after = false;
        }
        if (before || after) score += 40;
      }
    }

    for (var y = 0; y < size; y++) {
      scan(function (i) { return m.modules[y][i]; });
      scan(function (i) { return m.modules[i][y]; });
    }
    return score;
  }

  /* --- public ------------------------------------------------------------- */

  function encode(text, options) {
    options = options || {};
    var ecl = options.ecl && ECL.hasOwnProperty(options.ecl) ? options.ecl : 'M';
    var minVersion = options.minVersion || 1;
    var maxVersion = options.maxVersion || 40;
    text = String(text);
    if (!text.length) throw new Error('Nothing to encode');

    var mode = chooseMode(text);
    var version = 0;
    for (var v = minVersion; v <= maxVersion; v++) {
      if (segmentLength(text, mode, v) <= dataCodewords(v, ecl) * 8) { version = v; break; }
    }
    if (!version) throw new Error('Too much data for a QR code at error-correction level ' + ecl);

    var capacity = dataCodewords(version, ecl) * 8;
    var bits = segmentBits(text, mode, version);
    for (var t = 0; t < 4 && bits.length < capacity; t++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    var codewords = [];
    for (var i = 0; i < bits.length; i += 8) {
      var byte = 0;
      for (var b = 0; b < 8; b++) byte = (byte << 1) | bits[i + b];
      codewords.push(byte);
    }
    for (var pad = 0xEC; codewords.length < dataCodewords(version, ecl); pad ^= 0xEC ^ 0x11) codewords.push(pad);

    var interleaved = addEccAndInterleave(codewords, version, ecl);

    var best = null;
    var forced = options.mask === undefined || options.mask === null || options.mask < 0 ? null : options.mask;

    for (var mask = 0; mask < 8; mask++) {
      if (forced !== null && mask !== forced) continue;
      var m = new Matrix(version);
      drawFunctionPatterns(m);
      drawCodewords(m, interleaved);
      drawFormatBits(m, ecl, mask);
      applyMask(m, mask);
      var score = penalty(m) + penaltyFinders(m);
      if (!best || score < best.score) best = { matrix: m, score: score, mask: mask };
    }

    return {
      size: best.matrix.size,
      version: version,
      ecl: ecl,
      mode: mode,
      mask: best.mask,
      modules: best.matrix.modules,
      isDark: function (x, y) { return best.matrix.modules[y][x] === 1; }
    };
  }

  function toCanvas(qr, opts) {
    opts = opts || {};
    var scale = opts.scale || 8;
    var quiet = opts.quiet === undefined ? 4 : opts.quiet;
    var dim = (qr.size + quiet * 2) * scale;

    var canvas = opts.canvas || document.createElement('canvas');
    canvas.width = dim;
    canvas.height = dim;
    var ctx = canvas.getContext('2d');

    ctx.fillStyle = opts.light || '#ffffff';
    ctx.fillRect(0, 0, dim, dim);
    ctx.fillStyle = opts.dark || '#000000';
    for (var y = 0; y < qr.size; y++) {
      for (var x = 0; x < qr.size; x++) {
        if (qr.modules[y][x]) ctx.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale);
      }
    }
    return canvas;
  }

  function toSVG(qr, opts) {
    opts = opts || {};
    var quiet = opts.quiet === undefined ? 4 : opts.quiet;
    var dim = qr.size + quiet * 2;
    var path = [];

    for (var y = 0; y < qr.size; y++) {
      for (var x = 0; x < qr.size; x++) {
        if (qr.modules[y][x]) path.push('M' + (x + quiet) + ' ' + (y + quiet) + 'h1v1h-1z');
      }
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dim + ' ' + dim + '" shape-rendering="crispEdges">\n' +
           '  <rect width="' + dim + '" height="' + dim + '" fill="' + (opts.light || '#ffffff') + '"/>\n' +
           '  <path fill="' + (opts.dark || '#000000') + '" d="' + path.join('') + '"/>\n</svg>';
  }

  global.QR = { encode: encode, toCanvas: toCanvas, toSVG: toSVG, levels: Object.keys(ECL) };
})(window);
