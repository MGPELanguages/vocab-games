/* Teacher view (#/docente): read-only overview of every game file and every student.
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
  const copyBtn = (getUrl, props) => EVG.button('soft', 'copy', 'Copy link', () => copy(getUrl()), props);

  EVG.pageOverview = function () {
    return EVG.asyncPage(async () => {
      const data = await EVG.getJson('index/_all.json');
      const state = { student: '', type: '', topic: '' };
      const listHost = h('div', { class: 'stack lg' });

      const sel = (label, key, options) => h('select', { class: 'input auto', 'aria-label': label, onchange: (e) => { state[key] = e.target.value; draw(); } },
        options.map((o) => h('option', { value: o[0], selected: o[0] === state[key] }, o[1])));

      const studentRow = (s) => h('div', { class: 'row between wrap card-row' },
        h('div', null, h('strong', null, s.name), ' ', h('span', { class: 'muted small' }, s.count + ' game' + (s.count === 1 ? '' : 's') + ' · #/s/' + s.slug)),
        h('div', { class: 'row wrap tight' }, h('a', { class: 'btn btn-ghost sm', href: '#/s/' + s.slug, target: '_blank', rel: 'noopener' }, EVG.icon('eye', 16), h('span', null, 'Open')), copyBtn(() => base() + '#/s/' + s.slug, { class: 'sm' })));

      function gameRow(r) {
        const pick = r.studentSlug === 'todos' ? h('select', { class: 'input auto', 'aria-label': 'Student link to copy', disabled: !data.students.length }, data.students.map((s) => h('option', { value: s.slug }, s.name))) : null;
        return h('div', { class: 'row between wrap card-row' },
          h('div', null, h('strong', null, r.title), ' ', h('span', { class: 'muted small' }, (r.student || 'Every student') + ' · ' + r.level + ' · ' + r.difficulty + (r.topic ? ' · ' + r.topic : '') + ' · ' + r.file + '.json')),
          h('div', { class: 'row wrap tight' },
            h('a', { class: 'btn btn-primary sm', href: '#/docente/play/' + r.type + '/' + r.file }, EVG.icon('play', 16), h('span', null, 'Try')),
            pick, copyBtn(() => base() + '#/s/' + (pick ? pick.value : r.studentSlug) + '/' + r.type + '/' + r.file, { class: 'sm', disabled: pick ? !data.students.length : false })));
      }

      function draw() {
        const rows = data.games.filter((g) => (!state.type || g.type === state.type) && (!state.topic || g.topic === state.topic) &&
          (!state.student || g.studentSlug === state.student || g.studentSlug === 'todos'));
        const types = EVG.GAME_TYPES.filter((t) => rows.some((r) => r.type === t));
        EVG.replace(listHost, types.length ? types.map((t) => h('article', { class: 'card pad stack tight' },
          h('h3', null, EVG.games[t].label), rows.filter((r) => r.type === t).map(gameRow))) : EVG.emptyState('No games match', 'Try another filter.'));
      }

      const typesIn = EVG.GAME_TYPES.filter((t) => data.games.some((g) => g.type === t));
      const topics = Array.from(new Set(data.games.map((g) => g.topic).filter(Boolean))).sort();
      draw();
      return h('div', { class: 'stack lg' },
        h('div', null, h('h1', { class: 'page-title' }, 'Teacher view'), h('p', { class: 'muted' }, 'Read-only. Try any game, see every student’s games, and copy their links.')),
        h('section', { class: 'card pad stack tight' }, h('h2', null, 'Student links'), data.students.length ? data.students.map(studentRow) : h('p', { class: 'muted' }, 'No students yet.')),
        h('section', { class: 'stack' },
          h('div', { class: 'row wrap between' }, h('h2', null, 'Games'),
            h('div', { class: 'row wrap' },
              sel('Filter by student', 'student', [['', 'All students']].concat(data.students.map((s) => [s.slug, s.name]))),
              sel('Filter by game type', 'type', [['', 'All game types']].concat(typesIn.map((t) => [t, EVG.games[t].label]))),
              sel('Filter by topic', 'topic', [['', 'All topics']].concat(topics.map((t) => [t, t]))))),
          listHost));
    });
  };

  /** Try a game exactly as the student sees it (does not depend on a student index). */
  EVG.pageOverviewPlay = function (type, file) {
    return EVG.asyncPage(async () => {
      if (!EVG.games[type] || !EVG.FILE_RE.test(file)) return EVG.notFound();
      const path = 'games/' + type + '/' + file + '.json';
      const r = EVG.prepareGame(await EVG.getJson(path), path, { random: true, type: type });
      if (!r.game) return EVG.emptyState('This game can’t be opened', r.errors ? r.errors.join(' ') : '');
      document.title = r.game.title + ' · English Vocabulary Games';
      return h('div', null,
        h('div', { class: 'mb' }, h('a', { class: 'btn btn-ghost', href: '#/docente' }, EVG.icon('back', 16), h('span', null, 'Teacher view'))),
        EVG.gameIntro(r.game), EVG.gamePlayer(r.game));
    });
  };
})();
