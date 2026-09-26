/* Per-browser preferences: pinned tools, recently opened tools, the modes
   picked on the home page and the density of the tool grids. Everything lives in localStorage and every
   access is guarded, because private windows throw on both read and write. */
(function (global) {
  'use strict';

  var KEY_PINS = 'att-pins';
  var KEY_RECENT = 'att-recent';
  var KEY_DENSITY = 'att-density';
  var KEY_MODES = 'att-modes';
  var RECENT_MAX = 12;

  var listeners = [];

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var value = JSON.parse(raw);
      return value === null || value === undefined ? fallback : value;
    } catch (e) { return fallback; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }

  function pins() {
    var value = read(KEY_PINS, []);
    return Array.isArray(value) ? value.filter(function (id) { return typeof id === 'string'; }) : [];
  }

  function isPinned(id) { return pins().indexOf(id) > -1; }

  function togglePin(id) {
    var list = pins();
    var at = list.indexOf(id);
    if (at > -1) list.splice(at, 1); else list.unshift(id);
    write(KEY_PINS, list);
    emit();
    return at === -1;
  }

  function recent() {
    var value = read(KEY_RECENT, []);
    return Array.isArray(value) ? value.filter(function (id) { return typeof id === 'string'; }) : [];
  }

  function remember(id) {
    var list = recent().filter(function (other) { return other !== id; });
    list.unshift(id);
    write(KEY_RECENT, list.slice(0, RECENT_MAX));
    emit();
  }

  function clearRecent() { write(KEY_RECENT, []); emit(); }

  /* The home page modes ("Everyday", "Developer"…) the visitor has ticked. */
  function modes() {
    var value = read(KEY_MODES, []);
    return Array.isArray(value) ? value.filter(function (id) { return typeof id === 'string'; }) : [];
  }

  function setModes(list) { write(KEY_MODES, list); emit(); }

  function density() {
    return read(KEY_DENSITY, 'comfortable') === 'compact' ? 'compact' : 'comfortable';
  }

  function setDensity(value) {
    write(KEY_DENSITY, value === 'compact' ? 'compact' : 'comfortable');
    document.documentElement.setAttribute('data-density', density());
    emit();
  }

  /* Point saved ids at the tool that now answers to them (a merged tool
     resolves to the one that replaced it) and drop the rest, so a renamed or
     merged tool cannot strand a pin. `resolve` returns an id or null. */
  function prune(resolve) {
    function fix(list) {
      var out = [];
      list.forEach(function (id) {
        var to = resolve(id);
        if (to && out.indexOf(to) === -1) out.push(to);
      });
      return out;
    }
    write(KEY_PINS, fix(pins()));
    write(KEY_RECENT, fix(recent()));
  }

  global.Prefs = {
    pins: pins,
    isPinned: isPinned,
    togglePin: togglePin,
    recent: recent,
    remember: remember,
    clearRecent: clearRecent,
    modes: modes,
    setModes: setModes,
    density: density,
    setDensity: setDensity,
    prune: prune,
    onChange: function (fn) { listeners.push(fn); }
  };

  document.documentElement.setAttribute('data-density', density());
})(window);
