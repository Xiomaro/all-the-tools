/* pdf-b tools: Organise PDF Pages, Images to PDF, Protect PDF with a Password,
   Sign PDF, Fill PDF Forms, Extract Images from PDF and Compare PDFs. Library
   loading, opening (including owner-restricted files) and page rendering come
   from window.PdfKit (end of pdf.js). */
(function () {
  'use strict';
  var U = window.UI, el = U.el;
  var K = window.PdfKit;

  if (!document.getElementById('g-pdf-b-style')) {
    document.head.appendChild(el('style', { id: 'g-pdf-b-style', text: [
      '.g-pdfb .scroll { overflow:auto; max-width:100%; }',
      '.g-pdfb .muted { color:var(--fg-muted); font-weight:400; }',
      '.g-pdfb .g-bar { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }',
      '.g-pdfb .g-bar .btn { padding:6px 10px; }',
      '.g-pdfb .g-sep { width:1px; align-self:stretch; background:var(--border); margin:0 4px; }',
      '.g-pdfb .g-count { font-size:13px; color:var(--fg-muted); margin-left:auto; }',
      /* organise: page grid */
      '.g-pdfb .g-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(136px, 1fr)); gap:12px; }',
      '.g-pdfb .g-card { position:relative; display:flex; flex-direction:column; gap:6px; padding:8px; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg-elev); user-select:none; }',
      '.g-pdfb .g-card:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }',
      '.g-pdfb .g-card.sel { border-color:var(--accent); background:var(--accent-weak); }',
      '.g-pdfb .g-card.drag { opacity:.35; }',
      '.g-pdfb .g-card.ins-before { box-shadow:-5px 0 0 -1px var(--accent); }',
      '.g-pdfb .g-card.ins-after { box-shadow:5px 0 0 -1px var(--accent); }',
      '.g-pdfb .g-tbox { aspect-ratio:1; display:grid; place-items:center; background:var(--bg-sunken); border-radius:var(--radius-s); overflow:hidden; cursor:grab; }',
      '.g-pdfb .g-tbox img, .g-pdfb .g-tbox .g-blank { max-width:92%; max-height:92%; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,.3); transition:transform .15s ease; -webkit-user-drag:none; }',
      '.g-pdfb .g-tbox .g-blank { display:block; }',
      '.g-pdfb .g-tbox .g-wait { font-size:12px; color:var(--fg-muted); }',
      '.g-pdfb .g-cap { display:flex; align-items:center; gap:6px; font-size:13px; min-width:0; }',
      '.g-pdfb .g-cap b { font-variant-numeric:tabular-nums; }',
      '.g-pdfb .g-cap .src { flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--fg-muted); font-size:12px; }',
      '.g-pdfb .g-handle { cursor:grab; touch-action:none; padding:0 4px; color:var(--fg-muted); font-size:16px; line-height:1; }',
      '.g-pdfb .g-cbtns { display:flex; justify-content:space-between; gap:2px; }',
      '.g-pdfb .g-cbtns .btn { padding:2px 7px; font-size:14px; }',
      '.g-pdfb .g-rot { position:absolute; top:12px; right:12px; font-size:11px; padding:1px 6px; border-radius:999px; background:var(--accent); color:var(--accent-fg); }',
      /* images to pdf */
      '.g-pdfb .g-ilist { display:flex; flex-direction:column; gap:6px; }',
      '.g-pdfb .g-irow { display:flex; align-items:center; gap:10px; padding:6px 8px; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg-elev); }',
      '.g-pdfb .g-irow.drag { opacity:.4; } .g-pdfb .g-irow.over { border-color:var(--accent); }',
      '.g-pdfb .g-irow img { width:56px; height:56px; object-fit:contain; background:var(--bg-sunken); border-radius:4px; flex:0 0 auto; }',
      '.g-pdfb .g-irow .name { flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }',
      '.g-pdfb .g-irow .meta { display:block; font-size:12px; color:var(--fg-muted); }',
      '.g-pdfb .g-irow .btn { padding:3px 9px; }',
      '.g-pdfb .g-preview-page { max-width:180px; max-height:220px; border:1px solid var(--border); background:#fff; }',
      /* sign */
      '.g-pdfb .g-pad { position:relative; height:190px; border:1px dashed var(--border); border-radius:var(--radius-s); background:#fff; touch-action:none; cursor:crosshair; }',
      '.g-pdfb .g-pad canvas { position:absolute; inset:0; width:100%; height:100%; }',
      '.g-pdfb .g-pad .ph { position:absolute; left:0; right:0; bottom:28px; text-align:center; font-size:13px; color:#8a8f9c; pointer-events:none; }',
      '.g-pdfb .g-pad .line { position:absolute; left:8%; right:8%; bottom:48px; border-bottom:1px solid #c9ccd6; pointer-events:none; }',
      '.g-pdfb .g-fonts { display:grid; grid-template-columns:repeat(auto-fill, minmax(170px, 1fr)); gap:8px; }',
      '.g-pdfb .g-fontbtn { font-size:26px; padding:6px 10px; border:1px solid var(--border); border-radius:var(--radius-s); background:#fff; color:#111; cursor:pointer; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }',
      '.g-pdfb .g-fontbtn.on { outline:2px solid var(--accent); }',
      '.g-pdfb .g-sigprev { display:grid; place-items:center; min-height:90px; padding:8px; border-radius:var(--radius-s); background:repeating-conic-gradient(#eee 0 25%, #fff 0 50%) 0 0/16px 16px; }',
      '.g-pdfb .g-sigprev img, .g-pdfb .g-sigprev canvas { max-width:100%; max-height:120px; }',
      '.g-pdfb .g-spages { display:flex; flex-direction:column; gap:22px; align-items:center; }',
      '.g-pdfb .g-spage { position:relative; width:100%; container-type:inline-size; background:#fff; box-shadow:0 1px 6px rgba(0,0,0,.25); user-select:none; }',
      '.g-pdfb .g-spage canvas { display:block; width:100%; height:100%; }',
      '.g-pdfb .g-spage .lbl { position:absolute; top:-18px; left:0; font-size:12px; color:var(--fg-muted); }',
      '.g-pdfb.g-armed .g-spage { cursor:crosshair; outline:2px dashed var(--accent); outline-offset:3px; }',
      '.g-pdfb .g-place { position:absolute; outline:1px dashed rgba(79,70,229,.8); cursor:move; touch-action:none; }',
      '.g-pdfb .g-place:focus { outline:2px solid #4f46e5; }',
      '.g-pdfb .g-place img { display:block; width:100%; height:100%; pointer-events:none; -webkit-user-drag:none; }',
      '.g-pdfb .g-place.txt { white-space:nowrap; line-height:1.2; font-family:Helvetica, Arial, sans-serif; }',
      '.g-pdfb .g-place .x { position:absolute; top:-11px; right:-11px; width:22px; height:22px; border-radius:50%; border:0; background:#b3261e; color:#fff; font-size:14px; line-height:22px; padding:0; cursor:pointer; }',
      '.g-pdfb .g-place .rs { position:absolute; right:-7px; bottom:-7px; width:14px; height:14px; border-radius:50%; background:#4f46e5; cursor:nwse-resize; touch-action:none; }',
      '.g-pdfb .g-armbar { position:sticky; top:8px; z-index:5; }',
      /* forms */
      '.g-pdfb .g-frow { display:grid; grid-template-columns:minmax(0, 1fr) minmax(0, 2fr); gap:6px 16px; align-items:start; padding:8px 0; border-bottom:1px solid var(--border); }',
      '.g-pdfb .g-frow:last-child { border-bottom:0; }',
      '.g-pdfb .g-fname { display:flex; flex-direction:column; gap:2px; min-width:0; }',
      '.g-pdfb .g-fname label { font-weight:600; word-break:break-all; }',
      '@media (max-width: 560px) { .g-pdfb .g-frow { grid-template-columns:minmax(0, 1fr); } }',
      /* extract images */
      '.g-pdfb .g-imgs { display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:12px; }',
      '.g-pdfb .g-imgcard { display:flex; flex-direction:column; gap:4px; padding:8px; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg-elev); min-width:0; }',
      '.g-pdfb .g-imgcard .name { font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }',
      '.g-pdfb .g-imgthumb { height:140px; display:grid; place-items:center; border-radius:var(--radius-s); background:repeating-conic-gradient(#e6e6e6 0 25%, #fff 0 50%) 0 0/14px 14px; overflow:hidden; }',
      '.g-pdfb .g-imgthumb img { max-width:100%; max-height:140px; }',
      /* compare */
      '.g-pdfb .g-cmpstage canvas { display:block; max-width:100%; height:auto; border:1px solid var(--border); background:#fff; }',
      '.g-pdfb .g-side { display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px; }',
      '.g-pdfb .g-side figure { margin:0; display:flex; flex-direction:column; gap:4px; min-width:0; }',
      '.g-pdfb .g-swipe { position:relative; display:inline-block; max-width:100%; }',
      '.g-pdfb .g-swipe canvas.top { position:absolute; left:0; top:0; width:100%; height:100%; }',
      '.g-pdfb .g-diffpage summary { cursor:pointer; font-weight:600; margin-bottom:6px; }'
    ].join('\n') }));
  }

  /* --- small helpers ------------------------------------------------------ */

  function setKids(node) {
    node.replaceChildren.apply(node, Array.prototype.slice.call(arguments, 1).filter(function (k) { return k !== null && k !== undefined && k !== false; }));
  }
  function norm360(a) { return ((Math.round(a) % 360) + 360) % 360; }
  function mm2pt(mm) { return mm * 72 / 25.4; }
  function ascii(b, off, n) { var s = ''; for (var i = off; i < off + n && i < b.length; i++) s += String.fromCharCode(b[i]); return s; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function ddmmyyyy(d) { return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear(); }
  function field(label, control, hint) { return U.field(label, control, hint); }
  function iconBtn(text, label, onClick) {
    return el('button', { class: 'btn ghost', type: 'button', text: text, title: label, 'aria-label': label, onclick: onClick });
  }
  function numVal(input, dflt) { var v = parseFloat(input.value); return isFinite(v) ? v : dflt; }

  /* The displayed (rotated, cropped) page as pdf.js shows it, mapped back to
     pdf-lib user space. Uses the crop box, like pdf.js does. */
  function visualMap(page) {
    var box = page.getCropBox ? page.getCropBox() : page.getMediaBox();
    var rot = norm360(page.getRotation().angle);
    var W = rot % 180 ? box.height : box.width, H = rot % 180 ? box.width : box.height;
    return {
      width: W, height: H, rotation: rot,
      map: function (vx, vy) {
        if (rot === 90) return { x: box.x + box.width - vy, y: box.y + vx };
        if (rot === 180) return { x: box.x + box.width - vx, y: box.y + box.height - vy };
        if (rot === 270) return { x: box.x + vy, y: box.y + box.height - vx };
        return { x: box.x + vx, y: box.y + vy };
      }
    };
  }

  /* A small thumbnail of one pdf.js page, as a JPEG data URL. */
  async function thumbOf(pdf, n, maxSide) {
    var page = await pdf.getPage(n);
    var vp1 = page.getViewport({ scale: 1 });
    var s = maxSide / Math.max(vp1.width, vp1.height);
    var vp = page.getViewport({ scale: s });
    var c = el('canvas');
    c.width = Math.max(1, Math.round(vp.width)); c.height = Math.max(1, Math.round(vp.height));
    var x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: x, viewport: vp }).promise;
    page.cleanup();
    return c.toDataURL('image/jpeg', 0.8);
  }

  /* Drag-to-reorder for a vertical list of rows (mouse), shared by the image
     list. Rows carry data-i; `move(from, to)` does the reordering. */
  function sortableRows(row, i, move) {
    row.draggable = true;
    row.addEventListener('dragstart', function (e) {
      row.classList.add('drag');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/x-g-row', String(i)); } catch (x) { /* ignore */ }
    });
    row.addEventListener('dragend', function () { row.classList.remove('drag'); });
    row.addEventListener('dragover', function (e) {
      if (Array.prototype.indexOf.call(e.dataTransfer.types || [], 'text/x-g-row') < 0) return;
      e.preventDefault(); row.classList.add('over');
    });
    row.addEventListener('dragleave', function () { row.classList.remove('over'); });
    row.addEventListener('drop', function (e) {
      var from = parseInt(e.dataTransfer.getData('text/x-g-row'), 10);
      row.classList.remove('over');
      if (!isFinite(from)) return;
      e.preventDefault(); e.stopPropagation();
      move(from, i);
    });
  }

  /* ========================================================================
     Organise PDF Pages
     ======================================================================== */

  Tools.register({
    id: 'pdf-organise', category: 'pdf', name: 'Organise PDF Pages',
    description: 'Reorder, rotate, delete, duplicate and insert pages, add pages from another PDF, and save a new copy.',
    keywords: ['organize pdf', 'reorder pages', 'rearrange pages', 'sort pages', 'move pages', 'delete pages', 'remove pages',
      'duplicate page', 'insert blank page', 'add page', 'rotate page', 'page manager', 'append pdf', 'extract pages', 'drag and drop'],
    render: function (root) {
      root.classList.add('g-pdfb');
      var sources = [];      /* { name, doc (pdf-lib), pdf (pdf.js), sizes: [{w,h}], thumbs: [] } */
      var pages = [];        /* { key, src, index, blank: {w,h}|null, rot, sel } */
      var history = [];
      var focusKey = null, anchorKey = null, nextKey = 1, alive = true;
      /* Native image drag would steal the pointer from our own dragging. */
      var grid = el('div', { class: 'g-grid', role: 'list', 'aria-label': 'Pages', ondragstart: function (e) { e.preventDefault(); } });
      var count = el('span', { class: 'g-count', dataset: { k: 'count' } });
      var result = K.resultArea();
      var baseName = 'document';
      var thumbQueue = [], thumbBusy = false;

      U.onTeardown(root, function () {
        alive = false;
        sources.forEach(function (s) { K.closePdf(s.pdf); });
      });

      /* --- state changes, all undoable ---------------------------------- */
      function snapshot() {
        history.push(pages.map(function (p) { return Object.assign({}, p); }));
        if (history.length > 60) history.shift();
      }
      function undo() {
        if (!history.length) return U.toast('Nothing to undo', 'err');
        pages = history.pop();
        draw();
      }
      function targets() {
        var sel = pages.filter(function (p) { return p.sel; });
        if (sel.length) return sel;
        var f = byKey(focusKey);
        return f ? [f] : [];
      }
      function byKey(k) { for (var i = 0; i < pages.length; i++) if (pages[i].key === k) return pages[i]; return null; }
      function indexOfKey(k) { for (var i = 0; i < pages.length; i++) if (pages[i].key === k) return i; return -1; }
      function need(list) { if (!list.length) U.toast('Select one or more pages first', 'err'); return list.length > 0; }

      function rotate(list, by) {
        if (!need(list)) return;
        snapshot();
        list.forEach(function (p) { p.rot = norm360(p.rot + by); });
        draw();
      }
      function remove(list) {
        if (!need(list)) return;
        snapshot();
        var idx = indexOfKey(list[list.length - 1].key);
        pages = pages.filter(function (p) { return list.indexOf(p) < 0; });
        var next = pages[Math.min(idx - list.length + 1, pages.length - 1)];
        focusKey = next ? next.key : null;
        draw();
      }
      function duplicate(list) {
        if (!need(list)) return;
        snapshot();
        var out = [];
        pages.forEach(function (p) {
          out.push(p);
          if (list.indexOf(p) > -1) out.push(Object.assign({}, p, { key: nextKey++, sel: false }));
        });
        pages = out;
        draw();
      }
      /* Visual size of a page as it will come out (its own rotation included). */
      function visualSize(p) {
        var s = p.blank || sources[p.src].sizes[p.index];
        return p.rot % 180 ? { w: s.h, h: s.w } : { w: s.w, h: s.h };
      }
      function insertBlank() {
        var list = targets();
        var at = list.length ? indexOfKey(list[list.length - 1].key) + 1 : pages.length;
        var neighbour = pages[at - 1] || pages[at];
        var size = neighbour ? visualSize(neighbour) : Region.get().paper === 'letter' ? { w: 612, h: 792 } : { w: 595.28, h: 841.89 };
        snapshot();
        var blank = { key: nextKey++, src: -1, index: -1, blank: { w: size.w, h: size.h }, rot: 0, sel: false };
        pages.splice(at, 0, blank);
        focusKey = blank.key;
        draw();
      }
      /* Move the listed pages as a block by one place (dir -1/+1), or by `steps`. */
      function shift(list, dir, steps) {
        if (!need(list)) return;
        snapshot();
        for (var s = 0; s < (steps || 1); s++) {
          if (dir < 0) {
            for (var i = 1; i < pages.length; i++) {
              if (list.indexOf(pages[i]) > -1 && list.indexOf(pages[i - 1]) < 0) { var t = pages[i - 1]; pages[i - 1] = pages[i]; pages[i] = t; }
            }
          } else {
            for (var j = pages.length - 2; j >= 0; j--) {
              if (list.indexOf(pages[j]) > -1 && list.indexOf(pages[j + 1]) < 0) { var u = pages[j + 1]; pages[j + 1] = pages[j]; pages[j] = u; }
            }
          }
        }
        draw();
      }
      /* Drop the listed pages so they start at position `to` (in the list without them). */
      function moveTo(list, to) {
        snapshot();
        var before = pages.slice(0, to).filter(function (p) { return list.indexOf(p) < 0; }).length;
        var rest = pages.filter(function (p) { return list.indexOf(p) < 0; });
        var moving = pages.filter(function (p) { return list.indexOf(p) > -1; });
        pages = rest.slice(0, before).concat(moving, rest.slice(before));
        draw();
      }
      function selectAll(on) { pages.forEach(function (p) { p.sel = on; }); draw(); }

      /* --- thumbnails, rendered in the background ------------------------- */
      function queueThumbs(srcIndex) {
        var s = sources[srcIndex];
        for (var i = 0; i < s.sizes.length; i++) thumbQueue.push([srcIndex, i]);
        pumpThumbs();
      }
      async function pumpThumbs() {
        if (thumbBusy) return;
        thumbBusy = true;
        while (thumbQueue.length && alive) {
          var job = thumbQueue.shift(), s = sources[job[0]];
          if (!s || s.thumbs[job[1]]) continue;
          try { s.thumbs[job[1]] = await thumbOf(s.pdf, job[1] + 1, 190); } catch (e) { s.thumbs[job[1]] = 'error'; }
          if (!alive) break;
          Array.prototype.forEach.call(grid.querySelectorAll('[data-t="' + job[0] + '-' + job[1] + '"]'), fillThumb);
        }
        thumbBusy = false;
      }
      function fillThumb(box) {
        var parts = box.dataset.t.split('-'), url = sources[+parts[0]].thumbs[+parts[1]];
        if (!url) return;
        var img = box.querySelector('img');
        if (url === 'error') { box.replaceChildren(el('span', { class: 'g-wait', text: 'No preview' })); return; }
        if (!img) { img = el('img', { alt: '', draggable: false }); box.replaceChildren(img); }
        img.src = url;
        img.style.transform = 'rotate(' + box.dataset.rot + 'deg)';
      }

      /* --- drawing -------------------------------------------------------- */
      function label(p) {
        if (p.blank) return 'blank page';
        var s = sources[p.src];
        return (sources.length > 1 ? s.name + ' ' : '') + 'p. ' + (p.index + 1);
      }
      function draw() {
        var nsel = pages.filter(function (p) { return p.sel; }).length;
        count.textContent = K.plural(pages.length, 'page') + (nsel ? ' · ' + nsel + ' selected' : '');
        result.replaceChildren();
        var hadFocus = grid.contains(document.activeElement);
        var cards = pages.map(function (p, i) { return card(p, i); });
        grid.replaceChildren.apply(grid, cards);
        if (!pages.length) grid.appendChild(U.note('No pages left. Undo, or add pages from another PDF.'));
        if (hadFocus) refocusAny();
      }
      function card(p, i) {
        var box = el('div', { class: 'g-tbox' });
        if (p.blank) {
          var k = 100 / Math.max(p.blank.w, p.blank.h);
          box.appendChild(el('span', { class: 'g-blank', style: { width: (p.blank.w * k * 0.92) + '%', aspectRatio: p.blank.w + ' / ' + p.blank.h, transform: 'rotate(' + p.rot + 'deg)' } }));
        } else {
          box.dataset.t = p.src + '-' + p.index;
          box.dataset.rot = String(p.rot);
          if (sources[p.src].thumbs[p.index]) fillThumb(box);
          else box.appendChild(el('span', { class: 'g-wait', text: 'Page ' + (p.index + 1) + '…' }));
        }
        var check = el('input', { type: 'checkbox', checked: !!p.sel, 'aria-label': 'Select page ' + (i + 1),
          onclick: function (e) { e.stopPropagation(); }, onchange: function () { p.sel = check.checked; anchorKey = p.key; draw(); } });
        var desc = 'Page ' + (i + 1) + ', ' + label(p) + (p.rot ? ', turned ' + p.rot + '°' : '') + (p.sel ? ', selected' : '');
        var node = el('div', { class: 'g-card' + (p.sel ? ' sel' : ''), tabIndex: 0, role: 'listitem', 'aria-label': desc, dataset: { key: String(p.key), i: String(i) } },
          box,
          el('div', { class: 'g-cap' },
            el('span', { class: 'g-handle', text: '⠿', title: 'Drag to move', 'aria-hidden': 'true' }),
            check, el('b', { text: String(i + 1) }), el('span', { class: 'src', text: label(p), title: label(p) })),
          el('div', { class: 'g-cbtns' },
            iconBtn('↺', 'Turn page ' + (i + 1) + ' left', function (e) { e.stopPropagation(); rotate([p], -90); }),
            iconBtn('↻', 'Turn page ' + (i + 1) + ' right', function (e) { e.stopPropagation(); rotate([p], 90); }),
            iconBtn('⧉', 'Duplicate page ' + (i + 1), function (e) { e.stopPropagation(); duplicate([p]); }),
            iconBtn('✕', 'Delete page ' + (i + 1), function (e) { e.stopPropagation(); remove([p]); })),
          p.rot ? el('span', { class: 'g-rot', text: p.rot + '°' }) : null);
        node.addEventListener('focus', function () { focusKey = p.key; });
        node.addEventListener('click', function (e) {
          if (node.dataset.dragged) { delete node.dataset.dragged; return; }
          if (e.target.closest('button, input')) return;
          if (e.shiftKey && anchorKey !== null) {
            var a = indexOfKey(anchorKey), b = indexOfKey(p.key);
            for (var j = Math.min(a, b); j <= Math.max(a, b); j++) pages[j].sel = true;
          } else {
            p.sel = !p.sel;
            anchorKey = p.key;
          }
          focusKey = p.key;
          draw();
          var again = grid.querySelector('[data-key="' + p.key + '"]');
          if (again) again.focus();
        });
        node.addEventListener('pointerdown', function (e) { startDrag(e, node, p); });
        node.addEventListener('keydown', function (e) { onKey(e, p); });
        return node;
      }

      /* Columns in the grid right now, for Up/Down. */
      function columns() {
        var cards = grid.querySelectorAll('.g-card');
        if (cards.length < 2) return 1;
        var top = cards[0].offsetTop, n = 0;
        for (var i = 0; i < cards.length && cards[i].offsetTop === top; i++) n++;
        return Math.max(1, n);
      }
      function focusAt(i) {
        i = Math.max(0, Math.min(pages.length - 1, i));
        var c = grid.querySelector('[data-i="' + i + '"]');
        if (c) { focusKey = pages[i].key; c.focus(); }
      }
      function onKey(e, p) {
        var i = indexOfKey(p.key), mod = e.ctrlKey || e.metaKey, cols = columns();
        var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key];
        if (step !== undefined) {
          e.preventDefault();
          if (mod) {
            var list = p.sel ? pages.filter(function (q) { return q.sel; }) : [p];
            focusKey = p.key;
            shift(list, step < 0 ? -1 : 1, Math.abs(step));
            var again = grid.querySelector('[data-key="' + p.key + '"]');
            if (again) again.focus();
          } else focusAt(i + step);
          return;
        }
        if (e.key === 'Home') { e.preventDefault(); return focusAt(0); }
        if (e.key === 'End') { e.preventDefault(); return focusAt(pages.length - 1); }
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); p.sel = !p.sel; anchorKey = p.key; draw(); return refocus(p); }
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(p.sel ? targets() : [p]); return refocusAny(); }
        if (mod && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); undo(); return refocusAny(); }
        if (mod && (e.key === 'a' || e.key === 'A')) { e.preventDefault(); selectAll(true); return refocus(p); }
        if (mod) return;
        if (e.key === 'r') { e.preventDefault(); rotate(p.sel ? targets() : [p], 90); return refocus(p); }
        if (e.key === 'R') { e.preventDefault(); rotate(p.sel ? targets() : [p], -90); return refocus(p); }
        if (e.key === 'd' || e.key === 'D') { e.preventDefault(); duplicate(p.sel ? targets() : [p]); return refocus(p); }
        if (e.key === 'b' || e.key === 'B') { e.preventDefault(); insertBlank(); return refocusAny(); }
      }
      function refocus(p) { var c = grid.querySelector('[data-key="' + p.key + '"]'); if (c) c.focus(); }
      function refocusAny() { var c = focusKey !== null && grid.querySelector('[data-key="' + focusKey + '"]'); if (c) c.focus(); else if (grid.querySelector('.g-card')) grid.querySelector('.g-card').focus(); }

      /* Pointer dragging: the whole card with a mouse, the ⠿ handle on touch
         (so a finger on a card still scrolls the page). */
      function startDrag(e, node, p) {
        if (e.button !== 0 || e.target.closest('button, input')) return;
        if (e.pointerType !== 'mouse' && !e.target.closest('.g-handle')) return;
        var sx = e.clientX, sy = e.clientY, dragging = false, target = -1, marked = null;
        var list = p.sel ? pages.filter(function (q) { return q.sel; }) : [p];
        var pid = e.pointerId;
        try { node.setPointerCapture(pid); } catch (x) { /* ignore */ }
        if (e.pointerType !== 'mouse') e.preventDefault();
        function mark(c, cls) {
          if (marked) marked.classList.remove('ins-before', 'ins-after');
          marked = c; if (c) c.classList.add(cls);
        }
        function move(ev) {
          if (ev.pointerId !== pid) return;
          if (!dragging) {
            if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
            dragging = true;
            list.forEach(function (q) { var c = grid.querySelector('[data-key="' + q.key + '"]'); if (c) c.classList.add('drag'); });
          }
          var cards = grid.querySelectorAll('.g-card'), best = null, bd = Infinity;
          for (var i = 0; i < cards.length; i++) {
            var r = cards[i].getBoundingClientRect();
            var d = Math.hypot(ev.clientX - (r.left + r.width / 2), ev.clientY - (r.top + r.height / 2));
            if (d < bd) { bd = d; best = { c: cards[i], r: r, i: i }; }
          }
          if (best) {
            var after = ev.clientX > best.r.left + best.r.width / 2;
            target = best.i + (after ? 1 : 0);
            mark(best.c, after ? 'ins-after' : 'ins-before');
          }
          if (ev.clientY < 50) window.scrollBy(0, -14);
          else if (ev.clientY > window.innerHeight - 50) window.scrollBy(0, 14);
        }
        function end(ev) {
          if (ev.pointerId !== pid) return;
          node.removeEventListener('pointermove', move);
          node.removeEventListener('pointerup', end);
          node.removeEventListener('pointercancel', end);
          mark(null);
          if (!dragging) return;
          node.dataset.dragged = '1';
          setTimeout(function () { delete node.dataset.dragged; }, 50);
          if (ev.type === 'pointercancel' || target < 0) return draw();
          focusKey = p.key;
          moveTo(list, target);
        }
        node.addEventListener('pointermove', move);
        node.addEventListener('pointerup', end);
        node.addEventListener('pointercancel', end);
      }

      /* --- loading -------------------------------------------------------- */
      async function addSource(file, bytes) {
        var doc = await K.openPdfLib(bytes);
        var pdf = await K.openPdfjs(bytes);
        var sizes = doc.getPages().map(function (pg) {
          var b = pg.getCropBox ? pg.getCropBox() : pg.getMediaBox();
          var r = norm360(pg.getRotation().angle);
          return r % 180 ? { w: b.height, h: b.width } : { w: b.width, h: b.height };
        });
        var s = { name: K.baseName(file.name), doc: doc, pdf: pdf, sizes: sizes, thumbs: [] };
        sources.push(s);
        var srcIndex = sources.length - 1;
        sizes.forEach(function (sz, i) { pages.push({ key: nextKey++, src: srcIndex, index: i, blank: null, rot: 0, sel: false }); });
        queueThumbs(srcIndex);
        return doc.getPageCount();
      }

      async function save() {
        if (!pages.length) throw new Error('There are no pages to save.');
        var L = await K.libPdf();
        var out = await L.PDFDocument.create();
        var first = sources[0] && sources[0].doc;
        try {
          if (first && first.getTitle()) out.setTitle(first.getTitle());
          if (first && first.getAuthor()) out.setAuthor(first.getAuthor());
          if (first && first.getSubject()) out.setSubject(first.getSubject());
        } catch (e) { /* unreadable metadata is not worth failing over */ }
        /* One copyPages call per source keeps shared fonts and images shared. */
        var wanted = {}, copied = {};
        pages.forEach(function (p) { if (!p.blank) (wanted[p.src] = wanted[p.src] || []).push(p.index); });
        for (var s in wanted) {
          result.busy('Copying pages from ' + sources[s].name + '…');
          copied[s] = { list: await out.copyPages(sources[s].doc, wanted[s]), next: 0 };
        }
        pages.forEach(function (p) {
          if (p.blank) {
            var bp = out.addPage([p.blank.w, p.blank.h]);
            if (p.rot) bp.setRotation(L.degrees(p.rot));
            return;
          }
          var c = copied[p.src], pg = c.list[c.next++];
          out.addPage(pg);
          pg.setRotation(L.degrees(norm360(pg.getRotation().angle + p.rot)));
        });
        return out.save();
      }

      var saveBtn = U.button('Save PDF', null, 'primary');
      saveBtn.addEventListener('click', K.runBusy(saveBtn, async function () {
        try {
          var bytes = await save();
          result.done('Saved ' + K.plural(pages.length, 'page') + ' · ' + K.kb(bytes.length), bytes, baseName + '-organised.pdf', 'Download PDF');
        } catch (err) { result.fail(err); }
      }));

      var addStatus = U.note('');
      var addZone = U.dropzone({
        accept: 'application/pdf,.pdf', multiple: true,
        label: 'Add pages from another PDF', hint: 'They go on the end. Drag them wherever you want.',
        onFiles: async function (files) {
          for (var i = 0; i < files.length; i++) {
            if (!K.isPdf(files[i])) { addStatus.className = 'note err'; addStatus.textContent = files[i].name + ' is not a PDF.'; continue; }
            try {
              addStatus.className = 'note'; addStatus.textContent = 'Reading ' + files[i].name + '…';
              snapshot();
              var n = await addSource(files[i], new Uint8Array(await U.readAs(files[i])));
              addStatus.textContent = 'Added ' + K.plural(n, 'page') + ' from ' + files[i].name + '.';
            } catch (err) { history.pop(); addStatus.className = 'note err'; addStatus.textContent = err.message || String(err); }
          }
          draw();
        }
      });

      var bar = el('div', { class: 'g-bar', role: 'toolbar', 'aria-label': 'Page actions' },
        U.button('↺ Turn left', function () { rotate(targets(), -90); }),
        U.button('↻ Turn right', function () { rotate(targets(), 90); }),
        U.button('Duplicate', function () { duplicate(targets()); }),
        U.button('Delete', function () { remove(targets()); }),
        U.button('Insert blank page', insertBlank),
        el('span', { class: 'g-sep' }),
        U.button('◀ Move earlier', function () { shift(targets(), -1); }),
        U.button('Move later ▶', function () { shift(targets(), 1); }),
        el('span', { class: 'g-sep' }),
        U.button('Select all', function () { selectAll(true); }, 'ghost'),
        U.button('Select none', function () { selectAll(false); }, 'ghost'),
        U.button('Undo', undo, 'ghost'),
        count);

      K.singlePdf(root, {
        label: 'Drop a PDF here or click to choose',
        onLoad: async function (ctx) {
          sources.forEach(function (s) { K.closePdf(s.pdf); });
          sources = []; pages = []; history = []; thumbQueue = []; focusKey = anchorKey = null;
          baseName = K.baseName(ctx.file.name);
          var n = await addSource(ctx.file, ctx.bytes);
          ctx.info.append(ctx.file.name, el('span', { class: 'muted', text: K.plural(n, 'page') }));
          ctx.body.append(
            U.panel(null, bar,
              el('details', {}, el('summary', { class: 'note', text: 'Mouse, touch and keyboard controls' }),
                U.note('Drag a page to move it (on a touch screen, drag the ⠿ handle). Click pages to select several; Shift+click selects a range. ' +
                  'Keyboard: arrow keys move between pages, Space selects, Ctrl+arrow moves the page, R / Shift+R turns it, D duplicates, B inserts a blank page after it, Delete removes, Ctrl+Z undoes.'))),
            U.panel(null, grid),
            U.panel(null, addZone, addStatus),
            U.panel(null, U.btnrow(saveBtn), result));
          draw();
        }
      });
    }
  });

  /* ========================================================================
     Images to PDF
     ======================================================================== */

  var PAPER = {
    A4: [595.28, 841.89], A5: [419.53, 595.28], Letter: [612, 792], Legal: [612, 1008]
  };

  function sniffImage(b) {
    if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'jpeg';
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'png';
    if (ascii(b, 0, 3) === 'GIF') return 'gif';
    if (b[0] === 0x42 && b[1] === 0x4D) return 'bmp';
    if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'webp';
    if (ascii(b, 4, 4) === 'ftyp') {
      var size = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0, brands = [ascii(b, 8, 4)];
      for (var o = 16; o + 4 <= Math.min(size, 64); o += 4) brands.push(ascii(b, o, 4));
      if (brands.some(function (x) { return x === 'avif' || x === 'avis'; })) return 'avif';
      if (brands.some(function (x) { return /^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(x); })) return 'heic';
    }
    return null;
  }

  /* Size, EXIF orientation and JFIF density of a JPEG, read from its markers. */
  function jpegInfo(b) {
    var info = { w: 0, h: 0, orient: 1, dpi: 0 }, i = 2;
    while (i + 4 <= b.length) {
      if (b[i] !== 0xFF) { i++; continue; }
      var m = b[i + 1];
      if (m === 0xFF) { i++; continue; }
      if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
      if (m === 0xD9 || m === 0xDA) break;
      var len = (b[i + 2] << 8) | b[i + 3], seg = i + 4;
      if (m === 0xE0 && ascii(b, seg, 5) === 'JFIF\0') {
        var units = b[seg + 7], xd = (b[seg + 8] << 8) | b[seg + 9];
        if (units === 1) info.dpi = xd; else if (units === 2) info.dpi = xd * 2.54;
      } else if (m === 0xE1 && ascii(b, seg, 6) === 'Exif\0\0') {
        try { info.orient = exifOrientation(b, seg + 6, seg + len - 2); } catch (e) { info.orient = 1; }
      } else if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC && !info.w) {
        info.h = (b[seg + 1] << 8) | b[seg + 2];
        info.w = (b[seg + 3] << 8) | b[seg + 4];
      }
      i += 2 + len;
    }
    if (!(info.dpi >= 30 && info.dpi <= 2400)) info.dpi = 0;
    return info;
  }
  function exifOrientation(b, t, end) {
    var le = b[t] === 0x49;
    var u16 = function (o) { if (t + o + 2 > end) throw new Error('short'); return le ? b[t + o] | (b[t + o + 1] << 8) : (b[t + o] << 8) | b[t + o + 1]; };
    var u32 = function (o) { if (t + o + 4 > end) throw new Error('short'); return le ? (b[t + o] | (b[t + o + 1] << 8) | (b[t + o + 2] << 16) | (b[t + o + 3] << 24)) >>> 0 : ((b[t + o] << 24) | (b[t + o + 1] << 16) | (b[t + o + 2] << 8) | b[t + o + 3]) >>> 0; };
    if (u16(2) !== 42) return 1;
    var ifd = u32(4), n = u16(ifd);
    for (var k = 0; k < n; k++) {
      var e = ifd + 2 + k * 12;
      if (u16(e) === 0x0112) { var v = u16(e + 8); return v >= 1 && v <= 8 ? v : 1; }
    }
    return 1;
  }
  function pngInfo(b) {
    var info = { w: ((b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19]) >>> 0, h: ((b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23]) >>> 0, dpi: 0 };
    for (var i = 8; i + 12 <= b.length;) {
      var len = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0, type = ascii(b, i + 4, 4);
      if (type === 'pHYs' && b[i + 16] === 1) info.dpi = (((b[i + 8] << 24) | (b[i + 9] << 16) | (b[i + 10] << 8) | b[i + 11]) >>> 0) * 0.0254;
      if (type === 'IDAT' || type === 'IEND') break;
      i += 12 + len;
    }
    if (!(info.dpi >= 30 && info.dpi <= 2400)) info.dpi = 0;
    return info;
  }

  /* cm matrix placing a stored image (unit square) into the display rectangle
     (x, y, w, h) with the given EXIF orientation. */
  function orientMatrix(o, x, y, w, h) {
    switch (o) {
      case 2: return [-w, 0, 0, h, x + w, y];
      case 3: return [-w, 0, 0, -h, x + w, y + h];
      case 4: return [w, 0, 0, -h, x, y + h];
      case 5: return [0, -h, -w, 0, x + w, y + h];
      case 6: return [0, -h, w, 0, x, y + h];
      case 7: return [0, h, w, 0, x, y];
      case 8: return [0, h, -w, 0, x + w, y];
      default: return [w, 0, 0, h, x, y];
    }
  }

  function canvasHasAlpha(c) {
    var d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
    for (var i = 3; i < d.length; i += 4) if (d[i] < 255) return true;
    return false;
  }

  async function bitmapOf(blob) {
    try { return await createImageBitmap(blob, { imageOrientation: 'from-image' }); }
    catch (e) { return await U.loadImage(blob); }
  }

  function thumbFromSource(src) {
    var w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
    var k = Math.min(1, 112 / Math.max(w, h));
    var c = el('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }

  /* Read one picture into what the PDF needs: JPEG bytes as they are, PNG as
     it is, everything else re-encoded once (PNG if it has transparency or is
     lossless, otherwise a high-quality JPEG). */
  async function prepareImage(file) {
    var bytes = new Uint8Array(await U.readAs(file));
    var kind = sniffImage(bytes);
    if (kind === 'heic') {
      await U.script('assets/vendor/heic2any/heic2any.min.js');
      var out;
      try { out = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 }); }
      catch (e) { throw new Error('Could not convert ' + file.name + ' from HEIC' + (e && e.message ? ': ' + e.message : '.')); }
      if (Array.isArray(out)) out = out[0];
      bytes = new Uint8Array(await out.arrayBuffer());
      kind = 'jpeg';
      file = out;
    }
    if (kind === 'jpeg') {
      var ji = jpegInfo(bytes);
      if (!ji.w || !ji.h) throw new Error('This JPEG has no readable size.');
      var bmp = await bitmapOf(new Blob([bytes], { type: 'image/jpeg' }));
      var turned = ji.orient >= 5;
      return { type: 'jpg', bytes: bytes, orient: ji.orient, w: turned ? ji.h : ji.w, h: turned ? ji.w : ji.h, dpi: ji.dpi,
        format: 'JPEG (kept as is)', thumb: thumbFromSource(bmp) };
    }
    if (kind === 'png') {
      var pi = pngInfo(bytes);
      var pb = await bitmapOf(new Blob([bytes], { type: 'image/png' }));
      return { type: 'png', bytes: bytes, orient: 1, w: pi.w, h: pi.h, dpi: pi.dpi, format: 'PNG (lossless)', thumb: thumbFromSource(pb) };
    }
    /* GIF (first frame), BMP, WebP, AVIF… whatever this browser can decode. */
    var src;
    try { src = await bitmapOf(new Blob([bytes], { type: file.type || 'application/octet-stream' })); }
    catch (e) { throw new Error(file.name + ' is not an image this browser can read.'); }
    var c = el('canvas');
    c.width = src.width || src.naturalWidth; c.height = src.height || src.naturalHeight;
    c.getContext('2d').drawImage(src, 0, 0);
    var lossless = kind === 'gif' || kind === 'bmp' || (kind === 'webp' && ascii(bytes, 12, 4) !== 'VP8 ' && ascii(bytes, 0, 200).indexOf('VP8L') > -1);
    var asPng = lossless || canvasHasAlpha(c);
    var enc = await K.canvasBytes(c, asPng ? 'image/png' : 'image/jpeg', 0.92);
    var names = { gif: 'GIF', bmp: 'BMP', webp: 'WebP', avif: 'AVIF' };
    return { type: asPng ? 'png' : 'jpg', bytes: enc, orient: 1, w: c.width, h: c.height, dpi: 0,
      format: (names[kind] || 'Image') + (kind === 'gif' ? ' (first frame)' : '') + ' → ' + (asPng ? 'PNG' : 'JPEG'), thumb: thumbFromSource(c) };
  }

  /* Lay out and draw one image per page. */
  async function buildImagesPdf(items, opt, onProgress) {
    var L = await K.libPdf();
    var doc = await L.PDFDocument.create();
    var m = mm2pt(Math.max(0, opt.margin));
    for (var i = 0; i < items.length; i++) {
      if (onProgress) onProgress(i);
      var it = items[i].img;
      var img = it.type === 'jpg' ? await doc.embedJpg(it.bytes) : await doc.embedPng(it.bytes);
      var pw, ph;
      if (opt.size === 'fit') {
        var k = 72 / (it.dpi || 96);
        pw = it.w * k + 2 * m; ph = it.h * k + 2 * m;
      } else {
        var base = PAPER[opt.size];
        var land = opt.orientation === 'landscape' || (opt.orientation === 'auto' && it.w > it.h);
        pw = land ? base[1] : base[0]; ph = land ? base[0] : base[1];
      }
      var bw = pw - 2 * m, bh = ph - 2 * m;
      if (bw <= 1 || bh <= 1) throw new Error('The margin is too big for the page.');
      var tw = bw, th = bh;
      if (opt.size !== 'fit' && opt.fit !== 'stretch') {
        var s = opt.fit === 'cover' ? Math.max(bw / it.w, bh / it.h) : Math.min(bw / it.w, bh / it.h);
        tw = it.w * s; th = it.h * s;
      }
      var tx = m + (bw - tw) / 2, ty = m + (bh - th) / 2;
      var page = doc.addPage([pw, ph]);
      var name = page.node.newXObject('Im', img.ref);
      var ops = [L.pushGraphicsState()];
      if (opt.size !== 'fit' && opt.fit === 'cover') ops.push(L.rectangle(m, m, bw, bh), L.clip(), L.endPath());
      var mx = orientMatrix(it.orient, tx, ty, tw, th);
      ops.push(L.concatTransformationMatrix(mx[0], mx[1], mx[2], mx[3], mx[4], mx[5]), L.drawObject(name), L.popGraphicsState());
      page.pushOperators.apply(page, ops);
    }
    if (opt.title) doc.setTitle(opt.title);
    return doc.save();
  }

  Tools.register({
    id: 'images-to-pdf', category: 'pdf', name: 'Images to PDF',
    description: 'Put photos and pictures (JPG, PNG, WebP, GIF, BMP, HEIC) into one PDF, in the order you choose.',
    keywords: ['jpg to pdf', 'jpeg to pdf', 'png to pdf', 'image to pdf', 'photo to pdf', 'picture to pdf', 'webp to pdf', 'heic to pdf',
      'gif to pdf', 'bmp to pdf', 'convert images', 'combine images', 'a4', 'letter', 'scan to pdf'],
    render: function (root) {
      root.classList.add('g-pdfb', 'g-pdf');
      var items = [];            /* { file, img } */
      var list = el('div', { class: 'g-ilist' });
      var status = U.note('');
      var result = K.resultArea();
      var size = U.select({ options: [
        { value: 'fit', label: 'Same as each image' }, { value: 'A4', label: 'A4 (210 × 297 mm)' }, { value: 'A5', label: 'A5 (148 × 210 mm)' },
        { value: 'Letter', label: 'US Letter (8.5 × 11 in)' }, { value: 'Legal', label: 'US Legal (8.5 × 14 in)' }], value: Region.get().paper === 'letter' ? 'Letter' : 'A4' });
      var orientation = U.chips([{ value: 'auto', label: 'Auto' }, { value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }], function () { result.replaceChildren(); }, 'auto');
      var fit = U.chips([{ value: 'contain', label: 'Fit whole image' }, { value: 'cover', label: 'Fill page (crop)' }, { value: 'stretch', label: 'Stretch' }], function () { result.replaceChildren(); }, 'contain');
      var margin = U.input({ type: 'number', value: '10', min: '0', max: '100', step: '1', 'aria-label': 'Margin in millimetres' });
      var orientField = field('Orientation', orientation), fitField = field('Image on the page', fit);
      var go = U.button('Create PDF', null, 'primary');
      var listPanel = U.panel(null, el('h3', { text: 'Pages' }), list,
        U.btnrow(U.button('Sort by name', function () { items.sort(function (a, b) { return a.file.name.localeCompare(b.file.name, undefined, { numeric: true }); }); draw(); }, 'ghost'),
          U.button('Reverse', function () { items.reverse(); draw(); }, 'ghost'),
          U.button('Clear all', function () { items = []; draw(); }, 'ghost')));
      var optPanel = U.panel('Page setup',
        U.row(field('Page size', size), field('Margin (mm)', margin, 'Space around each image')),
        orientField, fitField, U.btnrow(go), result);

      function sync() {
        var fitMode = size.value === 'fit';
        orientField.style.display = fitMode ? 'none' : '';
        fitField.style.display = fitMode ? 'none' : '';
        listPanel.style.display = optPanel.style.display = items.length ? '' : 'none';
        go.textContent = 'Create PDF (' + K.plural(items.length, 'page') + ')';
      }
      [size, margin].forEach(function (c) { c.addEventListener('change', function () { result.replaceChildren(); sync(); }); });

      function move(from, to) {
        if (to < 0 || to >= items.length || from === to) return;
        items.splice(to, 0, items.splice(from, 1)[0]);
        draw();
      }
      function draw() {
        result.replaceChildren();
        list.replaceChildren.apply(list, items.map(function (it, i) {
          var row = el('div', { class: 'g-irow' },
            el('img', { src: it.img.thumb, alt: '' }),
            el('span', { class: 'name', title: it.file.name }, (i + 1) + '. ' + it.file.name,
              el('span', { class: 'meta', text: it.img.w + ' × ' + it.img.h + ' px · ' + it.img.format + (it.img.orient > 1 ? ' · turned upright' : '') })),
            iconBtn('↑', 'Move ' + it.file.name + ' up', function () { move(i, i - 1); }),
            iconBtn('↓', 'Move ' + it.file.name + ' down', function () { move(i, i + 1); }),
            iconBtn('✕', 'Remove ' + it.file.name, function () { items.splice(i, 1); draw(); }));
          sortableRows(row, i, move);
          return row;
        }));
        sync();
      }

      async function add(files) {
        var bad = [];
        for (var i = 0; i < files.length; i++) {
          status.className = 'note';
          status.textContent = 'Reading ' + files[i].name + ' (' + (i + 1) + ' of ' + files.length + ')…';
          try { items.push({ file: files[i], img: await prepareImage(files[i]) }); }
          catch (err) { bad.push(err.message || String(err)); }
          draw();
        }
        status.className = bad.length ? 'note err' : 'note';
        status.textContent = bad.join(' ');
      }

      go.addEventListener('click', K.runBusy(go, async function () {
        if (!items.length) return U.toast('Add some images first', 'err');
        try {
          var bytes = await buildImagesPdf(items, {
            size: size.value, orientation: orientation.value, fit: fit.value, margin: numVal(margin, 10),
            title: items.length === 1 ? items[0].file.name.replace(/\.[^.]+$/, '') : 'Images'
          }, function (i) { result.busy('Adding image ' + (i + 1) + ' of ' + items.length + '…', i / items.length); });
          var name = (items.length === 1 ? items[0].file.name.replace(/\.[^.]+$/, '') : 'images') + '.pdf';
          result.done('Created a PDF with ' + K.plural(items.length, 'page') + ' · ' + K.kb(bytes.length), bytes, name, 'Download PDF');
        } catch (err) { result.fail(err); }
      }));

      root.appendChild(U.panel(null,
        U.dropzone({ accept: 'image/*,.heic,.heif,.webp,.bmp', multiple: true, label: 'Drop images here or click to choose',
          hint: 'JPG, PNG, WebP, GIF, BMP or HEIC. Pick several at once; they stay on this device.', onFiles: add }),
        status,
        U.note('JPEG photos go into the PDF exactly as they are, with no quality loss. Photos taken sideways are turned upright.')));
      root.appendChild(listPanel);
      root.appendChild(optPanel);
      sync();
    }
  });

  /* ========================================================================
     Protect PDF with a Password
     Standard security handler encryption (ISO 32000-2, 7.6.4): AES-256
     (revision 6) or AES-128 (revision 4). It is the exact reverse of what
     assets/js/lib/pdf-file-unlock.js removes.
     ======================================================================== */

  var PDF_PAD = new Uint8Array([0x28, 0xBF, 0x4E, 0x5E, 0x4E, 0x75, 0x8A, 0x41, 0x64, 0x00, 0x4E, 0x56,
    0xFF, 0xFA, 0x01, 0x08, 0x2E, 0x2E, 0x00, 0xB6, 0xD0, 0x68, 0x3E, 0x80, 0x2F, 0x0C, 0xA9, 0xFE,
    0x64, 0x53, 0x69, 0x7A]);

  /* Permission bits, numbered from 1 as in the PDF specification. */
  var PDF_PERMS = [
    { bit: 3, label: 'Print' },
    { bit: 12, label: 'Print at full quality', needs: 3 },
    { bit: 5, label: 'Copy text and images' },
    { bit: 4, label: 'Change the content' },
    { bit: 6, label: 'Add comments and fill in forms' },
    { bit: 9, label: 'Fill in form fields', impliedBy: 6 },
    { bit: 11, label: 'Insert, delete and turn pages' }
  ];

  function randomBytes(n) { var b = new Uint8Array(n); crypto.getRandomValues(b); return b; }
  function concatBytes() {
    var parts = Array.prototype.slice.call(arguments), len = 0, off = 0;
    parts.forEach(function (p) { len += p.length; });
    var out = new Uint8Array(len);
    parts.forEach(function (p) { out.set(p, off); off += p.length; });
    return out;
  }
  function bytesOfHex(h) { var out = new Uint8Array(h.length / 2); for (var i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16); return out; }
  function md5Bytes(b) { return bytesOfHex(window.Hash.md5(b)); }
  function rc4(key, data) {
    var s = new Uint8Array(256), i, j = 0, t;
    for (i = 0; i < 256; i++) s[i] = i;
    for (i = 0; i < 256; i++) { j = (j + s[i] + key[i % key.length]) & 255; t = s[i]; s[i] = s[j]; s[j] = t; }
    var out = new Uint8Array(data.length);
    i = 0; j = 0;
    for (var k = 0; k < data.length; k++) {
      i = (i + 1) & 255; j = (j + s[i]) & 255;
      t = s[i]; s[i] = s[j]; s[j] = t;
      out[k] = data[k] ^ s[(s[i] + s[j]) & 255];
    }
    return out;
  }
  function xorKey(key, n) { var k = new Uint8Array(key.length); for (var i = 0; i < key.length; i++) k[i] = key[i] ^ n; return k; }
  function subtleCrypto() {
    if (!window.crypto || !window.crypto.subtle) throw new Error('Encryption needs WebCrypto, which browsers only offer to pages served over http(s). Open the app through its local server (serve.py).');
    return window.crypto.subtle;
  }
  function aesKey(raw) { return subtleCrypto().importKey('raw', raw, { name: 'AES-CBC' }, false, ['encrypt']); }
  /* WebCrypto always pads, so for block-aligned input the last block is dropped. */
  async function aesNoPad(raw, iv, data) {
    var out = new Uint8Array(await subtleCrypto().encrypt({ name: 'AES-CBC', iv: iv }, await aesKey(raw), data));
    return out.subarray(0, data.length);
  }
  async function shaBits(bits, data) { return new Uint8Array(await subtleCrypto().digest('SHA-' + bits, data)); }

  /* Algorithm 2.B: the revision 6 password hash. */
  async function hash2B(pw, salt, udata) {
    var k = await shaBits(256, concatBytes(pw, salt, udata));
    for (var round = 1; ; round++) {
      var unit = concatBytes(pw, k, udata);
      var k1 = new Uint8Array(unit.length * 64);
      for (var i = 0; i < 64; i++) k1.set(unit, i * unit.length);
      var e = await aesNoPad(k.subarray(0, 16), k.subarray(16, 32), k1);
      var sum = 0;
      for (var j = 0; j < 16; j++) sum += e[j];
      k = await shaBits([256, 384, 512][sum % 3], e);
      if (round >= 64 && e[e.length - 1] <= round - 32) break;
    }
    return k.subarray(0, 32);
  }

  function utf8Password(pw) { return new TextEncoder().encode(pw.normalize ? pw.normalize('NFKC') : pw).subarray(0, 127); }
  function latin1Password(pw) {
    var out = [];
    for (var i = 0; i < pw.length && out.length < 32; i++) {
      var c = pw.charCodeAt(i);
      if (c > 255) throw new Error('AES-128 passwords can only use Western European (Latin-1) characters. Choose AES-256 for other characters.');
      out.push(c);
    }
    return new Uint8Array(out);
  }
  function padPassword(b) { var out = new Uint8Array(32); out.set(b.subarray(0, 32)); if (b.length < 32) out.set(PDF_PAD.subarray(0, 32 - b.length), b.length); return out; }

  /* /P: reserved bits 7, 8 and 13-32 are 1; bit 10 (accessibility) stays on. */
  function permissionValue(bits) {
    var p = 0xFFFFF0C0 | (1 << 9);
    bits.forEach(function (b) { p |= 1 << (b - 1); });
    return p | 0;
  }

  /* Encrypt a PDF that has no object streams (save it with
     useObjectStreams:false first) and return the new bytes. */
  async function encryptPdf(bytes, opt) {
    var L = await K.libPdf();
    var doc = await L.PDFDocument.load(bytes, { updateMetadata: false });
    var ctx = doc.context;
    var hex = function (b) { return L.PDFHexString.of(window.Hash.toHex(b)); };
    var P = permissionValue(opt.perms);
    var Pb = new Uint8Array([P & 255, (P >>> 8) & 255, (P >>> 16) & 255, (P >>> 24) & 255]);
    var id0 = randomBytes(16);
    ctx.trailerInfo.ID = ctx.obj([hex(id0), hex(id0)]);
    ctx.header = L.PDFHeader.forVersion(1, 7);
    var encDict, keyFor;

    if (opt.method === 'aes256') {
      var fileKey = randomBytes(32), none = new Uint8Array(0), zeroIv = new Uint8Array(16);
      var up = utf8Password(opt.user), op = utf8Password(opt.owner);
      var uvs = randomBytes(8), uks = randomBytes(8), ovs = randomBytes(8), oks = randomBytes(8);
      var Ub = concatBytes(await hash2B(up, uvs, none), uvs, uks);
      var UE = await aesNoPad(await hash2B(up, uks, none), zeroIv, fileKey);
      var Ob = concatBytes(await hash2B(op, ovs, Ub), ovs, oks);
      var OE = await aesNoPad(await hash2B(op, oks, Ub), zeroIv, fileKey);
      /* Perms: P, four 0xFF bytes, "T" (metadata encrypted), "adb", 4 random bytes, AES-256 ECB = one CBC block with a zero IV. */
      var Perms = await aesNoPad(fileKey, zeroIv, concatBytes(Pb, new Uint8Array([255, 255, 255, 255, 0x54, 0x61, 0x64, 0x62]), randomBytes(4)));
      encDict = ctx.obj({
        Filter: 'Standard', V: 5, R: 6, Length: 256, P: P,
        CF: { StdCF: { AuthEvent: 'DocOpen', CFM: 'AESV3', Length: 32 } }, StmF: 'StdCF', StrF: 'StdCF',
        O: hex(Ob), U: hex(Ub), OE: hex(OE), UE: hex(UE), Perms: hex(Perms)
      });
      doc.catalog.set(L.PDFName.of('Extensions'), ctx.obj({ ADBE: { BaseVersion: '1.7', ExtensionLevel: 8 } }));
      var key256 = await aesKey(fileKey);
      keyFor = function () { return key256; };
    } else {
      var upw = latin1Password(opt.user), opw = latin1Password(opt.owner);
      /* Algorithm 3 (O), 2 (file key) and 5 (U), revision 4. */
      var ok = md5Bytes(padPassword(opw));
      for (var i = 0; i < 50; i++) ok = md5Bytes(ok);
      var O = rc4(ok, padPassword(upw));
      for (var n = 1; n <= 19; n++) O = rc4(xorKey(ok, n), O);
      var fk = md5Bytes(concatBytes(padPassword(upw), O, Pb, id0));
      for (var r = 0; r < 50; r++) fk = md5Bytes(fk);
      var Uv = rc4(fk, md5Bytes(concatBytes(PDF_PAD, id0)));
      for (var q = 1; q <= 19; q++) Uv = rc4(xorKey(fk, q), Uv);
      encDict = ctx.obj({
        Filter: 'Standard', V: 4, R: 4, Length: 128, P: P,
        CF: { StdCF: { AuthEvent: 'DocOpen', CFM: 'AESV2', Length: 16 } }, StmF: 'StdCF', StrF: 'StdCF',
        O: hex(O), U: hex(concatBytes(Uv, randomBytes(16)))
      });
      var keys = new Map();
      keyFor = async function (ref) {
        var key = keys.get(ref.tag);
        if (!key) {
          var on = ref.objectNumber, gn = ref.generationNumber;
          key = await aesKey(md5Bytes(concatBytes(fk, new Uint8Array([on & 255, (on >> 8) & 255, (on >> 16) & 255, gn & 255, (gn >> 8) & 255, 0x73, 0x41, 0x6C, 0x54]))));
          keys.set(ref.tag, key);
        }
        return key;
      };
    }

    async function enc(ref, data) {
      var iv = randomBytes(16);
      return concatBytes(iv, new Uint8Array(await subtleCrypto().encrypt({ name: 'AES-CBC', iv: iv }, await keyFor(ref), data)));
    }
    async function walk(o, ref) {
      if (o instanceof L.PDFString || o instanceof L.PDFHexString) return hex(await enc(ref, o.asBytes()));
      if (o instanceof L.PDFArray) {
        for (var a = 0; a < o.size(); a++) { var v = o.get(a), nv = await walk(v, ref); if (nv !== v) o.set(a, nv); }
      } else if (o instanceof L.PDFDict) {
        var entries = o.entries();
        for (var e = 0; e < entries.length; e++) { var val = entries[e][1], nval = await walk(val, ref); if (nval !== val) o.set(entries[e][0], nval); }
      }
      return o;
    }
    var objects = ctx.enumerateIndirectObjects();
    for (var k = 0; k < objects.length; k++) {
      var ref = objects[k][0], obj = objects[k][1];
      if (opt.onProgress && k % 50 === 0) opt.onProgress(k / objects.length);
      if (obj instanceof L.PDFStream) {
        var contents = obj.getContents();
        await walk(obj.dict, ref);
        ctx.assign(ref, L.PDFRawStream.of(obj.dict, await enc(ref, contents)));
      } else {
        var nobj = await walk(obj, ref);
        if (nobj !== obj) ctx.assign(ref, nobj);
      }
    }
    ctx.trailerInfo.Encrypt = ctx.register(encDict);
    /* No appearance regeneration: anything created now would be unencrypted. */
    return doc.save({ useObjectStreams: false, updateFieldAppearances: false, addDefaultPage: false });
  }

  function strongEnough(pw) {
    if (!pw) return '';
    var kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(function (re) { return re.test(pw); }).length;
    if (pw.length < 8) return 'Short passwords can be guessed quickly. Use 12 or more characters.';
    if (pw.length < 12 && kinds < 3) return 'Fair. Longer is stronger: a few unrelated words work well.';
    return 'Good length.';
  }

  Tools.register({
    id: 'pdf-protect', category: 'pdf', name: 'Protect PDF with a Password',
    description: 'Encrypt a PDF with AES so it needs a password to open, and choose what people can do with it.',
    keywords: ['password protect pdf', 'encrypt pdf', 'lock pdf', 'secure pdf', 'aes-256', 'aes-128', 'permissions',
      'restrict printing', 'restrict copying', 'owner password', 'user password', 'protect'],
    render: function (root) {
      root.classList.add('g-pdfb');
      K.singlePdf(root, {
        intro: el('div', { class: 'g-info', text: 'ℹ The PDF is encrypted on this device. Keep the password somewhere safe: a forgotten password cannot be recovered.' }),
        onLoad: async function (ctx) {
          var doc = await K.openPdfLib(ctx.bytes);
          var pages = doc.getPageCount();
          ctx.info.append(ctx.file.name, el('span', { class: 'muted', text: K.plural(pages, 'page') + ' · ' + K.kbRound(ctx.file.size) }));
          function pw(label) { return U.input({ type: 'password', autocomplete: 'new-password', spellcheck: false, 'aria-label': label }); }
          var user = pw('Password to open'), user2 = pw('Repeat the password'), owner = pw('Owner password');
          owner.placeholder = 'Optional';
          var strength = U.note('');
          var show = U.checkbox('Show passwords');
          show.input.addEventListener('change', function () { [user, user2, owner].forEach(function (i) { i.type = show.input.checked ? 'text' : 'password'; }); });
          user.addEventListener('input', function () { strength.textContent = strongEnough(user.value); });
          var method = U.select({ options: [
            { value: 'aes256', label: 'AES-256 (recommended)' },
            { value: 'aes128', label: 'AES-128 (for very old PDF readers)' }], value: 'aes256' });
          var boxes = {};
          PDF_PERMS.forEach(function (p) { boxes[p.bit] = U.checkbox(p.label, { checked: true }); });
          function link() {
            PDF_PERMS.forEach(function (p) {
              var box = boxes[p.bit].input;
              var off = p.needs && !boxes[p.needs].input.checked, forced = p.impliedBy && boxes[p.impliedBy].input.checked;
              if (off) box.checked = false;
              if (forced) box.checked = true;
              box.disabled = !!(off || forced);
            });
          }
          PDF_PERMS.forEach(function (p) { boxes[p.bit].input.addEventListener('change', link); });
          link();
          var go = U.button('Protect PDF', null, 'primary');
          var result = K.resultArea();
          user2.addEventListener('keydown', function (e) { if (e.key === 'Enter') go.click(); });

          go.addEventListener('click', K.runBusy(go, async function () {
            try {
              if (!user.value) throw new Error('Enter the password people will need to open the PDF.');
              if (user.value !== user2.value) throw new Error('The two passwords do not match.');
              if (owner.value && owner.value === user.value) throw new Error('Use a different owner password, or leave it empty. The same password would give everyone full access.');
              var bits = PDF_PERMS.filter(function (p) { return boxes[p.bit].input.checked; }).map(function (p) { return p.bit; });
              /* No owner password: use a long random one, so the permissions hold. */
              var ownerPw = owner.value || Array.prototype.map.call(randomBytes(18), function (b) { return (b % 36).toString(36); }).join('');
              if (method.value === 'aes128') { latin1Password(user.value); latin1Password(ownerPw); }
              result.busy('Preparing…');
              var clean = await (await K.openPdfLib(ctx.bytes)).save({ useObjectStreams: false, updateFieldAppearances: false });
              result.busy('Encrypting…', 0);
              var out = await encryptPdf(clean, { user: user.value, owner: ownerPw, method: method.value, perms: bits,
                onProgress: function (f) { result.busy('Encrypting…', f); } });
              /* Check the result opens with the password before handing it over. */
              var check = await K.openPdfjs(out, user.value);
              var n = check.numPages;
              K.closePdf(check);
              if (n !== pages) throw new Error('The encrypted copy did not read back correctly.');
              var allowed = PDF_PERMS.filter(function (p) { return bits.indexOf(p.bit) > -1 && !p.impliedBy; }).map(function (p) { return p.label.toLowerCase(); });
              result.done('Protected with ' + (method.value === 'aes256' ? 'AES-256' : 'AES-128') + ' · ' + K.plural(n, 'page'), out,
                K.baseName(ctx.file.name) + '-protected.pdf', 'Download Protected PDF',
                el('div', { class: 'stack' },
                  U.note(bits.length === PDF_PERMS.length ? 'Anyone with the password can do everything with it.' :
                    'With the password, people can ' + (allowed.length ? allowed.join(', ') : 'only read it') + '.'),
                  owner.value ? null : U.note('No owner password was given, so a random one was set. The permissions can only be lifted by removing the password (Unlock PDF).')));
            } catch (err) { result.fail(err); }
          }));

          ctx.body.append(U.panel(null,
            U.row(el('div', { class: 'grow' }, field('Password to open', user)), el('div', { class: 'grow' }, field('Repeat the password', user2))),
            strength,
            U.row(el('div', { class: 'grow' }, field('Owner password', owner, 'Lets you change the permissions later. Leave empty for a random one.')), field('Encryption', method)),
            show,
            el('fieldset', { class: 'stack', style: { border: '1px solid var(--border)', borderRadius: 'var(--radius-s)', padding: '10px 12px', gap: '6px' } },
              el('legend', { class: 'note', text: 'After opening, people may:' }),
              PDF_PERMS.map(function (p) { return boxes[p.bit]; })),
            U.note('Well-behaved PDF apps respect these permissions, but some ignore them. The password to open is what really protects the file.'),
            U.btnrow(go), result));
        }
      });
    }
  });

  /* ========================================================================
     Sign PDF
     ======================================================================== */

  /* Handwriting fonts vendored in assets/vendor/signature-fonts (SIL OFL). */
  var SIGN_FONTS = [
    ['Great Vibes', 'great-vibes'], ['Dancing Script', 'dancing-script'], ['Allura', 'allura'], ['Sacramento', 'sacramento'],
    ['Mrs Saint Delafield', 'mrs-saint-delafield'], ['Herr Von Muellerhoff', 'herr-von-muellerhoff'], ['Homemade Apple', 'homemade-apple'], ['Caveat', 'caveat']
  ];
  var signFontsReady = null;
  function loadSignFonts() {
    if (!signFontsReady) {
      signFontsReady = Promise.all(SIGN_FONTS.map(function (f) {
        if (typeof FontFace === 'undefined') return null;
        var face = new FontFace(f[0], 'url(' + new URL('assets/vendor/signature-fonts/' + f[1] + '-latin-400-normal.woff2', document.baseURI).href + ') format("woff2")');
        return face.load().then(function (loaded) { document.fonts.add(loaded); }).catch(function () { return null; });
      }));
    }
    return signFontsReady;
  }

  /* Crop a canvas to its visible (non-transparent) pixels plus padding. */
  function trimCanvas(c, pad) {
    var d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
    var minX = c.width, minY = c.height, maxX = -1, maxY = -1;
    for (var y = 0; y < c.height; y++) {
      for (var x = 0; x < c.width; x++) {
        if (d[(y * c.width + x) * 4 + 3] > 8) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
      }
    }
    if (maxX < 0) return null;
    var w = maxX - minX + 1, h = maxY - minY + 1;
    var out = el('canvas'); out.width = w + pad * 2; out.height = h + pad * 2;
    out.getContext('2d').drawImage(c, minX, minY, w, h, pad, pad, w, h);
    return out;
  }

  function hexRgb(L, hex) {
    var n = parseInt(String(hex).replace('#', ''), 16) || 0;
    return L.rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
  }

  var INKS = [{ value: '#111111', label: 'Black' }, { value: '#1a3fb3', label: 'Blue' }];

  Tools.register({
    id: 'pdf-sign', category: 'pdf', name: 'Sign PDF',
    description: 'Draw, type or upload your signature, place it on any page with name and date stamps, and save the signed PDF.',
    keywords: ['sign pdf', 'e-sign', 'esign', 'electronic signature', 'signature', 'fill and sign', 'initials', 'date stamp',
      'add signature to pdf', 'handwriting', 'autograph', 'docusign alternative'],
    render: function (root) {
      root.classList.add('g-pdfb');
      var placements = [], armed = null, pagesInfo = [], pdf = null, alive = true, observer = null, nextId = 1;
      var ink = INKS[0].value, mode = 'draw';
      U.onTeardown(root, function () { alive = false; if (observer) observer.disconnect(); K.closePdf(pdf); });

      /* --- draw pane ------------------------------------------------------ */
      var strokes = [], current = null, dpr = 1;
      var padCanvas = el('canvas');
      var padPh = el('span', { class: 'ph', text: 'Sign here with a mouse, finger or stylus' });
      var pad = el('div', { class: 'g-pad', dataset: { k: 'pad' } }, el('span', { class: 'line' }), padPh, padCanvas);
      function padSize() {
        var r = pad.getBoundingClientRect();
        if (!r.width) return;
        dpr = window.devicePixelRatio || 1;
        padCanvas.width = Math.round(r.width * dpr); padCanvas.height = Math.round(r.height * dpr);
        paintStrokes(padCanvas.getContext('2d'), dpr);
      }
      var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(padSize) : null;
      if (ro) ro.observe(pad);
      U.onTeardown(root, function () { if (ro) ro.disconnect(); });
      function paintStrokes(x, scale) {
        x.clearRect(0, 0, x.canvas.width, x.canvas.height);
        x.strokeStyle = ink; x.fillStyle = ink; x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = 2.6 * scale;
        strokes.forEach(function (s) {
          var p = s;
          if (p.length === 1) { x.beginPath(); x.arc(p[0].x * scale, p[0].y * scale, 1.4 * scale, 0, Math.PI * 2); x.fill(); return; }
          x.beginPath();
          x.moveTo(p[0].x * scale, p[0].y * scale);
          for (var i = 1; i < p.length - 1; i++) x.quadraticCurveTo(p[i].x * scale, p[i].y * scale, (p[i].x + p[i + 1].x) / 2 * scale, (p[i].y + p[i + 1].y) / 2 * scale);
          x.lineTo(p[p.length - 1].x * scale, p[p.length - 1].y * scale);
          x.stroke();
        });
        padPh.style.display = strokes.length ? 'none' : '';
      }
      function padPos(e) { var r = pad.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
      pad.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        try { pad.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
        current = [padPos(e)];
        strokes.push(current);
        paintStrokes(padCanvas.getContext('2d'), dpr);
      });
      pad.addEventListener('pointermove', function (e) {
        if (!current) return;
        var p = padPos(e), last = current[current.length - 1];
        if (Math.hypot(p.x - last.x, p.y - last.y) < 1) return;
        current.push(p);
        paintStrokes(padCanvas.getContext('2d'), dpr);
      });
      ['pointerup', 'pointercancel'].forEach(function (t) { pad.addEventListener(t, function () { current = null; }); });
      var drawPane = el('div', { class: 'stack' }, pad,
        U.btnrow(U.button('Undo stroke', function () { strokes.pop(); paintStrokes(padCanvas.getContext('2d'), dpr); }, 'ghost'),
          U.button('Clear', function () { strokes = []; paintStrokes(padCanvas.getContext('2d'), dpr); }, 'ghost')));
      function drawnSignature() {
        if (!strokes.length) return null;
        var r = pad.getBoundingClientRect(), c = el('canvas');
        c.width = Math.round(r.width * 3); c.height = Math.round(r.height * 3);
        paintStrokes(c.getContext('2d'), 3);
        return trimCanvas(c, 12);
      }

      /* --- type pane ------------------------------------------------------ */
      var typeName = U.input({ placeholder: 'Your name', 'aria-label': 'Name to type as a signature', autocomplete: 'name' });
      var font = SIGN_FONTS[0][0];
      var fontBtns = SIGN_FONTS.map(function (f) {
        return el('button', { class: 'g-fontbtn' + (f[0] === font ? ' on' : ''), type: 'button', title: f[0], 'aria-label': 'Font ' + f[0],
          'aria-pressed': f[0] === font ? 'true' : 'false', style: { fontFamily: '"' + f[0] + '", cursive' },
          onclick: function () {
            font = f[0];
            fontBtns.forEach(function (b, i) { var on = SIGN_FONTS[i][0] === font; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
            paintTyped();
          } }, 'Your name');
      });
      var typedPrev = el('div', { class: 'g-sigprev' });
      function typedSignature(scale) {
        var text = typeName.value.trim();
        if (!text) return null;
        var size = 120 * (scale || 1), c = el('canvas'), x = c.getContext('2d');
        x.font = size + 'px "' + font + '", cursive';
        var w = Math.ceil(x.measureText(text).width);
        c.width = w + size * 2; c.height = Math.ceil(size * 2.2);
        x = c.getContext('2d');
        x.font = size + 'px "' + font + '", cursive';
        x.fillStyle = ink; x.textBaseline = 'middle';
        x.fillText(text, size, size * 1.1);
        return trimCanvas(c, Math.round(size * 0.12));
      }
      function paintTyped() {
        fontBtns.forEach(function (b) { b.textContent = typeName.value.trim() || 'Your name'; });
        var t = typedSignature(0.5);
        typedPrev.replaceChildren(t || U.note('Type your name to see it here.'));
      }
      typeName.addEventListener('input', paintTyped);
      var typePane = el('div', { class: 'stack' }, field('Your name', typeName), el('div', { class: 'g-fonts' }, fontBtns), typedPrev);

      /* --- upload pane ---------------------------------------------------- */
      var uploaded = null;
      var removeWhite = U.checkbox('Make a white background transparent', { checked: true });
      var upPrev = el('div', { class: 'g-sigprev' }, U.note('A PNG with a transparent background works best.'));
      async function readUpload(file) {
        try {
          var src = await bitmapOf(file);
          var w = src.width || src.naturalWidth, h = src.height || src.naturalHeight, k = Math.min(1, 1600 / Math.max(w, h));
          var c = el('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
          c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
          uploaded = c;
          paintUpload();
        } catch (e) { upPrev.replaceChildren(U.note(file.name + ' is not an image this browser can read.', 'err')); }
      }
      function uploadedSignature() {
        if (!uploaded) return null;
        var c = el('canvas'); c.width = uploaded.width; c.height = uploaded.height;
        var x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(uploaded, 0, 0);
        if (removeWhite.input.checked) {
          var img = x.getImageData(0, 0, c.width, c.height), d = img.data;
          for (var i = 0; i < d.length; i += 4) {
            var lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            /* fully clear above 235, fade out between 200 and 235 */
            if (lum >= 235) d[i + 3] = 0;
            else if (lum > 200) d[i + 3] = Math.round(d[i + 3] * (235 - lum) / 35);
          }
          x.putImageData(img, 0, 0);
        }
        return trimCanvas(c, 4) || c;
      }
      function paintUpload() { var s = uploadedSignature(); if (s) upPrev.replaceChildren(s); }
      removeWhite.input.addEventListener('change', paintUpload);
      var uploadPane = el('div', { class: 'stack' },
        U.dropzone({ accept: 'image/*', label: 'Choose a picture of your signature', hint: 'PNG, JPG or WebP', onFiles: function (f) { readUpload(f[0]); } }),
        removeWhite, upPrev);

      var panes = { draw: drawPane, type: typePane, upload: uploadPane };
      function showPane(v) {
        mode = v;
        Object.keys(panes).forEach(function (k) { panes[k].style.display = k === v ? '' : 'none'; });
        if (v === 'type') loadSignFonts().then(paintTyped);
        if (v === 'draw') padSize();
      }
      var tabs = U.chips([{ value: 'draw', label: 'Draw' }, { value: 'type', label: 'Type' }, { value: 'upload', label: 'Upload' }], showPane, 'draw');
      var inkChips = U.chips(INKS, function (v) { ink = v; paintStrokes(padCanvas.getContext('2d'), dpr); if (mode === 'type') paintTyped(); }, ink);

      /* --- stamps ------------------------------------------------------------ */
      var nameIn = U.input({ placeholder: 'Your name', 'aria-label': 'Name stamp', autocomplete: 'name' });
      var dateIn = U.input({ value: ddmmyyyy(new Date()), 'aria-label': 'Date stamp' });
      var textIn = U.input({ placeholder: 'Any other text', 'aria-label': 'Text stamp' });

      /* --- placing ------------------------------------------------------------- */
      var armNote = U.note('');
      var armBar = el('div', { class: 'g-armbar' });
      function arm(item, what) {
        armed = item;
        root.classList.add('g-armed');
        setKids(armBar, U.panel(null, el('div', { class: 'g-bar' },
          el('strong', { text: 'Click on a page to place the ' + what + '.' }),
          U.button('Cancel', disarm, 'ghost'))));
      }
      function disarm() { armed = null; root.classList.remove('g-armed'); armBar.replaceChildren(); }
      document.addEventListener('keydown', onEsc);
      U.onTeardown(root, function () { document.removeEventListener('keydown', onEsc); });
      function onEsc(e) { if (e.key === 'Escape' && armed) disarm(); }

      async function armSignature() {
        var c = mode === 'draw' ? drawnSignature() : mode === 'type' ? (await loadSignFonts(), typedSignature(1.4)) : uploadedSignature();
        if (!c) return U.toast(mode === 'draw' ? 'Draw your signature first' : mode === 'type' ? 'Type your name first' : 'Choose a picture first', 'err');
        var png = await K.canvasBytes(c, 'image/png');
        arm({ kind: 'image', img: { url: c.toDataURL('image/png'), png: png, aspect: c.width / c.height } }, 'signature');
      }
      function armText(input, what) {
        var t = input.value.trim();
        if (!t) return U.toast('Type the ' + what + ' first', 'err');
        arm({ kind: 'text', text: t, color: ink }, what);
      }

      function countPlaced() {
        var pagesUsed = {};
        placements.forEach(function (p) { pagesUsed[p.page] = 1; });
        placedNote.textContent = placements.length ? K.plural(placements.length, 'item') + ' on ' + K.plural(Object.keys(pagesUsed).length, 'page') : 'Nothing placed yet.';
      }
      var placedNote = el('span', { class: 'note', dataset: { k: 'placed' }, text: 'Nothing placed yet.' });

      function place(pageIndex, cx, cy) {
        var info = pagesInfo[pageIndex], item = armed;
        disarm();
        var pl = { id: nextId++, page: pageIndex, kind: item.kind, img: item.img, text: item.text, color: item.color };
        if (item.kind === 'image') {
          pl.fw = Math.min(0.3, 0.9);
          pl.fh = pl.fw * info.w / (item.img.aspect * info.h);
          if (pl.fh > 0.4) { pl.fh = 0.4; pl.fw = pl.fh * item.img.aspect * info.h / info.w; }
        } else {
          pl.fh = 12 * 1.2 / info.h;          /* 12 pt text */
          pl.fw = estimateTextWidth(item.text, 12) / info.w;
        }
        pl.fx = Math.max(0, Math.min(1 - pl.fw, cx - pl.fw / 2));
        pl.fy = Math.max(0, Math.min(1 - pl.fh, cy - pl.fh / 2));
        placements.push(pl);
        info.layer.appendChild(placementNode(pl));
        countPlaced();
      }
      var measurer = null;
      function estimateTextWidth(text, size) {
        measurer = measurer || el('canvas').getContext('2d');
        measurer.font = '100px Helvetica, Arial, sans-serif';
        return measurer.measureText(text).width / 100 * size;
      }

      function positionNode(node, pl) {
        var info = pagesInfo[pl.page];
        node.style.left = (pl.fx * 100) + '%';
        node.style.top = (pl.fy * 100) + '%';
        if (pl.kind === 'image') {
          node.style.width = (pl.fw * 100) + '%';
          node.style.height = (pl.fh * 100) + '%';
        } else {
          node.style.fontSize = (pl.fh * info.h / 1.2 / info.w * 100) + 'cqw';
          node.style.color = pl.color;
        }
      }
      function placementNode(pl) {
        var info = pagesInfo[pl.page];
        var node = el('div', { class: 'g-place' + (pl.kind === 'text' ? ' txt' : ''), tabIndex: 0, role: 'group',
          'aria-label': (pl.kind === 'image' ? 'Signature' : 'Text "' + pl.text + '"') + ' on page ' + (pl.page + 1) + '. Arrow keys move it, + and - resize, Delete removes.',
          dataset: { id: String(pl.id) } });
        node.appendChild(pl.kind === 'image' ? el('img', { src: pl.img.url, alt: '', draggable: false }) : el('span', { text: pl.text }));
        var del = el('button', { class: 'x', type: 'button', text: '×', title: 'Remove', 'aria-label': 'Remove',
          onpointerdown: function (e) { e.stopPropagation(); }, onclick: function (e) { e.stopPropagation(); removePl(); } });
        var rs = el('span', { class: 'rs', title: 'Drag to resize' });
        node.append(del, rs);
        positionNode(node, pl);
        function removePl() { placements.splice(placements.indexOf(pl), 1); node.remove(); countPlaced(); }
        function curW() { return pl.kind === 'image' ? pl.fw : node.offsetWidth / info.layer.offsetWidth; }
        function resizeBy(k) {
          if (pl.kind === 'image') {
            var fw = Math.max(0.02, Math.min(1 - pl.fx, pl.fw * k)), fh = fw * pl.fh / pl.fw;
            if (pl.fy + fh > 1) { fh = 1 - pl.fy; fw = fh * pl.fw / pl.fh; }
            pl.fw = fw; pl.fh = fh;
          } else {
            pl.fh = Math.max(4 * 1.2 / info.h, Math.min(1 - pl.fy, pl.fh * k));
          }
          positionNode(node, pl);
        }
        node.addEventListener('click', function (e) { e.stopPropagation(); });
        node.addEventListener('keydown', function (e) {
          var step = e.shiftKey ? 0.05 : 0.005, mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
          if (mv) {
            e.preventDefault();
            pl.fx = Math.max(0, Math.min(1 - curW(), pl.fx + mv[0]));
            pl.fy = Math.max(0, Math.min(1 - pl.fh, pl.fy + mv[1]));
            positionNode(node, pl);
          } else if (e.key === '+' || e.key === '=') { e.preventDefault(); resizeBy(1.1); }
          else if (e.key === '-') { e.preventDefault(); resizeBy(1 / 1.1); }
          else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removePl(); }
        });
        node.addEventListener('pointerdown', function (e) {
          if (e.button !== 0) return;
          e.preventDefault(); e.stopPropagation();
          node.focus({ preventScroll: true });
          var resizing = e.target === rs, sx = e.clientX, sy = e.clientY, start = { fx: pl.fx, fy: pl.fy, fw: pl.fw, fh: pl.fh };
          var box = info.layer.getBoundingClientRect(), wNow = curW(), pid = e.pointerId;
          try { node.setPointerCapture(pid); } catch (x) { /* ignore */ }
          function move(ev) {
            if (ev.pointerId !== pid) return;
            var dx = (ev.clientX - sx) / box.width, dy = (ev.clientY - sy) / box.height;
            if (resizing) {
              if (pl.kind === 'image') {
                var fw = Math.max(0.02, Math.min(1 - pl.fx, start.fw + dx)), fh = fw * start.fh / start.fw;
                if (pl.fy + fh > 1) { fh = 1 - pl.fy; fw = fh * start.fw / start.fh; }
                pl.fw = fw; pl.fh = fh;
              } else {
                pl.fh = Math.max(4 * 1.2 / info.h, Math.min(1 - pl.fy, start.fh + dy));
              }
            } else {
              pl.fx = Math.max(0, Math.min(1 - wNow, start.fx + dx));
              pl.fy = Math.max(0, Math.min(1 - pl.fh, start.fy + dy));
            }
            positionNode(node, pl);
          }
          function up(ev) {
            if (ev.pointerId !== pid) return;
            node.removeEventListener('pointermove', move);
            node.removeEventListener('pointerup', up);
            node.removeEventListener('pointercancel', up);
            if (pl.kind === 'text') pl.fw = curW();
          }
          node.addEventListener('pointermove', move);
          node.addEventListener('pointerup', up);
          node.addEventListener('pointercancel', up);
        });
        return node;
      }

      /* --- pages, rendered as they scroll into view ---------------------------- */
      async function renderInto(info) {
        if (info.rendered || !alive) return;
        info.rendered = true;
        try {
          var page = await pdf.getPage(info.index + 1);
          var cssW = Math.min(860, Math.max(280, info.layer.getBoundingClientRect().width || 800));
          var vp = page.getViewport({ scale: cssW * Math.min(2, window.devicePixelRatio || 1) / info.w });
          var c = el('canvas', { width: Math.round(vp.width), height: Math.round(vp.height) });
          var x = c.getContext('2d');
          x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
          await page.render({ canvasContext: x, viewport: vp }).promise;
          page.cleanup();
          if (alive) info.layer.insertBefore(c, info.layer.children[1] || null);
        } catch (e) { info.rendered = false; }
      }

      K.singlePdf(root, {
        intro: el('div', { class: 'g-info', text: 'ℹ This adds a visible signature: a picture of your handwriting on the page. It is not a certificate-based digital signature, so it does not prove who signed or show whether the file was changed later.' }),
        onLoad: async function (ctx) {
          K.closePdf(pdf);
          if (observer) observer.disconnect();
          placements = []; pagesInfo = []; disarm();
          await K.openPdfLib(ctx.bytes);            /* fails early, with a clear message, for password-protected files */
          pdf = await K.openPdfjs(ctx.bytes);
          ctx.info.append(ctx.file.name, el('span', { class: 'muted', text: K.plural(pdf.numPages, 'page') }));
          var holder = el('div', { class: 'g-spages' });
          observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(function (entries) {
            entries.forEach(function (en) { if (en.isIntersecting) renderInto(pagesInfo[+en.target.dataset.page]); });
          }, { rootMargin: '600px 0px' }) : null;
          for (var i = 0; i < pdf.numPages; i++) {
            var pg = await pdf.getPage(i + 1);
            var vp1 = pg.getViewport({ scale: 1 });
            var layer = el('div', { class: 'g-spage', dataset: { page: String(i) }, style: { maxWidth: Math.round(Math.min(860, vp1.width * 1.5)) + 'px', aspectRatio: vp1.width + ' / ' + vp1.height } },
              el('span', { class: 'lbl', text: 'Page ' + (i + 1) }));
            var info = { index: i, w: vp1.width, h: vp1.height, layer: layer, rendered: false };
            pagesInfo.push(info);
            (function (info) {
              layer.addEventListener('click', function (e) {
                if (!armed) return;
                var r = layer.getBoundingClientRect();
                place(info.index, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
              });
            })(info);
            holder.appendChild(layer);
            if (observer) observer.observe(layer);
          }
          if (!observer) pagesInfo.forEach(function (p) { renderInto(p); });

          var saveBtn = U.button('Save signed PDF', null, 'primary');
          var result = K.resultArea();
          saveBtn.addEventListener('click', K.runBusy(saveBtn, async function () {
            try {
              if (!placements.length) throw new Error('Place your signature or a stamp on a page first.');
              var L = await K.libPdf();
              var doc = await K.openPdfLib(ctx.bytes);
              var font = null, images = new Map(), replaced = false;
              for (var k = 0; k < placements.length; k++) {
                var pl = placements[k], page = doc.getPage(pl.page), vb = visualMap(page), W = vb.width, H = vb.height;
                if (pl.kind === 'image') {
                  var img = images.get(pl.img);
                  if (!img) { img = await doc.embedPng(pl.img.png); images.set(pl.img, img); }
                  var w = pl.fw * W, h = pl.fh * H;
                  var at = vb.map(pl.fx * W, H - pl.fy * H - h);
                  page.drawImage(img, { x: at.x, y: at.y, width: w, height: h, rotate: L.degrees(vb.rotation) });
                } else {
                  font = font || await doc.embedFont(L.StandardFonts.Helvetica);
                  var size = pl.fh * H / 1.2, safe = K.winAnsiSafe(font, pl.text);
                  replaced = replaced || safe.replaced;
                  var base = vb.map(pl.fx * W, H - pl.fy * H - size * 0.95);
                  page.drawText(safe.text, { x: base.x, y: base.y, size: size, font: font, color: hexRgb(L, pl.color), rotate: L.degrees(vb.rotation) });
                }
              }
              var bytes = await doc.save();
              result.done('Signed · ' + placedNote.textContent, bytes, K.baseName(ctx.file.name) + '-signed.pdf', 'Download Signed PDF',
                replaced ? U.note('Some characters are not in the built-in PDF font and were replaced with "?".') : null);
            } catch (err) { result.fail(err); }
          }));

          ctx.body.append(
            U.panel('Your signature', tabs, drawPane, typePane, uploadPane, field('Ink', inkChips),
              U.btnrow(U.button('Place signature', function () { armSignature().catch(function (e) { U.toast(e.message || String(e), 'err'); }); }, 'primary'))),
            U.panel('Name, date and text', U.row(
              el('div', { class: 'grow' }, field('Name', nameIn)), U.button('Place name', function () { armText(nameIn, 'name'); })),
              U.row(el('div', { class: 'grow' }, field('Date', dateIn, 'Today, as dd/mm/yyyy. Edit it if you need another date.')), U.button('Place date', function () { armText(dateIn, 'date'); })),
              U.row(el('div', { class: 'grow' }, field('Text', textIn)), U.button('Place text', function () { armText(textIn, 'text'); }))),
            armBar,
            U.panel(null, U.note('Drag anything you placed to move it; drag the round handle to resize it; × removes it.'), holder),
            U.panel(null, el('div', { class: 'g-bar' }, saveBtn, placedNote), result));
          showPane(mode);
          typeName.addEventListener('input', function () { if (!nameIn.value || nameIn.dataset.auto) { nameIn.value = typeName.value; nameIn.dataset.auto = '1'; } });
        }
      });
    }
  });
  /* ========================================================================
     Fill PDF Forms
     ======================================================================== */

  function formFieldKind(L, f) {
    if (f instanceof L.PDFTextField) return f.isMultiline() ? 'multiline' : 'text';
    if (f instanceof L.PDFCheckBox) return 'checkbox';
    if (f instanceof L.PDFRadioGroup) return 'radio';
    if (f instanceof L.PDFDropdown) return 'dropdown';
    if (f instanceof L.PDFOptionList) return 'optionlist';
    if (f instanceof L.PDFButton) return 'button';
    if (f instanceof L.PDFSignature) return 'signature';
    return 'unknown';
  }
  var KIND_LABEL = { text: 'Text', multiline: 'Text (several lines)', checkbox: 'Tick box', radio: 'Choice (radio buttons)',
    dropdown: 'Drop-down list', optionlist: 'List', button: 'Button', signature: 'Signature', unknown: 'Other' };

  function readFieldValue(kind, f) {
    try {
      if (kind === 'text' || kind === 'multiline') return f.getText() || '';
      if (kind === 'checkbox') return f.isChecked();
      if (kind === 'radio') return f.getSelected() || '';
      if (kind === 'dropdown' || kind === 'optionlist') return f.getSelected() || [];
    } catch (e) { /* rich text and other oddities read as empty */ }
    return null;
  }

  /* Page numbers (1-based) for each field, from its widgets. */
  function fieldPageMap(L, doc) {
    var byRef = {}, pageByRef = {};
    doc.getPages().forEach(function (pg, i) {
      pageByRef[pg.ref.tag] = i + 1;
      var annots = pg.node.Annots();
      if (!annots) return;
      for (var k = 0; k < annots.size(); k++) { var r = annots.get(k); if (r instanceof L.PDFRef) byRef[r.tag] = i + 1; }
    });
    return function (f) {
      var out = [];
      f.acroField.getWidgets().forEach(function (w) {
        var ref = doc.context.getObjectRef(w.dict), n = ref ? byRef[ref.tag] : 0;
        if (!n && w.P && w.P()) n = pageByRef[w.P().tag];
        if (n && out.indexOf(n) < 0) out.push(n);
      });
      return out;
    };
  }

  Tools.register({
    id: 'pdf-forms', category: 'pdf', name: 'Fill PDF Forms',
    description: 'List the fields of a fillable PDF form, fill them in here, and save the PDF (optionally flattened) or a report of the values.',
    keywords: ['fill pdf form', 'pdf form filler', 'acroform', 'fillable pdf', 'form fields', 'checkbox', 'radio button', 'dropdown',
      'flatten form', 'export form data', 'json', 'fill in'],
    render: function (root) {
      root.classList.add('g-pdfb');
      K.singlePdf(root, {
        onLoad: async function (ctx) {
          var L = await K.libPdf();
          var doc = await K.openPdfLib(ctx.bytes);
          var af = doc.catalog.lookup(L.PDFName.of('AcroForm'));
          var hasXfa = af instanceof L.PDFDict && af.has(L.PDFName.of('XFA'));
          var fields = af instanceof L.PDFDict ? doc.getForm().getFields() : [];
          ctx.info.append(ctx.file.name, el('span', { class: 'muted', text: K.plural(doc.getPageCount(), 'page') + ' · ' + K.plural(fields.length, 'form field') }));
          if (!fields.length) {
            ctx.body.append(U.panel(null, U.note(hasXfa
              ? 'This PDF uses an XFA form (made with Adobe LiveCycle Designer). Browsers cannot fill XFA forms; open it in Adobe Acrobat Reader instead.'
              : 'This PDF has no fillable form fields. To write on it anyway, use Sign PDF, which can place your name, the date and any other text on a page.', 'err')));
            return;
          }
          var pagesOf = fieldPageMap(L, doc);
          var entries = fields.map(function (f, idx) {
            var kind = formFieldKind(L, f), name = f.getName(), value = readFieldValue(kind, f);
            var e = { name: name, kind: kind, readOnly: f.isReadOnly(), required: f.isRequired(), pages: pagesOf(f), original: value };
            var id = 'g-ff-' + idx;
            if (kind === 'text' || kind === 'multiline') {
              var max = f.getMaxLength();
              e.control = kind === 'multiline' ? U.textarea({ id: id, rows: 3, value: value, spellcheck: true }) : U.input({ id: id, value: value });
              if (max) e.control.maxLength = max;
              if (kind === 'multiline') e.control.style.minHeight = '80px';
              e.get = function () { return e.control.value; };
              e.set = function (v) { e.control.value = v; };
            } else if (kind === 'checkbox') {
              var cb = U.checkbox('Ticked', { id: id, checked: !!value });
              e.control = cb;
              e.get = function () { return cb.input.checked; };
              e.set = function (v) { cb.input.checked = !!v; };
            } else if (kind === 'radio') {
              e.options = f.getOptions();
              var group = 'g-rg-' + idx;
              var radios = [''].concat(e.options).map(function (o) {
                var r = el('input', { type: 'radio', name: group, value: o, checked: o === value });
                return { input: r, label: el('label', { class: 'check' }, r, el('span', { text: o || '(none)' })) };
              });
              e.control = el('div', { class: 'g-bar', role: 'radiogroup', 'aria-label': name }, radios.map(function (r) { return r.label; }));
              e.get = function () { var on = radios.filter(function (r) { return r.input.checked; })[0]; return on ? on.input.value : ''; };
              e.set = function (v) { radios.forEach(function (r) { r.input.checked = r.input.value === (v || ''); }); };
            } else if (kind === 'dropdown' || kind === 'optionlist') {
              e.options = f.getOptions();
              e.multi = f.isMultiselect ? f.isMultiselect() : false;
              e.editable = kind === 'dropdown' && f.isEditable();
              if (e.editable && !e.multi) {
                var listId = id + '-list';
                e.control = el('div', {}, U.input({ id: id, value: value[0] || '', list: listId }),
                  el('datalist', { id: listId }, e.options.map(function (o) { return el('option', { value: o }); })));
                e.get = function () { var v = e.control.querySelector('input').value; return v ? [v] : []; };
                e.set = function (v) { e.control.querySelector('input').value = (v && v[0]) || ''; };
              } else {
                var sel = el('select', { id: id, multiple: e.multi });
                if (!e.multi) sel.appendChild(el('option', { value: '', text: '(none)' }));
                e.options.forEach(function (o) { sel.appendChild(el('option', { value: o, text: o, selected: value.indexOf(o) > -1 })); });
                if (e.multi) sel.size = Math.min(6, Math.max(2, e.options.length));
                else sel.value = value[0] || '';
                e.control = sel;
                e.get = function () { return Array.prototype.filter.call(sel.options, function (o) { return o.selected && o.value; }).map(function (o) { return o.value; }); };
                e.set = function (v) { Array.prototype.forEach.call(sel.options, function (o) { o.selected = (v || []).indexOf(o.value) > -1; }); if (!e.multi && !(v || []).length) sel.value = ''; };
              }
            } else {
              e.control = U.note(kind === 'signature' ? 'Signature field: use Sign PDF to sign.' : kind === 'button' ? 'Push button: nothing to fill.' : 'This kind of field cannot be filled here.');
              e.get = function () { return null; };
              e.set = function () {};
            }
            if (e.readOnly && e.control.querySelectorAll) {
              [e.control].concat(Array.prototype.slice.call(e.control.querySelectorAll('input, select, textarea'))).forEach(function (c) { if ('disabled' in c && c.tagName !== 'DIV' && c.tagName !== 'LABEL') c.disabled = true; });
            }
            return e;
          });

          var rows = el('div', { class: 'stack' }, entries.map(function (e) {
            return el('div', { class: 'g-frow', dataset: { field: e.name } },
              el('div', { class: 'g-fname' },
                el('label', { class: 'mono', text: e.name, htmlFor: e.control.id || null }),
                el('span', { class: 'note', text: KIND_LABEL[e.kind] + (e.pages.length ? ' · page ' + e.pages.join(', ') : '') + (e.required ? ' · required' : '') + (e.readOnly ? ' · read-only' : '') })),
              el('div', { class: 'g-fctl' }, e.control));
          }));

          var flatten = U.checkbox('Flatten: make the answers part of the page (no longer editable)');
          var saveBtn = U.button('Save filled PDF', null, 'primary');
          var result = K.resultArea();

          function report() {
            return {
              file: ctx.file.name,
              fields: entries.map(function (e) {
                var o = { name: e.name, type: e.kind, value: e.get() };
                if (e.options) o.options = e.options;
                if (e.pages.length) o.page = e.pages.length === 1 ? e.pages[0] : e.pages;
                if (e.required) o.required = true;
                if (e.readOnly) o.readOnly = true;
                return o;
              })
            };
          }

          saveBtn.addEventListener('click', K.runBusy(saveBtn, async function () {
            try {
              var out = await K.openPdfLib(ctx.bytes);
              var f2 = out.getForm(), problems = [];
              entries.forEach(function (e) {
                if (e.readOnly) return;
                var v = e.get(), f;
                try { f = f2.getField(e.name); } catch (x) { return; }
                try {
                  if (e.kind === 'text' || e.kind === 'multiline') f.setText(v || undefined);
                  else if (e.kind === 'checkbox') { if (v) f.check(); else f.uncheck(); }
                  else if (e.kind === 'radio') { if (v) f.select(v); else f.clear(); }
                  else if (e.kind === 'dropdown' || e.kind === 'optionlist') { if (v.length) f.select(e.multi ? v : v[0]); else f.clear(); }
                } catch (x) { problems.push(e.name + ': ' + (x.message || x)); }
              });
              if (problems.length) throw new Error('Could not fill ' + problems.join('; '));
              var bytes, note = null;
              try {
                if (flatten.input.checked) f2.flatten();
                bytes = await out.save();
              } catch (x) {
                if (!/WinAnsi|cannot encode/i.test(x.message || '')) throw x;
                if (flatten.input.checked) throw new Error('Some answers use characters the built-in PDF font cannot draw, so the form cannot be flattened. Untick Flatten to save it; your PDF app will draw them.');
                /* Let the reader app draw the answers instead of the built-in font. */
                out = await K.openPdfLib(ctx.bytes);
                f2 = out.getForm();
                entries.forEach(function (e) {
                  if (e.readOnly) return;
                  var v = e.get(), f = f2.getField(e.name);
                  if (e.kind === 'text' || e.kind === 'multiline') f.acroField.setValue(L.PDFHexString.fromText(v || ''));
                  else if (e.kind === 'checkbox') { if (v) f.check(); else f.uncheck(); }
                  else if (e.kind === 'radio') { if (v) f.select(v); else f.clear(); }
                  else if (e.kind === 'dropdown' || e.kind === 'optionlist') { if (v.length) f.select(e.multi ? v : v[0]); else f.clear(); }
                });
                f2.acroForm.dict.set(L.PDFName.of('NeedAppearances'), L.PDFBool.True);
                bytes = await out.save({ updateFieldAppearances: false });
                note = U.note('Some answers use characters outside the built-in PDF font, so your PDF app will draw them when it opens the file.');
              }
              result.done((flatten.input.checked ? 'Filled and flattened ' : 'Filled ') + K.plural(entries.length, 'field'), bytes,
                K.baseName(ctx.file.name) + (flatten.input.checked ? '-flattened.pdf' : '-filled.pdf'), 'Download Filled PDF', note);
            } catch (err) { result.fail(err); }
          }));

          ctx.body.append(
            U.panel('Form fields', rows),
            U.panel(null, flatten, U.btnrow(saveBtn,
              U.button('Download field report (JSON)', function () { U.saveText(K.baseName(ctx.file.name) + '-fields.json', JSON.stringify(report(), null, 2), 'application/json'); }),
              U.button('Reset answers', function () { entries.forEach(function (e) { e.set(e.original); }); result.replaceChildren(); }, 'ghost')), result));
        }
      });
    }
  });
  /* ========================================================================
     Extract Images from PDF
     JPEG (DCTDecode) and JPEG 2000 streams are saved exactly as stored.
     Everything else is decoded here (Flate/LZW/RunLength/ASCII filters, PNG
     and TIFF predictors, grey/RGB/CMYK/indexed colour, 1-16 bits, soft
     masks) and saved as PNG; anything unusual (CCITT, JBIG2, Lab,
     Separation…) is drawn by pdf.js on a page of exactly its pixel size.
     ======================================================================== */

  function pdfNum(L, o, dflt) { return o instanceof L.PDFNumber ? o.asNumber() : dflt; }
  function pdfName(L, o) { return o instanceof L.PDFName ? o.asString().slice(1) : ''; }

  function inflateLenient(data) {
    try { return window.pako.inflate(data); } catch (e) {
      var inf = new window.pako.Inflate();
      inf.push(data, true);
      if (inf.result && inf.result.length) return inf.result;
      var parts = inf.chunks || [], len = 0;
      parts.forEach(function (c) { len += c.length; });
      if (!len) throw e;
      var out = new Uint8Array(len), off = 0;
      parts.forEach(function (c) { out.set(c, off); off += c.length; });
      return out;
    }
  }

  function lzwDecode(data, early) {
    var out = [], dict = [], bits = 9, buf = 0, nbits = 0, prev = null, i = 0;
    function reset() { dict = []; for (var k = 0; k < 256; k++) dict[k] = [k]; dict[256] = null; dict[257] = null; bits = 9; prev = null; }
    reset();
    while (true) {
      while (nbits < bits && i < data.length) { buf = (buf << 8) | data[i++]; nbits += 8; }
      if (nbits < bits) break;
      var code = (buf >>> (nbits - bits)) & ((1 << bits) - 1);
      nbits -= bits; buf &= (1 << nbits) - 1;
      if (code === 256) { reset(); continue; }
      if (code === 257) break;
      var entry = code < dict.length && dict[code] ? dict[code] : (prev ? prev.concat(prev[0]) : null);
      if (!entry) break;
      for (var j = 0; j < entry.length; j++) out.push(entry[j]);
      if (prev) dict.push(prev.concat(entry[0]));
      prev = entry;
      if (dict.length + early >= (1 << bits) && bits < 12) bits++;
    }
    return new Uint8Array(out);
  }
  function runLengthDecode(d) {
    var out = [];
    for (var i = 0; i < d.length;) {
      var n = d[i++];
      if (n === 128) break;
      if (n < 128) { for (var k = 0; k <= n && i < d.length; k++) out.push(d[i++]); }
      else { var b = d[i++]; for (var r = 0; r < 257 - n; r++) out.push(b); }
    }
    return new Uint8Array(out);
  }
  function asciiHexDecode(d) {
    var out = [], hi = -1;
    for (var i = 0; i < d.length; i++) {
      var c = d[i];
      if (c === 62) break;
      var v = c >= 48 && c <= 57 ? c - 48 : c >= 65 && c <= 70 ? c - 55 : c >= 97 && c <= 102 ? c - 87 : -1;
      if (v < 0) continue;
      if (hi < 0) hi = v; else { out.push(hi * 16 + v); hi = -1; }
    }
    if (hi >= 0) out.push(hi * 16);
    return new Uint8Array(out);
  }
  function ascii85Decode(d) {
    var out = [], group = [];
    for (var i = 0; i < d.length; i++) {
      var c = d[i];
      if (c === 126) break;
      if (c === 122 && !group.length) { out.push(0, 0, 0, 0); continue; }
      if (c < 33 || c > 117) continue;
      group.push(c - 33);
      if (group.length === 5) {
        var v = (((group[0] * 85 + group[1]) * 85 + group[2]) * 85 + group[3]) * 85 + group[4];
        out.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255);
        group = [];
      }
    }
    if (group.length > 1) {
      var n = group.length;
      while (group.length < 5) group.push(84);
      var w = (((group[0] * 85 + group[1]) * 85 + group[2]) * 85 + group[3]) * 85 + group[4];
      var bytes = [(w >>> 24) & 255, (w >>> 16) & 255, (w >>> 8) & 255, w & 255];
      for (var k = 0; k < n - 1; k++) out.push(bytes[k]);
    }
    return new Uint8Array(out);
  }
  /* PNG (10-15) and TIFF (2) predictors. */
  function unpredict(data, parms) {
    var pred = parms.Predictor || 1;
    if (pred < 2) return data;
    var colors = parms.Colors || 1, bpc = parms.BitsPerComponent || 8, cols = parms.Columns || 1;
    var bpp = Math.max(1, Math.ceil(colors * bpc / 8)), rowLen = Math.ceil(colors * bpc * cols / 8);
    if (pred === 2) {
      var out2 = new Uint8Array(data);
      if (bpc === 8) for (var r = 0; r < out2.length; r += rowLen) for (var x = r + bpp; x < Math.min(r + rowLen, out2.length); x++) out2[x] = (out2[x] + out2[x - bpp]) & 255;
      return out2;
    }
    var rows = Math.floor(data.length / (rowLen + 1)), out = new Uint8Array(rows * rowLen), prior = new Uint8Array(rowLen);
    for (var y = 0; y < rows; y++) {
      var f = data[y * (rowLen + 1)], src = y * (rowLen + 1) + 1, dst = y * rowLen;
      for (var i = 0; i < rowLen; i++) {
        var raw = data[src + i], left = i >= bpp ? out[dst + i - bpp] : 0, up = prior[i], ul = i >= bpp ? prior[i - bpp] : 0, v;
        if (f === 1) v = raw + left;
        else if (f === 2) v = raw + up;
        else if (f === 3) v = raw + ((left + up) >> 1);
        else if (f === 4) { var pp = left + up - ul, pa = Math.abs(pp - left), pb = Math.abs(pp - up), pc = Math.abs(pp - ul); v = raw + (pa <= pb && pa <= pc ? left : pb <= pc ? up : ul); }
        else v = raw;
        out[dst + i] = v & 255;
      }
      prior = out.subarray(dst, dst + rowLen);
    }
    return out;
  }
  function parmsOf(L, p) {
    var o = {};
    if (p instanceof L.PDFDict) p.entries().forEach(function (e) { o[e[0].asString().slice(1)] = e[1] instanceof L.PDFNumber ? e[1].asNumber() : e[1]; });
    return o;
  }
  function filterList(L, dict) {
    var f = dict.lookup(L.PDFName.of('Filter')), p = dict.lookup(L.PDFName.of('DecodeParms')) || dict.lookup(L.PDFName.of('DP'));
    var names = f instanceof L.PDFArray ? f.asArray().map(function (x) { return pdfName(L, x instanceof L.PDFRef ? dict.context.lookup(x) : x); }) : f ? [pdfName(L, f)] : [];
    var parms = names.map(function (n, i) { return parmsOf(L, p instanceof L.PDFArray ? p.lookup(i) : p); });
    var alias = { AHx: 'ASCIIHexDecode', A85: 'ASCII85Decode', LZW: 'LZWDecode', Fl: 'FlateDecode', RL: 'RunLengthDecode', CCF: 'CCITTFaxDecode', DCT: 'DCTDecode' };
    return { names: names.map(function (n) { return alias[n] || n; }), parms: parms };
  }
  /* Apply the filters that come before an image codec; returns the bytes and the codec left over. */
  function decodeStream(L, stream) {
    var fl = filterList(L, stream.dict), data = stream.contents;
    for (var i = 0; i < fl.names.length; i++) {
      var n = fl.names[i], pr = fl.parms[i];
      if (n === 'FlateDecode') data = unpredict(inflateLenient(data), pr);
      else if (n === 'LZWDecode') data = unpredict(lzwDecode(data, pr.EarlyChange === 0 ? 0 : 1), pr);
      else if (n === 'RunLengthDecode') data = runLengthDecode(data);
      else if (n === 'ASCIIHexDecode') data = asciiHexDecode(data);
      else if (n === 'ASCII85Decode') data = ascii85Decode(data);
      else return { data: data, codec: n };
    }
    return { data: data, codec: '' };
  }

  /* Colour space → { kind: gray|rgb|cmyk|indexed, n, label, base, hival, table } or null. */
  function colourSpace(L, ctx, cs) {
    if (cs instanceof L.PDFRef) cs = ctx.lookup(cs);
    var name = pdfName(L, cs);
    if (name === 'DeviceGray' || name === 'CalGray' || name === 'G') return { kind: 'gray', n: 1, label: 'Grey' };
    if (name === 'DeviceRGB' || name === 'CalRGB' || name === 'RGB') return { kind: 'rgb', n: 3, label: 'RGB' };
    if (name === 'DeviceCMYK' || name === 'CMYK') return { kind: 'cmyk', n: 4, label: 'CMYK' };
    if (!(cs instanceof L.PDFArray) || !cs.size()) return null;
    var fam = pdfName(L, cs.lookup(0));
    if (fam === 'CalGray') return { kind: 'gray', n: 1, label: 'Grey' };
    if (fam === 'CalRGB') return { kind: 'rgb', n: 3, label: 'RGB' };
    if (fam === 'ICCBased') {
      var icc = cs.lookup(1), N = icc && icc.dict ? pdfNum(L, icc.dict.lookup(L.PDFName.of('N')), 0) : 0;
      var k = { 1: 'gray', 3: 'rgb', 4: 'cmyk' }[N];
      return k ? { kind: k, n: N, label: { gray: 'Grey', rgb: 'RGB', cmyk: 'CMYK' }[k] + ' (ICC)' } : null;
    }
    if (fam === 'Indexed' || fam === 'I') {
      var base = colourSpace(L, ctx, cs.get(1));
      if (!base || base.kind === 'indexed') return null;
      var hival = pdfNum(L, cs.lookup(2), 0), look = cs.lookup(3), table;
      if (look instanceof L.PDFString || look instanceof L.PDFHexString) table = look.asBytes();
      else if (look && look.dict) table = decodeStream(L, look).data;
      else return null;
      return { kind: 'indexed', n: 1, label: 'Indexed ' + base.label, base: base, hival: hival, table: table };
    }
    return null;
  }

  /* Samples → normalised component values (0..1) per pixel, honouring /Decode. */
  function sampleReader(data, w, bpc, n, decode) {
    var rowLen = Math.ceil(w * n * bpc / 8), maxv = bpc === 16 ? 255 : (1 << bpc) - 1, mask = (1 << Math.min(bpc, 8)) - 1;
    return function (x, y, c) {
      var idx = x * n + c, v;
      if (bpc === 8) v = data[y * rowLen + idx];
      else if (bpc === 16) v = data[y * rowLen + idx * 2];
      else { var bit = idx * bpc, byte = data[y * rowLen + (bit >> 3)]; v = (byte >> (8 - bpc - (bit & 7))) & mask; }
      if (v === undefined) v = 0;
      if (decode) return decode[c * 2] + v * (decode[c * 2 + 1] - decode[c * 2]) / maxv;
      return v;
    };
  }
  function cmykToRgb(c, m, y, k) { return [255 * (1 - c) * (1 - k), 255 * (1 - m) * (1 - k), 255 * (1 - y) * (1 - k)]; }

  function decodeArray(L, dict) {
    var d = dict.lookup(L.PDFName.of('Decode'));
    return d instanceof L.PDFArray ? d.asArray().map(function (x) { return pdfNum(L, x, 0); }) : null;
  }

  /* Decode one image stream to RGBA, or return null if it needs pdf.js. */
  function decodeToRgba(L, ctx, stream, w, h) {
    var dict = stream.dict, dec = decodeStream(L, stream);
    if (dec.codec) return null;
    var bpc = pdfNum(L, dict.lookup(L.PDFName.of('BitsPerComponent')), 8);
    var isMask = dict.lookup(L.PDFName.of('ImageMask')) === L.PDFBool.True;
    var out = new Uint8ClampedArray(w * h * 4), decode = decodeArray(L, dict), x, y, o;
    if (isMask) {
      var mr = sampleReader(dec.data, w, 1, 1, null), inv = decode && decode[0] === 1;
      for (y = 0, o = 0; y < h; y++) for (x = 0; x < w; x++, o += 4) { var paint = (mr(x, y, 0) === 0) !== !!inv; out[o + 3] = paint ? 255 : 0; }
      return out;
    }
    var cs = colourSpace(L, ctx, dict.get(L.PDFName.of('ColorSpace')));
    if (!cs || [1, 2, 4, 8, 16].indexOf(bpc) < 0) return null;
    if (dec.data.length < Math.ceil(w * cs.n * bpc / 8) * h * 0.5) return null;
    var maxv = bpc === 16 ? 255 : (1 << bpc) - 1;
    var norm = cs.kind === 'indexed' ? null : decode || null;
    var rd = sampleReader(dec.data, w, bpc, cs.n, norm);
    var ck = dict.lookup(L.PDFName.of('Mask')), keyRanges = ck instanceof L.PDFArray ? ck.asArray().map(function (v) { return pdfNum(L, v, 0); }) : null;
    var raw = keyRanges ? sampleReader(dec.data, w, bpc, cs.n, null) : null;
    for (y = 0, o = 0; y < h; y++) {
      for (x = 0; x < w; x++, o += 4) {
        var rgb;
        if (cs.kind === 'indexed') {
          var idx = decode ? Math.round(decode[0] + rd(x, y, 0) * (decode[1] - decode[0]) / maxv) : rd(x, y, 0);
          idx = Math.max(0, Math.min(cs.hival, idx));
          var bn = cs.base.n, t = cs.table, q = idx * bn;
          rgb = cs.base.kind === 'gray' ? [t[q], t[q], t[q]] : cs.base.kind === 'rgb' ? [t[q], t[q + 1], t[q + 2]] : cmykToRgb(t[q] / 255, t[q + 1] / 255, t[q + 2] / 255, t[q + 3] / 255);
        } else {
          var f = function (c) { var v = rd(x, y, c); return norm ? v : v / maxv; };
          rgb = cs.kind === 'gray' ? [f(0) * 255, f(0) * 255, f(0) * 255] : cs.kind === 'rgb' ? [f(0) * 255, f(1) * 255, f(2) * 255] : cmykToRgb(f(0), f(1), f(2), f(3));
        }
        out[o] = rgb[0]; out[o + 1] = rgb[1]; out[o + 2] = rgb[2]; out[o + 3] = 255;
        if (keyRanges) {
          var inside = true;
          for (var c = 0; c < cs.n && inside; c++) { var sv = raw(x, y, c); inside = sv >= keyRanges[c * 2] && sv <= keyRanges[c * 2 + 1]; }
          if (inside) out[o + 3] = 0;
        }
      }
    }
    /* Soft mask, or an explicit stencil mask, becomes the alpha channel. */
    var sm = dict.lookup(L.PDFName.of('SMask')), mk = ck && ck.dict ? ck : null;
    var maskStream = sm && sm.dict ? sm : mk;
    if (maskStream) {
      var mw = pdfNum(L, maskStream.dict.lookup(L.PDFName.of('Width')), 0), mh = pdfNum(L, maskStream.dict.lookup(L.PDFName.of('Height')), 0);
      var alpha = mw && mh ? decodeToRgba(L, ctx, maskStream, mw, mh) : null;
      if (alpha) {
        var stencil = maskStream === mk;
        for (y = 0, o = 0; y < h; y++) {
          var my = Math.min(mh - 1, Math.floor(y * mh / h));
          for (x = 0; x < w; x++, o += 4) {
            var mo = (my * mw + Math.min(mw - 1, Math.floor(x * mw / w))) * 4;
            out[o + 3] = stencil ? alpha[mo + 3] : alpha[mo];
          }
        }
      }
    }
    return out;
  }

  /* Let pdf.js draw one image XObject on a page exactly its pixel size. */
  async function rasteriseWithPdfjs(L, doc, ref, w, h) {
    var tmp = await L.PDFDocument.create();
    var copied = L.PDFObjectCopier.for(doc.context, tmp.context).copy(ref);
    var k = Math.min(1, 8000 / Math.max(w, h)), pw = Math.max(1, Math.round(w * k)), ph = Math.max(1, Math.round(h * k));
    var page = tmp.addPage([pw, ph]);
    var name = page.node.newXObject('Im', copied);
    page.pushOperators(L.pushGraphicsState(), L.concatTransformationMatrix(pw, 0, 0, ph, 0, 0), L.drawObject(name), L.popGraphicsState());
    var pdf = await K.openPdfjs(await tmp.save());
    try {
      var p = await pdf.getPage(1), vp = p.getViewport({ scale: 1 });
      var c = el('canvas'); c.width = pw; c.height = ph;
      await p.render({ canvasContext: c.getContext('2d'), viewport: vp, background: 'rgba(0,0,0,0)' }).promise;
      return c;
    } finally { K.closePdf(pdf); }
  }

  /* Every image XObject in the file, with the pages that draw it. */
  function collectImages(L, doc) {
    var ctx = doc.context, N = function (n) { return L.PDFName.of(n); };
    var found = new Map(), masks = new Set();
    ctx.enumerateIndirectObjects().forEach(function (pair) {
      var obj = pair[1];
      if (!(obj instanceof L.PDFRawStream) || obj.dict.lookup(N('Subtype')) !== N('Image')) return;
      found.set(pair[0].tag, { ref: pair[0], stream: obj, pages: [] });
      [N('SMask'), N('Mask')].forEach(function (k) { var m = obj.dict.get(k); if (m instanceof L.PDFRef) masks.add(m.tag); });
    });
    doc.getPages().forEach(function (page, i) {
      var seen = new Set();
      (function walk(res) {
        if (!(res instanceof L.PDFDict)) return;
        var xo = res.lookup(N('XObject'));
        if (!(xo instanceof L.PDFDict)) return;
        xo.entries().forEach(function (e) {
          var ref = e[1];
          if (!(ref instanceof L.PDFRef) || seen.has(ref.tag)) return;
          seen.add(ref.tag);
          var t = ctx.lookup(ref);
          if (!t || !t.dict) return;
          var st = t.dict.lookup(N('Subtype'));
          if (st === N('Image')) { var f = found.get(ref.tag); if (f && f.pages.indexOf(i + 1) < 0) f.pages.push(i + 1); }
          else if (st === N('Form')) walk(t.dict.lookup(N('Resources')));
        });
      })(page.node.Resources());
    });
    var list = [];
    found.forEach(function (f, tag) { if (!masks.has(tag) || f.pages.length) list.push(f); });
    list.sort(function (a, b) { return (a.pages[0] || 1e9) - (b.pages[0] || 1e9); });
    return list;
  }

  Tools.register({
    id: 'pdf-extract-images', category: 'pdf', name: 'Extract Images from PDF',
    description: 'List every picture inside a PDF and save them, JPEGs exactly as stored and the rest as PNG, singly or all in a ZIP.',
    keywords: ['extract images', 'pdf images', 'save pictures from pdf', 'pdf to jpg', 'get photos out of pdf', 'image extractor', 'embedded images', 'zip'],
    render: function (root) {
      root.classList.add('g-pdfb');
      var urls = [];
      U.onTeardown(root, function () { urls.forEach(function (u) { URL.revokeObjectURL(u); }); });
      K.singlePdf(root, {
        onLoad: async function (ctx) {
          var L = await K.libPdf();
          await U.script('assets/vendor/pako/pako.min.js');
          var doc = await K.openPdfLib(ctx.bytes), base = K.baseName(ctx.file.name);
          var found = collectImages(L, doc);
          ctx.info.append(ctx.file.name, el('span', { class: 'muted', text: K.plural(doc.getPageCount(), 'page') + ' · ' + K.plural(found.length, 'image') }));
          if (!found.length) { ctx.body.append(U.panel(null, U.note('No embedded images found. Scanned text drawn as vector shapes, or tiny inline images, are not listed.'))); return; }
          var perPage = {};
          var items = found.map(function (f) {
            var d = f.stream.dict, fl = filterList(L, d).names, last = fl[fl.length - 1] || '';
            var w = pdfNum(L, d.lookup(L.PDFName.of('Width')), 0), h = pdfNum(L, d.lookup(L.PDFName.of('Height')), 0);
            var isMask = d.lookup(L.PDFName.of('ImageMask')) === L.PDFBool.True;
            var cs = isMask ? { label: 'Mask (1-bit)' } : colourSpace(L, doc.context, d.get(L.PDFName.of('ColorSpace')));
            var kind = last === 'DCTDecode' ? 'jpg' : last === 'JPXDecode' ? 'jp2' : 'png';
            var pg = f.pages[0], n = pg ? (perPage[pg] = (perPage[pg] || 0) + 1) : 0;
            return {
              ref: f.ref, stream: f.stream, pages: f.pages, w: w, h: h, kind: kind,
              format: kind === 'jpg' ? 'JPEG (as stored)' : kind === 'jp2' ? 'JPEG 2000 (as stored)' : 'PNG (from ' + (last ? last.replace('Decode', '') + ' ' : 'raw ') + 'data)',
              colour: cs ? cs.label : (d.get(L.PDFName.of('ColorSpace')) ? 'Special colour' : ''),
              name: base + (pg ? '-page' + pg + '-' + String(n).padStart(2, '0') : '-image' + String(found.indexOf(f) + 1).padStart(2, '0')) + '.' + kind,
              blob: null
            };
          });
          async function blobOf(it) {
            if (it.blob) return it.blob;
            if (it.kind !== 'png') {
              var raw = decodeStream(L, it.stream).data;
              it.blob = new Blob([raw], { type: it.kind === 'jpg' ? 'image/jpeg' : 'image/jp2' });
              return it.blob;
            }
            var canvas = null, rgba = null;
            try { rgba = decodeToRgba(L, doc.context, it.stream, it.w, it.h); } catch (e) { rgba = null; }
            if (rgba) {
              canvas = el('canvas'); canvas.width = it.w; canvas.height = it.h;
              canvas.getContext('2d').putImageData(new ImageData(rgba, it.w, it.h), 0, 0);
            } else {
              canvas = await rasteriseWithPdfjs(L, doc, it.ref, it.w, it.h);
              it.format = 'PNG (drawn by pdf.js)';
              if (it.metaEl) it.metaEl.textContent = metaText(it);
            }
            it.blob = new Blob([await K.canvasBytes(canvas, 'image/png')], { type: 'image/png' });
            return it.blob;
          }

          var minSize = U.input({ type: 'number', value: '32', min: '0', step: '1', 'aria-label': 'Minimum size in pixels' });
          var grid = el('div', { class: 'g-imgs' });
          var countNote = el('span', { class: 'note', dataset: { k: 'count' } });
          var progress = U.progress();
          var zipBtn = U.button('Download all (ZIP)', null, 'primary');
          function metaText(it) { return it.w + ' × ' + it.h + ' px · ' + it.format + (it.colour ? ' · ' + it.colour : ''); }
          function visible() { var m = numVal(minSize, 0); return items.filter(function (it) { return it.w >= m && it.h >= m; }); }
          function draw() {
            var vis = visible();
            countNote.textContent = K.plural(vis.length, 'image') + (vis.length < items.length ? ' shown · ' + (items.length - vis.length) + ' smaller than the minimum hidden' : '');
            grid.replaceChildren.apply(grid, items.map(function (it) {
              var img = el('img', { alt: it.name });
              if (it.url) img.src = it.url;
              it.img = img;
              var card = el('div', { class: 'g-imgcard', dataset: { name: it.name } },
                el('div', { class: 'g-imgthumb' }, it.kind === 'jp2' ? U.note('No preview for JPEG 2000') : img),
                el('b', { class: 'name', text: it.name }),
                el('span', { class: 'note', text: (it.pages.length ? 'Page ' + it.pages.join(', ') : 'Not drawn on a page') }),
                it.metaEl = el('span', { class: 'note', text: metaText(it) }),
                U.btnrow(U.button('Download', async function () {
                  try { U.saveBlob(it.name, await blobOf(it)); } catch (e) { U.toast(e.message || String(e), 'err'); }
                })));
              card.style.display = vis.indexOf(it) > -1 ? '' : 'none';
              return card;
            }));
          }
          minSize.addEventListener('input', draw);
          zipBtn.addEventListener('click', K.runBusy(zipBtn, async function () {
            var vis = visible();
            if (!vis.length) return U.toast('No images match the size filter', 'err');
            try {
              await U.script('assets/vendor/jszip/jszip.min.js');
              var zip = new window.JSZip();
              for (var i = 0; i < vis.length; i++) {
                progress.set('Adding ' + vis[i].name + '…', i / vis.length);
                zip.file(vis[i].name, await blobOf(vis[i]));
              }
              U.saveBlob(base + '-images.zip', await zip.generateAsync({ type: 'blob' }));
              progress.done('Saved ' + K.plural(vis.length, 'image') + ' in a ZIP.');
            } catch (e) { progress.fail(e); }
          }));
          ctx.body.append(U.panel(null, el('div', { class: 'g-bar' }, field('Skip images smaller than (px)', minSize), zipBtn, countNote), progress),
            U.panel(null, grid));
          draw();
          /* Thumbnails, one at a time in the background. */
          for (var i = 0; i < items.length; i++) {
            if (!root.isConnected) break;
            var it = items[i];
            if (it.kind === 'jp2') continue;
            try {
              var b = await blobOf(it);
              it.url = URL.createObjectURL(b); urls.push(it.url);
              if (it.img) it.img.src = it.url;
            } catch (e) { /* the card still offers a download attempt */ }
          }
        }
      });
    }
  });
  /* ========================================================================
     Compare PDFs
     ======================================================================== */

  var DIFF_TOLERANCE = 60;   /* summed RGB difference below this counts as the same (anti-aliasing) */

  async function renderForCompare(pdf, n, scale) {
    if (!pdf || n > pdf.numPages) return null;
    var page = await pdf.getPage(n);
    var vp = page.getViewport({ scale: scale });
    var c = el('canvas'); c.width = Math.max(1, Math.round(vp.width)); c.height = Math.max(1, Math.round(vp.height));
    var x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: x, viewport: vp }).promise;
    page.cleanup();
    return c;
  }

  /* Pixel difference of two renders (either may be missing). */
  function pixelDiff(a, b) {
    var W = Math.max(a ? a.width : 0, b ? b.width : 0), H = Math.max(a ? a.height : 0, b ? b.height : 0);
    function data(c) {
      var t = el('canvas'); t.width = W; t.height = H;
      var x = t.getContext('2d', { willReadFrequently: true });
      x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
      if (c) x.drawImage(c, 0, 0);
      return x.getImageData(0, 0, W, H).data;
    }
    var da = data(a), db = data(b), mask = new Uint8Array(W * H), count = 0, box = null;
    for (var i = 0, p = 0; p < W * H; p++, i += 4) {
      var outside = !a || !b || (p % W) >= Math.min(a.width, b.width) || Math.floor(p / W) >= Math.min(a.height, b.height);
      var d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
      if (d > DIFF_TOLERANCE || (outside && d > 0) || (outside && (!a || !b))) {
        mask[p] = 1; count++;
        var x = p % W, y = Math.floor(p / W);
        if (!box) box = [x, y, x, y];
        else { if (x < box[0]) box[0] = x; if (x > box[2]) box[2] = x; if (y < box[1]) box[1] = y; if (y > box[3]) box[3] = y; }
      }
    }
    return { W: W, H: H, mask: mask, count: count, box: box, base: db, other: da };
  }

  Tools.register({
    id: 'pdf-compare', category: 'pdf', name: 'Compare PDFs',
    description: 'Find what changed between two versions of a PDF: a page-by-page text comparison, and a visual overlay that marks changed pixels in red.',
    keywords: ['compare pdf', 'pdf diff', 'difference', 'changes', 'versions', 'redline', 'what changed', 'visual diff', 'overlay', 'text comparison'],
    render: function (root) {
      root.classList.add('g-pdfb', 'g-pdf');
      var docs = [null, null], alive = true;
      U.onTeardown(root, function () { alive = false; docs.forEach(function (d) { if (d) K.closePdf(d.pdf); }); });
      var work = el('div', { class: 'stack' });

      function slot(i, title) {
        var info = el('div', { class: 'g-file-line', dataset: { k: 'file-' + (i ? 'b' : 'a') } }), status = U.note('');
        var zone = U.dropzone({ accept: 'application/pdf,.pdf', label: title, hint: i ? 'The newer version' : 'The older version',
          onFiles: async function (files) {
            var f = files[0];
            if (!K.isPdf(f)) { status.className = 'note err'; status.textContent = f.name + ' is not a PDF.'; return; }
            try {
              status.className = 'note'; status.textContent = 'Reading ' + f.name + '…';
              var bytes = new Uint8Array(await U.readAs(f));
              var pdf = await K.openPdfjs(bytes);
              var texts = [];
              for (var n = 1; n <= pdf.numPages; n++) {
                var page = await pdf.getPage(n);
                texts.push(await K.pageText(page));
                page.cleanup();
              }
              if (docs[i]) K.closePdf(docs[i].pdf);
              docs[i] = { file: f, pdf: pdf, texts: texts };
              info.replaceChildren(el('span', { text: f.name }), el('span', { class: 'muted', text: K.plural(pdf.numPages, 'page') }));
              status.textContent = '';
              build();
            } catch (err) { status.className = 'note err'; status.textContent = err.message || String(err); }
          } });
        return U.panel(null, zone, info, status);
      }

      var ignoreWs = U.checkbox('Ignore spacing', { checked: true });
      var ignoreCase = U.checkbox('Ignore capitals');
      var modeChips = U.chips([{ value: 'text', label: 'Text' }, { value: 'visual', label: 'Visual' }], showMode, 'text');
      var textBox = el('div', { class: 'stack' }), visualBox = el('div', { class: 'stack' });
      var reportText = '';
      [ignoreWs, ignoreCase].forEach(function (c) { c.input.addEventListener('change', compareText); });

      function showMode(v) {
        textBox.style.display = v === 'text' ? '' : 'none';
        visualBox.style.display = v === 'visual' ? '' : 'none';
        if (v === 'visual' && !visualBox.childElementCount) buildVisual();
      }

      function build() {
        if (!docs[0] || !docs[1]) return;
        visualBox.replaceChildren();
        setKids(work, U.panel(null, modeChips), textBox, visualBox);
        compareText();
        showMode(modeChips.value);
      }

      /* --- text ----------------------------------------------------------------- */
      function compareText() {
        var A = docs[0].texts, B = docs[1].texts, n = Math.max(A.length, B.length);
        var opts = { ignoreWhitespace: ignoreWs.input.checked, ignoreCase: ignoreCase.input.checked };
        var changed = [], added = [], removed = [], blocks = [], report = [], totals = { add: 0, del: 0 };
        for (var i = 0; i < n; i++) {
          var a = i < A.length ? A[i] : null, b = i < B.length ? B[i] : null, ops;
          if (a === null) { added.push(i + 1); ops = window.Diff.lines('', b, opts).filter(function (o) { return o.type !== 'del' || o.text; }); }
          else if (b === null) { removed.push(i + 1); ops = window.Diff.lines(a, '', opts).filter(function (o) { return o.type !== 'add' || o.text; }); }
          else ops = window.Diff.lines(a, b, opts);
          var sum = window.Diff.summarise(ops);
          if (!sum.add && !sum.del) continue;
          if (a !== null && b !== null) changed.push(i + 1);
          totals.add += sum.add; totals.del += sum.del;
          report.push(window.Diff.unified(ops, docs[0].file.name + ' page ' + (i + 1), docs[1].file.name + ' page ' + (i + 1), 2));
          blocks.push(diffBlock(i + 1, ops, sum, a === null ? 'Only in the new PDF' : b === null ? 'Only in the old PDF' : ''));
        }
        reportText = report.join('\n');
        var summary = el('div', { class: 'stack' },
          U.stats([
            { label: 'changed pages', value: String(changed.length) },
            { label: 'lines added', value: String(totals.add) },
            { label: 'lines removed', value: String(totals.del) },
            { label: 'pages old → new', value: A.length + ' → ' + B.length }]),
          el('p', { class: 'note', dataset: { k: 'summary' }, text: !blocks.length ? 'The text of both PDFs is the same.' : [
            changed.length ? 'Changed pages: ' + changed.join(', ') + '.' : '',
            added.length ? 'Pages only in the new PDF: ' + added.join(', ') + '.' : '',
            removed.length ? 'Pages only in the old PDF: ' + removed.join(', ') + '.' : ''].filter(Boolean).join(' ') }),
          el('span', { hidden: true, dataset: { k: 'changed-pages' }, text: changed.join(',') }));
        setKids(textBox, U.panel('Text comparison', U.row(ignoreWs, ignoreCase), summary,
          blocks.length ? U.btnrow(U.copyBtn('Copy report', function () { return reportText; }),
            U.button('Download report (.diff)', function () { U.saveText('comparison.diff', reportText, 'text/x-diff'); }, 'ghost')) : null),
          blocks.length ? U.panel(null, blocks) : null,
          U.note('Only the text layer is compared. Scanned pages have no text: use Visual.'));
      }
      function diffBlock(pageNo, ops, sum, tag) {
        var keep = ops.map(function (o, i) {
          if (o.type !== 'same') return true;
          for (var k = Math.max(0, i - 2); k <= Math.min(ops.length - 1, i + 2); k++) if (ops[k].type !== 'same') return true;
          return false;
        });
        var lines = [], skipped = 0;
        ops.forEach(function (o, i) {
          if (!keep[i]) { skipped++; return; }
          if (skipped) { lines.push(el('span', { class: 'diffline', style: { color: 'var(--fg-muted)' }, text: '⋯ ' + skipped + ' unchanged line' + (skipped === 1 ? '' : 's') })); skipped = 0; }
          lines.push(el('span', { class: 'diffline' + (o.type === 'add' ? ' add' : o.type === 'del' ? ' del' : ''), text: (o.type === 'add' ? '+ ' : o.type === 'del' ? '− ' : '  ') + o.text }));
        });
        if (skipped) lines.push(el('span', { class: 'diffline', style: { color: 'var(--fg-muted)' }, text: '⋯ ' + skipped + ' unchanged line' + (skipped === 1 ? '' : 's') }));
        return el('details', { open: true, class: 'g-diffpage', dataset: { page: String(pageNo) } },
          el('summary', { text: 'Page ' + pageNo + (tag ? ' (' + tag + ')' : '') + ': ' + K.plural(sum.add, 'line') + ' added, ' + sum.del + ' removed' }),
          el('pre', { class: 'out' }, lines));
      }

      /* --- visual ----------------------------------------------------------------- */
      function buildVisual() {
        var max = Math.max(docs[0].pdf.numPages, docs[1].pdf.numPages);
        var pageIn = U.input({ type: 'number', value: '1', min: '1', max: String(max), 'aria-label': 'Page to compare', style: { width: '90px' } });
        var view = U.chips([{ value: 'overlay', label: 'Changes in red' }, { value: 'side', label: 'Side by side' }, { value: 'swipe', label: 'Slider' }], layout, 'overlay');
        var slider = el('input', { type: 'range', min: '0', max: '100', value: '50', 'aria-label': 'Slide between old and new' });
        var stage = el('div', { class: 'g-cmpstage' }), stats = el('div', { class: 'stack' }), scan = el('div', { class: 'stack' });
        var cur = null;
        slider.addEventListener('input', function () { if (cur && cur.top) cur.top.style.clipPath = 'inset(0 0 0 ' + slider.value + '%)'; });
        function layout() {
          if (!cur) return;
          slider.parentNode.style.display = view.value === 'swipe' ? '' : 'none';
          if (view.value === 'overlay') stage.replaceChildren(cur.overlay);
          else if (view.value === 'side') stage.replaceChildren(el('div', { class: 'g-side' },
            el('figure', {}, cur.a || U.note('No such page'), el('figcaption', { class: 'note', text: 'Old: ' + docs[0].file.name })),
            el('figure', {}, cur.b || U.note('No such page'), el('figcaption', { class: 'note', text: 'New: ' + docs[1].file.name }))));
          else {
            var under = cur.a ? cur.a.cloneNode() : el('canvas'), over = cur.b ? cur.b.cloneNode() : el('canvas');
            if (cur.a) under.getContext('2d').drawImage(cur.a, 0, 0);
            if (cur.b) over.getContext('2d').drawImage(cur.b, 0, 0);
            over.className = 'top';
            over.style.clipPath = 'inset(0 0 0 ' + slider.value + '%)';
            cur.top = over;
            stage.replaceChildren(el('div', { class: 'g-swipe' }, under, over));
          }
        }
        async function show() {
          var n = Math.max(1, Math.min(max, Math.round(numVal(pageIn, 1))));
          pageIn.value = String(n);
          stats.replaceChildren(U.note('Rendering page ' + n + '…'));
          var scale = Math.min(2, Math.max(1, (window.devicePixelRatio || 1) * 1.25));
          var a = await renderForCompare(docs[0].pdf, n, scale), b = await renderForCompare(docs[1].pdf, n, scale);
          if (!alive) return;
          var d = pixelDiff(a, b);
          var ov = el('canvas'); ov.width = d.W; ov.height = d.H;
          var x = ov.getContext('2d'), img = x.createImageData(d.W, d.H), px = img.data;
          for (var p = 0, i = 0; p < d.W * d.H; p++, i += 4) {
            if (d.mask[p]) { px[i] = 230; px[i + 1] = 0; px[i + 2] = 0; px[i + 3] = 255; }
            else { var g = (d.base[i] + d.base[i + 1] + d.base[i + 2]) / 3; px[i] = px[i + 1] = px[i + 2] = Math.round(255 - (255 - g) * 0.35); px[i + 3] = 255; }
          }
          x.putImageData(img, 0, 0);
          cur = { a: a, b: b, overlay: ov };
          var pct = d.count / Math.max(1, d.W * d.H) * 100;
          stats.replaceChildren(
            el('p', { class: 'note' + (d.count ? ' err' : ' ok'), dataset: { k: 'visual' }, text: !a || !b ? 'Page ' + n + ' exists in only one of the PDFs.' :
              d.count ? 'Page ' + n + ': ' + d.count.toLocaleString('en-GB') + ' pixels differ (' + pct.toFixed(2) + '% of the page).' : 'Page ' + n + ' looks identical.' }),
            el('span', { hidden: true, dataset: { k: 'diff-pixels' }, text: String(d.count) }),
            d.box ? el('span', { hidden: true, dataset: { k: 'diff-box' }, text: d.box.map(function (v) { return (v / scale).toFixed(1); }).join(',') }) : null);
          layout();
        }
        var scanBtn = U.button('Find pages that look different', null, 'ghost');
        scanBtn.addEventListener('click', K.runBusy(scanBtn, async function () {
          var bar = U.progress(), found = [];
          scan.replaceChildren(bar);
          for (var n = 1; n <= max && alive; n++) {
            bar.set('Checking page ' + n + ' of ' + max + '…', (n - 1) / max);
            var d = pixelDiff(await renderForCompare(docs[0].pdf, n, 0.6), await renderForCompare(docs[1].pdf, n, 0.6));
            if (d.count > 4) found.push(n);
          }
          scan.replaceChildren(el('p', { class: 'note', dataset: { k: 'visual-changed' }, text: found.length ? 'Pages that look different: ' + found.join(', ') + '.' : 'Every page looks the same.' }),
            found.length ? el('div', { class: 'g-bar' }, found.map(function (n) { return U.button('Page ' + n, function () { pageIn.value = String(n); show(); }, 'ghost'); })) : null);
        }));
        pageIn.addEventListener('change', show);
        setKids(visualBox, U.panel('Visual comparison',
          el('div', { class: 'g-bar' },
            U.button('◀', function () { pageIn.value = String(Math.max(1, numVal(pageIn, 1) - 1)); show(); }, 'ghost'),
            field('Page', pageIn),
            U.button('▶', function () { pageIn.value = String(Math.min(max, numVal(pageIn, 1) + 1)); show(); }, 'ghost'),
            view, scanBtn),
          el('div', { class: 'field', style: { display: 'none' } }, el('label', { text: 'Old ◀ ▶ New' }), slider),
          stats, stage, scan,
          U.note('Changed pixels are red over a faded copy of the new page. Both pages are drawn at the same scale, so moved or reflowed content shows up too.')));
        show();
      }

      root.appendChild(U.split(slot(0, 'Old PDF'), slot(1, 'New PDF')));
      root.appendChild(work);
    }
  });
})();
