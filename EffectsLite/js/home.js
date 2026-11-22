/* Home tab: header, latest update, favorites, quick access. Re-rendered (cheaply) each time it is shown. */
(function () {
  var EL = window.EL, esc = EL.esc, ic = EL.icon;

  function card(m) {
    var fav = EL.store.isFav(m.id);
    return '<div class="fcard' + (m.custom ? ' custom' : '') + '" data-act="goto" data-id="' + esc(m.id) + '">' + ic('folder') +
      '<span class="fn"><b>' + esc(m.name) + '</b><i>' + (m.kind === 'sfx' ? 'SFX' : 'Overlays') + ' · ' + EL.ops.plural(m.count, 'item') + (m.where ? ' · ' + esc(m.where) : '') + '</i></span>' +
      '<span class="facts"><button class="ib fav' + (fav ? ' on' : '') + '" data-act="fav" title="' + (fav ? 'Remove from favorites' : 'Add to favorites') + '">' + ic('star') + '</button></span></div>';
  }

  EL.Home = function (section, go) {
    function quick(favIds) {
      var freq = EL.store.state.freq, ids = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; });
      var out = [], seen = {};
      function add(id) { if (out.length >= 6 || seen[id]) return; var m = EL.lib.meta(id); if (m) { seen[id] = 1; out.push(m); } }
      ids.forEach(add);
      // Brand-new install: suggest the first bundled folders of each kind
      if (out.length < 4) ['sfx', 'overlays'].forEach(function (k) {
        EL.lib.list(k, null).folders.slice(0, 3).forEach(function (f) { add(f.id); });
      });
      return out;
    }
    function render() {
      var u = EL.updates || {}, rel = (u.releases || [])[0];
      var favs = Object.keys(EL.store.state.fav).sort(function (a, b) { return EL.store.state.fav[b] - EL.store.state.fav[a]; })
        .map(EL.lib.meta).filter(Boolean);
      var s = EL.lib.totals('sfx'), o = EL.lib.totals('overlays');
      section.innerHTML =
        '<div class="scroll page">' +
        '<div class="hero"><div class="logo">' + ic('sfx') + '</div><div><h1>EffectsLite</h1><p>Sound effects and overlays, one click from your timeline.</p></div></div>' +
        '<div class="chips"><span class="chip">' + (s.bundled + s.custom) + ' sounds</span><span class="chip">' + (o.bundled + o.custom) + ' overlays</span><span class="chip">' + (s.custom + o.custom) + ' yours</span></div>' +
        '<h2>Updates</h2><div class="box">' + (rel
          ? '<div class="uhead"><b>' + esc(rel.title) + '</b><span>v' + esc(rel.version) + ' · ' + esc(rel.date) + '</span></div><ul>' + rel.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>'
          : '<p class="muted">No update information.</p>') + '</div>' +
        '<h2>Favorites</h2>' + (favs.length ? '<div class="fgrid">' + favs.map(card).join('') + '</div>'
          : '<div class="box hint">Tap the star on any folder to pin it here.</div>') +
        '<h2>Quick access</h2><div class="fgrid">' + quick().map(card).join('') + '</div>' +
        '</div><div class="ver">v' + esc(u.version || '') + '</div>';
    }
    section.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var el = b.closest('[data-id]'), id = el && el.dataset.id;
      if (b.dataset.act === 'fav') { e.stopPropagation(); EL.store.toggleFav(id); var sc = EL.$('.scroll', section).scrollTop; render(); EL.$('.scroll', section).scrollTop = sc; }
      else if (b.dataset.act === 'goto') go(EL.lib.parse(id).kind, id);
    });
    return { activate: render };
  };
})();
