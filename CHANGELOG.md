# Sada 0.8.5

## Licence and links
- Sada's source code is now public on GitHub (github.com/ayka-technologies/sada) under the Functional Source License
  (FSL-1.1-ALv2): free for any use, including professional work for clients, except offering a competing product.
  Each version becomes Apache-2.0 two years after its release. Version 0.8.4 and earlier stay under Apache-2.0.
- The Pro tab says "free, and their source code is public on GitHub" instead of "open source".
- The extension's homepage link points to getayka.com/sada/.

# Sada 0.8.4

## XP only for real progress
- Clicking the Sada icon on a social profile re-checked it and gave +10 XP every time. Each XP reward now counts once: a profile check once per profile, a mission, site scan, rival check, highlight or simulation once per site or page per day, a plan step or Academy task once ever (switching it off and on again gives nothing), drafts up to 3 times a day, games up to 10 right answers per game per day.
- Re-opening the panel or re-running a check still works as before; it just no longer adds XP.
- The panel could stop updating when Chrome paused its drawing (for example while the panel was in the background); it now always redraws.

# Sada 0.8.3

## Test-guide run (0.8.1 guide, all sections) and fixes
Tested in a real Chromium with the extension loaded, against local copies of the pages (albstadt.de, getayka.com, a WordPress restaurant, LinkedIn/Instagram/Facebook profile pages), in English, German (dark mode) and Arabic (right to left), at 400, 360 and 320 px panel width. Chrome's built-in AI was tested with a stand-in model (real model output was not tested).

### Question coverage (Agent mission): fewer false "answered" and false "missing"
- Price, hours, booking, contact and review questions now need real evidence (a price, an hour, a phone number, an address); a word such as "lab 10" no longer counts as a price.
- Words that ask the same thing are grouped (Wochenende/Veranstaltungen, repas/menu, Stellen/Bewerbung, …); German compounds count ("Bewerbungsschluss" for "bewerben").
- Questions with "or" are answered when either half is.
- Contact details in the footer (address, phone) now count, as AI crawlers read them; "Book a free call" counts as a partial answer to "How do I start a project?".
- Missing questions no longer show a link to a page that does not answer them.

### Quotable sentences
- Sentence splitting now uses the same rules as the on-page highlighter: "llms.txt" or "z.B." no longer split a sentence, and quoted questions inside a sentence stay together.
- Rows of buttons or links ("Get your free check  Explore the lab") are no longer counted as quotable sentences, in the audit and in the highlighter.

### Interface
- Without on-device AI, the "Rewrite with AI", "Suggest 2 versions" and "Quick read by on-device AI" boxes are hidden instead of failing on click.
- Audit: the "Start here" findings come first, the AYKA project card after them; finding titles get the full width on narrow panels; toolbar buttons no longer cut off their labels.
- Questions list: status labels have one width, so the questions line up.
- Social Studio: shorter header in every section except Profiles; plan rows stay on one line (copy buttons become icons below 380 px); Watch shows "How often" on one line; long handles no longer overlap the follower count; field hints in the fix kit sit under the field name.
- Watch: a page that answers 404 says "Page not found, check that the address is still right" instead of "not readable".
- Grammar for counts of one ("1 action link found", "Answer the question your site leaves open", "1 project"); counts in Studio messages read "Posts planned: 12".
- AI bios that are too long are cut at the end of a sentence.

# Sada 0.8.2

## LinkedIn and Facebook pages: clearer editing
- Opening a LinkedIn company page (or a Facebook page) from the fix kit showed the public page with no way to edit it when your account is not an admin of that page; this is how LinkedIn works, but the kit did not say so.
- The button now says "Open the page (admins can edit it there)", and the kit explains that "Edit page" and admin tools appear only for admins of the page.
- New "Copy the whole kit": name, bios, link, place, long description and where to paste them in one text, to send to the person who manages the profile (useful for agencies and teams). Available for every platform.

# Sada 0.8.1

