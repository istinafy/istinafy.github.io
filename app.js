(function () {
  var cfg = window.SITE_CONFIG;
  var packs = window.I18N;
  var current = cfg.defaultLang;

  function t(k) {
    var p = packs[current] || {};
    return p[k] != null ? p[k] : (packs[cfg.defaultLang][k] || k);
  }

  function pathLang() {
    var m = location.pathname.match(/^\/([a-z]{2})\//);
    return m && packs[m[1]] ? m[1] : null;
  }

  function pickInitialLang() {
    var fromUrl = new URLSearchParams(location.search).get("lang");
    if (fromUrl && packs[fromUrl]) return fromUrl;
    // /ar/, /nl/ ... are the crawlable per-language addresses; a shared link must open in its own language.
    var fromPath = pathLang();
    if (fromPath) return fromPath;
    try {
      var saved = localStorage.getItem("lang");
      if (saved && packs[saved]) return saved;
    } catch (e) { /* storage blocked: fall through to browser language */ }
    // Walk the whole preference list: a phone set to German with Arabic second should get Arabic, not Turkish.
    var prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
    for (var i = 0; i < prefs.length; i++) {
      var raw = String(prefs[i]).toLowerCase();
      // Kurmanji may be reported as "kmr"; a plain two-letter slice would read it as Khmer ("km").
      var code = raw.indexOf("kmr") === 0 ? "ku" : raw.slice(0, 2);
      if (packs[code]) return code;
    }
    // A phone in a language we do not offer (German, Polish...) is far likelier to read English than Turkish.
    return packs.en ? "en" : cfg.defaultLang;
  }

  var WA_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.3-.4.8-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>';

  var MAIL_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 2.4V17h16V7.4l-8 5.3-8-5.3ZM5.6 7 12 11.2 18.4 7H5.6Z"/></svg>';

  var SOCIAL_ICONS = {
    instagram: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 1 0 4.9 5.7V9.1a7.3 7.3 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.2-1.6Z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21h3Z"/></svg>'
  };

  // Countries named in the services block; the last chip ("and anywhere in the world") comes from the language pack.
  var WORLD = ["NL", "TR", "DE", "BE", "FR", "GB", "SE", "AT", "CH", "IT", "ES", "US"];

  var PREFILL = { lawyer: "wa_prefill_lawyer", biz: "wa_prefill_biz" };
  var WA_LABEL = { lawyer: "lawyers_cta_wa", biz: "svc_btn" };

  function waHref(kind) {
    // The prefilled first line tells the owner which language the person reads and who is writing (person, lawyer, business).
    var digits = String(cfg.whatsapp).replace(/[^0-9]/g, "");
    return "https://wa.me/" + digits + "?text=" + encodeURIComponent(t(PREFILL[kind] || "wa_prefill"));
  }

  function renderSocial() {
    document.querySelectorAll("[data-social]").forEach(function (ul) {
      ul.innerHTML = "";
      (cfg.social || []).forEach(function (s) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = s.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.setAttribute("aria-label", s.name);
        a.title = s.name;
        a.innerHTML = SOCIAL_ICONS[s.id] || "";
        li.appendChild(a);
        ul.appendChild(li);
      });
    });
  }

  function renderWorld() {
    document.querySelectorAll("[data-world]").forEach(function (ul) {
      ul.innerHTML = "";
      WORLD.concat([null]).forEach(function (c) {
        var li = document.createElement("li");
        li.textContent = c ? countryName(c) : t("svc_world");
        ul.appendChild(li);
      });
    });
  }

  function renderContacts() {
    var hasWa = !!cfg.whatsapp;
    document.body.classList.toggle("has-bar", hasWa);
    document.querySelectorAll("[data-contact]").forEach(function (box) {
      box.innerHTML = "";
      var kind = box.getAttribute("data-contact");
      var lawyer = kind === "lawyer";
      if (kind === "fab") {
        if (hasWa) { box.href = waHref(""); box.target = "_blank"; box.rel = "noopener noreferrer"; box.innerHTML = WA_ICON.replace(/22/g, "30"); }
        else box.removeAttribute("href");
        return;
      }
      if (kind === "bar") {
        if (hasWa) box.appendChild(waLink(""));
        return;
      }
      if (kind === "biz") {
        if (hasWa) box.appendChild(waLink("biz"));
        return;
      }
      if (!hasWa && !cfg.email) {
        var s = document.createElement("span");
        s.className = "soon";
        s.textContent = t("cta_soon");
        box.appendChild(s);
        return;
      }
      if (hasWa) box.appendChild(waLink(kind));
      if (cfg.email) {
        var m = document.createElement("a");
        m.className = "btn mail";
        m.href = "mailto:" + cfg.email + "?subject=" + encodeURIComponent(t(lawyer ? "mail_subject_lawyer" : "mail_subject"));
        m.innerHTML = MAIL_ICON;
        var ms = document.createElement("span");
        ms.textContent = lawyer ? t("lawyers_cta") : t("cta_email");
        m.appendChild(ms);
        box.appendChild(m);
      }
      if (kind === "full" && cfg.email) {
        var addr = document.createElement("p");
        addr.className = "addr";
        addr.textContent = cfg.email;
        box.appendChild(addr);
      }
    });
  }

  function waLink(kind) {
    var wa = document.createElement("a");
    wa.className = "btn wa";
    wa.href = waHref(kind);
    wa.target = "_blank";
    wa.rel = "noopener noreferrer";
    wa.innerHTML = WA_ICON;
    var s = document.createElement("span");
    s.textContent = t(WA_LABEL[kind] || "cta_whatsapp");
    wa.appendChild(s);
    return wa;
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
    renderContacts();
    renderCountries();
    renderWorld();
    renderCountryLinks();
    MENU_BTN.setAttribute("aria-label", t("nav_menu"));
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

  function countryName(code) {
    var own = (packs[current] || {})["region_" + code];
    if (own) return own;
    try { return new Intl.DisplayNames([current], { type: "region" }).of(code) || code; } catch (e) { return code; }
  }

  function termLabel(term) {
    var base = term[2] === "m" ? (term[1] === 1 ? "dl_u_m1" : "dl_u_m") : "dl_u_" + term[2];
    var form = term[1] === 2 ? base + "_two" : (term[1] >= 3 && term[1] <= 10 ? base + "_few" : null);
    var unit = form && (packs[current] || {})[form] ? packs[current][form] : t(base);
    return t("dl_t_" + term[0]) + " — " + term[1] + " " + unit;
  }

  function renderTypes(reset) {
    var keep = reset ? "" : TYPE.value;
    var c = window.Ulke.countries[COUNTRY.value];
    TYPE.innerHTML = "";
    (c ? c.t : []).forEach(function (term, i) { TYPE.appendChild(new Option(termLabel(term), String(i))); });
    TYPE.appendChild(new Option(t("dl_t_custom"), "custom"));
    if (keep && [].some.call(TYPE.options, function (o) { return o.value === keep; })) TYPE.value = keep;
    CUSTOM_WRAP.hidden = TYPE.value !== "custom";
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
      var n = /^\d{1,3}$/.test(raw) ? +raw : 0;
      if (!(n >= 1 && n <= 400)) { out.textContent = t("dl_need_days"); return; }
      term = ["custom", n, "d"];
    } else term = c.t[+TYPE.value];
    var end = window.Ulke.lastDay(window.Deadline, code, term, date);
    if (!end) { out.textContent = t("dl_need_date"); return; }
    out.dataset.last = "1";
    var left = window.Deadline.daysBetween(todayISO(), end);
    var line1 = document.createElement("div");
    line1.textContent = t("dl_result") + " " + formatDate(end);
    var line2 = document.createElement("div");
    if (left > 0) {
      line2.className = left <= 3 ? "bad" : "good";
      line2.textContent = t("dl_left") + " " + left;
    } else if (left === 0) {
      line2.className = "bad";
      line2.textContent = t("dl_today");
    } else {
      line2.className = "bad";
      line2.textContent = t("dl_expired");
    }
    out.appendChild(line1);
    out.appendChild(line2);
    if (term[3] && term[3].from === "k") note(out, "warn", t("dl_from_decision"));
    note(out, "info", t("dl_st_" + c.st));
    if (c.conf === "dusuk") note(out, "warn", t("dl_conf_low"));
  }

  COUNTRY.addEventListener("change", function () { renderTypes(true); });
  TYPE.addEventListener("change", function () { CUSTOM_WRAP.hidden = TYPE.value !== "custom"; });

  var sel = document.getElementById("lang-select");
  cfg.languages.forEach(function (l) {
    if (!packs[l.code]) return;
    var o = document.createElement("option");
    o.value = l.code;
    o.textContent = l.name;
    sel.appendChild(o);
  });
  function langHref(code) { return "/" + code + "/" + location.hash; }
  // A full load of /xx/, not an in-place rewrite: a phone's translation layer still running on the old page
  // keeps translating the new text, which left pages half Turkish, half Dutch and split the logo into "ISTINAF Y".
  sel.addEventListener("change", function () {
    try { localStorage.setItem("lang", sel.value); } catch (e) { /* the folder in the address carries the choice */ }
    location.assign(langHref(sel.value));
  });
  // Back button: a page restored from cache must not show the language the visitor left for.
  window.addEventListener("pageshow", function () { sel.value = current; });
  document.getElementById("dl-form").addEventListener("submit", function (e) {
    e.preventDefault();
    calc();
  });

  var hdr = document.getElementById("hdr");
  var MENU_BTN = document.getElementById("menu-btn");
  function setMenu(open) {
    hdr.classList.toggle("menu-open", open);
    MENU_BTN.setAttribute("aria-expanded", open ? "true" : "false");
  }
  MENU_BTN.addEventListener("click", function () { setMenu(!hdr.classList.contains("menu-open")); });
  document.getElementById("nav").addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  document.addEventListener("click", function (e) { if (!hdr.contains(e.target)) setMenu(false); });

  renderSocial();
  var initial = pickInitialLang();
  sel.value = initial;
  apply(initial);
  // Country pages link here with ?c=XX so the calculator opens on that country.
  var preCountry = (new URLSearchParams(location.search).get("c") || "").toUpperCase();
  if (window.Ulke.countries[preCountry]) { COUNTRY.value = preCountry; renderTypes(true); }

  function onScroll() { hdr.classList.toggle("scrolled", window.scrollY > 12); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var items = document.querySelectorAll(".rv");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("in"); });
  }
})();
