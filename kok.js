// Root page (/): sends every visitor with JavaScript to their language home, keeping ?query and #section.
// The static chooser in the page stays for visitors without JavaScript and for crawlers.
// hasLang, pathLang and pickInitialLang are copies of app.js; test/dil.test.js runs both on the same cases.
(function () {
  "use strict";
  var cfg = window.SITE_CONFIG;
  var packs = {};
  cfg.languages.forEach(function (l) { packs[l.code] = true; });

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
    var fromPath = pathLang();
    if (fromPath) return fromPath;
    try {
      var saved = localStorage.getItem("lang");
      if (hasLang(saved)) return saved;
    } catch (e) { /* storage blocked: fall through to browser language */ }
    var prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
    for (var i = 0; i < prefs.length; i++) {
      var raw = String(prefs[i]).toLowerCase();
      var code = raw.indexOf("kmr") === 0 ? "ku" : raw.slice(0, 2);
      if (hasLang(code)) return code;
    }
    return packs.en ? "en" : cfg.defaultLang;
  }

  // replace, not assign: the back button must not land on the root and bounce forward again.
  location.replace("/" + pickInitialLang() + "/" + location.search + location.hash);
})();
