// Per-country appeal terms from arastirma/17-ulkeler/<ISO2>.md (checked 2026-11-09).
// Safety rule: when a source is uncertain the data takes the EARLIER possible last day
// (shorter of conflicting terms, weekend-only shifting, no postal-service fiction), because a
// date shown too late can cost the person the appeal, a date too early costs nothing.
// st: self = person can file first and higher instance; first = first instance only;
//     lawyer = lawyer must file; auto = appeal is automatic; unclear = research could not confirm
//     that the person may file alone (kendisi_ilk null) or the rules themselves. conf: research confidence. shift: true = last day on a
//     weekend moves to Monday (holidays unknown, so only weekends), "nl" = full NL calendar.
// t: [type, amount, unit] with unit d = calendar days, w = working days, m = months.
(function (root) {
  var C = {
    AT: { st: "first", conf: "orta", shift: true, t: [["normal", 28, "d"], ["hizli", 10, "d"], ["kabul", 10, "d"], ["dublin", 14, "d"], ["ardisik", 14, "d"]] },
    // BE: subsequent applications 30 days only when not accelerated; the shorter term is kept.
    BE: { st: "unclear", conf: "dusuk", shift: true, t: [["normal", 30, "d"], ["hizli", 10, "d"], ["sinir", 5, "d"], ["kabul", 10, "d"], ["dublin", 10, "d"], ["ardisik", 10, "d"]] },
    BG: { st: "unclear", conf: "dusuk", shift: false, t: [["normal", 14, "d"], ["hizli", 7, "d"]] },
    CH: { st: "self", conf: "orta", shift: true, t: [["normal", 30, "d"], ["hizli", 7, "w"], ["kabul", 5, "w"], ["dublin", 5, "w"]] },
    CY: { st: "first", conf: "dusuk", shift: false, t: [["normal", 20, "d"], ["hizli", 10, "d"], ["kabul", 10, "d"], ["ardisik", 10, "d"]] },
    CZ: { st: "first", conf: "yuksek", shift: true, t: [["normal", 15, "d"], ["sinir", 10, "d"], ["kabul", 10, "d"], ["dublin", 10, "d"], ["ardisik", 10, "d"]] },
    DE: { st: "first", conf: "orta", shift: true, t: [["normal", 14, "d"], ["hizli", 7, "d"], ["sinir", 7, "d"], ["kabul", 7, "d"], ["dublin", 7, "d"], ["ardisik", 7, "d"]] },
    DK: { st: "auto", conf: "orta", shift: false, t: [["dublin", 7, "d"]] },
    EE: { st: "unclear", conf: "dusuk", shift: false, t: [["dublin", 10, "d"]] },
    ES: { st: "lawyer", conf: "orta", shift: false, t: [["normal", 2, "m"], ["kabul", 2, "m"]] },
    FI: { st: "self", conf: "dusuk", shift: false, t: [["normal", 30, "d"], ["hizli", 10, "d"], ["sinir", 10, "d"], ["kabul", 10, "d"], ["dublin", 14, "d"]] },
    FR: { st: "first", conf: "orta", shift: false, t: [["normal", 1, "m"], ["hizli", 10, "d"], ["sinir", 10, "d"], ["kabul", 10, "d"]] },
    GR: { st: "first", conf: "orta", shift: false, t: [["normal", 30, "d"], ["hizli", 10, "d"], ["sinir", 10, "d"], ["kabul", 10, "d"], ["dublin", 10, "d"], ["ardisik", 10, "d"]] },
    HR: { st: "self", conf: "orta", shift: true, t: [["normal", 30, "d"], ["sinir", 5, "w"], ["kabul", 8, "d"], ["ust", 15, "d"]] },
    HU: { st: "unclear", conf: "orta", shift: false, t: [["normal", 8, "d"], ["hizli", 7, "d"], ["kabul", 7, "d"]] },
    IE: { st: "unclear", conf: "dusuk", shift: false, t: [["normal", 1, "m"], ["hizli", 10, "d"], ["sinir", 10, "d"], ["dublin", 7, "d"]] },
    IS: { st: "first", conf: "orta", shift: false, t: [["normal", 15, "d"], ["hizli", 5, "d"], ["kabul", 14, "d"]] },
    IT: { st: "lawyer", conf: "orta", shift: false, t: [["normal", 30, "d"], ["hizli", 7, "d"], ["sinir", 5, "d"]] },
    LI: { st: "unclear", conf: "dusuk", shift: false, t: [["normal", 14, "d"]] },
    LT: { st: "unclear", conf: "dusuk", shift: false, t: [["normal", 14, "d"], ["dublin", 14, "d"]] },
    LU: { st: "lawyer", conf: "dusuk", shift: false, t: [["normal", 20, "d"], ["hizli", 10, "d"], ["kabul", 10, "d"], ["dublin", 10, "d"]] },
    LV: { st: "self", conf: "dusuk", shift: false, t: [["normal", 1, "m"], ["hizli", 15, "w"], ["kabul", 15, "w"], ["dublin", 15, "w"]] },
    MT: { st: "first", conf: "dusuk", shift: false, t: [["normal", 15, "d"], ["dublin", 15, "d"]] },
    NL: { st: "self", conf: "orta", shift: "nl", t: [["normal", 14, "d"], ["hizli", 7, "d"], ["sinir", 7, "d"], ["kabul", 7, "d"], ["dublin", 7, "d"], ["ardisik", 7, "d"], ["vv", 7, "d"], ["ust_kisa", 14, "d"], ["ust_uzun", 28, "d"]] },
    NO: { st: "first", conf: "dusuk", shift: false, t: [["normal", 21, "d"], ["dublin", 21, "d"]] },
    PL: { st: "first", conf: "orta", shift: false, t: [["normal", 14, "d"], ["hizli", 7, "d"], ["kabul", 14, "d"], ["dublin", 14, "d"], ["ardisik", 14, "d"]] },
    PT: { st: "unclear", conf: "dusuk", shift: false, t: [["normal", 15, "d"]] },
    RO: { st: "first", conf: "dusuk", shift: false, t: [["normal", 10, "d"], ["hizli", 7, "d"]] },
    SE: { st: "self", conf: "orta", shift: false, t: [["normal", 21, "d"], ["hizli", 7, "d"], ["sinir", 7, "d"], ["kabul", 7, "d"], ["dublin", 7, "d"]] },
    // SI: sources conflict (AIDA 15 days, EUAA 3 days for a regular rejection); the shorter one is kept.
    SI: { st: "unclear", conf: "dusuk", shift: false, t: [["normal", 3, "d"], ["hizli", 3, "d"], ["sinir", 3, "d"], ["kabul", 3, "d"], ["ardisik", 3, "d"]] },
    SK: { st: "first", conf: "orta", shift: false, t: [["normal", 1, "m"], ["sinir", 7, "d"], ["kabul", 10, "d"], ["dublin", 7, "d"]] }
  };

  var UNITS = { d: "day", w: "workday", m: "month" };

  // received: the day the decision reached the person or their lawyer, whichever was first (APR art. 67(8)).
  function lastDay(D, code, term, receivedISO) {
    var c = C[code];
    if (!c || !term || !(term[1] > 0) || !UNITS[term[2]]) return null;
    return D.computeLastDay(receivedISO, {
      amount: term[1],
      unit: UNITS[term[2]],
      shift: !!c.shift,
      holidays: c.shift === "nl" ? D.holidaysNL : null
    });
  }

  var api = { countries: C, lastDay: lastDay };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Ulke = api;
})(this);
