(function () {
  'use strict';
  const EVG = window.EVG; const h = EVG.h;
  const newQ = () => ({ id: EVG.uid(), prompt: '', correct: '', wrong: [], explanation: '' });
  const blank = () => ({ optionCount: 4, allowRetry: true, questions: [newQ(), newQ(), newQ()] });

  function validate(c) {
    const errs = [];
    if (c.optionCount < 2 || c.optionCount > 6) errs.push('Number of options must be between 2 and 6.');
    if (c.questions.length < 1) errs.push('Add at least one question.');
    c.questions.forEach((q, i) => {
      if (!q.prompt.trim()) errs.push('Question ' + (i + 1) + ' needs a question text.');
      if (!q.correct.trim()) errs.push('Question ' + (i + 1) + ' needs a correct answer.');
      const wrong = q.wrong.map((w) => w.trim()).filter(Boolean);
      if (wrong.length < c.optionCount - 1) errs.push('Question ' + (i + 1) + ' needs at least ' + (c.optionCount - 1) + ' wrong answers (it has ' + wrong.length + ').');
      if (wrong.some((w) => w.toLowerCase() === q.correct.trim().toLowerCase())) errs.push('Question ' + (i + 1) + ': a wrong answer is identical to the correct one.');
    });
    return errs;
  }

  function editor(ctx) {
    const c = ctx.content; const root = h('div', { class: 'stack' });
    function draw() {
      EVG.replace(root, [
        h('div', { class: 'grid grid-2' },
          EVG.field('Answer options per question', h('select', { class: 'input', 'aria-label': 'Answer options', onchange: (e) => { c.optionCount = Number(e.target.value); ctx.changed(); } },
            [2, 3, 4, 5, 6].map((n) => h('option', { value: n, selected: n === c.optionCount }, n + ' options')))),
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: c.allowRetry, onchange: (e) => { c.allowRetry = e.target.checked; ctx.changed(); } }), 'Allow students to retry at the end')),
        c.questions.map((q, i) => h('div', { class: 'row-card stack tight' },
          h('div', { class: 'row between' }, h('span', { class: 'label nomb' }, 'Question ' + (i + 1)), EVG.button('ghost', 'trash', null, () => { c.questions.splice(i, 1); ctx.changed(); draw(); }, { 'aria-label': 'Remove question ' + (i + 1), class: 'icon-only' })),
          h('input', { class: 'input', placeholder: "Question (e.g. Which word means 'very tired'?)", value: q.prompt, 'aria-label': 'Question ' + (i + 1) + ' text', oninput: (e) => { q.prompt = e.target.value; ctx.changed(); } }),
          h('input', { class: 'input ok', placeholder: 'Correct answer', value: q.correct, 'aria-label': 'Question ' + (i + 1) + ' correct answer', oninput: (e) => { q.correct = e.target.value; ctx.changed(); } }),
          h('textarea', { class: 'input', rows: 3, placeholder: 'Wrong answers – one per line (at least ' + (c.optionCount - 1) + '; extras are used randomly)', value: q.wrong.join('\n'), 'aria-label': 'Question ' + (i + 1) + ' wrong answers', oninput: (e) => { q.wrong = e.target.value.split('\n'); ctx.changed(); } }),
          h('input', { class: 'input', placeholder: 'Explanation (optional)', value: q.explanation, 'aria-label': 'Question ' + (i + 1) + ' explanation', oninput: (e) => { q.explanation = e.target.value; ctx.changed(); } }))),
        h('div', null, EVG.button('soft', 'plus', 'Add question', () => { c.questions.push(newQ()); ctx.changed(); draw(); })),
      ]);
    }
    draw(); return root;
  }

  function player(game) {
    const c = game.content; const root = h('div', { class: 'game narrow stack' });
    const build = () => c.questions.map((q) => ({ q: q, options: EVG.shuffle([q.correct].concat(EVG.sample(q.wrong.map((w) => w.trim()).filter(Boolean), c.optionCount - 1))) }));
    let rounds = build(), i = 0, picked = null, score = 0, finished = false;

    function render() {
      if (finished) {
        const pct = Math.round((score / rounds.length) * 100);
        EVG.replace(root, EVG.completionCard({ title: pct === 100 ? 'Perfect score!' : 'Quiz complete', message: pct >= 70 ? 'Great work!' : 'Good effort — practice makes perfect.',
          stats: [{ label: 'Score', value: score + '/' + rounds.length }, { label: 'Percent', value: pct + '%' }], onRestart: c.allowRetry ? restart : null }));
        return;
      }
      const cur = rounds[i]; const answered = picked !== null; const right = picked === cur.q.correct;
      const kids = [EVG.progressBar(i + (answered ? 1 : 0), rounds.length, 'Question ' + (i + 1)), h('div', { class: 'card question' }, h('h3', null, cur.q.prompt)),
        h('div', { class: 'stack tight' }, cur.options.map((o) => {
          const isC = o === cur.q.correct, chosen = o === picked;
          return h('button', { type: 'button', class: 'option' + (answered && isC ? ' correct' : '') + (answered && chosen && !isC ? ' incorrect' : '') + (answered && !isC && !chosen ? ' faded' : ''),
            disabled: answered && !isC && !chosen, onclick: () => { if (answered) return; picked = o; if (o === cur.q.correct) score++; render(); } }, h('span', null, o), answered && isC ? EVG.icon('check', 18) : answered && chosen ? EVG.icon('x', 18) : null);
        }))];
      if (answered) {
        kids.push(EVG.feedback(right ? 'good' : 'bad', [right ? 'Correct!' : ['Not quite. The correct answer is ', h('strong', null, cur.q.correct), '.'], cur.q.explanation ? h('div', { class: 'muted' }, cur.q.explanation) : null]));
        kids.push(h('div', { class: 'row end' }, EVG.button('primary', 'arrowRight', i + 1 >= rounds.length ? 'See results' : 'Next', () => { if (i + 1 >= rounds.length) finished = true; else { i++; picked = null; } render(); })));
      }
      EVG.replace(root, kids);
    }
    function restart() { rounds = build(); i = 0; picked = null; score = 0; finished = false; render(); }
    render(); return root;
  }

  EVG.registerGame({
    type: 'multiple-choice', label: 'Multiple Choice', blurb: 'A quiz with one correct answer per question.',
    defaultInstructions: 'Read each question and choose the best answer.',
    blank: blank, validate: validate, editor: editor, player: player,
    fromVocab: function (list, current) {
      const withDef = list.entries.filter((e) => e.word.trim() && e.definition.trim());
      if (withDef.length < 3) return { content: current, message: 'Add definitions to at least 3 words in the list first.' };
      const questions = withDef.map((e) => ({ id: EVG.uid(), prompt: 'Which word matches this definition? “' + e.definition + '”', correct: e.word,
        wrong: EVG.sample(withDef.filter((o) => o.id !== e.id).map((o) => o.word), 5), explanation: e.example ? 'Example: ' + e.example : '' }));
      const optionCount = Math.min(current.optionCount, Math.max(2, withDef.length));
      return { content: Object.assign({}, current, { optionCount: optionCount, questions: questions }), message: 'Created ' + questions.length + ' questions (definition → word).' };
    },
  });
})();
