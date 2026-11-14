// Bilgi Merkezi reading tools. Loaded in <head> so a saved theme and text size apply before the first paint;
// everything else waits for the document. Without this script the pages are complete: these are conveniences.
(function () {
  var root = document.documentElement;
  root.className += " js";
  // Storage is blocked in some private windows; the page then simply uses the defaults.
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* defaults stay */ } }
  var SIZES = ["-1", "0", "1", "2"];
  var theme = get("bm-theme");
  if (theme === "light" || theme === "dark") root.setAttribute("data-theme", theme);
  var size = get("bm-size");
  if (size !== "0" && SIZES.indexOf(size) >= 0) root.setAttribute("data-size", size);

  document.addEventListener("DOMContentLoaded", function () {
    var top = document.querySelector(".top");
    var bar = document.querySelector(".bm-progress");
    var body = document.querySelector(".bm-art .bm-body");
    // Desktop contents list follows the section being read. Worked out on scroll: an IntersectionObserver misses a
    // jump past several headings (End key, a link), because none of them changed state.
    var links = {};
    document.querySelectorAll(".bm-toc a").forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
    var heads = body ? Array.prototype.filter.call(body.querySelectorAll("h2[id]"), function (h) { return links[h.id]; }) : [];
    var current = null;
    function follow() {
      if (!heads.length) return;
      var pick = heads[0];
      heads.forEach(function (h) { if (h.getBoundingClientRect().top < window.innerHeight * 0.35) pick = h; });
      if (pick === current) return;
      if (current) links[current.id].classList.remove("on");
      links[pick.id].classList.add("on");
      current = pick;
    }
    var ticking = false;
    function onScroll() {
      ticking = false;
      follow();
      if (top) top.classList.toggle("scrolled", window.scrollY > 10);
      if (bar && body) {
        var r = body.getBoundingClientRect();
        var span = r.height - window.innerHeight * 0.6;
        var p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
        root.style.setProperty("--bm-p", p.toFixed(4));
      }
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();

    document.querySelectorAll(".bm-toc-m a").forEach(function (a) {
      a.addEventListener("click", function () { a.closest("details").open = false; });
    });

    // A source cited several times: its back arrow returns to the marker the reader came from, not always the first.
    document.querySelectorAll(".bm-fn a[id]").forEach(function (a) {
      a.addEventListener("click", function () {
        var back = document.querySelector(a.getAttribute("href") + " .bm-back");
        if (back) back.setAttribute("href", "#" + a.id);
      });
    });

    // Text size and theme.
    var aaBtn = document.querySelector(".bm-aa-btn");
    var aa = document.getElementById("bm-aa");
    if (aaBtn && aa) {
      aaBtn.hidden = false;
      var mark = function () {
        var t = root.getAttribute("data-theme") || "auto";
        aa.querySelectorAll("[data-theme]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-theme") === t)); });
        var s = root.getAttribute("data-size") || "0";
        aa.querySelector('[data-size="-1"]').disabled = s === SIZES[0];
        aa.querySelector('[data-size="1"]').disabled = s === SIZES[SIZES.length - 1];
      };
      aaBtn.addEventListener("click", function () {
        aa.hidden = !aa.hidden;
        aaBtn.setAttribute("aria-expanded", String(!aa.hidden));
        mark();
      });
      document.addEventListener("click", function (e) {
        if (!aa.hidden && !aa.contains(e.target) && e.target !== aaBtn) { aa.hidden = true; aaBtn.setAttribute("aria-expanded", "false"); }
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !aa.hidden) { aa.hidden = true; aaBtn.setAttribute("aria-expanded", "false"); aaBtn.focus(); }
      });
      aa.querySelectorAll("[data-size]").forEach(function (b) {
        b.addEventListener("click", function () {
          var i = SIZES.indexOf(root.getAttribute("data-size") || "0") + Number(b.getAttribute("data-size"));
          var s = SIZES[Math.max(0, Math.min(SIZES.length - 1, i))];
          if (s === "0") root.removeAttribute("data-size"); else root.setAttribute("data-size", s);
          set("bm-size", s === "0" ? null : s);
          mark();
        });
      });
      aa.querySelectorAll("[data-theme]").forEach(function (b) {
        b.addEventListener("click", function () {
          var t = b.getAttribute("data-theme");
          if (t === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", t);
          set("bm-theme", t === "auto" ? null : t);
          mark();
        });
      });
    }

    // Copy link and the phone's own share sheet.
    var copy = document.querySelector(".bm-copy");
    if (copy && navigator.clipboard) {
      copy.hidden = false;
      copy.addEventListener("click", function () {
        var label = copy.textContent;
        navigator.clipboard.writeText(copy.getAttribute("data-url")).then(function () {
          copy.textContent = "Kopyalandı";
          setTimeout(function () { copy.textContent = label; }, 2000);
        }, function () { copy.textContent = "Kopyalanamadı"; });
      });
    }
    var native = document.querySelector(".bm-native");
    if (native && navigator.share) {
      native.hidden = false;
      native.addEventListener("click", function () {
        navigator.share({ title: document.querySelector("h1").textContent, url: native.getAttribute("data-url") }).catch(function () { /* closed by the reader */ });
      });
    }
  });
})();
