/* Behaviour checks for geo.js. Sources for the expected values:
   - Ordnance Survey, "A guide to coordinate systems in Great Britain":
     OSGB36 52°39′27.2531″N 1°43′04.5177″E = E 651409.903, N 313177.270.
   - OS OSTN15 developer-pack test points (ETRS89 → OSGB36); the Helmert
     transformation must land within its stated ~5 m of them.
   - The same grid point through the OS Helmert parameters, as published in
     the chrisveness/geodesy README: 52°39′28.723″N 1°42′57.787″E.
   - Vincenty (1975) / Geoscience Australia: Flinders Peak → Buninyong
     54,972.271 m, azimuths 306°52′05.37″ and 127°10′25.07″ (reverse).
   - GeographicLib docs: 20,000 km SW of Perth is 32.11195529, −63.95925278;
     Antarctica polygon perimeter 16,831,067.893 m and area 13,662,703,680,020.1 m².
   - chrisveness/geodesy spherical tests: Cambridge → Paris 404.28 km,
     156.2° / 157.9°, midpoint 50.5363, 1.2746; Dover → Calais rhumb 40.308 km
     on 116.7°; destination 51.5136°N 0.0983°W.
   - Worked by hand: UTM of 45°N 3°W = 0.9996 × meridian arc 4,984,944.378 m;
     1° of equator = 6,378,137 × π/180 m, 1° of meridian from the equator =
     110,574.389 m; the WGS84 ellipsoid's area / 8 = 63,758,202,715,511 m².
   - Geohash: Wikipedia (u4pruydqqvj = 57.64911, 10.40744; ezs42 = 42.605,
     −5.603) and the ngeohash tests (ww8p1r4t8, wte, neighbours of dqcjq). */
'use strict';

const fs = require('fs');
const V = '#view ';
function res(ok, detail) { return { ok: !!ok, detail: String(detail).slice(0, 280) }; }
async function setVal(page, sel, value) { await page.fill(V + sel, String(value)); await page.waitForTimeout(300); }
async function pick(page, sel, value) { await page.selectOption(V + sel, value); await page.waitForTimeout(300); }
async function k(page, key) { return (await page.innerText(V + `[data-k="${key}"]`)).replace(/\s+/g, ' ').trim(); }
function near(text, lat, lon, tol) { const m = String(text).split(',').map(Number); return Math.abs(m[0] - lat) < tol && Math.abs(m[1] - lon) < tol; }
async function ready(page, key) { await page.waitForFunction(k => { const n = document.querySelector('#view [data-k="' + k + '"]'); return n && n.textContent.trim(); }, key, { timeout: 20000 }); }
async function download(page, click) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), click()]);
  return { name: dl.suggestedFilename(), text: fs.readFileSync(await dl.path(), 'utf8') };
}

/* Eleven points along the equator 0.001° apart, a minute apart. */
function equatorGpx() {
  const ele = [0, 10, 5, 20, 20, 20, 20, 20, 20, 20, 20];
  const pts = ele.map((e, i) => `<trkpt lat="0" lon="${(i * 0.001).toFixed(3)}"><ele>${e}</ele><time>${new Date(Date.UTC(2024, 4, 1, 10, i)).toISOString()}</time></trkpt>`);
  return `<?xml version="1.0"?><gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1"><wpt lat="0" lon="0.005"><name>Half way</name></wpt><trk><name>Equator walk</name><trkseg>${pts.join('')}</trkseg></trk></gpx>`;
}
const DAY = 1113.194907932736;   /* 10 × 0.001° × 6378137 × π/180 */

