// Sada · places: countries, regions, cities and how to say "in X" in each language.
// Pure data + helpers, no DOM. Used by the profile engine and the social scan.

export const norm = (s) => String(s || "")
  .replace(/[ً-ٰٟـ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
  .normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").toLowerCase().replace(/\s+/g, " ").trim();

// code: [en, de, fr, ar, main language, fr preposition, de preposition]
const C = {
  DE: ["Germany", "Deutschland", "Allemagne", "ألمانيا", "de", "en", "in"],
  AT: ["Austria", "Österreich", "Autriche", "النمسا", "de", "en", "in"],
  CH: ["Switzerland", "Schweiz", "Suisse", "سويسرا", "de", "en", "in der"],
  LI: ["Liechtenstein", "Liechtenstein", "Liechtenstein", "ليختنشتاين", "de", "au", "in"],
  FR: ["France", "Frankreich", "France", "فرنسا", "fr", "en", "in"],
  BE: ["Belgium", "Belgien", "Belgique", "بلجيكا", "fr", "en", "in"],
  LU: ["Luxembourg", "Luxemburg", "Luxembourg", "لوكسمبورغ", "fr", "au", "in"],
  NL: ["the Netherlands", "den Niederlanden", "Pays-Bas", "هولندا", "nl", "aux", "in"],
  IT: ["Italy", "Italien", "Italie", "إيطاليا", "it", "en", "in"],
  ES: ["Spain", "Spanien", "Espagne", "إسبانيا", "es", "en", "in"],
  PT: ["Portugal", "Portugal", "Portugal", "البرتغال", "pt", "au", "in"],
  GB: ["the UK", "Großbritannien", "Royaume-Uni", "المملكة المتحدة", "en", "au", "in"],
  IE: ["Ireland", "Irland", "Irlande", "أيرلندا", "en", "en", "in"],
  US: ["the US", "den USA", "États-Unis", "الولايات المتحدة", "en", "aux", "in"],
  CA: ["Canada", "Kanada", "Canada", "كندا", "en", "au", "in"],
  PL: ["Poland", "Polen", "Pologne", "بولندا", "pl", "en", "in"],
  CZ: ["Czechia", "Tschechien", "Tchéquie", "التشيك", "cs", "en", "in"],
  DK: ["Denmark", "Dänemark", "Danemark", "الدنمارك", "da", "au", "in"],
  SE: ["Sweden", "Schweden", "Suède", "السويد", "sv", "en", "in"],
  NO: ["Norway", "Norwegen", "Norvège", "النرويج", "no", "en", "in"],
  FI: ["Finland", "Finnland", "Finlande", "فنلندا", "fi", "en", "in"],
  GR: ["Greece", "Griechenland", "Grèce", "اليونان", "el", "en", "in"],
  TR: ["Türkiye", "der Türkei", "Turquie", "تركيا", "tr", "en", "in"],
  HU: ["Hungary", "Ungarn", "Hongrie", "المجر", "hu", "en", "in"],
  RO: ["Romania", "Rumänien", "Roumanie", "رومانيا", "ro", "en", "in"],
  TN: ["Tunisia", "Tunesien", "Tunisie", "تونس", "ar", "en", "in"],
  MA: ["Morocco", "Marokko", "Maroc", "المغرب", "ar", "au", "in"],
  DZ: ["Algeria", "Algerien", "Algérie", "الجزائر", "ar", "en", "in"],
  EG: ["Egypt", "Ägypten", "Égypte", "مصر", "ar", "en", "in"],
  LB: ["Lebanon", "dem Libanon", "Liban", "لبنان", "ar", "au", "in"],
  JO: ["Jordan", "Jordanien", "Jordanie", "الأردن", "ar", "en", "in"],
  AE: ["the UAE", "den Vereinigten Arabischen Emiraten", "Émirats arabes unis", "الإمارات", "ar", "aux", "in"],
  SA: ["Saudi Arabia", "Saudi-Arabien", "Arabie saoudite", "السعودية", "ar", "en", "in"],
  QA: ["Qatar", "Katar", "Qatar", "قطر", "ar", "au", "in"],
  IL: ["Israel", "Israel", "Israël", "إسرائيل", "he", "en", "in"],
  IN: ["India", "Indien", "Inde", "الهند", "en", "en", "in"],
  JP: ["Japan", "Japan", "Japon", "اليابان", "ja", "au", "in"],
  AU: ["Australia", "Australien", "Australie", "أستراليا", "en", "en", "in"],
  BR: ["Brazil", "Brasilien", "Brésil", "البرازيل", "pt", "au", "in"],
  MX: ["Mexico", "Mexiko", "Mexique", "المكسيك", "es", "au", "in"]
};
const TLD = { de: "DE", at: "AT", ch: "CH", li: "LI", fr: "FR", be: "BE", lu: "LU", nl: "NL", it: "IT", es: "ES", pt: "PT", uk: "GB", ie: "IE", ca: "CA", pl: "PL", cz: "CZ", dk: "DK", se: "SE", no: "NO", fi: "FI", gr: "GR", tr: "TR", hu: "HU", ro: "RO", tn: "TN", ma: "MA", dz: "DZ", eg: "EG", lb: "LB", jo: "JO", ae: "AE", sa: "SA", qa: "QA", il: "IL", in: "IN", jp: "JP", au: "AU", br: "BR", mx: "MX" };
const ALIASES = { DE: ["german", "allemand", "deutsch"], GB: ["united kingdom", "great britain", "england", "royaume uni"], US: ["usa", "united states", "u.s.", "etats unis"], NL: ["netherlands", "holland", "niederlande", "pays bas"], AE: ["united arab emirates", "dubai", "uae", "emirats arabes unis"], CH: ["suisse", "svizzera"], TR: ["turkey", "turkei"] };

// German Länder and a few other regions people ask about. [en, de, fr phrase "in", ar]
const R = {
  BY: ["Bavaria", "Bayern", "en Bavière", "بافاريا", "DE"],
  BW: ["Baden-Württemberg", "Baden-Württemberg", "dans le Bade-Wurtemberg", "بادن-فورتمبيرغ", "DE"],
  BE: ["Berlin", "Berlin", "à Berlin", "برلين", "DE"],
  BB: ["Brandenburg", "Brandenburg", "dans le Brandebourg", "براندنبورغ", "DE"],
  HB: ["Bremen", "Bremen", "à Brême", "بريمن", "DE"],
  HH: ["Hamburg", "Hamburg", "à Hambourg", "هامبورغ", "DE"],
  HE: ["Hesse", "Hessen", "en Hesse", "هيسن", "DE"],
  MV: ["Mecklenburg-Vorpommern", "Mecklenburg-Vorpommern", "dans le Mecklembourg-Poméranie-Occidentale", "مكلنبورغ فوربومرن", "DE"],
  NI: ["Lower Saxony", "Niedersachsen", "en Basse-Saxe", "سكسونيا السفلى", "DE"],
  NW: ["North Rhine-Westphalia", "Nordrhein-Westfalen", "en Rhénanie-du-Nord-Westphalie", "شمال الراين وستفاليا", "DE"],
  RP: ["Rhineland-Palatinate", "Rheinland-Pfalz", "en Rhénanie-Palatinat", "راينلاند بفالتس", "DE"],
  SL: ["Saarland", "Saarland", "en Sarre", "سارلاند", "DE"],
  SN: ["Saxony", "Sachsen", "en Saxe", "ساكسونيا", "DE"],
  ST: ["Saxony-Anhalt", "Sachsen-Anhalt", "en Saxe-Anhalt", "ساكسونيا أنهالت", "DE"],
  SH: ["Schleswig-Holstein", "Schleswig-Holstein", "dans le Schleswig-Holstein", "شليسفيغ هولشتاين", "DE"],
  TH: ["Thuringia", "Thüringen", "en Thuringe", "تورينغن", "DE"],
  T: ["Tyrol", "Tirol", "au Tyrol", "تيرول", "AT"],
  IDF: ["Île-de-France", "der Île-de-France", "en Île-de-France", "إيل دو فرانس", "FR"],
  ALS: ["Alsace", "dem Elsass", "en Alsace", "الألزاس", "FR"],
  BRE: ["Brittany", "der Bretagne", "en Bretagne", "بريتاني", "FR"],
  PRO: ["Provence", "der Provence", "en Provence", "بروفانس", "FR"]
};
const REGION_ALIASES = { BY: ["bavarian", "bayerisch", "bayerische", "bayerischen", "freistaat bayern"], BW: ["baden wurttemberg", "baden-wuerttemberg"], NW: ["nrw"] };

export const LANG_NAMES = /^(english|englisch|anglais|inglés|german|deutsch|allemand|french|französisch|francais|français|arabic|arabisch|arabe|spanish|spanisch|espagnol|italian|italienisch|italien|turkish|türkisch|turc|easy language|plain language|leichte sprache|einfache sprache|gebärdensprache|sign language|langue des signes|other languages|languages|sprachen|langues|العربية|الإنجليزية|الانجليزية|الفرنسية|الألمانية)$/i;

export function country(code) {
  const c = C[String(code || "").toUpperCase()];
  return c ? { code: String(code).toUpperCase(), en: c[0], de: c[1], fr: c[2], ar: c[3], main: c[4] } : null;
}
export function countryFromTld(host) {
  const t = String(host || "").split(".").pop().toLowerCase();
  return TLD[t] || "";
}
export function countryFromName(s) {
  const n = norm(s).replace(/^(the|der|die|den|dem|la|le|les|l')\s+/, "");
  if (!n) return "";
  if (/^[a-z]{2}$/i.test(String(s).trim()) && C[String(s).trim().toUpperCase()]) return String(s).trim().toUpperCase();
  for (const [code, c] of Object.entries(C)) {
    for (const v of c.slice(0, 4)) if (norm(v).replace(/^(the|der|den|dem)\s+/, "") === n) return code;
  }
  for (const [code, list] of Object.entries(ALIASES)) if (list.includes(n)) return code;
  return "";
}
export function region(code) {
  const r = R[code];
  return r ? { code, en: r[0], de: r[1], fr: r[2], ar: r[3], country: r[4] } : null;
}
export function regionFromText(s) {
  const raw = String(s || "");
  const n = " " + norm(raw).replace(/[^\p{L}\p{N}]+/gu, " ") + " ";
  let best = "", hits = 0;
  for (const [code, r] of Object.entries(R)) {
    if (code === "BE") continue; // Berlin is a city first; it is found as a town
    const names = [r[0], r[1], ...(REGION_ALIASES[code] || [])].map((x) => norm(x).replace(/[^\p{L}\p{N}]+/gu, " "));
    let h = 0;
    for (const v of new Set(names)) {
      let i = n.indexOf(" " + v + " ");
      while (i >= 0) { h++; i = n.indexOf(" " + v + " ", i + 1); }
    }
    // CamelCase brand names such as "BayernHistoryApp"
    for (const v of [r[0], r[1]]) if (/^[A-Z][a-z]+$/.test(v) && new RegExp(`${v}(?=[A-Z][a-z])`).test(raw)) h += 1;
    if (h > hits) { hits = h; best = code; }
  }
  return hits ? { code: best, hits } : null;
}
export function mainLanguage(code) {
  return C[code]?.[4] || "";
}

// " in X" phrases (with the leading space) for each language
export function inCity(L, city) {
  if (!city) return "";
  if (L === "fr") {
    if (/^le\s/i.test(city)) return " au " + city.slice(3);
    if (/^les\s/i.test(city)) return " aux " + city.slice(4);
    return " à " + city;
  }
  if (L === "ar") return " في " + city;
  return " in " + city;
}
export function inCountry(L, code) {
  const c = C[code];
  if (!c) return "";
  if (L === "fr") {
    const p = c[5];
    return p === "en" ? " en " + c[2] : p === "aux" ? " aux " + c[2] : " au " + c[2];
  }
  if (L === "de") return " " + (c[6] === "in" ? "in " : c[6] + " ") + c[1];
  if (L === "ar") return " في " + c[3];
  return " in " + c[0];
}
export function inRegion(L, code) {
  const r = R[code];
  if (!r) return "";
  if (L === "fr") return " " + r[2];
  if (L === "de") return " in " + r[1];
  if (L === "ar") return " في " + r[3];
  return " in " + r[0];
}
export function countryName(L, code) {
  const c = C[code];
  if (!c) return "";
  return { en: c[0].replace(/^the /, ""), de: c[1].replace(/^(der|den|dem) /, ""), fr: c[2], ar: c[3] }[L] || c[0];
}
export function regionName(L, code) {
  const r = R[code];
  if (!r) return "";
  return { en: r[0], de: r[1].replace(/^(der|dem) /, ""), fr: r[2].replace(/^(en|dans le|à|au)\s/, ""), ar: r[3] }[L] || r[0];
}

// Postal code + town, for an address line. Returns town or "".
const STREET = /(straße|strasse|str\.|weg|platz|allee|gasse|ring|damm|ufer|markt|rue|avenue|av\.|boulevard|bd|chemin|allée|place|quai|impasse|road|rd\.|street|st\.|lane|drive|way|square|via|calle|شارع|نهج|طريق|postfach|bp\s?\d|cedex|campus)/i;
export function townsIn(text) {
  const out = [];
  const t = String(text || "").replace(/ /g, " ");
  // 72488 Sigmaringen · D-72458 Albstadt · 1002 Tunis · 75011 Paris
  const re = /(?:^|[\s,;|·•(])(?:[A-Z]{1,2}-)?(\d{4,5})\s+([A-ZÄÖÜÀ-ÝŒ][\p{L}'’.-]+(?:\s(?:am|an|im|ob|bei|vor|sur|sous|lès|en)(?:\s(?:der|dem|den|la|le|les))?\s[A-ZÄÖÜÀ-Ý][\p{L}'’.-]+)?)/gu;
  for (const m of t.matchAll(re)) {
    const before = t.slice(Math.max(0, m.index - 90), m.index + 1);
    const after = t.slice(m.index, m.index + 60);
    if (!STREET.test(before) && !/(cedex|germany|deutschland|france|österreich|schweiz|tunisie|tunisia)/i.test(after)) continue;
    let town = m[2].replace(/[.,]+$/, "").trim();
    if (/(straße|strasse|str\.|weg|platz|allee|gasse)$/i.test(town)) continue;
    if (/^(Tel|Fax|Telefon|Phone|E-?Mail|Mail|Uhr|Euro|EUR|Mo|Di|Mi|Do|Fr|Sa|So|Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jahre|Years|Ans)\b/i.test(town)) continue;
    town = town.replace(/\s+(Tel|Telefon|Fax|Phone|E-Mail|Germany|Deutschland|France|Allemagne)\b.*$/i, "").trim();
    if (town.length >= 2 && town.length <= 40) out.push(town);
  }
  // US: Springfield, IL 62701
  for (const m of t.matchAll(/([A-Z][a-zA-Z .'-]{2,30}),\s*([A-Z]{2})\s+\d{5}(?:-\d{4})?/g)) out.push(m[1].trim());
  // UK: London SW1A 1AA
  for (const m of t.matchAll(/([A-Z][a-z]+(?: [A-Z][a-z]+)?),?\s+([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})\b/g)) out.push(m[1].trim());
  return out;
}
