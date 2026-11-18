// Hero last-day card. Shows the EARLIEST last day over every decision type of the chosen country,
// the site's safety rule: a date shown too late can cost the appeal, one too early costs nothing.
(function () {
  var card = document.getElementById("sk");
  if (!card || !window.Ulke || !window.Deadline) return;
  var lang = document.documentElement.lang || "tr";
  var P = (window.I18N || {})[lang];
  if (!P || !P.sk_unit) return;
  // Same French no-break spaces as t() in app.js, so ":" never starts a line.
  function s(k) { var v = P[k]; return lang === "fr" ? v.replace(/ (?=[:;?!»])/g, " ") : v; }
  function name(code) {
    if (P["region_" + code]) return P["region_" + code];
    try { return new Intl.DisplayNames([lang], { type: "region" }).of(code) || code; } catch (e) { return code; }
  }
  var sel = document.getElementById("sk-c"), inp = document.getElementById("sk-t");
  var num = document.getElementById("sk-n"), unit = document.getElementById("sk-u"), line = document.getElementById("sk-d");
  var codes = Object.keys(window.Ulke.countries).sort(function (a, b) { return name(a).localeCompare(name(b), lang); });
  codes.forEach(function (c) { sel.appendChild(new Option(name(c), c)); });
  var now = new Date();
  var today = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  sel.value = window.Ulke.countries[P.sk_def] ? P.sk_def : codes[0];
  inp.value = today;
  inp.max = today;
  var fmt = new Intl.DateTimeFormat(lang, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  var nf = new Intl.NumberFormat(lang);
  // Browsers ship no Kurdish locale data and fall back to the system language; the pack's own names win, as in app.js formatDate.
  function date(iso) {
    var d = window.Deadline.parseISODate(iso);
    if (P.date_months && P.date_days) return P.date_days.split("|")[d.getUTCDay()] + ", " + d.getUTCDate() + " " + P.date_months.split("|")[d.getUTCMonth()] + " " + d.getUTCFullYear();
    return fmt.format(d);
  }

  function run() {
    var c = window.Ulke.countries[sel.value], d = inp.value;
    num.className = "sk-n";
    if (!c || !window.Deadline.parseISODate(d) || d > today) { num.textContent = "–"; unit.textContent = ""; line.textContent = ""; return; }
    var end = null;
    c.t.forEach(function (term) {
      var e = window.Ulke.lastDay(window.Deadline, sel.value, term, d);
      if (e && (!end || e < end)) end = e;
    });
    if (!end) { num.textContent = "–"; unit.textContent = ""; line.textContent = ""; return; }
    var left = window.Deadline.daysBetween(today, end);
    num.textContent = nf.format(Math.max(left, 0));
    if (left <= 3) num.className = "sk-n bad";
    unit.textContent = left > 0 ? s("sk_unit") : left === 0 ? s("sk_today") : s("sk_gone");
    line.textContent = s("sk_line").replace("{d}", date(end));
  }
  sel.addEventListener("change", run);
  inp.addEventListener("input", run);
  run();

  // Carry the two answers down to the full calculator, so nobody types them twice.
  document.getElementById("sk-more").addEventListener("click", function () {
    var dc = document.getElementById("dl-country"), dd = document.getElementById("dl-date");
    if (!dc || !dd) return;
    dc.value = sel.value;
    dc.dispatchEvent(new Event("change", { bubbles: true }));
    dd.value = inp.value;
  });
})();
