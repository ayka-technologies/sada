// Sada · who is this site? Name, sector, place and offers, read from the
// page you are on, the home page and (after a site scan) other pages.
// Everything runs on the device. No network calls here.

import { SUBTYPES, SCHEMA_SUB, GENERIC, subById, subFromLabel, defaultSubFor } from "./kinds.js";
import { norm, countryFromTld, countryFromName, country, countryName, regionFromText, region, regionName, townsIn, LANG_NAMES, mainLanguage } from "./geo.js";

const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const LANGS = ["en", "fr", "de", "ar"];

// ── signals from one document ───────────────────────────────────────────────
function textOf(el) {
  if (!el) return "";
  const c = el.cloneNode(true);
  c.querySelectorAll("script,style,noscript,template,svg,iframe").forEach((x) => x.remove());
  const doc = c.ownerDocument;
  c.querySelectorAll("p,div,li,br,h1,h2,h3,h4,h5,h6,td,th,dt,dd,section,article,header,footer,nav,address,tr,a,button,label,figcaption,summary,option").forEach((x) => x.after(doc.createTextNode(" ")));
  return clean(c.textContent);
}
function jsonNodes(doc) {
  const out = [];
  const walk = (n) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (n["@type"]) out.push(n);
    if (n["@graph"]) walk(n["@graph"]);
    for (const k of ["publisher", "provider", "organizer", "author", "parentOrganization", "isPartOf", "about", "mainEntity"]) if (n[k] && typeof n[k] === "object") walk(n[k]);
  };
  doc.querySelectorAll('script[type="application/ld+json" i]').forEach((s) => {
    try { walk(JSON.parse(s.textContent || "")); } catch {}
  });
  return out;
}
const types = (n) => [].concat(n?.["@type"] || []).map(String);
const ORG = /Organization|Organisation|Business|College|University|School|Museum|Gallery|Library|NGO|Corporation|Store|Restaurant|Hotel|Lodging|Clinic|Physician|Dentist|Attorney|LegalService|Government|Agency|Service\b|Place|Cafe|Bakery|Theater|Festival/;

export function signals(doc, url, role = "page") {
  const meta = (sel) => clean(doc.querySelector(sel)?.getAttribute("content"));
  const body = doc.body || doc.documentElement;
  const mainEl = doc.querySelector("main") || doc.querySelector("article") || doc.querySelector('[role="main"]') || body;
  const nav = Array.from(doc.querySelectorAll("nav a, header a, [role=navigation] a, [class*=menu] a")).map((a) => clean(a.textContent)).filter((t) => t && t.length <= 60).slice(0, 120);
  const footerEls = Array.from(doc.querySelectorAll("footer, [role=contentinfo], [class*=footer], [id*=footer], address, [itemprop=address], [class*=contact], [class*=address], [class*=impressum], [class*=imprint]"));
  const footer = footerEls.map(textOf).join(" \n ").slice(0, 6000);
  const logos = Array.from(doc.querySelectorAll('header img[alt], a[href="/"] img[alt], a[rel=home] img[alt], img[class*=logo i][alt], img[id*=logo i][alt], img[src*=logo i][alt], [class*=logo i] img[alt]'))
    .map((i) => clean(i.getAttribute("alt"))).filter((a) => a.length >= 2 && a.length <= 80);
  const headings = Array.from(mainEl.querySelectorAll("h2,h3")).map(textOf).filter((t) => t && t.length <= 120).slice(0, 40);
  const copyright = [];
  const tw = doc.createTreeWalker(body, 4);
  for (let n = tw.nextNode(); n && copyright.length < 3; n = tw.nextNode()) if (/©|\(c\)|copyright/i.test(n.data) && !n.parentElement?.closest("script,style")) copyright.push(clean(n.parentElement?.textContent || n.data));
  return {
    url, role,
    lang: clean(doc.documentElement.getAttribute("lang")).slice(0, 2).toLowerCase(),
    title: clean(doc.querySelector("title")?.textContent),
    ogTitle: meta('meta[property="og:title" i]'),
    site: meta('meta[property="og:site_name" i]') || meta('meta[name="application-name" i]') || meta('meta[name="apple-mobile-web-app-title" i]'),
    desc: meta('meta[name="description" i]') || meta('meta[property="og:description" i]'),
    h1: textOf(mainEl.querySelector("h1") || doc.querySelector("h1")),
    headings, nav, footer, logos, copyright,
    body: textOf(mainEl).slice(0, 12000),
    all: textOf(body).slice(0, 30000),
    nodes: jsonNodes(doc),
    geo: meta('meta[name="geo.placename" i]'),
    geoRegion: meta('meta[name="geo.region" i]'),
    hreflangs: Array.from(doc.querySelectorAll('link[rel="alternate" i][hreflang]')).map((l) => clean(l.getAttribute("hreflang")).toLowerCase())
  };
}

