/* Image processing for the Document Scanner tool: page detection, perspective
   correction and the "clean" filters. Pure canvas/typed-array code. */
(function (global) {
  'use strict';

  function canvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }

  /* --- page detection ------------------------------------------------------ */

  function otsu(gray) {
    var hist = new Float64Array(256), n = gray.length;
    for (var i = 0; i < n; i++) hist[gray[i]]++;
    var sum = 0;
    for (var t = 0; t < 256; t++) sum += t * hist[t];
    var sumB = 0, wB = 0, best = 0, thr = 127;
    for (var k = 0; k < 256; k++) {
      wB += hist[k];
      if (!wB) continue;
      var wF = n - wB;
      if (!wF) break;
      sumB += k * hist[k];
      var mB = sumB / wB, mF = (sum - sumB) / wF;
      var between = wB * wF * (mB - mF) * (mB - mF);
      if (between > best) { best = between; thr = k; }
    }
    return thr;
  }

  /* Returns 4 corners [tl, tr, br, bl] in source pixels, or null. */
  function findPage(source) {
    var sw = source.width, sh = source.height;
    var scale = Math.min(1, 320 / Math.max(sw, sh));
    var w = Math.max(8, Math.round(sw * scale)), h = Math.max(8, Math.round(sh * scale));
    var c = canvas(w, h), ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, w, h);
    var px = ctx.getImageData(0, 0, w, h).data;
    var gray = new Uint8Array(w * h);
    for (var i = 0, j = 0; j < gray.length; i += 4, j++) {
      /* paper is bright and unsaturated: penalise saturation a little */
      var r = px[i], g = px[i + 1], b = px[i + 2];
      var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      gray[j] = Math.max(0, Math.round(0.299 * r + 0.587 * g + 0.114 * b - (mx - mn) * 0.5));
    }
    var thr = otsu(gray);
    var mask = new Uint8Array(w * h);
    for (var m = 0; m < mask.length; m++) mask[m] = gray[m] > thr ? 1 : 0;

    /* largest 4-connected bright component */
    var label = new Int32Array(w * h), stack = new Int32Array(w * h);
    var bestLabel = 0, bestSize = 0, next = 1;
    for (var s = 0; s < mask.length; s++) {
      if (!mask[s] || label[s]) continue;
      var size = 0, top = 0;
      stack[top++] = s; label[s] = next;
      while (top) {
        var p = stack[--top]; size++;
        var x = p % w, y = (p / w) | 0;
        if (x > 0 && mask[p - 1] && !label[p - 1]) { label[p - 1] = next; stack[top++] = p - 1; }
        if (x < w - 1 && mask[p + 1] && !label[p + 1]) { label[p + 1] = next; stack[top++] = p + 1; }
        if (y > 0 && mask[p - w] && !label[p - w]) { label[p - w] = next; stack[top++] = p - w; }
        if (y < h - 1 && mask[p + w] && !label[p + w]) { label[p + w] = next; stack[top++] = p + w; }
      }
      if (size > bestSize) { bestSize = size; bestLabel = next; }
      next++;
    }
    if (bestSize < w * h * 0.08) return null;

    var tl = null, tr = null, br = null, bl = null;
    var sTL = Infinity, sTR = -Infinity, sBR = -Infinity, sBL = Infinity;
    for (var q = 0; q < label.length; q++) {
      if (label[q] !== bestLabel) continue;
      var qx = q % w, qy = (q / w) | 0;
      var a = qx + qy, d = qx - qy;
      if (a < sTL) { sTL = a; tl = [qx, qy]; }
      if (a > sBR) { sBR = a; br = [qx + 1, qy + 1]; }
      if (d > sTR) { sTR = d; tr = [qx + 1, qy]; }
      if (d < sBL) { sBL = d; bl = [qx, qy + 1]; }
    }
    var inv = 1 / scale;
    var pts = [tl, tr, br, bl].map(function (pt) {
      return { x: Math.min(sw, Math.max(0, pt[0] * inv)), y: Math.min(sh, Math.max(0, pt[1] * inv)) };
    });
    /* reject degenerate quads */
    if (quadArea(pts) < sw * sh * 0.05) return null;
    /* if the page fills the frame the detection gives nothing useful */
    return pts;
  }

  function quadArea(p) {
    var a = 0;
    for (var i = 0; i < 4; i++) {
      var n = p[(i + 1) % 4];
      a += p[i].x * n.y - n.x * p[i].y;
    }
    return Math.abs(a) / 2;
  }

  function wholePhoto(source) {
    return [{ x: 0, y: 0 }, { x: source.width, y: 0 }, { x: source.width, y: source.height }, { x: 0, y: source.height }];
  }

  /* --- perspective warp ------------------------------------------------------ */

  function solve(A, b) {
    var n = b.length;
    for (var c = 0; c < n; c++) {
      var piv = c;
      for (var r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      var tmp = A[c]; A[c] = A[piv]; A[piv] = tmp;
      var tb = b[c]; b[c] = b[piv]; b[piv] = tb;
      if (Math.abs(A[c][c]) < 1e-12) return null;
      for (var r2 = c + 1; r2 < n; r2++) {
        var f = A[r2][c] / A[c][c];
        for (var k = c; k < n; k++) A[r2][k] -= f * A[c][k];
        b[r2] -= f * b[c];
      }
    }
    var x = new Array(n);
    for (var i = n - 1; i >= 0; i--) {
      var s = b[i];
      for (var j = i + 1; j < n; j++) s -= A[i][j] * x[j];
      x[i] = s / A[i][i];
    }
    return x;
  }

  /* Homography mapping destination (u,v) to source (x,y). */
  function homography(dst, src) {
    var A = [], b = [];
    for (var i = 0; i < 4; i++) {
      var u = dst[i].x, v = dst[i].y, x = src[i].x, y = src[i].y;
      A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x);
      A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y);
    }
    var h = solve(A, b);
    return h ? h.concat([1]) : null;
  }

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  /* Straighten the quad into a rectangle no larger than maxDim on its long side. */
  function warp(source, corners, maxDim) {
    var wTop = dist(corners[0], corners[1]), wBot = dist(corners[3], corners[2]);
    var hL = dist(corners[0], corners[3]), hR = dist(corners[1], corners[2]);
    var W = Math.max(wTop, wBot), H = Math.max(hL, hR);
    if (W < 4 || H < 4) throw new Error('The selected area is too small.');
    var k = Math.min(1, maxDim / Math.max(W, H));
    W = Math.max(1, Math.round(W * k)); H = Math.max(1, Math.round(H * k));

    var sc = canvas(source.width, source.height);
    var sctx = sc.getContext('2d', { willReadFrequently: true });
    sctx.drawImage(source, 0, 0);
    var sw = sc.width, sh = sc.height;
    var src = sctx.getImageData(0, 0, sw, sh).data;

    var H8 = homography([{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }], corners);
    if (!H8) throw new Error('Those corners do not form a page shape.');
    var out = canvas(W, H), octx = out.getContext('2d');
    var img = octx.createImageData(W, H), d = img.data;
    for (var v = 0; v < H; v++) {
      for (var u = 0; u < W; u++) {
        var uu = u + 0.5, vv = v + 0.5;
        var den = H8[6] * uu + H8[7] * vv + 1;
        var x = (H8[0] * uu + H8[1] * vv + H8[2]) / den - 0.5;
        var y = (H8[3] * uu + H8[4] * vv + H8[5]) / den - 0.5;
        var o = (v * W + u) * 4;
        if (x < 0) x = 0; if (y < 0) y = 0;
        if (x > sw - 1) x = sw - 1; if (y > sh - 1) y = sh - 1;
        var x0 = x | 0, y0 = y | 0, x1 = Math.min(sw - 1, x0 + 1), y1 = Math.min(sh - 1, y0 + 1);
        var fx = x - x0, fy = y - y0;
        var i00 = (y0 * sw + x0) * 4, i10 = (y0 * sw + x1) * 4, i01 = (y1 * sw + x0) * 4, i11 = (y1 * sw + x1) * 4;
        for (var ch = 0; ch < 3; ch++) {
          var top = src[i00 + ch] + (src[i10 + ch] - src[i00 + ch]) * fx;
          var bot = src[i01 + ch] + (src[i11 + ch] - src[i01 + ch]) * fx;
          d[o + ch] = top + (bot - top) * fy;
        }
        d[o + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    return out;
  }

  /* --- filters --------------------------------------------------------------- */

  /* Estimate the paper's lighting: shrink, take a local maximum (removes ink),
     blur, and scale back up. */
  function background(src) {
    var w = src.width, h = src.height;
    var sw = Math.max(4, Math.round(w / 12)), sh = Math.max(4, Math.round(h / 12));
    var small = canvas(sw, sh), sctx = small.getContext('2d', { willReadFrequently: true });
    sctx.imageSmoothingEnabled = true;
    sctx.drawImage(src, 0, 0, sw, sh);
    var data = sctx.getImageData(0, 0, sw, sh);
    var a = data.data, copy = new Uint8ClampedArray(a);
    var R = 2;
    for (var y = 0; y < sh; y++) {
      for (var x = 0; x < sw; x++) {
        var mr = 0, mg = 0, mb = 0;
        for (var dy = -R; dy <= R; dy++) {
          var yy = Math.min(sh - 1, Math.max(0, y + dy));
          for (var dx = -R; dx <= R; dx++) {
            var xx = Math.min(sw - 1, Math.max(0, x + dx)), i = (yy * sw + xx) * 4;
            if (copy[i] > mr) mr = copy[i];
            if (copy[i + 1] > mg) mg = copy[i + 1];
            if (copy[i + 2] > mb) mb = copy[i + 2];
          }
        }
        var o = (y * sw + x) * 4;
        a[o] = mr; a[o + 1] = mg; a[o + 2] = mb;
      }
    }
    sctx.putImageData(data, 0, 0);
    var big = canvas(w, h), bctx = big.getContext('2d', { willReadFrequently: true });
    bctx.imageSmoothingEnabled = true;
    bctx.filter = 'blur(' + Math.max(2, Math.round(Math.min(w, h) / 60)) + 'px)';
    bctx.drawImage(small, 0, 0, w, h);
    bctx.filter = 'none';
    return bctx.getImageData(0, 0, w, h).data;
  }

  function applyFilter(src, filter) {
    if (filter === 'original') return src;
    var w = src.width, h = src.height;
    var out = canvas(w, h), ctx = out.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(src, 0, 0);
    var img = ctx.getImageData(0, 0, w, h), d = img.data;
    var bg = background(src);
    var i, v, r, g, b;
    if (filter === 'color') {
      for (i = 0; i < d.length; i += 4) {
        for (var c = 0; c < 3; c++) {
          v = d[i + c] / Math.max(40, bg[i + c]) * 255;
          v = (v - 35) * 255 / 205;
          d[i + c] = v;
        }
      }
    } else {
      var gray = new Uint8ClampedArray(w * h);
      for (i = 0; i < d.length; i += 4) {
        r = d[i] / Math.max(40, bg[i]); g = d[i + 1] / Math.max(40, bg[i + 1]); b = d[i + 2] / Math.max(40, bg[i + 2]);
        gray[i >> 2] = (0.299 * r + 0.587 * g + 0.114 * b) * 255;
      }
      for (i = 0; i < d.length; i += 4) {
        v = gray[i >> 2];
        if (filter === 'bw') v = v > 170 ? 255 : 0;
        else v = (v - 40) * 255 / 200;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
    }
    ctx.putImageData(img, 0, 0);
    return out;
  }

  function rotate(src, quarterTurns) {
    var q = ((quarterTurns % 4) + 4) % 4;
    if (!q) return src;
    var w = src.width, h = src.height;
    var out = canvas(q % 2 ? h : w, q % 2 ? w : h), ctx = out.getContext('2d');
    ctx.translate(out.width / 2, out.height / 2);
    ctx.rotate(q * Math.PI / 2);
    ctx.drawImage(src, -w / 2, -h / 2);
    return out;
  }

  function process(source, corners, filter, quarterTurns, maxDim) {
    return rotate(applyFilter(warp(source, corners, maxDim), filter), quarterTurns);
  }

  global.ScanLib = {
    findPage: findPage, wholePhoto: wholePhoto, warp: warp,
    applyFilter: applyFilter, rotate: rotate, process: process, homography: homography
  };
})(window);
