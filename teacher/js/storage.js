/* Persistence. The rest of the app only uses EVG.store, which talks to EVG.repo.
   To move to a cloud database later (e.g. Supabase), provide another object with the
   same async methods as EVG.repo — no UI code has to change. */
(function () {
  'use strict';
  const EVG = window.EVG;
  const K = { games: 'evg:v1:games', vocab: 'evg:v1:vocab', seeded: 'evg:v1:seeded', settings: 'evg:v1:settings' };
  let useMemory = false; const memory = {};
  try { localStorage.setItem('evg:probe', '1'); localStorage.removeItem('evg:probe'); } catch (e) { useMemory = true; }
  EVG.storageIsVolatile = useMemory;   // true if the browser blocks storage → work is lost on refresh

  function read(key, fallback) {
    try { const raw = useMemory ? memory[key] : localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
  }
  function write(key, value) {
    const s = JSON.stringify(value);
    try { if (useMemory) memory[key] = s; else localStorage.setItem(key, s); }
    catch (e) { throw new Error('Could not save: browser storage is full or disabled.'); }
  }
  const upsert = (list, item) => { const i = list.findIndex((x) => x.id === item.id); if (i >= 0) list[i] = item; else list.push(item); return list; };

  EVG.repo = {
    async listGames() { return read(K.games, []); },
    async saveGame(g) { write(K.games, upsert(read(K.games, []), g)); },
    async deleteGame(id) { write(K.games, read(K.games, []).filter((g) => g.id !== id)); },
    async listVocab() { return read(K.vocab, []); },
    async saveVocab(l) { write(K.vocab, upsert(read(K.vocab, []), l)); },
    async deleteVocab(id) { write(K.vocab, read(K.vocab, []).filter((l) => l.id !== id)); },
    async getSettings() { return Object.assign({ publicUrl: '' }, read(K.settings, {})); },
    async saveSettings(s) { write(K.settings, s); },
    isSeeded() { return read(K.seeded, false) === true; },
    markSeeded() { try { write(K.seeded, true); } catch (e) { /* ignore */ } },
  };

  EVG.store = {
    games: [], vocab: [], settings: { publicUrl: '' }, ready: false,
    async load() {
      if (!EVG.repo.isSeeded()) {
        const seed = EVG.buildSeed();
        for (const l of seed.vocab) await EVG.repo.saveVocab(l);
        for (const g of seed.games) await EVG.repo.saveGame(g);
        EVG.repo.markSeeded();
      }
      await this.reload(); this.settings = await EVG.repo.getSettings(); this.ready = true;
    },
    async reload() { this.games = await EVG.repo.listGames(); this.vocab = await EVG.repo.listVocab(); },
    async saveGame(g) { await EVG.repo.saveGame(g); await this.reload(); },
    async deleteGame(id) { await EVG.repo.deleteGame(id); await this.reload(); },
    async duplicateGame(id) {
      const src = this.games.find((g) => g.id === id); if (!src) return null;
      const copy = Object.assign(EVG.clone(src), { id: EVG.uid(), title: src.title + ' (copy)', createdAt: EVG.now(), updatedAt: EVG.now() });
      await EVG.repo.saveGame(copy); await this.reload(); return copy;
    },
    async saveVocab(l) { await EVG.repo.saveVocab(l); await this.reload(); },
    async deleteVocab(id) { await EVG.repo.deleteVocab(id); await this.reload(); },
    async saveSettings(s) { await EVG.repo.saveSettings(s); this.settings = s; },
    async restoreSamples() {
      const seed = EVG.buildSeed();
      for (const l of seed.vocab) await EVG.repo.saveVocab(l);
      for (const g of seed.games) await EVG.repo.saveGame(g);
      await this.reload();
    },
  };

  /* ── backup / restore ── */
  EVG.buildBackup = (games, vocab) => JSON.stringify({ app: 'english-vocabulary-games', version: 1, exportedAt: EVG.now(), games: games, vocab: vocab }, null, 2);
  EVG.parseBackup = function (text) {
    try {
      const b = JSON.parse(text);
      if (!b || b.app !== 'english-vocabulary-games' || !Array.isArray(b.games) || !Array.isArray(b.vocab)) return { games: [], vocab: [], error: 'This file is not a backup from English Vocabulary Games.' };
      const games = b.games.filter((g) => g && typeof g.id === 'string' && EVG.games[g.type] && EVG.games[g.type].validate(g.content).length === 0);
      const vocab = b.vocab.filter((l) => l && typeof l.id === 'string' && Array.isArray(l.entries));
      return { games: games, vocab: vocab };
    } catch (e) { return { games: [], vocab: [], error: 'The file could not be read. Is it a valid backup (.json)?' }; }
  };
})();
