(function () {
  'use strict';
  const EVG = window.EVG; const h = EVG.h;
  const TINT = { connections: 0, matching: 1, 'multiple-choice': 2, 'fill-blanks': 3, scramble: 4, 'odd-one-out': 5, 'word-search': 6, crossword: 7 };
  const state = { q: '', type: '', level: '', student: '', topic: '', sort: 'new' };

  EVG.pageLibrary = function () {
    const S = EVG.store; const root = h('div', { class: 'stack lg' });
    const listHost = h('div'); const countEl = h('p', { class: 'muted small' });
    const distinct = (key) => Array.from(new Set(S.games.map((g) => g[key]).filter(Boolean))).sort();
    const opt = (v, label, cur) => h('option', { value: v, selected: v === cur }, label);
    const sel = (label, cur, options, key) => h('select', { class: 'input auto', 'aria-label': label, onchange: (e) => { state[key] = e.target.value; refresh(); } }, options.map((o) => opt(o[0], o[1], cur)));

    const fileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'hidden', 'aria-label': 'Backup file', onchange: async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const r = EVG.parseBackup(await f.text());
      if (r.error) { EVG.toast(r.error, 'error'); return; }
      for (const l of r.vocab) await S.saveVocab(l);
      for (const g of r.games) await S.saveGame(g);
      EVG.toast('Restored ' + r.games.length + ' game' + (r.games.length === 1 ? '' : 's') + ' and ' + r.vocab.length + ' list' + (r.vocab.length === 1 ? '' : 's'));
      fileInput.value = ''; EVG.render();
    } });

    const search = h('input', { class: 'input pad-l', placeholder: 'Search by title, student, topic…', 'aria-label': 'Search games', value: state.q, oninput: (e) => { state.q = e.target.value; refresh(); } });
    const filters = h('div', { class: 'row wrap' },
      sel('Filter by game type', state.type, [['', 'All game types']].concat(EVG.GAME_TYPES.map((t) => [t, EVG.games[t].label])), 'type'),
      sel('Filter by level', state.level, [['', 'All levels']].concat(EVG.LEVELS.map((l) => [l, l])), 'level'),
      sel('Filter by student', state.student, [['', 'All students']].concat(distinct('student').map((s) => [s, s])), 'student'),
      sel('Filter by topic', state.topic, [['', 'All topics']].concat(distinct('topic').map((s) => [s, s])), 'topic'),
      h('div', { class: 'ml-auto row' }, sel('Sort games', state.sort, [['new', 'Newest first'], ['old', 'Oldest first'], ['modified', 'Recently modified'], ['az', 'A → Z'], ['za', 'Z → A']], 'sort'),
        EVG.button('ghost', null, 'Clear filters', () => { Object.assign(state, { q: '', type: '', level: '', student: '', topic: '' }); EVG.render(); }, { 'data-clear': '1' })));

    function card(g) {
      return h('article', { class: 'card game-card', 'data-testid': 'game-card' },
        h('div', { class: 'card-top pastel-' + TINT[g.type] }, h('span', null, EVG.games[g.type].label), h('span', null, g.level + ' · ' + g.difficulty)),
        h('div', { class: 'card-body stack tight' },
          h('h3', null, g.title), g.description ? h('p', { class: 'muted clamp2' }, g.description) : null,
          h('div', { class: 'row wrap tight' }, g.topic ? h('span', { class: 'chip' }, g.topic) : null, g.student ? h('span', { class: 'chip brand' }, g.student) : null),
          h('p', { class: 'mute small mt-auto' }, 'Created ' + EVG.formatDate(g.createdAt) + ' · Modified ' + EVG.formatDate(g.updatedAt)),
          h('div', { class: 'row wrap card-actions' },
            EVG.button('primary', 'play', 'Play', () => EVG.navigate('/play/' + g.id), { class: 'sm' }),
            EVG.button('ghost', 'edit', 'Edit', () => EVG.navigate('/edit/' + g.id), { class: 'sm', 'aria-label': 'Edit ' + g.title }),
            EVG.button('ghost', 'copy', null, async () => { const c = await S.duplicateGame(g.id); if (c) { EVG.toast('Game duplicated'); EVG.render(); } }, { class: 'sm icon-only', title: 'Duplicate', 'aria-label': 'Duplicate ' + g.title }),
            EVG.button('soft', 'download', 'Export', () => EVG.exportGame(g), { class: 'sm', title: 'Export as JSON for the student site', 'aria-label': 'Export ' + g.title }),
            EVG.button('ghost', 'trash', null, async () => {
              if (await EVG.confirmDialog({ title: 'Delete this game?', message: '“' + g.title + '” will be permanently removed from this device.' })) { await S.deleteGame(g.id); EVG.toast('Game deleted'); EVG.render(); }
            }, { class: 'sm icon-only danger-text ml-auto', title: 'Delete', 'aria-label': 'Delete ' + g.title }))));
    }

    function refresh() {
      const term = state.q.trim().toLowerCase();
      let list = S.games.filter((g) => (!state.type || g.type === state.type) && (!state.level || g.level === state.level) && (!state.student || g.student === state.student) && (!state.topic || g.topic === state.topic) &&
        (!term || [g.title, g.description, g.student, g.topic, EVG.games[g.type].label].some((s) => String(s || '').toLowerCase().indexOf(term) >= 0)));
      const cmp = { new: (a, b) => b.createdAt.localeCompare(a.createdAt), old: (a, b) => a.createdAt.localeCompare(b.createdAt), modified: (a, b) => b.updatedAt.localeCompare(a.updatedAt), az: (a, b) => a.title.localeCompare(b.title), za: (a, b) => b.title.localeCompare(a.title) }[state.sort];
      list = list.slice().sort(cmp);
      countEl.textContent = S.games.length + ' game' + (S.games.length === 1 ? '' : 's') + ' saved on this device' + (list.length !== S.games.length ? ' · showing ' + list.length : '');
      if (!S.games.length) EVG.replace(listHost, EVG.emptyState('No games yet', 'Create your first vocabulary game, or load the sample games to see how everything works.', h('div', { class: 'row center' }, EVG.button('primary', null, 'Create a game', () => EVG.navigate('/new')), EVG.button('soft', 'star', 'Load samples', async () => { await S.restoreSamples(); EVG.render(); }))));
      else if (!list.length) EVG.replace(listHost, EVG.emptyState('No games match your filters', 'Try a different search or clear the filters.'));
      else EVG.replace(listHost, h('div', { class: 'grid grid-3' }, list.map(card)));
    }

    root.append(
      h('div', { class: 'row between wrap' }, h('div', null, h('h1', { class: 'page-title' }, 'Game library'), countEl),
        h('div', { class: 'row' },
          EVG.button('ghost', 'download', 'Back up', () => { EVG.downloadText('vocabulary-games-backup-' + new Date().toISOString().slice(0, 10) + '.json', EVG.buildBackup(S.games, S.vocab)); EVG.toast('Backup downloaded'); }, { title: 'Download all games and vocabulary lists as a file' }),
          EVG.button('ghost', 'upload', 'Restore', () => fileInput.click(), { title: 'Restore from a backup file' }), fileInput)),
      h('div', { class: 'card pad stack tight' }, h('div', { class: 'search' }, EVG.icon('search', 16), search), filters),
      listHost);
    refresh(); return root;
  };
})();
