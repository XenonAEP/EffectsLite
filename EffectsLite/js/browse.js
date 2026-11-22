/* Browser used by both the SFX and Overlays tabs (they differ only in row/card rendering). */
(function () {
  var EL = window.EL, esc = EL.esc, ic = EL.icon;

  EL.Browse = function (kind, section) {
    var isSfx = kind === 'sfx', label = isSfx ? 'SFX' : 'Overlays';
    var st = { cur: null, q: '', folders: [], files: [] }, saved = 0, searchTimer = 0;

    section.innerHTML =
      '<div class="bar">' +
        '<div class="search">' + ic('search') + '<input type="text" placeholder="Search ' + label + '" spellcheck="false"><button class="ib clear" data-act="clearq" hidden title="Clear">' + ic('x') + '</button></div>' +
        '<button class="btn" data-act="newfolder" title="Create a custom folder">' + ic('plus') + '<span>Folder</span></button>' +
        '<button class="btn" data-act="import" title="Import your own files">' + ic('upload') + '<span>Import</span></button>' +
      '</div>' +
      '<div class="crumbs"></div>' +
      '<div class="scroll"><div class="folders"></div><div class="host"><div class="win"></div></div><div class="empty" hidden></div></div>' +
      '<div class="dropmsg">Drop files to import</div>';

    var scroller = EL.$('.scroll', section), foldersEl = EL.$('.folders', section), host = EL.$('.host', section),
        emptyEl = EL.$('.empty', section), crumbsEl = EL.$('.crumbs', section), input = EL.$('input', section), clearBtn = EL.$('.clear', section);

    /* ---------- rendering ---------- */
    function typeIcon(it) { return it.type === 'preset' ? 'preset' : it.type === 'video' ? 'film' : 'image'; }
    function acts(it) {
      return '<span class="acts"><button class="ib" data-act="insert" title="Insert into After Effects">' + ic('plus') + '</button>' +
        '<button class="ib" data-act="save" title="Save a copy to a custom folder">' + ic('folder-plus') + '</button>' +
        (it.custom ? '<button class="ib" data-act="del" title="Delete this file">' + ic('trash') + '</button>' : '') + '</span>';
    }
    function sub(it) { var i = it.rel.lastIndexOf('/'); return st.q && i > -1 ? '<i class="sub">' + esc(it.rel.slice(0, i)) + '</i>' : ''; }

    function renderItem(it, i) {
      var d = ' draggable="true" data-i="' + i + '" data-path="' + esc(it.path) + '"';
      if (isSfx) {
        var on = EL.audio.cur === it.path, pl = on && EL.audio.playing;
        return '<div class="row' + (on ? ' active' : '') + (pl ? ' playing' : '') + '"' + d + '>' +
          (it.type === 'preset' ? '<span class="ib static">' + ic('preset') + '</span>' : '<button class="ib play" data-act="play" title="Preview">' + ic(pl ? 'pause' : 'play') + '</button>') +
          '<span class="nm" title="' + esc(it.file) + '">' + esc(it.name) + sub(it) + '</span><span class="ext">' + esc(it.ext) + '</span>' + acts(it) + '</div>';
      }
      var url = it.type === 'preset' ? null : EL.thumbs.get(it, setThumb);
      return '<div class="card' + (url ? ' hasth' : '') + '"' + d + '>' +
        '<span class="ph">' + ic(typeIcon(it)) + '</span>' + '<img class="th" alt=""' + (url ? ' src="' + esc(url) + '"' : '') + '>' +
        '<div class="cap"><b title="' + esc(it.file) + '">' + esc(it.name) + '</b><span>' + esc(it.ext) + (it.custom ? ' · custom' : '') + '</span></div>' + acts(it) + '</div>';
    }
    function setThumb(path, url) {
      EL.$$('.card', host).forEach(function (c) {
        if (c.dataset.path === path) { EL.$('.th', c).src = url; c.classList.add('hasth'); }
      });
    }
    function afterPaint() {
      if (isSfx) return;
      EL.thumbs.setVisible(EL.$$('.card', host).map(function (c) { return c.dataset.path; }));
    }

    var grid = new EL.VGrid({
      scroller: scroller, host: host,
      minW: isSfx ? 0 : 150, gap: isSfx ? 2 : 10,
      itemH: isSfx ? function () { return 38; } : function (w) { return Math.round(w * 9 / 16); },
      render: renderItem, afterPaint: afterPaint
    });

    function folderCard(f) {
      var fav = EL.store.isFav(f.id);
      return '<div class="fcard' + (f.custom ? ' custom' : '') + '" data-act="open" data-id="' + esc(f.id) + '" title="' + (f.custom ? 'Custom folder' : '') + '">' + ic('folder') +
        '<span class="fn"><b>' + esc(f.name) + '</b><i>' + EL.ops.plural(f.count == null ? 0 : f.count, 'item') + (f.custom ? ' · custom' : '') + '</i></span>' +
        '<span class="facts">' +
        (f.custom ? '<button class="ib" data-act="rename" title="Rename">' + ic('pencil') + '</button><button class="ib" data-act="delfolder" title="Delete folder">' + ic('trash') + '</button>' : '') +
        '<button class="ib fav' + (fav ? ' on' : '') + '" data-act="fav" title="' + (fav ? 'Remove from favorites' : 'Add to favorites') + '">' + ic('star') + '</button></span></div>';
    }
    function renderCrumbs() {
      if (st.q) { crumbsEl.innerHTML = '<span class="cur">Search results · ' + grid.items.length + (grid.items.length >= 1000 ? '+' : '') + '</span>'; return; }
      var h = st.cur ? '<button data-act="crumb" data-id="">' + label + '</button>' : '<span class="cur">' + label + '</span>';
      var t = EL.lib.trail(st.cur);
      t.forEach(function (s, i) {
        h += '<span class="sep">' + ic('chev') + '</span>' + (i === t.length - 1 ? '<span class="cur">' + esc(s.name) + '</span>' : '<button data-act="crumb" data-id="' + esc(s.id) + '">' + esc(s.name) + '</button>');
      });
      crumbsEl.innerHTML = h;
    }
    function render(keepScroll) {
      foldersEl.innerHTML = st.folders.map(folderCard).join('');
      grid.setItems(st.files, keepScroll);
      renderCrumbs();
      var none = !st.folders.length && !st.files.length, p = EL.lib.parse(st.cur);
      emptyEl.hidden = !none;
      if (none) {
        emptyEl.innerHTML = st.q ? 'No results for “' + esc(st.q) + '”' :
          p && p.src === 'u' ? 'This folder is empty.<br><small>Use Import or drop files here.</small>' :
          !st.cur ? 'No folders yet.<br><small>Create one, or import your own files.</small>' : 'Nothing here.';
      }
    }
    function reload(keepScroll) {
      if (st.cur && !EL.lib.exists(st.cur)) st.cur = null;
      if (st.q) { st.folders = []; st.files = EL.lib.search(kind, st.q); }
      else { var l = EL.lib.list(kind, st.cur); st.folders = l.folders; st.files = l.files; }
      render(keepScroll);
    }

    /* ---------- navigation ---------- */
    function open(id) {
      st.cur = id || null; st.q = ''; input.value = ''; clearBtn.hidden = true;
      if (id) EL.store.bump(id);
      reload();
    }
    function customTarget() { var p = EL.lib.parse(st.cur); return p && p.src === 'u' && !st.q ? st.cur : null; }

    function itemOf(el) { var r = el.closest('[data-i]'); return r ? grid.items[+r.dataset.i] : null; }

    /* ---------- import ---------- */
    function doImport(paths) {
      var dirs = [], files = [], dest = customTarget(), msg = [], nav = null, added = 0, skipped = 0;
      paths.forEach(function (p) { (EL.lib.resolveDrop(kind, p) === 'dir' ? dirs : files).push(p); });
      if (files.length) {
        if (!dest) { dest = EL.lib.ensureFolder(kind, 'Imported'); nav = dest; }
        var r = EL.lib.importFiles(kind, dest, files);
        if (r.ok) { added += r.added; skipped += r.skipped; } else { EL.ui.toast(r.err, 'err'); return; }
      }
      dirs.forEach(function (d) {
        var r = EL.lib.importFolder(kind, d, dest);
        if (r.ok) { added += r.added; if (!nav && !customTarget()) nav = r.id; } else EL.ui.toast(r.err, 'err');
      });
      if (!added && !skipped) return;
      var where = nav ? ' into “' + EL.ops.last(nav) + '”' : '';
      EL.ui.toast(added ? 'Imported ' + EL.ops.plural(added, 'file') + where + (skipped ? ' (' + skipped + ' unsupported skipped)' : '') : 'No supported files found', added ? '' : 'err');
      if (nav) open(nav); else reload(true);
    }

    /* ---------- events ---------- */
    section.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'), it, id;
      if (!b) {
        var row = e.target.closest('.row, .card');
        if (row && (it = itemOf(row))) return primary(it);
        return;
      }
      var act = b.dataset.act;
      if (act === 'open') { id = b.dataset.id; return open(id); }
      if (act === 'crumb') return open(b.dataset.id || null);
      if (act === 'fav') {
        e.stopPropagation(); id = b.closest('[data-id]').dataset.id;
        EL.store.toggleFav(id); return render(true);
      }
      if (act === 'rename') {
        e.stopPropagation(); id = b.closest('[data-id]').dataset.id;
        return EL.ops.rename(id).then(function (nid) {
          if (!nid) return;
          if (st.cur === id || (st.cur && st.cur.indexOf(id + '/') === 0)) st.cur = nid + st.cur.slice(id.length);
          reload(true);
        });
      }
      if (act === 'delfolder') {
        e.stopPropagation(); id = b.closest('[data-id]').dataset.id;
        return EL.ops.remove(id).then(function (done) {
          if (!done) return;
          if (st.cur === id || (st.cur && st.cur.indexOf(id + '/') === 0)) st.cur = EL.lib.parentOf(id);
          reload(true); EL.ui.toast('Folder deleted');
        });
      }
      if (act === 'clearq') { input.value = ''; setQuery(''); return input.focus(); }
      if (act === 'newfolder') {
        return EL.ui.prompt({ title: 'New folder', placeholder: 'Folder name', ok: 'Create' }).then(function (name) {
          if (!name) return;
          var parent = customTarget(), r = EL.lib.createFolder(kind, parent, name);
          if (!r.ok) return EL.ui.toast(r.err, 'err');
          EL.ui.toast('Created “' + EL.ops.last(r.id) + '”');
          if (parent) reload(true); else open(r.id);
        });
      }
      if (act === 'import') {
        return EL.ui.choose({ title: 'Import', options: [
          { id: 'files', label: 'Files…', sub: isSfx ? 'Audio files and presets' : 'Videos, images and presets', icon: 'upload' },
          { id: 'dir', label: 'A whole folder…', sub: 'Keeps its subfolders', icon: 'folder' }] }).then(function (c) {
          if (!c) return;
          var paths = EL.cep.pick({ multi: c === 'files', dir: c === 'dir', title: 'Import into ' + label, types: c === 'files' ? EL.lib.acceptTypes(kind) : [] });
          if (paths.length) doImport(paths);
        });
      }
      // item actions
      it = itemOf(b); if (!it) return;
      e.stopPropagation();
      if (act === 'play') return EL.audio.toggle(it.path);
      if (act === 'insert') return EL.ops.insert(it);
      if (act === 'save') {
        return EL.ops.pickCustomFolder(kind, 'Save a copy to…').then(function (dest) {
          if (!dest) return;
          var r = EL.lib.importFiles(kind, dest, [it.path]);
          EL.ui.toast(r.ok && r.added ? 'Saved to “' + EL.ops.last(dest) + '”' : 'Could not save', r.ok && r.added ? '' : 'err');
          if (r.ok && customTarget() === dest) reload(true);
        });
      }
      if (act === 'del') {
        return EL.ui.confirm({ title: 'Delete “' + it.name + '”?', msg: 'This removes your imported copy. Bundled assets are never touched.', ok: 'Delete', danger: true }).then(function (y) {
          if (!y) return;
          if (EL.audio.cur === it.path) EL.audio.stop();
          var r = EL.lib.deleteFile(kind, it.path);
          if (!r.ok) return EL.ui.toast(r.err, 'err');
          reload(true);
        });
      }
    });
    function primary(it) {
      if (it.type === 'preset') return;
      if (isSfx) return EL.audio.toggle(it.path);
      EL.ui.viewer(it, EL.ops.insert);
    }
    section.addEventListener('dblclick', function (e) {
      if (e.target.closest('button')) return;
      var row = e.target.closest('.row, .card'), it = row && itemOf(row);
      if (it) EL.ops.insert(it);
    });
    // Drag out (best effort: AE may or may not accept it; the + button is the reliable path)
    section.addEventListener('dragstart', function (e) {
      var it = itemOf(e.target); if (!it) return;
      var url = EL.url(it.path);
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/uri-list', url);
      e.dataTransfer.setData('text/plain', it.path);
    });
    // Drag in (import)
    var dropDepth = 0;
    function hasFiles(e) { return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') > -1; }
    section.addEventListener('dragenter', function (e) { if (hasFiles(e)) { dropDepth++; section.classList.add('dropping'); } });
    section.addEventListener('dragleave', function (e) { if (hasFiles(e) && --dropDepth <= 0) { dropDepth = 0; section.classList.remove('dropping'); } });
    section.addEventListener('dragover', function (e) { if (hasFiles(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
    section.addEventListener('drop', function (e) {
      if (!hasFiles(e)) return;
      e.preventDefault(); dropDepth = 0; section.classList.remove('dropping');
      var paths = Array.prototype.map.call(e.dataTransfer.files, function (f) { return f.path; }).filter(Boolean);
      if (paths.length) doImport(paths);
    });

    function setQuery(q) {
      st.q = q.trim(); clearBtn.hidden = !input.value; reload();
    }
    input.addEventListener('input', function () {
      clearBtn.hidden = !input.value;
      clearTimeout(searchTimer); searchTimer = setTimeout(function () { setQuery(input.value); }, 140);
    });
    input.addEventListener('keydown', function (e) { if (e.key === 'Escape' && input.value) { e.stopPropagation(); input.value = ''; setQuery(''); } });

    return {
      open: open,
      reload: reload,
      activate: function () { reload(true); scroller.scrollTop = saved; },
      deactivate: function () { saved = scroller.scrollTop; EL.audio.stop(); },
      get cur() { return st.cur; }
    };
  };
})();
