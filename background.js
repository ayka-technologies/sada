import { runWatch, mergeWatch, wt } from "./lib/watch.js";
import { composer, PNAME } from "./lib/studio.js";
(() => {
  // apps/extension/src/background.ts
  var MENU = "sada-answer";
  var TITLES = { en: "Send this AI answer to Sada", fr: "Envoyer cette r\xE9ponse IA \xE0 Sada", de: "Diese KI-Antwort an Sada senden", ar: "\u0623\u0631\u0633\u0644 \u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0647\u0630\u0647 \u0625\u0644\u0649 \u0635\u062F\u0649" };
  chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {
    });
    const l = String(chrome.i18n?.getUILanguage?.() || "en").slice(0, 2);
    chrome.contextMenus?.removeAll(() => chrome.contextMenus.create({ id: MENU, title: TITLES[l] || TITLES.en, contexts: ["selection"] }));
  });
  chrome.action.onClicked.addListener((tab) => {
    if (!tab || tab.id === void 0) return;
    chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {
    });
    chrome.storage.session.set({ pendingCheck: { tabId: tab.id, at: Date.now() } });
    chrome.runtime.sendMessage({ type: "sada:check", tabId: tab.id }).catch(() => {
    });
  });
  chrome.contextMenus?.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== MENU || !info.selectionText) return;
    if (tab?.windowId !== void 0) chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {
    });
    chrome.storage.session.set({ pasted: { text: String(info.selectionText).slice(0, 2e4), url: info.pageUrl || tab?.url || "", at: Date.now() } });
  });
  var ALARM = "sada-weekly";
  chrome.runtime.onMessage.addListener((m) => {
    if (m?.type !== "sada:reminder" || !chrome.alarms) return;
    if (m.on) chrome.alarms.create(ALARM, { delayInMinutes: 7 * 24 * 60, periodInMinutes: 7 * 24 * 60 });
    else chrome.alarms.clear(ALARM);
  });
  chrome.alarms?.onAlarm.addListener((a) => {
    if (a.name !== ALARM || !chrome.notifications) return;
    const l = String(chrome.i18n?.getUILanguage?.() || "en").slice(0, 2);
    const msg = {
      en: ["Weekly AI visibility check", "Open your site and click Sada: ask the same questions again and see what changed."],
      fr: ["Point hebdomadaire visibilit\xE9 IA", "Ouvrez votre site et cliquez sur Sada : reposez les m\xEAmes questions et voyez ce qui a chang\xE9."],
      de: ["W\xF6chentlicher KI-Sichtbarkeitscheck", "\xD6ffnen Sie Ihre Website und klicken Sie auf Sada: dieselben Fragen erneut stellen und Ver\xE4nderungen sehen."],
      ar: ["\u0641\u062D\u0635 \u0623\u0633\u0628\u0648\u0639\u064A \u0644\u0644\u0638\u0647\u0648\u0631 \u0641\u064A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A", "\u0627\u0641\u062A\u062D \u0645\u0648\u0642\u0639\u0643 \u0648\u0627\u0646\u0642\u0631 \u0639\u0644\u0649 \u0635\u062F\u0649: \u0627\u0637\u0631\u062D \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0646\u0641\u0633\u0647\u0627 \u0645\u062C\u062F\u062F\u064B\u0627 \u0648\u0634\u0627\u0647\u062F \u0645\u0627 \u062A\u063A\u064A\u0651\u0631."]
    };
    const [title, message] = msg[l] || msg.en;
    chrome.notifications.create("sada-week", { type: "basic", iconUrl: "icons/icon128.png", title, message });
  });
  chrome.commands?.onCommand.addListener(async (cmd, tab) => {
    if (cmd !== "send-answer") return;
    const t = tab?.id !== void 0 ? tab : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    if (!t?.id) return;
    if (t.windowId !== void 0) chrome.sidePanel.open({ windowId: t.windowId }).catch(() => {
    });
    try {
      const [r] = await chrome.scripting.executeScript({ target: { tabId: t.id }, func: () => String(window.getSelection?.() || "") });
      const text = String(r?.result || "").trim();
      if (text.length < 20) {
        chrome.storage.session.set({ pasteHint: Date.now() });
        return;
      }
      chrome.storage.session.set({ pasted: { text: text.slice(0, 2e4), url: t.url || "", at: Date.now() } });
    } catch {
      chrome.storage.session.set({ pasteHint: Date.now() });
    }
  });
  // ── Studio: post reminders and Watch (v0.8) ──────────────────────────────
  var WATCH = "sada-watch";
  var POST = "sada-post:";
  async function uiLang() {
    const st = await chrome.storage.local.get("uiLang");
    const l = st.uiLang && st.uiLang !== "auto" ? st.uiLang : String(chrome.i18n?.getUILanguage?.() || "en").slice(0, 2);
    return ["en", "fr", "de", "ar"].includes(l) ? l : "en";
  }
  async function may(u) {
    try {
      return await chrome.permissions.contains({ origins: [new URL(u).origin + "/*"] });
    } catch {
      return false;
    }
  }
  async function scheduleWatch() {
    const { watch } = await chrome.storage.local.get("watch");
    await chrome.alarms.clear(WATCH);
    if (!watch?.on) return;
    const period = watch.freq === "daily" ? 24 * 60 : 7 * 24 * 60;
    chrome.alarms.create(WATCH, { delayInMinutes: 5, periodInMinutes: period });
  }
  async function schedulePosts() {
    const { posts } = await chrome.storage.local.get("posts");
    const all = await chrome.alarms.getAll();
    for (const a of all) if (a.name.startsWith(POST)) await chrome.alarms.clear(a.name);
    const now = Date.now();
    for (const p of posts || []) if (p.status === "scheduled" && p.when > now) chrome.alarms.create(POST + p.id, { when: p.when });
  }
  async function doWatch() {
    const st = await chrome.storage.local.get(["watch", "watchSnaps", "watchAlerts", "watchHist"]);
    if (!st.watch?.on) return;
    const r = await runWatch(st.watch.targets || { sites: [], channels: [] }, st.watchSnaps || {}, may);
    await chrome.storage.local.set(mergeWatch(r, st));
    const important = r.alerts.filter((a) => a.sev === "bad" || a.sev === "warn");
    if (important.length && st.watch.notify !== false && chrome.notifications) {
      const L = await uiLang();
      chrome.notifications.create("sada-watch-" + Date.now(), { type: "basic", iconUrl: "icons/icon128.png", title: wt(L, "title"), message: important.length === 1 ? wt(L, important[0].k, important[0].v) : wt(L, "n", { n: important.length }) });
    }
  }
  async function duePost(id) {
    const { posts } = await chrome.storage.local.get("posts");
    const p = (posts || []).find((x) => x.id === id);
    if (!p || p.status !== "scheduled" || !chrome.notifications) return;
    const L = await uiLang();
    chrome.notifications.create(POST + id, { type: "basic", iconUrl: "icons/icon128.png", title: wt(L, "due", { platform: PNAME[p.plat] || p.plat }), message: wt(L, "dueMsg", { first: String(p.text || "").split("\n")[0].slice(0, 90) }), requireInteraction: true });
  }
  chrome.runtime.onMessage.addListener((m) => {
    if (m?.type === "sada:watch") scheduleWatch();
    if (m?.type === "sada:posts") schedulePosts();
  });
  chrome.alarms?.onAlarm.addListener((a) => {
    if (a.name === WATCH) doWatch().catch(() => {});
    if (a.name.startsWith(POST)) duePost(a.name.slice(POST.length)).catch(() => {});
  });
  chrome.notifications?.onClicked?.addListener(async (nid) => {
    if (!nid.startsWith(POST)) return;
    const { posts } = await chrome.storage.local.get("posts");
    const p = (posts || []).find((x) => x.id === nid.slice(POST.length));
    chrome.notifications.clear(nid);
    if (!p) return;
    const c = composer(p.plat, p.text, p.link);
    if (c.url) chrome.tabs.create({ url: c.url });
  });
  chrome.runtime.onStartup?.addListener(() => {
    scheduleWatch().catch(() => {});
    schedulePosts().catch(() => {});
  });
  chrome.runtime.onInstalled.addListener(() => {
    scheduleWatch().catch(() => {});
    schedulePosts().catch(() => {});
  });
})();
