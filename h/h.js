// Yön H: mobil menü ve arama paneli, akademik sekmeler, sekme çubuğunda etkin bölüm.
(function () {
  function ac(dugme, panel, odak) {
    if (!dugme || !panel) return;
    dugme.addEventListener('click', function () {
      var acik = dugme.getAttribute('aria-expanded') === 'true';
      dugme.setAttribute('aria-expanded', String(!acik));
      panel.hidden = acik;
      if (!acik && odak) { var g = panel.querySelector(odak); if (g) g.focus(); }
    });
  }
  ac(document.querySelector('.menu-dugme'), document.getElementById('mobil-menu'));
  ac(document.querySelector('.ara-dugme'), document.getElementById('mobil-ara'), 'input');
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var b = document.querySelector('.menu-dugme[aria-expanded="true"]');
    if (b) { b.click(); b.focus(); }
  });

  // Sekmeler (ARIA tablist; JS yoksa bütün paneller açık kalır)
  Array.prototype.forEach.call(document.querySelectorAll('[data-sekmeler]'), function (k) {
    var t = k.querySelectorAll('[role="tab"]');
    var p = k.querySelectorAll('[role="tabpanel"]');
    function sec(i) {
      for (var j = 0; j < t.length; j++) {
        t[j].setAttribute('aria-selected', String(j === i));
        t[j].tabIndex = j === i ? 0 : -1;
        p[j].hidden = j !== i;
      }
    }
    Array.prototype.forEach.call(t, function (x, i) {
      x.addEventListener('click', function () { sec(i); });
      x.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var n = (i + (e.key === 'ArrowRight' ? 1 : -1) + t.length) % t.length;
        sec(n); t[n].focus();
      });
    });
    sec(0);
  });

  // Sekme çubuğu: görünen bölüme göre etkin bağlantı
  var bar = document.querySelector('[data-izle]');
  if (bar && 'IntersectionObserver' in window) {
    var linkler = Array.prototype.slice.call(bar.querySelectorAll('a[href^="#"]'));
    var hedef = linkler.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    var liste = bar.querySelector('ol');
    function etkin(a) {
      linkler.forEach(function (l) { l.classList.toggle('etkin', l === a); if (l === a) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); });
      if (liste && (a.offsetLeft < liste.scrollLeft || a.offsetLeft + a.offsetWidth > liste.scrollLeft + liste.clientWidth)) liste.scrollLeft = a.offsetLeft - 16;
    }
    var gozcu = new IntersectionObserver(function (girdiler) {
      girdiler.forEach(function (g) {
        if (!g.isIntersecting) return;
        var i = hedef.indexOf(g.target);
        if (i > -1) etkin(linkler[i]);
      });
    }, { rootMargin: '-140px 0px -60% 0px' });
    hedef.forEach(function (h) { if (h) gozcu.observe(h); });
  }
})();
