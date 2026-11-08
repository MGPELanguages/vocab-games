/* Word search generator + independent validator. */
(function () {
  'use strict';
  const EVG = window.EVG;
  const GRID_DIMENSIONS = { small: 10, medium: 14, large: 18 };

  function allowedDirections(d) {
    const base = [];
    if (d.horizontal) base.push([0, 1]);
    if (d.vertical) base.push([1, 0]);
    if (d.diagonal) base.push([1, 1], [-1, 1]);
    const out = base.slice();
    if (d.backwards) base.forEach((b) => out.push([-b[0], -b[1]]));
    return out;
  }

  function generateWordSearch(rawWords, size, directions, difficulty, rnd) {
    rnd = rnd || Math.random; difficulty = difficulty || 'Medium';
    const n = GRID_DIMENSIONS[size]; const errors = [];
    const words = Array.from(new Set(rawWords.map(EVG.lettersOnly).filter(Boolean)));
    const dirs = allowedDirections(directions);
    if (!words.length) errors.push('Add at least one word.');
    if (!dirs.length) errors.push('Choose at least one direction.');
    words.forEach((w) => {
      if (w.length < 2) errors.push('"' + w + '" is too short (minimum 2 letters).');
      if (w.length > n) errors.push('"' + w + '" has ' + w.length + ' letters and does not fit in a ' + n + '×' + n + ' grid. Choose a larger grid or a shorter word.');
    });
    if (errors.length) return { ok: false, errors: errors, grid: [], placements: [] };

    const sorted = words.slice().sort((a, b) => b.length - a.length);
    for (let attempt = 0; attempt < 80; attempt++) {
      const grid = Array.from({ length: n }, () => Array(n).fill(''));
      const placements = []; let allPlaced = true;
      for (const word of sorted) {
        const cands = [];
        for (const d of dirs) {
          const dr = d[0], dc = d[1];
          for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
            const er = row + dr * (word.length - 1), ec = col + dc * (word.length - 1);
            if (er < 0 || er >= n || ec < 0 || ec >= n) continue;
            let ok = true, overlap = 0;
            for (let i = 0; i < word.length; i++) {
              const cell = grid[row + dr * i][col + dc * i];
              if (cell === '') continue;
              if (cell === word[i]) overlap++; else { ok = false; break; }
            }
            if (ok) cands.push({ row: row, col: col, dr: dr, dc: dc, overlap: overlap });
          }
        }
        if (!cands.length) { allPlaced = false; break; }
        // Easy puzzles avoid overlapping words; the others allow them.
        const pool = difficulty === 'Easy' ? cands.filter((c) => c.overlap === 0) : cands;
        const list = pool.length ? pool : cands;
        const pick = list[Math.floor(rnd() * list.length)];
        for (let i = 0; i < word.length; i++) grid[pick.row + pick.dr * i][pick.col + pick.dc * i] = word[i];
        placements.push({ word: word, row: pick.row, col: pick.col, dr: pick.dr, dc: pick.dc });
      }
      if (!allPlaced) continue;
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; const wordLetters = words.join('');
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (grid[r][c] === '') {
        const src = difficulty === 'Hard' && rnd() < 0.6 ? wordLetters : alphabet;
        grid[r][c] = src[Math.floor(rnd() * src.length)];
      }
      if (validateWordSearch(grid, placements, words, n).length === 0) return { ok: true, errors: [], grid: grid, placements: placements };
    }
    return { ok: false, grid: [], placements: [], errors: ['Could not fit all the words. Try a larger grid, fewer words, or enable more directions.'] };
  }

  /** Re-checks a puzzle: every word is present exactly where it claims to be, all inside the grid. */
  function validateWordSearch(grid, placements, words, n) {
    n = n || grid.length; const errs = [];
    if (grid.length !== n || grid.some((r) => r.length !== n)) errs.push('Grid is not square.');
    const wanted = new Set(words.map(EVG.lettersOnly)); const placed = new Set(placements.map((p) => p.word));
    wanted.forEach((w) => { if (!placed.has(w)) errs.push('"' + w + '" was not placed.'); });
    placements.forEach((p) => {
      for (let i = 0; i < p.word.length; i++) {
        const r = p.row + p.dr * i, c = p.col + p.dc * i;
        if (r < 0 || r >= n || c < 0 || c >= n) { errs.push('"' + p.word + '" goes outside the grid.'); break; }
        if (grid[r][c] !== p.word[i]) { errs.push('"' + p.word + '" does not match the grid.'); break; }
      }
    });
    return errs;
  }

  EVG.GRID_DIMENSIONS = GRID_DIMENSIONS;
  EVG.generateWordSearch = generateWordSearch;
  EVG.validateWordSearch = validateWordSearch;
})();
