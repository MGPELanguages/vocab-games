(function () {
  'use strict';
  const EVG = window.EVG; const h = EVG.h; const PAL = 8;

  const blank = () => ({ groups: Array.from({ length: 4 }, () => ({ id: EVG.uid(), name: '', explanation: '', words: ['', '', '', ''] })) });

  function validate(c) {
    const errs = [];
    if (c.groups.length !== 4) errs.push('A Connections game needs exactly 4 categories.');
    c.groups.forEach((g, i) => {
      if (!g.name.trim()) errs.push('Category ' + (i + 1) + ' needs a name.');
      if (g.words.length !== 4 || g.words.some((w) => !w.trim())) errs.push('Category ' + (i + 1) + ' needs 4 words.');
    });
    if (!EVG.uniqueCI(c.groups.reduce((a, g) => a.concat(g.words), []).filter((w) => w.trim()))) errs.push('Each word can only be used once in the whole game.');
    return errs;
  }

  function editor(ctx) {
    const c = ctx.content; const vocab = ctx.vocab();
    const dl = vocab ? h('datalist', { id: 'conn-vocab' }, vocab.entries.map((e) => h('option', { value: e.word }))) : null;
    return h('div', { class: 'stack' }, dl,
      h('div', { class: 'grid grid-2' }, c.groups.map((g, i) => h('div', { class: 'group-card pastel-' + (i % PAL) },
        h('div', { class: 'label' }, 'Category ' + (i + 1)),
        h('input', { class: 'input', placeholder: 'Category name (e.g. Breakfast foods)', value: g.name, 'aria-label': 'Category ' + (i + 1) + ' name', oninput: (e) => { g.name = e.target.value; ctx.changed(); } }),
        h('input', { class: 'input', placeholder: 'Explanation shown after solving (optional)', value: g.explanation, 'aria-label': 'Category ' + (i + 1) + ' explanation', oninput: (e) => { g.explanation = e.target.value; ctx.changed(); } }),
        h('div', { class: 'grid grid-2 tight' }, g.words.map((w, k) => h('input', {
          class: 'input', list: vocab ? 'conn-vocab' : null, placeholder: 'Word ' + (k + 1), value: w, 'aria-label': 'Category ' + (i + 1) + ' word ' + (k + 1),
          oninput: (e) => { g.words[k] = e.target.value; ctx.changed(); },
        })))))),
      h('p', { class: 'hint' }, 'Tip: pick a vocabulary list above, then start typing in a word box to get suggestions, or use “Draft from vocabulary list”.'));
  }

  function player(game) {
    const groups = game.content.groups;
    const initial = EVG.shuffle(groups.reduce((a, g, gi) => a.concat(g.words.map((w) => ({ w: w, gi: gi }))), []));
    let tiles = initial, selected = [], solved = [], mistakes = 0, msg = null, guesses = [], shake = false;
    const root = h('div', { class: 'game narrow stack' });

    function toggle(w) {
      msg = null;
      if (selected.includes(w)) selected = selected.filter((x) => x !== w); else if (selected.length < 4) selected = selected.concat(w);
      render();
    }
    function submit() {
      if (selected.length !== 4) return;
      const key = selected.slice().sort().join('|');
      if (guesses.includes(key)) { msg = { tone: 'info', text: 'You already tried that combination.' }; render(); return; }
      guesses.push(key);
      const remaining = tiles.filter((t) => !solved.includes(t.gi));
      // check the whole selection against each category: all four words must belong to the same one
      const chosen = selected.map((w) => remaining.find((t) => t.w === w).gi);
      if (chosen.every((g) => g === chosen[0])) {
        solved = solved.concat(chosen[0]); selected = [];
        msg = { tone: 'good', text: 'Correct! ' + groups[chosen[0]].name };
      } else {
        const counts = {}; chosen.forEach((g) => { counts[g] = (counts[g] || 0) + 1; });
        const max = Math.max.apply(null, Object.values(counts));
        mistakes++; shake = true;
        msg = { tone: 'bad', text: max === 3 ? 'So close! Three of those words belong together.' : 'Not quite. Those four words are not in the same category.' };
      }
      render();
    }
    function restart() { tiles = EVG.shuffle(initial); selected = []; solved = []; mistakes = 0; msg = null; guesses = []; render(); }

    function render() {
      const remaining = tiles.filter((t) => !solved.includes(t.gi)); const done = solved.length === 4;
      const kids = [];
      kids.push(h('div', { class: 'stack tight' }, solved.map((gi) => h('div', { class: 'solved pastel-' + (gi % PAL), 'data-testid': 'solved-group' },
        h('div', { class: 'solved-name' }, groups[gi].name), h('div', { class: 'solved-words' }, groups[gi].words.join(', ')),
        groups[gi].explanation ? h('div', { class: 'solved-expl' }, groups[gi].explanation) : null))));
      if (!done) {
        kids.push(h('div', { class: 'tiles tiles-4' + (shake ? ' shake' : '') }, remaining.map((t) => {
          const on = selected.includes(t.w);
          return h('button', { type: 'button', class: 'tile' + (on ? ' selected' : ''), 'aria-pressed': String(on), onclick: () => toggle(t.w) }, h('span', null, t.w));
        })));
        shake = false;
        if (msg) kids.push(EVG.feedback(msg.tone, msg.text));
        kids.push(h('div', { class: 'row between muted small' }, h('span', null, 'Mistakes: ', h('strong', { 'data-testid': 'mistakes' }, String(mistakes))), h('span', null, selected.length + '/4 selected')));
        kids.push(h('div', { class: 'row center wrap' },
          EVG.button('soft', 'shuffle', 'Shuffle', () => { tiles = EVG.shuffle(tiles); render(); }),
          EVG.button('ghost', null, 'Deselect', () => { selected = []; render(); }, { disabled: !selected.length }),
          EVG.button('primary', 'send', 'Submit', submit, { disabled: selected.length !== 4 })));
      } else {
        kids.push(EVG.completionCard({ message: mistakes === 0 ? 'Perfect! You found all four categories without a single mistake.' : 'You found all four categories. Great job!', stats: [{ label: 'Mistakes', value: mistakes }], onRestart: restart }));
      }
      EVG.replace(root, kids);
    }
    render();
    return root;
  }

  EVG.registerGame({
    type: 'connections', label: 'Connections', blurb: 'Sort 16 words into 4 hidden categories.',
    defaultInstructions: 'Find four groups of four words that share something in common. Select four words and press Submit.',
    blank: blank, validate: validate, editor: editor, player: player,
    fromVocab: function (list, current) {
      const words = EVG.shuffle(list.entries.map((e) => e.word.trim()).filter(Boolean));
      if (words.length < 16) return { content: current, message: 'This list has ' + words.length + ' words; a Connections game needs 16.' };
      const groups = current.groups.map((g, i) => Object.assign({}, g, { words: words.slice(i * 4, i * 4 + 4) }));
      return { content: { groups: groups }, message: 'Draft created with 16 random words. Now name each category and move words so every group makes sense.' };
    },
  });
})();
