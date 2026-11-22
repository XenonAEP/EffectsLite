/* Bootstrap + tab switching. Tabs are created lazily and then only shown/hidden (never reloaded). */
(function () {
  var EL = window.EL, tabs = {}, current = null;
  var ORDER = ['home', 'sfx', 'overlays', 'settings'];

  function applyTheme(t) { document.documentElement.dataset.theme = t || 'dark'; }

  function fatal(msg) {
    document.body.innerHTML = '<div class="fatal"><b>EffectsLite couldn’t start</b><p>' + EL.esc(msg) + '</p></div>';
  }

  function show(name) {
    if (!tabs[name]) return;
    if (current === name) return;
    if (current && tabs[current].deactivate) tabs[current].deactivate();
    ORDER.forEach(function (n) {
      var sec = EL.$('#tab-' + n), on = n === name;
      sec.classList.toggle('on', on);
      var btn = EL.$('[data-tab="' + n + '"]'); btn.classList.toggle('on', on); btn.setAttribute('aria-selected', on);
    });
    current = name;
    tabs[name].activate();
    EL.store.setPref('tab', name);
  }
  EL.go = function (kind, id) { show(kind); tabs[kind].open(id); };

  function init() {
    if (!EL.node) return fatal('Node.js is not enabled for this panel. Check the CEFCommandLine flags in CSXS/manifest.xml.');
    try {
      var userRoot = EL.lib.init();
      EL.store.init(userRoot);
      try { EL.updates = JSON.parse(EL.node.fs.readFileSync(EL.node.path.join(EL.lib.extRoot, 'updates.json'), 'utf8')); } catch (e) { EL.updates = {}; }
    } catch (e) { return fatal(e.message); }

    applyTheme(EL.store.prefs.theme);
    tabs.home = EL.Home(EL.$('#tab-home'), EL.go);
    tabs.sfx = EL.Browse('sfx', EL.$('#tab-sfx'));
    tabs.overlays = EL.Browse('overlays', EL.$('#tab-overlays'));
    tabs.settings = EL.Settings(EL.$('#tab-settings'), applyTheme);

    EL.$('#tabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab);
    });
    window.addEventListener('beforeunload', function () { EL.store.flush(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) { EL.audio.stop(); EL.store.flush(); } });

    var start = EL.store.prefs.tab;
    show(ORDER.indexOf(start) > -1 ? start : 'home');
    EL.ready = true;
  }
  document.addEventListener('DOMContentLoaded', init);
})();
