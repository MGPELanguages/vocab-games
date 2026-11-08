/* Shared helpers. Everything lives under the global EVG namespace so the app
   works with plain <script> tags (no modules, no bundler, opens from file://). */
(function () {
  'use strict';
  const EVG = (window.EVG = window.EVG || {});
  EVG.LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  EVG.DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
  EVG.games = {};        // game definitions by type (see js/games/*.js)
  EVG.GAME_TYPES = [];   // registration order = display order

  EVG.registerGame = function (def) {
    EVG.games[def.type] = def;
    EVG.GAME_TYPES.push(def.type);
  };

  const uid = () =>
    (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10));
  const now = () => new Date().toISOString();

  function shuffle(arr, rnd) {
    rnd = rnd || Math.random;
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  const sample = (arr, n, rnd) => shuffle(arr, rnd).slice(0, n);

  /** Normalise free-text answers for comparison (case, spaces, curly quotes, trailing punctuation). */
  function normAnswer(s) {
    return String(s).normalize('NFC')
      .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      .toLowerCase().replace(/\s+/g, ' ').trim().replace(/[.!?,;:]+$/g, '').trim();
  }
  /** Letters only, uppercase, accents removed – for word search / crossword / scramble. */
  const lettersOnly = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z]/g, '').toUpperCase();

  function formatDate(iso) {
    try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return iso; }
  }
  const isHttpUrl = (s) => /^https?:\/\/\S+$/i.test(String(s).trim());
  function uniqueCI(values) {
    const seen = new Set();
    for (const v of values) { const k = String(v).trim().toLowerCase(); if (seen.has(k)) return false; seen.add(k); }
    return true;
  }
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ── tiny DOM builder: h('div', {class:'x', onclick: fn}, child, [children], 'text') ── */
  function append(el, kids) {
    for (const k of kids) {
      if (k == null || k === false || k === true) continue;
      if (Array.isArray(k)) append(el, k);
      else el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
    }
  }
  function h(tag, props) {
    const el = document.createElement(tag);
    if (props) {
      for (const key of Object.keys(props)) {
        const v = props[key];
        if (key === 'spellcheck') { el.spellcheck = !!v; continue; }
        if (v == null || v === false) continue;
        if (key === 'class') el.className = v;
        else if (key === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (key.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(key.slice(2).toLowerCase(), v);
        else if (key === 'for') el.htmlFor = v;
        else if (key === 'list' || key.indexOf('-') >= 0) el.setAttribute(key, v === true ? '' : v);
        else if (key in el) { try { el[key] = v; } catch (e) { el.setAttribute(key, v); } }
        else el.setAttribute(key, v === true ? '' : v);
      }
    }
    append(el, Array.prototype.slice.call(arguments, 2));
    return el;
  }
  const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
  function replace(el, kids) { clear(el); append(el, Array.isArray(kids) ? kids : [kids]); return el; }

  Object.assign(EVG, { uid, now, shuffle, sample, normAnswer, lettersOnly, formatDate, isHttpUrl, uniqueCI, clone, h, clear, replace });
})();
