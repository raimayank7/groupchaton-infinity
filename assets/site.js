/* GroupChatOn Tools + Help — site script (infinity.groupchaton.com and help.groupchaton.com)
   Designed & Developed by Nivesh Sahayak (https://www.niveshsahayak.in/). All rights reserved: see LICENSE.
   What it does:
   - Pages from GitHub: a Blogger page holds only <div data-gco-page="privacy-policy">short fallback</div>;
     the real content is assets/pages/privacy-policy.html in this repo
   - Light / dark switch, menu, ad slots, sponsored cards, "Ask for a tool" form
   - Tool posts: a post holds <div class="gco-page" data-gco-tool="pdf-merge"> ... </div>; assets/tools/kit.js
     loads that tool's code, the related tools and the tool catalogue */
(function () {
  'use strict';
  var PBASE = (window.GCO || {}).base || '';

  /* scripts added with innerHTML don't run: recreate them one by one, in order */
  function runScripts(box, done) {
    var list = Array.prototype.slice.call(box.querySelectorAll('script'));
    (function next() {
      var old = list.shift();
      if (!old) return done();
      var s = document.createElement('script');
      Array.prototype.forEach.call(old.attributes, function (a) { s.setAttribute(a.name, a.value); });
      if (old.src) { s.onload = s.onerror = next; } else { s.text = old.text; }
      old.parentNode.replaceChild(s, old);
      if (!old.src) next();
    })();
  }

  function loadPages(done) {
    var slots = document.querySelectorAll('[data-gco-page]'), left = slots.length;
    if (!left) return done();
    Array.prototype.forEach.call(slots, function (el) {
      el.classList.add('is-loading');   // shimmer skeleton (site.css) until the content arrives
      fetch(PBASE + 'assets/pages/' + el.getAttribute('data-gco-page') + '.html', { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(function (html) {
          el.innerHTML = html;
          el.classList.add('is-loaded');   // sections fade up one after another
          return new Promise(function (res) { runScripts(el, res); });
        })
        .catch(function () {})   // keep the fallback text from the Blogger page
        .then(function () { el.classList.remove('is-loading'); if (--left === 0) done(); });
    });
  }

  function siteMain() {
  var C = window.GCO || {};
  var BASE = C.base || '';
  var doc = document, html = doc.documentElement, body = doc.body;
  var PATH = location.pathname.replace(/\/+$/, '') || '/';

  /* ---------- small helpers ---------- */
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function el(tag, attrs, kids) {
    var n = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return n;
  }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  function icon(d) { return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>'; }
  var ICON_X = '<path d="M6 6l12 12M18 6 6 18"/>';

  /* ---------- light / dark ('auto' follows the device) ---------- */
  var darkMQ = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  var theme = store.get('gct-theme', C.defaultTheme || 'auto');   // infinity starts dark; help follows the device
  function applyTheme() {
    var t = theme === 'auto' ? (darkMQ && darkMQ.matches ? 'dark' : 'light') : theme;
    html.setAttribute('data-theme', t);
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(body).backgroundColor);
  }
  if (darkMQ && darkMQ.addEventListener) darkMQ.addEventListener('change', function () { if (theme === 'auto') applyTheme(); });
  applyTheme();
  $$('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      theme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      store.set('gct-theme', theme);
      applyTheme();
    });
  });

  /* ---------- sheets (the "Ask for a tool" form on phones) ---------- */
  var backdrop = el('div', { 'class': 'sheet-backdrop', onclick: closeSheets });
  body.appendChild(backdrop);
  function makeSheet(id, title) {
    var s = el('section', { 'class': 'sheet', id: id, role: 'dialog', 'aria-modal': 'true', 'aria-label': title, tabindex: '-1' }, [
      el('div', { 'class': 'sheet-head' }, [
        el('h2', { text: title }),
        el('button', { type: 'button', 'class': 'icon-btn', 'aria-label': 'Close', html: icon(ICON_X), onclick: closeSheets })
      ]),
      el('div', { 'class': 'sheet-body' })
    ]);
    body.appendChild(s);
    return s;
  }
  var lastFocus;
  function openSheet(s) {
    closeSheets();
    lastFocus = doc.activeElement;
    s.classList.add('is-open');
    backdrop.classList.add('is-open');
    s.focus();
  }
  function closeSheets() {
    var open = $$('.sheet.is-open');
    open.forEach(function (s) { s.classList.remove('is-open'); });
    backdrop.classList.remove('is-open');
    if (open.length && lastFocus && lastFocus.focus) lastFocus.focus();
  }
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheets(); });

  /* ---------- header: menu + hide while scrolling down ---------- */
  var header = $('.site-header'), nav = $('#nav'), menuBtn = $('#menuToggle');
  if (menuBtn && nav) menuBtn.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  var lastY = window.scrollY;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (header && !(nav && nav.classList.contains('is-open'))) {
      if (y > lastY + 6 && y > 240) header.classList.add('is-hidden');
      else if (y < lastY - 6 || y < 120) header.classList.remove('is-hidden');
    }
    lastY = y;
  }, { passive: true });
  // the menu link for this page's category stays highlighted
  $$('#nav a').forEach(function (a) { if (a.getAttribute('href') === PATH || (PATH !== '/' && decodeURIComponent(PATH) === decodeURIComponent(a.getAttribute('href')))) a.setAttribute('aria-current', 'page'); });
  $$('[data-year]').forEach(function (n) { n.textContent = new Date().getFullYear(); });

  /* ======================================================================
     Ads: slots are filled only when they come near the screen
     ====================================================================== */
  var A = C.ads || {};
  var adsBlocked = false;
  var adObserver = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { adObserver.unobserve(e.target); fillAd(e.target); } });
  }, { rootMargin: '600px 0px' }) : null;
  function adSlot(kind, slotId) {
    if (!C.adClient || !slotId) return null;
    var d = el('div', { 'class': 'ad-slot ' + kind, 'data-slot': slotId, 'data-kind': kind });
    if (adsBlocked) return pickFor(kind) || d;   // .no-ads hides d
    if (adObserver) adObserver.observe(d); else setTimeout(function () { fillAd(d); }, 0);
    return d;
  }
  function fillAd(d) {
    var ins = el('ins', { 'class': 'adsbygoogle', 'data-ad-client': C.adClient, 'data-ad-slot': d.getAttribute('data-slot') });
    var kind = d.getAttribute('data-kind');
    if (kind === 'in-article') { ins.setAttribute('data-ad-layout', 'in-article'); ins.setAttribute('data-ad-format', 'fluid'); ins.style.textAlign = 'center'; }
    else if (kind === 'multiplex') ins.setAttribute('data-ad-format', 'autorelaxed');
    else ins.setAttribute('data-ad-format', 'auto');
    if (kind !== 'in-article' && kind !== 'multiplex') ins.setAttribute('data-full-width-responsive', 'false');
    ins.style.display = 'block';
    d.appendChild(ins);
    // when Google has no ad for it, a sponsored card takes the slot, or it collapses
    if (window.MutationObserver) new MutationObserver(function (m, o) {
      var st = ins.getAttribute('data-ad-status');
      if (st === 'unfilled') { if (!pickInto(d)) d.classList.add('is-empty'); o.disconnect(); }
      else if (st === 'filled') o.disconnect();
    }).observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  }
  C.adSlot = adSlot;   // kit.js puts one between the tool and its guide
  if (C.adClient) {
    var anchorChecks = 0, anchorTimer = setInterval(function () {
      var a = doc.querySelector('ins.adsbygoogle[data-anchor-status="displayed"], ins.adsbygoogle[data-anchor-shown="true"]');
      html.classList.toggle('has-anchor', !!(a && a.getBoundingClientRect().top > window.innerHeight / 2));
      if (++anchorChecks > 40) clearInterval(anchorTimer);
    }, 1500);
  }

  /* ======================================================================
     Sponsored cards: your own promo cards from the hidden "Sponsored cards" gadget (theme.xml).
     They take ad spaces Google leaves empty or an ad blocker hides, never more than C.picksMax
     on a page. Cards for Indian offers show only to visitors in India.
     ====================================================================== */
  var INDIA_OFFER = /phon\.pe|phonepe\.com|gpay\.app|pay\.google\.com|airtel\.in|buildwealth\.in|₹/i;
  var picks = (function () {
    var src = $('#picks-src'), box = src && ($('.widget-content', src) || src), code = box ? box.innerHTML.trim() : '';
    if (src) src.parentNode.removeChild(src);
    if (!code) return [];
    var t = doc.createElement('template');   // a template, so no banner loads until its card is shown
    t.innerHTML = code;
    var kids = [].slice.call(t.content.children);
    if (!kids.length || !kids.every(function (k) { return k.tagName === 'DIV'; })) {
      var one = doc.createElement('div');
      one.appendChild(t.content);
      kids = [one];
    }
    var india = false;
    try { india = /^Asia\/(Kolkata|Calcutta)$/.test(Intl.DateTimeFormat().resolvedOptions().timeZone); } catch (e) {}
    return kids.filter(function (k) {
      var only = (k.getAttribute('data-only') || '').toLowerCase();
      return india || !(only ? only === 'in' : INDIA_OFFER.test(k.innerHTML));
    });
  })();
  // ad blockers hide well-known names like promo-banner and cta-btn, so the cards are renamed
  var PICK_CLASS = { 'promo-banner': 'pk-img', 'promo-ic': 'pk-ic', 'promo-title': 'pk-title', 'promo-line': 'pk-line', 'cta-btn': 'pk-btn' };
  var picksMax = C.picksMax == null ? 2 : C.picksMax, picksShown = 0;
  var pickTurn = Math.floor(Math.random() * Math.max(picks.length, 1));
  function pickCard(where) {
    if (!picks.length || picksShown >= Math.min(picksMax, picks.length)) return null;
    var card = picks[pickTurn++ % picks.length].cloneNode(true);
    picksShown++;
    $$('[class]', card).forEach(function (n) {
      n.setAttribute('class', n.getAttribute('class').split(/\s+/).map(function (c) { return PICK_CLASS[c] || c; }).join(' '));
    });
    var imgs = $$('img.pk-img', card);
    if (imgs.length > 1) {
      var keep = Math.floor(Math.random() * imgs.length);
      imgs.forEach(function (img, i) { if (i !== keep) { var a = img.closest('a') || img; a.parentNode.removeChild(a); } });
    }
    var d = el('div', { 'class': 'pick pick-' + where, 'data-label': card.getAttribute('data-label') || 'Sponsored' });
    while (card.firstChild) d.appendChild(card.firstChild);
    return d;
  }
  function pickFor(kind) { return kind === 'in-article' || kind === 'ad-end' ? pickCard(kind) : null; }
  function pickInto(slot) {
    if (!slot.parentNode) return false;
    var card = pickFor(slot.getAttribute('data-kind'));
    if (!card) return false;
    if (adObserver) adObserver.unobserve(slot);
    slot.parentNode.replaceChild(card, slot);
    return true;
  }

  /* ======================================================================
     "Ask for a tool" and "Contact support": send through Blogger's own contact form (hidden on every
     page), so messages reach your email. Shown inside the page ([data-tool-request] / [data-help-request]),
     and as a pop-up from any [data-feedback] link (data-feedback="help" for support).
     ====================================================================== */
  var CF = {
    name: $('.contact-form-name'), email: $('.contact-form-email'), msg: $('.contact-form-email-message'),
    send: $('.contact-form-button-submit'), ok: $('.contact-form-success-message'), err: $('.contact-form-error-message')
  };
  var hasCF = !!(CF.email && CF.msg && CF.send && CF.ok && CF.err);
  var fbSheet = null, fbBusy = false;
  function field(label, input, hint) {
    return el('label', { 'class': 'fb-field' }, [el('span', { text: label }), input, hint ? el('small', { text: hint }) : null]);
  }
  // 'tool': Ask for a tool (infinity) · 'help': Contact support (help.groupchaton.com)
  var FORMS = {
    tool: { title: 'Ask for a tool', main: 'Which tool would help you?', mainPh: 'e.g. PDF to Word converter', mainErr: 'Tell us which tool you need.',
      note: 'Details (optional)', notePh: 'What should it do? Which file types? Any site you use for it now?',
      privacy: 'We only use your email to tell you when the tool is ready.', send: 'Send my request', subject: '[Tool request] ',
      ok: 'Thanks! Your request is in. We’ll email you when the tool is ready.' },
    help: { title: 'Contact support', main: 'What went wrong?', mainPh: 'e.g. The chapter list does not open', mainErr: 'Tell us briefly what went wrong.',
      topics: ['Reading a novel', 'Comments', 'A free tool', 'Something else'],
      note: 'Details (optional)', notePh: 'The page link, what you tried, and your phone or computer and browser (e.g. Android, Chrome).',
      privacy: 'We only use your email to reply to you.', send: 'Send to support', subject: '[Help] ',
      ok: 'Thanks! We got your message and will reply by email.' }
  };
  function requestForm(onSent, mode) {
    var M = FORMS[mode] || FORMS.tool;
    var me = store.get('gct-contact', {});
    var form = el('form', { 'class': 'fb-form', novalidate: 'novalidate' }), f = {};
    if (M.topics) {
      f.topic = el('select', {}, M.topics.map(function (t) { return el('option', { text: t }); }));
      form.appendChild(field('It is about', f.topic));
    }
    f.tool = el('input', { type: 'text', maxlength: '200', required: 'required', placeholder: M.mainPh });
    form.appendChild(field(M.main, f.tool));
    f.note = el('textarea', { rows: '4', maxlength: '1200', placeholder: M.notePh });
    form.appendChild(field(M.note, f.note));
    f.name = el('input', { type: 'text', maxlength: '80', autocomplete: 'name' });
    f.name.value = me.name || '';
    f.email = el('input', { type: 'email', maxlength: '120', autocomplete: 'email', required: 'required' });
    f.email.value = me.email || '';
    form.appendChild(el('div', { 'class': 'fb-row' }, [field('Your name (optional)', f.name), field('Your email', f.email)]));
    form.appendChild(el('p', { 'class': 'fb-note', text: M.privacy }));
    var btn = el('button', { type: 'submit', 'class': 'btn btn-primary fb-send', text: M.send });
    var status = el('p', { 'class': 'fb-status', role: 'status', 'aria-live': 'polite' });
    form.appendChild(btn);
    form.appendChild(status);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (fbBusy) return;
      function fail(msg, input) { status.className = 'fb-status is-error'; status.textContent = msg; if (input) input.focus(); }
      if (!f.tool.value.trim()) return fail(M.mainErr, f.tool);
      var email = f.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Add a valid email so we can reply.', f.email);
      if (!hasCF) return fail('The form could not load. Please try again in a moment.');
      store.set('gct-contact', { name: f.name.value.trim(), email: email });
      fbBusy = true;
      btn.disabled = true;
      status.className = 'fb-status';
      status.textContent = 'Sending…';
      if (CF.name) CF.name.value = f.name.value.trim();
      CF.email.value = email;
      CF.msg.value = [M.subject + (f.topic ? f.topic.value + ': ' : '') + f.tool.value.trim(), 'From: ' + location.href, '', 'Details: ' + (f.note.value.trim() || '-')].join('\n');
      CF.ok.textContent = '';
      CF.err.textContent = '';
      var started = Date.now();
      var timer = setInterval(function () {
        var ok = CF.ok.textContent.trim(), err = CF.err.textContent.trim();
        if (ok) {
          done();
          status.className = 'fb-status is-ok';
          status.textContent = M.ok;
          f.tool.value = '';
          f.note.value = '';
          if (onSent) onSent();
        } else if (err) { done(); fail(err); }
        else if (Date.now() - started > 15000) { done(); fail('Couldn’t send just now. Please try again in a minute.'); }
      }, 300);
      function done() { clearInterval(timer); fbBusy = false; btn.disabled = false; }
      CF.send.click();
    });
    return { form: form, first: f.tool };
  }
  // the Ask for a Tool / Contact support pages: the form sits in the page
  $$('[data-tool-request]').forEach(function (box) { box.innerHTML = ''; box.appendChild(requestForm(null, 'tool').form); });
  $$('[data-help-request]').forEach(function (box) { box.innerHTML = ''; box.appendChild(requestForm(null, 'help').form); });
  // anywhere else: a pop-up
  doc.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-feedback]');
    if (!t || !hasCF) return;
    e.preventDefault();
    if (nav) nav.classList.remove('is-open');
    var mode = t.getAttribute('data-feedback') === 'help' ? 'help' : 'tool';
    if (!fbSheet) fbSheet = makeSheet('ask-form', '');
    $('.sheet-head h2', fbSheet).textContent = FORMS[mode].title;
    fbSheet.setAttribute('aria-label', FORMS[mode].title);
    var b = $('.sheet-body', fbSheet), r = requestForm(function () { setTimeout(closeSheets, 2200); }, mode);
    b.innerHTML = '';
    b.appendChild(r.form);
    openSheet(fbSheet);
    setTimeout(function () { r.first.focus(); }, 260);
  });

  /* ======================================================================
     Page types
     ====================================================================== */
  var article = $('article.post');
  var ORIGIN = location.origin;
  function addJsonLd(graph) {
    doc.head.appendChild(el('script', { type: 'application/ld+json', text: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }) }));
  }
  // breadcrumbs for search engines: Home › Category › Tool
  if (article) {
    var title = ($('.post-title', article) || {}).textContent || doc.title;
    var cat = $('.post-labels a', article), items = [[C.homeName || 'Tools', '/']];
    if (cat) items.push([cat.textContent.trim(), cat.getAttribute('href').replace(ORIGIN, '')]);
    items.push([title.trim(), PATH]);
    addJsonLd([{ '@type': 'BreadcrumbList', itemListElement: items.map(function (it, i) {
      return { '@type': 'ListItem', position: i + 1, name: it[0], item: ORIGIN + it[1] }; }) }]);
    if (cat) { var cr = $('.crumb', article); if (cr) cr.appendChild(el('a', { href: cat.getAttribute('href'), text: cat.textContent.trim() })); }
    var end = adSlot('ad-end', A.end);
    if (end) article.appendChild(end);
  }
  // label and search pages: title from the address
  var listTitle = $('.list-title');
  if (listTitle && body.classList.contains('is-list')) {
    var labelM = PATH.match(/^\/search\/label\/(.+)$/), q = new URLSearchParams(location.search).get('q');
    var noun = C.listNoun || 'tools';   // 'articles' on help.groupchaton.com
    listTitle.textContent = labelM ? decodeURIComponent(labelM[1]).replace(/\+/g, ' ') + ' ' + noun : q ? 'Results for “' + q + '”' : 'All ' + noun;
    listTitle.hidden = false;
  }
  var homeAd = $('#home-ad');
  if (homeAd) { var ha = adSlot('ad-end', A.home); if (ha) homeAd.appendChild(ha); }

  // tools: the kit loads each tool's code only where it is used (posts, home catalogue, related tools)
  if ($('[data-gco-tool]')) doc.body.appendChild(el('script', { src: BASE + 'assets/tools/kit.js?v=' + Math.floor(Date.now() / 6e5), async: 'async' }));

  /* ---------- ad-blocker appeal under the header ---------- */
  window.addEventListener('load', function () {
    if (!C.adClient) return;
    setTimeout(function () {
      if (window.adsbygoogle && window.adsbygoogle.loaded) return;
      html.classList.add('no-ads');   // ads blocked: close up the empty ad boxes, sponsored cards take some of them
      adsBlocked = true;
      $$('.ad-slot').forEach(pickInto);
      if (Date.now() < store.get('gct-adnote', 0)) return;
      var bar = el('div', { 'class': 'notice-bar notice-ads', role: 'note' }, [el('div', { 'class': 'container notice-inner' }, [
        el('span', { 'class': 'notice-ic', 'aria-hidden': 'true', text: '💚' }),
        el('div', { 'class': 'notice-text' }, [el('b', { text: C.adNoteTitle || 'Ads keep these tools free' }),
          el('span', { text: C.adNoteText || 'We keep ads light and every tool runs on your own device. Please allow ads on this site.' })]),
        el('button', { type: 'button', 'class': 'icon-btn', 'aria-label': 'Close', html: icon(ICON_X), onclick: function () {
          store.set('gct-adnote', Date.now() + 7 * 864e5); bar.remove(); } })])]);
      if (header && header.parentNode) header.parentNode.insertBefore(bar, header.nextSibling);
    }, 3500);
  });
  }

  loadPages(siteMain);
})();

