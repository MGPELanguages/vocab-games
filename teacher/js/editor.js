(function () {
  'use strict';
  const EVG = window.EVG; const h = EVG.h;

  EVG.pageTypeChooser = () => h('div', { class: 'stack lg' },
    h('div', null, h('h1', { class: 'page-title' }, 'Create a new game'), h('p', { class: 'muted' }, 'Choose a game type. The editor adapts to your choice.')),
    h('div', { class: 'grid grid-4' }, EVG.GAME_TYPES.map((t) => h('button', { type: 'button', class: 'card type-card', onclick: () => EVG.navigate('/new/' + t) }, h('h3', null, EVG.games[t].label), h('p', { class: 'muted' }, EVG.games[t].blurb)))));

  /** Editor page for both new (type [+ listId]) and existing (gameId) games. */
  EVG.pageEditor = function (opts) {
    const S = EVG.store; let draft; let note = '';
    const existing = opts.gameId ? S.games.find((g) => g.id === opts.gameId) : null;
    if (opts.gameId && !existing) return EVG.emptyState('Game not found', 'It may have been deleted.', EVG.button('primary', null, 'Back to library', () => EVG.navigate('/')));
    if (existing) draft = EVG.clone(existing);
    else {
      if (!EVG.games[opts.type]) return EVG.emptyState('Unknown game type', 'Choose a game type to continue.', EVG.button('primary', null, 'Choose type', () => EVG.navigate('/new')));
      const list = opts.listId ? S.vocab.find((l) => l.id === opts.listId) : null;
      draft = EVG.newGame(opts.type, list);
      if (list) { const r = EVG.games[opts.type].fromVocab && EVG.games[opts.type].fromVocab(list, draft.content, draft.difficulty, S.vocab); if (r) { draft.content = r.content; note = r.message; } draft.title = list.name + ' – ' + EVG.games[opts.type].label; }
    }
    const def = EVG.games[draft.type];
    const currentList = () => S.vocab.find((l) => l.id === draft.vocabListId) || null;
    const errorsHost = h('div'); const noteHost = h('div'); const editorHost = h('section', { class: 'editor-area' });
    const ctx = { content: draft.content, vocab: currentList, allVocab: () => S.vocab, difficulty: () => draft.difficulty,
      changed: () => { EVG.clear(errorsHost); }, redraw: drawEditor };
    function drawEditor() { ctx.content = draft.content; EVG.replace(editorHost, def.editor(ctx)); }
    const showErrors = (errs) => { EVG.replace(errorsHost, EVG.errorList(errs)); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const bind = (key) => (e) => { draft[key] = e.target.value; EVG.clear(errorsHost); };

    async function save() {
      const errs = EVG.validateGame(draft); if (errs.length) { showErrors(errs); return; }
      try { draft.title = draft.title.trim(); draft.updatedAt = EVG.now(); await S.saveGame(draft); EVG.toast(existing ? 'Changes saved' : 'Game saved'); EVG.navigate('/'); }
      catch (e) { showErrors([e.message]); }
    }
    function preview() {
      const errs = EVG.validateGame(Object.assign({}, draft, { title: draft.title || 'Preview' })); if (errs.length) { showErrors(errs); return; }
      EVG.modal({ title: 'Preview', wide: true, body: [EVG.gameIntro(Object.assign({}, draft, { title: draft.title || 'Untitled game' })), EVG.gamePlayer(EVG.clone(draft))] });
    }
    function fill() {
      const list = currentList(); if (!list || !def.fromVocab) return;
      const r = def.fromVocab(list, draft.content, draft.difficulty, S.vocab); draft.content = r.content; drawNote(r.message); drawEditor(); EVG.clear(errorsHost);
    }
    const drawNote = (t) => EVG.replace(noteHost, t ? EVG.feedback('info', t) : null);

    const students = Array.from(new Set(S.games.map((g) => g.student).filter(Boolean)));
    const topics = Array.from(new Set(S.games.map((g) => g.topic).concat(S.vocab.map((l) => l.topic)).filter(Boolean)));
    const fillBtn = def.fromVocab ? EVG.button('soft', 'star', def.type === 'connections' || def.type === 'odd-one-out' ? 'Draft from vocabulary list' : 'Fill from vocabulary list', fill, { disabled: !currentList() }) : null;
    const listSelect = h('select', { class: 'input', 'aria-label': 'Vocabulary list', onchange: (e) => { draft.vocabListId = e.target.value || undefined; if (fillBtn) fillBtn.disabled = !currentList(); drawEditor(); } },
      h('option', { value: '' }, '— none —'), S.vocab.map((l) => h('option', { value: l.id, selected: l.id === draft.vocabListId }, l.name + ' (' + l.entries.length + ' words)')));

    const root = h('div', { class: 'stack lg' },
      h('div', { class: 'row wrap' }, EVG.button('ghost', 'back', null, () => EVG.navigate('/'), { 'aria-label': 'Back to library', class: 'icon-only' }),
        h('div', null, h('h1', { class: 'page-title' }, existing ? 'Edit game' : 'New game'), h('p', { class: 'muted' }, def.label + ' — ' + def.blurb)),
        h('div', { class: 'row ml-auto' }, EVG.button('soft', 'eye', 'Preview', preview), EVG.button('primary', 'save', 'Save game', save))),
      errorsHost,
      h('section', { class: 'card pad grid grid-4' },
        EVG.field('Title', h('input', { class: 'input', value: draft.title, placeholder: 'e.g. Food connections', 'aria-label': 'Game title', oninput: bind('title') }), null, 'span2'),
        EVG.field('Student or group (optional)', h('input', { class: 'input', list: 'students', value: draft.student, placeholder: 'e.g. Sofía', 'aria-label': 'Student', oninput: bind('student') }), null, 'span2'),
        h('datalist', { id: 'students' }, students.map((s) => h('option', { value: s }))),
        EVG.field('Short description', h('input', { class: 'input', value: draft.description, placeholder: 'What is this activity about?', 'aria-label': 'Description', oninput: bind('description') }), null, 'span2'),
        EVG.field('Vocabulary topic', h('input', { class: 'input', list: 'topics', value: draft.topic, placeholder: 'e.g. Food', 'aria-label': 'Topic', oninput: bind('topic') })),
        h('datalist', { id: 'topics' }, topics.map((s) => h('option', { value: s }))),
        h('div', { class: 'grid grid-2 tight' },
          EVG.field('Level', h('select', { class: 'input', 'aria-label': 'Level', onchange: bind('level') }, EVG.LEVELS.map((l) => h('option', { selected: l === draft.level }, l)))),
          EVG.field('Difficulty', h('select', { class: 'input', 'aria-label': 'Difficulty', onchange: bind('difficulty') }, EVG.DIFFICULTIES.map((l) => h('option', { selected: l === draft.difficulty }, l))))),
        EVG.field('Instructions for students', h('textarea', { class: 'input', rows: 2, 'aria-label': 'Instructions', value: draft.instructions, oninput: bind('instructions') }), null, 'span4')),
      h('section', { class: 'card pad stack tight' }, h('div', { class: 'row wrap end-items' }, EVG.field('Vocabulary list (optional)', listSelect, null, 'grow'), fillBtn), noteHost),
      editorHost,
      h('div', { class: 'row end pb' }, EVG.button('ghost', null, 'Cancel', () => EVG.navigate('/')), EVG.button('soft', 'eye', 'Preview', preview), EVG.button('primary', 'save', 'Save game', save)));
    drawNote(note); drawEditor();
    return root;
  };
})();
