(function () {
  'use strict';
  const EVG = window.EVG; const h = EVG.h;
  const newEntry = () => ({ id: EVG.uid(), word: '', clue: '' });
  const blank = () => ({ entries: [newEntry(), newEntry(), newEntry(), newEntry()], allowReveal: true, layout: null });

  function validate(c) {
    if (!c.layout) return ['Generate the crossword before saving (press “Generate crossword”).'];
    const errs = EVG.validateCrossword(c.layout);
    const have = new Map(c.layout.placed.map((p) => [p.entryId, p]));
    const active = c.entries.filter((x) => x.word.trim());
    active.forEach((e) => {
      const p = have.get(e.id);
      if (!p) errs.push('“' + e.word + '” is not in the puzzle. Press “Generate crossword” again.');
      else if (p.word !== EVG.lettersOnly(e.word)) errs.push('The puzzle is out of date for “' + e.word + '”. Press “Generate crossword” again.');
    });
    if (c.layout.placed.length !== active.length) errs.push('The puzzle does not match the word list. Press “Generate crossword” again.');
    return errs;
  }

  function buildCells(layout) {
    const grid = Array.from({ length: layout.rows }, () => Array(layout.cols).fill(null));
    layout.placed.forEach((p) => {
      for (let i = 0; i < p.word.length; i++) {
        const r = p.row + (p.dir === 'down' ? i : 0), c = p.col + (p.dir === 'across' ? i : 0);
        const cell = grid[r][c] || { ch: p.word[i], entries: [] };
        cell.entries.push(p.entryId); if (i === 0) cell.num = p.number; grid[r][c] = cell;
      }
    });
    return grid;
  }

  function clueLists(layout, onPick, activeId) {
    const col = (dir) => layout.placed.filter((p) => p.dir === dir).sort((a, b) => a.number - b.number);
    const host = h('div', { class: 'grid grid-2 clues' });
    ['across', 'down'].forEach((d) => host.appendChild(h('div', null, h('h4', null, d.charAt(0).toUpperCase() + d.slice(1)),
      h('ol', null, col(d).map((p) => h('li', null, h('button', { type: 'button', 'data-entry': p.entryId, class: 'clue-btn' + (activeId === p.entryId ? ' active' : ''), disabled: !onPick, onclick: () => onPick && onPick(p.entryId) }, h('b', null, p.number + '. '), p.clue)))))));
    return host;
  }

  function staticGrid(layout) {
    const cells = buildCells(layout);
    const el = h('div', { class: 'cw-static', style: { gridTemplateColumns: 'repeat(' + layout.cols + ', 1.75rem)' } });
    cells.forEach((row) => row.forEach((c) => el.appendChild(c ? h('div', { class: 'cw-cell' }, c.num ? h('span', { class: 'cw-num' }, c.num) : null, c.ch) : h('div', { class: 'cw-block' }))));
    return el;
  }

  function editor(ctx) {
    const c = ctx.content; const vocab = ctx.vocab(); let errors = [];
    const rowsHost = h('div', { class: 'stack tight' }); const msgHost = h('div', { class: 'stack tight' }); const previewHost = h('div');
    const active = () => c.entries.filter((e) => e.word.trim());

    function drawRows() {
      EVG.replace(rowsHost, c.entries.map((e, i) => h('div', { class: 'row-card scr-row' },
        h('input', { class: 'input', placeholder: 'Word', value: e.word, 'aria-label': 'Word ' + (i + 1), oninput: (ev) => { e.word = ev.target.value; ctx.changed(); drawMessages(); } }),
        h('input', { class: 'input', placeholder: 'Clue', value: e.clue, 'aria-label': 'Clue ' + (i + 1), oninput: (ev) => {
          e.clue = ev.target.value; ctx.changed();
          // editing a clue never needs a new layout: keep the generated puzzle's clues in sync
          if (c.layout) { const p = c.layout.placed.find((x) => x.entryId === e.id); if (p) { p.clue = e.clue; drawPreview(); } }
        } }),
        EVG.button('ghost', 'trash', null, () => { c.entries.splice(i, 1); ctx.changed(); drawRows(); drawMessages(); }, { 'aria-label': 'Remove word ' + (i + 1), class: 'icon-only' }))));
    }
    function isStale() { return !!c.layout && validate(c).length > 0; }
    function drawMessages() {
      EVG.replace(msgHost, [EVG.errorList(errors), isStale() && !errors.length ? h('p', { class: 'note warn' }, 'The word list changed after the puzzle was generated. Press “Generate crossword” to update it.') : null]);
    }
    function drawPreview() {
      if (!c.layout) { EVG.replace(previewHost, h('div', { class: 'placeholder' }, 'The generated crossword will appear here. Every word must share a letter with another word.')); return; }
      EVG.replace(previewHost, h('div', { class: 'stack tight' }, h('span', { class: 'label nomb' }, 'Preview (solution)'), h('div', { class: 'scroll-x' }, staticGrid(c.layout)), clueLists(c.layout)));
    }
    function generate() {
      const r = EVG.generateCrossword(active().map((e) => ({ id: e.id, word: e.word, clue: e.clue })));
      errors = r.errors; c.layout = r.ok ? r.layout : null;
      ctx.changed(); drawMessages(); drawPreview(); genBtn.lastChild.textContent = c.layout ? 'Regenerate crossword' : 'Generate crossword';
    }
    const genBtn = EVG.button('primary', 'refresh', c.layout ? 'Regenerate crossword' : 'Generate crossword', generate);
    drawRows(); drawMessages(); drawPreview();
    return h('div', { class: 'split' },
      h('div', { class: 'stack' },
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: c.allowReveal, onchange: (e) => { c.allowReveal = e.target.checked; ctx.changed(); } }), 'Allow “Reveal letter / word” buttons'),
        rowsHost,
        h('div', { class: 'row wrap' }, EVG.button('soft', 'plus', 'Add word', () => { c.entries.push(newEntry()); ctx.changed(); drawRows(); }),
          vocab ? EVG.button('ghost', 'plus', 'Add words from “' + vocab.name + '”', () => {
            const have = new Set(c.entries.map((e) => EVG.lettersOnly(e.word)));
            const add = vocab.entries.filter((e) => EVG.lettersOnly(e.word).length >= 2 && !have.has(EVG.lettersOnly(e.word))).map((e) => ({ id: EVG.uid(), word: e.word, clue: e.definition || e.translation || '' }));
            c.entries = c.entries.filter((e) => e.word.trim() || e.clue.trim()).concat(add); ctx.changed(); drawRows(); drawMessages();
          }) : null),
        msgHost, h('div', null, genBtn)),
      previewHost);
  }

  function player(game) {
    const layout = game.content.layout; const allowReveal = game.content.allowReveal;
    const cells = buildCells(layout); const byId = new Map(layout.placed.map((p) => [p.entryId, p]));
    const vals = {}; let checked = false, msg = null;
    const first = layout.placed.slice().sort((a, b) => a.number - b.number)[0];
    let sel = { r: first.row, c: first.col, dir: first.dir };
    const root = h('div', { class: 'game stack' });
    const clueBar = h('div', { class: 'card clue-bar', 'data-testid': 'active-clue', 'aria-live': 'polite' });
    const msgHost = h('div'); const doneHost = h('div'); const counter = h('p', { class: 'hint center-text' });
    const cellEls = {};
    const gridEl = h('div', { class: 'cw-grid', 'data-testid': 'cw-grid', style: { gridTemplateColumns: 'repeat(' + layout.cols + ', minmax(1.6rem, 2.4rem))' } });
    const input = h('input', { class: 'sr-only', 'aria-label': 'Crossword input', autocapitalize: 'characters', autocomplete: 'off', value: '' });
    let cluesHost = h('div');

    cells.forEach((row, r) => row.forEach((cell, c) => {
      if (!cell) { gridEl.appendChild(h('div', { class: 'cw-block' })); return; }
      const k = r + ',' + c;
      const el = h('button', { type: 'button', class: 'cw-cell', 'data-cell': k, 'aria-label': 'Row ' + (r + 1) + ', column ' + (c + 1) + (cell.num ? ', clue ' + cell.num : ''), onclick: () => select(r, c) },
        cell.num ? h('span', { class: 'cw-num' }, cell.num) : null, h('span', { class: 'cw-val', 'data-testid': 'val-' + k }));
      cellEls[k] = el; gridEl.appendChild(el);
    }));

    const cellAt = (r, c) => (cells[r] && cells[r][c]) || null;
    function activeEntryId() {
      const cell = cellAt(sel.r, sel.c); if (!cell) return null;
      const ids = cell.entries.filter((id) => byId.get(id).dir === sel.dir); return ids[0] || cell.entries[0];
    }
    const cellsOf = (id) => { const p = byId.get(id); return Array.from({ length: p.word.length }, (_, i) => ({ r: p.row + (p.dir === 'down' ? i : 0), c: p.col + (p.dir === 'across' ? i : 0) })); };
    const total = cells.reduce((n, row) => n + row.filter(Boolean).length, 0);
    const isSolved = () => cells.every((row, r) => row.every((c, k) => !c || vals[r + ',' + k] === c.ch));

    function paint() {
      const id = activeEntryId(); const act = id ? byId.get(id) : null;
      const activeSet = new Set((id ? cellsOf(id) : []).map((p) => p.r + ',' + p.c));
      let filled = 0;
      Object.keys(cellEls).forEach((k) => {
        const [r, c] = k.split(',').map(Number); const cell = cells[r][c]; const v = vals[k] || ''; if (v) filled++;
        const bad = checked && v && v !== cell.ch, good = checked && v && v === cell.ch;
        cellEls[k].className = 'cw-cell' + (sel.r === r && sel.c === c ? ' sel' : activeSet.has(k) ? ' act' : '') + (bad ? ' bad' : '') + (good ? ' good' : '');
        cellEls[k].querySelector('.cw-val').textContent = v;
      });
      EVG.replace(clueBar, act ? [h('span', { class: 'chip brand' }, act.number + ' ' + act.dir), h('span', { class: 'clue-text' }, act.clue), game.difficulty === 'Hard' ? null : h('span', { class: 'muted ml-auto' }, '(' + act.word.length + ')')] : null);
      counter.textContent = filled + '/' + total + ' letters · tap a square twice to switch direction';
      cluesHost.querySelectorAll('.clue-btn').forEach((b) => b.classList.toggle('active', b.getAttribute('data-entry') === id));
      EVG.replace(msgHost, msg ? EVG.feedback('info', msg) : null);
      EVG.clear(doneHost);
      if (isSolved()) doneHost.appendChild(EVG.completionCard({ message: 'You solved the crossword!', onRestart: () => { Object.keys(vals).forEach((k) => delete vals[k]); checked = false; msg = null; paint(); } }));
    }
    function select(r, c) {
      const cell = cellAt(r, c); if (!cell) return; msg = null;
      if (sel.r === r && sel.c === c) {
        const other = sel.dir === 'across' ? 'down' : 'across';
        if (cell.entries.some((id) => byId.get(id).dir === other)) sel = { r: r, c: c, dir: other };
      } else {
        const dirs = cell.entries.map((id) => byId.get(id).dir);
        sel = { r: r, c: c, dir: dirs.includes(sel.dir) ? sel.dir : dirs[0] };
      }
      paint(); input.focus({ preventScroll: true });
    }
    const step = (dir, r, c, d) => { const nr = r + (dir === 'down' ? d : 0), nc = c + (dir === 'across' ? d : 0); return cellAt(nr, nc) ? { r: nr, c: nc } : null; };
    function type(ch) {
      checked = false; vals[sel.r + ',' + sel.c] = ch;
      const n = step(sel.dir, sel.r, sel.c, 1); if (n) sel = { r: n.r, c: n.c, dir: sel.dir };
      paint();
    }
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        e.preventDefault(); checked = false; const k = sel.r + ',' + sel.c;
        if (vals[k]) vals[k] = ''; else { const p = step(sel.dir, sel.r, sel.c, -1); if (p) { vals[p.r + ',' + p.c] = ''; sel = { r: p.r, c: p.c, dir: sel.dir }; } }
        paint();
      } else if (e.key.indexOf('Arrow') === 0) {
        e.preventDefault(); const dir = e.key === 'ArrowLeft' || e.key === 'ArrowRight' ? 'across' : 'down'; const d = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
        const n = step(dir, sel.r, sel.c, d); sel = n ? { r: n.r, c: n.c, dir: dir } : { r: sel.r, c: sel.c, dir: dir }; paint();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const order = layout.placed.slice().sort((a, b) => a.number - b.number || (a.dir === 'across' ? -1 : 1));
        const i = order.findIndex((p) => p.entryId === activeEntryId());
        const nxt = order[(i + (e.shiftKey ? order.length - 1 : 1)) % order.length]; sel = { r: nxt.row, c: nxt.col, dir: nxt.dir }; paint();
      } else if (/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.metaKey) { e.preventDefault(); type(e.key.toUpperCase()); }
    });
    // virtual keyboards (Android) often send "Unidentified" keys: handle plain text input too
    input.addEventListener('input', () => { const t = input.value; input.value = ''; (t.match(/[a-zA-Z]/g) || []).forEach((ch) => type(ch.toUpperCase())); });

    const revealLetter = () => { const c = cellAt(sel.r, sel.c); if (c) { vals[sel.r + ',' + sel.c] = c.ch; checked = false; paint(); } };
    const revealWord = () => { const id = activeEntryId(); if (!id) return; cellsOf(id).forEach((p) => { vals[p.r + ',' + p.c] = cells[p.r][p.c].ch; }); checked = false; paint(); };
    function check() {
      checked = true; let wrong = 0;
      Object.keys(vals).forEach((k) => { const [r, c] = k.split(',').map(Number); if (vals[k] && cells[r][c] && vals[k] !== cells[r][c].ch) wrong++; });
      msg = isSolved() ? null : wrong ? wrong + ' letter' + (wrong > 1 ? 's are' : ' is') + ' not right yet (marked in red).' : 'All the letters you have typed so far are correct. Keep going!';
      paint();
    }

    cluesHost = clueLists(layout, (id) => { const p = byId.get(id); sel = { r: p.row, c: p.col, dir: p.dir }; paint(); input.focus({ preventScroll: true }); });
    root.append(clueBar,
      h('div', { class: 'cw-layout' },
        h('div', { class: 'stack center-items' }, input, h('div', { class: 'scroll-x' }, gridEl),
          h('div', { class: 'row center wrap' }, EVG.button('primary', 'check', 'Check', check),
            allowReveal ? EVG.button('soft', 'type', 'Reveal letter', revealLetter) : null, allowReveal ? EVG.button('soft', 'eye', 'Reveal word', revealWord) : null), counter),
        cluesHost),
      msgHost, doneHost);
    paint(); return root;
  }

  EVG.registerGame({
    type: 'crossword', label: 'Crossword', blurb: 'Solve an auto-generated crossword from clues.',
    defaultInstructions: 'Click a square, read the clue, and type the answer. Click the same square again to switch between across and down.',
    blank: blank, validate: validate, editor: editor, player: player,
    fromVocab: function (list, current) {
      const entries = list.entries.filter((e) => EVG.lettersOnly(e.word).length >= 2 && (e.definition || e.translation)).slice(0, 12).map((e) => ({ id: EVG.uid(), word: e.word, clue: e.definition || e.translation }));
      return { content: Object.assign({}, current, { entries: entries, layout: null }), message: 'Loaded ' + entries.length + ' words with clues. Press “Generate crossword”.' };
    },
  });
})();
