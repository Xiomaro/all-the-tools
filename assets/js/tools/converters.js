/* Converters: unit converters (length to acceleration), currency, resolution,
   data sizes, aspect ratio, wind speed and the Beaufort scale, clothing sizes,
   and the real-world size tools (ruler, paper, ring, shoe, screens, countries,
   room planner). */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  /* --- shared styling ----------------------------------------------------- */

  var css = [
    '.g-conv .cv-table{width:100%;border-collapse:collapse}',
    '.g-conv .cv-table td{padding:6px 10px;border-bottom:1px solid var(--border)}',
    '.g-conv .cv-table td.v{font-family:var(--mono);text-align:right;cursor:pointer}',
    '.g-conv .cv-table td.v:hover{color:var(--accent)}',
    '.g-conv .cv-table tr.cur td{font-weight:700;background:var(--bg-sunken)}',
    '.g-conv .cv-big{font-size:1.8em;font-weight:700;margin:4px 0}',
    '.g-conv .cv-muted{color:var(--fg-muted)}',
    '.g-conv .cv-chip-row{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}',
    '.g-conv .cv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}',
    '.g-conv .cv-card{border:1px solid var(--border);border-radius:var(--radius);padding:8px 10px;background:var(--bg-elev)}',
    '.g-conv .cv-card b{display:block;font-size:1.25em}',
    '.g-conv .cv-card span{color:var(--fg-muted);font-size:.85em}',
    '.g-conv .cv-card.hl{border-color:var(--accent)}',
    '.g-conv .cv-warn{color:var(--err)}',
    '.g-conv .cv-ok{color:var(--ok)}',
    '.g-conv .cv-cal-card{height:54mm;border:2px dashed var(--accent);border-radius:10px;box-sizing:border-box;background:var(--bg-sunken);margin:8px 0;position:relative}',
    '.g-conv .cv-cal-card span{position:absolute;left:8px;top:6px;font-size:.8em;color:var(--fg-muted)}',
    '.g-conv .cv-scroll{overflow:auto;max-width:100%}',
    '.g-conv .cv-ruler{position:relative;user-select:none;touch-action:none;margin:30px 0 10px}',
    '.g-conv .cv-handle{position:absolute;top:-14px;width:22px;height:22px;margin-left:-11px;border-radius:50%;background:var(--accent);border:2px solid var(--bg);cursor:ew-resize;padding:0}',
    '.g-conv .cv-handle:focus{outline:3px solid var(--fg)}',
    '.g-conv .cv-paper{position:relative;border:1px solid var(--fg);background:#fff;box-sizing:border-box}',
    '.g-conv .cv-paper-cmp{position:absolute;left:0;top:0;border:2px dashed var(--accent);box-sizing:border-box;pointer-events:none}',
    '.g-conv .cv-paper-lbl{position:absolute;font-size:12px;color:#333;padding:2px 4px}',
    '.g-conv .cv-map{width:100%;touch-action:none;background:#cfe3f3;border-radius:var(--radius);display:block;cursor:grab}',
    '.g-conv .cv-map path.base{fill:#e9e5dc;stroke:#b8b2a6;stroke-width:.5}',
    '.g-conv .cv-map path.placed{fill-opacity:.65;stroke:#222;stroke-width:1;cursor:move}',
    '.g-conv .cv-sugg{list-style:none;padding:0;margin:4px 0;max-height:220px;overflow:auto}',
    '.g-conv .cv-sugg button{display:flex;justify-content:space-between;width:100%;text-align:left}',
    '.g-conv .cv-room svg{width:100%;height:auto;max-height:70vh;display:block;touch-action:none;background:var(--bg-sunken);border-radius:var(--radius)}',
    '.g-conv .cv-room svg:focus{outline:2px solid var(--accent)}',
    '.g-conv .cv-cat-items{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:6px}',
    '.g-conv .cv-cat-items button{text-align:left;display:flex;flex-direction:column;align-items:flex-start}',
    '.g-conv .cv-cat-items button small{color:var(--fg-muted)}',
    '.g-conv .cv-preview{border:2px solid var(--accent);background:var(--bg-sunken);display:flex;align-items:center;justify-content:center;color:var(--fg-muted);margin:8px auto;max-width:100%}',
    '.g-conv .cv-flex{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end}',
    '.g-conv .cv-table tr.cv-group td{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-muted);padding-top:14px}',
    '.g-conv table.data tr.cur td{background:var(--accent-weak);font-weight:600}',
    '.g-conv .cv-bf-chips .chip{min-width:2.4em}',
    '.g-conv .cv-bf-text{margin:6px 0}',
    '.g-conv .cv-bf-text b{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-muted)}',
    '.g-conv .cv-wide td{vertical-align:top}',
    '.g-conv .cv-wide td.long{min-width:220px;font-size:13px}'
  ].join('\n');
  document.head.appendChild(el('style', { text: css }));

  function box(root) { root.classList.add('g-conv'); return root; }
  function inp(field) { return field.querySelector ? (field.querySelector('input, select, textarea') || field) : field; }
  function num(v) { var n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : NaN; }
  function sig(v, p) { return String(parseFloat(v.toPrecision(p))); }
  function trimFixed(v, d) { return String(parseFloat(v.toFixed(d))); }
  function group(n, d) {
    return n.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }
  function store(key, value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem(key));
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { return null; }
  }
  function b64url(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64url(str) {
    var s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  function encodeState(obj) { return b64url(new TextEncoder().encode(JSON.stringify(obj))); }
  function decodeState(str) { return JSON.parse(new TextDecoder().decode(unb64url(str))); }
  function shareUrl(param, value, toolId) {
    var params = new URLSearchParams(location.search);
    params.set(param, value);
    return location.origin + location.pathname + '?' + params.toString() + '#/t/' + toolId;
  }
  /* Read a share parameter once, then drop it from the address bar. */
  function takeParam(param) {
    var params = new URLSearchParams(location.search);
    var v = params.get(param);
    if (v === null) return null;
    params.delete(param);
    var q = params.toString();
    try { history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash); } catch (e) { /* ignore */ }
    return v;
  }
  var HALF = { 0: '', 0.25: '¼', 0.5: '½', 0.75: '¾' };
  function withFraction(v, spaced) {
    var whole = Math.floor(v + 1e-9), frac = Math.round((v - whole) * 4) / 4;
    if (frac === 1) { whole++; frac = 0; }
    if (!frac) return String(whole);
    return (whole ? String(whole) : '') + (spaced && whole ? ' ' : '') + HALF[frac];
  }

  /* --- generic unit converters ------------------------------------------- */

  /* How each converter prints its values. */
  var FMT = {
    lengthLike: function (v) {
      var a = Math.abs(v);
      if (v === 0) return '0';
      if (Number.isInteger(v) && a < 1e16) return String(v);
      if (a >= 1e6) return v.toExponential(5);
      if (a < 1e-6) return v.toExponential(4);
      return sig(v, 6);
    },
    six: function (v) {
      var a = Math.abs(v);
      if (v === 0) return '0';
      if (a >= 1e6) return v.toExponential(5);
      return sig(v, 6);
    },
    plain6: function (v) { return v === 0 ? '0' : sig(v, 6); },
    seven: function (v) { return v === 0 ? '0' : sig(v, 7); },
    five: function (v) { return v === 0 ? '0' : sig(v, 5); },
    fixed2: function (v) { return v.toFixed(2); },
    bytes: function (v) {
      var a = Math.abs(v);
      if (v === 0) return '0';
      if (Number.isInteger(v) && a < 1e21) return String(v);
      if (a >= 1e5) return v.toExponential(4);
      return sig(v, 6);
    }
  };

  function linear(list) {
    return list.map(function (u) {
      return { key: u[0], label: u[1], short: u[3] || u[1], to: function (v) { return v * u[2]; }, from: function (v) { return v / u[2]; } };
    });
  }
  /* Units that are inversely proportional to the base (period and wavelength
     against frequency): value = k / (base × scale). */
  function reciprocal(list) {
    return list.map(function (u) {
      return { key: u[0], label: u[1], short: u[1], to: function (v) { return u[2] / (v * u[3]); }, from: function (b) { return u[2] / (b * u[3]); } };
    });
  }

  /* Exact by definition (NIST SP 811): the pound is 0.45359237 kg and
     standard gravity 9.80665 m/s², so a pound-force is their product. */
  var LBF = 0.45359237 * 9.80665;
  var FT3 = 0.028316846592, IN3 = 0.000016387064, USGAL = 0.003785411784, UKGAL = 0.00454609;
  var C_LIGHT = 299792458;

  /* key, label, bytes, group, and for the decimal byte units the power of
     1024 they mean when "KB = 1,024 bytes" (JEDEC, as Windows shows) is on. */
  var DATA_UNITS = [
    ['bit', 'Bit (b)', 0.125, 'bits'], ['kbit', 'Kilobit (kb)', 125, 'bits'], ['mbit', 'Megabit (Mb)', 125e3, 'bits'],
    ['gbit', 'Gigabit (Gb)', 125e6, 'bits'], ['tbit', 'Terabit (Tb)', 125e9, 'bits'],
    ['kibit', 'Kibibit (Kib)', 128, 'bits'], ['mibit', 'Mebibit (Mib)', 131072, 'bits'], ['gibit', 'Gibibit (Gib)', 134217728, 'bits'],
    ['nibble', 'Nibble (4 bits)', 0.5, 'bytes'], ['byte', 'Byte (B)', 1, 'bytes'],
    ['kb', 'Kilobyte (kB)', 1e3, 'si', 1], ['mb', 'Megabyte (MB)', 1e6, 'si', 2], ['gb_si', 'Gigabyte (GB)', 1e9, 'si', 3],
    ['tb', 'Terabyte (TB)', 1e12, 'si', 4], ['pb', 'Petabyte (PB)', 1e15, 'si', 5], ['eb', 'Exabyte (EB)', 1e18, 'si', 6],
    ['kib', 'Kibibyte (KiB)', 1024, 'iec'], ['mib', 'Mebibyte (MiB)', 1048576, 'iec'], ['gib', 'Gibibyte (GiB)', 1073741824, 'iec'],
    ['tib', 'Tebibyte (TiB)', 1099511627776, 'iec'], ['pib', 'Pebibyte (PiB)', 1125899906842624, 'iec'], ['eib', 'Exbibyte (EiB)', 1152921504606846976, 'iec']
  ];

  var CONVERTERS = [
    {
      id: 'length-converter', name: 'Length Converter',
      description: 'Convert lengths between metric, imperial, nautical and astronomical units.',
      keywords: ['meter', 'feet', 'inch', 'cm', 'mile', 'km', 'yard', 'light year', 'distance'],
      def: [1, 'm'], imp: [1, 'ft'], fmt: FMT.lengthLike, fromLabel: 'From Unit',
      units: linear([
        ['pm', 'Picometer (pm)', 1e-12, 'Picometer'], ['nm', 'Nanometer (nm)', 1e-9, 'Nanometer'],
        ['um', 'Micrometer (μm)', 1e-6, 'Micrometer'], ['mm', 'Millimeter (mm)', 1e-3, 'Millimeter'],
        ['cm', 'Centimeter (cm)', 1e-2, 'Centimeter'], ['dm', 'Decimeter (dm)', 0.1, 'Decimeter'],
        ['m', 'Meter (m)', 1, 'Meter'], ['km', 'Kilometer (km)', 1000, 'Kilometer'],
        ['in', 'Inch (in)', 0.0254, 'Inch'], ['ft', 'Foot (ft)', 0.3048, 'Foot'],
        ['yd', 'Yard (yd)', 0.9144, 'Yard'], ['mi', 'Mile (mi)', 1609.344, 'Mile'],
        ['nmi', 'Nautical Mile', 1852, 'Nautical Mile'],
        ['ly', 'Light Year (ly)', 9.4607304725808e15, 'Light Year'],
        ['au', 'Astronomical Unit (AU)', 149597870700, 'Astronomical Unit']
      ])
    },
    {
      id: 'weight-converter', name: 'Weight Converter',
      description: 'Convert weights between kilograms, pounds, ounces, stones, tons and carats.',
      keywords: ['kg', 'lbs', 'pound', 'ounce', 'stone', 'gram', 'ton', 'carat', 'mass'],
      def: [1, 'kg'], imp: [1, 'lb'], fmt: FMT.lengthLike, fromLabel: 'From Unit',
      units: linear([
        ['mg', 'Milligram (mg)', 1e-6], ['g', 'Gram (g)', 1e-3], ['kg', 'Kilogram (kg)', 1],
        ['t', 'Metric Ton (t)', 1000], ['oz', 'Ounce (oz)', 0.028349523125], ['lb', 'Pound (lb)', 0.45359237],
        ['st', 'Stone (st)', 6.35029318], ['ton_us', 'Short Ton (US)', 907.18474],
        ['ton_uk', 'Long Ton (UK)', 1016.0469088], ['ug', 'Microgram (μg)', 1e-9], ['ct', 'Carat (ct)', 0.0002]
      ])
    },
    {
      id: 'temperature-converter', name: 'Temperature Converter',
      description: 'Convert temperatures between Celsius, Fahrenheit, Kelvin and five historic scales.',
      keywords: ['celsius', 'fahrenheit', 'kelvin', 'rankine', 'degrees', 'weather', 'oven'],
      def: [100, 'celsius'], fahrenheit: [212, 'fahrenheit'], fmt: FMT.fixed2, fromLabel: 'From Unit', symbols: true,
      units: [
        { key: 'celsius', label: 'Celsius (°C)', short: 'Celsius', sym: '°C', to: function (v) { return v; }, from: function (c) { return c; } },
        { key: 'fahrenheit', label: 'Fahrenheit (°F)', short: 'Fahrenheit', sym: '°F', to: function (v) { return (v - 32) * 5 / 9; }, from: function (c) { return c * 9 / 5 + 32; } },
        { key: 'kelvin', label: 'Kelvin (K)', short: 'Kelvin', sym: 'K', to: function (v) { return v - 273.15; }, from: function (c) { return c + 273.15; } },
        { key: 'rankine', label: 'Rankine (°R)', short: 'Rankine', sym: '°R', to: function (v) { return (v - 491.67) * 5 / 9; }, from: function (c) { return (c + 273.15) * 9 / 5; } },
        { key: 'delisle', label: 'Delisle (°De)', short: 'Delisle', sym: '°De', to: function (v) { return 100 - v * 2 / 3; }, from: function (c) { return (100 - c) * 3 / 2; } },
        { key: 'newton', label: 'Newton (°N)', short: 'Newton', sym: '°N', to: function (v) { return v * 100 / 33; }, from: function (c) { return c * 33 / 100; } },
        { key: 'reaumur', label: 'Réaumur (°Ré)', short: 'Réaumur', sym: '°Ré', to: function (v) { return v * 5 / 4; }, from: function (c) { return c * 4 / 5; } },
        { key: 'romer', label: 'Rømer (°Rø)', short: 'Rømer', sym: '°Rø', to: function (v) { return (v - 7.5) * 40 / 21; }, from: function (c) { return c * 21 / 40 + 7.5; } }
      ],
      quick: [['Absolute Zero', -273.15], ['Water Freezes', 0], ['Body Temp', 37], ['Water Boils', 100], ['Room Temp', 22], ['Oven (Medium)', 180]]
    },
    {
      id: 'speed-converter', name: 'Speed Converter',
      description: 'Convert speeds between km/h, mph, m/s, knots, ft/s, Mach and the speed of light.',
      keywords: ['mph', 'kmh', 'km/h', 'knots', 'mach', 'velocity', 'm/s'],
      def: [100, 'kmh'], imp: [60, 'mph'], fmt: FMT.plain6, fromLabel: 'From Unit',
      units: linear([
        ['ms', 'Meter/Second (m/s)', 1], ['kmh', 'Kilometer/Hour (km/h)', 1 / 3.6], ['mph', 'Mile/Hour (mph)', 0.44704],
        ['kn', 'Knot (kn)', 1852 / 3600], ['fts', 'Foot/Second (ft/s)', 0.3048], ['mach', 'Mach (at sea level)', 340.29],
        ['c', 'Speed of Light (c)', 299792458]
      ])
    },
    {
      id: 'area-converter', name: 'Area Converter',
      description: 'Convert areas between square metres, hectares, acres, square feet and more.',
      keywords: ['square meter', 'acre', 'hectare', 'sq ft', 'square feet', 'land', 'm2'],
      def: [1, 'm2'], imp: [1, 'ft2'], fmt: FMT.seven, fromLabel: 'From',
      units: linear([
        ['m2', 'Square Meter (m²)', 1], ['km2', 'Square Kilometer (km²)', 1e6], ['cm2', 'Square Centimeter (cm²)', 1e-4],
        ['mm2', 'Square Millimeter (mm²)', 1e-6], ['ha', 'Hectare (ha)', 1e4], ['acre', 'Acre', 4046.8564224],
        ['ft2', 'Square Foot (ft²)', 0.09290304], ['yd2', 'Square Yard (yd²)', 0.83612736],
        ['in2', 'Square Inch (in²)', 0.00064516], ['mi2', 'Square Mile (mi²)', 2589988.110336]
      ])
    },
    {
      id: 'volume-converter', name: 'Volume Converter',
      description: 'Convert volumes between litres, millilitres, gallons, cups, spoons and cubic units.',
      keywords: ['liter', 'litre', 'gallon', 'cup', 'ml', 'fluid ounce', 'tablespoon', 'teaspoon', 'cooking'],
      def: [1, 'l'], imp: [1, 'gal_us'], impUK: [1, 'gal_uk'], fmt: FMT.plain6, fromLabel: 'From',
      units: linear([
        ['l', 'Liter (L)', 1], ['ml', 'Milliliter (mL)', 0.001], ['m3', 'Cubic Meter (m³)', 1000], ['cm3', 'Cubic Centimeter (cm³)', 0.001],
        ['gal_us', 'US Gallon', 3.785411784], ['gal_uk', 'UK Gallon', 4.54609], ['qt', 'US Quart', 0.946352946],
        ['pt', 'US Pint', 0.473176473], ['cup', 'US Cup', 0.236588], ['floz', 'Fluid Ounce (US)', 0.0295735295625],
        ['tbsp', 'Tablespoon', 0.01478676478125], ['tsp', 'Teaspoon', 0.00492892159375],
        ['ft3', 'Cubic Foot (ft³)', 28.316846592], ['in3', 'Cubic Inch (in³)', 0.016387064]
      ])
    },
    {
      id: 'pressure-converter', name: 'Pressure Converter',
      description: 'Convert pressures between pascals, bar, PSI, atmospheres, torr and inches of mercury.',
      keywords: ['psi', 'bar', 'pascal', 'atm', 'torr', 'mmhg', 'tyre pressure', 'kpa'],
      def: [1, 'atm'], fmt: FMT.plain6, fromLabel: 'From',
      units: linear([
        ['pa', 'Pascal (Pa)', 1], ['kpa', 'Kilopascal (kPa)', 1000], ['mpa', 'Megapascal (MPa)', 1e6], ['bar', 'Bar', 1e5],
        ['mbar', 'Millibar (mbar)', 100], ['atm', 'Atmosphere (atm)', 101325], ['psi', 'PSI (lb/in²)', 6894.757293168],
        ['torr', 'Torr (mmHg)', 133.322], ['inhg', 'Inches of Mercury (inHg)', 3386.39]
      ])
    },
    {
      id: 'energy-converter', name: 'Energy Converter',
      description: 'Convert energy between joules, calories, kilowatt-hours, BTU, electronvolts and more.',
      keywords: ['joule', 'calorie', 'kcal', 'kwh', 'btu', 'electronvolt', 'erg', 'energy'],
      def: [1, 'kcal'], fmt: FMT.six, fromLabel: 'From',
      units: linear([
        ['j', 'Joule (J)', 1], ['kj', 'Kilojoule (kJ)', 1000], ['cal', 'Calorie (cal)', 4.184], ['kcal', 'Kilocalorie (kcal)', 4184],
        ['wh', 'Watt-hour (Wh)', 3600], ['kwh', 'Kilowatt-hour (kWh)', 3.6e6], ['btu', 'BTU', 1055.06],
        ['erg', 'Erg', 1e-7], ['ev', 'Electronvolt (eV)', 1.602176634e-19], ['ftlb', 'Foot-pound (ft·lb)', 1.3558179483314]
      ])
    },
    {
      id: 'power-converter', name: 'Power Converter',
      description: 'Convert power between watts, kilowatts, horsepower, BTU/hour and dBm.',
      keywords: ['watt', 'kw', 'horsepower', 'hp', 'btu/hr', 'dbm', 'power'],
      def: [1, 'kw'], fmt: FMT.six, fromLabel: 'From',
      units: linear([
        ['w', 'Watt (W)', 1], ['kw', 'Kilowatt (kW)', 1000], ['mw', 'Megawatt (MW)', 1e6],
        ['hp_m', 'Horsepower (metric)', 735.49875], ['hp_i', 'Horsepower (imperial)', 745.69987158227],
        ['btuh', 'BTU/hour', 0.29307107017], ['kcalh', 'kcal/hour', 4184 / 3600], ['ftlbs', 'Foot-pound/second', 1.3558179483314]
      ]).concat([{
        key: 'dbm', label: 'dBm (milliwatts)', short: 'dBm (milliwatts)',
        to: function (v) { return Math.pow(10, v / 10) / 1000; },
        from: function (w) { return w > 0 ? 10 * Math.log10(w * 1000) : -Infinity; }
      }])
    },
    {
      id: 'angle-converter', name: 'Angle Converter',
      description: 'Convert angles between degrees, radians, gradians, turns, arc minutes, arc seconds and mils.',
      keywords: ['degrees', 'radians', 'gradians', 'turn', 'arcminute', 'mil', 'angle'],
      def: [90, 'deg'], fmt: FMT.seven, fromLabel: 'From',
      units: linear([
        ['deg', 'Degree (°)', 1], ['rad', 'Radian (rad)', 180 / Math.PI], ['grad', 'Gradian (grad)', 0.9], ['turn', 'Turn (rev)', 360],
        ['arcmin', 'Arc Minute (′)', 1 / 60], ['arcsec', 'Arc Second (″)', 1 / 3600], ['mil', 'Mil (NATO)', 360 / 6400]
      ]),
      notes: ['90° = π/2 rad', '180° = π rad', '360° = 2π rad', '1 rad ≈ 57.296°']
    },
    {
      id: 'fuel-converter', name: 'Fuel Economy Converter',
      description: 'Convert fuel economy between MPG (US and UK), L/100km, km/L and miles per litre.',
      keywords: ['mpg', 'l/100km', 'km/l', 'fuel economy', 'consumption', 'car'],
      def: [10, 'l100km'], imp: [30, 'mpg_us'], impUK: [40, 'mpg_uk'], fmt: FMT.five, fromLabel: 'From',
      units: [
        { key: 'kml', label: 'Km per Liter (km/L)', to: function (v) { return v; }, from: function (k) { return k; } },
        { key: 'mpg_us', label: 'MPG (US)', to: function (v) { return v * 1.609344 / 3.785411784; }, from: function (k) { return k * 3.785411784 / 1.609344; } },
        { key: 'mpg_uk', label: 'MPG (UK)', to: function (v) { return v * 1.609344 / 4.54609; }, from: function (k) { return k * 4.54609 / 1.609344; } },
        { key: 'l100km', label: 'Liters per 100km (L/100km)', to: function (v) { return 100 / v; }, from: function (k) { return 100 / k; } },
        { key: 'mpl', label: 'Miles per Liter', to: function (v) { return v * 1.609344; }, from: function (k) { return k / 1.609344; } }
      ],
      notes: ['Note: Higher MPG / km/L = better fuel efficiency. Lower L/100km = better.']
    },
    {
      id: 'time-duration-converter', name: 'Time Duration Converter',
      description: 'Convert durations between milliseconds, seconds, minutes, hours, days, weeks, months and years.',
      keywords: ['seconds', 'minutes', 'hours', 'days', 'weeks', 'years', 'duration', 'time'],
      def: [1, 'hr'], fmt: FMT.six, fromLabel: 'From',
      units: linear([
        ['ms', 'Milliseconds (ms)', 0.001], ['s', 'Seconds (s)', 1], ['min', 'Minutes (min)', 60], ['hr', 'Hours (hr)', 3600],
        ['day', 'Days', 86400], ['week', 'Weeks', 604800], ['month', 'Months (avg 30.44d)', 30.436875 * 86400],
        ['year', 'Years (365.25d)', 365.25 * 86400], ['decade', 'Decades', 3652.5 * 86400], ['century', 'Centuries', 36525 * 86400]
      ])
    },
    {
      id: 'force-converter', name: 'Force Converter',
      description: 'Convert forces between newtons, kilonewtons, dynes, kilogram-force, pound-force, poundals, kips and tonne-force.',
      keywords: ['newton', 'kilonewton', 'kn', 'dyne', 'kgf', 'kilogram force', 'kilopond', 'lbf', 'pound force', 'ounce force', 'poundal', 'kip', 'tonne force', 'ton force', 'thrust', 'load', 'weight force'],
      def: [1, 'kn'], fmt: FMT.lengthLike, fromLabel: 'From Unit',
      units: linear([
        ['n', 'Newton (N)', 1], ['kn', 'Kilonewton (kN)', 1e3], ['MN', 'Meganewton (MN)', 1e6], ['dyn', 'Dyne (dyn)', 1e-5],
        ['gf', 'Gram-force (gf)', 9.80665e-3], ['kgf', 'Kilogram-force (kgf)', 9.80665], ['tf', 'Tonne-force (tf)', 9806.65],
        ['ozf', 'Ounce-force (ozf)', LBF / 16], ['lbf', 'Pound-force (lbf)', LBF], ['pdl', 'Poundal (pdl)', 0.3048 * 0.45359237],
        ['kip', 'Kip (1,000 lbf)', LBF * 1000], ['tonf_uk', 'Ton-force, long (UK)', LBF * 2240], ['tonf_us', 'Ton-force, short (US)', LBF * 2000]
      ]),
      notes: ['1 kgf = 9.80665 N and 1 lbf = 4.4482216152605 N exactly (standard gravity × the kilogram or pound). A poundal is the force that accelerates 1 lb at 1 ft/s².']
    },
    {
      id: 'torque-converter', name: 'Torque Converter',
      description: 'Convert torque between newton metres, kilogram-force metres, pound-force feet and inches, ounce-force inches and dyne centimetres.',
      keywords: ['torque', 'newton metre', 'newton meter', 'nm', 'n·m', 'lb ft', 'ft lb', 'foot pound', 'lbf ft', 'inch pound', 'lbf in', 'kgf m', 'kgf cm', 'ozf in', 'torque wrench', 'wheel nut', 'moment'],
      def: [1, 'nm'], fmt: FMT.lengthLike, fromLabel: 'From Unit',
      units: linear([
        ['nm', 'Newton metre (N·m)', 1], ['knm', 'Kilonewton metre (kN·m)', 1e3], ['ncm', 'Newton centimetre (N·cm)', 0.01], ['nmm', 'Newton millimetre (N·mm)', 0.001],
        ['kgfm', 'Kilogram-force metre (kgf·m)', 9.80665], ['kgfcm', 'Kilogram-force centimetre (kgf·cm)', 0.0980665],
        ['lbfft', 'Pound-force foot (lbf·ft)', LBF * 0.3048], ['lbfin', 'Pound-force inch (lbf·in)', LBF * 0.0254],
        ['ozfin', 'Ounce-force inch (ozf·in)', LBF / 16 * 0.0254], ['dyncm', 'Dyne centimetre (dyn·cm)', 1e-7]
      ]),
      notes: ['Torque and energy share the unit N·m but are different things; use this for bolts, torque wrenches, engines and motors.']
    },
    {
      id: 'density-converter', name: 'Density Converter',
      description: 'Convert densities between kg/m³, g/cm³, g/mL, kg/L, lb/ft³, lb/in³, pounds per US and UK gallon, oz/in³ and slug/ft³.',
      keywords: ['density', 'mass density', 'specific gravity', 'kg/m3', 'g/cm3', 'g/ml', 'kg/l', 'lb/ft3', 'lb/in3', 'lb/gal', 'pounds per gallon', 'slug', 'concentration'],
      def: [1, 'gcm3'], fmt: FMT.lengthLike, fromLabel: 'From Unit',
      units: linear([
        ['kgm3', 'Kilogram per cubic metre (kg/m³)', 1], ['gcm3', 'Gram per cubic centimetre (g/cm³)', 1000], ['gml', 'Gram per millilitre (g/mL)', 1000],
        ['kgl', 'Kilogram per litre (kg/L)', 1000], ['gl', 'Gram per litre (g/L)', 1], ['tm3', 'Tonne per cubic metre (t/m³)', 1000],
        ['lbft3', 'Pound per cubic foot (lb/ft³)', 0.45359237 / FT3], ['lbin3', 'Pound per cubic inch (lb/in³)', 0.45359237 / IN3],
        ['lbgal_us', 'Pound per US gallon (lb/gal)', 0.45359237 / USGAL], ['lbgal_uk', 'Pound per UK gallon (lb/gal)', 0.45359237 / UKGAL],
        ['ozin3', 'Ounce per cubic inch (oz/in³)', 0.028349523125 / IN3], ['slugft3', 'Slug per cubic foot (slug/ft³)', LBF / 0.3048 / FT3]
      ]),
      notes: ['For reference: water is about 1,000 kg/m³, air about 1.2 kg/m³ at sea level, and steel about 7,850 kg/m³. Specific gravity is the density in g/cm³.']
    },
    {
      id: 'flow-rate-converter', name: 'Flow Rate Converter',
      description: 'Convert volumetric flow between m³/s, m³/h, litres per second, minute or hour, CFM, US and UK gallons per minute or hour, and barrels per day.',
      keywords: ['flow rate', 'volumetric flow', 'l/min', 'litres per minute', 'liters per minute', 'gpm', 'gallons per minute', 'cfm', 'cubic feet per minute', 'm3/h', 'bbl/d', 'barrels per day', 'pump', 'shower flow', 'discharge'],
      def: [10, 'lmin'], fmt: FMT.lengthLike, fromLabel: 'From Unit',
      units: linear([
        ['m3s', 'Cubic metre per second (m³/s)', 1], ['m3h', 'Cubic metre per hour (m³/h)', 1 / 3600],
        ['ls', 'Litre per second (L/s)', 1e-3], ['lmin', 'Litre per minute (L/min)', 1e-3 / 60], ['lh', 'Litre per hour (L/h)', 1e-3 / 3600],
        ['mlmin', 'Millilitre per minute (mL/min)', 1e-6 / 60], ['cfm', 'Cubic foot per minute (CFM)', FT3 / 60], ['cfs', 'Cubic foot per second (ft³/s)', FT3],
        ['usgpm', 'US gallon per minute (gpm)', USGAL / 60], ['ukgpm', 'UK gallon per minute', UKGAL / 60],
        ['usgph', 'US gallon per hour', USGAL / 3600], ['ukgph', 'UK gallon per hour', UKGAL / 3600],
        ['bbld', 'Barrel of oil per day (bbl/d)', 42 * USGAL / 86400]
      ]),
      notes: ['A UK gallon is 4.54609 L and a US gallon 3.785411784 L. An oil barrel is 42 US gallons (158.987 L).']
    },
    {
      id: 'frequency-converter', name: 'Frequency Converter',
      description: 'Convert frequencies between Hz, kHz, MHz, GHz, THz, rpm, rad/s and degrees per second, with the matching period and wavelength.',
      keywords: ['frequency', 'hertz', 'hz', 'khz', 'mhz', 'ghz', 'rpm', 'revolutions per minute', 'rad/s', 'angular velocity', 'period', 'wavelength', 'cycle', 'radio'],
      def: [50, 'hz'], fmt: FMT.lengthLike, fromLabel: 'From Unit',
      units: linear([
        ['hz', 'Hertz (Hz)', 1], ['khz', 'Kilohertz (kHz)', 1e3], ['mhz', 'Megahertz (MHz)', 1e6], ['ghz', 'Gigahertz (GHz)', 1e9], ['thz', 'Terahertz (THz)', 1e12],
        ['rpm', 'Revolutions per minute (rpm)', 1 / 60], ['rads', 'Radians per second (rad/s)', 1 / (2 * Math.PI)], ['degs', 'Degrees per second (°/s)', 1 / 360]
      ]).concat(reciprocal([
        ['period_s', 'Period (s)', 1, 1], ['period_ms', 'Period (ms)', 1, 1e-3], ['period_us', 'Period (µs)', 1, 1e-6], ['period_ns', 'Period (ns)', 1, 1e-9],
        ['wl_km', 'Wavelength in vacuum (km)', C_LIGHT, 1e3], ['wl_m', 'Wavelength in vacuum (m)', C_LIGHT, 1],
        ['wl_cm', 'Wavelength in vacuum (cm)', C_LIGHT, 1e-2], ['wl_nm', 'Wavelength in vacuum (nm)', C_LIGHT, 1e-9]
      ])),
      notes: ['Period = 1 ÷ frequency. Wavelength = c ÷ frequency, with the speed of light c = 299,792,458 m/s exactly (slightly shorter in air, cable or water). UK mains electricity is 50 Hz.']
    },
    {
      id: 'acceleration-converter', name: 'Acceleration Converter',
      description: 'Convert acceleration between m/s², gal, ft/s², in/s², standard gravity (g), km/h per second, mph per second and knots per second.',
      keywords: ['acceleration', 'm/s2', 'm/s²', 'g force', 'g-force', 'standard gravity', 'gal', 'galileo', 'ft/s2', '0-60', '0 to 60', 'mph per second', 'deceleration'],
      def: [1, 'g'], fmt: FMT.lengthLike, fromLabel: 'From Unit',
      units: linear([
        ['ms2', 'Metre per second squared (m/s²)', 1], ['gal', 'Gal (cm/s²)', 0.01], ['mgal', 'Milligal (mGal)', 1e-5],
        ['fts2', 'Foot per second squared (ft/s²)', 0.3048], ['ins2', 'Inch per second squared (in/s²)', 0.0254], ['g', 'Standard gravity (g)', 9.80665],
        ['kmhs', 'Kilometre per hour per second (km/h/s)', 1 / 3.6], ['mphs', 'Mile per hour per second (mph/s)', 0.44704], ['kns', 'Knot per second (kn/s)', 1852 / 3600]
      ]),
      notes: ['Standard gravity is 9.80665 m/s² exactly. A car doing 0 to 60 mph in 6 seconds averages 10 mph/s, about 0.46 g.']
    }
  ];

  /* The starting value and unit follow the regional settings: `imp` for
     imperial (`impUK` where British gallons differ from US ones) and
     `fahrenheit` for the temperature scale. */
  function startFor(cfg) {
    var r = window.Region ? Region.get() : null;
    if (!r) return cfg.def;
    if (cfg.fahrenheit) return r.temperature === 'F' ? cfg.fahrenheit : cfg.def;
    if (r.units !== 'imperial' || !cfg.imp) return cfg.def;
    return r.country === 'GB' && cfg.impUK ? cfg.impUK : cfg.imp;
  }

  function converterTool(cfg) {
    Tools.register({
      id: cfg.id, category: 'converters', name: cfg.name, description: cfg.description, keywords: cfg.keywords,
      render: function (root) {
        box(root);
        var start = startFor(cfg);
        var value = U.input({ label: 'Value', type: 'number', value: String(start[0]), step: 'any', dataset: { role: 'value' } });
        var from = U.select({ label: cfg.fromLabel, dataset: { role: 'from' },
          options: cfg.units.map(function (u) { return { value: u.key, label: u.label }; }), value: start[1] });
        var tbody = el('tbody');
        var status = U.note('');

        function run() {
          var v = num(inp(value).value);
          var unit = cfg.units.filter(function (u) { return u.key === inp(from).value; })[0];
          tbody.replaceChildren();
          status.textContent = '';
          if (!isFinite(v)) { status.textContent = 'Enter a number to convert.'; return; }
          var base = unit.to(v);
          cfg.units.forEach(function (u) {
            var out = u.from(base);
            var text = isFinite(out) ? cfg.fmt(out) : '—';
            var cell = el('td', { class: 'v', title: 'Click to copy', text: text + (cfg.symbols ? ' ' + u.sym : ''),
              onclick: function () { U.copy(text); } });
            tbody.appendChild(el('tr', { class: u.key === unit.key ? 'cur' : '', dataset: { unit: u.key } },
              el('td', { text: u.short || u.label }), cell));
          });
        }
        U.live([value, from], run);

        root.appendChild(U.panel(null, U.row(value, from),
          U.btnrow(U.copyBtn('Copy all', function () {
            return Array.prototype.map.call(tbody.children, function (tr) { return tr.children[0].textContent + ': ' + tr.children[1].textContent; }).join('\n');
          }))));
        root.appendChild(U.panel('Results', el('table', { class: 'cv-table', dataset: { role: 'results' } }, tbody), status));
        if (cfg.quick) {
          var inF = start[1] === 'fahrenheit';
          root.appendChild(U.panel('Quick Reference', el('div', { class: 'cv-grid' }, cfg.quick.map(function (q) {
            var t = inF ? +(q[1] * 9 / 5 + 32).toFixed(2) : q[1];
            return el('button', { class: 'cv-card', type: 'button', title: 'Use this temperature', onclick: function () {
              inp(value).value = t; inp(from).value = inF ? 'fahrenheit' : 'celsius'; run();
            } }, el('span', { text: q[0] }), el('b', { text: t + (inF ? '°F' : '°C') }));
          }))));
        }
        if (cfg.notes) root.appendChild(U.panel(null, cfg.notes.map(function (n) { return U.note(n); })));
      }
    });
  }
  CONVERTERS.forEach(converterTool);

  /* --- currency ------------------------------------------------------------ */

  var CURRENCIES = [
    ['USD', 'US Dollar', '$', 1], ['EUR', 'Euro', '€', 0.92], ['GBP', 'British Pound', '£', 0.79],
    ['JPY', 'Japanese Yen', '¥', 149.5], ['CNY', 'Chinese Yuan', 'CN¥', 7.24], ['INR', 'Indian Rupee', '₹', 83.1],
    ['CAD', 'Canadian Dollar', 'CA$', 1.36], ['AUD', 'Australian Dollar', 'A$', 1.53], ['CHF', 'Swiss Franc', 'CHF ', 0.90],
    ['KRW', 'South Korean Won', '₩', 1330], ['MXN', 'Mexican Peso', 'MX$', 17.1], ['BRL', 'Brazilian Real', 'R$', 4.97],
    ['SGD', 'Singapore Dollar', 'S$', 1.34], ['HKD', 'Hong Kong Dollar', 'HK$', 7.82], ['NOK', 'Norwegian Krone', 'kr ', 10.6],
    ['SEK', 'Swedish Krona', 'kr ', 10.5], ['DKK', 'Danish Krone', 'kr ', 6.87], ['NZD', 'New Zealand Dollar', 'NZ$', 1.64],
    ['ZAR', 'South African Rand', 'R ', 18.6], ['AED', 'UAE Dirham', 'AED ', 3.6725], ['SAR', 'Saudi Riyal', 'SAR ', 3.75],
    ['TRY', 'Turkish Lira', '₺', 30.5], ['RUB', 'Russian Ruble', '₽', 91], ['PLN', 'Polish Zloty', 'zł ', 3.98],
    ['THB', 'Thai Baht', '฿', 35.5], ['NGN', 'Nigerian Naira', '₦', 1550], ['PHP', 'Philippine Peso', '₱', 57],
    ['PKR', 'Pakistani Rupee', 'Rs ', 280]
  ];

  Tools.register({
    id: 'currency-converter', category: 'converters', name: 'Currency Converter',
    description: 'Convert between 28 world currencies with built-in reference rates, or fetch live rates on demand.',
    keywords: ['exchange rate', 'forex', 'usd', 'eur', 'gbp', 'money', 'fx'],
    render: function (root) {
      box(root);
      var rates = {};
      CURRENCIES.forEach(function (c) { rates[c[0]] = c[3]; });
      var source = 'reference';
      var opts = CURRENCIES.map(function (c) { return { value: c[0], label: c[0] + ' — ' + c[1] }; });
      var amount = U.input({ label: 'Amount', type: 'number', value: '100', step: 'any', dataset: { role: 'amount' } });
      /* Once a country is chosen, start from US dollars into its currency
         (or dollars into euros for the US). */
      var mine = window.Region && Region.isSet() ? Region.get().currency : null;
      if (!rates[mine] || mine === 'USD') mine = 'EUR';
      var from = U.select({ label: 'From', options: opts, value: 'USD', dataset: { role: 'from' } });
      var to = U.select({ label: 'To', options: opts, value: mine, dataset: { role: 'to' } });
      var head = el('div', { class: 'cv-muted' });
      var big = el('div', { class: 'cv-big', dataset: { role: 'result' } });
      var sub = el('div', { class: 'cv-muted' });
      var line = el('div', { class: 'mono', dataset: { role: 'rate' } });
      var tbody = el('tbody');
      var srcNote = U.note('Rates are approximate reference values. For live rates use a financial service.');
      var prog = U.progress();

      function info(code) { return CURRENCIES.filter(function (c) { return c[0] === code; })[0]; }
      function run() {
        var a = num(inp(amount).value);
        var f = inp(from).value, t = inp(to).value;
        tbody.replaceChildren();
        if (!isFinite(a)) { head.textContent = ''; big.textContent = 'Enter an amount'; sub.textContent = ''; line.textContent = ''; return; }
        var rate = rates[t] / rates[f];
        head.textContent = trimFixed(a, 6) + ' ' + f + ' =';
        big.textContent = info(t)[2] + group(a * rate, 2);
        sub.textContent = t + ' — ' + info(t)[1];
        line.textContent = '1 ' + f + ' = ' + rate.toFixed(4) + ' ' + t;
        CURRENCIES.forEach(function (c) {
          var v = (a * rates[c[0]] / rates[f]).toFixed(2);
          tbody.appendChild(el('tr', { class: c[0] === t ? 'cur' : '', dataset: { code: c[0] } },
            el('td', { text: c[0] }), el('td', { class: 'cv-muted', text: c[1] }),
            el('td', { class: 'v', text: v, title: 'Click to copy', onclick: function () { U.copy(v); } })));
        });
      }
      U.live([amount, from, to], run);

      function useLive() {
        prog.set('Fetching live rates…');
        fetch('https://open.er-api.com/v6/latest/USD').then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        }).then(function (data) {
          if (!data || !data.rates) throw new Error('Unexpected response');
          CURRENCIES.forEach(function (c) { if (data.rates[c[0]]) rates[c[0]] = data.rates[c[0]]; });
          source = 'live';
          var when = data.time_last_update_utc ? ' (updated ' + data.time_last_update_utc.replace(/ \+0000$/, ' UTC') + ')' : '';
          srcNote.textContent = 'Live rates from open.er-api.com' + when + '.';
          prog.done('Live rates loaded');
          run();
        }).catch(function (err) {
          prog.fail('Could not fetch live rates (' + (err.message || err) + '). Still using the built-in reference rates.');
        });
      }
      function useReference() {
        CURRENCIES.forEach(function (c) { rates[c[0]] = c[3]; });
        source = 'reference';
        srcNote.textContent = 'Using built-in reference rates (offline). Rates are approximate reference values.';
        prog.set('');
        run();
      }

      root.appendChild(U.panel(null, srcNote,
        U.row(amount, from, U.button('⇄ Swap', function () {
          var t = inp(from).value; inp(from).value = inp(to).value; inp(to).value = t; run();
        }, 'ghost'), to),
        el('div', { style: { marginTop: '12px' } }, head, big, sub, line),
        U.btnrow(U.copyBtn('Copy result', function () { return head.textContent + ' ' + big.textContent + ' (' + inp(to).value + ')'; }),
          U.button('Fetch live rates', useLive), U.button('Use reference rates', useReference, 'ghost')),
        prog));
      root.appendChild(U.panel('All currencies', el('table', { class: 'cv-table', dataset: { role: 'all' } }, tbody)));
      root.dataset.source = source;
    }
  });

  /* --- image resolution ------------------------------------------------------ */

  Tools.register({
    id: 'resolution-converter', category: 'converters', name: 'Image Resolution Converter',
    description: 'Convert between pixels, DPI/PPI, inches and centimetres for print and screen.',
    keywords: ['dpi', 'ppi', 'pixels', 'print size', 'inches', 'resolution', 'cm'],
    render: function (root) {
      box(root);
      var px = U.input({ label: 'Pixels (px)', type: 'number', value: '1920', step: 'any', dataset: { role: 'px' } });
      var dpi = U.input({ label: 'DPI / PPI', type: 'number', value: '96', step: 'any', dataset: { role: 'dpi' } });
      var inch = U.input({ label: 'Inches (in)', type: 'number', value: '20', step: 'any', dataset: { role: 'in' } });
      var cm = U.input({ label: 'Centimeters (cm)', type: 'number', value: '50.8', step: 'any', dataset: { role: 'cm' } });
      var mode = 'px';
      var modes = U.chips([{ value: 'px', label: 'px + DPI → inches/cm' }, { value: 'in', label: 'inches + DPI → px' }], function (m) { mode = m; calc(); }, 'px');
      var result = el('div', { dataset: { role: 'result' } });

      function calc(changed) {
        var p = num(inp(px).value), d = num(inp(dpi).value), i = num(inp(inch).value), c = num(inp(cm).value);
        if (changed === 'cm' && isFinite(c)) { i = c / 2.54; inp(inch).value = trimFixed(i, 4); }
        if (changed === 'in' && isFinite(i)) { c = i * 2.54; inp(cm).value = trimFixed(c, 4); }
        if (!(d > 0)) { result.replaceChildren(U.note('Enter a DPI above zero.', 'err')); return; }
        if (mode === 'px' || changed === 'px') {
          if (isFinite(p)) { i = p / d; c = i * 2.54; inp(inch).value = trimFixed(i, 4); inp(cm).value = trimFixed(c, 4); }
        } else if (isFinite(i)) {
          p = Math.round(i * d); inp(px).value = p;
        }
        result.replaceChildren(U.stats([
          { label: 'Pixels per cm', value: (d / 2.54).toFixed(2) + ' px/cm' },
          { label: 'Physical size at ' + trimFixed(d, 2) + ' DPI', value: isFinite(i) ? i.toFixed(2) + '"' : '—' },
          { label: 'Pixels at ' + trimFixed(d, 2) + ' DPI for ' + (isFinite(i) ? trimFixed(i, 2) : '?') + '"', value: isFinite(i) ? Math.round(i * d) + 'px' : '—' },
          { label: 'Size in cm', value: isFinite(c) ? c.toFixed(2) + ' cm' : '—' }
        ]));
      }
      [['px', px], ['dpi', dpi], ['in', inch], ['cm', cm]].forEach(function (pair) {
        inp(pair[1]).addEventListener('input', function () { calc(pair[0] === 'dpi' ? null : pair[0]); });
      });
      calc();

      root.appendChild(U.panel(null, modes, U.row(px, dpi, inch, cm), result));
      root.appendChild(U.panel('Common DPI Standards', U.table(['Use', 'DPI'], [
        ['Screen (web)', '72-96 DPI'], ['Print (min)', '150 DPI'], ['Print (good)', '300 DPI'],
        ['Print (best)', '600 DPI'], ['Retina display', '227+ DPI'], ['Photo print', '300 DPI']
      ])));
    }
  });

  /* --- byte / bit -------------------------------------------------------------- */

  /* Three significant figures, the way file managers print sizes. */
  function shortSize(bytes, k, names) {
    var i = 0, v = bytes;
    while (v >= k && i < names.length - 1) { v /= k; i++; }
    return (i === 0 ? String(Math.round(v)) : sig(v, 3)) + ' ' + names[i];
  }
  var DATA_GROUPS = [['bytes', 'Bytes'], ['si', 'Decimal units (powers of 1,000)'], ['iec', 'Binary units (powers of 1,024)'], ['bits', 'Bits']];

  Tools.register({
    id: 'byte-converter', category: 'converters', name: 'Data Size Converter',
    description: 'Convert a data size between bits, bytes and every decimal (kB, MB, GB) and binary (KiB, MiB, GiB) unit at once, and see why a 1 TB drive shows as 931 GB.',
    keywords: ['bit', 'byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte', 'petabyte', 'kibibyte', 'mebibyte', 'gibibyte', 'tebibyte', 'binary', 'decimal',
      'data size', 'data storage converter', 'file size calculator', 'file size', 'storage', 'kb', 'mb', 'gb', 'tb', 'kib', 'mib', 'gib', 'megabit', 'gigabit',
      'mbps', 'jedec', 'hard drive size', 'why does my drive show less', 'converter'],
    render: function (root) {
      box(root);
      var value = U.input({ label: 'Value', type: 'number', value: '1', min: '0', step: 'any', dataset: { role: 'value' } });
      var from = U.select({ label: 'From Unit', dataset: { role: 'from' }, value: 'gb_si',
        options: DATA_UNITS.map(function (u) { return { value: u[0], label: u[1] }; }) });
      var jedec = U.checkbox('Read KB, MB, GB… as 1,024-based (JEDEC, as Windows and memory makers do)');
      jedec.input.dataset.role = 'jedec';
      var bits = el('div', { class: 'cv-big', dataset: { role: 'bits' } });
      var shows = el('p', { class: 'cv-muted', dataset: { role: 'shows' } });
      var facts = el('p', { class: 'cv-muted', dataset: { role: 'facts' } });
      var tbody = el('tbody');

      /* With the JEDEC box ticked the decimal-prefixed byte units take their
         old binary meaning (1 KB = 1,024 B); everything else is unchanged. */
      function units() {
        var bin = jedec.input.checked;
        return DATA_UNITS.map(function (u) {
          var bytes = bin && u[4] ? Math.pow(1024, u[4]) : u[2];
          var label = bin && u[4] ? u[1].replace(/\((\w+)\)/, function (m, s) { return '(' + s.toUpperCase() + ', ' + group(bytes) + ' B)'; }) : u[1];
          return { key: u[0], label: label, group: u[3], bytes: bytes };
        });
      }
      function run() {
        var list = units(), key = inp(from).value;
        var unit = list.filter(function (u) { return u.key === key; })[0];
        var v = num(inp(value).value);
        tbody.replaceChildren();
        if (!isFinite(v) || v < 0) { bits.textContent = 'Enter a size of zero or more.'; shows.textContent = ''; return; }
        var base = v * unit.bytes;
        bits.textContent = '= ' + FMT.bytes(base * 8) + ' bits';
        shows.textContent = 'Windows File Explorer shows this as about ' + shortSize(base, 1024, ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB']) +
          '; macOS Finder and drive makers show about ' + shortSize(base, 1000, ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB']) + '.';
        DATA_GROUPS.forEach(function (g) {
          tbody.appendChild(el('tr', { class: 'cv-group' }, el('td', { colSpan: 2, text: g[1] })));
          list.filter(function (u) { return u.group === g[0]; }).forEach(function (u) {
            var t = FMT.bytes(base / u.bytes);
            tbody.appendChild(el('tr', { class: u.key === unit.key ? 'cur' : '', dataset: { unit: u.key } },
              el('td', { text: u.label + (u.key === unit.key ? ' ←' : '') }),
              el('td', { class: 'v', text: t, title: 'Click to copy', onclick: function () { U.copy(t); } })));
          });
        });
        var k = jedec.input.checked ? 1024 : 1000;
        facts.textContent = '1 byte = 8 bits · 1 ' + (k === 1024 ? 'KB' : 'kB') + ' = ' + group(k) + ' bytes · 1 MB = ' + group(Math.pow(k, 2)) +
          ' bytes · 1 GB = ' + group(Math.pow(k, 3)) + ' bytes · 1 KiB = 1,024 bytes · 1 GiB = 1,073,741,824 bytes · 1 TB = ' + group(k) + ' GB.';
      }
      U.live([value, from, jedec], run);
      root.appendChild(U.panel(null, U.row(value, from), jedec, bits, shows));
      root.appendChild(U.panel(null, el('table', { class: 'cv-table', dataset: { role: 'results' } },
        el('thead', el('tr', el('th', { text: 'Unit' }), el('th', { text: 'Value' }))), tbody), facts,
        U.note('Drive makers and macOS count in powers of 1,000, so a "1 TB" drive holds 1,000,000,000,000 bytes. Windows divides by 1,024 but still writes GB, so the same drive appears as 931 GB. Network speeds are in bits: 100 Mb/s moves 12.5 MB each second.')));
    }
  });

  /* --- aspect ratio --------------------------------------------------------------- */

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a || 1; }

  Tools.register({
    id: 'aspect-ratio-calc', category: 'converters', name: 'Aspect Ratio Calculator',
    description: 'Find the aspect ratio of any size, scale it proportionally, and list common sizes.',
    keywords: ['16:9', 'aspect', 'ratio', 'resize', 'proportion', 'dimensions', 'video', 'screen'],
    render: function (root) {
      box(root);
      var PRESETS = [['16:9', 1920, 1080], ['4:3', 1440, 1080], ['1:1', 1080, 1080], ['21:9', 2520, 1080],
        ['9:16', 1080, 1920], ['3:2', 1620, 1080], ['4:5', 1080, 1350], ['2:3', 1080, 1620]];
      var w = U.input({ label: 'Width (px)', type: 'number', value: '1920', min: '1', dataset: { role: 'w' } });
      var h = U.input({ label: 'Height (px)', type: 'number', value: '1080', min: '1', dataset: { role: 'h' } });
      var nw = U.input({ label: 'New Width', type: 'number', value: '1280', dataset: { role: 'nw' } });
      var nh = U.input({ label: 'New Height', type: 'number', value: '', dataset: { role: 'nh' } });
      var stats = el('div', { dataset: { role: 'stats' } });
      var preview = el('div', { class: 'cv-preview' });
      var common = el('div', { class: 'cv-chip-row', dataset: { role: 'common' } });
      var presets = el('div', { class: 'chips' }, PRESETS.map(function (p) {
        return el('button', { class: 'chip', type: 'button', onclick: function () {
          inp(w).value = p[1]; inp(h).value = p[2]; update(); calcH();
        } }, p[0]);
      }));

      function ratio(a, b) {
        var d = gcd(Math.round(a), Math.round(b));
        return (Math.round(a) / d) + ':' + (Math.round(b) / d);
      }
      function update() {
        var a = num(inp(w).value), b = num(inp(h).value);
        if (!(a > 0 && b > 0)) { stats.replaceChildren(U.note('Enter a width and height above zero.', 'err')); common.replaceChildren(); return; }
        var r = ratio(a, b);
        stats.replaceChildren(U.stats([{ label: 'Ratio', value: r }, { label: 'Decimal', value: (a / b).toFixed(4) },
          { label: 'Dimensions', value: Math.round(a) + '×' + Math.round(b) }]));
        var maxW = 240, pw = a >= b ? maxW : maxW * a / b, ph = a >= b ? maxW * b / a : maxW;
        preview.style.width = pw + 'px'; preview.style.height = ph + 'px'; preview.textContent = r;
        common.replaceChildren.apply(common, [360, 480, 640, 720, 1024, 1280, 1366, 1440, 1920, 2560, 3840].map(function (cw) {
          var ch = Math.round(cw * b / a);
          return el('button', { class: 'chip', type: 'button', title: 'Use this size', onclick: function () {
            inp(nw).value = cw; inp(nh).value = ch;
          } }, cw + '×' + ch);
        }));
      }
      function calcH() {
        var a = num(inp(w).value), b = num(inp(h).value), x = num(inp(nw).value);
        if (a > 0 && b > 0 && x > 0) inp(nh).value = Math.round(x * b / a);
      }
      function calcW() {
        var a = num(inp(w).value), b = num(inp(h).value), y = num(inp(nh).value);
        if (a > 0 && b > 0 && y > 0) inp(nw).value = Math.round(y * a / b);
      }
      [w, h].forEach(function (f) { inp(f).addEventListener('input', function () { update(); calcH(); }); });
      inp(nw).addEventListener('input', calcH);
      inp(nh).addEventListener('input', calcW);
      update();

      root.appendChild(U.panel(null, presets, U.row(w, h), stats, preview));
      root.appendChild(U.panel('Scale to New Size', el('div', { class: 'cv-flex' }, nw,
        U.button('→ Calc Height', calcH), U.button('← Calc Width', calcW), nh)));
      root.appendChild(U.panel('Common Sizes at This Ratio', common));
    }
  });

  /* --- actual-size calibration (shared by ruler, paper and ring tools) ----- */

  var CARD_MM = 85.6;
  var CAL_KEY = 'att-px-per-mm';
  function savedPxPerMm() { var v = store(CAL_KEY); return typeof v === 'number' && v > 1 && v < 30 ? v : null; }
  function pxPerMm() { return savedPxPerMm() || 96 / 25.4; }

  /* Builds the calibration panel. onChange(pxPerMm) fires whenever the scale
     changes (while dragging the slider too, so previews follow). */
  function calibration(opts) {
    var wrap = el('div', { class: 'panel', dataset: { role: 'calibration' } });
    var editing = !savedPxPerMm();
    var cardPx = Math.round(pxPerMm() * CARD_MM);
    var mode = 'card';

    function emit(v) { if (opts.onChange) opts.onChange(v); }
    function draw() {
      wrap.replaceChildren();
      if (!editing) {
        wrap.appendChild(el('h3', { text: opts.doneTitle || 'Calibrated: sizes on this screen are real' }));
        wrap.appendChild(U.note('Keep browser zoom at 100%. Changing zoom or display scaling asks you to calibrate again.'));
        wrap.appendChild(U.btnrow(
          U.button('Recalibrate', function () { editing = true; draw(); }, 'ghost'),
          U.button('Forget calibration', function () { store(CAL_KEY, null); cardPx = Math.round(96 / 25.4 * CARD_MM); editing = true; draw(); emit(pxPerMm()); }, 'ghost')));
        return;
      }
      wrap.appendChild(el('h3', { text: opts.title || 'Calibrate once so sizes are actual size' }));
      if (opts.intro) wrap.appendChild(U.note(opts.intro));
      if (opts.screenMode) {
        wrap.appendChild(U.chips([{ value: 'card', label: 'With a bank card' }, { value: 'screen', label: 'With screen size' }],
          function (m) { mode = m; draw(); }, mode));
      }
      if (mode === 'card') {
        var slider = el('input', { type: 'range', min: '120', max: '900', step: '1', value: String(cardPx), 'aria-label': 'Card width', dataset: { role: 'card-width' } });
        var outline = el('div', { class: 'cv-cal-card', style: { width: cardPx + 'px', height: (cardPx * 53.98 / CARD_MM) + 'px' } }, el('span', { text: '85.6 mm' }));
        var set = function (v) {
          cardPx = Math.max(120, Math.min(900, v));
          slider.value = cardPx;
          outline.style.width = cardPx + 'px';
          outline.style.height = (cardPx * 53.98 / CARD_MM) + 'px';
          emit(cardPx / CARD_MM);
        };
        slider.addEventListener('input', function () { set(+slider.value); });
        wrap.appendChild(U.note('Hold any bank, credit or ID card flat against the screen, lined up with the left edge of the outline. Drag the slider until the outline is exactly as wide as the card.'));
        wrap.appendChild(el('div', { class: 'cv-scroll' }, outline));
        wrap.appendChild(el('div', { class: 'cv-flex' },
          U.button('−', function () { set(cardPx - 1); }, 'ghost'), el('div', { style: { flex: '1', minWidth: '160px' } }, slider),
          U.button('+', function () { set(cardPx + 1); }, 'ghost'),
          U.button('It matches my card', function () {
            store(CAL_KEY, cardPx / CARD_MM); editing = false; draw(); emit(cardPx / CARD_MM);
          })));
      } else {
        var diag = U.input({ label: 'inches', placeholder: 'e.g. 15.6', 'aria-label': 'Screen diagonal in inches', dataset: { role: 'diagonal' } });
        var msg = U.note('');
        var apply = function () {
          var d = num(inp(diag).value);
          if (!(d >= 3 && d <= 120)) { msg.className = 'note err'; msg.textContent = 'Enter a diagonal between 3 and 120 inches.'; return; }
          var diagPx = Math.sqrt(screen.width * screen.width + screen.height * screen.height);
          var v = diagPx / (d * 25.4);
          store(CAL_KEY, v); cardPx = Math.round(v * CARD_MM); editing = false; mode = 'card'; draw(); emit(v);
        };
        wrap.appendChild(U.note("Enter your screen's diagonal size in inches, from the model sticker, the box or the specifications. Works for laptops and monitors; on phones, use a card instead."));
        wrap.appendChild(el('div', { class: 'cv-flex' }, diag, ['13.3', '14', '15.6', '24', '27'].map(function (s) {
          return U.button(s + '″', function () { inp(diag).value = s; }, 'ghost');
        })));
        wrap.appendChild(U.btnrow(U.button('Use this screen size', apply), U.button('Cancel', function () { mode = 'card'; if (savedPxPerMm()) editing = false; draw(); }, 'ghost')));
        wrap.appendChild(msg);
      }
    }
    draw();
    wrap.isCalibrated = function () { return !!savedPxPerMm(); };
    return wrap;
  }

  function svgEl(tag, attrs) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]); });
    for (var i = 2; i < arguments.length; i++) {
      var kid = arguments[i];
      if (kid === null || kid === undefined) continue;
      n.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    }
    return n;
  }

  /* --- online ruler ----------------------------------------------------------- */

  function sixteenths(inches) {
    var t = Math.round(inches * 16), whole = Math.floor(t / 16), f = t % 16, den = 16;
    while (f && f % 2 === 0) { f /= 2; den /= 2; }
    if (!f) return whole + ' in';
    return (whole ? whole + ' ' : '') + f + '/' + den + ' in';
  }

  Tools.register({
    id: 'online-ruler', category: 'converters', name: 'On-Screen Ruler',
    description: 'A real-size on-screen ruler in centimetres and inches, calibrated with a bank card or your screen size.',
    keywords: ['ruler', 'actual size', 'cm', 'inches', 'measure', 'mm'],
    render: function (root) {
      box(root);
      var ppm = pxPerMm();
      var start = 0, end = 50;
      var holder = el('div', { class: 'cv-ruler' });
      var svgBox = el('div');
      var readout = el('div', { dataset: { role: 'readout' } });
      var title = el('h3');
      var cal = calibration({ screenMode: true, title: 'Calibrate once so the ruler is actual size',
        doneTitle: 'Calibrated: the ruler is actual size on this screen',
        intro: 'Every screen has different pixel sizes, so no website ruler is accurate until it is matched to something real. It takes ten seconds with any bank card.',
        onChange: function (v) { ppm = v; draw(); } });

      function lengthMm() { return Math.max(50, Math.floor((holder.clientWidth || 600) / ppm) - 2); }
      var hStart = el('button', { class: 'cv-handle', type: 'button', role: 'slider', 'aria-label': 'Start marker', dataset: { role: 'start' } });
      var hEnd = el('button', { class: 'cv-handle', type: 'button', role: 'slider', 'aria-label': 'End marker', dataset: { role: 'end' } });

      function draw() {
        var L = lengthMm();
        start = Math.max(0, Math.min(L, start)); end = Math.max(0, Math.min(L, end));
        title.textContent = cal.isCalibrated() ? 'Ruler' : 'Ruler (approximate until calibrated)';
        var W = L * ppm + 2, H = 120;
        var svg = svgEl('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, style: 'display:block' });
        svg.appendChild(svgEl('rect', { x: 0, y: 0, width: W, height: H, fill: '#fdf6d8', stroke: '#8a7a3a' }));
        var x0 = 1;
        for (var mm = 0; mm <= L; mm++) {
          var x = x0 + mm * ppm, len = mm % 10 === 0 ? 26 : (mm % 5 === 0 ? 18 : 10);
          svg.appendChild(svgEl('line', { x1: x, y1: 0, x2: x, y2: len, stroke: '#333', 'stroke-width': mm % 10 === 0 ? 1.2 : 0.7 }));
          if (mm % 10 === 0 && mm > 0) svg.appendChild(svgEl('text', { x: x, y: 40, 'font-size': 12, 'text-anchor': 'middle', fill: '#222' }, String(mm / 10)));
        }
        svg.appendChild(svgEl('text', { x: 4, y: 56, 'font-size': 11, fill: '#555' }, 'cm'));
        var pxIn = ppm * 25.4, inches = L / 25.4;
        for (var s = 0; s <= inches * 16; s++) {
          var xi = x0 + s * pxIn / 16, l = s % 16 === 0 ? 26 : s % 8 === 0 ? 20 : s % 4 === 0 ? 14 : s % 2 === 0 ? 10 : 6;
          svg.appendChild(svgEl('line', { x1: xi, y1: H, x2: xi, y2: H - l, stroke: '#333', 'stroke-width': s % 16 === 0 ? 1.2 : 0.7 }));
          if (s % 16 === 0 && s > 0) svg.appendChild(svgEl('text', { x: xi, y: H - 32, 'font-size': 12, 'text-anchor': 'middle', fill: '#222' }, String(s / 16)));
        }
        svg.appendChild(svgEl('text', { x: 4, y: H - 48, 'font-size': 11, fill: '#555' }, 'in'));
        var a = Math.min(start, end), b = Math.max(start, end);
        svg.appendChild(svgEl('rect', { x: x0 + a * ppm, y: 58, width: (b - a) * ppm, height: 8, fill: 'rgba(80,90,220,.45)' }));
        [start, end].forEach(function (p) {
          svg.appendChild(svgEl('line', { x1: x0 + p * ppm, y1: 0, x2: x0 + p * ppm, y2: H, stroke: '#4650dc', 'stroke-width': 1.5 }));
        });
        svgBox.replaceChildren(svg);
        if (!hStart.parentNode) holder.append(svgBox, hStart, hEnd);
        hStart.style.left = (x0 + start * ppm) + 'px';
        hEnd.style.left = (x0 + end * ppm) + 'px';
        [[hStart, start], [hEnd, end]].forEach(function (p) {
          p[0].setAttribute('aria-valuenow', String(p[1])); p[0].setAttribute('aria-valuemin', '0'); p[0].setAttribute('aria-valuemax', String(L));
          p[0].setAttribute('aria-valuetext', p[1].toFixed(1) + ' mm');
        });
        var d = b - a;
        readout.replaceChildren(U.stats([{ label: 'centimetres', value: (d / 10).toFixed(2) + ' cm' },
          { label: 'inches', value: (d / 25.4).toFixed(3) + ' in' }]),
          el('p', { class: 'mono', text: '≈ ' + sixteenths(d / 25.4) + ' · ' + d.toFixed(1) + ' mm' }));
      }

      function bindHandle(h, which) {
        h.addEventListener('pointerdown', function (e) {
          e.preventDefault(); h.setPointerCapture(e.pointerId); h.focus();
          var move = function (ev) {
            var r = holder.getBoundingClientRect();
            var mm = Math.round((ev.clientX - r.left - 1) / ppm * 2) / 2;
            if (which === 'start') start = mm; else end = mm;
            draw();
          };
          var up = function () { h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); };
          h.addEventListener('pointermove', move); h.addEventListener('pointerup', up);
        });
        h.addEventListener('keydown', function (e) {
          var step = e.shiftKey ? 10 : 1, delta = 0;
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') delta = step;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') delta = -step;
          else if (e.key === 'Home') delta = -1e6;
          else if (e.key === 'End') delta = 1e6;
          else return;
          e.preventDefault();
          if (which === 'start') start += delta; else end += delta;
          draw();
        });
      }
      bindHandle(hStart, 'start'); bindHandle(hEnd, 'end');

      root.appendChild(cal);
      root.appendChild(U.panel(null, title, el('div', { class: 'cv-scroll' }, holder), readout,
        U.note('Drag the two round handles, or focus one and use the arrow keys (hold Shift for centimetre steps), to measure between them. Place the object against the screen with its edge on the left marker.')));
      draw();
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(U.debounce(draw, 80));
        ro.observe(root);
        U.onTeardown(root, function () { ro.disconnect(); });
      }
    }
  });

  /* --- paper sizes -------------------------------------------------------------- */

  var PAPER = [
    ['A sizes', [
      ['a3', 'A3', 297, 420, 'Posters, drawings and two A4 pages side by side'],
      ['a4', 'A4', 210, 297, 'Standard office paper in most of the world'],
      ['a5', 'A5', 148, 210, 'Notebooks, flyers and half an A4 sheet'],
      ['a6', 'A6', 105, 148, 'Postcards and pocket notebooks'],
      ['a7', 'A7', 74, 105, 'Small notepads and tickets']]],
    ['B sizes', [
      ['b5', 'B5', 176, 250, 'Books, magazines and Japanese notebooks'],
      ['b6', 'B6', 125, 176, 'Paperback books and small notebooks']]],
    ['North America', [
      ['letter', 'US Letter', 215.9, 279.4, 'Standard office paper in the US, Canada and Mexico'],
      ['legal', 'US Legal', 215.9, 355.6, 'Contracts and legal documents in North America'],
      ['tabloid', 'Tabloid (Ledger)', 279.4, 431.8, 'Newspapers, posters and spreadsheets'],
      ['halfletter', 'Half Letter (Statement)', 139.7, 215.9, 'Planners, booklets and invoices'],
      ['executive', 'Executive', 184.15, 266.7, 'Letterheads and personal stationery']]],
    ['Photo prints', [
      ['p4x6', '4 x 6 in photo', 101.6, 152.4, 'The standard photo print size'],
      ['p5x7', '5 x 7 in photo', 127, 177.8, 'Framed photos and greeting cards'],
      ['p8x10', '8 x 10 in photo', 203.2, 254, 'Portraits and large framed prints'],
      ['p35x5', '3.5 x 5 in photo', 88.9, 127, 'Small prints, also called 9 x 13 cm'],
      ['wallet', 'Wallet photo', 63.5, 88.9, 'Small prints that fit a wallet'],
      ['passport', 'Passport photo 35 x 45 mm', 35, 45, 'UK, EU, Australian and many other passports'],
      ['passportus', 'Passport photo 2 x 2 in', 50.8, 50.8, 'US passports and visas']]],
    ['Envelopes', [
      ['dl', 'DL envelope', 110, 220, 'Takes an A4 sheet folded in three'],
      ['c5', 'C5 envelope', 162, 229, 'Takes an A4 sheet folded once, or A5 flat'],
      ['c6', 'C6 envelope', 114, 162, 'Takes an A4 sheet folded twice, or A6 flat'],
      ['env10', '#10 envelope', 104.775, 241.3, 'Standard US business envelope for folded Letter']]],
    ['Cards', [
      ['bizeu', 'Business card (85 x 55 mm)', 55, 85, 'Standard business card in Europe'],
      ['bizus', 'Business card (3.5 x 2 in)', 50.8, 88.9, 'Standard business card in the US and Canada'],
      ['bankcard', 'Bank or ID card', 53.98, 85.6, 'Credit, debit and ID cards (ISO/IEC 7810 ID-1)'],
      ['index', 'Index card 3 x 5 in', 76.2, 127, 'Revision and recipe cards'],
      ['sticky', 'Sticky note', 76, 76, 'The classic square sticky note']]]
  ];
  var PAPER_BY_ID = {};
  PAPER.forEach(function (g) { g[1].forEach(function (p) { PAPER_BY_ID[p[0]] = p; }); });
  function mmText(v) { return trimFixed(v, 1); }

  Tools.register({
    id: 'paper-size-viewer', category: 'converters', name: 'Paper Size Viewer',
    description: 'See paper, photo, envelope and card sizes at actual size on screen, compare two, and get print pixels.',
    keywords: ['paper size', 'a4', 'letter', 'envelope', 'photo print', 'business card', 'actual size', 'dpi'],
    render: function (root) {
      box(root);
      var ppm = pxPerMm();
      var letter = !!(window.Region && Region.get().paper === 'letter');
      var cur = letter ? 'letter' : 'a4', orient = 'portrait', cmp = letter ? 'a4' : 'letter';
      var cal = calibration({ title: 'Calibrate once for true actual size', doneTitle: 'Calibrated: paper is shown at actual size',
        onChange: function (v) { ppm = v; draw(); } });
      var sizeBtns = el('div', { dataset: { role: 'sizes' } });
      var orientChips = U.chips([{ value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }], function (v) { orient = v; draw(); }, 'portrait');
      var cmpSel = U.select({ label: 'Compare with', dataset: { role: 'compare' }, options: [{ value: '', label: 'Nothing' }].concat(
        Object.keys(PAPER_BY_ID).map(function (k) { return { value: k, label: PAPER_BY_ID[k][1] }; })), value: cmp });
      var fit = U.checkbox('Fit to screen');
      fit.input.dataset.role = 'fit';
      var stage = el('div', { class: 'cv-scroll', style: { padding: '8px 0' } });
      var info = el('div', { dataset: { role: 'info' } });

      PAPER.forEach(function (g) {
        sizeBtns.appendChild(el('div', { class: 'cv-muted', text: g[0], style: { marginTop: '6px' } }));
        sizeBtns.appendChild(el('div', { class: 'chips' }, g[1].map(function (p) {
          return el('button', { class: 'chip', type: 'button', dataset: { size: p[0] }, onclick: function () { cur = p[0]; draw(); } }, p[1]);
        })));
      });
      inp(cmpSel).addEventListener('change', function () { cmp = inp(cmpSel).value; draw(); });
      fit.input.addEventListener('change', draw);

      function dims(p) {
        var w = p[2], h = p[3];
        if (orient === 'landscape') { var t = w; w = h; h = t; }
        return { w: w, h: h };
      }
      function draw() {
        Array.prototype.forEach.call(sizeBtns.querySelectorAll('[data-size]'), function (b) { b.classList.toggle('on', b.dataset.size === cur); });
        var p = PAPER_BY_ID[cur], d = dims(p), c = cmp ? PAPER_BY_ID[cmp] : null, cd = c ? dims(c) : null;
        var maxW = Math.max(d.w, cd ? cd.w : 0), maxH = Math.max(d.h, cd ? cd.h : 0);
        var scale = ppm;
        var avail = Math.max(200, stage.clientWidth - 4), availH = Math.max(240, window.innerHeight * 0.75);
        var tooBig = maxW * ppm > avail || maxH * ppm > availH;
        if (fit.input.checked) scale = Math.min(ppm, avail / maxW, availH / maxH);
        var sheet = el('div', { class: 'cv-paper', style: { width: d.w * scale + 'px', height: d.h * scale + 'px' } },
          el('div', { class: 'cv-paper-lbl', style: { left: 0, top: 0 }, text: p[1] }),
          el('div', { class: 'cv-paper-lbl', style: { left: '50%', bottom: 0, transform: 'translateX(-50%)' }, text: mmText(d.w) + ' mm' }),
          el('div', { class: 'cv-paper-lbl', style: { right: 0, top: '50%' }, text: mmText(d.h) + ' mm' }));
        var holder = el('div', { style: { position: 'relative', width: maxW * scale + 'px', height: maxH * scale + 'px' } }, sheet);
        sheet.style.position = 'absolute'; sheet.style.left = 0; sheet.style.top = 0;
        if (cd) {
          holder.appendChild(el('div', { class: 'cv-paper-cmp', style: { width: cd.w * scale + 'px', height: cd.h * scale + 'px' } },
            el('div', { class: 'cv-paper-lbl', style: { right: 0, bottom: 0, color: 'var(--accent)' }, text: c[1] })));
        }
        stage.replaceChildren(holder);
        if (tooBig && !fit.input.checked) stage.appendChild(U.note('This size is bigger than your screen at actual size. Scroll to see it all, or tick Fit to screen.'));
        else if (fit.input.checked && scale < ppm) stage.appendChild(U.note('Shown at ' + Math.round(scale / ppm * 100) + '% of actual size to fit your screen.'));

        var win = d.w / 25.4, hin = d.h / 25.4;
        var rows = [
          ['mm', mmText(d.w) + ' x ' + mmText(d.h)], ['cm', trimFixed(d.w / 10, 2) + ' x ' + trimFixed(d.h / 10, 2)],
          ['inches', win.toFixed(2) + ' x ' + hin.toFixed(2)], ['shape', '1 : ' + (Math.max(d.w, d.h) / Math.min(d.w, d.h)).toFixed(3)]
        ];
        var px = [72, 150, 300, 600].map(function (dpi) { return [dpi + ' dpi', Math.round(win * dpi) + ' x ' + Math.round(hin * dpi) + ' px']; });
        var sentence = '';
        if (c && cmp !== cur) {
          var dw = cd.w - d.w, dh = cd.h - d.h;
          var part = function (v, more, less) { return Math.abs(v) < 0.05 ? 'the same ' + (more === 'wider' ? 'width' : 'height') : mmText(Math.abs(v)) + ' mm ' + (v > 0 ? more : less); };
          sentence = c[1] + ' is ' + mmText(cd.w) + ' x ' + mmText(cd.h) + ' mm: ' + part(dw, 'wider', 'narrower') + ' and ' + part(dh, 'taller', 'shorter') + '.';
        }
        info.replaceChildren(
          el('h3', { text: p[1] }), U.note(p[4]),
          U.table(['', ''], rows),
          el('h4', { text: 'Pixels for printing' }), U.table(['Resolution', 'Pixels'], px),
          U.note('300 dpi is the usual quality for photos and print shops.'),
          sentence ? el('p', { dataset: { role: 'compare-text' }, text: sentence }) : null);
      }

      root.appendChild(cal);
      root.appendChild(U.panel(null, sizeBtns, el('div', { class: 'cv-flex', style: { marginTop: '10px' } }, orientChips, cmpSel, fit)));
      root.appendChild(U.panel(null, stage));
      root.appendChild(U.panel(null, info));
      draw();
      var onResize = U.debounce(draw, 100);
      window.addEventListener('resize', onResize);
      U.onTeardown(root, function () { window.removeEventListener('resize', onResize); });
    }
  });

  /* --- ring size ------------------------------------------------------------------ */

  function ringFromDiameter(d) {
    var circ = Math.PI * d;
    var us = Math.round((d - 11.63) / 0.8128 * 4) / 4;
    var pos = Math.round((us - 3) * 4) + 11; /* UK sizes in half-letter steps; A = 0 */
    var uk;
    if (pos < 0) uk = '—';
    else if (pos >= 49) uk = pos === 49 ? 'Z' : pos === 50 ? 'Z½' : 'Z+' + Math.floor((pos - 49) / 2) + (((pos - 49) % 2) ? '½' : '');
    else uk = String.fromCharCode(65 + Math.floor(pos / 2)) + (pos % 2 ? '½' : '');
    var eu = Math.round(circ);
    return {
      d: d, circ: circ, us: us, usText: us < 0 ? '—' : withFraction(us, true), uk: uk, eu: eu,
      de: (Math.round(d * 2) / 2).toFixed(1), it: Math.max(0, eu - 40), fr: eu
    };
  }

  Tools.register({
    id: 'ring-size-finder', category: 'converters', name: 'Ring Size Finder',
    description: 'Find your ring size at actual size on screen from a ring or your finger, in US, UK, EU and other systems.',
    keywords: ['ring size', 'ring sizer', 'jewellery', 'finger', 'us to uk ring size', 'circumference'],
    render: function (root) {
      box(root);
      var ppm = pxPerMm();
      var mode = 'ring', diameter = 17.3, band = 'thin', fingerUnit = 'mm', showChart = false;
      var cal = calibration({ title: 'First, match your screen to a bank card',
        doneTitle: 'Your screen is calibrated, so sizes on it are real',
        intro: 'Every screen is a different size, so the circle can only be exact after this ten second step. You only do it once.',
        onChange: function (v) { ppm = v; drawMeasure(); } });
      var measure = el('div');
      var result = el('div', { dataset: { role: 'result' } });
      var chartBox = el('div');
      var fingerInput = el('input', { type: 'text', 'aria-label': 'Finger circumference', placeholder: 'e.g. 54', dataset: { role: 'finger' } });
      var slider = el('input', { type: 'range', min: '12', max: '26', step: '0.05', value: '17.3', 'aria-label': 'Circle size', dataset: { role: 'circle' } });
      fingerInput.addEventListener('input', update);
      slider.addEventListener('input', function () { diameter = +slider.value; drawCircle(); update(); });
      var circleHost = el('div', { style: { display: 'flex', justifyContent: 'center', padding: '10px' } });
      var diaText = el('p', { class: 'mono' });

      function drawCircle() {
        var r = diameter * ppm / 2, s = r * 2 + 40;
        circleHost.replaceChildren(svgEl('svg', { width: s, height: s, viewBox: '0 0 ' + s + ' ' + s },
          svgEl('circle', { cx: s / 2, cy: s / 2, r: r, fill: 'rgba(140,90,230,.18)', stroke: '#8c5ae6', 'stroke-width': 2 }),
          svgEl('line', { x1: s / 2 - r, y1: s / 2, x2: s / 2 + r, y2: s / 2, stroke: '#8c5ae6', 'stroke-dasharray': '3 3' })));
        diaText.textContent = 'Inside diameter ' + diameter.toFixed(2) + ' mm';
      }
      function fingerRuler() {
        var L = 90, W = L * ppm + 20;
        var svg = svgEl('svg', { width: W, height: 50, role: 'img', 'aria-label': 'Actual size millimetre ruler' });
        svg.appendChild(svgEl('rect', { x: 0, y: 0, width: W, height: 50, fill: '#fdf6d8', stroke: '#8a7a3a' }));
        for (var mm = 0; mm <= L; mm++) {
          var x = 10 + mm * ppm;
          svg.appendChild(svgEl('line', { x1: x, y1: 0, x2: x, y2: mm % 10 === 0 ? 20 : mm % 5 === 0 ? 14 : 8, stroke: '#333', 'stroke-width': 0.8 }));
          if (mm % 10 === 0) svg.appendChild(svgEl('text', { x: x, y: 34, 'font-size': 11, 'text-anchor': 'middle', fill: '#222' }, String(mm)));
        }
        svg.appendChild(svgEl('text', { x: W - 24, y: 46, 'font-size': 10, fill: '#555' }, 'mm'));
        return el('div', { class: 'cv-scroll' }, svg);
      }
      function drawMeasure() {
        measure.replaceChildren();
        if (mode === 'ring') {
          measure.appendChild(U.note('Lay a ring that fits you flat on the circle. Resize the circle until its purple edge sits exactly on the inside edge of the ring, with no gap and no purple showing.'));
          measure.appendChild(circleHost);
          measure.appendChild(el('div', { class: 'cv-flex' },
            U.button('Smaller', function () { diameter = Math.max(12, +(diameter - 0.1).toFixed(2)); slider.value = diameter; drawCircle(); update(); }, 'ghost'),
            el('div', { style: { flex: 1, minWidth: '160px' } }, slider),
            U.button('Bigger', function () { diameter = Math.min(26, +(diameter + 0.1).toFixed(2)); slider.value = diameter; drawCircle(); update(); }, 'ghost')));
          measure.appendChild(diaText);
          drawCircle();
        } else {
          measure.appendChild(el('ol', {},
            el('li', { text: 'Wrap a thin strip of paper or string snugly around the base of your finger.' }),
            el('li', { text: 'Mark where it overlaps, then lay it flat along the ruler below, starting at 0.' }),
            el('li', { text: 'Type the length. It should still slide over your knuckle.' })));
          measure.appendChild(fingerRuler());
          measure.appendChild(el('div', { class: 'cv-flex' }, fingerInput,
            U.chips([{ value: 'mm', label: 'mm' }, { value: 'in', label: 'in' }], function (u) { fingerUnit = u; update(); }, fingerUnit)));
        }
      }
      function currentDiameter() {
        if (mode === 'ring') return diameter;
        var raw = fingerInput.value.trim().toLowerCase();
        var v = num(raw.replace(/[a-z"″\s]+$/, ''));
        var unit = /in|"|″/.test(raw) ? 'in' : /cm/.test(raw) ? 'cm' : fingerUnit;
        if (!isFinite(v)) return fingerInput.value.trim() ? NaN : null;
        var circ = unit === 'in' ? v * 25.4 : unit === 'cm' ? v * 10 : v;
        if (circ < 38 || circ > 82) return NaN;
        return circ / Math.PI;
      }
      function update() {
        var d = currentDiameter();
        if (d === null) { result.replaceChildren(); drawChart(null); return; }
        if (!isFinite(d)) {
          result.replaceChildren(U.note('That is outside the usual ring sizes (38 to 82 mm around). Check the measurement and the unit.', 'err'));
          drawChart(null); return;
        }
        var r = ringFromDiameter(d);
        var adv = { thin: 'For a thin band, your measured size is right.',
          medium: 'For a band 6 to 8 mm wide, go a quarter to half a size up.',
          wide: 'For a band 8 mm or wider, go half a size up.' }[band];
        result.replaceChildren(
          el('h3', { text: 'Your ring size' }),
          el('div', { class: 'cv-big', dataset: { role: 'us' }, text: 'US ' + r.usText }),
          el('p', { class: 'cv-muted', text: 'UK ' + r.uk + ' · EU ' + r.eu }),
          el('div', { class: 'cv-grid' }, [
            ['US & Canada', r.usText], ['UK, Ireland, Australia, NZ', r.uk], ['Europe (ISO)', r.eu],
            ['Germany & Austria', r.de], ['Italy, Spain, Switzerland', r.it], ['France', r.fr],
            ['Inside diameter', r.d.toFixed(1) + ' mm'], ['Circumference', r.circ.toFixed(1) + ' mm']
          ].map(function (c) { return el('div', { class: 'cv-card' }, el('span', { text: c[0] }), el('b', { text: String(c[1]) })); })),
          el('h4', { text: 'Band width' }),
          U.chips([{ value: 'thin', label: 'Thin (under 6 mm)' }, { value: 'medium', label: 'Medium (6 to 8 mm)' }, { value: 'wide', label: 'Wide (8 mm or more)' }],
            function (b) { band = b; update(); }, band),
          U.note(adv + ' Between two sizes, choose the larger one.'));
        drawChart(r.us);
      }
      function drawChart(us) {
        chartBox.replaceChildren(U.button(showChart ? 'Hide the full ring size chart' : 'Show the full ring size chart', function () { showChart = !showChart; drawChart(us); }, 'ghost'));
        if (!showChart) return;
        var rows = [];
        for (var s = 3; s <= 13; s += 0.5) {
          var r = ringFromDiameter(11.63 + 0.8128 * s);
          rows.push({ s: s, cells: [withFraction(s, true), r.uk, r.eu, r.de, r.it, r.d.toFixed(1) + ' mm', r.circ.toFixed(1) + ' mm'] });
        }
        var t = U.table(['US', 'UK/AU', 'EU (ISO)', 'Germany', 'Italy/Spain', 'Diameter', 'Circumference'], rows.map(function (r) { return r.cells; }));
        t.dataset.role = 'chart';
        if (us !== null && us !== undefined) {
          var best = 0;
          rows.forEach(function (r, i) { if (Math.abs(r.s - us) < Math.abs(rows[best].s - us)) best = i; });
          t.querySelectorAll('tbody tr')[best].style.background = 'var(--bg-sunken)';
          t.querySelectorAll('tbody tr')[best].style.fontWeight = '700';
        }
        chartBox.appendChild(t);
      }

      root.appendChild(cal);
      root.appendChild(U.panel(null,
        U.chips([{ value: 'ring', label: 'I have a ring' }, { value: 'finger', label: 'Measure my finger' }], function (m) { mode = m; drawMeasure(); update(); }, 'ring'),
        measure, result));
      root.appendChild(U.panel(null, chartBox,
        U.note('Measure at the end of the day when your hands are warm; fingers are smaller in the morning and in the cold. Ring sizes can differ slightly between jewellers, so for an expensive ring, confirm with the shop.')));
      drawMeasure();
      update();
    }
  });

  /* --- shoe size --------------------------------------------------------------------- */

  var TOE = 1.5;
  function upHalf(v) { return Math.ceil((v - 0.1) * 2) / 2; }
  function shoeFromFoot(L) {
    var lastIn = (L + TOE) / 2.54;
    var uk = 3 * lastIn - 25;
    var out = { L: L, eu: Math.round(1.5 * (L + TOE)), jp: upHalf(L), mondo: Math.round(L * 10) };
    if (uk < 1) {
      out.kids = true;
      out.ukKids = Math.max(0, upHalf(3 * lastIn - 12));
      out.usKids = out.ukKids + 1;
    } else {
      out.uk = upHalf(uk); out.usMen = out.uk + 1; out.usWomen = out.uk + 2;
    }
    return out;
  }
  function footFromSize(system, s) {
    switch (system) {
      case 'eu': return s / 1.5 - TOE;
      case 'uk': return (s + 25) * 2.54 / 3 - TOE;
      case 'usMen': return (s - 1 + 25) * 2.54 / 3 - TOE;
      case 'usWomen': return (s - 2 + 25) * 2.54 / 3 - TOE;
      case 'jp': return s;
      case 'ukKids': return (s + 12) * 2.54 / 3 - TOE;
      case 'usKids': return (s - 1 + 12) * 2.54 / 3 - TOE;
    }
    return NaN;
  }
  function parseSize(text) {
    var t = String(text).trim().replace(',', '.');
    var m = t.match(/^(\d+(?:\.\d+)?)\s*(½|1\/2|¼|3\/4|¾)?$/);
    if (!m) return NaN;
    var v = parseFloat(m[1]);
    if (m[2] === '½' || m[2] === '1/2') v += 0.5;
    if (m[2] === '¼') v += 0.25;
    if (m[2] === '¾' || m[2] === '3/4') v += 0.75;
    return v;
  }

  Tools.register({
    id: 'shoe-size-finder', category: 'converters', name: 'Shoe Size Finder & Converter',
    description: 'Get your shoe size from your foot length in EU, UK, US, kids and Japan sizes, or convert a size you know.',
    keywords: ['shoe size', 'eu to us', 'uk shoe size', 'foot length', 'kids shoe size', 'mondopoint'],
    render: function (root) {
      box(root);
      var reg = window.Region ? Region.get() : null;
      var mode = 'foot', unit = reg && reg.units === 'imperial' ? 'in' : 'cm';
      var len = el('input', { type: 'text', value: unit === 'in' ? '10.4' : '26.5', 'aria-label': 'Foot length', dataset: { role: 'length' } });
      var wid = el('input', { type: 'text', value: '', placeholder: 'e.g. 10', 'aria-label': 'Foot width', dataset: { role: 'width' } });
      var lenLbl = el('label'), widLbl = el('label');
      var sys = U.select({ label: 'Size system', dataset: { role: 'system' }, options: [
        { value: 'eu', label: 'EU' }, { value: 'uk', label: 'UK' }, { value: 'usMen', label: 'US men' }, { value: 'usWomen', label: 'US women' },
        { value: 'jp', label: 'Japan (cm)' }, { value: 'ukKids', label: 'UK kids' }, { value: 'usKids', label: 'US kids' }], value: 'eu' });
      /* A chosen country starts from its own size system. */
      var mySys = reg && Region.isSet() ? { GB: ['uk', '8'], IE: ['uk', '8'], US: ['usMen', '9'], CA: ['usMen', '9'], JP: ['jp', '26.5'] }[reg.country] : null;
      if (mySys) inp(sys).value = mySys[0];
      var size = U.input({ label: 'Size', value: mySys ? mySys[1] : '42', dataset: { role: 'size' } });
      var body = el('div'), result = el('div', { dataset: { role: 'result' } });
      [len, wid, inp(size)].forEach(function (n) { n.addEventListener('input', run); });
      inp(sys).addEventListener('change', run);

      function unitChips() {
        return U.chips([{ value: 'cm', label: 'Centimetres' }, { value: 'in', label: 'Inches' }], function (u) {
          if (u === unit) return;
          [len, wid].forEach(function (n) {
            var v = num(n.value);
            if (isFinite(v)) n.value = u === 'in' ? trimFixed(v / 2.54, 2) : trimFixed(v * 2.54, 1);
          });
          unit = u; drawBody();
        }, unit);
      }
      function drawBody() {
        body.replaceChildren();
        if (mode === 'foot') {
          lenLbl.textContent = 'Foot length (' + unit + ')';
          widLbl.textContent = 'Foot width at the widest point (' + unit + ', optional)';
          wid.placeholder = unit === 'cm' ? 'e.g. 10' : 'e.g. 3.9';
          body.appendChild(el('ol', {},
            el('li', { text: 'Put a sheet of paper on the floor against a wall, in the evening when feet are largest.' }),
            el('li', { text: 'Stand on it with your heel touching the wall, wearing the socks you will wear with the shoes.' }),
            el('li', { text: 'Mark the tip of your longest toe, then measure from the wall to the mark.' }),
            el('li', { text: 'Measure both feet and use the longer one.' })));
          body.appendChild(unitChips());
          body.appendChild(U.row(el('div', { class: 'field' }, lenLbl, len), el('div', { class: 'field' }, widLbl, wid)));
        } else {
          body.appendChild(U.row(sys, size));
        }
        run();
      }
      function card(label, value) { return el('div', { class: 'cv-card', dataset: { sys: label } }, el('span', { text: label }), el('b', { text: value })); }
      function show(r, heading) {
        var cards = [card('EU', String(r.eu))];
        if (r.kids) cards.push(card('UK kids', withFraction(r.ukKids)), card('US kids', withFraction(r.usKids)));
        else cards.push(card('UK', withFraction(r.uk)), card('US men', withFraction(r.usMen)), card('US women', withFraction(r.usWomen)));
        cards.push(card('Japan / cm', withFraction(r.jp)), card('Mondopoint', String(r.mondo)));
        return [el('h3', { text: heading }),
          el('p', { class: 'cv-muted', text: 'Foot length ' + r.L.toFixed(1) + ' cm (' + (r.L / 2.54).toFixed(2) + ' in)' + (r.kids ? " · children's sizes" : '') }),
          el('div', { class: 'cv-grid' }, cards)];
      }
      function run() {
        result.replaceChildren();
        if (mode === 'foot') {
          var L = num(len.value); if (unit === 'in') L *= 2.54;
          if (!(L >= 9 && L <= 35)) { result.appendChild(U.note('Enter a foot length between 9 and 35 cm.', 'err')); return; }
          var r = shoeFromFoot(L);
          result.append.apply(result, show(r, 'Your shoe size'));
          var W = num(wid.value); if (unit === 'in') W *= 2.54;
          if (isFinite(W) && W > 0) {
            var ratio = W / L, msg;
            if (ratio < 0.35) msg = 'Your foot is narrow for its length, so look for narrow fittings (B or C, or "slim").';
            else if (ratio > 0.41) msg = 'Your foot is wide for its length, so look for wide fittings (E, EE or "wide") or go up half a size.';
            else msg = 'Your foot is regular for its length, so standard widths should fit.';
            result.appendChild(el('p', { dataset: { role: 'width-note' }, text: msg }));
          }
          result.appendChild(U.note("Sizes include about 1.5 cm of toe room and round up when you are between sizes. Brands vary, especially sports shoes, so check the brand's own chart when you can."));
        } else {
          var s = parseSize(inp(size).value);
          var foot = footFromSize(inp(sys).value, s);
          if (!isFinite(s) || !(foot >= 9 && foot <= 35)) { result.appendChild(U.note('Enter a size that exists in this system, for example 42 in EU or 9 in US men.', 'err')); return; }
          result.append.apply(result, show(shoeFromFoot(foot), 'The same size in other systems'));
        }
      }

      root.appendChild(U.panel(null, U.chips([{ value: 'foot', label: 'From my foot' }, { value: 'convert', label: 'Convert a size' }],
        function (m) { mode = m; drawBody(); }, 'foot'), body));
      root.appendChild(U.panel(null, result));
      drawBody();
    }
  });

  /* --- TV & screen size comparison ------------------------------------------------ */

  var SHAPES = [
    ['16:9', '16:9', 16, 9], ['16:10', '16:10', 16, 10], ['3:2', '3:2', 3, 2], ['4:3', '4:3', 4, 3],
    ['64:27', '21:9 (2560 × 1080)', 64, 27], ['43:18', '21:9 (3440 × 1440)', 43, 18], ['32:9', '32:9', 32, 9],
    ['1:1', '1:1', 1, 1], ['19.5:9', '19.5:9 (phone)', 19.5, 9], ['custom', 'Custom…', 0, 0]
  ];
  var RESOLUTIONS = ['', '1280x720', '1920x1080', '1920x1200', '2560x1440', '2560x1600', '3440x1440', '3840x2160', '5120x1440', '7680x4320'];
  var SCREEN_PRESETS = [
    ['43″ 4K TV', 43, '16:9', '3840x2160'], ['50″ 4K TV', 50, '16:9', '3840x2160'], ['55″ 4K TV', 55, '16:9', '3840x2160'],
    ['65″ 4K TV', 65, '16:9', '3840x2160'], ['75″ 4K TV', 75, '16:9', '3840x2160'], ['85″ 4K TV', 85, '16:9', '3840x2160'],
    ['24″ 1080p', 24, '16:9', '1920x1080'], ['27″ 1440p', 27, '16:9', '2560x1440'], ['32″ 4K', 32, '16:9', '3840x2160'],
    ['34″ ultrawide', 34, '43:18', '3440x1440'], ['49″ super ultrawide', 49, '32:9', '5120x1440'],
    ['13.3″ laptop', 13.3, '16:10', '2560x1600'], ['14″ laptop', 14, '16:10', '1920x1200'], ['15.6″ laptop', 15.6, '16:9', '1920x1080'],
    ['11″ tablet', 11, '4:3', ''], ['6.1″ phone', 6.1, '19.5:9', '']
  ];
  var SCREEN_COLORS = ['#4f6bed', '#e0653a', '#2a9d6f', '#b9459b', '#c9a227', '#3aa0c9'];

  function feetInches(inches) {
    var t = Math.round(inches), ft = Math.floor(t / 12), i = t % 12;
    return ft ? ft + ' ft ' + i + ' in' : i + ' in';
  }

  Tools.register({
    id: 'screen-size-comparison', category: 'converters', name: 'TV & Screen Size Comparison',
    description: 'Compare TVs, monitors, laptops and phones to scale by width, height, area, pixel density and viewing distance.',
    keywords: ['tv size', 'screen size', 'monitor', 'ultrawide', 'ppi', 'viewing distance', 'compare'],
    render: function (root) {
      box(root);
      var state = { view: 'overlay', unit: 'in', screens: [
        { name: '55″ 4K TV', diag: 55, shape: '16:9', res: '3840x2160', cw: 16, ch: 9 },
        { name: '65″ 4K TV', diag: 65, shape: '16:9', res: '3840x2160', cw: 16, ch: 9 }] };
      var shared = takeParam('screens');
      if (shared) { try { var s = decodeState(shared); if (s && Array.isArray(s.screens) && s.screens.length) state = s; } catch (e) { /* ignore bad links */ } }

      var drawing = el('div', { dataset: { role: 'drawing' } });
      var summary = el('p', { dataset: { role: 'summary' } });
      var editors = el('div', { class: 'cv-grid', style: { gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))' } });
      var table = el('div', { dataset: { role: 'table' } });
      var shareOut = el('input', { type: 'text', readOnly: true, style: { width: '100%', display: 'none' }, dataset: { role: 'share' } });
      var viewChips = U.chips([{ value: 'overlay', label: 'Overlay' }, { value: 'centred', label: 'Centred' }, { value: 'side', label: 'Side by side' }], function (v) { state.view = v; draw(); }, state.view);
      var unitChips = U.chips([{ value: 'in', label: 'Inches' }, { value: 'cm', label: 'cm' }], function (v) { state.unit = v; draw(); }, state.unit);
      var addSel = U.select({ label: 'Add a screen', 'aria-label': 'Add a screen from a preset', dataset: { role: 'add' },
        options: [{ value: '', label: 'Choose a TV, monitor, laptop or phone…' }].concat(SCREEN_PRESETS.map(function (p, i) { return { value: String(i), label: p[0] }; })) });
      inp(addSel).addEventListener('change', function () {
        var v = inp(addSel).value; if (v === '') return;
        if (state.screens.length >= 6) { U.toast('Up to six screens at a time', 'err'); inp(addSel).value = ''; return; }
        var p = SCREEN_PRESETS[+v], sh = SHAPES.filter(function (x) { return x[0] === p[2]; })[0];
        state.screens.push({ name: p[0], diag: p[1], shape: p[2], res: p[3], cw: sh[2], ch: sh[3] });
        inp(addSel).value = '';
        buildEditors(); draw();
      });

      function geom(s) {
        var sh = SHAPES.filter(function (x) { return x[0] === s.shape; })[0];
        var a = s.shape === 'custom' ? s.cw : sh[2], b = s.shape === 'custom' ? s.ch : sh[3];
        if (!(a > 0 && b > 0 && s.diag > 0)) return null;
        var k = s.diag / Math.sqrt(a * a + b * b);
        return { w: a * k, h: b * k, area: a * b * k * k };
      }
      function len(inches, d) {
        return state.unit === 'in' ? inches.toFixed(d === undefined ? 1 : d) + ' in' : (inches * 2.54).toFixed(d === undefined ? 1 : d) + ' cm';
      }
      function dist(inches) {
        return state.unit === 'in' ? feetInches(inches) : (inches * 0.0254).toFixed(2) + ' m';
      }
      function area(sqin) {
        return state.unit === 'in' ? group(Math.round(sqin)) + ' sq in' : group(Math.round(sqin * 6.4516)) + ' cm²';
      }

      function buildEditors() {
        editors.replaceChildren();
        state.screens.forEach(function (s, i) {
          var name = U.input({ label: 'Screen name', value: s.name, 'aria-label': 'Screen name' });
          var diag = U.input({ label: 'Diagonal (in)', value: String(s.diag), 'aria-label': 'Diagonal', dataset: { role: 'diag' } });
          var shape = U.select({ label: 'Shape', 'aria-label': 'Aspect ratio', options: SHAPES.map(function (x) { return { value: x[0], label: x[1] }; }), value: s.shape });
          var cw = U.input({ label: 'Width part', type: 'number', value: String(s.cw || 16), step: 'any' });
          var ch = U.input({ label: 'Height part', type: 'number', value: String(s.ch || 9), step: 'any' });
          var custom = U.row(cw, ch);
          custom.style.display = s.shape === 'custom' ? '' : 'none';
          var res = U.select({ label: 'Resolution (for sharpness)', 'aria-label': 'Resolution',
            options: RESOLUTIONS.map(function (r) { return { value: r, label: r ? r.replace('x', ' × ') : 'Not set' }; }), value: s.res || '' });
          inp(name).addEventListener('input', function () { s.name = inp(name).value; draw(); });
          inp(diag).addEventListener('input', function () { s.diag = num(inp(diag).value); draw(); });
          inp(shape).addEventListener('change', function () { s.shape = inp(shape).value; custom.style.display = s.shape === 'custom' ? '' : 'none'; draw(); });
          inp(cw).addEventListener('input', function () { s.cw = num(inp(cw).value); draw(); });
          inp(ch).addEventListener('input', function () { s.ch = num(inp(ch).value); draw(); });
          inp(res).addEventListener('change', function () { s.res = inp(res).value; draw(); });
          editors.appendChild(el('div', { class: 'cv-card', style: { borderLeft: '6px solid ' + SCREEN_COLORS[i % 6] }, dataset: { screen: String(i) } },
            name, diag, shape, custom, res,
            state.screens.length > 1 ? U.button('Remove ' + s.name, function () { state.screens.splice(i, 1); buildEditors(); draw(); }, 'ghost') : null));
        });
      }

      function draw() {
        var gs = state.screens.map(geom);
        /* Drawing, largest first so smaller outlines stay visible on top. */
        var W = 640, pad = 10, H;
        var valid = state.screens.map(function (s, i) { return { s: s, g: gs[i], i: i }; }).filter(function (x) { return x.g; });
        if (!valid.length) { drawing.replaceChildren(U.note('Enter a diagonal for at least one screen.', 'err')); summary.textContent = ''; table.replaceChildren(); return; }
        var totalW = state.view === 'side' ? valid.reduce(function (a, x) { return a + x.g.w; }, 0) * 1.06 : Math.max.apply(null, valid.map(function (x) { return x.g.w; }));
        var maxH = Math.max.apply(null, valid.map(function (x) { return x.g.h; }));
        var k = Math.min((W - 2 * pad) / totalW, 360 / maxH);
        H = maxH * k + 2 * pad + 18;
        var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, style: 'width:100%;height:auto;display:block', role: 'img', 'aria-label': 'Screens drawn to scale' });
        var order = valid.slice().sort(function (a, b) { return b.g.area - a.g.area; });
        var xCursor = pad;
        (state.view === 'side' ? valid : order).forEach(function (x) {
          var w = x.g.w * k, h = x.g.h * k, left, top;
          if (state.view === 'overlay') { left = pad; top = pad + maxH * k - h; }
          else if (state.view === 'centred') { left = W / 2 - w / 2; top = pad + (maxH * k - h) / 2; }
          else { left = xCursor; top = pad + maxH * k - h; xCursor += w + totalW * 0.06 / Math.max(1, valid.length - 1) * k; }
          var c = SCREEN_COLORS[x.i % 6];
          svg.appendChild(svgEl('rect', { x: left, y: top, width: w, height: h, fill: c, 'fill-opacity': 0.12, stroke: c, 'stroke-width': 2 }));
          svg.appendChild(svgEl('text', { x: left + 6, y: top + 16, 'font-size': 13, fill: c, 'font-weight': 700 }, x.s.name));
          svg.appendChild(svgEl('text', { x: left + w - 6, y: top + h - 6, 'font-size': 12, fill: c, 'text-anchor': 'end' }, trimFixed(x.s.diag, 1) + '″'));
        });
        drawing.replaceChildren(svg);

        /* Summary sentences: every screen compared with the first one. */
        var first = valid[0];
        summary.textContent = valid.slice(1).map(function (x) {
          var pct = (x.g.area / first.g.area - 1) * 100, dw = x.g.w - first.g.w, dh = x.g.h - first.g.h;
          var areaPart = Math.abs(pct) < 0.05 ? 'the same screen area as ' + first.s.name :
            Math.abs(pct).toFixed(1) + '% ' + (pct > 0 ? 'more' : 'less') + ' screen area than ' + first.s.name;
          var wPart = Math.abs(dw) < 0.05 ? 'the same width' : len(Math.abs(dw)) + ' ' + (dw > 0 ? 'wider' : 'narrower');
          var hPart = Math.abs(dh) < 0.05 ? 'the same height' : len(Math.abs(dh)) + ' ' + (dh > 0 ? 'taller' : 'shorter');
          return x.s.name + ' has ' + areaPart + ', ' + wPart + ' and ' + hPart + '.';
        }).join(' ');

        var rows = [['Diagonal'], ['Width'], ['Height'], ['Screen area'], ['Compared with ' + first.s.name], ['Pixel density'], ['Pixels invisible beyond'], ['Viewing distance']];
        valid.forEach(function (x) {
          var g = x.g, r = x.s.res ? x.s.res.split('x').map(Number) : null;
          var pct = (g.area / first.g.area - 1) * 100;
          rows[0].push(len(x.s.diag)); rows[1].push(len(g.w)); rows[2].push(len(g.h)); rows[3].push(area(g.area));
          rows[4].push(x === first ? '·' : (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%');
          if (r) {
            var ppi = Math.sqrt(r[0] * r[0] + r[1] * r[1]) / x.s.diag;
            rows[5].push(Math.round(ppi) + ' PPI');
            rows[6].push(dist((g.w / r[0]) / Math.tan(Math.PI / 180 / 60)));
          } else { rows[5].push('Set a resolution'); rows[6].push('—'); }
          rows[7].push(dist(g.w / (2 * Math.tan(20 * Math.PI / 180))) + ' to ' + dist(g.w / (2 * Math.tan(15 * Math.PI / 180))));
        });
        var t = U.table([''].concat(valid.map(function (x) { return x.s.name; })), rows.map(function (r) {
          return [el('b', { text: r[0] })].concat(r.slice(1));
        }));
        table.replaceChildren(t);
      }

      root.appendChild(U.panel(null, el('div', { class: 'cv-flex' }, viewChips, unitChips,
        U.button('Share link', function () {
          var url = shareUrl('screens', encodeState(state), 'screen-size-comparison');
          shareOut.style.display = ''; shareOut.value = url; U.copy(url);
        }, 'ghost')), shareOut, drawing, summary));
      root.appendChild(U.panel(null, editors, el('div', { style: { marginTop: '10px' } }, addSel)));
      root.appendChild(U.panel(null, table,
        U.note('Viewing distance runs from the THX recommendation, where the screen fills about 40 degrees of your view for a cinema feel, to the SMPTE one of about 30 degrees for relaxed viewing. Pixels become invisible to 20/20 vision beyond the distance shown.')));
      buildEditors();
      draw();
    }
  });

  /* --- country size comparison (true size map) ------------------------------------ */

  var EARTH_R = 6371.0088;
  var COUNTRY_NAMES = {
    'United States of America': 'United States', 'Dem. Rep. Congo': 'DR Congo', 'Central African Rep.': 'Central African Republic',
    'S. Sudan': 'South Sudan', 'Bosnia and Herz.': 'Bosnia and Herzegovina', 'Dominican Rep.': 'Dominican Republic',
    'Eq. Guinea': 'Equatorial Guinea', 'Fr. S. Antarctic Lands': 'French Southern Territories', 'N. Cyprus': 'Northern Cyprus',
    'Macedonia': 'North Macedonia', 'eSwatini': 'Eswatini', 'Antigua and Barb.': 'Antigua and Barbuda',
    'St. Vin. and Gren.': 'Saint Vincent and the Grenadines', 'Fr. Polynesia': 'French Polynesia', 'Faeroe Is.': 'Faroe Islands',
    'S. Geo. and the Is.': 'South Georgia and the South Sandwich Islands', 'Br. Indian Ocean Ter.': 'British Indian Ocean Territory',
    'St. Kitts and Nevis': 'Saint Kitts and Nevis', 'St. Pierre and Miquelon': 'Saint Pierre and Miquelon', 'St-Martin': 'Saint Martin',
    'St-Barthélemy': 'Saint Barthélemy', 'Heard I. and McDonald Is.': 'Heard Island and McDonald Islands',
    'Indian Ocean Ter.': 'Australian Indian Ocean Territories', 'Wallis and Futuna Is.': 'Wallis and Futuna',
    'Ashmore and Cartier Is.': 'Ashmore and Cartier Islands', 'Côte d\'Ivoire': 'Ivory Coast (Côte d\'Ivoire)'
  };
  function countryName(n) {
    if (COUNTRY_NAMES[n]) return COUNTRY_NAMES[n];
    return n.replace(/ Is\.$/, ' Islands').replace(/^N\. /, 'Northern ');
  }
  var PLACE_COLORS = ['#e4572e', '#4f6bed', '#2a9d6f', '#b9459b', '#f3a712', '#17bebb', '#76b041', '#8e5572'];
  var EXAMPLES = [
    ['Greenland over Africa', [['Greenland', 23.6, -2.9]]],
    ['Russia on the equator', [['Russia', 32, 3]]],
    ['UK over the USA', [['United Kingdom', -98.5, 39.5]]],
    ['Australia over Europe', [['Australia', 15, 50]]],
    ['Brazil over the USA', [['Brazil', -98, 39]]]
  ];

  Tools.register({
    id: 'country-size-comparison', category: 'geo', name: 'True Size Map',
    description: 'Drag countries around a Mercator map to see their true size as they re-project at other latitudes.',
    keywords: ['true size', 'country size', 'mercator', 'map', 'greenland', 'compare countries', 'area'],
    render: function (root) {
      box(root);
      var unit = 'km';
      var placed = [];
      var countries = [], byName = {};
      var proj = null, pathGen = null, baseScale = 1;
      var svg = svgEl('svg', { class: 'cv-map', role: 'img', 'aria-label': 'World map' });
      var gBase = svgEl('g'), gPlaced = svgEl('g');
      svg.appendChild(gBase); svg.appendChild(gPlaced);
      var loading = U.note('Loading the world map…');
      var listBox = el('div', { dataset: { role: 'placed' } });
      var search = el('input', { type: 'search', placeholder: 'Search for a country', 'aria-label': 'Search for a country', dataset: { role: 'search' } });
      var sugg = el('ul', { class: 'cv-sugg' });
      var shareOut = el('input', { type: 'text', readOnly: true, style: { width: '100%', display: 'none' } });
      var dirty = false;

      function fmtArea(km2) {
        return unit === 'km' ? group(Math.round(km2 / 10) * 10) + ' km²' : group(Math.round(km2 / 2.589988110336 / 10) * 10) + ' sq mi';
      }

      /* Move a feature so its centroid sits at [lon, lat], rotating on the sphere so its real size is kept. */
      function moved(p) {
        if (p.lon === p.c0[0] && p.lat === p.c0[1]) return p.c.feature;
        var r0 = d3.geoRotation([-p.c0[0], -p.c0[1]]), r1 = d3.geoRotation([-p.lon, -p.lat]);
        var f = function (pt) { return r1.invert(r0(pt)); };
        var mapRings = function (poly) { return poly.map(function (ring) { return ring.map(f); }); };
        var g = p.c.feature.geometry;
        var geom = g.type === 'Polygon' ? { type: 'Polygon', coordinates: mapRings(g.coordinates) }
          : { type: 'MultiPolygon', coordinates: g.coordinates.map(mapRings) };
        return { type: 'Feature', properties: {}, geometry: geom };
      }
      function underneath(p) {
        var pt = [p.lon, p.lat], hit = null;
        countries.forEach(function (c) {
          if (hit || c === p.c) return;
          var b = c.bounds;
          var inLon = b[0][0] <= b[1][0] ? (pt[0] >= b[0][0] && pt[0] <= b[1][0]) : (pt[0] >= b[0][0] || pt[0] <= b[1][0]);
          if (!inLon || pt[1] < b[0][1] || pt[1] > b[1][1]) return;
          if (d3.geoContains(c.feature, pt)) hit = c;
        });
        return hit;
      }

      function setupProjection() {
        var W = svg.clientWidth || 800, H = Math.max(360, Math.round(W * 0.62));
        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        svg.style.height = H + 'px';
        baseScale = W / (2 * Math.PI);
        if (!proj) {
          proj = d3.geoMercator().scale(baseScale).translate([W / 2, H * 0.58]);
        } else {
          proj.scale(Math.max(baseScale, proj.scale()));
        }
        proj.clipExtent([[0, 0], [W, H]]);
        pathGen = d3.geoPath(proj);
      }
      function drawBase() {
        gBase.replaceChildren();
        countries.forEach(function (c) {
          var d = pathGen(c.feature);
          if (d) gBase.appendChild(svgEl('path', { class: 'base', d: d }, svgEl('title', {}, c.name)));
        });
      }
      function drawPlaced() {
        gPlaced.replaceChildren();
        placed.forEach(function (p, i) {
          var d = pathGen(moved(p));
          var path = svgEl('path', { class: 'placed', d: d || '', fill: p.color, dataset: null }, svgEl('title', {}, p.c.name));
          path.dataset.country = p.c.name;
          path.addEventListener('pointerdown', function (e) { startDrag(e, p); });
          gPlaced.appendChild(path);
        });
      }
      var raf = 0;
      function redraw(all) {
        if (raf) return;
        raf = requestAnimationFrame(function () { raf = 0; if (all) drawBase(); drawPlaced(); drawList(); });
      }
      function drawList() {
        listBox.replaceChildren();
        if (!placed.length) { listBox.appendChild(U.note('Search above to add a country, or pick one of the examples.')); return; }
        var ul = el('ul', { style: { listStyle: 'none', padding: 0 } });
        placed.forEach(function (p, i) {
          var under = underneath(p);
          var lines = [el('b', { style: { color: p.color }, text: p.c.name }), ' · ' + fmtArea(p.c.area)];
          var detail = [];
          if (under) {
            var r = p.c.area / under.area, rel;
            if (r >= 0.87 && r <= 1.15) rel = 'about the same size as ' + under.name;
            else if (r > 1) rel = (r < 10 ? trimFixed(r, 1) : Math.round(r)) + ' times the size of ' + under.name;
            else rel = Math.max(1, Math.round(r * 100)) + '% the size of ' + under.name;
            detail.push(el('p', { dataset: { role: 'over' }, text: 'Over ' + under.name + ' (' + fmtArea(under.area) + '): ' + p.c.name + ' is ' + rel + '.' }));
          }
          var f = 1 / Math.pow(Math.cos(p.lat * Math.PI / 180), 2);
          if (f >= 1.1) detail.push(U.note('Drawn ' + (f < 10 ? f.toFixed(1) : Math.round(f)) + ' times bigger here than it would be at the equator.'));
          ul.appendChild(el('li', { class: 'cv-card', style: { marginBottom: '6px' }, dataset: { country: p.c.name } },
            el('div', {}, lines), detail,
            U.btnrow(U.button('Put ' + p.c.name + ' back', function () { p.lon = p.c0[0]; p.lat = p.c0[1]; redraw(); }, 'ghost'),
              U.button('Remove ' + p.c.name, function () { placed.splice(i, 1); redraw(); }, 'ghost'))));
        });
        listBox.appendChild(ul);
      }

      function add(name, lon, lat) {
        var c = byName[name];
        if (!c) return null;
        var p = { c: c, c0: c.centroid, lon: lon === undefined ? c.centroid[0] : lon, lat: lat === undefined ? c.centroid[1] : lat,
          color: PLACE_COLORS[placed.length % PLACE_COLORS.length] };
        placed.push(p);
        return p;
      }

      /* Dragging: a country moves with the pointer; the sea pans the map. */
      var drag = null;
      function pointerPos(e) {
        var r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
        return [(e.clientX - r.left) * vb.width / r.width, (e.clientY - r.top) * vb.height / r.height];
      }
      function startDrag(e, p) {
        e.stopPropagation(); e.preventDefault();
        var g = proj.invert(pointerPos(e));
        drag = { kind: 'country', p: p, grab: g, lon: p.lon, lat: p.lat };
        svg.setPointerCapture(e.pointerId);
      }
      svg.addEventListener('pointerdown', function (e) {
        if (drag || !proj) return;
        drag = { kind: 'pan', start: pointerPos(e), t: proj.translate() };
        svg.setPointerCapture(e.pointerId);
      });
      svg.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var pos = pointerPos(e);
        if (drag.kind === 'country') {
          var g = proj.invert(pos);
          if (!g || !isFinite(g[0])) return;
          var lon = drag.lon + (g[0] - drag.grab[0]);
          lon = ((lon + 540) % 360) - 180;
          drag.p.lon = lon;
          drag.p.lat = Math.max(-80, Math.min(80, drag.lat + (g[1] - drag.grab[1])));
          redraw();
        } else {
          proj.translate([drag.t[0] + pos[0] - drag.start[0], drag.t[1] + pos[1] - drag.start[1]]);
          redraw(true);
        }
      });
      function endDrag() { drag = null; }
      svg.addEventListener('pointerup', endDrag);
      svg.addEventListener('pointercancel', endDrag);
      function zoom(factor, at) {
        if (!proj) return;
        var vb = svg.viewBox.baseVal;
        at = at || [vb.width / 2, vb.height / 2];
        var s0 = proj.scale(), s1 = Math.max(baseScale, Math.min(baseScale * 24, s0 * factor)), t = proj.translate();
        var k = s1 / s0;
        proj.scale(s1).translate([at[0] - (at[0] - t[0]) * k, at[1] - (at[1] - t[1]) * k]);
        redraw(true);
      }
      svg.addEventListener('wheel', function (e) { e.preventDefault(); zoom(e.deltaY < 0 ? 1.25 : 0.8, pointerPos(e)); }, { passive: false });

      search.addEventListener('input', function () {
        var q = search.value.trim().toLowerCase();
        sugg.replaceChildren();
        if (!q || !countries.length) return;
        countries.filter(function (c) { return c.name.toLowerCase().indexOf(q) > -1; })
          .sort(function (a, b) { return (a.name.toLowerCase().indexOf(q) === 0 ? 0 : 1) - (b.name.toLowerCase().indexOf(q) === 0 ? 0 : 1) || a.name.localeCompare(b.name); })
          .slice(0, 12).forEach(function (c) {
            sugg.appendChild(el('li', {}, el('button', { class: 'btn ghost', type: 'button', onclick: function () {
              if (!placed.some(function (p) { return p.c === c; })) add(c.name);
              search.value = ''; sugg.replaceChildren(); redraw();
            } }, el('span', { text: c.name }), el('span', { class: 'cv-muted', text: fmtArea(c.area) }))));
          });
      });

      var unitChips = U.chips([{ value: 'km', label: 'km²' }, { value: 'mi', label: 'sq mi' }], function (u) { unit = u; search.dispatchEvent(new Event('input')); redraw(); }, 'km');
      var examples = el('div', { class: 'chips' }, EXAMPLES.map(function (ex) {
        return el('button', { class: 'chip', type: 'button', onclick: function () {
          if (!countries.length) return;
          placed = [];
          ex[1].forEach(function (a) { add(a[0], a[1], a[2]); });
          redraw();
        } }, ex[0]);
      }));

      root.appendChild(U.panel(null, el('div', { class: 'cv-flex' }, unitChips), examples,
        el('div', { style: { marginTop: '8px' } }, search, sugg), loading,
        el('div', { style: { position: 'relative' } }, svg,
          el('div', { style: { position: 'absolute', right: '8px', top: '8px', display: 'flex', flexDirection: 'column', gap: '4px' } },
            el('button', { class: 'btn', type: 'button', 'aria-label': 'Zoom in', onclick: function () { zoom(1.5); } }, '+'),
            el('button', { class: 'btn', type: 'button', 'aria-label': 'Zoom out', onclick: function () { zoom(1 / 1.5); } }, '−'))),
        U.note("Drag a coloured country anywhere. Watch it grow toward the poles and shrink toward the equator: its real size never changes, only the map's stretching does. Drag the sea to move the map, scroll or use + and − to zoom.")));
      root.appendChild(U.panel('Countries on the map', U.btnrow(
        U.button('Share this map', function () {
          var data = { u: unit, p: placed.map(function (p) { return [p.c.name, +p.lon.toFixed(3), +p.lat.toFixed(3)]; }) };
          var url = shareUrl('map', encodeState(data), 'country-size-comparison');
          shareOut.style.display = ''; shareOut.value = url; U.copy(url);
        }, 'ghost'),
        U.button('Clear', function () { placed = []; redraw(); }, 'ghost')), shareOut, listBox,
        U.note('Areas are measured from the map shapes on a round Earth, so they can differ by a few percent from official figures that count lakes and coastal waters differently. Western Sahara is shown as part of Morocco.')));

      var sharedMap = takeParam('map');
      Promise.all([U.script('assets/vendor/d3/d3-array.min.js').then(function () { return U.script('assets/vendor/d3/d3-geo.min.js'); }),
        U.script('assets/vendor/topojson/topojson-client.min.js'),
        fetch('assets/vendor/world-atlas/countries-50m.json').then(function (r) { if (!r.ok) throw new Error('Could not load the world map'); return r.json(); })])
        .then(function (res) {
          var topo = res[2], geoms = topo.objects.countries.geometries;
          var morocco = geoms.filter(function (g) { return g.properties.name === 'Morocco'; });
          var sahara = geoms.filter(function (g) { return g.properties.name === 'W. Sahara'; });
          geoms.forEach(function (g) {
            var n = g.properties.name;
            if (n === 'W. Sahara') return;
            var feature = n === 'Morocco' && sahara.length
              ? { type: 'Feature', properties: {}, geometry: topojson.merge(topo, morocco.concat(sahara)) }
              : topojson.feature(topo, g);
            if (!feature.geometry) return;
            var c = { name: countryName(n), feature: feature };
            c.area = d3.geoArea(feature) * EARTH_R * EARTH_R;
            c.centroid = d3.geoCentroid(feature);
            c.bounds = d3.geoBounds(feature);
            countries.push(c); byName[c.name] = c;
          });
          countries.sort(function (a, b) { return a.name.localeCompare(b.name); });
          loading.remove();
          setupProjection();
          var loaded = false;
          if (sharedMap) {
            try {
              var s = decodeState(sharedMap);
              if (s.u === 'mi') { unit = 'mi'; unitChips.children[1].click(); }
              (s.p || []).forEach(function (a) { add(a[0], a[1], a[2]); });
              loaded = placed.length > 0;
            } catch (e) { /* ignore a bad link */ }
          }
          if (!loaded) EXAMPLES[0][1].forEach(function (a) { add(a[0], a[1], a[2]); });
          drawBase(); drawPlaced(); drawList();
          root.dataset.ready = '1';
        })
        .catch(function (err) { loading.className = 'note err'; loading.textContent = 'The world map could not be loaded: ' + (err.message || err); });

      var onResize = U.debounce(function () { if (proj) { setupProjection(); redraw(true); } }, 150);
      window.addEventListener('resize', onResize);
      U.onTeardown(root, function () { window.removeEventListener('resize', onResize); if (raf) cancelAnimationFrame(raf); });
    }
  });

  /* --- room planner ------------------------------------------------------------------ */

  var FURNITURE = [
    ['Beds', [['Single bed 90×200', 90, 200], ['Double bed 140×200', 140, 200], ['Bed 160×200', 160, 200], ['Bed 180×200', 180, 200],
      ['US Twin', 97, 191], ['US Full', 137, 191], ['US Queen', 152, 203], ['US King', 193, 203]]],
    ['Bedroom', [['Bedside table', 45, 40], ['Wardrobe, 2 doors', 100, 60], ['Wardrobe, 3 doors', 150, 60], ['Chest of drawers', 80, 45]]],
    ['Living', [['Sofa, 2 seats', 160, 90], ['Sofa, 3 seats', 210, 90], ['Corner sofa', 250, 170], ['Armchair', 85, 85],
      ['Coffee table', 110, 60], ['TV unit', 160, 40], ['Bookcase', 80, 30], ['Rug 160×230', 160, 230, 'rug']]],
    ['Dining', [['Dining table, 4 seats', 120, 80], ['Dining table, 6 seats', 180, 90], ['Round table', 100, 100, 'round'], ['Chair', 45, 50]]],
    ['Office', [['Desk', 120, 60], ['Office chair', 60, 60]]],
    ['Kitchen & bath', [['Fridge', 70, 70], ['Kitchen counter', 240, 60], ['Washing machine', 60, 60], ['Bathtub', 170, 75],
      ['Shower', 90, 90], ['Toilet', 40, 70]]],
    ['Doors & walls', [['Door (swing)', 80, 80, 'door'], ['Custom item', 100, 50]]]
  ];
  var ROOM_KEY = 'att-room-plan';
  var ROOM_COLORS = ['#8fb3e8', '#e8b98f', '#9fd6a8', '#d6a3cf', '#e8dc8f', '#9fd3d6', '#c4b0e8', '#e8a3a3'];

  function defaultPlan() {
    return { unit: window.Region && Region.imperial() ? 'ft' : 'm', w: 400, l: 350, snap: true, items: [
      { id: 1, name: 'Bed 160×200', w: 160, d: 200, x: 120, y: 0, rot: 0, color: ROOM_COLORS[0] },
      { id: 2, name: 'Bedside table', w: 45, d: 40, x: 70, y: 0, rot: 0, color: ROOM_COLORS[1] },
      { id: 3, name: 'Bedside table', w: 45, d: 40, x: 285, y: 0, rot: 0, color: ROOM_COLORS[1] },
      { id: 4, name: 'Wardrobe, 3 doors', w: 150, d: 60, x: 250, y: 290, rot: 0, color: ROOM_COLORS[2] }] };
  }

  function fmtLen(cm, unit) {
    if (!isFinite(cm)) return '—';
    if (unit === 'ft') {
      var t = Math.round(cm / 2.54), ft = Math.floor(t / 12), i = t % 12;
      return ft ? ft + "'" + (i ? ' ' + i + '"' : '') : i + '"';
    }
    return cm < 100 ? Math.round(cm) + ' cm' : (cm / 100).toFixed(2) + ' m';
  }
  /* Accepts 3.6 m, 360, 360 cm, 11'10", 11 ft 10 in, 142 in, 1200 mm. */
  function parseLen(text, unit) {
    var t = String(text).trim().toLowerCase().replace(/,/g, '.').replace(/[’′]/g, "'").replace(/[”″]/g, '"');
    if (!t) return NaN;
    var m = t.match(/^(\d+(?:\.\d+)?)\s*(?:'|ft|feet|foot)\s*(?:(\d+(?:\.\d+)?)\s*(?:"|in|inch|inches)?)?$/);
    if (m) return (parseFloat(m[1]) * 12 + (m[2] ? parseFloat(m[2]) : 0)) * 2.54;
    m = t.match(/^(\d+(?:\.\d+)?)\s*(mm|cm|m|in|inch|inches|")?$/);
    if (!m) return NaN;
    var v = parseFloat(m[1]), u = m[2];
    if (u === 'mm') return v / 10;
    if (u === 'cm') return v;
    if (u === 'm') return v * 100;
    if (u === 'in' || u === 'inch' || u === 'inches' || u === '"') return v * 2.54;
    if (unit === 'ft') return v <= 30 ? v * 30.48 : v * 2.54;
    return v <= 30 ? v * 100 : v;
  }

  Tools.register({
    id: 'room-planner', category: 'home', name: 'Room Planner',
    description: 'Draw a room to scale and arrange furniture at real sizes, with overlap warnings, PNG export and a share link.',
    keywords: ['room planner', 'floor plan', 'furniture layout', 'bedroom layout', 'will it fit', 'interior'],
    render: function (root) {
      box(root);
      var plan = store(ROOM_KEY);
      if (!plan || !Array.isArray(plan.items)) plan = defaultPlan();
      var selected = null, undo = [], cat = 'Beds', nextId = 1;
      plan.items.forEach(function (it) { nextId = Math.max(nextId, it.id + 1); });

      var svg = svgEl('svg', { tabindex: '0', role: 'application', 'aria-label': 'Room plan' });
      var coverage = el('p', { dataset: { role: 'coverage' } });
      var warnings = el('div', { dataset: { role: 'warnings' } });
      var snapBox = U.checkbox('Snap to 5 cm', { checked: plan.snap !== false });
      var wIn = el('input', { type: 'text', 'aria-label': 'Room width', dataset: { role: 'room-w' } });
      var lIn = el('input', { type: 'text', 'aria-label': 'Room length', dataset: { role: 'room-l' } });
      var areaNote = U.note('');
      var unitChips = el('div');
      var editor = el('div', { dataset: { role: 'editor' } });
      var catChips = el('div');
      var catItems = el('div', { class: 'cv-cat-items', dataset: { role: 'catalog' } });
      var shareOut = el('input', { type: 'text', readOnly: true, style: { width: '100%', display: 'none' }, dataset: { role: 'share' } });

      function snapshot() { undo.push(JSON.stringify(plan)); if (undo.length > 100) undo.shift(); }
      function save() { store(ROOM_KEY, plan); }
      function doUndo() {
        if (!undo.length) { U.toast('Nothing to undo'); return; }
        plan = JSON.parse(undo.pop());
        if (selected && !find(selected.id)) selected = null; else if (selected) selected = find(selected.id);
        refreshRoomInputs(); drawAll();
      }
      function find(id) { return plan.items.filter(function (i) { return i.id === id; })[0] || null; }
      function dimsOf(it) { return it.rot % 180 === 0 ? { w: it.w, d: it.d } : { w: it.d, d: it.w }; }
      function snapV(v) { return snapBox.input.checked ? Math.round(v / 5) * 5 : Math.round(v); }

      function problems() {
        var out = [], bad = {};
        plan.items.forEach(function (a, i) {
          var da = dimsOf(a);
          if (a.x < -0.01 || a.y < -0.01 || a.x + da.w > plan.w + 0.01 || a.y + da.d > plan.l + 0.01) {
            out.push(a.name + ' sticks out of the room.'); bad[a.id] = true;
          }
          if (a.kind === 'rug') return;
          plan.items.slice(i + 1).forEach(function (b) {
            if (b.kind === 'rug') return;
            var db = dimsOf(b);
            var ox = Math.min(a.x + da.w, b.x + db.w) - Math.max(a.x, b.x);
            var oy = Math.min(a.y + da.d, b.y + db.d) - Math.max(a.y, b.y);
            if (ox > 0.5 && oy > 0.5) { out.push(a.name + ' overlaps ' + b.name + '.'); bad[a.id] = bad[b.id] = true; }
          });
        });
        return { list: out, bad: bad };
      }

      function drawPlan() {
        var m = 40;
        svg.setAttribute('viewBox', (-m) + ' ' + (-m) + ' ' + (plan.w + 2 * m) + ' ' + (plan.l + 2 * m));
        svg.replaceChildren();
        svg.appendChild(svgEl('rect', { x: 0, y: 0, width: plan.w, height: plan.l, fill: '#fbfaf7', stroke: '#333', 'stroke-width': 4 }));
        for (var gx = 50; gx < plan.w; gx += 50) svg.appendChild(svgEl('line', { x1: gx, y1: 0, x2: gx, y2: plan.l, stroke: '#e3e0d8', 'stroke-width': 1 }));
        for (var gy = 50; gy < plan.l; gy += 50) svg.appendChild(svgEl('line', { x1: 0, y1: gy, x2: plan.w, y2: gy, stroke: '#e3e0d8', 'stroke-width': 1 }));
        var fs = Math.max(9, Math.min(plan.w, plan.l) / 28);
        svg.appendChild(svgEl('text', { x: plan.w / 2, y: -12, 'text-anchor': 'middle', 'font-size': fs * 1.1, fill: '#555' }, fmtLen(plan.w, plan.unit)));
        svg.appendChild(svgEl('text', { x: -12, y: plan.l / 2, 'text-anchor': 'middle', 'font-size': fs * 1.1, fill: '#555', transform: 'rotate(-90 ' + (-12) + ' ' + (plan.l / 2) + ')' }, fmtLen(plan.l, plan.unit)));
        var pr = problems();
        plan.items.slice().sort(function (a, b) { return (a.kind === 'rug' ? 0 : 1) - (b.kind === 'rug' ? 0 : 1); }).forEach(function (it) {
          var d = dimsOf(it), sel = selected && selected.id === it.id;
          var g = svgEl('g', { transform: 'translate(' + it.x + ' ' + it.y + ')', style: 'cursor:move' });
          g.dataset.item = String(it.id);
          var stroke = pr.bad[it.id] ? '#d33' : sel ? '#2447d8' : '#555';
          if (it.kind === 'door') {
            var r = Math.min(d.w, d.d);
            var hinge = [[0, 0], [d.w, 0], [d.w, d.d], [0, d.d]][(it.rot / 90) % 4];
            var cx = hinge[0], cy = hinge[1];
            var sx = cx === 0 ? 1 : -1, sy = cy === 0 ? 1 : -1;
            g.appendChild(svgEl('rect', { x: 0, y: 0, width: d.w, height: d.d, fill: 'rgba(0,0,0,0.02)', stroke: 'none' }));
            g.appendChild(svgEl('path', { d: 'M' + cx + ' ' + cy + ' L' + (cx + sx * r) + ' ' + cy + ' A' + r + ' ' + r + ' 0 0 ' + (sx * sy > 0 ? 1 : 0) + ' ' + cx + ' ' + (cy + sy * r) + ' Z',
              fill: 'rgba(120,120,120,.12)', stroke: stroke, 'stroke-width': sel ? 3 : 2, 'stroke-dasharray': '6 4' }));
            g.appendChild(svgEl('line', { x1: cx, y1: cy, x2: cx, y2: cy + sy * r, stroke: stroke, 'stroke-width': 4 }));
          } else if (it.kind === 'round') {
            g.appendChild(svgEl('ellipse', { cx: d.w / 2, cy: d.d / 2, rx: d.w / 2, ry: d.d / 2, fill: it.color, 'fill-opacity': 0.8, stroke: stroke, 'stroke-width': sel ? 3 : 1.5 }));
          } else {
            g.appendChild(svgEl('rect', { x: 0, y: 0, width: d.w, height: d.d, rx: 3, fill: it.color, 'fill-opacity': it.kind === 'rug' ? 0.35 : 0.8,
              stroke: stroke, 'stroke-width': sel ? 3 : 1.5, 'stroke-dasharray': it.kind === 'rug' ? '8 5' : null }));
          }
          var lf = Math.max(7, Math.min(fs, d.w / 8, d.d / 3));
          g.appendChild(svgEl('text', { x: d.w / 2, y: d.d / 2 - lf * 0.2, 'text-anchor': 'middle', 'font-size': lf, fill: '#222', 'pointer-events': 'none' }, it.name));
          g.appendChild(svgEl('text', { x: d.w / 2, y: d.d / 2 + lf * 1.0, 'text-anchor': 'middle', 'font-size': lf * 0.85, fill: '#444', 'pointer-events': 'none' }, fmtLen(it.w, plan.unit) + ' × ' + fmtLen(it.d, plan.unit)));
          g.addEventListener('pointerdown', function (e) { startDrag(e, it); });
          svg.appendChild(g);
        });
        var covered = plan.items.filter(function (it) { return it.kind !== 'door' && it.kind !== 'rug'; })
          .reduce(function (a, it) { return a + (it.kind === 'round' ? Math.PI * it.w * it.d / 4 : it.w * it.d); }, 0);
        coverage.textContent = 'Floor covered: ' + Math.round(covered / (plan.w * plan.l) * 100) + '%';
        warnings.replaceChildren.apply(warnings, pr.list.map(function (t) { return el('p', { class: 'cv-warn', text: '⚠ ' + t }); }));
      }

      function drawEditor() {
        editor.replaceChildren();
        if (!selected) { editor.appendChild(U.note('Select an item on the plan to rename, resize, rotate or remove it.')); return; }
        var it = selected;
        var name = el('input', { type: 'text', value: it.name, 'aria-label': 'Item name', dataset: { role: 'item-name' } });
        var w = el('input', { type: 'text', value: fmtLen(it.w, plan.unit), 'aria-label': 'Item width', dataset: { role: 'item-w' } });
        var d = el('input', { type: 'text', value: fmtLen(it.d, plan.unit), 'aria-label': 'Item depth', dataset: { role: 'item-d' } });
        name.addEventListener('focus', snapshot, { once: true });
        name.addEventListener('input', function () { it.name = name.value; drawPlan(); save(); });
        [[w, 'w'], [d, 'd']].forEach(function (p) {
          p[0].addEventListener('change', function () {
            var v = parseLen(p[0].value, plan.unit);
            if (!(v >= 5 && v <= 2000)) { U.toast('Enter a size such as 90 cm, 1.2 m or 3\'', 'err'); p[0].value = fmtLen(it[p[1]], plan.unit); return; }
            snapshot(); it[p[1]] = Math.round(v * 10) / 10; p[0].value = fmtLen(v, plan.unit); drawAll();
          });
        });
        editor.appendChild(el('div', { class: 'field' }, el('label', { text: 'Name' }), name));
        editor.appendChild(U.row(el('div', { class: 'field' }, el('label', { text: 'Width' }), w), el('div', { class: 'field' }, el('label', { text: 'Depth' }), d)));
        var pos = U.note(fmtLen(it.x, plan.unit) + ' from the left wall · ' + fmtLen(it.y, plan.unit) + ' from the top wall');
        pos.dataset.role = 'item-pos';
        editor.appendChild(pos);
        editor.appendChild(U.btnrow(U.button('Rotate', rotate), U.button('Duplicate', duplicate, 'ghost'), U.button('Delete', remove, 'ghost')));
      }
      function drawCatalog() {
        catChips.replaceChildren(U.chips(FURNITURE.map(function (c) { return c[0]; }), function (c) { cat = c; drawCatalog(); }, cat));
        var group = FURNITURE.filter(function (c) { return c[0] === cat; })[0];
        catItems.replaceChildren.apply(catItems, group[1].map(function (f) {
          return el('button', { class: 'btn ghost', type: 'button', onclick: function () { addItem(f); } },
            el('span', { text: f[0] }), el('small', { text: fmtLen(f[1], plan.unit) + ' × ' + fmtLen(f[2], plan.unit) }));
        }));
      }
      function drawAll() { drawPlan(); drawEditor(); save(); }
      function refreshRoomInputs() {
        wIn.value = fmtLen(plan.w, plan.unit); lIn.value = fmtLen(plan.l, plan.unit);
        var a = plan.w * plan.l / 10000;
        areaNote.textContent = (plan.unit === 'ft' ? 'Floor area ' + (a * 10.7639).toFixed(0) + ' sq ft' : 'Floor area ' + a.toFixed(1) + ' m²') +
          '. Type 3.6 m, 360, 11\'10" or 142 in.';
        unitChips.replaceChildren(U.chips([{ value: 'm', label: 'm / cm' }, { value: 'ft', label: 'ft / in' }], function (u) {
          plan.unit = u; refreshRoomInputs(); drawCatalog(); drawAll();
        }, plan.unit));
        snapBox.input.checked = plan.snap !== false;
      }

      function addItem(f) {
        snapshot();
        var it = { id: nextId++, name: f[0], w: f[1], d: f[2], rot: 0, kind: f[3], color: ROOM_COLORS[(nextId - 1) % ROOM_COLORS.length] };
        it.x = Math.max(0, snapV((plan.w - it.w) / 2)); it.y = Math.max(0, snapV((plan.l - it.d) / 2));
        plan.items.push(it); selected = it; drawAll();
      }
      function rotate() {
        if (!selected) return;
        snapshot();
        var before = dimsOf(selected), cx = selected.x + before.w / 2, cy = selected.y + before.d / 2;
        selected.rot = (selected.rot + 90) % 360;
        var after = dimsOf(selected);
        selected.x = snapV(cx - after.w / 2); selected.y = snapV(cy - after.d / 2);
        drawAll();
      }
      function duplicate() {
        if (!selected) return;
        snapshot();
        var copy = JSON.parse(JSON.stringify(selected));
        copy.id = nextId++; copy.x = selected.x + 20; copy.y = selected.y + 20;
        plan.items.push(copy); selected = copy; drawAll();
      }
      function remove() {
        if (!selected) return;
        snapshot();
        plan.items = plan.items.filter(function (i) { return i.id !== selected.id; });
        selected = null; drawAll();
      }

      /* Pointer dragging in room coordinates. */
      function toRoom(e) {
        var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
        var m = svg.getScreenCTM();
        var p = m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
        return { x: p.x, y: p.y };
      }
      var drag = null;
      function startDrag(e, it) {
        e.preventDefault(); e.stopPropagation();
        selected = it; svg.focus();
        var p = toRoom(e);
        drag = { it: it, dx: p.x - it.x, dy: p.y - it.y, moved: false, snap: JSON.stringify(plan) };
        svg.setPointerCapture(e.pointerId);
        drawPlan(); drawEditor();
      }
      svg.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var p = toRoom(e);
        var nx = snapV(p.x - drag.dx), ny = snapV(p.y - drag.dy);
        if (nx === drag.it.x && ny === drag.it.y) return;
        if (!drag.moved) { undo.push(drag.snap); drag.moved = true; }
        drag.it.x = nx; drag.it.y = ny;
        drawPlan();
      });
      function endDrag() { if (drag) { if (drag.moved) { drawEditor(); save(); } drag = null; } }
      svg.addEventListener('pointerup', endDrag);
      svg.addEventListener('pointercancel', endDrag);
      svg.addEventListener('pointerdown', function () { if (selected) { selected = null; drawPlan(); drawEditor(); } });

      root.addEventListener('keydown', function (e) {
        var tag = (e.target.tagName || '').toLowerCase();
        var typing = tag === 'input' || tag === 'textarea' || tag === 'select';
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); doUndo(); return; }
        if (typing || !selected) return;
        var step = e.shiftKey ? 10 : (snapBox.input.checked ? 5 : 1);
        var moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        if (moves[e.key]) {
          e.preventDefault(); snapshot();
          selected.x += moves[e.key][0]; selected.y += moves[e.key][1]; drawAll();
        } else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); rotate(); }
        else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(); }
        else if (e.key === 'Escape') { selected = null; drawPlan(); drawEditor(); }
      });

      [[wIn, 'w'], [lIn, 'l']].forEach(function (p) {
        p[0].addEventListener('change', function () {
          var v = parseLen(p[0].value, plan.unit);
          if (!(v >= 50 && v <= 5000)) { U.toast('Enter a room size such as 3.6 m, 360, 11\'10" or 142 in', 'err'); refreshRoomInputs(); return; }
          snapshot(); plan[p[1]] = Math.round(v * 10) / 10; refreshRoomInputs(); drawAll();
        });
      });
      snapBox.input.addEventListener('change', function () { plan.snap = snapBox.input.checked; save(); });

      function toPng() {
        var scale = 2, m = 40, W = (plan.w + 2 * m) * scale, H = (plan.l + 2 * m) * scale;
        var c = document.createElement('canvas'); c.width = W; c.height = H;
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
        ctx.scale(scale, scale); ctx.translate(m, m);
        ctx.fillStyle = '#fbfaf7'; ctx.fillRect(0, 0, plan.w, plan.l);
        ctx.strokeStyle = '#e3e0d8'; ctx.lineWidth = 1;
        for (var gx = 50; gx < plan.w; gx += 50) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, plan.l); ctx.stroke(); }
        for (var gy = 50; gy < plan.l; gy += 50) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(plan.w, gy); ctx.stroke(); }
        ctx.strokeStyle = '#333'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, plan.w, plan.l);
        var fs = Math.max(9, Math.min(plan.w, plan.l) / 28);
        ctx.fillStyle = '#555'; ctx.textAlign = 'center'; ctx.font = (fs * 1.1) + 'px sans-serif';
        ctx.fillText(fmtLen(plan.w, plan.unit), plan.w / 2, -12);
        ctx.save(); ctx.translate(-12, plan.l / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(fmtLen(plan.l, plan.unit), 0, 0); ctx.restore();
        var bad = problems().bad;
        plan.items.slice().sort(function (a, b) { return (a.kind === 'rug' ? 0 : 1) - (b.kind === 'rug' ? 0 : 1); }).forEach(function (it) {
          var d = dimsOf(it);
          ctx.save(); ctx.translate(it.x, it.y);
          ctx.globalAlpha = it.kind === 'rug' ? 0.35 : it.kind === 'door' ? 0.15 : 0.8;
          ctx.fillStyle = it.kind === 'door' ? '#888' : it.color;
          if (it.kind === 'round') { ctx.beginPath(); ctx.ellipse(d.w / 2, d.d / 2, d.w / 2, d.d / 2, 0, 0, Math.PI * 2); ctx.fill(); }
          else ctx.fillRect(0, 0, d.w, d.d);
          ctx.globalAlpha = 1; ctx.strokeStyle = bad[it.id] ? '#d33' : '#555'; ctx.lineWidth = 1.5;
          if (it.kind === 'round') ctx.stroke(); else ctx.strokeRect(0, 0, d.w, d.d);
          var lf = Math.max(7, Math.min(fs, d.w / 8, d.d / 3));
          ctx.fillStyle = '#222'; ctx.font = lf + 'px sans-serif';
          ctx.fillText(it.name, d.w / 2, d.d / 2 - lf * 0.2);
          ctx.font = (lf * 0.85) + 'px sans-serif';
          ctx.fillText(fmtLen(it.w, plan.unit) + ' × ' + fmtLen(it.d, plan.unit), d.w / 2, d.d / 2 + lf);
          ctx.restore();
        });
        return c;
      }

      function share() {
        U.script('assets/vendor/pako/pako.min.js').then(function () {
          var data = pako.deflate(new TextEncoder().encode(JSON.stringify(plan)));
          var url = shareUrl('plan', b64url(data), 'room-planner');
          shareOut.style.display = ''; shareOut.value = url; U.copy(url);
        }).catch(function (err) { U.toast(err.message || String(err), 'err'); });
      }

      root.appendChild(el('div', { class: 'panel cv-room' }, svg, el('div', { class: 'cv-flex', style: { justifyContent: 'space-between', marginTop: '8px' } }, coverage, snapBox),
        warnings, U.note('Drag to move. Select an item, then press R to rotate, arrow keys to nudge, Delete to remove. Ctrl+Z undoes.')));
      root.appendChild(U.panel(null, editor));
      root.appendChild(U.panel('Room', unitChips, U.row(el('div', { class: 'field' }, el('label', { text: 'Width' }), wIn),
        el('div', { class: 'field' }, el('label', { text: 'Length' }), lIn)), areaNote));
      root.appendChild(U.panel('Add furniture', catChips, catItems));
      root.appendChild(U.panel(null, U.btnrow(
        U.button('Share plan', share),
        U.button('PNG', function () { toPng().toBlob(function (b) { U.saveBlob('room-plan.png', b); }, 'image/png'); }, 'ghost'),
        U.button('Undo', doUndo, 'ghost'),
        U.button('Clear room', function () { snapshot(); plan.items = []; selected = null; drawAll(); }, 'ghost')), shareOut,
        U.note('Furniture sizes are typical and can be changed to match yours. Your plan is saved in this browser automatically.')));

      root.roomPlanner = { plan: function () { return plan; }, png: toPng };
      refreshRoomInputs(); drawCatalog(); drawAll();

      var sharedPlan = takeParam('plan');
      if (sharedPlan) {
        U.script('assets/vendor/pako/pako.min.js').then(function () {
          var p = JSON.parse(new TextDecoder().decode(pako.inflate(unb64url(sharedPlan))));
          if (!p || !Array.isArray(p.items) || !(p.w > 0) || !(p.l > 0)) throw new Error('bad plan');
          snapshot(); plan = p; selected = null;
          plan.items.forEach(function (it) { nextId = Math.max(nextId, it.id + 1); });
          refreshRoomInputs(); drawCatalog(); drawAll();
          U.toast('Loaded the shared plan');
        }).catch(function () { U.toast('That share link could not be read', 'err'); });
      }
    }
  });

  /* --- Cooking Converter --------------------------------------------------- */

  /* grams per millilitre, so cups and spoons convert to weight per ingredient */
  var INGREDIENTS = [
    ['water', 'Water (and stock, most liquids)', 1.0], ['milk', 'Milk', 1.03], ['oil', 'Vegetable or olive oil', 0.92], ['butter', 'Butter', 0.96], ['honey', 'Honey or golden syrup', 1.42], ['cream', 'Double cream', 1.0],
    ['flour', 'Plain flour', 0.53], ['bread-flour', 'Bread flour', 0.55], ['wholemeal', 'Wholemeal flour', 0.54], ['cornflour', 'Cornflour', 0.54], ['sugar', 'Granulated sugar', 0.85], ['caster', 'Caster sugar', 0.80],
    ['icing', 'Icing sugar', 0.51], ['brown-sugar', 'Brown sugar, packed', 0.93], ['cocoa', 'Cocoa powder', 0.42], ['oats', 'Rolled oats', 0.38], ['rice', 'Uncooked rice', 0.78], ['salt', 'Table salt', 1.22],
    ['baking-powder', 'Baking powder', 0.90], ['yeast', 'Dried yeast', 0.65], ['ground-almonds', 'Ground almonds', 0.40], ['chocolate-chips', 'Chocolate chips', 0.72], ['breadcrumbs', 'Dried breadcrumbs', 0.45], ['peanut-butter', 'Peanut butter', 1.08]
  ];
  var COOK_UNITS = [
    ['ml', 'Millilitres (ml)', 1, 'v'], ['l', 'Litres (l)', 1000, 'v'], ['tsp', 'Teaspoon (5 ml)', 5, 'v'], ['tbsp', 'Tablespoon (15 ml)', 15, 'v'], ['dsp', 'Dessertspoon (10 ml)', 10, 'v'],
    ['cup-us', 'US cup (236.6 ml)', 236.588, 'v'], ['cup-metric', 'Metric cup (250 ml)', 250, 'v'], ['floz-us', 'US fluid ounce', 29.5735, 'v'], ['floz-uk', 'UK fluid ounce', 28.4131, 'v'], ['pint-uk', 'UK pint (568 ml)', 568.261, 'v'], ['pint-us', 'US pint (473 ml)', 473.176, 'v'],
    ['g', 'Grams (g)', 1, 'w'], ['kg', 'Kilograms (kg)', 1000, 'w'], ['oz', 'Ounces (oz)', 28.3495, 'w'], ['lb', 'Pounds (lb)', 453.592, 'w'], ['stick', 'Stick of butter (113 g)', 113.4, 'w']
  ];
  Tools.register({
    id: 'cooking-converter', category: 'converters', name: 'Cooking Converter',
    description: 'Cups, spoons, grams and ounces for real ingredients, with US and UK measures, plus oven temperatures and gas marks.',
    keywords: ['cooking', 'baking', 'cups to grams', 'tablespoon', 'teaspoon', 'ounces', 'flour', 'sugar', 'butter', 'recipe', 'oven', 'gas mark', 'fan oven', 'kitchen', 'measure'],
    render: function (root) {
      box(root);
      var value = U.input({ label: 'Amount', type: 'number', value: '1', step: 'any' });
      var from = U.select({ label: 'From', options: COOK_UNITS.map(function (u) { return { value: u[0], label: u[1] }; }), value: 'cup-us' });
      var ing = U.select({ label: 'Ingredient', options: INGREDIENTS.map(function (i) { return { value: i[0], label: i[1] }; }), value: 'flour' });
      var tbody = el('tbody'), status = U.note('');
      function fmt(v) { return v >= 100 ? String(Math.round(v)) : v >= 10 ? trimFixed(v, 1) : trimFixed(v, 2); }
      function run() {
        var v = num(inp(value).value), u = COOK_UNITS.filter(function (x) { return x[0] === inp(from).value; })[0], d = INGREDIENTS.filter(function (x) { return x[0] === inp(ing).value; })[0][2];
        tbody.replaceChildren();
        if (!isFinite(v)) { status.textContent = 'Enter an amount.'; return; }
        status.textContent = '';
        var ml = u[3] === 'v' ? v * u[2] : v * u[2] / d;   /* everything via millilitres */
        COOK_UNITS.forEach(function (x) {
          var out = x[3] === 'v' ? ml / x[2] : ml * d / x[2];
          tbody.appendChild(el('tr', { class: x[0] === u[0] ? 'cur' : '', dataset: { unit: x[0] } }, el('td', { text: x[1] }), el('td', { class: 'v', title: 'Click to copy', text: fmt(out), onclick: function () { U.copy(fmt(out)); } })));
        });
      }
      U.live([value, from, ing], run);
      var ovenRows = [[110, 225, '¼'], [130, 250, '½'], [140, 275, '1'], [150, 300, '2'], [160, 325, '3'], [180, 350, '4'], [190, 375, '5'], [200, 400, '6'], [220, 425, '7'], [230, 450, '8'], [240, 475, '9']].map(function (r) {
        return [r[0] + ' °C', (r[0] - 20) + ' °C', r[1] + ' °F', 'Gas ' + r[2], r[0] <= 140 ? 'Very slow / cool' : r[0] <= 160 ? 'Slow' : r[0] <= 190 ? 'Moderate' : r[0] <= 220 ? 'Hot' : 'Very hot'];
      });
      root.appendChild(U.panel(null, U.row(value, from, ing), U.note('Weight conversions use a typical density for the ingredient chosen. A cup of flour weighs about 125 g spooned in, but up to 150 g if scooped and packed, so a kitchen scale always wins.')));
      root.appendChild(U.panel('Results', el('table', { class: 'cv-table', dataset: { role: 'results' } }, tbody), status));
      root.appendChild(U.panel('Oven temperatures', U.table(['Conventional', 'Fan / convection', 'Fahrenheit', 'Gas mark', 'Description'], ovenRows), U.note('Fan ovens run about 20 °C lower than the conventional setting for the same result.')));
      root.appendChild(U.panel('Handy equivalents', U.note('1 tbsp = 3 tsp = 15 ml · 1 US cup = 16 tbsp = 8 US fl oz · 1 UK pint = 20 UK fl oz = 568 ml · 1 stick of butter = ½ US cup = 113 g · 1 large egg ≈ 50 g without shell · a "pinch" ≈ ⅛ tsp.')));
    }
  });

  /* --- Pace Calculator ----------------------------------------------------- */

  Tools.register({
    id: 'pace-calculator', category: 'health', name: 'Pace Calculator',
    description: 'Running and cycling pace, speed and finish time for any distance, with split times and race predictions.',
    keywords: ['pace', 'running', 'run', 'marathon', 'half marathon', '5k', '10k', 'min/km', 'min/mile', 'speed', 'finish time', 'splits', 'parkrun', 'cycling', 'race predictor', 'treadmill'],
    render: function (root) {
      box(root);
      var miles = !!(window.Region && Region.imperial());
      var dist = U.input({ label: 'Distance', type: 'number', value: miles ? '6.2' : '10', step: 'any', min: 0 });
      var dUnit = U.select({ label: 'Unit', options: [{ value: 'km', label: 'km' }, { value: 'mi', label: 'miles' }], value: miles ? 'mi' : 'km' });
      var h = el('input', { type: 'number', min: 0, value: '0', 'aria-label': 'Hours' }), m = el('input', { type: 'number', min: 0, max: 59, value: '50', 'aria-label': 'Minutes' }), s = el('input', { type: 'number', min: 0, max: 59, value: '0', 'aria-label': 'Seconds' });
      var pm = el('input', { type: 'number', min: 0, value: miles ? '8' : '5', 'aria-label': 'Pace minutes' }), ps = el('input', { type: 'number', min: 0, max: 59, value: '0', 'aria-label': 'Pace seconds' });
      var pUnit = U.select({ options: [{ value: 'km', label: 'per km' }, { value: 'mi', label: 'per mile' }], value: miles ? 'mi' : 'km' });
      var solve = U.chips([{ value: 'time', label: 'Find finish time' }, { value: 'pace', label: 'Find pace' }, { value: 'dist', label: 'Find distance' }], function () { run(); }, 'pace');
      var out = el('div'), splits = el('tbody'), predict = el('tbody');
      var lastEdited = 'pace';
      function fmtTime(sec) { sec = Math.round(sec); var hh = Math.floor(sec / 3600), mm = Math.floor(sec % 3600 / 60), ss = sec % 60; return (hh ? hh + ':' : '') + (hh ? String(mm).padStart(2, '0') : mm) + ':' + String(ss).padStart(2, '0'); }
      function fmtPace(secPer) { if (!isFinite(secPer) || secPer <= 0) return '—'; var mm = Math.floor(secPer / 60), ss = Math.round(secPer % 60); if (ss === 60) { mm++; ss = 0; } return mm + ':' + String(ss).padStart(2, '0'); }
      function run() {
        var km = num(inp(dist).value) * (inp(dUnit).value === 'mi' ? 1.609344 : 1);
        var timeSec = (+h.value || 0) * 3600 + (+m.value || 0) * 60 + (+s.value || 0);
        var paceSecPerKm = ((+pm.value || 0) * 60 + (+ps.value || 0)) / (inp(pUnit).value === 'mi' ? 1.609344 : 1);
        var mode = solve.value;
        if (mode === 'time') { if (!(km > 0) || !(paceSecPerKm > 0)) return; timeSec = km * paceSecPerKm; var t = Math.round(timeSec); h.value = Math.floor(t / 3600); m.value = Math.floor(t % 3600 / 60); s.value = t % 60; }
        else if (mode === 'pace') { if (!(km > 0) || !(timeSec > 0)) return; paceSecPerKm = timeSec / km; var pp = paceSecPerKm * (inp(pUnit).value === 'mi' ? 1.609344 : 1); pm.value = Math.floor(pp / 60); ps.value = Math.round(pp % 60); }
        else { if (!(timeSec > 0) || !(paceSecPerKm > 0)) return; km = timeSec / paceSecPerKm; inp(dist).value = trimFixed(km / (inp(dUnit).value === 'mi' ? 1.609344 : 1), 2); }
        var perMi = paceSecPerKm * 1.609344, kmh = 3600 / paceSecPerKm, mph = kmh / 1.609344;
        out.replaceChildren(el('div', { class: 'cv-grid' },
          el('div', { class: 'cv-card hl' }, el('b', { dataset: { k: 'time' }, text: fmtTime(timeSec) }), el('span', { text: 'Finish time' })),
          el('div', { class: 'cv-card' }, el('b', { dataset: { k: 'pacekm' }, text: fmtPace(paceSecPerKm) }), el('span', { text: 'min per km' })),
          el('div', { class: 'cv-card' }, el('b', { dataset: { k: 'pacemi' }, text: fmtPace(perMi) }), el('span', { text: 'min per mile' })),
          el('div', { class: 'cv-card' }, el('b', { text: trimFixed(kmh, 2) }), el('span', { text: 'km/h' })),
          el('div', { class: 'cv-card' }, el('b', { text: trimFixed(mph, 2) }), el('span', { text: 'mph' })),
          el('div', { class: 'cv-card' }, el('b', { text: trimFixed(km, 2) + ' km' }), el('span', { text: trimFixed(km / 1.609344, 2) + ' miles' }))));
        splits.replaceChildren();
        var unitKm = inp(dUnit).value === 'mi' ? 1.609344 : 1, total = km / unitKm, n = Math.min(60, Math.ceil(total - 1e-9));
        for (var i = 1; i <= n; i++) { var d = Math.min(i, total); splits.appendChild(el('tr', {}, el('td', { text: trimFixed(d, 2) + ' ' + inp(dUnit).value }), el('td', { class: 'v', text: fmtTime(d * unitKm * paceSecPerKm) }))); }
        predict.replaceChildren();
        [['5K', 5], ['10K', 10], ['Half marathon', 21.0975], ['Marathon', 42.195], ['1 mile', 1.609344], ['Parkrun (5K)', 5]].filter(function (r, idx) { return idx !== 5; }).forEach(function (r) {
          var pred = timeSec * Math.pow(r[1] / km, 1.06);
          predict.appendChild(el('tr', {}, el('td', { text: r[0] }), el('td', { class: 'v', text: fmtTime(pred) }), el('td', { class: 'v', text: fmtPace(pred / r[1]) + ' /km' })));
        });
      }
      [h, m, s].forEach(function (n) { n.addEventListener('input', function () { if (solve.value === 'time') return; run(); }); });
      [pm, ps].forEach(function (n) { n.addEventListener('input', function () { if (solve.value === 'pace') return; run(); }); });
      U.live([dist, dUnit, pUnit], run);
      var presets = el('div', { class: 'cv-chip-row' }, [['5K', 5], ['10K', 10], ['Half marathon', 21.0975], ['Marathon', 42.195], ['1 mile', 1.609344]].map(function (p) {
        return el('button', { type: 'button', class: 'chip', onclick: function () { inp(dUnit).value = 'km'; inp(dist).value = String(p[1]); run(); } }, p[0]);
      }));
      root.appendChild(U.panel(null, solve, U.row(dist, dUnit), presets,
        U.row(U.field('Time (h : m : s)', el('div', { class: 'cv-flex', style: { gap: '4px' } }, h, ':', m, ':', s)), U.field('Pace (m : s)', el('div', { class: 'cv-flex', style: { gap: '4px' } }, pm, ':', ps, pUnit))),
        U.note('Pick what to find, fill in the other two. Race predictions use the Riegel formula (T2 = T1 × (D2/D1)^1.06), which assumes matching training for the distance.')));
      root.appendChild(U.panel('Result', out));
      root.appendChild(U.split(U.panel('Splits', el('table', { class: 'cv-table' }, splits)), U.panel('Predicted times at this fitness', el('table', { class: 'cv-table' }, el('thead', el('tr', {}, el('th', { text: 'Race' }), el('th', { text: 'Time' }), el('th', { text: 'Pace' }))), predict))));
    }
  });

  /* --- Resistor Colour Code ------------------------------------------------ */

  var RES_COLORS = [['black', '#111', 0, 1, null, 250], ['brown', '#7a3b10', 1, 10, 1, 100], ['red', '#d11', 2, 100, 2, 50], ['orange', '#f60', 3, 1e3, null, 15], ['yellow', '#fd0', 4, 1e4, null, 25], ['green', '#1a1', 5, 1e5, 0.5, 20], ['blue', '#22c', 6, 1e6, 0.25, 10], ['violet', '#83b', 7, 1e7, 0.1, 5], ['grey', '#888', 8, 1e8, 0.05, 1], ['white', '#eee', 9, 1e9, null, null], ['gold', '#d4a017', null, 0.1, 5, null], ['silver', '#bbb', null, 0.01, 10, null]];
  function fmtOhms(v) { return v >= 1e6 ? trimFixed(v / 1e6, 2) + ' MΩ' : v >= 1e3 ? trimFixed(v / 1e3, 2) + ' kΩ' : trimFixed(v, 2) + ' Ω'; }
  Tools.register({
    id: 'resistor-color-code', category: 'electronics', name: 'Resistor Colour Code',
    description: 'Read a 4, 5 or 6-band resistor from its colours, or enter a value and see which bands to look for.',
    keywords: ['resistor', 'colour code', 'color code', 'ohms', 'bands', 'electronics', 'tolerance', 'e12', 'e24', 'arduino', 'circuit', 'component'],
    render: function (root) {
      box(root);
      var bands = 4, sel = [1, 0, 0, 2, 10, 1];   /* indexes into RES_COLORS: digit1, digit2, (digit3), multiplier, tolerance, tempco */
      var count = U.chips([{ value: '4', label: '4 bands' }, { value: '5', label: '5 bands' }, { value: '6', label: '6 bands' }], function (v) { bands = +v; draw(); }, '4');
      var picker = el('div', { class: 'stack' }), svg = el('div', { style: { textAlign: 'center' } }), out = el('div');
      var valueIn = U.input({ label: 'Or enter a value (Ω, k, M)', placeholder: 'e.g. 4.7k or 220 or 1M', spellcheck: false });
      function roles() { return bands === 4 ? ['1st digit', '2nd digit', 'Multiplier', 'Tolerance'] : bands === 5 ? ['1st digit', '2nd digit', '3rd digit', 'Multiplier', 'Tolerance'] : ['1st digit', '2nd digit', '3rd digit', 'Multiplier', 'Tolerance', 'Temp. coefficient']; }
      function allowed(role, c) { return /digit/.test(role) ? c[2] !== null && !(role === '1st digit' && c[2] === 0) : role === 'Multiplier' ? true : role === 'Tolerance' ? c[4] !== null : c[5] !== null; }
      function current() {
        var r = roles(), idx = bands === 4 ? [sel[0], sel[1], sel[3], sel[4]] : bands === 5 ? [sel[0], sel[1], sel[2], sel[3], sel[4]] : [sel[0], sel[1], sel[2], sel[3], sel[4], sel[5] === undefined ? 1 : sel[5]];
        var digits = '', mult = 1, tol = null, tc = null;
        r.forEach(function (role, i) { var c = RES_COLORS[idx[i]]; if (/digit/.test(role)) digits += c[2]; else if (role === 'Multiplier') mult = c[3]; else if (role === 'Tolerance') tol = c[4]; else tc = c[5]; });
        return { ohms: parseInt(digits, 10) * mult, tol: tol, tc: tc, idx: idx };
      }
      function draw() {
        var r = roles(), cur = current();
        picker.replaceChildren.apply(picker, r.map(function (role, i) {
          var row = el('div', { class: 'cv-chip-row' }, RES_COLORS.map(function (c, ci) {
            if (!allowed(role, c)) return null;
            var on = cur.idx[i] === ci;
            return el('button', { type: 'button', class: 'chip' + (on ? ' on' : ''), title: c[0], style: { background: c[1], color: ['white', 'yellow', 'gold', 'silver', 'grey'].indexOf(c[0]) > -1 ? '#111' : '#fff', borderColor: on ? 'var(--fg)' : 'transparent', borderWidth: '2px' }, onclick: function () {
              var pos = bands === 4 && i >= 2 ? i + 1 : i; sel[pos] = ci; draw();
            } }, c[0]);
          }));
          return el('div', { class: 'field' }, el('label', { text: role }), row);
        }));
        var xs = bands === 4 ? [70, 95, 120, 165] : bands === 5 ? [62, 84, 106, 128, 170] : [58, 78, 98, 118, 140, 172];
        svg.innerHTML = '<svg viewBox="0 0 240 70" width="360" height="105" role="img" aria-label="Resistor"><rect x="0" y="32" width="240" height="6" fill="#999"/><rect x="40" y="14" width="160" height="42" rx="14" fill="#e6c9a0" stroke="#b0905e"/>' +
          xs.map(function (x, i) { var c = RES_COLORS[cur.idx[i]]; return '<rect x="' + x + '" y="14" width="12" height="42" fill="' + c[1] + '" stroke="#5a4a30" stroke-width=".5"/>'; }).join('') + '</svg>';
        var e24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
        var mant = cur.ohms / Math.pow(10, Math.floor(Math.log10(cur.ohms || 1))), std = e24.some(function (v) { return Math.abs(v - mant) < 0.01; });
        out.replaceChildren(el('div', { class: 'cv-big', dataset: { k: 'ohms' }, text: fmtOhms(cur.ohms) + (cur.tol !== null ? ' ± ' + cur.tol + '%' : '') }),
          el('div', { class: 'cv-muted', text: (cur.tol !== null ? 'Actual value between ' + fmtOhms(cur.ohms * (1 - cur.tol / 100)) + ' and ' + fmtOhms(cur.ohms * (1 + cur.tol / 100)) + '. ' : '') + (cur.tc ? cur.tc + ' ppm/°C. ' : '') + (std ? 'A standard E24 value.' : 'Not a standard E24 value: check the band order (the tolerance band is usually gold or silver and sits apart from the others).') }));
      }
      function fromValue() {
        var t = inp(valueIn).value.trim().toLowerCase().replace(/ohms?|Ω/g, '').replace(/\s+/g, '');
        var m = /^(\d+(?:\.\d+)?)([kmr]?)(\d*)$/.exec(t.replace(/([km])(\d)/, '$1.$2'));
        if (!m) return;
        var v = parseFloat(m[1]) * (m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : 1);
        if (!(v > 0)) return;
        var digitsWanted = bands === 4 ? 2 : 3, exp = Math.floor(Math.log10(v)) - (digitsWanted - 1), mant = Math.round(v / Math.pow(10, exp));
        if (mant >= Math.pow(10, digitsWanted)) { mant = Math.round(mant / 10); exp++; }
        var multIdx = RES_COLORS.findIndex(function (c) { return Math.abs(Math.log10(c[3]) - exp) < 0.01; });
        if (multIdx < 0) return;
        var ds = String(mant).padStart(digitsWanted, '0').split('').map(Number);
        sel[0] = ds[0]; sel[1] = ds[1]; if (digitsWanted === 3) sel[2] = ds[2]; sel[3] = multIdx;
        draw();
      }
      valueIn.querySelector('input').addEventListener('change', fromValue);
      valueIn.querySelector('input').addEventListener('keydown', function (e) { if (e.key === 'Enter') fromValue(); });
      draw();
      root.appendChild(U.panel(null, count, svg, out, U.row(valueIn, U.button('Show bands', fromValue))));
      root.appendChild(U.panel('Bands', picker, U.note('Hold the resistor with the tolerance band (gold or silver, or the one set apart) on the right. Read the bands left to right: digits, then the multiplier, then tolerance. Six-band resistors add a temperature coefficient.')));
    }
  });

  /* --- Wind speed & Beaufort scale ------------------------------------------ */

  /* Descriptions follow the Met Office Beaufort wind force scale: force,
     name, sea criteria, land criteria, probable and maximum wave height in
     the open sea (m). */
  var BEAUFORT = [
    [0, 'Calm', 'Sea like a mirror.', 'Smoke rises vertically.', null, null],
    [1, 'Light air', 'Ripples with the appearance of scales are formed, without foam crests.', 'Direction shown by smoke drift but not by wind vanes.', 0.1, 0.1],
    [2, 'Light breeze', 'Small wavelets, still short but more pronounced; crests have a glassy appearance but do not break.', 'Wind felt on face; leaves rustle; wind vane moved by wind.', 0.2, 0.3],
    [3, 'Gentle breeze', 'Large wavelets; crests begin to break; foam of glassy appearance; perhaps scattered white horses.', 'Leaves and small twigs in constant motion; light flags extended.', 0.6, 1],
    [4, 'Moderate breeze', 'Small waves becoming longer; fairly frequent white horses.', 'Raises dust and loose paper; small branches moved.', 1, 1.5],
    [5, 'Fresh breeze', 'Moderate waves taking a more pronounced long form; many white horses are formed; chance of some spray.', 'Small trees in leaf begin to sway; crested wavelets form on inland waters.', 2, 2.5],
    [6, 'Strong breeze', 'Large waves begin to form; the white foam crests are more extensive everywhere; probably some spray.', 'Large branches in motion; whistling heard in telegraph wires; umbrellas used with difficulty.', 3, 4],
    [7, 'Near gale', 'Sea heaps up and white foam from breaking waves begins to be blown in streaks along the direction of the wind.', 'Whole trees in motion; inconvenience felt when walking against the wind.', 4, 5.5],
    [8, 'Gale', 'Moderately high waves of greater length; edges of crests begin to break into spindrift; foam is blown in well-marked streaks along the direction of the wind.', 'Breaks twigs off trees; generally impedes progress.', 5.5, 7.5],
    [9, 'Severe gale', 'High waves; dense streaks of foam along the direction of the wind; crests of waves begin to topple, tumble and roll over; spray may affect visibility.', 'Slight structural damage occurs (chimney pots and slates removed).', 7, 10],
    [10, 'Storm', 'Very high waves with long overhanging crests; the resulting foam in great patches is blown in dense white streaks along the direction of the wind; on the whole the surface of the sea takes on a white appearance; the tumbling of the sea becomes heavy and shock-like; visibility affected.', 'Seldom experienced inland; trees uprooted; considerable structural damage occurs.', 9, 12.5],
    [11, 'Violent storm', 'Exceptionally high waves (small and medium-sized ships might be for a time lost to view behind the waves); the sea is completely covered with long white patches of foam lying along the direction of the wind; everywhere the edges of the wave crests are blown into froth; visibility affected.', 'Very rarely experienced; accompanied by widespread damage.', 11.5, 16],
    [12, 'Hurricane force', 'The air is filled with foam and spray; sea completely white with driving spray; visibility very seriously affected.', 'Devastation.', 14, null]
  ];
  /* The shipping forecast's sea-state words for each force's probable waves. */
  var SEA_STATE = ['Calm (glassy)', 'Calm (rippled)', 'Smooth (wavelets)', 'Slight', 'Slight', 'Moderate', 'Rough', 'Rough to very rough',
    'Very rough', 'High', 'High to very high', 'Very high', 'Phenomenal'];
  /* Lower bound of each force in the rounded table published for each unit.
     The tables do not line up exactly, so a speed is classed with the table
     for the unit it was typed in (ft/s goes through knots). */
  var BF_LOW = {
    kn: [0, 1, 4, 7, 11, 17, 22, 28, 34, 41, 48, 56, 64],
    mph: [0, 1, 4, 8, 13, 19, 25, 32, 39, 47, 55, 64, 73],
    kmh: [0, 1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118],
    ms: [0, 0.3, 1.6, 3.4, 5.5, 8, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7]
  };
  var WIND_UNITS = [['ms', 'm/s', 1], ['kmh', 'km/h', 1 / 3.6], ['mph', 'mph', 0.44704], ['kn', 'knots', 1852 / 3600], ['fts', 'ft/s', 0.3048]];
  /* Saffir–Simpson hurricane wind scale (US National Hurricane Center),
     1-minute sustained winds: lower bounds in knots, mph and km/h. */
  var SSHWS = [
    [1, 64, 74, 119, 'Very dangerous winds will produce some damage.'],
    [2, 83, 96, 154, 'Extremely dangerous winds will cause extensive damage.'],
    [3, 96, 111, 178, 'Devastating damage will occur (a major hurricane).'],
    [4, 113, 130, 209, 'Catastrophic damage will occur (a major hurricane).'],
    [5, 137, 157, 252, 'Catastrophic damage will occur (a major hurricane).']
  ];

  function bfRange(force, key) {
    var low = BF_LOW[key], step = key === 'ms' ? 0.1 : 1, fmt = function (v) { return key === 'ms' ? v.toFixed(1) : String(v); };
    if (force === 0) return key === 'ms' ? '0–0.2' : 'under 1';
    if (force === 12) return fmt(low[12]) + ' or more';
    return fmt(low[force]) + '–' + fmt(Math.round((low[force + 1] - step) * 10) / 10);
  }
  function bfClass(v, key) {
    if (key === 'fts') { v = v * 0.3048 / (1852 / 3600); key = 'kn'; }
    var r = key === 'ms' ? Math.round(v * 10) / 10 : Math.round(v), f = 0;
    BF_LOW[key].forEach(function (low, i) { if (r >= low) f = i; });
    return f;
  }
  function ssClass(v, key) {
    var col = key === 'mph' ? 2 : key === 'kmh' ? 3 : 1;
    if (key === 'ms' || key === 'fts') v = v * (key === 'ms' ? 1 : 0.3048) / (1852 / 3600);
    var r = Math.round(v), cat = null;
    SSHWS.forEach(function (c) { if (r >= c[col]) cat = c; });
    return cat;
  }

  Tools.register({
    id: 'beaufort-scale', category: 'converters', name: 'Wind Speed & Beaufort Scale',
    description: 'Convert wind speeds between m/s, km/h, mph, knots and ft/s, see the Beaufort force with Met Office sea and land descriptions, and the Saffir–Simpson category of hurricane winds.',
    keywords: ['beaufort', 'beaufort scale', 'wind speed', 'wind force', 'wind', 'gale', 'storm', 'knots', 'mph', 'km/h', 'm/s', 'sea state', 'wave height',
      'saffir simpson', 'hurricane category', 'shipping forecast', 'sailing', 'weather', 'anemometer'],
    render: function (root) {
      box(root);
      var speed = U.input({ label: 'Wind speed', type: 'number', value: '20', min: '0', step: 'any', dataset: { role: 'speed' } });
      var unit = U.select({ label: 'Unit', dataset: { role: 'unit' }, value: 'kn',
        options: WIND_UNITS.map(function (u) { return { value: u[0], label: u[1] }; }) });
      var result = el('div', { dataset: { role: 'result' } });
      var scaleBox = el('div', { class: 'cv-scroll' });
      var ssBox = el('div', { class: 'cv-scroll' });
      var chips = el('div', { class: 'chips cv-bf-chips', role: 'group', 'aria-label': 'Beaufort force' }, BEAUFORT.map(function (b) {
        return el('button', { class: 'chip', type: 'button', title: b[1], dataset: { force: String(b[0]) }, onclick: function () {
          /* Put the speed in the middle of this force's band, in the chosen unit. */
          var key = inp(unit).value, k = key === 'fts' ? 'kn' : key, low = BF_LOW[k], v;
          v = b[0] === 0 ? 0 : b[0] === 12 ? low[12] : (low[b[0]] + low[b[0] + 1] - (k === 'ms' ? 0.1 : 1)) / 2;
          if (key === 'fts') v = v * (1852 / 3600) / 0.3048;
          inp(speed).value = String(Math.round(v * 10) / 10);
          run();
        } }, String(b[0]));
      }));

      function card(label, value, k) { return el('div', { class: 'cv-card' }, el('span', { text: label }), el('b', { dataset: { k: k }, text: value })); }
      function text(label, value, k) { return el('p', { class: 'cv-bf-text' }, el('b', { text: label }), el('span', { dataset: { k: k }, text: value })); }
      function run() {
        var v = num(inp(speed).value), key = inp(unit).value;
        var u = WIND_UNITS.filter(function (x) { return x[0] === key; })[0];
        result.replaceChildren();
        if (!isFinite(v) || v < 0) { result.appendChild(U.note('Enter a wind speed of zero or more.', 'err')); drawScale(-1); drawSs(null); return; }
        var ms = v * u[2], f = bfClass(v, key), b = BEAUFORT[f], ss = ssClass(v, key);
        Array.prototype.forEach.call(chips.children, function (c) { c.classList.toggle('on', +c.dataset.force === f); });
        result.append.apply(result, [
          el('div', { class: 'cv-big', dataset: { k: 'force' }, text: 'Force ' + f + ' · ' + b[1] }),
          el('div', { class: 'cv-grid' }, WIND_UNITS.map(function (w) {
            var x = ms / w[2];
            return card(w[1], x >= 100 ? x.toFixed(0) : trimFixed(x, x >= 10 ? 1 : 2), w[0]);
          })),
          el('p', { class: 'cv-muted', dataset: { k: 'range' }, text: 'Force ' + f + ' covers ' + bfRange(f, 'kn') + ' knots · ' + bfRange(f, 'mph') + ' mph · ' +
            bfRange(f, 'kmh') + ' km/h · ' + bfRange(f, 'ms') + ' m/s.' }),
          text('At sea', b[2], 'sea'),
          text('On land', b[3], 'land'),
          text('Waves in the open sea', b[4] === null ? 'None' : 'Probably about ' + b[4] + ' m' + (b[5] ? ', up to ' + b[5] + ' m' : ' or more') + ' · sea state: ' + SEA_STATE[f].toLowerCase(), 'waves'),
          ss ? el('p', { class: 'note err', dataset: { k: 'ss' }, text: 'Saffir–Simpson category ' + ss[0] + ' hurricane winds: ' + ss[4] }) : null
        ].filter(Boolean));
        drawScale(f); drawSs(ss);
      }
      function drawScale(f) {
        var t = el('table', { class: 'data cv-wide', dataset: { role: 'scale' } },
          el('thead', el('tr', ['Force', 'Description', 'Knots', 'mph', 'km/h', 'm/s', 'Waves (m)', 'At sea', 'On land'].map(function (h) { return el('th', { text: h }); }))),
          el('tbody', BEAUFORT.map(function (b) {
            return el('tr', { class: b[0] === f ? 'cur' : '', dataset: { force: String(b[0]) } },
              el('td', { text: String(b[0]) }), el('td', { text: b[1] }),
              el('td', { text: bfRange(b[0], 'kn') }), el('td', { text: bfRange(b[0], 'mph') }), el('td', { text: bfRange(b[0], 'kmh') }), el('td', { text: bfRange(b[0], 'ms') }),
              el('td', { text: b[4] === null ? '–' : b[4] + (b[5] ? ' (' + b[5] + ')' : '') }),
              el('td', { class: 'long', text: b[2] }), el('td', { class: 'long', text: b[3] }));
          })));
        scaleBox.replaceChildren(t);
      }
      function drawSs(cat) {
        ssBox.replaceChildren(el('table', { class: 'data', dataset: { role: 'sshws' } },
          el('thead', el('tr', ['Category', 'Knots', 'mph', 'km/h', 'Expected damage'].map(function (h) { return el('th', { text: h }); }))),
          el('tbody', SSHWS.map(function (c, i) {
            var next = SSHWS[i + 1], span = function (col) { return next ? c[col] + '–' + (next[col] - 1) : c[col] + ' or more'; };
            return el('tr', { class: cat && cat[0] === c[0] ? 'cur' : '' }, el('td', { text: String(c[0]) }), el('td', { text: span(1) }),
              el('td', { text: span(2) }), el('td', { text: span(3) }), el('td', { text: c[4] }));
          }))));
      }
      U.live([speed, unit], run);
      root.appendChild(U.panel(null, U.row(speed, unit), el('div', { class: 'field', style: { marginTop: '10px' } }, el('label', { text: 'Or pick a Beaufort force' }), chips)));
      root.appendChild(U.panel(null, result));
      root.appendChild(U.panel('The Beaufort scale', scaleBox,
        U.note('Mean wind speed at 10 m above open, flat ground or sea. Each unit has its own rounded bands, so a speed is classed using the bands of the unit you typed. Gusts can be 30 to 50% stronger than the mean. Wave heights are for the open sea, well away from land; the probable maximum is in brackets.')));
      root.appendChild(U.panel('Saffir–Simpson hurricane wind scale', ssBox,
        U.note('For tropical cyclones, based on 1-minute sustained winds. Hurricane-force winds are Beaufort 12.')));
    }
  });

  /* --- Clothing sizes -------------------------------------------------------- */

  /* Usual high-street conversions and body measurements. Sizing is not
     standardised, so brands differ; these are a starting point. */
  function range(a, b, step) { var out = []; for (var v = a; v <= b + 1e-9; v += step) out.push(Math.round(v * 10) / 10); return out; }
  function eighths(v) {
    var whole = Math.floor(v + 1e-9), n = Math.round((v - whole) * 8);
    if (n === 8) { whole++; n = 0; }
    return whole + (n ? ['', '⅛', '¼', '⅜', '½', '⅝', '¾', '⅞'][n] : '');
  }
  function halves(v) { return Math.floor(v) + (v % 1 ? '½' : ''); }
  var WOMEN_LETTER = { 4: 'XXS', 6: 'XS', 8: 'S', 10: 'S', 12: 'M', 14: 'M', 16: 'L', 18: 'L', 20: 'XL', 22: 'XL', 24: 'XXL', 26: 'XXL', 28: '3XL' };
  var WOMEN_BODY = { /* UK size: bust, waist, hips in cm */
    4: [74, 57, 82], 6: [78, 60, 86], 8: [82, 64, 90], 10: [86, 68, 94], 12: [91, 73, 99], 14: [96, 78, 104], 16: [101, 83, 109],
    18: [107, 89, 115], 20: [113, 95, 121], 22: [119, 101, 127], 24: [125, 107, 133], 26: [131, 113, 139], 28: [137, 119, 145]
  };
  function menLetter(chest) { return chest <= 34 ? 'XS' : chest <= 36 ? 'S' : chest <= 40 ? 'M' : chest <= 42 ? 'L' : chest <= 46 ? 'XL' : chest <= 48 ? 'XXL' : chest <= 52 ? '3XL' : '4XL'; }
  function collarLetter(c) { return c <= 14 ? 'XS' : c <= 15 ? 'S' : c <= 16 ? 'M' : c <= 17 ? 'L' : c <= 18 ? 'XL' : c <= 19 ? 'XXL' : '3XL'; }
  function waistLetter(w) { return w <= 28 ? 'XS' : w <= 30 ? 'S' : w <= 32 ? 'M' : w <= 36 ? 'L' : w <= 40 ? 'XL' : w <= 44 ? 'XXL' : '3XL'; }
  function hatLetter(cm) { return cm <= 54 ? 'XS' : cm <= 56 ? 'S' : cm <= 58 ? 'M' : cm <= 60 ? 'L' : cm <= 62 ? 'XL' : 'XXL'; }
  var KIDS = [['0–3 months', 62, '0–3M'], ['3–6 months', 68, '3–6M'], ['6–9 months', 74, '6–9M'], ['9–12 months', 80, '12M'], ['12–18 months', 86, '18M'],
    ['18–24 months', 92, '2T'], ['2–3 years', 98, '3T'], ['3–4 years', 104, '4T'], ['4–5 years', 110, '5'], ['5–6 years', 116, '6'], ['6–7 years', 122, '7'],
    ['7–8 years', 128, '8'], ['8–9 years', 134, '9'], ['9–10 years', 140, '10'], ['10–11 years', 146, '11'], ['11–12 years', 152, '12'],
    ['12–13 years', 158, '14'], ['13–14 years', 164, '16']];
  var BRA_CUPS = {
    UK: ['AA', 'A', 'B', 'C', 'D', 'DD', 'E', 'F', 'FF', 'G', 'GG', 'H', 'HH', 'J', 'JJ', 'K'],
    US: ['AA', 'A', 'B', 'C', 'D', 'DD/E', 'DDD/F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'],
    EU: ['AA', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O']
  };
  var BRA_SYSTEMS = [['UK', 'UK'], ['US', 'US'], ['EU', 'EU (DE, IT, ES…)'], ['FR', 'France & Belgium'], ['AU', 'Australia & NZ']];
  function braBand(uk, sys) { return sys === 'EU' ? 60 + (uk - 28) * 2.5 : sys === 'FR' ? 75 + (uk - 28) * 2.5 : sys === 'AU' ? uk - 22 : uk; }
  function braCup(i, sys) { return (sys === 'US' ? BRA_CUPS.US : sys === 'EU' || sys === 'FR' ? BRA_CUPS.EU : BRA_CUPS.UK)[i]; }

  var CLOTHING = [
    { key: 'women', label: "Women's clothing", cols: ['UK', 'US', 'EU (DE, NL, Nordic)', 'France, Spain, Belgium', 'Italy', 'Australia & NZ', 'Japan', 'Letter'],
      rows: range(4, 28, 2).map(function (uk) { return [uk, uk - 4, uk + 26, uk + 28, uk + 32, uk, uk - 1, WOMEN_LETTER[uk]].map(String); }),
      measures: [['bust', 'Bust (fullest part)'], ['waist', 'Waist (narrowest part)'], ['hips', 'Hips (fullest part)']],
      note: 'Dresses, tops, coats and skirts. Shops in the UK and Spain often print the French number as "EU", so a label reading EU 36 on a UK 8 is using French sizing.' },
    { key: 'suits', label: "Men's suits & jackets", cols: ['UK & US (chest, in)', 'Chest (cm)', 'EU, Italy, France', 'Letter'],
      rows: range(34, 54, 2).map(function (c) { return [String(c), String(Math.round(c * 2.54)), String(c + 10), menLetter(c)]; }),
      measures: [['chest', 'Chest (fullest part, under the arms)']],
      note: 'Jacket sizes are the chest measurement in inches, with a short, regular or long back length.' },
    { key: 'shirts', label: "Men's shirts (collar)", cols: ['UK & US (in)', 'EU & collar (cm)', 'Letter'],
      rows: range(14, 20, 0.5).map(function (c) { return [halves(c), String(Math.round(c * 2.54)), collarLetter(c)]; }),
      measures: [['neck', 'Neck (around the base, where the collar sits)']],
      note: 'Collar sizes are the neck measurement, rounded up to the next half inch. Add half an inch if you like room to move.' },
    { key: 'trousers', label: 'Trousers & jeans', cols: ['Waist (in)', 'Waist (cm)', 'EU (DE)', 'Letter'],
      rows: range(26, 46, 2).map(function (w) { return [String(w), String(Math.round(w * 2.54)), String(w + 16), waistLetter(w)]; }),
      legs: [['Short', 29], ['Regular', 31], ['Long', 33], ['Extra long', 35]],
      measures: [['waist', 'Waist (where you wear your trousers)'], ['leg', 'Inside leg (crotch to floor, no shoes)']],
      note: 'Jeans are labelled waist × inside leg in inches, for example W32 L31.' },
    { key: 'kids', label: "Children's clothing", cols: ['UK age', 'EU (height, cm)', 'US'],
      rows: KIDS.map(function (k) { return [k[0], String(k[1]), k[2]]; }),
      measures: [['height', 'Height (without shoes)']],
      note: 'European children\'s sizes are the height in centimetres the clothes fit. Go by height rather than age, and size up if between sizes.' },
    { key: 'bras', label: 'Bras', cols: [], rows: [], measures: [['underbust', 'Underbust (snug, just under the bust)'], ['bust', 'Bust (fullest part, loosely)']],
      note: 'This uses the modern UK method: the band is your underbust rounded to an even number of inches, and each inch between band and bust is one cup size. Fits vary a lot between brands; if the band rides up, try a smaller band and a bigger cup.' },
    { key: 'hats', label: 'Hats', cols: ['Head (cm) & EU', 'Head (in)', 'UK', 'US', 'Letter'],
      rows: range(52, 64, 1).map(function (cm) {
        var us = Math.round(cm / 2.54 / Math.PI * 8) / 8;
        return [String(cm), (cm / 2.54).toFixed(1), eighths(us - 0.125), eighths(us), hatLetter(cm)];
      }),
      measures: [['head', 'Head (around the forehead, just above the ears)']],
      note: 'European hat sizes are the head circumference in centimetres; US sizes are that circumference in inches divided by π, and UK sizes are one-eighth smaller.' }
  ];

  Tools.register({
    id: 'clothing-size-converter', category: 'converters', name: 'Clothing Size Converter',
    description: "Convert women's, men's and children's clothing, shirt, trouser, bra and hat sizes between UK, US, EU and other systems, or find a size from body measurements.",
    keywords: ['clothing size', 'clothes size', 'dress size', 'uk to us size', 'eu size', 'size chart', 'size conversion', 'bra size', 'cup size', 'collar size',
      'shirt size', 'suit size', 'jacket size', 'waist size', 'jeans size', 'inside leg', 'kids clothes', 'children size', 'hat size', 'womens', 'mens'],
    render: function (root) {
      box(root);
      var catKey = 'women', unit = window.Region && Region.imperial() ? 'in' : 'cm';
      var catChips = U.chips(CLOTHING.map(function (c) { return { value: c.key, label: c.label }; }), function (k) { catKey = k; build(); }, 'women');
      var convBox = el('div'), convOut = el('div', { dataset: { role: 'convert' } });
      var measBox = el('div'), measOut = el('div', { dataset: { role: 'measure' } });
      var tableBox = el('div', { class: 'cv-scroll', dataset: { role: 'chart' } });
      var noteBox = el('div');
      var selected = -1;

      function cat() { return CLOTHING.filter(function (c) { return c.key === catKey; })[0]; }
      function cards(pairs) {
        return el('div', { class: 'cv-grid' }, pairs.map(function (p) {
          return el('div', { class: 'cv-card' + (p[2] ? ' hl' : ''), dataset: { sys: p[0] } }, el('span', { text: p[0] }), el('b', { text: p[1] }));
        }));
      }
      function drawTable() {
        var c = cat();
        if (c.key === 'bras') {
          tableBox.replaceChildren(
            U.table(BRA_SYSTEMS.map(function (s) { return s[0] + ' band'; }), range(28, 46, 2).map(function (uk) { return BRA_SYSTEMS.map(function (s) { return String(braBand(uk, s[0])); }); })),
            U.table(['UK & AU cup', 'US cup', 'EU & FR cup'], BRA_CUPS.UK.map(function (x, i) { return [x, BRA_CUPS.US[i], BRA_CUPS.EU[i]]; })));
          return;
        }
        var t = U.table(c.cols, c.rows);
        Array.prototype.forEach.call(t.querySelectorAll('tbody tr'), function (tr, i) { if (i === selected) tr.className = 'cur'; });
        tableBox.replaceChildren(t);
        if (c.legs) tableBox.appendChild(U.table(['Inside leg', 'Inches', 'Centimetres'], c.legs.map(function (l) { return [l[0], String(l[1]), String(Math.round(l[1] * 2.54))]; })));
      }
      function showRow(i, heading) {
        var c = cat();
        selected = i;
        drawTable();
        return [el('h4', { text: heading }), cards(c.cols.map(function (col, j) { return [col, c.rows[i][j], j === 0]; }))];
      }

      /* Convert a size: pick the system, then the size in it. */
      function buildConvert() {
        var c = cat();
        convBox.replaceChildren(); convOut.replaceChildren();
        if (c.key === 'bras') {
          var sys = U.select({ label: 'System', dataset: { role: 'bra-sys' }, options: BRA_SYSTEMS.map(function (s) { return { value: s[0], label: s[1] }; }), value: 'UK' });
          var band = U.select({ label: 'Band', dataset: { role: 'bra-band' }, options: [] });
          var cup = U.select({ label: 'Cup', dataset: { role: 'bra-cup' }, options: [] });
          var fill = function () {
            var s = inp(sys).value, b = inp(band).value, cc = inp(cup).value;
            inp(band).replaceChildren.apply(inp(band), range(28, 46, 2).map(function (uk) { return el('option', { value: String(uk), text: String(braBand(uk, s)) }); }));
            inp(cup).replaceChildren.apply(inp(cup), BRA_CUPS.UK.map(function (x, i) { return el('option', { value: String(i), text: braCup(i, s) }); }));
            inp(band).value = b || '34'; inp(cup).value = cc || '3';
          };
          var go = function () {
            var uk = +inp(band).value, i = +inp(cup).value, s = inp(sys).value;
            convOut.replaceChildren(el('h4', { text: 'The same bra size in other systems' }),
              cards(BRA_SYSTEMS.map(function (x) { return [x[1], braBand(uk, x[0]) + braCup(i, x[0]), x[0] === s]; })));
          };
          inp(sys).addEventListener('change', function () { fill(); go(); });
          inp(band).addEventListener('change', go); inp(cup).addEventListener('change', go);
          fill(); go();
          convBox.appendChild(U.row(sys, band, cup));
          return;
        }
        var colSel = U.select({ label: 'System', dataset: { role: 'system' }, options: c.cols.map(function (col, j) { return { value: String(j), label: col }; }), value: '0' });
        var sizeSel = U.select({ label: 'Size', dataset: { role: 'size' }, options: [] });
        var fillSizes = function () {
          var j = +inp(colSel).value, seen = {};
          inp(sizeSel).replaceChildren.apply(inp(sizeSel), c.rows.map(function (r, i) {
            if (seen[r[j]]) return null;
            seen[r[j]] = true;
            return el('option', { value: String(i), text: r[j] });
          }).filter(Boolean));
          inp(sizeSel).value = String(Math.min(c.rows.length - 1, Math.floor(c.rows.length / 3)));
        };
        var go = function () { convOut.replaceChildren.apply(convOut, showRow(+inp(sizeSel).value, 'The same size in other systems')); };
        inp(colSel).addEventListener('change', function () { fillSizes(); go(); });
        inp(sizeSel).addEventListener('change', go);
        fillSizes();
        convBox.appendChild(U.row(colSel, sizeSel));
        go();
      }

      /* From body measurements. */
      function buildMeasure() {
        var c = cat();
        measBox.replaceChildren(); measOut.replaceChildren();
        var fields = {};
        var unitChips = U.chips([{ value: 'cm', label: 'Centimetres' }, { value: 'in', label: 'Inches' }], function (u) {
          Object.keys(fields).forEach(function (k) {
            var n = inp(fields[k]), v = num(n.value);
            if (isFinite(v)) n.value = u === 'in' ? trimFixed(v / 2.54, 1) : trimFixed(v * 2.54, 1);
          });
          unit = u; go();
        }, unit);
        c.measures.forEach(function (m) {
          fields[m[0]] = U.input({ label: m[1], type: 'number', step: 'any', min: '0', dataset: { role: 'm-' + m[0] } });
          inp(fields[m[0]]).addEventListener('input', go);
        });
        function cmOf(k) { var v = num(inp(fields[k]).value); return isFinite(v) && v > 0 ? (unit === 'in' ? v * 2.54 : v) : NaN; }
        function firstRow(value, colValue) { for (var i = 0; i < c.rows.length; i++) if (colValue(c.rows[i], i) >= value - 1e-9) return i; return -1; }
        function go() {
          measOut.replaceChildren();
          var out = null;
          if (c.key === 'women') {
            var names = { bust: 0, waist: 1, hips: 2 }, per = [], worst = -1, over = false;
            Object.keys(names).forEach(function (k) {
              var v = cmOf(k);
              if (!isFinite(v)) return;
              var i = firstRow(v - 1, function (r) { return WOMEN_BODY[+r[0]][names[k]]; });
              if (i < 0) { over = true; i = c.rows.length - 1; }
              per.push(k.charAt(0).toUpperCase() + k.slice(1) + ': UK ' + c.rows[i][0]);
              worst = Math.max(worst, i);
            });
            if (worst < 0) return;
            out = showRow(worst, 'Your size: UK ' + c.rows[worst][0] + (over ? ' or larger' : ''));
            out.push(el('p', { class: 'cv-muted', text: per.join(' · ') + '. For tops go by the bust size; for skirts and trousers by waist and hips.' }));
          } else if (c.key === 'bras') {
            var ub = cmOf('underbust'), bu = cmOf('bust');
            if (!isFinite(ub) || !isFinite(bu)) return;
            var ubIn = ub / 2.54, band = Math.round(ubIn);
            if (band % 2) band = ubIn >= band ? band + 1 : band - 1;
            band = Math.max(28, Math.min(46, band));
            var diff = Math.round(bu / 2.54 - band);
            if (diff < 0 || diff > 15) { measOut.appendChild(U.note('Those measurements are outside the usual bra sizes. Check them, and the unit.', 'err')); return; }
            out = [el('h4', { text: 'Your size: UK ' + band + BRA_CUPS.UK[diff] }),
              cards(BRA_SYSTEMS.map(function (x) { return [x[1], braBand(band, x[0]) + braCup(diff, x[0]), x[0] === 'UK']; }))];
          } else {
            var key = c.measures[0][0], v0 = cmOf(key);
            if (!isFinite(v0)) return;
            var idx, extra = null;
            if (c.key === 'kids') idx = firstRow(v0, function (r) { return +r[1]; });
            else if (c.key === 'hats') { idx = Math.round(v0) - 52; if (idx < 0 || idx >= c.rows.length) idx = -1; }
            else idx = firstRow(v0 / 2.54 - 0.1, function (r) { return num(r[0].replace('½', '.5')); });
            if (c.key === 'trousers') {
              var leg = cmOf('leg');
              if (isFinite(leg)) {
                var li = leg / 2.54, best = c.legs.reduce(function (a, l) { return Math.abs(l[1] - li) < Math.abs(a[1] - li) ? l : a; });
                extra = el('p', { dataset: { k: 'leg' }, text: 'Inside leg ' + trimFixed(li, 1) + ' in: ' + best[0] + ' (L' + best[1] + ').' });
              }
            }
            if (idx < 0) { measOut.appendChild(U.note('That is outside this chart. Check the measurement and the unit.', 'err')); return; }
            var r = c.rows[idx];
            out = showRow(idx, 'Your size: ' + ({ suits: r[0] + ' (UK & US jacket, EU ' + r[2] + ')', shirts: r[0] + ' in collar (' + r[1] + ' cm)',
              trousers: 'W' + r[0] + ' (EU ' + r[2] + ')', kids: r[0] + ' (EU ' + r[1] + ', US ' + r[2] + ')', hats: 'UK ' + r[2] + ', US ' + r[3] + ', EU ' + r[0] })[c.key]);
            if (extra) out.push(extra);
          }
          measOut.replaceChildren.apply(measOut, out);
        }
        measBox.appendChild(unitChips);
        measBox.appendChild(U.row.apply(null, c.measures.map(function (m) { return fields[m[0]]; })));
      }

      function build() {
        selected = -1;
        buildConvert();
        buildMeasure();
        if (selected < 0) drawTable();
        noteBox.replaceChildren(U.note(cat().note));
      }

      root.appendChild(U.panel(null, catChips));
      root.appendChild(U.split(U.panel('Convert a size', convBox, convOut), U.panel('From your measurements', measBox, measOut)));
      root.appendChild(U.panel('Size chart', tableBox, noteBox,
        U.note('Sizes vary between brands and countries, so treat these as a guide and check the brand\'s own size chart when you can.')));
      build();
    }
  });
})();
