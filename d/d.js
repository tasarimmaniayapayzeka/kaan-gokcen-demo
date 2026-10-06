/* Yön D: mobil menü paneli, mega menüde Esc, sekme/çapa çubuğunda etkin bölüm vurgusu. Bağımlılık yok. */
(function () {
  var ust = document.querySelector('.ust');
  var panel = document.getElementById('mobil-panel');
  var menuDg = document.querySelector('.menu-dugme');
  var araDg = document.querySelector('.ara-dugme');

  function panelAc(acik) {
    if (!panel) return;
    panel.hidden = !acik;
    ust.classList.toggle('panel-acik', acik);
    if (menuDg) {
      menuDg.setAttribute('aria-expanded', String(acik));
      menuDg.setAttribute('aria-label', acik ? 'Menüyü kapat' : 'Menüyü aç');
    }
  }
  if (menuDg) menuDg.addEventListener('click', function () { panelAc(panel.hidden); });
  if (araDg) araDg.addEventListener('click', function () {
    panelAc(true);
    var girdi = panel.querySelector('input');
    if (girdi) girdi.focus();
  });
  // Masaüstüne geçişte panel kapanır
  var mq = window.matchMedia('(min-width: 1200px)');
  var degisti = function (e) { if (e.matches) panelAc(false); };
  if (mq.addEventListener) mq.addEventListener('change', degisti); else if (mq.addListener) mq.addListener(degisti);

  // Esc: mega menüyü ve mobil paneli kapatır
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (panel && !panel.hidden) { panelAc(false); if (menuDg) menuDg.focus(); return; }
    var etkin = document.activeElement;
    if (etkin && etkin.closest && etkin.closest('.mega-li')) {
      ust.classList.add('mega-kapali');
      etkin.blur();
    }
  });
  var megaLi = document.querySelector('.mega-li');
  if (megaLi) megaLi.addEventListener('mouseleave', function () { ust.classList.remove('mega-kapali'); });
  if (megaLi) megaLi.addEventListener('focusin', function () { ust.classList.remove('mega-kapali'); });

  // Sekme / çapa çubuğu: görünürdeki bölümü vurgula
  var cubuk = document.querySelector('[data-izle]');
  if (!cubuk || !('IntersectionObserver' in window)) return;
  var baglar = Array.prototype.slice.call(cubuk.querySelectorAll('a[href^="#"]'));
  var hedefler = [];
  baglar.forEach(function (a) {
    var el = document.getElementById(a.getAttribute('href').slice(1));
    if (el) hedefler.push({ el: el, a: a });
  });
  function isaretle(a) {
    baglar.forEach(function (b) { b.classList.remove('etkin'); b.removeAttribute('aria-current'); });
    a.classList.add('etkin');
    a.setAttribute('aria-current', 'location');
    var sol = a.offsetLeft - 16;
    if (cubuk.scrollWidth > cubuk.clientWidth) cubuk.scrollTo({ left: sol, behavior: 'smooth' });
  }
  var io = new IntersectionObserver(function (girdiler) {
    girdiler.forEach(function (g) {
      if (!g.isIntersecting) return;
      for (var i = 0; i < hedefler.length; i++) if (hedefler[i].el === g.target) isaretle(hedefler[i].a);
    });
  }, { rootMargin: '-150px 0px -55% 0px' });
  hedefler.forEach(function (h) { io.observe(h.el); });
})();
