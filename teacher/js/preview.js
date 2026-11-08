(function () {
  'use strict';
  const EVG = window.EVG; const h = EVG.h;

  /** Preview of a saved game (#/play/:id) */
  EVG.pageTeacherPlay = function (id) {
    const game = EVG.store.games.find((g) => g.id === id);
    if (!game) return EVG.emptyState('Game not found', 'It may have been deleted.', EVG.button('primary', null, 'Back to library', () => EVG.navigate('/')));
    return h('div', null,
      h('div', { class: 'banner row wrap' }, h('strong', null, 'Preview'), h('span', { class: 'muted hide-sm' }, '— this is what the student will see.'),
        h('div', { class: 'row wrap ml-auto' }, EVG.button('ghost', 'back', 'Library', () => EVG.navigate('/')), EVG.button('ghost', 'edit', 'Edit', () => EVG.navigate('/edit/' + game.id)), EVG.button('soft', 'download', 'Export JSON', () => EVG.exportGame(game)))),
      EVG.gameIntro(game), EVG.gamePlayer(game));
  };
})();
