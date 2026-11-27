// Header on every page (site-uret.js header()): menu button, border once scrolled, language selector.
// Lawyer pages also get the sample-document tabs, citation highlights and the "all areas" button.
(function () {
  var hdr = document.getElementById("hdr"), btn = document.getElementById("menu-btn"), nav = document.getElementById("nav");
  if (hdr && btn && nav) {
    var setMenu = function (open) {
      hdr.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    };
    btn.addEventListener("click", function () { setMenu(!hdr.classList.contains("open")); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && hdr.classList.contains("open")) { setMenu(false); btn.focus(); }
    });
    document.addEventListener("click", function (e) { if (!hdr.contains(e.target)) setMenu(false); });
    var onScroll = function () { hdr.classList.toggle("sc", window.scrollY > 12); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // A full load of the other page, not an in-place rewrite: a phone's translation layer still running on the old page
  // kept translating the new text, which left pages half Turkish, half Dutch.
  var sel = document.getElementById("lang-select");
  if (sel) {
    var here = sel.value;
    sel.addEventListener("change", function () {
      var o = sel.options[sel.selectedIndex];
      try { localStorage.setItem("lang", o.lang || sel.value); } catch (e) { /* the folder in the address carries the choice */ }
      location.assign(o.getAttribute("data-href") + (o.hasAttribute("data-hash") ? location.hash : ""));
    });
    // Back button: a page restored from cache must not show the language the visitor left for.
    window.addEventListener("pageshow", function () { sel.value = here; });
  }

  // Sample document: two tabs (sources, notes) with arrow keys, and each underlined phrase lights its source row.
  var tabs = [].slice.call(document.querySelectorAll('.tabs [role="tab"]'));
  function pick(tab, focus) {
    tabs.forEach(function (x) {
      var on = x === tab;
      x.setAttribute("aria-selected", on ? "true" : "false");
      x.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(x.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { pick(tab, false); });
    tab.addEventListener("keydown", function (e) {
      var step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 1, ArrowUp: -1 }[e.key];
      if (document.documentElement.dir === "rtl" && (e.key === "ArrowRight" || e.key === "ArrowLeft")) step = -step;
      if (step) { e.preventDefault(); pick(tabs[(i + step + tabs.length) % tabs.length], true); }
      else if (e.key === "Home") { e.preventDefault(); pick(tabs[0], true); }
      else if (e.key === "End") { e.preventDefault(); pick(tabs[tabs.length - 1], true); }
    });
  });
  document.querySelectorAll(".page .cite").forEach(function (c) {
    var id = (c.getAttribute("href") || "").slice(1), row = id && document.getElementById(id);
    if (!row) return;
    var on = function () { c.classList.add("hi"); row.classList.add("hi"); };
    var off = function () { c.classList.remove("hi"); row.classList.remove("hi"); };
    c.addEventListener("mouseenter", on); c.addEventListener("focus", on);
    c.addEventListener("mouseleave", off); c.addEventListener("blur", off);
    c.addEventListener("click", function () { if (tabs.length) pick(tabs[0], false); });
  });

  var more = document.getElementById("dalm"), areas = document.getElementById("dallar");
  if (more && areas) more.addEventListener("click", function () {
    areas.classList.remove("lim");
    more.setAttribute("aria-expanded", "true");
    var next = areas.querySelectorAll(".dal details")[8];
    if (next) next.querySelector("summary").focus();
  });
})();
