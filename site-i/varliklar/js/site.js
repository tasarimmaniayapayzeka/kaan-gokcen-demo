/* 10-temel.js */
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

;
/* 20-arama.js */
/* Kurumsal sayfaların küçük betikleri: (1) Akademik sayfada yayınları konuya göre süzme, (2) site içi arama.
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

;
/* 20-dizin.js */
/* Dizin süzme: yazdıkça satırları süzer, harf hapları baş harfe göre süzer. JS yoksa her şey görünür,
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
/* 30-i-kabuk.js */
/* Tema I · kabuk: mobil menü paneli, başlıktaki arama paneli, mobil altbilgi akordeonu. Bağımlılık yok. Sahibi: I-1.
   JS yoksa: arama düğmesi arama sayfasına gider, mobil menü düğmesi görünür ama panel açılmaz (altbilgi tüm bağlantıları verir). */
(function () {
  var bas = document.querySelector('.i-bas');
  if (!bas) return;
  var menuDg = bas.querySelector('[data-i-menu]');
  var panel = document.getElementById('i-mobil-panel');
  var araDg = bas.querySelector('[data-i-ara]');
  var araPanel = document.getElementById('i-ara-panel');

  function menuAc(acik) {
    if (!panel || !menuDg) return;
    panel.hidden = !acik;
    menuDg.setAttribute('aria-expanded', String(acik));
    menuDg.setAttribute('aria-label', acik ? 'Menüyü kapat' : 'Menüyü aç');
    document.documentElement.style.overflow = acik ? 'hidden' : '';
  }
  function araAc(acik) {
    if (!araPanel || !araDg) return;
    araPanel.hidden = !acik;
    araDg.setAttribute('aria-expanded', String(acik));
    if (acik) { var g = araPanel.querySelector('input'); if (g) g.focus(); }
  }
  if (menuDg) menuDg.addEventListener('click', function () { menuAc(panel.hidden); });
  if (araDg) araDg.addEventListener('click', function (e) { e.preventDefault(); araAc(araPanel.hidden); });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (panel && !panel.hidden) { menuAc(false); menuDg.focus(); }
    if (araPanel && !araPanel.hidden) { araAc(false); araDg.focus(); }
    var a = document.activeElement;
    if (a && a.closest && a.closest('.i-acilir-li')) a.blur();
  });
  document.addEventListener('click', function (e) {
    if (araPanel && !araPanel.hidden && !araPanel.contains(e.target) && !araDg.contains(e.target)) araAc(false);
  });
  var genis = window.matchMedia('(min-width: 1101px)');
  function degisti() { if (genis.matches) menuAc(false); else araAc(false); }
  if (genis.addEventListener) genis.addEventListener('change', degisti); else if (genis.addListener) genis.addListener(degisti);
})();

/* Altbilgi: 760 px altında sütun başlıkları akordeon düğmesine dönüşür (+) */
(function () {
  var alt = document.querySelector('.i-alt');
  if (!alt) return;
  var sutunlar = Array.prototype.slice.call(alt.querySelectorAll('.i-alt-sutun'));
  var dar = window.matchMedia('(max-width: 760px)');
  var dugmeler = [];
  sutunlar.forEach(function (s) {
    var h = s.querySelector('h2');
    var ul = s.querySelector('ul');
    if (!h || !ul) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-controls', ul.id);
    b.innerHTML = h.innerHTML + '<span class="i-arti" aria-hidden="true"></span>';
    h.innerHTML = '';
    h.appendChild(b);
    b.addEventListener('click', function () {
      if (!dar.matches) return;
      var acik = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', String(!acik));
      ul.hidden = acik;
    });
    dugmeler.push({ b: b, ul: ul });
  });
  alt.classList.add('i-alt-js');
  function uygula() {
    dugmeler.forEach(function (d) {
      if (dar.matches) { d.b.setAttribute('aria-expanded', 'false'); d.b.removeAttribute('tabindex'); d.ul.hidden = true; }
      else { d.b.removeAttribute('aria-expanded'); d.b.setAttribute('tabindex', '-1'); d.ul.hidden = false; }
    });
  }
  uygula();
  if (dar.addEventListener) dar.addEventListener('change', uygula); else if (dar.addListener) dar.addListener(uygula);
})();

;
/* 40-i-efekt.js */
/* Tema I · Petrol: kaydırınca belirme ve metrik sayaçları (7 Ekim 2026, web/temalar/GORSEL-EFEKT-SARTNAME.md).
   Harici kütüphane yok (IntersectionObserver). Yalnız ilk ekranın ALTINDAKİ öğeler gizlenir (görünürdekiler titremesin);
   JS yoksa ya da hareket azaltma açıksa hiçbir şey gizlenmez ve rakamlar baştan doğru görünür. CSS: css/80-i-efekt.css */
