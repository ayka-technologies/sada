// Sada · Watch: re-checks your own website and public channel pages on a schedule,
// on this computer, and reports what changed. Used by the panel and by the
// background service worker (module). No server, no accounts, no logged-in pages.

export const SEARCH_BOTS = ["Googlebot", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Claude-SearchBot"];
export const TRAIN_BOTS = ["GPTBot", "ClaudeBot", "Google-Extended", "CCBot", "Applebot-Extended", "meta-externalagent"];

// ── robots.txt ──────────────────────────────────────────────────────────────
export function parseRobots(txt) {
  const groups = [];
  let cur = null, lastUa = false;
  for (const raw of String(txt || "").split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === "user-agent") {
      if (!lastUa || !cur) { cur = { ua: [], rules: [] }; groups.push(cur); }
      cur.ua.push(v.toLowerCase());
      lastUa = true;
    } else if ((k === "allow" || k === "disallow") && cur) {
      cur.rules.push({ allow: k === "allow", path: v });
      lastUa = false;
    } else lastUa = false;
  }
  return groups;
}
export function allowed(groups, ua, path = "/") {
  const u = ua.toLowerCase();
  let g = groups.filter((x) => x.ua.some((a) => a !== "*" && u.includes(a)));
  if (!g.length) g = groups.filter((x) => x.ua.includes("*"));
  if (!g.length) return true;
  let best = null;
  for (const r of g.flatMap((x) => x.rules)) {
    if (r.path === "") continue;
    const re = new RegExp("^" + r.path.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
    if (re.test(path) && (!best || r.path.length > best.path.length || r.path.length === best.path.length && r.allow)) best = r;
  }
  return best ? best.allow : true;
}

// ── light HTML reading (no DOM in a service worker) ─────────────────────────
const attr = (tag, name) => (new RegExp(name + `\\s*=\\s*["']([^"']*)["']`, "i").exec(tag) || [])[1] || "";
const unent = (s) => String(s || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x27;/g, "'").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/\s+/g, " ").trim();
export function readHead(html) {
  const h = String(html || "").slice(0, 1500000);
  const metas = h.match(/<meta\b[^>]*>/gi) || [];
  const meta = (key) => {
    for (const t of metas) if ((attr(t, "name") || attr(t, "property")).toLowerCase() === key) return unent(attr(t, "content"));
    return "";
  };
  const title = unent((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(h) || [])[1] || "");
  const robots = (meta("robots") + " " + meta("googlebot")).toLowerCase();
  const ld = [];
  for (const m of h.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { ld.push(JSON.parse(m[1].trim())); } catch { ld.push(null); }
  }
  const types = new Set(), sameAs = new Set();
  const walk = (n) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(walk);
    for (const t of [].concat(n["@type"] || [])) types.add(String(t));
    for (const s of [].concat(n.sameAs || [])) if (typeof s === "string") sameAs.add(s.replace(/\/+$/, "").toLowerCase());
    if (n["@graph"]) walk(n["@graph"]);
  };
  ld.forEach(walk);
  return {
    title, desc: meta("description"), ogTitle: meta("og:title"), ogDesc: meta("og:description"),
    noindex: /noindex/.test(robots), nosnippet: /nosnippet/.test(robots),
    ld: ld.length, ldBad: ld.filter((x) => x === null).length, types: [...types].slice(0, 12), sameAs: [...sameAs].slice(0, 30)
  };
}

// numbers in public preview texts: "8,108 Followers", "6.034 „Gefällt mir“", "1,9K abonnés", "12 ألف متابع"
const NUM = String.raw`(\d[\d.,\s  ]*\d|\d)\s*([KkMm]|Tsd\.?|Mio\.?|k|mil|ألف|مليون)?`;
function toNum(n, suf) {
  let s = String(n).replace(/[\s  ]/g, "");
  if (suf) {
    s = s.replace(",", ".");
    const f = parseFloat(s) || 0;
    return Math.round(f * (/^(m|mio|مليون)/i.test(suf) ? 1e6 : 1e3));
  }
  return parseInt(s.replace(/[.,]/g, ""), 10) || 0;
}
export function readCounts(text) {
  const t = String(text || "");
  const grab = (words) => {
    const m = new RegExp(NUM + String.raw`\s*(?:` + words + ")", "i").exec(t);
    return m ? toNum(m[1], m[2]) : null;
  };
  return {
    followers: grab("followers|follower|abonnés|abonné|abonnent|متابع|متابعين|متابعون"),
    posts: grab("posts|beiträge|publications|منشور|منشورات"),
    likes: grab("likes|„gefällt mir“|gefällt|j’aime|j'aime|إعجاب")
  };
}

