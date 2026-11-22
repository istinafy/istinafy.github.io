// Sample-case PDF reading on /<lang>/ and /<lang>/ornek/ (markup: site-uret.js viewerMarkup, readerMarkup and docCard).
// Two views share one page engine (View below) and one PDF.js copy (site/vendor/pdfjs, fetched on first use):
// - the #pdfv dialog: a link with data-pdfv="<slug>" opens the PDF of its card (.pdfc[data-pdfv-card]) full screen;
// - the #pdfr reader on /<lang>/ornek/: the chosen document right in the page, fetched only when the reader nears the
//   screen; its full-screen button opens the dialog on the same page, and closing the dialog brings the reader there.
// Without JS, or in a browser that lacks what they need, the links simply open the PDF and the reader stays hidden.
// Pages are drawn only near the screen and dropped again further away, so 36 pages never sit in memory at once; after
// every zoom the visible pages are drawn again at the new scale. A loaded document is kept and shared by both views.
// The zoom and tab arithmetic is exported for test/goruntuleyici.test.js.
(function () {
  "use strict";
  var CSS_UNIT = 96 / 72; // CSS px per PDF point at 100 %
  var MIN = 0.25, MAX = 5, STEP = 1.25;
  var DESK_MAX_W = 940; // first view on a wide screen: the page no wider than this
  var HASH = "#goruntule-";

  function clamp(s) { return Math.min(MAX, Math.max(MIN, s)); }
  function zoomStep(s, dir) { return clamp(dir > 0 ? s * STEP : s / STEP); }
  function fitWidth(viewW, pageW, pad) { return clamp((viewW - 2 * pad) / pageW); }
  function startScale(viewW, pageW, pad, touch) {
    var f = fitWidth(viewW, pageW, pad);
    return touch ? f : Math.min(f, clamp(DESK_MAX_W / pageW));
  }
  // Ratio a pinch applies, already held inside MIN..MAX so the picture never grows past what will be drawn.
  function pinchRatio(s0, d0, d1) { return d0 > 0 ? clamp(s0 * d1 / d0) / s0 : 1; }
  function wheelFactor(deltaY, deltaMode) {
    var f = Math.exp(-deltaY * (deltaMode === 1 ? 0.05 : deltaMode === 2 ? 1 : 0.0025));
    return Math.min(2, Math.max(0.5, f));
  }
  // Device pixels per CSS pixel for a page canvas: the screen's ratio, lowered only when the canvas would pass maxPx
  // (phones refuse or blank out very large canvases).
  function outputScale(dpr, w, h, maxPx) {
    var s = dpr > 0 ? dpr : 1;
    return w * h * s * s > maxPx ? Math.sqrt(maxPx / (w * h)) : s;
  }
  // Index of the page whose top is the last one at or above y (tops ascending).
  function pageAt(tops, y) {
    var lo = 0, hi = tops.length - 1;
    if (hi < 0) return 0;
    while (lo < hi) {
      var mid = (lo + hi + 1) >> 1;
      if (tops[mid] <= y) lo = mid; else hi = mid - 1;
    }
    return lo;
  }
  function doubleTapTarget(s, fit) { return s < fit * 1.5 ? clamp(fit * 2.5) : fit; }
  function percent(s) { return Math.round(s / CSS_UNIT * 100); }
  // Tab index after a key in a row of n tabs, wrapping; the arrows follow the reading direction. -1: not a tab key.
  function tabMove(i, n, key, rtl) {
    if (key === "Home") return 0;
    if (key === "End") return n - 1;
    var d = key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : 0;
    if (!d || n < 1) return -1;
    return (i + (rtl ? -d : d) + n) % n;
  }
  var api = { MIN: MIN, MAX: MAX, CSS_UNIT: CSS_UNIT, clamp: clamp, zoomStep: zoomStep, fitWidth: fitWidth, startScale: startScale,
    pinchRatio: pinchRatio, wheelFactor: wheelFactor, outputScale: outputScale, pageAt: pageAt, doubleTapTarget: doubleTapTarget, percent: percent,
    tabMove: tabMove };
  if (typeof module === "object" && module.exports) { module.exports = api; return; }

  var root = document.getElementById("pdfv");
  if (!root || !document.querySelector("[data-pdfv]")) return;
  if (!(window.Promise && window.IntersectionObserver && window.URL && history.pushState && document.createElement("canvas").getContext)) return;

  var TOUCH = window.matchMedia && matchMedia("(pointer: coarse)").matches;
  var MAXPX = TOUCH ? 8388608 : 16777216;

  function abs(u) { return new URL(u, location.href).href; }
  var libP = null;
  function loadLib() {
    if (!libP) libP = new Promise(function (ok, no) {
      if (window.pdfjsLib) return ok(window.pdfjsLib);
      var s = document.createElement("script");
      s.src = root.getAttribute("data-lib");
      s.onload = function () { if (window.pdfjsLib) ok(window.pdfjsLib); else no(new Error("pdf.js loaded without pdfjsLib")); };
      s.onerror = function () { libP = null; no(new Error("pdf.js could not be fetched: " + s.src)); };
      document.head.appendChild(s);
    });
    return libP;
  }
  // One load per PDF, shared by the dialog and the reader; a failed load is forgotten so the next open tries again.
  var docs = {};
  function getDoc(url, onProgress) {
    var d = docs[url];
    if (!d) {
      d = docs[url] = { progs: [], p: null };
      d.p = loadLib().then(function (lib) {
        lib.GlobalWorkerOptions.workerSrc = abs(root.getAttribute("data-worker"));
        // isEvalSupported false: no generated code, which the site CSP would refuse anyway. verbosity 0: errors only; the
        // embedded fonts of these PDFs log harmless TrueType hinting notes ("TT: undefined function") otherwise.
        var task = lib.getDocument({ url: abs(url), standardFontDataUrl: abs(root.getAttribute("data-fonts")), isEvalSupported: false, enableXfa: false, verbosity: 0 });
        task.onProgress = function (p) { if (p.total) d.progs.forEach(function (f) { f(p.loaded / p.total); }); };
        return task.promise;
      });
      d.p.then(function () { d.progs = []; }, function () { if (docs[url] === d) delete docs[url]; });
    }
    if (onProgress) d.progs.push(onProgress);
    return d.p;
  }
  function setBar(el, f) { el.style.transform = "scaleX(" + Math.max(0, Math.min(1, f)) + ")"; }
  function hint(el) {
    if (!TOUCH) return;
    try {
      if (sessionStorage.getItem("pdfv-hint")) return;
      sessionStorage.setItem("pdfv-hint", "1");
    } catch (e) { /* storage blocked (private mode): the hint then shows on every open, which is harmless */ }
    el.hidden = false;
    requestAnimationFrame(function () { el.classList.add("in"); });
    setTimeout(function () { el.classList.remove("in"); setTimeout(function () { el.hidden = true; }, 450); }, 2800);
  }

  // ---- the page engine: one scrolling column of PDF pages ----
  // o: root (gets "pinching"), sc (the scroller), pages, num (page input), of, pct, zin, zout, word (the word "Page"),
  // start ("auto": fit, but at most DESK_MAX_W wide on a desktop; "fit": the scroller's width), wheel (where ctrl + wheel
  // zooms), arrows (left/right turn pages), active() (whether it is on screen now).
  function View(o) {
    var sc = o.sc, pagesEl = o.pages;
    var S = { doc: null, sizes: [], pages: [], tops: [], scale: 1, mode: o.start, cur: 0, io: null, gen: 0, pinch: false };
    function pad() { return parseFloat(getComputedStyle(pagesEl).paddingLeft) || 0; }
    function widest() { return S.sizes.reduce(function (m, z) { return Math.max(m, z.w); }, 1); }
    function fitScale() { return fitWidth(sc.clientWidth, widest(), pad()); }
    function autoScale() { return o.start === "fit" ? fitScale() : startScale(sc.clientWidth, widest(), pad(), TOUCH); }
    function modeScale() { return S.mode === "free" ? S.scale : S.mode === "fit" ? fitScale() : autoScale(); }

    // Drops the drawn pages and stops pending work.
    function clear() {
      S.gen++;
      if (S.io) { S.io.disconnect(); S.io = null; }
      S.pages.forEach(free);
      S.pages = []; S.tops = []; S.sizes = []; S.doc = null; S.cur = 0;
      pagesEl.textContent = "";
      o.of.textContent = ""; o.num.value = "1";
    }
    // Lays out every page of doc and goes to page `at` (1-based). Resolves true once the pages stand, false if superseded.
    function show(doc, at) {
      clear();
      S.doc = doc;
      var gen = S.gen;
      return doc.getPage(1).then(function (p1) {
        if (gen !== S.gen) return false;
        var vp = p1.getViewport({ scale: 1 }), n = doc.numPages;
        var frag = document.createDocumentFragment();
        for (var i = 0; i < n; i++) {
          S.sizes.push({ w: vp.width, h: vp.height });
          var el = document.createElement("div");
          el.className = "pdfv-p";
          el.setAttribute("data-n", String(i + 1));
          el.setAttribute("role", "img");
          el.setAttribute("aria-label", o.word + " " + (i + 1) + " / " + n);
          frag.appendChild(el);
          S.pages.push({ el: el, canvas: null, at: 0, job: null, vis: false, proxy: i ? null : p1 });
        }
        pagesEl.appendChild(frag);
        o.of.textContent = "/ " + n;
        S.mode = o.start; S.scale = autoScale(); S.cur = 0;
        layout();
        sc.scrollTop = 0; sc.scrollLeft = 0;
        if (at > 1) goTo(at);
        observe();
        sizes(gen, 2);
        return true;
      });
    }
    // Every page's own size, read in the background; the layout follows any page that differs from page 1.
    function sizes(gen, n) {
      if (gen !== S.gen || n > S.pages.length) return;
      S.doc.getPage(n).then(function (p) {
        if (gen !== S.gen) return;
        var vp = p.getViewport({ scale: 1 }), z = S.sizes[n - 1], pg = S.pages[n - 1];
        pg.proxy = p;
        if (Math.abs(vp.width - z.w) > 0.5 || Math.abs(vp.height - z.h) > 0.5) {
          S.sizes[n - 1] = { w: vp.width, h: vp.height };
          pg.at = 0;
          zoomTo(modeScale(), 0, 0, S.mode);
        }
        sizes(gen, n + 1);
      }, function (e) { if (gen === S.gen) console.error(e); });
    }
    function layout() {
      var s = S.scale;
      S.pages.forEach(function (p, i) {
        p.el.style.width = Math.round(S.sizes[i].w * s) + "px";
        p.el.style.height = Math.round(S.sizes[i].h * s) + "px";
      });
      S.tops = S.pages.map(function (p) { return p.el.offsetTop; });
      o.pct.textContent = percent(s) + "%";
      o.zin.disabled = s >= MAX - 1e-6;
      o.zout.disabled = s <= MIN + 1e-6;
    }
    // A point of the content, kept as page + fraction, so it can be put back under the same finger after a zoom.
    function anchorAt(vx, vy) {
      var y = sc.scrollTop + vy, i = pageAt(S.tops, y), el = S.pages[i].el;
      return { i: i, fx: (sc.scrollLeft + vx - el.offsetLeft) / el.offsetWidth, fy: (y - el.offsetTop) / el.offsetHeight };
    }
    function anchorTo(a, vx, vy) {
      var el = S.pages[a.i].el;
      sc.scrollLeft = el.offsetLeft + a.fx * el.offsetWidth - vx;
      sc.scrollTop = el.offsetTop + a.fy * el.offsetHeight - vy;
    }
    function zoomTo(s, vx, vy, mode) {
      if (!S.pages.length) return;
      if (vx == null) { vx = sc.clientWidth / 2; vy = sc.clientHeight / 2; }
      var a = anchorAt(vx, vy);
      S.scale = clamp(s); S.mode = mode || "free";
      layout();
      anchorTo(a, vx, vy);
      onScroll();
      schedule(140);
    }
    function goTo(n) {
      if (!S.pages.length) return;
      n = Math.max(1, Math.min(S.pages.length, n | 0));
      sc.scrollTop = S.tops[n - 1] - pad();
      S.cur = n - 1;
      o.num.value = String(n);
    }
    function onScroll() {
      if (!S.tops.length) return;
      var i = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2 ? S.pages.length - 1 : pageAt(S.tops, sc.scrollTop + sc.clientHeight * 0.4);
      S.cur = i;
      if (document.activeElement !== o.num) o.num.value = String(i + 1);
    }
    var scrollRaf = 0;
    sc.addEventListener("scroll", function () {
      if (!scrollRaf) scrollRaf = requestAnimationFrame(function () { scrollRaf = 0; onScroll(); });
    }, { passive: true });

    // ---- drawing ----
    function observe() {
      S.io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var p = S.pages[+e.target.getAttribute("data-n") - 1];
          if (p) p.vis = e.isIntersecting;
        });
        schedule(0);
      }, { root: sc, rootMargin: "60% 0px 60% 0px" });
      S.pages.forEach(function (p) { S.io.observe(p.el); });
    }
    var timer = 0, running = 0;
    function schedule(delay) {
      clearTimeout(timer);
      timer = setTimeout(function () { requestAnimationFrame(pump); }, delay || 0);
    }
    function zero(c) { c.width = 0; c.height = 0; }
    function stop(p) {
      if (!p.job) return;
      p.job.off = true;
      if (p.job.t) p.job.t.cancel();
      p.job = null;
    }
    function free(p) {
      stop(p);
      if (p.canvas) { zero(p.canvas); p.canvas.remove(); p.canvas = null; }
      if (p.at && p.proxy) p.proxy.cleanup();
      p.at = 0;
      p.el.classList.remove("on");
    }
    function pump() {
      if (S.pinch || !S.pages.length) return;
      S.pages.forEach(function (p) {
        if (!p.vis && (p.canvas || p.job)) free(p);
        else if (p.job && p.job.scale !== S.scale) stop(p);
      });
      var want = [];
      S.pages.forEach(function (p, i) { if (p.vis && p.at !== S.scale && !p.job) want.push(i); });
      want.sort(function (a, b) { return Math.abs(a - S.cur) - Math.abs(b - S.cur); });
      while (running < 2 && want.length) draw(want.shift());
    }
    function draw(i) {
      var p = S.pages[i], gen = S.gen, scale = S.scale, job = { scale: scale, off: false, t: null };
      p.job = job;
      running++;
      (p.proxy ? Promise.resolve(p.proxy) : S.doc.getPage(i + 1)).then(function (page) {
        p.proxy = page;
        if (job.off) return null;
        var vp = page.getViewport({ scale: scale });
        var os = outputScale(window.devicePixelRatio, vp.width, vp.height, MAXPX);
        var c = document.createElement("canvas");
        c.width = Math.floor(vp.width * os);
        c.height = Math.floor(vp.height * os);
        job.t = page.render({ canvasContext: c.getContext("2d", { alpha: false }), viewport: vp, transform: os !== 1 ? [os, 0, 0, os, 0, 0] : null });
        return job.t.promise.then(function () { return c; }, function (e) { zero(c); throw e; });
      }).then(function (c) {
        if (!c) return;
        if (job.off || gen !== S.gen) { zero(c); return; }
        // The old canvas stays until the sharper one is ready, so a zoom never flashes white.
        if (p.canvas) { zero(p.canvas); p.canvas.remove(); }
        p.el.appendChild(c);
        p.canvas = c; p.at = scale;
        p.el.classList.add("on");
      }, function (e) {
        if (!job.off && !(e && e.name === "RenderingCancelledException")) console.error(e);
      }).then(function () {
        if (p.job === job) p.job = null;
        running--;
        if (gen === S.gen) schedule(0);
      });
    }

    // ---- controls ----
    function zoomIn() { zoomTo(zoomStep(S.scale, 1)); }
    function zoomOut() { zoomTo(zoomStep(S.scale, -1)); }
    function fit() { zoomTo(fitScale(), null, null, "fit"); }
    o.root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (!b || b.disabled || !o.root.contains(b)) return;
      var act = b.getAttribute("data-act");
      if (act === "in") zoomIn();
      else if (act === "out") zoomOut();
      else if (act === "fit") fit();
    });
    o.num.addEventListener("focus", function () { o.num.select(); });
    o.num.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); goTo(parseInt(o.num.value, 10) || S.cur + 1); sc.focus({ preventScroll: true }); }
    });
    o.num.addEventListener("blur", function () { o.num.value = String(S.cur + 1); });
    // Zoom and page keys; true when the key was used.
    function key(e) {
      var k = e.key, mod = e.ctrlKey || e.metaKey, inInput = e.target === o.num, act = null;
      if (k === "+" || k === "=" || k === "Add") act = zoomIn;
      else if ((k === "-" || k === "_" || k === "Subtract") && (mod || !inInput)) act = zoomOut;
      else if (k === "0" && (mod || !inInput)) act = fit;
      else if (inInput || mod || e.altKey) return false;
      else if (k === "PageDown" || (o.arrows && k === "ArrowRight") || k === "n" || k === "j") act = function () { goTo(S.cur + 2); };
      else if (k === "PageUp" || (o.arrows && k === "ArrowLeft") || k === "p" || k === "k") act = function () { goTo(S.cur); };
      else if (k === "Home") act = function () { goTo(1); };
      else if (k === "End") act = function () { goTo(S.pages.length); };
      if (!act) return false;
      e.preventDefault();
      act();
      return true;
    }
    function rel(t) { var r = sc.getBoundingClientRect(); return { x: t.clientX - r.left, y: t.clientY - r.top }; }
    // ctrl + wheel, and the pinch of a laptop touchpad (which browsers report the same way), zoom around the pointer.
    o.wheel.addEventListener("wheel", function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      if (!S.pages.length) return;
      var p = rel(e);
      zoomTo(S.scale * wheelFactor(e.deltaY, e.deltaMode), p.x, p.y, "free");
    }, { passive: false });

    // Touch: one finger scrolls natively (touch-action: pan-x pan-y, which also keeps the browser from zooming the whole
    // page); two fingers scale the drawn pages with a CSS transform while they move, and on release the layout takes the
    // new scale and the pages are drawn again.
    var T = null, tapStart = null, lastTap = null, lastTouch = 0;
    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
    sc.addEventListener("touchstart", function (e) {
      lastTouch = Date.now();
      if (e.touches.length === 2 && S.pages.length) {
        var a = rel(e.touches[0]), b = rel(e.touches[1]), m = mid(a, b);
        T = { d0: dist(a, b), m0: m, m1: m, r: 1, s0: S.scale, an: anchorAt(m.x, m.y) };
        pagesEl.style.transformOrigin = (sc.scrollLeft + m.x) + "px " + (sc.scrollTop + m.y) + "px";
        S.pinch = true; tapStart = null; lastTap = null;
        o.root.classList.add("pinching");
      } else if (e.touches.length === 1) {
        var q = rel(e.touches[0]);
        tapStart = { x: q.x, y: q.y, t: Date.now(), moved: false };
      } else tapStart = null;
    }, { passive: true });
    sc.addEventListener("touchmove", function (e) {
      if (T && e.touches.length === 2) {
        if (e.cancelable) e.preventDefault();
        var a = rel(e.touches[0]), b = rel(e.touches[1]), m = mid(a, b);
        T.r = pinchRatio(T.s0, T.d0, dist(a, b)); T.m1 = m;
        pagesEl.style.transform = "translate(" + (m.x - T.m0.x) + "px," + (m.y - T.m0.y) + "px) scale(" + T.r + ")";
      } else if (tapStart && e.touches.length === 1) {
        var q = rel(e.touches[0]);
        if (Math.abs(q.x - tapStart.x) > 10 || Math.abs(q.y - tapStart.y) > 10) tapStart.moved = true;
      }
    }, { passive: false });
    function endPinch() {
      var t = T;
      T = null; S.pinch = false;
      o.root.classList.remove("pinching");
      pagesEl.style.transform = ""; pagesEl.style.transformOrigin = "";
      S.scale = clamp(t.s0 * t.r); S.mode = "free";
      layout();
      anchorTo(t.an, t.m1.x, t.m1.y);
      onScroll();
      schedule(60);
    }
    function dbl(x, y) {
      var f = fitScale();
      zoomTo(doubleTapTarget(S.scale, f), x, y, S.scale < f * 1.5 ? "free" : "fit");
    }
    sc.addEventListener("touchend", function (e) {
      if (T) { if (e.touches.length < 2) endPinch(); tapStart = null; return; }
      if (tapStart && !tapStart.moved && !e.touches.length && Date.now() - tapStart.t < 300) {
        var now = Date.now();
        if (lastTap && now - lastTap.t < 320 && Math.abs(tapStart.x - lastTap.x) < 30 && Math.abs(tapStart.y - lastTap.y) < 30) {
          lastTap = null;
          if (e.cancelable) e.preventDefault();
          dbl(tapStart.x, tapStart.y);
        } else lastTap = { x: tapStart.x, y: tapStart.y, t: now };
      }
      tapStart = null;
    });
    sc.addEventListener("touchcancel", function () { if (T) endPinch(); tapStart = null; });
    sc.addEventListener("dblclick", function (e) {
      if (Date.now() - lastTouch < 800 || !S.pages.length) return;
      var p = rel(e);
      dbl(p.x, p.y);
    });
    var rz = 0;
    window.addEventListener("resize", function () {
      if (!o.active() || !S.pages.length) return;
      clearTimeout(rz);
      rz = setTimeout(function () {
        S.pages.forEach(function (p) { p.at = 0; });
        zoomTo(modeScale(), null, null, S.mode);
      }, 100);
    });
    return { show: show, clear: clear, goTo: goTo, key: key, count: function () { return S.pages.length; }, cur: function () { return S.cur + 1; } };
  }

  // ---- the full-screen dialog #pdfv ----
  var $ = function (sel) { return root.querySelector(sel); };
  var titleEl = $(".pdfv-t"), metaEl = $(".pdfv-m"), dlEl = $(".pdfv-dl"), loadEl = $(".pdfv-load"), barEl = $(".pdfv-prog i"),
    errEl = $(".pdfv-err"), openEl = $(".pdfv-open"), hintEl = $(".pdfv-hint");
  var D = View({ root: root, sc: $(".pdfv-sc"), pages: $(".pdfv-pages"), num: $(".pdfv-n"), of: $(".pdfv-of"), pct: $(".pdfv-pct"),
    zin: $('[data-act="in"]'), zout: $('[data-act="out"]'), word: ($(".pdfv-pg .sr") || {}).textContent || "", start: "auto", wheel: root, arrows: true,
    active: function () { return !root.hidden; } });
  var DS = { slug: null, opener: null, seq: 0 };
  var R = null; // the in-page reader, when this page has one

  function cardOf(slug) { return document.querySelector('[data-pdfv-card="' + slug + '"]'); }
  // Opens the document of card `slug` on page `at` (1 when left out).
  function open(slug, opener, at) {
    var card = cardOf(slug);
    if (!card) return false;
    var dl = card.querySelector("a[download]"), url = dl.getAttribute("href"), seq = ++DS.seq;
    D.clear();
    DS.slug = slug;
    DS.opener = opener || card.querySelector(".pdfc-view");
    titleEl.textContent = card.querySelector("h3").textContent;
    metaEl.textContent = card.querySelector(".or-meta").textContent;
    dlEl.href = url; dlEl.setAttribute("download", dl.getAttribute("download")); openEl.href = url;
    errEl.hidden = true; loadEl.hidden = false; setBar(barEl, 0);
    root.hidden = false;
    document.documentElement.classList.add("pdfv-open");
    $(".pdfv-sc").focus({ preventScroll: true });
    getDoc(url, function (f) { if (seq === DS.seq) setBar(barEl, f); }).then(function (doc) {
      if (seq !== DS.seq) return;
      return D.show(doc, at || 1).then(function (ok) {
        if (!ok || seq !== DS.seq) return;
        loadEl.hidden = true;
        hint(hintEl);
      });
    }).catch(function (e) {
      if (seq !== DS.seq) return;
      console.error(e);
      loadEl.hidden = true; errEl.hidden = false;
    });
    return true;
  }
  function hide() {
    if (root.hidden) return;
    var slug = DS.slug, page = D.count() ? D.cur() : 0;
    DS.seq++;
    D.clear();
    root.hidden = true;
    hintEl.hidden = true;
    document.documentElement.classList.remove("pdfv-open");
    if (R && page) R.follow(slug, page);
    if (DS.opener && document.contains(DS.opener)) DS.opener.focus({ preventScroll: true });
    DS.opener = null;
  }
  // The viewer has its own history entry, so the browser's back button closes it; the close button does the same.
  function close() {
    if (history.state && history.state.pdfv) history.back();
    else hide();
  }
  function openWithHistory(slug, opener, at) {
    history.pushState({ pdfv: slug }, "", HASH + slug);
    open(slug, opener, at);
  }
  function hashSlug() { return location.hash.indexOf(HASH) === 0 ? location.hash.slice(HASH.length) : ""; }
  window.addEventListener("popstate", function (e) {
    var slug = e.state && e.state.pdfv;
    // A #goruntule-<slug> typed into the address bar arrives without state; it becomes the viewer's entry.
    if (!slug && hashSlug() && cardOf(hashSlug())) { slug = hashSlug(); history.replaceState({ pdfv: slug }, "", HASH + slug); }
    if (slug && cardOf(slug)) { if (root.hidden || DS.slug !== slug) open(slug, null); }
    else hide();
  });
  root.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (b && !b.disabled && b.getAttribute("data-act") === "close") close();
  });
  function focusables() {
    return [].filter.call(root.querySelectorAll("button, a[href], input, [tabindex='0']"), function (el) { return !el.disabled && el.offsetParent !== null; });
  }
  document.addEventListener("keydown", function (e) {
    if (root.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "Tab") {
      var f = focusables(), first = f[0], last = f[f.length - 1];
      if (!f.length) return;
      if (!root.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      return;
    }
    D.key(e);
  });

  // ---- the in-page reader #pdfr (/<lang>/ornek/#oku) ----
  function reader(el) {
    var pick = function (sel) { return el.querySelector(sel); };
    var sec = el.closest(".pdfr-sec") || el;
    var tabs = [].slice.call(el.querySelectorAll('[role="tab"]'));
    var sc = pick(".pdfr-sc"), loadR = pick(".pdfr-load"), barR = pick(".pdfr-prog i"), errR = pick(".pdfr-err"), hintR = pick(".pdfr-hint");
    var dls = [].slice.call(el.querySelectorAll("a[download]")), opens = [].slice.call(el.querySelectorAll(".pdfr-open"));
    var V = View({ root: el, sc: sc, pages: pick(".pdfv-pages"), num: pick(".pdfr-n"), of: pick(".pdfr-of"), pct: pick(".pdfr-pct"),
      zin: pick('[data-act="in"]'), zout: pick('[data-act="out"]'), word: (pick(".pdfr-pg .sr") || {}).textContent || "", start: "fit", wheel: sc, arrows: false,
      active: function () { return !sec.hidden; } });
    var st = { slug: tabs[0].getAttribute("data-slug"), started: false, seq: 0, at: {} };
    function tabOf(slug) { return tabs.filter(function (t) { return t.getAttribute("data-slug") === slug; })[0]; }
    function load() {
      var seq = ++st.seq, slug = st.slug, url = tabOf(slug).getAttribute("data-href");
      V.clear();
      errR.hidden = true; loadR.hidden = false; setBar(barR, 0);
      el.classList.add("busy");
      getDoc(url, function (f) { if (seq === st.seq) setBar(barR, f); }).then(function (doc) {
        if (seq !== st.seq) return;
        return V.show(doc, st.at[slug] || 1).then(function (ok) {
          if (!ok || seq !== st.seq) return;
          loadR.hidden = true;
          el.classList.remove("busy");
          hint(hintR);
        });
      }).catch(function (e) {
        if (seq !== st.seq) return;
        console.error(e);
        loadR.hidden = true; el.classList.remove("busy"); errR.hidden = false;
      });
    }
    function start() { if (!st.started) { st.started = true; load(); } }
    // Switching back to a document returns to the page it was left on.
    function select(slug) {
      if (slug === st.slug) return;
      if (V.count()) st.at[st.slug] = V.cur();
      st.slug = slug;
      var t = tabOf(slug), href = t.getAttribute("data-href"), file = t.getAttribute("data-file");
      tabs.forEach(function (b) {
        var on = b === t;
        b.setAttribute("aria-selected", on ? "true" : "false");
        b.tabIndex = on ? 0 : -1;
      });
      sc.setAttribute("aria-labelledby", t.id);
      dls.forEach(function (a) { a.href = href; a.setAttribute("download", file); });
      opens.forEach(function (a) { a.href = href; });
      if (st.started) load();
    }
    // The PDF is fetched only once the reader comes within 300 px of the screen (or a tab is chosen).
    var near = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { near.disconnect(); start(); }
    }, { rootMargin: "300px 0px" });
    near.observe(el);
    el.addEventListener("click", function (e) {
      var t = e.target.closest('[role="tab"]');
      if (t && el.contains(t)) { select(t.getAttribute("data-slug")); start(); return; }
      var b = e.target.closest('[data-act="full"]');
      if (b && el.contains(b)) openWithHistory(st.slug, b, V.count() ? V.cur() : 1);
    });
    el.addEventListener("keydown", function (e) {
      var i = tabs.indexOf(e.target);
      if (i >= 0) {
        var j = tabMove(i, tabs.length, e.key, getComputedStyle(el).direction === "rtl");
        if (j < 0) return;
        e.preventDefault();
        tabs[j].focus();
        select(tabs[j].getAttribute("data-slug"));
        start();
        return;
      }
      if (root.hidden && !(e.target.closest && e.target.closest("a, button"))) V.key(e);
    });
    sec.hidden = false;
    return { follow: function (slug, page) { if (slug === st.slug && V.count()) V.goTo(page); } };
  }
  var rdrEl = document.getElementById("pdfr");
  if (rdrEl) R = reader(rdrEl);

  // ---- entry points ----
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[data-pdfv]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    var slug = a.getAttribute("data-pdfv");
    if (!cardOf(slug)) return;
    e.preventDefault();
    openWithHistory(slug, a.classList.contains("pdfc-paper") ? null : a);
  });
  // The library is fetched as soon as a View button is touched or hovered, before the click lands.
  ["pointerover", "focusin", "touchstart"].forEach(function (ev) {
    document.addEventListener(ev, function (e) { if (e.target.closest && e.target.closest("a[data-pdfv]")) loadLib().catch(function () { libP = null; }); }, { passive: true });
  });
  var m = hashSlug();
  if (m && cardOf(m)) {
    if (!(history.state && history.state.pdfv === m)) {
      history.replaceState(null, "", location.pathname + location.search);
      history.pushState({ pdfv: m }, "", HASH + m);
    }
    open(m, null);
  }
})();
