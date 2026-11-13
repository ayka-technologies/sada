// Sada · Social Studio: profile kits, post drafts, platform rules and composer links.
// Pure functions, no network. Everything is computed on this computer.
// Sada never publishes by itself: it opens the platform's own composer and the
// person clicks "Post". Platforms forbid automation tools (LinkedIn names browser
// extensions explicitly), so this keeps accounts safe.

import { PLATFORMS } from "./social.js";
import { inCity, countryName } from "./geo.js";

const LANGS = ["en", "fr", "de", "ar"];
const LL = (l) => (LANGS.includes(l) ? l : "en");

// ── platform rules (published limits; platforms can change them) ─────────────
// post: max characters per post · fold: characters shown before "see more" (approx.)
// tags: hashtags we recommend at most · link: are links in the post text clickable?
export const RULES = {
  instagram: { post: 2200, fold: 125, tags: 5, link: false, name: 64, alt: true },
  facebook: { post: 63206, fold: 250, tags: 2, link: true, alt: true },
  linkedin: { post: 3000, fold: 210, tags: 3, link: true, alt: true },
  x: { post: 280, fold: 280, tags: 2, link: true, url: 23, name: 50, alt: true },
  bluesky: { post: 300, fold: 300, tags: 2, link: true, name: 64, alt: true },
  threads: { post: 500, fold: 500, tags: 1, link: true, alt: true },
  youtube: { post: 5000, fold: 150, tags: 3, link: true },
  tiktok: { post: 4000, fold: 100, tags: 4, link: false },
  pinterest: { post: 500, fold: 500, tags: 0, link: true, alt: true },
  xing: { post: 3000, fold: 210, tags: 3, link: true },
  gbp: { post: 1500, fold: 250, tags: 0, link: true },
  whatsapp: { post: 4096, fold: 4096, tags: 0, link: true }
};
export const POST_PLATFORMS = ["instagram", "facebook", "linkedin", "x", "bluesky", "threads", "youtube", "tiktok", "pinterest", "xing", "gbp", "whatsapp"];
export const PNAME = { ...Object.fromEntries(Object.entries(PLATFORMS).map(([k, v]) => [k, v.name])), gbp: "Google Business Profile", whatsapp: "WhatsApp" };

// count like the platforms do (graphemes; on X every link counts 23)
const seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter() : null;
export const graphemes = (s) => (seg ? [...seg.segment(String(s || ""))].length : [...String(s || "")].length);
const URL_RE = /https?:\/\/[^\s]+/g;
export function countFor(platform, text) {
  const t = String(text || "");
  if (platform === "x") return graphemes(t.replace(URL_RE, "")) + (t.match(URL_RE) || []).length * 23;
  return graphemes(t);
}

