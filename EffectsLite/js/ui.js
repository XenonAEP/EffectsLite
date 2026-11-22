/* Tiny UI helpers: toast + modal dialogs (CEP has no reliable prompt()/confirm()). */
(function () {
  var EL = window.EL, esc = EL.esc;
  var toastEl, toastTimer, root, openCount = 0;

  function icon(n) { return '<svg class="ic"><use href="#i-' + n + '"/></svg>'; }
  EL.icon = icon;

  function modal(html, onMount) {
    return new Promise(function (resolve) {
      root = root || EL.$('#modal-root');
      var wrap = document.createElement('div');
      wrap.className = 'modal';
      wrap.innerHTML = '<div class="dlg" role="dialog" aria-modal="true">' + html + '</div>';
      root.appendChild(wrap); openCount++;
      var done = false;
      function close(v) {
        if (done) return; done = true;
        document.removeEventListener('keydown', onKey, true);
        wrap.remove(); openCount--;
        resolve(v);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.stopPropagation(); close(null); }
      }
      document.addEventListener('keydown', onKey, true);
      wrap.addEventListener('mousedown', function (e) { if (e.target === wrap) close(null); });
      onMount(wrap, close);
    });
  }

  EL.ui = {
    get modalOpen() { return openCount > 0; },
    toast: function (msg, type) {
      toastEl = toastEl || EL.$('#toast');
      toastEl.textContent = msg;
      toastEl.className = 'show ' + (type || '');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toastEl.className = ''; }, 2600);
    },
    confirm: function (o) {
      return modal('<h3>' + esc(o.title) + '</h3><p>' + esc(o.msg || '') + '</p>' +
        '<div class="dlg-btns"><button class="btn" data-r="0">Cancel</button><button class="btn ' + (o.danger ? 'danger' : 'primary') + '" data-r="1">' + esc(o.ok || 'OK') + '</button></div>',
        function (w, close) {
          w.addEventListener('click', function (e) { var b = e.target.closest('[data-r]'); if (b) close(b.dataset.r === '1'); });
          EL.$('[data-r="1"]', w).focus();
        }).then(function (v) { return !!v; });
    },
    prompt: function (o) {
      return modal('<h3>' + esc(o.title) + '</h3><input class="field" type="text" maxlength="80" spellcheck="false" value="' + esc(o.value || '') + '" placeholder="' + esc(o.placeholder || '') + '">' +
        '<div class="dlg-err" hidden></div><div class="dlg-btns"><button class="btn" data-r="0">Cancel</button><button class="btn primary" data-r="1">' + esc(o.ok || 'OK') + '</button></div>',
        function (w, close) {
          var inp = EL.$('input', w), err = EL.$('.dlg-err', w);
          function submit() {
            var v = inp.value.trim();
            if (!v) { err.hidden = false; err.textContent = 'Please enter a name'; return; }
            if (o.validate) { var m = o.validate(v); if (m) { err.hidden = false; err.textContent = m; return; } }
            close(v);
          }
          w.addEventListener('click', function (e) { var b = e.target.closest('[data-r]'); if (b) { if (b.dataset.r === '1') submit(); else close(null); } });
          inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
          inp.focus(); inp.select();
        });
    },
    /** o.options: [{id,label,sub,icon}] -> resolves to the chosen id or null */
    choose: function (o) {
      var list = o.options.map(function (x) {
        return '<button class="opt" data-id="' + esc(x.id) + '">' + icon(x.icon || 'folder') + '<span><b>' + esc(x.label) + '</b>' + (x.sub ? '<i>' + esc(x.sub) + '</i>' : '') + '</span></button>';
      }).join('');
      return modal('<h3>' + esc(o.title) + '</h3><div class="opts">' + (list || '<p class="muted">Nothing to choose yet.</p>') + '</div><div class="dlg-btns"><button class="btn" data-r="0">Cancel</button></div>',
        function (w, close) {
          w.addEventListener('click', function (e) {
            var b = e.target.closest('.opt'); if (b) return close(b.dataset.id);
            if (e.target.closest('[data-r]')) close(null);
          });
        });
    },
    /** Image/video viewer. item: {path,type,name}. onInsert(item) */
    viewer: function (item, onInsert) {
      var media = item.type === 'video'
        ? '<video class="vmedia" controls loop autoplay playsinline></video>'
        : item.type === 'image' ? '<img class="vmedia" alt="">' : '<div class="vmedia vnone">No preview for this file type</div>';
      return modal('<div class="vhead"><b>' + esc(item.name) + '</b><button class="ib" data-r="x" title="Close">' + icon('x') + '</button></div>' + media +
        '<div class="vnote" hidden>This file can’t be previewed in the panel, but it will still import into After Effects.</div>' +
        '<div class="dlg-btns"><button class="btn" data-r="x">Close</button><button class="btn primary" data-r="ins">' + icon('plus') + ' Insert</button></div>',
        function (w, close) {
          var m = EL.$('.vmedia', w), note = EL.$('.vnote', w);
          if (m && m.tagName === 'VIDEO') {
            m.volume = EL.store.prefs.volume;
            m.addEventListener('error', function () { m.hidden = true; note.hidden = false; });
            m.src = EL.url(item.path);
          } else if (m && m.tagName === 'IMG') {
            m.addEventListener('error', function () { m.hidden = true; note.hidden = false; });
            m.src = EL.url(item.path);
          }
          w.addEventListener('click', function (e) {
            var b = e.target.closest('[data-r]'); if (!b) return;
            if (b.dataset.r === 'ins') onInsert(item);
            if (m && m.tagName === 'VIDEO') { m.pause(); m.removeAttribute('src'); m.load(); } // release the file handle/decoder
            close(null);
          });
          w.addEventListener('mousedown', function (e) { if (e.target === w && m && m.tagName === 'VIDEO') { m.pause(); m.removeAttribute('src'); m.load(); } });
        });
    }
  };
})();
