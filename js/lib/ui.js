/* Reusable UI pieces: icons, toasts, modals, progress bars, completion card… */
(function () {
  'use strict';
  const EVG = window.EVG; const h = EVG.h;

  const ICONS = {
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    play: '<polygon points="5 3 19 12 5 21 5 3"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
    back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
    shuffle: '<polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    undo: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
    skip: '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>',
    type: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
    arrowRight: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    ok: '<circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/>',
  };
  function icon(name, size) {
    size = size || 16;
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size);
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICONS[name] || '';
    return s;
  }

  /** button(variant, iconName|null, label|null, onclick, extraProps) */
  function button(variant, iconName, label, onclick, props) {
    const p = Object.assign({ type: 'button', class: 'btn btn-' + variant, onclick: onclick }, props || {});
    if (props && props.class) p.class = 'btn btn-' + variant + ' ' + props.class;
    return h('button', p, iconName ? icon(iconName, 16) : null, label != null ? h('span', null, label) : null);
  }

  function field(label, input, hint, cls) {
    return h('label', { class: 'field ' + (cls || '') }, h('span', { class: 'label' }, label), input, hint ? h('span', { class: 'hint' }, hint) : null);
  }

  /* toasts */
  let toastHost;
  function toast(text, tone) {
    if (!toastHost) { toastHost = h('div', { class: 'toasts', 'aria-live': 'polite' }); document.body.appendChild(toastHost); }
    const t = h('div', { class: 'toast ' + (tone === 'error' ? 'toast-error' : '') }, text);
    toastHost.appendChild(t);
    setTimeout(() => t.remove(), 3400);
  }

  /* modal */
  function modal(opts) {
    const prevOverflow = document.body.style.overflow;
    const body = h('div', { class: 'modal-body' }, opts.body);
    const box = h('div', { class: 'card modal-box' + (opts.wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title },
      h('div', { class: 'modal-head' }, h('h2', null, opts.title), button('ghost', 'x', null, () => close(), { 'aria-label': 'Close' })), body);
    const overlay = h('div', { class: 'modal-overlay', onmousedown: (e) => { if (e.target === overlay) close(); } }, box);
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    function close() {
      overlay.remove(); document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow;
      if (opts.onClose) opts.onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    document.body.appendChild(overlay);
    return { close: close, body: body };
  }
  function confirmDialog(opts) {
    return new Promise((resolve) => {
      let m; let answered = false;
      const done = (v) => { if (answered) return; answered = true; m.close(); resolve(v); };
      m = modal({
        title: opts.title, onClose: () => done(false),
        body: [h('p', { class: 'muted mb' }, opts.message),
          h('div', { class: 'row end' }, button('ghost', null, 'Cancel', () => done(false)), button('danger', null, opts.confirmLabel || 'Delete', () => done(true), { 'data-confirm': 'yes' }))],
      });
    });
  }

  function progressBar(value, max, label) {
    const pct = max === 0 ? 0 : Math.round((value / max) * 100);
    return h('div', { class: 'progress-wrap' },
      h('div', { class: 'progress-label' }, h('span', null, label || 'Progress'), h('span', null, value + ' / ' + max)),
      h('div', { class: 'progress', role: 'progressbar', 'aria-valuenow': value, 'aria-valuemin': 0, 'aria-valuemax': max }, h('div', { class: 'progress-fill', style: { width: pct + '%' } })));
  }
  function completionCard(o) {
    return h('div', { class: 'card completion', role: 'status', 'data-testid': 'completion' },
      h('div', { class: 'completion-badge' }, icon('ok', 28)),
      h('h3', null, o.title || 'Well done!'), h('p', { class: 'muted' }, o.message),
      o.stats ? h('div', { class: 'row center wrap mt' }, o.stats.map((s) => h('div', { class: 'stat' }, h('div', { class: 'stat-v' }, String(s.value)), h('div', { class: 'stat-l' }, s.label)))) : null,
      o.onRestart ? h('div', { class: 'mt' }, button('soft', 'undo', 'Play again', o.onRestart)) : null);
  }
  const feedback = (tone, kids) => h('div', { class: 'feedback feedback-' + tone, role: 'status' }, kids);
  function emptyState(title, text, action) {
    return h('div', { class: 'card empty' }, h('h3', null, title), h('p', { class: 'muted' }, text), action ? h('div', { class: 'mt' }, action) : null);
  }
  function errorList(errors) {
    if (!errors || !errors.length) return null;
    return h('div', { class: 'errors', role: 'alert' }, h('strong', null, 'Please fix the following:'), h('ul', null, errors.map((e) => h('li', null, e))));
  }

  Object.assign(EVG, { icon, button, field, toast, modal, confirmDialog, progressBar, completionCard, feedback, emptyState, errorList });
})();
