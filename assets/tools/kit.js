/* Infinity by GroupChatOn (infinity.groupchaton.com) — tool loader + shared kit
   Designed & Developed by Nivesh Sahayak (https://www.niveshsahayak.in/). All rights reserved: see LICENSE.
   A Blogger post becomes a tool with:  <div class="gco-page" data-gco-tool="pdf-merge"> ... <div class="gco-tool-mount"></div> ... </div>
   site.js loads this file; this file loads tools.css and tools/<id>.js, which calls GCOTools.register(). */
(function () {
  'use strict';
  // loaded twice (site.js and the ⌘K search both ask for it): the second time only mounts tools added since
  if (window.GCOTools && window.GCOTools.scan) { window.GCOTools.scan(); return; }
  var C = window.GCO || {};
  var BASE = C.base || '';
  // EDIT: bump this after changing any file in assets/tools/, so browsers fetch the new version straight away
  var VERSION = '2026-11-01.1';
  var doc = document;
  var T = window.GCOTools = window.GCOTools || {};

  /* ---------- the tool database: data/tools.json (built from scripts/catalog.py) ---------- */
  T.list = [];
  T.cats = [];
  T.find = function (id) { return T.list.filter(function (t) { return t.id === id; })[0]; };
  T.cat = function (id) { return T.cats.filter(function (c) { return c.id === id; })[0] || { id: id, name: id, label: id, icon: '•', color: '#888' }; };
  // every published post, read from the blog's feed 500 at a time: tool slug → its address (/yyyy/mm/slug.html)
  function postPaths(start, acc) {
    return fetch('/feeds/posts/summary?alt=json&max-results=500&start-index=' + start, { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var list = (d && d.feed && d.feed.entry) || [];
        list.forEach(function (e) {
          var link = (e.link || []).filter(function (l) { return l.rel === 'alternate'; })[0];
          if (link) { var path = link.href.replace(/^https?:\/\/[^/]+/, ''); acc[path.replace(/^.*\//, '').replace(/\.html$/, '')] = path; }
        });
        return list.length === 500 ? postPaths(start + 500, acc) : acc;
      });
  }
  T.ready = fetch(BASE + 'data/tools.json?v=' + Math.floor(Date.now() / 6e5), { credentials: 'omit' })
    .then(function (r) { if (!r.ok) throw new Error('Tool list ' + r.status); return r.json(); })
    .then(function (db) {
      T.cats = db.categories || [];
      T.list = db.tools || [];
      // until the post list arrives, a tool's link is a search for it; then it becomes the post's own address
      T.list.forEach(function (t) { t.path = '/search?q=' + encodeURIComponent(t.name); });
      return postPaths(1, {}).catch(function () { return {}; });
    })
    .then(function (paths) {
      T.list.forEach(function (t) { if (paths[t.slug]) t.path = paths[t.slug]; });
      Array.prototype.forEach.call(doc.querySelectorAll('[data-tool-link]'), function (a) {
        var t = T.find(a.getAttribute('data-tool-link'));
        if (t) a.setAttribute('href', t.path);
      });
    })
    .catch(function (e) { if (window.console) console.warn('Infinity: tool list not loaded', e); });

  /* ---------- libraries (fixed versions) ---------- */
  var CDN = 'https://cdnjs.cloudflare.com/ajax/libs/';
  var LIBS = {
    pdflib: [CDN + 'pdf-lib/1.17.1/pdf-lib.min.js', 'PDFLib'],
    pdfjs: [CDN + 'pdf.js/3.11.174/pdf.min.js', 'pdfjsLib'],
    jszip: [CDN + 'jszip/3.10.1/jszip.min.js', 'JSZip'],
    jspdf: [CDN + 'jspdf/2.5.1/jspdf.umd.min.js', 'jspdf'],
    html2canvas: [CDN + 'html2canvas/1.4.1/html2canvas.min.js', 'html2canvas'],
    tesseract: ['https://cdn.jsdelivr.net/npm/tesseract.js@5.0.5/dist/tesseract.min.js', 'Tesseract'],
    qrcode: [CDN + 'qrcode-generator/1.4.4/qrcode.min.js', 'qrcode']
  };
  var loading = {};
  T.loadScript = function (src) {
    if (!loading[src]) loading[src] = new Promise(function (ok, fail) {
      var s = doc.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { ok(); };
      s.onerror = function () { delete loading[src]; fail(new Error('Could not load ' + src.split('/').pop() + '. Check your connection and try again.')); };
      doc.head.appendChild(s);
    });
    return loading[src];
  };
  T.lib = function (name) {
    var l = LIBS[name];
    return T.loadScript(l[0]).then(function () {
      var g = window[l[1]];
      if (name === 'pdfjs' && g && !g.GlobalWorkerOptions.workerSrc) g.GlobalWorkerOptions.workerSrc = CDN + 'pdf.js/3.11.174/pdf.worker.min.js';
      return g;
    });
  };

  /* ---------- small helpers ---------- */
  var h = T.h = function (tag, attrs, kids) {
    var n = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c !== null && c !== undefined && c !== false) n.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return n;
  };
  T.bytes = function (n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(n < 10485760 ? 2 : 1) + ' MB';
  };
  T.baseName = function (name) { return String(name || 'file').replace(/\.[^.]+$/, ''); };
  T.read = function (file, how) {
    return new Promise(function (ok, fail) {
      var r = new FileReader();
      r.onload = function () { ok(r.result); };
      r.onerror = function () { fail(new Error('Could not read ' + file.name)); };
      if (how === 'dataURL') r.readAsDataURL(file); else if (how === 'text') r.readAsText(file); else r.readAsArrayBuffer(file);
    });
  };
  T.download = function (blob, name) {
    var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: name });
    doc.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  };
  T.zip = function (items, onProgress) {
    return T.lib('jszip').then(function (JSZip) {
      var z = new JSZip();
      items.forEach(function (it) { z.file(it.name, it.blob); });
      return z.generateAsync({ type: 'blob' }, function (m) { if (onProgress) onProgress(m.percent / 100); });
    });
  };
  T.copy = function (text, btn) {
    var done = function () {
      if (!btn) return;
      var old = btn.textContent; btn.textContent = 'Copied ✓';
      setTimeout(function () { btn.textContent = old; }, 1600);
    };
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(done);
    var ta = h('textarea', { style: 'position:fixed;opacity:0' }); ta.value = text;
    doc.body.appendChild(ta); ta.select();
    try { doc.execCommand('copy'); done(); } catch (e) {}
    ta.remove();
    return Promise.resolve();
  };
  T.store = {
    get: function (k, d) { try { var v = localStorage.getItem('gco-tool-' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('gco-tool-' + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- building blocks ---------- */
  T.button = function (text, opts) {
    opts = opts || {};
    return h('button', { type: 'button', 'class': 'tbtn' + (opts.primary ? ' tbtn-primary' : '') + (opts.small ? ' tbtn-sm' : ''),
      onclick: opts.onclick, disabled: opts.disabled }, [text]);
  };
  T.field = function (label, input, hint) {
    return h('label', { 'class': 'tfield' }, [h('span', { 'class': 'tfield-label', text: label }), input, hint ? h('small', { text: hint }) : null]);
  };
  T.select = function (options, value) {
    var s = h('select', {}, options.map(function (o) {
      var val = Array.isArray(o) ? o[0] : o, lab = Array.isArray(o) ? o[1] : o;
      return h('option', { value: val, selected: String(val) === String(value) }, [lab]);
    }));
    return s;
  };
  T.seg = function (options, value, onChange) {
    var wrap = h('div', { 'class': 'tseg', role: 'group' });
    function draw() {
      wrap.innerHTML = '';
      options.forEach(function (o) {
        wrap.appendChild(h('button', { type: 'button', 'aria-pressed': String(o[0] === value), text: o[1],
          onclick: function () { value = o[0]; draw(); if (onChange) onChange(value); } }));
      });
    }
    draw();
    wrap.value = function () { return value; };
    return wrap;
  };
  T.row = function (kids, cls) { return h('div', { 'class': 'trow' + (cls ? ' ' + cls : '') }, kids); };

  // drop area: click, drag and drop, or paste (images)
  T.dropzone = function (opts) {
    var input = h('input', { type: 'file', accept: opts.accept || '', multiple: opts.multiple ? true : null, hidden: true });
    if (opts.folder) { input.setAttribute('webkitdirectory', ''); input.setAttribute('directory', ''); }
    var zone = h('div', { 'class': 'tdrop', tabindex: '0', role: 'button', 'aria-label': opts.label }, [
      h('span', { 'class': 'tdrop-ic', 'aria-hidden': 'true', text: opts.icon || '📂' }),
      h('b', { text: opts.label || 'Choose files' }),
      h('small', { text: opts.hint || 'or drag and drop them here' }),
      input]);
    function take(list) {
      var files = Array.prototype.slice.call(list || []);
      if (opts.filter) files = files.filter(opts.filter);
      if (files.length) opts.onFiles(opts.multiple ? files : [files[0]]);
    }
    zone.addEventListener('click', function () { input.click(); });
    zone.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    input.addEventListener('change', function () { take(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('is-over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('is-over'); }); });
    zone.addEventListener('drop', function (e) { take(e.dataTransfer.files); });
    if (opts.paste) doc.addEventListener('paste', function (e) {
      var items = (e.clipboardData && e.clipboardData.files) || [];
      if (items.length) take(items);
    });
    return zone;
  };

  // a list of files the user can reorder and remove
  T.fileList = function (onChange) {
    var files = [], ul = h('ol', { 'class': 'tfiles' });
    function draw() {
      ul.innerHTML = '';
      files.forEach(function (f, i) {
        ul.appendChild(h('li', {}, [
          f.thumb ? h('img', { src: f.thumb, alt: '' }) : h('span', { 'class': 'tfiles-ic', text: '📄' }),
          h('span', { 'class': 'tfiles-name' }, [h('b', { text: f.file.name }), h('small', { text: T.bytes(f.file.size) + (f.note ? ' · ' + f.note : '') })]),
          h('span', { 'class': 'tfiles-act' }, [
            h('button', { type: 'button', 'aria-label': 'Move up', disabled: i === 0, text: '↑', onclick: function () { move(i, -1); } }),
            h('button', { type: 'button', 'aria-label': 'Move down', disabled: i === files.length - 1, text: '↓', onclick: function () { move(i, 1); } }),
            h('button', { type: 'button', 'aria-label': 'Remove', text: '✕', onclick: function () { files.splice(i, 1); draw(); } })])]));
      });
      ul.hidden = !files.length;
      if (onChange) onChange(files);
    }
    function move(i, d) { var x = files.splice(i, 1)[0]; files.splice(i + d, 0, x); draw(); }
    return {
      el: ul,
      add: function (list) {
        list.forEach(function (file) {
          var item = { file: file };
          files.push(item);
          if (/^image\//.test(file.type)) { item.thumb = URL.createObjectURL(file); }
        });
        draw();
      },
      files: function () { return files.map(function (f) { return f.file; }); },
      clear: function () { files = []; draw(); },
      draw: draw
    };
  };

  // status line with optional progress bar
  T.status = function () {
    var bar = h('div', { 'class': 'tprogress', hidden: true }, [h('span')]);
    var msg = h('p', { 'class': 'tstatus', role: 'status', 'aria-live': 'polite' });
    var wrap = h('div', { 'class': 'tstatus-wrap' }, [bar, msg]);
    function set(kind, text) { msg.className = 'tstatus' + (kind ? ' is-' + kind : ''); msg.textContent = text || ''; }
    return {
      el: wrap,
      info: function (t) { set('', t); },
      ok: function (t) { bar.hidden = true; set('ok', t); },
      error: function (e) { bar.hidden = true; set('error', (e && e.message) || String(e)); },
      progress: function (p, t) { bar.hidden = false; bar.firstChild.style.width = Math.round(Math.max(0, Math.min(1, p)) * 100) + '%'; if (t) set('', t); },
      clear: function () { bar.hidden = true; set('', ''); }
    };
  };

  // a box of result files with download buttons (+ "download all as ZIP")
  T.results = function () {
    var box = h('div', { 'class': 'tresults', hidden: true });
    var items = [];
    function draw() {
      box.innerHTML = '';
      box.hidden = !items.length;
      if (!items.length) return;
      var head = h('div', { 'class': 'tresults-head' }, [h('b', { text: items.length === 1 ? 'Your file is ready' : items.length + ' files are ready' })]);
      if (items.length > 1) head.appendChild(T.button('Download all (ZIP)', { primary: true, small: true, onclick: function () {
        T.zip(items).then(function (z) { T.download(z, (box.zipName || 'files') + '.zip'); });
      } }));
      box.appendChild(head);
      var grid = h('div', { 'class': 'tresults-grid' });
      items.forEach(function (it) {
        grid.appendChild(h('div', { 'class': 'tresult' }, [
          it.preview ? h('img', { src: it.preview, alt: it.name, loading: 'lazy' }) : h('span', { 'class': 'tresult-ic', text: it.icon || '📄' }),
          h('span', { 'class': 'tresult-name' }, [h('b', { text: it.name }), h('small', { text: T.bytes(it.blob.size) + (it.note ? ' · ' + it.note : '') })]),
          T.button('Download', { small: true, primary: items.length === 1, onclick: function () { T.download(it.blob, it.name); } })]));
      });
      box.appendChild(grid);
    }
    return {
      el: box,
      set: function (list, zipName) { items = list; box.zipName = zipName; draw(); },
      clear: function () { items = []; draw(); }
    };
  };

  T.card = function (kids) { return h('div', { 'class': 'tool-app' }, kids); };

  /* ---------- PDF helpers ---------- */
  T.openPdf = function (file) {
    return Promise.all([T.lib('pdfjs'), T.read(file)]).then(function (r) {
      return r[0].getDocument({ data: new Uint8Array(r[1]) }).promise;
    }).catch(function (e) {
      if (/password/i.test(e && e.name + e.message)) throw new Error('This PDF is password-protected. Remove the password first.');
      throw e;
    });
  };
  T.renderPage = function (pdf, n, scale) {
    return pdf.getPage(n).then(function (page) {
      var vp = page.getViewport({ scale: scale || 1 });
      var canvas = h('canvas'); canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      // 'print' intent renders without waiting for animation frames, so it keeps going in a background tab
      return page.render({ canvasContext: ctx, viewport: vp, intent: 'print' }).promise.then(function () { return canvas; });
    });
  };
  T.canvasBlob = function (canvas, type, quality) {
    return new Promise(function (ok) { canvas.toBlob(ok, type || 'image/png', quality); });
  };
  // "1-3, 5, 8-" → [1,2,3,5,8,...,max]
  T.parseRanges = function (text, max) {
    var out = [];
    String(text || '').split(/[,;]+/).forEach(function (part) {
      var m = part.trim().match(/^(\d*)\s*-\s*(\d*)$/), a, b;
      if (m) { a = m[1] ? +m[1] : 1; b = m[2] ? +m[2] : max; }
      else if (/^\d+$/.test(part.trim())) { a = b = +part.trim(); }
      else return;
      for (var i = Math.max(1, a); i <= Math.min(max, b); i++) if (out.indexOf(i) < 0) out.push(i);
    });
    return out;
  };

  /* ---------- loading and mounting ---------- */
  var registry = {};
  T.register = function (id, setup) {
    registry[id] = setup;
    $all('[data-gco-tool="' + id + '"]').forEach(mount);
  };
  function $all(sel) { return Array.prototype.slice.call(doc.querySelectorAll(sel)); }
  function mount(page) {
    if (page.__mounted) return;
    page.__mounted = true;
    var id = page.getAttribute('data-gco-tool');
    var spot = page.querySelector('.gco-tool-mount') || page.insertBefore(h('div', { 'class': 'gco-tool-mount' }), page.firstChild);
    spot.innerHTML = '';
    try { registry[id](spot, T, page); } catch (e) {
      spot.appendChild(h('p', { 'class': 'tstatus is-error', text: 'This tool could not start: ' + e.message }));
      if (window.console) console.error(e);
    }
    T.ready.then(function () {
    var info = T.find(id);
    if (info) {
      // an ad between the tool and the guide below it (never next to the tool's buttons)
      if (C.adSlot) { var ad = C.adSlot('in-article', (C.ads || {}).inArticle); if (ad) spot.parentNode.insertBefore(ad, spot.nextSibling); }
      related(page, info);
      structured(info);
    }
    });
  }
  function related(page, info) {
    var same = T.list.filter(function (t) { return t.id !== info.id && t.cat === info.cat; });
    var other = T.list.filter(function (t) { return t.id !== info.id && t.cat !== info.cat; });
    var picks = same.concat(other).slice(0, 6);
    page.appendChild(h('section', { 'class': 'trelated' }, [
      h('h2', { text: 'More ' + T.cat(info.cat).name + ' tools and more' }),
      h('div', { 'class': 'thub-grid' }, picks.map(card)),
      h('p', { 'class': 'trelated-all' }, [h('a', { href: '/', text: 'See all ' + T.list.length + ' tools →' })])]));
  }
  function card(t) {
    var c = T.cat(t.cat);
    return h('a', { 'class': 'thub-card', href: t.path, 'data-tool-link': t.id, 'data-cat': t.cat, style: '--cc:' + c.color }, [
      h('span', { 'class': 'thub-ic', 'aria-hidden': 'true', text: t.icon }),
      h('span', {}, [h('b', {}, [t.name, t.isNew ? h('em', { 'class': 'thub-new', text: 'NEW' }) : null]), h('small', { text: t.desc })])]);
  }
  T.toolCard = card;
  function structured(info) {
    var s = h('script', { type: 'application/ld+json' });
    s.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebApplication', name: info.name + ' — Infinity by GroupChatOn',
      url: location.origin + location.pathname, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any (runs in your browser)',
      description: info.desc, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } });
    doc.head.appendChild(s);
  }

  // the tool hub (home page and category pages): search + category chips + cards
  T.register('hub', function (spot) {
    T.ready.then(function () {
      var label = (location.pathname.match(/^\/search\/label\/([^/?#]+)/) || [])[1];
      label = label ? decodeURIComponent(label).replace(/\+/g, ' ') : '';
      var cat = (T.cats.filter(function (c) { return c.label === label; })[0] || {}).id || 'all';
      var q = h('input', { type: 'search', 'class': 'thub-search', placeholder: 'Search ' + T.list.length + ' free tools…', 'aria-label': 'Search tools' });
      var startQ = new URLSearchParams(location.search).get('q');
      if (startQ && !label) q.value = startQ;
      var chips = h('div', { 'class': 'thub-cats', role: 'tablist', 'aria-label': 'Categories' });
      var grid = h('div', { 'class': 'thub-grid' });
      var count = h('p', { 'class': 'thub-count', role: 'status', 'aria-live': 'polite' });
      function chip(id, name, icon, color, n) {
        return h('button', { type: 'button', role: 'tab', 'class': 'thub-chip', 'data-cat': id, style: color ? '--cc:' + color : null,
          'aria-selected': String(cat === id), onclick: function () { cat = id; draw(); } }, [h('span', { 'aria-hidden': 'true', text: icon }), name, h('em', { text: String(n) })]);
      }
      function draw() {
        var s = q.value.trim().toLowerCase();
        chips.innerHTML = '';
        chips.appendChild(chip('all', 'All', '∞', '', T.list.length));
        T.cats.forEach(function (c) {
          var n = T.list.filter(function (t) { return t.cat === c.id; }).length;
          if (n) chips.appendChild(chip(c.id, c.name, c.icon, c.color, n));
        });
        grid.innerHTML = '';
        var words = s.split(/\s+/).filter(Boolean);
        var shown = T.list.filter(function (t) {
          var hay = (t.name + ' ' + t.desc + ' ' + T.cat(t.cat).name + ' ' + (t.keywords || []).join(' ')).toLowerCase();
          return (cat === 'all' || t.cat === cat) && words.every(function (w) { return hay.indexOf(w) >= 0; });
        });
        shown.forEach(function (t) { grid.appendChild(card(t)); });
        count.textContent = shown.length + (shown.length === 1 ? ' tool' : ' tools');
        if (!shown.length) grid.appendChild(h('p', { 'class': 'tstatus', html: 'No tool matches “' + h('b', { text: q.value }).outerHTML + '” yet. <a href="/p/ask-for-a-tool.html" data-feedback="tool">Ask for it</a> and we’ll build it.' }));
      }
      q.addEventListener('input', draw);
      spot.appendChild(h('div', { 'class': 'thub' }, [q, chips, count, grid]));
      draw();
    });
  });

  // load the stylesheet, then each tool's script
  if (!doc.getElementById('gco-tools-css')) doc.head.appendChild(h('link', { id: 'gco-tools-css', rel: 'stylesheet', href: BASE + 'assets/tools/tools.css?v=' + VERSION }));
  T.scan = function () { $all('[data-gco-tool]').forEach(function (page) {
    var id = page.getAttribute('data-gco-tool');
    if (page.__mounted) return;
    if (registry[id]) return mount(page);
    if (!/^[a-z0-9-]+$/.test(id)) return;
    T.loadScript(BASE + 'assets/tools/' + id + '.js?v=' + VERSION).catch(function (e) {
      var spot = page.querySelector('.gco-tool-mount');
      if (spot) spot.appendChild(h('p', { 'class': 'tstatus is-error', text: e.message }));
    });
  }); };
  T.scan();
})();
