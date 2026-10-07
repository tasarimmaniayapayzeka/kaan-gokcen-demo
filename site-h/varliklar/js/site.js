/* 1-h.js */
/* Yön H: mobil menü ve arama paneli, mega menüde Esc, akademik sekmeler, sekme çubuğunda etkin bölüm.
   Demo h.js'in devamı. Bağımlılık yok. */
(function () {
  var ust = document.querySelector('.ust');
  function ac(dugme, panel, odak, etiket) {
    if (!dugme || !panel) return;
    dugme.addEventListener('click', function () {
      var acik = dugme.getAttribute('aria-expanded') === 'true';
      dugme.setAttribute('aria-expanded', String(!acik));
      if (etiket) dugme.setAttribute('aria-label', acik ? etiket[0] : etiket[1]);
      panel.hidden = acik;
      if (!acik && odak) { var g = panel.querySelector(odak); if (g) g.focus(); }
    });
  }
  var menuDg = document.querySelector('.menu-dugme');
  var araDg = document.querySelector('.ara-dugme');
  var menuPanel = document.getElementById('mobil-menu');
  var araPanel = document.getElementById('mobil-ara');
  ac(menuDg, menuPanel, null, ['Menüyü aç', 'Menüyü kapat']);
  ac(araDg, araPanel, 'input');

  function kapat(dugme, panel, etiket) {
    if (!dugme || !panel || panel.hidden) return false;
    panel.hidden = true;
    dugme.setAttribute('aria-expanded', 'false');
    if (etiket) dugme.setAttribute('aria-label', etiket);
    return true;
  }
  // Masaüstü genişliğine geçişte mobil paneller kapanır
  var mq = window.matchMedia('(min-width: 1024px)');
  var degisti = function (e) { if (e.matches) { kapat(menuDg, menuPanel, 'Menüyü aç'); kapat(araDg, araPanel); } };
  if (mq.addEventListener) mq.addEventListener('change', degisti); else if (mq.addListener) mq.addListener(degisti);

  // Esc: açık mobil paneli ya da mega menüyü kapatır
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (kapat(menuDg, menuPanel, 'Menüyü aç')) { menuDg.focus(); return; }
    if (kapat(araDg, araPanel)) { araDg.focus(); return; }
    var etkin = document.activeElement;
    if (ust && etkin && etkin.closest && etkin.closest('.mega-li')) {
      ust.classList.add('mega-kapali');
      var ana = document.querySelector('.mega-li > a');
      if (ana) ana.focus();
    }
  });
  var megaLi = document.querySelector('.mega-li');
  if (megaLi && ust) {
    megaLi.addEventListener('mouseleave', function () { ust.classList.remove('mega-kapali'); });
    megaLi.addEventListener('mouseenter', function () { ust.classList.remove('mega-kapali'); });
    megaLi.addEventListener('focusout', function (e) { if (!megaLi.contains(e.relatedTarget)) ust.classList.remove('mega-kapali'); });
  }

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
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
        e.preventDefault();
        var n = e.key === 'Home' ? 0 : e.key === 'End' ? t.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + t.length) % t.length;
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
    var etkin = function (a) {
      linkler.forEach(function (l) { l.classList.toggle('etkin', l === a); if (l === a) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); });
      if (liste && (a.offsetLeft < liste.scrollLeft || a.offsetLeft + a.offsetWidth > liste.scrollLeft + liste.clientWidth)) liste.scrollLeft = a.offsetLeft - 16;
    };
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

;
/* 2-dizin.js */
/* Yön H: D temasının dizin süzgeci (web/varliklar/js/parca/dizin.js) birebir; işaretleme data-dz-* öznitelikleriyle aynı.
   Dizin süzme: yazdıkça satırları süzer, harf hapları baş harfe göre süzer. JS yoksa her şey görünür,
   harf hapları o harfin ilk konusuna atlar, arama kutusu site aramasına gider. Bağımlılık yok. */
