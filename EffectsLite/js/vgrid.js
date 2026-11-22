/* Virtual grid/list: only rows near the viewport exist in the DOM, so 10,000 items cost the same as 50.
   `host` lives inside the scrolling element `scroller` (which must be position:relative). */
(function () {
  var EL = window.EL;
  EL.VGrid = function (o) {
    var scroller = o.scroller, host = o.host, win = host.firstElementChild;
    var items = [], cols = 1, rowH = 38, rows = 0, first = -9, last = -9, raf = 0;

    function paint() {
      raf = 0;
      if (!host.clientWidth) return;
      var top = scroller.scrollTop - host.offsetTop, vh = scroller.clientHeight;
      var r0 = Math.max(0, Math.floor(top / rowH) - 2), r1 = Math.min(rows - 1, Math.ceil((top + vh) / rowH) + 2);
      if (r0 === first && r1 === last) return;               // nothing changed -> no DOM work
      first = r0; last = r1;
      var html = '', end = Math.min(items.length, (r1 + 1) * cols);
      for (var i = r0 * cols; i < end; i++) html += o.render(items[i], i);
      win.style.transform = 'translateY(' + (r0 * rowH) + 'px)';
      win.innerHTML = html;
      o.afterPaint && o.afterPaint();
    }
    function layout() {
      var w = host.clientWidth; if (!w) return;
      var gap = o.gap || 0;
      cols = o.minW ? Math.max(1, Math.floor((w + gap) / (o.minW + gap))) : 1;
      var itemW = (w - (cols - 1) * gap) / cols, h = o.itemH(itemW);
      rowH = h + gap; rows = Math.ceil(items.length / cols);
      host.style.height = Math.max(0, rows * rowH - gap) + 'px';
      win.style.setProperty('--cols', cols);
      win.style.setProperty('--rh', h + 'px');
      win.style.setProperty('--gap', gap + 'px');
      first = last = -9; paint();
    }
    function onScroll() { if (!raf) raf = requestAnimationFrame(paint); }

    scroller.addEventListener('scroll', onScroll, { passive: true });
    var lastW = 0;
    new ResizeObserver(function () {
      var w = host.clientWidth;
      if (w !== lastW) { lastW = w; layout(); } else onScroll();
    }).observe(scroller);

    return {
      get items() { return items; },
      setItems: function (a, keepScroll) { items = a; if (!keepScroll) scroller.scrollTop = 0; layout(); },
      refresh: function () { first = last = -9; paint(); },
      layout: layout
    };
  };
})();
