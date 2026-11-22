/* Lazy thumbnails. Bundled overlays ship pre-rendered; user files get a 320px JPEG generated once
   (one at a time, only while visible) and cached on disk, so scrolling never decodes full-size media twice. */
(function () {
  var EL = window.EL, W = 320;
  var urls = new Map(), failed = new Set(), pending = new Set(), queue = [], running = false, visible = new Set();
  var MAX = 600;

  function remember(path, url) {
    urls.set(path, url);
    if (urls.size > MAX) urls.delete(urls.keys().next().value);
  }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }

  function cacheFile(item) {
    var fs = EL.node.fs, path = EL.node.path, st;
    try { st = fs.statSync(item.path); } catch (e) { return null; }
    return path.join(EL.lib.cacheRoot, hash(item.path + '|' + st.size + '|' + st.mtimeMs) + '.jpg');
  }
  function bundledThumb(item) {
    if (item.src !== 'b') return null;
    var p = EL.node.path.join(EL.lib.extRoot, 'assets', '_thumbs', item.kind, item.rel.split('/').join(EL.node.path.sep) + '.jpg');
    return EL.node.fs.existsSync(p) ? p : null;
  }
  function draw(src, w, h, el) {
    var s = Math.min(1, W / w), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
    c.getContext('2d').drawImage(el, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.72).split(',')[1];
  }
  function generate(item) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { cleanup(); reject(new Error('timeout')); }, 8000), el;
      function cleanup() { clearTimeout(t); if (el) { if (el.pause) el.pause(); el.removeAttribute('src'); if (el.load) el.load(); } }
      try {
        if (item.type === 'image') {
          el = new Image();
          el.onload = function () { try { var b = draw(item.path, el.naturalWidth, el.naturalHeight, el); cleanup(); resolve(b); } catch (e) { cleanup(); reject(e); } };
          el.onerror = function () { cleanup(); reject(new Error('decode')); };
          el.src = EL.url(item.path);
        } else {
          el = document.createElement('video'); el.muted = true; el.preload = 'auto';
          el.onloadedmetadata = function () { el.currentTime = Math.min(0.5, (el.duration || 1) / 4); };
          el.onseeked = function () { try { var b = draw(item.path, el.videoWidth, el.videoHeight, el); cleanup(); resolve(b); } catch (e) { cleanup(); reject(e); } };
          el.onerror = function () { cleanup(); reject(new Error('decode')); };
          el.src = EL.url(item.path);
        }
      } catch (e) { cleanup(); reject(e); }
    });
  }
  function pump() {
    if (running) return;
    var job;
    while ((job = queue.shift())) {
      if (visible.has(job.item.path)) break;            // skip anything that scrolled away
      pending.delete(job.item.path);
    }
    if (!job) return;
    running = true;
    var cf = cacheFile(job.item);
    generate(job.item).then(function (b64) {
      if (cf) EL.node.fs.writeFileSync(cf, Buffer.from(b64, 'base64'));
      var url = cf ? EL.url(cf) : 'data:image/jpeg;base64,' + b64;
      remember(job.item.path, url); job.cb(job.item.path, url);
    }).catch(function () { failed.add(job.item.path); })
      .then(function () { pending.delete(job.item.path); running = false; setTimeout(pump, 0); });
  }

  EL.thumbs = {
    setVisible: function (paths) { visible = new Set(paths); },
    /** Returns a URL immediately if known, else null (and queues generation, calling cb(url) later). */
    get: function (item, cb) {
      var u = urls.get(item.path);
      if (u) return u;
      if (failed.has(item.path)) return null;
      var b = bundledThumb(item);
      if (b) { u = EL.url(b); remember(item.path, u); return u; }
      var cf = cacheFile(item);
      if (cf && EL.node.fs.existsSync(cf)) { u = EL.url(cf); remember(item.path, u); return u; }
      if (!pending.has(item.path)) { pending.add(item.path); queue.push({ item: item, cb: cb }); setTimeout(pump, 0); }
      return null;
    },
    isFailed: function (p) { return failed.has(p); }
  };
})();
