(function () {
  'use strict';
  const EVG = window.EVG; const h = EVG.h; const BLANK = '___';
  const newItem = () => ({ id: EVG.uid(), sentence: '', answer: '', alternatives: [], hint: '' });
  const blank = () => ({ items: [newItem(), newItem(), newItem()] });

  function isCorrect(item, input) {
    const given = EVG.normAnswer(input); if (!given) return false;
    return [item.answer].concat(item.alternatives).some((a) => EVG.normAnswer(a) === given);
  }

  function validate(c) {
    const errs = [];
    if (c.items.length < 1) errs.push('Add at least one sentence.');
    c.items.forEach((it, i) => {
      const blanks = it.sentence.split(BLANK).length - 1;
      if (!it.sentence.trim()) errs.push('Sentence ' + (i + 1) + ' is empty.');
      else if (blanks !== 1) errs.push('Sentence ' + (i + 1) + ' must contain exactly one blank written as ' + BLANK + ' (it has ' + blanks + ').');
      if (!it.answer.trim()) errs.push('Sentence ' + (i + 1) + ' needs a correct answer.');
    });
    return errs;
  }

  function editor(ctx) {
    const c = ctx.content; const root = h('div', { class: 'stack' });
    function draw() {
      EVG.replace(root, [
        h('p', { class: 'note' }, 'Write each sentence and mark the missing word with ', h('code', null, BLANK), ' (three underscores).'),
        c.items.map((it, i) => h('div', { class: 'row-card stack tight' },
          h('div', { class: 'row between' }, h('span', { class: 'label nomb' }, 'Sentence ' + (i + 1)), EVG.button('ghost', 'trash', null, () => { c.items.splice(i, 1); ctx.changed(); draw(); }, { 'aria-label': 'Remove sentence ' + (i + 1), class: 'icon-only' })),
          h('input', { class: 'input', placeholder: 'e.g. She ' + BLANK + ' to work every day.', value: it.sentence, 'aria-label': 'Sentence ' + (i + 1), oninput: (e) => { it.sentence = e.target.value; ctx.changed(); } }),
          h('div', { class: 'grid grid-3 tight' },
            h('input', { class: 'input ok', placeholder: 'Correct answer', value: it.answer, 'aria-label': 'Sentence ' + (i + 1) + ' answer', oninput: (e) => { it.answer = e.target.value; ctx.changed(); } }),
            h('input', { class: 'input', placeholder: 'Also accept (comma separated)', value: it.alternatives.join(', '), 'aria-label': 'Sentence ' + (i + 1) + ' alternatives', oninput: (e) => { it.alternatives = e.target.value.split(',').map((s) => s.trim()).filter(Boolean); ctx.changed(); } }),
            h('input', { class: 'input', placeholder: 'Hint (optional)', value: it.hint, 'aria-label': 'Sentence ' + (i + 1) + ' hint', oninput: (e) => { it.hint = e.target.value; ctx.changed(); } })))),
        h('div', null, EVG.button('soft', 'plus', 'Add sentence', () => { c.items.push(newItem()); ctx.changed(); draw(); })),
      ]);
    }
    draw(); return root;
  }

  function player(game) {
    const items = game.content.items; const root = h('div', { class: 'game narrow stack' });
    let vals = {}, status = {}, hints = {}, attempts = 0, wrongCount = 0;
    const progressHost = h('div'); const cardsHost = h('div', { class: 'stack tight' }); const summaryHost = h('div', { class: 'muted small' }); const doneHost = h('div');
    root.append(progressHost, cardsHost, summaryHost, doneHost);

    const resolvedN = () => items.filter((it) => status[it.id] === 'correct' || status[it.id] === 'revealed').length;
    const correctN = () => items.filter((it) => status[it.id] === 'correct').length;

    function check(id) {
      const it = items.find((x) => x.id === id);
      if (!(vals[id] || '').trim()) return;
      attempts++;
      if (isCorrect(it, vals[id])) status[id] = 'correct'; else { status[id] = 'wrong'; wrongCount++; }
      drawCard(id); updateSummary();
    }
    function drawCard(id) {
      const idx = items.findIndex((x) => x.id === id), it = items[idx];
      const st = status[id] || 'idle'; const locked = st === 'correct' || st === 'revealed';
      const parts = it.sentence.split(BLANK);
      const input = h('input', {
        class: 'blank-input ' + st, 'aria-label': 'Answer for sentence ' + (idx + 1), disabled: locked, autocomplete: 'off', autocapitalize: 'off', spellcheck: false,
        value: st === 'revealed' ? it.answer : (vals[id] || ''), style: { width: Math.max(6, it.answer.length + 2) + 'ch' },
        oninput: (e) => { vals[id] = e.target.value; if (status[id] === 'wrong') { status[id] = 'idle'; input.className = 'blank-input idle'; } },
        onkeydown: (e) => { if (e.key === 'Enter') check(id); },
      });
      const card = h('div', { class: 'card item-card ' + st, 'data-status': st, 'data-id': id },
        h('div', { class: 'sentence' }, h('span', { class: 'num' }, (idx + 1) + '.'), h('span', null, parts[0]), input, h('span', null, parts[1])),
        h('div', { class: 'row wrap mt-s' },
          !locked ? EVG.button('soft', 'check', 'Check', () => check(id), { class: 'sm' }) : null,
          !locked && it.hint ? EVG.button('ghost', 'bulb', 'Hint', () => { hints[id] = true; drawCard(id); }, { class: 'sm' }) : null,
          st === 'wrong' ? EVG.button('ghost', 'eye', 'Show answer', () => { status[id] = 'revealed'; drawCard(id); updateSummary(); }, { class: 'sm' }) : null,
          st === 'correct' ? h('span', { class: 'tone-good' }, 'Correct!') : null,
          st === 'wrong' ? h('span', { class: 'tone-bad' }, 'Not quite — try again.') : null,
          st === 'revealed' ? h('span', { class: 'tone-warn' }, 'Answer: ' + it.answer) : null),
        hints[id] && !locked ? h('div', { class: 'muted small mt-s' }, 'Hint: ' + it.hint) : null);
      const old = cardsHost.querySelector('[data-id="' + id + '"]');
      if (old) { const hadFocus = old.contains(document.activeElement); old.replaceWith(card); if (hadFocus && !locked) input.focus(); } else cardsHost.appendChild(card);
    }
    function updateSummary() {
      EVG.replace(progressHost, EVG.progressBar(resolvedN(), items.length, 'Completed'));
      EVG.replace(summaryHost, ['Correct: ', h('strong', { 'data-testid': 'correct-count' }, String(correctN())), ' · Wrong attempts: ', h('strong', { 'data-testid': 'wrong-count' }, String(wrongCount))]);
      EVG.clear(doneHost);
      if (resolvedN() === items.length) doneHost.appendChild(EVG.completionCard({ message: 'You completed every sentence.', stats: [{ label: 'Score', value: correctN() + '/' + items.length }, { label: 'Attempts', value: attempts }], onRestart: restart }));
    }
    function restart() { vals = {}; status = {}; hints = {}; attempts = 0; wrongCount = 0; EVG.clear(cardsHost); items.forEach((it) => drawCard(it.id)); updateSummary(); }
    items.forEach((it) => drawCard(it.id)); updateSummary();
    return root;
  }

  EVG.registerGame({
    type: 'fill-blanks', label: 'Fill in the Blanks', blurb: 'Complete sentences by typing the missing word.',
    defaultInstructions: 'Type the missing word in each sentence, then press Check.',
    blank: blank, validate: validate, editor: editor, player: player,
    fromVocab: function (list, current) {
      const items = [];
      list.entries.forEach((e) => {
        const w = e.word.trim(); if (!w || !e.example.trim()) return;
        const re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
        if (!re.test(e.example)) return;
        items.push({ id: EVG.uid(), sentence: e.example.replace(re, BLANK), answer: w, alternatives: [], hint: e.definition });
      });
      if (!items.length) return { content: current, message: 'No usable example sentences: each word must appear in its example sentence.' };
      return { content: { items: items }, message: 'Created ' + items.length + ' sentences from the examples (the definition is used as the hint).' };
    },
  });
})();