// ── name ────────────────────────────────────────────────────────────────────
const SEP = /\s+[|–—\-:·•»›\/]\s+|\s*[|·•»›]\s*/;
const PAGEY = /^(home|homepage|start|startseite|accueil|bienvenue|welcome|willkommen|الرئيسية|official (?:site|website)|site officiel|offizielle (?:website|seite)|information(?:en)? in english|information in english|english|deutsch|français|العربية|news|aktuelles|actualités|contact|kontakt|impressum|imprint|about(?: us)?|über uns|à propos|privacy|datenschutz)$/i;
const CORP = /\s*(,?\s*(gmbh|ag|kg|ohg|ug(?: \(haftungsbeschränkt\))?|gbr|e\.?\s?k\.|ltd\.?|llc|inc\.?|s\.?a\.?r\.?l\.?|sarl|sas|sa|bv|plc|co\.?))+\.?$/i;

function domainLabel(host) {
  const h = String(host || "").replace(/^www\d?\./, "").split(".");
  if (h.length > 2 && /^(co|com|org|ac|gov|net|edu)$/.test(h[h.length - 2])) h.splice(-2, 2); else h.pop();
  return h[h.length - 1] || "";
}
// How well a name explains the domain: "hs-albsig" ↔ "Hochschule Albstadt-Sigmaringen" → 1
function domainFit(name, host) {
  const label = norm(domainLabel(host)).replace(/[^a-z0-9]/g, "");
  if (!label || label.length < 2) return 0;
  const words = norm(name).split(/[^\p{L}\p{N}]+/u).filter(Boolean).map((w) => w.replace(/[^a-z0-9]/g, "")).filter(Boolean);
  if (!words.length || words.length > 9) return 0;
  const variants = [label, label.replace(/^(get|try|my|the|go|use|join|hello|team|we)/, ""), label.replace(/(app|hq|online|group|official|digital|web|de|fr|ev)$/, "")].filter((v, i, a) => v.length >= 2 && a.indexOf(v) === i);
  let best = 0;
  for (const L of variants) {
    const memo = new Map();
    const f = (i, j) => {
      if (i >= L.length || j >= words.length) return 0;
      const k = i + "," + j;
      if (memo.has(k)) return memo.get(k);
      let r = f(i, j + 1);
      const w = words[j];
      if (w[0] === L[i]) {
        let p = 1, q = 1;
        r = Math.max(r, 1 + f(i + 1, j + 1));
        while (i + p < L.length && q < w.length) {
          if (w[q] === L[i + p]) { p++; r = Math.max(r, p + f(i + p, j + 1)); }
          q++;
        }
      }
      memo.set(k, r);
      return r;
    };
    const fit = f(0, 0) / L.length;
    // a long word salad can match anything: discount it
    best = Math.max(best, fit * (words.length <= 5 ? 1 : 0.8));
  }
  return best;
}
const cleanName = (s) => clean(String(s || "").replace(/^(©|\(c\)|copyright)\s*/i, "").replace(/\b(19|20)\d{2}(\s*[-–]\s*(19|20)?\d{2,4})?\b/g, "").replace(/(all rights reserved|alle rechte vorbehalten|tous droits réservés|جميع الحقوق محفوظة).*$/i, "").replace(/^(logo|logo of|logo der|logo de|logo von|logotype)\s+/i, "").replace(/\s+(logo|homepage|startseite)$/i, "").replace(/^[\s,.:–—-]+/, "").replace(/(?<!\b\p{L}\.\p{L})[\s,.:–—-]+$/u, "").replace(/(\be\.\s?V)$/i, "$1."));
const tokens = (s) => new Set(norm(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2 && !/^(the|der|die|das|und|and|von|for|für|des|les|la|le|of|university|hochschule|universität|université|gmbh|e\.v)$/.test(w)));
function sameEntity(a, b) {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return false;
  let n = 0;
  for (const x of A) if (B.has(x)) n++;
  return n / Math.min(A.size, B.size) >= 0.6;
}

