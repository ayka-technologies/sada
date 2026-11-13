// Sada Academy 2026 v2 · sources per lesson (language-independent).
// Research status: 9 November 2026. "via" marks a secondary source that reports the primary one.
const G_GUIDE = { t: "Google Search Central: Optimizing your website for generative AI features", u: "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide", d: "2026-05-15" };
const G_AIF = { t: "Google Search Central: AI features and your website", u: "https://developers.google.com/search/docs/appearance/ai-features", d: "2025-12-10" };
const G_CTRL = { t: "Google: New opportunities, control and insights for website owners", u: "https://blog.google/products-and-platforms/products/search/new-controls-website-owners/", d: "2026-08-31" };
const G_GSC = { t: "Google Search Central blog: Generative AI performance reports", u: "https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports", d: "2026-06-03" };
const G_MODE = { t: "Google: AI Mode update (I/O 2025)", u: "https://blog.google/products-and-platforms/products/search/google-search-ai-mode-update/", d: "2025-05-20" };
const G_PERS = { t: "Google Search Help: Personal Intelligence in AI Mode", u: "https://support.google.com/websearch/answer/16011537", d: "2026" };
const G_SD = { t: "Google: Structured data search gallery", u: "https://developers.google.com/search/docs/appearance/structured-data/search-gallery", d: "2026" };
const G_SPAM = { t: "Google: Spam policies for Google web search", u: "https://developers.google.com/search/docs/essentials/spam-policies", d: "2026" };
const G_L10N = { t: "Google: Localized versions of your pages (hreflang)", u: "https://developers.google.com/search/docs/specialty/international/localized-versions", d: "2026" };
const G_RATER = { t: "Google Search Quality Rater Guidelines (YMYL)", u: "https://guidelines.raterhub.com/searchqualityevaluatorguidelines.pdf", d: "2025" };
const G_LOCAL = { t: "Google Search Central blog: A new resource for optimizing for generative AI", u: "https://developers.google.com/search/blog/2026/05/a-new-resource-for-optimizing", d: "2026-05" };
const OAI = { t: "OpenAI: Overview of OpenAI crawlers", u: "https://developers.openai.com/api/docs/bots", d: "2026-11" };
const ANT = { t: "Search Engine Journal: Anthropic's Claude bots make robots.txt decisions more granular (via)", u: "https://www.searchenginejournal.com/anthropics-claude-bots-make-robots-txt-decisions-more-granular/568253/", d: "2026" };
const PPLX = { t: "Klarivo: robots.txt for AI crawlers, quoting Perplexity docs (via)", u: "https://www.klarivo.ai/blog/robots-txt-for-ai-crawlers", d: "2026" };
const RFC = { t: "IETF RFC 9309: Robots Exclusion Protocol", u: "https://www.rfc-editor.org/rfc/rfc9309", d: "2022-09" };
const CF1 = { t: "Cloudflare: Content Independence Day", u: "https://blog.cloudflare.com/content-independence-day-no-ai-crawl-without-compensation/", d: "2025-07-01" };
const CF2 = { t: "TechCrunch: Cloudflare's new policy pushes AI companies to pay", u: "https://techcrunch.com/2026/07/01/cloudflares-new-policy-pushes-ai-companies-to-pay-for-publishers-content/", d: "2026-07-01" };
const BING = { t: "Search Engine Land: Bing Webmaster Tools AI Performance report (via)", u: "https://searchengineland.com/bing-webmaster-tools-ai-performance-report-468751", d: "2026-02" };
const SPARK = { t: "Search Engine Journal: AI recommendations change with nearly every query (SparkToro)", u: "https://www.searchenginejournal.com/ai-recommendations-change-with-nearly-every-query-sparktoro/566242/", d: "2026-01-28" };
const PEW = { t: "Pew Research Center: Google users are less likely to click when an AI summary appears", u: "https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/", d: "2025-07-22" };
const AHR1 = { t: "Ahrefs: AI Overviews reduce clicks", u: "https://ahrefs.com/blog/ai-overviews-reduce-clicks/", d: "2025-04" };
const AHR2 = { t: "Ahrefs: AI Overviews reduce clicks (update)", u: "https://ahrefs.com/blog/ai-overviews-reduce-clicks-update", d: "2026-02-04" };
const GEO = { t: "Aggarwal et al.: GEO: Generative Engine Optimization (KDD 2024)", u: "https://arxiv.org/abs/2311.09735", d: "2024" };
const SEJ_GUIDE = { t: "Search Engine Journal: Google's AI search guide calls AEO and GEO 'still SEO'", u: "https://www.searchenginejournal.com/googles-new-ai-search-guide-calls-aeo-and-geo-still-seo/575026/", d: "2026-05" };
const SER = { t: "SE Ranking: llms.txt study (~300,000 domains)", u: "https://seranking.com/blog/llms-txt/", d: "2025-11" };
const PEEC = { t: "Search Engine Land: AI search engines cite Reddit, YouTube and LinkedIn most (Peec AI)", u: "https://searchengineland.com/ai-search-engines-cite-reddit-youtube-and-linkedin-most-study-473138", d: "2026" };
const PROF = { t: "Profound: AI platform citation patterns", u: "https://www.tryprofound.com/blog/ai-platform-citation-patterns", d: "2025" };
const FTC = { t: "FTC: Rule on the Use of Consumer Reviews and Testimonials (16 CFR 465)", u: "https://www.ftc.gov/legal-library/browse/rules/rule-use-consumer-reviews-testimonials", d: "2024-10-21" };
const OMNI = { t: "EU Omnibus Directive (EU) 2019/2161", u: "https://eur-lex.europa.eu/eli/dir/2019/2161/oj", d: "2022-05-28" };
const SCHEMA = { t: "schema.org", u: "https://schema.org", d: "2026" };
const WP = { t: "Wikipedia: Notability", u: "https://en.wikipedia.org/wiki/Wikipedia:Notability", d: "2026" };
const WD = { t: "Wikidata: Notability", u: "https://www.wikidata.org/wiki/Wikidata:Notability", d: "2026" };
const FAQ = { t: "Inblog: Google FAQ rich results deprecation, quoting Google's notice (via)", u: "https://inblog.ai/blog/google-faq-schema-rich-result-deprecation", d: "2026-05" };
const IG = { t: "SEOZoom: Instagram posts indexed by Google (via)", u: "https://www.seozoom.com/instagram-google-indexing/", d: "2025-07" };
const LIR = { t: "LinkedIn robots.txt (checked 9 Nov 2026)", u: "https://www.linkedin.com/robots.txt", d: "2026-11-09" };
const YTR = { t: "YouTube robots.txt (checked 9 Nov 2026)", u: "https://www.youtube.com/robots.txt", d: "2026-11-09" };
const META = { t: "Meta: Web crawlers documentation", u: "https://developers.facebook.com/documentation/sharing/webmasters/web-crawlers", d: "2026" };
const W3C_DIR = { t: "W3C: Structural markup and right-to-left text in HTML", u: "https://www.w3.org/International/questions/qa-html-dir", d: "2026" };
const WCAG = { t: "W3C: WCAG 2.2", u: "https://www.w3.org/TR/WCAG22/", d: "2023" };
const AGENT = { t: "Agentic commerce protocol tracker", u: "https://www.agentic-commerce.sh/en/protocols/", d: "2026" };
const AWR = { t: "Advanced Web Ranking: WebMCP and UCP", u: "https://www.advancedwebranking.com/blog/webmcp-ucp-architecture-of-agentic-web", d: "2026" };
const SEJ_GSC = { t: "Search Engine Journal: Search Console AI reports rolled out worldwide", u: "https://www.searchenginejournal.com/google-search-console-ai-reports-rolled-out-worldwide/587836/", d: "2026-08" };
const DSM = { t: "Directive (EU) 2019/790 (DSM), Art. 3 and 4", u: "https://eur-lex.europa.eu/eli/dir/2019/790/oj", d: "2019" };
const LAION = { t: "Open Future: LAION round 2 (OLG Hamburg, 5 U 104/24)", u: "https://openfuture.eu/blog/laion-round-2-machine-readable-but-still-not-actionable/", d: "2025-12" };
const EAA = { t: "Directive (EU) 2019/882 (European Accessibility Act)", u: "https://eur-lex.europa.eu/eli/dir/2019/882/oj", d: "2025-06-28" };
const DDG = { t: "§ 5 Digitale-Dienste-Gesetz (Impressum)", u: "https://www.gesetze-im-internet.de/ddg/__5.html", d: "2024-05" };
const SEER = { t: "Seer Interactive: AIO Impact on Google CTR, 2026 Update (53 brands, 5.47M queries)", u: "https://www.seerinteractive.com/insights/aio-impact-on-google-ctr-2026-update", d: "2026-04-24" };
const INDEXNOW = { t: "IndexNow", u: "https://www.indexnow.org/", d: "2026" };

