/* Tiny hash router: #/s/sofia/kitchen → route "/s/sofia/kitchen". */
(function () {
  'use strict';
  const EVG = window.EVG;

  EVG.currentRoute = () => { const h = window.location.hash.replace(/^#/, ''); return h.charAt(0) === '/' ? h : '/'; };
  EVG.navigate = (p) => { window.location.hash = p; };
  EVG.matchRoute = function (route, pattern) {
    const rs = route.split('/').filter(Boolean), ps = pattern.split('/').filter(Boolean);
    if (rs.length !== ps.length) return null;
    const params = {};
    for (let i = 0; i < ps.length; i++) {
      if (ps[i][0] === ':') params[ps[i].slice(1)] = decodeURIComponent(rs[i]); else if (ps[i] !== rs[i]) return null;
    }
    return params;
  };
})();
