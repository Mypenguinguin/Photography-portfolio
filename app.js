(() => {
  'use strict';

  const S = window.SITE;
  const P = window.PHOTOS || [];
  const byId = Object.fromEntries(P.map((p) => [p.id, p]));
  // Destinations and trips without photos yet stay hidden
  S.collections = S.collections.filter((c) => P.some((p) => p.collection === c.id));
  const col = Object.fromEntries(S.collections.map((c) => [c.id, c]));
  const trips = (S.trips || []).filter((t) => S.collections.some((c) => c.trip === t.id));
  // Covers and slides fall back to photos that exist, so a half-added trip never shows a broken image
  S.collections.forEach((c) => { if (!byId[c.cover]) c.cover = P.find((p) => p.collection === c.id).id; });
  trips.forEach((t) => { if (!byId[t.cover]) t.cover = S.collections.find((c) => c.trip === t.id).cover; });
  S.hero.slides = S.hero.slides.filter((id) => byId[id]);
  const trip = Object.fromEntries(trips.map((t) => [t.id, t]));
  const tripCollections = (tid) => S.collections.filter((c) => c.trip === tid);
  const photosInTrip = (tid) => P.filter((p) => col[p.collection] && col[p.collection].trip === tid);
  const placeOf = (p) => {
    const c = col[p.collection];
    const t = c && trip[c.trip];
    return c ? (t && t.title !== c.title ? `${c.title}, ${t.title}` : c.title) : '';
  };
  const places = S.places || {};
  const tripColor = (t) => (t && t.color) || '#46ccf2';
  const daysIn = (photos) => new Set(photos.map((p) => p.date && p.date.slice(0, 10)).filter(Boolean)).size;
  const exifLine = (p) => (p.exif ? [p.exif.aperture, p.exif.shutter, p.exif.iso && `ISO ${p.exif.iso}`].filter(Boolean).join(' · ') : '');
  S.journal = S.journal.filter((p) => col[p.collection]); // stories wait for their destination's photos
  const posts = [...S.journal].sort((a, b) => b.date.localeCompare(a.date));
  const postById = Object.fromEntries(posts.map((p) => [p.id, p]));
  const postCover = (p) => (byId[p.cover] ? p.cover : ((p.body.find((b) => b.photo) || {}).photo || col[p.collection].cover));

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const thumb = (id) => `images/thumb/${id}.jpg`;
  const full = (id) => `images/full/${id}.jpg`;
  const photosIn = (cid) => P.filter((p) => p.collection === cid);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  };

  /* ---------- Site text ---------- */
  const lookup = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), S);
  $$('[data-site]').forEach((el) => { el.textContent = lookup(el.dataset.site) || ''; });
  $$('[data-site-href="mailto"]').forEach((a) => {
    a.href = 'mailto:' + S.email;
    if (!a.textContent.trim()) a.textContent = S.email;
  });
  document.title = `${S.name} — ${S.tagline}`;
  $('.year').textContent = new Date().getFullYear();

  /* ---------- Reveal on scroll ---------- */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  const observeReveals = (root = document) => $$('.reveal:not(.is-in), .journey:not(.is-in)', root).forEach((el) => revealIO.observe(el));

  // Lazy background images
  const bgIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.style.backgroundImage = `url("${e.target.dataset.bg}")`;
      bgIO.unobserve(e.target);
    });
  }, { rootMargin: '300px' });
  const observeBgs = (root = document) => $$('[data-bg]', root).forEach((el) => bgIO.observe(el));

  /* ---------- Hero slideshow ---------- */
  function initHero() {
    const root = $('.hero');
    const wrap = $('.hero-slides');
    const dots = $('.hero-dots');
    const cap = $('.hero-caption');
    const ids = S.hero.slides.filter((id) => byId[id]);
    const DUR = 6500;
    $('.hero-title').innerHTML = S.hero.title.split(' ')
      .map((w, i) => `<span class="word"><span style="transition-delay:${0.2 + i * 0.1}s">${esc(w)}</span></span>`)
      .join(' ');
    ids.forEach((id, i) => {
      const s = document.createElement('div');
      s.className = 'hero-slide' + (i % 2 ? ' kb-alt' : '');
      s.dataset.src = full(id);
      s.style.backgroundColor = byId[id].color;
      s.style.backgroundImage = `url("${byId[id].blur}")`;
      wrap.append(s);
      const b = document.createElement('button');
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', `Slide ${i + 1}: ${byId[id].title}`);
      b.style.setProperty('--dur', DUR + 'ms');
      b.innerHTML = '<i></i>';
      b.addEventListener('click', () => go(i));
      dots.append(b);
    });
    const slides = $$('.hero-slide', wrap);
    const btns = $$('button', dots);
    let cur = -1, timer = 0, started = 0, remaining = DUR, paused = false;

    const load = (s) => new Promise((res) => {
      if (s.dataset.loaded) return res();
      const img = new Image();
      img.onload = img.onerror = () => { s.style.backgroundImage = `url("${s.dataset.src}")`; s.dataset.loaded = '1'; res(); };
      img.src = s.dataset.src;
    });
    const schedule = (ms) => {
      clearTimeout(timer);
      remaining = ms;
      started = performance.now();
      if (!paused) timer = setTimeout(() => go(cur + 1), ms);
    };
    async function go(i) {
      i = (i + ids.length) % ids.length;
      // First slide shows its blurred preview straight away and sharpens once loaded
      if (cur < 0) load(slides[i]); else await load(slides[i]);
      slides.forEach((s, k) => {
        if (k === i) {
          s.classList.remove('kb');
          void s.offsetWidth;
          s.classList.add('is-on');
          if (!reduced) s.classList.add('kb');
        } else s.classList.remove('is-on');
      });
      btns.forEach((b, k) => {
        b.classList.toggle('is-on', k === i);
        b.classList.toggle('is-done', k < i);
        b.setAttribute('aria-selected', k === i);
        const bar = b.firstChild;
        bar.style.animation = 'none';
        void bar.offsetWidth;
        bar.style.animation = '';
      });
      const p = byId[ids[i]];
      cap.classList.add('is-swap');
      setTimeout(() => {
        $('.hero-caption-title').textContent = p.title;
        $('.hero-caption-place').textContent = col[p.collection] ? col[p.collection].title : '';
        cap.classList.remove('is-swap');
      }, cur < 0 ? 0 : 350);
      cur = i;
      load(slides[(i + 1) % ids.length]);
      schedule(DUR);
    }
    const pause = () => {
      if (paused) return;
      paused = true;
      clearTimeout(timer);
      remaining -= performance.now() - started;
      root.classList.add('is-paused');
    };
    const resume = () => {
      if (!paused) return;
      paused = false;
      root.classList.remove('is-paused');
      schedule(Math.max(remaining, 400));
    };
    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible && !document.hidden ? resume() : pause(); }).observe(root);
    document.addEventListener('visibilitychange', () => (document.hidden || !visible ? pause() : resume()));
    go(0).then(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  }

  /* ---------- Stats ---------- */
  function initStats() {
    const days = new Set(P.map((p) => p.date && p.date.slice(0, 10)).filter(Boolean)).size;
    const values = {
      countries: new Set(trips.map((t) => t.country)).size,
      trips: trips.length,
      destinations: S.collections.length,
      days,
      photos: P.length,
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const el = e.target, to = values[el.dataset.count], t0 = performance.now(), d = reduced ? 1 : 1400;
        const tick = (t) => {
          const k = Math.min(1, Math.max(0, (t - t0) / d));
          el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach((el) => io.observe(el));
  }

  /* ---------- Maps (Leaflet + OpenStreetMap, darkened in CSS) ---------- */
  const hasMap = () => typeof window.L !== 'undefined';
  function addTiles(map) {
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      className: 'tiles-dark',
      maxZoom: 18,
    }).addTo(map);
    map.attributionControl.setPrefix('');
  }
  const pinIcon = (label, color) => L.divIcon({
    className: 'pin',
    html: `<span style="--tc:${color}">${label}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
  const popupHtml = (c) => `
    <a class="pop" href="#/collection/${c.id}">
      <img src="${thumb(c.cover)}" alt="">
      <span><b>${esc(c.title)}</b><small>${esc(c.native)} · ${esc(c.dates)}</small><em>${photosIn(c.id).length} photos &rarr;</em></span>
    </a>`;

  // Draws trips as numbered pins joined by a dashed route; returns { map, groups }
  function routeMap(el, tripList, opts = {}) {
    if (!hasMap()) {
      el.innerHTML = '<p class="map-off">The map could not load.</p>';
      return null;
    }
    const map = L.map(el, { scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false, zoomSnap: 0.25 });
    addTiles(map);
    const groups = {};
    tripList.forEach((t) => {
      const g = L.featureGroup();
      const stops = tripCollections(t.id).filter((c) => places[c.id]);
      if (stops.length > 1) {
        L.polyline(stops.map((c) => places[c.id]), { color: tripColor(t), weight: 2, opacity: 0.85, dashArray: '3 7' }).addTo(g);
      }
      stops.forEach((c) => {
        const n = tripCollections(t.id).indexOf(c) + 1;
        const m = L.marker(places[c.id], { icon: pinIcon(n, tripColor(t)), title: c.title, riseOnHover: true });
        if (opts.onPin) m.on('click', () => opts.onPin(c));
        else m.bindPopup(popupHtml(c), { className: 'map-pop', closeButton: false, maxWidth: 260 });
        m.addTo(g);
      });
      g.addTo(map);
      groups[t.id] = g;
    });
    const fit = (ids) => {
      const bounds = L.latLngBounds([]);
      ids.forEach((id) => groups[id] && groups[id].getLayers().length && bounds.extend(groups[id].getBounds()));
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [36, 36], maxZoom: 9 });
    };
    fit(tripList.map((t) => t.id));
    return { map, groups, fit };
  }

  let atlas = null;
  function initAtlas() {
    const tabs = $('.atlas-tabs');
    atlas = routeMap($('.atlas-map'), trips);
    if (!atlas) { tabs.hidden = true; return; }
    tabs.innerHTML = `<button role="tab" data-trip="all" class="is-active" data-cursor>All trips</button>` +
      trips.map((t) => `<button role="tab" data-trip="${t.id}" data-cursor><i style="--tc:${tripColor(t)}"></i>${esc(t.label || t.title)}</button>`).join('');
    tabs.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      $$('button', tabs).forEach((x) => x.classList.toggle('is-active', x === b));
      const ids = b.dataset.trip === 'all' ? trips.map((t) => t.id) : [b.dataset.trip];
      Object.entries(atlas.groups).forEach(([id, g]) => (ids.includes(id) ? g.addTo(atlas.map) : g.remove()));
      atlas.map.closePopup();
      atlas.fit(ids);
    });
    // Leaflet measures its box; refit once the section is actually on screen
    new IntersectionObserver(([e], io) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      atlas.map.invalidateSize();
      atlas.fit(trips.map((t) => t.id));
    }).observe($('.atlas-map'));
  }

  /* ---------- Trip tickets ---------- */
  function initTrips() {
    $('.tickets').innerHTML = trips.map((t, n) => {
      const list = tripCollections(t.id);
      const ph = photosInTrip(t.id);
      const strip = list.slice(0, 4).map((c) => c.cover);
      return `
      <a class="ticket reveal" href="#/trip/${t.id}" style="--tc:${tripColor(t)}" data-cursor="Board">
        <div class="ticket-media">
          <div class="ticket-img" data-bg="${full(t.cover)}" style="background-color:${byId[t.cover].color}"></div>
          <div class="ticket-strip">${strip.map((id) => `<img src="${thumb(id)}" alt="" loading="lazy">`).join('')}</div>
        </div>
        <div class="ticket-body">
          <div class="ticket-row"><span class="ticket-no">Trip ${String(trips.length - n).padStart(2, '0')}</span><span class="ticket-native">${esc(t.native)}</span></div>
          <h3 class="ticket-title">${esc(t.title)}</h3>
          <p class="ticket-dates">${esc(t.dates)}</p>
          <ol class="ticket-route">${list.map((c) => `<li>${esc(c.title)}</li>`).join('')}</ol>
          <p class="ticket-blurb">${esc(t.blurb)}</p>
          <dl class="ticket-stats">
            <div><dt>Stops</dt><dd>${list.length}</dd></div>
            <div><dt>Days</dt><dd>${daysIn(ph) || '&ndash;'}</dd></div>
            <div><dt>Frames</dt><dd>${ph.length}</dd></div>
          </dl>
        </div>
        <div class="ticket-stub" aria-hidden="true">
          <span class="stub-text">${esc(S.name)} &middot; ${esc(t.label || t.title)}</span>
          <span class="stub-cta">Board &rarr;</span>
        </div>
      </a>`;
    }).join('');
  }

  function initMenu() {
    const links = [
      { href: '#/', label: 'Home', img: S.hero.slides[0] },
      { href: '#/trips', label: 'Trips', img: S.hero.slides[1] },
      { href: '#/map', label: 'Map', img: S.hero.slides[2] },
      { href: '#/archive', label: 'Archive', img: S.hero.slides[3] },
      { href: '#/journal', label: 'Journal', img: S.hero.slides[4] || S.hero.slides[0] },
      { href: '#/about', label: 'About', img: S.aboutPhoto || S.hero.slides[1] },
    ];
    $('.menu-links').innerHTML =
      links.map((l, i) => `<li><a href="${l.href}" data-img="${l.img}" style="transition-delay:${0.15 + i * 0.05}s" data-cursor>${l.label}</a></li>`).join('') +
      '<li class="sep"></li>' +
      trips.map((t, i) => `<li><a href="#/trip/${t.id}" data-img="${t.cover}" style="transition-delay:${0.35 + i * 0.05}s" data-cursor>${esc(t.title)} <small>${esc(t.dates)}</small></a></li>`).join('');
    const preview = $('.menu-preview');
    const imgs = {};
    $$('.menu-links a').forEach((a) => {
      const id = a.dataset.img;
      if (!imgs[id]) {
        const d = document.createElement('div');
        d.dataset.src = full(id);
        preview.append(d);
        imgs[id] = d;
      }
      a.addEventListener('mouseenter', () => {
        Object.values(imgs).forEach((d) => d.classList.remove('is-on'));
        const d = imgs[id];
        if (!d.style.backgroundImage) d.style.backgroundImage = `url("${d.dataset.src}")`;
        d.classList.add('is-on');
      });
    });
    const btn = $('.menu-btn');
    const setMenu = (open) => {
      document.body.classList.toggle('menu-open', open);
      btn.setAttribute('aria-expanded', open);
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      $('.menu').setAttribute('aria-hidden', !open);
      if (open) $$('.menu-links a')[0].dispatchEvent(new Event('mouseenter'));
    };
    btn.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
    $('.menu').addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false); });
  }

  /* ---------- Galleries ---------- */
  const tileIO = new IntersectionObserver((entries) => {
    let n = 0;
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const t = e.target;
      tileIO.unobserve(t);
      const img = $('.t-img', t);
      img.onload = () => img.classList.add('is-loaded');
      img.src = img.dataset.src;
      t.style.transitionDelay = `${(n++ % 8) * 0.06}s`;
      t.classList.add('is-in');
      setTimeout(() => { t.style.transitionDelay = ''; }, 1400);
    });
  }, { rootMargin: '0px 0px 120px 0px' });

  const ro = new ResizeObserver((entries) => entries.forEach((e) => justify(e.target)));
  function justify(el) {
    if (!el.classList.contains('rows')) return;
    const W = Math.floor(el.getBoundingClientRect().width);
    if (!W) return;
    const gap = W < 600 ? 6 : 10;
    const target = W < 600 ? 170 : W < 1100 ? 250 : 330;
    el.style.setProperty('--gap', gap + 'px');
    let row = [], sum = 0;
    const flush = (last) => {
      const free = W - (row.length - 1) * gap;
      const h = last ? Math.min(target, free / sum) : free / sum;
      const widths = row.map((t) => Math.floor(t._ar * h));
      if (!last) widths[widths.length - 1] += free - widths.reduce((a, b) => a + b, 0);
      row.forEach((t, k) => { t.style.width = widths[k] + 'px'; t.style.height = Math.round(h) + 'px'; });
      row = []; sum = 0;
    };
    $$('.tile', el).forEach((t) => {
      row.push(t);
      sum += t._ar;
      if (sum * target + (row.length - 1) * gap >= W) flush(false);
    });
    if (row.length) flush(true);
  }

  function renderGallery(el, items, showPlace = true) {
    el.innerHTML = items.map((p) => `
      <a class="tile" href="#/photo/${p.id}" data-id="${p.id}" data-cursor="View" style="--ar:${p.w / p.h};--c:${p.color}">
        <div class="tile-inner">
          <img class="t-blur" src="${p.blur}" alt="" aria-hidden="true">
          <img class="t-img" data-src="${thumb(p.id)}" alt="${esc(p.title)}">
        </div>
        <div class="tile-cap">
          ${showPlace && col[p.collection] ? `<span>${esc(placeOf(p))}</span>` : ''}<strong>${esc(p.title)}</strong>
          ${exifLine(p) || p.date ? `<em class="t-data">${[p.date && fmtShort(p.date), exifLine(p)].filter(Boolean).join(' · ')}</em>` : ''}
        </div>
      </a>`).join('');
    $$('.tile', el).forEach((t) => { t._ar = byId[t.dataset.id].w / byId[t.dataset.id].h; tileIO.observe(t); });
    el._items = items;
    ro.observe(el);
    justify(el);
  }
  const fmtShort = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  $$('.gallery').forEach((g) => g.classList.add('rows'));

  // Clicking a tile opens the lightbox on that gallery's photos
  document.addEventListener('click', (e) => {
    const t = e.target.closest('.tile, .story-body figure');
    if (!t || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    const host = t.closest('[data-gallery], .story-body');
    const items = host._items || P;
    lightbox.open(items, items.findIndex((p) => p.id === t.dataset.id));
  });

  function initPortfolio() {
    const el = $('[data-gallery="portfolio"]');
    const bar = $('.filters');
    const ink = $('.filter-ink');
    const sub = $('.subfilters');
    const opts = [{ id: 'all', title: 'All', n: P.length }, ...trips.map((t) => ({ id: t.id, title: t.label || t.title, n: photosInTrip(t.id).length }))];
    bar.insertAdjacentHTML('beforeend', opts.map((o) => `<button role="tab" data-filter="${o.id}" data-cursor>${esc(o.title)}<sup>${o.n}</sup></button>`).join(''));
    const moveInk = () => {
      const b = $('.is-active', bar);
      if (!b) return;
      ink.style.width = b.offsetWidth + 'px';
      ink.style.height = b.offsetHeight + 'px';
      ink.style.transform = `translate(${b.offsetLeft}px, ${b.offsetTop}px)`;
    };
    let current = null, currentSub = 'all';
    const apply = (animate) => {
      const items = current === 'all' ? P : currentSub === 'all' ? photosInTrip(current) : photosIn(currentSub);
      const showPlace = currentSub === 'all';
      if (!animate) return renderGallery(el, items, showPlace);
      el.classList.add('is-fading');
      setTimeout(() => { renderGallery(el, items, showPlace); el.classList.remove('is-fading'); }, 320);
    };
    const setFilter = (id, animate = true) => {
      if (id === current) return;
      current = id;
      currentSub = 'all';
      $$('button', bar).forEach((b) => { b.classList.toggle('is-active', b.dataset.filter === id); b.setAttribute('aria-selected', b.dataset.filter === id); });
      moveInk();
      const subOpts = id === 'all' ? [] : [{ id: 'all', title: 'All destinations', n: photosInTrip(id).length },
        ...tripCollections(id).map((c) => ({ id: c.id, title: c.title, n: photosIn(c.id).length }))];
      sub.innerHTML = subOpts.map((o) => `<button role="tab" data-sub="${o.id}" class="${o.id === 'all' ? 'is-active' : ''}" data-cursor>${esc(o.title)}<sup>${o.n}</sup></button>`).join('');
      sub.classList.toggle('is-open', subOpts.length > 0);
      apply(animate);
    };
    bar.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setFilter(b.dataset.filter); });
    sub.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || b.dataset.sub === currentSub) return;
      currentSub = b.dataset.sub;
      $$('button', sub).forEach((x) => x.classList.toggle('is-active', x === b));
      apply(true);
    });
    new ResizeObserver(moveInk).observe(bar);
    document.fonts && document.fonts.ready.then(moveInk);

    const toggle = $('.layout-toggle');
    const setLayout = (mode) => {
      el.classList.toggle('rows', mode === 'rows');
      el.classList.toggle('masonry', mode === 'masonry');
      $$('button', toggle).forEach((b) => b.classList.toggle('is-active', b.dataset.layout === mode));
      if (mode === 'masonry') $$('.tile', el).forEach((t) => { t.style.width = ''; t.style.height = ''; });
      justify(el);
      store.set('layout', mode);
    };
    toggle.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setLayout(b.dataset.layout); });
    setFilter('all', false);
    setLayout(store.get('layout') === 'masonry' ? 'masonry' : 'rows');
  }

  /* ---------- Journal & about ---------- */
  function initJournal() {
    $('.posts').innerHTML = posts.map((p, i) => {
      const cover = postCover(p);
      return `
      <a class="post reveal" href="#/journal/${p.id}" data-cursor="Read" style="transition-delay:${i ? ((i - 1) % 3) * 0.08 : 0}s">
        <div class="post-img"><img src="${i === 0 ? full(cover) : thumb(cover)}" alt="" loading="lazy"></div>
        <div class="post-body">
          <p class="post-meta"><b>${esc(placeOf({ collection: p.collection }))}</b><span>${fmtDate(p.date)}</span></p>
          <h3 class="post-title">${esc(p.title)}</h3>
          <p class="post-excerpt">${esc(p.excerpt)}</p>
          <span class="post-more">Read story <i></i></span>
        </div>
      </a>`;
    }).join('');
    const more = $('.posts-more');
    more.hidden = posts.length <= 3;
    $('button', more).addEventListener('click', () => {
      $('.posts').classList.add('is-all');
      more.hidden = true;
      observeReveals();
    });
    const about = $('.about-media img');
    about.src = full(S.aboutPhoto || S.hero.slides[3]);
  }

  /* ---------- Views & routing ---------- */
  function renderBanner(v, x, meta, back) {
    $('.banner-img', v).style.backgroundImage = `url("${full(x.cover)}")`;
    $('.banner-img', v).style.backgroundColor = byId[x.cover] ? byId[x.cover].color : '';
    $('.banner-native', v).textContent = x.native;
    $('.banner-title', v).textContent = x.title;
    $('.banner-meta', v).textContent = meta;
    $('.banner-blurb', v).textContent = x.blurb || '';
    $('.back', v).href = back.href;
    $('.back', v).innerHTML = `&larr; ${esc(back.label)}`;
    document.title = `${x.title} — ${S.name}`;
  }
  const pager = (list, x, route, noun) => {
    const i = list.indexOf(x);
    if (list.length < 2) return '';
    const prev = list[(i - 1 + list.length) % list.length];
    const next = list[(i + 1) % list.length];
    return (list.length === 2 ? [['Next', next]] : [['Previous', prev], ['Next', next]]).map(([k, y]) => `
      <a href="#/${route}/${y.id}" data-cursor="Go">
        <span class="pg-img" style="background-image:url('${thumb(y.cover)}')"></span>
        <small>${k} ${noun}</small><strong>${esc(y.label || y.title)}</strong>
      </a>`).join('');
  };

  let tripMap = null, chapterIO = null;
  function clearTrip(v) {
    if (tripMap) { tripMap.map.remove(); tripMap = null; }
    if (chapterIO) { chapterIO.disconnect(); chapterIO = null; }
    $('.trip-overview', v).innerHTML = '';
    $('.chapters', v).innerHTML = '';
    $('.route-nav', v).hidden = true;
  }

  function renderCollection(id) {
    const c = col[id];
    const t = trip[c.trip];
    const items = photosIn(id);
    const v = $('.view-collection');
    clearTrip(v);
    v.style.setProperty('--tc', tripColor(t));
    renderBanner(v, c, `${items.length} photographs · ${c.dates}`,
      t ? { href: `#/trip/${t.id}`, label: `${t.label || t.title}` } : { href: '#/trips', label: 'All trips' });
    const g = $('[data-gallery="collection"]', v);
    g.hidden = false;
    renderGallery(g, items, false);
    $('.pager', v).innerHTML = pager(t ? tripCollections(t.id) : S.collections, c, 'collection', 'destination');
  }

  function renderTrip(id) {
    const t = trip[id];
    const list = tripCollections(id);
    const items = photosInTrip(id);
    const v = $('.view-collection');
    clearTrip(v);
    v.style.setProperty('--tc', tripColor(t));
    renderBanner(v, t, `${list.length} destinations · ${items.length} photographs · ${t.dates}`, { href: '#/trips', label: 'All trips' });
    $('[data-gallery="collection"]', v).innerHTML = '';
    $('[data-gallery="collection"]', v).hidden = true;

    // Sticky route bar: one stop per destination
    const nav = $('.route-nav', v);
    nav.hidden = false;
    $('ol', nav).innerHTML = list.map((c, k) =>
      `<li><button type="button" data-ch="${c.id}" data-cursor><span>${String(k + 1).padStart(2, '0')}</span>${esc(c.title)}</button></li>`).join('');

    // Overview: the route on a map plus the trip's numbers and gear
    const cams = [...new Set(items.map((p) => p.exif && p.exif.camera).filter(Boolean))];
    const lenses = [...new Set(items.map((p) => p.exif && p.exif.lens).filter(Boolean))];
    $('.trip-overview', v).innerHTML = `
      <div class="ov-map"></div>
      <div class="ov-facts reveal">
        <p class="eyebrow">The route</p>
        <ol class="ov-stops">${list.map((c, k) => `<li><button type="button" data-ch="${c.id}" data-cursor><span>${String(k + 1).padStart(2, '0')}</span><b>${esc(c.title)}</b><small>${esc(c.dates)}</small></button></li>`).join('')}</ol>
        <dl class="ov-data">
          <div><dt>Frames</dt><dd>${items.length}</dd></div>
          <div><dt>Days</dt><dd>${daysIn(items) || '&ndash;'}</dd></div>
          ${cams.length ? `<div class="wide"><dt>Shot on</dt><dd>${cams.map(esc).join(', ')}</dd></div>` : ''}
          ${lenses.length ? `<div class="wide"><dt>Lenses</dt><dd>${lenses.map(esc).join(', ')}</dd></div>` : ''}
        </dl>
      </div>`;
    tripMap = routeMap($('.ov-map', v), [t], { onPin: (c) => goChapter(c.id) });

    // One chapter per destination; the lightbox runs through the whole trip
    $('.chapters', v).innerHTML = list.map((c, k) => `
      <section class="chapter" id="ch-${c.id}">
        <header class="chapter-head reveal">
          <span class="chapter-no">${String(k + 1).padStart(2, '0')}</span>
          <div class="chapter-text">
            <p class="chapter-native">${esc(c.native)} &middot; ${esc(c.dates)} &middot; ${photosIn(c.id).length} frames</p>
            <h2 class="chapter-title">${esc(c.title)}</h2>
            <p class="chapter-blurb">${esc(c.blurb)}</p>
          </div>
          <a class="chapter-link" href="#/collection/${c.id}" data-cursor>Open &rarr;</a>
        </header>
        <div class="gallery rows" data-gallery="ch-${c.id}"></div>
      </section>`).join('');
    list.forEach((c) => {
      const g = $(`[data-gallery="ch-${c.id}"]`, v);
      renderGallery(g, photosIn(c.id), false);
      g._items = items;
    });

    // Highlight the chapter being read
    const buttons = $$('[data-ch]', nav);
    chapterIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const id = e.target.id.slice(3);
        buttons.forEach((b) => b.classList.toggle('is-active', b.dataset.ch === id));
        const on = buttons.find((b) => b.dataset.ch === id);
        if (on) $('ol', nav).scrollTo({ left: on.offsetLeft - 24, behavior: 'smooth' });
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    $$('.chapter', v).forEach((s) => chapterIO.observe(s));
    $('.pager', v).innerHTML = pager(trips, t, 'trip', 'trip');
    setTimeout(() => tripMap && (tripMap.map.invalidateSize(), tripMap.fit([t.id])), 650);
  }

  function goChapter(id) {
    const el = document.getElementById('ch-' + id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + scrollY - 70;
    window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ch]');
    if (b) goChapter(b.dataset.ch);
  });

  function renderStory(id) {
    const p = postById[id];
    const v = $('.view-story');
    const photos = p.body.filter((b) => b.photo && byId[b.photo]).map((b) => byId[b.photo]);
    $('.story-cover', v).style.backgroundImage = `url("${full(postCover(p))}")`;
    $('.story-date', v).textContent = `${col[p.collection].title} · ${fmtDate(p.date)}`;
    $('.story-title', v).textContent = p.title;
    $('.story-excerpt', v).textContent = p.excerpt;
    const body = $('.story-body', v);
    body.innerHTML = p.body.map((b) => {
      if (typeof b === 'string') return `<p class="reveal">${esc(b)}</p>`;
      const ph = byId[b.photo];
      if (!ph) return '';
      return `<figure class="reveal" data-id="${ph.id}" data-cursor="View">
          <div class="tile-inner" style="--ar:${ph.w / ph.h};--c:${ph.color}"><img src="${full(ph.id)}" alt="${esc(ph.title)}" loading="lazy"></div>
          <figcaption><strong>${esc(ph.title)}</strong><span>${esc(ph.caption)}</span></figcaption>
        </figure>`;
    }).join('');
    body._items = photos;
    const i = posts.indexOf(p);
    const next = posts[(i + 1) % posts.length];
    $('.story-foot', v).innerHTML = `
      <p class="eyebrow">Keep exploring</p>
      <a class="btn" href="#/collection/${p.collection}" data-cursor>All ${esc(col[p.collection].title)} photos</a>
      ${trip[col[p.collection].trip] ? `<a class="btn btn-ghost" href="#/trip/${col[p.collection].trip}" data-cursor>The whole ${esc(trip[col[p.collection].trip].label || trip[col[p.collection].trip].title)} trip</a>` : ''}
      <a class="btn btn-ghost" href="#/journal/${next.id}" data-cursor>Next story: ${esc(next.title)}</a>`;
    document.title = `${p.title} — ${S.name}`;
  }

  const curtain = $('.curtain');
  let currentView = null;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function show(view, render, section) {
    const changing = currentView !== view || render;
    if (changing && currentView && !reduced) {
      curtain.className = 'curtain is-in';
      await wait(460);
    }
    if (changing) {
      $$('.view').forEach((v) => { v.hidden = v.dataset.view !== view; });
      if (render) render();
      if (view === 'home') document.title = `${S.name} — ${S.tagline}`;
      if (view === 'archive') document.title = `Archive — ${S.name}`;
      $$('.nav a').forEach((x) => x.classList.toggle('is-active', view === 'archive' && x.getAttribute('href') === '#/archive'));
      if (view === 'home' && atlas) setTimeout(() => atlas.map.invalidateSize(), 50);
      observeReveals();
      observeBgs();
      $$('.gallery').forEach(justify);
      if (!section) window.scrollTo(0, 0);
    }
    const target = section && document.getElementById(section);
    if (target) target.scrollIntoView({ behavior: changing || reduced ? 'auto' : 'smooth' });
    if (changing && currentView && !reduced) {
      curtain.className = 'curtain is-out';
      setTimeout(() => { curtain.className = 'curtain'; }, 600);
    }
    currentView = view;
  }

  function route() {
    const [a, b] = location.hash.replace(/^#\/?/, '').split('/');
    if (a === 'collection' && col[b]) show('collection', () => renderCollection(b));
    else if (a === 'trip' && trip[b]) show('collection', () => renderTrip(b));
    else if (a === 'journal' && b && postById[b]) show('story', () => renderStory(b));
    else if (a === 'photo' && byId[b]) { show('home'); lightbox.open(P, P.indexOf(byId[b])); }
    else if (a === 'archive' || a === 'portfolio') show('archive');
    else show('home', null, { trips: 'trips', destinations: 'trips', map: 'map', journey: 'map', journal: 'journal', about: 'about' }[a] || null);
  }
  window.addEventListener('hashchange', route);
  // Re-run the route when a link points at the hash we are already on
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#/"]');
    if (a && a.getAttribute('href') === location.hash && !a.classList.contains('tile')) { e.preventDefault(); route(); }
  });

  /* ---------- Header, progress, parallax, nav state ---------- */
  function initScroll() {
    const header = $('.header');
    const bar = $('.progress span');
    let lastY = 0, ticking = false;
    const update = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      header.classList.toggle('is-solid', y > 40);
      header.classList.toggle('is-hidden', y > 400 && y > lastY && !document.body.classList.contains('menu-open'));
      lastY = y;
      if (!reduced) {
        $$('.banner-img, .story-cover').forEach((el) => {
          if (el.offsetParent !== null && y < innerHeight * 1.2) el.style.transform = `translate3d(0, ${y * 0.28}px, 0) scale(1.04)`;
        });
      }
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();

    const navLinks = $$('.nav a');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#/' + e.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['trips', 'map', 'journal', 'about'].forEach((id) => io.observe(document.getElementById(id)));
  }

  /* ---------- Custom cursor ---------- */
  function initCursor() {
    if (!finePointer || reduced) return;
    const c = $('.cursor');
    const label = $('.cursor-label');
    let x = -100, y = -100, cx = x, cy = y;
    document.body.classList.add('has-cursor');
    addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; }, { passive: true });
    document.addEventListener('mouseleave', () => { c.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { c.style.opacity = ''; });
    const loop = () => {
      cx += (x - cx) * 0.22;
      cy += (y - cy) * 0.22;
      c.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest('[data-cursor], a, button, .lb-img');
      const text = t ? (t.classList.contains('lb-img') ? ($('.lb-figure').classList.contains('is-zoomed') ? 'Out' : 'Zoom') : t.dataset.cursor || '') : '';
      label.textContent = text;
      c.classList.toggle('is-label', !!text);
      c.classList.toggle('is-hover', !!t && !text);
    });
  }

  /* ---------- Lightbox ---------- */
  const lightbox = (() => {
    const lb = $('.lb');
    const fig = $('.lb-figure', lb);
    const img = $('.lb-img', lb);
    const blur = $('.lb-blur', lb);
    const info = $('.lb-info', lb);
    const strip = $('.lb-strip', lb);
    const timerBar = $('.lb-timer', lb);
    const panel = $('.lb-panel', lb);
    const infoBtn = $('.lb-info-btn', lb);
    const imprint = $('.lb-imprint', lb);
    const PLAY = 5000;
    let set = [], i = 0, isOpen = false, playing = false, playTimer = 0, lastFocus = null;
    let showInfo = store.get('info') ? store.get('info') === '1' : innerWidth >= 1100;
    let mini = null, miniPin = null;

    /* Details panel: where, when, camera */
    const pad = (n) => String(n).padStart(2, '0');
    const partOfDay = (h) => (h < 5 ? 'Night' : h < 8 ? 'Early morning' : h < 11 ? 'Morning' : h < 14 ? 'Midday' : h < 17 ? 'Afternoon' : h < 19 ? 'Evening' : 'Night');
    function fillPanel(p) {
      const c = col[p.collection];
      const t = c && trip[c.trip];
      panel.style.setProperty('--tc', tripColor(t));
      $('.lbp-frame', panel).innerHTML = `Frame <b>${pad(i + 1)}</b> / ${pad(set.length)}`;
      $('.lbp-title', panel).textContent = p.title;
      $('.lbp-caption', panel).textContent = p.caption || '';
      $('.lbp-place', panel).innerHTML = c
        ? `<b>${esc(c.title)}</b> <span class="lbp-native">${esc(c.native)}</span><small>${esc(t ? t.label || t.title : '')}</small>`
        : '';
      const ll = c && places[c.id];
      const box = $('.lbp-map', panel);
      box.hidden = !ll || !hasMap();
      if (ll && hasMap() && showInfo) {
        if (!mini) {
          mini = L.map(box, { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false, tap: false });
          addTiles(mini);
          miniPin = L.marker(ll, { icon: pinIcon('', tripColor(t)), interactive: false }).addTo(mini);
        }
        miniPin.setIcon(pinIcon('', tripColor(t)));
        miniPin.setLatLng(ll);
        mini.invalidateSize();
        mini.setView(ll, 8, { animate: false });
      }
      const more = $('.lbp-more', panel);
      more.hidden = !c;
      if (c) {
        more.href = `#/collection/${c.id}`;
        more.innerHTML = `${ll ? 'Approximate location &middot; ' : ''}More from ${esc(c.title)} &rarr;`;
      }
      const when = $('.lbp-when', panel);
      if (p.date) {
        const d = new Date(p.date);
        const day = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        when.innerHTML = p.date.length > 10
          ? `${day}<span class="lbp-time"><b>${pad(d.getHours())}:${pad(d.getMinutes())}</b> ${partOfDay(d.getHours())}</span>`
          : day;
      } else {
        when.textContent = 'Date not recorded';
      }
      const e = p.exif || {};
      const rows = [
        ['Camera', e.camera],
        ['Lens', e.lens],
        ['Focal length', e.focal && `${e.focal} mm${e.focal35 ? ` <small>(${e.focal35} mm equiv.)</small>` : ''}`],
        ['Aperture', e.aperture],
        ['Shutter', e.shutter],
        ['ISO', e.iso],
        ['Exposure', e.ev ? `${e.ev > 0 ? '+' : ''}${e.ev} EV` : null],
      ].filter(([, v]) => v);
      const strip = [e.aperture, e.shutter, e.iso && `ISO${e.iso}`, e.focal35 && `${e.focal35}mm`].filter(Boolean);
      $('.lbp-exif', panel).innerHTML = rows.length
        ? `<div class="lbp-strip">${strip.map((s) => `<span>${esc(s)}</span>`).join('')}</div>` + rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${typeof v === 'number' ? v : (k === 'Focal length' ? v : esc(v))}</dd></div>`).join('')
        : '<p class="lbp-none">Camera data isn\'t available for this photo yet.</p>';
    }

    // Film-camera style date imprint, pinned to the photo's lower-right corner
    function setImprint(p) {
      if (!p.date) { imprint.textContent = ''; return; }
      const d = new Date(p.date);
      imprint.textContent = `'${String(d.getFullYear()).slice(2)} ${d.getMonth() + 1} ${d.getDate()}`;
    }
    function placeImprint() {
      if (!img.naturalWidth) return;
      const r = img.getBoundingClientRect();
      const f = fig.getBoundingClientRect();
      imprint.style.right = `${f.right - r.right + Math.max(10, r.width * 0.025)}px`;
      imprint.style.bottom = `${f.bottom - r.bottom + Math.max(8, r.height * 0.03)}px`;
      imprint.style.fontSize = `${Math.max(11, Math.min(22, r.width * 0.022))}px`;
    }
    function setInfo(on) {
      showInfo = on;
      lb.classList.toggle('show-panel', on);
      infoBtn.classList.toggle('is-on', on);
      infoBtn.setAttribute('aria-pressed', on);
      store.set('info', on ? '1' : '0');
      if (on && set[i]) fillPanel(set[i]);
      setTimeout(() => { placeImprint(); if (on && mini) { mini.invalidateSize(); fillPanel(set[i]); } }, 460);
    }
    infoBtn.addEventListener('click', () => setInfo(!showInfo));
    $('.lbp-more', panel).addEventListener('click', () => close());
    new ResizeObserver(() => isOpen && placeImprint()).observe(fig);

    const preload = (k) => { const p = set[(k + set.length) % set.length]; if (p) new Image().src = full(p.id); };

    function render(k, first) {
      i = (k + set.length) % set.length;
      const p = set[i];
      fig.classList.remove('is-zoomed');
      img.style.transform = '';
      info.classList.add('is-swap');
      fig.classList.add('is-leaving');
      setTimeout(() => {
        fig.classList.remove('loaded', 'is-leaving');
        img.classList.remove('is-loaded');
        blur.src = p.blur;
        img.onload = () => { img.classList.add('is-loaded'); fig.classList.add('loaded'); requestAnimationFrame(placeImprint); };
        img.addEventListener('transitionend', placeImprint, { once: true });
        setImprint(p);
        fillPanel(p);
        img.alt = p.title;
        img.src = full(p.id);
        if (img.complete && img.naturalWidth) img.onload();
        $('.lb-place', lb).textContent = [placeOf(p), fmtDate(p.date)].filter(Boolean).join(' · ');
        $('.lb-title', lb).textContent = p.title;
        $('.lb-caption', lb).textContent = p.caption || '';
        $('.lb-count', lb).innerHTML = `<b>${String(i + 1).padStart(2, '0')}</b> / ${String(set.length).padStart(2, '0')}`;
        info.classList.remove('is-swap');
      }, first ? 0 : 220);
      $$('button', strip).forEach((b, n) => b.classList.toggle('is-on', n === i));
      const on = strip.children[i];
      if (on) strip.scrollTo({ left: on.offsetLeft - strip.clientWidth / 2 + on.offsetWidth / 2, behavior: first ? 'auto' : 'smooth' });
      preload(i + 1);
      preload(i - 1);
      if (playing) schedulePlay();
    }

    function schedulePlay() {
      clearTimeout(playTimer);
      timerBar.classList.remove('run');
      void timerBar.offsetWidth;
      timerBar.style.setProperty('--dur', PLAY + 'ms');
      timerBar.classList.add('run');
      playTimer = setTimeout(() => render(i + 1), PLAY);
    }
    function setPlaying(on) {
      playing = on;
      lb.classList.toggle('is-playing', on);
      $('.lb-play', lb).setAttribute('aria-label', on ? 'Pause slideshow' : 'Play slideshow');
      if (on) schedulePlay(); else { clearTimeout(playTimer); timerBar.classList.remove('run'); }
    }

    function open(items, k) {
      if (!items.length) return;
      set = items;
      strip.innerHTML = set.map((p, n) => `<button aria-label="${esc(p.title)}" data-n="${n}"><img src="${thumb(p.id)}" alt="" loading="lazy"></button>`).join('');
      if (!isOpen) {
        lastFocus = document.activeElement;
        lb.classList.toggle('show-panel', showInfo);
        infoBtn.classList.toggle('is-on', showInfo);
        infoBtn.setAttribute('aria-pressed', showInfo);
        lb.hidden = false;
        document.body.classList.add('no-scroll');
        requestAnimationFrame(() => lb.classList.add('is-open'));
        isOpen = true;
      }
      render(Math.max(0, k), true);
      $('.lb-close', lb).focus({ preventScroll: true });
    }
    function close() {
      if (!isOpen) return;
      isOpen = false;
      setPlaying(false);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      lb.classList.remove('is-open');
      document.body.classList.remove('no-scroll');
      setTimeout(() => { if (!isOpen) lb.hidden = true; }, 400);
      if (location.hash.startsWith('#/photo/')) history.replaceState(null, '', '#/');
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    }

    async function share() {
      const url = location.href.split('#')[0] + '#/photo/' + set[i].id;
      let ok = false;
      try { await navigator.clipboard.writeText(url); ok = true; } catch {
        const ta = Object.assign(document.createElement('textarea'), { value: url });
        document.body.append(ta);
        ta.select();
        try { ok = document.execCommand('copy'); } catch { ok = false; }
        ta.remove();
      }
      toast(ok ? 'Link copied' : 'Could not copy link');
    }

    $('.lb-prev', lb).addEventListener('click', () => render(i - 1));
    $('.lb-next', lb).addEventListener('click', () => render(i + 1));
    $('.lb-close', lb).addEventListener('click', close);
    $('.lb-play', lb).addEventListener('click', () => setPlaying(!playing));
    $('.lb-share', lb).addEventListener('click', share);
    $('.lb-grid', lb).addEventListener('click', (e) => { lb.classList.toggle('show-strip'); e.currentTarget.classList.toggle('is-on'); });
    $('.lb-full', lb).addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else if (lb.requestFullscreen) lb.requestFullscreen().catch(() => {});
    });
    strip.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) render(+b.dataset.n); });
    $('.lb-bg', lb).addEventListener('click', close);
    $('.lb-stage', lb).addEventListener('click', (e) => { if (e.target === e.currentTarget || e.target === fig) close(); });

    // Zoom
    img.addEventListener('click', (e) => {
      if (moved) return;
      const z = fig.classList.toggle('is-zoomed');
      if (z) pan(e); else img.style.transform = '';
      if (z && playing) setPlaying(false);
    });
    const pan = (e) => {
      const r = img.getBoundingClientRect();
      const ox = ((e.clientX - r.left) / r.width) * 100;
      const oy = ((e.clientY - r.top) / r.height) * 100;
      img.style.transformOrigin = `${ox}% ${oy}%`;
      img.style.transform = 'scale(2.2)';
    };
    fig.addEventListener('mousemove', (e) => { if (fig.classList.contains('is-zoomed')) pan(e); });

    // Swipe
    let sx = 0, sy = 0, moved = false, down = false;
    const stage = $('.lb-stage', lb);
    stage.addEventListener('pointerdown', (e) => { down = true; moved = false; sx = e.clientX; sy = e.clientY; });
    stage.addEventListener('pointermove', (e) => { if (down && Math.abs(e.clientX - sx) > 10) moved = true; });
    stage.addEventListener('pointerup', (e) => {
      down = false;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!fig.classList.contains('is-zoomed') && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) render(i + (dx < 0 ? 1 : -1));
      setTimeout(() => { moved = false; }, 0);
    });

    document.addEventListener('keydown', (e) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight') render(i + 1);
      else if (e.key === 'ArrowLeft') render(i - 1);
      else if (e.key === 'Escape') { if (fig.classList.contains('is-zoomed')) { fig.classList.remove('is-zoomed'); img.style.transform = ''; } else close(); }
      else if (e.key === ' ') { e.preventDefault(); setPlaying(!playing); }
      else if (e.key.toLowerCase() === 'f') $('.lb-full', lb).click();
      else if (e.key.toLowerCase() === 'g') $('.lb-grid', lb).click();
      else if (e.key.toLowerCase() === 'i') setInfo(!showInfo);
      else return;
    });

    return { open, close };
  })();

  let toastTimer = 0;
  function toast(msg) {
    const t = $('.toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-on'), 2200);
  }

  // Hooks for chat.js
  window.portfolio = {
    openPhoto(id) {
      const i = P.findIndex((p) => p.id === id);
      if (i >= 0) lightbox.open(P, i);
    },
    placeOf,
    fmtDate,
  };

  /* ---------- Boot ---------- */
  initHero();
  initStats();
  initTrips();
  initAtlas();
  initMenu();
  initPortfolio();
  initJournal();
  initScroll();
  initCursor();
  route();
})();
