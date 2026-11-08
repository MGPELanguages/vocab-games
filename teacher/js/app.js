/* App shell: layout + routing. Everything is rendered into #app. */
(function () {
  'use strict';
  const EVG = window.EVG; const h = EVG.h;
  const app = () => document.getElementById('app');

  function layout(route, page) {
    const link = (to, label, ic, active) => h('a', { href: '#' + to, class: 'nav-link' + (active ? ' active' : '') }, EVG.icon(ic, 18), h('span', { class: 'hide-sm' }, label));
    return h('div', { class: 'shell' },
      h('header', { class: 'app-header' }, h('div', { class: 'container header-inner' },
        h('a', { href: '#/', class: 'logo' }, h('span', { class: 'logo-mark' }, 'Aa'), h('span', { class: 'logo-text hide-sm' }, 'English Vocabulary ', h('span', null, 'Games'))),
        h('nav', { class: 'row tight', 'aria-label': 'Main' }, link('/', 'Game library', 'grid', route === '/'), link('/vocab', 'Vocabulary bank', 'book', route.indexOf('/vocab') === 0)),
        h('div', { class: 'row ml-auto' }, h('span', { class: 'chip' }, 'Local editor'), EVG.button('primary', 'plus', 'New game', () => EVG.navigate('/new'))))),
      EVG.storageIsVolatile ? h('div', { class: 'container' }, h('div', { class: 'errors' }, 'Your browser is blocking storage, so games will be lost when you close this page. Try opening the app in another browser.')) : null,
      h('main', { class: 'container main' }, page));
  }

  function teacherPage(route) {
    let m;
    if (route === '/') return EVG.pageLibrary();
    if (route === '/new') return EVG.pageTypeChooser();
    if ((m = EVG.matchRoute(route, '/new/:type'))) return EVG.pageEditor({ type: m.type });
    if ((m = EVG.matchRoute(route, '/new/:type/:listId'))) return EVG.pageEditor({ type: m.type, listId: m.listId });
    if ((m = EVG.matchRoute(route, '/edit/:id'))) return EVG.pageEditor({ gameId: m.id });
    if ((m = EVG.matchRoute(route, '/play/:id'))) return EVG.pageTeacherPlay(m.id);
    if (route === '/vocab') return EVG.pageVocabIndex();
    if ((m = EVG.matchRoute(route, '/vocab/:id'))) return EVG.pageVocabEditor(m.id);
    return EVG.emptyState('Page not found', 'That address does not exist.', h('a', { class: 'btn btn-primary', href: '#/' }, 'Go to library'));
  }

  EVG.render = function () {
    const route = EVG.currentRoute(); const host = app();
    try { EVG.replace(host, layout(route, teacherPage(route))); }
    catch (err) { console.error(err); EVG.replace(host, EVG.emptyState('Something went wrong', String(err && err.message || err))); }
  };

  async function boot() {
    const route = EVG.currentRoute();
    await EVG.store.load();
    EVG.render();
    window.addEventListener('hashchange', async () => {
      if (!EVG.store.ready) await EVG.store.load();
      EVG.render(); window.scrollTo(0, 0);
    });
  }
  document.addEventListener('DOMContentLoaded', boot);
})();
