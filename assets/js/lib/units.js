/* Unit tables. Everything linear is stored as a multiplier against the
   category's base unit; temperature carries explicit to/from functions. */
(function (global) {
  'use strict';

  var CATEGORIES = {
    length: {
      name: 'Length', base: 'm', units: {
        'nm': 1e-9, 'µm': 1e-6, 'mm': 0.001, 'cm': 0.01, 'm': 1, 'km': 1000,
        'in': 0.0254, 'ft': 0.3048, 'yd': 0.9144, 'mi': 1609.344, 'nmi': 1852
      }
    },
    mass: {
      name: 'Mass', base: 'kg', units: {
        'mg': 1e-6, 'g': 0.001, 'kg': 1, 't': 1000,
        'oz': 0.028349523125, 'lb': 0.45359237, 'st': 6.35029318, 'ton (UK)': 1016.0469088, 'ton (US)': 907.18474
      }
    },
    temperature: {
      name: 'Temperature', base: '°C', units: {
        '°C': { to: function (v) { return v; },                     from: function (v) { return v; } },
        '°F': { to: function (v) { return (v - 32) * 5 / 9; },       from: function (v) { return v * 9 / 5 + 32; } },
        'K':  { to: function (v) { return v - 273.15; },             from: function (v) { return v + 273.15; } },
        '°R': { to: function (v) { return (v - 491.67) * 5 / 9; },   from: function (v) { return (v + 273.15) * 9 / 5; } }
      }
    },
    area: {
      name: 'Area', base: 'm²', units: {
        'mm²': 1e-6, 'cm²': 1e-4, 'm²': 1, 'ha': 10000, 'km²': 1e6,
        'in²': 0.00064516, 'ft²': 0.09290304, 'yd²': 0.83612736, 'acre': 4046.8564224, 'mi²': 2589988.110336
      }
    },
    volume: {
      name: 'Volume', base: 'L', units: {
        'mL': 0.001, 'cL': 0.01, 'L': 1, 'm³': 1000,
        'tsp (UK)': 0.00591939, 'tbsp (UK)': 0.0177582, 'fl oz (UK)': 0.0284130625,
        'pint (UK)': 0.56826125, 'gallon (UK)': 4.54609,
        'cup (US)': 0.2365882365, 'fl oz (US)': 0.0295735295625, 'pint (US)': 0.473176473, 'gallon (US)': 3.785411784
      }
    },
    speed: {
      name: 'Speed', base: 'm/s', units: {
        'm/s': 1, 'km/h': 0.2777777777777778, 'mph': 0.44704, 'ft/s': 0.3048, 'knot': 0.5144444444444445
      }
    },
    data: {
      name: 'Data', base: 'B', units: {
        'bit': 0.125, 'B': 1,
        'kB': 1e3, 'MB': 1e6, 'GB': 1e9, 'TB': 1e12, 'PB': 1e15,
        'KiB': 1024, 'MiB': 1048576, 'GiB': 1073741824, 'TiB': 1099511627776
      }
    },
    time: {
      name: 'Time', base: 's', units: {
        'ns': 1e-9, 'µs': 1e-6, 'ms': 0.001, 's': 1, 'min': 60, 'h': 3600,
        'day': 86400, 'week': 604800, 'month (avg)': 2629800, 'year (Julian)': 31557600
      }
    },
    angle: {
      name: 'Angle', base: '°', units: {
        '°': 1, 'rad': 57.29577951308232, 'grad': 0.9, 'turn': 360, 'arcmin': 1 / 60, 'arcsec': 1 / 3600
      }
    },
    pressure: {
      name: 'Pressure', base: 'Pa', units: {
        'Pa': 1, 'hPa': 100, 'kPa': 1000, 'bar': 100000, 'mbar': 100,
        'atm': 101325, 'psi': 6894.757293168361, 'mmHg': 133.322387415
      }
    },
    energy: {
      name: 'Energy', base: 'J', units: {
        'J': 1, 'kJ': 1000, 'cal': 4.184, 'kcal': 4184, 'Wh': 3600, 'kWh': 3600000, 'BTU': 1055.05585262
      }
    },
    power: {
      name: 'Power', base: 'W', units: {
        'W': 1, 'kW': 1000, 'MW': 1e6, 'hp (metric)': 735.49875, 'hp (mech)': 745.6998715822702, 'BTU/h': 0.29307107017
      }
    }
  };

  function unitNames(category) { return Object.keys(CATEGORIES[category].units); }

  function convert(category, value, from, to) {
    var units = CATEGORIES[category].units;
    var a = units[from], b = units[to];
    if (a === undefined || b === undefined) throw new Error('Unknown unit');

    var base = typeof a === 'object' ? a.to(value) : value * a;
    return typeof b === 'object' ? b.from(base) : base / b;
  }

  /* Trim floating-point noise without losing small magnitudes. */
  function format(n) {
    if (!isFinite(n)) return '—';
    if (n === 0) return '0';
    var abs = Math.abs(n);
    if (abs >= 1e15 || abs < 1e-6) return n.toExponential(6).replace(/e([+-])(\d)$/, 'e$10$2');
    return String(parseFloat(n.toPrecision(12)));
  }

  global.Units = { categories: CATEGORIES, names: unitNames, convert: convert, format: format };
})(window);