## Fixes from testing the Social Studio
- LinkedIn "Open profile settings" led to "This LinkedIn Page isn't available": the admin address only works for page admins. Sada now opens the page itself and says to use "Edit page" / admin tools while logged in as an admin.
- Every "Open profile settings" now warns that Chrome opens the account you are logged in with, and names the handle to check.
- LinkedIn's "unavailable", admin and "/in/me" pages are no longer listed as channels; error or login pages are not recorded at all.
- Fix kit without a known website: uses what the channel shows (its website link, category, place, and the first statement of its bio) instead of empty placeholders, and explains how to get a better kit. It never uses another website that happens to be open.
- Channels that are not connected to any website appear in their own group in Profiles.
- "Open and check" without access to all sites switches to the Agent tab, so the access banner is visible.
- Panel opened about 2 seconds late on new Chrome profiles (waiting for managed policies): it now appears at once.
- Posts: questions that do not name the organisation ("Which restaurants in Lyon…?") now say who answers them; French question marks get the narrow space, Arabic uses "؟"; topic posts without a link point to the website; long or mixed-script phrases are no longer turned into hashtags; Pinterest no longer gets a "first line" warning.
- LinkedIn post button opens LinkedIn's post window with the text (usually filled in; it is also copied); Threads opens on threads.com; links that would be too long open the platform empty, with the text copied.
- Watch: login pages are recognised and never reported as a bio change or outage.
- Wording checked: name-field search (Instagram, X, TikTok), YouTube Studio "Profile", Bluesky handle path, EU AI Act wording on human review.

## Tests run
- 29,078 automated checks of the post and profile engine (12 platforms × 4 languages × 7 kinds of organisation × 4 sources), Watch, website-system detection and all strings.
- 459 browser checks in five scenarios: fresh install, channel first, full flow (website, three channels, kits, 36 drafts, 12 composer links, editing, plan, reminder notification, Watch by alarm, website code), WordPress in French, and no site access; plus all earlier test suites.

# Sada 0.8.0

## Social Studio (new tab), no platform APIs, no server
Sada prepares everything and opens the platform's own window; the person clicks Post or Save. Sada never posts, clicks or types on a platform by itself: platforms forbid automation tools (LinkedIn names browser extensions explicitly), and this keeps accounts safe. No developer accounts, keys or platform APIs are needed.

- Profiles: every channel Sada has checked or found on the website, with score, and a "Same everywhere?" table (name, bio, link to site, site links back, place).
- Fix kit per channel: searchable name field, three bio options within the platform's limit, website link with UTM tags, category, place, long description (LinkedIn, YouTube, Facebook, XING, Pinterest), where to paste it, and a button that opens the profile settings. With Chrome's built-in AI (on this computer), three more bio options.
- Posts: drafts for Instagram, Facebook, LinkedIn, X, Bluesky, Threads, YouTube, TikTok, Pinterest, XING, Google Business Profile and WhatsApp, written from the questions people ask AI that the website already answers, from the open page, or from your own topic. Each draft is fitted to the platform's limit and checked (length, first line before "see more", link, names the organisation and place, hashtags, placeholders), with an image description. Optional UTM tags and an optional "AI-assisted" note. "Improve with on-device AI" when Chrome's built-in model is available.
- Publishing: official share links where they exist (X, Bluesky, Threads, WhatsApp, Pinterest with text; LinkedIn and Facebook with the link, text copied); Instagram, TikTok, YouTube, XING and Google Business Profile: text copied, platform opened.
- Plan: reminders at a chosen date and time, or a plan of one post per week per platform; Chrome notifications open the composer; missed reminders appear as "Due now"; posts can be marked as posted.
- Watch: re-checks your own website and your public channel pages daily or weekly, logged out, and reports changes: site down, noindex or nosnippet, AI search bots blocked in robots.txt, structured data lost or broken, channels removed from sameAs, meta description lost, title changed, llms.txt, followers, likes and new posts (where the public preview shows them). Optional notifications. A missed check runs when Sada opens.
- Website: detects the website system (WordPress, Wix, Shopify, Squarespace, Jimdo, TYPO3, Webflow, Joomla, Drupal, Ghost, Weebly, GoDaddy) and says where to change title and description, where to add structured data, robots.txt/llms.txt and social links; generates the JSON-LD (Organization type matched to the kind of organisation, with sameAs for all channels) and footer links.
- Channel check: buttons to the fix kit and to post drafts.
- Composer and settings pages that Sada opens no longer switch the panel away from the Studio.
- Background service worker is now an ES module (shared code for Watch and reminders).
- Trust texts updated: alarms and notifications are used for reminders and Watch; the safety card says what Watch reads.

## Not possible without platform APIs (stated in the app)
- Fully automatic posting and changing profiles or websites by Sada itself.
- Reading statistics of logged-in accounts; LinkedIn usually shows logged-out visitors a login wall, so Watch can only check what is public.
- Checks and reminders only run while Chrome is open.

# Sada 0.7.3

