// Sada · social channel check.
// Reads the open profile (Instagram, Facebook, LinkedIn, X, YouTube, TikTok,
// Threads, Pinterest, Bluesky, Xing) on the device, plus the logged-out version
// of the same page and the platform's robots.txt. Nothing leaves the computer.

import { SUBTYPES, subById } from "./kinds.js";
import { norm, country, inCity, inCountry, countryName } from "./geo.js";

export const PLATFORMS = {
  instagram: { name: "Instagram", bio: 150 },
  facebook: { name: "Facebook", bio: 101 },
  linkedin: { name: "LinkedIn", bio: 120 },
  x: { name: "X", bio: 160 },
  youtube: { name: "YouTube", bio: 1000 },
  tiktok: { name: "TikTok", bio: 80 },
  threads: { name: "Threads", bio: 150 },
  pinterest: { name: "Pinterest", bio: 500 },
  bluesky: { name: "Bluesky", bio: 256 },
  xing: { name: "XING", bio: 200 }
};

// Host permissions requested (optionally) for automatic scans
export const SOCIAL_ORIGINS = [
  "https://*.instagram.com/*", "https://*.facebook.com/*", "https://*.linkedin.com/*",
  "https://x.com/*", "https://*.x.com/*", "https://twitter.com/*", "https://*.twitter.com/*",
  "https://*.youtube.com/*", "https://*.tiktok.com/*", "https://*.threads.net/*", "https://*.threads.com/*",
  "https://*.pinterest.com/*", "https://bsky.app/*", "https://*.xing.com/*"
];

const RESERVED = {
  instagram: /^(p|reel|reels|tv|explore|stories|accounts|direct|about|legal|developer|web|emails|challenge|privacy)$/i,
  facebook: /^(watch|marketplace|gaming|events|login|login\.php|home\.php|story\.php|photo\.php|photo|photos|reel|reels|share|sharer|dialog|plugins|help|policies|settings|notifications|messages|friends|bookmarks|search|hashtag|stories|privacy|business|ads|pages)$/i,
  x: /^(home|explore|notifications|messages|i|search|settings|compose|intent|hashtag|tos|privacy|login|signup|logout|share|jobs|lists|bookmarks|communities|premium_sign_up)$/i,
  pinterest: /^(pin|search|ideas|today|business|_|login|signup|settings|categories|topics|explore)$/i,
  tiktok: /^(foryou|following|explore|live|upload|search|discover|tag|music|login|signup|about|legal|business)$/i
};

// What is this URL? → { platform, kind: profile|company|person|post|group|other, handle, key }
export function detectSocial(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const h = u.hostname.toLowerCase().replace(/^(www|m|mobile|web|de|fr|ar|en|business)\./, "");
  const seg = u.pathname.split("/").filter(Boolean).map((s) => decodeURIComponent(s));
  const out = (platform, kind, handle, key) => ({ platform, kind, handle: handle || "", key: key || "", name: PLATFORMS[platform].name });
  if (/(^|\.)instagram\.com$/.test(h)) {
    if (!seg.length) return out("instagram", "other");
    if (/^(p|reel|reels|tv)$/i.test(seg[0])) return out("instagram", "post", "", "");
    if (RESERVED.instagram.test(seg[0])) return out("instagram", "other");
    return out("instagram", "profile", "@" + seg[0], "instagram.com/" + seg[0].toLowerCase());
  }
  if (/(^|\.)facebook\.com$/.test(h) || h === "fb.com") {
    if (!seg.length) return out("facebook", "other");
    if (/^profile\.php$/i.test(seg[0]) && u.searchParams.get("id")) return out("facebook", "profile", "", "facebook.com/profile.php?id=" + u.searchParams.get("id"));
    if (/^groups$/i.test(seg[0])) return out("facebook", "group", seg[1] || "", "facebook.com/groups/" + (seg[1] || "").toLowerCase());
    if (/^pages$/i.test(seg[0]) && seg.length >= 2) return out("facebook", "profile", seg[1], "facebook.com/pages/" + seg.slice(1, 3).join("/").toLowerCase());
    if (RESERVED.facebook.test(seg[0])) return out("facebook", "other");
    if (/^(posts|videos|photos)$/i.test(seg[1] || "")) return out("facebook", "post", seg[0], "facebook.com/" + seg[0].toLowerCase());
    return out("facebook", "profile", seg[0], "facebook.com/" + seg[0].toLowerCase());
  }
  if (/(^|\.)linkedin\.com$/.test(h)) {
    if (/^(company|school|showcase)$/i.test(seg[0] || "") && seg[1] && (/^(unavailable|setup|login|admin)$/i.test(seg[1]) || /^admin$/i.test(seg[2] || ""))) return out("linkedin", "other");
    if (/^in$/i.test(seg[0] || "") && /^me$/i.test(seg[1] || "")) return out("linkedin", "other");
    if (/^(company|school|showcase)$/i.test(seg[0] || "") && seg[1]) return out("linkedin", (seg[2] || "") === "posts" && seg[3] ? "company" : "company", seg[1], "linkedin.com/" + seg[0].toLowerCase() + "/" + seg[1].toLowerCase());
    if (/^in$/i.test(seg[0] || "") && seg[1]) return out("linkedin", "person", seg[1], "linkedin.com/in/" + seg[1].toLowerCase());
    if (/^(posts|feed|pulse)$/i.test(seg[0] || "")) return out("linkedin", "post");
    return out("linkedin", "other");
  }
  if (h === "x.com" || h === "twitter.com") {
    if (!seg.length || RESERVED.x.test(seg[0])) return out("x", "other");
    if (/^status$/i.test(seg[1] || "")) return out("x", "post", "@" + seg[0], "x.com/" + seg[0].toLowerCase());
    return out("x", "profile", "@" + seg[0], "x.com/" + seg[0].toLowerCase());
  }
  if (/(^|\.)youtube\.com$/.test(h) || h === "youtu.be") {
    if (h === "youtu.be" || /^(watch|shorts|live|embed)$/i.test(seg[0] || "")) return out("youtube", "post");
    if (/^@/.test(seg[0] || "")) return out("youtube", "profile", seg[0], "youtube.com/" + seg[0].toLowerCase());
    if (/^(channel|c|user)$/i.test(seg[0] || "") && seg[1]) return out("youtube", "profile", seg[1], "youtube.com/" + seg[0].toLowerCase() + "/" + (seg[0] === "channel" ? seg[1] : seg[1].toLowerCase()));
    return out("youtube", "other");
  }
  if (/(^|\.)tiktok\.com$/.test(h)) {
    if (/^@/.test(seg[0] || "")) return out("tiktok", /^(video|photo)$/i.test(seg[1] || "") ? "post" : "profile", seg[0], "tiktok.com/" + seg[0].toLowerCase());
    return out("tiktok", "other");
  }
  if (/(^|\.)threads\.(net|com)$/.test(h)) {
    if (/^@/.test(seg[0] || "")) return out("threads", /^post$/i.test(seg[1] || "") ? "post" : "profile", seg[0], "threads.net/" + seg[0].toLowerCase());
    return out("threads", "other");
  }
  if (/(^|\.)pinterest\.[a-z.]+$/.test(h)) {
    if (!seg.length || RESERVED.pinterest.test(seg[0])) return out("pinterest", /^pin$/i.test(seg[0] || "") ? "post" : "other");
    return out("pinterest", "profile", seg[0], "pinterest.com/" + seg[0].toLowerCase());
  }
  if (h === "bsky.app") {
    if (/^profile$/i.test(seg[0] || "") && seg[1]) return out("bluesky", /^post$/i.test(seg[2] || "") ? "post" : "profile", "@" + seg[1], "bsky.app/profile/" + seg[1].toLowerCase());
    return out("bluesky", "other");
  }
  if (/(^|\.)xing\.com$/.test(h)) {
    if (/^(pages|companies)$/i.test(seg[0] || "") && seg[1]) return out("xing", "company", seg[1], "xing.com/pages/" + seg[1].toLowerCase());
    if (/^profile$/i.test(seg[0] || "") && seg[1]) return out("xing", "person", seg[1], "xing.com/profile/" + seg[1].toLowerCase());
    return out("xing", "other");
  }
  return null;
}
export const isSocialUrl = (url) => !!detectSocial(url);

// Social profiles that a website links to (anywhere) and names in sameAs
export function socialChannelsOf(doc, base) {
  const links = new Set(), sameAs = new Set();
  doc.querySelectorAll("a[href]").forEach((a) => {
    try {
      const d = detectSocial(new URL(a.getAttribute("href"), base).href);
      if (d?.key) links.add(d.key);
    } catch {}
  });
  const walk = (n) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(walk);
    for (const v of [].concat(n.sameAs || [])) {
      const d = typeof v === "string" ? detectSocial(v) : null;
      if (d?.key) sameAs.add(d.key);
    }
    if (n["@graph"]) walk(n["@graph"]);
    for (const k of ["publisher", "provider", "author", "parentOrganization"]) if (n[k]) walk(n[k]);
  };
  doc.querySelectorAll('script[type="application/ld+json" i]').forEach((s) => { try { walk(JSON.parse(s.textContent || "")); } catch {} });
  return { links: [...links], sameAs: [...sameAs] };
}

