// Chat assistant. Answers from the site's own content, or streams answers from
// Claude through the proxy in chat-worker/ when SITE.chat.endpoint is set.
(() => {
  'use strict';

  const S = window.SITE;
  const P = window.PHOTOS || [];
  const cfg = S.chat || {};
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const portfolio = () => window.portfolio || {};
  const placeOf = (p) => (portfolio().placeOf ? portfolio().placeOf(p) : '');
  const trips = (S.trips || []).filter((t) => S.collections.some((c) => c.trip === t.id));
  const tripOf = (c) => trips.find((t) => t.id === c.trip);
  const photosIn = (cid) => P.filter((p) => p.collection === cid);
  const MAX_TURNS = 12;

  /* ---------- Widget ---------- */
  document.body.insertAdjacentHTML('beforeend', `
    <button class="chat-fab" aria-label="Open chat" aria-expanded="false" data-cursor>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="9" cy="10.5" r="1"/><circle cx="12" cy="10.5" r="1"/><circle cx="15" cy="10.5" r="1"/></svg>
      <span>Ask</span>
    </button>
    <section class="chat" role="dialog" aria-label="Chat assistant" hidden>
      <header class="chat-head">
        <div>
          <p class="chat-title">${esc(S.name)} assistant</p>
          <p class="chat-sub">${cfg.endpoint ? 'AI answers about the trips and photos' : 'Answers about the trips and photos'}</p>
        </div>
        <button class="chat-close" aria-label="Close chat" data-cursor>
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.6"/></svg>
        </button>
      </header>
      <div class="chat-log" aria-live="polite"></div>
      <div class="chat-chips"></div>
      <form class="chat-form">
        <input class="chat-input" type="text" maxlength="500" placeholder="Ask about a trip, place or photo..." aria-label="Your question" autocomplete="off">
        <button class="chat-send" type="submit" aria-label="Send" data-cursor>
          <svg viewBox="0 0 24 24"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
        </button>
      </form>
    </section>`);

  const fab = $('.chat-fab');
  const panel = $('.chat');
  const log = $('.chat-log');
  const chips = $('.chat-chips');
  const form = $('.chat-form');
  const input = $('.chat-input');
  const history = []; // {role, content} for the AI proxy
  let busy = false;
  let greeted = false;

  const setOpen = (open) => {
    panel.hidden = !open;
    requestAnimationFrame(() => panel.classList.toggle('is-open', open));
    fab.classList.toggle('is-hidden', open);
    fab.setAttribute('aria-expanded', open);
    document.body.classList.toggle('chat-open', open);
    if (open) {
      if (!greeted) {
        greeted = true;
        addBot(cfg.greeting || 'Hi! Ask me anything about these trips and photos.');
        showChips(cfg.suggestions || []);
      }
      setTimeout(() => input.focus(), 250);
    }
  };
  fab.addEventListener('click', () => setOpen(true));
  $('.chat-close').addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden && !document.querySelector('.lb.is-open')) setOpen(false);
  });

  function showChips(list) {
    chips.innerHTML = list.map((q) => `<button type="button" data-cursor>${esc(q)}</button>`).join('');
  }
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) ask(b.textContent);
  });

  // Links inside answers: site routes navigate (closing the panel on small screens), photos open the lightbox
  log.addEventListener('click', (e) => {
    const photo = e.target.closest('[data-photo], a[href^="#/photo/"]');
    if (photo) {
      e.preventDefault();
      const id = photo.dataset.photo || photo.getAttribute('href').slice('#/photo/'.length);
      portfolio().openPhoto && portfolio().openPhoto(id);
      return;
    }
    const a = e.target.closest('a[href^="#/"]');
    if (a && innerWidth < 760) setOpen(false);
  });

  /* ---------- Rendering ---------- */
  // Minimal, safe markdown: escapes everything, then allows **bold**, [links](...) to
  // site routes / https / mailto, bullet lists and paragraphs.
  function md(text) {
    const inline = (s) => esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(((?:#\/|https:\/\/|mailto:)[^)\s]+)\)/g, (m, label, href) => {
        const ext = href.startsWith('https://');
        return `<a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
      });
    const blocks = String(text).trim().split(/\n{2,}/);
    return blocks.map((b) => {
      const lines = b.split('\n');
      if (lines.every((l) => /^\s*[-*] /.test(l))) {
        return '<ul>' + lines.map((l) => `<li>${inline(l.replace(/^\s*[-*] /, ''))}</li>`).join('') + '</ul>';
      }
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    }).join('');
  }

  function bubble(role, html) {
    const el = document.createElement('div');
    el.className = `chat-msg chat-${role}`;
    el.innerHTML = html;
    log.append(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }
  const addUser = (text) => bubble('user', `<p>${esc(text)}</p>`);
  function addBot(text, photos = []) {
    const el = bubble('bot', md(text) + thumbs(photos));
    return el;
  }
  function thumbs(photos) {
    if (!photos.length) return '';
    return '<div class="chat-thumbs">' + photos.slice(0, 6).map((p) =>
      `<button type="button" data-photo="${p.id}" aria-label="Open ${esc(p.title)}" data-cursor="View"><img src="images/thumb/${p.id}.jpg" alt="" loading="lazy"><span>${esc(p.title)}</span></button>`
    ).join('') + '</div>';
  }
  const typing = () => bubble('bot chat-typing', '<span></span><span></span><span></span>');

  /* ---------- Asking ---------- */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q) ask(q);
  });

  async function ask(q) {
    if (busy) return;
    busy = true;
    input.value = '';
    chips.innerHTML = '';
    addUser(q);
    const dots = typing();
    try {
      if (cfg.endpoint) {
        await askClaude(q, dots);
      } else {
        await new Promise((r) => setTimeout(r, 450));
        dots.remove();
        const a = localAnswer(q);
        addBot(a.text, a.photos);
        showChips(a.followUps || []);
      }
    } finally {
      busy = false;
      input.focus();
    }
  }

  // Streams an answer from the proxy; falls back to the local answer on any failure.
  async function askClaude(q, dots) {
    history.push({ role: 'user', content: q });
    let el = null, text = '';
    try {
      const res = await fetch(cfg.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-MAX_TURNS * 2), context: siteContext() }),
      });
      if (!res.ok || !res.body) throw new Error('HTTP ' + res.status);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '', failed = null;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let cut;
        while ((cut = buf.indexOf('\n\n')) >= 0) {
          const line = buf.slice(0, cut).replace(/^data: /, '');
          buf = buf.slice(cut + 2);
          if (!line) continue;
          const msg = JSON.parse(line);
          if (msg.t) {
            if (!el) { dots.remove(); el = bubble('bot', ''); }
            text += msg.t;
            el.innerHTML = md(text);
            log.scrollTop = log.scrollHeight;
          } else if (msg.refusal) {
            text = "Sorry, I can't help with that one. Ask me about the trips, places or photos instead.";
          } else if (msg.error) {
            failed = msg.error;
          }
        }
      }
      if (failed && !text) throw new Error(failed);
      if (!el) { dots.remove(); el = bubble('bot', ''); }
      el.innerHTML = md(text) + thumbs(mentionedPhotos(text));
      history.push({ role: 'assistant', content: text });
    } catch (err) {
      history.pop();
      dots.remove();
      if (el) el.remove();
      const a = localAnswer(q);
      addBot(a.text, a.photos);
      showChips(a.followUps || []);
    }
  }

  // Photos the AI linked to as [title](#/photo/id) get thumbnails under the answer
  function mentionedPhotos(text) {
    const ids = [...String(text).matchAll(/#\/photo\/([\w-]+)/g)].map((m) => m[1]);
    return [...new Set(ids)].map((id) => P.find((p) => p.id === id)).filter(Boolean);
  }

  // Compact description of the site for the AI; links use the site's own routes.
  function siteContext() {
    const lines = [
      `Site: ${S.name} (${S.tagline}). Photographer contact email: ${S.email}.`,
      `About: ${S.about}`,
      S.gear && `Camera: ${S.gear}. Editing: ${S.editing}.`,
      S.usage && `Using or buying photos: ${S.usage}`,
      '', 'TRIPS AND DESTINATIONS',
    ];
    trips.forEach((t) => {
      lines.push(`Trip: ${t.label || t.title}, ${t.dates}. ${t.blurb} Link: #/trip/${t.id}`);
      S.collections.filter((c) => c.trip === t.id).forEach((c) => {
        lines.push(`  Destination: ${c.title} (${c.native}), ${c.dates}, ${photosIn(c.id).length} photos. ${c.blurb} Link: #/collection/${c.id}`);
      });
    });
    lines.push('', 'JOURNAL STORIES');
    (S.journal || []).forEach((j) => lines.push(`${j.title} (${j.date}): ${j.excerpt} Link: #/journal/${j.id}`));
    lines.push('', 'PHOTOS (title | caption | place | date and time | camera settings | link)');
    P.forEach((p) => {
      const e = p.exif || {};
      const cam = [e.camera, e.lens, e.focal35 && `${e.focal35}mm equiv.`, e.aperture, e.shutter, e.iso && `ISO ${e.iso}`].filter(Boolean).join(', ');
      lines.push(`${p.title} | ${p.caption} | ${placeOf(p)} | ${(p.date || '').replace('T', ' ').slice(0, 16)} | ${cam || 'not recorded'} | #/photo/${p.id}`);
    });
    return lines.filter((l) => l !== false && l != null).join('\n');
  }

  /* ---------- Local answers (no AI) ---------- */
  const STOP = new Set('a an and are about any at be by can could did do does for from have how i in is it me my of on or show some tell that the their there this to was what when where which who why with you your photos photo pictures picture pics shots shot images any'.split(' '));
  const words = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  const link = (label, href) => `[${label}](${href})`;
  // Full names plus each side of "Kyoto & Nara"; Chinese/Japanese names count from 2 characters
  const destNames = (c) => [c.title, c.native, ...c.title.split(/\s*&\s*/)]
    .map((s) => s.toLowerCase())
    .filter((s) => s.length > 2 || /[^\x00-\x7f]/.test(s) && s.length > 1);

  function scorePhotos(terms) {
    return P.map((p) => {
      const hay = words(`${p.title} ${p.caption} ${placeOf(p)}`);
      let s = 0;
      terms.forEach((t) => {
        if (hay.includes(t)) s += 2;
        else if (t.length > 3 && hay.some((h) => h.startsWith(t.slice(0, -1)))) s += 1;
      });
      return [s, p];
    }).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]).map(([, p]) => p);
  }

  function localAnswer(q) {
    const raw = q.toLowerCase();
    const terms = words(q).filter((w) => !STOP.has(w));
    const tripList = trips.map((t) => `- ${link(t.label || t.title, `#/trip/${t.id}`)}: ${t.blurb}`).join('\n');
    const mail = link(S.email, `mailto:${S.email}`);
    const has = (re) => re.test(raw);

    if (has(/^\s*(hi|hello|hey|yo|hiya|good (morning|afternoon|evening))\b/) && terms.length <= 2) {
      return { text: cfg.greeting || 'Hi!', followUps: cfg.suggestions };
    }
    if (has(/\b(contact|email|e-mail|reach|hire|book|commission|collab|work with|get in touch|message)\b/)) {
      return { text: `The best way to get in touch is by email: ${mail}.`, followUps: ['Can I use your photos?', 'Where have you travelled?'] };
    }
    if (has(/\b(print|prints|buy|purchase|licen[cs]e|licensing|use (your|a|the|one)|copyright|permission|download|wallpaper)\b/)) {
      return { text: `${S.usage || 'Get in touch by email.'}\n\nEmail: ${mail}` };
    }
    if (has(/\b(camera|gear|lens|lenses|equipment|shoot(ing)? (on|with)|fuji|fujifilm|kit)\b/)) {
      return { text: `These photos were shot on a **${S.gear}**${S.editing ? ` and edited in **${S.editing}**` : ''}.`, followUps: ['How do you edit your photos?', 'Show me night shots'] };
    }
    if (has(/\b(edit|editing|lightroom|preset|presets|process|post-?processing|colou?r grad)/)) {
      return { text: `The photos are edited in **${S.editing}**: exposure, highlights and shadows, colour and a little sharpening, keeping the look natural.` };
    }
    if (has(/\b(who are you|about (you|the photographer)|who took|photographer|your name)\b/)) {
      return { text: `${S.about}\n\n${link('More about me', '#/about')}` };
    }
    if (has(/\bhow many\b/)) {
      const days = new Set(P.map((p) => p.date && p.date.slice(0, 10)).filter(Boolean)).size;
      return { text: `There are **${P.length} photographs** from **${trips.length} trips** to **${new Set(trips.map((t) => t.country)).size} countries**, covering ${S.collections.length} destinations over ${days} days on the road.` };
    }

    // A trip or destination by name
    const dest = S.collections.find((c) => destNames(c).some((n) => raw.includes(n)));
    const trip = !dest && trips.filter((t) => raw.includes(t.title.toLowerCase()) || raw.includes(t.native));
    if (dest) {
      const t = tripOf(dest);
      const ph = photosIn(dest.id);
      const keyword = terms.filter((w) => !destNames(dest).includes(w));
      const pick = keyword.length ? scorePhotos(keyword).filter((p) => p.collection === dest.id) : [];
      return {
        text: `**${dest.title}** (${dest.native}) was part of the ${t ? link(t.label || t.title, `#/trip/${t.id}`) : ''} trip, ${dest.dates}. ${dest.blurb}\n\n${link(`See all ${ph.length} photos from ${dest.title}`, `#/collection/${dest.id}`)}`,
        photos: (pick.length ? pick : ph).slice(0, 6),
        followUps: ['Where have you travelled?', 'What camera do you use?'],
      };
    }
    if (trip && trip.length) {
      return {
        text: trip.map((t) => {
          const list = S.collections.filter((c) => c.trip === t.id).map((c) => link(c.title, `#/collection/${c.id}`)).join(', ');
          return `**${t.label || t.title}** (${t.dates}): ${t.blurb}\n\nDestinations: ${list}.`;
        }).join('\n\n'),
        photos: trip.flatMap((t) => [t.cover]).map((id) => P.find((p) => p.id === id)).filter(Boolean),
      };
    }
    if (has(/\b(where|trips?|travel(led|ed)?|countries|been|destinations|places|visited|itinerary)\b/)) {
      return { text: `So far there are ${trips.length} trips on the site:\n\n${tripList}`, followUps: trips.map((t) => `Tell me about ${t.title} ${t.dates.split(' ').pop()}`).slice(0, 3) };
    }
    if (has(/\b(favou?rite|best|recommend|highlight|must see|top)\b/)) {
      const ids = (S.hero && S.hero.slides) || [];
      const photos = ids.map((id) => P.find((p) => p.id === id)).filter(Boolean);
      return { text: 'A few favourites are below; tap one to see it full size. The opening slideshow on the home page shows them too.', photos };
    }
    if (has(/\b(journal|blog|stor(y|ies)|read|article)\b/)) {
      return { text: 'Stories from the road:\n\n' + (S.journal || []).map((j) => `- ${link(j.title, `#/journal/${j.id}`)}`).join('\n') };
    }

    // Anything else: search the photo titles and captions
    const found = terms.length ? scorePhotos(terms) : [];
    if (found.length) {
      return { text: `Here's what I found for "${q}". Tap a photo to open it.`, photos: found.slice(0, 6), followUps: ['Where have you travelled?'] };
    }
    return {
      text: `I'm not sure about that one. I can tell you about the trips, destinations and photos on this site; for anything else, email ${mail}.`,
      followUps: cfg.suggestions,
    };
  }
})();