const CF3 = { t: "Cloudflare: Accountable mixed-use AI crawlers", u: "https://blog.cloudflare.com/accountable-mixed-use-ai-crawlers", d: "2026-09-15" };
const G_TRAIN = { t: "Google Search Central blog: A shared control for AI training", u: "https://developers.google.com/search/blog/2026/10/ai-training-control", d: "2026-10-30" };
const PPC_TRAIN = { t: "PPC Land: Google, Microsoft, OpenAI and Anthropic back one AI-training opt-out (via)", u: "https://ppc.land/google-microsoft-openai-and-anthropic-back-one-ai-training-opt-out/", d: "2026-10" };
const G_UPD = { t: "Google Search Central: Latest documentation updates", u: "https://developers.google.com/search/updates", d: "2026-11" };
const PPC_OPT = { t: "PPC Land: Google lists 7 ways to keep content out of Search AI (via)", u: "https://ppc.land/google-lists-7-ways-to-keep-content-out-of-search-ai-opt-out-included/", d: "2026" };
const ANT_HELP = { t: "Anthropic Help Center: Does Anthropic crawl data from the web?", u: "https://support.anthropic.com/en/articles/8896518", d: "2026" };
const PPLX_DOC = { t: "Perplexity: Perplexity crawlers", u: "https://docs.perplexity.ai/docs/resources/perplexity-crawlers", d: "2026" };
const BING_BLOG = { t: "Bing Webmaster blog: AI Performance in Bing Webmaster Tools (public preview)", u: "https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview", d: "2026-02" };
const GOLDMAN = { t: "Eric Goldman: Are robots.txt instructions legally binding? (Ziff Davis v. OpenAI)", u: "https://blog.ericgoldman.org/archives/2025/12/are-robots-txt-instructions-legally-binding-ziff-davis-v-openai.htm", d: "2025-12" };
const INSIDE = { t: "Inside Tech Law: Machine-readable opt-outs and AI training, Hamburg court clarifies", u: "https://www.insidetechlaw.com/blog/2025/12/machine-readable-opt-outs-and-ai-training-hamburg-court-clarifies-copyright-exceptions", d: "2025-12" };
const BFF = { t: "BFF: Kneschke ./. LAION e.V., what the BGH hearing showed", u: "https://bff.de/news/kneschke-laion-e-v-was-die-verhandlung-vor-dem-bgh-gezeigt-hat/", d: "2026-09" };
const OMNIBUS = { t: "Usercentrics: EU AI Act high-risk delay (Digital Omnibus) (via)", u: "https://usercentrics.com/knowledge-hub/eu-ai-act-high-risk-delay-article-50-transparency-consent/", d: "2026" };
const BAKER = { t: "Baker McKenzie: Saudi Arabia's new Copyright Law", u: "https://www.bakermckenzie.com/en/insight/publications/2026/07/saudi-arabia-new-copyright-law-modernises-ksa-ip-framework", d: "2026-07" };
const LW = { t: "Latham & Watkins: Saudi Arabia's new copyright regulations, what AI companies should know", u: "https://www.lw.com/en/insights/saudi-arabia-new-copyright-regulations-what-ai-companies-should-know", d: "2026" };
const DLA = { t: "DLA Piper: Data protection laws, United Arab Emirates", u: "https://www.dlapiperdataprotection.com/countries/uae-general/law.html", d: "2026" };
const TUN = { t: "Directinfo: ARP committee examines bills (Tunisia, data protection bill 095/2025)", u: "https://directinfo.webmanagercenter.com/2026/05/20/tunisie-arp-la-commission-des-droits-et-des-libertes-examine-une-serie-de-projets-de-loi/", d: "2026-05-20" };
const KENNEDYS = { t: "Kennedys: Saudi PDPL enforcement decisions (title only, URL not verified)", u: "", d: "2026" };
const DXB = { t: "Gulf News: Dubai Police on shops posting false reviews (title only, URL not verified)", u: "", d: "2026-10" };
const AHR3 = { t: "Ahrefs: ChatGPT citation study, 66.6M responses (title only, URL not verified)", u: "", d: "2026-10" };
const BRIGHT = { t: "BrightEdge: Reddit in AI Overviews (title only, URL not verified)", u: "", d: "2026" };
const SEMRUSH = { t: "Semrush: Most cited domains in AI", u: "https://www.semrush.com/blog/most-cited-domains-ai/", d: "2026" };
const FOUNDATION = { t: "Ross Simmonds: ChatGPT Reddit citations", u: "https://rosssimmonds.com/blog/chatgpt-reddit-citations/", d: "2026" };

