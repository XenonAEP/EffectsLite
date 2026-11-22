/* Minimal CEP bridge (replaces the ~1000-line CSInterface.js). Also exposes Node modules. */
(function () {
  var EL = (window.EL = window.EL || {});
  var cep = window.__adobe_cep__;
  var req = typeof window.require === 'function' ? window.require : null;

  EL.node = req ? { fs: req('fs'), path: req('path'), os: req('os'), cp: req('child_process') } : null;
  var isWin = /win/i.test(navigator.platform) && !/darwin/i.test(navigator.platform);

  function sysPath(type) {
    try {
      var p = decodeURI(cep.getSystemPath(type));
      return isWin ? p.replace('file:///', '') : p.replace('file://', '');
    } catch (e) { return ''; }
  }

  EL.cep = {
    available: !!cep,
    isWin: isWin,
    sysPath: sysPath,
    // Run ExtendScript; cb receives the returned string
    eval: function (script, cb) {
      if (!cep) { cb && cb('err|Not running inside After Effects'); return; }
      cep.evalScript(script, function (r) { cb && cb(r); });
    },
    // Native open dialog -> array of paths ([] when cancelled)
    pick: function (o) {
      try {
        var r = window.cep.fs.showOpenDialogEx(!!o.multi, !!o.dir, o.title || 'Select', '', o.types || []);
        return r && r.err === 0 && r.data ? r.data : [];
      } catch (e) { return []; }
    },
    // Reveal a file/folder in Explorer / Finder
    reveal: function (p, isDir) {
      try {
        var cp = EL.node.cp, a;
        if (isWin) cp.spawn('explorer.exe', isDir ? [p.replace(/\//g, '\\')] : ['/select,' + p.replace(/\//g, '\\')], { detached: true }).unref();
        else { a = isDir ? [p] : ['-R', p]; cp.spawn('open', a, { detached: true }).unref(); }
      } catch (e) { EL.ui && EL.ui.toast('Could not open folder', 'err'); }
    },
    hostInfo: function () {
      try { return JSON.parse(cep.getHostEnvironment()); } catch (e) { return null; }
    },
    apiVersion: function () {
      try { var v = JSON.parse(cep.getCurrentApiVersion()); return v.major + '.' + v.minor; } catch (e) { return ''; }
    }
  };

  // Path -> file:// URL (handles Windows drive letters, '#', '?', spaces, unicode)
  EL.url = function (p) {
    p = String(p).replace(/\\/g, '/');
    return (/^[A-Za-z]:/.test(p) ? 'file:///' : 'file://') + encodeURI(p).replace(/#/g, '%23').replace(/\?/g, '%3F');
  };
  EL.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  EL.$ = function (s, r) { return (r || document).querySelector(s); };
  EL.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
})();
