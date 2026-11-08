/* Teacher view (#/docente): read-only overview of every game and every student variant.
   Lets the teacher try any game and copy each student's link. Nothing here can change data. */
(function () {
  'use strict';
  const EVG = window.EVG; const h = EVG.h;
  const SLUG = EVG.SLUG_RE;
  const base = () => window.location.href.split('#')[0];

  async function copy(text) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; }
    catch (e) {
      try { const ta = h('textarea', { value: text, style: { position: 'fixed', opacity: '0' } }); document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); } catch (e2) { ok = false; }
    }
    EVG.toast(ok ? 'Link copied' : 'Could not copy the link', ok ? undefined : 'error');
  }
  const copyBtn = (getUrl, label, props) => EVG.button('soft', 'copy', label === undefined ? 'Copy link' : label, () => copy(getUrl()), props);

  EVG.pageOverview = function () {
    return EVG.asyncPage(async () => {
      const data = await EVG.getJson('index/_all.json');
      const state = { student: '', type: '' };
      const listHost = h('div', { class: 'stack lg' });

      const sel = (label, key, options) => h('select', { class: 'input auto', 'aria-label': label, onchange: (e) => { state[key] = e.target.value; draw(); } },
        options.map((o) => h('option', { value: o[0], selected: o[0] === state[key] }, o[1])));

      const studentRow = (s) => h('div', { class: 'row between wrap card-row' },
        h('div', null, h('strong', null, s.name), ' ', h('span', { class: 'muted small' }, s.count + ' game' + (s.count === 1 ? '' : 's') + ' · #/s/' + s.slug)),
        h('div', { class: 'row wrap tight' }, h('a', { class: 'btn btn-ghost sm', href: '#/s/' + s.slug, target: '_blank', rel: 'noopener' }, EVG.icon('eye', 16), h('span', null, 'Open')), copyBtn(() => base() + '#/s/' + s.slug, 'Copy link', { class: 'sm' })));

      function gameBlock(game, rows) {
        const first = rows[0];
        return h('article', { class: 'card pad stack tight' },
          h('div', { class: 'row between wrap' }, h('h3', null, game), h('span', { class: 'chip' }, EVG.games[first.type].label)),
          rows.map((r) => {
            // A "todos" file is shown to every student who has no file of their own in this game folder.
            const own = new Set(data.games.filter((x) => x.game === r.game && x.file !== 'todos').map((x) => x.file));
            const recipients = r.file === 'todos' ? data.students.filter((s) => !own.has(s.slug)) : [];
            const pick = r.file === 'todos' ? h('select', { class: 'input auto', 'aria-label': 'Student link to copy', disabled: !recipients.length }, recipients.map((s) => h('option', { value: s.slug }, s.name))) : null;
            return h('div', { class: 'row between wrap card-row' },
              h('div', null, h('strong', null, r.student || 'Every student'), ' ', h('span', { class: 'muted small' }, r.title + ' · ' + r.level + ' · ' + r.difficulty + (r.topic ? ' · ' + r.topic : ''))),
              h('div', { class: 'row wrap tight' },
                h('a', { class: 'btn btn-primary sm', href: '#/docente/play/' + r.game + '/' + r.file }, EVG.icon('play', 16), h('span', null, 'Try')),
                pick, copyBtn(() => base() + '#/s/' + (pick ? pick.value : r.file) + '/' + r.game, 'Copy link', { class: 'sm', disabled: pick ? !recipients.length : false })));
          }));
      }

      function draw() {
        const hasOwn = (g, slug) => data.games.some((x) => x.game === g.game && x.file === slug);
        const rows = data.games.filter((g) => (!state.type || g.type === state.type) &&
          (!state.student || g.file === state.student || (g.file === 'todos' && !hasOwn(g, state.student))));
        const groups = [];
        rows.forEach((r) => { let g = groups.find((x) => x.game === r.game); if (!g) { g = { game: r.game, rows: [] }; groups.push(g); } g.rows.push(r); });
        EVG.replace(listHost, groups.length ? groups.map((g) => gameBlock(g.rows.length === 1 ? g.rows[0].title : g.game, g.rows)) : EVG.emptyState('No games match', 'Try another filter.'));
      }

      const types = EVG.GAME_TYPES.filter((t) => data.games.some((g) => g.type === t));
      const root = h('div', { class: 'stack lg' },
        h('div', null, h('h1', { class: 'page-title' }, 'Teacher view'), h('p', { class: 'muted' }, 'Read-only. Try any game, see each student’s version, and copy their links.')),
        h('section', { class: 'card pad stack tight' }, h('h2', null, 'Student links'), data.students.length ? data.students.map(studentRow) : h('p', { class: 'muted' }, 'No students yet.')),
        h('section', { class: 'stack' },
          h('div', { class: 'row wrap between' }, h('h2', null, 'Games'),
            h('div', { class: 'row wrap' }, sel('Filter by student', 'student', [['', 'All students']].concat(data.students.map((s) => [s.slug, s.name]))), sel('Filter by game type', 'type', [['', 'All game types']].concat(types.map((t) => [t, EVG.games[t].label]))))),
          listHost));
      draw();
      return root;
    });
  };

  /** Try a game exactly as the student sees it (does not depend on a student index). */
  EVG.pageOverviewPlay = function (gameSlug, file) {
    return EVG.asyncPage(async () => {
      if (!SLUG.test(gameSlug) || !SLUG.test(file)) return EVG.notFound();
      const path = 'games/' + gameSlug + '/' + file + '.json';
      const r = EVG.prepareGame(await EVG.getJson(path), path, { random: true });
      if (!r.game) return EVG.emptyState('This game can’t be opened', r.errors ? r.errors.join(' ') : '');
      document.title = r.game.title + ' · English Vocabulary Games';
      return h('div', null,
        h('div', { class: 'mb' }, h('a', { class: 'btn btn-ghost', href: '#/docente' }, EVG.icon('back', 16), h('span', null, 'Teacher view'))),
        EVG.gameIntro(r.game), EVG.gamePlayer(r.game));
    });
  };
})();