// ── links ───────────────────────────────────────────────────────────────────
export function keyUrl(key) {
  if (!key) return "";
  if (/^(x\.com|bsky\.app)/.test(key)) return "https://" + key;
  // Instagram's canonical profile address ends with a slash
  return "https://www." + key + (/^instagram\.com\/[^/]+$/.test(key) ? "/" : "");
}
export function utm(url, platform, campaign = "sada") {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (!u.searchParams.has("utm_source")) {
      u.searchParams.set("utm_source", platform);
      u.searchParams.set("utm_medium", "social");
      u.searchParams.set("utm_campaign", campaign);
    }
    return u.href;
  } catch {
    return url;
  }
}
// Official share/compose links. "text": the text arrives prefilled; "url": only the link; "none": copy, then open.
export function composer(platform, text, link) {
  const c = composerRaw(platform, String(text || ""), link);
  // very long links can be refused by the platform: then open the window empty, the text is copied
  if (c.url.length > 7500 && c.fill !== "none") return { url: { x: "https://x.com/compose/post", bluesky: "https://bsky.app/", threads: "https://www.threads.com/", whatsapp: "https://web.whatsapp.com/", linkedin: "https://www.linkedin.com/feed/", pinterest: "https://www.pinterest.com/pin-builder/" }[platform] || c.url.split("?")[0], fill: "none" };
  return c;
}
function composerRaw(platform, text, link) {
  const e = encodeURIComponent;
  switch (platform) {
    case "x": return { url: `https://x.com/intent/tweet?text=${e(text)}`, fill: "text" };
    case "bluesky": return { url: `https://bsky.app/intent/compose?text=${e(text)}`, fill: "text" };
    case "threads": return { url: `https://www.threads.com/intent/post?text=${e(text)}`, fill: "text" };
    case "whatsapp": return { url: `https://wa.me/?text=${e(text)}`, fill: "text" };
    // LinkedIn's post window; the text parameter usually fills it, and the text is copied as a fallback
    case "linkedin": return { url: `https://www.linkedin.com/feed/?shareActive=true&text=${e(text.slice(0, 3000))}`, fill: "maybe" };
    case "facebook": return link ? { url: `https://www.facebook.com/sharer/sharer.php?u=${e(link)}`, fill: "url" } : { url: "https://www.facebook.com/", fill: "none" };
    case "pinterest": return { url: `https://www.pinterest.com/pin/create/button/?url=${e(link || "")}&description=${e(text.slice(0, 500))}`, fill: "text" };
    case "instagram": return { url: "https://www.instagram.com/", fill: "none" };
    case "tiktok": return { url: "https://www.tiktok.com/upload", fill: "none" };
    case "youtube": return { url: "https://studio.youtube.com/", fill: "none" };
    case "xing": return { url: "https://www.xing.com/", fill: "none" };
    case "gbp": return { url: "https://business.google.com/", fill: "none" };
    default: return { url: "", fill: "none" };
  }
}
// where the profile fields are edited
export function profileEdit(platform, url, handle) {
  const h = String(handle || "").replace(/^@/, "");
  switch (platform) {
    case "instagram": return "https://www.instagram.com/accounts/edit/";
    case "x": return "https://x.com/settings/profile";
    case "youtube": return "https://studio.youtube.com/";
    case "pinterest": return "https://www.pinterest.com/settings/";
    // LinkedIn page settings are only reachable for admins, through the page itself ("Edit page" / admin tools)
    case "linkedin": return url || "https://www.linkedin.com/";
    default: return url || "";
  }
}

