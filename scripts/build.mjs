// Validates every game in games/ and builds the publishable site into _site/.
//   node scripts/build.mjs           → validate + build _site/
//   node scripts/build.mjs --check   → validate only
// Layout:  games/<game-type>/<student>_<n>.json      (e.g. games/connections/sofia_1.json; "todos_1" = every student)
// Output:  index/<student>.json  (list of games of that student; students never download each other's list)
// The editor (teacher/), scripts/ and docs are never copied to _site.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const rel = (p) => path.relative(root, p).split(path.sep).join('/');

/* ── load the same game code the browser uses ── */
const ctx = { console, crypto: globalThis.crypto };
ctx.window = ctx;
vm.createContext(ctx);
const load = (f) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
['js/lib/util.js', 'js/lib/wordsearch.js', 'js/lib/crossword.js'].forEach(load);
['connections', 'matching', 'multiple-choice', 'fill-blanks', 'scramble', 'odd-one-out', 'word-search', 'crossword'].forEach((g) => load(`js/games/${g}.js`));
load('js/lib/loader.js');
const EVG = ctx.EVG;

/* ── scan games/ ── */
const errors = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);
const gamesDir = path.join(root, 'games');
const files = [];               // { type, file, student, path, g }
const names = new Map();        // student slug → display name
let count = 0;

for (const typeEntry of fs.existsSync(gamesDir) ? fs.readdirSync(gamesDir, { withFileTypes: true }) : []) {
  if (typeEntry.name.startsWith('.')) continue;
  const tp = `games/${typeEntry.name}`;
  if (!typeEntry.isDirectory()) { fail(tp, 'Only folders are allowed directly inside games/ (one per game type).'); continue; }
  if (EVG.GAME_TYPES.indexOf(typeEntry.name) < 0) { fail(tp, `The folder name must be a game type: ${EVG.GAME_TYPES.join(', ')}.`); continue; }
  for (const f of fs.readdirSync(path.join(gamesDir, typeEntry.name), { withFileTypes: true })) {
    if (f.name.startsWith('.')) continue;
    const fp = `${tp}/${f.name}`;
    if (!f.isFile() || !f.name.endsWith('.json')) { fail(fp, 'Only .json files are allowed here (e.g. "sofia_1.json").'); continue; }
    const file = f.name.slice(0, -5);
    if (!EVG.FILE_RE.test(file)) { fail(fp, 'The file name must be <student>_<number>.json in lowercase, without accents or spaces (e.g. "sofia_1.json"; "todos_1.json" = every student).'); continue; }
    const student = EVG.studentOfFile(file);
    let raw;
    try { raw = JSON.parse(fs.readFileSync(path.join(gamesDir, typeEntry.name, f.name), 'utf8')); }
    catch (e) { fail(fp, `This is not valid JSON (${e.message}).`); continue; }
    if (raw && raw.type && raw.type !== typeEntry.name) { fail(fp, `The file is in the "${typeEntry.name}" folder but its "type" is "${raw.type}". Move it to games/${raw.type}/ or fix the type.`); continue; }
    const opts = { type: typeEntry.name };
    const r = EVG.prepareGame(raw, fp, opts);
    if (!r.game) { r.errors.forEach((m) => fail(fp, m)); continue; }
    // students get a random puzzle each time, so make sure several different seeds all work
    let bad = null;
    for (let i = 1; i <= 8 && !bad; i++) { const t = EVG.prepareGame(raw, fp, { type: typeEntry.name, seed: fp + '#check' + i }); if (!t.game) bad = t.errors; }
    if (bad) { bad.forEach((m) => fail(fp, m + ' (happens with some random layouts: use fewer or shorter words)')); continue; }
    count++;
    files.push({ type: typeEntry.name, file, student, path: fp, g: r.game });
    if (student !== 'todos' && r.game.student && !names.has(student)) names.set(student, r.game.student);
  }
}

if (errors.length) {
  console.error(`\n${errors.length} problem${errors.length === 1 ? '' : 's'} found in games/:\n`);
  errors.forEach((e) => console.error('  ✗ ' + e));
  console.error('\nFix the files above and commit again. Nothing was published.');
  process.exit(1);
}

/* ── per-student indexes: their own files + every "todos" file ── */
const typeOrder = EVG.GAME_TYPES;
const displayName = (slug) => names.get(slug) || slug.charAt(0).toUpperCase() + slug.slice(1);
const entry = (i) => ({ type: i.type, file: i.file, path: i.path, title: i.g.title, description: i.g.description, level: i.g.level, topic: i.g.topic, difficulty: i.g.difficulty });
const order = (a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type) || (a.topic || '').localeCompare(b.topic || '') || a.title.localeCompare(b.title) || a.file.localeCompare(b.file);
const shared = files.filter((i) => i.student === 'todos');
const indexes = new Map();
for (const slug of new Set(files.map((i) => i.student))) {
  if (slug === 'todos') continue;
  const all = files.filter((i) => i.student === slug).concat(shared).map(entry).sort(order);
  indexes.set(slug, { student: slug, name: displayName(slug), games: all });
}

console.log(`✓ ${count} game file${count === 1 ? '' : 's'} valid · ${indexes.size} student${indexes.size === 1 ? '' : 's'}`);
if (shared.length && !indexes.size) console.log('  (games in "todos" files only show up for students who have at least one file of their own)');
if (checkOnly) process.exit(0);

/* ── assemble _site/ ── */
const out = path.join(root, '_site');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'index'), { recursive: true });
const copy = (p) => { if (fs.existsSync(path.join(root, p))) fs.cpSync(path.join(root, p), path.join(out, p), { recursive: true }); };
['index.html', 'css', 'js', 'games'].forEach(copy);
for (const [student, idx] of indexes) fs.writeFileSync(path.join(out, 'index', `${student}.json`), JSON.stringify(idx, null, 2));
// Read-only overview for the teacher view (#/docente). "_all" can never collide with a student (slugs have no underscores).
const allGames = files.map((i) => Object.assign(entry(i), { student: i.student === 'todos' ? '' : displayName(i.student), studentSlug: i.student })).sort((a, b) => order(a, b) || a.studentSlug.localeCompare(b.studentSlug));
const students = [...indexes.values()].map((i) => ({ slug: i.student, name: i.name, count: i.games.length })).sort((a, b) => a.name.localeCompare(b.name));
fs.writeFileSync(path.join(out, 'index', '_all.json'), JSON.stringify({ students, games: allGames }, null, 2));
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log(`✓ Site built in _site/ (${[...indexes.keys()].map((s) => '#/s/' + s).join('  ') || 'no students yet'})`);
