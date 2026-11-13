"use strict";
(() => {
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
    const t = text.trim();
    const reasons = [];
    let score = 0;
    const n = words(t);
    if (n >= 8 && n <= 35) {
      score++;
      reasons.push("length");
    }
    const proper = /\s[A-ZÀ-ÖØ-Þ][\p{L}]{2,}/u.test(" " + t.slice(1));
    if (SPECIFIC.test(t) || proper) {
      score++;
      reasons.push("specific");
    }
    const lg = (lang || "en").slice(0, 2);
    if (!(PRONOUN_START[lg] || PRONOUN_START.en).test(t)) {
      score++;
      reasons.push("standalone");
    }
    if (DEFINES.test(t)) {
      score++;
      reasons.push("states");
    }
    return { text: t, score, quotable: score >= 4 || score === 3 && reasons.includes("specific") && reasons.includes("length"), reasons };
  }

  // apps/extension/src/overlay.ts
  function blocks() {
    const root = document.querySelector("main") || document.querySelector("article") || document.body;
    return Array.from(root.querySelectorAll("p, li, dd, blockquote, td")).filter((el) => {
      if (el.closest("nav, header, footer, aside, form, script, style")) return false;
      const r = el.getBoundingClientRect();
      const all = (el.textContent || "").trim().length;
      const inLinks = Array.from(el.querySelectorAll("a, button")).reduce((n, a) => n + (a.textContent || "").trim().length, 0);
      return r.width > 0 && r.height > 0 && all >= 40 && !el.querySelector("p, li") && inLinks / all <= 0.6;
    });
  }
  function rangesFor(el, lang, good, almost) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let text = "";
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      nodes.push({ node: n, start: text.length });
      text += n.data;
    }
    const at = (pos) => {
      for (let i = nodes.length - 1; i >= 0; i--) if (nodes[i].start <= pos) return { node: nodes[i].node, offset: Math.min(pos - nodes[i].start, nodes[i].node.data.length) };
      return null;
    };
    const seg = new Intl.Segmenter(lang || "en", { granularity: "sentence" });
    let counted = { good: 0, almost: 0, total: 0 };
    for (const s of seg.segment(text)) {
      const sentence = String(s.segment);
      if (sentence.trim().split(/\s+/).length < 4) continue;
      const sc = scoreSentence(sentence, lang);
      counted.total++;
      if (!sc.quotable && sc.score < 3) continue;
      const lead = sentence.length - sentence.trimStart().length;
      const a = at(s.index + lead), b = at(s.index + sentence.trimEnd().length);
      if (!a || !b) continue;
      const r = document.createRange();
      r.setStart(a.node, a.offset);
      r.setEnd(b.node, b.offset);
      if (sc.quotable) {
        good.push(r);
        counted.good++;
      } else {
        almost.push(r);
        counted.almost++;
      }
    }
    return counted;
  }
  window.__sadaHeat = (on, lang) => {
    if (!CSS || !CSS.highlights) return { supported: false };
    CSS.highlights.delete("sada-good");
    CSS.highlights.delete("sada-almost");
    if (!on) return { supported: true, off: true };
    const good = [], almost = [];
    const total = { good: 0, almost: 0, total: 0 };
    for (const el of blocks()) {
      const c = rangesFor(el, lang, good, almost);
      total.good += c.good;
      total.almost += c.almost;
      total.total += c.total;
    }
    CSS.highlights.set("sada-good", new Highlight(...good));
    CSS.highlights.set("sada-almost", new Highlight(...almost));
    if (good[0]) good[0].startContainer.parentElement?.scrollIntoView({ behavior: "smooth", block: "center" });
    return { supported: true, ...total };
  };
})();
