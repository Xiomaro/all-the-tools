/* geo-b tools: where the sun is in the sky for any place and moment, and
   which way and how far a shadow falls. Uses the vendored suncalc module (the
   same one Sunrise & Sunset loads). */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-geob-style')) {
    document.head.appendChild(el('style', { id: 'g-geob-style', text: [
      '.g-geob{--sp-sun:#e39a00;--sp-shadow:#5a6473;--sp-night:#3b4a6b}',
      '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .g-geob{--sp-sun:#f5b301;--sp-shadow:#aab4c3;--sp-night:#8ea2cf}}',
      ':root[data-theme="dark"] .g-geob{--sp-sun:#f5b301;--sp-shadow:#aab4c3;--sp-night:#8ea2cf}',
      '.g-geob [hidden]{display:none !important}',
      '.g-geob .row>.field{flex:1 1 140px;min-width:0}',
      '.g-geob .sp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}',
      '.g-geob .sp-card{border:1px solid var(--border);border-radius:var(--radius);padding:8px 10px;background:var(--bg-sunken);min-width:0}',
      '.g-geob .sp-card span{display:block;color:var(--fg-muted);font-size:12px}',
      '.g-geob .sp-card b{display:block;font-family:var(--mono);font-size:15px;font-weight:600;overflow-wrap:anywhere}',
      '.g-geob .sp-card.hl{border-color:var(--accent)}',
      '.g-geob .sp-time{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '.g-geob .sp-time input[type=range]{flex:1 1 220px;min-width:0}',
      '.g-geob .sp-time b{font-family:var(--mono);font-size:1.3rem;min-width:4.5ch}',
      '.g-geob .sp-views{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.6fr);gap:16px;align-items:start}',
      '@media (max-width:760px){.g-geob .sp-views{grid-template-columns:1fr}}',
      '.g-geob svg{display:block;width:100%;height:auto}',
      '.g-geob svg.sp-compass{max-width:340px;margin:0 auto}',
      '.g-geob svg text{fill:var(--fg-muted);font:12px system-ui,sans-serif}',
      '.g-geob svg text.sp-n{fill:var(--fg);font-weight:700}',
      '.g-geob .sp-ring{fill:var(--bg-sunken);stroke:var(--border);stroke-width:1}',
      '.g-geob .sp-ring2{fill:none;stroke:var(--border);stroke-width:1;stroke-dasharray:3 4}',
      '.g-geob .sp-path{fill:none;stroke:var(--sp-sun);stroke-width:2;opacity:.55;stroke-dasharray:5 4}',
      '.g-geob .sp-sunray{stroke:var(--sp-sun);stroke-width:2}',
      '.g-geob .sp-sundot{fill:var(--sp-sun);stroke:var(--bg-elev);stroke-width:2}',
      '.g-geob .sp-shadow{stroke:var(--sp-shadow);stroke-width:6;stroke-linecap:round;opacity:.8}',
      '.g-geob .sp-obj{fill:var(--fg);stroke:var(--bg-elev);stroke-width:2}',
      '.g-geob .sp-grid-l{stroke:var(--border);stroke-width:1}',
      '.g-geob .sp-horizon{stroke:var(--fg-muted);stroke-width:1}',
      '.g-geob .sp-alt{fill:none;stroke:var(--sp-sun);stroke-width:2.5;stroke-linejoin:round}',
      '.g-geob .sp-below{fill:none;stroke:var(--sp-night);stroke-width:2;stroke-dasharray:4 4}',
      '.g-geob .sp-day{fill:var(--sp-sun);opacity:.12}',
      '.g-geob .sp-now{stroke:var(--accent);stroke-width:1.5}',
      '.g-geob .sp-chart{cursor:crosshair;touch-action:pan-y}',
      '.g-geob .sp-legend{font-size:12.5px;color:var(--fg-muted);margin:6px 0 0}'
    ].join('\n') }));
  }

  var CITIES = [['London', 51.5074, -0.1278], ['Edinburgh', 55.9533, -3.1883], ['Cardiff', 51.4816, -3.1791], ['Belfast', 54.5973, -5.9301],
    ['New York', 40.7128, -74.006], ['Sydney', -33.8688, 151.2093], ['Tokyo', 35.6762, 139.6503], ['Dubai', 25.2048, 55.2708], ['Reykjavík', 64.1466, -21.9426]];
  var POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  var NS = 'http://www.w3.org/2000/svg';

  function sv(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, String(attrs[k])); });
    if (parent) parent.appendChild(n);
    return n;
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function isoDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function hhmm(d) { return d instanceof Date && !isNaN(d) ? pad2(d.getHours()) + ':' + pad2(d.getMinutes()) : '—'; }
  function point(az) { return POINTS[Math.round(((az % 360) + 360) % 360 / 22.5) % 16]; }
  function deg(v, d) { return isFinite(v) ? v.toFixed(d === undefined ? 1 : d) + '°' : '—'; }
  function num(v) { var n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : NaN; }
  function card(label, value, k, hl) {
    return el('div', { class: 'sp-card' + (hl ? ' hl' : '') }, el('span', { text: label }), el('b', { text: value, dataset: k ? { k: k } : undefined }));
  }

  Tools.register({
    id: 'sun-position', category: 'geo', name: 'Sun Position & Shadow Calculator',
    description: 'Where the sun is in the sky (direction and height) for any place, date and time, which way shadows fall and how long they are, with the sun’s path across the day.',
    keywords: ['sun position', 'sun path', 'solar azimuth', 'solar elevation', 'sun angle', 'altitude', 'shadow length', 'shadow direction', 'sun direction', 'sunlight', 'garden',
      'solar panels', 'photography', 'golden hour', 'which way does my garden face', 'sun calculator', 'sun compass', 'solar noon'],
    render: function (root) {
      root.classList.add('g-geob');
      var imperial = !!(window.Region && Region.imperial());
      var home = CITIES[0];
      if (window.Region && Region.isSet && Region.isSet()) CITIES.forEach(function (c) { if (Region.get().city === c[0]) home = c; });
      var lat = U.input({ label: 'Latitude', value: String(home[1]), inputMode: 'decimal', spellcheck: false });
      var lng = U.input({ label: 'Longitude', value: String(home[2]), inputMode: 'decimal', spellcheck: false });
      var status = U.note('');
      var cities = el('div', { class: 'chips' }, CITIES.map(function (c) {
        return el('button', { class: 'chip', type: 'button', onclick: function () { lat.querySelector('input').value = c[1]; lng.querySelector('input').value = c[2]; draw(); } }, c[0]);
      }));
      var locBtn = U.button('📍 Use my location', function () {
        if (!navigator.geolocation) { status.textContent = 'This browser cannot share its location.'; return; }
        status.textContent = 'Asking for your location…';
        navigator.geolocation.getCurrentPosition(function (pos) {
          lat.querySelector('input').value = pos.coords.latitude.toFixed(4);
          lng.querySelector('input').value = pos.coords.longitude.toFixed(4);
          status.textContent = ''; draw();
        }, function (err) { status.textContent = 'Location unavailable: ' + err.message; }, { timeout: 10000 });
      });
      var now = new Date();
      var date = U.input({ label: 'Date', type: 'date', value: isoDate(now) });
      var slider = el('input', { type: 'range', min: 0, max: 1439, step: 1, 'aria-label': 'Time of day' });
      slider.value = String(now.getHours() * 60 + now.getMinutes());
      var clock = el('b', { dataset: { k: 'time' } });
      var nowBtn = U.button('Now', function () { var n = new Date(); date.querySelector('input').value = isoDate(n); slider.value = String(n.getHours() * 60 + n.getMinutes()); draw(); }, 'ghost');
      var height = U.input({ label: 'Height of the object casting the shadow (' + (imperial ? 'ft' : 'm') + ')', type: 'number', min: 0, step: 'any', value: imperial ? '6' : '2' });
      var cardsBox = el('div'), timesBox = el('div');
      var compass = sv('svg', { class: 'sp-compass', viewBox: '0 0 320 320', role: 'img', 'aria-label': 'Compass showing the sun’s direction and the shadow' });
      var chart = sv('svg', { class: 'sp-chart', viewBox: '0 0 560 240', role: 'img', 'aria-label': 'The sun’s height through the day. Click to pick a time.' });
      var sc = null;

      function when() {
        var d = (date.querySelector('input').value || '').split('-');
        if (d.length !== 3) return null;
        var mins = +slider.value;
        return new Date(+d[0], +d[1] - 1, +d[2], Math.floor(mins / 60), mins % 60);
      }

      function draw() {
        var m = +slider.value;
        clock.textContent = pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
        if (!sc) { cardsBox.replaceChildren(U.note('Loading the solar calculator…')); return; }
        var la = num(lat.querySelector('input').value), lo = num(lng.querySelector('input').value), t = when();
        if (!t || !isFinite(la) || !isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) {
          cardsBox.replaceChildren(U.note('Enter a latitude between -90 and 90, a longitude between -180 and 180, and a date.', 'err'));
          timesBox.replaceChildren(); compass.replaceChildren(); chart.replaceChildren(); return;
        }
        var pos = sc.getPosition(t, la, lo), az = pos.azimuth, alt = pos.altitude;
        var h = num(height.querySelector('input').value), unit = imperial ? 'ft' : 'm';
        var up = alt > 0;
        var shadowLen = up && h >= 0 ? h / Math.tan(alt * Math.PI / 180) : NaN;
        var shadowAz = (az + 180) % 360;
        cardsBox.replaceChildren(el('div', { class: 'sp-grid' },
          card('Sun direction (azimuth)', deg(az) + ' ' + point(az), 'azimuth', true),
          card('Sun height (altitude)', deg(alt), 'altitude', true),
          card('Shadow points', up ? deg(shadowAz, 0) + ' ' + point(shadowAz) : 'No shadow: the sun is down', 'shadow-dir'),
          card('Shadow length', up ? (shadowLen > h * 100 ? 'Very long (sun on the horizon)' : shadowLen.toFixed(shadowLen < 10 ? 2 : 1) + ' ' + unit) : '—', 'shadow-len'),
          card('Shadow ÷ height', up ? (1 / Math.tan(alt * Math.PI / 180)).toFixed(2) + ' ×' : '—', 'ratio')));

        /* Times of day at noon of the chosen date (suncalc picks the day around it). */
        var noonDate = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12);
        var times = sc.getTimes(noonDate, la, lo);
        var noonAlt = times.solarNoon ? sc.getPosition(times.solarNoon, la, lo).altitude : NaN;
        var rise = times.sunrise, set = times.sunset, dayLen = rise && set && !isNaN(rise) && !isNaN(set) ? (set - rise + 86400000) % 86400000 : null;
        var riseAz = rise && !isNaN(rise) ? sc.getPosition(rise, la, lo).azimuth : NaN, setAz = set && !isNaN(set) ? sc.getPosition(set, la, lo).azimuth : NaN;
        timesBox.replaceChildren(el('div', { class: 'sp-grid' },
          card('Sunrise', hhmm(rise) + (isFinite(riseAz) ? ' · ' + point(riseAz) : ''), 'sunrise'),
          card('Sunset', hhmm(set) + (isFinite(setAz) ? ' · ' + point(setAz) : ''), 'sunset'),
          card('Solar noon', hhmm(times.solarNoon) + (isFinite(noonAlt) ? ' · ' + deg(noonAlt) : ''), 'noon'),
          card('Day length', dayLen === null ? (noonAlt > 0 ? '24h (midnight sun)' : '0h (polar night)') : Math.floor(dayLen / 3600000) + 'h ' + Math.round(dayLen % 3600000 / 60000) + 'm', 'daylen'),
          card('Morning golden hour ends', hhmm(times.goldenHourEnd), 'golden-am'),
          card('Evening golden hour starts', hhmm(times.goldenHour), 'golden-pm')),
          U.note('Times use this device’s time zone (' + (Intl.DateTimeFormat().resolvedOptions().timeZone || 'local') + '). Directions are from true north, not magnetic north. Shadows assume flat, level ground.'));

        /* Day samples every 10 minutes for both views. */
        var samples = [];
        for (var k = 0; k <= 144; k++) {
          var st = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 0, k * 10);
          var p = sc.getPosition(st, la, lo);
          samples.push({ m: k * 10, az: p.azimuth, alt: p.altitude });
        }
        drawCompass(az, alt, samples);
        drawChart(samples, m, alt);
      }

      function drawCompass(az, alt, samples) {
        compass.replaceChildren();
        var cx = 160, cy = 160, R = 130;
        var xy = function (a, r) { var rad = a * Math.PI / 180; return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)]; };
        sv('circle', { class: 'sp-ring', cx: cx, cy: cy, r: R }, compass);
        [30, 60].forEach(function (a) { sv('circle', { class: 'sp-ring2', cx: cx, cy: cy, r: R * (90 - a) / 90 }, compass); });
        ['N', 'E', 'S', 'W'].forEach(function (lab, i) {
          var q = xy(i * 90, R + 15);
          var tx = sv('text', { x: q[0], y: q[1] + 4, 'text-anchor': 'middle', class: lab === 'N' ? 'sp-n' : '' }, compass);
          tx.textContent = lab;
        });
        /* The day's path above the horizon: altitude maps to distance from the rim. */
        var d = '', pen = false;
        samples.forEach(function (s) {
          if (s.alt <= 0) { pen = false; return; }
          var q = xy(s.az, R * (90 - s.alt) / 90);
          d += (pen ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1);
          pen = true;
        });
        if (d) sv('path', { class: 'sp-path', d: d }, compass);
        if (alt > 0) {
          /* Shadow: fixed-length stroke in the opposite direction, shorter when the sun is high. */
          var cot = 1 / Math.tan(alt * Math.PI / 180);
          var sl = Math.min(R - 10, 18 + 40 * Math.min(cot, 2.8));
          var e = xy((az + 180) % 360, sl);
          sv('line', { class: 'sp-shadow', x1: cx, y1: cy, x2: e[0], y2: e[1] }, compass);
          var s = xy(az, R * (90 - alt) / 90);
          sv('line', { class: 'sp-sunray', x1: cx, y1: cy, x2: s[0], y2: s[1], 'stroke-dasharray': '2 4' }, compass);
          sv('circle', { class: 'sp-sundot', cx: s[0], cy: s[1], r: 10 }, compass);
        } else {
          var b = xy(az, R + 2);
          sv('circle', { cx: b[0], cy: b[1], r: 6, fill: 'none', stroke: 'var(--sp-night)', 'stroke-width': 2 }, compass);
        }
        sv('circle', { class: 'sp-obj', cx: cx, cy: cy, r: 6 }, compass);
      }

      function drawChart(samples, m, alt) {
        chart.replaceChildren();
        var W = 560, H = 240, L = 40, Rt = 10, T = 10, B = 26, pw = W - L - Rt, ph = H - T - B;
        var maxAlt = Math.max(10, Math.ceil(Math.max.apply(null, samples.map(function (s) { return s.alt; })) / 10) * 10);
        var minAlt = Math.max(-90, Math.min(-10, Math.floor(Math.min.apply(null, samples.map(function (s) { return s.alt; })) / 10) * 10));
        minAlt = Math.max(minAlt, -30);
        var X = function (mm) { return L + mm / 1440 * pw; };
        var Y = function (a) { return T + (maxAlt - Math.max(minAlt, a)) / (maxAlt - minAlt) * ph; };
        /* Ticks on round multiples, so the horizon (0°) always gets a line and a label. */
        var tick = maxAlt - minAlt > 60 ? 20 : 10;
        for (var a = Math.ceil(minAlt / tick) * tick; a <= maxAlt; a += tick) {
          sv('line', { class: a === 0 ? 'sp-horizon' : 'sp-grid-l', x1: L, x2: L + pw, y1: Y(a), y2: Y(a) }, chart);
          sv('text', { x: L - 6, y: Y(a) + 4, 'text-anchor': 'end' }, chart).textContent = a + '°';
        }
        for (var hr = 0; hr <= 24; hr += 3) sv('text', { x: X(hr * 60), y: H - 8, 'text-anchor': 'middle' }, chart).textContent = pad2(hr % 24) + ':00';
        /* Daylight band */
        var above = '', below = '', penA = false, penB = false;
        samples.forEach(function (s) {
          var px = X(s.m).toFixed(1), py = Y(s.alt).toFixed(1);
          if (s.alt > 0) { above += (penA ? 'L' : 'M') + px + ' ' + py; penA = true; } else penA = false;
          if (s.alt <= 0) { below += (penB ? 'L' : 'M') + px + ' ' + py; penB = true; } else penB = false;
        });
        samples.forEach(function (s, i) {
          if (s.alt > 0 && i < samples.length - 1) sv('rect', { class: 'sp-day', x: X(s.m), y: T, width: X(10) - X(0), height: ph }, chart);
        });
        if (below) sv('path', { class: 'sp-below', d: below }, chart);
        if (above) sv('path', { class: 'sp-alt', d: above }, chart);
        sv('line', { class: 'sp-now', x1: X(m), x2: X(m), y1: T, y2: T + ph }, chart);
        sv('circle', { class: 'sp-sundot', cx: X(m), cy: Y(alt), r: 6 }, chart);
        var hit = sv('rect', { x: L, y: T, width: pw, height: ph, fill: 'transparent' }, chart);
        function pick(e) {
          var r = chart.getBoundingClientRect(), sx = (e.clientX - r.left) / r.width * W;
          slider.value = String(Math.max(0, Math.min(1439, Math.round((sx - L) / pw * 1440))));
          draw();
        }
        hit.addEventListener('pointerdown', pick);
      }

      U.module('assets/vendor/suncalc/suncalc.mjs').then(function (mod) { sc = mod; draw(); })
        .catch(function (e) { cardsBox.replaceChildren(U.note('Could not load the solar calculator: ' + e.message, 'err')); });
      U.live([lat, lng, date, height, slider], draw);
      slider.addEventListener('input', function () { var mm = +slider.value; clock.textContent = pad2(Math.floor(mm / 60)) + ':' + pad2(mm % 60); });

      root.appendChild(U.panel('Place', cities, U.row(lat, lng), U.btnrow(locBtn), status));
      root.appendChild(U.panel('When', U.row(date, height), el('div', { class: 'sp-time' }, clock, slider, nowBtn)));
      root.appendChild(U.panel('Sun and shadow', cardsBox));
      root.appendChild(U.panel(null, el('div', { class: 'sp-views' },
        el('div', null, el('h3', { text: 'Compass' }), compass, el('p', { class: 'sp-legend', text: 'Sun (yellow) seen from above: the closer to the centre, the higher it is. The grey bar is the shadow; the dashed curve is today’s path.' })),
        el('div', null, el('h3', { text: 'Height through the day' }), chart, el('p', { class: 'sp-legend', text: 'Click or tap the chart to jump to a time. The shaded part is daylight.' })))));
      root.appendChild(U.panel('Sunrise, sunset and golden hour', timesBox));
    }
  });
})();