const LANG_WORDS = {
  en: /\b(university|college|school|museum|foundation|association|society|institute|centre|center|award|prize|gallery|library|city of)\b/i,
  de: /(hochschule|universität|schule|museum|stiftung|verein|gesellschaft|institut|zentrum|preis|galerie|bibliothek|stadt\s)/i,
  fr: /\b(université|école|musée|fondation|association|société|institut|centre|prix|galerie|bibliothèque|ville de)\b/i,
  ar: /(جامعة|مدرسة|متحف|مؤسسة|جمعية|معهد|مركز|جائزة|مكتبة|بلدية)/
};
function pickName(sigs, host, lang) {
  const cand = new Map();
  const add = (raw, w, why, s) => {
    const v = cleanName(raw);
    if (!v || v.length < 2 || v.length > 70 || v.split(/\s+/).length > 9 || PAGEY.test(v) || /^https?:/i.test(v)) return;
    const k = norm(v);
    const c = cand.get(k) || { name: v, score: 0, why: [], langs: new Set() };
    c.score += w;
    c.why.push(why);
    if (s?.lang) c.langs.add(s.lang);
    cand.set(k, c);
  };
  const titleSegs = sigs.map((s) => (s.title || "").split(SEP).map(clean).filter(Boolean));
  const segCount = new Map();
  titleSegs.forEach((segs) => new Set(segs.map(norm)).forEach((k) => segCount.set(k, (segCount.get(k) || 0) + 1)));
  sigs.forEach((s, i) => {
    const page = s.role === "page";
    for (const n of s.nodes) {
      const t = types(n).join(" ");
      if (ORG.test(t) && typeof n.name === "string") {
        add(n.name, page ? 7 : 6, "schema", s);
        for (const a of [].concat(n.alternateName || [])) if (typeof a === "string") add(a, 2, "schema-alt", s);
      }
      if (/WebSite/.test(t) && typeof n.name === "string") add(n.name, 4, "website", s);
    }
    if (s.site) add(s.site, 5, "og:site_name", s);
    for (const l of s.logos.slice(0, 2)) add(l, 2.5, "logo", s);
    const segs = titleSegs[i];
    segs.forEach((seg, j) => {
      let w = 1;
      if (segs.length > 1) {
        if (segCount.get(norm(seg)) >= 2 && sigs.length > 1) w += 3;
        if (j === segs.length - 1) w += 1.2;
        if (norm(seg) === norm(s.ogTitle) || norm(seg) === norm(s.h1)) w -= 2.5;
      } else if (s.role === "home") w += 1.5;
      w += 3 * domainFit(seg, host);
      if (page) w += 0.5;
      add(seg, w, "title", s);
    });
    const cr = /(?:©|\(c\)|copyright)\s*(?:(?:19|20)\d{2}\s*(?:[-–]\s*(?:19|20)?\d{2,4})?\s*)?(?:by\s+)?([^|·•\n©]{3,70})/i.exec((s.copyright || []).join("\n"));
    if (cr) add(cr[1].split(/\s[|–—]\s|\.\s|, (?:all|alle|tous)/i)[0], 3, "copyright", s);
  });
  // Merge variants of the same entity ("Hochschule Albstadt-Sigmaringen" ≈ "Albstadt-Sigmaringen University")
  const list = [...cand.values()];
  for (const c of list) c.total = c.score + 2 * domainFit(c.name, host);
  for (const a of list) for (const b of list) if (a !== b && sameEntity(a.name, b.name)) a.total += b.score * 0.6;
  list.sort((a, b) => b.total - a.total);
  let best = list[0];
  // Prefer the variant written in the language of the questions
  if (best) {
    const twins = list.filter((c) => c === best || sameEntity(c.name, best.name));
    const words = LANG_WORDS[lang];
    const other = Object.entries(LANG_WORDS).filter(([l]) => l !== lang).map(([, re]) => re);
    const fits = (c) => (words?.test(c.name) ? 2 : 0) - (other.some((re) => re.test(c.name)) ? 1 : 0) + (c.why.includes("title") && c.langs.has(lang) ? 1 : 0);
    const pick = twins.filter((c) => c.total >= best.total * 0.35).sort((a, b) => fits(b) - fits(a) || b.total - a.total)[0];
    if (pick && fits(pick) > fits(best)) best = pick;
  }
  const label = domainLabel(host);
  const fallback = label ? label.split("-").map((w) => w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)).join(" ") : "";
  if (!best || best.total < 2.5) return { name: fallback, aliases: [], confidence: 0.2, why: ["domain"] };
  const name = best.name.replace(CORP, "").trim() || best.name;
  const aliases = [];
  for (const c of list) {
    if (c === best || !sameEntity(c.name, best.name) || norm(c.name) === norm(name)) continue;
    if (aliases.some((a) => norm(c.name).includes(norm(a)) || norm(a).includes(norm(c.name)))) continue;
    aliases.push(c.name);
  }
  aliases.splice(4);
  return { name, aliases, confidence: Math.min(1, best.total / 10), why: best.why };
}

