/* Local editor only: turn a saved game into the JSON file the student site reads
   (games/<game-folder>/<student>.json), and clipboard/download helpers. */
(function () {
  'use strict';
  const EVG = window.EVG; const h = EVG.h;

  EVG.slugify = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const stripIds = (x) => {
    if (Array.isArray(x)) return x.map(stripIds);
    if (x && typeof x === 'object') { const o = {}; Object.keys(x).forEach((k) => { if (k !== 'id') o[k] = stripIds(x[k]); }); return o; }
    return x;
  };

  /** Public JSON: no ids/dates, and no generated grids (the site generates them from the word list). */
  EVG.toPublicGame = function (g) {
    let content = stripIds(g.content);
    if (g.type === 'word-search') content = { words: content.words, size: content.size, directions: content.directions };
    if (g.type === 'crossword') content = { entries: content.entries, allowReveal: content.allowReveal };
    const out = { type: g.type, title: g.title, description: g.description, student: g.student, level: g.level, topic: g.topic, difficulty: g.difficulty, instructions: g.instructions, content: content };
    Object.keys(out).forEach((k) => { if (out[k] === '' || out[k] == null) delete out[k]; });
    return out;
  };

  EVG.copyText = async function (text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      try { const ta = h('textarea', { value: text, style: { position: 'fixed', opacity: '0' } }); document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; }
      catch (e2) { return false; }
    }
  };

  EVG.downloadText = function (filename, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = h('a', { href: url, download: filename }); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  EVG.exportGame = function (game) {
    const json = JSON.stringify(EVG.toPublicGame(game), null, 2) + '\n';
    const folder = h('input', { class: 'input', value: EVG.slugify(game.title) || 'new-game', 'aria-label': 'Game folder' });
    const file = h('input', { class: 'input', value: EVG.slugify(game.student) || 'todos', 'aria-label': 'Student file' });
    const pathEl = h('code', null); const linkEl = h('code', null);
    const draw = () => {
      const f = EVG.slugify(folder.value) || 'new-game', s = EVG.slugify(file.value) || 'todos';
      pathEl.textContent = 'games/' + f + '/' + s + '.json'; linkEl.textContent = s === 'todos' ? 'every student (file “todos”)' : 'index.html#/s/' + s;
    };
    folder.addEventListener('input', draw); file.addEventListener('input', draw); draw();
    const m = EVG.modal({ title: 'Export game as JSON', wide: true, body: h('div', { class: 'stack' },
      h('p', { class: 'muted' }, 'Save the file inside the repository folder shown below, commit it, and the game appears on the student’s page after the next deploy.'),
      h('div', { class: 'grid grid-2' },
        EVG.field('Game folder', folder, 'One folder per game; each student has a file inside.'),
        EVG.field('Student file', file, 'Use “todos” for a game every student should see.')),
      h('p', null, 'Path: ', pathEl), h('p', null, 'Appears for: ', linkEl),
      h('textarea', { class: 'input mono', rows: 10, readOnly: true, value: json, 'aria-label': 'Game JSON' }),
      h('div', { class: 'row end' },
        EVG.button('ghost', 'copy', 'Copy JSON', async () => EVG.toast((await EVG.copyText(json)) ? 'JSON copied' : 'Could not copy', 'info')),
        EVG.button('primary', 'download', 'Download file', () => { EVG.downloadText((EVG.slugify(file.value) || 'todos') + '.json', json); m.close(); }))) });
  };
})();