// ── snapshots ───────────────────────────────────────────────────────────────
async function get(url, fetcher, ms = 15000) {
  const ctl = new AbortController();
  const tm = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetcher(url, { credentials: "omit", cache: "no-store", redirect: "follow", signal: ctl.signal });
    const body = r.ok ? (await r.text()).slice(0, 1500000) : "";
    return { status: r.status, ok: r.ok, body, url: r.url || url };
  } catch (e) {
    return { status: 0, ok: false, body: "", url, err: String(e?.name || e) };
  } finally {
    clearTimeout(tm);
  }
}
export async function snapshotSite(origin, fetcher = fetch) {
  const [home, rb, ll] = await Promise.all([get(origin + "/", fetcher), get(origin + "/robots.txt", fetcher), get(origin + "/llms.txt", fetcher)]);
  const head = home.ok ? readHead(home.body) : null;
  const groups = rb.ok ? parseRobots(rb.body) : [];
  const bots = {};
  for (const b of [...SEARCH_BOTS, ...TRAIN_BOTS]) bots[b] = rb.ok ? allowed(groups, b, "/") : true;
  return {
    at: Date.now(), kind: "site", target: origin, status: home.status, ok: home.ok,
    title: head?.title || "", desc: head?.desc || "", noindex: !!head?.noindex, nosnippet: !!head?.nosnippet,
    ld: head?.ld || 0, ldBad: head?.ldBad || 0, types: head?.types || [], sameAs: head?.sameAs || [],
    robots: rb.ok ? 1 : 0, bots, llms: ll.ok && /^#|\n#|^\s*[#>-]/.test(ll.body) ? 1 : 0
  };
}
export async function snapshotChannel(url, fetcher = fetch) {
  const r = await get(url, fetcher);
  const head = r.ok ? readHead(r.body) : null;
  const text = `${head?.ogDesc || ""} ${head?.desc || ""}`;
  // a login or sign-up page instead of the profile: nothing to compare
  const wall = r.ok && /(log ?in|sign ?up|anmelden|registrieren|connectez-vous|connexion|inscrivez|تسجيل الدخول|إنشاء حساب)/i.test(`${head?.ogTitle || ""} ${head?.title || ""}`) && !Object.values(readCounts(text)).some((x) => x);
  if (wall) return { at: Date.now(), kind: "channel", target: url, status: "wall", ok: false, title: "", desc: "", counts: {} };
  return { at: Date.now(), kind: "channel", target: url, status: r.status, ok: r.ok, title: head?.ogTitle || head?.title || "", desc: head?.ogDesc || head?.desc || "", counts: readCounts(text) };
}

