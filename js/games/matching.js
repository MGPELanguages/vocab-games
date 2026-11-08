(function () {
  'use strict';
  const EVG = window.EVG; const h = EVG.h;
  const newPair = () => ({ id: EVG.uid(), term: '', definition: '', translation: '', image: '' });
  const blank = () => ({ mode: 'definition', pairsToShow: 0, pairs: [newPair(), newPair(), newPair(), newPair()] });
  const isImg = (s) => EVG.isHttpUrl(s) || /^data:image\//.test(s);
  const rightOf = (p, mode) => (mode === 'definition' ? p.definition : mode === 'translation' ? p.translation : p.image);

  function validate(c) {
    const errs = [];
    if (c.pairs.length < 2) errs.push('Add at least 2 pairs.');
    if (c.pairsToShow !== 0 && (c.pairsToShow < 2 || c.pairsToShow > c.pairs.length)) errs.push('"Pairs per round" must be between 2 and ' + c.pairs.length + ' (or 0 for all).');
    c.pairs.forEach((p, i) => {
      if (!p.term.trim()) errs.push('Pair ' + (i + 1) + ' needs a word.');
      const r = rightOf(p, c.mode).trim();
      if (!r) errs.push('Pair ' + (i + 1) + ' needs a ' + (c.mode === 'image' ? 'image URL' : c.mode) + '.');
      else if (c.mode === 'image' && !isImg(r)) errs.push('Pair ' + (i + 1) + ': the image must be a web address starting with http(s)://.');
    });
    const rights = c.pairs.map((p) => rightOf(p, c.mode).trim().toLowerCase()).filter(Boolean);
    if (new Set(rights).size !== rights.length) errs.push('Two pairs have the same match, which would be ambiguous.');
    return errs;
  }

  const MODES = [['definition', 'Word → definition'], ['translation', 'Word → translation'], ['image', 'Word → image']];

  function editor(ctx) {
    const c = ctx.content; const root = h('div', { class: 'stack' });
    function draw() {
      const modeBtns = MODES.map((m) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(c.mode === m[0]), class: 'pill' + (c.mode === m[0] ? ' active' : ''), onclick: () => { c.mode = m[0]; ctx.changed(); draw(); } }, m[1]));
      const field = (p, i, key, ph, active) => h('input', { class: 'input' + (active ? ' hl' : ''), placeholder: ph, value: p[key], 'aria-label': 'Pair ' + (i + 1) + ' ' + (key === 'term' ? 'word' : key), oninput: (e) => { p[key] = e.target.value; ctx.changed(); } });
      EVG.replace(root, [
        h('div', { class: 'grid grid-2' },
          h('div', null, h('span', { class: 'label' }, 'Matching mode'), h('div', { class: 'row wrap', role: 'radiogroup', 'aria-label': 'Matching mode' }, modeBtns)),
          EVG.field('Pairs per round (0 = all)', h('input', { class: 'input', type: 'number', min: 0, max: c.pairs.length, value: c.pairsToShow, oninput: (e) => { c.pairsToShow = Math.max(0, Number(e.target.value) || 0); ctx.changed(); } }))),
        h('div', { class: 'stack tight' }, c.pairs.map((p, i) => h('div', { class: 'row-card pair-row' },
          field(p, i, 'term', 'Word'), field(p, i, 'definition', 'Definition', c.mode === 'definition'), field(p, i, 'translation', 'Translation', c.mode === 'translation'), field(p, i, 'image', 'Image URL', c.mode === 'image'),
          EVG.button('ghost', 'trash', null, () => { c.pairs.splice(i, 1); ctx.changed(); draw(); }, { 'aria-label': 'Remove pair ' + (i + 1), class: 'icon-only' })))),
        h('p', { class: 'hint' }, 'The highlighted column is the one used in the selected mode. You can fill all columns once and switch modes later.'),
        h('div', null, EVG.button('soft', 'plus', 'Add pair', () => { c.pairs.push(newPair()); ctx.changed(); draw(); })),
      ]);
    }
    draw(); return root;
  }

  function player(game) {
    const c = game.content; const root = h('div', { class: 'game stack' });
    const build = () => { const subset = c.pairsToShow > 0 ? EVG.sample(c.pairs, c.pairsToShow) : c.pairs; return { left: EVG.shuffle(subset), right: EVG.shuffle(subset) }; };
    let round = build(), selL = null, selR = null, matched = [], wrong = null, mistakes = 0, msg = null;

    function attempt(l, r) {
      if (l === r) { matched.push(l); msg = { tone: 'good', text: 'Correct match!' }; }
      else { mistakes++; wrong = { l: l, r: r }; msg = { tone: 'bad', text: 'Not a match. Try again!' }; }
      selL = null; selR = null; render();
    }
    const pickL = (id) => { if (matched.includes(id)) return; selL = id; if (selR) attempt(id, selR); else render(); };
    const pickR = (id) => { if (matched.includes(id)) return; selR = id; if (selL) attempt(selL, id); else render(); };
    const restart = () => { round = build(); selL = null; selR = null; matched = []; mistakes = 0; msg = null; wrong = null; render(); };

    function render() {
      const total = round.left.length;
      if (matched.length === total) { EVG.replace(root, h('div', { class: 'narrow' }, EVG.completionCard({ message: 'You matched every pair!', stats: [{ label: 'Pairs', value: total }, { label: 'Mistakes', value: mistakes }], onRestart: restart }))); return; }
      const cls = (id, sel, w) => 'tile match' + (matched.includes(id) ? ' done pastel-' + (matched.indexOf(id) % 8) : sel ? ' selected' : '') + (w ? ' wrong' : '');
      const w = wrong; wrong = null;
      EVG.replace(root, [
        EVG.progressBar(matched.length, total, 'Matched'),
        h('div', { class: 'match-cols' },
          h('div', { class: 'stack tight' }, round.left.map((p) => h('button', { type: 'button', class: cls(p.id, selL === p.id, w && w.l === p.id) + ' left', disabled: matched.includes(p.id), 'aria-pressed': String(selL === p.id), onclick: () => pickL(p.id) }, p.term))),
          h('div', { class: 'stack tight' }, round.right.map((p) => h('button', { type: 'button', class: cls(p.id, selR === p.id, w && w.r === p.id) + ' right', disabled: matched.includes(p.id), 'aria-pressed': String(selR === p.id), 'data-pair': p.id, onclick: () => pickR(p.id) },
            c.mode === 'image' ? h('img', { src: p.image, alt: '', loading: 'lazy' }) : (c.mode === 'definition' ? p.definition : p.translation))))),
        h('div', { class: 'row between muted small statusline' }, h('span', null, 'Mistakes: ', h('strong', { 'data-testid': 'mistakes' }, String(mistakes))), msg ? EVG.feedback(msg.tone, msg.text) : null),
      ]);
    }
    render(); return root;
  }

  EVG.registerGame({
    type: 'matching', label: 'Matching', blurb: 'Match words with definitions, translations or pictures.',
    defaultInstructions: 'Tap a word on the left, then tap its match on the right.',
    blank: blank, validate: validate, editor: editor, player: player,
    fromVocab: function (list, current) {
      const pairs = list.entries.filter((e) => e.word.trim()).map((e) => ({ id: EVG.uid(), term: e.word, definition: e.definition, translation: e.translation, image: e.image }));
      return { content: Object.assign({}, current, { pairs: pairs }), message: 'Loaded ' + pairs.length + ' words. Check that the column for your chosen mode is filled in.' };
    },
  });
})();