// ── sector ──────────────────────────────────────────────────────────────────
function count(re, text) {
  if (!text) return 0;
  re.lastIndex = 0;
  let n = 0;
  while (re.exec(text)) { n++; if (n > 30) break; }
  re.lastIndex = 0;
  return n;
}
function pickKind(sigs, name) {
  const score = new Map();
  const add = (id, v) => v && score.set(id, (score.get(id) || 0) + v);
  const page = sigs.find((s) => s.role === "page") || sigs[0];
  const home = sigs.find((s) => s.role === "home");
  const own = [page, home].filter(Boolean);
  for (const st of SUBTYPES) {
    let v = 5 * Math.min(1, count(st.re, name));
    for (const s of own) {
      const w = s === page ? 1 : 0.8;
      v += w * (2.5 * Math.min(2, count(st.re, s.title)) + 1.5 * Math.min(2, count(st.re, s.site)) + 2 * Math.min(2, count(st.re, s.desc)) + 2 * Math.min(2, count(st.re, s.h1)) + 0.6 * Math.min(4, count(st.re, s.headings.join(" \n "))) + 0.3 * Math.min(5, count(st.re, s.nav.join(" \n "))) + 0.25 * Math.min(8, count(st.re, s.body)));
    }
    for (const s of sigs.filter((x) => x.role === "site")) v += 0.15 * Math.min(4, count(st.re, `${s.title} ${s.h1}`));
    add(st.id, v);
  }
  for (const s of sigs) for (const n of s.nodes) {
    const t = types(n).join(" ");
    for (const [re, id] of SCHEMA_SUB) if (re.test(t)) { add(id, ORG.test(t) || /Product|Course|Dataset|Map|Festival|SoftwareApplication/.test(t) ? 6 : 2); break; }
  }
  // "Stadt Albstadt", "Gemeinde X", "City of X", "Ville de X": a town administration
  if (/^(Stadt|Gemeinde|Markt|Marktgemeinde|Landkreis|Kreis|Landratsamt|Stadtverwaltung|City of|Town of|County of|Ville de|Mairie de|Commune de|Municipality of|بلدية)\s+\S/u.test(name.trim())) add("municipality", 9);
  // university of applied sciences is a special case of university
  if ((score.get("uas") || 0) > 2) add("uas", (score.get("university") || 0) * 0.5);
  // "Hochschule"-style names decide on their own
  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1]);
  const [topId, top] = ranked[0] || ["generic", 0];
  const second = ranked[1]?.[1] || 0;
  if (top < 2.5) return { sub: GENERIC, confidence: 0.2, ranked };
  const sub = subById(topId);
  const alt = ranked.slice(1).find(([id, v]) => v >= top * 0.7 && subById(id)?.kind !== sub.kind);
  return { sub, sub2: alt ? subById(alt[0]) : null, confidence: Math.min(1, (top - second * 0.5) / 8), ranked };
}

// ── place ───────────────────────────────────────────────────────────────────
function pickPlace(sigs, host, lang) {
  const towns = new Map();
  const addTown = (t, w) => {
    t = clean(t).replace(/[,.;]+$/, "");
    if (!t || t.length < 2 || t.length > 40 || LANG_NAMES.test(t) || countryFromName(t)) return;
    const k = norm(t);
    const e = towns.get(k) || { name: t, w: 0 };
    e.w += w;
    towns.set(k, e);
  };
  let cc = "", ccWhy = "", rg = null;
  for (const s of sigs) {
    for (const n of s.nodes) {
      for (const a of [].concat(n.address || [], n.location?.address || [])) {
        if (!a || typeof a !== "object") continue;
        if (a.addressLocality) addTown(String(a.addressLocality), 6);
        if (a.addressCountry && !cc) { cc = countryFromName(typeof a.addressCountry === "object" ? a.addressCountry.name : a.addressCountry); ccWhy = "schema"; }
        if (a.addressRegion && !rg) rg = regionFromText(String(a.addressRegion));
      }
    }
    if (s.geo) addTown(s.geo.split(/[,;]/)[0], 4);
    if (s.geoRegion && !cc) { cc = countryFromName(s.geoRegion.split("-")[0]); ccWhy = "geo"; }
    for (const t of townsIn(s.footer)) addTown(t, s.role === "site" ? 1 : 2);
    for (const t of townsIn(s.all.slice(-5000))) addTown(t, 0.5);
    const based = /(?:based in|located in|headquartered in|mit sitz in|sitz in|ansässig in|basée? à|située? à|établie? à|implantée? à|مقرها في|مقره في|يقع في|تقع في)\s+([A-ZÄÖÜÀ-Ý؀-ۿ][\p{L}'’-]+(?:[ -][A-ZÄÖÜÀ-Ý][\p{L}'’-]+)?)/u.exec(`${s.desc} ${s.body.slice(0, 3000)}`);
    if (based) {
      const c = countryFromName(based[1]);
      if (c) { if (!cc) { cc = c; ccWhy = "text"; } } else addTown(based[1], 3);
    }
  }
  // the place named in the organisation's own name ("Hochschule Albstadt-Sigmaringen")
  const ranked = [...towns.values()].sort((a, b) => b.w - a.w);
  const city = ranked[0] && ranked[0].w >= 1.5 ? ranked[0].name : "";
  const cities = ranked.filter((t) => t.w >= 1.5).map((t) => t.name).slice(0, 3);
  if (!cc) { cc = countryFromTld(host); if (cc) ccWhy = "tld"; }
  if (!cc) {
    for (const s of sigs) for (const h of [s.lang, ...s.hreflangs]) {
      const m = /^[a-z]{2}-([a-z]{2})$/i.exec(h || "");
      if (m && country(m[1]) && !cc) { cc = m[1].toUpperCase(); ccWhy = "hreflang"; }
    }
  }
  if (!rg) {
    const page = sigs.find((s) => s.role === "page") || sigs[0];
    const home = sigs.find((s) => s.role === "home");
    rg = regionFromText([page?.title, page?.desc, page?.h1, page?.site, home?.title, home?.desc, home?.site].filter(Boolean).join(" \n "));
  }
  const reg = rg ? region(rg.code) : null;
  if (reg && !cc) { cc = reg.country; ccWhy = "region"; }
  if (reg && cc && reg.country !== cc) return { city, cities, country: cc, region: "", why: ccWhy };
  return { city, cities, country: cc, region: reg?.code || "", why: ccWhy };
}