// ── hashtags ────────────────────────────────────────────────────────────────
export function hashtag(s, lang) {
  const words = String(s || "").normalize("NFC").replace(/[#@]/g, "").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (!words.length) return "";
  if (LL(lang) === "ar" || /[؀-ۿ]/.test(s)) return "#" + words.join("_");
  return "#" + words.map((w) => (w.length > 1 && w === w.toLowerCase() ? w[0].toUpperCase() + w.slice(1) : w)).join("");
}
export function tagsFor(site, extra = [], lang = "en", max = 3) {
  // short, single-script words make readable hashtags; long or mixed-script phrases do not
  const mixed = (x) => /[\u0600-\u06FF]/.test(x) && /[A-Za-z]/.test(x);
  const raw = [site?.city, site?.category, ...(site?.services || []).slice(0, 2), ...extra].filter((x) => x && graphemes(x) <= 30 && String(x).trim().split(/\s+/).length <= 3 && !mixed(String(x)));
  const out = [];
  for (const r of raw) {
    const t = hashtag(r, lang);
    if (t.length > 2 && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
  }
  return out.slice(0, max);
}

// ── text helpers ────────────────────────────────────────────────────────────
// collapse spaces but keep the narrow no-break space French puts before "?" and ":"
const clean = (s) => String(s || "").replace(/[^\S\u202F\u00A0]+/g, " ").trim();
const sentences = (s) => clean(s).match(/[^.!?؟]+[.!?؟]+|[^.!?؟]+$/g)?.map((x) => x.trim()).filter(Boolean) || [];
const firstSentences = (s, n, max) => {
  let out = "";
  for (const x of sentences(s).slice(0, n)) {
    if (graphemes(out + " " + x) > max) break;
    out = (out + " " + x).trim();
  }
  return out || cut(s, max);
};
export function cut(s, max) {
  s = clean(s);
  if (graphemes(s) <= max) return s;
  const arr = seg ? [...seg.segment(s)].map((x) => x.segment) : [...s];
  let t = arr.slice(0, Math.max(1, max - 1)).join("");
  const sp = t.lastIndexOf(" ");
  if (sp > max * 0.6) t = t.slice(0, sp);
  return t.replace(/[\s,;:–-]+$/, "") + "…";
}
const stripSite = (title, name) => {
  let t = clean(title);
  for (const sep of [" | ", " – ", " - ", " · ", " — ", " :: "]) {
    const parts = t.split(sep);
    if (parts.length > 1) {
      const keep = parts.filter((p) => !name || !p.toLowerCase().includes(String(name).toLowerCase())) ;
      t = (keep.length ? keep : parts).sort((a, b) => b.length - a.length)[0];
    }
  }
  return t.trim();
};
const whereOf = (L, site) => (site?.city ? inCity(L, site.city).trim() : "");
const P = {
  en: { more: "Read more:", bio: "Link in bio", on: (d) => `More on ${d}`, ask: "People ask:", q: "Question:" },
  de: { more: "Mehr dazu:", bio: "Link in der Bio", on: (d) => `Mehr auf ${d}`, ask: "Oft gefragt:", q: "Frage:" },
  fr: { more: "En savoir plus :", bio: "Lien dans la bio", on: (d) => `Plus d'infos sur ${d}`, ask: "On nous demande :", q: "Question :" },
  ar: { more: "المزيد:", bio: "الرابط في النبذة", on: (d) => `المزيد على ${d}`, ask: "يسألوننا:", q: "سؤال:" }
};

// ── sources → a neutral post base ───────────────────────────────────────────
// from a question people ask AI, answered on the website
export function baseFromQuestion(c, site, lang) {
  let answer = c?.best?.text ? firstSentences(c.best.text, 3, 420) : "";
  // a question that does not name you ("Which restaurants in Lyon…?"): say who answers it first
  if (c?.q && !c.q.branded && site?.name && !lower(answer).includes(lower(core(site.name)))) {
    const L = LL(lang);
    const who = `${site.name}${site.category ? " – " + site.category : ""}${site.city && !lower(site.category || "").includes(lower(site.city)) ? " " + inCity(L, site.city).trim() : ""}.`;
    answer = `${who} ${firstSentences(c.best?.text || "", 2, 320)}`.trim();
  }
  return { kind: "question", hook: clean(c?.q?.text || ""), body: answer, link: c?.best?.url || (site?.origin ? site.origin + "/" : ""), qid: c?.q?.id || "", lang: LL(lang) };
}
// from the page open in the tab
export function baseFromPage(report, page, site, lang) {
  const title = stripSite(report?.model?.title || page?.title || "", site?.name);
  const desc = clean(report?.model?.metaDescription || report?.model?.description || page?.description || "");
  const body = desc || firstSentences(page?.text || "", 2, 300);
  return { kind: "page", hook: title, body, link: report?.url || page?.url || "", lang: LL(lang) };
}
// from the person's own topic
export function baseFromTopic(text, link, lang) {
  const s = sentences(text);
  return { kind: "topic", hook: s[0] || clean(text), body: s.slice(1).join(" "), link: link || "", lang: LL(lang) };
}

// ── platform formats ────────────────────────────────────────────────────────
// Returns { text, link, alt } fitted to the platform's limit.
export function draftFor(platform, base, site, o = {}) {
  const L = base.lang || "en";
  const R = RULES[platform] || RULES.facebook;
  const p = P[L];
  const link = base.link ? (o.utm === false ? base.link : utm(base.link, platform, o.campaign || "sada")) : "";
  const domain = site?.domain || (() => { try { return new URL(base.link).hostname.replace(/^www\./, ""); } catch { return ""; } })();
  const tags = tagsFor(site, [], L, R.tags).join(" ");
  // a question ends with the question mark of its language (French puts a narrow space before it)
  const qm = { ar: "؟", fr: "\u202F?" }[L] || "?";
  const hook = base.kind === "question" ? base.hook.replace(/[\s\u202F]*[?؟]*$/, "") + qm : base.hook;
  const name = site?.name || "";
  const body = base.body || "";
  const label = o.aiLabel ? "\n\n" + AI_LABEL[L] : "";
  const fit = (parts) => {
    // drop body sentences until the post fits
    let b = sentences(body);
    const build = () => parts(b.join(" ")).replace(/\n{3,}/g, "\n\n").trim() + label;
    let t = build();
    while (countFor(platform, t) > R.post && b.length > 1) { b = b.slice(0, -1); t = build(); }
    if (countFor(platform, t) > R.post) { b = [cut(b.join(" "), Math.max(40, R.post - countFor(platform, parts("")) - 2))]; t = build(); }
    return t;
  };
  let text;
  switch (platform) {
    case "x":
    case "bluesky":
    case "threads":
      text = fit((b) => [hook, b, link, tags].filter(Boolean).join("\n\n"));
      break;
    case "linkedin":
    case "xing":
      text = fit((b) => [cut(hook, R.fold), b, link ? `${p.more} ${link}` : "", tags].filter(Boolean).join("\n\n"));
      break;
    case "instagram":
      text = fit((b) => [cut(hook, R.fold), b, domain ? `${p.on(domain)} · ${p.bio}` : p.bio, tags].filter(Boolean).join("\n\n"));
      break;
    case "tiktok":
      text = fit((b) => [cut(hook, R.fold), b, domain ? p.on(domain) : "", tags].filter(Boolean).join("\n\n"));
      break;
    case "pinterest":
      text = fit((b) => [hook, b, name].filter(Boolean).join(" "));
      break;
    case "gbp":
    case "facebook":
    case "youtube":
    case "whatsapp":
    default:
      text = fit((b) => [hook, b, link ? `${p.more} ${link}` : "", tags].filter(Boolean).join("\n\n"));
  }
  const alt = R.alt ? altFor(base, site, L) : "";
  return { text, link, alt };
}
export const AI_LABEL = { en: "(Written with AI assistance and checked by our team.)", de: "(Mit KI-Unterstützung erstellt und von unserem Team geprüft.)", fr: "(Rédigé avec l'aide de l'IA et vérifié par notre équipe.)", ar: "(كُتب بمساعدة الذكاء الاصطناعي وراجعه فريقنا.)" };
function altFor(base, site, L) {
  const what = cut(base.hook, 90);
  return { en: `Image for: ${what}${site?.name ? " – " + site.name : ""}. Describe what the image shows (people, place, text in the image).`, de: `Bild zu: ${what}${site?.name ? " – " + site.name : ""}. Beschreiben Sie, was das Bild zeigt (Personen, Ort, Text im Bild).`, fr: `Image pour : ${what}${site?.name ? " – " + site.name : ""}. Décrivez ce que montre l'image (personnes, lieu, texte dans l'image).`, ar: `صورة عن: ${what}${site?.name ? " – " + site.name : ""}. صِف ما تُظهره الصورة (الأشخاص، المكان، النص داخل الصورة).` }[L];
}

// ── checks on a draft ───────────────────────────────────────────────────────
export function checkDraft(platform, text, site, base) {
  const R = RULES[platform] || RULES.facebook;
  const t = String(text || "");
  const n = countFor(platform, t);
  const out = [];
  out.push({ id: "len", ok: n <= R.post, vars: { n, max: R.post } });
  const first = t.split("\n")[0] || "";
  if (R.fold < R.post) out.push({ id: "hook", ok: graphemes(first) <= R.fold, vars: { max: R.fold } });
  if (R.link) out.push({ id: "link", ok: /https?:\/\//.test(t) || (platform === "linkedin" || platform === "facebook" || platform === "pinterest") && !!base?.link, vars: {} });
  else out.push({ id: "nolink", ok: true, info: true, vars: {} });
  if (site?.name) out.push({ id: "name", ok: lower(t).includes(lower(core(site.name))), vars: { name: site.name } });
  if (site?.city) out.push({ id: "place", ok: lower(t).includes(lower(site.city)), vars: { place: site.city } });
  const tags = (t.match(/(^|\s)#[\p{L}\p{N}_]+/gu) || []).length;
  if (R.tags) out.push({ id: "tags", ok: tags <= R.tags, vars: { n: tags, max: R.tags } });
  out.push({ id: "ph", ok: !/\[[^\]\n]{2,40}\]/.test(t), vars: {} });
  if (base?.kind === "question") out.push({ id: "q", ok: true, info: true, vars: {} });
  return out;
}
const lower = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
const core = (n) => String(n || "").replace(/^(stadt|stadtverwaltung|gemeinde|ville de|city of)\s+/i, "").split(/\s[|·–-]\s/)[0].trim();

// ── profile kit ─────────────────────────────────────────────────────────────
const CTA = {
  en: { uni: "Apply", culture: "Plan your visit", nonprofit: "Get involved", award: "Apply", knowledge: "Explore", food: "Book a table", stay: "Book direct", health: "Appointments", shop: "Shop", agency: "Start a project", saas: "Try it", school: "Enrol", training: "Courses", public: "Services", generic: "More" },
  de: { uni: "Jetzt bewerben", culture: "Besuch planen", nonprofit: "Mitmachen", award: "Jetzt bewerben", knowledge: "Entdecken", food: "Tisch reservieren", stay: "Direkt buchen", health: "Termine", shop: "Zum Shop", agency: "Projekt starten", saas: "Testen", school: "Anmelden", training: "Kurse", public: "Online-Services", generic: "Mehr" },
  fr: { uni: "Candidater", culture: "Préparer sa visite", nonprofit: "S'engager", award: "Candidater", knowledge: "Découvrir", food: "Réserver", stay: "Réserver en direct", health: "Rendez-vous", shop: "Boutique", agency: "Lancer un projet", saas: "Essayer", school: "S'inscrire", training: "Formations", public: "Démarches en ligne", generic: "En savoir plus" },
  ar: { uni: "قدّم الآن", culture: "خطط لزيارتك", nonprofit: "شارك معنا", award: "قدّم الآن", knowledge: "اكتشف", food: "احجز طاولة", stay: "احجز مباشرة", health: "المواعيد", shop: "تسوّق", agency: "ابدأ مشروعك", saas: "جرّب", school: "سجّل", training: "الدورات", public: "الخدمات", generic: "المزيد" }
};
const PH = { en: { what: "[what you are]", town: "[town]" }, fr: { what: "[ce que vous êtes]", town: "[ville]" }, de: { what: "[was Sie sind]", town: "[Ort]" }, ar: { what: "[ما أنت]", town: "[المدينة]" } };
// Name field, three bio variants, link, category, place and a long description.
export function profileKit(platform, site, lang, seenName = "") {
  const L = LL(lang);
  const R = PLATFORMS[platform] || { bio: 160 };
  const max = R.bio || 160;
  const nameMax = RULES[platform]?.name || 64;
  const name = site?.name || seenName || "";
  const cat = site?.category || PH[L].what;
  const town = site?.city || "";
  const where = town ? inCity(L, town).trim() : "";
  const countryTxt = site?.country ? countryName(L, site.country) : "";
  const sep = L === "ar" ? "، " : ", ";
  const offers = (site?.services || []).filter((x) => graphemes(x) <= 40).slice(0, 4);
  const cta = `${CTA[L][site?.kind] || CTA[L].generic}${L === "fr" ? " : " : ": "}${site?.domain || "[website]"}`;
  const fitBio = (parts) => {
    let o = offers.slice();
    let s = parts(o);
    while (graphemes(s) > max && o.length) { o = o.slice(0, -1); s = parts(o); }
    return graphemes(s) > max ? cut(s, max) : s;
  };
  const v1 = fitBio((o) => clean(`${cat}${where ? " " + where : ""}${countryTxt && !where.includes(countryTxt) ? sep + countryTxt : ""}. ${o.length ? o.join(" · ") + "." : ""} ${cta}`));
  const v2 = fitBio((o) => clean(`${name ? name + " – " : ""}${cat}${where ? " " + where : ""}. ${o.length ? o.slice(0, 2).join(sep) + "." : ""} ${cta}`));
  const v3 = fitBio(() => clean(`${cat}${where ? " " + where : ""}. ${cta}`));
  const bios = [...new Set([v1, v2, v3])];
  // searchable name: Instagram and X search the name field, so "Name | what" helps
  let nm = name;
  const nameWhat = `${name} | ${cat}`;
  if (["instagram", "x", "tiktok"].includes(platform) && name && site?.category && graphemes(nameWhat) <= nameMax && !lower(name).includes(lower(site.category))) nm = nameWhat;
  const long = clean([
    `${name ? name + " – " : ""}${cat}${where ? " " + where : ""}${countryTxt && !where.includes(countryTxt) ? sep + countryTxt : ""}.`,
    offers.length ? (LONG[L].offers + " " + offers.join(sep) + ".") : "",
    site?.domain ? LONG[L].site(site.domain) : ""
  ].filter(Boolean).join(" "));
  return {
    name: { text: graphemes(nm) > nameMax ? cut(nm, nameMax) : nm, max: nameMax },
    bios: bios.map((t) => ({ text: t, max })),
    link: site?.origin ? utm(site.origin + "/", platform, "profile") : "",
    linkPlain: site?.origin ? site.origin + "/" : "",
    category: site?.category || "",
    place: [town, countryTxt].filter(Boolean).join(sep),
    long: { text: long, max: platform === "youtube" ? 1000 : platform === "linkedin" ? 2000 : 500 }
  };
}
const LONG = {
  en: { offers: "What we offer:", site: (d) => `Official website: ${d}` },
  de: { offers: "Unser Angebot:", site: (d) => `Offizielle Website: ${d}` },
  fr: { offers: "Notre offre :", site: (d) => `Site officiel : ${d}` },
  ar: { offers: "ما نقدّمه:", site: (d) => `الموقع الرسمي: ${d}` }
};

// ── website snippets that connect the channels to the site ───────────────────
export function sameAsJsonLd(site, channelUrls) {
  const kindType = { public: "GovernmentOrganization", uni: "CollegeOrUniversity", school: "School", culture: "Museum", nonprofit: "NGO", food: "Restaurant", stay: "LodgingBusiness", health: "MedicalOrganization", shop: "Store" }[site?.kind] || "Organization";
  const o = { "@context": "https://schema.org", "@type": kindType, name: site?.name || "", url: site?.origin ? site.origin + "/" : "", sameAs: [...new Set(channelUrls)].filter(Boolean) };
  if (site?.city || site?.country) o.address = { "@type": "PostalAddress", ...(site.city ? { addressLocality: site.city } : {}), ...(site.country ? { addressCountry: site.country } : {}) };
  return `<script type="application/ld+json">\n${JSON.stringify(o, null, 2)}\n</script>`;
}
export function footerLinks(channels) {
  const rows = channels.filter((c) => c.url).map((c) => `  <a href="${c.url}" rel="me noopener" target="_blank">${PNAME[c.platform] || c.platform}</a>`);
  return `<nav aria-label="Social media">\n${rows.join("\n")}\n</nav>`;
}

// ── a plan: which question goes out when ────────────────────────────────────
// weekday: 0 Sunday … 6 Saturday; time "HH:MM"; returns timestamps (local time)
export function planSlots(weeks, weekday, time, from = Date.now()) {
  const [h, m] = String(time || "10:00").split(":").map((x) => parseInt(x, 10) || 0);
  const d = new Date(from);
  d.setHours(h, m, 0, 0);
  let add = (weekday - d.getDay() + 7) % 7;
  if (add === 0 && d.getTime() <= from + 15 * 60e3) add = 7;
  d.setDate(d.getDate() + add);
  const out = [];
  for (let i = 0; i < weeks; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i * 7);
    out.push(x.getTime());
  }
  return out;
}

// ── AI prompts (Chrome's built-in model, on this computer) ──────────────────
const LANG_NAME = { en: "English", fr: "French", de: "German", ar: "Arabic" };
const STYLE = {
  x: "one short post: the question or hook, one fact, the link, at most 2 hashtags",
  bluesky: "one short post: the question or hook, one fact, the link, at most 2 hashtags",
  threads: "one conversational post: hook, 1 to 2 facts, the link, at most 1 topic tag",
  linkedin: "a first line under 200 characters that makes people read on, then 2 to 4 short paragraphs with concrete facts, then the link, then at most 3 hashtags",
  xing: "a first line under 200 characters, then 2 to 3 short paragraphs with facts, then the link",
  facebook: "a friendly post of 2 to 4 sentences with concrete facts and the link",
  instagram: "a caption: strong first line, 3 to 5 short sentences with facts, then 'link in bio', then at most 5 hashtags; no links in the text",
  tiktok: "a short caption: hook plus one fact, up to 4 hashtags; no links",
  pinterest: "a keyword-rich description of 2 to 3 sentences, no hashtags",
  youtube: "a community post of 2 to 4 sentences and the link",
  gbp: "an update for a Google Business Profile: 2 to 4 sentences with concrete facts, no hashtags",
  whatsapp: "a short message of 2 to 3 sentences with the link"
};
export function postPrompt(platform, base, site, draft) {
  const L = LANG_NAME[base.lang] || "English";
  const R = RULES[platform] || RULES.facebook;
  return {
    system: `You write social media posts for ${site?.name || "an organisation"}${site?.city ? " in " + site.city : ""}. Write in ${L}. Use only the facts given. Never invent numbers, dates, prices, names, awards or claims; where a useful fact is missing write a short placeholder in square brackets. No superlatives, at most 2 emojis. Output only the post text.`,
    user: `Platform: ${PNAME[platform]} (max ${R.post} characters${R.link ? "" : ", links are not clickable"}).
Write ${STYLE[platform] || STYLE.facebook}.
${base.kind === "question" ? "This answers a question people ask AI assistants. Start with the question or its answer." : ""}

Facts:
${base.hook}
${base.body}
Link: ${draft.link || "(none)"}`
  };
}
export function bioPrompt(platform, site, lang, max) {
  const L = LANG_NAME[LL(lang)] || "English";
  return {
    system: `You write social media profile bios. Write in ${L}. Use only the facts given; never invent claims, numbers or awards. No superlatives.`,
    user: `Write 3 different ${PNAME[platform]} bios for ${site?.name || "this organisation"}, each at most ${max} characters. Each must say what it is, where (if known) and end with a short call to action and the website domain. One per line, starting with "1)", "2)", "3)". Nothing else.

Facts: ${[site?.category, site?.city, site?.country, ...(site?.services || []).slice(0, 5), site?.domain].filter(Boolean).join("; ")}`
  };
}
export function fitAiPost(platform, text, link) {
  let t = String(text || "").replace(/^["“]|["”]$/g, "").replace(/\*\*/g, "").trim();
  const R = RULES[platform] || RULES.facebook;
  if (link && R.link && !t.includes(link)) {
    const bare = link.split("?")[0];
    t = t.includes(bare) ? t.replace(bare, link) : t + "\n\n" + link;
  }
  while (countFor(platform, t) > R.post) {
    const lines = t.split("\n");
    const i = lines.findIndex((l, k) => k > 0 && !/https?:\/\//.test(l) && l.trim());
    if (i < 0) { t = cut(t, R.post); break; }
    lines.splice(i, 1);
    t = lines.join("\n").replace(/\n{3,}/g, "\n\n");
  }
  return t;
}
