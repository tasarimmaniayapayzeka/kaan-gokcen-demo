// Yön G: mobil menü, mobil içindekiler, sayfa içi etkin bağlantı. Bağımsız ve küçük.
(function () {
  var dar = window.matchMedia('(max-width: 960px)');
  var panel = document.getElementById('mobil-menu');
  var menuDugme = document.querySelector('.menu-ac');
  function ac(acik) {
    if (!panel || !menuDugme) return;
    panel.hidden = !acik;
    menuDugme.setAttribute('aria-expanded', acik ? 'true' : 'false');
    menuDugme.setAttribute('aria-label', acik ? 'Menüyü kapat' : 'Menüyü aç');
  }
  if (menuDugme) menuDugme.addEventListener('click', function () { ac(panel.hidden); });
  var araDugme = document.querySelector('.ara-ac');
  if (araDugme) araDugme.addEventListener('click', function () {
    ac(true);
    var g = document.getElementById(araDugme.getAttribute('data-odak'));
    if (g) g.focus();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel && !panel.hidden) { ac(false); menuDugme.focus(); } });

  // Mobilde içindekiler kapalı başlar; masaüstünde hep açık.
  var toc = document.querySelector('.toc');
  if (toc) {
    if (window.matchMedia('(max-width: 900px)').matches) toc.removeAttribute('open');
    toc.querySelector('summary').addEventListener('click', function (e) { if (!window.matchMedia('(max-width: 900px)').matches) e.preventDefault(); });
  }

  // Etkin bölüm: içindekiler ve hap sekmeler. Eşik çizgisinin üstüne geçen son başlık etkindir.
  var gruplar = [[document.querySelectorAll('.toc a[href^="#"]'), 150], [document.querySelectorAll('.hap-sekme a[href^="#"]'), 190]];
  var kayitlar = [];
  gruplar.forEach(function (g) {
    var baglar = g[0], hedefler = [];
    baglar.forEach(function (a) { var h = document.getElementById(a.getAttribute('href').slice(1)); if (h) hedefler.push([h, a]); });
    if (hedefler.length) kayitlar.push({ baglar: baglar, hedefler: hedefler, esik: g[1], son: null });
  });
  function guncelle() {
    kayitlar.forEach(function (k) {
      var etkin = k.hedefler[0][1];
      for (var i = 0; i < k.hedefler.length; i++) { if (k.hedefler[i][0].getBoundingClientRect().top - k.esik <= 0) etkin = k.hedefler[i][1]; }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4 && k.hedefler[k.hedefler.length - 1][0].getBoundingClientRect().top < window.innerHeight) etkin = k.hedefler[k.hedefler.length - 1][1];
      if (etkin === k.son) return;
      k.son = etkin;
      k.baglar.forEach(function (a) { a.classList.toggle('etkin', a === etkin); if (a === etkin) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      var kap = etkin.closest('.hap-sekme ul');
      if (kap && dar.matches) kap.scrollTo({ left: etkin.offsetLeft - 16, behavior: 'smooth' });
    });
  }
  var bekliyor = false;
  window.addEventListener('scroll', function () { if (!bekliyor) { bekliyor = true; requestAnimationFrame(function () { bekliyor = false; guncelle(); }); } }, { passive: true });
  guncelle();
})();
