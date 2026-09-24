/* geo tools: coordinate and OS grid reference conversion, distances and
   bearings, GPX/KML track viewing, geodesic polygon areas and geohashes. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-geo-style')) {
    document.head.appendChild(el('style', { id: 'g-geo-style', text: [
      '.g-geo .gg-big{font-size:1.5em;font-weight:700;margin:4px 0;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}',
      '.g-geo .gg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}',
      '.g-geo .gg-card{border:1px solid var(--border);border-radius:var(--radius);padding:8px 10px;background:var(--bg-sunken);min-width:0}',
      '.g-geo .gg-card span{display:block;color:var(--fg-muted);font-size:12px}',
      '.g-geo .gg-card b{display:block;font-family:var(--mono);font-size:14px;font-weight:600;overflow-wrap:anywhere}',
      '.g-geo .gg-card.hl{border-color:var(--accent);background:var(--accent-weak)}',
      '.g-geo .gg-card button{margin-top:4px;padding:2px 8px;font-size:12px}',
      '.g-geo .gg-scroll{overflow:auto;max-width:100%}',
      '.g-geo .gg-warn{color:var(--err)}',
      '.g-geo svg.gg-map{display:block;width:100%;height:auto;background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--radius)}',
      '.g-geo svg.gg-map .land{fill:var(--bg-elev);stroke:var(--border);stroke-width:.6}',
      '.g-geo svg.gg-map .trk{fill:none;stroke:var(--accent);stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round}',
      '.g-geo svg.gg-map .rte{fill:none;stroke:var(--ok);stroke-width:2;stroke-dasharray:6 4}',
      '.g-geo svg.gg-map .wpt{fill:var(--err);stroke:var(--bg);stroke-width:1.5}',
      '.g-geo svg.gg-map .poly{fill:var(--accent-weak);stroke:var(--accent);stroke-width:2;fill-rule:evenodd}',
      '.g-geo svg.gg-map text,.g-geo svg.gg-prof text{fill:var(--fg);font:11px system-ui,sans-serif}',
      '.g-geo svg.gg-prof{display:block;width:100%;height:auto}',
      '.g-geo svg.gg-prof .area{fill:var(--accent-weak);stroke:var(--accent);stroke-width:1.5}',
      '.g-geo svg.gg-prof .axis{stroke:var(--border);stroke-width:1}',
      '.g-geo .gg-nb{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;max-width:420px}',
      '.g-geo .gg-nb div{border:1px solid var(--border);border-radius:var(--radius-s,6px);padding:6px;text-align:center;font-family:var(--mono);background:var(--bg-sunken)}',
      '.g-geo .gg-nb div.c{border-color:var(--accent);background:var(--accent-weak);font-weight:700}',
      '.g-geo .gg-nb small{display:block;color:var(--fg-muted);font-family:inherit;font-size:11px}',
      '.g-geo table.data tr.cur td{background:var(--accent-weak);font-weight:600}',
      '.g-geo textarea{min-height:140px}',
      '.g-geo .field{max-width:100%}'
    ].join('\n') }));
  }

  function box(root) { root.classList.add('g-geo'); return root; }
  /* Append children, skipping null/false and flattening arrays: the native
     append() would print them as text. */
  function put(node) {
    (function add(list) {
      list.forEach(function (k) {
        if (k === null || k === undefined || k === false) return;
        if (Array.isArray(k)) add(k); else node.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
      });
    })(Array.prototype.slice.call(arguments, 1));
    return node;
  }
  function inp(field) { return field.querySelector ? (field.querySelector('input, select, textarea') || field) : field; }
  function num(v) { var n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : NaN; }
  function sig(v, p) { return String(parseFloat(v.toPrecision(p))); }
  function group(v, d) { return v.toLocaleString('en-GB', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function card(label, value, k, extra) {
    var b = el('b', { dataset: k ? { k: k } : null, text: value });
    return el('div', { class: 'gg-card' + (extra && extra.hl ? ' hl' : '') }, el('span', { text: label }), b,
      extra && extra.copy ? U.button('Copy', function () { U.copy(value); }, 'ghost') : null);
  }
  function svgEl(tag, attrs) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]); });
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) n.appendChild(typeof arguments[i] === 'string' ? document.createTextNode(arguments[i]) : arguments[i]);
    return n;
  }
  function escXml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]; }); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* --- geodesy on the WGS84 ellipsoid ----------------------------------------- */

  var A = 6378137, F = 1 / 298.257223563, B = A * (1 - F), E2 = F * (2 - F), E = Math.sqrt(E2);
  var R_MEAN = 6371008.8;   /* IUGG mean Earth radius, for the spherical formulas */
  var RAD = Math.PI / 180;
  function wrap180(d) { return ((d + 540) % 360 + 360) % 360 - 180; }
  function wrap360(d) { return (d % 360 + 360) % 360; }

  /* Vincenty (1975) inverse: distance (m) and azimuths (degrees), or null if
     the iteration does not converge (nearly antipodal points). */
  function inverse(lat1, lon1, lat2, lon2) {
    var L = wrap180(lon2 - lon1) * RAD;
    var U1 = Math.atan((1 - F) * Math.tan(lat1 * RAD)), U2 = Math.atan((1 - F) * Math.tan(lat2 * RAD));
    var sinU1 = Math.sin(U1), cosU1 = Math.cos(U1), sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);
    var lambda = L, lambdaP, iter = 0, sinL, cosL, sinS, cosS, sigma, sinA, cos2A, cos2Sm, C;
    do {
      sinL = Math.sin(lambda); cosL = Math.cos(lambda);
      var t1 = cosU2 * sinL, t2 = cosU1 * sinU2 - sinU1 * cosU2 * cosL;
      sinS = Math.sqrt(t1 * t1 + t2 * t2);
      if (sinS === 0) return { s: 0, a1: NaN, a2: NaN };
      cosS = sinU1 * sinU2 + cosU1 * cosU2 * cosL;
      sigma = Math.atan2(sinS, cosS);
      sinA = cosU1 * cosU2 * sinL / sinS;
      cos2A = 1 - sinA * sinA;
      cos2Sm = cos2A !== 0 ? cosS - 2 * sinU1 * sinU2 / cos2A : 0;
      C = F / 16 * cos2A * (4 + F * (4 - 3 * cos2A));
      lambdaP = lambda;
      lambda = L + (1 - C) * F * sinA * (sigma + C * sinS * (cos2Sm + C * cosS * (-1 + 2 * cos2Sm * cos2Sm)));
      if (Math.abs(lambda) > Math.PI + 1e-9 && iter > 10) return null;
    } while (Math.abs(lambda - lambdaP) > 1e-12 && ++iter < 1000);
    if (iter >= 1000) return null;
    var uSq = cos2A * (A * A - B * B) / (B * B);
    var AA = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
    var BB = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
    var dS = BB * sinS * (cos2Sm + BB / 4 * (cosS * (-1 + 2 * cos2Sm * cos2Sm) - BB / 6 * cos2Sm * (-3 + 4 * sinS * sinS) * (-3 + 4 * cos2Sm * cos2Sm)));
    var a1 = Math.atan2(cosU2 * sinL, cosU1 * sinU2 - sinU1 * cosU2 * cosL) / RAD;
    var a2 = Math.atan2(cosU1 * sinL, -sinU1 * cosU2 + cosU1 * sinU2 * cosL) / RAD;
    return { s: B * AA * (sigma - dS), a1: wrap360(a1), a2: wrap360(a2) };
  }
  /* Vincenty direct: the point s metres from (lat, lon) along azimuth az. */
  function direct(lat1, lon1, az, s) {
    var a1 = az * RAD, sinA1 = Math.sin(a1), cosA1 = Math.cos(a1);
    var tanU1 = (1 - F) * Math.tan(lat1 * RAD), cosU1 = 1 / Math.sqrt(1 + tanU1 * tanU1), sinU1 = tanU1 * cosU1;
    var s1 = Math.atan2(tanU1, cosA1), sinA = cosU1 * sinA1, cos2A = 1 - sinA * sinA;
    var uSq = cos2A * (A * A - B * B) / (B * B);
    var AA = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
    var BB = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
    var sigma = s / (B * AA), sigmaP, iter = 0, cos2Sm, sinS, cosS;
    do {
      cos2Sm = Math.cos(2 * s1 + sigma); sinS = Math.sin(sigma); cosS = Math.cos(sigma);
      var dS = BB * sinS * (cos2Sm + BB / 4 * (cosS * (-1 + 2 * cos2Sm * cos2Sm) - BB / 6 * cos2Sm * (-3 + 4 * sinS * sinS) * (-3 + 4 * cos2Sm * cos2Sm)));
      sigmaP = sigma; sigma = s / (B * AA) + dS;
    } while (Math.abs(sigma - sigmaP) > 1e-12 && ++iter < 200);
    cos2Sm = Math.cos(2 * s1 + sigma); sinS = Math.sin(sigma); cosS = Math.cos(sigma);
    var x = sinU1 * sinS - cosU1 * cosS * cosA1;
    var lat2 = Math.atan2(sinU1 * cosS + cosU1 * sinS * cosA1, (1 - F) * Math.sqrt(sinA * sinA + x * x));
    var lambda = Math.atan2(sinS * sinA1, cosU1 * cosS - sinU1 * sinS * cosA1);
    var C = F / 16 * cos2A * (4 + F * (4 - 3 * cos2A));
    var L = lambda - (1 - C) * F * sinA * (sigma + C * sinS * (cos2Sm + C * cosS * (-1 + 2 * cos2Sm * cos2Sm)));
    return { lat: lat2 / RAD, lon: wrap180(lon1 + L / RAD), az: wrap360(Math.atan2(sinA, -x) / RAD) };
  }
  /* Great-circle (haversine) distance on a sphere of the mean radius. */
  function haversine(lat1, lon1, lat2, lon2) {
    var p1 = lat1 * RAD, p2 = lat2 * RAD, dp = p2 - p1, dl = wrap180(lon2 - lon1) * RAD;
    var h = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * R_MEAN * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
  function sphBearing(lat1, lon1, lat2, lon2) {
    var p1 = lat1 * RAD, p2 = lat2 * RAD, dl = wrap180(lon2 - lon1) * RAD;
    return wrap360(Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) / RAD);
  }
  function sphMidpoint(lat1, lon1, lat2, lon2) {
    var p1 = lat1 * RAD, p2 = lat2 * RAD, dl = wrap180(lon2 - lon1) * RAD;
    var bx = Math.cos(p2) * Math.cos(dl), by = Math.cos(p2) * Math.sin(dl);
    var pm = Math.atan2(Math.sin(p1) + Math.sin(p2), Math.sqrt((Math.cos(p1) + bx) * (Math.cos(p1) + bx) + by * by));
    return { lat: pm / RAD, lon: wrap180(lon1 + Math.atan2(by, Math.cos(p1) + bx) / RAD) };
  }
  /* Rhumb line (loxodrome) distance and constant bearing, on the sphere. */
  function rhumb(lat1, lon1, lat2, lon2) {
    var p1 = lat1 * RAD, p2 = lat2 * RAD, dp = p2 - p1, dl = wrap180(lon2 - lon1) * RAD;
    var dpsi = Math.log(Math.tan(Math.PI / 4 + p2 / 2) / Math.tan(Math.PI / 4 + p1 / 2));
    var q = Math.abs(dpsi) > 1e-12 ? dp / dpsi : Math.cos(p1);
    return { d: Math.sqrt(dp * dp + q * q * dl * dl) * R_MEAN, brg: wrap360(Math.atan2(dl, dpsi) / RAD) };
  }
  /* Ellipsoidal distance with a spherical fallback. */
  function dist(lat1, lon1, lat2, lon2) {
    var r = inverse(lat1, lon1, lat2, lon2);
    return r ? r.s : haversine(lat1, lon1, lat2, lon2);
  }
  var COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  function compass(b) { return COMPASS[Math.round(wrap360(b) / 22.5) % 16]; }

  /* Geodesic polygon area. Each edge is followed along the true WGS84
     geodesic (Vincenty direct) in steps of at most 1 km, and the area is
     summed on the authalic sphere, which has the ellipsoid's exact area:
     latitude becomes authalic latitude and each short step is an exact
     spherical trapezoid against the equator. This agrees with GeographicLib
     to about 1 part in 10¹⁰. */
  function qAuth(sinPhi) { var es = E * sinPhi; return (1 - E2) * (sinPhi / (1 - es * es) - Math.log((1 - es) / (1 + es)) / (2 * E)); }
  var QP = qAuth(1), RQ = A * Math.sqrt(QP / 2), EARTH_AREA = 4 * Math.PI * RQ * RQ;
  function authLat(lat) { return Math.asin(Math.max(-1, Math.min(1, qAuth(Math.sin(lat * RAD)) / QP))); }
  function densify(ring, step) {
    var out = [];
    ring.forEach(function (p, i) {
      var nx = ring[(i + 1) % ring.length];
      out.push(p);
      var inv = inverse(p[0], p[1], nx[0], nx[1]);
      if (inv && inv.s > step && isFinite(inv.a1)) {
        var n = Math.ceil(inv.s / step);
        for (var k = 1; k < n; k++) { var d = direct(p[0], p[1], inv.a1, inv.s * k / n); out.push([d.lat, d.lon]); }
      } else if (!inv) {
        /* Nearly antipodal: fall back to spherical interpolation. */
        var gs = haversine(p[0], p[1], nx[0], nx[1]), m = Math.ceil(gs / step), b = sphBearing(p[0], p[1], nx[0], nx[1]);
        for (var j = 1; j < m; j++) {
          var dd = gs * j / m / R_MEAN, p1 = p[0] * RAD;
          var la = Math.asin(Math.sin(p1) * Math.cos(dd) + Math.cos(p1) * Math.sin(dd) * Math.cos(b * RAD));
          var lo = p[1] * RAD + Math.atan2(Math.sin(b * RAD) * Math.sin(dd) * Math.cos(p1), Math.cos(dd) - Math.sin(p1) * Math.sin(la));
          out.push([la / RAD, wrap180(lo / RAD)]);
        }
      }
    });
    return out;
  }
  /* The smaller of the two regions a closed ring bounds, in m². */
  function ringArea(ring) {
    if (ring.length < 3) return 0;
    var per = 0;
    ring.forEach(function (p, i) { var n = ring[(i + 1) % ring.length]; per += dist(p[0], p[1], n[0], n[1]); });
    var step = Math.max(1000, per / 100000), pts = densify(ring, step), sum = 0, wind = 0;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], nx = pts[(i + 1) % pts.length], dl = wrap180(nx[1] - p[1]) * RAD;
      var t1 = Math.tan(authLat(p[0]) / 2), t2 = Math.tan(authLat(nx[0]) / 2);
      sum += 2 * Math.atan2(Math.tan(dl / 2) * (t1 + t2), 1 + t1 * t2);
      wind += dl;
    }
    var s = Math.abs(wind) < 1 ? Math.abs(sum) : Math.min(Math.abs(2 * Math.PI * Math.sign(wind) - sum), Math.abs(sum + 2 * Math.PI * Math.sign(wind)));
    var area = s * RQ * RQ;
    return Math.min(area, EARTH_AREA - area);
  }
  function ringPerimeter(ring) {
    var per = 0;
    ring.forEach(function (p, i) { var n = ring[(i + 1) % ring.length]; per += dist(p[0], p[1], n[0], n[1]); });
    return per;
  }

  /* --- formatting ---------------------------------------------------------------- */

  function fmtDMS(v, isLat, dp) {
    dp = dp === undefined ? 3 : dp;
    var h = isLat ? (v < 0 ? 'S' : 'N') : (v < 0 ? 'W' : 'E'), a = Math.abs(v);
    var d = Math.floor(a), m = Math.floor((a - d) * 60), s = +(((a - d) * 60 - m) * 60).toFixed(dp);
    if (s >= 60) { s = 0; m++; }
    if (m >= 60) { m = 0; d++; }
    return d + '°' + pad2(m) + '′' + (s < 10 ? '0' : '') + s.toFixed(dp) + '″' + h;
  }
  function fmtDDM(v, isLat, dp) {
    dp = dp === undefined ? 4 : dp;
    var h = isLat ? (v < 0 ? 'S' : 'N') : (v < 0 ? 'W' : 'E'), a = Math.abs(v), d = Math.floor(a), m = +((a - d) * 60).toFixed(dp);
    if (m >= 60) { m = 0; d++; }
    return d + '°' + (m < 10 ? '0' : '') + m.toFixed(dp) + '′' + h;
  }
  function fmtAngle(b) {
    var d = Math.floor(b), m = Math.floor((b - d) * 60), s = +(((b - d) * 60 - m) * 60).toFixed(2);
    if (s >= 60) { s = 0; m++; }
    if (m >= 60) { m = 0; d++; }
    return d + '° ' + pad2(m) + '′ ' + (s < 10 ? '0' : '') + s.toFixed(2) + '″';
  }
  function fmtLatLon(p, dp) { return p.lat.toFixed(dp || 6) + ', ' + p.lon.toFixed(dp || 6); }
  var UNITS = { km: [1000, 'km'], mi: [1609.344, 'mi'], nmi: [1852, 'nmi'] };
  function fmtDist(m, unit) {
    var u = UNITS[unit] || UNITS.km, v = m / u[0];
    return group(v, v < 100 ? 3 : 2) + ' ' + u[1];
  }

  /* --- proj4, the OS National Grid and UTM ------------------------------------ */

  var HELMERT = '+towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489';
  var projReady = null;
  function loadProj() {
    if (!projReady) {
      projReady = U.script('assets/vendor/proj4/proj4.js').then(function () {
        /* OSGB 1936 / British National Grid with the OS 7-parameter Helmert
           shift to WGS84, good to about 5 m (EPSG:27700 as in the EPSG registry). */
        proj4.defs('EPSG:27700', '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy ' + HELMERT + ' +units=m +no_defs');
        proj4.defs('OSGB36', '+proj=longlat +ellps=airy ' + HELMERT + ' +no_defs');
        return window.proj4;
      });
    }
    return projReady;
  }
  function hasProj() { return !!(window.proj4 && proj4.defs('EPSG:27700')); }
  function toGrid(lat, lon) { var p = proj4('WGS84', 'EPSG:27700', [lon, lat]); return { e: p[0], n: p[1] }; }
  function fromGrid(e, n) { var p = proj4('EPSG:27700', 'WGS84', [e, n]); return { lat: p[1], lon: p[0] }; }
  function inGrid(e, n) { return e >= 0 && e < 700000 && n >= 0 && n < 1300000; }
  /* Grid letters: the 500 km square then the 100 km square, skipping I. */
  function gridRef(e, n, digits) {
    if (!inGrid(e, n)) return null;
    var e100 = Math.floor(e / 100000), n100 = Math.floor(n / 100000);
    var l1 = (19 - n100) - (19 - n100) % 5 + Math.floor((e100 + 10) / 5), l2 = (19 - n100) * 5 % 25 + e100 % 5;
    if (l1 > 7) l1++;
    if (l2 > 7) l2++;
    var half = digits / 2, div = Math.pow(10, 5 - half);
    var ee = String(Math.floor((e % 100000) / div)), nn = String(Math.floor((n % 100000) / div));
    while (ee.length < half) ee = '0' + ee;
    while (nn.length < half) nn = '0' + nn;
    return String.fromCharCode(l1 + 65, l2 + 65) + (half ? ' ' + ee + ' ' + nn : '');
  }
  function parseGridRef(s) {
    var m = /^([HJNOST][A-HJ-Z])\s*(\d[\d\s]*)?$/i.exec(s.trim());
    if (!m) return null;
    var groups = (m[2] || '').trim().split(/\s+/).filter(Boolean), digits = groups.join('');
    if (digits.length % 2 || digits.length > 10 || (groups.length === 2 && groups[0].length !== groups[1].length)) return { error: 'A grid reference needs the same number of digits for easting and northing, such as SU 387 150 or SU 38726 15059.' };
    var l1 = m[1].toUpperCase().charCodeAt(0) - 65, l2 = m[1].toUpperCase().charCodeAt(1) - 65;
    if (l1 > 7) l1--;
    if (l2 > 7) l2--;
    var e100 = ((l1 - 2) % 5) * 5 + (l2 % 5), n100 = (19 - Math.floor(l1 / 5) * 5) - Math.floor(l2 / 5);
    var half = digits.length / 2, mult = Math.pow(10, 5 - half);
    var e = e100 * 100000 + (half ? parseInt(digits.slice(0, half), 10) * mult : 0);
    var n = n100 * 100000 + (half ? parseInt(digits.slice(half), 10) * mult : 0);
    return inGrid(e, n) ? { e: e, n: n, square: mult } : { error: 'That grid square is outside Great Britain.' };
  }
  var BANDS = 'CDEFGHJKLMNPQRSTUVWXX';
  function utmZone(lat, lon) {
    var z = Math.floor((wrap180(lon) + 180) / 6) + 1;
    if (lat >= 56 && lat < 64 && lon >= 3 && lon < 12) z = 32;
    if (lat >= 72 && lat < 84) { if (lon >= 0 && lon < 9) z = 31; else if (lon >= 9 && lon < 21) z = 33; else if (lon >= 21 && lon < 33) z = 35; else if (lon >= 33 && lon < 42) z = 37; }
    return Math.min(60, z);
  }
  function utmDef(zone, south) { return '+proj=utm +zone=' + zone + (south ? ' +south' : '') + ' +datum=WGS84 +units=m +no_defs'; }
  function toUtm(lat, lon) {
    if (lat < -80 || lat > 84) return null;
    var z = utmZone(lat, lon), p = proj4('WGS84', utmDef(z, lat < 0), [lon, lat]);
    return { zone: z, band: BANDS[Math.floor((lat + 80) / 8)], e: p[0], n: p[1] };
  }
  function fromUtm(zone, south, e, n) { var p = proj4(utmDef(zone, south), 'WGS84', [e, n]); return { lat: p[1], lon: p[0] }; }
  function toMgrs(lat, lon) {
    if (lat < -80 || lat > 84) return null;
    try {
      var s = proj4.mgrs.forward([lon, lat], 5), m = /^(\d{1,2}[A-Z])([A-Z]{2})(\d{5})(\d{5})$/.exec(s);
      return m ? m[1] + ' ' + m[2] + ' ' + m[3] + ' ' + m[4] : s;
    } catch (e) { return null; }
  }

  /* --- reading coordinates in whatever form they are typed ------------------- */

  function parseAngle(part) {
    var hemi = (part.match(/[NSEW]/g) || []).join('');
    if (hemi.length > 1) return null;
    var neg = /-/.test(part) || hemi === 'S' || hemi === 'W';
    var nums = (part.replace(/[NSEW]/g, ' ').match(/\d+(?:\.\d+)?|\.\d+/g) || []).map(parseFloat);
    if (!nums.length || nums.length > 3) return null;
    if ((nums[1] !== undefined && nums[1] >= 60) || (nums[2] !== undefined && nums[2] >= 60)) return null;
    if (nums.length > 1 && nums.slice(0, -1).some(function (x) { return x % 1; })) return null;
    var v = nums[0] + (nums[1] || 0) / 60 + (nums[2] || 0) / 3600;
    return { v: neg ? -v : v, hemi: hemi };
  }
  function parseLatLon(text) {
    var s = String(text).toUpperCase().replace(/[′’‘´`]/g, "'").replace(/[″”“]|''/g, '"').replace(/[º˚]/g, '°')
      .replace(/\b(LATITUDE|LONGITUDE|LAT|LONG|LON|LNG)\b[:=]?/g, ' ').replace(/\b(DEG|D)\b/g, '°').trim();
    var parts;
    if (/[,;]/.test(s)) parts = s.split(/[,;]/).map(function (x) { return x.trim(); }).filter(Boolean);
    else {
      var toks = s.match(/[NSEW]|[+-]?(?:\d+(?:\.\d+)?|\.\d+)/g) || [];
      var letters = toks.filter(function (t) { return /^[NSEW]$/.test(t); });
      if (letters.length === 2) {
        parts = ['', ''];
        var i = 0, prefix = /^[NSEW]$/.test(toks[0]);
        toks.forEach(function (t) {
          var isL = /^[NSEW]$/.test(t);
          if (prefix && isL && parts[0]) i = 1;
          parts[i] += ' ' + t;
          if (!prefix && isL) i = 1;
        });
      } else if (!letters.length) {
        var n = toks.length / 2;
        if (n !== Math.round(n) || n < 1 || n > 3) return null;
        parts = [toks.slice(0, n).join(' '), toks.slice(n).join(' ')];
      } else return null;
    }
    if (!parts || parts.length !== 2) return null;
    var a = parseAngle(parts[0]), b = parseAngle(parts[1]);
    if (!a || !b) return null;
    var lat = a, lon = b;
    if (/[EW]/.test(a.hemi) || /[NS]/.test(b.hemi)) { lat = b; lon = a; }
    if (Math.abs(lat.v) > 90 || Math.abs(lon.v) > 180) return null;
    return { lat: lat.v, lon: lon.v };
  }
  /* → { kind, lat, lon (WGS84), e, n (OSGB, when typed as grid) } or { error }. */
  function parseCoord(text, datum) {
    var s = String(text || '').trim();
    if (!s) return { error: '' };
    var up = s.toUpperCase().replace(/\s+/g, ' ');
    var mg = /^(\d{1,2})\s?([C-HJ-NP-X])\s?([A-HJ-NP-Z]{2})\s?(\d+)\s?(\d*)$/.exec(up);
    if (mg && (mg[4] + mg[5]).length % 2 === 0 && (mg[4] + mg[5]).length <= 10) {
      if (!hasProj()) return { error: 'Loading the converter…' };
      try {
        var pt = proj4.mgrs.toPoint(up.replace(/\s/g, ''));
        return { kind: 'MGRS', lat: pt[1], lon: pt[0] };
      } catch (e) { return { error: 'That MGRS reference could not be read.' }; }
    }
    if (/^[HJNOST][A-HJ-Z]\b|^[HJNOST][A-HJ-Z]\d/.test(up)) {
      var g = parseGridRef(up);
      if (g && g.error) return { error: g.error };
      if (g) {
        if (!hasProj()) return { error: 'Loading the converter…' };
        var w = fromGrid(g.e, g.n);
        return { kind: 'OS grid reference (' + (g.square >= 1000 ? g.square / 1000 + ' km' : g.square + ' m') + ' square, south-west corner)', lat: w.lat, lon: w.lon, e: g.e, n: g.n };
      }
    }
    var ut = /^(\d{1,2})\s?([C-HJ-NP-X])?[\s,]+(\d{5,7}(?:\.\d+)?)\s?M?\s?E?[\s,]+(\d{6,8}(?:\.\d+)?)\s?M?\s?N?$/.exec(up);
    if (ut && +ut[1] >= 1 && +ut[1] <= 60) {
      if (!hasProj()) return { error: 'Loading the converter…' };
      var band = ut[2] || 'N', south = band < 'N';
      var r = fromUtm(+ut[1], south, +ut[3], +ut[4]);
      /* "30N"/"30S" often means the hemisphere rather than the latitude band. */
      if ((band === 'N' || band === 'S') && BANDS[Math.floor((r.lat + 80) / 8)] !== band) {
        south = band === 'S';
        r = fromUtm(+ut[1], south, +ut[3], +ut[4]);
      }
      return { kind: 'UTM', lat: r.lat, lon: r.lon };
    }
    var en = /^E?\s?(\d+(?:\.\d+)?)\s?(?:M?\s?E)?[\s,]+N?\s?(\d+(?:\.\d+)?)\s?(?:M?\s?N)?$/.exec(up);
    if (en && (+en[1] > 180 || +en[2] > 180)) {
      var e = +en[1], n = +en[2];
      if (!inGrid(e, n)) return { error: 'Those look like eastings and northings, but are outside the National Grid (0–700,000 E, 0–1,300,000 N).' };
      if (!hasProj()) return { error: 'Loading the converter…' };
      var ll = fromGrid(e, n);
      return { kind: 'OS eastings and northings', lat: ll.lat, lon: ll.lon, e: e, n: n };
    }
    var p = parseLatLon(s);
    if (!p) return { error: 'Could not read that. Try 51.5074, -0.1278 or 51°30′26″N 0°07′40″W or SU 38726 15059.' };
    if (datum === 'osgb36') {
      if (!hasProj()) return { error: 'Loading the converter…' };
      var w2 = proj4('OSGB36', 'WGS84', [p.lon, p.lat]);
      return { kind: 'Latitude and longitude (OSGB36)', lat: w2[1], lon: w2[0], osgbLat: p.lat, osgbLon: p.lon };
    }
    return { kind: 'Latitude and longitude (WGS84)', lat: p.lat, lon: p.lon };
  }

  /* --- Coordinate & grid reference converter ---------------------------------- */

  Tools.register({
    id: 'coordinate-converter', category: 'geo', name: 'Coordinate & Grid Reference Converter',
    description: 'Convert between decimal degrees, degrees-minutes-seconds, UTM, MGRS and Ordnance Survey grid references (SU 38726 15059 or eastings and northings), with OSGB36 and WGS84.',
    keywords: ['coordinates', 'latitude', 'longitude', 'lat long', 'gps', 'dms', 'degrees minutes seconds', 'decimal degrees', 'grid reference', 'os grid',
      'ordnance survey', 'national grid', 'eastings northings', 'osgb36', 'wgs84', 'utm', 'mgrs', 'convert coordinates', 'bng', 'what3words alternative'],
    render: function (root) {
      box(root);
      var coord = U.input({ label: 'Coordinates in any format', value: 'SU 38726 15059', spellcheck: false, autocomplete: 'off', dataset: { role: 'coord' } });
      var datum = U.select({ label: 'Latitude and longitude are on', dataset: { role: 'datum' }, value: 'wgs84', options: [
        { value: 'wgs84', label: 'WGS84 (GPS, phones, web maps)' }, { value: 'osgb36', label: 'OSGB36 (older OS maps)' }] });
      var examples = el('div', { class: 'chips' }, ['51.50735, -0.12776', '51°30′26″N 0°07′40″W', 'N 51 30.441 W 0 7.666', 'SU 38726 15059', '438710.92, 114792.25', '30U 699316 5710164', '30U XC 99316 10164'].map(function (x) {
        return el('button', { class: 'chip', type: 'button', onclick: function () { inp(coord).value = x; run(); } }, x);
      }));
      var status = el('p', { class: 'note', dataset: { role: 'kind' } });
      var out = el('div', { dataset: { role: 'result' } });
      var geo = U.button('Use my location', function () {
        if (!navigator.geolocation) { U.toast('This browser cannot share its location', 'err'); return; }
        status.textContent = 'Asking for your location…';
        navigator.geolocation.getCurrentPosition(function (pos) {
          inp(coord).value = pos.coords.latitude.toFixed(6) + ', ' + pos.coords.longitude.toFixed(6);
          inp(datum).value = 'wgs84'; run();
          status.textContent += ' (±' + Math.round(pos.coords.accuracy) + ' m from your device)';
        }, function (err) { status.textContent = 'Location not available: ' + (err.message || 'permission denied') + '.'; }, { enableHighAccuracy: true, timeout: 15000 });
      }, 'ghost');

      function run() {
        var r = parseCoord(inp(coord).value, inp(datum).value);
        out.replaceChildren();
        if (r.error !== undefined) { status.className = 'note err'; status.textContent = r.error; return; }
        status.className = 'note'; status.textContent = 'Read as: ' + r.kind + '.';
        var lat = r.lat, lon = r.lon, cards = [];
        cards.push(card('Decimal degrees (WGS84)', fmtLatLon(r), 'dd', { hl: true, copy: true }));
        cards.push(card('Degrees, minutes, seconds', fmtDMS(lat, true) + ' ' + fmtDMS(lon, false), 'dms', { copy: true }));
        cards.push(card('Degrees and decimal minutes', fmtDDM(lat, true) + ' ' + fmtDDM(lon, false), 'ddm', { copy: true }));
        var u = toUtm(lat, lon);
        cards.push(card('UTM (WGS84)', u ? u.zone + u.band + ' ' + Math.round(u.e) + ' ' + Math.round(u.n) : 'Not used beyond 84°N or 80°S', 'utm', { copy: !!u }));
        var mg = toMgrs(lat, lon);
        cards.push(card('MGRS / USNG', mg || '—', 'mgrs', { copy: !!mg }));
        var g = r.e !== undefined ? { e: r.e, n: r.n } : toGrid(lat, lon);
        var gr = gridRef(g.e, g.n, 10);
        if (gr) {
          cards.push(card('OS grid reference', gr, 'osgr', { hl: true, copy: true }));
          cards.push(card('Shorter references', gridRef(g.e, g.n, 8) + ' · ' + gridRef(g.e, g.n, 6) + ' · ' + gridRef(g.e, g.n, 4), 'osgr-short'));
          var enCard = card('Eastings, northings', group(g.e, 1) + ' E, ' + group(g.n, 1) + ' N', 'osen', { copy: true });
          enCard.querySelector('b').dataset.e = String(g.e); enCard.querySelector('b').dataset.n = String(g.n);
          cards.push(enCard);
          var o = r.osgbLat !== undefined ? { lat: r.osgbLat, lon: r.osgbLon } : (function () { var q = proj4('EPSG:27700', 'OSGB36', [g.e, g.n]); return { lat: q[1], lon: q[0] }; })();
          cards.push(card('Latitude and longitude on OSGB36', fmtDMS(o.lat, true) + ' ' + fmtDMS(o.lon, false), 'osgb36'));
        } else cards.push(card('OS National Grid', 'Outside Great Britain', 'osgr'));
        put(out, el('div', { class: 'gg-grid' }, cards),
          U.btnrow(U.copyBtn('Copy all', function () { return Array.prototype.map.call(out.querySelectorAll('.gg-card'), function (c) { return c.firstChild.textContent + ': ' + c.children[1].textContent; }).join('\n'); })));
      }
      U.live([coord, datum], run);
      loadProj().then(run).catch(function (err) { status.className = 'note err'; status.textContent = 'The converter could not load: ' + (err.message || err); });
      root.appendChild(U.panel(null, U.row(el('div', { class: 'grow' }, coord), datum), examples, U.btnrow(geo), status));
      root.appendChild(U.panel('Converted', out));
      root.appendChild(U.panel(null, U.note('OSGB36 and WGS84 are linked with the Ordnance Survey 7-parameter Helmert transformation (through proj4), which is good to about 5 m across Great Britain, worst in the far west and the Scottish islands. For survey-grade results use OS Net and OSTN15. Grid references are truncated, not rounded, and point to the south-west corner of their square. UTM and MGRS use WGS84.')));
    }
  });

  /* --- Distance, bearing & midpoint ---------------------------------------------- */

  Tools.register({
    id: 'distance-calculator', category: 'geo', name: 'Distance, Bearing & Midpoint',
    description: 'Great-circle and ellipsoidal (Vincenty) distance between two places, initial and final bearings, midpoint, rhumb line, destination from a distance and bearing, and multi-stop routes.',
    keywords: ['distance between coordinates', 'great circle', 'haversine', 'vincenty', 'bearing', 'azimuth', 'heading', 'midpoint', 'rhumb line', 'loxodrome',
      'destination point', 'as the crow flies', 'nautical miles', 'route distance', 'waypoints', 'gps distance'],
    render: function (root) {
      box(root);
      var unit = 'km';
      var from = U.input({ label: 'From', value: '52.205, 0.119', spellcheck: false, dataset: { role: 'from' }, hint: 'Lat/long in any format, a grid reference or UTM' });
      var to = U.input({ label: 'To', value: '48.857, 2.351', spellcheck: false, dataset: { role: 'to' } });
      var unitChips = U.chips([{ value: 'km', label: 'Kilometres' }, { value: 'mi', label: 'Miles' }, { value: 'nmi', label: 'Nautical miles' }], function (u) { unit = u; runAll(); }, 'km');
      var out = el('div', { dataset: { role: 'result' } });
      var dFrom = U.input({ label: 'Start', value: '51.47788, -0.00147', spellcheck: false, dataset: { role: 'dest-from' } });
      var dDist = U.input({ label: 'Distance', type: 'number', value: '7.794', step: 'any', dataset: { role: 'dest-dist' } });
      var dUnit = U.select({ label: 'Unit', dataset: { role: 'dest-unit' }, value: 'km', options: [{ value: 'km', label: 'km' }, { value: 'mi', label: 'miles' }, { value: 'nmi', label: 'nautical miles' }, { value: 'm', label: 'metres' }] });
      var dBrg = U.input({ label: 'Bearing (° from north)', type: 'number', value: '300.7', step: 'any', dataset: { role: 'dest-brg' } });
      var destOut = el('div', { dataset: { role: 'dest' } });
      var route = U.textarea({ label: 'Route: one place per line', value: '51.5074, -0.1278\n52.4862, -1.8904\n53.4808, -2.2426\n55.9533, -3.1883', spellcheck: false, dataset: { role: 'route' } });
      var routeOut = el('div', { dataset: { role: 'route-out' } });

      function pt(field) { return parseCoord(inp(field).value, 'wgs84'); }
      function run() {
        out.replaceChildren();
        var a = pt(from), b = pt(to);
        if (a.error !== undefined || b.error !== undefined) { out.appendChild(U.note((a.error || b.error) || 'Enter both places.', a.error || b.error ? 'err' : '')); return; }
        var inv = inverse(a.lat, a.lon, b.lat, b.lon), gc = haversine(a.lat, a.lon, b.lat, b.lon), rh = rhumb(a.lat, a.lon, b.lat, b.lon);
        var sb1 = sphBearing(a.lat, a.lon, b.lat, b.lon), sb2 = wrap360(sphBearing(b.lat, b.lon, a.lat, a.lon) + 180);
        var mid = sphMidpoint(a.lat, a.lon, b.lat, b.lon), cards = [];
        if (inv) {
          var vc = card('Distance on the WGS84 ellipsoid (Vincenty)', fmtDist(inv.s, unit), 'vincenty', { hl: true });
          vc.querySelector('b').dataset.m = inv.s.toFixed(4);
          vc.appendChild(el('span', { text: group(inv.s, 3) + ' m' }));
          cards.push(vc);
        } else cards.push(card('Distance on the WGS84 ellipsoid', 'Vincenty does not converge for nearly opposite points; see the great-circle figure', 'vincenty'));
        cards.push(card('Great-circle distance (haversine, mean radius)', fmtDist(gc, unit), 'gc'));
        if (inv && isFinite(inv.a1)) {
          cards.push(card('Initial bearing', inv.a1.toFixed(4) + '° (' + fmtAngle(inv.a1) + ') ' + compass(inv.a1), 'brg1'));
          cards.push(card('Final bearing', inv.a2.toFixed(4) + '° (' + fmtAngle(inv.a2) + ') ' + compass(inv.a2), 'brg2'));
          var gm = direct(a.lat, a.lon, inv.a1, inv.s / 2);
          cards.push(card('Midpoint along the geodesic', fmtLatLon(gm) + ' · ' + fmtDMS(gm.lat, true, 1) + ' ' + fmtDMS(gm.lon, false, 1), 'mid-geo'));
        }
        cards.push(card('Great-circle bearings (sphere)', sb1.toFixed(1) + '° → ' + sb2.toFixed(1) + '° (' + compass(sb1) + ')', 'gc-brg'));
        cards.push(card('Midpoint (sphere)', mid.lat.toFixed(4) + ', ' + mid.lon.toFixed(4), 'mid'));
        cards.push(card('Rhumb line (constant bearing)', fmtDist(rh.d, unit) + ' on ' + rh.brg.toFixed(1) + '° ' + compass(rh.brg), 'rhumb'));
        put(out, el('div', { class: 'gg-grid' }, cards),
          U.note('The ellipsoidal figure is the accurate one (to well under a millimetre); the great-circle figure uses a sphere of radius 6,371.0088 km and can be up to 0.5% out. A rhumb line keeps one compass bearing, so it is longer except along the equator or a meridian.'));
      }
      function runDest() {
        destOut.replaceChildren();
        var a = pt(dFrom), d = num(inp(dDist).value) * { km: 1000, mi: 1609.344, nmi: 1852, m: 1 }[inp(dUnit).value], b = num(inp(dBrg).value);
        if (a.error !== undefined || !isFinite(d) || !isFinite(b)) { destOut.appendChild(U.note(a.error || 'Enter a start, a distance and a bearing.', 'err')); return; }
        var r = direct(a.lat, a.lon, wrap360(b), d);
        var dd = d / R_MEAN, p1 = a.lat * RAD, br = b * RAD;
        var la = Math.asin(Math.sin(p1) * Math.cos(dd) + Math.cos(p1) * Math.sin(dd) * Math.cos(br));
        var lo = wrap180(a.lon + Math.atan2(Math.sin(br) * Math.sin(dd) * Math.cos(p1), Math.cos(dd) - Math.sin(p1) * Math.sin(la)) / RAD);
        put(destOut, el('div', { class: 'gg-grid' },
          card('Destination (WGS84 ellipsoid)', r.lat.toFixed(8) + ', ' + r.lon.toFixed(8), 'dest', { hl: true, copy: true }),
          card('As degrees, minutes, seconds', fmtDMS(r.lat, true, 2) + ' ' + fmtDMS(r.lon, false, 2), 'dest-dms'),
          card('Final bearing', r.az.toFixed(4) + '° ' + compass(r.az), 'dest-brg'),
          card('Destination on a sphere', (la / RAD).toFixed(4) + ', ' + lo.toFixed(4), 'dest-sph')));
      }
      function runRoute() {
        routeOut.replaceChildren();
        var lines = inp(route).value.split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean), pts = [], bad = [];
        lines.forEach(function (l, i) { var p = parseCoord(l, 'wgs84'); if (p.error !== undefined) bad.push(i + 1); else pts.push(p); });
        if (bad.length) { routeOut.appendChild(U.note('Could not read line ' + bad.join(', ') + '.', 'err')); return; }
        if (pts.length < 2) { routeOut.appendChild(U.note('Enter at least two places, one per line.')); return; }
        var total = 0, rows = [];
        for (var i = 1; i < pts.length; i++) {
          var inv = inverse(pts[i - 1].lat, pts[i - 1].lon, pts[i].lat, pts[i].lon), s = inv ? inv.s : haversine(pts[i - 1].lat, pts[i - 1].lon, pts[i].lat, pts[i].lon);
          total += s;
          rows.push([i + ' → ' + (i + 1), fmtDist(s, unit), inv && isFinite(inv.a1) ? inv.a1.toFixed(1) + '° ' + compass(inv.a1) : '—', fmtDist(total, unit)]);
        }
        var tc = el('p', { class: 'gg-big', dataset: { k: 'route-total' }, text: 'Total ' + fmtDist(total, unit) });
        tc.dataset.m = total.toFixed(3);
        put(routeOut, tc, el('div', { class: 'gg-scroll' }, U.table(['Leg', 'Distance', 'Initial bearing', 'So far'], rows)));
      }
      function runAll() { run(); runDest(); runRoute(); }
      U.live([from, to], run);
      U.live([dFrom, dDist, dUnit, dBrg], runDest);
      U.live([route], runRoute);
      loadProj().then(runAll).catch(function () { /* lat/long still works without proj4 */ });
      root.appendChild(U.panel(null, U.row(el('div', { class: 'grow' }, from), el('div', { class: 'grow' }, to)),
        U.btnrow(U.button('⇅ Swap', function () { var t = inp(from).value; inp(from).value = inp(to).value; inp(to).value = t; run(); }, 'ghost')), unitChips));
      root.appendChild(U.panel('Between the two places', out));
      root.appendChild(U.panel('Destination from a distance and bearing', U.row(el('div', { class: 'grow' }, dFrom), dDist, dUnit, dBrg), destOut));
      root.appendChild(U.panel('Route with several stops', route, routeOut));
    }
  });

  /* --- shared track helpers ---------------------------------------------------- */

  /* Douglas–Peucker on local metres, iteratively so long tracks cannot
     overflow the stack. Keeps the first and last points. */
  function simplify(pts, tol) {
    if (!(tol > 0) || pts.length < 3) return pts.slice();
    var lat0 = pts.reduce(function (a, p) { return a + p.lat; }, 0) / pts.length;
    var kx = R_MEAN * Math.cos(lat0 * RAD) * RAD, ky = R_MEAN * RAD;
    var xy = pts.map(function (p) { return [p.lon * kx, p.lat * ky]; });
    var keep = new Uint8Array(pts.length), stack = [[0, pts.length - 1]];
    keep[0] = keep[pts.length - 1] = 1;
    while (stack.length) {
      var s = stack.pop(), a = s[0], b = s[1], max = 0, idx = -1;
      var ax = xy[a][0], ay = xy[a][1], dx = xy[b][0] - ax, dy = xy[b][1] - ay, len2 = dx * dx + dy * dy;
      for (var i = a + 1; i < b; i++) {
        var px = xy[i][0] - ax, py = xy[i][1] - ay, d;
        if (len2 === 0) d = Math.sqrt(px * px + py * py);
        else { var t = Math.max(0, Math.min(1, (px * dx + py * dy) / len2)); d = Math.hypot(px - t * dx, py - t * dy); }
        if (d > max) { max = d; idx = i; }
      }
      if (max > tol && idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
    }
    return pts.filter(function (p, i) { return keep[i]; });
  }
  function fmtHms(sec) {
    if (!isFinite(sec)) return '—';
    sec = Math.round(sec);
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    return (h ? h + ':' + pad2(m) : m) + ':' + pad2(s);
  }
  function fmtWhen(ms) {
    var d = new Date(ms);
    return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }
  function readGeoFile(file) {
    var name = file.name.toLowerCase();
    return U.readAs(file, 'text').then(function (text) {
      if (/\.(geo)?json$/.test(name) || /^\s*\{/.test(text)) return JSON.parse(text);
      return U.script('assets/vendor/togeojson/togeojson.umd.js').then(function () {
        var doc = new DOMParser().parseFromString(text, 'application/xml');
        if (doc.getElementsByTagName('parsererror').length) throw new Error('That file is not valid XML.');
        if (/\.kml$/.test(name) || doc.getElementsByTagName('kml').length) return toGeoJSON.kml(doc);
        if (/\.tcx$/.test(name) || doc.getElementsByTagName('TrainingCenterDatabase').length) return toGeoJSON.tcx(doc);
        return toGeoJSON.gpx(doc);
      });
    });
  }

  /* --- GPX & KML viewer --------------------------------------------------------- */

  function tracksFrom(fc) {
    var tracks = [], wpts = [];
    var feats = fc.type === 'FeatureCollection' ? fc.features : fc.type === 'Feature' ? [fc] : [{ type: 'Feature', geometry: fc, properties: {} }];
    feats.forEach(function (f, fi) {
      var g = f && f.geometry, pr = (f && f.properties) || {};
      if (!g) return;
      var times = pr.coordinateProperties && pr.coordinateProperties.times;
      var toPts = function (coords, t) {
        return coords.map(function (c, i) {
          var tm = t && t[i] ? Date.parse(t[i]) : NaN;
          return { lon: c[0], lat: c[1], ele: c.length > 2 && isFinite(c[2]) ? c[2] : null, time: isFinite(tm) ? tm : null };
        });
      };
      if (g.type === 'LineString') tracks.push({ name: pr.name || 'Track ' + (fi + 1), kind: pr._gpxType === 'rte' ? 'route' : 'track', segs: [toPts(g.coordinates, times)] });
      else if (g.type === 'MultiLineString') tracks.push({ name: pr.name || 'Track ' + (fi + 1), kind: pr._gpxType === 'rte' ? 'route' : 'track', segs: g.coordinates.map(function (c, i) { return toPts(c, times && Array.isArray(times[0]) ? times[i] : null); }) });
      else if (g.type === 'Point') wpts.push({ name: pr.name || '', lat: g.coordinates[1], lon: g.coordinates[0], ele: g.coordinates[2] });
      else if (g.type === 'GeometryCollection') g.geometries.forEach(function (sub) { tracksFrom({ type: 'Feature', geometry: sub, properties: pr }).tracks.forEach(function (t) { tracks.push(t); }); });
    });
    tracks.forEach(function (t) { t.segs = t.segs.filter(function (s) { return s.length; }); });
    return { tracks: tracks.filter(function (t) { return t.segs.length; }), wpts: wpts };
  }
  function trackStats(segs, hyst) {
    var d = 0, gain = 0, loss = 0, min = Infinity, max = -Infinity, moving = 0, first = null, last = null, profile = [], n = 0;
    segs.forEach(function (seg) {
      var ref = null;
      seg.forEach(function (p, i) {
        n++;
        if (i) {
          var q = seg[i - 1], s = dist(q.lat, q.lon, p.lat, p.lon);
          d += s;
          if (p.time !== null && q.time !== null && p.time > q.time && s / ((p.time - q.time) / 1000) > 0.28) moving += (p.time - q.time) / 1000;
        }
        if (p.ele !== null) {
          min = Math.min(min, p.ele); max = Math.max(max, p.ele);
          if (ref === null) ref = p.ele;
          else { var dz = p.ele - ref; if (dz > 0 && dz >= hyst) { gain += dz; ref = p.ele; } else if (dz < 0 && -dz >= hyst) { loss -= dz; ref = p.ele; } }
        }
        if (p.time !== null) { if (first === null || p.time < first) first = p.time; if (last === null || p.time > last) last = p.time; }
        profile.push({ d: d, ele: p.ele, time: p.time });
      });
    });
    return { dist: d, gain: gain, loss: loss, min: min, max: max, dur: first !== null && last > first ? (last - first) / 1000 : null, moving: moving, start: first, profile: profile, points: n };
  }
  function toGpx(tracks, wpts) {
    var o = ['<?xml version="1.0" encoding="UTF-8"?>', '<gpx version="1.1" creator="All The Tools" xmlns="http://www.topografix.com/GPX/1/1">'];
    var pt = function (tag, p, ind) {
      return ind + '<' + tag + ' lat="' + p.lat.toFixed(7) + '" lon="' + p.lon.toFixed(7) + '">' + (p.ele !== null && p.ele !== undefined ? '<ele>' + (+p.ele.toFixed(2)) + '</ele>' : '') +
        (p.time ? '<time>' + new Date(p.time).toISOString() + '</time>' : '') + (p.name ? '<name>' + escXml(p.name) + '</name>' : '') + '</' + tag + '>';
    };
    wpts.forEach(function (w) { o.push(pt('wpt', w, '  ')); });
    tracks.forEach(function (t) {
      if (t.kind === 'route') {
        o.push('  <rte><name>' + escXml(t.name) + '</name>');
        t.segs.forEach(function (s) { s.forEach(function (p) { o.push(pt('rtept', p, '    ')); }); });
        o.push('  </rte>');
      } else {
        o.push('  <trk><name>' + escXml(t.name) + '</name>');
        t.segs.forEach(function (s) { o.push('    <trkseg>'); s.forEach(function (p) { o.push(pt('trkpt', p, '      ')); }); o.push('    </trkseg>'); });
        o.push('  </trk>');
      }
    });
    o.push('</gpx>');
    return o.join('\n');
  }
  function toKml(tracks, wpts, title) {
    var c = function (p) { return p.lon.toFixed(7) + ',' + p.lat.toFixed(7) + (p.ele !== null && p.ele !== undefined ? ',' + (+p.ele.toFixed(2)) : ''); };
    var o = ['<?xml version="1.0" encoding="UTF-8"?>', '<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>' + escXml(title) + '</name>'];
    wpts.forEach(function (w) { o.push('<Placemark><name>' + escXml(w.name || '') + '</name><Point><coordinates>' + c(w) + '</coordinates></Point></Placemark>'); });
    tracks.forEach(function (t) {
      var lines = t.segs.map(function (s) { return '<LineString><tessellate>1</tessellate><coordinates>' + s.map(c).join(' ') + '</coordinates></LineString>'; });
      o.push('<Placemark><name>' + escXml(t.name) + '</name>' + (lines.length > 1 ? '<MultiGeometry>' + lines.join('') + '</MultiGeometry>' : lines[0]) + '</Placemark>');
    });
    o.push('</Document></kml>');
    return o.join('\n');
  }
  function toGeoJson(tracks, wpts) {
    var feats = wpts.map(function (w) { return { type: 'Feature', properties: { name: w.name || '' }, geometry: { type: 'Point', coordinates: w.ele !== null && w.ele !== undefined ? [w.lon, w.lat, w.ele] : [w.lon, w.lat] } }; });
    tracks.forEach(function (t) {
      var coords = t.segs.map(function (s) { return s.map(function (p) { return p.ele !== null ? [p.lon, p.lat, p.ele] : [p.lon, p.lat]; }); });
      var times = t.segs.map(function (s) { return s.map(function (p) { return p.time ? new Date(p.time).toISOString() : null; }); });
      var hasT = times.some(function (s) { return s.some(Boolean); });
      var props = { name: t.name, _gpxType: t.kind === 'route' ? 'rte' : 'trk' };
      if (hasT) props.coordinateProperties = { times: coords.length === 1 ? times[0] : times };
      feats.push({ type: 'Feature', properties: props, geometry: coords.length === 1 ? { type: 'LineString', coordinates: coords[0] } : { type: 'MultiLineString', coordinates: coords } });
    });
    return JSON.stringify({ type: 'FeatureCollection', features: feats }, null, 1);
  }
  function toCsv(tracks) {
    var rows = [['track', 'segment', 'latitude', 'longitude', 'elevation_m', 'time', 'distance_m']];
    tracks.forEach(function (t) {
      var d = 0;
      t.segs.forEach(function (s, si) {
        s.forEach(function (p, i) {
          if (i) d += dist(s[i - 1].lat, s[i - 1].lon, p.lat, p.lon);
          rows.push([t.name, si + 1, p.lat.toFixed(7), p.lon.toFixed(7), p.ele === null ? '' : +p.ele.toFixed(2), p.time ? new Date(p.time).toISOString() : '', d.toFixed(1)]);
        });
      });
    });
    return window.CSV && CSV.stringify ? CSV.stringify(rows) : rows.map(function (r) { return r.map(function (c) { c = String(c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\n');
  }
  function sampleGpx() {
    /* A made-up 5 km loop with a hill, one point every 20 seconds. */
    var pts = [], t0 = Date.UTC(2025, 4, 17, 9, 0, 0), n = 180;
    for (var i = 0; i <= n; i++) {
      var a = i / n * 2 * Math.PI;
      pts.push('<trkpt lat="' + (51.2537 + 0.0075 * Math.sin(a)).toFixed(6) + '" lon="' + (-0.3134 + 0.012 * Math.cos(a) - 0.012).toFixed(6) + '"><ele>' +
        (140 + 80 * Math.max(0, Math.sin(a)) + 3 * Math.sin(i)).toFixed(1) + '</ele><time>' + new Date(t0 + i * 20000 + (i > 90 ? 120000 : 0)).toISOString() + '</time></trkpt>');
    }
    return '<?xml version="1.0"?><gpx version="1.1" creator="sample" xmlns="http://www.topografix.com/GPX/1/1"><wpt lat="51.2537" lon="-0.3014"><name>Start</name></wpt>' +
      '<trk><name>Sample loop</name><trkseg>' + pts.join('') + '</trkseg></trk></gpx>';
  }

  Tools.register({
    id: 'gpx-viewer', category: 'geo', name: 'GPX & KML Viewer and Converter',
    description: 'Open GPX, KML, TCX or GeoJSON tracks to see them on a map with distance, climb, time, speed, splits and an elevation profile, simplify them and save as GPX, KML, GeoJSON or CSV.',
    keywords: ['gpx', 'kml', 'kmz', 'tcx', 'geojson', 'gpx viewer', 'gpx to kml', 'kml to gpx', 'gpx to csv', 'track', 'route', 'strava', 'garmin', 'elevation profile',
      'elevation gain', 'hiking', 'cycling', 'running', 'splits', 'simplify track', 'douglas peucker'],
    render: function (root) {
      box(root);
      var data = null, baseName = 'track', unit = 'km', outlines = null;
      var drop = U.dropzone({ accept: '.gpx,.kml,.tcx,.geojson,.json,application/gpx+xml,application/vnd.google-earth.kml+xml', label: 'Drop a GPX, KML, TCX or GeoJSON file', hint: 'or click to choose. It stays on this device.', onFiles: function (f) { open(f[0]); } });
      var status = U.note('');
      status.dataset.role = 'status';
      var trackSel = U.select({ label: 'Show', dataset: { role: 'track' }, options: [] });
      var hyst = U.select({ label: 'Ignore climbs smaller than', dataset: { role: 'hyst' }, value: '2', options: [{ value: '0', label: 'Nothing (raw)' }, { value: '2', label: '2 m' }, { value: '5', label: '5 m' }, { value: '10', label: '10 m' }] });
      var tol = U.input({ label: 'Simplify to within (m)', type: 'number', value: '0', min: '0', step: 'any', dataset: { role: 'tolerance' }, hint: '0 keeps every point' });
      var land = U.checkbox('Show country outlines');
      var unitChips = U.chips([{ value: 'km', label: 'km' }, { value: 'mi', label: 'miles' }], function (u) { unit = u; draw(); }, 'km');
      var statsBox = el('div', { dataset: { role: 'stats' } }), mapBox = el('div'), profBox = el('div'), splitBox = el('div', { dataset: { role: 'splits' } });
      var controls = el('div', { style: { display: 'none' } });

      function open(file) {
        status.className = 'note'; status.textContent = 'Reading ' + file.name + '…';
        baseName = file.name.replace(/\.[^.]+$/, '') || 'track';
        readGeoFile(file).then(load).catch(function (err) { status.className = 'note err'; status.textContent = 'Could not read that file: ' + (err.message || err); });
      }
      function load(fc) {
        var t = tracksFrom(fc);
        if (!t.tracks.length && !t.wpts.length) { status.className = 'note err'; status.textContent = 'No tracks, routes or waypoints found in that file.'; return; }
        data = t;
        inp(trackSel).replaceChildren.apply(inp(trackSel), [el('option', { value: 'all', text: 'All tracks and routes' })].concat(t.tracks.map(function (tr, i) {
          return el('option', { value: String(i), text: tr.name + (tr.kind === 'route' ? ' (route)' : '') });
        })));
        inp(trackSel).value = t.tracks.length === 1 ? '0' : 'all';
        status.className = 'note ok';
        status.textContent = 'Loaded ' + t.tracks.length + ' track' + (t.tracks.length === 1 ? '' : 's') + ' and ' + t.wpts.length + ' waypoint' + (t.wpts.length === 1 ? '' : 's') + '.';
        controls.style.display = '';
        draw();
      }
      function current() {
        if (!data) return null;
        var sel = inp(trackSel).value, t = +num(inp(tol).value) || 0;
        var list = sel === 'all' ? data.tracks : [data.tracks[+sel]];
        return list.map(function (tr) { return { name: tr.name, kind: tr.kind, segs: tr.segs.map(function (s) { return simplify(s, t); }) }; });
      }
      function draw() {
        if (!data) return;
        var tracks = current(), allSegs = [], orig = 0, kept = 0;
        tracks.forEach(function (t) { t.segs.forEach(function (s) { allSegs.push(s); kept += s.length; }); });
        (inp(trackSel).value === 'all' ? data.tracks : [data.tracks[+inp(trackSel).value]]).forEach(function (t) { t.segs.forEach(function (s) { orig += s.length; }); });
        var st = trackStats(allSegs, num(inp(hyst).value) || 0), u = UNITS[unit], hasEle = st.max > -Infinity;
        var k = function (label, value, key) { return card(label, value, key); };
        statsBox.replaceChildren(el('div', { class: 'gg-grid' },
          k('Distance', fmtDist(st.dist, unit), 'dist'),
          k('Elevation gain', hasEle ? Math.round(st.gain) + ' m' : 'No elevation data', 'gain'),
          k('Elevation loss', hasEle ? Math.round(st.loss) + ' m' : '—', 'loss'),
          k('Lowest / highest', hasEle ? Math.round(st.min) + ' m / ' + Math.round(st.max) + ' m' : '—', 'minmax'),
          k('Duration', st.dur ? fmtHms(st.dur) : 'No times in file', 'duration'),
          k('Moving time', st.dur ? fmtHms(st.moving) : '—', 'moving'),
          k('Average speed', st.dur ? sig(st.dist / u[0] / (st.dur / 3600), 4) + ' ' + (unit === 'km' ? 'km/h' : 'mph') : '—', 'speed'),
          k('Moving average', st.moving ? sig(st.dist / u[0] / (st.moving / 3600), 4) + ' ' + (unit === 'km' ? 'km/h' : 'mph') : '—', 'mspeed'),
          k('Points', kept === orig ? group(orig) : group(kept) + ' of ' + group(orig), 'points'),
          st.start ? k('Started', fmtWhen(st.start), 'start') : null));
        drawMap(tracks);
        drawProfile(st, hasEle);
        drawSplits(st);
      }
      function drawMap(tracks) {
        Promise.all([U.script('assets/vendor/d3/d3-array.min.js').then(function () { return U.script('assets/vendor/d3/d3-geo.min.js'); }),
          land.input.checked && !outlines ? U.script('assets/vendor/topojson/topojson-client.min.js').then(function () {
            return fetch('assets/vendor/world-atlas/countries-50m.json').then(function (r) { if (!r.ok) throw new Error('outline file'); return r.json(); });
          }).then(function (topo) { outlines = topojson.feature(topo, topo.objects.countries); }) : null]).then(function () {
          var W = 720, H = 440, feats = [];
          tracks.forEach(function (t) { t.segs.forEach(function (s) { if (s.length > 1) feats.push({ type: 'Feature', properties: { kind: t.kind }, geometry: { type: 'LineString', coordinates: s.map(function (p) { return [p.lon, p.lat]; }) } }); }); });
          data.wpts.forEach(function (w) { feats.push({ type: 'Feature', properties: { kind: 'wpt', name: w.name }, geometry: { type: 'Point', coordinates: [w.lon, w.lat] } }); });
          if (!feats.length) { mapBox.replaceChildren(); return; }
          var proj = d3.geoMercator().fitExtent([[16, 16], [W - 16, H - 16]], { type: 'FeatureCollection', features: feats });
          var path = d3.geoPath(proj);
          var svg = svgEl('svg', { class: 'gg-map', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Map of the track' });
          if (land.input.checked && outlines) outlines.features.forEach(function (f) { var d = path(f); if (d) svg.appendChild(svgEl('path', { class: 'land', d: d })); });
          feats.forEach(function (f) {
            if (f.properties.kind === 'wpt') {
              var p = proj(f.geometry.coordinates);
              if (p) svg.appendChild(svgEl('circle', { class: 'wpt', cx: p[0], cy: p[1], r: 5 }, svgEl('title', {}, f.properties.name || 'Waypoint')));
            } else svg.appendChild(svgEl('path', { class: f.properties.kind === 'route' ? 'rte' : 'trk', d: path(f) }));
          });
          var firstSeg = feats.filter(function (f) { return f.geometry.type === 'LineString'; })[0];
          if (firstSeg) {
            var c = firstSeg.geometry.coordinates, s0 = proj(c[0]), s1 = proj(c[c.length - 1]);
            svg.appendChild(svgEl('circle', { cx: s0[0], cy: s0[1], r: 6, fill: '#1a9e4b', stroke: '#fff', 'stroke-width': 2 }, svgEl('title', {}, 'Start')));
            svg.appendChild(svgEl('circle', { cx: s1[0], cy: s1[1], r: 6, fill: '#c62828', stroke: '#fff', 'stroke-width': 2 }, svgEl('title', {}, 'Finish')));
          }
          mapBox.replaceChildren(svg);
        }).catch(function (err) { mapBox.replaceChildren(U.note('The map could not be drawn: ' + (err.message || err), 'err')); });
      }
      function drawProfile(st, hasEle) {
        if (!hasEle || st.dist <= 0) { profBox.replaceChildren(U.note('No elevation data to draw a profile.')); return; }
        var W = 720, H = 200, l = 44, r = 10, t = 10, b = 26, pts = st.profile.filter(function (p) { return p.ele !== null; });
        var lo = Math.floor(st.min / 10) * 10, hi = Math.max(lo + 10, Math.ceil(st.max / 10) * 10), u = UNITS[unit][0];
        var x = function (d) { return l + d / st.dist * (W - l - r); }, y = function (e) { return t + (hi - e) / (hi - lo) * (H - t - b); };
        var d = 'M' + x(pts[0].d) + ' ' + y(lo) + pts.map(function (p) { return ' L' + x(p.d).toFixed(1) + ' ' + y(p.ele).toFixed(1); }).join('') + ' L' + x(pts[pts.length - 1].d) + ' ' + y(lo) + 'Z';
        var svg = svgEl('svg', { class: 'gg-prof', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Elevation profile' });
        svg.appendChild(svgEl('path', { class: 'axis', d: 'M' + l + ' ' + t + ' V' + (H - b) + ' H' + (W - r) }));
        svg.appendChild(svgEl('path', { class: 'area', d: d }));
        svg.appendChild(svgEl('text', { x: l - 4, y: y(hi) + 4, 'text-anchor': 'end' }, hi + ' m'));
        svg.appendChild(svgEl('text', { x: l - 4, y: y(lo), 'text-anchor': 'end' }, lo + ' m'));
        var total = st.dist / u, step = Math.pow(10, Math.floor(Math.log10(Math.max(total, 1e-9))));
        if (total / step > 6) step *= 2;
        for (var v = 0; v <= total + 1e-9; v += step) svg.appendChild(svgEl('text', { x: x(v * u), y: H - 8, 'text-anchor': 'middle' }, sig(v, 3) + (v ? '' : ' ' + UNITS[unit][1])));
        profBox.replaceChildren(svg);
      }
      function drawSplits(st) {
        var u = UNITS[unit][0], prof = st.profile, rows = [], prevT = null, prevE = null;
        if (st.dist < u * 0.2) { splitBox.replaceChildren(U.note('Too short for splits.')); return; }
        var at = function (target) {
          for (var i = 1; i < prof.length; i++) {
            if (prof[i].d >= target) {
              var a = prof[i - 1], b = prof[i], f = b.d > a.d ? (target - a.d) / (b.d - a.d) : 0;
              return { time: a.time !== null && b.time !== null ? a.time + f * (b.time - a.time) : null, ele: a.ele !== null && b.ele !== null ? a.ele + f * (b.ele - a.ele) : null };
            }
          }
          var z = prof[prof.length - 1];
          return { time: z.time, ele: z.ele };
        };
        var start = at(0);
        prevT = start.time; prevE = start.ele;
        var n = Math.ceil(st.dist / u - 1e-9);
        for (var k = 1; k <= Math.min(n, 500); k++) {
          var target = Math.min(k * u, st.dist), p = at(target), len = (target - (k - 1) * u) / u;
          var dt = p.time !== null && prevT !== null ? (p.time - prevT) / 1000 : null;
          rows.push([sig(target / u, 4), dt !== null ? fmtHms(dt) : '—', dt !== null && len > 0 ? fmtHms(dt / len) + ' /' + UNITS[unit][1] : '—',
            p.ele !== null && prevE !== null ? (p.ele - prevE >= 0 ? '+' : '') + Math.round(p.ele - prevE) + ' m' : '—']);
          prevT = p.time; prevE = p.ele;
        }
        splitBox.replaceChildren(el('div', { class: 'gg-scroll' }, U.table([UNITS[unit][1], 'Split time', 'Pace', 'Climb'], rows)));
      }
      function exporter(label, ext, fn, mime) {
        return U.button(label, function () {
          if (!data) return;
          var tracks = current();
          U.saveText(baseName + '.' + ext, fn(tracks, data.wpts, baseName), mime);
        });
      }
      U.live([trackSel, hyst, tol], draw);
      land.input.addEventListener('change', draw);
      put(controls, U.row(trackSel, hyst, tol), el('div', { class: 'cv-flex', style: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginTop: '8px' } }, unitChips, land));
      root.appendChild(U.panel(null, drop, U.btnrow(U.button('Load a sample track', function () {
        baseName = 'sample-loop';
        U.script('assets/vendor/togeojson/togeojson.umd.js').then(function () { load(toGeoJSON.gpx(new DOMParser().parseFromString(sampleGpx(), 'application/xml'))); });
      }, 'ghost')), status, controls));
      root.appendChild(U.panel('Summary', statsBox));
      root.appendChild(U.panel('Map', mapBox, U.note('A simple Mercator drawing with no map tiles, so nothing is fetched from the internet. Green marks the start, red the finish.')));
      root.appendChild(U.panel('Elevation profile', profBox));
      root.appendChild(U.panel('Splits', splitBox));
      root.appendChild(U.panel('Save as', U.btnrow(exporter('GPX', 'gpx', toGpx, 'application/gpx+xml'), exporter('KML', 'kml', toKml, 'application/vnd.google-earth.kml+xml'),
        exporter('GeoJSON', 'geojson', toGeoJson, 'application/geo+json'), exporter('CSV', 'csv', toCsv, 'text/csv')),
        U.note('Exports include any simplification. Distances are measured on the WGS84 ellipsoid; moving time counts stretches faster than 1 km/h.')));
    }
  });

  /* --- Map area & perimeter ---------------------------------------------------- */

  var ANTARCTICA = '-63.1, -58\n-72.9, -74\n-71.9, -102\n-74.9, -102\n-74.3, -131\n-77.5, -163\n-77.4, 163\n-71.7, 172\n-65.9, 140\n-65.7, 113\n-66.6, 88\n-66.9, 59\n-69.8, 25\n-70.0, -4\n-71.0, -14\n-77.3, -33\n-77.9, -46\n-74.7, -61';
  var FIELD = '51.76105, -1.26045\n51.76185, -1.25860\n51.76090, -1.25745\n51.76002, -1.25938\n\n51.76090, -1.25930\n51.76110, -1.25880\n51.76080, -1.25860\n51.76062, -1.25905';

  function segsCross(a, b, c, d) {
    var o = function (p, q, r) { var v = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]); return v > 0 ? 1 : v < 0 ? -1 : 0; };
    return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b) && o(a, b, c) && o(a, b, d);
  }
  function selfIntersects(ring) {
    var n = ring.length;
    if (n > 3000) return false;
    for (var i = 0; i < n; i++) {
      for (var j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        if (segsCross(ring[i], ring[(i + 1) % n], ring[j], ring[(j + 1) % n])) return true;
      }
    }
    return false;
  }

  Tools.register({
    id: 'polygon-area', category: 'geo', name: 'Map Area & Perimeter Calculator',
    description: 'Paste coordinates or import GeoJSON or KML to get the true geodesic area and perimeter on the WGS84 ellipsoid in m², hectares, acres, km² and square miles, holes included.',
    keywords: ['area calculator', 'map area', 'land area', 'polygon area', 'field area', 'acres', 'hectares', 'square metres', 'perimeter', 'geodesic area',
      'plot size', 'geojson area', 'kml area', 'measure land', 'square miles'],
    render: function (root) {
      box(root);
      var ta = U.textarea({ label: 'Corners, one "latitude, longitude" per line', value: FIELD, spellcheck: false, dataset: { role: 'coords' } });
      var order = U.select({ label: 'Each line is', dataset: { role: 'order' }, value: 'latlon', options: [{ value: 'latlon', label: 'latitude, longitude' }, { value: 'lonlat', label: 'longitude, latitude (GeoJSON order)' }] });
      var drop = U.dropzone({ accept: '.geojson,.json,.kml,.gpx', label: 'Or drop a GeoJSON or KML file with polygons', onFiles: function (f) { importFile(f[0]); } });
      var status = U.note('');
      var out = el('div', { dataset: { role: 'result' } }), fig = el('div');
      var imported = null;

      function readText() {
        var blocks = inp(ta).value.split(/\n\s*\n|\n\s*hole\s*\n/i), rings = [], bad = [];
        blocks.forEach(function (bl) {
          var ring = [];
          bl.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l && !/^hole$/i.test(l); }).forEach(function (l) {
            var line = l;
            if (inp(order).value === 'lonlat') { var m = /^\s*([+-]?\d*\.?\d+)[\s,;]+([+-]?\d*\.?\d+)\s*$/.exec(l); if (m) line = m[2] + ', ' + m[1]; }
            var p = parseCoord(line, 'wgs84');
            if (p.error !== undefined) bad.push(l); else ring.push([p.lat, p.lon]);
          });
          if (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) ring.pop();
          if (ring.length) rings.push(ring);
        });
        return { polys: rings.length ? [rings] : [], bad: bad };
      }
      function importFile(file) {
        readGeoFile(file).then(function (fc) {
          var polys = [];
          var add = function (g) {
            if (!g) return;
            var conv = function (ring) { var r = ring.map(function (c) { return [c[1], c[0]]; }); if (r.length > 1 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1]) r.pop(); return r; };
            if (g.type === 'Polygon') polys.push(g.coordinates.map(conv));
            else if (g.type === 'MultiPolygon') g.coordinates.forEach(function (p) { polys.push(p.map(conv)); });
            else if (g.type === 'GeometryCollection') g.geometries.forEach(add);
          };
          (fc.type === 'FeatureCollection' ? fc.features : [fc.type === 'Feature' ? fc : { geometry: fc }]).forEach(function (f) { add(f.geometry); });
          if (!polys.length) throw new Error('no polygons in the file');
          imported = { name: file.name, polys: polys };
          run();
        }).catch(function (err) { status.className = 'note err'; status.textContent = 'Could not use that file: ' + (err.message || err); });
      }
      function run() {
        out.replaceChildren(); fig.replaceChildren();
        var src = imported || readText();
        status.className = 'note';
        status.textContent = imported ? 'Using ' + src.polys.length + ' polygon' + (src.polys.length === 1 ? '' : 's') + ' from ' + imported.name + '.' : '';
        if (src.bad && src.bad.length) { status.className = 'note err'; status.textContent = 'Could not read: ' + src.bad.slice(0, 3).join(' · '); return; }
        var polys = src.polys.filter(function (p) { return p[0] && p[0].length >= 3; });
        if (!polys.length) { status.textContent = 'Enter at least three corners.'; return; }
        var area = 0, per = 0, outer = 0, verts = 0, holes = 0, warn = false;
        polys.forEach(function (p) {
          p.forEach(function (ring, i) {
            var a = ringArea(ring), l = ringPerimeter(ring);
            area += i ? -a : a; per += l; verts += ring.length;
            if (!i) outer += l; else holes++;
            if (selfIntersects(ring)) warn = true;
          });
        });
        area = Math.max(0, area);
        var c = function (label, value, k, raw, hl) { var n = card(label, value, k, { hl: hl }); if (raw !== undefined) n.querySelector('b').dataset.v = String(raw); return n; };
        put(out, el('div', { class: 'gg-big', dataset: { k: 'headline' }, text: area < 1e6 ? group(area / 1e4, 4) + ' ha · ' + group(area / 4046.8564224, 3) + ' acres' : group(area / 1e6, 3) + ' km² · ' + group(area / 2589988.110336, 3) + ' sq mi' }),
          el('div', { class: 'gg-grid' },
            c('Square metres', group(area, area < 1e4 ? 2 : 0) + ' m²', 'm2', area.toFixed(3), true), c('Hectares', group(area / 1e4, 4) + ' ha', 'ha'),
            c('Acres', group(area / 4046.8564224, 4) + ' acres', 'acres'), c('Square kilometres', group(area / 1e6, 6) + ' km²', 'km2'),
            c('Square miles', group(area / 2589988.110336, 6) + ' sq mi', 'sqmi'), c('Square feet', group(area / 0.09290304, 0) + ' sq ft', 'sqft'),
            c('Perimeter', per < 1e4 ? group(per, 2) + ' m' : group(per / 1000, 3) + ' km', 'perim', per.toFixed(4)),
            c('Perimeter in miles', group(per / 1609.344, 3) + ' mi', 'perim-mi'),
            c('Corners', group(verts) + (holes ? ' (' + holes + ' hole' + (holes > 1 ? 's' : '') + ')' : ''), 'verts')),
          holes ? U.note('Perimeter includes the edges of the holes; the outer edge alone is ' + (outer < 1e4 ? group(outer, 2) + ' m' : group(outer / 1000, 3) + ' km') + '.') : null,
          warn ? el('p', { class: 'gg-warn', text: '⚠ Some edges cross each other, so the area may not be what you meant. List the corners in order around the edge.' }) : null);
        drawFig(polys);
      }
      function drawFig(polys) {
        var all = [];
        polys.forEach(function (p) { p.forEach(function (r) { all = all.concat(r); }); });
        var lat0 = all.reduce(function (a, p) { return a + p[0]; }, 0) / all.length, lon0 = all[0][1];
        var k = Math.cos(lat0 * RAD);
        var xy = function (p) { return [wrap180(p[1] - lon0) * k, -p[0]]; };
        var pts = all.map(xy), minX = Math.min.apply(null, pts.map(function (p) { return p[0]; })), maxX = Math.max.apply(null, pts.map(function (p) { return p[0]; }));
        var minY = Math.min.apply(null, pts.map(function (p) { return p[1]; })), maxY = Math.max.apply(null, pts.map(function (p) { return p[1]; }));
        var W = 600, H = 320, s = Math.min((W - 20) / (maxX - minX || 1e-9), (H - 20) / (maxY - minY || 1e-9));
        var d = polys.map(function (p) { return p.map(function (r) { return r.map(function (q, i) { var v = xy(q); return (i ? 'L' : 'M') + (10 + (v[0] - minX) * s).toFixed(1) + ' ' + (10 + (v[1] - minY) * s).toFixed(1); }).join(' ') + 'Z'; }).join(' '); }).join(' ');
        fig.replaceChildren(svgEl('svg', { class: 'gg-map', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Outline of the area' }, svgEl('path', { class: 'poly', d: d })));
      }
      U.live([ta, order], function () { imported = null; run(); });
      loadProj().then(run).catch(function () { /* plain lat/long still works */ });
      root.appendChild(U.panel(null, ta, U.row(order), U.btnrow(
        U.button('Example: a field with a pond', function () { imported = null; inp(ta).value = FIELD; inp(order).value = 'latlon'; run(); }, 'ghost'),
        U.button('Example: Antarctica', function () { imported = null; inp(ta).value = ANTARCTICA; inp(order).value = 'latlon'; run(); }, 'ghost')),
        U.note('List the corners in order around the edge; the shape closes itself. Leave a blank line before the corners of a hole (a pond, a building) to subtract it. Grid references and other formats work too.'),
        drop, status));
      root.appendChild(U.panel('Area', out, fig));
      root.appendChild(U.panel(null, U.note('Edges are geodesics (the shortest path on the WGS84 ellipsoid), and the area is exact to about one part in ten billion, matching GeographicLib. For a shape that goes round a pole, the smaller of the two regions is measured. 1 hectare = 10,000 m²; 1 acre = 4,046.86 m².')));
    }
  });

  /* --- Geohash ---------------------------------------------------------------------- */

  var B32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  function ghEncode(lat, lon, prec) {
    var la = [-90, 90], lo = [-180, 180], hash = '', bit = 0, ch = 0, even = true;
    while (hash.length < prec) {
      var r = even ? lo : la, v = even ? lon : lat, mid = (r[0] + r[1]) / 2;
      if (v >= mid) { ch = ch * 2 + 1; r[0] = mid; } else { ch *= 2; r[1] = mid; }
      even = !even;
      if (++bit === 5) { hash += B32[ch]; bit = 0; ch = 0; }
    }
    return hash;
  }
  function ghDecode(hash) {
    var la = [-90, 90], lo = [-180, 180], even = true;
    hash = String(hash).trim().toLowerCase();
    if (!hash || hash.length > 22) return null;
    for (var i = 0; i < hash.length; i++) {
      var c = B32.indexOf(hash[i]);
      if (c < 0) return null;
      for (var b = 4; b >= 0; b--) {
        var r = even ? lo : la, mid = (r[0] + r[1]) / 2;
        if ((c >> b) & 1) r[0] = mid; else r[1] = mid;
        even = !even;
      }
    }
    return { lat: (la[0] + la[1]) / 2, lon: (lo[0] + lo[1]) / 2, latMin: la[0], latMax: la[1], lonMin: lo[0], lonMax: lo[1], dLat: (la[1] - la[0]) / 2, dLon: (lo[1] - lo[0]) / 2 };
  }
  function ghNeighbour(hash, dy, dx) {
    var c = ghDecode(hash);
    if (!c) return null;
    var lat = c.lat + dy * 2 * c.dLat;
    if (lat > 90 || lat < -90) return null;
    return ghEncode(lat, wrap180(c.lon + dx * 2 * c.dLon), hash.length);
  }
  function cellSize(prec) {
    var bits = prec * 5, lonBits = Math.ceil(bits / 2), latBits = Math.floor(bits / 2);
    return { w: 360 / Math.pow(2, lonBits) * A * RAD, h: 180 / Math.pow(2, latBits) * 110574.2727, lonBits: lonBits, latBits: latBits };
  }
  function fmtLen(m) { return m >= 1000 ? sig(m / 1000, 4) + ' km' : m >= 1 ? sig(m, 4) + ' m' : sig(m * 100, 3) + ' cm'; }
  var NB = [['NW', 1, -1], ['N', 1, 0], ['NE', 1, 1], ['W', 0, -1], ['', 0, 0], ['E', 0, 1], ['SW', -1, -1], ['S', -1, 0], ['SE', -1, 1]];

  Tools.register({
    id: 'geohash', category: 'geo', name: 'Geohash Encoder & Decoder',
    description: 'Encode coordinates as a geohash at any precision from 1 to 12, decode a geohash to its centre, bounds and error, see its eight neighbours and cell sizes, or convert many at once.',
    keywords: ['geohash', 'geo hash', 'encode', 'decode', 'geohash precision', 'neighbours', 'neighbors', 'bounding box', 'spatial index', 'base32', 'elasticsearch geohash', 'bulk'],
    render: function (root) {
      box(root);
      var coord = U.input({ label: 'Coordinates', value: '57.64911, 10.40744', spellcheck: false, dataset: { role: 'coord' } });
      var prec = U.select({ label: 'Precision (characters)', dataset: { role: 'prec' }, value: '11', options: Array.from({ length: 12 }, function (x, i) { return String(i + 1); }) });
      var encOut = el('div', { dataset: { role: 'enc' } });
      var gh = U.input({ label: 'Geohash', value: 'u4pruydqqvj', spellcheck: false, autocomplete: 'off', dataset: { role: 'gh' } });
      var decOut = el('div', { dataset: { role: 'dec' } });
      var bulk = U.textarea({ label: 'One geohash or coordinate pair per line', value: 'gcpvj0\n51.5007, -0.1246\nu4pruydqqvj', spellcheck: false, dataset: { role: 'bulk' } });
      var bulkOut = U.out('');
      bulkOut.dataset.role = 'bulk-out';

      function runEnc() {
        encOut.replaceChildren();
        var p = parseCoord(inp(coord).value, 'wgs84');
        if (p.error !== undefined) { encOut.appendChild(U.note(p.error || 'Enter coordinates.', p.error ? 'err' : '')); return; }
        var n = +inp(prec).value, h = ghEncode(p.lat, p.lon, n);
        put(encOut, el('div', { class: 'gg-big', dataset: { k: 'hash' }, text: h }),
          U.btnrow(U.copyBtn('Copy', function () { return h; }), U.button('Decode this', function () { inp(gh).value = h; runDec(); }, 'ghost')),
          el('div', { class: 'gg-scroll' }, U.table(['Precision', 'Geohash', 'Cell (at the equator)'], Array.from({ length: 12 }, function (x, i) {
            var cs = cellSize(i + 1);
            return [String(i + 1), ghEncode(p.lat, p.lon, i + 1), fmtLen(cs.w) + ' × ' + fmtLen(cs.h)];
          }))));
      }
      function runDec() {
        decOut.replaceChildren();
        var h = inp(gh).value.trim().toLowerCase(), d = ghDecode(h);
        if (!d) { if (h) decOut.appendChild(U.note('A geohash uses the digits 0–9 and letters except a, i, l and o.', 'err')); return; }
        var cs = cellSize(h.length), dp = Math.max(2, Math.ceil(-Math.log10(Math.min(d.dLat, d.dLon))) + 1);
        var grid = el('div', { class: 'gg-nb', dataset: { role: 'neighbours' } }, NB.map(function (nb) {
          var v = nb[0] ? ghNeighbour(h, nb[1], nb[2]) : h;
          return el('div', { class: nb[0] ? '' : 'c', dataset: { dir: nb[0] || 'C' } }, el('small', { text: nb[0] || 'this cell' }), v || '—');
        }));
        put(decOut, el('div', { class: 'gg-grid' },
          card('Centre', d.lat.toFixed(dp) + ', ' + d.lon.toFixed(dp), 'centre', { hl: true, copy: true }),
          card('Error (±)', '±' + sig(d.dLat, 3) + '° latitude, ±' + sig(d.dLon, 3) + '° longitude', 'err'),
          card('South-west corner', d.latMin.toFixed(dp) + ', ' + d.lonMin.toFixed(dp), 'sw'),
          card('North-east corner', d.latMax.toFixed(dp) + ', ' + d.lonMax.toFixed(dp), 'ne'),
          card('Cell size here', fmtLen(cs.w * Math.cos(d.lat * RAD)) + ' × ' + fmtLen(cs.h), 'cell')),
          el('h4', { text: 'Neighbours' }), grid);
      }
      function runBulk() {
        var lines = inp(bulk).value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean), n = +inp(prec).value;
        bulkOut.textContent = ['input,geohash,latitude,longitude'].concat(lines.map(function (l) {
          var q = /^[0-9b-hjkmnp-z]{1,12}$/i.test(l) && !/^\d+$/.test(l) ? ghDecode(l) : null;
          if (q) return '"' + l + '",' + l.toLowerCase() + ',' + q.lat.toFixed(7) + ',' + q.lon.toFixed(7);
          var p = parseCoord(l, 'wgs84');
          if (p.error !== undefined) return '"' + l.replace(/"/g, '""') + '",error,,';
          return '"' + l.replace(/"/g, '""') + '",' + ghEncode(p.lat, p.lon, n) + ',' + p.lat.toFixed(7) + ',' + p.lon.toFixed(7);
        })).join('\n');
      }
      U.live([coord, prec], function () { runEnc(); runBulk(); });
      U.live([gh], runDec);
      U.live([bulk], runBulk);
      loadProj().then(function () { runEnc(); runBulk(); }).catch(function () { /* decimal degrees still work */ });
      root.appendChild(U.split(U.panel('Encode', U.row(el('div', { class: 'grow' }, coord), prec), encOut), U.panel('Decode', gh, decOut)));
      root.appendChild(U.panel('Bulk', bulk, bulkOut, U.btnrow(U.copyBtn('Copy CSV', function () { return bulkOut.textContent; }),
        U.downloadBtn('Download CSV', 'geohashes.csv', function () { return bulkOut.textContent; }, 'text/csv')),
        U.note('Geohashes are decoded; coordinates are encoded at the precision chosen above.')));
      root.appendChild(U.panel('Cell sizes', el('div', { class: 'gg-scroll' }, U.table(['Precision', 'Bits (lon + lat)', 'Width at the equator', 'Height'], Array.from({ length: 12 }, function (x, i) {
        var cs = cellSize(i + 1);
        return [String(i + 1), cs.lonBits + ' + ' + cs.latBits, fmtLen(cs.w), fmtLen(cs.h)];
      }))), U.note('Each character adds 5 bits, alternating longitude and latitude. Cells get narrower away from the equator by the cosine of the latitude.')));
    }
  });
})();
