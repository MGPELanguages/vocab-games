(function () {
  'use strict';
  const EVG = window.EVG; const h = EVG.h;
  const newWord = () => ({ id: EVG.uid(), word: '', hint: '' });
  const blank = () => ({ showHints: true, words: [newWord(), newWord(), newWord()] });

  function scrambleLetters(word) {
    const letters = EVG.lettersOnly(word).split('');
    if (new Set(letters).size < 2) return letters;
    for (let i = 0; i < 20; i++) { const s = EVG.shuffle(letters); if (s.join('') !== letters.join('')) return s; }
    return letters.slice().reverse();
  }

  function validate(c) {
    const errs = [];
    if (c.words.length < 1) errs.push('Add at least one word.');
    c.words.forEach((w, i) => {
      if (EVG.lettersOnly(w.word).length < 3) errs.push('Word ' + (i + 1) + ' needs at least 3 letters.');
      if (c.showHints && !w.hint.trim()) errs.push('Word ' + (i + 1) + ' needs a hint (or turn hints off).');
    });
    return errs;
  }

  function editor(ctx) {
    const c = ctx.content; const root = h('div', { class: 'stack' });
    function draw() {
      EVG.replace(root, [
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: c.showHints, onchange: (e) => { c.showHints = e.target.checked; ctx.changed(); } }), 'Show hints to students'),
        c.words.map((w, i) => h('div', { class: 'row-card scr-row' },
          h('input', { class: 'input', placeholder: 'Word', value: w.word, 'aria-label': 'Word ' + (i + 1), oninput: (e) => { w.word = e.target.value; ctx.changed(); } }),
          h('input', { class: 'input', placeholder: 'Hint or definition', value: w.hint, 'aria-label': 'Word ' + (i + 1) + ' hint', oninput: (e) => { w.hint = e.target.value; ctx.changed(); } }),
          EVG.button('ghost', 'trash', null, () => { c.words.splice(i, 1); ctx.changed(); draw(); }, { 'aria-label': 'Remove word ' + (i + 1), class: 'icon-only' }))),
        h('div', null, EVG.button('soft', 'plus', 'Add word', () => { c.words.push(newWord()); ctx.changed(); draw(); })),
      ]);
    }
    draw(); return root;
  }

  function player(game) {
    const showHints = game.content.showHints;
    const deck = game.content.words.map((w) => ({ id: w.id, word: w.word, hint: w.hint, tiles: scrambleLetters(w.word), target: EVG.lettersOnly(w.word) }));
    const root = h('div', { class: 'game narrow stack' });
    let i = 0, stack = [], result = 'idle', solved = 0, skipped = 0, firstLetter = false, finished = false, refocus = false;

    const answer = () => stack.map((k) => deck[i].tiles[k]).join('');
    function typed(value) {
      // rebuild the tile stack from typed text: each letter claims the first unused matching tile
      const used = [];
      EVG.lettersOnly(value).split('').forEach((ch) => { const k = deck[i].tiles.findIndex((t, idx) => t === ch && !used.includes(idx)); if (k >= 0) used.push(k); });
      stack = used; result = 'idle'; refocus = true; render();
    }
    const advance = () => { if (i + 1 >= deck.length) finished = true; else { i++; stack = []; result = 'idle'; firstLetter = false; } render(); };
    const check = () => { if (answer() === deck[i].target) { result = 'right'; solved++; } else result = 'wrong'; render(); };
    const restart = () => { i = 0; stack = []; result = 'idle'; solved = 0; skipped = 0; firstLetter = false; finished = false; render(); };

    function render() {
      if (finished) { EVG.replace(root, EVG.completionCard({ message: 'You unscrambled all the words!', stats: [{ label: 'Solved', value: solved + '/' + deck.length }, { label: 'Skipped', value: skipped }], onRestart: restart })); return; }
      const cur = deck[i];
      const input = h('input', { class: 'input scr-answer' + (result === 'wrong' ? ' bad' : '') + (result === 'right' ? ' ok' : ''), 'aria-label': 'Your answer', value: answer(), disabled: result === 'right',
        placeholder: 'Type or tap letters', autocomplete: 'off', autocapitalize: 'characters', spellcheck: false,
        oninput: (e) => typed(e.target.value), onkeydown: (e) => { if (e.key === 'Enter') { if (result === 'right') advance(); else check(); } } });
      const kids = [EVG.progressBar(i, deck.length, 'Word ' + (i + 1)),
        h('div', { class: 'card scr-card stack center-text' },
          showHints && cur.hint ? h('p', { class: 'muted small' }, 'Hint: ' + cur.hint) : null,
          firstLetter ? h('p', { class: 'tone-brand small' }, 'Starts with “' + cur.target[0] + '” · ' + cur.target.length + ' letters') : null,
          h('div', { class: 'row center wrap', 'aria-label': 'Scrambled letters' }, cur.tiles.map((t, k) => h('button', { type: 'button', class: 'letter' + (stack.includes(k) ? ' used' : ''), disabled: stack.includes(k) || result === 'right', onclick: () => { stack = stack.concat(k); result = 'idle'; render(); } }, t))),
          input,
          h('div', { class: 'row center wrap' },
            EVG.button('ghost', 'undo', 'Undo', () => { stack = stack.slice(0, -1); result = 'idle'; render(); }, { disabled: !stack.length }),
            EVG.button('ghost', 'x', 'Clear', () => { stack = []; result = 'idle'; render(); }, { disabled: !stack.length }),
            EVG.button('ghost', 'bulb', 'Hint', () => { firstLetter = true; render(); }, { disabled: firstLetter }),
            result !== 'right' ? EVG.button('primary', 'check', 'Check', check, { disabled: !stack.length }) : null))];
      if (result === 'right') { kids.push(EVG.feedback('good', ['Correct! The word is ', h('strong', null, cur.word), '.'])); kids.push(h('div', { class: 'row end' }, EVG.button('primary', 'arrowRight', i + 1 >= deck.length ? 'Finish' : 'Next word', advance))); }
      if (result === 'wrong') kids.push(EVG.feedback('bad', 'Not quite — keep trying!'));
      if (result !== 'right') kids.push(h('div', { class: 'row end' }, EVG.button('ghost', 'skip', 'Skip', () => { skipped++; advance(); })));
      EVG.replace(root, kids);
      if (refocus) { refocus = false; input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
    }
    render(); return root;
  }

  EVG.registerGame({
    type: 'scramble', label: 'Word Scramble', blurb: 'Rearrange the letters to spell the word.',
    defaultInstructions: 'Rearrange the letters to make a word. Use the hint if you need help.',
    blank: blank, validate: validate, editor: editor, player: player,
    fromVocab: function (list, current) {
      const words = list.entries.filter((e) => EVG.lettersOnly(e.word).length >= 3).map((e) => ({ id: EVG.uid(), word: e.word.trim(), hint: e.definition || e.translation || '' }));
      return { content: Object.assign({}, current, { words: words }), message: 'Loaded ' + words.length + ' words. Definitions are used as hints.' };
    },
  });
})();