(function () {
  var kok = document.querySelector('[data-dz]');
  if (!kok) return;
  var form = kok.querySelector('[data-dz-form]');
  var q = kok.querySelector('[data-dz-q]');
  var sil = kok.querySelector('[data-dz-sil]');
  var sonuc = kok.querySelector('[data-dz-sonuc]');
  var yok = kok.querySelector('[data-dz-yok]');
  var siteBag = kok.querySelector('[data-dz-site]');
  var temizle = kok.querySelector('[data-dz-temizle]');
  var satirlar = [].slice.call(kok.querySelectorAll('[data-dz-satir]'));
  var gruplar = [].slice.call(kok.querySelectorAll('[data-dz-grup]'));
  var harfler = [].slice.call(kok.querySelectorAll('[data-dz-harf]'));
  if (!q || !satirlar.length) return;
  var TOPLAM = satirlar.length;
  var aramaAdres = form ? form.getAttribute('action') : '';
  var ESLE = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
  function norm(t) {
    return String(t || '').toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, function (c) { return ESLE[c]; })
      .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function kacis(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var secili = '';
  var gorunen = TOPLAM;

  function harfIsaretle(h) {
    harfler.forEach(function (a) {
      if (a.getAttribute('data-dz-harf') === h) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  function uygula() {
    var ham = q.value.trim();
    var kelimeler = norm(ham).split(' ').filter(Boolean);
    gorunen = 0;
    satirlar.forEach(function (s) {
      // Her aranan kelime, konudaki bir kelimenin başıyla eşleşmeli ("tas" → "taşı", "taşları"; "haritası" değil)
      var ara = ' ' + (s.getAttribute('data-ara') || '');
      var uygun = (!secili || s.getAttribute('data-harf') === secili) &&
        kelimeler.every(function (k) { return ara.indexOf(' ' + k) > -1; });
      s.hidden = !uygun;
      if (uygun) gorunen++;
    });
    gruplar.forEach(function (g) { g.hidden = !g.querySelector('[data-dz-satir]:not([hidden])'); });
    if (sil) sil.hidden = !ham;
    if (yok) yok.hidden = gorunen > 0;
    if (siteBag) siteBag.setAttribute('href', aramaAdres + (ham ? '?q=' + encodeURIComponent(ham) : ''));
    if (!sonuc) return;
    if (!kelimeler.length && !secili) sonuc.innerHTML = '';
    else if (!gorunen) sonuc.innerHTML = 'Eşleşen konu yok.';
    else if (secili) sonuc.innerHTML = '<b>' + kacis(secili) + '</b> harfiyle başlayan <b>' + gorunen + '</b> konu gösteriliyor.';
    else sonuc.innerHTML = '<b>' + gorunen + '</b> konu gösteriliyor, toplam ' + TOPLAM + '.';
  }

  q.addEventListener('input', function () {
    if (secili) { secili = ''; harfIsaretle(''); }
    uygula();
  });
  q.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && q.value) { e.preventDefault(); q.value = ''; uygula(); }
  });
  // Enter: sayfa içinde süzülür; eşleşme yoksa site aramasına gider
  if (form) form.addEventListener('submit', function (e) { if (gorunen > 0) e.preventDefault(); });
  if (sil) sil.addEventListener('click', function () { q.value = ''; uygula(); q.focus(); });
  if (temizle) temizle.addEventListener('click', function () { q.value = ''; secili = ''; harfIsaretle(''); uygula(); q.focus(); });

  harfler.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var h = a.getAttribute('data-dz-harf') || '';
      secili = secili === h ? '' : h;
      q.value = '';
      harfIsaretle(secili);
      uygula();
    });
  });

  // Tarayıcı geri geldiğinde kutuda kalan metne göre süz
  if (q.value) uygula();
})();

;
/* 3-arama.js */
/* Yön H: D temasının parca/arama.js dosyası birebir (sonuç işaretlemesi H CSS ile biçimlenir).
   Kurumsal sayfaların küçük betikleri: (1) Akademik sayfada yayınları konuya göre süzme, (2) site içi arama.
   Bağımlılık yok. İlgili öğe sayfada yoksa hiçbir şey yapmaz. WordPress'te kısa kod/tema şablonuna taşınır. */

/* ---------- 1) Yayın süzgeci: [data-suz-grup] düğmeleri, [data-suz-liste] içindeki li[data-konu] ---------- */
(function () {
  var grup = document.querySelector('[data-suz-grup]');
  var liste = document.querySelector('[data-suz-liste]');
  if (!grup || !liste) return;
  var dugmeler = Array.prototype.slice.call(grup.querySelectorAll('button[data-suz]'));
  var ogeler = Array.prototype.slice.call(liste.querySelectorAll('li[data-konu]'));
  var yillar = Array.prototype.slice.call(liste.querySelectorAll('[data-yil]'));
  var durum = grup.querySelector('[data-suz-durum]');
  grup.hidden = false; // JS yoksa süzgeç görünmez, liste tam kalır

  function uygula(kod, dugme) {
    var say = 0;
    ogeler.forEach(function (li) {
      var goster = kod === '*' || li.getAttribute('data-konu') === kod;
      li.hidden = !goster;
      if (goster) say++;
    });
    yillar.forEach(function (y) { y.hidden = !y.querySelector('li[data-konu]:not([hidden])'); });
    dugmeler.forEach(function (b) { b.setAttribute('aria-pressed', String(b === dugme)); });
    if (durum) {
      var ad = dugme.firstChild ? dugme.firstChild.nodeValue : '';
      durum.textContent = kod === '*' ? '' : say + ' yayın gösteriliyor: ' + ad + '.';
    }
  }
  dugmeler.forEach(function (b) {
    b.addEventListener('click', function () { uygula(b.getAttribute('data-suz'), b); });
  });
})();

