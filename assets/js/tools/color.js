/* Colour tools: conversion (HEX, RGB, HSL, HWB, CIE Lab/LCH, OKLab/OKLCH),
   picking, mixing, naming, harmonies, contrast, colour-blindness simulation
   and a live camera colour picker. Everything is computed locally; the
   precise colour-space maths is exported as window.ColourKit for color-b. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  /* --- styles ----------------------------------------------------------- */

  if (!document.getElementById('g-color-style')) document.head.appendChild(el('style', { id: 'g-color-style', text: [
    '.g-color .sw-row{display:flex;flex-wrap:wrap;gap:8px}',
    '.g-color .sw{display:flex;flex-direction:column;align-items:stretch;gap:4px;border:1px solid var(--border);border-radius:var(--radius);padding:6px;background:var(--bg-elev);cursor:pointer;min-width:84px;font:inherit;color:var(--fg);text-align:left}',
    '.g-color .sw i{display:block;height:44px;border-radius:6px;border:1px solid var(--border)}',
    '.g-color .sw code{font-family:var(--mono);font-size:12px}',
    '.g-color .sw small{color:var(--fg-muted);font-size:11px}',
    '.g-color .big{height:120px;border-radius:var(--radius);border:1px solid var(--border)}',
    '.g-color .kv{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}',
    '.g-color .kv button{display:flex;justify-content:space-between;gap:8px;align-items:center;border:1px solid var(--border);background:var(--bg-sunken);border-radius:var(--radius);padding:8px 10px;cursor:pointer;color:var(--fg);font:inherit}',
    '.g-color .kv b{font-size:12px;color:var(--fg-muted);font-weight:600}',
    '.g-color .kv code{font-family:var(--mono)}',
    '.g-color .pick{display:flex;gap:10px;align-items:center;flex-wrap:wrap}',
    '.g-color .pick input[type=color]{width:56px;height:40px;padding:0;border:1px solid var(--border);border-radius:8px;background:none;cursor:pointer}',
    '.g-color .pick input[type=text]{max-width:160px;font-family:var(--mono)}',
    '.g-color .ratio{font-size:40px;font-weight:800}',
    '.g-color .pass{color:var(--ok);font-weight:700}',
    '.g-color .fail{color:var(--err);font-weight:700}',
    '.g-color .grid4{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}',
    '.g-color .grid4 > div{border:1px solid var(--border);border-radius:var(--radius);padding:10px}',
    '.g-color .names{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}',
    '.g-color .names button{display:flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:var(--radius);padding:6px;background:var(--bg-elev);cursor:pointer;color:var(--fg);font:inherit;text-align:left}',
    '.g-color .names i{width:34px;height:34px;border-radius:6px;border:1px solid var(--border);flex:none}',
    '.g-color .names span{display:flex;flex-direction:column;font-size:12px}',
    '.g-color .names code{font-family:var(--mono);color:var(--fg-muted)}',
    '.g-color canvas{max-width:100%;border-radius:var(--radius);border:1px solid var(--border)}',
    '.g-color .pick input.wide{max-width:none;flex:1 1 220px}',
    '.g-color .gamut{margin-top:8px}',
    '.g-color .chanrow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px}',
    '.g-color .pick + .big{margin-top:10px}',
    '.g-color .chanrow input[type=number]{font-family:var(--mono)}',
    '.g-color .sv{position:relative;height:190px;border-radius:var(--radius);border:1px solid var(--border);cursor:crosshair;touch-action:none;user-select:none}',
    '.g-color .sv i{position:absolute;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #000,inset 0 0 0 1px #000;pointer-events:none}',
    '.g-color input.hue{-webkit-appearance:none;appearance:none;height:14px;border-radius:7px;margin:10px 0 4px;background:linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)}',
    '.g-color input.hue::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#fff;border:2px solid #333;cursor:pointer}',
    '.g-color input.hue::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid #333;cursor:pointer}',
    '.g-color .wheel{position:relative;width:170px;height:170px;border-radius:50%;flex:none;background:conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)}',
    '.g-color .wheel::after{content:"";position:absolute;inset:34px;border-radius:50%;background:var(--bg-elev)}',
    '.g-color .wheel b{position:absolute;z-index:1;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #0008}',
    '.g-color .wheelrow{display:flex;gap:16px;align-items:center;flex-wrap:wrap}',
    '.g-color .wheelrow .sw-row{flex:1 1 260px}',
    '.g-color .cam{position:relative;display:inline-block;max-width:100%}',
    '.g-color .cam video{max-width:100%;display:block;border-radius:var(--radius);background:#000;cursor:crosshair}',
    '.g-color .cam .ring{position:absolute;border:3px solid #fff;box-shadow:0 0 0 2px #000;border-radius:50%;pointer-events:none;transform:translate(-50%,-50%)}',
    '.g-color .sample{padding:14px;border-radius:var(--radius);border:1px solid var(--border)}',
    '.g-color .lum{display:flex;gap:8px;flex-wrap:wrap}',
    '.g-color .lum div{flex:1;min-width:180px;padding:14px;border-radius:var(--radius);font-weight:600}',
    '.g-color .chan{display:grid;grid-template-columns:90px 1fr 80px;gap:10px;align-items:center;margin-bottom:6px}',
    '.g-color .badge{font-size:11px;padding:2px 6px;border-radius:10px;background:var(--accent);color:#fff;margin-left:6px}'
  ].join('\n') }));

  /* --- colour maths ----------------------------------------------------- */

  var CSS_NAMES = {
    aliceblue: '#F0F8FF', antiquewhite: '#FAEBD7', aqua: '#00FFFF', aquamarine: '#7FFFD4', azure: '#F0FFFF',
    beige: '#F5F5DC', bisque: '#FFE4C4', black: '#000000', blanchedalmond: '#FFEBCD', blue: '#0000FF',
    blueviolet: '#8A2BE2', brown: '#A52A2A', burlywood: '#DEB887', cadetblue: '#5F9EA0', chartreuse: '#7FFF00',
    chocolate: '#D2691E', coral: '#FF7F50', cornflowerblue: '#6495ED', cornsilk: '#FFF8DC', crimson: '#DC143C',
    cyan: '#00FFFF', darkblue: '#00008B', darkcyan: '#008B8B', darkgoldenrod: '#B8860B', darkgray: '#A9A9A9',
    darkgreen: '#006400', darkkhaki: '#BDB76B', darkmagenta: '#8B008B', darkolivegreen: '#556B2F', darkorange: '#FF8C00',
    darkorchid: '#9932CC', darkred: '#8B0000', darksalmon: '#E9967A', darkseagreen: '#8FBC8F', darkslateblue: '#483D8B',
    darkslategray: '#2F4F4F', darkturquoise: '#00CED1', darkviolet: '#9400D3', deeppink: '#FF1493', deepskyblue: '#00BFFF',
    dimgray: '#696969', dodgerblue: '#1E90FF', firebrick: '#B22222', floralwhite: '#FFFAF0', forestgreen: '#228B22',
    fuchsia: '#FF00FF', gainsboro: '#DCDCDC', ghostwhite: '#F8F8FF', gold: '#FFD700', goldenrod: '#DAA520',
    gray: '#808080', green: '#008000', greenyellow: '#ADFF2F', honeydew: '#F0FFF0', hotpink: '#FF69B4',
    indianred: '#CD5C5C', indigo: '#4B0082', ivory: '#FFFFF0', khaki: '#F0E68C', lavender: '#E6E6FA',
    lavenderblush: '#FFF0F5', lawngreen: '#7CFC00', lemonchiffon: '#FFFACD', lightblue: '#ADD8E6', lightcoral: '#F08080',
    lightcyan: '#E0FFFF', lightgoldenrodyellow: '#FAFAD2', lightgray: '#D3D3D3', lightgreen: '#90EE90', lightpink: '#FFB6C1',
    lightsalmon: '#FFA07A', lightseagreen: '#20B2AA', lightskyblue: '#87CEFA', lightslategray: '#778899', lightsteelblue: '#B0C4DE',
    lightyellow: '#FFFFE0', lime: '#00FF00', limegreen: '#32CD32', linen: '#FAF0E6', magenta: '#FF00FF',
    maroon: '#800000', mediumaquamarine: '#66CDAA', mediumblue: '#0000CD', mediumorchid: '#BA55D3', mediumpurple: '#9370DB',
    mediumseagreen: '#3CB371', mediumslateblue: '#7B68EE', mediumspringgreen: '#00FA9A', mediumturquoise: '#48D1CC', mediumvioletred: '#C71585',
    midnightblue: '#191970', mintcream: '#F5FFFA', mistyrose: '#FFE4E1', moccasin: '#FFE4B5', navajowhite: '#FFDEAD',
    navy: '#000080', oldlace: '#FDF5E6', olive: '#808000', olivedrab: '#6B8E23', orange: '#FFA500',
    orangered: '#FF4500', orchid: '#DA70D6', palegoldenrod: '#EEE8AA', palegreen: '#98FB98', paleturquoise: '#AFEEEE',
    palevioletred: '#DB7093', papayawhip: '#FFEFD5', peachpuff: '#FFDAB9', peru: '#CD853F', pink: '#FFC0CB',
    plum: '#DDA0DD', powderblue: '#B0E0E6', purple: '#800080', red: '#FF0000', rosybrown: '#BC8F8F',
    royalblue: '#4169E1', saddlebrown: '#8B4513', salmon: '#FA8072', sandybrown: '#F4A460', seagreen: '#2E8B57',
    seashell: '#FFF5EE', sienna: '#A0522D', silver: '#C0C0C0', skyblue: '#87CEEB', slateblue: '#6A5ACD',
    slategray: '#708090', snow: '#FFFAFA', springgreen: '#00FF7F', steelblue: '#4682B4', tan: '#D2B48C',
    teal: '#008080', thistle: '#D8BFD8', tomato: '#FF6347', turquoise: '#40E0D0', violet: '#EE82EE',
    wheat: '#F5DEB3', white: '#FFFFFF', whitesmoke: '#F5F5F5', yellow: '#FFFF00', yellowgreen: '#9ACD32'
  };
  /* Alternate spellings the parser understands but the lists don't repeat. */
  var ALIASES = { grey: 'gray', darkgrey: 'darkgray', dimgrey: 'dimgray', lightgrey: 'lightgray',
    slategrey: 'slategray', darkslategrey: 'darkslategray', lightslategrey: 'lightslategray' };

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function byte(n) { return clamp(Math.round(n), 0, 255); }

  /* --- precise colour spaces -------------------------------------------- */
  /* Follows the sample code in CSS Color Module Level 4 (W3C): the rational
     sRGB matrices, the recalculated OKLab matrices, Bradford D65/D50
     adaptation for CIE Lab (CSS lab() and lch() are D50), the extended sRGB
     transfer curve, HWB, deltaE 2000 and the binary-search gamut mapping of
     section 13.2. A colour here is [r, g, b] in sRGB with 0..1 components;
     anything outside that range is outside the sRGB gamut. */

  var WHITE_D50 = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585];
  var WHITE_D65 = [0.3127 / 0.3290, 1, (1 - 0.3127 - 0.3290) / 0.3290];
  var M_SRGB_XYZ = [[506752 / 1228815, 87881 / 245763, 12673 / 70218], [87098 / 409605, 175762 / 245763, 12673 / 175545],
    [7918 / 409605, 87881 / 737289, 1001167 / 1053270]];
  var M_XYZ_SRGB = [[12831 / 3959, -329 / 214, -1974 / 3959], [-851781 / 878810, 1648619 / 878810, 36519 / 878810],
    [705 / 12673, -2585 / 12673, 705 / 667]];
  var M_XYZ_LMS = [[0.8190224379967030, 0.3619062600528904, -0.1288737815209879], [0.0329836539323885, 0.9292868615863434, 0.0361446663506424],
    [0.0481771893596242, 0.2642395317527308, 0.6335478284694309]];
  var M_LMS_OKLAB = [[0.2104542683093140, 0.7936177747023054, -0.0040720430116193], [1.9779985324311684, -2.4285922420485799, 0.4505937096174110],
    [0.0259040424655478, 0.7827717124575296, -0.8086757549230774]];
  var M_OKLAB_LMS = [[1, 0.3963377773761749, 0.2158037573099136], [1, -0.1055613458156586, -0.0638541728258133],
    [1, -0.0894841775298119, -1.2914855480194092]];
  var M_LMS_XYZ = [[1.2268798758459243, -0.5578149944602171, 0.2813910456659647], [-0.0405757452148008, 1.1122868032803170, -0.0717110580655164],
    [-0.0763729366746601, -0.4214933324022432, 1.5869240198367816]];
  var M_D65_D50 = [[1.0479297925449969, 0.022946870601609652, -0.05019226628920524], [0.02962780877005599, 0.9904344267538799, -0.017073799063418826],
    [-0.009243040646204504, 0.015055191490298152, 0.7518742814281371]];
  var M_D50_D65 = [[0.955473421488075, -0.02309845494876471, 0.06325924320057072], [-0.0283697093338637, 1.0099953980813041, 0.021041441191917323],
    [0.012314014864481998, -0.020507649298898964, 1.330365926242124]];

  function mmul(M, v) {
    return [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
      M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]];
  }
  /* The extended transfer curve mirrors negative values, so out-of-gamut
     colours survive a round trip. */
  function linCh(v) { var a = Math.abs(v); return a <= 0.04045 ? v / 12.92 : (v < 0 ? -1 : 1) * Math.pow((a + 0.055) / 1.055, 2.4); }
  function gamCh(v) { var a = Math.abs(v); return a > 0.0031308 ? (v < 0 ? -1 : 1) * (1.055 * Math.pow(a, 1 / 2.4) - 0.055) : 12.92 * v; }
  function linear(rgb) { return rgb.map(linCh); }
  function unlinear(rgb) { return rgb.map(gamCh); }
  function srgbToXyz(rgb) { return mmul(M_SRGB_XYZ, linear(rgb)); }
  function xyzToSrgb(xyz) { return unlinear(mmul(M_XYZ_SRGB, xyz)); }
  function xyzToOklab(xyz) { return mmul(M_LMS_OKLAB, mmul(M_XYZ_LMS, xyz).map(Math.cbrt)); }
  function oklabToXyz(lab) { return mmul(M_LMS_XYZ, mmul(M_OKLAB_LMS, lab).map(function (c) { return c * c * c; })); }
  function xyzToLab(xyz, white) {
    var e = 216 / 24389, k = 24389 / 27;
    var f = xyz.map(function (v, i) { v /= white[i]; return v > e ? Math.cbrt(v) : (k * v + 16) / 116; });
    return [116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])];
  }
  function labToXyz(lab, white) {
    var e = 216 / 24389, k = 24389 / 27;
    var f1 = (lab[0] + 16) / 116, f0 = lab[1] / 500 + f1, f2 = f1 - lab[2] / 200;
    return [Math.pow(f0, 3) > e ? Math.pow(f0, 3) : (116 * f0 - 16) / k,
      lab[0] > k * e ? Math.pow(f1, 3) : lab[0] / k,
      Math.pow(f2, 3) > e ? Math.pow(f2, 3) : (116 * f2 - 16) / k].map(function (v, i) { return v * white[i]; });
  }
  /* Rectangular <-> polar. A hue is NaN ("none") when chroma is negligible. */
  function polar(lab, eps) {
    var c = Math.sqrt(lab[1] * lab[1] + lab[2] * lab[2]), h = Math.atan2(lab[2], lab[1]) * 180 / Math.PI;
    if (h < 0) h += 360;
    return [lab[0], c, c <= eps ? NaN : h];
  }
  function rect(lch) {
    var h = (isNaN(lch[2]) ? 0 : lch[2]) * Math.PI / 180;
    return [lch[0], lch[1] * Math.cos(h), lch[1] * Math.sin(h)];
  }

  function toOklab(rgb) { return xyzToOklab(srgbToXyz(rgb)); }
  function fromOklab(lab) { return xyzToSrgb(oklabToXyz(lab)); }
  function toOklch(rgb) { return polar(toOklab(rgb), 0.000004); }
  function fromOklch(lch) { return fromOklab(rect(lch)); }
  function toLab(rgb) { return xyzToLab(mmul(M_D65_D50, srgbToXyz(rgb)), WHITE_D50); }
  function fromLab(lab) { return xyzToSrgb(mmul(M_D50_D65, labToXyz(lab, WHITE_D50))); }
  function toLch(rgb) { return polar(toLab(rgb), 0.0015); }
  function fromLch(lch) { return fromLab(rect(lch)); }
  function toLab65(rgb) { return xyzToLab(srgbToXyz(rgb), WHITE_D65); }
  function fromLab65(lab) { return xyzToSrgb(labToXyz(lab, WHITE_D65)); }

  /* Float HSL -> sRGB (the spec's hslToRgb); s and l in 0..100. */
  function fromHsl(h, s, l) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
    function f(n) { var k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }
    return [f(0), f(8), f(4)];
  }
  function toHsl(rgb) { var c = rgbToHsl({ r: rgb[0] * 255, g: rgb[1] * 255, b: rgb[2] * 255 }); return [c.h, c.s, c.l]; }
  function fromHwb(h, w, b) {
    w = clamp(w, 0, 100) / 100; b = clamp(b, 0, 100) / 100;
    if (w + b >= 1) { var grey = w / (w + b); return [grey, grey, grey]; }
    return fromHsl(h, 100, 50).map(function (v) { return v * (1 - w - b) + w; });
  }
  function toHwb(rgb) {
    var max = Math.max(rgb[0], rgb[1], rgb[2]), min = Math.min(rgb[0], rgb[1], rgb[2]);
    var h = max - min ? toHsl(rgb)[0] : NaN;
    if (min + (1 - max) >= 1 - 1e-5) h = NaN;
    return [h, min * 100, (1 - max) * 100];
  }

  function inGamut(rgb) { return rgb.every(function (v) { return v >= -1e-5 && v <= 1 + 1e-5; }); }
  function clip(rgb) { return rgb.map(function (v) { return clamp(v, 0, 1); }); }
  function deltaEOK(a, b) { return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2)); }

  /* CSS Color 4 gamut mapping: lower OKLCH chroma until the clipped colour
     is within one JND (0.02) of the reduced one. Keeps lightness and hue. */
  function gamutMap(rgb) {
    if (inGamut(rgb)) return clip(rgb);
    var lch = toOklch(rgb);
    if (lch[0] >= 1) return [1, 1, 1];
    if (lch[0] <= 0) return [0, 0, 0];
    var JND = 0.02, EPS = 0.0001, hue = isNaN(lch[2]) ? 0 : lch[2];
    var clipped = clip(fromOklch(lch));
    if (deltaEOK(toOklab(clipped), rect(lch)) < JND) return clipped;
    var min = 0, max = lch[1], minInGamut = true;
    while (max - min > EPS) {
      var chroma = (min + max) / 2, current = [lch[0], chroma, hue], rgbNow = fromOklch(current);
      if (minInGamut && inGamut(rgbNow)) { min = chroma; continue; }
      clipped = clip(rgbNow);
      var E = deltaEOK(toOklab(clipped), rect(current));
      if (E < JND) {
        if (JND - E < EPS) return clipped;
        minInGamut = false;
        min = chroma;
      } else max = chroma;
    }
    return clipped;
  }

  /* CIEDE2000 with kL = kC = kH = 1, as in the CSS Color 4 sample code. */
  function deltaE2000(lab1, lab2) {
    var L1 = lab1[0], a1 = lab1[1], b1 = lab1[2], L2 = lab2[0], a2 = lab2[1], b2 = lab2[2];
    var d2r = Math.PI / 180, r2d = 180 / Math.PI, G25 = Math.pow(25, 7);
    var Cbar = (Math.sqrt(a1 * a1 + b1 * b1) + Math.sqrt(a2 * a2 + b2 * b2)) / 2, C7 = Math.pow(Cbar, 7);
    var G = 0.5 * (1 - Math.sqrt(C7 / (C7 + G25)));
    var ad1 = (1 + G) * a1, ad2 = (1 + G) * a2;
    var Cd1 = Math.sqrt(ad1 * ad1 + b1 * b1), Cd2 = Math.sqrt(ad2 * ad2 + b2 * b2);
    var h1 = (ad1 === 0 && b1 === 0) ? 0 : Math.atan2(b1, ad1), h2 = (ad2 === 0 && b2 === 0) ? 0 : Math.atan2(b2, ad2);
    if (h1 < 0) h1 += 2 * Math.PI;
    if (h2 < 0) h2 += 2 * Math.PI;
    h1 *= r2d; h2 *= r2d;
    var dL = L2 - L1, dC = Cd2 - Cd1, hdiff = h2 - h1, hsum = h1 + h2, habs = Math.abs(hdiff), dh;
    if (Cd1 * Cd2 === 0) dh = 0;
    else if (habs <= 180) dh = hdiff;
    else if (hdiff > 180) dh = hdiff - 360;
    else dh = hdiff + 360;
    var dH = 2 * Math.sqrt(Cd2 * Cd1) * Math.sin(dh * d2r / 2);
    var Ld = (L1 + L2) / 2, Cd = (Cd1 + Cd2) / 2, Cd7 = Math.pow(Cd, 7), hd;
    if (Cd1 * Cd2 === 0) hd = hsum;
    else if (habs <= 180) hd = hsum / 2;
    else if (hsum < 360) hd = (hsum + 360) / 2;
    else hd = (hsum - 360) / 2;
    var lsq = (Ld - 50) * (Ld - 50);
    var SL = 1 + (0.015 * lsq) / Math.sqrt(20 + lsq), SC = 1 + 0.045 * Cd;
    var T = 1 - 0.17 * Math.cos((hd - 30) * d2r) + 0.24 * Math.cos(2 * hd * d2r) + 0.32 * Math.cos((3 * hd + 6) * d2r) - 0.20 * Math.cos((4 * hd - 63) * d2r);
    var SH = 1 + 0.015 * Cd * T;
    var RT = -Math.sin(2 * 30 * Math.exp(-Math.pow((hd - 275) / 25, 2)) * d2r) * 2 * Math.sqrt(Cd7 / (Cd7 + G25));
    return Math.sqrt(Math.pow(dL / SL, 2) + Math.pow(dC / SC, 2) + Math.pow(dH / SH, 2) + RT * (dC / SC) * (dH / SH));
  }

  /* Parses any CSS colour this toolbox understands into precise sRGB:
     names, #hex, rgb(), hsl(), hwb(), lab(), lch(), oklab() and oklch()
     in legacy (comma) or modern (space, "/ alpha") syntax. Percentages use
     the CSS reference ranges (lab a/b 100% = 125, oklch C 100% = 0.4...). */
  function parseCss(input) {
    var text = String(input || '').trim().toLowerCase();
    if (!text) return null;
    var format = 'name';
    if (ALIASES[text]) text = ALIASES[text];
    if (text === 'transparent') return { rgb: [0, 0, 0], alpha: 0, format: format };
    if (text === 'rebeccapurple') text = '#663399';
    else if (CSS_NAMES[text]) text = CSS_NAMES[text].toLowerCase();
    else format = 'hex';
    var hexm = text.match(/^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
    if (hexm) {
      var h = hexm[1];
      if (h.length <= 4) h = h.split('').map(function (c) { return c + c; }).join('');
      return { rgb: [0, 2, 4].map(function (i) { return parseInt(h.slice(i, i + 2), 16) / 255; }),
        alpha: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1, format: format };
    }
    var fn = text.match(/^([a-z]+)\(\s*([^()]*?)\s*\)$/);
    if (!fn) return null;
    var name = fn[1].replace(/a$/, ''), body = fn[2], alphaText = null;
    if (body.indexOf('/') > -1) { alphaText = body.split('/')[1].trim(); body = body.split('/')[0]; }
    var parts = body.split(/[\s,]+/).filter(Boolean);
    if (parts.length === 4 && alphaText === null) alphaText = parts.pop();
    if (parts.length !== 3) return null;
    function comp(s, pctScale, isHue) {
      if (s === 'none') return 0;
      var m = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(%|deg|rad|grad|turn)?$/);
      if (!m) return NaN;
      var v = parseFloat(m[1]), unit = m[2];
      if (unit === '%') return isHue ? NaN : v / 100 * pctScale;
      if (unit && !isHue) return NaN;
      if (unit === 'rad') return v * 180 / Math.PI;
      if (unit === 'grad') return v * 0.9;
      if (unit === 'turn') return v * 360;
      return v;
    }
    var p, rgb;
    switch (name) {
      case 'rgb':
        p = parts.map(function (s) { return /%$/.test(s) ? comp(s, 1) : comp(s, 255) / 255; });
        rgb = p; break;
      case 'hsl':
        p = [comp(parts[0], 1, true), comp(parts[1], 100), comp(parts[2], 100)];
        rgb = fromHsl(p[0], p[1], p[2]); break;
      case 'hwb':
        p = [comp(parts[0], 1, true), comp(parts[1], 100), comp(parts[2], 100)];
        rgb = fromHwb(p[0], p[1], p[2]); break;
      case 'lab':
        p = [comp(parts[0], 100), comp(parts[1], 125), comp(parts[2], 125)];
        rgb = fromLab([clamp(p[0], 0, 100), p[1], p[2]]); break;
      case 'lch':
        p = [comp(parts[0], 100), comp(parts[1], 150), comp(parts[2], 1, true)];
        rgb = fromLch([clamp(p[0], 0, 100), Math.max(0, p[1]), p[2]]); break;
      case 'oklab':
        p = [comp(parts[0], 1), comp(parts[1], 0.4), comp(parts[2], 0.4)];
        rgb = fromOklab([clamp(p[0], 0, 1), p[1], p[2]]); break;
      case 'oklch':
        p = [comp(parts[0], 1), comp(parts[1], 0.4), comp(parts[2], 1, true)];
        rgb = fromOklch([clamp(p[0], 0, 1), Math.max(0, p[1]), p[2]]); break;
      default: return null;
    }
    if (p.some(isNaN) || rgb.some(isNaN)) return null;
    var alpha = 1;
    if (alphaText !== null) {
      alpha = /%$/.test(alphaText) ? parseFloat(alphaText) / 100 : alphaText === 'none' ? 0 : parseFloat(alphaText);
      if (isNaN(alpha)) return null;
      alpha = clamp(alpha, 0, 1);
    }
    return { rgb: rgb, alpha: alpha, format: name, values: p };
  }

  function to01(c) { return [c.r / 255, c.g / 255, c.b / 255]; }
  function from01(rgb) { return { r: byte(rgb[0] * 255), g: byte(rgb[1] * 255), b: byte(rgb[2] * 255) }; }

  /* Accepts #rgb, #rrggbb, #rrggbbaa, rgb()/rgba(), hsl()/hsla(), CSS names
     and (gamut-mapped into sRGB) hwb(), lab(), lch(), oklab() and oklch(). */
  function parse(input) {
    var text = String(input || '').trim().toLowerCase();
    if (!text) return null;
    if (ALIASES[text]) text = ALIASES[text];
    if (text === 'rebeccapurple') text = '#663399';
    if (CSS_NAMES[text]) text = CSS_NAMES[text];
    var hex = text.match(/^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
    if (hex) {
      var h = hex[1];
      if (h.length <= 4) h = h.split('').map(function (c) { return c + c; }).join('');
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
    }
    var rgb = text.match(/^rgba?\(([^)]+)\)$/);
    if (rgb) {
      var p = rgb[1].split(/[\s,\/]+/).filter(Boolean);
      if (p.length < 3) return null;
      var ch = p.slice(0, 3).map(function (v) { return /%$/.test(v) ? parseFloat(v) * 2.55 : parseFloat(v); });
      if (ch.some(isNaN)) return null;
      return { r: byte(ch[0]), g: byte(ch[1]), b: byte(ch[2]) };
    }
    var hsl = text.match(/^hsla?\(([^)]+)\)$/);
    if (hsl) {
      var q = hsl[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
      if (q.length < 3 || q.slice(0, 3).some(isNaN)) return null;
      return hslToRgb(q[0], q[1], q[2]);
    }
    var precise = parseCss(text);
    return precise ? from01(gamutMap(precise.rgb)) : null;
  }

  function hex(c) {
    return '#' + [c.r, c.g, c.b].map(function (v) { return byte(v).toString(16).padStart(2, '0'); }).join('');
  }

  /* h in degrees, s and l in 0-100 (floats allowed). */
  function rgbToHsl(c) {
    var r = c.r / 255, g = c.g / 255, b = c.b / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var l = (max + min) / 2, h = 0, s = 0, d = max - min;
    if (d) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: h, s: s * 100, l: l * 100 };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    s = clamp(s, 0, 100) / 100;
    l = clamp(l, 0, 100) / 100;
    if (!s) { var v = byte(l * 255); return { r: v, g: v, b: v }; }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    function f(t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    return { r: byte(f(h + 1 / 3) * 255), g: byte(f(h) * 255), b: byte(f(h - 1 / 3) * 255) };
  }

  function rgbToHsv(c) {
    var r = c.r / 255, g = c.g / 255, b = c.b / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    return { h: rgbToHsl(c).h, s: max ? d / max * 100 : 0, v: max * 100 };
  }

  function rgbToCmyk(c) {
    var r = c.r / 255, g = c.g / 255, b = c.b / 255;
    var k = 1 - Math.max(r, g, b);
    if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
    return { c: (1 - r - k) / (1 - k) * 100, m: (1 - g - k) / (1 - k) * 100, y: (1 - b - k) / (1 - k) * 100, k: k * 100 };
  }

  function luminance(c) {
    function ch(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
  }

  function contrast(a, b) {
    var x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  var R = Math.round;
  function fmtRgb(c) { return 'rgb(' + c.r + ', ' + c.g + ', ' + c.b + ')'; }
  function fmtHsl(c) { var h = rgbToHsl(c); return 'hsl(' + R(h.h) % 360 + ', ' + R(h.s) + '%, ' + R(h.l) + '%)'; }
  function fmtHsv(c) { var h = rgbToHsv(c); return 'hsb(' + R(h.h) % 360 + ', ' + R(h.s) + '%, ' + R(h.v) + '%)'; }
  function fmtCmyk(c) { var k = rgbToCmyk(c); return 'cmyk(' + R(k.c) + '%, ' + R(k.m) + '%, ' + R(k.y) + '%, ' + R(k.k) + '%)'; }
  function readableOn(c) { return luminance(c) > 0.35 ? '#000000' : '#ffffff'; }

  /* Fixed decimals with trailing zeros trimmed: num(0.25000, 4) -> "0.25". */
  function num(v, dp) {
    var s = Number(v).toFixed(dp);
    if (s.indexOf('.') > -1) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s === '-0' ? '0' : s;
  }
  function hueText(h, dp) { return isNaN(h) ? 'none' : num(h >= 359.9999 ? 0 : h, dp); }
  /* CSS strings for precise [r, g, b] colours (0..1, may be out of gamut). */
  function cssOklch(rgb) { var v = toOklch(rgb); return 'oklch(' + num(v[0] * 100, 2) + '% ' + num(v[1], 4) + ' ' + hueText(v[2], 2) + ')'; }
  function cssOklab(rgb) { var v = toOklab(rgb); return 'oklab(' + num(v[0] * 100, 2) + '% ' + num(v[1], 4) + ' ' + num(v[2], 4) + ')'; }
  function cssLab(rgb) { var v = toLab(rgb); return 'lab(' + num(v[0], 2) + '% ' + num(v[1], 2) + ' ' + num(v[2], 2) + ')'; }
  function cssLch(rgb) { var v = toLch(rgb); return 'lch(' + num(v[0], 2) + '% ' + num(v[1], 2) + ' ' + hueText(v[2], 2) + ')'; }
  function cssHwb(rgb) { var v = toHwb(rgb); return 'hwb(' + hueText(v[0], 1) + ' ' + num(v[1], 1) + '% ' + num(v[2], 1) + '%)'; }
  function textLab65(rgb) { var v = toLab65(rgb); return 'L* ' + num(v[0], 2) + ', a* ' + num(v[1], 2) + ', b* ' + num(v[2], 2); }

  /* The name finder matches against an everyday subset of the CSS names
     (no light-/medium- variants, aqua not cyan), so answers stay familiar. */
  var FINDER_NAMES = ('aliceblue antiquewhite aqua aquamarine azure beige bisque black blue blueviolet brown chartreuse ' +
    'chocolate coral cornflowerblue crimson darkblue darkgreen darkred deeppink deepskyblue dodgerblue firebrick forestgreen ' +
    'gold goldenrod gray green hotpink indigo khaki lavender limegreen fuchsia maroon mediumblue navy olive orange orangered ' +
    'orchid pink plum purple red royalblue salmon seagreen sienna silver skyblue slateblue steelblue tan teal tomato turquoise ' +
    'violet wheat white yellow yellowgreen').split(' ');

  function nearestNames(c, n) {
    return FINDER_NAMES.map(function (name) {
      var o = parse(CSS_NAMES[name]);
      var d = Math.sqrt(Math.pow(c.r - o.r, 2) + Math.pow(c.g - o.g, 2) + Math.pow(c.b - o.b, 2));
      return { name: name, hex: CSS_NAMES[name], d: d };
    }).sort(function (a, b) { return a.d - b.d; }).slice(0, n || 5);
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* A colour swatch that copies its hex (or runs onPick) when clicked. */
  function swatch(hexValue, label, sub, onPick) {
    return el('button', {
      class: 'sw', type: 'button', title: 'Copy ' + hexValue, dataset: { hex: hexValue },
      onclick: function () { if (onPick) onPick(hexValue); else U.copy(hexValue); }
    }, el('i', { style: { background: hexValue } }), el('code', { text: label || hexValue }), sub ? el('small', { text: sub }) : null);
  }

  /* Colour input + hex text box kept in sync. onChange gets an {r,g,b}. */
  function picker(initial, onChange, opts) {
    opts = opts || {};
    var colour = el('input', { type: 'color', value: initial, 'aria-label': opts.label || 'Pick a colour' });
    var text = el('input', { type: 'text', value: initial, spellcheck: false, placeholder: '#rrggbb', 'aria-label': (opts.label || 'Colour') + ' hex' });
    var wrap = el('div', { class: 'pick' }, colour, text);
    wrap.colour = colour; wrap.text = text;
    wrap.value = parse(initial);
    colour.addEventListener('input', function () {
      text.value = colour.value;
      wrap.value = parse(colour.value);
      onChange(wrap.value, 'picker');
    });
    text.addEventListener('input', function () {
      var c = parse(text.value);
      if (!c) { text.style.borderColor = 'var(--err)'; return; }
      text.style.borderColor = '';
      colour.value = hex(c);
      wrap.value = c;
      onChange(c, 'text');
    });
    wrap.set = function (value, silent) {
      var c = typeof value === 'string' ? parse(value) : value;
      if (!c) return;
      wrap.value = c;
      colour.value = hex(c);
      text.value = hex(c);
      text.style.borderColor = '';
      if (!silent) onChange(c, 'set');
    };
    return wrap;
  }

  function labelled(label, node) { return el('div', { class: 'field' }, el('label', { text: label }), node); }

  function copyTile(label, value, key) {
    return el('button', { type: 'button', title: 'Copy', dataset: { key: key || label }, onclick: function () { U.copy(value); } },
      el('b', { text: label }), el('code', { text: value }));
  }

  /* --- Colour Converter (absorbed HEX to RGB and RGB to HEX) ---------------- */

  /* Channel editors, one per model: read() takes a precise colour and gives
     the three numbers shown; write() turns edited numbers back into one. */
  function hue0(h) { return isNaN(h) ? 0 : h; }
  var MODELS = [
    { key: 'rgb', label: 'RGB', names: ['R', 'G', 'B'], min: [0, 0, 0], max: [255, 255, 255], step: [1, 1, 1], dp: [2, 2, 2],
      read: function (c) { return c.map(function (v) { return v * 255; }); },
      write: function (v) { return v.map(function (x) { return x / 255; }); },
      css: function (c) { return fmtRgb(from01(c)); } },
    { key: 'hsl', label: 'HSL', names: ['H °', 'S %', 'L %'], min: [0, 0, 0], max: [360, 100, 100], step: [1, 1, 1], dp: [2, 2, 2],
      read: toHsl, write: function (v) { return fromHsl(v[0], v[1], v[2]); },
      css: function (c) { var v = toHsl(c); return 'hsl(' + num(v[0], 2) + ' ' + num(v[1], 2) + '% ' + num(v[2], 2) + '%)'; } },
    { key: 'hwb', label: 'HWB', names: ['H °', 'W %', 'B %'], min: [0, 0, 0], max: [360, 100, 100], step: [1, 1, 1], dp: [2, 2, 2],
      read: function (c) { var v = toHwb(c); return [hue0(v[0]), v[1], v[2]]; },
      write: function (v) { return fromHwb(v[0], v[1], v[2]); }, css: cssHwb },
    { key: 'oklch', label: 'OKLCH', names: ['L %', 'C', 'H °'], min: [0, 0, 0], max: [100, 0.4, 360], step: [0.1, 0.001, 0.1], dp: [2, 4, 2],
      read: function (c) { var v = toOklch(c); return [v[0] * 100, v[1], hue0(v[2])]; },
      write: function (v) { return fromOklch([v[0] / 100, v[1], v[2]]); }, css: cssOklch },
    { key: 'oklab', label: 'OKLab', names: ['L %', 'a', 'b'], min: [0, -0.4, -0.4], max: [100, 0.4, 0.4], step: [0.1, 0.001, 0.001], dp: [2, 4, 4],
      read: function (c) { var v = toOklab(c); return [v[0] * 100, v[1], v[2]]; },
      write: function (v) { return fromOklab([v[0] / 100, v[1], v[2]]); }, css: cssOklab },
    { key: 'lab65', label: 'CIELAB (D65)', names: ['L*', 'a*', 'b*'], min: [0, -128, -128], max: [100, 128, 128], step: [0.1, 0.1, 0.1], dp: [2, 2, 2],
      read: toLab65, write: fromLab65, css: null },
    { key: 'lab', label: 'CSS lab() (D50)', names: ['L %', 'a', 'b'], min: [0, -125, -125], max: [100, 125, 125], step: [0.1, 0.1, 0.1], dp: [2, 2, 2],
      read: toLab, write: fromLab, css: cssLab },
    { key: 'lch', label: 'CSS lch() (D50)', names: ['L %', 'C', 'H °'], min: [0, 0, 0], max: [100, 150, 360], step: [0.1, 0.1, 0.1], dp: [2, 2, 2],
      read: function (c) { var v = toLch(c); return [v[0], v[1], hue0(v[2])]; },
      write: function (v) { return fromLch(v); }, css: cssLch }
  ];

  function converter(root) {
    root.classList.add('g-color');
    var state = [99 / 255, 102 / 255, 241 / 255];
    var model = MODELS[3];
    var colour = el('input', { type: 'color', value: '#6366f1', 'aria-label': 'Pick a colour' });
    var text = el('input', { type: 'text', class: 'wide', value: '#6366f1', spellcheck: false, autocomplete: 'off',
      placeholder: '#6366f1, rgb(), hsl(), hwb(), lab(), lch(), oklab(), oklch() or a name', 'aria-label': 'Colour value' });
    var preview = el('div', { class: 'big' });
    var gamutNote = el('p', { class: 'note gamut', dataset: { k: 'gamut' } });
    var tiles = el('div', { class: 'kv' });
    var shades = el('div', { class: 'sw-row' });
    var chanRow = el('div', { class: 'chanrow' });
    var chanInputs = [0, 1, 2].map(function (i) {
      var inp = el('input', { type: 'number', dataset: { k: 'chan' + i } });
      inp.addEventListener('input', fromChannels);
      return inp;
    });
    var chanLabels = chanInputs.map(function (inp) {
      var lab = el('label');
      chanRow.appendChild(el('div', { class: 'field' }, lab, inp));
      return lab;
    });
    var modelChips = U.chips(MODELS.map(function (m) { return { value: m.key, label: m.label }; }), function (v) {
      model = MODELS.filter(function (m) { return m.key === v; })[0];
      fillChannels();
    }, model.key);

    function fillChannels() {
      var vals = model.read(state);
      chanInputs.forEach(function (inp, i) {
        chanLabels[i].textContent = model.names[i];
        inp.min = model.min[i]; inp.max = model.max[i]; inp.step = model.step[i];
        inp.value = num(vals[i], model.dp[i]);
      });
    }

    function fromChannels() {
      var vals = chanInputs.map(function (inp) { return parseFloat(inp.value); });
      if (vals.some(isNaN)) return;
      set(model.write(vals), 'channels');
    }

    function set(rgb, source) {
      state = rgb;
      var mapped = gamutMap(rgb), c = from01(mapped), up = hex(c).toUpperCase(), outside = !inGamut(rgb);
      preview.style.background = hex(c);
      if (source !== 'picker') colour.value = hex(c);
      if (source === 'channels') text.value = model.css ? model.css(rgb) : hex(c);
      else if (source !== 'text') text.value = hex(c);
      text.style.borderColor = '';
      gamutNote.className = 'note gamut' + (outside ? ' err' : '');
      gamutNote.textContent = outside ? 'This colour is outside the sRGB gamut. HEX, RGB, HSL, HSB, CMYK and HWB show the nearest displayable colour (CSS Color 4 gamut mapping); the Lab and OK values show the colour as entered.' : '';
      tiles.replaceChildren(
        copyTile('HEX', up, 'hex'), copyTile('RGB', fmtRgb(c), 'rgb'), copyTile('HSL', fmtHsl(c), 'hsl'),
        copyTile('HSB/HSV', fmtHsv(c), 'hsv'), copyTile('CMYK', fmtCmyk(c), 'cmyk'), copyTile('HWB', cssHwb(outside ? mapped : rgb), 'hwb'),
        copyTile('OKLCH', cssOklch(rgb), 'oklch'), copyTile('OKLab', cssOklab(rgb), 'oklab'),
        copyTile('CSS lab() · D50', cssLab(rgb), 'lab'), copyTile('CSS lch() · D50', cssLch(rgb), 'lch'),
        copyTile('CIELAB · D65', textLab65(rgb), 'lab65'));
      if (source !== 'channels') fillChannels();
      var h = rgbToHsl(c), hi = R(h.h) % 360, si = R(h.s);
      var list = [];
      for (var l = 10; l <= 90; l += 10) {
        (function (light) {
          var s = hslToRgb(hi, si, light);
          var node = swatch(hex(s), hex(s).toUpperCase(), 'L ' + light + '%', function () { set(to01(s), 'shade'); });
          node.title = 'hsl(' + hi + ', ' + si + '%, ' + light + '%) — click to use';
          list.push(node);
        })(l);
      }
      shades.replaceChildren.apply(shades, list);
    }

    colour.addEventListener('input', function () { set(parseCss(colour.value).rgb, 'picker'); });
    text.addEventListener('input', function () {
      var p = parseCss(text.value);
      if (!p) { text.style.borderColor = 'var(--err)'; return; }
      set(p.rgb, 'text');
      if (p.alpha < 1) gamutNote.textContent = (gamutNote.textContent ? gamutNote.textContent + ' ' : '') + 'The alpha value (' + num(p.alpha, 3) + ') is ignored here.';
    });
    set(state, 'init');

    root.appendChild(U.panel('Colour', el('div', { class: 'pick' }, colour, text), preview, gamutNote,
      U.note('Type HEX (#rgb, #rrggbb), rgb(), hsl(), hwb(), lab(), lch(), oklab(), oklch() or a CSS colour name. CSS lab() and lch() use the D50 white point, as the CSS spec defines them.')));
    root.appendChild(U.panel('Values', tiles, U.note('Click any value to copy it. CIELAB · D65 is the classic L*a*b* with a D65 white (as most colour-difference tools use); it has no CSS syntax.')));
    root.appendChild(U.panel('Edit channels', modelChips, chanRow, U.note('Change any number to adjust the colour in that model.')));
    root.appendChild(U.panel('Shades & Tints', shades, U.note('Click a shade to load it.')));
  }

  Tools.register({
    id: 'color-converter', category: 'color', name: 'Colour Converter',
    description: 'Convert a colour between HEX, RGB, HSL, HSB, CMYK, HWB, OKLCH, OKLab and CIE Lab/LCH, with editable channels.',
    keywords: ['color', 'colour', 'hex', 'rgb', 'hsl', 'hsv', 'hsb', 'cmyk', 'hwb', 'oklch', 'oklab', 'lab', 'lch', 'cielab', 'cie',
      'convert', 'converter', 'hex to rgb', 'rgb to hex', 'css color', 'color space', 'perceptual', 'gamut'],
    render: converter
  });

  /* --- Colour Picker (absorbed Colour Picker & History) ----------------------- */

  var PRESET_COLOURS = [
    ['Red', '#ef4444'], ['Orange', '#f97316'], ['Amber', '#f59e0b'], ['Yellow', '#eab308'], ['Lime', '#84cc16'],
    ['Green', '#22c55e'], ['Teal', '#14b8a6'], ['Cyan', '#06b6d4'], ['Blue', '#3b82f6'], ['Indigo', '#6366f1'],
    ['Violet', '#8b5cf6'], ['Purple', '#a855f7'], ['Pink', '#ec4899'], ['Rose', '#f43f5e'], ['Slate', '#64748b'],
    ['White', '#ffffff'], ['Grey', '#6b7280'], ['Black', '#111827']
  ];
  var HISTORY_KEY = 'att-color-picker-history';

  /* The history is deliberately kept in this browser between visits. */
  function loadHistory() {
    try {
      var list = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      return Array.isArray(list) ? list.filter(function (h) { return /^#[0-9a-f]{6}$/.test(h); }).slice(0, 24) : [];
    } catch (e) { return []; }
  }
  function saveHistory(list) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch (e) { /* private mode or storage full */ }
  }

  function hsvToRgb(h, s, v) {
    function f(n) { var k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }
    return { r: byte(f(5) * 255), g: byte(f(3) * 255), b: byte(f(1) * 255) };
  }

  Tools.register({
    id: 'color-picker', category: 'color', name: 'Colour Picker',
    description: 'Pick a colour visually or from the screen, fine-tune its RGB channels, copy it as HEX, RGB, HSL, OKLCH or a CSS variable, and keep a history.',
    keywords: ['picker', 'color', 'colour', 'color picker', 'eyedropper', 'eye dropper', 'hex', 'rgb', 'hsl', 'hsv', 'oklch', 'palette',
      'history', 'sliders', 'channels', 'css variable', 'hex color picker', 'color picker & history'],
    render: function (root) {
      root.classList.add('g-color');
      var history = loadHistory();
      var hsv = { h: 217, s: 0.76, v: 0.96 };
      var tiles = el('div', { class: 'kv' });
      var historyRow = el('div', { class: 'sw-row' });
      var lum = el('div', { class: 'lum' });
      var preview = el('div', { class: 'big' });
      var thumb = el('i');
      var sv = el('div', { class: 'sv', tabIndex: 0, role: 'slider', 'aria-label': 'Saturation (left to right) and brightness (bottom to top)' }, thumb);
      var hue = el('input', { type: 'range', class: 'hue', min: 0, max: 360, step: 1, value: 217, 'aria-label': 'Hue' });
      var varName = el('input', { type: 'text', value: '--color', spellcheck: false, 'aria-label': 'CSS variable name' });
      var current = parse('#3b82f6');

      var remember = U.debounce(function (h) {
        history = [h].concat(history.filter(function (x) { return x !== h; })).slice(0, 24);
        saveHistory(history);
        drawHistory();
      }, 500);

      var pick = picker('#3b82f6', function (c) { update(c, 'picker'); remember(hex(c)); }, { label: 'Pick colour' });

      /* Fine-tuning rows: a slider and a number box per channel. */
      var channels = {};
      var chanRows = [['r', 'R (red)'], ['g', 'G (green)'], ['b', 'B (blue)']].map(function (d) {
        var slider = el('input', { type: 'range', min: 0, max: 255, value: 0, 'aria-label': d[1] });
        var box = el('input', { type: 'number', min: 0, max: 255, value: 0, 'aria-label': d[1] + ' value' });
        function fromChannels(src) {
          var v = clamp(parseInt(src.value, 10) || 0, 0, 255);
          slider.value = v; box.value = v;
          var c = { r: +channels.r.box.value, g: +channels.g.box.value, b: +channels.b.box.value };
          pick.set(c, true);
          update(c, 'channels');
          remember(hex(c));
        }
        slider.addEventListener('input', function () { fromChannels(slider); });
        box.addEventListener('input', function () { fromChannels(box); });
        channels[d[0]] = { slider: slider, box: box };
        return el('div', { class: 'chan' }, el('label', { text: d[1] }), slider, box);
      });

      function varLine(h) {
        var name = varName.value.trim().replace(/[^a-zA-Z0-9_-]/g, '');
        if (!name || name === '--') name = '--color';
        else if (name.slice(0, 2) !== '--') name = '--' + name.replace(/^-+/, '');
        return name + ': ' + h + ';';
      }

      function drawSv() {
        sv.style.background = 'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(' + hsv.h + ', 100%, 50%))';
        thumb.style.left = (hsv.s * 100) + '%';
        thumb.style.top = ((1 - hsv.v) * 100) + '%';
        thumb.style.background = hex(current);
      }

      function update(c, source) {
        current = c;
        var h = hex(c);
        preview.style.background = h;
        ['r', 'g', 'b'].forEach(function (k) { channels[k].slider.value = c[k]; channels[k].box.value = c[k]; });
        if (source !== 'sv' && source !== 'hue') {
          var p = rgbToHsv(c);
          if (p.s > 0 && p.v > 0) hsv.h = p.h;
          hsv.s = p.s / 100; hsv.v = p.v / 100;
          hue.value = R(hsv.h);
        }
        drawSv();
        tiles.replaceChildren(copyTile('HEX', h.toUpperCase(), 'hex'), copyTile('RGB', fmtRgb(c), 'rgb'),
          copyTile('HSL', fmtHsl(c), 'hsl'), copyTile('OKLCH', cssOklch(to01(c)), 'oklch'), copyTile('CSS var', varLine(h), 'css'));
        var w = contrast(c, { r: 255, g: 255, b: 255 }), b = contrast(c, { r: 0, g: 0, b: 0 });
        lum.replaceChildren(
          el('div', { style: { background: h, color: '#fff' }, text: 'White text on ' + h + ' (' + w.toFixed(2) + ':1)' }),
          el('div', { style: { background: h, color: '#000' }, text: 'Black text on ' + h + ' (' + b.toFixed(2) + ':1)' }));
      }

      function fromHsv(source) {
        var c = hsvToRgb(hsv.h, hsv.s, hsv.v);
        pick.set(c, true);
        update(c, source);
        remember(hex(c));
      }

      /* Dragging on the square sets saturation and brightness (mouse, pen or touch). */
      function svAt(e) {
        var box = sv.getBoundingClientRect();
        hsv.s = clamp((e.clientX - box.left) / box.width, 0, 1);
        hsv.v = clamp(1 - (e.clientY - box.top) / box.height, 0, 1);
        fromHsv('sv');
      }
      sv.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        sv.focus();
        try { sv.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
        svAt(e);
      });
      sv.addEventListener('pointermove', function (e) { if (e.buttons || e.pressure > 0) svAt(e); });
      sv.addEventListener('keydown', function (e) {
        var step = e.shiftKey ? 0.1 : 0.01, used = true;
        if (e.key === 'ArrowLeft') hsv.s = clamp(hsv.s - step, 0, 1);
        else if (e.key === 'ArrowRight') hsv.s = clamp(hsv.s + step, 0, 1);
        else if (e.key === 'ArrowUp') hsv.v = clamp(hsv.v + step, 0, 1);
        else if (e.key === 'ArrowDown') hsv.v = clamp(hsv.v - step, 0, 1);
        else used = false;
        if (used) { e.preventDefault(); fromHsv('sv'); }
      });
      hue.addEventListener('input', function () { hsv.h = +hue.value; fromHsv('hue'); });
      varName.addEventListener('input', function () { update(current, 'var'); });

      /* The EyeDropper API exists in Chrome and Edge on desktop only. */
      var dropper = null;
      if (typeof window.EyeDropper === 'function') {
        dropper = U.button('Pick from screen', function () {
          new window.EyeDropper().open().then(function (result) {
            var c = parse(result.sRGBHex);
            if (!c) return;
            pick.set(c, true);
            update(c, 'dropper');
            remember(hex(c));
          }).catch(function () { /* cancelled with Esc */ });
        });
      }

      function drawHistory() {
        historyRow.replaceChildren.apply(historyRow, history.length ? history.map(function (h) {
          return swatch(h, h, null, function () { pick.set(h, true); update(parse(h), 'history'); });
        }) : [U.note('Colours you pick appear here, and are kept in this browser.')]);
      }

      var named = el('div', { class: 'sw-row' }, PRESET_COLOURS.map(function (p) {
        var b = swatch(p[1], p[0], p[1], function () { pick.set(p[1], true); update(parse(p[1]), 'preset'); remember(p[1]); });
        b.title = p[0] + ' ' + p[1];
        return b;
      }));

      update(current, 'init');
      drawHistory();

      root.appendChild(U.panel('Pick colour', sv, hue,
        el('div', { class: 'pick', style: { marginTop: '10px' } }, pick.colour, pick.text, dropper),
        dropper ? null : U.note('Picking a colour from anywhere on the screen needs Chrome or Edge on a computer.'),
        preview));
      root.appendChild(U.panel('Fine-tune RGB', chanRows));
      root.appendChild(U.panel('Values', tiles, el('div', { class: 'field', style: { marginTop: '10px', maxWidth: '260px' } },
        el('label', { text: 'CSS variable name' }), varName), U.note('Click any value to copy it.')));
      root.appendChild(U.panel('Named colours', named));
      root.appendChild(U.panel('History', historyRow, U.btnrow(U.button('Clear history', function () {
        history = [];
        saveHistory(history);
        drawHistory();
      }, 'ghost'))));
      root.appendChild(U.panel('Luminance preview', lum));
    }
  });

  /* --- Colour Palette & Harmonies (absorbed Colour Harmonies) ----------------- */

  var SCHEMES = [
    { value: 'monochromatic', label: 'Monochromatic' }, { value: 'analogous', label: 'Analogous' },
    { value: 'complementary', label: 'Complementary' }, { value: 'split', label: 'Split-complementary' },
    { value: 'triadic', label: 'Triadic' }, { value: 'tetradic', label: 'Tetradic (square)' },
    { value: 'rectangle', label: 'Rectangle' }, { value: 'compound', label: 'Compound' }
  ];

  function paletteFor(c, scheme) {
    /* Work from the rounded HSL a person would read off the screen. */
    var p = rgbToHsl(c), h = R(p.h) % 360, s = R(p.s), l = R(p.l);
    function at(dh, ss, ll) { return hslToRgb(h + dh, ss === undefined ? s : ss, ll === undefined ? l : ll); }
    function lc(v) { return clamp(v, 0, 100); }
    switch (scheme) {
      case 'monochromatic': return [['Darkest', at(0, s, lc(l - 30))], ['Dark', at(0, s, lc(l - 15))], ['Base', c],
        ['Light', at(0, s, lc(l + 15))], ['Lightest', at(0, s, lc(l + 30))]];
      case 'analogous': return [['Analogous -30°', at(-30)], ['Analogous -15°', at(-15)], ['Base', c],
        ['Analogous +15°', at(15)], ['Analogous +30°', at(30)]];
      case 'split': return [['Base', c], ['Split +150°', at(150)], ['Split +210°', at(210)]];
      case 'triadic': return [['Base', c], ['Triadic 1', at(120)], ['Triadic 2', at(240)],
        ['Split 1', at(60, s * 0.8)], ['Split 2', at(-60, s * 0.8)]];
      case 'tetradic': return [['Base', c], ['90°', at(90)], ['180°', at(180)], ['270°', at(270)]];
      case 'rectangle': return [['Base', c], ['+60°', at(60)], ['Complement 180°', at(180)], ['+240°', at(240)]];
      case 'compound': return [['Base', c], ['Analogue +30°', at(30)], ['Near complement +150°', at(150)], ['Complement 180°', at(180)]];
      default: return [['Darker', at(0, s, lc(l - 20))], ['Base', c], ['Lighter', at(0, s, lc(l + 20))],
        ['Complement', at(180)], ['Comp Dark', at(180, s, lc(l - 20))]];
    }
  }

  Tools.register({
    id: 'color-palette', category: 'color', name: 'Colour Palette & Harmonies',
    description: 'Build monochromatic, analogous, complementary, split-complementary, triadic, square, rectangle or compound palettes from a base colour, shown on a colour wheel.',
    keywords: ['palette', 'scheme', 'color', 'colour', 'harmony', 'harmonies', 'color harmonies', 'complementary', 'split complementary',
      'analogous', 'triadic', 'tetradic', 'square', 'rectangle', 'compound', 'monochromatic', 'color wheel', 'colour wheel', 'generator'],
    render: function (root) {
      root.classList.add('g-color');
      var scheme = 'complementary';
      var row = el('div', { class: 'sw-row' });
      var wheel = el('div', { class: 'wheel', role: 'img', 'aria-label': 'Colour wheel with the palette hues marked' });
      var listOut = U.out('');
      listOut.dataset.out = 'list';
      var cssOut = U.out('');
      cssOut.dataset.out = 'css';
      var pick = picker('#6366f1', draw, { label: 'Base colour' });
      var chips = U.chips(SCHEMES, function (v) { scheme = v; draw(pick.value); }, 'complementary');

      function draw(c) {
        var list = paletteFor(c, scheme);
        var hexes = list.map(function (e) { return hex(e[1]).toUpperCase(); });
        row.replaceChildren.apply(row, list.map(function (e, i) {
          var node = swatch(hexes[i], hexes[i], e[0]);
          node.style.minWidth = '120px';
          node.querySelector('i').style.height = '90px';
          node.appendChild(el('small', { text: fmtHsl(e[1]) }));
          return node;
        }));
        /* Markers sit on the ring at each colour's hue; greys have no hue. */
        wheel.replaceChildren.apply(wheel, list.map(function (e, i) {
          /* Darker colours sit nearer the centre so same-hue swatches don't overlap. */
          var p = rgbToHsl(e[1]), a = p.h * Math.PI / 180, r = p.s < 1 ? 0 : 33 + p.l * 0.15;
          return el('b', { title: e[0] + ' ' + hexes[i], style: { background: hexes[i], left: (50 + r * Math.sin(a)) + '%', top: (50 - r * Math.cos(a)) + '%' } });
        }));
        listOut.textContent = hexes.join(', ');
        cssOut.textContent = ':root {\n' + hexes.map(function (x, i) { return '  --palette-' + (i + 1) + ': ' + x + ';'; }).join('\n') + '\n}';
      }
      draw(pick.value);

      root.appendChild(U.panel('Base colour', pick));
      root.appendChild(U.panel('Colour scheme', chips));
      root.appendChild(U.panel('Palette', el('div', { class: 'wheelrow' }, wheel, row), U.note('Click a colour to copy its HEX.'),
        listOut, U.btnrow(U.copyBtn('Copy all HEX', function () { return listOut.textContent; }))));
      root.appendChild(U.panel('CSS variables', cssOut, U.btnrow(U.copyBtn('Copy as CSS variables', function () { return cssOut.textContent; }))));
    }
  });

  /* --- Contrast Checker ---------------------------------------------------- */

  var CONTRAST_SUGGESTIONS = [
    ['White / Black', '#ffffff', '#000000'], ['Black / White', '#000000', '#ffffff'],
    ['White / Navy', '#ffffff', '#0a1a3c'], ['Navy / Light Blue', '#0a1a3c', '#dbeafe']
  ];

  Tools.register({
    id: 'color-contrast', category: 'color', name: 'Contrast Checker',
    description: 'Check the WCAG 2.1 contrast ratio between a text and background colour.',
    keywords: ['contrast', 'wcag', 'accessibility', 'a11y', 'ratio', 'color'],
    render: function (root) {
      root.classList.add('g-color');
      var fg = picker('#ffffff', update, { label: 'Foreground Color' });
      var bg = picker('#6366f1', update, { label: 'Background Color' });
      var sample = el('div', { class: 'sample' });
      var ratioEl = el('div', { class: 'ratio', dataset: { out: 'ratio' } });
      var level = el('div', { class: 'note', dataset: { out: 'level' } });
      var grid = el('div', { class: 'grid4' });

      function update() {
        var f = fg.value, b = bg.value;
        var ratio = contrast(f, b);
        var r2 = Math.round(ratio * 100) / 100;
        sample.style.background = hex(b);
        sample.style.color = hex(f);
        sample.replaceChildren(
          el('p', { style: { fontSize: '16px', margin: '0 0 8px' }, text: 'Normal text at this size needs AA compliance (4.5:1 ratio).' }),
          el('p', { style: { fontSize: '24px', fontWeight: '700', margin: '0 0 8px' }, text: 'Large text (18pt+) only needs AA large (3:1 ratio).' }),
          el('p', { style: { fontSize: '12px', margin: 0 }, text: 'Small text is harder to read and needs higher contrast.' }));
        ratioEl.textContent = r2.toFixed(2) + ':1';
        level.textContent = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA Large' : 'Fail';
        level.className = 'note ' + (ratio >= 3 ? 'ok' : 'err');
        var checks = [['AA Normal', 4.5], ['AA Large', 3], ['AAA Normal', 7], ['AAA Large', 4.5]];
        grid.replaceChildren.apply(grid, checks.map(function (c) {
          var ok = ratio >= c[1];
          return el('div', { dataset: { check: c[0] } }, el('b', { text: c[0] }), el('div', { class: 'note', text: 'Min ' + c[1] + ':1' }),
            el('div', { class: ok ? 'pass' : 'fail', text: ok ? '✓ Pass' : '✗ Fail' }));
        }));
      }
      update();

      var swap = U.button('Swap colours', function () {
        var f = hex(fg.value), b = hex(bg.value);
        fg.set(b, true); bg.set(f, true); update();
      }, 'ghost');

      var suggestions = U.btnrow.apply(null, CONTRAST_SUGGESTIONS.map(function (s) {
        var b = U.button(s[0] + ' ' + contrast(parse(s[1]), parse(s[2])).toFixed(1) + ':1', function () {
          fg.set(s[1], true); bg.set(s[2], true); update();
        }, 'ghost');
        b.style.background = s[2]; b.style.color = s[1];
        return b;
      }));

      root.appendChild(U.panel('Colors', U.row(labelled('Foreground Color', fg), labelled('Background Color', bg)), U.btnrow(swap)));
      root.appendChild(U.panel('Sample Text', sample));
      root.appendChild(U.panel('Contrast Ratio', ratioEl, level));
      root.appendChild(U.panel('WCAG 2.1 Compliance', grid));
      root.appendChild(U.panel('Suggested Combinations', suggestions));
    }
  });

  /* --- Color Shades ------------------------------------------------------ */

  function shadesOf(c, steps) {
    var shades = [], tints = [];
    for (var i = 1; i <= steps; i++) {
      var f = i / steps;
      shades.push({ hex: hex({ r: c.r * f, g: c.g * f, b: c.b * f }), label: String((steps - i) * 100 + R(f * 100)) });
    }
    for (var j = 0; j <= steps; j++) {
      var t = j / steps;
      tints.push({ hex: hex({ r: c.r + (255 - c.r) * t, g: c.g + (255 - c.g) * t, b: c.b + (255 - c.b) * t }),
        label: j === 0 ? 'base' : 'tint-' + R(t * 100) });
    }
    return shades.concat(tints);
  }

  Tools.register({
    id: 'color-shades', category: 'color', name: 'Colour Shades',
    description: 'Generate darker shades and lighter tints of any colour.',
    keywords: ['shades', 'tints', 'color', 'scale', 'palette', 'lighter', 'darker'],
    render: function (root) {
      root.classList.add('g-color');
      var steps = el('input', { type: 'range', min: 3, max: 20, value: 10, 'aria-label': 'Steps' });
      var stepsLabel = el('label', { text: 'Steps: 10' });
      var row = el('div', { class: 'sw-row' });
      var pick = picker('#3b82f6', draw, { label: 'Base Color' });
      var list = [];

      function draw() {
        stepsLabel.textContent = 'Steps: ' + steps.value;
        list = shadesOf(pick.value, parseInt(steps.value, 10));
        row.replaceChildren.apply(row, list.map(function (s) { return swatch(s.hex, s.hex, s.label); }));
      }
      steps.addEventListener('input', draw);
      draw();

      root.appendChild(U.panel('Base Color', pick, el('div', { class: 'field' }, stepsLabel, steps)));
      root.appendChild(U.panel('Shades & Tints', row, U.btnrow(U.copyBtn('Copy All HEX', function () {
        return list.map(function (s) { return s.hex; }).join('\n');
      }))));
    }
  });

  /* --- Color Blindness Simulator ------------------------------------------ */

  var CVD = [
    ['normal', 'Normal Vision', null],
    ['protanopia', 'Protanopia (red-blind)', [0.567, 0.433, 0, 0.558, 0.442, 0, 0, 0.242, 0.758]],
    ['deuteranopia', 'Deuteranopia (green-blind)', [0.625, 0.375, 0, 0.7, 0.3, 0, 0, 0.3, 0.7]],
    ['tritanopia', 'Tritanopia (blue-blind)', [0.95, 0.05, 0, 0, 0.433, 0.567, 0, 0.475, 0.525]],
    ['achromatopsia', 'Achromatopsia (total)', [0.299, 0.587, 0.114, 0.299, 0.587, 0.114, 0.299, 0.587, 0.114]],
    ['protanomaly', 'Protanomaly (low red)', [0.817, 0.183, 0, 0.333, 0.667, 0, 0, 0.125, 0.875]],
    ['deuteranomaly', 'Deuteranomaly (low green)', [0.8, 0.2, 0, 0.258, 0.742, 0, 0, 0.142, 0.858]],
    ['tritanomaly', 'Tritanomaly (low blue)', [0.967, 0.033, 0, 0, 0.733, 0.267, 0, 0.183, 0.817]]
  ];

  function simulate(data, m) {
    if (!m) return;
    for (var i = 0; i < data.length; i += 4) {
      var r = data[i], g = data[i + 1], b = data[i + 2];
      data[i] = m[0] * r + m[1] * g + m[2] * b;
      data[i + 1] = m[3] * r + m[4] * g + m[5] * b;
      data[i + 2] = m[6] * r + m[7] * g + m[8] * b;
    }
  }

  Tools.register({
    id: 'color-blindness', category: 'color', name: 'Colour Blindness Simulator',
    description: 'See how a picture looks with eight types of colour vision deficiency.',
    keywords: ['color blindness', 'cvd', 'protanopia', 'deuteranopia', 'tritanopia', 'accessibility', 'simulator'],
    render: function (root) {
      root.classList.add('g-color');
      var mode = 'protanopia';
      var img = null, fileName = 'image';
      var original = el('canvas', { dataset: { role: 'original' } });
      var output = el('canvas', { dataset: { role: 'simulated' } });
      var outTitle = el('h3', { text: '' });
      var stage = el('div', { style: { display: 'none' } },
        U.split(el('div', {}, el('h3', { text: 'Original' }), original), el('div', {}, outTitle, output)),
        U.btnrow(U.button('Save', function () {
          output.toBlob(function (b) { U.saveBlob(fileName + '-' + mode + '.png', b); }, 'image/png');
        }, 'primary')));

      var modes = U.chips(CVD.map(function (c) { return { value: c[0], label: c[1] }; }), function (v) { mode = v; draw(); }, mode);

      function draw() {
        if (!img) return;
        var entry = CVD.filter(function (c) { return c[0] === mode; })[0];
        outTitle.textContent = entry[1];
        var scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        var w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
        [original, output].forEach(function (cv) { cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, 0, 0, w, h); });
        var ctx = output.getContext('2d');
        var data = ctx.getImageData(0, 0, w, h);
        simulate(data.data, entry[2]);
        ctx.putImageData(data, 0, 0);
        stage.style.display = '';
      }

      var drop = U.dropzone({
        accept: 'image/*', label: 'Drop an image here or click to upload', hint: 'Choose Image',
        onFiles: function (files) {
          fileName = files[0].name.replace(/\.[^.]+$/, '') || 'image';
          U.loadImage(files[0]).then(function (i) { img = i; draw(); }).catch(function (e) { U.toast(e.message, 'err'); });
        }
      });

      root.appendChild(U.panel('Vision type', modes));
      root.appendChild(U.panel('Image', drop, stage));
      root.appendChild(U.panel('About color blindness types:', el('ul', {},
        el('li', { text: 'Protanopia/Protanomaly — difficulty distinguishing red from green (red-weak)' }),
        el('li', { text: 'Deuteranopia/Deuteranomaly — most common; green-weak color vision' }),
        el('li', { text: 'Tritanopia/Tritanomaly — rare; blue-yellow confusion' }),
        el('li', { text: 'Achromatopsia — complete color blindness; sees only shades of gray' }))));
    }
  });

  /* --- Color Mixer ------------------------------------------------------ */

  function mix(a, b, t) { return { r: R(a.r + (b.r - a.r) * t), g: R(a.g + (b.g - a.g) * t), b: R(a.b + (b.b - a.b) * t) }; }

  Tools.register({
    id: 'color-mixer', category: 'color', name: 'Colour Mixer',
    description: 'Blend two colours at any ratio and see every step between them.',
    keywords: ['mix', 'blend', 'color', 'interpolate', 'gradient', 'steps'],
    render: function (root) {
      root.classList.add('g-color');
      var ratio = el('input', { type: 'range', min: 0, max: 100, value: 50, 'aria-label': 'Mix ratio' });
      var ratioLabel = el('label', { text: 'Mix Ratio: 50% Color 2' });
      var result = el('button', { type: 'button', class: 'sw', style: { width: '100%' }, onclick: function () { U.copy(result.dataset.hex); } });
      var steps = el('div', { class: 'sw-row' });
      var a = picker('#3b82f6', draw, { label: 'Color 1' });
      var b = picker('#ef4444', draw, { label: 'Color 2' });

      function draw() {
        var t = parseInt(ratio.value, 10) / 100;
        ratioLabel.textContent = 'Mix Ratio: ' + ratio.value + '% Color 2';
        var m = mix(a.value, b.value, t), h = hex(m);
        result.dataset.hex = h;
        result.replaceChildren(el('i', { style: { background: h, height: '90px' } }), el('code', { dataset: { out: 'mix' }, text: h }),
          el('small', { text: fmtRgb(m) + ' — Mixed color — click to copy' }));
        var list = [];
        for (var i = 0; i <= 10; i++) {
          var s = mix(a.value, b.value, i / 10);
          list.push(swatch(hex(s), hex(s), i * 10 + '% · ' + fmtRgb(s)));
        }
        steps.replaceChildren.apply(steps, list);
      }
      ratio.addEventListener('input', draw);
      draw();

      root.appendChild(U.panel('Colors', U.row(labelled('Color 1', a), labelled('Color 2', b)), el('div', { class: 'field' }, ratioLabel, ratio)));
      root.appendChild(U.panel('Result', result));
      root.appendChild(U.panel('Steps', steps, U.note('Click any swatch to copy its HEX value')));
    }
  });

  /* --- Color Name Finder ---------------------------------------------------- */

  Tools.register({
    id: 'color-name', category: 'color', name: 'Colour Name Finder',
    description: 'Find the closest CSS named colours to any colour.',
    keywords: ['color name', 'css', 'named', 'nearest', 'closest', 'identify'],
    render: function (root) {
      root.classList.add('g-color');
      var list = el('div', { class: 'names' });
      var pick = picker('#3b82f6', draw, { label: 'Pick Color' });

      function draw(c) {
        list.replaceChildren.apply(list, nearestNames(c, 5).map(function (n, i) {
          return el('button', { type: 'button', dataset: { name: n.name }, onclick: function () { U.copy(n.name); } },
            el('i', { style: { background: n.hex } }),
            el('span', {}, el('b', {}, cap(n.name), i === 0 ? el('span', { class: 'badge', text: 'Closest' }) : null),
              el('code', { text: n.hex }), el('small', { text: 'Δ' + n.d.toFixed(1) })));
        }));
      }
      draw(pick.value);

      root.appendChild(U.panel('Pick Color', U.row(labelled('Pick Color', pick.colour), labelled('Hex Code', pick.text))));
      root.appendChild(U.panel('Closest CSS Color Names', list, U.note('Δ is the straight-line distance in RGB space. Click a name to copy it.')));
    }
  });

  /* --- CSS Color Names ------------------------------------------------------ */

  Tools.register({
    id: 'css-color-names', category: 'color', name: 'CSS Colour Names',
    description: 'Browse and search every CSS named colour with its HEX value.',
    keywords: ['css', 'named colors', 'html colors', 'reference', 'hex', 'list'],
    render: function (root) {
      root.classList.add('g-color');
      var search = el('input', { type: 'text', placeholder: 'Search by name or hex...' });
      var count = U.note('');
      count.dataset.out = 'count';
      var grid = el('div', { class: 'names' });
      var names = Object.keys(CSS_NAMES);

      function draw() {
        var q = search.value.trim().toLowerCase().replace(/^#/, '');
        var hits = names.filter(function (n) { return !q || n.indexOf(q) > -1 || CSS_NAMES[n].toLowerCase().indexOf(q) > -1; });
        count.textContent = hits.length + ' colors';
        grid.replaceChildren.apply(grid, hits.map(function (n) {
          return el('button', { type: 'button', title: 'Copy ' + CSS_NAMES[n], dataset: { name: n }, onclick: function () { U.copy(CSS_NAMES[n]); } },
            el('i', { style: { background: CSS_NAMES[n] } }), el('span', {}, el('b', { text: n }), el('code', { text: CSS_NAMES[n] })));
        }));
      }
      search.addEventListener('input', draw);
      draw();

      root.appendChild(U.panel('Search', search, count));
      root.appendChild(U.panel('Colors', grid, U.note('Click a colour to copy its HEX value.')));
    }
  });

  /* --- Camera Color Picker ---------------------------------------------------- */

  /* A plain colour word from hue/saturation/lightness, for colour-blind users. */
  function plainWord(c) {
    var p = rgbToHsl(c), h = p.h, s = p.s, l = p.l;
    if (l < 12) return 'black';
    if (l > 92 && s < 30) return 'white';
    if (s < 12) return l < 35 ? 'dark grey' : l > 70 ? 'light grey' : 'grey';
    var tone = l < 30 ? 'dark ' : l > 75 ? 'light ' : '';
    var name;
    if (h < 15 || h >= 345) name = 'red';
    else if (h < 40) name = (l < 45 && s < 80) ? 'brown' : 'orange';
    else if (h < 65) name = (l < 40) ? 'olive' : 'yellow';
    else if (h < 160) name = 'green';
    else if (h < 195) name = 'cyan';
    else if (h < 255) name = 'blue';
    else if (h < 290) name = 'purple';
    else if (h < 345) name = l > 65 ? 'pink' : 'magenta';
    if (name === 'red' && l > 70) return 'pink';
    return tone + name;
  }

  Tools.register({
    id: 'camera-color-picker', category: 'color', name: 'Camera Colour Picker',
    description: 'Point your camera at something to read its colour codes, name and a plain colour word.',
    keywords: ['camera', 'color picker', 'identifier', 'what color is this', 'colour blind', 'webcam'],
    render: function (root) {
      root.classList.add('g-color');
      var stream = null, raf = 0;
      var spot = { x: 0.5, y: 0.5 };
      var size = 'medium';
      var SIZES = { small: 6, medium: 16, large: 32 };
      var video = el('video', { playsInline: true, muted: true, autoplay: true });
      var ring = el('div', { class: 'ring' });
      var cam = el('div', { class: 'cam', style: { display: 'none' } }, video, ring);
      var canvas = el('canvas', { style: { display: 'none' } });
      var readout = el('div', {}, U.note('Start the camera and the colour under the circle appears here.'));
      var back = U.checkbox('Back camera', { checked: true });
      var status = U.note('');
      var startBtn = U.button('Start camera', function () { stream ? stop() : start(); }, 'primary');
      var sizeChips = U.chips([{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }],
        function (v) { size = v; placeRing(); }, size);

      function placeRing() {
        var w = video.clientWidth || 1, h = video.clientHeight || 1;
        var px = SIZES[size] * 2 * (w / (video.videoWidth || w));
        ring.style.width = ring.style.height = Math.max(12, px) + 'px';
        ring.style.left = (spot.x * w) + 'px';
        ring.style.top = (spot.y * h) + 'px';
      }

      function sample() {
        if (!stream || !video.videoWidth) { raf = requestAnimationFrame(sample); return; }
        var vw = video.videoWidth, vh = video.videoHeight, r = SIZES[size];
        canvas.width = vw; canvas.height = vh;
        var ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, vw, vh);
        var cx = Math.round(spot.x * vw), cy = Math.round(spot.y * vh);
        var x0 = clamp(cx - r, 0, vw - 1), y0 = clamp(cy - r, 0, vh - 1);
        var w = Math.max(1, Math.min(vw - x0, r * 2)), h = Math.max(1, Math.min(vh - y0, r * 2));
        var d = ctx.getImageData(x0, y0, w, h).data, tr = 0, tg = 0, tb = 0, n = 0;
        for (var i = 0; i < d.length; i += 4) { tr += d[i]; tg += d[i + 1]; tb += d[i + 2]; n++; }
        show({ r: R(tr / n), g: R(tg / n), b: R(tb / n) });
        placeRing();
        raf = setTimeout(function () { raf = requestAnimationFrame(sample); }, 150);
      }

      function show(c) {
        var h = hex(c), near = nearestNames(c, 1)[0];
        readout.replaceChildren(
          el('div', { class: 'big', style: { background: h, height: '80px' } }),
          el('h3', { text: cap(plainWord(c)), style: { margin: '10px 0 4px' } }),
          U.note('Closest named colour: ' + cap(near.name) + ' (' + near.hex + ')'),
          el('div', { class: 'kv' }, copyTile('HEX', h.toUpperCase(), 'hex'), copyTile('RGB', fmtRgb(c), 'rgb'),
            copyTile('HSL', fmtHsl(c), 'hsl'), copyTile('CMYK', fmtCmyk(c), 'cmyk')));
      }

      function start() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          status.className = 'note err';
          status.textContent = 'This browser cannot open the camera here. Use a recent browser over http://localhost.';
          return;
        }
        status.className = 'note'; status.textContent = 'Opening camera…';
        navigator.mediaDevices.getUserMedia({ video: { facingMode: back.input.checked ? 'environment' : 'user' }, audio: false })
          .then(function (s) {
            stream = s;
            video.srcObject = s;
            cam.style.display = '';
            startBtn.textContent = 'Stop camera';
            status.textContent = '';
            return video.play();
          })
          .then(function () { sample(); })
          .catch(function (e) {
            status.className = 'note err';
            status.textContent = 'Could not open the camera: ' + (e && e.message ? e.message : e);
          });
      }

      function stop() {
        if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
        stream = null;
        cancelAnimationFrame(raf); clearTimeout(raf);
        video.srcObject = null;
        cam.style.display = 'none';
        startBtn.textContent = 'Start camera';
      }

      video.addEventListener('click', function (e) {
        var box = video.getBoundingClientRect();
        spot.x = clamp((e.clientX - box.left) / box.width, 0, 1);
        spot.y = clamp((e.clientY - box.top) / box.height, 0, 1);
        placeRing();
      });
      back.input.addEventListener('change', function () { if (stream) { stop(); start(); } });
      U.onTeardown(root, stop);

      root.appendChild(U.panel('Camera', U.note('Point your camera at anything to see its colour. Tap the picture to measure a different spot.'),
        U.btnrow(startBtn), U.row(back, el('div', { class: 'field' }, el('label', { text: 'Spot size' }), sizeChips)),
        status, cam, canvas, U.note('The camera picture is read on this device and never uploaded or saved.')));
      root.appendChild(U.panel('Colour', readout));
      root.show = show;
    }
  });

  /* Shared with color-b and css-b. The 8-bit helpers take {r, g, b} (0-255);
     the precise ones take [r, g, b] arrays of sRGB in 0..1. */
  window.ColourKit = {
    parse: parse, hex: hex, rgbToHsl: rgbToHsl, hslToRgb: hslToRgb, contrast: contrast, luminance: luminance,
    names: CSS_NAMES, plainWord: plainWord, readableOn: readableOn,
    parseCss: parseCss, to01: to01, from01: from01, linear: linear, unlinear: unlinear,
    toOklab: toOklab, fromOklab: fromOklab, toOklch: toOklch, fromOklch: fromOklch,
    toLab: toLab, fromLab: fromLab, toLch: toLch, fromLch: fromLch, toLab65: toLab65, fromLab65: fromLab65,
    toHsl: toHsl, fromHsl: fromHsl, toHwb: toHwb, fromHwb: fromHwb,
    inGamut: inGamut, clip: clip, gamutMap: gamutMap, deltaEOK: deltaEOK, deltaE2000: deltaE2000,
    cssOklch: cssOklch, cssOklab: cssOklab, cssLab: cssLab, cssLch: cssLch, cssHwb: cssHwb, num: num
  };

  /* --- Contrast Grid ------------------------------------------------------- */

  Tools.register({
    id: 'contrast-grid', category: 'color', name: 'Contrast Grid',
    description: 'Check every foreground and background pairing in a palette against WCAG at once, instead of one pair at a time.',
    keywords: ['contrast', 'grid', 'matrix', 'palette', 'wcag', 'accessibility', 'a11y', 'aa', 'aaa', 'colour pairs', 'design system', 'ratio'],
    render: function (root) {
      root.classList.add('g-color');
      var input = el('textarea', { spellcheck: false, style: { minHeight: '120px', fontFamily: 'var(--mono)' }, value: '#ffffff\n#f6f7fb\n#14161f\n#5d6478\n#4f46e5\n#157f4a\n#b3261e\n#e0a94a' });
      var level = U.chips([{ value: '3', label: 'Show AA large (3:1) and up' }, { value: '4.5', label: 'AA (4.5:1) and up' }, { value: '7', label: 'AAA (7:1) only' }, { value: '0', label: 'Show everything' }], function () { draw(); }, '0');
      var host = el('div', { style: { overflow: 'auto' } });
      var summary = U.note('');
      function draw() {
        var colours = [];
        input.value.split(/[\n,;]+/).map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (s) { var c = parse(s); if (c && !colours.some(function (x) { return hex(x.c) === hex(c); })) colours.push({ c: c, label: s }); });
        if (colours.length < 2) { host.replaceChildren(U.note('Enter at least two colours, one per line (hex, rgb() or hsl()).')); summary.textContent = ''; return; }
        if (colours.length > 24) colours = colours.slice(0, 24);
        var min = parseFloat(level.value), pass = 0, total = 0, best = null;
        var table = el('table', { class: 'data', style: { borderCollapse: 'separate', borderSpacing: '3px' } });
        table.appendChild(el('thead', el('tr', {}, el('th', { text: 'text ↓ on bg →', style: { fontSize: '11px', color: 'var(--fg-muted)' } }), colours.map(function (b) { return el('th', { style: { fontSize: '11px' } }, el('i', { style: { display: 'block', height: '14px', background: hex(b.c), border: '1px solid var(--border)', borderRadius: '3px', marginBottom: '2px' } }), el('code', { text: hex(b.c) })); }))));
        var tbody = el('tbody');
        colours.forEach(function (fg) {
          var tr = el('tr', {}, el('th', { style: { fontSize: '11px', textAlign: 'left' } }, el('i', { style: { display: 'inline-block', width: '14px', height: '14px', verticalAlign: 'middle', background: hex(fg.c), border: '1px solid var(--border)', borderRadius: '3px', marginRight: '4px' } }), el('code', { text: hex(fg.c) })));
          colours.forEach(function (bg) {
            if (fg === bg) { tr.appendChild(el('td', { style: { background: 'var(--bg-sunken)' } })); return; }
            var r = contrast(fg.c, bg.c), grade = r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA L' : '✗';
            total++; if (r >= 4.5) pass++;
            if (!best || r > best.r) best = { r: r, fg: fg, bg: bg };
            var show = r >= min;
            tr.appendChild(el('td', { title: hex(fg.c) + ' on ' + hex(bg.c) + ': ' + r.toFixed(2) + ':1 · click to copy', style: { background: show ? hex(bg.c) : 'var(--bg-sunken)', color: show ? hex(fg.c) : 'var(--fg-muted)', textAlign: 'center', padding: '8px 6px', borderRadius: '5px', cursor: 'pointer', minWidth: '58px', opacity: show ? '1' : '.35' },
              onclick: function () { U.copy(hex(fg.c) + ' on ' + hex(bg.c) + ' = ' + r.toFixed(2) + ':1'); } },
              el('div', { style: { fontWeight: '700', fontSize: '14px' }, text: r.toFixed(1) }), el('div', { style: { fontSize: '10px', letterSpacing: '.5px' }, text: grade })));
          });
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        host.replaceChildren(table);
        summary.textContent = pass + ' of ' + total + ' pairings pass AA for normal text (4.5:1). ' + (best ? 'Strongest pair: ' + hex(best.fg.c) + ' on ' + hex(best.bg.c) + ' at ' + best.r.toFixed(2) + ':1.' : '');
        summary.dataset.pass = String(pass); summary.dataset.total = String(total);
      }
      input.addEventListener('input', U.debounce(draw, 150));
      draw();
      root.appendChild(U.panel('Palette', input, level, U.btnrow(U.button('Use this site\'s tokens', function () { var cs = getComputedStyle(document.documentElement); input.value = ['--bg', '--bg-elev', '--bg-sunken', '--fg', '--fg-muted', '--accent', '--ok', '--warn', '--err'].map(function (v) { return cs.getPropertyValue(v).trim(); }).join('\n'); draw(); }, 'ghost'),
        U.copyBtn('Copy as CSV', function () { var rows = []; host.querySelectorAll('tbody tr').forEach(function (tr) { rows.push(Array.prototype.map.call(tr.children, function (td) { return td.tagName === 'TH' ? td.textContent : (td.querySelector('div') ? td.querySelector('div').textContent : ''); }).join(',')); }); return rows.join('\n'); }))));
      root.appendChild(U.panel('Grid', summary, host, U.note('Each cell shows the row colour as text on the column colour as background, with its ratio. AA needs 4.5:1 for normal text and 3:1 for large text (18pt, or 14pt bold) and UI components; AAA needs 7:1.')));
    }
  });
})();