// ── what changed ────────────────────────────────────────────────────────────
// alert: { k: kind, sev: "bad"|"warn"|"good"|"info", v: vars }
export function diffSite(a, b) {
  const out = [];
  if (!a) return out;
  if (a.ok && !b.ok) out.push({ k: "down", sev: "bad", v: { status: b.status || "–" } });
  if (!a.ok && b.ok) out.push({ k: "up", sev: "good", v: {} });
  if (!b.ok) return out;
  if (!a.noindex && b.noindex) out.push({ k: "noindex", sev: "bad", v: {} });
  if (a.noindex && !b.noindex) out.push({ k: "indexok", sev: "good", v: {} });
  if (!a.nosnippet && b.nosnippet) out.push({ k: "nosnippet", sev: "bad", v: {} });
  const blocked = SEARCH_BOTS.filter((x) => a.bots?.[x] !== false && b.bots?.[x] === false);
  if (blocked.length) out.push({ k: "botblock", sev: "bad", v: { bots: blocked.join(", ") } });
  const freed = SEARCH_BOTS.filter((x) => a.bots?.[x] === false && b.bots?.[x] !== false);
  if (freed.length) out.push({ k: "botfree", sev: "good", v: { bots: freed.join(", ") } });
  const tr = TRAIN_BOTS.filter((x) => (a.bots?.[x] !== false) !== (b.bots?.[x] !== false));
  if (tr.length) out.push({ k: "train", sev: "info", v: { bots: tr.join(", ") } });
  if (a.ld > 0 && b.ld === 0) out.push({ k: "ldgone", sev: "bad", v: {} });
  else if (b.ldBad > a.ldBad) out.push({ k: "ldbad", sev: "warn", v: { n: b.ldBad } });
  const lost = (a.sameAs || []).filter((x) => !(b.sameAs || []).includes(x));
  if (lost.length) out.push({ k: "samelost", sev: "warn", v: { list: lost.slice(0, 3).join(", ") } });
  if (a.desc && !b.desc) out.push({ k: "descgone", sev: "warn", v: {} });
  if (a.title && b.title && a.title !== b.title) out.push({ k: "title", sev: "info", v: { from: a.title.slice(0, 80), to: b.title.slice(0, 80) } });
  if (a.llms && !b.llms) out.push({ k: "llmsgone", sev: "info", v: {} });
  if (!a.llms && b.llms) out.push({ k: "llmsnew", sev: "good", v: {} });
  return out;
}
export function diffChannel(a, b) {
  const out = [];
  if (!a) return out;
  if (a.ok && !b.ok && b.status && b.status !== 999 && b.status !== 429 && b.status !== "wall") out.push({ k: "chdown", sev: "warn", v: { status: b.status } });
  if (!b.ok) return out;
  const strip = (s) => String(s || "").replace(/[\d.,\s ]+(followers|follower|abonnés|following|posts|beiträge|gefolgt|likes|„gefällt mir“|j’aime|متابع\S*)/gi, "").replace(/\s+/g, " ").trim();
  if (a.desc && b.desc && strip(a.desc) !== strip(b.desc)) out.push({ k: "bio", sev: "info", v: { to: b.desc.slice(0, 120) } });
  const f0 = a.counts?.followers, f1 = b.counts?.followers;
  if (f0 && f1 && f1 !== f0) out.push({ k: "followers", sev: f1 > f0 ? "good" : "info", v: { from: f0, to: f1, d: (f1 > f0 ? "+" : "") + (f1 - f0) } });
  const l0 = a.counts?.likes, l1 = b.counts?.likes;
  if (!f0 && !f1 && l0 && l1 && l1 !== l0) out.push({ k: "likes", sev: l1 > l0 ? "good" : "info", v: { from: l0, to: l1, d: (l1 > l0 ? "+" : "") + (l1 - l0) } });
  const p0 = a.counts?.posts, p1 = b.counts?.posts;
  if (p0 != null && p1 != null && p1 > p0) out.push({ k: "newposts", sev: "good", v: { n: p1 - p0 } });
  return out;
}

// ── one run over all targets ────────────────────────────────────────────────
// targets: { sites: [origin], channels: [url] } · snaps: previous snapshots by target
// may(url) → Promise<boolean> (permission) · returns { snaps, alerts, skipped }
export async function runWatch(targets, snaps = {}, may = async () => true, fetcher = fetch) {
  const next = { ...snaps }, alerts = [], skipped = [], done = [];
  for (const o of targets.sites || []) {
    if (!(await may(o))) { skipped.push(o); continue; }
    const s = await snapshotSite(o, fetcher);
    for (const al of diffSite(snaps[o], s)) alerts.push({ ...al, target: o, at: s.at });
    next[o] = s;
    done.push(o);
  }
  for (const u of targets.channels || []) {
    if (!(await may(u))) { skipped.push(u); continue; }
    const s = await snapshotChannel(u, fetcher);
    for (const al of diffChannel(snaps[u], s)) alerts.push({ ...al, target: u, at: s.at });
    // keep the last readable state when the platform answers with a login wall or rate limit
    next[u] = s.ok || !snaps[u] ? s : { ...snaps[u], lastFail: s.status, at: s.at };
    done.push(u);
  }
  return { snaps: next, alerts, skipped, done };
}

