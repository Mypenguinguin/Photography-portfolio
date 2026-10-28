(() => {
  'use strict';

  const S = window.SITE;
  const P = window.PHOTOS || [];
  const byId = Object.fromEntries(P.map((p) => [p.id, p]));
  // Destinations and trips without photos yet stay hidden
  S.collections = S.collections.filter((c) => P.some((p) => p.collection === c.id));
  const col = Object.fromEntries(S.collections.map((c) => [c.id, c]));
  const trips = (S.trips || []).filter((t) => S.collections.some((c) => c.trip === t.id));
  const trip = Object.fromEntries(trips.map((t) => [t.id, t]));
  const tripCollections = (tid) => S.collections.filter((c) => c.trip === tid);
  const photosInTrip = (tid) => P.filter((p) => col[p.collection] && col[p.collection].trip === tid);
  const placeOf = (p) => {
    const c = col[p.collection];
    const t = c && trip[c.trip];
    return c ? (t && t.title !== c.title ? `${c.title}, ${t.title}` : c.title) : '';
  };
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
          const k = Math.min(1, (t - t0) / d);
          el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach((el) => io.observe(el));
  }

  /* ---------- Destinations, journey, menu ---------- */
  // Cards for a set of destinations; wide cards first so every row is filled
  function destCards(list) {
    const n = list.length;
    const wide = n === 1 ? 0 : n % 3 === 1 ? Math.min(4, n) : n % 3 === 2 ? 2 : 0;
    return list.map((c, i) => `
      <a class="dest reveal${n === 1 ? ' dest-full' : i < wide ? ' dest-wide' : ''}" href="#/collection/${c.id}" data-cursor="View" style="transition-delay:${(i % 3) * 0.08}s">
        <div class="dest-img" data-bg="${full(c.cover)}" style="background-color:${byId[c.cover] ? byId[c.cover].color : ''}"></div>
        <span class="dest-view">VIEW</span>
        <div class="dest-body">
          <p class="dest-native">${esc(c.native)}</p>
          <h3 class="dest-title">${esc(c.title)}</h3>
          <div class="dest-meta"><span>${photosIn(c.id).length} photos</span><span>${esc(c.dates)}</span></div>
        </div>
      </a>`).join('');
  }

  function renderJourney(tid) {
    const list = tripCollections(tid);
    const j = $('.journey');
    const ol = $('.journey-stops');
    ol.style.gridTemplateColumns = `repeat(${list.length}, 1fr)`;
    const inset = 50 / list.length;
    $('.journey-line').style.left = inset + '%';
    $('.journey-line').style.width = 100 - 2 * inset + '%';
    ol.innerHTML = list.map((c, i) => `
      <li class="stop" style="transition-delay:${0.25 + i * 0.14}s">
        <a href="#/collection/${c.id}" data-cursor="View">
          <span class="stop-date">${esc(c.dates)}</span>
          <span class="stop-dot"></span>
          <span class="stop-thumb"><img src="${thumb(c.cover)}" alt="" loading="lazy"></span>
          <span class="stop-text">
            <span class="stop-name">${esc(c.title)}</span>
            <span class="stop-native">${esc(c.native)}</span>
            <span class="stop-when">${esc(c.dates)}</span>
          </span>
        </a>
      </li>`).join('');
    $$('.journey-tabs button').forEach((b) => b.classList.toggle('is-active', b.dataset.trip === tid));
    if (j.classList.contains('is-in')) {
      j.classList.remove('is-in');
      void j.offsetWidth;
      requestAnimationFrame(() => j.classList.add('is-in'));
    }
  }

  function initDestinations() {
    $('.trips').innerHTML = trips.map((t) => {
      const list = tripCollections(t.id);
      return `
      <div class="trip-group">
        <header class="trip-head reveal">
          <a href="#/trip/${t.id}" data-cursor="View">
            <span class="trip-native">${esc(t.native)}</span>
            <h3 class="trip-title">${esc(t.title)} <em>${esc(t.dates)}</em></h3>
          </a>
          <span class="trip-count">${list.length} destination${list.length === 1 ? '' : 's'} · ${photosInTrip(t.id).length} photos</span>
        </header>
        <div class="destinations">${destCards(list)}</div>
      </div>`;
    }).join('');

    $('.journey-tabs').innerHTML = trips.map((t) => `<button role="tab" data-trip="${t.id}" data-cursor>${esc(t.title)} <small>${esc(t.dates)}</small></button>`).join('');
    $('.journey-tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) renderJourney(b.dataset.trip); });
    if (trips[0]) renderJourney(trips[0].id);

    const links = [
      { href: '#/', label: 'Home', img: S.hero.slides[0] },
      { href: '#/portfolio', label: 'Portfolio', img: S.hero.slides[1] },
      { href: '#/journal', label: 'Journal', img: S.hero.slides[2] },
      { href: '#/about', label: 'About', img: S.aboutPhoto || S.hero.slides[3] },
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
        <div class="tile-cap">${showPlace && col[p.collection] ? `<span>${esc(placeOf(p))}</span>` : ''}<strong>${esc(p.title)}</strong></div>
      </a>`).join('');
    $$('.tile', el).forEach((t) => { t._ar = byId[t.dataset.id].w / byId[t.dataset.id].h; tileIO.observe(t); });
    el._items = items;
    justify(el);
  }
  const ro = new ResizeObserver((entries) => entries.forEach((e) => justify(e.target)));
  $$('.gallery').forEach((g) => { g.classList.add('rows'); ro.observe(g); });

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

  function renderCollection(id) {
    const c = col[id];
    const t = trip[c.trip];
    const items = photosIn(id);
    const v = $('.view-collection');
    renderBanner(v, c, `${items.length} photographs · ${c.dates}`,
      t ? { href: `#/trip/${t.id}`, label: `${t.label || t.title}` } : { href: '#/destinations', label: 'All destinations' });
    $('.trip-dests', v).innerHTML = '';
    renderGallery($('[data-gallery="collection"]', v), items, false);
    $('.pager', v).innerHTML = pager(t ? tripCollections(t.id) : S.collections, c, 'collection', 'destination');
  }

  function renderTrip(id) {
    const t = trip[id];
    const list = tripCollections(id);
    const items = photosInTrip(id);
    const v = $('.view-collection');
    renderBanner(v, t, `${list.length} destinations · ${items.length} photographs · ${t.dates}`, { href: '#/destinations', label: 'All trips' });
    $('.trip-dests', v).innerHTML = `<div class="destinations">${destCards(list)}</div><h2 class="trip-all">All photographs</h2>`;
    renderGallery($('[data-gallery="collection"]', v), items, true);
    $('.pager', v).innerHTML = pager(trips, t, 'trip', 'trip');
  }

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
    else show('home', null, ['destinations', 'portfolio', 'journal', 'about', 'journey'].includes(a) ? a : null);
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
    ['destinations', 'portfolio', 'journal', 'about'].forEach((id) => io.observe(document.getElementById(id)));
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
    const PLAY = 5000;
    let set = [], i = 0, isOpen = false, playing = false, playTimer = 0, lastFocus = null;

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
        img.onload = () => { img.classList.add('is-loaded'); fig.classList.add('loaded'); };
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
      if (location.hash.startsWith('#/photo/')) history.replaceState(null, '', '#/portfolio');
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
  initDestinations();
  initPortfolio();
  initJournal();
  initScroll();
  initCursor();
  route();
})();