/* "Add as a preferred source on Google" (Google Search Top Stories): Google's official button at the top of the footer.
   Docs: developers.google.com/search/docs/appearance/preferred-sources. If Google's script can't load (blocked or offline),
   a plain link to the same Google page is shown instead. */
;(function () {
  function add() {
    var foot = document.querySelector('footer');
    if (!foot || document.querySelector('[google-add-preferred-source-btn]')) return;
    var root = document.documentElement, t = (root.getAttribute('data-theme') || root.className || '') + ' ' + (document.body.className || '');
    var dark = /dark|black/.test(t) || (!/light|sepia/.test(t) && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    var box = document.createElement('div'), btn = document.createElement('div');
    box.className = 'pref-source'; box.style.cssText = 'display:flex;justify-content:center;min-height:40px;padding:0 12px 28px;margin:0 auto 36px;max-width:1200px;' +
      'border-bottom:1px solid color-mix(in srgb,currentColor 14%,transparent)';   // its own band, clear of the link columns
    btn.setAttribute('google-add-preferred-source-btn', ''); btn.setAttribute('data-theme', dark ? 'dark' : 'light');
    box.appendChild(btn); foot.insertBefore(box, foot.firstChild);
    var s = document.createElement('script'); s.async = true; s.src = 'https://news.google.com/swg/js/v1/publisher.js';
    document.head.appendChild(s);
    setTimeout(function () {   // fallback: Google's deep link
      if (btn.childNodes.length) return;
      var a = document.createElement('a');
      a.href = 'https://www.google.com/preferences/source?q=' + encodeURIComponent(location.hostname.replace(/^www\./, ''));
      a.target = '_blank'; a.rel = 'noopener'; a.textContent = '★ Add us as a preferred source on Google';
      a.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border:1px solid currentColor;border-radius:999px;font:600 14px/1.2 system-ui,sans-serif;text-decoration:none;color:inherit;opacity:.85';
      btn.appendChild(a);
    }, 6000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();

/* Header: a compact "Preferred source on Google" button (Google's G; the words show on wide screens). It opens Google's own
   page for adding this site as a preferred source, the deep link Google documents for custom buttons. */
;(function () {
  function add() {
    if (document.querySelector('.pref-src-head')) return;
    var box = document.querySelector('.nav-actions, .ns-actions'), before = null;
    if (box) before = box.querySelector('[aria-label*="dark" i], [aria-label*="light" i]') || box.firstElementChild;
    else { var cta = document.querySelector('header .header-cta'); if (!cta) return; box = cta.parentNode; before = cta; }
    var navLink = !document.querySelector('.nav-actions, .ns-actions') && document.querySelector('header nav a');   // no actions box: match the menu's text colour
    var a = document.createElement('a');
    a.className = 'pref-src-head';
    a.href = 'https://www.google.com/preferences/source?q=' + encodeURIComponent(location.hostname.replace(/^www\./, ''));
    a.target = '_blank'; a.rel = 'noopener';
    a.title = 'Add us as a preferred source on Google'; a.setAttribute('aria-label', a.title);
    a.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true">' +
      '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>' +
      '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>' +
      '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>' +
      '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>' +
      '</svg><span>Preferred source</span>';
    box.insertBefore(a, before);
    if (navLink) a.style.color = getComputedStyle(navLink).color;
    var st = document.createElement('style');
    st.textContent = '.pref-src-head{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-width:38px;height:38px;padding:0 9px;box-sizing:border-box;' +
      'border-radius:999px;border:1px solid color-mix(in srgb,currentColor 22%,transparent);color:inherit;text-decoration:none;font:600 13px/1 system-ui,sans-serif;white-space:nowrap;flex:none}' +
      '.pref-src-head:hover{border-color:color-mix(in srgb,currentColor 45%,transparent)}.pref-src-head svg{width:18px;height:18px;flex:none}' +
      '.pref-src-head span{display:none}@media (min-width:1100px){.pref-src-head{padding:0 13px}.pref-src-head span{display:inline}}';
    document.head.appendChild(st);
    // only where it fits: on a crowded phone header it steps aside (the footer button is still there)
    var header = a.closest('header') || box, t = 0;
    function fit() {
      a.style.display = '';
      if (document.documentElement.scrollWidth > innerWidth + 1 || header.scrollWidth > header.clientWidth + 1 || box.scrollWidth > box.clientWidth + 1) a.style.display = 'none';
    }
    fit(); setTimeout(fit, 1500);
    addEventListener('resize', function () { clearTimeout(t); t = setTimeout(fit, 150); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();

/* Post lists (home "Newest tools", search, labels): each plain title row becomes a tool card with the tool's icon,
   category, one-line description and an Open button, from data/tools.json. Rows shimmer until the details arrive. */
;(function () {
  function go() {
    var rows = Array.prototype.slice.call(document.querySelectorAll('.post-list .post-row'));
    if (!rows.length) return;
    var list = rows[0].parentNode, base = (window.GCO || {}).base || '';
    list.classList.add('is-cards');
    function plain() { list.classList.add('is-plain'); }
    var t = setTimeout(plain, 8000);
    fetch(base + 'data/tools.json?v=' + Math.floor(Date.now() / 6e5), { credentials: 'omit' }).then(function (r) { return r.json(); }).then(function (d) {
      clearTimeout(t);
      var byTitle = {}, bySlug = {}, cats = {};
      (d.categories || []).forEach(function (c) { cats[c.id] = c; });
      (d.tools || []).forEach(function (x) { byTitle[(x.title || '').trim().toLowerCase()] = x; if (x.slug) bySlug[x.slug] = x; });
      rows.forEach(function (row) {
        var a = row.querySelector('h3 a'); if (!a || row.classList.contains('is-rich')) return;
        var slug = (a.pathname.split('/').pop() || '').replace(/\.html$/, '');
        var x = byTitle[a.textContent.trim().toLowerCase()] || bySlug[slug];
        if (!x) { row.classList.add('is-rich', 'no-tool'); return; }
        var c = cats[x.cat] || {};
        row.style.setProperty('--cat', c.color || 'var(--accent)');
        var ic = document.createElement('span'); ic.className = 'row-ic'; ic.setAttribute('aria-hidden', 'true'); ic.textContent = x.icon || c.icon || '•';
        var chip = document.createElement('span'); chip.className = 'row-cat'; chip.textContent = (c.icon ? '' : '') + (c.label || c.name || x.cat || '');
        var desc = document.createElement('p'); desc.className = 'row-desc'; desc.textContent = x.desc || '';
        var go = document.createElement('span'); go.className = 'row-go'; go.setAttribute('aria-hidden', 'true'); go.innerHTML = 'Open <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
        a.textContent = x.name || a.textContent; a.title = x.title || '';
        var text = row.querySelector('.row-text');
        text.insertBefore(chip, text.firstChild); text.appendChild(desc);
        row.insertBefore(ic, row.firstChild); row.appendChild(go);
        row.classList.add('is-rich');
      });
      list.classList.add('is-ready');
    }).catch(function () { clearTimeout(t); plain(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