// ── offers ──────────────────────────────────────────────────────────────────
const NAV_NOISE = /^(home|start|startseite|accueil|about|about us|über uns|à propos|qui sommes-nous|contact|kontakt|contactez-nous|impressum|imprint|privacy|datenschutz|legal|mentions légales|faq|blog|news|aktuelles|actualités|presse|press|jobs|karriere|careers|team|login|anmelden|register|suche|search|recherche|menu|menü|more|mehr|plus|en|de|fr|ar|english|deutsch|français|العربية|services|leistungen|angebot|nos services|our services|products|produkte|shop|cart|warenkorb|panier|newsletter|sitemap|cookie\p{L}*|barrierefreiheit|accessibility|downloads?|links|partners?|partner|sponsors?|events?|veranstaltungen|termine|kalender|calendar|media|mediathek|galerie|gallery|portfolio|referenzen|projects?|projekte|projets|testimonials|reviews|avis|bewertungen|pricing|preise|tarifs|spenden|donate|faire un don|mitglied werden|join|support|unterstützen|soutenir|übersicht|overview|aperçu|zurück|back|retour|weiter|next|suivant|read more|weiterlesen|lire la suite|من نحن|اتصل بنا|الرئيسية|خدماتنا)$/iu;

const DEGREE = [
  // "Business Administration (B.A.)", "Data Science (M.Sc.)"
  /([A-ZÄÖÜ][\p{L}&,'’ -]{3,60}?)\s*\((?:B\.?\s?A\.?|B\.?\s?Sc\.?|B\.?\s?Eng\.?|M\.?\s?A\.?|M\.?\s?Sc\.?|M\.?\s?Eng\.?|MBA|LL\.?\s?[BM]\.?|B\.?\s?Ed\.?|M\.?\s?Ed\.?|Bachelor|Master)\)/gu,
  // "Bachelor of Science in Computer Science", "Master in Food Management"
  /(?:Bachelor|Master)(?:'s)?(?:\s+of\s+(?:Science|Arts|Engineering|Business Administration|Laws|Education))?(?:\s+(?:degree|programme|program))?\s+(?:in|of)\s+([A-Z][\p{L}&,'’ -]{3,60})/gu,
  // "Bachelorstudiengang Wirtschaftsinformatik", "Studiengang Pflege"
  /(?:Bachelor|Master)?[Ss]tudiengang\s+([A-ZÄÖÜ][\p{L}&,'’ -]{3,60})/gu,
  // "Licence Informatique", "Master Droit des affaires"
  /(?:Licence|Master|BTS|DUT|BUT)\s+(?:en\s+|de\s+)?([A-ZÉ][\p{L}&,'’ -]{3,60})/gu
];
function degrees(texts) {
  const out = new Map();
  for (const t of texts) for (const re of DEGREE) {
    re.lastIndex = 0;
    for (const m of t.matchAll(re)) {
      let v = clean(m[1]).replace(/\s+(and|und|et|or|oder|ou)$/i, "").replace(/[,–—-]+$/, "").trim();
      // keep the trailing name: "… taught in English Data Science" → "Data Science"
      const ws = v.split(/\s+/);
      let i = ws.length;
      while (i > 0 && !LANG_NAMES.test(ws[i - 1]) && (/^[A-ZÄÖÜÀ-Ý0-9&]/.test(ws[i - 1]) || /^(and|of|&|und|für|de|des|du|et|la|le|der|die|the|for|in)$/.test(ws[i - 1]) && i < ws.length)) i--;
      while (i < ws.length && /^(and|of|&|und|für|de|des|du|et|la|le|der|die|the|for|in)$/.test(ws[i])) i++;
      if (i < ws.length && /^[A-ZÄÖÜÀ-Ý]/.test(ws[i])) v = ws.slice(i).join(" ");
      v = v.replace(/\s(?:in|auf|en) (?:English|German|Englisch|Deutsch|anglais|allemand)$/i, "");
      if (v.split(/\s+/).length > 6 || v.length < 4 || /^(the|der|die|das|a|an|our|unsere?|this|dieser)\b/i.test(v) || /^(Science|Arts|Engineering|Studies|Degree|Programme|Program)$/i.test(v)) continue;
      const k = norm(v);
      out.set(k, { label: v, n: (out.get(k)?.n || 0) + 1 });
    }
  }
  return [...out.values()].sort((a, b) => b.n - a.n).map((x) => x.label);
}

const SERVICE_RE = /(?<![\p{L}\p{N}])(technical SEO|local SEO|SEO|GEO|AI visibility|AI search optimi[sz]ation|generative engine optimi[sz]ation|web ?design|website design|web development|app development|mobile apps?|e-?commerce|digital marketing|content marketing|social media marketing|PPC|Google Ads|branding|copywriting|email marketing|marketing automation|AI automation|chatbots?|data analytics|CRM|UX design|UI design|IT support|cybersecurity|cloud migration|accounting|bookkeeping|payroll|translation|photography|video production|link building|digital PR|référencement naturel|référencement|création de sites? web|développement web|applications? mobiles?|marketing digital|publicité en ligne|traduction|Suchmaschinenoptimierung|Webdesign|Webentwicklung|App-Entwicklung|Online-Marketing|Übersetzung|تحسين محركات البحث|تصميم المواقع|تطوير التطبيقات|التسويق الرقمي)(?![\p{L}\p{N}])/giu;

function topicPhrases(sigs, name, placeWords, lang) {
  // short noun phrases repeated across title, description, h1 and headings
  const page = sigs.find((s) => s.role === "page") || sigs[0];
  const home = sigs.find((s) => s.role === "home");
  const own = [page, home].filter(Boolean);
  const src = own.flatMap((s) => [s.title, s.desc, s.h1, s.site, ...s.headings.slice(0, 15)]).filter(Boolean);
  const descs = norm(own.map((s) => s.desc).join(" "));
  const tops = norm(own.map((s) => `${s.title} ${s.h1}`).join(" "));
  const nameW = new Set(norm(name).split(/[^\p{L}\p{N}]+/u));
  const stop = /^(the|a|an|and|or|of|for|to|in|on|at|by|with|from|our|your|we|you|is|are|be|this|that|it|its|about|more|new|all|how|what|why|der|die|das|und|oder|von|vom|für|zu|zur|zum|im|in|am|an|auf|mit|aus|bei|vor|nach|unser|unsere|ihr|ihre|wir|sie|ist|sind|ein|eine|einer|eines|dem|den|des|le|la|les|un|une|des|du|de|et|ou|pour|dans|sur|avec|par|notre|nos|votre|vos|est|sont|ce|cette|ces|qui|que|home|startseite|accueil|welcome|willkommen|bienvenue|information|informationen|informations|english|deutsch|français|site|website|webseite|page|seite|official|offizielle|ausschreibung|jury|preisträger|preisträgerinnen|winners|call|kontakt|contact|news|aktuelles|termine|team|über|uns|about|downloads?|presse|press|mitglied|werden|spenden|donate|kostenlos|free|gratuit|schulen|schools|écoles|lehrkräfte|teachers|enseignants|familien|families|familles|kinder|children|enfants|jugendliche|youth|jeunes|students?|studierende|étudiants|audiotouren|karten|maps|quellen|sources|workshops?|ateliers?)$/i;
  const inner = /^(vor|in|of|de|für|zu|à|en|im|am|on|at|and|und|et)$/i;
  const grams = new Map();
  for (const t of src) {
    const words = t.split(/[^\p{L}\p{N}'’-]+/u).filter(Boolean);
    for (let n = 1; n <= 3; n++) for (let i = 0; i + n <= words.length; i++) {
      const g = words.slice(i, i + n);
      if (stop.test(g[0]) || stop.test(g[g.length - 1])) continue;
      if (g.some((w) => nameW.has(norm(w)) || placeWords.has(norm(w)) || LANG_NAMES.test(w))) continue;
      if (g.join("").length < 5) continue;
      if (n === 1 && !/^[A-ZÄÖÜ]/.test(g[0]) && g[0].length < 7) continue;
      if (lang === "de" && !/^[A-ZÄÖÜ0-9]/.test(g[g.length - 1])) continue; // German noun phrases end with a noun
      const k = norm(g.join(" "));
      const e = grams.get(k) || { label: g.join(" "), n: 0, len: n, inner: g.slice(1, -1).some((w) => inner.test(w)) };
      e.n++;
      grams.set(k, e);
    }
  }
  const scored = [...grams.entries()].filter(([, g]) => g.n >= 2).map(([k, g]) => ({ ...g, k, s: g.n + (descs.includes(k) ? 1.5 : 0) + (tops.includes(k) ? 1 : 0) + 0.2 * g.len - (g.inner ? 0.6 : 0) }));
  scored.sort((a, b) => b.s - a.s);
  const out = [];
  for (const g of scored) {
    const i = out.findIndex((o) => o.k.includes(g.k) || g.k.includes(o.k));
    if (i < 0) out.push(g);
    else if (g.k.includes(out[i].k) && g.s >= out[i].s * 0.6 && !g.inner) out[i] = g; // the more specific phrase ("NS-Geschichte" over "Geschichte")
  }
  return out.map((g) => g.label);
}
function awardTopic(name) {
  const m = /(?:prize|award|preis|prix|competition|wettbewerb|concours|scholarship|stipendium|fellowship)\s+(?:for|für|de la|de l'|du|des|de|in|im|für junge)\s+(.{3,40})$/i.exec(name) || /^(.{3,30}?)(?:preis|wettbewerb)\b/i.exec(name);
  if (!m) return "";
  const t = m[1].trim();
  return /^(muster|beispiel|international|internationaler|deutscher|europäischer)$/i.test(t) ? "" : t;
}

function pickOffers(kind, sigs, lang, name, place) {
  const same = sigs.filter((s) => !s.lang || s.lang === lang);
  const other = sigs.filter((s) => s.lang && s.lang !== lang);
  const texts = (arr) => arr.flatMap((s) => [s.title, s.h1, s.desc, ...s.headings, ...s.nav, s.body.slice(0, 6000)]).filter(Boolean);
  const placeWords = new Set([place.city, ...place.cities, ...(place.region ? [region(place.region).en, region(place.region).de] : []), ...(place.country ? [country(place.country).en, country(place.country).de, country(place.country).fr] : [])].filter(Boolean).flatMap((c) => norm(c).split(/[^\p{L}\p{N}]+/u)));
  const nameN = norm(name);
  const ok = (v) => v && (v === keep || !NAV_NOISE.test(v) && norm(v) !== nameN && !nameN.includes(norm(v)) && !LANG_NAMES.test(v));
  let out = [];
  if (kind === "uni" || kind === "training" || kind === "school") {
    out = degrees(texts(same));
    if (!out.length && !other.length) out = degrees(texts(sigs));
  }
  // structured offers
  if (out.length < 3) for (const s of same.length ? same : sigs) for (const n of s.nodes) {
    const t = types(n).join(" ");
    if (/^(Service|Product|Course|Event|ExhibitionEvent|EducationalOccupationalProgram|Offer)$/.test(t) && typeof n.name === "string" && n.name.length <= 60) out.push(clean(n.name));
    for (const cat of [].concat(n.hasOfferCatalog || [])) for (const it of [].concat(cat?.itemListElement || [])) {
      const v = it?.itemOffered?.name || it?.name;
      if (typeof v === "string" && v.length <= 60) out.push(clean(v));
    }
  }
  if (["agency", "saas", "generic", "finance", "legal"].includes(kind) && out.length < 3) {
    const sv = new Map();
    const addSv = (t, w) => { SERVICE_RE.lastIndex = 0; for (const m of String(t || "").matchAll(SERVICE_RE)) { const k = norm(m[1]); const e = sv.get(k) || { label: m[1], n: 0 }; e.n += w; sv.set(k, e); } };
    for (const s of same.length ? same : sigs) { addSv(s.title, 3); addSv(s.desc, 2); addSv(s.h1, 2); addSv(s.headings.join(" \n "), 1); addSv(s.body, 0.3); }
    out.push(...[...sv.values()].filter((x) => x.n >= 1).sort((a, b) => b.n - a.n).map((x) => x.label));
  }
  let keep = "";
  if (kind === "award") { keep = awardTopic(name); if (keep) out.unshift(keep); }
  if (["knowledge", "nonprofit", "culture", "award", "media"].includes(kind) && out.length < 2) out.push(...topicPhrases(sigs, name, placeWords, lang).slice(0, 3));
  const seen = new Set();
  return out.map(clean).filter((v) => ok(v) && !seen.has(norm(v)) && seen.add(norm(v))).slice(0, 5);
}

// ── the profile ─────────────────────────────────────────────────────────────
// input: { url, lang, docs: [{ doc, url, role: "page"|"home"|"site" }] }
export function buildProfile(input) {
  const host = (() => { try { return new URL(input.url).hostname; } catch { return ""; } })();
  const sigs = input.sigs || input.docs.map((d) => signals(d.doc, d.url, d.role));
  const page = sigs.find((s) => s.role === "page") || sigs[0];
  const lang = LANGS.includes(input.lang) ? input.lang : LANGS.includes(page?.lang) ? page.lang : "en";
  const nm = pickName(sigs, host, lang);
  const kd = pickKind(sigs, `${nm.name} ${nm.aliases.join(" ")}`);
  const kind = kd.sub.kind;
  const place = pickPlace(sigs, host, lang);
  const town = /^(?:Stadt|Gemeinde|Markt|Marktgemeinde|Stadtverwaltung|City of|Town of|Ville de|Mairie de|Commune de|Municipality of|بلدية)\s+(.{2,40})$/u.exec(nm.name.trim());
  if (kd.sub.kind === "public" && town && !place.city) place.city = town[1].replace(/\s+(e\.V\.|GmbH)$/, "");
  const offers = pickOffers(kind, sigs, lang, nm.name, place);
  const main = mainLanguage(place.country);
  const intl = !!main && main !== (page?.lang || lang) && (page?.lang || lang) === "en";
  return finalize({
    name: nm.name, aliases: nm.aliases, kind, sub: kd.sub.id, kind2: kd.sub2?.kind || "", sub2: kd.sub2?.id || "", category: "", services: offers,
    city: place.city, cities: place.cities, region: place.region, country: place.country,
    intl, lang, domain: host.replace(/^www\./, ""),
    confidence: { name: nm.confidence, kind: kd.confidence, place: place.city ? 0.8 : place.country ? 0.5 : 0 },
    evidence: { name: nm.why, kind: kd.ranked.slice(0, 3).map(([k, v]) => `${k}:${v.toFixed(1)}`), country: place.why }
  });
}

// Fill in display fields (category label, place) for a profile, also after the user edits it.
export function finalize(p) {
  const L = LANGS.includes(p.lang) ? p.lang : "en";
  let sub = subById(p.sub);
  if (p.customCategory) {
    const m = subFromLabel(p.customCategory);
    p.customMatched = false;
    if (m && (!p.kindSet || m.kind === p.kind)) { sub = m; p.sub = m.id; p.kind = m.kind; p.customMatched = true; }
  }
  if (!sub || (p.kind && sub.kind !== p.kind)) { sub = defaultSubFor(p.kind || "generic"); p.sub = sub.id; }
  p.kind = sub.kind;
  p.category = p.customCategory || (L === "en" ? sub.en[0] : L === "fr" ? sub.fr[0].replace(/^(un|une)\s+/, "") : L === "de" ? sub.de[0].replace(/^(ein|eine|einen)\s+/, "") : sub.ar[0]);
  if (p.market) {
    const cc = countryFromName(p.market);
    if (cc) { p.country = cc; p.city = ""; p.region = ""; }
    else {
      const rg = regionFromText(p.market);
      const r = rg ? region(rg.code) : null;
      if (r && [r.en, r.de, regionName("fr", rg.code), r.ar].map(norm).includes(norm(p.market))) { p.region = rg.code; p.city = ""; p.country = r.country; }
      else { p.city = p.market; p.region = ""; }
    }
  }
  p.place = placeLabel(p, L);
  if (!p.audience && p.kind === "uni" && p.intl) p.audience = { en: "international students", fr: "étudiants internationaux", de: "internationale Studierende", ar: "الطلاب الدوليون" }[L];
  return p;
}
const WIDE = new Set(["uni", "award", "knowledge", "saas", "agency", "media", "shop"]);
export function placeLabel(p, L) {
  const parts = [p.city, p.region ? regionName(L, p.region) : "", p.country ? countryName(L, p.country) : ""];
  return parts.filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).slice(0, 2).join(", ");
}
export const isWide = (kind) => WIDE.has(kind);
