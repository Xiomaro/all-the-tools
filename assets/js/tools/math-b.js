/* math-b tools: 3D shape volumes and areas, significant figures, probability
   distributions, simultaneous equations (exact fractions), complex numbers and
   modular arithmetic. Extends math.js and borrows its BigInt helpers
   (window.MathKit.big) and card styles (.g-mf). */
(function () {
  'use strict';
  var U = window.UI, el = U.el;
  var PI = Math.PI;

  /* ---- styling (scoped to .g-mb) ---------------------------------------- */
  if (!document.getElementById('g-mb-style')) {
    document.head.appendChild(el('style', { id: 'g-mb-style', text: [
      '.g-mb .scroll{overflow-x:auto;max-width:100%}',
      '.g-mb .mb-tabs{margin-bottom:12px}',
      '.g-mb .mb-diagram{display:flex;justify-content:center;align-items:center;background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--radius);padding:8px;min-height:190px}',
      '.g-mb .mb-diagram svg{width:100%;max-width:320px;height:auto;color:var(--fg)}',
      '.g-mb svg .edge{fill:none;stroke:currentColor;stroke-width:2;stroke-linejoin:round}',
      '.g-mb svg .thin{fill:none;stroke:currentColor;stroke-width:1.3}',
      '.g-mb svg .hid{fill:none;stroke:currentColor;stroke-width:1.2;stroke-dasharray:5 4;opacity:.55}',
      '.g-mb svg .face{fill:var(--accent);fill-opacity:.09;stroke:none}',
      '.g-mb svg .dim{fill:none;stroke:var(--accent);stroke-width:1.8}',
      '.g-mb svg .dimd{fill:none;stroke:var(--accent);stroke-width:1.5;stroke-dasharray:4 3}',
      '.g-mb svg .lbl{fill:var(--accent);font:700 15px var(--sans)}',
      '.g-mb svg .dot{fill:currentColor}',
      '.g-mb .mb-chart{background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--radius);padding:6px;margin-top:10px}',
      '.g-mb .mb-chart svg{width:100%;max-width:620px;margin:0 auto;height:auto;display:block;color:var(--fg)}',
      '.g-mb svg .curve{fill:none;stroke:currentColor;stroke-width:1.7}',
      '.g-mb svg .curve2{fill:none;stroke:var(--fg-muted);stroke-width:1.2;stroke-dasharray:4 3}',
      '.g-mb svg .shade{fill:var(--accent);fill-opacity:.38;stroke:none}',
      '.g-mb svg .axis{stroke:var(--fg-muted);stroke-width:1}',
      '.g-mb svg .grid{stroke:var(--border);stroke-width:1}',
      '.g-mb svg .tick{fill:var(--fg-muted);font:11px var(--sans)}',
      '.g-mb svg .bar{fill:var(--fg-muted);fill-opacity:.3}',
      '.g-mb svg .bar.hi{fill:var(--accent);fill-opacity:.85}',
      '.g-mb svg .vec{stroke:var(--accent);stroke-width:2;fill:none}',
      '.g-mb svg .pt{fill:var(--accent)}',
      '.g-mb svg .ptl{fill:currentColor;font:12px var(--mono)}',
      '.g-mb .mb-digits{font-family:var(--mono);font-size:1.7rem;display:flex;flex-wrap:wrap;align-items:baseline;gap:2px;margin:8px 0}',
      '.g-mb .mb-digits span{padding:1px 4px;border-radius:4px;border:1px solid transparent}',
      '.g-mb .mb-digits .sig{background:var(--accent-weak);border-color:var(--accent);color:var(--accent);font-weight:700}',
      '.g-mb .mb-digits .amb{border-color:var(--warn);border-style:dashed;color:var(--warn)}',
      '.g-mb .mb-digits .non{color:var(--fg-muted)}',
      '.g-mb .mb-digits .sym{color:var(--fg-muted);padding:1px 0}',
      '.g-mb .mb-legend{display:flex;flex-wrap:wrap;gap:12px;font-size:13px;color:var(--fg-muted)}',
      '.g-mb .mb-legend i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:5px;vertical-align:-1px;border:1px solid var(--border)}',
      '.g-mb .mb-rules{margin:6px 0 0;padding-left:20px;font-size:14px}',
      '.g-mb .mb-rules li{margin:3px 0}',
      '.g-mb .mb-kv{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:5px 14px;font-size:14px;margin:0}',
      '.g-mb .mb-kv dt{color:var(--fg-muted)}',
      '.g-mb .mb-kv dd{margin:0;font-family:var(--mono);word-break:break-word}',
      '.g-mb .mb-matrix{border-collapse:collapse;font-family:var(--mono);font-size:13px;margin:4px 0;border-left:2px solid var(--fg-muted);border-right:2px solid var(--fg-muted)}',
      '.g-mb .mb-matrix td{padding:2px 9px;text-align:right;white-space:nowrap}',
      '.g-mb .mb-matrix td.aug{border-left:1px solid var(--fg-muted)}',
      '.g-mb .mb-step{margin:10px 0}',
      '.g-mb .mb-step .op{font-family:var(--mono);font-weight:600}',
      '.g-mb .mb-coef{display:grid;gap:6px;align-items:center;min-width:max-content}',
      '.g-mb .mb-coef input{width:74px;font-family:var(--mono);padding:6px 7px}',
      '.g-mb .mb-coef span{text-align:center;color:var(--fg-muted);font-family:var(--mono)}',
      '.g-mb details summary{cursor:pointer;color:var(--fg-muted);font-weight:600;margin:6px 0}',
      '.g-mb .mb-sol{font-family:var(--mono);font-size:1.25rem;font-weight:700;margin:4px 0;word-break:break-word}',
      '.g-mb .mb-sol small{font-size:.85rem;font-weight:400;color:var(--fg-muted);margin-left:8px}',
      '.g-mb .mb-roots{font-family:var(--mono);margin:0;padding-left:22px}',
      '.g-mb .mb-crt{display:flex;flex-direction:column;gap:6px}',
      '.g-mb .mb-crt .row input{width:110px}',
      '.g-mb .mb-fn .chip{font-family:var(--mono)}'
    ].join('\n') }));
  }

  /* ---- helpers ------------------------------------------------------------ */
  function setRoot(root) { root.classList.add('g-mf', 'g-mb'); return root; }
  function numIn(label, value, attrs) {
    var input = el('input', Object.assign({ type: 'number', step: 'any' }, attrs || {}));
    input.value = value === undefined ? '' : String(value);
    var wrap = U.field(label, input);
    wrap.input = input;
    return wrap;
  }
  function textIn(label, value, attrs) {
    var input = el('input', Object.assign({ type: 'text', spellcheck: false, autocomplete: 'off' }, attrs || {}));
    input.value = value === undefined ? '' : String(value);
    var wrap = U.field(label, input);
    wrap.input = input;
    return wrap;
  }
  function val(w) {
    var s = String((w.input || w).value).trim().replace(/,/g, '').replace(/−/g, '-');
    if (s === '') return NaN;
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  }
  function selVal(w) { return w.querySelector('select').value; }
  function card(label, value, key, unit) {
    return el('div', { class: 'mf-card' }, el('span', { text: label }),
      el('b', null, el('span', { text: value, dataset: key ? { k: key } : undefined }), unit ? el('small', { text: ' ' + unit, style: { fontWeight: '400' } }) : null));
  }
  function tabs(list, onChange, initial) {
    var t = U.chips(list, onChange, initial);
    t.classList.add('mb-tabs');
    return t;
  }
  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '⁺' };
  function sup(s) { return String(s).split('').map(function (c) { return SUP[c] || c; }).join(''); }
  function minus(s) { return String(s).replace(/^-/, '−'); }
  /* A float for display: up to `sig` significant figures, no binary noise,
     powers of ten only for very large or small magnitudes. */
  function fmt(x, sig) {
    if (typeof x !== 'number' || isNaN(x)) return '—';
    if (!isFinite(x)) return x > 0 ? '∞' : '−∞';
    if (x === 0) return '0';
    sig = sig || 10;
    var ax = Math.abs(x);
    if (ax >= 1e15 || ax < 1e-6) {
      var parts = x.toExponential(sig - 1).split('e');
      return minus(parts[0].replace(/\.?0+$/, '')) + ' × 10' + sup(parseInt(parts[1], 10));
    }
    return minus(String(parseFloat(x.toPrecision(sig))));
  }
  function big(s) {
    s = String(s).trim().replace(/[\s,_]/g, '').replace(/−/g, '-');
    if (!/^[+-]?\d+$/.test(s)) return null;
    try { return BigInt(s); } catch (e) { return null; }
  }
  function babs(n) { return n < 0n ? -n : n; }
  function bgcd(a, b) { a = babs(a); b = babs(b); while (b) { var t = a % b; a = b; b = t; } return a; }

  /* ---- numerical kernels (checked against exact closed forms: erf and
     Phi to ~1e-15, AS241 round trip < 1e-12 down to p = 1e-300, Student t
     against the exact integer-df series) ----------------------------------- */
  var LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function lgamma(x) {
    if (x < 0.5) return Math.log(PI / Math.abs(Math.sin(PI * x))) - lgamma(1 - x);
    x -= 1;
    var a = LANCZOS[0], t = x + 7.5;
    for (var i = 1; i < 9; i++) a += LANCZOS[i] / (x + i);
    return 0.5 * Math.log(2 * PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  /* erf by its everywhere-convergent positive series (no cancellation);
     erfc by Lentz's continued fraction in the tail, where 1 - erf would lose
     every significant digit. */
  function erfSeries(x) {
    var x2 = x * x, term = x, sum = x;
    for (var n = 1; n < 500; n++) {
      term *= 2 * x2 / (2 * n + 1);
      sum += term;
      if (term < sum * 1e-17) break;
    }
    return 2 / Math.sqrt(PI) * Math.exp(-x2) * sum;
  }
  function erfcFrac(x) {
    var tiny = 1e-300, f = x, C = x, D = 0;
    for (var n = 1; n < 5000; n++) {
      var an = n / 2;
      D = x + an * D; if (Math.abs(D) < tiny) D = tiny;
      C = x + an / C; if (Math.abs(C) < tiny) C = tiny;
      D = 1 / D;
      var delta = C * D;
      f *= delta;
      if (Math.abs(delta - 1) < 3e-16) break;
    }
    return Math.exp(-x * x) / Math.sqrt(PI) / f;
  }
  function erfc(x) {
    if (x < 0) return 2 - erfc(-x);
    return x < 2 ? 1 - erfSeries(x) : erfcFrac(x);
  }
  function normCdf(z) { return 0.5 * erfc(-z / Math.SQRT2); }
  function normPdf(z) { return Math.exp(-0.5 * z * z) / Math.sqrt(2 * PI); }

  /* Wichura's algorithm AS241 (PPND16): the inverse normal to ~1e-16. */
  function poly(c, x) { var r = 0; for (var i = c.length - 1; i >= 0; i--) r = r * x + c[i]; return r; }
  var AS_A = [3.3871328727963666080e0, 1.3314166789178437745e+2, 1.9715909503065514427e+3, 1.3731693765509461125e+4,
    4.5921953931549871457e+4, 6.7265770927008700853e+4, 3.3430575583588128105e+4, 2.5090809287301226727e+3];
  var AS_B = [1, 4.2313330701600911252e+1, 6.8718700749205790830e+2, 5.3941960214247511077e+3,
    2.1213794301586595867e+4, 3.9307895800092710610e+4, 2.8729085735721942674e+4, 5.2264952788528545610e+3];
  var AS_C = [1.42343711074968357734e0, 4.63033784615654529590e0, 5.76949722146069140550e0, 3.64784832476320460504e0,
    1.27045825245236838258e0, 2.41780725177450611770e-1, 2.27238449892691845833e-2, 7.74545014278341407640e-4];
  var AS_D = [1, 2.05319162663775882187e0, 1.67638483018380384940e0, 6.89767334985100004550e-1,
    1.48103976427480074590e-1, 1.51986665636164571966e-2, 5.47593808499534494600e-4, 1.05075007164441684324e-9];
  var AS_E = [6.65790464350110377720e0, 5.46378491116411436990e0, 1.78482653991729133580e0, 2.96560571828504891230e-1,
    2.65321895265761230930e-2, 1.24266094738807843860e-3, 2.71155556874348757815e-5, 2.01033439929228813265e-7];
  var AS_F = [1, 5.99832206555887937690e-1, 1.36929880922735805310e-1, 1.48753612908506148525e-2,
    7.86869131145613259100e-4, 1.84631831751005468180e-5, 1.42151175831644588870e-7, 2.04426310338993978564e-15];
  function normInv(p) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    var q = p - 0.5, r, x;
    if (Math.abs(q) <= 0.425) {
      r = 0.180625 - q * q;
      return q * poly(AS_A, r) / poly(AS_B, r);
    }
    r = Math.sqrt(-Math.log(q < 0 ? p : 1 - p));
    if (r <= 5) { r -= 1.6; x = poly(AS_C, r) / poly(AS_D, r); }
    else { r -= 5; x = poly(AS_E, r) / poly(AS_F, r); }
    return q < 0 ? -x : x;
  }

  /* Regularised incomplete beta I_x(a, b) by its continued fraction
     (modified Lentz). The complement is computed directly so that tiny
     tails keep their relative precision. */
  function betacf(a, b, x) {
    var tiny = 1e-300, qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < tiny) d = tiny;
    d = 1 / d;
    var h = d;
    for (var m = 1; m <= 20000; m++) {
      var m2 = 2 * m, aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny;
      c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny;
      c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny;
      d = 1 / d;
      var del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 3e-16) break;
    }
    return h;
  }
  function lbetaPart(x, a, b) { return lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x); }
  function ibeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    if (x < (a + 1) / (a + b + 2)) return Math.exp(lbetaPart(x, a, b)) * betacf(a, b, x) / a;
    return 1 - Math.exp(lbetaPart(x, a, b)) * betacf(b, a, 1 - x) / b;
  }
  /* Regularised incomplete gamma P(a, x) and Q(a, x) = 1 - P. */
  function gser(a, x) {
    var ap = a, sum = 1 / a, del = sum;
    for (var n = 0; n < 100000; n++) { ap += 1; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-17) break; }
    return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
  }
  function gcf(a, x) {
    var tiny = 1e-300, b = x + 1 - a, c = 1 / tiny, d = 1 / b, h = d;
    for (var i = 1; i < 100000; i++) {
      var an = -i * (i - a);
      b += 2;
      d = an * d + b; if (Math.abs(d) < tiny) d = tiny;
      c = b + an / c; if (Math.abs(c) < tiny) c = tiny;
      d = 1 / d;
      var del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 3e-16) break;
    }
    return Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
  }
  function gammaP(a, x) { if (x <= 0) return 0; return x < a + 1 ? gser(a, x) : 1 - gcf(a, x); }
  function gammaQ(a, x) { if (x <= 0) return 1; return x < a + 1 ? 1 - gser(a, x) : gcf(a, x); }
  /* Student's t distribution. */
  function tCdf(t, v) {
    if (!isFinite(t)) return t > 0 ? 1 : 0;
    var tail = 0.5 * ibeta(v / (v + t * t), v / 2, 0.5);
    return t > 0 ? 1 - tail : tail;
  }
  function tPdf(t, v) { return Math.exp(lgamma((v + 1) / 2) - lgamma(v / 2) - 0.5 * Math.log(v * PI) - (v + 1) / 2 * Math.log(1 + t * t / v)); }
  function tInv(p, v) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p === 0.5) return 0;
    if (p < 0.5) return -tInv(1 - p, v);
    if (v === 1) return Math.tan(PI * (p - 0.5));
    if (v === 2) return (2 * p - 1) / Math.sqrt(2 * p * (1 - p));
    /* bracket the root, then Newton steps kept inside the bracket */
    var lo = 0, hi = Math.max(1, normInv(p) * 2);
    while (tCdf(hi, v) < p && hi < 1e300) { lo = hi; hi *= 2; }
    var t = Math.min(hi, Math.max(lo, normInv(p)));
    for (var i = 0; i < 200; i++) {
      var f = tCdf(t, v) - p;
      if (f > 0) hi = t; else lo = t;
      var next = t - f / tPdf(t, v);
      if (!(next > lo && next < hi)) next = (lo + hi) / 2;
      if (Math.abs(next - t) <= 1e-15 * Math.max(1, Math.abs(t))) { t = next; break; }
      t = next;
    }
    return t;
  }

  /* ======================================================================= */
  /* 3D Shape Volume & Surface Area                                          */
  /* ======================================================================= */
  var LEN_UNITS = { mm: 0.001, cm: 0.01, m: 1, in: 0.0254, ft: 0.3048 };

  /* Carlson's symmetric elliptic integrals R_F and R_D (duplication method),
     used for the exact surface area of a general ellipsoid. */
  function carlsonRF(x, y, z) {
    var xt = x, yt = y, zt = z, ave, dx, dy, dz;
    for (var i = 0; i < 200; i++) {
      var sx = Math.sqrt(xt), sy = Math.sqrt(yt), sz = Math.sqrt(zt), lam = sx * (sy + sz) + sy * sz;
      xt = 0.25 * (xt + lam); yt = 0.25 * (yt + lam); zt = 0.25 * (zt + lam);
      ave = (xt + yt + zt) / 3;
      dx = (ave - xt) / ave; dy = (ave - yt) / ave; dz = (ave - zt) / ave;
      if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) < 0.0008) break;
    }
    var e2 = dx * dy - dz * dz, e3 = dx * dy * dz;
    return (1 + (e2 / 24 - 0.1 - 3 / 44 * e3) * e2 + e3 / 14) / Math.sqrt(ave);
  }
  function carlsonRD(x, y, z) {
    var xt = x, yt = y, zt = z, sum = 0, fac = 1, ave, dx, dy, dz;
    for (var i = 0; i < 200; i++) {
      var sx = Math.sqrt(xt), sy = Math.sqrt(yt), sz = Math.sqrt(zt), lam = sx * (sy + sz) + sy * sz;
      sum += fac / (sz * (zt + lam));
      fac *= 0.25;
      xt = 0.25 * (xt + lam); yt = 0.25 * (yt + lam); zt = 0.25 * (zt + lam);
      ave = 0.2 * (xt + yt + 3 * zt);
      dx = (ave - xt) / ave; dy = (ave - yt) / ave; dz = (ave - zt) / ave;
      if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) < 0.0008) break;
    }
    var C1 = 3 / 14, C2 = 1 / 6, C3 = 9 / 22, C4 = 3 / 26, C5 = 0.25 * C3, C6 = 1.5 * C4;
    var ea = dx * dy, eb = dz * dz, ec = ea - eb, ed = ea - 6 * eb, ee = ed + ec + ec;
    return 3 * sum + fac * (1 + ed * (-C1 + C5 * ed - C6 * dz * ee) + dz * (C2 * ee + dz * (-C3 * ec + dz * C4 * ea))) / (ave * Math.sqrt(ave));
  }
  /* Exact ellipsoid surface area through Legendre's form in Carlson integrals
     (matches the closed forms for spheroids to 15 digits). */
  function ellipsoidArea(a, b, c) {
    var s = [a, b, c].sort(function (p, q) { return q - p; });
    a = s[0]; b = s[1]; c = s[2];
    if (a - c <= 1e-12 * a) return 4 * PI * a * a;
    var cosp = c / a, sinp = Math.sqrt(1 - cosp * cosp);
    var k2 = a * a * (b * b - c * c) / (b * b * (a * a - c * c));
    var x = cosp * cosp, y = 1 - k2 * sinp * sinp;
    var F = sinp * carlsonRF(x, y, 1);
    var E = F - k2 * sinp * sinp * sinp * carlsonRD(x, y, 1) / 3;
    return 2 * PI * c * c + 2 * PI * a * b / sinp * (E * sinp * sinp + F * cosp * cosp);
  }

  /* Each shape: dimensions [key, label, default, zeroAllowed], a calc that
     returns volume V, surface area A and extra measurements [label, value,
     1 = length | 2 = area], the formulas, and an SVG diagram. */
  var SHAPES = [
    { id: 'sphere', name: 'Sphere', dims: [['r', 'Radius r', 3]],
      calc: function (d) { return { V: 4 / 3 * PI * Math.pow(d.r, 3), A: 4 * PI * d.r * d.r, extra: [['Diameter', 2 * d.r, 1]] }; },
      formulas: 'V = ⁴⁄₃πr³   ·   A = 4πr²',
      svg: '<circle class="face" cx="120" cy="95" r="72"/><circle class="edge" cx="120" cy="95" r="72"/>' +
        '<path class="hid" d="M48 95A72 18 0 0 1 192 95"/><path class="thin" d="M48 95A72 18 0 0 0 192 95"/>' +
        '<line class="dim" x1="120" y1="95" x2="192" y2="95"/><circle class="dot" cx="120" cy="95" r="3"/><text class="lbl" x="150" y="88">r</text>' },
    { id: 'hemisphere', name: 'Hemisphere', dims: [['r', 'Radius r', 3]],
      calc: function (d) { var r = d.r; return { V: 2 / 3 * PI * r * r * r, A: 3 * PI * r * r, extra: [['Curved surface', 2 * PI * r * r, 2], ['Flat base', PI * r * r, 2]] }; },
      formulas: 'V = ⅔πr³   ·   A = 3πr² (curved 2πr² + base πr²)',
      svg: '<path class="face" d="M48 135A72 72 0 0 1 192 135A72 18 0 0 1 48 135Z"/><path class="edge" d="M48 135A72 72 0 0 1 192 135"/>' +
        '<path class="hid" d="M48 135A72 18 0 0 1 192 135"/><path class="edge" d="M48 135A72 18 0 0 0 192 135"/>' +
        '<line class="dim" x1="120" y1="135" x2="192" y2="135"/><circle class="dot" cx="120" cy="135" r="3"/><text class="lbl" x="150" y="128">r</text>' },
    { id: 'cube', name: 'Cube', dims: [['a', 'Edge a', 2]],
      calc: function (d) { var a = d.a; return { V: a * a * a, A: 6 * a * a, extra: [['Face diagonal', a * Math.SQRT2, 1], ['Space diagonal', a * Math.sqrt(3), 1]] }; },
      formulas: 'V = a³   ·   A = 6a²',
      svg: '<path class="face" d="M60 160H150V70H60Z"/><path class="edge" d="M60 160H150V70H60Z M60 70L100 30H190L150 70 M190 30V120L150 160"/>' +
        '<path class="hid" d="M60 160L100 120H190 M100 120V30"/><text class="lbl" x="100" y="180">a</text><text class="lbl" x="40" y="120">a</text><text class="lbl" x="175" y="152">a</text>' },
    { id: 'cuboid', name: 'Cuboid', dims: [['l', 'Length l', 4], ['w', 'Width w', 3], ['h', 'Height h', 2]],
      calc: function (d) { return { V: d.l * d.w * d.h, A: 2 * (d.l * d.w + d.l * d.h + d.w * d.h), extra: [['Space diagonal', Math.sqrt(d.l * d.l + d.w * d.w + d.h * d.h), 1]] }; },
      formulas: 'V = lwh   ·   A = 2(lw + lh + wh)',
      svg: '<path class="face" d="M35 160H165V95H35Z"/><path class="edge" d="M35 160H165V95H35Z M35 95L80 55H210L165 95 M210 55V120L165 160"/>' +
        '<path class="hid" d="M35 160L80 120H210 M80 120V55"/><text class="lbl" x="95" y="180">l</text><text class="lbl" x="18" y="133">h</text><text class="lbl" x="192" y="150">w</text>' },
    { id: 'cylinder', name: 'Cylinder', dims: [['r', 'Radius r', 2], ['h', 'Height h', 5]],
      calc: function (d) { var r = d.r, h = d.h; return { V: PI * r * r * h, A: 2 * PI * r * (r + h), extra: [['Curved surface', 2 * PI * r * h, 2], ['Each end', PI * r * r, 2]] }; },
      formulas: 'V = πr²h   ·   A = 2πr(r + h)',
      svg: '<path class="face" d="M60 40V150A60 15 0 0 0 180 150V40Z"/><ellipse class="edge" cx="120" cy="40" rx="60" ry="15"/><path class="edge" d="M60 40V150M180 40V150"/>' +
        '<path class="edge" d="M60 150A60 15 0 0 0 180 150"/><path class="hid" d="M60 150A60 15 0 0 1 180 150"/>' +
        '<line class="dim" x1="120" y1="40" x2="180" y2="40"/><circle class="dot" cx="120" cy="40" r="3"/><text class="lbl" x="146" y="34">r</text>' +
        '<path class="dim" d="M200 40V150M195 40H205M195 150H205"/><text class="lbl" x="210" y="100">h</text>' },
    { id: 'cone', name: 'Cone', dims: [['r', 'Radius r', 3], ['h', 'Height h', 4]],
      calc: function (d) { var r = d.r, h = d.h, l = Math.sqrt(r * r + h * h); return { V: PI * r * r * h / 3, A: PI * r * (r + l), extra: [['Slant height l', l, 1], ['Curved surface', PI * r * l, 2], ['Base', PI * r * r, 2]] }; },
      formulas: 'V = ⅓πr²h   ·   A = πr(r + l), where l = √(r² + h²)',
      svg: '<path class="face" d="M120 25L55 155A65 16 0 0 0 185 155Z"/><path class="edge" d="M55 155L120 25L185 155"/><path class="edge" d="M55 155A65 16 0 0 0 185 155"/>' +
        '<path class="hid" d="M55 155A65 16 0 0 1 185 155"/><line class="dimd" x1="120" y1="25" x2="120" y2="155"/><line class="dim" x1="120" y1="155" x2="185" y2="155"/>' +
        '<text class="lbl" x="104" y="100">h</text><text class="lbl" x="148" y="150">r</text><text class="lbl" x="160" y="85">l</text>' },
    { id: 'frustum', name: 'Frustum (truncated cone)', dims: [['R', 'Bottom radius R', 4], ['r', 'Top radius r', 2, true], ['h', 'Height h', 3]],
      calc: function (d) { var R = d.R, r = d.r, h = d.h, l = Math.sqrt((R - r) * (R - r) + h * h); return { V: PI * h * (R * R + R * r + r * r) / 3, A: PI * (R + r) * l + PI * (R * R + r * r), extra: [['Slant height l', l, 1], ['Curved surface', PI * (R + r) * l, 2], ['Bottom', PI * R * R, 2], ['Top', PI * r * r, 2]] }; },
      formulas: 'V = ⅓πh(R² + Rr + r²)   ·   A = π(R + r)l + πR² + πr², where l = √((R − r)² + h²)',
      svg: '<path class="face" d="M85 50L50 150A70 17 0 0 0 190 150L155 50Z"/><ellipse class="edge" cx="120" cy="50" rx="35" ry="9"/><path class="edge" d="M85 50L50 150M155 50L190 150"/>' +
        '<path class="edge" d="M50 150A70 17 0 0 0 190 150"/><path class="hid" d="M50 150A70 17 0 0 1 190 150"/>' +
        '<line class="dim" x1="120" y1="50" x2="155" y2="50"/><line class="dim" x1="120" y1="150" x2="190" y2="150"/><text class="lbl" x="133" y="44">r</text><text class="lbl" x="150" y="145">R</text>' +
        '<path class="dim" d="M210 50V150M205 50H215M205 150H215"/><text class="lbl" x="218" y="105">h</text>' },
    { id: 'sqpyramid', name: 'Square pyramid', dims: [['a', 'Base edge a', 4], ['h', 'Height h', 6]],
      calc: function (d) { var a = d.a, h = d.h, s = Math.sqrt(h * h + a * a / 4); return { V: a * a * h / 3, A: a * a + 2 * a * s, extra: [['Slant height of a face', s, 1], ['Edge to apex', Math.sqrt(h * h + a * a / 2), 1], ['Sloping faces', 2 * a * s, 2]] }; },
      formulas: 'V = ⅓a²h   ·   A = a² + 2as, where s = √(h² + (a/2)²)',
      svg: '<path class="face" d="M50 150H160L195 115L122 25Z"/><path class="edge" d="M50 150H160L195 115M122 25L50 150M122 25L160 150M122 25L195 115"/>' +
        '<path class="hid" d="M195 115H85L50 150M122 25L85 115"/><line class="dimd" x1="122" y1="25" x2="122" y2="132"/><text class="lbl" x="104" y="95">h</text><text class="lbl" x="100" y="172">a</text>' },
    { id: 'rectpyramid', name: 'Rectangular pyramid', dims: [['l', 'Base length l', 6], ['w', 'Base width w', 4], ['h', 'Height h', 5]],
      calc: function (d) { var l = d.l, w = d.w, h = d.h, sl = Math.sqrt(h * h + w * w / 4), sw = Math.sqrt(h * h + l * l / 4); return { V: l * w * h / 3, A: l * w + l * sl + w * sw, extra: [['Slant height of the l faces', sl, 1], ['Slant height of the w faces', sw, 1], ['Edge to apex', Math.sqrt(h * h + l * l / 4 + w * w / 4), 1]] }; },
      formulas: 'V = ⅓lwh   ·   A = lw + l√(h² + (w/2)²) + w√(h² + (l/2)²)',
      svg: '<path class="face" d="M35 150H175L205 120L120 25Z"/><path class="edge" d="M35 150H175L205 120M120 25L35 150M120 25L175 150M120 25L205 120"/>' +
        '<path class="hid" d="M205 120H65L35 150M120 25L65 120"/><line class="dimd" x1="120" y1="25" x2="120" y2="135"/><text class="lbl" x="102" y="95">h</text><text class="lbl" x="100" y="172">l</text><text class="lbl" x="195" y="148">w</text>' },
    { id: 'triprism', name: 'Triangular prism', dims: [['a', 'Triangle side a', 3], ['b', 'Triangle side b', 4], ['c', 'Triangle side c', 5], ['l', 'Length l', 10]],
      calc: function (d) {
        var a = d.a, b = d.b, c = d.c, s = (a + b + c) / 2, t = s * (s - a) * (s - b) * (s - c);
        if (!(t > 0)) return { error: 'Those sides do not make a triangle: each side must be shorter than the other two together.' };
        var area = Math.sqrt(t);
        return { V: area * d.l, A: 2 * area + (a + b + c) * d.l, extra: [['Triangle area (Heron)', area, 2], ['Three rectangular faces', (a + b + c) * d.l, 2]] };
      },
      formulas: 'V = (triangle area) × l   ·   A = 2 × triangle area + (a + b + c)l',
      svg: '<path class="face" d="M40 160H130L70 80Z"/><path class="edge" d="M40 160H130L70 80Z M70 80L140 40L200 120L130 160"/><path class="hid" d="M40 160L110 120L200 120M110 120L140 40"/>' +
        '<text class="lbl" x="80" y="180">a</text><text class="lbl" x="105" y="112">b</text><text class="lbl" x="38" y="118">c</text><text class="lbl" x="172" y="152">l</text>' },
    { id: 'torus', name: 'Torus', dims: [['R', 'Ring radius R (centre to tube centre)', 5], ['r', 'Tube radius r', 2]],
      calc: function (d) {
        if (d.r > d.R) return { error: 'The tube radius r cannot be larger than the ring radius R (the torus would pass through itself).' };
        return { V: 2 * PI * PI * d.R * d.r * d.r, A: 4 * PI * PI * d.R * d.r, extra: [['Outer diameter', 2 * (d.R + d.r), 1], ['Hole diameter', 2 * (d.R - d.r), 1]] };
      },
      formulas: 'V = 2π²Rr²   ·   A = 4π²Rr',
      svg: '<ellipse class="face" cx="120" cy="95" rx="100" ry="48"/><ellipse class="edge" cx="120" cy="95" rx="100" ry="48"/>' +
        '<path class="edge" d="M72 90Q120 118 168 90"/><path class="edge" d="M84 98Q120 80 156 98"/>' +
        '<line class="dim" x1="120" y1="95" x2="195" y2="95"/><line class="dim" x1="195" y1="95" x2="220" y2="95"/><circle class="dot" cx="120" cy="95" r="3"/><circle class="dot" cx="195" cy="95" r="2.5"/>' +
        '<text class="lbl" x="170" y="88">R</text><text class="lbl" x="202" y="88">r</text>' },
    { id: 'ellipsoid', name: 'Ellipsoid', dims: [['a', 'Semi-axis a', 3], ['b', 'Semi-axis b', 2], ['c', 'Semi-axis c', 1]],
      calc: function (d) { return { V: 4 / 3 * PI * d.a * d.b * d.c, A: ellipsoidArea(d.a, d.b, d.c) }; },
      formulas: 'V = ⁴⁄₃πabc   ·   A computed exactly with Carlson\'s elliptic integrals',
      svg: '<ellipse class="face" cx="120" cy="95" rx="98" ry="58"/><ellipse class="edge" cx="120" cy="95" rx="98" ry="58"/>' +
        '<path class="hid" d="M22 95A98 24 0 0 1 218 95"/><path class="thin" d="M22 95A98 24 0 0 0 218 95"/>' +
        '<line class="dim" x1="120" y1="95" x2="218" y2="95"/><line class="dim" x1="120" y1="95" x2="120" y2="37"/><line class="dim" x1="120" y1="95" x2="92" y2="118"/><circle class="dot" cx="120" cy="95" r="3"/>' +
        '<text class="lbl" x="165" y="88">a</text><text class="lbl" x="84" y="136">b</text><text class="lbl" x="126" y="62">c</text>' },
    { id: 'capsule', name: 'Capsule', dims: [['r', 'Radius r', 1], ['a', 'Length of the straight part a', 2, true]],
      calc: function (d) { var r = d.r, a = d.a; return { V: PI * r * r * a + 4 / 3 * PI * r * r * r, A: 2 * PI * r * a + 4 * PI * r * r, extra: [['Overall length', a + 2 * r, 1]] }; },
      formulas: 'V = πr²a + ⁴⁄₃πr³   ·   A = 2πra + 4πr²',
      svg: '<path class="face" d="M75 55H165A40 40 0 0 1 165 135H75A40 40 0 0 1 75 55Z"/><path class="edge" d="M75 55H165A40 40 0 0 1 165 135H75A40 40 0 0 1 75 55Z"/>' +
        '<path class="hid" d="M75 55V135M165 55V135"/><path class="dim" d="M75 152H165M75 147V157M165 147V157"/><text class="lbl" x="115" y="172">a</text>' +
        '<line class="dim" x1="165" y1="95" x2="205" y2="95"/><circle class="dot" cx="165" cy="95" r="3"/><text class="lbl" x="180" y="88">r</text>' }
  ];

  Tools.register({
    id: 'shape-calculator', category: 'math', name: '3D Shape Volume & Surface Area',
    description: 'Volume, surface area and other measurements of 13 solids, from spheres and cones to frustums, tori and ellipsoids, in mm, cm, m, inches or feet, with the volume in litres too.',
    keywords: ['volume', 'surface area', '3d shape', 'solid', 'sphere', 'hemisphere', 'cube', 'cuboid', 'box', 'cylinder', 'cone', 'frustum',
      'pyramid', 'prism', 'torus', 'doughnut', 'donut', 'ellipsoid', 'capsule', 'litres', 'liters', 'capacity', 'geometry', 'mensuration'],
    render: function (root) {
      setRoot(root);
      var shape = SHAPES[0];
      var memory = {};   /* dimension values kept per shape while switching */
      var picker = U.chips(SHAPES.map(function (s) { return { value: s.id, label: s.name }; }), function (id) {
        shape = SHAPES.filter(function (s) { return s.id === id; })[0];
        buildInputs();
      }, 'sphere');
      picker.dataset.k = 'shapes';
      var unit = U.select({ label: 'Units', value: 'cm', options: [
        { value: 'mm', label: 'Millimetres (mm)' }, { value: 'cm', label: 'Centimetres (cm)' }, { value: 'm', label: 'Metres (m)' },
        { value: 'in', label: 'Inches (in)' }, { value: 'ft', label: 'Feet (ft)' }] });
      unit.querySelector('select').addEventListener('change', run);
      var dimsBox = el('div', { class: 'row' });
      var inputs = {};
      var diagram = el('div', { class: 'mb-diagram', role: 'img' });
      var formulas = U.note('');
      var out = el('div');

      function buildInputs() {
        dimsBox.replaceChildren();
        inputs = {};
        var mem = memory[shape.id] || {};
        shape.dims.forEach(function (d) {
          var w = numIn(d[1], mem[d[0]] !== undefined ? mem[d[0]] : d[2], { min: 0, dataset: { dim: d[0] } });
          w.input.addEventListener('input', run);
          inputs[d[0]] = w;
          dimsBox.appendChild(w);
        });
        diagram.innerHTML = '<svg viewBox="0 0 240 190" aria-hidden="true">' + shape.svg + '</svg>';
        diagram.setAttribute('aria-label', 'Diagram of a ' + shape.name.toLowerCase());
        formulas.textContent = shape.formulas;
        run();
      }
      function run() {
        out.replaceChildren();
        var u = selVal(unit), f = LEN_UNITS[u], d = {}, bad = null;
        memory[shape.id] = memory[shape.id] || {};
        shape.dims.forEach(function (dim) {
          var v = val(inputs[dim[0]]);
          memory[shape.id][dim[0]] = inputs[dim[0]].input.value;
          if (isNaN(v) || v < 0 || (v === 0 && !dim[3])) bad = bad || dim[1];
          d[dim[0]] = v;
        });
        if (bad) { out.appendChild(U.note('Enter a positive number for ' + bad.replace(/ [a-zA-Z]$/, '') + '.', 'err')); return; }
        var r = shape.calc(d);
        if (r.error) { out.appendChild(U.note(r.error, 'err')); return; }
        var m3 = r.V * f * f * f, litres = m3 * 1000;
        var cards = [
          card('Volume', fmt(r.V, 8), 'volume', u + '³'),
          card('Volume in litres', fmt(litres, 8), 'litres', 'L'),
          card('Surface area', fmt(r.A, 8), 'area', u + '²')
        ];
        (r.extra || []).forEach(function (x) { cards.push(card(x[0], fmt(x[1], 8), null, x[2] === 2 ? u + '²' : u)); });
        out.appendChild(el('div', { class: 'mf-grid' }, cards));
        out.appendChild(U.note('Also: ' + fmt(m3, 6) + ' m³ · ' + fmt(litres * 1000, 6) + ' ml · ' + fmt(litres / 4.54609, 6) + ' UK gallons · ' +
          fmt(litres / 3.785411784, 6) + ' US gallons · surface ' + fmt(r.A * f * f, 6) + ' m²'));
      }
      root.appendChild(U.panel('Shape', picker));
      root.appendChild(U.split(
        U.panel('Dimensions', U.row(unit), dimsBox, formulas),
        U.panel('Diagram', diagram)));
      root.appendChild(U.panel('Results', out));
      buildInputs();
    }
  });

  /* ======================================================================= */
  /* Significant Figures & Scientific Notation                               */
  /* ======================================================================= */
  /* Exact decimals: { neg, c, e } means (neg ? -1 : 1) × c × 10^e with c a
     non-negative BigInt. All rounding is integer arithmetic on c, so there are
     no binary floating-point artefacts (1.005 to 2 d.p. really is 1.01). */
  var SUP_IN = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+' };
  function readNumber(src) {
    var s = String(src).trim().replace(/[−–]/g, '-')
      .replace(/10\s*([⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+)/g, function (_, e) { return '10^' + e.replace(/./g, function (c) { return SUP_IN[c]; }); })
      .replace(/(\d)[\s,  _](?=\d)/g, '$1')
      .replace(/\s+/g, ' ');
    var m = /^([+-]?)(\d*)(?:\.(\d*))?(?:\s*(?:[eE]\s*([+-]?\d+)|[×xX*·]\s*10\s*(?:\^|\*\*)\s*\(?\s*([+-]?\d+)\s*\)?))?$/.exec(s);
    if (!m || (m[2] === '' && !m[3])) return null;
    var fracS = m[3] === undefined ? null : m[3];
    var expS = m[4] !== undefined ? m[4] : m[5];
    var pow = expS !== undefined ? parseInt(expS, 10) : 0;
    if (Math.abs(pow) > 5000 || (m[2] + (fracS || '')).length > 2000) return { tooBig: true };
    return {
      neg: m[1] === '-', intS: m[2], fracS: fracS, point: fracS !== null, sci: expS !== undefined, pow: pow,
      c: BigInt(m[2] + (fracS || '') || '0'), e: pow - (fracS ? fracS.length : 0)
    };
  }
  function pow10(k) { return 10n ** BigInt(k); }
  function ndig(c) { return c === 0n ? 1 : c.toString().length; }
  function dec(neg, c, e) { return { neg: neg && c !== 0n, c: c, e: e }; }
  /* Drop the last k digits of c, rounding half up (away from zero) or half to even. */
  function dropDigits(c, k, mode) {
    var p = pow10(k), q = c / p, r = c % p, half = 5n * pow10(k - 1);
    if (r > half || (r === half && (mode !== 'even' || q % 2n === 1n))) q += 1n;
    return q;
  }
  function roundSig(x, n, mode) {
    if (x.c === 0n) return x;
    var L = ndig(x.c);
    if (L <= n) return dec(x.neg, x.c * pow10(n - L), x.e - (n - L));
    var q = dropDigits(x.c, L - n, mode), e = x.e + L - n;
    if (ndig(q) > n) { q /= 10n; e += 1; }
    return dec(x.neg, q, e);
  }
  function roundPlace(x, place, mode) {   /* round to a multiple of 10^place */
    if (x.e >= place) return dec(x.neg, x.c * pow10(x.e - place), place);
    return dec(x.neg, dropDigits(x.c, place - x.e, mode), place);
  }
  function stripZeros(x) {
    var c = x.c, e = x.e;
    if (c === 0n) return dec(false, 0n, 0);
    while (c % 10n === 0n) { c /= 10n; e += 1; }
    return dec(x.neg, c, e);
  }
  function toPlain(x) {
    var s = x.c.toString(), out;
    if (x.c === 0n) out = x.e < 0 ? '0.' + '0'.repeat(-x.e) : '0';
    else if (x.e >= 0) out = s + '0'.repeat(x.e);
    else {
      var k = -x.e;
      if (s.length <= k) s = '0'.repeat(k - s.length + 1) + s;
      out = s.slice(0, s.length - k) + '.' + s.slice(s.length - k);
    }
    return (x.neg ? '-' : '') + out;
  }
  function sciParts(x) {
    var s = x.c.toString();
    return { mant: (x.neg ? '-' : '') + s[0] + (s.length > 1 ? '.' + s.slice(1) : ''), exp: x.e + s.length - 1 };
  }
  function toSci(x) { if (x.c === 0n) return '0'; var p = sciParts(x); return p.mant + ' × 10' + sup(p.exp); }
  function toENote(x) { if (x.c === 0n) return '0E+0'; var p = sciParts(x); return p.mant + 'E' + (p.exp < 0 ? '-' : '+') + Math.abs(p.exp); }
  var PREFIX = { '-30': 'q (quecto)', '-27': 'r (ronto)', '-24': 'y (yocto)', '-21': 'z (zepto)', '-18': 'a (atto)', '-15': 'f (femto)', '-12': 'p (pico)',
    '-9': 'n (nano)', '-6': 'µ (micro)', '-3': 'm (milli)', '0': 'no prefix', '3': 'k (kilo)', '6': 'M (mega)', '9': 'G (giga)', '12': 'T (tera)',
    '15': 'P (peta)', '18': 'E (exa)', '21': 'Z (zetta)', '24': 'Y (yotta)', '27': 'R (ronna)', '30': 'Q (quetta)' };
  function toEng(x) {
    if (x.c === 0n) return { text: '0', prefix: '' };
    var s = x.c.toString(), exp = x.e + s.length - 1, e3 = Math.floor(exp / 3) * 3, lead = exp - e3 + 1;
    if (s.length < lead) s += '0'.repeat(lead - s.length);
    return { text: (x.neg ? '-' : '') + s.slice(0, lead) + (s.length > lead ? '.' + s.slice(lead) : '') + ' × 10' + sup(e3), prefix: PREFIX[e3] || '' };
  }
  function decAdd(a, b) {
    var e = Math.min(a.e, b.e);
    var s = (a.neg ? -1n : 1n) * a.c * pow10(a.e - e) + (b.neg ? -1n : 1n) * b.c * pow10(b.e - e);
    return dec(s < 0n, s < 0n ? -s : s, e);
  }
  function decMul(a, b) { return dec(a.neg !== b.neg, a.c * b.c, a.e + b.e); }
  function decDiv(a, b, digits) {
    if (b.c === 0n) throw new Error('Cannot divide by zero');
    var k = Math.max(0, digits + ndig(b.c) - ndig(a.c) + 1);
    var num = a.c * pow10(k), q = num / b.c;
    var r = dec(a.neg !== b.neg, q, a.e - b.e - k);
    r.exact = num % b.c === 0n;
    return r;
  }
  /* Which digits count, and why. */
  function sigInfo(n) {
    var ds = (n.intS + (n.fracS || '')).split(''), cls = ds.map(function () { return 'non'; });
    var first = -1, last = -1;
    ds.forEach(function (d, i) { if (d !== '0') { if (first < 0) first = i; last = i; } });
    var info = { ds: ds, cls: cls, intLen: n.intS.length, zero: first < 0, amb: 0, rules: [] };
    if (first < 0) { info.min = info.max = 0; return info; }
    var between = false, trailing = false;
    for (var i = first; i <= last; i++) { cls[i] = 'sig'; if (ds[i] === '0') between = true; }
    for (var j = last + 1; j < ds.length; j++) {
      if (n.point) { cls[j] = 'sig'; trailing = true; } else { cls[j] = 'amb'; info.amb++; }
    }
    info.min = cls.filter(function (c) { return c === 'sig'; }).length;
    info.max = info.min + info.amb;
    info.rules.push('Non-zero digits are always significant.');
    if (between) info.rules.push('Zeros between non-zero digits are significant.');
    if (first > 0) info.rules.push('Leading zeros are never significant: they only fix where the decimal point goes.');
    if (trailing) info.rules.push('Trailing zeros are significant when the number has a decimal point.');
    if (info.amb) info.rules.push('Trailing zeros in a whole number with no decimal point are ambiguous: they may only be placeholders. ' +
      'Write it in scientific notation (such as 1.20 × 10³) or add a decimal point (1200.) to show that they count.');
    if (n.sci) info.rules.push('In scientific notation only the digits in front of the power of ten count; the power itself does not.');
    return info;
  }

  Tools.register({
    id: 'sig-figs', category: 'math', name: 'Significant Figures & Scientific Notation',
    description: 'Count significant figures with the rules explained, round to significant figures or decimal places exactly, convert between plain, scientific, engineering and E notation, and do sums with measured values.',
    keywords: ['significant figures', 'sig figs', 'sf', 's.f.', 'sigfigs', 'rounding', 'round', 'decimal places', 'dp', 'scientific notation',
      'standard form', 'engineering notation', 'e notation', 'exponent', 'si prefix', 'precision', 'measurement'],
    render: function (root) {
      setRoot(root);
      var num = textIn('Number', '0.004050', { inputMode: 'decimal', placeholder: 'e.g. 0.004050, 1200, 6.022e23 or 1.20 × 10^3' });
      var digitsBox = el('div', { class: 'mb-digits', dataset: { k: 'digits' } });
      var count = el('div', { class: 'mf-big', dataset: { k: 'count' } });
      var countNote = el('div', { class: 'mf-muted', dataset: { k: 'count-note' } });
      var rules = el('ul', { class: 'mb-rules' });
      var legend = el('div', { class: 'mb-legend' },
        el('span', null, el('i', { style: { background: 'var(--accent-weak)', borderColor: 'var(--accent)' } }), 'significant'),
        el('span', null, el('i', { style: { borderColor: 'var(--warn)', borderStyle: 'dashed' } }), 'ambiguous'),
        el('span', null, el('i'), 'not significant'));
      var status = U.note('');

      var places = numIn('Round to', 3, { min: 0, max: 60, step: 1 });
      var kind = U.chips([{ value: 'sf', label: 'significant figures' }, { value: 'dp', label: 'decimal places' }], function () { run(); }, 'sf');
      kind.dataset.k = 'round-kind';
      var rule = U.select({ label: 'When exactly halfway', value: 'up', options: [
        { value: 'up', label: 'Round half up (away from zero, as taught in school)' }, { value: 'even', label: 'Round half to even (banker\'s rounding)' }] });
      var rounded = el('div', { class: 'mf-big', dataset: { k: 'rounded' } });
      var roundedNote = el('div', { class: 'mf-muted', dataset: { k: 'rounded-note' } });

      var conv = el('div');
      var a = textIn('First value', '2.5', { inputMode: 'decimal' }), b = textIn('Second value', '3.42', { inputMode: 'decimal' });
      var op = U.select({ label: 'Operation', value: '×', options: ['+', '−', '×', '÷'] });
      var arith = el('div');

      function digitSpans(n, info) {
        var kids = [];
        if (n.neg) kids.push(el('span', { class: 'sym', text: '−' }));
        info.ds.forEach(function (d, i) {
          if (i === info.intLen) kids.push(el('span', { class: 'sym', text: '.' }));
          kids.push(el('span', { class: info.cls[i], text: d }));
        });
        if (n.point && info.intLen === info.ds.length) kids.push(el('span', { class: 'sym', text: '.' }));
        if (n.sci) kids.push(el('span', { class: 'sym', text: ' × 10' + sup(n.pow) }));
        return kids;
      }
      function convRow(label, text, key, extra) {
        return el('div', { class: 'mf-row-copy' },
          el('div', null, el('div', { class: 'mf-muted', text: label }), el('code', { text: text, dataset: { k: key } }), extra ? el('div', { class: 'mf-muted', text: extra }) : null),
          U.copyBtn('Copy', text));
      }

      function run() {
        status.textContent = ''; status.className = 'note';
        [digitsBox, rules, conv].forEach(function (n) { n.replaceChildren(); });
        count.textContent = rounded.textContent = countNote.textContent = roundedNote.textContent = '';
        var n = readNumber(num.input.value);
        if (!n) { if (num.input.value.trim()) { status.className = 'note err'; status.textContent = 'That is not a number I can read. Try 0.0450, 1.2e-5 or 3.00 × 10^8.'; } return; }
        if (n.tooBig) { status.className = 'note err'; status.textContent = 'That number is too long or its exponent too large.'; return; }
        var info = sigInfo(n);
        digitsBox.append.apply(digitsBox, digitSpans(n, info));
        if (info.zero) {
          count.textContent = '0';
          countNote.textContent = 'Zero has no significant figures; its precision is shown by its decimal places (' + (n.fracS ? n.fracS.length : 0) + ').';
        } else {
          count.textContent = info.amb ? info.min + ' to ' + info.max : String(info.min);
          countNote.textContent = info.amb ? 'At least ' + info.min + ' significant figures; ' + info.max + ' if the trailing zeros were measured.'
            : info.min + ' significant figure' + (info.min === 1 ? '' : 's') + ' · ' + Math.max(0, -n.e) + ' decimal place' + (Math.max(0, -n.e) === 1 ? '' : 's');
        }
        info.rules.forEach(function (r) { rules.appendChild(el('li', { text: r })); });

        /* rounding */
        var x = dec(n.neg, n.c, n.e), k = Math.floor(val(places)), mode = selVal(rule);
        if (!isNaN(k) && k >= 0 && k <= 60) {
          if (kind.value === 'sf') {
            if (k === 0) { rounded.textContent = '—'; roundedNote.textContent = 'Round to at least 1 significant figure.'; }
            else if (x.c === 0n) rounded.textContent = '0';
            else {
              var r = roundSig(x, k, mode), plain = toPlain(r);
              rounded.textContent = plain;
              /* a whole number whose final zeros are significant cannot show
                 it in plain form; point the reader at standard form */
              var sigShown = sigInfo(readNumber(plain));
              roundedNote.textContent = (sigShown.amb && sigShown.min < k ? 'Written plainly the final zeros look like placeholders: write ' + toSci(r) + ' to show ' + k + ' s.f.' : 'In standard form: ' + toSci(r));
            }
          } else {
            var rd = roundPlace(x, -k, mode);
            rounded.textContent = toPlain(rd);
            roundedNote.textContent = rd.c === 0n ? 'Rounds to zero at this precision.' : 'In standard form: ' + toSci(rd);
          }
        } else rounded.textContent = '—';

        /* notation: keep the digits that count (ambiguous zeros dropped) */
        if (!info.zero) {
          var sig = info.amb ? dec(n.neg, n.c / pow10(info.amb), n.e + info.amb) : x;
          var eng = toEng(sig);
          conv.append(
            convRow('Plain decimal', toPlain(x), 'plain'),
            convRow('Scientific notation (standard form)', toSci(sig), 'sci'),
            convRow('E notation (calculators and code)', toENote(sig), 'enote'),
            convRow('Engineering notation', eng.text, 'eng', 'Power of ten a multiple of 3: SI prefix ' + eng.prefix));
          if (info.amb) conv.appendChild(U.note('The ' + info.amb + ' trailing zero' + (info.amb === 1 ? ' is' : 's are') + ' treated as a placeholder above. If they were measured, add a decimal point: ' + toPlain(x) + '.'));
        }
      }

      function runArith() {
        arith.replaceChildren();
        var na = readNumber(a.input.value), nb = readNumber(b.input.value);
        if (!na || !nb || na.tooBig || nb.tooBig) { arith.appendChild(U.note('Enter two numbers.', 'err')); return; }
        var xa = dec(na.neg, na.c, na.e), xb = dec(nb.neg, nb.c, nb.e), ia = sigInfo(na), ib = sigInfo(nb), o = selVal(op), exact, ans, why;
        try {
          if (o === '+' || o === '−') {
            exact = decAdd(xa, o === '+' ? xb : dec(!xb.neg, xb.c, xb.e));
            /* round to the coarser last significant place of the two */
            var pa = na.e + ia.amb, pb = nb.e + ib.amb, place = Math.max(pa, pb);
            ans = roundPlace(exact, place, 'up');
            why = 'Adding or subtracting: keep the precision of the least precise value (' + (place < 0 ? -place + ' decimal place' + (place === -1 ? '' : 's') : place === 0 ? 'whole units' : 'the nearest ' + toPlain(dec(false, 1n, place))) + ').';
          } else {
            exact = o === '×' ? decMul(xa, xb) : decDiv(xa, xb, 40);
            var sf = Math.min(ia.min || 1, ib.min || 1);
            ans = roundSig(exact, sf, 'up');
            why = 'Multiplying or dividing: keep the fewest significant figures of the two values (' + sf + ').';
          }
        } catch (e) { arith.appendChild(U.note(e.message, 'err')); return; }
        arith.append(
          el('div', { class: 'mf-muted', text: 'Exact result' }),
          el('div', { class: 'mf-mid', text: toPlain(stripZeros(exact)) + (exact.exact === false ? '…' : ''), dataset: { k: 'exact' } }),
          el('div', { class: 'mf-muted', text: 'Answer to the right precision' }),
          el('div', { class: 'mf-big', text: toPlain(ans), dataset: { k: 'arith' } }),
          U.note(why + ' Exact numbers such as counts and defined constants do not limit the precision.'));
      }

      U.live([num, places, rule], run);
      U.live([a, b, op], runArith);
      root.appendChild(U.panel('Count significant figures', num, status, digitsBox, legend, count, countNote, rules));
      root.appendChild(U.panel('Round', U.row(places, kind), rule, rounded, roundedNote));
      root.appendChild(U.panel('Notation', conv));
      root.appendChild(U.panel('Calculate with measured values', U.row(a, op, b), arith));
    }
  });

  /* ======================================================================= */
  /* Probability Distributions & Z-Scores                                    */
  /* ======================================================================= */
  function fmtP(p) {
    if (typeof p !== 'number' || isNaN(p)) return '—';
    if (p <= 0) return '0';
    if (p >= 1) return '1';
    if (p < 1e-4) { var parts = p.toExponential(4).split('e'); return parts[0] + ' × 10' + sup(parseInt(parts[1], 10)); }
    if (p > 1 - 1e-6) return p.toFixed(12).replace(/0+$/, '');
    return p.toFixed(6);
  }
  function fx(x, d) { return isFinite(x) ? minus(String(parseFloat(x.toFixed(d === undefined ? 6 : d)))) : fmt(x); }
  /* Density curve with shaded regions: f is the pdf on [x0, x1]. */
  function densitySvg(f, x0, x1, regions, ticks, f2) {
    var W = 360, H = 150, L = 10, R = 10, T = 10, B = 24, N = 200, ymax = 0, i;
    var pts = [];
    for (i = 0; i <= N; i++) { var x = x0 + (x1 - x0) * i / N, y = f(x); pts.push([x, y]); if (y > ymax) ymax = y; }
    if (!(ymax > 0)) ymax = 1;
    function X(x) { return (L + (x - x0) / (x1 - x0) * (W - L - R)).toFixed(1); }
    function Y(y) { return (H - B - Math.min(1.05, y / ymax) * (H - T - B)).toFixed(1); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">';
    regions.forEach(function (r) {
      var a = Math.max(x0, r[0]), b = Math.min(x1, r[1]);
      if (!(b > a)) return;
      var d = 'M' + X(a) + ' ' + Y(0);
      for (var k = 0; k <= 100; k++) { var xx = a + (b - a) * k / 100; d += 'L' + X(xx) + ' ' + Y(f(xx)); }
      s += '<path class="shade" d="' + d + 'L' + X(b) + ' ' + Y(0) + 'Z"/>';
    });
    if (f2) s += '<path class="curve2" d="' + pts.map(function (p, j) { return (j ? 'L' : 'M') + X(p[0]) + ' ' + Y(f2(p[0])); }).join('') + '"/>';
    s += '<path class="curve" d="' + pts.map(function (p, j) { return (j ? 'L' : 'M') + X(p[0]) + ' ' + Y(p[1]); }).join('') + '"/>';
    s += '<line class="axis" x1="' + L + '" y1="' + (H - B) + '" x2="' + (W - R) + '" y2="' + (H - B) + '"/>';
    (ticks || []).forEach(function (t) {
      if (t[0] < x0 || t[0] > x1) return;
      s += '<line class="axis" x1="' + X(t[0]) + '" y1="' + (H - B) + '" x2="' + X(t[0]) + '" y2="' + (H - B + 4) + '"/>' +
        '<text class="tick" x="' + X(t[0]) + '" y="' + (H - 8) + '" text-anchor="middle">' + U.escapeHtml(t[1]) + '</text>';
    });
    return s + '</svg>';
  }
  /* Bar chart of a discrete pmf over [lo, hi]; hi(k) marks the shaded bars. */
  function barsSvg(pmf, lo, hi, isHi) {
    var W = 360, H = 150, L = 10, R = 10, T = 10, B = 24, n = hi - lo + 1, ymax = 0, k, vals = [];
    for (k = lo; k <= hi; k++) { var v = pmf(k); vals.push(v); if (v > ymax) ymax = v; }
    if (!(ymax > 0)) ymax = 1;
    var bw = (W - L - R) / n, s = '<svg viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">';
    vals.forEach(function (v, i) {
      var h = v / ymax * (H - T - B);
      s += '<rect class="bar' + (isHi(lo + i) ? ' hi' : '') + '" x="' + (L + i * bw + bw * 0.1).toFixed(1) + '" y="' + (H - B - h).toFixed(1) +
        '" width="' + Math.max(0.5, bw * 0.8).toFixed(1) + '" height="' + h.toFixed(1) + '"/>';
    });
    s += '<line class="axis" x1="' + L + '" y1="' + (H - B) + '" x2="' + (W - R) + '" y2="' + (H - B) + '"/>';
    var step = Math.max(1, Math.ceil(n / 12));
    for (k = lo; k <= hi; k += step) s += '<text class="tick" x="' + (L + (k - lo + 0.5) * bw).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + k + '</text>';
    return s + '</svg>';
  }
  /* The window of k worth drawing: about ±4.5 SD, at most 80 bars. */
  function barWindow(mean, sd, min, max) {
    var lo = Math.max(min, Math.floor(mean - 4.5 * sd)), hi = Math.min(max, Math.ceil(mean + 4.5 * sd));
    if (hi - lo > 80) { lo = Math.max(min, Math.round(mean - 40)); hi = lo + 80; }
    return [lo, Math.max(lo, hi)];
  }
  function binomPmf(k, n, p) {
    if (k < 0 || k > n) return 0;
    if (p === 0) return k === 0 ? 1 : 0;
    if (p === 1) return k === n ? 1 : 0;
    return Math.exp(lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1) + k * Math.log(p) + (n - k) * Math.log(1 - p));
  }
  function binomLe(k, n, p) {   /* P(X <= k) */
    if (k < 0) return 0;
    if (k >= n) return 1;
    if (p === 0) return 1;
    if (p === 1) return 0;
    return ibeta(1 - p, n - k, k + 1);
  }
  function binomGe(k, n, p) {   /* P(X >= k) */
    if (k <= 0) return 1;
    if (k > n) return 0;
    if (p === 0) return 0;
    if (p === 1) return 1;
    return ibeta(p, k, n - k + 1);
  }
  function poisPmf(k, l) { if (k < 0) return 0; if (l === 0) return k === 0 ? 1 : 0; return Math.exp(k * Math.log(l) - l - lgamma(k + 1)); }
  function poisLe(k, l) { if (k < 0) return 0; if (l === 0) return 1; return gammaQ(k + 1, l); }
  function poisGe(k, l) { if (k <= 0) return 1; if (l === 0) return 0; return gammaP(k, l); }

  Tools.register({
    id: 'probability-calculator', category: 'math', name: 'Probability Distributions & Z-Scores',
    description: 'Normal probabilities and inverse, z-scores, percentiles and p-values, binomial, Poisson and Student\'s t distributions (CDF and critical values), each with a chart of the area.',
    keywords: ['probability', 'distribution', 'normal distribution', 'gaussian', 'bell curve', 'z score', 'z-score', 'z table', 'percentile',
      'p value', 'p-value', 'binomial', 'poisson', 'student t', 't distribution', 't table', 'critical value', 'cdf', 'pdf', 'statistics', 'hypothesis test'],
    render: function (root) {
      setRoot(root);
      var panes = {};
      var tabBar = tabs([{ value: 'normal', label: 'Normal' }, { value: 'z', label: 'Z-scores & p-values' }, { value: 'binom', label: 'Binomial' },
        { value: 'pois', label: 'Poisson' }, { value: 't', label: 'Student\'s t' }], show, 'normal');
      tabBar.dataset.k = 'dist-tabs';
      var host = el('div');
      function show(v) { Object.keys(panes).forEach(function (k) { panes[k].style.display = k === v ? '' : 'none'; }); }
      function chartBox() { return el('div', { class: 'mb-chart' }); }

      /* ---- normal ---- */
      (function () {
        var mu = numIn('Mean μ', 0), sd = numIn('Standard deviation σ', 1, { min: 0 });
        var mode = U.chips([{ value: 'lt', label: 'P(X < x)' }, { value: 'gt', label: 'P(X > x)' }, { value: 'bt', label: 'P(a < X < b)' },
          { value: 'out', label: 'P(X < a or X > b)' }, { value: 'inv', label: 'Inverse: find x' }], function () { run(); }, 'lt');
        mode.dataset.k = 'normal-mode';
        var x = numIn('x', 1.96), a = numIn('a', -1.96), b = numIn('b', 1.96), p = numIn('Probability', 0.95, { min: 0, max: 1 });
        var tail = U.select({ label: 'Area', value: 'left', options: [{ value: 'left', label: 'to the left: P(X < x) = p' },
          { value: 'right', label: 'to the right: P(X > x) = p' }, { value: 'central', label: 'central: P(μ − d < X < μ + d) = p' }] });
        var res = el('div', { class: 'mf-big', dataset: { k: 'normal' } }), line = el('div', { class: 'mf-muted', dataset: { k: 'normal-line' } });
        var chart = chartBox();
        function run() {
          var m = val(mu), s = val(sd), md = mode.value;
          [x, a, b, p, tail].forEach(function (w) { w.style.display = 'none'; });
          (md === 'lt' || md === 'gt' ? [x] : md === 'inv' ? [p, tail] : [a, b]).forEach(function (w) { w.style.display = ''; });
          res.textContent = '—'; line.textContent = ''; chart.innerHTML = '';
          if (isNaN(m) || isNaN(s) || s <= 0) { line.textContent = 'Enter a mean and a positive standard deviation.'; return; }
          var f = function (t) { return normPdf((t - m) / s) / s; }, lo = m - 4 * s, hi = m + 4 * s, regions = [], ticks = [[m, fmt(m, 4)]];
          var z = function (t) { return (t - m) / s; };
          if (md === 'lt' || md === 'gt') {
            var xv = val(x);
            if (isNaN(xv)) return;
            var pr = md === 'lt' ? normCdf(z(xv)) : normCdf(-z(xv));
            res.textContent = fmtP(pr);
            line.textContent = 'z = ' + fx(z(xv), 4) + '   ·   ' + fx(pr * 100, 4) + '% of the distribution';
            regions = md === 'lt' ? [[-Infinity, xv]] : [[xv, Infinity]];
            ticks.push([xv, fmt(xv, 4)]);
          } else if (md === 'bt' || md === 'out') {
            var av = val(a), bv = val(b);
            if (isNaN(av) || isNaN(bv)) return;
            if (av > bv) { var t = av; av = bv; bv = t; }
            var inside = normCdf(z(bv)) - normCdf(z(av));
            if (inside < 1e-3) inside = normCdf(-z(av)) - normCdf(-z(bv));  /* precision in the far right tail */
            var pr2 = md === 'bt' ? inside : normCdf(z(av)) + normCdf(-z(bv));
            res.textContent = fmtP(pr2);
            line.textContent = 'z from ' + fx(z(av), 4) + ' to ' + fx(z(bv), 4) + '   ·   ' + fx(pr2 * 100, 4) + '%';
            regions = md === 'bt' ? [[av, bv]] : [[-Infinity, av], [bv, Infinity]];
            ticks.push([av, fmt(av, 4)], [bv, fmt(bv, 4)]);
          } else {
            var pv = val(p), tl = selVal(tail);
            if (isNaN(pv) || pv <= 0 || pv >= 1) { line.textContent = 'The probability must be between 0 and 1.'; return; }
            if (tl === 'central') {
              var d = normInv(0.5 + pv / 2) * s;
              res.textContent = fx(m - d) + ' to ' + fx(m + d);
              line.textContent = 'μ ± ' + fx(d) + ' (z = ±' + fx(d / s, 6) + ')';
              regions = [[m - d, m + d]]; ticks.push([m - d, fmt(m - d, 4)], [m + d, fmt(m + d, 4)]);
            } else {
              var zz = tl === 'left' ? normInv(pv) : -normInv(pv), xv2 = m + zz * s;
              res.textContent = 'x = ' + fx(xv2);
              line.textContent = 'z = ' + fx(zz, 6);
              regions = tl === 'left' ? [[-Infinity, xv2]] : [[xv2, Infinity]]; ticks.push([xv2, fmt(xv2, 4)]);
            }
          }
          chart.innerHTML = densitySvg(f, lo, hi, regions, ticks);
        }
        U.live([mu, sd, x, a, b, p, tail], run);
        panes.normal = el('div', null, U.panel('Normal distribution', U.row(mu, sd), mode, U.row(x, a, b, p, tail), res, line, chart));
      })();

      /* ---- z-scores ---- */
      (function () {
        var z = numIn('z-score', 1.96);
        var cards = el('div', { class: 'mf-grid' }), chart = chartBox();
        var xx = numIn('Value x', 130), mu = numIn('Mean μ', 100), sd = numIn('Standard deviation σ', 15, { min: 0 });
        var zOut = el('div', { class: 'mf-mid', dataset: { k: 'z-from-x' } });
        var pct = numIn('Percentile (%)', 95, { min: 0, max: 100 });
        var zInv = el('div', { class: 'mf-mid', dataset: { k: 'z-inv' } });
        U.live([z], function () {
          var v = val(z);
          cards.replaceChildren(); chart.innerHTML = '';
          if (isNaN(v)) return;
          var left = normCdf(v), right = normCdf(-v), one = normCdf(-Math.abs(v));
          cards.append(card('Percentile (area to the left)', fx(left * 100, 4) + '%', 'z-pct'), card('P(Z < z)', fmtP(left), 'z-left'),
            card('P(Z > z)', fmtP(right), 'z-right'), card('p-value, one-tailed', fmtP(one), 'z-p1'), card('p-value, two-tailed', fmtP(Math.min(1, 2 * one)), 'z-p2'));
          chart.innerHTML = densitySvg(normPdf, -4, 4, [[-Infinity, -Math.abs(v)], [Math.abs(v), Infinity]], [[0, '0'], [-Math.abs(v), fx(-Math.abs(v), 3)], [Math.abs(v), fx(Math.abs(v), 3)]]);
        });
        U.live([xx, mu, sd], function () {
          var x = val(xx), m = val(mu), s = val(sd);
          zOut.textContent = isNaN(x) || isNaN(m) || !(s > 0) ? '—' : 'z = ' + fx((x - m) / s, 6) + '   (percentile ' + fx(normCdf((x - m) / s) * 100, 4) + '%)';
        });
        U.live([pct], function () {
          var q = val(pct) / 100;
          zInv.textContent = !(q > 0 && q < 1) ? 'Enter a percentile between 0 and 100' : 'z = ' + fx(normInv(q), 6);
        });
        panes.z = el('div', null,
          U.panel('From a z-score', z, cards, chart, U.note('The shaded tails are the two-tailed p-value: the chance of a result at least this far from the mean in either direction.')),
          U.panel('Standardise a value', U.row(xx, mu, sd), zOut),
          U.panel('z for a percentile', pct, zInv));
      })();

      /* ---- binomial ---- */
      (function () {
        var n = numIn('Trials n', 10, { min: 0, step: 1 }), p = numIn('Probability of success p', 0.5, { min: 0, max: 1 }), k = numIn('Successes k', 5, { min: 0, step: 1 });
        var shade = U.chips([{ value: 'eq', label: 'Shade X = k' }, { value: 'le', label: 'X ≤ k' }, { value: 'ge', label: 'X ≥ k' }], function () { run(); }, 'le');
        var cards = el('div', { class: 'mf-grid' }), status = U.note(''), chart = chartBox();
        function run() {
          var N = val(n), P = val(p), K = val(k);
          cards.replaceChildren(); chart.innerHTML = ''; status.textContent = ''; status.className = 'note';
          if (!(Number.isInteger(N) && N >= 0 && N <= 1e7) || !(P >= 0 && P <= 1) || !Number.isInteger(K)) {
            status.className = 'note err'; status.textContent = 'n must be a whole number (up to 10,000,000), p between 0 and 1, and k a whole number.'; return;
          }
          var mean = N * P, v = N * P * (1 - P);
          cards.append(card('P(X = k)', fmtP(binomPmf(K, N, P)), 'b-eq'), card('P(X ≤ k)', fmtP(binomLe(K, N, P)), 'b-le'), card('P(X < k)', fmtP(binomLe(K - 1, N, P)), 'b-lt'),
            card('P(X ≥ k)', fmtP(binomGe(K, N, P)), 'b-ge'), card('P(X > k)', fmtP(binomGe(K + 1, N, P)), 'b-gt'),
            card('Mean np', fmt(mean, 10), 'b-mean'), card('Variance np(1 − p)', fmt(v, 10), 'b-var'), card('Standard deviation', fmt(Math.sqrt(v), 10), 'b-sd'));
          var w = barWindow(mean, Math.sqrt(v), 0, N), sh = shade.value;
          chart.innerHTML = barsSvg(function (x) { return binomPmf(x, N, P); }, w[0], w[1], function (x) { return sh === 'eq' ? x === K : sh === 'le' ? x <= K : x >= K; });
        }
        U.live([n, p, k], run);
        panes.binom = el('div', null, U.panel('Binomial distribution', U.row(n, p, k), status, cards, shade, chart));
      })();

      /* ---- Poisson ---- */
      (function () {
        var lam = numIn('Mean rate λ', 3, { min: 0 }), k = numIn('Events k', 2, { min: 0, step: 1 });
        var shade = U.chips([{ value: 'eq', label: 'Shade X = k' }, { value: 'le', label: 'X ≤ k' }, { value: 'ge', label: 'X ≥ k' }], function () { run(); }, 'le');
        var cards = el('div', { class: 'mf-grid' }), status = U.note(''), chart = chartBox();
        function run() {
          var L = val(lam), K = val(k);
          cards.replaceChildren(); chart.innerHTML = ''; status.textContent = ''; status.className = 'note';
          if (!(L >= 0 && L <= 1e7) || !Number.isInteger(K)) { status.className = 'note err'; status.textContent = 'λ must be zero or more, and k a whole number.'; return; }
          cards.append(card('P(X = k)', fmtP(poisPmf(K, L)), 'p-eq'), card('P(X ≤ k)', fmtP(poisLe(K, L)), 'p-le'), card('P(X < k)', fmtP(poisLe(K - 1, L)), 'p-lt'),
            card('P(X ≥ k)', fmtP(poisGe(K, L)), 'p-ge'), card('P(X > k)', fmtP(poisGe(K + 1, L)), 'p-gt'),
            card('Mean = variance = λ', fmt(L, 10), 'p-mean'), card('Standard deviation √λ', fmt(Math.sqrt(L), 10), 'p-sd'));
          var w = barWindow(L, Math.sqrt(L), 0, Infinity), sh = shade.value;
          chart.innerHTML = barsSvg(function (x) { return poisPmf(x, L); }, w[0], w[1], function (x) { return sh === 'eq' ? x === K : sh === 'le' ? x <= K : x >= K; });
        }
        U.live([lam, k], run);
        panes.pois = el('div', null, U.panel('Poisson distribution', U.row(lam, k), status, cards, shade, chart));
      })();

      /* ---- Student's t ---- */
      (function () {
        var df = numIn('Degrees of freedom ν', 10, { min: 0 }), t = numIn('t statistic', 2.228);
        var alpha = numIn('Significance level α', 0.05, { min: 0, max: 1 });
        var tails = U.select({ label: 'Test', value: 'two', options: [{ value: 'two', label: 'Two-tailed' }, { value: 'one', label: 'One-tailed' }] });
        var cards = el('div', { class: 'mf-grid' }), crit = el('div', { class: 'mf-big', dataset: { k: 't-crit' } }), critLine = el('div', { class: 'mf-muted' });
        var status = U.note(''), chart = chartBox();
        function run() {
          var v = val(df), tv = val(t), a = val(alpha), two = selVal(tails) === 'two';
          cards.replaceChildren(); chart.innerHTML = ''; crit.textContent = '—'; critLine.textContent = ''; status.textContent = ''; status.className = 'note';
          if (!(v > 0)) { status.className = 'note err'; status.textContent = 'The degrees of freedom must be positive (usually n − 1).'; return; }
          if (!isNaN(tv)) {
            var left = tCdf(tv, v), right = tCdf(-tv, v), one = tCdf(-Math.abs(tv), v);
            cards.append(card('P(T < t)', fmtP(left), 't-left'), card('P(T > t)', fmtP(right), 't-right'),
              card('p-value, one-tailed', fmtP(one), 't-p1'), card('p-value, two-tailed', fmtP(Math.min(1, 2 * one)), 't-p2'));
          }
          var tc = NaN;
          if (a > 0 && a < 1) {
            tc = tInv(two ? 1 - a / 2 : 1 - a, v);
            crit.textContent = (two ? '±' : '') + fx(tc, 6);
            critLine.textContent = (two ? 'Reject at α = ' + a + ' if |t| > ' : 'Reject at α = ' + a + ' if t > ') + fx(tc, 6) + ' (for a left-tailed test, t < −' + fx(tc, 6) + ')';
          }
          var span = Math.max(4, Math.min(12, isFinite(tc) ? tc * 1.4 : 4, isNaN(tv) ? 4 : Math.abs(tv) * 1.3));
          var cut = isNaN(tv) ? tc : Math.abs(tv);
          chart.innerHTML = densitySvg(function (x) { return tPdf(x, v); }, -span, span, isFinite(cut) ? [[-Infinity, -cut], [cut, Infinity]] : [],
            [[0, '0']].concat(isFinite(cut) ? [[-cut, fx(-cut, 3)], [cut, fx(cut, 3)]] : []), normPdf);
        }
        U.live([df, t, alpha, tails], run);
        panes.t = el('div', null,
          U.panel('Student\'s t distribution', df, t, cards, chart, U.note('Shaded: the two-tailed area beyond ±|t|. The dashed curve is the standard normal for comparison.')),
          U.panel('Critical value', U.row(alpha, tails), crit, critLine), status);
      })();

      ['normal', 'z', 'binom', 'pois', 't'].forEach(function (k) { host.appendChild(panes[k]); });
      show('normal');
      root.appendChild(tabBar);
      root.appendChild(host);
    }
  });

  /* ======================================================================= */
  /* Simultaneous Equations Solver                                           */
  /* ======================================================================= */
  /* Exact rationals: { n, d } BigInt numerator and positive denominator. */
  function Q(n, d) {
    if (d === undefined) d = 1n;
    if (d === 0n) throw new Error('Division by zero');
    if (d < 0n) { n = -n; d = -d; }
    var g = bgcd(n, d);
    if (g > 1n) { n /= g; d /= g; }
    return { n: n, d: d };
  }
  var Q0 = Q(0n), Q1 = Q(1n);
  function qadd(a, b) { return Q(a.n * b.d + b.n * a.d, a.d * b.d); }
  function qsub(a, b) { return Q(a.n * b.d - b.n * a.d, a.d * b.d); }
  function qmul(a, b) { return Q(a.n * b.n, a.d * b.d); }
  function qdiv(a, b) { if (b.n === 0n) throw new Error('Division by zero'); return Q(a.n * b.d, a.d * b.n); }
  function qneg(a) { return { n: -a.n, d: a.d }; }
  function qz(a) { return a.n === 0n; }
  function qone(a) { return a.n === 1n && a.d === 1n; }
  function qstr(a) { return (a.n < 0n ? '−' : '') + babs(a.n).toString() + (a.d === 1n ? '' : '/' + a.d.toString()); }
  /* Decimal view: exact when the denominator has only factors 2 and 5,
     otherwise 10 significant figures with an ≈. */
  function qdec(a) {
    var d = a.d;
    while (d % 2n === 0n) d /= 2n;
    while (d % 5n === 0n) d /= 5n;
    var neg = a.n < 0n, n = babs(a.n), s;
    if (d === 1n) {
      var k = 0, dd = a.d;
      while (dd > 1n) { dd /= 10n; k++; }
      while (pow10(k) % a.d !== 0n) k++;
      s = toPlain(stripZeros(dec(false, n * (pow10(k) / a.d), -k)));
      return (neg ? '-' : '') + s;
    }
    var r = roundSig(decDiv(dec(false, n, 0), dec(false, a.d, 0), 30), 10, 'up');
    return '≈ ' + (neg ? '-' : '') + toPlain(stripZeros(r));
  }
  function qparse(s) {
    s = String(s).trim().replace(/−/g, '-').replace(/\s+/g, '');
    if (s === '') return Q0;
    var m = /^([+-]?[\d.]+(?:e[+-]?\d+)?)(?:\/([+-]?[\d.]+))?$/i.exec(s);
    if (!m) return null;
    function one(t) { var n = readNumber(t); if (!n || n.tooBig) return null; var v = n.e >= 0 ? Q(n.c * pow10(n.e)) : Q(n.c, pow10(-n.e)); return n.neg ? qneg(v) : v; }
    var a = one(m[1]);
    if (!a) return null;
    if (m[2] === undefined) return a;
    var b = one(m[2]);
    if (!b || qz(b)) return null;
    return qdiv(a, b);
  }
  /* Linear forms { c: constant, v: { name: coefficient } } and a small
     recursive-descent parser: "2x + 3y = 7", "x/2 - (y + 1)/3 = 4". */
  function lin(c, v) { return { c: c || Q0, v: v || {} }; }
  function ladd(a, b, sign) {
    var r = lin(sign < 0 ? qsub(a.c, b.c) : qadd(a.c, b.c), Object.assign({}, a.v));
    Object.keys(b.v).forEach(function (k) { r.v[k] = (sign < 0 ? qsub : qadd)(r.v[k] || Q0, b.v[k]); });
    return r;
  }
  function lscale(a, q) { var r = lin(qmul(a.c, q)); Object.keys(a.v).forEach(function (k) { r.v[k] = qmul(a.v[k], q); }); return r; }
  function lconst(a) { return Object.keys(a.v).every(function (k) { return qz(a.v[k]); }); }
  function parseSide(src) {
    var toks = [], re = /\s*(?:(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+)|([A-Za-z_][A-Za-z0-9_]*)|(\S))/g, m;
    src = src.replace(/[−–]/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
    while ((m = re.exec(src)) && m[0].trim()) toks.push(m[1] !== undefined ? { t: 'n', v: m[1] } : m[2] !== undefined ? { t: 'v', v: m[2] } : { t: m[3] });
    var p = 0;
    function peek() { return toks[p]; }
    function eat(t) { if (toks[p] && toks[p].t === t) { p++; return true; } return false; }
    function expr() {
      var v = term();
      for (;;) { if (eat('+')) v = ladd(v, term(), 1); else if (eat('-')) v = ladd(v, term(), -1); else return v; }
    }
    function mul(a, b) {
      if (lconst(a)) return lscale(b, a.c);
      if (lconst(b)) return lscale(a, b.c);
      throw new Error('Only linear equations: a product of two unknowns is not allowed');
    }
    function term() {
      var v = factor();
      for (;;) {
        var t = peek();
        if (eat('*')) v = mul(v, factor());
        else if (eat('/')) { var d = factor(); if (!lconst(d)) throw new Error('You can only divide by a number'); v = lscale(v, qdiv(Q1, d.c)); }
        else if (t && (t.t === 'n' || t.t === 'v' || t.t === '(')) v = mul(v, factor());
        else return v;
      }
    }
    function factor() {
      if (eat('-')) return lscale(factor(), Q(-1n));
      if (eat('+')) return factor();
      var t = toks[p++];
      if (!t) throw new Error('An equation ends too soon');
      if (t.t === 'n') return lin(qparse(t.v));
      if (t.t === 'v') { var o = {}; o[t.v] = Q1; return lin(Q0, o); }
      if (t.t === '(') { var v = expr(); if (!eat(')')) throw new Error('Missing )'); return v; }
      if (t.t === '^') throw new Error('Only linear equations: no powers');
      throw new Error('Unexpected "' + t.t + '"');
    }
    var out = expr();
    if (p < toks.length) throw new Error(toks[p].t === '^' ? 'Only linear equations: no powers' : 'Unexpected "' + (toks[p].v || toks[p].t) + '"');
    return out;
  }
  function parseSystem(text) {
    var lines = text.split(/\n|;/).map(function (l) { return l.trim(); }).filter(Boolean), vars = [], eqs = [];
    lines.forEach(function (line, i) {
      var sides = line.split('=');
      if (sides.length !== 2) throw new Error('Line ' + (i + 1) + ' needs exactly one "=" sign');
      var f;
      try { f = ladd(parseSide(sides[0]), parseSide(sides[1]), -1); } catch (e) { throw new Error('Line ' + (i + 1) + ': ' + e.message); }
      Object.keys(f.v).forEach(function (k) { if (vars.indexOf(k) < 0) vars.push(k); });
      eqs.push(f);
    });
    if (!eqs.length) throw new Error('Type one equation per line');
    return { vars: vars, rows: eqs.map(function (f) { return vars.map(function (k) { return f.v[k] || Q0; }).concat([qneg(f.c)]); }) };
  }
  /* Gauss–Jordan elimination recording every row operation. */
  function gaussJordan(A, m) {
    A = A.map(function (r) { return r.slice(); });
    var steps = [{ op: 'Augmented matrix', M: A.map(function (r) { return r.slice(); }) }], rows = A.length, r = 0, pivots = [];
    function coef(q) { return qone(q) ? '' : (q.d === 1n ? qstr(q) : '(' + qstr(q) + ')'); }
    for (var c = 0; c < m && r < rows; c++) {
      var piv = -1, i;
      for (i = r; i < rows; i++) if (!qz(A[i][c])) { piv = i; break; }
      for (i = r; i < rows; i++) if (A[i][c].d === 1n && (A[i][c].n === 1n || A[i][c].n === -1n)) { piv = i; break; }  /* a ±1 pivot keeps the numbers small */
      if (piv < 0) continue;
      if (piv !== r) { var t = A[piv]; A[piv] = A[r]; A[r] = t; steps.push({ op: 'R' + (r + 1) + ' ↔ R' + (piv + 1), M: A.map(function (x) { return x.slice(); }) }); }
      var pv = A[r][c];
      if (!qone(pv)) {
        var inv = qdiv(Q1, pv);
        A[r] = A[r].map(function (x) { return qmul(x, inv); });
        steps.push({ op: 'R' + (r + 1) + ' → ' + coef(inv) + 'R' + (r + 1), M: A.map(function (x) { return x.slice(); }) });
      }
      var ops = [];
      for (i = 0; i < rows; i++) {
        if (i === r || qz(A[i][c])) continue;
        var f = A[i][c], rr = A[r];
        A[i] = A[i].map(function (x, j) { return qsub(x, qmul(f, rr[j])); });
        ops.push('R' + (i + 1) + ' → R' + (i + 1) + (f.n > 0n ? ' − ' : ' + ') + coef(Q(babs(f.n), f.d)) + 'R' + (r + 1));
      }
      if (ops.length) steps.push({ op: ops.join(',  '), M: A.map(function (x) { return x.slice(); }) });
      pivots.push(c); r++;
    }
    return { A: A, pivots: pivots, rank: r, steps: steps };
  }
  function matrixNode(M, m) {
    return el('table', { class: 'mb-matrix' }, el('tbody', M.map(function (row) {
      return el('tr', row.map(function (q, j) { return el('td', { class: j === m ? 'aug' : '', text: qstr(q) }); }));
    })));
  }
  var DEFAULT_VARS = ['x', 'y', 'z', 'w', 'v', 'u'];

  Tools.register({
    id: 'equation-solver', category: 'math', name: 'Simultaneous Equations Solver',
    description: 'Solve 2 to 6 simultaneous linear equations exactly, typed as "2x + 3y = 7" or entered as a grid of coefficients, with every Gaussian elimination step and detection of no or infinitely many solutions.',
    keywords: ['simultaneous equations', 'system of equations', 'linear equations', 'solve', 'solver', 'gaussian elimination', 'gauss jordan',
      'row reduction', 'rref', 'matrix', 'unknowns', 'fractions', 'exact', 'linear algebra'],
    render: function (root) {
      setRoot(root);
      var mode = tabs([{ value: 'type', label: 'Type equations' }, { value: 'grid', label: 'Coefficient grid' }], function () { layout(); solve(); }, 'type');
      mode.dataset.k = 'eq-mode';
      var text = U.textarea({ rows: 5, spellcheck: false, placeholder: 'One equation per line, e.g.\n2x + 3y = 7\nx - y = 1' });
      text.value = '2x + 3y = 7\nx - y = 1';
      text.style.minHeight = '120px';
      var typePane = el('div', null, U.field('Equations', text), U.note('Use any letters or words for the unknowns. Coefficients can be whole numbers, decimals or fractions (3/4x, x/2); brackets are fine.'));
      var size = U.select({ label: 'Unknowns', value: '2', options: ['2', '3', '4', '5', '6'] });
      var gridBox = el('div', { class: 'scroll' });
      var gridPane = el('div', null, size, gridBox, U.note('Each row is one equation: the coefficients of the unknowns, then the number on the right of the = sign. Blank means 0.'));
      var gridVals = {};
      var out = el('div'), stepsBox = el('div');

      function buildGrid() {
        var n = +size.querySelector('select').value;
        var g = el('div', { class: 'mb-coef', style: { gridTemplateColumns: 'repeat(' + (n + 1) + ', auto)' } });
        DEFAULT_VARS.slice(0, n).forEach(function (v) { g.appendChild(el('span', { text: v })); });
        g.appendChild(el('span', { text: '= constant' }));
        for (var i = 0; i < n; i++) for (var j = 0; j <= n; j++) {
          var key = i + ',' + j, init = gridVals[key] !== undefined ? gridVals[key] : (n === 2 ? [['2', '3', '7'], ['1', '-1', '1']][i][j] : (i === j ? '1' : j === n ? String(i + 1) : '0'));
          var inp = el('input', { type: 'text', value: init, inputMode: 'decimal', dataset: { cell: key }, 'aria-label': 'Row ' + (i + 1) + (j === n ? ' constant' : ' coefficient of ' + DEFAULT_VARS[j]) });
          (function (k) { inp.addEventListener('input', function () { gridVals[k] = this.value; solveSoon(); }); })(key);
          g.appendChild(inp);
        }
        gridBox.replaceChildren(g);
      }
      function layout() { typePane.style.display = mode.value === 'type' ? '' : 'none'; gridPane.style.display = mode.value === 'grid' ? '' : 'none'; }
      function system() {
        if (mode.value === 'type') return parseSystem(text.value);
        var n = +size.querySelector('select').value, rows = [];
        for (var i = 0; i < n; i++) {
          var row = [];
          for (var j = 0; j <= n; j++) {
            var cell = gridBox.querySelector('[data-cell="' + i + ',' + j + '"]'), q = qparse(cell.value);
            if (!q) throw new Error('Row ' + (i + 1) + ': "' + cell.value + '" is not a number or fraction');
            row.push(q);
          }
          rows.push(row);
        }
        return { vars: DEFAULT_VARS.slice(0, n), rows: rows };
      }
      function solve() {
        out.replaceChildren(); stepsBox.replaceChildren();
        var sys;
        try { sys = system(); } catch (e) { out.appendChild(U.note(e.message, 'err')); return; }
        var m = sys.vars.length;
        if (m < 1) { out.appendChild(U.note('There are no unknowns to solve for.', 'err')); return; }
        if (m > 6 || sys.rows.length > 6) { out.appendChild(U.note('Up to 6 equations and 6 unknowns.', 'err')); return; }
        var g = gaussJordan(sys.rows, m), A = g.A;
        var bad = A.filter(function (r) { return r.slice(0, m).every(qz) && !qz(r[m]); })[0];
        var status = bad ? 'none' : g.rank === m ? 'unique' : 'infinite';
        var head = el('div', { class: 'mf-mid', dataset: { k: 'status' } });
        out.appendChild(head);
        if (status === 'none') {
          head.textContent = 'No solution';
          head.classList.add('mf-err');
          out.appendChild(U.note('Elimination leaves the row 0 = ' + qstr(bad[m]) + ', which is impossible: the equations contradict each other (in two unknowns, parallel lines).'));
        } else if (status === 'unique') {
          head.textContent = 'One solution';
          var sol = {};
          g.pivots.forEach(function (c, i) { sol[sys.vars[c]] = A[i][m]; });
          sys.vars.forEach(function (v) {
            var d = qdec(sol[v]);
            out.appendChild(el('div', { class: 'mb-sol' }, el('span', { text: v + ' = ' + qstr(sol[v]), dataset: { k: 'var-' + v } }),
              sol[v].d !== 1n ? el('small', { text: d.charAt(0) === '≈' ? d : '= ' + d, dataset: { k: 'dec-' + v } }) : null));
          });
          /* substitute back as a check */
          var ok = sys.rows.every(function (r) { return qz(qsub(r.slice(0, m).reduce(function (s, a, j) { return qadd(s, qmul(a, sol[sys.vars[j]])); }, Q0), r[m])); });
          out.appendChild(U.note(ok ? '✓ Substituting back satisfies every equation.' : 'Check failed', ok ? 'ok' : 'err'));
        } else {
          head.textContent = 'Infinitely many solutions';
          var free = sys.vars.filter(function (v, j) { return g.pivots.indexOf(j) < 0; });
          var names = free.length === 1 ? ['t'] : free.map(function (v, i) { return 't' + (i + 1); });
          out.appendChild(U.note('The equations are not independent (rank ' + g.rank + ' for ' + m + ' unknowns), so ' + free.join(', ') + (free.length === 1 ? ' is' : ' are') + ' free. Writing ' +
            free.map(function (v, i) { return v + ' = ' + names[i]; }).join(', ') + ':'));
          sys.vars.forEach(function (v, j) {
            var fi = free.indexOf(v), txt;
            if (fi >= 0) txt = names[fi];
            else {
              var row = A[g.pivots.indexOf(j)], parts = [];
              if (!qz(row[m])) parts.push(qstr(row[m]));
              free.forEach(function (fv, k) {
                var co = qneg(row[sys.vars.indexOf(fv)]);
                if (qz(co)) return;
                var mag = Q(babs(co.n), co.d), coeff = qone(mag) ? '' : qstr(mag);
                parts.push((co.n < 0n ? '− ' : parts.length ? '+ ' : '') + coeff + names[k]);
              });
              txt = parts.length ? parts.join(' ').replace(/^\+ /, '') : '0';
            }
            out.appendChild(el('div', { class: 'mb-sol' }, el('span', { text: v + ' = ' + txt, dataset: { k: 'var-' + v } })));
          });
        }
        var det = el('details', { open: status !== 'unique' || m <= 3 }, el('summary', { text: 'Working: Gauss–Jordan elimination (' + (g.steps.length - 1) + ' steps)' }));
        g.steps.forEach(function (s) { det.appendChild(el('div', { class: 'mb-step' }, el('div', { class: 'op', text: s.op }), el('div', { class: 'scroll' }, matrixNode(s.M, m)))); });
        det.appendChild(U.note('Columns: ' + sys.vars.join(', ') + ' | constant.'));
        stepsBox.appendChild(det);
      }
      var solveSoon = U.debounce(solve, 150);
      text.addEventListener('input', solveSoon);
      size.querySelector('select').addEventListener('change', function () { buildGrid(); solve(); });
      buildGrid(); layout();
      root.appendChild(U.panel(null, mode, typePane, gridPane));
      root.appendChild(U.panel('Solution', out, U.btnrow(U.copyBtn('Copy solution', function () {
        return Array.prototype.map.call(out.querySelectorAll('.mb-sol'), function (n) { return n.textContent; }).join('\n');
      }))));
      root.appendChild(U.panel(null, stepsBox));
      solve();
    }
  });

  /* ======================================================================= */
  /* Complex Number Calculator                                               */
  /* ======================================================================= */
  function C(re, im) { return { re: re, im: im || 0 }; }
  function cadd(a, b) { return C(a.re + b.re, a.im + b.im); }
  function csub(a, b) { return C(a.re - b.re, a.im - b.im); }
  function cmul(a, b) { return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
  function cdiv(a, b) {
    /* Smith's algorithm avoids overflow in |b|² */
    if (b.re === 0 && b.im === 0) throw new Error('Division by zero');
    if (Math.abs(b.re) >= Math.abs(b.im)) { var r = b.im / b.re, d = b.re + b.im * r; return C((a.re + a.im * r) / d, (a.im - a.re * r) / d); }
    var r2 = b.re / b.im, d2 = b.re * r2 + b.im;
    return C((a.re * r2 + a.im) / d2, (a.im * r2 - a.re) / d2);
  }
  function cabs(a) { return Math.hypot(a.re, a.im); }
  function carg(a) { return Math.atan2(a.im, a.re); }
  function cexp(a) { var e = Math.exp(a.re); return C(e * Math.cos(a.im), e * Math.sin(a.im)); }
  function clog(a) { if (a.re === 0 && a.im === 0) throw new Error('log(0) is undefined'); return C(Math.log(cabs(a)), carg(a)); }
  function csqrt(a) {
    if (a.re === 0 && a.im === 0) return C(0, 0);
    var t = Math.sqrt((cabs(a) + Math.abs(a.re)) / 2);
    return a.re >= 0 ? C(t, a.im / (2 * t)) : C(Math.abs(a.im) / (2 * t), a.im < 0 ? -t : t);
  }
  function cpow(a, b) {
    /* whole-number powers by repeated squaring stay exact for Gaussian integers */
    if (b.im === 0 && Number.isInteger(b.re) && Math.abs(b.re) <= 1e6) {
      var n = Math.abs(b.re), r = C(1, 0), x = a;
      while (n) { if (n & 1) r = cmul(r, x); x = cmul(x, x); n = Math.floor(n / 2); }
      return b.re < 0 ? cdiv(C(1, 0), r) : r;
    }
    if (a.re === 0 && a.im === 0) { if (b.re > 0) return C(0, 0); throw new Error('0 to that power is undefined'); }
    return cexp(cmul(b, clog(a)));
  }
  function csin(a) { return C(Math.sin(a.re) * Math.cosh(a.im), Math.cos(a.re) * Math.sinh(a.im)); }
  function ccos(a) { return C(Math.cos(a.re) * Math.cosh(a.im), -Math.sin(a.re) * Math.sinh(a.im)); }
  function polar(r, th) { return C(r * Math.cos(th), r * Math.sin(th)); }
  var CFUN = {
    sqrt: csqrt, exp: cexp, ln: clog, log: clog, sin: csin, cos: ccos, tan: function (a) { return cdiv(csin(a), ccos(a)); },
    conj: function (a) { return C(a.re, -a.im); }, abs: function (a) { return C(cabs(a), 0); }, mod: function (a) { return C(cabs(a), 0); },
    re: function (a) { return C(a.re, 0); }, im: function (a) { return C(a.im, 0); }, cis: function (a) { return cexp(C(-a.im, a.re)); }
  };
  /* Expression parser: a+bi, r∠θ, r·e^(iθ), + − × ÷ ^, brackets, functions
     and implicit multiplication (2i, 3(1+i), 2e^(iπ/3)). */
  function cparse(src, deg) {
    var s = String(src).replace(/[−–]/g, '-').replace(/×|·/g, '*').replace(/÷/g, '/').replace(/π/g, 'pi');
    var toks = [], i = 0, m;
    while (i < s.length) {
      var rest = s.slice(i);
      if ((m = /^\s+/.exec(rest))) { i += m[0].length; continue; }
      /* 2e3 is a number; in 2e^(i) the e is Euler's number */
      if ((m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(rest))) { toks.push({ t: 'n', v: parseFloat(m[0]) }); i += m[0].length; continue; }
      if ((m = /^[a-z]+/i.exec(rest))) {
        var w = m[0].toLowerCase(), j = 0;
        /* split runs like "ipi" or "2ie" into known names */
        while (j < w.length) {
          var hit = ['sqrt', 'conj', 'exp', 'cis', 'sin', 'cos', 'tan', 'abs', 'mod', 'arg', 'rad', 'deg', 'pi', 'ln', 'log', 're', 'im', 'i', 'j', 'e']
            .filter(function (k) { return w.indexOf(k, j) === j; })[0];
          if (!hit) throw new Error('Unknown name "' + m[0] + '"');
          toks.push(hit === 'i' || hit === 'j' ? { t: 'i' } : hit === 'pi' ? { t: 'n', v: PI } : hit === 'e' ? { t: 'n', v: Math.E } :
            hit === 'rad' || hit === 'deg' ? { t: hit } : { t: 'f', v: hit });
          j += hit.length;
        }
        i += m[0].length; continue;
      }
      if ('+-*/^()∠°'.indexOf(s[i]) > -1) { toks.push({ t: s[i] }); i++; continue; }
      throw new Error('Unexpected "' + s[i] + '"');
    }
    var p = 0;
    function peek() { return toks[p]; }
    function eat(t) { if (toks[p] && toks[p].t === t) { p++; return true; } return false; }
    function starts(t) { return t && (t.t === 'n' || t.t === 'i' || t.t === 'f' || t.t === '('); }
    function expr() { var v = term(); for (;;) { if (eat('+')) v = cadd(v, term()); else if (eat('-')) v = csub(v, term()); else return v; } }
    function term() {
      var v = unary();
      for (;;) {
        if (eat('*')) v = cmul(v, unary());
        else if (eat('/')) v = cdiv(v, unary());
        else if (starts(peek())) v = cmul(v, unary());
        else return v;
      }
    }
    function unary() { if (eat('-')) return cmul(C(-1, 0), unary()); if (eat('+')) return unary(); return angle(); }
    function angle() {
      var r = power();
      if (eat('∠')) {
        var neg = eat('-');
        var th = power(), explicit = false;
        if (eat('°')) { th = C(th.re * PI / 180, 0); explicit = true; }
        else if (eat('rad')) explicit = true;
        else if (eat('deg')) { th = C(th.re * PI / 180, 0); explicit = true; }
        if (th.im !== 0) throw new Error('The angle after ∠ must be real');
        var a = (neg ? -1 : 1) * th.re;
        if (!explicit && deg) a = a * PI / 180;
        if (r.im !== 0) throw new Error('The modulus before ∠ must be real');
        return polar(r.re, a);
      }
      return r;
    }
    function power() {
      var b = post();
      if (eat('^')) return cpow(b, unary());
      return b;
    }
    function post() {
      var v = primary();
      if (peek() && peek().t === '°' && !(toks[p - 2] && toks[p - 2].t === '∠')) { p++; v = C(v.re * PI / 180, v.im * PI / 180); }
      return v;
    }
    function primary() {
      var t = toks[p++];
      if (!t) throw new Error('The expression ends too soon');
      if (t.t === 'n') return C(t.v, 0);
      if (t.t === 'i') return C(0, 1);
      if (t.t === '(') { var v = expr(); if (!eat(')')) throw new Error('Missing )'); return v; }
      if (t.t === 'f') {
        var arg = eat('(') ? (function () { var a = expr(); if (!eat(')')) throw new Error('Missing ) after ' + t.v); return a; })() : power();
        if (t.v === 'arg') return C(deg ? carg(arg) * 180 / PI : carg(arg), 0);
        return CFUN[t.v](arg);
      }
      throw new Error('Unexpected "' + t.t + '"');
    }
    if (!toks.length) throw new Error('Type an expression');
    var out = expr();
    if (p < toks.length) throw new Error('Unexpected "' + (toks[p].v !== undefined ? toks[p].v : toks[p].t) + '"');
    if (!isFinite(out.re) || !isFinite(out.im)) throw new Error('The result is not finite');
    return out;
  }
  function clean(x, scale) { return Math.abs(x) < 1e-12 * Math.max(1, scale) ? 0 : x; }
  function cfmt(z) {
    var sc = cabs(z), re = clean(z.re, sc), im = clean(z.im, sc);
    var f = function (x) { return fmt(x, 10); };
    if (im === 0) return f(re);
    var imTxt = Math.abs(im) === 1 ? 'i' : f(Math.abs(im)) + 'i';
    if (re === 0) return (im < 0 ? '−' : '') + imTxt;
    return f(re) + (im < 0 ? ' − ' : ' + ') + imTxt;
  }
  function angleTxt(th, deg) { th = clean(th, 1); return deg ? fmt(th * 180 / PI, 10) + '°' : fmt(th, 10) + ' rad'; }
  function argandSvg(points, opts) {
    var S = 260, c = S / 2, maxv = 0;
    points.forEach(function (z) { maxv = Math.max(maxv, Math.abs(z.re), Math.abs(z.im)); });
    if (!(maxv > 0)) maxv = 1;
    var p10 = Math.pow(10, Math.floor(Math.log10(maxv))), nice = [1, 2, 5, 10].map(function (k) { return k * p10; }).filter(function (k) { return k >= maxv; })[0];
    var sc = (c - 22) / nice;
    function X(x) { return (c + x * sc).toFixed(1); } function Y(y) { return (c - y * sc).toFixed(1); }
    var s = '<svg viewBox="0 0 ' + S + ' ' + S + '" aria-hidden="true">';
    s += '<line class="grid" x1="' + X(-nice) + '" y1="' + Y(nice) + '" x2="' + X(nice) + '" y2="' + Y(nice) + '"/><line class="grid" x1="' + X(-nice) + '" y1="' + Y(-nice) + '" x2="' + X(nice) + '" y2="' + Y(-nice) + '"/>';
    s += '<line class="grid" x1="' + X(nice) + '" y1="' + Y(-nice) + '" x2="' + X(nice) + '" y2="' + Y(nice) + '"/><line class="grid" x1="' + X(-nice) + '" y1="' + Y(-nice) + '" x2="' + X(-nice) + '" y2="' + Y(nice) + '"/>';
    s += '<line class="axis" x1="6" y1="' + c + '" x2="' + (S - 6) + '" y2="' + c + '"/><line class="axis" x1="' + c + '" y1="6" x2="' + c + '" y2="' + (S - 6) + '"/>';
    s += '<text class="tick" x="' + (S - 8) + '" y="' + (c - 5) + '" text-anchor="end">Re</text><text class="tick" x="' + (c + 5) + '" y="14">Im</text>';
    s += '<text class="tick" x="' + X(nice) + '" y="' + (c + 14) + '" text-anchor="middle">' + fmt(nice, 3) + '</text><text class="tick" x="' + (c + 4) + '" y="' + (Number(Y(nice)) + 4) + '">' + fmt(nice, 3) + 'i</text>';
    if (opts && opts.circle) s += '<circle class="hid" cx="' + c + '" cy="' + c + '" r="' + (opts.circle * sc).toFixed(1) + '"/>';
    if (opts && opts.polygon && points.length > 2) s += '<path class="thin" d="M' + points.map(function (z) { return X(z.re) + ' ' + Y(z.im); }).join('L') + 'Z"/>';
    points.forEach(function (z, i) {
      s += '<line class="vec" x1="' + c + '" y1="' + c + '" x2="' + X(z.re) + '" y2="' + Y(z.im) + '"/><circle class="pt" cx="' + X(z.re) + '" cy="' + Y(z.im) + '" r="4"/>';
      if (points.length > 1) s += '<text class="ptl" x="' + (Number(X(z.re)) + 6) + '" y="' + (Number(Y(z.im)) - 6) + '">' + (opts && opts.label ? opts.label(i) : '') + '</text>';
    });
    return s + '</svg>';
  }

  Tools.register({
    id: 'complex-calculator', category: 'math', name: 'Complex Number Calculator',
    description: 'Evaluate complex expressions in a + bi, polar r∠θ or exponential form: arithmetic, powers, every n-th root, conjugate, modulus, argument, exp, log, sin and cos, plotted on an Argand diagram.',
    keywords: ['complex numbers', 'imaginary', 'i', 'a+bi', 'polar form', 'exponential form', 'euler', 'argand', 'modulus', 'argument',
      'conjugate', 'roots of unity', 'nth root', 'de moivre', 'phasor', 'cis'],
    render: function (root) {
      setRoot(root);
      var deg = true;
      var ang = U.chips([{ value: 'deg', label: 'Degrees' }, { value: 'rad', label: 'Radians' }], function (v) { deg = v === 'deg'; run(); runRoots(); }, 'deg');
      ang.dataset.k = 'angle-mode';
      var expr = textIn('Expression', '(3+4i)*(1-2i)', { style: { fontFamily: 'var(--mono)' }, placeholder: 'e.g. (2+3i)/(1-i), 2∠45 * 3∠30, e^(i*pi/3), sqrt(-4)' });
      var fnRow = el('div', { class: 'chips mb-fn' }, ['conj', 'abs', 'arg', 'sqrt', 'exp', 'ln', 'sin', 'cos'].map(function (f) {
        return el('button', { type: 'button', class: 'chip', text: f + '( )', onclick: function () { expr.input.value = f + '(' + (expr.input.value || '') + ')'; run(); } });
      }), el('button', { type: 'button', class: 'chip', text: '∠', onclick: function () { expr.input.value += '∠'; expr.input.focus(); } }));
      var status = U.note(''), res = el('dl', { class: 'mb-kv' }), plot = el('div', { class: 'mb-diagram' });
      var rz = textIn('Number z', '8', { style: { fontFamily: 'var(--mono)' } }), rn = numIn('n', 3, { min: 1, max: 64, step: 1 });
      var rootsOut = el('div'), rootsPlot = el('div', { class: 'mb-diagram' });
      function kv(label, value, key) { return [el('dt', { text: label }), el('dd', { text: value, dataset: { k: key } })]; }
      function run() {
        status.textContent = ''; status.className = 'note'; res.replaceChildren(); plot.innerHTML = '';
        var z;
        try { z = cparse(expr.input.value, deg); } catch (e) { status.className = 'note err'; status.textContent = e.message; return; }
        var r = cabs(z), th = carg(z);
        res.append.apply(res, [].concat(
          kv('Rectangular', cfmt(z), 'rect'),
          kv('Polar', fmt(r, 10) + '∠' + angleTxt(th, deg), 'polar'),
          kv('Exponential', r === 0 ? '0' : fmt(r, 10) + '·e^(' + fmt(clean(th, 1), 10) + 'i)', 'exp'),
          kv('Modulus |z|', fmt(r, 10), 'mod'),
          kv('Argument arg z', angleTxt(th, deg), 'arg'),
          kv('Conjugate z̄', cfmt(C(z.re, -z.im)), 'conj')));
        plot.innerHTML = argandSvg([z]);
      }
      function runRoots() {
        rootsOut.replaceChildren(); rootsPlot.innerHTML = '';
        var z, n = val(rn);
        try { z = cparse(rz.input.value, deg); } catch (e) { rootsOut.appendChild(U.note(e.message, 'err')); return; }
        if (!Number.isInteger(n) || n < 1 || n > 64) { rootsOut.appendChild(U.note('n must be a whole number from 1 to 64.', 'err')); return; }
        var r = Math.pow(cabs(z), 1 / n), th = carg(z), roots = [];
        for (var k = 0; k < n; k++) roots.push(polar(r, (th + 2 * PI * k) / n));
        rootsOut.appendChild(el('ol', { class: 'mb-roots', start: 0, dataset: { k: 'roots' } }, roots.map(function (w, k) {
          return el('li', { text: cfmt(w) + '   (' + fmt(r, 10) + '∠' + angleTxt((th + 2 * PI * k) / n, deg) + ')' });
        })));
        rootsOut.appendChild(U.note('w_k = |z|^(1/n) ∠ (arg z + 2πk)/n for k = 0 … ' + (n - 1) + '. They sit evenly round a circle of radius ' + fmt(r, 6) + '; k = 0 is the principal root.'));
        rootsPlot.innerHTML = argandSvg(roots, { circle: r, polygon: true, label: function (i) { return 'w' + i; } });
      }
      U.live([expr], run);
      U.live([rz, rn], runRoots);
      root.appendChild(U.panel(null, ang, expr, fnRow, U.note('Write i (or j) for √−1. Polar: 2∠45 uses the angle mode, or say 2∠45° or 2∠0.785rad. Exponential: 3e^(i*pi/4). Functions: sqrt exp ln sin cos tan conj abs arg re im cis. Powers take the principal value.'), status));
      root.appendChild(U.split(U.panel('Result', res, U.btnrow(U.copyBtn('Copy result', function () { var n = res.querySelector('[data-k="rect"]'); return n ? n.textContent : ''; }))), U.panel('Argand diagram', plot)));
      root.appendChild(U.split(U.panel('All n-th roots', U.row(rz, rn), rootsOut), U.panel('Roots on the Argand diagram', rootsPlot)));
    }
  });

  /* ======================================================================= */
  /* Modular Arithmetic Calculator                                           */
  /* ======================================================================= */
  function bmod(a, n) { var r = a % n; return r < 0n ? r + babs(n) : r; }  /* Euclidean: always 0..|n|-1 */
  function bmodpow(b, e, m) {
    if (m === 1n) return 0n;
    var r = 1n; b = bmod(b, m);
    while (e > 0n) { if (e & 1n) r = r * b % m; e >>= 1n; b = b * b % m; }
    return r;
  }
  function egcd(a, b) {
    var rows = [], or = a, r = b, os = 1n, s = 0n, ot = 0n, t = 1n;
    rows.push(['', or, os, ot], ['', r, s, t]);
    while (r !== 0n) {
      var q = or / r, tmp;
      tmp = or - q * r; or = r; r = tmp;
      tmp = os - q * s; os = s; s = tmp;
      tmp = ot - q * t; ot = t; t = tmp;
      rows.push([q, r, s, t]);
    }
    return { g: or, x: os, y: ot, rows: rows };
  }
  function binv(a, n) { var e = egcd(bmod(a, n), n); return e.g === 1n ? bmod(e.x, n) : null; }
  function factorBig(n) {
    var MK = window.MathKit && window.MathKit.big;
    if (!MK) throw new Error('Needs math.js to be loaded');
    var f = n === 1n ? [] : MK.factorize(n);
    if (!f) throw new Error('Could not factorise ' + n + ' in a reasonable time');
    var groups = [];
    f.forEach(function (p) { var g = groups[groups.length - 1]; if (g && g.p === p) g.e++; else groups.push({ p: p, e: 1 }); });
    return groups;
  }
  function totient(groups, n) { return groups.reduce(function (acc, g) { return acc / g.p * (g.p - 1n); }, n); }
  function factorTxt(groups) { return groups.length ? groups.map(function (g) { return g.p + (g.e > 1 ? sup(g.e) : ''); }).join(' × ') : '1'; }

  Tools.register({
    id: 'modular-calculator', category: 'math', name: 'Modular Arithmetic Calculator',
    description: 'a mod n with negatives handled, modular addition, multiplication and fast powers, inverses with the extended Euclidean working, the Chinese Remainder Theorem, Euler\'s totient and the order of an element, all on whole numbers of any size.',
    keywords: ['modular arithmetic', 'modulo', 'mod', 'remainder', 'modular exponentiation', 'power mod', 'modular inverse', 'extended euclidean algorithm',
      'bezout', 'chinese remainder theorem', 'crt', 'euler totient', 'phi', 'multiplicative order', 'primitive root', 'congruence', 'number theory', 'rsa'],
    render: function (root) {
      setRoot(root);
      var panes = {}, host = el('div');
      var bar = tabs([{ value: 'mod', label: 'a mod n' }, { value: 'arith', label: 'Add, multiply, power' }, { value: 'inv', label: 'Inverse' },
        { value: 'crt', label: 'Chinese remainder' }, { value: 'phi', label: 'Totient' }, { value: 'ord', label: 'Order' }], show, 'mod');
      bar.dataset.k = 'mod-tabs';
      function show(v) { Object.keys(panes).forEach(function (k) { panes[k].style.display = k === v ? '' : 'none'; }); }
      function bigIn(label, v) { return textIn(label, v, { inputMode: 'numeric', style: { fontFamily: 'var(--mono)' } }); }
      function need(ws) {
        var vals = ws.map(function (w) { return big(w.input.value); });
        if (vals.some(function (x) { return x === null; })) throw new Error('Enter whole numbers (negative is fine where it makes sense).');
        return vals;
      }
      function pane(key, title, inputs, fn, extra) {
        var out = el('div');
        U.live(inputs, function () { out.replaceChildren(); try { fn(out); } catch (e) { out.appendChild(U.note(e.message, 'err')); } });
        panes[key] = U.panel(title, U.row.apply(null, inputs), extra || null, out);
      }

      var ma = bigIn('a', '-7'), mn = bigIn('n', '3');
      pane('mod', 'a mod n', [ma, mn], function (out) {
        var v = need([ma, mn]), a = v[0], n = v[1];
        if (n === 0n) throw new Error('n cannot be 0.');
        var r = bmod(a, n), q = (a - r) / n, trunc = a % n;
        out.append(el('div', { class: 'mf-big', text: String(r), dataset: { k: 'mod' } }),
          U.note(a + ' = ' + n + ' × ' + (q < 0n ? '(' + q + ')' : q) + ' + ' + r + '. The result is always between 0 and ' + (babs(n) - 1n) + '.'),
          U.note('For comparison, the truncated remainder that C, Java and JavaScript\'s % give is ' + trunc + (trunc !== r ? ' (it keeps the sign of a).' : '.')));
      });

      var aa = bigIn('a', '4'), ab = bigIn('b', '13'), an = bigIn('Modulus n', '497');
      var aop = U.select({ label: 'Operation', value: '^', options: [{ value: '+', label: 'a + b' }, { value: '-', label: 'a − b' }, { value: '*', label: 'a × b' }, { value: '^', label: 'a ^ b (power)' }] });
      pane('arith', 'Modular arithmetic', [aa, aop, ab, an], function (out) {
        var v = need([aa, ab, an]), a = v[0], b = v[1], n = v[2], o = aop.querySelector('select').value, r;
        if (n <= 0n) throw new Error('The modulus must be a positive whole number.');
        if (o === '+') r = bmod(a + b, n);
        else if (o === '-') r = bmod(a - b, n);
        else if (o === '*') r = bmod(a * b, n);
        else {
          var base = a;
          if (b < 0n) { base = binv(a, n); if (base === null) throw new Error(a + ' has no inverse mod ' + n + ', so a negative power is undefined.'); }
          r = bmodpow(base, babs(b), n);
        }
        out.appendChild(el('div', { class: 'mf-big', text: String(r), dataset: { k: 'arith' } }));
        if (o === '^' && b > 0n) {
          /* square-and-multiply working, one row per bit of the exponent */
          var bits = b.toString(2);
          if (bits.length <= 64) {
            var rows = [], x = bmod(a, n), acc = 1n, k = 0;
            for (var i = bits.length - 1; i >= 0; i--, k++) {
              var bit = bits[i];
              if (bit === '1') acc = acc * x % n;
              rows.push([k, bit, a + '^' + (1n << BigInt(k)) + ' ≡ ' + x, bit === '1' ? String(acc) : '—']);
              x = x * x % n;
            }
            out.appendChild(el('details', null, el('summary', { text: 'Working: square and multiply (' + bits.length + ' bits, ' + b + ' = ' + bits + '₂)' }),
              el('div', { class: 'scroll' }, U.table(['Bit', 'Value', 'Square', 'Running product'], rows))));
          } else out.appendChild(U.note('Computed by square and multiply in ' + bits.length + ' steps.'));
        }
      }, null);

      var ia = bigIn('a', '17'), inn = bigIn('Modulus n', '3120');
      pane('inv', 'Modular inverse', [ia, inn], function (out) {
        var v = need([ia, inn]), a = v[0], n = v[1];
        if (n <= 1n) throw new Error('The modulus must be at least 2.');
        var e = egcd(bmod(a, n), n);
        if (e.g !== 1n) out.appendChild(el('div', { class: 'mf-mid mf-err', text: 'No inverse: gcd(' + a + ', ' + n + ') = ' + e.g, dataset: { k: 'inv' } }));
        else {
          var x = bmod(e.x, n);
          out.append(el('div', { class: 'mf-big', text: String(x), dataset: { k: 'inv' } }),
            U.note(bmod(a, n) + ' × ' + (e.x < 0n ? '(' + e.x + ')' : e.x) + ' + ' + n + ' × ' + (e.y < 0n ? '(' + e.y + ')' : e.y) + ' = 1, so ' + a + ' × ' + x + ' ≡ 1 (mod ' + n + ').'));
        }
        out.appendChild(el('details', { open: true }, el('summary', { text: 'Working: extended Euclidean algorithm' }),
          el('div', { class: 'scroll' }, U.table(['Quotient q', 'Remainder r', 's', 't'], e.rows.map(function (r) { return r.map(String); }))),
          U.note('Each row: r = s × ' + bmod(a, n) + ' + t × ' + n + '. Stop at remainder 0; the row above it holds the gcd and the Bézout coefficients.')));
      });

      /* CRT with any number of congruences; moduli need not be coprime. */
      var crtRows = el('div', { class: 'mb-crt' }), crtOut = el('div');
      function crtRow(a, n) {
        var ra = bigIn('x ≡', a), rn = bigIn('(mod', n);
        var row = el('div', { class: 'row' }, ra, rn, el('span', { class: 'mf-muted', text: ')' }), U.button('Remove', function () { if (crtRows.children.length > 1) { row.remove(); runCrt(); } }, 'ghost'));
        row.ra = ra; row.rn = rn;
        [ra, rn].forEach(function (w) { w.input.addEventListener('input', runCrt); });
        crtRows.appendChild(row);
      }
      function runCrt() {
        crtOut.replaceChildren();
        try {
          var eqs = Array.prototype.map.call(crtRows.children, function (row) { return need([row.ra, row.rn]); });
          if (eqs.some(function (e) { return e[1] <= 0n; })) throw new Error('Every modulus must be a positive whole number.');
          var x = bmod(eqs[0][0], eqs[0][1]), M = eqs[0][1], steps = ['Start: x ≡ ' + x + ' (mod ' + M + ')'];
          for (var i = 1; i < eqs.length; i++) {
            var a = bmod(eqs[i][0], eqs[i][1]), n = eqs[i][1], g = bgcd(M, n);
            if ((a - x) % g !== 0n) {
              crtOut.append(el('div', { class: 'mf-mid mf-err', text: 'No solution', dataset: { k: 'crt' } }),
                U.note('x ≡ ' + x + ' (mod ' + M + ') and x ≡ ' + a + ' (mod ' + n + ') disagree: gcd(' + M + ', ' + n + ') = ' + g + ' does not divide ' + (a - x) + '.'));
              return;
            }
            var mg = M / g, ng = n / g, inv = ng === 1n ? 0n : binv(bmod(mg, ng), ng);
            var k = bmod((a - x) / g * inv, ng);
            x = x + M * k; M = mg * n; x = bmod(x, M);
            steps.push('Combine with x ≡ ' + a + ' (mod ' + n + '): gcd ' + g + ', k = ' + k + ' → x ≡ ' + x + ' (mod ' + M + ')');
          }
          crtOut.append(el('div', { class: 'mf-big', text: 'x ≡ ' + x + ' (mod ' + M + ')', dataset: { k: 'crt' } }),
            U.note('Smallest non-negative solution ' + x + '; every solution is ' + x + ' + ' + M + 'k.'),
            el('details', null, el('summary', { text: 'Working' }), el('ol', { class: 'mb-rules' }, steps.map(function (s) { return el('li', { text: s }); }))));
        } catch (e) { crtOut.appendChild(U.note(e.message, 'err')); }
      }
      crtRow('2', '3'); crtRow('3', '5'); crtRow('2', '7');
      panes.crt = U.panel('Chinese Remainder Theorem', crtRows, U.btnrow(U.button('Add congruence', function () { crtRow('0', '2'); runCrt(); })), crtOut,
        U.note('The moduli do not have to be coprime; if they share factors the congruences must agree on them.'));
      runCrt();

      var pn = bigIn('n', '36');
      pane('phi', 'Euler\'s totient φ(n)', [pn], function (out) {
        var n = need([pn])[0];
        if (n < 1n) throw new Error('n must be a positive whole number.');
        var groups = factorBig(n), phi = totient(groups, n);
        out.append(el('div', { class: 'mf-big', text: 'φ(' + n + ') = ' + phi, dataset: { k: 'phi' } }),
          U.note(n === 1n ? 'By convention φ(1) = 1.' : n + ' = ' + factorTxt(groups) + ', so φ(n) = n' + groups.map(function (g) { return ' × (1 − 1/' + g.p + ')'; }).join('') + ' = ' + phi + '.'),
          U.note('φ(n) counts the numbers from 1 to n that share no factor with n.' + (groups.length === 1 && groups[0].e === 1 ? ' ' + n + ' is prime, so φ(n) = n − 1.' : '')));
      });

      var oa = bigIn('a', '3'), on = bigIn('Modulus n', '7');
      pane('ord', 'Multiplicative order', [oa, on], function (out) {
        var v = need([oa, on]), a = bmod(v[0], v[1]), n = v[1];
        if (n < 2n) throw new Error('The modulus must be at least 2.');
        if (bgcd(a, n) !== 1n) throw new Error(v[0] + ' and ' + n + ' share a factor, so no power of it is ever 1 (mod ' + n + ').');
        var groups = factorBig(n), phi = totient(groups, n), t = phi;
        factorBig(phi).forEach(function (g) { for (var e = 0; e < g.e; e++) { if (bmodpow(a, t / g.p, n) === 1n) t /= g.p; else break; } });
        out.append(el('div', { class: 'mf-big', text: 'ord = ' + t, dataset: { k: 'order' } }),
          U.note('The smallest k with ' + v[0] + '^k ≡ 1 (mod ' + n + '). It divides φ(' + n + ') = ' + phi + '.' + (t === phi ? ' Since it equals φ(n), ' + v[0] + ' is a primitive root mod ' + n + '.' : '')));
        if (t <= 60n) {
          var pw = [], x = 1n;
          for (var k = 1n; k <= t; k++) { x = x * a % n; pw.push(v[0] + sup(k) + ' ≡ ' + x); }
          out.appendChild(U.note(pw.join('   ')));
        }
      });

      ['mod', 'arith', 'inv', 'crt', 'phi', 'ord'].forEach(function (k) { host.appendChild(panes[k]); });
      show('mod');
      root.appendChild(bar);
      root.appendChild(host);
    }
  });
})();
