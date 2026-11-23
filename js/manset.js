// Bilgi Merkezi story circles on /tr/ (markup: bilgi-uret.js homeBlock, styles: site/manset.css).
// Without JS every circle is a link to its list page. With it a circle opens its articles one at a time, full screen,
// starting at the first one the reader has not seen: the right part of the card (or Right key) goes on, the left part
// (or Left key) goes back, a sideways swipe jumps to the next or previous circle, and a swipe down, Escape, the back
// button or the close button closes it. "Yazıyı oku" opens the article itself.
// Each card moves on after DURATION. Pressing and holding pauses it, the pause button stops it (WCAG 2.2.2), and under
// prefers-reduced-motion it never moves on by itself. Seen articles are remembered in this browser only; a circle whose
// articles were all seen loses its gold ring. The sample letter tab under the header is hidden by the stylesheet while
// the row is on screen (its first circle is the same letter); this script sets html.hk-out when the row leaves the screen
// or is the wide-screen column, and at once where it cannot watch the row.
// The arithmetic is exported for test/bilgi.test.js.
(function () {
  "use strict";
  var DURATION = 9000, HOLD = 220, SWIPE = 60, CLOSE_DRAG = 90, KEY = "istinafy-hk-seen", KEEP = 300;
  var RAIL = "(min-width: 1400px)";
  // The first card in `urls` not in `seen`; 0 when all were seen, so the circle starts over.
  function firstUnseen(urls, seen) {
    for (var i = 0; i < urls.length; i++) if (seen.indexOf(urls[i]) < 0) return i;
    return 0;
  }
  // Where one step from card i of circle g lands, as [circle, card]: within the circle, else the next circle's first card
  // or the previous circle's last card. Back on the very first card stays there; on past the very last card is null (close).
  function move(g, i, d, sizes) {
    var j = i + d;
    if (j >= 0 && j < sizes[g]) return [g, j];
    var h = g + (d > 0 ? 1 : -1);
    if (h < 0) return [g, 0];
    if (h >= sizes.length) return null;
    return [h, d > 0 ? 0 : sizes[h] - 1];
  }
  // The circle a sideways swipe jumps to; -1 past either end.
  function jump(g, d, n) { var h = g + d; return h >= 0 && h < n ? h : -1; }
  // The remembered list after seeing `url`: no duplicates, the newest KEEP kept.
  function remember(list, url) {
    if (list.indexOf(url) >= 0) return list;
    return list.concat([url]).slice(-KEEP);
  }
  var api = { DURATION: DURATION, HOLD: HOLD, RAIL: RAIL, firstUnseen: firstUnseen, move: move, jump: jump, remember: remember };
  if (typeof module === "object" && module.exports) { module.exports = api; return; }

  var nav = document.getElementById("bilgi"), tpl = document.getElementById("hk-data");
  if (!nav) return;
  var html = document.documentElement;
  var rail = window.matchMedia ? window.matchMedia(RAIL) : null, inView = true;
  var paintTab = function () { html.classList.toggle("hk-out", !inView || !!(rail && rail.matches)); };
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { inView = es[es.length - 1].isIntersecting; paintTab(); }).observe(nav);
  else inView = false;
  if (rail && rail.addEventListener) rail.addEventListener("change", paintTab);
  paintTab();
  if (!tpl || !tpl.content) return;
  var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var cards = [].map.call(tpl.content.querySelectorAll("a"), function (a) {
    var tm = a.querySelector("time");
    return { u: a.getAttribute("href"), c: a.getAttribute("data-c"), s: a.getAttribute("data-s"), m: a.getAttribute("data-m"), w: a.getAttribute("data-w") || "",
      t: a.querySelector("b").textContent, p: a.querySelector("i").textContent, d: tm.textContent, dt: tm.getAttribute("datetime") };
  });
  var groups = [].map.call(nav.querySelectorAll("a[data-hk]"), function (el) {
    var im = el.querySelector(".hk-ph img");
    return { el: el, name: el.querySelector(".hk-lb").textContent, href: el.getAttribute("href"), av: im ? im.getAttribute("src") : "",
      items: el.getAttribute("data-hk").split(" ").map(function (n) { return cards[+n]; }).filter(Boolean) };
  }).filter(function (g) { return g.items.length; });
  if (!groups.length) return;
  var sizes = groups.map(function (g) { return g.items.length; });
  var urls = function (g) { return g.items.map(function (c) { return c.u; }); };

  // localStorage is missing or refuses writes in private windows and with blocked site data; the rings then stay gold.
  var seen = [];
  try { seen = JSON.parse(localStorage.getItem(KEY) || "[]"); if (!Array.isArray(seen)) seen = []; } catch (e) { seen = []; }
  function markSeen(u) {
    seen = remember(seen, u);
    try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch (e) { /* kept for this visit only, see above */ }
  }
  function paintRings() {
    groups.forEach(function (g) { g.el.classList.toggle("is-seen", g.items.every(function (c) { return seen.indexOf(c.u) >= 0; })); });
  }
  paintRings();

  // ---- the viewer, built on first use ----
  var V = null, S = { g: 0, i: 0, playing: !reduce, opener: null, down: false, held: false, skip: false, x0: 0, y0: 0, holdT: 0 };
  function el(tag, cls, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }
  function button(cls, label, parent) {
    var b = el("button", cls, parent);
    b.type = "button";
    b.setAttribute("aria-label", label);
    return b;
  }
  var CHEV = function (d) {
    return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="' + (d < 0 ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7")
      + '" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  };
  function build() {
    var v = {};
    v.root = el("div", "hkv");
    v.root.hidden = true;
    v.root.setAttribute("role", "dialog");
    v.root.setAttribute("aria-modal", "true");
    v.root.setAttribute("aria-labelledby", "hkv-h");
    v.bg = el("div", "hkv-bg", v.root);
    var stage = el("div", "hkv-stage", v.root);
    v.card = el("div", "hkv-card", stage);
    var top = el("div", "hkv-top", v.card);
    v.bars = el("div", "hkv-bars", top);
    v.bars.setAttribute("aria-hidden", "true");
    var head = el("div", "hkv-head", top);
    var av = el("span", "hkv-av", head);
    v.av = el("img", "", av);
    v.av.alt = "";
    v.g = el("a", "hkv-g", head);
    v.n = el("span", "hkv-n", head);
    v.play = button("hkv-i hkv-play", "", head);
    el("span", "hkv-pi", v.play);
    v.play.hidden = reduce;
    v.x = button("hkv-i hkv-x", "Kapat", head);
    v.x.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
    v.body = el("div", "hkv-body", v.card);
    v.ph = el("div", "hkv-ph", v.body);
    var pic = el("picture", "", v.ph);
    v.src = el("source", "", pic);
    v.src.type = "image/webp";
    v.img = el("img", "", pic);
    v.img.alt = "";
    v.img.width = 1600;
    v.img.height = 900;
    v.img.decoding = "async";
    v.img.addEventListener("load", function () { v.ph.classList.remove("is-ld"); });
    v.img.addEventListener("error", function () { v.ph.classList.remove("is-ld"); });
    v.chip = el("span", "hkv-chip", v.body);
    v.h = el("h2", "hkv-h", v.body);
    v.h.id = "hkv-h";
    v.p = el("p", "hkv-p", v.body);
    v.d = el("time", "hkv-d", v.body);
    var foot = el("div", "hkv-foot", v.card);
    v.go = el("a", "hkv-go", foot);
    v.go.innerHTML = 'Yazıyı oku <span aria-hidden="true">→</span>';
    v.tp = button("hkv-tap hkv-tp", "Önceki yazı", v.card);
    v.tn = button("hkv-tap hkv-tn", "Sonraki yazı", v.card);
    v.ap = button("hkv-arr hkv-ap", "Önceki yazı", stage);
    v.ap.innerHTML = CHEV(-1);
    v.an = button("hkv-arr hkv-an", "Sonraki yazı", stage);
    v.an.innerHTML = CHEV(1);
    document.body.appendChild(v.root);

    v.x.addEventListener("click", close);
    v.play.addEventListener("click", function () { setPlaying(!S.playing); });
    [[v.tp, -1], [v.tn, 1], [v.ap, -1], [v.an, 1]].forEach(function (p) {
      p[0].addEventListener("click", function () {
        if (S.skip) { S.skip = false; return; }
        step(p[1], true);
      });
    });
    v.card.addEventListener("pointerdown", function (e) {
      S.skip = false;
      if (e.target.closest("a, .hkv-i")) return;
      S.down = true; S.held = false; S.x0 = e.clientX; S.y0 = e.clientY;
      clearTimeout(S.holdT);
      S.holdT = setTimeout(function () { S.held = true; v.root.classList.add("is-held"); }, HOLD);
    });
    v.card.addEventListener("pointerup", function (e) {
      if (!S.down) return;
      S.down = false;
      clearTimeout(S.holdT);
      v.root.classList.remove("is-held");
      var dx = e.clientX - S.x0, dy = e.clientY - S.y0;
      if (dy > CLOSE_DRAG && Math.abs(dx) < dy) { S.skip = true; close(); return; }
      if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy)) { S.skip = true; jumpTo(dx < 0 ? 1 : -1); return; }
      // A hold only pauses; the click that follows must not also move on.
      if (S.held) S.skip = true;
    });
    v.card.addEventListener("pointercancel", function () {
      S.down = false;
      clearTimeout(S.holdT);
      v.root.classList.remove("is-held");
    });
    // A card that is still filling its bar moves on when the bar is full (an animation end, so pausing it is the CSS's job).
    v.bars.addEventListener("animationend", function () { step(1, false); });
    document.addEventListener("visibilitychange", function () { v.root.classList.toggle("is-held", document.hidden); });
    return v;
  }
  function setPlaying(on) {
    S.playing = on && !reduce;
    V.root.classList.toggle("is-paused", !S.playing);
    V.play.setAttribute("aria-label", S.playing ? "Otomatik geçişi durdur" : "Otomatik geçişi başlat");
  }
  function show(g, i, byUser) {
    S.g = g; S.i = i;
    var G = groups[g], c = G.items[i];
    V.bars.textContent = "";
    G.items.forEach(function (it, k) {
      var s = el("span", k < i ? "done" : k === i ? "cur" : "", V.bars);
      var bar = el("i", "", s);
      if (k === i) bar.style.animationDuration = DURATION + "ms";
    });
    V.av.src = G.av;
    V.g.textContent = G.name;
    V.g.href = G.href;
    V.n.textContent = (i + 1) + " / " + G.items.length;
    V.bg.style.backgroundImage = 'url("' + c.s + '")';
    V.ph.classList.add("is-ld");
    V.src.srcset = c.w;
    V.src.sizes = "(min-width: 600px) 440px, 100vw";
    V.img.sizes = "(min-width: 600px) 440px, 100vw";
    V.img.srcset = c.s + " 800w, " + c.m + " 1200w";
    V.img.src = c.m;
    if (V.img.complete && V.img.naturalWidth) V.ph.classList.remove("is-ld");
    V.chip.textContent = c.c;
    V.h.textContent = c.t;
    V.p.textContent = c.p;
    V.d.textContent = c.d;
    V.d.dateTime = c.dt;
    V.go.href = c.u;
    // A card the reader moved to is read out; one the timer brought is not, so a screen reader is not talked over.
    V.body.setAttribute("aria-live", byUser ? "polite" : "off");
    markSeen(c.u);
    var n = move(g, i, 1, sizes);
    if (n) { var pre = new Image(); pre.src = groups[n[0]].items[n[1]].s; }
  }
  function step(d, byUser) {
    var n = move(S.g, S.i, d, sizes);
    if (!n) { close(); return; }
    show(n[0], n[1], byUser);
  }
  function jumpTo(d) {
    var h = jump(S.g, d, groups.length);
    if (h < 0) { if (d > 0) close(); return; }
    show(h, firstUnseen(urls(groups[h]), seen), true);
  }
  function open(g, opener) {
    if (!V) V = build();
    S.opener = opener;
    setPlaying(S.playing);
    V.root.hidden = false;
    html.classList.add("hkv-open");
    history.pushState({ hk: 1 }, "", "#hikaye");
    show(g, firstUnseen(urls(groups[g]), seen), true);
    V.x.focus({ preventScroll: true });
  }
  function hide() {
    if (!V || V.root.hidden) return;
    V.root.hidden = true;
    V.bars.textContent = "";
    html.classList.remove("hkv-open");
    paintRings();
    if (S.opener) S.opener.focus({ preventScroll: true });
  }
  // The viewer has its own history entry, so the phone's back button closes it; every other way out goes back too.
  function close() {
    if (history.state && history.state.hk) history.back();
    else hide();
  }
  window.addEventListener("popstate", function () { if (!(history.state && history.state.hk)) hide(); });
  // A reload on the viewer's address opens the page plainly.
  if (location.hash === "#hikaye") history.replaceState(null, "", location.pathname + location.search);

  document.addEventListener("keydown", function (e) {
    if (!V || V.root.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); step(e.key === "ArrowRight" ? 1 : -1, true); return; }
    if (e.key !== "Tab") return;
    var f = [].filter.call(V.root.querySelectorAll("a[href], button"), function (x) { return !x.hidden && x.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1], at = document.activeElement;
    if (e.shiftKey && (at === first || !V.root.contains(at))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (at === last || !V.root.contains(at))) { e.preventDefault(); first.focus(); }
  });
  nav.addEventListener("click", function (e) {
    var a = e.target.closest("a[data-hk]");
    if (!a || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    for (var g = 0; g < groups.length; g++) {
      if (groups[g].el === a) { e.preventDefault(); open(g, a); return; }
    }
  });
})();
