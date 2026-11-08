(function () {
  'use strict';
  const EVG = window.EVG; const h = EVG.h;
  const SIZES = ['small', 'medium', 'large'];
  const DIRS = [['horizontal', 'Horizontal'], ['vertical', 'Vertical'], ['diagonal', 'Diagonal'], ['backwards', 'Backwards']];

  const blank = () => ({ words: [], size: 'medium', directions: { horizontal: true, vertical: true, diagonal: false, backwards: false }, grid: [], placements: [] });

  function validate(c) {
    if (!c.grid.length) return ['Generate the puzzle before saving (press “Generate puzzle”).'];
    const errs = EVG.validateWordSearch(c.grid, c.placements, c.words);
    const have = new Set(c.placements.map((p) => p.word));
    c.words.map(EVG.lettersOnly).filter(Boolean).forEach((w) => { if (!have.has(w)) errs.push('The puzzle is out of date: “' + w + '” is not in the grid. Press “Generate puzzle” again.'); });
    const wanted = new Set(c.words.map(EVG.lettersOnly));
    c.placements.forEach((p) => { if (!wanted.has(p.word)) errs.push('The puzzle is out of date: “' + p.word + '” was removed from the list. Press “Generate puzzle” again.'); });
    return errs;
  }

  function gridView(grid, highlight) {
    return h('div', { class: 'ws-static', style: { gridTemplateColumns: 'repeat(' + grid.length + ', 1fr)' } },
      grid.map((row, r) => row.map((ch, c) => h('div', { class: 'ws-cell' + (highlight && highlight.has(r + ',' + c) ? ' hl' : '') }, ch))));
  }

  function editor(ctx) {
    const c = ctx.content; const vocab = ctx.vocab();
    let errors = [], showSolution = false;
    const textarea = h('textarea', { class: 'input mono', rows: 8, placeholder: 'apple\nbanana\ncherry', 'aria-label': 'Word list', value: c.words.join('\n'),
      oninput: () => { updateStale(); } });
    const words = () => textarea.value.split(/[\n,]/).map((w) => w.trim()).filter(Boolean);
    const msgHost = h('div', { class: 'stack tight' }); const previewHost = h('div');
    const unique = (arr) => Array.from(new Set(arr.map(EVG.lettersOnly).filter(Boolean))).sort();

    function updateStale() { c.words = words(); ctx.changed(); drawMessages(); }
    function drawMessages() {
      const stale = c.grid.length > 0 && JSON.stringify(unique(words())) !== JSON.stringify(c.placements.map((p) => p.word).sort());
      EVG.replace(msgHost, [EVG.errorList(errors), stale ? h('p', { class: 'note warn' }, 'The word list changed after the puzzle was generated. Press “Generate puzzle” to update it.') : null]);
    }
    function drawPreview() {
      if (!c.grid.length) { EVG.replace(previewHost, h('div', { class: 'placeholder' }, 'The generated puzzle will appear here.')); return; }
      const hl = new Set(); c.placements.forEach((p) => { for (let i = 0; i < p.word.length; i++) hl.add((p.row + p.dr * i) + ',' + (p.col + p.dc * i)); });
      EVG.replace(previewHost, h('div', { class: 'stack tight' }, h('div', { class: 'row between' }, h('span', { class: 'label nomb' }, 'Preview'),
        h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: showSolution, onchange: (e) => { showSolution = e.target.checked; drawPreview(); } }), 'Show solution')),
        h('div', { class: 'scroll-x' }, gridView(c.grid, showSolution ? hl : null))));
    }
    function generate() {
      c.words = words();
      const r = EVG.generateWordSearch(c.words, c.size, c.directions, ctx.difficulty());
      errors = r.errors;
      if (r.ok) { c.grid = r.grid; c.placements = r.placements; } else { c.grid = []; c.placements = []; }
      ctx.changed(); drawMessages(); drawPreview(); genBtn.lastChild.textContent = c.grid.length ? 'Regenerate puzzle' : 'Generate puzzle';
    }
    const genBtn = EVG.button('primary', 'refresh', c.grid.length ? 'Regenerate puzzle' : 'Generate puzzle', generate);
    const sizeBtns = h('div', { class: 'row' });
    function drawSizes() {
      EVG.replace(sizeBtns, SIZES.map((s) => h('button', { type: 'button', 'aria-pressed': String(c.size === s), class: 'pill grow' + (c.size === s ? ' active' : ''), onclick: () => { c.size = s; ctx.changed(); drawSizes(); } },
        s + ' (' + EVG.GRID_DIMENSIONS[s] + '×' + EVG.GRID_DIMENSIONS[s] + ')')));
    }
    drawSizes(); drawMessages(); drawPreview();
    return h('div', { class: 'split' },
      h('div', { class: 'stack' },
        EVG.field('Vocabulary (one word per line)', textarea),
        vocab ? EVG.button('ghost', 'plus', 'Add all words from “' + vocab.name + '”', () => { textarea.value = Array.from(new Set(words().concat(vocab.entries.map((e) => e.word)))).join('\n'); updateStale(); }) : null,
        h('div', { class: 'grid grid-2' },
          h('div', null, h('span', { class: 'label' }, 'Grid size'), sizeBtns),
          h('div', null, h('span', { class: 'label' }, 'Directions'), h('div', { class: 'row wrap' }, DIRS.map((d) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: c.directions[d[0]], onchange: (e) => { c.directions[d[0]] = e.target.checked; ctx.changed(); } }), d[1]))))),
        msgHost, h('div', null, genBtn)),
      previewHost);
  }

  function player(game) {
    const grid = game.content.grid, placements = game.content.placements; const n = grid.length;
    let found = [], anchor = null, cur = null, flash = null, dragging = false, moved = false, tapEnd = null, origin = null;
    const root = h('div', { class: 'game stack' });
    const progressHost = h('div'); const doneHost = h('div'); const listEl = h('ul', { class: 'ws-words', 'aria-label': 'Words to find' });
    const cells = {};
    const gridEl = h('div', { class: 'ws-grid', 'data-testid': 'ws-grid', style: { gridTemplateColumns: 'repeat(' + n + ', 1fr)', touchAction: 'none' } });
    grid.forEach((row, r) => row.forEach((ch, c) => { const el = h('div', { class: 'ws-cell', 'data-r': r, 'data-c': c }, ch); cells[r + ',' + c] = el; gridEl.appendChild(el); }));
    const words = placements.map((p) => p.word).sort();
    const wordEls = {}; words.forEach((w) => { wordEls[w] = h('li', { 'data-found': 'false' }, w); listEl.appendChild(wordEls[w]); });

    const lineCells = (a, b) => {
      const dr = b.r - a.r, dc = b.c - a.c;
      if (!(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc))) return null;
      const len = Math.max(Math.abs(dr), Math.abs(dc)), sr = Math.sign(dr), sc = Math.sign(dc);
      return Array.from({ length: len + 1 }, (_, i) => ({ r: a.r + sr * i, c: a.c + sc * i }));
    };
    const same = (a, b) => a.r === b.r && a.c === b.c;
    const cellAt = (x, y) => { const el = document.elementFromPoint(x, y); const t = el && el.closest ? el.closest('[data-r]') : null; return t ? { r: Number(t.dataset.r), c: Number(t.dataset.c) } : null; };

    function paint() {
      const foundCells = new Set();
      placements.forEach((p) => { if (found.includes(p.word)) for (let i = 0; i < p.word.length; i++) foundCells.add((p.row + p.dr * i) + ',' + (p.col + p.dc * i)); });
      const path = anchor ? (cur && lineCells(anchor, cur)) || [anchor] : [];
      const pathSet = new Set(path.map((p) => p.r + ',' + p.c));
      Object.keys(cells).forEach((k) => { cells[k].className = 'ws-cell' + (foundCells.has(k) ? ' found' : pathSet.has(k) ? ' path' : flash && flash.has(k) ? ' flash' : ''); });
      words.forEach((w) => { const f = found.includes(w); wordEls[w].className = f ? 'done' : ''; wordEls[w].setAttribute('data-found', String(f)); });
      EVG.replace(progressHost, EVG.progressBar(found.length, placements.length, 'Words found'));
      EVG.clear(doneHost);
      if (found.length === placements.length) doneHost.appendChild(EVG.completionCard({ message: 'You found every word!', stats: [{ label: 'Words', value: placements.length }], onRestart: () => { found = []; anchor = null; cur = null; paint(); } }));
    }
    function finish(a, b) {
      const cs = lineCells(a, b); if (!cs || cs.length < 2) return;
      const str = cs.map((p) => grid[p.r][p.c]).join(''); const rev = str.split('').reverse().join('');
      const hit = placements.find((p) => !found.includes(p.word) && (p.word === str || p.word === rev));
      if (hit) found.push(hit.word); else { flash = new Set(cs.map((p) => p.r + ',' + p.c)); setTimeout(() => { flash = null; paint(); }, 350); }
    }
    gridEl.addEventListener('pointerdown', (e) => {
      const cell = cellAt(e.clientX, e.clientY); if (!cell) return;
      e.preventDefault(); dragging = true; moved = false; origin = cell;
      if (anchor && !same(anchor, cell)) { tapEnd = cell; return; }   // second tap — or the start of a new drag (decided on move/up)
      tapEnd = null; anchor = cell; cur = cell; paint();
    });
    gridEl.addEventListener('pointermove', (e) => {
      if (!dragging) return; const cell = cellAt(e.clientX, e.clientY); if (!cell) return;
      if (tapEnd) { if (origin && !same(cell, origin)) { tapEnd = null; moved = true; anchor = origin; cur = cell; paint(); } return; }
      if (anchor && !same(cell, anchor)) moved = true;
      cur = cell; paint();
    });
    const up = (e) => {
      if (!dragging) return; dragging = false;
      if (tapEnd && anchor) { finish(anchor, tapEnd); tapEnd = null; anchor = null; cur = null; paint(); return; }
      const cell = cellAt(e.clientX, e.clientY) || cur;
      if (anchor && cell && moved && !same(cell, anchor)) { finish(anchor, cell); anchor = null; cur = null; }
      paint();   // otherwise: a tap on the first letter — keep the anchor so the next tap completes the selection
    };
    gridEl.addEventListener('pointerup', up);
    gridEl.addEventListener('pointercancel', () => { dragging = false; });

    root.append(progressHost,
      h('div', { class: 'ws-layout' }, h('div', { class: 'ws-grid-wrap' }, gridEl), listEl),
      h('p', { class: 'center-text hint' }, 'Drag across the letters, or tap the first and last letter of a word.'), doneHost);
    paint(); return root;
  }

  EVG.registerGame({
    type: 'word-search', label: 'Word Search', blurb: 'Find the hidden words in a letter grid.',
    defaultInstructions: 'Find all the words hidden in the grid. Words can be written in different directions.',
    blank: blank, validate: validate, editor: editor, player: player,
    fromVocab: function (list, current) {
      const n = EVG.GRID_DIMENSIONS[current.size];
      const words = list.entries.map((e) => e.word.trim()).filter((w) => { const l = EVG.lettersOnly(w); return l.length >= 3 && l.length <= n; }).slice(0, 14);
      return { content: Object.assign({}, current, { words: words, grid: [], placements: [] }), message: 'Loaded ' + words.length + ' words that fit the grid. Press “Generate puzzle”.' };
    },
  });
})();
