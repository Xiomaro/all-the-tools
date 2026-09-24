/* Regional defaults: the visitor picks a country on the Regional settings
   page and tools that have a currency, unit system, temperature scale,
   paper size or first day of the week start from that country's usual
   choice. Each setting can be overridden on its own. Nothing here changes
   the language of the site, and tools about one country's rules (UK tax,
   UK bank holidays) keep their own currency whatever is chosen.

   Stored in localStorage under att-region as { country, overrides }. Reads
   and writes are guarded because private windows throw on both. */
(function (global) {
  'use strict';

  var KEY = 'att-region';
  var DEFAULT_COUNTRY = 'GB';

  /* English-speaking countries first, then the largest internet populations
     among the rest. `locale` is used only to format numbers and money
     (English wording, local separators and symbols). */
  var COUNTRIES = [
    { code: 'GB', name: 'United Kingdom', currency: 'GBP', locale: 'en-GB', units: 'metric', temperature: 'C', paper: 'a4', weekStart: 1, city: 'London' },
    { code: 'US', name: 'United States', currency: 'USD', locale: 'en-US', units: 'imperial', temperature: 'F', paper: 'letter', weekStart: 0, city: 'New York' },
    { code: 'CA', name: 'Canada', currency: 'CAD', locale: 'en-CA', units: 'metric', temperature: 'C', paper: 'letter', weekStart: 0, city: 'Toronto' },
    { code: 'AU', name: 'Australia', currency: 'AUD', locale: 'en-AU', units: 'metric', temperature: 'C', paper: 'a4', weekStart: 1, city: 'Sydney' },
    { code: 'NZ', name: 'New Zealand', currency: 'NZD', locale: 'en-NZ', units: 'metric', temperature: 'C', paper: 'a4', weekStart: 1, city: 'Auckland' },
    { code: 'IE', name: 'Ireland', currency: 'EUR', locale: 'en-IE', units: 'metric', temperature: 'C', paper: 'a4', weekStart: 1, city: 'Dublin' },
    { code: 'IN', name: 'India', currency: 'INR', locale: 'en-IN', units: 'metric', temperature: 'C', paper: 'a4', weekStart: 0, city: 'Mumbai' },
    { code: 'ZA', name: 'South Africa', currency: 'ZAR', locale: 'en-ZA', units: 'metric', temperature: 'C', paper: 'a4', weekStart: 0, city: 'Johannesburg' },
    { code: 'NG', name: 'Nigeria', currency: 'NGN', locale: 'en-NG', units: 'metric', temperature: 'C', paper: 'a4', weekStart: 1, city: 'Lagos' },
    { code: 'PH', name: 'Philippines', currency: 'PHP', locale: 'en-PH', units: 'metric', temperature: 'C', paper: 'letter', weekStart: 0, city: 'Manila' },
    { code: 'PK', name: 'Pakistan', currency: 'PKR', locale: 'en-PK', units: 'metric', temperature: 'C', paper: 'a4', weekStart: 1, city: 'Karachi' },
    { code: 'SG', name: 'Singapore', currency: 'SGD', locale: 'en-SG', units: 'metric', temperature: 'C', paper: 'a4', weekStart: 0, city: 'Singapore' },
    { code: 'DE', name: 'Germany', currency: 'EUR', locale: 'en-DE', units: 'metric', temperature: 'C', paper: 'a4', weekStart: 1, city: 'Berlin' },
    { code: 'FR', name: 'France', currency: 'EUR', locale: 'en-FR', units: 'metric', temperature: 'C', paper: 'a4', weekStart: 1, city: 'Paris' },
    { code: 'ES', name: 'Spain', currency: 'EUR', locale: 'en-ES', units: 'metric', temperature: 'C', paper: 'a4', weekStart: 1, city: 'Madrid' },
    { code: 'IT', name: 'Italy', currency: 'EUR', locale: 'en-IT', units: 'metric', temperature: 'C', paper: 'a4', weekStart: 1, city: 'Rome' },
    { code: 'NL', name: 'Netherlands', currency: 'EUR', locale: 'en-NL', units: 'metric', temperature: 'C', paper: 'a4', weekStart: 1, city: 'Amsterdam' },
    { code: 'BR', name: 'Brazil', currency: 'BRL', locale: 'en-BR', units: 'metric', temperature: 'C', paper: 'a4', weekStart: 0, city: 'São Paulo' },
    { code: 'MX', name: 'Mexico', currency: 'MXN', locale: 'en-MX', units: 'metric', temperature: 'C', paper: 'letter', weekStart: 0, city: 'Mexico City' },
    { code: 'JP', name: 'Japan', currency: 'JPY', locale: 'en-JP', units: 'metric', temperature: 'C', paper: 'a4', weekStart: 0, city: 'Tokyo' }
  ];

  /* The settings a visitor can override, with the values each may take. */
  var CHOICES = {
    currency: COUNTRIES.map(function (c) { return c.currency; }).filter(function (c, i, a) { return a.indexOf(c) === i; }),
    units: ['metric', 'imperial'],
    temperature: ['C', 'F'],
    paper: ['a4', 'letter'],
    weekStart: [1, 0]
  };

  var listeners = [];

  function country(code) {
    for (var i = 0; i < COUNTRIES.length; i++) if (COUNTRIES[i].code === code) return COUNTRIES[i];
    return null;
  }

  function stored() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (v && typeof v === 'object') return v;
    } catch (e) { /* private browsing or bad JSON */ }
    return {};
  }

  function save(v) {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* ignore */ }
    listeners.forEach(function (fn) { try { fn(get()); } catch (e) {} });
  }

  /* The effective settings: the chosen country's defaults with any valid
     overrides laid on top. Always returns a complete object. */
  function get() {
    var s = stored();
    var base = country(s.country) || country(DEFAULT_COUNTRY);
    var out = {
      country: base.code, countryName: base.name, locale: base.locale, city: base.city,
      currency: base.currency, units: base.units, temperature: base.temperature,
      paper: base.paper, weekStart: base.weekStart
    };
    var o = s.overrides && typeof s.overrides === 'object' ? s.overrides : {};
    Object.keys(CHOICES).forEach(function (k) {
      if (o[k] !== undefined && CHOICES[k].indexOf(o[k]) > -1) out[k] = o[k];
    });
    return out;
  }

  function isSet() { return !!country(stored().country); }

  /* Choosing a country clears the overrides, so its defaults apply whole. */
  function setCountry(code) {
    if (!country(code)) return;
    save({ country: code, overrides: {} });
  }

  /* Override one setting; pass null to go back to the country's default. */
  function setOverride(key, value) {
    if (!CHOICES[key]) return;
    var s = stored();
    var o = s.overrides && typeof s.overrides === 'object' ? s.overrides : {};
    var base = country(s.country) || country(DEFAULT_COUNTRY);
    if (value === null || value === base[key]) delete o[key];
    else if (CHOICES[key].indexOf(value) > -1) o[key] = value;
    save({ country: base.code, overrides: o });
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    listeners.forEach(function (fn) { try { fn(get()); } catch (e) {} });
  }

  /* --- helpers for tools ------------------------------------------------- */

  /* Format an amount in the visitor's currency (or `opts.currency`).
     `digits` fixes the decimal places; leave it out for the currency's own. */
  function money(n, digits, opts) {
    if (!isFinite(n)) return '—';
    var r = get(), cur = (opts && opts.currency) || r.currency;
    var f = { style: 'currency', currency: cur };
    if (digits !== undefined) { f.minimumFractionDigits = digits; f.maximumFractionDigits = digits; }
    try { return new Intl.NumberFormat(r.locale, f).format(n); }
    catch (e) { return cur + ' ' + Number(n).toFixed(digits === undefined ? 2 : digits); }
  }

  /* The symbol for the visitor's currency (or `code`), e.g. "£", "$", "₹". */
  function symbol(code) {
    var r = get(), cur = code || r.currency;
    try {
      var part = new Intl.NumberFormat(r.locale, { style: 'currency', currency: cur }).formatToParts(1)
        .filter(function (p) { return p.type === 'currency'; })[0];
      return part ? part.value : cur;
    } catch (e) { return cur; }
  }

  function imperial() { return get().units === 'imperial'; }
  function fahrenheit() { return get().temperature === 'F'; }

  global.Region = {
    COUNTRIES: COUNTRIES,
    CHOICES: CHOICES,
    country: country,
    get: get,
    isSet: isSet,
    setCountry: setCountry,
    setOverride: setOverride,
    reset: reset,
    money: money,
    symbol: symbol,
    imperial: imperial,
    fahrenheit: fahrenheit,
    onChange: function (fn) { listeners.push(fn); }
  };
})(window);
