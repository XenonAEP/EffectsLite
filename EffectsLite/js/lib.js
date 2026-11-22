/* Library model: bundled assets (read-only, "b") + user content (writable, "u").
   Folder id = "<kind>:<b|u>:<relative/path>"  e.g. "sfx:b:Extras/Hits", "overlays:u:My Pack".
   Every mutating function refuses anything that is not inside the user root. */
(function () {
  var EL = window.EL;
  var fs, path, roots = {}, userRoot = '', extRoot = '', cacheRoot = '';
  var collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

  var AUDIO = 'mp3 wav aif aiff m4a aac flac ogg'.split(' ');
  var VIDEO = 'mp4 mov m4v avi mxf'.split(' ');
  var IMAGE = 'png jpg jpeg gif tif tiff bmp tga psd'.split(' ');
  var ACCEPT = {
    sfx: { audio: AUDIO, video: ['mp4', 'mov', 'm4v'], preset: ['ffx'] },      // video-with-sound files are valid SFX
    overlays: { video: VIDEO, image: IMAGE, preset: ['ffx'] }
  };
  var searchCache = {};

  function typeOf(kind, ext) {
    var a = ACCEPT[kind];
    if (a.audio && a.audio.indexOf(ext) > -1) return 'audio';
    if (a.video && a.video.indexOf(ext) > -1) return kind === 'sfx' ? 'audio' : 'video';
    if (a.image && a.image.indexOf(ext) > -1) return 'image';
    if (a.preset.indexOf(ext) > -1) return 'preset';
    return null;
  }
  function allExts(kind) { return [].concat.apply([], Object.keys(ACCEPT[kind]).map(function (k) { return ACCEPT[kind][k]; })); }
  function sane(n) {
    return String(n || '').replace(/[\\\/:*?"<>|\x00-\x1f]/g, '').replace(/^\.+/, '').replace(/[. ]+$/, '').trim().slice(0, 80);
  }
  function inside(root, p) {
    var r = path.resolve(root), q = path.resolve(p);
    return q.indexOf(r + path.sep) === 0;
  }
  function parse(id) {
    var m = /^(sfx|overlays):(b|u):(.*)$/.exec(id || '');
    if (!m) return null;
    var rel = m[3];
    if (rel.split('/').some(function (s) { return s === '..' || s === '.'; })) return null;
    return { kind: m[1], src: m[2], rel: rel };
  }
  function mk(kind, src, rel) { return kind + ':' + src + ':' + rel; }
  function absOf(kind, src, rel) { return rel ? path.join.apply(path, [roots[kind][src]].concat(rel.split('/'))) : roots[kind][src]; }
  function abs(id) { var p = parse(id); return p ? absOf(p.kind, p.src, p.rel) : null; }
  function ok(extra) { return Object.assign({ ok: true }, extra || {}); }
  function fail(msg) { return { ok: false, err: msg }; }
  function dirty(kind) { delete searchCache[kind]; }

  function readDir(dir) {
    try { return fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return []; }
  }
  function countRec(dir, kind, cap) {
    var n = 0, exts = allExts(kind);
    function walk(p) {
      if (n >= cap) return;
      readDir(p).forEach(function (d) {
        if (d.name.charAt(0) === '.') return;
        if (d.isDirectory()) walk(path.join(p, d.name));
        else if (exts.indexOf(extOf(d.name)) > -1) n++;
      });
    }
    walk(dir);
    return n;
  }
  function extOf(name) { var i = name.lastIndexOf('.'); return i < 0 ? '' : name.slice(i + 1).toLowerCase(); }
  function baseOf(name) { var i = name.lastIndexOf('.'); return i < 0 ? name : name.slice(0, i); }

  function fileItem(kind, src, rel, dir, name) {
    var ext = extOf(name), type = typeOf(kind, ext);
    if (!type) return null;
    return { kind: kind, path: path.join(dir, name), name: baseOf(name), file: name, ext: ext, type: type, custom: src === 'u', src: src, rel: rel ? rel + '/' + name : name };
  }
  function folderItem(kind, src, rel, name, dir, withCount) {
    var r = rel ? rel + '/' + name : name;
    return { id: mk(kind, src, r), name: name, custom: src === 'u', count: withCount ? countRec(path.join(dir, name), kind, 9999) : null, path: path.join(dir, name) };
  }
  function sortByName(a, b) { return collator.compare(a.name, b.name); }

  function rmrf(p) {
    var st; try { st = fs.lstatSync(p); } catch (e) { return; }
    if (st.isDirectory() && !st.isSymbolicLink()) {
      fs.readdirSync(p).forEach(function (n) { rmrf(path.join(p, n)); });
      fs.rmdirSync(p);
    } else fs.unlinkSync(p);
  }
  function uniqueName(dir, name) {
    if (!fs.existsSync(path.join(dir, name))) return name;
    var ext = extOf(name), b = ext ? baseOf(name) : name, i = 2, n;
    do { n = b + ' (' + i++ + ')' + (ext ? '.' + ext : ''); } while (fs.existsSync(path.join(dir, n)));
    return n;
  }
  function copyTree(src, dst, kind) {
    fs.mkdirSync(dst, { recursive: true });
    var n = 0;
    readDir(src).forEach(function (d) {
      if (d.name.charAt(0) === '.') return;
      var s = path.join(src, d.name);
      if (d.isDirectory()) n += copyTree(s, path.join(dst, d.name), kind);
      else if (typeOf(kind, extOf(d.name))) { fs.copyFileSync(s, path.join(dst, uniqueName(dst, d.name))); n++; }
    });
    return n;
  }

  EL.lib = {
    init: function () {
      fs = EL.node.fs; path = EL.node.path;
      var ud = EL.cep.sysPath('userData');
      var base = ud || path.join(EL.node.os.homedir(), '.effectslite-data');
      userRoot = path.join(base, 'EffectsLite');
      extRoot = EL.cep.sysPath('extension') || path.dirname(decodeURIComponent(location.pathname.replace(/^\/([A-Za-z]:)/, '$1')));
      cacheRoot = path.join(userRoot, 'cache', 'thumbs');
      ['sfx', 'overlays'].forEach(function (k) {
        roots[k] = { b: path.join(extRoot, 'assets', k), u: path.join(userRoot, k) };
        fs.mkdirSync(roots[k].u, { recursive: true });
      });
      fs.mkdirSync(cacheRoot, { recursive: true });
      return userRoot;
    },
    get userRoot() { return userRoot; },
    get extRoot() { return extRoot; },
    get cacheRoot() { return cacheRoot; },
    roots: function () { return roots; },
    parse: parse, abs: abs, mk: mk, typeOf: typeOf, allExts: allExts, sane: sane,
    acceptTypes: function (kind) { return allExts(kind); },
    dirty: dirty,
    exists: function (id) { var a = abs(id); return !!a && fs.existsSync(a); },

    /** List a folder (id=null -> merged roots). Returns {folders, files}. */
    list: function (kind, id) {
      var folders = [], files = [];
      if (!id) {
        ['b', 'u'].forEach(function (src) {
          readDir(roots[kind][src]).forEach(function (d) {
            if (d.name.charAt(0) !== '.' && d.isDirectory()) folders.push(folderItem(kind, src, '', d.name, roots[kind][src], true));
          });
        });
      } else {
        var p = parse(id); if (!p) return { folders: [], files: [] };
        var dir = absOf(kind, p.src, p.rel), many = 0;
        var ents = readDir(dir);
        ents.forEach(function (d) { if (d.isDirectory()) many++; });
        ents.forEach(function (d) {
          if (d.name.charAt(0) === '.') return;
          if (d.isDirectory()) folders.push(folderItem(kind, p.src, p.rel, d.name, dir, many <= 200));
          else { var f = fileItem(kind, p.src, p.rel, dir, d.name); if (f) files.push(f); }
        });
      }
      folders.sort(sortByName); files.sort(sortByName);
      return { folders: folders, files: files };
    },
    /** Breadcrumb trail for an id: [{name,id}] (excluding root). */
    trail: function (id) {
      var p = parse(id), out = [];
      if (!p || !p.rel) return out;
      var segs = p.rel.split('/'), acc = [];
      segs.forEach(function (s) { acc.push(s); out.push({ name: s, id: mk(p.kind, p.src, acc.join('/')) }); });
      return out;
    },
    parentOf: function (id) {
      var p = parse(id); if (!p) return null;
      var i = p.rel.lastIndexOf('/');
      return i < 0 ? null : mk(p.kind, p.src, p.rel.slice(0, i));
    },
    /** All user-created folders (flat, with display path) for the "save to" picker / settings. */
    userFolders: function (kind) {
      var out = [];
      (function walk(dir, rel) {
        readDir(dir).forEach(function (d) {
          if (d.name.charAt(0) === '.' || !d.isDirectory()) return;
          var r = rel ? rel + '/' + d.name : d.name;
          out.push({ id: mk(kind, 'u', r), name: r });
          walk(path.join(dir, d.name), r);
        });
      })(roots[kind].u, '');
      return out.sort(sortByName);
    },
    userRootFolders: function (kind) {
      return readDir(roots[kind].u).filter(function (d) { return d.isDirectory() && d.name.charAt(0) !== '.'; })
        .map(function (d) { return folderItem(kind, 'u', '', d.name, roots[kind].u, false); }).sort(sortByName);
    },
    /** Light description of a folder id, or null when it no longer exists. */
    meta: function (id) {
      var p = parse(id); if (!p) return null;
      var a = absOf(p.kind, p.src, p.rel);
      if (!fs.existsSync(a)) return null;
      var parts = p.rel.split('/');
      return { id: id, kind: p.kind, name: parts[parts.length - 1], where: parts.slice(0, -1).join(' / '), custom: p.src === 'u', count: countRec(a, p.kind, 9999) };
    },
    folderStats: function (id) {
      var p = parse(id), n = 0, bytes = 0;
      (function walk(dir) {
        readDir(dir).forEach(function (d) {
          var f = path.join(dir, d.name);
          if (d.isDirectory()) walk(f);
          else { n++; try { bytes += fs.statSync(f).size; } catch (e) { } }
        });
      })(absOf(p.kind, p.src, p.rel));
      return { files: n, bytes: bytes };
    },
    totals: function (kind) {
      return { bundled: countRec(roots[kind].b, kind, 1e6), custom: countRec(roots[kind].u, kind, 1e6) };
    },

    /** Global search by filename tokens. Index is built lazily and dropped on any mutation. */
    search: function (kind, q) {
      var toks = q.toLowerCase().split(/\s+/).filter(Boolean);
      if (!toks.length) return [];
      if (!searchCache[kind]) {
        var all = [];
        ['b', 'u'].forEach(function (src) {
          (function walk(dir, rel) {
            readDir(dir).forEach(function (d) {
              if (d.name.charAt(0) === '.') return;
              if (d.isDirectory()) walk(path.join(dir, d.name), rel ? rel + '/' + d.name : d.name);
              else { var f = fileItem(kind, src, rel, dir, d.name); if (f) { f.hay = (rel + '/' + d.name).toLowerCase(); all.push(f); } }
            });
          })(roots[kind][src], '');
        });
        all.sort(sortByName);
        searchCache[kind] = all;
      }
      var out = [];
      for (var i = 0; i < searchCache[kind].length && out.length < 1000; i++) {
        var it = searchCache[kind][i];
        if (toks.every(function (t) { return it.hay.indexOf(t) > -1; })) out.push(it);
      }
      return out;
    },

    // ---------------- mutations (user area only) ----------------
    createFolder: function (kind, parentId, name) {
      name = sane(name);
      if (!name) return fail('Enter a valid folder name');
      var p = parentId ? parse(parentId) : null;
      var rel = p && p.src === 'u' ? p.rel : '';
      var dir = absOf(kind, 'u', rel), target = path.join(dir, name);
      if (!inside(roots[kind].u, target)) return fail('Invalid location');
      var clash = readDir(dir).some(function (d) { return d.name.toLowerCase() === name.toLowerCase(); });
      if (clash) return fail('A folder or file with that name already exists');
      try { fs.mkdirSync(target); } catch (e) { return fail(e.message); }
      dirty(kind);
      return ok({ id: mk(kind, 'u', rel ? rel + '/' + name : name) });
    },
    renameFolder: function (id, newName) {
      var p = parse(id);
      if (!p || p.src !== 'u' || !p.rel) return fail('Only custom folders can be renamed');
      newName = sane(newName);
      if (!newName) return fail('Enter a valid folder name');
      var from = absOf(p.kind, 'u', p.rel), dir = path.dirname(from), to = path.join(dir, newName);
      var curName = path.basename(from);
      if (newName === curName) return ok({ id: id });
      var clash = readDir(dir).some(function (d) { return d.name.toLowerCase() === newName.toLowerCase() && d.name.toLowerCase() !== curName.toLowerCase(); });
      if (clash) return fail('A folder or file with that name already exists');
      if (!inside(roots[p.kind].u, from) || !inside(roots[p.kind].u, to)) return fail('Invalid location');
      try { fs.renameSync(from, to); } catch (e) { return fail(e.message); }
      var i = p.rel.lastIndexOf('/'), nrel = (i < 0 ? '' : p.rel.slice(0, i + 1)) + newName, nid = mk(p.kind, 'u', nrel);
      EL.store.moveKeys(id, nid);
      dirty(p.kind);
      return ok({ id: nid });
    },
    deleteFolder: function (id) {
      var p = parse(id);
      if (!p || p.src !== 'u' || !p.rel) return fail('Only custom folders can be deleted');
      var a = absOf(p.kind, 'u', p.rel);
      if (!inside(roots[p.kind].u, a)) return fail('Invalid location');
      try { rmrf(a); } catch (e) { return fail(e.message); }
      EL.store.dropKeys(id); dirty(p.kind);
      return ok();
    },
    deleteFile: function (kind, file) {
      if (!inside(roots[kind].u, file)) return fail('Only imported files can be deleted');
      try { fs.unlinkSync(file); } catch (e) { return fail(e.message); }
      dirty(kind);
      return ok();
    },
    /** Copy files into a custom folder (never into bundled). Returns counts. */
    importFiles: function (kind, destId, paths) {
      var dp = destId ? parse(destId) : null;
      if (!dp || dp.src !== 'u') return fail('Choose a custom folder');
      var dir = absOf(kind, 'u', dp.rel), added = 0, skipped = 0;
      paths.forEach(function (src) {
        try {
          var st = fs.statSync(src);
          if (st.isDirectory()) { skipped++; return; }
          var name = path.basename(src);
          if (!typeOf(kind, extOf(name))) { skipped++; return; }
          fs.copyFileSync(src, path.join(dir, uniqueName(dir, name)));
          added++;
        } catch (e) { skipped++; }
      });
      dirty(kind);
      return ok({ added: added, skipped: skipped });
    },
    /** Copy a whole folder tree in as a new custom folder (only supported media is copied). */
    importFolder: function (kind, srcDir, parentId) {
      var p = parentId ? parse(parentId) : null;
      var rel = p && p.src === 'u' ? p.rel : '';
      var dir = absOf(kind, 'u', rel), name = uniqueName(dir, sane(path.basename(srcDir)) || 'Imported');
      var n;
      try { n = copyTree(srcDir, path.join(dir, name), kind); } catch (e) { return fail(e.message); }
      dirty(kind);
      return ok({ id: mk(kind, 'u', rel ? rel + '/' + name : name), added: n });
    },
    /** Make sure a default import target exists. */
    ensureFolder: function (kind, name) {
      var id = mk(kind, 'u', name);
      if (!fs.existsSync(absOf(kind, 'u', name))) fs.mkdirSync(absOf(kind, 'u', name), { recursive: true });
      return id;
    },
    clearThumbCache: function () {
      try { rmrf(cacheRoot); fs.mkdirSync(cacheRoot, { recursive: true }); return true; } catch (e) { return false; }
    },
    resolveDrop: function (kind, p) {
      try { return fs.statSync(p).isDirectory() ? 'dir' : 'file'; } catch (e) { return null; }
    }
  };
})();
