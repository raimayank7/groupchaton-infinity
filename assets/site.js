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
  /* owner rule: the important pages (privacy, disclaimer, terms, contact, about, comment policy, donations, ask for a tool)
     never show ads or sponsor cards. Themes uploaded before this rule still load Google's script, so ad requests are paused too. */
  var NO_ADS = /\/p\/(privacy-policy|disclaimer|terms-of-use|terms|contact-support|contact-us|contact|about-us|about|ask-for-a-tool|comment-policy|donations)\.html$/.test(location.pathname);
  if (NO_ADS) { try { (window.adsbygoogle = window.adsbygoogle || []).pauseAdRequests = 1; } catch (e) {} doc.documentElement.classList.add('no-ads-page'); }
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
    if (open) { var first = nav.querySelector('a'); if (first) setTimeout(function () { first.focus(); }, 30); }   // keyboard users land in the menu
  });
  if (menuBtn && nav) doc.addEventListener('keydown', function (e) {   // Esc closes the ☰ menu
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { nav.classList.remove('is-open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.focus(); }
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
  $$('#nav a').forEach(function (a) {
    var h = (a.getAttribute('href') || '').replace(/\/+$/, '') || '/';
    if (h === PATH || (PATH !== '/' && decodeURIComponent(PATH) === decodeURIComponent(h))) a.setAttribute('aria-current', 'page');
  });
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
    if (NO_ADS) return null;
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
    // when Google has no ad for it ('unfilled', or 'unfill-optimized' in Edge/Firefox), a sponsored card takes the slot, or it collapses
    var settled = false;
    function empty() { if (settled) return; settled = true; if (!pickInto(d)) d.classList.add('is-empty'); }
    if (window.MutationObserver) new MutationObserver(function (m, o) {
      var st = ins.getAttribute('data-ad-status');
      if (/^unfill/.test(st || '')) { empty(); o.disconnect(); }
      else if (st === 'filled') { settled = true; o.disconnect(); }
    }).observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });
    // no real ad after 8 s (ad blocker with a fake ad script, blocked request, slow network): the card takes the space
    setTimeout(function () { if (!settled && ins.getAttribute('data-ad-status') !== 'filled') empty(); }, 8000);
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  }
  /* ad blockers: a bait box with ad-like names; hidden or gone = blocked. Some blockers (uBlock Origin) swap Google's
     script for a stub that claims loaded=true, so adsbygoogle.loaded alone is not enough. */
  function adsLookBlocked() {
    if (!(window.adsbygoogle && window.adsbygoogle.loaded)) return true;
    var b = el('div', { 'class': 'adsbox ad-banner ad-label ad-wide', style: 'position:absolute;left:-9999px;top:0;width:1px;height:1px' });
    b.innerHTML = '&nbsp;';
    body.appendChild(b);
    var cs = getComputedStyle(b), hid = !b.offsetParent || !b.offsetHeight || cs.display === 'none' || cs.visibility === 'hidden';
    b.parentNode.removeChild(b);
    return hid;
  }
  C.adSlot = adSlot;   // kit.js puts one between the tool and its guide

  /* copy text: the Clipboard API first, then the old hidden-textarea way when the browser refuses it
     (Safari, Firefox, frames). Resolves true when it worked, false when the visitor has to copy by hand. */
  C.copy = function (text) {
    function old() {
      var t = el('textarea', { readonly: 'readonly', 'aria-hidden': 'true', style: 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0' });
      t.value = text; body.appendChild(t); t.select();
      var ok = false; try { ok = doc.execCommand('copy'); } catch (e) {}
      body.removeChild(t); return ok;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, old);
    } catch (e) {}
    return Promise.resolve(old());
  };
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
  /* GroupChatOn sites recommend each other (owner, 2026-11-02): cards for our other sites join the sponsored-card
     rotation, labelled "From GroupChatOn"; a site never shows its own card. */
  (function () {
    var host = location.hostname.replace(/^www\./, '');
    var FAMILY = [
      ['infinity.groupchaton.com', 'https://infinity.groupchaton.com/', 'https://assets.infinity.groupchaton.com/assets/brand/favicon-192.png', 'Infinity',
       '609 free tools, no sign-up', 'PDF, image, video, QR and WhatsApp tools that run in your browser. Your files never leave your device.', 'Open the free tools'],
      ['groupchaton.com', 'https://www.groupchaton.com/', 'https://assets.groupchaton.com/assets/brand/favicon-192.png', 'GroupChatOn Novels',
       'Read Korean web novels free', '2,000+ proofread chapters, like Trash of the Count’s Family, with new chapters every week.', 'Start reading'],
      ['share.groupchaton.com', 'https://share.groupchaton.com/', 'https://share.groupchaton.com/brand/favicon-192.png', 'Share',
       'Find WhatsApp groups by topic', '2,400+ groups and channels, each with its own page, safety tips and a report button.', 'Browse groups'],
      ['toolkit.groupchaton.com', 'https://toolkit.groupchaton.com/', 'https://toolkit.groupchaton.com/brand/favicon-192.png', 'Toolkit',
       'Free Excel & Word templates for work', 'GST invoice, stock register, attendance, salary slip and more, plus online tools that print or download in a click.', 'Open Toolkit']
    ];
    FAMILY.forEach(function (f) {
      if (f[0] === host) return;
      var d = doc.createElement('div');
      d.setAttribute('data-label', 'From GroupChatOn');
      d.innerHTML = '<a class="promo-ic is-mark" href="' + f[1] + '" rel="noopener" target="_blank" aria-label="' + f[3] + '"><img src="' + f[2] + '" alt="" width="72" height="72" loading="lazy"></a>' +
        '<b class="promo-title">' + f[4] + '</b><span class="promo-line">' + f[5] + '</span>' +
        '<a class="cta-btn" href="' + f[1] + '" rel="noopener" target="_blank">' + f[6] + ' ↗</a><small>' + f[0].replace(/^groupchaton/, 'www.groupchaton') + '</small>';
      picks.push(d);
    });
  })();
  // ad blockers hide well-known names like promo-banner and cta-btn, so the cards are renamed
  var PICK_CLASS = { 'promo-banner': 'pk-img', 'promo-ic': 'pk-ic', 'promo-title': 'pk-title', 'promo-line': 'pk-line', 'cta-btn': 'pk-btn' };
  var picksMax = C.picksMax == null ? 2 : C.picksMax, picksShown = 0;
  var pickTurn = Math.floor(Math.random() * Math.max(picks.length, 1));
  function pickCard(where) {
    if (NO_ADS) return null;
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
  // static sites (no Blogger contact form): a clear note instead of a form that can't send. GCO.formFallback = { tool: html, help: html }
  var FALLBACK = '<p class="fb-fallback"><b>Our message form is moving to a new home.</b> For now, please use the ' +
    '<a href="https://help.groupchaton.com/p/contact-support.html">Contact support</a> page, and we reply by email.</p>';
  function formBox(box, mode) {
    box.innerHTML = '';
    if (hasCF) box.appendChild(requestForm(null, mode).form);
    else box.innerHTML = (C.formFallback || {})[mode] || FALLBACK;
  }
  $$('[data-tool-request]').forEach(function (box) { formBox(box, 'tool'); });
  $$('[data-help-request]').forEach(function (box) { formBox(box, 'help'); });
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
  var hasCrumbs = $$('script[type="application/ld+json"]').some(function (s) { return /BreadcrumbList/.test(s.textContent); });
  if (article) {
    var title = ($('.post-title', article) || {}).textContent || doc.title;
    var cat = $('.post-labels a', article), items = [[C.homeName || 'Tools', '/']];
    if (cat) items.push([cat.textContent.trim(), cat.getAttribute('href').replace(ORIGIN, '')]);
    items.push([title.trim(), PATH]);
    if (!hasCrumbs) addJsonLd([{ '@type': 'BreadcrumbList', itemListElement: items.map(function (it, i) {
      return { '@type': 'ListItem', position: i + 1, name: it[0], item: ORIGIN + it[1] }; }) }]);
    if (cat) { var cr = $('.crumb', article); if (cr && cr.children.length < 2) cr.appendChild(el('a', { href: cat.getAttribute('href'), text: cat.textContent.trim() })); }
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
  if (homeAd) homeAd.id = 'home-pk';   // ad blockers hide #home-ad, and with it the sponsored card that may take this space
  if (homeAd) { var ha = adSlot('ad-end', A.home); if (ha) homeAd.appendChild(ha); }

  // tools: the kit loads each tool's code only where it is used (posts, home catalogue, related tools)
  if ($('[data-gco-tool]')) doc.body.appendChild(el('script', { src: BASE + 'assets/tools/kit.js?v=' + Math.floor(Date.now() / 6e5), async: 'async' }));

  /* ---------- ad-blocker appeal under the header ---------- */
  window.addEventListener('load', function () {
    if (!C.adClient) return;
    setTimeout(function () {
      if (NO_ADS || !adsLookBlocked()) return;   // pages without ads never ask to allow them
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
    var rows = Array.prototype.slice.call(document.querySelectorAll('.post-list .post-row:not(.is-rich)'));
    if (!rows.length) return;   // static sites write finished cards
    var list = rows[0].parentNode, base = (window.GCO || {}).base || '';
    list.classList.add('is-cards');
    function plain() { list.classList.add('is-plain'); }
    var t = setTimeout(plain, 8000);
    if (/^help\./.test(location.hostname)) return helpCards(rows, list, base, t, plain);
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
  // help.groupchaton.com: each article gets its section's icon (or its tool's icon), the section name and its description
  function helpCards(rows, list, base, t, plain) {
    var v = Math.floor(Date.now() / 6e5), get = function (f) { return fetch(base + 'data/' + f + '?v=' + v, { credentials: 'omit' }).then(function (r) { return r.json(); }); };
    var SEC = { Tools: ['🛠️', '#0D9488'], Reading: ['📖', '#7C3AED'], Comments: ['💬', '#2563EB'], Share: ['👥', '#16A34A'], DeskOrg: ['🗂️', '#8C7BFF'], ShareYourGroup: ['👥', '#16A34A'], Site: ['⚙️', '#D97706'] };
    Promise.all([get('help.json'), get('tools.json').catch(function () { return { tools: [] }; })]).then(function (r) {
      clearTimeout(t);
      var byTitle = {}, tools = (r[1].tools || []).slice().sort(function (a, b) { return b.name.length - a.name.length; });
      r[0].forEach(function (x) { byTitle[x.t.trim().toLowerCase()] = x; });
      rows.forEach(function (row) {
        var a = row.querySelector('h3 a'); if (!a || row.classList.contains('is-rich')) return;
        var x = byTitle[a.textContent.trim().toLowerCase()];
        if (!x) { row.classList.add('is-rich', 'no-tool'); return; }
        var sec = SEC[x.l] || ['❓', '#0D9488'], icon = sec[0];
        if (x.l === 'Tools') {   // "Speech to Text: ..." -> the Speech to Text tool's own icon
          var low = x.t.toLowerCase();
          for (var i = 0; i < tools.length; i++) if (low.indexOf(tools[i].name.toLowerCase()) === 0 || low.indexOf('“' + tools[i].name.toLowerCase()) === 0) { icon = tools[i].icon || icon; break; }
        }
        row.style.setProperty('--cat', sec[1]);
        var ic = document.createElement('span'); ic.className = 'row-ic'; ic.setAttribute('aria-hidden', 'true'); ic.textContent = icon;
        var chip = document.createElement('span'); chip.className = 'row-cat'; chip.textContent = x.l === 'Tools' ? 'Free tools' : x.l === 'Site' ? 'Site and ads' : x.l;
        var desc = document.createElement('p'); desc.className = 'row-desc'; desc.textContent = x.d || '';
        var text = row.querySelector('.row-text'); text.insertBefore(chip, text.firstChild); text.appendChild(desc);
        row.insertBefore(ic, row.firstChild); row.classList.add('is-rich');
      });
      list.classList.add('is-ready');
    }).catch(function () { clearTimeout(t); plain(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();

/* Tab icon: Blogger adds its own /favicon.ico (the orange B) ahead of ours and browsers pick it.
   Drop it and list the Infinity mark in the sizes browsers look for. */
;(function () {
  var b = 'https://assets.infinity.groupchaton.com/assets/brand/', head = document.head;
  var pre = /^help\./.test(location.hostname) ? 'help-' : '';   // Help has its own teal icon
  Array.prototype.slice.call(document.querySelectorAll('link[rel~="icon"]')).forEach(function (l) {
    if (/\/favicon\.ico(\?|$)/.test(l.getAttribute('href') || '') && l.href.indexOf(b) !== 0) l.remove();
  });
  // Help: icons the uploaded theme points at (Infinity's) switch to Help's own
  if (pre) Array.prototype.slice.call(document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]')).forEach(function (l) {
    var h = l.getAttribute('href') || '';
    if (h.indexOf(b) === 0 && h.indexOf('/help-') < 0) l.href = b + (/gco-mark\.svg/.test(h) ? 'help-mark.svg' : 'help-' + h.slice(b.length));
  });
  [['favicon-32.png', '32x32'], ['favicon-48.png', '48x48'], ['favicon-192.png', '192x192']].forEach(function (x) {
    if (head.querySelector('link[rel~="icon"][sizes="' + x[1] + '"]')) return;
    var l = document.createElement('link'); l.rel = 'icon'; l.type = 'image/png'; l.sizes = x[1]; l.href = b + pre + x[0]; head.appendChild(l);
  });
  if (!head.querySelector('link[rel="shortcut icon"]')) { var s = document.createElement('link'); s.rel = 'shortcut icon'; s.href = b + pre + 'favicon.ico'; head.appendChild(s); }
})();
/* Header logo: the wordmark picture with the infinity sign (or Help's question mark) inside the chat bubble, until the theme carries it */
;(function () {
  var a = document.querySelector('.site-header a.brand');
  if (!a || a.querySelector('.brand-logo')) return;
  var u = 'https://assets.infinity.groupchaton.com/assets/brand/', n = /^help\./.test(location.hostname) ? ['help', 436] : ['infinity', 436];
  a.innerHTML = ['light', 'dark'].map(function (t) {
    return '<img alt="" class="brand-logo is-' + t + '" height="100" width="' + n[1] + '" src="' + u + n[0] + '-logo-' + t + '.png">';
  }).join('');
})();

/* Footer policy links (until the themes carry them): Infinity adds Terms of use; Help uses its own Privacy Policy and
   Disclaimer instead of groupchaton.com's, plus the Terms of use */
;(function () {
  var f = document.querySelector('footer'); if (!f) return;
  var help = /^help\./.test(location.hostname);
  if (help) Array.prototype.slice.call(f.querySelectorAll('a[href^="https://www.groupchaton.com/p/privacy-policy"], a[href^="https://www.groupchaton.com/p/disclaimer"]')).forEach(function (a) {
    a.setAttribute('href', a.getAttribute('href').replace('https://www.groupchaton.com', ''));
  });
  if (f.querySelector('a[href*="terms-of-use"]')) return;
  var d = f.querySelector('a[href$="/p/disclaimer.html"]'); if (!d || !d.parentNode) return;
  var li = d.parentNode.cloneNode(false), a = document.createElement('a');
  a.href = (help ? 'https://infinity.groupchaton.com' : '') + '/p/terms-of-use.html'; a.textContent = 'Terms of use';
  li.appendChild(a); d.parentNode.parentNode.insertBefore(li, d.parentNode.nextSibling);
})();

/* help.groupchaton.com: a short intro on each section page, Share (share.groupchaton.com) as a sister-site link, and comments from the
   same Disqus site as groupchaton.com (group4whatsapp), until the uploaded theme carries these */
;(function () {
  if (!/^help\./.test(location.hostname)) return;
  // sister site in the menu, like Novels and Free tools
  // (owner 2026-11-02: the help topic is now "Share"; pages built or uploaded earlier still name the old directory site, so fix them here)
  var nav = document.getElementById('nav');
  [].forEach.call(document.querySelectorAll('a[href*="shareyourgroup.com"]:not([rel~="sponsored"]), a[href*="label/ShareYourGroup"], a[href*="/topics/shareyourgroup"]'), function (a) {
    if (a.closest('#picks-src, .promo, [data-label]')) return;   // sponsored cards keep their own links
    if (/shareyourgroup\.com/i.test(a.href)) { a.href = 'https://share.groupchaton.com/'; a.textContent = 'Share ↗'; return; }
    a.href = '/topics/share/';
    var b = a.querySelector('b'), sm = a.querySelector('small');
    if (b) { b.textContent = 'Share'; if (sm) sm.textContent = 'Adding, finding, joining and reporting WhatsApp groups and channels on Share'; }
    else a.textContent = a.classList.contains('nav-more') ? 'Share help' : 'Share';
  });
  if (nav && !nav.querySelector('a[href^="https://share.groupchaton.com"]')) {   // old markup had no sister-site link of its own
    var sy = document.createElement('a'); sy.href = 'https://share.groupchaton.com/'; sy.textContent = 'Share ↗'; nav.appendChild(sy);
  }
  // comments
  var box = document.querySelector('.help-comments'), btn = box && box.querySelector('[data-load-comments]');
  if (btn) {
    var b2 = btn.cloneNode(true); btn.parentNode.replaceChild(b2, btn);   // drops the old handler that asked the wrong Disqus site
    var CMS = {
      en: ['Loading comments…', 'Comments are open below.', 'Comments could not load. An ad blocker or your browser’s tracking protection may be blocking disqus.com: allow it, then tap Try again.', 'Try again'],
      hi: ['टिप्पणियाँ खुल रही हैं…', 'टिप्पणियाँ नीचे खुल गई हैं।', 'टिप्पणियाँ नहीं खुलीं। हो सकता है ऐड ब्लॉकर या ब्राउज़र disqus.com को रोक रहा हो: उसे अनुमति दें, फिर “फिर से कोशिश करें” दबाएँ।', 'फिर से कोशिश करें'],
      pa: ['ਟਿੱਪਣੀਆਂ ਖੁੱਲ੍ਹ ਰਹੀਆਂ ਹਨ…', 'ਟਿੱਪਣੀਆਂ ਹੇਠਾਂ ਖੁੱਲ੍ਹ ਗਈਆਂ ਹਨ।', 'ਟਿੱਪਣੀਆਂ ਨਹੀਂ ਖੁੱਲ੍ਹੀਆਂ। ਹੋ ਸਕਦਾ ਹੈ ਐਡ ਬਲੌਕਰ ਜਾਂ ਬ੍ਰਾਊਜ਼ਰ disqus.com ਨੂੰ ਰੋਕ ਰਿਹਾ ਹੋਵੇ: ਇਸਨੂੰ ਇਜਾਜ਼ਤ ਦਿਓ, ਫਿਰ “ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ” ਦਬਾਓ।', 'ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ'],
      bho: ['टिप्पणी खुलत बा…', 'टिप्पणी नीचे खुल गइल।', 'टिप्पणी ना खुलल। हो सकेला कि ऐड ब्लॉकर भा ब्राउज़र disqus.com के रोकत होखे: ओकरा के अनुमति दीं, फेर “फेर से कोसिस करीं” दबाईं।', 'फेर से कोसिस करीं']
    };
    var CM = CMS[(document.documentElement.lang || 'en').split('-')[0]] || CMS.en;
    var head = box.querySelector('h2'), thread = document.getElementById('disqus_thread');
    var st = document.createElement('p'); st.className = 'cm-status'; st.setAttribute('role', 'status'); st.setAttribute('aria-live', 'polite');
    b2.parentNode.insertBefore(st, b2.nextSibling);
    if (thread) b2.setAttribute('aria-controls', 'disqus_thread');
    b2.setAttribute('aria-expanded', 'false');
    var loaded = false, waitT = 0;
    function shown() { return !!(thread && thread.querySelector('iframe')); }
    function ok() { if (loaded) return; loaded = true; clearTimeout(waitT); st.className = 'cm-status'; st.textContent = CM[1]; }
    function failed() {
      if (loaded || shown()) return ok();
      st.className = 'cm-status is-error'; st.textContent = CM[2];
      b2.hidden = false; b2.setAttribute('aria-expanded', 'false'); b2.textContent = CM[3];
    }
    if (thread && window.MutationObserver) new MutationObserver(function () { if (shown()) ok(); }).observe(thread, { childList: true, subtree: true });
    b2.addEventListener('click', function () {
      b2.hidden = true; b2.setAttribute('aria-expanded', 'true');
      st.className = 'cm-status'; st.textContent = CM[0];
      if (head) { head.setAttribute('tabindex', '-1'); head.focus(); }   // focus stays in the comments, not lost to the top of the page
      var url = box.getAttribute('data-url'), id = 'help-' + box.getAttribute('data-id');
      window.disqus_config = function () { this.page.url = url; this.page.identifier = id; };
      clearTimeout(waitT); waitT = setTimeout(failed, 15000);
      if (window.DISQUS && window.DISQUS.reset) { try { window.DISQUS.reset({ reload: true, config: window.disqus_config }); } catch (e) {} return; }
      var sc = document.createElement('script'); sc.src = 'https://group4whatsapp.disqus.com/embed.js'; sc.setAttribute('data-timestamp', String(+new Date()));
      sc.onerror = function () { sc.remove(); failed(); };
      document.body.appendChild(sc);
    });
  }
  // section intro
  var m = location.pathname.match(/^\/search\/label\/([^/?#]+)/), list = document.querySelector('.post-list');
  if (!m || !list) return;
  var L = decodeURIComponent(m[1]).replace(/\+/g, ' '); if (L === 'ShareYourGroup') L = 'Share';
  var INTRO = {
    Tools: ['🛠️', 'Step-by-step help for every free tool on Infinity: how to use it, what each option means, and how to fix the error messages people meet most often.',
      ['How to use each tool', 'Error messages explained', 'PDF, image and voice tools', 'Calculators and converters', 'Privacy: files stay on your device']],
    Reading: ['📖', 'Everything about reading novels on GroupChatOn: finding a story, moving between chapters, picking up where you left off and making the page comfortable to read.',
      ['Font, size and theme', 'Continue where you left off', 'Find any chapter', 'New chapter alerts', 'Request a novel', 'Report a typo']],
    Comments: ['💬', 'What to do when comments on a chapter or article do not appear, and how to get the comment box working on your phone or computer.',
      ['Comments not showing', 'Fixes for phone and computer']],
    DeskOrg: ['🗂️', 'Help for DeskOrg, the free Windows desktop organizer: installing it, tidying your desktop with one click, finding moved files, editing rules, automation and uninstalling.',
      ['Install and the Windows warning', 'Organize Now', 'Find moved files', 'Edit rules', 'Smart Automation', 'Uninstall']],
    Share: ['👥', 'Help for Share, our WhatsApp group and channel directory: adding your group or channel, finding and joining safely, reporting a bad listing and fixing problems.',
      ['Add your group or channel', 'Find, save and join', 'Report a listing', 'Describe or categorise a listing', 'Stay safe', 'Groups vs channels']],
    Site: ['⚙️', 'How the GroupChatOn sites work, including why you see ads and how your privacy is protected.',
      ['Why ads appear', 'Privacy and cookies']]
  };
  var it = INTRO[L]; if (!it || document.querySelector('.help-intro')) return;
  var box2 = document.createElement('section'); box2.className = 'help-intro'; box2.setAttribute('aria-label', 'About this section');
  box2.innerHTML = '<span class="help-intro-ic" aria-hidden="true">' + it[0] + '</span><p>' + it[1] + '</p><ul>' +
    it[2].map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
    '<p class="help-intro-foot">Can’t find your answer? <a href="/search">Search all articles</a> or <a href="/p/contact-support.html"><b>contact support</b></a>, and we reply by email.' +
    (L === 'Share' ? ' Visit <a href="https://share.groupchaton.com/">share.groupchaton.com</a>.' : '') + '</p>';
  list.parentNode.insertBefore(box2, list);
})();

/* Footer credit (owner, 2026-11-02): a "Designed & Developed by: Nivesh Sahayak" badge linked to niveshsahayak.in.
   The badge (look, wording, link) comes from Nivesh Sahayak's shared file, so it is changed in one place for every site;
   until that file loads, the plain text already reads "Designed & Developed by:". Also corrects themes uploaded earlier. */
;(function () {
  var RE = /(designed\s*&\s*developed|built)\s+by:?\s*$/i;
  function fix() {
    [].forEach.call(document.querySelectorAll('a[href*="niveshsahayak.in"]'), function (a) {
      var t = a.previousSibling;
      if (t && t.nodeType === 3 && RE.test(t.nodeValue)) t.nodeValue = t.nodeValue.replace(RE, 'Designed & Developed by: ');
    });
    if (!document.querySelector('script[src*="niveshsahayak.in/assets/credit.js"]')) {
      var s = document.createElement('script'); s.async = true; s.src = 'https://assets.niveshsahayak.in/assets/credit.js';
      document.head.appendChild(s);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fix); else fix();
})();
