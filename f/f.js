// Yön F: mobil menü, arama paneli, sekmeler, "Bu sayfada" işaretleyici. Bağımsız, küçük.
(function () {
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  function ac(dugme, panel, odak) {
    if (!dugme || !panel) return;
    dugme.addEventListener('click', function () {
      var acik = dugme.getAttribute('aria-expanded') === 'true';
      dugme.setAttribute('aria-expanded', String(!acik));
      panel.hidden = acik;
      if (!acik && odak) { var o = $(odak, panel); if (o) o.focus(); }
    });
  }
  ac($('.menu-dug'), $('#mobil-menu'));
  ac($('.ara-dug'), $('#arama'), 'input');
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    $$('[aria-expanded="true"]').forEach(function (d) { var p = document.getElementById(d.getAttribute('aria-controls')); if (p) { p.hidden = true; d.setAttribute('aria-expanded', 'false'); d.focus(); } });
  });

  // Sekmeler (ok tuşlarıyla gezinme)
  $$('[role="tablist"]').forEach(function (liste) {
    var sekmeler = $$('[role="tab"]', liste);
    function sec(s) {
      sekmeler.forEach(function (x) {
        var on = x === s;
        x.setAttribute('aria-selected', String(on));
        x.tabIndex = on ? 0 : -1;
        var p = document.getElementById(x.getAttribute('aria-controls'));
        if (p) p.hidden = !on;
      });
    }
    sekmeler.forEach(function (s, i) {
      s.addEventListener('click', function () { sec(s); });
      s.addEventListener('keydown', function (e) {
        var j = null;
        if (e.key === 'ArrowRight') j = (i + 1) % sekmeler.length;
        if (e.key === 'ArrowLeft') j = (i - 1 + sekmeler.length) % sekmeler.length;
        if (e.key === 'Home') j = 0;
        if (e.key === 'End') j = sekmeler.length - 1;
        if (j !== null) { e.preventDefault(); sekmeler[j].focus(); sec(sekmeler[j]); }
      });
    });
  });

  // Mobilde "Bu sayfada" kutusu kapalı başlar
  var bs = $('details.bu-sayfada');
  if (bs && window.matchMedia('(max-width: 900px)').matches) bs.open = false;

  // Kaydırırken etkin başlığı işaretle
  var spy = $('[data-spy]');
  if (spy && 'IntersectionObserver' in window) {
    var linkler = $$('a[href^="#"]', spy);
    var hedefler = linkler.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
    var gor = new IntersectionObserver(function (girdiler) {
      girdiler.forEach(function (g) {
        if (!g.isIntersecting) return;
        linkler.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + g.target.id;
          a.classList.toggle('etkin', on);
          if (on && spy.classList.contains('capa')) {
            var kap = a.parentNode;
            var x = a.offsetLeft - kap.clientWidth / 2 + a.clientWidth / 2;
            if (kap.scrollWidth > kap.clientWidth) kap.scrollTo({ left: x, behavior: 'smooth' });
          }
        });
      });
    }, { rootMargin: '-15% 0px -75% 0px' });
    hedefler.forEach(function (h) { gor.observe(h); });
  }
})();