## Social channel check: fixes from the Albstadt test (LinkedIn, Instagram, Facebook)
- Wrong comparison website: a channel was compared with the last website you had opened (getayka.com), so "Your website links back", "Links to your website" and "Same name" were wrong, and the suggested bio described the wrong organisation. Now Sada compares only with a website that links to the channel, or with the website the channel itself links to. When Sada may read that website, it reads its home page by itself (on this computer, without cookies). A site with only the same name is marked "not confirmed". The panel says which of these applies.
- Crawler access ("AI and search crawlers may read …") is the platform's own setting. It is still shown, with the new status "Search only" when Google and Bing may read but AI assistants may not, and it no longer lowers the channel's score.
- Preview text that is the platform's fixed standard text (Instagram) is shown as a note, not as something to improve.
- LinkedIn: reads the newer page layout: tagline, overview text, the "category · place · followers" line, and the labelled fields on the About page (website, headquarters, industry, phone).
- Facebook: reads the Intro box (description, page category, address, phone, e-mail) and posts in the newer layout.
- "Says where you are": the channel name counts too (for example "Stadtverwaltung Albstadt"), as does a town named in it.
- "Posts carry real text": one readable post is enough to judge.
- Links given as http:// are read over https first.

# Sada 0.7.2

## Safety made visible
- Before Chrome asks for site access, Sada now shows a "Safe to allow" card: runs only on this computer with no Sada server, read-only, reads only the tab you are looking at, and how to switch following off or remove access at any time.
- The card explains Chrome's standard warning ("read and change all your data on all websites") before it appears, and what Sada actually does with the access.
- The button now says "Allow and update", next to "See the proof" (opens the Trust center with the live request log).
- Header: the bare shield icon is now a labelled "Private" badge that opens the Trust center.
- The same card appears under the "click the Sada icon" notice when no banner is shown.
- Trust center corrected to match what Sada really does: following the active tab after you allow all sites, why site access is asked for, and that on a social channel Sada reads the profile fields it checks as your tab shows them (never messages or account settings).

# Sada 0.7.1

## Fix: "Update for this tab" did nothing on a new site
- Cause: Chrome only lets an extension read a tab after a click on its toolbar icon, or after the extension has been allowed on all sites. A click inside the side panel does not count, so the button failed silently and the banner stayed.
- Now the button asks Chrome for the permission straight away, if it is missing, and updates as soon as it is given. This is needed only once; after that, Sada also follows your tabs on its own.
- If the permission is refused, the banner explains the other way: click the Sada icon in the toolbar while on the page.
- The separate "Allow on all sites" button was removed from the banner; the update button now does both.

# Sada 0.7.0

## Sada Academy 2026 v2 (second research pass, status 9 November 2026)
- New track "New in November 2026" (5 lessons, all 4 languages): the shared AI-training opt-out token announced on 30 October 2026, Cloudflare "Block" now also stopping Googlebot, robots.txt in court (US and EU), North Africa and the Gulf (Saudi AI copyright exception, data-protection status in Saudi Arabia, the UAE and Tunisia, fake reviews), and the latest click and citation data (Seer 2026, Ahrefs October 2026).
- Myth or fact: 3 new statements (15 in total).
- Corrections in existing lessons:
  - t1-4: SparkToro/Gumshoe exact figures removed; study marked as not peer-reviewed.
  - t2-4: Cloudflare "Block" also blocks mixed-use crawlers (Googlebot, Bingbot, Applebot) since 15 September 2026; "Disallow AI Training" added.
  - t2-5: Search Console setting "Search generative AI" (since 31 August 2026): scope and limits (not Gemini app, not training).
  - t3-4: unsupported claim about other tools reading llms.txt removed.
  - t4-5: FAQ documentation removed June 2026; list of still-documented rich results updated; Dataset only for Dataset Search.
  - t6-1: citation shares are volatile; Ahrefs (Reddit/Wikipedia drop in US ChatGPT answers) and BrightEdge (Reddit growing in AI Overviews) contrasted.
  - t8-3: Course list markup is still documented.
  - t10-1: Generative AI report shows impressions only (no clicks, no queries), data from about 18 May 2026; API claim removed.
  - t12-1: Kneschke v. LAION stated precisely (burden of proof, open question); BGH hearing 3 September 2026, case not final.
  - t12-2: GPAI Code wording attributed to legal commentators; Digital Omnibus (Regulation (EU) 2026/1744) and new high-risk date 2 December 2027.
- Sources: 22 new dated sources; Seer link added; four sources are listed by title only because their URL could not be verified.

