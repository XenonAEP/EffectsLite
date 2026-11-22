/* Folder operations with dialogs, shared by the SFX/Overlays browsers and Settings. */
(function () {
  var EL = window.EL;
  function last(id) { var r = EL.lib.parse(id).rel; return r.slice(r.lastIndexOf('/') + 1); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  EL.ops = {
    last: last, plural: plural,
    insert: function (item) {
      var p = EL.store.prefs;
      var mode = p.action === 'import' ? 'import' : 'place';
      var s = 'EL_insert(' + [JSON.stringify(item.path), JSON.stringify(mode), JSON.stringify(item.kind), !!p.fitOverlay, !!p.screenBlend].join(',') + ')';
      EL.cep.eval(s, function (r) {
        var m = /^(ok|err)\|([\s\S]*)$/.exec(r || '');
        EL.ui.toast(m ? m[2] : 'After Effects did not respond', m && m[1] === 'ok' ? '' : 'err');
      });
    },
    /** -> Promise<newId|null> */
    rename: function (id) {
      return EL.ui.prompt({ title: 'Rename folder', value: last(id), ok: 'Rename' }).then(function (name) {
        if (!name) return null;
        var r = EL.lib.renameFolder(id, name);
        if (!r.ok) { EL.ui.toast(r.err, 'err'); return null; }
        return r.id;
      });
    },
    /** -> Promise<bool> */
    remove: function (id) {
      var st = EL.lib.folderStats(id);
      return EL.ui.confirm({
        title: 'Delete “' + last(id) + '”?',
        msg: 'This permanently deletes the folder and ' + plural(st.files, 'file') + ' from your custom content. Bundled assets are never touched.',
        ok: 'Delete', danger: true
      }).then(function (yes) {
        if (!yes) return false;
        EL.audio.stop();
        var r = EL.lib.deleteFolder(id);
        if (!r.ok) { EL.ui.toast(r.err, 'err'); return false; }
        return true;
      });
    },
    /** Pick (or create) a custom folder. -> Promise<folderId|null> */
    pickCustomFolder: function (kind, title) {
      var opts = [{ id: '__new', label: 'New folder…', icon: 'folder-plus' }].concat(
        EL.lib.userFolders(kind).map(function (f) { return { id: f.id, label: f.name, icon: 'folder' }; }));
      return EL.ui.choose({ title: title, options: opts }).then(function (id) {
        if (!id) return null;
        if (id !== '__new') return id;
        return EL.ui.prompt({ title: 'New folder', placeholder: 'Folder name', ok: 'Create' }).then(function (name) {
          if (!name) return null;
          var r = EL.lib.createFolder(kind, null, name);
          if (!r.ok) { EL.ui.toast(r.err, 'err'); return null; }
          return r.id;
        });
      });
    }
  };
})();