(function () {
  var govde = document.body;
  if (!govde || !govde.classList.contains('tema-i') || !('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var $$ = function (s, k) { return Array.prototype.slice.call((k || document).querySelectorAll(s)); };
  var ekranAlti = function (el) { var r = el.getBoundingClientRect(); return r.top > window.innerHeight * 0.92; };

  // Metrik sayacı: 0'dan hedefe, ease-out, 1,2-1,6 sn; sayı biçimi (ön ek, binlik nokta, son ek) korunur
  var sayac = function (el, bekle) {
    if (el.getAttribute('data-i-sayildi')) return;
    el.setAttribute('data-i-sayildi', '1');
    var hedef = el.textContent;
    var m = hedef.match(/^(\D*)(\d[\d.]*)(.*)$/);
    if (!m) return;
    var son = parseInt(m[2].replace(/\./g, ''), 10);
    if (!(son > 0)) return;
    var noktali = m[2].indexOf('.') > -1;
    var bicim = function (v) { return noktali ? v.toLocaleString('tr-TR') : String(v); };
    var sure = 1200 + Math.min(400, son * 2);
    var t0 = null;
    el.style.fontVariantNumeric = 'tabular-nums';
    el.style.minWidth = el.getBoundingClientRect().width + 'px';
    el.textContent = m[1] + bicim(0) + m[3];
    el.setAttribute('aria-label', hedef);
    var adim = function (t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / sure);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = p < 1 ? m[1] + bicim(Math.round(son * e)) + m[3] : hedef;
      if (p < 1) window.requestAnimationFrame(adim); else el.removeAttribute('aria-label');
    };
    window.setTimeout(function () { window.requestAnimationFrame(adim); }, bekle || 0);
  };

  var gozcu = new IntersectionObserver(function (girisler) {
    girisler.forEach(function (g) {
      if (!g.isIntersecting) return;
      var el = g.target;
      gozcu.unobserve(el);
      if (el.hasAttribute('data-i-sayac')) { sayac(el, el.__iBekle); return; }
      el.classList.add('i-gor');
      (el.__iCocuk || []).forEach(function (c) { c.classList.add('i-gor'); });
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  // 1) Tekil öğeler: bölüm başlıkları, metin blokları, kartlar (yukarı kayarak belirir)
  var TEK = [
    '.i-bas-satir', '.i-ikili .i-ust-etiket', '.i-ikili h2', '.i-ozg-metin', '.i-ak-metin', '.i-kaynak', '.i-ak-alt', '.i2-alt-bas',
    '.i-il-metin', '.i2-ozet', '.i2-icindekiler', '.i2-sss', '.i2-kaynakca', '.i2-ttb', '.i3-dz-arac'
  ].join(',');
  $$(TEK).forEach(function (el) {
    if (!ekranAlti(el) || el.closest('.i-gz, .i-gz-k')) return;
    el.classList.add('i-gz');
    gozcu.observe(el);
  });

  // 2) Gruplar: kapsayıcı görününce çocuklar sırayla (60-90 ms aralık)
  var GRUP = [
    ['.i-kat-izgara', ':scope > li', 75],
    ['.i-yazi-izgara', ':scope > li', 90],
    ['.i-il-satir', ':scope > li', 70],
    ['.i2-ray-ic', ':scope > *', 120],
    ['.i2-liste', ':scope > li', 60]
  ];
  GRUP.forEach(function (gr) {
    $$(gr[0]).forEach(function (kap) {
      if (!ekranAlti(kap)) return;
      var cocuk = $$(gr[1], kap);
      cocuk.forEach(function (c, i) { c.classList.add('i-gz'); c.style.setProperty('--i-gec', Math.min(i, 8) * gr[2] + 'ms'); });
      kap.__iCocuk = cocuk;
      gozcu.observe(kap);
    });
  });

  // 3) Kapsayıcı efektleri (CSS çocukları canlandırır): zaman çizgisi, metrikler, dergi görseli, petrol bant, iletişim fotoğrafı
  var KAP = [['.i-zaman', 180], ['.i-metrik', 90], ['.i-ak-gorsel', 0], ['.i-holep', 0], ['.i-il-ust', 0]];
  KAP.forEach(function (k) {
    $$(k[0]).forEach(function (kap) {
      if (!ekranAlti(kap)) return;
      kap.classList.add('i-gz-k');
      if (k[1]) $$(':scope > li', kap).forEach(function (li, i) { li.style.setProperty('--i-gec', (250 + i * k[1]) + 'ms'); });
      gozcu.observe(kap);
    });
  });

  // 4) Metrik sayaçları: görünür olduklarında (ilk ekranda olsalar da) 0'dan sayar
  $$('[data-i-sayac]').forEach(function (el) {
    var li = el.closest('li');
    var gec = li ? parseInt(li.style.getPropertyValue('--i-gec'), 10) : 0;
    el.__iBekle = gec > 0 ? gec + 150 : 0;
    gozcu.observe(el);
  });
})();
