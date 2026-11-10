// NL deadline estimate. Awb 6:8: the term starts the day after notification.
// Algemene termijnenwet art. 1 + 3: a last day on Sat/Sun or a listed public holiday moves to the next working day.
(function (root) {
  function easterSunday(year) {
    var a = year % 19, b = Math.floor(year / 100), c = year % 100,
        d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
        g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
        i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7,
        m = Math.floor((a + 11 * h + 22 * l) / 451),
        month = Math.floor((h + l - 7 * m + 114) / 31),
        day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(year, month - 1, day));
  }

  function addDays(date, n) {
    return new Date(date.getTime() + n * 86400000);
  }

  function key(date) {
    return date.toISOString().slice(0, 10);
  }

  function holidays(year) {
    var easter = easterSunday(year);
    var kingsDay = new Date(Date.UTC(year, 3, 27));
    if (kingsDay.getUTCDay() === 0) kingsDay = new Date(Date.UTC(year, 3, 26));
    var list = [
      new Date(Date.UTC(year, 0, 1)),
      addDays(easter, 1),   // Tweede Paasdag
      kingsDay,
      new Date(Date.UTC(year, 4, 5)),  // Bevrijdingsdag (in de Atw-lijst, every year)
      addDays(easter, 39),  // Hemelvaartsdag
      addDays(easter, 50),  // Tweede Pinksterdag
      new Date(Date.UTC(year, 11, 25)),
      new Date(Date.UTC(year, 11, 26))
    ];
    var set = {};
    list.forEach(function (d) { set[key(d)] = true; });
    return set;
  }

  function isNonWorkingDay(date) {
    var dow = date.getUTCDay();
    if (dow === 0 || dow === 6) return true;
    return !!holidays(date.getUTCFullYear())[key(date)];
  }

  function parseISODate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
    if (!m) return null;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    // Date.UTC rolls 2026-02-30 over to March; a typed impossible date must be rejected, not moved.
    return isNaN(d.getTime()) || key(d) !== s ? null : d;
  }

  function lastDay(notifiedISO, termDays) {
    var start = parseISODate(notifiedISO);
    if (!start) return null;
    var end = addDays(start, termDays);
    while (isNonWorkingDay(end)) end = addDays(end, 1);
    return key(end);
  }

  function daysBetween(fromISO, toISO) {
    return Math.round((parseISODate(toISO) - parseISODate(fromISO)) / 86400000);
  }

  function addMonths(date, n) {
    var y = date.getUTCFullYear(), m = date.getUTCMonth() + n, d = date.getUTCDate();
    var last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    // 31 Jan + 1 month has no 31 Feb: the term ends on the last day of the shorter month.
    return new Date(Date.UTC(y, m, Math.min(d, last)));
  }

  // Country-agnostic rule: {amount, unit: "day"|"workday"|"month", startOffset, shift, holidays(year)->set|null}.
  // startOffset = days added to the receipt date before counting (e.g. postal service fiction);
  // counting starts the day after that date. holidays null = only weekends are known non-working days.
  function computeLastDay(receivedISO, rule) {
    var base = parseISODate(receivedISO);
    if (!base) return null;
    base = addDays(base, rule.startOffset || 0);
    var hol = rule.holidays || function () { return {}; };
    var off = function (d) { var w = d.getUTCDay(); return w === 0 || w === 6 || !!hol(d.getUTCFullYear())[key(d)]; };
    var end;
    if (rule.unit === "month") end = addMonths(base, rule.amount);
    else if (rule.unit === "workday") {
      end = base;
      for (var left = rule.amount; left > 0;) { end = addDays(end, 1); if (!off(end)) left--; }
    } else end = addDays(base, rule.amount);
    if (rule.shift) while (off(end)) end = addDays(end, 1);
    return key(end);
  }

  // RFC 5545 TEXT: a comma or semicolon in a country name would otherwise split the value.
  function icsText(s) {
    return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  }

  // RFC 5545 3.1 folds at 75 octets; counting UTF-8 bytes per code point keeps Arabic and Turkish letters whole.
  function icsFold(line) {
    var out = "", len = 0;
    for (var i = 0; i < line.length; i++) {
      var cp = line.codePointAt(i);
      var ch = String.fromCodePoint(cp);
      if (cp > 0xffff) i++;
      var b = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
      if (len + b > 75) { out += "\r\n "; len = 1; }
      out += ch;
      len += b;
    }
    return out;
  }

  // All-day event on the last day; reminders at 09:00 seven days and two days before (calendars skip past ones).
  function icsEvent(o) {
    var day = parseISODate(o.date);
    if (!day) return null;
    var ymd = function (d) { return key(d).replace(/-/g, ""); };
    var alarm = function (trigger) { return ["BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsText(o.title), "TRIGGER:" + trigger, "END:VALARM"]; };
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ISTINAFY//Deadline//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VEVENT", "UID:" + o.uid, "DTSTAMP:" + o.stamp,
      "DTSTART;VALUE=DATE:" + ymd(day), "DTEND;VALUE=DATE:" + ymd(addDays(day, 1)),
      "SUMMARY:" + icsText(o.title), "DESCRIPTION:" + icsText(o.desc), "TRANSP:TRANSPARENT"]
      .concat(alarm("-P6DT15H"), alarm("-P1DT15H"), ["END:VEVENT", "END:VCALENDAR"]);
    return lines.map(icsFold).join("\r\n") + "\r\n";
  }

  var api = { lastDay: lastDay, daysBetween: daysBetween, isNonWorkingDay: isNonWorkingDay, easterSunday: easterSunday, parseISODate: parseISODate,
              computeLastDay: computeLastDay, addMonths: addMonths, holidaysNL: holidays, icsEvent: icsEvent };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Deadline = api;
})(this);