## Still unverified (do not present as fact)
- robots.txt of Facebook, X, Pinterest, Threads and Bluesky.
- The ~0.1% llms.txt log figure, and SparkToro's exact probabilities.
- Content Signals syntax beyond Cloudflare's own documentation; GA4 and Matomo AI-referral documentation.
- Citation studies for Arabic-language answers; current Wikipedia notability practice for organisations.

# Sada 0.6.0

## Sada Academy 2026 v1
- 60 new lessons in 12 tracks, in English, French, German and Arabic, built from a sourced research base (status 9 November 2026): how AI finds you, crawler access, readability, entity recognition, writing to be quoted, reputation, social channels, sector playbooks (museums, memorial sites, universities, NGOs, awards, town halls), AI agents, measurement, myths and monthly routine, EU law and ethics.
- Every lesson shows its evidence level: Documented, Evidence-based or Open debate (both sides shown).
- Every lesson lists its dated sources, and has a "Fix it now" task you can tick off (+20 XP).
- New "Review your mistakes" mode; the daily drill also brings back questions you got wrong.
- Myth or fact game: 12 new statements from the research.
- Corrected the FAQ fix-pack note: Google stopped showing FAQ rich results on 7 May 2026.

## Re-check before publishing
- Items marked "via" in the sources come from trade publications reporting the original; re-check them against the original sources.
- Facebook, X, Pinterest, Threads and Bluesky robots.txt were not verified in the research; Arab-world law was not researched in depth.

# Sada 0.5.0

## Follows your tabs
- New update button in the header, and a banner when you switch to another tab or open a new page: no need to close and reopen Sada.
- With "Allow on all sites" (asked once), Sada updates by itself when you switch tabs or navigate. Can be switched off in Settings ("Follow the active tab"). AI assistant tabs are skipped so the Visibility lab keeps showing your site.

## Social channel check: fixes from real pages
- Links written as text or shown as a button ("albstadt.link/… and 1 more") are now found, as well as links in the data platforms embed in the page (Instagram, LinkedIn, Facebook, TikTok, YouTube, Pinterest).
- LinkedIn: the website and description are read from the company's About tab, using your own LinkedIn session on this computer.
- Dates in French, German, English and Arabic short forms ("1 sem.", "2 Tg.", "3mo") and Instagram post dates are understood.
- "Visible without logging in" no longer says "Blocked" when a platform simply refused Sada's request; it says it could not confirm and how to check. Private accounts are detected.
- "Bio says what you are" also counts the channel name and its category ("Stadt Albstadt", "Services exécutifs").
- Same organisation on another domain ending (albstadt.link and albstadt.de) counts as your own link; "Stadt Albstadt" and "Stadtverwaltung Albstadt" count as the same name.
- When no website is known yet, "Read and compare" reads the linked website (permission for that one site) and compares it.

## Websites
- Town administrations ("Stadt Albstadt", "Gemeinde …", "City of …", "Ville de …") are recognised, with questions about events, living there, sights, registering an address and jobs.

# Sada 0.4.0

## Better questions in the Visibility lab
- New organisation profile: the name comes from structured data, og:site_name, the logo, the copyright line and title segments that repeat across pages, checked against the domain (so "hs-albsig.de" becomes "Albstadt-Sigmaringen University", not "Hs-albsig"). Name variants in other languages are kept as "also known as" and count as a mention when an AI answer is checked.
- 23 sectors instead of 8, including university, school, training, museum and memorial, association and foundation, award and competition, archive / atlas / research / learning app, and public office.
- Place from postal addresses, schema.org and the country domain. Language names ("in English") are never taken as places.
- Offers from degree programmes, schema.org offers, services and repeated topics; navigation noise is ignored.
- The home page is read along with the current page (same site only; switched off by the "Current page only" policy).
- Sector question sets in English, French, German and Arabic, with correct articles, plurals and "in X" phrases.
- Profile editor: choose the sector, write your own label, offers, audience and place.
- Profiles confirmed in 0.3 are re-derived once, because the old ones could be wrong.

## New: social channel check
- Opens automatically on Instagram, Facebook, LinkedIn, X, YouTube, TikTok, Threads, Pinterest, Bluesky and XING profiles.
- Checks: AI and search crawler access (the platform's robots.txt), what a logged-out visitor sees, preview text, same name as the website, a bio that says what you are, place, link to the website, link back from the website (sameAs), contact, recent activity and post text.
- Compares with the website you last checked in Sada and suggests a bio within the platform's character limit.
- Automatic checks need optional permission for those sites; Chrome asks once. Everything is read on the device.
