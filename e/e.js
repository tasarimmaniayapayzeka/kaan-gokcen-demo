/* Yön E · küçük davranışlar: mobil menü, arama paneli, etkin bölüm (içindekiler ve profil sekmeleri). */
(function () {
  var d = document;

  var menuDugme = d.querySelector('.menu-dugme');
  var menu = d.getElementById('menu');
  var araDugme = d.querySelector('.ara-dugme');
  var arama = d.getElementById('arama');

  function menuKapat() {
    if (!menu || !menuDugme) return;
    menu.classList.remove('acik');
    menuDugme.setAttribute('aria-expanded', 'false');
  }
  function aramaKapat() {
    if (!arama || !araDugme) return;
    arama.setAttribute('hidden', '');
    araDugme.setAttribute('aria-expanded', 'false');
  }

  if (menuDugme && menu) {
    menuDugme.addEventListener('click', function () {
      var acik = menu.classList.toggle('acik');
      menuDugme.setAttribute('aria-expanded', acik ? 'true' : 'false');
      if (acik) aramaKapat();
    });
  }

  if (araDugme && arama) {
    araDugme.addEventListener('click', function () {
      if (arama.hasAttribute('hidden')) {
        arama.removeAttribute('hidden');
        araDugme.setAttribute('aria-expanded', 'true');
        menuKapat();
        var kutu = arama.querySelector('input');
        if (kutu) kutu.focus();
      } else {
        aramaKapat();
      }
    });
  }

  d.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (arama && !arama.hasAttribute('hidden')) { aramaKapat(); araDugme.focus(); }
    if (menu && menu.classList.contains('acik')) { menuKapat(); menuDugme.focus(); }
  });

  // Etkin bölüm: görünüm alanının üst %35'ine girmiş son başlık etkin sayılır.
  if (!('IntersectionObserver' in window)) return;
  [].forEach.call(d.querySelectorAll('[data-izle]'), function (nav) {
    var baglar = [].slice.call(nav.querySelectorAll('a[href^="#"]'));
    var hedefler = baglar.map(function (a) { return d.getElementById(a.getAttribute('href').slice(1)); });
    var liste = nav.querySelector('ul, ol');
    var onceki = -1;
    function guncelle() {
      var sinir = window.innerHeight * 0.35;
      var etkin = 0;
      for (var i = 0; i < hedefler.length; i++) {
        if (hedefler[i] && hedefler[i].getBoundingClientRect().top <= sinir) etkin = i;
      }
      if (etkin === onceki) return;
      onceki = etkin;
      baglar.forEach(function (a, i) { a.classList.toggle('etkin', i === etkin); });
      // Yatay kayan sekme çubuğunda etkin sekmeyi görünür tut (yalnız çubuğun kendisi kayar).
      if (liste && liste.scrollWidth > liste.clientWidth) {
        var r = baglar[etkin].getBoundingClientRect(), u = liste.getBoundingClientRect();
        if (r.left < u.left || r.right > u.right) liste.scrollLeft += r.left - u.left - 16;
      }
    }
    // Biri %35 çizgisini geçişi, diğeri görünüme girip çıkmayı (ani atlamalar dahil) yakalar.
    var cizgi = new IntersectionObserver(guncelle, { rootMargin: '0px 0px -65% 0px', threshold: [0, 1] });
    var gorunum = new IntersectionObserver(guncelle, { threshold: [0, 1] });
    hedefler.forEach(function (h) { if (h) { cizgi.observe(h); gorunum.observe(h); } });
    // Sayfa başı ve sonu bekçileri: başlık görünmeden yapılan atlamalarda da güncelle.
    [d.querySelector('.ust'), d.querySelector('.alt')].forEach(function (b) { if (b) gorunum.observe(b); });
    guncelle();
  });
})();
