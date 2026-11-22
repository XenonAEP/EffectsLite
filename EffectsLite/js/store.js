/* Persistent preferences / favorites / usage counts. One small JSON file in the user-data folder
   (outside the extension folder, so it survives updates and re-installs). Writes are debounced. */
(function () {
  var EL = window.EL;
  var DEFAULT_PREFS = { theme: 'dark', volume: 0.8, action: 'place', fitOverlay: true, screenBlend: false, tab: 'home' };
  var file = null, timer = null, state = null;

  function fresh() { return { v: 1, prefs: Object.assign({}, DEFAULT_PREFS), fav: {}, freq: {} }; }

  EL.store = {
    DEFAULT_PREFS: DEFAULT_PREFS,
    get state() { return state; },
    get prefs() { return state.prefs; },
    init: function (userRoot) {
      var fs = EL.node.fs, path = EL.node.path;
      file = path.join(userRoot, 'data.json');
      state = fresh();
      try {
        if (fs.existsSync(file)) {
          var d = JSON.parse(fs.readFileSync(file, 'utf8'));
          state.prefs = Object.assign(state.prefs, d.prefs || {});
          state.fav = d.fav || {};
          state.freq = d.freq || {};
        }
      } catch (e) { /* corrupt file: start fresh, keep going */ }
    },
    save: function () {
      clearTimeout(timer);
      timer = setTimeout(EL.store.flush, 300);
    },
    flush: function () {
      clearTimeout(timer); timer = null;
      try {
        var fs = EL.node.fs, tmp = file + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(state));
        fs.renameSync(tmp, file); // atomic replace
      } catch (e) { EL.ui && EL.ui.toast('Could not save settings', 'err'); }
    },
    setPref: function (k, v) { state.prefs[k] = v; EL.store.save(); },
    isFav: function (id) { return !!state.fav[id]; },
    toggleFav: function (id) {
      if (state.fav[id]) delete state.fav[id]; else state.fav[id] = Date.now();
      EL.store.save();
      return !!state.fav[id];
    },
    bump: function (id) { state.freq[id] = (state.freq[id] || 0) + 1; EL.store.save(); },
    // Rename / delete bookkeeping so favorites follow their folders
    moveKeys: function (from, to) {
      [state.fav, state.freq].forEach(function (m) {
        Object.keys(m).forEach(function (k) {
          if (k === from || k.indexOf(from + '/') === 0) { m[to + k.slice(from.length)] = m[k]; delete m[k]; }
        });
      });
      EL.store.save();
    },
    dropKeys: function (id) {
      [state.fav, state.freq].forEach(function (m) {
        Object.keys(m).forEach(function (k) { if (k === id || k.indexOf(id + '/') === 0) delete m[k]; });
      });
      EL.store.save();
    },
    resetPrefs: function () { state.prefs = Object.assign({}, DEFAULT_PREFS); EL.store.save(); },
    clearHistory: function () { state.fav = {}; state.freq = {}; EL.store.save(); }
  };
})();
