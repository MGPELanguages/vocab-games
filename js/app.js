/* Student app shell. Read-only: there is no editing code on the published site. */
(function () {
  'use strict';
  const EVG = window.EVG; const h = EVG.h;

  function page(route) {
    let m;
    if ((m = EVG.matchRoute(route, '/s/:student'))) return EVG.pageStudentGames(m.student);
    if ((m = EVG.matchRoute(route, '/s/:student/:game'))) return EVG.pageStudentGame(m.student, m.game);
    if (route === '/docente') return EVG.pageOverview();
    if ((m = EVG.matchRoute(route, '/docente/play/:game/:file'))) return EVG.pageOverviewPlay(m.game, m.file);
    if (route === '/') return EVG.pageHome();
    return EVG.emptyState('We couldn’t find that page', 'Check the link your teacher sent you.');
  }

  function render() {
    const route = EVG.currentRoute();
    const teacher = route.indexOf('/docente') === 0;
    const home = (m) => (teacher ? '#/docente' : m ? '#/s/' + m.student : '#/');
    const m = EVG.matchRoute(route, '/s/:student') || EVG.matchRoute(route, '/s/:student/:game');
    document.title = 'English Vocabulary Games';
    EVG.replace(document.getElementById('app'), h('div', { class: 'shell student' },
      h('header', { class: 'app-header' }, h('div', { class: 'container header-inner' },
        h('a', { href: home(m), class: 'logo' }, h('span', { class: 'logo-mark' }, 'Aa'), h('span', { class: 'logo-text' }, 'English Vocabulary ', h('span', null, 'Games'))),
        teacher ? h('span', { class: 'chip ml-auto' }, 'Teacher view · read-only') : null)),
      h('main', { class: 'container main' }, page(route))));
    window.scrollTo(0, 0);
  }

  document.addEventListener('DOMContentLoaded', () => { render(); window.addEventListener('hashchange', render); });
})();
