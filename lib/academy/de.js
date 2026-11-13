// Sada Academy 2026 v1 · Deutsch (übersetzt aus der englischen Quellfassung, Stand der Recherche: 9. November 2026)
export default {
  tracks: [
    { id: "t1", icon: "radar", t: "Wie KI Sie findet", d: "Gedächtnis, Live-Suche und warum jede Antwort anders ist.", lessons: [
      { id: "t1-1", t: "Gedächtnis oder Live-Suche?", conf: "D", cards: [
        "Ein KI-Assistent antwortet aus zwei Quellen: aus dem, was er im Training gelernt hat (sein Gedächtnis), und aus einer Live-Websuche zu Ihrer Frage.",
        "Jedes Unternehmen nutzt dafür verschiedene Bots. OpenAI: GPTBot sammelt Trainingsdaten, OAI-SearchBot speist die ChatGPT-Suche. Anthropic: ClaudeBot und Claude-SearchBot. Google: Google-Extended für Gemini-Training, Googlebot für die Suche und ihre KI-Funktionen.",
        "Sie haben also zwei Aufgaben: heute lesbar und indexiert sein (Technik) und so oft erwähnt werden, dass Sie ins Gedächtnis gelangen (Reputation)."],
        do: "Notieren Sie 10 Fragen, die echte Besucher stellen, bevor sie sich für Sie entscheiden, z. B. „Öffnungszeiten [Museum] Sonntag“. Sie brauchen sie in Kurs 10 wieder.",
        quiz: { q: "Welcher OpenAI-Bot entscheidet, ob Ihre Seiten in Antworten der ChatGPT-Suche erscheinen?", o: ["OAI-SearchBot", "GPTBot", "Googlebot"], a: 0, why: "OpenAI: Websites, die OAI-SearchBot sperren, erscheinen nicht in Antworten der ChatGPT-Suche. GPTBot dient dem Training." }, try: "ask" },
      { id: "t1-2", t: "KI-Übersichten und KI-Modus", conf: "D", cards: [
        "Googles KI-Funktionen holen zuerst Seiten aus dem Google-Suchindex und schreiben dann die Antwort. Google nennt das „Grounding“ (Retrieval-Augmented Generation).",
        "Der KI-Modus zerlegt Ihre Frage in viele verwandte Suchen gleichzeitig, den „Query Fan-out“. Eine Frage zu Unkraut im Rasen sucht auch nach „beste Unkrautvernichter“ und „Unkraut ohne Chemie entfernen“.",
        "KI-Übersichten erscheinen nur, wenn Google sie für hilfreich hält, also oft gar nicht. Eine Seite muss indexiert sein und ein Snippet erlauben, um verlinkt zu werden."],
        do: "Suchen Sie Ihre 3 wichtigsten Fragen bei Google. Notieren Sie, ob eine KI-Übersicht erscheint und welche Websites sie verlinkt.",
        quiz: { q: "Ihre Seite rankt gut, hat aber die Regel „nosnippet“. Kann sie in einer KI-Übersicht verlinkt werden?", o: ["Nein", "Ja, das Ranking genügt", "Nur im KI-Modus"], a: 0, why: "Google verlangt, dass Seiten indexiert sind und mit Snippet in der Suche erscheinen dürfen." }, try: "audit" },
      { id: "t1-3", t: "Wessen Index?", conf: "D", cards: [
        "Nicht jeder Assistent nutzt Google. Microsoft Copilot zitiert aus Bing: Bings Bericht „AI Performance“ zählt Zitate in Copilot und Bings KI-Zusammenfassungen.",
        "ChatGPT, Claude und Perplexity betreiben eigene Such-Crawler: OAI-SearchBot, Claude-SearchBot, PerplexityBot. OpenAI sagt nicht öffentlich, welche anderen Indizes es nutzt; die Behauptung „ChatGPT läuft über Bing“ ist nicht belegt.",
        "Praktische Regel: In Google und Bing indexiert sein und die Such-Bots der Assistenten hereinlassen."],
        do: "Suchen Sie site:ihredomain bei Google und bei Bing. Fehlen wichtige Seiten, beheben Sie zuerst die Indexierung.",
        quiz: { q: "Microsoft Copilot findet Webseiten vor allem über…", o: ["Bing", "Googles Index", "Nur seine Trainingsdaten"], a: 0, why: "Bings AI-Performance-Bericht erfasst Zitate in Copilot und Bings KI-Zusammenfassungen." }, try: "audit" },
      { id: "t1-4", t: "Warum Antworten sich unterscheiden", conf: "E", cards: [
        "KI-Antworten ändern sich von Durchlauf zu Durchlauf. In einer Studie von SparkToro und Gumshoe (Januar 2026) stellten Freiwillige dieselben Prompts tausende Male in ChatGPT, Claude und Google AI.",
        "Zweimal dieselbe Markenliste zu erhalten war sehr selten, dieselbe Reihenfolge noch seltener. Stabil war nur, wie oft eine Marke vorkommt. (Berichtet von Search Engine Journal; nicht begutachtet.)",
        "Der KI-Modus ist zudem personalisiert: Er kann frühere Suchen einbeziehen. Zwei Menschen mit derselben Frage können andere Quellen sehen."],
        do: "Stellen Sie eine Ihrer Fragen dreimal in einem neuen Chat. Zählen Sie, in wie vielen Antworten Sie vorkommen.",
        quiz: { q: "Eine ChatGPT-Antwort nannte Ihr Museum nicht. Was folgt daraus?", o: ["Fast nichts: Messen Sie, wie oft Sie über viele Durchläufe vorkommen", "Sie sind bei ChatGPT gesperrt", "Ihr Ranking ist gefallen"], a: 0, why: "Antworten variieren fast jedes Mal. Verfolgen Sie über Monate den Anteil der Durchläufe mit Ihnen." }, try: "ask" },
      { id: "t1-5", t: "Klicks in einer KI-Welt", conf: "E", cards: [
        "Pew Research (Juli 2025, 900 Erwachsene in den USA, 68.879 Suchen): Mit KI-Zusammenfassung klickten Menschen in 8 % der Besuche auf ein normales Ergebnis, ohne in 15 %. Auf einen Link in der Zusammenfassung in 1 %.",
        "Ahrefs fand die Klickrate des ersten Ergebnisses rund 34,5 % niedriger, wenn eine KI-Übersicht erschien (Daten März 2025), und rund 58 % niedriger im Update vom Februar 2026. Das sind Korrelationen, keine Beweise.",
        "Seer Interactive sah, dass in der KI-Übersicht zitierte Marken mehr Klicks erhielten als nicht zitierte. Messen Sie Anfragen und Buchungen, nicht nur Besuche."],
        do: "Wählen Sie in Ihrer Statistik ein wichtiges Ziel (Buchung, Anfrage, Spende, Bewerbung) und prüfen Sie es monatlich neben den Besuchen.",
        quiz: { q: "Die Besuche sinken, aber KI-Funktionen zeigen Ihre Seiten. Was sollten Sie zusätzlich messen?", o: ["Abschlüsse wie Buchungen oder Bewerbungen", "Nur die Absprungrate", "Nichts: Besuche sind das einzige Maß"], a: 0, why: "Studien zeigen weniger Klicks mit KI-Zusammenfassungen; entscheidend ist, ob die Besucher handeln." }, try: "mission" }
    ] },
    { id: "t2", icon: "shield-check", t: "Die Tür öffnen", d: "robots.txt, KI-Bots, CDNs und Googles Steuerung.", lessons: [
      { id: "t2-1", t: "robots.txt in 10 Minuten", conf: "D", cards: [
        "robots.txt ist eine öffentliche Textdatei unter ihredomain/robots.txt. Sie sagt Crawlern, was sie lesen dürfen. Sie ist ein freiwilliger Standard (RFC 9309), kein Schloss.",
        "Jeder Block beginnt mit „User-agent:“ (dem Namen des Bots), dann folgen „Disallow:“- oder „Allow:“-Regeln. Ein nicht genannter Bot folgt dem Block „User-agent: *“.",
        "Ergänzen Sie eine Zeile „Sitemap:“, damit Crawler alle Ihre Seiten finden."],
        do: "Öffnen Sie ihredomain/robots.txt. Prüfen Sie, dass Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot und PerplexityBot nicht gesperrt sind und eine Sitemap-Zeile existiert.",
        quiz: { q: "Ein Bot wird in der robots.txt nirgends genannt. Welche Regeln gelten für ihn?", o: ["Der Block „User-agent: *“", "Keine, er darf alles lesen", "Der Googlebot-Block"], a: 0, why: "Nicht genannte Bots folgen den Regeln für alle User-Agents (*)." }, try: "bots" },
      { id: "t2-2", t: "Der KI-Bot-Zoo", conf: "D", cards: [
        "Trainings-Bots sammeln Text für künftige Modelle: GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot.",
        "Such-Bots indexieren Seiten für KI-Antworten: OAI-SearchBot, Claude-SearchBot, PerplexityBot. Laut Anthropic kann das Sperren von Claude-SearchBot Ihre Sichtbarkeit in Claudes Suchergebnissen verringern.",
        "Nutzer-Bots holen eine Seite, wenn ein Mensch fragt: ChatGPT-User, Claude-User, Perplexity-User. Laut OpenAI gilt robots.txt für ChatGPT-User womöglich nicht; Perplexity-User ignoriert sie meist; Claude-User beachtet sie laut Anthropic."],
        do: "Spielen Sie das Bot-Spiel in dieser Akademie, bis Sie 8/8 erreichen.",
        quiz: { q: "Welcher davon ist ein Trainings-Bot, kein Such-Bot?", o: ["GPTBot", "OAI-SearchBot", "PerplexityBot"], a: 0, why: "OpenAI: GPTBot sammelt Inhalte, die zum Training seiner Modelle genutzt werden können." }, try: "bots" },
      { id: "t2-3", t: "Training sperren, Suche erlauben", conf: "D", cards: [
        "Sie können Training ablehnen und trotzdem gefunden werden: Trainings-Bots mit „Disallow: /“ nennen, Such-Bots mit „Allow: /“.",
        "Google-Extended zu sperren entfernt Sie nicht aus den KI-Übersichten: Diese steuern Googlebot und die Snippet-Regeln.",
        "Ob Sie Training sperren, ist Ihre Entscheidung. Für kleine Organisationen gibt es keine Messdaten in die eine oder andere Richtung: Halten Sie es als bewusste Entscheidung fest."],
        do: "Übernehmen Sie die Vorlage aus dem Fix-Paket des Agenten, passen Sie die Sitemap-Adresse an und lassen Sie sie veröffentlichen.",
        quiz: { q: "Sie sperren Google-Extended. Was passiert mit Ihren KI-Übersichten?", o: ["Nichts: Sie hängen an Googlebot", "Sie verschwinden daraus", "Ihre Rankings sinken"], a: 0, why: "Google: Google-Extended betrifft Gemini-Training und Grounding in einigen anderen Systemen, nicht die KI-Funktionen der Suche." }, try: "audit" },
      { id: "t2-4", t: "Ihr CDN sperrt vielleicht KI", conf: "D", cards: [
        "Die beste robots.txt nützt nichts, wenn Hosting oder CDN den Bot vorher abblocken. Google nennt die Prüfung von „CDN oder Hosting-Infrastruktur“ als bewährte Praxis.",
        "Seit 1. Juli 2025 sperrt Cloudflare KI-Crawler auf neuen Domains standardmäßig und bietet „Pay Per Crawl“ an.",
        "Seit 15. September 2026 stoppen Cloudflares Einstellungen „Block“ und „Block on pages with ads“ auch gemischt genutzte Crawler, darunter Googlebot, Bingbot und Applebot: Sie nehmen Sie also auch aus der Suche. Training ablehnen und in der Suche bleiben: die neue Einstellung „Disallow AI Training“."],
        do: "Fragen Sie Ihren Hoster oder prüfen Sie Ihr Cloudflare-Dashboard: Welche KI-Crawler sind gesperrt? Erlauben Sie die gewünschten Such-Bots.",
        quiz: { q: "Die robots.txt erlaubt alles. Können KI-Such-Bots trotzdem gesperrt sein?", o: ["Ja, durch CDN oder Firewall", "Nein, die robots.txt entscheidet", "Nur am Wochenende"], a: 0, why: "Sicherheitsschichten können Bots blockieren, bevor diese die robots.txt lesen." }, try: "audit" },
      { id: "t2-5", t: "Snippets und Googles KI-Opt-out", conf: "D", cards: [
        "Um einzuschränken, was Google von einer Seite zeigt, nutzen Sie nosnippet, data-nosnippet (für Teile einer Seite), max-snippet oder noindex.",
        "Seit 31. August 2026 hat jede Website in der Search Console die Einstellung „Search generative AI“: Sie können Ihre Website von KI-Übersichten, KI-Modus und KI-Funktionen in Discover ausschließen.",
        "Sie gilt nicht für die Gemini-App oder KI-Training: Dafür bleibt Google-Extended zuständig. Ausgeschlossene Websites erhalten aus diesen Funktionen keinen Traffic und keine Impressionen; laut Google kein Rankingsignal an anderer Stelle."],
        do: "Soll ein Absatz nie zitiert werden (z. B. veraltete Preise), umschließen Sie ihn mit data-nosnippet, statt die ganze Seite zu verstecken.",
        quiz: { q: "Was kostet Sie Googles KI-Opt-out von 2026?", o: ["Allen Traffic und alle Impressionen aus den KI-Funktionen", "Ihre normalen Rankings", "Gar nichts"], a: 0, why: "Google: Abgemeldete Websites erhalten keinen Traffic und keine Impressionen aus den generativen KI-Funktionen." }, try: "audit" }
    ] },
    { id: "t3", icon: "eye", t: "Lesbar sein", d: "Text, JavaScript, Sitemaps, llms.txt und Sprachen.", lessons: [
      { id: "t3-1", t: "Text schlägt Bilder und PDFs", conf: "D", cards: [
        "Google bittet darum, wichtige Inhalte als Text bereitzustellen. Öffnungszeiten im Bild, Preise im PDF, Termine nur auf dem Plakat: Maschinen übersehen sie womöglich.",
        "Bilder und Videos zählen trotzdem: Wer Googles Bild- und Video-Leitfäden folgt, ist laut Google bereits für die KI-Suche vorbereitet.",
        "Geben Sie Bildern Alternativtext und Videos Transkripte. Das hilft Menschen mit Behinderungen und Maschinen."],
        do: "Finden Sie eine Angabe, die nur in einem Bild oder PDF steht (Zeiten, Preise, Fristen), und schreiben Sie sie als Text auf die Seite.",
        quiz: { q: "Ihre Öffnungszeiten stehen nur auf einem Plakatbild. Risiko?", o: ["Maschinen lesen sie womöglich nicht", "Keins, KI liest alle Bilder", "Google verbietet Bilder"], a: 0, why: "Google bittet darum, wichtige Inhalte in Textform bereitzustellen." }, try: "machine" },
      { id: "t3-2", t: "JavaScript und KI-Crawler", conf: "OD", cards: [
        "Google rendert JavaScript. Die meisten KI-Firmen sagen nicht, ob ihre Bots das tun; Perplexity etwa dokumentiert es nicht.",
        "Sichere Annahme: Inhalte, die erst nach dem Ausführen von JavaScript im Browser erscheinen, sind für manche KI-Bots unsichtbar.",
        "Sadas Audit vergleicht das rohe HTML mit der gerenderten Seite und warnt, wenn ohne JavaScript der meiste Text fehlt."],
        do: "Führen Sie Sadas Audit auf Ihrer Startseite aus und lesen Sie den Punkt zu Inhalten ohne JavaScript.",
        quiz: { q: "Ist belegt, dass alle KI-Bots JavaScript ausführen?", o: ["Nein, die meisten dokumentieren es nicht", "Ja, alle", "Ja, seit 2025"], a: 0, why: "Nur Google dokumentiert das Rendern; für die anderen ist es offen." }, try: "audit" },
      { id: "t3-3", t: "Sitemaps und IndexNow", conf: "D", cards: [
        "Eine XML-Sitemap listet Ihre Seiten und ist Googles dokumentierter Weg, die Entdeckung zu erleichtern. Reichen Sie sie in der Search Console und den Bing Webmaster Tools ein.",
        "Mit IndexNow melden Sie Bing und einigen anderen Suchmaschinen sofort eine Änderung. Google nutzt es nicht.",
        "Die meisten Systeme (WordPress-Plugins, Shopify, TYPO3-Erweiterungen) erzeugen beides: Schalten Sie es ein."],
        do: "Öffnen Sie ihredomain/sitemap.xml. Fehlt sie, aktivieren Sie die Sitemap-Funktion Ihres Systems und reichen Sie sie in beiden Webmaster-Tools ein.",
        quiz: { q: "Welche Suchmaschine nutzt IndexNow NICHT?", o: ["Google", "Bing", "Keine von beiden"], a: 0, why: "IndexNow wird von Bing und anderen unterstützt, nicht von Google." }, try: "audit" },
      { id: "t3-4", t: "llms.txt: die ehrliche Geschichte", conf: "OD", cards: [
        "llms.txt ist eine vorgeschlagene Datei, die eine Website für KI zusammenfasst. Google zählt sie zu den unnötigen Taktiken: Die Google-Suche ignoriert sie, sie schadet und nützt nicht.",
        "SE Ranking (Nov. 2025, ~300.000 Domains) fand sie auf rund 10 % der Websites und keinen Effekt darauf, wie oft KI sie zitiert. Eine Log-Studie fand nur ~0,1 % der KI-Bot-Anfragen auf dieser Datei.",
        "Andere Seite: Manche Fachleute meinen, andere Assistenten als Google könnten sie lesen, doch kein KI-Anbieter dokumentiert eine Nutzung. Billig anzulegen, aber kein Wundermittel."],
        do: "Haben Sie eine llms.txt, halten Sie sie kurz und korrekt. Investieren Sie Ihre Zeit zuerst in robots.txt und Inhalte.",
        quiz: { q: "Hilft llms.txt in der Google-Suche?", o: ["Nein, die Google-Suche ignoriert sie", "Ja, sie ist Pflicht", "Nur mit Schema"], a: 0, why: "Google: Solche Dateien schaden und nützen der Sichtbarkeit in der Google-Suche nicht." }, try: "audit" },
      { id: "t3-5", t: "Viele Sprachen, von rechts nach links", conf: "D", cards: [
        "Veröffentlichen Sie in mehreren Sprachen, verknüpfen Sie die Fassungen mit hreflang, damit Suchmaschinen die richtige zeigen.",
        "Jede Seite braucht das richtige lang-Attribut. Arabische Seiten brauchen zusätzlich dir=\"rtl\", damit Text und Satzzeichen richtig erscheinen.",
        "Übersetzen Sie sorgfältig: Eine ungeprüfte Maschinenübersetzung wirkt in jeder Sprache weniger vertrauenswürdig."],
        do: "Prüfen Sie mit Sadas Audit je eine Seite pro Sprache und beheben Sie Warnungen zu Sprache oder hreflang.",
        quiz: { q: "Was braucht eine arabische Seite außer lang=\"ar\"?", o: ["dir=\"rtl\"", "Eine eigene Domain", "Eine PDF-Fassung"], a: 0, why: "W3C: Für Sprachen mit Schreibrichtung von rechts nach links die Grundrichtung festlegen." }, try: "audit" }
    ] },
    { id: "t4", icon: "building-2", t: "Erkannt werden", d: "Ein Name überall, Schema, Wikidata.", lessons: [
      { id: "t4-1", t: "Ein Name überall", conf: "D", cards: [
        "Die KI muss erkennen, dass „Stadt Albstadt“, „Stadtverwaltung Albstadt“ und albstadt.de dieselbe Organisation sind. Identische Angaben machen das leicht.",
        "Verwenden Sie denselben Namen, dieselbe Adresse, Telefonnummer, Öffnungszeiten und Website auf Ihrer Seite, im Google-Unternehmensprofil, bei Bing Places, Apple Business Connect, Facebook und LinkedIn.",
        "Google nennt aktuelle Angaben im Unternehmensprofil und Merchant Center als bewährte Praxis für seine KI-Funktionen."],
        do: "Legen Sie eine Tabelle an: Plattform, Name, Adresse, Telefon, Zeiten, Link. Füllen Sie sie für 5 Plattformen aus und gleichen Sie jede Abweichung an.",
        quiz: { q: "Warum sind identische Namen und Adressen für KI wichtig?", o: ["Sie verbinden alle Erwähnungen mit einer Organisation", "Sie erhöhen Preise", "Sie sind überall Pflicht"], a: 0, why: "Einheitliche Angaben lassen Maschinen eine Entität über alle Quellen hinweg erkennen." }, try: "mission" },
      { id: "t4-2", t: "Organization-Schema und sameAs", conf: "D", cards: [
        "Strukturierte Daten (JSON-LD) nennen Fakten maschinenlesbar: Name, Logo, Adresse, Website. sameAs listet Ihre offiziellen Profile anderswo.",
        "Laut Google braucht es für seine KI-Funktionen kein spezielles Schema, aber strukturierte Daten müssen zum sichtbaren Text passen.",
        "Google dokumentiert weiterhin Organization, Local Business, Event, Profilseite, Article und Video."],
        do: "Nutzen Sie den Code aus Sadas Fix-Paket: ein Organization-Block mit name, url, logo, address und sameAs. Prüfen Sie ihn mit Googles Test für Rich-Suchergebnisse.",
        quiz: { q: "Was müssen Ihre strukturierten Daten immer tun?", o: ["Zum sichtbaren Text der Seite passen", "Keywords enthalten", "Für Besucher versteckt sein"], a: 0, why: "Google: Strukturierte Daten müssen dem sichtbaren Text entsprechen." }, try: "pack" },
      { id: "t4-3", t: "Der richtige Typ", conf: "D", cards: [
        "schema.org hat spezielle Typen: Museum, CollegeOrUniversity, School, NGO, GovernmentOrganization, LocalBusiness und viele mehr.",
        "Wählen Sie den genauesten zutreffenden Typ. Eine Gedenkstätte ist keine allgemeine Organization; eine Stadtverwaltung ist eine GovernmentOrganization.",
        "Genaue Typen helfen Maschinen, Sie von Organisationen mit ähnlichem Namen zu unterscheiden."],
        do: "Suchen Sie Ihren Typ auf schema.org und ersetzen Sie ein allgemeines „Organization“ durch den genauen Typ.",
        quiz: { q: "Bester Schema-Typ für eine Stadtverwaltung?", o: ["GovernmentOrganization", "Store", "Product"], a: 0, why: "schema.org definiert GovernmentOrganization für staatliche Stellen." }, try: "pack" },
      { id: "t4-4", t: "Erst Wikidata, dann Wikipedia", conf: "D", cards: [
        "Wikipedia verlangt umfangreiche Berichterstattung in verlässlichen, unabhängigen Quellen und hat Regeln zu Interessenkonflikten, wenn Sie über sich selbst schreiben.",
        "Wikidata hat eine niedrigere Hürde: eine klar identifizierbare Entität, die mit seriösen, öffentlichen Belegen beschrieben werden kann.",
        "Ein korrekter Wikidata-Eintrag (offizielle Website, Ort, Gründungsdatum, Kennungen) ist ein sauberes Datenblatt, das viele Systeme lesen."],
        do: "Suchen Sie Ihre Organisation auf Wikidata. Korrigieren Sie den Eintrag oder legen Sie einen an, mit Website, Ort und Gründungsdatum, jeweils mit Beleg.",
        quiz: { q: "Ihr Verein ist klein und kaum in der Presse. Wo beginnen Sie?", o: ["Wikidata", "Eigenen Wikipedia-Artikel schreiben", "Eine Wikipedia-Seite kaufen"], a: 0, why: "Wikipedia verlangt unabhängige Berichterstattung; die Hürde von Wikidata ist niedriger." }, try: "mission" },
      { id: "t4-5", t: "Was Google abgeschafft hat", conf: "D", cards: [
        "FAQ-Rich-Results erscheinen seit 7. Mai 2026 nicht mehr in der Google-Suche; Google hat die Dokumentation im Juni 2026 entfernt. Auch HowTo-Rich-Results gibt es nicht mehr.",
        "Viele andere Funktionen sind weiter dokumentiert (November 2026): Organization, Local Business, Event, Course list, Education Q&A, Profilseite, Article, Video und Review Snippet. Dataset-Markup dient nur noch der Dataset Search.",
        "Sie müssen FAQ-Markup nicht löschen, und sichtbarer FAQ-Text hilft Lesern weiter. Erwarten Sie nur keine Aufklappfelder mehr bei Google."],
        do: "Verkauft Ihnen jemand FAQ-Schema für „Rich Results“, bitten Sie ihn, Googles Hinweis vom Mai 2026 zu lesen.",
        quiz: { q: "Sie ergänzen im Juni 2026 FAQPage-Markup in der Hoffnung auf Aufklappfelder. Ergebnis?", o: ["Keine: seit 7. Mai 2026 abgeschafft", "Aufklappfelder in einer Woche", "Eine Abstrafung"], a: 0, why: "Google: FAQ-Rich-Results erscheinen seit 7. Mai 2026 nicht mehr." }, try: "audit" }
    ] },
    { id: "t5", icon: "quote", t: "Zitierfähig schreiben", d: "Eigenes Wissen, Antwort zuerst, echte Belege.", lessons: [
      { id: "t5-1", t: "Inhalte, die nur Sie haben", conf: "D", cards: [
        "Googles Leitfaden 2026: Inhalte, die Menschen einzigartig, überzeugend und nützlich finden, beeinflussen Ihre Präsenz in der KI-Suche vermutlich stärker als jeder andere Tipp.",
        "Austauschbare Inhalte wiederholen, was alle sagen („7 Tipps für den Museumsbesuch“). Eigene Inhalte kann nur Ihre Organisation schreiben („Was wir bei der Restaurierung unserer Orgel von 1928 fanden“).",
        "Ihre Archive, Zahlen, Menschen und Ihr Ortswissen kann keine KI anderswo abschreiben."],
        do: "Notieren Sie 3 Dinge, die nur Ihre Organisation weiß oder hat. Machen Sie diesen Monat aus einem davon eine Seite.",
        quiz: { q: "Was ist kein austauschbarer Inhalt?", o: ["Ihr eigenes Restaurierungstagebuch mit Fotos und Daten", "Eine Liste allgemeiner Besuchstipps", "Eine umformulierte Wikipedia-Zusammenfassung"], a: 0, why: "Google bevorzugt eigenes, einzigartiges Material gegenüber allgemeinen Inhalten." }, try: "audit" },
      { id: "t5-2", t: "Antwort zuerst", conf: "OD", cards: [
        "Beginnen Sie Seiten mit der direkten Antwort: was, für wen, wo, mit der wichtigsten Angabe. Dann erklären Sie.",
        "Agenturen berichten von mehr Zitaten durch „Antwort zuerst“; keine KI-Firma dokumentiert das. Google sagt, spezielles „Chunking“ für KI sei unnötig.",
        "Es kostet nichts und hilft Lesern, also tun Sie es trotzdem, mit Zwischenüberschriften und kurzen Absätzen."],
        do: "Schreiben Sie die ersten zwei Sätze Ihrer drei wichtigsten Seiten so um, dass sie die Hauptfrage direkt beantworten, mit Datum oder Zahl.",
        quiz: { q: "Ist belegt, dass „Antwort zuerst“ mehr KI-Zitate bringt?", o: ["Nicht belegt, aber günstig und leserfreundlich", "Ja, Google verlangt es", "Nein, es wird bestraft"], a: 0, why: "Anbieter dokumentieren es nicht; Google sagt, Chunking sei unnötig. Lesern hilft es so oder so." }, try: "rewrite" },
      { id: "t5-3", t: "Quellen, Zitate, Zahlen", conf: "E", cards: [
        "Die GEO-Studie (Princeton, Georgia Tech, AI2, IIT Delhi; KDD 2024) fand, dass Quellenangaben, Zitate und Statistiken die Sichtbarkeit einer Quelle in KI-Antworten um bis zu 40 % steigerten.",
        "Keyword-Stuffing schnitt schlechter ab als gar keine Änderung.",
        "Grenzen: Die Haupttests nutzten eine simulierte Suchmaschine mit Modellen von 2023, und „Sichtbarkeit“ meinte den Anteil am Antworttext, nicht Klicks. Eine Richtung, kein Gesetz."],
        do: "Ergänzen Sie auf Ihrer wichtigsten Seite eine genannte Quelle, ein Zitat oder eine datierte Zahl.",
        quiz: { q: "Was passierte in der GEO-Studie mit Keyword-Stuffing?", o: ["Es schnitt schlechter ab als die Ausgangsfassung", "Es verdoppelte die Sichtbarkeit", "Es hatte gar keinen messbaren Effekt"], a: 0, why: "Im Live-Test mit Perplexity lag Keyword-Stuffing unter der unveränderten Fassung." }, try: "heat" },
      { id: "t5-4", t: "Eigene Daten veröffentlichen", conf: "D", cards: [
        "Eine Zahl, die nur Sie haben, ist zitierfähig: Besucher pro Jahr, vermittelte Absolventen, Objekte im Archiv, gepflanzte Bäume.",
        "Datieren Sie sie, sagen Sie, wie gezählt wurde, und schreiben Sie sie als Text (nicht nur als Grafik).",
        "Genau dieses eigene Material stellt Googles Leitfaden 2026 an die erste Stelle."],
        do: "Veröffentlichen Sie eine datierte, belegte Zahl: „2025 besuchten 41.200 Menschen die Gedenkstätte (Ticketzählung).“",
        quiz: { q: "Was macht eine eigene Statistik für KI und Leser nützlich?", o: ["Datum, Methode und Klartext", "Große Schrift", "Auf Millionen runden"], a: 0, why: "Datierte, erklärte Zahlen lassen sich prüfen und zitieren." }, try: "quote" },
      { id: "t5-5", t: "Nicht übertreiben", conf: "D", cards: [
        "Für jede Variante einer Frage eine eigene Seite anzulegen, vor allem um KI-Antworten zu beeinflussen, verstößt gegen Googles Richtlinie zu massenhaft erstellten Inhalten (Scaled Content Abuse).",
        "Massenhaft erzeugte KI-Seiten, versteckter Text und vorgetäuschte Aktualität sind Spam, keine Optimierung.",
        "Eine ausgezeichnete Seite, die ein Thema vollständig beantwortet, schlägt zwanzig dünne."],
        do: "Finden Sie Seiten, die fast dasselbe sagen. Führen Sie sie zu einer zusammen und leiten Sie die anderen weiter.",
        quiz: { q: "50 fast gleiche Seiten für jede Fragevariante anzulegen ist…", o: ["Scaled Content Abuse", "Bewährte Praxis", "Für den KI-Modus nötig"], a: 0, why: "Google nennt das ausdrücklich in seinem Leitfaden 2026." }, try: "audit" }
    ] },
    { id: "t6", icon: "users", t: "Ruf jenseits der Website", d: "Wo KI sucht, Bewertungen, Presse, Communitys.", lessons: [
      { id: "t6-1", t: "Wo KI sucht", conf: "E", cards: [
        "Peec AI analysierte 30 Millionen zitierte Quellen in ChatGPT, KI-Modus, Gemini, Perplexity und KI-Übersichten: Reddit, YouTube, LinkedIn, Wikipedia und Forbes lagen vorn.",
        "Assistenten unterscheiden sich: Profound fand Wikipedia viel häufiger in ChatGPT, Reddit häufiger in Perplexity.",
        "Anteile schwanken stark, und Studien widersprechen sich: Ahrefs maß einen Rückgang von Reddit von 19,1 % auf 2,3 % der ChatGPT-Antworten in den USA (März–September 2026) und von Wikipedia von 14,1 % auf 2,9 %, während BrightEdge ein Wachstum von Reddit in Googles KI-Übersichten meldet. Verteilen Sie Ihre Präsenz."],
        do: "Stellen Sie einem Assistenten eine Ihrer Fragen und notieren Sie, welche Websites er zitiert. Das sind Ihre Zielorte.",
        quiz: { q: "Welche Art Plattform dominierte KI-Zitate in Studien 2025–2026?", o: ["Nutzerinhalte und Video (Reddit, YouTube)", "Nur Behördenseiten", "Nur Firmen-Startseiten"], a: 0, why: "Peec AI und Profound zeigen Foren und Video unter den meistzitierten Quellen." }, try: "ask" },
      { id: "t6-2", t: "Bewertungen, aber ehrlich", conf: "D", cards: [
        "Bewertungen und Unternehmensdaten fließen über Ihr Unternehmensprofil in Googles KI.",
        "Gefälschte oder gekaufte Bewertungen sind verboten: in den USA durch die FTC-Regel seit 21. Oktober 2024 (auch KI-geschriebene), in der EU durch die Omnibus-Richtlinie seit 28. Mai 2022.",
        "Bitten Sie echte Besucher, Studierende oder Partner, ohne Belohnung für eine gute Bewertung."],
        do: "Bitten Sie diese Woche fünf echte Besucher oder Partner um eine ehrliche Google-Bewertung.",
        quiz: { q: "Ein Anbieter bietet 50 Fünf-Sterne-Bewertungen „für mehr KI-Sichtbarkeit“. Was ist das?", o: ["In EU und USA verboten", "Eine Grauzone", "Von Google empfohlen"], a: 0, why: "Gefälschte Bewertungen verbieten die FTC-Regel und die EU-Omnibus-Richtlinie." }, try: "ask" },
      { id: "t6-3", t: "Verzeichnisse und Listen", conf: "E", cards: [
        "Verzeichnisse, Tourismusportale, Fachverbände und „Die besten …“-Listen sind Orte, an denen KI oft Empfehlungen findet; Bewertungsportale wie Yelp tauchten bei Empfehlungsfragen häufig auf.",
        "Ein falscher Eintrag verbreitet falsche Angaben. Ein fehlender Eintrag lässt Sie aus der Liste fallen.",
        "Prüfen Sie zuerst die Seiten, die Assistenten zu Ihren Fragen tatsächlich zitieren."],
        do: "Listen Sie 10 Verzeichnisse, Portale oder Register Ihrer Branche auf. Korrigieren oder erstellen Sie Ihren Eintrag in drei davon.",
        quiz: { q: "Warum Ihren Eintrag auf einem Tourismusportal korrigieren?", o: ["KI zitiert ihn womöglich als Quelle", "Er ändert Googles Algorithmus", "Er entfernt Mitbewerber"], a: 0, why: "Einträge Dritter sind häufige Quellen für Empfehlungsantworten." }, try: "ask" },
      { id: "t6-4", t: "Communitys ohne Spam", conf: "OD", cards: [
        "Foren wie Reddit werden oft zitiert, daher versuchen Marketer, Beiträge zu platzieren. Das verstößt gegen Plattformregeln und unter Umständen gegen Verbraucherrecht.",
        "Was ethisch funktioniert: echte Fragen als Sie selbst beantworten, sagen, wer Sie sind, nur verlinken, wenn es hilft.",
        "Ob Community-Aktivität KI-Antworten für kleine Organisationen verändert, ist nicht gemessen. Tun Sie es, um Menschen zu helfen."],
        do: "Finden Sie in einem Forum eine echte Frage zu Ihrem Fachgebiet und beantworten Sie sie hilfreich, mit Angabe Ihrer Rolle.",
        quiz: { q: "Gefälschte „Kunden“-Beiträge über sich selbst zu posten ist…", o: ["Gegen Plattformregeln und rechtlich riskant", "Bewährte Praxis", "Für KI unsichtbar"], a: 0, why: "Verdeckte Werbung verstößt gegen Community-Regeln und Verbraucherschutzrecht." }, try: "ask" },
      { id: "t6-5", t: "Presse und Partner", conf: "D", cards: [
        "Unabhängige Berichterstattung ist das, was Wikipedia „umfangreiche Berichterstattung in verlässlichen Quellen“ nennt und was Assistenten vertrauen.",
        "Partner (Hochschulen, Städte, Stiftungen, Förderer) können Sie korrekt beschreiben und verlinken.",
        "Geben Sie Presse und Partnern ein Datenblatt: Name, Ein-Satz-Beschreibung, datierte Zahlen, Kontakt, Logo."],
        do: "Schreiben Sie ein einseitiges Datenblatt und bitten Sie zwei Partner zu prüfen, wie sie Sie beschreiben.",
        quiz: { q: "Was zählt als unabhängige Berichterstattung?", o: ["Ein Zeitungsartikel, den Sie nicht bezahlt haben", "Ihr eigener Blog", "Ein bezahltes Advertorial"], a: 0, why: "Relevanzregeln verlangen vom Gegenstand unabhängige Quellen." }, try: "mission" }
    ] },
    { id: "t7", icon: "share-2", t: "Social-Kanäle", d: "Welche Plattformen KI lesen kann und wie Sie Ihre einrichten.", lessons: [
      { id: "t7-1", t: "Welche Plattformen KI hereinlassen", conf: "D", cards: [
        "Die robots.txt von LinkedIn (geprüft am 9. Nov. 2026) sperrt alle Bots, die sie nicht nennt. GPTBot, ClaudeBot, PerplexityBot und CCBot sind nicht genannt, also gesperrt.",
        "Die robots.txt von YouTube nennt keinen KI-Bot und sperrt nur Pfade wie /results oder /api/: Videoseiten sind offen.",
        "Sadas Kanal-Check liest die robots.txt jeder Plattform live, denn diese Dateien ändern sich."],
        do: "Öffnen Sie Ihre Kanäle bei geöffnetem Sada-Panel und lesen Sie jeweils das Ergebnis zu den KI- und Such-Crawlern.",
        quiz: { q: "LinkedIn endet mit „User-agent: * / Disallow: /“. Was gilt für GPTBot?", o: ["Gesperrt, weil nicht genannt", "Erlaubt", "Nur bei Beiträgen erlaubt"], a: 0, why: "Nicht genannte Bots fallen unter * und sind für die ganze Website gesperrt." }, try: "social" },
      { id: "t7-2", t: "Instagram ist durchsuchbar", conf: "D", cards: [
        "Seit 10. Juli 2025 können öffentliche Beiträge professioneller Konten (Nutzer ab 18) von Google und Bing indexiert werden.",
        "Private und persönliche Konten sind ausgenommen. Sie können es in den Privatsphäre-Einstellungen abschalten.",
        "Bildunterschriften zählen also über Instagram hinaus: Schreiben Sie klar, was, wer, wo und wann."],
        do: "Stellen Sie Ihr Konto auf „Professionell“ und „Öffentlich“ und prüfen Sie, dass öffentliche Fotos und Videos in Suchergebnissen erscheinen dürfen.",
        quiz: { q: "Welche Instagram-Beiträge können seit Juli 2025 in Google erscheinen?", o: ["Öffentliche Beiträge professioneller Konten", "Alle privaten Beiträge", "Keine"], a: 0, why: "Die Änderung betrifft öffentliche professionelle Konten Erwachsener." }, try: "social" },
      { id: "t7-3", t: "YouTube: Beschreibungen und Untertitel", conf: "E", cards: [
        "YouTube gehört zu den meistzitierten Quellen in KI-Antworten (Peec AI, 2026).",
        "Maschinen lesen Titel, Beschreibung und Untertitel, nicht die Bilder.",
        "Automatische Untertitel verfälschen oft Namen, besonders deutsche, französische und arabische."],
        do: "Ergänzen Sie die Beschreibungen Ihrer 5 meistgesehenen Videos um 2–3 sachliche Sätze und korrigieren Sie die Untertitel.",
        quiz: { q: "Was kann ein KI-System in einem Video lesen?", o: ["Titel, Beschreibung und Untertitel", "Nur das Vorschaubild", "Nichts"], a: 0, why: "Text rund um und im Video (Untertitel) lesen Maschinen." }, try: "social" },
      { id: "t7-4", t: "LinkedIn-Unternehmensseiten", conf: "OD", cards: [
        "LinkedIn gehört zu den meistzitierten Domains, obwohl die meisten KI-Crawler gesperrt sind. Wie die Inhalte dorthin gelangen (Suchindizes, Partnerschaften, Nutzerabrufe), ist nicht dokumentiert.",
        "Füllen Sie den Reiter „Info“ aus: Beschreibung, Website, Branche, Standort. Sada liest ihn auf Ihrem Computer und vergleicht mit Ihrer Website.",
        "Verwenden Sie denselben Namen und dieselbe Beschreibung wie auf Ihrer Website."],
        do: "Öffnen Sie Ihre LinkedIn-Seite mit Sada und beheben Sie jeden Punkt „Verbessern“.",
        quiz: { q: "Ist dokumentiert, wie KI-Assistenten LinkedIn-Inhalte nutzen?", o: ["Nein, das ist offen", "Ja, über GPTBot", "Ja, LinkedIn verkauft sie"], a: 0, why: "LinkedIn sperrt nicht genannte KI-Bots; der Weg zu den Zitaten ist nicht dokumentiert." }, try: "social" },
      { id: "t7-5", t: "Bios und Link-in-Bio", conf: "OD", cards: [
        "Eine Bio ist ein Datenblatt in einer Zeile: Name, was Sie sind, wo, Ihre eigene Website.",
        "Link-in-Bio-Seiten schieben einen Drittanbieter zwischen Kanal und Website. Keine Studie misst den Effekt, aber Ihre eigene Domain ist das klarste Signal.",
        "Ihre Website sollte auf jeden Kanal zurückverlinken, am besten im sameAs-Markup."],
        do: "Übernehmen Sie Sadas Bio-Vorschlag, prüfen Sie die Angaben und setzen Sie Ihre eigene Domain als Hauptlink.",
        quiz: { q: "Was ist der klarste Link in einer Bio?", o: ["Ihre eigene Domain", "Eine Link-in-Bio-Seite", "Ein Hashtag"], a: 0, why: "Die eigene Domain verbindet den Kanal direkt mit Ihrer Website." }, try: "social" }
    ] },
    { id: "t8", icon: "map", t: "Vor Ort und nach Branche", d: "Museen, Hochschulen, Vereine, Preise, Rathäuser.", lessons: [
      { id: "t8-1", t: "Unternehmensprofil für KI", conf: "D", cards: [
        "Googles eigene Daten aus Unternehmensprofil und Maps fließen in seine KI-Antworten. Google nennt aktuelle Angaben als bewährte Praxis.",
        "Füllen Sie alles aus: Kategorie, Öffnungszeiten, Sonderöffnungszeiten, Website, Fotos, Beschreibung, Merkmale wie Barrierefreiheit.",
        "Antworten Sie auf Bewertungen und aktualisieren Sie das Profil am selben Tag, an dem sich Zeiten ändern."],
        do: "Öffnen Sie Ihr Google-Unternehmensprofil und füllen Sie jedes leere Feld. Tragen Sie Sonderöffnungszeiten für die nächsten Feiertage ein.",
        quiz: { q: "Ihre Winteröffnungszeiten ändern sich. Welche zwei Orte zuerst?", o: ["Die Seite mit den Zeiten auf Ihrer Website und Ihr Unternehmensprofil", "Instagram und TikTok", "Nur Ihr Newsletter"], a: 0, why: "Auf diese Quellen stützen sich Googles KI-Funktionen." }, try: "mission" },
      { id: "t8-2", t: "Museen und Gedenkstätten", conf: "D", cards: [
        "Schreiben Sie Zeiten, Schließtage, Preise, Barrierefreiheit und Anfahrt auf eine Seite als Text, identisch mit dem Unternehmensprofil.",
        "Zeichnen Sie Ausstellungen und Veranstaltungen mit Event-Daten aus (Name, Termine, Ort).",
        "Angaben zur Barrierefreiheit verlangt in vielen Fällen auch das EU-Barrierefreiheitsrecht, und sie helfen allen Besuchern."],
        do: "Erstellen oder verbessern Sie eine Seite „Besuch planen“ mit allen praktischen Angaben als Text.",
        quiz: { q: "Wohin gehören die Öffnungszeiten einer Gedenkstätte?", o: ["Als Text auf eine Besuchsseite, passend zum Unternehmensprofil", "Nur in einen PDF-Flyer", "Nur auf Instagram"], a: 0, why: "Überall gleiche Textangaben sind für Maschinen am verlässlichsten." }, try: "machine" },
      { id: "t8-3", t: "Hochschulen und Schulen", conf: "D", cards: [
        "Eine Seite pro Studiengang: Unterrichtssprache, Dauer, Gebühren, datierte Fristen, Voraussetzungen für internationale Bewerber.",
        "Google dokumentiert das Course-list-Markup weiterhin, sagt aber, dass seine KI-Funktionen kein spezielles Schema brauchen. Klare, vollständige Studiengangsseiten zählen am meisten.",
        "Kennzeichnen oder entfernen Sie abgelaufene Fristen: Eine KI, die das Datum vom Vorjahr nennt, schickt Studierende weg."],
        do: "Prüfen Sie Ihre wichtigste Studiengangsseite: Stehen Sprache, Gebühren und die diesjährige Frist als Text da?",
        quiz: { q: "Was schadet einer Studiengangsseite in KI-Antworten am meisten?", o: ["Eine veraltete Frist", "Eine kurze URL", "Ein Foto von Studierenden"], a: 0, why: "Alte Daten werden zitiert, als wären sie aktuell." }, try: "ask" },
      { id: "t8-4", t: "Vereine, Preise und Rathäuser", conf: "D", cards: [
        "Vereine und Stiftungen: eine Transparenzseite mit Registernummer, Jahresbericht und Vorstand.",
        "Preise und Wettbewerbe: eine dauerhafte Seite pro Ausgabe mit Ausschreibung, Frist, Jury und datierten Preisträgern. Frühere Preisträger nie überschreiben.",
        "Rathäuser: Leistungsseiten, betitelt als Fragen der Bürger, mit Zeiten und Unterlagen als Text. Das Impressum fällt in Deutschland unter § 5 DDG."],
        do: "Wählen Sie die Regel für Ihre Branche und verbessern Sie heute eine Seite.",
        quiz: { q: "Ein Preis veröffentlicht die Preisträger 2026. Was ist mit 2025?", o: ["Auf einer eigenen dauerhaften Seite behalten", "Überschreiben", "Löschen"], a: 0, why: "Dauerhafte, datierte Seiten halten die Geschichte des Preises zitierfähig." }, try: "audit" },
      { id: "t8-5", t: "Sensible Geschichte", conf: "OD", cards: [
        "Keine KI-Firma veröffentlicht, wie sie Quellen zu umstrittener Geschichte wie der NS-Zeit oder der Erinnerungskultur gewichtet.",
        "Googles Richtlinien für Bewerter behandeln Themen, die Gesellschaft und staatsbürgerliches Verständnis betreffen, als besonders vertrauenspflichtig (YMYL).",
        "Was Sie steuern: Quellen und Archive nennen, Aussagen datieren, Autorschaft und Zweck angeben, Kontext liefern. Ob Assistenten offizielle Einrichtungen bevorzugen, ist nicht belegt."],
        do: "Ergänzen Sie eine historische Seite um Autorin oder Autor, Datum und Quellen.",
        quiz: { q: "Was stärkt das Vertrauen in eine historische Seite?", o: ["Genannte Quellen, Daten und Autoren", "Mehr Adjektive", "Versteckte Keywords"], a: 0, why: "Vertrauenspflichtige Themen brauchen überprüfbare, zugeordnete Inhalte." }, try: "audit" }
    ] },
    { id: "t9", icon: "mouse-pointer-click", t: "KI-Agenten", d: "Assistenten, die buchen, kaufen und Formulare ausfüllen.", lessons: [
      { id: "t9-1", t: "Was Agenten tun", conf: "D", cards: [
        "KI-Agenten handeln für Menschen: vergleichen, buchen, kaufen. Google kündigte im Mai 2025 den „Agentic Checkout“ im KI-Modus an.",
        "2026 stellte Google mit Händlern das Universal Commerce Protocol vor; OpenAI und Stripe bauten das Agentic Commerce Protocol, und OpenAI setzte später stärker auf die eigenen Kassen der Händler.",
        "Für die meisten Organisationen ist die nahe Aufgabe einfacher: Angaben und Formulare nutzbar machen."],
        do: "Notieren Sie die eine Handlung, die Menschen online tun sollen (buchen, anmelden, bewerben, spenden).",
        quiz: { q: "Was kündigte Google 2025 für den KI-Modus an?", o: ["Agentic Checkout unter Aufsicht der Nutzer", "Kostenlose Websites", "Das Ende der Links"], a: 0, why: "Google I/O 2025: Der KI-Modus kann für Sie kaufen, immer mit Ihrer Anleitung." }, try: "drive" },
      { id: "t9-2", t: "Formulare für Agenten", conf: "OD", cards: [
        "Beschriftete Felder, echte Buttons und klare Fehlermeldungen sind WCAG-2.2-Grundlagen für Menschen mit Behinderungen.",
        "Dieselbe Klarheit hilft vermutlich auch Browser-Agenten, gemessen ist dieser Zusammenhang aber nicht.",
        "CAPTCHAs und Logins stoppen Agenten; Anthropic sagt, seine Bots umgehen keine CAPTCHAs."],
        do: "Prüfen Sie Ihr Buchungs- oder Spendenformular mit einem kostenlosen Barrierefreiheits-Test (z. B. WAVE) und ergänzen Sie fehlende Beschriftungen.",
        quiz: { q: "Was sollte ein kleines Museum für Agenten zuerst beheben?", o: ["Unbeschriftete Formularfelder", "Einen MCP-Server bauen", "Alle Formulare entfernen"], a: 0, why: "Barrierefreies HTML kommt zuerst; Protokolle sind experimentell." }, try: "drive" },
      { id: "t9-3", t: "Protokolle erklärt", conf: "D", cards: [
        "MCP (Model Context Protocol, Anthropic, Nov. 2024) verbindet KI-Werkzeuge mit Daten und Diensten.",
        "WebMCP lässt eine Webseite Funktionen als Werkzeuge für einen Agenten im Browser anbieten: frühe Chrome-Vorschau im Feb. 2026, Entwurf einer W3C-Community-Gruppe im Okt. 2026, von anderen Browsern nicht ausgeliefert.",
        "NLWeb (Microsoft) steht am Anfang. UCP und ACP sind Handelsprotokolle vor allem für Shops."],
        do: "Für Nicht-Shops ist heute nichts davon nötig. Merken Sie es sich und prüfen Sie es nächstes Jahr erneut.",
        quiz: { q: "Welchen Stand hat WebMCP Ende 2026?", o: ["Experimentelle Vorschau und Entwurf", "Gesetzliche Pflicht", "In allen Browsern unterstützt"], a: 0, why: "Chrome-Vorschau hinter einem Schalter; Entwurf einer W3C-Community-Gruppe." }, try: "drive" },
      { id: "t9-4", t: "Angaben vor dem Login", conf: "D", cards: [
        "Ein Agent oder Crawler sieht nicht, was hinter einem Login liegt.",
        "Zeigen Sie Preise, Termine, Verfügbarkeit und Bedingungen als Text, bevor sich jemand anmeldet.",
        "Das hilft auch Menschen, Sie vor einer Entscheidung zu vergleichen."],
        do: "Prüfen Sie Ihren Buchungsweg: Ist der Preis vor dem Login sichtbar? Falls nicht, ergänzen Sie ihn auf der öffentlichen Seite.",
        quiz: { q: "Preise erscheinen erst nach dem Login. Folge?", o: ["Agenten und Crawler sehen sie nicht", "Bessere Rankings", "Keine Folge"], a: 0, why: "Inhalte hinter einem Login sind für Maschinen unsichtbar." }, try: "drive" },
      { id: "t9-5", t: "Was Sie vorerst ignorieren können", conf: "D", cards: [
        "Sie brauchen 2026 weder MCP noch WebMCP noch Handelsprotokolle, um gefunden und empfohlen zu werden.",
        "Vorsicht bei Angeboten, Ihre Website mit eigenen Protokoll-Bauten „agentenfähig“ zu machen, solange die Grundlagen (Crawler-Zugang, Text, Formulare) fehlen.",
        "Prüfen Sie es erneut, wenn Ihre Plattform (WordPress, Shopify, Buchungstool) es von Haus aus unterstützt."],
        do: "Fragen Sie jeden Anbieter von Protokoll-Arbeit, welcher Browser oder Assistent es heute nutzt, mit Quelle.",
        quiz: { q: "Erste Priorität vor jedem Agenten-Protokoll?", o: ["Crawler-Zugang, Textangaben und funktionierende Formulare", "Ein Chatbot", "Eine App"], a: 0, why: "Agenten brauchen dieselben Grundlagen wie Crawler und Menschen." }, try: "drive" }
    ] },
    { id: "t10", icon: "chart-column", t: "Messen", d: "Kostenlose Berichte, Verweise, Ihre Fragenliste, Logs.", lessons: [
      { id: "t10-1", t: "Der Bericht „Generative KI“ der Search Console", conf: "D", cards: [
        "Seit Juni 2026 (weltweit seit 31. August 2026) hat die Search Console Berichte zu generativer KI für Suche und Discover: Impressionen, Seiten, Länder, Geräte, Daten.",
        "Grenzen: nur Impressionen, keine Klicks und keine Suchanfragen; die Daten beginnen etwa am 18. Mai 2026. Kleinere Websites sehen den Bericht womöglich noch nicht.",
        "KI-Daten bleiben zusätzlich im normalen Leistungsbericht."],
        do: "Öffnen Sie Search Console → Leistung → Generative KI. Notieren Sie die Impressionen und Ihre 5 wichtigsten Seiten.",
        quiz: { q: "Was zeigt der Bericht zur generativen KI zum Start NICHT?", o: ["Klicks", "Impressionen", "Seiten"], a: 0, why: "Er meldet Impressionen, noch keine Klicks." }, try: "mission" },
      { id: "t10-2", t: "Bing AI Performance", conf: "D", cards: [
        "Die Bing Webmaster Tools (öffentliche Vorschau seit Feb. 2026) zeigen Zitate in Copilot, Bings KI-Zusammenfassungen und bei einigen Partnern.",
        "Dazu kommen „Grounding Queries“: die Suchbegriffe, mit denen die KI Ihre Seiten fand. Eine Fundgrube für Formulierungen.",
        "Auch hier keine Klicks. Ein Update im Juni 2026 ergänzte Berichten zufolge Zitatanteil und Themen."],
        do: "Bestätigen Sie Ihre Website in den Bing Webmaster Tools und lesen Sie Ihre wichtigsten Grounding Queries.",
        quiz: { q: "Was sind Grounding Queries?", o: ["Begriffe, mit denen die KI Ihre Seiten suchte", "Ihre Anzeigen-Keywords", "Spam-Meldungen"], a: 0, why: "Bing zeigt, mit welchen Suchen die KI ihre Antwort untermauerte." }, try: "mission" },
      { id: "t10-3", t: "KI-Verweise in der Statistik", conf: "D", cards: [
        "Die ChatGPT-Suche hängt utm_source=chatgpt.com an ihre Links.",
        "Viele KI-Klicks kommen ohne Quelle an, die Statistik zählt sie also zu niedrig.",
        "Legen Sie einen Filter für Quellen mit chatgpt, perplexity, copilot, gemini, claude an. Sadas Fix-Paket enthält einen fertigen regulären Ausdruck."],
        do: "Erstellen Sie in GA4 eine Exploration mit diesem Filter und speichern Sie sie.",
        quiz: { q: "Erfasst die Statistik alle KI-Besuche?", o: ["Nein, viele kommen ohne Quelle", "Ja, alle", "Nur die von Perplexity"], a: 0, why: "Fehlende Verweise lassen KI-Traffic wie direkte Besuche aussehen." }, try: "pack" },
      { id: "t10-4", t: "Ihre Fragenliste", conf: "E", cards: [
        "Agenturen messen KI-Sichtbarkeit mit festen 20–50 echten Fragen, mehrfach pro Assistent gestellt, jeden Monat.",
        "Die zentrale Kennzahl ist der Anteil der Durchläufe, in denen Sie vorkommen, keine „Position“.",
        "Notieren Sie auch den genannten Mitbewerber, die zitierte URL und jede falsche Angabe über Sie."],
        do: "Nutzen Sie Sadas Tab „KI fragen“: 10 Fragen wählen, in 3 Assistenten stellen, monatlich als CSV exportieren.",
        quiz: { q: "Was ersetzt in KI-Berichten die „Ranking-Position“?", o: ["Die Vorkommensrate über wiederholte Durchläufe", "Domainalter", "Wortanzahl"], a: 0, why: "SparkToro: Wie oft Sie vorkommen, ist das stabile Signal." }, try: "ask" },
      { id: "t10-5", t: "Server-Logs für Bots", conf: "D", cards: [
        "Ihre Server-Logs sind Ihr eigener Beweis, dass KI-Bots vorbeikommen.",
        "Jeder kann einen User-Agent fälschen. OpenAI und Perplexity veröffentlichen IP-Listen zur Prüfung echter Bots.",
        "Kürzen Sie die IP-Adressen von Besuchern zum Schutz der Privatsphäre: Sie brauchen nur die Bots."],
        do: "Bitten Sie Ihren Hoster um die Logs einer Woche und zählen Sie Besuche von OAI-SearchBot, PerplexityBot, Claude-SearchBot und Googlebot.",
        quiz: { q: "Woran erkennen Sie, dass ein „GPTBot“-Besuch echt ist?", o: ["IP mit OpenAIs veröffentlichter Liste abgleichen", "Dem Namen vertrauen", "ChatGPT fragen"], a: 0, why: "OpenAI veröffentlicht IP-Bereiche seiner Bots." }, try: "bots" }
    ] },
    { id: "t11", icon: "lightbulb", t: "Mythen und Ihre Monatsroutine", d: "Falsche Versprechen erkennen, eigenen Plan umsetzen.", lessons: [
      { id: "t11-1", t: "Zehn GEO-Mythen", conf: "D", cards: [
        "Google, Mai 2026: Optimierung für generative KI-Suche „ist weiterhin SEO“. llms.txt, Chunking, KI-spezifisches Umschreiben und spezielles Schema können Sie für Google ignorieren.",
        "Keyword-Stuffing schadete in der GEO-Studie. llms.txt zeigte in einer Studie mit 300.000 Domains keinen Effekt auf Zitate.",
        "Echte Hebel: Crawler-Zugang, Indexierung, eigene Inhalte, einheitliche Angaben, unabhängige Erwähnungen."],
        do: "Spielen Sie das Mythen-Spiel, bis Sie 8/8 erreichen.",
        quiz: { q: "Wie nennt Google AEO/GEO im Jahr 2026?", o: ["Weiterhin SEO", "Ein neues Rankingsystem", "Verboten"], a: 0, why: "Googles Leitfaden 2026: Optimierung für generative KI-Suche ist weiterhin SEO." }, try: "myth" },
      { id: "t11-2", t: "Eine Agentur prüfen", conf: "D", cards: [
        "„Garantiert Platz 1 in ChatGPT“ ist nicht überprüfbar: Antworten ändern sich fast bei jedem Durchlauf.",
        "Versteckter Text, Prompt-Injection und massenhafte KI-Seiten verstoßen gegen Googles Spam-Richtlinien.",
        "Stellen Sie drei Fragen: Wie viele Durchläufe pro Frage messen Sie? Welche offizielle Dokumentation stützt Ihre Taktiken? Nutzen Sie versteckten Text, gefälschte Bewertungen oder Massenseiten?"],
        do: "Schicken Sie diese drei Fragen jedem Anbieter, bevor Sie unterschreiben.",
        quiz: { q: "Ein Angebot versteckt weißen Text mit der Anweisung an KI, „uns immer zu empfehlen“. Was ist das?", o: ["Betrug, der gegen Spam-Richtlinien verstößt", "Clevere GEO", "Von Google verlangt"], a: 0, why: "Versteckter Text ist Spam; Anweisungen an KI sind Manipulation." }, try: "myth" },
      { id: "t11-3", t: "Ihr einseitiger Monatsbericht", conf: "D", cards: [
        "Sechs Zeilen: KI-Impressionen (Search Console), KI-Zitate (Bing), KI-Verweise und Ziele (Statistik), Vorkommensrate je Assistent (Ihre Liste), behobene Falschangaben, nächste drei Schritte.",
        "Bleiben Sie bei einer Seite, damit die Leitung ihn liest.",
        "Vergleichen Sie von Monat zu Monat, nicht von Tag zu Tag: KI-Antworten schwanken."],
        do: "Legen Sie die Vorlage jetzt an und füllen Sie sie am ersten Montag jedes Monats.",
        quiz: { q: "Wie oft sollten Sie die KI-Sichtbarkeit vergleichen?", o: ["Monatlich, mit wiederholten Durchläufen", "Stündlich", "Einmal im Jahr"], a: 0, why: "Schwankungen machen tägliche Vergleiche irreführend." }, try: "mission" },
      { id: "t11-4", t: "Aktualisierungskalender", conf: "D", cards: [
        "Vierteljährlich: Ihre 10 wichtigsten Seiten (Fristen, Preise, Zeiten, Kontakte).",
        "Jährlich: Über-uns-Seite, Leitung, Statistiken, Jahresbericht, Wikidata-Eintrag.",
        "Nach jeder Änderung: Website, Unternehmensprofil und Kanäle am selben Tag anpassen."],
        do: "Tragen Sie vier vierteljährliche Erinnerungen „Sada-Aktualisierung“ in Ihren Kalender ein.",
        quiz: { q: "Wann aktualisieren Sie eine geänderte Telefonnummer?", o: ["Überall am selben Tag", "Beim nächsten Relaunch", "Nur auf Facebook"], a: 0, why: "Uneinheitliche Angaben verbreiten sich und verwirren Maschinen." }, try: "mission" },
      { id: "t11-5", t: "Wirkung gegen Aufwand", conf: "D", cards: [
        "Schnelle Erfolge mit großer Wirkung: robots.txt und CDN-Einstellungen, einheitliches Unternehmensprofil, Einleitungen mit der Antwort zuerst, ein Organization-Schema-Block.",
        "Größere Vorhaben: eigene Daten, unabhängige Berichterstattung, Qualität in mehreren Sprachen.",
        "Schnelle Erfolge diesen Monat, ein größeres Vorhaben pro Quartal."],
        do: "Starten Sie Sadas Agenten und erledigen Sie die ersten drei Plan-Punkte mit dem Hinweis „Sie“.",
        quiz: { q: "Was ist ein schneller Erfolg?", o: ["Die robots.txt korrigieren", "Einen Wikipedia-Artikel bekommen", "Eine App bauen"], a: 0, why: "Kleine, technische Änderungen mit großer Wirkung kommen zuerst." }, try: "mission" }
    ] },
    { id: "t12", icon: "scroll-text", t: "Recht und Ethik (EU)", d: "Training-Opt-out, KI-Verordnung, Datenschutz, Barrierefreiheit, Ehrlichkeit.", lessons: [
      { id: "t12-1", t: "Widerspruch gegen KI-Training", conf: "D", cards: [
        "EU-Recht (DSM-Richtlinie, Art. 4) erlaubt Text- und Data-Mining, es sei denn, der Rechteinhaber behält es sich in angemessener Weise vor, bei Online-Inhalten etwa maschinenlesbar.",
        "Im Fall Kneschke gegen LAION (OLG Hamburg, 5 U 104/24, 10. Dez. 2025) war nicht belegt, dass ein Vorbehalt in natürlicher Sprache von 2021 maschinenlesbar war; die Beweislast lag beim Rechteinhaber. Ob natürliche Sprache heute genügt, blieb offen.",
        "Der Fall ist nicht abgeschlossen: Der BGH (I ZR 281/25) verhandelte am 3. September 2026 und könnte dem EuGH vorlegen. Am sichersten heute: die Trainings-Bots in der robots.txt nennen. Keine Rechtsberatung."],
        do: "Wollen Sie widersprechen, ergänzen Sie den Block für Trainings-Bots in der robots.txt und dokumentieren Sie die Entscheidung.",
        quiz: { q: "Welches Gericht entschied im Dez. 2025 im Fall Kneschke gegen LAION über Vorbehalte gegen KI-Training?", o: ["OLG Hamburg (Kneschke gegen LAION)", "Der US Supreme Court", "Die CNIL"], a: 0, why: "OLG Hamburg, 5 U 104/24, 10. Dezember 2025." }, try: "bots" },
      { id: "t12-2", t: "KI-Verordnung und GPAI-Kodex", conf: "D", cards: [
        "Die EU-KI-Verordnung (Art. 53) verpflichtet Anbieter von KI-Modellen mit allgemeinem Verwendungszweck zu einer Strategie, die das EU-Urheberrecht einschließlich der Vorbehalte nach Art. 4 achtet.",
        "Der freiwillige GPAI-Verhaltenskodex (Juli 2025) verpflichtet Unterzeichner, maschinenlesbare Vorbehalte wie robots.txt zu achten, wie juristische Kommentare berichten.",
        "Der Digital Omnibus (Verordnung (EU) 2026/1744, in Kraft seit 27. Juli 2026) hat Fristen verschoben: Hochrisiko-Pflichten nach Anhang III gelten nun ab 2. Dezember 2027. Forschungs- und Kulturerbe-Einrichtungen behalten ihre eigene TDM-Ausnahme (Art. 3)."],
        do: "Sind Sie Museum oder Forschungseinrichtung, merken Sie sich: Art. 3 erlaubt auch Ihnen Text-Mining für die Forschung.",
        quiz: { q: "Ist der GPAI-Verhaltenskodex verpflichtend?", o: ["Nein, er ist freiwillig", "Ja, für alle", "Nur in Deutschland"], a: 0, why: "Unterzeichner verpflichten sich freiwillig." }, try: "bots" },
      { id: "t12-3", t: "Datenschutzkonform messen", conf: "D", cards: [
        "Statistik-Cookies brauchen in der Regel vorherige Einwilligung (Deutschland: § 25 TDDDG; Frankreich: Leitlinien der CNIL). Server-Logs können personenbezogene Daten im Sinne der DSGVO enthalten.",
        "Laden Sie die Statistik erst nach Einwilligung und nennen Sie sie in der Datenschutzerklärung.",
        "Für die Bot-Auswertung kürzen Sie die IP-Adressen von Menschen: Sie brauchen nur den Bot-Verkehr."],
        do: "Prüfen Sie, dass Ihre Statistik erst nach Einwilligung lädt.",
        quiz: { q: "Brauchen Statistik-Cookies in der EU eine Einwilligung?", o: ["In der Regel ja", "Nie", "Nur für Shops"], a: 0, why: "ePrivacy-Regeln (z. B. § 25 TDDDG) verlangen Einwilligung für nicht notwendige Cookies." }, try: "audit" },
      { id: "t12-4", t: "Barrierefreiheitsrecht als Verbündeter", conf: "D", cards: [
        "Der European Accessibility Act gilt seit 28. Juni 2025 für bestimmte Dienste wie Onlinehandel, Banken und Ticketing (Deutschland: BFSG). Kleinstunternehmen, die Dienstleistungen erbringen, sind ausgenommen; öffentliche Stellen haben eine eigene Richtlinie.",
        "Barrierefreie Seiten haben Textalternativen, Beschriftungen und eine klare Struktur.",
        "Ob das Seiten auch für KI leichter lesbar macht, ist plausibel, aber nicht belegt."],
        do: "Prüfen Sie eine wichtige Seite mit einem Barrierefreiheits-Test und beheben Sie die drei größten Probleme.",
        quiz: { q: "Seit wann gilt der European Accessibility Act?", o: ["28. Juni 2025", "1. Januar 2020", "Noch nicht"], a: 0, why: "Richtlinie (EU) 2019/882 gilt ab 28. Juni 2025." }, try: "audit" },
      { id: "t12-5", t: "Impressum und ehrliches Marketing", conf: "D", cards: [
        "In Deutschland fallen die Anbieterangaben (Impressum) seit Mai 2024 unter § 5 DDG. Ein vollständiges Impressum ist zugleich eine einheitliche Quelle für Ihren rechtlichen Namen und Ihre Adresse.",
        "Gefälschte Bewertungen sind in EU und USA verboten. Verdeckte Werbung verstößt gegen Verbraucherrecht.",
        "Ehrlichkeit ist auch gute GEO: Assistenten wiederholen, was einheitlich und überprüfbar ist."],
        do: "Prüfen Sie, dass Ihr Impressum vollständig ist und zu Ihrem Unternehmensprofil passt.",
        quiz: { q: "Welches Gesetz regelt heute das deutsche Impressum?", o: ["§ 5 DDG", "§ 5 TMG", "Art. 5 DSGVO"], a: 0, why: "Das Digitale-Dienste-Gesetz hat § 5 TMG im Mai 2024 abgelöst." }, try: "audit" }
    ] },
    { id: "t13", icon: "sparkles", t: "Neu im November 2026", d: "Zweite Recherche: was sich geändert hat und was wir korrigiert haben.", lessons: [
      { id: "t13-1", t: "Ein gemeinsamer Widerspruch gegen KI-Training", conf: "D", cards: [
        "Am 30. Oktober 2026 haben Google, OpenAI, Microsoft und Anthropic ein gemeinsames robots.txt-Kennzeichen für KI-Training unterstützt: „User-agent: __usage_ai-training“, auf Grundlage der IETF-Arbeit AIPREF.",
        "Es gilt noch nicht: Google plant Anfang 2027, Microsoft ab 1. Februar 2027, OpenAI „in den kommenden Monaten“. Bis dahin nennen Sie weiter jeden Trainings-Bot einzeln.",
        "Vorsicht: Google behandelt dieses Kennzeichen wie Google-Extended, das auch das Grounding in der Gemini-App betrifft. KI-Übersichten und KI-Modus steuert es nicht: Dafür gibt es die Einstellung in der Search Console."],
        do: "Tragen Sie für Februar 2027 eine Erinnerung ein: Crawler-Dokumentation von Google und Bing prüfen und über das gemeinsame Kennzeichen entscheiden.",
        quiz: { q: "Sie setzen 2027 das gemeinsame Trainings-Kennzeichen, ohne Google-Extended zu nennen. Was macht Google?", o: ["Wertet es wie eine Sperre von Google-Extended, inklusive Gemini-Grounding", "Entfernt Sie aus den KI-Übersichten", "Ignoriert es dauerhaft"], a: 0, why: "Google ordnet das gemeinsame Kennzeichen Google-Extended zu, das auch das Grounding in der Gemini-App steuert." }, try: "bots" },
      { id: "t13-2", t: "Cloudflare: „Block“ trifft jetzt die Suche", conf: "D", cards: [
        "Seit 15. September 2026 gelten Cloudflares Einstellungen „Block“ und „Block on pages with ads“ auch für gemischt genutzte Crawler, darunter Googlebot, Bingbot und Applebot.",
        "Wer „Block“ einschaltet, kann also unbemerkt aus der Google- und Bing-Suche fallen, nicht nur aus dem KI-Training.",
        "Um Training abzulehnen und in der Suche zu bleiben, gibt es „Disallow AI Training“; Apple, Google und Microsoft gelten als „Accountable“-Crawler, die für die Suche erlaubt bleiben."],
        do: "Nutzen Sie Cloudflare, öffnen Sie die Einstellungen für KI-Crawler und prüfen Sie, dass „Block“ nur an ist, wenn Sie es wollen. Für reinen Trainings-Widerspruch: „Disallow AI Training“.",
        quiz: { q: "Eine Cloudflare-Website hat nach dem 15. September 2026 „Block“ für KI-Crawler eingeschaltet. Was ist mit Googlebot?", o: ["Ebenfalls gesperrt", "Nicht betroffen", "Nur auf Seiten ohne Werbung gesperrt"], a: 0, why: "Cloudflare: „Block“ gilt jetzt für gemischt genutzte Crawler, darunter Googlebot, Bingbot und Applebot." }, try: "audit" },
      { id: "t13-3", t: "robots.txt vor Gericht", conf: "D", cards: [
        "USA: Im Urheberrechtsverfahren gegen OpenAI (S.D.N.Y., 15. Dezember 2025) entschied Richter Stein, robots.txt sei keine Zugangskontrolle im Sinne des DMCA, vergleichbar einem Schild „Rasen nicht betreten“.",
        "EU: Für die Text-und-Data-Mining-Ausnahme zählt ein maschinenlesbarer Vorbehalt (OLG Hamburg, Dezember 2025). Der BGH verhandelte die Revision am 3. September 2026; eine Entscheidung steht aus.",
        "Fazit: Technisch ist robots.txt eine Bitte, in der EU kann sie aber Ihr rechtlicher Vorbehalt sein. Setzen Sie sie bewusst ein und dokumentieren Sie sie mit Datum."],
        do: "Speichern Sie bei jeder Änderung eine datierte Kopie Ihrer robots.txt.",
        quiz: { q: "Was ist robots.txt laut dem US-Urteil zu OpenAI (Dezember 2025)?", o: ["Eine Bitte, keine Zugangskontrolle", "Ein bindender Vertrag", "Ein Urheberrechtsvermerk"], a: 0, why: "Das Gericht entschied, dass das Missachten von robots.txt keine Umgehung im Sinne des DMCA ist." }, try: "bots" },
      { id: "t13-4", t: "Nordafrika und die Golfstaaten", conf: "D", cards: [
        "Saudi-Arabiens neues Urheberrechtsgesetz (in Kraft seit 12. August 2026) erlaubt ausdrücklich, rechtmäßig veröffentlichte Werke zur Entwicklung von KI zu vervielfältigen, ohne Erlaubnis oder Vergütung (Art. 26 Abs. 4). Weiterveröffentlichung oder direkte Verwertung bleiben verboten.",
        "Datenschutz: Das saudische PDPL wird seit September 2024 voll durchgesetzt. Das PDPL der VAE ist in Kraft, die Durchführungsverordnung lag Mitte 2026 aber noch nicht vor. Tunesien: Es gilt weiter das Organgesetz 2004-63; der Reformentwurf 095/2025 liegt im Ausschuss und ist nicht verabschiedet.",
        "Eine eigene Regel gegen gefälschte Bewertungen fand sich weder in Tunesien, Marokko, Ägypten, den VAE noch in Saudi-Arabien; allgemeine Regeln gegen irreführende Werbung und zum Verbraucherschutz gelten aber. Die Polizei Dubai meldete im Oktober 2026 Geschäfte, die falsche Bewertungen posteten."],
        do: "Ergänzen Sie einen verständlichen Datenschutzhinweis, der das für Sie geltende Gesetz nennt (z. B. das tunesische Organgesetz 2004-63), mit Kontaktadresse.",
        quiz: { q: "Welches Land hat eine ausdrückliche Urheberrechtsausnahme für KI-Training (November 2026)?", o: ["Saudi-Arabien", "Vereinigte Arabische Emirate", "Tunesien"], a: 0, why: "Saudisches Urheberrechtsgesetz 2026, Art. 26 Abs. 4, in Kraft seit 12. August 2026." }, try: "audit" },
      { id: "t13-5", t: "Klicks und Zitate: die neuesten Daten", conf: "E", cards: [
        "Seer Interactive (Update 2026, 53 Marken, 5,47 Millionen Suchanfragen): Die organische Klickrate bei Suchen mit KI-Übersicht erholte sich von 1,31 % (Dez. 2025) auf 2,36 % (Feb. 2026), weiter unter 3,82 % bei Suchen ohne KI-Übersicht.",
        "Wer in der KI-Übersicht zitiert wurde, erhielt rund 120 % mehr organische Klicks pro Impression als nicht Zitierte. Seer betont, keinen Kausalzusammenhang belegen zu können.",
        "Ahrefs (Oktober 2026, 66,6 Millionen ChatGPT-Antworten): Zitate von Reddit und Wikipedia fielen in US-Antworten stark, Primärquellen wie PubMed und Markenseiten legten zu. Andere Datensätze widersprechen: Messen Sie Ihre eigene Vorkommensrate."],
        do: "Prüfen Sie, ob Ihre wichtigste Seite in Googles KI-Übersicht zu Ihrer Hauptfrage zitiert wird. Falls nicht, vergleichen Sie sie mit den zitierten Seiten.",
        quiz: { q: "Hilft es laut Seer-Update 2026, in einer KI-Übersicht zitiert zu werden?", o: ["Ja: rund 120 % mehr organische Klicks pro Impression als ohne Zitat", "Kein Unterschied", "Es senkt die Klicks"], a: 0, why: "Seer: Zitierte Seiten erhielten etwa +120 % gegenüber nicht zitierten, aber etwa −38 % gegenüber Suchen ohne KI-Übersicht." }, try: "ask" }
    ] }
  ],
  facts: [
    { s: "Wer GPTBot sperrt, verschwindet aus der ChatGPT-Suche.", f: false, why: "GPTBot dient dem Training. Die ChatGPT-Suche hängt an OAI-SearchBot." },
    { s: "Wer Google-Extended sperrt, verschwindet aus den KI-Übersichten.", f: false, why: "KI-Übersichten hängen an Googlebot und Snippet-Regeln, nicht an Google-Extended." },
    { s: "Die Google-Suche ignoriert llms.txt.", f: true, why: "Google: Solche Dateien schaden und nützen der Sichtbarkeit in der Google-Suche nicht." },
    { s: "FAQ-Schema bringt bei Google weiterhin Aufklappfelder.", f: false, why: "FAQ-Rich-Results erscheinen seit 7. Mai 2026 nicht mehr." },
    { s: "Ein Tool kann Ihre genaue Ranking-Position in ChatGPT nennen.", f: false, why: "Antworten ändern sich fast jedes Mal; aussagekräftig sind nur Vorkommensraten." },
    { s: "Copilot zitiert Quellen aus Bing.", f: true, why: "Bings AI-Performance-Bericht erfasst Copilot-Zitate." },
    { s: "Keyword-Stuffing hilft, von KI zitiert zu werden.", f: false, why: "In der GEO-Studie schnitt es schlechter ab als gar nichts zu tun." },
    { s: "Öffentliche Instagram-Beiträge professioneller Konten können in Google erscheinen.", f: true, why: "Seit 10. Juli 2025, für öffentliche professionelle Konten Erwachsener." },
    { s: "Gekaufte Bewertungen sind erlaubt, wenn sie echt aussehen.", f: false, why: "Verboten durch die FTC-Regel (2024) und die EU-Omnibus-Richtlinie (2022)." },
    { s: "Die Search Console zeigt seit 2026 KI-Impressionen.", f: true, why: "Berichte zu generativer KI starteten im Juni 2026, weltweit seit 31. August 2026." },
    { s: "robots.txt ist ein technisches Schloss, das jeden Bot stoppt.", f: false, why: "Sie ist ein freiwilliger Standard; manche nutzergesteuerten Abrufe folgen ihr womöglich nicht." },
    { s: "Ihr CDN kann KI-Bots sperren, auch wenn die robots.txt sie erlaubt.", f: true, why: "Google nennt die Prüfung von CDN und Hosting als bewährte Praxis." },
    { s: "Cloudflares Einstellung „Block AI bots“ kann auch Googlebot sperren.", f: true, why: "Seit 15. September 2026 gilt sie für gemischt genutzte Crawler, darunter Googlebot, Bingbot und Applebot." },
    { s: "In den USA gilt robots.txt als Zugangskontrolle im Sinne des DMCA.", f: false, why: "Urheberrechtsverfahren gegen OpenAI (S.D.N.Y., Dez. 2025): Das Missachten von robots.txt ist keine Umgehung." },
    { s: "Saudi-Arabien erlaubt, rechtmäßig veröffentlichte Werke zur KI-Entwicklung zu vervielfältigen.", f: true, why: "Urheberrechtsgesetz 2026, Art. 26 Abs. 4, in Kraft seit 12. August 2026." }
  ],
  ui: {
    conf: { D: "Dokumentiert", E: "Studienbasiert", OD: "Offene Debatte" },
    confD: { D: "Offizielle oder Primärquelle.", E: "Seriöse Studie; Grenzen beachten.", OD: "Nicht eindeutig belegt: beide Seiten werden gezeigt." },
    do: "Jetzt umsetzen", doDone: "Erledigt", sources: "Quellen", checked: "Stand der Recherche", review: "Fehler wiederholen", reviewD: "{n} Fragen, die Sie falsch beantwortet haben", reviewNone: "Nichts zu wiederholen: gut gemacht.", mins: "2 Min. · 3 Karten · Quiz",
    trySocial: "Öffnen Sie einen Ihrer Kanäle bei geöffnetem Sada-Panel."
  }
};
