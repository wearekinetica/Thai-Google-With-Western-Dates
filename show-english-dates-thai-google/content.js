// Converts Thai & English BE dates → English Gregorian (robust whitespace; single-pass)
(() => {
  // Only on Google domains
  if (!/\.(?:google)\./i.test(location.hostname) && !/^google\./i.test(location.hostname)) return;

  // Helpers
  const THAI_DIG = "๐๑๒๓๔๕๖๗๘๙";
  const ARAB_DIG = "٠١٢٣٤٥٦٧٨٩";
  const toAsciiDigits = s => s.replace(/[๐-๙٠-٩]/g, ch => {
    const t = THAI_DIG.indexOf(ch); if (t !== -1) return String(t);
    const a = ARAB_DIG.indexOf(ch); if (a !== -1) return String(a);
    return ch;
  });
  const isBEYear = y => y >= 2400 && y <= 3100;
  const WS = `[\\s\\u00A0\\u2009\\u202F]`; // spaces incl NBSP/thin/narrow

  // Thai months → English 3-letter
  const monthPatterns = [
    { re: /มกราคม|ม\.?\s?ค\.?/i, en: "Jan" },
    { re: /กุมภาพันธ์|ก\.?\s?พ\.?/i, en: "Feb" },
    { re: /มีนาคม|มี\.?\s?ค\.?/i, en: "Mar" },
    { re: /เมษายน|เม\.?\s?ย\.?/i, en: "Apr" },
    { re: /พฤษภาคม|พ\.?\s?ค\.?/i, en: "May" },
    { re: /มิถุนายน|มิ\.?\s?ย\.?/i, en: "Jun" },
    { re: /กรกฎาคม|ก\.?\s?ค\.?/i, en: "Jul" },
    { re: /สิงหาคม|ส\.?\s?ค\.?/i, en: "Aug" },
    { re: /กันยายน|ก\.?\s?ย\.?/i, en: "Sep" },
    { re: /ตุลาคม|ต\.?\s?ค\.?/i, en: "Oct" },
    { re: /พฤศจิกายน|พ\.?\s?ย\.?/i, en: "Nov" },
    { re: /ธันวาคม|ธ\.?\s?ค\.?/i, en: "Dec" }
  ];
  const toEnglishMonth = txt => { for (const {re,en} of monthPatterns) if (re.test(txt)) return en; return null; };

  // Build Thai month alternation
  const monthAlt = [
    "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
    "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
    "ม\\.?\\s?ค\\.?","ก\\.?\\s?พ\\.?","มี\\.?\\s?ค\\.?","เม\\.?\\s?ย\\.?",
    "พ\\.?\\s?ค\\.?","มิ\\.?\\s?ย\\.?","ก\\.?\\s?ค\\.?","ส\\.?\\s?ค\\.?",
    "ก\\.?\\s?ย\\.?","ต\\.?\\s?ค\\.?","พ\\.?\\s?ย\\.?","ธ\\.?\\s?ค\\.?"
  ].join("|");
  const monthRe = `(?:${monthAlt})`;
  const DIG = `0-9\\u0E50-\\u0E59\\u0660-\\u0669`;
  const beMarker = `(?:BE|B\\.E\\.|พ\\.?ศ\\.?|พศ)`;
  const beMarkerOpt = `(?:${WS}*${beMarker})?`;

  // Thai patterns using WS
  const thDayMonYear = new RegExp(`(^|${WS})` + `([${DIG}]{1,2})` + `${WS}+` + `(${monthRe})` + `${WS}+` + `${beMarkerOpt}` + `([${DIG}]{4,5})(?=\\b|${WS}|$)`, "gi");
  const thMonYear   = new RegExp(`(^|${WS})` + `(${monthRe})` + `${WS}+` + `${beMarkerOpt}` + `([${DIG}]{4,5})(?=\\b|${WS}|$)`, "gi");
  const thBEOnly    = new RegExp(`(^|${WS})` + `${beMarker}` + `${WS}*` + `([${DIG}]{4,5})(?=\\b|${WS}|$)`, "gi");

  // English patterns using WS
  const monthEnRe = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
  const enMonthDayYear = new RegExp(`(^|${WS})` + `(${monthEnRe})` + `${WS}+` + `(\\d{1,2})` + `,` + `${WS}*` + `(\\d{4})` + `${WS}*` + `${beMarkerOpt}(?=\\b|${WS}|$)`, "gi");
  const enDayMonthYear = new RegExp(`(^|${WS})` + `(\\d{1,2})` + `${WS}+` + `(${monthEnRe})` + `${WS}+` + `(\\d{4})` + `${WS}*` + `${beMarkerOpt}(?=\\b|${WS}|$)`, "gi");
  const enMonthYear    = new RegExp(`(^|${WS})` + `(${monthEnRe})` + `${WS}+` + `(\\d{4})` + `${WS}*` + `${beMarkerOpt}(?=\\b|${WS}|$)`, "gi");

  const looksLikeDate = new RegExp(`${monthRe}|${monthEnRe}|${beMarker}`, "i");

  // Transformer: English pass first; if changed, return. Then Thai pass.
  function transformText(text) {
    if (!text || !looksLikeDate.test(text)) return null;
    let out = text;

    // English pass
    const beforeEn = out;
    out = out.replace(enMonthDayYear, (m, lead, mon, day, year) => {
      const y = parseInt(year, 10); const g = isBEYear(y) || /(?:^|\\b)BE\\b|B\\.E\\.|พ\\.?ศ\\.?|พศ/i.test(m) ? y - 543 : y;
      return `${lead}${mon} ${day}, ${g}`;
    });
    out = out.replace(enDayMonthYear, (m, lead, day, mon, year) => {
      const y = parseInt(year, 10); const g = isBEYear(y) || /(?:^|\\b)BE\\b|B\\.E\\.|พ\\.?ศ\\.?|พศ/i.test(m) ? y - 543 : y;
      return `${lead}${day} ${mon} ${g}`;
    });
    out = out.replace(enMonthYear, (m, lead, mon, year) => {
      const y = parseInt(year, 10); const g = isBEYear(y) || /(?:^|\\b)BE\\b|B\\.E\\.|พ\\.?ศ\\.?|พศ/i.test(m) ? y - 543 : y;
      return `${lead}${mon} ${g}`;
    });
    if (out !== beforeEn) return out;

    // Thai pass
    const convertYearAscii = tok => {
      const n = parseInt(toAsciiDigits(tok), 10);
      return isBEYear(n) ? String(n - 543) : null;
    };

    out = out.replace(thDayMonYear, (m, lead, day, monTok, yearTok) => {
      const mon = toEnglishMonth(monTok); if (!mon) return m;
      const y = convertYearAscii(yearTok) ?? toAsciiDigits(yearTok);
      return `${lead}${toAsciiDigits(day)} ${mon} ${y}`;
    });
    out = out.replace(thMonYear, (m, lead, monTok, yearTok) => {
      const mon = toEnglishMonth(monTok); if (!mon) return m;
      const y = convertYearAscii(yearTok) ?? toAsciiDigits(yearTok);
      return `${lead}${mon} ${y}`;
    });
    out = out.replace(thBEOnly, (m, lead, yearTok) => {
      const y = convertYearAscii(yearTok);
      if (!y) return m;
      return `${lead}${y}`;
    });

    return out !== text ? out.replace(/\s{2,}/g, " ").trim() : null;
  }

  function processNode(root) {
    const spans = root.nodeName === "SPAN" ? [root] : root.querySelectorAll("span");
    spans.forEach(el => {
      if (el.dataset.beConverted === "1") return;
      const updated = transformText(el.textContent);
      if (updated) { el.textContent = updated; el.dataset.beConverted = "1"; }
    });
  }

  processNode(document);
  const observer = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === "childList") m.addedNodes.forEach(n => { if (n.nodeType === 1) processNode(n); });
      else if (m.type === "characterData" && m.target.parentElement) {
        const el = m.target.parentElement;
        if (el.tagName === "SPAN" && el.dataset.beConverted !== "1") {
          const updated = transformText(el.textContent);
          if (updated) { el.textContent = updated; el.dataset.beConverted = "1"; }
        }
      }
    }
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
})();