// ── collector: runs inside the social page (must be self-contained) ──────────
export async function collectSocial() {
  const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
  const txt = (el) => el ? clean(el.innerText || el.textContent) : "";
  const q = (sel, root = document) => { try { return root.querySelector(sel); } catch { return null; } };
  const qa = (sel, root = document) => { try { return Array.from(root.querySelectorAll(sel)); } catch { return []; } };
  const meta = (d, sel) => clean(d.querySelector(sel)?.getAttribute("content"));
  const host = location.hostname.replace(/^(www|m|mobile|web)\./, "");
  const P = /instagram/.test(host) ? "instagram" : /facebook|fb\.com/.test(host) ? "facebook" : /linkedin/.test(host) ? "linkedin" : /^(x|twitter)\.com$/.test(host) ? "x" : /youtube/.test(host) ? "youtube" : /tiktok/.test(host) ? "tiktok" : /threads\./.test(host) ? "threads" : /pinterest/.test(host) ? "pinterest" : /bsky\.app/.test(host) ? "bluesky" : /xing/.test(host) ? "xing" : "other";
  const fetched = [];

  const unwrap = (href, text) => {
    try {
      const u = new URL(href, location.href);
      const inner = u.searchParams.get("u") || u.searchParams.get("q") || u.searchParams.get("url") || u.searchParams.get("target");
      if (/^(l\.instagram\.com|l\.facebook\.com|lm\.facebook\.com|www\.youtube\.com|youtube\.com|www\.linkedin\.com|linkedin\.com|l\.threads\.net|l\.threads\.com)$/.test(u.hostname) && inner && /^https?:/i.test(inner)) return inner;
      if (/^t\.co$/.test(u.hostname)) {
        const t = clean(text).replace(/…$/, "");
        return /\./.test(t) ? (/^https?:/.test(t) ? t : "https://" + t) : href;
      }
      return u.href;
    } catch { return ""; }
  };
  const externalLinks = (root) => {
    const out = [];
    for (const a of qa("a[href]", root)) {
      const href = a.getAttribute("href") || "";
      if (/^(#|javascript:|mailto:|tel:)/i.test(href)) continue;
      const real = unwrap(href, txt(a));
      try {
        const h = new URL(real).hostname.replace(/^www\./, "");
        if (!h || h === host || h.endsWith("." + host) || /(instagram|facebook|fbcdn|linkedin|licdn|twitter|x\.com|twimg|youtube|ytimg|google|tiktok|threads|pinterest|pinimg|bsky|xing|apple\.com|microsoft|t\.co$)/.test(h)) continue;
        if (!out.some((x) => x.url === real)) out.push({ url: real, text: txt(a).slice(0, 80) });
      } catch {}
    }
    return out.slice(0, 8);
  };
  const pageLang = (document.documentElement.lang || "").slice(0, 2).toLowerCase();
  const ago = (s) => {
    const t = clean(s).toLowerCase();
    if (!t) return null;
    if (/(just now|gerade eben|à l'instant|الآن|today|heute|aujourd'hui|اليوم)/.test(t)) return 0;
    if (/(yesterday|gestern|^hier|أمس)/.test(t)) return 1;
    const m = /(\d+)\s*([a-zäöüéèàâûîôç\u0600-\u06ff]+)\.?/.exec(t);
    if (!m) return null;
    const n = Number(m[1]), u = m[2];
    const has = (re) => re.test(u);
    if (has(/^(mo|mon|mons|month|months|monat|monate|monaten|mois|شهر|أشهر|شهور)$/)) return n * 30;
    if (has(/^(s|sec|secs|second|seconds|sek|sekunde|sekunden|seconde|secondes|m|min|mins|minute|minutes|minuten|mn|h|hr|hrs|hour|hours|std|stunde|stunden|heure|heures|ثانية|ثوان|دقيقة|دقائق|ساعة|ساعات)$/)) return 0;
    if (has(/^(w|wk|wks|week|weeks|wo|woche|wochen|sem|semaine|semaines|أسبوع|أسابيع)$/)) return n * 7;
    if (has(/^(y|yr|yrs|year|years|jahr|jahre|jahren|an|ans|année|années|سنة|سنوات|عام|أعوام)$/)) return n * 365;
    if (u === "j") return pageLang === "de" ? n * 365 : n;
    if (has(/^(d|day|days|t|tg|tag|tage|tagen|jour|jours|يوم|أيام)$/)) return n;
    return null;
  };
  const days = (iso) => { const t = Date.parse(iso); return isNaN(t) ? null : Math.max(0, Math.round((Date.now() - t) / 864e5)); };

  const TLD = /^(com|org|net|edu|gov|int|info|biz|link|app|io|ai|co|me|tv|bio|page|site|online|website|shop|store|art|museum|gallery|academy|education|school|university|city|berlin|bayern|nrw|hamburg|koeln|wien|swiss|paris|eus|bzh|kiwi|travel|events|digital|agency|studio|design|media|news|blog|club|team|social|life|world|global|today|email|tech|dev|cloud|xyz|[a-z]{2})$/i;
  const SOCIAL_HOST = /(^|\.)(instagram|facebook|fb|fbcdn|linkedin|licdn|twitter|x|twimg|youtube|youtu|ytimg|google|gstatic|tiktok|threads|pinterest|pinimg|bsky|xing|apple|microsoft|cdninstagram|whatsapp|t)\.(com|net|be|me|co|app)$/i;
  const textLinks = (text) => {
    const out = [];
    const t = String(text || "").replace(/\u2026/g, " ");
    for (const m of t.matchAll(/(?<![@\w.-])((?:https?:\/\/)?(?:[a-z0-9äöü-]+\.)+([a-z]{2,24}))(\/[^\s"'<>,;)]*)?/gi)) {
      const host = m[1].replace(/^https?:\/\//i, "").toLowerCase();
      if (!TLD.test(m[2]) || SOCIAL_HOST.test(host) || /^(e\.v|z\.b|u\.a|d\.h|bzw|ggf|inkl|ca|st|str|nr|tel|fax)\./i.test(host) || host.split(".")[0].length < 2) continue;
      const url = (/^https?:/i.test(m[1]) ? "" : "https://") + m[1] + (m[3] || "");
      if (!out.some((x) => x.url === url)) out.push({ url, text: m[0] });
    }
    return out.slice(0, 6);
  };
  const unq = (h) => String(h || "").replace(/&quot;/g, '"').replace(/&#34;/g, '"').replace(/&amp;/g, "&").replace(/&#92;/g, "\\");
  const jstr = (v) => { try { return JSON.parse('"' + v + '"'); } catch { return v; } };
  const embedded = (html0) => {
    const html = unq(html0);
    const one = (key) => { const m = new RegExp('"' + key + '":"((?:[^"\\\\]|\\\\.){1,2000}?)"').exec(html); return m ? clean(jstr(m[1])) : ""; };
    const all = (re) => Array.from(html.matchAll(re)).map((m) => jstr(m[1]));
    const e = { bio: "", name: "", category: "", links: [], email: "", phone: "", private: false, days: [] };
    const toLink = (u) => { u = clean(u); if (!u) return null; if (!/^https?:/i.test(u)) u = "https://" + u; try { const h = new URL(u).hostname; if (SOCIAL_HOST.test(h.replace(/^www\./, ""))) return null; } catch { return null; } return { url: u, text: u.replace(/^https?:\/\//, "") }; };
    if (P === "instagram" || P === "threads") {
      e.bio = one("biography"); e.name = one("full_name"); e.category = one("category_name");
      e.links = [one("external_url"), ...all(/"bio_links":\[(?:[^\]]*?)"url":"((?:[^"\\]|\\.)*)"/g), ...all(/\{"title":"(?:[^"\\]|\\.)*","lynx_url":"(?:[^"\\]|\\.)*","url":"((?:[^"\\]|\\.)*)"/g)].map(toLink).filter(Boolean);
      e.email = one("business_email") || one("public_email"); e.phone = one("business_phone_number") || one("public_phone_number");
      e.private = /"is_private":true/.test(html) && !/"is_private":false/.test(html);
      e.days = all(/"taken_at(?:_timestamp)?":(\d{9,11})/g).map((x) => Math.round((Date.now() / 1000 - Number(x)) / 86400)).filter((d) => d >= 0);
    } else if (P === "linkedin") {
      e.links = [one("websiteUrl"), one("companyPageUrl")].map(toLink).filter(Boolean);
      e.bio = one("tagline"); e.category = one("localizedName");
    } else if (P === "facebook") {
      e.links = all(/l\.facebook\.com\\?\/l\.php\?u=([^&"\\]+)/g).map((x) => { try { return decodeURIComponent(x); } catch { return ""; } }).map(toLink).filter(Boolean);
      e.category = one("category_name");
    } else if (P === "tiktok") {
      e.bio = one("signature"); e.name = one("nickname");
      const bl = /"bioLink":\{"link":"((?:[^"\\]|\\.)*)"/.exec(html); if (bl) e.links = [toLink(jstr(bl[1]))].filter(Boolean);
      e.days = all(/"createTime":"?(\d{9,11})/g).map((x) => Math.round((Date.now() / 1000 - Number(x)) / 86400)).filter((d) => d >= 0);
    } else if (P === "youtube") {
      const d = /"channelMetadataRenderer":\{"title":"(?:[^"\\]|\\.)*","description":"((?:[^"\\]|\\.)*)"/.exec(html); if (d) e.bio = clean(jstr(d[1]));
      e.links = all(/"channelExternalLinkViewModel":\{"title":\{"content":"(?:[^"\\]|\\.)*"\},"link":\{"content":"((?:[^"\\]|\\.)*)"/g).map(toLink).filter(Boolean);
      e.days = all(/"publishedTimeText":\{"simpleText":"((?:[^"\\]|\\.)*)"/g).map(ago).filter((d) => d !== null);
    } else if (P === "pinterest") {
      e.bio = one("about"); e.links = [one("website_url"), one("domain_url")].map(toLink).filter(Boolean);
    }
    return e;
  };
  // a value shown under a label ("Site web", "Headquarters", "Téléphone" …), in any layout
  const field = (re, root) => {
    for (const el of qa("dt, h2, h3, h4, strong, span, div, p", root || q('main, [role="main"]') || document.body)) {
      if (el.children.length > 2) continue;
      const own = clean(el.textContent);
      if (!own || own.length > 40 || !re.test(own)) continue;
      const v = el.nextElementSibling || el.parentElement?.nextElementSibling;
      const t = v ? clean(v.innerText || v.textContent) : "";
      if (t && t.length < 300 && !re.test(t)) return { el: v, text: t };
    }
    return null;
  };
  const F_SITE = /^(site web|site internet|website|webseite|internetseite|الموقع الإلكتروني|الموقع)\s*:?$/i;
  const F_HQ = /^(siège social|siège|headquarters|hauptsitz|sitz|standort|emplacement|location|المقر الرئيسي|المقر|الموقع الجغرافي)\s*:?$/i;
  const F_IND = /^(secteur|secteur d'activité|industry|branche|القطاع|المجال)\s*:?$/i;
  const F_TEL = /^(téléphone|phone|telefon|الهاتف)\s*:?$/i;
  const COUNTRY_END = /,\s*(germany|deutschland|allemagne|france|frankreich|tunisia|tunisie|tunesien|austria|österreich|autriche|switzerland|schweiz|suisse|morocco|maroc|marokko|algeria|algérie|algerien|egypt|égypte|ägypten|united arab emirates|saudi arabia|belgium|belgique|belgien|luxembourg|italy|italie|italien|spain|espagne|spanien|netherlands|niederlande|pays-bas|united kingdom|uk|united states|usa|canada|تونس|المغرب|مصر|الجزائر|السعودية|الإمارات|ألمانيا|فرنسا)\s*$/iu;
  const STREET = /(\b\d{1,4}\s*[a-z]?\s*,|(straße|strasse|str\.|weg|platz|allee|gasse|ring|damm)\s*\d|\b(rue|avenue|av\.|boulevard|bd|chemin|place|road|street|lane|شارع|نهج)\b)/iu;
  const isPrivateText = (t) => /(this account is private|dieses konto ist privat|ce compte est privé|هذا الحساب خاص|this profile is private|dieses profil ist privat)/i.test(t);

  // the page may still be rendering (single-page apps)
  const ready = { instagram: "header section, header h2", x: '[data-testid="UserName"], [data-testid="primaryColumn"] article', youtube: "#page-header, ytd-c4-tabbed-header-renderer, yt-page-header-renderer", tiktok: '[data-e2e="user-title"], [data-e2e="user-bio"]', linkedin: "h1", facebook: '[role="main"] h1, h1', bluesky: '[data-testid="profileHeaderDisplayName"]', pinterest: '[data-test-id="profile-name"], h1', threads: "h1, h2", xing: "h1" }[P];
  for (let i = 0; ready && i < 12 && !q(ready); i++) await new Promise((r) => setTimeout(r, 350));

  const live = { name: "", handle: "", bio: "", category: "", location: "", links: [], verified: false, followers: "", contact: [], posts: [] };
  try {
    if (P === "instagram") {
      const hd = q("header") || q("main section");
      live.handle = txt(q("h2", hd || document)) || txt(q("h1", hd || document));
      const spans = qa("section span[dir=auto], section h1, section div[dir=auto], span[dir=auto]", hd || document).map(txt).filter(Boolean);
      live.name = spans.find((s) => s !== live.handle && !/^\d|followers|following|posts|abonnés|abonnements|publications|follower|gefolgt|beiträge|متابع|منشور/i.test(s)) || "";
      live.category = txt(q("header section div._ap3a._aaco._aacu._aacy._aad6._aade"));
      const COUNT = /^\d[\d.,]*\s*[kKmM]?\s*(followers|following|posts|abonnés|abonnements|publications|follower|gefolgt|beiträge|متابع|منشور)/i;
      live.bio = spans.filter((x) => x !== live.name && x !== live.handle && x !== live.category && !COUNT.test(x)).sort((a, b) => b.length - a.length)[0] || "";
      if (!live.bio && hd) {
        const lines = (hd.innerText || "").split("\n").map(clean).filter((l) => l && l !== live.handle && l !== live.name && !/^\d[\d.,]*\s*[kKmM]?\s*(followers|following|posts|abonnés|abonnements|publications|follower|gefolgt|beiträge|متابع|منشور)/i.test(l) && !/^(follow|message|folgen|nachricht|suivre|envoyer un message|متابعة|مراسلة|edit profile|profil bearbeiten|modifier le profil)$/i.test(l));
        live.bio = lines.filter((l) => l.length > 15).join(" ").slice(0, 400);
      }
      live.verified = !!q('header svg[aria-label="Verified"], header svg[aria-label="Vérifié"], header svg[aria-label="Verifiziert"]');
      live.links = [...externalLinks(hd || document), ...textLinks(hd?.innerText || "")];
      const MON = { january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11, januar: 0, februar: 1, märz: 2, mai: 4, juni: 5, juli: 6, oktober: 9, dezember: 11, janvier: 0, février: 1, mars: 2, avril: 3, juin: 5, juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11 };
      const altDay = (a) => {
        let m = /\bon ([a-z]+) (\d{1,2}), (\d{4})/i.exec(a) || null, y, mo, d;
        if (m) { mo = MON[m[1].toLowerCase()]; d = +m[2]; y = +m[3]; }
        else if ((m = /\b(?:am|le) (\d{1,2})\.? ([a-zäéû]+) (\d{4})/i.exec(a))) { d = +m[1]; mo = MON[m[2].toLowerCase()]; y = +m[3]; }
        if (mo === void 0 || !y) return null;
        return Math.max(0, Math.round((Date.now() - new Date(y, mo, d).getTime()) / 864e5));
      };
      live.posts = qa('main a[href*="/p/"] img[alt], main a[href*="/reel/"] img[alt]').slice(0, 12).map((i) => ({ text: clean(i.getAttribute("alt")), days: altDay(i.getAttribute("alt") || "") }));
    } else if (P === "x") {
      const un = q('[data-testid="UserName"]');
      const parts = (un?.innerText || "").split("\n").map(clean).filter(Boolean);
      live.name = parts[0] || "";
      live.handle = parts.find((p) => p.startsWith("@")) || "";
      live.bio = txt(q('[data-testid="UserDescription"]'));
      live.location = txt(q('[data-testid="UserLocation"]'));
      live.category = txt(q('[data-testid="UserProfessionalCategory"]'));
      const ul = q('[data-testid="UserUrl"]');
      if (ul) live.links = [{ url: unwrap(ul.getAttribute("href") || "", txt(ul)), text: txt(ul) }];
      live.verified = !!q('[data-testid="UserName"] [data-testid="icon-verified"], [data-testid="UserName"] svg[aria-label*="erif"]');
      live.posts = qa('article[data-testid="tweet"]').slice(0, 15).map((a) => ({ text: txt(q('[data-testid="tweetText"]', a)), days: days(q("time[datetime]", a)?.getAttribute("datetime")) }));
    } else if (P === "youtube") {
      live.name = txt(q("#page-header h1, yt-dynamic-text-view-model h1, #channel-name #text"));
      live.handle = (txt(q("#page-header yt-content-metadata-view-model, #channel-handle")).match(/@[\w.-]+/) || [""])[0];
      live.bio = txt(q("#page-header yt-description-preview-view-model, yt-description-preview-view-model, #description-container, #channel-tagline"));
      live.links = externalLinks(q("#page-header, ytd-c4-tabbed-header-renderer, yt-page-header-renderer") || document);
      live.verified = !!q("#page-header badge-shape[aria-label], #channel-name ytd-badge-supported-renderer .badge-style-type-verified");
      live.posts = qa("ytd-rich-item-renderer, ytd-grid-video-renderer").slice(0, 15).map((v) => ({ text: txt(q("#video-title", v)), days: ago(qa("#metadata-line span, .inline-metadata-item", v).map(txt).find((s) => /(ago|vor |il y a|منذ)/i.test(s)) || "") }));
    } else if (P === "tiktok") {
      live.handle = txt(q('[data-e2e="user-title"]'));
      live.name = txt(q('[data-e2e="user-subtitle"]'));
      live.bio = txt(q('[data-e2e="user-bio"]'));
      const ln = q('[data-e2e="user-link"]');
      if (ln) live.links = [{ url: unwrap(ln.getAttribute("href") || "", txt(ln)), text: txt(ln) }];
      live.verified = !!q('[data-e2e="user-title"] svg, [data-e2e="user-page"] [class*="Verify"]');
      live.posts = qa('[data-e2e="user-post-item"]').slice(0, 12).map((v) => ({ text: clean(q("img[alt]", v)?.getAttribute("alt")), days: null }));
    } else if (P === "linkedin") {
      live.name = txt(q("h1"));
      live.bio = txt(q(".org-top-card-summary__tagline, .top-card-layout__headline, .text-body-medium.break-words, [data-test-id='about-us__description'], section.org-about-module p, .org-about-us-organization-description__text"));
      const about = txt(q("section.org-about-module, .org-page-details-module__card-spacing, [data-test-id='about-us__description']"));
      if (about.length > live.bio.length) live.bio = (live.bio ? live.bio + " · " : "") + about.slice(0, 600);
      live.category = txt(q(".org-top-card-summary-info-list__info-item, [data-test-id='about-us__industry'] dd"));
      live.location = txt(qa(".org-top-card-summary-info-list__info-item")[1]) || txt(q("[data-test-id='about-us__headquarters'] dd, .top-card__subline-item"));
      live.links = externalLinks(q("main") || document);
      // newer layout: one line "category · place · 289 followers · 501-1K employees"
      const COUNTS = /(follower|abonné|متابع|employ|mitarbeit|beschäftigt|salarié|موظف|\d)/i;
      if (!live.location || !live.category || /·/.test(live.category)) {
        const line = qa("main div, main p, main span, main li").filter((el) => el.children.length < 6).map((el) => clean(el.textContent)).filter((t) => t.length < 260 && t.includes("·") && /(follower|abonné|متابع)/i.test(t)).sort((a, b) => a.length - b.length)[0];
        if (line) {
          const segs = line.split("·").map(clean).filter((x) => x && !COUNTS.test(x));
          if (segs.length >= 2) { live.category = segs[0]; live.location ||= segs[1]; }
          else if (segs.length === 1) { if (segs[0].includes(",")) live.location ||= segs[0]; else live.category = segs[0]; }
        }
      }
      // tagline under the name, and the overview text on the About page, in any layout
      if (!live.bio) {
        const h1 = q("main h1");
        let sib = h1?.nextElementSibling || h1?.parentElement?.nextElementSibling;
        for (let i = 0; sib && i < 3 && !live.bio; i++, sib = sib.nextElementSibling) { const t = clean(sib.textContent); if (t && t.length < 220 && !t.includes("·") && !/(follow|suivre|folgen|متابعة)/i.test(t)) live.bio = t; }
      }
      const ov = qa("main h2, main h3").find((h) => /^(vue d.ensemble|overview|übersicht|überblick|descriptif|description|beschreibung|نظرة عامة|نبذة|about|à propos|info)$/i.test(clean(h.textContent)));
      if (ov) {
        const parts = [];
        for (let n = ov.nextElementSibling; n && parts.join(" ").length < 700; n = n.nextElementSibling) { if (/^(DL|H2|H3)$/.test(n.tagName)) break; const t = clean(n.textContent); if (t) parts.push(t); }
        const desc = parts.join(" ").slice(0, 700);
        if (desc.length > 40 && !live.bio.includes(desc.slice(0, 40))) live.bio = (live.bio ? live.bio + " · " : "") + desc;
      }
      const hq = field(F_HQ), ind = field(F_IND), web = field(F_SITE), tel = field(F_TEL);
      if (hq) live.location = hq.text.split("\n")[0];
      if (ind && !live.category) live.category = ind.text;
      if (web) for (const l of [...externalLinks(web.el), ...textLinks(web.text)]) if (!live.links.some((x) => x.url === l.url)) live.links.unshift(l);
      if (tel) live.contact.push("tel");
      const slug = /^\/(company|school|showcase)\/([^/]+)/.exec(location.pathname);
      if (slug && (!live.links.length || live.bio.length < 80) && !/\/about\/?$/.test(location.pathname)) {
        try {
          const aboutUrl = location.origin + "/" + slug[1] + "/" + slug[2] + "/about/";
          fetched.push(aboutUrl);
          const ar = await fetch(aboutUrl, { credentials: "include", cache: "no-store" });
          const ah = await ar.text();
          const ad = new DOMParser().parseFromString(ah, "text/html");
          const em = embedded(ah);
          const aboutLinks = [...em.links, ...Array.from(ad.querySelectorAll('dd a[href], a[href*="/redir/redirect"], a[data-tracking-control-name*="website"]')).map((a) => ({ url: unwrap(a.getAttribute("href") || "", txt(a)), text: txt(a) }))];
          for (const l of aboutLinks) { try { if (!/linkedin\.com$/.test(new URL(l.url).hostname) && !live.links.some((x) => x.url === l.url)) live.links.push(l); } catch {} }
          const desc = txt(ad.querySelector('[data-test-id="about-us__description"], section.org-about-module p, p.break-words, .org-about-us-organization-description__text')) || clean(ad.querySelector('meta[name="description"]')?.getAttribute("content"));
          if (desc.length > live.bio.length) live.bio = (live.bio && !desc.includes(live.bio) ? live.bio + " · " : "") + desc.slice(0, 700);
          live.aboutRead = true;
        } catch {}
      }
      live.posts = qa(".feed-shared-update-v2, .update-components-actor, [data-urn*='activity']").slice(0, 10).map((p) => ({ text: txt(q(".update-components-text, .feed-shared-text, .break-words", p)), days: days(q("time[datetime]", p)?.getAttribute("datetime")) ?? ago(txt(q(".update-components-actor__sub-description, time", p)).split("•")[0]) }));
    } else if (P === "facebook") {
      const main = q('[role="main"]') || document.body;
      live.name = txt(q("h1", main));
      const intro = qa("div, section", main).find((d) => /^(intro|einführung|présentation|introduction|المقدمة|نبذة)$/i.test(txt(q("h2, span", d))));
      const HEAD = /^(intro|einführung|présentation|introduction|المقدمة|نبذة)$/i;
      const lines = (intro?.innerText || "").split("\n").map(clean).filter((l) => l && !HEAD.test(l));
      const catAt = lines.findIndex((l) => /^(page|seite|الصفحة)\s*·/i.test(l));
      if (catAt >= 0) live.category = lines[catAt].replace(/^(page|seite|الصفحة)\s*·\s*/i, "");
      live.location = lines.find((l) => l.length < 140 && l.includes(",") && (COUNTRY_END.test(l) || STREET.test(l))) || "";
      const bioLines = catAt > 0 ? lines.slice(0, catAt) : lines.filter((l) => l !== live.location && !/^(page|seite)\s*·/i.test(l) && !/[@]|^\+?\d[\d\s()/.-]{6,}$|^[\w.-]+\.[a-z]{2,}$/i.test(l) && !/(recommend|empfehlen|recommandent|closed now|open now|geschlossen|geöffnet|fermé|ouvert)/i.test(l));
      live.bio = (bioLines.join(" ") || txt(intro).replace(/^(intro|einführung|présentation|introduction|المقدمة|نبذة)\s*/i, "")).slice(0, 500);
      live.links = externalLinks(intro || main);
      if (lines.some((l) => /^[\w.+-]+@[\w-]+\.[\w.]{2,}$/.test(l))) live.contact.push("mailto");
      if (lines.some((l) => /^\+?\d[\d\s()/.-]{6,}$/.test(l))) live.contact.push("tel");
      const boxes = qa('[role="article"], [aria-posinset], [data-pagelet^="TimelineFeedUnit"]', main);
      const outer = boxes.filter((a) => !boxes.some((b) => b !== a && b.contains(a)));
      live.posts = outer.slice(0, 10).map((a) => {
        const msg = txt(q('[data-ad-rendering-role="story_message"], [data-ad-preview="message"], [data-ad-comet-preview="message"]', a)) || qa('div[dir="auto"], span[dir="auto"]', a).map(txt).filter((t) => t.length >= 20 && t !== live.name).sort((x, y) => y.length - x.length)[0] || "";
        return { text: msg.replace(/\s*(see more|mehr ansehen|voir plus|عرض المزيد)\s*$/i, ""), days: ago(qa("a[href*='/posts/'], a[href*='story_fbid'], a[aria-label], span > a[role=link], abbr", a).map((x) => x.getAttribute("aria-label") || txt(x)).find((s) => /\d/.test(s) && s.length < 30) || "") };
      });
    } else if (P === "bluesky") {
      live.name = txt(q('[data-testid="profileHeaderDisplayName"]'));
      live.handle = txt(q('[data-testid="profileHeaderHandle"]'));
      live.bio = txt(q('[data-testid="profileHeaderDescription"]'));
      live.links = externalLinks(q('[data-testid="profileHeaderDescription"]') || document);
      live.posts = qa('[data-testid^="feedItem-by-"]').slice(0, 12).map((p) => ({ text: txt(q('[data-testid="postText"]', p)), days: ago(txt(q("a[data-tooltip], a[aria-label*=' at ']", p))) }));
    } else if (P === "pinterest") {
      live.name = txt(q('[data-test-id="profile-name"], h1'));
      live.bio = txt(q('[data-test-id="main-user-description-text"], [data-test-id="profile-about-text"]'));
      live.links = externalLinks(q('[data-test-id="profile-header"], [data-test-id="profile-website"]') || document);
    } else {
      live.name = txt(q("h1"));
    }
  } catch {}
  // shared extras
  const main = q('main, [role="main"]') || document.body;
  let liveHtml = "";
  try { liveHtml = document.documentElement.outerHTML.slice(0, 6e6); } catch {}
  const emLive = embedded(liveHtml);
  if (!live.bio && emLive.bio) live.bio = emLive.bio;
  if (!live.name && emLive.name) live.name = emLive.name;
  if (!live.category && emLive.category) live.category = emLive.category;
  for (const l of emLive.links) if (!live.links.some((x) => x.url === l.url)) live.links.push(l);
  if (!live.links.length) live.links = externalLinks(main);
  if (!live.links.length) live.links = textLinks(live.bio);
  if (emLive.email) live.contact.push("mailto");
  if (emLive.phone) live.contact.push("tel");
  if (emLive.days.length && !live.posts.some((p) => typeof p.days === "number")) live.posts.push(...emLive.days.slice(0, 12).map((d) => ({ text: "", days: d })));
  live.private = emLive.private || isPrivateText((main.innerText || "").slice(0, 4000));
  for (const a of qa('a[href^="mailto:"], a[href^="tel:"]', main)) live.contact.push(a.getAttribute("href").split(":")[0]);
  const blob = `${live.bio} ${live.category} ${live.location}`;
  if (/[\w.+-]+@[\w-]+\.[\w.]{2,}/.test(blob)) live.contact.push("mailto");
  if (/(\+\d[\d\s().-]{7,}|\b0\d[\d\s/().-]{6,})/.test(blob)) live.contact.push("tel");
  if (qa('a[aria-label], div[role="button"], button', main).some((b) => /^(contact|email|e-mail|call|kontakt|anrufen|appeler|اتصل|تواصل)$/i.test(clean(b.getAttribute("aria-label") || txt(b))))) live.contact.push("button");
  const ogLive = { title: meta(document, 'meta[property="og:title"]'), desc: meta(document, 'meta[property="og:description"]') || meta(document, 'meta[name="description"]') };

  // what a logged-out crawler gets
  const raw = { status: 0, url: "", login: false, title: "", ogTitle: "", desc: "", jsonld: [], bio: "", links: [] };
  try {
    const ctl = new AbortController();
    const tm = setTimeout(() => ctl.abort(), 9000);
    fetched.push(location.href);
    const r = await fetch(location.href, { credentials: "omit", cache: "no-store", redirect: "follow", signal: ctl.signal });
    clearTimeout(tm);
    raw.status = r.status;
    raw.url = r.url;
    const html = (await r.text()).slice(0, 2e6);
    const d = new DOMParser().parseFromString(html, "text/html");
    raw.title = clean(d.querySelector("title")?.textContent);
    raw.ogTitle = meta(d, 'meta[property="og:title"]');
    raw.desc = meta(d, 'meta[property="og:description"]') || meta(d, 'meta[name="description"]');
    raw.login = /\/(login|accounts\/login|authwall|signup|checkpoint|i\/flow\/login|uas\/login)/i.test(r.url) || /(log ?in|anmelden|se connecter|sign in|sign up|registrieren|s'inscrire|تسجيل الدخول)/i.test(raw.title) && !raw.ogTitle;
    for (const s of d.querySelectorAll('script[type="application/ld+json"]')) { try { raw.jsonld.push(JSON.parse(s.textContent || "")); } catch {} }
    const walk = (n) => {
      if (!n || typeof n !== "object") return;
      if (Array.isArray(n)) return n.forEach(walk);
      if (n["@graph"]) walk(n["@graph"]);
      const ty = [].concat(n["@type"] || []).join(" ");
      if (/Organization|Person|LocalBusiness|ProfilePage/.test(ty)) {
        if (typeof n.url === "string" && !/(linkedin|facebook|instagram|twitter|x\.com|youtube|tiktok)/i.test(n.url)) raw.links.push({ url: n.url, text: n.url });
        if (typeof n.description === "string" && !raw.bio) raw.bio = clean(n.description);
        if (n.mainEntity) walk(n.mainEntity);
      }
    };
    raw.jsonld.forEach(walk);
    const em = embedded(html);
    if (!raw.bio && em.bio) raw.bio = em.bio;
    for (const l of em.links) if (!raw.links.some((x) => x.url === l.url)) raw.links.push(l);
    raw.private = em.private;
    raw.size = html.length;
  } catch {}
  // the platform's robots.txt
  let robots = null;
  try {
    fetched.push(location.origin + "/robots.txt");
    const r = await fetch("/robots.txt", { credentials: "omit", cache: "no-store" });
    robots = { status: r.status, text: r.ok ? (await r.text()).slice(0, 3e5) : "" };
  } catch {}
  return { url: location.href.split("#")[0], path: location.pathname, platform: P, lang: document.documentElement.lang || "", live, og: ogLive, raw, robots, fetched };
}

// ── analysis ────────────────────────────────────────────────────────────────
const AGGREGATORS = /(^|\.)(linktr\.ee|linkin\.bio|beacons\.ai|lnk\.bio|campsite\.bio|bio\.link|bio\.site|taplink\.(cc|at)|carrd\.co|solo\.to|msha\.ke|linkfly\.to|allmylinks\.com|hoo\.be|koji\.to|flowcode\.com|tap\.bio|later\.com|linkpop\.com|komi\.io|stan\.store|withkoji\.com|milkshake\.app|shor\.by|direct\.me|biolinky\.co)$/i;
const GENERIC_SNIPPET = /(see instagram photos and videos|photos et vidéos instagram|instagram-fotos und -videos|log in or sign up to view|connectez-vous ou inscrivez-vous|melde dich an|anmelden oder registrieren|on tiktok|sur tiktok|auf tiktok|watch the latest video|regardez la dernière vidéo|sieh dir das neueste video|enjoy the videos and music you love|profitez des vidéos|genieße deine lieblingsvideos|the latest posts from|les derniers posts de|die neuesten beiträge von|discover recipes, home ideas)/i;
const HOST = (u) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };
const TYPE_WORDS = /\b(stadt|stadtverwaltung|gemeinde|gemeindeverwaltung|verwaltung|landkreis|city|town|of|ville|de|mairie|commune|hochschule|universitat|university|universite|museum|musee|verein|association|stiftung|foundation|fondation|the|der|die|das|la|le|les)\b/g;
const sameName = (a, b) => {
  const core = (x) => norm(x).replace(/[^\p{L}\p{N}]+/gu, " ").replace(TYPE_WORDS, " ").replace(/\s+/g, " ").trim();
  if (core(a) && core(a) === core(b)) return true;
  const A = norm(a).replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\b(e v|gmbh|ag|ltd|inc|sarl|official|offiziell|officiel)\b/g, "").trim();
  const B = norm(b).replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\b(e v|gmbh|ag|ltd|inc|sarl|official|offiziell|officiel)\b/g, "").trim();
  if (!A || !B) return false;
  if (A === B || A.includes(B) || B.includes(A)) return true;
  const ta = new Set(A.split(" ").filter((w) => w.length > 2)), tb = new Set(B.split(" ").filter((w) => w.length > 2));
  let n = 0;
  for (const w of ta) if (tb.has(w)) n++;
  return n / Math.max(1, Math.min(ta.size, tb.size)) >= 0.6;
};
// words that say what an organisation is, beyond the sector list
const WHAT_EXTRA = /(?<![\p{L}])(stadt|gemeinde|landkreis|landratsamt|markt|city of|town of|county|ville de|commune|municipality|métropole|بلدية|government|administration|verwaltung|öffentliche verwaltung|administration publique|executive offices|services exécutifs|higher education|enseignement supérieur|hochschulbildung|non-?profit|gemeinnützig|à but non lucratif)(?![\p{L}])/iu;
const label = (h) => { const p = String(h || "").replace(/^www\./, "").split("."); return p.length > 2 && /^(co|com|org|ac|gov|net|edu)$/.test(p[p.length - 2]) ? p[p.length - 3] : p[p.length - 2] || ""; };
// same owner: the domain itself, a subdomain, or the same name on another ending (albstadt.link ↔ albstadt.de)
export const sameOwner = (h, domain) => !!h && !!domain && (h === domain || h.endsWith("." + domain) || label(h).length >= 4 && label(h) === label(domain));
const AI_UA = ["OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Perplexity-User", "Claude-SearchBot", "Claude-User"];
const SEARCH_UA = ["Googlebot", "Bingbot"];

// data: collectSocial() result · ctx: { lang, det, site: {name, aliases, domain, kind, sub, city, country, services, sameAs, links}, bots: [{ua, allowed}] }
export function analyzeSocial(data, ctx) {
  const L = ctx.lang;
  const det = ctx.det;
  const plat = PLATFORMS[det.platform] || { name: det.name || "", bio: 160 };
  const live = data.live || {};
  const raw = data.raw || {};
  const site = ctx.site || null;
  const isPost = det.kind === "post";
  const bio = (live.bio || raw.bio || "").trim();
  const name = (live.name || "").trim() || (raw.ogTitle || "").replace(/\s*[(@|•–-].*$/, "").trim();
  const links = [...(live.links || []), ...(raw.links || [])].filter((x, i, a) => x.url && a.findIndex((y) => y.url === x.url) === i);
  const out = [];
  const add = (id, status, vars = {}, w = 1) => out.push({ id, status, vars: { platform: plat.name, ...vars }, w });

  // 1 crawlers
  const bots = ctx.bots || [];
  if (bots.length) {
    const search = bots.filter((b) => SEARCH_UA.includes(b.ua));
    const ai = bots.filter((b) => AI_UA.includes(b.ua));
    const blocked = [...search, ...ai].filter((b) => !b.allowed).map((b) => b.ua);
    const aiOk = ai.filter((b) => b.allowed).length;
    const searchOk = search.every((b) => b.allowed);
    const st = !searchOk ? "fail" : aiOk < ai.length ? "warn" : "pass";
    // the platform decides this, not the channel owner: shown, but not part of the score
    add("crawl", st, { blocked: blocked.join(", "), list: [...search, ...ai].filter((b) => b.allowed).map((b) => b.ua).join(", "), searchOk: searchOk ? 1 : 0, noAi: aiOk === 0 ? 1 : 0 }, 0);
  } else add("crawl", "info", {}, 0);

  // 2 visible logged out
  const seen = raw.ogTitle || raw.title || "";
  if (live.private || raw.private) add("public", "fail", { why: "private" }, 2);
  else if (!raw.status) add("public", "info", {}, 0);
  else if (raw.login || raw.status >= 400) add("public", "info", { why: "unconfirmed", status: raw.status }, 0);
  else if (name && sameName(seen, name) || det.handle && norm(seen).includes(norm(det.handle.replace(/^@/, "")))) add("public", "pass", { seen: seen.slice(0, 90) }, 2);
  else add("public", "warn", { seen: seen.slice(0, 90) }, 2);

  // 3 preview text
  const snip = raw.desc || "";
  if (!raw.status || raw.login || raw.status >= 400) add("snippet", "info", {}, 0);
  else if (!snip) add("snippet", "fail", {}, 1);
  else {
    const bioStart = norm(bio).slice(0, 40);
    const has = bioStart.length >= 15 && norm(snip).includes(bioStart.slice(0, 25));
    if (has || !GENERIC_SNIPPET.test(snip) && snip.length >= 60) add("snippet", "pass", { snip: snip.slice(0, 160) }, 1);
    else if (GENERIC_SNIPPET.test(snip)) add("snippet", "info", { snip: snip.slice(0, 160), why: "platform" }, 0);
    else add("snippet", "warn", { snip: snip.slice(0, 160) }, 1);
  }
  if (isPost) {
    const post = (live.posts || [])[0];
    const words = (bio || post?.text || "").split(/\s+/).filter(Boolean).length;
    add("posts", words >= 12 ? "pass" : "warn", { n: words }, 1);
    return finish(out, plat, ctx, { name, bio, links });
  }

  // 4 name
  if (!name) add("name", "warn", { name: det.handle || "" }, 1.5);
  else if (site?.name) add("name", [site.name, ...(site.aliases || [])].some((n) => sameName(n, name)) ? "pass" : "warn", { name, site: site.name }, 1.5);
  else add("name", "info", { name }, 0);

  // 5 bio says what you are
  if (!bio) add("bio", "fail", { n: 0 }, 2);
  else {
    let what = "";
    const said = `${name} · ${live.category || ""} · ${bio}`;
    for (const st of SUBTYPES) { st.re.lastIndex = 0; const m = st.re.exec(said); st.re.lastIndex = 0; if (m) { what = m[0]; break; } }
    if (!what) what = (WHAT_EXTRA.exec(said) || [])[0] || "";
    if (!what && live.category && live.category.length <= 60) what = live.category;
    if (!what && site) {
      const sub = subById(site.sub);
      const words = [site.category, ...(site.services || []), ...(sub ? [sub.en[0], sub.de[0].replace(/^(ein|eine)\s/, ""), sub.fr[0].replace(/^(un|une)\s/, "")] : [])].filter(Boolean);
      what = words.find((w) => norm(bio).includes(norm(w))) || "";
    }
    const tags = (bio.match(/#[\p{L}\p{N}_]+/gu) || []).length;
    const plain = bio.replace(/#[\p{L}\p{N}_]+/gu, "").replace(/[\p{Extended_Pictographic}️]/gu, "").trim();
    const good = plain.length >= Math.min(40, plat.bio * 0.4) && what && tags <= 6;
    add("bio", good ? "pass" : "warn", { n: bio.length, what: what || "–" }, 2);
  }

  // 6 place
  const where = `${name} ${bio} ${live.location || ""} ${live.category || ""}`;
  const townIn = (/(?:^|\s)(?:Stadt|Stadtverwaltung|Gemeinde|Gemeindeverwaltung|Markt|Landkreis|City of|Town of|Ville de|Mairie de|Mairie d'|Commune de|Municipality of|بلدية)\s+([\p{Lu}][\p{L}-]{2,}(?:\s+(?:an der|am|im|ob der|sur|en|-)\s*[\p{Lu}][\p{L}-]+)?)/u.exec(`${name} · ${bio}`) || [])[1] || "";
  const places = site ? [site.city, ...(site.cities || []), site.country && countryName(L, site.country), site.country && countryName("en", site.country), site.country && countryName("de", site.country), site.country && countryName("fr", site.country)].filter(Boolean) : [];
  const local = site && ["stay", "food", "health", "beauty", "fitness", "trades", "realestate", "legal", "finance", "culture", "public", "school", "travel", "nonprofit"].includes(site.kind);
  if (places.length) {
    const hit = places.find((p) => norm(where).includes(norm(p))) || (live.location ? live.location : "");
    add("place", hit ? "pass" : local ? "warn" : "info", { place: hit || places[0] }, hit || local ? 1 : 0);
  } else if (live.location || townIn) add("place", "pass", { place: live.location || townIn }, 1);
  else add("place", "info", { place: "" }, 0);

  // 7 website link
  const own = site?.domain ? links.find((l) => sameOwner(HOST(l.url), site.domain)) : null;
  const agg = links.find((l) => AGGREGATORS.test(HOST(l.url)));
  if (own) add("link", "pass", { link: HOST(own.url) }, 2);
  else if (agg) add("link", "warn", { link: HOST(agg.url), site: site?.domain || "" , why: "agg" }, 2);
  else if (links.length && site?.domain) add("link", "warn", { link: HOST(links[0].url), site: site.domain, why: "other" }, 2);
  else if (links.length) add("link", "pass", { link: HOST(links[0].url) }, 2);
  else add("link", "fail", {}, 2);

  // 8 website links back
  if (!site) add("backlink", "info", {}, 0);
  else if ((site.sameAs || []).includes(det.key)) add("backlink", "pass", { site: site.domain }, 1.5);
  else if ((site.links || []).includes(det.key)) add("backlink", "warn", { site: site.domain }, 1.5);
  else add("backlink", "fail", { site: site.domain }, 1.5);

  // 9 contact
  const how = [...new Set(live.contact || [])];
  add("contact", how.length ? "pass" : "warn", { how: how.map((h) => ({ mailto: "e-mail", tel: "☎", button: "✉" }[h] || h)).join(" · ") }, 1);

  // 10 fresh
  const ds = (live.posts || []).map((p) => p.days).filter((d) => typeof d === "number");
  if (ds.length) {
    const d = Math.min(...ds);
    add("fresh", d <= 30 ? "pass" : d <= 90 ? "warn" : "fail", { days: d }, 1);
  } else add("fresh", "info", {}, 0);

  // 11 post text
  const texts = (live.posts || []).map((p) => p.text || "").filter((t) => t && !/^(photo by|photo shared by|may be an image|peut être une image|kann ein bild|ربما تحتوي|no photo description)/i.test(t));
  if (texts.length >= 1) {
    const avg = Math.round(texts.reduce((a, t) => a + t.replace(/#[\p{L}\p{N}_]+/gu, "").split(/\s+/).filter(Boolean).length, 0) / texts.length);
    add("posts", avg >= (det.platform === "youtube" ? 5 : 12) ? "pass" : "warn", { n: avg }, 1);
  } else add("posts", "info", {}, 0);

  // 12 verified (information only)
  add("verified", "info", { on: live.verified ? 1 : 0 }, 0);
  return finish(out, plat, ctx, { name, bio, links });
}

function finish(checks, plat, ctx, seen) {
  const scored = checks.filter((c) => c.status !== "info" && c.w > 0);
  const tot = scored.reduce((a, c) => a + c.w, 0);
  const got = scored.reduce((a, c) => a + c.w * (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0);
  const order = { fail: 0, warn: 1, pass: 2, info: 3 };
  checks.sort((a, b) => order[a.status] - order[b.status] || b.w - a.w);
  return { score: tot ? Math.round((got / tot) * 100) : null, checks, seen, platform: plat.name, max: plat.bio };
}

// A bio the person can paste, within the platform's limit
export function suggestBio(site, det, lang, fallbackName) {
  const L = ["en", "fr", "de", "ar"].includes(lang) ? lang : "en";
  const max = PLATFORMS[det.platform]?.bio || 160;
  const CTA = {
    en: { uni: "Apply", culture: "Plan your visit", nonprofit: "Get involved", award: "Apply", knowledge: "Explore", food: "Book a table", stay: "Book direct", health: "Appointments", shop: "Shop", agency: "Start a project", saas: "Try it", school: "Enrol", training: "Courses", public: "Services", generic: "More" },
    de: { uni: "Jetzt bewerben", culture: "Besuch planen", nonprofit: "Mitmachen", award: "Jetzt bewerben", knowledge: "Entdecken", food: "Tisch reservieren", stay: "Direkt buchen", health: "Termine", shop: "Zum Shop", agency: "Projekt starten", saas: "Testen", school: "Anmelden", training: "Kurse", public: "Services", generic: "Mehr" },
    fr: { uni: "Candidater", culture: "Préparer sa visite", nonprofit: "S'engager", award: "Candidater", knowledge: "Découvrir", food: "Réserver", stay: "Réserver en direct", health: "Rendez-vous", shop: "Boutique", agency: "Lancer un projet", saas: "Essayer", school: "S'inscrire", training: "Formations", public: "Démarches", generic: "En savoir plus" },
    ar: { uni: "قدّم الآن", culture: "خطط لزيارتك", nonprofit: "شارك معنا", award: "قدّم الآن", knowledge: "اكتشف", food: "احجز طاولة", stay: "احجز مباشرة", health: "المواعيد", shop: "تسوّق", agency: "ابدأ مشروعك", saas: "جرّب", school: "سجّل", training: "الدورات", public: "الخدمات", generic: "المزيد" }
  }[L];
  const PH = { en: ["[what you are]", "[town]"], fr: ["[ce que vous êtes]", "[ville]"], de: ["[was Sie sind]", "[Ort]"], ar: ["[ما أنت]", "[المدينة]"] }[L];
  const name = site?.name || fallbackName || "";
  const cat = site?.category || PH[0];
  const where = site ? (site.city ? inCity(L, site.city) + (site.country ? (L === "ar" ? "، " : ", ") + countryName(L, site.country) : "") : site.country ? inCountry(L, site.country) : "") : inCity(L, PH[1]);
  const sep = L === "ar" ? "، " : ", ";
  const head = `${name}${name ? " · " : ""}${cat}${where}.`;
  const cta = `${CTA[site?.kind] || CTA.generic}${L === "fr" ? " : " : ": "}${site?.domain || "[website]"}`;
  let offers = (site?.services || []).slice(0, 3);
  const build = (o, h = head) => [h, o.length ? o.join(sep) + "." : "", cta].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  let s = build(offers);
  while (s.length > max && offers.length) { offers = offers.slice(0, -1); s = build(offers); }
  if (s.length > max) s = build([], `${name || cat}${where}.`);
  if (s.length > max) s = s.slice(0, max - 1).trimEnd() + "…";
  return { text: s, max, n: s.length };
}

// ── strings ─────────────────────────────────────────────────────────────────
export const SOCIAL_I18N = {
  en: {
    "f.banner.none": "Check the page in this tab.",
    "f.banner": "Sada is showing {shown}. You are now on another tab.",
    "f.banner.new": "You are now on {host}.",
    "f.update": "Update for this tab",
    "f.perm": "Chrome lets Sada read a new tab only after you click the Sada icon in the toolbar, or once you allow Sada on all sites.",
    "f.declined": "No permission given. Click the Sada icon in the browser toolbar while you are on this page, or click “Allow and update” again to allow all sites.",
    "f.allow": "Allow on all sites",
    "f.internal": "Sada cannot read browser pages like this one. Open a website.",
    "f.refresh": "Update for the current tab",
    "safe.h": "Safe to allow",
    "safe.1": "Runs only on this computer. There is no Sada server: nothing about you or your browsing goes to AYKA or anyone else. No account, no tracking.",
    "safe.2": "Read-only: Sada never clicks, types, logs in or changes a website.",
    "safe.3": "Reads only the tab you are looking at, never your other tabs. Watch, if you turn it on, re-reads only your own website and public channel pages, logged out.",
    "safe.4": "You stay in control: switch off “Follow the active tab” in Settings, or remove access in Chrome at any time (Extensions → Sada → Details → Site access).",
    "safe.chrome": "Chrome will show its standard warning that the extension can “read and change all your data on all websites”. Chrome uses this wording for every extension with site access. Sada only reads; the optional heat map adds a temporary highlight on your screen only.",
    "safe.go": "Allow and update",
    "safe.proof": "See the proof",
    "safe.badge": "Private",
    "set.follow": "Follow the active tab",
    "set.follow.d": "When Sada may read the tab, it updates by itself when you switch tabs or open a new page. AI assistant tabs are skipped.",
    "public.private": "This account is private. Crawlers and AI assistants see nothing of it.",
    "public.unconfirmed": "{platform} did not show this page to Sada's logged-out request (status {status}). Platforms often refuse repeated requests, so this is not proof that crawlers are blocked. To be sure, open the page in a private window.",
    "s.compare": "Read {domain} and compare",
    "s.compare.d": "Chrome asks once for permission to read this one website. Sada reads its home page on this computer.",
    "s.compare.fail": "Sada could not read {domain}. It may forward to another address: open your website in a tab and click the Sada icon once.",
    "s.compare.run": "Reading {domain}…",
    "s.st.blocked": "Blocked",
    "s.st.searchonly": "Search only",
    "s.private.site": "Read on this computer: this page, the logged-out version of it, {platform}'s public robots.txt and the website {site}. Nothing was sent anywhere.",
    "crawl.platform": "This is {platform}'s own setting and does not count in your score.",
    "snippet.platform": "{platform} shows crawlers its own standard text here (“{snip}”), not your bio. You cannot change this; it does not count in your score. Make sure your name is clear and that your website carries the full description.",
    "s.linked.listed": "Compared with {site}: this website links to the channel.",
    "s.linked.domain": "Compared with {site}: the website this channel links to.",
    "s.linked.name": "Compared with {site} (same name, not confirmed by a link).",
    "s.reading": "Reading {domain}, the website this channel links to…",
    "crawl.failai": "Search engines may read this page, but {platform} blocks every AI assistant: {blocked}.",
    "nav.social": "Channel",
    "s.title": "{platform} channel check",
    "s.lead": "Can AI assistants and search engines read this channel, understand who runs it, and connect it to your website?",
    "s.post": "This is a single post. Sada checks what crawlers can read of it. Open the channel's profile page for the full check.",
    "s.other": "This {platform} page is not a profile. Open a profile, company or channel page and Sada checks it.",
    "s.scan": "Check this channel", "s.rescan": "Check again", "s.scanning": "Reading the channel…",
    "s.linked": "Compared with your website {site}", "s.nosite": "No website linked yet. Open your website and run Sada once: then this check also compares names, places and links.",
    "s.auto.t": "Check social channels automatically", "s.auto.d": "When this panel is open and you open a profile on Instagram, Facebook, LinkedIn, X, YouTube, TikTok, Threads, Pinterest, Bluesky or XING, Sada checks it. Chrome asks you once for permission to read those sites.",
    "s.auto.on": "On", "s.auto.off": "Turn on",
    "s.bio.t": "Suggested bio", "s.bio.d": "{n} of {max} characters on {platform}. Check every fact before you use it.",
    "s.private": "Read on this computer: this page, the logged-out version of it and {platform}'s public robots.txt. Nothing was sent anywhere.",
    "s.err.perm": "Sada needs permission to read this page. Click the Sada icon in the toolbar on this tab, or turn on automatic checks below.",
    "s.err.read": "Sada could not read this page. Reload it, wait until the profile is visible, then check again.",
    "s.guard": "Audit and Ask AI work on websites. This tab shows a {platform} page.", "s.guard.back": "Back to the channel check",
    "s.seen": "What Sada read", "s.seen.name": "Name", "s.seen.bio": "Bio", "s.seen.link": "Links",
    "s.st.pass": "Good", "s.st.warn": "Improve", "s.st.fail": "Missing", "s.st.info": "Note",
    "crawl.t": "AI and search crawlers may read {platform}", "crawl.pass": "{platform}'s robots.txt lets these crawlers read this page: {list}.", "crawl.warn": "Search engines may read this page, but {platform} blocks some AI assistants: {blocked}.", "crawl.fail": "{platform} blocks search engines or all AI assistants from this page: {blocked}.", "crawl.info": "Sada could not read {platform}'s robots.txt.", "crawl.fix": "You cannot change {platform}'s rules. Put your key facts on your own website and on channels AI can read, and link them to each other.",
    "public.t": "Visible without logging in", "public.pass": "A logged-out visitor, like a crawler, sees “{seen}”.", "public.warn": "A logged-out visitor sees only a generic title: “{seen}”.", "public.fail": "A logged-out visitor is sent to a login page. Crawlers see nothing of this channel.", "public.info": "Sada could not load the logged-out version of this page.", "public.fix": "Make the profile public. On Facebook, use a Page, not a personal profile.",
    "snippet.t": "Preview text crawlers get", "snippet.pass": "The preview text describes you: “{snip}”.", "snippet.warn": "The preview text is generic: “{snip}”. Your bio is not in it.", "snippet.fail": "There is no preview text for crawlers.", "snippet.info": "Preview text not checked.", "snippet.fix": "Make the first line of your bio a plain sentence: who you are, what you do, where. Platforms often reuse it as preview text.",
    "name.t": "Same name as your website", "name.pass": "“{name}” matches your website's name.", "name.warn": "The channel shows “{name}”, your website says “{site}”. AI may treat them as two different organisations.", "name.info": "The channel is called “{name}”.", "name.fix": "Use the same name as on your website. Put a short form or acronym in the bio.",
    "bio.t": "Bio says what you are", "bio.pass": "The bio names what you are (“{what}”) in {n} characters.", "bio.warn": "The bio ({n} characters) does not say plainly what you are, or is mostly hashtags and emoji.", "bio.fail": "There is no bio.", "bio.fix": "Start with one plain sentence: name, what you are, for whom, where. See the suggestion below.",
    "place.t": "Says where you are", "place.pass": "The channel names your place: {place}.", "place.warn": "The channel does not say where you are ({place} on your website).", "place.info": "No place found. If people look for you locally, add your town.", "place.fix": "Add your town and country to the bio or the location field.",
    "link.t": "Links to your website", "link.pass": "The channel links to {link}.", "link.warn": "The channel links to {link}, not to your website {site}.", "link.fail": "The channel has no website link.", "link.fix": "Make your own domain the main link. AI uses it to connect this channel to your website.", "link.agg": "Link-in-bio pages hide your website from crawlers.",
    "backlink.t": "Your website links back", "backlink.pass": "{site} names this channel in its structured data (sameAs).", "backlink.warn": "{site} links to this channel, but not in its structured data (sameAs).", "backlink.fail": "{site} does not link to this channel.", "backlink.info": "Open your website with Sada once to check whether it links here.", "backlink.fix": "Add this channel's address to the sameAs list of your Organization markup and link it in your footer. The fix pack on the Agent tab writes the code.",
    "contact.t": "Easy to reach", "contact.pass": "People can reach you from here ({how}).", "contact.warn": "No e-mail, phone or contact button found.", "contact.fix": "Add an e-mail address, a phone number or a contact button.",
    "fresh.t": "Recently active", "fresh.pass": "Last post {days} days ago.", "fresh.warn": "Last post {days} days ago. Inactive-looking channels are trusted less.", "fresh.fail": "Last post {days} days ago. The channel looks abandoned.", "fresh.info": "No post dates visible on this page.", "fresh.fix": "Post at least once a month, or say in the bio where people find current news.",
    "posts.t": "Posts carry real text", "posts.pass": "Posts carry real text (about {n} words each).", "posts.warn": "Posts carry little text (about {n} words) or mostly hashtags. AI cannot quote an image.", "posts.info": "No post texts visible on this page.", "posts.fix": "Write 1 to 3 plain sentences per post: what, who, where, when. Keep hashtags few.",
    "verified.t": "Verified badge", "verified.info": "{v}", "verified.yes": "The channel shows a verified badge.", "verified.no": "No verified badge. Not required, but it helps people trust the channel."
  },
  de: {
    "f.banner.none": "Prüfen Sie die Seite in diesem Tab.",
    "f.banner": "Sada zeigt {shown}. Sie sind jetzt in einem anderen Tab.",
    "f.banner.new": "Sie sind jetzt auf {host}.",
    "f.update": "Für diesen Tab aktualisieren",
    "f.perm": "Chrome lässt Sada einen neuen Tab erst lesen, wenn Sie auf das Sada-Symbol in der Symbolleiste klicken oder Sada einmal alle Websites erlauben.",
    "f.declined": "Keine Berechtigung erteilt. Klicken Sie auf dieser Seite auf das Sada-Symbol in der Symbolleiste, oder klicken Sie erneut auf „Erlauben und aktualisieren“, um alle Websites zu erlauben.",
    "f.allow": "Auf allen Websites erlauben",
    "f.internal": "Browserseiten wie diese kann Sada nicht lesen. Öffnen Sie eine Website.",
    "f.refresh": "Für den aktuellen Tab aktualisieren",
    "safe.h": "Sicher zu erlauben",
    "safe.1": "Läuft nur auf diesem Computer. Es gibt keinen Sada-Server: Nichts über Sie oder Ihr Surfen geht an AYKA oder andere. Kein Konto, kein Tracking.",
    "safe.2": "Nur lesen: Sada klickt, tippt und meldet sich nie an und ändert keine Website.",
    "safe.3": "Liest nur den Tab, den Sie gerade ansehen, nie Ihre anderen Tabs. Watch liest, wenn Sie es einschalten, nur Ihre eigene Website und öffentliche Kanalseiten erneut, ausgeloggt.",
    "safe.4": "Sie behalten die Kontrolle: „Aktiven Tab verfolgen“ in den Einstellungen ausschalten oder den Zugriff jederzeit in Chrome entfernen (Erweiterungen → Sada → Details → Websitezugriff).",
    "safe.chrome": "Chrome zeigt dazu seine Standardwarnung, dass die Erweiterung „alle Ihre Daten auf allen Websites lesen und ändern“ kann. Diesen Wortlaut verwendet Chrome für jede Erweiterung mit Websitezugriff. Sada liest nur; die optionale Heatmap legt nur auf Ihrem Bildschirm eine vorübergehende Markierung an.",
    "safe.go": "Erlauben und aktualisieren",
    "safe.proof": "Nachweis ansehen",
    "safe.badge": "Privat",
    "set.follow": "Dem aktiven Tab folgen",
    "set.follow.d": "Wenn Sada den Tab lesen darf, aktualisiert es sich beim Tab-Wechsel oder bei einer neuen Seite von selbst. Tabs von KI-Assistenten werden übersprungen.",
    "public.private": "Dieses Konto ist privat. Crawler und KI-Assistenten sehen nichts davon.",
    "public.unconfirmed": "{platform} hat Sadas ausgeloggte Anfrage nicht beantwortet (Status {status}). Plattformen lehnen wiederholte Anfragen oft ab; das beweist nicht, dass Crawler gesperrt sind. Zur Sicherheit die Seite in einem privaten Fenster öffnen.",
    "s.compare": "{domain} lesen und vergleichen",
    "s.compare.d": "Chrome fragt einmal nach der Erlaubnis, diese eine Website zu lesen. Sada liest die Startseite auf diesem Computer.",
    "s.compare.fail": "Sada konnte {domain} nicht lesen. Die Adresse leitet womöglich weiter: Öffnen Sie Ihre Website in einem Tab und klicken Sie einmal auf das Sada-Symbol.",
    "s.compare.run": "{domain} wird gelesen…",
    "s.st.blocked": "Gesperrt",
    "s.st.searchonly": "Nur Suche",
    "s.private.site": "Auf diesem Computer gelesen: diese Seite, ihre ausgeloggte Fassung, die öffentliche robots.txt von {platform} und die Website {site}. Nichts wurde irgendwohin gesendet.",
    "crawl.platform": "Das ist eine Einstellung von {platform} und zählt nicht in Ihre Punktzahl.",
    "snippet.platform": "{platform} zeigt Crawlern hier einen eigenen Standardtext („{snip}“), nicht Ihre Bio. Das können Sie nicht ändern; es zählt nicht in Ihre Punktzahl. Achten Sie auf einen klaren Namen und darauf, dass Ihre Website die vollständige Beschreibung enthält.",
    "s.linked.listed": "Verglichen mit {site}: Diese Website verlinkt den Kanal.",
    "s.linked.domain": "Verglichen mit {site}: die Website, auf die dieser Kanal verlinkt.",
    "s.linked.name": "Verglichen mit {site} (gleicher Name, nicht durch einen Link bestätigt).",
    "s.reading": "{domain} wird gelesen, die Website, auf die dieser Kanal verlinkt…",
    "crawl.failai": "Suchmaschinen dürfen die Seite lesen, aber {platform} sperrt alle KI-Assistenten: {blocked}.",
    "nav.social": "Kanal",
    "s.title": "{platform}-Kanal-Check",
    "s.lead": "Können KI-Assistenten und Suchmaschinen diesen Kanal lesen, erkennen, wer dahintersteht, und ihn mit Ihrer Website verbinden?",
    "s.post": "Das ist ein einzelner Beitrag. Sada prüft, was Crawler davon lesen. Öffnen Sie die Profilseite für den vollen Check.",
    "s.other": "Diese {platform}-Seite ist kein Profil. Öffnen Sie ein Profil, eine Unternehmensseite oder einen Kanal.",
    "s.scan": "Diesen Kanal prüfen", "s.rescan": "Erneut prüfen", "s.scanning": "Kanal wird gelesen…",
    "s.linked": "Verglichen mit Ihrer Website {site}", "s.nosite": "Noch keine Website verknüpft. Öffnen Sie Ihre Website und starten Sie Sada einmal: Dann vergleicht dieser Check auch Namen, Orte und Links.",
    "s.auto.t": "Social-Kanäle automatisch prüfen", "s.auto.d": "Wenn dieses Panel offen ist und Sie ein Profil auf Instagram, Facebook, LinkedIn, X, YouTube, TikTok, Threads, Pinterest, Bluesky oder XING öffnen, prüft Sada es. Chrome fragt einmal nach der Erlaubnis, diese Seiten zu lesen.",
    "s.auto.on": "An", "s.auto.off": "Einschalten",
    "s.bio.t": "Vorschlag für die Bio", "s.bio.d": "{n} von {max} Zeichen auf {platform}. Prüfen Sie jede Angabe, bevor Sie sie verwenden.",
    "s.private": "Auf diesem Computer gelesen: diese Seite, ihre ausgeloggte Version und die öffentliche robots.txt von {platform}. Nichts wurde gesendet.",
    "s.err.perm": "Sada braucht die Erlaubnis, diese Seite zu lesen. Klicken Sie in diesem Tab auf das Sada-Symbol oder schalten Sie unten die automatischen Checks ein.",
    "s.err.read": "Sada konnte diese Seite nicht lesen. Laden Sie sie neu, warten Sie, bis das Profil sichtbar ist, und prüfen Sie erneut.",
    "s.guard": "Audit und Ask AI funktionieren auf Websites. Dieser Tab zeigt eine {platform}-Seite.", "s.guard.back": "Zurück zum Kanal-Check",
    "s.seen": "Was Sada gelesen hat", "s.seen.name": "Name", "s.seen.bio": "Bio", "s.seen.link": "Links",
    "s.st.pass": "Gut", "s.st.warn": "Verbessern", "s.st.fail": "Fehlt", "s.st.info": "Hinweis",
    "crawl.t": "KI- und Such-Crawler dürfen {platform} lesen", "crawl.pass": "Die robots.txt von {platform} erlaubt diesen Crawlern, die Seite zu lesen: {list}.", "crawl.warn": "Suchmaschinen dürfen die Seite lesen, aber {platform} sperrt einige KI-Assistenten: {blocked}.", "crawl.fail": "{platform} sperrt Suchmaschinen oder alle KI-Assistenten für diese Seite: {blocked}.", "crawl.info": "Sada konnte die robots.txt von {platform} nicht lesen.", "crawl.fix": "Die Regeln von {platform} können Sie nicht ändern. Stellen Sie Ihre wichtigsten Fakten auf Ihre eigene Website und auf Kanäle, die KI lesen kann, und verlinken Sie diese untereinander.",
    "public.t": "Ohne Login sichtbar", "public.pass": "Ausgeloggte Besucher, wie Crawler, sehen „{seen}“.", "public.warn": "Ausgeloggte Besucher sehen nur einen allgemeinen Titel: „{seen}“.", "public.fail": "Ausgeloggte Besucher landen auf einer Login-Seite. Crawler sehen nichts von diesem Kanal.", "public.info": "Sada konnte die ausgeloggte Version nicht laden.", "public.fix": "Stellen Sie das Profil auf öffentlich. Auf Facebook: eine Seite statt eines privaten Profils nutzen.",
    "snippet.t": "Vorschautext für Crawler", "snippet.pass": "Der Vorschautext beschreibt Sie: „{snip}“.", "snippet.warn": "Der Vorschautext ist allgemein: „{snip}“. Ihre Bio steht nicht darin.", "snippet.fail": "Es gibt keinen Vorschautext für Crawler.", "snippet.info": "Vorschautext nicht geprüft.", "snippet.fix": "Machen Sie die erste Zeile Ihrer Bio zu einem klaren Satz: wer, was, wo. Plattformen übernehmen sie oft als Vorschautext.",
    "name.t": "Gleicher Name wie auf der Website", "name.pass": "„{name}“ passt zum Namen Ihrer Website.", "name.warn": "Der Kanal heißt „{name}“, Ihre Website „{site}“. KI hält das womöglich für zwei Organisationen.", "name.info": "Der Kanal heißt „{name}“.", "name.fix": "Verwenden Sie denselben Namen wie auf der Website. Kurzformen oder Abkürzungen gehören in die Bio.",
    "bio.t": "Bio sagt, was Sie sind", "bio.pass": "Die Bio nennt, was Sie sind („{what}“), in {n} Zeichen.", "bio.warn": "Die Bio ({n} Zeichen) sagt nicht klar, was Sie sind, oder besteht vor allem aus Hashtags und Emojis.", "bio.fail": "Es gibt keine Bio.", "bio.fix": "Beginnen Sie mit einem klaren Satz: Name, was Sie sind, für wen, wo. Siehe Vorschlag unten.",
    "place.t": "Sagt, wo Sie sind", "place.pass": "Der Kanal nennt Ihren Ort: {place}.", "place.warn": "Der Kanal sagt nicht, wo Sie sind (auf der Website: {place}).", "place.info": "Kein Ort gefunden. Wenn man Sie vor Ort sucht, ergänzen Sie Ihren Ort.", "place.fix": "Ergänzen Sie Ort und Land in der Bio oder im Standortfeld.",
    "link.t": "Verlinkt Ihre Website", "link.pass": "Der Kanal verlinkt {link}.", "link.warn": "Der Kanal verlinkt {link}, nicht Ihre Website {site}.", "link.fail": "Der Kanal hat keinen Website-Link.", "link.fix": "Setzen Sie Ihre eigene Domain als Hauptlink. KI verbindet den Kanal darüber mit Ihrer Website.", "link.agg": "Link-in-Bio-Seiten verstecken Ihre Website vor Crawlern.",
    "backlink.t": "Ihre Website verlinkt zurück", "backlink.pass": "{site} nennt diesen Kanal in den strukturierten Daten (sameAs).", "backlink.warn": "{site} verlinkt diesen Kanal, aber nicht in den strukturierten Daten (sameAs).", "backlink.fail": "{site} verlinkt diesen Kanal nicht.", "backlink.info": "Öffnen Sie Ihre Website einmal mit Sada, um das zu prüfen.", "backlink.fix": "Tragen Sie die Kanal-Adresse in die sameAs-Liste Ihres Organization-Markups ein und verlinken Sie sie im Footer. Das Fix-Paket im Agent-Tab schreibt den Code.",
    "contact.t": "Gut erreichbar", "contact.pass": "Man erreicht Sie von hier ({how}).", "contact.warn": "Keine E-Mail, Telefonnummer und kein Kontakt-Button gefunden.", "contact.fix": "Ergänzen Sie E-Mail, Telefonnummer oder einen Kontakt-Button.",
    "fresh.t": "Kürzlich aktiv", "fresh.pass": "Letzter Beitrag vor {days} Tagen.", "fresh.warn": "Letzter Beitrag vor {days} Tagen. Inaktiv wirkenden Kanälen wird weniger vertraut.", "fresh.fail": "Letzter Beitrag vor {days} Tagen. Der Kanal wirkt verlassen.", "fresh.info": "Auf dieser Seite sind keine Beitragsdaten sichtbar.", "fresh.fix": "Posten Sie mindestens einmal im Monat, oder sagen Sie in der Bio, wo es Aktuelles gibt.",
    "posts.t": "Beiträge enthalten echten Text", "posts.pass": "Beiträge enthalten echten Text (etwa {n} Wörter).", "posts.warn": "Beiträge enthalten wenig Text (etwa {n} Wörter) oder vor allem Hashtags. KI kann kein Bild zitieren.", "posts.info": "Auf dieser Seite sind keine Beitragstexte sichtbar.", "posts.fix": "Schreiben Sie pro Beitrag 1 bis 3 klare Sätze: was, wer, wo, wann. Wenige Hashtags.",
    "verified.t": "Verifizierungs-Abzeichen", "verified.info": "{v}", "verified.yes": "Der Kanal zeigt ein Verifizierungs-Abzeichen.", "verified.no": "Kein Verifizierungs-Abzeichen. Nicht nötig, aber es stärkt das Vertrauen."
  },
  fr: {
    "f.banner.none": "Contrôlez la page de cet onglet.",
    "f.banner": "Sada affiche {shown}. Vous êtes maintenant sur un autre onglet.",
    "f.banner.new": "Vous êtes maintenant sur {host}.",
    "f.update": "Mettre à jour pour cet onglet",
    "f.perm": "Chrome ne laisse Sada lire un nouvel onglet qu'après un clic sur l'icône Sada dans la barre d'outils, ou une fois Sada autorisé sur tous les sites.",
    "f.declined": "Autorisation refusée. Cliquez sur l'icône Sada dans la barre d'outils lorsque vous êtes sur cette page, ou cliquez à nouveau sur « Autoriser et mettre à jour » pour autoriser tous les sites.",
    "f.allow": "Autoriser sur tous les sites",
    "f.internal": "Sada ne peut pas lire les pages du navigateur comme celle-ci. Ouvrez un site web.",
    "f.refresh": "Mettre à jour pour l'onglet actuel",
    "safe.h": "Autorisation sans risque",
    "safe.1": "Fonctionne uniquement sur cet ordinateur. Il n'y a pas de serveur Sada : rien sur vous ni sur votre navigation ne part vers AYKA ou ailleurs. Pas de compte, pas de suivi.",
    "safe.2": "Lecture seule : Sada ne clique pas, ne tape rien, ne se connecte nulle part et ne modifie aucun site.",
    "safe.3": "Lit seulement l'onglet que vous regardez, jamais vos autres onglets. La veille, si vous l'activez, relit seulement votre propre site et vos pages publiques, sans connexion.",
    "safe.4": "Vous gardez la main : désactivez « Suivre l'onglet actif » dans les réglages, ou retirez l'accès dans Chrome à tout moment (Extensions → Sada → Détails → Accès aux sites).",
    "safe.chrome": "Chrome affichera son avertissement standard selon lequel l'extension peut « lire et modifier toutes vos données sur tous les sites ». Chrome utilise cette formulation pour toute extension ayant accès aux sites. Sada ne fait que lire ; la carte de chaleur facultative ajoute seulement un surlignage temporaire sur votre écran.",
    "safe.go": "Autoriser et mettre à jour",
    "safe.proof": "Voir la preuve",
    "safe.badge": "Privé",
    "set.follow": "Suivre l'onglet actif",
    "set.follow.d": "Quand Sada peut lire l'onglet, il se met à jour tout seul quand vous changez d'onglet ou ouvrez une page. Les onglets des assistants IA sont ignorés.",
    "public.private": "Ce compte est privé. Les robots et les assistants IA n'en voient rien.",
    "public.unconfirmed": "{platform} n'a pas montré cette page à la requête déconnectée de Sada (statut {status}). Les plateformes refusent souvent les requêtes répétées : ce n'est pas la preuve que les robots sont bloqués. Pour en être sûr, ouvrez la page dans une fenêtre privée.",
    "s.compare": "Lire {domain} et comparer",
    "s.compare.d": "Chrome demande une fois l'autorisation de lire ce seul site. Sada lit sa page d'accueil sur cet ordinateur.",
    "s.compare.fail": "Sada n'a pas pu lire {domain}. L'adresse redirige peut-être : ouvrez votre site dans un onglet et cliquez une fois sur l'icône Sada.",
    "s.compare.run": "Lecture de {domain}…",
    "s.st.blocked": "Bloqué",
    "s.st.searchonly": "Recherche seule",
    "s.private.site": "Lu sur cet ordinateur : cette page, sa version déconnectée, le robots.txt public de {platform} et le site {site}. Rien n'a été envoyé nulle part.",
    "crawl.platform": "C'est un réglage de {platform} ; il ne compte pas dans votre score.",
    "snippet.platform": "{platform} montre ici aux robots son propre texte standard (« {snip} »), pas votre bio. Vous ne pouvez pas le changer ; cela ne compte pas dans votre score. Veillez à un nom clair et à une description complète sur votre site.",
    "s.linked.listed": "Comparé avec {site} : ce site renvoie vers la chaîne.",
    "s.linked.domain": "Comparé avec {site} : le site vers lequel renvoie cette chaîne.",
    "s.linked.name": "Comparé avec {site} (même nom, non confirmé par un lien).",
    "s.reading": "Lecture de {domain}, le site vers lequel renvoie cette chaîne…",
    "crawl.failai": "Les moteurs de recherche peuvent lire la page, mais {platform} bloque tous les assistants IA : {blocked}.",
    "nav.social": "Compte",
    "s.title": "Contrôle du compte {platform}",
    "s.lead": "Les assistants IA et les moteurs de recherche peuvent-ils lire ce compte, comprendre qui le gère et le relier à votre site ?",
    "s.post": "Ceci est une publication isolée. Sada vérifie ce que les robots en lisent. Ouvrez la page de profil pour le contrôle complet.",
    "s.other": "Cette page {platform} n'est pas un profil. Ouvrez un profil, une page entreprise ou une chaîne.",
    "s.scan": "Contrôler ce compte", "s.rescan": "Contrôler à nouveau", "s.scanning": "Lecture du compte…",
    "s.linked": "Comparé avec votre site {site}", "s.nosite": "Aucun site relié pour l'instant. Ouvrez votre site et lancez Sada une fois : ce contrôle comparera aussi noms, lieux et liens.",
    "s.auto.t": "Contrôler les réseaux sociaux automatiquement", "s.auto.d": "Quand ce panneau est ouvert et que vous ouvrez un profil Instagram, Facebook, LinkedIn, X, YouTube, TikTok, Threads, Pinterest, Bluesky ou XING, Sada le contrôle. Chrome vous demande une fois l'autorisation de lire ces sites.",
    "s.auto.on": "Activé", "s.auto.off": "Activer",
    "s.bio.t": "Bio suggérée", "s.bio.d": "{n} sur {max} caractères sur {platform}. Vérifiez chaque information avant de l'utiliser.",
    "s.private": "Lu sur cet ordinateur : cette page, sa version déconnectée et le robots.txt public de {platform}. Rien n'a été envoyé.",
    "s.err.perm": "Sada a besoin d'autorisation pour lire cette page. Cliquez sur l'icône Sada dans cet onglet, ou activez les contrôles automatiques ci-dessous.",
    "s.err.read": "Sada n'a pas pu lire cette page. Rechargez-la, attendez que le profil s'affiche, puis contrôlez à nouveau.",
    "s.guard": "Audit et Ask AI fonctionnent sur des sites web. Cet onglet affiche une page {platform}.", "s.guard.back": "Retour au contrôle du compte",
    "s.seen": "Ce que Sada a lu", "s.seen.name": "Nom", "s.seen.bio": "Bio", "s.seen.link": "Liens",
    "s.st.pass": "Bien", "s.st.warn": "À améliorer", "s.st.fail": "Manquant", "s.st.info": "Note",
    "crawl.t": "Les robots IA et de recherche peuvent lire {platform}", "crawl.pass": "Le robots.txt de {platform} autorise ces robots à lire la page : {list}.", "crawl.warn": "Les moteurs de recherche peuvent lire la page, mais {platform} bloque certains assistants IA : {blocked}.", "crawl.fail": "{platform} bloque les moteurs de recherche ou tous les assistants IA sur cette page : {blocked}.", "crawl.info": "Sada n'a pas pu lire le robots.txt de {platform}.", "crawl.fix": "Vous ne pouvez pas changer les règles de {platform}. Mettez vos informations clés sur votre site et sur des comptes que l'IA peut lire, et reliez-les entre eux.",
    "public.t": "Visible sans connexion", "public.pass": "Un visiteur déconnecté, comme un robot, voit « {seen} ».", "public.warn": "Un visiteur déconnecté ne voit qu'un titre générique : « {seen} ».", "public.fail": "Un visiteur déconnecté est renvoyé vers une page de connexion. Les robots ne voient rien de ce compte.", "public.info": "Sada n'a pas pu charger la version déconnectée.", "public.fix": "Rendez le profil public. Sur Facebook, utilisez une Page plutôt qu'un profil personnel.",
    "snippet.t": "Texte d'aperçu pour les robots", "snippet.pass": "Le texte d'aperçu vous décrit : « {snip} ».", "snippet.warn": "Le texte d'aperçu est générique : « {snip} ». Votre bio n'y figure pas.", "snippet.fail": "Il n'y a pas de texte d'aperçu pour les robots.", "snippet.info": "Texte d'aperçu non vérifié.", "snippet.fix": "Faites de la première ligne de votre bio une phrase simple : qui, quoi, où. Les plateformes la reprennent souvent comme aperçu.",
    "name.t": "Même nom que votre site", "name.pass": "« {name} » correspond au nom de votre site.", "name.warn": "Le compte affiche « {name} », votre site dit « {site} ». L'IA peut y voir deux organisations.", "name.info": "Le compte s'appelle « {name} ».", "name.fix": "Utilisez le même nom que sur votre site. Mettez l'abréviation dans la bio.",
    "bio.t": "La bio dit ce que vous êtes", "bio.pass": "La bio dit ce que vous êtes (« {what} ») en {n} caractères.", "bio.warn": "La bio ({n} caractères) ne dit pas clairement ce que vous êtes, ou n'est faite que de hashtags et d'emoji.", "bio.fail": "Il n'y a pas de bio.", "bio.fix": "Commencez par une phrase simple : nom, ce que vous êtes, pour qui, où. Voir la suggestion ci-dessous.",
    "place.t": "Dit où vous êtes", "place.pass": "Le compte indique votre lieu : {place}.", "place.warn": "Le compte ne dit pas où vous êtes ({place} sur votre site).", "place.info": "Aucun lieu trouvé. Si l'on vous cherche localement, ajoutez votre ville.", "place.fix": "Ajoutez ville et pays dans la bio ou le champ de localisation.",
    "link.t": "Renvoie vers votre site", "link.pass": "Le compte renvoie vers {link}.", "link.warn": "Le compte renvoie vers {link}, pas vers votre site {site}.", "link.fail": "Le compte n'a pas de lien vers un site.", "link.fix": "Mettez votre propre domaine en lien principal. L'IA s'en sert pour relier ce compte à votre site.", "link.agg": "Les pages « link in bio » cachent votre site aux robots.",
    "backlink.t": "Votre site renvoie ici", "backlink.pass": "{site} cite ce compte dans ses données structurées (sameAs).", "backlink.warn": "{site} renvoie vers ce compte, mais pas dans ses données structurées (sameAs).", "backlink.fail": "{site} ne renvoie pas vers ce compte.", "backlink.info": "Ouvrez votre site une fois avec Sada pour le vérifier.", "backlink.fix": "Ajoutez l'adresse de ce compte à la liste sameAs de votre balisage Organization et mettez le lien dans le pied de page. Le pack de corrections de l'onglet Agent écrit le code.",
    "contact.t": "Facile à joindre", "contact.pass": "On peut vous joindre d'ici ({how}).", "contact.warn": "Aucun e-mail, téléphone ni bouton de contact trouvé.", "contact.fix": "Ajoutez un e-mail, un numéro ou un bouton de contact.",
    "fresh.t": "Actif récemment", "fresh.pass": "Dernière publication il y a {days} jours.", "fresh.warn": "Dernière publication il y a {days} jours. Un compte qui semble inactif inspire moins confiance.", "fresh.fail": "Dernière publication il y a {days} jours. Le compte semble abandonné.", "fresh.info": "Aucune date de publication visible sur cette page.", "fresh.fix": "Publiez au moins une fois par mois, ou indiquez dans la bio où trouver l'actualité.",
    "posts.t": "Les publications contiennent du texte", "posts.pass": "Les publications contiennent du vrai texte (environ {n} mots).", "posts.warn": "Les publications contiennent peu de texte (environ {n} mots) ou surtout des hashtags. L'IA ne peut pas citer une image.", "posts.info": "Aucun texte de publication visible sur cette page.", "posts.fix": "Écrivez 1 à 3 phrases simples par publication : quoi, qui, où, quand. Peu de hashtags.",
    "verified.t": "Badge vérifié", "verified.info": "{v}", "verified.yes": "Le compte affiche un badge vérifié.", "verified.no": "Pas de badge vérifié. Pas obligatoire, mais il renforce la confiance."
  },
  ar: {
    "f.banner.none": "افحص الصفحة في هذا التبويب.",
    "f.banner": "يعرض صدى {shown}. أنت الآن في تبويب آخر.",
    "f.banner.new": "أنت الآن على {host}.",
    "f.update": "حدّث لهذا التبويب",
    "f.perm": "لا يسمح Chrome لصدى بقراءة تبويب جديد إلا بعد النقر على أيقونة صدى في شريط الأدوات، أو بعد السماح لصدى بكل المواقع مرة واحدة.",
    "f.declined": "لم يُمنح الإذن. انقر على أيقونة صدى في شريط أدوات المتصفح وأنت على هذه الصفحة، أو انقر على «اسمح وحدّث» مجددًا للسماح بكل المواقع.",
    "f.allow": "اسمح على كل المواقع",
    "f.internal": "لا يستطيع صدى قراءة صفحات المتصفح مثل هذه. افتح موقعًا.",
    "f.refresh": "حدّث للتبويب الحالي",
    "safe.h": "آمن للسماح",
    "safe.1": "يعمل على هذا الجهاز فقط. لا يوجد خادم لصدى: لا يُرسل شيء عنك أو عن تصفحك إلى AYKA أو إلى أي جهة. لا حساب ولا تتبّع.",
    "safe.2": "قراءة فقط: لا ينقر صدى ولا يكتب ولا يسجّل الدخول ولا يغيّر أي موقع.",
    "safe.3": "يقرأ التبويب الذي تنظر إليه فقط، ولا يقرأ تبويباتك الأخرى. وإن فعّلت المراقبة فهي تعيد قراءة موقعك وصفحات قنواتك العامة فقط، دون تسجيل دخول.",
    "safe.4": "التحكم بيدك: أوقف «تتبّع التبويب النشط» في الإعدادات، أو أزل الإذن من Chrome في أي وقت (الإضافات ← صدى ← التفاصيل ← الوصول إلى المواقع).",
    "safe.chrome": "سيعرض Chrome تحذيره المعتاد بأن الإضافة يمكنها قراءة بياناتك وتغييرها على جميع المواقع. يستخدم Chrome هذه الصيغة لكل إضافة لها وصول إلى المواقع. صدى يقرأ فقط، وخريطة الحرارة الاختيارية تضيف تمييزًا مؤقتًا على شاشتك فقط.",
    "safe.go": "اسمح وحدّث",
    "safe.proof": "شاهد الدليل",
    "safe.badge": "خاص",
    "set.follow": "اتبع التبويب النشط",
    "set.follow.d": "عندما يُسمح لصدى بقراءة التبويب، يتحدّث تلقائيًا عند تغيير التبويب أو فتح صفحة جديدة. تُتجاهل تبويبات مساعدات الذكاء الاصطناعي.",
    "public.private": "هذا الحساب خاص. لا ترى الروبوتات ولا مساعدات الذكاء الاصطناعي شيئًا منه.",
    "public.unconfirmed": "لم يعرض {platform} هذه الصفحة لطلب صدى دون تسجيل دخول (الحالة {status}). كثيرًا ما ترفض المنصات الطلبات المتكررة، فهذا ليس دليلًا على حجب الروبوتات. للتأكد، افتح الصفحة في نافذة خاصة.",
    "s.compare": "اقرأ {domain} وقارن",
    "s.compare.d": "سيطلب Chrome مرة واحدة إذنًا لقراءة هذا الموقع فقط. يقرأ صدى صفحته الرئيسية على هذا الجهاز.",
    "s.compare.fail": "تعذّرت قراءة {domain}. ربما يحوّل إلى عنوان آخر: افتح موقعك في تبويب وانقر على أيقونة صدى مرة واحدة.",
    "s.compare.run": "جارٍ قراءة {domain}…",
    "s.st.blocked": "محجوب",
    "s.st.searchonly": "البحث فقط",
    "s.private.site": "قُرئ على هذا الجهاز: هذه الصفحة ونسختها دون تسجيل دخول وملف robots.txt العام لـ {platform} والموقع {site}. لم يُرسل أي شيء إلى أي مكان.",
    "crawl.platform": "هذا إعداد خاص بـ {platform} ولا يُحتسب في نتيجتك.",
    "snippet.platform": "يعرض {platform} للزواحف هنا نصه القياسي («{snip}») وليس نبذتك. لا يمكنك تغيير ذلك، ولا يُحتسب في نتيجتك. احرص على اسم واضح وعلى وصف كامل في موقعك.",
    "s.linked.listed": "مقارنة مع {site}: هذا الموقع يربط بالقناة.",
    "s.linked.domain": "مقارنة مع {site}: الموقع الذي تربط به هذه القناة.",
    "s.linked.name": "مقارنة مع {site} (الاسم نفسه، دون تأكيد برابط).",
    "s.reading": "جارٍ قراءة {domain}، الموقع الذي تربط به هذه القناة…",
    "crawl.failai": "يمكن لمحركات البحث قراءة الصفحة، لكن {platform} يحجب كل مساعدات الذكاء الاصطناعي: {blocked}.",
    "nav.social": "الحساب",
    "s.title": "فحص حساب {platform}",
    "s.lead": "هل تستطيع مساعدات الذكاء الاصطناعي ومحركات البحث قراءة هذا الحساب، ومعرفة من يديره، وربطه بموقعك؟",
    "s.post": "هذا منشور منفرد. يفحص صدى ما تقرؤه الروبوتات منه. افتح صفحة الحساب للفحص الكامل.",
    "s.other": "صفحة {platform} هذه ليست حسابًا. افتح صفحة حساب أو شركة أو قناة.",
    "s.scan": "افحص هذا الحساب", "s.rescan": "افحص مجددًا", "s.scanning": "جارٍ قراءة الحساب…",
    "s.linked": "مقارنة مع موقعك {site}", "s.nosite": "لم يُربط أي موقع بعد. افتح موقعك وشغّل صدى مرة واحدة: سيقارن هذا الفحص الأسماء والأماكن والروابط أيضًا.",
    "s.auto.t": "افحص حسابات التواصل تلقائيًا", "s.auto.d": "عندما تكون هذه اللوحة مفتوحة وتفتح حسابًا على Instagram أو Facebook أو LinkedIn أو X أو YouTube أو TikTok أو Threads أو Pinterest أو Bluesky أو XING، يفحصه صدى. سيطلب Chrome الإذن مرة واحدة لقراءة هذه المواقع.",
    "s.auto.on": "مفعّل", "s.auto.off": "تفعيل",
    "s.bio.t": "نبذة مقترحة", "s.bio.d": "{n} من {max} حرفًا على {platform}. تحقّق من كل معلومة قبل استخدامها.",
    "s.private": "قُرئ على هذا الجهاز: هذه الصفحة، ونسختها دون تسجيل دخول، وملف robots.txt العام لـ{platform}. لم يُرسل أي شيء.",
    "s.err.perm": "يحتاج صدى إلى إذن لقراءة هذه الصفحة. انقر على أيقونة صدى في هذا التبويب، أو فعّل الفحص التلقائي أدناه.",
    "s.err.read": "تعذّرت قراءة هذه الصفحة. أعد تحميلها، وانتظر ظهور الحساب، ثم افحص مجددًا.",
    "s.guard": "التدقيق واسأل الذكاء الاصطناعي يعملان على المواقع. هذا التبويب يعرض صفحة {platform}.", "s.guard.back": "العودة إلى فحص الحساب",
    "s.seen": "ما قرأه صدى", "s.seen.name": "الاسم", "s.seen.bio": "النبذة", "s.seen.link": "الروابط",
    "s.st.pass": "جيد", "s.st.warn": "يحتاج تحسينًا", "s.st.fail": "غائب", "s.st.info": "ملاحظة",
    "crawl.t": "يمكن لروبوتات البحث والذكاء الاصطناعي قراءة {platform}", "crawl.pass": "يسمح robots.txt لـ{platform} لهذه الروبوتات بقراءة الصفحة: {list}.", "crawl.warn": "يمكن لمحركات البحث قراءة الصفحة، لكن {platform} يحجب بعض مساعدات الذكاء الاصطناعي: {blocked}.", "crawl.fail": "{platform} يحجب محركات البحث أو كل مساعدات الذكاء الاصطناعي عن هذه الصفحة: {blocked}.", "crawl.info": "تعذّرت قراءة robots.txt لـ{platform}.", "crawl.fix": "لا يمكنك تغيير قواعد {platform}. ضع معلوماتك الأساسية على موقعك وعلى حسابات يقرؤها الذكاء الاصطناعي، واربط بينها.",
    "public.t": "مرئي دون تسجيل دخول", "public.pass": "يرى الزائر غير المسجّل، مثل الروبوت: «{seen}».", "public.warn": "يرى الزائر غير المسجّل عنوانًا عامًا فقط: «{seen}».", "public.fail": "يُحوَّل الزائر غير المسجّل إلى صفحة تسجيل الدخول. لا ترى الروبوتات شيئًا من هذا الحساب.", "public.info": "تعذّر تحميل النسخة دون تسجيل دخول.", "public.fix": "اجعل الحساب عامًا. على Facebook استخدم صفحة لا حسابًا شخصيًا.",
    "snippet.t": "نص المعاينة الذي تراه الروبوتات", "snippet.pass": "نص المعاينة يصفك: «{snip}».", "snippet.warn": "نص المعاينة عام: «{snip}». نبذتك ليست فيه.", "snippet.fail": "لا يوجد نص معاينة للروبوتات.", "snippet.info": "لم يُفحص نص المعاينة.", "snippet.fix": "اجعل السطر الأول من نبذتك جملة واضحة: من أنت، وماذا تفعل، وأين. كثيرًا ما تستخدمه المنصات كنص معاينة.",
    "name.t": "الاسم نفسه كما في موقعك", "name.pass": "«{name}» يطابق اسم موقعك.", "name.warn": "يظهر الحساب باسم «{name}» وموقعك باسم «{site}». قد يعتبرهما الذكاء الاصطناعي جهتين مختلفتين.", "name.info": "اسم الحساب: «{name}».", "name.fix": "استخدم الاسم نفسه الموجود على موقعك، وضع الاختصار في النبذة.",
    "bio.t": "النبذة تقول ما أنت", "bio.pass": "النبذة تذكر ما أنت («{what}») في {n} حرفًا.", "bio.warn": "النبذة ({n} حرفًا) لا تقول بوضوح ما أنت، أو معظمها وسوم ورموز تعبيرية.", "bio.fail": "لا توجد نبذة.", "bio.fix": "ابدأ بجملة واضحة: الاسم، ما أنت، لمن، وأين. انظر الاقتراح أدناه.",
    "place.t": "يذكر مكانك", "place.pass": "يذكر الحساب مكانك: {place}.", "place.warn": "لا يذكر الحساب مكانك (على موقعك: {place}).", "place.info": "لم يُعثر على مكان. إن كان الناس يبحثون عنك محليًا، أضف مدينتك.", "place.fix": "أضف المدينة والبلد في النبذة أو في خانة الموقع.",
    "link.t": "يربط بموقعك", "link.pass": "يربط الحساب بـ{link}.", "link.warn": "يربط الحساب بـ{link} لا بموقعك {site}.", "link.fail": "لا يوجد رابط لموقع.", "link.fix": "اجعل نطاقك الخاص هو الرابط الرئيسي. يستخدمه الذكاء الاصطناعي لربط الحساب بموقعك.", "link.agg": "صفحات «الرابط في النبذة» تخفي موقعك عن الروبوتات.",
    "backlink.t": "موقعك يربط بهذا الحساب", "backlink.pass": "يذكر {site} هذا الحساب في بياناته المنظّمة (sameAs).", "backlink.warn": "يربط {site} بهذا الحساب، لكن ليس في بياناته المنظّمة (sameAs).", "backlink.fail": "لا يربط {site} بهذا الحساب.", "backlink.info": "افتح موقعك مرة مع صدى للتحقق من ذلك.", "backlink.fix": "أضف عنوان هذا الحساب إلى قائمة sameAs في ترميز Organization وضع الرابط في تذييل الموقع. حزمة الإصلاح في تبويب الوكيل تكتب الكود.",
    "contact.t": "سهل التواصل", "contact.pass": "يمكن التواصل معك من هنا ({how}).", "contact.warn": "لا بريد ولا هاتف ولا زر تواصل.", "contact.fix": "أضف بريدًا إلكترونيًا أو رقم هاتف أو زر تواصل.",
    "fresh.t": "نشِط مؤخرًا", "fresh.pass": "آخر منشور قبل {days} يومًا.", "fresh.warn": "آخر منشور قبل {days} يومًا. الحسابات التي تبدو خاملة تحظى بثقة أقل.", "fresh.fail": "آخر منشور قبل {days} يومًا. يبدو الحساب مهجورًا.", "fresh.info": "لا تظهر تواريخ منشورات في هذه الصفحة.", "fresh.fix": "انشر مرة في الشهر على الأقل، أو اذكر في النبذة أين يجد الناس الأخبار.",
    "posts.t": "المنشورات تحمل نصًا", "posts.pass": "المنشورات تحمل نصًا حقيقيًا (نحو {n} كلمة).", "posts.warn": "المنشورات قليلة النص (نحو {n} كلمة) أو معظمها وسوم. لا يستطيع الذكاء الاصطناعي اقتباس صورة.", "posts.info": "لا تظهر نصوص منشورات في هذه الصفحة.", "posts.fix": "اكتب جملة إلى ثلاث جمل واضحة في كل منشور: ماذا، من، أين، متى. وقلّل الوسوم.",
    "verified.t": "شارة التوثيق", "verified.info": "{v}", "verified.yes": "يعرض الحساب شارة توثيق.", "verified.no": "لا توجد شارة توثيق. ليست ضرورية لكنها تعزّز الثقة."
  }
};
