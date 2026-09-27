/* science-b tools: a weighted grade calculator, the score you need on a
   final exam, and a US-style GPA calculator. They sit beside the UK degree
   classification calculator (science.js) in the merged "Grade, GPA & Degree
   Calculator", so they follow its look: rows of inputs in a grid, a big
   result, then cards and a table. Letter grades use the common US scale
   (A 93+, A− 90+, B+ 87+ and so on). */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-grade-style')) {
    document.head.appendChild(el('style', { id: 'g-grade-style', text: [
      '.g-grade .scroll{overflow-x:auto;max-width:100%}',
      '.g-grade .gr-big{font-size:1.9rem;font-weight:700;font-family:var(--mono);word-break:break-word;margin:4px 0}',
      '.g-grade .gr-mid{font-size:1.2rem;font-weight:600;font-family:var(--mono);word-break:break-word}',
      '.g-grade .gr-muted{color:var(--fg-muted);font-size:.9rem}',
      '.g-grade .gr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:10px 0}',
      '.g-grade .gr-card{background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px}',
      '.g-grade .gr-card b{display:block;font-family:var(--mono);font-size:1.1rem;word-break:break-word}',
      '.g-grade .gr-card span{color:var(--fg-muted);font-size:.85rem}',
      '.g-grade .gr-ok{color:var(--ok);font-weight:700}',
      '.g-grade .gr-err{color:var(--err);font-weight:700}',
      '.g-grade .note.warn{color:var(--warn)}',
      '.g-grade .row>.field{flex:1 1 170px}',
      '.g-grade .gr-rows{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}',
      '.g-grade .gr-row{display:grid;gap:6px;align-items:center}',
      '.g-grade .gr-row input,.g-grade .gr-row select{min-width:0}',
      '.g-grade .gr-head{font-size:12px;color:var(--fg-muted);font-weight:600}',
      '.g-grade .gr-wrow{grid-template-columns:minmax(0,1fr) 84px 72px 84px auto}',
      '.g-grade .gr-grow{grid-template-columns:minmax(0,1fr) 72px 84px 150px auto}',
      '@media (max-width:560px){',
      /* On a phone the name and the remove button share the first line and
         the numbers get the whole second line. */
      '  .g-grade .gr-wrow{grid-template-columns:repeat(3,minmax(0,1fr)) auto}',
      '  .g-grade .gr-grow{grid-template-columns:52px minmax(0,1fr) minmax(0,1.25fr) auto}',
      '  .g-grade .gr-row>:nth-child(1){grid-column:1/4;grid-row:1}',
      '  .g-grade .gr-row>:nth-child(5){grid-column:4;grid-row:1}',
      '  .g-grade .gr-row>:nth-child(2){grid-column:1;grid-row:2}',
      '  .g-grade .gr-row>:nth-child(3){grid-column:2;grid-row:2}',
      '  .g-grade .gr-row>:nth-child(4){grid-column:3/5;grid-row:2}',
      '  .g-grade .gr-head>:nth-child(1),.g-grade .gr-head>:nth-child(5){display:none}',
      '  .g-grade .gr-head>*{grid-row:1!important}',
      '  .g-grade .gr-row select{padding-left:6px;padding-right:2px}',
      '  .g-grade .gr-row:not(.gr-head)+.gr-row{border-top:1px solid var(--border);padding-top:6px}',
      '}'
    ].join('\n') }));
  }

  /* ---- helpers ------------------------------------------------------------ */
  function prep(root) { root.classList.add('g-grade'); return root; }
  function num(v) {
    var s = String(v === undefined || v === null ? '' : v).trim().replace(/,/g, '').replace(/−/g, '-');
    if (s === '') return NaN;
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  }
  function numIn(label, value, attrs) {
    var input = el('input', Object.assign({ type: 'number', step: 'any' }, attrs || {}));
    input.value = value === undefined || value === null ? '' : String(value);
    var wrap = U.field(label, input);
    wrap.input = input;
    return wrap;
  }
  function val(w) { return num((w.input || w).value); }
  function card(label, value, key) {
    return el('div', { class: 'gr-card' }, el('span', { text: label }), el('b', { text: value, dataset: key ? { k: key } : undefined }));
  }
  function store(key, value) {
    try {
      if (value === undefined) { var s = localStorage.getItem('att:' + key); return s ? JSON.parse(s) : null; }
      localStorage.setItem('att:' + key, JSON.stringify(value));
    } catch (e) { /* private mode or storage full: the tool still works */ }
    return null;
  }
  /* replaceChildren would print a null as text, so drop the gaps first. */
  function fill(node) { node.replaceChildren.apply(node, Array.prototype.slice.call(arguments, 1).filter(function (k) { return k !== null && k !== undefined && k !== false; })); }
  function trim(n, d) { return String(parseFloat(n.toFixed(d === undefined ? 2 : d))); }
  function pct(n) { return n.toFixed(2) + '%'; }
  function removeBtn(label, fn) {
    var b = U.button('✕', fn, 'ghost');
    b.setAttribute('aria-label', 'Remove ' + label);
    b.title = 'Remove';
    return b;
  }

  /* The usual US letter scale, with plus and minus bands. The letter comes
     from the percentage as shown (two decimal places), so 89.996% reads as
     90.00% and an A−. */
  var LETTERS = [[97, 'A+'], [93, 'A'], [90, 'A−'], [87, 'B+'], [83, 'B'], [80, 'B−'], [77, 'C+'], [73, 'C'], [70, 'C−'], [67, 'D+'], [63, 'D'], [60, 'D−']];
  function letterFor(p) {
    var r = Math.round(p * 100) / 100;
    for (var i = 0; i < LETTERS.length; i++) if (r >= LETTERS[i][0]) return LETTERS[i][1];
    return 'F';
  }
  var SCALE_NOTE = 'Letter grades use the common US scale: A+ 97, A 93, A− 90, B+ 87, B 83, B− 80, C+ 77, C 73, C− 70, D+ 67, D 63, D− 60, F below 60. Schools vary, so check your syllabus.';

  /* ======================================================================= */
  /* Weighted Grade Calculator                                               */
  /* ======================================================================= */

  /* Each item scores a percentage (score alone, or score out of a total) and
     carries a weight. Unmarked items (no score) are left out of the average,
     so the average is Σ(weight × %) ÷ Σ(marked weight): weights that do not
     add up to 100 are scaled to do so. In points mode a blank weight takes
     the item's "out of", which gives the plain points-earned ÷ points-possible
     grade. */
  function weightedCalc(state) {
    var pts = state.mode === 'points';
    var items = state.rows.map(function (r) {
      var s = num(r.score), o = num(r.out), w = num(r.weight);
      if (pts && isNaN(w) && o > 0) w = o;
      return { name: String(r.name || '').trim() || 'Untitled', w: w > 0 ? w : 0, p: isNaN(s) ? NaN : (o > 0 ? s / o * 100 : s) };
    });
    var total = 0, marked = 0, earned = 0;
    items.forEach(function (it) {
      total += it.w;
      if (!isNaN(it.p) && it.w > 0) { marked += it.w; earned += it.w * it.p; }
    });
    return { items: items, total: total, marked: marked, earned: earned, avg: marked ? earned / marked : NaN, pts: pts };
  }

  function weightedDefaults() {
    return { mode: 'percent', rows: [
      { name: 'Homework', score: '92', out: '', weight: '20' },
      { name: 'Quizzes', score: '18', out: '20', weight: '15' },
      { name: 'Midterm exam', score: '78', out: '', weight: '25' },
      { name: 'Project', score: '88', out: '', weight: '15' },
      { name: 'Final exam', score: '', out: '', weight: '25' }
    ] };
  }

  Tools.register({
    id: 'weighted-grade', category: 'science', name: 'Weighted Grade Calculator',
    description: 'Work out your weighted average and letter grade from assignments, quizzes and exams, each with its own weight.',
    keywords: ['grade calculator', 'weighted grade', 'weighted grade calculator', 'weighted average', 'weighted mean', 'class grade', 'course grade',
      'what is my grade', 'current grade', 'grade average', 'assignment weights', 'category weights', 'syllabus weights', 'letter grade',
      'percentage grade', 'points grade', 'homework', 'quiz', 'midterm', 'marks', 'student', 'school', 'college', 'university'],
    render: function (root) {
      prep(root);
      var KEY = 'weighted-grade';
      var saved = store(KEY);
      var state = saved && Array.isArray(saved.rows) ? saved : weightedDefaults();
      var mode = U.select({ label: 'Weights are', value: state.mode, options: [
        { value: 'percent', label: 'Percentages of the final grade' },
        { value: 'points', label: 'Points (each item is worth so many points)' }
      ] });
      var list = el('div', { class: 'gr-rows', dataset: { k: 'rows' } }), out = el('div');
      function save() { store(KEY, state); }

      function row(r, i) {
        var pts = state.mode === 'points';
        var name = el('input', { type: 'text', value: r.name || '', placeholder: 'Item name', 'aria-label': 'Item name', dataset: { f: 'name' } });
        var sc = el('input', { type: 'number', value: r.score, min: 0, step: 'any', placeholder: 'not marked', 'aria-label': 'Score', dataset: { f: 'score' } });
        var ou = el('input', { type: 'number', value: r.out, min: 0, step: 'any', placeholder: '%', 'aria-label': 'Out of (leave blank for a percentage)', dataset: { f: 'out' } });
        var wt = el('input', { type: 'number', value: r.weight, min: 0, step: 'any', placeholder: pts ? 'out of' : 'weight', 'aria-label': pts ? 'Points' : 'Weight (%)', dataset: { f: 'weight' } });
        [name, sc, ou, wt].forEach(function (inp) {
          inp.addEventListener('input', function () { r.name = name.value; r.score = sc.value; r.out = ou.value; r.weight = wt.value; save(); calc(); });
        });
        return el('div', { class: 'gr-row gr-wrow', dataset: { row: String(i + 1) } }, name, sc, ou, wt,
          removeBtn(r.name || 'item', function () { state.rows.splice(i, 1); save(); build(); calc(); }));
      }
      function build() {
        var pts = state.mode === 'points';
        fill(list, el('div', { class: 'gr-row gr-wrow gr-head' }, el('span', { text: 'Item' }), el('span', { text: 'Score' }),
          el('span', { text: 'Out of' }), el('span', { text: pts ? 'Points' : 'Weight %' }), el('span')));
        state.rows.forEach(function (r, i) { list.appendChild(row(r, i)); });
      }

      function calc() {
        out.replaceChildren();
        var r = weightedCalc(state);
        if (!r.total) { out.appendChild(U.note('Give at least one item a weight.', 'err')); return; }
        if (!r.marked) { out.appendChild(U.note('Enter a score for at least one item to see your average.')); return; }
        var share = r.marked / r.total * 100;
        out.append(
          el('div', { class: 'gr-muted', text: r.marked < r.total ? 'Weighted average of the work marked so far' : 'Weighted average' }),
          el('div', { class: 'gr-big', text: pct(r.avg), dataset: { k: 'average' } }),
          el('div', { class: 'gr-mid' }, 'Letter grade ', el('span', { text: letterFor(r.avg), dataset: { k: 'letter' } })),
          el('div', { class: 'gr-grid' },
            card(r.pts ? 'Points marked so far' : 'Share of the grade marked', r.pts ? trim(r.marked) + ' of ' + trim(r.total) : trim(share) + '%', 'marked'),
            card('Overall if nothing else scores', pct(r.earned / r.total), 'banked')));
        if (!r.pts && Math.abs(r.total - 100) > 1e-9) {
          out.appendChild(el('p', { class: 'note warn', dataset: { k: 'normalised' },
            text: 'Your weights add up to ' + trim(r.total) + '%, not 100%, so they have been scaled to make 100% (each weight divided by ' + trim(r.total) + ' and multiplied by 100). Check the syllabus if that is not what you meant.' }));
        }
        if (r.marked < r.total) {
          out.appendChild(U.note('The average covers only the marked work. Type an expected score into the blank rows to see where you would end up, or use the Final exam tab to see the score you need.'));
        }
        var rows = r.items.filter(function (it) { return it.w > 0; }).map(function (it) {
          var marked = !isNaN(it.p);
          return [it.name, marked ? pct(it.p) : 'Not marked', trim(it.w / r.total * 100) + '%', marked ? trim(it.w * it.p / r.total) : '—'];
        });
        out.append(el('h4', { text: 'Breakdown' }),
          el('div', { class: 'scroll', dataset: { k: 'breakdown' } }, U.table(['Item', 'Score', 'Share of grade', 'Points towards 100'], rows)),
          U.note(SCALE_NOTE));
      }

      mode.querySelector('select').addEventListener('change', function () { state.mode = this.value; save(); build(); calc(); });
      build(); calc();
      root.appendChild(U.panel(null, mode, list,
        U.btnrow(U.button('Add item', function () { state.rows.push({ name: '', score: '', out: '', weight: '' }); save(); build(); calc(); var ins = list.querySelectorAll('input[data-f="name"]'); if (ins.length) ins[ins.length - 1].focus(); }),
          U.button('Example', function () { state = weightedDefaults(); mode.querySelector('select').value = state.mode; save(); build(); calc(); }, 'ghost'),
          U.button('Clear all', function () { state = { mode: state.mode, rows: [{ name: '', score: '', out: '', weight: '' }] }; save(); build(); calc(); }, 'ghost')),
        U.note('Score is a percentage, or points when you fill in "Out of" (18 out of 20 is 90%). Leave the score blank for work not marked yet. Everything stays in this browser.')));
      root.appendChild(U.panel('Result', out));
    }
  });

  /* ======================================================================= */
  /* Final Exam Grade Calculator                                             */
  /* ======================================================================= */

  /* overall = current × (1 − w) + final × w, so
     final needed = (target − current × (1 − w)) ÷ w. Worked in percentages
     of 100 throughout to keep the arithmetic exact for whole numbers. */
  function finalNeeded(current, weight, target) { return (target * 100 - current * (100 - weight)) / weight; }
  function finalOverall(current, weight, score) { return (current * (100 - weight) + score * weight) / 100; }

  Tools.register({
    id: 'final-grade', category: 'science', name: 'Final Exam Grade Calculator',
    description: 'Find the score you need on your final exam to reach the grade you want, or the overall grade a given final score would give you.',
    keywords: ['final grade calculator', 'final exam calculator', 'what do i need on my final', 'what do i need to get on my final', 'grade needed',
      'score needed', 'final exam', 'exam weight', 'final weight', 'grade calculator', 'pass the class', 'target grade', 'required score',
      'will i pass', 'what grade do i need', 'finals', 'letter grade', 'student'],
    render: function (root) {
      prep(root);
      var current = numIn('Current grade (%)', 84, { min: 0, dataset: { f: 'current' } });
      var weight = numIn('Final exam weight (%)', 25, { min: 0, max: 100, dataset: { f: 'weight' } });
      var target = numIn('Grade you want (%)', 85, { min: 0, dataset: { f: 'target' } });
      var score = numIn('If I score this on the final (%)', 75, { min: 0, dataset: { f: 'score' } });
      var out = el('div'), rev = el('div');

      function inputs() {
        var c = val(current), w = val(weight);
        if (isNaN(c) || c < 0) return { err: 'Enter your current grade as a percentage.' };
        if (!(w > 0) || w > 100) return { err: 'The final exam weight must be more than 0% and no more than 100%.' };
        return { c: c, w: w };
      }
      function run() {
        out.replaceChildren(); rev.replaceChildren();
        var v = inputs();
        if (v.err) { out.appendChild(U.note(v.err, 'err')); rev.appendChild(U.note(v.err, 'err')); return; }
        var best = finalOverall(v.c, v.w, 100), worst = finalOverall(v.c, v.w, 0);

        var t = val(target);
        if (isNaN(t)) out.appendChild(U.note('Enter the overall grade you want.', 'err'));
        else {
          var need = finalNeeded(v.c, v.w, t);
          out.appendChild(el('div', { class: 'gr-muted', text: 'Score you need on the final to finish on ' + trim(t) + '%' }));
          if (need > 100) {
            out.append(el('div', { class: 'gr-big gr-err', text: pct(need), dataset: { k: 'needed' } }),
              el('p', { class: 'note err', dataset: { k: 'status' }, text: 'Not possible: you would need ' + pct(need) + ' on the final, more than full marks. The best you can finish on is ' + pct(best) + ' (' + letterFor(best) + '), with 100% on the final, unless there is extra credit.' }));
          } else if (need <= 0) {
            out.append(el('div', { class: 'gr-big gr-ok', text: 'Already secured', dataset: { k: 'needed' } }),
              el('p', { class: 'note ok', dataset: { k: 'status' }, text: 'Even 0% on the final leaves you on ' + pct(worst) + ' (' + letterFor(worst) + '), so ' + trim(t) + '% is already yours.' }));
          } else {
            out.append(el('div', { class: 'gr-big', text: pct(need), dataset: { k: 'needed' } }),
              el('p', { class: 'note', dataset: { k: 'status' }, text: 'Score ' + pct(need) + ' or more on the final to finish on at least ' + trim(t) + '% (' + letterFor(t) + ').' }));
          }
        }
        out.appendChild(el('div', { class: 'gr-grid' },
          card('With 100% on the final', pct(best), 'best'),
          card('With 0% on the final', pct(worst), 'worst')));
        var rows = [['A', 90], ['B', 80], ['C', 70], ['D', 60]].map(function (g) {
          var n = finalNeeded(v.c, v.w, g[1]);
          return [g[0] + ' (' + g[1] + '%)', n > 100 ? 'Not possible (needs ' + pct(n) + ')' : n <= 0 ? 'Already secured' : pct(n)];
        });
        out.append(el('h4', { text: 'Score needed on the final for each letter grade' }),
          el('div', { class: 'scroll', dataset: { k: 'letters' } }, U.table(['To finish with', 'Score needed on the final'], rows)));

        var s = val(score);
        if (isNaN(s)) rev.appendChild(U.note('Enter a final exam score.', 'err'));
        else {
          var overall = finalOverall(v.c, v.w, s);
          rev.append(el('div', { class: 'gr-muted', text: 'Your overall grade with ' + trim(s) + '% on the final' }),
            el('div', { class: 'gr-big', text: pct(overall), dataset: { k: 'overall' } }),
            el('div', { class: 'gr-mid' }, 'Letter grade ', el('span', { text: letterFor(overall), dataset: { k: 'overall-letter' } })));
        }
      }

      U.live([current, weight, target, score], run);
      root.appendChild(U.panel(null, U.row(current, weight, target),
        U.note('Your current grade is your grade before the final. The weight is how much of the overall grade the final counts for, from the syllabus.')));
      root.appendChild(U.panel('What you need on the final', out));
      root.appendChild(U.panel('What if', score, rev, U.note(SCALE_NOTE)));
    }
  });

  /* ======================================================================= */
  /* GPA Calculator                                                          */
  /* ======================================================================= */

  /* Grade points on the usual 4.0 scale. A+ is 4.0 at most schools and 4.3
     at some. Honours adds 0.5 and AP or IB adds 1.0, to any passing grade
     (an F stays at 0). */
  var GRADES = [['A+', 40], ['A', 40], ['A−', 37], ['B+', 33], ['B', 30], ['B−', 27], ['C+', 23], ['C', 20], ['C−', 17], ['D+', 13], ['D', 10], ['D−', 7], ['F', 0]];
  var KINDS = [{ value: 'std', label: 'Standard', bonus: 0 }, { value: 'hon', label: 'Honours (+0.5)', bonus: 5 }, { value: 'ap', label: 'AP or IB (+1.0)', bonus: 10 }];
  /* Grade points in tenths, so sums of whole-tenth grades stay exact. */
  function tenths(grade, scale) {
    if (grade === 'A+' && scale === '4.3') return 43;
    for (var i = 0; i < GRADES.length; i++) if (GRADES[i][0] === grade) return GRADES[i][1];
    return NaN;
  }
  function gpaCalc(state) {
    var cr = 0, plain = 0, weighted = 0, anyBonus = false;
    state.rows.forEach(function (r) {
      var c = num(r.credits), g = tenths(r.grade, state.scale);
      if (!(c > 0) || isNaN(g)) return;
      var bonus = g > 0 ? (KINDS.filter(function (k) { return k.value === r.kind; })[0] || KINDS[0]).bonus : 0;
      if (bonus) anyBonus = true;
      cr += c; plain += c * g / 10; weighted += c * (g + bonus) / 10;
    });
    var prevG = num(state.prevGpa), prevC = num(state.prevCredits);
    var hasPrev = prevG >= 0 && prevC > 0;
    var cumCr = cr + (hasPrev ? prevC : 0);
    var cumPts = weighted + (hasPrev ? prevG * prevC : 0);
    return {
      credits: cr, plain: cr ? plain / cr : NaN, term: cr ? weighted / cr : NaN, points: weighted, anyBonus: anyBonus,
      hasPrev: hasPrev, cumCredits: cumCr, cum: cumCr ? cumPts / cumCr : NaN
    };
  }
  function gpaDefaults(scale) {
    return { scale: scale || '4.0', prevGpa: '3.2', prevCredits: '30', rows: [
      { name: 'English', credits: '3', grade: 'A−', kind: 'std' },
      { name: 'Calculus', credits: '4', grade: 'B+', kind: 'std' },
      { name: 'Chemistry', credits: '4', grade: 'A', kind: 'hon' },
      { name: 'History', credits: '3', grade: 'B', kind: 'std' }
    ] };
  }

  Tools.register({
    id: 'gpa-calculator', category: 'science', name: 'GPA Calculator',
    description: 'Work out your term and cumulative GPA on the 4.0 scale from each course’s credits and letter grade, with optional honours and AP weighting.',
    keywords: ['gpa', 'gpa calculator', 'grade point average', 'cumulative gpa', 'semester gpa', 'term gpa', 'college gpa', 'high school gpa',
      'weighted gpa', 'unweighted gpa', 'honors', 'honours', 'ap classes', 'ib', '4.0 scale', '4.3 scale', 'credits', 'credit hours',
      'quality points', 'letter grade', 'raise my gpa', 'student', 'transcript'],
    render: function (root) {
      prep(root);
      var KEY = 'gpa-calculator';
      var saved = store(KEY);
      var state = saved && Array.isArray(saved.rows) ? saved : gpaDefaults();
      var scale = U.select({ label: 'A+ counts as', value: state.scale, dataset: { f: 'scale' }, options: [
        { value: '4.0', label: '4.0 (most schools)' }, { value: '4.3', label: '4.3' }
      ] });
      var prevGpa = numIn('Previous cumulative GPA (optional)', state.prevGpa, { min: 0, max: 5, placeholder: 'e.g. 3.2', dataset: { f: 'prev-gpa' } });
      var prevCr = numIn('Credits already completed (optional)', state.prevCredits, { min: 0, placeholder: 'e.g. 30', dataset: { f: 'prev-credits' } });
      var list = el('div', { class: 'gr-rows', dataset: { k: 'courses' } }), out = el('div');
      function save() { store(KEY, state); }

      function gradeSelect(value) {
        var s = el('select', { 'aria-label': 'Grade', dataset: { f: 'grade' } },
          el('option', { value: '', text: '—' }),
          GRADES.map(function (g) {
            var p = g[0] === 'A+' && state.scale === '4.3' ? 43 : g[1];
            return el('option', { value: g[0], text: g[0] + ' (' + (p / 10).toFixed(1) + ')' });
          }));
        s.value = value || '';
        return s;
      }
      function row(r, i) {
        var name = el('input', { type: 'text', value: r.name || '', placeholder: 'Course name', 'aria-label': 'Course name', dataset: { f: 'name' } });
        var cr = el('input', { type: 'number', value: r.credits, min: 0, step: 'any', placeholder: 'credits', 'aria-label': 'Credits', dataset: { f: 'credits' } });
        var gr = gradeSelect(r.grade);
        var kind = el('select', { 'aria-label': 'Course type', dataset: { f: 'kind' } }, KINDS.map(function (k) { return el('option', { value: k.value, text: k.label }); }));
        kind.value = r.kind || 'std';
        [name, cr, gr, kind].forEach(function (inp) {
          inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', function () { r.name = name.value; r.credits = cr.value; r.grade = gr.value; r.kind = kind.value; save(); calc(); });
        });
        return el('div', { class: 'gr-row gr-grow', dataset: { row: String(i + 1) } }, name, cr, gr, kind,
          removeBtn(r.name || 'course', function () { state.rows.splice(i, 1); save(); build(); calc(); }));
      }
      function build() {
        fill(list, el('div', { class: 'gr-row gr-grow gr-head' }, el('span', { text: 'Course' }), el('span', { text: 'Credits' }),
          el('span', { text: 'Grade' }), el('span', { text: 'Type' }), el('span')));
        state.rows.forEach(function (r, i) { list.appendChild(row(r, i)); });
      }

      function calc() {
        out.replaceChildren();
        var r = gpaCalc(state);
        if (!r.credits) {
          out.appendChild(U.note('Add a course with its credits and grade to see your GPA.', r.hasPrev ? '' : 'err'));
          if (!r.hasPrev) return;
        } else {
          out.append(el('div', { class: 'gr-muted', text: r.anyBonus ? 'Term GPA (weighted)' : 'Term GPA' }),
            el('div', { class: 'gr-big', text: r.term.toFixed(2), dataset: { k: 'term' } }));
        }
        out.appendChild(el('div', { class: 'gr-grid' },
          r.credits && r.anyBonus ? card('Term GPA, unweighted', r.plain.toFixed(2), 'unweighted') : null,
          card(r.hasPrev ? 'New cumulative GPA' : 'Cumulative GPA', isNaN(r.cum) ? '—' : r.cum.toFixed(2), 'cumulative'),
          card('Credits this term', trim(r.credits), 'term-credits'),
          card('Total credits', trim(r.cumCredits), 'credits'),
          card('Quality points this term', trim(r.points), 'points')));
        if (!r.hasPrev) out.appendChild(U.note('Add your previous cumulative GPA and the credits behind it to see your new cumulative GPA. Until then it matches this term.'));
        if (r.anyBonus) out.appendChild(U.note('Weighted GPA adds 0.5 for an honours course and 1.0 for AP or IB to any passing grade. The cumulative figure uses the weighted term GPA, so enter a weighted previous GPA too. Many colleges recalculate GPA unweighted.'));
        out.appendChild(U.note('GPA = Σ(credits × grade points) ÷ Σ credits. Courses without credits or a grade are left out. Pass/fail and withdrawn courses usually do not count, so leave them out.'));
      }

      scale.querySelector('select').addEventListener('change', function () { state.scale = this.value; save(); build(); calc(); });
      prevGpa.input.addEventListener('input', function () { state.prevGpa = prevGpa.input.value; save(); calc(); });
      prevCr.input.addEventListener('input', function () { state.prevCredits = prevCr.input.value; save(); calc(); });
      build(); calc();
      root.appendChild(U.panel(null, list,
        U.btnrow(U.button('Add course', function () { state.rows.push({ name: '', credits: '3', grade: '', kind: 'std' }); save(); build(); calc(); var ins = list.querySelectorAll('input[data-f="name"]'); if (ins.length) ins[ins.length - 1].focus(); }),
          U.button('Example', function () {
            state = gpaDefaults(state.scale);
            prevGpa.input.value = state.prevGpa; prevCr.input.value = state.prevCredits;
            save(); build(); calc();
          }, 'ghost'),
          U.button('Clear all', function () {
            state = { scale: state.scale, prevGpa: '', prevCredits: '', rows: [{ name: '', credits: '3', grade: '', kind: 'std' }] };
            prevGpa.input.value = ''; prevCr.input.value = '';
            save(); build(); calc();
          }, 'ghost')),
        U.row(scale, prevGpa, prevCr),
        U.note('Everything stays in this browser.')));
      root.appendChild(U.panel('Result', out));
    }
  });
})();
