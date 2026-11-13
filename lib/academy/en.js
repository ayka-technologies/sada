// Sada Academy 2026 v1 · English (source language). Facts checked against the research of 9 November 2026.
// conf: D = documented (official source) · E = evidence-based (study, see limits) · OD = open debate (not clearly proven)
export default {
  tracks: [
    { id: "t1", icon: "radar", t: "How AI finds you", d: "Memory, live search, and why every answer is different.", lessons: [
      { id: "t1-1", t: "Memory or live search?", conf: "D", cards: [
        "An AI assistant answers from two places: what it learned in training (its memory) and a live web search it runs for your question.",
        "Each company uses different bots for the two jobs. OpenAI: GPTBot collects training data, OAI-SearchBot feeds ChatGPT search. Anthropic: ClaudeBot and Claude-SearchBot. Google: Google-Extended for Gemini training, Googlebot for Search and its AI features.",
        "So you have two jobs: be readable and indexed today (technical), and be talked about widely enough to end up in the memory (reputation)."],
        do: "Write down 10 questions a real visitor asks before choosing you, for example “opening hours [museum] Sunday”. You will reuse them in track 10.",
        quiz: { q: "Which OpenAI bot decides whether your pages can appear in ChatGPT search answers?", o: ["OAI-SearchBot", "GPTBot", "Googlebot"], a: 0, why: "OpenAI: sites opted out of OAI-SearchBot are not shown in ChatGPT search answers. GPTBot is for training." }, try: "ask" },
      { id: "t1-2", t: "AI Overviews and AI Mode", conf: "D", cards: [
        "Google's AI features first retrieve pages from the Google Search index, then write the answer. Google calls this grounding (retrieval-augmented generation).",
        "AI Mode splits your question into many related searches at once, a “query fan-out”. A question about weeds in a lawn also searches “best herbicides for lawns” and “remove weeds without chemicals”.",
        "AI Overviews appear only when Google thinks they add something, so they often don't show at all. A page must be indexed and allowed a snippet to be a supporting link."],
        do: "Search your 3 most important questions on Google. Note whether an AI Overview appears and which sites it links.",
        quiz: { q: "Your page ranks well but carries a “nosnippet” rule. Can it be a link in an AI Overview?", o: ["No", "Yes, ranking is enough", "Only in AI Mode"], a: 0, why: "Google requires pages to be indexed and eligible to be shown in Search with a snippet." }, try: "audit" },
      { id: "t1-3", t: "Whose index?", conf: "D", cards: [
        "Not every assistant uses Google. Microsoft Copilot cites from Bing: Bing's AI Performance report counts citations across Copilot and Bing's AI summaries.",
        "ChatGPT, Claude and Perplexity run their own search crawlers: OAI-SearchBot, Claude-SearchBot, PerplexityBot. OpenAI does not say publicly which other indexes it uses, so claims that ChatGPT is “Bing-powered” are not proven.",
        "Practical rule: be indexed in Google and Bing, and let the assistants' search bots in."],
        do: "Search site:yourdomain on Google and on Bing. If key pages are missing in one of them, fix indexing first.",
        quiz: { q: "Microsoft Copilot finds web pages mainly through…", o: ["Bing", "Google's index", "Only its training data"], a: 0, why: "Bing's AI Performance report covers citations in Copilot and Bing's AI summaries." }, try: "audit" },
      { id: "t1-4", t: "Why answers differ", conf: "E", cards: [
        "AI answers change from run to run. In a January 2026 study, SparkToro and Gumshoe had volunteers run the same prompts thousands of times in ChatGPT, Claude and Google AI.",
        "Getting the same list of brands twice was very rare, and the same order rarer still. The stable signal was how often a brand appears. (Reported by Search Engine Journal; not peer-reviewed.)",
        "AI Mode is also personalised: it can use your earlier searches. Two people asking the same question may see different sources."],
        do: "Ask one of your questions three times in a fresh chat. Count in how many answers you appear.",
        quiz: { q: "One ChatGPT answer did not name your museum. What can you conclude?", o: ["Almost nothing: measure how often you appear across many runs", "You are banned from ChatGPT", "Your ranking dropped"], a: 0, why: "Answers vary nearly every time. Track the share of runs in which you appear, over months." }, try: "ask" },
      { id: "t1-5", t: "Clicks in an AI world", conf: "E", cards: [
        "Pew Research (July 2025, 900 US adults, 68,879 searches): with an AI summary, people clicked a normal result in 8% of visits, without one in 15%. They clicked a link inside the summary in 1%.",
        "Ahrefs found the click rate of the top result about 34.5% lower when an AI Overview appeared (March 2025 data), and about 58% lower in its February 2026 update. These are correlations, not proof.",
        "Seer Interactive saw brands cited inside the AI Overview get more clicks than brands not cited. Measure conversions and enquiries, not only traffic."],
        do: "In your analytics, pick one goal that matters (booking, enquiry, donation, application) and check it monthly next to traffic.",
        quiz: { q: "Traffic fell, but AI features show your pages. What should you also track?", o: ["Conversions such as bookings or applications", "Only bounce rate", "Nothing: traffic is the only measure"], a: 0, why: "Studies show fewer clicks with AI summaries; what counts is whether the people who do come act." }, try: "mission" }
    ] },
    { id: "t2", icon: "shield-check", t: "Open the door", d: "robots.txt, AI bots, CDNs and Google's controls.", lessons: [
      { id: "t2-1", t: "robots.txt in 10 minutes", conf: "D", cards: [
        "robots.txt is a public text file at yourdomain/robots.txt. It tells crawlers what they may read. It is a voluntary standard (RFC 9309), not a lock.",
        "Each block starts with “User-agent:” (the bot's name) and then “Disallow:” or “Allow:” rules. A bot that is not named follows the “User-agent: *” block.",
        "Add a “Sitemap:” line so crawlers find all your pages."],
        do: "Open yourdomain/robots.txt. Check that Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot and PerplexityBot are not blocked, and that a Sitemap line exists.",
        quiz: { q: "A bot is not named anywhere in robots.txt. Which rules apply to it?", o: ["The “User-agent: *” block", "None, it may read everything", "The Googlebot block"], a: 0, why: "Bots that are not named follow the rules for all user agents (*)." }, try: "bots" },
      { id: "t2-2", t: "The AI bot zoo", conf: "D", cards: [
        "Training bots collect text for future models: GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot.",
        "Search bots index pages for AI answers: OAI-SearchBot, Claude-SearchBot, PerplexityBot. Blocking Claude-SearchBot may reduce your visibility in Claude's search results, says Anthropic.",
        "User bots fetch a page when a person asks: ChatGPT-User, Claude-User, Perplexity-User. OpenAI says robots.txt may not apply to ChatGPT-User; Perplexity-User generally ignores it; Anthropic says Claude-User respects it."],
        do: "Play the bot game in this Academy until you score 8/8.",
        quiz: { q: "Which of these is a training bot, not a search bot?", o: ["GPTBot", "OAI-SearchBot", "PerplexityBot"], a: 0, why: "OpenAI: GPTBot collects content that may be used to train its foundation models." }, try: "bots" },
      { id: "t2-3", t: "Block training, keep search", conf: "D", cards: [
        "You can say no to training and still be found. Name the training bots with “Disallow: /” and the search bots with “Allow: /”.",
        "Blocking Google-Extended does not remove you from AI Overviews: those are controlled through Googlebot and snippet rules.",
        "Whether to block training is your decision. There is no measured evidence either way for small organisations: record it as a conscious choice."],
        do: "Copy the template from the Agent's fix pack (or this lesson's source), adapt the sitemap URL, and ask whoever runs your site to publish it.",
        quiz: { q: "You block Google-Extended. What happens to your AI Overviews?", o: ["Nothing changes: they depend on Googlebot", "You disappear from them", "Your Search rankings drop"], a: 0, why: "Google: Google-Extended covers Gemini training and grounding in some other systems, not Search's AI features." }, try: "audit" },
      { id: "t2-4", t: "Your CDN may block AI", conf: "D", cards: [
        "A perfect robots.txt is useless if your hosting or CDN blocks the bot first. Google lists checking “any CDN or hosting infrastructure” as a best practice.",
        "Since 1 July 2025, Cloudflare blocks AI crawlers by default on new domains and offers Pay Per Crawl.",
        "Since 15 September 2026, Cloudflare's “Block” and “Block on pages with ads” settings also stop mixed-use crawlers, including Googlebot, Bingbot and Applebot, so they cut you out of search too. To refuse training but stay in search, use the new “Disallow AI Training” setting."],
        do: "Ask your web host or check your Cloudflare dashboard: which AI crawlers are blocked? Allow the search bots you want.",
        quiz: { q: "robots.txt allows everything. Can AI search bots still be blocked?", o: ["Yes, by the CDN or firewall", "No, robots.txt decides", "Only on weekends"], a: 0, why: "Security layers can block bots before they ever read robots.txt." }, try: "audit" },
      { id: "t2-5", t: "Snippets and Google's AI opt-out", conf: "D", cards: [
        "To limit what Google shows from a page, use nosnippet, data-nosnippet (for parts of a page), max-snippet or noindex.",
        "Since 31 August 2026, every site has a Search Console setting called “Search generative AI”: you can exclude your site from AI Overviews, AI Mode and AI features in Discover.",
        "It does not cover the Gemini app or AI training: that is still Google-Extended. Sites that opt out get no traffic or impressions from these features; Google says it is not a ranking signal elsewhere."],
        do: "If one paragraph should never be quoted (for example outdated prices), wrap it in data-nosnippet instead of hiding the whole page.",
        quiz: { q: "What does Google's 2026 AI opt-out cost you?", o: ["All traffic and impressions from its AI features", "Your normal rankings", "Nothing at all"], a: 0, why: "Google: sites that opt out will not receive traffic or impressions from its generative AI features." }, try: "audit" }
    ] },
    { id: "t3", icon: "eye", t: "Be readable", d: "Text, JavaScript, sitemaps, llms.txt and languages.", lessons: [
      { id: "t3-1", t: "Text beats images and PDFs", conf: "D", cards: [
        "Google asks that important content is available as text. Opening hours in a picture, prices in a PDF, dates only in a poster: machines may miss them.",
        "Images and videos still count: Google says that following its image and video SEO guides already prepares them for AI search.",
        "Add alt text to images and transcripts to videos. They help people with disabilities and machines."],
        do: "Find one fact that only exists in an image or PDF (hours, prices, deadlines) and put it on the page as plain text.",
        quiz: { q: "Your opening hours are only in a poster image. Risk?", o: ["Machines may not read them", "None, AI reads all images", "Google bans images"], a: 0, why: "Google asks that important content is available in textual form." }, try: "machine" },
      { id: "t3-2", t: "JavaScript and AI crawlers", conf: "OD", cards: [
        "Google renders JavaScript. Most AI companies do not say whether their bots do. Perplexity, for example, does not document it.",
        "Safe assumption: facts that only appear after JavaScript runs in the browser may be invisible to some AI bots.",
        "Sada's Audit compares the raw HTML with the rendered page and warns you when most text is missing without JavaScript."],
        do: "Run Sada's Audit on your home page and look at “Content without JavaScript”.",
        quiz: { q: "Is it proven that all AI bots run JavaScript?", o: ["No, most don't document it", "Yes, all do", "Yes, since 2025"], a: 0, why: "Only Google documents rendering; for the others it is open." }, try: "audit" },
      { id: "t3-3", t: "Sitemaps and IndexNow", conf: "D", cards: [
        "An XML sitemap lists your pages and is Google's documented way to help discovery. Submit it in Search Console and Bing Webmaster Tools.",
        "IndexNow lets you tell Bing and some other engines instantly that a page changed. Google does not use it.",
        "Most website systems (WordPress plugins, Shopify, TYPO3 extensions) create both for you: switch them on."],
        do: "Open yourdomain/sitemap.xml. If it is missing, switch on your system's sitemap feature and submit it in both webmaster tools.",
        quiz: { q: "Which engine does NOT use IndexNow?", o: ["Google", "Bing", "Neither"], a: 0, why: "IndexNow is supported by Bing and others, not by Google." }, try: "audit" },
      { id: "t3-4", t: "llms.txt: the honest story", conf: "OD", cards: [
        "llms.txt is a proposed file that summarises a site for AI. Google lists it among unnecessary tactics: Google Search ignores it, it neither helps nor harms.",
        "SE Ranking (Nov 2025, ~300,000 domains) found it on about 10% of sites and no effect on how often AI cites them. One log study found only ~0.1% of AI-bot requests touched it.",
        "Other side: some practitioners argue that assistants other than Google may read it, but no AI provider documents using it. Cheap to add, but no magic fix."],
        do: "If you have llms.txt, keep it short and accurate. Spend your time on robots.txt and content first.",
        quiz: { q: "Does llms.txt help you in Google Search?", o: ["No, Google Search ignores it", "Yes, it's required", "Only with schema"], a: 0, why: "Google: such files neither harm nor help visibility in Google Search." }, try: "audit" },
      { id: "t3-5", t: "Many languages, right to left", conf: "D", cards: [
        "If you publish in several languages, link the versions with hreflang so search engines show the right one.",
        "Each page needs the correct lang attribute. Arabic pages also need dir=\"rtl\" so text and punctuation display correctly.",
        "Translate properly: a machine-translated page that nobody checked makes you look less trustworthy in every language."],
        do: "Run Sada's Audit on one page per language and fix any “language” or “hreflang” warning.",
        quiz: { q: "What does an Arabic page need besides lang=\"ar\"?", o: ["dir=\"rtl\"", "A separate domain", "A PDF version"], a: 0, why: "W3C: set the base direction for right-to-left languages." }, try: "audit" }
    ] },
    { id: "t4", icon: "building-2", t: "Be recognised", d: "One name everywhere, schema, Wikidata.", lessons: [
      { id: "t4-1", t: "One name everywhere", conf: "D", cards: [
        "AI has to decide that “Stadt Albstadt”, “Stadtverwaltung Albstadt” and albstadt.de are the same organisation. Identical facts make that easy.",
        "Use the same name, address, phone, opening hours and website on your site, Google Business Profile, Bing Places, Apple Business Connect, Facebook and LinkedIn.",
        "Google lists keeping Business Profile and Merchant Center information up to date as a best practice for its AI features."],
        do: "Make a table: platform, name, address, phone, hours, link. Fill it for 5 platforms and correct every difference.",
        quiz: { q: "Why do identical names and addresses matter for AI?", o: ["They help connect all mentions to one organisation", "They raise prices", "They are a legal duty everywhere"], a: 0, why: "Consistent facts let machines recognise one entity across sources." }, try: "mission" },
      { id: "t4-2", t: "Organization schema and sameAs", conf: "D", cards: [
        "Structured data (JSON-LD) states facts in a machine format: name, logo, address, website. sameAs lists your official profiles elsewhere.",
        "Google says no special schema is needed for its AI features, but structured data must match the visible text.",
        "Google still documents Organization, Local business, Event, Profile page, Article and Video structured data."],
        do: "Use the code in Sada's fix pack: one Organization block with name, url, logo, address and sameAs. Check it with Google's Rich Results Test.",
        quiz: { q: "What must your structured data always do?", o: ["Match the visible text on the page", "Contain keywords", "Be hidden from visitors"], a: 0, why: "Google: make sure your structured data matches the visible text." }, try: "pack" },
      { id: "t4-3", t: "The right type", conf: "D", cards: [
        "schema.org has specific types: Museum, CollegeOrUniversity, School, NGO, GovernmentOrganization, LocalBusiness and many more.",
        "Pick the most specific type that is true. A memorial site is not a generic Organization; a town hall is a GovernmentOrganization.",
        "Specific types help machines tell you apart from organisations with similar names."],
        do: "Look up your type on schema.org and replace a generic “Organization” with the specific one.",
        quiz: { q: "Best schema type for a town administration?", o: ["GovernmentOrganization", "Store", "Product"], a: 0, why: "schema.org defines GovernmentOrganization for government bodies." }, try: "pack" },
      { id: "t4-4", t: "Wikidata before Wikipedia", conf: "D", cards: [
        "Wikipedia needs significant coverage in reliable, independent sources, and has conflict-of-interest rules when you write about yourself.",
        "Wikidata has a lower bar: a clearly identifiable entity that can be described with serious, public references.",
        "A correct Wikidata item (official website, location, founding date, identifiers) is a clean fact sheet many systems can read."],
        do: "Search Wikidata for your organisation. Correct the item, or create one with official website, location and founding date, each with a reference.",
        quiz: { q: "Your NGO is small and little covered in the press. Where do you start?", o: ["Wikidata", "Write your own Wikipedia article", "Buy a Wikipedia page"], a: 0, why: "Wikipedia notability needs independent coverage; Wikidata's bar is lower." }, try: "mission" },
      { id: "t4-5", t: "What Google retired", conf: "D", cards: [
        "FAQ rich results stopped appearing in Google Search on 7 May 2026, and Google removed their documentation in June 2026. HowTo rich results are gone too.",
        "Many other features are still documented (November 2026): Organization, Local business, Event, Course list, Education Q&A, Profile page, Article, Video and Review snippet. Dataset markup now only serves Dataset Search.",
        "You don't need to delete FAQ markup, and visible FAQ text still helps readers. Just don't expect dropdowns in Google."],
        do: "If a provider sells you FAQ schema for “rich results”, ask them to read Google's May 2026 notice.",
        quiz: { q: "You add FAQPage markup in June 2026 hoping for dropdowns. Result?", o: ["No dropdowns: retired on 7 May 2026", "Dropdowns within a week", "A ranking penalty"], a: 0, why: "Google: FAQ rich results are no longer appearing in Google Search since 7 May 2026." }, try: "audit" }
    ] },
    { id: "t5", icon: "quote", t: "Write to be quoted", d: "First-hand content, answers first, real evidence.", lessons: [
      { id: "t5-1", t: "Non-commodity content", conf: "D", cards: [
        "Google's 2026 guide: content people find unique, compelling and useful will likely influence your presence in AI search more than any other tip.",
        "Commodity content repeats what everyone says (“7 tips for visiting a museum”). Non-commodity content only you can write (“What we found when we restored our 1928 organ”).",
        "Your archives, your numbers, your people and your local knowledge are things no AI can copy from elsewhere."],
        do: "List 3 things only your organisation knows or has. Turn one into a page this month.",
        quiz: { q: "Which is “non-commodity” content?", o: ["Your own restoration diary with photos and dates", "A list of general visiting tips", "A rewritten Wikipedia summary"], a: 0, why: "Google favours first-hand, unique material over generic content." }, try: "audit" },
      { id: "t5-2", t: "Answer first", conf: "OD", cards: [
        "Start pages with the direct answer: what, for whom, where, with the key fact. Then explain.",
        "Agencies report more citations with answer-first pages; no AI company documents it. Google says special “chunking” for AI is unnecessary.",
        "It costs nothing and helps readers, so do it anyway, with headings and short paragraphs."],
        do: "Rewrite the first two sentences of your three key pages so they answer the main question directly, with a date or number.",
        quiz: { q: "Is answer-first writing proven to raise AI citations?", o: ["Not proven, but cheap and reader-friendly", "Yes, Google requires it", "No, it is penalised"], a: 0, why: "Vendors don't document it; Google says chunking isn't needed. It helps people either way." }, try: "rewrite" },
      { id: "t5-3", t: "Sources, quotes, numbers", conf: "E", cards: [
        "The GEO study (Princeton, Georgia Tech, AI2, IIT Delhi; KDD 2024) found that adding citations, quotations and statistics raised a source's visibility in AI answers by up to 40%.",
        "Keyword stuffing did worse than doing nothing.",
        "Limits: the main tests used a simulated engine on 2023-era models, and “visibility” meant share of the answer text, not clicks. Treat it as a direction, not a law."],
        do: "Add one named source, one quotation or one dated figure to your most important page.",
        quiz: { q: "In the GEO study, what happened with keyword stuffing?", o: ["It performed worse than the baseline", "It doubled visibility", "It had no measurable effect at all"], a: 0, why: "In the live Perplexity test, keyword stuffing scored below the unchanged baseline." }, try: "heat" },
      { id: "t5-4", t: "Publish your own data", conf: "D", cards: [
        "A figure only you have is citeable: visitors per year, students placed in jobs, objects in the archive, trees planted.",
        "Date it, say how it was counted, and put it in text (not only in a chart).",
        "This is exactly the first-hand material Google's 2026 guide puts first."],
        do: "Publish one dated, attributed figure: “In 2025, 41,200 people visited the memorial (ticket count).”",
        quiz: { q: "What makes an own statistic useful for AI and readers?", o: ["A date, a method and plain text", "A big font", "Rounding to millions"], a: 0, why: "Dated, explained figures can be checked and quoted." }, try: "quote" },
      { id: "t5-5", t: "Don't overdo it", conf: "D", cards: [
        "Making a separate page for every variation of a question, mainly to influence AI answers, breaks Google's scaled content abuse policy.",
        "Mass-produced AI pages, hidden text and fake freshness dates are spam, not optimisation.",
        "One excellent page that answers a topic fully beats twenty thin ones."],
        do: "Find pages that say almost the same thing. Merge them into one and redirect the rest.",
        quiz: { q: "Creating 50 near-identical pages for every question variant is…", o: ["Scaled content abuse", "Best practice", "Required for AI Mode"], a: 0, why: "Google names this explicitly in its 2026 guide." }, try: "audit" }
    ] },
    { id: "t6", icon: "users", t: "Reputation beyond your site", d: "Where AI looks, reviews, press, communities.", lessons: [
      { id: "t6-1", t: "Where AI looks", conf: "E", cards: [
        "Peec AI analysed 30 million cited sources across ChatGPT, AI Mode, Gemini, Perplexity and AI Overviews: Reddit, YouTube, LinkedIn, Wikipedia and Forbes led.",
        "Assistants differ: Profound found Wikipedia far more often in ChatGPT, Reddit more in Perplexity.",
        "Shares swing fast and studies disagree: Ahrefs measured Reddit falling from 19.1% to 2.3% of US ChatGPT answers (March–September 2026) and Wikipedia from 14.1% to 2.9%, while BrightEdge reports Reddit growing in Google's AI Overviews. Spread your presence."],
        do: "Ask an assistant one of your questions and note which websites it cites. Those are your target places.",
        quiz: { q: "Which platform type dominated AI citations in 2025–2026 studies?", o: ["User-written content and video (Reddit, YouTube)", "Only government sites", "Only company homepages"], a: 0, why: "Peec AI and Profound both show forums and video among the most cited." }, try: "ask" },
      { id: "t6-2", t: "Reviews the honest way", conf: "D", cards: [
        "Reviews and business data feed Google's AI through your Business Profile.",
        "Fake or bought reviews are illegal: the US FTC rule since 21 October 2024 (including AI-written reviews), the EU Omnibus Directive since 28 May 2022.",
        "Ask real visitors, students or partners, with no reward tied to a positive rating."],
        do: "Ask five genuine recent visitors or partners for an honest Google review this week.",
        quiz: { q: "A vendor offers 50 five-star reviews to “boost AI”. What is it?", o: ["Illegal in the EU and US", "A grey area", "Recommended by Google"], a: 0, why: "Fake reviews are banned by the FTC rule and the EU Omnibus Directive." }, try: "ask" },
      { id: "t6-3", t: "Directories and lists", conf: "E", cards: [
        "Directories, tourism portals, sector associations and “best of” lists are where AI often finds recommendations; review sites such as Yelp appeared often in recommendation queries.",
        "A wrong entry spreads wrong facts. A missing entry leaves you out of the list.",
        "Check the ones assistants actually cite for your questions first."],
        do: "List 10 directories, portals or registers in your sector. Correct or create your entry in three of them.",
        quiz: { q: "Why fix your entry on a tourism portal?", o: ["AI may quote it as a source", "It changes Google's algorithm", "It removes competitors"], a: 0, why: "Third-party listings are frequent sources for recommendation answers." }, try: "ask" },
      { id: "t6-4", t: "Communities without spam", conf: "OD", cards: [
        "Forums like Reddit are heavily cited, so marketers try to plant posts. That breaks platform rules and can break consumer law.",
        "What works ethically: answer real questions as yourself, say who you are, link only when it helps.",
        "Whether community activity changes AI answers for small organisations is not measured. Do it to help people."],
        do: "Find one real question about your field in a forum and answer it helpfully, with your role stated.",
        quiz: { q: "Posting fake “customer” threads about yourself is…", o: ["Against platform rules and risky legally", "Best practice", "Invisible to AI"], a: 0, why: "Disguised promotion breaks community rules and consumer-protection law." }, try: "ask" },
      { id: "t6-5", t: "Press and partners", conf: "D", cards: [
        "Independent coverage is what Wikipedia calls “significant coverage in reliable sources” and what assistants trust.",
        "Partners (universities, cities, foundations, funders) can link and describe you accurately.",
        "Give journalists and partners one fact sheet: name, one-line description, numbers with dates, contact, logo."],
        do: "Write a one-page fact sheet and send it to two partners asking them to check how they describe you.",
        quiz: { q: "What counts as independent coverage?", o: ["A newspaper article you did not pay for", "Your own blog", "A paid advertorial"], a: 0, why: "Notability rules require sources independent of the subject." }, try: "mission" }
    ] },
    { id: "t7", icon: "share-2", t: "Social channels", d: "Which platforms AI can read, and how to set up yours.", lessons: [
      { id: "t7-1", t: "Which platforms let AI in", conf: "D", cards: [
        "LinkedIn's robots.txt (checked 9 Nov 2026) blocks all bots it does not name. GPTBot, ClaudeBot, PerplexityBot and CCBot are not named, so they are blocked.",
        "YouTube's robots.txt names no AI bot and blocks only paths like /results or /api/: watch pages are open.",
        "Sada's Channel check reads each platform's robots.txt live, because these files change."],
        do: "Open your channels with Sada's panel open and read the “AI and search crawlers” result for each.",
        quiz: { q: "LinkedIn ends with “User-agent: * / Disallow: /”. What about GPTBot?", o: ["Blocked, because it isn't named", "Allowed", "Only allowed on posts"], a: 0, why: "Unnamed bots fall under * and are blocked from the whole site." }, try: "social" },
      { id: "t7-2", t: "Instagram is searchable", conf: "D", cards: [
        "Since 10 July 2025, public posts of professional accounts (users 18+) can be indexed by Google and Bing.",
        "Personal and private accounts are excluded. You can switch it off in privacy settings.",
        "So captions now matter beyond Instagram: write what, who, where and when in plain words."],
        do: "Set your account to Professional and Public, and check that “Allow public photos and videos to appear in search engine results” is on.",
        quiz: { q: "Since July 2025, which Instagram posts can appear in Google?", o: ["Public posts of professional accounts", "All private posts", "None"], a: 0, why: "The change covers public professional accounts of adults." }, try: "social" },
      { id: "t7-3", t: "YouTube descriptions and captions", conf: "E", cards: [
        "YouTube is among the most cited sources in AI answers (Peec AI, 2026).",
        "A machine reads the title, the description and the captions, not the pictures.",
        "Auto-captions often get names wrong, especially German, French and Arabic names."],
        do: "Add 2–3 factual sentences to the descriptions of your 5 most-watched videos and correct their captions.",
        quiz: { q: "What can an AI system read in a video?", o: ["Title, description and captions", "Only the thumbnail", "Nothing"], a: 0, why: "Text around and inside the video (captions) is what machines read." }, try: "social" },
      { id: "t7-4", t: "LinkedIn company pages", conf: "OD", cards: [
        "LinkedIn is among the most cited domains, even though most AI crawlers are blocked. How the content gets there (search indexes, partnerships, user fetches) is not documented.",
        "Fill in the About tab: description, website, industry, location. Sada reads it on your computer to compare with your site.",
        "Use the same name and description as on your website."],
        do: "Open your LinkedIn page with Sada and fix every “Improve” item.",
        quiz: { q: "Is it documented how AI assistants use LinkedIn content?", o: ["No, it's an open question", "Yes, via GPTBot", "Yes, LinkedIn sells it"], a: 0, why: "LinkedIn blocks unnamed AI bots; the route to citations is not documented." }, try: "social" },
      { id: "t7-5", t: "Bios and link-in-bio", conf: "OD", cards: [
        "A bio is a one-line fact sheet: name, what you are, where, your own website.",
        "Link-in-bio pages add a third-party layer between the channel and your site. No study measures the effect, but your own domain is the clearest signal.",
        "Your website should link back to each channel, ideally in its sameAs markup."],
        do: "Copy Sada's suggested bio, check the facts, and use your own domain as the main link.",
        quiz: { q: "What is the clearest link in a bio?", o: ["Your own domain", "A link-in-bio page", "A hashtag"], a: 0, why: "Your own domain connects the channel directly to your website." }, try: "social" }
    ] },
    { id: "t8", icon: "map", t: "Local and sector playbooks", d: "Museums, universities, NGOs, awards, town halls.", lessons: [
      { id: "t8-1", t: "Business Profile for AI", conf: "D", cards: [
        "Google's own Business Profile and Maps data feed its AI answers. Google lists keeping it up to date as a best practice.",
        "Complete everything: category, hours, special hours, website, photos, description, attributes such as accessibility.",
        "Answer reviews, and update the profile the same day your hours change."],
        do: "Open your Google Business Profile and fill in every empty field. Add special hours for the next holidays.",
        quiz: { q: "Your winter hours changed. Which two places come first?", o: ["Your website's hours page and your Business Profile", "Instagram and TikTok", "Your newsletter only"], a: 0, why: "These are the sources Google's AI features rely on." }, try: "mission" },
      { id: "t8-2", t: "Museums and memorial sites", conf: "D", cards: [
        "Put hours, closures, prices, accessibility and how to get there on one page as text, identical to your Business Profile.",
        "Mark up exhibitions and events with Event structured data (name, dates, place).",
        "Accessibility information is also required in many cases by EU accessibility law and helps every visitor."],
        do: "Create or fix one “Plan your visit” page with all practical facts in text.",
        quiz: { q: "Where should a memorial site put its opening hours?", o: ["In text on one visit page, matching the Business Profile", "Only in a PDF flyer", "Only on Instagram"], a: 0, why: "Text facts that match everywhere are the most reliable for machines." }, try: "machine" },
      { id: "t8-3", t: "Universities and schools", conf: "D", cards: [
        "One page per programme: language of teaching, duration, fees, dated deadlines, requirements for international applicants.",
        "Google still documents Course list markup, but says its AI features need no special schema. Clear, complete programme pages matter most.",
        "Label or redirect past deadlines: an AI that quotes last year's date sends students away."],
        do: "Check your top programme page: are language, fees and this year's deadline written as text?",
        quiz: { q: "What hurts a programme page most in AI answers?", o: ["An outdated deadline", "A short URL", "A photo of students"], a: 0, why: "Old dates get quoted as if they were current." }, try: "ask" },
      { id: "t8-4", t: "NGOs, awards and town halls", conf: "D", cards: [
        "NGOs and foundations: a transparency page with registration number, annual report and leadership.",
        "Awards and competitions: a permanent page per edition with call, deadline, jury and dated winners. Never overwrite past winners.",
        "Town halls: service pages titled as citizens' questions, with hours and documents as text. In Germany the Impressum now falls under § 5 DDG."],
        do: "Pick the rule for your sector and fix one page today.",
        quiz: { q: "An award publishes 2026 winners. What about 2025?", o: ["Keep it on its own permanent page", "Overwrite it", "Delete it"], a: 0, why: "Permanent, dated pages keep the award's history citeable." }, try: "audit" },
      { id: "t8-5", t: "Sensitive history", conf: "OD", cards: [
        "No AI company publishes how it ranks sources on contested history such as the Nazi era or memorial culture.",
        "Google's rater guidelines treat topics that affect society and civic understanding as needing high trust (YMYL).",
        "What you control: name sources and archives, date your statements, say who wrote them and why, give context. Whether assistants favour official institutions is not proven."],
        do: "Add author, date and sources to one historical page.",
        quiz: { q: "What raises trust on a historical page?", o: ["Named sources, dates and authors", "More adjectives", "Hidden keywords"], a: 0, why: "High-trust topics need verifiable, attributed content." }, try: "audit" }
    ] },
    { id: "t9", icon: "mouse-pointer-click", t: "AI agents", d: "Assistants that book, buy and fill in forms.", lessons: [
      { id: "t9-1", t: "What agents do", conf: "D", cards: [
        "AI agents act for people: compare, book, buy. Google announced “agentic checkout” in AI Mode in May 2025.",
        "In 2026 Google presented the Universal Commerce Protocol with retailers; OpenAI and Stripe built the Agentic Commerce Protocol, and OpenAI later shifted toward merchants' own checkouts.",
        "For most organisations the near-term job is simpler: make facts and forms usable."],
        do: "Write down the one action you want people to take online (book, register, apply, donate).",
        quiz: { q: "What did Google announce for AI Mode in 2025?", o: ["Agentic checkout with user oversight", "Free websites", "The end of links"], a: 0, why: "Google I/O 2025: AI Mode can buy on your behalf, always with your guidance." }, try: "drive" },
      { id: "t9-2", t: "Agent-friendly forms", conf: "OD", cards: [
        "Labelled fields, real buttons and clear error messages are WCAG 2.2 basics for people with disabilities.",
        "The same clarity likely helps browser agents too, though that link is not measured.",
        "CAPTCHAs and logins stop agents; Anthropic says its bots don't bypass CAPTCHAs."],
        do: "Run your booking or donation form through a free accessibility checker (for example WAVE) and fix missing labels.",
        quiz: { q: "What should a small museum fix first for agents?", o: ["Unlabelled form fields", "Build an MCP server", "Remove all forms"], a: 0, why: "Basic accessible HTML comes first; protocols are experimental." }, try: "drive" },
      { id: "t9-3", t: "Protocols explained", conf: "D", cards: [
        "MCP (Model Context Protocol, Anthropic, Nov 2024) connects AI tools to data and services.",
        "WebMCP lets a web page offer functions as tools to an agent in the browser: an early Chrome preview in Feb 2026, a W3C Community Group draft in Oct 2026, not shipped by other browsers.",
        "NLWeb (Microsoft) is early-stage. UCP and ACP are commerce protocols mainly for shops."],
        do: "None of these is required today for non-shops. Note them, and re-check next year.",
        quiz: { q: "What is WebMCP's status in late 2026?", o: ["Experimental preview and draft", "A legal requirement", "Supported by all browsers"], a: 0, why: "Chrome preview behind a flag; W3C Community Group draft." }, try: "drive" },
      { id: "t9-4", t: "Facts before login", conf: "D", cards: [
        "An agent or crawler cannot see what is behind a login.",
        "Show prices, dates, availability and conditions as text before anyone signs in.",
        "This also helps people compare you before they commit."],
        do: "Check your booking path: is the price visible before login? If not, add it to the public page.",
        quiz: { q: "Prices only appear after login. Effect?", o: ["Agents and crawlers can't see them", "Better rankings", "No effect"], a: 0, why: "Content behind login is invisible to machines." }, try: "drive" },
      { id: "t9-5", t: "What to ignore for now", conf: "D", cards: [
        "You don't need MCP, WebMCP or commerce protocols to be found and recommended in 2026.",
        "Beware of offers to “make your site agent-ready” with custom protocol builds if your basics (crawl access, text, forms) are not done.",
        "Revisit when your platform (WordPress, Shopify, booking tool) supports it out of the box."],
        do: "Ask any vendor proposing protocol work which browser or assistant uses it today, with a source.",
        quiz: { q: "First priority before any agent protocol?", o: ["Crawl access, text facts and working forms", "A chatbot", "An app"], a: 0, why: "Agents rely on the same basics as crawlers and people." }, try: "drive" }
    ] },
    { id: "t10", icon: "chart-column", t: "Measure", d: "Free reports, referrals, your question sheet, logs.", lessons: [
      { id: "t10-1", t: "Search Console's Generative AI report", conf: "D", cards: [
        "Since June 2026 (worldwide since 31 August 2026), Search Console has Generative AI reports for Search and Discover: impressions, pages, countries, devices, dates.",
        "Limits: impressions only, with no clicks and no search queries; data starts around 18 May 2026. Smaller sites may not see the report yet.",
        "AI data also stays inside the normal Performance report."],
        do: "Open Search Console → Performance → Generative AI. Note impressions and your top 5 pages.",
        quiz: { q: "What does the Generative AI report NOT show at launch?", o: ["Clicks", "Impressions", "Pages"], a: 0, why: "It reports impressions; no clicks yet." }, try: "mission" },
      { id: "t10-2", t: "Bing AI Performance", conf: "D", cards: [
        "Bing Webmaster Tools (public preview since Feb 2026) shows citations across Copilot, Bing AI summaries and some partners.",
        "It also shows “grounding queries”: the search phrases the AI used to find your pages. A goldmine for wording.",
        "No clicks either. A June 2026 update reportedly added citation share and topics."],
        do: "Verify your site in Bing Webmaster Tools and read your top grounding queries.",
        quiz: { q: "What are grounding queries?", o: ["Phrases the AI searched to find your pages", "Your ad keywords", "Spam reports"], a: 0, why: "Bing shows which queries the AI used to ground its answer." }, try: "mission" },
      { id: "t10-3", t: "AI referrals in analytics", conf: "D", cards: [
        "ChatGPT search adds utm_source=chatgpt.com to its links.",
        "Many AI clicks arrive without a source, so analytics undercounts them.",
        "Build one filter for sources containing chatgpt, perplexity, copilot, gemini, claude. Sada's fix pack contains a ready regex."],
        do: "In GA4, create an exploration filtered on those sources and save it.",
        quiz: { q: "Does analytics capture all AI visits?", o: ["No, many arrive without a source", "Yes, all of them", "Only Perplexity's"], a: 0, why: "Missing referrers make AI traffic look like direct visits." }, try: "pack" },
      { id: "t10-4", t: "Your question sheet", conf: "E", cards: [
        "Agencies measure AI visibility with a fixed set of 20–50 real questions, asked several times per assistant, every month.",
        "The key metric is the share of runs in which you appear, not a “position”.",
        "Note also the competitor named, the cited URL and any wrong fact about you."],
        do: "Use Sada's Ask AI tab: pick 10 questions, run them in 3 assistants, export the CSV monthly.",
        quiz: { q: "What replaces “ranking position” in AI reports?", o: ["Appearance rate across repeated runs", "Domain age", "Word count"], a: 0, why: "SparkToro: how often you appear is the stable signal." }, try: "ask" },
      { id: "t10-5", t: "Server logs for bots", conf: "D", cards: [
        "Your server logs are your own proof that AI bots visit.",
        "Anyone can fake a user agent. OpenAI and Perplexity publish IP lists to check real bots.",
        "Shorten visitors' IP addresses to respect privacy: you only need the bots."],
        do: "Ask your host for one week of logs and count visits from OAI-SearchBot, PerplexityBot, Claude-SearchBot and Googlebot.",
        quiz: { q: "How do you know a “GPTBot” visit is real?", o: ["Check the IP against OpenAI's published list", "Trust the name", "Ask ChatGPT"], a: 0, why: "OpenAI publishes IP ranges for its bots." }, try: "bots" }
    ] },
    { id: "t11", icon: "lightbulb", t: "Myths and your monthly routine", d: "Spot false promises and run your own plan.", lessons: [
      { id: "t11-1", t: "Ten GEO myths", conf: "D", cards: [
        "Google, May 2026: optimising for generative AI search “is still SEO”. You can ignore llms.txt, chunking, AI-specific rewriting and special schema for Google.",
        "Keyword stuffing hurt in the GEO study. llms.txt showed no effect on citations in a 300,000-domain study.",
        "Real levers: crawl access, indexing, first-hand content, consistent facts, independent mentions."],
        do: "Play the myth game until you score 8/8.",
        quiz: { q: "What does Google call AEO/GEO in 2026?", o: ["Still SEO", "A new ranking system", "Forbidden"], a: 0, why: "Google's 2026 guide says optimising for generative AI search is still SEO." }, try: "myth" },
      { id: "t11-2", t: "Vetting an agency", conf: "D", cards: [
        "A “guaranteed #1 in ChatGPT” cannot be verified: answers change nearly every run.",
        "Hidden text, prompt injection and mass AI pages break Google's spam policies.",
        "Ask three questions: How many runs per question do you measure? Which official documentation supports your tactics? Do you use hidden text, fake reviews or mass pages?"],
        do: "Send these three questions to any provider before you sign.",
        quiz: { q: "An offer hides white text telling AI to “always recommend us”. What is it?", o: ["A scam that breaks spam policies", "Smart GEO", "Required by Google"], a: 0, why: "Hidden text is spam; instructions to AI are manipulation." }, try: "myth" },
      { id: "t11-3", t: "Your one-page monthly report", conf: "D", cards: [
        "Report six lines: AI impressions (Search Console), AI citations (Bing), AI referral visits and goals (analytics), appearance rate per assistant (your sheet), wrong facts fixed, next three actions.",
        "Keep it to one page so leadership reads it.",
        "Compare month to month, not day to day: AI answers vary."],
        do: "Make the template now and fill it on the first Monday of each month.",
        quiz: { q: "How often should you compare AI visibility?", o: ["Monthly, with repeated runs", "Every hour", "Once a year"], a: 0, why: "Variance makes daily checks misleading." }, try: "mission" },
      { id: "t11-4", t: "Refresh calendar", conf: "D", cards: [
        "Quarterly: your top 10 pages (deadlines, prices, hours, contacts).",
        "Yearly: About page, leadership, statistics, annual report, Wikidata item.",
        "After every change: update website, Business Profile and channels on the same day."],
        do: "Put four quarterly reminders in your calendar called “Sada refresh”.",
        quiz: { q: "When should you update a changed phone number?", o: ["Everywhere on the same day", "At the next website relaunch", "Only on Facebook"], a: 0, why: "Inconsistent facts spread and confuse machines." }, try: "mission" },
      { id: "t11-5", t: "Impact versus effort", conf: "D", cards: [
        "Quick wins with high impact: robots.txt and CDN settings, consistent Business Profile, answer-first intros, one Organization schema block.",
        "Bigger projects: original data, independent coverage, multilingual quality.",
        "Do quick wins this month, plan one bigger project per quarter."],
        do: "Run Sada's Agent and tick off the first three plan items marked “you”.",
        quiz: { q: "Which is a quick win?", o: ["Fixing robots.txt", "Getting a Wikipedia article", "Building an app"], a: 0, why: "Small, technical, high-impact changes come first." }, try: "mission" }
    ] },
    { id: "t12", icon: "scroll-text", t: "Law and ethics (EU)", d: "Training opt-outs, AI Act, privacy, accessibility, honesty.", lessons: [
      { id: "t12-1", t: "Opting out of AI training", conf: "D", cards: [
        "EU law (DSM Directive, Art. 4) allows text and data mining unless the rights holder reserves it in an appropriate way, such as machine-readable means for online content.",
        "In Kneschke v. LAION (OLG Hamburg, 5 U 104/24, 10 Dec 2025), a plain-language opt-out from 2021 was not shown to be machine-readable, and the burden of proof lay with the rights holder. Whether plain language can count today was left open.",
        "The case is not final: Germany's Federal Court of Justice (BGH, I ZR 281/25) heard it on 3 September 2026 and may refer it to the EU Court of Justice. Safest today: name the training bots in robots.txt. Not legal advice."],
        do: "If you want to opt out, add the training-bot block to robots.txt and note the decision.",
        quiz: { q: "Which court decided Kneschke v. LAION on AI-training opt-outs in December 2025?", o: ["OLG Hamburg (Kneschke v. LAION)", "The US Supreme Court", "The CNIL"], a: 0, why: "OLG Hamburg, 5 U 104/24, 10 December 2025." }, try: "bots" },
      { id: "t12-2", t: "AI Act and the GPAI Code", conf: "D", cards: [
        "The EU AI Act (Art. 53) requires providers of general-purpose AI models to have a policy to respect EU copyright, including Art. 4 opt-outs.",
        "The voluntary GPAI Code of Practice (July 2025) commits signatories to respect machine-readable opt-outs such as robots.txt, as legal commentators report.",
        "The Digital Omnibus (Regulation (EU) 2026/1744, in force since 27 July 2026) moved deadlines: high-risk obligations under Annex III now apply from 2 December 2027. Research and heritage institutions keep their own TDM exception (Art. 3)."],
        do: "If you are a museum or research body, note that Art. 3 lets you mine texts for research too.",
        quiz: { q: "Is the GPAI Code of Practice mandatory?", o: ["No, it is voluntary", "Yes, for everyone", "Only in Germany"], a: 0, why: "Signatories commit voluntarily." }, try: "bots" },
      { id: "t12-3", t: "Privacy-safe measurement", conf: "D", cards: [
        "Analytics cookies generally need prior consent (Germany: § 25 TDDDG; France: CNIL guidance). Server logs can contain personal data under GDPR.",
        "Load analytics only after consent and mention it in your privacy notice.",
        "For bot analysis, shorten human IP addresses: you only need bot traffic."],
        do: "Check that your analytics loads only after consent.",
        quiz: { q: "Do analytics cookies need consent in the EU?", o: ["Generally yes", "Never", "Only for shops"], a: 0, why: "ePrivacy rules (e.g. § 25 TDDDG) require consent for non-essential cookies." }, try: "audit" },
      { id: "t12-4", t: "Accessibility law as an ally", conf: "D", cards: [
        "The European Accessibility Act applies since 28 June 2025 to specified services such as e-commerce, banking and ticketing (Germany: BFSG). Micro-enterprises providing services are exempt; public bodies have their own directive.",
        "Accessible pages have text alternatives, labels and clear structure.",
        "Whether that also makes sites easier for AI to read is plausible but not proven."],
        do: "Run one key page through an accessibility checker and fix the top three issues.",
        quiz: { q: "Since when does the European Accessibility Act apply?", o: ["28 June 2025", "1 January 2020", "Not yet"], a: 0, why: "Directive (EU) 2019/882 applies from 28 June 2025." }, try: "audit" },
      { id: "t12-5", t: "Impressum and honest marketing", conf: "D", cards: [
        "In Germany, provider details (Impressum) fall under § 5 DDG since May 2024. A complete Impressum also gives one consistent source for your legal name and address.",
        "Fake reviews are banned in the EU and the US. Disguised advertising breaks consumer law.",
        "Honesty is also good GEO: assistants repeat what is consistent and verifiable."],
        do: "Check that your Impressum is complete and matches your Business Profile.",
        quiz: { q: "Which law now covers the German Impressum?", o: ["§ 5 DDG", "§ 5 TMG", "GDPR Art. 5"], a: 0, why: "The Digitale-Dienste-Gesetz replaced § 5 TMG in May 2024." }, try: "audit" }
    ] },
    { id: "t13", icon: "sparkles", t: "New in November 2026", d: "Second research pass: what changed, and what we corrected.", lessons: [
      { id: "t13-1", t: "One shared AI-training opt-out", conf: "D", cards: [
        "On 30 October 2026, Google, OpenAI, Microsoft and Anthropic backed one shared robots.txt token for AI training: “User-agent: __usage_ai-training”, based on the IETF AIPREF work.",
        "It is not live yet: Google aims for early 2027, Microsoft from 1 February 2027, OpenAI “in the coming months”. Until then, keep naming each training bot.",
        "Careful: Google reads this token like Google-Extended, which also covers grounding in the Gemini app. It does not control AI Overviews or AI Mode: that is the Search Console setting."],
        do: "Put a reminder in your calendar for February 2027: check the Google and Bing crawler docs and decide whether to add the shared token.",
        quiz: { q: "You add the shared training token in 2027 and don't mention Google-Extended. What does Google do?", o: ["Treats it like a Google-Extended block, including Gemini grounding", "Removes you from AI Overviews", "Ignores it forever"], a: 0, why: "Google maps the shared token to Google-Extended, which also governs grounding in the Gemini app." }, try: "bots" },
      { id: "t13-2", t: "Cloudflare: “Block” now hits search", conf: "D", cards: [
        "Since 15 September 2026, Cloudflare's “Block” and “Block on pages with ads” settings apply to mixed-use crawlers, including Googlebot, Bingbot and Applebot.",
        "So switching on Block can quietly remove you from Google and Bing search, not only from AI training.",
        "To refuse training and stay in search, Cloudflare added “Disallow AI Training”, and marks Apple, Google and Microsoft as “Accountable” crawlers that remain allowed for search."],
        do: "If you use Cloudflare, open the AI crawler settings and check that “Block” is off unless you mean it. Use “Disallow AI Training” to refuse training only.",
        quiz: { q: "A Cloudflare site switched on “Block” for AI crawlers after 15 September 2026. What about Googlebot?", o: ["Blocked too", "Unaffected", "Blocked only on pages without ads"], a: 0, why: "Cloudflare: Block now applies to mixed-use crawlers, including Googlebot, Bingbot and Applebot." }, try: "audit" },
      { id: "t13-3", t: "robots.txt in court", conf: "D", cards: [
        "USA: in the OpenAI copyright litigation (S.D.N.Y., 15 December 2025), Judge Stein ruled that robots.txt is not an access control under the DMCA, comparing it to a “keep off the grass” sign.",
        "EU: a machine-readable reservation matters for the text-and-data-mining exception (OLG Hamburg, December 2025). Germany's Federal Court of Justice heard the appeal on 3 September 2026; no decision yet.",
        "Takeaway: technically robots.txt is a request, but in the EU it can be your legal reservation. Use it deliberately and keep a dated record."],
        do: "Save a dated copy of your robots.txt every time you change it.",
        quiz: { q: "In the US ruling on OpenAI (December 2025), what is robots.txt?", o: ["A request, not an access control", "A binding contract", "A copyright notice"], a: 0, why: "The court held that disregarding robots.txt is not circumvention under the DMCA." }, try: "bots" },
      { id: "t13-4", t: "North Africa and the Gulf", conf: "D", cards: [
        "Saudi Arabia's new Copyright Law (in force 12 August 2026) explicitly allows copying lawfully published works to develop AI, without permission or payment (Art. 26(4)). Republishing or directly exploiting them stays forbidden.",
        "Data protection: the Saudi PDPL is fully enforced since September 2024. The UAE PDPL is in force, but its Executive Regulations had not been issued by mid-2026. Tunisia: Organic Law 2004-63 still applies; reform bill 095/2025 is in committee, not adopted.",
        "No country-specific fake-review rule was found in Tunisia, Morocco, Egypt, the UAE or Saudi Arabia, but general misleading-advertising and consumer laws apply. Dubai Police reported shops posting false reviews in October 2026."],
        do: "Add a plain-language privacy notice that names the law that applies to you (for example Tunisia's Organic Law 2004-63) and a contact address.",
        quiz: { q: "Which country has an explicit copyright exception for AI training (November 2026)?", o: ["Saudi Arabia", "United Arab Emirates", "Tunisia"], a: 0, why: "Saudi Copyright Law 2026, Art. 26(4), in force since 12 August 2026." }, try: "audit" },
      { id: "t13-5", t: "Clicks and citations: the latest data", conf: "E", cards: [
        "Seer Interactive (2026 update, 53 brands, 5.47 million queries): the organic click rate on queries with an AI Overview recovered from 1.31% (Dec 2025) to 2.36% (Feb 2026), still below 3.82% for queries without one.",
        "Being cited inside the AI Overview brought about 120% more organic clicks per impression than not being cited. Seer says it cannot claim causation.",
        "Ahrefs (October 2026, 66.6 million ChatGPT answers): Reddit and Wikipedia citations fell sharply in US answers while primary sources such as PubMed and brand sites rose. Other datasets disagree, so measure your own appearance rate."],
        do: "Check whether your key page is cited in Google's AI Overview for your main question. If not, compare it with the cited pages.",
        quiz: { q: "According to Seer's 2026 update, does being cited in an AI Overview help?", o: ["Yes: about 120% more organic clicks per impression than not cited", "No difference", "It reduces clicks"], a: 0, why: "Seer: cited pages got about +120% vs not cited, though still about −38% vs queries with no AI Overview." }, try: "ask" }
    ] }
  ],
  // myth or fact (f: true = fact)
  facts: [
    { s: "Blocking GPTBot removes you from ChatGPT search.", f: false, why: "GPTBot is for training. ChatGPT search depends on OAI-SearchBot." },
    { s: "Blocking Google-Extended removes you from AI Overviews.", f: false, why: "AI Overviews depend on Googlebot and snippet rules, not Google-Extended." },
    { s: "Google Search ignores llms.txt.", f: true, why: "Google: such files neither harm nor help visibility in Google Search." },
    { s: "FAQ schema still gives you dropdowns in Google.", f: false, why: "FAQ rich results stopped appearing on 7 May 2026." },
    { s: "A tool can tell you your exact ranking position in ChatGPT.", f: false, why: "Answers change nearly every run; only appearance rates are meaningful." },
    { s: "Copilot cites sources from Bing.", f: true, why: "Bing's AI Performance report covers Copilot citations." },
    { s: "Keyword stuffing helps AI quote you.", f: false, why: "In the GEO study it performed worse than doing nothing." },
    { s: "Public Instagram posts of professional accounts can appear in Google.", f: true, why: "Since 10 July 2025, for public professional accounts of adults." },
    { s: "Buying reviews is legal if they look real.", f: false, why: "Banned by the FTC rule (2024) and the EU Omnibus Directive (2022)." },
    { s: "Search Console shows AI impressions since 2026.", f: true, why: "Generative AI reports launched in June 2026, worldwide since 31 August 2026." },
    { s: "robots.txt is a technical lock that stops every bot.", f: false, why: "It is a voluntary standard; some user-triggered fetchers may not follow it." },
    { s: "Your CDN can block AI bots even if robots.txt allows them.", f: true, why: "Google lists checking CDN and hosting settings as a best practice." },
    { s: "Cloudflare's “Block AI bots” setting can also block Googlebot.", f: true, why: "Since 15 September 2026 it applies to mixed-use crawlers, including Googlebot, Bingbot and Applebot." },
    { s: "In the US, robots.txt counts as an access control under the DMCA.", f: false, why: "OpenAI copyright litigation (S.D.N.Y., Dec 2025): disregarding robots.txt is not circumvention." },
    { s: "Saudi Arabia allows copying lawfully published works to develop AI.", f: true, why: "Copyright Law 2026, Art. 26(4), in force since 12 August 2026." }
  ],
  ui: {
    conf: { D: "Documented", E: "Evidence-based", OD: "Open debate" },
    confD: { D: "Official or primary source.", E: "Credible study; see its limits.", OD: "Not clearly proven: both sides are shown." },
    do: "Fix it now", doDone: "Done", sources: "Sources", checked: "Research status", review: "Review your mistakes", reviewD: "{n} questions you got wrong", reviewNone: "Nothing to review: well done.", mins: "2 min · 3 cards · quiz",
    trySocial: "Open one of your channels with the Sada panel open."
  }
};
