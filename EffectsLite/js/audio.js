/* One shared <audio> element, created on first use. Nothing is preloaded; the source is dropped on stop. */
(function () {
  var EL = window.EL, a = null, cur = null, playing = false;

  function paintRows() {
    EL.$$('.row[data-path]').forEach(function (r) {
      var on = r.dataset.path === cur;
      r.classList.toggle('playing', on && playing);
      r.classList.toggle('active', on);
      if (!on) r.style.removeProperty('--p');
    });
  }
  function ensure() {
    if (a) return a;
    a = new Audio(); a.preload = 'none';
    a.addEventListener('ended', function () { playing = false; paintRows(); });
    a.addEventListener('pause', function () { playing = false; paintRows(); });
    a.addEventListener('playing', function () { playing = true; paintRows(); });
    a.addEventListener('timeupdate', function () {
      if (!a.duration) return;
      var r = EL.$$('.row[data-path]').filter(function (x) { return x.dataset.path === cur; })[0];
      if (r) r.style.setProperty('--p', (a.currentTime / a.duration * 100).toFixed(1) + '%');
    });
    a.addEventListener('error', function () { playing = false; paintRows(); EL.ui.toast('Can’t play this file in the panel', 'err'); });
    return a;
  }

  EL.audio = {
    get cur() { return cur; },
    get playing() { return playing; },
    toggle: function (path) {
      var el = ensure();
      if (cur === path && playing) { el.pause(); return; }
      if (cur !== path) { el.src = EL.url(path); cur = path; }
      el.volume = EL.store.prefs.volume;
      if (el.ended) el.currentTime = 0;
      el.play().catch(function () { });
      paintRows();
    },
    stop: function () {
      if (!a) return;
      a.pause(); a.removeAttribute('src'); a.load();
      cur = null; playing = false; paintRows();
    },
    setVolume: function (v) { if (a) a.volume = v; }
  };
})();
