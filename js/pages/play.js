(function () {
  'use strict';
  const EVG = window.EVG; const h = EVG.h;

  EVG.gameIntro = (game) => h('div', { class: 'intro' },
    h('h1', null, game.title),
    h('div', { class: 'row center wrap tight' }, h('span', { class: 'chip' }, EVG.games[game.type].label), h('span', { class: 'chip' }, game.level), game.topic ? h('span', { class: 'chip' }, game.topic) : null, h('span', { class: 'chip' }, game.difficulty)),
    game.description ? h('p', { class: 'muted' }, game.description) : null,
    game.instructions ? h('p', { class: 'note' }, h('strong', null, 'How to play: '), game.instructions) : null);

  EVG.gamePlayer = (game) => EVG.games[game.type].player(game);
})();
