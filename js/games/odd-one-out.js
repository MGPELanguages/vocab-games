(function () {
  'use strict';
  const EVG = window.EVG; const h = EVG.h;
  const newGroup = () => ({ id: EVG.uid(), words: ['', '', '', '', ''], oddIndex: 0, explanation: '' });
  const blank = () => ({ groups: [newGroup(), newGroup(), newGroup()] });
  const filled = (g) => g.words.map((w) => w.trim()).filter(Boolean);

  function validate(c) {
    const errs = [];
    if (c.groups.length < 1) errs.push('Add at least one group.');
    c.groups.forEach((g, i) => {
      const f = filled(g);
      if (f.length < 4) errs.push('Group ' + (i + 1) + ' needs at least 4 words.');
      if (!EVG.uniqueCI(f)) errs.push('Group ' + (i + 1) + ' has repeated words.');
      if (!(g.words[g.oddIndex] || '').trim()) errs.push('Group ' + (i + 1) + ': choose which word is the odd one out.');
    });
    return errs;
  }

  function editor(ctx) {
    const c = ctx.content; const vocab = ctx.vocab(); const root = h('div', { class: 'stack' });
    function draw() {
      EVG.replace(root, [
        vocab ? h('datalist', { id: 'odd-vocab' }, vocab.entries.map((e) => h('option', { value: e.word }))) : null,
        c.groups.map((g, i) => h('div', { class: 'row-card stack tight' },
          h('div', { class: 'row between' }, h('span', { class: 'label nomb' }, 'Group ' + (i + 1) + ' — select the odd one out'), EVG.button('ghost', 'trash', null, () => { c.groups.splice(i, 1); ctx.changed(); draw(); }, { 'aria-label': 'Remove group ' + (i + 1), class: 'icon-only' })),
          h('div', { class: 'grid grid-5 tight' }, g.words.map((w, k) => h('div', { class: 'odd-cell' },
            h('input', { type: 'radio', name: 'odd-' + g.id, checked: g.oddIndex === k, 'aria-label': 'Group ' + (i + 1) + ' word ' + (k + 1) + ' is the odd one', onchange: () => { g.oddIndex = k; ctx.changed(); draw(); } }),
            h('input', { class: 'input' + (g.oddIndex === k ? ' odd' : ''), list: vocab ? 'odd-vocab' : null, placeholder: k === 4 ? 'Word 5 (optional)' : 'Word ' + (k + 1), value: w, 'aria-label': 'Group ' + (i + 1) + ' word ' + (k + 1), oninput: (e) => { g.words[k] = e.target.value; ctx.changed(); } })))),
          h('input', { class: 'input', placeholder: 'Why is it different? (shown after answering)', value: g.explanation, 'aria-label': 'Group ' + (i + 1) + ' explanation', oninput: (e) => { g.explanation = e.target.value; ctx.changed(); } }))),
        h('div', null, EVG.button('soft', 'plus', 'Add group', () => { c.groups.push(newGroup()); ctx.changed(); draw(); })),
      ]);
    }
    draw(); return root;
  }

  function player(game) {
    const root = h('div', { class: 'game narrow stack' });
    const build = () => game.content.groups.map((g) => ({ g: g, odd: g.words[g.oddIndex].trim(), words: EVG.shuffle(filled(g)) }));
    let rounds = build(), i = 0, sel = null, checked = false, score = 0, finished = false;
    function render() {
      if (finished) { EVG.replace(root, EVG.completionCard({ message: "You've finished all the groups.", stats: [{ label: 'Score', value: score + '/' + rounds.length }], onRestart: restart })); return; }
      const cur = rounds[i]; const right = sel === cur.odd;
      const kids = [EVG.progressBar(i + (checked ? 1 : 0), rounds.length, 'Group ' + (i + 1)),
        h('p', { class: 'center-text lead' }, 'Which word does ', h('em', null, 'not'), ' belong?'),
        h('div', { class: 'tiles tiles-3' }, cur.words.map((w) => h('button', { type: 'button', 'aria-pressed': String(sel === w), disabled: checked,
          class: 'tile big' + (!checked && sel === w ? ' selected' : '') + (checked && w === cur.odd ? ' correct' : '') + (checked && w === sel && w !== cur.odd ? ' incorrect' : '') + (checked && w !== cur.odd && w !== sel ? ' faded' : ''),
          onclick: () => { sel = w; render(); } }, w)))];
      if (!checked) kids.push(h('div', { class: 'row center' }, EVG.button('primary', 'check', 'Check', () => { if (!sel) return; checked = true; if (sel === cur.odd) score++; render(); }, { disabled: !sel })));
      else {
        kids.push(EVG.feedback(right ? 'good' : 'bad', [right ? 'Correct!' : ['Not quite. The odd one out is ', h('strong', null, cur.odd), '.'], cur.g.explanation ? h('div', { class: 'muted' }, cur.g.explanation) : null]));
        kids.push(h('div', { class: 'row end' }, EVG.button('primary', 'arrowRight', i + 1 >= rounds.length ? 'See results' : 'Next', () => { if (i + 1 >= rounds.length) finished = true; else { i++; sel = null; checked = false; } render(); })));
      }
      EVG.replace(root, kids);
    }
    function restart() { rounds = build(); i = 0; sel = null; checked = false; score = 0; finished = false; render(); }
    render(); return root;
  }

  EVG.registerGame({
    type: 'odd-one-out', label: 'Odd One Out', blurb: 'Spot the word that does not belong.',
    defaultInstructions: 'Each group has one word that does not belong. Choose it and press Check.',
    blank: blank, validate: validate, editor: editor, player: player,
    fromVocab: function (list, current, difficulty, all) {
      const own = EVG.shuffle(list.entries.map((e) => e.word.trim()).filter(Boolean));
      const others = EVG.shuffle(all.filter((l) => l.id !== list.id).reduce((a, l) => a.concat(l.entries.map((e) => e.word.trim())), []).filter(Boolean));
      const n = Math.min(Math.floor(own.length / 4), others.length, 5);
      if (n < 1) return { content: current, message: 'Need at least 4 words in this list and some words in another list (for the odd ones) to draft groups.' };
      const groups = Array.from({ length: n }, (_, k) => ({ id: EVG.uid(), words: own.slice(k * 4, k * 4 + 4).concat(others[k]), oddIndex: 4, explanation: '' }));
      return { content: { groups: groups }, message: 'Drafted ' + n + ' groups: four words from this list plus one from another list. Add a short explanation to each.' };
    },
  });
})();
