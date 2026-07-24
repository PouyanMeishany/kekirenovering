/* ============================================================
   KEKI Renovering AB — site scripts
   Wired to the existing Azure Functions backend (same API the
   current kekirenovering.se uses).

   Loaded on every page (index + subpages). Every DOM lookup below
   is null-guarded so pages that don't have a given section (drawer,
   gallery, reviews, quote form, lightbox) never throw.
   ============================================================ */
(function () {
  'use strict';

  // Same backend as the live site — the quote form and reviews go here.
  var API_BASE = 'https://mf-stonedesign-api-gghedbdmdcbhhvf0.northeurope-01.azurewebsites.net/api';

  /* ---------- progressive enhancement flag ----------
     .reveal is only hidden-then-fades-in when this class is present, so
     content stays visible if JS is disabled or this file fails to load. */
  document.documentElement.classList.add('js');

  /* ---------- footer year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- mobile drawer ---------- */
  var drawer = document.getElementById('drawer');
  var openBtn = document.getElementById('openMenu');
  var closeBtn = document.getElementById('closeMenu');
  if (drawer) {
    var drawerLastFocused = null;

    function onDrawerKeydown(e) {
      if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); }
    }
    function openDrawer() {
      drawerLastFocused = document.activeElement;
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lb-lock');
      if (openBtn) openBtn.setAttribute('aria-expanded', 'true');
      if (closeBtn) closeBtn.focus();
      document.addEventListener('keydown', onDrawerKeydown);
    }
    function closeDrawer() {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lb-lock');
      if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('keydown', onDrawerKeydown);
      var restoreTo = (drawerLastFocused && typeof drawerLastFocused.focus === 'function') ? drawerLastFocused : openBtn;
      if (restoreTo) restoreTo.focus();
    }
    if (openBtn) openBtn.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    drawer.querySelectorAll('[data-close]').forEach(function (a) { a.addEventListener('click', closeDrawer); });
  }

  /* ---------- reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.14 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- project gallery (real photos) ---------- */
  var PROJECTS = [
    { img: 'snickeri1.webp', t: 'Snickeriarbeten',                                    c: 'snickeri' },
    { img: 'snickeri2.webp', t: 'Garderober',                                         c: 'snickeri' },
    { img: 'snickeri3.webp', t: 'Inredning',                                          c: 'snickeri' },
    { img: 'snickeri4.webp', t: 'Inredning',                                          c: 'snickeri' },
    { img: 'snickeri5.webp', t: 'Montering av garderob',                              c: 'snickeri' },
    { img: 'snickeri6.webp', t: 'Montering av garderob',                              c: 'snickeri' },
    { img: 'snickeri7.webp', t: 'Montering av dubbel barnsäng',                       c: 'snickeri' },
    { img: 'snickeri8.webp', t: 'Montering av dubbel barnsäng',                       c: 'snickeri' },
    { img: 'taktvatt1.webp', t: 'Taktvätt',                                           c: 'tak' },
    { img: 'taktvatt2.webp', t: 'Taktvätt',                                           c: 'tak' },
    { img: 'malning1.webp',  t: 'Spackling och målning',                              c: 'malning' },
    { img: 'malning2.webp',  t: 'Spackling och målning samt montering av dörr och karm', c: 'malning' },
    { img: 'malning3.webp',  t: 'Exklusiv målning med egen design',                   c: 'malning', big: true },
    { img: 'golv1.webp',     t: 'Parkettläggning',                                    c: 'golv' },
    { img: 'golv2.webp',     t: 'Laminatgolv',                                        c: 'golv' },
    { img: 'golv3.webp',     t: 'Laminatgolv',                                        c: 'golv' },
    { img: 'golv4.webp',     t: 'Golvslipning',                                       c: 'golv' },
    { img: 'golv5.webp',     t: 'Golvslipning',                                       c: 'golv' },
    { img: 'altan1.webp',    t: 'Reparation av altan',                                c: 'altan' },
    { img: 'altan2.webp',    t: 'Reparation av altan',                                c: 'altan' },
    { img: 'altan3.webp',    t: 'Reparation av altan',                                c: 'altan' },
    { img: 'altan4.webp',    t: 'Reparation av altan',                                c: 'altan' },
    { img: 'fix1.webp',      t: 'Små fix & montering',                                c: 'fix' },
    { img: 'fix2.webp',      t: 'Små fix & montering',                                c: 'fix' },
    { img: 'fix3.webp',      t: 'Montering av hyllor',                                c: 'fix' },
    { img: 'fix4.webp',      t: 'Montering av glasdörr',                              c: 'fix' }
  ];
  var LABELS = { snickeri: 'Snickeri', tak: 'Tak', malning: 'Målning', golv: 'Golv', altan: 'Altan', fix: 'Små fix' };
  var gallery = document.getElementById('gallery');
  var filtersEl = document.getElementById('filters');

  if (gallery && filtersEl) {
    var PAGE_SIZE = 8;
    var currentList = [];
    var currentIndex = 0;
    var currentFilter = 'alla';
    var currentPage = 1;
    var pagerEl = document.getElementById('galleryPager');

    function renderGallery() {
      gallery.innerHTML = '';
      currentList = PROJECTS.filter(function (p) { return currentFilter === 'alla' || p.c === currentFilter; });
      var pageCount = Math.max(1, Math.ceil(currentList.length / PAGE_SIZE));
      if (currentPage > pageCount) currentPage = pageCount;
      if (currentPage < 1) currentPage = 1;
      var start = (currentPage - 1) * PAGE_SIZE;
      currentList.slice(start, start + PAGE_SIZE).forEach(function (p, i) {
        var tile = document.createElement('div');
        tile.className = 'tile';
        tile.setAttribute('role', 'button');
        tile.setAttribute('tabindex', '0');
        tile.setAttribute('aria-label', 'Visa bild i fullskärm: ' + p.t);
        tile.dataset.index = String(start + i);
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
      renderPager(pageCount);
    }

    function renderPager(pageCount) {
      if (!pagerEl) return;
      pagerEl.innerHTML = '';
      pagerEl.hidden = pageCount <= 1;
      if (pageCount <= 1) return;

      function makeBtn(label, ariaLabel, disabled, onClick) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'page-btn';
        b.innerHTML = label;
        b.setAttribute('aria-label', ariaLabel);
        b.disabled = disabled;
        b.addEventListener('click', onClick);
        return b;
      }

      pagerEl.appendChild(makeBtn(
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
        'Föregående sida', currentPage === 1,
        function () { goToPage(currentPage - 1); }
      ));
      for (var n = 1; n <= pageCount; n++) {
        (function (num) {
          var b = makeBtn(String(num), 'Sida ' + num, false, function () { goToPage(num); });
          if (num === currentPage) {
            b.classList.add('active');
            b.setAttribute('aria-current', 'page');
          }
          pagerEl.appendChild(b);
        })(n);
      }
      pagerEl.appendChild(makeBtn(
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
        'Nästa sida', currentPage === pageCount,
        function () { goToPage(currentPage + 1); }
      ));
    }

    function goToPage(page) {
      if (page === currentPage) return;
      currentPage = page;
      renderGallery();
      // keep the grid in view when the new page is shorter than the old one
      var top = gallery.getBoundingClientRect().top;
      if (top < 0) gallery.scrollIntoView({ behavior: 'auto', block: 'start' });
    }

    renderGallery();

    filtersEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.chip');
      if (!btn) return;
      filtersEl.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      currentFilter = btn.dataset.f;
      currentPage = 1;
      renderGallery();
    });

    /* ---------- lightbox ---------- */
    var lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.id = 'lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Projektbild');
    lightbox.innerHTML =
      '<div class="lb-backdrop"></div>' +
      '<button type="button" class="lb-btn lb-close" aria-label="Stäng bildvisning"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
      '<button type="button" class="lb-btn lb-prev" aria-label="Föregående bild"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>' +
      '<button type="button" class="lb-btn lb-next" aria-label="Nästa bild"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>' +
      '<figure class="lb-figure">' +
        '<img class="lb-img" alt="">' +
        '<figcaption><span class="lb-cap"></span><span class="lb-count"></span></figcaption>' +
      '</figure>';
    document.body.appendChild(lightbox);

    var lbBackdrop = lightbox.querySelector('.lb-backdrop');
    var lbImg = lightbox.querySelector('.lb-img');
    var lbCap = lightbox.querySelector('.lb-cap');
    var lbCount = lightbox.querySelector('.lb-count');
    var lbClose = lightbox.querySelector('.lb-close');
    var lbPrev = lightbox.querySelector('.lb-prev');
    var lbNext = lightbox.querySelector('.lb-next');
    var lbFocusable = [lbClose, lbPrev, lbNext];
    var lastFocused = null;

    function updateLightbox() {
      var p = currentList[currentIndex];
      if (!p) return;
      lbImg.src = 'assets/images/' + p.img;
      lbImg.alt = p.t;
      lbCap.textContent = p.t;
      lbCount.textContent = (currentIndex + 1) + ' / ' + currentList.length;
    }

    function onLbKeydown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        showPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        showNext();
      } else if (e.key === 'Tab') {
        var idx = lbFocusable.indexOf(document.activeElement);
        e.preventDefault();
        if (e.shiftKey) {
          lbFocusable[idx <= 0 ? lbFocusable.length - 1 : idx - 1].focus();
        } else {
          lbFocusable[idx === -1 || idx === lbFocusable.length - 1 ? 0 : idx + 1].focus();
        }
      }
    }

    function openLightbox(index) {
      if (!currentList.length) return;
      currentIndex = ((index % currentList.length) + currentList.length) % currentList.length;
      updateLightbox();
      lastFocused = document.activeElement;
      lightbox.classList.add('open');
      document.body.classList.add('lb-lock');
      lbClose.focus();
      document.addEventListener('keydown', onLbKeydown);
    }
    function closeLightbox() {
      lightbox.classList.remove('open');
      document.body.classList.remove('lb-lock');
      document.removeEventListener('keydown', onLbKeydown);
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    }
    function showPrev() { currentIndex = (currentIndex - 1 + currentList.length) % currentList.length; updateLightbox(); }
    function showNext() { currentIndex = (currentIndex + 1) % currentList.length; updateLightbox(); }

    gallery.addEventListener('click', function (e) {
      var tile = e.target.closest('.tile');
      if (!tile) return;
      openLightbox(Number(tile.dataset.index));
    });
    gallery.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var tile = e.target.closest('.tile');
      if (!tile) return;
      e.preventDefault();
      openLightbox(Number(tile.dataset.index));
    });

    lbClose.addEventListener('click', closeLightbox);
    lbPrev.addEventListener('click', showPrev);
    lbNext.addEventListener('click', showNext);
    lbBackdrop.addEventListener('click', closeLightbox);
  }

  /* ---------- customer reviews (live API, section hidden on failure) ---------- */
  var omdomenSection = document.getElementById('omdomen');
  var reviewGrid = document.getElementById('reviewGrid');
  if (omdomenSection && reviewGrid) {
    fetch(API_BASE + '/get-reviews')
      .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status)); })
      .then(function (data) {
        var reviews = Array.isArray(data) ? data : (data && data.reviews) || [];
        reviews = reviews.filter(function (r) { return r && r.review_text; }).slice(0, 6);
        if (!reviews.length) return;
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
          reviewGrid.appendChild(card);
        });
        omdomenSection.hidden = false;
      })
      .catch(function () { /* API unavailable — keep the section hidden */ });
  }

  /* ---------- quote form → Azure Function /submit-quote ---------- */
  var form = document.getElementById('quoteForm');
  var errorBox = document.getElementById('formError');
  var submitBtn = document.getElementById('submitBtn');

  if (form && errorBox && submitBtn) {
    var formStart = Date.now();

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      errorBox.hidden = true;

      if (!form.reportValidity()) return;

      // Light anti-spam parity with the current site: a human takes >3s.
      if (Date.now() - formStart < 3000) {
        errorBox.hidden = false;
        errorBox.textContent = 'Vänta en liten stund och försök igen.';
        return;
      }

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
            '<h3 tabindex="-1">Tack — vi hör av oss!</h3>' +
            '<div class="qn" style="margin-top:8px">Vi kontaktar dig inom 24 timmar med din kostnadsfria offert.</div></div>';
          var successHeading = form.querySelector('h3');
          if (successHeading) successHeading.focus();
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
  }
})();
