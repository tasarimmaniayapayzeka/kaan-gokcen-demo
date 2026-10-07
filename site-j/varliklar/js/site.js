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

  // Etkin bölüm işaretleme ve çapa kaydırma: varliklar/js/ortak/sekme-izle.js (bütün temalarda ortak, 7 Ekim 2026)
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
/* 30-j-kabuk.js */
/* Tema J · kabuk: mobil menü paneli, arama paneli, Esc ile kapatma, altbilgi akordeonu (yalnız mobilde kapalı başlar). Bağımlılık yok. */
(function () {
  var ust = document.querySelector('.j-ust');
  if (!ust) return;
  var panel = document.getElementById('j-panel');
  var ara = document.getElementById('j-ara');
  var menuDg = ust.querySelector('.j-menu-dg');
  var araDg = ust.querySelector('.j-ara-dg');

  function panelAc(acik) {
    if (!panel || !menuDg) return;
    panel.hidden = !acik;
    menuDg.setAttribute('aria-expanded', String(acik));
    menuDg.setAttribute('aria-label', acik ? 'Menüyü kapat' : 'Menüyü aç');
  }
  function araAc(acik) {
    if (!ara || !araDg) return;
    ara.hidden = !acik;
    araDg.setAttribute('aria-expanded', String(acik));
    if (acik) { var g = ara.querySelector('input'); if (g) g.focus(); }
  }
  if (menuDg) menuDg.addEventListener('click', function () { panelAc(panel.hidden); });
  if (araDg) araDg.addEventListener('click', function () { araAc(ara.hidden); });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (panel && !panel.hidden) { panelAc(false); menuDg.focus(); }
    if (ara && !ara.hidden) { araAc(false); araDg.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (ara && !ara.hidden && !ara.contains(e.target) && !araDg.contains(e.target)) araAc(false);
  });

  // Genişlik değişiminde: masaüstünde mobil panel kapanır; altbilgi sütunları masaüstünde açık, mobilde kapalı.
  var masa = window.matchMedia('(min-width: 1200px)');
  var mobil = window.matchMedia('(max-width: 760px)');
  var sutunlar = document.querySelectorAll('.j-alt-sutun');
  function uygula() {
    if (masa.matches) panelAc(false); else araAc(false);
    for (var i = 0; i < sutunlar.length; i++) sutunlar[i].open = !mobil.matches;
  }
  function dinle(mq) { if (mq.addEventListener) mq.addEventListener('change', uygula); else if (mq.addListener) mq.addListener(uygula); }
  dinle(masa); dinle(mobil);
  uygula();
  // Masaüstünde altbilgi başlığına tıklamak sütunu kapatmasın
  for (var j = 0; j < sutunlar.length; j++) {
    sutunlar[j].querySelector('summary').addEventListener('click', function (e) { if (!mobil.matches) e.preventDefault(); });
  }
})();

;
/* 60-j-dizin.js */
/* Tema J · dizin arama kutusu kısayolu (prototipteki "⌘ K" etiketi): Ctrl+K ya da ⌘+K kutuya odaklanır.
   Mac dışı sistemlerde etiket "Ctrl K" olur. Süzme işlevi js/20-dizin.js'tedir. Bağımlılık yok. */
(function () {
  var kbd = document.querySelector('[data-j3-kisayol]');
  var girdi = document.querySelector('[data-dz-q]');
  if (!kbd || !girdi) return;
  var mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  if (!mac) kbd.textContent = 'Ctrl K';
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      girdi.focus();
      girdi.select();
    }
  });
})();

;
/* 80-j-hareket.js */
/* Tema J · kaydırınca belirme, bölüm içi hareketler ve sayaçlar (7 Ekim 2026, GORSEL-EFEKT-SARTNAME §4). Kütüphane yok.
   Yalnız ekranın ALTINDA kalan öğeler gizlenir (ilk ekranda görünen hiçbir şey kaybolup yeniden gelmez); JS yoksa ya da
   "hareketi azalt" açıksa hiçbir sınıf eklenmez, sayılar baştan son değeriyle durur. Her öğe bir kez belirir. */
