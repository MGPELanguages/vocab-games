// Validates every game in games/ and builds the publishable site into _site/.
//   node scripts/build.mjs           → validate + build _site/
//   node scripts/build.mjs --check   → validate only
// Layout:  games/<game-folder>/<student>.json      (student "todos" = every student)
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
const byStudent = new Map();    // slug → [{ game, file, meta }]
const names = new Map();        // slug → display name
let count = 0;

for (const gameEntry of fs.existsSync(gamesDir) ? fs.readdirSync(gamesDir, { withFileTypes: true }) : []) {
  if (gameEntry.name.startsWith('.')) continue;
  const gp = `games/${gameEntry.name}`;
  if (!gameEntry.isDirectory()) { fail(gp, 'Only folders are allowed directly inside games/ (one folder per game).'); continue; }
  if (!EVG.SLUG_RE.test(gameEntry.name)) fail(gp, 'The folder name must use only lowercase letters, numbers and hyphens (e.g. "kitchen-connections").');
  for (const f of fs.readdirSync(path.join(gamesDir, gameEntry.name), { withFileTypes: true })) {
    if (f.name.startsWith('.')) continue;
    const fp = `${gp}/${f.name}`;
    if (!f.isFile() || !f.name.endsWith('.json')) { fail(fp, 'Only .json files are allowed here (one file per student, e.g. "sofia.json").'); continue; }
    const student = f.name.slice(0, -5);
    if (!EVG.SLUG_RE.test(student)) { fail(fp, 'The file name must be the student in lowercase letters, numbers and hyphens, without accents (e.g. "sofia.json").'); continue; }
    let raw;
    try { raw = JSON.parse(fs.readFileSync(path.join(gamesDir, gameEntry.name, f.name), 'utf8')); }
    catch (e) { fail(fp, `This is not valid JSON (${e.message}).`); continue; }
    const r = EVG.prepareGame(raw, fp);
    if (!r.game) { r.errors.forEach((m) => fail(fp, m)); continue; }
    // students get a random puzzle each time, so make sure several different seeds all work
    let bad = null;
    for (let i = 1; i <= 8 && !bad; i++) { const t = EVG.prepareGame(raw, fp, { seed: fp + '#check' + i }); if (!t.game) bad = t.errors; }
    if (bad) { bad.forEach((m) => fail(fp, m + ' (happens with some random layouts: use fewer or shorter words)')); continue; }
    count++;
    if (!byStudent.has(student)) byStudent.set(student, []);
    byStudent.get(student).push({ game: gameEntry.name, file: fp, g: r.game });
    if (student !== 'todos' && r.game.student && !names.has(student)) names.set(student, r.game.student);
  }
}

if (errors.length) {
  console.error(`\n${errors.length} problem${errors.length === 1 ? '' : 's'} found in games/:\n`);
  errors.forEach((e) => console.error('  ✗ ' + e));
  console.error('\nFix the files above and commit again. Nothing was published.');
  process.exit(1);
}

/* ── build per-student indexes (own games + "todos" games, own file wins) ── */
const typeOrder = EVG.GAME_TYPES;
const shared = byStudent.get('todos') || [];
const indexes = new Map();
for (const [student, items] of byStudent) {
  if (student === 'todos') continue;
  const own = new Set(items.map((i) => i.game));
  const all = items.concat(shared.filter((i) => !own.has(i.game)));
  all.sort((a, b) => typeOrder.indexOf(a.g.type) - typeOrder.indexOf(b.g.type) || a.g.title.localeCompare(b.g.title));
  const name = names.get(student) || student.charAt(0).toUpperCase() + student.slice(1);
  indexes.set(student, { student, name, games: all.map((i) => ({ game: i.game, path: i.file, type: i.g.type, title: i.g.title, description: i.g.description, level: i.g.level, topic: i.g.topic, difficulty: i.g.difficulty })) });
}

console.log(`✓ ${count} game file${count === 1 ? '' : 's'} valid · ${indexes.size} student${indexes.size === 1 ? '' : 's'}`);
if (shared.length && !indexes.size) console.log('  (games in "todos" only show up for students who have at least one file of their own)');
if (checkOnly) process.exit(0);

/* ── assemble _site/ ── */
const out = path.join(root, '_site');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'index'), { recursive: true });
const copy = (p) => { if (fs.existsSync(path.join(root, p))) fs.cpSync(path.join(root, p), path.join(out, p), { recursive: true }); };
['index.html', 'css', 'js', 'games'].forEach(copy);
for (const [student, idx] of indexes) fs.writeFileSync(path.join(out, 'index', `${student}.json`), JSON.stringify(idx, null, 2));
// Read-only overview for the teacher view (#/docente). "_all" can never collide with a student (slugs have no underscores).
const allGames = [];
for (const [student, items] of byStudent) for (const i of items) allGames.push({ game: i.game, file: student, student: student === 'todos' ? '' : (names.get(student) || student), path: i.file, type: i.g.type, title: i.g.title, description: i.g.description, level: i.g.level, topic: i.g.topic, difficulty: i.g.difficulty });
allGames.sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type) || a.game.localeCompare(b.game) || a.file.localeCompare(b.file));
const students = [...indexes.values()].map((i) => ({ slug: i.student, name: i.name, count: i.games.length })).sort((a, b) => a.name.localeCompare(b.name));
fs.writeFileSync(path.join(out, 'index', '_all.json'), JSON.stringify({ students, games: allGames }, null, 2));
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log(`✓ Site built in _site/ (${[...indexes.keys()].map((s) => '#/s/' + s).join('  ') || 'no students yet'})`);