// fold one run into what is stored: alerts (newest first), a short history per target
export function mergeWatch(r, st = {}, now = Date.now()) {
  const alerts = [...r.alerts.map((a, i) => ({ ...a, id: now.toString(36) + "-" + i })), ...(st.watchAlerts || [])].slice(0, 150);
  const hist = { ...(st.watchHist || {}) };
  for (const t of r.done || []) {
    const s = r.snaps[t];
    if (!s) continue;
    const h = (hist[t] || []).slice(-59);
    h.push([now, s.ok ? 1 : 0, s.counts?.followers ?? null, s.counts?.posts ?? null]);
    hist[t] = h;
  }
  return { watchSnaps: r.snaps, watchAlerts: alerts, watchHist: hist, watchLast: now, watchSkipped: r.skipped || [] };
}

// ── words for alerts (panel and notifications) ──────────────────────────────
export const WATCH_I18N = {
  en: {
    title: "Sada Watch", n: "Changes on your website or channels: {n}. Open Sada to see them.",
    down: "Not reachable (status {status}).", up: "Reachable again.", noindex: "The home page now says noindex: search engines and AI search will drop it.", indexok: "noindex was removed from the home page.", nosnippet: "The home page now says nosnippet: Google's AI features cannot quote it.",
    botblock: "robots.txt now blocks search bots: {bots}. You will disappear from their answers.", botfree: "robots.txt allows these search bots again: {bots}.", train: "Training-bot rules changed for: {bots}.",
    ldgone: "Structured data (JSON-LD) disappeared from the home page.", ldbad: "{n} structured-data block(s) on the home page are broken JSON.", samelost: "The website no longer lists these channels in sameAs: {list}.", descgone: "The home page lost its meta description.", title: "Home page title changed: “{from}” → “{to}”.",
    llmsgone: "llms.txt is no longer reachable.", llmsnew: "llms.txt is now online.",
    chdown: "The public page answered with status {status}.", bio: "Public preview text changed: “{to}”.", followers: "Followers: {from} → {to} ({d}).", likes: "Likes: {from} → {to} ({d}).", newposts: "{n} new post(s) since the last check.",
    due: "Time to post on {platform}", dueMsg: "“{first}” · Click to open the composer. Text not filled in? Open Sada and copy it."
  },
  de: {
    title: "Sada Watch", n: "Änderungen an Ihrer Website oder Ihren Kanälen: {n}. Öffnen Sie Sada, um sie zu sehen.",
    down: "Nicht erreichbar (Status {status}).", up: "Wieder erreichbar.", noindex: "Die Startseite trägt jetzt noindex: Suchmaschinen und KI-Suche nehmen sie heraus.", indexok: "noindex wurde von der Startseite entfernt.", nosnippet: "Die Startseite trägt jetzt nosnippet: Googles KI-Funktionen dürfen sie nicht zitieren.",
    botblock: "Die robots.txt sperrt jetzt Such-Bots: {bots}. Sie verschwinden aus deren Antworten.", botfree: "Die robots.txt erlaubt diese Such-Bots wieder: {bots}.", train: "Regeln für Trainings-Bots geändert: {bots}.",
    ldgone: "Strukturierte Daten (JSON-LD) sind von der Startseite verschwunden.", ldbad: "{n} Block/Blöcke strukturierter Daten auf der Startseite sind fehlerhaftes JSON.", samelost: "Die Website nennt diese Kanäle nicht mehr in sameAs: {list}.", descgone: "Die Startseite hat ihre Meta-Beschreibung verloren.", title: "Titel der Startseite geändert: „{from}“ → „{to}“.",
    llmsgone: "llms.txt ist nicht mehr erreichbar.", llmsnew: "llms.txt ist jetzt online.",
    chdown: "Die öffentliche Seite antwortete mit Status {status}.", bio: "Öffentlicher Vorschautext geändert: „{to}“.", followers: "Follower: {from} → {to} ({d}).", likes: "„Gefällt mir“-Angaben: {from} → {to} ({d}).", newposts: "{n} neue(r) Beitrag/Beiträge seit der letzten Prüfung.",
    due: "Zeit für einen Beitrag auf {platform}", dueMsg: "„{first}“ · Klicken öffnet das Eingabefenster. Text nicht eingefügt? Sada öffnen und kopieren."
  },
  fr: {
    title: "Sada Veille", n: "Changements sur votre site ou vos chaînes : {n}. Ouvrez Sada pour les voir.",
    down: "Inaccessible (statut {status}).", up: "De nouveau accessible.", noindex: "La page d'accueil indique désormais noindex : moteurs et recherche IA vont la retirer.", indexok: "noindex a été retiré de la page d'accueil.", nosnippet: "La page d'accueil indique désormais nosnippet : les fonctions IA de Google ne peuvent plus la citer.",
    botblock: "robots.txt bloque désormais des robots de recherche : {bots}. Vous disparaissez de leurs réponses.", botfree: "robots.txt autorise de nouveau ces robots de recherche : {bots}.", train: "Règles des robots d'entraînement modifiées : {bots}.",
    ldgone: "Les données structurées (JSON-LD) ont disparu de la page d'accueil.", ldbad: "{n} bloc(s) de données structurées de la page d'accueil sont du JSON invalide.", samelost: "Le site ne cite plus ces chaînes dans sameAs : {list}.", descgone: "La page d'accueil a perdu sa méta-description.", title: "Titre de la page d'accueil modifié : « {from} » → « {to} ».",
    llmsgone: "llms.txt n'est plus accessible.", llmsnew: "llms.txt est maintenant en ligne.",
    chdown: "La page publique a répondu avec le statut {status}.", bio: "Texte d'aperçu public modifié : « {to} ».", followers: "Abonnés : {from} → {to} ({d}).", likes: "J’aime : {from} → {to} ({d}).", newposts: "{n} nouvelle(s) publication(s) depuis la dernière vérification.",
    due: "C'est l'heure de publier sur {platform}", dueMsg: "« {first} » · Cliquez pour ouvrir la fenêtre de publication. Texte absent ? Ouvrez Sada et copiez-le."
  },
  ar: {
    title: "مراقبة صدى", n: "تغييرات على موقعك أو قنواتك: {n}. افتح صدى لمشاهدتها.",
    down: "غير متاح (الحالة {status}).", up: "متاح من جديد.", noindex: "تحمل الصفحة الرئيسية الآن noindex: ستُخرجها محركات البحث وبحث الذكاء الاصطناعي.", indexok: "أُزيل noindex من الصفحة الرئيسية.", nosnippet: "تحمل الصفحة الرئيسية الآن nosnippet: لا يمكن لميزات Google الذكية الاقتباس منها.",
    botblock: "يحجب robots.txt الآن روبوتات بحث: {bots}. ستختفي من إجاباتها.", botfree: "يسمح robots.txt من جديد لروبوتات البحث هذه: {bots}.", train: "تغيّرت قواعد روبوتات التدريب: {bots}.",
    ldgone: "اختفت البيانات المنظّمة (JSON-LD) من الصفحة الرئيسية.", ldbad: "{n} من كتل البيانات المنظّمة في الصفحة الرئيسية JSON غير صالح.", samelost: "لم يعد الموقع يذكر هذه القنوات في sameAs: {list}.", descgone: "فقدت الصفحة الرئيسية وصفها التعريفي.", title: "تغيّر عنوان الصفحة الرئيسية: «{from}» ← «{to}».",
    llmsgone: "لم يعد llms.txt متاحًا.", llmsnew: "أصبح llms.txt متاحًا.",
    chdown: "أجابت الصفحة العامة بالحالة {status}.", bio: "تغيّر نص المعاينة العام: «{to}».", followers: "المتابعون: {from} ← {to} ({d}).", likes: "الإعجابات: {from} ← {to} ({d}).", newposts: "{n} منشور(ات) جديدة منذ آخر فحص.",
    due: "حان وقت النشر على {platform}", dueMsg: "«{first}» · انقر لفتح نافذة النشر. لم يُملأ النص؟ افتح صدى وانسخه."
  }
};
export function wt(lang, k, v = {}) {
  const L = WATCH_I18N[lang] ? lang : "en";
  return String(WATCH_I18N[L][k] ?? WATCH_I18N.en[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => (v[x] ?? ""));
}
