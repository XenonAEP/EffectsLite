/* Settings tab. */
(function () {
  var EL = window.EL, esc = EL.esc, ic = EL.icon;

  function fmtBytes(n) { return n < 1048576 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1048576).toFixed(1) + ' MB'; }
  function seg(key, opts, cur) {
    return '<div class="seg" data-key="' + key + '">' + opts.map(function (o) {
      return '<button data-v="' + o[0] + '" class="' + (String(cur) === o[0] ? 'on' : '') + '">' + o[1] + '</button>';
    }).join('') + '</div>';
  }
  function sw(key, on) { return '<label class="switch"><input type="checkbox" data-key="' + key + '"' + (on ? ' checked' : '') + '><i></i></label>'; }
  function line(t, d, ctl) { return '<div class="line"><div><b>' + t + '</b>' + (d ? '<i>' + d + '</i>' : '') + '</div>' + ctl + '</div>'; }

  EL.Settings = function (section, applyTheme) {
    function custom(kind) {
      var fs = EL.lib.userRootFolders(kind);
      if (!fs.length) return '<div class="muted small">No custom folders yet.</div>';
      return fs.map(function (f) {
        var s = EL.lib.folderStats(f.id);
        return '<div class="mrow" data-id="' + esc(f.id) + '">' + ic('folder') + '<span class="fn"><b>' + esc(f.name) + '</b><i>' + EL.ops.plural(s.files, 'file') + ' · ' + fmtBytes(s.bytes) + '</i></span>' +
          '<span class="mact"><button class="ib" data-act="reveal" title="Show in file browser">' + ic('ext') + '</button><button class="ib" data-act="rename" title="Rename">' + ic('pencil') + '</button><button class="ib" data-act="del" title="Delete">' + ic('trash') + '</button></span></div>';
      }).join('');
    }
    function render() {
      var p = EL.store.prefs, host = EL.cep.hostInfo(), u = EL.updates || {}, st = EL.lib.totals('sfx'), ot = EL.lib.totals('overlays');
      var ae = host ? host.appName + ' ' + host.appVersion : (EL.cep.available ? 'After Effects' : 'Browser preview (not in After Effects)');
      section.innerHTML = '<div class="scroll page">' +
        '<h2>Appearance</h2><div class="box">' + line('Theme', '', seg('theme', [['dark', 'Dark'], ['black', 'Black'], ['light', 'Light']], p.theme)) + '</div>' +
        '<h2>Behavior</h2><div class="box">' +
        line('When inserting', 'Where a clicked asset goes', seg('action', [['place', 'Add to comp'], ['import', 'Project only']], p.action)) +
        line('Fit overlays to comp', 'Scale overlay layers to cover the frame', sw('fitOverlay', p.fitOverlay)) +
        line('Screen blend overlays', 'Useful for black-background overlays', sw('screenBlend', p.screenBlend)) +
        line('Preview volume', '', '<input type="range" min="0" max="1" step="0.05" value="' + p.volume + '" data-key="volume" class="range">') +
        '</div>' +
        '<h2>Custom content</h2><div class="box">' +
        '<div class="sub2">SFX</div>' + custom('sfx') + '<div class="sub2">Overlays</div>' + custom('overlays') +
        '<div class="btnrow"><button class="btn" data-act="openroot">' + ic('ext') + '<span>Open custom content folder</span></button></div></div>' +
        '<h2>Maintenance</h2><div class="box">' +
        line('Thumbnail cache', 'Generated previews for your own files', '<button class="btn" data-act="clearcache">Clear</button>') +
        line('Reset preferences', 'Theme and behavior only; your content is kept', '<button class="btn" data-act="resetprefs">Reset</button>') +
        line('Clear favorites and history', 'Unstars folders, resets quick access', '<button class="btn" data-act="clearhist">Clear</button>') +
        '</div>' +
        '<h2>About</h2><div class="box info">' +
        '<div><span>Extension</span><b>EffectsLite</b></div><div><span>Version</span><b>' + esc(u.version || '') + '</b></div>' +
        '<div><span>Host</span><b>' + esc(ae) + '</b></div>' + (EL.cep.apiVersion() ? '<div><span>CEP</span><b>' + esc(EL.cep.apiVersion()) + '</b></div>' : '') +
        '<div><span>Bundled</span><b>' + st.bundled + ' SFX · ' + ot.bundled + ' overlays</b></div>' +
        '<div><span>Your content</span><b>' + st.custom + ' SFX · ' + ot.custom + ' overlays</b></div>' +
        '<div class="path"><span>Data folder</span><b>' + esc(EL.lib.userRoot) + '</b></div></div></div>';
    }
    function rerender() { var sc = EL.$('.scroll', section); var y = sc ? sc.scrollTop : 0; render(); EL.$('.scroll', section).scrollTop = y; }

    section.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.parentNode.classList.contains('seg')) {
        var key = b.parentNode.dataset.key, v = b.dataset.v;
        EL.store.setPref(key, v); if (key === 'theme') applyTheme(v);
        EL.$$('button', b.parentNode).forEach(function (x) { x.classList.toggle('on', x === b); });
        return;
      }
      var act = b.dataset.act, row = b.closest('.mrow'), id = row && row.dataset.id;
      if (act === 'reveal') EL.cep.reveal(EL.lib.abs(id), true);
      else if (act === 'openroot') EL.cep.reveal(EL.lib.userRoot, true);
      else if (act === 'rename') EL.ops.rename(id).then(function (n) { if (n) rerender(); });
      else if (act === 'del') EL.ops.remove(id).then(function (d) { if (d) { EL.ui.toast('Folder deleted'); rerender(); } });
      else if (act === 'clearcache') EL.ui.toast(EL.lib.clearThumbCache() ? 'Thumbnail cache cleared' : 'Could not clear cache', 'ok');
      else if (act === 'resetprefs') EL.ui.confirm({ title: 'Reset preferences?', msg: 'Theme and behavior return to defaults. Your folders, files and favorites are kept.', ok: 'Reset' }).then(function (y) {
        if (!y) return; EL.store.resetPrefs(); applyTheme(EL.store.prefs.theme); rerender(); EL.ui.toast('Preferences reset');
      });
      else if (act === 'clearhist') EL.ui.confirm({ title: 'Clear favorites and history?', msg: 'Favorite stars and quick-access history are removed. Files are not affected.', ok: 'Clear', danger: true }).then(function (y) {
        if (!y) return; EL.store.clearHistory(); EL.ui.toast('Favorites and history cleared');
      });
    });
    section.addEventListener('change', function (e) {
      var t = e.target, key = t.dataset.key; if (!key) return;
      EL.store.setPref(key, t.type === 'checkbox' ? t.checked : parseFloat(t.value));
    });
    section.addEventListener('input', function (e) {
      if (e.target.dataset.key === 'volume') { var v = parseFloat(e.target.value); EL.store.prefs.volume = v; EL.audio.setVolume(v); EL.store.save(); }
    });
    return { activate: render };
  };
})();
