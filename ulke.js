// Per-country appeal terms from arastirma/17-ulkeler/<ISO2>.md (checked 2026-11-09).
// Safety rule: when a source is uncertain the data takes the EARLIER possible last day
// (shorter of conflicting terms, weekend-only shifting, no postal-service fiction), because a
// date shown too late can cost the person the appeal, a date too early costs nothing.
// st: self = person can file first and higher instance; first = first instance only;
//     lawyer = lawyer must file; auto = appeal is automatic; unclear = research could not confirm
//     that the person may file alone (kendisi_ilk null) or the rules themselves. conf: research confidence. shift: true = last day on a
//     weekend moves to Monday (holidays unknown, so only weekends), "nl" = full NL calendar.
// t: [type, amount, unit, opts?] with unit d = calendar days, w = working days, m = months.
// opts.min = a conflicting second term; the earlier of the two last days is shown.
// opts.from = "k": the term runs from the date of the decision itself (the UI warns), not from receipt.
// opts.chk = true: the term itself is uncertain in the sources (the UI asks to check the decision).
// opts.det = true: the term is shorter when the person is detained (the UI warns above the date).
(function (root) {
  var C = {
    // AT: BFA-VG § 16(1) 10 days for APR 67(7)(a) cases; AMMR transfers and subsequent applications are not clearly in § 16(2) (2 weeks), so 10.
    AT: { st: "first", conf: "orta", shift: true, t: [["normal", 28, "d"], ["hizli", 10, "d"], ["sinir", 10, "d"], ["kabul", 10, "d"], ["dublin", 10, "d"], ["ardisik", 10, "d"]] },
    // BE: subsequent applications 30 days only when not accelerated; the shorter term is kept.
    BE: { st: "unclear", conf: "dusuk", shift: true, t: [["normal", 30, "d"], ["hizli", 10, "d"], ["sinir", 5, "d"], ["kabul", 10, "d"], ["dublin", 5, "d"], ["ardisik", 10, "d"]] },
    BG: { st: "unclear", conf: "dusuk", shift: false, t: [["normal", 14, "d"], ["hizli", 7, "d"]] },
    CH: { st: "self", conf: "orta", shift: true, t: [["normal", 30, "d"], ["hizli", 7, "w"], ["kabul", 5, "w"], ["dublin", 5, "w"]] },
    CY: { st: "first", conf: "dusuk", shift: false, t: [["normal", 20, "d"], ["hizli", 10, "d"], ["kabul", 10, "d"], ["ardisik", 10, "d"]] },
    CZ: { st: "first", conf: "yuksek", shift: true, t: [["normal", 15, "d"], ["hizli", 10, "d"], ["sinir", 10, "d"], ["kabul", 10, "d"], ["dublin", 10, "d"], ["ardisik", 10, "d"]] },
    DE: { st: "first", conf: "orta", shift: true, t: [["normal", 14, "d"], ["hizli", 7, "d"], ["sinir", 7, "d"], ["kabul", 7, "d"], ["dublin", 7, "d"], ["ardisik", 7, "d"]] },
    DK: { st: "auto", conf: "orta", shift: false, t: [["kabul", 7, "d"], ["dublin", 7, "d"]] },
    EE: { st: "unclear", conf: "dusuk", shift: false, t: [["sinir", 5, "d"], ["kabul", 5, "d"], ["dublin", 10, "d"]] },
    // ES: the old 2-month LJCA term exceeds the APR 67(7) maximum (1 month; 10 days for inadmissibility) that the BOE instruction refers to.
    ES: { st: "lawyer", conf: "dusuk", shift: false, t: [["normal", 1, "m"], ["kabul", 10, "d"]] },
    FI: { st: "self", conf: "dusuk", shift: false, t: [["normal", 30, "d"], ["hizli", 10, "d"], ["sinir", 10, "d"], ["kabul", 10, "d"], ["dublin", 14, "d"], ["vv", 7, "d"]] },
    FR: { st: "first", conf: "orta", shift: false, t: [["normal", 1, "m"], ["hizli", 10, "d"], ["sinir", 10, "d"], ["kabul", 10, "d"], ["vv", 7, "d"]] },
    GR: { st: "first", conf: "orta", shift: false, t: [["normal", 30, "d"], ["hizli", 10, "d"], ["sinir", 10, "d"], ["kabul", 10, "d"], ["dublin", 7, "d"], ["ardisik", 10, "d"]] },
    // HR: ZUS counts Sundays and holidays, Saturday is not confirmed, so no shift.
    HR: { st: "self", conf: "orta", shift: false, t: [["normal", 30, "d"], ["sinir", 5, "w"], ["kabul", 8, "d"], ["ust", 15, "d"]] },
    HU: { st: "unclear", conf: "orta", shift: false, t: [["normal", 8, "d"], ["hizli", 7, "d"], ["kabul", 7, "d"]] },
    // IE: the 1-month and 10-day terms run from the date OF the decision, not from receipt.
    IE: { st: "unclear", conf: "dusuk", shift: false, t: [["normal", 1, "m", { from: "k" }], ["hizli", 10, "d", { from: "k" }], ["sinir", 10, "d", { from: "k" }], ["dublin", 7, "d"]] },
    // IS: inadmissibility decisions are appealed automatically; the 14 days are for sending the written reasons (greinargerð).
    IS: { st: "first", conf: "orta", shift: false, t: [["normal", 15, "d"], ["hizli", 5, "d"], ["kabul_oto", 14, "d"]] },
    IT: { st: "lawyer", conf: "orta", shift: false, t: [["normal", 30, "d"], ["hizli", 7, "d"], ["sinir", 5, "d"]] },
    // LI: 14 days is confirmed only for decisions of the Regierung; for other authorities the term is unknown.
    LI: { st: "unclear", conf: "dusuk", shift: false, t: [["normal", 14, "d", { chk: true }]] },
    // LT: 7 days is deliberately the shortest term found; a later date would be the dangerous direction.
    LT: { st: "unclear", conf: "dusuk", shift: false, t: [["normal", 7, "d"], ["dublin", 14, "d", { from: "k" }]] },
    LU: { st: "lawyer", conf: "dusuk", shift: false, t: [["normal", 20, "d"], ["hizli", 10, "d"], ["kabul", 10, "d"], ["dublin", 10, "d"]] },
    // LV: Patvēruma likums art. 48(4): 5 working days instead of 15 for inadmissibility and Dublin when detained.
    LV: { st: "self", conf: "dusuk", shift: false, t: [["normal", 1, "m", { min: [30, "d"] }], ["hizli", 15, "w"], ["kabul", 15, "w", { det: true }], ["dublin", 15, "w", { det: true }], ["gozalti", 5, "w"]] },
    // MT: AIDA (30.07.2026) says both "15 days" and "two weeks", so the shorter 14; Dublin rests on EUAA only.
    MT: { st: "first", conf: "dusuk", shift: false, t: [["normal", 14, "d"], ["dublin", 14, "d", { chk: true }]] },
    NL: { st: "self", conf: "orta", shift: "nl", t: [["normal", 14, "d"], ["hizli", 7, "d"], ["sinir", 7, "d"], ["kabul", 7, "d"], ["dublin", 7, "d"], ["ardisik", 7, "d"], ["vv", 7, "d"], ["ust_kisa", 14, "d", { from: "k" }], ["ust_uzun", 28, "d", { from: "k" }]] },
    // NO: the 21-day Dublin term has no source after the AMMR (June 2026).
    NO: { st: "first", conf: "dusuk", shift: false, t: [["normal", 21, "d"], ["hizli", 7, "d"], ["dublin", 21, "d", { chk: true }]] },
    // PL: APR 67(7)(a) caps inadmissible and subsequent applications at 10 days; national 14 days is not adapted.
    PL: { st: "first", conf: "orta", shift: false, t: [["normal", 14, "d"], ["hizli", 7, "d"], ["kabul", 10, "d"], ["dublin", 14, "d"], ["ardisik", 10, "d"]] },
    // PT: 15 days is from AIDA (25.06.2026), before Lei 62/2026, which may have changed the terms.
    PT: { st: "unclear", conf: "dusuk", shift: false, t: [["normal", 15, "d", { chk: true }]] },
    // RO: 2 days accelerated is deliberately the shortest term found (safe direction).
    RO: { st: "first", conf: "dusuk", shift: false, t: [["normal", 10, "d"], ["hizli", 2, "d"]] },
    SE: { st: "self", conf: "orta", shift: false, t: [["normal", 21, "d"], ["hizli", 7, "d"], ["sinir", 7, "d"], ["kabul", 7, "d"], ["dublin", 7, "d"]] },
    // SI: sources conflict (AIDA 15 days, EUAA 3 days for a regular rejection); the shorter one is kept.
    SI: { st: "unclear", conf: "dusuk", shift: false, t: [["normal", 3, "d"], ["hizli", 3, "d"], ["sinir", 3, "d"], ["kabul", 3, "d"], ["ardisik", 3, "d"]] },
    SK: { st: "first", conf: "orta", shift: false, t: [["normal", 1, "m", { min: [30, "d"] }], ["sinir", 7, "d"], ["kabul", 10, "d"], ["dublin", 7, "d"]] }
  };

  var UNITS = { d: "day", w: "workday", m: "month" };

  // received: the earliest of the date on the decision and the day it reached the person or their lawyer
  // (APR art. 67(8)); the form asks for the earliest because postal terms often start before receipt.
  function lastDay(D, code, term, receivedISO) {
    var c = C[code];
    if (!c || !term || !(term[1] > 0) || !UNITS[term[2]]) return null;
    var one = function (amount, unit) {
      return D.computeLastDay(receivedISO, { amount: amount, unit: UNITS[unit], shift: !!c.shift, holidays: c.shift === "nl" ? D.holidaysNL : null });
    };
    var end = one(term[1], term[2]);
    var alt = term[3] && term[3].min;
    if (end && alt) { var other = one(alt[0], alt[1]); if (other < end) end = other; }
    return end;
  }

  // Everything the calculator shows for one answer, kept out of the page so tests reach each rule.
  // top = notes shown ABOVE the date: the reader must see them before trusting it.
  function verdict(D, code, term, dateISO, todayISO) {
    var c = C[code];
    if (!c) return { error: "dl_need_country" };
    if (!D.parseISODate(dateISO)) return { error: "dl_need_date" };
    if (dateISO > todayISO) return { error: "dl_future" };
    var end = lastDay(D, code, term, dateISO);
    if (!end) return { error: "dl_need_date" };
    var o = term[3] || {};
    var left = D.daysBetween(todayISO, end);
    var top = [], notes = [];
    if (o.from === "k") top.push(["warn", "dl_from_decision"]);
    if (o.det) top.push(["warn", "dl_detained"]);
    var wd = D.parseISODate(end).getUTCDay();
    // A21: say which way the date was moved, so the reader can check it against the decision.
    if (c.shift) notes.push(["info", c.shift === "nl" ? "dl_shift_nl" : "dl_shift_we"]);
    if (!c.shift && (wd === 0 || wd === 6)) notes.push(["warn", "dl_weekend"]);
    if (o.chk) notes.push(["warn", "dl_check_end"]);
    notes.push(["info", "dl_st_" + c.st]);
    if (c.conf === "dusuk") notes.push(["warn", "dl_conf_low"]);
    var doubt = top.length > 0;
    return {
      end: end, left: left, doubt: doubt, top: top, notes: notes, min: o.min || null,
      state: left > 0 ? "dl_left" : left === 0 ? "dl_today" : "dl_expired",
      // B14: days left in green would read as "safe" where the rules themselves are uncertain.
      cls: left <= 3 || doubt ? "bad" : c.conf === "dusuk" ? "mid" : "good"
    };
  }

  var api = { countries: C, lastDay: lastDay, verdict: verdict };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Ulke = api;
})(this);
