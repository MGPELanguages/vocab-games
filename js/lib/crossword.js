/* Crossword generator + independent validator. */
(function () {
  'use strict';
  const EVG = window.EVG;
  const key = (r, c) => r + ',' + c;

  function Board() {
    this.cells = new Map(); this.placed = [];
    this.minR = 0; this.maxR = 0; this.minC = 0; this.maxC = 0;
  }
  Board.prototype.get = function (r, c) { return this.cells.get(key(r, c)); };
  Board.prototype.canPlace = function (word, row, col, dir) {
    const dr = dir === 'down' ? 1 : 0, dc = dir === 'across' ? 1 : 0;
    // the cells right before / after the word must be empty (otherwise words would merge)
    if (this.get(row - dr, col - dc) || this.get(row + dr * word.length, col + dc * word.length)) return { ok: false, crossings: 0 };
    let crossings = 0;
    for (let i = 0; i < word.length; i++) {
      const r = row + dr * i, c = col + dc * i; const cell = this.get(r, c);
      if (cell) {
        if (cell.ch !== word[i]) return { ok: false, crossings: 0 };
        // must cross a word, never overlap one running the same way
        if ((dir === 'across' && cell.across) || (dir === 'down' && cell.down)) return { ok: false, crossings: 0 };
        crossings++;
      } else {
        // empty cell: side neighbours must be empty, otherwise we'd create unintended adjacent letters
        const a = dir === 'across' ? this.get(r - 1, c) : this.get(r, c - 1);
        const b = dir === 'across' ? this.get(r + 1, c) : this.get(r, c + 1);
        if (a || b) return { ok: false, crossings: 0 };
      }
    }
    return { ok: true, crossings: crossings };
  };
  Board.prototype.place = function (entry, word, row, col, dir) {
    const dr = dir === 'down' ? 1 : 0, dc = dir === 'across' ? 1 : 0;
    for (let i = 0; i < word.length; i++) {
      const r = row + dr * i, c = col + dc * i;
      const cell = this.get(r, c) || { ch: word[i], across: false, down: false };
      if (dir === 'across') cell.across = true; else cell.down = true;
      this.cells.set(key(r, c), cell);
      this.minR = Math.min(this.minR, r); this.maxR = Math.max(this.maxR, r);
      this.minC = Math.min(this.minC, c); this.maxC = Math.max(this.maxC, c);
    }
    this.placed.push({ entry: entry, word: word, row: row, col: col, dir: dir });
  };
  Board.prototype.areaScore = function (r, c, len, dir) {
    const er = dir === 'down' ? r + len - 1 : r, ec = dir === 'across' ? c + len - 1 : c;
    const h = Math.max(this.maxR, er) - Math.min(this.minR, r) + 1, w = Math.max(this.maxC, ec) - Math.min(this.minC, c) + 1;
    return h * w + Math.abs(h - w) * 2;
  };

  function generateCrossword(entries, rnd, attempts) {
    rnd = rnd || Math.random; attempts = attempts || 60;
    const errors = [];
    const clean = entries.map((e) => ({ id: e.id, clue: e.clue, word: EVG.lettersOnly(e.word) })).filter((e) => e.word.length > 0);
    if (clean.length < 2) errors.push('A crossword needs at least 2 words.');
    const seen = new Set();
    clean.forEach((e) => {
      if (e.word.length < 2) errors.push('"' + e.word + '" is too short (minimum 2 letters).');
      if (seen.has(e.word)) errors.push('"' + e.word + '" appears twice.');
      seen.add(e.word);
    });
    if (entries.some((e) => e.word.trim() && !String(e.clue).trim())) errors.push('Every word needs a clue.');
    if (errors.length) return { ok: false, errors: errors, layout: null, unplaced: [] };

    let best = null, bestScore = -Infinity;
    for (let a = 0; a < attempts; a++) {
      // longest first gives a sturdy skeleton; later attempts add randomness for variety
      const order = a === 0 ? clean.slice().sort((x, y) => y.word.length - x.word.length)
        : EVG.shuffle(clean, rnd).sort((x, y) => (y.word.length - x.word.length) + (rnd() - 0.5) * 3);
      const board = new Board(); const first = order[0];
      board.place(first, first.word, 0, 0, 'across');
      const queue = order.slice(1);
      let progress = true;
      while (queue.length && progress) {   // keep sweeping while we make progress
        progress = false;
        for (let qi = 0; qi < queue.length; qi++) {
          const e = queue[qi]; let bestC = null;
          for (const p of board.placed) for (let i = 0; i < p.word.length; i++) for (let j = 0; j < e.word.length; j++) {
            if (p.word[i] !== e.word[j]) continue;
            const dir = p.dir === 'across' ? 'down' : 'across';
            const r = p.dir === 'across' ? p.row - j : p.row + i;
            const c = p.dir === 'across' ? p.col + i : p.col - j;
            const res = board.canPlace(e.word, r, c, dir);
            if (!res.ok || res.crossings === 0) continue;
            const total = res.crossings * 12 - board.areaScore(r, c, e.word.length, dir) + rnd();
            if (!bestC || total > bestC.score) bestC = { r: r, c: c, dir: dir, score: total };
          }
          if (bestC) { board.place(e, e.word, bestC.r, bestC.c, bestC.dir); queue.splice(qi, 1); qi--; progress = true; }
        }
      }
      const score = board.placed.length * 1000 - (board.maxR - board.minR + 1) * (board.maxC - board.minC + 1);
      if (score > bestScore) { bestScore = score; best = board; }
      if (board.placed.length === clean.length && a >= 12) break;
    }
    const ids = new Set(best.placed.map((p) => p.entry.id));
    const unplaced = clean.filter((e) => !ids.has(e.id)).map((e) => e.word);
    const layout = toLayout(best);
    if (unplaced.length) errors.push('Could not connect: ' + unplaced.join(', ') + '. Press Regenerate, or change/remove those words (each word must share a letter with another).');
    errors.push.apply(errors, validateCrossword(layout));
    return { ok: errors.length === 0, errors: errors, layout: layout, unplaced: unplaced };
  }

  function toLayout(board) {
    const placed = board.placed.map((p) => ({
      entryId: p.entry.id, word: p.word, clue: p.entry.clue, row: p.row - board.minR, col: p.col - board.minC, dir: p.dir, number: 0,
    }));
    // standard numbering: left→right, top→bottom; across & down starting in the same cell share a number
    const starts = Array.from(new Set(placed.map((p) => p.row + ',' + p.col))).map((s) => s.split(',').map(Number))
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const numberOf = new Map(starts.map((s, i) => [s[0] + ',' + s[1], i + 1]));
    placed.forEach((p) => { p.number = numberOf.get(p.row + ',' + p.col); });
    return { rows: board.maxR - board.minR + 1, cols: board.maxC - board.minC + 1, placed: placed };
  }

  /** Independent check: fits in bounds, letters agree at crossings, no stray words, connected, numbering consistent. */
  function validateCrossword(layout) {
    const errs = []; const grid = new Map(); const dirsAt = new Map();
    layout.placed.forEach((p) => {
      const dr = p.dir === 'down' ? 1 : 0, dc = p.dir === 'across' ? 1 : 0;
      for (let i = 0; i < p.word.length; i++) {
        const r = p.row + dr * i, c = p.col + dc * i;
        if (r < 0 || c < 0 || r >= layout.rows || c >= layout.cols) { errs.push('"' + p.word + '" does not fit in the grid.'); break; }
        const k = key(r, c);
        if (grid.has(k) && grid.get(k) !== p.word[i]) errs.push('Letter conflict at row ' + (r + 1) + ', column ' + (c + 1) + '.');
        grid.set(k, p.word[i]);
        if (!dirsAt.has(k)) dirsAt.set(k, new Set());
        if (dirsAt.get(k).has(p.dir)) errs.push('Words overlap at row ' + (r + 1) + ', column ' + (c + 1) + '.');
        dirsAt.get(k).add(p.dir);
      }
    });
    const runs = (horizontal) => {
      const out = []; const outer = horizontal ? layout.rows : layout.cols, inner = horizontal ? layout.cols : layout.rows;
      for (let a = 0; a < outer; a++) {
        let run = '';
        for (let b = 0; b <= inner; b++) {
          const ch = b < inner ? grid.get(horizontal ? key(a, b) : key(b, a)) : undefined;
          if (ch) run += ch; else { if (run.length > 1) out.push(run); run = ''; }
        }
      }
      return out.sort();
    };
    const exp = (d) => layout.placed.filter((p) => p.dir === d).map((p) => p.word).sort();
    if (JSON.stringify(runs(true)) !== JSON.stringify(exp('across'))) errs.push('Unintended letter sequence across.');
    if (JSON.stringify(runs(false)) !== JSON.stringify(exp('down'))) errs.push('Unintended letter sequence down.');
    if (layout.placed.length > 1) {   // connectivity = solvable
      const cellsOf = layout.placed.map((p) => {
        const dr = p.dir === 'down' ? 1 : 0, dc = p.dir === 'across' ? 1 : 0; const s = new Set();
        for (let i = 0; i < p.word.length; i++) s.add(key(p.row + dr * i, p.col + dc * i));
        return s;
      });
      const seen = new Set([0]); const stack = [0];
      while (stack.length) {
        const i = stack.pop();
        cellsOf.forEach((s, j) => { if (!seen.has(j) && Array.from(cellsOf[i]).some((k) => s.has(k))) { seen.add(j); stack.push(j); } });
      }
      if (seen.size !== layout.placed.length) errs.push('Crossword is not fully connected.');
    }
    layout.placed.forEach((p) => {
      if (layout.placed.some((q) => q.row === p.row && q.col === p.col && q.number !== p.number)) errs.push('Inconsistent numbering.');
    });
    return errs;
  }

  EVG.generateCrossword = generateCrossword;
  EVG.validateCrossword = validateCrossword;
})();