/* ---------- 2) Arama: [data-arama data-dizin="…/arama.json"] ---------- */
(function () {
  var kok = document.querySelector('[data-arama]');
  if (!kok) return;
  var form = document.querySelector('[data-arama-form]');
  var girdi = form ? form.querySelector('input[name="q"]') : null;
  var durum = kok.querySelector('[data-arama-durum]');
  var sonucOl = kok.querySelector('[data-arama-sonuc]');
  var oneri = kok.querySelector('[data-arama-oneri]');
  var dizin = null;
  var ilkBaslik = document.title;
  // Sonuçtaki tür etiketi (render.js'deki "tur" alanı); bilinmeyen tür "Sayfa" olur
  var TUR = { makale: 'Makale', rehber: 'Hasta rehberi', dizin: 'Dizin', hub: 'Alan sayfası', hakkinda: 'Hekim', ana: 'Ana sayfa' };

  // Türkçe büyük/küçük harf ve aksan duyarsız, UZUNLUK KORUYAN eşleme (vurgulama için konumlar bozulmaz)
  var HARF = { 'İ': 'i', 'I': 'i', 'ı': 'i', 'Ş': 's', 'ş': 's', 'Ğ': 'g', 'ğ': 'g', 'Ü': 'u', 'ü': 'u', 'Ö': 'o', 'ö': 'o', 'Ç': 'c', 'ç': 'c', 'Â': 'a', 'â': 'a', 'Î': 'i', 'î': 'i', 'Û': 'u', 'û': 'u', 'É': 'e', 'é': 'e', '’': "'" };
  function norm(s) {
    s = String(s || '');
    var o = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (HARF[c]) { o += HARF[c]; continue; }
      var k = c.toLowerCase();
      o += k.length === 1 ? k : c;
    }
    return o;
  }
  // Basit Türkçe ek budama: "taşları" → "tas", "prostatın" → "prostat"
  var EKLER = ['lerinden', 'larindan', 'lerinin', 'larinin', 'leri', 'lari', 'ler', 'lar', 'nin', 'nun', 'sinin', 'si', 'su', 'in', 'un', 'den', 'dan', 'de', 'da', 'i', 'u', 'a', 'e'];
  function kok_(t) {
    for (var i = 0; i < EKLER.length; i++) {
      var e = EKLER[i];
      if (t.length - e.length >= 3 && t.slice(-e.length) === e) return t.slice(0, -e.length);
    }
    return t;
  }
  function kelimeler(q) {
    return norm(q).replace(/[^a-z0-9']+/g, ' ').split(' ').filter(function (t) { return t.length >= 2; })
      .filter(function (t, i, a) { return a.indexOf(t) === i; }).slice(0, 8);
  }
  function kelimeBasi(alan, i) { return i === 0 || /[^a-z0-9]/.test(alan.charAt(i - 1)); }
  // Türkçe eklemeli bir dil: kelime yalnız kelime başında eşleşir ("taş" → "taşı", "taşları"; "ışık" → "karışık" değil)
  function bul(alan, x, bas) {
    var i = bas || 0, j;
    while ((j = alan.indexOf(x, i)) > -1) { if (kelimeBasi(alan, j)) return j; i = j + 1; }
    return -1;
  }

  // Ağırlık: başlık > anahtar > açıklama. Tüm kelimeler bir alanda geçmeli (VE); yoksa VEYA ile geri düşer.
  function puanla(d, kel, hepsi) {
    var t = d._t, a = d._a, ds = d._d, toplam = 0, eslesen = 0;
    for (var i = 0; i < kel.length; i++) {
      var w = kel[i], s = kok_(w), p = 0, j;
      j = bul(t, w);
      if (j > -1) p += 10 + (j === 0 ? 2 : 0);
      else if (s !== w && bul(t, s) > -1) p += 6;
      if (bul(a, w) > -1) p += 4; else if (s !== w && bul(a, s) > -1) p += 2;
      if (bul(ds, w) > -1) p += 2; else if (s !== w && bul(ds, s) > -1) p += 1;
      if (p) eslesen++;
      toplam += p;
    }
    if (hepsi && eslesen < kel.length) return 0;
    if (kel.length > 1 && bul(t, kel.join(' ')) > -1) toplam += 8;
    return toplam;
  }

  function kacis(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  // Eşleşen parçaları <mark> ile sarar; konumlar normalleştirilmiş metinden alınır (uzunluk aynı)
  function vurgula(metin, kel) {
    var n = norm(metin), araliklar = [];
    kel.forEach(function (w) {
      [w, kok_(w)].forEach(function (x, k) {
        if (k === 1 && x === w) return;
        var i = 0, j;
        while (x.length >= 2 && (j = bul(n, x, i)) > -1) { araliklar.push([j, j + x.length]); i = j + x.length; }
      });
    });
    if (!araliklar.length) return kacis(metin);
    araliklar.sort(function (p, q) { return p[0] - q[0]; });
    var birlesik = [araliklar[0]];
    for (var i = 1; i < araliklar.length; i++) {
      var son = birlesik[birlesik.length - 1];
      if (araliklar[i][0] <= son[1]) son[1] = Math.max(son[1], araliklar[i][1]); else birlesik.push(araliklar[i]);
    }
    var o = '', k = 0;
    birlesik.forEach(function (r) { o += kacis(metin.slice(k, r[0])) + '<mark>' + kacis(metin.slice(r[0], r[1])) + '</mark>'; k = r[1]; });
    return o + kacis(metin.slice(k));
  }

  function goster(q) {
    q = String(q || '').trim();
    var kel = kelimeler(q);
    sonucOl.innerHTML = '';
    if (!kel.length) {
      durum.textContent = q ? 'En az iki harfli bir kelime yazın.' : 'Aramak istediğiniz konuyu yukarıdaki kutuya yazın.';
      oneri.hidden = false;
      document.title = ilkBaslik;
      return;
    }
    var sonuc = [], kismi = false;
    dizin.forEach(function (d) { var p = puanla(d, kel, true); if (p) sonuc.push({ d: d, p: p }); });
    if (!sonuc.length && kel.length > 1) {
      kismi = true;
      dizin.forEach(function (d) { var p = puanla(d, kel, false); if (p) sonuc.push({ d: d, p: p }); });
    }
    sonuc.sort(function (x, y) { return y.p - x.p || x.d.t.length - y.d.t.length; });
    sonuc = sonuc.slice(0, 30);
    var qG = '“' + kacis(q) + '”';
    document.title = '“' + q + '” için arama | Prof. Dr. Kaan Gökçen';
    if (!sonuc.length) {
      durum.innerHTML = '<b>' + qG + '</b> için sonuç bulunamadı. Farklı bir kelime deneyin ya da aşağıdaki konulara göz atın.';
      oneri.hidden = false;
      return;
    }
    durum.innerHTML = '<b>' + qG + '</b> için <b class="tab">' + sonuc.length + '</b> sonuç' + (kismi ? '. Tüm kelimeleri içeren sayfa yok; kelimelerden bazılarını içerenler gösteriliyor.' : '');
    oneri.hidden = true;
    sonucOl.innerHTML = sonuc.map(function (s) {
      var d = s.d, baslik = d.t.replace(/^(Prof\. Dr\. Kaan Gökçen) \| /, '$1, '); // ana sayfa başlığı
      return '<li><span class="kr-etiket">' + (TUR[d.k] || 'Sayfa') + '</span>' +
        '<h2><a href="' + kacis(d.u) + '">' + vurgula(baslik, kel) + '</a></h2>' +
        (d.d ? '<p>' + vurgula(d.d, kel) + '</p>' : '') +
        '<span class="kr-adres">' + kacis(decodeURI(d.u)) + '</span></li>';
    }).join('');
  }

  function q() { try { return new URLSearchParams(location.search).get('q') || ''; } catch (e) { return ''; } }
  function adresGuncelle(deger) {
    if (!window.history || !history.replaceState) return;
    var u = location.pathname + (deger ? '?q=' + encodeURIComponent(deger) : '');
    history.replaceState(null, '', u);
  }
  function kutulariDoldur(deger) {
    Array.prototype.forEach.call(document.querySelectorAll('input[name="q"]'), function (i) { if (i !== document.activeElement) i.value = deger; });
  }

  var ilk = q();
  if (girdi) girdi.value = ilk;
  kutulariDoldur(ilk);
  durum.textContent = 'Dizin yükleniyor…';

  fetch(kok.getAttribute('data-dizin'), { credentials: 'same-origin' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (veri) {
      dizin = veri.map(function (d) { d._t = norm(d.t); d._a = norm(d.a); d._d = norm(d.d); return d; });
      goster(ilk);
      if (form && girdi) {
        var zaman;
        form.addEventListener('submit', function (e) { e.preventDefault(); clearTimeout(zaman); adresGuncelle(girdi.value.trim()); goster(girdi.value); });
        girdi.addEventListener('input', function () {
          clearTimeout(zaman);
          zaman = setTimeout(function () { adresGuncelle(girdi.value.trim()); goster(girdi.value); }, 180);
        });
      }
    })
    .catch(function () {
      durum.textContent = 'Arama dizini yüklenemedi. Tüm konular için aşağıdaki dizinlere bakabilirsiniz.';
      oneri.hidden = false;
    });
})();
