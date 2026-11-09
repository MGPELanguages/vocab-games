/* Student pages (read-only). Each student has a personal link: #/s/<student>.
   Games come from index/<student>.json and games/<game>/<student>.json, generated at deploy time. */
(function () {
  'use strict';
  const EVG = window.EVG; const h = EVG.h;
  const SLUG = EVG.SLUG_RE;

  async function getJson(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) { const e = new Error('HTTP ' + res.status); e.status = res.status; throw e; }
    return res.json();
  }
  const notFound = (text) => EVG.emptyState('We couldn’t find that page', text || 'Check the link your teacher sent you.');
  const loading = () => h('p', { class: 'loading' }, 'Loading…');

  /** Async page: returns a placeholder right away and fills it when the data arrives. */
  function asyncPage(work) {
    const host = h('div', null, loading());
    work().then((node) => EVG.replace(host, node)).catch((err) => {
      console.error(err);
      EVG.replace(host, notFound(err && err.status === 404 ? null : 'Something went wrong while loading. Please try again in a moment.'));
    });
    return host;
  }

  Object.assign(EVG, { getJson: getJson, notFound: notFound, asyncPage: asyncPage });

  EVG.pageHome = () => EVG.emptyState('Welcome to English Vocabulary Games', 'Open the personal link your teacher gave you to see your games.');

  EVG.pageStudentGames = function (slug) {
    return asyncPage(async () => {
      if (!SLUG.test(slug)) return notFound();
      const idx = await getJson('index/' + slug + '.json');
      document.title = idx.name + ' · English Vocabulary Games';
      const topics = Array.from(new Set(idx.games.map((g) => g.topic).filter(Boolean))).sort();
      let topic = '';
      const listHost = h('div', { class: 'stack lg' }); const filterHost = h('div', { class: 'row wrap tight' });
      function draw() {
        const games = idx.games.filter((g) => !topic || g.topic === topic);
        const types = EVG.GAME_TYPES.filter((t) => games.some((g) => g.type === t));
        EVG.replace(filterHost, topics.length < 2 ? null : [['', 'All topics']].concat(topics.map((t) => [t, t])).map((o) =>
          h('button', { type: 'button', class: 'pill' + (topic === o[0] ? ' active' : ''), 'aria-pressed': String(topic === o[0]), onclick: () => { topic = o[0]; draw(); } }, o[1])));
        EVG.replace(listHost, types.map((t) => h('section', { class: 'stack' },
          h('div', null, h('h2', null, EVG.games[t].label), h('p', { class: 'muted small' }, EVG.games[t].blurb)),
          h('div', { class: 'grid grid-3' }, games.filter((g) => g.type === t).map((g) => card(slug, g, EVG.GAME_TYPES.indexOf(t)))))));
      }
      draw();
      return h('div', { class: 'stack lg' },
        h('div', null, h('h1', { class: 'page-title' }, 'Hi, ' + idx.name + '!'), h('p', { class: 'muted' }, 'Choose a game to play.')),
        filterHost, listHost);
    });
  };

  function card(slug, g, tint) {
    return h('article', { class: 'card game-card' },
      h('div', { class: 'card-top pastel-' + tint }, h('span', null, EVG.games[g.type].label), h('span', null, g.level + ' · ' + g.difficulty)),
      h('div', { class: 'card-body stack tight' },
        h('h3', null, g.title), g.description ? h('p', { class: 'muted clamp2' }, g.description) : null,
        g.topic ? h('div', { class: 'row wrap tight' }, h('span', { class: 'chip' }, g.topic)) : null,
        h('div', { class: 'row wrap card-actions' }, h('a', { class: 'btn btn-primary sm', href: '#/s/' + slug + '/' + g.type + '/' + g.file }, EVG.icon('play', 16), h('span', null, 'Play')))));
  }

  EVG.pageStudentGame = function (slug, type, file) {
    return asyncPage(async () => {
      if (!SLUG.test(slug) || !EVG.games[type] || !EVG.FILE_RE.test(file)) return notFound();
      const idx = await getJson('index/' + slug + '.json');
      const entry = idx.games.find((g) => g.type === type && g.file === file);
      if (!entry) return notFound();
      const r = EVG.prepareGame(await getJson(entry.path), entry.path, { random: true, type: type });
      if (!r.game) return EVG.emptyState('This game can’t be opened right now', 'Please tell your teacher.');
      document.title = r.game.title + ' · English Vocabulary Games';
      return h('div', null,
        h('div', { class: 'mb' }, h('a', { class: 'btn btn-ghost', href: '#/s/' + slug }, EVG.icon('back', 16), h('span', null, 'All games'))),
        EVG.gameIntro(r.game), EVG.gamePlayer(r.game));
    });
  };
})();
