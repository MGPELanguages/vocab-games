(function () {
  'use strict';
  const EVG = window.EVG; const h = EVG.h;

  /** Plain-text import. One entry per line; fields separated by "|", a tab or ";":  word | definition | translation | example | part of speech */
  EVG.parseVocabText = function (text, topic, level) {
    const out = [];
    text.split(/\r?\n/).forEach((raw) => {
      const line = raw.trim(); if (!line) return;
      const sep = line.indexOf('|') >= 0 ? '|' : line.indexOf('\t') >= 0 ? '\t' : line.indexOf(';') >= 0 ? ';' : null;
      const f = (sep ? line.split(sep) : [line]).map((s) => s.trim()); if (!f[0]) return;
      out.push({ id: EVG.uid(), word: f[0], definition: f[1] || '', translation: f[2] || '', example: f[3] || '', pos: f[4] || '', image: '', topic: topic || '', level: level || '' });
    });
    return out;
  };

  EVG.pageVocabIndex = function () {
    const S = EVG.store;
    return h('div', { class: 'stack lg' },
      h('div', { class: 'row between wrap' }, h('div', null, h('h1', { class: 'page-title' }, 'Vocabulary bank'), h('p', { class: 'muted' }, 'Save a word list once, then turn it into any game type.')),
        EVG.button('primary', 'plus', 'New list', () => EVG.navigate('/vocab/new'))),
      !S.vocab.length ? EVG.emptyState('No vocabulary lists yet', 'Create a list, or paste words from a text file.', EVG.button('primary', null, 'Create a list', () => EVG.navigate('/vocab/new')))
        : h('div', { class: 'grid grid-3' }, S.vocab.map((l) => h('article', { class: 'card pad stack tight', 'data-testid': 'vocab-card' },
          h('div', { class: 'row between' }, h('h3', null, l.name), h('span', { class: 'chip' }, l.level)),
          h('p', { class: 'muted small' }, l.entries.length + ' words' + (l.topic ? ' · ' + l.topic : '')),
          h('p', { class: 'mute small clamp2' }, l.entries.slice(0, 8).map((e) => e.word).join(', ') + (l.entries.length > 8 ? '…' : '')),
          h('p', { class: 'mute small' }, 'Updated ' + EVG.formatDate(l.updatedAt)),
          h('div', { class: 'row card-actions' }, EVG.button('primary', null, 'Open / edit', () => EVG.navigate('/vocab/' + l.id), { class: 'sm' }),
            EVG.button('ghost', 'trash', null, async () => { if (await EVG.confirmDialog({ title: 'Delete this list?', message: '“' + l.name + '” will be removed. Games already created from it keep their content.' })) { await S.deleteVocab(l.id); EVG.toast('List deleted'); EVG.render(); } }, { class: 'sm icon-only danger-text ml-auto', 'aria-label': 'Delete list ' + l.name }))))));
  };

  const blankEntry = (topic, level) => ({ id: EVG.uid(), word: '', definition: '', translation: '', example: '', pos: '', image: '', topic: topic || '', level: level || '' });

  EVG.pageVocabEditor = function (listId) {
    const S = EVG.store; const isNew = listId === 'new';
    const existing = S.vocab.find((l) => l.id === listId);
    if (!isNew && !existing) return EVG.emptyState('List not found', 'It may have been deleted.', EVG.button('primary', null, 'Back to vocabulary bank', () => EVG.navigate('/vocab')));
    const list = isNew ? { id: EVG.uid(), name: '', topic: '', level: 'A2', entries: [blankEntry('', 'A2'), blankEntry('', 'A2'), blankEntry('', 'A2')], createdAt: EVG.now(), updatedAt: EVG.now() } : EVG.clone(existing);
    const errorsHost = h('div'); const rowsHost = h('div', { class: 'stack tight' });
    const bind = (key) => (e) => { list[key] = e.target.value; EVG.clear(errorsHost); };

    function drawRows() {
      const inp = (e, key, ph, label, i, extra) => h('input', { class: 'input' + (extra ? ' ' + extra : ''), placeholder: ph, value: e[key], 'aria-label': label + ' ' + (i + 1), oninput: (ev) => { e[key] = ev.target.value; } });
      EVG.replace(rowsHost, [list.entries.map((e, i) => h('div', { class: 'card pad-s', 'data-testid': 'vocab-entry' },
        h('div', { class: 'vocab-row' }, inp(e, 'word', 'Word', 'Word', i, 'strong'), inp(e, 'definition', 'Definition (English)', 'Definition', i), inp(e, 'translation', 'Spanish translation', 'Translation', i), inp(e, 'example', 'Example sentence', 'Example', i), inp(e, 'pos', 'noun / verb…', 'Part of speech', i),
          EVG.button('ghost', 'trash', null, () => { list.entries.splice(i, 1); drawRows(); }, { 'aria-label': 'Remove word ' + (i + 1), class: 'icon-only' })),
        h('details', { class: 'mt-s' }, h('summary', { class: 'small muted' }, 'More (image, topic, level)'),
          h('div', { class: 'grid grid-3 tight mt-s' }, inp(e, 'image', 'Image URL (optional)', 'Image', i), inp(e, 'topic', 'Topic', 'Topic', i),
            h('select', { class: 'input', 'aria-label': 'Level ' + (i + 1), onchange: (ev) => { e.level = ev.target.value; } }, h('option', { value: '' }, 'Level…'), EVG.LEVELS.map((l) => h('option', { selected: l === e.level }, l))))))),
        h('div', null, EVG.button('soft', 'plus', 'Add word', () => { list.entries.push(blankEntry(list.topic, list.level)); drawRows(); }))]);
    }

    async function save() {
      const errs = []; if (!list.name.trim()) errs.push('The list needs a name.');
      const filled = list.entries.filter((e) => e.word.trim()); if (!filled.length) errs.push('Add at least one word.');
      const seen = new Set(); filled.forEach((e) => { const k = e.word.trim().toLowerCase(); if (seen.has(k)) errs.push('“' + e.word + '” appears more than once.'); seen.add(k); });
      filled.forEach((e) => { if (e.image.trim() && !EVG.isHttpUrl(e.image)) errs.push('The image for “' + e.word + '” must be a web address starting with http(s)://.'); });
      if (errs.length) { EVG.replace(errorsHost, EVG.errorList(errs)); window.scrollTo({ top: 0, behavior: 'smooth' }); return false; }
      try { list.name = list.name.trim(); list.entries = filled; list.updatedAt = EVG.now(); await S.saveVocab(list); EVG.clear(errorsHost); EVG.toast('List saved'); return true; }
      catch (e) { EVG.replace(errorsHost, EVG.errorList([e.message])); return false; }
    }
    function openImport() {
      const ta = h('textarea', { class: 'input mono', rows: 9, 'aria-label': 'Text to import', placeholder: 'apple | a round fruit | manzana | I eat an apple. | noun\nbanana\ncherry | a small red fruit | cereza' });
      const m = EVG.modal({ title: 'Import words from text', wide: true, body: h('div', { class: 'stack tight' },
        h('p', { class: 'muted' }, 'One word per line. To add more details, separate the fields with ', h('code', null, '|'), ' in this order:'),
        h('pre', { class: 'code' }, 'word | definition | Spanish translation | example sentence | part of speech'), ta,
        h('div', { class: 'row end' }, EVG.button('ghost', null, 'Cancel', () => m.close()), EVG.button('primary', null, 'Import', () => {
          const parsed = EVG.parseVocabText(ta.value, list.topic, list.level); if (!parsed.length) { EVG.toast('Nothing to import', 'error'); return; }
          const have = new Set(list.entries.map((e) => e.word.trim().toLowerCase())); const fresh = parsed.filter((e) => !have.has(e.word.toLowerCase()));
          list.entries = list.entries.filter((e) => e.word.trim() || e.definition.trim()).concat(fresh); drawRows();
          EVG.toast('Imported ' + fresh.length + ' word' + (fresh.length === 1 ? '' : 's') + (parsed.length - fresh.length ? ' (' + (parsed.length - fresh.length) + ' duplicates skipped)' : '')); m.close();
        }))) });
    }

    drawRows();
    return h('div', { class: 'stack lg' },
      h('div', { class: 'row wrap' }, EVG.button('ghost', 'back', null, () => EVG.navigate('/vocab'), { 'aria-label': 'Back', class: 'icon-only' }), h('h1', { class: 'page-title' }, isNew ? 'New vocabulary list' : 'Edit list'),
        h('div', { class: 'row ml-auto' }, EVG.button('soft', 'upload', 'Import from text', openImport), EVG.button('primary', 'save', 'Save list', async () => { if (await save() && isNew) EVG.navigate('/vocab/' + list.id); }))),
      errorsHost,
      h('section', { class: 'card pad grid grid-3' },
        EVG.field('List name', h('input', { class: 'input', value: list.name, placeholder: 'e.g. Food & Cooking', 'aria-label': 'List name', oninput: bind('name') })),
        EVG.field('Topic', h('input', { class: 'input', value: list.topic, placeholder: 'e.g. Food', 'aria-label': 'List topic', oninput: bind('topic') })),
        EVG.field('Level', h('select', { class: 'input', 'aria-label': 'List level', onchange: bind('level') }, EVG.LEVELS.map((l) => h('option', { selected: l === list.level }, l))))),
      rowsHost,
      isNew ? null : h('section', { class: 'card pad stack tight' }, h('h2', null, 'Create a game from this list'),
        h('p', { class: 'muted' }, 'Your changes are saved first. The editor opens with the game pre-filled from this list.'),
        h('div', { class: 'row wrap' }, EVG.GAME_TYPES.map((t) => EVG.button('soft', null, EVG.games[t].label, async () => { if (await save()) EVG.navigate('/new/' + t + '/' + list.id); })))));
  };
})();
