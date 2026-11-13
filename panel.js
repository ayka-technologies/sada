import ACA_EN from "./lib/academy/en.js";
import ACA_FR from "./lib/academy/fr.js";
import ACA_DE from "./lib/academy/de.js";
import ACA_AR from "./lib/academy/ar.js";
import { SOURCES as ACA_SRC, RESEARCHED as ACA_DATE } from "./lib/academy/sources.js";
import { buildProfile, finalize } from "./lib/profile.js";
import { predict, aiPrompt } from "./lib/questions.js";
import { KINDS, KIND_LABEL, defaultSubFor } from "./lib/kinds.js";
import { RULES as SRULES, POST_PLATFORMS, PNAME, AI_LABEL, graphemes, countFor, keyUrl, composer, profileEdit, baseFromQuestion, baseFromPage, baseFromTopic, draftFor, checkDraft, profileKit, sameAsJsonLd, footerLinks, planSlots, postPrompt, bioPrompt, fitAiPost } from "./lib/studio.js";
import { STU_I18N } from "./lib/studio_i18n.js";
import { detectCms, CMS_NAME, cmsAdmin, cmsGuide } from "./lib/cms.js";
import { runWatch, mergeWatch, wt } from "./lib/watch.js";
import { SOCIAL_I18N, detectSocial, collectSocial, analyzeSocial, socialChannelsOf, suggestBio, sameOwner, SOCIAL_ORIGINS, PLATFORMS } from "./lib/social.js";
// packages/core/src/extract.ts
var PRONOUN_START = {
  en: /^(it|its|this|that|these|those|they|their|he|she|we|our|here|there)\b/i,
  fr: /^(il|elle|ils|elles|ce|cela|ça|cette|ces|nous|notre|on|ici)\b/i,
  de: /^(es|er|sie|dies|diese|dieser|dieses|das|wir|unser|hier|dort)\b/i,
  ar: /^(هذا|هذه|ذلك|تلك|هو|هي|هم|نحن|هنا|هناك)(?=\s|$)/
};
var DEFINES = /\b(is|are|was|offers?|provides?|means|costs?|est|sont|propose|offre|signifie|coûte|ist|sind|bietet|bedeutet|kostet)\b|(?:^|\s)(يقدم|تقدم|يعني|تعني|هو|هي|يبلغ|تبلغ|يقع|تقع)(?=\s)/i;
var SPECIFIC = /\d|%|€|\$|£|\b(km|kg|min|h)\b/i;
function words(s) {
  return (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
}
function scoreSentence(text, lang) {
  const t2 = text.trim();
  const reasons = [];
  let score2 = 0;
  const n = words(t2);
  if (n >= 8 && n <= 35) {
    score2++;
    reasons.push("length");
  }
  const proper = /\s[A-ZÀ-ÖØ-Þ][\p{L}]{2,}/u.test(" " + t2.slice(1));
  if (SPECIFIC.test(t2) || proper) {
    score2++;
    reasons.push("specific");
  }
  const lg = (lang || "en").slice(0, 2);
  if (!(PRONOUN_START[lg] || PRONOUN_START.en).test(t2)) {
    score2++;
    reasons.push("standalone");
  }
  if (DEFINES.test(t2)) {
    score2++;
    reasons.push("states");
  }
  return { text: t2, score: score2, quotable: score2 >= 4 || score2 === 3 && reasons.includes("specific") && reasons.includes("length"), reasons };
}
var SEG = (() => {
  try {
    return new Intl.Segmenter(void 0, { granularity: "sentence" });
  } catch {
    return null;
  }
})();
function splitSentences(text) {
  const t2 = text.replace(/\s+/g, " ").trim();
  // the same sentence rules as the on-page highlighter ("llms.txt" and "e.g." do not end a sentence)
  const parts = SEG ? Array.from(SEG.segment(t2), (x) => x.segment.trim()) : (t2.match(/[^.!?؟؛。]+[.!?؟؛。]+["”’»)]*|[^.!?؟؛。]+$/g) || []).map((s) => s.trim());
  const out = [];
  // a piece that starts in lower case continues the sentence before it (‘…asks “Where?” and the AI answers…’)
  // so does one after an abbreviation ("ca. 5 €", "z.B. Kunst")
  const ABBR = /(?:^|[\s(])(?:ca|bzw|usw|vgl|ggf|inkl|zzgl|evtl|Nr|Dr|Prof|St|Str|Mr|Mrs|Ms|Mme|env|av|approx|vs|(?:\p{L}\.)+\p{L})\.$/u;
  for (const x of parts) if (out.length && (/^[\p{Ll}"“”'’]?\p{Ll}/u.test(x) || ABBR.test(out[out.length - 1]))) out[out.length - 1] += " " + x; else if (x) out.push(x);
  return out.filter((s) => words(s) >= 4);
}
function clean(s) {
  return (s || "").replace(/\s+/g, " ").trim();
}
function typesOf(node, out) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => typesOf(n, out));
    return;
  }
  const t2 = node["@type"];
  if (t2) (Array.isArray(t2) ? t2 : [t2]).forEach((x) => typeof x === "string" && out.push(x));
  if (node["@graph"]) typesOf(node["@graph"], out);
  for (const k of Object.keys(node)) if (k !== "@graph" && typeof node[k] === "object") typesOf(node[k], out);
}
function flatNodes(blocks) {
  const out = [];
  const walk = (n) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (n["@type"]) out.push(n);
    if (n["@graph"]) walk(n["@graph"]);
  };
  blocks.forEach((b) => b.nodes.forEach(walk));
  return out;
}
var SOURCE_HOSTS = /(\.gov|\.gouv|\.edu|\.int|europa\.eu|wikipedia\.org|wikidata\.org|who\.int|oecd\.org|ec\.europa|destatis|insee\.fr|ins\.tn|developers\.google|support\.google|schema\.org|w3\.org|ietf\.org|doi\.org|arxiv\.org|nature\.com|statista)/i;
function mainRoot(doc) {
  return doc.querySelector("main") || doc.querySelector("article") || doc.querySelector('[role="main"]') || doc.body || doc.documentElement;
}
function visibleText(root) {
  const clone = root.cloneNode(true);
  clone.querySelectorAll("script,style,noscript,template,svg,nav,header,footer,aside,form,[hidden],[aria-hidden='true']").forEach((e2) => e2.remove());
  return clean(clone.textContent);
}
function extract(doc, input2, parseRaw) {
  const u = new URL(input2.url);
  const html = doc.documentElement;
  const lang = clean(html.getAttribute("lang")) || "";
  const dir = clean(html.getAttribute("dir")) || "";
  const meta = (name) => clean(doc.querySelector(`meta[name="${name}" i]`)?.getAttribute("content"));
  const metaRobots = [meta("robots"), meta("googlebot")].filter(Boolean).flatMap((v) => v.toLowerCase().split(/\s*,\s*/));
  const xr = (input2.headers?.["x-robots-tag"] || "").toLowerCase();
  const xRobots = xr ? xr.split(/\s*,\s*/) : [];
  const root = mainRoot(doc);
  const text = visibleText(root);
  const headings = Array.from(doc.querySelectorAll("h1,h2,h3,h4")).map((h) => ({ level: Number(h.tagName[1]), text: clean(h.textContent) })).filter((h) => h.text);
  // a row of buttons or links ("Get your free check  Explore the lab") is navigation, not a sentence anyone can quote
  const linky = (el) => {
    const all = clean(el.textContent).length;
    const inLinks = Array.from(el.querySelectorAll("a,button")).reduce((n, a) => n + clean(a.textContent).length, 0);
    return all > 0 && inLinks / all > 0.6;
  };
  const paragraphs = Array.from(root.querySelectorAll("p,li,dd,blockquote")).filter((p) => !p.closest("nav,header,footer,aside,form") && !linky(p)).map((p) => clean(p.textContent)).filter((p) => p.length >= 40);
  const h1 = root.querySelector("h1") || doc.querySelector("h1");
  let firstParagraph = "";
  if (h1) {
    const all = Array.from(doc.querySelectorAll("h1, p"));
    const i = all.indexOf(h1);
    firstParagraph = clean(all.slice(i + 1).find((e2) => e2.tagName === "P" && clean(e2.textContent).length >= 30)?.textContent);
  }
  if (!firstParagraph) firstParagraph = paragraphs[0] || "";
  const jsonld = Array.from(doc.querySelectorAll('script[type="application/ld+json" i]')).map((s) => {
    const raw = (s.textContent || "").trim();
    try {
      const d = JSON.parse(raw);
      return { ok: true, nodes: Array.isArray(d) ? d : [d] };
    } catch (e2) {
      return { ok: false, error: String(e2 && e2.message || e2).slice(0, 160), nodes: [] };
    }
  });
  const types = [];
  jsonld.forEach((b) => typesOf(b.nodes, types));
  const hreflangs = Array.from(doc.querySelectorAll('link[rel="alternate" i][hreflang]')).map((l) => ({
    lang: clean(l.getAttribute("hreflang")).toLowerCase(),
    href: clean(l.getAttribute("href"))
  }));
  const imgs = Array.from(root.querySelectorAll("img")).filter((i) => !/^data:/.test(i.getAttribute("src") || "") || (i.getAttribute("alt") || "").length);
  const links = { internal: 0, external: 0, sources: 0 };
  root.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (/^(#|mailto:|tel:|javascript:)/i.test(href)) return;
    try {
      const t2 = new URL(href, input2.url);
      if (t2.host === u.host) links.internal++;
      else {
        links.external++;
        if (SOURCE_HOSTS.test(t2.host) || a.closest("cite,blockquote,sup,footer[class*=source],[class*=source],[class*=reference]")) links.sources++;
      }
    } catch {
    }
  });
  const forms = Array.from(doc.querySelectorAll("form")).map((f2) => {
    const blob = clean(`${f2.getAttribute("id") || ""} ${f2.getAttribute("name") || ""} ${f2.getAttribute("action") || ""} ${f2.getAttribute("aria-label") || ""} ${f2.querySelector("button,[type=submit]")?.textContent || ""}`).toLowerCase();
    const purpose = /search|recherche|suche|بحث/.test(blob) ? "search" : /book|reserv|termin|booking|حجز/.test(blob) ? "booking" : /contact|kontakt|enquir|quote|devis|angebot|تواصل|اتصل/.test(blob) ? "contact" : /newsletter|subscribe|abonn/.test(blob) ? "newsletter" : "other";
    return {
      action: f2.getAttribute("action") || "",
      method: (f2.getAttribute("method") || "get").toLowerCase(),
      toolname: f2.getAttribute("toolname") || "",
      fields: f2.querySelectorAll("input:not([type=hidden]),select,textarea").length,
      purpose
    };
  });
  const times = [
    ...Array.from(doc.querySelectorAll("time[datetime]")).map((t2) => t2.getAttribute("datetime") || ""),
    meta("article:modified_time"),
    clean(doc.querySelector('meta[property="article:modified_time"]')?.getAttribute("content")),
    clean(doc.querySelector('meta[property="article:published_time"]')?.getAttribute("content"))
  ].filter(Boolean);
  for (const n of flatNodes(jsonld)) for (const k of ["dateModified", "datePublished"]) if (typeof n[k] === "string") times.push(n[k]);
  const langCode = (lang || "en").slice(0, 2).toLowerCase();
  const sentences = paragraphs.flatMap(splitSentences).slice(0, 400).map((s) => scoreSentence(s, langCode));
  let rawWords = null;
  if (input2.rawHtml && parseRaw) {
    try {
      rawWords = words(visibleText(mainRoot(parseRaw(input2.rawHtml))));
    } catch {
      rawWords = null;
    }
  }
  return {
    url: input2.url,
    origin: u.origin,
    path: u.pathname + u.search,
    lang,
    dir,
    title: clean(doc.querySelector("title")?.textContent),
    siteName: clean(doc.querySelector('meta[property="og:site_name"]')?.getAttribute("content")),
    metaDescription: meta("description"),
    metaRobots,
    xRobots,
    canonical: clean(doc.querySelector('link[rel="canonical" i]')?.getAttribute("href")),
    viewport: !!doc.querySelector('meta[name="viewport" i]'),
    h1s: headings.filter((h) => h.level === 1).map((h) => h.text),
    headings,
    paragraphs,
    firstParagraph,
    text,
    words: words(text),
    rawWords,
    sentences,
    jsonld,
    types: Array.from(new Set(types)),
    hreflangs,
    images: { total: imgs.length, withAlt: imgs.filter((i) => clean(i.getAttribute("alt")).length > 0 || i.getAttribute("role") === "presentation").length },
    videos: root.querySelectorAll("video, iframe[src*='youtube'], iframe[src*='vimeo']").length,
    links,
    numbers: (text.match(/\b\d[\d.,]*\s?(%|€|\$|£|km|kg|years?|ans|jahre|stunden|hours?|min)?/gi) || []).length,
    forms,
    times,
    details: doc.querySelectorAll("details").length,
    questionHeadings: headings.filter((h) => h.level >= 2 && /[?؟]\s*$/.test(h.text)).length,
    mcpLink: !!doc.querySelector('link[rel="mcp" i], link[rel="alternate"][type*="mcp" i]'),
    priceSignals: (text.match(/(€|\$|£|EUR|USD|TND|AED|SAR|MAD|DT)\s?\d|\d[\d.,]*\s?(€|\$|£|EUR|USD|TND|AED|SAR|MAD|DT|د\.ت)/g) || []).length
  };
}

// packages/core/src/bots.ts
var BOTS = [
  { ua: "Googlebot", owner: "Google (Search, AI Overviews, AI Mode)", role: "search", source: "https://developers.google.com/search/docs/appearance/ai-features" },
  { ua: "Bingbot", owner: "Microsoft (Bing, Copilot)", role: "search", source: "https://www.bing.com/webmasters/help/which-crawlers-does-bing-use-8c184ec0" },
  { ua: "OAI-SearchBot", owner: "OpenAI (ChatGPT search)", role: "search", source: "https://platform.openai.com/docs/bots" },
  { ua: "ChatGPT-User", owner: "OpenAI (ChatGPT visits for a user)", role: "search", source: "https://platform.openai.com/docs/bots" },
  { ua: "PerplexityBot", owner: "Perplexity", role: "search", source: "https://docs.perplexity.ai/guides/bots" },
  { ua: "Perplexity-User", owner: "Perplexity (visits for a user)", role: "search", source: "https://docs.perplexity.ai/guides/bots" },
  { ua: "Claude-SearchBot", owner: "Anthropic (Claude search)", role: "search", source: "https://support.anthropic.com/en/articles/8896518" },
  { ua: "Claude-User", owner: "Anthropic (Claude visits for a user)", role: "search", source: "https://support.anthropic.com/en/articles/8896518" },
  { ua: "Applebot", owner: "Apple (Siri, Spotlight)", role: "search", source: "https://support.apple.com/en-us/119829" },
  { ua: "GPTBot", owner: "OpenAI (training)", role: "train", source: "https://platform.openai.com/docs/bots" },
  { ua: "ClaudeBot", owner: "Anthropic (training)", role: "train", source: "https://support.anthropic.com/en/articles/8896518" },
  { ua: "Google-Extended", owner: "Google (Gemini training; does not remove you from AI Mode)", role: "train", source: "https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers" },
  { ua: "Applebot-Extended", owner: "Apple (training)", role: "train", source: "https://support.apple.com/en-us/119829" },
  { ua: "CCBot", owner: "Common Crawl", role: "train", source: "https://commoncrawl.org/ccbot" },
  { ua: "meta-externalagent", owner: "Meta (training)", role: "train", source: "https://developers.facebook.com/docs/sharing/webmasters/web-crawlers" }
];
function parseRobots(text) {
  const groups = [];
  const signals2 = {};
  const sitemaps = [];
  let cur = null;
  let lastWasAgent = false;
  for (const raw of (text || "").split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === "user-agent") {
      if (!cur || !lastWasAgent) {
        cur = { agents: [], rules: [] };
        groups.push(cur);
      }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if ((key === "allow" || key === "disallow") && cur) {
      if (key === "disallow" && !val) continue;
      cur.rules.push({ allow: key === "allow", path: val });
    } else if (key === "content-signal") {
      for (const part of val.split(",")) {
        const [k, v] = part.split("=").map((s) => s.trim().toLowerCase());
        if (k && v) signals2[k] = v;
      }
    } else if (key === "sitemap") {
      sitemaps.push(val);
    }
  }
  return { groups, signals: signals2, sitemaps };
}
function ruleRx(path) {
  let p = path.replace(/[.+?^${}()|[\]\\]/g, (c) => c === "$" ? c : "\\" + c);
  const anchored = p.endsWith("$");
  if (anchored) p = p.slice(0, -1);
  p = p.replace(/\*/g, ".*");
  return new RegExp("^" + p + (anchored ? "$" : ""));
}
function allowed(robots, ua, path) {
  const name = ua.toLowerCase();
  let group = robots.groups.filter((g) => g.agents.some((a) => a !== "*" && a === name));
  if (!group.length) group = robots.groups.filter((g) => g.agents.includes("*"));
  if (!group.length) return true;
  const rules = group.flatMap((g) => g.rules);
  let best = null;
  for (const r of rules) {
    if (!ruleRx(r.path).test(path)) continue;
    const len = r.path.replace(/\*/g, "").length;
    if (!best || len > best.len || len === best.len && r.allow) best = { allow: r.allow, len };
  }
  return best ? best.allow : true;
}

// packages/core/src/rules.ts
var SRC = {
  googleAi: "https://developers.google.com/search/docs/appearance/ai-features",
  robots: "https://www.rfc-editor.org/rfc/rfc9309",
  snippet: "https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag",
  signals: "https://contentsignals.org/",
  cfCrawl: "https://blog.cloudflare.com/accountable-mixed-use-ai-crawlers",
  js: "https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics",
  title: "https://developers.google.com/search/docs/appearance/title-link",
  sd: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
  org: "https://developers.google.com/search/docs/appearance/structured-data/organization",
  hreflang: "https://developers.google.com/search/docs/specialty/international/localized-versions",
  geo: "https://arxiv.org/abs/2311.09735",
  helpful: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
  images: "https://developers.google.com/search/docs/appearance/google-images",
  webmcp: "https://github.com/webmachinelearning/webmcp",
  ucp: "https://blog.google/products/ads-commerce/agentic-commerce-ai-tools-protocol-retailers-platforms/",
  llms: "https://llmstxt.org/"
};
function f(id, category, evidence, status, lesson, source, vars = {}) {
  const points = status === "pass" ? 1 : status === "warn" ? 0.5 : status === "fail" ? 0 : null;
  return { id, category, evidence, status, lesson, source, vars, points: evidence === "optional" ? null : points };
}
var indexable = (m) => {
  const all = [...m.metaRobots, ...m.xRobots];
  const noindex = all.some((d) => d === "noindex" || d === "none");
  const nosnip = all.some((d) => d === "nosnippet" || /^max-snippet\s*:\s*0$/.test(d));
  let other = "";
  try {
    if (m.canonical && new URL(m.canonical, m.url).host !== new URL(m.url).host) other = new URL(m.canonical, m.url).host;
  } catch {
  }
  const status = noindex || nosnip ? "fail" : other ? "warn" : "pass";
  return f(
    "indexable",
    "access",
    "official",
    status,
    "l-index",
    SRC.googleAi,
    { reason: noindex ? "noindex" : nosnip ? "nosnippet" : other ? "canonical" : "", host: other }
  );
};
var aiBots = (m, i) => {
  if (!i.robots || i.robots.status >= 400 || !i.robots.text) {
    return f("ai-bots", "access", "official", "pass", "l-bots", SRC.robots, { blocked: "", training: "", none: 1 });
  }
  const r = parseRobots(i.robots.text);
  const path = m.path || "/";
  const blocked = BOTS.filter((b) => b.role === "search" && !allowed(r, b.ua, path)).map((b) => b.ua);
  const training = BOTS.filter((b) => b.role === "train" && !allowed(r, b.ua, path)).map((b) => b.ua);
  const google = blocked.includes("Googlebot") || blocked.includes("Bingbot");
  const status = google ? "fail" : blocked.length ? "fail" : "pass";
  return f(
    "ai-bots",
    "access",
    "official",
    status,
    "l-bots",
    BOTS.find((b) => b.ua === blocked[0])?.source || SRC.robots,
    { blocked: blocked.join(", "), training: training.join(", "), count: blocked.length }
  );
};
var signals = (_m, i) => {
  const r = i.robots && i.robots.text ? parseRobots(i.robots.text) : null;
  const sig = r ? r.signals : {};
  const cf = /cloudflare/i.test(i.headers?.server || "") || !!i.headers?.["cf-ray"];
  const aiInput = sig["ai-input"];
  const status = aiInput === "no" || sig["search"] === "no" ? "warn" : cf || Object.keys(sig).length ? "info" : "skip";
  return f(
    "signals",
    "access",
    "official",
    status,
    "l-signals",
    cf ? SRC.cfCrawl : SRC.signals,
    { search: sig["search"] || "-", input: aiInput || "-", train: sig["ai-train"] || "-", cf: cf ? 1 : 0 }
  );
};
var jsContent = (m) => {
  if (m.rawWords === null) return f("js-content", "access", "research", "skip", "l-js", SRC.js);
  const ratio = m.words ? m.rawWords / m.words : 1;
  const status = m.words > 80 && ratio < 0.5 ? "warn" : "pass";
  return f("js-content", "access", "research", status, "l-js", SRC.js, { raw: m.rawWords, shown: m.words, pct: Math.round(Math.min(1, ratio) * 100) });
};
var titleMeta = (m) => {
  const t2 = m.title.length;
  const d = m.metaDescription.length;
  const generic = /^(home|homepage|welcome|accueil|bienvenue|startseite|willkommen|الرئيسية|مرحبا|untitled|index)\b/i.test(m.title.trim());
  const status = !t2 ? "fail" : t2 < 10 || t2 > 70 || !d || generic ? "warn" : "pass";
  return f("title-meta", "understand", "official", status, "l-title", SRC.title, { tlen: t2, dlen: d, title: m.title.slice(0, 80) });
};
var structure = (m) => {
  const h1 = m.h1s.length;
  const h2 = m.headings.filter((h) => h.level === 2).length;
  const status = h1 !== 1 ? h1 === 0 ? "fail" : "warn" : m.words > 300 && h2 < 2 ? "warn" : "pass";
  return f("structure", "understand", "research", status, "l-structure", SRC.helpful, { h1, h2 });
};
var jsonldValid = (m) => {
  const bad = m.jsonld.filter((b) => !b.ok);
  const status = bad.length ? "fail" : !m.jsonld.length ? "warn" : "pass";
  return f(
    "jsonld",
    "understand",
    "official",
    status,
    "l-schema",
    SRC.sd,
    { blocks: m.jsonld.length, bad: bad.length, error: bad[0]?.error || "", types: m.types.slice(0, 6).join(", ") }
  );
};
var ORG_TYPES = /^(Organization|Corporation|LocalBusiness|ProfessionalService|Store|Restaurant|Hotel|LodgingBusiness|MedicalBusiness|EducationalOrganization|NGO|OnlineStore|TravelAgency|RealEstateAgent|AutoRental|.*Business)$/;
var organization = (m) => {
  const org = flatNodes(m.jsonld).find((n) => [].concat(n["@type"]).some((t2) => ORG_TYPES.test(String(t2))));
  if (!org) return f("entity", "understand", "research", "warn", "l-entity", SRC.org, { name: "", same: 0, missing: "Organization" });
  const same = [].concat(org.sameAs || []).filter((x) => typeof x === "string").length;
  const missing = ["name", "url", "logo"].filter((k) => !org[k]).join(", ");
  const status = missing ? "warn" : same >= 2 ? "pass" : "warn";
  return f("entity", "understand", "research", status, "l-entity", SRC.org, { name: String(org.name || ""), same, missing });
};
var pageType = (m) => {
  const types = m.types.join(" ");
  const product = /\bProduct\b/.test(types);
  const looksProduct = m.priceSignals >= 1 && m.forms.some((x) => /cart|panier|warenkorb|buy|kaufen|acheter/i.test(x.action)) || product;
  const looksArticle = m.words >= 600 && !looksProduct;
  if (looksProduct) {
    const p = flatNodes(m.jsonld).find((n) => [].concat(n["@type"]).includes("Product"));
    const ok = p && p.offers;
    return f("page-type", "understand", "official", ok ? "pass" : "warn", "l-pagetype", "https://developers.google.com/search/docs/appearance/structured-data/product", { kind: "product", has: p ? ok ? "Product + offers" : "Product" : "" });
  }
  if (looksArticle) {
    const a = flatNodes(m.jsonld).find((n) => [].concat(n["@type"]).some((t2) => /Article|BlogPosting|NewsArticle|TechArticle|HowTo/.test(String(t2))));
    const ok = a && (a.datePublished || a.dateModified) && a.author;
    return f("page-type", "understand", "official", ok ? "pass" : "warn", "l-pagetype", "https://developers.google.com/search/docs/appearance/structured-data/article", { kind: "article", has: a ? [].concat(a["@type"]).join("/") : "" });
  }
  return f("page-type", "understand", "official", "skip", "l-pagetype", SRC.sd, { kind: "other" });
};
var langHreflang = (m) => {
  const lang = m.lang.toLowerCase();
  const isAr = lang.startsWith("ar");
  const problems = [];
  if (!lang) problems.push("lang");
  if (isAr && m.dir.toLowerCase() !== "rtl") problems.push("rtl");
  if (m.hreflangs.length) {
    if (!m.hreflangs.some((h) => h.lang === "x-default")) problems.push("x-default");
    const self = m.hreflangs.some((h) => {
      try {
        return new URL(h.href, m.url).href.replace(/\/$/, "") === m.url.split("#")[0].replace(/\/$/, "");
      } catch {
        return false;
      }
    });
    if (!self) problems.push("self");
  }
  const status = problems.includes("lang") || problems.includes("rtl") ? "fail" : problems.length ? "warn" : "pass";
  return f(
    "lang",
    "understand",
    "official",
    status,
    "l-lang",
    SRC.hreflang,
    { lang: m.lang || "-", versions: m.hreflangs.filter((h) => h.lang !== "x-default").length, problems: problems.join(", ") }
  );
};
var answerFirst = (m) => {
  const p = m.firstParagraph;
  const n = (p.match(/[\p{L}\p{N}]+/gu) || []).length;
  const lang = (m.lang || "en").slice(0, 2);
  const substance = splitSentences(p).slice(0, 2).some((x) => scoreSentence(x, lang).score >= 3 && scoreSentence(x, lang).reasons.includes("specific"));
  const status = !p ? "fail" : n > 90 || n < 12 || !substance ? "warn" : "pass";
  return f("answer-first", "cite", "research", status, "l-answer", SRC.helpful, { words: n, start: p.slice(0, 140) });
};
var quotable = (m) => {
  const q = m.sentences.filter((s) => s.quotable).length;
  const total = m.sentences.length;
  const status = q >= 5 ? "pass" : q >= 2 ? "warn" : "fail";
  return f("quotable", "cite", "research", total ? status : "warn", "l-quote", SRC.geo, { q, total });
};
var facts = (m) => {
  const status = m.numbers >= 3 && m.links.sources >= 1 ? "pass" : m.numbers >= 3 || m.links.sources >= 1 ? "warn" : "warn";
  return f("facts", "cite", "research", m.words < 120 ? "skip" : status, "l-facts", SRC.geo, { numbers: m.numbers, sources: m.links.sources });
};
var faq = (m) => {
  const hasSchema = m.types.includes("FAQPage");
  const n = m.questionHeadings + m.details;
  const status = n >= 2 || hasSchema ? "pass" : m.words >= 300 ? "warn" : "skip";
  return f("faq", "cite", "research", status, "l-faq", SRC.helpful, { n, schema: hasSchema ? 1 : 0 });
};
var freshness = (m, i) => {
  const now = i.at ? new Date(i.at) : /* @__PURE__ */ new Date();
  const dates = m.times.map((t2) => new Date(t2)).filter((d) => !isNaN(d.getTime()) && d <= new Date(now.getTime() + 864e5));
  if (!dates.length) return f("fresh", "cite", "research", m.words >= 300 ? "warn" : "skip", "l-fresh", SRC.helpful, { days: -1 });
  const last = new Date(Math.max(...dates.map((d) => d.getTime())));
  const days = Math.round((now.getTime() - last.getTime()) / 864e5);
  return f("fresh", "cite", "research", days > 365 ? "warn" : "pass", "l-fresh", SRC.helpful, { days, date: last.toISOString().slice(0, 10) });
};
var media = (m) => {
  const { total, withAlt } = m.images;
  if (!total) return f("media", "cite", "official", m.words >= 300 && !m.videos ? "info" : "skip", "l-media", SRC.images, { total: 0, alt: 0, videos: m.videos });
  const ratio = withAlt / total;
  return f("media", "cite", "official", ratio >= 0.8 ? "pass" : "warn", "l-media", SRC.images, { total, alt: withAlt, videos: m.videos });
};
var agentForms = (m) => {
  const useful = m.forms.filter((x) => x.purpose !== "newsletter" && x.purpose !== "other");
  if (!useful.length) return f("agent-forms", "agent", "optional", "skip", "l-agent", SRC.webmcp, { n: 0 });
  const tooled = useful.filter((x) => x.toolname).length;
  return f(
    "agent-forms",
    "agent",
    "optional",
    tooled === useful.length ? "pass" : "info",
    "l-agent",
    SRC.webmcp,
    { n: useful.length, tooled, kinds: Array.from(new Set(useful.map((x) => x.purpose))).join(", ") }
  );
};
var agentFiles = (m, i) => {
  const ok = (x) => !!x && x.status >= 200 && x.status < 300;
  const found = [];
  if (ok(i.llms)) found.push("llms.txt");
  if (ok(i.agentCard)) found.push("agent-card.json");
  if (ok(i.ucp)) found.push("UCP");
  if (m.mcpLink) found.push("MCP");
  const shop = m.priceSignals >= 2 || m.types.includes("Product");
  return f(
    "agent-files",
    "agent",
    "optional",
    found.length ? "pass" : "info",
    "l-agentfiles",
    shop ? SRC.ucp : SRC.llms,
    { found: found.join(", "), shop: shop ? 1 : 0 }
  );
};
var RULES = [
  indexable,
  aiBots,
  signals,
  jsContent,
  titleMeta,
  structure,
  jsonldValid,
  organization,
  pageType,
  langHreflang,
  answerFirst,
  quotable,
  facts,
  faq,
  freshness,
  media,
  agentForms,
  agentFiles
];

// packages/core/src/i18n/ar.ts
var ar_default = {
  "app.tagline": "\u0632\u0645\u064A\u0644\u0643 \u0641\u064A GEO: \u0643\u064A\u0641 \u062A\u0631\u0649 \u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629\u060C \u0648\u0645\u0627\u0630\u0627 \u062A\u0641\u0639\u0644.",
  "app.private": "\u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629 \u0623\u0648\u0644\u064B\u0627: \u062A\u062A\u0645 \u0627\u0644\u0641\u062D\u0648\u0635\u0627\u062A \u062F\u0627\u062E\u0644 \u0645\u062A\u0635\u0641\u062D\u0643. \u0644\u0627 \u064A\u064F\u0631\u0633\u0644 \u0623\u064A \u0634\u064A\u0621 \u0625\u0644\u0649 AYKA.",
  "tab.check": "\u0641\u062D\u0635",
  "tab.ask": "\u0627\u0633\u0623\u0644 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "tab.learn": "\u062A\u0639\u0644\u0651\u0645",
  "tab.team": "\u0627\u0644\u0641\u0631\u064A\u0642",
  "btn.check": "\u0627\u0641\u062D\u0635 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629",
  "btn.recheck": "\u0623\u0639\u062F \u0627\u0644\u0641\u062D\u0635",
  "checking": "\u062C\u0627\u0631\u064D \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0635\u0641\u062D\u0629\u2026",
  "perm.need": "\u064A\u062D\u062A\u0627\u062C \u0635\u062F\u0649 \u0625\u0644\u0649 \u0625\u0630\u0646\u0643 \u0644\u0642\u0631\u0627\u0621\u0629 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629 (\u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0642\u0639 \u0641\u0642\u0637\u060C \u0648\u0639\u0646\u062F \u0627\u0644\u0646\u0642\u0631 \u0641\u0642\u0637).",
  "perm.denied": "\u0628\u062F\u0648\u0646 \u0625\u0630\u0646 \u0644\u0627 \u064A\u0633\u062A\u0637\u064A\u0639 \u0635\u062F\u0649 \u0642\u0631\u0627\u0621\u0629 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629. \u0644\u0645 \u062A\u062A\u0645 \u0642\u0631\u0627\u0621\u0629 \u0623\u064A \u0634\u064A\u0621.",
  "perm.cant": "\u0644\u0627 \u064A\u0645\u0643\u0646 \u0641\u062D\u0635 \u0647\u0630\u0627 \u0627\u0644\u0646\u0648\u0639 \u0645\u0646 \u0627\u0644\u0635\u0641\u062D\u0627\u062A (\u0635\u0641\u062D\u0627\u062A \u0627\u0644\u0645\u062A\u0635\u0641\u062D\u060C \u0645\u062A\u062C\u0631 \u0627\u0644\u0625\u0636\u0627\u0641\u0627\u062A\u060C \u0645\u0644\u0641\u0627\u062A PDF). \u0627\u0641\u062A\u062D \u0635\u0641\u062D\u0629 \u0648\u064A\u0628 \u0639\u0627\u062F\u064A\u0629.",
  "cat.access": "\u0627\u0644\u0648\u0635\u0648\u0644",
  "cat.access.d": "\u0647\u0644 \u062A\u0633\u062A\u0637\u064A\u0639 \u0645\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0628\u062D\u062B \u0648\u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629 \u0648\u0627\u0633\u062A\u062E\u062F\u0627\u0645\u0647\u0627\u061F",
  "cat.understand": "\u0627\u0644\u0641\u0647\u0645",
  "cat.understand.d": "\u0647\u0644 \u062A\u0641\u0647\u0645 \u0627\u0644\u0622\u0644\u0627\u062A \u0645\u0627 \u0647\u064A \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629 \u0648\u0645\u0627 \u0647\u0648 \u0647\u0630\u0627 \u0627\u0644\u0646\u0634\u0627\u0637 \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u061F",
  "cat.cite": "\u0642\u0627\u0628\u0644\u064A\u0629 \u0627\u0644\u0627\u0642\u062A\u0628\u0627\u0633",
  "cat.cite.d": "\u0647\u0644 \u064A\u0648\u062C\u062F \u0645\u062D\u062A\u0648\u0649 \u064A\u0645\u0643\u0646 \u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0623\u0646 \u062A\u0642\u062A\u0628\u0633\u0647 \u0628\u062B\u0642\u0629\u061F",
  "cat.agent": "\u062C\u0627\u0647\u0632\u064A\u0629 \u0627\u0644\u0648\u0643\u0644\u0627\u0621",
  "cat.agent.d": "\u0647\u0644 \u064A\u0633\u062A\u0637\u064A\u0639 \u0648\u0643\u0644\u0627\u0621 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u062A\u0635\u0631\u0641 \u0647\u0646\u0627 (\u062D\u062C\u0632\u060C \u0634\u0631\u0627\u0621\u060C \u0627\u0633\u062A\u0641\u0633\u0627\u0631)\u061F \u0627\u0633\u062A\u0639\u062F\u0627\u062F \u0644\u0644\u0645\u0633\u062A\u0642\u0628\u0644\u060C \u0644\u0627 \u064A\u062F\u062E\u0644 \u0641\u064A \u0627\u0644\u062A\u0642\u064A\u064A\u0645.",
  "status.pass": "\u062C\u064A\u062F",
  "status.warn": "\u064A\u062D\u062A\u0627\u062C \u062A\u062D\u0633\u064A\u0646\u064B\u0627",
  "status.fail": "\u0623\u0635\u0644\u062D\u0647 \u0623\u0648\u0644\u064B\u0627",
  "status.info": "\u0645\u0644\u0627\u062D\u0638\u0629",
  "status.skip": "\u0644\u0627 \u064A\u0646\u0637\u0628\u0642",
  "ev.official": "\u0631\u0633\u0645\u064A",
  "ev.official.d": "\u0645\u0648\u062B\u0651\u0642 \u0645\u0646 Google \u0623\u0648 OpenAI \u0623\u0648 Anthropic \u0623\u0648 Perplexity \u0623\u0648 Microsoft \u0623\u0648 Cloudflare.",
  "ev.research": "\u062F\u0631\u0627\u0633\u0627\u062A",
  "ev.research.d": "\u062A\u062F\u0639\u0645\u0647 \u0627\u0644\u062F\u0631\u0627\u0633\u0627\u062A \u0648\u0648\u0631\u0642\u0629 GEO \u0627\u0644\u0628\u062D\u062B\u064A\u0629 (KDD 2024). \u0645\u0641\u064A\u062F\u060C \u0644\u0643\u0646\u0647 \u0644\u064A\u0633 \u0636\u0645\u0627\u0646\u064B\u0627.",
  "ev.optional": "\u0627\u062E\u062A\u064A\u0627\u0631\u064A",
  "ev.optional.d": "\u0627\u0633\u062A\u0639\u062F\u0627\u062F \u0644\u0644\u0645\u0633\u062A\u0642\u0628\u0644. \u062A\u0642\u0648\u0644 Google \u0625\u0646\u0647 \u063A\u064A\u0631 \u0636\u0631\u0648\u0631\u064A \u0644\u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0644\u062F\u064A\u0647\u0627. \u0644\u0627 \u064A\u064F\u062D\u062A\u0633\u0628 \u0641\u064A \u0627\u0644\u062A\u0642\u064A\u064A\u0645.",
  "score": "\u062A\u0642\u064A\u064A\u0645 GEO",
  "score.low": "\u0641\u062C\u0648\u0627\u062A \u0643\u0628\u064A\u0631\u0629: \u0633\u062A\u0648\u0627\u062C\u0647 \u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0635\u0639\u0648\u0628\u0629 \u0645\u0639 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629.",
  "score.mid": "\u0623\u0633\u0627\u0633 \u062C\u064A\u062F\u060C \u0648\u0645\u0627 \u0632\u0627\u0644\u062A \u0647\u0646\u0627\u0643 \u062A\u062D\u0633\u064A\u0646\u0627\u062A \u0648\u0627\u0636\u062D\u0629.",
  "score.high": "\u0642\u0648\u064A: \u062A\u0633\u062A\u0637\u064A\u0639 \u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0642\u0631\u0627\u0621\u0629 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629 \u0648\u0627\u0644\u0627\u0642\u062A\u0628\u0627\u0633 \u0645\u0646\u0647\u0627.",
  "why": "\u0644\u0645\u0627\u0630\u0627 \u064A\u0647\u0645",
  "fix": "\u0645\u0627\u0630\u0627 \u062A\u0641\u0639\u0644",
  "source": "\u0627\u0644\u0645\u0635\u062F\u0631",
  "lesson": "\u062F\u0631\u0633 \u0641\u064A 60 \u062B\u0627\u0646\u064A\u0629",
  "show": "\u0623\u0638\u0647\u0631 \u0639\u0644\u0649 \u0627\u0644\u0635\u0641\u062D\u0629",
  "heat.on": "\u0638\u0644\u0651\u0644 \u0627\u0644\u062C\u0645\u0644 \u0627\u0644\u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0627\u0642\u062A\u0628\u0627\u0633",
  "heat.off": "\u0623\u062E\u0641\u0650 \u0627\u0644\u062A\u0638\u0644\u064A\u0644",
  "heat.legend": "\u0623\u062E\u0636\u0631: \u064A\u0645\u0643\u0646 \u0644\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0642\u062A\u0628\u0627\u0633\u0647\u0627 \u0643\u0645\u0627 \u0647\u064A. \u0628\u0631\u062A\u0642\u0627\u0644\u064A: \u0642\u0631\u064A\u0628\u0629 \u0645\u0646 \u0630\u0644\u0643. \u0628\u0644\u0627 \u0644\u0648\u0646: \u064A\u0635\u0639\u0628 \u0627\u0642\u062A\u0628\u0627\u0633\u0647\u0627 \u0648\u062D\u062F\u0647\u0627.",
  "export": "\u062D\u0645\u0651\u0644 \u0627\u0644\u062A\u0642\u0631\u064A\u0631",
  "copied": "\u062A\u0645 \u0627\u0644\u0646\u0633\u062E",
  "found.prio": "\u0627\u0628\u062F\u0623 \u0645\u0646 \u0647\u0646\u0627",
  "found.all": "\u0643\u0644 \u0627\u0644\u0641\u062D\u0648\u0635\u0627\u062A",
  "esc.title": "\u0647\u0630\u0627 \u0645\u0634\u0631\u0648\u0639\u060C \u0648\u0644\u064A\u0633 \u062A\u0639\u062F\u064A\u0644\u064B\u0627 \u0628\u0633\u064A\u0637\u064B\u0627",
  "esc.blocked": "\u0627\u0644\u0628\u062D\u062B \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0645\u062D\u062C\u0648\u0628",
  "esc.blocked.d": "\u062A\u064F\u0628\u0644\u064E\u0651\u063A \u0645\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0628\u062D\u062B \u0623\u0648 \u0631\u0648\u0628\u0648\u062A\u0627\u062A \u0627\u0644\u0628\u062D\u062B \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0628\u0639\u062F\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629 ({what}). \u0645\u0627 \u062F\u0627\u0645 \u0627\u0644\u0623\u0645\u0631 \u0643\u0630\u0644\u0643\u060C \u0644\u0627 \u064A\u0647\u0645 \u0628\u0627\u0642\u064A \u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0635\u0641\u062D\u0629 \u0641\u064A \u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A. \u063A\u0627\u0644\u0628\u064B\u0627 \u0645\u0627 \u064A\u0643\u0648\u0646 \u0633\u0637\u0631\u064B\u0627 \u0648\u0627\u062D\u062F\u064B\u0627\u060C \u0644\u0643\u0646 \u0627\u0644\u0633\u0637\u0631 \u0627\u0644\u062E\u0627\u0637\u0626 \u0642\u062F \u064A\u062D\u062C\u0628 Google \u0623\u064A\u0636\u064B\u0627: \u064A\u0633\u062A\u062D\u0642 \u0645\u0631\u0627\u062C\u0639\u0629 \u062F\u0642\u064A\u0642\u0629.",
  "esc.schema": "\u0623\u0633\u0627\u0633 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u0638\u0645\u0629",
  "esc.schema.d": "\u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0645\u0642\u0631\u0648\u0621\u0629 \u0622\u0644\u064A\u064B\u0627 \u0639\u0646 \u0627\u0644\u0646\u0634\u0627\u0637 \u0627\u0644\u062A\u062C\u0627\u0631\u064A \u0645\u0639\u0637\u0648\u0628\u0629 \u0623\u0648 \u063A\u0627\u0626\u0628\u0629. \u0627\u0644\u0625\u0635\u0644\u0627\u062D \u0627\u0644\u0635\u062D\u064A\u062D \u064A\u0639\u0646\u064A \u0645\u062C\u0645\u0648\u0639\u0629 \u062D\u0642\u0627\u0626\u0642 \u0648\u0627\u062D\u062F\u0629 \u0648\u0645\u062A\u0633\u0642\u0629 \u0641\u064A \u0643\u0644 \u0642\u0648\u0627\u0644\u0628 \u0627\u0644\u0635\u0641\u062D\u0627\u062A\u060C \u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u062D\u0633\u0627\u0628\u0627\u062A\u0643.",
  "esc.multilingual": "\u0646\u0633\u062E \u0627\u0644\u0644\u063A\u0627\u062A",
  "esc.multilingual.d": "\u0625\u0639\u062F\u0627\u062F \u0627\u0644\u0644\u063A\u0627\u062A \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644 ({problems}). \u0627\u0644\u0625\u0634\u0627\u0631\u0627\u062A \u0627\u0644\u062E\u0627\u0637\u0626\u0629 \u0644\u0644\u063A\u0629 \u062A\u0631\u0633\u0644 \u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0625\u0644\u0649 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u062E\u0637\u0623 \u0623\u0648 \u0625\u0644\u0649 \u0644\u0627 \u0634\u064A\u0621. \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0627\u0644\u0639\u0631\u0628\u064A\u0629 (\u0645\u0646 \u0627\u0644\u064A\u0645\u064A\u0646 \u0625\u0644\u0649 \u0627\u0644\u064A\u0633\u0627\u0631) \u062A\u062D\u062A\u0627\u062C \u0639\u0646\u0627\u064A\u0629 \u062E\u0627\u0635\u0629.",
  "esc.rendering": "\u0645\u062D\u062A\u0648\u0649 \u0645\u062E\u0641\u064A \u062E\u0644\u0641 JavaScript",
  "esc.rendering.d": "{pct}% \u0641\u0642\u0637 \u0645\u0646 \u0627\u0644\u0646\u0635 \u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0627\u0644\u0635\u0641\u062D\u0629 \u0643\u0645\u0627 \u062A\u064F\u0631\u0633\u064E\u0644. \u0643\u062B\u064A\u0631 \u0645\u0646 \u0632\u0648\u0627\u062D\u0641 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0644\u0627 \u062A\u0634\u063A\u0651\u0644 JavaScript \u0641\u062A\u0631\u0649 \u0635\u0641\u062D\u0629 \u0634\u0628\u0647 \u0641\u0627\u0631\u063A\u0629. \u0647\u0630\u0647 \u0645\u0647\u0645\u0629 \u0644\u0644\u0645\u0637\u0648\u0651\u0631: \u0627\u0644\u0639\u0631\u0636 \u0645\u0646 \u062C\u0647\u0629 \u0627\u0644\u062E\u0627\u062F\u0645 \u0623\u0648 \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u0645\u0633\u0628\u0642.",
  "esc.commerce": "\u062C\u0627\u0647\u0632\u064A\u0629 \u0627\u0644\u062A\u0633\u0648\u0642 \u0648\u0627\u0644\u0648\u0643\u0644\u0627\u0621",
  "esc.commerce.d": "\u062A\u0628\u062F\u0648 \u0647\u0630\u0647 \u0635\u0641\u062D\u0629 \u0645\u0646\u062A\u062C \u0628\u0644\u0627 \u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0646\u062A\u062C \u064A\u0633\u062A\u0637\u064A\u0639 \u0645\u0633\u0627\u0639\u062F \u0627\u0644\u062A\u0633\u0648\u0642 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0633\u062A\u062E\u062F\u0627\u0645\u0647\u0627 (\u0627\u0644\u0633\u0639\u0631\u060C \u0627\u0644\u062A\u0648\u0641\u0631). \u064A\u062D\u062A\u0627\u062C \u0648\u0643\u0644\u0627\u0621 \u0627\u0644\u062A\u0633\u0648\u0642 \u0648\u0627\u0644\u062E\u0644\u0627\u0635\u0627\u062A \u0625\u0644\u0649 \u0630\u0644\u0643 \u0641\u064A \u0643\u0627\u0645\u0644 \u0627\u0644\u0643\u062A\u0627\u0644\u0648\u062C.",
  "esc.foundation": "\u0627\u0646\u0637\u0644\u0627\u0642\u0629 \u0623\u0633\u0627\u0633\u064A\u0627\u062A GEO",
  "esc.foundation.d": "\u0628\u062A\u0642\u064A\u064A\u0645 {score}\u060C \u062A\u062A\u0648\u0632\u0639 \u0627\u0644\u0641\u062C\u0648\u0627\u062A \u0639\u0644\u0649 \u0627\u0644\u0648\u0635\u0648\u0644 \u0648\u0627\u0644\u0628\u0646\u064A\u0629 \u0648\u0627\u0644\u0645\u062D\u062A\u0648\u0649. \u0639\u0627\u062F\u0629\u064B \u0645\u0627 \u062A\u064F\u0635\u0644\u062D \u0645\u0631\u062D\u0644\u0629 \u0642\u0635\u064A\u0631\u0629 \u0628\u0645\u0631\u0627\u0641\u0642\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0627\u062A \u0641\u064A \u0627\u0644\u0645\u0648\u0642\u0639 \u0643\u0644\u0647.",
  "esc.ask": "\u062A\u0642\u0648\u0645 AYKA Technologies \u0628\u0647\u0630\u0627 \u0627\u0644\u0646\u0648\u0639 \u0645\u0646 \u0627\u0644\u0639\u0645\u0644. \u0627\u0644\u0645\u0643\u0627\u0644\u0645\u0629 \u0645\u062C\u0627\u0646\u064A\u0629: \u062A\u064F\u0631\u064A\u0646\u0627 \u0627\u0644\u0645\u0648\u0642\u0639\u060C \u0641\u0646\u062E\u0628\u0631\u0643 \u0628\u0645\u0627 \u0633\u0646\u0635\u0644\u062D\u0647 \u0623\u0648\u0644\u064B\u0627 \u0648\u0646\u0631\u0633\u0644 \u0644\u0643 \u0639\u0631\u0636 \u0633\u0639\u0631 \u0645\u062E\u0635\u0651\u0635\u064B\u0627.",
  "cta.book": "\u0627\u062D\u062C\u0632 \u0645\u0643\u0627\u0644\u0645\u0629 \u0645\u062C\u0627\u0646\u064A\u0629 \u0644\u0645\u062F\u0629 30 \u062F\u0642\u064A\u0642\u0629",
  "cta.email": "\u0627\u0637\u0644\u0628 \u0639\u0631\u0636 \u0633\u0639\u0631 \u0645\u062E\u0635\u0651\u0635",
  "cta.later": "\u0644\u0627\u062D\u0642\u064B\u0627",
  "ask.running": "\u062C\u0627\u0631\u064D \u0627\u0644\u062A\u0641\u0643\u064A\u0631\u2026",
  "ask.pro": "\u0633\u0624\u0627\u0644 \u0648\u0627\u062D\u062F \u0648\u0645\u062D\u0631\u0643 \u0648\u0627\u062D\u062F \u0627\u0644\u0622\u0646. \u064A\u0645\u0643\u0646 \u0644\u0640 AYKA \u0637\u0631\u062D \u0623\u0647\u0645 \u0623\u0633\u0626\u0644\u062A\u0643 \u0643\u0644 \u0623\u0633\u0628\u0648\u0639 \u0639\u0644\u0649 ChatGPT \u0648Gemini \u0648Perplexity \u0648\u0645\u0644\u062E\u0635\u0627\u062A Google \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A\u060C \u0648\u062A\u0646\u0628\u064A\u0647\u0643 \u0639\u0646\u062F\u0645\u0627 \u062A\u062A\u063A\u064A\u0631 \u0625\u062C\u0627\u0628\u0629. \u0627\u0637\u0644\u0628 \u0645\u0646\u0627 \u0639\u0631\u0636 \u0633\u0639\u0631 \u0645\u062E\u0635\u0651\u0635\u064B\u0627.",
  "learn.title": "\u062A\u0639\u0644\u0651\u0645 GEO \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u0639\u0645\u0644",
  "learn.d": "\u0644\u0643\u0644 \u0641\u062D\u0635 \u062F\u0631\u0633 \u0641\u064A 60 \u062B\u0627\u0646\u064A\u0629 \u0648\u0633\u0624\u0627\u0644 \u0648\u0627\u062D\u062F. \u0623\u0643\u0645\u0644 \u0627\u0644\u062F\u0631\u0648\u0633 \u0627\u0644\u062B\u0645\u0627\u0646\u064A\u0629 \u0639\u0634\u0631 \u0644\u062A\u062D\u0635\u0644 \u0639\u0644\u0649 \u0634\u0627\u0631\u0629 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0623\u0648\u0644.",
  "learn.progress": "{done} \u0645\u0646 {total} \u062F\u0631\u0648\u0633",
  "learn.badge": "\u0627\u0644\u0645\u0633\u062A\u0648\u0649 1 \xB7 \u0623\u0633\u0627\u0633\u064A\u0627\u062A GEO: \u0645\u0643\u062A\u0645\u0644",
  "learn.badge.d": "\u0623\u0646\u062A \u062A\u0639\u0631\u0641 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0627\u062A. \u0627\u0644\u0645\u0633\u062A\u0648\u0649 2 \u0647\u0648 \u0627\u0644\u062F\u0648\u0631\u0629 \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629 \u0644\u0644\u0641\u0631\u0642 (\u0645\u0639 \u0627\u062E\u062A\u0628\u0627\u0631 \u0648\u0634\u0647\u0627\u062F\u0629 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062A\u062D\u0642\u0642).",
  "learn.quiz": "\u0633\u0624\u0627\u0644 \u0633\u0631\u064A\u0639",
  "learn.right": "\u0635\u062D\u064A\u062D.",
  "learn.wrong": "\u0644\u064A\u0633 \u062A\u0645\u0627\u0645\u064B\u0627.",
  "learn.next": "\u0627\u0644\u062F\u0631\u0633 \u0627\u0644\u062A\u0627\u0644\u064A",
  "learn.l2": "\u0634\u0647\u0627\u062F\u0629 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 2 \u0644\u0641\u0631\u064A\u0642\u0643",
  "learn.l2.d": "\u0645\u0645\u0627\u0631\u0633 GEO \u0645\u0639\u062A\u0645\u062F: \u062F\u0648\u0631\u0629\u060C \u0627\u062E\u062A\u0628\u0627\u0631\u060C \u0634\u0647\u0627\u062F\u0629 Open Badge\u060C \u0648\u0644\u0648\u062D\u0629 \u062A\u0642\u062F\u0645 \u0627\u0644\u0641\u0631\u064A\u0642. \u0648\u064A\u0645\u0643\u0646 \u0627\u062D\u062A\u0633\u0627\u0628\u0647\u0627 \u0636\u0645\u0646 \u0633\u062C\u0644 \u062A\u062F\u0631\u064A\u0628 \u0641\u0631\u064A\u0642\u0643 \u0639\u0644\u0649 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A (\u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0623\u0648\u0631\u0648\u0628\u064A\u060C \u0627\u0644\u0645\u0627\u062F\u0629 4).",
  "team.title": "\u0644\u0644\u0641\u0631\u0642 \u0627\u0644\u062A\u064A \u062A\u0631\u064A\u062F \u0646\u062A\u0627\u0626\u062C\u060C \u0644\u0627 \u0645\u062C\u0631\u062F \u0641\u062D\u0648\u0635\u0627\u062A",
  "team.d": "\u0643\u0644 \u0645\u0627 \u0641\u064A \u0627\u0644\u062A\u0628\u0648\u064A\u0628\u0627\u062A \u0627\u0644\u0623\u062E\u0631\u0649 \u064A\u0628\u0642\u0649 \u0645\u062C\u0627\u0646\u064A\u064B\u0627. \u062A\u0636\u064A\u0641 AYKA Technologies \u0645\u0627 \u064A\u062D\u062A\u0627\u062C \u0625\u0644\u0649 \u0641\u0631\u064A\u0642\u0646\u0627 \u0623\u0648 \u062E\u0648\u0627\u062F\u0645\u0646\u0627 \u0623\u0648 \u0634\u0647\u0627\u062F\u062A\u0646\u0627:",
  "team.track": "\u0645\u062A\u0627\u0628\u0639\u0629 \u0623\u0633\u0628\u0648\u0639\u064A\u0629 \u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "team.track.d": "\u0623\u0633\u0626\u0644\u062A\u0643 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0639\u0644\u0649 ChatGPT \u0648Gemini \u0648Perplexity \u0648\u0645\u0644\u062E\u0635\u0627\u062A Google\u060C \u0639\u0628\u0631 \u0627\u0644\u0648\u0627\u062C\u0647\u0627\u062A \u0627\u0644\u0631\u0633\u0645\u064A\u0629. \u0633\u062C\u0644 \u0643\u0627\u0645\u0644 \u0648\u062A\u0646\u0628\u064A\u0647\u0627\u062A \u0639\u0646\u062F \u0627\u0644\u062A\u0631\u0627\u062C\u0639.",
  "team.comp": "\u0645\u0646 \u064A\u0648\u0635\u064A \u0628\u0647 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0628\u062F\u0644\u064B\u0627 \u0645\u0646\u0643",
  "team.comp.d": "\u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0648\u0646 \u0627\u0644\u0645\u0630\u0643\u0648\u0631\u0648\u0646 \u0641\u064A \u0625\u062C\u0627\u0628\u0627\u062A\u0643\u060C \u0648\u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u062A\u064A \u062A\u0633\u062A\u0634\u0647\u062F \u0628\u0647\u0645\u060C \u0648\u0645\u0627 \u064A\u0641\u0639\u0644\u0648\u0646\u0647 \u0648\u0644\u0627 \u062A\u0641\u0639\u0644\u0647.",
  "team.dash": "\u0644\u0648\u062D\u0629 \u0627\u0644\u0641\u0631\u064A\u0642 \u0648\u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631",
  "team.dash.d": "\u0643\u0644 \u0635\u0641\u062D\u0627\u062A\u0643 \u0648\u0641\u0631\u064A\u0642\u0643 \u0641\u064A \u0645\u0643\u0627\u0646 \u0648\u0627\u062D\u062F\u060C \u062A\u0642\u0631\u064A\u0631 PDF \u0634\u0647\u0631\u064A\u060C \u0648\u0645\u0644\u062E\u0635 \u0641\u064A Slack \u0623\u0648 Teams.",
  "team.academy": "\u0627\u0644\u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629 \u0644\u0641\u0631\u064A\u0642\u0643",
  "team.academy.d": "\u062F\u0648\u0631\u0629 GEO \u0645\u0639\u062A\u0645\u062F\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0623\u0648 \u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629 \u0623\u0648 \u0627\u0644\u0641\u0631\u0646\u0633\u064A\u0629 \u0623\u0648 \u0627\u0644\u0623\u0644\u0645\u0627\u0646\u064A\u0629\u060C \u0645\u0639 \u062A\u0642\u062F\u0645 \u0643\u0644 \u0634\u062E\u0635.",
  "team.agency": "\u0644\u0644\u0648\u0643\u0627\u0644\u0627\u062A",
  "team.agency.d": "\u0645\u0633\u0627\u062D\u0627\u062A \u0644\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u062A\u0642\u0627\u0631\u064A\u0631 \u0628\u0639\u0644\u0627\u0645\u062A\u0643 \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629.",
  "set.title": "\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A",
  "set.lang": "\u0627\u0644\u0644\u063A\u0629",
  "set.auto": "\u062A\u0644\u0642\u0627\u0626\u064A",
  "rep.title": "\u0641\u062D\u0635 GEO",
  "rep.by": "\u062A\u0645 \u0627\u0644\u0641\u062D\u0635 \u0628\u0648\u0627\u0633\u0637\u0629 \u0635\u062F\u0649 \u0645\u0646 AYKA: \u0645\u062C\u0627\u0646\u064A \u0648\u0634\u064A\u0641\u0631\u062A\u0647 \u0627\u0644\u0645\u0635\u062F\u0631\u064A\u0629 \u0645\u0646\u0634\u0648\u0631\u0629.",
  "hint.icon": "\u0644\u0641\u062D\u0635 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629\u060C \u0627\u0646\u0642\u0631 \u0639\u0644\u0649 \u0623\u064A\u0642\u0648\u0646\u0629 \u0635\u062F\u0649 \u0641\u064A \u0634\u0631\u064A\u0637 \u0623\u062F\u0648\u0627\u062A \u0627\u0644\u0645\u062A\u0635\u0641\u062D (\u064A\u0645\u0646\u062D \u0630\u0644\u0643 \u0635\u062F\u0649 \u0625\u0630\u0646 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629 \u0641\u0642\u0637).",
  "btn.allowAll": "\u0623\u0648 \u0627\u0633\u0645\u062D \u0644\u0635\u062F\u0649 \u0628\u0643\u0644 \u0627\u0644\u0645\u0648\u0627\u0642\u0639",
  "ask.status.dl": "\u062C\u0627\u0631\u064D \u062A\u0646\u0632\u064A\u0644 \u0646\u0645\u0648\u0630\u062C \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0645\u062D\u0644\u064A \u0641\u064A Chrome ({p}%)\u060C \u0641\u064A \u0627\u0644\u0645\u0631\u0629 \u0627\u0644\u0623\u0648\u0644\u0649 \u0641\u0642\u0637\u2026",
  "ask.missing": "\u0645\u0627 \u0644\u0627 \u064A\u062C\u062F\u0647 \u0627\u0644\u0639\u0645\u064A\u0644 \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629:",
  "foot.oss": "\u0627\u0644\u0634\u064A\u0641\u0631\u0629 \u0627\u0644\u0645\u0635\u062F\u0631\u064A\u0629 (FSL-1.1)",
  "prob.lang": "\u0644\u0645 \u062A\u064F\u0639\u0644\u0646 \u0623\u064A \u0644\u063A\u0629 (<html lang>)",
  "prob.rtl": '\u0635\u0641\u062D\u0629 \u0639\u0631\u0628\u064A\u0629 \u062F\u0648\u0646 \u0627\u062A\u062C\u0627\u0647 \u0645\u0646 \u0627\u0644\u064A\u0645\u064A\u0646 \u0625\u0644\u0649 \u0627\u0644\u064A\u0633\u0627\u0631 (dir="rtl")',
  "prob.x-default": "\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u0633\u062E\u0629 x-default",
  "prob.self": "\u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629 \u0641\u064A \u0631\u0648\u0627\u0628\u0637 \u0627\u0644\u0644\u063A\u0627\u062A \u0627\u0644\u062E\u0627\u0635\u0629 \u0628\u0647\u0627",
  "none": "\u0644\u0627 \u0634\u064A\u0621",
  "indexable.t": "\u064A\u0645\u0643\u0646 \u0644\u0645\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0628\u062D\u062B \u0639\u0631\u0636 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629",
  "indexable.pass": "\u064A\u0645\u0643\u0646 \u0641\u0647\u0631\u0633\u0629 \u0627\u0644\u0635\u0641\u062D\u0629 \u0648\u0627\u0644\u0627\u0642\u062A\u0628\u0627\u0633 \u0645\u0646\u0647\u0627 \u0641\u064A \u0646\u062A\u0627\u0626\u062C \u0627\u0644\u0628\u062D\u062B \u0648\u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A.",
  "indexable.fail.noindex": "\u0627\u0644\u0635\u0641\u062D\u0629 \u062A\u062D\u0645\u0644 \xABnoindex\xBB: \u0633\u062A\u062D\u0630\u0641\u0647\u0627 Google \u0648Bing\u060C \u0641\u0644\u0627 \u064A\u0645\u0643\u0646 \u0623\u0646 \u062A\u0638\u0647\u0631 \u0641\u064A AI Overviews \u0623\u0648 AI Mode \u0623\u0648 Copilot.",
  "indexable.fail.nosnippet": "\u0627\u0644\u0635\u0641\u062D\u0629 \u062A\u0645\u0646\u0639 \u0627\u0644\u0645\u0642\u062A\u0637\u0641\u0627\u062A (\xABnosnippet\xBB \u0623\u0648 max-snippet:0). \u0645\u064A\u0632\u0627\u062A Google \u0644\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0644\u0627 \u062A\u0633\u062A\u062E\u062F\u0645 \u0625\u0644\u0627 \u0635\u0641\u062D\u0627\u062A \u062A\u0633\u0645\u062D \u0628\u0627\u0644\u0645\u0642\u062A\u0637\u0641.",
  "indexable.warn.canonical": "\u0627\u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u0623\u0633\u0627\u0633\u064A (canonical) \u064A\u0634\u064A\u0631 \u0625\u0644\u0649 \u0645\u0648\u0642\u0639 \u0622\u062E\u0631 ({host}). \u0642\u062F \u062A\u0639\u0631\u0636 \u0645\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0628\u062D\u062B \u062A\u0644\u0643 \u0627\u0644\u0635\u0641\u062D\u0629 \u0628\u062F\u0644\u064B\u0627 \u0645\u0646 \u0647\u0630\u0647.",
  "indexable.fix": "\u0623\u0632\u0644 noindex/nosnippet \u0645\u0646 \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0627\u0644\u062A\u064A \u062A\u0631\u064A\u062F \u0638\u0647\u0648\u0631\u0647\u0627 \u0641\u064A \u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A (\u0648\u0633\u0645 meta robots \u0623\u0648 \u062A\u0631\u0648\u064A\u0633\u0629 X-Robots-Tag). \u0623\u0628\u0642\u0650 \u0627\u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u0623\u0633\u0627\u0633\u064A \u0639\u0644\u0649 \u0646\u0637\u0627\u0642\u0643.",
  "indexable.fix.canonical": "\u0627\u062C\u0639\u0644 \u0627\u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A (canonical) \u064A\u0634\u064A\u0631 \u0625\u0644\u0649 \u0639\u0646\u0648\u0627\u0646 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629 \u0646\u0641\u0633\u0647\u0627 (\u0623\u0648 \u0625\u0644\u0649 \u0627\u0644\u0646\u0633\u062E\u0629 \u0639\u0644\u0649 \u0646\u0637\u0627\u0642\u0643 \u0623\u0646\u062A \u0627\u0644\u062A\u064A \u062A\u0631\u064A\u062F \u0638\u0647\u0648\u0631\u0647\u0627 \u0641\u064A \u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A).",
  "ai-bots.t": "\u0631\u0648\u0628\u0648\u062A\u0627\u062A \u0627\u0644\u0628\u062D\u062B \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u062A\u0635\u0644 \u0625\u0644\u0649 \u0627\u0644\u0635\u0641\u062D\u0629",
  "ai-bots.pass": "\u064A\u064F\u0633\u0645\u062D \u0644\u0643\u0644 \u0631\u0648\u0628\u0648\u062A\u0627\u062A \u0627\u0644\u0628\u062D\u062B \u0648\u0627\u0644\u0628\u062D\u062B \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0628\u0642\u0631\u0627\u0621\u0629 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629.",
  "ai-bots.pass.none": "\u0644\u0627 \u064A\u0648\u062C\u062F robots.txt: \u064A\u064F\u0633\u0645\u062D \u0644\u0643\u0644 \u0627\u0644\u0631\u0648\u0628\u0648\u062A\u0627\u062A \u0628\u0642\u0631\u0627\u0621\u0629 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629.",
  "ai-bots.fail": "\u0645\u062D\u062C\u0648\u0628\u0629 \u0641\u064A robots.txt: {blocked}. \u0647\u0630\u0647 \u0627\u0644\u0631\u0648\u0628\u0648\u062A\u0627\u062A \u062A\u0642\u0631\u0623 \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0644\u062A\u062C\u064A\u0628 \u0627\u0644\u0646\u0627\u0633\u060C \u0644\u0630\u0644\u0643 \u0644\u0627 \u064A\u0645\u0643\u0646\u0647\u0627 \u0627\u0644\u0627\u0633\u062A\u0634\u0647\u0627\u062F \u0628\u0643.",
  "ai-bots.extra": "\u0631\u0648\u0628\u0648\u062A\u0627\u062A \u062A\u062F\u0631\u064A\u0628 \u0645\u062D\u062C\u0648\u0628\u0629 (\u0627\u062E\u062A\u064A\u0627\u0631\u0643\u060C \u0648\u0644\u0627 \u064A\u0624\u062B\u0631 \u0639\u0644\u0649 \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A): {training}.",
  "ai-bots.fix": "\u0627\u0633\u0645\u062D \u0644\u0631\u0648\u0628\u0648\u062A\u0627\u062A \u0627\u0644\u0628\u062D\u062B (OAI-SearchBot \u0648ChatGPT-User \u0648PerplexityBot \u0648Claude-SearchBot \u0648Claude-User) \u0641\u064A robots.txt. \u064A\u0645\u0643\u0646\u0643 \u0645\u0648\u0627\u0635\u0644\u0629 \u062D\u062C\u0628 \u0631\u0648\u0628\u0648\u062A\u0627\u062A \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \u0645\u062B\u0644 GPTBot \u0648ClaudeBot \u0648Google-Extended.",
  "signals.t": "\u0625\u0634\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0648Cloudflare",
  "signals.warn": "\u0645\u0644\u0641 robots.txt \u0644\u062F\u064A\u0643 \u064A\u0642\u0648\u0644 search={search} \u0648ai-input={input} \u0648ai-train={train}. \u0627\u0644\u0642\u064A\u0645\u0629 \xABai-input=no\xBB \u062A\u0637\u0644\u0628 \u0645\u0646 \u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0639\u062F\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0635\u0641\u062D\u0627\u062A\u0643 \u0641\u064A \u0625\u062C\u0627\u0628\u0627\u062A\u0647\u0627.",
  "signals.info": "\u0625\u0634\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u062D\u062A\u0648\u0649: search={search}\u060C ai-input={input}\u060C ai-train={train}.",
  "signals.info.cf": "\u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0642\u0639 \u064A\u0639\u0645\u0644 \u0639\u0628\u0631 Cloudflare. \u0645\u0646\u0630 15 \u0633\u0628\u062A\u0645\u0628\u0631 2026 \u0635\u0627\u0631 \u062E\u064A\u0627\u0631\u0627 \xABBlock\xBB \u0648\xABBlock on pages with ads\xBB \u0644\u0644\u062A\u062F\u0631\u064A\u0628 \u064A\u0648\u0642\u0641\u0627\u0646 \u0623\u064A\u0636\u064B\u0627 Googlebot \u0648Bingbot \u0648Applebot \u0644\u0623\u0646\u0647\u0627 \u062A\u062C\u0645\u0639 \u0627\u0644\u0628\u062D\u062B \u0648\u0627\u0644\u062A\u062F\u0631\u064A\u0628. \u0644\u0631\u0641\u0636 \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \u0645\u0639 \u0627\u0644\u0628\u0642\u0627\u0621 \u0641\u064A \u0627\u0644\u0628\u062D\u062B: \xABDisallow AI Training\xBB (Cloudflare \u2190 Security \u2190 AI crawlers).",
  "signals.skip": "\u0644\u0645 \u064A\u064F\u0639\u062B\u0631 \u0639\u0644\u0649 \u0625\u0634\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u062D\u062A\u0648\u0649.",
  "signals.fix": "\u0627\u0636\u0628\u0637 \xABContent-Signal: search=yes, ai-input=yes, ai-train=no\xBB \u0625\u0646 \u0623\u0631\u062F\u062A \u0623\u0646 \u062A\u0633\u062A\u062E\u062F\u0645 \u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0635\u0641\u062D\u0627\u062A\u0643 \u062F\u0648\u0646 \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \u0639\u0644\u064A\u0647\u0627. \u0639\u0644\u0649 Cloudflare \u0627\u0631\u0641\u0636 \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \u0628\u062E\u064A\u0627\u0631 \xABDisallow AI Training\xBB \u0644\u0627 \xABBlock\xBB (\u0627\u0644\u0630\u064A \u064A\u0648\u0642\u0641 Googlebot \u0623\u064A\u0636\u064B\u0627).",
  "js-content.t": "\u0627\u0644\u0646\u0635 \u0645\u0648\u062C\u0648\u062F \u062F\u0648\u0646 JavaScript",
  "js-content.pass": "\u0627\u0644\u0646\u0635 \u0645\u0648\u062C\u0648\u062F \u0641\u064A HTML \u0627\u0644\u0630\u064A \u064A\u0631\u0633\u0644\u0647 \u0627\u0644\u062E\u0627\u062F\u0645 ({raw} \u0645\u0646 {shown} \u0643\u0644\u0645\u0629): \u0627\u0644\u0632\u0648\u0627\u062D\u0641 \u0627\u0644\u062A\u064A \u0644\u0627 \u062A\u0634\u063A\u0651\u0644 JavaScript \u062A\u0631\u0627\u0647.",
  "js-content.warn": "{pct}% \u0641\u0642\u0637 \u0645\u0646 \u0627\u0644\u0646\u0635 ({raw} \u0645\u0646 {shown} \u0643\u0644\u0645\u0629) \u0645\u0648\u062C\u0648\u062F \u0641\u064A HTML \u0627\u0644\u0645\u064F\u0631\u0633\u0644. \u0643\u062B\u064A\u0631 \u0645\u0646 \u0632\u0648\u0627\u062D\u0641 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0644\u0627 \u062A\u0634\u063A\u0651\u0644 JavaScript \u0641\u062A\u0631\u0649 \u0635\u0641\u062D\u0629 \u0634\u0628\u0647 \u0641\u0627\u0631\u063A\u0629.",
  "js-content.skip": "\u0644\u0645 \u064A\u064F\u0641\u062D\u0635.",
  "js-content.fix": "\u0627\u0639\u0631\u0636 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0631\u0626\u064A\u0633\u064A \u0645\u0646 \u062C\u0647\u0629 \u0627\u0644\u062E\u0627\u062F\u0645 (SSR \u0623\u0648 \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u0645\u0633\u0628\u0642). \u0627\u0637\u0644\u0628 \u0645\u0646 \u0627\u0644\u0645\u0637\u0648\u0651\u0631 \u0645\u0642\u0627\u0631\u0646\u0629 \xAB\u0639\u0631\u0636 \u0627\u0644\u0645\u0635\u062F\u0631\xBB \u0628\u0645\u0627 \u062A\u0631\u0627\u0647.",
  "title-meta.t": "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0648\u0627\u0644\u0648\u0635\u0641",
  "title-meta.pass": "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 ({tlen} \u062D\u0631\u0641\u064B\u0627) \u0648\u0627\u0644\u0648\u0635\u0641 ({dlen} \u062D\u0631\u0641\u064B\u0627) \u0645\u0648\u062C\u0648\u062F\u0627\u0646.",
  "title-meta.warn": "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 {tlen} \u062D\u0631\u0641\u064B\u0627 \u0648\u0627\u0644\u0648\u0635\u0641 {dlen}. \u0627\u0644\u0623\u0641\u0636\u0644 \u0639\u0646\u0648\u0627\u0646 \u0645\u0646 30 \u0625\u0644\u0649 60 \u062D\u0631\u0641\u064B\u0627 \u0648\u0648\u0635\u0641 \u064A\u0642\u0648\u0644 \u0645\u0627 \u062A\u0642\u062F\u0645\u0647 \u0627\u0644\u0635\u0641\u062D\u0629.",
  "title-meta.fail": "\u0627\u0644\u0635\u0641\u062D\u0629 \u0628\u0644\u0627 \u0639\u0646\u0648\u0627\u0646.",
  "title-meta.fix": "\u0627\u0643\u062A\u0628 \u0639\u0646\u0648\u0627\u0646\u064B\u0627 \u064A\u0630\u0643\u0631 \u0627\u0644\u0639\u0631\u0636 \u0648\u0627\u0644\u0645\u0643\u0627\u0646 \u0623\u0648 \u0627\u0644\u062C\u0645\u0647\u0648\u0631 (\u0645\u062B\u0644\u064B\u0627 \xAB\u062F\u0627\u0631 \u0636\u064A\u0627\u0641\u0629 \u0639\u0644\u0649 \u0628\u0639\u062F 2 \u0643\u0645 \u0645\u0646 \u0627\u0644\u0634\u0627\u0637\u0626 \u0641\u064A \u0633\u064A\u062F\u064A \u0628\u0648\u0633\u0639\u064A\u062F | \u062F\u0627\u0631 \u0646\u0648\u0631\u0629\xBB) \u0648\u0648\u0635\u0641\u064B\u0627 \u0645\u0646 \u062C\u0645\u0644\u0629 \u0648\u0627\u062D\u062F\u0629.",
  "structure.t": "\u0639\u0646\u0627\u0648\u064A\u0646 \u0648\u0627\u0636\u062D\u0629",
  "structure.pass": "\u0639\u0646\u0648\u0627\u0646 \u0631\u0626\u064A\u0633\u064A \u0648\u0627\u062D\u062F \u0648{h2} \u0639\u0646\u0627\u0648\u064A\u0646 \u0623\u0642\u0633\u0627\u0645: \u0645\u0646 \u0627\u0644\u0633\u0647\u0644 \u062A\u0642\u0633\u064A\u0645\u0647\u0627 \u0625\u0644\u0649 \u0625\u062C\u0627\u0628\u0627\u062A.",
  "structure.warn": "{h1} \u0639\u0646\u0648\u0627\u0646 \u0631\u0626\u064A\u0633\u064A \u0648{h2} \u0639\u0646\u0627\u0648\u064A\u0646 \u0623\u0642\u0633\u0627\u0645. \u062A\u0633\u062A\u062E\u062F\u0645 \u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0639\u0646\u0627\u0648\u064A\u0646 \u0644\u0625\u064A\u062C\u0627\u062F \u0627\u0644\u062C\u0632\u0621 \u0627\u0644\u0630\u064A \u064A\u062C\u064A\u0628 \u0639\u0646 \u0627\u0644\u0633\u0624\u0627\u0644.",
  "structure.fail": "\u0644\u0627 \u064A\u0648\u062C\u062F \u0639\u0646\u0648\u0627\u0646 \u0631\u0626\u064A\u0633\u064A (H1).",
  "structure.fix": "\u0627\u0633\u062A\u062E\u062F\u0645 H1 \u0648\u0627\u062D\u062F\u064B\u0627 \u064A\u0642\u0648\u0644 \u0645\u0627 \u0647\u064A \u0627\u0644\u0635\u0641\u062D\u0629\u060C \u062B\u0645 \u0623\u0642\u0633\u0627\u0645 H2 \u062A\u0637\u0627\u0628\u0642 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u062A\u064A \u064A\u0637\u0631\u062D\u0647\u0627 \u0627\u0644\u0646\u0627\u0633.",
  "jsonld.t": "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u0638\u0645\u0629 \u0635\u0627\u0644\u062D\u0629",
  "jsonld.pass": "{blocks} \u0643\u062A\u0644\u0629 \u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0646\u0638\u0645\u0629 \u0635\u0627\u0644\u062D\u0629: {types}.",
  "jsonld.warn": "\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0646\u0638\u0645\u0629 (JSON-LD). \u0639\u0644\u0649 \u0627\u0644\u0622\u0644\u0627\u062A \u0623\u0646 \u062A\u062E\u0645\u0651\u0646 \u0627\u0644\u062D\u0642\u0627\u0626\u0642.",
  "jsonld.fail": "{bad} \u0643\u062A\u0644\u0629 \u0645\u0646 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u0638\u0645\u0629 \u0645\u0639\u0637\u0648\u0628\u0629 \u0648\u064A\u062A\u0645 \u062A\u062C\u0627\u0647\u0644\u0647\u0627: {error}",
  "jsonld.fix": "\u0623\u0636\u0641 JSON-LD (Organization \u0623\u0648 LocalBusiness \u0641\u064A \u0643\u0644 \u0635\u0641\u062D\u0629\u060C \u0645\u0639 \u0646\u0648\u0639 \u0627\u0644\u0635\u0641\u062D\u0629) \u0648\u0627\u062E\u062A\u0628\u0631\u0647 \u0628\u0623\u062F\u0627\u0629 \u0627\u062E\u062A\u0628\u0627\u0631 \u0627\u0644\u0646\u062A\u0627\u0626\u062C \u0627\u0644\u0645\u0646\u0633\u0651\u0642\u0629 \u0645\u0646 Google. \u062F\u0648\u0646 \u0645\u0628\u0627\u0644\u063A\u0629: \u062A\u0642\u0648\u0644 Google \u0625\u0646\u0647 \u0644\u064A\u0633 \u0634\u0631\u0637\u064B\u0627 \u062E\u0627\u0635\u064B\u0627 \u0644\u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A.",
  "entity.t": "\u0646\u0634\u0627\u0637\u0643 \u0627\u0644\u062A\u062C\u0627\u0631\u064A \u0643\u064A\u0627\u0646 \u0648\u0627\u0636\u062D",
  "entity.pass": "\xAB{name}\xBB \u0645\u0648\u0635\u0648\u0641\u060C \u0645\u0639 {same} \u0631\u0648\u0627\u0628\u0637 \u0625\u0644\u0649 \u062D\u0633\u0627\u0628\u0627\u062A\u0643 (sameAs).",
  "entity.warn": "\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0646\u0634\u0627\u0637 \u0627\u0644\u062A\u062C\u0627\u0631\u064A \u0646\u0627\u0642\u0635\u0629. \u0627\u0644\u0646\u0627\u0642\u0635: {missing}. \u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629: {same}.",
  "entity.fix": "\u0641\u064A \u062A\u0631\u0645\u064A\u0632 Organization/LocalBusiness \u0623\u0636\u0641 name \u0648url \u0648logo \u0648\u0631\u0648\u0627\u0628\u0637 sameAs \u0625\u0644\u0649 \u062D\u0633\u0627\u0628\u0627\u062A\u0643 \u0627\u0644\u062D\u0642\u064A\u0642\u064A\u0629 (LinkedIn\u060C \u0645\u0644\u0641 Google \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u060C Wikidata\u060C Clutch\u2026). \u0627\u0644\u0627\u0633\u0645 \u0648\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0646\u0641\u0633\u064A\u0647\u0645\u0627 \u0641\u064A \u0643\u0644 \u0645\u0643\u0627\u0646.",
  "page-type.t": "\u0646\u0648\u0639 \u0627\u0644\u0635\u0641\u062D\u0629 \u0645\u0648\u0635\u0648\u0641",
  "page-type.pass": "\u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629 ({kind}) \u0644\u0647\u0627 \u0627\u0644\u062A\u0631\u0645\u064A\u0632 \u0627\u0644\u0645\u0646\u0627\u0633\u0628 ({has}).",
  "page-type.warn": "\u062A\u0628\u062F\u0648 \u0647\u0630\u0647 \u0635\u0641\u062D\u0629 {kind}\u060C \u0644\u0643\u0646 \u0627\u0644\u062A\u0631\u0645\u064A\u0632 \u0627\u0644\u0645\u0646\u0627\u0633\u0628 \u063A\u0627\u0626\u0628 \u0623\u0648 \u0646\u0627\u0642\u0635 ({has}).",
  "page-type.skip": "\u0635\u0641\u062D\u0629 \u0639\u0627\u0645\u0629.",
  "page-type.fix": "\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A: Product \u0645\u0639 offers (\u0627\u0644\u0633\u0639\u0631\u060C \u0627\u0644\u0639\u0645\u0644\u0629\u060C \u0627\u0644\u062A\u0648\u0641\u0631). \u0627\u0644\u0645\u0642\u0627\u0644\u0627\u062A: Article \u0645\u0639 \u0627\u0644\u0643\u0627\u062A\u0628 \u0648\u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E.",
  "lang.t": "\u0627\u0644\u0644\u063A\u0629 \u0648\u0627\u0644\u0646\u0633\u062E",
  "lang.pass": "\u0627\u0644\u0644\u063A\u0629 \xAB{lang}\xBB \u0645\u064F\u0639\u0644\u0646\u0629\u061B {versions} \u0646\u0633\u062E\u0629 \u0628\u0644\u063A\u0629 \u0623\u062E\u0631\u0649 \u0645\u0631\u062A\u0628\u0637\u0629.",
  "lang.warn": "\u0646\u0633\u062E \u0627\u0644\u0644\u063A\u0627\u062A \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629: {problems}.",
  "lang.fail": "\u0645\u0634\u0643\u0644\u0629: {problems}. \u0642\u062F \u062A\u062E\u0637\u0626 \u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0641\u064A \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0644\u063A\u0629 \u0623\u0648 \u0627\u062A\u062C\u0627\u0647 \u0627\u0644\u0643\u062A\u0627\u0628\u0629.",
  "lang.fix": '\u0636\u0639 <html lang> \u0641\u064A \u0643\u0644 \u0635\u0641\u062D\u0629\u060C \u0648dir="rtl" \u0641\u064A \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0627\u0644\u0639\u0631\u0628\u064A\u0629\u060C \u0648\u0631\u0648\u0627\u0628\u0637 hreflang \u0628\u064A\u0646 \u0643\u0644 \u0627\u0644\u0646\u0633\u062E \u0628\u0645\u0627 \u0641\u064A\u0647\u0627 x-default \u0648\u0627\u0644\u0635\u0641\u062D\u0629 \u0646\u0641\u0633\u0647\u0627.',
  "answer-first.t": "\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u062A\u0623\u062A\u064A \u0623\u0648\u0644\u064B\u0627",
  "answer-first.pass": "\u0627\u0644\u0641\u0642\u0631\u0629 \u0627\u0644\u0623\u0648\u0644\u0649 \u0642\u0635\u064A\u0631\u0629 \u0648\u0645\u0628\u0627\u0634\u0631\u0629 ({words} \u0643\u0644\u0645\u0629).",
  "answer-first.warn": "\u0627\u0644\u0641\u0642\u0631\u0629 \u0627\u0644\u0623\u0648\u0644\u0649 \u0645\u0646 {words} \u0643\u0644\u0645\u0629. \u062A\u0641\u0636\u0651\u0644 \u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0627\u0644\u062A\u064A \u062A\u062C\u064A\u0628 \u0641\u064A \u0623\u0648\u0644 40 \u0625\u0644\u0649 60 \u0643\u0644\u0645\u0629.",
  "answer-first.fail": "\u0644\u0627 \u062A\u0648\u062C\u062F \u0641\u0642\u0631\u0629 \u0627\u0641\u062A\u062A\u0627\u062D\u064A\u0629 \u062A\u062D\u062A \u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0631\u0626\u064A\u0633\u064A.",
  "answer-first.fix": "\u0627\u0628\u062F\u0623 \u0628\u062C\u0645\u0644\u0629 \u0623\u0648 \u062C\u0645\u0644\u062A\u064A\u0646 \u062A\u062C\u064A\u0628\u0627\u0646 \u0645\u0628\u0627\u0634\u0631\u0629 \u0639\u0646 \u0627\u0644\u0633\u0624\u0627\u0644 \u0627\u0644\u0631\u0626\u064A\u0633\u064A: \u0645\u0627 \u0647\u0648\u060C \u0644\u0645\u0646\u060C \u0623\u064A\u0646\u060C \u0648\u0628\u0643\u0645.",
  "quotable.t": "\u062C\u0645\u0644 \u064A\u0645\u0643\u0646 \u0644\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0642\u062A\u0628\u0627\u0633\u0647\u0627",
  "quotable.pass": "{q} \u0645\u0646 {total} \u062C\u0645\u0644\u0629 \u064A\u0645\u0643\u0646 \u0627\u0642\u062A\u0628\u0627\u0633\u0647\u0627 \u0648\u062D\u062F\u0647\u0627.",
  "quotable.warn": "{q} \u0641\u0642\u0637 \u0645\u0646 {total} \u062C\u0645\u0644\u0629 \u064A\u0645\u0643\u0646 \u0627\u0642\u062A\u0628\u0627\u0633\u0647\u0627 \u0648\u062D\u062F\u0647\u0627.",
  "quotable.fail": "\u0644\u0627 \u062A\u0648\u062C\u062F \u062C\u0645\u0644\u0629 \u064A\u0645\u0643\u0646 \u0627\u0642\u062A\u0628\u0627\u0633\u0647\u0627 \u0648\u062D\u062F\u0647\u0627 (\u062A\u0645 \u0641\u062D\u0635 {total}).",
  "quotable.fix": "\u0627\u0643\u062A\u0628 \u062C\u0645\u0644\u064B\u0627 \u0645\u0633\u062A\u0642\u0644\u0629: \u0627\u0630\u0643\u0631 \u0627\u0644\u0641\u0627\u0639\u0644 (\u0644\u0627 \xAB\u0647\u0648\xBB \u0623\u0648 \xAB\u0646\u062D\u0646\xBB)\u060C \u0648\u0623\u0636\u0641 \u0645\u0639\u0644\u0648\u0645\u0629 (\u0631\u0642\u0645\u060C \u0645\u0643\u0627\u0646\u060C \u0633\u0639\u0631)\u060C \u0645\u0646 8 \u0625\u0644\u0649 35 \u0643\u0644\u0645\u0629. \u0627\u0644\u062A\u0638\u0644\u064A\u0644 \u064A\u0628\u064A\u0651\u0646 \u0627\u0644\u062C\u0645\u0644 \u0627\u0644\u0646\u0627\u062C\u062D\u0629.",
  "facts.t": "\u062D\u0642\u0627\u0626\u0642 \u0648\u0645\u0635\u0627\u062F\u0631",
  "facts.pass": "{numbers} \u0623\u0631\u0642\u0627\u0645 \u0648{sources} \u0631\u0627\u0628\u0637 \u0625\u0644\u0649 \u0645\u0635\u0627\u062F\u0631.",
  "facts.warn": "{numbers} \u0623\u0631\u0642\u0627\u0645 \u0648{sources} \u0631\u0627\u0628\u0637 \u0625\u0644\u0649 \u0645\u0635\u0627\u062F\u0631. \u0648\u062C\u062F\u062A \u062F\u0631\u0627\u0633\u0629 GEO \u0623\u0646 \u0627\u0644\u0625\u062D\u0635\u0627\u0621\u0627\u062A \u0648\u0627\u0644\u0627\u0642\u062A\u0628\u0627\u0633\u0627\u062A \u0648\u0627\u0644\u0645\u0635\u0627\u062F\u0631 \u0627\u0644\u0645\u0648\u062B\u0642\u0629 \u062A\u0631\u0641\u0639 \u0627\u0644\u0638\u0647\u0648\u0631 \u0641\u064A \u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A.",
  "facts.skip": "\u0627\u0644\u0635\u0641\u062D\u0629 \u0623\u0642\u0635\u0631 \u0645\u0646 \u0623\u0646 \u064A\u064F\u062D\u0643\u0645 \u0639\u0644\u064A\u0647\u0627.",
  "facts.fix": "\u0623\u0636\u0641 \u0623\u0631\u0642\u0627\u0645\u064B\u0627 \u0645\u0644\u0645\u0648\u0633\u0629 (\u0623\u0633\u0639\u0627\u0631\u060C \u0645\u0633\u0627\u0641\u0627\u062A\u060C \u062A\u0648\u0627\u0631\u064A\u062E\u060C \u0646\u062A\u0627\u0626\u062C) \u0648\u0631\u0648\u0627\u0628\u0637 \u0625\u0644\u0649 \u0645\u0635\u0627\u062F\u0631\u0647\u0627.",
  "faq.t": "\u0625\u062C\u0627\u0628\u0627\u062A \u0639\u0646 \u0623\u0633\u0626\u0644\u0629 \u062D\u0642\u064A\u0642\u064A\u0629",
  "faq.pass": "\u0648\u064F\u062C\u062F {n} \u0642\u0633\u0645 \u0628\u0635\u064A\u063A\u0629 \u0633\u0624\u0627\u0644.",
  "faq.warn": "\u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u0642\u0633\u0627\u0645 \u0628\u0635\u064A\u063A\u0629 \u0633\u0624\u0627\u0644. \u064A\u0637\u0631\u062D \u0627\u0644\u0646\u0627\u0633 \u0623\u0633\u0626\u0644\u0629 \u0639\u0644\u0649 \u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A\u060C \u0648\u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0627\u0644\u062A\u064A \u062A\u062C\u064A\u0628 \u0639\u0646\u0647\u0627 \u0645\u0628\u0627\u0634\u0631\u0629 \u0623\u0633\u0647\u0644 \u0627\u0633\u062A\u062E\u062F\u0627\u0645\u064B\u0627.",
  "faq.skip": "\u0627\u0644\u0635\u0641\u062D\u0629 \u0623\u0642\u0635\u0631 \u0645\u0646 \u0623\u0646 \u064A\u064F\u062D\u0643\u0645 \u0639\u0644\u064A\u0647\u0627.",
  "faq.fix": "\u0623\u0636\u0641 \u0645\u0646 3 \u0625\u0644\u0649 6 \u0623\u0633\u0626\u0644\u0629 \u064A\u0637\u0631\u062D\u0647\u0627 \u0639\u0645\u0644\u0627\u0624\u0643 \u0641\u0639\u0644\u064B\u0627\u060C \u0644\u0643\u0644 \u0645\u0646\u0647\u0627 \u0625\u062C\u0627\u0628\u0629 \u0642\u0635\u064A\u0631\u0629 \u0648\u0645\u0628\u0627\u0634\u0631\u0629. \u062A\u0631\u0645\u064A\u0632 FAQ \u0627\u062E\u062A\u064A\u0627\u0631\u064A.",
  "fresh.t": "\u0645\u062D\u062F\u0651\u062B\u0629 \u0628\u0634\u0643\u0644 \u0648\u0627\u0636\u062D",
  "fresh.pass": "\u0622\u062E\u0631 \u062A\u0627\u0631\u064A\u062E \u0648\u064F\u062C\u062F: {date} (\u0645\u0646\u0630 {days} \u064A\u0648\u0645\u064B\u0627).",
  "fresh.warn": "\u0644\u0645 \u064A\u064F\u0639\u062B\u0631 \u0639\u0644\u0649 \u062A\u0627\u0631\u064A\u062E\u060C \u0623\u0648 \u0623\u0646 \u0623\u062D\u062F\u062B\u0647 \u0623\u0642\u062F\u0645 \u0645\u0646 \u0639\u0627\u0645 ({date}). \u062A\u0641\u0636\u0651\u0644 \u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u062D\u062F\u064A\u062B \u0628\u0648\u0636\u0648\u062D.",
  "fresh.skip": "\u0627\u0644\u0635\u0641\u062D\u0629 \u0623\u0642\u0635\u0631 \u0645\u0646 \u0623\u0646 \u064A\u064F\u062D\u0643\u0645 \u0639\u0644\u064A\u0647\u0627.",
  "fresh.fix": "\u0627\u0639\u0631\u0636 \xAB\u0622\u062E\u0631 \u062A\u062D\u062F\u064A\u062B \u0641\u064A \u2026\xBB \u0641\u064A \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0627\u0644\u062A\u064A \u062A\u062A\u063A\u064A\u0631\u060C \u0648\u0627\u0636\u0628\u0637 dateModified \u0641\u064A \u0627\u0644\u062A\u0631\u0645\u064A\u0632 \u0639\u0646\u062F \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0641\u0639\u0644\u064A.",
  "media.t": "\u0635\u0648\u0631 \u0645\u0648\u0635\u0648\u0641\u0629",
  "media.pass": "\u0627\u0644\u0635\u0648\u0631 \u0627\u0644\u062A\u064A \u0644\u0647\u0627 \u0648\u0635\u0641 (\u0646\u0635 \u0628\u062F\u064A\u0644): {alt} \u0645\u0646 {total}.",
  "media.warn": "\u0627\u0644\u0635\u0648\u0631 \u0627\u0644\u062A\u064A \u0644\u0647\u0627 \u0648\u0635\u0641 (\u0646\u0635 \u0628\u062F\u064A\u0644): {alt} \u0641\u0642\u0637 \u0645\u0646 {total}.",
  "media.info": "\u0644\u0627 \u0635\u0648\u0631 \u0648\u0644\u0627 \u0641\u064A\u062F\u064A\u0648. \u062A\u0630\u0643\u0631 Google \u0627\u0644\u0635\u0648\u0631 \u0648\u0627\u0644\u0641\u064A\u062F\u064A\u0648\u0647\u0627\u062A \u0627\u0644\u062C\u064A\u062F\u0629 \u0636\u0645\u0646 \u0645\u0627 \u064A\u0633\u0627\u0639\u062F \u0641\u064A \u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0644\u062F\u064A\u0647\u0627.",
  "media.skip": "\u0644\u0627 \u062A\u0648\u062C\u062F \u0635\u0648\u0631.",
  "media.fix": "\u0635\u0650\u0641 \u0643\u0644 \u0635\u0648\u0631\u0629 \u0630\u0627\u062A \u0645\u0639\u0646\u0649 \u0641\u064A \u0646\u0635\u0647\u0627 \u0627\u0644\u0628\u062F\u064A\u0644\u060C \u0628\u0644\u063A\u0629 \u0627\u0644\u0635\u0641\u062D\u0629.",
  "agent-forms.t": "\u0646\u0645\u0627\u0630\u062C \u064A\u0633\u062A\u0637\u064A\u0639 \u0648\u0643\u0644\u0627\u0621 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0633\u062A\u062E\u062F\u0627\u0645\u0647\u0627",
  "agent-forms.pass": "\u0643\u0644 \u0627\u0644\u0646\u0645\u0627\u0630\u062C \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 ({n}: {kinds}) \u0645\u0648\u0635\u0648\u0641\u0629 \u0644\u0648\u0643\u0644\u0627\u0621 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A (WebMCP).",
  "agent-forms.info": "{tooled} \u0645\u0646 {n} \u0646\u0645\u0627\u0630\u062C \u0623\u0633\u0627\u0633\u064A\u0629 ({kinds}) \u0645\u0648\u0635\u0648\u0641\u0629 \u0644\u0648\u0643\u0644\u0627\u0621 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A. WebMCP \u062A\u062C\u0631\u0628\u0629 \u0641\u064A Chrome: \u0627\u0633\u062A\u0639\u062F\u0627\u062F \u0644\u0644\u0645\u0633\u062A\u0642\u0628\u0644.",
  "agent-forms.skip": "\u0644\u0627 \u064A\u0648\u062C\u062F \u0646\u0645\u0648\u0630\u062C \u0628\u062D\u062B \u0623\u0648 \u062D\u062C\u0632 \u0623\u0648 \u062A\u0648\u0627\u0635\u0644.",
  "agent-forms.fix": "\u0623\u0636\u0641 \u0627\u0644\u0633\u0645\u062A\u064A\u0646 toolname \u0648tooldescription \u0625\u0644\u0649 \u0646\u0645\u0627\u0630\u062C \u0627\u0644\u0628\u062D\u062B \u0648\u0627\u0644\u062D\u062C\u0632 \u0648\u0627\u0644\u062A\u0648\u0627\u0635\u0644 (\u0648\u0627\u062C\u0647\u0629 WebMCP \u0627\u0644\u062A\u0635\u0631\u064A\u062D\u064A\u0629)\u060C \u0643\u064A \u064A\u0645\u0644\u0623\u0647\u0627 \u0627\u0644\u0648\u0643\u064A\u0644 \u0646\u064A\u0627\u0628\u0629 \u0639\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645.",
  "agent-files.t": "\u0645\u0644\u0641\u0627\u062A \u0644\u0644\u0648\u0643\u0644\u0627\u0621 \u0648\u0627\u0644\u0645\u0637\u0648\u0651\u0631\u064A\u0646",
  "agent-files.pass": "\u0648\u064F\u062C\u062F: {found}.",
  "agent-files.info": "\u0644\u0645 \u064A\u064F\u0639\u062B\u0631 \u0639\u0644\u0649 llms.txt \u0623\u0648 \u0628\u0637\u0627\u0642\u0629 \u0648\u0643\u064A\u0644 \u0623\u0648 UCP \u0623\u0648 MCP. \u0627\u062E\u062A\u064A\u0627\u0631\u064A: \u062A\u0642\u0648\u0644 Google \u0625\u0646 llms.txt \u063A\u064A\u0631 \u0636\u0631\u0648\u0631\u064A \u0644\u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0644\u062F\u064A\u0647\u0627\u060C \u0648\u0644\u0645 \u062A\u062C\u062F \u0627\u0644\u062F\u0631\u0627\u0633\u0627\u062A \u0623\u062B\u0631\u064B\u0627 \u0644\u0647 \u0639\u0644\u0649 \u0627\u0644\u0627\u0633\u062A\u0634\u0647\u0627\u062F.",
  "agent-files.info.shop": "\u064A\u0628\u062F\u0648 \u0647\u0630\u0627 \u0645\u062A\u062C\u0631\u064B\u0627. \u0628\u0627\u0644\u0646\u0633\u0628\u0629 \u0644\u0648\u0643\u0644\u0627\u0621 \u0627\u0644\u062A\u0633\u0648\u0642\u060C \u062A\u0647\u0645 \u062E\u0644\u0627\u0635\u0627\u062A \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A (Google Merchant Center \u0648\u062E\u0644\u0627\u0635\u0629 \u0627\u0644\u062A\u062C\u0627\u0631\u0629 \u0645\u0646 OpenAI) \u0648\u0628\u0631\u0648\u062A\u0648\u0643\u0648\u0644 \u0627\u0644\u062A\u062C\u0627\u0631\u0629 \u0627\u0644\u0634\u0627\u0645\u0644 UCP \u0645\u0646 Google \u0623\u0643\u062B\u0631 \u0645\u0646 llms.txt.",
  "agent-files.fix": "\u0627\u0644\u0645\u062A\u0627\u062C\u0631: \u062E\u0644\u0627\u0635\u0627\u062A \u0645\u0646\u062A\u062C\u0627\u062A \u0643\u0627\u0645\u0644\u0629\u060C \u0648\u0627\u0637\u0651\u0644\u0639 \u0639\u0644\u0649 UCP/ACP. \u063A\u064A\u0631\u0647\u0627: llms.txt \u0625\u0636\u0627\u0641\u0629 \u0645\u0641\u064A\u062F\u0629 \u0644\u0644\u0645\u0637\u0648\u0651\u0631\u064A\u0646 \u0648\u0627\u0644\u0648\u0643\u0644\u0627\u0621\u060C \u0648\u0644\u064A\u0633 \u0639\u0627\u0645\u0644 \u062A\u0631\u062A\u064A\u0628.",
  "tab.site": "\u0627\u0644\u0645\u0648\u0642\u0639",
  "copy": "\u0646\u0633\u062E",
  "copy.fail": "\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u0646\u0633\u062E: \u062D\u062F\u0651\u062F \u0627\u0644\u0646\u0635 \u0648\u0627\u0636\u063A\u0637 Ctrl+C.",
  "cta.quote.subj": "\u0639\u0631\u0636 \u0633\u0639\u0631 \u0645\u062E\u0635\u0651\u0635",
  "ask.pro.subj": "\u0645\u062A\u0627\u0628\u0639\u0629 \u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "learn.l2.subj": "\u0627\u0644\u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 2 \u0644\u0641\u0631\u064A\u0642\u0646\u0627",
  "team.site": "\u0643\u0644 \u0627\u0644\u0635\u0641\u062D\u0627\u062A\u060C \u0643\u0644 \u0623\u0633\u0628\u0648\u0639",
  "team.site.d": "\u0641\u062D\u0635 \u0627\u0644\u0645\u0648\u0642\u0639 \u0643\u0644\u0647 \u0623\u0633\u0628\u0648\u0639\u064A\u064B\u0627 (\u0644\u0627 30 \u0635\u0641\u062D\u0629 \u0641\u0642\u0637)\u060C \u0645\u0639 \u062A\u0646\u0628\u064A\u0647 \u0639\u0646\u062F\u0645\u0627 \u064A\u064F\u0641\u0633\u062F \u0642\u0627\u0644\u0628 \u0623\u0648 \u0645\u0644\u0641 robots.txt \u0634\u064A\u0626\u064B\u0627.",
  "team.impl": "\u0646\u062D\u0646 \u0646\u0637\u0628\u0651\u0642 \u0627\u0644\u0625\u0635\u0644\u0627\u062D\u0627\u062A",
  "team.impl.d": "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u0638\u0645\u0629\u060C \u0648\u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0644\u063A\u0648\u064A\u0629\u060C \u0648\u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0645\u0646 \u0627\u0644\u064A\u0645\u064A\u0646 \u0625\u0644\u0649 \u0627\u0644\u064A\u0633\u0627\u0631\u060C \u0648\u0627\u0644\u0639\u0631\u0636\u060C \u0648\u0627\u0644\u062C\u0627\u0647\u0632\u064A\u0629 \u0644\u0644\u0648\u0643\u0644\u0627\u0621\u060C \u0639\u0644\u0649 \u0643\u0644 \u0642\u0648\u0627\u0644\u0628\u0643 \u0645\u0639 \u0627\u0644\u062A\u062D\u0642\u0642.",
  "team.quote": "\u0643\u0644 \u0641\u0631\u064A\u0642 \u0645\u062E\u062A\u0644\u0641: \u0623\u062E\u0628\u0631\u0646\u0627 \u0628\u0645\u0648\u0627\u0642\u0639\u0643 \u0648\u0623\u0633\u0648\u0627\u0642\u0643 \u0648\u0623\u0647\u062F\u0627\u0641\u0643\u060C \u0648\u0646\u064F\u0639\u062F\u0651 \u0644\u0643 \u0639\u0631\u0636 \u0633\u0639\u0631 \u0645\u062E\u0635\u0651\u0635\u064B\u0627. \u0627\u0644\u0645\u0643\u0627\u0644\u0645\u0629 \u0627\u0644\u0623\u0648\u0644\u0649 \u0645\u062C\u0627\u0646\u064A\u0629.",
  "team.note": "\u0646\u0631\u063A\u0628 \u0641\u064A \u0639\u0631\u0636 \u0633\u0639\u0631 \u0645\u062E\u0635\u0651\u0635 \u0644\u0640 Sada Team.",
  "team.how": "\u0627\u062E\u062A\u0631 \u0645\u0648\u0639\u062F\u064B\u0627 \u0645\u0646 \u0627\u0644\u0627\u062B\u0646\u064A\u0646 \u0625\u0644\u0649 \u0627\u0644\u0633\u0628\u062A\u060C \u0645\u0646 9:00 \u0625\u0644\u0649 17:00 (\u0628\u062A\u0648\u0642\u064A\u062A \u0628\u0631\u0644\u064A\u0646). \u0646\u0624\u0643\u062F \u0628\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0639 \u0631\u0627\u0628\u0637 \u0627\u0644\u0641\u064A\u062F\u064A\u0648.",
  "hist.first": "\u0623\u0648\u0644 \u0641\u062D\u0635 \u0644\u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062C\u0647\u0627\u0632. \u0627\u0641\u062D\u0635 \u0645\u062C\u062F\u062F\u064B\u0627 \u0628\u0639\u062F \u062A\u0639\u062F\u064A\u0644\u0627\u062A\u0643 \u0644\u062A\u0631\u0649 \u0627\u0644\u062A\u0642\u062F\u0651\u0645.",
  "hist.up": "+{d} \u0645\u0646\u0630 {date} (\u0643\u0627\u0646\u062A {prev})",
  "hist.down": "\u2212{d} \u0645\u0646\u0630 {date} (\u0643\u0627\u0646\u062A {prev})",
  "hist.same": "\u0643\u0645\u0627 \u0641\u064A {date} ({prev})",
  "kit.title": "{n} \u0625\u0635\u0644\u0627\u062D\u0627\u062A \u062C\u0627\u0647\u0632\u0629",
  "kit.d": "\u0645\u0628\u0646\u064A\u0629 \u0645\u0645\u0627 \u0647\u0648 \u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0635\u0641\u062D\u062A\u0643. \u0627\u0646\u0633\u062E\u060C \u0648\u0623\u0643\u0645\u0644 \u0623\u062C\u0632\u0627\u0621 TODO\u060C \u0648\u0627\u0644\u0635\u0642. \u062B\u0645 \u0627\u0641\u062D\u0635 \u0645\u062C\u062F\u062F\u064B\u0627.",
  "kit.pro": "\u062A\u0631\u064A\u062F \u062A\u0637\u0628\u064A\u0642 \u0630\u0644\u0643 \u0639\u0644\u0649 \u0643\u0644 \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0648\u0627\u0644\u0642\u0648\u0627\u0644\u0628 \u0645\u0639 \u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631 \u0648\u0627\u0644\u062A\u062D\u0642\u0642\u061F AYKA \u062A\u062A\u0648\u0644\u0649 \u0630\u0644\u0643 \u0639\u0646\u0643.",
  "kit.pro.subj": "\u062A\u0637\u0628\u064A\u0642 \u0627\u0644\u0625\u0635\u0644\u0627\u062D\u0627\u062A",
  "fixk.robots-add.t": "robots.txt: \u0627\u0633\u0645\u062D \u0644\u0628\u062D\u062B \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "fixk.robots-add.where": "\u0623\u0636\u0641\u0647 \u0641\u064A \u0623\u0639\u0644\u0649 \u0645\u0644\u0641 robots.txt. \u0627\u0644\u0645\u062D\u0638\u0648\u0631\u0629 \u0627\u0644\u0622\u0646: {bots}. \u0625\u0646 \u0643\u0627\u0646\u062A \u0645\u062C\u0645\u0648\u0639\u0629 \xABUser-agent: *\xBB \u062A\u062D\u062A\u0648\u064A \u0623\u0633\u0637\u0631 Disallow \u062A\u0631\u064A\u062F \u0625\u0628\u0642\u0627\u0621\u0647\u0627 (\u0645\u062B\u0644 /admin) \u0641\u0627\u0646\u0633\u062E\u0647\u0627 \u0623\u064A\u0636\u064B\u0627 \u062A\u062D\u062A \u0647\u0630\u0647 \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0627\u062A.",
  "fixk.robots-new.t": "\u0645\u0644\u0641 robots.txt \u0644\u0628\u062D\u062B \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "fixk.robots-new.where": "\u0627\u062D\u0641\u0638\u0647 \u0628\u0627\u0633\u0645 robots.txt \u0641\u064A \u062C\u0630\u0631 \u0645\u0648\u0642\u0639\u0643 (yoursite.com/robots.txt). \u0639\u062F\u0651\u0644 \u0639\u0646\u0648\u0627\u0646 \u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0645\u0648\u0642\u0639.",
  "fixk.meta.t": "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0648\u0627\u0644\u0648\u0635\u0641",
  "fixk.meta.where": "\u0627\u0633\u062A\u0628\u062F\u0644 \u200E<title>\u200E \u0648\u0627\u0644\u0648\u0635\u0641 \u062F\u0627\u062E\u0644 \u200E<head>\u200E \u0641\u064A \u0627\u0644\u0635\u0641\u062D\u0629. \u0627\u062C\u0639\u0644 \u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0623\u0642\u0644 \u0645\u0646 60 \u062D\u0631\u0641\u064B\u0627 \u062A\u0642\u0631\u064A\u0628\u064B\u0627 \u0648\u064A\u0642\u0648\u0644 \u0645\u0627 \u0647\u064A \u0627\u0644\u0635\u0641\u062D\u0629.",
  "fixk.org.t": "\u0646\u0634\u0627\u0637\u0643 \u0627\u0644\u062A\u062C\u0627\u0631\u064A \u0643\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0646\u0638\u0645\u0629",
  "fixk.org.where": "\u0627\u0644\u0635\u0642\u0647 \u062F\u0627\u062E\u0644 \u200E<head>\u200E \u0641\u064A \u0627\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 (\u0623\u0648 \u0643\u0644 \u0627\u0644\u0635\u0641\u062D\u0627\u062A). \u0648\u064F\u062C\u062F {n} \u0631\u0627\u0628\u0637 \u0645\u0644\u0641 \u062A\u0639\u0631\u064A\u0641. \u0627\u0645\u0644\u0623 \u0643\u0644 TODO \u0628\u0627\u0644\u062D\u0642\u0627\u0626\u0642 \u0627\u0644\u0638\u0627\u0647\u0631\u0629 \u0641\u064A \u0627\u0644\u0635\u0641\u062D\u0629 \u0623\u0648 \u0627\u062D\u0630\u0641 \u0627\u0644\u0633\u0637\u0631.",
  "fixk.faq.t": "\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629 \u0643\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0646\u0638\u0645\u0629 ({n})",
  "fixk.faq.where": "\u0645\u0628\u0646\u064a \u0645\u0646 \u0639\u0646\u0627\u0648\u064a\u0646 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0641\u064a \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062d\u0629. \u0627\u062e\u062a\u064a\u0627\u0631\u064a: \u062a\u0648\u0642\u0641\u062a Google \u0639\u0646 \u0639\u0631\u0636 \u0646\u062a\u0627\u0626\u062c FAQ \u0627\u0644\u0645\u0646\u0633\u0651\u0642\u0629 \u0645\u0646\u0630 7 \u0645\u0627\u064a\u0648 2026\u060c \u0641\u0644\u0646 \u064a\u0645\u0646\u062d\u0643 \u0647\u0630\u0627 \u0627\u0644\u062a\u0631\u0645\u064a\u0632 \u0642\u0648\u0627\u0626\u0645 \u0645\u0646\u0633\u062f\u0644\u0629. \u0627\u0644\u0645\u0647\u0645 \u0647\u0648 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0648\u0627\u0644\u0623\u062c\u0648\u0628\u0629 \u0627\u0644\u0638\u0627\u0647\u0631\u0629.",
  "fixk.hreflang.t": "\u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0644\u063A\u0648\u064A\u0629 (hreflang)",
  "fixk.hreflang.where": "\u0636\u0639 \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0643\u0627\u0645\u0644\u0629 \u0646\u0641\u0633\u0647\u0627 \u0641\u064A \u200E<head>\u200E \u0644\u0643\u0644 \u0646\u0633\u062E\u0629 \u0644\u063A\u0648\u064A\u0629\u060C \u0628\u0645\u0627 \u0641\u064A\u0647\u0627 \u0627\u0644\u0635\u0641\u062D\u0629 \u0646\u0641\u0633\u0647\u0627 \u0648x-default.",
  "fixk.lang-attr.t": "\u0644\u063A\u0629 \u0627\u0644\u0635\u0641\u062D\u0629",
  "fixk.lang-attr.where": '\u0627\u0633\u062A\u0628\u062F\u0644 \u0648\u0633\u0645 \u200E<html>\u200E \u0627\u0644\u0627\u0641\u062A\u062A\u0627\u062D\u064A. \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u062A\u062D\u062A\u0627\u062C dir="rtl".',
  "fixk.fresh.t": "\u0623\u0638\u0647\u0631 \u062A\u0627\u0631\u064A\u062E \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0635\u0641\u062D\u0629",
  "fixk.fresh.where": "\u0636\u0639 \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0638\u0627\u0647\u0631 \u0623\u0639\u0644\u0649 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0623\u0648 \u0623\u0633\u0641\u0644\u0647\u060C \u0648\u0644\u0627 \u062A\u063A\u064A\u0651\u0631\u0647 \u0625\u0644\u0627 \u0639\u0646\u062F \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0635\u0641\u062D\u0629 \u0641\u0639\u0644\u064B\u0627.",
  "fixk.alt.t": "\u0635\u0648\u0631 \u0628\u0644\u0627 \u0648\u0635\u0641 ({n})",
  "fixk.alt.where": '\u0623\u0636\u0641 \u0646\u0635\u064B\u0627 \u0628\u062F\u064A\u0644\u064B\u0627 \u0644\u0643\u0644 \u0635\u0648\u0631\u0629 \u0645\u0646 \u0647\u0630\u0647 \u0627\u0644\u0635\u0648\u0631 \u0641\u064A \u0627\u0644\u0645\u062D\u0631\u0631 \u0623\u0648 HTML. \u0627\u0644\u0635\u0648\u0631 \u0627\u0644\u0632\u062E\u0631\u0641\u064A\u0629 \u064A\u0645\u0643\u0646 \u0623\u0646 \u062A\u0643\u0648\u0646 alt="".',
  "fixk.llms.t": "\u0645\u0633\u0648\u062F\u0629 llms.txt (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)",
  "fixk.llms.where": "\u0627\u062E\u062A\u064A\u0627\u0631\u064A: \u0627\u062D\u0641\u0638\u0647 \u0628\u0627\u0633\u0645 \u200E/llms.txt\u200E. \u0645\u0641\u064A\u062F \u0644\u0644\u0645\u0637\u0648\u0651\u0631\u064A\u0646 \u0648\u0627\u0644\u0648\u0643\u0644\u0627\u0621\u061B \u062A\u0642\u0648\u0644 Google \u0625\u0646\u0647\u0627 \u0644\u0627 \u062A\u0633\u062A\u062E\u062F\u0645\u0647 \u0641\u064A \u0645\u0644\u062E\u0635\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A.",
  "rw.t": "\u0623\u0639\u062F \u0627\u0644\u0643\u062A\u0627\u0628\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "rw.d": "\u0646\u0633\u062E\u062A\u0627\u0646 \u0623\u0641\u0636\u0644 \u0645\u0646 \u0646\u0635\u0643 \u0623\u0646\u062A. \u0644\u0627 \u064A\u064F\u062E\u062A\u0631\u0639 \u0634\u064A\u0621: \u0627\u0644\u062D\u0642\u0627\u0626\u0642 \u0627\u0644\u0646\u0627\u0642\u0635\u0629 \u062A\u0638\u0647\u0631 \u0628\u064A\u0646 [\u0623\u0642\u0648\u0627\u0633] \u0644\u062A\u0645\u0644\u0623\u0647\u0627.",
  "rw.run": "\u0627\u0642\u062A\u0631\u062D \u0646\u0633\u062E\u062A\u064A\u0646",
  "rw.check": "\u062A\u062D\u0642\u0651\u0642 \u0645\u0646 \u0643\u0644 \u0645\u0639\u0644\u0648\u0645\u0629 \u0642\u0628\u0644 \u0627\u0644\u0646\u0634\u0631.",
  "mv.title": "\u0645\u0627 \u064A\u0641\u0647\u0645\u0647 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0639\u0646\u0643",
  "mv.d": "\u0627\u0644\u062D\u0642\u0627\u0626\u0642 \u0627\u0644\u062A\u064A \u062A\u0642\u0631\u0624\u0647\u0627 \u0627\u0644\u0622\u0644\u0629 \u0628\u062B\u0642\u0629 \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629\u060C \u0648\u0627\u0644\u062C\u0645\u0644 \u0627\u0644\u062A\u064A \u064A\u0645\u0643\u0646\u0647\u0627 \u0627\u0642\u062A\u0628\u0627\u0633\u0647\u0627 \u0643\u0645\u0627 \u0647\u064A.",
  "mv.name": "\u0627\u0644\u0627\u0633\u0645",
  "mv.type": "\u0627\u0644\u0646\u0648\u0639 (\u062A\u0631\u0645\u064A\u0632)",
  "mv.desc": "\u0627\u0644\u0648\u0635\u0641",
  "mv.logo": "\u0627\u0644\u0634\u0639\u0627\u0631",
  "mv.phone": "\u0627\u0644\u0647\u0627\u062A\u0641",
  "mv.address": "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 (\u062A\u0631\u0645\u064A\u0632)",
  "mv.profiles": "\u0645\u0644\u0641\u0627\u062A \u0645\u0631\u062A\u0628\u0637\u0629",
  "mv.rating": "\u0627\u0644\u062A\u0642\u064A\u064A\u0645",
  "mv.none": "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
  "mv.quotes": "\u0623\u0643\u062B\u0631 \u062C\u0645\u0644\u0643 \u0642\u0627\u0628\u0644\u064A\u0629 \u0644\u0644\u0627\u0642\u062A\u0628\u0627\u0633",
  "mv.noquotes": "\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u0639\u062F \u062C\u0645\u0644\u0629 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0627\u0642\u062A\u0628\u0627\u0633 \u0648\u062D\u062F\u0647\u0627. \u0631\u0627\u062C\u0639 \xAB\u062C\u0645\u0644 \u064A\u0645\u0643\u0646 \u0644\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0642\u062A\u0628\u0627\u0633\u0647\u0627\xBB.",
  "site.cta": "\u0627\u0641\u062D\u0635 \u0627\u0644\u0645\u0648\u0642\u0639 \u0643\u0644\u0647 \u0648\u0642\u0627\u0631\u0646 \u0628\u0645\u0646\u0627\u0641\u0633",
  "site.title": "\u0641\u062D\u0635 \u0627\u0644\u0645\u0648\u0642\u0639",
  "site.d": "\u064A\u0641\u062D\u0635 \u062D\u062A\u0649 {n} \u0635\u0641\u062D\u0629 \u0645\u0646 \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0642\u0639\u060C \u0645\u062E\u062A\u0627\u0631\u0629 \u0645\u0646 \u062E\u0631\u064A\u0637\u0629 \u0645\u0648\u0642\u0639\u0643 \u0639\u0628\u0631 \u0623\u0642\u0633\u0627\u0645\u0647\u060C \u0643\u0645\u0627 \u064A\u0642\u0631\u0624\u0647\u0627 \u0627\u0644\u0632\u0627\u062D\u0641. \u062F\u0627\u062E\u0644 \u0645\u062A\u0635\u0641\u062D\u0643\u060C \u062F\u0648\u0646 \u0645\u0644\u0641\u0627\u062A \u062A\u0639\u0631\u064A\u0641 \u0627\u0644\u0627\u0631\u062A\u0628\u0627\u0637.",
  "site.run": "\u0627\u0641\u062D\u0635 {n} \u0635\u0641\u062D\u0629",
  "site.again": "\u0627\u0641\u062D\u0635 \u0645\u062C\u062F\u062F\u064B\u0627",
  "site.busy": "\u062C\u0627\u0631\u064D \u0627\u0644\u0641\u062D\u0635\u2026 (\u062D\u062A\u0649 \u062F\u0642\u064A\u0642\u0629)",
  "site.none": "\u062A\u0639\u0630\u0651\u0631\u062A \u0642\u0631\u0627\u0621\u0629 \u0623\u064A \u0635\u0641\u062D\u0629. \u0627\u0641\u062A\u062D \u0635\u0641\u062D\u0629 \u0645\u0646 \u0627\u0644\u0645\u0648\u0642\u0639\u060C \u0648\u0627\u0646\u0642\u0631 \u0623\u064A\u0642\u0648\u0646\u0629 \u0635\u062F\u0649\u060C \u062B\u0645 \u0623\u0639\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629.",
  "site.avg": "\u0645\u062A\u0648\u0633\u0637 {n} \u0635\u0641\u062D\u0629 (\u0648\u064F\u062C\u062F\u062A {total})",
  "site.src.map": "\u0635\u0641\u062D\u0627\u062A \u0645\u0623\u062E\u0648\u0630\u0629 \u0645\u0646 \u062E\u0631\u064A\u0637\u0629 \u0645\u0648\u0642\u0639\u0643.",
  "site.src.links": "\u0644\u0627 \u062A\u0648\u062C\u062F \u062E\u0631\u064A\u0637\u0629 \u0645\u0648\u0642\u0639: \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0645\u0623\u062E\u0648\u0630\u0629 \u0645\u0646 \u0631\u0648\u0627\u0628\u0637 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629. \u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0645\u0648\u0642\u0639 \u062A\u0633\u0627\u0639\u062F \u0643\u0644 \u0627\u0644\u0632\u0648\u0627\u062D\u0641.",
  "site.band.high": "\u0642\u0648\u064A\u0629",
  "site.band.mid": "\u062A\u062D\u062A\u0627\u062C \u062A\u062D\u0633\u064A\u0646\u064B\u0627",
  "site.band.low": "\u0636\u0639\u064A\u0641\u0629",
  "site.common": "\u0645\u0634\u0643\u0644\u0627\u062A \u062A\u062A\u0643\u0631\u0631 \u0641\u064A \u0645\u0639\u0638\u0645 \u0627\u0644\u0635\u0641\u062D\u0627\u062A",
  "site.pages": "{n} \u0645\u0646 {of} \u0635\u0641\u062D\u0629",
  "site.weak": "\u0623\u0636\u0639\u0641 \u0627\u0644\u0635\u0641\u062D\u0627\u062A: \u0627\u0628\u062F\u0623 \u0647\u0646\u0627",
  "site.failed": "\u062A\u0639\u0630\u0651\u0631\u062A \u0642\u0631\u0627\u0621\u0629 {n} \u0635\u0641\u062D\u0629 (\u062E\u0637\u0623 \u0623\u0648 \u0644\u064A\u0633\u062A HTML).",
  "site.csv": "\u062A\u0646\u0632\u064A\u0644 \u0643\u062C\u062F\u0648\u0644 (CSV)",
  "site.pro": "\u0627\u0644\u0645\u0634\u0643\u0644\u0629 \u0627\u0644\u062A\u064A \u062A\u062A\u0643\u0631\u0631 \u0641\u064A \u0635\u0641\u062D\u0627\u062A \u0643\u062B\u064A\u0631\u0629 \u0645\u0635\u062F\u0631\u0647\u0627 \u0642\u0627\u0644\u0628: \u0625\u0635\u0644\u0627\u062D \u0648\u0627\u062D\u062F \u064A\u0635\u0644\u062D\u0647\u0627 \u0643\u0644\u0647\u0627. \u062A\u0641\u062D\u0635 AYKA \u0643\u0644 \u0635\u0641\u062D\u0629 \u0643\u0644 \u0623\u0633\u0628\u0648\u0639\u060C \u0648\u062A\u062C\u062F \u0627\u0644\u0642\u0627\u0644\u0628 \u0627\u0644\u0645\u0633\u0628\u0651\u0628 \u0648\u062A\u0635\u0644\u062D\u0647 \u0645\u0639\u0643.",
  "site.pro.subj": "GEO \u0644\u0644\u0645\u0648\u0642\u0639 \u0643\u0627\u0645\u0644\u064B\u0627",
  "site.note": "\u0641\u062D\u0635 \u0635\u062F\u0649: {n} \u0635\u0641\u062D\u0629\u060C \u0627\u0644\u0645\u062A\u0648\u0633\u0637 {avg}/100 ({total} \u0635\u0641\u062D\u0629 \u0641\u064A \u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0645\u0648\u0642\u0639).",
  "cmp.title": "\u0642\u0627\u0631\u0646 \u0628\u0645\u0646\u0627\u0641\u0633",
  "cmp.d": "\u0627\u0644\u0635\u0642 \u0635\u0641\u062D\u0629 \u0645\u0646\u0627\u0641\u0633 \u064A\u0638\u0647\u0631 \u0641\u064A \u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0628\u062F\u0644\u064B\u0627 \u0645\u0646\u0643. \u064A\u0637\u0644\u0628 \u0635\u062F\u0649 \u0625\u0630\u0646\u0643 \u0644\u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0642\u0639 \u0648\u062D\u062F\u0647\u060C \u0648\u064A\u0642\u0631\u0623 \u0627\u0644\u0635\u0641\u062D\u0629 \u0643\u0645\u0627 \u064A\u0642\u0631\u0624\u0647\u0627 \u0627\u0644\u0632\u0627\u062D\u0641\u060C \u0648\u064A\u064F\u0638\u0647\u0631 \u0623\u064A\u0646 \u064A\u062A\u0641\u0648\u0651\u0642 \u0639\u0644\u064A\u0643.",
  "cmp.url": "\u0635\u0641\u062D\u0629 \u0627\u0644\u0645\u0646\u0627\u0641\u0633",
  "cmp.run": "\u0642\u0627\u0631\u0646",
  "cmp.ahead": "\u0623\u064A\u0646 \u064A\u062A\u0641\u0648\u0651\u0642 \u0639\u0644\u064A\u0643",
  "cmp.yours": "\u0623\u064A\u0646 \u062A\u062A\u0641\u0648\u0651\u0642 \u0639\u0644\u064A\u0647",
  "cmp.bad": "\u0647\u0630\u0627 \u0644\u064A\u0633 \u0639\u0646\u0648\u0627\u0646 \u0648\u064A\u0628.",
  "cmp.denied": "\u062F\u0648\u0646 \u0625\u0630\u0646\u0643 \u0644\u0627 \u064A\u0633\u062A\u0637\u064A\u0639 \u0635\u062F\u0649 \u0642\u0631\u0627\u0621\u0629 \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0642\u0639. \u0644\u0645 \u064A\u064F\u0642\u0631\u0623 \u0634\u064A\u0621.",
  "cmp.fail": "\u062A\u0639\u0630\u0651\u0631\u062A \u0642\u0631\u0627\u0621\u0629 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629 (\u0645\u062D\u0638\u0648\u0631\u0629\u060C \u0623\u0648 \u062E\u0637\u0623\u060C \u0623\u0648 \u0644\u064A\u0633\u062A \u0635\u0641\u062D\u0629 \u0648\u064A\u0628).",
  "cmp.pro": "\u0635\u0641\u062D\u0629 \u0648\u0627\u062D\u062F\u0629 \u0645\u062C\u0631\u062F \u0644\u0642\u0637\u0629. \u062A\u062A\u0627\u0628\u0639 AYKA \u0645\u0646 \u064A\u0630\u0643\u0631\u0647 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0628\u062F\u0644\u064B\u0627 \u0645\u0646\u0643\u060C \u0648\u0623\u064A \u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u064A\u062B\u0642 \u0628\u0647\u0627 \u0644\u0630\u0644\u0643\u060C \u0648\u062A\u0636\u0639 \u062E\u0637\u0629 \u0644\u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0645\u0643\u0627\u0646\u0643.",
  "cmp.pro.subj": "\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u0646\u0627\u0641\u0633\u064A\u0646",
  "cmp.note": "\u0645\u0642\u0627\u0631\u0646\u0629 \u0635\u062F\u0649: \u0635\u0641\u062D\u062A\u0646\u0627 {you}/100\u060C \u0627\u0644\u0645\u0646\u0627\u0641\u0633 {them}/100 ({other}).",
  "guide.title": "\u062F\u0644\u064A\u0644 GEO \u0627\u0644\u0645\u064A\u062F\u0627\u0646\u064A",
  "guide.teaser": "\u062E\u0631\u0627\u0641\u0627\u062A \u0648\u062D\u0642\u0627\u0626\u0642\u060C \u0648\u0643\u0644 \u0632\u0627\u062D\u0641 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0645\u0639 \u0645\u0627 \u064A\u0641\u0639\u0644\u0647 \u062D\u0638\u0631\u0647 \u062D\u0642\u064B\u0627.",
  "guide.d": "\u0645\u0627 \u062A\u0648\u062B\u0651\u0642\u0647 \u0627\u0644\u0634\u0631\u0643\u0627\u062A \u0646\u0641\u0633\u0647\u0627\u060C \u0628\u0643\u0644\u0645\u0627\u062A \u0628\u0633\u064A\u0637\u0629. \u0643\u0644 \u062D\u0642\u064A\u0642\u0629 \u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0645\u0635\u062F\u0631\u0647\u0627.",
  "guide.myths": "\u062E\u0631\u0627\u0641\u0627\u062A \u0648\u062D\u0642\u0627\u0626\u0642",
  "guide.bots": "\u0632\u0648\u0627\u062D\u0641 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A: \u0645\u0646 \u0647\u0648 \u0645\u0646",
  "guide.bots.d": "\u0632\u0648\u0627\u062D\u0641 \xAB\u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A\xBB \u062A\u062C\u0644\u0628 \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0644\u0644\u0631\u062F \u0639\u0644\u0649 \u0627\u0644\u0646\u0627\u0633: \u062D\u0638\u0631\u0647\u0627 \u064A\u064F\u062E\u0631\u062C\u0643 \u0645\u0646 \u062A\u0644\u0643 \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A. \u0632\u0648\u0627\u062D\u0641 \xAB\u0627\u0644\u062A\u062F\u0631\u064A\u0628\xBB \u062A\u062C\u0645\u0639 \u0628\u064A\u0627\u0646\u0627\u062A \u0644\u0644\u0646\u0645\u0627\u0630\u062C: \u062D\u0638\u0631\u0647\u0627 \u0644\u0627 \u064A\u0641\u0639\u0644 \u0630\u0644\u0643.",
  "guide.bots.site": "\u200F\u2713 / \u2717 \u064A\u0628\u064A\u0651\u0646 \u0645\u0627 \u064A\u0633\u0645\u062D \u0628\u0647 \u0645\u0644\u0641 robots.txt \u0644\u0645\u0648\u0642\u0639 {host} \u0644\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u062A\u064A \u0641\u062D\u0635\u062A\u0647\u0627.",
  "guide.role.search": "\u0625\u062C\u0627\u0628\u0627\u062A",
  "guide.role.train": "\u062A\u062F\u0631\u064A\u0628",
  "guide.updated": "\u062A\u0645 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u062D\u0642\u0627\u0626\u0642 \u0641\u064A \u0648\u062B\u0627\u0626\u0642 \u0627\u0644\u0634\u0631\u0643\u0627\u062A \u0641\u064A \u0646\u0648\u0641\u0645\u0628\u0631 2026. \u0627\u0644\u0623\u0645\u0648\u0631 \u062A\u062A\u063A\u064A\u0631: \u0627\u0644\u0645\u0631\u062C\u0639 \u0647\u0648 \u0631\u0648\u0627\u0628\u0637 \u0627\u0644\u0645\u0635\u0627\u062F\u0631.",
  "myth.1.m": "\u062A\u062D\u062A\u0627\u062C \u0625\u0644\u0649 \u062A\u0631\u0645\u064A\u0632 \u062E\u0627\u0635 \u0623\u0648 \u0645\u0644\u0641 \u0644\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A (\u0645\u062B\u0644 llms.txt) \u0644\u062A\u0638\u0647\u0631 \u0641\u064A \u0645\u0644\u062E\u0635\u0627\u062A Google.",
  "myth.1.f": "\u062A\u0642\u0648\u0644 Google \u0625\u0646 \u0627\u0644\u0635\u0641\u062D\u0629 \u064A\u0643\u0641\u064A \u0623\u0646 \u062A\u0643\u0648\u0646 \u0645\u0641\u0647\u0631\u0633\u0629 \u0648\u0645\u0624\u0647\u0644\u0629 \u0644\u0639\u0631\u0636 \u0645\u0642\u062A\u0637\u0641. \u0644\u0627 \u0645\u062E\u0637\u0637 \u062E\u0627\u0635 \u0648\u0644\u0627 \u0645\u0644\u0641 \u0646\u0635\u064A \u0644\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A: \u0623\u0633\u0627\u0633\u064A\u0627\u062A \u0627\u0644\u0633\u064A\u0648 \u0627\u0644\u0645\u0639\u062A\u0627\u062F\u0629 \u0647\u064A \u0645\u0627 \u064A\u0647\u0645.",
  "myth.1.src": "https://developers.google.com/search/docs/appearance/ai-features",
  "myth.2.m": "\u062D\u0638\u0631 Google-Extended \u064A\u064F\u062E\u0631\u062C\u0643 \u0645\u0646 \u0645\u0644\u062E\u0635\u0627\u062A Google \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A.",
  "myth.2.f": "\u064A\u062A\u062D\u0643\u0645 Google-Extended \u0641\u064A \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0644\u062A\u062F\u0631\u064A\u0628 Gemini \u0648\u0627\u0644\u0625\u0633\u0646\u0627\u062F \u0641\u064A \u0645\u0646\u062A\u062C\u0627\u062A Google \u0623\u062E\u0631\u0649. \u0644\u0627 \u064A\u0624\u062B\u0631 \u0639\u0644\u0649 \u0638\u0647\u0648\u0631\u0643 \u0641\u064A \u0628\u062D\u062B Google: \u0645\u0644\u062E\u0635\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0648\u0648\u0636\u0639 AI \u064A\u062A\u0628\u0639\u0627\u0646 \u0636\u0648\u0627\u0628\u0637 \u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0645\u0639\u062A\u0627\u062F\u0629.",
  "myth.2.src": "https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers",
  "myth.3.m": "\u062D\u0638\u0631 GPTBot \u064A\u064F\u062E\u0631\u062C\u0643 \u0645\u0646 \u0628\u062D\u062B ChatGPT.",
  "myth.3.f": "\u064A\u062C\u0645\u0639 GPTBot \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062F\u0631\u064A\u0628. \u0623\u0645\u0627 \u0628\u062D\u062B ChatGPT \u0641\u064A\u0633\u062A\u062E\u062F\u0645 OAI-SearchBot. \u064A\u0645\u0643\u0646\u0643 \u0631\u0641\u0636 \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \u0648\u0627\u0644\u0628\u0642\u0627\u0621 \u0638\u0627\u0647\u0631\u064B\u0627: \u0627\u062D\u0638\u0631 GPTBot \u0648\u0627\u0633\u0645\u062D \u0644\u0640 OAI-SearchBot.",
  "myth.3.src": "https://platform.openai.com/docs/bots",
  "myth.4.m": "\u062D\u0638\u0631 Cloudflare \u0644\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0644\u0627 \u064A\u0645\u0633\u0651 Google \u0623\u0628\u062F\u064B\u0627.",
  "myth.4.f": "\u0645\u0646\u0630 15 \u0633\u0628\u062A\u0645\u0628\u0631 2026 \u0635\u0627\u0631 \u062E\u064A\u0627\u0631\u0627 \xABBlock\xBB \u0648\xABBlock on pages with ads\xBB \u0644\u062A\u062F\u0631\u064A\u0628 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0641\u064A Cloudflare \u064A\u0648\u0642\u0641\u0627\u0646 \u0623\u064A\u0636\u064B\u0627 \u0627\u0644\u0632\u0648\u0627\u062D\u0641 \u0627\u0644\u062A\u064A \u062A\u062C\u0645\u0639 \u0627\u0644\u0628\u062D\u062B \u0648\u0627\u0644\u062A\u062F\u0631\u064A\u0628: Googlebot \u0648Bingbot \u0648Applebot. \u0644\u0631\u0641\u0636 \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \u0645\u0639 \u0627\u0644\u0628\u0642\u0627\u0621 \u0641\u064A \u0627\u0644\u0628\u062D\u062B\u060C \u062E\u064A\u0627\u0631 Cloudflare \u0647\u0648 \xABDisallow AI Training\xBB.",
  "myth.4.src": "https://blog.cloudflare.com/accountable-mixed-use-ai-crawlers",
  "myth.5.m": "nosnippet \u064A\u062E\u0641\u064A \u0641\u0642\u0637 \u0627\u0644\u0646\u0635 \u0627\u0644\u0631\u0645\u0627\u062F\u064A \u062A\u062D\u062A \u0631\u0627\u0628\u0637\u064A.",
  "myth.5.f": "\u062A\u0637\u0628\u0651\u0642 Google \u0636\u0648\u0627\u0628\u0637 \u0627\u0644\u0645\u0639\u0627\u064A\u0646\u0629 \u0646\u0641\u0633\u0647\u0627 \u0639\u0644\u0649 \u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A: nosnippet \u0648data-nosnippet \u0648max-snippet \u062A\u062D\u062F\u0651 \u0645\u0645\u0627 \u062A\u0633\u062A\u062E\u062F\u0645\u0647 \u0627\u0644\u0645\u0644\u062E\u0635\u0627\u062A \u0648\u0648\u0636\u0639 AI \u0645\u0646 \u0635\u0641\u062D\u062A\u0643.",
  "myth.5.src": "https://developers.google.com/search/blog/2025/05/succeeding-in-ai-search",
  "myth.6.m": "\u0643\u0644\u0645\u0627\u062A \u0645\u0641\u062A\u0627\u062D\u064A\u0629 \u0623\u0643\u062B\u0631 \u062A\u0639\u0646\u064A \u0638\u0647\u0648\u0631\u064B\u0627 \u0623\u0643\u0628\u0631 \u0641\u064A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A.",
  "myth.6.f": "\u0641\u064A \u062F\u0631\u0627\u0633\u0629 GEO \u200F(KDD 2024) \u0644\u0645 \u064A\u064F\u0641\u062F \u062D\u0634\u0648 \u0627\u0644\u0643\u0644\u0645\u0627\u062A \u0627\u0644\u0645\u0641\u062A\u0627\u062D\u064A\u0629. \u0623\u0645\u0627 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0625\u062D\u0635\u0627\u0621\u0627\u062A \u0648\u0627\u0644\u0627\u0642\u062A\u0628\u0627\u0633\u0627\u062A \u0648\u0627\u0644\u0645\u0635\u0627\u062F\u0631 \u0641\u0631\u0641\u0639\u062A \u0627\u0644\u0638\u0647\u0648\u0631 \u0641\u064A \u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0628\u0645\u0627 \u064A\u0635\u0644 \u0625\u0644\u0649 \u0646\u062D\u0648 40%.",
  "myth.6.src": "https://arxiv.org/abs/2311.09735",
  "myth.7.m": "\u062A\u0631\u0645\u064A\u0632 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629 \u064A\u0645\u0646\u062D\u0643 \u0645\u0631\u0628\u0639\u0627\u062A \u0623\u0633\u0626\u0644\u0629 \u0641\u064A Google.",
  "myth.7.f": "\u0645\u0646\u0630 2023 \u0644\u0627 \u062A\u0639\u0631\u0636 Google \u0646\u062A\u0627\u0626\u062C \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629 \u0627\u0644\u0645\u0646\u0633\u0651\u0642\u0629 \u0625\u0644\u0627 \u0644\u0645\u0648\u0627\u0642\u0639 \u062D\u0643\u0648\u0645\u064A\u0629 \u0648\u0635\u062D\u064A\u0629 \u0645\u0639\u0631\u0648\u0641\u0629. \u0644\u0643\u0646 \u0623\u0642\u0633\u0627\u0645 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0645\u0627 \u0632\u0627\u0644\u062A \u0645\u0641\u064A\u062F\u0629: \u062A\u062C\u064A\u0628 \u0628\u0635\u064A\u063A\u0629 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0627\u0642\u062A\u0628\u0627\u0633 \u0639\u0646 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u062A\u064A \u064A\u0637\u0631\u062D\u0647\u0627 \u0627\u0644\u0646\u0627\u0633 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0627\u062A.",
  "myth.7.src": "https://developers.google.com/search/blog/2023/08/howto-faq-changes",
  "myth.8.m": "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u0638\u0645\u0629 \u062A\u062C\u0639\u0644 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u064A\u0642\u062A\u0628\u0633 \u0645\u0646\u0643.",
  "myth.8.f": "\u062A\u0633\u0627\u0639\u062F \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u0638\u0645\u0629 \u0627\u0644\u0622\u0644\u0627\u062A \u0639\u0644\u0649 \u0642\u0631\u0627\u0621\u0629 \u062D\u0642\u0627\u0626\u0642\u0643 \u0648\u064A\u062C\u0628 \u0623\u0646 \u062A\u0637\u0627\u0628\u0642 \u0627\u0644\u0646\u0635 \u0627\u0644\u0638\u0627\u0647\u0631\u060C \u0644\u0643\u0646 Google \u062A\u0642\u0648\u0644 \u0625\u0646\u0647\u0627 \u063A\u064A\u0631 \u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0645\u064A\u0632\u0627\u062A\u0647\u0627 \u0648\u0644\u0627 \u062A\u0636\u0645\u0646 \u0634\u064A\u0626\u064B\u0627. \u0627\u0644\u0646\u0635 \u0627\u0644\u0648\u0627\u0636\u062D \u0627\u0644\u0645\u062D\u062F\u062F \u0627\u0644\u0642\u0627\u0628\u0644 \u0644\u0644\u0627\u0642\u062A\u0628\u0627\u0633 \u0645\u0647\u0645 \u0628\u0627\u0644\u0642\u062F\u0631 \u0646\u0641\u0633\u0647.",
  "myth.8.src": "https://developers.google.com/search/blog/2025/05/succeeding-in-ai-search"
};

// packages/core/src/i18n/de.ts
var de_default = {
  "app.tagline": "Ihr GEO-Teamkollege: wie KI-Assistenten diese Seite sehen und was zu tun ist.",
  "app.private": "Datenschutz eingebaut: Die Pr\xFCfungen laufen in Ihrem Browser. Nichts wird an AYKA gesendet.",
  "tab.check": "Pr\xFCfen",
  "tab.ask": "KI fragen",
  "tab.learn": "Lernen",
  "tab.team": "Team",
  "btn.check": "Diese Seite pr\xFCfen",
  "btn.recheck": "Erneut pr\xFCfen",
  "checking": "Seite wird gelesen\u2026",
  "perm.need": "Sada braucht Ihre Erlaubnis, diese Seite zu lesen (nur diese Website, nur wenn Sie klicken).",
  "perm.denied": "Ohne Erlaubnis kann Sada diese Seite nicht lesen. Es wurde nichts gelesen.",
  "perm.cant": "Diese Art von Seite l\xE4sst sich nicht pr\xFCfen (Browserseiten, Web Store, PDFs). \xD6ffnen Sie eine normale Webseite.",
  "cat.access": "Zugang",
  "cat.access.d": "K\xF6nnen Suchmaschinen und KI-Assistenten diese Seite erreichen und nutzen?",
  "cat.understand": "Verst\xE4ndnis",
  "cat.understand.d": "Erkennen Maschinen, was diese Seite und dieses Unternehmen sind?",
  "cat.cite": "Zitierbarkeit",
  "cat.cite.d": "Gibt es Inhalte, die eine KI-Antwort sicher zitieren kann?",
  "cat.agent": "Agentenbereit",
  "cat.agent.d": "K\xF6nnen KI-Agenten hier handeln (buchen, kaufen, anfragen)? Zukunftssicherung, nicht bewertet.",
  "status.pass": "Gut",
  "status.warn": "Verbessern",
  "status.fail": "Zuerst beheben",
  "status.info": "Hinweis",
  "status.skip": "Nicht zutreffend",
  "ev.official": "Offiziell",
  "ev.official.d": "Dokumentiert von Google, OpenAI, Anthropic, Perplexity, Microsoft oder Cloudflare.",
  "ev.research": "Studien",
  "ev.research.d": "Gest\xFCtzt durch Studien und das GEO-Paper (KDD 2024). Hilfreich, keine Garantie.",
  "ev.optional": "Optional",
  "ev.optional.d": "Zukunftssicherung. Laut Google f\xFCr seine KI-Funktionen nicht n\xF6tig. Z\xE4hlt nicht zur Bewertung.",
  "score": "GEO-Wert",
  "score.low": "Gro\xDFe L\xFCcken: KI-Assistenten tun sich mit dieser Seite schwer.",
  "score.mid": "Solide Basis, klare Verbesserungen m\xF6glich.",
  "score.high": "Stark: KI-Assistenten k\xF6nnen diese Seite lesen und zitieren.",
  "why": "Warum es wichtig ist",
  "fix": "Was zu tun ist",
  "source": "Quelle",
  "lesson": "60-Sekunden-Lektion",
  "show": "Auf der Seite zeigen",
  "heat.on": "Zitierbare S\xE4tze markieren",
  "heat.off": "Markierung ausblenden",
  "heat.legend": "Gr\xFCn: eine KI kann ihn so zitieren. Gelb: fast. Ohne Farbe: allein schwer zu zitieren.",
  "export": "Bericht herunterladen",
  "copied": "Kopiert",
  "found.prio": "Hier anfangen",
  "found.all": "Alle Pr\xFCfungen",
  "esc.title": "Das ist ein Projekt, keine kleine \xC4nderung",
  "esc.blocked": "KI-Suche ist blockiert",
  "esc.blocked.d": "Suchmaschinen oder KI-Such-Bots werden angewiesen, diese Seite nicht zu nutzen ({what}). Solange das so bleibt, z\xE4hlt der Rest der Seite f\xFCr KI-Antworten nicht. Oft ist es eine Zeile, aber die falsche Zeile kann auch Google aussperren: sorgf\xE4ltig pr\xFCfen.",
  "esc.schema": "Grundlage der strukturierten Daten",
  "esc.schema.d": "Die maschinenlesbaren Fakten zum Unternehmen fehlen oder sind fehlerhaft. Richtig gel\xF6st hei\xDFt: ein einheitlicher Faktensatz \xFCber alle Seitenvorlagen, verkn\xFCpft mit Ihren Profilen.",
  "esc.multilingual": "Sprachversionen",
  "esc.multilingual.d": "Die Spracheinrichtung ist unvollst\xE4ndig ({problems}). Falsche Sprachsignale schicken KI-Assistenten zur falschen Version oder zu keiner. Arabische Seiten (rechts nach links) brauchen besondere Sorgfalt.",
  "esc.rendering": "Inhalt hinter JavaScript versteckt",
  "esc.rendering.d": "Nur {pct} % des Textes stehen in der ausgelieferten Seite. Viele KI-Crawler f\xFChren kein JavaScript aus und sehen eine fast leere Seite. Das ist eine Aufgabe f\xFCr Entwickler: serverseitiges Rendern oder Pre-Rendering.",
  "esc.commerce": "Shop und KI-Agenten",
  "esc.commerce.d": "Das wirkt wie eine Produktseite ohne Produktdaten, die ein KI-Einkaufsassistent nutzen kann (Preis, Verf\xFCgbarkeit). Einkaufsagenten und Feeds brauchen das im ganzen Katalog.",
  "esc.foundation": "GEO-Grundlagen-Sprint",
  "esc.foundation.d": "Bei einem Wert von {score} verteilen sich die L\xFCcken auf Zugang, Struktur und Inhalt. Ein kurzer begleiteter Sprint behebt meist die Grundlagen der ganzen Website.",
  "esc.ask": "AYKA Technologies \xFCbernimmt genau diese Arbeit. Das Gespr\xE4ch ist kostenlos: Sie zeigen uns die Website, wir sagen Ihnen, was wir zuerst beheben w\xFCrden, und schicken Ihnen ein individuelles Angebot.",
  "cta.book": "Kostenloses 30-Min-Gespr\xE4ch buchen",
  "cta.email": "Individuelles Angebot anfragen",
  "cta.later": "Sp\xE4ter",
  "ask.running": "Denkt nach\u2026",
  "ask.pro": "Eine Frage, ein Modell, jetzt. AYKA kann Ihre wichtigsten Fragen jede Woche an ChatGPT, Gemini, Perplexity und Googles KI-\xDCbersichten stellen und Sie warnen, wenn sich eine Antwort \xE4ndert. Fragen Sie nach einem individuellen Angebot.",
  "learn.title": "GEO lernen, w\xE4hrend Sie arbeiten",
  "learn.d": "Zu jeder Pr\xFCfung gibt es eine 60-Sekunden-Lektion und eine Frage. Schlie\xDFen Sie alle 18 ab f\xFCr das Level-1-Abzeichen.",
  "learn.progress": "{done} von {total} Lektionen",
  "learn.badge": "Level 1 \xB7 GEO-Grundlagen: geschafft",
  "learn.badge.d": "Sie kennen die Grundlagen. Level 2 ist der zertifizierte Kurs f\xFCr Teams (mit Pr\xFCfung und \xFCberpr\xFCfbarem Zertifikat).",
  "learn.quiz": "Kurzer Check",
  "learn.right": "Richtig.",
  "learn.wrong": "Nicht ganz.",
  "learn.next": "N\xE4chste Lektion",
  "learn.l2": "Level-2-Zertifizierung f\xFCr Ihr Team",
  "learn.l2.d": "Zertifizierte GEO-Fachkraft: Kurs, Pr\xFCfung, Open-Badge-Zertifikat, Fortschritts-Dashboard f\xFCrs Team. Kann in den Nachweis der KI-Kompetenzschulung Ihres Teams einflie\xDFen (EU AI Act, Artikel 4).",
  "team.title": "F\xFCr Teams, die Ergebnisse wollen, nicht nur Checks",
  "team.d": "Alles in den anderen Tabs bleibt kostenlos. AYKA Technologies erg\xE4nzt, was unsere Leute, unsere Server oder unser Zertifikat braucht:",
  "team.track": "W\xF6chentliches Monitoring der KI-Antworten",
  "team.track.d": "Ihre wichtigsten Fragen bei ChatGPT, Gemini, Perplexity und Googles KI-\xDCbersichten, \xFCber offizielle APIs. Verlauf, Warnung bei Verlusten.",
  "team.comp": "Wen die KI statt Ihnen empfiehlt",
  "team.comp.d": "Wettbewerber in Ihren Antworten, die Websites, die sie zitieren, und was sie anders machen.",
  "team.dash": "Team-Dashboard und Berichte",
  "team.dash.d": "Alle Seiten und Personen an einem Ort, monatlicher PDF-Bericht, Zusammenfassung in Slack oder Teams.",
  "team.academy": "Akademie f\xFCr Ihr Team",
  "team.academy.d": "Zertifizierter GEO-Kurs auf Deutsch, Englisch, Franz\xF6sisch oder Arabisch, mit Fortschritt pro Person.",
  "team.agency": "F\xFCr Agenturen",
  "team.agency.d": "Kundenbereiche und White-Label-Berichte unter Ihrer Marke.",
  "set.title": "Einstellungen",
  "set.lang": "Sprache",
  "set.auto": "Automatisch",
  "rep.title": "GEO-Pr\xFCfung",
  "rep.by": "Gepr\xFCft mit Sada by AYKA: kostenlos, mit \xF6ffentlichem Quellcode.",
  "hint.icon": "Um diese Seite zu pr\xFCfen, klicken Sie auf das Sada-Symbol in der Symbolleiste (damit erh\xE4lt Sada nur Zugriff auf diese Seite).",
  "btn.allowAll": "Oder Sada auf allen Websites erlauben",
  "ask.status.dl": "Chromes KI-Modell f\xFCr dieses Ger\xE4t wird geladen ({p} %), nur beim ersten Mal\u2026",
  "ask.missing": "Was ein Kunde auf dieser Seite nicht findet:",
  "foot.oss": "Quellcode (FSL-1.1)",
  "prob.lang": "keine Sprache angegeben (<html lang>)",
  "prob.rtl": 'arabische Seite ohne Leserichtung von rechts nach links (dir="rtl")',
  "prob.x-default": "keine x-default-Version",
  "prob.self": "diese Seite fehlt in ihren eigenen Sprachlinks",
  "none": "keine",
  "indexable.t": "Suchmaschinen d\xFCrfen die Seite zeigen",
  "indexable.pass": "Die Seite kann indexiert und in Suchergebnissen und KI-Antworten zitiert werden.",
  "indexable.fail.noindex": "Die Seite sagt \u201Enoindex\u201C: Google und Bing entfernen sie, sie kann also nicht in AI Overviews, AI Mode oder Copilot erscheinen.",
  "indexable.fail.nosnippet": "Die Seite verbietet Snippets (\u201Enosnippet\u201C oder max-snippet:0). Googles KI-Funktionen nutzen nur Seiten, die ein Snippet erlauben.",
  "indexable.warn.canonical": "Der Canonical-Link zeigt auf eine andere Website ({host}). Suchmaschinen zeigen wom\xF6glich jene Seite statt dieser.",
  "indexable.fix": "Entfernen Sie noindex/nosnippet von Seiten, die in KI-Antworten erscheinen sollen (Meta-Robots-Tag oder X-Robots-Tag-Header). Behalten Sie den Canonical auf Ihrer eigenen Domain.",
  "indexable.fix.canonical": "Lassen Sie den Canonical-Link auf die Adresse dieser Seite zeigen (oder auf die Version auf Ihrer eigenen Domain, die in KI-Antworten erscheinen soll).",
  "ai-bots.t": "KI-Such-Bots erreichen die Seite",
  "ai-bots.pass": "Alle Such- und KI-Such-Bots d\xFCrfen diese Seite abrufen.",
  "ai-bots.pass.none": "Keine robots.txt: Alle Bots d\xFCrfen diese Seite abrufen.",
  "ai-bots.fail": "In robots.txt blockiert: {blocked}. Diese Bots rufen Seiten ab, um Menschen zu antworten: Sie k\xF6nnen also nicht zitiert werden.",
  "ai-bots.extra": "Blockierte Trainings-Bots (Ihre Wahl, ohne Einfluss auf Antworten): {training}.",
  "ai-bots.fix": "Erlauben Sie die Such-Bots (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot, Claude-User) in der robots.txt. Trainings-Bots wie GPTBot, ClaudeBot oder Google-Extended k\xF6nnen Sie weiter blockieren.",
  "signals.t": "Content Signals und Cloudflare",
  "signals.warn": "Ihre robots.txt sagt search={search}, ai-input={input}, ai-train={train}. \u201Eai-input=no\u201C bittet KI-Systeme, Ihre Seiten nicht in Antworten zu verwenden.",
  "signals.info": "Content Signals: search={search}, ai-input={input}, ai-train={train}.",
  "signals.info.cf": "Diese Website l\xE4uft \xFCber Cloudflare. Seit 15. September 2026 stoppen die Einstellungen \u201EBlock\u201C und \u201EBlock on pages with ads\u201C f\xFCr KI-Training auch Googlebot, Bingbot und Applebot, die Suche und Training kombinieren. Training ablehnen und in der Suche bleiben: \u201EDisallow AI Training\u201C (Cloudflare \u2192 Sicherheit \u2192 KI-Crawler).",
  "signals.skip": "Keine Content Signals gefunden.",
  "signals.fix": "Setzen Sie \u201EContent-Signal: search=yes, ai-input=yes, ai-train=no\u201C, wenn KI-Antworten Ihre Seiten nutzen, aber nicht damit trainieren sollen. Auf Cloudflare Training mit \u201EDisallow AI Training\u201C ablehnen, nicht mit \u201EBlock\u201C (das stoppt auch Googlebot).",
  "js-content.t": "Text ist ohne JavaScript vorhanden",
  "js-content.pass": "Der Text steht im HTML, das der Server ausliefert ({raw} von {shown} W\xF6rtern): Crawler ohne JavaScript sehen ihn.",
  "js-content.warn": "Nur {pct} % des Textes ({raw} von {shown} W\xF6rtern) stehen im ausgelieferten HTML. Viele KI-Crawler f\xFChren kein JavaScript aus und sehen eine fast leere Seite.",
  "js-content.skip": "Nicht gepr\xFCft.",
  "js-content.fix": "Rendern Sie den Hauptinhalt auf dem Server (SSR oder Pre-Rendering). Lassen Sie Ihren Entwickler \u201EQuelltext anzeigen\u201C mit der sichtbaren Seite vergleichen.",
  "title-meta.t": "Titel und Beschreibung",
  "title-meta.pass": "Titel ({tlen} Zeichen) und Beschreibung ({dlen} Zeichen) sind vorhanden.",
  "title-meta.warn": "Der Titel hat {tlen} Zeichen, die Beschreibung {dlen}. Ideal: ein Titel mit 30\u201360 Zeichen und eine Beschreibung, die das Angebot nennt.",
  "title-meta.fail": "Die Seite hat keinen Titel.",
  "title-meta.fix": "Schreiben Sie einen Titel, der Angebot und Ort oder Zielgruppe nennt (z. B. \u201EG\xE4stehaus 2 km vom Strand in Sidi Bou Said | Dar Noura\u201C), und eine Beschreibung in einem Satz.",
  "structure.t": "Klare \xDCberschriften",
  "structure.pass": "Eine Haupt\xFCberschrift und {h2} Abschnitts\xFCberschriften: leicht in Antworten zu zerlegen.",
  "structure.warn": "{h1} Haupt\xFCberschrift(en) und {h2} Abschnitts\xFCberschrift(en). KI-Systeme nutzen \xDCberschriften, um den Teil zu finden, der eine Frage beantwortet.",
  "structure.fail": "Keine Haupt\xFCberschrift (H1).",
  "structure.fix": "Eine H1, die sagt, worum es geht, dann H2-Abschnitte zu den Fragen, die Menschen stellen.",
  "jsonld.t": "Strukturierte Daten sind g\xFCltig",
  "jsonld.pass": "{blocks} g\xFCltige(r) Block/Bl\xF6cke strukturierter Daten: {types}.",
  "jsonld.warn": "Keine strukturierten Daten (JSON-LD). Maschinen m\xFCssen die Fakten raten.",
  "jsonld.fail": "{bad} Block/Bl\xF6cke strukturierter Daten sind fehlerhaft und werden ignoriert: {error}",
  "jsonld.fix": "F\xFCgen Sie JSON-LD hinzu (Organization oder LocalBusiness auf jeder Seite, dazu den Seitentyp) und testen Sie es mit Googles Test f\xFCr Rich-Suchergebnisse. Ohne \xDCbertreibung: Laut Google ist das keine Sonderanforderung f\xFCr KI-Funktionen.",
  "entity.t": "Ihr Unternehmen ist eine klare Entit\xE4t",
  "entity.pass": "\u201E{name}\u201C ist beschrieben, mit {same} Links zu Ihren Profilen (sameAs).",
  "entity.warn": "Die Unternehmensangaben sind unvollst\xE4ndig. Fehlt: {missing}. Verkn\xFCpfte Profile: {same}.",
  "entity.fix": "Im Organization/LocalBusiness-Markup name, url, logo und sameAs-Links zu Ihren echten Profilen erg\xE4nzen (LinkedIn, Google-Unternehmensprofil, Wikidata, Clutch\u2026). \xDCberall derselbe Name und dieselbe Adresse.",
  "page-type.t": "Der Seitentyp ist beschrieben",
  "page-type.pass": "Diese Seite ({kind}) hat passendes Markup ({has}).",
  "page-type.warn": "Das wirkt wie eine {kind}-Seite, aber das passende Markup fehlt oder ist unvollst\xE4ndig ({has}).",
  "page-type.skip": "Allgemeine Seite.",
  "page-type.fix": "Produkte: Product mit offers (Preis, W\xE4hrung, Verf\xFCgbarkeit). Artikel: Article mit Autor und Datum.",
  "lang.t": "Sprache und Versionen",
  "lang.pass": "Sprache \u201E{lang}\u201C angegeben; {versions} weitere Sprachversion(en) verkn\xFCpft.",
  "lang.warn": "Sprachversionen unvollst\xE4ndig: {problems}.",
  "lang.fail": "Problem: {problems}. KI-Systeme lesen Sprache oder Leserichtung wom\xF6glich falsch.",
  "lang.fix": 'Setzen Sie <html lang> auf jeder Seite, dir="rtl" auf arabischen Seiten und hreflang-Links zwischen allen Versionen, inklusive x-default und der Seite selbst.',
  "answer-first.t": "Die Antwort steht am Anfang",
  "answer-first.pass": "Der erste Absatz ist kurz und direkt ({words} W\xF6rter).",
  "answer-first.warn": "Der erste Absatz hat {words} W\xF6rter. KI-Antworten bevorzugen Seiten, die in den ersten 40\u201360 W\xF6rtern antworten.",
  "answer-first.fail": "Kein einleitender Absatz unter der Haupt\xFCberschrift.",
  "answer-first.fix": "Beginnen Sie mit ein oder zwei S\xE4tzen, die die Hauptfrage direkt beantworten: was, f\xFCr wen, wo, wie viel.",
  "quotable.t": "S\xE4tze, die eine KI zitieren kann",
  "quotable.pass": "{q} von {total} S\xE4tzen lassen sich allein zitieren.",
  "quotable.warn": "Nur {q} von {total} S\xE4tzen lassen sich allein zitieren.",
  "quotable.fail": "Kein Satz l\xE4sst sich allein zitieren ({total} gepr\xFCft).",
  "quotable.fix": "Schreiben Sie eigenst\xE4ndige S\xE4tze: Subjekt nennen (nicht \u201Ees\u201C oder \u201Ewir\u201C), eine Tatsache einbauen (Zahl, Ort, Preis), 8\u201335 W\xF6rter. Die Markierung zeigt, welche funktionieren.",
  "facts.t": "Fakten und Quellen",
  "facts.pass": "{numbers} Zahlen und {sources} Link(s) zu Quellen.",
  "facts.warn": "{numbers} Zahlen und {sources} Link(s) zu Quellen. Laut GEO-Studie erh\xF6hen Statistiken, Zitate und belegte Quellen die Sichtbarkeit in KI-Antworten.",
  "facts.skip": "Seite zu kurz f\xFCr eine Bewertung.",
  "facts.fix": "Konkrete Zahlen erg\xE4nzen (Preise, Entfernungen, Daten, Ergebnisse) und auf die Quellen verlinken.",
  "faq.t": "Antworten auf echte Fragen",
  "faq.pass": "{n} Abschnitte in Frageform gefunden.",
  "faq.warn": "Keine Abschnitte in Frageform. Menschen stellen KI-Assistenten Fragen; Seiten, die sie direkt beantworten, sind leichter nutzbar.",
  "faq.skip": "Seite zu kurz f\xFCr eine Bewertung.",
  "faq.fix": "Erg\xE4nzen Sie 3\u20136 Fragen, die Kunden wirklich stellen, jeweils mit kurzer, direkter Antwort. FAQ-Markup ist optional.",
  "fresh.t": "Sichtbar aktuell",
  "fresh.pass": "Letztes gefundenes Datum: {date} (vor {days} Tagen).",
  "fresh.warn": "Kein Datum gefunden oder das neueste ist \xFCber ein Jahr alt ({date}). KI-Antworten bevorzugen erkennbar aktuelle Inhalte.",
  "fresh.skip": "Seite zu kurz f\xFCr eine Bewertung.",
  "fresh.fix": "Zeigen Sie \u201EAktualisiert am \u2026\u201C auf Seiten, die sich \xE4ndern, und setzen Sie dateModified im Markup, wenn Sie wirklich aktualisieren.",
  "media.t": "Bilder beschrieben",
  "media.pass": "Bilder mit Beschreibung (Alt-Text): {alt} von {total}.",
  "media.warn": "Bilder mit Beschreibung (Alt-Text): nur {alt} von {total}.",
  "media.info": "Keine Bilder oder Videos. Google nennt gute Bilder und Videos unter dem, was in seinen KI-Funktionen hilft.",
  "media.skip": "Keine Bilder.",
  "media.fix": "Beschreiben Sie jedes aussagekr\xE4ftige Bild im Alt-Text, in der Sprache der Seite.",
  "agent-forms.t": "Formulare, die KI-Agenten nutzen k\xF6nnen",
  "agent-forms.pass": "Alle {n} wichtigen Formulare ({kinds}) sind f\xFCr KI-Agenten beschrieben (WebMCP).",
  "agent-forms.info": "{tooled} von {n} wichtigen Formularen ({kinds}) sind f\xFCr KI-Agenten beschrieben. WebMCP ist ein Chrome-Test: Zukunftssicherung.",
  "agent-forms.skip": "Kein Such-, Buchungs- oder Kontaktformular.",
  "agent-forms.fix": "Erg\xE4nzen Sie toolname- und tooldescription-Attribute an Such-, Buchungs- und Kontaktformularen (deklarative WebMCP-API), damit ein Agent sie f\xFCr Nutzer ausf\xFCllen kann.",
  "agent-files.t": "Dateien f\xFCr Agenten und Entwickler",
  "agent-files.pass": "Gefunden: {found}.",
  "agent-files.info": "Weder llms.txt noch Agent Card, UCP oder MCP gefunden. Optional: Laut Google ist llms.txt f\xFCr seine KI-Funktionen nicht n\xF6tig, Studien fanden keinen Effekt auf Zitierungen.",
  "agent-files.info.shop": "Das wirkt wie ein Shop. F\xFCr KI-Einkaufsagenten z\xE4hlen Produkt-Feeds (Google Merchant Center, OpenAIs Commerce-Feed) und Googles Universal Commerce Protocol mehr als llms.txt.",
  "agent-files.fix": "Shops: vollst\xE4ndige Produkt-Feeds, UCP/ACP ansehen. Andere: llms.txt ist ein Extra f\xFCr Entwickler und Agenten, kein Rankingfaktor.",
  "tab.site": "Website",
  "copy": "Kopieren",
  "copy.fail": "Kopieren nicht m\xF6glich: Text markieren und Strg+C dr\xFCcken.",
  "cta.quote.subj": "Individuelles Angebot",
  "ask.pro.subj": "KI-Antwort-Tracking",
  "learn.l2.subj": "Academy Level 2 f\xFCr unser Team",
  "team.site": "Jede Seite, jede Woche",
  "team.site.d": "Die ganze Website w\xF6chentlich gepr\xFCft (nicht nur 30 Seiten), mit Warnung, wenn eine Vorlage oder robots.txt etwas kaputt macht.",
  "team.impl": "Wir setzen die Fixes um",
  "team.impl.d": "Strukturierte Daten, Sprachversionen, Rechts-nach-links-Seiten, Rendering und Agent-Readiness, f\xFCr alle Vorlagen umgesetzt und gepr\xFCft.",
  "team.quote": "Jedes Team ist anders: Nennen Sie uns Ihre Websites, M\xE4rkte und Ziele, und wir erstellen ein individuelles Angebot. Das erste Gespr\xE4ch ist kostenlos.",
  "team.note": "Wir m\xF6chten ein individuelles Angebot f\xFCr Sada Team.",
  "team.how": "W\xE4hlen Sie einen Termin Montag bis Samstag, 9 bis 17 Uhr (Berliner Zeit). Wir best\xE4tigen per E-Mail mit Videolink.",
  "hist.first": "Erste Pr\xFCfung dieser Seite auf diesem Computer. Pr\xFCfen Sie nach Ihren \xC4nderungen erneut, um den Fortschritt zu sehen.",
  "hist.up": "+{d} seit {date} (vorher {prev})",
  "hist.down": "\u2212{d} seit {date} (vorher {prev})",
  "hist.same": "Wie am {date} ({prev})",
  "kit.title": "{n} fertige Fixes",
  "kit.d": "Aus dem gebaut, was schon auf Ihrer Seite steht. Kopieren, TODO-Stellen ausf\xFCllen, einf\xFCgen. Danach erneut pr\xFCfen.",
  "kit.pro": "Soll das auf jeder Seite und Vorlage umgesetzt, getestet und gepr\xFCft werden? AYKA erledigt das f\xFCr Sie.",
  "kit.pro.subj": "Umsetzung der Fixes",
  "fixk.robots-add.t": "robots.txt: KI-Suche zulassen",
  "fixk.robots-add.where": "Oben in robots.txt einf\xFCgen. Derzeit blockiert: {bots}. Hat Ihre Gruppe \u201EUser-agent: *\u201C Disallow-Zeilen, die bleiben sollen (z. B. /admin), kopieren Sie diese auch unter diese Gruppen.",
  "fixk.robots-new.t": "Eine robots.txt f\xFCr KI-Suche",
  "fixk.robots-new.where": "Als robots.txt im Stammverzeichnis speichern (ihreseite.de/robots.txt). Sitemap-Adresse anpassen.",
  "fixk.meta.t": "Titel und Beschreibung",
  "fixk.meta.where": "Ersetzen Sie <title> und Beschreibung im <head> der Seite. Titel unter etwa 60 Zeichen, der sagt, was die Seite ist.",
  "fixk.org.t": "Ihr Unternehmen als strukturierte Daten",
  "fixk.org.where": "In den <head> der Startseite (oder jeder Seite) einf\xFCgen. {n} Profil-Link(s) gefunden. Jedes TODO mit den sichtbaren Fakten der Seite f\xFCllen oder die Zeile l\xF6schen.",
  "fixk.faq.t": "FAQ als strukturierte Daten ({n} F&A)",
  "fixk.faq.where": "Aus den Fragen-\u00dcberschriften dieser Seite gebaut. Optional: Google zeigt seit 7. Mai 2026 keine FAQ-Rich-Results mehr, das Markup bringt also keine Aufklappfelder. Entscheidend sind die sichtbaren Fragen und Antworten.",
  "fixk.hreflang.t": "Sprachversionen (hreflang)",
  "fixk.hreflang.where": "Denselben vollst\xE4ndigen Satz in den <head> jeder Sprachversion, inklusive der Seite selbst und x-default.",
  "fixk.lang-attr.t": "Seitensprache",
  "fixk.lang-attr.where": 'Ersetzen Sie das \xF6ffnende <html>-Tag. Arabische Seiten brauchen dir="rtl".',
  "fixk.fresh.t": "Aktualisierungsdatum zeigen",
  "fixk.fresh.where": "Sichtbares Datum oben oder unten im Inhalt, und nur \xE4ndern, wenn Sie die Seite wirklich aktualisieren.",
  "fixk.alt.t": "Bilder ohne Beschreibung ({n})",
  "fixk.alt.where": 'F\xFCgen Sie jedem dieser Bilder im Editor oder HTML einen Alt-Text hinzu. Dekorative Bilder d\xFCrfen alt="" haben.',
  "fixk.llms.t": "Entwurf f\xFCr llms.txt (optional)",
  "fixk.llms.where": "Optional: als /llms.txt speichern. N\xFCtzlich f\xFCr Entwickler und Agenten; Google nutzt es laut eigener Aussage nicht f\xFCr KI-\xDCbersichten.",
  "rw.t": "Mit KI umschreiben",
  "rw.d": "Zwei bessere Fassungen Ihres eigenen Textes. Nichts wird erfunden: fehlende Fakten erscheinen als [Platzhalter] zum Ausf\xFCllen.",
  "rw.run": "2 Fassungen vorschlagen",
  "rw.check": "Pr\xFCfen Sie jeden Fakt vor dem Ver\xF6ffentlichen.",
  "mv.title": "Was KI \xFCber Sie versteht",
  "mv.d": "Die Fakten, die eine Maschine auf dieser Seite sicher lesen kann, und die S\xE4tze, die sie w\xF6rtlich zitieren kann.",
  "mv.name": "Name",
  "mv.type": "Typ (Markup)",
  "mv.desc": "Beschreibung",
  "mv.logo": "Logo",
  "mv.phone": "Telefon",
  "mv.address": "Adresse (Markup)",
  "mv.profiles": "Verkn\xFCpfte Profile",
  "mv.rating": "Bewertung",
  "mv.none": "fehlt",
  "mv.quotes": "Ihre zitierf\xE4higsten S\xE4tze",
  "mv.noquotes": "Noch kein Satz ist allein zitierf\xE4hig. Siehe \u201ES\xE4tze, die eine KI zitieren kann\u201C.",
  "site.cta": "Ganze Website scannen und mit Wettbewerber vergleichen",
  "site.title": "Website-Scan",
  "site.d": "Pr\xFCft bis zu {n} Seiten dieser Website, aus Ihrer Sitemap \xFCber alle Bereiche ausgew\xE4hlt, so wie ein Crawler sie liest. In Ihrem Browser, ohne Cookies.",
  "site.run": "{n} Seiten scannen",
  "site.again": "Erneut scannen",
  "site.busy": "Scan l\xE4uft\u2026 (bis zu einer Minute)",
  "site.none": "Keine Seite konnte gelesen werden. \xD6ffnen Sie eine Seite der Website, klicken Sie auf das Sada-Symbol und versuchen Sie es erneut.",
  "site.avg": "Durchschnitt aus {n} Seiten ({total} gefunden)",
  "site.src.map": "Seiten aus Ihrer Sitemap.",
  "site.src.links": "Keine Sitemap gefunden: Seiten aus den Links dieser Seite. Eine Sitemap hilft jedem Crawler.",
  "site.band.high": "stark",
  "site.band.mid": "ausbauf\xE4hig",
  "site.band.low": "schwach",
  "site.common": "Probleme, die die meisten Seiten teilen",
  "site.pages": "{n} von {of} Seiten",
  "site.weak": "Schw\xE4chste Seiten: hier anfangen",
  "site.failed": "{n} Seite(n) nicht lesbar (Fehler oder kein HTML).",
  "site.csv": "Als Tabelle herunterladen (CSV)",
  "site.pro": "Ein Problem auf vielen Seiten kommt aus einer Vorlage: ein Fix repariert alle. AYKA pr\xFCft jede Seite jede Woche, findet die Vorlage hinter jedem Problem und behebt es mit Ihnen.",
  "site.pro.subj": "GEO f\xFCr die ganze Website",
  "site.note": "Sada-Scan: {n} Seiten, Durchschnitt {avg}/100 ({total} Seiten in der Sitemap).",
  "cmp.title": "Mit einem Wettbewerber vergleichen",
  "cmp.d": "F\xFCgen Sie die Seite eines Wettbewerbers ein, der statt Ihnen in KI-Antworten erscheint. Sada fragt nur f\xFCr diese eine Website um Erlaubnis, liest die Seite wie ein Crawler und zeigt, wo er vorne liegt.",
  "cmp.url": "Seite des Wettbewerbers",
  "cmp.run": "Vergleichen",
  "cmp.ahead": "Wo er vorne liegt",
  "cmp.yours": "Wo Sie vorne liegen",
  "cmp.bad": "Das ist keine Webadresse.",
  "cmp.denied": "Ohne Ihre Erlaubnis kann Sada diese Website nicht lesen. Nichts wurde gelesen.",
  "cmp.fail": "Diese Seite konnte nicht gelesen werden (blockiert, Fehler oder keine Webseite).",
  "cmp.pro": "Eine Seite ist eine Momentaufnahme. AYKA verfolgt, wen KI statt Ihnen nennt, welchen Websites sie daf\xFCr vertraut, und erstellt den Plan, Ihren Platz zur\xFCckzuholen.",
  "cmp.pro.subj": "Wettbewerbsanalyse",
  "cmp.note": "Sada-Vergleich: unsere Seite {you}/100, Wettbewerber {them}/100 ({other}).",
  "guide.title": "GEO-Praxisleitfaden",
  "guide.teaser": "Mythen und Fakten, und jeder KI-Crawler mit dem, was eine Sperre wirklich bewirkt.",
  "guide.d": "Was die Anbieter selbst dokumentieren, in einfachen Worten. Jeder Fakt verlinkt seine Quelle.",
  "guide.myths": "Mythen und Fakten",
  "guide.bots": "KI-Crawler: wer ist wer",
  "guide.bots.d": "\u201EAntwort\u201C-Bots holen Seiten, um Menschen zu antworten: Sperren entfernt Sie aus diesen Antworten. \u201ETraining\u201C-Bots sammeln Daten f\xFCr Modelle: Sperren schadet dort nicht.",
  "guide.bots.site": "\u2713 / \u2717 zeigt, was die robots.txt von {host} f\xFCr die gepr\xFCfte Seite erlaubt.",
  "guide.role.search": "Antworten",
  "guide.role.train": "Training",
  "guide.updated": "Fakten im November 2026 mit der Anbieter-Dokumentation abgeglichen. Dinge \xE4ndern sich: ma\xDFgeblich sind die Quellen.",
  "myth.1.m": "Man braucht spezielles Markup oder eine KI-Datei (wie llms.txt), um in Googles KI-\xDCbersichten zu erscheinen.",
  "myth.1.f": "Laut Google muss eine Seite nur indexiert sein und ein Snippet zeigen d\xFCrfen. Kein spezielles Schema, keine KI-Textdatei: Es z\xE4hlen die \xFCblichen SEO-Grundlagen.",
  "myth.1.src": "https://developers.google.com/search/docs/appearance/ai-features",
  "myth.2.m": "Google-Extended zu sperren entfernt Sie aus den KI-\xDCbersichten.",
  "myth.2.f": "Google-Extended steuert die Nutzung f\xFCr Gemini-Training und Grounding in anderen Google-Produkten. Ihre Aufnahme in die Google-Suche \xE4ndert es nicht: KI-\xDCbersichten und KI-Modus folgen den normalen Such-Steuerungen.",
  "myth.2.src": "https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers",
  "myth.3.m": "GPTBot zu sperren entfernt Sie aus der ChatGPT-Suche.",
  "myth.3.f": "GPTBot sammelt Trainingsdaten. Die ChatGPT-Suche nutzt OAI-SearchBot. Sie k\xF6nnen Training ablehnen und trotzdem gefunden werden: GPTBot sperren, OAI-SearchBot erlauben.",
  "myth.3.src": "https://platform.openai.com/docs/bots",
  "myth.4.m": "Cloudflares KI-Sperre betrifft Google nie.",
  "myth.4.f": "Seit 15. September 2026 stoppen Cloudflares Einstellungen \u201EBlock\u201C und \u201EBlock on pages with ads\u201C f\xFCr KI-Training auch Crawler, die Suche und Training kombinieren: Googlebot, Bingbot und Applebot. Wer Training ablehnen und in der Suche bleiben will, nutzt Cloudflares Einstellung \u201EDisallow AI Training\u201C.",
  "myth.4.src": "https://blog.cloudflare.com/accountable-mixed-use-ai-crawlers",
  "myth.5.m": "nosnippet versteckt nur den grauen Text unter meinem Link.",
  "myth.5.f": "Google wendet dieselben Vorschau-Steuerungen auf seine KI-Funktionen an: nosnippet, data-nosnippet und max-snippet begrenzen, was KI-\xDCbersichten und KI-Modus von Ihrer Seite nutzen.",
  "myth.5.src": "https://developers.google.com/search/blog/2025/05/succeeding-in-ai-search",
  "myth.6.m": "Mehr Keywords bedeuten mehr KI-Sichtbarkeit.",
  "myth.6.f": "In der GEO-Studie (KDD 2024) half Keyword-Stuffing nicht. Statistiken, Zitate und belegte Quellen erh\xF6hten die Sichtbarkeit in KI-Antworten, um bis zu etwa 40 %.",
  "myth.6.src": "https://arxiv.org/abs/2311.09735",
  "myth.7.m": "FAQ-Markup bringt FAQ-Boxen in Google.",
  "myth.7.f": "Seit 2023 zeigt Google FAQ-Rich-Results nur f\xFCr bekannte Beh\xF6rden- und Gesundheitsseiten. FAQ-Abschnitte lohnen sich trotzdem: Sie beantworten die Fragen an KI-Assistenten in zitierf\xE4higer Form.",
  "myth.7.src": "https://developers.google.com/search/blog/2023/08/howto-faq-changes",
  "myth.8.m": "Strukturierte Daten sorgen daf\xFCr, dass KI Sie zitiert.",
  "myth.8.f": "Strukturierte Daten helfen Maschinen, Ihre Fakten zu lesen, und m\xFCssen zum sichtbaren Text passen. Laut Google sind sie f\xFCr die KI-Funktionen aber nicht n\xF6tig und garantieren nichts. Klarer, konkreter, zitierf\xE4higer Text z\xE4hlt genauso.",
  "myth.8.src": "https://developers.google.com/search/blog/2025/05/succeeding-in-ai-search"
};

// packages/core/src/i18n/en.ts
var en_default = {
  "app.tagline": "Your GEO teammate: how AI assistants see this page, and what to do about it.",
  "app.private": "Private by design: the checks run in your browser. Nothing is sent to AYKA.",
  "tab.check": "Check",
  "tab.ask": "Ask AI",
  "tab.learn": "Learn",
  "tab.team": "Team",
  "btn.check": "Check this page",
  "btn.recheck": "Check again",
  "checking": "Reading the page\u2026",
  "perm.need": "Sada needs your permission to read this page (only this site, only when you click).",
  "perm.denied": "Without permission Sada cannot read this page. Nothing was read.",
  "perm.cant": "This kind of page cannot be checked (browser pages, the Web Store, PDFs). Open a normal web page.",
  "cat.access": "Access",
  "cat.access.d": "Can search engines and AI assistants reach and use this page?",
  "cat.understand": "Understanding",
  "cat.understand.d": "Can machines tell what this page and business are?",
  "cat.cite": "Citability",
  "cat.cite.d": "Is there content an AI answer can quote with confidence?",
  "cat.agent": "Agent-ready",
  "cat.agent.d": "Can AI agents act here (book, buy, ask)? Future-proofing, not scored.",
  "status.pass": "Good",
  "status.warn": "Improve",
  "status.fail": "Fix first",
  "status.info": "Note",
  "status.skip": "Not applicable",
  "ev.official": "Official",
  "ev.official.d": "Documented by Google, OpenAI, Anthropic, Perplexity, Microsoft or Cloudflare.",
  "ev.research": "Evidence",
  "ev.research.d": "Supported by studies and the GEO paper (KDD 2024). Helpful, not a guarantee.",
  "ev.optional": "Optional",
  "ev.optional.d": "Future-proofing. Google says it is not needed for its AI features. Not counted in the score.",
  "score": "GEO score",
  "score.low": "Big gaps: AI assistants will struggle with this page.",
  "score.mid": "Solid base, clear wins left.",
  "score.high": "Strong: AI assistants can read and quote this page.",
  "why": "Why it matters",
  "fix": "What to do",
  "source": "Source",
  "lesson": "60-second lesson",
  "show": "Show on page",
  "heat.on": "Highlight quotable sentences",
  "heat.off": "Hide highlights",
  "heat.legend": "Green: an AI can quote it as is. Amber: almost. Unmarked: hard to quote alone.",
  "export": "Download report",
  "copied": "Copied",
  "found.prio": "Start here",
  "found.all": "All checks",
  "esc.title": "This is a project, not a quick edit",
  "esc.blocked": "AI search is blocked",
  "esc.blocked.d": "Search engines or AI search bots are told not to use this page ({what}). Until this changes, nothing else on the page matters for AI answers. It is often one line, but the wrong line can also block Google: worth a careful look.",
  "esc.schema": "Structured data foundation",
  "esc.schema.d": "The machine-readable facts about the business are broken or missing. Fixing it well means one consistent set of facts across every page template, connected to your profiles.",
  "esc.multilingual": "Language versions",
  "esc.multilingual.d": "The language set-up is incomplete ({problems}). Wrong language signals send AI assistants to the wrong version, or none. Arabic and right-to-left pages need special care.",
  "esc.rendering": "Content hidden behind JavaScript",
  "esc.rendering.d": "Only {pct}% of the text is in the page as delivered. Many AI crawlers do not run JavaScript, so they see an almost empty page. This is a developer task: server-side rendering or pre-rendering.",
  "esc.commerce": "Shopping and agent readiness",
  "esc.commerce.d": "This looks like a product page without product data an AI shopping assistant can use (price, availability). Shopping agents and feeds need this across the whole catalogue.",
  "esc.foundation": "GEO foundation sprint",
  "esc.foundation.d": "With a score of {score}, the gaps are spread across access, structure and content. A short guided sprint usually fixes the foundations for the whole site.",
  "esc.ask": "AYKA Technologies does this kind of work. The call is free: you show us the site, we tell you what we would fix first and send you a personalised quote.",
  "cta.book": "Book a free 30-min call",
  "cta.email": "Email for a personalised quote",
  "cta.later": "Not now",
  "ask.running": "Thinking\u2026",
  "ask.pro": "One question, one engine, right now. AYKA can ask your most important questions every week on ChatGPT, Gemini, Perplexity and Google AI Overviews, and alert you when an answer changes. Ask us for a personalised quote.",
  "learn.title": "Learn GEO while you work",
  "learn.d": "Each check has a 60-second lesson and one question. Finish all 18 for the Level 1 badge.",
  "learn.progress": "{done} of {total} lessons",
  "learn.badge": "Level 1 \xB7 GEO Basics: done",
  "learn.badge.d": "You know the foundations. Level 2 is the certified course for teams (with exam and verifiable certificate).",
  "learn.quiz": "Quick check",
  "learn.right": "Right.",
  "learn.wrong": "Not quite.",
  "learn.next": "Next lesson",
  "learn.l2": "Level 2 certification for your team",
  "learn.l2.d": "Certified GEO Practitioner: course, exam, Open Badge certificate, team progress dashboard. It can count towards your team's AI-literacy training record (EU AI Act, Article 4).",
  "team.title": "For teams that want results, not just checks",
  "team.d": "Everything on the other tabs stays free. AYKA Technologies adds what needs our people, our servers or our certificate:",
  "team.track": "Weekly AI answer tracking",
  "team.track.d": "Your key questions on ChatGPT, Gemini, Perplexity and Google AI Overviews, through official APIs. History, alerts when you drop.",
  "team.comp": "Who AI recommends instead of you",
  "team.comp.d": "Competitors named in your answers, the websites they are cited from, and what they do that you don't.",
  "team.dash": "Team dashboard and reports",
  "team.dash.d": "All your pages and people in one place, monthly PDF report, Slack or Teams digest.",
  "team.academy": "Academy for your team",
  "team.academy.d": "Certified GEO course in English, French, German or Arabic, with progress per person.",
  "team.agency": "For agencies",
  "team.agency.d": "Client workspaces and white-label reports under your brand.",
  "set.title": "Settings",
  "set.lang": "Language",
  "set.auto": "Automatic",
  "rep.title": "GEO check",
  "rep.by": "Checked with Sada by AYKA: free, with public source code.",
  "hint.icon": "To check this page, click the Sada icon in the browser toolbar (it gives Sada access to this page only).",
  "btn.allowAll": "Or allow Sada on all sites",
  "ask.status.dl": "Downloading Chrome's on-device AI model ({p}%), only the first time\u2026",
  "ask.missing": "What a customer can't find on this page:",
  "foot.oss": "Source code (FSL-1.1)",
  "prob.lang": "no language declared (<html lang>)",
  "prob.rtl": 'Arabic page without right-to-left direction (dir="rtl")',
  "prob.x-default": "no x-default version",
  "prob.self": "this page is missing from its own language links",
  "none": "none",
  "indexable.t": "Search engines may show this page",
  "indexable.pass": "The page can be indexed and quoted in search results and AI answers.",
  "indexable.fail.noindex": "The page says 'noindex': Google and Bing will drop it, so it cannot appear in AI Overviews, AI Mode or Copilot.",
  "indexable.fail.nosnippet": "The page forbids snippets ('nosnippet' or max-snippet:0). Google's AI features only use pages that may show a snippet.",
  "indexable.warn.canonical": "The canonical link points to another site ({host}). Search engines may show that page instead of this one.",
  "indexable.fix": "Remove noindex/nosnippet from pages you want in AI answers (meta robots tag or X-Robots-Tag header). Keep the canonical on your own domain.",
  "indexable.fix.canonical": "Point the canonical link to this page's own address (or to the version on your own domain you want shown in AI answers).",
  "ai-bots.t": "AI search bots can reach the page",
  "ai-bots.pass": "Every search and AI search bot may fetch this page.",
  "ai-bots.pass.none": "No robots.txt: every bot may fetch this page.",
  "ai-bots.fail": "Blocked in robots.txt: {blocked}. These bots fetch pages to answer people, so you cannot be cited by them.",
  "ai-bots.extra": "Training bots blocked (your choice, does not affect answers): {training}.",
  "ai-bots.fix": "Allow the search bots (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot, Claude-User) in robots.txt. You can still block training bots such as GPTBot, ClaudeBot or Google-Extended.",
  "signals.t": "Content Signals and Cloudflare",
  "signals.warn": "Your robots.txt says search={search}, ai-input={input}, ai-train={train}. 'ai-input=no' asks AI systems not to use your pages in their answers.",
  "signals.info": "Content Signals: search={search}, ai-input={input}, ai-train={train}.",
  "signals.info.cf": "This site runs on Cloudflare. Since 15 September 2026, Cloudflare's 'Block' and 'Block on pages with ads' settings for AI training also stop Googlebot, Bingbot and Applebot, which do search and training together. To refuse training but stay in search, use 'Disallow AI Training' (Cloudflare \u2192 Security \u2192 AI crawlers).",
  "signals.skip": "No Content Signals found.",
  "signals.fix": "Set 'Content-Signal: search=yes, ai-input=yes, ai-train=no' if you want AI answers to use your pages but not train on them. On Cloudflare, refuse training with 'Disallow AI Training', not 'Block' (Block also stops Googlebot).",
  "js-content.t": "Text is in the page without JavaScript",
  "js-content.pass": "The text is in the HTML the server sends ({raw} of {shown} words): crawlers that do not run JavaScript see it.",
  "js-content.warn": "Only {pct}% of the text ({raw} of {shown} words) is in the HTML the server sends. Many AI crawlers do not run JavaScript and see an almost empty page.",
  "js-content.skip": "Not checked.",
  "js-content.fix": "Render the main content on the server (SSR or pre-rendering). Ask your developer to compare 'view source' with what you see.",
  "title-meta.t": "Title and description",
  "title-meta.pass": "Title ({tlen} characters) and description ({dlen} characters) are present.",
  "title-meta.warn": "Title is {tlen} characters, description {dlen}. Aim for a title of 30\u201360 characters and a description that says what the page offers.",
  "title-meta.fail": "The page has no title.",
  "title-meta.fix": "Write a title that names the thing and the place or audience (e.g. 'Guest house 2 km from the beach in Sidi Bou Said | Dar Noura'), and a one-sentence description.",
  "structure.t": "Clear headings",
  "structure.pass": "One main heading and {h2} section headings: easy to split into answers.",
  "structure.warn": "{h1} main heading(s) and {h2} section heading(s). AI systems use headings to find the part of a page that answers a question.",
  "structure.fail": "No main heading (H1).",
  "structure.fix": "Use one H1 that says what the page is, then H2 sections that match the questions people ask.",
  "jsonld.t": "Structured data is valid",
  "jsonld.pass": "{blocks} block(s) of structured data, valid: {types}.",
  "jsonld.warn": "No structured data (JSON-LD). Machines must guess the facts.",
  "jsonld.fail": "{bad} block(s) of structured data are broken and ignored: {error}",
  "jsonld.fix": "Add JSON-LD (Organization or LocalBusiness on every page, plus the page type), and test it with Google's Rich Results Test. Don't overdo it: Google says structured data is not a special requirement for AI features.",
  "entity.t": "Your business is a clear entity",
  "entity.pass": "'{name}' is described, with {same} links to your profiles (sameAs).",
  "entity.warn": "The business facts are incomplete. Missing: {missing}. Profiles linked: {same}.",
  "entity.fix": "In Organization/LocalBusiness markup, add name, url, logo and sameAs links to your real profiles (LinkedIn, Google Business Profile, Wikidata, Clutch\u2026). Use the same name and address everywhere.",
  "page-type.t": "The page type is described",
  "page-type.pass": "This {kind} page has matching markup ({has}).",
  "page-type.warn": "This looks like a {kind} page, but the matching markup is missing or incomplete ({has}).",
  "page-type.skip": "General page.",
  "page-type.fix": "Products: Product with offers (price, currency, availability). Articles: Article with author and dates.",
  "lang.t": "Language and versions",
  "lang.pass": "Language '{lang}' declared; {versions} other language version(s) linked.",
  "lang.warn": "Language versions are incomplete: {problems}.",
  "lang.fail": "Problem: {problems}. AI systems may misread the language or the reading direction.",
  "lang.fix": 'Set <html lang> on every page, dir="rtl" on Arabic pages, and hreflang links between all versions including x-default and the page itself.',
  "answer-first.t": "The answer comes first",
  "answer-first.pass": "The first paragraph is short and direct ({words} words).",
  "answer-first.warn": "The first paragraph has {words} words. AI answers favour pages that answer in the first 40\u201360 words.",
  "answer-first.fail": "No opening paragraph under the main heading.",
  "answer-first.fix": "Start with one or two sentences that answer the main question directly: what it is, for whom, where, how much.",
  "quotable.t": "Sentences an AI can quote",
  "quotable.pass": "{q} of {total} sentences can be quoted on their own.",
  "quotable.warn": "Only {q} of {total} sentences can be quoted on their own.",
  "quotable.fail": "No sentence can be quoted on its own ({total} checked).",
  "quotable.fix": "Write sentences that stand alone: name the subject (not 'it' or 'we'), include a fact (number, place, price), 8\u201335 words. Use the highlight to see which ones work.",
  "facts.t": "Facts and sources",
  "facts.pass": "{numbers} figures and {sources} link(s) to sources.",
  "facts.warn": "{numbers} figures and {sources} link(s) to sources. The GEO study found that statistics, quotations and cited sources raise visibility in AI answers.",
  "facts.skip": "Page too short to judge.",
  "facts.fix": "Add concrete figures (prices, distances, dates, results) and link to the sources behind them.",
  "faq.t": "Answers to real questions",
  "faq.pass": "{n} question-style sections found.",
  "faq.warn": "No question-style sections. People ask AI assistants questions; pages that answer them directly are easier to use.",
  "faq.skip": "Page too short to judge.",
  "faq.fix": "Add 3\u20136 questions customers really ask, each with a short direct answer. FAQ markup is optional.",
  "fresh.t": "Visibly up to date",
  "fresh.pass": "Last date found: {date} ({days} days ago).",
  "fresh.warn": "No date found, or the latest is over a year old ({date}). AI answers prefer content that is clearly current.",
  "fresh.skip": "Page too short to judge.",
  "fresh.fix": "Show 'Updated on \u2026' on pages that change, and set dateModified in the markup when you really update them.",
  "media.t": "Images described",
  "media.pass": "Images with a description (alt text): {alt} of {total}.",
  "media.warn": "Images with a description (alt text): only {alt} of {total}.",
  "media.info": "No images or video. Google lists good images and video among what helps in its AI features.",
  "media.skip": "No images.",
  "media.fix": "Describe each meaningful image in its alt text, in the page's language.",
  "agent-forms.t": "Forms AI agents can use",
  "agent-forms.pass": "All {n} key forms ({kinds}) are described for AI agents (WebMCP).",
  "agent-forms.info": "{tooled} of {n} key forms ({kinds}) are described for AI agents. WebMCP is a Chrome trial: future-proofing.",
  "agent-forms.skip": "No search, booking or contact form.",
  "agent-forms.fix": "Add toolname and tooldescription attributes to search, booking and contact forms (WebMCP declarative API), so an agent can fill them for a user.",
  "agent-files.t": "Files for agents and developers",
  "agent-files.pass": "Found: {found}.",
  "agent-files.info": "None of llms.txt, agent card, UCP or MCP found. Optional: Google says llms.txt is not needed for its AI features, and studies found no effect on citations.",
  "agent-files.info.shop": "This looks like a shop. For AI shopping agents, product feeds (Google Merchant Center, OpenAI's commerce feed) and Google's Universal Commerce Protocol matter more than llms.txt.",
  "agent-files.fix": "Shops: keep product feeds complete and look at UCP/ACP. Others: llms.txt is a nice-to-have for developers and agents, not a ranking factor.",
  "tab.site": "Site",
  "copy": "Copy",
  "copy.fail": "Could not copy: select the text and press Ctrl+C.",
  "cta.quote.subj": "Personalised quote",
  "ask.pro.subj": "AI answer tracking",
  "learn.l2.subj": "Academy Level 2 for our team",
  "team.site": "Every page, every week",
  "team.site.d": "The whole site checked weekly (not 30 pages), with alerts when a template or a robots.txt change breaks something.",
  "team.impl": "We implement the fixes",
  "team.impl.d": "Structured data, language versions, right-to-left pages, rendering and agent readiness, done across all your templates and verified.",
  "team.quote": "Every team is different: tell us your sites, markets and goals, and we prepare a personalised quote. The first call is free.",
  "team.note": "We would like a personalised quote for Sada Team.",
  "team.how": "Pick a time Monday to Saturday, 9:00 to 17:00 (Berlin time). We confirm by email with a video link.",
  "hist.first": "First check of this page on this computer. Check again after your changes to see the progress.",
  "hist.up": "+{d} since {date} (was {prev})",
  "hist.down": "\u2212{d} since {date} (was {prev})",
  "hist.same": "Same as on {date} ({prev})",
  "kit.title": "{n} ready-made fixes",
  "kit.d": "Built from what is already on your page. Copy, fill in the TODO parts, and paste. Check again afterwards.",
  "kit.pro": "Want it done on every page and template, tested and verified? AYKA implements it for you.",
  "kit.pro.subj": "Implement the fixes",
  "fixk.robots-add.t": "robots.txt: let AI search in",
  "fixk.robots-add.where": "Add at the top of your robots.txt. Blocked now: {bots}. If your 'User-agent: *' group has Disallow lines you want to keep (e.g. /admin), copy them under these groups too.",
  "fixk.robots-new.t": "A robots.txt for AI search",
  "fixk.robots-new.where": "Save as robots.txt at the root of your site (yoursite.com/robots.txt). Adjust the sitemap address.",
  "fixk.meta.t": "Title and description",
  "fixk.meta.where": "Replace the <title> and description in the <head> of this page. Keep the title under about 60 characters and make it say what the page is.",
  "fixk.org.t": "Your business as structured data",
  "fixk.org.where": "Paste in the <head> of your home page (or every page). {n} profile link(s) were found on the page. Fill in every TODO with the same facts that are visible on the page, or delete the line.",
  "fixk.faq.t": "FAQ as structured data ({n} Q&A)",
  "fixk.faq.where": "Built from the question headings on this page. Optional: Google stopped showing FAQ rich results on 7 May 2026, so this markup no longer gives you dropdowns. The visible questions and answers are what help readers and AI.",
  "fixk.hreflang.t": "Language versions (hreflang)",
  "fixk.hreflang.where": "Put the same full set in the <head> of every language version, including the page itself and x-default.",
  "fixk.lang-attr.t": "Page language",
  "fixk.lang-attr.where": 'Replace the opening <html> tag of the page. Arabic pages need dir="rtl".',
  "fixk.fresh.t": "Show when the page was updated",
  "fixk.fresh.where": "Put the visible date near the top or bottom of the content, and change it only when you really update the page.",
  "fixk.alt.t": "Images without a description ({n})",
  "fixk.alt.where": 'Add an alt text to each of these images in your editor or HTML. Decorative images can have alt="".',
  "fixk.llms.t": "Draft llms.txt (optional)",
  "fixk.llms.where": "Optional: save as /llms.txt. Useful for developers and agents; Google says it does not use it for AI Overviews.",
  "rw.t": "Rewrite with AI",
  "rw.d": "Two better versions of your own text. Nothing is invented: missing facts appear as [placeholders] for you to fill in.",
  "rw.run": "Suggest 2 versions",
  "rw.check": "Check every fact before you publish.",
  "mv.title": "What AI understands about you",
  "mv.d": "The facts a machine can read for sure on this page, and the sentences it can quote as they are.",
  "mv.name": "Name",
  "mv.type": "Type (markup)",
  "mv.desc": "Description",
  "mv.logo": "Logo",
  "mv.phone": "Phone",
  "mv.address": "Address (markup)",
  "mv.profiles": "Profiles linked",
  "mv.rating": "Rating",
  "mv.none": "missing",
  "mv.quotes": "Your most quotable sentences",
  "mv.noquotes": "No sentence can be quoted on its own yet. See 'Sentences an AI can quote'.",
  "site.cta": "Scan the whole site and compare with a competitor",
  "site.title": "Site scan",
  "site.d": "Checks up to {n} pages of this site, chosen from your sitemap across its sections, the way a crawler reads them. In your browser, without cookies.",
  "site.run": "Scan {n} pages",
  "site.again": "Scan again",
  "site.busy": "Scanning\u2026 (up to a minute)",
  "site.none": "No pages could be read. Open a page of the site, click the Sada icon, then try again.",
  "site.avg": "Average of {n} pages ({total} found)",
  "site.src.map": "Pages taken from your sitemap.",
  "site.src.links": "No sitemap found: pages taken from the links on this page. A sitemap helps every crawler.",
  "site.band.high": "strong",
  "site.band.mid": "to improve",
  "site.band.low": "weak",
  "site.common": "Problems most pages share",
  "site.pages": "{n} of {of} pages",
  "site.weak": "Weakest pages: start here",
  "site.failed": "{n} page(s) could not be read (error or not HTML).",
  "site.csv": "Download as spreadsheet (CSV)",
  "site.pro": "A problem that repeats on many pages comes from a template: one fix repairs them all. AYKA scans every page every week, finds the template behind each problem and fixes it with you.",
  "site.pro.subj": "Full-site GEO",
  "site.note": "Sada site scan: {n} pages, average {avg}/100 ({total} pages in the sitemap).",
  "cmp.title": "Compare with a competitor",
  "cmp.d": "Paste the page of a competitor who appears in AI answers instead of you. Sada asks your permission for that one website, reads the page as a crawler does, and shows where they are ahead.",
  "cmp.url": "Competitor page",
  "cmp.run": "Compare",
  "cmp.ahead": "Where they are ahead",
  "cmp.yours": "Where you are ahead",
  "cmp.bad": "That is not a web address.",
  "cmp.denied": "Without your permission Sada cannot read that website. Nothing was read.",
  "cmp.fail": "That page could not be read (blocked, an error, or not a web page).",
  "cmp.pro": "One page is a snapshot. AYKA tracks who AI names instead of you, which websites it trusts for that, and builds the plan to take your place back.",
  "cmp.pro.subj": "Competitor analysis",
  "cmp.note": "Sada comparison: our page {you}/100, competitor {them}/100 ({other}).",
  "guide.title": "GEO field guide",
  "guide.teaser": "Myths vs facts, and every AI crawler with what blocking it really does.",
  "guide.d": "What the vendors themselves document, in plain words. Each fact links to its source.",
  "guide.myths": "Myths vs facts",
  "guide.bots": "AI crawlers: who is who",
  "guide.bots.d": "'Answers' bots fetch pages to answer people: blocking them removes you from those answers. 'Training' bots collect data for models: blocking them does not.",
  "guide.bots.site": "\u2713 / \u2717 shows what the robots.txt of {host} allows for the page you checked.",
  "guide.role.search": "Answers",
  "guide.role.train": "Training",
  "guide.updated": "Facts checked against the vendors' documentation in November 2026. Things change: the source links are the reference.",
  "myth.1.m": "You need special markup or an AI file (like llms.txt) to appear in Google's AI Overviews.",
  "myth.1.f": "Google says a page only has to be indexed and eligible to show a snippet. There is no special schema and no AI text file to add: the usual SEO basics are what count.",
  "myth.1.src": "https://developers.google.com/search/docs/appearance/ai-features",
  "myth.2.m": "Blocking Google-Extended takes you out of AI Overviews.",
  "myth.2.f": "Google-Extended controls use for Gemini training and grounding in some other Google products. It does not affect your inclusion in Google Search: AI Overviews and AI Mode follow the normal Search controls.",
  "myth.2.src": "https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers",
  "myth.3.m": "Blocking GPTBot takes you out of ChatGPT search.",
  "myth.3.f": "GPTBot collects training data. ChatGPT search uses OAI-SearchBot. You can refuse training and still be found: block GPTBot, allow OAI-SearchBot.",
  "myth.3.src": "https://platform.openai.com/docs/bots",
  "myth.4.m": "Cloudflare's AI blocking never touches Google.",
  "myth.4.f": "Since 15 September 2026, Cloudflare's 'Block' and 'Block on pages with ads' settings for AI training also stop crawlers that do search and training together: Googlebot, Bingbot and Applebot. To refuse training and stay in search, Cloudflare's setting is 'Disallow AI Training'.",
  "myth.4.src": "https://blog.cloudflare.com/accountable-mixed-use-ai-crawlers",
  "myth.5.m": "nosnippet only hides the grey text under my link.",
  "myth.5.f": "Google applies the same preview controls to its AI features: nosnippet, data-nosnippet and max-snippet limit what AI Overviews and AI Mode can use from your page.",
  "myth.5.src": "https://developers.google.com/search/blog/2025/05/succeeding-in-ai-search",
  "myth.6.m": "More keywords mean more AI visibility.",
  "myth.6.f": "In the GEO study (KDD 2024), keyword stuffing did not help. Adding statistics, quotations and cited sources raised visibility in AI answers, by up to about 40%.",
  "myth.6.src": "https://arxiv.org/abs/2311.09735",
  "myth.7.m": "FAQ markup gets you FAQ boxes in Google.",
  "myth.7.f": "Since 2023 Google shows FAQ rich results only for well-known government and health websites. FAQ sections still pay off: they answer the questions people ask AI assistants, in quotable form.",
  "myth.7.src": "https://developers.google.com/search/blog/2023/08/howto-faq-changes",
  "myth.8.m": "Structured data makes AI cite you.",
  "myth.8.f": "Structured data helps machines read your facts and must match the visible text, but Google says it is not required for its AI features and it guarantees nothing. Clear, specific, quotable text matters as much.",
  "myth.8.src": "https://developers.google.com/search/blog/2025/05/succeeding-in-ai-search"
};

// packages/core/src/i18n/fr.ts
var fr_default = {
  "app.tagline": "Votre co\xE9quipier GEO : comment les assistants IA voient cette page, et quoi faire.",
  "app.private": "Confidentiel par conception : les v\xE9rifications tournent dans votre navigateur. Rien n'est envoy\xE9 \xE0 AYKA.",
  "tab.check": "Analyse",
  "tab.ask": "Demander \xE0 l'IA",
  "tab.learn": "Apprendre",
  "tab.team": "\xC9quipe",
  "btn.check": "Analyser cette page",
  "btn.recheck": "Analyser \xE0 nouveau",
  "checking": "Lecture de la page\u2026",
  "perm.need": "Sada a besoin de votre accord pour lire cette page (ce site uniquement, seulement quand vous cliquez).",
  "perm.denied": "Sans votre accord, Sada ne peut pas lire cette page. Rien n'a \xE9t\xE9 lu.",
  "perm.cant": "Ce type de page ne peut pas \xEAtre analys\xE9 (pages du navigateur, Web Store, PDF). Ouvrez une page web normale.",
  "cat.access": "Acc\xE8s",
  "cat.access.d": "Les moteurs de recherche et assistants IA peuvent-ils atteindre et utiliser cette page ?",
  "cat.understand": "Compr\xE9hension",
  "cat.understand.d": "Les machines comprennent-elles ce qu'est cette page et cette entreprise ?",
  "cat.cite": "Citabilit\xE9",
  "cat.cite.d": "Y a-t-il du contenu qu'une r\xE9ponse IA peut citer en confiance ?",
  "cat.agent": "Pr\xEAt pour les agents",
  "cat.agent.d": "Des agents IA peuvent-ils agir ici (r\xE9server, acheter, demander) ? Anticipation, non not\xE9.",
  "status.pass": "Bien",
  "status.warn": "\xC0 am\xE9liorer",
  "status.fail": "\xC0 corriger d'abord",
  "status.info": "\xC0 noter",
  "status.skip": "Non applicable",
  "ev.official": "Officiel",
  "ev.official.d": "Document\xE9 par Google, OpenAI, Anthropic, Perplexity, Microsoft ou Cloudflare.",
  "ev.research": "\xC9tudes",
  "ev.research.d": "Appuy\xE9 par des \xE9tudes et l'article GEO (KDD 2024). Utile, pas une garantie.",
  "ev.optional": "Optionnel",
  "ev.optional.d": "Anticipation. Google indique que ce n'est pas n\xE9cessaire pour ses fonctions IA. Non compt\xE9 dans le score.",
  "score": "Score GEO",
  "score.low": "De grosses lacunes : les assistants IA auront du mal avec cette page.",
  "score.mid": "Bonne base, des gains clairs restent possibles.",
  "score.high": "Solide : les assistants IA peuvent lire et citer cette page.",
  "why": "Pourquoi c'est important",
  "fix": "Que faire",
  "source": "Source",
  "lesson": "Le\xE7on de 60 secondes",
  "show": "Montrer sur la page",
  "heat.on": "Surligner les phrases citables",
  "heat.off": "Masquer le surlignage",
  "heat.legend": "Vert : une IA peut la citer telle quelle. Orange : presque. Sans couleur : difficile \xE0 citer seule.",
  "export": "T\xE9l\xE9charger le rapport",
  "copied": "Copi\xE9",
  "found.prio": "Commencez ici",
  "found.all": "Toutes les v\xE9rifications",
  "esc.title": "C'est un projet, pas une petite retouche",
  "esc.blocked": "La recherche IA est bloqu\xE9e",
  "esc.blocked.d": "Les moteurs de recherche ou les robots de recherche IA ont l'instruction de ne pas utiliser cette page ({what}). Tant que cela ne change pas, le reste de la page ne compte pas pour les r\xE9ponses IA. C'est souvent une seule ligne, mais une mauvaise ligne peut aussi bloquer Google : \xE0 regarder avec soin.",
  "esc.schema": "Fondations des donn\xE9es structur\xE9es",
  "esc.schema.d": "Les informations lisibles par les machines sur l'entreprise sont cass\xE9es ou absentes. Bien corriger, c'est un seul ensemble de faits coh\xE9rent sur tous les mod\xE8les de pages, reli\xE9 \xE0 vos profils.",
  "esc.multilingual": "Versions linguistiques",
  "esc.multilingual.d": "La configuration des langues est incompl\xE8te ({problems}). De mauvais signaux de langue envoient les assistants IA vers la mauvaise version, ou vers aucune. Les pages en arabe (de droite \xE0 gauche) demandent un soin particulier.",
  "esc.rendering": "Contenu cach\xE9 derri\xE8re JavaScript",
  "esc.rendering.d": "Seulement {pct} % du texte se trouve dans la page telle qu'elle est envoy\xE9e. Beaucoup de robots IA n'ex\xE9cutent pas JavaScript et voient une page presque vide. C'est un travail de d\xE9veloppeur : rendu c\xF4t\xE9 serveur ou pr\xE9-rendu.",
  "esc.commerce": "Commerce et agents IA",
  "esc.commerce.d": "Cela ressemble \xE0 une page produit sans donn\xE9es produit exploitables par un assistant d'achat IA (prix, disponibilit\xE9). Les agents d'achat et les flux en ont besoin sur tout le catalogue.",
  "esc.foundation": "Sprint de fondations GEO",
  "esc.foundation.d": "Avec un score de {score}, les lacunes touchent l'acc\xE8s, la structure et le contenu. Un court sprint accompagn\xE9 corrige g\xE9n\xE9ralement les fondations de tout le site.",
  "esc.ask": "AYKA Technologies r\xE9alise ce type de travail. L'appel est gratuit : vous nous montrez le site, nous vous disons ce que nous corrigerions en premier et vous envoyons un devis personnalis\xE9.",
  "cta.book": "R\xE9server un appel gratuit de 30 min",
  "cta.email": "Demander un devis personnalis\xE9",
  "cta.later": "Plus tard",
  "ask.running": "R\xE9flexion\u2026",
  "ask.pro": "Une question, un moteur, maintenant. AYKA peut poser vos questions les plus importantes chaque semaine \xE0 ChatGPT, Gemini, Perplexity et aux AI Overviews de Google, et vous alerter quand une r\xE9ponse change. Demandez-nous un devis personnalis\xE9.",
  "learn.title": "Apprendre le GEO en travaillant",
  "learn.d": "Chaque v\xE9rification a une le\xE7on de 60 secondes et une question. Terminez les 18 pour le badge Niveau 1.",
  "learn.progress": "{done} le\xE7ons sur {total}",
  "learn.badge": "Niveau 1 \xB7 Bases du GEO : valid\xE9",
  "learn.badge.d": "Vous connaissez les fondamentaux. Le Niveau 2 est le cours certifiant pour les \xE9quipes (examen et certificat v\xE9rifiable).",
  "learn.quiz": "Petite v\xE9rification",
  "learn.right": "Exact.",
  "learn.wrong": "Pas tout \xE0 fait.",
  "learn.next": "Le\xE7on suivante",
  "learn.l2": "Certification Niveau 2 pour votre \xE9quipe",
  "learn.l2.d": "Praticien GEO certifi\xE9 : cours, examen, certificat Open Badge, tableau de progression de l'\xE9quipe. Peut compter dans le suivi de formation \xE0 l'IA de votre \xE9quipe (AI Act europ\xE9en, article 4).",
  "team.title": "Pour les \xE9quipes qui veulent des r\xE9sultats, pas seulement des v\xE9rifications",
  "team.d": "Tout ce qui se trouve dans les autres onglets reste gratuit. AYKA Technologies ajoute ce qui demande nos \xE9quipes, nos serveurs ou notre certificat :",
  "team.track": "Suivi hebdomadaire des r\xE9ponses IA",
  "team.track.d": "Vos questions cl\xE9s sur ChatGPT, Gemini, Perplexity et les AI Overviews de Google, via les API officielles. Historique, alertes en cas de baisse.",
  "team.comp": "Qui l'IA recommande \xE0 votre place",
  "team.comp.d": "Les concurrents cit\xE9s dans vos r\xE9ponses, les sites qui les citent, et ce qu'ils font que vous ne faites pas.",
  "team.dash": "Tableau de bord et rapports d'\xE9quipe",
  "team.dash.d": "Toutes vos pages et votre \xE9quipe au m\xEAme endroit, rapport PDF mensuel, r\xE9sum\xE9 Slack ou Teams.",
  "team.academy": "Acad\xE9mie pour votre \xE9quipe",
  "team.academy.d": "Cours GEO certifiant en fran\xE7ais, anglais, allemand ou arabe, avec la progression de chacun.",
  "team.agency": "Pour les agences",
  "team.agency.d": "Espaces clients et rapports en marque blanche.",
  "set.title": "R\xE9glages",
  "set.lang": "Langue",
  "set.auto": "Automatique",
  "rep.title": "Analyse GEO",
  "rep.by": "Analys\xE9 avec Sada by AYKA : gratuit, code source public.",
  "hint.icon": "Pour analyser cette page, cliquez sur l'ic\xF4ne Sada dans la barre d'outils du navigateur (cela donne \xE0 Sada l'acc\xE8s \xE0 cette page uniquement).",
  "btn.allowAll": "Ou autoriser Sada sur tous les sites",
  "ask.status.dl": "T\xE9l\xE9chargement du mod\xE8le d'IA local de Chrome ({p} %), seulement la premi\xE8re fois\u2026",
  "ask.missing": "Ce qu'un client ne trouve pas sur cette page :",
  "foot.oss": "Code source (FSL-1.1)",
  "prob.lang": "aucune langue d\xE9clar\xE9e (<html lang>)",
  "prob.rtl": 'page arabe sans sens de lecture de droite \xE0 gauche (dir="rtl")',
  "prob.x-default": "pas de version x-default",
  "prob.self": "cette page manque dans ses propres liens de langue",
  "none": "aucun",
  "indexable.t": "Les moteurs peuvent afficher cette page",
  "indexable.pass": "La page peut \xEAtre index\xE9e et cit\xE9e dans les r\xE9sultats et les r\xE9ponses IA.",
  "indexable.fail.noindex": "La page indique \xAB noindex \xBB : Google et Bing la retirent, elle ne peut donc pas appara\xEEtre dans AI Overviews, AI Mode ou Copilot.",
  "indexable.fail.nosnippet": "La page interdit les extraits (\xAB nosnippet \xBB ou max-snippet:0). Les fonctions IA de Google n'utilisent que des pages qui autorisent un extrait.",
  "indexable.warn.canonical": "Le lien canonique pointe vers un autre site ({host}). Les moteurs peuvent afficher cette page-l\xE0 \xE0 la place.",
  "indexable.fix": "Retirez noindex/nosnippet des pages que vous voulez voir dans les r\xE9ponses IA (balise meta robots ou en-t\xEAte X-Robots-Tag). Gardez le canonique sur votre propre domaine.",
  "indexable.fix.canonical": "Faites pointer le lien canonique vers l'adresse de cette page (ou vers la version sur votre propre domaine que vous voulez voir dans les r\xE9ponses IA).",
  "ai-bots.t": "Les robots de recherche IA peuvent acc\xE9der \xE0 la page",
  "ai-bots.pass": "Tous les robots de recherche et de recherche IA peuvent lire cette page.",
  "ai-bots.pass.none": "Pas de robots.txt : tous les robots peuvent lire cette page.",
  "ai-bots.fail": "Bloqu\xE9s dans robots.txt : {blocked}. Ces robots lisent les pages pour r\xE9pondre aux gens : ils ne peuvent donc pas vous citer.",
  "ai-bots.extra": "Robots d'entra\xEEnement bloqu\xE9s (votre choix, sans effet sur les r\xE9ponses) : {training}.",
  "ai-bots.fix": "Autorisez les robots de recherche (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot, Claude-User) dans robots.txt. Vous pouvez toujours bloquer les robots d'entra\xEEnement comme GPTBot, ClaudeBot ou Google-Extended.",
  "signals.t": "Content Signals et Cloudflare",
  "signals.warn": "Votre robots.txt indique search={search}, ai-input={input}, ai-train={train}. \xAB ai-input=no \xBB demande aux syst\xE8mes d'IA de ne pas utiliser vos pages dans leurs r\xE9ponses.",
  "signals.info": "Content Signals : search={search}, ai-input={input}, ai-train={train}.",
  "signals.info.cf": "Ce site utilise Cloudflare. Depuis le 15 septembre 2026, les r\xE9glages \xAB Block \xBB et \xAB Block on pages with ads \xBB pour l'entra\xEEnement IA arr\xEAtent aussi Googlebot, Bingbot et Applebot, qui font recherche et entra\xEEnement \xE0 la fois. Pour refuser l'entra\xEEnement en restant dans la recherche : \xAB Disallow AI Training \xBB (Cloudflare \u2192 S\xE9curit\xE9 \u2192 robots IA).",
  "signals.skip": "Aucun Content Signal trouv\xE9.",
  "signals.fix": "Mettez \xAB Content-Signal: search=yes, ai-input=yes, ai-train=no \xBB si vous voulez que les r\xE9ponses IA utilisent vos pages sans s'entra\xEEner dessus. Sur Cloudflare, refusez l'entra\xEEnement avec \xAB Disallow AI Training \xBB, pas \xAB Block \xBB (qui arr\xEAte aussi Googlebot).",
  "js-content.t": "Le texte est pr\xE9sent sans JavaScript",
  "js-content.pass": "Le texte est dans le HTML envoy\xE9 par le serveur ({raw} mots sur {shown}) : les robots qui n'ex\xE9cutent pas JavaScript le voient.",
  "js-content.warn": "Seulement {pct} % du texte ({raw} mots sur {shown}) se trouve dans le HTML envoy\xE9. Beaucoup de robots IA n'ex\xE9cutent pas JavaScript et voient une page presque vide.",
  "js-content.skip": "Non v\xE9rifi\xE9.",
  "js-content.fix": "Affichez le contenu principal c\xF4t\xE9 serveur (SSR ou pr\xE9-rendu). Demandez \xE0 votre d\xE9veloppeur de comparer \xAB afficher la source \xBB avec ce que vous voyez.",
  "title-meta.t": "Titre et description",
  "title-meta.pass": "Titre ({tlen} caract\xE8res) et description ({dlen} caract\xE8res) pr\xE9sents.",
  "title-meta.warn": "Le titre fait {tlen} caract\xE8res, la description {dlen}. Visez un titre de 30 \xE0 60 caract\xE8res et une description qui dit ce que la page propose.",
  "title-meta.fail": "La page n'a pas de titre.",
  "title-meta.fix": "\xC9crivez un titre qui nomme l'offre et le lieu ou le public (ex. \xAB Maison d'h\xF4tes \xE0 2 km de la plage \xE0 Sidi Bou Sa\xEFd | Dar Noura \xBB) et une description d'une phrase.",
  "structure.t": "Des titres clairs",
  "structure.pass": "Un titre principal et {h2} titres de section : facile \xE0 d\xE9couper en r\xE9ponses.",
  "structure.warn": "{h1} titre(s) principal(aux) et {h2} titre(s) de section. Les IA utilisent les titres pour trouver la partie qui r\xE9pond \xE0 une question.",
  "structure.fail": "Pas de titre principal (H1).",
  "structure.fix": "Un seul H1 qui dit ce qu'est la page, puis des sections H2 qui correspondent aux questions que les gens posent.",
  "jsonld.t": "Les donn\xE9es structur\xE9es sont valides",
  "jsonld.pass": "{blocks} bloc(s) de donn\xE9es structur\xE9es valides : {types}.",
  "jsonld.warn": "Aucune donn\xE9e structur\xE9e (JSON-LD). Les machines doivent deviner les faits.",
  "jsonld.fail": "{bad} bloc(s) de donn\xE9es structur\xE9es sont cass\xE9s et ignor\xE9s : {error}",
  "jsonld.fix": "Ajoutez du JSON-LD (Organization ou LocalBusiness sur chaque page, plus le type de la page) et testez-le avec le test des r\xE9sultats enrichis de Google. Sans exc\xE8s : Google pr\xE9cise que ce n'est pas une exigence particuli\xE8re pour ses fonctions IA.",
  "entity.t": "Votre entreprise est une entit\xE9 claire",
  "entity.pass": "\xAB {name} \xBB est d\xE9crite, avec {same} liens vers vos profils (sameAs).",
  "entity.warn": "Les informations sur l'entreprise sont incompl\xE8tes. Manque : {missing}. Profils reli\xE9s : {same}.",
  "entity.fix": "Dans le balisage Organization/LocalBusiness, ajoutez name, url, logo et des liens sameAs vers vos vrais profils (LinkedIn, fiche Google, Wikidata, Clutch\u2026). Le m\xEAme nom et la m\xEAme adresse partout.",
  "page-type.t": "Le type de page est d\xE9crit",
  "page-type.pass": "Cette page ({kind}) a le balisage correspondant ({has}).",
  "page-type.warn": "Cela ressemble \xE0 une page {kind}, mais le balisage correspondant est absent ou incomplet ({has}).",
  "page-type.skip": "Page g\xE9n\xE9rale.",
  "page-type.fix": "Produits : Product avec offers (prix, devise, disponibilit\xE9). Articles : Article avec auteur et dates.",
  "lang.t": "Langue et versions",
  "lang.pass": "Langue \xAB {lang} \xBB d\xE9clar\xE9e ; {versions} autre(s) version(s) linguistique(s) reli\xE9e(s).",
  "lang.warn": "Les versions linguistiques sont incompl\xE8tes : {problems}.",
  "lang.fail": "Probl\xE8me : {problems}. Les IA risquent de mal lire la langue ou le sens de lecture.",
  "lang.fix": 'Mettez <html lang> sur chaque page, dir="rtl" sur les pages en arabe, et des liens hreflang entre toutes les versions, y compris x-default et la page elle-m\xEAme.',
  "answer-first.t": "La r\xE9ponse vient en premier",
  "answer-first.pass": "Le premier paragraphe est court et direct ({words} mots).",
  "answer-first.warn": "Le premier paragraphe fait {words} mots. Les r\xE9ponses IA favorisent les pages qui r\xE9pondent dans les 40 \xE0 60 premiers mots.",
  "answer-first.fail": "Pas de paragraphe d'ouverture sous le titre principal.",
  "answer-first.fix": "Commencez par une ou deux phrases qui r\xE9pondent directement \xE0 la question principale : quoi, pour qui, o\xF9, combien.",
  "quotable.t": "Des phrases qu'une IA peut citer",
  "quotable.pass": "{q} phrases sur {total} peuvent \xEAtre cit\xE9es seules.",
  "quotable.warn": "Seulement {q} phrases sur {total} peuvent \xEAtre cit\xE9es seules.",
  "quotable.fail": "Aucune phrase ne peut \xEAtre cit\xE9e seule ({total} v\xE9rifi\xE9es).",
  "quotable.fix": "\xC9crivez des phrases autonomes : nommez le sujet (pas \xAB il \xBB ou \xAB nous \xBB), ajoutez un fait (nombre, lieu, prix), 8 \xE0 35 mots. Le surlignage montre lesquelles fonctionnent.",
  "facts.t": "Faits et sources",
  "facts.pass": "{numbers} chiffres et {sources} lien(s) vers des sources.",
  "facts.warn": "{numbers} chiffres et {sources} lien(s) vers des sources. L'\xE9tude GEO a montr\xE9 que statistiques, citations et sources augmentent la visibilit\xE9 dans les r\xE9ponses IA.",
  "facts.skip": "Page trop courte pour juger.",
  "facts.fix": "Ajoutez des chiffres concrets (prix, distances, dates, r\xE9sultats) et des liens vers les sources.",
  "faq.t": "Des r\xE9ponses \xE0 de vraies questions",
  "faq.pass": "{n} sections en forme de question trouv\xE9es.",
  "faq.warn": "Aucune section en forme de question. Les gens posent des questions aux assistants IA ; les pages qui y r\xE9pondent directement sont plus faciles \xE0 utiliser.",
  "faq.skip": "Page trop courte pour juger.",
  "faq.fix": "Ajoutez 3 \xE0 6 questions que vos clients posent vraiment, chacune avec une r\xE9ponse courte et directe. Le balisage FAQ est facultatif.",
  "fresh.t": "Visiblement \xE0 jour",
  "fresh.pass": "Derni\xE8re date trouv\xE9e : {date} (il y a {days} jours).",
  "fresh.warn": "Aucune date trouv\xE9e, ou la plus r\xE9cente a plus d'un an ({date}). Les r\xE9ponses IA pr\xE9f\xE8rent un contenu clairement actuel.",
  "fresh.skip": "Page trop courte pour juger.",
  "fresh.fix": "Affichez \xAB Mis \xE0 jour le \u2026 \xBB sur les pages qui \xE9voluent et renseignez dateModified dans le balisage quand vous les mettez vraiment \xE0 jour.",
  "media.t": "Images d\xE9crites",
  "media.pass": "Images avec une description (texte alt) : {alt} sur {total}.",
  "media.warn": "Images avec une description (texte alt) : seulement {alt} sur {total}.",
  "media.info": "Ni image ni vid\xE9o. Google cite les bonnes images et vid\xE9os parmi ce qui aide dans ses fonctions IA.",
  "media.skip": "Pas d'images.",
  "media.fix": "D\xE9crivez chaque image utile dans son texte alt, dans la langue de la page.",
  "agent-forms.t": "Des formulaires utilisables par les agents IA",
  "agent-forms.pass": "Les {n} formulaires cl\xE9s ({kinds}) sont d\xE9crits pour les agents IA (WebMCP).",
  "agent-forms.info": "{tooled} formulaire(s) cl\xE9(s) sur {n} ({kinds}) sont d\xE9crits pour les agents IA. WebMCP est un essai de Chrome : anticipation.",
  "agent-forms.skip": "Aucun formulaire de recherche, de r\xE9servation ou de contact.",
  "agent-forms.fix": "Ajoutez les attributs toolname et tooldescription aux formulaires de recherche, de r\xE9servation et de contact (API d\xE9clarative WebMCP), pour qu'un agent puisse les remplir pour un utilisateur.",
  "agent-files.t": "Fichiers pour agents et d\xE9veloppeurs",
  "agent-files.pass": "Trouv\xE9s : {found}.",
  "agent-files.info": "Ni llms.txt, ni carte d'agent, ni UCP, ni MCP. Facultatif : Google indique que llms.txt n'est pas n\xE9cessaire pour ses fonctions IA, et les \xE9tudes n'ont trouv\xE9 aucun effet sur les citations.",
  "agent-files.info.shop": "Cela ressemble \xE0 une boutique. Pour les agents d'achat IA, les flux produits (Google Merchant Center, le flux commerce d'OpenAI) et le Universal Commerce Protocol de Google comptent plus que llms.txt.",
  "agent-files.fix": "Boutiques : des flux produits complets, et regardez UCP/ACP. Autres : llms.txt est un plus pour les d\xE9veloppeurs et les agents, pas un facteur de classement.",
  "tab.site": "Site",
  "copy": "Copier",
  "copy.fail": "Copie impossible : s\xE9lectionnez le texte et faites Ctrl+C.",
  "cta.quote.subj": "Devis personnalis\xE9",
  "ask.pro.subj": "Suivi des r\xE9ponses IA",
  "learn.l2.subj": "Academy niveau 2 pour notre \xE9quipe",
  "team.site": "Toutes les pages, chaque semaine",
  "team.site.d": "Tout le site v\xE9rifi\xE9 chaque semaine (pas seulement 30 pages), avec une alerte quand un mod\xE8le ou un robots.txt casse quelque chose.",
  "team.impl": "Nous mettons en place les corrections",
  "team.impl.d": "Donn\xE9es structur\xE9es, versions linguistiques, pages de droite \xE0 gauche, rendu et pr\xE9paration aux agents, sur tous vos mod\xE8les, et v\xE9rifi\xE9s.",
  "team.quote": "Chaque \xE9quipe est diff\xE9rente : dites-nous vos sites, vos march\xE9s et vos objectifs, et nous pr\xE9parons un devis personnalis\xE9. Le premier appel est gratuit.",
  "team.note": "Nous souhaitons un devis personnalis\xE9 pour Sada Team.",
  "team.how": "Choisissez un cr\xE9neau du lundi au samedi, de 9 h \xE0 17 h (heure de Berlin). Nous confirmons par e-mail avec un lien vid\xE9o.",
  "hist.first": "Premi\xE8re v\xE9rification de cette page sur cet ordinateur. Rev\xE9rifiez apr\xE8s vos changements pour voir les progr\xE8s.",
  "hist.up": "+{d} depuis le {date} (avant : {prev})",
  "hist.down": "\u2212{d} depuis le {date} (avant : {prev})",
  "hist.same": "Comme le {date} ({prev})",
  "kit.title": "{n} corrections pr\xEAtes \xE0 l'emploi",
  "kit.d": "Construites \xE0 partir de ce qui est d\xE9j\xE0 sur votre page. Copiez, compl\xE9tez les parties TODO, collez. Puis rev\xE9rifiez.",
  "kit.pro": "Vous voulez que ce soit fait sur toutes les pages et tous les mod\xE8les, test\xE9 et v\xE9rifi\xE9 ? AYKA s'en charge.",
  "kit.pro.subj": "Mise en place des corrections",
  "fixk.robots-add.t": "robots.txt : laisser entrer la recherche IA",
  "fixk.robots-add.where": "Ajoutez en haut de votre robots.txt. Bloqu\xE9s aujourd'hui : {bots}. Si votre groupe \xAB User-agent: * \xBB a des lignes Disallow \xE0 garder (ex. /admin), copiez-les aussi sous ces groupes.",
  "fixk.robots-new.t": "Un robots.txt pour la recherche IA",
  "fixk.robots-new.where": "Enregistrez sous robots.txt \xE0 la racine du site (votresite.com/robots.txt). Adaptez l'adresse du sitemap.",
  "fixk.meta.t": "Titre et description",
  "fixk.meta.where": "Remplacez <title> et la description dans le <head> de la page. Titre de moins d'environ 60 caract\xE8res, qui dit ce qu'est la page.",
  "fixk.org.t": "Votre entreprise en donn\xE9es structur\xE9es",
  "fixk.org.where": "Collez dans le <head> de la page d'accueil (ou de chaque page). {n} lien(s) de profil trouv\xE9s. Remplacez chaque TODO par les faits visibles sur la page, ou supprimez la ligne.",
  "fixk.faq.t": "FAQ en donn\xE9es structur\xE9es ({n} Q/R)",
  "fixk.faq.where": "Construit \u00e0 partir des titres en forme de question. Facultatif : Google n'affiche plus de r\u00e9sultats enrichis FAQ depuis le 7 mai 2026, ce balisage ne donne donc plus de menus d\u00e9pliants. Ce qui compte, ce sont les questions et r\u00e9ponses visibles.",
  "fixk.hreflang.t": "Versions linguistiques (hreflang)",
  "fixk.hreflang.where": "Mettez le m\xEAme ensemble complet dans le <head> de chaque version, y compris la page elle-m\xEAme et x-default.",
  "fixk.lang-attr.t": "Langue de la page",
  "fixk.lang-attr.where": `Remplacez la balise <html> d'ouverture. Les pages arabes ont besoin de dir="rtl".`,
  "fixk.fresh.t": "Montrer la date de mise \xE0 jour",
  "fixk.fresh.where": "Placez la date visible en haut ou en bas du contenu, et changez-la seulement quand vous mettez vraiment la page \xE0 jour.",
  "fixk.alt.t": "Images sans description ({n})",
  "fixk.alt.where": 'Ajoutez un texte alt \xE0 chacune de ces images dans votre \xE9diteur ou le HTML. Les images d\xE9coratives peuvent avoir alt="".',
  "fixk.llms.t": "Brouillon de llms.txt (facultatif)",
  "fixk.llms.where": "Facultatif : enregistrez sous /llms.txt. Utile aux d\xE9veloppeurs et aux agents ; Google dit ne pas l'utiliser pour les AI Overviews.",
  "rw.t": "R\xE9\xE9crire avec l'IA",
  "rw.d": "Deux meilleures versions de votre propre texte. Rien n'est invent\xE9 : les faits manquants apparaissent en [espaces r\xE9serv\xE9s] \xE0 compl\xE9ter.",
  "rw.run": "Proposer 2 versions",
  "rw.check": "V\xE9rifiez chaque fait avant de publier.",
  "mv.title": "Ce que l'IA comprend de vous",
  "mv.d": "Les faits qu'une machine peut lire avec certitude sur cette page, et les phrases qu'elle peut citer telles quelles.",
  "mv.name": "Nom",
  "mv.type": "Type (balisage)",
  "mv.desc": "Description",
  "mv.logo": "Logo",
  "mv.phone": "T\xE9l\xE9phone",
  "mv.address": "Adresse (balisage)",
  "mv.profiles": "Profils li\xE9s",
  "mv.rating": "Note",
  "mv.none": "manquant",
  "mv.quotes": "Vos phrases les plus citables",
  "mv.noquotes": "Aucune phrase n'est encore citable seule. Voir \xAB Des phrases qu'une IA peut citer \xBB.",
  "site.cta": "Analyser tout le site et comparer avec un concurrent",
  "site.title": "Analyse du site",
  "site.d": "V\xE9rifie jusqu'\xE0 {n} pages du site, choisies dans votre sitemap \xE0 travers ses sections, comme un robot les lit. Dans votre navigateur, sans cookies.",
  "site.run": "Analyser {n} pages",
  "site.again": "Relancer l'analyse",
  "site.busy": "Analyse\u2026 (jusqu'\xE0 une minute)",
  "site.none": "Aucune page n'a pu \xEAtre lue. Ouvrez une page du site, cliquez sur l'ic\xF4ne Sada, puis r\xE9essayez.",
  "site.avg": "Moyenne de {n} pages ({total} trouv\xE9es)",
  "site.src.map": "Pages prises dans votre sitemap.",
  "site.src.links": "Pas de sitemap : pages prises dans les liens de cette page. Un sitemap aide tous les robots.",
  "site.band.high": "solides",
  "site.band.mid": "\xE0 am\xE9liorer",
  "site.band.low": "faibles",
  "site.common": "Probl\xE8mes partag\xE9s par la plupart des pages",
  "site.pages": "{n} pages sur {of}",
  "site.weak": "Pages les plus faibles : commencez ici",
  "site.failed": "{n} page(s) illisible(s) (erreur ou pas du HTML).",
  "site.csv": "T\xE9l\xE9charger en tableur (CSV)",
  "site.pro": "Un probl\xE8me r\xE9p\xE9t\xE9 sur beaucoup de pages vient d'un mod\xE8le : une seule correction les r\xE9pare toutes. AYKA analyse chaque page chaque semaine, trouve le mod\xE8le en cause et le corrige avec vous.",
  "site.pro.subj": "GEO pour tout le site",
  "site.note": "Analyse Sada : {n} pages, moyenne {avg}/100 ({total} pages dans le sitemap).",
  "cmp.title": "Comparer avec un concurrent",
  "cmp.d": "Collez la page d'un concurrent qui appara\xEEt dans les r\xE9ponses IA \xE0 votre place. Sada demande votre accord pour ce seul site, lit la page comme un robot, et montre o\xF9 il vous devance.",
  "cmp.url": "Page du concurrent",
  "cmp.run": "Comparer",
  "cmp.ahead": "L\xE0 o\xF9 il vous devance",
  "cmp.yours": "L\xE0 o\xF9 vous le devancez",
  "cmp.bad": "Ce n'est pas une adresse web.",
  "cmp.denied": "Sans votre accord Sada ne peut pas lire ce site. Rien n'a \xE9t\xE9 lu.",
  "cmp.fail": "Cette page n'a pas pu \xEAtre lue (bloqu\xE9e, erreur ou pas une page web).",
  "cmp.pro": "Une page, c'est un instantan\xE9. AYKA suit qui l'IA cite \xE0 votre place, quels sites elle juge fiables pour cela, et construit le plan pour reprendre votre place.",
  "cmp.pro.subj": "Analyse concurrentielle",
  "cmp.note": "Comparaison Sada : notre page {you}/100, concurrent {them}/100 ({other}).",
  "guide.title": "Guide de terrain GEO",
  "guide.teaser": "Mythes et faits, et chaque robot IA avec ce que son blocage fait vraiment.",
  "guide.d": "Ce que les \xE9diteurs documentent eux-m\xEAmes, en mots simples. Chaque fait renvoie \xE0 sa source.",
  "guide.myths": "Mythes et faits",
  "guide.bots": "Robots IA : qui est qui",
  "guide.bots.d": "Les robots \xAB r\xE9ponses \xBB lisent les pages pour r\xE9pondre aux gens : les bloquer vous retire de ces r\xE9ponses. Les robots \xAB entra\xEEnement \xBB collectent des donn\xE9es : les bloquer, non.",
  "guide.bots.site": "\u2713 / \u2717 indique ce que le robots.txt de {host} autorise pour la page v\xE9rifi\xE9e.",
  "guide.role.search": "R\xE9ponses",
  "guide.role.train": "Entra\xEEnement",
  "guide.updated": "Faits v\xE9rifi\xE9s dans la documentation des \xE9diteurs en novembre 2026. Les choses changent : les liens sources font foi.",
  "myth.1.m": "Il faut un balisage sp\xE9cial ou un fichier IA (comme llms.txt) pour appara\xEEtre dans les AI Overviews de Google.",
  "myth.1.f": "Google dit qu'une page doit seulement \xEAtre index\xE9e et pouvoir afficher un extrait. Pas de sch\xE9ma sp\xE9cial, pas de fichier texte IA : ce sont les bases du SEO qui comptent.",
  "myth.1.src": "https://developers.google.com/search/docs/appearance/ai-features",
  "myth.2.m": "Bloquer Google-Extended vous retire des AI Overviews.",
  "myth.2.f": "Google-Extended contr\xF4le l'usage pour l'entra\xEEnement de Gemini et l'ancrage dans d'autres produits Google. Il ne change rien \xE0 votre pr\xE9sence dans la recherche Google : AI Overviews et AI Mode suivent les contr\xF4les habituels.",
  "myth.2.src": "https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers",
  "myth.3.m": "Bloquer GPTBot vous retire de la recherche ChatGPT.",
  "myth.3.f": "GPTBot collecte des donn\xE9es d'entra\xEEnement. La recherche ChatGPT utilise OAI-SearchBot. Vous pouvez refuser l'entra\xEEnement et rester trouvable : bloquez GPTBot, autorisez OAI-SearchBot.",
  "myth.3.src": "https://platform.openai.com/docs/bots",
  "myth.4.m": "Le blocage IA de Cloudflare ne touche jamais Google.",
  "myth.4.f": "Depuis le 15 septembre 2026, les r\xE9glages \xAB Block \xBB et \xAB Block on pages with ads \xBB de Cloudflare pour l'entra\xEEnement IA arr\xEAtent aussi les robots qui font recherche et entra\xEEnement \xE0 la fois : Googlebot, Bingbot et Applebot. Pour refuser l'entra\xEEnement et rester dans la recherche, le r\xE9glage Cloudflare est \xAB Disallow AI Training \xBB.",
  "myth.4.src": "https://blog.cloudflare.com/accountable-mixed-use-ai-crawlers",
  "myth.5.m": "nosnippet masque seulement le texte gris sous mon lien.",
  "myth.5.f": "Google applique les m\xEAmes contr\xF4les d'aper\xE7u \xE0 ses fonctions IA : nosnippet, data-nosnippet et max-snippet limitent ce que AI Overviews et AI Mode peuvent utiliser de votre page.",
  "myth.5.src": "https://developers.google.com/search/blog/2025/05/succeeding-in-ai-search",
  "myth.6.m": "Plus de mots-cl\xE9s, c'est plus de visibilit\xE9 IA.",
  "myth.6.f": "Dans l'\xE9tude GEO (KDD 2024), le bourrage de mots-cl\xE9s n'a pas aid\xE9. Ajouter des statistiques, des citations et des sources a augment\xE9 la visibilit\xE9 dans les r\xE9ponses IA, jusqu'\xE0 environ 40 %.",
  "myth.6.src": "https://arxiv.org/abs/2311.09735",
  "myth.7.m": "Le balisage FAQ vous donne des encadr\xE9s FAQ dans Google.",
  "myth.7.f": "Depuis 2023 Google n'affiche les r\xE9sultats enrichis FAQ que pour des sites publics et de sant\xE9 reconnus. Les FAQ restent utiles : elles r\xE9pondent, sous forme citable, aux questions pos\xE9es aux assistants IA.",
  "myth.7.src": "https://developers.google.com/search/blog/2023/08/howto-faq-changes",
  "myth.8.m": "Les donn\xE9es structur\xE9es font que l'IA vous cite.",
  "myth.8.f": "Les donn\xE9es structur\xE9es aident les machines \xE0 lire vos faits et doivent correspondre au texte visible, mais Google dit qu'elles ne sont pas requises pour ses fonctions IA et ne garantissent rien. Un texte clair, pr\xE9cis et citable compte autant.",
  "myth.8.src": "https://developers.google.com/search/blog/2025/05/succeeding-in-ai-search"
};

// packages/core/src/i18n.ts
var STR = { en: en_default, fr: fr_default, de: de_default, ar: ar_default };
var LANGS = ["en", "fr", "de", "ar"];
function detectLang(code) {
  const c = (code || "").slice(0, 2).toLowerCase();
  return LANGS.includes(c) ? c : "en";
}
var dirOf = (l) => l === "ar" ? "rtl" : "ltr";
var PROBLEMS = ["lang", "rtl", "x-default", "self"];
function t(lang, key, vars = {}) {
  if (vars.n === 1 && STR.en[key + ".1"] !== void 0) key += ".1";
  const s = STR[lang]?.[key] ?? STR.en[key] ?? key;
  if (typeof vars.problems === "string" && vars.problems) {
    vars = { ...vars, problems: vars.problems.split(/\s*,\s*/).map((p) => PROBLEMS.includes(p) ? STR[lang]?.["prob." + p] ?? STR.en["prob." + p] : p).join("; ") };
  }
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] === void 0 || vars[k] === "" ? STR[lang]?.none ?? "-" : String(vars[k]));
}
function message(lang, f2) {
  const v = f2.vars;
  const variants = [];
  if (f2.id === "indexable") variants.push(String(v.reason || ""));
  if (f2.id === "ai-bots" && v.none) variants.push("none");
  if (f2.id === "signals" && v.cf && f2.status === "info") variants.push("cf");
  if (f2.id === "agent-files" && v.shop && f2.status === "info") variants.push("shop");
  for (const x of variants) {
    const k = `${f2.id}.${f2.status}.${x}`;
    if (x && (STR[lang]?.[k] || STR.en[k])) return t(lang, k, v);
  }
  let out = t(lang, `${f2.id}.${f2.status}`, v);
  if (f2.id === "ai-bots" && v.training) out += " " + t(lang, "ai-bots.extra", v);
  return out;
}
function fixFor(lang, f2) {
  const r = String(f2.vars.reason || "");
  const k = `${f2.id}.fix.${r}`;
  return t(lang, r && (STR[lang]?.[k] || STR.en[k]) ? k : `${f2.id}.fix`, f2.vars);
}

// packages/core/src/fixes.ts
var clean2 = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
var TODO = "TODO";
var SOCIAL = /(^|\.)(facebook\.com|instagram\.com|linkedin\.com|x\.com|twitter\.com|youtube\.com|tiktok\.com|pinterest\.com|wikipedia\.org|wikidata\.org|github\.com|tripadvisor\.[a-z.]+|clutch\.co|crunchbase\.com|g\.page|maps\.app\.goo\.gl|threads\.net)$/i;
function abs(href, base) {
  try {
    return href ? new URL(href, base).href : "";
  } catch {
    return "";
  }
}
function script(obj) {
  return `<script type="application/ld+json">
${JSON.stringify(obj, null, 2)}
<\/script>`;
}
function entityFacts(doc, r) {
  const nodes = flatNodes(r.model.jsonld);
  const org = nodes.find((n) => [].concat(n["@type"]).some((t2) => /Organization|Business|Hotel|Lodging|Restaurant|Store|Agent|Service|Corporation/.test(String(t2)))) || {};
  const base = r.url;
  const same = new Set([].concat(org.sameAs || []).filter((x) => typeof x === "string"));
  doc.querySelectorAll("a[href]").forEach((a) => {
    const u = abs(a.getAttribute("href"), base);
    try {
      if (u && SOCIAL.test(new URL(u).hostname)) same.add(u.split("?")[0]);
    } catch {
    }
  });
  const tel = clean2(doc.querySelector('a[href^="tel:"]')?.getAttribute("href")).replace(/^tel:/i, "");
  const mail = clean2(doc.querySelector('a[href^="mailto:"]')?.getAttribute("href")).replace(/^mailto:/i, "").split("?")[0];
  const logo = org.logo || abs(doc.querySelector('link[rel~="apple-touch-icon" i]')?.getAttribute("href"), base) || abs(doc.querySelector('link[rel~="icon" i]')?.getAttribute("href"), base);
  const image = org.image || abs(doc.querySelector('meta[property="og:image" i]')?.getAttribute("content"), base);
  const addr = org.address && typeof org.address === "object" ? org.address : null;
  return {
    type: org["@type"] ? [].concat(org["@type"])[0] : "",
    name: clean2(org.name) || r.model.siteName || "",
    url: org.url || new URL(base).origin + "/",
    description: clean2(org.description) || r.model.metaDescription,
    telephone: clean2(org.telephone) || tel,
    email: clean2(org.email) || mail,
    logo: typeof logo === "string" ? logo : logo && logo.url || "",
    image: typeof image === "string" ? image : image && image.url || "",
    address: addr ? [addr.streetAddress, addr.postalCode, addr.addressLocality, addr.addressCountry].filter(Boolean).join(", ") : "",
    hours: [].concat(org.openingHours || org.openingHoursSpecification || []).length,
    priceRange: clean2(org.priceRange),
    rating: org.aggregateRating ? `${org.aggregateRating.ratingValue}/${org.aggregateRating.bestRating || 5} (${org.aggregateRating.reviewCount || org.aggregateRating.ratingCount || "?"})` : "",
    sameAs: Array.from(same).slice(0, 12),
    hasMarkup: !!org["@type"]
  };
}
function orgFix(doc, r, brand) {
  const e2 = entityFacts(doc, r);
  const local = /hotel|guest|maison|dar |restaurant|café|cafe|shop|store|clinic|cabinet|salon|agence|agency|studio/i.test(`${r.model.title} ${e2.name} ${brand}`) || !!e2.telephone;
  const obj = {
    "@context": "https://schema.org",
    "@type": e2.type || (local ? "LocalBusiness" : "Organization"),
    "@id": e2.url.replace(/\/$/, "") + "/#organization",
    name: e2.name || brand || TODO,
    url: e2.url,
    logo: e2.logo || TODO + ": address of your logo (PNG or SVG)",
    description: e2.description || TODO + ": one sentence: what you do, for whom, where"
  };
  if (e2.image) obj.image = e2.image;
  if (local) {
    obj.telephone = e2.telephone || TODO;
    obj.address = { "@type": "PostalAddress", streetAddress: TODO, postalCode: TODO, addressLocality: TODO, addressCountry: TODO };
    obj.openingHours = TODO + ": e.g. Mo-Sa 09:00-18:00";
  } else if (e2.telephone) obj.telephone = e2.telephone;
  if (e2.email) obj.email = e2.email;
  obj.sameAs = e2.sameAs.length ? e2.sameAs : [TODO + ": your profiles (LinkedIn, Google Business Profile, Wikipedia, directories)"];
  return { for: "entity", id: "org", kind: "html", code: script(obj), vars: { n: e2.sameAs.length } };
}
function faqFix(doc) {
  const qs = [];
  doc.querySelectorAll("h2,h3,h4,summary,dt").forEach((h) => {
    const q = clean2(h.textContent);
    if (!/[?؟]\s*$/.test(q) || q.length > 160) return;
    let a = "";
    if (h.tagName === "SUMMARY") {
      const d = h.parentElement?.cloneNode(true);
      d?.querySelector("summary")?.remove();
      a = clean2(d?.textContent);
    } else if (h.tagName === "DT") {
      a = clean2(h.nextElementSibling?.tagName === "DD" ? h.nextElementSibling.textContent : "");
    } else {
      let n = h.nextElementSibling;
      while (n && !/^H[1-6]$/.test(n.tagName) && a.length < 600) {
        a += " " + clean2(n.textContent);
        n = n.nextElementSibling;
      }
      a = clean2(a);
    }
    if (a.length >= 20 && !qs.some((x) => x.q === q)) qs.push({ q, a: a.slice(0, 700) });
  });
  if (!qs.length) return null;
  const obj = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qs.slice(0, 12).map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } }))
  };
  return { for: "faq", id: "faq", kind: "html", code: script(obj), vars: { n: qs.length } };
}
function robotsFix(input2, r) {
  const text = input2.robots && input2.robots.status < 400 ? input2.robots.text || "" : "";
  const rb = parseRobots(text);
  const path = r.model.path || "/";
  const blocked = BOTS.filter((b) => b.role === "search" && !allowed(rb, b.ua, path));
  if (text && !blocked.length) return null;
  const origin2 = new URL(r.url).origin;
  const lines = [
    "# AI search: let assistants read and cite these pages (added with Sada)",
    ...BOTS.filter((b) => b.role === "search" && (!text || blocked.includes(b))).flatMap((b) => [`User-agent: ${b.ua}`, "Allow: /", ""]),
    "# AI training: your choice. Remove the # on the next lines to opt out of training.",
    ...BOTS.filter((b) => b.role === "train").flatMap((b) => [`# User-agent: ${b.ua}`, "# Disallow: /", "#"])
  ];
  if (!text) lines.unshift("User-agent: *", "Allow: /", "", `Sitemap: ${origin2}/sitemap.xml`, "");
  return {
    for: "ai-bots",
    id: text ? "robots-add" : "robots-new",
    kind: "text",
    code: lines.join("\n").replace(/\n#\n?$/, "\n"),
    vars: { bots: blocked.map((b) => b.ua).join(", ") }
  };
}
function metaFix(r) {
  const m = r.model;
  const fp = m.firstParagraph || m.paragraphs[0] || "";
  if (!fp && !m.h1s[0]) return null;
  let d = m.metaDescription;
  if (!d || d.length < 70) {
    d = fp.length <= 155 ? fp : fp.slice(0, 155).replace(/\s+\S*$/, "") + "\u2026";
  }
  const brand = m.siteName || "";
  let t2 = m.title;
  if (!t2 || t2.length < 10 || /^(home|homepage|welcome|accueil|startseite|index)\b/i.test(t2)) {
    t2 = [m.h1s[0] || TODO, brand].filter(Boolean).join(" | ").slice(0, 65);
  }
  const esc2 = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return { for: "title-meta", id: "meta", kind: "html", code: `<title>${esc2(t2)}</title>
<meta name="description" content="${esc2(d || TODO)}">` };
}
function hreflangFix(r) {
  const m = r.model;
  const items = m.hreflangs.filter((h) => h.lang !== "x-default");
  const self = { lang: (m.lang || TODO).toLowerCase(), href: r.url.split("#")[0] };
  if (!items.some((h) => abs(h.href, r.url).replace(/\/$/, "") === self.href.replace(/\/$/, ""))) items.push(self);
  if (items.length < 2 && !m.hreflangs.length) {
    const dir = (m.lang || "").startsWith("ar") ? ' dir="rtl"' : "";
    return { for: "lang", id: "lang-attr", kind: "html", code: `<html lang="${m.lang || TODO}"${dir}>` };
  }
  const def = m.hreflangs.find((h) => h.lang === "x-default")?.href || items.find((h) => h.lang.startsWith("en"))?.href || items[0].href;
  const tags = [
    ...items.map((h) => `<link rel="alternate" hreflang="${h.lang}" href="${abs(h.href, r.url)}">`),
    `<link rel="alternate" hreflang="x-default" href="${abs(def, r.url)}">`
  ];
  return { for: "lang", id: "hreflang", kind: "html", code: tags.join("\n") };
}
function freshFix(r) {
  const today2 = (r.at || (/* @__PURE__ */ new Date()).toISOString()).slice(0, 10);
  return {
    for: "fresh",
    id: "fresh",
    kind: "html",
    code: `<p>Updated <time datetime="${today2}">${today2}</time></p>

<!-- and in your page's JSON-LD: -->
"dateModified": "${today2}"`
  };
}
function altFix(doc, r) {
  const miss = Array.from(doc.querySelectorAll("main img, article img, body img")).filter((i) => !clean2(i.getAttribute("alt")) && i.getAttribute("role") !== "presentation" && !/^data:/.test(i.getAttribute("src") || "")).map((i) => abs(i.getAttribute("src"), r.url)).filter(Boolean);
  const uniq2 = Array.from(new Set(miss)).slice(0, 15);
  if (!uniq2.length) return null;
  return { for: "media", id: "alt", kind: "text", code: uniq2.map((u) => `${u}
  alt="${TODO}: what the image shows, in the page's language"`).join("\n"), vars: { n: uniq2.length } };
}
function llmsFix(doc, r, brand) {
  const origin2 = new URL(r.url).origin;
  const seen2 = /* @__PURE__ */ new Set();
  const links = [];
  doc.querySelectorAll("nav a[href], header a[href], footer a[href], main a[href]").forEach((a) => {
    const u = abs(a.getAttribute("href"), r.url).split("#")[0];
    const label = clean2(a.textContent);
    if (!u.startsWith(origin2) || !label || label.length > 60 || seen2.has(u) || /\.(jpg|png|pdf|zip)$/i.test(u)) return;
    seen2.add(u);
    links.push(`- [${label}](${u})`);
  });
  const name = brand || r.model.siteName || new URL(r.url).hostname;
  const code = [
    `# ${name}`,
    "",
    `> ${r.model.metaDescription || r.model.firstParagraph.slice(0, 200) || TODO}`,
    "",
    "## Main pages",
    ...links.length ? links.slice(0, 20) : [`- [Home](${origin2}/)`],
    "",
    "## Contact",
    `- ${TODO}: email or booking page`
  ].join("\n");
  return { for: "agent-files", id: "llms", kind: "text", code };
}
function fixes(doc, r, input2, brand = "") {
  const st = (id) => r.findings.find((f2) => f2.id === id)?.status || "skip";
  const bad = (id) => ["warn", "fail"].includes(st(id));
  const out = [];
  if (bad("ai-bots")) out.push(robotsFix(input2, r));
  if (bad("title-meta")) out.push(metaFix(r));
  if (bad("entity") || bad("jsonld")) out.push(orgFix(doc, r, brand));
  if (!r.model.types.includes("FAQPage") && r.model.questionHeadings + r.model.details >= 1) out.push(faqFix(doc));
  if (bad("lang")) out.push(hreflangFix(r));
  if (bad("fresh")) out.push(freshFix(r));
  if (bad("media")) out.push(altFix(doc, r));
  if (st("agent-files") === "info") out.push(llmsFix(doc, r, brand));
  return out.filter((x) => !!x);
}
function bestQuotes(r, n = 3) {
  return r.model.sentences.filter((s) => s.quotable).sort((a, b) => b.score - a.score || a.text.length - b.text.length).slice(0, n).map((s) => s.text);
}
function botAccess(input2, r) {
  const text = input2.robots && input2.robots.status < 400 ? input2.robots.text || "" : "";
  const rb = parseRobots(text);
  const path = r.model.path || "/";
  return BOTS.map((b) => ({ ...b, allowed: allowed(rb, b.ua, path) }));
}

// packages/core/src/index.ts
var VERSION = "0.8.5";
var WEIGHTS = { access: 0.2, understand: 0.3, cite: 0.4, agent: 0.1 };
function score(findings) {
  const categories = { access: null, understand: null, cite: null, agent: null };
  for (const c of Object.keys(categories)) {
    const pts = findings.filter((x) => x.category === c && x.points !== null).map((x) => x.points);
    categories[c] = pts.length ? Math.round(pts.reduce((a, b) => a + b, 0) / pts.length * 100) : null;
  }
  let sum = 0, w = 0;
  for (const c of Object.keys(categories)) {
    if (categories[c] === null) continue;
    sum += categories[c] * WEIGHTS[c];
    w += WEIGHTS[c];
  }
  const blocked = findings.some((x) => (x.id === "indexable" || x.id === "ai-bots") && x.status === "fail");
  const total = w ? Math.round(sum / w) : 0;
  return { score: blocked ? Math.min(total, 20) : total, categories };
}
function escalations(findings, total) {
  const by = (id) => findings.find((x) => x.id === id);
  const out = [];
  const idx = by("indexable"), bots = by("ai-bots");
  if (idx?.status === "fail" || bots?.status === "fail") {
    out.push({ id: "blocked", level: "urgent", vars: { what: bots?.status === "fail" ? String(bots.vars.blocked) : String(idx?.vars.reason || "") } });
  }
  const sd = by("jsonld"), ent = by("entity"), pt = by("page-type");
  if (sd?.status === "fail" || ent?.status === "warn" && ent.vars.missing === "Organization" && pt?.status === "warn") {
    out.push({ id: "schema", level: "project", vars: {} });
  }
  const lang = by("lang");
  if (lang?.status === "fail" || lang?.status === "warn" && Number(lang.vars.versions) > 0) {
    out.push({ id: "multilingual", level: "project", vars: { problems: String(lang?.vars.problems || "") } });
  }
  if (by("js-content")?.status === "warn") out.push({ id: "rendering", level: "project", vars: { pct: by("js-content").vars.pct } });
  if (pt?.vars.kind === "product" && pt.status === "warn") out.push({ id: "commerce", level: "project", vars: {} });
  if (total < 50 && !out.some((e2) => e2.level === "urgent")) out.push({ id: "foundation", level: "project", vars: { score: total } });
  return out;
}
function siteSummary(reports) {
  const n = reports.length;
  const avg = n ? Math.round(reports.reduce((a, r) => a + r.score, 0) / n) : 0;
  const counts = /* @__PURE__ */ new Map();
  for (const r of reports) for (const f2 of r.findings) {
    if (f2.evidence === "optional" || f2.status !== "fail" && f2.status !== "warn") continue;
    const c = counts.get(f2.id) || { id: f2.id, fail: 0, warn: 0 };
    c[f2.status]++;
    counts.set(f2.id, c);
  }
  const common = Array.from(counts.values()).sort((a, b) => b.fail * 2 + b.warn - (a.fail * 2 + a.warn)).slice(0, 6);
  const bands = { high: reports.filter((r) => r.score >= 75).length, mid: reports.filter((r) => r.score >= 50 && r.score < 75).length, low: reports.filter((r) => r.score < 50).length };
  const weakest = [...reports].sort((a, b) => a.score - b.score).slice(0, 8).map((r) => ({ url: r.url, score: r.score, title: r.model.title }));
  return { n, avg, bands, common, weakest };
}
function audit(input2, parse2) {
  const at = input2.at || (/* @__PURE__ */ new Date()).toISOString();
  const doc = parse2(input2.html);
  const model = extract(doc, { ...input2, at }, parse2);
  const findings = RULES.map((r) => r(model, { ...input2, at }));
  const s = score(findings);
  return {
    url: input2.url,
    at,
    lang: model.lang,
    score: s.score,
    categories: s.categories,
    findings,
    escalations: escalations(findings, s.score),
    model,
    version: VERSION
  };
}

// packages/agent/src/text.ts
var AR_DIACRITICS = /[ً-ٰٟـ]/g;
function normalize(s) {
  return s.replace(AR_DIACRITICS, "").replace(/[أإآٱ]/g, "\u0627").replace(/ى/g, "\u064A").replace(/ة/g, "\u0647").replace(/ؤ/g, "\u0648").replace(/ئ/g, "\u064A").replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632)).normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").toLowerCase();
}
var STOP = {
  en: "a an the and or but of to in on at for with by from as is are was were be been being it its this that these those i you he she we they me my your our their what which who whom whose when where why how do does did can could should would will shall may might must not no yes so if then than there here about into over under after before near best top good great most more very much many any some all each every one two get got have has had also just only near me us vs versus",
  fr: "le la les un une des du de d l et ou mais au aux a \xE0 en dans sur pour par avec sans sous chez ce cet cette ces qui que quoi quel quelle quels quelles dont o\xF9 comment pourquoi quand est sont \xE9tait \xEAtre \xE9t\xE9 il elle ils elles on nous vous je tu me te se mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs ne pas plus moins tr\xE8s bien meilleur meilleure meilleurs meilleures tout tous toute toutes y a-t-il peut faut fait combien",
  de: "der die das den dem des ein eine einer eines einem einen und oder aber von zu im in am an auf f\xFCr mit ohne bei aus nach vor \xFCber unter ist sind war waren sein wird werden hat haben es er sie wir ihr ich du mein meine dein unser euer was wer wie wo wann warum welche welcher welches gibt kann k\xF6nnen soll muss nicht kein keine sehr viel mehr beste besten bester gut gute guten n\xE4he",
  ar: "\u0641\u064A \u0645\u0646 \u0639\u0644\u0649 \u0627\u0644\u0649 \u0625\u0644\u0649 \u0639\u0646 \u0645\u0639 \u0647\u0630\u0627 \u0647\u0630\u0647 \u0630\u0644\u0643 \u062A\u0644\u0643 \u0627\u0644\u062A\u064A \u0627\u0644\u0630\u064A \u0627\u0644\u0630\u064A\u0646 \u0648 \u0627\u0648 \u0623\u0648 \u062B\u0645 \u0644\u0627 \u0644\u0645 \u0644\u0646 \u0645\u0627 \u0645\u0627\u0630\u0627 \u0645\u062A\u0649 \u0627\u064A\u0646 \u0623\u064A\u0646 \u0643\u064A\u0641 \u0644\u0645\u0627\u0630\u0627 \u0647\u0644 \u0647\u0648 \u0647\u064A \u0647\u0645 \u0627\u0646\u0627 \u0623\u0646\u0627 \u0646\u062D\u0646 \u0627\u0646\u062A \u0623\u0646\u062A \u0643\u0644 \u0628\u0639\u0636 \u0627\u064A \u0623\u064A \u0627\u0641\u0636\u0644 \u0623\u0641\u0636\u0644 \u0627\u062D\u0633\u0646 \u0623\u062D\u0633\u0646 \u062C\u064A\u062F \u0642\u0631\u064A\u0628 \u0643\u0645 \u064A\u0648\u062C\u062F \u0647\u0646\u0627\u0643 \u0639\u0646\u062F"
};
var STOPS = {};
for (const l of Object.keys(STOP)) STOPS[l] = new Set(normalize(STOP[l]).split(/\s+/));
for (const w of "werde wirst wird würde dies diese dieser dieses diesem man mich mein meine meinen meinem meiner sich gibt gibts ce cet cette mon ma mes qu est this my me".split(" ")) for (const l of Object.keys(STOPS)) if (l !== "ar") STOPS[l].add(w);
var ALL_STOP = new Set(Object.values(STOPS).flatMap((s) => Array.from(s)));
function stem(w, lang) {
  if (/[؀-ۿ]/.test(w)) {
    let x = w.replace(/^(وال|بال|كال|فال|لل|ال)/, "");
    if (x.length > 4) x = x.replace(/(ات|ون|ين|ها|هم|يه|يا)$/, "");
    if (x.length > 3) x = x.replace(/[هي]$/, "");
    return x;
  }
  if (w.length <= 3 || /\d/.test(w)) return w;
  if (lang === "fr") return w.replace(/(ements?|ations?|euses?|eurs?|ables?|iques?|ées?|és|ez|er|es|e|s|x)$/, "") || w;
  if (lang === "de") return w.replace(/(ungen|ung|heiten|heit|keiten|keit|innen|lich|isch|ern|em|en|er|es|e|s)$/, "") || w;
  return w.replace(/(ies)$/, "y").replace(/(sses)$/, "ss").replace(/(ing|ings|edly|ed|ly|ers|er|es|s)$/, "") || w;
}
function terms(s, lang) {
  return normalize(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1 && !ALL_STOP.has(w)).map((w) => stem(w, lang)).filter((w) => w.length > 1);
}
function uniq(a) {
  return Array.from(new Set(a));
}
function passages(page, max = 90) {
  const out = [];
  for (const b of page.blocks) {
    const words2 = b.text.split(/\s+/).filter(Boolean);
    for (let i = 0; i < words2.length; i += max) {
      out.push({ url: page.url, title: page.title, heading: b.h, text: words2.slice(i, i + max + 15).join(" ") });
      if (words2.length - i <= max + 15) break;
    }
  }
  return out;
}
function blocksOf(doc) {
  const root = doc.querySelector("main") || doc.querySelector("article") || doc.body;
  if (!root) return [];
  const out = [];
  let h = (doc.querySelector("h1")?.textContent || doc.title || "").replace(/\s+/g, " ").trim();
  let buf = [];
  const flush = () => {
    const t2 = buf.join(" ").replace(/\s+/g, " ").trim();
    if (t2.length > 30) out.push({ h, text: t2 });
    buf = [];
  };
  root.querySelectorAll("h1,h2,h3,h4,p,li,dd,dt,td,blockquote,summary,address").forEach((el) => {
    if (el.closest("nav,footer,header,script,style,noscript,form")) return;
    if (/^H[1-4]$/.test(el.tagName)) {
      flush();
      h = (el.textContent || "").replace(/\s+/g, " ").trim();
      return;
    }
    if (el.querySelector("p,li")) return;
    const t2 = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (t2) buf.push(t2);
  });
  flush();
  // contact details usually sit in the footer, which the loop above skips; AI crawlers read it, so "How do I reach you?" may be answered there
  const foot = [...doc.querySelectorAll("footer, [role=contentinfo], address")].filter((el, k, a) => !a.some((o) => o !== el && o.contains(el)));
  const ft = foot.map((el) => (el.textContent || "").replace(/\s+/g, " ").trim()).join(" · ").slice(0, 400);
  if (ft.length > 20 && (ASPECT_RE.contact.test(ft) || ASPECT_WEAK.contact.test(ft))) out.push({ h: (foot[0].querySelector("h2,h3,h4")?.textContent || doc.querySelector("h1")?.textContent || doc.title || "").replace(/\s+/g, " ").trim(), text: ft });
  return out;
}

// packages/agent/src/questions.ts
var W = (re) => new RegExp(`(?<![\\p{L}\\p{N}])${re.source.replace(/^\\b/, "").replace(/\\b$/, "")}(?![\\p{L}\\p{N}])`, "giu");
var KIND_WORDS = [
  ["stay", /\b(hotel|hôtel|guest ?house|maison d'hôtes|gästehaus|pension|riad|dar|villa|hostel|auberge|b&b|bed and breakfast|lodging|resort|apartment|appartement|ferienwohnung|فندق|دار ضيافة|نزل|اقامه)\b/i],
  ["food", /\b(restaurant|café|cafe|bistro|brasserie|bakery|boulangerie|bäckerei|pizzeria|bar|coffee|مطعم|مقهى)\b/i],
  ["health", /\b(clinic|clinique|klinik|dentist|dentiste|zahnarzt|doctor|médecin|arzt|physio|kiné|pharmacy|pharmacie|apotheke|عيادة|طبيب|صيدلية)\b/i],
  ["legal", /\b(lawyer|avocat|anwalt|rechtsanwalt|law firm|cabinet d'avocats|notaire|notar|محامي|محاماة)\b/i],
  ["edu", /\b(school|école|schule|academy|académie|akademie|course|cours|kurs|training|formation|university|université|مدرسة|اكاديمية|دورة|تكوين)\b/i],
  ["saas", /\b(saas|software|logiciel|platform|plateforme|plattform|app|api|dashboard|free trial|essai gratuit|kostenlos testen|منصة|برنامج|تطبيق)\b/i],
  ["agency", /\b(agency|agence|agentur|studio|consult\w*|conseil|beratung|marketing|seo|web design|développement|entwicklung|automation|automatisation|وكالة|استشار)\b/i],
  ["shop", /\b(shop|boutique|store|magasin|laden|buy|acheter|kaufen|cart|panier|warenkorb|delivery|livraison|lieferung|متجر|شراء|توصيل)\b/i]
].map(([k, re]) => [k, W(re)]);
var DEFAULT_CAT = {
  en: { stay: "guest house", food: "restaurant", health: "clinic", shop: "online shop", agency: "agency", saas: "software", edu: "school", legal: "law firm", generic: "business" },
  fr: { stay: "maison d'h\xF4tes", food: "restaurant", health: "clinique", shop: "boutique en ligne", agency: "agence", saas: "logiciel", edu: "\xE9cole", legal: "cabinet d'avocats", generic: "entreprise" },
  de: { stay: "Unterkunft", food: "Restaurant", health: "Praxis", shop: "Onlineshop", agency: "Agentur", saas: "Software", edu: "Schule", legal: "Kanzlei", generic: "Unternehmen" },
  ar: { stay: "\u062F\u0627\u0631 \u0636\u064A\u0627\u0641\u0629", food: "\u0645\u0637\u0639\u0645", health: "\u0639\u064A\u0627\u062F\u0629", shop: "\u0645\u062A\u062C\u0631 \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A", agency: "\u0648\u0643\u0627\u0644\u0629", saas: "\u0628\u0631\u0646\u0627\u0645\u062C", edu: "\u0645\u062F\u0631\u0633\u0629", legal: "\u0645\u0643\u062A\u0628 \u0645\u062D\u0627\u0645\u0627\u0629", generic: "\u0634\u0631\u0643\u0629" }
};
var SCHEMA_KIND = [
  [/Hotel|Lodging|BedAndBreakfast|Hostel|Resort|Motel|VacationRental/, "stay"],
  [/Restaurant|FoodEstablishment|Cafe|Bakery|BarOrPub/, "food"],
  [/Medical|Dentist|Physician|Hospital|Pharmacy|Health/, "health"],
  [/Legal|Attorney|Notary/, "legal"],
  [/Educational|School|Course|College/, "edu"],
  [/SoftwareApplication|WebApplication/, "saas"],
  [/Store\b|Product\b|OnlineStore/, "shop"],
  [/ProfessionalService|MarketingAgency|Agency/, "agency"]
];
var clean3 = (s) => s.replace(/\s+/g, " ").trim();
function catPlace(texts) {
  const re = /([\p{L}'’&\- ]{3,40}?)\s+(?:in|à|au|en|near|bei|im|في|ب)\s+([\p{Lu}؀-ۿ][\p{L}'’\- ]{1,40})/u;
  for (const t2 of texts) {
    const m = re.exec(t2);
    if (!m) continue;
    let cat = clean3(m[1]).split(/\s+/).slice(-4).join(" ");
    let place = clean3(m[2]).split(/\s+/).slice(0, 4).join(" ").replace(/[,.:;|–—-].*$/, "").trim();
    const pw = place.split(" ");
    const cut = pw.findIndex((w, i) => i > 0 && /^[a-zà-ÿ]/.test(w) && !/^(de|du|des|la|le|el|al|bou|ben|am|an|der|von|sur)$/.test(w));
    if (cut > 0) place = pw.slice(0, cut).join(" ");
    cat = cat.replace(/^(the|a|an|la|le|les|une?|der|die|das|ein|eine|votre|your|our|notre|unsere?)\s+/i, "");
    if (cat.length >= 3 && place.length >= 2) return { category: cat.toLowerCase(), place };
  }
  return { category: "", place: "" };
}
var SERVICE = /(?<![\p{L}\p{N}])(technical SEO|local SEO|SEO|GEO|AI visibility|AI search optimi[sz]ation|generative engine optimi[sz]ation|search engine optimi[sz]ation|agent readiness|structured data|web ?design|website design|web development|app development|mobile apps?|e-?commerce|digital marketing|content marketing|social media marketing|social media|PPC|Google Ads|paid ads|branding|copywriting|email marketing|marketing automation|AI automation|automation|chatbots?|data analytics|CRM|UX design|UI design|IT support|cybersecurity|cloud migration|consulting|accounting|bookkeeping|payroll|translation|photography|video production|link building|digital PR|location analysis|référencement naturel|référencement|création de sites? web|création de sites?|développement web|applications? mobiles?|marketing digital|réseaux sociaux|publicité en ligne|comptabilité|traduction|Suchmaschinenoptimierung|Webdesign|Webentwicklung|App-Entwicklung|Online-Marketing|Buchhaltung|Übersetzung|تحسين محركات البحث|تصميم المواقع|تطوير التطبيقات|التسويق الرقمي|الأتمتة)(?![\p{L}\p{N}])/giu;
var LOCAL = ["stay", "food", "health", "legal", "edu", "shop"];
function count(re, text) {
  re.lastIndex = 0;
  let n = 0;
  while (re.exec(text)) n++;
  re.lastIndex = 0;
  return n;
}
function phraseBefore(texts, re, name) {
  const nameW = new Set(normalize(name).split(/\s+/));
  for (const t2 of texts) {
    for (const seg of t2.split(/\s[|–—:·•]\s|[|:·•]/)) {
      re.lastIndex = 0;
      const all = [...seg.matchAll(re)];
      re.lastIndex = 0;
      const m = all[all.length - 1];
      if (!m) continue;
      const before = seg.slice(0, m.index).trim().split(/\s+/).filter(Boolean).slice(-3);
      const words2 = [...before, m[1]].filter((w) => !nameW.has(normalize(w)) && !/^(the|a|an|your|our|best|top|leading|la|le|les|une?|votre|notre|der|die|das|ein|eine|ihre?|unsere?|beste)$/i.test(w));
      while (words2.length > 1 && /^(and|&|et|und|و)$/i.test(words2[0])) words2.shift();
      const phrase = words2.map((w) => /^[A-Z0-9]{2,}$/.test(w) ? w : w.toLowerCase()).join(" ").trim();
      if (phrase.length >= 3) return phrase;
    }
  }
  return "";
}
function profileOf(o) {
  const lang = ["en", "fr", "de", "ar"].includes(o.lang) ? o.lang : "en";
  const body = (o.text || "").slice(0, 4e3);
  const heads = o.headings.slice(0, 20).join(" \n ");
  const score2 = /* @__PURE__ */ new Map();
  for (const [k, re] of KIND_WORDS) {
    const v = 3 * count(re, o.title) + 2 * count(re, o.description) + 2 * count(re, o.h1) + count(re, heads) + 0.4 * count(re, body);
    if (v) score2.set(k, v);
  }
  for (const [re, k] of SCHEMA_KIND) if (o.types.some((t2) => re.test(t2))) score2.set(k, (score2.get(k) || 0) + 4);
  if ((o.priceSignals || 0) > 2) score2.set("shop", (score2.get("shop") || 0) + 1);
  const ranked = [...score2.entries()].sort((a, b) => b[1] - a[1]);
  const kind = ranked[0] && ranked[0][1] >= 1.5 ? ranked[0][0] : "generic";
  const domain = (() => {
    try {
      return new URL(o.url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();
  let name = clean3(o.entityName || o.siteName || "");
  if (!name) name = clean3(o.title.split(/\s[|–—\-:·]\s/)[0] || domain);
  if (name.length > 40) name = name.slice(0, 40);
  const cp = catPlace([o.h1, o.title, o.description].filter(Boolean));
  let category = cp.category;
  if (category && name) {
    const nw = new Set(normalize(name).split(/\s+/));
    const rest = category.split(/\s+/).filter((w) => !nw.has(normalize(w)));
    category = rest.length && rest.length < category.split(/\s+/).length ? "" : rest.join(" ");
    if (normalize(category) === normalize(name)) category = "";
  }
  const kre = KIND_WORDS.find(([k]) => k === kind)?.[1];
  if ((!category || !kre?.test(category)) && kre) {
    const ph = phraseBefore([o.title, o.description, o.h1], kre, name);
    if (ph) category = ph;
  }
  if (kre) kre.lastIndex = 0;
  const sv = /* @__PURE__ */ new Map();
  const add = (t2, w) => {
    SERVICE.lastIndex = 0;
    for (const m of t2.matchAll(SERVICE)) {
      const k = normalize(m[1]);
      const e2 = sv.get(k) || { label: m[1], n: 0 };
      e2.n += w;
      sv.set(k, e2);
    }
  };
  add(o.title, 3);
  add(o.description, 2);
  add(o.h1, 2);
  add(heads, 1);
  add(body, 0.5);
  let services = [...sv.values()].sort((a, b) => b.n - a.n).map((x) => x.label).filter((x) => normalize(x) !== normalize(category)).slice(0, 4);
  if (!services.length) services = o.headings.map(clean3).filter((h) => h.length >= 4 && h.length <= 40 && !/[?؟!.]/.test(h) && h.split(" ").length <= 5).filter((h) => !/^(about|contact|faq|home|blog|news|team|accueil|à propos|qui sommes|nous contacter|kontakt|über uns|impressum|startseite|من نحن|اتصل|الرئيسية|services|nos services|leistungen|خدماتنا|our services|testimonials|avis|reviews|pricing|tarifs|preise|follow us|newsletter)$/i.test(h)).filter((h) => !normalize(h).includes(normalize(name)) && normalize(h) !== normalize(o.h1) && !(cp.place && normalize(h).includes(normalize(cp.place)))).slice(0, 3);
  const place = cp.place || (LOCAL.includes(kind) ? o.locality || "" : "");
  return { name, kind, category: category || DEFAULT_CAT[lang][kind], place, services, lang, domain };
}
var TPL = {
  en: {
    base: [
      ["discover", "none", false, "Which {cat} in {place} would you recommend?"],
      ["discover", "none", false, "What are good options for a {cat} in {place}?"],
      ["compare", "none", false, "How do I choose a {cat} in {place}? What should I compare?"],
      ["price", "price", false, "How much does a {cat} in {place} cost?"],
      ["brand", "none", true, "What is {name} and who is it for?"],
      ["trust", "reviews", true, "Is {name} any good? What do customers say?"],
      ["price", "price", true, "What are {name}'s prices?"],
      ["practical", "contact", true, "How do I contact {name}?"],
      ["compare", "none", true, "{name} or another {cat} in {place}: which is better for me?"],
      ["service", "none", false, "Who offers {svc} in {place}?"]
    ],
    stay: [["practical", "where", true, "Where exactly is {name} and how do I get there?"], ["practical", "book", true, "How do I book {name}, and is breakfast included?"], ["discover", "none", false, "Which {cat} in {place} is good for families?"]],
    food: [["practical", "hours", true, "When is {name} open?"], ["practical", "book", true, "Can I book a table at {name}?"], ["discover", "none", false, "Where can I eat well in {place} tonight?"]],
    health: [["practical", "book", true, "How do I get an appointment at {name}?"], ["practical", "hours", true, "What are {name}'s opening hours?"], ["discover", "none", false, "Which {cat} in {place} speaks English?"]],
    shop: [["practical", "none", true, "Does {name} deliver, and how do returns work?"], ["discover", "none", false, "Where can I buy {svc} online?"], ["trust", "reviews", true, "Is {name} a reliable shop?"]],
    agency: [["discover", "none", false, "Which {cat} can help a small business with {svc}?"], ["price", "price", false, "How much does {svc} cost?"], ["practical", "book", true, "How do I start a project with {name}?"]],
    saas: [["discover", "none", false, "What is a good {cat} for small businesses?"], ["compare", "none", true, "What are the alternatives to {name}?"], ["price", "price", true, "Does {name} have a free plan?"]],
    edu: [["discover", "none", false, "Which {cat} in {place} offers {svc}?"], ["practical", "book", true, "How do I enrol at {name}?"], ["price", "price", true, "How much does a course at {name} cost?"]],
    legal: [["discover", "none", false, "Which {cat} in {place} handles {svc}?"], ["practical", "book", true, "How do I get a first consultation with {name}?"], ["price", "price", false, "How much does a lawyer charge for {svc} in {place}?"]],
    generic: [["practical", "where", true, "Where is {name} based?"]]
  },
  fr: {
    base: [
      ["discover", "none", false, "{Quelle} {cat} \xE0 {place} me conseilles-tu ?"],
      ["discover", "none", false, "Quelles sont les bonnes adresses de {cat} \xE0 {place} ?"],
      ["compare", "none", false, "Comment choisir {une} {cat} \xE0 {place} ? Que faut-il comparer ?"],
      ["price", "price", false, "Combien co\xFBte {une} {cat} \xE0 {place} ?"],
      ["brand", "none", true, "Qu'est-ce que {name} et pour qui ?"],
      ["trust", "reviews", true, "{name}, c'est bien ? Que disent les clients ?"],
      ["price", "price", true, "Quels sont les tarifs de {name} ?"],
      ["practical", "contact", true, "Comment contacter {name} ?"],
      ["compare", "none", true, "{name} ou {une} autre {cat} \xE0 {place} : que choisir ?"],
      ["service", "none", false, "Qui propose {svc} \xE0 {place} ?"]
    ],
    stay: [["practical", "where", true, "O\xF9 se trouve exactement {name} et comment y aller ?"], ["practical", "book", true, "Comment r\xE9server chez {name}, et le petit-d\xE9jeuner est-il inclus ?"], ["discover", "none", false, "{Quelle} {cat} \xE0 {place} pour une famille ?"]],
    food: [["practical", "hours", true, "Quand {name} est-il ouvert ?"], ["practical", "book", true, "Peut-on r\xE9server une table chez {name} ?"], ["discover", "none", false, "O\xF9 bien manger \xE0 {place} ce soir ?"]],
    health: [["practical", "book", true, "Comment prendre rendez-vous chez {name} ?"], ["practical", "hours", true, "Quels sont les horaires de {name} ?"], ["discover", "none", false, "{Quelle} {cat} \xE0 {place} parle anglais ?"]],
    shop: [["practical", "none", true, "{name} livre-t-il, et comment fonctionnent les retours ?"], ["discover", "none", false, "O\xF9 acheter {svc} en ligne ?"], ["trust", "reviews", true, "{name} est-il une boutique fiable ?"]],
    agency: [["discover", "none", false, "{Quelle} {cat} peut aider une petite entreprise en {svc} ?"], ["price", "price", false, "Quel budget pr\xE9voir pour {svc} ?"], ["practical", "book", true, "Comment lancer un projet avec {name} ?"]],
    saas: [["discover", "none", false, "{Quelle} {cat} pour une petite entreprise ?"], ["compare", "none", true, "Quelles sont les alternatives \xE0 {name} ?"], ["price", "price", true, "{name} a-t-il une offre gratuite ?"]],
    edu: [["discover", "none", false, "{Quelle} {cat} \xE0 {place} propose {svc} ?"], ["practical", "book", true, "Comment s'inscrire chez {name} ?"], ["price", "price", true, "Combien co\xFBte une formation chez {name} ?"]],
    legal: [["discover", "none", false, "{Quelle} {cat} \xE0 {place} pour {svc} ?"], ["practical", "book", true, "Comment obtenir une premi\xE8re consultation chez {name} ?"], ["price", "price", false, "Combien co\xFBte un avocat pour {svc} \xE0 {place} ?"]],
    generic: [["practical", "where", true, "O\xF9 est situ\xE9 {name} ?"]]
  },
  de: {
    base: [
      ["discover", "none", false, "{Welche} {cat} in {place} w\xFCrdest du empfehlen?"],
      ["discover", "none", false, "Was sind gute Adressen f\xFCr {cat} in {place}?"],
      ["compare", "none", false, "Wie w\xE4hle ich {eine} {cat} in {place} aus? Was sollte ich vergleichen?"],
      ["price", "price", false, "Was kostet {eine} {cat} in {place}?"],
      ["brand", "none", true, "Was ist {name} und f\xFCr wen?"],
      ["trust", "reviews", true, "Ist {name} gut? Was sagen Kunden?"],
      ["price", "price", true, "Was kostet {name}?"],
      ["practical", "contact", true, "Wie erreiche ich {name}?"],
      ["compare", "none", true, "{name} oder {andere} {cat} in {place}: was passt besser zu mir?"],
      ["service", "none", false, "Wer bietet {svc} in {place} an?"]
    ],
    stay: [["practical", "where", true, "Wo genau liegt {name} und wie komme ich hin?"], ["practical", "book", true, "Wie buche ich {name}, und ist Fr\xFChst\xFCck inklusive?"], ["discover", "none", false, "{Welche} {cat} in {place} ist gut f\xFCr Familien?"]],
    food: [["practical", "hours", true, "Wann hat {name} ge\xF6ffnet?"], ["practical", "book", true, "Kann ich bei {name} einen Tisch reservieren?"], ["discover", "none", false, "Wo kann ich heute Abend in {place} gut essen?"]],
    health: [["practical", "book", true, "Wie bekomme ich einen Termin bei {name}?"], ["practical", "hours", true, "Was sind die \xD6ffnungszeiten von {name}?"], ["discover", "none", false, "{Welche} {cat} in {place} spricht Englisch?"]],
    shop: [["practical", "none", true, "Liefert {name}, und wie funktionieren R\xFCcksendungen?"], ["discover", "none", false, "Wo kann ich {svc} online kaufen?"], ["trust", "reviews", true, "Ist {name} ein seri\xF6ser Shop?"]],
    agency: [["discover", "none", false, "{Welche} {cat} hilft kleinen Unternehmen bei {svc}?"], ["price", "price", false, "Was kostet {svc}?"], ["practical", "book", true, "Wie starte ich ein Projekt mit {name}?"]],
    saas: [["discover", "none", false, "{Welche} {cat} eignet sich f\xFCr kleine Unternehmen?"], ["compare", "none", true, "Welche Alternativen gibt es zu {name}?"], ["price", "price", true, "Hat {name} einen kostenlosen Tarif?"]],
    edu: [["discover", "none", false, "{Welche} {cat} in {place} bietet {svc} an?"], ["practical", "book", true, "Wie melde ich mich bei {name} an?"], ["price", "price", true, "Was kostet ein Kurs bei {name}?"]],
    legal: [["discover", "none", false, "{Welche} {cat} in {place} \xFCbernimmt {svc}?"], ["practical", "book", true, "Wie bekomme ich ein Erstgespr\xE4ch bei {name}?"], ["price", "price", false, "Was kostet ein Anwalt f\xFCr {svc} in {place}?"]],
    generic: [["practical", "where", true, "Wo sitzt {name}?"]]
  },
  ar: {
    base: [
      ["discover", "none", false, "\u0628\u0645\u0627\u0630\u0627 \u062A\u0646\u0635\u062D\u0646\u064A \u0625\u0630\u0627 \u0643\u0646\u062A \u0623\u0628\u062D\u062B \u0639\u0646 {cat} \u0641\u064A {place}\u061F"],
      ["discover", "none", false, "\u0645\u0627 \u0647\u064A \u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A \u0627\u0644\u062C\u064A\u062F\u0629 \u0644\u0640{cat} \u0641\u064A {place}\u061F"],
      ["compare", "none", false, "\u0643\u064A\u0641 \u0623\u062E\u062A\u0627\u0631 {cat} \u0641\u064A {place}\u061F \u0645\u0627 \u0627\u0644\u0630\u064A \u064A\u062C\u0628 \u0623\u0646 \u0623\u0642\u0627\u0631\u0646\u0647\u061F"],
      ["price", "price", false, "\u0643\u0645 \u062A\u0643\u0644\u0641\u0629 {cat} \u0641\u064A {place}\u061F"],
      ["brand", "none", true, "\u0639\u0631\u0651\u0641\u0646\u064A \u0628\u0640{name}: \u0645\u0627\u0630\u0627 \u064A\u0642\u062F\u0651\u0645 \u0648\u0644\u0645\u0646\u061F"],
      ["trust", "reviews", true, "\u0647\u0644 {name} \u062E\u064A\u0627\u0631 \u062C\u064A\u062F\u061F \u0645\u0627\u0630\u0627 \u064A\u0642\u0648\u0644 \u0627\u0644\u0639\u0645\u0644\u0627\u0621\u061F"],
      ["price", "price", true, "\u0645\u0627 \u0647\u064A \u0623\u0633\u0639\u0627\u0631 {name}\u061F"],
      ["practical", "contact", true, "\u0643\u064A\u0641 \u0623\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 {name}\u061F"],
      ["compare", "none", true, "{name} \u0623\u0645 \u062E\u064A\u0627\u0631 \u0622\u062E\u0631 \u0645\u0646 {cat} \u0641\u064A {place}: \u0645\u0627\u0630\u0627 \u064A\u0646\u0627\u0633\u0628\u0646\u064A\u061F"],
      ["service", "none", false, "\u0645\u0646 \u064A\u0642\u062F\u0645 {svc} \u0641\u064A {place}\u061F"]
    ],
    stay: [["practical", "where", true, "\u0623\u064A\u0646 \u062A\u0642\u0639 {name} \u0628\u0627\u0644\u0636\u0628\u0637 \u0648\u0643\u064A\u0641 \u0623\u0635\u0644 \u0625\u0644\u064A\u0647\u0627\u061F"], ["practical", "book", true, "\u0643\u064A\u0641 \u0623\u062D\u062C\u0632 \u0641\u064A {name}\u060C \u0648\u0647\u0644 \u0627\u0644\u0641\u0637\u0648\u0631 \u0645\u0634\u0645\u0648\u0644\u061F"], ["discover", "none", false, "\u0623\u0628\u062D\u062B \u0639\u0646 {cat} \u0641\u064A {place} \u0644\u0644\u0639\u0627\u0626\u0644\u0627\u062A: \u0645\u0627\u0630\u0627 \u062A\u0642\u062A\u0631\u062D\u061F"]],
    food: [["practical", "hours", true, "\u0645\u062A\u0649 \u064A\u0641\u062A\u062D {name}\u061F"], ["practical", "book", true, "\u0647\u0644 \u064A\u0645\u0643\u0646 \u062D\u062C\u0632 \u0637\u0627\u0648\u0644\u0629 \u0641\u064A {name}\u061F"], ["discover", "none", false, "\u0623\u064A\u0646 \u0622\u0643\u0644 \u062C\u064A\u062F\u064B\u0627 \u0641\u064A {place} \u0627\u0644\u0644\u064A\u0644\u0629\u061F"]],
    health: [["practical", "book", true, "\u0643\u064A\u0641 \u0622\u062E\u0630 \u0645\u0648\u0639\u062F\u064B\u0627 \u0641\u064A {name}\u061F"], ["practical", "hours", true, "\u0645\u0627 \u0647\u064A \u0633\u0627\u0639\u0627\u062A \u0639\u0645\u0644 {name}\u061F"], ["discover", "none", false, "\u0647\u0644 \u0641\u064A {place} {cat} \u064A\u064F\u062A\u062D\u062F\u064E\u0651\u062B \u0641\u064A\u0647\u0627 \u0628\u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629\u061F"]],
    shop: [["practical", "none", true, "\u0647\u0644 \u064A\u0648\u0635\u0644 {name}\u060C \u0648\u0643\u064A\u0641 \u064A\u062A\u0645 \u0627\u0644\u0625\u0631\u062C\u0627\u0639\u061F"], ["discover", "none", false, "\u0623\u064A\u0646 \u0623\u0634\u062A\u0631\u064A {svc} \u0639\u0628\u0631 \u0627\u0644\u0625\u0646\u062A\u0631\u0646\u062A\u061F"], ["trust", "reviews", true, "\u0647\u0644 {name} \u0645\u062A\u062C\u0631 \u0645\u0648\u062B\u0648\u0642\u061F"]],
    agency: [["discover", "none", false, "\u0623\u064A {cat} \u062A\u0633\u0627\u0639\u062F \u0627\u0644\u0634\u0631\u0643\u0627\u062A \u0627\u0644\u0635\u063A\u064A\u0631\u0629 \u0641\u064A {svc}\u061F"], ["price", "price", false, "\u0643\u0645 \u062A\u0643\u0644\u0641\u0629 {svc}\u061F"], ["practical", "book", true, "\u0643\u064A\u0641 \u0623\u0628\u062F\u0623 \u0645\u0634\u0631\u0648\u0639\u064B\u0627 \u0645\u0639 {name}\u061F"]],
    saas: [["discover", "none", false, "\u0645\u0627 \u0623\u0646\u0633\u0628 {cat} \u0644\u0644\u0634\u0631\u0643\u0627\u062A \u0627\u0644\u0635\u063A\u064A\u0631\u0629\u061F"], ["compare", "none", true, "\u0645\u0627 \u0627\u0644\u0628\u062F\u0627\u0626\u0644 \u0639\u0646 {name}\u061F"], ["price", "price", true, "\u0647\u0644 \u0644\u062F\u0649 {name} \u062E\u0637\u0629 \u0645\u062C\u0627\u0646\u064A\u0629\u061F"]],
    edu: [["discover", "none", false, "\u0623\u064A {cat} \u0641\u064A {place} \u062A\u0642\u062F\u0645 {svc}\u061F"], ["practical", "book", true, "\u0643\u064A\u0641 \u0623\u0633\u062C\u0644 \u0641\u064A {name}\u061F"], ["price", "price", true, "\u0643\u0645 \u062A\u0643\u0644\u0641\u0629 \u062F\u0648\u0631\u0629 \u0641\u064A {name}\u061F"]],
    legal: [["discover", "none", false, "\u0623\u064A {cat} \u0641\u064A {place} \u064A\u062A\u0648\u0644\u0649 {svc}\u061F"], ["practical", "book", true, "\u0643\u064A\u0641 \u0623\u062D\u0635\u0644 \u0639\u0644\u0649 \u0627\u0633\u062A\u0634\u0627\u0631\u0629 \u0623\u0648\u0644\u0649 \u0641\u064A {name}\u061F"], ["price", "price", false, "\u0643\u0645 \u064A\u0643\u0644\u0641 \u0645\u062D\u0627\u0645\u064D \u0644\u0640{svc} \u0641\u064A {place}\u061F"]],
    generic: [["practical", "where", true, "\u0623\u064A\u0646 \u064A\u0642\u0639 \u0645\u0642\u0631 {name}\u061F"]]
  }
};
var FR_M = /^(restaurant|hôtel|hotel|café|cafe|bar|studio|cabinet|magasin|logiciel|outil|centre|salon|riad|gîte|camping|atelier|bureau|site|service|spa|traiteur|garage|institut|lycée|collège|programme|cours|commerce|e-shop|shop)\b/i;
var DE_N = /^(restaurant|hotel|café|cafe|studio|unternehmen|geschäft|gästehaus|hostel|büro|institut|zentrum|tool|programm|apartment|atelier|bistro|lokal)$/i;
var DE_M = /(shop|laden|anbieter|dienst|kurs|anwalt|arzt|zahnarzt|händler|markt|salon|friseur)$/i;
function article(L, cat, w) {
  const first = cat.split(/\s+/)[0];
  const last = cat.split(/\s+/).slice(-1)[0];
  if (L === "fr") {
    const m = FR_M.test(first) || !/e$/i.test(first) && !/(ion|té)$/i.test(first);
    return w === "Quelle" ? m ? "Quel" : "Quelle" : m ? "un" : "une";
  }
  const g = DE_N.test(last) ? "n" : DE_M.test(last) ? "m" : "f";
  if (w === "Welche") return g === "n" ? "Welches" : g === "m" ? "Welcher" : "Welche";
  if (w === "andere") return g === "n" ? "ein anderes" : g === "m" ? "ein anderer" : "eine andere";
  return g === "f" ? "eine" : "ein";
}
var B2B = {
  en: [
    ["discover", "none", false, "Which {cat} would you recommend for a {aud}{in}?"],
    ["discover", "none", false, "Who are the best providers of {s1}{in}?"],
    ["service", "none", false, "I need help with {s2} for my business. Who should I hire?"],
    ["discover", "none", false, "What is {s1}, and does a {aud} need it?"],
    ["compare", "none", false, "How do I choose a {cat}? What should I compare?"],
    ["price", "price", false, "How much does {s1} cost for a {aud}{in}?"],
    ["brand", "none", true, "What does {name} do, and who is it for?"],
    ["trust", "reviews", true, "Is {name} a good choice? What do clients say?"],
    ["compare", "none", true, "What are the alternatives to {name}?"],
    ["service", "none", true, "Can {name} help with {s3}?"],
    ["price", "price", true, "How much does {name} charge?"],
    ["practical", "book", true, "How do I start a project with {name}?"]
  ],
  fr: [
    ["discover", "none", false, "{Quelle} {cat} me conseilles-tu pour une {aud}{in} ?"],
    ["discover", "none", false, "Qui sont les meilleurs prestataires en {s1}{in} ?"],
    ["service", "none", false, "J'ai besoin d'aide en {s2} pour mon entreprise. Qui engager ?"],
    ["discover", "none", false, "Qu'est-ce que {s1}, et une {aud} en a-t-elle besoin ?"],
    ["compare", "none", false, "Comment choisir {une} {cat} ? Que faut-il comparer ?"],
    ["price", "price", false, "Quel budget pr\xE9voir pour {s1} pour une {aud}{in} ?"],
    ["brand", "none", true, "Que fait {name}, et pour qui ?"],
    ["trust", "reviews", true, "{name}, c'est un bon choix ? Que disent les clients ?"],
    ["compare", "none", true, "Quelles sont les alternatives \xE0 {name} ?"],
    ["service", "none", true, "{name} peut-il aider en {s3} ?"],
    ["price", "price", true, "Quels sont les tarifs de {name} ?"],
    ["practical", "book", true, "Comment lancer un projet avec {name} ?"]
  ],
  de: [
    ["discover", "none", false, "{Welche} {cat} empfiehlst du f\xFCr ein {aud}{in}?"],
    ["discover", "none", false, "Wer sind die besten Anbieter f\xFCr {s1}{in}?"],
    ["service", "none", false, "Ich brauche Hilfe bei {s2} f\xFCr mein Unternehmen. Wen sollte ich beauftragen?"],
    ["discover", "none", false, "Was ist {s1}, und braucht ein {aud} das?"],
    ["compare", "none", false, "Wie w\xE4hle ich {eine} {cat} aus? Was sollte ich vergleichen?"],
    ["price", "price", false, "Was kostet {s1} f\xFCr ein {aud}{in}?"],
    ["brand", "none", true, "Was macht {name}, und f\xFCr wen?"],
    ["trust", "reviews", true, "Ist {name} eine gute Wahl? Was sagen Kunden?"],
    ["compare", "none", true, "Welche Alternativen gibt es zu {name}?"],
    ["service", "none", true, "Kann {name} bei {s3} helfen?"],
    ["price", "price", true, "Was kostet {name}?"],
    ["practical", "book", true, "Wie starte ich ein Projekt mit {name}?"]
  ],
  ar: [
    ["discover", "none", false, "\u0623\u064A {cat} \u062A\u0646\u0635\u062D\u0646\u064A \u0628\u0647\u0627 \u0644\u0640{aud}{in}\u061F"],
    ["discover", "none", false, "\u0645\u0646 \u0623\u0641\u0636\u0644 \u0645\u0642\u062F\u0651\u0645\u064A \u062E\u062F\u0645\u0627\u062A {s1}{in}\u061F"],
    ["service", "none", false, "\u0623\u062D\u062A\u0627\u062C \u0645\u0633\u0627\u0639\u062F\u0629 \u0641\u064A {s2} \u0644\u0634\u0631\u0643\u062A\u064A. \u0645\u0646 \u0623\u0648\u0638\u0651\u0641\u061F"],
    ["discover", "none", false, "\u0645\u0627 \u0647\u0648 {s1}\u060C \u0648\u0647\u0644 \u062A\u062D\u062A\u0627\u062C\u0647 {aud}\u061F"],
    ["compare", "none", false, "\u0643\u064A\u0641 \u0623\u062E\u062A\u0627\u0631 {cat}\u061F \u0645\u0627 \u0627\u0644\u0630\u064A \u064A\u062C\u0628 \u0623\u0646 \u0623\u0642\u0627\u0631\u0646\u0647\u061F"],
    ["price", "price", false, "\u0643\u0645 \u062A\u0643\u0644\u0641\u0629 {s1} \u0644\u0640{aud}{in}\u061F"],
    ["brand", "none", true, "\u0645\u0627\u0630\u0627 \u062A\u0642\u062F\u0651\u0645 {name}\u060C \u0648\u0644\u0645\u0646\u061F"],
    ["trust", "reviews", true, "\u0647\u0644 {name} \u062E\u064A\u0627\u0631 \u062C\u064A\u062F\u061F \u0645\u0627\u0630\u0627 \u064A\u0642\u0648\u0644 \u0627\u0644\u0639\u0645\u0644\u0627\u0621\u061F"],
    ["compare", "none", true, "\u0645\u0627 \u0627\u0644\u0628\u062F\u0627\u0626\u0644 \u0639\u0646 {name}\u061F"],
    ["service", "none", true, "\u0647\u0644 \u062A\u0633\u062A\u0637\u064A\u0639 {name} \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0629 \u0641\u064A {s3}\u061F"],
    ["price", "price", true, "\u0643\u0645 \u062A\u062A\u0642\u0627\u0636\u0649 {name}\u061F"],
    ["practical", "book", true, "\u0643\u064A\u0641 \u0623\u0628\u062F\u0623 \u0645\u0634\u0631\u0648\u0639\u064B\u0627 \u0645\u0639 {name}\u061F"]
  ]
};
var AUD = { en: "small business", fr: "petite entreprise", de: "kleines Unternehmen", ar: "\u0634\u0631\u0643\u0629 \u0635\u063A\u064A\u0631\u0629" };
var FR_PREP = { france: "en France", allemagne: "en Allemagne", tunisie: "en Tunisie", belgique: "en Belgique", suisse: "en Suisse", italie: "en Italie", espagne: "en Espagne", europe: "en Europe", algerie: "en Alg\xE9rie", maroc: "au Maroc", canada: "au Canada", luxembourg: "au Luxembourg", "royaume-uni": "au Royaume-Uni", "etats-unis": "aux \xC9tats-Unis", "emirats arabes unis": "aux \xC9mirats arabes unis" };
function inMarket(L, m) {
  if (!m) return "";
  if (L === "fr") return " " + (FR_PREP[normalize(m)] || "\xE0 " + m);
  if (L === "ar") return " \u0641\u064A " + m;
  return " in " + m;
}
var NOPLACE = {
  en: [[/\s+(in|near)\s+\{place\}/g, ""]],
  fr: [[/\s+(à|en)\s+\{place\}/g, ""]],
  de: [[/\s+(in)\s+\{place\}/g, ""]],
  ar: [[/\s+في\s+\{place\}/g, ""]]
};
function predictQuestions(p, extra = []) {
  const L = TPL[p.lang] ? p.lang : "en";
  if (p.kind === "agency" || p.kind === "saas" || p.kind === "generic" && !p.place) return finish(b2bQuestions(p, L), p, extra, L);
  const set = [...TPL[L].base.slice(0, 9), ...TPL[L][p.kind], ...p.services.length ? [TPL[L].base[9]] : []];
  const out = [];
  let svcI = 0;
  for (const [intent, aspect, branded, tpl] of set) {
    let s = tpl;
    if (!p.place) for (const [re, r] of NOPLACE[L]) s = s.replace(re, r);
    if (s.includes("{svc}")) {
      const svc = p.services[svcI++ % Math.max(1, p.services.length)];
      if (!svc) continue;
      s = s.replace(/\{svc\}/g, svc.toLowerCase());
    }
    s = s.replace(/\{(Quelle|une|Welche|eine|andere)\}/g, (_, w) => article(L, p.category, w));
    s = s.replace(/\{cat\}/g, p.category).replace(/\{place\}/g, p.place).replace(/\{name\}/g, p.name);
    s = polish(s, L);
    if (!out.some((q) => q.text === s)) out.push({ id: "q" + (out.length + 1), text: s, intent, aspect, branded, by: "sada" });
  }
  return finish(out, p, extra, L);
}
function b2bQuestions(p, L) {
  const sv = p.services.length ? p.services : [p.category];
  const s = (i) => sv[i % sv.length] || p.category;
  const out = [];
  for (const [intent, aspect, branded, tpl] of B2B[L]) {
    let t2 = tpl.replace(/\{(Quelle|une|Welche|eine|andere)\}/g, (_, w) => article(L, p.category, w)).replace(/\{cat\}/g, p.category).replace(/\{name\}/g, p.name).replace(/\{aud\}/g, p.audience || AUD[L]).replace(/\{in\}/g, inMarket(L, p.market || "")).replace(/\{s1\}/g, s(0)).replace(/\{s2\}/g, s(1)).replace(/\{s3\}/g, s(2));
    t2 = polish(t2, L);
    if (!out.some((q) => q.text === t2)) out.push({ id: "q" + (out.length + 1), text: t2, intent, aspect, branded, by: "sada" });
  }
  return out;
}
function polish(t2, L) {
  if (L === "en") t2 = t2.replace(/\ba ([A-Z]{2,}\b)/g, (m, w) => /^[AEFHILMNORSX]/.test(w) ? "an " + w : m).replace(/\ba ([aeiouAEIOU][a-z])/g, "an $1");
  if (L === "fr") t2 = t2.replace(/\b(de|que|le|la) (?=[aeiouyàâéèêëîïôûAEIOUYÀÂÉÈÊÎÔÛ])/g, (_, w) => w === "que" ? "qu'" : w === "de" ? "d'" : "l'");
  return t2.replace(/\s+([?؟])/g, L === "fr" ? " $1" : "$1").replace(/\s{2,}/g, " ").trim();
}
function finish(base, p, extra, L) {
  const out = [...base];
  for (const e2 of extra) {
    const s = e2.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").replace(/\*\*/g, "").trim();
    if (s.length < 12 || s.length > 160 || out.some((q) => normalize(q.text) === normalize(s))) continue;
    const branded = !!p.name && normalize(s).includes(normalize(p.name));
    out.push({ id: "q" + (out.length + 1), text: s, intent: guessIntent(s), aspect: guessAspect(s), branded, by: "ai" });
  }
  return out.sort((a, b) => Number(a.branded) - Number(b.branded)).slice(0, 18);
}
var ASPECT_Q = [
  ["price", /(price|cost|how much|fee|rate|budget|cheap|prix|tarif|coût|combien|preis|kosten|kostet|günstig|سعر|اسعار|تكلف|كم)/i],
  ["hours", /(open|hours|horaire|ouvert|öffnungszeit|geöffnet|ساعات|يفتح)/i],
  ["book", /(book|reserv|appointment|rendez-vous|réserv|buchen|termin|reservier|حجز|موعد|اشترك|enrol|inscri|anmeld)/i],
  ["where", /(where|located|address|get there|où|adresse|wo |liegt|anfahrt|اين|أين|عنوان)/i],
  ["reviews", /(review|rating|reliable|trust|avis|fiable|bewertung|seriös|تقييم|موثوق)/i],
  ["contact", /(contact|phone|email|call|joindre|kontakt|erreich|تواصل|هاتف)/i]
];
function guessAspect(s) {
  for (const [a, re] of ASPECT_Q) if (re.test(s)) return a;
  return "none";
}
function guessIntent(s) {
  const a = guessAspect(s);
  if (a === "price") return "price";
  if (a === "reviews") return "trust";
  if (a !== "none") return "practical";
  if (/(vs|versus|compare|alternative|or |ou |oder |أم |بدائل|choisir|wählen|choose)/i.test(s)) return "compare";
  return "discover";
}
function questionPrompt(p) {
  const L = { en: "English", fr: "French", de: "German", ar: "Arabic" }[p.lang] || "English";
  return {
    system: `You help a small business see its market through its customers' eyes. Write in ${L}. Output only a numbered list.`,
    user: `A ${p.category}${p.place ? " in " + p.place : ""} named "${p.name}"${p.services.length ? " offers: " + p.services.join(", ") : ""}.
List 6 different questions real customers type into ChatGPT, Perplexity or Google AI Mode BEFORE choosing a business like this. Mix: finding options, comparing, prices, practical details, trust. Most should NOT contain the business name. One per line, numbered.`
  };
}

// packages/agent/src/retrieve.ts
// strong evidence that a passage answers the aspect (word-bounded: "lab 10" is not "ab 10")
var ASPECT_RE = {
  price: /(?<![\p{L}\p{N}])(\d[\d\s.,]*\s?(€|eur|euros?|\$|usd|£|gbp|tnd|dt|د\.?ت|dinars?|chf|mad|dhs?|aed|sar)(?![\p{L}])|(€|\$|£)\s?\d|(from|à partir de|dès|ab|starting at)\s+\d|free of charge|no charge|kostenlos|gebührenfrei|gratuite?|مجان)/iu,
  hours: /(?<![\p{L}\p{N}])(\d{1,2}[:h.]\d{2}(?!\d)|\d{1,2}\s?(am|pm)(?![\p{L}])|\d{1,2}\s?(bis|à|to|[-–])\s?\d{1,2}\s?(uhr|h)(?![\p{L}])|\d{1,2}\s?uhr(?![\p{L}])|open(ing)? hours|horaires|öffnungszeiten|ساعات العمل|mon(day)?\s*[-–]|lun(di)?\s*[-–]|mo(ntag)?\s*[-–]|montags|lundi au|monday to|24\/7|7j\/7|من الساعة)/iu,
  book: /(?<![\p{L}])(book|booking|reserv\p{L}*|réserv\p{L}*|buchen|buchung|reservier\p{L}*|termin\p{L}*|appointment|rendez-vous|حجز|موعد|sign up|inscri\p{L}*|anmeld\p{L}*|get started|commencer|contact us to|nous contacter pour|mitglied werden|mitgliedsantrag|beitreten|become a member|join us|adhérer|adhésion|bewerb\p{L}*|apply|candidat\p{L}*)/iu,
  where: /(?<![\p{L}\p{N}])(\d+\s?(km|min|minutes|m)(?![\p{L}])|address|adresse|anschrift|عنوان|airport|aéroport|flughafen|مطار|station|gare|bahnhof|metro|métro|tram|parking|street|rue|straße|strasse|شارع|located|situé|liegt|تقع)/iu,
  reviews: /(?<![\p{L}])(reviews?|ratings?|stars?|★|avis|bewertung\p{L}*|sterne|تقييم|نجوم|testimonials?|témoignages?|kundenstimmen|آراء|trustpilot|google reviews|tripadvisor)(?![\p{L}])/iu,
  contact: /(@[\w-]+\.\w|\+?\d[\d\s().\/-]{7,}|(?<![\p{L}])(phone|tél|telefon\p{L}*|هاتف|e-?mail|whatsapp|contact)(?![\p{L}]))/iu,
  none: null
};
// weak evidence: the topic is named, but not answered (a price word without a price)
var ASPECT_WEAK = {
  price: /(?<![\p{L}])(price|prices|pricing|tarifs?|prix|preise?|kosten|gebühren?|fees?|سعر|اسعار|أسعار|quote|devis|angebot|عرض سعر)(?![\p{L}])/iu,
  hours: /(?<![\p{L}])(geöffnet|ouvert|open daily|täglich|tous les jours|مفتوح)(?![\p{L}])/iu,
  // a way to reach you without the details themselves ("Book a free call")
  contact: /(?<![\p{L}])(call|calls|anruf\p{L}*|rückruf|appel\p{L}*|get in touch|écrivez|schreiben sie|formulaire|kontaktformular|contact form|اتصل|تواصل|adresse|address|anschrift|rue|street|avenue|عنوان|شارع)(?![\p{L}])|\p{L}(straße|strasse|str\.|platz|weg|gasse)\s?\d/iu
};
// words that ask about the same thing in other words; any member counts for the whole group
var CONCEPTS = [
  "veranstaltung veranstaltungen event events programm festival konzert lesung lesungen ausstellung exhibition concert événement agenda spectacle فعاليات مهرجان woche wochenende weekend week semaine los",
  "sehenswürdigkeit sehenswürdigkeiten unternehmen attraction attractions sights things museum ausflug freizeit wandern wanderwege hiking tourist visit visiter monument activités loisirs معالم سياحة",
  "wohnsitz anmelden ummelden meldebescheinigung bürgerbüro bürgeramt registration register domicile résidence تسجيل",
  "stellen stelle job jobs karriere ausbildung bewerbung bewerben arbeiten arbeitgeber vacancies career emploi recrutement candidature وظائف توظيف",
  "anliegen antrag anträge dienstleistungen serviceportal services démarches formalités procedures خدمات معاملات",
  "manger essen eat dîner déjeuner dinner lunch cuisine küche speisen repas meal mahlzeit menu menü gericht gerichte plat plats أكل مطعم وجبة",
  "mitglied mitgliedschaft membership member adhésion adhérer عضوية"
];
var CONCEPT_CACHE = {};
function conceptOf(t2, lang) {
  if (!CONCEPT_CACHE[lang]) CONCEPT_CACHE[lang] = CONCEPTS.map((g) => uniq(terms(g, lang)));
  return CONCEPT_CACHE[lang].find((g) => g.includes(t2)) || null;
}
var COMPARE = /(compar|unlike|than |versus| vs\.? |difference|criteria|choose|choosing|choisir|critère|contrairement|par rapport|vergleich|unterschied|kriterien|wählen|im gegensatz|مقارن|بخلاف|معايير|اختيار|الفرق)/i;
function bm25(index, df, avg, q) {
  const N = index.length, k1 = 1.2, b = 0.75;
  return index.map((d) => {
    let s = 0;
    for (const t2 of q) {
      const f2 = d.tf.get(t2) || 0;
      if (!f2) continue;
      const idf = Math.log(1 + (N - (df.get(t2) || 0) + 0.5) / ((df.get(t2) || 0) + 0.5));
      s += idf * (f2 * (k1 + 1) / (f2 + k1 * (1 - b + b * d.len / avg)));
    }
    return s;
  });
}
var GENERIC = "help helps aide aider helfen hilft \u0645\u0633\u0627\u0639\u062F\u0647 \u064A\u0633\u0627\u0639\u062F exactly exact get there way another other autre autres exactement andere anderen genau \u0622\u062E\u0631 \u0627\u062E\u0631\u064A \u0628\u0627\u0644\u0636\u0628\u0637 recommend options option good better suit suits cost costs much prices price customers say what who offers offer would need know tell contact get there reliable families family conseilles conseiller adresses adresse bonnes faut convient co\xFBte coute combien tarifs disent clients propose empfehlen adressen gute sollte kostet kosten passt besser sagen kunden bietet erreiche \u062A\u0646\u0635\u062D\u0646\u064A \u062A\u0646\u0635\u062D \u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A \u0627\u0644\u062C\u064A\u062F\u0647 \u064A\u0646\u0627\u0633\u0628\u0646\u064A \u062A\u0643\u0644\u0641\u0647 \u0627\u0633\u0639\u0627\u0631 \u064A\u0642\u0648\u0644 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u064A\u0642\u062F\u0645 \u0627\u062A\u0648\u0627\u0635\u0644 \u0627\u0642\u062A\u0631\u062D \u0627\u0628\u062D\u062B";
function coverage(questions2, passages2, p) {
  const lang = p.lang;
  const catT = terms(p.category, lang);
  const skip = /* @__PURE__ */ new Set([...terms(p.name, lang), ...terms(p.place, lang), ...terms(p.domain.split(".")[0] || "", lang), ...terms(GENERIC, lang)]);
  const docs = passages2.map((x) => {
    const ts = terms(`${x.heading} ${x.heading} ${x.text}`, lang);
    const tf = /* @__PURE__ */ new Map();
    for (const t2 of ts) tf.set(t2, (tf.get(t2) || 0) + 1);
    return { tf, len: ts.length, head: new Set(terms(x.heading, lang)) };
  });
  const df = /* @__PURE__ */ new Map();
  for (const d of docs) for (const t2 of d.tf.keys()) df.set(t2, (df.get(t2) || 0) + 1);
  const avg = docs.reduce((a, d) => a + d.len, 0) / Math.max(1, docs.length);
  const catTerms = catT;
  // asks for a fact (a price, opening hours, how to book or reach you, what customers say): words alone do not answer them
  const FACT = /* @__PURE__ */ new Set(["price", "hours", "book", "contact", "reviews"]);
  const OR = /\s(?:or|oder|ou|أو|أم)\s/i;
  return questions2.map((q) => {
    const all = uniq(terms(q.text, lang));
    let topic = all.filter((t2) => !skip.has(t2));
    if (!topic.length && !q.branded) topic = catTerms;
    // the category helps find passages, but the question's own words decide whether it is answered
    const scores = bm25(docs, df, avg, uniq([...topic.length ? topic : all, ...!q.branded ? catTerms : []]));
    const anyDoc = !topic.length;
    const re = q.intent === "compare" && q.aspect === "none" ? COMPARE : ASPECT_RE[q.aspect];
    let best = -1, bestFit = 0, bestHead = -1;
    const toSlots = (ts) => ts.map((t2) => conceptOf(t2, lang) || [t2]);
    // an unbranded question names the category ("a meal in a restaurant"); the site already is one, so its passages need not repeat it
    const slots = toSlots(q.branded ? topic : topic.filter((t2) => !catTerms.includes(t2)));
    // "Wie werde ich Mitglied, oder wie kann ich mich engagieren?": either half answers it
    const parts = OR.test(q.text) ? q.text.split(OR).map((x) => toSlots(uniq(terms(x, lang)).filter((t2) => !skip.has(t2)))).filter((x) => x.length) : [];
    // looking for a provider ("Where can I eat in Lyon?"); a town's visitors ask about the town, not about its administration
    const discover = !q.branded && q.aspect === "none" && q.intent !== "compare" && !["public", "generic"].includes(p.kind);
    scores.forEach((s, i) => {
      const d = docs[i];
      if (s <= 0 && !re && !anyDoc && !slots.some((alts) => alts.some((a) => d.tf.has(a)))) return;
      // a word counts when the passage has it, or a compound that starts with it ("Bewerbungsschluss" for "bewerb")
      const has = (t2) => d.tf.has(t2) || t2.length >= 5 && (d.keys ||= [...d.tf.keys()]).some((k) => k.length > t2.length && k.startsWith(t2));
      const share = (sl) => sl.length ? sl.filter((alts) => alts.some(has)).length / sl.length : 1;
      // "What is X, and for whom?" has no topic words of its own: the passage must at least say what X is
      const covered = slots.length ? Math.max(share(slots), ...parts.map(share)) : !re && catTerms.length && !catTerms.some(has) ? 0.4 : 1;
      const raw = `${passages2[i].heading} ${passages2[i].text}`;
      const strong = re ? re.test(raw) : false;
      const weak = !strong && !!ASPECT_WEAK[q.aspect]?.test(raw);
      const placeOk = !p.place || q.branded || normalize(raw).includes(normalize(p.place).split(/[^\p{L}\p{N}]+/u).find((w) => w.length > 2) || "\u0000");
      // without an aspect to check, the words carry the score; with one, real evidence (a price, an hour) does
      let fit = covered === 0 ? 0 : Math.round(100 * ((re ? 0.55 : 0.85) * covered + (re ? strong ? 0.3 : weak ? 0.12 : 0 : 0) + (placeOk ? 0.15 : 0)));
      // "Where can I eat in Lyon?": a page that says it is a restaurant in Lyon is a real (partial) answer
      if (discover && placeOk && catTerms.some(has)) fit = Math.max(fit, 60 + Math.round(20 * share(toSlots(topic.filter((t2) => !catTerms.includes(t2))))));
      if (re && FACT.has(q.aspect) && !strong) fit = Math.min(fit, weak ? 60 : 44);
      // "How do I start a project with AYKA?" and the page offers "Book a free call": a real, if indirect, answer
      if (covered === 0 && strong && q.branded && FACT.has(q.aspect)) fit = 50;
      const head = slots.filter((alts) => alts.some((a) => d.head.has(a))).length;
      if (fit > bestFit || fit === bestFit && best >= 0 && (head > bestHead || head === bestHead && s > scores[best])) {
        bestFit = fit;
        best = i;
        bestHead = head;
      }
    });
    const status = bestFit >= 75 ? "answered" : bestFit >= 45 ? "partial" : "missing";
    return { q, status, fit: bestFit, best: best >= 0 ? passages2[best] : null };
  });
}

// packages/agent/src/names.ts
function norm(s) {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
function namesIn(text) {
  const out = [];
  const push = (s) => {
    const n = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`#]/g, "").replace(/\s*[(:–—-]\s.*$/, "").replace(/\s*[(:–—]\s*$/, "").replace(/[:.]$/, "").trim();
    if (n.length >= 3 && n.length <= 60 && n.split(/\s+/).length <= 8 && !out.some((x) => norm(x) === norm(n))) out.push(n);
  };
  for (const line of text.split("\n")) {
    const m = /^\s*(?:\d+[.)]|[-*•]|#{2,4})\s+(.+)$/.exec(line);
    if (m) {
      const bold = /\*\*([^*\n]{3,80})\*\*/.exec(m[1]);
      push(bold ? bold[1] : m[1]);
    }
  }
  for (const m of text.matchAll(/\*\*([^*\n]{3,80})\*\*/g)) push(m[1]);
  return out.slice(0, 15);
}
function mentions(text, brand) {
  const b = norm(brand).replace(/\b(the|sarl|gmbh|ltd|llc|inc|sa|technologies)\b/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  if (!b) return false;
  const t2 = norm(text).replace(/[^\p{L}\p{N}]+/gu, " ");
  return (" " + t2 + " ").includes(" " + b + " ");
}

// packages/agent/src/engines.ts
var e = encodeURIComponent;
var ENGINES = [
  { id: "chatgpt", name: "ChatGPT", link: (q) => `https://chatgpt.com/?q=${e(q)}&hints=search`, prefill: true, web: true },
  { id: "aimode", name: "Google AI Mode", link: (q) => `https://www.google.com/search?udm=50&q=${e(q)}`, prefill: true, web: true },
  { id: "perplexity", name: "Perplexity", link: (q) => `https://www.perplexity.ai/search?q=${e(q)}`, prefill: true, web: true },
  { id: "gemini", name: "Gemini", link: () => `https://gemini.google.com/app`, prefill: false, web: true },
  { id: "copilot", name: "Copilot", link: (q) => `https://copilot.microsoft.com/?q=${e(q)}`, prefill: true, web: true },
  { id: "claude", name: "Claude", link: (q) => `https://claude.ai/new?q=${e(q)}`, prefill: true, web: true },
  { id: "grok", name: "Grok", link: (q) => `https://grok.com/?q=${e(q)}`, prefill: true, web: true },
  { id: "lechat", name: "Le Chat", link: (q) => `https://chat.mistral.ai/chat?q=${e(q)}`, prefill: true, web: true }
];
var DOMAIN = /\b((?:[a-z0-9-]+\.)+(?:com|org|net|io|ai|co|fr|de|tn|uk|es|it|be|ch|ca|us|eu|info|travel|app|dev|ma|dz|ae|sa|nl|at|pl|pt|se|no|dk|fi|ie|gr|tr|in|jp|au|nz|br|mx))\b/gi;
function checkAnswer(text, brand, domain, aliases = []) {
  const clean4 = text.replace(/\r/g, "");
  const host2 = domain.replace(/^www\./, "").toLowerCase();
  const names = [brand, ...aliases].filter(Boolean);
  const hit = (x) => names.some((b) => mentions(x, b));
  const named = hit(clean4) || !!host2 && clean4.toLowerCase().includes(host2);
  const list = namesIn(clean4);
  const idx = list.findIndex((n) => hit(n) || host2 && n.toLowerCase().includes(host2));
  const others = list.filter((n, i) => i !== idx && !hit(n)).slice(0, 10);
  const urls = Array.from(clean4.matchAll(/https?:\/\/([^/\s)\]>"']+)/gi)).map((m) => m[1].toLowerCase());
  const bare = Array.from(clean4.matchAll(DOMAIN)).map((m) => m[1].toLowerCase());
  const domains = Array.from(new Set([...urls, ...bare].map((d) => d.replace(/^www\./, "")).filter((d) => d !== host2 && !/^(chatgpt\.com|openai\.com|perplexity\.ai|google\.com|gemini\.google\.com|copilot\.microsoft\.com|claude\.ai|grok\.com|mistral\.ai)$/.test(d)))).slice(0, 15);
  let excerpt = "";
  if (named) {
    const sentences = clean4.split(/(?<=[.!?؟])\s+|\n+/);
    excerpt = (sentences.find((s) => hit(s) || host2 && s.toLowerCase().includes(host2)) || "").replace(/\*\*|__|`/g, "").replace(/^\s*(?:\d+[.)]|[-*•])\s+/, "").trim().slice(0, 300);
  }
  return { named, rank: idx >= 0 ? idx + 1 : 0, others, domains, excerpt, words: clean4.split(/\s+/).filter(Boolean).length };
}
function promptFor(q, lang) {
  const tail = {
    en: "Please name specific options and give your sources.",
    fr: "Cite des options pr\xE9cises et donne tes sources.",
    de: "Nenne konkrete Optionen und deine Quellen.",
    ar: "\u0627\u0630\u0643\u0631 \u062E\u064A\u0627\u0631\u0627\u062A \u0645\u062D\u062F\u062F\u0629 \u0648\u0645\u0635\u0627\u062F\u0631\u0643."
  };
  return `${q}
${tail[lang] || tail.en}`;
}

// packages/agent/src/drive.ts
var BOOK = /(book|reserve|réserv|buchen|reservier|termin|appointment|rendez-vous|حجز|موعد|buy|add to cart|acheter|ajouter au panier|kaufen|in den warenkorb|شراء|أضف|checkout|order|commander|bestellen|اطلب|get a quote|devis|angebot|start|commencer|loslegen)/i;
function drive(doc, r, input2) {
  const m = r.model;
  const nodes = flatNodes(m.jsonld);
  const typeOf = (n) => [].concat(n["@type"] || []).map(String);
  const local = nodes.some((n) => typeOf(n).some((t2) => /LocalBusiness|Hotel|Lodging|Restaurant|Store|Medical|Dentist|Legal|Cafe|FoodEstablishment/.test(t2))) || !!doc.querySelector('a[href^="tel:"]') || /(opening hours|horaires|öffnungszeiten|ساعات العمل)/i.test(m.text);
  const out = [];
  const offers = nodes.filter((n) => typeOf(n).some((t2) => /Offer|AggregateOffer/.test(t2)) || n.price || n.priceRange || n.offers);
  if (offers.length) out.push({ id: "price", status: "pass", vars: { n: offers.length } });
  else if (m.priceSignals > 0) out.push({ id: "price", status: "warn", vars: { n: m.priceSignals } });
  else out.push({ id: "price", status: "info", vars: {} });
  const hours = nodes.some((n) => n.openingHours || n.openingHoursSpecification);
  const hoursText = /(\b\d{1,2}[:h]\d{2}\s?[-–]\s?\d{1,2}[:h]\d{2}\b|\b\d{1,2}\s?(am|pm)\s?[-–])/i.test(m.text);
  out.push({ id: "hours", status: hours ? "pass" : hoursText ? "warn" : local ? "fail" : "info", vars: {} });
  const tel = doc.querySelectorAll('a[href^="tel:"]').length, mail = doc.querySelectorAll('a[href^="mailto:"]').length;
  const schemaContact = nodes.some((n) => n.telephone || n.email || n.contactPoint);
  const ways = (tel ? 1 : 0) + (mail ? 1 : 0) + (schemaContact ? 1 : 0);
  out.push({ id: "contact", status: ways >= 2 ? "pass" : ways === 1 ? "warn" : "fail", vars: { tel, mail, schema: schemaContact ? 1 : 0 } });
  const actions = Array.from(doc.querySelectorAll("a[href], button, input[type=submit]")).filter((el) => BOOK.test((el.textContent || "") + " " + (el.getAttribute("aria-label") || "") + " " + (el.getAttribute("value") || "")));
  const actionSchema = nodes.some((n) => n.potentialAction || typeOf(n).some((t2) => /ReserveAction|OrderAction|BuyAction/.test(t2)));
  out.push({ id: "action", status: actions.length && actionSchema ? "pass" : actions.length ? "warn" : "fail", vars: { n: actions.length } });
  const forms = Array.from(doc.querySelectorAll("form")).filter((f2) => f2.querySelectorAll("input:not([type=hidden]),select,textarea").length > 0 && !/search|recherche|suche|بحث/i.test((f2.getAttribute("role") || "") + (f2.getAttribute("action") || "") + (f2.querySelector("input")?.getAttribute("type") || "")));
  if (!forms.length) out.push({ id: "forms", status: "info", vars: { n: 0 } });
  else {
    let fields = 0, unlabeled = 0, auto = 0;
    for (const f2 of forms) for (const el of Array.from(f2.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]),select,textarea"))) {
      fields++;
      const id = el.getAttribute("id");
      const labelled = !!el.getAttribute("aria-label") || !!el.getAttribute("aria-labelledby") || !!el.closest("label") || !!id && !!doc.querySelector(`label[for="${id.replace(/"/g, "")}"]`);
      if (!labelled) unlabeled++;
      if (el.getAttribute("autocomplete") && el.getAttribute("autocomplete") !== "off") auto++;
    }
    out.push({ id: "forms", status: unlabeled === 0 ? auto > 0 ? "pass" : "warn" : "fail", vars: { n: forms.length, fields, unlabeled, auto } });
  }
  const unnamed = Array.from(doc.querySelectorAll("button, a[href]")).filter((el) => {
    const t2 = ((el.textContent || "") + (el.getAttribute("aria-label") || "") + (el.getAttribute("title") || "") + (el.querySelector("img")?.getAttribute("alt") || "")).trim();
    return !t2;
  }).length;
  out.push({ id: "names", status: unnamed === 0 ? "pass" : unnamed <= 3 ? "warn" : "fail", vars: { n: unnamed } });
  const tooled = forms.filter((f2) => f2.getAttribute("toolname")).length;
  out.push({ id: "webmcp", status: tooled ? "pass" : "info", vars: { n: tooled, forms: forms.length } });
  const ok = (x) => !!x && x.status >= 200 && x.status < 300;
  const shop = m.priceSignals >= 2 || m.types.includes("Product");
  out.push({ id: "commerce", status: ok(input2.ucp) ? "pass" : "info", vars: { shop: shop ? 1 : 0 } });
  return out;
}

// packages/agent/src/plan.ts
function makePlan(o) {
  const st = (id) => o.report.findings.find((f2) => f2.id === id)?.status || "skip";
  const bad = (id) => st(id) === "fail" || st(id) === "warn";
  const out = [];
  if (st("ai-bots") === "fail" || st("indexable") === "fail") out.push({ id: "unblock", impact: 3, effort: 1, who: "pro", vars: {}, go: "audit" });
  const missing = o.coverage.filter((c) => c.status !== "answered");
  const missU = missing.filter((c) => !c.q.branded);
  if (missing.length) out.push({ id: "gaps", impact: 3, effort: 2, who: "you", vars: { n: missing.length, u: missU.length, total: o.coverage.length }, go: "pack" });
  if (bad("entity") || bad("jsonld")) out.push({ id: "entity", impact: 3, effort: 1, who: "you", vars: {}, go: "pack" });
  if (bad("answer-first")) out.push({ id: "answer-first", impact: 2, effort: 1, who: "you", vars: {}, go: "audit" });
  if (bad("quotable") || bad("facts")) out.push({ id: "quotable", impact: 2, effort: 1, who: "you", vars: {}, go: "audit" });
  const top3 = o.site?.common?.[0];
  if (o.site && o.site.n > 1 && top3 && top3.fail + top3.warn >= Math.max(2, Math.round(o.site.n / 3)))
    out.push({ id: "site", impact: 3, effort: 3, who: "pro", vars: { check: top3.id, n: top3.fail + top3.warn, pages: o.site.n }, go: "audit" });
  const dbad = o.drive.filter((d) => d.status === "fail").map((d) => d.id);
  if (dbad.length) out.push({ id: "agent", impact: 2, effort: 1, who: "you", vars: { n: dbad.length, list: dbad.join(", ") }, go: "audit" });
  if (st("lang") === "fail" || st("lang") === "warn" && o.report.model.hreflangs.length) out.push({ id: "lang", impact: 2, effort: 3, who: "pro", vars: {}, go: "audit" });
  out.push({ id: "offsite", impact: 3, effort: 3, who: "pro", vars: {}, go: "ask" });
  out.push({ id: "measure", impact: 2, effort: 1, who: "you", vars: {}, go: "pack" });
  if (bad("fresh")) out.push({ id: "fresh", impact: 1, effort: 1, who: "you", vars: {}, go: "pack" });
  const value = (a) => a.impact * 2 - a.effort;
  return out.sort((a, b) => value(b) - value(a) || a.effort - b.effort).slice(0, 8);
}

// packages/agent/src/fixpack.ts
var FILE = {
  "robots-add": "robots.txt",
  "robots-new": "robots.txt",
  meta: "head-title-description.html",
  org: "schema-organization.html",
  faq: "schema-faq-existing.html",
  hreflang: "hreflang.html",
  "lang-attr": "html-lang.html",
  fresh: "updated-date.html",
  alt: "images-alt-text.txt",
  llms: "llms.txt"
};
var csv = (rows) => rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n") + "\n";
var GA4_REGEX = "chatgpt\\.com|chat\\.openai\\.com|perplexity\\.ai|gemini\\.google\\.com|copilot\\.microsoft\\.com|claude\\.ai|grok\\.com|chat\\.mistral\\.ai|meta\\.ai|chat\\.deepseek\\.com";
function buildPack(o) {
  const { t: t2 } = o;
  const files = [];
  const host2 = o.profile.domain || new URL(o.report.url).hostname;
  const plan = [`# ${t2("pack.plan.h", { site: host2 })}`, "", t2("pack.plan.intro", { date: o.date }), ""];
  o.plan.forEach((a, i) => {
    plan.push(`${i + 1}. [ ] **${t2("plan." + a.id, a.vars)}**  `);
    plan.push(`   ${t2("plan." + a.id + ".d", a.vars)}  `);
    plan.push(`   _${t2("pack.impact")}: ${"\u25CF".repeat(a.impact)}${"\u25CB".repeat(3 - a.impact)} \xB7 ${t2("pack.effort")}: ${t2("effort." + a.effort)} \xB7 ${t2(a.who === "you" ? "who.you" : "who.pro")}_`, "");
  });
  plan.push("", `---`, t2("pack.cta"));
  files.push({ name: "1-action-plan.md", text: plan.join("\n") });
  const gaps = o.coverage.filter((c) => c.status !== "answered");
  const faq2 = [`# ${t2("pack.gaps.h")}`, "", t2("pack.gaps.intro"), "", `> ${o.aiNote}`, ""];
  for (const c of gaps) {
    faq2.push(`## ${c.q.text}`, "", `_${t2("cov." + c.status)} \xB7 ${t2("pack.fit", { fit: c.fit })}_`, "");
    const d = o.drafts[c.q.id];
    const v = { name: o.profile.name, cat: o.profile.category, place: o.profile.place || "[" + t2("pack.tpl.town") + "]" };
    const tpl = c.q.aspect !== "none" ? "pack.tpl." + c.q.aspect : "pack.tpl." + c.q.intent;
    faq2.push(`**${t2("pack.draft")}**`, "", d || t2(tpl, v), "", `_${t2("pack.draft.tpl")}_`, "");
    if (c.best) faq2.push(`**${t2("pack.found")}** (${c.best.url})`, "", `> ${c.best.text.slice(0, 400)}`, "");
  }
  if (!gaps.length) faq2.push(t2("pack.gaps.none"));
  files.push({ name: "2-missing-answers.md", text: faq2.join("\n") });
  for (const f2 of fixes(o.doc, o.report, o.input, o.profile.name)) {
    const name = "3-code/" + (FILE[f2.id] || f2.id + ".txt");
    if (files.some((x) => x.name === name)) continue;
    const head = f2.kind === "html" ? `<!-- ${t2("fixk." + f2.id + ".t", f2.vars)}
     ${t2("fixk." + f2.id + ".where", f2.vars)} -->
` : `# ${t2("fixk." + f2.id + ".t", f2.vars)}
# ${t2("fixk." + f2.id + ".where", f2.vars)}

`;
    files.push({ name, text: head + f2.code + "\n" });
  }
  const qs = [`# ${t2("pack.q.h")}`, "", t2("pack.q.intro"), ""];
  for (const c of o.coverage) {
    qs.push(`## ${c.q.text}`, `_${t2(c.q.branded ? "q.branded" : "q.open")} \xB7 ${t2("intent." + c.q.intent)}_`, "");
    for (const e2 of ENGINES.filter((x) => x.prefill)) qs.push(`- [${e2.name}](${e2.link(promptFor(c.q.text, o.lang))})`);
    qs.push("");
  }
  files.push({ name: "4-questions-to-test.md", text: qs.join("\n") });
  files.push({ name: "5-measure-ai-traffic.md", text: t2("pack.measure", { regex: GA4_REGEX }) });
  files.push({ name: "data/coverage.csv", text: csv([[t2("csv.q"), t2("csv.type"), t2("csv.status"), t2("csv.fit"), t2("csv.page")], ...o.coverage.map((c) => [c.q.text, t2(c.q.branded ? "q.branded" : "q.open"), t2("cov." + c.status), c.fit, c.best?.url || ""])]) });
  files.push({ name: "data/agent-test-drive.csv", text: csv([[t2("csv.task"), t2("csv.status")], ...o.drive.map((d) => [t2("drive." + d.id), t2("dst." + d.status)])]) });
  if (o.pages?.length) files.push({ name: "data/site-pages.csv", text: csv([["URL", t2("csv.score"), t2("csv.issues")], ...o.pages.map((p) => [p.url, p.score, p.issues])]) });
  files.unshift({ name: "README.md", text: t2("pack.readme", { site: host2, date: o.date, n: files.length }) });
  return files;
}

// packages/agent/src/zip.ts
var TABLE = (() => {
  const t2 = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    t2[n] = c >>> 0;
  }
  return t2;
})();
function crc32(data) {
  let c = 4294967295;
  for (let i = 0; i < data.length; i++) c = TABLE[(c ^ data[i]) & 255] ^ c >>> 8;
  return (c ^ 4294967295) >>> 0;
}
function zip(files, when = /* @__PURE__ */ new Date()) {
  const enc = new TextEncoder();
  const time = when.getHours() << 11 | when.getMinutes() << 5 | Math.floor(when.getSeconds() / 2);
  const date = when.getFullYear() - 1980 << 9 | when.getMonth() + 1 << 5 | when.getDate();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const f2 of files) {
    const name = enc.encode(f2.name);
    const data = enc.encode(f2.text);
    const crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 67324752, true);
    lh.setUint16(4, 20, true);
    lh.setUint16(6, 2048, true);
    lh.setUint16(8, 0, true);
    lh.setUint16(10, time, true);
    lh.setUint16(12, date, true);
    lh.setUint32(14, crc, true);
    lh.setUint32(18, data.length, true);
    lh.setUint32(22, data.length, true);
    lh.setUint16(26, name.length, true);
    lh.setUint16(28, 0, true);
    const local = concat([new Uint8Array(lh.buffer), name, data]);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 33639248, true);
    ch.setUint16(4, 20, true);
    ch.setUint16(6, 20, true);
    ch.setUint16(8, 2048, true);
    ch.setUint16(10, 0, true);
    ch.setUint16(12, time, true);
    ch.setUint16(14, date, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, data.length, true);
    ch.setUint32(24, data.length, true);
    ch.setUint16(28, name.length, true);
    ch.setUint16(30, 0, true);
    ch.setUint16(32, 0, true);
    ch.setUint16(34, 0, true);
    ch.setUint16(36, 0, true);
    ch.setUint32(38, 0, true);
    ch.setUint32(42, offset, true);
    centrals.push(concat([new Uint8Array(ch.buffer), name]));
    locals.push(local);
    offset += local.length;
  }
  const cd = concat(centrals);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 101010256, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cd.length, true);
  end.setUint32(16, offset, true);
  return concat([...locals, cd, new Uint8Array(end.buffer)]);
}
function concat(parts) {
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

// apps/extension/src/collect.ts
async function collectPage(withHome) {
  const LIMIT = 2e6;
  const fetched = [];
  const get = async (path, wantText) => {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 6e3);
    try {
      fetched.push(new URL(path, location.origin).href);
      const r = await fetch(new URL(path, location.origin).href, { signal: ctl.signal, cache: "no-store", credentials: "omit", redirect: "follow" });
      const type = r.headers.get("content-type") || "";
      const text = wantText && r.ok ? (await r.text()).slice(0, path === "/" ? 6e5 : 2e5) : void 0;
      return { status: r.status, type, text };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
  let rawHtml;
  const headers = {};
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8e3);
    fetched.push(location.href);
    const r = await fetch(location.href, { signal: ctl.signal, cache: "no-store", credentials: "omit" });
    clearTimeout(timer);
    r.headers.forEach((v, k) => {
      if (/^(server|x-robots-tag|cf-ray|content-type|last-modified|link|content-language)$/i.test(k)) headers[k.toLowerCase()] = v;
    });
    if ((r.headers.get("content-type") || "").includes("html")) rawHtml = (await r.text()).slice(0, LIMIT);
  } catch {
  }
  const isHome = location.pathname === "/" || /^\/(en|de|fr|ar|index\.html?)\/?$/i.test(location.pathname);
  const [robots, llms, ucp, agentCard, home] = await Promise.all([
    get("/robots.txt", true),
    get("/llms.txt", false),
    get("/.well-known/ucp", false),
    get("/.well-known/agent-card.json", false),
    withHome && !isHome ? get("/", true) : Promise.resolve(null)
  ]);
  const ok = (x) => x && x.status < 400 && !/text\/html/i.test(x.type || "") ? x : x ? { status: x.status >= 400 ? x.status : 404 } : null;
  return {
    url: location.href.split("#")[0],
    html: document.documentElement.outerHTML.slice(0, LIMIT),
    rawHtml,
    headers,
    robots: robots && robots.status < 400 && !/text\/html/i.test(robots.type || "") ? robots : robots ? { status: robots.status >= 400 ? robots.status : 404 } : null,
    llms: ok(llms),
    ucp: ok(ucp),
    agentCard: ok(agentCard),
    pageLang: document.documentElement.lang || "",
    homeHtml: home && home.status < 400 && /html/i.test(home.type || "") ? String(home.text || "").slice(0, 6e5) : "",
    fetched
  };
}
async function collectSite(max) {
  const origin2 = location.origin;
  const t0 = Date.now();
  const fetched = [];
  const get = async (u, ms = 8e3) => {
    try {
      if (new URL(u).origin !== origin2) return null;
    } catch {
      return null;
    }
    fetched.push(u);
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(u, { signal: ctl.signal, cache: "no-store", credentials: "omit", redirect: "follow" });
      const type = r.headers.get("content-type") || "";
      const xr = r.headers.get("x-robots-tag") || "";
      const text = r.ok ? (await r.text()).slice(0, 8e5) : "";
      return { status: r.status, type, text, xr, url: r.url };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
  const robots = await get(origin2 + "/robots.txt", 5e3);
  const robotsText = robots && robots.status < 400 && !/html/i.test(robots.type) ? robots.text : "";
  const maps = Array.from(robotsText.matchAll(/^\s*sitemap\s*:\s*(\S+)/gim)).map((m) => m[1]);
  if (!maps.length) maps.push(origin2 + "/sitemap.xml", origin2 + "/sitemap_index.xml");
  const locs = [];
  const seenMaps = /* @__PURE__ */ new Set();
  const readMap = async (u, depth) => {
    if (seenMaps.has(u) || seenMaps.size > 12 || locs.length > 3e3) return;
    seenMaps.add(u);
    const r = await get(u, 6e3);
    if (!r || r.status >= 400 || !/<(urlset|sitemapindex)/i.test(r.text)) return;
    const found = Array.from(r.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)).map((m) => m[1].replace(/&amp;/g, "&"));
    if (/<sitemapindex/i.test(r.text)) {
      for (const s of found.slice(0, 8)) if (depth < 2) await readMap(s, depth + 1);
    } else locs.push(...found);
  };
  for (const m of maps.slice(0, 4)) await readMap(m, 0);
  let source = "sitemap";
  if (!locs.length) {
    source = "links";
    document.querySelectorAll("a[href]").forEach((a) => {
      try {
        locs.push(new URL(a.getAttribute("href") || "", location.href).href.split("#")[0]);
      } catch {
      }
    });
  }
  const uniq2 = Array.from(new Set(locs.filter((u) => {
    try {
      const x = new URL(u);
      return x.origin === origin2 && !/\.(pdf|jpe?g|png|gif|webp|svg|zip|xml|txt|mp4|mp3|docx?|xlsx?)$/i.test(x.pathname);
    } catch {
      return false;
    }
  })));
  const groups = /* @__PURE__ */ new Map();
  for (const u of uniq2) {
    const k = new URL(u).pathname.split("/").filter(Boolean)[0] || "/";
    (groups.get(k) || groups.set(k, []).get(k)).push(u);
  }
  const pick = [location.href.split("#")[0]];
  const lists = Array.from(groups.values());
  for (let i = 0; pick.length < max && lists.some((l) => l.length > i); i++) for (const l of lists) if (l[i] && pick.length < max && !pick.includes(l[i])) pick.push(l[i]);
  const pages = [];
  let next = 0;
  const worker = async () => {
    while (next < pick.length && Date.now() - t0 < 9e4) {
      const u = pick[next++];
      const r = await get(u);
      if (r && /html/i.test(r.type)) pages.push({ url: r.url || u, status: r.status, html: r.text, xr: r.xr });
      else pages.push({ url: u, status: r ? r.status : 0, html: "", xr: "" });
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return { fetched, origin: origin2, source, total: uniq2.length, robots: robotsText ? { status: 200, text: robotsText } : robots ? { status: robots.status } : null, pages };
}
async function collectUrl(u) {
  const origin2 = location.origin;
  let target;
  try {
    target = new URL(u, location.href);
  } catch {
    return null;
  }
  if (target.origin !== origin2) return null;
  const fetched = [];
  const get = async (url, ms = 9e3) => {
    fetched.push(url);
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctl.signal, cache: "no-store", credentials: "omit", redirect: "follow" });
      return { status: r.status, type: r.headers.get("content-type") || "", xr: r.headers.get("x-robots-tag") || "", text: r.ok ? (await r.text()).slice(0, 2e6) : "", url: r.url };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
  const [pg, rb, ll] = await Promise.all([get(target.href), get(origin2 + "/robots.txt", 5e3), get(origin2 + "/llms.txt", 5e3)]);
  if (!pg || !pg.text || !/html/i.test(pg.type)) return { fetched, url: target.href, html: "" };
  const plain = (x) => x && x.status < 400 && !/html/i.test(x.type) ? { status: x.status, text: x.text } : x ? { status: x.status >= 400 ? x.status : 404 } : null;
  return { fetched, url: pg.url || target.href, html: pg.text, rawHtml: pg.text, headers: pg.xr ? { "x-robots-tag": pg.xr } : {}, robots: plain(rb), llms: plain(ll) ? { status: plain(ll).status } : null };
}

// apps/extension/src/i18n/ar.ts
var ar_default2 = {
  "nav.agent": "\u0627\u0644\u0648\u0643\u064A\u0644",
  "nav.audit": "\u0627\u0644\u0641\u062D\u0635",
  "nav.ask": "\u0627\u0633\u0623\u0644 \u0627\u0644\u0630\u0643\u0627\u0621",
  "nav.academy": "\u0627\u0644\u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629",
  "nav.pro": "\u0628\u0631\u0648",
  "mail.sent": "(\u0623\u064F\u0631\u0633\u0644\u062A \u0645\u0646 \u0635\u062F\u0649)",
  "meter.idle": "\u0645\u0642\u064A\u0627\u0633 \u0627\u0644\u0635\u062F\u0649: \u0644\u0645 \u064A\u064F\u0642\u064E\u0633 \u0628\u0639\u062F",
  "btn.allowAll": "\u0627\u0633\u0645\u062D \u0644\u0635\u062F\u0649 \u0628\u0627\u0644\u0639\u0645\u0644 \u0639\u0644\u0649 \u0643\u0644 \u0627\u0644\u0645\u0648\u0627\u0642\u0639 (\u0644\u064A\u0642\u0631\u0623 \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u062F\u0648\u0646 \u0627\u0644\u0646\u0642\u0631 \u0639\u0644\u0649 \u0623\u064A\u0642\u0648\u0646\u062A\u0647)",
  "agent.title": "\u0623\u0631\u0633\u0644 \u0627\u0644\u0648\u0643\u064A\u0644 \u0639\u0628\u0631 {host}",
  "agent.title.none": "\u0627\u0641\u062A\u062D \u0645\u0648\u0642\u0639\u0643\u060C \u062B\u0645 \u0623\u0631\u0633\u0644 \u0627\u0644\u0648\u0643\u064A\u0644",
  "agent.lead": "\u062B\u0645\u0627\u0646\u064A \u062E\u0637\u0648\u0627\u062A \u0641\u064A \u062F\u0642\u064A\u0642\u0629 \u062A\u0642\u0631\u064A\u0628\u064B\u0627. \u064A\u0642\u0631\u0623 \u0635\u062F\u0649 \u0645\u0648\u0642\u0639\u0643 \u0643\u0645\u0627 \u062A\u0642\u0631\u0624\u0647 \u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A\u060C \u0648\u064A\u062A\u0648\u0642\u0639 \u0645\u0627 \u064A\u0633\u0623\u0644\u0647\u0627 \u0639\u0645\u0644\u0627\u0624\u0643\u060C \u0648\u064A\u062C\u062F \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0646\u0627\u0642\u0635\u0629 \u0648\u064A\u062C\u0647\u0651\u0632 \u062D\u0632\u0645\u0629 \u0627\u0644\u0625\u0635\u0644\u0627\u062D\u0627\u062A.",
  "agent.run": "\u0627\u0628\u062F\u0623 \u0627\u0644\u0645\u0647\u0645\u0629",
  "agent.working": "\u062C\u0627\u0631\u064D \u0627\u0644\u0639\u0645\u0644\u2026",
  "agent.again": "\u0623\u0639\u062F \u0627\u0644\u0645\u0647\u0645\u0629",
  "agent.free": "\u064A\u0639\u0645\u0644 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062D\u0627\u0633\u0648\u0628. \u0645\u062C\u0627\u0646\u064A\u060C \u062F\u0648\u0646 \u062D\u0633\u0627\u0628\u060C \u0648\u062F\u0648\u0646 \u0645\u0641\u062A\u0627\u062D API.",
  "agent.when": "\u0622\u062E\u0631 \u0645\u0647\u0645\u0629: {date}",
  "agent.running": "\u062C\u0627\u0631\u064D \u0642\u0631\u0627\u0621\u0629 {host}\u2026",
  "agent.score.lead": "\u0643\u064A\u0641 \u062A\u0633\u0645\u0639 \u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A {host} \u0627\u0644\u064A\u0648\u0645.",
  "agent.how": "\u0645\u0627\u0630\u0627 \u064A\u0641\u0639\u0644 \u0627\u0644\u0648\u0643\u064A\u0644",
  "ms.read.t": "\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0635\u0641\u062D\u0629",
  "ms.read.d": "\u062A\u0645\u0627\u0645\u064B\u0627 \u0645\u0627 \u064A\u062A\u0644\u0642\u0627\u0647 \u0627\u0644\u0632\u0627\u062D\u0641 \u0648\u0627\u0644\u0645\u062A\u0635\u0641\u062D.",
  "ms.access.t": "\u0641\u062D\u0635 \u0648\u0635\u0648\u0644 \u0632\u0648\u0627\u062D\u0641 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "ms.access.d": "\u0623\u064A \u0632\u0648\u0627\u062D\u0641 \u0628\u062D\u062B \u064A\u0645\u0643\u0646\u0647\u0627 \u0642\u0631\u0627\u0621\u062A\u0643\u060C \u0648\u0645\u0627 \u0627\u0644\u0630\u064A \u064A\u062D\u062C\u0628\u0647\u0627.",
  "ms.entity.t": "\u0641\u0647\u0645 \u0627\u0644\u0646\u0634\u0627\u0637 \u0627\u0644\u062A\u062C\u0627\u0631\u064A",
  "ms.entity.d": "\u0627\u0644\u0627\u0633\u0645 \u0648\u0627\u0644\u0646\u0648\u0639 \u0648\u0627\u0644\u0645\u0643\u0627\u0646 \u0643\u0645\u0627 \u062A\u0631\u0627\u0647\u0627 \u0627\u0644\u0622\u0644\u0627\u062A.",
  "ms.scan.t": "\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0645\u0648\u0642\u0639",
  "ms.scan.d": "\u062D\u062A\u0649 30 \u0635\u0641\u062D\u0629 \u0645\u0646 \u0623\u0642\u0633\u0627\u0645 \u0645\u0648\u0642\u0639\u0643\u060C \u0645\u0646 \u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0645\u0648\u0642\u0639.",
  "ms.questions.t": "\u062A\u0648\u0642\u0651\u0639 \u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621",
  "ms.questions.d": "\u0645\u0627 \u064A\u0633\u0623\u0644\u0647 \u0627\u0644\u0646\u0627\u0633 \u0644\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0642\u0628\u0644 \u0627\u062E\u062A\u064A\u0627\u0631 \u0646\u0634\u0627\u0637 \u0645\u062B\u0644 \u0646\u0634\u0627\u0637\u0643.",
  "ms.coverage.t": "\u0625\u064A\u062C\u0627\u062F \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0646\u0627\u0642\u0635\u0629",
  "ms.coverage.d": "\u0623\u064A \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u062A\u062C\u064A\u0628 \u0639\u0646\u0647\u0627 \u0635\u0641\u062D\u0627\u062A\u0643\u060C \u0645\u0642\u0637\u0639\u064B\u0627 \u0645\u0642\u0637\u0639\u064B\u0627.",
  "ms.drive.t": "\u062A\u062C\u0631\u0628\u0629 \u0627\u0644\u0648\u0643\u064A\u0644",
  "ms.drive.d": "\u0647\u0644 \u064A\u062C\u062F \u0648\u0643\u064A\u0644 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0648\u0627\u0644\u0645\u0648\u0627\u0639\u064A\u062F \u0648\u0627\u0644\u062A\u0648\u0627\u0635\u0644\u060C \u0648\u0647\u0644 \u064A\u0633\u062A\u0637\u064A\u0639 \u0627\u0644\u062D\u062C\u0632\u061F",
  "ms.pack.t": "\u0625\u0639\u062F\u0627\u062F \u0627\u0644\u062E\u0637\u0629 \u0648\u062D\u0632\u0645\u0629 \u0627\u0644\u0625\u0635\u0644\u0627\u062D\u0627\u062A",
  "ms.pack.d": "\u062E\u0637\u0648\u0627\u062A \u0645\u0631\u062A\u0628\u0629 \u0648\u0645\u0644\u0641\u0627\u062A \u062C\u0627\u0647\u0632\u0629 \u0644\u0644\u062A\u0646\u0632\u064A\u0644.",
  "ms.read.run": "\u062C\u0627\u0631\u064D \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0635\u0641\u062D\u0629\u2026",
  "ms.read.ok": "\u0627\u0644\u0646\u062A\u064A\u062C\u0629 {score}/100 \xB7 {words} \u0643\u0644\u0645\u0629",
  "ms.read.perm": "\u0627\u0646\u0642\u0631 \u0639\u0644\u0649 \u0623\u064A\u0642\u0648\u0646\u0629 \u0635\u062F\u0649 \u0641\u064A \u0634\u0631\u064A\u0637 \u0627\u0644\u0623\u062F\u0648\u0627\u062A \u0648\u0623\u0646\u062A \u0639\u0644\u0649 \u0635\u0641\u062D\u062A\u0643\u060C \u0644\u064A\u062A\u0645\u0643\u0646 \u0635\u062F\u0649 \u0645\u0646 \u0642\u0631\u0627\u0621\u062A\u0647\u0627.",
  "ms.read.fail": "\u062A\u0639\u0630\u0651\u0631\u062A \u0642\u0631\u0627\u0621\u0629 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629. \u0627\u0641\u062A\u062D \u0635\u0641\u062D\u0629 \u0648\u064A\u0628 \u0639\u0627\u062F\u064A\u0629.",
  "ms.access.run": "\u062C\u0627\u0631\u064D \u0641\u062D\u0635 robots.txt \u0648\u0627\u0644\u0625\u0634\u0627\u0631\u0627\u062A\u2026",
  "ms.access.ok": "{n} \u0645\u0646 {of} \u0632\u0648\u0627\u062D\u0641 \u0628\u062D\u062B \u064A\u0645\u0643\u0646\u0647\u0627 \u0642\u0631\u0627\u0621\u0629 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629",
  "ms.access.blocked": "\u0627\u0644\u0628\u062D\u062B \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0645\u062D\u062C\u0648\u0628 \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629",
  "ms.entity.run": "\u062C\u0627\u0631\u064D \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0623\u0633\u0645\u0627\u0621 \u0648\u0627\u0644\u062A\u0631\u0645\u064A\u0632\u2026",
  "ms.entity.ok": "{name} \xB7 {cat} \xB7 {place}",
  "ms.entity.noplace": "\u0627\u0644\u0645\u0643\u0627\u0646 \u063A\u064A\u0631 \u0645\u0630\u0643\u0648\u0631",
  "ms.scan.run": "\u062C\u0627\u0631\u064D \u0642\u0631\u0627\u0621\u0629 \u0635\u0641\u062D\u0627\u062A \u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0645\u0648\u0642\u0639\u2026",
  "ms.scan.ok": "\u0642\u064F\u0631\u0626\u062A {n} \u0635\u0641\u062D\u0627\u062A \xB7 \u0627\u0644\u0645\u062A\u0648\u0633\u0637 {avg}/100",
  "ms.scan.ok.1": "\u0642\u064f\u0631\u0626\u062a \u0635\u0641\u062d\u0629 \u0648\u0627\u062d\u062f\u0629 \u00b7 {avg}/100",
  "ms.scan.fail": "\u062A\u0639\u0630\u0651\u0631\u062A \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0627\u0644\u0623\u062E\u0631\u0649\u061B \u0646\u0643\u0645\u0644 \u0628\u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629",
  "ms.q.run": "\u062C\u0627\u0631\u064D \u062A\u0648\u0642\u0651\u0639 \u0627\u0644\u0623\u0633\u0626\u0644\u0629\u2026",
  "ms.q.ok": "{n} \u0633\u0624\u0627\u0644\u064B\u0627",
  "ms.q.ok.ai": "{n} \u0633\u0624\u0627\u0644\u064B\u0627\u060C \u0645\u0646\u0647\u0627 {ai} \u0645\u0646 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0639\u0644\u0649 \u0627\u0644\u062C\u0647\u0627\u0632",
  "ms.cov.run": "\u062C\u0627\u0631\u064D \u0627\u0644\u0628\u062D\u062B \u0641\u064A {n} \u0645\u0642\u0637\u0639\u064B\u0627\u2026",
  "ms.cov.ok": "{a} \u0645\u064F\u062C\u0627\u0628 \xB7 {p} \u062C\u0632\u0626\u064A\u064B\u0627 \xB7 {m} \u0646\u0627\u0642\u0635",
  "ms.drive.run": "\u062C\u0627\u0631\u064D \u0627\u062E\u062A\u0628\u0627\u0631 \u0645\u0647\u0627\u0645 \u0627\u0644\u0648\u0643\u064A\u0644\u2026",
  "ms.drive.ok": "{n} \u0645\u0646 {of} \u0645\u0647\u0627\u0645 \u0648\u0627\u0636\u062D\u0629",
  "ms.pack.run": "\u062C\u0627\u0631\u064D \u0643\u062A\u0627\u0628\u0629 \u0627\u0644\u062E\u0637\u0629\u2026",
  "ms.pack.draft": "\u062C\u0627\u0631\u064D \u0635\u064A\u0627\u063A\u0629 \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062D\u0627\u0633\u0648\u0628 ({n}/{of})\u2026",
  "ms.pack.ok": "{n} \u0645\u0644\u0641\u0627\u062A \u062C\u0627\u0647\u0632\u0629",
  "ms.err": "\u0644\u0645 \u062A\u0643\u062A\u0645\u0644 \u0647\u0630\u0647 \u0627\u0644\u062E\u0637\u0648\u0629.",
  "stat.answered": "\u0623\u0633\u0626\u0644\u0629 \u0645\u064F\u062C\u0627\u0628\u0629",
  "stat.pages": "\u0635\u0641\u062D\u0627\u062A \u0645\u0642\u0631\u0648\u0621\u0629\u060C \u0627\u0644\u0645\u062A\u0648\u0633\u0637 {avg}",
  "stat.drive": "\u0645\u0647\u0627\u0645 \u0648\u0643\u064A\u0644 \u0648\u0627\u0636\u062D\u0629",
  "stat.named": "\u0645\u0646 \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u062A\u0630\u0643\u0631\u0643",
  "stat.untested": "\u0627\u062E\u062A\u0628\u0631 \u0641\u064A \u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "agent.plan": "\u062E\u0637\u062A\u0643",
  "agent.cov": "\u0623\u0633\u0626\u0644\u0629 \u064A\u0637\u0631\u062D\u0647\u0627 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0639\u0644\u0649 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "agent.cov.n": "{a} \u0645\u0646 {n} \u0645\u064F\u062C\u0627\u0628\u0629",
  "agent.cov.d": "\u0644\u0627 \u064A\u0642\u062A\u0628\u0633 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0625\u0644\u0627 \u0645\u0627 \u062A\u0642\u0648\u0644\u0647 \u0635\u0641\u062D\u0627\u062A\u0643. \u0623\u0631\u0633\u0644 \u0623\u064A \u0633\u0624\u0627\u0644 \u0625\u0644\u0649 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0644\u062A\u0631\u0649 \u0645\u0646 \u062A\u0630\u0643\u0631.",
  "agent.pro": "{n} \u0645\u0646 \u0647\u0630\u0647 \u0645\u0634\u0627\u0631\u064A\u0639",
  "agent.pro.d": "\u0627\u0644\u0625\u0635\u0644\u0627\u062D\u0627\u062A \u0639\u0644\u0649 \u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0645\u0648\u0642\u0639 \u0648\u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0644\u063A\u0648\u064A\u0629 \u0648\u0643\u0633\u0628 \u0627\u0644\u0625\u0634\u0627\u0631\u0627\u062A \u062A\u062D\u062A\u0627\u062C \u0648\u0642\u062A\u064B\u0627 \u0644\u062A\u064F\u0646\u062C\u0632 \u062C\u064A\u062F\u064B\u0627. \u064A\u0645\u0643\u0646\u0646\u0627 \u0625\u0646\u062C\u0627\u0632\u0647\u0627 \u0645\u0639\u0643.",
  "agent.pro.subj": "\u0645\u0647\u0645\u0629 \u0635\u062F\u0649",
  "agent.log": "\u0633\u062C\u0644 \u0627\u0644\u0645\u0647\u0645\u0629",
  "cov.answered": "\u0645\u064F\u062C\u0627\u0628",
  "cov.partial": "\u062C\u0632\u0626\u064A\u064B\u0627",
  "cov.missing": "\u0646\u0627\u0642\u0635",
  "cov.test": "\u0627\u062E\u062A\u0628\u0631 \u0647\u0630\u0627 \u0627\u0644\u0633\u0624\u0627\u0644 \u0641\u064A \u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "q.branded": "\u0639\u0646\u0643",
  "q.open": "\u0633\u0624\u0627\u0644 \u0645\u0641\u062A\u0648\u062D",
  "q.byai": "\u0627\u0642\u062A\u0631\u062D\u0647 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0639\u0644\u0649 \u0627\u0644\u062C\u0647\u0627\u0632",
  "plan.impact": "\u0627\u0644\u0623\u062B\u0631",
  "effort.1": "\u0633\u0631\u064A\u0639",
  "effort.2": "\u0628\u0636\u0639 \u0633\u0627\u0639\u0627\u062A",
  "effort.3": "\u0645\u0634\u0631\u0648\u0639",
  "who.you": "\u064A\u0645\u0643\u0646\u0643 \u0641\u0639\u0644\u0647",
  "who.pro": "\u0627\u0644\u0623\u0641\u0636\u0644 \u0645\u0639 \u0645\u062E\u062A\u0635",
  "go.audit": "\u0627\u0641\u062A\u062D",
  "go.ask": "\u0627\u062E\u062A\u0628\u0631",
  "go.academy": "\u062A\u0639\u0644\u0651\u0645",
  "go.pack": "\u0627\u0644\u062D\u0632\u0645\u0629",
  "plan.unblock": "\u0627\u0631\u0641\u0639 \u0627\u0644\u062D\u062C\u0628 \u0639\u0646 \u0627\u0644\u0628\u062D\u062B \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "plan.unblock.d": "\u0645\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0628\u062D\u062B \u0623\u0648 \u0632\u0648\u0627\u062D\u0641 \u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0630\u0643\u064A\u0629 \u0645\u064F\u0628\u0644\u064E\u0651\u063A\u0629 \u0628\u0639\u062F\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0635\u0641\u062D\u0627\u062A\u0643. \u0644\u0627 \u0634\u064A\u0621 \u0622\u062E\u0631 \u064A\u0647\u0645 \u0642\u0628\u0644 \u062D\u0644 \u0647\u0630\u0627. \u0627\u0646\u062A\u0628\u0647: \u0627\u0644\u0633\u0637\u0631 \u0627\u0644\u062E\u0637\u0623 \u0642\u062F \u064A\u062D\u062C\u0628 Google \u0623\u064A\u0636\u064B\u0627.",
  "plan.gaps": "\u0623\u062C\u0628 \u0639\u0646 {n} \u0623\u0633\u0626\u0644\u0629 \u064A\u062A\u0631\u0643\u0647\u0627 \u0645\u0648\u0642\u0639\u0643 \u0645\u0641\u062A\u0648\u062D\u0629",
  "plan.gaps.1": "\u0623\u062c\u0628 \u0639\u0646 \u0627\u0644\u0633\u0624\u0627\u0644 \u0627\u0644\u0630\u064a \u064a\u062a\u0631\u0643\u0647 \u0645\u0648\u0642\u0639\u0643 \u0645\u0641\u062a\u0648\u062d\u064b\u0627",
  "plan.gaps.d": "\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629 \u0627\u0644\u062A\u064A \u064A\u062E\u062A\u0627\u0631 \u0641\u064A\u0647\u0627 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0646\u0634\u0627\u0637\u064B\u0627 \u0644\u0644\u0639\u0645\u064A\u0644: {u}. \u0623\u0636\u0641 \u0645\u0642\u0637\u0639\u064B\u0627 \u0648\u0627\u0636\u062D\u064B\u0627 \u0644\u0643\u0644 \u0633\u0624\u0627\u0644\u061B \u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0641\u064A \u0627\u0644\u062D\u0632\u0645\u0629.",
  "plan.entity": "\u0639\u0631\u0651\u0641 \u0627\u0644\u0622\u0644\u0627\u062A \u0628\u0643",
  "plan.entity.d": "\u0623\u0636\u0641 \u062A\u0631\u0645\u064A\u0632 Organization \u0623\u0648 LocalBusiness \u0645\u0639 \u0645\u0644\u0641\u0627\u062A\u0643 \u0627\u0644\u0631\u0633\u0645\u064A\u0629. \u0625\u0646\u0647 \u062C\u0627\u0647\u0632 \u0641\u064A \u0627\u0644\u062D\u0632\u0645\u0629.",
  "plan.answer-first": "\u0627\u0628\u062F\u0623 \u0627\u0644\u0635\u0641\u062D\u0629 \u0628\u0627\u0644\u0625\u062C\u0627\u0628\u0629",
  "plan.answer-first.d": "\u0623\u0639\u062F \u0643\u062A\u0627\u0628\u0629 \u0627\u0644\u0641\u0642\u0631\u0629 \u0627\u0644\u0623\u0648\u0644\u0649: \u0645\u0627 \u0647\u0648\u060C \u0644\u0645\u0646\u060C \u0623\u064A\u0646\u060C \u0648\u0645\u0639\u0644\u0648\u0645\u0629 \u0623\u0633\u0627\u0633\u064A\u0629.",
  "plan.quotable": "\u0627\u062C\u0639\u0644 \u0627\u0644\u062C\u0645\u0644 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0627\u0642\u062A\u0628\u0627\u0633",
  "plan.quotable.d": "\u0627\u0630\u0643\u0631 \u0627\u0644\u0645\u0648\u0636\u0648\u0639\u060C \u0645\u0639\u0644\u0648\u0645\u0629 \u0648\u0627\u062D\u062F\u0629 \u0641\u064A \u0643\u0644 \u062C\u0645\u0644\u0629\u060C \u0648\u0627\u0644\u0623\u0631\u0642\u0627\u0645 \u0645\u0639 \u0645\u0635\u062F\u0631\u0647\u0627.",
  "plan.site": "\u0623\u0635\u0644\u062D \xAB{check}\xBB \u0641\u064A \u0643\u0644 \u0627\u0644\u0645\u0648\u0642\u0639",
  "plan.site.d": "{n} \u0645\u0646 {pages} \u0635\u0641\u062D\u0627\u062A \u0641\u064A\u0647\u0627 \u0647\u0630\u0647 \u0627\u0644\u0645\u0634\u0643\u0644\u0629. \u0625\u0635\u0644\u0627\u062D \u0648\u0627\u062D\u062F \u0641\u064A \u0642\u0627\u0644\u0628 \u0627\u0644\u0635\u0641\u062D\u0629 \u064A\u0639\u0627\u0644\u062C\u0647\u0627 \u0643\u0644\u0647\u0627\u060C \u0648\u0639\u0627\u062F\u0629 \u0645\u0627 \u064A\u0643\u0648\u0646 \u0645\u0634\u0631\u0648\u0639\u064B\u0627.",
  "plan.agent": "\u0627\u062C\u0639\u0644 \u0627\u0644\u0635\u0641\u062D\u0629 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0645\u0646 \u0648\u0643\u0644\u0627\u0621 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "plan.agent.d": "\u0645\u0647\u0627\u0645 \u0627\u0644\u0648\u0643\u064A\u0644 \u0627\u0644\u062A\u064A \u062A\u0641\u0634\u0644 \u0647\u0646\u0627: {list}. \u062A\u0633\u0645\u064A\u0627\u062A \u0627\u0644\u062D\u0642\u0648\u0644 \u0648\u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0623\u0632\u0631\u0627\u0631 \u0648\u0627\u0644\u062D\u0642\u0627\u0626\u0642 \u0627\u0644\u0645\u0643\u062A\u0648\u0628\u0629 \u0646\u0635\u064B\u0627 \u062A\u062D\u0644 \u0645\u0639\u0638\u0645\u0647\u0627.",
  "plan.lang": "\u0623\u0635\u0644\u062D \u0646\u0633\u062E\u0643 \u0627\u0644\u0644\u063A\u0648\u064A\u0629",
  "plan.lang.d": "\u0625\u0634\u0627\u0631\u0627\u062A \u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u062E\u0627\u0637\u0626\u0629 \u062A\u0631\u0633\u0644 \u0627\u0644\u0646\u0627\u0633 \u0648\u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0625\u0644\u0649 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u062E\u0637\u0623.",
  "plan.offsite": "\u0627\u062D\u0635\u0644 \u0639\u0644\u0649 \u0630\u0643\u0631\u064D \u062D\u064A\u062B \u064A\u0646\u0638\u0631 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "plan.offsite.d": "\u0627\u0637\u0631\u062D \u0623\u0633\u0626\u0644\u062A\u0643 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0641\u064A \xAB\u0627\u0633\u0623\u0644 \u0627\u0644\u0630\u0643\u0627\u0621\xBB: \u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u062A\u064A \u062A\u0633\u062A\u0634\u0647\u062F \u0628\u0647\u0627 \u0647\u064A \u0642\u0627\u0626\u0645\u0629 \u0639\u0644\u0627\u0642\u0627\u062A\u0643 \u0627\u0644\u0639\u0627\u0645\u0629. \u0627\u0644\u0630\u0643\u0631 \u0641\u064A\u0647\u0627 \u0623\u0647\u0645 \u0645\u0646 \u0627\u0644\u0631\u0648\u0627\u0628\u0637.",
  "plan.measure": "\u0642\u0650\u0633 \u0632\u064A\u0627\u0631\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0648\u0638\u0647\u0648\u0631\u0643 \u0641\u064A\u0647",
  "plan.measure.d": "\u0623\u0636\u0641 \u0642\u0646\u0627\u0629 \u0644\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0641\u064A Google Analytics \u0648\u0631\u0627\u062C\u0639 \u062A\u0642\u0627\u0631\u064A\u0631 Search Console \u0648Bing \u0634\u0647\u0631\u064A\u064B\u0627. \u0627\u0644\u062E\u0637\u0648\u0627\u062A \u0641\u064A \u0627\u0644\u062D\u0632\u0645\u0629.",
  "plan.fresh": "\u0623\u0638\u0647\u0631 \u062A\u0627\u0631\u064A\u062E \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0635\u0641\u062D\u0629",
  "plan.fresh.d": "\u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0638\u0627\u0647\u0631 \u0648dateModified \u064A\u0648\u0636\u062D\u0627\u0646 \u062D\u062F\u0627\u062B\u0629 \u0627\u0644\u0645\u062D\u062A\u0648\u0649.",
  "pack.title": "\u062D\u0632\u0645\u0629 \u0627\u0644\u0625\u0635\u0644\u0627\u062D\u0627\u062A",
  "pack.d": "{n} \u0645\u0644\u0641\u0627\u062A: \u062E\u0637\u062A\u0643\u060C \u0648\u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0646\u0627\u0642\u0635\u0629 \u0645\u0639 \u0645\u0633\u0648\u062F\u0627\u062A\u060C \u0648\u0634\u064A\u0641\u0631\u0629 \u062C\u0627\u0647\u0632\u0629\u060C \u0648\u0623\u0633\u0626\u0644\u0629 \u0644\u0644\u0627\u062E\u062A\u0628\u0627\u0631\u060C \u0648\u062F\u0644\u064A\u0644 \u0644\u0644\u0642\u064A\u0627\u0633.",
  "pack.dl": "\u0646\u0632\u0651\u0644 \u062D\u0632\u0645\u0629 \u0627\u0644\u0625\u0635\u0644\u0627\u062D\u0627\u062A (.zip)",
  "pack.stale": "\u0623\u0639\u062F \u0627\u0644\u0645\u0647\u0645\u0629 \u0644\u0625\u0639\u0627\u062F\u0629 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062D\u0632\u0645\u0629.",
  "pack.impact": "\u0627\u0644\u0623\u062B\u0631",
  "pack.effort": "\u0627\u0644\u062C\u0647\u062F",
  "pack.plan.h": "\u062E\u0637\u0629 \u0627\u0644\u0639\u0645\u0644 \u0644\u0640 {site}",
  "pack.plan.intro": "\u0623\u0639\u062F\u0651\u0647\u0627 \u0635\u062F\u0649 \u0641\u064A {date}. \u0627\u0644\u0623\u062B\u0631 \u0627\u0644\u0623\u0643\u0628\u0631 \u0628\u0623\u0642\u0644 \u062C\u0647\u062F \u0623\u0648\u0644\u064B\u0627.",
  "pack.cta": "\u062A\u0641\u0636\u0651\u0644 \u0623\u0646 \u0646\u0646\u062C\u0632\u0647 \u0644\u0643\u061F \u0627\u062D\u062C\u0632 \u0645\u0643\u0627\u0644\u0645\u0629 \u0639\u0644\u0649 https://getayka.com/ar/book/ \u0623\u0648 \u0631\u0627\u0633\u0644 hello@getayka.com \u0644\u0639\u0631\u0636 \u0633\u0639\u0631 \u0645\u062E\u0635\u0635.",
  "pack.gaps.h": "\u0625\u062C\u0627\u0628\u0627\u062A \u0646\u0627\u0642\u0635\u0629",
  "pack.gaps.intro": "\u0623\u0633\u0626\u0644\u0629 \u064A\u0637\u0631\u062D\u0647\u0627 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0639\u0644\u0649 \u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0648\u0644\u0627 \u064A\u062C\u064A\u0628 \u0639\u0646\u0647\u0627 \u0645\u0648\u0642\u0639\u0643 \u0628\u0648\u0636\u0648\u062D \u0628\u0639\u062F. \u0623\u0636\u0641 \u0645\u0642\u0637\u0639\u064B\u0627 \u0642\u0635\u064A\u0631\u064B\u0627 \u0644\u0643\u0644 \u0633\u0624\u0627\u0644 \u0641\u064A \u0627\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u0623\u0646\u0633\u0628.",
  "pack.fit": "\u0627\u0644\u062A\u0637\u0627\u0628\u0642 {fit}/100",
  "pack.draft": "\u0645\u0633\u0648\u062F\u0629",
  "pack.found": "\u0623\u0642\u0631\u0628 \u0645\u0642\u0637\u0639 \u0641\u064A \u0645\u0648\u0642\u0639\u0643",
  "pack.draft.tpl": "\u062A\u062D\u0642\u0651\u0642 \u0645\u0646 \u0643\u0644 \u0645\u0639\u0644\u0648\u0645\u0629\u060C \u062B\u0645 \u0636\u0639 \u0627\u0644\u0645\u0642\u0637\u0639 \u0641\u064A \u0627\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u0623\u0646\u0633\u0628.",
  "pack.tpl.town": "\u0627\u0644\u0645\u062F\u064A\u0646\u0629",
  "pack.tpl.discover": "{name} {cat} \u0641\u064A {place}\u060C \u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0640[\u0645\u0646 \u062A\u0646\u0627\u0633\u0628\u0647]. [\u0645\u0639\u0644\u0648\u0645\u0629 \u0644\u0627 \u064A\u0645\u0644\u0643\u0647\u0627 \u063A\u064A\u0631\u0643: \u0631\u0642\u0645 \u0623\u0648 \u0625\u0637\u0644\u0627\u0644\u0629 \u0623\u0648 \u0645\u0633\u0627\u0641\u0629 \u0623\u0648 \u062A\u062E\u0635\u0635.] [\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062D\u062C\u0632 \u0623\u0648 \u0627\u0644\u062A\u0648\u0627\u0635\u0644.]",
  "pack.tpl.compare": "\u0639\u0646\u062F \u0627\u062E\u062A\u064A\u0627\u0631 {cat} \u0641\u064A {place} \u0642\u0627\u0631\u0646 \u0628\u064A\u0646 [\u0627\u0644\u0645\u0639\u064A\u0627\u0631 1] \u0648[\u0627\u0644\u0645\u0639\u064A\u0627\u0631 2] \u0648[\u0627\u0644\u0645\u0639\u064A\u0627\u0631 3]. \u064A\u0642\u062F\u0651\u0645 {name} [\u0625\u062C\u0627\u0628\u062A\u0643 \u0639\u0646 \u0643\u0644 \u0645\u0639\u064A\u0627\u0631 \u0628\u0627\u0644\u0623\u0631\u0642\u0627\u0645].",
  "pack.tpl.price": "\u0641\u064A {name} \u062A\u0628\u0644\u063A \u062A\u0643\u0644\u0641\u0629 [\u0627\u0644\u062E\u062F\u0645\u0629] [\u0627\u0644\u0633\u0639\u0631] [\u0644\u0644\u064A\u0644\u0629 \u0623\u0648 \u0644\u0644\u0645\u0634\u0631\u0648\u0639 \u0623\u0648 \u0627\u0628\u062A\u062F\u0627\u0621\u064B \u0645\u0646\u2026]\u060C \u0648\u062A\u0634\u0645\u0644 [\u0645\u0627 \u0647\u0648 \u0645\u0634\u0645\u0648\u0644]. [\u0643\u064A\u0641 \u064A\u064F\u0637\u0644\u0628 \u0639\u0631\u0636 \u0633\u0639\u0631 \u062F\u0642\u064A\u0642 \u0623\u0648 \u064A\u062A\u0645 \u0627\u0644\u062D\u062C\u0632.]",
  "pack.tpl.hours": "\u064A\u0641\u062A\u062D {name} [\u0627\u0644\u0623\u064A\u0627\u0645] \u0645\u0646 [\u0627\u0644\u0633\u0627\u0639\u0629] \u0625\u0644\u0649 [\u0627\u0644\u0633\u0627\u0639\u0629]. [\u0627\u0644\u0627\u0633\u062A\u062B\u0646\u0627\u0621\u0627\u062A: \u0627\u0644\u0639\u0637\u0644 \u0648\u0627\u0644\u0645\u0648\u0627\u0633\u0645.]",
  "pack.tpl.book": "\u0644\u0644\u062D\u062C\u0632 \u0641\u064A {name}: [\u0627\u0644\u0637\u0631\u064A\u0642\u0629: \u0646\u0645\u0648\u0630\u062C \u0623\u0648 \u0647\u0627\u062A\u0641 \u0623\u0648 \u0628\u0631\u064A\u062F]\u060C [\u0643\u0645 \u0645\u0646 \u0627\u0644\u0648\u0642\u062A \u0645\u0633\u0628\u0642\u064B\u0627]\u060C [\u0645\u0627 \u0627\u0644\u0645\u0637\u0644\u0648\u0628]. [\u0627\u0644\u062F\u0641\u0639 \u0648\u0627\u0644\u0625\u0644\u063A\u0627\u0621 \u0641\u064A \u062C\u0645\u0644\u0629 \u0648\u0627\u062D\u062F\u0629.]",
  "pack.tpl.where": "\u064A\u0642\u0639 {name} \u0641\u064A [\u0627\u0644\u0639\u0646\u0648\u0627\u0646] \u0641\u064A {place}\u060C \u0639\u0644\u0649 \u0628\u0639\u062F [\u0627\u0644\u0645\u0633\u0627\u0641\u0629] \u0645\u0646 [\u0645\u0639\u0644\u0645 \u0623\u0648 \u0645\u062D\u0637\u0629 \u0623\u0648 \u0645\u0637\u0627\u0631]. [\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u0648\u0635\u0648\u0644 \u0648\u0627\u0644\u0645\u0648\u0627\u0642\u0641.]",
  "pack.tpl.reviews": "\u064A\u0642\u064A\u0651\u0645 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 {name} \u0628\u0640[\u0627\u0644\u062A\u0642\u064A\u064A\u0645] \u0639\u0644\u0649 [\u0627\u0644\u0645\u0646\u0635\u0629] ([\u0627\u0644\u0639\u062F\u062F] \u0645\u0631\u0627\u062C\u0639\u0629). \u0648\u064A\u0630\u0643\u0631\u0648\u0646 \u063A\u0627\u0644\u0628\u064B\u0627 [\u0623\u0645\u0631\u064A\u0646 \u0645\u062D\u062F\u062F\u064A\u0646]. [\u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0627\u062A.]",
  "pack.tpl.contact": "\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 {name} \u0628\u0627\u0644\u0647\u0627\u062A\u0641 \u0639\u0644\u0649 [\u0627\u0644\u0631\u0642\u0645] \u0623\u0648 \u0628\u0627\u0644\u0628\u0631\u064A\u062F \u0639\u0644\u0649 [\u0627\u0644\u0639\u0646\u0648\u0627\u0646]. [\u0645\u062A\u0649 \u062A\u0631\u062F\u0651\u0648\u0646 \u0648\u0628\u0623\u064A \u0633\u0631\u0639\u0629.]",
  "pack.tpl.trust": "\u064A\u0642\u064A\u0651\u0645 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 {name} \u0628\u0640[\u0627\u0644\u062A\u0642\u064A\u064A\u0645] \u0639\u0644\u0649 [\u0627\u0644\u0645\u0646\u0635\u0629] ([\u0627\u0644\u0639\u062F\u062F] \u0645\u0631\u0627\u062C\u0639\u0629). \u0648\u064A\u0630\u0643\u0631\u0648\u0646 \u063A\u0627\u0644\u0628\u064B\u0627 [\u0623\u0645\u0631\u064A\u0646 \u0645\u062D\u062F\u062F\u064A\u0646].",
  "pack.tpl.practical": "{name}: [\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0639\u0645\u0644\u064A\u0629 \u0641\u064A \u062C\u0645\u0644\u0629 \u0648\u0627\u062D\u062F\u0629]. [\u062A\u0641\u0635\u064A\u0644 \u064A\u063A\u0646\u064A \u0639\u0646 \u0633\u0624\u0627\u0644 \u0625\u0636\u0627\u0641\u064A.]",
  "pack.tpl.service": "\u064A\u0642\u062F\u0651\u0645 {name} [\u0627\u0644\u062E\u062F\u0645\u0629] \u0641\u064A {place} \u0644\u0640[\u0627\u0644\u0641\u0626\u0629]. [\u0645\u0627 \u0647\u0648 \u0645\u0634\u0645\u0648\u0644 \u0628\u0627\u0644\u0623\u0631\u0642\u0627\u0645.] [\u0643\u064A\u0641 \u0646\u0628\u062F\u0623.]",
  "pack.tpl.brand": "{name} {cat} \u0641\u064A {place} [\u0645\u0627\u0630\u0627 \u064A\u0642\u062F\u0651\u0645] \u0644\u0640[\u0645\u0646]. [\u0645\u0646\u0630 \u0645\u062A\u0649\u060C \u0643\u0645\u060C \u0648\u062F\u0644\u064A\u0644 \u0648\u0627\u062D\u062F.]",
  "pack.gaps.none": "\u0645\u0648\u0642\u0639\u0643 \u064A\u062C\u064A\u0628 \u0639\u0646 \u0643\u0644 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0645\u062A\u0648\u0642\u0639\u0629. \u0627\u062E\u062A\u0628\u0631\u0647\u0627 \u0627\u0644\u0622\u0646 \u0641\u064A \u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A.",
  "pack.q.h": "\u0623\u0633\u0626\u0644\u0629 \u0644\u0644\u0627\u062E\u062A\u0628\u0627\u0631 \u0641\u064A \u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "pack.q.intro": "\u0643\u0644 \u0631\u0627\u0628\u0637 \u064A\u0641\u062A\u062D \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0648\u0627\u0644\u0633\u0624\u0627\u0644 \u0645\u0643\u062A\u0648\u0628 (\u0641\u064A Gemini \u0627\u0644\u0635\u0642\u0647). \u0627\u0637\u0631\u062D \u0643\u0644 \u0633\u0624\u0627\u0644 \u0639\u062F\u0629 \u0645\u0631\u0627\u062A: \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u062A\u062A\u063A\u064A\u0631.",
  "pack.aidraft": "\u0645\u0633\u0648\u062F\u0629 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A: \u062A\u062D\u0642\u0651\u0642 \u0645\u0646 \u0643\u0644 \u0645\u0639\u0644\u0648\u0645\u0629",
  "pack.note.ai": "\u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0627\u0644\u0645\u0639\u0644\u064E\u0651\u0645\u0629 [\u0645\u0633\u0648\u062F\u0629 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A] \u0643\u062A\u0628\u0647\u0627 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0645\u062F\u0645\u062C \u0641\u064A Chrome \u0639\u0644\u0649 \u062D\u0627\u0633\u0648\u0628\u0643\u060C \u0645\u0646 \u0635\u0641\u062D\u0627\u062A\u0643 \u0623\u0646\u062A. \u062A\u062D\u0642\u0651\u0642 \u0645\u0646 \u0643\u0644 \u0645\u0639\u0644\u0648\u0645\u0629 \u0642\u0628\u0644 \u0627\u0644\u0646\u0634\u0631.",
  "pack.note.tpl": "\u0644\u0645 \u064A\u062A\u0648\u0641\u0631 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0639\u0644\u0649 \u0627\u0644\u062C\u0647\u0627\u0632\u060C \u0641\u0644\u0643\u0644 \u0646\u0642\u0635 \u0642\u0627\u0644\u0628 \u0643\u062A\u0627\u0628\u0629 \u0628\u062F\u0644 \u0627\u0644\u0645\u0633\u0648\u062F\u0629.",
  "pack.measure": "# \u0642\u0650\u0633 \u0632\u064A\u0627\u0631\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0648\u0638\u0647\u0648\u0631\u0643 \u0641\u064A\u0647 (\u0645\u062C\u0627\u0646\u064B\u0627)\n\n## 1. Google Analytics 4: \u0642\u0646\u0627\u0629 \xAB\u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A\xBB\n\u0627\u0644\u0645\u0634\u0631\u0641 \u2190 \u0639\u0631\u0636 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u2190 \u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0627\u0644\u0642\u0646\u0648\u0627\u062A \u2190 \u0625\u0646\u0634\u0627\u0621 \u0645\u062C\u0645\u0648\u0639\u0629 \u0642\u0646\u0648\u0627\u062A \u062C\u062F\u064A\u062F\u0629. \u0623\u0636\u0641 \u0642\u0646\u0627\u0629 \u0628\u0627\u0633\u0645 \xAB\u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A\xBB \u0628\u0634\u0631\u0637 *\u0645\u0635\u062F\u0631 \u0627\u0644\u062C\u0644\u0633\u0629 \u064A\u0637\u0627\u0628\u0642 \u0627\u0644\u062A\u0639\u0628\u064A\u0631 \u0627\u0644\u0646\u0645\u0637\u064A*:\n\n```\n{regex}\n```\n\n\u0636\u0639\u0647\u0627 \u0641\u0648\u0642 \xABReferral\xBB \u0648\u0627\u062D\u0641\u0638. \u0643\u062B\u064A\u0631\u064B\u0627 \u0645\u0627 \u064A\u0636\u064A\u0641 ChatGPT \u0627\u0644\u0648\u0633\u0645 `utm_source=chatgpt.com` \u0625\u0644\u0649 \u0631\u0648\u0627\u0628\u0637\u0647\u060C \u0644\u0643\u0646 \u0628\u0639\u0636 \u0627\u0644\u0646\u0642\u0631\u0627\u062A \u062A\u0635\u0644 \u062F\u0648\u0646 \u0645\u064F\u062D\u064A\u0644 \u0641\u062A\u064F\u062D\u0633\u0628 \u0645\u0628\u0627\u0634\u0631\u0629: \u0627\u0639\u062A\u0628\u0631 \u0627\u0644\u0631\u0642\u0645 \u062D\u062F\u064B\u0627 \u0623\u062F\u0646\u0649.\n\n## 2. Google Search Console\n\u0627\u0644\u0623\u062F\u0627\u0621 \u2190 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u062A\u0648\u0644\u064A\u062F\u064A: \u0645\u0631\u0627\u062A \u0638\u0647\u0648\u0631 \u0635\u0641\u062D\u0627\u062A\u0643 \u0641\u064A AI Overviews \u0648AI Mode (\u0645\u0646\u0630 \u064A\u0648\u0646\u064A\u0648 2026). \u0631\u0627\u062C\u0639\u0647 \u0634\u0647\u0631\u064A\u064B\u0627.\n\n## 3. Bing Webmaster Tools\nAI Performance: \u0643\u0645 \u0645\u0631\u0629 \u064A\u064F\u0633\u062A\u0634\u0647\u062F \u0628\u0635\u0641\u062D\u0627\u062A\u0643 \u0641\u064A Copilot \u0648\u0645\u0644\u062E\u0635\u0627\u062A Bing. \u0645\u062C\u0627\u0646\u064A\u061B \u062A\u062D\u0642\u0651\u0642 \u0645\u0646 \u0645\u0648\u0642\u0639\u0643 \u0623\u0648\u0644\u064B\u0627.\n\n## 4. \u0627\u062E\u062A\u0628\u0627\u0631\u0627\u062A\u0643 \u0627\u0644\u062E\u0627\u0635\u0629\n\u0627\u0633\u062A\u062E\u062F\u0645 \u062A\u0628\u0648\u064A\u0628 \xAB\u0627\u0633\u0623\u0644 \u0627\u0644\u0630\u0643\u0627\u0621\xBB \u0641\u064A \u0635\u062F\u0649 \u0623\u0633\u0628\u0648\u0639\u064A\u064B\u0627 \u0628\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0646\u0641\u0633\u0647\u0627 \u0648\u0641\u064A \u0639\u062F\u0629 \u0645\u0633\u0627\u0639\u062F\u0627\u062A. \u062A\u0627\u0628\u0639 \u0646\u0633\u0628\u0629 \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u062A\u064A \u062A\u0630\u0643\u0631\u0643\u060C \u0644\u0627 \u0627\u0644\u062A\u0631\u062A\u064A\u0628.\n",
  "pack.readme": "# \u062D\u0632\u0645\u0629 \u0625\u0635\u0644\u0627\u062D\u0627\u062A \u0635\u062F\u0649 \u0644\u0640 {site}\n\n\u0623\u0639\u062F\u0651\u0647\u0627 \u0635\u062F\u0649 \u0641\u064A {date} \u0639\u0644\u0649 \u062D\u0627\u0633\u0648\u0628\u0643. {n} \u0645\u0644\u0641\u0627\u062A.\n\n1. **1-action-plan.md**: \u0645\u0627 \u064A\u062C\u0628 \u0641\u0639\u0644\u0647 \u0628\u0627\u0644\u062A\u0631\u062A\u064A\u0628.\n2. **2-missing-answers.md**: \u0623\u0633\u0626\u0644\u0629 \u062A\u064F\u0637\u0631\u062D \u0639\u0644\u0649 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0648\u0644\u0627 \u064A\u062C\u064A\u0628 \u0639\u0646\u0647\u0627 \u0645\u0648\u0642\u0639\u0643 \u0628\u0639\u062F\u060C \u0645\u0639 \u0645\u0633\u0648\u062F\u0627\u062A. \u062A\u062D\u0642\u0651\u0642 \u0645\u0646 \u0643\u0644 \u0645\u0639\u0644\u0648\u0645\u0629 \u0642\u0628\u0644 \u0627\u0644\u0646\u0634\u0631\u061B \u0645\u0633\u0648\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0645\u0639\u0644\u064E\u0651\u0645\u0629.\n3. **3-code/**: \u0634\u064A\u0641\u0631\u0629 \u062C\u0627\u0647\u0632\u0629 \u0645\u0623\u062E\u0648\u0630\u0629 \u0645\u0646 \u0635\u0641\u062D\u062A\u0643 (robots.txt\u060C \u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0646\u0638\u0645\u0629\u060C \u0648\u0633\u0648\u0645 meta). \u0645\u0627 \u0644\u0645 \u064A\u0633\u062A\u0637\u0639 \u0635\u062F\u0649 \u0645\u0639\u0631\u0641\u062A\u0647 \u0645\u0639\u0644\u064E\u0651\u0645 \u0628\u0640 TODO.\n4. **4-questions-to-test.md**: \u0631\u0648\u0627\u0628\u0637 \u062A\u0641\u062A\u062D \u0643\u0644 \u0645\u0633\u0627\u0639\u062F \u0648\u0627\u0644\u0633\u0624\u0627\u0644 \u0645\u0643\u062A\u0648\u0628.\n5. **5-measure-ai-traffic.md**: \u0642\u064A\u0627\u0633 \u0645\u062C\u0627\u0646\u064A \u0639\u0628\u0631 Google Analytics \u0648Search Console \u0648Bing.\n6. **data/**: \u0627\u0644\u0623\u0631\u0642\u0627\u0645 (CSV).\n\n\u062A\u0641\u0636\u0651\u0644 \u0623\u0646 \u0646\u0646\u062C\u0632\u0647 \u0644\u0643\u061F \u0627\u062D\u062C\u0632 \u0645\u0643\u0627\u0644\u0645\u0629 \u0639\u0644\u0649 https://getayka.com/ar/book/ \u0623\u0648 \u0631\u0627\u0633\u0644 hello@getayka.com \u0644\u0639\u0631\u0636 \u0633\u0639\u0631 \u0645\u062E\u0635\u0635.\n",
  "intent.discover": "\u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u062E\u064A\u0627\u0631\u0627\u062A",
  "intent.compare": "\u0627\u0644\u0645\u0642\u0627\u0631\u0646\u0629",
  "intent.price": "\u0627\u0644\u0633\u0639\u0631",
  "intent.trust": "\u0627\u0644\u062B\u0642\u0629",
  "intent.practical": "\u0639\u0645\u0644\u064A",
  "intent.service": "\u062E\u062F\u0645\u0629",
  "intent.brand": "\u0639\u0646\u0643",
  "csv.q": "\u0627\u0644\u0633\u0624\u0627\u0644",
  "csv.type": "\u0627\u0644\u0646\u0648\u0639",
  "csv.status": "\u0627\u0644\u062D\u0627\u0644\u0629",
  "csv.fit": "\u0627\u0644\u062A\u0637\u0627\u0628\u0642",
  "csv.page": "\u0623\u0641\u0636\u0644 \u0635\u0641\u062D\u0629",
  "csv.task": "\u0645\u0647\u0645\u0629 \u0627\u0644\u0648\u0643\u064A\u0644",
  "csv.score": "\u0627\u0644\u0646\u062A\u064A\u062C\u0629",
  "csv.issues": "\u0627\u0644\u0645\u0634\u0643\u0644\u0627\u062A",
  "audit.page": "\u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629",
  "audit.site": "\u0627\u0644\u0645\u0648\u0642\u0639 \u0643\u0644\u0647",
  "audit.rival": "\u0645\u0646\u0627\u0641\u0633",
  "audit.empty": "\u0627\u0641\u062D\u0635 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629",
  "audit.empty.d": "\u0627\u0641\u062A\u062D \u0623\u064A \u0635\u0641\u062D\u0629 \u0645\u0646 \u0645\u0648\u0642\u0639\u0643 \u062B\u0645 \u0627\u0641\u062D\u0635\u0647\u0627. \u064A\u0642\u0631\u0624\u0647\u0627 \u0635\u062F\u0649 \u0639\u0644\u0649 \u062D\u0627\u0633\u0648\u0628\u0643.",
  "heat.short": "\u062A\u0638\u0644\u064A\u0644",
  "export.short": "\u062A\u0642\u0631\u064A\u0631",
  "heat.good": "\u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0627\u0642\u062A\u0628\u0627\u0633 \u0643\u0645\u0627 \u0647\u064A",
  "heat.almost": "\u062A\u0642\u0631\u064A\u0628\u064B\u0627",
  "rw.d2": "\u0635\u064A\u0627\u063A\u062A\u0627\u0646 \u062C\u062F\u064A\u062F\u062A\u0627\u0646 \u0645\u0646 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0645\u062F\u0645\u062C \u0641\u064A Chrome\u060C \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062D\u0627\u0633\u0648\u0628. \u0627\u0644\u062D\u0642\u0627\u0626\u0642 \u0627\u0644\u0646\u0627\u0642\u0635\u0629 \u062A\u0635\u0628\u062D [\u0641\u0631\u0627\u063A\u0627\u062A].",
  "ai.label": "\u0645\u0646 \u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A: \u0631\u0627\u062C\u0639\u0647 \u0642\u0628\u0644 \u0627\u0644\u0646\u0634\u0631.",
  "ai.none": "\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0645\u062F\u0645\u062C \u0641\u064A Chrome \u063A\u064A\u0631 \u0645\u062A\u0627\u062D \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062D\u0627\u0633\u0648\u0628 (\u064A\u062D\u062A\u0627\u062C \u0625\u0635\u062F\u0627\u0631\u064B\u0627 \u062D\u062F\u064A\u062B\u064B\u0627 \u0645\u0646 Chrome \u0639\u0644\u0649 \u062D\u0627\u0633\u0648\u0628 \u0642\u0627\u062F\u0631). \u0643\u0644 \u0645\u0627 \u0639\u062F\u0627\u0647 \u0641\u064A \u0635\u062F\u0649 \u064A\u0639\u0645\u0644 \u062F\u0648\u0646\u0647.",
  "rep.title": "\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0638\u0647\u0648\u0631 \u0641\u064A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "drive.title": "\u062A\u062C\u0631\u0628\u0629 \u0627\u0644\u0648\u0643\u064A\u0644",
  "drive.d": "\u0647\u0644 \u064A\u0633\u062A\u0637\u064A\u0639 \u0648\u0643\u064A\u0644 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0625\u0646\u062C\u0627\u0632 \u0645\u0647\u0645\u0629 \u0639\u0645\u064A\u0644 \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629 \u062F\u0648\u0646 \u062A\u062E\u0645\u064A\u0646\u061F \u0645\u0642\u0631\u0648\u0621 \u0645\u0646 \u0627\u0644\u0635\u0641\u062D\u0629\u061B \u0644\u0627 \u0634\u064A\u0621 \u064A\u064F\u0646\u0642\u0631 \u0623\u0648 \u064A\u064F\u0631\u0633\u0644.",
  "drive.webmcp.how": "\u0643\u064A\u0641 \u062A\u0639\u0631\u0651\u0641 \u0646\u0645\u0648\u0630\u062C\u0643 \u0627\u0644\u0631\u0626\u064A\u0633\u064A \u0643\u0623\u062F\u0627\u0629",
  "drive.webmcp.ex": "\u062D\u062C\u0632 \u063A\u0631\u0641\u0629: \u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E\u060C \u0627\u0644\u0636\u064A\u0648\u0641\u060C \u0627\u0644\u062A\u0648\u0627\u0635\u0644",
  "drive.price": "\u0625\u064A\u062C\u0627\u062F \u0627\u0644\u0633\u0639\u0631",
  "drive.price.pass": "\u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0645\u0648\u062C\u0648\u062F\u0629 \u0641\u064A \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u0638\u0645\u0629 ({n}).",
  "drive.price.warn": "\u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0638\u0627\u0647\u0631\u0629 \u0641\u064A \u0627\u0644\u0646\u0635 \u0644\u0643\u0646 \u0644\u064A\u0633\u062A \u0641\u064A \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u0638\u0645\u0629: \u0642\u062F \u064A\u0633\u064A\u0621 \u0627\u0644\u0648\u0643\u0644\u0627\u0621 \u0642\u0631\u0627\u0621\u062A\u0647\u0627.",
  "drive.price.info": "\u0644\u0627 \u0623\u0633\u0639\u0627\u0631 \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629. \u0633\u064A\u0637\u0644\u0628 \u0627\u0644\u0648\u0643\u0644\u0627\u0621 \u0645\u0646 \u0627\u0644\u0646\u0627\u0633 \u0633\u0624\u0627\u0644\u0643: \u0644\u0627 \u0628\u0623\u0633 \u0625\u0646 \u0643\u0646\u062A \u062A\u0633\u0639\u0651\u0631 \u0644\u0643\u0644 \u0645\u0634\u0631\u0648\u0639\u060C \u0644\u0643\u0646 \u0648\u0636\u0651\u062D \u0643\u064A\u0641 \u064A\u064F\u0637\u0644\u0628 \u0639\u0631\u0636 \u0627\u0644\u0633\u0639\u0631.",
  "drive.hours": "\u0625\u064A\u062C\u0627\u062F \u0633\u0627\u0639\u0627\u062A \u0627\u0644\u0639\u0645\u0644",
  "drive.hours.pass": "\u0633\u0627\u0639\u0627\u062A \u0627\u0644\u0639\u0645\u0644 \u0645\u0648\u062C\u0648\u062F\u0629 \u0641\u064A \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u0638\u0645\u0629.",
  "drive.hours.warn": "\u0627\u0644\u0633\u0627\u0639\u0627\u062A \u0641\u064A \u0627\u0644\u0646\u0635 \u0641\u0642\u0637\u061B \u0623\u0636\u0641 openingHours.",
  "drive.hours.fail": "\u0644\u0627 \u0633\u0627\u0639\u0627\u062A \u0639\u0645\u0644 \u0644\u0646\u0634\u0627\u0637 \u0645\u062D\u0644\u064A.",
  "drive.hours.info": "\u0644\u0627 \u0633\u0627\u0639\u0627\u062A \u0639\u0645\u0644 (\u063A\u064A\u0631 \u0636\u0631\u0648\u0631\u064A\u0629 \u0644\u0644\u0623\u0646\u0634\u0637\u0629 \u0627\u0644\u0631\u0642\u0645\u064A\u0629 \u0641\u0642\u0637).",
  "drive.contact": "\u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0643",
  "drive.contact.pass": "\u0639\u062F\u0629 \u0637\u0631\u0642 \u0645\u0642\u0631\u0648\u0621\u0629 \u0644\u0644\u062A\u0648\u0627\u0635\u0644 (\u0631\u0648\u0627\u0628\u0637 \u0648\u062A\u0631\u0645\u064A\u0632).",
  "drive.contact.warn": "\u0637\u0631\u064A\u0642\u0629 \u0645\u0642\u0631\u0648\u0621\u0629 \u0648\u0627\u062D\u062F\u0629 \u0641\u0642\u0637 \u0644\u0644\u062A\u0648\u0627\u0635\u0644. \u0623\u0636\u0641 \u0631\u0627\u0628\u0637 \u0627\u062A\u0635\u0627\u0644 \u0623\u0648 \u0628\u0631\u064A\u062F\u060C \u0648\u0627\u0644\u062A\u0631\u0645\u064A\u0632.",
  "drive.contact.fail": "\u0644\u0627 \u0631\u0627\u0628\u0637 \u0647\u0627\u062A\u0641 \u0623\u0648 \u0628\u0631\u064A\u062F \u0645\u0642\u0631\u0648\u0621: \u0644\u0627 \u064A\u0633\u062A\u0637\u064A\u0639 \u0627\u0644\u0648\u0643\u0644\u0627\u0621 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u064A\u0643.",
  "drive.action": "\u0627\u0644\u062D\u062C\u0632 \u0623\u0648 \u0627\u0644\u0634\u0631\u0627\u0621 \u0623\u0648 \u0637\u0644\u0628 \u0639\u0631\u0636 \u0633\u0639\u0631",
  "drive.action.pass": "\u0625\u062C\u0631\u0627\u0621 \u0648\u0627\u0636\u062D ({n}) \u0645\u0639 \u0627\u0644\u062A\u0631\u0645\u064A\u0632 \u0627\u0644\u0645\u0646\u0627\u0633\u0628.",
  "drive.action.warn": "\u0648\u064F\u062C\u062F\u062A {n} \u0631\u0648\u0627\u0628\u0637 \u0625\u062C\u0631\u0627\u0621 \u062F\u0648\u0646 \u062A\u0631\u0645\u064A\u0632 \u0644\u0644\u0625\u062C\u0631\u0627\u0621. \u064A\u0643\u0641\u064A \u0644\u0645\u0639\u0638\u0645 \u0627\u0644\u0645\u0648\u0627\u0642\u0639.",
  "drive.action.warn.1": "\u0648\u064f\u062c\u062f \u0631\u0627\u0628\u0637 \u0625\u062c\u0631\u0627\u0621 \u0648\u0627\u062d\u062f \u062f\u0648\u0646 \u062a\u0631\u0645\u064a\u0632 \u0644\u0644\u0625\u062c\u0631\u0627\u0621. \u064a\u0643\u0641\u064a \u0644\u0645\u0639\u0638\u0645 \u0627\u0644\u0645\u0648\u0627\u0642\u0639.",
  "drive.action.fail": "\u0644\u0627 \u0625\u062C\u0631\u0627\u0621 \u0648\u0627\u0636\u062D \u0644\u0644\u062D\u062C\u0632 \u0623\u0648 \u0627\u0644\u0634\u0631\u0627\u0621 \u0623\u0648 \u0637\u0644\u0628 \u0639\u0631\u0636 \u0633\u0639\u0631.",
  "drive.forms": "\u0645\u0644\u0621 \u0627\u0644\u0646\u0645\u0648\u0630\u062C",
  "drive.forms.pass": "{fields} \u062D\u0642\u0648\u0644\u060C \u0643\u0644\u0647\u0627 \u0645\u0633\u0645\u0651\u0627\u0629\u060C \u0645\u0639 \u062A\u0644\u0645\u064A\u062D\u0627\u062A \u0627\u0644\u0645\u0644\u0621 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A.",
  "drive.forms.warn": "\u0643\u0644 \u0627\u0644\u062D\u0642\u0648\u0644 \u0645\u0633\u0645\u0651\u0627\u0629\u061B \u0623\u0636\u0641 autocomplete (\u0627\u0644\u0627\u0633\u0645\u060C \u0627\u0644\u0628\u0631\u064A\u062F\u060C \u0627\u0644\u0647\u0627\u062A\u0641).",
  "drive.forms.fail": "{unlabeled} \u0645\u0646 {fields} \u062D\u0642\u0648\u0644 \u062F\u0648\u0646 \u062A\u0633\u0645\u064A\u0629: \u0639\u0644\u0649 \u0627\u0644\u0648\u0643\u0644\u0627\u0621 \u0627\u0644\u062A\u062E\u0645\u064A\u0646.",
  "drive.forms.info": "\u0644\u0627 \u0646\u0645\u0648\u0630\u062C \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629.",
  "drive.names": "\u0627\u0644\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0632\u0631 \u0627\u0644\u0635\u062D\u064A\u062D",
  "drive.names.pass": "\u0644\u0643\u0644 \u0632\u0631 \u0648\u0631\u0627\u0628\u0637 \u0627\u0633\u0645.",
  "drive.names.warn": "{n} \u0623\u0632\u0631\u0627\u0631 \u0623\u0648 \u0631\u0648\u0627\u0628\u0637 \u062F\u0648\u0646 \u0627\u0633\u0645 (\u0623\u064A\u0642\u0648\u0646\u0629 \u0641\u0642\u0637).",
  "drive.names.warn.1": "\u0632\u0631 \u0623\u0648 \u0631\u0627\u0628\u0637 \u0648\u0627\u062d\u062f \u062f\u0648\u0646 \u0627\u0633\u0645 (\u0623\u064a\u0642\u0648\u0646\u0629 \u0641\u0642\u0637).",
  "drive.names.fail": "{n} \u0623\u0632\u0631\u0627\u0631 \u0623\u0648 \u0631\u0648\u0627\u0628\u0637 \u062F\u0648\u0646 \u0627\u0633\u0645: \u0644\u0627 \u064A\u0639\u0631\u0641 \u0627\u0644\u0648\u0643\u0644\u0627\u0621 \u0648\u0638\u064A\u0641\u062A\u0647\u0627.",
  "drive.names.fail.1": "\u0632\u0631 \u0623\u0648 \u0631\u0627\u0628\u0637 \u0648\u0627\u062d\u062f \u062f\u0648\u0646 \u0627\u0633\u0645: \u0644\u0627 \u064a\u0639\u0631\u0641 \u0627\u0644\u0648\u0643\u0644\u0627\u0621 \u0648\u0638\u064a\u0641\u062a\u0647.",
  "drive.webmcp": "\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0623\u062F\u0648\u0627\u062A \u0627\u0644\u0645\u0648\u0642\u0639 (WebMCP)",
  "drive.webmcp.pass": "{n} \u0646\u0645\u0648\u0630\u062C \u0645\u064F\u0639\u0631\u064E\u0651\u0641 \u0643\u0623\u062F\u0627\u0629 \u0644\u0644\u0648\u0643\u0644\u0627\u0621.",
  "drive.webmcp.info": "\u0644\u0627 \u0623\u062F\u0648\u0627\u062A WebMCP \u0628\u0639\u062F. \u0627\u062E\u062A\u064A\u0627\u0631\u064A \u0648\u0641\u064A \u0628\u062F\u0627\u064A\u062A\u0647: \u062A\u0643\u0641\u064A \u0628\u0636\u0639 \u0633\u0645\u0627\u062A \u0639\u0644\u0649 \u0646\u0645\u0648\u0630\u062C\u0643 \u0627\u0644\u0631\u0626\u064A\u0633\u064A.",
  "drive.commerce": "\u0627\u0644\u062A\u0633\u0648\u0642 \u0639\u0628\u0631 \u0648\u0643\u064A\u0644 (UCP)",
  "drive.commerce.pass": "\u064A\u0646\u0634\u0631 \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0642\u0639 /.well-known/ucp.",
  "drive.commerce.info": "\u0644\u0627 \u0645\u0644\u0641 /.well-known/ucp. \u064A\u062E\u0635 \u0627\u0644\u0645\u062A\u0627\u062C\u0631 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0629 \u0641\u0642\u0637.",
  "dst.pass": "\u0648\u0627\u0636\u062D",
  "dst.warn": "\u063A\u064A\u0631 \u0648\u0627\u0636\u062D",
  "dst.fail": "\u0645\u062D\u062C\u0648\u0628",
  "dst.info": "\u0645\u0644\u0627\u062D\u0638\u0629",
  "lab.title": "\u0645\u062E\u062A\u0628\u0631 \u0627\u0644\u0638\u0647\u0648\u0631",
  "lab.lead": "\u0627\u0637\u0631\u062D \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0627\u0644\u062D\u0642\u064A\u0642\u064A\u0629 \u0645\u0627 \u064A\u0633\u0623\u0644\u0647 \u0639\u0645\u0644\u0627\u0624\u0643. \u064A\u0641\u062A\u062D \u0635\u062F\u0649 \u0643\u0644 \u0645\u0633\u0627\u0639\u062F \u0648\u0627\u0644\u0633\u0624\u0627\u0644 \u0645\u0643\u062A\u0648\u0628\u060C \u062A\u0639\u064A\u062F \u0623\u0646\u062A \u0627\u0644\u0625\u062C\u0627\u0628\u0629\u060C \u0648\u064A\u062D\u062A\u0641\u0638 \u0635\u062F\u0649 \u0628\u0627\u0644\u0646\u062A\u0627\u0626\u062C.",
  "lab.brand": "\u0627\u0633\u0645 \u0646\u0634\u0627\u0637\u0643",
  "lab.all": "\u0639\u0631\u0636 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0640 {n}",
  "lab.fewer": "\u0639\u0631\u0636 \u0623\u0642\u0644",
  "lab.qs": "\u0627\u0644\u0623\u0633\u0626\u0644\u0629",
  "lab.addq": "\u0623\u0636\u0641 \u0633\u0624\u0627\u0644\u0643\u2026",
  "lab.add": "\u0623\u0636\u0641",
  "lab.step1": "1. \u0627\u0633\u0623\u0644",
  "lab.how": "\u064A\u064F\u0641\u062A\u062D \u0641\u064A \u0645\u062A\u0635\u0641\u062D\u0643 \u0628\u062D\u0633\u0627\u0628\u0643 \u0623\u0646\u062A. \u064A\u064F\u0646\u0633\u062E \u0627\u0644\u0633\u0624\u0627\u0644 \u0623\u064A\u0636\u064B\u0627 \u0625\u0646 \u0627\u062D\u062A\u062C\u062A \u0644\u0635\u0642\u0647. \u0644\u0627 \u064A\u0642\u0631\u0623 \u0635\u062F\u0649 \u062A\u0644\u0643 \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0623\u0628\u062F\u064B\u0627.",
  "lab.step2": "2. \u0623\u0639\u062F \u0627\u0644\u0625\u062C\u0627\u0628\u0629",
  "lab.from": "\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0645\u0646",
  "lab.paste": "\u0627\u0644\u0635\u0642 \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0647\u0646\u0627",
  "lab.read": "\u0627\u0642\u0631\u0623 \u0627\u0644\u0625\u062C\u0627\u0628\u0629",
  "lab.menu": "\u0623\u0633\u0631\u0639: \u062D\u062F\u0651\u062F \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0641\u064A \u0635\u0641\u062D\u0629 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u060C \u0627\u0646\u0642\u0631 \u0628\u0627\u0644\u0632\u0631 \u0627\u0644\u0623\u064A\u0645\u0646 \u0648\u0627\u062E\u062A\u0631 \xAB\u0623\u0631\u0633\u0644 \u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0647\u0630\u0647 \u0625\u0644\u0649 \u0635\u062F\u0649\xBB.",
  "lab.open": "\u0627\u0633\u0623\u0644",
  "lab.paste.open": "\u0627\u0646\u0633\u062E \u0648\u0627\u0641\u062A\u062D",
  "lab.rank": "\u0645\u0630\u0643\u0648\u0631\u060C \u0631\u0642\u0645 {n}",
  "lab.named": "\u0645\u0630\u0643\u0648\u0631",
  "lab.notnamed": "\u063A\u064A\u0631 \u0645\u0630\u0643\u0648\u0631",
  "lab.opened": "\u0641\u064F\u062A\u062D {engine} \u0645\u0639 \u0633\u0624\u0627\u0644\u0643.",
  "lab.opened.paste": "\u0646\u064F\u0633\u062E \u0627\u0644\u0633\u0624\u0627\u0644. \u0627\u0644\u0635\u0642\u0647 \u0641\u064A {engine} (Ctrl+V).",
  "lab.short": "\u0627\u0644\u0635\u0642 \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0643\u0627\u0645\u0644\u0629 \u0623\u0648\u0644\u064B\u0627.",
  "lab.got": "\u0648\u0635\u0644\u062A \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0645\u0646 {engine}.",
  "lab.v.rank": "{brand} \u0645\u0630\u0643\u0648\u0631: \u0631\u0642\u0645 {n} \u0645\u0646 {of}.",
  "lab.v.named": "{brand} \u0645\u0630\u0643\u0648\u0631.",
  "lab.v.not": "{brand} \u063A\u064A\u0631 \u0645\u0630\u0643\u0648\u0631 \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u0625\u062C\u0627\u0628\u0629.",
  "lab.v.facts": "\u062A\u062D\u0642\u0651\u0642 \u0645\u0646 \u0635\u062D\u0629 \u0647\u0630\u0647 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A.",
  "lab.v.others": "\u0645\u0630\u0643\u0648\u0631\u0648\u0646 \u0628\u062F\u0644\u064B\u0627 \u0645\u0646\u0643 \u0623\u0648 \u0645\u0639\u0643:",
  "lab.v.src": "\u0645\u0648\u0627\u0642\u0639 \u062A\u0639\u062A\u0645\u062F \u0639\u0644\u064A\u0647\u0627 \u0627\u0644\u0625\u062C\u0627\u0628\u0629:",
  "lab.board": "\u0644\u0648\u062D\u0629 \u0627\u0644\u0646\u062A\u0627\u0626\u062C",
  "lab.share": "{n} \u0645\u0646 {of} \u0625\u062C\u0627\u0628\u0627\u062A \u062A\u0630\u0643\u0631\u0643",
  "lab.comp": "\u0627\u0644\u0623\u0643\u062B\u0631 \u0630\u0643\u0631\u064B\u0627",
  "lab.src": "\u0627\u0644\u0645\u0635\u0627\u062F\u0631 \u0627\u0644\u062A\u064A \u064A\u0639\u062A\u0645\u062F\u0647\u0627 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "lab.src.d": "\u0642\u0627\u0626\u0645\u0629 \u0639\u0644\u0627\u0642\u0627\u062A\u0643 \u0627\u0644\u0639\u0627\u0645\u0629 \u0627\u0644\u0631\u0642\u0645\u064A\u0629: \u0627\u0643\u0633\u0628 \u0630\u0643\u0631\u064B\u0627 \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u0645\u0648\u0627\u0642\u0639.",
  "lab.src.copy": "\u0627\u0646\u0633\u062E \u0627\u0644\u0642\u0627\u0626\u0645\u0629",
  "lab.honest": "\u062A\u062A\u063A\u064A\u0631 \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0645\u0646 \u0645\u0631\u0629 \u0644\u0623\u062E\u0631\u0649. \u0627\u0637\u0631\u062D \u0643\u0644 \u0633\u0624\u0627\u0644 \u0639\u062F\u0629 \u0645\u0631\u0627\u062A: \u0627\u0644\u0645\u0647\u0645 \u0646\u0633\u0628\u0629 \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u062A\u064A \u062A\u0630\u0643\u0631\u0643.",
  "lab.empty": "\u0627\u0641\u062D\u0635 \u0635\u0641\u062D\u0629 \u0623\u0648\u0644\u064B\u0627",
  "lab.empty.d": "\u064A\u062A\u0648\u0642\u0639 \u0635\u062F\u0649 \u0623\u0633\u0626\u0644\u0629 \u0639\u0645\u0644\u0627\u0626\u0643 \u0645\u0646 \u0645\u0648\u0642\u0639\u0643.",
  "lab.pro": "\u062A\u0631\u064A\u062F \u0645\u062A\u0627\u0628\u0639\u0629 \u0623\u0633\u0628\u0648\u0639\u064A\u0629 \u0639\u0628\u0631 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0645\u0639 \u062A\u0642\u0631\u064A\u0631 \u0634\u0647\u0631\u064A\u061F",
  "lab.pro.subj": "\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0638\u0647\u0648\u0631 \u0641\u064A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "sim.title": "\u0642\u0631\u0627\u0621\u0629 \u0633\u0631\u064A\u0639\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0639\u0644\u0649 \u0627\u0644\u062C\u0647\u0627\u0632",
  "sim.d": "\u0643\u064A\u0641 \u064A\u0635\u0641 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629 \u0645\u0646 \u0646\u0635\u0647\u0627 \u0641\u0642\u0637\u061F \u064A\u0639\u0645\u0644 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062D\u0627\u0633\u0648\u0628 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0645\u062F\u0645\u062C \u0641\u064A Chrome.",
  "sim.run": "\u0635\u0650\u0641 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629",
  "tab.academy": "\u0627\u0644\u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629",
  "ac.xp": "{xp} \u0646\u0642\u0637\u0629 \xB7 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u062A\u0627\u0644\u064A \u0639\u0646\u062F {next}",
  "ac.streak.d": "\u0623\u064A\u0627\u0645 \u0645\u062A\u062A\u0627\u0644\u064A\u0629 \u0641\u064A\u0647\u0627 \u0646\u0634\u0627\u0637 \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644",
  "ac.drill": "\u062A\u0645\u0631\u064A\u0646 \u0627\u0644\u064A\u0648\u0645",
  "ac.drill.d": "5 \u0623\u0633\u0626\u0644\u0629\u060C \u062F\u0642\u064A\u0642\u062A\u0627\u0646 \u062A\u0642\u0631\u064A\u0628\u064B\u0627",
  "ac.drill.done": "\u0623\u0646\u062C\u0632\u062A \u062A\u0645\u0631\u064A\u0646 \u0627\u0644\u064A\u0648\u0645",
  "ac.drill.end": "\u0627\u0644\u0633\u0644\u0633\u0644\u0629: {n} \u064A\u0648\u0645. \u0625\u0644\u0649 \u0627\u0644\u063A\u062F.",
  "ac.drill.end.1": "\u0627\u0644\u0633\u0644\u0633\u0644\u0629: \u064a\u0648\u0645 \u0648\u0627\u062d\u062f. \u0625\u0644\u0649 \u0627\u0644\u063a\u062f.",
  "ac.play": "\u0627\u0644\u0639\u0628",
  "ac.tracks": "\u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A",
  "ac.done": "{n}/{of} \u062F\u0631\u0648\u0633",
  "ac.library": "\u0634\u0631\u062D \u0627\u0644\u0641\u062D\u0648\u0635\u0627\u062A",
  "ac.library.d": "\u062F\u0631\u0633 \u0627\u0644\u0633\u062A\u064A\u0646 \u062B\u0627\u0646\u064A\u0629 \u0648\u0631\u0627\u0621 \u0643\u0644 \u0641\u062D\u0635 \u0641\u064A \u0635\u062F\u0649.",
  "ac.team": "\u062F\u0631\u0651\u0628 \u0641\u0631\u064A\u0642\u0643",
  "ac.team.d": "\u0648\u0631\u0634\u0627\u062A \u0644\u0641\u0631\u0642 \u0627\u0644\u062A\u0633\u0648\u064A\u0642 \u0648\u0627\u0644\u0648\u0643\u0627\u0644\u0627\u062A \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0623\u0648 \u0627\u0644\u0641\u0631\u0646\u0633\u064A\u0629 \u0623\u0648 \u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629.",
  "ac.team.subj": "\u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629 \u0644\u0641\u0631\u064A\u0642\u064A",
  "ac.team.cta": "\u0627\u0633\u0623\u0644 \u0639\u0646 \u062A\u062F\u0631\u064A\u0628 \u0627\u0644\u0641\u0631\u064A\u0642",
  "ac.lesson.meta": "3 \u0628\u0637\u0627\u0642\u0627\u062A \u0648\u0627\u062E\u062A\u0628\u0627\u0631 \u0648\u0645\u0647\u0645\u0629",
  "ac.prev": "\u0631\u062C\u0648\u0639",
  "ac.toquiz": "\u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631",
  "ac.next": "\u0627\u0644\u062A\u0627\u0644\u064A",
  "ac.try": "\u062C\u0631\u0651\u0628\u0647 \u0639\u0644\u0649 \u0645\u0648\u0642\u0639\u0643",
  "ac.try.go": "\u0627\u0628\u062F\u0623",
  "ac.back": "\u0627\u0644\u0639\u0648\u062F\u0629 \u0625\u0644\u0649 \u0627\u0644\u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629",
  "try.mission": "\u0634\u063A\u0651\u0644 \u0645\u0647\u0645\u0629 \u0627\u0644\u0648\u0643\u064A\u0644 \u0639\u0644\u0649 \u0645\u0648\u0642\u0639\u0643 \u0648\u0627\u0642\u0631\u0623 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0645\u062A\u0648\u0642\u0639\u0629.",
  "try.audit": "\u0627\u0641\u062A\u062D \u0627\u0644\u0641\u062D\u0635 \u0648\u0627\u0646\u0638\u0631 \u0625\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0628\u0646\u062F \u0641\u064A \u0635\u0641\u062D\u062A\u0643.",
  "try.heat": "\u0634\u063A\u0651\u0644 \u0627\u0644\u062A\u0638\u0644\u064A\u0644 \u0639\u0644\u0649 \u0635\u0641\u062D\u062A\u0643 \u0648\u0639\u062F\u0651 \u0627\u0644\u062C\u0645\u0644 \u0627\u0644\u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0627\u0642\u062A\u0628\u0627\u0633.",
  "try.bots": "\u0627\u0644\u0639\u0628 \xAB\u0627\u0633\u0645\u062D \u0623\u0648 \u0627\u062D\u062C\u0628\xBB\u060C \u062B\u0645 \u0631\u0627\u062C\u0639 robots.txt \u0641\u064A \u0627\u0644\u0641\u062D\u0635.",
  "try.quote": "\u0627\u0644\u0639\u0628 \xAB\u064A\u064F\u0642\u062A\u0628\u0633 \u0623\u0645 \u0644\u0627\xBB\u060C \u062B\u0645 \u0623\u0639\u062F \u0643\u062A\u0627\u0628\u0629 \u062C\u0645\u0644\u0629 \u0636\u0639\u064A\u0641\u0629 \u0641\u064A \u0635\u0641\u062D\u062A\u0643.",
  "try.machine": "\u0627\u0641\u062A\u062D \u0639\u0631\u0636 \u0627\u0644\u0622\u0644\u0629 \u0644\u0635\u0641\u062D\u062A\u0643: \u0645\u0627 \u0627\u0644\u062D\u0642\u0627\u0626\u0642 \u0627\u0644\u0646\u0627\u0642\u0635\u0629\u061F",
  "try.drive": "\u0634\u063A\u0651\u0644 \u062A\u062C\u0631\u0628\u0629 \u0627\u0644\u0648\u0643\u064A\u0644 \u0639\u0644\u0649 \u0635\u0641\u062D\u062A\u0643.",
  "try.rewrite": "\u0627\u0633\u062A\u062E\u062F\u0645 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0635\u064A\u0627\u063A\u0629 \u0639\u0644\u0649 \u0627\u0644\u062C\u0647\u0627\u0632 \u0644\u0623\u0636\u0639\u0641 \u0641\u0642\u0631\u0629.",
  "try.ask": "\u0627\u0637\u0631\u062D \u0633\u0624\u0627\u0644 \u0639\u0645\u064A\u0644 \u0639\u0644\u0649 \u0645\u0633\u0627\u0639\u062F\u064E\u064A\u0646 \u0648\u0627\u0642\u0631\u0623 \u0645\u0635\u0627\u062F\u0631\u0647\u0645\u0627.",
  "try.pack": "\u0646\u0632\u0651\u0644 \u0627\u0644\u062D\u0632\u0645\u0629 \u0648\u0627\u0641\u062A\u062D \u062F\u0644\u064A\u0644 \u0627\u0644\u0642\u064A\u0627\u0633.",
  "game.bots": "\u0627\u0633\u0645\u062D \u0623\u0648 \u0627\u062D\u062C\u0628",
  "game.bots.d": "\u0632\u0627\u062D\u0641 \u0628\u062D\u062B \u0623\u0645 \u0632\u0627\u062D\u0641 \u062A\u062F\u0631\u064A\u0628\u061F",
  "game.quote": "\u064A\u064F\u0642\u062A\u0628\u0633 \u0623\u0645 \u0644\u0627",
  "game.quote.d": "\u0647\u0644 \u064A\u0642\u062A\u0628\u0633\u0647\u0627 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0648\u062D\u062F\u0647\u0627\u061F",
  "game.myth": "\u062E\u0631\u0627\u0641\u0629 \u0623\u0645 \u062D\u0642\u064A\u0642\u0629",
  "game.myth.d": "\u0645\u0639\u062A\u0642\u062F\u0627\u062A \u0639\u0646 \u0627\u0644\u0628\u062D\u062B \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "game.schema": "\u0623\u0635\u0644\u062D \u0627\u0644\u062A\u0631\u0645\u064A\u0632",
  "game.schema.d": "\u0627\u0639\u062B\u0631 \u0639\u0644\u0649 \u0627\u0644\u0633\u0637\u0631 \u0627\u0644\u0645\u0639\u0637\u0648\u0628",
  "g.bots.goal": "\u0647\u062F\u0641\u0643: \u0627\u0644\u0638\u0647\u0648\u0631 \u0641\u064A \u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A\u060C \u0645\u0639 \u0625\u0628\u0639\u0627\u062F \u0645\u062D\u062A\u0648\u0627\u0643 \u0639\u0646 \u062A\u062F\u0631\u064A\u0628\u0647.",
  "g.bots.ask": "\u0647\u0644 \u062A\u0633\u0645\u062D \u0644\u0647\u0630\u0627 \u0627\u0644\u0632\u0627\u062D\u0641\u061F",
  "g.quote.ask": "\u0647\u0644 \u064A\u0633\u062A\u0637\u064A\u0639 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0642\u062A\u0628\u0627\u0633 \u0647\u0630\u0647 \u0627\u0644\u062C\u0645\u0644\u0629 \u0648\u062D\u062F\u0647\u0627\u061F",
  "g.myth.ask": "\u062E\u0631\u0627\u0641\u0629 \u0623\u0645 \u062D\u0642\u064A\u0642\u0629\u061F",
  "g.schema.ask": "\u0623\u064A \u0633\u0637\u0631 \u0641\u064A\u0647 \u0627\u0644\u062E\u0637\u0623\u061F",
  "g.keep": "\u0627\u0633\u0645\u062D",
  "g.block": "\u0627\u062D\u062C\u0628",
  "g.quotable": "\u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0627\u0642\u062A\u0628\u0627\u0633",
  "g.notquotable": "\u0644\u064A\u0633\u062A \u0648\u062D\u062F\u0647\u0627",
  "g.fact": "\u062D\u0642\u064A\u0642\u0629",
  "g.myth": "\u062E\u0631\u0627\u0641\u0629",
  "g.bots.search": "{ua} \u064A\u0642\u0631\u0623 \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0644\u064A\u062C\u064A\u0628 \u0627\u0644\u0646\u0627\u0633: \u062D\u062C\u0628\u0647 \u064A\u064F\u062E\u0631\u062C\u0643 \u0645\u0646 \u062A\u0644\u0643 \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A.",
  "g.bots.train": "{ua} \u064A\u062C\u0645\u0639 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062F\u0631\u064A\u0628: \u062D\u062C\u0628\u0647 \u0644\u0627 \u064A\u064F\u062E\u0631\u062C\u0643 \u0645\u0646 \u0627\u0644\u0628\u062D\u062B \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A.",
  "g.score": "{n} / {of}",
  "g.perfect": "\u062C\u0648\u0644\u0629 \u0643\u0627\u0645\u0644\u0629.",
  "g.good": "\u062C\u064A\u062F. \u062C\u0648\u0644\u0629 \u0623\u062E\u0631\u0649\u061F",
  "g.retry": "\u062A\u0633\u062A\u062D\u0642 \u062C\u0648\u0644\u0629 \u0623\u062E\u0631\u0649: \u0627\u0644\u0634\u0631\u0648\u062D\u0627\u062A \u0647\u064A \u0627\u0644\u062F\u0631\u0633.",
  "g.again": "\u0627\u0644\u0639\u0628 \u0645\u062C\u062F\u062F\u064B\u0627",
  "g.finish": "\u0627\u0639\u0631\u0636 \u0627\u0644\u0646\u062A\u064A\u062C\u0629",
  "xp.heat": "\u0627\u0644\u062A\u0638\u0644\u064A\u0644",
  "xp.site": "\u0641\u062D\u0635 \u0627\u0644\u0645\u0648\u0642\u0639",
  "xp.rival": "\u0627\u0644\u0645\u0646\u0627\u0641\u0633",
  "xp.mission": "\u0627\u0644\u0645\u0647\u0645\u0629",
  "xp.answer": "\u0642\u0631\u0627\u0621\u0629 \u0625\u062C\u0627\u0628\u0629",
  "xp.sim": "\u0642\u0631\u0627\u0621\u0629 \u0630\u0643\u064A\u0629",
  "xp.lesson": "\u062F\u0631\u0633",
  "xp.drill": "\u062A\u0645\u0631\u064A\u0646 \u0627\u0644\u064A\u0648\u0645",
  "pro.title": "\u062D\u064A\u0646 \u064A\u0643\u0648\u0646 \u0627\u0644\u0623\u0645\u0631 \u0645\u0634\u0631\u0648\u0639\u064B\u0627 \u0644\u0627 \u062A\u0639\u062F\u064A\u0644\u064B\u0627 \u0633\u0631\u064A\u0639\u064B\u0627",
  "pro.lead": "\u064A\u0628\u064A\u0651\u0646 \u0635\u062F\u0649 \u0645\u0627 \u064A\u062C\u0628 \u0625\u0635\u0644\u0627\u062D\u0647. \u0648\u064A\u062A\u0648\u0644\u0649 \u0641\u0631\u064A\u0642 AYKA \u0645\u0627 \u064A\u062D\u062A\u0627\u062C \u0648\u0642\u062A\u064B\u0627: \u0627\u0644\u062A\u0631\u0645\u064A\u0632 \u0639\u0644\u0649 \u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0645\u0648\u0642\u0639\u060C \u0648\u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0644\u063A\u0648\u064A\u0629\u060C \u0648\u0645\u062D\u062A\u0648\u0649 \u064A\u062C\u064A\u0628 \u0639\u0646 \u0623\u0633\u0626\u0644\u0629 \u0639\u0645\u0644\u0627\u0626\u0643\u060C \u0648\u0643\u0633\u0628 \u0627\u0644\u0630\u0643\u0631 \u0641\u064A \u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u062A\u064A \u064A\u062B\u0642 \u0628\u0647\u0627 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A.",
  "pro.subj": "\u0645\u0634\u0631\u0648\u0639 \u0645\u0639 AYKA",
  "pro.quote": "\u0643\u0644 \u0645\u0634\u0631\u0648\u0639 \u0645\u062E\u062A\u0644\u0641\u060C \u0644\u0630\u0627 \u0646\u0642\u062F\u0645 \u0639\u0631\u0636 \u0633\u0639\u0631 \u0645\u062E\u0635\u0635\u064B\u0627 \u0628\u0639\u062F \u0645\u0643\u0627\u0644\u0645\u0629 \u0642\u0635\u064A\u0631\u0629.",
  "pro.from": "\u0645\u0646 \u0645\u0647\u0645\u062A\u0643: {n} \u0645\u0634\u0631\u0648\u0639",
  "pro.from.1": "\u0645\u0646 \u0645\u0647\u0645\u062a\u0643: \u0645\u0634\u0631\u0648\u0639 \u0648\u0627\u062d\u062f",
  "pro.what": "\u0645\u0627\u0630\u0627 \u0646\u0641\u0639\u0644",
  "pro.free": "\u0635\u062F\u0649 \u064A\u0628\u0642\u0649 \u0645\u062C\u0627\u0646\u064A\u064B\u0627",
  "pro.free.d": "\u0627\u0644\u0648\u0643\u064A\u0644 \u0648\u0627\u0644\u0645\u062E\u062A\u0628\u0631 \u0648\u0627\u0644\u0641\u062D\u0635 \u0648\u0627\u0644\u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629 \u0645\u062C\u0627\u0646\u064A\u0629\u060C \u0648\u0634\u064A\u0641\u0631\u062A\u0647\u0627 \u0627\u0644\u0645\u0635\u062F\u0631\u064A\u0629 \u0645\u0646\u0634\u0648\u0631\u0629 \u0639\u0644\u0649 GitHub. \u0644\u0627 \u064A\u064F\u0631\u0633\u0644 \u0634\u064A\u0621 \u0625\u0644\u0649 AYKA \u0625\u0644\u0627 \u0625\u0630\u0627 \u062D\u062C\u0632\u062A \u0645\u0643\u0627\u0644\u0645\u0629 \u0623\u0648 \u0631\u0627\u0633\u0644\u062A\u0646\u0627.",
  "set.back": "\u0631\u062C\u0648\u0639",
  "set.theme": "\u0627\u0644\u0645\u0638\u0647\u0631",
  "set.theme.auto": "\u062A\u0644\u0642\u0627\u0626\u064A",
  "set.theme.light": "\u0641\u0627\u062A\u062D",
  "set.theme.dark": "\u062F\u0627\u0643\u0646",
  "set.remind": "\u062A\u0630\u0643\u064A\u0631 \u0623\u0633\u0628\u0648\u0639\u064A",
  "set.remind.d": "\u0625\u0634\u0639\u0627\u0631 \u0643\u0644 7 \u0623\u064A\u0627\u0645 \u0644\u0625\u0639\u0627\u062F\u0629 \u0627\u062E\u062A\u0628\u0627\u0631 \u0623\u0633\u0626\u0644\u062A\u0643. \u0645\u062A\u0648\u0642\u0641 \u0627\u0641\u062A\u0631\u0627\u0636\u064A\u064B\u0627.",
  "ai.title": "\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0639\u0644\u0649 \u0627\u0644\u062C\u0647\u0627\u0632",
  "ai.checking": "\u062C\u0627\u0631\u064D \u0627\u0644\u0641\u062D\u0635\u2026",
  "ai.ready": "\u062C\u0627\u0647\u0632: \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0645\u062F\u0645\u062C \u0641\u064A Chrome \u064A\u0639\u0645\u0644 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062D\u0627\u0633\u0648\u0628.",
  "ai.ready.tr": "\u062C\u0627\u0647\u0632: \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0645\u062F\u0645\u062C \u0641\u064A Chrome \u0645\u0639 \u062A\u0631\u062C\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u062C\u0647\u0627\u0632 \u0644\u0647\u0630\u0647 \u0627\u0644\u0644\u063A\u0629.",
  "ai.dl": "\u064A\u062A\u0648\u0641\u0631 \u0628\u0639\u062F \u062A\u0646\u0632\u064A\u0644 \u0644\u0645\u0631\u0629 \u0648\u0627\u062D\u062F\u0629 \u064A\u0642\u0648\u0645 \u0628\u0647 Chrome\u061B \u064A\u0628\u062F\u0623 \u0623\u0648\u0644 \u0645\u0631\u0629 \u062A\u0633\u062A\u062E\u062F\u0645 \u0641\u064A\u0647\u0627 \u0645\u064A\u0632\u0629 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A.",
  "ai.how": "\u0644\u0627 \u064A\u0633\u062A\u062E\u062F\u0645 \u0635\u062F\u0649 \u0623\u064A \u062E\u062F\u0645\u0629 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0648\u0644\u0627 \u0645\u0641\u062A\u0627\u062D API. \u062D\u064A\u062B \u064A\u062A\u0648\u0641\u0631 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0645\u062F\u0645\u062C \u0641\u064A Chrome (Gemini Nano) \u064A\u0633\u062A\u062E\u062F\u0645\u0647 \u0635\u062F\u0649 \u0644\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0635\u064A\u0627\u063A\u0629\u061B \u0648\u0643\u0644 \u0645\u0627 \u0639\u062F\u0627\u0647 \u064A\u0639\u0645\u0644 \u062F\u0648\u0646\u0647.",
  "set.privacy.t": "\u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629",
  "set.privacy2": "\u064A\u0642\u0631\u0623 \u0635\u062F\u0649 \u0627\u0644\u0645\u0648\u0642\u0639 \u0627\u0644\u0630\u064A \u0623\u0646\u062A \u0639\u0644\u064A\u0647 \u0641\u0642\u0637\u060C \u0648\u0639\u0646\u062F\u0645\u0627 \u062A\u0637\u0644\u0628. \u0627\u0644\u0646\u062A\u0627\u0626\u062C \u0648\u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u062A\u064A \u062A\u0644\u0635\u0642\u0647\u0627 \u0648\u062A\u0642\u062F\u0651\u0645\u0643 \u062A\u0628\u0642\u0649 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0645\u062A\u0635\u0641\u062D. \u0644\u0627 \u064A\u064F\u0631\u0633\u0644 \u0634\u064A\u0621 \u0625\u0644\u0649 AYKA \u0623\u0648 \u063A\u064A\u0631\u0647\u0627.",
  "set.reset": "\u0627\u062D\u0630\u0641 \u0643\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0635\u062F\u0649",
  "set.reset.q": "\u062D\u0630\u0641 \u0643\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0635\u062F\u0649 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0645\u062A\u0635\u0641\u062D\u061F",
  "trust.strip": "\u0622\u0645\u0646 \u0644\u0644\u0639\u0645\u0644: \u064A\u0639\u0645\u0644 \u0641\u064A \u0645\u062A\u0635\u0641\u062D\u0643 \u0648\u0644\u0627 \u064A\u0631\u0633\u0644 \u0634\u064A\u0626\u064B\u0627. \u0634\u0627\u0647\u062F \u0627\u0644\u062F\u0644\u064A\u0644",
  "trust.title": "\u0645\u0631\u0643\u0632 \u0627\u0644\u062B\u0642\u0629",
  "trust.lead": "\u064A\u0639\u0645\u0644 \u0635\u062F\u0649 \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u062F\u0627\u062E\u0644 \u0645\u062A\u0635\u0641\u062D\u0643. \u0647\u0630\u0647 \u0642\u0648\u0627\u0639\u062F\u0647\u060C \u0648\u062F\u0644\u064A\u0644 \u0645\u0628\u0627\u0634\u0631 \u0639\u0644\u0649 \u0643\u0644 \u0637\u0644\u0628 \u0623\u062C\u0631\u0627\u0647 \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u062C\u0644\u0633\u0629.",
  "trust.managed": "{n} \u0625\u0639\u062F\u0627\u062F \u062A\u062F\u064A\u0631\u0647 \u0645\u0624\u0633\u0633\u062A\u0643.",
  "trust.promises": "\u0645\u0627 \u064A\u0641\u0639\u0644\u0647 \u0635\u062F\u0649 \u0648\u0645\u0627 \u0644\u0627 \u064A\u0641\u0639\u0644\u0647 \u0623\u0628\u062F\u064B\u0627",
  "trust.p.browser": "\u064A\u0639\u0645\u0644 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062D\u0627\u0633\u0648\u0628",
  "trust.p.browser.d": "\u0643\u0644 \u0641\u062D\u0635 \u0648\u0627\u0644\u0645\u0647\u0645\u0629 \u0648\u0627\u0644\u062D\u0632\u0645\u0629 \u0648\u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u062A\u0639\u0645\u0644 \u062F\u0627\u062E\u0644 \u0645\u062A\u0635\u0641\u062D\u0643. \u0644\u0627 \u064A\u0648\u062C\u062F \u062E\u0627\u062F\u0645 \u0644\u0635\u062F\u0649.",
  "trust.p.noai": "\u0644\u0627 \u062E\u062F\u0645\u0629 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0648\u0644\u0627 \u0645\u0641\u062A\u0627\u062D API",
  "trust.p.noai.d": "\u062A\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0645\u062F\u0645\u062C \u0641\u064A \u0627\u0644\u0645\u062A\u0635\u0641\u062D \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062C\u0647\u0627\u0632 \u0639\u0646\u062F \u062A\u0648\u0641\u0631\u0647. \u0644\u0627 \u064A\u0630\u0647\u0628 \u0623\u064A \u0646\u0635 \u0625\u0644\u0649 \u0645\u0632\u0648\u0651\u062F \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A.",
  "trust.p.nosend": "\u0644\u0627 \u064A\u0631\u0633\u0644 \u0634\u064A\u0626\u064B\u0627 \u0625\u0644\u0649 AYKA \u0623\u0648 \u063A\u064A\u0631\u0647\u0627",
  "trust.p.nosend.d": "\u0644\u0627 \u062D\u0633\u0627\u0628\u060C \u0644\u0627 \u0625\u062D\u0635\u0627\u0621\u0627\u062A\u060C \u0644\u0627 \u062A\u062A\u0628\u0651\u0639\u060C \u0644\u0627 \u0645\u0639\u0631\u0651\u0641\u0627\u062A \u0625\u0639\u0644\u0627\u0646\u064A\u0629. \u0623\u0646\u062A \u0648\u062D\u062F\u0643 \u062A\u0642\u0631\u0631 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627.",
  "trust.p.readonly": "قراءة فقط، للتبويب المفتوح فقط",
  "trust.p.readonly.d": "يقرأ صدى التبويب الذي تنظر إليه: بعد نقرتك، أو عند تغيير التبويب إذا سمحت بكل المواقع وأبقيت «تتبّع التبويب النشط» مفعّلًا. تُجلب الصفحات الأخرى من الموقع نفسه دون ملفات تعريف الارتباط. وفي قنوات التواصل يقرأ فقط حقول الملف التي يفحصها كما يعرضها تبويبك، ولا يقرأ الرسائل ولا إعدادات الحساب أبدًا.",
  "trust.p.noact": "\u0644\u0627 \u064A\u0646\u0642\u0631 \u0648\u0644\u0627 \u064A\u0643\u062A\u0628 \u0648\u0644\u0627 \u064A\u0631\u0633\u0644 \u0623\u0628\u062F\u064B\u0627",
  "trust.p.noact.d": "\u0644\u0627 \u064A\u0645\u0644\u0623 \u0635\u062F\u0649 \u0623\u064A \u0646\u0645\u0648\u0630\u062C \u0648\u0644\u0627 \u064A\u0633\u062C\u0651\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0648\u0644\u0627 \u064A\u0646\u0634\u0631 \u0648\u0644\u0627 \u064A\u063A\u064A\u0651\u0631 \u0623\u064A \u0645\u0648\u0642\u0639. \u062A\u064F\u0641\u062A\u062D \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0628\u0646\u0642\u0631\u062A\u0643 \u0641\u0642\u0637 \u0641\u064A \u062A\u0628\u0648\u064A\u0628 \u0639\u0627\u062F\u064A.",
  "trust.p.open": "\u0634\u064A\u0641\u0631\u0629 \u0645\u0646\u0634\u0648\u0631\u0629 \u0648\u0645\u0642\u0631\u0648\u0621\u0629",
  "trust.p.open.d": "\u0631\u062E\u0635\u0629 FSL-1.1-ALv2 (Apache-2.0 \u0628\u0639\u062F \u0633\u0646\u062A\u064A\u0646)\u060C \u062F\u0648\u0646 \u062A\u0635\u063A\u064A\u0631\u060C \u0648\u062F\u0648\u0646 \u0634\u064A\u0641\u0631\u0629 \u062E\u0627\u0631\u062C\u064A\u0629 (\u0633\u064A\u0627\u0633\u0629 \u0623\u0645\u0627\u0646 \u0635\u0627\u0631\u0645\u0629). \u064A\u0633\u062A\u0637\u064A\u0639 \u0641\u0631\u064A\u0642 \u062A\u0642\u0646\u064A\u0629 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0642\u0631\u0627\u0621\u0629 \u0643\u0644 \u0633\u0637\u0631.",
  "trust.live": "\u062F\u0644\u064A\u0644 \u0645\u0628\u0627\u0634\u0631: \u0647\u0630\u0647 \u0627\u0644\u062C\u0644\u0633\u0629",
  "trust.zero": "\u0637\u0644\u0628\u0627\u062A \u0645\u0646 \u0635\u062F\u0649 \u0625\u0644\u0649 \u062E\u0648\u0627\u062F\u0645 \u0623\u0637\u0631\u0627\u0641 \u062B\u0627\u0644\u062B\u0629",
  "trust.live.d": "\u0630\u0647\u0628 {n} \u0637\u0644\u0628\u064B\u0627 \u0625\u0644\u0649 \u0627\u0644\u0645\u0648\u0642\u0639 \u0627\u0644\u0630\u064A \u062A\u0641\u062D\u0635\u0647 (\u0623\u0648 \u0627\u0644\u0645\u0646\u0627\u0641\u0633 \u0627\u0644\u0630\u064A \u062D\u062F\u0651\u062F\u062A\u0647). {t} \u062A\u0628\u0648\u064A\u0628 \u0645\u0633\u0627\u0639\u062F \u0641\u062A\u062D\u062A\u0647 \u0623\u0646\u062A.",
  "trust.none": "\u0644\u0627 \u0637\u0644\u0628\u0627\u062A \u0628\u0639\u062F \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u062C\u0644\u0633\u0629.",
  "trust.verify": "\u062A\u062D\u0642\u0651\u0642 \u0628\u0646\u0641\u0633\u0643: \u0627\u0646\u0642\u0631 \u0628\u0627\u0644\u0632\u0631 \u0627\u0644\u0623\u064A\u0645\u0646 \u0639\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u0644\u0648\u062D\u0629\u060C \u0627\u062E\u062A\u0631 \xAB\u0641\u062D\u0635\xBB\u060C \u062B\u0645 \u0627\u0641\u062A\u062D \u062A\u0628\u0648\u064A\u0628 \u0627\u0644\u0634\u0628\u0643\u0629.",
  "trust.why.social": "\u0627\u0644\u062d\u0633\u0627\u0628 \u0627\u0644\u0630\u064a \u0641\u062d\u0635\u062a\u0647",
  "trust.why.page": "\u0627\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u0645\u0641\u062D\u0648\u0635\u0629",
  "trust.why.site": "\u0635\u0641\u062D\u0627\u062A \u0627\u0644\u0645\u0648\u0642\u0639 \u0646\u0641\u0633\u0647",
  "trust.why.rival": "\u0627\u0644\u0645\u0646\u0627\u0641\u0633 \u0627\u0644\u0630\u064A \u062D\u062F\u0651\u062F\u062A\u0647",
  "trust.why.assistant": "\u062A\u0628\u0648\u064A\u0628 \u0641\u062A\u062D\u062A\u0647 \u0623\u0646\u062A",
  "trust.perms": "\u0627\u0644\u0623\u0630\u0648\u0646\u0627\u062A\u060C \u0648\u0644\u0645\u0627\u0630\u0627",
  "trust.perm.activeTab": "\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u062A\u064A \u0623\u0646\u062A \u0639\u0644\u064A\u0647\u0627\u060C \u0628\u0639\u062F \u0646\u0642\u0631\u062A\u0643 \u0641\u0642\u0637.",
  "trust.perm.scripting": "\u062A\u0634\u063A\u064A\u0644 \u0634\u064A\u0641\u0631\u0629 \u0627\u0644\u0642\u0631\u0627\u0621\u0629 \u0641\u064A \u062A\u0644\u0643 \u0627\u0644\u0635\u0641\u062D\u0629 (\u0642\u0631\u0627\u0621\u0629 \u0641\u0642\u0637).",
  "trust.perm.sidePanel": "\u0639\u0631\u0636 \u0635\u062F\u0649 \u0628\u062C\u0627\u0646\u0628 \u0627\u0644\u0635\u0641\u062D\u0629.",
  "trust.perm.storage": "\u062D\u0641\u0638 \u0646\u062A\u0627\u0626\u062C\u0643 \u0648\u062A\u0642\u062F\u0651\u0645\u0643 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0645\u062A\u0635\u0641\u062D.",
  "trust.perm.contextMenus": "\u062E\u064A\u0627\u0631 \u0627\u0644\u0646\u0642\u0631 \u0628\u0627\u0644\u0632\u0631 \u0627\u0644\u0623\u064A\u0645\u0646 \u0644\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u062A\u064A \u062A\u062D\u062F\u062F\u0647\u0627 \u0628\u0646\u0641\u0633\u0643.",
  "trust.perm.favicon": "\u0639\u0631\u0636 \u0623\u064A\u0642\u0648\u0646\u0629 \u0627\u0644\u0645\u0648\u0642\u0639 \u0641\u064A \u0627\u0644\u0645\u0642\u064A\u0627\u0633.",
  "trust.perm.alarms": "التذكير الأسبوعي وتذكيرات النشر وفحوص المراقبة، فقط إن فعّلتها.",
  "trust.perm.notifications": "اختياري، يُطلب فقط للتذكيرات وتنبيهات المراقبة.",
  "trust.perm.sites.n": "\u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u0645\u0648\u0627\u0642\u0639",
  "trust.perm.sites": "اختياري. يُطلب مرة واحدة ليتمكن صدى من التحديث عند تغيير التبويب وقراءة قنوات التواصل وفحص موقع منافس. يمكنك إزالته في أي وقت من Chrome: الإضافات ← صدى ← التفاصيل ← الوصول إلى المواقع.",
  "trust.stored": "\u0645\u062D\u0641\u0648\u0638 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0645\u062A\u0635\u0641\u062D \u0641\u0642\u0637",
  "trust.stored.d": "{missions} \u0645\u0647\u0645\u0629\u060C {answers} \u0625\u062C\u0627\u0628\u0629 \u0623\u0639\u062F\u062A\u0647\u0627\u060C {lessons} \u0633\u062C\u0644 \u062F\u0631\u0648\u0633. \u0644\u0627 \u0634\u064A\u0621 \u064A\u064F\u0632\u0627\u0645\u0646 \u0623\u0648 \u064A\u064F\u0631\u0641\u0639.",
  "trust.it": "\u0644\u0641\u0631\u0642 \u062A\u0642\u0646\u064A\u0629 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0648\u0627\u0644\u0623\u0645\u0646",
  "trust.it.d": "\u0627\u0646\u0634\u0631 \u0635\u062F\u0649 \u0639\u0628\u0631 \u0633\u064A\u0627\u0633\u0627\u062A Chrome \u0623\u0648 Edge \u0648\u0623\u0648\u0642\u0641 \u0627\u0644\u0645\u064A\u0632\u0627\u062A \u0645\u0631\u0643\u0632\u064A\u064B\u0627. \u062A\u063A\u0637\u064A \u0648\u0631\u0642\u0629 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u062A\u062F\u0641\u0642 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0627\u0644\u0623\u0630\u0648\u0646\u0627\u062A \u0648\u0627\u0644\u0633\u064A\u0627\u0633\u0627\u062A \u0648\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0646\u0633\u062E\u0629.",
  "pol.disableAssistantLinks": "\u0639\u062F\u0645 \u0641\u062A\u062D \u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0623\u0628\u062F\u064B\u0627 (\u0646\u0633\u062E \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0641\u0642\u0637)",
  "pol.disableRival": "\u0639\u062F\u0645 \u0642\u0631\u0627\u0621\u0629 \u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u0645\u0646\u0627\u0641\u0633\u064A\u0646",
  "pol.disableSiteScan": "\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u0641\u0642\u0637\u060C \u0644\u0627 \u0628\u0642\u064A\u0629 \u0627\u0644\u0645\u0648\u0642\u0639",
  "pol.disableOnDeviceAI": "\u0639\u062F\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0645\u062F\u0645\u062C \u0641\u064A \u0627\u0644\u0645\u062A\u0635\u0641\u062D",
  "pol.hideContactOffers": "\u0625\u062E\u0641\u0627\u0621 \u0639\u0631\u0648\u0636 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 AYKA",
  "pol.on": "\u0645\u0641\u0639\u0651\u0644",
  "pol.off": "\u0645\u062A\u0648\u0642\u0641",
  "trust.it.doc": "\u0648\u0631\u0642\u0629 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0623\u0645\u0646\u064A\u0629",
  "trust.it.build": "\u0628\u0635\u0645\u0627\u062A SHA-256 \u0645\u0646\u0634\u0648\u0631\u0629 \u0645\u0639 \u0643\u0644 \u0625\u0635\u062F\u0627\u0631",
  "lab.copied.only": "\u0646\u064F\u0633\u062E \u0627\u0644\u0633\u0624\u0627\u0644. \u0645\u0624\u0633\u0633\u062A\u0643 \u0644\u0627 \u062A\u0633\u0645\u062D \u0644\u0635\u062F\u0649 \u0628\u0641\u062A\u062D {engine}: \u0627\u0644\u0635\u0642\u0647 \u0647\u0646\u0627\u0643 \u0628\u0646\u0641\u0633\u0643.",
  "lab.copy": "\u0627\u0646\u0633\u062E \u0627\u0644\u0633\u0624\u0627\u0644",
  "lab.nudge": "\u0647\u0646\u0627 \u0631\u0634\u0651\u062D \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A {comp} \u0628\u062F\u0644\u064B\u0627 \u0645\u0646\u0643.",
  "lab.nudge.cta": "\u0627\u0639\u0631\u0641 \u0627\u0644\u0633\u0628\u0628 \u0641\u064A \u0645\u0631\u0627\u062C\u0639\u0629 \u0645\u062C\u0627\u0646\u064A\u0629",
  "lab.nudge.note": "\u0630\u0643\u0631 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A {comp} \u0628\u062F\u0644\u064B\u0627 \u0645\u0646\u0627 \u0641\u064A: {q}",
  "plan.progress": "\u0623\u064F\u0646\u062C\u0632 {n} \u0645\u0646 {of}",
  "plan.mark": "\u0639\u0644\u0651\u0645 \u0643\u0645\u0646\u062C\u0632",
  "xp.plan": "\u062E\u0637\u0648\u0629 \u0645\u0646 \u0627\u0644\u062E\u0637\u0629",
  "ns.kicker": "\u062E\u0637\u0648\u062A\u0643 \u0627\u0644\u062A\u0627\u0644\u064A\u0629",
  "ns.comp": "\u0641\u064A \u0627\u062E\u062A\u0628\u0627\u0631\u0627\u062A\u0643 \u0630\u0643\u0631 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A {comp} {n} \u0645\u0631\u0629\u060C \u0648\u0630\u064F\u0643\u0631\u062A \u0623\u0646\u062A \u0641\u064A {named} \u0645\u0646 {of} \u0625\u062C\u0627\u0628\u0627\u062A.",
  "ns.gaps": "\u064A\u062A\u0631\u0643 \u0645\u0648\u0642\u0639\u0643 {n} \u0645\u0646 {of} \u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u062F\u0648\u0646 \u0625\u062C\u0627\u0628\u0629 \u0648\u0627\u0636\u062D\u0629\u060C \u0645\u0646\u0647\u0627 {open} \u064A\u062E\u062A\u0627\u0631 \u0641\u064A\u0647\u0627 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0646\u0634\u0627\u0637\u064B\u0627.",
  "ns.good": "\u0645\u0648\u0642\u0639\u0643 \u064A\u062C\u064A\u0628 \u0639\u0646 \u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621. \u0627\u0644\u062E\u0637\u0648\u0629 \u0627\u0644\u062A\u0627\u0644\u064A\u0629: \u0623\u0646 \u062A\u064F\u0630\u0643\u0631 \u0641\u064A \u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u062A\u064A \u064A\u062B\u0642 \u0628\u0647\u0627 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A.",
  "ns.body": "\u0627\u062D\u062C\u0632 \u0645\u0631\u0627\u062C\u0639\u0629 \u0645\u062C\u0627\u0646\u064A\u0629 \u0644\u0645\u062F\u0629 30 \u062F\u0642\u064A\u0642\u0629. \u0646\u0631\u0627\u062C\u0639 \u0645\u0647\u0645\u062A\u0643 \u0645\u0639\u0643 \u0648\u0646\u062E\u0628\u0631\u0643 \u0628\u0645\u0627 \u062A\u0641\u0639\u0644\u0647 \u0623\u0648\u0644\u064B\u0627. \u062A\u062D\u062A\u0641\u0638 \u0628\u0627\u0644\u062D\u0632\u0645\u0629 \u0648\u0627\u0644\u062E\u0637\u0629 \u0641\u064A \u0643\u0644 \u0627\u0644\u0623\u062D\u0648\u0627\u0644\u060C \u062F\u0648\u0646 \u0623\u064A \u0627\u0644\u062A\u0632\u0627\u0645.",
  "ns.get1": "\u062E\u0637\u062A\u0643 \u0645\u0631\u062A\u0628\u0629 \u0644\u0646\u0634\u0627\u0637\u0643 \u0648\u0633\u0648\u0642\u0643",
  "ns.get2": "\u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u062A\u064A \u064A\u062B\u0642 \u0628\u0647\u0627 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0641\u064A \u0642\u0637\u0627\u0639\u0643\u060C \u0648\u0643\u064A\u0641 \u062A\u0638\u0647\u0631 \u0641\u064A\u0647\u0627",
  "ns.get3": "\u062C\u0648\u0627\u0628 \u0648\u0627\u0636\u062D \u0628\u0646\u0639\u0645 \u0623\u0648 \u0644\u0627: \u0647\u0644 \u062A\u062D\u062A\u0627\u062C \u0645\u0633\u0627\u0639\u062F\u0629 \u0623\u0635\u0644\u064B\u0627\u061F",
  "ns.book": "\u0627\u062D\u062C\u0632 \u0645\u0631\u0627\u062C\u0639\u0629 \u0645\u062C\u0627\u0646\u064A\u0629 (30 \u062F\u0642\u064A\u0642\u0629)",
  "ns.mail": "\u0623\u0631\u0633\u0644 \u0646\u062A\u0627\u0626\u062C\u064A \u0628\u0627\u0644\u0628\u0631\u064A\u062F",
  "ns.mail.subj": "\u0645\u0631\u0627\u062C\u0639\u0629 \u0645\u0647\u0645\u0629 \u0635\u062F\u0649 \u0627\u0644\u062E\u0627\u0635\u0629 \u0628\u064A",
  "ns.shares": "\u064A\u0641\u062A\u062D \u0627\u0644\u062D\u062C\u0632 getayka.com \u0648\u0644\u0627 \u064A\u0631\u0633\u0644 \u0625\u0644\u0627 \u0645\u0627 \u062A\u0631\u0627\u0647: \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0645\u0648\u0642\u0639 \u0648\u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0648\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0645\u064F\u062C\u0627\u0628\u0629 \u0648\u0639\u0646\u0627\u0648\u064A\u0646 \u0627\u0644\u062E\u0637\u0629.",
  "tier.free": "\u0627\u0641\u0639\u0644\u0647\u0627 \u0628\u0646\u0641\u0633\u0643",
  "tier.free.p": "\u0645\u062C\u0627\u0646\u064A\u060C \u0644\u0644\u0623\u0628\u062F",
  "tier.free.1": "\u0645\u0647\u0645\u0629 \u0627\u0644\u0648\u0643\u064A\u0644 \u0648\u062D\u0632\u0645\u0629 \u0627\u0644\u0625\u0635\u0644\u0627\u062D\u0627\u062A",
  "tier.free.2": "\u0645\u062E\u062A\u0628\u0631 \u0627\u0644\u0638\u0647\u0648\u0631 \u0641\u064A 8 \u0645\u0633\u0627\u0639\u062F\u0627\u062A",
  "tier.free.3": "\u0627\u0644\u0641\u062D\u0635 \u0648\u0641\u062D\u0635 \u0627\u0644\u0645\u0648\u0642\u0639 \u0648\u0627\u0644\u0645\u0646\u0627\u0641\u0633",
  "tier.free.4": "\u0627\u0644\u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629 \u0648\u0627\u0644\u0623\u0644\u0639\u0627\u0628",
  "tier.free.cta": "\u0627\u0628\u062F\u0623 \u0645\u0647\u0645\u0629",
  "tier.review": "\u0645\u0631\u0627\u062C\u0639\u0629 \u0645\u062C\u0627\u0646\u064A\u0629",
  "tier.review.p": "30 \u062F\u0642\u064A\u0642\u0629\u060C \u062F\u0648\u0646 \u0627\u0644\u062A\u0632\u0627\u0645",
  "tier.review.1": "\u0646\u0642\u0631\u0623 \u0645\u0647\u0645\u062A\u0643 \u0648\u062D\u0632\u0645\u062A\u0643 \u0645\u0639\u0643",
  "tier.review.2": "\u0623\u0647\u0645 \u062B\u0644\u0627\u062B \u062E\u0637\u0648\u0627\u062A \u0644\u0643\u060C \u0628\u0627\u0644\u062A\u0631\u062A\u064A\u0628",
  "tier.review.3": "\u062C\u0648\u0627\u0628 \u0635\u0631\u064A\u062D: \u0647\u0644 \u062A\u062D\u062A\u0627\u062C\u0646\u0627\u061F",
  "tier.done": "\u0646\u0646\u062C\u0632\u0647 \u0644\u0643",
  "tier.done.p": "\u0639\u0631\u0636 \u0633\u0639\u0631 \u0645\u062E\u0635\u0635 \u0648\u0646\u0637\u0627\u0642 \u0645\u062D\u062F\u062F",
  "tier.done.1": "\u0627\u0644\u062A\u0631\u0645\u064A\u0632 \u0639\u0644\u0649 \u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0645\u0648\u0642\u0639 \u0648\u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0644\u063A\u0648\u064A\u0629",
  "tier.done.2": "\u0645\u062D\u062A\u0648\u0649 \u064A\u062C\u064A\u0628 \u0639\u0646 \u0623\u0633\u0626\u0644\u0629 \u0639\u0645\u0644\u0627\u0626\u0643",
  "tier.done.3": "\u0639\u0644\u0627\u0642\u0627\u062A \u0639\u0627\u0645\u0629 \u0631\u0642\u0645\u064A\u0629 \u0641\u064A \u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u062A\u064A \u064A\u0639\u062A\u0645\u062F\u0647\u0627 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "tier.done.4": "\u0645\u062A\u0627\u0628\u0639\u0629 \u0623\u0633\u0628\u0648\u0639\u064A\u0629 \u0645\u0639 \u062A\u0642\u0631\u064A\u0631 \u0634\u0647\u0631\u064A",
  "pro.how": "\u0643\u064A\u0641 \u064A\u0633\u064A\u0631 \u0627\u0644\u0645\u0634\u0631\u0648\u0639",
  "pro.how.1": "\u0645\u0643\u0627\u0644\u0645\u0629 \u0645\u0631\u0627\u062C\u0639\u0629 \u0645\u062C\u0627\u0646\u064A\u0629",
  "pro.how.1.d": "30 \u062F\u0642\u064A\u0642\u0629 \u062D\u0648\u0644 \u0646\u062A\u0627\u0626\u062C \u0645\u0647\u0645\u062A\u0643.",
  "pro.how.2": "\u0639\u0631\u0636 \u0645\u0643\u062A\u0648\u0628",
  "pro.how.2.d": "\u0646\u0637\u0627\u0642 \u0648\u0633\u0639\u0631 \u062B\u0627\u0628\u062A\u0627\u0646\u060C \u0643\u062A\u0627\u0628\u064A\u064B\u0627\u060C \u0642\u0628\u0644 \u0628\u062F\u0621 \u0623\u064A \u0639\u0645\u0644.",
  "pro.how.3": "\u0627\u0644\u062A\u0646\u0641\u064A\u0630",
  "pro.how.3.d": "\u0639\u0644\u0649 \u0645\u0648\u0642\u0639\u0643 \u0648\u0645\u0639 \u0641\u0631\u064A\u0642\u0643\u060C \u062E\u0637\u0648\u0629 \u0628\u062E\u0637\u0648\u0629.",
  "pro.how.4": "\u0642\u0628\u0644 \u0648\u0628\u0639\u062F",
  "pro.how.4.d": "\u0623\u0639\u062F \u0645\u0647\u0645\u0629 \u0635\u062F\u0649 \u0646\u0641\u0633\u0647\u0627: \u062A\u0631\u0649 \u0627\u0644\u062A\u063A\u064A\u064A\u0631 \u0628\u0646\u0641\u0633\u0643.",
  "pro.never": "\u0645\u0627 \u0644\u0627 \u0646\u0641\u0639\u0644\u0647 \u0623\u0628\u062F\u064B\u0627",
  "pro.never.1": "\u0645\u0631\u0627\u062C\u0639\u0627\u062A \u0645\u0632\u064A\u0641\u0629 \u0623\u0648 \u0645\u062F\u0641\u0648\u0639\u0629",
  "pro.never.2": "\u062A\u0639\u062F\u064A\u0644\u0627\u062A \u063A\u064A\u0631 \u0645\u0639\u0644\u0646\u0629 \u0641\u064A \u0648\u064A\u0643\u064A\u0628\u064A\u062F\u064A\u0627 \u0623\u0648 \u0627\u0644\u0645\u0646\u062A\u062F\u064A\u0627\u062A",
  "pro.never.3": "\u0634\u0628\u0643\u0627\u062A \u0631\u0648\u0627\u0628\u0637 \u0623\u0648 \u0623\u062F\u0644\u0629 \u0645\u0632\u0639\u062C\u0629",
  "pro.never.4": "\u0648\u0639\u0648\u062F \u0628\u062A\u0631\u062A\u064A\u0628 \u0623\u0648 \u0628\u0623\u0646 \u064A\u0630\u0643\u0631\u0643 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "audit.remote": "\u0641\u064F\u062D\u0635\u062A \u062F\u0648\u0646 \u0641\u062A\u062D\u0647\u0627. \u064A\u0639\u0645\u0644 \u0627\u0644\u062A\u0638\u0644\u064A\u0644 \u0639\u0644\u0649 \u0627\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629 \u0641\u064A \u062A\u0628\u0648\u064A\u0628\u0643.",
  "rw.tools": "\u0623\u0639\u062F \u0627\u0644\u0635\u064A\u0627\u063A\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0639\u0644\u0649 \u0627\u0644\u062C\u0647\u0627\u0632",
  "rw.tools.d": "\u0646\u0633\u062E \u0623\u0641\u0636\u0644 \u0645\u0646 \u0627\u0641\u062A\u062A\u0627\u062D\u064A\u062A\u0643 \u0648\u062C\u0645\u0644\u0643\u060C \u062A\u064F\u0643\u062A\u0628 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062D\u0627\u0633\u0648\u0628. \u0627\u0644\u062D\u0642\u0627\u0626\u0642 \u0627\u0644\u0646\u0627\u0642\u0635\u0629 \u062A\u0635\u0628\u062D [\u0641\u0631\u0627\u063A\u0627\u062A].",
  "site.checkpage": "\u0627\u0641\u062D\u0635",
  "audit.backopen": "\u0635\u0641\u062D\u0629 \u0627\u0644\u062A\u0628\u0648\u064A\u0628",
  "ab.title": "\u0639\u0646 \u062c\u0647\u062a\u0643",
  "ab.edit.d": "\u064A\u0643\u062A\u0628 \u0635\u062F\u0649 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0646\u0637\u0644\u0627\u0642\u064B\u0627 \u0645\u0646 \u0647\u0630\u0627. \u0643\u0646 \u062F\u0642\u064A\u0642\u064B\u0627: \u0639\u0644\u064A\u0647 \u062A\u062A\u0648\u0642\u0641 \u0623\u0647\u0645\u064A\u0629 \u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631.",
  "ab.name": "\u0627\u0644\u0627\u0633\u0645",
  "ab.cat": "\u0645\u0627 \u0623\u0646\u062a\u060c \u0628\u0643\u0644\u0645\u0627\u062a\u0643 (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)",
  "ab.cat.ph": "\u0645\u062b\u0627\u0644: \u062c\u0627\u0645\u0639\u0629\u060c \u0645\u0648\u0642\u0639 \u062a\u0630\u0643\u0627\u0631\u064a\u060c \u0648\u0643\u0627\u0644\u0629 SEO",
  "ab.svc": "\u0627\u0644\u0639\u0631\u0648\u0636 \u0623\u0648 \u0627\u0644\u0645\u0648\u0627\u0636\u064a\u0639 (\u0645\u0641\u0635\u0648\u0644\u0629 \u0628\u0641\u0648\u0627\u0635\u0644)",
  "ab.svc.ph": "\u0645\u062b\u0627\u0644: \u0639\u0644\u0648\u0645 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a\u060c \u062c\u0648\u0644\u0627\u062a \u0625\u0631\u0634\u0627\u062f\u064a\u0629\u060c SEO",
  "ab.aud": "\u0639\u0645\u0644\u0627\u0624\u0643",
  "ab.aud.ph": "\u0645\u062B\u0627\u0644: \u0627\u0644\u0645\u062A\u0627\u062C\u0631 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0629\u060C \u0627\u0644\u0639\u0627\u0626\u0644\u0627\u062A\u060C \u0627\u0644\u0634\u0631\u0643\u0627\u062A \u0627\u0644\u0646\u0627\u0634\u0626\u0629",
  "ab.mkt": "\u0627\u0644\u0645\u062f\u064a\u0646\u0629 \u0623\u0648 \u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0623\u0648 \u0627\u0644\u0628\u0644\u062f (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)",
  "ab.mkt.ph": "\u0645\u062b\u0627\u0644: \u0645\u064a\u0648\u0646\u062e\u060c \u0628\u0627\u0641\u0627\u0631\u064a\u0627\u060c \u0623\u0644\u0645\u0627\u0646\u064a\u0627",
  "ab.save": "\u0627\u062D\u0641\u0638 \u0648\u062D\u062F\u0651\u062B \u0627\u0644\u0623\u0633\u0626\u0644\u0629",
  "ab.cancel": "\u0625\u0644\u063A\u0627\u0621",
  "ab.confirmed": "\u0645\u0624\u0643\u062F",
  "ab.change": "\u062A\u063A\u064A\u064A\u0631",
  "ab.q": "\u0647\u0644 \u0647\u0630\u0627 \u0635\u062D\u064A\u062D\u061F \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u062A\u0639\u062A\u0645\u062F \u0639\u0644\u064A\u0647.",
  "ab.yes": "\u0646\u0639\u0645\u060C \u0635\u062D\u064A\u062D",
  "ab.fix": "\u0635\u062D\u0651\u062D\u0647",
  "ab.kind": "\u0627\u0644\u0642\u0637\u0627\u0639",
  "ab.aka": "\u064a\u064f\u0639\u0631\u0641 \u0623\u064a\u0636\u064b\u0627 \u0628\u0627\u0633\u0645",
  "ab.saved": "\u062D\u064F\u0641\u0638. \u062D\u064F\u062F\u0651\u062B\u062A \u0627\u0644\u0623\u0633\u0626\u0644\u0629.",
  "ap.pick": "\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0645\u0631\u0627\u062F \u0627\u062E\u062A\u0628\u0627\u0631\u0647\u0627",
  "ap.engines": "\u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0627\u062A",
  "ap.start": "\u0634\u063A\u0651\u0644 \u0627\u0644\u0637\u064A\u0627\u0631 \u0627\u0644\u0622\u0644\u064A: {n} \u0627\u062E\u062A\u0628\u0627\u0631\u0627\u062A",
  "ap.how1": "\u064A\u0641\u062A\u062D \u0635\u062F\u0649 \u0643\u0644 \u0645\u0633\u0627\u0639\u062F \u0641\u064A \u0645\u062A\u0635\u0641\u062D\u0643 \u0648\u0627\u0644\u0633\u0624\u0627\u0644 \u0645\u0643\u062A\u0648\u0628.",
  "ap.how1.copy": "\u064A\u0646\u0633\u062E \u0635\u062F\u0649 \u0643\u0644 \u0633\u0624\u0627\u0644 \u0648\u062A\u0644\u0635\u0642\u0647 \u0623\u0646\u062A \u0641\u064A \u0627\u0644\u0645\u0633\u0627\u0639\u062F.",
  "ap.how2": "\u0639\u0646\u062F\u0645\u0627 \u062A\u062C\u0647\u0632 \u0627\u0644\u0625\u062C\u0627\u0628\u0629\u060C \u0627\u0646\u0642\u0631 \u0632\u0631 \u0627\u0644\u0646\u0633\u062E \u0641\u064A \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u062B\u0645 \xAB\u0627\u0644\u0635\u0642 \u0648\u0627\u0642\u0631\u0623\xBB (\u0623\u0648 \u062D\u062F\u0651\u062F\u0647\u0627 \u0648\u0627\u0636\u063A\u0637 Alt+Shift+A).",
  "ap.how3": "\u064A\u0642\u064A\u0651\u0645\u0647\u0627 \u0635\u062F\u0649 \u0648\u064A\u0641\u062A\u062D \u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631 \u0627\u0644\u062A\u0627\u0644\u064A \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627.",
  "ap.title": "\u0627\u0644\u0637\u064A\u0627\u0631 \u0627\u0644\u0622\u0644\u064A",
  "ap.count": "\u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631 {n} \u0645\u0646 {of}",
  "ap.wait": "\u0641\u064F\u062A\u062D {engine} \u0645\u0639 \u0627\u0644\u0633\u0624\u0627\u0644. \u0627\u0646\u062A\u0638\u0631 \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0643\u0627\u0645\u0644\u0629.",
  "ap.wait.paste": "\u0646\u064F\u0633\u062E \u0627\u0644\u0633\u0624\u0627\u0644: \u0627\u0644\u0635\u0642\u0647 \u0641\u064A {engine} (Ctrl+V) \u062B\u0645 \u0627\u0646\u062A\u0638\u0631 \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0643\u0627\u0645\u0644\u0629.",
  "ap.paste": "\u0627\u0644\u0635\u0642 \u0648\u0627\u0642\u0631\u0623 \u0627\u0644\u0625\u062C\u0627\u0628\u0629",
  "ap.or": "\u0623\u0648 \u062D\u062F\u0651\u062F \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0648\u0627\u0636\u063A\u0637 Alt+Shift+A\u060C \u0623\u0648 \u0627\u0646\u0642\u0631 \u0628\u0627\u0644\u0632\u0631 \u0627\u0644\u0623\u064A\u0645\u0646 \xAB\u0623\u0631\u0633\u0644 \u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0647\u0630\u0647 \u0625\u0644\u0649 \u0635\u062F\u0649\xBB",
  "ap.manual": "\u0627\u0644\u0635\u0642\u0647\u0627 \u0647\u0646\u0627 \u0628\u062F\u0644\u064B\u0627 \u0645\u0646 \u0630\u0644\u0643",
  "ap.reopen": "\u0627\u0641\u062A\u062D \u0645\u062C\u062F\u062F\u064B\u0627",
  "ap.skip": "\u062A\u062E\u0637\u064E\u0651",
  "ap.stop": "\u0623\u0648\u0642\u0641",
  "ap.done": "\u0627\u0646\u062A\u0647\u0649 \u0627\u0644\u0637\u064A\u0627\u0631 \u0627\u0644\u0622\u0644\u064A: {n} \u0627\u062E\u062A\u0628\u0627\u0631\u0627\u062A. \u0627\u0644\u0646\u062A\u0627\u0626\u062C \u0623\u062F\u0646\u0627\u0647.",
  "ap.empty": "\u0627\u0644\u062D\u0627\u0641\u0638\u0629 \u0641\u0627\u0631\u063A\u0629: \u0627\u0646\u0633\u062E \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0623\u0648\u0644\u064B\u0627.",
  "ap.noclip": "\u062A\u0639\u0630\u0651\u0631 \u0639\u0644\u0649 \u0635\u062F\u0649 \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u062D\u0627\u0641\u0638\u0629. \u0627\u0644\u0635\u0642 \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0641\u064A \u0627\u0644\u0645\u0631\u0628\u0639 (Ctrl+V).",
  "ap.select": "\u062D\u062F\u0651\u062F \u0646\u0635 \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0623\u0648\u0644\u064B\u0627 \u062B\u0645 \u0627\u0636\u063A\u0637 Alt+Shift+A.",
  "ap.fromagent": "\u0627\u062E\u062A\u0628\u0631 \u0647\u0630\u0647 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0641\u064A \u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
  "lab.lead2": "\u0627\u0639\u0631\u0641 \u0647\u0644 \u064A\u0631\u0634\u0651\u062D\u0643 ChatGPT \u0648Gemini \u0648Perplexity \u0648\u063A\u064A\u0631\u0647\u0627 \u0641\u064A \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u062A\u064A \u064A\u0637\u0631\u062D\u0647\u0627 \u0639\u0645\u0644\u0627\u0624\u0643 \u0641\u0639\u0644\u064B\u0627.",
  "lab.pro2": "\u062A\u0631\u064A\u062F \u0623\u0646 \u064A\u062C\u0631\u064A \u0647\u0630\u0627 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627 \u0643\u0644 \u0623\u0633\u0628\u0648\u0639 \u0639\u0628\u0631 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0645\u0639 \u062A\u0642\u0631\u064A\u0631 \u0634\u0647\u0631\u064A\u061F \u0647\u0630\u0647 \u062E\u062F\u0645\u0629 \u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0644\u062F\u064A\u0646\u0627.",
  "xp.autopilot": "\u0627\u0644\u0637\u064A\u0627\u0631 \u0627\u0644\u0622\u0644\u064A",
  "trust.perm.clipboardRead": "\u0627\u062E\u062A\u064A\u0627\u0631\u064A\u060C \u064A\u064F\u0637\u0644\u0628 \u0641\u0642\u0637 \u0625\u0630\u0627 \u0627\u0633\u062A\u062E\u062F\u0645\u062A \xAB\u0627\u0644\u0635\u0642 \u0648\u0627\u0642\u0631\u0623\xBB.",
  "ai.dl.run": "\u062C\u0627\u0631\u064D \u062A\u062C\u0647\u064A\u0632 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0645\u062F\u0645\u062C \u0641\u064A Chrome (\u062A\u0646\u0632\u064A\u0644 \u0644\u0645\u0631\u0629 \u0648\u0627\u062D\u062F\u0629 \u0641\u064A \u0627\u0644\u062E\u0644\u0641\u064A\u0629): {p}%",
  "ai.dl.done": "\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0645\u062F\u0645\u062C \u0641\u064A Chrome \u062C\u0627\u0647\u0632 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062D\u0627\u0633\u0648\u0628."
};

// apps/extension/src/i18n/de.ts
var de_default2 = {
  "nav.agent": "Agent",
  "nav.audit": "Audit",
  "nav.ask": "KI fragen",
  "nav.academy": "Akademie",
  "nav.pro": "Pro",
  "mail.sent": "(Gesendet aus Sada)",
  "meter.idle": "Echo-Messer: noch nicht gemessen",
  "btn.allowAll": "Sada auf allen Websites erlauben (dann liest Sada Seiten ohne Klick auf das Symbol)",
  "agent.title": "Den Agenten durch {host} schicken",
  "agent.title.none": "\xD6ffnen Sie Ihre Website und schicken Sie dann den Agenten los",
  "agent.lead": "Acht Schritte, etwa eine Minute. Sada liest Ihre Website wie KI-Assistenten, sagt voraus, was Kunden sie fragen, findet fehlende Antworten und baut Ihr Fix-Paket.",
  "agent.run": "Mission starten",
  "agent.working": "L\xE4uft\u2026",
  "agent.again": "Erneut starten",
  "agent.free": "L\xE4uft auf diesem Computer. Kostenlos, ohne Konto, ohne API-Schl\xFCssel.",
  "agent.when": "Letzte Mission: {date}",
  "agent.running": "{host} wird gelesen\u2026",
  "agent.score.lead": "So h\xF6ren KI-Assistenten {host} heute.",
  "agent.how": "Was der Agent macht",
  "ms.read.t": "Seite lesen",
  "ms.read.d": "Genau das, was ein Crawler und ein Browser bekommen.",
  "ms.access.t": "Zugang f\xFCr KI-Crawler pr\xFCfen",
  "ms.access.d": "Welche KI-Such-Bots Sie lesen d\xFCrfen und was sie blockiert.",
  "ms.entity.t": "Das Unternehmen verstehen",
  "ms.entity.d": "Name, Art und Ort, wie Maschinen sie sehen.",
  "ms.scan.t": "Website lesen",
  "ms.scan.d": "Bis zu 30 Seiten aus Ihren Bereichen, aus der Sitemap.",
  "ms.questions.t": "Kundenfragen vorhersagen",
  "ms.questions.d": "Was Menschen eine KI fragen, bevor sie ein Unternehmen wie Ihres w\xE4hlen.",
  "ms.coverage.t": "Fehlende Antworten finden",
  "ms.coverage.d": "Welche Fragen Ihre Seiten beantworten, Passage f\xFCr Passage.",
  "ms.drive.t": "Agenten-Testfahrt",
  "ms.drive.d": "F\xE4nde ein KI-Agent Preise, \xD6ffnungszeiten, Kontakt, und k\xF6nnte er buchen?",
  "ms.pack.t": "Plan und Fix-Paket erstellen",
  "ms.pack.d": "Priorisierte Schritte und fertige Dateien zum Herunterladen.",
  "ms.read.run": "Seite wird gelesen\u2026",
  "ms.read.ok": "Score {score}/100 \xB7 {words} W\xF6rter",
  "ms.read.perm": "Klicken Sie auf Ihrer Seite auf das Sada-Symbol in der Symbolleiste, damit Sada sie lesen darf.",
  "ms.read.fail": "Diese Seite kann nicht gelesen werden. \xD6ffnen Sie eine normale Webseite.",
  "ms.access.run": "robots.txt und Signale werden gepr\xFCft\u2026",
  "ms.access.ok": "{n} von {of} KI-Such-Bots k\xF6nnen diese Seite lesen",
  "ms.access.blocked": "KI-Suche ist auf dieser Seite gesperrt",
  "ms.entity.run": "Namen und Markup werden gelesen\u2026",
  "ms.entity.ok": "{name} \xB7 {cat} \xB7 {place}",
  "ms.entity.noplace": "Ort nicht angegeben",
  "ms.scan.run": "Seiten aus der Sitemap werden gelesen\u2026",
  "ms.scan.ok": "{n} Seiten gelesen \xB7 Durchschnitt {avg}/100",
  "ms.scan.ok.1": "1 Seite gelesen \u00b7 {avg}/100",
  "ms.scan.fail": "Andere Seiten waren nicht lesbar; weiter mit dieser",
  "ms.q.run": "Fragen werden vorhergesagt\u2026",
  "ms.q.ok": "{n} Fragen",
  "ms.q.ok.ai": "{n} Fragen, {ai} von der KI auf dem Ger\xE4t",
  "ms.cov.run": "{n} Passagen werden durchsucht\u2026",
  "ms.cov.ok": "{a} beantwortet \xB7 {p} teilweise \xB7 {m} fehlen",
  "ms.drive.run": "Agenten-Aufgaben werden getestet\u2026",
  "ms.drive.ok": "{n} von {of} Aufgaben klar",
  "ms.pack.run": "Plan wird geschrieben\u2026",
  "ms.pack.draft": "Antworten werden auf diesem Computer entworfen ({n}/{of})\u2026",
  "ms.pack.ok": "{n} Dateien bereit",
  "ms.err": "Dieser Schritt wurde nicht abgeschlossen.",
  "stat.answered": "Fragen beantwortet",
  "stat.pages": "Seiten gelesen, \xD8 {avg}",
  "stat.drive": "Agenten-Aufgaben klar",
  "stat.named": "der Antworten nennen Sie",
  "stat.untested": "in KI-Assistenten testen",
  "agent.plan": "Ihr Plan",
  "agent.cov": "Fragen, die Kunden einer KI stellen",
  "agent.cov.n": "{a} von {n} beantwortet",
  "agent.cov.d": "Eine KI kann nur zitieren, was auf Ihren Seiten steht. Schicken Sie eine Frage an die Assistenten und sehen Sie, wen sie nennen.",
  "agent.pro": "{n} davon sind Projekte",
  "agent.pro.d": "Website-weite Korrekturen, Sprachversionen und Erw\xE4hnungen brauchen Zeit, um gut zu werden. Wir machen das gern mit Ihnen.",
  "agent.pro.subj": "Sada-Mission",
  "agent.log": "Missionsprotokoll",
  "cov.answered": "Beantwortet",
  "cov.partial": "Teilweise",
  "cov.missing": "Fehlt",
  "cov.test": "Diese Frage in KI-Assistenten testen",
  "q.branded": "\xFCber Sie",
  "q.open": "offene Frage",
  "q.byai": "von der KI auf dem Ger\xE4t vorgeschlagen",
  "plan.impact": "Wirkung",
  "effort.1": "Schnell",
  "effort.2": "Ein paar Stunden",
  "effort.3": "Projekt",
  "who.you": "Selbst machbar",
  "who.pro": "Besser mit Fachleuten",
  "go.audit": "\xD6ffnen",
  "go.ask": "Testen",
  "go.academy": "Lernen",
  "go.pack": "Fix-Paket",
  "plan.unblock": "KI-Suche freigeben",
  "plan.unblock.d": "Suchmaschinen oder KI-Such-Bots sollen Ihre Seiten nicht nutzen. Solange das so ist, z\xE4hlt nichts anderes. Vorsicht: Die falsche Zeile kann auch Google sperren.",
  "plan.gaps": "{n} offene Fragen beantworten",
  "plan.gaps.1": "Die offene Frage beantworten",
  "plan.gaps.d": "Offene Fragen, bei denen die KI ein Unternehmen ausw\xE4hlt: {u}. Erg\xE4nzen Sie je eine klare Passage; Entw\xFCrfe im Fix-Paket.",
  "plan.entity": "Maschinen sagen, wer Sie sind",
  "plan.entity.d": "Erg\xE4nzen Sie Organization- oder LocalBusiness-Markup mit Ihren offiziellen Profilen. Es liegt fertig im Fix-Paket.",
  "plan.answer-first": "Die Seite mit der Antwort beginnen",
  "plan.answer-first.d": "Schreiben Sie den ersten Absatz neu: was es ist, f\xFCr wen, wo, und eine wichtige Angabe.",
  "plan.quotable": "Wichtige S\xE4tze zitierbar machen",
  "plan.quotable.d": "Subjekt nennen, eine konkrete Angabe pro Satz, Zahlen mit Quelle.",
  "plan.site": "\u201E{check}\u201C auf der ganzen Website beheben",
  "plan.site.d": "{n} von {pages} Seiten haben dieses Problem. Eine Korrektur in der Seitenvorlage l\xF6st es \xFCberall, meist als Projekt.",
  "plan.agent": "Die Seite f\xFCr KI-Agenten nutzbar machen",
  "plan.agent.d": "Hier scheitern Agenten-Aufgaben: {list}. Feldbeschriftungen, Button-Namen und Fakten als Text l\xF6sen das meiste.",
  "plan.lang": "Sprachversionen korrigieren",
  "plan.lang.d": "Falsche Sprachsignale schicken Menschen und KI-Antworten zur falschen Version.",
  "plan.offsite": "Dort erw\xE4hnt werden, wo die KI hinschaut",
  "plan.offsite.d": "Stellen Sie Ihre Fragen unter \u201EKI fragen\u201C: Die zitierten Websites sind Ihre PR-Liste. Erw\xE4hnungen dort z\xE4hlen mehr als Links.",
  "plan.measure": "KI-Traffic und Sichtbarkeit messen",
  "plan.measure.d": "Legen Sie in Google Analytics einen KI-Channel an und pr\xFCfen Sie monatlich die KI-Berichte von Search Console und Bing. Die Schritte stehen im Fix-Paket.",
  "plan.fresh": "Aktualisierungsdatum zeigen",
  "plan.fresh.d": "Ein sichtbares Datum und dateModified machen Aktualit\xE4t klar.",
  "pack.title": "Fix-Paket",
  "pack.d": "{n} Dateien: Ihr Plan, fehlende Antworten mit Entw\xFCrfen, fertiger Code, Testfragen und eine Anleitung zum Messen.",
  "pack.dl": "Fix-Paket herunterladen (.zip)",
  "pack.stale": "Starten Sie die Mission erneut, um das Fix-Paket neu zu erstellen.",
  "pack.impact": "Wirkung",
  "pack.effort": "Aufwand",
  "pack.plan.h": "Aktionsplan f\xFCr {site}",
  "pack.plan.intro": "Erstellt von Sada am {date}. Gr\xF6\xDFte Wirkung bei kleinstem Aufwand zuerst.",
  "pack.cta": "Lieber machen lassen? Buchen Sie ein Gespr\xE4ch unter https://getayka.com/book/ oder schreiben Sie an hello@getayka.com f\xFCr ein pers\xF6nliches Angebot.",
  "pack.gaps.h": "Fehlende Antworten",
  "pack.gaps.intro": "Fragen, die Kunden KI-Assistenten stellen und die Ihre Website noch nicht klar beantwortet. Erg\xE4nzen Sie pro Frage eine kurze Passage auf der passendsten Seite.",
  "pack.fit": "Passung {fit}/100",
  "pack.draft": "Entwurf",
  "pack.found": "N\xE4chstliegende Passage auf Ihrer Website",
  "pack.draft.tpl": "Pr\xFCfen Sie jede Angabe und setzen Sie die Passage auf die passendste Seite.",
  "pack.tpl.town": "Ort",
  "pack.tpl.discover": "{name} ist eine Adresse f\xFCr {cat} in {place}, ideal f\xFCr [f\xFCr wen]. [Eine Angabe, die nur Sie machen k\xF6nnen: Zahl, Aussicht, Entfernung, Spezialit\xE4t.] [Wie man bucht oder Kontakt aufnimmt.]",
  "pack.tpl.compare": "Bei der Wahl von {cat} in {place} vergleichen Sie [Kriterium 1], [Kriterium 2] und [Kriterium 3]. {name} bietet [Ihre Antwort zu jedem, mit Zahlen].",
  "pack.tpl.price": "Bei {name} kostet [Leistung] [Preis] [pro Nacht, pro Projekt, ab\u2026], [was enthalten ist]. [Wie man ein genaues Angebot bekommt oder bucht.]",
  "pack.tpl.hours": "{name} hat [Tage] von [Uhrzeit] bis [Uhrzeit] ge\xF6ffnet. [Ausnahmen: Feiertage, Saison.]",
  "pack.tpl.book": "So buchen Sie bei {name}: [wie: Formular, Telefon, E-Mail], [wie lange im Voraus], [was n\xF6tig ist]. [Zahlung und Storno in einem Satz.]",
  "pack.tpl.where": "{name} liegt [Adresse] in {place}, [Entfernung] von [Orientierungspunkt, Bahnhof oder Flughafen]. [Anfahrt und Parken.]",
  "pack.tpl.reviews": "Kunden bewerten {name} mit [Bewertung] auf [Plattform] ([Anzahl] Bewertungen). Oft genannt: [zwei konkrete Punkte]. [Link zu den Bewertungen.]",
  "pack.tpl.contact": "Erreichen Sie {name} telefonisch unter [Nummer] oder per E-Mail an [Adresse]. [Wann und wie schnell Sie antworten.]",
  "pack.tpl.trust": "Kunden bewerten {name} mit [Bewertung] auf [Plattform] ([Anzahl] Bewertungen). Oft genannt: [zwei konkrete Punkte].",
  "pack.tpl.practical": "{name}: [die praktische Antwort in einem Satz]. [Ein Detail, das eine R\xFCckfrage erspart.]",
  "pack.tpl.service": "{name} bietet [Leistung] in {place} f\xFCr [wen]. [Was enthalten ist, mit Zahlen.] [Wie man startet.]",
  "pack.tpl.brand": "{name} ist ein Unternehmen ({cat}) in {place}, das [was es tut] f\xFCr [wen]. [Seit wann, wie viele, ein Beleg.]",
  "pack.gaps.none": "Ihre Website beantwortet alle vorhergesagten Fragen. Testen Sie sie als N\xE4chstes in KI-Assistenten.",
  "pack.q.h": "Fragen zum Testen in KI-Assistenten",
  "pack.q.intro": "Jeder Link \xF6ffnet den Assistenten mit der Frage (bei Gemini einf\xFCgen). Stellen Sie jede Frage mehrmals: Antworten schwanken.",
  "pack.aidraft": "KI-Entwurf: jede Angabe pr\xFCfen",
  "pack.note.ai": "Mit [KI-Entwurf] markierte Texte hat die eingebaute KI von Chrome auf Ihrem Computer aus Ihren eigenen Seiten geschrieben. Pr\xFCfen Sie jede Angabe vor der Ver\xF6ffentlichung.",
  "pack.note.tpl": "Keine KI auf dem Ger\xE4t verf\xFCgbar: F\xFCr jede L\xFCcke gibt es eine Schreibvorlage statt eines Entwurfs.",
  "pack.measure": "# KI-Traffic und Sichtbarkeit messen (kostenlos)\n\n## 1. Google Analytics 4: ein Channel \u201EKI-Assistenten\u201C\nVerwaltung \u2192 Datenanzeige \u2192 Channelgruppen \u2192 Neue Channelgruppe erstellen. F\xFCgen Sie einen Channel \u201EKI-Assistenten\u201C mit der Bedingung *Sitzungsquelle entspricht regul\xE4rem Ausdruck* hinzu:\n\n```\n{regex}\n```\n\nSchieben Sie ihn \xFCber \u201EReferral\u201C und speichern Sie. ChatGPT h\xE4ngt oft `utm_source=chatgpt.com` an Links an, manche KI-Klicks kommen aber ohne Referrer und z\xE4hlen als Direkt: Die Zahl ist eine Untergrenze.\n\n## 2. Google Search Console\nLeistung \u2192 Generative KI: Impressionen Ihrer Seiten in AI Overviews und AI Mode (seit Juni 2026). Monatlich pr\xFCfen.\n\n## 3. Bing Webmaster Tools\nAI Performance: wie oft Ihre Seiten in Copilot und Bings KI-Zusammenfassungen zitiert werden. Kostenlos; Website zuerst best\xE4tigen.\n\n## 4. Eigene Antworttests\nNutzen Sie w\xF6chentlich Sadas Bereich \u201EKI fragen\u201C mit denselben Fragen, in mehreren Assistenten. Verfolgen Sie den Anteil der Antworten, die Sie nennen, nicht die Position.\n",
  "pack.readme": "# Sada-Fix-Paket f\xFCr {site}\n\nErstellt von Sada am {date}, auf Ihrem Computer. {n} Dateien.\n\n1. **1-action-plan.md**: was zu tun ist, der Reihe nach.\n2. **2-missing-answers.md**: Fragen an die KI, die Ihre Website noch nicht beantwortet, mit Entw\xFCrfen. Pr\xFCfen Sie jede Angabe vor der Ver\xF6ffentlichung; KI-Entw\xFCrfe sind gekennzeichnet.\n3. **3-code/**: fertiger Code aus Ihrer Seite (robots.txt, strukturierte Daten, Meta-Tags). Was Sada nicht wissen konnte, ist mit TODO markiert.\n4. **4-questions-to-test.md**: Links, die jeden Assistenten mit der Frage \xF6ffnen.\n5. **5-measure-ai-traffic.md**: kostenloses Messen mit Google Analytics, Search Console und Bing.\n6. **data/**: die Zahlen dahinter (CSV).\n\nLieber machen lassen? Buchen Sie ein Gespr\xE4ch unter https://getayka.com/book/ oder schreiben Sie an hello@getayka.com f\xFCr ein pers\xF6nliches Angebot.\n",
  "intent.discover": "Optionen finden",
  "intent.compare": "vergleichen",
  "intent.price": "Preis",
  "intent.trust": "Vertrauen",
  "intent.practical": "praktisch",
  "intent.service": "Leistung",
  "intent.brand": "\xFCber Sie",
  "csv.q": "Frage",
  "csv.type": "Art",
  "csv.status": "Status",
  "csv.fit": "Passung",
  "csv.page": "Beste Seite",
  "csv.task": "Agenten-Aufgabe",
  "csv.score": "Score",
  "csv.issues": "Probleme",
  "audit.page": "Diese Seite",
  "audit.site": "Ganze Website",
  "audit.rival": "Mitbewerber",
  "audit.empty": "Diese Seite pr\xFCfen",
  "audit.empty.d": "\xD6ffnen Sie eine Seite Ihrer Website und pr\xFCfen Sie sie. Sada liest sie auf Ihrem Computer.",
  "heat.short": "Markieren",
  "export.short": "Bericht",
  "heat.good": "so zitierbar",
  "heat.almost": "fast",
  "rw.d2": "Zwei Umformulierungen von Chromes eingebauter KI, auf diesem Computer. Fehlende Fakten werden zu [Platzhaltern].",
  "ai.label": "KI-erstellt: vor dem Ver\xF6ffentlichen pr\xFCfen.",
  "ai.none": "Chromes eingebaute KI ist auf diesem Computer nicht verf\xFCgbar (sie braucht ein aktuelles Chrome auf einem leistungsf\xE4higen Computer). Alles andere in Sada funktioniert ohne sie.",
  "rep.title": "Bericht zur KI-Sichtbarkeit",
  "drive.title": "Agenten-Testfahrt",
  "drive.d": "K\xF6nnte ein KI-Agent auf dieser Seite eine Kundenaufgabe erledigen, ohne zu raten? Aus der Seite gelesen; nichts wird geklickt oder gesendet.",
  "drive.webmcp.how": "So melden Sie Ihr Hauptformular als Werkzeug an",
  "drive.webmcp.ex": "Zimmer buchen: Daten, G\xE4ste, Kontakt",
  "drive.price": "Preis finden",
  "drive.price.pass": "Preise stehen in den strukturierten Daten ({n}).",
  "drive.price.warn": "Preise stehen im Text, aber nicht in den strukturierten Daten: Agenten k\xF6nnen sie falsch lesen.",
  "drive.price.info": "Keine Preise auf dieser Seite. Agenten verweisen auf eine Anfrage bei Ihnen: in Ordnung bei Angeboten pro Projekt, aber sagen Sie klar, wie man eines bekommt.",
  "drive.hours": "\xD6ffnungszeiten finden",
  "drive.hours.pass": "\xD6ffnungszeiten stehen in den strukturierten Daten.",
  "drive.hours.warn": "\xD6ffnungszeiten nur im Text; openingHours erg\xE4nzen.",
  "drive.hours.fail": "Keine \xD6ffnungszeiten f\xFCr ein lokales Unternehmen gefunden.",
  "drive.hours.info": "Keine \xD6ffnungszeiten (f\xFCr reine Online-Angebote nicht n\xF6tig).",
  "drive.contact": "Sie kontaktieren",
  "drive.contact.pass": "Mehrere lesbare Wege, Sie zu erreichen (Links und Markup).",
  "drive.contact.warn": "Nur ein lesbarer Kontaktweg. Erg\xE4nzen Sie einen Anruf- oder E-Mail-Link und Markup.",
  "drive.contact.fail": "Kein lesbarer Telefon- oder E-Mail-Link: Agenten erreichen Sie nicht.",
  "drive.action": "Buchen, kaufen oder Angebot anfragen",
  "drive.action.pass": "Eine klare Aktion ({n}) mit passendem Markup.",
  "drive.action.warn": "{n} Aktions-Links gefunden, kein Aktions-Markup. F\xFCr die meisten Websites ausreichend.",
  "drive.action.warn.1": "1 Aktions-Link gefunden, kein Aktions-Markup. F\u00fcr die meisten Websites ausreichend.",
  "drive.action.fail": "Keine klare Buchungs-, Kauf- oder Angebotsaktion gefunden.",
  "drive.forms": "Formular ausf\xFCllen",
  "drive.forms.pass": "{fields} Felder, alle beschriftet, mit Autofill-Hinweisen.",
  "drive.forms.warn": "Alle Felder beschriftet; erg\xE4nzen Sie autocomplete (Name, E-Mail, Telefon).",
  "drive.forms.fail": "{unlabeled} von {fields} Feldern ohne Beschriftung: Agenten m\xFCssen raten.",
  "drive.forms.info": "Kein Formular auf dieser Seite.",
  "drive.names": "Den richtigen Button dr\xFCcken",
  "drive.names.pass": "Jeder Button und Link hat einen Namen.",
  "drive.names.warn": "{n} Buttons oder Links ohne Namen (nur Icon).",
  "drive.names.warn.1": "1 Button oder Link ohne Namen (nur Icon).",
  "drive.names.fail": "{n} Buttons oder Links ohne Namen: Agenten wissen nicht, was sie tun.",
  "drive.names.fail.1": "1 Button oder Link ohne Namen: Agenten wissen nicht, was er tut.",
  "drive.webmcp": "Werkzeuge der Website nutzen (WebMCP)",
  "drive.webmcp.pass": "{n} Formular(e) als Agenten-Werkzeug angemeldet.",
  "drive.webmcp.info": "Noch keine WebMCP-Werkzeuge. Optional und fr\xFCh: Ein paar Attribute am Hauptformular gen\xFCgen.",
  "drive.commerce": "\xDCber einen Agenten einkaufen (UCP)",
  "drive.commerce.pass": "Diese Website ver\xF6ffentlicht /.well-known/ucp.",
  "drive.commerce.info": "Keine Datei /.well-known/ucp. Nur f\xFCr Onlineshops relevant.",
  "dst.pass": "Klar",
  "dst.warn": "Unklar",
  "dst.fail": "Blockiert",
  "dst.info": "Hinweis",
  "lab.title": "Sichtbarkeitslabor",
  "lab.lead": "Stellen Sie den echten Assistenten die Fragen Ihrer Kunden. Sada \xF6ffnet jeden mit der Frage, Sie bringen die Antwort zur\xFCck, und Sada f\xFChrt Buch.",
  "lab.brand": "Name Ihres Unternehmens",
  "lab.all": "Alle {n} Fragen zeigen",
  "lab.fewer": "Weniger zeigen",
  "lab.qs": "Fragen",
  "lab.addq": "Eigene Frage hinzuf\xFCgen\u2026",
  "lab.add": "Hinzuf\xFCgen",
  "lab.step1": "1. Fragen",
  "lab.how": "\xD6ffnet sich in Ihrem Browser mit Ihrem eigenen Konto. Die Frage wird auch kopiert, falls Sie sie einf\xFCgen m\xFCssen. Sada liest diese Seiten nie.",
  "lab.step2": "2. Antwort zur\xFCckbringen",
  "lab.from": "Antwort von",
  "lab.paste": "Antwort hier einf\xFCgen",
  "lab.read": "Antwort auswerten",
  "lab.menu": "Schneller: Antwort auf der Seite des Assistenten markieren, Rechtsklick und \u201EDiese KI-Antwort an Sada senden\u201C w\xE4hlen.",
  "lab.open": "Fragen",
  "lab.paste.open": "Kopieren und \xF6ffnen",
  "lab.rank": "Genannt, Nr. {n}",
  "lab.named": "Genannt",
  "lab.notnamed": "Nicht genannt",
  "lab.opened": "{engine} mit Ihrer Frage ge\xF6ffnet.",
  "lab.opened.paste": "Frage kopiert. In {engine} einf\xFCgen (Strg+V).",
  "lab.short": "F\xFCgen Sie zuerst die ganze Antwort ein.",
  "lab.got": "Antwort von {engine} erhalten.",
  "lab.v.rank": "{brand} wird genannt: Nr. {n} von {of}.",
  "lab.v.named": "{brand} wird genannt.",
  "lab.v.not": "{brand} wird in dieser Antwort nicht genannt.",
  "lab.v.facts": "Pr\xFCfen Sie, ob diese Angaben stimmen.",
  "lab.v.others": "Stattdessen oder daneben genannt:",
  "lab.v.src": "Websites, auf die sich die Antwort st\xFCtzt:",
  "lab.board": "Punktestand",
  "lab.share": "{n} von {of} Antworten nennen Sie",
  "lab.comp": "Am h\xE4ufigsten genannt",
  "lab.src": "Quellen der KI",
  "lab.src.d": "Ihre Digital-PR-Liste: Verdienen Sie sich eine Erw\xE4hnung auf diesen Websites.",
  "lab.src.copy": "Liste kopieren",
  "lab.honest": "Antworten \xE4ndern sich von Mal zu Mal. Stellen Sie jede Frage mehrmals: Entscheidend ist der Anteil der Antworten, die Sie nennen.",
  "lab.empty": "Pr\xFCfen Sie zuerst eine Seite",
  "lab.empty.d": "Sada sagt die Fragen Ihrer Kunden aus Ihrer Website voraus.",
  "lab.pro": "W\xF6chentliches Tracking \xFCber alle Assistenten mit Monatsbericht?",
  "lab.pro.subj": "KI-Sichtbarkeits-Tracking",
  "sim.title": "Kurzlekt\xFCre durch die KI auf dem Ger\xE4t",
  "sim.d": "Wie w\xFCrde eine KI diese Seite nur anhand ihres Textes beschreiben? L\xE4uft auf diesem Computer mit Chromes eingebauter KI.",
  "sim.run": "Diese Seite beschreiben",
  "tab.academy": "Akademie",
  "ac.xp": "{xp} XP \xB7 n\xE4chstes Level bei {next}",
  "ac.streak.d": "Tage in Folge mit mindestens einer Aktivit\xE4t",
  "ac.drill": "Tagestraining",
  "ac.drill.d": "5 Fragen, etwa 2 Minuten",
  "ac.drill.done": "Heutiges Training erledigt",
  "ac.drill.end": "Serie: {n} Tage. Bis morgen.",
  "ac.drill.end.1": "Serie: 1 Tag. Bis morgen.",
  "ac.play": "Spielen",
  "ac.tracks": "Lernpfade",
  "ac.done": "{n}/{of} Lektionen",
  "ac.library": "Erkl\xE4rungen zu den Pr\xFCfungen",
  "ac.library.d": "Die 60-Sekunden-Lektion hinter jeder Pr\xFCfung von Sada.",
  "ac.team": "Ihr Team schulen",
  "ac.team.d": "Workshops f\xFCr Marketingteams und Agenturen, auf Englisch, Franz\xF6sisch oder Arabisch.",
  "ac.team.subj": "Akademie f\xFCr mein Team",
  "ac.team.cta": "Teamschulung anfragen",
  "ac.lesson.meta": "3 Karten, ein Quiz und eine Aufgabe",
  "ac.prev": "Zur\xFCck",
  "ac.toquiz": "Quiz",
  "ac.next": "Weiter",
  "ac.try": "Auf Ihrer Website ausprobieren",
  "ac.try.go": "Los",
  "ac.back": "Zur\xFCck zur Akademie",
  "try.mission": "Starten Sie die Agenten-Mission auf Ihrer Website und lesen Sie die vorhergesagten Fragen.",
  "try.audit": "\xD6ffnen Sie Audit und sehen Sie sich diese Pr\xFCfung auf Ihrer Seite an.",
  "try.heat": "Schalten Sie die Markierung auf Ihrer Seite ein und z\xE4hlen Sie die zitierbaren S\xE4tze.",
  "try.bots": "Spielen Sie Erlauben oder sperren und pr\xFCfen Sie dann Ihre robots.txt im Audit.",
  "try.quote": "Spielen Sie Zitierbar oder nicht und formulieren Sie dann einen schwachen Satz um.",
  "try.machine": "\xD6ffnen Sie die Maschinenansicht Ihrer Seite: Welche Fakten fehlen?",
  "try.drive": "Starten Sie die Agenten-Testfahrt auf Ihrer Seite.",
  "try.rewrite": "Nutzen Sie die Umformulierung auf dem Ger\xE4t f\xFCr Ihren schw\xE4chsten Absatz.",
  "try.ask": "Stellen Sie eine Kundenfrage in zwei Assistenten und lesen Sie die Quellen.",
  "try.pack": "Laden Sie das Fix-Paket herunter und \xF6ffnen Sie die Mess-Anleitung.",
  "game.bots": "Erlauben oder sperren",
  "game.bots.d": "Such-Bot oder Trainings-Bot?",
  "game.quote": "Zitierbar oder nicht",
  "game.quote.d": "W\xFCrde die KI ihn allein zitieren?",
  "game.myth": "Mythos oder Fakt",
  "game.myth.d": "Annahmen zur KI-Suche, gepr\xFCft",
  "game.schema": "Schema reparieren",
  "game.schema.d": "Finde die kaputte Zeile",
  "g.bots.goal": "Ihr Ziel: in KI-Antworten erscheinen, aber Ihre Inhalte aus dem KI-Training heraushalten.",
  "g.bots.ask": "Diesen Crawler erlauben?",
  "g.quote.ask": "K\xF6nnte eine KI diesen Satz allein zitieren?",
  "g.myth.ask": "Mythos oder Fakt?",
  "g.schema.ask": "In welcher Zeile steckt der Fehler?",
  "g.keep": "Erlauben",
  "g.block": "Sperren",
  "g.quotable": "Zitierbar",
  "g.notquotable": "Nicht allein",
  "g.fact": "Fakt",
  "g.myth": "Mythos",
  "g.bots.search": "{ua} liest Seiten, um Menschen zu antworten: Eine Sperre entfernt Sie aus diesen Antworten.",
  "g.bots.train": "{ua} sammelt Trainingsdaten: Eine Sperre entfernt Sie nicht aus der KI-Suche.",
  "g.score": "{n} / {of}",
  "g.perfect": "Eine perfekte Runde.",
  "g.good": "Gut. Noch eine Runde?",
  "g.retry": "Noch eine Runde lohnt sich: Die Erkl\xE4rungen sind die Lektion.",
  "g.again": "Nochmal spielen",
  "g.finish": "Ergebnis ansehen",
  "xp.heat": "Markierung",
  "xp.site": "Website-Scan",
  "xp.rival": "Mitbewerber",
  "xp.mission": "Mission",
  "xp.answer": "Antwort gelesen",
  "xp.sim": "KI-Lekt\xFCre",
  "xp.lesson": "Lektion",
  "xp.drill": "Tagestraining",
  "pro.title": "Wenn es ein Projekt ist, keine schnelle \xC4nderung",
  "pro.lead": "Sada zeigt, was zu tun ist. Das AYKA-Team \xFCbernimmt, was Zeit braucht: Markup f\xFCr die ganze Website, Sprachversionen, Inhalte, die die Fragen Ihrer Kunden beantworten, und Erw\xE4hnungen auf Websites, denen die KI vertraut.",
  "pro.subj": "Projekt mit AYKA",
  "pro.quote": "Jedes Projekt ist anders: Nach einem kurzen Gespr\xE4ch erhalten Sie ein pers\xF6nliches Angebot.",
  "pro.from": "Aus Ihrer Mission: {n} Projekte",
  "pro.from.1": "Aus Ihrer Mission: 1 Projekt",
  "pro.what": "Was wir machen",
  "pro.free": "Sada bleibt kostenlos",
  "pro.free.d": "Agent, Labor, Audit und Akademie sind kostenlos, ihr Quellcode ist \xF6ffentlich auf GitHub. Nichts geht an AYKA, au\xDFer Sie buchen ein Gespr\xE4ch oder schreiben uns.",
  "set.back": "Zur\xFCck",
  "set.theme": "Darstellung",
  "set.theme.auto": "Auto",
  "set.theme.light": "Hell",
  "set.theme.dark": "Dunkel",
  "set.remind": "W\xF6chentliche Erinnerung",
  "set.remind.d": "Alle 7 Tage eine Benachrichtigung, um Ihre Fragen erneut zu testen. Standardm\xE4\xDFig aus.",
  "ai.title": "KI auf dem Ger\xE4t",
  "ai.checking": "Wird gepr\xFCft\u2026",
  "ai.ready": "Bereit: Chromes eingebaute KI l\xE4uft auf diesem Computer.",
  "ai.ready.tr": "Bereit: Chromes eingebaute KI, mit \xDCbersetzung auf dem Ger\xE4t f\xFCr diese Sprache.",
  "ai.dl": "Verf\xFCgbar nach einem einmaligen Download durch Chrome; er startet bei der ersten Nutzung einer KI-Funktion.",
  "ai.how": "Sada nutzt keinen KI-Dienst und keinen API-Schl\xFCssel. Wo Chromes eingebaute KI (Gemini Nano) vorhanden ist, nutzt Sada sie f\xFCr Entw\xFCrfe und Umformulierungen; alles andere funktioniert ohne sie.",
  "set.privacy.t": "Datenschutz",
  "set.privacy2": "Sada liest nur die Website, auf der Sie sind, und nur auf Ihren Wunsch. Ergebnisse, eingef\xFCgte Antworten und Ihr Fortschritt bleiben in diesem Browser. Nichts wird an AYKA oder andere gesendet.",
  "set.reset": "Alle Sada-Daten l\xF6schen",
  "set.reset.q": "Alle Sada-Daten in diesem Browser l\xF6schen?",
  "trust.strip": "Sicher im Job: l\xE4uft im Browser, sendet nichts. Beweis ansehen",
  "trust.title": "Vertrauenszentrum",
  "trust.lead": "Sada l\xE4uft vollst\xE4ndig in Ihrem Browser. Hier sind seine Regeln und der Live-Nachweis jeder Anfrage dieser Sitzung.",
  "trust.managed": "{n} Einstellungen werden von Ihrer Organisation verwaltet.",
  "trust.managed.1": "1 Einstellung wird von Ihrer Organisation verwaltet.",
  "trust.promises": "Was Sada tut und niemals tut",
  "trust.p.browser": "L\xE4uft auf diesem Computer",
  "trust.p.browser.d": "Jede Pr\xFCfung, die Mission, das Fix-Paket und die Bewertung laufen in Ihrem Browser. Es gibt keinen Sada-Server.",
  "trust.p.noai": "Kein KI-Dienst, kein API-Schl\xFCssel",
  "trust.p.noai.d": "Entw\xFCrfe nutzen die im Browser eingebaute KI auf diesem Ger\xE4t, wenn vorhanden. Kein Text geht an einen KI-Anbieter.",
  "trust.p.nosend": "Sendet nichts an AYKA oder andere",
  "trust.p.nosend.d": "Kein Konto, keine Statistik, kein Tracking, keine Werbe-IDs. Nur Sie entscheiden, uns zu kontaktieren.",
  "trust.p.readonly": "Nur lesen, nur der aktuelle Tab",
  "trust.p.readonly.d": "Sada liest den Tab, den Sie ansehen: nach Ihrem Klick oder beim Tab-Wechsel, wenn Sie alle Websites erlaubt und „Aktiven Tab verfolgen“ eingeschaltet haben. Weitere Seiten derselben Website werden ohne Cookies abgerufen. Auf einem Social-Media-Kanal liest Sada nur die geprüften Profilfelder, so wie Ihr Tab sie zeigt; nie Nachrichten oder Kontoeinstellungen.",
  "trust.p.noact": "Klickt, tippt und sendet nie etwas",
  "trust.p.noact.d": "Sada f\xFCllt keine Formulare aus, meldet sich nirgends an, ver\xF6ffentlicht nichts und \xE4ndert keine Website. KI-Assistenten \xF6ffnen sich nur auf Ihren Klick, in einem normalen Tab.",
  "trust.p.open": "\xD6ffentlicher, lesbarer Code",
  "trust.p.open.d": "FSL-1.1-ALv2 (nach zwei Jahren Apache-2.0), nicht minimiert, kein nachgeladener Code (strenge Content Security Policy). Ihre IT kann jede Zeile pr\xFCfen.",
  "trust.live": "Live-Nachweis: diese Sitzung",
  "trust.zero": "Anfragen von Sada an Server Dritter",
  "trust.live.d": "{n} Anfragen gingen an die gepr\xFCfte Website (oder den genannten Mitbewerber). {t} Assistenten-Tab(s) haben Sie selbst ge\xF6ffnet.",
  "trust.none": "In dieser Sitzung noch keine Anfrage.",
  "trust.verify": "Selbst pr\xFCfen: Rechtsklick auf diesen Bereich, Untersuchen, dann den Tab Netzwerk \xF6ffnen.",
  "trust.why.social": "der gepr\u00fcfte Social-Kanal",
  "trust.why.page": "die gepr\xFCfte Seite",
  "trust.why.site": "Seiten derselben Website",
  "trust.why.rival": "der genannte Mitbewerber",
  "trust.why.assistant": "von Ihnen ge\xF6ffneter Tab",
  "trust.perms": "Berechtigungen und wozu",
  "trust.perm.activeTab": "Die aktuelle Seite lesen, nur nach Ihrem Klick.",
  "trust.perm.scripting": "Den Lesecode in dieser Seite ausf\xFChren (nur lesend).",
  "trust.perm.sidePanel": "Sada neben der Seite anzeigen.",
  "trust.perm.storage": "Ergebnisse und Fortschritt in diesem Browser speichern.",
  "trust.perm.contextMenus": "Der Rechtsklick-Eintrag f\xFCr Antworten, die Sie selbst markieren.",
  "trust.perm.favicon": "Das Symbol der Website im Messer zeigen.",
  "trust.perm.alarms": "Wöchentliche Erinnerung, Beitrags-Erinnerungen und Watch-Prüfungen, nur wenn Sie sie einschalten.",
  "trust.perm.notifications": "Optional, nur für Erinnerungen und Watch-Hinweise angefragt.",
  "trust.perm.sites.n": "Website-Zugriff",
  "trust.perm.sites": "Optional. Einmal angefragt, damit Sada beim Tab-Wechsel aktualisieren, Social-Media-Kanäle lesen und eine Mitbewerber-Website prüfen kann. Jederzeit in Chrome entfernbar: Erweiterungen → Sada → Details → Websitezugriff.",
  "trust.stored": "Nur in diesem Browser gespeichert",
  "trust.stored.d": "{missions} Mission(en), {answers} zur\xFCckgebrachte Antwort(en), {lessons} Lerneintr\xE4ge. Nichts wird synchronisiert oder hochgeladen.",
  "trust.it": "F\xFCr IT- und Sicherheitsteams",
  "trust.it.d": "Verteilen Sie Sada \xFCber Chrome- oder Edge-Richtlinien und schalten Sie Funktionen zentral ab. Das Pr\xFCfblatt beschreibt Datenfluss, Berechtigungen, Richtlinien und die Pr\xFCfung des Builds.",
  "pol.disableAssistantLinks": "Nie KI-Assistenten \xF6ffnen (Fragen werden nur kopiert)",
  "pol.disableRival": "Keine Mitbewerber-Websites lesen",
  "pol.disableSiteScan": "Nur die aktuelle Seite lesen, nicht den Rest der Website",
  "pol.disableOnDeviceAI": "Die eingebaute KI des Browsers nicht nutzen",
  "pol.hideContactOffers": "Angebote zur Kontaktaufnahme mit AYKA ausblenden",
  "pol.on": "An",
  "pol.off": "Aus",
  "trust.it.doc": "Sicherheits-Pr\xFCfblatt",
  "trust.it.build": "SHA-256-Pr\xFCfsummen zu jeder Version ver\xF6ffentlicht",
  "lab.copied.only": "Frage kopiert. Ihre Organisation erlaubt Sada nicht, {engine} zu \xF6ffnen: F\xFCgen Sie sie dort selbst ein.",
  "lab.copy": "Frage kopieren",
  "lab.nudge": "Hier hat die KI {comp} statt Ihnen empfohlen.",
  "lab.nudge.cta": "Warum, erfahren Sie im kostenlosen Review",
  "lab.nudge.note": "Die KI nannte {comp} statt uns bei: {q}",
  "plan.progress": "{n} von {of} erledigt",
  "plan.mark": "Als erledigt markieren",
  "xp.plan": "Planschritt erledigt",
  "ns.kicker": "Ihr n\xE4chster Schritt",
  "ns.comp": "In Ihren Tests nannte die KI {comp} {n}-mal; Sie wurden in {named} von {of} Antworten genannt.",
  "ns.gaps": "Ihre Website l\xE4sst {n} von {of} Kundenfragen ohne klare Antwort, {open} davon, bei denen die KI ein Unternehmen ausw\xE4hlt.",
  "ns.good": "Ihre Website beantwortet die Fragen der Kunden. N\xE4chster Schritt: auf den Websites genannt werden, denen die KI vertraut.",
  "ns.body": "Buchen Sie ein kostenloses 30-Minuten-Review. Wir gehen Ihre Mission gemeinsam durch und sagen Ihnen, was zuerst zu tun ist. Fix-Paket und Plan behalten Sie in jedem Fall, ohne Verpflichtung.",
  "ns.get1": "Ihr Plan, priorisiert f\xFCr Ihr Gesch\xE4ft und Ihren Markt",
  "ns.get2": "Welchen Websites die KI in Ihrer Branche vertraut, und wie Sie dorthin kommen",
  "ns.get3": "Ein klares Ja oder Nein, ob Sie \xFCberhaupt Hilfe brauchen",
  "ns.book": "Kostenloses 30-Min-Review buchen",
  "ns.mail": "Ergebnisse per E-Mail senden",
  "ns.mail.subj": "Review meiner Sada-Mission",
  "ns.shares": "Die Buchung \xF6ffnet getayka.com und \xFCbertr\xE4gt nur, was Sie sehen: Website-Adresse, Score, beantwortete Fragen und Plan-\xDCberschriften.",
  "tier.free": "Selbst machen",
  "tier.free.p": "Kostenlos, f\xFCr immer",
  "tier.free.1": "Die Agenten-Mission und das Fix-Paket",
  "tier.free.2": "Das Sichtbarkeitslabor in 8 Assistenten",
  "tier.free.3": "Audit, Website-Scan und Mitbewerber",
  "tier.free.4": "Die Akademie und die Spiele",
  "tier.free.cta": "Mission starten",
  "tier.review": "Kostenloses Review",
  "tier.review.p": "30 Minuten, unverbindlich",
  "tier.review.1": "Wir lesen Mission und Fix-Paket gemeinsam mit Ihnen",
  "tier.review.2": "Ihre drei wichtigsten Schritte, in Reihenfolge",
  "tier.review.3": "Eine ehrliche Antwort, ob Sie uns brauchen",
  "tier.done": "F\xFCr Sie erledigt",
  "tier.done.p": "Pers\xF6nliches Angebot, fester Umfang",
  "tier.done.1": "Markup f\xFCr die ganze Website und Sprachversionen",
  "tier.done.2": "Inhalte, die die Fragen Ihrer Kunden beantworten",
  "tier.done.3": "Digital-PR auf den Websites, auf die sich die KI st\xFCtzt",
  "tier.done.4": "W\xF6chentliches Tracking mit Monatsbericht",
  "pro.how": "So l\xE4uft ein Projekt",
  "pro.how.1": "Kostenloses Review-Gespr\xE4ch",
  "pro.how.1.d": "30 Minuten zu Ihren Missionsergebnissen.",
  "pro.how.2": "Schriftliches Angebot",
  "pro.how.2.d": "Fester Umfang und Preis, schriftlich, vor Arbeitsbeginn.",
  "pro.how.3": "Die Umsetzung",
  "pro.how.3.d": "Auf Ihrer Website, mit Ihrem Team, Schritt f\xFCr Schritt.",
  "pro.how.4": "Vorher und nachher",
  "pro.how.4.d": "Dieselbe Sada-Mission erneut starten: Sie sehen die Ver\xE4nderung selbst.",
  "pro.never": "Was wir nie tun",
  "pro.never.1": "Gef\xE4lschte oder gekaufte Bewertungen",
  "pro.never.2": "Nicht offengelegte \xC4nderungen auf Wikipedia oder in Foren",
  "pro.never.3": "Linknetzwerke oder Spam-Verzeichnisse",
  "pro.never.4": "Versprechen eines Rankings oder einer Nennung durch KI",
  "audit.remote": "Gepr\xFCft, ohne sie zu \xF6ffnen. Die Markierung funktioniert auf der Seite, die in Ihrem Tab offen ist.",
  "rw.tools": "Mit KI auf dem Ger\xE4t umformulieren",
  "rw.tools.d": "Bessere Versionen Ihres Einstiegs und Ihrer S\xE4tze, auf diesem Computer geschrieben. Fehlende Fakten werden zu [Platzhaltern].",
  "site.checkpage": "Pr\xFCfen",
  "audit.backopen": "Seite im Tab",
  "ab.title": "Ihre Organisation",
  "ab.edit.d": "Sada schreibt die Fragen daraus. Seien Sie genau: Davon h\xE4ngt ab, wie relevant der Test ist.",
  "ab.name": "Name",
  "ab.cat": "Was Sie sind, in Ihren Worten (optional)",
  "ab.cat.ph": "z. B. Hochschule, Gedenkst\u00e4tte, SEO-Agentur",
  "ab.svc": "Angebote oder Themen (mit Kommas)",
  "ab.svc.ph": "z. B. Data Science, F\u00fchrungen, SEO",
  "ab.aud": "Ihre Kunden",
  "ab.aud.ph": "z. B. Onlineshops, Familien, Start-ups",
  "ab.mkt": "Ort, Region oder Land (optional)",
  "ab.mkt.ph": "z. B. M\u00fcnchen, Bayern, Deutschland",
  "ab.save": "Speichern und Fragen aktualisieren",
  "ab.cancel": "Abbrechen",
  "ab.confirmed": "Best\xE4tigt",
  "ab.change": "\xC4ndern",
  "ab.q": "Stimmt das? Die Fragen h\xE4ngen davon ab.",
  "ab.yes": "Ja, stimmt",
  "ab.fix": "Korrigieren",
  "ab.kind": "Bereich",
  "ab.aka": "Auch bekannt als",
  "ab.saved": "Gespeichert. Die Fragen sind aktualisiert.",
  "ap.pick": "Zu testende Fragen",
  "ap.engines": "Assistenten",
  "ap.start": "Autopilot starten: {n} Tests",
  "ap.how1": "Sada \xF6ffnet jeden Assistenten in Ihrem Browser mit der Frage.",
  "ap.how1.copy": "Sada kopiert jede Frage; Sie f\xFCgen sie im Assistenten ein.",
  "ap.how2": "Ist die Antwort fertig, klicken Sie auf die Kopieren-Schaltfl\xE4che des Assistenten und dann auf Einf\xFCgen und lesen (oder markieren und Alt+Umschalt+A dr\xFCcken).",
  "ap.how3": "Sada bewertet sie und \xF6ffnet selbst den n\xE4chsten Test.",
  "ap.title": "Autopilot",
  "ap.count": "Test {n} von {of}",
  "ap.wait": "{engine} ist mit der Frage ge\xF6ffnet. Warten Sie die vollst\xE4ndige Antwort ab.",
  "ap.wait.paste": "Die Frage ist kopiert: In {engine} einf\xFCgen (Strg+V) und die vollst\xE4ndige Antwort abwarten.",
  "ap.paste": "Antwort einf\xFCgen und lesen",
  "ap.or": "oder die Antwort markieren und Alt+Umschalt+A dr\xFCcken, oder Rechtsklick \u201EDiese KI-Antwort an Sada senden\u201C",
  "ap.manual": "Stattdessen hier einf\xFCgen",
  "ap.reopen": "Erneut \xF6ffnen",
  "ap.skip": "\xDCberspringen",
  "ap.stop": "Stoppen",
  "ap.done": "Autopilot fertig: {n} Tests. Ergebnisse unten.",
  "ap.empty": "Die Zwischenablage ist leer: Kopieren Sie zuerst die Antwort.",
  "ap.noclip": "Sada konnte die Zwischenablage nicht lesen. F\xFCgen Sie die Antwort ins Feld ein (Strg+V).",
  "ap.select": "Markieren Sie zuerst den Antworttext und dr\xFCcken Sie dann Alt+Umschalt+A.",
  "ap.fromagent": "Diese Fragen in KI-Assistenten testen",
  "lab.lead2": "Finden Sie heraus, ob ChatGPT, Gemini, Perplexity und andere Sie empfehlen, bei den Fragen, die Ihre Kunden wirklich stellen.",
  "lab.pro2": "Soll das jede Woche automatisch in allen Assistenten laufen, mit Monatsbericht? Das ist unser Tracking-Service.",
  "xp.autopilot": "Autopilot",
  "trust.perm.clipboardRead": "Optional, nur angefragt, wenn Sie Einf\xFCgen und lesen nutzen.",
  "ai.dl.run": "Chromes eingebaute KI wird vorbereitet (einmaliger Download im Hintergrund): {p} %",
  "ai.dl.done": "Chromes eingebaute KI ist auf diesem Computer bereit."
};

// apps/extension/src/i18n/en.ts
var en_default2 = {
  "nav.agent": "Agent",
  "nav.audit": "Audit",
  "nav.ask": "Ask AI",
  "nav.academy": "Academy",
  "nav.pro": "Pro",
  "mail.sent": "(Sent from Sada)",
  "meter.idle": "Echo meter: not measured yet",
  "btn.allowAll": "Allow Sada on all sites (it can then read pages without a click on its icon)",
  "agent.title": "Send the agent through {host}",
  "agent.title.none": "Open your website, then send the agent",
  "agent.lead": "Eight steps, about a minute. Sada reads your site the way AI assistants do, predicts what customers ask them, finds the answers you are missing and builds your fix pack.",
  "agent.run": "Run the mission",
  "agent.working": "Working\u2026",
  "agent.again": "Run again",
  "agent.free": "Runs on this computer. Free, no account, no API key.",
  "agent.when": "Last mission: {date}",
  "agent.running": "Reading {host}\u2026",
  "agent.score.lead": "How AI assistants hear {host} today.",
  "agent.how": "What the agent does",
  "ms.read.t": "Read the page",
  "ms.read.d": "Exactly what a crawler and a browser receive.",
  "ms.access.t": "Check AI crawler access",
  "ms.access.d": "Which AI search bots may read you, and what blocks them.",
  "ms.entity.t": "Understand the business",
  "ms.entity.d": "Name, type and place, as machines see them.",
  "ms.scan.t": "Read the site",
  "ms.scan.d": "Up to 30 pages across your sections, from your sitemap.",
  "ms.questions.t": "Predict customer questions",
  "ms.questions.d": "What people ask AI before choosing a business like yours.",
  "ms.coverage.t": "Find missing answers",
  "ms.coverage.d": "Which questions your pages answer, passage by passage.",
  "ms.drive.t": "Agent test drive",
  "ms.drive.d": "Could an AI agent find prices, hours, contact, and book?",
  "ms.pack.t": "Build the plan and fix pack",
  "ms.pack.d": "Ranked actions and ready-made files to download.",
  "ms.read.run": "Reading the page\u2026",
  "ms.read.ok": "Score {score}/100 \xB7 {words} words",
  "ms.read.perm": "Click Sada's icon in the toolbar on your page, so Sada may read it.",
  "ms.read.fail": "This page cannot be read. Open a normal web page.",
  "ms.access.run": "Checking robots.txt and signals\u2026",
  "ms.access.ok": "{n} of {of} AI search bots can read this page",
  "ms.access.blocked": "AI search is blocked on this page",
  "ms.entity.run": "Reading names and markup\u2026",
  "ms.entity.ok": "{name} \xB7 {cat} \xB7 {place}",
  "ms.entity.noplace": "place not stated",
  "ms.scan.run": "Reading pages from the sitemap\u2026",
  "ms.scan.ok": "{n} pages read \xB7 average {avg}/100",
  "ms.scan.ok.1": "1 page read \u00b7 {avg}/100",
  "ms.scan.fail": "Other pages could not be read; continuing with this one",
  "ms.q.run": "Predicting questions\u2026",
  "ms.q.ok": "{n} questions",
  "ms.q.ok.ai": "{n} questions, {ai} from on-device AI",
  "ms.cov.run": "Searching {n} passages\u2026",
  "ms.cov.ok": "{a} answered \xB7 {p} partly \xB7 {m} missing",
  "ms.drive.run": "Testing agent tasks\u2026",
  "ms.drive.ok": "{n} of {of} tasks clear",
  "ms.pack.run": "Writing the plan\u2026",
  "ms.pack.draft": "Drafting answers on this computer ({n}/{of})\u2026",
  "ms.pack.ok": "{n} files ready",
  "ms.err": "This step did not finish.",
  "stat.answered": "questions answered",
  "stat.pages": "pages read, average {avg}",
  "stat.drive": "agent tasks clear",
  "stat.named": "of answers name you",
  "stat.untested": "test in AI assistants",
  "agent.plan": "Your plan",
  "agent.cov": "Questions customers ask AI",
  "agent.cov.n": "{a} of {n} answered",
  "agent.cov.d": "An AI can only quote what your pages say. Send any question to the assistants to see who they name.",
  "agent.pro": "{n} of these are projects",
  "agent.pro.d": "Site-wide fixes, language versions and earning mentions take time to do well. We can do them with you.",
  "agent.pro.subj": "Sada mission",
  "agent.log": "Mission log",
  "cov.answered": "Answered",
  "cov.partial": "Partly",
  "cov.missing": "Missing",
  "cov.test": "Test this question in AI assistants",
  "q.branded": "about you",
  "q.open": "open question",
  "q.byai": "suggested by on-device AI",
  "plan.impact": "Impact",
  "effort.1": "Quick",
  "effort.2": "A few hours",
  "effort.3": "Project",
  "who.you": "You can do it",
  "who.pro": "Best with a specialist",
  "go.audit": "Open",
  "go.ask": "Test",
  "go.academy": "Learn",
  "go.pack": "Fix pack",
  "plan.unblock": "Unblock AI search",
  "plan.unblock.d": "Search engines or AI search bots are told not to use your pages. Nothing else counts until this is solved. Careful: the wrong line can also block Google.",
  "plan.gaps": "Answer {n} questions your site leaves open",
  "plan.gaps.1": "Answer the question your site leaves open",
  "plan.gaps.d": "Open questions, where AI picks a business for the customer: {u}. Add one clear passage for each; drafts are in the fix pack.",
  "plan.entity": "Tell machines who you are",
  "plan.entity.d": "Add Organization or LocalBusiness markup with your official profiles. It is ready in the fix pack.",
  "plan.answer-first": "Open the page with the answer",
  "plan.answer-first.d": "Rewrite the first paragraph: what it is, for whom, where, and one key fact.",
  "plan.quotable": "Make key sentences quotable",
  "plan.quotable.d": "Name the subject, one concrete fact per sentence, numbers with their source.",
  "plan.site": "Fix \u201C{check}\u201D across the site",
  "plan.site.d": "{n} of {pages} pages share this problem. A fix in the page template covers them all at once, usually as a project.",
  "plan.agent": "Make the page usable by AI agents",
  "plan.agent.d": "Agent tasks that fail here: {list}. Field labels, button names and facts in text fix most of them.",
  "plan.lang": "Fix your language versions",
  "plan.lang.d": "Wrong language signals send people and AI answers to the wrong version.",
  "plan.offsite": "Get mentioned where AI looks",
  "plan.offsite.d": "Ask the assistants your questions in Ask AI: the websites they cite are your PR list. Mentions there matter more than links.",
  "plan.measure": "Measure AI traffic and visibility",
  "plan.measure.d": "Add an AI channel in Google Analytics and check the Search Console and Bing AI reports each month. Steps are in the fix pack.",
  "plan.fresh": "Show when the page was updated",
  "plan.fresh.d": "A visible date and dateModified make freshness clear.",
  "pack.title": "Fix pack",
  "pack.d": "{n} files: your plan, missing answers with drafts, ready-made code, questions to test, and a tracking guide.",
  "pack.dl": "Download the fix pack (.zip)",
  "pack.stale": "Run the mission again to rebuild the fix pack.",
  "pack.impact": "Impact",
  "pack.effort": "Effort",
  "pack.plan.h": "Action plan for {site}",
  "pack.plan.intro": "Made by Sada on {date}. Highest impact for the least work first.",
  "pack.cta": "Want this done for you? Book a call at https://getayka.com/book/ or email hello@getayka.com for a personalised quote.",
  "pack.gaps.h": "Missing answers",
  "pack.gaps.intro": "Questions customers ask AI assistants that your site does not clearly answer yet. Add one short passage per question to the most relevant page.",
  "pack.fit": "fit {fit}/100",
  "pack.draft": "Draft",
  "pack.found": "Closest passage on your site",
  "pack.draft.tpl": "Check every fact, then put the passage on the page that fits best.",
  "pack.tpl.town": "town",
  "pack.tpl.discover": "{name} is a {cat} in {place} for [who it suits best]. [One fact only you can claim: a number, a view, a distance, a speciality.] [How to book or get in touch.]",
  "pack.tpl.compare": "When choosing a {cat} in {place}, compare [criterion 1], [criterion 2] and [criterion 3]. {name} offers [your answer on each, with numbers].",
  "pack.tpl.price": "At {name}, [service] costs [price] [per night, per project, from\u2026], [what is included]. [How to get an exact quote or book.]",
  "pack.tpl.hours": "{name} is open [days] from [time] to [time]. [Exceptions: holidays, seasons.]",
  "pack.tpl.book": "To book at {name}, [how: online form, phone, email], [how far ahead], [what you need]. [Payment and cancellation in one sentence.]",
  "pack.tpl.where": "{name} is at [address] in {place}, [distance] from [landmark, station or airport]. [How to get there, and parking.]",
  "pack.tpl.reviews": "Customers rate {name} [rating] on [platform] ([number] reviews). They often mention [two specific things]. [Link to the reviews.]",
  "pack.tpl.contact": "Contact {name} by phone on [number] or by email at [address]. [When you answer, and how fast.]",
  "pack.tpl.trust": "Customers rate {name} [rating] on [platform] ([number] reviews). They often mention [two specific things].",
  "pack.tpl.practical": "{name}: [the practical answer in one sentence]. [One detail that avoids a follow-up question.]",
  "pack.tpl.service": "{name} offers [service] in {place} for [whom]. [What is included, with numbers.] [How to start.]",
  "pack.tpl.brand": "{name} is a {cat} in {place} that [what it does] for [whom]. [Since when, how many, one proof.]",
  "pack.gaps.none": "Your site answers every predicted question. Test them in AI assistants next.",
  "pack.q.h": "Questions to test in AI assistants",
  "pack.q.intro": "Each link opens the assistant with the question typed in (for Gemini, paste it). Ask each question a few times: answers vary.",
  "pack.aidraft": "AI draft: check every fact",
  "pack.note.ai": "Drafts marked [AI draft] were written on your computer by Chrome's built-in AI, from your own pages. Check every fact before publishing.",
  "pack.note.tpl": "No on-device AI was available, so each gap has a writing template instead of a draft.",
  "pack.measure": "# Measure AI traffic and visibility (free)\n\n## 1. Google Analytics 4: an \u201CAI assistants\u201D channel\nAdmin \u2192 Data display \u2192 Channel groups \u2192 Create new channel group. Add a channel named \u201CAI assistants\u201D with the condition *Session source matches regex*:\n\n```\n{regex}\n```\n\nMove it above \u201CReferral\u201D and save. ChatGPT often adds `utm_source=chatgpt.com` to its links, but some AI clicks arrive with no referrer and count as Direct: treat the number as a minimum.\n\n## 2. Google Search Console\nPerformance \u2192 Generative AI: impressions of your pages in AI Overviews and AI Mode (available since June 2026). Check it each month.\n\n## 3. Bing Webmaster Tools\nAI Performance: how often your pages are cited in Copilot and Bing's AI summaries. Free; verify your site first.\n\n## 4. Your own answer tests\nUse Sada's Ask AI tab every week with the same questions, in several assistants. Track the share of answers that name you, not the position.\n",
  "pack.readme": "# Sada fix pack for {site}\n\nMade by Sada on {date}, on your own computer. {n} files.\n\n1. **1-action-plan.md**: what to do, in order.\n2. **2-missing-answers.md**: questions customers ask AI that your site does not answer yet, with drafts. Check every fact before publishing; AI-made drafts are labelled.\n3. **3-code/**: ready-made code built from your page (robots.txt, structured data, meta tags). Values Sada could not know are marked TODO.\n4. **4-questions-to-test.md**: links that open each assistant with the question typed in.\n5. **5-measure-ai-traffic.md**: free tracking with Google Analytics, Search Console and Bing.\n6. **data/**: the numbers behind it (CSV).\n\nWant it done for you? Book a call at https://getayka.com/book/ or email hello@getayka.com for a personalised quote.\n",
  "intent.discover": "finding options",
  "intent.compare": "comparing",
  "intent.price": "price",
  "intent.trust": "trust",
  "intent.practical": "practical",
  "intent.service": "service",
  "intent.brand": "about you",
  "csv.q": "Question",
  "csv.type": "Type",
  "csv.status": "Status",
  "csv.fit": "Fit",
  "csv.page": "Best page",
  "csv.task": "Agent task",
  "csv.score": "Score",
  "csv.issues": "Issues",
  "audit.page": "This page",
  "audit.site": "Whole site",
  "audit.rival": "Rival",
  "audit.empty": "Check this page",
  "audit.empty.d": "Open any page of your website, then check it. Sada reads it on your computer.",
  "heat.short": "Highlight",
  "export.short": "Report",
  "heat.good": "quotable as is",
  "heat.almost": "almost",
  "rw.d2": "Two rewrites by Chrome's built-in AI, on this computer. Missing facts become [placeholders].",
  "ai.label": "AI-made: check before publishing.",
  "ai.none": "Chrome's built-in AI is not available on this computer (it needs a recent Chrome on a capable computer). Everything else in Sada works without it.",
  "rep.title": "AI visibility report",
  "drive.title": "Agent test drive",
  "drive.d": "Could an AI agent do a customer's job on this page without guessing? Read from the page; nothing is clicked or sent.",
  "drive.webmcp.how": "How to declare your main form as a tool",
  "drive.webmcp.ex": "Book a room: dates, guests, contact",
  "drive.price": "Find the price",
  "drive.price.pass": "Prices are in structured data ({n}).",
  "drive.price.warn": "Prices are visible in text but not in structured data: agents may misread them.",
  "drive.price.info": "No prices on this page. Agents will tell people to ask you: fine if you quote per project, but say clearly how to get a quote.",
  "drive.hours": "Find opening hours",
  "drive.hours.pass": "Opening hours are in structured data.",
  "drive.hours.warn": "Hours appear in the text only; add openingHours markup.",
  "drive.hours.fail": "No opening hours found for a local business.",
  "drive.hours.info": "No opening hours (not needed for online-only businesses).",
  "drive.contact": "Contact you",
  "drive.contact.pass": "Several readable ways to reach you (links and markup).",
  "drive.contact.warn": "Only one readable way to contact you. Add a tap-to-call or email link, and markup.",
  "drive.contact.fail": "No readable phone or email link: agents cannot reach you.",
  "drive.action": "Book, buy or ask for a quote",
  "drive.action.pass": "A clear action ({n}) with matching markup.",
  "drive.action.warn": "{n} action links found, no action markup. Fine for most sites.",
  "drive.action.warn.1": "1 action link found, no action markup. Fine for most sites.",
  "drive.action.fail": "No clear book, buy or quote action found.",
  "drive.forms": "Fill in the form",
  "drive.forms.pass": "{fields} fields, all labelled, with autofill hints.",
  "drive.forms.warn": "All fields are labelled; add autocomplete hints (name, email, tel).",
  "drive.forms.fail": "{unlabeled} of {fields} fields have no label: agents must guess.",
  "drive.forms.info": "No forms on this page.",
  "drive.names": "Press the right button",
  "drive.names.pass": "Every button and link has a name.",
  "drive.names.warn": "{n} buttons or links have no name (icon only).",
  "drive.names.warn.1": "1 button or link has no name (icon only).",
  "drive.names.fail": "{n} buttons or links have no name: agents cannot tell what they do.",
  "drive.names.fail.1": "1 button or link has no name: agents cannot tell what it does.",
  "drive.webmcp": "Use the site's tools (WebMCP)",
  "drive.webmcp.pass": "{n} form(s) are declared as agent tools.",
  "drive.webmcp.info": "No WebMCP tools yet. Optional and early: a few attributes on your main form are enough.",
  "drive.commerce": "Shop through an agent (UCP)",
  "drive.commerce.pass": "This site publishes /.well-known/ucp.",
  "drive.commerce.info": "No /.well-known/ucp file. Only relevant for online shops.",
  "dst.pass": "Clear",
  "dst.warn": "Unclear",
  "dst.fail": "Blocked",
  "dst.info": "Note",
  "lab.title": "Visibility lab",
  "lab.lead": "Ask the real assistants what your customers ask. Sada opens each one with the question typed in, you bring the answer back, and Sada keeps score.",
  "lab.brand": "Your business name",
  "lab.all": "Show all {n} questions",
  "lab.fewer": "Show fewer",
  "lab.qs": "Questions",
  "lab.addq": "Add your own question\u2026",
  "lab.add": "Add",
  "lab.step1": "1. Ask",
  "lab.how": "Opens in your browser with your own account. The question is also copied, in case you need to paste it. Sada never reads those pages.",
  "lab.step2": "2. Bring the answer back",
  "lab.from": "Answer from",
  "lab.paste": "Paste the answer here",
  "lab.read": "Read the answer",
  "lab.menu": "Faster: select the answer on the assistant's page, right-click, and choose \u201CSend this AI answer to Sada\u201D.",
  "lab.open": "Ask",
  "lab.paste.open": "Copy and open",
  "lab.rank": "Named, #{n}",
  "lab.named": "Named",
  "lab.notnamed": "Not named",
  "lab.opened": "{engine} opened with your question.",
  "lab.opened.paste": "Question copied. Paste it in {engine} (Ctrl+V).",
  "lab.short": "Paste the full answer first.",
  "lab.got": "Answer received from {engine}.",
  "lab.v.rank": "{brand} is named: #{n} of {of}.",
  "lab.v.named": "{brand} is named.",
  "lab.v.not": "{brand} is not named in this answer.",
  "lab.v.facts": "Check that these facts are right.",
  "lab.v.others": "Named instead, or alongside:",
  "lab.v.src": "Websites the answer relies on:",
  "lab.board": "Scoreboard",
  "lab.share": "{n} of {of} answers name you",
  "lab.comp": "Named most often",
  "lab.src": "Sources AI relies on",
  "lab.src.d": "Your digital PR list: earn a mention on these sites.",
  "lab.src.copy": "Copy the list",
  "lab.honest": "Answers change from one run to the next. Ask each question several times: the share of answers that name you is what counts.",
  "lab.empty": "Check a page first",
  "lab.empty.d": "Sada predicts your customers' questions from your site.",
  "lab.pro": "Want this tracked every week across assistants, with a monthly report?",
  "lab.pro.subj": "AI visibility tracking",
  "sim.title": "Quick read by on-device AI",
  "sim.d": "How would an AI describe this page from its text alone? Runs on this computer with Chrome's built-in AI.",
  "sim.run": "Describe this page",
  "tab.academy": "Academy",
  "ac.xp": "{xp} XP \xB7 next level at {next}",
  "ac.streak.d": "Days in a row with at least one activity",
  "ac.drill": "Daily drill",
  "ac.drill.d": "5 questions, about 2 minutes",
  "ac.drill.done": "Today's drill is done",
  "ac.drill.end": "Streak: {n} days. See you tomorrow.",
  "ac.drill.end.1": "Streak: 1 day. See you tomorrow.",
  "ac.play": "Play",
  "ac.tracks": "Tracks",
  "ac.done": "{n}/{of} lessons",
  "ac.library": "Check explanations",
  "ac.library.d": "The 60-second lesson behind each of Sada's checks.",
  "ac.team": "Train your team",
  "ac.team.d": "Workshops for marketing teams and agencies, in English, French or Arabic.",
  "ac.team.subj": "Academy for my team",
  "ac.team.cta": "Ask about team training",
  "ac.lesson.meta": "3 cards, a quiz and a task",
  "ac.prev": "Back",
  "ac.toquiz": "Quiz",
  "ac.next": "Next",
  "ac.try": "Try it on your site",
  "ac.try.go": "Go",
  "ac.back": "Back to Academy",
  "try.mission": "Run the agent mission on your site and read its predicted questions.",
  "try.audit": "Open Audit and look at this check on your own page.",
  "try.heat": "Switch on the highlighter on your page and count the quotable sentences.",
  "try.bots": "Play Keep or block, then look at your robots.txt in Audit.",
  "try.quote": "Play Quote or not, then rewrite one weak sentence on your page.",
  "try.machine": "Open the machine view of your page: which facts are missing?",
  "try.drive": "Run the Agent test drive on your page.",
  "try.rewrite": "Use the on-device rewrite on your weakest paragraph.",
  "try.ask": "Ask one customer question in two assistants and read their sources.",
  "try.pack": "Download the fix pack and open the tracking guide.",
  "game.bots": "Keep or block",
  "game.bots.d": "Search bot or training bot?",
  "game.quote": "Quote or not",
  "game.quote.d": "Would AI quote it alone?",
  "game.myth": "Myth or fact",
  "game.myth.d": "AI search beliefs, checked",
  "game.schema": "Fix the schema",
  "game.schema.d": "Spot the broken line",
  "g.bots.goal": "Your goal: appear in AI answers, but keep your content out of AI training.",
  "g.bots.ask": "Allow this crawler?",
  "g.quote.ask": "Could an AI quote this sentence on its own?",
  "g.myth.ask": "Myth or fact?",
  "g.schema.ask": "Which line has the mistake?",
  "g.keep": "Keep",
  "g.block": "Block",
  "g.quotable": "Quotable",
  "g.notquotable": "Not on its own",
  "g.fact": "Fact",
  "g.myth": "Myth",
  "g.bots.search": "{ua} fetches pages to answer people: blocking it removes you from those answers.",
  "g.bots.train": "{ua} collects training data: blocking it does not remove you from AI search.",
  "g.score": "{n} / {of}",
  "g.perfect": "A perfect round.",
  "g.good": "Good. Another round?",
  "g.retry": "Worth another round: the explanations are the lesson.",
  "g.again": "Play again",
  "g.finish": "See the score",
  "xp.heat": "highlighter",
  "xp.site": "site scan",
  "xp.rival": "rival check",
  "xp.mission": "mission",
  "xp.answer": "answer read",
  "xp.sim": "AI read",
  "xp.lesson": "lesson",
  "xp.drill": "daily drill",
  "pro.title": "When it is a project, not a quick edit",
  "pro.lead": "Sada shows what to fix. AYKA's team does the parts that take time: site-wide markup, language versions, content that answers your customers' questions, and earning mentions on the sites AI trusts.",
  "pro.subj": "Project with AYKA",
  "pro.quote": "Every project is different, so we give a personalised quote after a short call.",
  "pro.from": "From your mission: {n} projects",
  "pro.from.1": "From your mission: 1 project",
  "pro.what": "What we do",
  "pro.free": "Sada stays free",
  "pro.free.d": "The agent, the lab, the audit and the academy are free, and their source code is public on GitHub. Nothing is sent to AYKA unless you book a call or write to us.",
  "set.back": "Back",
  "set.theme": "Appearance",
  "set.theme.auto": "Auto",
  "set.theme.light": "Light",
  "set.theme.dark": "Dark",
  "set.remind": "Weekly reminder",
  "set.remind.d": "A notification every 7 days to test your questions again. Off by default.",
  "ai.title": "On-device AI",
  "ai.checking": "Checking\u2026",
  "ai.ready": "Ready: Chrome's built-in AI runs on this computer.",
  "ai.ready.tr": "Ready: Chrome's built-in AI, with on-device translation for this language.",
  "ai.dl": "Available after a one-time download by Chrome; it starts the first time you use an AI feature.",
  "ai.how": "Sada uses no AI service and no API key. Where Chrome's built-in AI (Gemini Nano) exists, Sada uses it for drafts and rewrites; everything else works without it.",
  "set.privacy.t": "Privacy",
  "set.privacy2": "Sada reads only the site you are on, when you ask. Results, the answers you paste and your progress stay in this browser. Nothing is sent to AYKA or anyone else.",
  "set.reset": "Delete all Sada data",
  "set.reset.q": "Delete all Sada data in this browser?",
  "trust.strip": "Safe for work: runs in your browser, sends nothing. See the proof",
  "trust.title": "Trust center",
  "trust.lead": "Sada runs entirely inside your browser. Below are its rules, and live proof of every request it made in this session.",
  "trust.managed": "{n} settings are managed by your organisation.",
  "trust.managed.1": "1 setting is managed by your organisation.",
  "trust.promises": "What Sada does and never does",
  "trust.p.browser": "Runs on this computer",
  "trust.p.browser.d": "Every check, the mission, the fix pack and the scoring run inside your browser. There is no Sada server.",
  "trust.p.noai": "No AI service, no API key",
  "trust.p.noai.d": "Drafts use the AI built into your browser, on this device, when it exists. No text goes to any AI provider.",
  "trust.p.nosend": "Sends nothing to AYKA or anyone",
  "trust.p.nosend.d": "No account, no analytics, no tracking, no advertising IDs. Only you decide to contact us.",
  "trust.p.readonly": "Read-only, only the tab you are on",
  "trust.p.readonly.d": "Sada reads the tab you are looking at: after your click, or when you switch tabs if you allowed all sites and kept “Follow the active tab” on. Other pages of the same site are fetched without cookies. On a social channel it reads only the profile fields it checks, as your tab shows them; never messages or account settings.",
  "trust.p.noact": "Never clicks, types or submits",
  "trust.p.noact.d": "Sada does not fill forms, log in, post or change anything on any website. AI assistants open only when you click, in a normal tab.",
  "trust.p.open": "Public, readable code",
  "trust.p.open.d": "FSL-1.1-ALv2 (Apache-2.0 after two years), not minified, no remote code (strict content security policy). Your IT team can read and check every line.",
  "trust.live": "Live proof: this session",
  "trust.zero": "requests to third-party servers by Sada",
  "trust.live.d": "{n} requests went to the website you are checking (or the rival you named). {t} assistant tab(s) were opened by you.",
  "trust.none": "No request yet in this session.",
  "trust.verify": "Check it yourself: right-click this panel, choose Inspect, then open the Network tab.",
  "trust.why.social": "the social channel you checked",
  "trust.why.page": "the page you checked",
  "trust.why.site": "same-site pages",
  "trust.why.rival": "the rival you named",
  "trust.why.assistant": "tab you opened",
  "trust.perms": "Permissions, and why",
  "trust.perm.activeTab": "Read the page you are on, only after your click.",
  "trust.perm.scripting": "Run the reading code in that page (read-only).",
  "trust.perm.sidePanel": "Show Sada next to the page.",
  "trust.perm.storage": "Keep your results and progress in this browser.",
  "trust.perm.contextMenus": "The right-click item for answers you select yourself.",
  "trust.perm.favicon": "Show the site's icon in the meter.",
  "trust.perm.alarms": "The weekly reminder, post reminders and Watch checks, only if you turn them on.",
  "trust.perm.notifications": "Optional, asked only for reminders and Watch alerts.",
  "trust.perm.sites.n": "site access",
  "trust.perm.sites": "Optional. Asked once so Sada can update when you change tabs, read social channels and check a rival site. Remove it any time in Chrome: Extensions → Sada → Details → Site access.",
  "trust.stored": "Stored in this browser only",
  "trust.stored.d": "{missions} mission(s), {answers} answer(s) you brought back, {lessons} lesson record(s). Nothing is synced or uploaded.",
  "trust.it": "For IT and security teams",
  "trust.it.d": "Deploy Sada with Chrome or Edge policies and switch features off centrally. The review sheet covers data flow, permissions, policies and how to verify the build.",
  "pol.disableAssistantLinks": "Never open AI assistants (questions are copied only)",
  "pol.disableRival": "No reading of competitor sites",
  "pol.disableSiteScan": "Read the current page only, not the rest of the site",
  "pol.disableOnDeviceAI": "Do not use the browser's built-in AI",
  "pol.hideContactOffers": "Hide offers to contact AYKA",
  "pol.on": "On",
  "pol.off": "Off",
  "trust.it.doc": "Security review sheet",
  "trust.it.build": "SHA-256 checksums published with every release",
  "lab.copied.only": "Question copied. Your organisation does not allow Sada to open {engine}: paste it there yourself.",
  "lab.copy": "Copy question",
  "lab.nudge": "AI recommended {comp} instead of you here.",
  "lab.nudge.cta": "Find out why, in a free review",
  "lab.nudge.note": "AI named {comp} instead of us for: {q}",
  "plan.progress": "{n} of {of} done",
  "plan.mark": "Mark as done",
  "xp.plan": "plan step done",
  "ns.kicker": "Your next step",
  "ns.comp": "In your tests, AI named {comp} {n} time(s); you were named in {named} of {of} answers.",
  "ns.gaps": "Your site leaves {n} of {of} customer questions without a clear answer, {open} of them where AI picks a business.",
  "ns.good": "Your site answers the questions customers ask. Next: get named on the sites AI trusts.",
  "ns.body": "Book a free 30-minute review. We go through your mission with you and tell you what to do first. You keep the fix pack and the plan either way, with no obligation.",
  "ns.get1": "Your plan ranked for your business and market",
  "ns.get2": "Which sites AI trusts in your sector, and how to get on them",
  "ns.get3": "A clear yes or no on whether you need help at all",
  "ns.book": "Book a free 30-min review",
  "ns.mail": "Send my results by email",
  "ns.mail.subj": "Review of my Sada mission",
  "ns.shares": "Booking opens getayka.com and shares only what you see: your site address, score, questions answered and plan headlines.",
  "tier.free": "Do it yourself",
  "tier.free.p": "Free, forever",
  "tier.free.1": "The agent mission and fix pack",
  "tier.free.2": "The visibility lab in 8 assistants",
  "tier.free.3": "Audit, site scan and rival",
  "tier.free.4": "The Academy and games",
  "tier.free.cta": "Run a mission",
  "tier.review": "Free review",
  "tier.review.p": "30 minutes, no obligation",
  "tier.review.1": "We read your mission and fix pack with you",
  "tier.review.2": "Your top three actions, in order",
  "tier.review.3": "An honest answer on whether you need us",
  "tier.done": "Done for you",
  "tier.done.p": "Personalised quote, fixed scope",
  "tier.done.1": "Site-wide markup and language versions",
  "tier.done.2": "Content that answers your customers' questions",
  "tier.done.3": "Digital PR on the sites AI relies on",
  "tier.done.4": "Weekly tracking with a monthly report",
  "pro.how": "How a project works",
  "pro.how.1": "Free review call",
  "pro.how.1.d": "30 minutes on your mission results.",
  "pro.how.2": "Written proposal",
  "pro.how.2.d": "Fixed scope and price, in writing, before any work starts.",
  "pro.how.3": "The work",
  "pro.how.3.d": "Done on your site with your team, step by step.",
  "pro.how.4": "Before and after",
  "pro.how.4.d": "Re-run the same Sada mission: you see the change yourself.",
  "pro.never": "What we never do",
  "pro.never.1": "Fake or paid reviews",
  "pro.never.2": "Undisclosed edits on Wikipedia or forums",
  "pro.never.3": "Link schemes or spam directories",
  "pro.never.4": "Promises of a ranking or of being named by AI",
  "audit.remote": "Checked without opening it. The highlighter works on the page open in your tab.",
  "rw.tools": "Rewrite with on-device AI",
  "rw.tools.d": "Better versions of your opening and your sentences, written on this computer. Missing facts become [placeholders].",
  "site.checkpage": "Check",
  "audit.backopen": "Open tab's page",
  "ab.title": "About your organisation",
  "ab.edit.d": "Sada writes the questions from this. Be specific: it decides how relevant the test is.",
  "ab.name": "Name",
  "ab.cat": "What you are, in your words (optional)",
  "ab.cat.ph": "e.g. university of applied sciences, memorial site, SEO agency",
  "ab.svc": "Offers or topics (comma separated)",
  "ab.svc.ph": "e.g. Data Science, guided tours, SEO",
  "ab.aud": "Your customers",
  "ab.aud.ph": "e.g. online shops, families, startups",
  "ab.mkt": "Town, region or country (optional)",
  "ab.mkt.ph": "e.g. Munich, Bavaria, Germany",
  "ab.save": "Save and update the questions",
  "ab.cancel": "Cancel",
  "ab.confirmed": "Confirmed",
  "ab.change": "Change",
  "ab.q": "Is this right? The questions depend on it.",
  "ab.yes": "Yes, that's right",
  "ab.fix": "Correct it",
  "ab.kind": "Sector",
  "ab.aka": "Also known as",
  "ab.saved": "Saved. The questions are updated.",
  "ap.pick": "Questions to test",
  "ap.engines": "Assistants",
  "ap.start": "Start autopilot: {n} tests",
  "ap.how1": "Sada opens each assistant in your browser with the question typed in.",
  "ap.how1.copy": "Sada copies each question; you paste it in the assistant.",
  "ap.how2": "When the answer is ready, click the assistant's copy button, then Paste & read (or select it and press Alt+Shift+A).",
  "ap.how3": "Sada scores it and opens the next test by itself.",
  "ap.title": "Autopilot",
  "ap.count": "Test {n} of {of}",
  "ap.wait": "{engine} is open with the question. Wait for the full answer.",
  "ap.wait.paste": "The question is copied: paste it in {engine} (Ctrl+V), then wait for the full answer.",
  "ap.paste": "Paste & read answer",
  "ap.or": "or select the answer and press Alt+Shift+A, or right-click \u201CSend this AI answer to Sada\u201D",
  "ap.manual": "Paste it here instead",
  "ap.reopen": "Open again",
  "ap.skip": "Skip",
  "ap.stop": "Stop",
  "ap.done": "Autopilot finished: {n} tests. Results below.",
  "ap.empty": "The clipboard is empty: copy the answer first.",
  "ap.noclip": "Sada could not read the clipboard. Paste the answer in the box (Ctrl+V).",
  "ap.select": "Select the answer text first, then press Alt+Shift+A.",
  "ap.fromagent": "Test these questions in AI assistants",
  "lab.lead2": "Find out whether ChatGPT, Gemini, Perplexity and others recommend you, for the questions your customers really ask.",
  "lab.pro2": "Want this run automatically every week across assistants, with a monthly report? That is our tracking service.",
  "xp.autopilot": "autopilot",
  "trust.perm.clipboardRead": "Optional, asked only if you use Paste & read.",
  "ai.dl.run": "Getting Chrome's built-in AI ready (one-time download, in the background): {p}%",
  "ai.dl.done": "Chrome's built-in AI is ready on this computer."
};

// apps/extension/src/i18n/fr.ts
var fr_default2 = {
  "nav.agent": "Agent",
  "nav.audit": "Audit",
  "nav.ask": "Demander",
  "nav.academy": "Acad\xE9mie",
  "nav.pro": "Pro",
  "mail.sent": "(Envoy\xE9 depuis Sada)",
  "meter.idle": "Mesure d'\xE9cho : pas encore mesur\xE9",
  "btn.allowAll": "Autoriser Sada sur tous les sites (il pourra lire les pages sans clic sur son ic\xF4ne)",
  "agent.title": "Envoyer l'agent sur {host}",
  "agent.title.none": "Ouvrez votre site, puis envoyez l'agent",
  "agent.lead": "Huit \xE9tapes, environ une minute. Sada lit votre site comme les assistants IA, pr\xE9dit ce que vos clients leur demandent, trouve les r\xE9ponses qui vous manquent et pr\xE9pare votre pack de corrections.",
  "agent.run": "Lancer la mission",
  "agent.working": "En cours\u2026",
  "agent.again": "Relancer",
  "agent.free": "Tourne sur cet ordinateur. Gratuit, sans compte, sans cl\xE9 d'API.",
  "agent.when": "Derni\xE8re mission : {date}",
  "agent.running": "Lecture de {host}\u2026",
  "agent.score.lead": "Comment les assistants IA entendent {host} aujourd'hui.",
  "agent.how": "Ce que fait l'agent",
  "ms.read.t": "Lire la page",
  "ms.read.d": "Exactement ce que re\xE7oivent un robot et un navigateur.",
  "ms.access.t": "V\xE9rifier l'acc\xE8s des robots IA",
  "ms.access.d": "Quels robots de recherche IA peuvent vous lire, et ce qui les bloque.",
  "ms.entity.t": "Comprendre l'entreprise",
  "ms.entity.d": "Nom, type et lieu, tels que les machines les voient.",
  "ms.scan.t": "Lire le site",
  "ms.scan.d": "Jusqu'\xE0 30 pages de vos rubriques, depuis votre sitemap.",
  "ms.questions.t": "Pr\xE9dire les questions des clients",
  "ms.questions.d": "Ce qu'on demande \xE0 l'IA avant de choisir une entreprise comme la v\xF4tre.",
  "ms.coverage.t": "Trouver les r\xE9ponses manquantes",
  "ms.coverage.d": "Les questions auxquelles vos pages r\xE9pondent, passage par passage.",
  "ms.drive.t": "Test de l'agent",
  "ms.drive.d": "Un agent IA trouverait-il prix, horaires, contact, et pourrait-il r\xE9server ?",
  "ms.pack.t": "Pr\xE9parer le plan et le pack",
  "ms.pack.d": "Des actions class\xE9es et des fichiers pr\xEAts \xE0 t\xE9l\xE9charger.",
  "ms.read.run": "Lecture de la page\u2026",
  "ms.read.ok": "Score {score}/100 \xB7 {words} mots",
  "ms.read.perm": "Cliquez sur l'ic\xF4ne de Sada dans la barre d'outils sur votre page, pour que Sada puisse la lire.",
  "ms.read.fail": "Cette page ne peut pas \xEAtre lue. Ouvrez une page web normale.",
  "ms.access.run": "V\xE9rification de robots.txt et des signaux\u2026",
  "ms.access.ok": "{n} robots de recherche IA sur {of} peuvent lire cette page",
  "ms.access.blocked": "La recherche IA est bloqu\xE9e sur cette page",
  "ms.entity.run": "Lecture des noms et du balisage\u2026",
  "ms.entity.ok": "{name} \xB7 {cat} \xB7 {place}",
  "ms.entity.noplace": "lieu non indiqu\xE9",
  "ms.scan.run": "Lecture des pages du sitemap\u2026",
  "ms.scan.ok": "{n} pages lues \xB7 moyenne {avg}/100",
  "ms.scan.ok.1": "1 page lue \u00b7 {avg}/100",
  "ms.scan.fail": "Les autres pages n'ont pas pu \xEAtre lues ; on continue avec celle-ci",
  "ms.q.run": "Pr\xE9diction des questions\u2026",
  "ms.q.ok": "{n} questions",
  "ms.q.ok.ai": "{n} questions, dont {ai} par l'IA de l'appareil",
  "ms.cov.run": "Recherche dans {n} passages\u2026",
  "ms.cov.ok": "{a} r\xE9pondues \xB7 {p} en partie \xB7 {m} manquantes",
  "ms.drive.run": "Test des t\xE2ches d'agent\u2026",
  "ms.drive.ok": "{n} t\xE2ches claires sur {of}",
  "ms.pack.run": "R\xE9daction du plan\u2026",
  "ms.pack.draft": "R\xE9daction des r\xE9ponses sur cet ordinateur ({n}/{of})\u2026",
  "ms.pack.ok": "{n} fichiers pr\xEAts",
  "ms.err": "Cette \xE9tape n'a pas abouti.",
  "stat.answered": "questions r\xE9pondues",
  "stat.pages": "pages lues, moyenne {avg}",
  "stat.drive": "t\xE2ches d'agent claires",
  "stat.named": "des r\xE9ponses vous citent",
  "stat.untested": "\xE0 tester dans les assistants",
  "agent.plan": "Votre plan",
  "agent.cov": "Les questions que vos clients posent \xE0 l'IA",
  "agent.cov.n": "{a} sur {n} r\xE9pondues",
  "agent.cov.d": "Une IA ne peut citer que ce que disent vos pages. Envoyez une question aux assistants pour voir qui ils citent.",
  "agent.pro": "{n} de ces actions sont des projets",
  "agent.pro.d": "Corrections sur tout le site, versions linguistiques et obtention de mentions demandent du temps pour \xEAtre bien faites. Nous pouvons les faire avec vous.",
  "agent.pro.subj": "Mission Sada",
  "agent.log": "Journal de mission",
  "cov.answered": "R\xE9pondu",
  "cov.partial": "En partie",
  "cov.missing": "Manquant",
  "cov.test": "Tester cette question dans les assistants IA",
  "q.branded": "sur vous",
  "q.open": "question ouverte",
  "q.byai": "propos\xE9e par l'IA de l'appareil",
  "plan.impact": "Impact",
  "effort.1": "Rapide",
  "effort.2": "Quelques heures",
  "effort.3": "Projet",
  "who.you": "Faisable par vous",
  "who.pro": "Mieux avec un sp\xE9cialiste",
  "go.audit": "Ouvrir",
  "go.ask": "Tester",
  "go.academy": "Apprendre",
  "go.pack": "Pack",
  "plan.unblock": "D\xE9bloquer la recherche IA",
  "plan.unblock.d": "Les moteurs ou les robots de recherche IA ont l'ordre de ne pas utiliser vos pages. Rien d'autre ne compte tant que ce n'est pas r\xE9gl\xE9. Attention : une mauvaise ligne peut aussi bloquer Google.",
  "plan.gaps": "R\xE9pondre \xE0 {n} questions laiss\xE9es ouvertes",
  "plan.gaps.1": "R\u00e9pondre \u00e0 la question laiss\u00e9e ouverte",
  "plan.gaps.d": "Questions ouvertes, o\xF9 l'IA choisit une entreprise pour le client : {u}. Ajoutez un passage clair pour chacune ; brouillons dans le pack.",
  "plan.entity": "Dire aux machines qui vous \xEAtes",
  "plan.entity.d": "Ajoutez un balisage Organization ou LocalBusiness avec vos profils officiels. Il est pr\xEAt dans le pack.",
  "plan.answer-first": "Ouvrir la page par la r\xE9ponse",
  "plan.answer-first.d": "R\xE9\xE9crivez le premier paragraphe : ce que c'est, pour qui, o\xF9, et un fait cl\xE9.",
  "plan.quotable": "Rendre les phrases cl\xE9s citables",
  "plan.quotable.d": "Nommez le sujet, un fait concret par phrase, des chiffres avec leur source.",
  "plan.site": "Corriger \xAB {check} \xBB sur tout le site",
  "plan.site.d": "{n} pages sur {pages} ont ce probl\xE8me. Une correction dans le mod\xE8le de page les r\xE8gle toutes d'un coup, en g\xE9n\xE9ral sous forme de projet.",
  "plan.agent": "Rendre la page utilisable par les agents IA",
  "plan.agent.d": "T\xE2ches d'agent qui \xE9chouent ici\u202F: {list}. \xC9tiquettes de champs, noms de boutons et faits en texte r\xE8glent l'essentiel.",
  "plan.lang": "Corriger vos versions linguistiques",
  "plan.lang.d": "De mauvais signaux de langue envoient les gens et les r\xE9ponses IA vers la mauvaise version.",
  "plan.offsite": "\xCAtre cit\xE9 l\xE0 o\xF9 l'IA regarde",
  "plan.offsite.d": "Posez vos questions aux assistants dans Demander : les sites qu'ils citent sont votre liste RP. Y \xEAtre mentionn\xE9 compte plus que les liens.",
  "plan.measure": "Mesurer le trafic et la visibilit\xE9 IA",
  "plan.measure.d": "Ajoutez un canal IA dans Google Analytics et consultez chaque mois les rapports IA de Search Console et de Bing. Les \xE9tapes sont dans le pack.",
  "plan.fresh": "Montrer la date de mise \xE0 jour",
  "plan.fresh.d": "Une date visible et dateModified rendent la fra\xEEcheur claire.",
  "pack.title": "Pack de corrections",
  "pack.d": "{n} fichiers : votre plan, les r\xE9ponses manquantes avec brouillons, du code pr\xEAt \xE0 l'emploi, les questions \xE0 tester et un guide de suivi.",
  "pack.dl": "T\xE9l\xE9charger le pack (.zip)",
  "pack.stale": "Relancez la mission pour recr\xE9er le pack.",
  "pack.impact": "Impact",
  "pack.effort": "Effort",
  "pack.plan.h": "Plan d'action pour {site}",
  "pack.plan.intro": "Pr\xE9par\xE9 par Sada le {date}. Le plus d'impact pour le moins d'effort d'abord.",
  "pack.cta": "Vous pr\xE9f\xE9rez qu'on s'en charge ? R\xE9servez un appel sur https://getayka.com/fr/book/ ou \xE9crivez \xE0 hello@getayka.com pour un devis personnalis\xE9.",
  "pack.gaps.h": "R\xE9ponses manquantes",
  "pack.gaps.intro": "Les questions que les clients posent aux assistants IA et auxquelles votre site ne r\xE9pond pas encore clairement. Ajoutez un court passage par question sur la page la plus pertinente.",
  "pack.fit": "pertinence {fit}/100",
  "pack.draft": "Brouillon",
  "pack.found": "Passage le plus proche sur votre site",
  "pack.draft.tpl": "V\xE9rifiez chaque fait, puis placez ce passage sur la page la plus adapt\xE9e.",
  "pack.tpl.town": "ville",
  "pack.tpl.discover": "{name} est une adresse de type {cat} \xE0 {place}, id\xE9ale pour [\xE0 qui elle convient]. [Un fait que vous seul pouvez revendiquer : un chiffre, une vue, une distance, une sp\xE9cialit\xE9.] [Comment r\xE9server ou vous contacter.]",
  "pack.tpl.compare": "Pour choisir parmi les offres de {cat} \xE0 {place}, comparez [crit\xE8re 1], [crit\xE8re 2] et [crit\xE8re 3]. {name} propose [votre r\xE9ponse sur chacun, chiffr\xE9e].",
  "pack.tpl.price": "Chez {name}, [prestation] co\xFBte [prix] [par nuit, par projet, \xE0 partir de\u2026], [ce qui est inclus]. [Comment obtenir un devis exact ou r\xE9server.]",
  "pack.tpl.hours": "{name} est ouvert [jours] de [heure] \xE0 [heure]. [Exceptions : jours f\xE9ri\xE9s, saisons.]",
  "pack.tpl.book": "Pour r\xE9server chez {name} : [comment : formulaire, t\xE9l\xE9phone, e-mail], [combien de temps \xE0 l'avance], [ce qu'il faut fournir]. [Paiement et annulation en une phrase.]",
  "pack.tpl.where": "{name} se trouve [adresse] \xE0 {place}, \xE0 [distance] de [rep\xE8re, gare ou a\xE9roport]. [Comment venir, et le stationnement.]",
  "pack.tpl.reviews": "Les clients notent {name} [note] sur [plateforme] ([nombre] avis). Ils citent souvent [deux points pr\xE9cis]. [Lien vers les avis.]",
  "pack.tpl.contact": "Contactez {name} par t\xE9l\xE9phone au [num\xE9ro] ou par e-mail \xE0 [adresse]. [Quand et en combien de temps vous r\xE9pondez.]",
  "pack.tpl.trust": "Les clients notent {name} [note] sur [plateforme] ([nombre] avis). Ils citent souvent [deux points pr\xE9cis].",
  "pack.tpl.practical": "{name} : [la r\xE9ponse pratique en une phrase]. [Un d\xE9tail qui \xE9vite une question de plus.]",
  "pack.tpl.service": "{name} propose [prestation] \xE0 {place} pour [qui]. [Ce qui est inclus, chiffr\xE9.] [Comment d\xE9marrer.]",
  "pack.tpl.brand": "{name} est une entreprise de type {cat} \xE0 {place} qui [ce qu'elle fait] pour [qui]. [Depuis quand, combien, une preuve.]",
  "pack.gaps.none": "Votre site r\xE9pond \xE0 toutes les questions pr\xE9vues. Testez-les maintenant dans les assistants IA.",
  "pack.q.h": "Questions \xE0 tester dans les assistants IA",
  "pack.q.intro": "Chaque lien ouvre l'assistant avec la question d\xE9j\xE0 tap\xE9e (pour Gemini, collez-la). Posez chaque question plusieurs fois : les r\xE9ponses varient.",
  "pack.aidraft": "Brouillon IA : v\xE9rifiez chaque fait",
  "pack.note.ai": "Les brouillons marqu\xE9s [Brouillon IA] ont \xE9t\xE9 \xE9crits sur votre ordinateur par l'IA int\xE9gr\xE9e de Chrome, \xE0 partir de vos pages. V\xE9rifiez chaque fait avant de publier.",
  "pack.note.tpl": "Aucune IA locale n'\xE9tait disponible : chaque manque a un mod\xE8le de r\xE9daction au lieu d'un brouillon.",
  "pack.measure": "# Mesurer le trafic et la visibilit\xE9 IA (gratuit)\n\n## 1. Google Analytics 4 : un canal \xAB Assistants IA \xBB\nAdministration \u2192 Affichage des donn\xE9es \u2192 Groupes de canaux \u2192 Cr\xE9er un groupe de canaux. Ajoutez un canal \xAB Assistants IA \xBB avec la condition *Source de la session correspond \xE0 l'expression r\xE9guli\xE8re* :\n\n```\n{regex}\n```\n\nPlacez-le au-dessus de \xAB Referral \xBB et enregistrez. ChatGPT ajoute souvent `utm_source=chatgpt.com` \xE0 ses liens, mais certains clics IA arrivent sans r\xE9f\xE9rent et comptent en Direct : consid\xE9rez le chiffre comme un minimum.\n\n## 2. Google Search Console\nPerformances \u2192 IA g\xE9n\xE9rative : les impressions de vos pages dans AI Overviews et AI Mode (depuis juin 2026). \xC0 consulter chaque mois.\n\n## 3. Bing Webmaster Tools\nAI Performance : combien de fois vos pages sont cit\xE9es dans Copilot et les r\xE9sum\xE9s IA de Bing. Gratuit ; validez d'abord votre site.\n\n## 4. Vos propres tests de r\xE9ponses\nUtilisez chaque semaine l'onglet Demander de Sada avec les m\xEAmes questions, dans plusieurs assistants. Suivez la part de r\xE9ponses qui vous citent, pas la position.\n",
  "pack.readme": "# Pack de corrections Sada pour {site}\n\nPr\xE9par\xE9 par Sada le {date}, sur votre ordinateur. {n} fichiers.\n\n1. **1-action-plan.md** : quoi faire, dans l'ordre.\n2. **2-missing-answers.md** : les questions pos\xE9es \xE0 l'IA auxquelles votre site ne r\xE9pond pas encore, avec brouillons. V\xE9rifiez chaque fait avant de publier ; les brouillons IA sont signal\xE9s.\n3. **3-code/** : du code pr\xEAt \xE0 l'emploi tir\xE9 de votre page (robots.txt, donn\xE9es structur\xE9es, balises meta). Ce que Sada ne pouvait pas savoir est marqu\xE9 TODO.\n4. **4-questions-to-test.md** : des liens qui ouvrent chaque assistant avec la question tap\xE9e.\n5. **5-measure-ai-traffic.md** : un suivi gratuit avec Google Analytics, Search Console et Bing.\n6. **data/** : les chiffres (CSV).\n\nVous pr\xE9f\xE9rez qu'on s'en charge ? R\xE9servez un appel sur https://getayka.com/fr/book/ ou \xE9crivez \xE0 hello@getayka.com pour un devis personnalis\xE9.\n",
  "intent.discover": "trouver des options",
  "intent.compare": "comparer",
  "intent.price": "prix",
  "intent.trust": "confiance",
  "intent.practical": "pratique",
  "intent.service": "service",
  "intent.brand": "sur vous",
  "csv.q": "Question",
  "csv.type": "Type",
  "csv.status": "Statut",
  "csv.fit": "Pertinence",
  "csv.page": "Meilleure page",
  "csv.task": "T\xE2che d'agent",
  "csv.score": "Score",
  "csv.issues": "Probl\xE8mes",
  "audit.page": "Cette page",
  "audit.site": "Tout le site",
  "audit.rival": "Concurrent",
  "audit.empty": "V\xE9rifier cette page",
  "audit.empty.d": "Ouvrez une page de votre site, puis v\xE9rifiez-la. Sada la lit sur votre ordinateur.",
  "heat.short": "Surligner",
  "export.short": "Rapport",
  "heat.good": "citable telle quelle",
  "heat.almost": "presque",
  "rw.d2": "Deux r\xE9\xE9critures par l'IA int\xE9gr\xE9e de Chrome, sur cet ordinateur. Les faits manquants deviennent des [espaces \xE0 remplir].",
  "ai.label": "Fait par IA : \xE0 v\xE9rifier avant de publier.",
  "ai.none": "L'IA int\xE9gr\xE9e de Chrome n'est pas disponible sur cet ordinateur (il faut un Chrome r\xE9cent sur un ordinateur assez puissant). Tout le reste de Sada fonctionne sans elle.",
  "rep.title": "Rapport de visibilit\xE9 IA",
  "drive.title": "Test de l'agent",
  "drive.d": "Un agent IA pourrait-il faire la d\xE9marche d'un client sur cette page sans deviner ? Lu depuis la page ; rien n'est cliqu\xE9 ni envoy\xE9.",
  "drive.webmcp.how": "D\xE9clarer votre formulaire principal comme outil",
  "drive.webmcp.ex": "R\xE9server une chambre : dates, personnes, contact",
  "drive.price": "Trouver le prix",
  "drive.price.pass": "Les prix figurent dans les donn\xE9es structur\xE9es ({n}).",
  "drive.price.warn": "Les prix sont visibles dans le texte mais pas dans les donn\xE9es structur\xE9es : les agents peuvent mal les lire.",
  "drive.price.info": "Pas de prix sur cette page. Les agents diront de vous contacter : tr\xE8s bien si vous faites des devis, mais dites clairement comment en obtenir un.",
  "drive.hours": "Trouver les horaires",
  "drive.hours.pass": "Les horaires sont dans les donn\xE9es structur\xE9es.",
  "drive.hours.warn": "Les horaires ne sont que dans le texte ; ajoutez openingHours.",
  "drive.hours.fail": "Aucun horaire trouv\xE9 pour une entreprise locale.",
  "drive.hours.info": "Pas d'horaires (inutile pour une activit\xE9 uniquement en ligne).",
  "drive.contact": "Vous contacter",
  "drive.contact.pass": "Plusieurs moyens lisibles de vous joindre (liens et balisage).",
  "drive.contact.warn": "Un seul moyen lisible de vous contacter. Ajoutez un lien d'appel ou d'e-mail, et le balisage.",
  "drive.contact.fail": "Aucun lien de t\xE9l\xE9phone ou d'e-mail lisible : les agents ne peuvent pas vous joindre.",
  "drive.action": "R\xE9server, acheter ou demander un devis",
  "drive.action.pass": "Une action claire ({n}) avec le balisage correspondant.",
  "drive.action.warn": "{n} liens d'action trouv\xE9s, sans balisage d'action. Suffisant pour la plupart des sites.",
  "drive.action.warn.1": "1 lien d'action trouv\u00e9, sans balisage d'action. Suffisant pour la plupart des sites.",
  "drive.action.fail": "Aucune action claire de r\xE9servation, d'achat ou de devis.",
  "drive.forms": "Remplir le formulaire",
  "drive.forms.pass": "{fields} champs, tous \xE9tiquet\xE9s, avec indications de saisie automatique.",
  "drive.forms.warn": "Tous les champs sont \xE9tiquet\xE9s ; ajoutez autocomplete (nom, e-mail, t\xE9l).",
  "drive.forms.fail": "{unlabeled} champs sur {fields} sans \xE9tiquette : les agents doivent deviner.",
  "drive.forms.info": "Pas de formulaire sur cette page.",
  "drive.names": "Appuyer sur le bon bouton",
  "drive.names.pass": "Chaque bouton et lien a un nom.",
  "drive.names.warn": "{n} boutons ou liens sans nom (ic\xF4ne seule).",
  "drive.names.warn.1": "1 bouton ou lien sans nom (ic\u00f4ne seule).",
  "drive.names.fail": "{n} boutons ou liens sans nom : les agents ne savent pas ce qu'ils font.",
  "drive.names.fail.1": "1 bouton ou lien sans nom : les agents ne savent pas ce qu'il fait.",
  "drive.webmcp": "Utiliser les outils du site (WebMCP)",
  "drive.webmcp.pass": "{n} formulaire(s) d\xE9clar\xE9(s) comme outils d'agent.",
  "drive.webmcp.info": "Pas encore d'outils WebMCP. Facultatif et r\xE9cent : quelques attributs sur votre formulaire principal suffisent.",
  "drive.commerce": "Acheter via un agent (UCP)",
  "drive.commerce.pass": "Ce site publie /.well-known/ucp.",
  "drive.commerce.info": "Pas de fichier /.well-known/ucp. Ne concerne que les boutiques en ligne.",
  "dst.pass": "Clair",
  "dst.warn": "Pas clair",
  "dst.fail": "Bloqu\xE9",
  "dst.info": "Note",
  "lab.title": "Labo de visibilit\xE9",
  "lab.lead": "Posez aux vrais assistants les questions de vos clients. Sada ouvre chacun avec la question d\xE9j\xE0 tap\xE9e, vous rapportez la r\xE9ponse, et Sada tient les comptes.",
  "lab.brand": "Nom de votre entreprise",
  "lab.all": "Voir les {n} questions",
  "lab.fewer": "Voir moins",
  "lab.qs": "Questions",
  "lab.addq": "Ajouter votre question\u2026",
  "lab.add": "Ajouter",
  "lab.step1": "1. Demander",
  "lab.how": "S'ouvre dans votre navigateur, avec votre propre compte. La question est aussi copi\xE9e, au cas o\xF9 il faut la coller. Sada ne lit jamais ces pages.",
  "lab.step2": "2. Rapporter la r\xE9ponse",
  "lab.from": "R\xE9ponse de",
  "lab.paste": "Collez la r\xE9ponse ici",
  "lab.read": "Lire la r\xE9ponse",
  "lab.menu": "Plus rapide : s\xE9lectionnez la r\xE9ponse sur la page de l'assistant, clic droit, puis \xAB Envoyer cette r\xE9ponse IA \xE0 Sada \xBB.",
  "lab.open": "Demander",
  "lab.paste.open": "Copier et ouvrir",
  "lab.rank": "Cit\xE9, n\xB0 {n}",
  "lab.named": "Cit\xE9",
  "lab.notnamed": "Pas cit\xE9",
  "lab.opened": "{engine} ouvert avec votre question.",
  "lab.opened.paste": "Question copi\xE9e. Collez-la dans {engine} (Ctrl+V).",
  "lab.short": "Collez d'abord la r\xE9ponse compl\xE8te.",
  "lab.got": "R\xE9ponse re\xE7ue de {engine}.",
  "lab.v.rank": "{brand} est cit\xE9 : n\xB0 {n} sur {of}.",
  "lab.v.named": "{brand} est cit\xE9.",
  "lab.v.not": "{brand} n'est pas cit\xE9 dans cette r\xE9ponse.",
  "lab.v.facts": "V\xE9rifiez que ces faits sont exacts.",
  "lab.v.others": "Cit\xE9s \xE0 votre place, ou \xE0 c\xF4t\xE9 :",
  "lab.v.src": "Sites sur lesquels la r\xE9ponse s'appuie :",
  "lab.board": "Tableau des scores",
  "lab.share": "{n} r\xE9ponses sur {of} vous citent",
  "lab.comp": "Les plus souvent cit\xE9s",
  "lab.src": "Sources utilis\xE9es par l'IA",
  "lab.src.d": "Votre liste de RP digitales : obtenez une mention sur ces sites.",
  "lab.src.copy": "Copier la liste",
  "lab.honest": "Les r\xE9ponses changent d'une fois \xE0 l'autre. Posez chaque question plusieurs fois : c'est la part de r\xE9ponses qui vous citent qui compte.",
  "lab.empty": "V\xE9rifiez d'abord une page",
  "lab.empty.d": "Sada pr\xE9dit les questions de vos clients \xE0 partir de votre site.",
  "lab.pro": "Envie d'un suivi chaque semaine dans les assistants, avec un rapport mensuel ?",
  "lab.pro.subj": "Suivi de visibilit\xE9 IA",
  "sim.title": "Lecture rapide par l'IA de l'appareil",
  "sim.d": "Comment une IA d\xE9crirait-elle cette page \xE0 partir de son seul texte ? Tourne sur cet ordinateur avec l'IA int\xE9gr\xE9e de Chrome.",
  "sim.run": "D\xE9crire cette page",
  "tab.academy": "Acad\xE9mie",
  "ac.xp": "{xp} XP \xB7 niveau suivant \xE0 {next}",
  "ac.streak.d": "Jours d'affil\xE9e avec au moins une activit\xE9",
  "ac.drill": "Entra\xEEnement du jour",
  "ac.drill.d": "5 questions, environ 2 minutes",
  "ac.drill.done": "L'entra\xEEnement du jour est fait",
  "ac.drill.end": "S\xE9rie : {n} jours. \xC0 demain.",
  "ac.drill.end.1": "S\u00e9rie : 1 jour. \u00c0 demain.",
  "ac.play": "Jouer",
  "ac.tracks": "Parcours",
  "ac.done": "{n}/{of} le\xE7ons",
  "ac.library": "Explications des v\xE9rifications",
  "ac.library.d": "La le\xE7on de 60 secondes derri\xE8re chaque v\xE9rification de Sada.",
  "ac.team": "Former votre \xE9quipe",
  "ac.team.d": "Ateliers pour \xE9quipes marketing et agences, en fran\xE7ais, anglais ou arabe.",
  "ac.team.subj": "Acad\xE9mie pour mon \xE9quipe",
  "ac.team.cta": "Demander une formation d'\xE9quipe",
  "ac.lesson.meta": "3 cartes, un quiz et une mission",
  "ac.prev": "Retour",
  "ac.toquiz": "Quiz",
  "ac.next": "Suivant",
  "ac.try": "Essayez sur votre site",
  "ac.try.go": "Go",
  "ac.back": "Retour \xE0 l'acad\xE9mie",
  "try.mission": "Lancez la mission de l'agent sur votre site et lisez les questions pr\xE9dites.",
  "try.audit": "Ouvrez Audit et regardez cette v\xE9rification sur votre page.",
  "try.heat": "Activez le surligneur sur votre page et comptez les phrases citables.",
  "try.bots": "Jouez \xE0 Garder ou bloquer, puis regardez votre robots.txt dans Audit.",
  "try.quote": "Jouez \xE0 Citable ou pas, puis r\xE9\xE9crivez une phrase faible de votre page.",
  "try.machine": "Ouvrez la vue machine de votre page : quels faits manquent ?",
  "try.drive": "Lancez le test de l'agent sur votre page.",
  "try.rewrite": "Utilisez la r\xE9\xE9criture locale sur votre paragraphe le plus faible.",
  "try.ask": "Posez une question client \xE0 deux assistants et lisez leurs sources.",
  "try.pack": "T\xE9l\xE9chargez le pack et ouvrez le guide de suivi.",
  "game.bots": "Garder ou bloquer",
  "game.bots.d": "Robot de recherche ou d'entra\xEEnement ?",
  "game.quote": "Citable ou pas",
  "game.quote.d": "L'IA la citerait-elle seule ?",
  "game.myth": "Mythe ou fait",
  "game.myth.d": "Les id\xE9es re\xE7ues sur la recherche IA",
  "game.schema": "R\xE9parer le sch\xE9ma",
  "game.schema.d": "Trouvez la ligne cass\xE9e",
  "g.bots.goal": "Votre objectif : appara\xEEtre dans les r\xE9ponses IA, mais garder votre contenu hors de l'entra\xEEnement des IA.",
  "g.bots.ask": "Autoriser ce robot ?",
  "g.quote.ask": "Une IA pourrait-elle citer cette phrase seule ?",
  "g.myth.ask": "Mythe ou fait ?",
  "g.schema.ask": "Quelle ligne contient l'erreur ?",
  "g.keep": "Garder",
  "g.block": "Bloquer",
  "g.quotable": "Citable",
  "g.notquotable": "Pas seule",
  "g.fact": "Fait",
  "g.myth": "Mythe",
  "g.bots.search": "{ua} lit les pages pour r\xE9pondre aux gens : le bloquer vous retire de ces r\xE9ponses.",
  "g.bots.train": "{ua} collecte des donn\xE9es d'entra\xEEnement : le bloquer ne vous retire pas de la recherche IA.",
  "g.score": "{n} / {of}",
  "g.perfect": "Un sans-faute.",
  "g.good": "Bien. Une autre manche ?",
  "g.retry": "Une autre manche vaut le coup : les explications sont la le\xE7on.",
  "g.again": "Rejouer",
  "g.finish": "Voir le score",
  "xp.heat": "surligneur",
  "xp.site": "analyse du site",
  "xp.rival": "concurrent",
  "xp.mission": "mission",
  "xp.answer": "r\xE9ponse lue",
  "xp.sim": "lecture IA",
  "xp.lesson": "le\xE7on",
  "xp.drill": "entra\xEEnement du jour",
  "pro.title": "Quand c'est un projet, pas une simple retouche",
  "pro.lead": "Sada montre quoi corriger. L'\xE9quipe d'AYKA se charge de ce qui prend du temps : balisage sur tout le site, versions linguistiques, contenus qui r\xE9pondent aux questions de vos clients, et mentions sur les sites auxquels l'IA fait confiance.",
  "pro.subj": "Projet avec AYKA",
  "pro.quote": "Chaque projet est diff\xE9rent : nous faisons un devis personnalis\xE9 apr\xE8s un court appel.",
  "pro.from": "Issu de votre mission : {n} projets",
  "pro.from.1": "Issu de votre mission : 1 projet",
  "pro.what": "Ce que nous faisons",
  "pro.free": "Sada reste gratuit",
  "pro.free.d": "L'agent, le labo, l'audit et l'acad\xE9mie sont gratuits, et leur code source est public sur GitHub. Rien n'est envoy\xE9 \xE0 AYKA, sauf si vous r\xE9servez un appel ou nous \xE9crivez.",
  "set.back": "Retour",
  "set.theme": "Apparence",
  "set.theme.auto": "Auto",
  "set.theme.light": "Clair",
  "set.theme.dark": "Sombre",
  "set.remind": "Rappel hebdomadaire",
  "set.remind.d": "Une notification tous les 7 jours pour retester vos questions. D\xE9sactiv\xE9 par d\xE9faut.",
  "ai.title": "IA sur l'appareil",
  "ai.checking": "V\xE9rification\u2026",
  "ai.ready": "Pr\xEAte : l'IA int\xE9gr\xE9e de Chrome tourne sur cet ordinateur.",
  "ai.ready.tr": "Pr\xEAte : l'IA int\xE9gr\xE9e de Chrome, avec traduction locale pour cette langue.",
  "ai.dl": "Disponible apr\xE8s un t\xE9l\xE9chargement unique par Chrome ; il d\xE9marre la premi\xE8re fois que vous utilisez une fonction IA.",
  "ai.how": "Sada n'utilise aucun service d'IA ni cl\xE9 d'API. L\xE0 o\xF9 l'IA int\xE9gr\xE9e de Chrome (Gemini Nano) existe, Sada s'en sert pour les brouillons et r\xE9\xE9critures ; tout le reste fonctionne sans elle.",
  "set.privacy.t": "Confidentialit\xE9",
  "set.privacy2": "Sada ne lit que le site o\xF9 vous \xEAtes, quand vous le demandez. Les r\xE9sultats, les r\xE9ponses coll\xE9es et votre progression restent dans ce navigateur. Rien n'est envoy\xE9 \xE0 AYKA ni \xE0 personne.",
  "set.reset": "Supprimer toutes les donn\xE9es de Sada",
  "set.reset.q": "Supprimer toutes les donn\xE9es de Sada dans ce navigateur ?",
  "trust.strip": "S\xFBr au travail : tourne dans votre navigateur, n'envoie rien. Voir la preuve",
  "trust.title": "Centre de confiance",
  "trust.lead": "Sada fonctionne enti\xE8rement dans votre navigateur. Voici ses r\xE8gles, et la preuve en direct de chaque requ\xEAte faite pendant cette session.",
  "trust.managed": "{n} r\xE9glages g\xE9r\xE9s par votre organisation.",
  "trust.managed.1": "1 r\u00e9glage g\u00e9r\u00e9 par votre organisation.",
  "trust.promises": "Ce que Sada fait, et ne fait jamais",
  "trust.p.browser": "Tourne sur cet ordinateur",
  "trust.p.browser.d": "Chaque v\xE9rification, la mission, le pack et le score tournent dans votre navigateur. Il n'y a pas de serveur Sada.",
  "trust.p.noai": "Aucun service d'IA, aucune cl\xE9 d'API",
  "trust.p.noai.d": "Les brouillons utilisent l'IA int\xE9gr\xE9e au navigateur, sur cet appareil, quand elle existe. Aucun texte ne part chez un fournisseur d'IA.",
  "trust.p.nosend": "N'envoie rien \xE0 AYKA ni \xE0 personne",
  "trust.p.nosend.d": "Pas de compte, pas de statistiques, pas de pistage, pas d'identifiant publicitaire. Vous seul d\xE9cidez de nous contacter.",
  "trust.p.readonly": "Lecture seule, seulement l'onglet ouvert",
  "trust.p.readonly.d": "Sada lit l'onglet que vous regardez : après votre clic, ou quand vous changez d'onglet si vous avez autorisé tous les sites et laissé « Suivre l'onglet actif » activé. Les autres pages du même site sont récupérées sans cookies. Sur un réseau social, Sada lit seulement les champs du profil qu'il vérifie, tels que votre onglet les affiche ; jamais les messages ni les réglages du compte.",
  "trust.p.noact": "Ne clique, ne tape et n'envoie jamais rien",
  "trust.p.noact.d": "Sada ne remplit aucun formulaire, ne se connecte pas, ne publie rien et ne modifie aucun site. Les assistants IA s'ouvrent seulement sur votre clic, dans un onglet normal.",
  "trust.p.open": "Code public et lisible",
  "trust.p.open.d": "FSL-1.1-ALv2 (Apache-2.0 apr\xE8s deux ans), non minifi\xE9, aucun code distant (politique de s\xE9curit\xE9 stricte). Votre service informatique peut lire et v\xE9rifier chaque ligne.",
  "trust.live": "Preuve en direct : cette session",
  "trust.zero": "requ\xEAte vers des serveurs tiers par Sada",
  "trust.live.d": "{n} requ\xEAtes sont all\xE9es au site que vous v\xE9rifiez (ou au concurrent indiqu\xE9). {t} onglet(s) d'assistant ouvert(s) par vous.",
  "trust.none": "Aucune requ\xEAte pour l'instant dans cette session.",
  "trust.verify": "V\xE9rifiez vous-m\xEAme : clic droit sur ce panneau, Inspecter, puis l'onglet R\xE9seau.",
  "trust.why.social": "le compte social contr\u00f4l\u00e9",
  "trust.why.page": "la page v\xE9rifi\xE9e",
  "trust.why.site": "pages du m\xEAme site",
  "trust.why.rival": "le concurrent indiqu\xE9",
  "trust.why.assistant": "onglet ouvert par vous",
  "trust.perms": "Autorisations, et pourquoi",
  "trust.perm.activeTab": "Lire la page o\xF9 vous \xEAtes, seulement apr\xE8s votre clic.",
  "trust.perm.scripting": "Ex\xE9cuter le code de lecture dans cette page (lecture seule).",
  "trust.perm.sidePanel": "Afficher Sada \xE0 c\xF4t\xE9 de la page.",
  "trust.perm.storage": "Garder vos r\xE9sultats et votre progression dans ce navigateur.",
  "trust.perm.contextMenus": "L'option du clic droit pour les r\xE9ponses que vous s\xE9lectionnez.",
  "trust.perm.favicon": "Afficher l'ic\xF4ne du site dans la mesure.",
  "trust.perm.alarms": "Rappel hebdomadaire, rappels de publication et vérifications de veille, seulement si vous les activez.",
  "trust.perm.notifications": "Facultatif, demandé seulement pour les rappels et les alertes de veille.",
  "trust.perm.sites.n": "acc\xE8s aux sites",
  "trust.perm.sites": "Facultatif. Demandé une fois pour que Sada se mette à jour quand vous changez d'onglet, lise les réseaux sociaux et vérifie un site concurrent. Retirable à tout moment dans Chrome : Extensions → Sada → Détails → Accès aux sites.",
  "trust.stored": "Enregistr\xE9 dans ce navigateur uniquement",
  "trust.stored.d": "{missions} mission(s), {answers} r\xE9ponse(s) rapport\xE9e(s), {lessons} trace(s) de le\xE7ons. Rien n'est synchronis\xE9 ni envoy\xE9.",
  "trust.it": "Pour les \xE9quipes informatique et s\xE9curit\xE9",
  "trust.it.d": "D\xE9ployez Sada avec les strat\xE9gies Chrome ou Edge et d\xE9sactivez des fonctions de fa\xE7on centralis\xE9e. La fiche de revue couvre flux de donn\xE9es, autorisations, strat\xE9gies et v\xE9rification de la build.",
  "pol.disableAssistantLinks": "Ne jamais ouvrir d'assistants IA (questions seulement copi\xE9es)",
  "pol.disableRival": "Pas de lecture de sites concurrents",
  "pol.disableSiteScan": "Lire seulement la page en cours, pas le reste du site",
  "pol.disableOnDeviceAI": "Ne pas utiliser l'IA int\xE9gr\xE9e au navigateur",
  "pol.hideContactOffers": "Masquer les offres pour contacter AYKA",
  "pol.on": "Activ\xE9",
  "pol.off": "D\xE9sactiv\xE9",
  "trust.it.doc": "Fiche de revue s\xE9curit\xE9",
  "trust.it.build": "Empreintes SHA-256 publi\xE9es \xE0 chaque version",
  "lab.copied.only": "Question copi\xE9e. Votre organisation n'autorise pas Sada \xE0 ouvrir {engine} : collez-la vous-m\xEAme.",
  "lab.copy": "Copier la question",
  "lab.nudge": "Ici, l'IA a recommand\xE9 {comp} \xE0 votre place.",
  "lab.nudge.cta": "Savoir pourquoi, lors d'un bilan gratuit",
  "lab.nudge.note": "L'IA a cit\xE9 {comp} \xE0 notre place pour : {q}",
  "plan.progress": "{n} sur {of} faits",
  "plan.mark": "Marquer comme fait",
  "xp.plan": "\xE9tape du plan faite",
  "ns.kicker": "Votre prochaine \xE9tape",
  "ns.comp": "Dans vos tests, l'IA a cit\xE9 {comp} {n} fois ; vous avez \xE9t\xE9 cit\xE9 dans {named} r\xE9ponses sur {of}.",
  "ns.gaps": "Votre site laisse {n} questions clients sur {of} sans r\xE9ponse claire, dont {open} o\xF9 l'IA choisit une entreprise.",
  "ns.good": "Votre site r\xE9pond aux questions des clients. Prochaine \xE9tape : \xEAtre cit\xE9 sur les sites auxquels l'IA fait confiance.",
  "ns.body": "R\xE9servez un bilan gratuit de 30 minutes. Nous passons votre mission en revue avec vous et vous disons quoi faire en premier. Vous gardez le pack et le plan dans tous les cas, sans engagement.",
  "ns.get1": "Votre plan class\xE9 pour votre activit\xE9 et votre march\xE9",
  "ns.get2": "Les sites auxquels l'IA fait confiance dans votre secteur, et comment y figurer",
  "ns.get3": "Un oui ou un non clair : avez-vous besoin d'aide ?",
  "ns.book": "R\xE9server un bilan gratuit de 30 min",
  "ns.mail": "M'envoyer mes r\xE9sultats par e-mail",
  "ns.mail.subj": "Bilan de ma mission Sada",
  "ns.shares": "La r\xE9servation ouvre getayka.com et ne transmet que ce que vous voyez : l'adresse du site, le score, les questions r\xE9pondues et les titres du plan.",
  "tier.free": "Le faire vous-m\xEAme",
  "tier.free.p": "Gratuit, pour toujours",
  "tier.free.1": "La mission de l'agent et le pack",
  "tier.free.2": "Le labo de visibilit\xE9 dans 8 assistants",
  "tier.free.3": "Audit, analyse du site et concurrent",
  "tier.free.4": "L'acad\xE9mie et les jeux",
  "tier.free.cta": "Lancer une mission",
  "tier.review": "Bilan gratuit",
  "tier.review.p": "30 minutes, sans engagement",
  "tier.review.1": "Nous lisons votre mission et votre pack avec vous",
  "tier.review.2": "Vos trois actions prioritaires, dans l'ordre",
  "tier.review.3": "Une r\xE9ponse honn\xEAte : avez-vous besoin de nous ?",
  "tier.done": "Fait pour vous",
  "tier.done.p": "Devis personnalis\xE9, p\xE9rim\xE8tre fixe",
  "tier.done.1": "Balisage sur tout le site et versions linguistiques",
  "tier.done.2": "Des contenus qui r\xE9pondent aux questions de vos clients",
  "tier.done.3": "RP digitales sur les sites utilis\xE9s par l'IA",
  "tier.done.4": "Suivi hebdomadaire avec rapport mensuel",
  "pro.how": "Comment se d\xE9roule un projet",
  "pro.how.1": "Bilan gratuit",
  "pro.how.1.d": "30 minutes sur les r\xE9sultats de votre mission.",
  "pro.how.2": "Proposition \xE9crite",
  "pro.how.2.d": "P\xE9rim\xE8tre et prix fixes, par \xE9crit, avant tout travail.",
  "pro.how.3": "Le travail",
  "pro.how.3.d": "Sur votre site, avec votre \xE9quipe, \xE9tape par \xE9tape.",
  "pro.how.4": "Avant et apr\xE8s",
  "pro.how.4.d": "Relancez la m\xEAme mission Sada : vous voyez le changement vous-m\xEAme.",
  "pro.never": "Ce que nous ne faisons jamais",
  "pro.never.1": "De faux avis ou des avis pay\xE9s",
  "pro.never.2": "Des modifications non d\xE9clar\xE9es sur Wikip\xE9dia ou des forums",
  "pro.never.3": "Des r\xE9seaux de liens ou des annuaires spam",
  "pro.never.4": "Des promesses de classement ou de citation par l'IA",
  "audit.remote": "V\xE9rifi\xE9e sans l'ouvrir. Le surligneur fonctionne sur la page ouverte dans votre onglet.",
  "rw.tools": "R\xE9\xE9crire avec l'IA de l'appareil",
  "rw.tools.d": "De meilleures versions de votre ouverture et de vos phrases, \xE9crites sur cet ordinateur. Les faits manquants deviennent des [espaces \xE0 remplir].",
  "site.checkpage": "V\xE9rifier",
  "audit.backopen": "Page de l'onglet",
  "ab.title": "Votre organisation",
  "ab.edit.d": "Sada \xE9crit les questions \xE0 partir de ceci. Soyez pr\xE9cis : la pertinence du test en d\xE9pend.",
  "ab.name": "Nom",
  "ab.cat": "Ce que vous \u00eates, en vos mots (facultatif)",
  "ab.cat.ph": "ex. universit\u00e9, lieu de m\u00e9moire, agence SEO",
  "ab.svc": "Offres ou th\u00e8mes (s\u00e9par\u00e9s par des virgules)",
  "ab.svc.ph": "ex. Data Science, visites guid\u00e9es, SEO",
  "ab.aud": "Vos clients",
  "ab.aud.ph": "ex. boutiques en ligne, familles, startups",
  "ab.mkt": "Ville, r\u00e9gion ou pays (facultatif)",
  "ab.mkt.ph": "ex. Lyon, Bavi\u00e8re, Allemagne",
  "ab.save": "Enregistrer et mettre \xE0 jour les questions",
  "ab.cancel": "Annuler",
  "ab.confirmed": "Confirm\xE9",
  "ab.change": "Modifier",
  "ab.q": "Est-ce exact ? Les questions en d\xE9pendent.",
  "ab.yes": "Oui, c'est exact",
  "ab.fix": "Corriger",
  "ab.kind": "Secteur",
  "ab.aka": "Aussi appel\u00e9",
  "ab.saved": "Enregistr\xE9. Les questions sont \xE0 jour.",
  "ap.pick": "Questions \xE0 tester",
  "ap.engines": "Assistants",
  "ap.start": "Lancer le pilote automatique : {n} tests",
  "ap.how1": "Sada ouvre chaque assistant dans votre navigateur avec la question d\xE9j\xE0 tap\xE9e.",
  "ap.how1.copy": "Sada copie chaque question ; vous la collez dans l'assistant.",
  "ap.how2": "Quand la r\xE9ponse est pr\xEAte, cliquez sur le bouton copier de l'assistant, puis sur Coller et lire (ou s\xE9lectionnez-la et appuyez sur Alt+Maj+A).",
  "ap.how3": "Sada la note et ouvre le test suivant tout seul.",
  "ap.title": "Pilote automatique",
  "ap.count": "Test {n} sur {of}",
  "ap.wait": "{engine} est ouvert avec la question. Attendez la r\xE9ponse compl\xE8te.",
  "ap.wait.paste": "La question est copi\xE9e : collez-la dans {engine} (Ctrl+V), puis attendez la r\xE9ponse compl\xE8te.",
  "ap.paste": "Coller et lire la r\xE9ponse",
  "ap.or": "ou s\xE9lectionnez la r\xE9ponse et appuyez sur Alt+Maj+A, ou clic droit \xAB Envoyer cette r\xE9ponse IA \xE0 Sada \xBB",
  "ap.manual": "La coller ici \xE0 la place",
  "ap.reopen": "Rouvrir",
  "ap.skip": "Passer",
  "ap.stop": "Arr\xEAter",
  "ap.done": "Pilote automatique termin\xE9 : {n} tests. R\xE9sultats ci-dessous.",
  "ap.empty": "Le presse-papiers est vide : copiez d'abord la r\xE9ponse.",
  "ap.noclip": "Sada n'a pas pu lire le presse-papiers. Collez la r\xE9ponse dans le champ (Ctrl+V).",
  "ap.select": "S\xE9lectionnez d'abord le texte de la r\xE9ponse, puis appuyez sur Alt+Maj+A.",
  "ap.fromagent": "Tester ces questions dans les assistants IA",
  "lab.lead2": "D\xE9couvrez si ChatGPT, Gemini, Perplexity et les autres vous recommandent, pour les questions que vos clients posent vraiment.",
  "lab.pro2": "Envie que ce test tourne automatiquement chaque semaine dans les assistants, avec un rapport mensuel ? C'est notre service de suivi.",
  "xp.autopilot": "pilote automatique",
  "trust.perm.clipboardRead": "Facultatif, demand\xE9 seulement si vous utilisez Coller et lire.",
  "ai.dl.run": "Pr\xE9paration de l'IA int\xE9gr\xE9e de Chrome (t\xE9l\xE9chargement unique, en arri\xE8re-plan) : {p} %",
  "ai.dl.done": "L'IA int\xE9gr\xE9e de Chrome est pr\xEAte sur cet ordinateur."
};

// apps/extension/src/ui/icons.ts
var ICONS = {
  "user-check": '<path d="m16 11 2 2 4-4"/><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  "radar": '<path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/> <path d="M4 6h.01"/> <path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/> <path d="M16.24 7.76A6 6 0 1 0 8.23 16.67"/> <path d="M12 18h.01"/> <path d="M17.99 11.66A6 6 0 0 1 15.77 16.67"/> <circle cx="12" cy="12" r="2"/> <path d="m13.41 10.59 5.66-5.66"/>',
  "scan-search": '<path d="M3 7V5a2 2 0 0 1 2-2h2"/> <path d="M17 3h2a2 2 0 0 1 2 2v2"/> <path d="M21 17v2a2 2 0 0 1-2 2h-2"/> <path d="M7 21H5a2 2 0 0 1-2-2v-2"/> <circle cx="12" cy="12" r="3"/> <path d="m16 16-1.9-1.9"/>',
  "sparkles": '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/> <path d="M20 2v4"/> <path d="M22 4h-4"/> <circle cx="4" cy="20" r="2"/>',
  "bot": '<path d="M12 8V4H8"/> <rect width="16" height="12" x="4" y="8" rx="2"/> <path d="M2 14h2"/> <path d="M20 14h2"/> <path d="M15 13v2"/> <path d="M9 13v2"/>',
  "graduation-cap": '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/> <path d="M22 10v6"/> <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  "gem": '<path d="M10.5 3 8 9l4 13 4-13-2.5-6"/> <path d="M17 3a2 2 0 0 1 1.6.8l3 4a2 2 0 0 1 .013 2.382l-7.99 10.986a2 2 0 0 1-3.247 0l-7.99-10.986A2 2 0 0 1 2.4 7.8l2.998-3.997A2 2 0 0 1 7 3z"/> <path d="M2 9h20"/>',
  "play": '<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/>',
  "check": '<path d="M20 6 9 17l-5-5"/>',
  "x": '<path d="M18 6 6 18"/> <path d="m6 6 12 12"/>',
  "triangle-alert": '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/> <path d="M12 9v4"/> <path d="M12 17h.01"/>',
  "info": '<circle cx="12" cy="12" r="10"/> <path d="M12 16v-4"/> <path d="M12 8h.01"/>',
  "chevron-right": '<path d="m9 18 6-6-6-6"/>',
  "chevron-left": '<path d="m15 18-6-6 6-6"/>',
  "chevron-down": '<path d="m6 9 6 6 6-6"/>',
  "download": '<path d="M12 15V3"/> <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/> <path d="m7 10 5 5 5-5"/>',
  "copy": '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/> <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  "external-link": '<path d="M15 3h6v6"/> <path d="M10 14 21 3"/> <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  "refresh-cw": '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/> <path d="M21 3v5h-5"/> <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/> <path d="M8 16H3v5"/>',
  "settings": '<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/> <circle cx="12" cy="12" r="3"/>',
  "sun": '<circle cx="12" cy="12" r="4"/> <path d="M12 2v2"/> <path d="M12 20v2"/> <path d="m4.93 4.93 1.41 1.41"/> <path d="m17.66 17.66 1.41 1.41"/> <path d="M2 12h2"/> <path d="M20 12h2"/> <path d="m6.34 17.66-1.41 1.41"/> <path d="m19.07 4.93-1.41 1.41"/>',
  "moon": '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>',
  "globe": '<circle cx="12" cy="12" r="10"/> <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/> <path d="M2 12h20"/>',
  "file-text": '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/> <path d="M14 2v5a1 1 0 0 0 1 1h5"/> <path d="M10 9H8"/> <path d="M16 13H8"/> <path d="M16 17H8"/>',
  "file-code": '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/> <path d="M14 2v5a1 1 0 0 0 1 1h5"/> <path d="M10 12.5 8 15l2 2.5"/> <path d="m14 12.5 2 2.5-2 2.5"/>',
  "zap": '<path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"/>',
  "target": '<circle cx="12" cy="12" r="10"/> <circle cx="12" cy="12" r="6"/> <circle cx="12" cy="12" r="2"/>',
  "trophy": '<path d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2"/> <path d="M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2"/> <path d="M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3"/> <path d="M4 22h16"/> <path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/> <path d="M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3"/>',
  "flame": '<path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/>',
  "star": '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
  "lock": '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/> <path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  "shield-check": '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/> <path d="m9 12 2 2 4-4"/>',
  "eye": '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/> <circle cx="12" cy="12" r="3"/>',
  "eye-off": '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/> <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/> <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/> <path d="m2 2 20 20"/>',
  "highlighter": '<path d="m9 11-6 6v3h9l3-3"/> <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
  "message-square-quote": '<path d="M14 14a2 2 0 0 0 2-2V8h-2"/> <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/> <path d="M8 14a2 2 0 0 0 2-2V8H8"/>',
  "quote": '<path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/> <path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>',
  "list-checks": '<path d="M13 5h8"/> <path d="M13 12h8"/> <path d="M13 19h8"/> <path d="m3 17 2 2 4-4"/> <path d="m3 7 2 2 4-4"/>',
  "map": '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/> <path d="M15 5.764v15"/> <path d="M9 3.236v15"/>',
  "layers": '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/> <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/> <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>',
  "link": '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/> <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  "mail": '<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/> <rect x="2" y="4" width="20" height="16" rx="2"/>',
  "phone": '<path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/>',
  "calendar": '<path d="M8 2v3"/> <path d="M16 2v3"/> <rect x="3" y="3" width="18" height="18" rx="2"/> <path d="M3 9h18"/>',
  "compass": '<circle cx="12" cy="12" r="10"/> <path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/>',
  "flag": '<path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"/>',
  "swords": '<path d="m13 19 6-6"/> <path d="M14.5 17.5 3.586 6.586A2 2 0 013 5.172V3h2.172a2 2 0 011.414.586L17.5 14.5"/> <path d="m14.828 6.172 2.586-2.586A2 2 0 0118.828 3H21v2.172a2 2 0 01-.586 1.414l-2.586 2.586"/> <path d="m16 16 4 4"/> <path d="m19 21 2-2"/> <path d="m5 14 4 4"/> <path d="m5 21-2-2"/> <path d="M7.5 16.5 4 20"/>',
  "clipboard-paste": '<path d="M11 14h10"/> <path d="M16 4h2a2 2 0 0 1 2 2v1.344"/> <path d="m17 18 4-4-4-4"/> <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 1.793-1.113"/> <rect x="8" y="2" width="8" height="4" rx="1"/>',
  "send": '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/> <path d="m21.854 2.147-10.94 10.939"/>',
  "circle-check": '<circle cx="12" cy="12" r="10"/> <path d="m16 9-5.5 5.5L8 12"/>',
  "circle-x": '<circle cx="12" cy="12" r="10"/> <path d="m15 9-6 6"/> <path d="m9 9 6 6"/>',
  "circle-dashed": '<path d="M10.1 2.182a10 10 0 0 1 3.8 0"/> <path d="M13.9 21.818a10 10 0 0 1-3.8 0"/> <path d="M17.609 3.721a10 10 0 0 1 2.69 2.7"/> <path d="M2.182 13.9a10 10 0 0 1 0-3.8"/> <path d="M20.279 17.609a10 10 0 0 1-2.7 2.69"/> <path d="M21.818 10.1a10 10 0 0 1 0 3.8"/> <path d="M3.721 6.391a10 10 0 0 1 2.7-2.69"/> <path d="M6.391 20.279a10 10 0 0 1-2.69-2.7"/>',
  "loader-circle": '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>',
  "book-open": '<path d="M12 5v16"/> <path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z"/>',
  "lightbulb": '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/> <path d="M9 18h6"/> <path d="M10 22h4"/>',
  "puzzle": '<path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z"/>',
  "gamepad-2": '<line x1="6" x2="10" y1="11" y2="11"/> <line x1="8" x2="8" y1="9" y2="13"/> <line x1="15" x2="15.01" y1="12" y2="12"/> <line x1="18" x2="18.01" y1="10" y2="10"/> <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/>',
  "crown": '<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/> <path d="M5 21h14"/>',
  "award": '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/> <circle cx="12" cy="8" r="6"/>',
  "timer": '<line x1="10" x2="14" y1="2" y2="2"/> <line x1="12" x2="15" y1="14" y2="11"/> <circle cx="12" cy="14" r="8"/>',
  "bell": '<path d="M10.268 21a2 2 0 0 0 3.464 0"/> <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
  "share-2": '<circle cx="18" cy="5" r="3"/> <circle cx="6" cy="12" r="3"/> <circle cx="18" cy="19" r="3"/> <line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/> <line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
  "wand-sparkles": '<path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/> <path d="m14 7 3 3"/> <path d="M5 6v4"/> <path d="M19 14v4"/> <path d="M10 2v2"/> <path d="M7 8H3"/> <path d="M21 16h-4"/> <path d="M11 3H9"/>',
  "scroll-text": '<path d="M15 12h-5"/> <path d="M15 8h-5"/> <path d="M19 17V5a2 2 0 0 0-2-2H4"/> <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/>',
  "store": '<path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5"/> <path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244"/> <path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05"/>',
  "mouse-pointer-click": '<path d="M14 4.1 12 6"/> <path d="m5.1 8-2.9-.8"/> <path d="m6 12-1.9 2"/> <path d="M7.2 2.2 8 5.1"/> <path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z"/>',
  "keyboard": '<path d="M10 8h.01"/> <path d="M12 12h.01"/> <path d="M14 8h.01"/> <path d="M16 12h.01"/> <path d="M18 8h.01"/> <path d="M6 8h.01"/> <path d="M7 16h10"/> <path d="M8 12h.01"/> <rect width="20" height="16" x="2" y="4" rx="2"/>',
  "languages": '<path d="m5 8 6 6"/> <path d="m4 14 6-6 2-3"/> <path d="M2 5h12"/> <path d="M7 2h1"/> <path d="m22 22-5-10-5 10"/> <path d="M14 18h6"/>',
  "search": '<path d="m21 21-4.34-4.34"/> <circle cx="11" cy="11" r="8"/>',
  "arrow-right": '<path d="M5 12h14"/> <path d="m12 5 7 7-7 7"/>',
  "arrow-left": '<path d="m12 19-7-7 7-7"/> <path d="M19 12H5"/>',
  "plus": '<path d="M5 12h14"/> <path d="M12 5v14"/>',
  "trash-2": '<path d="M10 11v6"/> <path d="M14 11v6"/> <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/> <path d="M3 6h18"/> <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  "history": '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/> <path d="M3 3v5h5"/> <path d="M12 7v5l4 2"/>',
  "chart-column": '<path d="M3 3v16a2 2 0 0 0 2 2h16"/> <path d="M18 17V9"/> <path d="M13 17V5"/> <path d="M8 17v-3"/>',
  "shopping-cart": '<path d="m2.05 2.05 1.099-.028a1 1 0 0 1 1.008.815l2.69 14.347A1 1 0 0 0 7.83 18H18"/> <path d="M4.563 5h16.435a1 1 0 0 1 .981 1.204l-1.026 6.226A2 2 0 0 1 18.962 14H6.25"/> <circle cx="18" cy="20" r="2"/> <circle cx="8" cy="20" r="2"/>',
  "building-2": '<path d="M10 12h4"/> <path d="M10 8h4"/> <path d="M14 21v-3a2 2 0 0 0-4 0v3"/> <path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"/> <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/>',
  "users": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/> <path d="M16 3.128a4 4 0 0 1 0 7.744"/> <path d="M22 21v-2a4 4 0 0 0-3-3.87"/> <circle cx="9" cy="7" r="4"/>',
  "newspaper": '<path d="M15 18h-5"/> <path d="M18 14h-8"/> <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2"/> <rect width="8" height="4" x="10" y="6" rx="1"/>',
  "message-circle": '<path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/>',
  "handshake": '<path d="m11 17 2 2a1 1 0 1 0 3-3"/> <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/> <path d="m21 3 1 11h-2"/> <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/> <path d="M3 4h8"/>',
  "briefcase": '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/> <rect width="20" height="14" x="2" y="6" rx="2"/>',
  "rocket": '<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/> <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09"/> <path d="M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z"/> <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05"/>',
  "file-archive": '<path d="M13.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v11.5"/> <path d="M14 2v5a1 1 0 0 0 1 1h5"/> <path d="M8 12v-1"/> <path d="M8 18v-2"/> <path d="M8 7V6"/> <circle cx="8" cy="20" r="2"/>',
  "brain": '<path d="M12 18V5"/> <path d="M15 13a4.17 4.17 0 01-3-4 4.17 4.17 0 01-3 4"/> <path d="M17.707 6.294A3 3 0 1012 5a3 3 0 10-5.707 1.294"/> <path d="M17.996 5.125a4 4 0 012.526 5.77"/> <path d="M18 18a4 4 0 002-7.465"/> <path d="M19.967 17.482a4 4 0 11-7.967.517 4 4 0 11-7.967-.517"/> <path d="M6 18a4 4 0 01-2-7.465"/> <path d="M6.004 5.125a4 4 0 00-2.526 5.77"/>',
  "route": '<circle cx="6" cy="19" r="3"/> <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/> <circle cx="18" cy="5" r="3"/>',
  "list-todo": '<path d="M13 5h8"/> <path d="M13 12h8"/> <path d="M13 19h8"/> <path d="m3 17 2 2 4-4"/> <rect x="3" y="4" width="6" height="6" rx="1"/>',
  "circle-help": '<circle cx="12" cy="12" r="10"/> <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/> <path d="M12 17h.01"/>',
  "thumbs-up": '<path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/> <path d="M7 10v12"/>',
  "thumbs-down": '<path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/> <path d="M17 14V2"/>',
  "shuffle": '<path d="m18 14 4 4-4 4"/> <path d="m18 2 4 4-4 4"/> <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"/> <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"/> <path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"/>',
  "medal": '<path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/> <path d="M11 12 5.12 2.2"/> <path d="m13 12 5.88-9.8"/> <path d="M8 7h8"/> <circle cx="12" cy="17" r="5"/> <path d="M12 18v-2h-.5"/>',
  "hourglass": '<path d="M5 22h14"/> <path d="M5 2h14"/> <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/> <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>'
};

// apps/extension/src/ui/core.ts
var UI = { en: en_default2, fr: fr_default2, de: de_default2, ar: ar_default2 };
var BOOK2 = { en: "https://getayka.com/book/", de: "https://getayka.com/book/", fr: "https://getayka.com/fr/book/", ar: "https://getayka.com/ar/book/" };
var MAIL = "hello@getayka.com";
var REPO = "https://github.com/ayka-technologies/sada";
var SITE_MAX = 30;
var S = {
  stu: { sec: "profiles", ch: "", src: "q", qid: "", topic: "", tlink: "", plats: null, utm: true, aiLabel: false, kitAi: {}, busy: "", plan: { weeks: 4, day: 2, time: "10:00" } },
  stuSite: "",
  channels: {},
  posts: [],
  watch: { on: false, freq: "weekly", notify: true, skip: [] },
  wAlerts: [],
  wSnaps: {},
  wLast: 0,
  wHist: {},
  wSeen: 0,
  wPerm: null,
  cms: {},
  lang: "en",
  uiLang: "auto",
  theme: "auto",
  tab: "agent",
  settings: false,
  toast: "",
  tabId: 0,
  page: null,
  report: null,
  fixes: [],
  brand: "",
  err: "",
  busy: false,
  prev: null,
  hist: {},
  mission: null,
  missions: {},
  pack: null,
  audit: "page",
  open: {},
  heat: false,
  heatInfo: null,
  rw: {},
  site: null,
  siteBusy: false,
  siteErr: "",
  cmp: null,
  cmpUrl: "",
  cmpBusy: false,
  cmpErr: "",
  drive: null,
  runs: {},
  customQ: {},
  qSel: "",
  pasteEngine: "chatgpt",
  pasteText: "",
  lastCheck: null,
  sim: null,
  simBusy: false,
  simErr: "",
  simStatus: "",
  xp: 0,
  streak: { day: "", n: 0 },
  done: {},
  ac: { view: "home" },
  game: null,
  reminder: false,
  ai: null,
  aiDl: null,
  trust: false,
  net: [],
  policy: {},
  planDone: {},
  profiles: {},
  auto: null,
  askSel: null,
  editProfile: false,
  social: null,
  socialMode: false,
  autoSocial: false,
  sites: {},
  shown: null,
  stale: null,
  follow: true
};
function netLog(urls, why) {
  for (const u of urls) S.net.push({ url: u, why, at: Date.now() });
  if (S.net.length > 600) S.net.splice(0, S.net.length - 600);
}
var pol = (k) => !!S.policy?.[k];
var esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function T(k, v = {}) {
  if (v.n === 1 && (UI.en[k + ".1"] ?? STR.en[k + ".1"]) !== void 0) k += ".1";
  const s = UI[S.lang]?.[k] ?? UI.en[k];
  if (s === void 0) return t(S.lang, k, v);
  return s.replace(/\{(\w+)\}/g, (_, x) => v[x] === void 0 ? "" : String(v[x]));
}
function icon(name, cls = "") {
  return `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}
var hostOf = (u) => {
  try {
    return new URL(u || "").hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};
var host = () => hostOf(S.report?.url || S.mission?.url || "");
var originOf = (u) => {
  try {
    return new URL(u || "").origin;
  } catch {
    return "";
  }
};
var favicon = (u) => {
  try {
    return chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(u)}&size=64`);
  } catch {
    return "";
  }
};
var parse = (h) => new DOMParser().parseFromString(h, "text/html");
var today = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
async function load() {
  const st = await chrome.storage.local.get(["uiLang", "theme", "brand", "hist", "cmpUrl", "missions", "runs", "customQ", "xp", "xpLog", "streak", "done", "reminder", "planDone", "profiles", "sites", "follow"]);
  // Chrome can take seconds to answer for managed policies on a fresh profile: do not wait for it to show the panel
  S.policy = {};
  const pol0 = Promise.resolve(chrome.storage.managed?.get?.(null)).then((p) => p || {}).catch(() => ({}));
  const quick = await Promise.race([pol0, new Promise((r) => setTimeout(() => r(null), 250))]);
  if (quick) S.policy = quick;
  else pol0.then((p) => {
    if (Object.keys(p).length) {
      S.policy = p;
      render();
    }
  });
  Object.assign(S, {
    hist: st.hist || {},
    cmpUrl: st.cmpUrl || "",
    uiLang: st.uiLang || "auto",
    theme: st.theme || "auto",
    brand: st.brand || "",
    missions: st.missions || {},
    runs: st.runs || {},
    customQ: st.customQ || {},
    xp: st.xp || 0,
    xpLog: st.xpLog || {},
    streak: st.streak || { day: "", n: 0 },
    done: st.done || {},
    reminder: !!st.reminder,
    planDone: st.planDone || {},
    sites: { ...st.sites || {}, ...S.sites },
    follow: st.follow !== false,
    profiles: { ...st.profiles || {}, ...S.profiles }
  });
  S.lang = S.uiLang === "auto" ? detectLang(chrome.i18n?.getUILanguage?.() || navigator.language) : S.uiLang;
}
var save = (o) => chrome.storage.local.set(o).catch(() => {
});
var renderer = () => {
};
var setRenderer = (f2) => {
  renderer = f2;
};
var queued = false;
function render() {
  if (queued) return;
  queued = true;
  // animation frames can pause (panel in the background); a timer makes sure the render still happens
  let ran = false;
  const go = () => {
    if (ran) return;
    ran = true;
    queued = false;
    renderer();
  };
  requestAnimationFrame(go);
  setTimeout(go, 60);
}
function flash(msg) {
  S.toast = msg;
  render();
  clearTimeout(flash.t);
  flash.t = setTimeout(() => {
    S.toast = "";
    render();
  }, 2200);
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    flash(T("copied"));
    return true;
  } catch {
    flash(T("copy.fail"));
    return false;
  }
}
function download(name, data, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5e3);
}
// XP rewards progress, not repeats: each award has a key and counts once per day (or once ever),
// so re-opening Sada on the same profile, re-running a check or toggling a task gives nothing
function gain(n, why = "", key = "", o = {}) {
  if (key) {
    const d0 = today();
    const log = S.xpLog ||= {};
    for (const k of Object.keys(log)) if (log[k].d !== "*" && log[k].d !== d0) delete log[k];
    const e2 = log[key];
    const c = e2 && (e2.d === "*" || e2.d === d0) ? e2.c : 0;
    if (c >= (o.cap || 1)) {
      render();
      return false;
    }
    log[key] = { d: o.ever ? "*" : d0, c: c + 1 };
    save({ xpLog: log });
  }
  S.xp += n;
  const d = today();
  if (S.streak.day !== d) {
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    S.streak = { day: d, n: S.streak.day === y ? S.streak.n + 1 : 1 };
  }
  save({ xp: S.xp, streak: S.streak });
  flash(`+${n} XP${why ? " \xB7 " + why : ""}`);
  return true;
}
var LEVELS = [0, 100, 250, 450, 700, 1e3, 1400];
function level(xp = S.xp) {
  let i = 0;
  while (i < LEVELS.length - 1 && xp >= LEVELS[i + 1]) i++;
  const next = LEVELS[i + 1] ?? LEVELS[i] + 600;
  return { i, from: LEVELS[i], next, pct: Math.min(100, Math.round((xp - LEVELS[i]) / (next - LEVELS[i]) * 100)) };
}
function summary(extra = "") {
  const r = S.report;
  const m = S.mission?.result;
  const lines = [extra];
  if (r) lines.push(`Sada (v0.8) ${r.url}`, `GEO score: ${r.score}/100`);
  if (m) {
    const ans = m.coverage.filter((c) => c.status === "answered").length;
    lines.push(`Questions answered: ${ans}/${m.coverage.length}`, `Pages read: ${m.site?.n || 1}`);
  }
  return lines.join("\n").trim().slice(0, 1400);
}
function bookUrl(topic, extra = "") {
  const p = { src: "sada", topic, note: summary(extra) };
  if (host()) p.site = host();
  return BOOK2[S.lang] + "?" + new URLSearchParams(p).toString();
}
function mailUrl(subject, extra = "") {
  return `mailto:${MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(summary(extra) + "\n\n" + T("mail.sent"))}`;
}
function ctas(topic, subject, extra = "", compact = false) {
  if (pol("hideContactOffers")) return "";
  const subj = `${T("cta.quote.subj")}: ${subject}`;
  return `<div class="ctas${compact ? " compact" : ""}"><a class="btn sun" target="_blank" rel="noopener" href="${esc(bookUrl(topic, extra))}">${icon("calendar")}<span>${esc(T("cta.book"))}</span></a>
    <a class="btn line" href="${esc(mailUrl(subj, extra))}">${icon("mail")}<span>${esc(T("cta.email"))}</span></a></div>`;
}
function md(s) {
  return esc(s.replace(/\r/g, "").replace(/^#{1,6}\s+/gm, "").replace(/^\s*[*-]\s+/gm, "\u2022 ").replace(/\n{3,}/g, "\n\n").trim()).replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>");
}
function PT(id, vars = {}, suffix = "") {
  const v = { ...vars };
  if (typeof v.check === "string") v.check = T(v.check + ".t");
  if (typeof v.list === "string") v.list = v.list.split(/,\s*/).map((x) => T("drive." + x)).join(", ");
  return T("plan." + id + suffix, v);
}
var pct = (a, b) => b ? Math.round(a / b * 100) : 0;
var band = (s) => s >= 75 ? "ok" : s >= 50 ? "warn" : "bad";
function warmAi(prepare) {
  if (pol("disableOnDeviceAI") || S.aiDl?.busy || S.ai?.state === "available") return;
  const lang = (S.report?.lang || S.lang || "en").slice(0, 2);
  S.aiDl = { busy: true, p: 0 };
  prepare(lang, (p) => {
    S.aiDl = { busy: true, p };
    render();
  }).then((st) => {
    S.aiDl = { busy: false, p: 1, ok: st === "available" };
    if (st === "available") S.ai = { state: "available", route: S.ai?.route || "direct" };
    render();
  });
}

// apps/extension/src/check.ts
async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}
function brandOf(r) {
  const ent = r.findings.find((f2) => f2.id === "entity");
  if (ent && ent.vars.name) return String(ent.vars.name);
  if (r.model.siteName) return r.model.siteName;
  const h = new URL(r.url).hostname.replace(/^www\./, "");
  return h.split(".")[0].replace(/^./, (c) => c.toUpperCase());
}
// Profile v2: the page, its home page and (after a scan) other pages of the site
function profileFor(r, input2, siteDocs = []) {
  const docs = [{ doc: parse(input2.html), url: r.url, role: "page" }];
  if (input2.homeHtml) {
    try { docs.push({ doc: parse(input2.homeHtml), url: new URL(r.url).origin + "/", role: "home" }); } catch {}
  }
  for (const d of siteDocs.slice(0, 14)) if (d.url !== r.url) docs.push({ doc: d.doc, url: d.url, role: "site" });
  return buildProfile({ url: r.url, lang: (r.lang || "").slice(0, 2).toLowerCase(), docs });
}
function ownProfile(o) {
  const p = S.profiles?.[o];
  if (!p || p.v !== 2) return null;
  return p;
}
async function runCheck(tabId) {
  S.busy = true;
  S.err = "";
  S.heat = false;
  S.heatInfo = null;
  S.sim = null;
  render();
  try {
    const tab = tabId ? await chrome.tabs.get(tabId) : await activeTab();
    if (!tab?.id) throw new Error("perm.cant");
    S.tabId = tab.id;
    if (tab.url && !/^https?:/.test(tab.url)) throw new Error("perm.cant");
    let res;
    try {
      [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: collectPage, args: [!pol("disableSiteScan")] });
    } catch (e2) {
      throw new Error(/Cannot access|permission|host/i.test(String(e2?.message)) ? "hint.icon" : "perm.cant");
    }
    const page = res?.result;
    if (!page?.html) throw new Error("perm.cant");
    netLog(page.fetched || [], "page");
    delete page.fetched;
    const input2 = { ...page, at: (/* @__PURE__ */ new Date()).toISOString() };
    const report = audit(input2, parse);
    const sameSite = S.report && new URL(S.report.url).origin === new URL(report.url).origin;
    S.report = report;
    S.page = input2;
    S.rw = {};
    if (!sameSite) {
      S.site = null;
      S.cmp = null;
      S.qSel = "";
    }
    const h = new URL(report.url).hostname;
    S._pcache = null;
    if (!S.brand || S.brandFor !== h) {
      const own = S.profiles?.[new URL(report.url).origin];
      let nm = own?.v === 2 ? own.name : "";
      if (!nm) try { nm = profileFor(report, input2).name; } catch {}
      S.brand = nm || brandOf(report);
      S.brandFor = h;
    }
    const doc = parse(input2.html);
    try {
      S.fixes = fixes(doc, report, input2, S.brand);
    } catch {
      S.fixes = [];
    }
    try {
      S.drive = drive(doc, report, input2);
    } catch {
      S.drive = null;
    }
    try {
      const o2 = new URL(report.url).origin;
      const pr = ownProfile(o2) || profileFor(report, input2);
      S._pcache = { url: report.url, p: pr };
      const ch = socialChannelsOf(doc, report.url);
      if (input2.homeHtml) {
        const hc = socialChannelsOf(parse(input2.homeHtml), o2 + "/");
        ch.links.push(...hc.links);
        ch.sameAs.push(...hc.sameAs);
      }
      rememberSite(o2, pr, ch);
    } catch (e3) {
      console.warn(e3);
    }
    S.socialMode = false;
    S.shown = { tabId: tab.id, url: report.url };
    S.stale = null;
    const m = S.missions[new URL(report.url).origin];
    if (m && (!S.mission || S.mission.origin !== m.origin) && !S.mission?.running) S.mission = m;
    if (S.mission && S.mission.origin !== new URL(report.url).origin && !S.mission.running) S.mission = m || null;
    remember(report);
    return report;
  } catch (e2) {
    S.err = String(e2?.message || e2);
    S.report = null;
    return null;
  } finally {
    S.busy = false;
    render();
  }
}
function remember(r) {
  const k = r.url.split("#")[0];
  const list = S.hist[k] || [];
  const last = list[list.length - 1];
  S.prev = last && (Date.now() - new Date(last.at).getTime() > 12e4 || last.score !== r.score) ? last : list[list.length - 2] || null;
  if (!last || last.score !== r.score || Date.now() - new Date(last.at).getTime() > 36e5) list.push({ at: r.at, score: r.score });
  S.hist[k] = list.slice(-12);
  const keys = Object.keys(S.hist);
  if (keys.length > 200) delete S.hist[keys[0]];
  save({ hist: S.hist });
}
async function readSite() {
  const [res] = await chrome.scripting.executeScript({ target: { tabId: S.tabId }, func: collectSite, args: [SITE_MAX] });
  const x = res?.result;
  netLog(x?.fetched || [], "site");
  if (!x?.pages?.length) throw new Error("site.none");
  const reports = [];
  const docs = [];
  let failed = 0;
  for (const pg of x.pages) {
    if (!pg.html || pg.status >= 400) {
      failed++;
      continue;
    }
    try {
      const r = audit({ url: pg.url, html: pg.html, rawHtml: pg.html, headers: pg.xr ? { "x-robots-tag": pg.xr } : {}, robots: x.robots, at: (/* @__PURE__ */ new Date()).toISOString() }, parse);
      reports.push(r);
      docs.push({ url: r.url, title: r.model.title, doc: parse(pg.html) });
    } catch {
      failed++;
    }
  }
  if (!reports.length) throw new Error("site.none");
  return { x, reports, docs, failed };
}
function siteResult(x, reports, failed) {
  return {
    origin: x.origin,
    source: x.source,
    total: x.total,
    failed,
    reports: reports.map((q) => ({
      url: q.url,
      score: q.score,
      title: q.model.title,
      cats: q.categories,
      issues: q.findings.filter((f2) => f2.status === "fail" || f2.status === "warn").map((f2) => f2.id)
    })),
    sum: siteSummary(reports)
  };
}
async function checkUrl(url) {
  S.busy = true;
  S.err = "";
  S.heat = false;
  S.heatInfo = null;
  render();
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId: S.tabId }, func: collectUrl, args: [url] });
    const page = res?.result;
    netLog(page?.fetched || [], "site");
    if (!page?.html) throw new Error("site.none");
    const input2 = { url: page.url, html: page.html, rawHtml: page.rawHtml, headers: page.headers, robots: page.robots, llms: page.llms, at: (/* @__PURE__ */ new Date()).toISOString() };
    const report = audit(input2, parse);
    S.report = report;
    S.page = input2;
    S.rw = {};
    S.open = {};
    S.remote = true;
    const doc = parse(input2.html);
    try {
      S.fixes = fixes(doc, report, input2, S.brand);
    } catch {
      S.fixes = [];
    }
    try {
      S.drive = drive(doc, report, input2);
    } catch {
      S.drive = null;
    }
    remember(report);
    return report;
  } catch (e2) {
    S.err = /Cannot access|permission|host/i.test(String(e2?.message)) ? "hint.icon" : "site.none";
    return null;
  } finally {
    S.busy = false;
    render();
  }
}

// packages/academy/ar.json
var ar_default3 = {
  tracks: [
    {
      id: "how",
      icon: "brain",
      t: "\u0643\u064A\u0641 \u064A\u0639\u0645\u0644 \u0627\u0644\u0628\u062D\u062B \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
      d: "\u0645\u0646 \u0623\u064A\u0646 \u062A\u0623\u062A\u064A \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A\u060C \u0648\u0644\u0645\u0627\u0630\u0627 \u062A\u0641\u0648\u0632 \u0627\u0644\u0645\u0642\u0627\u0637\u0639 \u0627\u0644\u0642\u0635\u064A\u0631\u0629.",
      lessons: [
        {
          id: "how-1",
          t: "\u0637\u0631\u064A\u0642\u062A\u0627\u0646 \u064A\u0639\u0631\u0641\u0643 \u0628\u0647\u0645\u0627 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
          cards: [
            "\u064A\u062C\u064A\u0628 \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0645\u0646 \u0645\u0635\u062F\u0631\u064A\u0646: \u0645\u0627 \u062A\u0639\u0644\u0651\u0645\u0647 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u062A\u062F\u0631\u064A\u0628 (\u0630\u0627\u0643\u0631\u062A\u0647)\u060C \u0648\u0628\u062D\u062B \u0645\u0628\u0627\u0634\u0631 \u0639\u0644\u0649 \u0627\u0644\u0648\u064A\u0628 \u064A\u062C\u0631\u064A\u0647 \u0645\u0646 \u0623\u062C\u0644 \u0627\u0644\u0633\u0624\u0627\u0644.",
            "\u064A\u0645\u0631\u0651 \u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0639\u0628\u0631 \u0641\u0647\u0627\u0631\u0633 \u0627\u0644\u0628\u062D\u062B \u0648\u0627\u0644\u0632\u0648\u0627\u062D\u0641: \u0641\u0647\u0631\u0633 Google \u0644\u0640 AI Overviews \u0648AI Mode\u060C \u0648\u0641\u0647\u0631\u0633 Bing \u0644\u0640 Copilot\u060C \u0648\u0632\u0648\u0627\u062D\u0641 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0646\u0641\u0633\u0647\u0627 \u0645\u062B\u0644 OAI-SearchBot \u0648PerplexityBot.",
            "\u0625\u0630\u0646 \u0647\u0646\u0627\u0643 \u0645\u0647\u0645\u062A\u0627\u0646: \u0623\u0646 \u062A\u0643\u0648\u0646 \u0642\u0627\u0628\u0644\u064B\u0627 \u0644\u0644\u0642\u0631\u0627\u0621\u0629 \u0648\u0645\u0641\u0647\u0631\u0633\u064B\u0627 \u0627\u0644\u064A\u0648\u0645 (\u062A\u0642\u0646\u064A\u064B\u0627)\u060C \u0648\u0623\u0646 \u064A\u064F\u062A\u062D\u062F\u064E\u0651\u062B \u0639\u0646\u0643 \u0639\u0644\u0649 \u0627\u0644\u0648\u064A\u0628 \u0628\u0645\u0627 \u064A\u0643\u0641\u064A \u0644\u062A\u062F\u062E\u0644 \u0630\u0627\u0643\u0631\u062A\u0647 (\u0627\u0644\u0633\u0645\u0639\u0629)."
          ],
          quiz: { q: "\u064A\u0639\u062B\u0631 Microsoft Copilot \u0639\u0644\u0649 \u0635\u0641\u062D\u0627\u062A \u0627\u0644\u0648\u064A\u0628 \u0623\u0633\u0627\u0633\u064B\u0627 \u0639\u0628\u0631\u2026", o: ["\u0641\u0647\u0631\u0633 Bing", "\u0641\u0647\u0631\u0633 Google", "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062F\u0631\u064A\u0628\u0647 \u0641\u0642\u0637"], a: 0, why: "\u062A\u0642\u0648\u0644 Microsoft \u0625\u0646 \u0625\u0631\u0634\u0627\u062F\u0627\u062A\u0647\u0627 \u062A\u0634\u0631\u062D \u0643\u064A\u0641 \u064A\u0632\u062D\u0641 Bing \u0648\u064A\u0639\u0631\u0636 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0641\u064A \u0628\u062D\u062B Bing \u0648Copilot \u0648\u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0629 \u0625\u0644\u0649 \u0627\u0644\u0628\u062D\u062B." },
          src: { t: "\u0645\u062F\u0648\u0646\u0629 Bing Webmaster: \u062A\u0642\u0631\u064A\u0631 AI Performance", u: "https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview" },
          try: "mission"
        },
        {
          id: "how-2",
          t: "\u062A\u0641\u0631\u064A\u0639 \u0627\u0644\u0627\u0633\u062A\u0639\u0644\u0627\u0645: \u0633\u0624\u0627\u0644 \u0648\u0627\u062D\u062F \u0648\u0639\u0645\u0644\u064A\u0627\u062A \u0628\u062D\u062B \u0643\u062B\u064A\u0631\u0629",
          cards: [
            "\u062A\u0642\u0648\u0644 Google \u0625\u0646 AI Overviews \u0648AI Mode \u0642\u062F \u062A\u0633\u062A\u062E\u062F\u0645 \xAB\u062A\u0641\u0631\u064A\u0639 \u0627\u0644\u0627\u0633\u062A\u0639\u0644\u0627\u0645\xBB (query fan-out): \u0639\u062F\u0629 \u0639\u0645\u0644\u064A\u0627\u062A \u0628\u062D\u062B \u0645\u062A\u0631\u0627\u0628\u0637\u0629 \u0641\u064A \u0645\u0648\u0627\u0636\u064A\u0639 \u0641\u0631\u0639\u064A\u0629\u060C \u062B\u0645 \u0625\u062C\u0627\u0628\u0629 \u0648\u0627\u062D\u062F\u0629.",
            "\u0642\u062F \u062A\u064F\u062E\u062A\u0627\u0631 \u0635\u0641\u062D\u062A\u0643 \u0644\u0633\u0624\u0627\u0644 \u0641\u0631\u0639\u064A (\u0627\u0644\u0633\u0639\u0631\u060C \u0627\u0644\u0645\u0633\u0627\u0641\u0629\u060C \u0645\u0642\u0627\u0631\u0646\u0629) \u062D\u062A\u0649 \u0644\u0648 \u0644\u0645 \u062A\u062A\u0635\u062F\u0651\u0631 \u0646\u062A\u0627\u0626\u062C \u0627\u0644\u0633\u0624\u0627\u0644 \u0627\u0644\u0631\u0626\u064A\u0633\u064A.",
            "\u0623\u062C\u0628 \u0639\u0646 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0641\u0631\u0639\u064A\u0629 \u0627\u0644\u062D\u0642\u064A\u0642\u064A\u0629 \u0644\u0639\u0645\u0644\u0627\u0626\u0643\u060C \u0643\u0644\u064C\u0651 \u0641\u064A \u0645\u0642\u0637\u0639 \u0648\u0627\u0636\u062D. \u0648\u062A\u062D\u0630\u0651\u0631 Google \u0623\u064A\u0636\u064B\u0627 \u0645\u0646 \u0625\u0646\u0634\u0627\u0621 \u0635\u0641\u062D\u0629 \u0644\u0643\u0644 \u0635\u064A\u063A\u0629 \u0645\u0645\u0643\u0646\u0629."
          ],
          quiz: { q: "\u0645\u0627\u0630\u0627 \u064A\u0639\u0646\u064A \u062A\u0641\u0631\u064A\u0639 \u0627\u0644\u0627\u0633\u062A\u0639\u0644\u0627\u0645 \u0644\u0645\u0648\u0642\u0639 \u0634\u0631\u0643\u0629 \u0635\u063A\u064A\u0631\u0629\u061F", o: ["\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0628\u0648\u0636\u0648\u062D \u0639\u0646 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0641\u0631\u0639\u064A\u0629 \u0627\u0644\u0645\u062D\u062F\u062F\u0629", "\u0643\u062A\u0627\u0628\u0629 \u0635\u0641\u062D\u0629 \u0644\u0643\u0644 \u0635\u064A\u063A\u0629 \u0645\u0646 \u0627\u0644\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0641\u062A\u0627\u062D\u064A\u0629", "\u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0641\u062A\u0627\u062D\u064A\u0629 \u0623\u0643\u062B\u0631"], a: 0, why: "\u0627\u0644\u062A\u0641\u0631\u064A\u0639 \u064A\u062C\u0644\u0628 \u0645\u0642\u0627\u0637\u0639 \u0644\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0641\u0631\u0639\u064A\u0629. \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0648\u0627\u0636\u062D\u0629 \u062A\u0641\u0648\u0632 \u0628\u0647\u0627\u060C \u0623\u0645\u0627 \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0627\u0644\u0636\u0639\u064A\u0641\u0629 \u0648\u0627\u0644\u062A\u0643\u0631\u0627\u0631 \u0641\u0644\u0627." },
          src: { t: "Google Search Central: \u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0648\u0645\u0648\u0642\u0639\u0643", u: "https://developers.google.com/search/docs/appearance/ai-features" },
          try: "mission"
        },
        {
          id: "how-3",
          t: "\u0645\u0642\u0627\u0637\u0639 \u0644\u0627 \u0635\u0641\u062D\u0627\u062A",
          cards: [
            "\u062A\u0642\u062A\u0628\u0633 \u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0645\u0642\u0627\u0637\u0639 \u0642\u0635\u064A\u0631\u0629. \u0627\u0644\u062C\u0645\u0644\u0629 \u0627\u0644\u0645\u0641\u0647\u0648\u0645\u0629 \u0648\u062D\u062F\u0647\u0627\u060C \u0627\u0644\u062A\u064A \u062A\u0630\u0643\u0631 \u0627\u0644\u0645\u0648\u0636\u0648\u0639 \u0648\u0645\u0639\u0644\u0648\u0645\u0629 \u0645\u062D\u062F\u062F\u0629\u060C \u0633\u0647\u0644\u0629 \u0627\u0644\u0627\u0642\u062A\u0628\u0627\u0633.",
            "\u0641\u064A \u062F\u0631\u0627\u0633\u0629 GEO (\u0645\u0624\u062A\u0645\u0631 KDD 2024)\u060C \u0631\u0641\u0639\u062A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0635\u0627\u062F\u0631 \u0648\u0627\u0644\u0627\u0642\u062A\u0628\u0627\u0633\u0627\u062A \u0648\u0627\u0644\u0625\u062D\u0635\u0627\u0621\u0627\u062A \u0627\u0644\u0638\u0647\u0648\u0631 \u0641\u064A \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u062A\u0648\u0644\u064A\u062F\u064A\u0629 \u0628\u0646\u062D\u0648 40% \u0643\u062D\u062F \u0623\u0642\u0635\u0649. \u0623\u0645\u0627 \u062D\u0634\u0648 \u0627\u0644\u0643\u0644\u0645\u0627\u062A \u0627\u0644\u0645\u0641\u062A\u0627\u062D\u064A\u0629 \u0641\u0644\u0645 \u064A\u0633\u0627\u0639\u062F.",
            "\u0627\u0643\u062A\u0628 \u0644\u064A\u064F\u0642\u062A\u0628\u0633 \u0643\u0644\u0627\u0645\u0643: \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0623\u0648\u0644\u064B\u0627\u060C \u0645\u0639\u0644\u0648\u0645\u0629 \u0648\u0627\u062D\u062F\u0629 \u0641\u064A \u0643\u0644 \u062C\u0645\u0644\u0629\u060C \u0648\u0627\u0644\u0645\u0635\u062F\u0631 \u0628\u062C\u0627\u0646\u0628 \u0627\u0644\u0631\u0642\u0645."
          ],
          quiz: { q: "\u0623\u064A \u062A\u063A\u064A\u064A\u0631 \u0633\u0627\u0639\u062F \u0623\u0643\u062B\u0631 \u0641\u064A \u062F\u0631\u0627\u0633\u0629 GEO\u061F", o: ["\u0625\u0636\u0627\u0641\u0629 \u0625\u062D\u0635\u0627\u0621\u0627\u062A \u0648\u0627\u0642\u062A\u0628\u0627\u0633\u0627\u062A \u0648\u0645\u0635\u0627\u062F\u0631", "\u0625\u0636\u0627\u0641\u0629 \u0643\u0644\u0645\u0627\u062A \u0645\u0641\u062A\u0627\u062D\u064A\u0629 \u0623\u0643\u062B\u0631", "\u0625\u0637\u0627\u0644\u0629 \u0627\u0644\u0635\u0641\u062D\u0627\u062A"], a: 0, why: "\u0627\u0644\u0623\u062F\u0644\u0629 (\u0625\u062D\u0635\u0627\u0621\u0627\u062A\u060C \u0627\u0642\u062A\u0628\u0627\u0633\u0627\u062A\u060C \u0645\u0635\u0627\u062F\u0631) \u062D\u0642\u0642\u062A \u0623\u0643\u0628\u0631 \u0627\u0644\u0645\u0643\u0627\u0633\u0628\u061B \u062D\u0634\u0648 \u0627\u0644\u0643\u0644\u0645\u0627\u062A \u0627\u0644\u0645\u0641\u062A\u0627\u062D\u064A\u0629 \u0644\u0645 \u064A\u062D\u0642\u0642 \u0634\u064A\u0626\u064B\u0627." },
          src: { t: "GEO: \u062A\u062D\u0633\u064A\u0646 \u0645\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u062A\u0648\u0644\u064A\u062F (Aggarwal \u0648\u0622\u062E\u0631\u0648\u0646\u060C KDD 2024)", u: "https://arxiv.org/abs/2311.09735" },
          try: "heat"
        }
      ]
    },
    {
      id: "access",
      icon: "shield-check",
      t: "\u0627\u0633\u0645\u062D \u0644\u0644\u0632\u0648\u0627\u062D\u0641 \u0627\u0644\u0635\u062D\u064A\u062D\u0629 \u0628\u0627\u0644\u062F\u062E\u0648\u0644",
      d: "\u0632\u0648\u0627\u062D\u0641 \u0627\u0644\u0628\u062D\u062B\u060C \u0632\u0648\u0627\u062D\u0641 \u0627\u0644\u062A\u062F\u0631\u064A\u0628\u060C \u0648\u0627\u0644\u0641\u062E\u0627\u062E \u0628\u064A\u0646\u0647\u0645\u0627.",
      lessons: [
        {
          id: "access-1",
          t: "\u0632\u0648\u0627\u062D\u0641 \u0627\u0644\u0628\u062D\u062B \u0648\u0632\u0648\u0627\u062D\u0641 \u0627\u0644\u062A\u062F\u0631\u064A\u0628",
          cards: [
            "\u062A\u0634\u063A\u0651\u0644 \u0634\u0631\u0643\u0627\u062A \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0643\u062B\u064A\u0631\u0629 \u0646\u0648\u0639\u064A\u0646 \u0645\u0646 \u0627\u0644\u0632\u0648\u0627\u062D\u0641. \u0632\u0648\u0627\u062D\u0641 \u0627\u0644\u0628\u062D\u062B \u062A\u0642\u0631\u0623 \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0644\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0622\u0646\u060C \u0648\u0632\u0648\u0627\u062D\u0641 \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \u062A\u062C\u0645\u0639 \u0627\u0644\u0646\u0635\u0648\u0635 \u0644\u062A\u062F\u0631\u064A\u0628 \u0646\u0645\u0627\u0630\u062C \u0645\u0633\u062A\u0642\u0628\u0644\u064A\u0629.",
            "OpenAI \u0647\u064A \u0627\u0644\u0645\u062B\u0627\u0644 \u0627\u0644\u0623\u0648\u0636\u062D: OAI-SearchBot \u0644\u0628\u062D\u062B ChatGPT\u060C \u0648GPTBot \u0644\u0644\u062A\u062F\u0631\u064A\u0628. \u062D\u0638\u0631 GPTBot \u0644\u0627 \u064A\u064F\u062E\u0631\u062C\u0643 \u0645\u0646 \u0628\u062D\u062B ChatGPT.",
            "\u062E\u064A\u0627\u0631 \u0634\u0627\u0626\u0639: \u0627\u0644\u0633\u0645\u0627\u062D \u0644\u0632\u0648\u0627\u062D\u0641 \u0627\u0644\u0628\u062D\u062B\u060C \u0648\u0627\u0644\u0642\u0631\u0627\u0631 \u0628\u0634\u0623\u0646 \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \u0628\u0634\u0643\u0644 \u0645\u0646\u0641\u0635\u0644. \u0647\u0630\u0627 \u0642\u0631\u0627\u0631\u0643\u060C \u0648\u0644\u064A\u0633 \u062D\u064A\u0644\u0629 \u0644\u0644\u062A\u0631\u062A\u064A\u0628."
          ],
          quiz: { q: "\u062D\u0638\u0631\u062A GPTBot \u0641\u064A \u0645\u0644\u0641 robots.txt. \u0645\u0627\u0630\u0627 \u064A\u062D\u062F\u062B\u061F", o: ["\u062A\u0631\u0641\u0636 \u062A\u062F\u0631\u064A\u0628 OpenAI\u060C \u0648\u064A\u0638\u0644 \u0628\u062D\u062B ChatGPT \u0642\u0627\u062F\u0631\u064B\u0627 \u0639\u0644\u0649 \u0625\u0638\u0647\u0627\u0631\u0643", "\u062A\u062E\u062A\u0641\u064A \u0645\u0646 ChatGPT", "\u0644\u0627 \u0634\u064A\u0621 \u0639\u0644\u0649 \u0627\u0644\u0625\u0637\u0644\u0627\u0642"], a: 0, why: "\u062A\u0648\u062B\u0651\u0642 OpenAI \u0623\u0646 GPTBot \u0632\u0627\u062D\u0641 \u0644\u0644\u062A\u062F\u0631\u064A\u0628\u060C \u0648\u0623\u0646 OAI-SearchBot \u0645\u062E\u0635\u0635 \u0644\u0644\u0628\u062D\u062B." },
          src: { t: "OpenAI: \u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0632\u0648\u0627\u062D\u0641 OpenAI", u: "https://platform.openai.com/docs/bots" },
          try: "bots"
        },
        {
          id: "access-2",
          t: "Googlebot \u0648Google-Extended",
          cards: [
            "\u062A\u0633\u062A\u062E\u062F\u0645 \u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0641\u064A \u0628\u062D\u062B Google (AI Overviews \u0648AI Mode) \u0632\u062D\u0641 Googlebot \u0627\u0644\u0639\u0627\u062F\u064A. \u062D\u0638\u0631 Googlebot \u064A\u064F\u062E\u0631\u062C\u0643 \u0645\u0646 \u0628\u062D\u062B Google \u0643\u0644\u064A\u064B\u0627.",
            "Google-Extended \u0631\u0645\u0632 \u0645\u0646\u0641\u0635\u0644: \u064A\u062A\u062D\u0643\u0645 \u0641\u064A \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0645\u062D\u062A\u0648\u0627\u0643 \u0644\u0646\u0645\u0627\u0630\u062C Gemini. \u0648\u062A\u0642\u0648\u0644 Google \u0625\u0646\u0647 \u0644\u0627 \u064A\u0624\u062B\u0631 \u0641\u064A \u0638\u0647\u0648\u0631\u0643 \u0641\u064A \u0628\u062D\u062B Google.",
            "\u0644\u0644\u062D\u062F\u0651 \u0645\u0645\u0627 \u064A\u064F\u0639\u0631\u0636 \u0645\u0646 \u0635\u0641\u062D\u0629\u060C \u062A\u0634\u064A\u0631 Google \u0625\u0644\u0649 \u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u062A\u062D\u0643\u0645 \u0641\u064A \u0627\u0644\u0645\u0642\u062A\u0637\u0641 \u0645\u062B\u0644 nosnippet \u0648max-snippet\u060C \u0644\u0627 \u0625\u0644\u0649 \u0627\u0644\u062D\u0638\u0631."
          ],
          quiz: { q: "\u0647\u0644 \u064A\u064F\u062E\u0631\u062C\u0643 \u062D\u0638\u0631 Google-Extended \u0645\u0646 AI Mode\u061F", o: ["\u0644\u0627\u060C \u0644\u0627 \u064A\u0624\u062B\u0631 \u0641\u064A \u0628\u062D\u062B Google", "\u0646\u0639\u0645\u060C \u0645\u0646 AI Mode \u0641\u0642\u0637", "\u0646\u0639\u0645\u060C \u0645\u0646 Google \u0643\u0644\u0647"], a: 0, why: "\u062A\u0648\u062B\u0651\u0642 Google \u0623\u0646 Google-Extended \u0644\u0627 \u064A\u0624\u062B\u0631 \u0641\u064A \u0638\u0647\u0648\u0631 \u0627\u0644\u0645\u0648\u0642\u0639 \u0641\u064A \u0628\u062D\u062B Google." },
          src: { t: "Google: \u0627\u0644\u0632\u0648\u0627\u062D\u0641 \u0627\u0644\u0634\u0627\u0626\u0639\u0629 (Google-Extended)", u: "https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers" },
          try: "bots"
        },
        {
          id: "access-3",
          t: "\u0641\u062E\u0627\u062E \u062C\u062F\u0627\u0631 \u0627\u0644\u062D\u0645\u0627\u064A\u0629 \u0648\u0634\u0628\u0643\u0629 CDN",
          cards: [
            "\u0645\u0644\u0641 robots.txt \u0644\u064A\u0633 \u0627\u0644\u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u0648\u062D\u064A\u062F\u0629. \u0642\u062F \u064A\u062D\u0638\u0631 \u062C\u062F\u0627\u0631 \u0627\u0644\u062D\u0645\u0627\u064A\u0629 \u0623\u0648 \u0625\u0639\u062F\u0627\u062F CDN \u0632\u0648\u0627\u062D\u0641 \u064A\u0633\u0645\u062D \u0628\u0647\u0627 robots.txt. \u0648\u062A\u0637\u0644\u0628 Google \u0627\u0644\u0633\u0645\u0627\u062D \u0628\u0627\u0644\u0632\u062D\u0641 \u0641\u064A robots.txt \u0648\u0641\u064A \u0623\u064A CDN \u0623\u0648 \u0627\u0633\u062A\u0636\u0627\u0641\u0629.",
            "Cloudflare (\u0633\u0628\u062A\u0645\u0628\u0631 2026): \u062E\u064A\u0627\u0631\u0627 \xABBlock\xBB \u0648\xABBlock on pages with ads\xBB \u0627\u0644\u062E\u0627\u0635\u0627\u0646 \u0628\u062A\u062F\u0631\u064A\u0628 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u064A\u0648\u0642\u0641\u0627\u0646 \u0623\u064A\u0636\u064B\u0627 Googlebot \u0648Bingbot \u0648Applebot \u0644\u0623\u0646\u0647\u0627 \u0632\u0648\u0627\u062D\u0641 \u0645\u062A\u0639\u062F\u062F\u0629 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645.",
            "\u0625\u0646 \u0623\u0631\u062F\u062A \u0631\u0641\u0636 \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \u0641\u0642\u0637\u060C \u062A\u0646\u0635\u062D Cloudflare \u0628\u0625\u0639\u062F\u0627\u062F \xABDisallow AI Training\xBB \u0628\u062F\u0644\u064B\u0627 \u0645\u0646 \u0630\u0644\u0643."
          ],
          quiz: { q: "\u0641\u064A Cloudflare\u060C \u0623\u064A \u0625\u0639\u062F\u0627\u062F \u064A\u0631\u0641\u0636 \u062A\u062F\u0631\u064A\u0628 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u062F\u0648\u0646 \u062D\u0638\u0631 Googlebot\u061F", o: ["Disallow AI Training", "Block on pages with ads", "Block"], a: 0, why: "\u062A\u0642\u0648\u0644 Cloudflare \u0625\u0646 Block \u0648Block on pages with ads \u064A\u0648\u0642\u0641\u0627\u0646 \u0623\u064A\u0636\u064B\u0627 \u0627\u0644\u0632\u0648\u0627\u062D\u0641 \u0645\u062A\u0639\u062F\u062F\u0629 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0645\u062B\u0644 Googlebot." },
          src: { t: "\u0645\u062F\u0648\u0646\u0629 Cloudflare: \u0632\u0648\u0627\u062D\u0641 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0645\u062A\u0639\u062F\u062F\u0629 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645", u: "https://blog.cloudflare.com/accountable-mixed-use-ai-crawlers/" },
          try: "audit"
        }
      ]
    },
    {
      id: "entity",
      icon: "building-2",
      t: "\u0643\u0646 \u0643\u064A\u0627\u0646\u064B\u0627 \u0648\u0627\u0636\u062D\u064B\u0627",
      d: "\u0623\u0633\u0645\u0627\u0621 \u0648\u062D\u0642\u0627\u0626\u0642 \u0648\u062A\u0631\u0645\u064A\u0632 \u062A\u062B\u0642 \u0628\u0647 \u0627\u0644\u0622\u0644\u0627\u062A.",
      lessons: [
        {
          id: "entity-1",
          t: "\u0627\u0644\u0627\u0633\u0645 \u0646\u0641\u0633\u0647 \u0648\u0627\u0644\u062D\u0642\u0627\u0626\u0642 \u0646\u0641\u0633\u0647\u0627 \u0641\u064A \u0643\u0644 \u0645\u0643\u0627\u0646",
          cards: [
            "\u062A\u0631\u0628\u0637 \u0627\u0644\u0622\u0644\u0627\u062A \u0627\u0644\u062D\u0642\u0627\u0626\u0642 \u0628\u0643\u064A\u0627\u0646: \u0634\u0631\u0643\u0629 \u0644\u0647\u0627 \u0627\u0633\u0645 \u0648\u0646\u0648\u0639 \u0648\u0645\u0643\u0627\u0646. \u0625\u0630\u0627 \u0627\u062E\u062A\u0644\u0641 \u0627\u0644\u0627\u0633\u0645 \u0623\u0648 \u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0623\u0648 \u0627\u0644\u0647\u0627\u062A\u0641 \u0628\u064A\u0646 \u0645\u0648\u0642\u0639\u0643 \u0648\u0645\u0644\u0641\u0627\u062A\u0643\u060C \u064A\u0642\u0644\u0651 \u064A\u0642\u064A\u0646\u0647\u0627 \u0628\u0623\u0646\u0643 \u0623\u0646\u062A.",
            "\u0627\u0633\u062A\u062E\u062F\u0645 \u0635\u064A\u063A\u0629 \u0648\u0627\u062D\u062F\u0629 \u0644\u0644\u0627\u0633\u0645. \u0643\u0631\u0651\u0631 \u0627\u0644\u062D\u0642\u0627\u0626\u0642 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0646\u0635\u064B\u0627 \u0641\u064A \u0645\u0648\u0642\u0639\u0643 \u0648\u0641\u064A \u0645\u0644\u0641 Google \u0627\u0644\u062A\u062C\u0627\u0631\u064A \u0648Bing Places \u0648\u0623\u0647\u0645 \u0627\u0644\u0623\u062F\u0644\u0629.",
            "\u0623\u0636\u0641 \u062A\u0631\u0645\u064A\u0632 Organization \u0623\u0648 LocalBusiness \u0645\u0639 \u0631\u0648\u0627\u0628\u0637 sameAs \u0625\u0644\u0649 \u0645\u0644\u0641\u0627\u062A\u0643 \u0627\u0644\u0631\u0633\u0645\u064A\u0629."
          ],
          quiz: { q: "\u0645\u0627 \u0641\u0627\u0626\u062F\u0629 sameAs\u061F", o: ["\u0631\u0628\u0637 \u0645\u0644\u0641\u0627\u062A\u0643 \u0627\u0644\u0631\u0633\u0645\u064A\u0629 \u0628\u0643\u064A\u0627\u0646 \u0645\u0648\u0642\u0639\u0643", "\u0646\u0633\u062E \u0645\u062D\u062A\u0648\u0649 \u0635\u0641\u062D\u0629 \u0623\u062E\u0631\u0649", "\u0625\u062E\u0628\u0627\u0631 Google \u0628\u0627\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u062A\u064A \u062A\u062A\u0635\u062F\u0631"], a: 0, why: "\u062A\u0633\u0631\u062F sameAs \u0627\u0644\u0631\u0648\u0627\u0628\u0637 \u0627\u0644\u062A\u064A \u062A\u0639\u0631\u0651\u0641 \u0627\u0644\u0643\u064A\u0627\u0646 \u0646\u0641\u0633\u0647\u060C \u0645\u062B\u0644 \u0627\u0644\u0645\u0644\u0641\u0627\u062A \u0627\u0644\u0631\u0633\u0645\u064A\u0629 \u0639\u0644\u0649 \u0627\u0644\u0634\u0628\u0643\u0627\u062A \u0627\u0644\u0627\u062C\u062A\u0645\u0627\u0639\u064A\u0629 \u0648\u0627\u0644\u0623\u062F\u0644\u0629." },
          src: { t: "Google: \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u0638\u0645\u0629 \u0644\u0644\u0645\u0624\u0633\u0633\u0629", u: "https://developers.google.com/search/docs/appearance/structured-data/organization" },
          try: "machine"
        },
        {
          id: "entity-2",
          t: "\u062A\u0631\u0645\u064A\u0632 \u064A\u0637\u0627\u0628\u0642 \u0627\u0644\u0635\u0641\u062D\u0629",
          cards: [
            "\u064A\u062C\u0628 \u0623\u0646 \u062A\u0635\u0641 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u0638\u0645\u0629 \u0645\u0627 \u064A\u0631\u0627\u0647 \u0627\u0644\u0632\u0627\u0626\u0631. \u062A\u0631\u0645\u064A\u0632 \u0645\u062D\u062A\u0648\u0649 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0627\u0644\u0635\u0641\u062D\u0629 \u064A\u062E\u0627\u0644\u0641 \u0625\u0631\u0634\u0627\u062F\u0627\u062A Google.",
            "\u062D\u0635\u0631\u062A Google \u0641\u064A \u0623\u063A\u0633\u0637\u0633 2023 \u0627\u0644\u0646\u062A\u0627\u0626\u062C \u0627\u0644\u0645\u0646\u0633\u0651\u0642\u0629 \u0644\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629 \u0641\u064A \u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u062D\u0643\u0648\u0645\u064A\u0629 \u0648\u0627\u0644\u0635\u062D\u064A\u0629 \u0627\u0644\u0645\u0639\u0631\u0648\u0641\u0629. \u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0648\u0627\u0644\u0623\u062C\u0648\u0628\u0629 \u0645\u0627 \u0632\u0627\u0644 \u064A\u0641\u064A\u062F \u0627\u0644\u0646\u0627\u0633 \u0648\u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A\u061B \u062A\u063A\u064A\u0651\u0631 \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u062E\u0627\u0635 \u0641\u0642\u0637.",
            "\u0648\u062A\u0642\u0648\u0644 Google \u0623\u064A\u0636\u064B\u0627 \u0625\u0646\u0647 \u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u062A\u0637\u0644\u0628\u0627\u062A \u0625\u0636\u0627\u0641\u064A\u0629 \u0648\u0644\u0627 \u062D\u0627\u062C\u0629 \u0644\u062A\u0631\u0645\u064A\u0632 \u062E\u0627\u0635 \u0644\u0644\u0638\u0647\u0648\u0631 \u0641\u064A \u0645\u064A\u0632\u0627\u062A\u0647\u0627 \u0644\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A."
          ],
          quiz: { q: "\u0645\u0646\u0630 \u0623\u063A\u0633\u0637\u0633 2023 \u062A\u0638\u0647\u0631 \u0627\u0644\u0646\u062A\u0627\u0626\u062C \u0627\u0644\u0645\u0646\u0633\u0651\u0642\u0629 \u0644\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629 \u0644\u0640\u2026", o: ["\u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u062D\u0643\u0648\u0645\u064A\u0629 \u0648\u0627\u0644\u0635\u062D\u064A\u0629 \u0627\u0644\u0645\u0639\u0631\u0648\u0641\u0629 \u0623\u0633\u0627\u0633\u064B\u0627", "\u0643\u0644 \u0645\u0648\u0642\u0639 \u0641\u064A\u0647 \u062A\u0631\u0645\u064A\u0632 FAQPage", "\u0644\u0627 \u0645\u0648\u0642\u0639 \u0639\u0644\u0649 \u0627\u0644\u0625\u0637\u0644\u0627\u0642"], a: 0, why: "\u0623\u0639\u0644\u0646\u062A Google \u0623\u0646 \u0647\u0630\u0647 \u0627\u0644\u0646\u062A\u0627\u0626\u062C \u0633\u062A\u0638\u0647\u0631 \u0641\u0642\u0637 \u0644\u0644\u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u062D\u0643\u0648\u0645\u064A\u0629 \u0648\u0627\u0644\u0635\u062D\u064A\u0629 \u0627\u0644\u0645\u0639\u0631\u0648\u0641\u0629 \u0648\u0627\u0644\u0645\u0648\u062B\u0648\u0642\u0629." },
          src: { t: "\u0645\u062F\u0648\u0646\u0629 Google Search Central: \u062A\u063A\u064A\u064A\u0631\u0627\u062A HowTo \u0648FAQ", u: "https://developers.google.com/search/blog/2023/08/howto-faq-changes" },
          try: "machine"
        },
        {
          id: "entity-3",
          t: "\u0627\u0644\u062D\u0642\u0627\u0626\u0642 \u0627\u0644\u062A\u064A \u064A\u062D\u062A\u0627\u062C\u0647\u0627 \u0627\u0644\u0645\u0633\u0627\u0639\u062F",
          cards: [
            "\u0642\u0628\u0644 \u0623\u0646 \u064A\u0631\u0634\u0651\u062D\u0643 \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u064A\u062D\u0627\u0648\u0644 \u0623\u0646 \u064A\u0639\u0631\u0641: \u0645\u0627 \u0647\u0630\u0627\u060C \u0623\u064A\u0646\u060C \u0645\u062A\u0649 \u064A\u0641\u062A\u062D\u060C \u0643\u0645 \u064A\u0643\u0644\u0651\u0641\u060C \u0643\u064A\u0641 \u0623\u062D\u062C\u0632 \u0623\u0648 \u0623\u062A\u0648\u0627\u0635\u0644.",
            "\u0636\u0639 \u0643\u0644 \u0645\u0639\u0644\u0648\u0645\u0629 \u0646\u0635\u064B\u0627 \u0641\u064A \u0627\u0644\u0635\u0641\u062D\u0629 (\u0644\u0627 \u0641\u064A \u0635\u0648\u0631\u0629 \u0623\u0648 \u0623\u062F\u0627\u0629 \u0641\u0642\u0637) \u0648\u0641\u064A \u0627\u0644\u062A\u0631\u0645\u064A\u0632: \u0627\u0644\u0639\u0646\u0648\u0627\u0646\u060C \u0633\u0627\u0639\u0627\u062A \u0627\u0644\u0639\u0645\u0644\u060C \u0627\u0644\u0647\u0627\u062A\u0641\u060C \u0646\u0637\u0627\u0642 \u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0623\u0648 \u0627\u0644\u0639\u0631\u0648\u0636.",
            "\u0627\u0644\u062D\u0642\u0627\u0626\u0642 \u0627\u0644\u0646\u0627\u0642\u0635\u0629 \u062A\u0645\u0644\u0624\u0647\u0627 \u0645\u0648\u0627\u0642\u0639 \u0623\u062E\u0631\u0649\u060C \u0623\u0648 \u064A\u0630\u0643\u0631 \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u062C\u0647\u0629 \u0623\u062E\u0631\u0649 \u062D\u0642\u0627\u0626\u0642\u0647\u0627 \u0648\u0627\u0636\u062D\u0629."
          ],
          quiz: { q: "\u0623\u064A\u0646 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0633\u0627\u0639\u0627\u062A \u0627\u0644\u0639\u0645\u0644\u061F", o: ["\u0641\u064A \u0646\u0635 \u0627\u0644\u0635\u0641\u062D\u0629 \u0648\u0641\u064A \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u0638\u0645\u0629", "\u0641\u064A \u0635\u0648\u0631\u0629 \u0644\u0627\u0641\u062A\u0629 \u0627\u0644\u0645\u062D\u0644 \u0641\u0642\u0637", "\u0639\u0644\u0649 \u0627\u0644\u0634\u0628\u0643\u0627\u062A \u0627\u0644\u0627\u062C\u062A\u0645\u0627\u0639\u064A\u0629 \u0641\u0642\u0637"], a: 0, why: "\u0627\u0644\u0646\u0635 \u0648\u0627\u0644\u062A\u0631\u0645\u064A\u0632 \u062A\u0642\u0631\u0624\u0647\u0645\u0627 \u0627\u0644\u0632\u0648\u0627\u062D\u0641 \u0628\u062B\u0642\u0629\u060C \u0623\u0645\u0627 \u0627\u0644\u0635\u0648\u0631 \u0648\u0627\u0644\u0623\u062F\u0648\u0627\u062A \u0641\u063A\u0627\u0644\u0628\u064B\u0627 \u0644\u0627." },
          src: { t: "Google: \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u0638\u0645\u0629 \u0644\u0644\u0646\u0634\u0627\u0637 \u0627\u0644\u062A\u062C\u0627\u0631\u064A \u0627\u0644\u0645\u062D\u0644\u064A", u: "https://developers.google.com/search/docs/appearance/structured-data/local-business" },
          try: "drive"
        }
      ]
    },
    {
      id: "cite",
      icon: "quote",
      t: "\u0627\u0643\u062A\u0628 \u0645\u0627 \u064A\u0642\u062A\u0628\u0633\u0647 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
      d: "\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0623\u0648\u0644\u064B\u0627\u060C \u062C\u0645\u0644 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0627\u0642\u062A\u0628\u0627\u0633\u060C \u0648\u0623\u062F\u0644\u0629 \u062D\u0642\u064A\u0642\u064A\u0629.",
      lessons: [
        {
          id: "cite-1",
          t: "\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0623\u0648\u0644\u064B\u0627",
          cards: [
            "\u0627\u0628\u062F\u0623 \u0628\u0627\u0644\u0625\u062C\u0627\u0628\u0629: \u0645\u0627 \u0647\u0648\u060C \u0644\u0645\u0646\u060C \u0623\u064A\u0646\u060C \u0648\u0623\u0647\u0645 \u0645\u0639\u0644\u0648\u0645\u0629 \u0645\u0641\u064A\u062F\u0629. \u062C\u0645\u0644\u0629 \u0623\u0648 \u062C\u0645\u0644\u062A\u0627\u0646.",
            "\xAB\u062F\u0627\u0631 \u0646\u0648\u0631\u0629 \u062F\u0627\u0631 \u0636\u064A\u0627\u0641\u0629 \u0645\u0646 \u062E\u0645\u0633 \u063A\u0631\u0641 \u0641\u064A \u0633\u064A\u062F\u064A \u0628\u0648\u0633\u0639\u064A\u062F\u060C \u0639\u0644\u0649 \u0628\u0639\u062F 300 \u0645 \u0645\u0646 \u0645\u0645\u0634\u0649 \u0627\u0644\u062C\u0631\u0641\u060C \u0645\u0641\u062A\u0648\u062D\u0629 \u0637\u0648\u0627\u0644 \u0627\u0644\u0633\u0646\u0629.\xBB \u0623\u0641\u0636\u0644 \u0645\u0646 \xAB\u0645\u0631\u062D\u0628\u064B\u0627 \u0628\u0643\u0645 \u0641\u064A \u0642\u0637\u0639\u062A\u0646\u0627 \u0627\u0644\u0635\u063A\u064A\u0631\u0629 \u0645\u0646 \u0627\u0644\u062C\u0646\u0629.\xBB",
            "\u0627\u0644\u0627\u0641\u062A\u062A\u0627\u062D\u064A\u0629 \u0647\u064A \u0627\u0644\u0645\u0642\u0637\u0639 \u0627\u0644\u0623\u0643\u062B\u0631 \u0627\u062D\u062A\u0645\u0627\u0644\u064B\u0627 \u0623\u0646 \u064A\u064F\u0646\u0642\u0644 \u0625\u0644\u0649 \u0625\u062C\u0627\u0628\u0629. \u0627\u062C\u0639\u0644\u0647\u0627 \u062C\u062F\u064A\u0631\u0629 \u0628\u0630\u0644\u0643."
          ],
          quiz: { q: "\u0623\u064A \u0627\u0641\u062A\u062A\u0627\u062D\u064A\u0629 \u0623\u0633\u0647\u0644 \u0644\u0644\u0627\u0642\u062A\u0628\u0627\u0633\u061F", o: ["\xAB\u062F\u0627\u0631 \u0646\u0648\u0631\u0629 \u062F\u0627\u0631 \u0636\u064A\u0627\u0641\u0629 \u0645\u0646 \u062E\u0645\u0633 \u063A\u0631\u0641 \u0641\u064A \u0633\u064A\u062F\u064A \u0628\u0648\u0633\u0639\u064A\u062F\u060C \u0645\u0641\u062A\u0648\u062D\u0629 \u0637\u0648\u0627\u0644 \u0627\u0644\u0633\u0646\u0629.\xBB", "\xAB\u0645\u0631\u062D\u0628\u064B\u0627! \u064A\u0633\u0639\u062F\u0646\u0627 \u0648\u062C\u0648\u062F\u0643 \u0647\u0646\u0627.\xBB", "\xAB\u0627\u0643\u062A\u0634\u0641 \u062A\u062C\u0631\u0628\u0629 \u0644\u0627 \u062A\u064F\u0646\u0633\u0649.\xBB"], a: 0, why: "\u062A\u0630\u0643\u0631 \u0627\u0644\u0645\u0648\u0636\u0648\u0639 \u0648\u0627\u0644\u0641\u0626\u0629 \u0648\u0627\u0644\u0645\u0643\u0627\u0646 \u0648\u0645\u0639\u0644\u0648\u0645\u0629." },
          src: { t: "Google: \u0625\u0646\u0634\u0627\u0621 \u0645\u062D\u062A\u0648\u0649 \u0645\u0641\u064A\u062F \u0648\u0645\u0648\u062B\u0648\u0642", u: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content" },
          try: "audit"
        },
        {
          id: "cite-2",
          t: "\u062C\u0645\u0644 \u062A\u0642\u0641 \u0648\u062D\u062F\u0647\u0627",
          cards: [
            "\u064A\u0623\u062E\u0630 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u062C\u0645\u0644\u0629 \u0645\u0646 \u0641\u0642\u0631\u062A\u0647\u0627. \xAB\u0625\u0646\u0647\u0627 \u0639\u0644\u0649 \u0628\u0639\u062F 10 \u062F\u0642\u0627\u0626\u0642 \u0641\u0642\u0637\xBB \u0644\u0627 \u062A\u0639\u0646\u064A \u0634\u064A\u0626\u064B\u0627 \u0648\u062D\u062F\u0647\u0627. \xAB\u062F\u0627\u0631 \u0646\u0648\u0631\u0629 \u0639\u0644\u0649 \u0628\u0639\u062F 10 \u062F\u0642\u0627\u0626\u0642 \u0633\u064A\u0631\u064B\u0627 \u0645\u0646 \u0645\u062D\u0637\u0629 TGM\xBB \u062A\u0639\u0646\u064A.",
            "\u0627\u0630\u0643\u0631 \u0627\u0644\u0645\u0648\u0636\u0648\u0639 \u0628\u062F\u0644 \xAB\u0647\u0648\xBB \u0623\u0648 \xAB\u0646\u062D\u0646\xBB \u0623\u0648 \xAB\u0647\u0630\u0627\xBB. \u0645\u0639\u0644\u0648\u0645\u0629 \u0645\u062D\u062F\u062F\u0629 \u0648\u0627\u062D\u062F\u0629 \u0641\u064A \u0643\u0644 \u062C\u0645\u0644\u0629\u060C \u0645\u0646 8 \u0625\u0644\u0649 30 \u0643\u0644\u0645\u0629.",
            "\u064A\u064F\u0638\u0647\u0631 \u0642\u0644\u0645 \u0627\u0644\u062A\u0638\u0644\u064A\u0644 \u0641\u064A \u0635\u062F\u0649 \u0623\u064A \u062C\u0645\u0644 \u0627\u0644\u0635\u0641\u062D\u0629 \u062A\u062C\u062A\u0627\u0632 \u0647\u0630\u0627 \u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631 \u0628\u0627\u0644\u0641\u0639\u0644."
          ],
          quiz: { q: "\u0644\u0645\u0627\u0630\u0627 \u062A\u0641\u0634\u0644 \u062C\u0645\u0644\u0629 \xAB\u0625\u0646\u0647\u0627 \u0639\u0644\u0649 \u0628\u0639\u062F 10 \u062F\u0642\u0627\u0626\u0642 \u0641\u0642\u0637\xBB\u061F", o: ["\u0627\u0644\u0645\u0648\u0636\u0648\u0639 \u0648\u0627\u0644\u0645\u0643\u0627\u0646 \u0645\u0641\u0642\u0648\u062F\u0627\u0646", "\u0642\u0635\u064A\u0631\u0629 \u062C\u062F\u064B\u0627 \u0639\u0644\u0649 Google", "\u0627\u0644\u0623\u0631\u0642\u0627\u0645 \u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D\u0629"], a: 0, why: "\u062E\u0627\u0631\u062C \u0627\u0644\u0633\u064A\u0627\u0642 \u0644\u0627 \u0623\u062D\u062F \u064A\u0639\u0631\u0641 \u0645\u0627 \xAB\u0647\u064A\xBB \u0648\u0644\u0627 \u0645\u0646 \u0623\u064A\u0646 \u0647\u064A \u0642\u0631\u064A\u0628\u0629." },
          src: { t: "GEO: \u062A\u062D\u0633\u064A\u0646 \u0645\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u062A\u0648\u0644\u064A\u062F (KDD 2024)", u: "https://arxiv.org/abs/2311.09735" },
          try: "quote"
        },
        {
          id: "cite-3",
          t: "\u0627\u0644\u0623\u062F\u0644\u0629 \u0648\u0627\u0644\u0645\u0639\u0631\u0641\u0629 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629",
          cards: [
            "\u0627\u0644\u0623\u0631\u0642\u0627\u0645 \u0648\u0627\u0644\u0645\u0635\u0627\u062F\u0631 \u0627\u0644\u0645\u0633\u0645\u0651\u0627\u0629 \u0648\u0627\u0644\u0627\u0642\u062A\u0628\u0627\u0633\u0627\u062A \u0627\u0644\u0642\u0635\u064A\u0631\u0629 \u062A\u062C\u0639\u0644 \u0627\u0644\u0645\u0642\u0637\u0639 \u0623\u062C\u062F\u0631 \u0628\u0627\u0644\u062B\u0642\u0629 \u0648\u0623\u0633\u0647\u0644 \u0644\u0644\u0627\u0642\u062A\u0628\u0627\u0633.",
            "\u064A\u0637\u0644\u0628 \u062F\u0644\u064A\u0644 Google \u0644\u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u062A\u0648\u0644\u064A\u062F\u064A \u0645\u062D\u062A\u0648\u0649 \u063A\u064A\u0631 \u0645\u0643\u0631\u0651\u0631: \u0645\u0627 \u062A\u0633\u062A\u0637\u064A\u0639 \u0623\u0646\u062A \u0648\u062D\u062F\u0643 \u0642\u0648\u0644\u0647 \u0645\u0646 \u062A\u062C\u0631\u0628\u0629 \u0645\u0628\u0627\u0634\u0631\u0629\u060C \u0644\u0627 \u0645\u0627 \u062A\u0643\u0631\u0631\u0647 \u0643\u0644 \u0627\u0644\u0645\u0648\u0627\u0642\u0639.",
            "\u0623\u0631\u0651\u062E \u062A\u062D\u062F\u064A\u062B\u0627\u062A\u0643 (\u062A\u0627\u0631\u064A\u062E \u0638\u0627\u0647\u0631 \u0648dateModified) \u0644\u062A\u0643\u0648\u0646 \u0627\u0644\u062D\u062F\u0627\u062B\u0629 \u0648\u0627\u0636\u062D\u0629."
          ],
          quiz: { q: "\u0645\u0627 \u0627\u0644\u0645\u0642\u0635\u0648\u062F \u0628\u0627\u0644\u0645\u062D\u062A\u0648\u0649 \xAB\u063A\u064A\u0631 \u0627\u0644\u0645\u0643\u0631\u0651\u0631\xBB\u061F", o: ["\u0645\u062D\u062A\u0648\u0649 \u0644\u0627 \u064A\u0643\u062A\u0628\u0647 \u063A\u064A\u0631\u0643\u060C \u0645\u0646 \u062A\u062C\u0631\u0628\u062A\u0643 \u0623\u0648 \u0628\u064A\u0627\u0646\u0627\u062A\u0643", "\u0645\u062D\u062A\u0648\u0649 \u0645\u0646\u0633\u0648\u062E \u0645\u0646 \u0627\u0644\u0646\u062A\u0627\u0626\u062C \u0627\u0644\u0623\u0648\u0644\u0649", "\u0645\u062D\u062A\u0648\u0649 \u0642\u0635\u064A\u0631 \u062C\u062F\u064B\u0627"], a: 0, why: "\u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0645\u0643\u0631\u0651\u0631 \u064A\u0639\u064A\u062F \u0645\u0627 \u0647\u0648 \u0645\u0646\u062A\u0634\u0631\u061B \u0627\u0644\u062D\u0642\u0627\u0626\u0642 \u0648\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629 \u0647\u064A \u0645\u0627 \u064A\u062C\u0639\u0644 \u0627\u0644\u0645\u0635\u062F\u0631 \u062C\u062F\u064A\u0631\u064B\u0627 \u0628\u0627\u0644\u0627\u0642\u062A\u0628\u0627\u0633." },
          src: { t: "Google: \u0627\u0644\u062A\u062D\u0633\u064A\u0646 \u0644\u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u062A\u0648\u0644\u064A\u062F\u064A", u: "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide" },
          try: "rewrite"
        }
      ]
    },
    {
      id: "offsite",
      icon: "newspaper",
      t: "\u0627\u062C\u0639\u0644 \u0627\u0644\u0646\u0627\u0633 \u064A\u062A\u062D\u062F\u062B\u0648\u0646 \u0639\u0646\u0643",
      d: "\u0643\u064A\u0641 \u062A\u0643\u0633\u0628 \u0627\u0644\u0648\u0643\u0627\u0644\u0627\u062A \u0625\u0634\u0627\u0631\u0627\u062A \u064A\u0644\u062A\u0642\u0637\u0647\u0627 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A.",
      lessons: [
        {
          id: "offsite-1",
          t: "\u0627\u0644\u0625\u0634\u0627\u0631\u0627\u062A \u0623\u0647\u0645 \u0645\u0646 \u0627\u0644\u0631\u0648\u0627\u0628\u0637",
          cards: [
            "\u062F\u0631\u0633\u062A Ahrefs \u062E\u0645\u0633\u0629 \u0648\u0633\u0628\u0639\u064A\u0646 \u0623\u0644\u0641 \u0639\u0644\u0627\u0645\u0629 \u062A\u062C\u0627\u0631\u064A\u0629: \u0643\u0627\u0646\u062A \u0625\u0634\u0627\u0631\u0627\u062A \u0627\u0644\u0639\u0644\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0648\u064A\u0628 \u0627\u0644\u0623\u0642\u0648\u0649 \u0627\u0631\u062A\u0628\u0627\u0637\u064B\u0627 \u0628\u0627\u0644\u0638\u0647\u0648\u0631 \u0641\u064A AI Overviews (0.664)\u060C \u0648\u0627\u0644\u0631\u0648\u0627\u0628\u0637 \u0627\u0644\u062E\u0644\u0641\u064A\u0629 \u0623\u0636\u0639\u0641 \u0628\u0643\u062B\u064A\u0631 (0.218).",
            "\u0627\u0644\u0639\u0644\u0627\u0645\u0627\u062A \u0641\u064A \u0627\u0644\u0631\u0628\u0639 \u0627\u0644\u0623\u0639\u0644\u0649 \u0645\u0646 \u062D\u064A\u062B \u0627\u0644\u0625\u0634\u0627\u0631\u0627\u062A \u062D\u0635\u0644\u062A \u0639\u0644\u0649 \u0646\u062D\u0648 \u0639\u0634\u0631\u0629 \u0623\u0636\u0639\u0627\u0641 \u0627\u0644\u0638\u0647\u0648\u0631 \u0641\u064A AI Overviews \u0645\u0642\u0627\u0631\u0646\u0629 \u0628\u0627\u0644\u0631\u0628\u0639 \u0627\u0644\u062A\u0627\u0644\u064A.",
            "\u0627\u0644\u0627\u0631\u062A\u0628\u0627\u0637 \u0644\u064A\u0633 \u062F\u0644\u064A\u0644\u064B\u0627 \u0639\u0644\u0649 \u0627\u0644\u0633\u0628\u0628. \u0644\u0643\u0646 \u0627\u0644\u0627\u062A\u062C\u0627\u0647 \u0648\u0627\u0636\u062D: \u0623\u0646 \u064A\u064F\u062A\u062D\u062F\u064E\u0651\u062B \u0639\u0646\u0643 \u0639\u0644\u0649 \u0627\u0644\u0648\u064A\u0628 \u062C\u0632\u0621 \u0645\u0646 \u0627\u0644\u0639\u0645\u0644."
          ],
          quiz: { q: "\u0641\u064A \u062F\u0631\u0627\u0633\u0629 Ahrefs\u060C \u0645\u0627 \u0627\u0644\u0623\u0643\u062B\u0631 \u0627\u0631\u062A\u0628\u0627\u0637\u064B\u0627 \u0628\u0627\u0644\u0638\u0647\u0648\u0631 \u0641\u064A AI Overviews\u061F", o: ["\u0625\u0634\u0627\u0631\u0627\u062A \u0627\u0644\u0639\u0644\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0648\u064A\u0628", "\u0639\u062F\u062F \u0627\u0644\u0631\u0648\u0627\u0628\u0637 \u0627\u0644\u062E\u0644\u0641\u064A\u0629", "\u0627\u0644\u0625\u0646\u0641\u0627\u0642 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u064A"], a: 0, why: "0.664 \u0644\u0625\u0634\u0627\u0631\u0627\u062A \u0627\u0644\u0639\u0644\u0627\u0645\u0629 \u0645\u0642\u0627\u0628\u0644 0.218 \u0644\u0644\u0631\u0648\u0627\u0628\u0637 \u0627\u0644\u062E\u0644\u0641\u064A\u0629 \u0648\u0646\u062D\u0648 0.215 \u0644\u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A." },
          src: { t: "Ahrefs: \u0639\u0648\u0627\u0645\u0644 \u0638\u0647\u0648\u0631 \u0627\u0644\u0639\u0644\u0627\u0645\u0627\u062A \u0641\u064A AI Overviews (75 \u0623\u0644\u0641 \u0639\u0644\u0627\u0645\u0629)", u: "https://ahrefs.com/blog/ai-overview-brand-correlation/" },
          try: "ask"
        },
        {
          id: "offsite-2",
          t: "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0639\u0644\u0627\u0642\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0629 \u0645\u0648\u062C\u0648\u062F\u0629 \u0641\u064A \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A",
          cards: [
            "\u0627\u0637\u0631\u062D \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0623\u0633\u0626\u0644\u0629 \u0639\u0645\u0644\u0627\u0626\u0643 \u0648\u0627\u0646\u0638\u0631 \u0625\u0644\u0649 \u0645\u0627 \u062A\u0633\u062A\u0634\u0647\u062F \u0628\u0647: \u0623\u062F\u0644\u0629 \u0633\u0641\u0631\u060C \u0642\u0648\u0627\u0626\u0645 \xAB\u0627\u0644\u0623\u0641\u0636\u0644\xBB\u060C \u0623\u062F\u0644\u0629 \u0623\u0639\u0645\u0627\u0644\u060C \u0635\u062D\u0627\u0641\u0629 \u0645\u062D\u0644\u064A\u0629\u060C \u0645\u0646\u062A\u062F\u064A\u0627\u062A.",
            "\u0647\u0630\u0647 \u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u0647\u064A \u0623\u0647\u062F\u0627\u0641\u0643 \u0641\u064A \u0627\u0644\u0639\u0644\u0627\u0642\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0629 \u0627\u0644\u0631\u0642\u0645\u064A\u0629. \u0627\u0643\u0633\u0628 \u0645\u0643\u0627\u0646\u064B\u0627 \u0641\u064A\u0647\u0627 \u0628\u0634\u064A\u0621 \u064A\u0633\u062A\u062D\u0642 \u0627\u0644\u0630\u0643\u0631: \u0628\u064A\u0627\u0646\u0627\u062A\u060C \u0642\u0635\u0629\u060C \u0631\u0623\u064A \u062E\u0628\u064A\u0631\u060C \u062D\u062F\u062B.",
            "\u0644\u0627 \u062A\u0634\u062A\u0631\u0650 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0627\u062A \u0623\u0628\u062F\u064B\u0627. \u0642\u0627\u0639\u062F\u0629 FTC \u0627\u0644\u0623\u0645\u0631\u064A\u0643\u064A\u0629 (2024) \u062A\u062D\u0638\u0631 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0627\u062A \u0627\u0644\u0645\u0632\u064A\u0641\u0629\u060C \u0628\u0645\u0627 \u0641\u064A\u0647\u0627 \u0627\u0644\u0645\u0643\u062A\u0648\u0628\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A\u060C \u0648\u0634\u0631\u0627\u0621 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0627\u062A \u0627\u0644\u0625\u064A\u062C\u0627\u0628\u064A\u0629 \u0623\u0648 \u0627\u0644\u0633\u0644\u0628\u064A\u0629."
          ],
          quiz: { q: "\u0645\u0627 \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0628\u0647 \u0648\u0641\u0642 \u0642\u0627\u0639\u062F\u0629 FTC \u0628\u0634\u0623\u0646 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0627\u062A\u061F", o: ["\u0623\u0646 \u062A\u0637\u0644\u0628 \u0645\u0646 \u0639\u0645\u0644\u0627\u0621 \u062D\u0642\u064A\u0642\u064A\u064A\u0646 \u0645\u0631\u0627\u062C\u0639\u0629 \u0635\u0627\u062F\u0642\u0629", "\u0623\u0646 \u062A\u062F\u0641\u0639 \u0645\u0642\u0627\u0628\u0644 \u0645\u0631\u0627\u062C\u0639\u0627\u062A \u0628\u062E\u0645\u0633 \u0646\u062C\u0648\u0645", "\u0623\u0646 \u062A\u0646\u0634\u0631 \u0645\u0631\u0627\u062C\u0639\u0627\u062A \u0643\u062A\u0628\u0647\u0627 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0628\u0627\u0633\u0645 \u0639\u0645\u0644\u0627\u0621 \u0648\u0647\u0645\u064A\u064A\u0646"], a: 0, why: "\u062A\u0633\u062A\u0647\u062F\u0641 \u0627\u0644\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0627\u062A \u0627\u0644\u0645\u0632\u064A\u0641\u0629 \u0648\u0627\u0644\u0645\u0634\u062A\u0631\u0627\u0629 \u0648\u0645\u0631\u0627\u062C\u0639\u0627\u062A \u0627\u0644\u0645\u0637\u0651\u0644\u0639\u064A\u0646 \u063A\u064A\u0631 \u0627\u0644\u0645\u064F\u0641\u0635\u062D \u0639\u0646\u0647\u0627\u060C \u0644\u0627 \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0635\u0627\u062F\u0642\u0629 \u0645\u0646 \u0639\u0645\u0644\u0627\u0621 \u062D\u0642\u064A\u0642\u064A\u064A\u0646." },
          src: { t: "FTC: \u0627\u0644\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0646\u0647\u0627\u0626\u064A\u0629 \u0644\u062D\u0638\u0631 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0627\u062A \u0648\u0627\u0644\u0634\u0647\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0632\u064A\u0641\u0629", u: "https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials" },
          try: "ask"
        },
        {
          id: "offsite-3",
          t: "\u0648\u064A\u0643\u064A\u0628\u064A\u062F\u064A\u0627 \u0648\u0648\u064A\u0643\u064A \u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0627\u0644\u0645\u0646\u062A\u062F\u064A\u0627\u062A: \u0627\u0644\u0642\u0648\u0627\u0639\u062F",
          cards: [
            "\u0625\u0631\u0634\u0627\u062F \u062A\u0636\u0627\u0631\u0628 \u0627\u0644\u0645\u0635\u0627\u0644\u062D \u0641\u064A \u0648\u064A\u0643\u064A\u0628\u064A\u062F\u064A\u0627: \u0625\u0646 \u0643\u0627\u0646\u062A \u0644\u0643 \u0635\u0644\u0629 \u0628\u0634\u0631\u0643\u0629 \u0641\u0623\u0641\u0635\u062D \u0639\u0646\u0647\u0627\u060C \u0648\u0644\u0627 \u062A\u0639\u062F\u0651\u0644 \u0645\u0642\u0627\u0644\u062A\u0647\u0627 \u0645\u0628\u0627\u0634\u0631\u0629\u060C \u0648\u0627\u0642\u062A\u0631\u062D \u0627\u0644\u062A\u0639\u062F\u064A\u0644\u0627\u062A \u0641\u064A \u0635\u0641\u062D\u0629 \u0627\u0644\u0646\u0642\u0627\u0634.",
            "\u0639\u0644\u0649 \u0627\u0644\u0645\u062D\u0631\u0631\u064A\u0646 \u0627\u0644\u0645\u0623\u062C\u0648\u0631\u064A\u0646 \u0627\u0644\u0625\u0641\u0635\u0627\u062D \u0639\u0645\u0651\u0646 \u064A\u062F\u0641\u0639 \u0644\u0647\u0645\u060C \u0648\u0627\u062A\u0641\u0627\u0642\u064A\u0629 \u0639\u062F\u0645 \u0627\u0644\u0625\u0641\u0635\u0627\u062D \u0644\u0627 \u062A\u064F\u0633\u0642\u0637 \u0630\u0644\u0643. \u0648\u0639\u0646\u0627\u0635\u0631 \u0648\u064A\u0643\u064A \u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062A\u0627\u062C \u0645\u0631\u0627\u062C\u0639 \u062C\u0627\u062F\u0629 \u0648\u0639\u0644\u0646\u064A\u0629.",
            "\u0641\u064A Reddit \u0648\u0627\u0644\u0645\u0646\u062A\u062F\u064A\u0627\u062A \u0634\u0627\u0631\u0643 \u0643\u0639\u0636\u0648 \u062D\u0642\u064A\u0642\u064A\u060C \u0648\u0642\u0644 \u0645\u0646 \u0623\u0646\u062A \u0639\u0646\u062F\u0645\u0627 \u062A\u0630\u0643\u0631 \u0646\u0634\u0627\u0637\u0643\u060C \u0648\u0627\u0644\u062A\u0632\u0645 \u0628\u0642\u0648\u0627\u0639\u062F \u0643\u0644 \u0645\u062C\u062A\u0645\u0639."
          ],
          quiz: { q: "\u062A\u062F\u064A\u0631 \u0634\u0631\u0643\u0629. \u0643\u064A\u0641 \u062A\u062D\u0633\u0651\u0646 \u0645\u0642\u0627\u0644\u062A\u0647\u0627 \u0641\u064A \u0648\u064A\u0643\u064A\u0628\u064A\u062F\u064A\u0627\u061F", o: ["\u062A\u0641\u0635\u062D \u0639\u0646 \u0635\u0644\u062A\u0643 \u0648\u062A\u0642\u062A\u0631\u062D \u0627\u0644\u062A\u0639\u062F\u064A\u0644\u0627\u062A \u0641\u064A \u0635\u0641\u062D\u0629 \u0627\u0644\u0646\u0642\u0627\u0634", "\u062A\u0639\u062F\u0651\u0644\u0647\u0627 \u0628\u0646\u0641\u0633\u0643 \u062F\u0648\u0646 \u0623\u0646 \u062A\u0642\u0648\u0644 \u0645\u0646 \u0623\u0646\u062A", "\u062A\u062F\u0641\u0639 \u0644\u0634\u062E\u0635 \u064A\u0639\u062F\u0651\u0644\u0647\u0627 \u0633\u0631\u064B\u0627"], a: 0, why: "\u064A\u0646\u0635\u062D \u0627\u0644\u0625\u0631\u0634\u0627\u062F \u0628\u0627\u0644\u0625\u0641\u0635\u0627\u062D \u0648\u0637\u0644\u0628 \u0627\u0644\u062A\u0639\u062F\u064A\u0644 \u0641\u064A \u0635\u0641\u062D\u0629 \u0627\u0644\u0646\u0642\u0627\u0634\u061B \u0627\u0644\u062A\u062D\u0631\u064A\u0631 \u0627\u0644\u0645\u0623\u062C\u0648\u0631 \u063A\u064A\u0631 \u0627\u0644\u0645\u064F\u0641\u0635\u062D \u0639\u0646\u0647 \u064A\u062E\u0627\u0644\u0641 \u0634\u0631\u0648\u0637 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645." },
          src: { t: "\u0648\u064A\u0643\u064A\u0628\u064A\u062F\u064A\u0627: \u062A\u0636\u0627\u0631\u0628 \u0627\u0644\u0645\u0635\u0627\u0644\u062D (\u0628\u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629)", u: "https://en.wikipedia.org/wiki/Wikipedia:Conflict_of_interest" },
          try: "ask"
        }
      ]
    },
    {
      id: "measure",
      icon: "chart-column",
      t: "\u0627\u0644\u0642\u064A\u0627\u0633",
      d: "\u0634\u0627\u0647\u062F \u0632\u064A\u0627\u0631\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0648\u0638\u0647\u0648\u0631\u0643 \u0641\u064A\u0647 \u0645\u062C\u0627\u0646\u064B\u0627.",
      lessons: [
        {
          id: "measure-1",
          t: "\u0632\u0648\u0627\u0631 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0641\u064A Google Analytics",
          cards: [
            "\u0623\u0646\u0634\u0626 \u0641\u064A GA4 \u0645\u062C\u0645\u0648\u0639\u0629 \u0642\u0646\u0648\u0627\u062A \u0645\u062E\u0635\u0635\u0629 \u0641\u064A\u0647\u0627 \u0642\u0646\u0627\u0629 \xAB\u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A\xBB: \u0645\u0635\u062F\u0631 \u0627\u0644\u062C\u0644\u0633\u0629 \u064A\u0637\u0627\u0628\u0642 \u0642\u0627\u0626\u0645\u0629 \u0646\u0637\u0627\u0642\u0627\u062A (chatgpt.com \u0648perplexity.ai \u0648gemini.google.com \u0648copilot.microsoft.com \u0648claude.ai\u2026). \u0636\u0639\u0647\u0627 \u0641\u0648\u0642 Referral.",
            "\u0643\u062B\u064A\u0631\u064B\u0627 \u0645\u0627 \u064A\u0636\u064A\u0641 ChatGPT \u0627\u0644\u0648\u0633\u0645 utm_source=chatgpt.com \u0625\u0644\u0649 \u0627\u0644\u0631\u0648\u0627\u0628\u0637. \u0644\u0643\u0646 \u0628\u0639\u0636 \u0646\u0642\u0631\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u062A\u0635\u0644 \u062F\u0648\u0646 \u0623\u064A \u0645\u064F\u062D\u064A\u0644 \u0641\u062A\u064F\u062D\u0633\u0628 \u0632\u064A\u0627\u0631\u0627\u062A \u0645\u0628\u0627\u0634\u0631\u0629.",
            "\u0625\u0630\u0646 \u0632\u064A\u0627\u0631\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0641\u064A \u0627\u0644\u062A\u062D\u0644\u064A\u0644\u0627\u062A \u062D\u062F\u0651 \u0623\u062F\u0646\u0649 \u0644\u0627 \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0643\u0627\u0645\u0644. \u062D\u0632\u0645\u0629 \u0627\u0644\u0625\u0635\u0644\u0627\u062D\u0627\u062A \u0641\u064A\u0647\u0627 \u062A\u0639\u0628\u064A\u0631 \u0646\u0645\u0637\u064A \u062C\u0627\u0647\u0632."
          ],
          quiz: { q: "\u0644\u0645\u0627\u0630\u0627 \u062A\u0648\u0636\u0639 \u0642\u0646\u0627\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0641\u0648\u0642 Referral\u061F", o: ["\u062A\u064F\u0642\u064A\u064E\u0651\u0645 \u0627\u0644\u0642\u0646\u0648\u0627\u062A \u0628\u0627\u0644\u062A\u0631\u062A\u064A\u0628 \u0648\u0623\u0648\u0644 \u0642\u0627\u0639\u062F\u0629 \u0645\u0637\u0627\u0628\u0642\u0629 \u062A\u0641\u0648\u0632", "\u062A\u0634\u062A\u0631\u0637 Google \u0627\u0644\u062A\u0631\u062A\u064A\u0628 \u0627\u0644\u0623\u0628\u062C\u062F\u064A", "\u0644\u062A\u0643\u0628\u064A\u0631 \u0627\u0644\u0632\u064A\u0627\u0631\u0627\u062A"], a: 0, why: "\u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0627\u0644\u0642\u0646\u0648\u0627\u062A \u0627\u0644\u0645\u062E\u0635\u0635\u0629 \u062A\u0642\u064A\u0651\u0645 \u0627\u0644\u0642\u0646\u0648\u0627\u062A \u0628\u0627\u0644\u062A\u0631\u062A\u064A\u0628\u060C \u0641\u064A\u062C\u0628 \u0623\u0646 \u062A\u0623\u062A\u064A \u0627\u0644\u0642\u0646\u0627\u0629 \u0627\u0644\u0623\u062F\u0642 \u0623\u0648\u0644\u064B\u0627." },
          src: { t: "\u0645\u0633\u0627\u0639\u062F\u0629 Google Analytics: \u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0627\u0644\u0642\u0646\u0648\u0627\u062A \u0627\u0644\u0645\u062E\u0635\u0635\u0629", u: "https://support.google.com/analytics/answer/13051316" },
          try: "pack"
        },
        {
          id: "measure-2",
          t: "\u062A\u0642\u0627\u0631\u064A\u0631 Search Console \u0648Bing",
          cards: [
            "\u0645\u0646\u0630 3 \u064A\u0648\u0646\u064A\u0648 2026 \u064A\u0648\u0641\u0651\u0631 Google Search Console \u062A\u0642\u0627\u0631\u064A\u0631 \u0623\u062F\u0627\u0621 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u062A\u0648\u0644\u064A\u062F\u064A: \u0645\u0631\u0627\u062A \u0627\u0644\u0638\u0647\u0648\u0631 \u0641\u064A AI Overviews \u0648AI Mode \u062D\u0633\u0628 \u0627\u0644\u0635\u0641\u062D\u0629 \u0648\u0627\u0644\u0628\u0644\u062F \u0648\u0627\u0644\u062C\u0647\u0627\u0632 \u0648\u0627\u0644\u062A\u0627\u0631\u064A\u062E.",
            "\u0648\u064A\u0648\u0641\u0651\u0631 Bing Webmaster Tools \u062A\u0642\u0631\u064A\u0631 AI Performance (\u0645\u0639\u0627\u064A\u0646\u0629 \u0639\u0627\u0645\u0629 \u0645\u0646\u0630 \u0641\u0628\u0631\u0627\u064A\u0631 2026): \u0643\u0645 \u0645\u0631\u0629 \u064A\u064F\u0633\u062A\u0634\u0647\u062F \u0628\u0645\u062D\u062A\u0648\u0627\u0643 \u0641\u064A Copilot \u0648\u0645\u0644\u062E\u0635\u0627\u062A Bing.",
            "\u0643\u0644\u0627\u0647\u0645\u0627 \u0645\u062C\u0627\u0646\u064A. \u0631\u0627\u062C\u0639\u0647\u0645\u0627 \u0634\u0647\u0631\u064A\u064B\u0627 \u0625\u0644\u0649 \u062C\u0627\u0646\u0628 \u0627\u062E\u062A\u0628\u0627\u0631\u0627\u062A\u0643 \u0644\u0644\u0625\u062C\u0627\u0628\u0627\u062A."
          ],
          quiz: { q: "\u0645\u0627\u0630\u0627 \u064A\u0639\u0631\u0636 \u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u062A\u0648\u0644\u064A\u062F\u064A \u0641\u064A Search Console\u061F", o: ["\u0645\u0631\u0627\u062A \u0627\u0644\u0638\u0647\u0648\u0631 \u0641\u064A AI Overviews \u0648AI Mode", "\u0643\u0644 \u0645\u0627 \u0643\u062A\u0628\u0647 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u0648\u0646", "\u062A\u0631\u062A\u064A\u0628\u0643 \u062F\u0627\u062E\u0644 ChatGPT"], a: 0, why: "\u064A\u0639\u0631\u0636 \u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u0645\u0631\u0627\u062A \u0627\u0644\u0638\u0647\u0648\u0631 \u062D\u0633\u0628 \u0627\u0644\u0635\u0641\u062D\u0629 \u0648\u0627\u0644\u0628\u0644\u062F \u0648\u0627\u0644\u062C\u0647\u0627\u0632 \u0648\u0627\u0644\u062A\u0627\u0631\u064A\u062E\u060C \u0648\u0644\u0627 \u064A\u0639\u0631\u0636 \u0627\u0644\u0623\u0633\u0626\u0644\u0629." },
          src: { t: "\u0645\u062F\u0648\u0646\u0629 Google Search Central: \u062A\u0642\u0627\u0631\u064A\u0631 \u0623\u062F\u0627\u0621 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u062A\u0648\u0644\u064A\u062F\u064A", u: "https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports" },
          try: "pack"
        },
        {
          id: "measure-3",
          t: "\u0627\u062E\u062A\u0628\u0631 \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0643\u0627\u0644\u0628\u0627\u062D\u062B\u064A\u0646",
          cards: [
            "\u062A\u062A\u063A\u064A\u0631 \u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0645\u0646 \u0645\u0631\u0629 \u0625\u0644\u0649 \u0623\u062E\u0631\u0649. \u0648\u062C\u062F\u062A SparkToro \u0648Gumshoe \u0623\u0646 \u0627\u062D\u062A\u0645\u0627\u0644 \u0623\u0646 \u064A\u0639\u064A\u062F ChatGPT \u0623\u0648 \u0630\u0643\u0627\u0621 Google \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0639\u0644\u0627\u0645\u0627\u062A \u0646\u0641\u0633\u0647\u0627 \u0644\u0646\u0641\u0633 \u0627\u0644\u0633\u0624\u0627\u0644 \u0623\u0642\u0644 \u0645\u0646 1 \u0645\u0646 100.",
            "\u0644\u0642\u0637\u0629 \u0634\u0627\u0634\u0629 \u0648\u0627\u062D\u062F\u0629 \u0644\u0627 \u062A\u062B\u0628\u062A \u0627\u0644\u0643\u062B\u064A\u0631. \u0627\u0637\u0631\u062D \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0646\u0641\u0633\u0647\u0627 \u0639\u062F\u0629 \u0645\u0631\u0627\u062A \u0648\u0641\u064A \u0639\u062F\u0629 \u0645\u0633\u0627\u0639\u062F\u0627\u062A\u060C \u0648\u062A\u0627\u0628\u0639 \u0646\u0633\u0628\u0629 \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u062A\u064A \u062A\u0630\u0643\u0631\u0643.",
            "\u0627\u0644\u062A\u0631\u062A\u064A\u0628 \u0641\u064A \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0636\u062C\u064A\u062C \u0641\u064A \u0627\u0644\u063A\u0627\u0644\u0628\u061B \u0627\u0644\u0625\u0634\u0627\u0631\u0629 \u0627\u0644\u062D\u0642\u064A\u0642\u064A\u0629 \u0647\u064A \u0623\u0646 \u062A\u0638\u0647\u0631 \u0643\u062B\u064A\u0631\u064B\u0627."
          ],
          quiz: { q: "\u0645\u0627 \u0627\u0644\u0645\u0642\u064A\u0627\u0633 \u0627\u0644\u0623\u0641\u0636\u0644 \u0644\u0644\u0638\u0647\u0648\u0631 \u0641\u064A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A\u061F", o: ["\u0639\u062F\u062F \u0645\u0631\u0627\u062A \u0630\u0643\u0631\u0643 \u0639\u0628\u0631 \u0645\u062D\u0627\u0648\u0644\u0627\u062A \u0643\u062B\u064A\u0631\u0629", "\u062A\u0631\u062A\u064A\u0628\u0643 \u0641\u064A \u0625\u062C\u0627\u0628\u0629 \u0648\u0627\u062D\u062F\u0629", "\u0644\u0642\u0637\u0629 \u0634\u0627\u0634\u0629 \u0648\u0627\u062D\u062F\u0629 \u0634\u0647\u0631\u064A\u064B\u0627"], a: 0, why: "\u0627\u0644\u0642\u0648\u0627\u0626\u0645 \u062A\u062A\u063A\u064A\u0631 \u0643\u0644 \u0645\u0631\u0629 \u062A\u0642\u0631\u064A\u0628\u064B\u0627\u061B \u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0638\u0647\u0648\u0631 \u0623\u062B\u0628\u062A \u0645\u0646 \u0627\u0644\u062A\u0631\u062A\u064A\u0628." },
          src: { t: "SparkToro: \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u063A\u064A\u0631 \u0645\u062A\u0633\u0642 \u0641\u064A \u062A\u0631\u0634\u064A\u062D \u0627\u0644\u0639\u0644\u0627\u0645\u0627\u062A", u: "https://sparktoro.com/blog/new-research-ais-are-highly-inconsistent-when-recommending-brands-or-products-marketers-should-take-care-when-tracking-ai-visibility/" },
          try: "ask"
        }
      ]
    },
    {
      id: "agentic",
      icon: "bot",
      t: "\u062C\u0627\u0647\u0632 \u0644\u0648\u0643\u0644\u0627\u0621 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
      d: "\u062D\u064A\u0646 \u062A\u062D\u062C\u0632 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0648\u062A\u0634\u062A\u0631\u064A \u0646\u064A\u0627\u0628\u0629 \u0639\u0646 \u0627\u0644\u0646\u0627\u0633.",
      lessons: [
        {
          id: "agentic-1",
          t: "\u0648\u0643\u0644\u0627\u0621 \u064A\u0634\u062A\u0631\u0648\u0646",
          cards: [
            "\u0628\u062F\u0623\u062A \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0627\u062A \u062A\u0646\u062C\u0632 \u0627\u0644\u0645\u0647\u0627\u0645 \u0644\u0627 \u0623\u0646 \u062A\u062C\u064A\u0628 \u0641\u0642\u0637. \u0623\u0637\u0644\u0642\u062A OpenAI \u0645\u064A\u0632\u0629 Instant Checkout \u0641\u064A ChatGPT \u0645\u0639 \u0628\u0631\u0648\u062A\u0648\u0643\u0648\u0644 Agentic Commerce Protocol (\u0628\u0627\u0644\u0634\u0631\u0627\u0643\u0629 \u0645\u0639 Stripe) \u0641\u064A \u0633\u0628\u062A\u0645\u0628\u0631 2025.",
            "\u0623\u0639\u0644\u0646\u062A Google \u0639\u0646 Universal Commerce Protocol (UCP) \u0641\u064A \u064A\u0646\u0627\u064A\u0631 2026 \u0645\u0639 Shopify \u0648Etsy \u0648Wayfair \u0648Target \u0648Walmart\u061B \u064A\u0646\u0634\u0631 \u0627\u0644\u062A\u062C\u0627\u0631 \u0642\u062F\u0631\u0627\u062A\u0647\u0645 \u0639\u0644\u0649 /.well-known/ucp.",
            "\u062A\u062D\u062A\u0647\u0627 \u0645\u0639\u0627\u064A\u064A\u0631 \u062F\u0641\u0639 \u0645\u062B\u0644 AP2 \u0645\u0646 Google. \u0644\u0644\u0645\u062A\u0627\u062C\u0631: \u062A\u062D\u0642\u0642 \u0645\u0645\u0627 \u062A\u062F\u0639\u0645\u0647 \u0645\u0646\u0635\u062A\u0643 \u0628\u0627\u0644\u0641\u0639\u0644."
          ],
          quiz: { q: "\u0623\u064A\u0646 \u064A\u0646\u0634\u0631 \u0627\u0644\u062A\u0627\u062C\u0631 \u0642\u062F\u0631\u0627\u062A\u0647 \u0641\u064A UCP\u061F", o: ["/.well-known/ucp", "/robots.txt", "/sitemap.xml"], a: 0, why: "\u064A\u0633\u062A\u062E\u062F\u0645 UCP \u0639\u0646\u0648\u0627\u0646\u064B\u0627 \u0645\u0639\u0631\u0648\u0641\u064B\u0627 (well-known) \u0639\u0644\u0649 \u0646\u0637\u0627\u0642 \u0627\u0644\u062A\u0627\u062C\u0631." },
          src: { t: "Universal Commerce Protocol", u: "https://ucp.dev" },
          try: "drive"
        },
        {
          id: "agentic-2",
          t: "WebMCP: \u0627\u0644\u0646\u0645\u0627\u0630\u062C \u0643\u0623\u062F\u0648\u0627\u062A",
          cards: [
            "WebMCP \u0645\u0639\u064A\u0627\u0631 \u0648\u064A\u0628 \u062A\u0642\u062A\u0631\u062D\u0647 Chrome: \u064A\u062A\u064A\u062D \u0644\u0644\u0635\u0641\u062D\u0629 \u0623\u0646 \u062A\u0642\u062F\u0651\u0645 \u0623\u062F\u0648\u0627\u062A \u0644\u0648\u0643\u0644\u0627\u0621 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0641\u064A \u0627\u0644\u0645\u062A\u0635\u0641\u062D \u0628\u062F\u0644 \u0623\u0646 \u064A\u062E\u0645\u0651\u0646\u0648\u0627 \u0623\u064A \u0632\u0631 \u064A\u0636\u063A\u0637\u0648\u0646.",
            "\u0627\u0644\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062A\u0635\u0631\u064A\u062D\u064A\u0629 \u0644\u0627 \u062A\u062D\u062A\u0627\u062C JavaScript: \u0623\u0636\u0641 toolname \u0648tooldescription \u0625\u0644\u0649 \u0627\u0644\u0646\u0645\u0648\u0630\u062C\u060C \u0648toolparamdescription \u0625\u0644\u0649 \u062D\u0642\u0648\u0644\u0647\u060C \u0641\u064A\u0628\u0646\u064A \u0627\u0644\u0645\u062A\u0635\u0641\u062D \u0627\u0644\u0623\u062F\u0627\u0629.",
            "\u0645\u0627 \u0632\u0627\u0644 \u0641\u064A \u0628\u062F\u0627\u064A\u062A\u0647 (\u062A\u062C\u0631\u0628\u0629 \u0623\u0635\u0644\u064A\u0629 \u0645\u0646\u0630 Chrome 149). \u0648\u0627\u0644\u0646\u0645\u0627\u0630\u062C \u0627\u0644\u062C\u064A\u062F\u0629 \u062A\u0641\u064A\u062F \u0627\u0644\u064A\u0648\u0645 \u0639\u0644\u0649 \u0623\u064A \u062D\u0627\u0644."
          ],
          quiz: { q: "\u0623\u064A \u0633\u0645\u0629 \u062A\u062D\u0648\u0651\u0644 \u0627\u0644\u0646\u0645\u0648\u0630\u062C \u0625\u0644\u0649 \u0623\u062F\u0627\u0629 WebMCP\u061F", o: ["toolname", "data-ai", "aria-agent"], a: 0, why: "\u062A\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0648\u0627\u062C\u0647\u0629 \u0627\u0644\u062A\u0635\u0631\u064A\u062D\u064A\u0629 \u0641\u064A Chrome \u0627\u0644\u0633\u0645\u062A\u064A\u0646 toolname \u0648tooldescription \u0639\u0644\u0649 \u0627\u0644\u0646\u0645\u0648\u0630\u062C." },
          src: { t: "Chrome for Developers: \u0648\u0627\u062C\u0647\u0629 WebMCP \u0627\u0644\u062A\u0635\u0631\u064A\u062D\u064A\u0629", u: "https://developer.chrome.com/docs/ai/webmcp/declarative-api" },
          try: "drive"
        },
        {
          id: "agentic-3",
          t: "\u0635\u062F\u064A\u0642 \u0644\u0644\u0648\u0643\u0644\u0627\u0621 \u0645\u0646 \u0627\u0644\u064A\u0648\u0645",
          cards: [
            "\u064A\u0642\u0631\u0623 \u0627\u0644\u0648\u0643\u0644\u0627\u0621 \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0643\u0645\u0627 \u062A\u0642\u0631\u0624\u0647\u0627 \u0627\u0644\u062A\u0642\u0646\u064A\u0627\u062A \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0629. \u0627\u0644\u062D\u0642\u0648\u0644 \u062A\u062D\u062A\u0627\u062C \u062A\u0633\u0645\u064A\u0627\u062A \u062D\u0642\u064A\u0642\u064A\u0629\u060C \u0648\u0627\u0644\u0623\u0632\u0631\u0627\u0631 \u0623\u0633\u0645\u0627\u0621\u060C \u0648\u0627\u0644\u0625\u062C\u0631\u0627\u0621 \u0627\u0644\u0631\u0626\u064A\u0633\u064A \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0631\u0627\u0628\u0637\u064B\u0627 \u0623\u0648 \u0632\u0631\u064B\u0627 \u062D\u0642\u064A\u0642\u064A\u064B\u0627.",
            "\u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0648\u0633\u0627\u0639\u0627\u062A \u0627\u0644\u0639\u0645\u0644 \u0648\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0646\u0635\u064B\u0627 \u0648\u062A\u0631\u0645\u064A\u0632\u064B\u0627\u060C \u0644\u0627 \u0635\u0648\u0631\u064B\u0627.",
            "\u062A\u062C\u0631\u0628\u0629 \u0627\u0644\u0648\u0643\u064A\u0644 \u0641\u064A \u0635\u062F\u0649 \u062A\u0641\u062D\u0635 \u0643\u0644 \u0630\u0644\u0643 \u0641\u064A \u0623\u064A \u0635\u0641\u062D\u0629 \u062E\u0644\u0627\u0644 \u062B\u0627\u0646\u064A\u0629."
          ],
          quiz: { q: "\u0632\u0631 \u064A\u0639\u0631\u0636 \u0623\u064A\u0642\u0648\u0646\u0629 \u0641\u0642\u0637 \u062F\u0648\u0646 \u062A\u0633\u0645\u064A\u0629. \u0628\u0627\u0644\u0646\u0633\u0628\u0629 \u0644\u0644\u0648\u0643\u064A\u0644 \u0647\u0648\u2026", o: ["\u0635\u0639\u0628 \u0627\u0644\u062A\u0639\u0631\u0651\u0641 \u0639\u0644\u064A\u0647", "\u0644\u0627 \u0628\u0623\u0633\u060C \u0641\u0627\u0644\u0648\u0643\u0644\u0627\u0621 \u064A\u0642\u0631\u0624\u0648\u0646 \u0627\u0644\u0623\u064A\u0642\u0648\u0646\u0627\u062A", "\u0623\u0633\u0631\u0639 \u0641\u064A \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645"], a: 0, why: "\u062F\u0648\u0646 \u0627\u0633\u0645 \u0646\u0635\u064A \u0623\u0648 aria-label \u0644\u0627 \u064A\u0639\u0631\u0641 \u0627\u0644\u0648\u0643\u064A\u0644 \u0648\u0638\u064A\u0641\u0629 \u0627\u0644\u0632\u0631." },
          src: { t: "W3C WAI: \u062A\u0633\u0645\u064A\u0629 \u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u062A\u062D\u0643\u0645", u: "https://www.w3.org/WAI/tutorials/forms/labels/" },
          try: "drive"
        }
      ]
    },
    {
      id: "local",
      icon: "globe",
      t: "\u0645\u062D\u0644\u064A \u0648\u0645\u062A\u0639\u062F\u062F \u0627\u0644\u0644\u063A\u0627\u062A",
      d: "\u0645\u0644\u0641\u0627\u062A \u0627\u0644\u062E\u0631\u0627\u0626\u0637\u060C \u0627\u0644\u0644\u063A\u0627\u062A\u060C \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0648\u0627\u0644\u0643\u062A\u0627\u0628\u0629 \u0645\u0646 \u0627\u0644\u064A\u0645\u064A\u0646.",
      lessons: [
        {
          id: "local-1",
          t: "\u0627\u0644\u0645\u0644\u0641\u0627\u062A \u0627\u0644\u062A\u064A \u062A\u0642\u0631\u0624\u0647\u0627 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0627\u062A",
          cards: [
            "\u0641\u064A \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0645\u062D\u0644\u064A\u0629 \u062A\u0639\u062A\u0645\u062F \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0639\u0644\u0649 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062E\u0631\u0627\u0626\u0637 \u0648\u0627\u0644\u0623\u0646\u0634\u0637\u0629: \u0645\u0644\u0641 Google \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u060C \u0648Bing Places for Business\u060C \u0648Apple Business Connect (\u062E\u0631\u0627\u0626\u0637 Apple \u0648Siri).",
            "\u0637\u0627\u0644\u0628 \u0628\u0627\u0644\u062B\u0644\u0627\u062B\u0629. \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0627\u0633\u0645 \u0648\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0648\u0627\u0644\u0647\u0627\u062A\u0641 \u0648\u0633\u0627\u0639\u0627\u062A \u0627\u0644\u0639\u0645\u0644 \u0648\u0627\u0644\u0641\u0626\u0627\u062A \u0646\u0641\u0633\u0647\u0627 \u0627\u0644\u0645\u0648\u062C\u0648\u062F\u0629 \u0641\u064A \u0645\u0648\u0642\u0639\u0643.",
            "\u0623\u0636\u0641 \u0635\u0648\u0631\u064B\u0627 \u0648\u0623\u0648\u0635\u0627\u0641\u064B\u0627 \u062D\u0642\u064A\u0642\u064A\u0629 \u0648\u0631\u064F\u062F\u0651 \u0639\u0644\u0649 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0627\u062A: \u0625\u0646\u0647\u0627 \u062D\u0642\u0627\u0626\u0642 \u0639\u0644\u0646\u064A\u0629 \u0639\u0646\u0643."
          ],
          quiz: { q: "\u0623\u064A \u0645\u0644\u0641 \u064A\u063A\u0630\u0651\u064A \u062E\u0631\u0627\u0626\u0637 Apple \u0648Siri\u061F", o: ["Apple Business Connect", "Bing Places", "\u0635\u0641\u062D\u0629 LinkedIn"], a: 0, why: "\u0639\u0628\u0631 Apple Business Connect \u062A\u062F\u064A\u0631 \u0627\u0644\u0623\u0646\u0634\u0637\u0629 \u0638\u0647\u0648\u0631\u0647\u0627 \u0641\u064A \u062E\u0631\u0627\u0626\u0637 Apple \u0648Siri \u0648\u062A\u0637\u0628\u064A\u0642\u0627\u062A Apple \u0627\u0644\u0623\u062E\u0631\u0649." },
          src: { t: "Apple Business Connect", u: "https://businessconnect.apple.com/" },
          try: "drive"
        },
        {
          id: "local-2",
          t: "\u0646\u0633\u062E \u0644\u063A\u0648\u064A\u0629 \u0645\u0636\u0628\u0648\u0637\u0629",
          cards: [
            "\u0644\u0643\u0644 \u0646\u0633\u062E\u0629 \u0644\u063A\u0648\u064A\u0629 \u0631\u0627\u0628\u0637 \u062E\u0627\u0635 \u0628\u0647\u0627\u060C \u0648\u0633\u0645\u0629 lang\u060C \u0648\u0631\u0648\u0627\u0628\u0637 hreflang \u0625\u0644\u0649 \u0643\u0644 \u0627\u0644\u0646\u0633\u062E \u0628\u0645\u0627 \u0641\u064A\u0647\u0627 \u0646\u0641\u0633\u0647\u0627\u060C \u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 x-default.",
            "\u062A\u0631\u062C\u0645 \u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0648\u0627\u0644\u0648\u0635\u0641 \u0648\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u0638\u0645\u0629 \u0623\u064A\u0636\u064B\u0627\u060C \u0644\u0627 \u0627\u0644\u0646\u0635 \u0627\u0644\u0638\u0627\u0647\u0631 \u0641\u0642\u0637.",
            "\u0625\u0634\u0627\u0631\u0627\u062A \u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u062E\u0627\u0637\u0626\u0629 \u062A\u0631\u0633\u0644 \u0627\u0644\u0646\u0627\u0633 \u0648\u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0625\u0644\u0649 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u062E\u0637\u0623."
          ],
          quiz: { q: "\u0647\u0644 \u064A\u062C\u0628 \u0623\u0646 \u062A\u062A\u0636\u0645\u0646 \u0642\u0627\u0626\u0645\u0629 hreflang \u0627\u0644\u0635\u0641\u062D\u0629 \u0646\u0641\u0633\u0647\u0627\u061F", o: ["\u0646\u0639\u0645\u060C \u0643\u0644 \u0646\u0633\u062E\u0629 \u062A\u0633\u0631\u062F \u0643\u0644 \u0627\u0644\u0646\u0633\u062E \u0628\u0645\u0627 \u0641\u064A\u0647\u0627 \u0646\u0641\u0633\u0647\u0627", "\u0644\u0627\u060C \u0627\u0644\u0644\u063A\u0627\u062A \u0627\u0644\u0623\u062E\u0631\u0649 \u0641\u0642\u0637", "x-default \u0648\u062D\u062F\u0647 \u064A\u0643\u0641\u064A"], a: 0, why: "\u062A\u0637\u0644\u0628 Google \u0623\u0646 \u062A\u0633\u0631\u062F \u0643\u0644 \u0646\u0633\u062E\u0629 \u0644\u063A\u0648\u064A\u0629 \u0646\u0641\u0633\u0647\u0627 \u0648\u0643\u0644 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0623\u062E\u0631\u0649." },
          src: { t: "Google: \u0625\u0628\u0644\u0627\u063A Google \u0628\u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0645\u062A\u0631\u062C\u0645\u0629 \u0645\u0646 \u0635\u0641\u062D\u062A\u0643", u: "https://developers.google.com/search/docs/specialty/international/localized-versions" },
          try: "audit"
        },
        {
          id: "local-3",
          t: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0648\u0627\u0644\u0643\u062A\u0627\u0628\u0629 \u0645\u0646 \u0627\u0644\u064A\u0645\u064A\u0646 \u0625\u0644\u0649 \u0627\u0644\u064A\u0633\u0627\u0631",
          cards: [
            '\u062A\u062D\u062A\u0627\u062C \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0625\u0644\u0649 lang="ar" \u0648dir="rtl" \u0639\u0644\u0649 \u0639\u0646\u0635\u0631 html\u060C \u0644\u062A\u0642\u0631\u0623\u0647\u0627 \u0627\u0644\u0645\u062A\u0635\u0641\u062D\u0627\u062A \u0648\u0642\u0627\u0631\u0626\u0627\u062A \u0627\u0644\u0634\u0627\u0634\u0629 \u0648\u0627\u0644\u0622\u0644\u0627\u062A \u0641\u064A \u0627\u0644\u0627\u062A\u062C\u0627\u0647 \u0627\u0644\u0635\u062D\u064A\u062D.',
            "\u0627\u0643\u062A\u0628 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0639\u0631\u0628\u064A \u0644\u0642\u0631\u0651\u0627\u0621 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 (\u0628\u0627\u0644\u0645\u0635\u0637\u0644\u062D\u0627\u062A \u0627\u0644\u062A\u064A \u064A\u0628\u062D\u062B\u0648\u0646 \u0628\u0647\u0627)\u060C \u0644\u0627 \u0645\u062C\u0631\u062F \u062A\u0631\u062C\u0645\u0629 \u0622\u0644\u064A\u0629 \u0644\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u0641\u0631\u0646\u0633\u064A\u0629 \u0623\u0648 \u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629.",
            "\u062D\u0627\u0641\u0638 \u0639\u0644\u0649 \u062A\u0637\u0627\u0628\u0642 \u0627\u0644\u0623\u0631\u0642\u0627\u0645 \u0648\u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0648\u0627\u0644\u0623\u0633\u0645\u0627\u0621 \u0628\u064A\u0646 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0644\u063A\u0648\u064A\u0629 \u0644\u062A\u062A\u0637\u0627\u0628\u0642 \u0627\u0644\u062D\u0642\u0627\u0626\u0642 \u0641\u064A \u0643\u0644 \u0645\u0643\u0627\u0646."
          ],
          quiz: { q: '\u0623\u064A\u0646 \u062A\u0648\u0636\u0639 dir="rtl" \u0641\u064A \u0635\u0641\u062D\u0629 \u0639\u0631\u0628\u064A\u0629\u061F', o: ["\u0639\u0644\u0649 \u0639\u0646\u0635\u0631 html", "\u0639\u0644\u0649 \u0627\u0644\u0635\u0648\u0631 \u0641\u0642\u0637", "\u0641\u064A robots.txt"], a: 0, why: "\u062A\u0648\u0635\u064A W3C \u0628\u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0627\u062A\u062C\u0627\u0647 \u0627\u0644\u0623\u0633\u0627\u0633\u064A \u0639\u0644\u0649 \u0639\u0646\u0635\u0631 html." },
          src: { t: "W3C: \u0627\u0644\u062A\u0631\u0645\u064A\u0632 \u0627\u0644\u0628\u0646\u064A\u0648\u064A \u0648\u0627\u0644\u0646\u0635 \u0645\u0646 \u0627\u0644\u064A\u0645\u064A\u0646 \u0625\u0644\u0649 \u0627\u0644\u064A\u0633\u0627\u0631 \u0641\u064A HTML", u: "https://www.w3.org/International/questions/qa-html-dir" },
          try: "audit"
        }
      ]
    }
  ],
  facts: [
    { s: "\u062D\u0638\u0631 GPTBot \u064A\u064F\u062E\u0631\u062C \u0645\u0648\u0642\u0639\u0643 \u0645\u0646 \u0628\u062D\u062B ChatGPT.", f: false, why: "GPTBot \u0632\u0627\u062D\u0641 \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \u0644\u062F\u0649 OpenAI\u061B \u0628\u062D\u062B ChatGPT \u064A\u0633\u062A\u062E\u062F\u0645 OAI-SearchBot." },
    { s: "\u0642\u062F \u064A\u062C\u0631\u064A AI Overviews \u0648AI Mode \u0645\u0646 Google \u0639\u062F\u0629 \u0639\u0645\u0644\u064A\u0627\u062A \u0628\u062D\u062B \u0645\u062A\u0631\u0627\u0628\u0637\u0629 \u0644\u0633\u0624\u0627\u0644 \u0648\u0627\u062D\u062F.", f: true, why: "\u062A\u0633\u0645\u064A Google \u0630\u0644\u0643 \u062A\u0641\u0631\u064A\u0639 \u0627\u0644\u0627\u0633\u062A\u0639\u0644\u0627\u0645 (query fan-out)." },
    { s: "\u062A\u062D\u062A\u0627\u062C \u0625\u0644\u0649 \u0645\u0644\u0641 llms.txt \u0644\u062A\u0638\u0647\u0631 \u0641\u064A \u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0644\u062F\u0649 Google.", f: false, why: "\u062A\u0642\u0648\u0644 Google \u0625\u0646\u0647 \u0644\u0627 \u062D\u0627\u062C\u0629 \u0644\u0645\u0644\u0641\u0627\u062A \u0623\u0648 \u062A\u0631\u0645\u064A\u0632 \u062E\u0627\u0635." },
    { s: "\u062D\u0638\u0631 Google-Extended \u064A\u064F\u062E\u0631\u062C\u0643 \u0645\u0646 \u0628\u062D\u062B Google.", f: false, why: "\u062A\u0642\u0648\u0644 Google \u0625\u0646 Google-Extended \u0644\u0627 \u064A\u0624\u062B\u0631 \u0641\u064A \u0627\u0644\u0638\u0647\u0648\u0631 \u0641\u064A \u0628\u062D\u062B Google." },
    { s: "\u0641\u064A \u062F\u0631\u0627\u0633\u0629 \u0634\u0645\u0644\u062A 75 \u0623\u0644\u0641 \u0639\u0644\u0627\u0645\u0629\u060C \u0627\u0631\u062A\u0628\u0637\u062A \u0627\u0644\u0625\u0634\u0627\u0631\u0627\u062A \u0639\u0644\u0649 \u0627\u0644\u0648\u064A\u0628 \u0628\u0627\u0644\u0638\u0647\u0648\u0631 \u0641\u064A AI Overviews \u0623\u0643\u062B\u0631 \u0645\u0646 \u0627\u0644\u0631\u0648\u0627\u0628\u0637 \u0627\u0644\u062E\u0644\u0641\u064A\u0629.", f: true, why: "Ahrefs: 0.664 \u0644\u0644\u0625\u0634\u0627\u0631\u0627\u062A \u0645\u0642\u0627\u0628\u0644 0.218 \u0644\u0644\u0631\u0648\u0627\u0628\u0637 \u0627\u0644\u062E\u0644\u0641\u064A\u0629." },
    { s: "\u0625\u0630\u0627 \u0633\u0623\u0644\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0633\u0624\u0627\u0644 \u0646\u0641\u0633\u0647 \u0645\u0631\u062A\u064A\u0646 \u062A\u062D\u0635\u0644 \u0639\u0627\u062F\u0629 \u0639\u0644\u0649 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0639\u0644\u0627\u0645\u0627\u062A \u0646\u0641\u0633\u0647\u0627.", f: false, why: "SparkToro \u0648Gumshoe: \u0627\u0644\u0627\u062D\u062A\u0645\u0627\u0644 \u0623\u0642\u0644 \u0645\u0646 1 \u0645\u0646 100." },
    { s: "\u064A\u0639\u0631\u0636 Search Console \u0645\u0631\u0627\u062A \u0627\u0644\u0638\u0647\u0648\u0631 \u0641\u064A AI Overviews \u0648AI Mode.", f: true, why: "\u062A\u0642\u0627\u0631\u064A\u0631 \u0623\u062F\u0627\u0621 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u062A\u0648\u0644\u064A\u062F\u064A \u0645\u0646\u0630 \u064A\u0648\u0646\u064A\u0648 2026." },
    { s: "\u0641\u064A Cloudflare \u0642\u062F \u064A\u0648\u0642\u0641 \u062E\u064A\u0627\u0631 \xABBlock on pages with ads\xBB \u0644\u0644\u062A\u062F\u0631\u064A\u0628 Googlebot \u0623\u064A\u0636\u064B\u0627.", f: true, why: "Cloudflare\u060C \u0633\u0628\u062A\u0645\u0628\u0631 2026: \u064A\u0634\u0645\u0644 \u0627\u0644\u0632\u0648\u0627\u062D\u0641 \u0645\u062A\u0639\u062F\u062F\u0629 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645." },
    { s: "\u0645\u0627 \u0632\u0627\u0644\u062A \u0627\u0644\u0646\u062A\u0627\u0626\u062C \u0627\u0644\u0645\u0646\u0633\u0651\u0642\u0629 \u0644\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629 \u062A\u0638\u0647\u0631 \u0644\u0643\u0644 \u0645\u0648\u0642\u0639 \u0641\u064A\u0647 FAQPage.", f: false, why: "\u0645\u0646\u0630 \u0623\u063A\u0633\u0637\u0633 2023 \u0644\u0644\u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u062D\u0643\u0648\u0645\u064A\u0629 \u0648\u0627\u0644\u0635\u062D\u064A\u0629 \u0627\u0644\u0645\u0639\u0631\u0648\u0641\u0629 \u0623\u0633\u0627\u0633\u064B\u0627." },
    { s: "\u0641\u064A \u062F\u0631\u0627\u0633\u0629 GEO\u060C \u062C\u0639\u0644\u062A \u0627\u0644\u0625\u062D\u0635\u0627\u0621\u0627\u062A \u0648\u0627\u0644\u0645\u0635\u0627\u062F\u0631 \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0623\u0643\u062B\u0631 \u0638\u0647\u0648\u0631\u064B\u0627 \u0641\u064A \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u062A\u0648\u0644\u064A\u062F\u064A\u0629.", f: true, why: "\u0628\u0646\u062D\u0648 40% \u0643\u062D\u062F \u0623\u0642\u0635\u0649 \u0641\u064A \u0648\u0631\u0642\u0629 KDD 2024." },
    { s: "\u0634\u0631\u0627\u0621 \u0645\u0631\u0627\u062C\u0639\u0627\u062A \u0625\u064A\u062C\u0627\u0628\u064A\u0629 \u0645\u0633\u0645\u0648\u062D \u0625\u0630\u0627 \u0643\u062A\u0628\u0647\u0627 \u0623\u0634\u062E\u0627\u0635 \u062D\u0642\u064A\u0642\u064A\u0648\u0646.", f: false, why: "\u062A\u062D\u0638\u0631 \u0642\u0627\u0639\u062F\u0629 FTC \u0634\u0631\u0627\u0621 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0627\u062A \u0627\u0644\u0625\u064A\u062C\u0627\u0628\u064A\u0629 \u0623\u0648 \u0627\u0644\u0633\u0644\u0628\u064A\u0629." },
    { s: "\u0639\u0644\u0649 \u0627\u0644\u0634\u0631\u0643\u0629 \u0623\u0646 \u062A\u0639\u062F\u0651\u0644 \u0645\u0642\u0627\u0644\u062A\u0647\u0627 \u0641\u064A \u0648\u064A\u0643\u064A\u0628\u064A\u062F\u064A\u0627 \u0628\u0646\u0641\u0633\u0647\u0627 \u0644\u062A\u0628\u0642\u0649 \u062F\u0642\u064A\u0642\u0629.", f: false, why: "\u062A\u0637\u0644\u0628 \u0648\u064A\u0643\u064A\u0628\u064A\u062F\u064A\u0627 \u0627\u0644\u0625\u0641\u0635\u0627\u062D \u0639\u0646 \u0627\u0644\u0635\u0644\u0629 \u0648\u0627\u0642\u062A\u0631\u0627\u062D \u0627\u0644\u062A\u0639\u062F\u064A\u0644\u0627\u062A \u0641\u064A \u0635\u0641\u062D\u0629 \u0627\u0644\u0646\u0642\u0627\u0634." }
  ],
  quotes: [
    { s: "\u062F\u0627\u0631 \u0646\u0648\u0631\u0629 \u062F\u0627\u0631 \u0636\u064A\u0627\u0641\u0629 \u0645\u0646 \u062E\u0645\u0633 \u063A\u0631\u0641 \u0641\u064A \u0633\u064A\u062F\u064A \u0628\u0648\u0633\u0639\u064A\u062F\u060C \u0645\u0641\u062A\u0648\u062D\u0629 \u0637\u0648\u0627\u0644 \u0627\u0644\u0633\u0646\u0629.", ok: true, why: "\u0627\u0644\u0645\u0648\u0636\u0648\u0639 \u0645\u0630\u0643\u0648\u0631\u060C \u0648\u0627\u0644\u0641\u0626\u0629\u060C \u0648\u0627\u0644\u0645\u0643\u0627\u0646\u060C \u0648\u0645\u0639\u0644\u0648\u0645\u0629." },
    { s: "\u0625\u0646\u0647\u0627 \u0639\u0644\u0649 \u0628\u0639\u062F \u0639\u0634\u0631 \u062F\u0642\u0627\u0626\u0642 \u0641\u0642\u0637.", ok: false, why: "\u0645\u0627 \u0647\u064A \xAB\u0647\u064A\xBB\u060C \u0648\u0639\u0634\u0631 \u062F\u0642\u0627\u0626\u0642 \u0645\u0646 \u0623\u064A\u0646\u061F" },
    { s: "\u062A\u0642\u0639 \u062F\u0627\u0631 \u0646\u0648\u0631\u0629 \u0639\u0644\u0649 \u0628\u0639\u062F 10 \u062F\u0642\u0627\u0626\u0642 \u0633\u064A\u0631\u064B\u0627 \u0645\u0646 \u0645\u062D\u0637\u0629 TGM \u0641\u064A \u0633\u064A\u062F\u064A \u0628\u0648\u0633\u0639\u064A\u062F.", ok: true, why: "\u062A\u0642\u0641 \u0648\u062D\u062F\u0647\u0627\u060C \u0628\u0645\u0633\u0627\u0641\u0629 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0642\u064A\u0627\u0633." },
    { s: "\u0646\u0642\u062F\u0651\u0645 \u0644\u0643\u0645 \u062A\u062C\u0631\u0628\u0629 \u0644\u0627 \u062A\u064F\u0646\u0633\u0649 \u0633\u062A\u062D\u0628\u0648\u0646\u0647\u0627.", ok: false, why: "\u0644\u0627 \u0645\u0648\u0636\u0648\u0639 \u0648\u0644\u0627 \u0645\u0639\u0644\u0648\u0645\u0629: \u062A\u0633\u0648\u064A\u0642 \u062E\u0627\u0644\u0635." },
    { s: "\u064A\u064F\u0642\u062F\u064E\u0651\u0645 \u0627\u0644\u0641\u0637\u0648\u0631 \u0641\u064A \u062F\u0627\u0631 \u0646\u0648\u0631\u0629 \u0639\u0644\u0649 \u0627\u0644\u0633\u0637\u062D \u0645\u0646 \u0627\u0644\u0633\u0627\u0639\u0629 8 \u0625\u0644\u0649 10:30.", ok: true, why: "\u0645\u0648\u0636\u0648\u0639 \u0645\u0630\u0643\u0648\u0631\u060C \u0648\u0645\u0643\u0627\u0646\u060C \u0648\u0645\u0648\u0627\u0639\u064A\u062F." },
    { s: "\u063A\u0631\u0641\u0646\u0627 \u0631\u0627\u0626\u0639\u0629 \u0648\u0645\u0631\u064A\u062D\u0629.", ok: false, why: "\u0631\u0623\u064A \u062F\u0648\u0646 \u0645\u0639\u0644\u0648\u0645\u0629 \u064A\u0645\u0643\u0646 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646\u0647\u0627." },
    { s: "\u0641\u064A \u0643\u0644 \u063A\u0631\u0641\u0629 \u0645\u0646 \u063A\u0631\u0641 \u062F\u0627\u0631 \u0646\u0648\u0631\u0629 \u0627\u0644\u062E\u0645\u0633 \u0645\u0643\u064A\u0651\u0641 \u0648\u062D\u0645\u0651\u0627\u0645 \u062E\u0627\u0635.", ok: true, why: "\u062D\u0642\u0627\u0626\u0642 \u0645\u062D\u062F\u062F\u0629 \u064A\u0645\u0643\u0646 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646\u0647\u0627." },
    { s: "\u0643\u0645\u0627 \u0630\u0643\u0631\u0646\u0627 \u0623\u0639\u0644\u0627\u0647\u060C \u0647\u0630\u0627 \u0647\u0648 \u0627\u0644\u062E\u064A\u0627\u0631 \u0627\u0644\u0623\u0641\u0636\u0644.", ok: false, why: "\u062A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 \u0627\u0644\u0633\u064A\u0627\u0642 \u0648\u062A\u062F\u0651\u0639\u064A \u062F\u0648\u0646 \u062F\u0644\u064A\u0644." },
    { s: "\u064A\u0628\u062F\u0623 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0648\u0635\u0648\u0644 \u0641\u064A \u062F\u0627\u0631 \u0646\u0648\u0631\u0629 \u0627\u0644\u0633\u0627\u0639\u0629 14:00 \u0648\u0627\u0644\u0645\u063A\u0627\u062F\u0631\u0629 \u062D\u062A\u0649 11:00.", ok: true, why: "\u062F\u0642\u064A\u0642\u0629 \u0648\u0645\u0633\u062A\u0642\u0644\u0629." },
    { s: "\u0627\u0636\u063A\u0637 \u0647\u0646\u0627 \u0644\u0645\u0639\u0631\u0641\u0629 \u0627\u0644\u0645\u0632\u064A\u062F!", ok: false, why: "\u0646\u0635 \u062A\u0646\u0642\u0651\u0644\u060C \u0644\u0627 \u0645\u0639\u0644\u0648\u0645\u0629 \u0641\u064A\u0647." }
  ],
  schema: [
    "\u0639\u0644\u0627\u0645\u0627\u062A \u0627\u0644\u062A\u0646\u0635\u064A\u0635 \u062D\u0648\u0644 \u0623\u062D\u062F \u0627\u0644\u0645\u0641\u0627\u062A\u064A\u062D \u0645\u0641\u0642\u0648\u062F\u0629: \u0641\u064A JSON \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0643\u0644 \u0645\u0641\u062A\u0627\u062D \u0628\u064A\u0646 \u0639\u0644\u0627\u0645\u062A\u064A \u062A\u0646\u0635\u064A\u0635 \u0645\u0632\u062F\u0648\u062C\u062A\u064A\u0646.",
    "\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u200E@type\u200E \u0646\u0648\u0639\u064B\u0627 \u0645\u0646 schema.org. \xABBusiness\xBB \u0644\u064A\u0633 \u0643\u0630\u0644\u0643\u061B \u0627\u0633\u062A\u062E\u062F\u0645 LocalBusiness \u0623\u0648 \u0646\u0648\u0639\u064B\u0627 \u0623\u062F\u0642.",
    "\u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 openingHours \u0646\u0635\u064B\u0627 \u0645\u062B\u0644 \xABMo-Sa 09:00-18:00\xBB \u0644\u0627 \u062C\u0645\u0644\u0629.",
    "\u064A\u062C\u0628 \u0623\u0646 \u062A\u0633\u0631\u062F sameAs \u0627\u0644\u0631\u0648\u0627\u0628\u0637 \u0627\u0644\u0643\u0627\u0645\u0644\u0629 \u0644\u0645\u0644\u0641\u0627\u062A\u0643\u060C \u0644\u0627 \u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u0641\u0642\u0637.",
    "\u062A\u0648\u062C\u062F \u0641\u0627\u0635\u0644\u0629 \u0628\u0639\u062F \u0627\u0644\u0639\u0646\u0635\u0631 \u0627\u0644\u0623\u062E\u064A\u0631. \u0644\u0627 \u064A\u0633\u0645\u062D JSON \u0628\u0627\u0644\u0641\u0648\u0627\u0635\u0644 \u0627\u0644\u062E\u062A\u0627\u0645\u064A\u0629.",
    "priceRange \u0646\u0635\u061B \u0627\u0644\u0645\u062A\u0648\u0642\u0639 \u0646\u0637\u0627\u0642 \u0645\u062B\u0644 \xAB\u20AC\u20AC\xBB \u0623\u0648 \xAB50-120 \u20AC\xBB \u0644\u0627 \u0631\u0642\u0645."
  ],
  levels: ["\u0641\u0636\u0648\u0644\u064A", "\u0645\u062A\u062F\u0631\u0651\u0628", "\u0645\u0645\u0627\u0631\u0633", "\u0645\u062A\u062E\u0635\u0635", "\u0627\u0633\u062A\u0631\u0627\u062A\u064A\u062C\u064A", "\u062E\u0628\u064A\u0631", "\u0645\u062A\u0645\u0643\u0651\u0646"]
};

// packages/academy/de.json
var de_default3 = {
  tracks: [
    {
      id: "how",
      icon: "brain",
      t: "So funktioniert KI-Suche",
      d: "Woher Antworten kommen und warum Textpassagen gewinnen.",
      lessons: [
        {
          id: "how-1",
          t: "Zwei Wege, wie eine KI Sie kennt",
          cards: [
            "Ein Assistent antwortet aus zwei Quellen: aus dem, was er im Training gelernt hat (sein Ged\xE4chtnis), und aus einer Live-Websuche f\xFCr die Frage.",
            "Die Live-Suche l\xE4uft \xFCber Suchindizes und Crawler: Googles Index f\xFCr AI Overviews und AI Mode, Bings Index f\xFCr Copilot und eigene Bots wie OAI-SearchBot oder PerplexityBot.",
            "Also zwei Aufgaben: heute lesbar und indexiert sein (Technik) und im Web so oft erw\xE4hnt werden, dass Sie Teil des Ged\xE4chtnisses werden (Reputation)."
          ],
          quiz: { q: "Microsoft Copilot findet Webseiten vor allem \xFCber\u2026", o: ["Bings Index", "Googles Index", "nur seine Trainingsdaten"], a: 0, why: "Microsoft sagt, seine Richtlinien beschreiben, wie Bing Inhalte f\xFCr Bing-Suche, Copilot und fundierte Antworten crawlt und ausspielt." },
          src: { t: "Bing Webmaster Blog: AI Performance in den Bing Webmaster Tools", u: "https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview" },
          try: "mission"
        },
        {
          id: "how-2",
          t: "Query Fan-out: eine Frage, viele Suchen",
          cards: [
            "Laut Google k\xF6nnen AI Overviews und AI Mode \u201EQuery Fan-out\u201C nutzen: mehrere verwandte Suchen zu Unterthemen, dann eine Antwort.",
            "Ihre Seite kann f\xFCr eine Teilfrage (Preis, Entfernung, Vergleich) ausgew\xE4hlt werden, auch ohne f\xFCr die Hauptfrage zu ranken.",
            "Beantworten Sie die echten Teilfragen Ihrer Kunden, jede in einer klaren Passage. Google r\xE4t auch davon ab, f\xFCr jede Variante eine eigene Seite zu bauen."
          ],
          quiz: { q: "Was bedeutet Query Fan-out f\xFCr die Website eines kleinen Unternehmens?", o: ["Die konkreten Teilfragen klar beantworten", "Eine Seite pro Keyword-Variante schreiben", "Das Hauptkeyword \xF6fter wiederholen"], a: 0, why: "Fan-out holt Passagen f\xFCr Teilfragen. Klare Antworten gewinnen sie, d\xFCnne Variantenseiten und Wiederholungen nicht." },
          src: { t: "Google Search Central: KI-Funktionen und Ihre Website", u: "https://developers.google.com/search/docs/appearance/ai-features" },
          try: "mission"
        },
        {
          id: "how-3",
          t: "Passagen, nicht Seiten",
          cards: [
            "KI-Antworten zitieren kurze Passagen. Ein Satz, der allein verst\xE4ndlich ist, mit genanntem Subjekt und konkreter Angabe, l\xE4sst sich leicht \xFCbernehmen.",
            "In der GEO-Studie (KDD 2024) verbesserten Quellen, Zitate und Statistiken die Sichtbarkeit in generativen Antworten um bis zu etwa 40 %. Keyword-Stuffing half nicht.",
            "Schreiben Sie f\xFCr das Zitat: Antwort zuerst, eine Angabe pro Satz, die Quelle neben der Zahl."
          ],
          quiz: { q: "Was half in der GEO-Studie am meisten?", o: ["Statistiken, Zitate und Quellen erg\xE4nzen", "Mehr Keywords einf\xFCgen", "Seiten verl\xE4ngern"], a: 0, why: "Belege (Statistiken, Zitate, Quellen) brachten die gr\xF6\xDFten Zuw\xE4chse; Keyword-Stuffing nicht." },
          src: { t: "GEO: Generative Engine Optimization (Aggarwal u. a., KDD 2024)", u: "https://arxiv.org/abs/2311.09735" },
          try: "heat"
        }
      ]
    },
    {
      id: "access",
      icon: "shield-check",
      t: "Die richtigen Bots hereinlassen",
      d: "Such-Bots, Trainings-Bots und die Fallen dazwischen.",
      lessons: [
        {
          id: "access-1",
          t: "Such-Bots und Trainings-Bots",
          cards: [
            "Viele KI-Firmen betreiben zwei Arten von Crawlern. Such-Bots holen Seiten, um jetzt zu antworten. Trainings-Bots sammeln Text f\xFCr k\xFCnftige Modelle.",
            "OpenAI ist das klarste Beispiel: OAI-SearchBot dient der ChatGPT-Suche, GPTBot dem Training. GPTBot zu sperren entfernt Sie nicht aus der ChatGPT-Suche.",
            "Eine h\xE4ufige Wahl: Such-Bots erlauben und \xFCber das Training getrennt entscheiden. Das ist Ihre Entscheidung, kein Ranking-Trick."
          ],
          quiz: { q: "Sie sperren GPTBot in der robots.txt. Was passiert?", o: ["Sie widersprechen dem OpenAI-Training; die ChatGPT-Suche kann Sie weiter zeigen", "Sie verschwinden aus ChatGPT", "Gar nichts"], a: 0, why: "OpenAI dokumentiert GPTBot als Trainings-Crawler; OAI-SearchBot ist f\xFCr die Suche zust\xE4ndig." },
          src: { t: "OpenAI: \xDCbersicht der OpenAI-Crawler", u: "https://platform.openai.com/docs/bots" },
          try: "bots"
        },
        {
          id: "access-2",
          t: "Googlebot und Google-Extended",
          cards: [
            "Googles KI-Funktionen in der Suche (AI Overviews, AI Mode) nutzen das normale Googlebot-Crawling. Wer Googlebot sperrt, verschwindet aus der Google-Suche.",
            "Google-Extended ist ein eigenes Token: Es steuert die Nutzung Ihrer Inhalte f\xFCr Gemini-Modelle. Laut Google hat es keinen Einfluss auf Ihre Aufnahme in die Google-Suche.",
            "Um zu begrenzen, was von einer Seite gezeigt wird, verweist Google auf Snippet-Steuerungen wie nosnippet und max-snippet, nicht auf Sperren."
          ],
          quiz: { q: "Entfernt Sie eine Sperre von Google-Extended aus AI Mode?", o: ["Nein, die Google-Suche ist nicht betroffen", "Ja, nur aus AI Mode", "Ja, aus ganz Google"], a: 0, why: "Google dokumentiert, dass Google-Extended die Aufnahme in die Google-Suche nicht beeinflusst." },
          src: { t: "Google: G\xE4ngige Crawler (Google-Extended)", u: "https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers" },
          try: "bots"
        },
        {
          id: "access-3",
          t: "Fallen bei Firewall und CDN",
          cards: [
            "Die robots.txt ist nicht das einzige Tor. Eine Firewall oder CDN-Einstellung kann Bots sperren, die robots.txt erlaubt. Google bittet, das Crawling in robots.txt und in jedem CDN oder Hosting zu erlauben.",
            "Cloudflare (September 2026): Die Optionen \u201EBlock\u201C und \u201EBlock on pages with ads\u201C f\xFCr KI-Training stoppen auch Googlebot, Bingbot und Applebot, weil das Mehrzweck-Crawler sind.",
            "Wer nur dem Training widersprechen will, soll laut Cloudflare stattdessen \u201EDisallow AI Training\u201C nutzen."
          ],
          quiz: { q: "Welche Cloudflare-Einstellung widerspricht dem KI-Training, ohne Googlebot zu sperren?", o: ["Disallow AI Training", "Block on pages with ads", "Block"], a: 0, why: "Laut Cloudflare stoppen Block und Block on pages with ads auch Mehrzweck-Crawler wie Googlebot." },
          src: { t: "Cloudflare-Blog: Mehrzweck-KI-Crawler", u: "https://blog.cloudflare.com/accountable-mixed-use-ai-crawlers/" },
          try: "audit"
        }
      ]
    },
    {
      id: "entity",
      icon: "building-2",
      t: "Eine klare Entit\xE4t sein",
      d: "Namen, Fakten und Markup, denen Maschinen trauen.",
      lessons: [
        {
          id: "entity-1",
          t: "Gleicher Name, gleiche Fakten, \xFCberall",
          cards: [
            "Maschinen ordnen Fakten einer Entit\xE4t zu: einem Unternehmen mit Name, Art und Ort. Weichen Name, Adresse oder Telefon zwischen Website und Profilen ab, sind sie unsicherer, dass Sie es sind.",
            "Nutzen Sie eine Schreibweise des Namens. Wiederholen Sie die wichtigsten Fakten als Text auf der Website und im Google-Unternehmensprofil, bei Bing Places und in den wichtigsten Verzeichnissen.",
            "Erg\xE4nzen Sie Organization- oder LocalBusiness-Markup mit sameAs-Links zu Ihren offiziellen Profilen."
          ],
          quiz: { q: "Wof\xFCr ist sameAs da?", o: ["Um Ihre offiziellen Profile mit der Entit\xE4t Ihrer Website zu verbinden", "Um Inhalte einer anderen Seite zu kopieren", "Um Google zu sagen, welche Seite zuerst rankt"], a: 0, why: "sameAs listet URLs, die dieselbe Entit\xE4t bezeichnen, etwa offizielle Social- und Verzeichnisprofile." },
          src: { t: "Google: Strukturierte Daten f\xFCr Organisationen", u: "https://developers.google.com/search/docs/appearance/structured-data/organization" },
          try: "machine"
        },
        {
          id: "entity-2",
          t: "Markup, das zur Seite passt",
          cards: [
            "Strukturierte Daten m\xFCssen beschreiben, was Besucher sehen. Markup f\xFCr Inhalte, die nicht auf der Seite stehen, verst\xF6\xDFt gegen Googles Richtlinien.",
            "Google hat FAQ-Rich-Results im August 2023 auf bekannte Beh\xF6rden- und Gesundheitsseiten beschr\xE4nkt. Fragen und Antworten helfen Menschen und KI-Antworten weiterhin; nur die besondere Darstellung hat sich ge\xE4ndert.",
            "Google sagt au\xDFerdem, dass f\xFCr seine KI-Funktionen keine zus\xE4tzlichen Anforderungen und kein spezielles Schema n\xF6tig sind."
          ],
          quiz: { q: "Seit August 2023 erscheinen FAQ-Rich-Results bei\u2026", o: ["vor allem bekannten Beh\xF6rden- und Gesundheitsseiten", "jeder Seite mit FAQPage-Markup", "keiner Seite"], a: 0, why: "Google k\xFCndigte an, FAQ-Rich-Results nur noch f\xFCr bekannte, ma\xDFgebliche Beh\xF6rden- und Gesundheitswebsites zu zeigen." },
          src: { t: "Google Search Central Blog: \xC4nderungen bei HowTo und FAQ", u: "https://developers.google.com/search/blog/2023/08/howto-faq-changes" },
          try: "machine"
        },
        {
          id: "entity-3",
          t: "Fakten, die ein Assistent braucht",
          cards: [
            "Bevor ein Assistent Sie empfiehlt, will er wissen: Was ist es, wo, wann ge\xF6ffnet, was kostet es, wie buche oder erreiche ich es.",
            "Jede Angabe geh\xF6rt als Text auf die Seite (nicht nur in ein Bild oder Widget) und ins Markup: Adresse, \xD6ffnungszeiten, Telefon, Preisspanne oder Angebote.",
            "Fehlende Fakten f\xFCllen andere Websites, oder der Assistent nennt jemanden, dessen Fakten klar sind."
          ],
          quiz: { q: "Wo sollten die \xD6ffnungszeiten stehen?", o: ["Im Seitentext und in den strukturierten Daten", "Nur auf einem Foto des Ladenschilds", "Nur in sozialen Netzwerken"], a: 0, why: "Text und Markup lesen Crawler zuverl\xE4ssig, Bilder und Widgets oft nicht." },
          src: { t: "Google: Strukturierte Daten f\xFCr lokale Unternehmen", u: "https://developers.google.com/search/docs/appearance/structured-data/local-business" },
          try: "drive"
        }
      ]
    },
    {
      id: "cite",
      icon: "quote",
      t: "Schreiben, was KI zitiert",
      d: "Antwort zuerst, zitierbare S\xE4tze, echte Belege.",
      lessons: [
        {
          id: "cite-1",
          t: "Antwort zuerst",
          cards: [
            "Beginnen Sie mit der Antwort: was es ist, f\xFCr wen, wo und die n\xFCtzlichste Angabe. Ein oder zwei S\xE4tze.",
            "\u201EDar Noura ist ein G\xE4stehaus mit f\xFCnf Zimmern in Sidi Bou Said, 300 m vom Klippenweg, ganzj\xE4hrig ge\xF6ffnet.\u201C schl\xE4gt \u201EWillkommen in unserem kleinen Paradies.\u201C",
            "Der Einstieg ist die Passage, die am ehesten in eine Antwort \xFCbernommen wird. Machen Sie sie zitierw\xFCrdig."
          ],
          quiz: { q: "Welcher Einstieg ist zitierbarer?", o: ["\u201EDar Noura ist ein G\xE4stehaus mit f\xFCnf Zimmern in Sidi Bou Said, ganzj\xE4hrig ge\xF6ffnet.\u201C", "\u201EWillkommen! Sch\xF6n, dass Sie da sind.\u201C", "\u201EEntdecken Sie ein unvergessliches Erlebnis.\u201C"], a: 0, why: "Er nennt Subjekt, Kategorie, Ort und eine Angabe." },
          src: { t: "Google: Hilfreiche, zuverl\xE4ssige Inhalte erstellen", u: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content" },
          try: "audit"
        },
        {
          id: "cite-2",
          t: "S\xE4tze, die allein stehen",
          cards: [
            "Eine KI hebt einen Satz aus seinem Absatz. \u201EEs sind nur 10 Minuten\u201C sagt allein nichts. \u201EDar Noura liegt 10 Gehminuten vom TGM-Bahnhof\u201C schon.",
            "Nennen Sie das Subjekt statt \u201Ees\u201C, \u201Ewir\u201C oder \u201Edas\u201C. Eine konkrete Angabe pro Satz, 8 bis 30 W\xF6rter.",
            "Sadas Markierung zeigt, welche S\xE4tze einer Seite diesen Test schon bestehen."
          ],
          quiz: { q: "Warum f\xE4llt \u201EEs sind nur 10 Minuten\u201C durch?", o: ["Subjekt und Ort fehlen", "Es ist zu kurz f\xFCr Google", "Zahlen sind nicht erlaubt"], a: 0, why: "Ohne Kontext wei\xDF niemand, was \u201Ees\u201C ist und wovon es nah ist." },
          src: { t: "GEO: Generative Engine Optimization (KDD 2024)", u: "https://arxiv.org/abs/2311.09735" },
          try: "quote"
        },
        {
          id: "cite-3",
          t: "Belege und Wissen aus erster Hand",
          cards: [
            "Zahlen, genannte Quellen und kurze Zitate machen eine Passage glaubw\xFCrdiger und leichter zu zitieren.",
            "Googles Leitfaden zu generativen KI-Funktionen verlangt Inhalte, die keine Massenware sind: was nur Sie aus eigener Erfahrung sagen k\xF6nnen, statt was jede Seite wiederholt.",
            "Datieren Sie Aktualisierungen (sichtbares Datum und dateModified), damit Aktualit\xE4t erkennbar ist."
          ],
          quiz: { q: "Was sind Inhalte, die \u201Ekeine Massenware\u201C sind?", o: ["Inhalte, die nur Sie aus eigener Erfahrung oder Daten schreiben k\xF6nnen", "Von den Top-Ergebnissen kopierte Inhalte", "Sehr kurze Inhalte"], a: 0, why: "Massenware wiederholt Bekanntes; Fakten und Daten aus erster Hand machen eine Quelle zitierw\xFCrdig." },
          src: { t: "Google: F\xFCr generative KI-Funktionen optimieren", u: "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide" },
          try: "rewrite"
        }
      ]
    },
    {
      id: "offsite",
      icon: "newspaper",
      t: "Ins Gespr\xE4ch kommen",
      d: "Wie Agenturen Erw\xE4hnungen verdienen, die KI aufgreift.",
      lessons: [
        {
          id: "offsite-1",
          t: "Erw\xE4hnungen z\xE4hlen mehr als Links",
          cards: [
            "Ahrefs untersuchte 75.000 Marken: Markenerw\xE4hnungen im Web korrelierten am st\xE4rksten mit der Sichtbarkeit in AI Overviews (0,664). Backlinks deutlich schw\xE4cher (0,218).",
            "Marken im obersten Viertel bei Erw\xE4hnungen hatten etwa zehnmal so viele Nennungen in AI Overviews wie das n\xE4chste Viertel.",
            "Korrelation ist kein Beweis f\xFCr Ursache. Aber die Richtung ist klar: Im Web besprochen zu werden, geh\xF6rt zur Arbeit."
          ],
          quiz: { q: "Was korrelierte in der Ahrefs-Studie am st\xE4rksten mit Sichtbarkeit in AI Overviews?", o: ["Markenerw\xE4hnungen im Web", "Anzahl der Backlinks", "Werbeausgaben"], a: 0, why: "0,664 f\xFCr Markenerw\xE4hnungen gegen\xFCber 0,218 f\xFCr Backlinks und etwa 0,215 f\xFCr Anzeigenkosten." },
          src: { t: "Ahrefs: Sichtbarkeitsfaktoren von Marken in AI Overviews (75.000 Marken)", u: "https://ahrefs.com/blog/ai-overview-brand-correlation/" },
          try: "ask"
        },
        {
          id: "offsite-2",
          t: "Ihre PR-Liste steht in den Antworten",
          cards: [
            "Stellen Sie den Assistenten die Fragen Ihrer Kunden und sehen Sie, was sie zitieren: Reisef\xFChrer, Bestenlisten, Verzeichnisse, Lokalpresse, Foren.",
            "Diese Websites sind Ihre Digital-PR-Ziele. Verdienen Sie dort einen Platz mit etwas Erw\xE4hnenswertem: Daten, einer Geschichte, Expertenwissen, einem Event.",
            "Kaufen Sie nie Bewertungen. Die Regel der US-FTC (2024) verbietet gef\xE4lschte Bewertungen, auch KI-geschriebene, und den Kauf positiver oder negativer Bewertungen."
          ],
          quiz: { q: "Was ist nach der FTC-Regel zu Bewertungen erlaubt?", o: ["Echte Kunden um ehrliche Bewertungen bitten", "F\xFCr 5-Sterne-Bewertungen bezahlen", "KI-Bewertungen erfundener Kunden ver\xF6ffentlichen"], a: 0, why: "Die Regel zielt auf gef\xE4lschte, gekaufte und nicht offengelegte Insider-Bewertungen, nicht auf ehrliche Bitten an echte Kunden." },
          src: { t: "FTC: Endg\xFCltige Regel gegen gef\xE4lschte Bewertungen", u: "https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials" },
          try: "ask"
        },
        {
          id: "offsite-3",
          t: "Wikipedia, Wikidata und Foren: die Regeln",
          cards: [
            "Wikipedias Richtlinie zu Interessenkonflikten: Wer mit einem Unternehmen verbunden ist, legt das offen, bearbeitet dessen Artikel nicht direkt und schl\xE4gt \xC4nderungen auf der Diskussionsseite vor.",
            "Bezahlte Autoren m\xFCssen offenlegen, wer sie bezahlt; eine Verschwiegenheitsvereinbarung \xE4ndert daran nichts. Wikidata-Eintr\xE4ge brauchen seri\xF6se, \xF6ffentliche Belege.",
            "Auf Reddit und in Foren: als echtes Mitglied teilnehmen, sagen, wer Sie sind, wenn Sie Ihr Unternehmen erw\xE4hnen, und die Regeln jeder Community befolgen."
          ],
          quiz: { q: "Sie leiten ein Unternehmen. Wie verbessern Sie dessen Wikipedia-Artikel?", o: ["Verbindung offenlegen und \xC4nderungen auf der Diskussionsseite vorschlagen", "Selbst bearbeiten, ohne zu sagen, wer Sie sind", "Jemanden heimlich daf\xFCr bezahlen"], a: 0, why: "Die Richtlinie empfiehlt Offenlegung und Anfragen auf der Diskussionsseite; nicht offengelegtes bezahltes Bearbeiten verst\xF6\xDFt gegen die Nutzungsbedingungen." },
          src: { t: "Wikipedia: Interessenkonflikt (englisch)", u: "https://en.wikipedia.org/wiki/Wikipedia:Conflict_of_interest" },
          try: "ask"
        }
      ]
    },
    {
      id: "measure",
      icon: "chart-column",
      t: "Messen",
      d: "KI-Traffic und KI-Sichtbarkeit kostenlos sehen.",
      lessons: [
        {
          id: "measure-1",
          t: "KI-Besucher in Google Analytics",
          cards: [
            "Legen Sie in GA4 eine benutzerdefinierte Channelgruppe mit einem Channel \u201EKI-Assistenten\u201C an: Sitzungsquelle passt auf eine Liste von KI-Domains (chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com, claude.ai\u2026). Stellen Sie ihn \xFCber Referral.",
            "ChatGPT h\xE4ngt Links oft utm_source=chatgpt.com an. Manche KI-Klicks kommen aber ganz ohne Referrer an und z\xE4hlen als Direkt.",
            "KI-Traffic in der Analyse ist also eine Untergrenze, nicht die volle Zahl. Das Fix-Paket enth\xE4lt einen fertigen Regex."
          ],
          quiz: { q: "Warum geh\xF6rt der KI-Channel \xFCber Referral?", o: ["Channels werden der Reihe nach gepr\xFCft; die erste passende Regel gewinnt", "Google verlangt alphabetische Reihenfolge", "So wird der Traffic gr\xF6\xDFer"], a: 0, why: "Benutzerdefinierte Channelgruppen pr\xFCfen Channels in Reihenfolge; der spezifischere muss zuerst kommen." },
          src: { t: "Google Analytics-Hilfe: Benutzerdefinierte Channelgruppen", u: "https://support.google.com/analytics/answer/13051316" },
          try: "pack"
        },
        {
          id: "measure-2",
          t: "Berichte in Search Console und Bing",
          cards: [
            "Die Google Search Console hat seit dem 3. Juni 2026 Leistungsberichte f\xFCr generative KI: Impressionen in AI Overviews und AI Mode nach Seite, Land, Ger\xE4t und Datum.",
            "Die Bing Webmaster Tools haben AI Performance (\xF6ffentliche Vorschau seit Februar 2026): wie oft Ihre Inhalte in Copilot und Bings KI-Zusammenfassungen zitiert werden.",
            "Beides ist kostenlos. Pr\xFCfen Sie es monatlich, neben Ihren eigenen Antworttests."
          ],
          quiz: { q: "Was zeigt der KI-Bericht der Search Console?", o: ["Impressionen in AI Overviews und AI Mode", "Jede eingegebene Nutzerfrage", "Ihre Position in ChatGPT"], a: 0, why: "Der Bericht zeigt Impressionen nach Seite, Land, Ger\xE4t und Datum; Prompts werden nicht gezeigt." },
          src: { t: "Google Search Central Blog: Leistungsberichte f\xFCr generative KI", u: "https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports" },
          try: "pack"
        },
        {
          id: "measure-3",
          t: "Antworten testen wie in der Forschung",
          cards: [
            "KI-Antworten \xE4ndern sich von Durchlauf zu Durchlauf. SparkToro und Gumshoe fanden eine Chance von unter 1 zu 100, dass ChatGPT oder Googles KI f\xFCr dieselbe Frage zweimal dieselbe Markenliste liefert.",
            "Ein Screenshot beweist also wenig. Stellen Sie dieselben Fragen mehrmals, in mehreren Assistenten, und verfolgen Sie den Anteil der Antworten, die Sie nennen.",
            "Die Position in einer Liste ist meist Rauschen; h\xE4ufig vorzukommen ist das Signal."
          ],
          quiz: { q: "Was ist das bessere Ma\xDF f\xFCr KI-Sichtbarkeit?", o: ["Wie oft Sie \xFCber viele Durchl\xE4ufe genannt werden", "Ihre Position in einer Antwort", "Ein Screenshot pro Monat"], a: 0, why: "Listen \xE4ndern sich fast jedes Mal; die H\xE4ufigkeit der Nennung ist stabiler als der Rang." },
          src: { t: "SparkToro: KIs empfehlen Marken sehr uneinheitlich", u: "https://sparktoro.com/blog/new-research-ais-are-highly-inconsistent-when-recommending-brands-or-products-marketers-should-take-care-when-tracking-ai-visibility/" },
          try: "ask"
        }
      ]
    },
    {
      id: "agentic",
      icon: "bot",
      t: "Bereit f\xFCr KI-Agenten",
      d: "Wenn Assistenten f\xFCr Menschen buchen und kaufen.",
      lessons: [
        {
          id: "agentic-1",
          t: "Agenten, die kaufen",
          cards: [
            "Assistenten beginnen, Aufgaben zu erledigen, nicht nur zu antworten. OpenAI startete im September 2025 Instant Checkout in ChatGPT mit dem Agentic Commerce Protocol (mit Stripe).",
            "Google stellte im Januar 2026 das Universal Commerce Protocol (UCP) mit Shopify, Etsy, Wayfair, Target und Walmart vor; H\xE4ndler ver\xF6ffentlichen ihre F\xE4higkeiten unter /.well-known/ucp.",
            "Zahlungsstandards wie Googles AP2 liegen darunter. Shops: Pr\xFCfen Sie, was Ihre Plattform schon unterst\xFCtzt."
          ],
          quiz: { q: "Wo ver\xF6ffentlicht ein H\xE4ndler seine UCP-F\xE4higkeiten?", o: ["/.well-known/ucp", "/robots.txt", "/sitemap.xml"], a: 0, why: "UCP nutzt eine Well-known-Adresse auf der Domain des H\xE4ndlers." },
          src: { t: "Universal Commerce Protocol", u: "https://ucp.dev" },
          try: "drive"
        },
        {
          id: "agentic-2",
          t: "WebMCP: Formulare als Werkzeuge",
          cards: [
            "WebMCP ist ein von Chrome vorgeschlagener Webstandard: Eine Seite kann KI-Agenten im Browser Werkzeuge anbieten, statt dass Agenten raten, welchen Button sie dr\xFCcken.",
            "Der deklarative Weg braucht kein JavaScript: toolname und tooldescription am Formular, toolparamdescription an den Feldern. Der Browser baut daraus das Werkzeug.",
            "Es ist fr\xFCh (Origin Trial seit Chrome 149). Gute Formulare helfen schon heute."
          ],
          quiz: { q: "Welches Attribut macht ein Formular zum WebMCP-Werkzeug?", o: ["toolname", "data-ai", "aria-agent"], a: 0, why: "Chromes deklarative API nutzt toolname und tooldescription am Formular." },
          src: { t: "Chrome for Developers: WebMCP, deklarative API", u: "https://developer.chrome.com/docs/ai/webmcp/declarative-api" },
          try: "drive"
        },
        {
          id: "agentic-3",
          t: "Schon heute agententauglich",
          cards: [
            "Agenten lesen Seiten wie assistive Technologien. Felder brauchen echte Beschriftungen, Buttons einen Namen, und die Hauptaktion muss ein echter Link oder Button sein.",
            "Preise, \xD6ffnungszeiten und Kontaktdaten geh\xF6ren als Text und Markup auf die Seite, nicht als Bild.",
            "Sadas Agenten-Testfahrt pr\xFCft das auf jeder Seite in einer Sekunde."
          ],
          quiz: { q: "Ein Button zeigt nur ein Icon ohne Beschriftung. F\xFCr einen Agenten ist er\u2026", o: ["schwer zu erkennen", "kein Problem, Agenten lesen Icons", "schneller zu bedienen"], a: 0, why: "Ohne Textnamen oder aria-label wei\xDF ein Agent nicht, was der Button tut." },
          src: { t: "W3C WAI: Bedienelemente beschriften", u: "https://www.w3.org/WAI/tutorials/forms/labels/" },
          try: "drive"
        }
      ]
    },
    {
      id: "local",
      icon: "globe",
      t: "Lokal und mehrsprachig",
      d: "Kartenprofile, Sprachen, Arabisch und RTL.",
      lessons: [
        {
          id: "local-1",
          t: "Die Profile, die Assistenten lesen",
          cards: [
            "Bei lokalen Fragen st\xFCtzen sich Assistenten auf Karten- und Unternehmensdaten: Google-Unternehmensprofil, Bing Places for Business, Apple Business Connect (Apple Karten und Siri).",
            "Beanspruchen Sie alle drei. Gleicher Name, Adresse, Telefon, \xD6ffnungszeiten und Kategorien wie auf Ihrer Website.",
            "F\xFCgen Sie Fotos und echte Beschreibungen hinzu und antworten Sie auf Bewertungen: Das sind \xF6ffentliche Fakten \xFCber Sie."
          ],
          quiz: { q: "Welches Profil speist Apple Karten und Siri?", o: ["Apple Business Connect", "Bing Places", "Eine LinkedIn-Seite"], a: 0, why: "Mit Apple Business Connect verwalten Unternehmen ihren Auftritt in Apple Karten, Siri und anderen Apple-Apps." },
          src: { t: "Apple Business Connect", u: "https://businessconnect.apple.com/" },
          try: "drive"
        },
        {
          id: "local-2",
          t: "Sprachversionen richtig gemacht",
          cards: [
            "Jede Sprachversion bekommt eine eigene URL, ein lang-Attribut und hreflang-Links zu allen Versionen einschlie\xDFlich sich selbst, plus x-default.",
            "\xDCbersetzen Sie auch Titel, Beschreibung und strukturierte Daten, nicht nur den sichtbaren Text.",
            "Falsche Sprachsignale schicken Menschen und KI-Antworten zur falschen Version."
          ],
          quiz: { q: "Geh\xF6rt die Seite selbst in ihre hreflang-Liste?", o: ["Ja, jede Version listet alle Versionen einschlie\xDFlich sich selbst", "Nein, nur die anderen Sprachen", "Nur x-default ist n\xF6tig"], a: 0, why: "Google verlangt, dass jede Sprachversion sich selbst und alle anderen auflistet." },
          src: { t: "Google: Lokalisierte Versionen Ihrer Seite angeben", u: "https://developers.google.com/search/docs/specialty/international/localized-versions" },
          try: "audit"
        },
        {
          id: "local-3",
          t: "Arabisch und Rechts-nach-links",
          cards: [
            'Arabische Seiten brauchen lang="ar" und dir="rtl" am html-Element, damit Browser, Screenreader und Maschinen sie in der richtigen Richtung lesen.',
            "Schreiben Sie arabische Inhalte f\xFCr arabische Leser (die Begriffe, nach denen sie suchen), nicht nur eine maschinelle \xDCbersetzung der franz\xF6sischen oder englischen Seite.",
            "Halten Sie Zahlen, Preise und Namen in allen Sprachversionen gleich, damit die Fakten \xFCberall \xFCbereinstimmen."
          ],
          quiz: { q: 'Wohin geh\xF6rt dir="rtl" auf einer arabischen Seite?', o: ["An das html-Element", "Nur an Bilder", "In die robots.txt"], a: 0, why: "Das W3C empfiehlt, die Grundrichtung am html-Element festzulegen." },
          src: { t: "W3C: Strukturelles Markup und Rechts-nach-links-Text in HTML", u: "https://www.w3.org/International/questions/qa-html-dir" },
          try: "audit"
        }
      ]
    }
  ],
  facts: [
    { s: "Wer GPTBot sperrt, verschwindet aus der ChatGPT-Suche.", f: false, why: "GPTBot ist OpenAIs Trainings-Crawler; die ChatGPT-Suche nutzt OAI-SearchBot." },
    { s: "Googles AI Overviews und AI Mode k\xF6nnen f\xFCr eine Frage mehrere verwandte Suchen ausf\xFChren.", f: true, why: "Google nennt das Query Fan-out." },
    { s: "Man braucht eine llms.txt, um in Googles KI-Funktionen zu erscheinen.", f: false, why: "Laut Google sind keine besonderen Dateien oder Markups n\xF6tig." },
    { s: "Eine Sperre von Google-Extended entfernt Sie aus der Google-Suche.", f: false, why: "Laut Google hat Google-Extended keinen Einfluss auf die Google-Suche." },
    { s: "In einer Studie mit 75.000 Marken korrelierten Web-Erw\xE4hnungen st\xE4rker mit Sichtbarkeit in AI Overviews als Backlinks.", f: true, why: "Ahrefs: 0,664 f\xFCr Erw\xE4hnungen gegen\xFCber 0,218 f\xFCr Backlinks." },
    { s: "Stellt man einer KI zweimal dieselbe Frage, kommt meist dieselbe Markenliste.", f: false, why: "SparkToro und Gumshoe: Chance unter 1 zu 100." },
    { s: "Die Search Console zeigt Impressionen in AI Overviews und AI Mode.", f: true, why: "Leistungsberichte f\xFCr generative KI seit Juni 2026." },
    { s: "Bei Cloudflare kann \u201EBlock on pages with ads\u201C f\xFCr KI-Training auch Googlebot stoppen.", f: true, why: "Cloudflare, September 2026: Mehrzweck-Crawler sind betroffen." },
    { s: "FAQ-Rich-Results erscheinen weiterhin bei jeder Seite mit FAQPage-Markup.", f: false, why: "Seit August 2023 vor allem bei bekannten Beh\xF6rden- und Gesundheitsseiten." },
    { s: "In der GEO-Studie machten Statistiken und Quellen Seiten in generativen Antworten sichtbarer.", f: true, why: "Bis zu etwa 40 % im KDD-2024-Paper." },
    { s: "Positive Bewertungen zu kaufen ist erlaubt, wenn echte Menschen sie schreiben.", f: false, why: "Die FTC-Regel verbietet den Kauf positiver oder negativer Bewertungen." },
    { s: "Ein Unternehmen sollte seinen Wikipedia-Artikel selbst bearbeiten, damit er stimmt.", f: false, why: "Wikipedia bittet um Offenlegung und Vorschl\xE4ge auf der Diskussionsseite." }
  ],
  quotes: [
    { s: "Dar Noura ist ein G\xE4stehaus mit f\xFCnf Zimmern in Sidi Bou Said, ganzj\xE4hrig ge\xF6ffnet.", ok: true, why: "Subjekt genannt, Kategorie, Ort, eine Angabe." },
    { s: "Es sind nur zehn Minuten.", ok: false, why: "Was ist \u201Ees\u201C, und zehn Minuten wovon?" },
    { s: "Dar Noura liegt 10 Gehminuten vom TGM-Bahnhof Sidi Bou Said entfernt.", ok: true, why: "Steht allein, mit messbarer Entfernung." },
    { s: "Wir bieten Ihnen ein unvergessliches Erlebnis, das Sie lieben werden.", ok: false, why: "Kein Subjekt, keine Angabe: reines Marketing." },
    { s: "Das Fr\xFChst\xFCck im Dar Noura wird von 8 bis 10:30 Uhr auf der Dachterrasse serviert.", ok: true, why: "Subjekt, Ort, Uhrzeiten." },
    { s: "Unsere Zimmer sind gro\xDFartig und gem\xFCtlich.", ok: false, why: "Meinung ohne \xFCberpr\xFCfbare Angabe." },
    { s: "Jedes der f\xFCnf Zimmer im Dar Noura hat eine Klimaanlage und ein eigenes Bad.", ok: true, why: "Konkrete, \xFCberpr\xFCfbare Fakten." },
    { s: "Wie oben erw\xE4hnt, ist das die beste Wahl.", ok: false, why: "H\xE4ngt vom Kontext ab und behauptet ohne Beleg." },
    { s: "Der Check-in im Dar Noura beginnt um 14 Uhr, der Check-out ist bis 11 Uhr.", ok: true, why: "Pr\xE4zise und eigenst\xE4ndig." },
    { s: "Hier klicken f\xFCr mehr Infos!", ok: false, why: "Navigationstext, keine Information." }
  ],
  schema: [
    "Um einen Schl\xFCssel fehlen die Anf\xFChrungszeichen: In JSON steht jeder Schl\xFCssel in doppelten Anf\xFChrungszeichen.",
    "@type muss ein schema.org-Typ sein. \u201EBusiness\u201C ist keiner; nutzen Sie LocalBusiness oder einen genaueren Typ.",
    "openingHours muss Text wie \u201EMo-Sa 09:00-18:00\u201C sein, kein Satz.",
    "sameAs muss vollst\xE4ndige URLs Ihrer Profile enthalten, nicht nur Benutzernamen.",
    "Nach dem letzten Eintrag steht ein Komma. JSON erlaubt keine abschlie\xDFenden Kommas.",
    "priceRange ist Text; erwartet wird eine Spanne wie \u201E\u20AC\u20AC\u201C oder \u201E50 \u20AC-120 \u20AC\u201C, keine Zahl."
  ],
  levels: ["Neugierig", "Lehrling", "Praktiker", "Spezialist", "Stratege", "Experte", "Meister"]
};

// packages/academy/en.json
var en_default3 = {
  tracks: [
    {
      id: "how",
      icon: "brain",
      t: "How AI search works",
      d: "Where answers come from, and why passages win.",
      lessons: [
        {
          id: "how-1",
          t: "Two ways an AI knows you",
          cards: [
            "An assistant answers from two places: what it learned in training (its memory), and a live web search it runs for the question.",
            "Live search goes through search indexes and crawlers: Google's index for AI Overviews and AI Mode, Bing's for Copilot, and the assistants' own bots such as OAI-SearchBot or PerplexityBot.",
            "So there are two jobs. Be readable and indexed today (technical), and be talked about widely enough to be part of the memory (reputation)."
          ],
          quiz: { q: "Microsoft Copilot finds web pages mainly through\u2026", o: ["Bing's index", "Google's index", "Only its training data"], a: 0, why: "Microsoft says its guidelines cover how Bing crawls and surfaces content across Bing search, Copilot and grounding results." },
          src: { t: "Bing Webmaster Blog: AI Performance in Bing Webmaster Tools", u: "https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview" },
          try: "mission"
        },
        {
          id: "how-2",
          t: "Query fan-out: one question, many searches",
          cards: [
            'Google says AI Overviews and AI Mode may use "query fan-out": they run several related searches across subtopics, then write one answer.',
            "Your page can be picked for one sub-question (price, distance, a comparison) even if it does not rank for the main question.",
            "Answer the sub-questions customers really have, each in its own clear passage. Google also warns against making a separate page for every possible variation."
          ],
          quiz: { q: "What does query fan-out mean for a small business site?", o: ["Answer the specific sub-questions clearly", "Write one page per keyword variation", "Repeat the main keyword more often"], a: 0, why: "Fan-out retrieves passages for sub-questions. Clear answers win them; thin variant pages and repetition do not." },
          src: { t: "Google Search Central: AI features and your website", u: "https://developers.google.com/search/docs/appearance/ai-features" },
          try: "mission"
        },
        {
          id: "how-3",
          t: "Passages, not pages",
          cards: [
            "AI answers quote short passages. A sentence that makes sense on its own, with the subject named and a concrete fact, is easy to lift.",
            "In the GEO study (KDD 2024), adding citations, quotations and statistics improved visibility in generative answers by up to about 40%. Keyword stuffing did not help.",
            "Write for the quote: answer first, one fact per sentence, the source next to the number."
          ],
          quiz: { q: "Which change helped most in the GEO study?", o: ["Adding statistics, quotations and sources", "Adding more keywords", "Making pages longer"], a: 0, why: "Evidence (statistics, quotations, citations) gave the biggest gains; keyword stuffing did not improve results." },
          src: { t: "GEO: Generative Engine Optimization (Aggarwal et al., KDD 2024)", u: "https://arxiv.org/abs/2311.09735" },
          try: "heat"
        }
      ]
    },
    {
      id: "access",
      icon: "shield-check",
      t: "Let the right bots in",
      d: "Search bots, training bots, and the traps in between.",
      lessons: [
        {
          id: "access-1",
          t: "Search bots and training bots",
          cards: [
            "Many AI companies run two kinds of crawlers. Search bots fetch pages to answer people now. Training bots collect text to train future models.",
            "OpenAI is the clearest example: OAI-SearchBot is for ChatGPT search; GPTBot is for training. Blocking GPTBot does not remove you from ChatGPT search.",
            "A common choice: allow search bots, and decide separately about training. It is your choice, not a ranking trick."
          ],
          quiz: { q: "You block GPTBot in robots.txt. What happens?", o: ["You opt out of OpenAI training; ChatGPT search can still show you", "You disappear from ChatGPT", "Nothing at all"], a: 0, why: "OpenAI documents GPTBot as its training crawler; OAI-SearchBot handles search." },
          src: { t: "OpenAI: Overview of OpenAI crawlers", u: "https://platform.openai.com/docs/bots" },
          try: "bots"
        },
        {
          id: "access-2",
          t: "Googlebot and Google-Extended",
          cards: [
            "Google's AI features in Search (AI Overviews, AI Mode) use the normal Googlebot crawl. Blocking Googlebot removes you from Search entirely.",
            "Google-Extended is a separate token: it controls use of your content for Gemini models. Google says it does not affect your inclusion in Google Search.",
            "To limit what is shown from a page, Google points to snippet controls such as nosnippet and max-snippet, not to blocking."
          ],
          quiz: { q: "Does blocking Google-Extended remove you from AI Mode?", o: ["No, it does not affect Google Search", "Yes, from AI Mode only", "Yes, from all of Google"], a: 0, why: "Google documents that Google-Extended does not impact a site's inclusion in Google Search." },
          src: { t: "Google: Common crawlers (Google-Extended)", u: "https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers" },
          try: "bots"
        },
        {
          id: "access-3",
          t: "Firewall and CDN traps",
          cards: [
            "robots.txt is not the only gate. A firewall or CDN setting can block bots that robots.txt allows. Google asks site owners to allow crawling in robots.txt and in any CDN or hosting layer.",
            'Cloudflare (September 2026): its "Block" and "Block on pages with ads" options for AI training also stop Googlebot, Bingbot and Applebot, because they are mixed-use crawlers.',
            'If you only want to opt out of training, Cloudflare points to its "Disallow AI Training" setting instead.'
          ],
          quiz: { q: "On Cloudflare, which setting opts out of AI training without blocking Googlebot?", o: ["Disallow AI Training", "Block on pages with ads", "Block"], a: 0, why: "Cloudflare says Block and Block on pages with ads also stop mixed-use crawlers such as Googlebot." },
          src: { t: "Cloudflare blog: Accountable mixed-use AI crawlers", u: "https://blog.cloudflare.com/accountable-mixed-use-ai-crawlers/" },
          try: "audit"
        }
      ]
    },
    {
      id: "entity",
      icon: "building-2",
      t: "Be one clear entity",
      d: "Names, facts and markup machines can trust.",
      lessons: [
        {
          id: "entity-1",
          t: "Same name, same facts, everywhere",
          cards: [
            "Machines connect facts to an entity: a business with a name, a type, a place. If your name, address or phone differ between your site and your profiles, they are less sure it is you.",
            "Use one form of the name. Repeat the key facts in text on your site and in your Google Business Profile, Bing Places and main directories.",
            "Add Organization or LocalBusiness markup with sameAs links to your official profiles."
          ],
          quiz: { q: "What is sameAs for?", o: ["Linking your official profiles to your site's entity", "Copying another page's content", "Telling Google which page ranks first"], a: 0, why: "sameAs lists URLs that identify the same entity, such as official social and directory profiles." },
          src: { t: "Google: Organization structured data", u: "https://developers.google.com/search/docs/appearance/structured-data/organization" },
          try: "machine"
        },
        {
          id: "entity-2",
          t: "Markup that matches the page",
          cards: [
            "Structured data must describe what visitors can see. Markup for content that is not on the page breaks Google's guidelines.",
            "Google limited FAQ rich results in August 2023 to well-known government and health sites. Question-and-answer content can still help people and AI answers; only the special display changed.",
            "Google also says there are no extra requirements and no special schema needed to appear in its AI features."
          ],
          quiz: { q: "Since August 2023, FAQ rich results in Google show for\u2026", o: ["Mainly well-known government and health sites", "Every site with FAQPage markup", "No site at all"], a: 0, why: "Google announced FAQ rich results would show only for well-known, authoritative government and health websites." },
          src: { t: "Google Search Central blog: HowTo and FAQ changes", u: "https://developers.google.com/search/blog/2023/08/howto-faq-changes" },
          try: "machine"
        },
        {
          id: "entity-3",
          t: "Facts an assistant needs",
          cards: [
            "Before recommending you, an assistant tries to answer: what is it, where, when is it open, what does it cost, how do I book or reach it.",
            "Put each fact in plain text on the page (not only in an image or a widget), and in your markup: address, opening hours, phone, price range or offers.",
            "Missing facts get filled by other websites, or the assistant names someone whose facts are clear."
          ],
          quiz: { q: "Where should opening hours be?", o: ["In page text and in your structured data", "Only in a picture of your shop sign", "Only on social media"], a: 0, why: "Text and markup are what crawlers read reliably; images and widgets often are not." },
          src: { t: "Google: Local business structured data", u: "https://developers.google.com/search/docs/appearance/structured-data/local-business" },
          try: "drive"
        }
      ]
    },
    {
      id: "cite",
      icon: "quote",
      t: "Write what AI quotes",
      d: "Answer first, quotable sentences, real evidence.",
      lessons: [
        {
          id: "cite-1",
          t: "Answer first",
          cards: [
            "Open with the answer: what it is, for whom, where, and the single most useful fact. One or two sentences.",
            '"Dar Noura is a five-room guest house in Sidi Bou Said, 300 m from the cliff path, open all year." beats "Welcome to our little piece of paradise."',
            "The opening is the passage most likely to be lifted into an answer. Make it worth lifting."
          ],
          quiz: { q: "Which opening is more quotable?", o: ['"Dar Noura is a five-room guest house in Sidi Bou Said, open all year."', '"Welcome! We are so happy you are here."', '"Discover an unforgettable experience."'], a: 0, why: "It names the subject, the category, the place and a fact." },
          src: { t: "Google: Creating helpful, people-first content", u: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content" },
          try: "audit"
        },
        {
          id: "cite-2",
          t: "Sentences that stand alone",
          cards: [
            'An AI lifts a sentence out of its paragraph. "It is only 10 minutes away" means nothing alone. "Dar Noura is a 10-minute walk from the TGM station" does.',
            "Name the subject instead of it, we or this. Keep one concrete fact per sentence, 8 to 30 words.",
            "Sada's highlighter shows which sentences on a page already pass this test."
          ],
          quiz: { q: 'Why does "It is only 10 minutes away" fail?', o: ["The subject and the place are missing", "It is too short for Google", "Numbers are not allowed"], a: 0, why: 'Out of context, nobody knows what "it" is or what it is close to.' },
          src: { t: "GEO: Generative Engine Optimization (KDD 2024)", u: "https://arxiv.org/abs/2311.09735" },
          try: "quote"
        },
        {
          id: "cite-3",
          t: "Evidence and first-hand knowledge",
          cards: [
            "Numbers, named sources and short quotations make a passage easier to trust and to cite.",
            "Google's guide to its generative AI features asks for non-commodity content: what only you can say, from first-hand experience, rather than what every site repeats.",
            "Date your updates (a visible date and dateModified) so freshness is clear."
          ],
          quiz: { q: 'What is "non-commodity" content?', o: ["Content only you can write, from your own experience or data", "Content copied from the top results", "Very short content"], a: 0, why: "Commodity content repeats what is everywhere; first-hand facts and data are what make a source worth citing." },
          src: { t: "Google: Optimizing for generative AI features", u: "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide" },
          try: "rewrite"
        }
      ]
    },
    {
      id: "offsite",
      icon: "newspaper",
      t: "Get talked about",
      d: "How agencies earn mentions AI picks up.",
      lessons: [
        {
          id: "offsite-1",
          t: "Mentions matter more than links",
          cards: [
            "Ahrefs studied 75,000 brands: branded web mentions had the strongest correlation with visibility in AI Overviews (0.664). Backlinks were much weaker (0.218).",
            "Brands in the top quarter for web mentions got about 10 times more AI Overview mentions than the next quarter.",
            "Correlation is not proof of cause. But the direction is clear: being discussed across the web is part of the job."
          ],
          quiz: { q: "In the Ahrefs study, what correlated most with AI Overview visibility?", o: ["Branded web mentions", "Number of backlinks", "Ad spend"], a: 0, why: "0.664 for branded web mentions versus 0.218 for backlinks and about 0.215 for ad cost." },
          src: { t: "Ahrefs: AI Overview brand visibility factors (75K brands)", u: "https://ahrefs.com/blog/ai-overview-brand-correlation/" },
          try: "ask"
        },
        {
          id: "offsite-2",
          t: "Your PR list is in the answers",
          cards: [
            `Ask the assistants your customers' questions and look at what they cite: travel guides, "best of" lists, directories, local news, forums.`,
            "Those sites are your digital PR targets. Earn a place on them with something worth mentioning: data, a story, an expert view, an event.",
            "Never buy reviews. The US FTC rule (2024) bans fake reviews, including AI-written ones, and buying positive or negative reviews."
          ],
          quiz: { q: "Which is allowed under the FTC rule on reviews?", o: ["Asking real customers for honest reviews", "Paying for 5-star reviews", "Posting AI-written reviews from invented customers"], a: 0, why: "The rule targets fake reviews, purchased reviews and undisclosed insider reviews, not honest requests to real customers." },
          src: { t: "FTC: Final rule banning fake reviews and testimonials", u: "https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials" },
          try: "ask"
        },
        {
          id: "offsite-3",
          t: "Wikipedia, Wikidata and forums: the rules",
          cards: [
            "Wikipedia's conflict of interest guideline: if you are connected to a company, disclose it, do not edit its article directly, and propose changes on the article's talk page.",
            "Paid editors must disclose who pays them, and a non-disclosure agreement does not change that. Wikidata items need serious, public references.",
            "On Reddit and forums, take part as a real member, say who you are when you mention your business, and follow each community's rules."
          ],
          quiz: { q: "You run a company. How should you improve its Wikipedia article?", o: ["Disclose your link and suggest edits on the talk page", "Edit it yourself without saying who you are", "Pay someone to edit it secretly"], a: 0, why: "The guideline advises disclosure and talk-page requests; undisclosed paid editing breaks the Terms of Use." },
          src: { t: "Wikipedia: Conflict of interest", u: "https://en.wikipedia.org/wiki/Wikipedia:Conflict_of_interest" },
          try: "ask"
        }
      ]
    },
    {
      id: "measure",
      icon: "chart-column",
      t: "Measure it",
      d: "See AI traffic and AI visibility for free.",
      lessons: [
        {
          id: "measure-1",
          t: "AI visitors in Google Analytics",
          cards: [
            'Create a custom channel group in GA4 with a channel such as "AI assistants": session source matches a list of AI domains (chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com, claude.ai\u2026). Place it above Referral.',
            "ChatGPT often adds utm_source=chatgpt.com to links. But some AI clicks arrive with no referrer at all and count as Direct.",
            "So AI traffic in analytics is a floor, not the full number. The fix pack includes a ready regex."
          ],
          quiz: { q: "Why place the AI channel above Referral?", o: ["Channels match in order; the first matching rule wins", "Google requires alphabetical order", "It makes the traffic bigger"], a: 0, why: "Custom channel groups evaluate channels in order, so a more specific channel must come first." },
          src: { t: "Google Analytics help: Custom channel groups", u: "https://support.google.com/analytics/answer/13051316" },
          try: "pack"
        },
        {
          id: "measure-2",
          t: "Search Console and Bing reports",
          cards: [
            "Google Search Console has had Search Generative AI performance reports since 3 June 2026: impressions in AI Overviews and AI Mode, by page, country, device and date.",
            "Bing Webmaster Tools has AI Performance (public preview since February 2026): how often your content is cited in Copilot and Bing's AI summaries.",
            "Both are free. Check them monthly, next to your own answer tests."
          ],
          quiz: { q: "What does Search Console's generative AI report show?", o: ["Impressions in AI Overviews and AI Mode", "Every prompt users typed", "Your rank inside ChatGPT"], a: 0, why: "The report shows impressions with page, country, device and date breakdowns; prompts are not shown." },
          src: { t: "Google Search Central blog: Search Generative AI performance reports", u: "https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports" },
          try: "pack"
        },
        {
          id: "measure-3",
          t: "Test answers like a researcher",
          cards: [
            "AI answers change from run to run. SparkToro and Gumshoe found less than a 1-in-100 chance that ChatGPT or Google's AI returns the same list of brands twice for the same prompt.",
            "So one screenshot proves little. Ask the same questions several times, in several assistants, and track the share of answers that name you.",
            "Position in a list is mostly noise; being present often is the signal."
          ],
          quiz: { q: "What is the better AI visibility measure?", o: ["How often you are named across many runs", "Your position in one answer", "One screenshot a month"], a: 0, why: "Lists vary almost every time; frequency of presence is steadier than rank." },
          src: { t: "SparkToro: AIs are highly inconsistent when recommending brands", u: "https://sparktoro.com/blog/new-research-ais-are-highly-inconsistent-when-recommending-brands-or-products-marketers-should-take-care-when-tracking-ai-visibility/" },
          try: "ask"
        }
      ]
    },
    {
      id: "agentic",
      icon: "bot",
      t: "Ready for AI agents",
      d: "When assistants book and buy for people.",
      lessons: [
        {
          id: "agentic-1",
          t: "Agents that buy",
          cards: [
            "Assistants are starting to complete tasks, not only answer. OpenAI launched Instant Checkout in ChatGPT with the Agentic Commerce Protocol (with Stripe) in September 2025.",
            "Google announced the Universal Commerce Protocol (UCP) in January 2026 with Shopify, Etsy, Wayfair, Target and Walmart; merchants publish capabilities at /.well-known/ucp.",
            "Payment standards such as Google's AP2 sit underneath. Shops: check what your platform already supports."
          ],
          quiz: { q: "Where does a merchant publish its UCP capabilities?", o: ["/.well-known/ucp", "/robots.txt", "/sitemap.xml"], a: 0, why: "UCP uses a well-known address on the merchant's domain." },
          src: { t: "Universal Commerce Protocol", u: "https://ucp.dev" },
          try: "drive"
        },
        {
          id: "agentic-2",
          t: "WebMCP: forms as tools",
          cards: [
            "WebMCP is a proposed web standard from Chrome that lets a page offer tools to AI agents in the browser, instead of agents guessing which button to press.",
            "The declarative way needs no JavaScript: add toolname and tooldescription to a form, and toolparamdescription to its fields. The browser builds the tool from the form.",
            "It is early (origin trial since Chrome 149). Good forms help today anyway."
          ],
          quiz: { q: "Which attribute turns a form into a WebMCP tool?", o: ["toolname", "data-ai", "aria-agent"], a: 0, why: "Chrome's declarative API uses toolname and tooldescription on the form." },
          src: { t: "Chrome for Developers: WebMCP declarative API", u: "https://developer.chrome.com/docs/ai/webmcp/declarative-api" },
          try: "drive"
        },
        {
          id: "agentic-3",
          t: "Agent-friendly today",
          cards: [
            "Agents read pages like assistive technology does. Fields need real labels, buttons need names, and the main action must be a real link or button.",
            "Prices, hours and contact details should be text and markup, not pictures.",
            "Sada's Agent test drive checks these on any page in a second."
          ],
          quiz: { q: "A button shows only an icon with no label. For an agent it is\u2026", o: ["Hard to identify", "Fine, agents read icons", "Faster to use"], a: 0, why: "Without a text name or aria-label, an agent cannot tell what the button does." },
          src: { t: "W3C WAI: Labeling controls", u: "https://www.w3.org/WAI/tutorials/forms/labels/" },
          try: "drive"
        }
      ]
    },
    {
      id: "local",
      icon: "globe",
      t: "Local and multilingual",
      d: "Maps profiles, languages, Arabic and RTL.",
      lessons: [
        {
          id: "local-1",
          t: "The profiles assistants read",
          cards: [
            "For local questions, assistants lean on maps and business data: Google Business Profile, Bing Places for Business, Apple Business Connect (Apple Maps and Siri).",
            "Claim all three. Use the same name, address, phone, hours and categories as your website.",
            "Add photos, real descriptions and answer reviews: they are public facts about you."
          ],
          quiz: { q: "Which profile feeds Apple Maps and Siri?", o: ["Apple Business Connect", "Bing Places", "LinkedIn Page"], a: 0, why: "Apple Business Connect is where businesses manage how they appear in Apple Maps, Siri and other Apple apps." },
          src: { t: "Apple Business Connect", u: "https://businessconnect.apple.com/" },
          try: "drive"
        },
        {
          id: "local-2",
          t: "Language versions done right",
          cards: [
            "Each language version gets its own URL, a lang attribute, and hreflang links to every version including itself, plus x-default.",
            "Translate the title, description and structured data too, not only the visible text.",
            "Wrong language signals send people, and AI answers, to the wrong version."
          ],
          quiz: { q: "Should a page's hreflang list include the page itself?", o: ["Yes, every version lists all versions including itself", "No, only the other languages", "Only x-default is needed"], a: 0, why: "Google asks each language version to list itself and all other versions." },
          src: { t: "Google: Tell Google about localized versions of your page", u: "https://developers.google.com/search/docs/specialty/international/localized-versions" },
          try: "audit"
        },
        {
          id: "local-3",
          t: "Arabic and right-to-left",
          cards: [
            'Arabic pages need lang="ar" and dir="rtl" on the html element, so browsers, screen readers and machines read them in the right direction.',
            "Write Arabic content for Arabic readers (dialect and terms they search with), not only a machine translation of the French or English page.",
            "Keep numbers, prices and names consistent across language versions so facts match everywhere."
          ],
          quiz: { q: 'Where should dir="rtl" go on an Arabic page?', o: ["On the html element", "Only on images", "In robots.txt"], a: 0, why: "W3C recommends setting the base direction on the html element." },
          src: { t: "W3C: Structural markup and right-to-left text in HTML", u: "https://www.w3.org/International/questions/qa-html-dir" },
          try: "audit"
        }
      ]
    }
  ],
  facts: [
    { s: "Blocking GPTBot removes your site from ChatGPT search.", f: false, why: "GPTBot is OpenAI's training crawler; ChatGPT search uses OAI-SearchBot." },
    { s: "Google AI Overviews and AI Mode may run several related searches for one question.", f: true, why: "Google calls it query fan-out." },
    { s: "You need an llms.txt file to appear in Google's AI features.", f: false, why: "Google says no special files or markup are required for its AI features." },
    { s: "Blocking Google-Extended removes you from Google Search.", f: false, why: "Google says Google-Extended does not affect inclusion in Google Search." },
    { s: "In a study of 75,000 brands, web mentions correlated more with AI Overview visibility than backlinks.", f: true, why: "Ahrefs: 0.664 for branded mentions versus 0.218 for backlinks." },
    { s: "Asking an AI the same question twice usually gives the same list of brands.", f: false, why: "SparkToro and Gumshoe: under 1 in 100 chance of the same list." },
    { s: "Search Console shows impressions in AI Overviews and AI Mode.", f: true, why: "Generative AI performance reports, since June 2026." },
    { s: 'On Cloudflare, "Block on pages with ads" for AI training can also stop Googlebot.', f: true, why: "Cloudflare, September 2026: mixed-use crawlers are covered by that setting." },
    { s: "FAQ rich results still show for every site with FAQPage markup.", f: false, why: "Since August 2023, mainly for well-known government and health sites." },
    { s: "Adding statistics and sources made pages more visible in generative answers in the GEO study.", f: true, why: "Up to about 40% in the KDD 2024 paper." },
    { s: "Buying positive reviews is allowed if they are written by real people.", f: false, why: "The FTC rule bans buying positive or negative reviews." },
    { s: "A company should edit its own Wikipedia article directly to keep it accurate.", f: false, why: "Wikipedia asks connected editors to disclose and propose changes on the talk page." }
  ],
  quotes: [
    { s: "Dar Noura is a five-room guest house in Sidi Bou Said, open all year.", ok: true, why: "Subject named, category, place, a fact." },
    { s: "It is only ten minutes away.", ok: false, why: 'What is "it", and ten minutes from what?' },
    { s: "Dar Noura is a 10-minute walk from the Sidi Bou Said TGM station.", ok: true, why: "Stands alone, with a measurable distance." },
    { s: "We offer an unforgettable experience you will love.", ok: false, why: "No subject, no fact: pure marketing." },
    { s: "Breakfast at Dar Noura is served on the roof terrace from 8 to 10:30.", ok: true, why: "Named subject, place, hours." },
    { s: "Our rooms are amazing and cozy.", ok: false, why: "Opinion without a checkable fact." },
    { s: "Each of Dar Noura's five rooms has air conditioning and a private bathroom.", ok: true, why: "Concrete, checkable facts." },
    { s: "As mentioned above, this is the best choice.", ok: false, why: "Depends on context and makes an unproven claim." },
    { s: "Check-in at Dar Noura starts at 14:00 and check-out is until 11:00.", ok: true, why: "Precise and self-contained." },
    { s: "Click here to find out more!", ok: false, why: "Navigation text, no information." }
  ],
  schema: [
    "The quotes around a key are missing: JSON requires every key in double quotes.",
    'The @type must be a schema.org type. "Business" is not one; use LocalBusiness or a more specific type.',
    'openingHours must be text such as "Mo-Sa 09:00-18:00", not a sentence.',
    "sameAs must list full URLs of your profiles, not just usernames.",
    "There is a comma after the last item. JSON does not allow trailing commas.",
    'priceRange is text; a currency symbol range like "\u20AC\u20AC" or "\u20AC50-\u20AC120" is expected, not a number.'
  ],
  levels: ["Curious", "Apprentice", "Practitioner", "Specialist", "Strategist", "Expert", "Master"]
};

// packages/academy/fr.json
var fr_default3 = {
  tracks: [
    {
      id: "how",
      icon: "brain",
      t: "Comment marche la recherche IA",
      d: "D'o\xF9 viennent les r\xE9ponses, et pourquoi les passages gagnent.",
      lessons: [
        {
          id: "how-1",
          t: "Deux fa\xE7ons dont une IA vous conna\xEEt",
          cards: [
            "Un assistant r\xE9pond \xE0 partir de deux sources : ce qu'il a appris \xE0 l'entra\xEEnement (sa m\xE9moire) et une recherche web en direct qu'il lance pour la question.",
            "La recherche en direct passe par des index et des robots : l'index de Google pour AI Overviews et AI Mode, celui de Bing pour Copilot, et les robots des assistants comme OAI-SearchBot ou PerplexityBot.",
            "Il y a donc deux chantiers : \xEAtre lisible et index\xE9 aujourd'hui (technique), et \xEAtre assez cit\xE9 sur le web pour entrer dans la m\xE9moire (r\xE9putation)."
          ],
          quiz: { q: "Microsoft Copilot trouve surtout les pages web gr\xE2ce \xE0\u2026", o: ["l'index de Bing", "l'index de Google", "ses seules donn\xE9es d'entra\xEEnement"], a: 0, why: "Microsoft indique que ses consignes couvrent la fa\xE7on dont Bing explore et affiche le contenu dans Bing, Copilot et les r\xE9ponses ancr\xE9es." },
          src: { t: "Blog Bing Webmaster : AI Performance dans Bing Webmaster Tools", u: "https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview" },
          try: "mission"
        },
        {
          id: "how-2",
          t: "Query fan-out : une question, plusieurs recherches",
          cards: [
            "Google indique qu'AI Overviews et AI Mode peuvent utiliser le \xAB query fan-out \xBB : plusieurs recherches li\xE9es sur des sous-th\xE8mes, puis une seule r\xE9ponse.",
            "Votre page peut \xEAtre retenue pour une sous-question (prix, distance, comparaison) m\xEAme sans \xEAtre class\xE9e sur la question principale.",
            "R\xE9pondez aux vraies sous-questions de vos clients, chacune dans un passage clair. Google d\xE9conseille aussi de cr\xE9er une page par variante possible."
          ],
          quiz: { q: "Que change le query fan-out pour le site d'une petite entreprise ?", o: ["R\xE9pondre clairement aux sous-questions pr\xE9cises", "\xC9crire une page par variante de mot-cl\xE9", "R\xE9p\xE9ter davantage le mot-cl\xE9 principal"], a: 0, why: "Le fan-out r\xE9cup\xE8re des passages pour des sous-questions. Les r\xE9ponses claires les gagnent ; les pages minces et la r\xE9p\xE9tition, non." },
          src: { t: "Google Search Central : Fonctionnalit\xE9s d'IA et votre site", u: "https://developers.google.com/search/docs/appearance/ai-features" },
          try: "mission"
        },
        {
          id: "how-3",
          t: "Des passages, pas des pages",
          cards: [
            "Les r\xE9ponses IA citent des passages courts. Une phrase compr\xE9hensible seule, avec le sujet nomm\xE9 et un fait concret, se reprend facilement.",
            "Dans l'\xE9tude GEO (KDD 2024), ajouter des sources, des citations et des statistiques a am\xE9lior\xE9 la visibilit\xE9 dans les r\xE9ponses g\xE9n\xE9ratives jusqu'\xE0 environ 40 %. Le bourrage de mots-cl\xE9s n'a pas aid\xE9.",
            "\xC9crivez pour la citation : la r\xE9ponse d'abord, un fait par phrase, la source \xE0 c\xF4t\xE9 du chiffre."
          ],
          quiz: { q: "Quel changement a le plus aid\xE9 dans l'\xE9tude GEO ?", o: ["Ajouter statistiques, citations et sources", "Ajouter plus de mots-cl\xE9s", "Allonger les pages"], a: 0, why: "Les preuves (statistiques, citations, sources) ont apport\xE9 les plus gros gains ; le bourrage de mots-cl\xE9s, non." },
          src: { t: "GEO : Generative Engine Optimization (Aggarwal et al., KDD 2024)", u: "https://arxiv.org/abs/2311.09735" },
          try: "heat"
        }
      ]
    },
    {
      id: "access",
      icon: "shield-check",
      t: "Laisser entrer les bons robots",
      d: "Robots de recherche, robots d'entra\xEEnement, et les pi\xE8ges entre les deux.",
      lessons: [
        {
          id: "access-1",
          t: "Robots de recherche et d'entra\xEEnement",
          cards: [
            "Beaucoup d'entreprises d'IA utilisent deux sortes de robots. Ceux de recherche lisent les pages pour r\xE9pondre maintenant. Ceux d'entra\xEEnement collectent du texte pour de futurs mod\xE8les.",
            "OpenAI est l'exemple le plus clair : OAI-SearchBot sert \xE0 la recherche ChatGPT, GPTBot \xE0 l'entra\xEEnement. Bloquer GPTBot ne vous retire pas de la recherche ChatGPT.",
            "Un choix courant : autoriser les robots de recherche et d\xE9cider \xE0 part pour l'entra\xEEnement. C'est votre choix, pas une astuce de classement."
          ],
          quiz: { q: "Vous bloquez GPTBot dans robots.txt. Que se passe-t-il ?", o: ["Vous refusez l'entra\xEEnement d'OpenAI ; la recherche ChatGPT peut encore vous montrer", "Vous disparaissez de ChatGPT", "Rien du tout"], a: 0, why: "OpenAI documente GPTBot comme robot d'entra\xEEnement ; OAI-SearchBot g\xE8re la recherche." },
          src: { t: "OpenAI : les robots d'OpenAI", u: "https://platform.openai.com/docs/bots" },
          try: "bots"
        },
        {
          id: "access-2",
          t: "Googlebot et Google-Extended",
          cards: [
            "Les fonctionnalit\xE9s d'IA de Google Search (AI Overviews, AI Mode) utilisent l'exploration normale de Googlebot. Bloquer Googlebot vous retire de Google Search.",
            "Google-Extended est un jeton \xE0 part : il contr\xF4le l'usage de votre contenu pour les mod\xE8les Gemini. Google pr\xE9cise qu'il n'affecte pas votre pr\xE9sence dans Google Search.",
            "Pour limiter ce qui est montr\xE9 d'une page, Google renvoie aux contr\xF4les d'extrait comme nosnippet et max-snippet, pas au blocage."
          ],
          quiz: { q: "Bloquer Google-Extended vous retire-t-il d'AI Mode ?", o: ["Non, cela n'affecte pas Google Search", "Oui, seulement d'AI Mode", "Oui, de tout Google"], a: 0, why: "Google documente que Google-Extended n'a pas d'effet sur la pr\xE9sence d'un site dans Google Search." },
          src: { t: "Google : robots d'exploration courants (Google-Extended)", u: "https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers" },
          try: "bots"
        },
        {
          id: "access-3",
          t: "Les pi\xE8ges du pare-feu et du CDN",
          cards: [
            "robots.txt n'est pas la seule porte. Un pare-feu ou un r\xE9glage de CDN peut bloquer des robots que robots.txt autorise. Google demande d'autoriser l'exploration dans robots.txt et dans tout CDN ou h\xE9bergement.",
            "Cloudflare (septembre 2026) : ses options \xAB Block \xBB et \xAB Block on pages with ads \xBB pour l'entra\xEEnement IA arr\xEAtent aussi Googlebot, Bingbot et Applebot, car ce sont des robots \xE0 usage mixte.",
            "Pour seulement refuser l'entra\xEEnement, Cloudflare renvoie plut\xF4t \xE0 son r\xE9glage \xAB Disallow AI Training \xBB."
          ],
          quiz: { q: "Sur Cloudflare, quel r\xE9glage refuse l'entra\xEEnement IA sans bloquer Googlebot ?", o: ["Disallow AI Training", "Block on pages with ads", "Block"], a: 0, why: "Cloudflare indique que Block et Block on pages with ads arr\xEAtent aussi les robots \xE0 usage mixte comme Googlebot." },
          src: { t: "Blog Cloudflare : robots IA \xE0 usage mixte", u: "https://blog.cloudflare.com/accountable-mixed-use-ai-crawlers/" },
          try: "audit"
        }
      ]
    },
    {
      id: "entity",
      icon: "building-2",
      t: "\xCAtre une entit\xE9 claire",
      d: "Noms, faits et balisage fiables pour les machines.",
      lessons: [
        {
          id: "entity-1",
          t: "M\xEAme nom, m\xEAmes faits, partout",
          cards: [
            "Les machines rattachent les faits \xE0 une entit\xE9 : une entreprise avec un nom, un type, un lieu. Si nom, adresse ou t\xE9l\xE9phone diff\xE8rent entre votre site et vos profils, elles doutent que ce soit vous.",
            "Utilisez une seule forme du nom. R\xE9p\xE9tez les faits cl\xE9s en texte sur votre site et dans votre fiche Google Business Profile, Bing Places et les principaux annuaires.",
            "Ajoutez un balisage Organization ou LocalBusiness avec des liens sameAs vers vos profils officiels."
          ],
          quiz: { q: "\xC0 quoi sert sameAs ?", o: ["Relier vos profils officiels \xE0 l'entit\xE9 de votre site", "Copier le contenu d'une autre page", "Dire \xE0 Google quelle page classer en premier"], a: 0, why: "sameAs liste les URL qui identifient la m\xEAme entit\xE9, comme les profils sociaux et annuaires officiels." },
          src: { t: "Google : donn\xE9es structur\xE9es Organization", u: "https://developers.google.com/search/docs/appearance/structured-data/organization" },
          try: "machine"
        },
        {
          id: "entity-2",
          t: "Un balisage fid\xE8le \xE0 la page",
          cards: [
            "Les donn\xE9es structur\xE9es doivent d\xE9crire ce que le visiteur voit. Baliser un contenu absent de la page enfreint les consignes de Google.",
            "Google a limit\xE9 en ao\xFBt 2023 les r\xE9sultats enrichis FAQ aux sites gouvernementaux et de sant\xE9 reconnus. Les questions-r\xE9ponses restent utiles aux personnes et aux r\xE9ponses IA ; seul l'affichage sp\xE9cial a chang\xE9.",
            "Google pr\xE9cise aussi qu'aucune exigence suppl\xE9mentaire ni sch\xE9ma sp\xE9cial n'est n\xE9cessaire pour ses fonctionnalit\xE9s d'IA."
          ],
          quiz: { q: "Depuis ao\xFBt 2023, les r\xE9sultats enrichis FAQ s'affichent pour\u2026", o: ["surtout des sites gouvernementaux et de sant\xE9 reconnus", "tout site avec un balisage FAQPage", "aucun site"], a: 0, why: "Google a annonc\xE9 que ces r\xE9sultats ne s'afficheraient que pour des sites gouvernementaux et de sant\xE9 reconnus et faisant autorit\xE9." },
          src: { t: "Blog Google Search Central : changements HowTo et FAQ", u: "https://developers.google.com/search/blog/2023/08/howto-faq-changes" },
          try: "machine"
        },
        {
          id: "entity-3",
          t: "Les faits dont un assistant a besoin",
          cards: [
            "Avant de vous recommander, un assistant cherche : qu'est-ce que c'est, o\xF9, quand est-ce ouvert, combien \xE7a co\xFBte, comment r\xE9server ou joindre.",
            "Mettez chaque fait en texte sur la page (pas seulement dans une image ou un widget) et dans votre balisage : adresse, horaires, t\xE9l\xE9phone, gamme de prix ou offres.",
            "Les faits manquants sont combl\xE9s par d'autres sites, ou l'assistant cite quelqu'un dont les faits sont clairs."
          ],
          quiz: { q: "O\xF9 doivent figurer les horaires d'ouverture ?", o: ["Dans le texte de la page et dans les donn\xE9es structur\xE9es", "Uniquement sur une photo de l'enseigne", "Uniquement sur les r\xE9seaux sociaux"], a: 0, why: "Le texte et le balisage sont lus de fa\xE7on fiable par les robots ; les images et widgets, souvent non." },
          src: { t: "Google : donn\xE9es structur\xE9es LocalBusiness", u: "https://developers.google.com/search/docs/appearance/structured-data/local-business" },
          try: "drive"
        }
      ]
    },
    {
      id: "cite",
      icon: "quote",
      t: "\xC9crire ce que l'IA cite",
      d: "La r\xE9ponse d'abord, des phrases citables, de vraies preuves.",
      lessons: [
        {
          id: "cite-1",
          t: "La r\xE9ponse d'abord",
          cards: [
            "Commencez par la r\xE9ponse : ce que c'est, pour qui, o\xF9, et le fait le plus utile. Une ou deux phrases.",
            "\xAB Dar Noura est une maison d'h\xF4tes de cinq chambres \xE0 Sidi Bou Sa\xEFd, \xE0 300 m du sentier de la falaise, ouverte toute l'ann\xE9e. \xBB vaut mieux que \xAB Bienvenue dans notre petit coin de paradis. \xBB",
            "L'ouverture est le passage le plus souvent repris dans une r\xE9ponse. Faites qu'il en vaille la peine."
          ],
          quiz: { q: "Quelle ouverture est la plus citable ?", o: ["\xAB Dar Noura est une maison d'h\xF4tes de cinq chambres \xE0 Sidi Bou Sa\xEFd, ouverte toute l'ann\xE9e. \xBB", "\xAB Bienvenue ! Nous sommes ravis de vous accueillir. \xBB", "\xAB D\xE9couvrez une exp\xE9rience inoubliable. \xBB"], a: 0, why: "Elle nomme le sujet, la cat\xE9gorie, le lieu et un fait." },
          src: { t: "Google : cr\xE9er du contenu utile et fiable", u: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content" },
          try: "audit"
        },
        {
          id: "cite-2",
          t: "Des phrases autonomes",
          cards: [
            "Une IA sort une phrase de son paragraphe. \xAB C'est \xE0 seulement 10 minutes \xBB ne veut rien dire seul. \xAB Dar Noura est \xE0 10 minutes \xE0 pied de la gare TGM \xBB si.",
            "Nommez le sujet au lieu de \xAB il \xBB, \xAB nous \xBB ou \xAB cela \xBB. Un fait concret par phrase, 8 \xE0 30 mots.",
            "Le surligneur de Sada montre quelles phrases d'une page passent d\xE9j\xE0 ce test."
          ],
          quiz: { q: "Pourquoi \xAB C'est \xE0 seulement 10 minutes \xBB \xE9choue-t-il ?", o: ["Le sujet et le lieu manquent", "C'est trop court pour Google", "Les chiffres sont interdits"], a: 0, why: "Hors contexte, personne ne sait ce qu'est \xAB c' \xBB ni de quoi c'est proche." },
          src: { t: "GEO : Generative Engine Optimization (KDD 2024)", u: "https://arxiv.org/abs/2311.09735" },
          try: "quote"
        },
        {
          id: "cite-3",
          t: "Preuves et exp\xE9rience directe",
          cards: [
            "Chiffres, sources nomm\xE9es et courtes citations rendent un passage plus fiable et plus facile \xE0 citer.",
            "Le guide de Google sur ses fonctionnalit\xE9s d'IA g\xE9n\xE9rative demande un contenu non banal : ce que vous seul pouvez dire, par exp\xE9rience directe, plut\xF4t que ce que tous les sites r\xE9p\xE8tent.",
            "Datez vos mises \xE0 jour (une date visible et dateModified) pour que la fra\xEEcheur soit claire."
          ],
          quiz: { q: "Qu'est-ce qu'un contenu \xAB non banal \xBB ?", o: ["Un contenu que vous seul pouvez \xE9crire, \xE0 partir de votre exp\xE9rience ou de vos donn\xE9es", "Un contenu copi\xE9 des premiers r\xE9sultats", "Un contenu tr\xE8s court"], a: 0, why: "Le contenu banal r\xE9p\xE8te ce qu'on trouve partout ; les faits et donn\xE9es de premi\xE8re main rendent une source digne d'\xEAtre cit\xE9e." },
          src: { t: "Google : optimiser pour les fonctionnalit\xE9s d'IA g\xE9n\xE9rative", u: "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide" },
          try: "rewrite"
        }
      ]
    },
    {
      id: "offsite",
      icon: "newspaper",
      t: "Faire parler de vous",
      d: "Comment les agences obtiennent des mentions que l'IA reprend.",
      lessons: [
        {
          id: "offsite-1",
          t: "Les mentions comptent plus que les liens",
          cards: [
            "Ahrefs a \xE9tudi\xE9 75 000 marques : les mentions de marque sur le web ont la plus forte corr\xE9lation avec la visibilit\xE9 dans AI Overviews (0,664). Les backlinks sont bien plus faibles (0,218).",
            "Les marques du quart sup\xE9rieur en mentions ont environ 10 fois plus de mentions dans AI Overviews que le quart suivant.",
            "Corr\xE9lation n'est pas causalit\xE9. Mais la direction est claire : \xEAtre discut\xE9 sur le web fait partie du travail."
          ],
          quiz: { q: "Dans l'\xE9tude Ahrefs, qu'est-ce qui \xE9tait le plus corr\xE9l\xE9 \xE0 la visibilit\xE9 dans AI Overviews ?", o: ["Les mentions de marque sur le web", "Le nombre de backlinks", "Les d\xE9penses publicitaires"], a: 0, why: "0,664 pour les mentions de marque contre 0,218 pour les backlinks et environ 0,215 pour le co\xFBt publicitaire." },
          src: { t: "Ahrefs : facteurs de visibilit\xE9 des marques dans AI Overviews (75 000 marques)", u: "https://ahrefs.com/blog/ai-overview-brand-correlation/" },
          try: "ask"
        },
        {
          id: "offsite-2",
          t: "Votre liste RP est dans les r\xE9ponses",
          cards: [
            "Posez aux assistants les questions de vos clients et regardez ce qu'ils citent : guides de voyage, classements, annuaires, presse locale, forums.",
            "Ces sites sont vos cibles de RP digitales. Obtenez-y une place avec quelque chose qui m\xE9rite d'\xEAtre cit\xE9 : des donn\xE9es, une histoire, un avis d'expert, un \xE9v\xE9nement.",
            "N'achetez jamais d'avis. La r\xE8gle de la FTC am\xE9ricaine (2024) interdit les faux avis, y compris \xE9crits par IA, et l'achat d'avis positifs ou n\xE9gatifs."
          ],
          quiz: { q: "Qu'est-ce qui est permis par la r\xE8gle de la FTC sur les avis ?", o: ["Demander \xE0 de vrais clients un avis honn\xEAte", "Payer pour des avis 5 \xE9toiles", "Publier des avis \xE9crits par IA au nom de clients invent\xE9s"], a: 0, why: "La r\xE8gle vise les faux avis, les avis achet\xE9s et les avis internes non d\xE9clar\xE9s, pas les demandes honn\xEAtes \xE0 de vrais clients." },
          src: { t: "FTC : r\xE8gle finale interdisant les faux avis et t\xE9moignages", u: "https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials" },
          try: "ask"
        },
        {
          id: "offsite-3",
          t: "Wikip\xE9dia, Wikidata et forums : les r\xE8gles",
          cards: [
            "R\xE8gle de Wikip\xE9dia sur les conflits d'int\xE9r\xEAts : si vous \xEAtes li\xE9 \xE0 une entreprise, d\xE9clarez-le, ne modifiez pas son article directement et proposez vos changements sur la page de discussion.",
            "Les contributeurs r\xE9mun\xE9r\xE9s doivent d\xE9clarer qui les paie, et un accord de confidentialit\xE9 n'y change rien. Les \xE9l\xE9ments Wikidata exigent des r\xE9f\xE9rences s\xE9rieuses et publiques.",
            "Sur Reddit et les forums, participez en vrai membre, dites qui vous \xEAtes quand vous parlez de votre entreprise et suivez les r\xE8gles de chaque communaut\xE9."
          ],
          quiz: { q: "Vous dirigez une entreprise. Comment am\xE9liorer son article Wikip\xE9dia ?", o: ["D\xE9clarer votre lien et proposer des changements en page de discussion", "Le modifier vous-m\xEAme sans dire qui vous \xEAtes", "Payer quelqu'un pour le modifier en secret"], a: 0, why: "La r\xE8gle recommande la d\xE9claration et les demandes en page de discussion ; la contribution r\xE9mun\xE9r\xE9e non d\xE9clar\xE9e viole les conditions d'utilisation." },
          src: { t: "Wikip\xE9dia : conflit d'int\xE9r\xEAts (en anglais)", u: "https://en.wikipedia.org/wiki/Wikipedia:Conflict_of_interest" },
          try: "ask"
        }
      ]
    },
    {
      id: "measure",
      icon: "chart-column",
      t: "Mesurer",
      d: "Voir le trafic et la visibilit\xE9 IA gratuitement.",
      lessons: [
        {
          id: "measure-1",
          t: "Les visiteurs IA dans Google Analytics",
          cards: [
            "Cr\xE9ez dans GA4 un groupe de canaux personnalis\xE9 avec un canal \xAB Assistants IA \xBB : la source de session correspond \xE0 une liste de domaines IA (chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com, claude.ai\u2026). Placez-le au-dessus de Referral.",
            "ChatGPT ajoute souvent utm_source=chatgpt.com aux liens. Mais certains clics IA arrivent sans aucun r\xE9f\xE9rent et sont compt\xE9s en Direct.",
            "Le trafic IA dans vos statistiques est donc un minimum, pas le total. Le pack de corrections contient une regex pr\xEAte."
          ],
          quiz: { q: "Pourquoi placer le canal IA au-dessus de Referral ?", o: ["Les canaux sont \xE9valu\xE9s dans l'ordre ; la premi\xE8re r\xE8gle qui correspond gagne", "Google exige l'ordre alphab\xE9tique", "Cela augmente le trafic"], a: 0, why: "Les groupes de canaux \xE9valuent les canaux dans l'ordre : le canal le plus pr\xE9cis doit venir en premier." },
          src: { t: "Aide Google Analytics : groupes de canaux personnalis\xE9s", u: "https://support.google.com/analytics/answer/13051316" },
          try: "pack"
        },
        {
          id: "measure-2",
          t: "Rapports Search Console et Bing",
          cards: [
            "Google Search Console propose depuis le 3 juin 2026 des rapports de performances IA g\xE9n\xE9rative : impressions dans AI Overviews et AI Mode, par page, pays, appareil et date.",
            "Bing Webmaster Tools propose AI Performance (aper\xE7u public depuis f\xE9vrier 2026) : combien de fois votre contenu est cit\xE9 dans Copilot et les r\xE9sum\xE9s IA de Bing.",
            "Les deux sont gratuits. Consultez-les chaque mois, \xE0 c\xF4t\xE9 de vos propres tests de r\xE9ponses."
          ],
          quiz: { q: "Que montre le rapport IA g\xE9n\xE9rative de Search Console ?", o: ["Les impressions dans AI Overviews et AI Mode", "Chaque requ\xEAte tap\xE9e par les utilisateurs", "Votre classement dans ChatGPT"], a: 0, why: "Le rapport montre les impressions par page, pays, appareil et date ; les requ\xEAtes ne sont pas affich\xE9es." },
          src: { t: "Blog Google Search Central : rapports de performances IA g\xE9n\xE9rative", u: "https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports" },
          try: "pack"
        },
        {
          id: "measure-3",
          t: "Tester les r\xE9ponses comme un chercheur",
          cards: [
            "Les r\xE9ponses IA changent d'une fois \xE0 l'autre. SparkToro et Gumshoe ont trouv\xE9 moins d'une chance sur 100 que ChatGPT ou l'IA de Google donne deux fois la m\xEAme liste de marques pour la m\xEAme question.",
            "Une capture d'\xE9cran prouve donc peu. Posez les m\xEAmes questions plusieurs fois, dans plusieurs assistants, et suivez la part de r\xE9ponses qui vous citent.",
            "La position dans une liste est surtout du bruit ; \xEAtre souvent pr\xE9sent est le vrai signal."
          ],
          quiz: { q: "Quelle est la meilleure mesure de visibilit\xE9 IA ?", o: ["La fr\xE9quence \xE0 laquelle vous \xEAtes cit\xE9 sur de nombreux essais", "Votre position dans une r\xE9ponse", "Une capture par mois"], a: 0, why: "Les listes changent presque \xE0 chaque fois ; la fr\xE9quence de pr\xE9sence est plus stable que le rang." },
          src: { t: "SparkToro : les IA sont tr\xE8s incoh\xE9rentes dans leurs recommandations", u: "https://sparktoro.com/blog/new-research-ais-are-highly-inconsistent-when-recommending-brands-or-products-marketers-should-take-care-when-tracking-ai-visibility/" },
          try: "ask"
        }
      ]
    },
    {
      id: "agentic",
      icon: "bot",
      t: "Pr\xEAt pour les agents IA",
      d: "Quand les assistants r\xE9servent et ach\xE8tent pour les gens.",
      lessons: [
        {
          id: "agentic-1",
          t: "Des agents qui ach\xE8tent",
          cards: [
            "Les assistants commencent \xE0 accomplir des t\xE2ches, pas seulement \xE0 r\xE9pondre. OpenAI a lanc\xE9 Instant Checkout dans ChatGPT avec l'Agentic Commerce Protocol (avec Stripe) en septembre 2025.",
            "Google a annonc\xE9 l'Universal Commerce Protocol (UCP) en janvier 2026 avec Shopify, Etsy, Wayfair, Target et Walmart ; les marchands publient leurs capacit\xE9s \xE0 /.well-known/ucp.",
            "Des standards de paiement comme AP2 de Google sont en dessous. Boutiques : v\xE9rifiez ce que votre plateforme prend d\xE9j\xE0 en charge."
          ],
          quiz: { q: "O\xF9 un marchand publie-t-il ses capacit\xE9s UCP ?", o: ["/.well-known/ucp", "/robots.txt", "/sitemap.xml"], a: 0, why: "UCP utilise une adresse \xAB well-known \xBB sur le domaine du marchand." },
          src: { t: "Universal Commerce Protocol", u: "https://ucp.dev" },
          try: "drive"
        },
        {
          id: "agentic-2",
          t: "WebMCP : des formulaires devenus outils",
          cards: [
            "WebMCP est un standard web propos\xE9 par Chrome : une page peut offrir des outils aux agents IA du navigateur, au lieu qu'ils devinent sur quel bouton cliquer.",
            "La m\xE9thode d\xE9clarative ne demande pas de JavaScript : ajoutez toolname et tooldescription au formulaire, et toolparamdescription \xE0 ses champs. Le navigateur construit l'outil.",
            "C'est r\xE9cent (origin trial depuis Chrome 149). De bons formulaires aident d\xE9j\xE0 aujourd'hui."
          ],
          quiz: { q: "Quel attribut transforme un formulaire en outil WebMCP ?", o: ["toolname", "data-ai", "aria-agent"], a: 0, why: "L'API d\xE9clarative de Chrome utilise toolname et tooldescription sur le formulaire." },
          src: { t: "Chrome for Developers : API d\xE9clarative WebMCP", u: "https://developer.chrome.com/docs/ai/webmcp/declarative-api" },
          try: "drive"
        },
        {
          id: "agentic-3",
          t: "Utilisable par un agent d\xE8s aujourd'hui",
          cards: [
            "Les agents lisent les pages comme les technologies d'assistance. Les champs ont besoin de vraies \xE9tiquettes, les boutons d'un nom, et l'action principale doit \xEAtre un vrai lien ou bouton.",
            "Prix, horaires et coordonn\xE9es doivent \xEAtre en texte et en balisage, pas en images.",
            "Le test agent de Sada v\xE9rifie tout cela sur n'importe quelle page en une seconde."
          ],
          quiz: { q: "Un bouton n'affiche qu'une ic\xF4ne sans libell\xE9. Pour un agent, il est\u2026", o: ["difficile \xE0 identifier", "parfait, les agents lisent les ic\xF4nes", "plus rapide \xE0 utiliser"], a: 0, why: "Sans nom texte ni aria-label, un agent ne peut pas savoir ce que fait le bouton." },
          src: { t: "W3C WAI : \xE9tiqueter les contr\xF4les", u: "https://www.w3.org/WAI/tutorials/forms/labels/" },
          try: "drive"
        }
      ]
    },
    {
      id: "local",
      icon: "globe",
      t: "Local et multilingue",
      d: "Fiches cartes, langues, arabe et RTL.",
      lessons: [
        {
          id: "local-1",
          t: "Les fiches que lisent les assistants",
          cards: [
            "Pour les questions locales, les assistants s'appuient sur les cartes et les donn\xE9es d'entreprise : Google Business Profile, Bing Places for Business, Apple Business Connect (Plans et Siri).",
            "Revendiquez les trois. M\xEAme nom, adresse, t\xE9l\xE9phone, horaires et cat\xE9gories que sur votre site.",
            "Ajoutez des photos, de vraies descriptions et r\xE9pondez aux avis : ce sont des faits publics sur vous."
          ],
          quiz: { q: "Quelle fiche alimente Plans et Siri d'Apple ?", o: ["Apple Business Connect", "Bing Places", "Une page LinkedIn"], a: 0, why: "Apple Business Connect permet de g\xE9rer votre pr\xE9sence dans Plans, Siri et les autres apps Apple." },
          src: { t: "Apple Business Connect", u: "https://businessconnect.apple.com/" },
          try: "drive"
        },
        {
          id: "local-2",
          t: "Des versions linguistiques bien faites",
          cards: [
            "Chaque version linguistique a sa propre URL, un attribut lang et des liens hreflang vers toutes les versions, y compris elle-m\xEAme, plus x-default.",
            "Traduisez aussi le titre, la description et les donn\xE9es structur\xE9es, pas seulement le texte visible.",
            "De mauvais signaux de langue envoient les gens, et les r\xE9ponses IA, vers la mauvaise version."
          ],
          quiz: { q: "Le hreflang d'une page doit-il inclure la page elle-m\xEAme ?", o: ["Oui, chaque version liste toutes les versions, elle comprise", "Non, seulement les autres langues", "Seul x-default suffit"], a: 0, why: "Google demande que chaque version se liste elle-m\xEAme et toutes les autres." },
          src: { t: "Google : versions localis\xE9es de votre page", u: "https://developers.google.com/search/docs/specialty/international/localized-versions" },
          try: "audit"
        },
        {
          id: "local-3",
          t: "Arabe et droite-\xE0-gauche",
          cards: [
            `Les pages en arabe ont besoin de lang="ar" et dir="rtl" sur l'\xE9l\xE9ment html, pour que navigateurs, lecteurs d'\xE9cran et machines les lisent dans le bon sens.`,
            "\xC9crivez le contenu arabe pour des lecteurs arabophones (les termes qu'ils cherchent), pas seulement une traduction automatique de la page fran\xE7aise ou anglaise.",
            "Gardez chiffres, prix et noms identiques d'une langue \xE0 l'autre pour que les faits concordent partout."
          ],
          quiz: { q: 'O\xF9 placer dir="rtl" sur une page en arabe ?', o: ["Sur l'\xE9l\xE9ment html", "Seulement sur les images", "Dans robots.txt"], a: 0, why: "Le W3C recommande de fixer la direction de base sur l'\xE9l\xE9ment html." },
          src: { t: "W3C : balisage structurel et texte de droite \xE0 gauche en HTML", u: "https://www.w3.org/International/questions/qa-html-dir" },
          try: "audit"
        }
      ]
    }
  ],
  facts: [
    { s: "Bloquer GPTBot retire votre site de la recherche ChatGPT.", f: false, why: "GPTBot est le robot d'entra\xEEnement d'OpenAI ; la recherche ChatGPT utilise OAI-SearchBot." },
    { s: "AI Overviews et AI Mode de Google peuvent lancer plusieurs recherches li\xE9es pour une seule question.", f: true, why: "Google appelle cela le query fan-out." },
    { s: "Il faut un fichier llms.txt pour appara\xEEtre dans les fonctionnalit\xE9s d'IA de Google.", f: false, why: "Google indique qu'aucun fichier ni balisage sp\xE9cial n'est requis." },
    { s: "Bloquer Google-Extended vous retire de Google Search.", f: false, why: "Google pr\xE9cise que Google-Extended n'affecte pas la pr\xE9sence dans Google Search." },
    { s: "Dans une \xE9tude de 75 000 marques, les mentions web \xE9taient plus corr\xE9l\xE9es \xE0 la visibilit\xE9 dans AI Overviews que les backlinks.", f: true, why: "Ahrefs : 0,664 pour les mentions contre 0,218 pour les backlinks." },
    { s: "Poser deux fois la m\xEAme question \xE0 une IA donne en g\xE9n\xE9ral la m\xEAme liste de marques.", f: false, why: "SparkToro et Gumshoe : moins d'une chance sur 100." },
    { s: "Search Console montre les impressions dans AI Overviews et AI Mode.", f: true, why: "Rapports de performances IA g\xE9n\xE9rative, depuis juin 2026." },
    { s: "Sur Cloudflare, \xAB Block on pages with ads \xBB pour l'entra\xEEnement IA peut aussi arr\xEAter Googlebot.", f: true, why: "Cloudflare, septembre 2026 : les robots \xE0 usage mixte sont concern\xE9s." },
    { s: "Les r\xE9sultats enrichis FAQ s'affichent encore pour tout site avec FAQPage.", f: false, why: "Depuis ao\xFBt 2023, surtout pour des sites gouvernementaux et de sant\xE9 reconnus." },
    { s: "Dans l'\xE9tude GEO, ajouter des statistiques et des sources a rendu les pages plus visibles.", f: true, why: "Jusqu'\xE0 environ 40 % dans l'article KDD 2024." },
    { s: "Acheter des avis positifs est permis s'ils sont \xE9crits par de vraies personnes.", f: false, why: "La r\xE8gle de la FTC interdit l'achat d'avis positifs ou n\xE9gatifs." },
    { s: "Une entreprise devrait modifier elle-m\xEAme son article Wikip\xE9dia pour qu'il reste exact.", f: false, why: "Wikip\xE9dia demande de d\xE9clarer son lien et de proposer les changements en page de discussion." }
  ],
  quotes: [
    { s: "Dar Noura est une maison d'h\xF4tes de cinq chambres \xE0 Sidi Bou Sa\xEFd, ouverte toute l'ann\xE9e.", ok: true, why: "Sujet nomm\xE9, cat\xE9gorie, lieu, un fait." },
    { s: "C'est \xE0 seulement dix minutes.", ok: false, why: "Qu'est-ce que \xAB c' \xBB, et dix minutes de quoi ?" },
    { s: "Dar Noura est \xE0 10 minutes \xE0 pied de la gare TGM de Sidi Bou Sa\xEFd.", ok: true, why: "Autonome, avec une distance mesurable." },
    { s: "Nous vous offrons une exp\xE9rience inoubliable que vous adorerez.", ok: false, why: "Pas de sujet, pas de fait : du pur marketing." },
    { s: "Le petit-d\xE9jeuner de Dar Noura est servi sur la terrasse de 8 h \xE0 10 h 30.", ok: true, why: "Sujet nomm\xE9, lieu, horaires." },
    { s: "Nos chambres sont incroyables et cosy.", ok: false, why: "Une opinion sans fait v\xE9rifiable." },
    { s: "Chacune des cinq chambres de Dar Noura a la climatisation et une salle de bains priv\xE9e.", ok: true, why: "Des faits concrets et v\xE9rifiables." },
    { s: "Comme indiqu\xE9 plus haut, c'est le meilleur choix.", ok: false, why: "D\xE9pend du contexte et affirme sans preuve." },
    { s: "L'arriv\xE9e \xE0 Dar Noura commence \xE0 14 h et le d\xE9part se fait jusqu'\xE0 11 h.", ok: true, why: "Pr\xE9cis et autonome." },
    { s: "Cliquez ici pour en savoir plus !", ok: false, why: "Texte de navigation, aucune information." }
  ],
  schema: [
    "Il manque les guillemets autour d'une cl\xE9 : en JSON, chaque cl\xE9 est entre guillemets doubles.",
    "Le @type doit \xEAtre un type schema.org. \xAB Business \xBB n'en est pas un ; utilisez LocalBusiness ou un type plus pr\xE9cis.",
    "openingHours doit \xEAtre un texte comme \xAB Mo-Sa 09:00-18:00 \xBB, pas une phrase.",
    "sameAs doit lister les URL compl\xE8tes de vos profils, pas seulement des noms d'utilisateur.",
    "Il y a une virgule apr\xE8s le dernier \xE9l\xE9ment. Le JSON n'accepte pas les virgules finales.",
    "priceRange est un texte ; on attend une fourchette comme \xAB \u20AC\u20AC \xBB ou \xAB 50 \u20AC-120 \u20AC \xBB, pas un nombre."
  ],
  levels: ["Curieux", "Apprenti", "Praticien", "Sp\xE9cialiste", "Strat\xE8ge", "Expert", "Ma\xEEtre"]
};

// packages/ai/src/index.ts
var LANG_NAME = { en: "English", fr: "French", de: "German", ar: "Arabic", es: "Spanish", ja: "Japanese" };
var MODEL_LANGS = ["en", "fr", "de", "es", "ja"];
var ENGINE_NAME = "Chrome built-in AI (Gemini Nano, on this computer)";
async function modelState(lang) {
  if (typeof LanguageModel === "undefined") return "unavailable";
  try {
    return await LanguageModel.availability({ expectedInputs: [{ type: "text", languages: [lang] }], expectedOutputs: [{ type: "text", languages: [lang] }] });
  } catch {
    return "unavailable";
  }
}
async function translatorState(from, to) {
  if (typeof Translator === "undefined") return "unavailable";
  try {
    return await Translator.availability({ sourceLanguage: from, targetLanguage: to });
  } catch {
    return "unavailable";
  }
}
async function aiStatus(lang) {
  if (MODEL_LANGS.includes(lang)) {
    const s = await modelState(lang);
    return { state: s, route: s === "unavailable" ? "none" : "direct" };
  }
  const [m, a, b] = await Promise.all([modelState("en"), translatorState(lang, "en"), translatorState("en", lang)]);
  if (m === "unavailable" || a === "unavailable" || b === "unavailable") return { state: "unavailable", route: "none" };
  const worst = [m, a, b].includes("downloadable") ? "downloadable" : [m, a, b].includes("downloading") ? "downloading" : "available";
  return { state: worst, route: "translate" };
}
function stall(ms, why, kick) {
  return new Promise((res, rej) => {
    let t2;
    const reset = () => {
      clearTimeout(t2);
      t2 = setTimeout(() => rej(new Error(why)), ms);
    };
    reset();
    kick(reset).then((v) => {
      clearTimeout(t2);
      res(v);
    }, (e2) => {
      clearTimeout(t2);
      rej(e2);
    });
  });
}
async function promptModel(p, lang, onProgress) {
  const session = await stall(6e4, "nomodel", (reset) => LanguageModel.create({
    initialPrompts: [{ role: "system", content: p.system }],
    expectedInputs: [{ type: "text", languages: [lang] }],
    expectedOutputs: [{ type: "text", languages: [lang] }],
    monitor(m) {
      m.addEventListener("downloadprogress", (e2) => {
        reset();
        onProgress?.(e2.loaded);
      });
    }
  }));
  try {
    return String(await stall(12e4, "nomodel", () => session.prompt(p.user)));
  } finally {
    session.destroy?.();
  }
}
async function translate(text, from, to) {
  const tr = await stall(6e4, "nomodel", () => Translator.create({ sourceLanguage: from, targetLanguage: to }));
  try {
    return String(await tr.translate(text));
  } finally {
    tr.destroy?.();
  }
}
async function ask(p, lang, onProgress) {
  const st = await aiStatus(lang);
  if (st.route === "none") throw new Error("nomodel");
  if (st.route === "direct") return { text: await promptModel(p, lang, onProgress), engine: ENGINE_NAME };
  const user = await translate(p.user, lang, "en");
  const out = await promptModel({ system: p.system.replace(/Write in \w+\./, "Write in English."), user }, "en", onProgress);
  return { text: await translate(out, "en", lang), engine: ENGINE_NAME + " + Translator" };
}
function simPrompt(lang, title, url, text) {
  const L = LANG_NAME[lang] || "English";
  return {
    system: `You are an AI search assistant. Answer only from the web page the user gives you. Never invent facts. Write in ${L}.`,
    user: `Web page: ${url}
Title: ${title}

${text}

---
A customer asks you about this business or topic. In 3 to 4 sentences, say what it is, for whom, where, and the key facts (prices, dates, distances) only if the page states them. Then write a new line starting with "MISSING:" and list, separated by " | ", up to 4 things a customer would need to know that this page does not state clearly.`
  };
}
async function simulate(o) {
  const r = await ask(simPrompt(o.lang, o.title, o.url, o.text.split(/\s+/).slice(0, 1400).join(" ")), o.lang, o.onProgress);
  const raw = r.text;
  const i = raw.search(/(MISSING|MANQUE|FEHLT|ناقص|مفقود)\s*:/i);
  const text = (i >= 0 ? raw.slice(0, i) : raw).trim();
  const missing = i >= 0 ? raw.slice(i).replace(/^[^:]*:/, "").split(/\s*\|\s*|\n[-*•]\s*/).map((s) => s.replace(/^[-*•\s]+/, "").trim()).filter(Boolean).slice(0, 4) : [];
  return { text, missing, engine: r.engine };
}
async function rewrite(o) {
  const L = LANG_NAME[o.lang] || "English";
  const task = o.kind === "answer" ? `Rewrite this opening paragraph so it answers first: one or two sentences that say what it is, for whom and where, with the most important fact (a number, place or date) stated plainly. 25 to 60 words.` : `Rewrite these sentences so each one can be quoted on its own by an AI assistant: name the subject instead of "it" or "we", keep one concrete fact per sentence, 8 to 30 words each.`;
  const r = await ask({
    system: `You are an editor for AI search (GEO). Write in ${L}. Use only facts from the text and context. Never invent numbers, names, prices or claims: where a useful fact is missing, write a short placeholder in square brackets, like [price per night]. No marketing superlatives.`,
    user: `${task}
Give exactly 2 alternative versions, each on its own line starting with "1)" and "2)". Nothing else.

Context (page title and summary): ${o.context.slice(0, 600)}

Text:
${o.text.slice(0, 1500)}`
  }, o.lang, o.onProgress);
  const options = r.text.split(/\n+/).map((l) => l.replace(/^\s*(?:\d[).:]|[-*•])\s*/, "").replace(/\*\*/g, "").trim()).filter((l) => l.length > 15).slice(0, 2);
  return { options: options.length ? options : [r.text.trim()], engine: r.engine };
}
async function draftAnswer(o) {
  const L = LANG_NAME[o.lang] || "English";
  const r = await ask({
    system: `You write website copy that AI assistants can quote. Write in ${L}. Use only the facts given. Never invent prices, numbers, names, awards or claims; write a short placeholder in square brackets for anything missing, like [opening hours]. No superlatives.`,
    user: `Business: ${o.name}
Question customers ask: ${o.question}

Facts from the website:
${o.facts.map((f2) => "- " + f2.slice(0, 400)).join("\n") || "- (none)"}

Write the answer for the website: first sentence answers the question directly and names the business; then 2 to 3 short sentences with concrete facts. 40 to 90 words. Plain text.`
  }, o.lang);
  return r.text.trim();
}
async function moreQuestions(p, lang) {
  const r = await ask(p, lang);
  return r.text.split(/\n+/).map((s) => s.trim()).filter(Boolean).slice(0, 8);
}
async function prepareModel(lang, onProgress) {
  try {
    const st = await aiStatus(lang);
    if (st.route === "none" || st.state === "unavailable") return "unavailable";
    if (st.state === "available") return "available";
    const modelLang = st.route === "translate" ? "en" : lang;
    const session = await LanguageModel.create({
      expectedInputs: [{ type: "text", languages: [modelLang] }],
      expectedOutputs: [{ type: "text", languages: [modelLang] }],
      monitor(m) {
        m.addEventListener("downloadprogress", (e2) => onProgress?.(e2.loaded));
      }
    });
    session.destroy?.();
    if (st.route === "translate") {
      for (const [a, b] of [[lang, "en"], ["en", lang]]) {
        const t2 = await Translator.create({ sourceLanguage: a, targetLanguage: b });
        t2.destroy?.();
      }
    }
    onProgress?.(1);
    return "available";
  } catch {
    return "unavailable";
  }
}

// packages/lessons/en.json
var en_default4 = {
  "l-index": {
    t: "Indexing comes first",
    b: "Google's AI Overviews and AI Mode only use pages that are indexed and allowed to show a snippet. Google says there are no special requirements beyond that. So a single 'noindex' or 'nosnippet' quietly removes a page from AI answers, however good it is. Check pages you care about after every website change.",
    q: "A page has 'nosnippet'. What happens in Google's AI features?",
    o: [
      "Nothing changes",
      "It cannot be used in AI Overviews or AI Mode",
      "It ranks higher"
    ],
    a: 1,
    x: "Google's AI features only use pages that may show a snippet."
  },
  "l-bots": {
    t: "Search bots vs training bots",
    b: "AI companies run two kinds of bots. Search bots (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot) fetch pages to answer a person right now. Training bots (GPTBot, ClaudeBot, Google-Extended, CCBot) collect data to train models. You can block training and still be cited. Blocking search bots removes you from their answers.",
    q: "You want ChatGPT to cite you but not train on your pages. What do you block?",
    o: [
      "OAI-SearchBot",
      "GPTBot",
      "Both"
    ],
    a: 1,
    x: "GPTBot is OpenAI's training bot; OAI-SearchBot fetches pages for ChatGPT's answers."
  },
  "l-signals": {
    t: "Content Signals and default blocks",
    b: "Content Signals are lines in robots.txt that say what AI may do with your pages: search, ai-input (use in answers), ai-train. Cloudflare serves them by default on millions of sites, and on new and free plans it can now block some AI crawlers by default. Many owners don't know their site is invisible to some AI systems. Check your Cloudflare AI Crawl Control.",
    q: "What does 'ai-input=no' ask AI systems?",
    o: [
      "Not to train on the page",
      "Not to use the page in their answers",
      "Not to show it in Google"
    ],
    a: 1,
    x: "ai-input covers using content in AI answers; ai-train covers training."
  },
  "l-js": {
    t: "What crawlers really see",
    b: "Your browser runs JavaScript; many AI crawlers do not. If your text is added by JavaScript after the page loads, those crawlers see an empty shell. Compare 'view source' with the page you see: the important text should be in both. Server-side rendering or pre-rendering fixes this.",
    q: "Where should your main text be for AI crawlers?",
    o: [
      "Only in images",
      "In the HTML the server sends",
      "Loaded after a click"
    ],
    a: 1,
    x: "Text in the delivered HTML is readable without running JavaScript."
  },
  "l-title": {
    t: "Titles that answer",
    b: "The title is the first thing search engines and AI systems read. A good title says what the thing is and for whom or where: 'Guest house 2 km from the beach in Sidi Bou Said' beats 'Welcome'. The meta description is your one-sentence summary. Keep both honest: AI answers check them against the page.",
    q: "Which title helps most?",
    o: [
      "Home",
      "Welcome to our website",
      "Family guest house 2 km from the beach in Sidi Bou Said"
    ],
    a: 2,
    x: "It names the offer and the place, which is what people ask about."
  },
  "l-structure": {
    t: "Headings are a map",
    b: "AI systems split pages into passages and pick the one that answers a question. Headings are the map they use. One H1 says what the page is. H2s mark sections, ideally phrased like the questions people ask. A wall of text without headings is hard to quote, even if every fact is in it.",
    q: "How many H1 headings should a page have?",
    o: [
      "One",
      "As many as possible",
      "None"
    ],
    a: 0,
    x: "One H1 states the topic; H2s organise the sections."
  },
  "l-schema": {
    t: "Structured data, without the hype",
    b: "Structured data (JSON-LD) states facts in a form machines can read: business name, address, prices, dates. It must be valid: one missing comma and the whole block is ignored. Google says it is not a special requirement for AI features and warns against overfocusing on it, so treat it as hygiene, not magic.",
    q: "A JSON-LD block has a syntax error. What happens?",
    o: [
      "Google fixes it",
      "The whole block is ignored",
      "Only the broken line is ignored"
    ],
    a: 1,
    x: "Invalid JSON cannot be read at all."
  },
  "l-entity": {
    t: "Be one clear entity",
    b: "AI assistants need to know your business is one thing, the same on your site, Google, LinkedIn and directories. Organization or LocalBusiness markup with name, url, logo and sameAs links to your profiles connects these pieces. Use exactly the same name, address and phone everywhere: inconsistencies make AI hesitate to recommend you.",
    q: "What do sameAs links do?",
    o: [
      "Improve page speed",
      "Connect your site to your profiles as the same business",
      "Translate the page"
    ],
    a: 1,
    x: "sameAs tells machines these profiles describe the same entity."
  },
  "l-pagetype": {
    t: "Describe what the page is",
    b: "Products need price, currency and availability so shopping assistants can compare them. Articles need an author and dates so AI can judge expertise and freshness. Matching markup (Product with offers, Article with author and dates) removes guesswork. Shops: the same facts must be in your product feeds.",
    q: "What must a product's markup include for shopping assistants?",
    o: [
      "The logo colour",
      "Offers with price and availability",
      "The page title"
    ],
    a: 1,
    x: "Offers carry the price, currency and availability."
  },
  "l-lang": {
    t: "Languages and right-to-left",
    b: 'Declare the language on every page with <html lang>, and on Arabic pages also dir="rtl". Link language versions with hreflang, including x-default and the page itself. Otherwise an AI may quote your French page to an Arabic speaker, or none of them. Each version should be a real translation, not a machine-only copy.',
    q: "What must an Arabic page also declare?",
    o: [
      'dir="rtl"',
      "A second H1",
      "A bigger font"
    ],
    a: 0,
    x: 'dir="rtl" sets the right-to-left reading direction.'
  },
  "l-answer": {
    t: "Answer first",
    b: "Journalists call it the inverted pyramid; AI search rewards it. Start with one or two sentences that answer the main question directly: what it is, for whom, where, how much. Details come after. An AI looking for an answer can lift your opening as is; a long introduction gets skipped.",
    q: "What belongs in the first 50 words?",
    o: [
      "Company history",
      "The direct answer",
      "A welcome message"
    ],
    a: 1,
    x: "The opening should answer the main question."
  },
  "l-quote": {
    t: "Write quotable sentences",
    b: "An AI quotes sentences that make sense alone. 'It is close to the beach' is useless out of context. 'Dar Noura Guest House is 2 km from the beach in Sidi Bou Said' can be quoted anywhere. Name the subject, add a concrete fact, keep it to 8\u201335 words. Use the highlight to see which sentences work.",
    q: "Which sentence can be quoted alone?",
    o: [
      "We are very close to it.",
      "Our house offers great value.",
      "Dar Noura Guest House is 2 km from the beach in Sidi Bou Said."
    ],
    a: 2,
    x: "It names the subject and gives a checkable fact."
  },
  "l-facts": {
    t: "Facts and sources win",
    b: "In the GEO study (Aggarwal et al., KDD 2024), adding statistics, quotations and cited sources made content more visible in generative answers. Concrete numbers (prices, distances, results, dates) and links to where they come from make a page easier to trust and to quote. Vague praise does the opposite.",
    q: "What raised visibility in the GEO study?",
    o: [
      "More keywords",
      "Statistics, quotations and cited sources",
      "Longer pages"
    ],
    a: 1,
    x: "These methods improved visibility in generative engine answers."
  },
  "l-faq": {
    t: "Answer real questions",
    b: "People ask AI assistants full questions: 'Is there parking at the guest house?' A page section that asks and answers the same question is the easiest thing for an AI to use. Collect the questions customers really ask (emails, calls, reviews) and answer each in two or three sentences. FAQ markup is optional.",
    q: "Where do the best FAQ questions come from?",
    o: [
      "Keyword tools only",
      "What customers actually ask",
      "Competitors' pages"
    ],
    a: 1,
    x: "Real questions match what people type into AI assistants."
  },
  "l-fresh": {
    t: "Show that it's current",
    b: "AI answers prefer content that is clearly up to date, especially for prices, opening hours and offers. Show 'Updated on \u2026' on pages that change, and set dateModified in the markup when you really update them. Don't fake freshness: changing the date without changing the content erodes trust.",
    q: "When should you change dateModified?",
    o: [
      "Every day",
      "When the content really changes",
      "Never"
    ],
    a: 1,
    x: "Dates should reflect real updates."
  },
  "l-media": {
    t: "Images that speak",
    b: "Google lists high-quality images and video among what helps pages in its AI features. Machines read images through their alt text, so describe what each meaningful image shows, in the page's language: 'Roof terrace with sea view at sunset', not 'IMG_2041'. Decorative images can have empty alt text.",
    q: "What is good alt text?",
    o: [
      "IMG_2041.jpg",
      "Roof terrace with sea view at sunset",
      "photo photo photo"
    ],
    a: 1,
    x: "It describes what the image shows."
  },
  "l-agent": {
    t: "Ready for AI agents",
    b: "AI agents will soon book, buy and ask on behalf of users. WebMCP, a Chrome trial, lets a site describe its forms for agents: add toolname and tooldescription to search, booking and contact forms. It is early, so treat it as future-proofing. Simple, working HTML forms already help agents today.",
    q: "What does WebMCP describe for agents?",
    o: [
      "Your logo",
      "Your forms and what they do",
      "Your prices only"
    ],
    a: 1,
    x: "WebMCP exposes forms as tools an agent can call."
  },
  "l-agentfiles": {
    t: "llms.txt and friends",
    b: "llms.txt is a text map of your site for AI tools. Google says it is not needed for its AI features, and large studies found no effect on citations: keep it optional. For shops, what matters is product data: Google Merchant Center, OpenAI's commerce feed, and the open commerce protocols (UCP, ACP) that let agents check out.",
    q: "Does llms.txt improve Google AI Overviews?",
    o: [
      "Yes, a lot",
      "No, Google says it is not needed",
      "Only for shops"
    ],
    a: 1,
    x: "Google's guidance lists llms.txt as unnecessary for its AI features."
  }
};

// packages/lessons/fr.json
var fr_default4 = {
  "l-index": { t: "L'indexation d'abord", b: "Les AI Overviews et l'AI Mode de Google n'utilisent que des pages index\xE9es et autoris\xE9es \xE0 afficher un extrait. Google pr\xE9cise qu'il n'y a pas d'exigence particuli\xE8re au-del\xE0. Un seul \xAB noindex \xBB ou \xAB nosnippet \xBB retire donc discr\xE8tement une page des r\xE9ponses IA, aussi bonne soit-elle. V\xE9rifiez vos pages importantes apr\xE8s chaque modification du site.", q: "Une page porte \xAB nosnippet \xBB. Que se passe-t-il dans les fonctions IA de Google ?", o: ["Rien ne change", "Elle ne peut pas \xEAtre utilis\xE9e dans AI Overviews ni AI Mode", "Elle est mieux class\xE9e"], a: 1, x: "Les fonctions IA de Google n'utilisent que des pages qui autorisent un extrait." },
  "l-bots": { t: "Robots de recherche ou d'entra\xEEnement", b: "Les entreprises d'IA utilisent deux sortes de robots. Les robots de recherche (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot) lisent les pages pour r\xE9pondre \xE0 quelqu'un maintenant. Les robots d'entra\xEEnement (GPTBot, ClaudeBot, Google-Extended, CCBot) collectent des donn\xE9es pour entra\xEEner des mod\xE8les. Vous pouvez bloquer l'entra\xEEnement et rester cit\xE9. Bloquer la recherche vous retire des r\xE9ponses.", q: "Vous voulez que ChatGPT vous cite sans s'entra\xEEner sur vos pages. Que bloquez-vous ?", o: ["OAI-SearchBot", "GPTBot", "Les deux"], a: 1, x: "GPTBot est le robot d'entra\xEEnement d'OpenAI ; OAI-SearchBot lit les pages pour les r\xE9ponses de ChatGPT." },
  "l-signals": { t: "Content Signals et blocages par d\xE9faut", b: "Les Content Signals sont des lignes du robots.txt qui disent ce que l'IA peut faire de vos pages : search, ai-input (utiliser dans les r\xE9ponses), ai-train. Cloudflare les sert par d\xE9faut sur des millions de sites, et peut d\xE9sormais bloquer par d\xE9faut certains robots IA sur les nouveaux sites et offres gratuites. Beaucoup de propri\xE9taires l'ignorent. V\xE9rifiez AI Crawl Control dans Cloudflare.", q: "Que demande \xAB ai-input=no \xBB aux syst\xE8mes d'IA ?", o: ["Ne pas s'entra\xEEner sur la page", "Ne pas utiliser la page dans leurs r\xE9ponses", "Ne pas l'afficher dans Google"], a: 1, x: "ai-input concerne l'usage dans les r\xE9ponses ; ai-train l'entra\xEEnement." },
  "l-js": { t: "Ce que voient vraiment les robots", b: "Votre navigateur ex\xE9cute JavaScript ; beaucoup de robots IA non. Si votre texte est ajout\xE9 par JavaScript apr\xE8s le chargement, ces robots voient une coquille vide. Comparez \xAB afficher la source \xBB avec la page affich\xE9e : le texte important doit \xEAtre dans les deux. Le rendu c\xF4t\xE9 serveur ou le pr\xE9-rendu r\xE8gle le probl\xE8me.", q: "O\xF9 doit se trouver votre texte principal pour les robots IA ?", o: ["Seulement dans des images", "Dans le HTML envoy\xE9 par le serveur", "Charg\xE9 apr\xE8s un clic"], a: 1, x: "Le texte pr\xE9sent dans le HTML envoy\xE9 se lit sans ex\xE9cuter JavaScript." },
  "l-title": { t: "Des titres qui r\xE9pondent", b: "Le titre est la premi\xE8re chose que lisent les moteurs et les IA. Un bon titre dit ce que c'est et pour qui ou o\xF9 : \xAB Maison d'h\xF4tes \xE0 2 km de la plage \xE0 Sidi Bou Sa\xEFd \xBB vaut mieux que \xAB Bienvenue \xBB. La meta description est votre r\xE9sum\xE9 en une phrase. Restez honn\xEAte : les IA les comparent \xE0 la page.", q: "Quel titre aide le plus ?", o: ["Accueil", "Bienvenue sur notre site", "Maison d'h\xF4tes familiale \xE0 2 km de la plage \xE0 Sidi Bou Sa\xEFd"], a: 2, x: "Il nomme l'offre et le lieu, ce que les gens demandent." },
  "l-structure": { t: "Les titres sont une carte", b: "Les IA d\xE9coupent les pages en passages et choisissent celui qui r\xE9pond \xE0 une question. Les titres sont la carte qu'elles utilisent. Un H1 dit ce qu'est la page. Les H2 marquent les sections, id\xE9alement formul\xE9es comme les questions que les gens posent. Un bloc de texte sans titres est difficile \xE0 citer, m\xEAme s'il contient tout.", q: "Combien de titres H1 une page doit-elle avoir ?", o: ["Un seul", "Le plus possible", "Aucun"], a: 0, x: "Un H1 annonce le sujet ; les H2 organisent les sections." },
  "l-schema": { t: "Les donn\xE9es structur\xE9es, sans exag\xE9ration", b: "Les donn\xE9es structur\xE9es (JSON-LD) \xE9noncent des faits lisibles par les machines : nom, adresse, prix, dates. Elles doivent \xEAtre valides : une virgule manquante et tout le bloc est ignor\xE9. Google pr\xE9cise que ce n'est pas une exigence particuli\xE8re pour ses fonctions IA et d\xE9conseille d'en faire trop : c'est de l'hygi\xE8ne, pas de la magie.", q: "Un bloc JSON-LD contient une erreur de syntaxe. Que se passe-t-il ?", o: ["Google la corrige", "Tout le bloc est ignor\xE9", "Seule la ligne cass\xE9e est ignor\xE9e"], a: 1, x: "Un JSON invalide ne peut pas \xEAtre lu du tout." },
  "l-entity": { t: "Une seule entit\xE9 claire", b: "Les assistants IA doivent savoir que votre entreprise est une seule et m\xEAme chose sur votre site, Google, LinkedIn et les annuaires. Le balisage Organization ou LocalBusiness avec name, url, logo et des liens sameAs vers vos profils relie ces \xE9l\xE9ments. Utilisez exactement le m\xEAme nom, la m\xEAme adresse et le m\xEAme t\xE9l\xE9phone partout : les incoh\xE9rences font h\xE9siter l'IA.", q: "\xC0 quoi servent les liens sameAs ?", o: ["Acc\xE9l\xE9rer la page", "Relier votre site \xE0 vos profils comme une m\xEAme entreprise", "Traduire la page"], a: 1, x: "sameAs indique que ces profils d\xE9crivent la m\xEAme entit\xE9." },
  "l-pagetype": { t: "Dire ce qu'est la page", b: "Les produits ont besoin d'un prix, d'une devise et d'une disponibilit\xE9 pour que les assistants d'achat les comparent. Les articles ont besoin d'un auteur et de dates pour juger l'expertise et la fra\xEEcheur. Le balisage adapt\xE9 (Product avec offers, Article avec auteur et dates) supprime les suppositions. Boutiques : les m\xEAmes faits dans vos flux produits.", q: "Que doit contenir le balisage d'un produit pour les assistants d'achat ?", o: ["La couleur du logo", "Des offers avec prix et disponibilit\xE9", "Le titre de la page"], a: 1, x: "Offers porte le prix, la devise et la disponibilit\xE9." },
  "l-lang": { t: "Langues et \xE9criture de droite \xE0 gauche", b: 'D\xE9clarez la langue de chaque page avec <html lang>, et sur les pages en arabe aussi dir="rtl". Reliez les versions avec hreflang, y compris x-default et la page elle-m\xEAme. Sinon une IA peut citer votre page fran\xE7aise \xE0 un arabophone, ou aucune. Chaque version doit \xEAtre une vraie traduction, pas une copie automatique.', q: "Que doit aussi d\xE9clarer une page en arabe ?", o: ['dir="rtl"', "Un second H1", "Une police plus grande"], a: 0, x: 'dir="rtl" fixe le sens de lecture de droite \xE0 gauche.' },
  "l-answer": { t: "La r\xE9ponse d'abord", b: "Les journalistes parlent de pyramide invers\xE9e ; la recherche IA la r\xE9compense. Commencez par une ou deux phrases qui r\xE9pondent directement \xE0 la question principale : quoi, pour qui, o\xF9, combien. Les d\xE9tails viennent ensuite. Une IA qui cherche une r\xE9ponse peut reprendre votre ouverture telle quelle ; une longue introduction est ignor\xE9e.", q: "Que mettre dans les 50 premiers mots ?", o: ["L'histoire de l'entreprise", "La r\xE9ponse directe", "Un message de bienvenue"], a: 1, x: "L'ouverture doit r\xE9pondre \xE0 la question principale." },
  "l-quote": { t: "\xC9crire des phrases citables", b: "Une IA cite des phrases qui ont du sens seules. \xAB C'est pr\xE8s de la plage \xBB est inutile hors contexte. \xAB La maison d'h\xF4tes Dar Noura est \xE0 2 km de la plage \xE0 Sidi Bou Sa\xEFd \xBB peut \xEAtre cit\xE9e partout. Nommez le sujet, ajoutez un fait concret, 8 \xE0 35 mots. Le surlignage montre les phrases qui fonctionnent.", q: "Quelle phrase peut \xEAtre cit\xE9e seule ?", o: ["Nous en sommes tr\xE8s proches.", "Notre maison offre un excellent rapport qualit\xE9-prix.", "La maison d'h\xF4tes Dar Noura est \xE0 2 km de la plage \xE0 Sidi Bou Sa\xEFd."], a: 2, x: "Elle nomme le sujet et donne un fait v\xE9rifiable." },
  "l-facts": { t: "Les faits et les sources gagnent", b: "Dans l'\xE9tude GEO (Aggarwal et al., KDD 2024), ajouter des statistiques, des citations et des sources a rendu le contenu plus visible dans les r\xE9ponses g\xE9n\xE9ratives. Des chiffres concrets (prix, distances, r\xE9sultats, dates) et des liens vers leur origine rendent une page plus fiable et plus citable. Les \xE9loges vagues font l'inverse.", q: "Qu'est-ce qui a augment\xE9 la visibilit\xE9 dans l'\xE9tude GEO ?", o: ["Plus de mots-cl\xE9s", "Statistiques, citations et sources", "Des pages plus longues"], a: 1, x: "Ces m\xE9thodes ont am\xE9lior\xE9 la visibilit\xE9 dans les r\xE9ponses des moteurs g\xE9n\xE9ratifs." },
  "l-faq": { t: "R\xE9pondre \xE0 de vraies questions", b: "Les gens posent des questions compl\xE8tes aux assistants IA : \xAB Y a-t-il un parking \xE0 la maison d'h\xF4tes ? \xBB Une section qui pose et r\xE9pond \xE0 la m\xEAme question est ce qu'une IA utilise le plus facilement. Rassemblez les questions que vos clients posent vraiment (e-mails, appels, avis) et r\xE9pondez \xE0 chacune en deux ou trois phrases. Le balisage FAQ est facultatif.", q: "D'o\xF9 viennent les meilleures questions de FAQ ?", o: ["Uniquement d'outils de mots-cl\xE9s", "De ce que demandent vraiment les clients", "Des pages des concurrents"], a: 1, x: "Les vraies questions correspondent \xE0 ce que les gens tapent dans les assistants IA." },
  "l-fresh": { t: "Montrer que c'est \xE0 jour", b: "Les r\xE9ponses IA pr\xE9f\xE8rent un contenu clairement \xE0 jour, surtout pour les prix, horaires et offres. Affichez \xAB Mis \xE0 jour le \u2026 \xBB sur les pages qui \xE9voluent, et renseignez dateModified quand vous les mettez vraiment \xE0 jour. Ne trichez pas : changer la date sans changer le contenu ab\xEEme la confiance.", q: "Quand changer dateModified ?", o: ["Tous les jours", "Quand le contenu change vraiment", "Jamais"], a: 1, x: "Les dates doivent refl\xE9ter de vraies mises \xE0 jour." },
  "l-media": { t: "Des images qui parlent", b: "Google cite les images et vid\xE9os de qualit\xE9 parmi ce qui aide dans ses fonctions IA. Les machines lisent les images via le texte alt : d\xE9crivez ce que montre chaque image utile, dans la langue de la page : \xAB Terrasse sur le toit avec vue sur la mer au coucher du soleil \xBB, pas \xAB IMG_2041 \xBB. Les images d\xE9coratives peuvent avoir un alt vide.", q: "Qu'est-ce qu'un bon texte alt ?", o: ["IMG_2041.jpg", "Terrasse sur le toit avec vue sur la mer au coucher du soleil", "photo photo photo"], a: 1, x: "Il d\xE9crit ce que montre l'image." },
  "l-agent": { t: "Pr\xEAt pour les agents IA", b: "Les agents IA vont bient\xF4t r\xE9server, acheter et demander pour les utilisateurs. WebMCP, un essai de Chrome, permet \xE0 un site de d\xE9crire ses formulaires pour les agents : ajoutez toolname et tooldescription aux formulaires de recherche, de r\xE9servation et de contact. C'est pr\xE9coce : de l'anticipation. Des formulaires HTML simples et fonctionnels aident d\xE9j\xE0 les agents.", q: "Que d\xE9crit WebMCP pour les agents ?", o: ["Votre logo", "Vos formulaires et ce qu'ils font", "Seulement vos prix"], a: 1, x: "WebMCP expose les formulaires comme des outils qu'un agent peut appeler." },
  "l-agentfiles": { t: "llms.txt et compagnie", b: "llms.txt est un plan texte de votre site pour les outils d'IA. Google indique qu'il n'est pas n\xE9cessaire pour ses fonctions IA, et de grandes \xE9tudes n'ont trouv\xE9 aucun effet sur les citations : gardez-le facultatif. Pour les boutiques, ce qui compte, ce sont les donn\xE9es produit : Google Merchant Center, le flux commerce d'OpenAI et les protocoles ouverts (UCP, ACP) qui permettent aux agents de payer.", q: "llms.txt am\xE9liore-t-il les AI Overviews de Google ?", o: ["Oui, beaucoup", "Non, Google indique qu'il n'est pas n\xE9cessaire", "Seulement pour les boutiques"], a: 1, x: "Les recommandations de Google citent llms.txt parmi les \xE9l\xE9ments inutiles pour ses fonctions IA." }
};

// packages/lessons/de.json
var de_default4 = {
  "l-index": { t: "Zuerst die Indexierung", b: "Googles AI Overviews und AI Mode nutzen nur Seiten, die indexiert sind und ein Snippet zeigen d\xFCrfen. Laut Google gibt es dar\xFCber hinaus keine besonderen Anforderungen. Ein einziges \u201Enoindex\u201C oder \u201Enosnippet\u201C nimmt eine Seite also still aus den KI-Antworten, egal wie gut sie ist. Pr\xFCfen Sie wichtige Seiten nach jeder Website-\xC4nderung.", q: "Eine Seite hat \u201Enosnippet\u201C. Was passiert in Googles KI-Funktionen?", o: ["Nichts \xE4ndert sich", "Sie kann nicht in AI Overviews oder AI Mode genutzt werden", "Sie rankt besser"], a: 1, x: "Googles KI-Funktionen nutzen nur Seiten, die ein Snippet erlauben." },
  "l-bots": { t: "Such-Bots und Trainings-Bots", b: "KI-Firmen betreiben zwei Arten von Bots. Such-Bots (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot) rufen Seiten ab, um jemandem jetzt zu antworten. Trainings-Bots (GPTBot, ClaudeBot, Google-Extended, CCBot) sammeln Daten f\xFCr das Training. Sie k\xF6nnen Training blockieren und trotzdem zitiert werden. Wer Such-Bots blockiert, verschwindet aus deren Antworten.", q: "ChatGPT soll Sie zitieren, aber nicht mit Ihren Seiten trainieren. Was blockieren Sie?", o: ["OAI-SearchBot", "GPTBot", "Beide"], a: 1, x: "GPTBot ist OpenAIs Trainings-Bot; OAI-SearchBot ruft Seiten f\xFCr ChatGPTs Antworten ab." },
  "l-signals": { t: "Content Signals und Standardsperren", b: "Content Signals sind Zeilen in der robots.txt, die sagen, was KI mit Ihren Seiten tun darf: search, ai-input (in Antworten nutzen), ai-train. Cloudflare liefert sie standardm\xE4\xDFig auf Millionen Websites aus und kann bei neuen und kostenlosen Pl\xE4nen inzwischen manche KI-Crawler standardm\xE4\xDFig blockieren. Viele Inhaber wissen das nicht. Pr\xFCfen Sie AI Crawl Control in Cloudflare.", q: "Worum bittet \u201Eai-input=no\u201C KI-Systeme?", o: ["Nicht mit der Seite zu trainieren", "Die Seite nicht in Antworten zu nutzen", "Sie nicht in Google zu zeigen"], a: 1, x: "ai-input betrifft die Nutzung in Antworten; ai-train das Training." },
  "l-js": { t: "Was Crawler wirklich sehen", b: "Ihr Browser f\xFChrt JavaScript aus, viele KI-Crawler nicht. Wird Ihr Text erst nach dem Laden per JavaScript eingef\xFCgt, sehen diese Crawler eine leere H\xFClle. Vergleichen Sie \u201EQuelltext anzeigen\u201C mit der sichtbaren Seite: Der wichtige Text muss in beiden stehen. Serverseitiges Rendern oder Pre-Rendering l\xF6st das.", q: "Wo sollte Ihr Haupttext f\xFCr KI-Crawler stehen?", o: ["Nur in Bildern", "Im HTML, das der Server ausliefert", "Nach einem Klick nachgeladen"], a: 1, x: "Text im ausgelieferten HTML ist ohne JavaScript lesbar." },
  "l-title": { t: "Titel, die antworten", b: "Den Titel lesen Suchmaschinen und KI-Systeme zuerst. Ein guter Titel sagt, was es ist und f\xFCr wen oder wo: \u201EG\xE4stehaus 2 km vom Strand in Sidi Bou Said\u201C schl\xE4gt \u201EWillkommen\u201C. Die Meta-Beschreibung ist Ihre Zusammenfassung in einem Satz. Bleiben Sie ehrlich: KI-Antworten gleichen beides mit der Seite ab.", q: "Welcher Titel hilft am meisten?", o: ["Startseite", "Willkommen auf unserer Website", "Familien-G\xE4stehaus 2 km vom Strand in Sidi Bou Said"], a: 2, x: "Er nennt Angebot und Ort, also das, wonach Menschen fragen." },
  "l-structure": { t: "\xDCberschriften sind eine Landkarte", b: "KI-Systeme zerlegen Seiten in Abschnitte und w\xE4hlen den, der eine Frage beantwortet. \xDCberschriften sind ihre Landkarte. Eine H1 sagt, worum es geht. H2 markieren Abschnitte, am besten formuliert wie die Fragen, die Menschen stellen. Eine Textwand ohne \xDCberschriften ist schwer zu zitieren, selbst wenn alles drinsteht.", q: "Wie viele H1-\xDCberschriften sollte eine Seite haben?", o: ["Eine", "So viele wie m\xF6glich", "Keine"], a: 0, x: "Eine H1 nennt das Thema; H2 gliedern die Abschnitte." },
  "l-schema": { t: "Strukturierte Daten ohne Hype", b: "Strukturierte Daten (JSON-LD) nennen Fakten maschinenlesbar: Firmenname, Adresse, Preise, Daten. Sie m\xFCssen g\xFCltig sein: Ein fehlendes Komma, und der ganze Block wird ignoriert. Laut Google sind sie keine Sonderanforderung f\xFCr KI-Funktionen, und Google warnt davor, sich zu sehr darauf zu konzentrieren: Hygiene, keine Magie.", q: "Ein JSON-LD-Block hat einen Syntaxfehler. Was passiert?", o: ["Google korrigiert ihn", "Der ganze Block wird ignoriert", "Nur die fehlerhafte Zeile wird ignoriert"], a: 1, x: "Ung\xFCltiges JSON kann gar nicht gelesen werden." },
  "l-entity": { t: "Eine klare Entit\xE4t sein", b: "KI-Assistenten m\xFCssen wissen, dass Ihr Unternehmen \xFCberall dasselbe ist: auf Ihrer Website, bei Google, LinkedIn und in Verzeichnissen. Organization- oder LocalBusiness-Markup mit name, url, logo und sameAs-Links zu Ihren Profilen verbindet diese Teile. Nutzen Sie \xFCberall exakt denselben Namen, dieselbe Adresse und Telefonnummer: Widerspr\xFCche lassen KI z\xF6gern.", q: "Wozu dienen sameAs-Links?", o: ["Die Seite schneller machen", "Ihre Website mit Ihren Profilen als dasselbe Unternehmen verbinden", "Die Seite \xFCbersetzen"], a: 1, x: "sameAs sagt Maschinen, dass diese Profile dieselbe Entit\xE4t beschreiben." },
  "l-pagetype": { t: "Sagen, was die Seite ist", b: "Produkte brauchen Preis, W\xE4hrung und Verf\xFCgbarkeit, damit Einkaufsassistenten vergleichen k\xF6nnen. Artikel brauchen Autor und Datum, damit KI Expertise und Aktualit\xE4t einsch\xE4tzen kann. Passendes Markup (Product mit offers, Article mit Autor und Datum) erspart das Raten. Shops: dieselben Fakten auch in den Produkt-Feeds.", q: "Was muss das Markup eines Produkts f\xFCr Einkaufsassistenten enthalten?", o: ["Die Logofarbe", "Offers mit Preis und Verf\xFCgbarkeit", "Den Seitentitel"], a: 1, x: "Offers enthalten Preis, W\xE4hrung und Verf\xFCgbarkeit." },
  "l-lang": { t: "Sprachen und Rechts-nach-links", b: 'Geben Sie auf jeder Seite die Sprache mit <html lang> an, auf arabischen Seiten zus\xE4tzlich dir="rtl". Verkn\xFCpfen Sie Sprachversionen mit hreflang, inklusive x-default und der Seite selbst. Sonst zitiert eine KI wom\xF6glich Ihre franz\xF6sische Seite f\xFCr Arabischsprachige, oder gar keine. Jede Version sollte eine echte \xDCbersetzung sein.', q: "Was muss eine arabische Seite zus\xE4tzlich angeben?", o: ['dir="rtl"', "Eine zweite H1", "Eine gr\xF6\xDFere Schrift"], a: 0, x: 'dir="rtl" legt die Leserichtung von rechts nach links fest.' },
  "l-answer": { t: "Die Antwort zuerst", b: "Journalisten nennen es umgekehrte Pyramide, KI-Suche belohnt es. Beginnen Sie mit ein oder zwei S\xE4tzen, die die Hauptfrage direkt beantworten: was, f\xFCr wen, wo, wie viel. Details folgen danach. Eine KI, die eine Antwort sucht, kann Ihren Einstieg direkt \xFCbernehmen; eine lange Einleitung wird \xFCbersprungen.", q: "Was geh\xF6rt in die ersten 50 W\xF6rter?", o: ["Die Firmengeschichte", "Die direkte Antwort", "Eine Begr\xFC\xDFung"], a: 1, x: "Der Einstieg sollte die Hauptfrage beantworten." },
  "l-quote": { t: "Zitierbare S\xE4tze schreiben", b: "Eine KI zitiert S\xE4tze, die allein Sinn ergeben. \u201EEs liegt nah am Strand\u201C ist ohne Zusammenhang nutzlos. \u201EDas G\xE4stehaus Dar Noura liegt 2 km vom Strand in Sidi Bou Said entfernt\u201C l\xE4sst sich \xFCberall zitieren. Subjekt nennen, eine konkrete Tatsache einbauen, 8\u201335 W\xF6rter. Die Markierung zeigt, welche S\xE4tze funktionieren.", q: "Welcher Satz l\xE4sst sich allein zitieren?", o: ["Wir sind ganz in der N\xE4he.", "Unser Haus bietet ein tolles Preis-Leistungs-Verh\xE4ltnis.", "Das G\xE4stehaus Dar Noura liegt 2 km vom Strand in Sidi Bou Said entfernt."], a: 2, x: "Er nennt das Subjekt und eine \xFCberpr\xFCfbare Tatsache." },
  "l-facts": { t: "Fakten und Quellen gewinnen", b: "In der GEO-Studie (Aggarwal et al., KDD 2024) machten Statistiken, Zitate und belegte Quellen Inhalte in generativen Antworten sichtbarer. Konkrete Zahlen (Preise, Entfernungen, Ergebnisse, Daten) und Links zu ihrer Herkunft machen eine Seite vertrauensw\xFCrdiger und zitierbarer. Vages Lob bewirkt das Gegenteil.", q: "Was erh\xF6hte die Sichtbarkeit in der GEO-Studie?", o: ["Mehr Keywords", "Statistiken, Zitate und belegte Quellen", "L\xE4ngere Seiten"], a: 1, x: "Diese Methoden verbesserten die Sichtbarkeit in Antworten generativer Suchmaschinen." },
  "l-faq": { t: "Echte Fragen beantworten", b: "Menschen stellen KI-Assistenten ganze Fragen: \u201EGibt es Parkpl\xE4tze am G\xE4stehaus?\u201C Ein Abschnitt, der genau diese Frage stellt und beantwortet, ist f\xFCr eine KI am leichtesten nutzbar. Sammeln Sie die Fragen, die Kunden wirklich stellen (E-Mails, Anrufe, Bewertungen), und beantworten Sie jede in zwei, drei S\xE4tzen. FAQ-Markup ist optional.", q: "Woher kommen die besten FAQ-Fragen?", o: ["Nur aus Keyword-Tools", "Von dem, was Kunden wirklich fragen", "Von Seiten der Wettbewerber"], a: 1, x: "Echte Fragen entsprechen dem, was Menschen in KI-Assistenten tippen." },
  "l-fresh": { t: "Zeigen, dass es aktuell ist", b: "KI-Antworten bevorzugen erkennbar aktuelle Inhalte, besonders bei Preisen, \xD6ffnungszeiten und Angeboten. Zeigen Sie \u201EAktualisiert am \u2026\u201C auf Seiten, die sich \xE4ndern, und setzen Sie dateModified, wenn Sie wirklich aktualisieren. Nicht schummeln: das Datum ohne neuen Inhalt zu \xE4ndern, kostet Vertrauen.", q: "Wann sollten Sie dateModified \xE4ndern?", o: ["Jeden Tag", "Wenn sich der Inhalt wirklich \xE4ndert", "Nie"], a: 1, x: "Daten sollten echte Aktualisierungen widerspiegeln." },
  "l-media": { t: "Bilder, die sprechen", b: "Google nennt hochwertige Bilder und Videos unter dem, was Seiten in seinen KI-Funktionen hilft. Maschinen lesen Bilder \xFCber den Alt-Text: Beschreiben Sie, was jedes aussagekr\xE4ftige Bild zeigt, in der Sprache der Seite: \u201EDachterrasse mit Meerblick bei Sonnenuntergang\u201C, nicht \u201EIMG_2041\u201C. Dekorative Bilder d\xFCrfen einen leeren Alt-Text haben.", q: "Was ist ein guter Alt-Text?", o: ["IMG_2041.jpg", "Dachterrasse mit Meerblick bei Sonnenuntergang", "foto foto foto"], a: 1, x: "Er beschreibt, was das Bild zeigt." },
  "l-agent": { t: "Bereit f\xFCr KI-Agenten", b: "KI-Agenten werden bald im Auftrag von Nutzern buchen, kaufen und anfragen. WebMCP, ein Chrome-Test, l\xE4sst eine Website ihre Formulare f\xFCr Agenten beschreiben: toolname und tooldescription an Such-, Buchungs- und Kontaktformulare. Es ist fr\xFCh, also Zukunftssicherung. Einfache, funktionierende HTML-Formulare helfen Agenten schon heute.", q: "Was beschreibt WebMCP f\xFCr Agenten?", o: ["Ihr Logo", "Ihre Formulare und was sie tun", "Nur Ihre Preise"], a: 1, x: "WebMCP stellt Formulare als Werkzeuge bereit, die ein Agent aufrufen kann." },
  "l-agentfiles": { t: "llms.txt und Co.", b: "llms.txt ist eine Textkarte Ihrer Website f\xFCr KI-Werkzeuge. Laut Google ist sie f\xFCr seine KI-Funktionen nicht n\xF6tig, und gro\xDFe Studien fanden keinen Effekt auf Zitierungen: optional halten. F\xFCr Shops z\xE4hlen Produktdaten: Google Merchant Center, OpenAIs Commerce-Feed und die offenen Commerce-Protokolle (UCP, ACP), mit denen Agenten bezahlen k\xF6nnen.", q: "Verbessert llms.txt Googles AI Overviews?", o: ["Ja, deutlich", "Nein, laut Google ist sie nicht n\xF6tig", "Nur f\xFCr Shops"], a: 1, x: "Googles Leitfaden nennt llms.txt als unn\xF6tig f\xFCr seine KI-Funktionen." }
};

// packages/lessons/ar.json
var ar_default4 = {
  "l-index": { t: "\u0627\u0644\u0641\u0647\u0631\u0633\u0629 \u0623\u0648\u0644\u064B\u0627", b: "\u0644\u0627 \u062A\u0633\u062A\u062E\u062F\u0645 \u0645\u0644\u062E\u0635\u0627\u062A Google \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A (AI Overviews) \u0648\u0648\u0636\u0639 AI Mode \u0625\u0644\u0627 \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0627\u0644\u0645\u0641\u0647\u0631\u0633\u0629 \u0648\u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0644\u0647\u0627 \u0628\u0639\u0631\u0636 \u0645\u0642\u062A\u0637\u0641. \u0648\u062A\u0642\u0648\u0644 Google \u0625\u0646\u0647 \u0644\u0627 \u062A\u0648\u062C\u062F \u0634\u0631\u0648\u0637 \u062E\u0627\u0635\u0629 \u063A\u064A\u0631 \u0630\u0644\u0643. \u0644\u0630\u0644\u0643 \u0641\u0625\u0646 \u0648\u0633\u0645\u064B\u0627 \u0648\u0627\u062D\u062F\u064B\u0627 \u0645\u062B\u0644 \xABnoindex\xBB \u0623\u0648 \xABnosnippet\xBB \u064A\u064F\u062E\u0631\u062C \u0627\u0644\u0635\u0641\u062D\u0629 \u0628\u0635\u0645\u062A \u0645\u0646 \u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0645\u0647\u0645\u0627 \u0643\u0627\u0646\u062A \u062C\u064A\u062F\u0629. \u0627\u0641\u062D\u0635 \u0635\u0641\u062D\u0627\u062A\u0643 \u0627\u0644\u0645\u0647\u0645\u0629 \u0628\u0639\u062F \u0643\u0644 \u062A\u0639\u062F\u064A\u0644 \u0639\u0644\u0649 \u0627\u0644\u0645\u0648\u0642\u0639.", q: "\u0635\u0641\u062D\u0629 \u062A\u062D\u0645\u0644 \xABnosnippet\xBB. \u0645\u0627\u0630\u0627 \u064A\u062D\u062F\u062B \u0641\u064A \u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0644\u062F\u0649 Google\u061F", o: ["\u0644\u0627 \u0634\u064A\u0621 \u064A\u062A\u063A\u064A\u0631", "\u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u0633\u062A\u062E\u062F\u0627\u0645\u0647\u0627 \u0641\u064A AI Overviews \u0623\u0648 AI Mode", "\u064A\u062A\u062D\u0633\u0646 \u062A\u0631\u062A\u064A\u0628\u0647\u0627"], a: 1, x: "\u0645\u064A\u0632\u0627\u062A Google \u0644\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0644\u0627 \u062A\u0633\u062A\u062E\u062F\u0645 \u0625\u0644\u0627 \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0627\u0644\u062A\u064A \u062A\u0633\u0645\u062D \u0628\u0627\u0644\u0645\u0642\u062A\u0637\u0641." },
  "l-bots": { t: "\u0631\u0648\u0628\u0648\u062A\u0627\u062A \u0627\u0644\u0628\u062D\u062B \u0648\u0631\u0648\u0628\u0648\u062A\u0627\u062A \u0627\u0644\u062A\u062F\u0631\u064A\u0628", b: "\u062A\u0634\u063A\u0651\u0644 \u0634\u0631\u0643\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0646\u0648\u0639\u064A\u0646 \u0645\u0646 \u0627\u0644\u0631\u0648\u0628\u0648\u062A\u0627\u062A. \u0631\u0648\u0628\u0648\u062A\u0627\u062A \u0627\u0644\u0628\u062D\u062B (OAI-SearchBot \u0648ChatGPT-User \u0648PerplexityBot \u0648Claude-SearchBot) \u062A\u0642\u0631\u0623 \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0644\u062A\u062C\u064A\u0628 \u0634\u062E\u0635\u064B\u0627 \u0627\u0644\u0622\u0646. \u0648\u0631\u0648\u0628\u0648\u062A\u0627\u062A \u0627\u0644\u062A\u062F\u0631\u064A\u0628 (GPTBot \u0648ClaudeBot \u0648Google-Extended \u0648CCBot) \u062A\u062C\u0645\u0639 \u0628\u064A\u0627\u0646\u0627\u062A \u0644\u062A\u062F\u0631\u064A\u0628 \u0627\u0644\u0646\u0645\u0627\u0630\u062C. \u064A\u0645\u0643\u0646\u0643 \u062D\u062C\u0628 \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \u0645\u0639 \u0628\u0642\u0627\u0626\u0643 \u0645\u0630\u0643\u0648\u0631\u064B\u0627 \u0641\u064A \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A. \u0623\u0645\u0627 \u062D\u062C\u0628 \u0631\u0648\u0628\u0648\u062A\u0627\u062A \u0627\u0644\u0628\u062D\u062B \u0641\u064A\u064F\u062E\u0631\u062C\u0643 \u0645\u0646 \u0625\u062C\u0627\u0628\u0627\u062A\u0647\u0627.", q: "\u062A\u0631\u064A\u062F \u0623\u0646 \u064A\u0630\u0643\u0631\u0643 ChatGPT \u062F\u0648\u0646 \u0623\u0646 \u064A\u062A\u062F\u0631\u0651\u0628 \u0639\u0644\u0649 \u0635\u0641\u062D\u0627\u062A\u0643. \u0645\u0627\u0630\u0627 \u062A\u062D\u062C\u0628\u061F", o: ["OAI-SearchBot", "GPTBot", "\u0643\u0644\u0627\u0647\u0645\u0627"], a: 1, x: "GPTBot \u0647\u0648 \u0631\u0648\u0628\u0648\u062A \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \u0644\u062F\u0649 OpenAI\u061B \u0623\u0645\u0627 OAI-SearchBot \u0641\u064A\u0642\u0631\u0623 \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0644\u0625\u062C\u0627\u0628\u0627\u062A ChatGPT." },
  "l-signals": { t: "\u0625\u0634\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0648\u0627\u0644\u062D\u062C\u0628 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A", b: "\u0625\u0634\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u062D\u062A\u0648\u0649 (Content Signals) \u0623\u0633\u0637\u0631 \u0641\u064A robots.txt \u062A\u062D\u062F\u062F \u0645\u0627 \u064A\u062D\u0642 \u0644\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0641\u0639\u0644\u0647 \u0628\u0635\u0641\u062D\u0627\u062A\u0643: search\u060C \u0648ai-input (\u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0641\u064A \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A)\u060C \u0648ai-train. \u062A\u0636\u064A\u0641\u0647\u0627 Cloudflare \u0627\u0641\u062A\u0631\u0627\u0636\u064A\u064B\u0627 \u0639\u0644\u0649 \u0645\u0644\u0627\u064A\u064A\u0646 \u0627\u0644\u0645\u0648\u0627\u0642\u0639\u060C \u0648\u0642\u062F \u062A\u062D\u062C\u0628 \u0627\u0644\u0622\u0646 \u0627\u0641\u062A\u0631\u0627\u0636\u064A\u064B\u0627 \u0628\u0639\u0636 \u0632\u0648\u0627\u062D\u0641 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0641\u064A \u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u0648\u0627\u0644\u062E\u0637\u0637 \u0627\u0644\u0645\u062C\u0627\u0646\u064A\u0629. \u0643\u062B\u064A\u0631 \u0645\u0646 \u0623\u0635\u062D\u0627\u0628 \u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u0644\u0627 \u064A\u0639\u0631\u0641\u0648\u0646 \u0630\u0644\u0643. \u0631\u0627\u062C\u0639 AI Crawl Control \u0641\u064A Cloudflare.", q: "\u0645\u0627\u0630\u0627 \u062A\u0637\u0644\u0628 \xABai-input=no\xBB \u0645\u0646 \u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A\u061F", o: ["\u0623\u0644\u0627 \u062A\u062A\u062F\u0631\u0651\u0628 \u0639\u0644\u0649 \u0627\u0644\u0635\u0641\u062D\u0629", "\u0623\u0644\u0627 \u062A\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0635\u0641\u062D\u0629 \u0641\u064A \u0625\u062C\u0627\u0628\u0627\u062A\u0647\u0627", "\u0623\u0644\u0627 \u062A\u0639\u0631\u0636\u0647\u0627 \u0641\u064A Google"], a: 1, x: "ai-input \u064A\u062E\u0635 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0641\u064A \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A\u060C \u0648ai-train \u064A\u062E\u0635 \u0627\u0644\u062A\u062F\u0631\u064A\u0628." },
  "l-js": { t: "\u0645\u0627 \u062A\u0631\u0627\u0647 \u0627\u0644\u0632\u0648\u0627\u062D\u0641 \u0641\u0639\u0644\u064B\u0627", b: "\u0645\u062A\u0635\u0641\u062D\u0643 \u064A\u0634\u063A\u0651\u0644 JavaScript\u060C \u0644\u0643\u0646 \u0643\u062B\u064A\u0631\u064B\u0627 \u0645\u0646 \u0632\u0648\u0627\u062D\u0641 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0644\u0627 \u062A\u0641\u0639\u0644. \u0625\u0630\u0627 \u0623\u064F\u0636\u064A\u0641 \u0646\u0635\u0643 \u0628\u0648\u0627\u0633\u0637\u0629 JavaScript \u0628\u0639\u062F \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0635\u0641\u062D\u0629\u060C \u0641\u0633\u062A\u0631\u0649 \u062A\u0644\u0643 \u0627\u0644\u0632\u0648\u0627\u062D\u0641 \u0635\u0641\u062D\u0629 \u0641\u0627\u0631\u063A\u0629. \u0642\u0627\u0631\u0646 \xAB\u0639\u0631\u0636 \u0627\u0644\u0645\u0635\u062F\u0631\xBB \u0628\u0627\u0644\u0635\u0641\u062D\u0629 \u0643\u0645\u0627 \u062A\u0631\u0627\u0647\u0627: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0627\u0644\u0646\u0635 \u0627\u0644\u0645\u0647\u0645 \u0641\u064A \u0627\u0644\u0627\u062B\u0646\u064A\u0646. \u0627\u0644\u0639\u0631\u0636 \u0645\u0646 \u062C\u0647\u0629 \u0627\u0644\u062E\u0627\u062F\u0645 \u0623\u0648 \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u0645\u0633\u0628\u0642 \u064A\u062D\u0644 \u0627\u0644\u0645\u0634\u0643\u0644\u0629.", q: "\u0623\u064A\u0646 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0646\u0635\u0643 \u0627\u0644\u0631\u0626\u064A\u0633\u064A \u0644\u0632\u0648\u0627\u062D\u0641 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A\u061F", o: ["\u0641\u064A \u0627\u0644\u0635\u0648\u0631 \u0641\u0642\u0637", "\u0641\u064A HTML \u0627\u0644\u0630\u064A \u064A\u0631\u0633\u0644\u0647 \u0627\u0644\u062E\u0627\u062F\u0645", "\u064A\u064F\u062D\u0645\u0651\u0644 \u0628\u0639\u062F \u0646\u0642\u0631\u0629"], a: 1, x: "\u0627\u0644\u0646\u0635 \u0627\u0644\u0645\u0648\u062C\u0648\u062F \u0641\u064A HTML \u0627\u0644\u0645\u064F\u0631\u0633\u0644 \u064A\u064F\u0642\u0631\u0623 \u062F\u0648\u0646 \u062A\u0634\u063A\u064A\u0644 JavaScript." },
  "l-title": { t: "\u0639\u0646\u0627\u0648\u064A\u0646 \u062A\u062C\u064A\u0628", b: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0623\u0648\u0644 \u0645\u0627 \u062A\u0642\u0631\u0624\u0647 \u0645\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0628\u062D\u062B \u0648\u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A. \u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062C\u064A\u062F \u064A\u0642\u0648\u0644 \u0645\u0627 \u0627\u0644\u0634\u064A\u0621 \u0648\u0644\u0645\u0646 \u0623\u0648 \u0623\u064A\u0646: \xAB\u062F\u0627\u0631 \u0636\u064A\u0627\u0641\u0629 \u0639\u0644\u0649 \u0628\u0639\u062F 2 \u0643\u0645 \u0645\u0646 \u0627\u0644\u0634\u0627\u0637\u0626 \u0641\u064A \u0633\u064A\u062F\u064A \u0628\u0648\u0633\u0639\u064A\u062F\xBB \u0623\u0641\u0636\u0644 \u0645\u0646 \xAB\u0645\u0631\u062D\u0628\u064B\u0627\xBB. \u0648\u0627\u0644\u0648\u0635\u0641 \u0627\u0644\u062A\u0639\u0631\u064A\u0641\u064A \u0645\u0644\u062E\u0635\u0643 \u0641\u064A \u062C\u0645\u0644\u0629 \u0648\u0627\u062D\u062F\u0629. \u0643\u0646 \u0635\u0627\u062F\u0642\u064B\u0627: \u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u062A\u0642\u0627\u0631\u0646\u0647\u0645\u0627 \u0628\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0635\u0641\u062D\u0629.", q: "\u0623\u064A \u0639\u0646\u0648\u0627\u0646 \u064A\u0633\u0627\u0639\u062F \u0623\u0643\u062B\u0631\u061F", o: ["\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629", "\u0645\u0631\u062D\u0628\u064B\u0627 \u0628\u0643\u0645 \u0641\u064A \u0645\u0648\u0642\u0639\u0646\u0627", "\u062F\u0627\u0631 \u0636\u064A\u0627\u0641\u0629 \u0639\u0627\u0626\u0644\u064A\u0629 \u0639\u0644\u0649 \u0628\u0639\u062F 2 \u0643\u0645 \u0645\u0646 \u0627\u0644\u0634\u0627\u0637\u0626 \u0641\u064A \u0633\u064A\u062F\u064A \u0628\u0648\u0633\u0639\u064A\u062F"], a: 2, x: "\u064A\u0630\u0643\u0631 \u0627\u0644\u0639\u0631\u0636 \u0648\u0627\u0644\u0645\u0643\u0627\u0646\u060C \u0648\u0647\u0630\u0627 \u0645\u0627 \u064A\u0633\u0623\u0644 \u0639\u0646\u0647 \u0627\u0644\u0646\u0627\u0633." },
  "l-structure": { t: "\u0627\u0644\u0639\u0646\u0627\u0648\u064A\u0646 \u062E\u0631\u064A\u0637\u0629", b: "\u062A\u0642\u0633\u0651\u0645 \u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0625\u0644\u0649 \u0645\u0642\u0627\u0637\u0639 \u0648\u062A\u062E\u062A\u0627\u0631 \u0627\u0644\u0645\u0642\u0637\u0639 \u0627\u0644\u0630\u064A \u064A\u062C\u064A\u0628 \u0639\u0646 \u0627\u0644\u0633\u0624\u0627\u0644. \u0648\u0627\u0644\u0639\u0646\u0627\u0648\u064A\u0646 \u0647\u064A \u0627\u0644\u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u062A\u064A \u062A\u0633\u062A\u062E\u062F\u0645\u0647\u0627. \u0639\u0646\u0648\u0627\u0646 H1 \u0648\u0627\u062D\u062F \u064A\u0642\u0648\u0644 \u0645\u0627 \u0647\u064A \u0627\u0644\u0635\u0641\u062D\u0629\u060C \u0648\u0639\u0646\u0627\u0648\u064A\u0646 H2 \u062A\u062D\u062F\u062F \u0627\u0644\u0623\u0642\u0633\u0627\u0645\u060C \u0648\u064A\u064F\u0641\u0636\u0651\u0644 \u0623\u0646 \u062A\u064F\u0635\u0627\u063A \u0645\u062B\u0644 \u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0646\u0627\u0633. \u0643\u062A\u0644\u0629 \u0646\u0635 \u0628\u0644\u0627 \u0639\u0646\u0627\u0648\u064A\u0646 \u064A\u0635\u0639\u0628 \u0627\u0644\u0627\u0642\u062A\u0628\u0627\u0633 \u0645\u0646\u0647\u0627 \u062D\u062A\u0649 \u0644\u0648 \u0627\u062D\u062A\u0648\u062A \u0643\u0644 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A.", q: "\u0643\u0645 \u0639\u0646\u0648\u0627\u0646 H1 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0641\u064A \u0627\u0644\u0635\u0641\u062D\u0629\u061F", o: ["\u0648\u0627\u062D\u062F", "\u0623\u0643\u0628\u0631 \u0639\u062F\u062F \u0645\u0645\u0643\u0646", "\u0644\u0627 \u0634\u064A\u0621"], a: 0, x: "\u0639\u0646\u0648\u0627\u0646 H1 \u0648\u0627\u062D\u062F \u064A\u0639\u0644\u0646 \u0627\u0644\u0645\u0648\u0636\u0648\u0639\u060C \u0648\u0639\u0646\u0627\u0648\u064A\u0646 H2 \u062A\u0646\u0638\u0651\u0645 \u0627\u0644\u0623\u0642\u0633\u0627\u0645." },
  "l-schema": { t: "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u0638\u0645\u0629 \u062F\u0648\u0646 \u0645\u0628\u0627\u0644\u063A\u0629", b: "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u0638\u0645\u0629 (JSON-LD) \u062A\u0635\u0648\u063A \u0627\u0644\u062D\u0642\u0627\u0626\u0642 \u0628\u0637\u0631\u064A\u0642\u0629 \u062A\u0642\u0631\u0624\u0647\u0627 \u0627\u0644\u0622\u0644\u0627\u062A: \u0627\u0633\u0645 \u0627\u0644\u0646\u0634\u0627\u0637 \u0648\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0648\u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0648\u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E. \u0648\u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0635\u0627\u0644\u062D\u0629: \u0641\u0627\u0635\u0644\u0629 \u0648\u0627\u062D\u062F\u0629 \u0646\u0627\u0642\u0635\u0629 \u062A\u062C\u0639\u0644 \u0627\u0644\u0643\u062A\u0644\u0629 \u0643\u0644\u0647\u0627 \u0645\u064F\u0647\u0645\u0644\u0629. \u062A\u0642\u0648\u0644 Google \u0625\u0646\u0647\u0627 \u0644\u064A\u0633\u062A \u0634\u0631\u0637\u064B\u0627 \u062E\u0627\u0635\u064B\u0627 \u0644\u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0648\u062A\u062D\u0630\u0651\u0631 \u0645\u0646 \u0627\u0644\u062A\u0631\u0643\u064A\u0632 \u0627\u0644\u0645\u0641\u0631\u0637 \u0639\u0644\u064A\u0647\u0627: \u0647\u064A \u0646\u0638\u0627\u0641\u0629 \u062A\u0642\u0646\u064A\u0629\u060C \u0644\u0627 \u0633\u062D\u0631.", q: "\u0643\u062A\u0644\u0629 JSON-LD \u0641\u064A\u0647\u0627 \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u0635\u064A\u0627\u063A\u0629. \u0645\u0627\u0630\u0627 \u064A\u062D\u062F\u062B\u061F", o: ["\u062A\u0635\u0644\u062D\u0647 Google", "\u062A\u064F\u0647\u0645\u0644 \u0627\u0644\u0643\u062A\u0644\u0629 \u0643\u0644\u0647\u0627", "\u064A\u064F\u0647\u0645\u0644 \u0627\u0644\u0633\u0637\u0631 \u0627\u0644\u062E\u0627\u0637\u0626 \u0641\u0642\u0637"], a: 1, x: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u0642\u0631\u0627\u0621\u0629 JSON \u063A\u064A\u0631 \u0627\u0644\u0635\u0627\u0644\u062D \u0625\u0637\u0644\u0627\u0642\u064B\u0627." },
  "l-entity": { t: "\u0643\u0646 \u0643\u064A\u0627\u0646\u064B\u0627 \u0648\u0627\u062D\u062F\u064B\u0627 \u0648\u0627\u0636\u062D\u064B\u0627", b: "\u062A\u062D\u062A\u0627\u062C \u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0625\u0644\u0649 \u0645\u0639\u0631\u0641\u0629 \u0623\u0646 \u0646\u0634\u0627\u0637\u0643 \u0627\u0644\u062A\u062C\u0627\u0631\u064A \u0643\u064A\u0627\u0646 \u0648\u0627\u062D\u062F\u060C \u0647\u0648 \u0646\u0641\u0633\u0647 \u0641\u064A \u0645\u0648\u0642\u0639\u0643 \u0648Google \u0648LinkedIn \u0648\u0627\u0644\u0623\u062F\u0644\u0629. \u062A\u0631\u0645\u064A\u0632 Organization \u0623\u0648 LocalBusiness \u0645\u0639 name \u0648url \u0648logo \u0648\u0631\u0648\u0627\u0628\u0637 sameAs \u0625\u0644\u0649 \u062D\u0633\u0627\u0628\u0627\u062A\u0643 \u064A\u0631\u0628\u0637 \u0647\u0630\u0647 \u0627\u0644\u0623\u062C\u0632\u0627\u0621. \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0627\u0633\u0645 \u0648\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0648\u0627\u0644\u0647\u0627\u062A\u0641 \u0646\u0641\u0633\u0647\u0627 \u062A\u0645\u0627\u0645\u064B\u0627 \u0641\u064A \u0643\u0644 \u0645\u0643\u0627\u0646: \u0627\u0644\u062A\u0646\u0627\u0642\u0636\u0627\u062A \u062A\u062C\u0639\u0644 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u064A\u062A\u0631\u062F\u062F \u0641\u064A \u0627\u0644\u062A\u0648\u0635\u064A\u0629 \u0628\u0643.", q: "\u0645\u0627 \u0648\u0638\u064A\u0641\u0629 \u0631\u0648\u0627\u0628\u0637 sameAs\u061F", o: ["\u062A\u0633\u0631\u064A\u0639 \u0627\u0644\u0635\u0641\u062D\u0629", "\u0631\u0628\u0637 \u0645\u0648\u0642\u0639\u0643 \u0628\u062D\u0633\u0627\u0628\u0627\u062A\u0643 \u0639\u0644\u0649 \u0623\u0646\u0647\u0627 \u0627\u0644\u0646\u0634\u0627\u0637 \u0646\u0641\u0633\u0647", "\u062A\u0631\u062C\u0645\u0629 \u0627\u0644\u0635\u0641\u062D\u0629"], a: 1, x: "\u062A\u062E\u0628\u0631 sameAs \u0627\u0644\u0622\u0644\u0627\u062A \u0623\u0646 \u0647\u0630\u0647 \u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u062A\u0635\u0641 \u0627\u0644\u0643\u064A\u0627\u0646 \u0646\u0641\u0633\u0647." },
  "l-pagetype": { t: "\u0642\u0644 \u0645\u0627 \u0647\u064A \u0627\u0644\u0635\u0641\u062D\u0629", b: "\u062A\u062D\u062A\u0627\u062C \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0625\u0644\u0649 \u0627\u0644\u0633\u0639\u0631 \u0648\u0627\u0644\u0639\u0645\u0644\u0629 \u0648\u0627\u0644\u062A\u0648\u0641\u0631 \u0643\u064A \u064A\u0642\u0627\u0631\u0646\u0647\u0627 \u0645\u0633\u0627\u0639\u062F\u0648 \u0627\u0644\u062A\u0633\u0648\u0642. \u0648\u062A\u062D\u062A\u0627\u062C \u0627\u0644\u0645\u0642\u0627\u0644\u0627\u062A \u0625\u0644\u0649 \u0627\u0644\u0643\u0627\u062A\u0628 \u0648\u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E \u0643\u064A \u064A\u062D\u0643\u0645 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0639\u0644\u0649 \u0627\u0644\u062E\u0628\u0631\u0629 \u0648\u0627\u0644\u062D\u062F\u0627\u062B\u0629. \u0627\u0644\u062A\u0631\u0645\u064A\u0632 \u0627\u0644\u0645\u0646\u0627\u0633\u0628 (Product \u0645\u0639 offers\u060C \u0648Article \u0645\u0639 \u0627\u0644\u0643\u0627\u062A\u0628 \u0648\u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E) \u064A\u0632\u064A\u0644 \u0627\u0644\u062A\u062E\u0645\u064A\u0646. \u0644\u0644\u0645\u062A\u0627\u062C\u0631: \u0627\u0644\u062D\u0642\u0627\u0626\u0642 \u0646\u0641\u0633\u0647\u0627 \u0641\u064A \u062E\u0644\u0627\u0635\u0627\u062A \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A.", q: "\u0645\u0627\u0630\u0627 \u064A\u062C\u0628 \u0623\u0646 \u064A\u062A\u0636\u0645\u0646 \u062A\u0631\u0645\u064A\u0632 \u0627\u0644\u0645\u0646\u062A\u062C \u0644\u0645\u0633\u0627\u0639\u062F\u064A \u0627\u0644\u062A\u0633\u0648\u0642\u061F", o: ["\u0644\u0648\u0646 \u0627\u0644\u0634\u0639\u0627\u0631", "offers \u0645\u0639 \u0627\u0644\u0633\u0639\u0631 \u0648\u0627\u0644\u062A\u0648\u0641\u0631", "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0635\u0641\u062D\u0629"], a: 1, x: "\u062A\u062D\u0645\u0644 offers \u0627\u0644\u0633\u0639\u0631 \u0648\u0627\u0644\u0639\u0645\u0644\u0629 \u0648\u0627\u0644\u062A\u0648\u0641\u0631." },
  "l-lang": { t: "\u0627\u0644\u0644\u063A\u0627\u062A \u0648\u0627\u0644\u0643\u062A\u0627\u0628\u0629 \u0645\u0646 \u0627\u0644\u064A\u0645\u064A\u0646 \u0625\u0644\u0649 \u0627\u0644\u064A\u0633\u0627\u0631", b: '\u0623\u0639\u0644\u0646 \u0644\u063A\u0629 \u0643\u0644 \u0635\u0641\u062D\u0629 \u0628\u0648\u0627\u0633\u0637\u0629 <html lang>\u060C \u0648\u0641\u064A \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0623\u0636\u0641 \u0623\u064A\u0636\u064B\u0627 dir="rtl". \u0648\u0627\u0631\u0628\u0637 \u0646\u0633\u062E \u0627\u0644\u0644\u063A\u0627\u062A \u0628\u0631\u0648\u0627\u0628\u0637 hreflang\u060C \u0628\u0645\u0627 \u0641\u064A\u0647\u0627 x-default \u0648\u0627\u0644\u0635\u0641\u062D\u0629 \u0646\u0641\u0633\u0647\u0627. \u0648\u0625\u0644\u0627 \u0641\u0642\u062F \u064A\u0642\u062A\u0628\u0633 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0635\u0641\u062D\u062A\u0643 \u0627\u0644\u0641\u0631\u0646\u0633\u064A\u0629 \u0644\u0645\u062A\u062D\u062F\u062B \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629\u060C \u0623\u0648 \u0644\u0627 \u064A\u0642\u062A\u0628\u0633 \u0623\u064A\u064B\u0651\u0627 \u0645\u0646\u0647\u0627. \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0643\u0644 \u0646\u0633\u062E\u0629 \u062A\u0631\u062C\u0645\u0629 \u062D\u0642\u064A\u0642\u064A\u0629 \u0644\u0627 \u0646\u0633\u062E\u0629 \u0622\u0644\u064A\u0629 \u0641\u0642\u0637.', q: "\u0645\u0627\u0630\u0627 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0639\u0644\u0646 \u0627\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0623\u064A\u0636\u064B\u0627\u061F", o: ['dir="rtl"', "\u0639\u0646\u0648\u0627\u0646 H1 \u062B\u0627\u0646\u064A\u064B\u0627", "\u062E\u0637\u064B\u0627 \u0623\u0643\u0628\u0631"], a: 0, x: 'dir="rtl" \u064A\u062D\u062F\u062F \u0627\u062A\u062C\u0627\u0647 \u0627\u0644\u0642\u0631\u0627\u0621\u0629 \u0645\u0646 \u0627\u0644\u064A\u0645\u064A\u0646 \u0625\u0644\u0649 \u0627\u0644\u064A\u0633\u0627\u0631.' },
  "l-answer": { t: "\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0623\u0648\u0644\u064B\u0627", b: "\u064A\u0633\u0645\u064A\u0647\u0627 \u0627\u0644\u0635\u062D\u0641\u064A\u0648\u0646 \u0627\u0644\u0647\u0631\u0645 \u0627\u0644\u0645\u0642\u0644\u0648\u0628\u060C \u0648\u0627\u0644\u0628\u062D\u062B \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u064A\u0643\u0627\u0641\u0626\u0647\u0627. \u0627\u0628\u062F\u0623 \u0628\u062C\u0645\u0644\u0629 \u0623\u0648 \u062C\u0645\u0644\u062A\u064A\u0646 \u062A\u062C\u064A\u0628\u0627\u0646 \u0645\u0628\u0627\u0634\u0631\u0629 \u0639\u0646 \u0627\u0644\u0633\u0624\u0627\u0644 \u0627\u0644\u0631\u0626\u064A\u0633\u064A: \u0645\u0627 \u0647\u0648\u060C \u0644\u0645\u0646\u060C \u0623\u064A\u0646\u060C \u0648\u0628\u0643\u0645. \u062B\u0645 \u062A\u0623\u062A\u064A \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644. \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0630\u064A \u064A\u0628\u062D\u062B \u0639\u0646 \u0625\u062C\u0627\u0628\u0629 \u064A\u0645\u0643\u0646\u0647 \u0623\u0646 \u064A\u0623\u062E\u0630 \u0627\u0641\u062A\u062A\u0627\u062D\u064A\u062A\u0643 \u0643\u0645\u0627 \u0647\u064A\u060C \u0623\u0645\u0627 \u0627\u0644\u0645\u0642\u062F\u0645\u0629 \u0627\u0644\u0637\u0648\u064A\u0644\u0629 \u0641\u064A\u062A\u062E\u0637\u0627\u0647\u0627.", q: "\u0645\u0627\u0630\u0627 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0641\u064A \u0623\u0648\u0644 50 \u0643\u0644\u0645\u0629\u061F", o: ["\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0634\u0631\u0643\u0629", "\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629", "\u0631\u0633\u0627\u0644\u0629 \u062A\u0631\u062D\u064A\u0628"], a: 1, x: "\u064A\u062C\u0628 \u0623\u0646 \u062A\u062C\u064A\u0628 \u0627\u0644\u0627\u0641\u062A\u062A\u0627\u062D\u064A\u0629 \u0639\u0646 \u0627\u0644\u0633\u0624\u0627\u0644 \u0627\u0644\u0631\u0626\u064A\u0633\u064A." },
  "l-quote": { t: "\u0627\u0643\u062A\u0628 \u062C\u0645\u0644\u064B\u0627 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0627\u0642\u062A\u0628\u0627\u0633", b: "\u064A\u0642\u062A\u0628\u0633 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u062C\u0645\u0644 \u0627\u0644\u062A\u064A \u064A\u0643\u0648\u0646 \u0644\u0647\u0627 \u0645\u0639\u0646\u0649 \u0648\u062D\u062F\u0647\u0627. \u062C\u0645\u0644\u0629 \xAB\u0625\u0646\u0647\u0627 \u0642\u0631\u064A\u0628\u0629 \u0645\u0646 \u0627\u0644\u0634\u0627\u0637\u0626\xBB \u0644\u0627 \u062A\u0641\u064A\u062F \u062E\u0627\u0631\u062C \u0633\u064A\u0627\u0642\u0647\u0627. \u0623\u0645\u0627 \xAB\u062A\u0642\u0639 \u062F\u0627\u0631 \u0636\u064A\u0627\u0641\u0629 \u062F\u0627\u0631 \u0646\u0648\u0631\u0629 \u0639\u0644\u0649 \u0628\u0639\u062F 2 \u0643\u0645 \u0645\u0646 \u0627\u0644\u0634\u0627\u0637\u0626 \u0641\u064A \u0633\u064A\u062F\u064A \u0628\u0648\u0633\u0639\u064A\u062F\xBB \u0641\u064A\u0645\u0643\u0646 \u0627\u0642\u062A\u0628\u0627\u0633\u0647\u0627 \u0641\u064A \u0623\u064A \u0645\u0643\u0627\u0646. \u0627\u0630\u0643\u0631 \u0627\u0644\u0641\u0627\u0639\u0644\u060C \u0648\u0623\u0636\u0641 \u0645\u0639\u0644\u0648\u0645\u0629 \u0645\u0644\u0645\u0648\u0633\u0629\u060C \u0645\u0646 8 \u0625\u0644\u0649 35 \u0643\u0644\u0645\u0629. \u0627\u0644\u062A\u0638\u0644\u064A\u0644 \u064A\u064F\u0638\u0647\u0631 \u0627\u0644\u062C\u0645\u0644 \u0627\u0644\u0646\u0627\u062C\u062D\u0629.", q: "\u0623\u064A \u062C\u0645\u0644\u0629 \u064A\u0645\u0643\u0646 \u0627\u0642\u062A\u0628\u0627\u0633\u0647\u0627 \u0648\u062D\u062F\u0647\u0627\u061F", o: ["\u0646\u062D\u0646 \u0642\u0631\u064A\u0628\u0648\u0646 \u062C\u062F\u064B\u0627 \u0645\u0646\u0647\u0627.", "\u062F\u0627\u0631\u0646\u0627 \u062A\u0642\u062F\u0645 \u0642\u064A\u0645\u0629 \u0645\u0645\u062A\u0627\u0632\u0629.", "\u062A\u0642\u0639 \u062F\u0627\u0631 \u0636\u064A\u0627\u0641\u0629 \u062F\u0627\u0631 \u0646\u0648\u0631\u0629 \u0639\u0644\u0649 \u0628\u0639\u062F 2 \u0643\u0645 \u0645\u0646 \u0627\u0644\u0634\u0627\u0637\u0626 \u0641\u064A \u0633\u064A\u062F\u064A \u0628\u0648\u0633\u0639\u064A\u062F."], a: 2, x: "\u062A\u0630\u0643\u0631 \u0627\u0644\u0641\u0627\u0639\u0644 \u0648\u062A\u0639\u0637\u064A \u0645\u0639\u0644\u0648\u0645\u0629 \u064A\u0645\u0643\u0646 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646\u0647\u0627." },
  "l-facts": { t: "\u0627\u0644\u062D\u0642\u0627\u0626\u0642 \u0648\u0627\u0644\u0645\u0635\u0627\u062F\u0631 \u062A\u0646\u062A\u0635\u0631", b: "\u0641\u064A \u062F\u0631\u0627\u0633\u0629 GEO (Aggarwal \u0648\u0622\u062E\u0631\u0648\u0646\u060C KDD 2024)\u060C \u0623\u062F\u062A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0625\u062D\u0635\u0627\u0621\u0627\u062A \u0648\u0627\u0644\u0627\u0642\u062A\u0628\u0627\u0633\u0627\u062A \u0648\u0627\u0644\u0645\u0635\u0627\u062F\u0631 \u0627\u0644\u0645\u0648\u062B\u0642\u0629 \u0625\u0644\u0649 \u0638\u0647\u0648\u0631 \u0623\u0643\u0628\u0631 \u0641\u064A \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u062A\u0648\u0644\u064A\u062F\u064A\u0629. \u0627\u0644\u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u0645\u0644\u0645\u0648\u0633\u0629 (\u0627\u0644\u0623\u0633\u0639\u0627\u0631\u060C \u0627\u0644\u0645\u0633\u0627\u0641\u0627\u062A\u060C \u0627\u0644\u0646\u062A\u0627\u0626\u062C\u060C \u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E) \u0648\u0627\u0644\u0631\u0648\u0627\u0628\u0637 \u0625\u0644\u0649 \u0645\u0635\u0627\u062F\u0631\u0647\u0627 \u062A\u062C\u0639\u0644 \u0627\u0644\u0635\u0641\u062D\u0629 \u0623\u062C\u062F\u0631 \u0628\u0627\u0644\u062B\u0642\u0629 \u0648\u0623\u0633\u0647\u0644 \u0627\u0642\u062A\u0628\u0627\u0633\u064B\u0627. \u0623\u0645\u0627 \u0627\u0644\u0645\u062F\u064A\u062D \u0627\u0644\u0645\u0628\u0647\u0645 \u0641\u064A\u0641\u0639\u0644 \u0627\u0644\u0639\u0643\u0633.", q: "\u0645\u0627 \u0627\u0644\u0630\u064A \u0631\u0641\u0639 \u0627\u0644\u0638\u0647\u0648\u0631 \u0641\u064A \u062F\u0631\u0627\u0633\u0629 GEO\u061F", o: ["\u0643\u0644\u0645\u0627\u062A \u0645\u0641\u062A\u0627\u062D\u064A\u0629 \u0623\u0643\u062B\u0631", "\u0627\u0644\u0625\u062D\u0635\u0627\u0621\u0627\u062A \u0648\u0627\u0644\u0627\u0642\u062A\u0628\u0627\u0633\u0627\u062A \u0648\u0627\u0644\u0645\u0635\u0627\u062F\u0631 \u0627\u0644\u0645\u0648\u062B\u0642\u0629", "\u0635\u0641\u062D\u0627\u062A \u0623\u0637\u0648\u0644"], a: 1, x: "\u062D\u0633\u0651\u0646\u062A \u0647\u0630\u0647 \u0627\u0644\u0623\u0633\u0627\u0644\u064A\u0628 \u0627\u0644\u0638\u0647\u0648\u0631 \u0641\u064A \u0625\u062C\u0627\u0628\u0627\u062A \u0645\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0628\u062D\u062B \u0627\u0644\u062A\u0648\u0644\u064A\u062F\u064A\u0629." },
  "l-faq": { t: "\u0623\u062C\u0628 \u0639\u0646 \u0623\u0633\u0626\u0644\u0629 \u062D\u0642\u064A\u0642\u064A\u0629", b: "\u064A\u0637\u0631\u062D \u0627\u0644\u0646\u0627\u0633 \u0623\u0633\u0626\u0644\u0629 \u0643\u0627\u0645\u0644\u0629 \u0639\u0644\u0649 \u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A: \xAB\u0647\u0644 \u064A\u0648\u062C\u062F \u0645\u0648\u0642\u0641 \u0633\u064A\u0627\u0631\u0627\u062A \u0641\u064A \u062F\u0627\u0631 \u0627\u0644\u0636\u064A\u0627\u0641\u0629\u061F\xBB \u0627\u0644\u0642\u0633\u0645 \u0627\u0644\u0630\u064A \u064A\u0637\u0631\u062D \u0627\u0644\u0633\u0624\u0627\u0644 \u0646\u0641\u0633\u0647 \u0648\u064A\u062C\u064A\u0628 \u0639\u0646\u0647 \u0647\u0648 \u0623\u0633\u0647\u0644 \u0645\u0627 \u064A\u0633\u062A\u062E\u062F\u0645\u0647 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A. \u0627\u062C\u0645\u0639 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u062A\u064A \u064A\u0637\u0631\u062D\u0647\u0627 \u0639\u0645\u0644\u0627\u0624\u0643 \u0641\u0639\u0644\u064B\u0627 (\u0631\u0633\u0627\u0626\u0644\u060C \u0645\u0643\u0627\u0644\u0645\u0627\u062A\u060C \u062A\u0642\u064A\u064A\u0645\u0627\u062A) \u0648\u0623\u062C\u0628 \u0639\u0646 \u0643\u0644 \u0645\u0646\u0647\u0627 \u0641\u064A \u062C\u0645\u0644\u062A\u064A\u0646 \u0623\u0648 \u062B\u0644\u0627\u062B. \u062A\u0631\u0645\u064A\u0632 FAQ \u0627\u062E\u062A\u064A\u0627\u0631\u064A.", q: "\u0645\u0646 \u0623\u064A\u0646 \u062A\u0623\u062A\u064A \u0623\u0641\u0636\u0644 \u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629\u061F", o: ["\u0645\u0646 \u0623\u062F\u0648\u0627\u062A \u0627\u0644\u0643\u0644\u0645\u0627\u062A \u0627\u0644\u0645\u0641\u062A\u0627\u062D\u064A\u0629 \u0641\u0642\u0637", "\u0645\u0645\u0627 \u064A\u0633\u0623\u0644\u0647 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0641\u0639\u0644\u064B\u0627", "\u0645\u0646 \u0635\u0641\u062D\u0627\u062A \u0627\u0644\u0645\u0646\u0627\u0641\u0633\u064A\u0646"], a: 1, x: "\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u062D\u0642\u064A\u0642\u064A\u0629 \u062A\u0637\u0627\u0628\u0642 \u0645\u0627 \u064A\u0643\u062A\u0628\u0647 \u0627\u0644\u0646\u0627\u0633 \u0641\u064A \u0645\u0633\u0627\u0639\u062F\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A." },
  "l-fresh": { t: "\u0623\u0638\u0647\u0631 \u0623\u0646\u0647\u0627 \u0645\u062D\u062F\u0651\u062B\u0629", b: "\u062A\u0641\u0636\u0651\u0644 \u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u062D\u062F\u064A\u062B \u0628\u0648\u0636\u0648\u062D\u060C \u062E\u0627\u0635\u0629 \u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0648\u0633\u0627\u0639\u0627\u062A \u0627\u0644\u0639\u0645\u0644 \u0648\u0627\u0644\u0639\u0631\u0648\u0636. \u0627\u0639\u0631\u0636 \xAB\u0622\u062E\u0631 \u062A\u062D\u062F\u064A\u062B \u0641\u064A \u2026\xBB \u0641\u064A \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0627\u0644\u062A\u064A \u062A\u062A\u063A\u064A\u0631\u060C \u0648\u0627\u0636\u0628\u0637 dateModified \u0639\u0646\u062F \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0641\u0639\u0644\u064A. \u0644\u0627 \u062A\u063A\u0634: \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u062F\u0648\u0646 \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u064A\u0636\u0631 \u0628\u0627\u0644\u062B\u0642\u0629.", q: "\u0645\u062A\u0649 \u062A\u063A\u064A\u0651\u0631 dateModified\u061F", o: ["\u0643\u0644 \u064A\u0648\u0645", "\u0639\u0646\u062F\u0645\u0627 \u064A\u062A\u063A\u064A\u0631 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0641\u0639\u0644\u064B\u0627", "\u0623\u0628\u062F\u064B\u0627"], a: 1, x: "\u064A\u062C\u0628 \u0623\u0646 \u062A\u0639\u0643\u0633 \u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E \u062A\u062D\u062F\u064A\u062B\u0627\u062A \u062D\u0642\u064A\u0642\u064A\u0629." },
  "l-media": { t: "\u0635\u0648\u0631 \u062A\u062A\u0643\u0644\u0645", b: "\u062A\u0630\u0643\u0631 Google \u0627\u0644\u0635\u0648\u0631 \u0648\u0627\u0644\u0641\u064A\u062F\u064A\u0648\u0647\u0627\u062A \u0639\u0627\u0644\u064A\u0629 \u0627\u0644\u062C\u0648\u062F\u0629 \u0636\u0645\u0646 \u0645\u0627 \u064A\u0633\u0627\u0639\u062F \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0641\u064A \u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0644\u062F\u064A\u0647\u0627. \u062A\u0642\u0631\u0623 \u0627\u0644\u0622\u0644\u0627\u062A \u0627\u0644\u0635\u0648\u0631 \u0639\u0628\u0631 \u0627\u0644\u0646\u0635 \u0627\u0644\u0628\u062F\u064A\u0644\u060C \u0641\u0635\u0650\u0641 \u0645\u0627 \u062A\u064F\u0638\u0647\u0631\u0647 \u0643\u0644 \u0635\u0648\u0631\u0629 \u0630\u0627\u062A \u0645\u0639\u0646\u0649 \u0628\u0644\u063A\u0629 \u0627\u0644\u0635\u0641\u062D\u0629: \xAB\u0633\u0637\u062D \u0628\u0625\u0637\u0644\u0627\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0628\u062D\u0631 \u0639\u0646\u062F \u0627\u0644\u063A\u0631\u0648\u0628\xBB\u060C \u0644\u0627 \xABIMG_2041\xBB. \u064A\u0645\u0643\u0646 \u062A\u0631\u0643 \u0627\u0644\u0646\u0635 \u0627\u0644\u0628\u062F\u064A\u0644 \u0641\u0627\u0631\u063A\u064B\u0627 \u0644\u0644\u0635\u0648\u0631 \u0627\u0644\u0632\u062E\u0631\u0641\u064A\u0629.", q: "\u0645\u0627 \u0647\u0648 \u0627\u0644\u0646\u0635 \u0627\u0644\u0628\u062F\u064A\u0644 \u0627\u0644\u062C\u064A\u062F\u061F", o: ["IMG_2041.jpg", "\u0633\u0637\u062D \u0628\u0625\u0637\u0644\u0627\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0628\u062D\u0631 \u0639\u0646\u062F \u0627\u0644\u063A\u0631\u0648\u0628", "\u0635\u0648\u0631\u0629 \u0635\u0648\u0631\u0629 \u0635\u0648\u0631\u0629"], a: 1, x: "\u064A\u0635\u0641 \u0645\u0627 \u062A\u064F\u0638\u0647\u0631\u0647 \u0627\u0644\u0635\u0648\u0631\u0629." },
  "l-agent": { t: "\u062C\u0627\u0647\u0632 \u0644\u0648\u0643\u0644\u0627\u0621 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A", b: "\u0642\u0631\u064A\u0628\u064B\u0627 \u0633\u064A\u062D\u062C\u0632 \u0648\u0643\u0644\u0627\u0621 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0648\u064A\u0634\u062A\u0631\u0648\u0646 \u0648\u064A\u0633\u062A\u0641\u0633\u0631\u0648\u0646 \u0646\u064A\u0627\u0628\u0629 \u0639\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646. \u062A\u062A\u064A\u062D WebMCP\u060C \u0648\u0647\u064A \u062A\u062C\u0631\u0628\u0629 \u0641\u064A Chrome\u060C \u0644\u0644\u0645\u0648\u0642\u0639 \u0648\u0635\u0641 \u0646\u0645\u0627\u0630\u062C\u0647 \u0644\u0644\u0648\u0643\u0644\u0627\u0621: \u0623\u0636\u0641 toolname \u0648tooldescription \u0625\u0644\u0649 \u0646\u0645\u0627\u0630\u062C \u0627\u0644\u0628\u062D\u062B \u0648\u0627\u0644\u062D\u062C\u0632 \u0648\u0627\u0644\u062A\u0648\u0627\u0635\u0644. \u0645\u0627 \u0632\u0627\u0644\u062A \u0641\u064A \u0628\u062F\u0627\u064A\u062A\u0647\u0627\u060C \u0641\u0627\u0639\u062A\u0628\u0631\u0647\u0627 \u0627\u0633\u062A\u0639\u062F\u0627\u062F\u064B\u0627 \u0644\u0644\u0645\u0633\u062A\u0642\u0628\u0644. \u0627\u0644\u0646\u0645\u0627\u0630\u062C \u0627\u0644\u0628\u0633\u064A\u0637\u0629 \u0627\u0644\u062A\u064A \u062A\u0639\u0645\u0644 \u062C\u064A\u062F\u064B\u0627 \u062A\u0633\u0627\u0639\u062F \u0627\u0644\u0648\u0643\u0644\u0627\u0621 \u0645\u0646\u0630 \u0627\u0644\u064A\u0648\u0645.", q: "\u0645\u0627\u0630\u0627 \u062A\u0635\u0641 WebMCP \u0644\u0644\u0648\u0643\u0644\u0627\u0621\u061F", o: ["\u0634\u0639\u0627\u0631\u0643", "\u0646\u0645\u0627\u0630\u062C\u0643 \u0648\u0645\u0627 \u062A\u0641\u0639\u0644\u0647", "\u0623\u0633\u0639\u0627\u0631\u0643 \u0641\u0642\u0637"], a: 1, x: "\u062A\u0639\u0631\u0636 WebMCP \u0627\u0644\u0646\u0645\u0627\u0630\u062C \u0643\u0623\u062F\u0648\u0627\u062A \u064A\u0645\u0643\u0646 \u0644\u0644\u0648\u0643\u064A\u0644 \u0627\u0633\u062A\u062F\u0639\u0627\u0624\u0647\u0627." },
  "l-agentfiles": { t: "llms.txt \u0648\u0623\u0645\u062B\u0627\u0644\u0647", b: "\u0645\u0644\u0641 llms.txt \u062E\u0631\u064A\u0637\u0629 \u0646\u0635\u064A\u0629 \u0644\u0645\u0648\u0642\u0639\u0643 \u0644\u0623\u062F\u0648\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A. \u062A\u0642\u0648\u0644 Google \u0625\u0646\u0647 \u063A\u064A\u0631 \u0636\u0631\u0648\u0631\u064A \u0644\u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0644\u062F\u064A\u0647\u0627\u060C \u0648\u0644\u0645 \u062A\u062C\u062F \u062F\u0631\u0627\u0633\u0627\u062A \u0648\u0627\u0633\u0639\u0629 \u0623\u064A \u0623\u062B\u0631 \u0644\u0647 \u0639\u0644\u0649 \u0627\u0644\u0627\u0633\u062A\u0634\u0647\u0627\u062F: \u0627\u062C\u0639\u0644\u0647 \u0627\u062E\u062A\u064A\u0627\u0631\u064A\u064B\u0627. \u0623\u0645\u0627 \u0641\u064A \u0627\u0644\u0645\u062A\u0627\u062C\u0631 \u0641\u0627\u0644\u0645\u0647\u0645 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A: Google Merchant Center \u0648\u062E\u0644\u0627\u0635\u0629 \u0627\u0644\u062A\u062C\u0627\u0631\u0629 \u0645\u0646 OpenAI \u0648\u0627\u0644\u0628\u0631\u0648\u062A\u0648\u0643\u0648\u0644\u0627\u062A \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629 (UCP \u0648ACP) \u0627\u0644\u062A\u064A \u062A\u062A\u064A\u062D \u0644\u0644\u0648\u0643\u0644\u0627\u0621 \u0625\u062A\u0645\u0627\u0645 \u0627\u0644\u0634\u0631\u0627\u0621.", q: "\u0647\u0644 \u064A\u062D\u0633\u0651\u0646 llms.txt \u0645\u0644\u062E\u0635\u0627\u062A Google \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A\u061F", o: ["\u0646\u0639\u0645\u060C \u0643\u062B\u064A\u0631\u064B\u0627", "\u0644\u0627\u060C \u062A\u0642\u0648\u0644 Google \u0625\u0646\u0647 \u063A\u064A\u0631 \u0636\u0631\u0648\u0631\u064A", "\u0644\u0644\u0645\u062A\u0627\u062C\u0631 \u0641\u0642\u0637"], a: 1, x: "\u064A\u0630\u0643\u0631 \u062F\u0644\u064A\u0644 Google \u0623\u0646 llms.txt \u063A\u064A\u0631 \u0636\u0631\u0648\u0631\u064A \u0644\u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0644\u062F\u064A\u0647\u0627." }
};

// apps/extension/src/ui/meter.ts
var CATS = ["access", "understand", "cite", "agent"];
var R = [52, 68, 84, 100];
var seen = /* @__PURE__ */ new Map();
function meter(o) {
  const size = o.size || 220;
  const key = `${o.state}|${o.url || ""}|${o.score ?? ""}|${o.cats ? CATS.map((c) => o.cats[c]).join(",") : ""}|${size}`;
  const now = Date.now();
  if (!seen.has(key)) seen.set(key, now);
  const el = now - seen.get(key);
  const rings = CATS.map((c, i) => {
    const r = R[i], C = 2 * Math.PI * r;
    const v = o.cats ? o.cats[c] : null;
    const len = v === null || v === void 0 ? 0 : C * Math.max(2, v) / 100;
    if (v === null || v === void 0) return `<circle class="track" r="${r}" />`;
    return `<circle class="track" r="${r}" />
      <circle class="arc a${i}${c === "agent" ? " opt" : ""}" r="${r}" style="stroke-dasharray:${len.toFixed(1)} ${C.toFixed(1)};--len:${len.toFixed(1)};--c:${C.toFixed(1)};animation-delay:${120 + i * 110 - el}ms"><title>${esc(T("cat." + c))}: ${v ?? "\u2013"}</title></circle>`;
  }).join("");
  const fav = o.url ? favicon(o.url) : "";
  const mono = (hostOf(o.url) || "S").slice(0, 1).toUpperCase();
  const score2 = o.score ?? null;
  const gap = o.state === "run" ? 800 : 250;
  const echo = [0, 1, 2].map((i) => `<circle r="40" style="animation-delay:${i * gap - el}ms"/>`).join("");
  return `<figure class="meter m-${o.state}" style="--size:${size}px" role="img" aria-label="${esc(o.label || (score2 !== null ? `${T("score")} ${score2}/100` : T("meter.idle")))}">
    <svg viewBox="-120 -120 240 240" aria-hidden="true">
      <g class="echo">${echo}</g>
      <g class="rings">${rings}</g>
      <circle class="core" r="36"/>
    </svg>
    <div class="face">${fav ? `<img src="${esc(fav)}" alt="" width="32" height="32">` : ""}<span class="mono">${esc(mono)}</span></div>
  </figure>`;
}
function legend(cats) {
  return `<ul class="legend">${CATS.map((c, i) => `<li title="${esc(T("cat." + c + ".d"))}"><i class="k a${i}"></i><span>${esc(T("cat." + c))}</span><b>${cats[c] ?? "\u2013"}</b></li>`).join("")}</ul>`;
}

// apps/extension/src/views/audit.ts
var LESSONS = { en: en_default4, fr: fr_default4, de: de_default4, ar: ar_default4 };
var LESSON_IDS = Object.keys(en_default4);
var W2 = { access: 4, understand: 3, cite: 2, agent: 1 };
function prio(r) {
  return r.findings.filter((f2) => (f2.status === "fail" || f2.status === "warn") && f2.evidence !== "optional").sort((a, b) => (a.status === b.status ? 0 : a.status === "fail" ? -1 : 1) || (a.evidence === b.evidence ? 0 : a.evidence === "official" ? -1 : 1) || W2[b.category] - W2[a.category]).slice(0, 3);
}
var codeBox = (code, key) => `<div class="code"><pre><code>${esc(code)}</code></pre><button class="btn ghost sm" data-act="copy:${key}">${icon("copy")}<span>${esc(T("copy"))}</span></button></div>`;
var fixBlock = (fx, i) => `<div class="fixbox"><p class="fx-t">${icon("wand-sparkles")} ${esc(T("fixk." + fx.id + ".t", fx.vars || {}))}</p><p class="fine">${esc(T("fixk." + fx.id + ".where", fx.vars || {}))}</p>${codeBox(fx.code, "fix:" + i)}</div>`;
var aiUsable = () => !pol("disableOnDeviceAI") && S.ai?.state !== "unavailable";
function rewriteBlock(f2) {
  if (!aiUsable() || !(f2.id === "answer-first" || f2.id === "quotable") || f2.status === "skip") return "";
  const st = S.rw[f2.id] || {};
  return `<div class="fixbox ai"><p class="fx-t">${icon("sparkles")} ${esc(T("rw.t"))}</p><p class="fine">${esc(T("rw.d2"))}</p>
    <button class="btn line sm" data-act="rw:${f2.id}" ${st.busy ? "disabled" : ""}>${st.busy ? icon("loader-circle", "spin") : icon("sparkles")}<span>${esc(st.busy ? T("ask.running") : T("rw.run"))}</span></button>
    ${st.status ? `<p class="fine">${esc(st.status)}</p>` : ""}${st.err ? `<div class="notice soft">${icon("info")}<div>${esc(st.err)}</div></div>` : ""}
    ${st.res ? st.res.options.map((o, i) => `<div class="code"><blockquote>${esc(o)}</blockquote><button class="btn ghost sm" data-act="copy:rw:${f2.id}:${i}">${icon("copy")}<span>${esc(T("copy"))}</span></button></div>`).join("") + `<p class="fine">${esc(T("rw.check"))} ${esc(T("ai.label"))}</p>` : ""}</div>`;
}
function findingRow(f2) {
  const open = S.open[f2.id];
  const L = LESSONS[S.lang][f2.lesson] || LESSONS.en[f2.lesson];
  return `<div class="f s-${f2.status}${open ? " open" : ""}">
    <button class="f-head" data-act="toggle:${f2.id}" aria-expanded="${open ? "true" : "false"}">
      <span class="sdot"></span><span class="f-main"><span class="f-title">${esc(T(f2.id + ".t"))}</span><span class="f-pills"><span class="stp">${esc(T("status." + f2.status))}</span><span class="ev ev-${f2.evidence}" title="${esc(T("ev." + f2.evidence + ".d"))}">${esc(T("ev." + f2.evidence))}</span></span></span>${icon("chevron-down", "chev")}</button>
    ${open ? `<div class="f-body"><p>${esc(message(S.lang, f2))}</p>
      ${f2.status !== "pass" && f2.status !== "skip" ? `<p class="fix"><b>${esc(T("fix"))}</b> ${esc(fixFor(S.lang, f2))}</p>` : ""}
      ${L ? `<p class="why"><b>${esc(T("why"))}</b> ${esc(L.b)}</p>` : ""}
      ${S.fixes.map((fx, i) => fx.for === f2.id ? fixBlock(fx, i) : "").join("")}${(f2.id === "answer-first" || f2.id === "quotable") && aiUsable() ? `<button class="link" data-act="gotools">${icon("sparkles")} ${esc(T("rw.t"))}</button>` : ""}
      <div class="f-links">${f2.id === "quotable" ? `<button class="link" data-act="heat">${icon("highlighter")} ${esc(S.heat ? T("heat.off") : T("heat.on"))}</button>` : ""}
      <button class="link" data-act="clesson:${f2.lesson}">${icon("graduation-cap")} ${esc(T("lesson"))}</button>
      <a class="link" target="_blank" rel="noopener" href="${esc(f2.source)}">${icon("external-link")} ${esc(T("source"))}</a></div></div>` : ""}
  </div>`;
}
function machineView(r) {
  let e2;
  try {
    e2 = entityFacts(parse(S.page.html), r);
  } catch {
    return "";
  }
  const row = (k, v, ok = !!v) => `<li class="${ok ? "ok" : "no"}">${icon(ok ? "circle-check" : "circle-dashed")}<span>${esc(T("mv." + k))}</span><b>${esc(String(v || T("mv.none")))}</b></li>`;
  const quotes = bestQuotes(r, 3);
  return `<section class="block" id="machine"><h2>${esc(T("mv.title"))}</h2><p class="fine">${esc(T("mv.d"))}</p>
    <ul class="facts">${row("name", e2.name)}${row("type", e2.type, e2.hasMarkup)}${row("desc", e2.description.slice(0, 120))}${row("logo", e2.logo ? "\u2713" : "")}
      ${row("phone", e2.telephone)}${row("address", e2.address)}${row("profiles", e2.sameAs.length, e2.sameAs.length >= 2)}${e2.rating ? row("rating", e2.rating) : ""}</ul>
    <h3>${esc(T("mv.quotes"))}</h3>${quotes.length ? quotes.map((q, i) => `<div class="code quote"><blockquote>${esc(q)}</blockquote><button class="btn ghost sm" data-act="copy:quote:${i}">${icon("copy")}<span>${esc(T("copy"))}</span></button></div>`).join("") : `<p class="fine">${esc(T("mv.noquotes"))}</p>`}</section>`;
}
function driveView() {
  const d = S.drive;
  if (!d) return "";
  const ic = { pass: "circle-check", warn: "triangle-alert", fail: "circle-x", info: "info" };
  return `<section class="block" id="drive"><h2>${esc(T("drive.title"))}</h2><p class="fine">${esc(T("drive.d"))}</p>
    <ul class="drive">${d.map((x) => `<li class="d-${x.status}">${icon(ic[x.status])}<div><b>${esc(T("drive." + x.id))}</b><span>${esc(T(`drive.${x.id}.${x.status}`, x.vars))}</span></div></li>`).join("")}</ul>
    ${d.some((x) => x.id === "webmcp" && x.status !== "pass") ? `<details class="snippet"><summary>${esc(T("drive.webmcp.how"))}</summary>${codeBox(`<form toolname="book_room"
      tooldescription="${T("drive.webmcp.ex")}">
  <label>Check-in <input name="checkin" type="date"
    toolparamdescription="Arrival date"></label>
  \u2026
</form>`, "webmcp")}</details>` : ""}</section>`;
}
function escCard(r) {
  if (!r.escalations.length) return "";
  const e2 = r.escalations[0];
  return `<section class="block esc ${e2.level}"><p class="esc-k">${icon(e2.level === "urgent" ? "triangle-alert" : "compass")} ${esc(T("esc.title"))}</p>
    <h2>${esc(T("esc." + e2.id))}</h2><p>${esc(T("esc." + e2.id + ".d", e2.vars))}</p>
    ${r.escalations.length > 1 ? `<ul class="more">${r.escalations.slice(1).map((x) => `<li>${esc(T("esc." + x.id))}</li>`).join("")}</ul>` : ""}
    <p class="fine">${esc(T("esc.ask"))}</p>${ctas("audit-" + e2.id, `${T("esc." + e2.id)}: ${host()}`, `${T("esc." + e2.id)}.`, true)}</section>`;
}
function progress(r) {
  const p = S.prev;
  if (!p) return `<p class="fine">${esc(T("hist.first"))}</p>`;
  const d = r.score - p.score;
  return `<p class="fine hist ${d > 0 ? "up" : d < 0 ? "down" : ""}">${esc(T(d > 0 ? "hist.up" : d < 0 ? "hist.down" : "hist.same", { d: Math.abs(d), prev: p.score, date: new Date(p.at).toLocaleDateString(S.lang) }))}</p>`;
}
function pageView() {
  const r = S.report;
  if (!r) return emptyCheck();
  const groups = ["access", "understand", "cite", "agent"].map((c) => `<div class="fgroup"><h3>${esc(T("cat." + c))}<small>${esc(T("cat." + c + ".d"))}</small></h3>` + r.findings.filter((f2) => f2.category === c && f2.status !== "skip").map(findingRow).join("") + `</div>`).join("");
  const p = prio(r);
  return `<section class="hero compact">${meter({ url: r.url, cats: r.categories, score: r.score, state: "done", size: 150 })}
      <div class="hero-txt"><p class="big ${band(r.score)}"><b>${r.score}</b><span>/100</span></p><p class="lead">${esc(T(r.score >= 75 ? "score.high" : r.score >= 50 ? "score.mid" : "score.low"))}</p>${progress(r)}</div>
      ${legend(r.categories)}</section>
    <div class="toolbar"><button class="btn line sm" data-act="${S.remote ? "checkurl:" + esc(r.url) : "check"}" ${S.busy ? "disabled" : ""}>${icon("refresh-cw")}<span>${esc(S.busy ? T("checking") : T("btn.recheck"))}</span></button>
      ${S.remote ? `<button class="btn line sm" data-act="check">${icon("file-text")}<span>${esc(T("audit.backopen"))}</span></button>` : `<button class="btn line sm${S.heat ? " on" : ""}" data-act="heat">${icon("highlighter")}<span>${esc(S.heat ? T("heat.off") : T("heat.short"))}</span></button>`}
      <button class="btn line sm" data-act="export">${icon("download")}<span>${esc(T("export.short"))}</span></button></div>
    ${S.heatInfo?.supported ? `<p class="fine legend-heat"><i class="hl good"></i>${esc(T("heat.good"))} <i class="hl almost"></i>${esc(T("heat.almost"))}</p>` : ""}
    ${S.remote ? `<div class="notice soft">${icon("info")}<div>${esc(T("audit.remote"))}</div></div>` : ""}
    ${p.length ? `<section class="block"><h2>${esc(T("found.prio"))}</h2>${p.map(findingRow).join("")}</section>` : ""}
    ${escCard(r)}
    ${!aiUsable() ? "" : `<section class="block tools"><h2>${icon("sparkles")} ${esc(T("rw.tools"))}</h2><p class="fine">${esc(T("rw.tools.d"))}</p>
      ${["answer-first", "quotable"].map((id) => {
    const f2 = r.findings.find((x) => x.id === id);
    return f2 ? `<div class="tool"><div><b>${esc(T(id + ".t"))}</b><span class="stp s-${f2.status}">${esc(T("status." + f2.status))}</span></div>${rewriteBlock(f2)}</div>` : "";
  }).join("")}</section>`}
    ${driveView()}
    ${machineView(r)}
    <section class="block"><h2>${esc(T("found.all"))}</h2>${groups}</section>`;
}
function emptyCheck() {
  return `<section class="empty">${icon("scan-search", "xl")}<h2>${esc(T("audit.empty"))}</h2><p>${esc(T("audit.empty.d"))}</p>
    <button class="btn primary" data-act="check" ${S.busy ? "disabled" : ""}>${icon(S.busy ? "loader-circle" : "scan-search", S.busy ? "spin" : "")}<span>${esc(S.busy ? T("checking") : T("btn.check"))}</span></button>
    ${S.err ? `<div class="notice">${icon("info")}<div>${esc(T(S.err))}${S.err === "hint.icon" ? `<p><button class="link" data-act="allowall">${esc(T("btn.allowAll"))}</button></p>${staleBar() ? "" : safeCard()}` : ""}</div></div>` : ""}</section>`;
}
function siteView() {
  if (!S.report) return emptyCheck();
  const x = S.site;
  let out = `<section class="block"><h2>${esc(T("site.title"))}</h2><p class="fine">${esc(T("site.d", { n: SITE_MAX }))}</p>
    <button class="btn primary" data-act="scan" ${S.siteBusy ? "disabled" : ""}>${icon(S.siteBusy ? "loader-circle" : "layers", S.siteBusy ? "spin" : "")}<span>${esc(S.siteBusy ? T("site.busy") : x ? T("site.again") : T("site.run", { n: SITE_MAX }))}</span></button>
    ${S.siteErr ? `<div class="notice">${icon("info")}<div>${esc(T(S.siteErr))}</div></div>` : ""}</section>`;
  if (!x) return out;
  const s = x.sum;
  out += `<section class="block"><div class="site-head"><p class="big ${band(s.avg)}"><b>${s.avg}</b><span>/100</span></p><div><p class="lead">${esc(T("site.avg", { n: s.n, total: x.total || s.n }))}</p><p class="fine">${esc(T(x.source === "sitemap" ? "site.src.map" : "site.src.links"))}</p></div></div>
    <div class="bands"><span class="b-ok" style="flex:${s.bands.high || 0.01}">${s.bands.high}</span><span class="b-warn" style="flex:${s.bands.mid || 0.01}">${s.bands.mid}</span><span class="b-bad" style="flex:${s.bands.low || 0.01}">${s.bands.low}</span></div>
    <p class="fine bands-l"><i class="k ok"></i>${esc(T("site.band.high"))} <i class="k warn"></i>${esc(T("site.band.mid"))} <i class="k bad"></i>${esc(T("site.band.low"))}</p>
    ${s.common.length ? `<h3>${esc(T("site.common"))}</h3><ul class="common">${s.common.map((c) => `<li><span>${esc(T(c.id + ".t"))}</span><b>${esc(T("site.pages", { n: c.fail + c.warn, of: s.n }))}</b><div class="bar"><i style="width:${Math.round((c.fail + c.warn) / s.n * 100)}%"></i></div></li>`).join("")}</ul>` : ""}
    <h3>${esc(T("site.weak"))}</h3><ol class="weak">${s.weakest.map((w) => `<li><a target="_blank" rel="noopener" href="${esc(w.url)}">${esc(w.title || new URL(w.url).pathname)}</a><b class="${band(w.score)}">${w.score}</b><button class="btn ghost sm" data-act="checkurl:${esc(w.url)}">${esc(T("site.checkpage"))}</button></li>`).join("")}</ol>
    ${x.failed ? `<p class="fine">${esc(T("site.failed", { n: x.failed }))}</p>` : ""}
    <button class="btn line sm" data-act="sitecsv">${icon("download")}<span>${esc(T("site.csv"))}</span></button></section>`;
  return out + `<section class="block pro-cta"><p>${esc(T("site.pro"))}</p>${ctas("site", `${T("site.pro.subj")}: ${host()}`, T("site.note", { n: s.n, avg: s.avg, total: x.total }), true)}</section>`;
}
function rivalView() {
  const r = S.report;
  if (!r) return emptyCheck();
  const c = S.cmp;
  let res = "";
  if (c) {
    const st = (rep, id) => rep.findings.find((f2) => f2.id === id)?.status;
    const good = (x) => x === "pass";
    const bad = (x) => x === "warn" || x === "fail";
    const ahead = c.findings.filter((f2) => f2.evidence !== "optional" && good(f2.status) && bad(st(r, f2.id))).map((f2) => f2.id);
    const behind = r.findings.filter((f2) => f2.evidence !== "optional" && good(f2.status) && bad(st(c, f2.id))).map((f2) => f2.id);
    const cats = ["access", "understand", "cite", "agent"];
    const row = (label, a, b) => `<tr><th>${esc(label)}</th><td class="${a !== null && b !== null && a > b ? "win" : ""}">${a ?? "\u2013"}</td><td class="${a !== null && b !== null && b > a ? "win" : ""}">${b ?? "\u2013"}</td></tr>`;
    const side = (rep) => `<div class="side">${meter({ url: rep.url, cats: rep.categories, score: rep.score, state: "done", size: 110 })}<p class="big ${band(rep.score)}"><b>${rep.score}</b><span>/100</span></p><span class="fine">${esc(new URL(rep.url).host.replace(/^www\./, ""))}</span></div>`;
    res = `<div class="duel">${side(r)}<span class="vs">vs</span>${side(c)}</div>
      <table class="cmp"><thead><tr><th></th><th>${esc(new URL(r.url).host.replace(/^www\./, ""))}</th><th>${esc(new URL(c.url).host.replace(/^www\./, ""))}</th></tr></thead><tbody>
      ${row(T("score"), r.score, c.score)}${cats.map((k) => row(T("cat." + k), r.categories[k], c.categories[k])).join("")}</tbody></table>
      ${ahead.length ? `<h3>${esc(T("cmp.ahead"))}</h3><ul class="ticks bad">${ahead.map((id) => `<li>${esc(T(id + ".t"))}</li>`).join("")}</ul>` : ""}
      ${behind.length ? `<h3>${esc(T("cmp.yours"))}</h3><ul class="ticks ok">${behind.map((id) => `<li>${esc(T(id + ".t"))}</li>`).join("")}</ul>` : ""}
      <div class="pro-cta inline"><p>${esc(T("cmp.pro"))}</p>${ctas("rival", `${T("cmp.pro.subj")}: ${host()} / ${new URL(c.url).hostname}`, T("cmp.note", { you: r.score, them: c.score, other: c.url }), true)}</div>`;
  }
  return `<section class="block"><h2>${esc(T("cmp.title"))}</h2><p class="fine">${esc(T("cmp.d"))}</p>
    <label class="field"><span>${esc(T("cmp.url"))}</span><input id="cmpurl" type="url" placeholder="https://" value="${esc(S.cmpUrl)}"></label>
    <button class="btn primary" data-act="compare" ${S.cmpBusy ? "disabled" : ""}>${icon(S.cmpBusy ? "loader-circle" : "swords", S.cmpBusy ? "spin" : "")}<span>${esc(S.cmpBusy ? T("checking") : T("cmp.run"))}</span></button>
    ${S.cmpErr ? `<div class="notice">${icon("info")}<div>${esc(T(S.cmpErr))}</div></div>` : ""}${res}</section>`;
}
function viewAudit() {
  const modes = ["page", "site", "rival"].filter((k) => !(k === "site" && pol("disableSiteScan")) && !(k === "rival" && pol("disableRival")));
  if (!modes.includes(S.audit)) S.audit = "page";
  const seg = modes.map((k) => `<button role="tab" aria-selected="${S.audit === k}" class="${S.audit === k ? "on" : ""}" data-act="amode:${k}">${icon(k === "page" ? "file-text" : k === "site" ? "layers" : "swords")}<span>${esc(T("audit." + k))}</span></button>`).join("");
  return `<div class="seg" role="tablist">${seg}</div>` + (S.audit === "site" ? siteView() : S.audit === "rival" ? rivalView() : pageView());
}
async function heat() {
  S.heat = !S.heat;
  try {
    if (S.heat) {
      await chrome.scripting.insertCSS({ target: { tabId: S.tabId }, css: "::highlight(sada-good){background-color:rgba(20,184,166,.32)}::highlight(sada-almost){background-color:rgba(242,169,0,.30)}" });
      await chrome.scripting.executeScript({ target: { tabId: S.tabId }, files: ["overlay.js"] });
    }
    const [r] = await chrome.scripting.executeScript({ target: { tabId: S.tabId }, func: (on, l) => window.__sadaHeat?.(on, l), args: [S.heat, (S.report?.lang || "en").slice(0, 2)] });
    S.heatInfo = r?.result || null;
    if (S.heat) gain(5, T("xp.heat"), "heat:" + (S.report?.url || ""));
  } catch {
    S.heat = false;
    S.err = "hint.icon";
  }
  render();
}
function weakText(r, id) {
  if (id === "answer-first") return r.model.firstParagraph || r.model.paragraphs[0] || "";
  const weak = r.model.sentences.filter((x) => !x.quotable && x.text.length > 30).sort((a, b) => b.score - a.score);
  return (weak.length ? weak : r.model.sentences.filter((x) => x.text.length > 30)).slice(0, 4).map((x) => x.text).join("\n");
}
async function doRewrite(id) {
  const r = S.report;
  const text = weakText(r, id);
  if (!text) return;
  S.rw[id] = { busy: true };
  render();
  try {
    const res = await rewrite({
      kind: id === "answer-first" ? "answer" : "quote",
      text,
      context: `${r.model.title}. ${r.model.metaDescription}`,
      lang: r.lang.slice(0, 2),
      onProgress: (p) => {
        S.rw[id].status = T("ask.status.dl", { p: Math.round(p * 100) });
        render();
      }
    });
    S.rw[id] = { res };
  } catch (e2) {
    S.rw[id] = { err: String(e2?.message) === "nomodel" ? T("ai.none") : String(e2?.message || e2) };
  }
  render();
}
async function scanSite() {
  warmAi(prepareModel);
  S.siteBusy = true;
  S.siteErr = "";
  render();
  try {
    const s = await readSite();
    S.site = siteResult(s.x, s.reports, s.failed);
    gain(10, T("xp.site"), "site:" + (S.report ? new URL(S.report.url).origin : ""));
  } catch (e2) {
    const m = String(e2?.message || e2);
    S.siteErr = m === "site.none" ? m : /Cannot access|permission|host/i.test(m) ? "hint.icon" : "site.none";
  }
  S.siteBusy = false;
  render();
}
function siteCsv() {
  const x = S.site;
  if (!x) return;
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["url", "title", "score", "access", "understanding", "citability", "issues"].join(","),
    ...x.reports.map((r) => [r.url, r.title, r.score, r.cats.access, r.cats.understand, r.cats.cite, r.issues.join(" ")].map(q).join(","))
  ];
  download(`sada-site-${host()}-${today()}.csv`, "\uFEFF" + rows.join("\n"), "text/csv");
}
async function compare() {
  const raw = document.getElementById("cmpurl").value.trim();
  let u;
  try {
    u = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw);
  } catch {
    S.cmpErr = "cmp.bad";
    render();
    return;
  }
  S.cmpUrl = u.href;
  const ok = await chrome.permissions.request({ origins: [`${u.protocol}//${u.hostname}/*`] });
  if (!ok) {
    S.cmpErr = "cmp.denied";
    render();
    return;
  }
  save({ cmpUrl: u.href });
  S.cmpBusy = true;
  S.cmpErr = "";
  S.cmp = null;
  render();
  const get = async (url, ms = 9e3) => {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), ms);
    netLog([url], "rival");
    try {
      const r = await fetch(url, { signal: ctl.signal, credentials: "omit", cache: "no-store" });
      return { status: r.status, type: r.headers.get("content-type") || "", xr: r.headers.get("x-robots-tag") || "", text: r.ok ? (await r.text()).slice(0, 15e5) : "", url: r.url };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
  try {
    const [pg, rb, ll] = await Promise.all([get(u.href), get(u.origin + "/robots.txt", 5e3), get(u.origin + "/llms.txt", 5e3)]);
    if (!pg || !pg.text || !/html/i.test(pg.type)) throw new Error("cmp.fail");
    const robots = rb ? rb.status < 400 && !/html/i.test(rb.type) ? { status: rb.status, text: rb.text } : { status: rb.status >= 400 ? rb.status : 404 } : null;
    S.cmp = audit({
      url: pg.url || u.href,
      html: pg.text,
      rawHtml: pg.text,
      headers: pg.xr ? { "x-robots-tag": pg.xr } : {},
      robots,
      llms: ll ? { status: ll.status < 400 && !/html/i.test(ll.type) ? ll.status : 404 } : null,
      at: (/* @__PURE__ */ new Date()).toISOString()
    }, parse);
    gain(10, T("xp.rival"), "rival:" + u.host);
  } catch {
    S.cmpErr = "cmp.fail";
  }
  S.cmpBusy = false;
  render();
}
function exportReport() {
  const r = S.report;
  const rows = r.findings.filter((f2) => f2.status !== "skip").map((f2) => `<tr class="${f2.status}"><td>${esc(T("cat." + f2.category))}</td><td><b>${esc(T(f2.id + ".t"))}</b><br>${esc(message(S.lang, f2))}${f2.status === "warn" || f2.status === "fail" ? `<br><i>${esc(fixFor(S.lang, f2))}</i>` : ""}</td><td>${esc(T("status." + f2.status))}</td></tr>`).join("");
  const html = `<!doctype html><html lang="${S.lang}" dir="${S.lang === "ar" ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${esc(T("rep.title"))} \xB7 ${esc(host())}</title>
<style>body{font:14px/1.55 system-ui,sans-serif;color:#13203A;max-width:880px;margin:32px auto;padding:0 16px}table{width:100%;border-collapse:collapse;margin-top:16px}td{border-bottom:1px solid #E3E7EE;padding:8px;vertical-align:top}tr.fail td:nth-child(3){color:#D64545;font-weight:700}tr.warn td:nth-child(3){color:#C98200;font-weight:700}tr.pass td:nth-child(3){color:#1F9D63}.score{font-size:48px;font-weight:800;margin:8px 0}.muted{color:#5B6578}a{color:#0F766E}pre{background:#F6F7F9;padding:12px;border-radius:8px;overflow:auto;white-space:pre-wrap;font-size:12px}</style></head>
<body><h1>${esc(T("rep.title"))}</h1><p class="muted">${esc(r.url)} \xB7 ${esc(new Date(r.at).toLocaleString(S.lang))}</p><p class="score">${r.score}/100</p>
<p>${["access", "understand", "cite", "agent"].map((c) => `${esc(T("cat." + c))}: <b>${r.categories[c] ?? "\u2013"}</b>`).join(" &nbsp; ")}</p>
<table>${rows}</table>${S.fixes.map((fx) => `<h3>${esc(T("fixk." + fx.id + ".t", fx.vars || {}))}</h3><p class="muted">${esc(T("fixk." + fx.id + ".where", fx.vars || {}))}</p><pre>${esc(fx.code)}</pre>`).join("")}
<p class="muted">${esc(T("rep.by"))} \xB7 <a href="https://getayka.com/">getayka.com</a></p></body></html>`;
  download(`sada-${host() || "page"}-${r.at.slice(0, 10)}.html`, html, "text/html");
}
async function copy(v) {
  const [kind, a, b] = v.split(":");
  const r = S.report;
  const text = kind === "sbio" ? S.social?.bio?.text : kind === "fix" ? S.fixes[Number(a)]?.code : kind === "quote" ? bestQuotes(r, 3)[Number(a)] : kind === "rw" ? S.rw[a]?.res?.options[Number(b)] : kind === "webmcp" ? `<form toolname="book_room" tooldescription="${T("drive.webmcp.ex")}">` : "";
  if (text) await copyText(text);
}
var auditActs = {
  amode: (v) => {
    S.audit = v;
    render();
  },
  check: () => runCheck(S.tabId || void 0),
  gotools: () => document.querySelector(".tools")?.scrollIntoView({ behavior: "smooth" }),
  checkurl: async (v) => {
    S.audit = "page";
    render();
    window.scrollTo(0, 0);
    await checkUrl(v);
  },
  toggle: (v) => {
    S.open[v] = !S.open[v];
    render();
  },
  heat: () => heat(),
  rw: (v) => doRewrite(v),
  scan: () => scanSite(),
  sitecsv: () => siteCsv(),
  compare: () => compare(),
  export: () => exportReport(),
  copy: (v) => copy(v),
  allowall: async () => {
    const ok = await chrome.permissions.request({ origins: ["https://*/*", "http://*/*"] });
    if (ok) {
      S.allSites = true;
      refreshTab();
    }
    else flash(T("perm.denied"));
  }
};

// apps/extension/src/views/academy.ts
// Academy 2026 v2: 13 tracks, 65 lessons (lib/academy). Quote and schema games and level names stay from 0.3.
var acaMerge = (old, nu) => ({ ...old, tracks: nu.tracks.map((t2) => ({ ...t2, lessons: t2.lessons.map((l) => ({ ...l, srcs: ACA_SRC[l.id] || [] })) })), facts: nu.facts, ui: nu.ui });
var AC = { en: acaMerge(en_default3, ACA_EN), fr: acaMerge(fr_default3, ACA_FR), de: acaMerge(de_default3, ACA_DE), ar: acaMerge(ar_default3, ACA_AR) };
var acUi = () => ac().ui || ACA_EN.ui;
var confTag = (c) => c ? `<span class="conf conf-${c.toLowerCase()}" title="${esc(acUi().confD[c])}">${esc(acUi().conf[c])}</span>` : "";
var missed = () => Object.keys(S.done).filter((k) => k.startsWith("miss:") && S.done[k]).map((k) => k.slice(5));
var ac = () => AC[S.lang] || AC.en;
var lessonsAll = () => ac().tracks.flatMap((t2) => t2.lessons.map((l) => ({ ...l, track: t2.id })));
var SCHEMA = [
  { lines: ["{", '  "@context": "https://schema.org",', '  "@type": "LocalBusiness",', '  name: "Dar Noura",', '  "telephone": "+216 00 000 000"', "}"], bad: 3 },
  { lines: ["{", '  "@context": "https://schema.org",', '  "@type": "Business",', '  "name": "Dar Noura",', '  "url": "https://example.com/"', "}"], bad: 2 },
  { lines: ["{", '  "@context": "https://schema.org",', '  "@type": "Restaurant",', '  "name": "Le Petit Port",', '  "openingHours": "We are open most days, call us"', "}"], bad: 4 },
  { lines: ["{", '  "@context": "https://schema.org",', '  "@type": "Organization",', '  "name": "Atlas Studio",', '  "sameAs": ["@atlasstudio", "atlas_studio"]', "}"], bad: 4 },
  { lines: ["{", '  "@context": "https://schema.org",', '  "@type": "Hotel",', '  "name": "Dar Noura",', '  "url": "https://example.com/",', "}"], bad: 4 },
  { lines: ["{", '  "@context": "https://schema.org",', '  "@type": "LocalBusiness",', '  "name": "Dar Noura",', '  "priceRange": 85', "}"], bad: 4 }
];
var shuffle = (a) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};
function home() {
  const lv = level();
  const names = ac().levels;
  const doneAll = lessonsAll().filter((l) => S.done[l.id]).length;
  const drillDone = S.done["drill:" + today()];
  const games = [
    ["bots", "shield-check"],
    ["quote", "quote"],
    ["myth", "lightbulb"],
    ["schema", "file-code"]
  ].map(([g, ic]) => `<button class="game g-${g}" data-act="game:${g}">${icon(ic)}<b>${esc(T("game." + g))}</b><span>${esc(T("game." + g + ".d"))}</span></button>`).join("");
  const tracks = ac().tracks.map((t2) => {
    const d = t2.lessons.filter((l) => S.done[l.id]).length;
    return `<li><button data-act="track:${t2.id}">${icon(t2.icon)}<div><b>${esc(t2.t)}</b><span>${esc(t2.d)}</span></div><span class="prog" aria-label="${d}/${t2.lessons.length}">${t2.lessons.map((l) => `<i class="${S.done[l.id] ? "on" : ""}"></i>`).join("")}</span></button></li>`;
  }).join("");
  return `<section class="xpbar">
      <div class="lvl"><span class="badge">${lv.i + 1}</span><div><b>${esc(names[lv.i])}</b><span>${esc(T("ac.xp", { xp: S.xp, next: lv.next }))}</span></div></div>
      <div class="streak${S.streak.day === today() ? " on" : ""}" title="${esc(T("ac.streak.d"))}">${icon("flame")}<b>${S.streak.n || 0}</b></div>
      <div class="xpline"><i style="width:${lv.pct}%"></i></div></section>
    <button class="drill${drillDone ? " done" : ""}" data-act="drill">${icon(drillDone ? "circle-check" : "timer")}<div><b>${esc(T(drillDone ? "ac.drill.done" : "ac.drill"))}</b><span>${esc(T("ac.drill.d"))}</span></div>${icon("chevron-right", "chev")}</button>
    ${missed().length ? `<button class="drill review" data-act="review">${icon("history")}<div><b>${esc(acUi().review)}</b><span>${esc(acUi().reviewD.replace("{n}", missed().length))}</span></div>${icon("chevron-right", "chev")}</button>` : ""}
    <section class="block"><h2>${esc(T("ac.play"))}</h2><div class="games">${games}</div></section>
    <section class="block"><div class="h-row"><h2>${esc(T("ac.tracks"))}</h2><span class="sub">${esc(T("ac.done", { n: doneAll, of: lessonsAll().length }))}</span></div><ul class="tracks">${tracks}</ul>
      <p class="fine">${icon("book-open")} ${esc(acUi().checked)}: ${esc(new Date(ACA_DATE).toLocaleDateString(S.lang, { dateStyle: "long" }))}</p></section>
    <details class="block libwrap"><summary><div><h2>${esc(T("ac.library"))}</h2><p class="fine">${esc(T("ac.library.d"))}</p></div>${icon("chevron-down", "chev")}</summary>
      <ul class="lib">${LESSON_IDS.map((id) => `<li><button data-act="clesson:${id}">${icon(S.done[id] ? "circle-check" : "book-open")}<span>${esc((LESSONS[S.lang][id] || LESSONS.en[id]).t)}</span></button></li>`).join("")}</ul></details>
    <section class="block pro-cta"><h2>${esc(T("ac.team"))}</h2><p>${esc(T("ac.team.d"))}</p>
      <a class="btn sun" target="_blank" rel="noopener" href="mailto:hello@getayka.com?subject=${encodeURIComponent(T("ac.team.subj"))}">${icon("graduation-cap")}<span>${esc(T("ac.team.cta"))}</span></a></section>`;
}
function trackView(id) {
  const t2 = ac().tracks.find((x) => x.id === id);
  return `<button class="back" data-act="achome">${icon("chevron-left")}<span>${esc(T("tab.academy"))}</span></button>
    <section class="block track-head">${icon(t2.icon, "xl")}<h1>${esc(t2.t)}</h1><p class="lead">${esc(t2.d)}</p></section>
    <ol class="lessons">${t2.lessons.map((l, i) => `<li><button data-act="lesson:${l.id}"><span class="n">${i + 1}</span><div><b>${esc(l.t)}</b><span>${confTag(l.conf)} ${esc(acUi().mins)}</span></div>${icon(S.done[l.id] ? "circle-check" : "chevron-right", S.done[l.id] ? "ok" : "chev")}</button></li>`).join("")}</ol>`;
}
var TRY = { social: "tab:agent", myth: "game:myth", mission: "go:agent", audit: "go:audit", heat: "go:heat", bots: "game:bots", quote: "game:quote", machine: "go:machine", drive: "go:drive", rewrite: "go:audit", ask: "go:ask", pack: "go:agent" };
function lessonView() {
  const st = S.ac;
  const l = lessonsAll().find((x) => x.id === st.lesson);
  if (!l) return home();
  const n = l.cards.length;
  const step = st.step || 0;
  let body;
  if (step < n) {
    body = `<div class="lcard" aria-live="polite"><span class="lc-n">${step + 1}/${n}</span><p>${esc(l.cards[step])}</p></div>
      <div class="lnav">${step > 0 ? `<button class="btn ghost" data-act="lstep:${step - 1}">${icon("chevron-left")}<span>${esc(T("ac.prev"))}</span></button>` : "<span></span>"}
      <button class="btn primary" data-act="lstep:${step + 1}"><span>${esc(step === n - 1 ? T("ac.toquiz") : T("ac.next"))}</span>${icon("chevron-right")}</button></div>`;
  } else {
    const picked = st.picked ?? -1;
    const order = st.order || [0, 1, 2];
    body = `<div class="quiz"><p class="q">${esc(l.quiz.q)}</p><div class="opts">${order.map((i) => `<button class="opt${picked >= 0 && i === l.quiz.a ? " right" : ""}${picked === i && i !== l.quiz.a ? " wrong" : ""}" data-act="lpick:${i}" ${picked >= 0 ? "disabled" : ""}>${esc(l.quiz.o[i])}</button>`).join("")}</div>
      ${picked >= 0 ? `<div class="verdict ${picked === l.quiz.a ? "ok" : "bad"}">${icon(picked === l.quiz.a ? "circle-check" : "circle-x")}<div><b>${esc(T(picked === l.quiz.a ? "learn.right" : "learn.wrong"))}</b><p>${esc(l.quiz.why)}</p></div></div>
        ${l.do ? `<div class="dobox${S.done["do:" + l.id] ? " done" : ""}"><button class="tick" role="checkbox" aria-checked="${!!S.done["do:" + l.id]}" data-act="ldo:${l.id}">${S.done["do:" + l.id] ? icon("check") : ""}</button><div><b>${esc(acUi().do)}</b><p>${esc(l.do)}</p></div></div>` : ""}
        <div class="try">${icon("target")}<div><b>${esc(T("ac.try"))}</b><p>${esc(l.try === "social" ? acUi().trySocial : l.try === "myth" ? T("game.myth.d") : T("try." + l.try))}</p></div><button class="btn line sm" data-act="${TRY[l.try] || "go:agent"}">${esc(T("ac.try.go"))}</button></div>
        ${l.srcs?.length ? `<details class="lsrc"><summary>${icon("book-open")} ${esc(acUi().sources)} (${l.srcs.length})</summary><ul>${l.srcs.map((x) => `<li>${x.u ? `<a target="_blank" rel="noopener" href="${esc(x.u)}">${esc(x.t)}</a>` : esc(x.t)} <small>${esc(x.d)}</small></li>`).join("")}</ul></details>` : l.src ? `<p class="fine lsrc">${icon("book-open")} ${esc(T("source"))}: <a target="_blank" rel="noopener" href="${esc(l.src.u)}">${esc(l.src.t)}</a></p>` : ""}
        <div class="lnav"><button class="btn ghost" data-act="track:${l.track}">${icon("chevron-left")}<span>${esc(T("ac.back"))}</span></button>${nextLesson(l.id) ? `<button class="btn primary" data-act="lesson:${nextLesson(l.id)}"><span>${esc(T("learn.next"))}</span>${icon("chevron-right")}</button>` : ""}</div>` : ""}</div>`;
  }
  return `<button class="back" data-act="track:${l.track}">${icon("chevron-left")}<span>${esc(ac().tracks.find((t2) => t2.id === l.track).t)}</span></button>
    <section class="block lesson"><h1>${esc(l.t)}</h1><p class="lconf">${confTag(l.conf)} <span class="fine">${esc(acUi().confD[l.conf] || "")}</span></p><div class="lprog">${[...Array(n + 1)].map((_, i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}</div>${body}</section>`;
}
function nextLesson(id) {
  const all = lessonsAll();
  const i = all.findIndex((x) => x.id === id);
  return all[i + 1]?.id || "";
}
function checkLessonView() {
  const id = S.ac.check;
  const l = LESSONS[S.lang][id] || LESSONS.en[id];
  const picked = S.ac.picked ?? -1;
  return `<button class="back" data-act="achome">${icon("chevron-left")}<span>${esc(T("tab.academy"))}</span></button>
    <section class="block lesson"><h1>${esc(l.t)}</h1><div class="lcard"><p>${esc(l.b)}</p></div>
    <div class="quiz"><p class="q">${esc(l.q)}</p><div class="opts">${l.o.map((o, i) => `<button class="opt${picked >= 0 && i === l.a ? " right" : ""}${picked === i && i !== l.a ? " wrong" : ""}" data-act="cpick:${i}" ${picked >= 0 ? "disabled" : ""}>${esc(o)}</button>`).join("")}</div>
    ${picked >= 0 ? `<div class="verdict ${picked === l.a ? "ok" : "bad"}">${icon(picked === l.a ? "circle-check" : "circle-x")}<div><b>${esc(T(picked === l.a ? "learn.right" : "learn.wrong"))}</b><p>${esc(l.x)}</p></div></div>` : ""}</div></section>`;
}
function deck(kind) {
  const A = ac();
  if (kind === "bots") return shuffle(BOTS).slice(0, 8).map((b) => ({ s: b.ua, sub: b.owner, ok: b.role === "search" ? 0 : 1, why: T(b.role === "search" ? "g.bots.search" : "g.bots.train", { ua: b.ua }), src: b.source }));
  if (kind === "quote") return shuffle(A.quotes).slice(0, 8).map((q) => ({ s: q.s, ok: q.ok ? 0 : 1, why: q.why, score: scoreSentence(q.s, S.lang) }));
  if (kind === "myth") {
    const core = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({ s: T(`myth.${i}.m`), f: false, why: T(`myth.${i}.f`) }));
    return shuffle([...A.facts, ...core]).slice(0, 8).map((x) => ({ s: x.s, ok: x.f ? 0 : 1, why: x.why }));
  }
  return shuffle(SCHEMA.map((p, i) => ({ ...p, why: A.schema[i] }))).slice(0, 5);
}
var CHOICES = { bots: ["g.keep", "g.block"], quote: ["g.quotable", "g.notquotable"], myth: ["g.fact", "g.myth"] };
function gameView() {
  const g = S.game;
  const item = g.items[g.i];
  const total = g.items.length;
  if (!item) {
    return `<button class="back" data-act="achome">${icon("chevron-left")}<span>${esc(T("tab.academy"))}</span></button>
      <section class="block gameover">${icon(g.score === total ? "trophy" : "medal", "xl")}<h1>${esc(T("g.score", { n: g.score, of: total }))}</h1><p class="lead">${esc(T(g.score === total ? "g.perfect" : g.score >= total / 2 ? "g.good" : "g.retry"))}</p>
      <div class="lnav"><button class="btn ghost" data-act="achome">${esc(T("ac.back"))}</button><button class="btn primary" data-act="game:${g.kind}">${icon("shuffle")}<span>${esc(T("g.again"))}</span></button></div></section>`;
  }
  const answered = g.picked !== void 0 && g.picked !== null;
  let card, opts;
  if (g.kind === "schema") {
    card = `<p class="g-ask">${esc(T("g.schema.ask"))}</p><div class="codepick">${item.lines.map((ln, i) => `<button class="${answered && i === item.bad ? "right" : ""}${answered && g.picked === i && i !== item.bad ? " wrong" : ""}" data-act="gpick:${i}" ${answered ? "disabled" : ""}><span>${i + 1}</span><code>${esc(ln)}</code></button>`).join("")}</div>`;
    opts = "";
  } else {
    card = `<p class="g-ask">${esc(T("g." + g.kind + ".ask"))}</p><div class="g-card"><p>${esc(item.s)}</p>${item.sub ? `<span>${esc(item.sub)}</span>` : ""}</div>`;
    opts = `<div class="g-opts">${CHOICES[g.kind].map((k, i) => `<button class="opt big${answered && i === item.ok ? " right" : ""}${answered && g.picked === i && i !== item.ok ? " wrong" : ""}" data-act="gpick:${i}" ${answered ? "disabled" : ""}>${icon(i === 0 ? "thumbs-up" : "thumbs-down")}<span>${esc(T(k))}</span></button>`).join("")}</div>`;
  }
  const right = g.kind === "schema" ? g.picked === item.bad : g.picked === item.ok;
  return `<button class="back" data-act="achome">${icon("chevron-left")}<span>${esc(T("tab.academy"))}</span></button>
    <section class="block game-run"><div class="h-row"><h1>${esc(T("game." + g.kind))}</h1><span class="sub">${g.i + 1}/${total} \xB7 ${icon("star")} ${g.score}</span></div>
      ${g.kind === "bots" ? `<p class="fine">${esc(T("g.bots.goal"))}</p>` : ""}
      ${card}${opts}
      ${answered ? `<div class="verdict ${right ? "ok" : "bad"}">${icon(right ? "circle-check" : "circle-x")}<div><b>${esc(T(right ? "learn.right" : "learn.wrong"))}</b><p>${esc(item.why)}</p>${item.src ? `<a class="fine" target="_blank" rel="noopener" href="${esc(item.src)}">${esc(T("source"))}</a>` : ""}</div></div>
        <button class="btn primary" data-act="gnext"><span>${esc(g.i + 1 < total ? T("ac.next") : T("g.finish"))}</span>${icon("chevron-right")}</button>` : ""}
    </section>`;
}
function drillView() {
  const d = S.ac.drill;
  const it = d.items[d.i];
  if (!it) {
    return `<section class="block gameover">${icon("flame", "xl")}<h1>${esc(T("g.score", { n: d.score, of: d.items.length }))}</h1><p class="lead">${esc(T("ac.drill.end", { n: S.streak.n }))}</p>
      <button class="btn primary" data-act="achome">${esc(T("ac.back"))}</button></section>`;
  }
  const picked = d.picked ?? -1;
  return `<button class="back" data-act="achome">${icon("chevron-left")}<span>${esc(T("tab.academy"))}</span></button>
    <section class="block lesson"><div class="h-row"><h1>${esc(T("ac.drill"))}</h1><span class="sub">${d.i + 1}/${d.items.length}</span></div>
    <div class="quiz"><p class="q">${esc(it.quiz.q)}</p><div class="opts">${it.order.map((i) => `<button class="opt${picked >= 0 && i === it.quiz.a ? " right" : ""}${picked === i && i !== it.quiz.a ? " wrong" : ""}" data-act="dpick:${i}" ${picked >= 0 ? "disabled" : ""}>${esc(it.quiz.o[i])}</button>`).join("")}</div>
    ${picked >= 0 ? `<div class="verdict ${picked === it.quiz.a ? "ok" : "bad"}">${icon(picked === it.quiz.a ? "circle-check" : "circle-x")}<div><p>${esc(it.quiz.why)}</p></div></div><button class="btn primary" data-act="dnext"><span>${esc(T("ac.next"))}</span>${icon("chevron-right")}</button>` : ""}</div></section>`;
}
function viewAcademy() {
  const v = S.ac.view;
  if (v === "track") return trackView(S.ac.track);
  if (v === "lesson") return lessonView();
  if (v === "check") return checkLessonView();
  if (v === "game" && S.game) return gameView();
  if (v === "drill" && S.ac.drill) return drillView();
  return home();
}
var top = () => window.scrollTo(0, 0);
var academyActs = {
  achome: () => {
    S.ac = { view: "home" };
    S.game = null;
    render();
    top();
  },
  track: (v) => {
    S.ac = { view: "track", track: v };
    render();
    top();
  },
  lesson: (v) => {
    S.tab = "academy";
    S.settings = false;
    S.ac = { view: "lesson", lesson: v, step: 0, picked: null, order: shuffle([0, 1, 2]) };
    render();
    top();
  },
  lstep: (v) => {
    S.ac.step = Number(v);
    render();
  },
  lpick: (v) => {
    S.ac.picked = Number(v);
    const l = lessonsAll().find((x) => x.id === S.ac.lesson);
    if (Number(v) !== l.quiz.a) {
      S.done["miss:" + l.id] = true;
      save({ done: S.done });
    } else if (S.done["miss:" + l.id]) {
      delete S.done["miss:" + l.id];
      save({ done: S.done });
    }
    if (Number(v) === l.quiz.a && !S.done[l.id]) {
      S.done[l.id] = true;
      save({ done: S.done });
      gain(30, T("xp.lesson"));
    } else render();
  },
  ldo: (v) => {
    const k = "do:" + v;
    S.done[k] = !S.done[k];
    save({ done: S.done });
    if (S.done[k]) gain(20, acUi().doDone, k, { ever: true });
    else render();
  },
  review: () => {
    const ids = missed();
    const items = shuffle(lessonsAll().filter((l) => ids.includes(l.id))).slice(0, 8).map((l) => ({ id: l.id, quiz: l.quiz, order: shuffle([0, 1, 2]) }));
    if (!items.length) {
      flash(acUi().reviewNone);
      return;
    }
    S.ac = { view: "drill", drill: { items, i: 0, score: 0, picked: null, review: true } };
    render();
    top();
  },
  clesson: (v) => {
    S.tab = "academy";
    S.settings = false;
    S.ac = { view: "check", check: v, picked: null };
    render();
    top();
  },
  cpick: (v) => {
    S.ac.picked = Number(v);
    const l = LESSONS.en[S.ac.check];
    if (Number(v) === l.a && !S.done[S.ac.check]) {
      S.done[S.ac.check] = true;
      save({ done: S.done });
      gain(15, T("xp.lesson"));
    } else render();
  },
  game: (v) => {
    S.tab = "academy";
    S.settings = false;
    S.game = { kind: v, items: deck(v), i: 0, score: 0, picked: null };
    S.ac = { view: "game" };
    render();
    top();
  },
  gpick: (v) => {
    const g = S.game, it = g.items[g.i];
    g.picked = Number(v);
    const right = g.kind === "schema" ? g.picked === it.bad : g.picked === it.ok;
    if (right) {
      g.score++;
      gain(5, "", "game:" + g.kind, { cap: 10 });
    } else render();
  },
  gnext: () => {
    S.game.i++;
    S.game.picked = null;
    render();
  },
  drill: () => {
    const miss = missed();
    const pool = [...shuffle(lessonsAll().filter((l) => miss.includes(l.id))).slice(0, 2), ...shuffle(lessonsAll().filter((l) => !miss.includes(l.id)))];
    const items = pool.slice(0, 5).map((l) => ({ id: l.id, quiz: l.quiz, order: shuffle([0, 1, 2]) }));
    S.ac = { view: "drill", drill: { items, i: 0, score: 0, picked: null } };
    render();
    top();
  },
  dpick: (v) => {
    const d = S.ac.drill, it = d.items[d.i];
    d.picked = Number(v);
    if (d.picked === it.quiz.a) {
      d.score++;
      if (it.id && S.done["miss:" + it.id]) {
        delete S.done["miss:" + it.id];
        save({ done: S.done });
      }
    } else if (it.id) {
      S.done["miss:" + it.id] = true;
      save({ done: S.done });
    }
    render();
  },
  dnext: () => {
    const d = S.ac.drill;
    d.i++;
    d.picked = null;
    if (d.i >= d.items.length && !d.review && !S.done["drill:" + today()]) {
      S.done["drill:" + today()] = true;
      save({ done: S.done });
      gain(40, T("xp.drill"));
    } else render();
  }
};

// apps/extension/src/mission.ts
var STEPS = ["read", "access", "entity", "scan", "questions", "coverage", "drive", "pack"];
var withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
async function runMission() {
  if (S.mission?.running) return;
  warmAi(prepareModel);
  const steps = STEPS.map((id) => ({ id, status: "wait", detail: "" }));
  S.mission = { running: true, steps, origin: "", url: "", at: (/* @__PURE__ */ new Date()).toISOString(), result: null };
  S.pack = null;
  render();
  const set = (i, status, detail = "", vars = {}) => {
    steps[i] = { id: steps[i].id, status, detail: detail ? T(detail, vars) : steps[i].detail };
    render();
  };
  try {
    set(0, "run", "ms.read.run");
    const r = await runCheck(S.tabId || void 0);
    if (!r) {
      set(0, "fail", S.err === "hint.icon" ? "ms.read.perm" : "ms.read.fail");
      throw new Error("stop");
    }
    S.mission.origin = new URL(r.url).origin;
    S.mission.url = r.url;
    set(0, "ok", "ms.read.ok", { score: r.score, words: r.model.words });
    set(1, "run", "ms.access.run");
    const bots = botAccess(S.page, r);
    const search = bots.filter((b) => b.role === "search");
    const open = search.filter((b) => b.allowed).length;
    const blocked = r.findings.some((f2) => (f2.id === "indexable" || f2.id === "ai-bots") && f2.status === "fail");
    set(1, blocked ? "fail" : open < search.length ? "warn" : "ok", blocked ? "ms.access.blocked" : "ms.access.ok", { n: open, of: search.length });
    set(2, "run", "ms.entity.run");
    const doc = parse(S.page.html);
    const ent = entityFacts(doc, r);
    let profile2 = profileFor(r, S.page);
    const own = ownProfile(new URL(r.url).origin);
    if (own) profile2 = finalize({ ...profile2, ...own });
    S.brand = profile2.name || S.brand;
    set(2, ent.hasMarkup ? "ok" : "warn", "ms.entity.ok", { name: profile2.name, cat: profile2.category, place: profile2.place || T("ms.entity.noplace") });
    set(3, "run", "ms.scan.run");
    let site = null;
    let pass = passages({ url: r.url, title: r.model.title, blocks: blocksOf(doc) });
    try {
      if (pol("disableSiteScan")) throw new Error("policy");
      const s = await readSite();
      site = siteResult(s.x, s.reports, s.failed);
      S.site = site;
      pass = [];
      for (const d of s.docs) pass.push(...passages({ url: d.url, title: d.title, blocks: blocksOf(d.doc) }));
      if (!own) {
        try {
          const richer = profileFor(r, S.page, s.docs);
          if (richer.name === profile2.name || richer.confidence.name >= profile2.confidence.name) profile2 = richer;
        } catch {}
      }
      if (!pass.length) pass = passages({ url: r.url, title: r.model.title, blocks: blocksOf(doc) });
      set(3, site.sum.avg >= 60 ? "ok" : "warn", "ms.scan.ok", { n: site.sum.n, avg: site.sum.avg });
    } catch {
      set(3, "warn", "ms.scan.fail");
    }
    set(4, "run", "ms.q.run");
    let extra = [];
    const ai = pol("disableOnDeviceAI") ? { state: "unavailable", route: "none" } : await aiStatus(profile2.lang).catch(() => ({ state: "unavailable", route: "none" }));
    S.ai = ai;
    if (ai.state === "available") {
      try {
        extra = await withTimeout(moreQuestions(aiPrompt(profile2), profile2.lang), 3e4);
      } catch {
        extra = [];
      }
    }
    S.brand = profile2.name || S.brand;
    const qs = predict(profile2, extra);
    set(4, "ok", extra.length ? "ms.q.ok.ai" : "ms.q.ok", { n: qs.length, ai: qs.filter((q) => q.by === "ai").length });
    set(5, "run", "ms.cov.run", { n: pass.length });
    const cov = coverage(qs, pass, profile2);
    const a = cov.filter((c) => c.status === "answered").length, p = cov.filter((c) => c.status === "partial").length;
    set(5, a >= cov.length * 0.6 ? "ok" : "warn", "ms.cov.ok", { a, p, m: cov.length - a - p });
    set(6, "run", "ms.drive.run");
    const dr = drive(doc, r, S.page);
    S.drive = dr;
    const ok = dr.filter((d) => d.status === "pass").length;
    set(6, dr.some((d) => d.status === "fail") ? "warn" : "ok", "ms.drive.ok", { n: ok, of: dr.length });
    set(7, "run", "ms.pack.run");
    const plan = makePlan({ report: r, site: site?.sum || null, coverage: cov, drive: dr });
    const drafts = {};
    const gaps = cov.filter((c) => c.status !== "answered").slice(0, 4);
    if (ai.state === "available") {
      for (const g of gaps) {
        try {
          const facts2 = g.best ? [g.best.text, ...pass.filter((x) => x.url === g.best.url && x !== g.best && x.text.length > 60).slice(0, 2).map((x) => x.text)] : [];
          drafts[g.q.id] = "[" + T("pack.aidraft") + "]\n" + await withTimeout(draftAnswer({ question: g.q.text, facts: facts2, name: profile2.name, lang: profile2.lang }), 45e3);
          set(7, "run", "ms.pack.draft", { n: Object.keys(drafts).length, of: gaps.length });
        } catch {
        }
      }
    }
    const files = buildPack({
      t: (k, v) => k.startsWith("plan.") ? PT(k.slice(5).replace(/\.d$/, ""), v, k.endsWith(".d") ? ".d" : "") : T(k, v),
      lang: S.lang,
      doc,
      report: r,
      input: S.page,
      profile: profile2,
      coverage: cov,
      drive: dr,
      plan,
      drafts,
      pages: site?.reports?.map((x) => ({ url: x.url, score: x.score, issues: x.issues.join(" ") })),
      date: today(),
      aiNote: T(Object.keys(drafts).length ? "pack.note.ai" : "pack.note.tpl")
    });
    S.pack = { files, at: Date.now() };
    set(7, "ok", "ms.pack.ok", { n: files.length });
    const trimmed = cov.map((c) => ({ q: c.q, status: c.status, fit: c.fit, best: c.best ? { url: c.best.url, heading: c.best.heading, text: c.best.text.slice(0, 320) } : null }));
    S.mission.result = {
      profile: profile2,
      questions: qs,
      coverage: trimmed,
      drive: dr,
      plan,
      score: r.score,
      cats: r.categories,
      ai: ai.state,
      site: site ? { n: site.sum.n, avg: site.sum.avg, bands: site.sum.bands, common: site.sum.common, total: site.total } : null,
      title: r.model.title,
      v: 2
    };
    gain(50, T("xp.mission"), "mission:" + new URL(r.url).origin);
  } catch (e2) {
    if (String(e2?.message) !== "stop") steps.forEach((s, i) => {
      if (s.status === "run") set(i, "fail", "ms.err");
    });
  } finally {
    S.mission.running = false;
    S.mission.steps = steps;
    if (S.mission.result) {
      S.missions[S.mission.origin] = { ...S.mission, running: false, pack: S.pack };
      const keys = Object.keys(S.missions);
      if (keys.length > 12) delete S.missions[keys[0]];
      save({ missions: S.missions, brand: S.brand });
    }
    render();
  }
}
function packZip() {
  return zip(S.pack?.files || []);
}

// apps/extension/src/views/trust.ts
var PROMISES = [["browser", "lock"], ["noai", "brain"], ["nosend", "shield-check"], ["readonly", "eye"], ["noact", "mouse-pointer-click"], ["open", "file-code"]];
var PERMS = ["activeTab", "scripting", "sidePanel", "storage", "contextMenus", "favicon", "alarms", "notifications", "clipboardRead", "sites"];
var POLICIES = ["disableAssistantLinks", "disableRival", "disableSiteScan", "disableOnDeviceAI", "hideContactOffers"];
function trustStrip() {
  return `<button class="trust-strip" data-act="trust">${icon("shield-check")}<span>${esc(T("trust.strip"))}</span>${icon("chevron-right", "chev")}</button>`;
}
function viewTrust() {
  const net = S.net;
  const by = /* @__PURE__ */ new Map();
  for (const x of net) {
    const k = hostOf(x.url) + "|" + x.why;
    const v = by.get(k) || { n: 0, why: x.why };
    v.n++;
    by.set(k, v);
  }
  const rows = [...by.entries()].map(([k, v]) => `<li><span>${esc(k.split("|")[0])}</span><small>${esc(T("trust.why." + v.why))}</small><b>${v.n}</b></li>`).join("");
  const reqs = net.filter((x) => x.why !== "assistant").length;
  const tabs = net.filter((x) => x.why === "assistant").length;
  const managed = POLICIES.filter((p) => pol(p));
  const stored = { missions: Object.keys(S.missions).length, answers: Object.values(S.runs).flatMap((x) => Object.values(x).flatMap((y) => Object.values(y))).length, lessons: Object.keys(S.done).length };
  return `<button class="back" data-act="trust">${icon("chevron-left")}<span>${esc(T("set.back"))}</span></button>
    <section class="block trust-hero">${icon("shield-check", "xl")}<h1>${esc(T("trust.title"))}</h1><p class="lead">${esc(T("trust.lead"))}</p>
      ${managed.length ? `<p class="managed">${icon("building-2")} ${esc(T("trust.managed", { n: managed.length }))}</p>` : ""}</section>
    <section class="block"><h2>${esc(T("trust.promises"))}</h2><ul class="promises">${PROMISES.map(([k, ic]) => `<li>${icon(ic)}<div><b>${esc(T("trust.p." + k))}</b><span>${esc(T("trust.p." + k + ".d"))}</span></div></li>`).join("")}</ul></section>
    <section class="block live"><h2>${esc(T("trust.live"))}</h2>
      <div class="zero"><p class="big ok"><b>0</b></p><p>${esc(T("trust.zero"))}</p></div>
      <p class="fine">${esc(T("trust.live.d", { n: reqs, t: tabs }))}</p>
      ${rows ? `<ul class="netlog">${rows}</ul>` : `<p class="fine">${esc(T("trust.none"))}</p>`}
      <p class="fine">${icon("search")} ${esc(T("trust.verify"))}</p></section>
    <section class="block"><h2>${esc(T("trust.perms"))}</h2><ul class="perms">${PERMS.map((p) => `<li><code>${esc(p === "sites" ? T("trust.perm.sites.n") : p)}</code><span>${esc(T("trust.perm." + p))}</span></li>`).join("")}</ul></section>
    <section class="block"><h2>${esc(T("trust.stored"))}</h2><p>${esc(T("trust.stored.d", stored))}</p>
      <button class="btn line sm" data-act="reset">${icon("trash-2")}<span>${esc(T("set.reset"))}</span></button></section>
    <section class="block it"><h2>${icon("building-2")} ${esc(T("trust.it"))}</h2><p>${esc(T("trust.it.d"))}</p>
      <ul class="pols">${POLICIES.map((p) => `<li><code>${p}</code><span>${esc(T("pol." + p))}</span><b class="${pol(p) ? "on" : ""}">${esc(T(pol(p) ? "pol.on" : "pol.off"))}</b></li>`).join("")}</ul>
      <a class="btn line sm" target="_blank" rel="noopener" href="${REPO}/blob/main/docs/IT-REVIEW.md">${icon("file-text")}<span>${esc(T("trust.it.doc"))}</span></a>
      <p class="fine">Sada ${VERSION} \xB7 Apache-2.0 \xB7 ${esc(T("trust.it.build"))}</p></section>`;
}

// apps/extension/src/views/ask.ts
var DEFAULT_ENGINES = ["chatgpt", "aimode", "perplexity", "gemini"];
var origin = () => S.mission?.origin || originOf(S.report?.url);
var runsFor = () => S.runs[origin()] ||= {};
function profile() {
  const o = origin();
  const own = ownProfile(o);
  if (own) return own;
  if (S.mission?.result?.v === 2 && S.mission.origin === o) return S.mission.result.profile;
  const r = S.report;
  if (!r || !S.page) return null;
  if (!S._pcache || S._pcache.url !== r.url) {
    let p = null;
    try { p = profileFor(r, S.page); } catch (e2) { console.warn(e2); }
    S._pcache = { url: r.url, p };
  }
  return S._pcache.p;
}
function questions() {
  const o = origin();
  const p = profile();
  const custom = (S.customQ[o] || []).map((text) => ({ id: text, text, intent: "discover", aspect: "none", branded: false, by: "sada" }));
  let base = [];
  if (S.mission?.result?.v === 2 && S.mission.origin === o && !ownProfile(o)) base = S.mission.result.questions;
  else if (p) base = predict(p);
  return [...custom, ...base.map((q) => ({ ...q, id: q.text }))];
}
function sel() {
  const o = origin();
  if (!S.askSel || S.askSel.o !== o) {
    const qs = questions();
    S.askSel = { o, q: qs.filter((q, i) => i < 5 || S.customQ[o]?.includes(q.text)).map((q) => q.id), e: [...DEFAULT_ENGINES] };
  }
  return S.askSel;
}
function profileCard(p) {
  const o = origin();
  const ok = !!ownProfile(o);
  const kindName = (k) => KIND_LABEL[k]?.[S.lang] || KIND_LABEL[k]?.en || k;
  if (S.editProfile) {
    const f2 = (id, label, v, ph = "") => `<label class="field"><span>${esc(T(label))}</span><input id="${id}" value="${esc(v)}" placeholder="${esc(ph)}"></label>`;
    return `<section class="block about edit"><h2>${esc(T("ab.title"))}</h2><p class="fine">${esc(T("ab.edit.d"))}</p>
      ${f2("pf-name", "ab.name", p.name)}
      <label class="field"><span>${esc(T("ab.kind"))}</span><select id="pf-kind">${KINDS.map((k) => `<option value="${k}" ${p.kind === k ? "selected" : ""}>${esc(kindName(k))}</option>`).join("")}</select></label>
      ${f2("pf-cat", "ab.cat", p.customCategory || p.category, T("ab.cat.ph"))}${f2("pf-svc", "ab.svc", p.services.join(", "), T("ab.svc.ph"))}
      ${f2("pf-aud", "ab.aud", p.audience || "", T("ab.aud.ph"))}${f2("pf-mkt", "ab.mkt", p.market || p.place || "", T("ab.mkt.ph"))}
      <div class="row2"><button class="btn primary" data-act="pfsave">${icon("check")}<span>${esc(T("ab.save"))}</span></button><button class="btn ghost" data-act="pfedit">${esc(T("ab.cancel"))}</button></div></section>`;
  }
  const qLang = { en: "English", fr: "Fran\xE7ais", de: "Deutsch", ar: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629" }[p.lang] || p.lang;
  return `<section class="block about${ok ? "" : " unconfirmed"}">
    <div class="h-row"><h2>${esc(T("ab.title"))}</h2>${ok ? `<span class="tag you">${icon("check")} ${esc(T("ab.confirmed"))}</span>` : ""}</div>
    <p class="about-line"><b>${esc(p.name)}</b> <span>${esc(p.category)}</span>${p.place ? ` <span>${icon("map")} ${esc(p.place)}</span>` : ""} <span>${icon("languages")} ${esc(qLang)}</span></p>
    ${p.aliases?.length ? `<p class="fine">${esc(T("ab.aka"))}: ${esc(p.aliases.slice(0, 2).join(" \xB7 "))}</p>` : ""}
    ${p.services.length ? `<div class="chips">${p.services.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div>` : ""}
    ${p.audience ? `<p class="fine">${esc(T("ab.aud"))}: ${esc(p.audience)}</p>` : ""}
    ${ok ? `<button class="link" data-act="pfedit">${icon("settings")} ${esc(T("ab.change"))}</button>` : `<p class="ask-ok">${esc(T("ab.q"))}</p><div class="row2"><button class="btn primary sm" data-act="pfyes">${icon("check")}<span>${esc(T("ab.yes"))}</span></button><button class="btn line sm" data-act="pfedit">${icon("settings")}<span>${esc(T("ab.fix"))}</span></button></div>`}
  </section>`;
}
function dots(qid) {
  const r = runsFor()[qid] || {};
  return `<span class="edots">${ENGINES.map((e2) => {
    const x = r[e2.id];
    return `<i class="${x ? x.named ? "y" : "n" : ""}" title="${esc(e2.name)}"></i>`;
  }).join("")}</span>`;
}
function setup(qs) {
  const s = sel();
  const n = s.q.filter((id) => qs.some((q) => q.id === id)).length * s.e.length;
  const list = S.qAll ? qs : qs.filter((q, i) => i < 6 || s.q.includes(q.id));
  return `<section class="block setup">
    <h2>${esc(T("ap.pick"))}</h2>
    <ul class="qpick">${list.map((q) => `<li><button class="${s.q.includes(q.id) ? "on" : ""}" role="checkbox" aria-checked="${s.q.includes(q.id)}" data-act="qtoggle:${esc(q.id)}">
      <span class="box">${s.q.includes(q.id) ? icon("check") : ""}</span><span class="qt">${esc(q.text)}<small>${esc(T(q.branded ? "q.branded" : "q.open"))}</small></span>${dots(q.id)}</button></li>`).join("")}</ul>
    <div class="row2">${qs.length > 6 ? `<button class="link" data-act="qall">${icon(S.qAll ? "chevron-down" : "plus")} ${esc(S.qAll ? T("lab.fewer") : T("lab.all", { n: qs.length }))}</button>` : ""}</div>
    <form class="addq"><input id="newq" placeholder="${esc(T("lab.addq"))}"><button class="btn line sm" data-act="addq">${icon("plus")}<span>${esc(T("lab.add"))}</span></button></form>
    <h2 class="mt">${esc(T("ap.engines"))}</h2>
    <div class="echips">${ENGINES.map((e2) => `<button class="${s.e.includes(e2.id) ? "on" : ""}" aria-pressed="${s.e.includes(e2.id)}" data-act="etoggle:${e2.id}">${s.e.includes(e2.id) ? icon("check") : ""}${esc(e2.name)}</button>`).join("")}</div>
    <button class="btn primary lg wide" data-act="apstart" ${n ? "" : "disabled"}>${icon("play")}<span>${esc(T("ap.start", { n }))}</span></button>
    <ol class="how3"><li>${icon("external-link")}<span>${esc(T(pol("disableAssistantLinks") ? "ap.how1.copy" : "ap.how1"))}</span></li><li>${icon("copy")}<span>${esc(T("ap.how2"))}</span></li><li>${icon("zap")}<span>${esc(T("ap.how3"))}</span></li></ol>
  </section>`;
}
function pilot() {
  const a = S.auto;
  const item = a.queue[a.i];
  const e2 = ENGINES.find((x) => x.id === item.eng);
  const last = a.last;
  return `<section class="block pilot" aria-live="polite">
    <div class="h-row"><h2>${icon("zap")} ${esc(T("ap.title"))}</h2><span class="sub">${esc(T("ap.count", { n: a.i + 1, of: a.queue.length }))}</span></div>
    <div class="bar big"><i style="width:${pct(a.i, a.queue.length)}%"></i></div>
    <p class="pilot-eng">${esc(e2.name)}</p>
    <blockquote class="theq">${esc(item.q)}</blockquote>
    <p class="fine">${esc(T(e2.prefill && !pol("disableAssistantLinks") ? "ap.wait" : "ap.wait.paste", { engine: e2.name }))}</p>
    <button class="btn sunlike lg wide" data-act="autopaste">${icon("clipboard-paste")}<span>${esc(T("ap.paste"))}</span></button>
    <p class="fine center">${esc(T("ap.or"))}</p>
    <details class="manual"><summary>${esc(T("ap.manual"))}</summary>
      <textarea id="ptext" rows="4" placeholder="${esc(T("lab.paste"))}">${esc(S.pasteText)}</textarea>
      <button class="btn line sm" data-act="readans">${icon("scan-search")}<span>${esc(T("lab.read"))}</span></button></details>
    <div class="pilot-act"><button class="btn ghost sm" data-act="apreopen">${icon("refresh-cw")}<span>${esc(T("ap.reopen"))}</span></button>
      <button class="btn ghost sm" data-act="apskip">${icon("chevron-right")}<span>${esc(T("ap.skip"))}</span></button>
      <button class="btn ghost sm" data-act="apstop">${icon("x")}<span>${esc(T("ap.stop"))}</span></button></div>
    ${last ? verdict(last) : ""}
  </section>`;
}
function verdict(v) {
  const e2 = ENGINES.find((x) => x.id === v.engine);
  return `<div class="verdict ${v.named ? "ok" : "bad"}">${icon(v.named ? "circle-check" : "circle-x")}<div>
    <b>${esc((e2 ? e2.name + ": " : "") + (v.named ? v.rank ? T("lab.v.rank", { brand: S.brand, n: v.rank, of: v.others.length + 1 }) : T("lab.v.named", { brand: S.brand }) : T("lab.v.not", { brand: S.brand })))}</b>
    ${v.excerpt ? `<p>\u201C${esc(v.excerpt)}\u201D</p>` : ""}
    ${v.others.length ? `<p class="fine">${esc(T("lab.v.others"))}</p><div class="chips">${v.others.slice(0, 6).map((o) => `<span class="chip">${esc(o)}</span>`).join("")}</div>` : ""}
    ${v.domains.length ? `<p class="fine">${esc(T("lab.v.src"))}</p><div class="chips">${v.domains.slice(0, 6).map((d) => `<span class="chip src">${esc(d)}</span>`).join("")}</div>` : ""}
    ${!v.named && v.others.length && !pol("hideContactOffers") ? `<p class="nudge">${esc(T("lab.nudge", { comp: v.others[0] }))} <a target="_blank" rel="noopener" href="${esc(bookUrl("lab-why", T("lab.nudge.note", { comp: v.others[0], q: v.q || "" })))}">${esc(T("lab.nudge.cta"))}</a></p>` : ""}
  </div></div>`;
}
function board(qs) {
  const all = runsFor();
  const list = Object.values(all).flatMap((x) => Object.values(x));
  if (!list.length) return "";
  const named = list.filter((x) => x.named).length;
  const comp = /* @__PURE__ */ new Map(), src = /* @__PURE__ */ new Map();
  for (const x of list) {
    for (const n of x.others || []) comp.set(n, (comp.get(n) || 0) + 1);
    for (const d of x.domains || []) src.set(d, (src.get(d) || 0) + 1);
  }
  const top3 = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const tc = top3(comp), ts = top3(src);
  const max = (m) => Math.max(1, ...m.map((x) => x[1]));
  const used = ENGINES.filter((e2) => list.some((x) => x.engine === e2.id));
  const rows = qs.filter((q) => all[q.id]).map((q) => `<tr><th>${esc(q.text)}</th>${used.map((e2) => {
    const x = all[q.id]?.[e2.id];
    return `<td>${x ? `<i class="${x.named ? "y" : "n"}" title="${esc(x.named ? T("lab.named") : T("lab.notnamed"))}"></i>` : ""}</td>`;
  }).join("")}</tr>`).join("");
  return `<section class="block board"><div class="h-row"><h2>${esc(T("lab.board"))}</h2><button class="btn ghost sm" data-act="labcsv">${icon("download")}<span>CSV</span></button></div>
    <div class="share"><p class="big ${named / list.length >= 0.5 ? "ok" : named ? "warn" : "bad"}"><b>${pct(named, list.length)}%</b></p><p class="lead">${esc(T("lab.share", { n: named, of: list.length }))}</p></div>
    ${rows ? `<div class="mx"><table><thead><tr><th></th>${used.map((e2) => `<th>${esc(e2.name)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>` : ""}
    ${tc.length ? `<h3>${esc(T("lab.comp"))}</h3><ul class="rank">${tc.map(([n, c]) => `<li><span>${esc(n)}</span><i style="--w:${pct(c, max(tc))}%"></i><b>${c}</b></li>`).join("")}</ul>` : ""}
    ${ts.length ? `<h3>${esc(T("lab.src"))}</h3><p class="fine">${esc(T("lab.src.d"))}</p><ul class="rank src">${ts.map(([n, c]) => `<li><a target="_blank" rel="noopener" href="https://${esc(n)}">${esc(n)}</a><i style="--w:${pct(c, max(ts))}%"></i><b>${c}</b></li>`).join("")}</ul>
      <button class="btn line sm" data-act="copysrc">${icon("copy")}<span>${esc(T("lab.src.copy"))}</span></button>` : ""}
    <p class="fine">${esc(T("lab.honest"))}</p></section>`;
}
function viewAsk() {
  const p = profile();
  if (!p) return `<section class="empty">${icon("message-circle", "xl")}<h2>${esc(T("lab.empty"))}</h2><p>${esc(T("lab.empty.d"))}</p>
    <button class="btn primary" data-act="check">${icon("scan-search")}<span>${esc(T("btn.check"))}</span></button></section>`;
  if (!S.brand) S.brand = p.name;
  const qs = questions();
  const running = S.auto?.running;
  return `<section class="lab-head"><h1>${esc(T("lab.title"))}</h1><p class="lead">${esc(T("lab.lead2"))}</p></section>
    ${running ? pilot() : profileCard(p) + (S.auto?.done ? `<div class="notice ok-n">${icon("circle-check")}<div>${esc(T("ap.done", { n: S.auto.done }))}</div></div>` : "") + setup(qs)}
    ${board(qs)}
    ${!running && aiUsable() ? `<details class="block quick"${S.sim || S.simBusy || S.simErr ? " open" : ""}><summary><h2>${icon("sparkles")} ${esc(T("sim.title"))}</h2>${icon("chevron-down", "chev")}</summary><p class="fine">${esc(T("sim.d"))}</p>
      <button class="btn line" data-act="simulate" ${S.simBusy || !S.report ? "disabled" : ""}>${icon(S.simBusy ? "loader-circle" : "brain", S.simBusy ? "spin" : "")}<span>${esc(S.simBusy ? T("ask.running") : T("sim.run"))}</span></button>
      ${S.simStatus ? `<p class="fine">${esc(S.simStatus)}</p>` : ""}${S.simErr ? `<div class="notice soft">${icon("info")}<div>${esc(S.simErr)}</div></div>` : ""}
      ${S.sim ? `<blockquote>${md(S.sim.text)}</blockquote>${S.sim.missing.length ? `<p><b>${esc(T("ask.missing"))}</b></p><ul class="ticks bad">${S.sim.missing.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` : ""}<p class="fine">${esc(T("ai.label"))}</p>` : ""}</details>` : ""}
    ${!running && !pol("hideContactOffers") ? `<section class="block pro-cta"><p>${esc(T("lab.pro2"))}</p>${ctas("lab", `${T("lab.pro.subj")}: ${host()}`, "", true)}</section>` : ""}`;
}
async function openCurrent() {
  const a = S.auto;
  const item = a.queue[a.i];
  if (!item) return;
  const e2 = ENGINES.find((x) => x.id === item.eng);
  const prompt = promptFor(item.q, S.lang);
  S.pasteEngine = e2.id;
  try {
    await navigator.clipboard.writeText(prompt);
  } catch {
  }
  if (pol("disableAssistantLinks")) {
    flash(T("lab.copied.only", { engine: e2.name }));
    render();
    return;
  }
  const url = e2.link(prompt);
  S.lastOpen = url;
  netLog([url], "assistant");
  const id = a.tabs[e2.id];
  let ok = false;
  if (id) {
    try {
      await chrome.tabs.update(id, { url, active: true });
      ok = true;
    } catch {
      ok = false;
    }
  }
  if (!ok) {
    const t2 = await chrome.tabs.create({ url, active: true });
    a.tabs[e2.id] = t2?.id;
  }
  if (!e2.prefill) flash(T("lab.opened.paste", { engine: e2.name }));
  render();
}
function advance() {
  const a = S.auto;
  a.i++;
  if (a.i >= a.queue.length) {
    a.running = false;
    a.done = a.queue.length;
    S.lastCheck = null;
    gain(30, T("xp.autopilot"), "auto:" + host());
    render();
    return;
  }
  render();
  setTimeout(openCurrent, 700);
}
function readAnswer(text, engine) {
  const t2 = (text ?? document.getElementById("ptext")?.value ?? S.pasteText).trim();
  if (!t2 || t2.length < 20) {
    flash(T("lab.short"));
    return;
  }
  const a = S.auto;
  const item = a?.running ? a.queue[a.i] : null;
  const qid = item ? item.qid : S.qSel || questions()[0]?.id;
  const eng = item ? item.eng : engine || S.pasteEngine;
  const res = checkAnswer(t2, S.brand, host(), profile()?.aliases || []);
  (runsFor()[qid] ||= {})[eng] = { ...res, engine: eng, at: (/* @__PURE__ */ new Date()).toISOString() };
  S.pasteText = "";
  const ta = document.getElementById("ptext");
  if (ta) ta.value = "";
  const keys = Object.keys(S.runs);
  if (keys.length > 12) delete S.runs[keys[0]];
  save({ runs: S.runs });
  gain(10, T("xp.answer"), "answer:" + qid + ":" + eng);
  if (a?.running) {
    a.last = { ...res, engine: eng, q: item.q };
    advance();
  } else {
    S.lastCheck = { ...res, engine: eng };
    render();
  }
}
async function pasteFromClipboard() {
  try {
    const has2 = await chrome.permissions.contains({ permissions: ["clipboardRead"] });
    if (!has2 && !await chrome.permissions.request({ permissions: ["clipboardRead"] })) throw new Error("denied");
    const text = await navigator.clipboard.readText();
    if (!text || text.trim().length < 20) {
      flash(T("ap.empty"));
      return;
    }
    readAnswer(text);
  } catch {
    flash(T("ap.noclip"));
    const d = document.querySelector(".manual");
    if (d) {
      d.open = true;
      document.getElementById("ptext")?.focus();
    }
  }
}
function labCsv() {
  const rows = [["question", "engine", "named", "rank", "others", "sources", "date"].join(",")];
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  for (const [qid, per] of Object.entries(runsFor())) for (const [eng, x] of Object.entries(per))
    rows.push([qid, ENGINES.find((e2) => e2.id === eng)?.name || eng, x.named ? "yes" : "no", x.rank || "", x.others.join(" | "), x.domains.join(" | "), x.at.slice(0, 10)].map(q).join(","));
  download(`sada-ai-answers-${host()}-${today()}.csv`, "\uFEFF" + rows.join("\n"), "text/csv");
}
var input = (id) => document.getElementById(id)?.value.trim() || "";
var askActs = {
  qtoggle: (v) => {
    const s = sel();
    s.q = s.q.includes(v) ? s.q.filter((x) => x !== v) : [...s.q, v];
    render();
  },
  etoggle: (v) => {
    const s = sel();
    s.e = s.e.includes(v) ? s.e.filter((x) => x !== v) : [...s.e, v];
    render();
  },
  qall: () => {
    S.qAll = !S.qAll;
    render();
  },
  apstart: () => {
    const s = sel();
    const qs = questions().filter((q) => s.q.includes(q.id));
    const queue = s.e.flatMap((eng) => qs.map((q) => ({ qid: q.id, q: q.text, eng })));
    if (!queue.length) return;
    S.auto = { running: true, queue, i: 0, tabs: S.auto?.tabs || {}, last: null };
    render();
    window.scrollTo(0, 0);
    openCurrent();
  },
  apreopen: () => openCurrent(),
  apskip: () => {
    S.auto.last = null;
    advance();
  },
  apstop: () => {
    S.auto.running = false;
    S.auto.done = S.auto.i;
    render();
  },
  autopaste: () => pasteFromClipboard(),
  readans: () => readAnswer(),
  pfedit: () => {
    S.editProfile = !S.editProfile;
    render();
  },
  pfyes: () => {
    const p = profile();
    if (!p) return;
    (S.profiles ||= {})[origin()] = { ...p, confirmed: true, v: 2 };
    save({ profiles: S.profiles });
    render();
  },
  pfsave: () => {
    const p = profile();
    if (!p) return;
    const kind = document.getElementById("pf-kind")?.value || p.kind;
    const cat = input("pf-cat");
    const catChanged = cat && cat !== p.category && cat !== p.customCategory;
    let np = {
      ...p,
      name: input("pf-name") || p.name,
      kind,
      kindSet: kind !== p.kind || p.kindSet,
      sub: kind !== p.kind ? defaultSubFor(kind).id : p.sub,
      customCategory: catChanged ? cat : kind !== p.kind ? "" : p.customCategory || "",
      services: input("pf-svc").split(/\s*[,;\u060C]\s*/).filter(Boolean).slice(0, 6),
      audience: input("pf-aud"),
      market: input("pf-mkt") !== p.place ? input("pf-mkt") : p.market || "",
      confirmed: true,
      v: 2
    };
    if (!np.market && input("pf-mkt") === "") { np.city = ""; np.region = ""; np.country = ""; }
    np = finalize(np);
    (S.profiles ||= {})[origin()] = np;
    S.brand = np.name;
    S.askSel = null;
    S.editProfile = false;
    save({ profiles: S.profiles, brand: S.brand });
    flash(T("ab.saved"));
    render();
  },
  labcsv: () => labCsv(),
  copysrc: () => {
    const src = /* @__PURE__ */ new Map();
    for (const x of Object.values(runsFor()).flatMap((y) => Object.values(y))) for (const d of x.domains || []) src.set(d, (src.get(d) || 0) + 1);
    copyText([...src.entries()].sort((a, b) => b[1] - a[1]).map(([d, c]) => `${d}	${c}`).join("\n"));
  },
  addq: () => {
    const v = input("newq");
    if (!v || v.length < 8) return;
    const o = origin();
    (S.customQ[o] ||= []).unshift(v.slice(0, 200));
    S.customQ[o] = S.customQ[o].slice(0, 10);
    save({ customQ: S.customQ });
    sel().q.unshift(v.slice(0, 200));
    render();
  },
  simulate: async () => {
    const r = S.report;
    if (!r) return;
    S.simBusy = true;
    S.simErr = "";
    S.sim = null;
    S.simStatus = "";
    render();
    try {
      S.sim = await simulate({
        lang: r.lang.slice(0, 2),
        title: r.model.title,
        url: r.url,
        text: [r.model.metaDescription, r.model.text].join("\n"),
        onProgress: (p) => {
          S.simStatus = T("ask.status.dl", { p: Math.round(p * 100) });
          render();
        }
      });
      gain(10, T("xp.sim"), "sim:" + r.url);
    } catch (e2) {
      S.simErr = String(e2?.message) === "nomodel" ? T("ai.none") : String(e2?.message || e2);
    }
    S.simBusy = false;
    S.simStatus = "";
    render();
  }
};
function preselect(texts) {
  const s = sel();
  const ids = questions().filter((q) => texts.includes(q.text)).map((q) => q.id);
  if (ids.length) s.q = ids;
}

// apps/extension/src/views/agent.ts
var STEP_ICON = { read: "file-text", access: "shield-check", entity: "building-2", scan: "layers", questions: "message-circle", coverage: "target", drive: "mouse-pointer-click", pack: "file-archive" };
function stepList(steps) {
  return `<ol class="steps">${steps.map((s, i) => `<li class="st-${s.status}">
      <span class="node">${s.status === "run" ? icon("loader-circle", "spin") : s.status === "ok" ? icon("check") : s.status === "warn" ? icon("triangle-alert") : s.status === "fail" ? icon("x") : icon(STEP_ICON[s.id])}</span>
      <div><b>${esc(T("ms." + STEPS[i] + ".t"))}</b>${s.detail ? `<span>${esc(s.detail)}</span>` : ""}</div></li>`).join("")}</ol>`;
}
var IMPACT = (n) => `<span class="dots" aria-label="${esc(T("plan.impact"))} ${n}/3">${"<i class=on></i>".repeat(n)}${"<i></i>".repeat(3 - n)}</span>`;
function planList(plan, origin2) {
  const done = S.planDone[origin2] || {};
  const n = plan.filter((a) => done[a.id]).length;
  return `<div class="pprog"><span>${esc(T("plan.progress", { n, of: plan.length }))}</span><div class="bar"><i style="width:${pct(n, plan.length)}%"></i></div></div>
  <ol class="plan">${plan.map((a, i) => `<li class="who-${a.who}${done[a.id] ? " done" : ""}">
      <button class="tick" role="checkbox" aria-checked="${!!done[a.id]}" data-act="pdone:${a.id}" aria-label="${esc(T("plan.mark"))}">${done[a.id] ? icon("check") : i + 1}</button>
      <div class="p-main"><b>${esc(PT(a.id, a.vars))}</b><p>${esc(PT(a.id, a.vars, ".d"))}</p>
        <div class="p-meta">${IMPACT(a.impact)}<span>${esc(T("effort." + a.effort))}</span><span class="tag ${a.who}">${esc(T(a.who === "you" ? "who.you" : "who.pro"))}</span></div></div>
      ${a.go ? `<button class="btn ghost sm" data-act="go:${a.go}">${esc(T("go." + a.go))}</button>` : ""}</li>`).join("")}</ol>`;
}
function covList(cov) {
  const order = { missing: 0, partial: 1, answered: 2 };
  return `<ul class="cov">${[...cov].sort((a, b) => order[a.status] - order[b.status]).map((c) => `<li class="c-${c.status}">
      <span class="pill">${esc(T("cov." + c.status))}</span>
      <div><p>${esc(c.q.text)}</p><small>${esc(T(c.q.branded ? "q.branded" : "q.open"))}${c.q.by === "ai" ? " \xB7 " + esc(T("q.byai")) : ""}${c.best && c.status !== "missing" ? ` \xB7 <a target="_blank" rel="noopener" href="${esc(c.best.url)}">${esc(new URL(c.best.url).pathname)}</a>` : ""}</small></div>
      <button class="icon-btn" data-act="testq:${esc(c.q.id)}" title="${esc(T("cov.test"))}" aria-label="${esc(T("cov.test"))}">${icon("send")}</button></li>`).join("")}</ul>`;
}
function nextStep(res, origin2) {
  if (pol("hideContactOffers")) return "";
  const gaps = res.coverage.filter((c) => c.status !== "answered");
  const open = gaps.filter((c) => !c.q.branded).length;
  const runs = Object.values(S.runs[origin2] || {}).flatMap((x) => Object.values(x));
  const comp = /* @__PURE__ */ new Map();
  for (const r of runs) for (const o of r.others || []) comp.set(o, (comp.get(o) || 0) + 1);
  const top3 = [...comp.entries()].sort((a, b) => b[1] - a[1])[0];
  const named = runs.filter((r) => r.named).length;
  const pro = res.plan.filter((a) => a.who === "pro");
  const head = top3 && runs.length ? T("ns.comp", { comp: top3[0], n: top3[1], named, of: runs.length }) : gaps.length ? T("ns.gaps", { n: gaps.length, of: res.coverage.length, open }) : T("ns.good");
  const note = [head, ...pro.map((a) => "- " + PT(a.id, a.vars))].join("\n");
  return `<section class="block next">
    <p class="next-k">${icon("target")} ${esc(T("ns.kicker"))}</p>
    <h2>${esc(head)}</h2>
    <p>${esc(T("ns.body"))}</p>
    <ul class="ticks ok"><li>${esc(T("ns.get1"))}</li><li>${esc(T("ns.get2"))}</li><li>${esc(T("ns.get3"))}</li></ul>
    <div class="ctas"><a class="btn sun" target="_blank" rel="noopener" href="${esc(bookUrl("mission-review", note))}">${icon("calendar")}<span>${esc(T("ns.book"))}</span></a>
      <a class="btn line" href="${esc(mailUrl(`${T("ns.mail.subj")}: ${host()}`, note))}">${icon("mail")}<span>${esc(T("ns.mail"))}</span></a></div>
    <p class="fine">${icon("lock")} ${esc(T("ns.shares"))}</p></section>`;
}
function viewAgent() {
  const m = S.mission;
  const r = S.report;
  const res = m?.result;
  const running = !!m?.running;
  const url = m?.url || r?.url || "";
  const h = host();
  const cats = res?.cats || (running ? r?.categories : null);
  const state = running ? "run" : res ? "done" : "idle";
  const score2 = res ? res.score : null;
  let out = `<section class="hero">
    ${meter({ url, cats, score: score2, state, size: 210 })}
    <div class="hero-txt">
      ${res ? `<p class="big ${band(res.score)}"><b>${res.score}</b><span>/100</span></p><p class="lead">${esc(T("agent.score.lead", { host: h }))}</p>${legend(res.cats)}` : `<h1>${esc(running ? T("agent.running", { host: h || "\u2026" }) : h ? T("agent.title", { host: h }) : T("agent.title.none"))}</h1>
           <p class="lead">${esc(T("agent.lead"))}</p>`}
    </div>
    <div class="hero-act">
      <button class="btn primary lg" data-act="mission" ${running ? "disabled" : ""}>${icon(res ? "refresh-cw" : "play")}<span>${esc(running ? T("agent.working") : res ? T("agent.again") : T("agent.run"))}</span></button>
      ${!res && !running ? `<p class="fine">${icon("lock")} ${esc(T("agent.free"))}</p>${trustStrip()}` : ""}
      ${S.aiDl && (S.aiDl.busy || S.aiDl.ok) ? `<p class="fine aidl">${icon(S.aiDl.busy ? "loader-circle" : "circle-check", S.aiDl.busy ? "spin" : "")} ${esc(S.aiDl.busy ? T("ai.dl.run", { p: Math.round((S.aiDl.p || 0) * 100) }) : T("ai.dl.done"))}</p>` : ""}
      ${res ? `<p class="fine">${esc(T("agent.when", { date: new Date(m.at).toLocaleString(S.lang, { dateStyle: "medium", timeStyle: "short" }) }))}</p>` : ""}
    </div></section>`;
  if (S.err && !running && !res) out += `<div class="notice">${icon("info")}<div>${esc(T(S.err))}${S.err === "hint.icon" ? `<p><button class="link" data-act="allowall">${esc(T("btn.allowAll"))}</button></p>${staleBar() ? "" : safeCard()}` : ""}</div></div>`;
  if (!m) {
    out += `<section class="block how"><h2>${esc(T("agent.how"))}</h2><ol class="steps preview">${STEPS.map((s) => `<li><span class="node">${icon(STEP_ICON[s])}</span><div><b>${esc(T("ms." + s + ".t"))}</b><span>${esc(T("ms." + s + ".d"))}</span></div></li>`).join("")}</ol></section>`;
    return out;
  }
  if (running || !res) return out + `<section class="block">${stepList(m.steps)}</section>`;
  const cov = res.coverage;
  const ans = cov.filter((c) => c.status === "answered").length;
  const named = Object.values(S.runs[m.origin] || {}).flatMap((x) => Object.values(x)).filter((x) => x.named).length;
  const tested = Object.values(S.runs[m.origin] || {}).flatMap((x) => Object.values(x)).length;
  const driveOk = res.drive.filter((d) => d.status === "pass").length;
  out += `<section class="stats">
      <button class="stat" data-act="go:cov"><b>${ans}<small>/${cov.length}</small></b><span>${esc(T("stat.answered"))}</span></button>
      <button class="stat" data-act="go:audit"><b>${res.site ? res.site.n : 1}</b><span>${esc(T("stat.pages", { avg: res.site ? res.site.avg : res.score }))}</span></button>
      <button class="stat" data-act="go:drive"><b>${driveOk}<small>/${res.drive.length}</small></b><span>${esc(T("stat.drive"))}</span></button>
      <button class="stat" data-act="go:ask"><b>${tested ? pct(named, tested) + "%" : "\u2013"}</b><span>${esc(T(tested ? "stat.named" : "stat.untested"))}</span></button>
    </section>`;
  out += `<section class="block"><div class="h-row"><h2>${esc(T("agent.plan"))}</h2></div>${planList(res.plan, m.origin)}</section>`;
  out += nextStep(res, m.origin);
  const files = S.pack?.files || [];
  out += `<section class="block pack">
      <div class="pack-head">${icon("file-archive", "xl")}<div><h2>${esc(T("pack.title"))}</h2><p>${esc(T("pack.d", { n: files.length }))}</p></div></div>
      ${files.length ? `<ul class="files">${files.map((f2) => `<li>${icon(/\.md$/.test(f2.name) ? "file-text" : /\.csv$/.test(f2.name) ? "chart-column" : "file-code")}<span>${esc(f2.name)}</span></li>`).join("")}</ul>
      <button class="btn primary" data-act="pack">${icon("download")}<span>${esc(T("pack.dl"))}</span></button>` : `<p class="fine">${esc(T("pack.stale"))}</p>`}
    </section>`;
  out += `<section class="block" id="cov"><div class="h-row"><h2>${esc(T("agent.cov"))}</h2><span class="sub">${esc(T("agent.cov.n", { a: ans, n: cov.length }))}</span></div>
    <p class="fine">${esc(T("agent.cov.d"))}</p><button class="btn primary" data-act="testall">${icon("zap")}<span>${esc(T("ap.fromagent"))}</span></button>${covList(cov)}</section>`;
  out += `<details class="block log"><summary>${esc(T("agent.log"))}</summary>${stepList(m.steps)}</details>`;
  return out;
}
var agentActs = {
  mission: async () => {
    if (await runSocial(S.tabId || void 0)) return;
    return runMission();
  },
  pack: () => {
    if (!S.pack?.files?.length) return;
    download(`sada-fix-pack-${host() || "site"}-${today()}.zip`, packZip(), "application/zip");
  },
  pdone: (id) => {
    const o = S.mission?.origin;
    if (!o) return;
    const d = S.planDone[o] ||= {};
    d[id] = !d[id];
    save({ planDone: S.planDone });
    if (d[id]) gain(10, T("xp.plan"), "plan:" + id, { ever: true });
    else render();
  },
  testq: (id) => {
    const q = S.mission?.result?.coverage?.find((c) => c.q.id === id)?.q;
    S.tab = "ask";
    if (q) preselect([q.text]);
    render();
    window.scrollTo(0, 0);
  },
  testall: () => {
    const cov = S.mission?.result?.coverage || [];
    S.tab = "ask";
    preselect(cov.filter((c) => !c.q.branded).slice(0, 6).map((c) => c.q.text));
    render();
    window.scrollTo(0, 0);
  }
};

// apps/extension/src/views/pro.ts
var SERVICES = [["track", "radar"], ["comp", "swords"], ["site", "layers"], ["impl", "wand-sparkles"], ["dash", "chart-column"], ["academy", "graduation-cap"], ["agency", "handshake"]];
function viewPro() {
  const pro = S.mission?.result?.plan?.filter((a) => a.who === "pro") || [];
  const note = pro.map((a) => "- " + PT(a.id, a.vars)).join("\n");
  const hide = pol("hideContactOffers");
  const tier = (k, ic, items, cta) => `<li class="tier t-${k}"><div class="tier-h">${icon(ic)}<div><b>${esc(T("tier." + k))}</b><span>${esc(T("tier." + k + ".p"))}</span></div></div>
      <ul class="ticks ok">${[...Array(items)].map((_, i) => `<li>${esc(T(`tier.${k}.${i + 1}`))}</li>`).join("")}</ul>${cta}</li>`;
  const book = hide ? "" : `<a class="btn sun" target="_blank" rel="noopener" href="${esc(bookUrl("pro-review", note))}">${icon("calendar")}<span>${esc(T("ns.book"))}</span></a>`;
  const quote = hide ? "" : `<a class="btn line" href="${esc(mailUrl(`${T("pro.subj")}${host() ? ": " + host() : ""}`, note))}">${icon("mail")}<span>${esc(T("cta.email"))}</span></a>`;
  return `<section class="block pro-hero"><h1>${esc(T("pro.title"))}</h1><p class="lead">${esc(T("pro.lead"))}</p></section>
    <ol class="tiers">
      ${tier("free", "gem", 4, `<button class="btn ghost sm" data-act="go:agent">${esc(T("tier.free.cta"))}</button>`)}
      ${tier("review", "calendar", 3, book ? `<div class="ctas compact">${book}</div>` : "")}
      ${tier("done", "handshake", 4, quote ? `<div class="ctas compact">${quote}</div>` : "")}
    </ol>
    ${pro.length ? `<section class="block"><h2>${esc(T("pro.from", { n: pro.length }))}</h2><ul class="ticks">${pro.map((a) => `<li>${esc(PT(a.id, a.vars))}</li>`).join("")}</ul></section>` : ""}
    <section class="block"><h2>${esc(T("pro.how"))}</h2><ol class="steps preview">${[1, 2, 3, 4].map((i) => `<li><span class="node">${icon(["calendar", "file-text", "wand-sparkles", "chart-column"][i - 1])}</span><div><b>${esc(T("pro.how." + i))}</b><span>${esc(T("pro.how." + i + ".d"))}</span></div></li>`).join("")}</ol></section>
    <section class="block"><h2>${esc(T("pro.what"))}</h2><ul class="svc">${SERVICES.map(([k, ic]) => `<li>${icon(ic)}<div><b>${esc(T("team." + k))}</b><span>${esc(T("team." + k + ".d"))}</span></div></li>`).join("")}</ul></section>
    <section class="block never"><h2>${esc(T("pro.never"))}</h2><ul class="ticks bad">${[1, 2, 3, 4].map((i) => `<li>${esc(T("pro.never." + i))}</li>`).join("")}</ul></section>
    ${hide ? "" : `<p class="fine center">${icon("lock")} ${esc(T("ns.shares"))}</p>`}`;
}
async function refreshAi() {
  const st = await aiStatus(S.lang).catch(() => ({ state: "unavailable", route: "none" }));
  S.ai = st;
  render();
}
function viewSettings() {
  const ai = S.ai;
  const aiTxt = !ai ? T("ai.checking") : ai.state === "available" ? T(ai.route === "translate" ? "ai.ready.tr" : "ai.ready") : ai.state === "unavailable" ? T("ai.none") : T("ai.dl");
  const opt = (v, cur, label, act) => `<button class="${cur === v ? "on" : ""}" data-act="${act}:${v}" aria-pressed="${cur === v}">${esc(label)}</button>`;
  return `<button class="back" data-act="settings">${icon("chevron-left")}<span>${esc(T("set.back"))}</span></button>
    <section class="block"><h1>${esc(T("set.title"))}</h1>
      <label class="field"><span>${esc(T("set.lang"))}</span><select id="lang">${["auto", ...LANGS].map((l) => `<option value="${l}" ${S.uiLang === l ? "selected" : ""}>${l === "auto" ? esc(T("set.auto")) : { en: "English", fr: "Fran\xE7ais", de: "Deutsch", ar: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629" }[l]}</option>`).join("")}</select></label>
      <div class="field"><span>${esc(T("set.theme"))}</span><div class="seg small">${opt("auto", S.theme, T("set.theme.auto"), "theme")}${opt("light", S.theme, T("set.theme.light"), "theme")}${opt("dark", S.theme, T("set.theme.dark"), "theme")}</div></div>
      <div class="field toggle"><div><span>${esc(ST("set.follow"))}</span><p class="fine">${esc(ST("set.follow.d"))}</p></div><button class="switch${S.follow ? " on" : ""}" role="switch" aria-checked="${S.follow}" data-act="follow"><i></i></button></div>
      <div class="field toggle"><div><span>${esc(T("set.remind"))}</span><p class="fine">${esc(T("set.remind.d"))}</p></div><button class="switch${S.reminder ? " on" : ""}" role="switch" aria-checked="${S.reminder}" data-act="remind"><i></i></button></div>
    </section>
    <section class="block"><h2>${icon("brain")} ${esc(T("ai.title"))}</h2><p>${esc(aiTxt)}</p><p class="fine">${esc(T("ai.how"))}</p></section>
    <button class="trust-strip" data-act="trust">${icon("shield-check")}<span>${esc(T("trust.title"))}</span>${icon("chevron-right", "chev")}</button>
    <section class="block"><h2>${icon("lock")} ${esc(T("set.privacy.t"))}</h2><p class="fine">${esc(T("set.privacy2"))}</p>
      <button class="btn ghost sm" data-act="reset">${icon("trash-2")}<span>${esc(T("set.reset"))}</span></button></section>
    <p class="fine about">Sada ${VERSION} \xB7 <a target="_blank" rel="noopener" href="${REPO}">${esc(T("foot.oss"))}</a> \xB7 <a target="_blank" rel="noopener" href="https://getayka.com/">AYKA Technologies</a></p>`;
}
var proActs = {
  theme: (v) => {
    S.theme = v;
    save({ theme: v });
    render();
  },
  remind: async () => {
    if (!S.reminder) {
      const ok = await chrome.permissions.request({ permissions: ["notifications"] }).catch(() => false);
      if (!ok) return;
      S.reminder = true;
    } else S.reminder = false;
    await save({ reminder: S.reminder });
    chrome.runtime.sendMessage({ type: "sada:reminder", on: S.reminder }).catch(() => {
    });
    render();
  },
  reset: async () => {
    if (!confirm(T("set.reset.q"))) return;
    await chrome.storage.local.clear();
    location.reload();
  }
};

// apps/extension/src/social.ts (v0.4)
function ST(k, v = {}) {
  const s2 = SOCIAL_I18N[S.lang]?.[k] ?? SOCIAL_I18N.en[k] ?? k;
  return s2.replace(/\{(\w+)\}/g, (_, x) => v[x] === void 0 ? "" : String(v[x]));
}
function rememberSite(o, p, ch) {
  if (!o || !p) return;
  const prev = S.sites[o] || {};
  const merge = (a = [], b = []) => Array.from(new Set([...a, ...b])).slice(0, 40);
  S.sites[o] = {
    origin: o, name: p.name, aliases: p.aliases || [], domain: p.domain || hostOf(o), kind: p.kind, sub: p.sub, category: p.category,
    city: p.city || "", cities: p.cities || [], country: p.country || "", services: p.services || [], lang: p.lang,
    links: merge(prev.links, ch?.links), sameAs: merge(prev.sameAs, ch?.sameAs), at: Date.now()
  };
  S.lastSite = o;
  const keys = Object.keys(S.sites).sort((a, b) => (S.sites[a].at || 0) - (S.sites[b].at || 0));
  while (keys.length > 25) delete S.sites[keys.shift()];
  save({ sites: S.sites });
}
function channelName(data) {
  return (data?.live?.name || "").trim() || (data?.raw?.ogTitle || "").replace(/\s*[(@|•–-].*$/, "").trim();
}
// The website this channel belongs to: one that links to the channel, or the one the channel links to.
// A site you checked earlier is used only if it has the same name, and is then marked as not confirmed.
function findSite(det, data) {
  const list = Object.values(S.sites || {}).sort((a, b) => (b.at || 0) - (a.at || 0));
  if (det.key) {
    const byLink = list.find((x) => (x.sameAs || []).includes(det.key) || (x.links || []).includes(det.key));
    if (byLink) return { ...byLink, how: "listed" };
  }
  const hosts = channelLinks(data).map((l) => hostOf(l.url)).filter(Boolean);
  const byDomain = list.find((x) => hosts.some((h) => sameOwner(h, x.domain)));
  if (byDomain) return { ...byDomain, how: "domain" };
  const nm = channelName(data);
  if (!hosts.length && nm) {
    const byName = list.find((x) => [x.name, ...(x.aliases || [])].some((n) => n && sameNameLoose(n, nm)));
    if (byName) return { ...byName, how: "name" };
  }
  return null;
}
function sameNameLoose(a, b) {
  const core = (x) => String(x || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\b(stadt|stadtverwaltung|gemeinde|city|of|ville|de|la|le|the|official|offiziell|e v|gmbh|ag)\b/g, " ").replace(/\s+/g, " ").trim();
  return !!core(a) && core(a) === core(b);
}
var AGG_HOST = /(^|\.)(linktr\.ee|linkin\.bio|beacons\.ai|lnk\.bio|bio\.link|bio\.site|taplink\.(cc|at)|carrd\.co|solo\.to|linkfly\.to|allmylinks\.com|hoo\.be|komi\.io|stan\.store|direct\.me)$/i;
function channelLinks(data) {
  return [...data?.live?.links || [], ...data?.raw?.links || []].filter((x, i, a) => x?.url && /^https?:/i.test(x.url) && a.findIndex((y) => y.url === x.url) === i);
}
// the channel's own website link: not a link-in-bio service; the one closest to the channel's name first
function channelHome(data, det) {
  const nm = `${channelName(data)} ${det?.handle || ""}`.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const ls = channelLinks(data).filter((l) => !AGG_HOST.test(hostOf(l.url)));
  const score = (l) => {
    const h = hostOf(l.url).replace(/^www\./, "");
    const lab = h.split(".").slice(-2, -1)[0] || "";
    return (lab.length >= 3 && nm.includes(lab) ? 2 : 0) + (/\.(link|bio|page|site)$/.test(h) ? 0 : 1);
  };
  return ls.sort((a, b) => score(b) - score(a))[0] || null;
}
async function mayRead(u) {
  try {
    return await chrome.permissions.contains({ origins: [u.origin + "/*"] });
  } catch {
    return false;
  }
}
async function readChannelSite(href) {
  let u;
  try {
    u = new URL(href);
  } catch {
    return null;
  }
  const get = async (url) => {
    const ctl = new AbortController();
    const tm = setTimeout(() => ctl.abort(), 12e3);
    try {
      netLog([url], "social");
      const r = await fetch(url, { credentials: "omit", cache: "no-store", redirect: "follow", signal: ctl.signal });
      const html = r.ok ? (await r.text()).slice(0, 2e6) : "";
      return html ? { url: r.url || url, html } : null;
    } catch {
      return null;
    } finally {
      clearTimeout(tm);
    }
  };
  // most sites forward http to https: ask for https first
  const first = u.protocol === "http:" && await get(u.href.replace(/^http:/, "https:")) || await get(u.href);
  if (!first) return null;
  const fu = new URL(first.url);
  const doc = parse(first.html);
  const docs = [{ doc, url: first.url, role: "page" }];
  const ch = socialChannelsOf(doc, first.url);
  if (fu.pathname.replace(/\/+$/, "") !== "" && await mayRead(fu)) {
    const home = await get(fu.origin + "/");
    if (home) {
      const hd = parse(home.html);
      docs.push({ doc: hd, url: home.url, role: "home" });
      const c2 = socialChannelsOf(hd, home.url);
      ch.links.push(...c2.links);
      ch.sameAs.push(...c2.sameAs);
    }
  }
  const p2 = buildProfile({ url: first.url, lang: (doc.documentElement.getAttribute("lang") || "").slice(0, 2).toLowerCase(), docs });
  const keep = S.lastSite;
  rememberSite(fu.origin, p2, ch);
  S.lastSite = keep;
  return S.sites[fu.origin];
}
async function socialAllowed() {
  try {
    return await chrome.permissions.contains({ origins: SOCIAL_ORIGINS }) || await chrome.permissions.contains({ origins: ["https://*/*"] });
  } catch {
    return false;
  }
}
async function runSocial(tabId, quiet = false) {
  let tab = null;
  try {
    tab = tabId ? await chrome.tabs.get(tabId) : await activeTab();
  } catch {
  }
  const det = tab?.url ? detectSocial(tab.url) : null;
  if (!det) return false;
  S.tabId = tab.id;
  S.socialMode = true;
  S.settings = false;
  if (!["agent", "academy", "pro", "studio"].includes(S.tab) || S.tab === "agent") S.tab = "agent";
  if (det.kind === "other" || det.kind === "group") {
    S.social = { det, url: tab.url, other: true };
    render();
    return true;
  }
  if (S.social?.running && S.social.url === tab.url) return true;
  if (quiet && S.social?.url === tab.url && S.social.res && Date.now() - S.social.at < 6e4) return true;
  S.social = { det, url: tab.url, running: true };
  render();
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: collectSocial });
    const data = res?.result;
    if (!data) throw new Error("read");
    netLog(data.fetched || [], "social");
    const rbOk = data.robots && (data.robots.status < 400 || data.robots.status === 404);
    const rb = parseRobots(rbOk && data.robots.status < 400 ? data.robots.text || "" : "");
    const bots = rbOk ? BOTS.map((b) => ({ ua: b.ua, owner: b.owner, role: b.role, allowed: allowed(rb, b.ua, data.path || "/") })) : [];
    let site = findSite(det, data);
    const home = !site && det.kind !== "post" && !pol("disableSiteScan") ? channelHome(data, det) : null;
    if (home) {
      let hu = null;
      try { hu = new URL(home.url); } catch {}
      if (hu && await mayRead(hu)) {
        S.social = { det, url: tab.url, running: true, reading: hostOf(home.url) };
        render();
        if (await readChannelSite(home.url)) var readSite = hostOf(home.url);
        site = findSite(det, data);
      }
    }
    const result = analyzeSocial(data, { lang: S.lang, det, site, bots });
    const bio = det.kind === "post" ? null : suggestBio(site, det, site?.lang || S.lang, result.seen.name);
    S.social = { det, url: tab.url, data, res: result, bio, bots, site: site ? { origin: site.origin, domain: site.domain, name: site.name, how: site.how } : null, readSite: readSite || "", at: Date.now() };
    recordChannel(S.social);
    S.shown = { tabId: tab.id, url: tab.url };
    S.stale = null;
    gain(10, PLATFORMS[det.platform]?.name || "", "social:" + (det.key || det.handle || tab.url), { ever: true });
  } catch (e2) {
    S.social = { det, url: tab.url, err: /Cannot access|permission|host|denied/i.test(String(e2?.message)) ? "s.err.perm" : "s.err.read" };
  }
  render();
  return true;
}
function socialRow(c) {
  const k = "soc-" + c.id;
  const open = S.open[k];
  const v = { ...c.vars };
  if (c.id === "verified") v.v = ST(v.on ? "verified.yes" : "verified.no");
  const failAi = c.id === "crawl" && c.vars.noAi && c.vars.searchOk;
  let msg = ST(failAi ? "crawl.failai" : c.vars.why === "private" ? "public.private" : c.vars.why === "unconfirmed" ? "public.unconfirmed" : c.vars.why === "platform" ? "snippet.platform" : c.id + "." + c.status, v);
  if (c.id === "link" && c.vars.why === "agg") msg += " " + ST("link.agg");
  if (c.id === "crawl" && c.status !== "info") msg += " " + ST("crawl.platform", v);
  const st = c.status;
  return `<div class="f s-${st}${open ? " open" : ""}">
    <button class="f-head" data-act="toggle:${k}" aria-expanded="${open ? "true" : "false"}">
      <span class="sdot"></span><span class="f-title">${esc(ST(c.id + ".t", v))}</span><span class="stp">${esc(ST((c.id === "crawl" || c.id === "public") && c.status === "fail" ? "s.st.blocked" : c.id === "crawl" && c.status === "warn" ? "s.st.searchonly" : "s.st." + c.status))}</span>${icon("chevron-down", "chev")}</button>
    ${open ? `<div class="f-body"><p>${esc(msg)}</p>${c.status !== "pass" && c.status !== "info" && SOCIAL_I18N.en[c.id + ".fix"] ? `<p class="fix"><b>${esc(T("fix"))}</b> ${esc(ST(c.id + ".fix", v))}</p>` : ""}</div>` : ""}
  </div>`;
}
function viewSocial() {
  const so = S.social;
  const det = so?.det;
  const plat = det?.name || "";
  let out = `<section class="lab-head social-head"><p class="kicker">${icon("share-2")} ${esc(plat)}${det?.handle ? " \xB7 " + esc(det.handle) : ""}</p><h1>${esc(ST("s.title", { platform: plat }))}</h1><p class="lead">${esc(ST("s.lead"))}</p></section>`;
  if (!so) return out;
  if (so.other) out += `<div class="notice soft">${icon("info")}<div>${esc(ST("s.other", { platform: plat }))}</div></div>`;
  else if (so.running) out += `<section class="block center">${icon("loader-circle", "spin xl")}<p>${esc(so.reading ? ST("s.reading", { domain: so.reading }) : ST("s.scanning"))}</p></section>`;
  else if (so.err) out += `<div class="notice">${icon("info")}<div>${esc(ST(so.err))}<p><button class="btn line sm" data-act="sscan">${icon("refresh-cw")}<span>${esc(ST("s.rescan"))}</span></button></p></div></div>`;
  else if (so.res) {
    const r = so.res;
    if (det.kind === "post") out += `<div class="notice soft">${icon("info")}<div>${esc(ST("s.post"))}</div></div>`;
    out += `<section class="block score-card"><div class="share"><p class="big ${r.score === null ? "" : band(r.score)}"><b>${r.score ?? "\u2013"}</b><span>/100</span></p>
      <p class="lead">${so.site ? `${icon(so.site.how === "name" ? "info" : "link")} ${esc(ST(so.site.how ? "s.linked." + so.site.how : "s.linked", { site: so.site.domain }))}` : esc(ST("s.nosite"))}</p></div>
      ${!so.site && channelHome(so.data, det) && !pol("disableSiteScan") ? (() => {
      const d = hostOf(channelHome(so.data, det).url);
      return `<div class="compare">${so.cmp === "run" ? `<p class="fine">${icon("loader-circle", "spin")} ${esc(ST("s.compare.run", { domain: d }))}</p>` : `<button class="btn line sm" data-act="scompare">${icon("link")}<span>${esc(ST("s.compare", { domain: d }))}</span></button><p class="fine">${esc(ST(so.cmp === "fail" ? "s.compare.fail" : "s.compare.d", { domain: d }))}</p>`}</div>`;
    })() : ""}
      <div class="findings">${r.checks.map(socialRow).join("")}</div>
      <button class="btn line sm" data-act="sscan">${icon("refresh-cw")}<span>${esc(ST("s.rescan"))}</span></button></section>`;
    if (so.bio) out += `<section class="block"><h2>${icon("wand-sparkles")} ${esc(ST("s.bio.t"))}</h2><div class="code"><pre class="bio" dir="auto">${esc(so.bio.text)}</pre><button class="btn ghost sm" data-act="copy:sbio">${icon("copy")}<span>${esc(T("copy"))}</span></button></div><p class="fine">${esc(ST("s.bio.d", { n: so.bio.n, max: so.bio.max, platform: plat }))}</p>
      ${so.det?.key ? `<div class="row2"><button class="btn primary sm" data-act="stukit:${esc(so.det.key)}">${icon("megaphone")}<span>${esc(UT("pr.kit"))} · ${esc(UT("stu.title"))}</span></button><button class="btn line sm" data-act="stu:posts">${icon("send")}<span>${esc(UT("po.make"))}</span></button></div>` : ""}</section>`;
    const seen = r.seen || {};
    out += `<details class="block quick"><summary><h2>${esc(ST("s.seen"))}</h2>${icon("chevron-down", "chev")}</summary>
      <dl class="seen"><dt>${esc(ST("s.seen.name"))}</dt><dd>${esc(seen.name || "\u2013")}</dd><dt>${esc(ST("s.seen.bio"))}</dt><dd>${esc(seen.bio || "\u2013")}</dd>
      <dt>${esc(ST("s.seen.link"))}</dt><dd>${seen.links?.length ? seen.links.slice(0, 5).map((l) => esc(hostOf(l.url) || l.url)).join(", ") : "\u2013"}</dd></dl></details>`;
  } else out += `<button class="btn primary lg wide" data-act="sscan">${icon("play")}<span>${esc(ST("s.scan"))}</span></button>`;
  out += `<section class="block"><div class="field toggle"><div><span>${esc(ST("s.auto.t"))}</span><p class="fine">${esc(ST("s.auto.d"))}</p></div><button class="switch${S.autoSocial ? " on" : ""}" role="switch" aria-checked="${S.autoSocial}" data-act="sauto" aria-label="${esc(ST("s.auto.t"))}"><i></i></button></div></section>`;
  out += `<p class="fine center">${icon("lock")} ${esc(ST(so?.readSite || so?.cmp === "" && so?.site ? "s.private.site" : "s.private", { platform: plat, site: so?.readSite || so?.site?.domain || "" }))}</p>`;
  return out;
}
function socialGuard() {
  const plat = S.social?.det?.name || "";
  return `<section class="empty">${icon("share-2", "xl")}<h2>${esc(ST("s.guard", { platform: plat }))}</h2>
    <button class="btn primary" data-act="tab:agent">${icon("chevron-left")}<span>${esc(ST("s.guard.back"))}</span></button></section>`;
}
function reanalyzeSocial() {
  const so = S.social;
  if (!so?.data) return;
  const site = findSite(so.det, so.data);
  so.res = analyzeSocial(so.data, { lang: S.lang, det: so.det, site, bots: so.bots || [] });
  so.bio = so.det.kind === "post" ? null : suggestBio(site, so.det, site?.lang || S.lang, so.res.seen.name);
  recordChannel(so);
  so.site = site ? { origin: site.origin, domain: site.domain, name: site.name, how: site.how } : null;
}
var socialActs = {
  sscan: () => runSocial(S.tabId || void 0),
  scompare: async () => {
    const so = S.social;
    const link = so?.data ? channelHome(so.data, so.det) : null;
    if (!link) return;
    let u;
    try {
      u = new URL(link.url);
    } catch {
      return;
    }
    const base = u.hostname.replace(/^www\./, "");
    const ok = await chrome.permissions.request({ origins: [`https://${base}/*`, `https://www.${base}/*`, `http://${base}/*`, `http://www.${base}/*`] }).catch(() => false);
    if (!ok) {
      flash(T("perm.denied"));
      return;
    }
    so.cmp = "run";
    render();
    const site = await readChannelSite(u.href);
    so.cmp = site ? "" : "fail";
    if (site) reanalyzeSocial();
    render();
  },
  sauto: async () => {
    if (S.autoSocial) {
      try {
        await chrome.permissions.remove({ origins: SOCIAL_ORIGINS });
      } catch {
      }
      S.autoSocial = await socialAllowed();
      render();
      return;
    }
    const ok = await chrome.permissions.request({ origins: SOCIAL_ORIGINS }).catch(() => false);
    S.autoSocial = !!ok;
    render();
    if (ok && S.socialMode) runSocial(S.tabId || void 0);
  }
};
var socialTimer = 0;
var followTimer = 0;
var ASSISTANT_HOST = /(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|gemini\.google\.com|copilot\.microsoft\.com|bing\.com|claude\.ai|grok\.com|mistral\.ai|google\.[a-z.]+)$/i;
var sameDoc = (a, b) => String(a || "").split("#")[0].replace(/\/$/, "") === String(b || "").split("#")[0].replace(/\/$/, "");
var ACTION_PAGE = /^https:\/\/([a-z]+\.)?(x\.com\/intent|twitter\.com\/intent|bsky\.app\/intent|threads\.(net|com)\/intent|wa\.me\/|api\.whatsapp\.com|www\.linkedin\.com\/(sharing|shareArticle|feed\/?(\?|$)|company\/[^/]+\/admin)|www\.facebook\.com\/(sharer|dialog)|www\.pinterest\.[a-z.]+\/(pin\/create|settings)|www\.instagram\.com\/(accounts\/edit|$)|www\.tiktok\.com\/(upload|tiktokstudio)|studio\.youtube\.com|business\.google\.com|x\.com\/settings)/i;
async function onTabChange(tabId) {
  const tab = await (tabId ? chrome.tabs.get(tabId) : activeTab()).catch(() => null);
  if (!tab?.id) return;
  if (S.auto?.running || S.mission?.running) return;
  const url = tab.url || "";
  if (url.startsWith(location.origin) || tab.id === S.selfTab) return; // Sada's own pages
  if (url && ASSISTANT_HOST.test(hostOf(url))) return; // the Visibility lab sends you there; keep showing your site
  if (url && ACTION_PAGE.test(url)) return; // a composer or settings page Sada opened for you: keep the Studio as it is
  S.tabId = tab.id;
  const det = url ? detectSocial(url) : null;
  if (det) {
    S.stale = null;
    if (!S.socialMode || S.social?.url !== url) {
      S.socialMode = true;
      if (S.social?.url !== url) S.social = { det, url };
      render();
    }
    clearTimeout(socialTimer);
    if (S.autoSocial || S.follow && S.allSites) socialTimer = setTimeout(() => runSocial(tab.id, true), 1200);
    return;
  }
  if (S.socialMode) S.socialMode = false;
  if (S.shown && S.shown.tabId === tab.id && (!url || sameDoc(url, S.shown.url))) {
    S.stale = null;
    render();
    return;
  }
  S.stale = { tabId: tab.id, url, internal: !!url && !/^https?:/.test(url), perm: !url && !S.allSites };
  if (url && /^https?:/.test(url)) {
    const o = originOf(url);
    if (S.report && originOf(S.report.url) !== o) {
      S.report = null;
      S.site = null;
      S.cmp = null;
      S.drive = null;
      S.fixes = [];
      S._pcache = null;
    }
    S.mission = S.missions[o] || null;
    S.pack = S.mission?.pack || null;
    clearTimeout(followTimer);
    if (S.follow) followTimer = setTimeout(() => {
      if (S.stale?.tabId === tab.id) runCheck(tab.id);
    }, 700);
  }
  render();
}
function staleBar() {
  const st = S.stale;
  if (!st || S.busy || S.socialMode || S.trust || S.settings || S.tab === "academy" || S.tab === "pro") return "";
  if (st.internal) return `<div class="stale">${icon("info")}<div><p>${esc(ST("f.internal"))}</p></div></div>`;
  const shown = hostOf(S.shown?.url || S.report?.url || "");
  const msg = st.url ? ST("f.banner.new", { host: hostOf(st.url) }) : shown ? ST("f.banner", { shown }) : ST("f.banner.none");
  const perm = !S.allSites && (S.err === "hint.icon" || st.perm);
  if (!perm) return `<div class="stale">${icon("refresh-cw")}<div>${msg ? `<p>${esc(msg)}</p>` : ""}
    <div class="row2"><button class="btn primary sm" data-act="refresh">${icon("refresh-cw")}<span>${esc(ST("f.update"))}</span></button></div></div></div>`;
  return `<div class="stale perm">${icon("refresh-cw")}<div>${msg ? `<p>${esc(msg)}</p>` : ""}<p class="fine">${esc(ST(st.declined ? "f.declined" : "f.perm"))}</p>
    ${safeCard()}
    <div class="row2"><button class="btn primary sm" data-act="refresh">${icon("shield-check")}<span>${esc(ST("safe.go"))}</span></button><button class="btn line sm" data-act="trust">${icon("eye")}<span>${esc(ST("safe.proof"))}</span></button></div></div></div>`;
}
function safeCard() {
  return `<div class="safe-card"><p class="safe-h">${icon("shield-check")}<b>${esc(ST("safe.h"))}</b></p>
    <ul>${["1", "2", "3", "4"].map((k) => `<li>${icon("check")}<span>${esc(ST("safe." + k))}</span></li>`).join("")}</ul>
    <p class="fine">${icon("info")} ${esc(ST("safe.chrome"))}</p></div>`;
}
async function refreshTab(ask = false) {
  const tab = await activeTab().catch(() => null);
  if (!tab?.id) return;
  S.tabId = tab.id;
  if (await runSocial(tab.id)) return;
  const r = await runCheck(tab.id);
  if (r) return;
  const needPerm = S.err === "hint.icon";
  // Clicked "Update": without site access, ask Chrome right away (still inside the click), then retry once.
  if (ask && needPerm && !S.allSites) {
    let ok = false;
    try {
      ok = await chrome.permissions.request({ origins: ["https://*/*", "http://*/*"] });
    } catch (e) {
      console.warn(e);
    }
    if (ok) {
      S.allSites = true;
      S.err = "";
      return refreshTab(false);
    }
    S.stale = { tabId: tab.id, url: tab.url || "", perm: true, declined: true };
    render();
    return;
  }
  S.stale = { tabId: tab.id, url: tab.url || "", perm: needPerm, internal: S.err === "perm.cant" && !!tab.url && !/^https?:/.test(tab.url) };
  render();
}
async function hasAllSites() {
  try {
    return await chrome.permissions.contains({ origins: ["https://*/*"] });
  } catch {
    return false;
  }
}


// ── Social Studio (v0.8): profile kits, posts, plan, watch, website fixes ─────
// Sada prepares; the person publishes. No platform API, no server.
function UT(k, v = {}) {
  const L = STU_I18N[S.lang] ? S.lang : "en";
  const s = STU_I18N[L][k] ?? STU_I18N.en[k] ?? k;
  return String(s).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? "");
}
var CP = new Map();
var cref = (t) => {
  const k = "c" + CP.size;
  CP.set(k, String(t ?? ""));
  return k;
};
var fmtWhen = (ts) => {
  try {
    return new Intl.DateTimeFormat(S.lang === "ar" ? "ar-TN" : S.lang, { dateStyle: "medium", timeStyle: "short" }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString();
  }
};
var fmtDay = (ts) => {
  try {
    return new Intl.DateTimeFormat(S.lang === "ar" ? "ar-TN" : S.lang, { dateStyle: "medium" }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleDateString();
  }
};
var fmtNum = (n) => n == null ? "–" : new Intl.NumberFormat(S.lang === "ar" ? "ar-TN" : S.lang).format(n);
var toLocalInput = (ts) => {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
function ownOrigins() {
  return [...new Set([...Object.keys(S.missions || {}), S.stuSite].filter((o) => /^https?:/.test(o || "")))];
}
function stuSite() {
  const o = S.stuSite || S.social?.site?.origin || S.mission?.origin || originOf(S.report?.url) || ownOrigins()[0] || "";
  if (S.sites?.[o]) return S.sites[o];
  const p = o ? ownProfile(o) : null;
  if (p) return { origin: o, name: p.name, aliases: p.aliases || [], domain: p.domain || hostOf(o), kind: p.kind, sub: p.sub, category: p.category, city: p.city || "", cities: p.cities || [], country: p.country || "", services: p.services || [], lang: p.lang, links: [], sameAs: [] };
  return Object.values(S.sites || {}).sort((a, b) => (b.at || 0) - (a.at || 0))[0] || null;
}
// questions the website answers, best first (fully answered, then by fit)
function answeredCov(m) {
  return (m?.coverage || []).filter((c) => c.best && c.status !== "missing").sort((a, b) => (a.status === "answered" ? 0 : 1) - (b.status === "answered" ? 0 : 1) || (b.fit || 0) - (a.fit || 0));
}
function stuMission(site) {
  if (!site) return null;
  return S.missions?.[site.origin]?.result || (S.mission?.origin === site.origin ? S.mission?.result : null) || null;
}
function channelsOf(site) {
  const all = Object.values(S.channels || {});
  if (!site) return all;
  const keys = new Set([...(site.links || []), ...(site.sameAs || [])]);
  const mine = all.filter((c) => c.site === site.origin || keys.has(c.key));
  for (const k of keys) {
    if (mine.some((c) => c.key === k)) continue;
    const d = detectSocial(keyUrl(k));
    if (d && d.kind !== "post" && d.kind !== "other") mine.push({ key: k, platform: d.platform, handle: d.handle, url: keyUrl(k), unchecked: true });
  }
  return mine;
}
function recordChannel(so) {
  const det = so?.det, r = so?.res;
  if (!det?.key || det.kind === "post" || !r) return;
  // a login wall or an error page tells nothing about the channel: do not list it
  if (!r.seen?.name && !(r.seen?.links || []).length && !r.seen?.bio) return;
  const live = so.data?.live || {};
  const prev = S.channels[det.key] || {};
  const hist = (prev.hist || []).slice(-29);
  const last = hist[hist.length - 1];
  if (r.score != null && (!last || last[1] !== r.score || Date.now() - last[0] > 864e5)) hist.push([Date.now(), r.score]);
  const st = (id) => r.checks.find((c) => c.id === id)?.status || "";
  S.channels[det.key] = {
    key: det.key, platform: det.platform, handle: det.handle, url: keyUrl(det.key), name: r.seen?.name || "", bio: String(r.seen?.bio || "").slice(0, 400),
    links: (r.seen?.links || []).map((l) => l.url).slice(0, 5), score: r.score, at: Date.now(), hist, site: so.site?.origin || prev.site || "",
    category: String(live.category || "").slice(0, 80), location: String(live.location || "").slice(0, 120), lang: guessLang(`${r.seen?.bio || ""} ${live.category || ""}`) || prev.lang || "",
    st: { name: st("name"), bio: st("bio"), link: st("link"), back: st("backlink"), place: st("place") },
    fails: r.checks.filter((c) => c.w > 0 && (c.status === "fail" || c.status === "warn")).map((c) => c.id)
  };
  save({ channels: S.channels });
  syncWatch();
}
function duePosts() {
  const now = Date.now();
  return (S.posts || []).filter((p) => p.status === "scheduled" && p.when && p.when <= now);
}
function unseenAlerts() {
  return (S.wAlerts || []).filter((a) => a.sev !== "info" && a.at > (S.wSeen || 0)).length;
}
function stuCms(site) {
  if (!site) return "";
  if (S.page?.html && originOf(S.page.url || S.report?.url) === site.origin) {
    const id = detectCms(S.page.html, S.page.url);
    if (S.cms[site.origin] !== id) {
      S.cms[site.origin] = id;
      save({ cms: S.cms });
    }
    return id;
  }
  return S.cms[site.origin] ?? null;
}
var mark = (st) => st === "pass" ? `<span class="mk ok">${icon("check")}</span>` : st === "warn" ? `<span class="mk warn">${icon("triangle-alert")}</span>` : st === "fail" ? `<span class="mk bad">${icon("x")}</span>` : `<span class="mk na">–</span>`;
function copyBtn(text, label = UT("stu.copy"), cls = "btn ghost xs") {
  return `<button class="${cls}" data-act="stucopy:${cref(text)}" title="${esc(label)}">${icon("copy")}<span>${esc(label)}</span></button>`;
}
function viewStudio() {
  CP.clear();
  const site = stuSite();
  const sec = S.stu.sec;
  const due = duePosts().length, na = unseenAlerts();
  const sites = ownOrigins().filter((o) => S.sites?.[o] || ownProfile(o));
  let out = `<section class="block stu-hero"><h1>${icon("megaphone")} ${esc(UT("stu.title"))}</h1>${sec === "profiles" && !S.stu.ch ? `<p class="lead">${esc(UT("stu.lead"))}</p>` : ""}
    ${sites.length > 1 ? `<label class="stu-site">${icon("globe")}<select id="stu-site">${sites.map((o) => `<option value="${esc(o)}" ${site?.origin === o ? "selected" : ""}>${esc(hostOf(o))}</option>`).join("")}</select></label>` : site ? `<p class="stu-site">${icon("globe")} <b>${esc(site.name || site.domain)}</b> · ${esc(site.domain || hostOf(site.origin))}</p>` : ""}
    ${sec === "posts" || sec === "profiles" && !S.stu.ch ? `<p class="fine stu-ai">${icon(S.ai?.state === "available" ? "sparkles" : "info")} ${esc(UT(S.ai?.state === "available" ? "stu.ai.on" : "stu.ai.off"))}</p>` : ""}</section>
    <div class="seg stu-seg" role="tablist">${["profiles", "posts", "plan", "watch", "web"].map((k) => `<button role="tab" class="${sec === k ? "on" : ""}" aria-selected="${sec === k}" data-act="stu:${k}">${esc(UT("sec." + k))}${k === "plan" && due ? `<span class="dot">${due}</span>` : ""}${k === "watch" && na ? `<span class="dot">${na}</span>` : ""}</button>`).join("")}</div>`;
  out += sec === "posts" ? stuPosts(site) : sec === "plan" ? stuPlan(site) : sec === "watch" ? stuWatch(site) : sec === "web" ? stuWeb(site) : S.stu.ch ? stuKit(site, S.stu.ch) : stuProfiles(site);
  out += `<p class="fine center stu-safe">${icon("shield-check")} ${esc(UT("stu.safe"))}</p>`;
  return out;
}

// ── profiles ────────────────────────────────────────────────────────────────
function stuProfiles(site) {
  const list = channelsOf(site);
  if (!list.length) return `<section class="block"><h2>${esc(UT("pr.h"))}</h2><p>${esc(UT("pr.none"))}</p><button class="btn primary" data-act="go:agent">${icon("play")}<span>${esc(UT("po.q.go"))}</span></button></section>`;
  const checked = list.filter((c) => !c.unchecked).sort((a, b) => (a.score ?? 101) - (b.score ?? 101));
  const open = list.filter((c) => c.unchecked);
  // channels Sada could not connect to any website yet
  const loose = site ? Object.values(S.channels || {}).filter((c) => !c.site && !list.some((x) => x.key === c.key)) : [];
  const row = (c) => `<li class="ch-row"><span class="pf">${icon("share-2")}</span><div class="ch-t"><b>${esc(PNAME[c.platform] || c.platform)}</b><span>${esc(c.handle || c.key)}</span>${c.at ? `<span class="fine">${esc(UT("pr.checked", { date: fmtDay(c.at) }))}</span>` : ""}</div>
      ${c.unchecked ? `<span class="chip">${esc(UT("pr.unchecked"))}</span>` : `<span class="chip ${c.score >= 80 ? "good" : c.score >= 55 ? "mid" : "low"}">${esc(UT("pr.score", { n: c.score ?? "–" }))}</span>`}
      <div class="ch-a">${c.unchecked ? `<button class="btn line xs" data-act="stuopen:${esc(c.url)}">${icon("external-link")}<span>${esc(UT("pr.open"))}</span></button>` : `<button class="btn primary xs" data-act="stukit:${esc(c.key)}">${icon("wand-sparkles")}<span>${esc(UT("pr.kit"))}</span></button><button class="btn ghost xs" data-act="stuopen:${esc(c.url)}" title="${esc(UT("pr.open"))}">${icon("refresh-cw")}</button>`}</div></li>`;
  let out = `<section class="block"><h2>${esc(UT("pr.h"))}</h2><ul class="ch-list">${checked.map(row).join("")}</ul>
    ${open.length ? `<h3>${esc(UT("pr.found"))}</h3><ul class="ch-list">${open.map(row).join("")}</ul>` : ""}
    ${loose.length ? `<h3>${esc(UT("pr.loose"))}</h3><p class="fine">${esc(UT("pr.loose.d"))}</p><ul class="ch-list">${loose.map(row).join("")}</ul>` : ""}</section>`;
  if (checked.length) {
    const cols = ["name", "bio", "link", "back", "place"];
    out += `<section class="block"><h2>${esc(UT("pr.consist.h"))}</h2><p class="fine">${esc(UT("pr.consist.d"))}</p>
      <div class="tbl-wrap"><table class="consist"><thead><tr><th></th>${cols.map((k) => `<th>${esc(UT("pr.c." + k))}</th>`).join("")}</tr></thead>
      <tbody>${checked.map((c) => `<tr><th>${esc(PNAME[c.platform])}</th>${cols.map((k) => `<td>${mark(c.st?.[k])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      ${checked.some((c) => c.st?.back && c.st.back !== "pass") ? `<button class="btn line sm" data-act="stu:web">${icon("link")}<span>${esc(UT("we.t.social"))}</span></button>` : ""}</section>`;
  }
  return out;
}
function guessLang(t) {
  const s = ` ${String(t || "").toLowerCase()} `;
  if ((s.match(/[\u0600-\u06FF]/g) || []).length > 8) return "ar";
  const hit = (ws) => ws.reduce((n, w) => n + (s.split(` ${w} `).length - 1), 0);
  const sc = { de: hit(["der", "die", "das", "und", "ist", "nicht", "mit", "für", "wir", "sie", "auf", "ein", "eine", "über"]), fr: hit(["le", "la", "les", "et", "est", "pour", "des", "une", "nous", "vous", "du", "dans", "sur", "avec"]), en: hit(["the", "and", "is", "for", "with", "we", "our", "you", "of", "to", "in", "your"]) };
  const best = Object.entries(sc).sort((a, b) => b[1] - a[1])[0];
  return best[1] >= 2 ? best[0] : "";
}
// what the kit can rely on: the channel's website if Sada knows it, filled up with what the channel itself shows
function bioWhat(c) {
  let t = String(c.bio || "").trim();
  if (c.name && t.toLowerCase().startsWith(c.name.toLowerCase())) t = t.slice(c.name.length).replace(/^[\s:–·|-]+/, "");
  const first = t.split(/[.!?\n·|]/)[0].trim();
  return first.length >= 6 && first.length <= 60 ? first : "";
}
function kitSite(c, site) {
  // only the website this channel belongs to: never another site that happens to be open in the Studio
  const own = c.site ? S.sites?.[c.site] || null : site && (site.links || []).concat(site.sameAs || []).includes(c.key) ? site : null;
  const link = (c.links || []).find((u) => /^https?:/.test(u) && !detectSocial(u) && !/(linktr\.ee|linkin\.bio|beacons\.ai|lnk\.bio|bio\.link|taplink|carrd\.co)/i.test(u));
  let origin = own?.origin || "";
  if (!origin && link) try { origin = new URL(link).origin; } catch {}
  const loc = String(c.location || "").split(/[,·]/)[0].replace(/\(.*?\)/g, "").trim();
  return {
    ...own || {},
    origin, domain: own?.domain || (origin ? hostOf(origin) : ""), name: own?.name || c.name || "",
    // without a known website, the first statement of the channel's own bio says best what it is
    category: own?.category || c.category || bioWhat(c), city: own?.city || loc || "", country: own?.country || "",
    services: own?.services || [], kind: own?.kind || "generic", lang: own?.lang || c.lang || "",
    partial: !own
  };
}
function stuKit(site, key) {
  const c = S.channels[key] || (() => {
    const d = detectSocial(keyUrl(key));
    return d ? { key, platform: d.platform, handle: d.handle, url: keyUrl(key) } : null;
  })();
  if (!c) return stuProfiles(site);
  const plat = PNAME[c.platform] || c.platform;
  site = kitSite(c, site);
  const L = site?.lang && ["en", "fr", "de", "ar"].includes(site.lang) ? site.lang : S.lang;
  const kit = profileKit(c.platform, site, L, c.name);
  const aiB = S.stu.kitAi[key] || [];
  const count = (t, max) => {
    const n = graphemes(t);
    return `<span class="cnt ${n > max ? "bad" : ""}">${n} / ${max}${n > max ? " · " + esc(UT("kit.over")) : ""}</span>`;
  };
  const field = (label, text, max, note = "") => !text ? "" : `<div class="kf"><div class="kf-h"><b>${esc(label.replace(/\s*\((.+)\)$/, ""))}${/\((.+)\)$/.test(label) ? `<small>${esc(label.match(/\((.+)\)$/)[1])}</small>` : ""}</b>${max ? count(text, max) : ""}${copyBtn(text)}</div><pre class="kf-t" dir="auto">${esc(text)}</pre>${note ? `<p class="fine">${esc(note)}</p>` : ""}${/\[[^\]]+\]/.test(text) ? `<p class="fine warn">${icon("triangle-alert")} ${esc(UT("kit.ph"))}</p>` : ""}</div>`;
  const issues = (c.fails || []).map((id) => ST(id + ".t", { platform: plat })).filter((t) => t && !/\.t$/.test(t));
  const bios = [...kit.bios, ...aiB.map((t) => ({ text: t, max: kit.bios[0]?.max || 150, ai: true }))];
  // pages (LinkedIn company pages, Facebook pages, XING pages) are edited by their admins from the page itself
  const pageLike = c.platform === "linkedin" && /\/(company|school|showcase)\//.test(c.url || "") || c.platform === "facebook" || c.platform === "xing" && /\/pages\//.test(c.url || "");
  const kitAll = [`${plat} · ${c.handle || c.key}`, "", `${UT("kit.name")}: ${kit.name.text}`, "", `${UT("kit.bio")}:`, ...bios.map((b, i) => `${i + 1}) ${b.text}`), "", kit.link ? `${UT("kit.link")}: ${kit.link}` : "", kit.place ? `${UT("kit.place")}: ${kit.place}` : "", ["linkedin", "youtube", "facebook", "xing", "pinterest"].includes(c.platform) ? `\n${UT("kit.long")}:\n${kit.long.text}` : "", "", UT("st." + c.platform)].filter((x, i, arr) => x !== "" || arr[i - 1] !== "").join("\n").trim();
  return `<button class="back" data-act="stukit:">${icon("chevron-left")}<span>${esc(UT("kit.back"))}</span></button>
    <section class="block"><h1>${esc(UT("kit.h", { platform: plat }))}</h1><p class="fine">${esc(c.handle || c.key)}${c.score != null ? " · " + esc(UT("pr.score", { n: c.score })) : ""}</p>
    ${issues.length ? `<h3>${esc(UT("kit.issues"))}</h3><ul class="ticks bad">${issues.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
    ${(c.fails || []).includes("backlink") ? `<p class="fine">${icon("link")} ${esc(UT("kit.back.d"))}</p><button class="btn line sm" data-act="stu:web">${icon("globe")}<span>${esc(UT("we.t.social"))}</span></button>` : ""}
    ${(c.fails || []).includes("contact") ? `<p class="fine">${icon("phone")} ${esc(UT("kit.contact"))}</p>` : ""}
    ${site.partial ? `<div class="kit-note"><p>${icon("info")} <span>${esc(UT("kit.nosite"))}</span></p><button class="btn line sm" data-act="go:agent">${icon("play")}<span>${esc(UT("po.q.go"))}</span></button></div>` : ""}</section>
    <section class="block kit">
      ${field(UT("kit.name"), kit.name.text, kit.name.max, UT("kit.name.d"))}
      <h3>${esc(UT("kit.bio"))}</h3>
      ${bios.map((b, i) => field(UT("kit.variant", { n: i + 1 }) + (b.ai ? " · AI" : ""), b.text, b.max)).join("")}
      ${S.ai?.state === "available" && !pol("disableOnDeviceAI") ? `<button class="btn line sm" data-act="stukitai:${esc(key)}" ${S.stu.busy === "kit" ? "disabled" : ""}>${icon(S.stu.busy === "kit" ? "loader-circle" : "sparkles", S.stu.busy === "kit" ? "spin" : "")}<span>${esc(UT(S.stu.busy === "kit" ? "kit.ai.run" : "kit.ai"))}</span></button>` : ""}
      ${field(UT("kit.link"), kit.link, 0, UT("kit.link.d"))}
      ${kit.linkPlain ? `<p class="fine">${esc(UT("kit.link.plain"))}: <code>${esc(kit.linkPlain)}</code> ${copyBtn(kit.linkPlain)}</p>` : ""}
      ${field(UT("kit.cat"), site.partial && !c.category ? "" : kit.category, 0)}
      ${field(UT("kit.place"), kit.place, 0)}
      ${["linkedin", "youtube", "facebook", "xing", "pinterest"].includes(c.platform) ? field(UT("kit.long"), kit.long.text, kit.long.max) : ""}
    </section>
    <section class="block"><h2>${esc(UT("kit.where"))}</h2><p>${esc(UT("st." + c.platform))}</p>
      ${pageLike ? `<p class="fine warn">${icon("user-check")} ${esc(UT("kit.admin", { platform: plat }))}</p>` : `<p class="fine warn">${icon("user-check")} ${esc(UT("kit.acct", { handle: c.handle || c.key }))}</p>`}
      <div class="row2"><a class="btn primary sm" target="_blank" rel="noopener" href="${esc(profileEdit(c.platform, c.url, c.handle))}">${icon("external-link")}<span>${esc(UT(pageLike ? "kit.editPage" : "kit.edit", { platform: plat }))}</span></a>${copyBtn(kitAll, UT("kit.all"), "btn line sm")}</div>
      <p class="fine">${esc(UT("kit.all.d"))}</p>
      <p class="fine">${icon("refresh-cw")} ${esc(UT("kit.recheck"))}</p></section>`;
}

// ── posts ───────────────────────────────────────────────────────────────────
function defaultPlats(site) {
  const fromCh = [...new Set(channelsOf(site).filter((c) => !c.unchecked).map((c) => c.platform))].filter((p) => POST_PLATFORMS.includes(p));
  return fromCh.length ? fromCh : ["instagram", "facebook", "linkedin"];
}
function stuPosts(site) {
  const m = stuMission(site);
  const src = S.stu.src;
  const plats = S.stu.plats || defaultPlats(site);
  const cov = answeredCov(m);
  const gaps = (m?.coverage || []).filter((c) => c.status === "missing").length;
  let srcBody = "";
  if (src === "q") {
    if (!m) srcBody = `<p>${esc(UT("po.q.none"))}</p><button class="btn line sm" data-act="go:agent">${icon("play")}<span>${esc(UT("po.q.go"))}</span></button>`;
    else {
      const sel = S.stu.qid && cov.some((c) => c.q.id === S.stu.qid) ? S.stu.qid : cov[0]?.q.id;
      srcBody = `<h3>${esc(UT("po.q.pick"))}</h3><ul class="qpick">${cov.slice(0, 14).map((c) => `<li><label><input type="radio" name="stuq" data-act="stuq:${esc(c.q.id)}" ${c.q.id === sel ? "checked" : ""}><span dir="auto">${esc(c.q.text)}</span>${mark(c.status === "answered" ? "pass" : "warn")}</label></li>`).join("")}</ul>
        ${gaps ? `<p class="fine">${icon("info")} ${esc(UT("po.q.gap", { n: gaps }))}</p>` : ""}`;
    }
  } else if (src === "page") {
    srcBody = S.report ? `<p class="fine">${icon("file-text")} ${esc(S.report.model?.title || S.report.url)}</p>` : `<p>${esc(UT("po.page.none"))}</p>`;
  } else {
    srcBody = `<textarea id="stu-topic" rows="4" dir="auto" placeholder="${esc(UT("po.topic.ph"))}">${esc(S.stu.topic || "")}</textarea>
      <label class="fld">${esc(UT("po.topic.link"))}<input id="stu-tlink" type="url" value="${esc(S.stu.tlink || "")}" placeholder="https://"></label>`;
  }
  const drafts = (S.posts || []).filter((p) => (p.status === "draft" || p.id === S.stu.focus) && (!site || !p.site || p.site === site.origin)).sort((a, b) => (b.id === S.stu.focus) - (a.id === S.stu.focus) || b.created - a.created);
  return `<section class="block"><h2>${esc(UT("po.src"))}</h2>
      <div class="seg small">${["q", "page", "topic"].map((k) => `<button class="${src === k ? "on" : ""}" data-act="stusrc:${k}">${esc(UT("po.src." + k))}</button>`).join("")}</div>
      ${srcBody}
      <h3>${esc(UT("po.plats"))}</h3>
      <div class="chips">${POST_PLATFORMS.map((p) => `<button class="chip-t ${plats.includes(p) ? "on" : ""}" aria-pressed="${plats.includes(p)}" data-act="stuplat:${p}">${esc(PNAME[p])}</button>`).join("")}</div>
      <label class="tgl"><input type="checkbox" id="stu-utm" ${S.stu.utm ? "checked" : ""}><span>${esc(UT("po.utm"))}</span></label>
      <label class="tgl"><input type="checkbox" id="stu-label" ${S.stu.aiLabel ? "checked" : ""}><span>${esc(UT("po.label"))}</span></label>
      <p class="fine">${esc(UT("po.label.d"))}</p>
      <button class="btn primary" data-act="stumake" ${src === "q" && !m || src === "page" && !S.report ? "disabled" : ""}>${icon("wand-sparkles")}<span>${esc(UT("po.make"))}</span></button>
    </section>
    <section class="block"><h2>${esc(UT("po.drafts"))}</h2>${drafts.length ? drafts.map((p) => postCard(p, site)).join("") : `<p class="fine">${esc(UT("po.none"))}</p>`}
      <p class="fine">${esc(UT("po.limits"))}</p></section>`;
}
function postStatus(p) {
  if (p.status === "posted") return UT("po.st.posted", { when: fmtDay(p.postedAt) });
  if (p.status === "scheduled") return p.when <= Date.now() ? UT("po.st.due") : UT("po.st.scheduled", { when: fmtWhen(p.when) });
  return UT("po.st.draft");
}
function postCard(p, site, compact = false) {
  const R = SRULES[p.plat] || SRULES.facebook;
  const n = countFor(p.plat, p.text);
  const comp = composer(p.plat, p.text, p.link);
  const plat = PNAME[p.plat];
  const checks = checkDraft(p.plat, p.text, site, p.base);
  const due = p.status === "scheduled" && p.when <= Date.now();
  const ck = (c) => {
    const key = "ck." + c.id + (c.ok || c.info ? "" : ".bad");
    return `<li class="${c.info ? "info" : c.ok ? "ok" : "bad"}">${icon(c.info ? "info" : c.ok ? "check" : "x")}<span>${esc(UT(key, { ...c.vars, platform: plat }))}</span></li>`;
  };
  if (compact) return `<article class="post compact${due ? " due" : ""}"><header><b>${esc(plat)}</b><span class="st">${esc(postStatus(p))}</span></header><p dir="auto">${esc(p.text.split("\n")[0].slice(0, 140))}</p>
      <div class="row2"><button class="btn primary xs" data-act="stupost:${p.id}">${icon("send")}<span>${esc(UT("po.open", { platform: plat }))}</span></button>${copyBtn(p.text)}${p.status !== "posted" ? `<button class="btn ghost xs" data-act="studone:${p.id}">${icon("check")}<span>${esc(UT("po.posted"))}</span></button>` : ""}</div></article>`;
  return `<article class="post${due ? " due" : ""}" id="post-${p.id}"><header><b>${esc(plat)}</b>${p.ai ? `<span class="chip">AI</span>` : ""}<span class="st">${esc(postStatus(p))}</span></header>
    <textarea id="pt-${p.id}" data-pid="${p.id}" rows="${Math.min(14, Math.max(4, p.text.split("\n").length + 2))}" dir="auto">${esc(p.text)}</textarea>
    <div class="cnt-row"><span id="pc-${p.id}" class="cnt ${n > R.post ? "bad" : ""}">${n} / ${R.post}</span></div>
    <ul class="ck">${checks.map(ck).join("")}</ul>
    ${p.alt ? `<details class="alt"><summary>${esc(UT("po.alt"))}</summary><pre dir="auto">${esc(p.alt)}</pre>${copyBtn(p.alt)}</details>` : ""}
    <div class="row2"><button class="btn primary sm" data-act="stupost:${p.id}">${icon("send")}<span>${esc(UT("po.open", { platform: plat }))}</span></button>${copyBtn(p.text, UT("po.copy"), "btn line sm")}
      ${S.ai?.state === "available" && !pol("disableOnDeviceAI") ? `<button class="btn ghost sm" data-act="stuai:${p.id}" ${S.stu.busy === p.id ? "disabled" : ""}>${icon(S.stu.busy === p.id ? "loader-circle" : "sparkles", S.stu.busy === p.id ? "spin" : "")}<span>${esc(UT(S.stu.busy === p.id ? "po.ai.run" : "po.ai"))}</span></button>` : ""}</div>
    <p class="fine">${esc(UT("po.open." + comp.fill, { platform: plat }))}</p>
    <div class="row2 sched"><label>${esc(UT("po.sched"))} <input type="datetime-local" id="ps-${p.id}" value="${toLocalInput(p.when || Date.now() + 864e5)}"></label><button class="btn ghost sm" data-act="stusched:${p.id}">${icon("bell")}<span>${esc(UT("po.sched.set"))}</span></button></div>
    <div class="row2 minor"><button class="btn ghost xs" data-act="studone:${p.id}">${icon("check")}<span>${esc(UT("po.posted"))}</span></button>${p.text !== p.tpl ? `<button class="btn ghost xs" data-act="stureset:${p.id}">${icon("history")}<span>${esc(UT("po.reset"))}</span></button>` : ""}<button class="btn ghost xs" data-act="studel:${p.id}">${icon("trash-2")}<span>${esc(UT("po.del"))}</span></button></div></article>`;
}
function newPost(plat, base, site) {
  const d = draftFor(plat, base, site, { utm: S.stu.utm, aiLabel: S.stu.aiLabel });
  return { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), plat, base, text: d.text, tpl: d.text, link: d.link, alt: d.alt, ai: false, status: "draft", when: 0, postedAt: 0, created: Date.now(), site: site?.origin || "" };
}
function savePosts() {
  S.posts = (S.posts || []).sort((a, b) => b.created - a.created).slice(0, 200);
  save({ posts: S.posts });
  chrome.runtime.sendMessage({ type: "sada:posts" }).catch(() => {});
}
function currentBase(site) {
  const L = site?.lang && ["en", "fr", "de", "ar"].includes(site.lang) ? site.lang : S.lang;
  if (S.stu.src === "q") {
    const m = stuMission(site);
    const cov = answeredCov(m);
    const c = cov.find((x) => x.q.id === S.stu.qid) || cov[0];
    return c ? baseFromQuestion(c, site, L) : null;
  }
  if (S.stu.src === "page") return S.report ? baseFromPage(S.report, S.page, site, L) : null;
  const t = (document.getElementById("stu-topic")?.value ?? S.stu.topic ?? "").trim();
  const l = (document.getElementById("stu-tlink")?.value ?? S.stu.tlink ?? "").trim();
  S.stu.topic = t;
  S.stu.tlink = l;
  // without a link of its own, a topic post points to the website's home page
  return t ? baseFromTopic(t, l || (site?.origin ? site.origin + "/" : ""), L) : null;
}

// ── plan ────────────────────────────────────────────────────────────────────
// one card per moment: the post's first line once, then one row per platform
function planGroups(list) {
  const groups = [];
  for (const p of list) {
    const k = Math.round((p.when || p.postedAt || 0) / 36e5) + "|" + (p.base?.hook || p.text.split("\n")[0]);
    let g = groups.find((x) => x.k === k);
    if (!g) groups.push(g = { k, when: p.when, hook: p.base?.hook || p.text.split("\n")[0], items: [] });
    g.items.push(p);
  }
  return groups.map((g) => `<article class="post compact${g.when <= Date.now() ? " due" : ""}"><header><b>${esc(fmtWhen(g.when))}</b></header><p dir="auto">${esc(String(g.hook).slice(0, 160))}</p>
    <ul class="pg">${g.items.map((p) => `<li><b>${esc(PNAME[p.plat])}</b><button class="btn primary xs" data-act="stupost:${p.id}">${icon("send")}<span>${esc(UT("po.openShort"))}</span></button>${copyBtn(p.text)}<button class="btn ghost xs" data-act="studone:${p.id}" title="${esc(UT("po.posted"))}">${icon("check")}</button><button class="btn ghost xs" data-act="stuedit:${p.id}" title="${esc(UT("po.drafts"))}">${icon("file-text")}</button></li>`).join("")}</ul></article>`).join("");
}
function stuPlan(site) {
  const now = Date.now();
  const mine = (S.posts || []).filter((p) => !site || !p.site || p.site === site.origin);
  const due = mine.filter((p) => p.status === "scheduled" && p.when <= now).sort((a, b) => a.when - b.when);
  const next = mine.filter((p) => p.status === "scheduled" && p.when > now).sort((a, b) => a.when - b.when);
  const done = mine.filter((p) => p.status === "posted").sort((a, b) => b.postedAt - a.postedAt).slice(0, 8);
  const lastBy = {};
  for (const p of mine.filter((x) => x.status === "posted")) if (!lastBy[p.plat] || p.postedAt > lastBy[p.plat]) lastBy[p.plat] = p.postedAt;
  const days = [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const x = new Date(2026, 0, 4 + d);
    let name = "";
    try {
      name = new Intl.DateTimeFormat(S.lang === "ar" ? "ar-TN" : S.lang, { weekday: "long" }).format(x);
    } catch {
      name = String(d);
    }
    return [d, name];
  });
  const pl = S.stu.plan;
  const m = stuMission(site);
  return `${due.length ? `<section class="block due-box"><h2>${icon("bell")} ${esc(UT("pl.due"))}</h2>${planGroups(due)}</section>` : ""}
    <section class="block"><h2>${esc(UT("pl.next"))}</h2>${next.length ? planGroups(next.slice(0, 60)) : `<p class="fine">${esc(UT("pl.none"))}</p>`}</section>
    <section class="block"><h2>${esc(UT("pl.make.h"))}</h2><p class="fine">${esc(UT("pl.make.d"))}</p>
      ${m ? `<div class="plan-f"><label class="fld">${esc(UT("pl.weeks"))}<select id="pl-weeks">${[2, 4, 8, 12].map((w) => `<option ${pl.weeks === w ? "selected" : ""}>${w}</option>`).join("")}</select></label>
        <label class="fld">${esc(UT("pl.day"))}<select id="pl-day">${days.map(([d, n]) => `<option value="${d}" ${pl.day === d ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
        <label class="fld">${esc(UT("pl.time"))}<input id="pl-time" type="time" value="${esc(pl.time)}"></label></div>
        <div class="chips">${POST_PLATFORMS.map((p) => `<button class="chip-t ${(S.stu.plats || defaultPlats(site)).includes(p) ? "on" : ""}" data-act="stuplat:${p}">${esc(PNAME[p])}</button>`).join("")}</div>
        <button class="btn primary" data-act="stuplan">${icon("calendar")}<span>${esc(UT("pl.make"))}</span></button>
        <p class="fine">${icon("bell")} ${esc(UT("pl.notif"))}</p>` : `<p>${esc(UT("pl.noq"))}</p><button class="btn line sm" data-act="go:agent">${icon("play")}<span>${esc(UT("po.q.go"))}</span></button>`}
      <p class="fine">${icon("info")} ${esc(UT("pl.closed"))}</p></section>
    ${done.length || Object.keys(lastBy).length ? `<section class="block"><h2>${esc(UT("pl.done"))}</h2>
      <ul class="ticks">${Object.entries(lastBy).map(([k, t]) => `<li>${esc(UT("pl.streak", { platform: PNAME[k], when: fmtDay(t) }))}</li>`).join("")}</ul>
      ${done.map((p) => postCard(p, site, true)).join("")}</section>` : ""}`;
}

// ── watch ───────────────────────────────────────────────────────────────────
function watchTargets() {
  const skip = new Set(S.watch.skip || []);
  const sites = ownOrigins().filter((o) => !skip.has(o));
  const channels = Object.values(S.channels || {}).filter((c) => c.site && c.url && !skip.has(c.url)).map((c) => c.url);
  return { sites, channels };
}
function syncWatch() {
  const w = { ...S.watch, targets: watchTargets() };
  save({ watch: w });
  chrome.runtime.sendMessage({ type: "sada:watch" }).catch(() => {});
}
async function mayFetch(u) {
  try {
    return await chrome.permissions.contains({ origins: [new URL(u).origin + "/*"] });
  } catch {
    return false;
  }
}
async function watchPerms() {
  const t = watchTargets();
  const out = {};
  for (const u of [...ownOrigins(), ...Object.values(S.channels || {}).filter((c) => c.site).map((c) => c.url)]) out[u] = await mayFetch(u);
  S.wPerm = out;
  void t;
  render();
}
async function watchNow() {
  S.stu.busy = "watch";
  render();
  try {
    const st = await chrome.storage.local.get(["watchSnaps", "watchAlerts", "watchHist"]);
    const r = await runWatch(watchTargets(), st.watchSnaps || {}, mayFetch);
    const m = mergeWatch(r, st);
    await chrome.storage.local.set(m);
    Object.assign(S, { wSnaps: m.watchSnaps, wAlerts: m.watchAlerts, wHist: m.watchHist, wLast: m.watchLast });
  } finally {
    S.stu.busy = "";
    render();
  }
}
function stuWatch(site) {
  const t = { sites: ownOrigins(), channels: Object.values(S.channels || {}).filter((c) => c.site) };
  const skip = new Set(S.watch.skip || []);
  const empty = !t.sites.length && !t.channels.length;
  const snap = (u) => S.wSnaps?.[u];
  const permRow = (u) => S.wPerm && S.wPerm[u] === false ? `<span class="fine warn">${esc(UT("wa.noperm"))}</span><button class="btn line xs" data-act="stuwallow:${esc(u)}">${esc(UT("wa.allow"))}</button>` : "";
  const siteRow = (o) => {
    const s = snap(o);
    return `<li class="wrow"><label class="tgl"><input type="checkbox" data-act="stuwskip:${esc(o)}" ${skip.has(o) ? "" : "checked"}><span><b>${esc(hostOf(o))}</b></span></label>
      <span class="fine">${s ? (s.ok ? `${icon("circle-check")} ${esc(fmtWhen(s.at))}` : `${icon("circle-x")} ${s.status || "–"}`) : esc(UT("wa.never"))}</span>${permRow(o)}</li>`;
  };
  const chRow = (c) => {
    const s = snap(c.url);
    const cnt = s?.counts || {};
    const tr = cnt.followers != null && cnt.posts != null ? UT("wa.trend", { followers: fmtNum(cnt.followers), posts: fmtNum(cnt.posts) }) : cnt.followers != null ? UT("wa.f", { followers: fmtNum(cnt.followers) }) : "";
    return `<li class="wrow"><label class="tgl"><input type="checkbox" data-act="stuwskip:${esc(c.url)}" ${skip.has(c.url) ? "" : "checked"}><span><b>${esc(PNAME[c.platform])}</b> ${esc(c.handle || "")}</span></label>
      <span class="fine">${s ? (s.ok ? esc(tr || fmtWhen(s.at)) : esc(s.status === 404 || s.status === 410 ? UT("wa.gone", { status: s.status }) : UT("wa.wall", { status: s.status === "wall" ? UT("wa.login") : s.status || "–" }))) : esc(UT("wa.never"))}</span>${permRow(c.url)}</li>`;
  };
  const alerts = (S.wAlerts || []).slice(0, 40);
  const sevIc = { bad: "circle-x", warn: "triangle-alert", good: "circle-check", info: "info" };
  return `<section class="block"><h2>${icon("radar")} ${esc(UT("wa.h"))}</h2><p class="fine">${esc(UT("wa.d"))}</p>
      <div class="row2"><button class="btn ${S.watch.on ? "primary" : "line"} sm" data-act="stuwatch" aria-pressed="${S.watch.on}">${icon(S.watch.on ? "bell" : "bell")}<span>${esc(UT(S.watch.on ? "wa.on" : "wa.off"))}</span></button>
        <label class="fld inline">${esc(UT("wa.freq"))}<select id="wa-freq"><option value="daily" ${S.watch.freq === "daily" ? "selected" : ""}>${esc(UT("wa.daily"))}</option><option value="weekly" ${S.watch.freq !== "daily" ? "selected" : ""}>${esc(UT("wa.weekly"))}</option></select></label></div>
      <label class="tgl"><input type="checkbox" id="wa-notify" ${S.watch.notify !== false ? "checked" : ""}><span>${esc(UT("wa.notify"))}</span></label>
      <div class="row2"><button class="btn line sm" data-act="stuwnow" ${S.stu.busy === "watch" || empty ? "disabled" : ""}>${icon(S.stu.busy === "watch" ? "loader-circle" : "refresh-cw", S.stu.busy === "watch" ? "spin" : "")}<span>${esc(UT(S.stu.busy === "watch" ? "wa.run" : "wa.now"))}</span></button>
        <span class="fine">${esc(S.wLast ? UT("wa.last", { when: fmtWhen(S.wLast) }) : UT("wa.never"))}</span></div></section>
    <section class="block">${empty ? `<p>${esc(UT("wa.none"))}</p>` : `${t.sites.length ? `<h3>${esc(UT("wa.sites"))}</h3><ul class="wlist">${t.sites.map(siteRow).join("")}</ul>` : ""}
      ${t.channels.length ? `<h3>${esc(UT("wa.channels"))}</h3><ul class="wlist">${t.channels.map(chRow).join("")}</ul>` : ""}`}</section>
    <section class="block"><h2>${esc(UT("wa.alerts"))}</h2>${alerts.length ? `<ul class="alerts">${alerts.map((a) => `<li class="sev-${a.sev}">${icon(sevIc[a.sev] || "info")}<div><b>${esc(hostOf(a.target) + (/^https?:\/\/[^/]+\/./.test(a.target) ? new URL(a.target).pathname.replace(/\/$/, "") : ""))}</b><span>${esc(wt(S.lang, a.k, a.v))}</span><span class="fine">${esc(fmtWhen(a.at))}</span></div></li>`).join("")}</ul>
      <button class="btn ghost xs" data-act="stuwclear">${icon("trash-2")}<span>${esc(UT("wa.clear"))}</span></button>` : `<p class="fine">${esc(UT("wa.noalerts"))}</p>`}</section>
    <p class="fine center">${icon("lock")} ${esc(UT("wa.private"))} ${esc(UT("wa.closed"))}</p>`;
}

// ── website ─────────────────────────────────────────────────────────────────
function stuWeb(site) {
  if (!site) return `<section class="block"><p>${esc(UT("we.nopage"))}</p><button class="btn primary" data-act="go:agent">${icon("play")}<span>${esc(UT("po.q.go"))}</span></button></section>`;
  const cms = stuCms(site);
  const g = cmsGuide(cms || "", S.lang);
  const admin = cms ? cmsAdmin(cms, site.origin) : "";
  const chans = channelsOf(site).filter((c) => c.url);
  const json = sameAsJsonLd(site, chans.map((c) => c.url));
  const foot = footerLinks(chans);
  const rep = S.report && originOf(S.report.url) === site.origin ? S.report : null;
  const step = (txt) => `<p class="cms-step">${icon("route")} <span>${esc(txt)}</span></p>`;
  return `<section class="block"><h2>${esc(UT("we.h"))}</h2>
      <p>${cms ? esc(UT("we.cms", { cms: CMS_NAME[cms] })) : cms === "" ? esc(UT("we.cms.none")) : esc(UT("we.nopage"))}</p>
      ${admin ? `<a class="btn line sm" target="_blank" rel="noopener" href="${esc(admin)}">${icon("external-link")}<span>${esc(UT("we.cms.open", { cms: CMS_NAME[cms] }))}</span></a>` : ""}
      <p class="fine">${esc(UT("we.vary"))}</p></section>
    <section class="block"><h2>${icon("link")} ${esc(UT("we.t.social"))}</h2><p class="fine">${esc(UT("we.t.social.d"))}</p>
      ${chans.length ? `<div class="kf"><div class="kf-h"><b>${esc(UT("we.jsonld"))}</b>${copyBtn(json)}<button class="btn ghost xs" data-act="studl:${cref(json)}">${icon("download")}<span>${esc(UT("stu.dl"))}</span></button></div><pre class="kf-t code">${esc(json)}</pre></div>
      ${step(g.code)}
      <div class="kf"><div class="kf-h"><b>${esc(UT("we.footer"))}</b>${copyBtn(foot)}</div><pre class="kf-t code">${esc(foot)}</pre></div>
      ${step(g.social)}` : `<p>${esc(UT("we.nochan"))}</p>`}</section>
    <section class="block"><h2>${icon("file-text")} ${esc(UT("we.t.meta"))}</h2>
      ${rep ? `<p class="fine">${esc(UT("we.now", { v: rep.model?.title || UT("we.missing") }))}</p><p class="fine">${esc(UT("we.now", { v: rep.model?.metaDescription || UT("we.missing") }))}</p>` : ""}
      ${step(g.meta)}</section>
    <section class="block"><h2>${icon("file-code")} ${esc(UT("we.t.code"))}</h2>${step(g.code)}</section>
    <section class="block"><h2>${icon("bot")} ${esc(UT("we.t.robots"))}</h2>${step(g.robots)}
      <p class="fine">${esc(UT("we.pack.d"))}</p><button class="btn line sm" data-act="go:agent">${icon("file-archive")}<span>${esc(UT("we.pack"))}</span></button></section>`;
}

// ── actions ─────────────────────────────────────────────────────────────────
async function askNotify() {
  try {
    if (await chrome.permissions.contains({ permissions: ["notifications"] })) return true;
    return await chrome.permissions.request({ permissions: ["notifications"] });
  } catch {
    return false;
  }
}
var stuActs = {
  stu: (sec) => {
    S.tab = "studio";
    S.settings = false;
    S.trust = false;
    if (sec) S.stu.sec = sec;
    S.stu.ch = "";
    if (S.stu.sec === "watch") {
      S.wSeen = Date.now();
      save({ watchSeen: S.wSeen });
      watchPerms();
    }
    save({ stu: { sec: S.stu.sec, utm: S.stu.utm, aiLabel: S.stu.aiLabel, plats: S.stu.plats, plan: S.stu.plan } });
    render();
  },
  stukit: (key) => {
    S.tab = "studio";
    S.stu.sec = "profiles";
    S.stu.ch = key || "";
    render();
    document.getElementById("view")?.scrollTo?.(0, 0);
  },
  stuopen: (url) => {
    if (!/^https:\/\//.test(url)) return;
    chrome.tabs.create({ url });
    // without access to all sites, Chrome only lets Sada read the new tab after a click on its icon: show that banner
    if (!S.allSites) {
      S.tab = "agent";
      render();
    }
  },
  stucopy: (k) => copyText(CP.get(k) || ""),
  studl: (k) => download("sada-structured-data.html", CP.get(k) || "", "text/html"),
  stusrc: (k) => {
    S.stu.src = k;
    render();
  },
  stuq: (id) => {
    S.stu.qid = id;
    render();
  },
  stuplat: (p) => {
    const cur = S.stu.plats || defaultPlats(stuSite());
    S.stu.plats = cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p];
    save({ stu: { sec: S.stu.sec, utm: S.stu.utm, aiLabel: S.stu.aiLabel, plats: S.stu.plats, plan: S.stu.plan } });
    render();
  },
  stumake: () => {
    const site = stuSite();
    const base = currentBase(site);
    if (!base) return flash(UT(S.stu.src === "q" ? "po.q.none" : S.stu.src === "page" ? "po.page.none" : "po.topic.ph"));
    const plats = S.stu.plats || defaultPlats(site);
    const made = plats.map((p) => newPost(p, base, site));
    S.posts = [...made, ...S.posts || []];
    savePosts();
    gain(5, UT("po.drafts"), "drafts", { cap: 3 });
    render();
  },
  stuai: async (id) => {
    const p = S.posts.find((x) => x.id === id);
    if (!p) return;
    const site = stuSite();
    S.stu.busy = id;
    render();
    try {
      const r = await withTimeout(ask(postPrompt(p.plat, p.base, site, p), p.base.lang || S.lang), 9e4);
      const t = fitAiPost(p.plat, r.text, p.link);
      if (t.length > 20) {
        p.text = S.stu.aiLabel && !t.includes(AI_LABEL[p.base.lang || "en"]) ? t + "\n\n" + AI_LABEL[p.base.lang || "en"] : t;
        p.ai = true;
        savePosts();
      }
    } catch {
      flash(UT("kit.ai.fail"));
    } finally {
      S.stu.busy = "";
      render();
    }
  },
  stuedit: (id) => {
    S.stu.sec = "posts";
    S.stu.focus = id;
    render();
    setTimeout(() => document.getElementById("post-" + id)?.scrollIntoView({ behavior: "smooth" }), 80);
  },
  stureset: (id) => {
    const p = S.posts.find((x) => x.id === id);
    if (!p) return;
    p.text = p.tpl;
    p.ai = false;
    savePosts();
    render();
  },
  stupost: async (id) => {
    const p = S.posts.find((x) => x.id === id);
    if (!p) return;
    const ta = document.getElementById("pt-" + id);
    if (ta) p.text = ta.value;
    const c = composer(p.plat, p.text, p.link);
    try {
      await navigator.clipboard.writeText(p.text);
    } catch {}
    if (c.url) chrome.tabs.create({ url: c.url });
    flash(c.fill === "text" ? UT("po.open.text", { platform: PNAME[p.plat] }) : UT("stu.copied"));
    savePosts();
  },
  stusched: async (id) => {
    const ok = await askNotify();
    const p = S.posts.find((x) => x.id === id);
    if (!p) return;
    const v = document.getElementById("ps-" + id)?.value;
    const when = v ? new Date(v).getTime() : 0;
    if (!when || isNaN(when)) return;
    p.when = when;
    p.status = "scheduled";
    savePosts();
    flash(UT("po.st.scheduled", { when: fmtWhen(when) }) + (ok ? "" : " · " + UT("pl.closed")));
    render();
  },
  studone: (id) => {
    const p = S.posts.find((x) => x.id === id);
    if (!p) return;
    p.status = "posted";
    p.postedAt = Date.now();
    savePosts();
    gain(10, PNAME[p.plat], "posted:" + p.id, { ever: true });
    render();
  },
  studel: (id) => {
    S.posts = S.posts.filter((x) => x.id !== id);
    savePosts();
    render();
  },
  stukitai: async (key) => {
    const c = S.channels[key];
    if (!c) return;
    const site = stuSite();
    const L = site?.lang && ["en", "fr", "de", "ar"].includes(site.lang) ? site.lang : S.lang;
    const max = PLATFORMS[c.platform]?.bio || 150;
    S.stu.busy = "kit";
    render();
    try {
      const r = await withTimeout(ask(bioPrompt(c.platform, site, L, max), L), 9e4);
      const lines = r.text.split(/\n+/).map((l) => l.replace(/^\s*\d[).:]\s*/, "").replace(/^["“]|["”]$/g, "").trim()).filter((l) => l.length > 15).map((l) => graphemes(l) > max ? cutText(l, max) : l).slice(0, 3);
      if (lines.length) S.stu.kitAi[key] = lines;
      else flash(UT("kit.ai.fail"));
    } catch {
      flash(UT("kit.ai.fail"));
    } finally {
      S.stu.busy = "";
      render();
    }
  },
  stuplan: async () => {
    const ok = await askNotify();
    const site = stuSite();
    const m = stuMission(site);
    const cov = answeredCov(m);
    if (!cov.length) return flash(UT("pl.noq"));
    const weeks = parseInt(document.getElementById("pl-weeks")?.value || "4", 10);
    const day = parseInt(document.getElementById("pl-day")?.value || "2", 10);
    const time = document.getElementById("pl-time")?.value || "10:00";
    S.stu.plan = { weeks, day, time };
    const plats = S.stu.plats || defaultPlats(site);
    const L = site?.lang && ["en", "fr", "de", "ar"].includes(site.lang) ? site.lang : S.lang;
    const slots = planSlots(weeks, day, time);
    const made = [];
    slots.forEach((when, i) => {
      const base = baseFromQuestion(cov[i % cov.length], site, L);
      plats.forEach((pl, k) => {
        const p = newPost(pl, base, site);
        p.status = "scheduled";
        p.when = when + k * 6e4;
        made.push(p);
      });
    });
    S.posts = [...made, ...S.posts || []];
    savePosts();
    save({ stu: { sec: S.stu.sec, utm: S.stu.utm, aiLabel: S.stu.aiLabel, plats: S.stu.plats, plan: S.stu.plan } });
    flash(UT("pl.made", { n: made.length }) + (ok ? "" : " · " + UT("pl.closed")));
    render();
  },
  stuwatch: async () => {
    if (!S.watch.on && S.watch.notify !== false) await askNotify();
    S.watch.on = !S.watch.on;
    syncWatch();
    if (S.watch.on && !S.wLast) watchNow();
    render();
  },
  stuwnow: () => watchNow(),
  stuwclear: () => {
    S.wAlerts = [];
    save({ watchAlerts: [] });
    render();
  },
  stuwskip: (u) => {
    const sk = new Set(S.watch.skip || []);
    if (sk.has(u)) sk.delete(u);
    else sk.add(u);
    S.watch.skip = [...sk];
    syncWatch();
    render();
  },
  stuwallow: async (u) => {
    let o;
    try {
      o = new URL(u).origin;
    } catch {
      return;
    }
    const isSocial = !!detectSocial(u);
    const ok = await chrome.permissions.request({ origins: isSocial ? SOCIAL_ORIGINS : [o + "/*"] }).catch(() => false);
    if (ok) watchPerms();
  }
};
var cutText = (s, max) => {
  const arr = [...String(s)];
  if (arr.length <= max) return s;
  const cut = arr.slice(0, max - 1).join("");
  // end on a full sentence when that keeps most of the text; otherwise on a whole word
  const m = /^[\s\S]*[.!?؟。](?=\s)/u.exec(cut);
  return m && m[0].length >= max * 0.5 ? m[0] : cut.replace(/\s+\S*$/, "") + "…";
};
document.addEventListener("input", (e2) => {
  const el = e2.target;
  if (el?.dataset?.pid) {
    const p = (S.posts || []).find((x) => x.id === el.dataset.pid);
    if (!p) return;
    p.text = el.value;
    const c = document.getElementById("pc-" + p.id);
    if (c) {
      const n = countFor(p.plat, p.text), max = (SRULES[p.plat] || SRULES.facebook).post;
      c.textContent = `${n} / ${max}`;
      c.classList.toggle("bad", n > max);
    }
    clearTimeout(savePosts.t);
    savePosts.t = setTimeout(() => save({ posts: S.posts }), 600);
  }
  if (el?.id === "stu-topic") S.stu.topic = el.value;
  if (el?.id === "stu-tlink") S.stu.tlink = el.value;
});
document.addEventListener("change", (e2) => {
  const el = e2.target;
  if (el?.dataset?.pid) render();
  if (el?.id === "stu-utm") S.stu.utm = el.checked;
  if (el?.id === "stu-label") S.stu.aiLabel = el.checked;
  if (el?.id === "stu-site") {
    S.stuSite = el.value;
    S.stu.ch = "";
    render();
  }
  if (el?.id === "wa-freq") {
    S.watch.freq = el.value;
    syncWatch();
  }
  if (el?.id === "wa-notify") {
    S.watch.notify = el.checked;
    syncWatch();
  }
  if (el?.id === "pl-time" || el?.id === "pl-day" || el?.id === "pl-weeks") {
    S.stu.plan = { weeks: parseInt(document.getElementById("pl-weeks")?.value || "4", 10), day: parseInt(document.getElementById("pl-day")?.value || "2", 10), time: document.getElementById("pl-time")?.value || "10:00" };
  }
});
chrome.storage.onChanged.addListener((ch, area) => {
  if (area !== "local") return;
  let hit = false;
  if (ch.watchAlerts) { S.wAlerts = ch.watchAlerts.newValue || []; hit = true; }
  if (ch.watchSnaps) { S.wSnaps = ch.watchSnaps.newValue || {}; hit = true; }
  if (ch.watchLast) { S.wLast = ch.watchLast.newValue || 0; hit = true; }
  if (hit && S.tab === "studio") render();
});
async function loadStudio() {
  const st = await chrome.storage.local.get(["channels", "posts", "watch", "watchAlerts", "watchSnaps", "watchLast", "watchHist", "watchSeen", "stu", "cms"]);
  S.channels = { ...st.channels || {}, ...S.channels };
  S.posts = st.posts || [];
  S.watch = { on: false, freq: "weekly", notify: true, skip: [], ...st.watch || {} };
  S.wAlerts = st.watchAlerts || [];
  S.wSnaps = st.watchSnaps || {};
  S.wLast = st.watchLast || 0;
  S.wHist = st.watchHist || {};
  S.wSeen = st.watchSeen || 0;
  S.cms = st.cms || {};
  if (st.stu) Object.assign(S.stu, { sec: st.stu.sec || "profiles", utm: st.stu.utm !== false, aiLabel: !!st.stu.aiLabel, plats: st.stu.plats || null, plan: { weeks: 4, day: 2, time: "10:00", ...st.stu.plan || {} } });
  // a missed check while Chrome was closed runs now
  const period = S.watch.freq === "daily" ? 864e5 : 7 * 864e5;
  if (S.watch.on && Date.now() - S.wLast > period) setTimeout(() => watchNow().catch(() => {}), 4e3);
}

// apps/extension/src/panel.ts
var TABS = [["agent", "radar"], ["audit", "scan-search"], ["studio", "megaphone"], ["ask", "message-circle"], ["academy", "graduation-cap"], ["pro", "gem"]];
function draw() {
  const app = document.getElementById("app");
  const a = document.activeElement;
  const focus = a && a.id ? { id: a.id, s: a.selectionStart, e: a.selectionEnd } : null;
  const pt = document.getElementById("ptext");
  if (pt) S.pasteText = pt.value;
  const nq = document.getElementById("newq")?.value || "";
  document.documentElement.lang = S.lang;
  document.documentElement.dir = dirOf(S.lang);
  document.documentElement.dataset.theme = S.theme;
  const soc = S.socialMode && !S.trust && !S.settings;
  const body = S.trust ? viewTrust() : S.settings ? viewSettings() : S.tab === "studio" ? viewStudio() : soc && S.tab === "agent" ? viewSocial() : soc && (S.tab === "audit" || S.tab === "ask") ? socialGuard() : S.tab === "audit" ? viewAudit() : S.tab === "ask" ? viewAsk() : S.tab === "academy" ? viewAcademy() : S.tab === "pro" ? viewPro() : viewAgent();
  const h = S.tab === "studio" && !S.trust && !S.settings ? stuSite()?.domain || host() : soc ? hostOf(S.social?.url) : host();
  app.innerHTML = `<header class="top">
      <div class="brand"><svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="4.5"/><path d="M9.5 9.5a9 9 0 0 0 0 13M22.5 9.5a9 9 0 0 1 0 13M5.5 5.5a14.5 14.5 0 0 0 0 21M26.5 5.5a14.5 14.5 0 0 1 0 21"/></svg>
        <div><b>Sada</b><span>${h ? esc(h) : "by AYKA"}</span></div></div>
      <div class="top-act"><button class="icon-btn" data-act="refresh" aria-label="${esc(ST("f.refresh"))}" title="${esc(ST("f.refresh"))}">${icon("refresh-cw", S.busy || S.social?.running ? "spin" : "")}</button><button class="safe-badge" data-act="trust" aria-label="${esc(T("trust.title"))}" title="${esc(T("trust.strip"))}" aria-pressed="${S.trust}">${icon("shield-check")}<span>${esc(ST("safe.badge"))}</span></button>
      <button class="icon-btn" data-act="settings" aria-label="${esc(T("set.title"))}" aria-pressed="${S.settings}">${icon("settings")}</button></div></header>
    <main id="view" class="v-${S.trust ? "trust" : S.settings ? "settings" : S.tab}">${S.tab === "studio" && !S.trust && !S.settings ? "" : staleBar()}${body}</main>
    <nav class="nav" role="tablist" aria-label="Sada">${TABS.map(([k, ic]) => `<button role="tab" aria-selected="${S.tab === k && !S.settings && !S.trust}" class="${S.tab === k && !S.settings && !S.trust ? "on" : ""}" data-act="tab:${k}">${icon(soc && k === "agent" ? "share-2" : ic)}<span>${esc(soc && k === "agent" ? ST("nav.social") : k === "studio" ? UT("nav.studio") : T("nav." + k))}</span>${k === "studio" && duePosts().length + unseenAlerts() ? `<i class="nav-dot">${duePosts().length + unseenAlerts()}</i>` : ""}</button>`).join("")}</nav>
    ${S.toast ? `<div class="toast" role="status">${esc(S.toast)}</div>` : ""}`;
  document.getElementById("view")?.classList.toggle("v-social", soc && S.tab === "agent");
  const nqEl = document.getElementById("newq");
  if (nqEl && nq) nqEl.value = nq;
  if (focus) {
    const el = document.getElementById(focus.id);
    if (el) {
      el.focus();
      try {
        if (focus.s !== null) el.setSelectionRange(focus.s, focus.e);
      } catch {
      }
    }
  }
}
setRenderer(draw);
var top2 = () => window.scrollTo(0, 0);
function go(where) {
  S.settings = false;
  S.trust = false;
  if (where === "audit" || where === "drive" || where === "machine" || where === "heat") {
    S.tab = "audit";
    S.audit = "page";
    render();
    if (where === "heat" && !S.heat) auditActs.heat("");
    if (where === "drive" || where === "machine") setTimeout(() => document.getElementById(where)?.scrollIntoView({ behavior: "smooth" }), 80);
    else top2();
    if (!S.report) runCheck(S.tabId || void 0);
    return;
  }
  if (where === "ask") {
    S.tab = "ask";
    render();
    top2();
    return;
  }
  if (where === "cov") {
    setTimeout(() => document.getElementById("cov")?.scrollIntoView({ behavior: "smooth" }), 50);
    return;
  }
  if (where === "pack") {
    S.tab = "agent";
    render();
    setTimeout(() => document.querySelector(".pack")?.scrollIntoView({ behavior: "smooth" }), 80);
    return;
  }
  S.tab = "agent";
  render();
  top2();
}
var ACTS = {
  ...agentActs,
  ...auditActs,
  ...askActs,
  ...academyActs,
  ...proActs,
  ...socialActs,
  ...stuActs,
  refresh: () => refreshTab(true),
  follow: () => {
    S.follow = !S.follow;
    save({ follow: S.follow });
    render();
  },
  tab: (v) => {
    S.trust = false;
    if (v === "academy" && (S.tab === "academy" && !S.settings || S.ac.view !== "home" && S.ac.view !== "lesson")) {
      S.ac = { view: "home" };
      S.game = null;
    }
    S.tab = v;
    S.settings = false;
    render();
    top2();
    if ((v === "audit" || v === "ask") && !S.report && !S.busy && !S.socialMode) runCheck(S.tabId || void 0);
  },
  settings: () => {
    S.settings = !S.settings;
    S.trust = false;
    if (S.settings) refreshAi();
    render();
    top2();
  },
  trust: () => {
    S.trust = !S.trust;
    S.settings = false;
    render();
    top2();
  },
  go: (v) => go(v)
};
document.addEventListener("click", (e2) => {
  const el = e2.target.closest("[data-act]");
  if (!el || el.disabled) return;
  const a = el.dataset.act || "";
  const k = a.split(":")[0], v = a.slice(a.indexOf(":") + 1);
  if (!ACTS[k]) return;
  e2.preventDefault();
  Promise.resolve(ACTS[k](a.includes(":") ? v : "")).catch((err) => {
    console.error(err);
    flash(String(err?.message || err));
  });
});
document.addEventListener("submit", (e2) => {
  e2.preventDefault();
  if (e2.target.classList.contains("addq")) askActs.addq("");
});
document.addEventListener("change", (e2) => {
  const el = e2.target;
  if (el.id === "lang") {
    S.uiLang = el.value;
    save({ uiLang: el.value });
    S.lang = el.value === "auto" ? detectLang(chrome.i18n?.getUILanguage?.() || navigator.language) : el.value;
    refreshAi();
    render();
  }
  if (el.id === "peng") S.pasteEngine = el.value;
  if (el.id === "brand") {
    S.brand = el.value.trim();
    save({ brand: S.brand });
  }
});
chrome.runtime.onMessage.addListener((m) => {
  if (m?.type === "sada:check") {
    S.settings = false;
    S.tabId = m.tabId;
    runSocial(m.tabId).then((social) => {
      if (!social) runCheck(m.tabId);
    });
  }
});
async function takePasted() {
  const st = await chrome.storage.session.get("pasted").catch(() => ({}));
  const p = st?.pasted;
  if (!p || Date.now() - p.at > 12e4) return;
  await chrome.storage.session.remove("pasted");
  const h = (() => {
    try {
      return new URL(p.url).hostname;
    } catch {
      return "";
    }
  })();
  const map = [[/chatgpt|openai/, "chatgpt"], [/perplexity/, "perplexity"], [/gemini/, "gemini"], [/copilot|bing/, "copilot"], [/claude/, "claude"], [/grok|x\.com/, "grok"], [/mistral/, "lechat"], [/google\./, "aimode"]];
  const eng = map.find(([re]) => re.test(h))?.[1] || S.pasteEngine;
  S.tab = "ask";
  S.settings = false;
  S.pasteEngine = eng;
  if (!S.report && S.mission?.origin) {
  }
  render();
  setTimeout(() => S.auto?.running ? readAnswer(p.text) : readAnswer(p.text, eng), 50);
  flash(T("lab.got", { engine: ENGINES.find((e2) => e2.id === eng)?.name || "AI" }));
}
chrome.storage.onChanged.addListener((ch, area) => {
  if (area !== "session") return;
  if (ch.pasted?.newValue) takePasted();
  if (ch.pasteHint?.newValue) flash(T("ap.select"));
});
chrome.tabs?.onUpdated?.addListener((tabId, info, tab) => {
  if (!tab?.active || !(info.url || info.status === "complete")) return;
  activeTab().then((t) => {
    if (t?.id === tabId) onTabChange(tabId);
  }).catch(() => {
  });
});
chrome.permissions?.onAdded?.addListener(async () => {
  S.allSites = await hasAllSites();
  S.autoSocial = await socialAllowed();
  render();
});
chrome.permissions?.onRemoved?.addListener(async () => {
  S.allSites = await hasAllSites();
  S.autoSocial = await socialAllowed();
  render();
});
chrome.tabs?.onActivated?.addListener(({ tabId }) => onTabChange(tabId));
(async () => {
  await load();
  await loadStudio().catch((e) => console.warn(e));
  const tab = await activeTab().catch(() => null);
  if (tab?.id) {
    S.tabId = tab.id;
    const o = originOf(tab.url);
    if (S.missions[o]) {
      S.mission = S.missions[o];
      S.pack = S.mission.pack || null;
    }
  }
  S.autoSocial = await socialAllowed();
  S.allSites = await hasAllSites();
  S.selfTab = (await chrome.tabs.getCurrent?.().catch(() => null))?.id;
  if (tab?.url && detectSocial(tab.url)) {
    S.socialMode = true;
    S.social = { det: detectSocial(tab.url), url: tab.url };
  }
  render();
  const st = await chrome.storage.session.get("pendingCheck").catch(() => ({}));
  if (st?.pendingCheck && Date.now() - st.pendingCheck.at < 15e3) {
    await chrome.storage.session.remove("pendingCheck");
    S.tabId = st.pendingCheck.tabId;
    if (!await runSocial(st.pendingCheck.tabId)) runCheck(st.pendingCheck.tabId);
  }
  takePasted();
  refreshAi();
  if (S.socialMode && S.autoSocial && !S.social?.res) runSocial(S.tabId, true);
})();
window.__sada = S;
export {
  runCheck as __runCheck,
  S as __state
};
