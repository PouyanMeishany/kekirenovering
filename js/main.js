/* ============================================================
   KEKI Renovering AB — site scripts
   Wired to the existing Azure Functions backend (same API the
   current kekirenovering.se uses).
   ============================================================ */
(function () {
  'use strict';

  // Same backend as the live site — the quote form and reviews go here.
  var API_BASE = 'https://mf-stonedesign-api-gghedbdmdcbhhvf0.northeurope-01.azurewebsites.net/api';

  /* ---------- footer year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- mobile drawer ---------- */
  var drawer = document.getElementById('drawer');
  var openBtn = document.getElementById('openMenu');
  var closeBtn = document.getElementById('closeMenu');
  function closeDrawer() { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); }
  if (openBtn) openBtn.addEventListener('click', function () { drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); });
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  drawer.querySelectorAll('[data-close]').forEach(function (a) { a.addEventListener('click', closeDrawer); });

  /* ---------- reveal on scroll ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.14 });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  /* ---------- project gallery (real photos) ---------- */
  var PROJECTS = [
    { img: 'snickeri-main.webp', t: 'Måttanpassade garderober', c: 'snickeri', big: true },
    { img: 'taktvatt1.webp',     t: 'Taktvätt & behandling',    c: 'tak' },
    { img: 'malning3.webp',      t: 'Målning med egen design',  c: 'malning' },
    { img: 'golv4.webp',         t: 'Parkettläggning',          c: 'golv' },
    { img: 'altan.webp',         t: 'Byggnation av altan',      c: 'altan' },
    { img: 'snickeri2.webp',     t: 'Inredningssnickeri',       c: 'snickeri' },
    { img: 'golv5.webp',         t: 'Golvläggning',             c: 'golv' },
    { img: 'roof-fixing.webp',   t: 'Takreparation',            c: 'tak' },
    { img: 'malning1.webp',      t: 'Målning inomhus',          c: 'malning' },
    { img: 'snickeri7.webp',     t: 'Montering & snickeri',     c: 'snickeri' },
    { img: 'floor-work.webp',    t: 'Golvarbete',               c: 'golv' },
    { img: 'taktvatt2.webp',     t: 'Takrengöring',             c: 'tak' },
    { img: 'fix1.webp',          t: 'Små fix & montering',      c: 'snickeri' }
  ];
  var LABELS = { snickeri: 'Snickeri', tak: 'Tak', malning: 'Målning', golv: 'Golv', altan: 'Altan' };
  var gallery = document.getElementById('gallery');

  function renderGallery(filter) {
    gallery.innerHTML = '';
    PROJECTS.filter(function (p) { return filter === 'alla' || p.c === filter; }).forEach(function (p) {
      var tile = document.createElement('div');
      tile.className = 'tile' + (p.big && filter === 'alla' ? ' big' : '');
      var img = document.createElement('img');
      img.src = 'assets/images/' + p.img;
      img.alt = p.t;
      img.loading = 'lazy';
      var tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = LABELS[p.c];
      var cap = document.createElement('div');
      cap.className = 'cap';
      cap.textContent = p.t;
      tile.appendChild(img); tile.appendChild(tag); tile.appendChild(cap);
      gallery.appendChild(tile);
    });
  }
  renderGallery('alla');

  document.getElementById('filters').addEventListener('click', function (e) {
    var btn = e.target.closest('.chip');
    if (!btn) return;
    this.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
    btn.classList.add('active');
    renderGallery(btn.dataset.f);
  });

  /* ---------- customer reviews (live API, section hidden on failure) ---------- */
  fetch(API_BASE + '/get-reviews')
    .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status)); })
    .then(function (data) {
      var reviews = Array.isArray(data) ? data : (data && data.reviews) || [];
      reviews = reviews.filter(function (r) { return r && r.review_text; }).slice(0, 6);
      if (!reviews.length) return;
      var grid = document.getElementById('reviewGrid');
      reviews.forEach(function (r) {
        var card = document.createElement('div');
        card.className = 'rev';
        var stars = document.createElement('div');
        stars.className = 'stars';
        var n = Math.max(1, Math.min(5, Number(r.rating) || 5));
        stars.textContent = '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
        stars.setAttribute('aria-label', n + ' av 5 stjärnor');
        var text = document.createElement('p');
        text.textContent = '”' + r.review_text + '”';
        var who = document.createElement('div');
        who.className = 'who';
        who.textContent = r.name || 'Kund';
        card.appendChild(stars); card.appendChild(text); card.appendChild(who);
        if (r.city) {
          var where = document.createElement('div');
          where.className = 'where';
          where.textContent = r.city;
          card.appendChild(where);
        }
        grid.appendChild(card);
      });
      document.getElementById('omdomen').hidden = false;
    })
    .catch(function () { /* API unavailable — keep the section hidden */ });

  /* ---------- quote form → Azure Function /submit-quote ---------- */
  var form = document.getElementById('quoteForm');
  var errorBox = document.getElementById('formError');
  var submitBtn = document.getElementById('submitBtn');
  var formStart = Date.now();

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    errorBox.hidden = true;

    if (!form.reportValidity()) return;

    // Light anti-spam parity with the current site: a human takes >3s.
    if (Date.now() - formStart < 3000) return;

    var serviceSelect = document.getElementById('f-service');
    var serviceLabel = serviceSelect.options[serviceSelect.selectedIndex].text;
    var message = 'Tjänst: ' + serviceLabel + '\n\n' + (document.getElementById('f-msg').value || '(ingen beskrivning)');

    var fd = new FormData();
    fd.append('name', document.getElementById('f-name').value.trim());
    fd.append('email', document.getElementById('f-email').value.trim());
    fd.append('phone', document.getElementById('f-phone').value.trim());
    fd.append('address', 'Ej angiven');
    fd.append('city', document.getElementById('f-city').value.trim());
    fd.append('postalCode', document.getElementById('f-zip').value.trim());
    fd.append('helpWith', serviceSelect.value); // must be one of the API's valid options
    fd.append('message', message);
    fd.append('privacyAccepted', 'true');
    fd.append('website', document.getElementById('f-web').value); // honeypot — must stay empty

    submitBtn.disabled = true;
    submitBtn.textContent = 'Skickar…';

    fetch(API_BASE + '/submit-quote', { method: 'POST', body: fd })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.classList.add('done');
        form.innerHTML =
          '<div><div class="check"><svg viewBox="0 0 24 24" fill="none" stroke-width="2.4"><path d="M20 6 9 17l-5-5"/></svg></div>' +
          '<h3>Tack — vi hör av oss!</h3>' +
          '<div class="qn" style="margin-top:8px">Vi kontaktar dig inom 24 timmar med din kostnadsfria offert.</div></div>';
      })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Skicka förfrågan';
        errorBox.hidden = false;
        errorBox.innerHTML =
          'Något gick fel när förfrågan skulle skickas. Prova igen om en stund — eller ' +
          'ring oss på <a href="tel:+46764271727">076&nbsp;427&nbsp;17&nbsp;27</a> eller mejla ' +
          '<a href="mailto:info@kekirenovering.se">info@kekirenovering.se</a>.';
      });
  });
})();