module.exports = [
  {
    name: 'coordinate-converter: OS example 651409.903, 313177.270 = TG 51409 13177, OSGB36 52°39′27.253″N 1°43′04.518″E, WGS84 52°39′28.723″N 1°42′57.787″E', tool: 'coordinate-converter',
    run: async (page) => {
      await ready(page, 'osgr');
      await setVal(page, 'input[data-role="coord"]', '651409.903, 313177.270');
      const gr = await k(page, 'osgr'), os = await k(page, 'osgb36'), dms = await k(page, 'dms');
      return res(gr === 'TG 51409 13177' && os === '52°39′27.253″N 1°43′04.518″E' && dms === '52°39′28.723″N 1°42′57.787″E', [gr, os, dms].join(' | '));
    }
  },
  {
    name: 'coordinate-converter: OSGB36 latitude/longitude → E 651409.903 N 313177.270 to the millimetre (OS worked example)', tool: 'coordinate-converter',
    run: async (page) => {
      await ready(page, 'osgr');
      await pick(page, 'select[data-role="datum"]', 'osgb36');
      await setVal(page, 'input[data-role="coord"]', '52°39′27.2531″N 1°43′04.5177″E');
      const b = await page.$(V + '[data-k="osen"]');
      const e = +(await b.getAttribute('data-e')), n = +(await b.getAttribute('data-n'));
      return res(Math.abs(e - 651409.903) < 0.001 && Math.abs(n - 313177.270) < 0.001, `${e} ${n}`);
    }
  },
  {
    name: 'coordinate-converter: OSTN15 test points TP05, TP19, TP31 land within 5 m by Helmert', tool: 'coordinate-converter',
    run: async (page) => {
      await ready(page, 'osgr');
      const tps = [['50.93127938, -1.450514337', 438710.92, 114792.25], ['53.77911026, -3.040454907', 331534.564, 431920.794], ['57.81351838, -8.578544561', 9587.909, 899448.996]];
      const got = [];
      for (const [ll, e0, n0] of tps) {
        await setVal(page, 'input[data-role="coord"]', ll);
        const b = await page.$(V + '[data-k="osen"]');
        const d = Math.hypot(+(await b.getAttribute('data-e')) - e0, +(await b.getAttribute('data-n')) - n0);
        got.push(d.toFixed(2));
      }
      const gr = await (async () => { await setVal(page, 'input[data-role="coord"]', tps[0][0]); return k(page, 'osgr'); })();
      return res(got.every(d => +d < 5) && /^SU 387\d\d 147\d\d$/.test(gr), got.join(' m, ') + ' m | ' + gr);
    }
  },
  {
    name: 'coordinate-converter: 45°N 3°W = UTM 30T 500000 4982950; formats parse (DMS, DDM, grid, MGRS round trip)', tool: 'coordinate-converter',
    run: async (page) => {
      await ready(page, 'osgr');
      await setVal(page, 'input[data-role="coord"]', '45, -3');
      const utm = await k(page, 'utm'), mgrs = await k(page, 'mgrs');
      await setVal(page, 'input[data-role="coord"]', '30T 500000 4982950.4');
      const back = await k(page, 'dd');
      await setVal(page, 'input[data-role="coord"]', mgrs);
      const back2 = await k(page, 'dd');
      await setVal(page, 'input[data-role="coord"]', '51°30′26″N 0°07′40″W');
      const a = await k(page, 'dd');
      await setVal(page, 'input[data-role="coord"]', 'N 51 30.441 W 0 7.666');
      const b = await k(page, 'dd');
      await setVal(page, 'input[data-role="coord"]', 'SU 387 150');
      const c = await k(page, 'osgr');
      return res(utm === '30T 500000 4982950' && back === '45.000000, -3.000000' && near(back2, 45, -3, 2e-5) && a === '51.507222, -0.127778' &&
        b === '51.507350, -0.127767' && c === 'SU 38700 15000', [utm, mgrs, back, back2, a, b, c].join(' | '));
    }
  },
  {
    name: 'distance-calculator: Flinders Peak → Buninyong 54,972.271 m, 306°52′05.37″ / 307°10′25.07″ (Vincenty)', tool: 'distance-calculator',
    run: async (page) => {
      await setVal(page, 'input[data-role="from"]', '-37 57 03.72030, 144 25 29.52440');
      await setVal(page, 'input[data-role="to"]', '-37 39 10.15610, 143 55 35.38390');
      const m = +(await page.getAttribute(V + '[data-k="vincenty"]', 'data-m'));
      const b1 = await k(page, 'brg1'), b2 = await k(page, 'brg2');
      return res(Math.abs(m - 54972.271) < 0.001 && /306° 52′ 05\.37″\) NW/.test(b1) && /307° 10′ 25\.07″/.test(b2), `${m} | ${b1} | ${b2}`);
    }
  },
  {
    name: 'distance-calculator: Cambridge → Paris 404.28 km, 156.2° → 157.9°, midpoint 50.5363, 1.2746; Dover → Calais rhumb 40.308 km on 116.7°', tool: 'distance-calculator',
    run: async (page) => {
      const gc = await k(page, 'gc'), br = await k(page, 'gc-brg'), mid = await k(page, 'mid');
      await setVal(page, 'input[data-role="from"]', '51.127, 1.338');
      await setVal(page, 'input[data-role="to"]', '50.964, 1.853');
      const rh = await k(page, 'rhumb');
      await page.click(V + '.chip:has-text("Nautical miles")'); await page.waitForTimeout(250);
      const nm = await k(page, 'rhumb');
      return res(gc === '404.28 km' && /^156\.2° → 157\.9°/.test(br) && mid === '50.5363, 1.2746' && /^40\.308 km on 116\.7°/.test(rh) && /^21\.76[45] nmi/.test(nm), [gc, br, mid, rh, nm].join(' | '));
    }
  },
  {
    name: 'distance-calculator: 20,000 km SW of Perth = 32.11195529, -63.95925278; Greenwich destination; route 0,0 → 0,1 → 1,1', tool: 'distance-calculator',
    run: async (page) => {
      const sph = await k(page, 'dest-sph');
      await setVal(page, 'input[data-role="dest-from"]', '-32.06, 115.74');
      await setVal(page, 'input[data-role="dest-dist"]', 20000);
      await setVal(page, 'input[data-role="dest-brg"]', 225);
      const d = await k(page, 'dest');
      await setVal(page, 'textarea[data-role="route"]', '0, 0\n0, 1\n1, 1');
      const tot = +(await page.getAttribute(V + '[data-k="route-total"]', 'data-m'));
      const want = 6378137 * Math.PI / 180 + 110574.3886;
      return res(sph === '51.5136, -0.0983' && d === '32.11195529, -63.95925278' && Math.abs(tot - want) < 0.01, `${sph} | ${d} | ${tot} vs ${want.toFixed(3)}`);
    }
  },
  {
    name: 'gpx-viewer: equator track = 1.113 km, +25 m / −5 m, 10:00, 6.679 km/h, splits, simplify to 2 points', tool: 'gpx-viewer',
    run: async (page) => {
      await page.setInputFiles(V + 'input[type=file]', { name: 'walk.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(equatorGpx()) });
      await ready(page, 'dist');
      await pick(page, 'select[data-role="hyst"]', '0');
      const got = [await k(page, 'dist'), await k(page, 'gain'), await k(page, 'loss'), await k(page, 'minmax'), await k(page, 'duration'), await k(page, 'moving'), await k(page, 'speed')];
      const splits = await page.$$eval(V + '[data-role="splits"] tbody tr', trs => trs.map(tr => Array.from(tr.children).map(td => td.textContent).join(' ')));
      await page.waitForSelector(V + 'svg.gg-map path.trk', { state: 'attached', timeout: 20000 });
      await setVal(page, 'input[data-role="tolerance"]', 1);
      const pts = await k(page, 'points');
      /* 1 km takes 1000 / 111.3195 × 60 s = 539 s = 8:59. */
      return res(got.join() === '1.113 km,25 m,5 m,0 m / 20 m,10:00,10:00,6.679 km/h' && splits.length === 2 && /^1 8:59 8:59 \/km \+20 m$/.test(splits[0]) && pts === '2 of 11',
        got.join(' | ') + ' | ' + splits.join(' ; ') + ' | ' + pts);
    }
  },
  {
    name: 'gpx-viewer: exports GPX, KML, GeoJSON and CSV that read back; KML input works', tool: 'gpx-viewer',
    run: async (page) => {
      await page.setInputFiles(V + 'input[type=file]', { name: 'walk.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(equatorGpx()) });
      await ready(page, 'dist');
      const gpx = await download(page, () => page.click(V + 'button:has-text("GPX")'));
      const kml = await download(page, () => page.click(V + 'button:has-text("KML")'));
      const gj = await download(page, () => page.click(V + 'button:has-text("GeoJSON")'));
      const csv = await download(page, () => page.click(V + 'button:has-text("CSV")'));
      const fc = JSON.parse(gj.text), line = fc.features.find(f => f.geometry.type === 'LineString');
      const csvLines = csv.text.trim().split(/\r?\n/);
      const okExports = gpx.name === 'walk.gpx' && (gpx.text.match(/<trkpt /g) || []).length === 11 && /<wpt [^>]*><name>Half way<\/name>/.test(gpx.text.replace(/<ele>[^<]*<\/ele>/g, '')) &&
        /<LineString>/.test(kml.text) && line.geometry.coordinates.length === 11 && line.properties.coordinateProperties.times.length === 11 &&
        csvLines.length === 12 && Math.abs(+csvLines[11].split(',').pop() - DAY) < 0.2;
      /* Feed the KML back in. */
      await page.setInputFiles(V + 'input[type=file]', { name: 'walk.kml', mimeType: 'application/vnd.google-earth.kml+xml', buffer: Buffer.from(kml.text) });
      await page.waitForTimeout(800);
      const d = await k(page, 'dist');
      return res(okExports && d === '1.113 km', [gpx.name, kml.name, gj.name, csv.name, csvLines.length, csvLines[11], d].join(' | '));
    }
  },
  {
    name: 'polygon-area: Antarctica matches GeographicLib (13,662,703,680,020 m², 16,831,067.893 m); octant = ellipsoid / 8; hole subtracts', tool: 'polygon-area',
    run: async (page) => {
      await ready(page, 'm2');
      const fieldArea = +(await page.getAttribute(V + '[data-k="m2"]', 'data-v'));
      const text = await page.inputValue(V + 'textarea[data-role="coords"]');
      const [outer, hole] = text.split(/\n\s*\n/);
      await setVal(page, 'textarea[data-role="coords"]', outer);
      const outerArea = +(await page.getAttribute(V + '[data-k="m2"]', 'data-v'));
      await setVal(page, 'textarea[data-role="coords"]', hole);
      const holeArea = +(await page.getAttribute(V + '[data-k="m2"]', 'data-v'));
      await page.click(V + 'button:has-text("Example: Antarctica")'); await page.waitForTimeout(400);
      const a = +(await page.getAttribute(V + '[data-k="m2"]', 'data-v')), p = +(await page.getAttribute(V + '[data-k="perim"]', 'data-v'));
      await setVal(page, 'textarea[data-role="coords"]', '0, 0\n0, 90\n90, 0');
      const oct = +(await page.getAttribute(V + '[data-k="m2"]', 'data-v'));
      await pick(page, 'select[data-role="order"]', 'lonlat');
      await setVal(page, 'textarea[data-role="coords"]', '0 0\n90 0\n0 90');
      const oct2 = +(await page.getAttribute(V + '[data-k="m2"]', 'data-v'));
      const ok = Math.abs(a / 13662703680020.1 - 1) < 1e-8 && Math.abs(p - 16831067.893) < 0.01 && Math.abs(oct / 63758202715511.06 - 1) < 1e-9 &&
        Math.abs(oct2 - oct) < 1 && Math.abs(fieldArea - (outerArea - holeArea)) < 0.01 && holeArea > 0;
      return res(ok, `Antarctica ${a} m², ${p} m | octant ${oct} | field ${fieldArea} = ${outerArea} − ${holeArea}`);
    }
  },
  {
    name: 'polygon-area: GeoJSON import with a hole', tool: 'polygon-area',
    run: async (page) => {
      await ready(page, 'm2');
      const sq = (x0, y0, s) => [[x0, y0], [x0 + s, y0], [x0 + s, y0 + s], [x0, y0 + s], [x0, y0]];
      const gj = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [sq(-1.3, 51.7, 0.01), sq(-1.297, 51.703, 0.002)] } }] };
      const one = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [sq(-1.3, 51.7, 0.01)] } };
      await page.setInputFiles(V + 'input[type=file]', { name: 'plot.geojson', mimeType: 'application/geo+json', buffer: Buffer.from(JSON.stringify(one)) });
      await page.waitForTimeout(600);
      const full = +(await page.getAttribute(V + '[data-k="m2"]', 'data-v'));
      await page.setInputFiles(V + 'input[type=file]', { name: 'plot.geojson', mimeType: 'application/geo+json', buffer: Buffer.from(JSON.stringify(gj)) });
      await page.waitForTimeout(600);
      const holed = +(await page.getAttribute(V + '[data-k="m2"]', 'data-v')), verts = await k(page, 'verts');
      /* 0.01° × 0.01° at 51.7°N is about 1111 m × 689 m ≈ 76.6 ha; the hole is 1/25 of it. */
      return res(full > 7.6e5 && full < 7.7e5 && Math.abs(holed / full - 0.96) < 0.001 && verts === '8 (1 hole)', `${full} ${holed} ${verts}`);
    }
  },
  {
    name: 'geohash: u4pruydqqvj ⇄ 57.64911, 10.40744; ww8p1r4t8; wte; ezs42 = 42.605, -5.603; neighbours of dqcjq', tool: 'geohash',
    run: async (page) => {
      await ready(page, 'hash');
      const h = await k(page, 'hash'), c = await k(page, 'centre');
      await setVal(page, 'input[data-role="coord"]', '37.8324, 112.5584');
      await pick(page, 'select[data-role="prec"]', '9');
      const h2 = await k(page, 'hash');
      await setVal(page, 'input[data-role="coord"]', '32, 117');
      await pick(page, 'select[data-role="prec"]', '3');
      const h3 = await k(page, 'hash');
      await setVal(page, 'input[data-role="gh"]', 'ezs42');
      const c2 = await k(page, 'centre');
      await setVal(page, 'input[data-role="gh"]', 'dqcjq');
      const nb = await page.$$eval(V + '[data-role="neighbours"] div', ds => Object.fromEntries(ds.map(d => [d.dataset.dir, d.childNodes[1].textContent])));
      const want = { N: 'dqcjw', NE: 'dqcjx', E: 'dqcjr', SE: 'dqcjp', S: 'dqcjn', SW: 'dqcjj', W: 'dqcjm', NW: 'dqcjt' };
      const nbOk = Object.keys(want).every(d => nb[d] === want[d]);
      const bulk = await page.innerText(V + '[data-role="bulk-out"]');
      return res(h === 'u4pruydqqvj' && near(c, 57.64911, 10.40744, 5e-6) && h2 === 'ww8p1r4t8' && h3 === 'wte' && c2 === '42.605, -5.603' && nbOk &&
        /u4pruydqqvj,57\.6491\d+,10\.4074\d+/.test(bulk), [h, c, h2, h3, c2, JSON.stringify(nb)].join(' | '));
    }
  }
];