export const SOURCES = {
  "t1-1": [OAI, G_GUIDE], "t1-2": [G_GUIDE, G_AIF, G_MODE], "t1-3": [OAI, ANT_HELP, PPLX_DOC, BING_BLOG], "t1-4": [G_PERS, SPARK], "t1-5": [PEW, AHR1, AHR2, SEER],
  "t2-1": [RFC, G_AIF], "t2-2": [OAI, ANT_HELP, PPLX_DOC, ANT], "t2-3": [OAI, ANT, G_AIF], "t2-4": [CF1, CF2, CF3, G_AIF], "t2-5": [G_AIF, G_CTRL, PPC_OPT],
  "t3-1": [G_AIF, G_GUIDE], "t3-2": [G_AIF, PPLX], "t3-3": [G_AIF, INDEXNOW], "t3-4": [G_GUIDE, SER, SEJ_GUIDE], "t3-5": [G_L10N, W3C_DIR],
  "t4-1": [G_AIF], "t4-2": [G_AIF, SCHEMA, G_SD], "t4-3": [SCHEMA], "t4-4": [WD, WP], "t4-5": [FAQ, G_SD, G_UPD],
  "t5-1": [G_GUIDE], "t5-2": [G_GUIDE, GEO], "t5-3": [GEO], "t5-4": [G_GUIDE], "t5-5": [G_GUIDE, G_SPAM],
  "t6-1": [PEEC, PROF, AHR3, BRIGHT, SEMRUSH, FOUNDATION], "t6-2": [FTC, OMNI], "t6-3": [PEEC], "t6-4": [PEEC, G_SPAM], "t6-5": [WP],
  "t7-1": [LIR, YTR, META], "t7-2": [IG], "t7-3": [PEEC, YTR], "t7-4": [LIR, PEEC], "t7-5": [G_AIF],
  "t8-1": [G_AIF, G_LOCAL], "t8-2": [G_SD, EAA], "t8-3": [G_SD, G_AIF], "t8-4": [G_GUIDE, DDG], "t8-5": [G_RATER],
  "t9-1": [G_MODE, AGENT], "t9-2": [WCAG], "t9-3": [AGENT, AWR], "t9-4": [G_GUIDE], "t9-5": [AGENT, AWR],
  "t10-1": [G_GSC, SEJ_GSC, G_CTRL], "t10-2": [BING, BING_BLOG], "t10-3": [OAI], "t10-4": [SPARK], "t10-5": [OAI, PPLX],
  "t11-1": [SEJ_GUIDE, GEO, SER], "t11-2": [G_GUIDE, SPARK, G_SPAM], "t11-3": [G_GSC, BING, SPARK], "t11-4": [G_GUIDE], "t11-5": [G_AIF],
  "t12-1": [DSM, LAION, INSIDE, BFF], "t12-2": [DSM, OMNIBUS], "t12-3": [DSM], "t12-4": [EAA], "t12-5": [DDG, FTC, OMNI],
  "t13-1": [G_TRAIN, PPC_TRAIN, G_UPD], "t13-2": [CF3, CF2], "t13-3": [GOLDMAN, INSIDE, BFF, LAION], "t13-4": [BAKER, LW, KENNEDYS, DLA, TUN, DXB], "t13-5": [SEER, AHR3, SEMRUSH],
};
export const RESEARCHED = "2026-11-09";
