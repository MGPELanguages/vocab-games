/* Turns the JSON written for a game (games/<game>/<student>.json) into a playable game object.
   Shared by the student site (browser) and by scripts/build.mjs (validation in GitHub Actions).
   - Fills in ids and defaults, so the JSON can stay short and easy to write with an AI.
   - Word searches and crosswords are NOT stored as grids: they are generated here from the word list.
     opts.random → new random puzzle each time (student site); otherwise a fixed seed from the file path. */
(function () {
  'use strict';
  const EVG = window.EVG;

  EVG.SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  function seedFrom(str) {            // xmur3 hash → mulberry32 generator
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  const str = (x) => (typeof x === 'string' ? x : x == null ? '' : String(x));
  const cap = (s) => { s = str(s).trim(); return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); };

  /** Add missing ids and defaults to the content of one game type. Returns extra errors found while doing so. */
  function normalize(type, c) {
    const errs = [];
    const needArr = (key) => { if (!Array.isArray(c[key])) { errs.push('Missing list "' + key + '".'); c[key] = []; } };
    const ids = (key) => c[key].forEach((x, i) => { if (isObj(x) && !x.id) x.id = key + '-' + (i + 1); });
    switch (type) {
      case 'connections':
        needArr('groups'); ids('groups');
        c.groups.forEach((g) => { g.name = str(g.name); g.explanation = str(g.explanation); g.words = Array.isArray(g.words) ? g.words.map(str) : []; });
        break;
      case 'matching':
        needArr('pairs'); ids('pairs'); c.mode = c.mode || 'definition'; c.pairsToShow = Number(c.pairsToShow) || 0;
        c.pairs.forEach((p) => { ['term', 'definition', 'translation', 'image'].forEach((k) => { p[k] = str(p[k]); }); });
        break;
      case 'multiple-choice':
        needArr('questions'); ids('questions'); c.optionCount = Number(c.optionCount) || 4; c.allowRetry = c.allowRetry !== false;
        c.questions.forEach((q) => { q.prompt = str(q.prompt); q.correct = str(q.correct); q.explanation = str(q.explanation); q.wrong = Array.isArray(q.wrong) ? q.wrong.map(str) : []; });
        break;
      case 'fill-blanks':
        needArr('items'); ids('items');
        c.items.forEach((it) => { it.sentence = str(it.sentence); it.answer = str(it.answer); it.hint = str(it.hint); it.alternatives = Array.isArray(it.alternatives) ? it.alternatives.map(str) : []; });
        break;
      case 'scramble':
        needArr('words'); ids('words'); c.showHints = c.showHints !== false;
        c.words.forEach((w) => { w.word = str(w.word); w.hint = str(w.hint); });
        break;
      case 'odd-one-out':
        needArr('groups'); ids('groups');
        c.groups.forEach((g, i) => {
          g.words = Array.isArray(g.words) ? g.words.map(str) : []; g.explanation = str(g.explanation);
          if (typeof g.odd === 'string') {                       // friendlier than an index: "odd": "carrot"
            g.oddIndex = g.words.findIndex((w) => w.trim().toLowerCase() === g.odd.trim().toLowerCase());
            if (g.oddIndex < 0) errs.push('Group ' + (i + 1) + ': the odd word “' + g.odd + '” is not in its list of words.');
          }
          g.oddIndex = Number.isInteger(g.oddIndex) ? g.oddIndex : -1;
        });
        break;
      case 'word-search':
        if (!Array.isArray(c.words)) { errs.push('Missing list "words".'); c.words = []; }
        c.words = c.words.map(str); c.size = c.size || 'medium';
        c.directions = Object.assign({ horizontal: true, vertical: true, diagonal: true, backwards: false }, isObj(c.directions) ? c.directions : {});
        break;
      case 'crossword':
        needArr('entries'); ids('entries'); c.allowReveal = c.allowReveal !== false;
        c.entries.forEach((e) => { e.word = str(e.word); e.clue = str(e.clue); });
        break;
    }
    return errs;
  }

  /**
   * raw: parsed JSON of a game file. key: stable string (the file path) used as seed and id.
   * Returns { game } or { errors: [messages] }.
   */
  EVG.prepareGame = function (raw, key, opts) {
    const seedKey = opts && opts.random ? key + '#' + Math.random() : (opts && opts.seed) || key;
    if (!isObj(raw)) return { errors: ['The file must contain one JSON object ({ ... }).'] };
    const def = EVG.games[raw.type];
    if (!def) return { errors: ['Unknown "type": ' + JSON.stringify(raw.type) + '. Valid types: ' + EVG.GAME_TYPES.join(', ') + '.'] };
    const errors = [];
    const title = str(raw.title).trim(); if (!title) errors.push('Missing "title".');
    const level = str(raw.level).trim().toUpperCase() || 'A2'; if (EVG.LEVELS.indexOf(level) < 0) errors.push('"level" must be one of ' + EVG.LEVELS.join(', ') + '.');
    const difficulty = raw.difficulty ? cap(raw.difficulty) : 'Medium'; if (EVG.DIFFICULTIES.indexOf(difficulty) < 0) errors.push('"difficulty" must be one of ' + EVG.DIFFICULTIES.join(', ') + '.');
    if (!isObj(raw.content)) return { errors: errors.concat('Missing "content" object.') };

    const content = EVG.clone(raw.content);
    let problems;
    try {
      problems = normalize(raw.type, content);
      if (raw.type === 'word-search' && !problems.length) {
        const r = EVG.generateWordSearch(content.words, content.size, content.directions, difficulty, seedFrom(seedKey));
        if (!r.ok) problems = problems.concat(r.errors); else { content.grid = r.grid; content.placements = r.placements; }
      } else if (raw.type === 'crossword' && !problems.length) {
        const r = EVG.generateCrossword(content.entries, seedFrom(seedKey));
        if (!r.ok) problems = problems.concat(r.errors); else content.layout = r.layout;
      }
      if (!problems.length) problems = def.validate(content);
    } catch (e) { problems = ['The "content" does not have the right shape for a ' + raw.type + ' game (' + e.message + ').']; }
    errors.push.apply(errors, problems);
    if (errors.length) return { errors: errors };

    return { game: { id: key, type: raw.type, title: title, description: str(raw.description), student: str(raw.student), topic: str(raw.topic),
      level: level, difficulty: difficulty, instructions: str(raw.instructions).trim() || def.defaultInstructions, content: content } };
  };
})();
