/* Icon set for the shell. Every glyph is a plain 24x24 stroke drawing that
   inherits currentColor, so a tile only has to set a colour. Tools pick an
   icon through the rule list below; anything unmatched falls back to the
   icon of its category. */
(function (global) {
  'use strict';

  var G = {
    /* documents and files */
    doc:        'M7 3h7l5 5v13H7z M14 3v5h5',
    docs:       'M9 3h6l4 4v11H9z M5 7v14h10 M15 3v4h4',
    scissors:   'M6 4l9 12 M18 4L9 16 M7 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M17 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    compress:   'M4 12h16 M9 8l3-3 3 3 M9 16l3 3 3-3',
    expand:     'M12 4v16 M8 8L5 12l3 4 M16 8l3 4-3 4',
    rotate:     'M20 12a8 8 0 1 1-2.6-5.9 M20 4v4h-4',
    stamp:      'M7 20h10 M9 17h6l-.7-5a2.5 2.5 0 0 1 .8-2.2A3.5 3.5 0 1 0 8.9 9.8a2.5 2.5 0 0 1 .8 2.2z',
    hashNum:    'M5 9h14 M5 15h14 M10 4l-1.5 16 M16 4l-1.5 16',
    tag:        'M11 3H4v7l10 10 7-7z M7.5 7.5h.01',
    unlock:     'M6 11h12v9H6z M9 11V7.5a3 3 0 0 1 5.9-.8',
    lock:       'M6 11h12v9H6z M9 11V8a3 3 0 0 1 6 0v3',
    scan:       'M4 8V5a1 1 0 0 1 1-1h3 M16 4h3a1 1 0 0 1 1 1v3 M20 16v3a1 1 0 0 1-1 1h-3 M8 20H5a1 1 0 0 1-1-1v-3 M4 12h16',
    folder:     'M3 7a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
    archive:    'M3 5h18v4H3z M5 9v10h14V9 M10 13h4',
    table:      'M3 5h18v14H3z M3 10h18 M9 10v9 M15 10v9',
    database:   'M4 6a8 3 0 1 0 16 0 8 3 0 1 0-16 0z M4 6v12a8 3 0 0 0 16 0V6 M4 12a8 3 0 0 0 16 0',

    /* pictures and media */
    image:      'M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6 M8.5 9.5h.01',
    crop:       'M6 2v14a2 2 0 0 0 2 2h14 M2 6h14a2 2 0 0 1 2 2v14',
    resize:     'M4 4h8v8H4z M12 12h8v8h-8z M12 12l-4-4',
    palette2:   'M12 3a9 9 0 1 0 0 18c1.4 0 2-.9 2-1.8 0-1.3-1.2-1.7-1.2-2.7 0-.8.7-1.5 1.6-1.5H16a5 5 0 0 0 5-5c0-4-4-7-9-7z M7.5 12h.01 M9.5 8h.01 M14.5 7.5h.01',
    droplet:    'M12 3.5s6 6 6 9.7A6 6 0 0 1 6 13.2c0-3.7 6-9.7 6-9.7z',
    contrast:   'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 3v18a9 9 0 0 0 0-18z',
    blur:       'M12 3.5s6 6 6 9.7A6 6 0 0 1 6 13.2c0-3.7 6-9.7 6-9.7z M9 13h.01 M12 15h.01 M15 12h.01',
    sun:        'M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5L19 19 M19 5l-1.5 1.5 M6.5 17.5L5 19',
    film:       'M3 5h18v14H3z M3 9h4 M17 9h4 M3 15h4 M17 15h4 M9 5v14 M15 5v14',
    play:       'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M10.5 8.5l5.5 3.5-5.5 3.5z',
    speaker:    'M4 9.5h3.5L12 5v14l-4.5-4.5H4z M15.5 9a4 4 0 0 1 0 6 M18.5 6.5a8 8 0 0 1 0 11',
    mute:       'M4 9.5h3.5L12 5v14l-4.5-4.5H4z M16 10l4 4 M20 10l-4 4',
    mic:        'M12 3.5a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-5 0V6A2.5 2.5 0 0 1 12 3.5z M6.5 11a5.5 5.5 0 0 0 11 0 M12 16.5V20 M9 20h6',
    camera:     'M3 8h4l1.5-2h7L17 8h4v11H3z M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
    monitor:    'M3 4h18v12H3z M8 20h8 M12 16v4',
    music:      'M9 18V5l11-2v13 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
    metronome:  'M9 3h6l4 18H5z M8 16h8 M12 16l4.5-9',
    wave:       'M2 12c2-5 4-5 5 0s3 5 5 0 3-5 5 0 3 5 5 0',
    gauge:      'M12 19a8 8 0 1 1 8-8 M12 12l4.5-3.5 M12 12h.01',

    /* text */
    type:       'M5 6V4.5h14V6 M12 4.5V20 M9 20h6',
    quote:      'M5 5h14 M5 10h14 M5 15h9',
    sort:       'M7 4v16 M4 8l3-4 3 4 M17 20V4 M14 16l3 4 3-4',
    diff:       'M6 4v12 M3 8h6 M3 19h6 M15 7h6 M15 17h6 M18 14v6',
    search:     'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M16.5 16.5L21 21',
    wrap:       'M4 6h16 M4 12h12a3 3 0 0 1 0 6h-4 M11 15l-2 3 2 3',
    list:       'M4 6h.01 M4 12h.01 M4 18h.01 M8 6h12 M8 12h12 M8 18h12',
    smile:      'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M9 10h.01 M15 10h.01 M8.5 14.5a4.5 4.5 0 0 0 7 0',
    book:       'M4 5a2 2 0 0 1 2-2h4v18H6a2 2 0 0 0-2 2z M20 5a2 2 0 0 0-2-2h-4v18h4a2 2 0 0 1 2 2z',
    dots:       'M6 7h.01 M10 7h.01 M6 12h.01 M14 12h.01 M10 17h.01 M18 7h.01',

    /* code */
    code:       'M8.5 7L4 12l4.5 5 M15.5 7l4.5 5-4.5 5 M13.5 4.5l-3 15',
    braces:     'M9 4c-2 0-2 3-2 4s0 3-2 4c2 1 2 3 2 4s0 4 2 4 M15 4c2 0 2 3 2 4s0 3 2 4c-2 1-2 3-2 4s0 4-2 4',
    terminal:   'M3 5h18v14H3z M7 10l2.5 2L7 14 M12.5 15H17',
    regex:      'M12 5v10 M7.5 7.5l9 5 M16.5 7.5l-9 5 M6 18h.01',
    css:        'M4 4h16l-1.5 15L12 21l-6.5-2z M16 8H9l.4 4H15l-.3 3-2.7.9-2.7-.9-.15-1.6',
    link:       'M10 14a4 4 0 0 0 6 .5l2-2a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-6-.5l-2 2a4 4 0 0 0 5.7 5.7l1-1',
    branch:     'M7 5.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M7 9.5V19 M7 19a2 2 0 1 0 0 0z M17 5.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M17 9.5c0 3-4 3-6.5 4.5',
    grid:       'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',
    layout:     'M3 5h18v14H3z M3 10h18 M10 10v9',
    shield:     'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4',
    key:        'M15 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12z M11 13l-8 8 M6 16l2 2 M9 19l1.5 1.5',
    fingerprint:'M12 4a8 8 0 0 0-8 8 M20 12a8 8 0 0 0-4-6.9 M8 12a4 4 0 0 1 8 0v5 M12 12v6 M8 16v3',

    /* numbers */
    calculator: 'M5 3h14v18H5z M8 7h8 M8 11h.01 M12 11h.01 M16 11h.01 M8 15h.01 M12 15h.01 M16 15v3',
    percent:    'M6 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M18 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M19 5L5 19',
    sigma:      'M18 5H6l6 7-6 7h12v-3',
    chart:      'M4 20V4 M4 20h16 M8 16v-4 M12.5 16V8 M17 16v-6',
    swap:       'M4 8h14 M15 5l3 3-3 3 M20 16H6 M9 13l-3 3 3 3',
    ruler:      'M3 13.5L13.5 3l7.5 7.5L10.5 21z M7.5 9l2 2 M10.5 6l2 2 M4.5 12l2 2',
    scale:      'M12 4v16 M7 20h10 M4 9h16 M4 9l-2 5a3 3 0 0 0 6 0z M20 9l2 5a3 3 0 0 1-6 0z',
    coin:       'M12 4a8 4 0 1 0 0 8 8 4 0 0 0 0-8z M4 8v8a8 4 0 0 0 16 0V8 M4 12a8 4 0 0 0 16 0',
    card:       'M3 6h18v12H3z M3 10h18 M7 15h4',
    trending:   'M4 17l5-5 3.5 3.5L20 8 M20 8h-4.5 M20 8v4.5',

    /* time */
    clock:      'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5.2l3.2 2',
    calendar:   'M4 6h16v15H4z M4 11h16 M8 3v5 M16 3v5',
    timer:      'M12 6a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M12 10v4.5l3 1.5 M9 3h6',
    globe:      'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c2.6 3 2.6 15 0 18 M12 3c-2.6 3-2.6 15 0 18',
    moon:       'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z',

    /* network */
    wifi:       'M4.5 9.5a11 11 0 0 1 15 0 M7.5 13a7 7 0 0 1 9 0 M10.5 16.3a3 3 0 0 1 3 0 M12 19.5h.01',
    server:     'M3 4h18v6H3z M3 14h18v6H3z M7 7h.01 M7 17h.01',
    route:      'M6 4a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z M18 15a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z M6 9v4a4 4 0 0 0 4 4h8',
    plug:       'M9 3v5 M15 3v5 M6 8h12v3a6 6 0 0 1-12 0z M12 17v4',
    mail:       'M3 6h18v12H3z M3 7l9 6.5L21 7',

    /* generators and play */
    dice:       'M4 4h16v16H4z M8.5 8.5h.01 M15.5 8.5h.01 M12 12h.01 M8.5 15.5h.01 M15.5 15.5h.01',
    wheel:      'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 3v9l7 4.5 M12 12L5 16.5',
    sparkle:    'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z M18.5 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z',
    qr:         'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h2v2h-2z M18 14h2v2h-2z M14 18h2v2h-2z M18 18h2v2h-2z',
    barcode:    'M4 5v14 M7 5v14 M10 5v10 M13 5v14 M16 5v10 M20 5v14',
    trophy:     'M7 4h10v5a5 5 0 0 1-10 0z M7 5.5H4V8a3 3 0 0 0 3 3 M17 5.5h3V8a3 3 0 0 1-3 3 M12 14v3 M8.5 20h7l-.5-3h-6z',
    gift:       'M3 10h18v3H3z M4.5 13v8h15v-8 M12 10v11 M12 10S10.5 4 8 5.5 12 10 12 10z M12 10s1.5-6 4-4.5S12 10 12 10z',
    gamepad:    'M7 8h10a4 4 0 0 1 3.9 5l-.8 3.5a2.2 2.2 0 0 1-4 .8L14.5 15h-5l-1.6 2.3a2.2 2.2 0 0 1-4-.8L3.1 13A4 4 0 0 1 7 8z M7.5 11.5v3 M6 13h3 M15.5 12h.01 M17.5 14h.01',
    person:     'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M4.5 21a7.5 7.5 0 0 1 15 0',
    users:      'M9 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z M2.5 20a6.5 6.5 0 0 1 13 0 M16 5.2a3.5 3.5 0 0 1 0 6.6 M17 14.5a6.5 6.5 0 0 1 4.5 5.5',

    /* misc */
    share:      'M17 3a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z M6 9a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z M17 16a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z M8.5 10.5l6-2.5 M8.5 13l6 2.5',
    brain:      'M12 5a3 3 0 0 0-5.7-1.3A2.8 2.8 0 0 0 4 8a3 3 0 0 0 .6 4.6A3 3 0 0 0 7 18a3 3 0 0 0 5 1.5z M12 5a3 3 0 0 1 5.7-1.3A2.8 2.8 0 0 1 20 8a3 3 0 0 1-.6 4.6A3 3 0 0 1 17 18a3 3 0 0 1-5 1.5z M12 5v14.5',
    target:     'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 11.5h.01',
    keyboard:   'M2.5 6h19v12h-19z M6 10h.01 M10 10h.01 M14 10h.01 M18 10h.01 M6 14h.01 M9 14h6 M18 14h.01',
    cursor:     'M6 3l12 8-5 1.3L10.5 17z M13 14l4 6',
    star:       'M12 3.5l2.7 5.6 6 .9-4.4 4.3 1.1 6.1-5.4-2.9-5.4 2.9 1.1-6.1L3.3 10l6-.9z',
    pin:        'M12 21v-6 M8 4h8l-1 6 2.5 2.5v1.5h-11V12.5L9 10z',
    bolt:       'M13 3L5 14h6l-1 7 8-11h-6z',
    heartPulse: 'M12 20S4 15 4 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15 12 20 12 20z M3 12.5h4.5l1.5-2.5 2.5 5 2-3.5h7.5',
    heart:      'M12 20S4 15 4 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15 12 20 12 20z',
    home:       'M3.5 11.5L12 4l8.5 7.5 M6 10v10h12V10 M10 20v-6h4v6',
    chevron:    'M7 10l5 5 5-5',

    /* added with the newer categories */
    ai:         'M4 4h16v16H4z M12 7l1.3 3.2 3.2 1.3-3.2 1.3L12 16l-1.3-3.2L7.5 11.5l3.2-1.3z',
    flask:      'M9.5 3h5 M10.5 3v6.2L5 18.4A1.8 1.8 0 0 0 6.6 21h10.8a1.8 1.8 0 0 0 1.6-2.6L13.5 9.2V3 M7.4 15h9.2',
    chip:       'M7 7h10v10H7z M10 10h4v4h-4z M9.5 3v4 M14.5 3v4 M9.5 17v4 M14.5 17v4 M3 9.5h4 M3 14.5h4 M17 9.5h4 M17 14.5h4',
    mapPin:     'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z M12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
    roller:     'M4 4h13v5H4z M17 6.5h3v5h-8.5V15 M10 15h3v6h-3z',
    checklist:  'M4 6.5l1.5 1.5L8.5 5 M4 12.5l1.5 1.5 3-3 M4 18.5l1.5 1.5 3-3 M12 6.5h8 M12 12.5h8 M12 18.5h8',
    note:       'M6 3h9l4 4v14H6z M15 3v4h4 M9 11h7 M9 15h7',
    cards:      'M9 3.5h9.5v14H9z M5.5 6.5l3.5-.6 M5.5 6.5l2.2 13.2 7.3-1.2',
    grid9:      'M4 4h16v16H4z M9.3 4v16 M14.7 4v16 M4 9.3h16 M4 14.7h16',
    wind:       'M3 8h11a3 3 0 1 0-3-3 M3 12h15a3 3 0 1 1-3 3 M3 16h7',
    phone:      'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M11 18h2',
    dumbbell:   'M3 10v4 M6 7.5v9 M18 7.5v9 M21 10v4 M6 12h12'
  };

  var VIEWBOX = '0 0 24 24';

  function svg(name, opts) {
    opts = opts || {};
    var d = G[name] || G.wheel;
    var node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    node.setAttribute('viewBox', VIEWBOX);
    node.setAttribute('fill', 'none');
    node.setAttribute('stroke', 'currentColor');
    node.setAttribute('stroke-width', opts.weight || '1.7');
    node.setAttribute('stroke-linecap', 'round');
    node.setAttribute('stroke-linejoin', 'round');
    node.setAttribute('aria-hidden', 'true');
    if (opts.class) node.setAttribute('class', opts.class);
    d.split(' M').forEach(function (part, i) {
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', i ? 'M' + part : part);
      node.appendChild(path);
    });
    return node;
  }

  /* One icon per category, used as the fallback and on the home page. */
  var CATEGORY = {
    pdf: 'doc', image: 'image', video: 'film', text: 'type', developer: 'code',
    math: 'calculator', converters: 'swap', color: 'palette2', crypto: 'shield',
    network: 'wifi', file: 'folder', generators: 'sparkle', seo: 'search',
    time: 'clock', finance: 'coin', social: 'share', devices: 'monitor', brain: 'brain',
    audio: 'music', data: 'database', css: 'css', games: 'dice', health: 'heartPulse',
    ai: 'ai', science: 'flask', electronics: 'chip', geo: 'mapPin', home: 'roller', productivity: 'checklist'
  };

  /* Matched in order against "<id> <name> <keywords>". First hit wins, so the
     rules run from the most specific format or domain down to the general
     verbs. Word boundaries matter more than they look: "border" contains
     "order", "reaction-time-test" contains both "time" and "test", and each
     of those used to steal an icon from a better match. */
  var RULES = [
    /* --- the newer tools, before the broad rules below catch a stray word
       ("token" in the token counter, "table" in the periodic table) --- */
    [/chart-maker/, 'chart'],
    [/markdown-to-pdf/, 'doc'],
    [/readability-score/, 'book'],
    [/font-viewer/, 'type'],
    [/cv-builder|npc-generator/, 'person'],
    [/meeting-cost-timer/, 'coin'],
    [/stopwatch/, 'timer'],
    [/solar-payback|sun-position/, 'sun'],
    [/savings-goal|pay-rise-calculator/, 'trending'],
    [/minesweeper|game-2048|word-guess/, 'grid9'],
    [/encounter-calculator/, 'shield'],
    [/loot-generator/, 'sparkle'],
    [/sensitivity-converter/, 'cursor'],
    [/pixel-art-editor/, 'grid'],
    [/piano-chords/, 'music'],
    [/shamir-secret-sharing/, 'share'],
    [/token-counter|tokeni[sz]er/, 'hashNum'],
    [/volume-converter|flow-rate/, 'droplet'],
    [/battery-runtime/, 'plug'],
    [/invoice-generator/, 'coin'],
    [/text-transformer/, 'wrap'],
    [/image-favicon/, 'image'],
    [/shape-calculator|sig-figs|probability-calculator|equation-solver|complex-calculator|modular-calculator/, 'sigma'],
    [/license-generator|licen[cs]e/, 'doc'],
    [/periodic-table|molar-mass|equation-balancer|chemical/, 'flask'],
    [/suvat|half-life/, 'trending'],
    [/degree-classification|citation/, 'book'],
    [/ohms-law|led-resistor|voltage-divider|capacitor|wire-gauge|timer-555|pcb-trace|resistor/, 'chip'],
    [/coordinate|geohash|gpx|polygon-area|distance-calculator/, 'mapPin'],
    [/paint-calc|wallpaper|tile-calc|concrete/, 'roller'],
    [/kanban|to-do|todo|checklist/, 'checklist'],
    [/notepad/, 'note'],
    [/flashcard|deck-of-cards/, 'cards'],
    [/sudoku|crossword|word-search/, 'grid9'],
    [/mermaid|diagram/, 'branch'],
    [/breathing/, 'wind'],
    [/one-rep-max/, 'dumbbell'],
    [/vibration|gps-test/, 'phone'],
    [/midi/, 'music'],
    [/hearing/, 'speaker'],
    [/ufo-test|ghosting/, 'monitor'],
    [/ai-translate|punycode/, 'globe'],
    [/ai-summarise/, 'quote'],
    [/ai-sentiment|charades/, 'smile'],
    [/ai-object-detection/, 'target'],
    [/ai-image-caption/, 'image'],
    [/audio-visualiser|noise-reduction|audio-fade/, 'wave'],
    [/bpm-detector/, 'metronome'],

    /* --- named formats and domains --- */
    [/\bqr\b|qr-code/, 'qr'],
    [/barcode/, 'barcode'],
    [/regex|regular expression/, 'regex'],
    [/\bcss\b|scss|\bless\b|gradient|box-shadow|text-shadow|border-radius|clip-path|flexbox|specificity|keyframe/, 'css'],
    [/json|yaml|toml|graphql|xml\b|\bxsd\b/, 'braces'],
    [/base64|base32|html-entit|entities|url-encode|url-decode|percent-encod|\bencoder\b|\bdecoder\b/, 'swap'],
    [/\bjwt\b|\brsa\b|\baes\b|cipher|hmac|bcrypt|keygen|\botp\b|\btoken\b|password|passphrase/, 'key'],
    [/\bhash\b|checksum|\bmd5\b|sha-?\d|fingerprint/, 'fingerprint'],
    [/gitignore|git-commit|\bgit\b|\bbranch\b|\bcron\b/, 'branch'],
    [/http-status|user-agent|\bheaders?\b|htaccess|robots/, 'terminal'],
    [/sitemap|\bseo\b|keyword|meta-tag|og-tag|schema|twitter-card|reading-time/, 'tag'],
    [/\burl\b|\buri\b|\blink\b|hyperlink|shorten/, 'link'],
    [/\bemail\b|\bmail\b|smtp/, 'mail'],
    [/markdown|html-to-text|text-to-html|html-viewer|\bpreview\b/, 'quote'],

    /* --- music and health, before "click track" reads as a mouse test and
       "calculator" swallows BMI --- */
    [/metronome/, 'metronome'],
    [/\btuner\b|vocal|karaoke/, 'music'],
    [/tone-generator|oscillator/, 'wave'],
    [/\bsleep\b|bedtime/, 'moon'],
    [/\bpace\b|marathon/, 'timer'],
    [/\bbmi\b|body mass/, 'scale'],
    [/calorie-calc|\btdee\b|\bbmr\b/, 'heartPulse'],

    /* --- the tests and games, before the verbs claim "test" and "time" --- */
    [/reaction|memory-test|\bmemory\b|\bbrain\b/, 'brain'],
    [/\baim\b|trainer|\btarget\b/, 'target'],
    [/gamepad|controller|joystick/, 'gamepad'],
    [/keyboard|typing/, 'keyboard'],
    [/\bmouse\b|touch|cursor|\bclick\b|\bpointer\b/, 'cursor'],
    [/monitor|\bscreen\b|display|bubble-level/, 'monitor'],
    [/tournament|bracket|scoreboard|buzzer|bingo|trophy/, 'trophy'],
    [/\bdice\b|\broll\b/, 'dice'],
    [/wheel|\bspin\b/, 'wheel'],
    [/santa|\bgift\b/, 'gift'],
    [/\bteams?\b/, 'users'],

    /* --- the verbs that describe what a tool does to a file --- */
    [/\bmerge\b|combine|concat|collage/, 'docs'],
    [/\bsplit\b|\bslice\b|\bcut\b|\btrim\b|scissor/, 'scissors'],
    [/compress|minify|shrink|uglify|optimi[sz]/, 'compress'],
    [/rotate|reverse|\bflip\b|boomerang|\bloop\b/, 'rotate'],
    [/watermark|signature|\bstamp\b|redact/, 'stamp'],
    [/page-number|number-lines|line number/, 'hashNum'],
    [/metadata|\bexif\b/, 'tag'],
    [/unlock|decrypt/, 'unlock'],
    [/\bscan\b|scanner|document-scanner/, 'scan'],
    [/\bzip\b|archive/, 'archive'],
    [/\bcrop\b|reframe/, 'crop'],
    [/resize|rescale|aspect-ratio|resolution|dimension/, 'resize'],
    [/\bblur\b/, 'blur'],
    [/bright|contrast|gr[ae]yscale|\bfilters?\b|adjust|green-screen/, 'sun'],

    /* --- media --- */
    [/subtitle|caption|\bsrt\b|\bvtt\b|teleprompter/, 'quote'],
    [/microphone|\bmic\b|voice|dictate|transcribe|speech/, 'mic'],
    [/webcam|camera|screen-record|screenshot/, 'camera'],
    [/volume|speaker|boost|decibel|sound-level/, 'speaker'],
    [/\bmute\b|silence/, 'mute'],
    [/\bheic\b|\bwebp\b|\bavif\b|\bsvg\b|\bpng\b|\bjpe?g\b|favicon|thumbnail|passport|profile-picture|placeholder|whiteboard|photo-booth/, 'image'],
    [/ascii-art|\bdraw\b/, 'cursor'],

    /* --- text --- */
    [/\btable\b|spreadsheet|excel|\bcsv\b|\bsql\b/, 'table'],
    [/\bdiff\b|compare|comparison/, 'diff'],
    [/\bsort\b|sorter|sorting|\border\b|sequence|shuffle/, 'sort'],
    [/\bcount\b|frequency|statistic|\bstats\b|density|analy[sz]/, 'chart'],
    [/\bwrap\b|padding|truncate|\brepeat\b|spaces|cleaner|replace|\bcase\b|\bslug\b/, 'wrap'],
    [/emoji|fancy-text/, 'smile'],
    [/lorem|braille|morse|\bnato\b|roman|unicode|binary-text|rot13|palindrome/, 'book'],

    /* --- time, before "convert" and "test" get their turn --- */
    [/timezone|time zone|world-clock|\bglobe\b|country/, 'globe'],
    [/\bmoon\b|sunrise|sunset/, 'moon'],
    [/countdown|\btimer\b|chess-clock|stopwatch/, 'timer'],
    [/\bdate\b|calendar|\bweek\b|day-of-year|\bage\b|working-days|birthday/, 'calendar'],
    [/\btime\b|\bclock\b|timestamp|\bepoch\b/, 'clock'],

    /* --- numbers and money --- */
    [/percent|discount|\bvat\b|\btax\b|margin|\btip\b/, 'percent'],
    [/prime|factorial|fibonacci|\bgcd\b|\blcm\b|matrix|logarithm|quadratic|bitwise|fraction|ratio|statistics|scientific|number-base|triangle-calc|circle-calc/, 'sigma'],
    [/currency|\bloan\b|mortgage|savings|interest|inflation|\bprice\b|\biban\b|credit-card|\broi\b|profit|invoice/, 'coin'],
    [/calculator|\bcalc\b/, 'calculator'],
    [/\bruler\b|length|paper-size|ring-size|shoe-size|height/, 'ruler'],
    [/weight|pressure|\bbmi\b|calorie/, 'scale'],
    [/trend|growth|\bchange\b/, 'trending'],

    /* --- network --- */
    [/\bdns\b|whois|\bping\b|subnet|\bip\b|ip-address|speed-test|network|\bwifi\b/, 'wifi'],
    [/\bport\b|\bssl\b|server|hosting/, 'server'],
    [/\broute\b|\btrace\b|\bpath\b/, 'route'],
    [/\bpower\b|energy|\bfuel\b|battery/, 'plug'],

    /* --- the general catch-alls --- */
    [/convert|converter/, 'swap'],
    [/extract|lookup|\bchecker\b|\btester\b|\btest\b|inspect|\bsearch\b/, 'search'],
    [/\bteam\b|\busers\b|people/, 'users'],
    [/name-gen|fake-data|\bperson\b|\bbio\b|\bprofile\b/, 'person'],
    [/\brandom\b/, 'wheel'],
    [/generator|generate|\buuid\b|\bulid\b|\bmaker\b|\bbuilder\b/, 'sparkle'],
    [/colou?r|palette|\bhex\b|\brgb\b|\bhsl\b|shades|harmon|blind/, 'palette2'],
    [/\bmixer\b|\bmix\b/, 'droplet'],
    [/layout|\bgrid\b|room-planner/, 'layout'],
    [/social|\bshare\b|tweet|hashtag|instagram|youtube|og-preview/, 'share'],
    [/\bfile\b|folder|document/, 'folder'],
    [/\block\b|secure|security/, 'lock'],
    [/formatter|beautif|prettif|\bformat\b/, 'braces'],
    [/\btext\b|\bword\b|\bstring\b|\bcharacter\b/, 'type']
  ];

  var cache = Object.create(null);

  function nameFor(tool) {
    if (cache[tool.id]) return cache[tool.id];
    var haystack = (tool.id + ' ' + tool.name + ' ' + (tool.keywords || []).join(' ')).toLowerCase();
    var found = CATEGORY[tool.category] || 'wheel';
    if (tool.icon && G[tool.icon]) { cache[tool.id] = tool.icon; return tool.icon; }
    for (var i = 0; i < RULES.length; i++) {
      if (RULES[i][0].test(haystack)) { found = RULES[i][1]; break; }
    }
    cache[tool.id] = found;
    return found;
  }

  global.Icons = {
    svg: svg,
    has: function (name) { return !!G[name]; },
    forTool: function (tool, opts) { return svg(nameFor(tool), opts); },
    forCategory: function (id, opts) { return svg(CATEGORY[id] || 'wheel', opts); },
    nameFor: nameFor
  };
})(window);
