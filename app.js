(function () {
  var cfg = window.SITE_CONFIG;
  var packs = window.I18N;
  var current = cfg.defaultLang;

  // U17: ?embed=1 leaves only the deadline calculator, for partner sites that show it in an iframe;
  // the credit link under it is the one brand-name link the embed carries.
  if (/[?&]embed=1(&|$)/.test(location.search || "")) {
    document.documentElement.className += " embed";
    var dlWrap = document.querySelector("#deadline .wrap");
    if (dlWrap) {
      var by = document.createElement("p"), byA = document.createElement("a");
      by.className = "embed-by";
      byA.href = location.origin + "/" + (pathLang() || cfg.defaultLang) + "/?utm_source=embed&utm_medium=iframe";
      byA.target = "_blank"; byA.rel = "noopener"; byA.textContent = "ISTINAFY";
      by.appendChild(byA); dlWrap.appendChild(by);
    }
  }

  function t(k) {
    var p = packs[current] || {};
    // Only the page's own pack is loaded, so there is no other pack to borrow from; test/dil.test.js keeps every pack complete.
    var v = p[k] != null ? p[k] : k;
    // French no-break spaces, as frSpaces in site-uret.js gives the built page: "»", ":" and "?" stay on their word's line.
    return current === "fr" && typeof v === "string" ? v.replace(/ (?=[:;?!»])/g, "\u00A0").replace(/« /g, "«\u00A0") : v;
  }

  // packs is a plain object: packs["constructor"] is truthy, so ?lang=constructor used to blank the page.
  function hasLang(c) {
    return typeof c === "string" && Object.prototype.hasOwnProperty.call(packs, c);
  }

  function pathLang() {
    var m = location.pathname.match(/^\/([a-z]{2})\//);
    return m && hasLang(m[1]) ? m[1] : null;
  }

  function pickInitialLang() {
    var fromUrl = new URLSearchParams(location.search).get("lang");
    if (hasLang(fromUrl)) return fromUrl;
    // /ar/, /nl/ ... are the crawlable per-language addresses; a shared link must open in its own language.
    var fromPath = pathLang();
    if (fromPath) return fromPath;
    try {
      var saved = localStorage.getItem("lang");
      if (hasLang(saved)) return saved;
    } catch (e) { /* storage blocked: fall through to browser language */ }
    // Walk the whole preference list: a phone set to German with Arabic second should get Arabic, not Turkish.
    var prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
    for (var i = 0; i < prefs.length; i++) {
      var raw = String(prefs[i]).toLowerCase();
      // Kurmanji may be reported as "kmr"; a plain two-letter slice would read it as Khmer ("km").
      var code = raw.indexOf("kmr") === 0 ? "ku" : raw.slice(0, 2);
      if (hasLang(code)) return code;
    }
    // A phone in a language we do not offer (German, Polish...) is far likelier to read English than Turkish.
    return packs.en ? "en" : cfg.defaultLang;
  }

  var CAL_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3V2Zm12 8H5v9h14v-9Z"/></svg>';

  // The prefilled first line tells the owner which language the person reads and what the calculator found.
  function waHref(text) {
    return "https://wa.me/" + String(cfg.whatsapp).replace(/[^0-9]/g, "") + "?text=" + encodeURIComponent(text);
  }

  // An unknown placeholder stays visible instead of vanishing, so a broken translation shows up in the message.
  function fill(tpl, vars) {
    return String(tpl).replace(/\{(\w)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
  }

  function apply(lang) {
    current = lang;
    var meta = cfg.languages.filter(function (l) { return l.code === lang; })[0];
    document.documentElement.lang = lang;
    document.documentElement.dir = meta ? meta.dir : "ltr";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-content]").forEach(function (el) {
      el.setAttribute("content", t(el.getAttribute("data-i18n-content")));
    });
    document.title = t("page_title");
    renderCountries();
    renderCountryLinks();
    var out = document.getElementById("dl-out");
    if (out.dataset.last) calc();
    try { localStorage.setItem("lang", lang); } catch (e) { /* not persisted; page still works */ }
  }

  function todayISO() {
    var d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
  }

  function formatDate(iso) {
    var p = iso.split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    // Browsers ship no Kurdish locale data and would silently fall back to the system language.
    var own = packs[current] || {};
    if (own.date_months && own.date_days) {
      return own.date_days.split("|")[d.getDay()] + ", " + d.getDate() + " " + own.date_months.split("|")[d.getMonth()] + " " + d.getFullYear();
    }
    try {
      return d.toLocaleDateString(current, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    } catch (e) {
      return iso;
    }
  }

  var COUNTRY = document.getElementById("dl-country");
  var TYPE = document.getElementById("dl-type");
  var CUSTOM_WRAP = document.getElementById("dl-custom-wrap");
  var CUSTOM_UNIT = document.getElementById("dl-custom-unit");

  function countryName(code) {
    var own = (packs[current] || {})["region_" + code];
    if (own) return own;
    try { return new Intl.DisplayNames([current], { type: "region" }).of(code) || code; } catch (e) { return code; }
  }

  function termAmount(term) {
    var base = term[2] === "m" ? (term[1] === 1 ? "dl_u_m1" : "dl_u_m") : "dl_u_" + term[2];
    var own = packs[current] || {};
    // The Arabic dual is one word that already says "two" (يومان), so it stands without the numeral.
    if (term[1] === 2 && own[base + "_two"]) return own[base + "_two"];
    var form = term[1] >= 3 && term[1] <= 10 ? base + "_few" : null;
    var unit = form && own[form] ? own[form] : t(base);
    return term[1] + " " + unit;
  }

  function termLabel(term) {
    return t("dl_t_" + term[0]) + " — " + termAmount(term);
  }

  function renderTypes(reset) {
    var keep = reset ? "" : TYPE.value;
    var c = window.Ulke.countries[COUNTRY.value];
    TYPE.innerHTML = "";
    (c ? c.t : []).forEach(function (term, i) { TYPE.appendChild(new Option(termLabel(term), String(i))); });
    TYPE.appendChild(new Option(t("dl_t_custom"), "custom"));
    // Plural labels: Arabic has its 3-10 form for a list like this, the other packs only the plain one.
    var unit = CUSTOM_UNIT.value || "d";
    CUSTOM_UNIT.innerHTML = "";
    ["d", "w", "m"].forEach(function (u) { CUSTOM_UNIT.appendChild(new Option((packs[current] || {})["dl_u_" + u + "_few"] || t("dl_u_" + u), u)); });
    CUSTOM_UNIT.value = unit;
    if (keep &&[].some.call(TYPE.options, function (o) { return o.value === keep; })) TYPE.value = keep;
    CUSTOM_WRAP.hidden = TYPE.value !== "custom";
    syncDateLabel();
  }

  function renderCountries() {
    var keep = COUNTRY.value;
    var names = {};
    var codes = Object.keys(window.Ulke.countries);
    codes.forEach(function (c) { names[c] = countryName(c); });
    codes.sort(function (a, b) { return names[a].localeCompare(names[b], current); });
    COUNTRY.innerHTML = "";
    var ph = new Option(t("dl_pick_country"), "");
    ph.disabled = true;
    COUNTRY.appendChild(ph);
    codes.forEach(function (c) { COUNTRY.appendChild(new Option(names[c], c)); });
    COUNTRY.value = keep;
    renderTypes(false);
  }

  function renderCountryLinks() {
    document.querySelectorAll("[data-country-links]").forEach(function (ul) {
      ul.innerHTML = "";
      [].slice.call(COUNTRY.options, 1).forEach(function (o) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = "/" + current + "/" + o.value.toLowerCase() + "/";
        a.textContent = o.text;
        li.appendChild(a);
        ul.appendChild(li);
      });
    });
  }

  function note(out, cls, text) {
    var el = document.createElement("div");
    el.className = cls;
    el.textContent = text;
    out.appendChild(el);
  }

  function calc() {
    var out = document.getElementById("dl-out");
    var date = document.getElementById("dl-date").value;
    var code = COUNTRY.value, c = window.Ulke.countries[code];
    out.innerHTML = "";
    if (!c) { out.textContent = t("dl_need_country"); return; }
    if (!date) { out.textContent = t("dl_need_date"); return; }
    var term;
    if (TYPE.value === "custom") {
      var raw = document.getElementById("dl-custom").value.trim();
      var n = /^\d{1,3}$/.test(raw) ? +raw : 0, unit = CUSTOM_UNIT.value;
      // Months are counted as months: "1 month" typed as 31 days ends after the real last day in a shorter month.
      if (!/^[dwm]$/.test(unit) || !(n >= 1 && n <= (unit === "m" ? 24 : 400))) { out.textContent = t("dl_need_days"); return; }
      term = ["custom", n, unit];
    } else term = c.t[+TYPE.value];
    var v = window.Ulke.verdict(window.Deadline, code, term, date, todayISO());
    if (v.error) { out.textContent = t(v.error); return; }
    out.dataset.last = "1";
    v.top.forEach(function (n) { note(out, n[0], t(n[1])); });
    var line1 = document.createElement("div");
    if (v.doubt) line1.className = "bad";
    line1.textContent = t("dl_result") + " " + formatDate(v.end);
    var line2 = document.createElement("div");
    line2.className = v.cls;
    line2.textContent = v.state === "dl_left" ? t("dl_left") + " " + v.left : t(v.state);
    out.appendChild(line1);
    out.appendChild(line2);
    // A21: the bare date cannot be checked against the decision; the rule it came from can.
    note(out, "info", v.min ? fill(t("dl_basis_min"), { d: formatDate(date), a: termAmount(term), b: termAmount(["", v.min[0], v.min[1]]) })
      : fill(t("dl_basis"), { d: formatDate(date), n: termAmount(term) }));
    v.notes.forEach(function (n) { note(out, n[0], t(n[1])); });
    out.appendChild(resultActions(code, term, date, v));
  }

  // The first message already carries country, term and both dates, so nobody has to type them again.
  function resultActions(code, term, date, v) {
    var box = document.createElement("div");
    box.className = "dl-act";
    if (cfg.whatsapp) {
      var wa = document.createElement("a");
      wa.className = "btn";
      wa.href = waHref(fill(t("wa_prefill_dl"), { c: countryName(code), t: termLabel(term), d: formatDate(date), e: formatDate(v.end) }));
      wa.target = "_blank";
      wa.rel = "noopener noreferrer";
      wa.textContent = t("dl_wa");
      box.appendChild(wa);
    }
    if (v.left >= 0) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn ics";
      b.innerHTML = CAL_ICON;
      var s = document.createElement("span");
      s.textContent = t("dl_ics");
      b.appendChild(s);
      b.addEventListener("click", function () { saveIcs(code, v.end); });
      box.appendChild(b);
      // No number: the visitor picks the relative; the link brings them back to their own calculator.
      var sh = document.createElement("a");
      sh.className = "btn share";
      sh.href = "https://wa.me/?text=" + encodeURIComponent(fill(t("share_dl"), {
        e: formatDate(v.end), c: countryName(code), t: termLabel(term),
        u: location.origin + "/" + current + "/?utm_source=whatsapp&utm_medium=share#deadline" }));
      sh.target = "_blank";
      sh.rel = "noopener noreferrer";
      sh.textContent = t("dl_share");
      box.appendChild(sh);
    }
    return box;
  }

  // Built on the phone itself: the date never reaches a server, as the trust section promises.
  function saveIcs(code, end) {
    var text = window.Deadline.icsEvent({
      date: end,
      uid: end + "-" + code.toLowerCase() + "@istinafy.com",
      stamp: new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z",
      title: t("dl_ics_title") + " — " + countryName(code),
      desc: t("dl_ics_desc") + "\n" + location.origin + "/" + current + "/"
    });
    var url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
    var a = document.createElement("a");
    a.href = url;
    a.download = "istinafy-" + end + ".ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // A term that runs from the decision date needs that date, not the day the letter arrived.
  function syncDateLabel() {
    var c = window.Ulke.countries[COUNTRY.value];
    var term = c && TYPE.value !== "custom" ? c.t[+TYPE.value] : null;
    var q = document.getElementById("dl-date-q");
    q.setAttribute("data-i18n", term && term[3] && term[3].from === "k" ? "dl_date_k" : "dl_date");
    q.textContent = t(q.getAttribute("data-i18n"));
  }

  COUNTRY.addEventListener("change", function () { renderTypes(true); });
  TYPE.addEventListener("change", function () { CUSTOM_WRAP.hidden = TYPE.value !== "custom"; syncDateLabel(); });
  document.getElementById("dl-date").max = todayISO();

  document.getElementById("dl-form").addEventListener("submit", function (e) {
    e.preventDefault();
    calc();
  });

  var initial = pickInitialLang();
  apply(initial);
  // Country pages link here with ?c=XX so the calculator opens on that country.
  var preCountry = (new URLSearchParams(location.search).get("c") || "").toUpperCase();
  if (window.Ulke.countries[preCountry]) { COUNTRY.value = preCountry; renderTypes(true); }

  // Hiding starts only here, at the end of a run that worked; whatever is already on screen stays shown.
  function startReveal() {
    if (!("IntersectionObserver" in window)) return;
    var items = [].filter.call(document.querySelectorAll(".rv"), function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight) { el.classList.add("in"); return false; }
      return true;
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
    document.documentElement.classList.add("rv-on");
  }
  startReveal();
})();
