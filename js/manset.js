/* Güncel band (bilgi-uret.js band, site/manset.css): on a phone the cards sit in one row that scrolls sideways.
   This script only adds the arrows and dots under that row; without it the row still scrolls by touch and every card is a link.
   Nothing turns by itself, and smooth scrolling is off when the reader asked for reduced motion. */
(function (factory) {
  var M = factory();
  if (typeof module === "object" && module.exports) module.exports = M;
  else if (typeof document !== "undefined") M.init(document, window);
})(function () {
  function clamp(i, n) { return Math.max(0, Math.min(n - 1, i)); }
  // Index of the card whose start is closest to the row's scroll position.
  function nearest(starts, x) {
    var best = 0;
    for (var i = 1; i < starts.length; i++) if (Math.abs(starts[i] - x) < Math.abs(starts[best] - x)) best = i;
    return best;
  }

  function init(doc, win) {
    var row = doc.getElementById("gb-row");
    if (!row) return null;
    var band = row.parentNode, nav = band.querySelector(".gb-nav");
    if (!nav) return null;
    var cards = row.querySelectorAll(".gb-c"), dots = nav.querySelectorAll(".gb-dots button");
    var prev = nav.querySelector(".gb-p"), next = nav.querySelector(".gb-n");
    var n = cards.length, cur = 0, queued = false;
    if (n < 2) return null;
    nav.hidden = false;

    function motion() {
      return !(win.matchMedia && win.matchMedia("(prefers-reduced-motion: reduce)").matches) ? "smooth" : "auto";
    }
    // Card starts measured from the first card, so the same numbers hold left to right and right to left.
    function starts() {
      var s = [], o = cards[0].offsetLeft;
      for (var i = 0; i < n; i++) s.push(Math.abs(cards[i].offsetLeft - o));
      return s;
    }
    function mark(i) {
      cur = i;
      for (var k = 0; k < dots.length; k++) {
        if (k === i) dots[k].setAttribute("aria-current", "true");
        else dots[k].removeAttribute("aria-current");
      }
      prev.disabled = i === 0;
      next.disabled = i === n - 1;
    }
    function go(i) {
      i = clamp(i, n);
      mark(i);
      cards[i].scrollIntoView({ behavior: motion(), block: "nearest", inline: "start" });
    }
    prev.addEventListener("click", function () { go(cur - 1); });
    next.addEventListener("click", function () { go(cur + 1); });
    for (var d = 0; d < dots.length; d++) {
      dots[d].addEventListener("click", function (e) { go(Number(e.currentTarget.getAttribute("data-i"))); });
    }
    row.addEventListener("scroll", function () {
      if (queued) return;
      queued = true;
      (win.requestAnimationFrame || function (f) { return win.setTimeout(f, 16); })(function () {
        queued = false;
        mark(nearest(starts(), Math.abs(row.scrollLeft)));
      });
    }, { passive: true });
    mark(0);
    return { go: go, current: function () { return cur; } };
  }

  return { clamp: clamp, nearest: nearest, init: init };
});