(function () {
  var kok = document.documentElement;
  var azalt = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (azalt || !('IntersectionObserver' in window) || !document.body || !document.body.classList.contains('tema-j')) return;

  // Kaydırınca yukarı kayarak belirenler (aynı kaptaki kardeşler 80 ms arayla)
  var BELIR = [
    '.j-bas-satir', '.j-hizli-l > li', '.j-alan-l > li', '.j-holep', '.j-oz-ic > *', '.j-yazi-l > li', '.j-ilt-ic > *',
    '.jm-ilgili > .jm-bolum-bas', '.jm-ilgili > a', '.jm-govde > .jm-kutu',
    '.j3-section-heading', '.j3-group-card', '.j3-category-intro', '.j3-category-articles > a', '.j3-guide-list > a', '.j3-guide-intro > *', '.j3-category-faq',
    '.jp-icerik > *', '.jp-akademik > *', '.jp-medya > *', '.jp-iletisim > *'
  ].join(',');
  // Bölüm içi hareketler: zaman çizgisi, metrik ikonları, portre ve fotoğraf yakınlaşması, sayaçlar
  var BEKLE = '.j-oz, .j-ilt, .jp-icerik-cizgili';

  var altta = function (el) { return el.getBoundingClientRect().top > (window.innerHeight || kok.clientHeight) - 10; };

  // ---------- Sayaçlar ----------
  var sayac = function (el) {
    var son = (el.textContent || '').trim();
    var m = son.match(/^(\D*)(\d[\d.,]*)(\D*)$/);
    if (!m) return;
    var hedef = parseInt(m[2].replace(/[.,]/g, ''), 10);
    if (!hedef) return;
    var noktali = /[.,]/.test(m[2]);
    var yaz = function (n) { el.textContent = m[1] + (noktali ? n.toLocaleString('tr-TR') : String(n)) + m[3]; };
    el.style.minWidth = Math.ceil(el.getBoundingClientRect().width) + 'px';
    el.setAttribute('aria-label', son);
    var sure = 1200 + Math.min(400, hedef * 2);
    var bas = null;
    yaz(0);
    var adim = function (t) {
      if (bas === null) bas = t;
      var p = Math.min(1, (t - bas) / sure);
      var e = 1 - Math.pow(1 - p, 3);
      if (p < 1) { yaz(Math.round(hedef * e)); window.requestAnimationFrame(adim); }
      else { el.textContent = son; el.removeAttribute('aria-label'); el.style.minWidth = ''; }
    };
    return function () { window.requestAnimationFrame(adim); };
  };

  var izleyici = new IntersectionObserver(function (girdiler) {
    girdiler.forEach(function (g) {
      if (!g.isIntersecting) return;
      var el = g.target;
      izleyici.unobserve(el);
      if (el.classList.contains('j-gz')) {
        el.classList.remove('j-gz');
        var gecikme = (parseInt(el.style.getPropertyValue('--j-sira'), 10) || 0) * 80;
        window.setTimeout(function () { el.classList.remove('j-gc'); el.style.removeProperty('--j-sira'); }, 900 + gecikme);
      }
      if (el.classList.contains('j-bekle')) {
        el.classList.remove('j-bekle');
        (el._jSay || []).forEach(function (f) { window.setTimeout(f, 250); });
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  // Belirenler: kaptaki sırası (en çok 6 adım)
  var sira = typeof WeakMap === 'function' ? new WeakMap() : null;
  Array.prototype.forEach.call(document.querySelectorAll(BELIR), function (el) {
    if (!altta(el) || el.closest('[hidden]')) return;
    var ust = el.parentNode;
    var i = 0;
    if (sira) { i = sira.get(ust) || 0; sira.set(ust, i + 1); }
    el.style.setProperty('--j-sira', String(Math.min(i, 5)));
    el.classList.add('j-gc', 'j-gz');
    izleyici.observe(el);
  });
  // Bölüm içi hareketler ve sayaçlar
  Array.prototype.forEach.call(document.querySelectorAll(BEKLE), function (el) {
    if (!altta(el)) return;
    el._jSay = [];
    Array.prototype.forEach.call(el.querySelectorAll('[data-j-say]'), function (d) {
      var f = sayac(d);
      if (f) el._jSay.push(f);
    });
    el.classList.add('j-bekle');
    izleyici.observe(el);
  });
})();

;
/* devam.js */
/* "Devamını okuyun": uzun metin kabı ([data-devam]) dar ekranda kısaltılır, hemen ardındaki düğme ([data-devam-dg]) açar/kapatır.
   7 Ekim 2026, kullanıcı (Hakkında, mobil): "yazı uzun, buraya az yazı koyup fazlasını açılan akordiyon mu yapsak".
   Metnin tamamı sayfada durur (arama motoru okur); betik çalışmazsa metin açık kalır, düğme gizli kalır.
   data-devam="767": hangi genişliğe kadar kısaltılacağı (px). Kısaltılmış yükseklik ve görünüm temanın CSS'inde (.devam-kapali). */
(function () {
  var d = document;
  var kaplar = [].slice.call(d.querySelectorAll('[data-devam]'));
  if (!kaplar.length) return;
  var hareket = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  kaplar.forEach(function (kap, n) {
    var dg = kap.nextElementSibling;
    if (!dg || !dg.hasAttribute('data-devam-dg')) return;
    if (!kap.id) kap.id = 'devam-' + (n + 1);
    dg.setAttribute('aria-controls', kap.id);
    var yazi = dg.querySelector('[data-devam-yazi]') || dg;
    var acYazi = dg.getAttribute('data-ac') || 'Devamını okuyun';
    var kapaYazi = dg.getAttribute('data-kapa') || 'Daha az göster';
    var mq = window.matchMedia('(max-width: ' + (parseInt(kap.getAttribute('data-devam'), 10) || 767) + 'px)');
    var acik = false;

    function durum() {
      kap.style.maxHeight = '';
      if (!mq.matches) { kap.classList.remove('devam-kapali'); dg.hidden = true; return; }
      kap.classList.toggle('devam-kapali', !acik);
      // Kısa metinde düğmeye gerek yok
      var uzun = acik || kap.scrollHeight > kap.clientHeight + 24;
      if (!uzun) kap.classList.remove('devam-kapali');
      dg.hidden = !uzun;
      dg.setAttribute('aria-expanded', acik ? 'true' : 'false');
      yazi.textContent = acik ? kapaYazi : acYazi;
    }

    function ac() {
      if (acik) return;
      acik = true;
      var bas = kap.clientHeight;
      kap.classList.remove('devam-kapali');
      if (hareket) {
        var son = kap.scrollHeight;
        kap.style.maxHeight = bas + 'px';
        kap.offsetHeight; // yeniden yerleşim
        kap.style.transition = 'max-height .45s ease';
        kap.style.maxHeight = son + 'px';
        setTimeout(function () { kap.style.transition = ''; kap.style.maxHeight = ''; }, 480);
      }
      dg.setAttribute('aria-expanded', 'true');
      yazi.textContent = kapaYazi;
    }

    function kapa() {
      // Düğme parmağın/imlecin altında kalsın: kısalma kadar sayfa yukarı kaydırılır
      var once = dg.getBoundingClientRect().top;
      acik = false;
      durum();
      var fark = dg.getBoundingClientRect().top - once;
      if (fark) window.scrollTo({ top: window.scrollY + fark, behavior: 'instant' });
    }

    dg.addEventListener('click', function () { if (acik) kapa(); else ac(); });
    // Kaba ya da içine götüren çapalar (ör. "Detaylı özgeçmiş") metni açar
    [].forEach.call(d.querySelectorAll('a[href^="#"]'), function (a) {
      var h = d.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
      if (h && (h === kap || h.contains(kap))) a.addEventListener('click', function () { if (mq.matches) ac(); });
    });
    if (mq.addEventListener) mq.addEventListener('change', durum); else if (mq.addListener) mq.addListener(durum);
    window.addEventListener('load', durum);
    durum();
  });
})();

;
/* sekme-izle.js */
/* Sekme çubuğu ve "Bu sayfada" listeleri: etkin bölümün işaretlenmesi ve çapaya kaydırma. Bütün temalarda ortak (render.js her pakete ekler).
   7 Ekim 2026, kullanıcı: "sekme kayma var, her iç sayfada kontrol et". Eski IntersectionObserver kodu yalnız başlık ekranın üst bandına
   GİRERKEN sekmeyi değiştiriyordu; yukarı kaydırınca alttaki sekmede takılı kalıyordu. Burada etkin bölüm her kaydırmada konumdan hesaplanır:
   sabit üst çubukların (başlık + sekme çubuğu) altındaki çizgiyi geçmiş son başlık etkindir. Çapaya atlayınca başlık bu çubukların hemen altına oturur. */
(function () {
  var d = document, kok = d.documentElement;
  var adaylar = [].slice.call(d.querySelectorAll('[data-izle], [data-spy], .toc, .hap-sekme'));
  // İç içe seçilmiş listelerden yalnız dıştaki kalır
  adaylar = adaylar.filter(function (l) { return !adaylar.some(function (o) { return o !== l && o.contains(l); }); });
  var listeler = [];
  adaylar.forEach(function (l) {
    var baglar = [], hedefler = [];
    [].forEach.call(l.querySelectorAll('a[href^="#"]'), function (a) {
      var id = a.getAttribute('href').slice(1);
      try { id = decodeURIComponent(id); } catch (e) {}
      var h = id && d.getElementById(id);
      if (h) { baglar.push(a); hedefler.push(h); }
    });
    if (!baglar.length) return;
    l.setAttribute('data-izleniyor', '');
    listeler.push({ l: l, baglar: baglar, hedefler: hedefler, son: -1 });
  });
  if (!listeler.length) return;

  // Ekranın üstüne yapışan çubukların (site başlığı, sekme çubuğu) alt kenarı. Yan sütundaki yapışkan kutular sayılmaz.
  function yapisikAta(el) {
    for (var e = el; e && e !== d.body && e !== kok; e = e.parentElement) {
      var p = getComputedStyle(e).position;
      if (p === 'sticky' || p === 'fixed') return e;
    }
    return null;
  }
  var cubuklar = [];
  [].forEach.call(d.querySelectorAll('header, nav'), function (e) { if (!e.closest('main article, .makale-govde')) cubuklar.push(e); });
  listeler.forEach(function (k) { cubuklar.push(k.l); });
  function ustPay() {
    var alt = 0, gorulen = [];
    cubuklar.forEach(function (e) {
      var s = yapisikAta(e);
      if (!s || gorulen.indexOf(s) > -1) return;
      gorulen.push(s);
      if (s.offsetWidth < window.innerWidth * 0.6 || s.offsetHeight > window.innerHeight * 0.4) return;
      var r = s.getBoundingClientRect();
      if (r.bottom <= 1 || getComputedStyle(s).visibility === 'hidden') return; // gizlenmiş başlık
      var cs = getComputedStyle(s);
      if (cs.position === 'sticky' && cs.top === 'auto') return; // alta yapışan çubuk
      var ust = cs.position === 'fixed' ? r.top : (parseFloat(cs.top) || 0);
      if (ust > 200) return; // ekranın altındaki sabit çubuklar (mobil arama/iletişim şeridi)
      alt = Math.max(alt, ust + r.height);
    });
    return Math.round(alt);
  }

  var pay = -1, kilit = null;
  function guncelle() {
    var p = ustPay();
    if (p !== pay) { pay = p; kok.style.scrollPaddingTop = (pay + 16) + 'px'; }
    var cizgi = pay + 32;
    var sonda = window.innerHeight + window.scrollY >= kok.scrollHeight - 4;
    listeler.forEach(function (k) {
      // Liste sırasına değil sayfadaki konuma bakılır: çizgiyi geçmiş başlıklardan en alttaki etkindir
      var ust = k.hedefler.map(function (h) { return h.getBoundingClientRect().top; });
      var etkin = -1, enAlt = -Infinity, enUstte = 0;
      for (var i = 0; i < ust.length; i++) {
        // Yan yana (aynı hizadaki) bölümlerde o an etkin olan korunur
        if (ust[i] <= cizgi && (ust[i] > enAlt + 1 || (Math.abs(ust[i] - enAlt) <= 1 && i === k.son))) { enAlt = Math.max(enAlt, ust[i]); etkin = i; }
        if (ust[i] < ust[enUstte]) enUstte = i;
      }
      if (etkin < 0) etkin = enUstte;
      // Sayfanın sonunda çizgiye ulaşamayan son bölümler: ekranda görünen en alttaki başlık
      if (sonda) for (var j = 0; j < ust.length; j++) if (ust[j] > ust[etkin] && ust[j] < window.innerHeight - 40 && (etkin < 0 || ust[j] > enAlt)) { enAlt = ust[j]; etkin = j; }
      if (kilit && kilit.k === k) etkin = kilit.i;
      if (etkin === k.son) return;
      k.son = etkin;
      k.baglar.forEach(function (a, i) {
        a.classList.toggle('etkin', i === etkin);
        if (i === etkin) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      });
      // Yatay kayan çubukta etkin sekmeyi görünür tut (yalnız çubuk kayar)
      var a = k.baglar[etkin];
      for (var kap = a.parentElement; kap && kap !== k.l.parentElement; kap = kap.parentElement) {
        if (kap.scrollWidth > kap.clientWidth + 1 && /(auto|scroll)/.test(getComputedStyle(kap).overflowX)) {
          var r = a.getBoundingClientRect(), u = kap.getBoundingClientRect();
          if (r.left < u.left + 8 || r.right > u.right - 8) {
            var hedef = kap.scrollLeft + r.left - u.left - 16;
            if (kap.scrollTo) kap.scrollTo({ left: hedef, behavior: 'smooth' }); else kap.scrollLeft = hedef;
          }
          break;
        }
      }
    });
  }

  // Hedefin belge içindeki yerleşim konumu. getBoundingClientRect yerine offsetTop: belirme efektlerinin
  // translate kayması hesaba girmez (tarayıcının kendi çapa atlaması efektli başlığı 20 px kadar çubuğun altına sokuyordu).
  function belgeUst(el) { var y = 0; for (var e = el; e; e = e.offsetParent) y += e.offsetTop; return y; }
  var yumusak = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function git(h, davranis) {
    pay = ustPay(); kok.style.scrollPaddingTop = (pay + 16) + 'px';
    window.scrollTo({ top: Math.max(0, belgeUst(h) - pay - 16), behavior: davranis });
  }

  // Tıklanan sekme, kaydırma durana ve ardından kullanıcı sayfayı kendisi kaydırana kadar etkin kalır
  var durdu = null;
  function kaydirmaBitti() {
    durdu = null;
    if (!kilit) return;
    if (kilit.y == null) {
      // Kayarken boyu değişen görseller olduysa son bir düzeltme
      var fark = belgeUst(kilit.h) - pay - 16 - window.scrollY;
      if (Math.abs(fark) > 3 && !(fark > 0 && window.innerHeight + window.scrollY >= kok.scrollHeight - 2)) window.scrollTo({ top: window.scrollY + fark, behavior: 'instant' });
      kilit.y = window.scrollY;
    }
  }
  listeler.forEach(function (k) {
    k.baglar.forEach(function (a, i) {
      a.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        var h = k.hedefler[i];
        kilit = { k: k, i: i, h: h, y: null };
        if (location.hash !== '#' + h.id && history.pushState) history.pushState(null, '', '#' + h.id);
        git(h, yumusak ? 'smooth' : 'auto');
        // Klavye ve ekran okuyucu için odak başlığa geçer; başlık etkileşimli olmadığından odak çerçevesi gösterilmez
        if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
        h.style.outline = 'none';
        h.addEventListener('blur', function () { h.style.outline = ''; }, { once: true });
        h.focus({ preventScroll: true });
        clearTimeout(durdu); durdu = setTimeout(kaydirmaBitti, 180);
        guncelle();
      });
    });
  });
  function birak() { if (kilit) { kilit = null; guncelle(); } }
  ['wheel', 'touchstart'].forEach(function (t) { window.addEventListener(t, birak, { passive: true }); });
  window.addEventListener('keydown', function (e) { if (/^(Arrow|Page|Home|End| )/.test(e.key)) birak(); });

  var bekliyor = false;
  function istek() {
    if (kilit) {
      // Kaydırma durduktan sonra 40 px'ten fazla uzaklaşıldıysa (kaydırma çubuğu, betik) kilit bırakılır
      if (kilit.y != null && Math.abs(window.scrollY - kilit.y) > 40) kilit = null;
      else { clearTimeout(durdu); durdu = setTimeout(kaydirmaBitti, 180); }
    }
    if (!bekliyor) { bekliyor = true; requestAnimationFrame(function () { bekliyor = false; guncelle(); }); }
  }
  window.addEventListener('scroll', istek, { passive: true });
  window.addEventListener('resize', istek);
  window.addEventListener('load', istek);
  window.addEventListener('popstate', function () { var h = location.hash.length > 1 && d.getElementById(decodeURIComponent(location.hash.slice(1))); if (h) git(h, 'auto'); });
  guncelle();
  // Sayfa bir çapayla açıldıysa, pay hesaplandıktan sonra başlığı doğru yere getir
  if (location.hash.length > 1) {
    var h0 = d.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (h0) setTimeout(function () { git(h0, 'auto'); }, 60);
  }
})();
