/* Infinity by GroupChatOn — ⌘K command palette + live numbers on the home page.
   Open with Ctrl+K / ⌘K, "/" or any [data-kbar] button. It searches every tool in data/tools.json
   (names, descriptions, keywords, categories); ↑ ↓ to move, Enter to open, Esc to close.
   Designed & Developed by Nivesh Sahayak (https://www.niveshsahayak.in/). All rights reserved: see LICENSE. */
(function () {
  'use strict';
  var C = window.GCO || {};
  var BASE = C.base || '';
  var doc = document;

  function el(tag, attrs, kids) {
    var n = doc.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null && attrs[k] !== false) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return n;
  }

  /* an open dialog shuts out the page behind it: background is inert, Tab cycles inside, focus goes back on close */
  function modal(dlg) {
    var shut = [];
    Array.prototype.forEach.call(doc.body.children, function (n) {
      if (n !== dlg && !n.inert && n.tagName !== 'SCRIPT') { n.inert = true; n.setAttribute('aria-hidden', 'true'); shut.push(n); }
    });
    dlg.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(dlg.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]'), function (x) { return !x.disabled && x.offsetParent !== null && x.tabIndex >= 0; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (f.indexOf(doc.activeElement) < 0) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    return function () { shut.forEach(function (n) { n.inert = false; n.removeAttribute('aria-hidden'); }); };
  }

  // the kit owns the tool database; load it if this page hasn't
  var kitP = null;
  function kit() {
    if (window.GCOTools && window.GCOTools.ready) return window.GCOTools.ready.then(function () { return window.GCOTools; });
    if (!kitP) kitP = new Promise(function (ok, fail) {
      var s = el('script', { src: BASE + 'assets/tools/kit.js?v=' + Math.floor(Date.now() / 6e5), async: 'async' });
      s.onload = function () { window.GCOTools.ready.then(function () { ok(window.GCOTools); }); };
      s.onerror = fail;
      doc.head.appendChild(s);
    });
    return kitP;
  }

  /* ---------- palette ---------- */
  var box = null, input, list, items = [], sel = 0, lastFocus, unshut;
  function score(t, words, T) {
    if (!words.length) return 1;
    var name = t.name.toLowerCase(), hay = (t.name + ' ' + t.desc + ' ' + T.cat(t.cat).name + ' ' + (t.keywords || []).join(' ')).toLowerCase();
    var s = 0;
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (hay.indexOf(w) < 0) return 0;
      s += name.indexOf(w) === 0 ? 30 : name.indexOf(w) > 0 ? 15 : 5;
    }
    return s;
  }
  function render(T) {
    var words = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var hits = T.list.map(function (t) { return [score(t, words, T), t]; }).filter(function (x) { return x[0]; });
    if (words.length) hits.sort(function (a, b) { return b[0] - a[0]; });
    list.innerHTML = '';
    items = [];
    input.removeAttribute('aria-activedescendant');
    if (!hits.length) {
      list.appendChild(el('li', { 'class': 'kbar-empty' }, ['No tool for “' + input.value.trim() + '” yet. ',
        el('a', { href: '/p/ask-for-a-tool.html', text: 'Ask for it →' })]));
      return;
    }
    var lastCat = null;
    hits.slice(0, 60).forEach(function (x) {
      var t = x[1], c = T.cat(t.cat);
      if (!words.length && t.cat !== lastCat) { list.appendChild(el('li', { 'class': 'kbar-group', role: 'presentation', text: c.name })); lastCat = t.cat; }
      var li = el('li', { 'class': 'kbar-item', id: 'kbar-opt-' + items.length, role: 'option', 'aria-selected': 'false' }, [
        el('a', { href: t.path, style: '--cc:' + c.color, tabindex: '-1' }, [
          el('span', { 'class': 'ic', 'aria-hidden': 'true', text: t.icon }),
          el('span', {}, [el('b', { text: t.name }), el('small', { text: t.desc })]),
          words.length ? el('span', { 'class': 'cat', text: c.name }) : null])]);
      li.addEventListener('mousemove', function () { pick(items.indexOf(li)); });
      list.appendChild(li);
      items.push(li);
    });
    pick(0);
  }
  function pick(i) {
    if (!items.length) return;
    sel = (i + items.length) % items.length;
    items.forEach(function (li, j) { li.setAttribute('aria-selected', String(j === sel)); });
    input.setAttribute('aria-activedescendant', items[sel].id);   // screen readers announce the highlighted tool
    items[sel].scrollIntoView({ block: 'nearest' });
  }
  function open(q) {
    if (box) return;
    lastFocus = doc.activeElement;
    input = el('input', { 'class': 'kbar-input', type: 'search', placeholder: 'Search every tool…', 'aria-label': 'Search tools', autocomplete: 'off', spellcheck: 'false',
      role: 'combobox', 'aria-expanded': 'true', 'aria-controls': 'kbar-list', 'aria-autocomplete': 'list' });
    list = el('ul', { 'class': 'kbar-list', id: 'kbar-list', role: 'listbox', 'aria-label': 'Tools', tabindex: '-1' }, [el('li', { 'class': 'kbar-empty', text: 'Loading the tool list…' })]);
    box = el('div', { 'class': 'kbar', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Search tools' }, [
      el('div', { 'class': 'kbar-box' }, [
        el('div', { 'class': 'kbar-top' }, [svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'), input, el('button', { type: 'button', 'class': 'kbar-esc', 'aria-label': 'Close search', onclick: function () { close(); } }, [el('kbd', { text: 'Esc' }), el('span', { text: '✕' })])]),
        list,
        el('div', { 'class': 'kbar-foot' }, [el('span', { text: '↑ ↓ to move' }), el('span', { text: 'Enter to open' }), el('span', { text: 'Ctrl K anywhere' })])])]);
    box.addEventListener('mousedown', function (e) { if (e.target === box) close(); });
    doc.body.appendChild(box);
    unshut = modal(box);
    doc.documentElement.style.overflow = 'hidden';
    if (q) input.value = q;
    input.focus();
    kit().then(function (T) {
      if (!box) return;
      render(T);
      input.addEventListener('input', function () { render(T); });
    }, function () { list.innerHTML = ''; list.appendChild(el('li', { 'class': 'kbar-empty', text: 'Could not load the tool list. Check your connection and try again.' })); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); pick(sel + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); pick(sel - 1); }
      else if (e.key === 'Enter') { var a = items[sel] && items[sel].querySelector('a'); if (a) location.href = a.getAttribute('href'); }
    });
  }
  function close() {
    if (!box) return;
    box.remove();
    box = null;
    if (unshut) unshut();
    doc.documentElement.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function svg(d) {
    var s = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('class', 'i'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = d;
    return s;
  }
  doc.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || '') || (e.target && e.target.isContentEditable);
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); box ? close() : open(); }
    else if (e.key === '/' && !typing && !box) { e.preventDefault(); open(); }
    else if (e.key === 'Escape' && box) close();
  });
  doc.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-kbar]');
    if (b) { e.preventDefault(); open(); }
  });
  // Mac users see ⌘, everyone else Ctrl
  var mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  Array.prototype.forEach.call(doc.querySelectorAll('[data-kbar] kbd'), function (k) { k.textContent = mac ? '⌘ K' : 'Ctrl K'; });

  /* ---------- category and search pages: the tool grid from the database, opened on that category / search ---------- */
  if (/^\/search(\/label\/|$)/.test(location.pathname)) {
    var reading = doc.querySelector('.reading');
    if (reading && !doc.querySelector('[data-gco-tool="hub"]')) {   // the static site already has the catalogue in the page
      var hub = el('div', { 'class': 'gco-page', 'data-gco-tool': 'hub' }, [el('div', { 'class': 'gco-tool-mount' })]);
      var plist = reading.querySelector('.post-list'), pager = reading.querySelector('.blog-pager');
      reading.insertBefore(hub, plist || null);
      if (plist) plist.hidden = true;     // the same tools, with search and categories
      if (pager) pager.hidden = true;
      kit().then(function (T) { T.scan(); });
    }
  }

  /* ---------- home hero: informative pill + feature cards, search that fits phones (for themes uploaded before this) ---------- */
  (function () {
    var hero = doc.querySelector('.inf-hero'); if (!hero) return;
    var eb = hero.querySelector('.eyebrow');
    if (eb && !eb.querySelector('[data-stat="cats"]')) eb.innerHTML = '<i></i><span data-stat="tools">609</span> free tools in <span data-stat="cats">22</span> categories';
    var q = hero.querySelector('.kbar-hero');
    if (q && !q.querySelector('.kbar-long')) {
      var sp = q.querySelector('span'); if (sp) sp.className = 'kbar-long';
      var sh = doc.createElement('span'); sh.className = 'kbar-short'; sh.innerHTML = 'Search <b data-stat="tools">609</b> free tools&#8230;';
      if (sp) sp.parentNode.insertBefore(sh, sp.nextSibling);
    }
    var st = hero.querySelector('.inf-stats');
    if (st) { var ul = doc.createElement('ul'); ul.className = 'inf-feats'; ul.innerHTML = '<li><svg aria-hidden="true" class="i" viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg><b>Private</b><span>Files are processed in your browser and never uploaded.</span></li><li><svg aria-hidden="true" class="i" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/><path d="M3 3l18 18"/></svg><b>No sign-up</b><span>No account, no watermark, no daily limits.</span></li><li><a data-install="1" href="/#install"><svg aria-hidden="true" class="i" viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M12 7v7M9 11l3 3 3-3M10 18h4"/></svg><b>Install as an app</b><span>On your phone or PC. Works offline too.</span></a></li><li><a href="/p/ask-for-a-tool.html"><svg aria-hidden="true" class="i" viewBox="0 0 24 24"><path d="M21 12a8.5 8.5 0 0 1-12.4 7.6L3 21l1.4-5.6A8.5 8.5 0 1 1 21 12z"/><path d="M12 8v6M9 11h6"/></svg><b>Ask for a tool</b><span>Missing something? Tell us and we will build it.</span></a></li>'; st.parentNode.replaceChild(ul, st); }
  })();

  /* ---------- Infinity installs as an app (manifest.webmanifest + sw.js on the static site) ----------
     Any [data-install] link or button: the browser's own install dialog when it offers one, otherwise short steps for this device. */
  var installEvt = null, standalone = window.matchMedia && matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  function showInstallBtns() {
    Array.prototype.forEach.call(doc.querySelectorAll('button[data-install]'), function (b) { b.hidden = standalone; });
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEvt = e; showInstallBtns(); });
  window.addEventListener('appinstalled', function () { installEvt = null; standalone = true; showInstallBtns(); installSheet(true); });
  if (C.static && !standalone && doc.querySelector('link[rel="manifest"]')) showInstallBtns();
  // the steps for this browser: Chrome, Edge, Firefox, Safari on a Mac or iPhone, Samsung Internet
  function installSteps() {
    var ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
      ? ['Tap the Share button (the square with an arrow) next to the address bar.', 'Tap “Add to Home Screen”. If it is not in the list, open this page in Safari and do it there.', 'Tap “Add”. Infinity now opens from your home screen like an app.']
      : ['Tap the Share button (the square with an arrow) in Safari.', 'Scroll down and tap “Add to Home Screen”.', 'Tap “Add”. Infinity now opens from your home screen like an app.'];
    if (/Android/.test(ua)) {
      if (/Firefox\//.test(ua)) return ['Tap the Firefox menu (⋮).', 'Tap “Add app to Home screen” (or “Install”).', 'Tap “Add”. Infinity now opens from your home screen.'];
      if (/SamsungBrowser/.test(ua)) return ['Tap the menu (☰) at the bottom right.', 'Tap “Add page to” › “Home screen”.', 'Tap “Add”. Infinity now opens from your home screen.'];
      return ['Tap the browser menu (⋮) at the top right.', 'Tap “Install app” or “Add to Home screen”.', 'Tap “Install”. Infinity now opens from your app drawer.'];
    }
    if (/Firefox\//.test(ua)) return ['If Firefox shows an install or “Add to taskbar” icon in the address bar, click it. Otherwise Firefox on a computer cannot install websites as apps, but every tool works right here: bookmark this page with Ctrl+D (⌘+D on a Mac).', 'To install Infinity as an app, open infinity.groupchaton.com in Chrome or Edge and click their install button.'];
    if (/Edg\//.test(ua)) return ['Click the “App available” icon at the right end of the address bar, or open the menu (…) › “Apps” › “Install this site as an app”.', 'Click “Install”. Infinity opens in its own window and from your Start menu.'];
    if (/Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|OPR\//.test(ua)) return ['In Safari’s menu bar, choose File › “Add to Dock…” (macOS Sonoma or newer).', 'Click “Add”. Infinity opens from the Dock in its own window.'];
    if (/Chrome\//.test(ua) && !/OPR\/|YaBrowser/.test(ua)) return ['Click the install icon at the right end of the address bar (a screen with a down arrow), or open the browser menu (⋮) › “Cast, save and share” › “Install page as app”.', 'Click “Install”. Infinity opens in its own window and from your Start menu.'];
    return ['Look for an install icon in the address bar, or open the browser menu and choose “Install” or “Add to home screen”.', 'If your browser has neither, open this page in Chrome or Edge to install it. Every tool also works right here.'];
  }
  function installSheet(done) {
    var old = doc.getElementById('inst-sheet'); if (old && old.__close) old.__close();
    var back = doc.activeElement, unshut;
    var steps = done || standalone ? ['Infinity is installed. Open it from your home screen or app list: every tool, and it works offline.'] : installSteps();
    function shut() { sh.remove(); if (unshut) unshut(); doc.removeEventListener('keydown', esc); if (back && back.focus && back.isConnected) back.focus(); }
    function esc(e) { if (e.key === 'Escape') shut(); }
    var close = el('button', { type: 'button', 'class': 'btn btn-sm', text: 'Close', onclick: shut });
    var sh = el('div', { id: 'inst-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'inst-h',
      style: 'position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,6,15,.6)',
      onclick: function (e) { if (e.target === sh) shut(); } }, [
      el('div', { style: 'max-width:440px;width:100%;box-sizing:border-box;padding:20px;border-radius:18px;background:var(--surface-solid,#0E131D);color:var(--ink,#E8EAFF);border:1px solid var(--line,rgba(139,124,255,.3));box-shadow:0 20px 60px rgba(0,0,0,.4)' }, [
        el('h2', { id: 'inst-h', style: 'margin:0 0 10px;font-size:1.25rem', text: done || standalone ? 'Installed' : 'Install the Infinity app' }),
        el('ol', { style: 'margin:0 0 16px;padding-left:1.3em;line-height:1.55' }, steps.map(function (t) { return el('li', { text: t }); })),
        close])]);
    sh.__close = shut;
    doc.body.appendChild(sh);
    unshut = modal(sh);
    close.focus();
    doc.addEventListener('keydown', esc);
  }
  function install() {
    if (installEvt) {
      var ev = installEvt; installEvt = null;
      ev.prompt();
      (ev.userChoice || Promise.resolve()).then(function () { showInstallBtns(); });
    } else installSheet();
  }
  window.GCOInstall = install;
  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-install]');
    if (!a || !C.static) return;
    e.preventDefault();
    install();
  });
  if (C.static && location.hash === '#install') setTimeout(installSheet, 600);

  /* ---------- Ask for a tool (static site): Blogger's contact form is gone, so copy the request and open the main site's contact form ---------- */
  Array.prototype.forEach.call(doc.querySelectorAll('[data-ask-send]'), function (a) {
    a.addEventListener('click', function (e) {
      var tool = doc.getElementById('ask-tool'), note = doc.getElementById('ask-note'), st = a.parentNode.querySelector('.fb-status');
      if (!tool.value.trim()) { e.preventDefault(); st.className = 'fb-status is-error'; st.textContent = 'Tell us which tool you need.'; tool.focus(); return; }
      var text = '[Tool request] ' + tool.value.trim() + '\nDetails: ' + (note.value.trim() || '-');
      // copied for sure (textarea + execCommand works without asking); the Clipboard API as a second try
      var ok = false;
      try { var ta = el('textarea', { readonly: 'readonly', style: 'position:fixed;top:0;left:-9999px' }); ta.value = text; doc.body.appendChild(ta); ta.select(); ok = doc.execCommand('copy'); ta.remove(); } catch (x) {}
      try { if (!ok && navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {}); } catch (x) {}
      st.className = 'fb-status is-ok';
      st.textContent = ok ? 'Copied. In the new tab, paste it into the message box, add your email and press Send.'
        : 'In the new tab, write your request in the message box (' + tool.value.trim() + '), add your email and press Send.';
    });
  });

  /* ---------- live numbers on the home page ---------- */
  var stats = doc.querySelectorAll('[data-stat]');
  if (stats.length) kit().then(function (T) {
    var n = { tools: T.list.length, cats: T.cats.filter(function (c) { return T.list.some(function (t) { return t.cat === c.id; }); }).length };
    Array.prototype.forEach.call(stats, function (s) { var v = n[s.getAttribute('data-stat')]; if (v != null) s.textContent = v; });
  });
})();
