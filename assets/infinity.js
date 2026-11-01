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
  var box = null, input, list, items = [], sel = 0, lastFocus;
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
    if (!hits.length) {
      list.appendChild(el('li', { 'class': 'kbar-empty' }, ['No tool for “' + input.value.trim() + '” yet. ',
        el('a', { href: '/p/ask-for-a-tool.html', text: 'Ask for it →' })]));
      return;
    }
    var lastCat = null;
    hits.slice(0, 60).forEach(function (x) {
      var t = x[1], c = T.cat(t.cat);
      if (!words.length && t.cat !== lastCat) { list.appendChild(el('li', { 'class': 'kbar-group', role: 'presentation', text: c.name })); lastCat = t.cat; }
      var li = el('li', { 'class': 'kbar-item', role: 'option', 'aria-selected': 'false' }, [
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
    items[sel].scrollIntoView({ block: 'nearest' });
  }
  function open(q) {
    if (box) return;
    lastFocus = doc.activeElement;
    input = el('input', { 'class': 'kbar-input', type: 'search', placeholder: 'Search every tool…', 'aria-label': 'Search tools', autocomplete: 'off', spellcheck: 'false' });
    list = el('ul', { 'class': 'kbar-list', role: 'listbox', 'aria-label': 'Tools' }, [el('li', { 'class': 'kbar-empty', text: 'Loading the tool list…' })]);
    box = el('div', { 'class': 'kbar', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Search tools' }, [
      el('div', { 'class': 'kbar-box' }, [
        el('div', { 'class': 'kbar-top' }, [svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'), input, el('kbd', { text: 'Esc' })]),
        list,
        el('div', { 'class': 'kbar-foot' }, [el('span', { text: '↑ ↓ to move' }), el('span', { text: 'Enter to open' }), el('span', { text: 'Ctrl K anywhere' })])])]);
    box.addEventListener('mousedown', function (e) { if (e.target === box) close(); });
    doc.body.appendChild(box);
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
    if (reading) {
      var hub = el('div', { 'class': 'gco-page', 'data-gco-tool': 'hub' }, [el('div', { 'class': 'gco-tool-mount' })]);
      var plist = reading.querySelector('.post-list'), pager = reading.querySelector('.blog-pager');
      reading.insertBefore(hub, plist || null);
      if (plist) plist.hidden = true;     // the same tools, with search and categories
      if (pager) pager.hidden = true;
      kit().then(function (T) { T.scan(); });
    }
  }

  /* ---------- live numbers on the home page ---------- */
  var stats = doc.querySelectorAll('[data-stat]');
  if (stats.length) kit().then(function (T) {
    var n = { tools: T.list.length, cats: T.cats.filter(function (c) { return T.list.some(function (t) { return t.cat === c.id; }); }).length };
    Array.prototype.forEach.call(stats, function (s) { var v = n[s.getAttribute('data-stat')]; if (v != null) s.textContent = v; });
  });
})();
