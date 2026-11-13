// Sada Academy 2026 v1 · Français (traduit de la version source anglaise, recherche au 9 novembre 2026)
export default {
  tracks: [
    { id: "t1", icon: "radar", t: "Comment l'IA vous trouve", d: "Mémoire, recherche en direct, et pourquoi chaque réponse change.", lessons: [
      { id: "t1-1", t: "Mémoire ou recherche en direct ?", conf: "D", cards: [
        "Un assistant IA répond à partir de deux sources : ce qu'il a appris à l'entraînement (sa mémoire) et une recherche web en direct pour votre question.",
        "Chaque entreprise utilise des robots différents pour ces deux tâches. OpenAI : GPTBot collecte des données d'entraînement, OAI-SearchBot alimente la recherche de ChatGPT. Anthropic : ClaudeBot et Claude-SearchBot. Google : Google-Extended pour l'entraînement de Gemini, Googlebot pour la recherche et ses fonctions IA.",
        "Vous avez donc deux tâches : être lisible et indexé aujourd'hui (technique), et être assez cité pour entrer dans la mémoire (réputation)."],
        do: "Notez 10 questions que de vrais visiteurs posent avant de vous choisir, par exemple « horaires [musée] dimanche ». Vous les réutiliserez au parcours 10.",
        quiz: { q: "Quel robot d'OpenAI décide si vos pages peuvent apparaître dans les réponses de la recherche ChatGPT ?", o: ["OAI-SearchBot", "GPTBot", "Googlebot"], a: 0, why: "OpenAI : les sites qui bloquent OAI-SearchBot n'apparaissent pas dans les réponses de la recherche ChatGPT. GPTBot sert à l'entraînement." }, try: "ask" },
      { id: "t1-2", t: "Aperçus IA et mode IA", conf: "D", cards: [
        "Les fonctions IA de Google récupèrent d'abord des pages dans l'index de Google, puis rédigent la réponse. Google appelle cela l'« ancrage » (génération augmentée par récupération).",
        "Le mode IA découpe votre question en de nombreuses recherches liées à la fois, le « query fan-out ». Une question sur les mauvaises herbes d'une pelouse cherche aussi « meilleurs désherbants » et « désherber sans produits chimiques ».",
        "Les Aperçus IA n'apparaissent que si Google les juge utiles, donc souvent pas du tout. Une page doit être indexée et autoriser un extrait pour y être liée."],
        do: "Cherchez vos 3 questions les plus importantes sur Google. Notez si un Aperçu IA apparaît et quels sites il cite.",
        quiz: { q: "Votre page est bien classée mais porte la règle « nosnippet ». Peut-elle être un lien dans un Aperçu IA ?", o: ["Non", "Oui, le classement suffit", "Seulement en mode IA"], a: 0, why: "Google exige que les pages soient indexées et autorisées à s'afficher avec un extrait." }, try: "audit" },
      { id: "t1-3", t: "L'index de qui ?", conf: "D", cards: [
        "Tous les assistants n'utilisent pas Google. Microsoft Copilot cite à partir de Bing : le rapport « AI Performance » de Bing compte les citations dans Copilot et les résumés IA de Bing.",
        "ChatGPT, Claude et Perplexity ont leurs propres robots de recherche : OAI-SearchBot, Claude-SearchBot, PerplexityBot. OpenAI ne dit pas publiquement quels autres index il utilise ; l'idée que ChatGPT « tourne sur Bing » n'est pas prouvée.",
        "Règle pratique : être indexé dans Google et Bing, et laisser entrer les robots de recherche des assistants."],
        do: "Cherchez site:votredomaine sur Google et sur Bing. Si des pages clés manquent, réglez d'abord l'indexation.",
        quiz: { q: "Microsoft Copilot trouve les pages web surtout via…", o: ["Bing", "L'index de Google", "Ses seules données d'entraînement"], a: 0, why: "Le rapport AI Performance de Bing couvre les citations dans Copilot et ses résumés IA." }, try: "audit" },
      { id: "t1-4", t: "Pourquoi les réponses changent", conf: "E", cards: [
        "Les réponses IA changent d'un essai à l'autre. Dans une étude de janvier 2026, SparkToro et Gumshoe ont fait poser les mêmes questions des milliers de fois dans ChatGPT, Claude et Google AI.",
        "Obtenir deux fois la même liste de marques était très rare, le même ordre plus rare encore. Le signal stable : la fréquence d'apparition d'une marque. (Rapporté par Search Engine Journal ; non évalué par des pairs.)",
        "Le mode IA est aussi personnalisé : il peut tenir compte de vos recherches passées. Deux personnes posant la même question peuvent voir des sources différentes."],
        do: "Posez une de vos questions trois fois dans une nouvelle conversation. Comptez dans combien de réponses vous apparaissez.",
        quiz: { q: "Une réponse de ChatGPT n'a pas cité votre musée. Que conclure ?", o: ["Presque rien : mesurez votre fréquence d'apparition sur de nombreux essais", "Vous êtes banni de ChatGPT", "Votre classement a chuté"], a: 0, why: "Les réponses varient presque à chaque fois. Suivez sur plusieurs mois la part des essais où vous apparaissez." }, try: "ask" },
      { id: "t1-5", t: "Les clics à l'ère de l'IA", conf: "E", cards: [
        "Pew Research (juillet 2025, 900 adultes aux États-Unis, 68 879 recherches) : avec un résumé IA, les gens ont cliqué sur un résultat classique dans 8 % des visites, contre 15 % sans. Sur un lien dans le résumé : 1 %.",
        "Ahrefs a mesuré un taux de clic du premier résultat inférieur d'environ 34,5 % en présence d'un Aperçu IA (données de mars 2025), et d'environ 58 % dans sa mise à jour de février 2026. Ce sont des corrélations, pas des preuves.",
        "Seer Interactive a vu les marques citées dans l'Aperçu IA obtenir plus de clics que les autres. Mesurez les demandes et réservations, pas seulement le trafic."],
        do: "Dans vos statistiques, choisissez un objectif important (réservation, demande, don, candidature) et suivez-le chaque mois à côté du trafic.",
        quiz: { q: "Le trafic baisse, mais les fonctions IA montrent vos pages. Que suivre en plus ?", o: ["Les conversions comme les réservations ou candidatures", "Seulement le taux de rebond", "Rien : le trafic suffit"], a: 0, why: "Les études montrent moins de clics avec les résumés IA ; ce qui compte, c'est que les visiteurs agissent." }, try: "mission" }
    ] },
    { id: "t2", icon: "shield-check", t: "Ouvrir la porte", d: "robots.txt, robots IA, CDN et réglages de Google.", lessons: [
      { id: "t2-1", t: "robots.txt en 10 minutes", conf: "D", cards: [
        "robots.txt est un fichier texte public à l'adresse votredomaine/robots.txt. Il indique aux robots ce qu'ils peuvent lire. C'est une norme volontaire (RFC 9309), pas un verrou.",
        "Chaque bloc commence par « User-agent: » (le nom du robot), suivi de règles « Disallow: » ou « Allow: ». Un robot non nommé suit le bloc « User-agent: * ».",
        "Ajoutez une ligne « Sitemap: » pour que les robots trouvent toutes vos pages."],
        do: "Ouvrez votredomaine/robots.txt. Vérifiez que Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot et PerplexityBot ne sont pas bloqués et qu'une ligne Sitemap existe.",
        quiz: { q: "Un robot n'est nommé nulle part dans le robots.txt. Quelles règles s'appliquent ?", o: ["Le bloc « User-agent: * »", "Aucune, il peut tout lire", "Le bloc de Googlebot"], a: 0, why: "Les robots non nommés suivent les règles valables pour tous (*)." }, try: "bots" },
      { id: "t2-2", t: "Le zoo des robots IA", conf: "D", cards: [
        "Les robots d'entraînement collectent du texte pour de futurs modèles : GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot.",
        "Les robots de recherche indexent les pages pour les réponses IA : OAI-SearchBot, Claude-SearchBot, PerplexityBot. Selon Anthropic, bloquer Claude-SearchBot peut réduire votre visibilité dans la recherche de Claude.",
        "Les robots « utilisateur » récupèrent une page quand une personne le demande : ChatGPT-User, Claude-User, Perplexity-User. Selon OpenAI, robots.txt peut ne pas s'appliquer à ChatGPT-User ; Perplexity-User l'ignore en général ; Claude-User le respecte selon Anthropic."],
        do: "Jouez au jeu des robots de cette Académie jusqu'à obtenir 8/8.",
        quiz: { q: "Lequel est un robot d'entraînement, pas de recherche ?", o: ["GPTBot", "OAI-SearchBot", "PerplexityBot"], a: 0, why: "OpenAI : GPTBot collecte du contenu pouvant servir à entraîner ses modèles." }, try: "bots" },
      { id: "t2-3", t: "Bloquer l'entraînement, garder la recherche", conf: "D", cards: [
        "Vous pouvez refuser l'entraînement tout en restant trouvable : nommez les robots d'entraînement avec « Disallow: / » et les robots de recherche avec « Allow: / ».",
        "Bloquer Google-Extended ne vous retire pas des Aperçus IA : ceux-ci dépendent de Googlebot et des règles d'extraits.",
        "Bloquer ou non l'entraînement est votre choix. Aucune mesure ne tranche pour les petites structures : notez-le comme une décision consciente."],
        do: "Reprenez le modèle du pack de corrections de l'Agent, adaptez l'adresse du sitemap et faites-le publier.",
        quiz: { q: "Vous bloquez Google-Extended. Que deviennent vos Aperçus IA ?", o: ["Rien ne change : ils dépendent de Googlebot", "Vous en disparaissez", "Votre classement chute"], a: 0, why: "Google : Google-Extended concerne l'entraînement de Gemini et l'ancrage dans d'autres systèmes, pas les fonctions IA de la recherche." }, try: "audit" },
      { id: "t2-4", t: "Votre CDN bloque peut-être l'IA", conf: "D", cards: [
        "Un robots.txt parfait ne sert à rien si l'hébergeur ou le CDN bloque le robot avant. Google cite la vérification du « CDN ou de l'infrastructure d'hébergement » parmi les bonnes pratiques.",
        "Depuis le 1er juillet 2025, Cloudflare bloque par défaut les robots IA sur les nouveaux domaines et propose « Pay Per Crawl ».",
        "Depuis le 15 septembre 2026, les réglages « Block » et « Block on pages with ads » de Cloudflare arrêtent aussi les robots à usage mixte, dont Googlebot, Bingbot et Applebot : ils vous retirent donc aussi de la recherche. Pour refuser l'entraînement en restant dans la recherche : le nouveau réglage « Disallow AI Training »."],
        do: "Demandez à votre hébergeur ou regardez votre tableau de bord Cloudflare : quels robots IA sont bloqués ? Autorisez les robots de recherche voulus.",
        quiz: { q: "Le robots.txt autorise tout. Les robots de recherche IA peuvent-ils quand même être bloqués ?", o: ["Oui, par le CDN ou le pare-feu", "Non, robots.txt décide", "Seulement le week-end"], a: 0, why: "Des couches de sécurité peuvent bloquer les robots avant qu'ils ne lisent robots.txt." }, try: "audit" },
      { id: "t2-5", t: "Extraits et retrait des fonctions IA de Google", conf: "D", cards: [
        "Pour limiter ce que Google montre d'une page : nosnippet, data-nosnippet (pour une partie de page), max-snippet ou noindex.",
        "Depuis le 31 août 2026, chaque site dispose dans la Search Console du réglage « Search generative AI » : vous pouvez exclure votre site des Aperçus IA, du mode IA et des fonctions IA de Discover.",
        "Il ne couvre ni l'application Gemini ni l'entraînement de l'IA : cela reste le rôle de Google-Extended. Les sites exclus ne reçoivent ni trafic ni impressions de ces fonctions ; selon Google, ce n'est pas un signal de classement ailleurs."],
        do: "Si un paragraphe ne doit jamais être cité (par exemple d'anciens tarifs), entourez-le de data-nosnippet au lieu de masquer toute la page.",
        quiz: { q: "Que vous coûte le retrait des fonctions IA de Google (2026) ?", o: ["Tout le trafic et les impressions de ces fonctions", "Votre classement normal", "Rien du tout"], a: 0, why: "Google : les sites retirés ne reçoivent ni trafic ni impressions de ses fonctions d'IA générative." }, try: "audit" }
    ] },
    { id: "t3", icon: "eye", t: "Être lisible", d: "Texte, JavaScript, sitemaps, llms.txt et langues.", lessons: [
      { id: "t3-1", t: "Le texte bat les images et les PDF", conf: "D", cards: [
        "Google demande que le contenu important soit disponible en texte. Horaires dans une image, tarifs dans un PDF, dates seulement sur une affiche : les machines peuvent les manquer.",
        "Images et vidéos comptent toujours : suivre les guides de Google sur l'image et la vidéo prépare déjà à la recherche IA, selon Google.",
        "Ajoutez un texte alternatif aux images et une transcription aux vidéos. Cela aide les personnes handicapées et les machines."],
        do: "Trouvez une information qui n'existe que dans une image ou un PDF (horaires, tarifs, dates limites) et écrivez-la en texte sur la page.",
        quiz: { q: "Vos horaires ne figurent que sur une affiche en image. Risque ?", o: ["Les machines peuvent ne pas les lire", "Aucun, l'IA lit toutes les images", "Google interdit les images"], a: 0, why: "Google demande que le contenu important soit disponible sous forme de texte." }, try: "machine" },
      { id: "t3-2", t: "JavaScript et robots IA", conf: "OD", cards: [
        "Google exécute le JavaScript. La plupart des entreprises d'IA ne disent pas si leurs robots le font ; Perplexity, par exemple, ne le documente pas.",
        "Hypothèse prudente : ce qui n'apparaît qu'après exécution du JavaScript dans le navigateur peut être invisible pour certains robots IA.",
        "L'Audit de Sada compare le HTML brut à la page affichée et avertit quand l'essentiel du texte manque sans JavaScript."],
        do: "Lancez l'Audit de Sada sur votre page d'accueil et lisez le point sur le contenu sans JavaScript.",
        quiz: { q: "Est-il prouvé que tous les robots IA exécutent le JavaScript ?", o: ["Non, la plupart ne le documentent pas", "Oui, tous", "Oui, depuis 2025"], a: 0, why: "Seul Google documente le rendu ; pour les autres, la question reste ouverte." }, try: "audit" },
      { id: "t3-3", t: "Sitemaps et IndexNow", conf: "D", cards: [
        "Un sitemap XML liste vos pages ; c'est le moyen documenté par Google pour faciliter la découverte. Soumettez-le dans la Search Console et les Bing Webmaster Tools.",
        "IndexNow permet de signaler instantanément une modification à Bing et à d'autres moteurs. Google ne l'utilise pas.",
        "La plupart des systèmes (extensions WordPress, Shopify, TYPO3) créent les deux : activez-les."],
        do: "Ouvrez votredomaine/sitemap.xml. S'il manque, activez la fonction sitemap de votre système et soumettez-le aux deux outils.",
        quiz: { q: "Quel moteur n'utilise PAS IndexNow ?", o: ["Google", "Bing", "Aucun des deux"], a: 0, why: "IndexNow est pris en charge par Bing et d'autres, pas par Google." }, try: "audit" },
      { id: "t3-4", t: "llms.txt : l'histoire honnête", conf: "OD", cards: [
        "llms.txt est un fichier proposé pour résumer un site à l'intention de l'IA. Google le range parmi les tactiques inutiles : la recherche Google l'ignore, il n'aide ni ne nuit.",
        "SE Ranking (nov. 2025, ~300 000 domaines) l'a trouvé sur environ 10 % des sites, sans effet sur la fréquence des citations par l'IA. Une étude de journaux n'a vu que ~0,1 % des requêtes de robots IA sur ce fichier.",
        "De l'autre côté : certains praticiens estiment que d'autres assistants que Google pourraient le lire, mais aucun fournisseur d'IA ne documente son usage. Peu coûteux, mais pas une solution miracle."],
        do: "Si vous avez un llms.txt, gardez-le court et exact. Consacrez d'abord votre temps au robots.txt et au contenu.",
        quiz: { q: "llms.txt vous aide-t-il dans la recherche Google ?", o: ["Non, la recherche Google l'ignore", "Oui, il est obligatoire", "Seulement avec schema"], a: 0, why: "Google : ces fichiers n'aident ni ne nuisent à la visibilité dans la recherche Google." }, try: "audit" },
      { id: "t3-5", t: "Plusieurs langues, de droite à gauche", conf: "D", cards: [
        "Si vous publiez en plusieurs langues, reliez les versions avec hreflang pour que les moteurs affichent la bonne.",
        "Chaque page a besoin du bon attribut lang. Les pages en arabe ont aussi besoin de dir=\"rtl\" pour afficher correctement texte et ponctuation.",
        "Traduisez soigneusement : une traduction automatique non relue donne une image moins fiable dans toutes les langues."],
        do: "Lancez l'Audit de Sada sur une page par langue et corrigez les avertissements de langue ou de hreflang.",
        quiz: { q: "De quoi une page en arabe a-t-elle besoin en plus de lang=\"ar\" ?", o: ["dir=\"rtl\"", "Un domaine séparé", "Une version PDF"], a: 0, why: "W3C : définir le sens d'écriture de base pour les langues écrites de droite à gauche." }, try: "audit" }
    ] },
    { id: "t4", icon: "building-2", t: "Être reconnu", d: "Un seul nom partout, schema, Wikidata.", lessons: [
      { id: "t4-1", t: "Un seul nom partout", conf: "D", cards: [
        "L'IA doit comprendre que « Stadt Albstadt », « Stadtverwaltung Albstadt » et albstadt.de sont la même organisation. Des informations identiques facilitent ce travail.",
        "Utilisez le même nom, la même adresse, le même téléphone, les mêmes horaires et le même site sur votre site, votre fiche d'établissement Google, Bing Places, Apple Business Connect, Facebook et LinkedIn.",
        "Google cite la mise à jour de la fiche d'établissement et de Merchant Center parmi les bonnes pratiques pour ses fonctions IA."],
        do: "Faites un tableau : plateforme, nom, adresse, téléphone, horaires, lien. Remplissez-le pour 5 plateformes et corrigez chaque écart.",
        quiz: { q: "Pourquoi des noms et adresses identiques comptent-ils pour l'IA ?", o: ["Ils relient toutes les mentions à une seule organisation", "Ils augmentent les prix", "Ils sont obligatoires partout"], a: 0, why: "Des informations cohérentes permettent aux machines de reconnaître une entité unique." }, try: "mission" },
      { id: "t4-2", t: "Schema Organization et sameAs", conf: "D", cards: [
        "Les données structurées (JSON-LD) énoncent des faits dans un format lisible par les machines : nom, logo, adresse, site. sameAs liste vos profils officiels ailleurs.",
        "Selon Google, aucun schema spécial n'est nécessaire pour ses fonctions IA, mais les données structurées doivent correspondre au texte visible.",
        "Google documente toujours Organization, Local business, Event, Profile page, Article et Video."],
        do: "Utilisez le code du pack de corrections de Sada : un bloc Organization avec name, url, logo, address et sameAs. Vérifiez-le avec le test des résultats enrichis de Google.",
        quiz: { q: "Que doivent toujours faire vos données structurées ?", o: ["Correspondre au texte visible de la page", "Contenir des mots-clés", "Être cachées aux visiteurs"], a: 0, why: "Google : assurez-vous que vos données structurées correspondent au texte visible." }, try: "pack" },
      { id: "t4-3", t: "Le bon type", conf: "D", cards: [
        "schema.org propose des types précis : Museum, CollegeOrUniversity, School, NGO, GovernmentOrganization, LocalBusiness et bien d'autres.",
        "Choisissez le type le plus précis qui soit exact. Un lieu de mémoire n'est pas une Organization générique ; une mairie est une GovernmentOrganization.",
        "Des types précis aident les machines à vous distinguer d'organisations au nom proche."],
        do: "Cherchez votre type sur schema.org et remplacez un « Organization » générique par le type précis.",
        quiz: { q: "Meilleur type schema pour une administration municipale ?", o: ["GovernmentOrganization", "Store", "Product"], a: 0, why: "schema.org définit GovernmentOrganization pour les organismes publics." }, try: "pack" },
      { id: "t4-4", t: "Wikidata avant Wikipédia", conf: "D", cards: [
        "Wikipédia exige une couverture significative dans des sources fiables et indépendantes, et a des règles de conflit d'intérêts si vous écrivez sur vous-même.",
        "Wikidata est moins exigeant : une entité clairement identifiable, décrite par des références sérieuses et publiques.",
        "Un élément Wikidata exact (site officiel, lieu, date de fondation, identifiants) est une fiche d'identité propre que beaucoup de systèmes lisent."],
        do: "Cherchez votre organisation sur Wikidata. Corrigez l'élément, ou créez-en un avec site officiel, lieu et date de fondation, chacun sourcé.",
        quiz: { q: "Votre association est petite et peu couverte par la presse. Par où commencer ?", o: ["Wikidata", "Écrire votre propre article Wikipédia", "Acheter une page Wikipédia"], a: 0, why: "L'admissibilité sur Wikipédia exige une couverture indépendante ; Wikidata est moins exigeant." }, try: "mission" },
      { id: "t4-5", t: "Ce que Google a supprimé", conf: "D", cards: [
        "Les résultats enrichis FAQ n'apparaissent plus dans la recherche Google depuis le 7 mai 2026, et Google a retiré leur documentation en juin 2026. Les résultats HowTo ont aussi disparu.",
        "Beaucoup d'autres fonctions restent documentées (novembre 2026) : Organization, Local business, Event, Course list, Education Q&A, Profile page, Article, Video et Review snippet. Le balisage Dataset ne sert plus qu'à Dataset Search.",
        "Inutile de supprimer le balisage FAQ, et une FAQ visible aide toujours les lecteurs. N'attendez simplement plus de menus dépliants chez Google."],
        do: "Si un prestataire vous vend du schema FAQ pour des « résultats enrichis », demandez-lui de lire l'avis de Google de mai 2026.",
        quiz: { q: "Vous ajoutez du balisage FAQPage en juin 2026 pour obtenir des menus dépliants. Résultat ?", o: ["Aucun : supprimé le 7 mai 2026", "Des menus en une semaine", "Une pénalité"], a: 0, why: "Google : les résultats enrichis FAQ n'apparaissent plus depuis le 7 mai 2026." }, try: "audit" }
    ] },
    { id: "t5", icon: "quote", t: "Écrire pour être cité", d: "Contenu de première main, réponse d'abord, vraies preuves.", lessons: [
      { id: "t5-1", t: "Un contenu que vous seul avez", conf: "D", cards: [
        "Guide de Google 2026 : un contenu que les gens trouvent unique, convaincant et utile influencera probablement votre présence dans la recherche IA plus que tout autre conseil.",
        "Le contenu interchangeable répète ce que tout le monde dit (« 7 conseils pour visiter un musée »). Le contenu original, seule votre organisation peut l'écrire (« Ce que nous avons découvert en restaurant notre orgue de 1928 »).",
        "Vos archives, vos chiffres, vos équipes et votre connaissance locale, aucune IA ne peut les copier ailleurs."],
        do: "Listez 3 choses que seule votre organisation sait ou possède. Faites-en une page ce mois-ci.",
        quiz: { q: "Lequel est un contenu non interchangeable ?", o: ["Votre propre journal de restauration avec photos et dates", "Une liste de conseils de visite généraux", "Un résumé de Wikipédia reformulé"], a: 0, why: "Google privilégie le contenu original et de première main." }, try: "audit" },
      { id: "t5-2", t: "La réponse d'abord", conf: "OD", cards: [
        "Commencez vos pages par la réponse directe : quoi, pour qui, où, avec l'information clé. Expliquez ensuite.",
        "Des agences rapportent plus de citations avec ce format ; aucune entreprise d'IA ne le documente. Google dit qu'un découpage spécial pour l'IA est inutile.",
        "Cela ne coûte rien et aide les lecteurs : faites-le quand même, avec des intertitres et des paragraphes courts."],
        do: "Réécrivez les deux premières phrases de vos trois pages clés pour qu'elles répondent directement à la question principale, avec une date ou un chiffre.",
        quiz: { q: "Est-il prouvé que la réponse d'abord augmente les citations IA ?", o: ["Non prouvé, mais peu coûteux et utile aux lecteurs", "Oui, Google l'exige", "Non, c'est pénalisé"], a: 0, why: "Les éditeurs ne le documentent pas ; Google dit le découpage inutile. Cela aide les lecteurs dans tous les cas." }, try: "rewrite" },
      { id: "t5-3", t: "Sources, citations, chiffres", conf: "E", cards: [
        "L'étude GEO (Princeton, Georgia Tech, AI2, IIT Delhi ; KDD 2024) a montré qu'ajouter des sources, des citations et des statistiques augmentait la visibilité d'une source dans les réponses IA jusqu'à 40 %.",
        "Le bourrage de mots-clés a fait moins bien que ne rien changer.",
        "Limites : les tests principaux utilisaient un moteur simulé avec des modèles de 2023, et la « visibilité » mesurait la part du texte de la réponse, pas les clics. Une tendance, pas une loi."],
        do: "Ajoutez une source nommée, une citation ou un chiffre daté à votre page la plus importante.",
        quiz: { q: "Dans l'étude GEO, qu'a donné le bourrage de mots-clés ?", o: ["Moins bien que la version de base", "Une visibilité doublée", "Aucun effet mesurable"], a: 0, why: "Dans le test réel avec Perplexity, il a fait moins bien que la version inchangée." }, try: "heat" },
      { id: "t5-4", t: "Publier vos propres données", conf: "D", cards: [
        "Un chiffre que vous seul avez est citable : visiteurs par an, diplômés insérés, objets dans les archives, arbres plantés.",
        "Datez-le, dites comment il a été compté, et écrivez-le en texte (pas seulement dans un graphique).",
        "C'est exactement le matériel de première main que le guide de Google 2026 met en avant."],
        do: "Publiez un chiffre daté et attribué : « En 2025, 41 200 personnes ont visité le mémorial (billetterie). »",
        quiz: { q: "Qu'est-ce qui rend une statistique maison utile pour l'IA et les lecteurs ?", o: ["Une date, une méthode et du texte", "Une grande police", "Arrondir au million"], a: 0, why: "Des chiffres datés et expliqués peuvent être vérifiés et cités." }, try: "quote" },
      { id: "t5-5", t: "Ne pas en faire trop", conf: "D", cards: [
        "Créer une page pour chaque variante d'une question, surtout pour influencer les réponses IA, enfreint la règle de Google contre les contenus produits en masse (scaled content abuse).",
        "Pages IA en série, texte caché et fausses dates de mise à jour sont du spam, pas de l'optimisation.",
        "Une excellente page qui traite un sujet en entier vaut mieux que vingt pages minces."],
        do: "Repérez les pages qui disent presque la même chose. Fusionnez-les en une et redirigez les autres.",
        quiz: { q: "Créer 50 pages presque identiques pour chaque variante de question, c'est…", o: ["Du scaled content abuse", "Une bonne pratique", "Obligatoire pour le mode IA"], a: 0, why: "Google le cite explicitement dans son guide 2026." }, try: "audit" }
    ] },
    { id: "t6", icon: "users", t: "La réputation au-delà du site", d: "Où regarde l'IA, avis, presse, communautés.", lessons: [
      { id: "t6-1", t: "Où regarde l'IA", conf: "E", cards: [
        "Peec AI a analysé 30 millions de sources citées dans ChatGPT, le mode IA, Gemini, Perplexity et les Aperçus IA : Reddit, YouTube, LinkedIn, Wikipédia et Forbes arrivent en tête.",
        "Les assistants diffèrent : Profound a trouvé Wikipédia bien plus souvent dans ChatGPT, Reddit davantage dans Perplexity.",
        "Les parts varient vite et les études se contredisent : Ahrefs a mesuré une chute de Reddit de 19,1 % à 2,3 % des réponses de ChatGPT aux États-Unis (mars–septembre 2026) et de Wikipédia de 14,1 % à 2,9 %, tandis que BrightEdge voit Reddit progresser dans les Aperçus IA de Google. Répartissez votre présence."],
        do: "Posez une de vos questions à un assistant et notez les sites qu'il cite : ce sont vos cibles.",
        quiz: { q: "Quel type de plateforme a dominé les citations IA dans les études 2025–2026 ?", o: ["Contenus d'utilisateurs et vidéo (Reddit, YouTube)", "Seulement les sites publics", "Seulement les pages d'accueil d'entreprises"], a: 0, why: "Peec AI et Profound placent forums et vidéo parmi les sources les plus citées." }, try: "ask" },
      { id: "t6-2", t: "Des avis honnêtes", conf: "D", cards: [
        "Les avis et données d'établissement alimentent l'IA de Google via votre fiche d'établissement.",
        "Les faux avis ou avis achetés sont illégaux : aux États-Unis, règle de la FTC depuis le 21 octobre 2024 (y compris les avis écrits par IA) ; dans l'UE, directive Omnibus depuis le 28 mai 2022.",
        "Sollicitez de vrais visiteurs, étudiants ou partenaires, sans récompense liée à une note positive."],
        do: "Demandez cette semaine à cinq vrais visiteurs ou partenaires un avis Google honnête.",
        quiz: { q: "Un prestataire propose 50 avis cinq étoiles « pour l'IA ». C'est…", o: ["Illégal dans l'UE et aux États-Unis", "Une zone grise", "Recommandé par Google"], a: 0, why: "Les faux avis sont interdits par la règle de la FTC et la directive Omnibus." }, try: "ask" },
      { id: "t6-3", t: "Annuaires et listes", conf: "E", cards: [
        "Annuaires, portails touristiques, fédérations professionnelles et listes « les meilleurs… » sont des lieux où l'IA trouve souvent ses recommandations ; des sites d'avis comme Yelp apparaissaient souvent dans les questions de recommandation.",
        "Une fiche erronée propage de fausses informations. Une fiche absente vous fait sortir de la liste.",
        "Vérifiez d'abord les sites que les assistants citent vraiment pour vos questions."],
        do: "Listez 10 annuaires, portails ou registres de votre secteur. Corrigez ou créez votre fiche sur trois d'entre eux.",
        quiz: { q: "Pourquoi corriger votre fiche sur un portail touristique ?", o: ["L'IA peut la citer comme source", "Elle change l'algorithme de Google", "Elle retire vos concurrents"], a: 0, why: "Les fiches de tiers sont des sources fréquentes des réponses de recommandation." }, try: "ask" },
      { id: "t6-4", t: "Des communautés sans spam", conf: "OD", cards: [
        "Les forums comme Reddit sont très cités, alors certains tentent d'y placer des messages. Cela enfreint les règles des plateformes et parfois le droit de la consommation.",
        "Ce qui fonctionne honnêtement : répondre à de vraies questions en votre nom, dire qui vous êtes, ne mettre un lien que s'il aide.",
        "Que l'activité en communauté modifie les réponses IA pour les petites structures n'est pas mesuré. Faites-le pour aider les gens."],
        do: "Trouvez dans un forum une vraie question sur votre domaine et répondez utilement, en indiquant votre rôle.",
        quiz: { q: "Publier de faux messages de « clients » à votre sujet, c'est…", o: ["Contraire aux règles et juridiquement risqué", "Une bonne pratique", "Invisible pour l'IA"], a: 0, why: "La publicité déguisée enfreint les règles des communautés et le droit de la consommation." }, try: "ask" },
      { id: "t6-5", t: "Presse et partenaires", conf: "D", cards: [
        "La couverture indépendante est ce que Wikipédia appelle une « couverture significative dans des sources fiables », et ce à quoi les assistants font confiance.",
        "Les partenaires (universités, villes, fondations, financeurs) peuvent vous décrire et vous lier correctement.",
        "Donnez aux journalistes et partenaires une fiche : nom, description en une phrase, chiffres datés, contact, logo."],
        do: "Rédigez une fiche d'une page et demandez à deux partenaires de vérifier comment ils vous décrivent.",
        quiz: { q: "Qu'est-ce qu'une couverture indépendante ?", o: ["Un article de presse que vous n'avez pas payé", "Votre propre blog", "Un publireportage payé"], a: 0, why: "Les règles d'admissibilité exigent des sources indépendantes du sujet." }, try: "mission" }
    ] },
    { id: "t7", icon: "share-2", t: "Réseaux sociaux", d: "Quelles plateformes l'IA peut lire, et comment régler les vôtres.", lessons: [
      { id: "t7-1", t: "Quelles plateformes laissent entrer l'IA", conf: "D", cards: [
        "Le robots.txt de LinkedIn (vérifié le 9 nov. 2026) bloque tous les robots qu'il ne nomme pas. GPTBot, ClaudeBot, PerplexityBot et CCBot ne sont pas nommés : ils sont bloqués.",
        "Le robots.txt de YouTube ne nomme aucun robot IA et ne bloque que des chemins comme /results ou /api/ : les pages vidéo sont ouvertes.",
        "Le contrôle des comptes de Sada lit le robots.txt de chaque plateforme en direct, car ces fichiers changent."],
        do: "Ouvrez vos comptes avec le panneau Sada ouvert et lisez pour chacun le résultat sur les robots IA et de recherche.",
        quiz: { q: "LinkedIn se termine par « User-agent: * / Disallow: / ». Et GPTBot ?", o: ["Bloqué, car non nommé", "Autorisé", "Autorisé seulement sur les posts"], a: 0, why: "Les robots non nommés relèvent de * et sont bloqués sur tout le site." }, try: "social" },
      { id: "t7-2", t: "Instagram est indexable", conf: "D", cards: [
        "Depuis le 10 juillet 2025, les publications publiques des comptes professionnels (utilisateurs de 18 ans et plus) peuvent être indexées par Google et Bing.",
        "Les comptes personnels et privés sont exclus. Vous pouvez désactiver cela dans les paramètres de confidentialité.",
        "Les légendes comptent donc au-delà d'Instagram : écrivez clairement quoi, qui, où et quand."],
        do: "Passez votre compte en professionnel et public, et vérifiez que l'option d'apparition des photos et vidéos publiques dans les moteurs de recherche est activée.",
        quiz: { q: "Depuis juillet 2025, quelles publications Instagram peuvent apparaître dans Google ?", o: ["Les publications publiques des comptes professionnels", "Toutes les publications privées", "Aucune"], a: 0, why: "Le changement concerne les comptes professionnels publics d'adultes." }, try: "social" },
      { id: "t7-3", t: "YouTube : descriptions et sous-titres", conf: "E", cards: [
        "YouTube fait partie des sources les plus citées dans les réponses IA (Peec AI, 2026).",
        "Une machine lit le titre, la description et les sous-titres, pas les images.",
        "Les sous-titres automatiques déforment souvent les noms, surtout allemands, français et arabes."],
        do: "Ajoutez 2 à 3 phrases factuelles aux descriptions de vos 5 vidéos les plus vues et corrigez leurs sous-titres.",
        quiz: { q: "Que peut lire un système d'IA dans une vidéo ?", o: ["Le titre, la description et les sous-titres", "Seulement la miniature", "Rien"], a: 0, why: "Les machines lisent le texte autour et dans la vidéo (sous-titres)." }, try: "social" },
      { id: "t7-4", t: "Pages entreprise LinkedIn", conf: "OD", cards: [
        "LinkedIn fait partie des domaines les plus cités, bien que la plupart des robots IA y soient bloqués. Le chemin (index de recherche, partenariats, récupérations à la demande) n'est pas documenté.",
        "Remplissez l'onglet « À propos » : description, site web, secteur, lieu. Sada le lit sur votre ordinateur pour le comparer à votre site.",
        "Utilisez le même nom et la même description que sur votre site."],
        do: "Ouvrez votre page LinkedIn avec Sada et corrigez chaque point « À améliorer ».",
        quiz: { q: "Est-il documenté comment les assistants IA utilisent les contenus LinkedIn ?", o: ["Non, c'est une question ouverte", "Oui, via GPTBot", "Oui, LinkedIn les vend"], a: 0, why: "LinkedIn bloque les robots IA non nommés ; le chemin vers les citations n'est pas documenté." }, try: "social" },
      { id: "t7-5", t: "Bios et « link in bio »", conf: "OD", cards: [
        "Une bio est une fiche d'identité en une ligne : nom, ce que vous êtes, où, votre propre site.",
        "Les pages « link in bio » ajoutent un intermédiaire entre le compte et votre site. Aucune étude ne mesure l'effet, mais votre propre domaine est le signal le plus clair.",
        "Votre site devrait renvoyer vers chaque compte, idéalement dans son balisage sameAs."],
        do: "Reprenez la bio suggérée par Sada, vérifiez les informations et mettez votre propre domaine en lien principal.",
        quiz: { q: "Quel est le lien le plus clair dans une bio ?", o: ["Votre propre domaine", "Une page « link in bio »", "Un hashtag"], a: 0, why: "Votre domaine relie directement le compte à votre site." }, try: "social" }
    ] },
    { id: "t8", icon: "map", t: "Local et par secteur", d: "Musées, universités, associations, prix, mairies.", lessons: [
      { id: "t8-1", t: "La fiche d'établissement pour l'IA", conf: "D", cards: [
        "Les données de la fiche d'établissement et de Maps alimentent les réponses IA de Google. Google cite leur mise à jour parmi les bonnes pratiques.",
        "Remplissez tout : catégorie, horaires, horaires exceptionnels, site, photos, description, attributs comme l'accessibilité.",
        "Répondez aux avis, et mettez la fiche à jour le jour même où vos horaires changent."],
        do: "Ouvrez votre fiche d'établissement Google et remplissez chaque champ vide. Ajoutez les horaires exceptionnels des prochains jours fériés.",
        quiz: { q: "Vos horaires d'hiver changent. Quelles deux sources d'abord ?", o: ["La page horaires de votre site et votre fiche d'établissement", "Instagram et TikTok", "Seulement votre newsletter"], a: 0, why: "Ce sont les sources sur lesquelles s'appuient les fonctions IA de Google." }, try: "mission" },
      { id: "t8-2", t: "Musées et lieux de mémoire", conf: "D", cards: [
        "Mettez horaires, fermetures, tarifs, accessibilité et accès sur une seule page, en texte, identiques à la fiche d'établissement.",
        "Balisez expositions et événements avec des données Event (nom, dates, lieu).",
        "Les informations d'accessibilité sont aussi souvent exigées par le droit européen de l'accessibilité et servent à tous les visiteurs."],
        do: "Créez ou améliorez une page « Préparer sa visite » avec toutes les informations pratiques en texte.",
        quiz: { q: "Où un lieu de mémoire doit-il mettre ses horaires ?", o: ["En texte sur une page de visite, identiques à la fiche", "Seulement dans un dépliant PDF", "Seulement sur Instagram"], a: 0, why: "Des informations textuelles identiques partout sont les plus fiables pour les machines." }, try: "machine" },
      { id: "t8-3", t: "Universités et écoles", conf: "D", cards: [
        "Une page par formation : langue d'enseignement, durée, frais, dates limites datées, conditions pour les candidats internationaux.",
        "Google documente toujours le balisage Course list, mais dit que ses fonctions IA n'ont besoin d'aucun schema spécial. Des pages de formation claires et complètes comptent le plus.",
        "Signalez ou redirigez les dates limites passées : une IA qui cite la date de l'an dernier fait fuir les étudiants."],
        do: "Vérifiez votre page de formation principale : la langue, les frais et la date limite de cette année sont-ils écrits en texte ?",
        quiz: { q: "Qu'est-ce qui nuit le plus à une page de formation dans les réponses IA ?", o: ["Une date limite périmée", "Une URL courte", "Une photo d'étudiants"], a: 0, why: "Les anciennes dates sont citées comme si elles étaient actuelles." }, try: "ask" },
      { id: "t8-4", t: "Associations, prix et mairies", conf: "D", cards: [
        "Associations et fondations : une page transparence avec numéro d'enregistrement, rapport annuel et dirigeants.",
        "Prix et concours : une page permanente par édition avec appel, date limite, jury et lauréats datés. N'écrasez jamais les anciens lauréats.",
        "Mairies : des pages de démarches titrées comme les questions des habitants, avec horaires et pièces à fournir en texte. En Allemagne, l'Impressum relève du § 5 DDG."],
        do: "Prenez la règle de votre secteur et améliorez une page aujourd'hui.",
        quiz: { q: "Un prix publie les lauréats 2026. Et ceux de 2025 ?", o: ["Les garder sur leur propre page permanente", "Les écraser", "Les supprimer"], a: 0, why: "Des pages permanentes et datées gardent l'histoire du prix citable." }, try: "audit" },
      { id: "t8-5", t: "Histoire sensible", conf: "OD", cards: [
        "Aucune entreprise d'IA ne publie comment elle pondère les sources sur une histoire controversée, comme l'époque nazie ou la mémoire.",
        "Les consignes des évaluateurs de Google traitent les sujets qui touchent la société et la compréhension civique comme exigeant une grande confiance (YMYL).",
        "Ce que vous maîtrisez : nommer sources et archives, dater vos affirmations, indiquer qui écrit et pourquoi, donner le contexte. Que les assistants favorisent les institutions officielles n'est pas prouvé."],
        do: "Ajoutez auteur, date et sources à une page historique.",
        quiz: { q: "Qu'est-ce qui renforce la confiance dans une page historique ?", o: ["Des sources, dates et auteurs nommés", "Plus d'adjectifs", "Des mots-clés cachés"], a: 0, why: "Les sujets exigeant une grande confiance demandent un contenu vérifiable et attribué." }, try: "audit" }
    ] },
    { id: "t9", icon: "mouse-pointer-click", t: "Agents IA", d: "Des assistants qui réservent, achètent et remplissent des formulaires.", lessons: [
      { id: "t9-1", t: "Ce que font les agents", conf: "D", cards: [
        "Les agents IA agissent pour les gens : comparer, réserver, acheter. Google a annoncé en mai 2025 le « paiement par agent » dans le mode IA.",
        "En 2026, Google a présenté avec des commerçants l'Universal Commerce Protocol ; OpenAI et Stripe ont conçu l'Agentic Commerce Protocol, puis OpenAI s'est davantage tourné vers les paiements des commerçants eux-mêmes.",
        "Pour la plupart des organisations, la tâche immédiate est plus simple : rendre informations et formulaires utilisables."],
        do: "Notez l'action que vous voulez que les gens fassent en ligne (réserver, s'inscrire, candidater, donner).",
        quiz: { q: "Qu'a annoncé Google pour le mode IA en 2025 ?", o: ["Un paiement par agent sous contrôle de l'utilisateur", "Des sites gratuits", "La fin des liens"], a: 0, why: "Google I/O 2025 : le mode IA peut acheter pour vous, toujours sous votre contrôle." }, try: "drive" },
      { id: "t9-2", t: "Des formulaires adaptés aux agents", conf: "OD", cards: [
        "Champs étiquetés, vrais boutons et messages d'erreur clairs sont des bases WCAG 2.2 pour les personnes handicapées.",
        "La même clarté aide probablement aussi les agents de navigateur, mais ce lien n'est pas mesuré.",
        "Les CAPTCHA et connexions bloquent les agents ; Anthropic dit que ses robots ne contournent pas les CAPTCHA."],
        do: "Passez votre formulaire de réservation ou de don dans un outil d'accessibilité gratuit (par exemple WAVE) et ajoutez les étiquettes manquantes.",
        quiz: { q: "Que doit corriger d'abord un petit musée pour les agents ?", o: ["Les champs de formulaire sans étiquette", "Construire un serveur MCP", "Supprimer tous les formulaires"], a: 0, why: "Un HTML accessible d'abord ; les protocoles sont expérimentaux." }, try: "drive" },
      { id: "t9-3", t: "Les protocoles expliqués", conf: "D", cards: [
        "MCP (Model Context Protocol, Anthropic, nov. 2024) relie des outils d'IA à des données et services.",
        "WebMCP permet à une page web d'offrir des fonctions comme outils à un agent dans le navigateur : préversion de Chrome en fév. 2026, brouillon d'un groupe communautaire du W3C en oct. 2026, non livré par les autres navigateurs.",
        "NLWeb (Microsoft) en est à ses débuts. UCP et ACP sont des protocoles de commerce surtout pour les boutiques."],
        do: "Rien de cela n'est nécessaire aujourd'hui hors boutique. Notez-le et revérifiez l'an prochain.",
        quiz: { q: "Quel est le statut de WebMCP fin 2026 ?", o: ["Préversion expérimentale et brouillon", "Une obligation légale", "Pris en charge par tous les navigateurs"], a: 0, why: "Préversion de Chrome derrière un paramètre ; brouillon d'un groupe communautaire du W3C." }, try: "drive" },
      { id: "t9-4", t: "Les informations avant la connexion", conf: "D", cards: [
        "Un agent ou un robot ne voit pas ce qui se trouve derrière une connexion.",
        "Affichez tarifs, dates, disponibilités et conditions en texte avant toute connexion.",
        "Cela aide aussi les gens à vous comparer avant de s'engager."],
        do: "Vérifiez votre parcours de réservation : le tarif est-il visible avant la connexion ? Sinon, ajoutez-le à la page publique.",
        quiz: { q: "Les tarifs n'apparaissent qu'après connexion. Effet ?", o: ["Agents et robots ne les voient pas", "Un meilleur classement", "Aucun effet"], a: 0, why: "Le contenu derrière une connexion est invisible pour les machines." }, try: "drive" },
      { id: "t9-5", t: "Ce que vous pouvez ignorer pour l'instant", conf: "D", cards: [
        "En 2026, vous n'avez besoin ni de MCP, ni de WebMCP, ni de protocoles de commerce pour être trouvé et recommandé.",
        "Méfiez-vous des offres pour rendre votre site « prêt pour les agents » avec des développements de protocoles si les bases (accès des robots, texte, formulaires) ne sont pas faites.",
        "Revoyez la question quand votre plateforme (WordPress, Shopify, outil de réservation) le prend en charge nativement."],
        do: "Demandez à tout prestataire qui propose des travaux de protocole quel navigateur ou assistant l'utilise aujourd'hui, avec une source.",
        quiz: { q: "Première priorité avant tout protocole d'agent ?", o: ["Accès des robots, informations en texte et formulaires fonctionnels", "Un chatbot", "Une application"], a: 0, why: "Les agents s'appuient sur les mêmes bases que les robots et les humains." }, try: "drive" }
    ] },
    { id: "t10", icon: "chart-column", t: "Mesurer", d: "Rapports gratuits, visites venues de l'IA, votre liste de questions, journaux.", lessons: [
      { id: "t10-1", t: "Le rapport « IA générative » de la Search Console", conf: "D", cards: [
        "Depuis juin 2026 (partout depuis le 31 août 2026), la Search Console propose des rapports d'IA générative pour la recherche et Discover : impressions, pages, pays, appareils, dates.",
        "Limites : impressions uniquement, sans clics ni requêtes ; les données commencent vers le 18 mai 2026. Les petits sites peuvent ne pas encore voir le rapport.",
        "Les données IA restent aussi dans le rapport Performances habituel."],
        do: "Ouvrez Search Console → Performances → IA générative. Notez les impressions et vos 5 pages principales.",
        quiz: { q: "Que ne montre PAS le rapport IA générative au lancement ?", o: ["Les clics", "Les impressions", "Les pages"], a: 0, why: "Il donne les impressions, pas encore les clics." }, try: "mission" },
      { id: "t10-2", t: "Bing AI Performance", conf: "D", cards: [
        "Les Bing Webmaster Tools (préversion publique depuis fév. 2026) montrent les citations dans Copilot, les résumés IA de Bing et chez certains partenaires.",
        "Ils montrent aussi les « grounding queries » : les recherches par lesquelles l'IA a trouvé vos pages. Une mine d'or pour vos formulations.",
        "Pas de clics non plus. Une mise à jour de juin 2026 aurait ajouté la part de citations et les thèmes."],
        do: "Validez votre site dans les Bing Webmaster Tools et lisez vos principales grounding queries.",
        quiz: { q: "Que sont les grounding queries ?", o: ["Les recherches par lesquelles l'IA a trouvé vos pages", "Vos mots-clés publicitaires", "Des signalements de spam"], a: 0, why: "Bing montre quelles recherches ont servi à ancrer la réponse de l'IA." }, try: "mission" },
      { id: "t10-3", t: "Les visites venues de l'IA dans vos statistiques", conf: "D", cards: [
        "La recherche ChatGPT ajoute utm_source=chatgpt.com à ses liens.",
        "Beaucoup de clics issus de l'IA arrivent sans source : les statistiques les sous-estiment.",
        "Créez un filtre sur les sources contenant chatgpt, perplexity, copilot, gemini, claude. Le pack de corrections de Sada contient une expression régulière prête à l'emploi."],
        do: "Dans GA4, créez une exploration avec ce filtre et enregistrez-la.",
        quiz: { q: "Les statistiques captent-elles toutes les visites venues de l'IA ?", o: ["Non, beaucoup arrivent sans source", "Oui, toutes", "Seulement celles de Perplexity"], a: 0, why: "Sans référent, le trafic IA ressemble à des visites directes." }, try: "pack" },
      { id: "t10-4", t: "Votre liste de questions", conf: "E", cards: [
        "Les agences mesurent la visibilité IA avec une liste fixe de 20 à 50 vraies questions, posées plusieurs fois par assistant, chaque mois.",
        "L'indicateur clé est la part des essais où vous apparaissez, pas une « position ».",
        "Notez aussi le concurrent cité, l'URL citée et toute information fausse vous concernant."],
        do: "Utilisez l'onglet Ask AI de Sada : choisissez 10 questions, posez-les dans 3 assistants, exportez le CSV chaque mois.",
        quiz: { q: "Qu'est-ce qui remplace la « position » dans un rapport IA ?", o: ["Le taux d'apparition sur des essais répétés", "L'âge du domaine", "Le nombre de mots"], a: 0, why: "SparkToro : votre fréquence d'apparition est le signal stable." }, try: "ask" },
      { id: "t10-5", t: "Les journaux serveur pour les robots", conf: "D", cards: [
        "Vos journaux serveur sont votre propre preuve que des robots IA passent.",
        "N'importe qui peut usurper un nom de robot. OpenAI et Perplexity publient des listes d'adresses IP pour vérifier les vrais robots.",
        "Raccourcissez les adresses IP des visiteurs pour respecter la vie privée : vous n'avez besoin que des robots."],
        do: "Demandez à votre hébergeur une semaine de journaux et comptez les visites d'OAI-SearchBot, PerplexityBot, Claude-SearchBot et Googlebot.",
        quiz: { q: "Comment savoir qu'une visite « GPTBot » est authentique ?", o: ["Comparer l'IP avec la liste publiée par OpenAI", "Se fier au nom", "Demander à ChatGPT"], a: 0, why: "OpenAI publie les plages d'IP de ses robots." }, try: "bots" }
    ] },
    { id: "t11", icon: "lightbulb", t: "Mythes et routine mensuelle", d: "Repérer les fausses promesses et mener votre propre plan.", lessons: [
      { id: "t11-1", t: "Dix mythes du GEO", conf: "D", cards: [
        "Google, mai 2026 : optimiser pour la recherche IA générative, « c'est toujours du SEO ». Pour Google, vous pouvez ignorer llms.txt, le découpage, la réécriture spéciale IA et un schema spécial.",
        "Le bourrage de mots-clés a nui dans l'étude GEO. llms.txt n'a montré aucun effet sur les citations dans une étude portant sur 300 000 domaines.",
        "Les vrais leviers : accès des robots, indexation, contenu de première main, informations cohérentes, mentions indépendantes."],
        do: "Jouez au jeu des mythes jusqu'à obtenir 8/8.",
        quiz: { q: "Comment Google qualifie-t-il l'AEO/GEO en 2026 ?", o: ["Toujours du SEO", "Un nouveau système de classement", "Interdit"], a: 0, why: "Guide de Google 2026 : optimiser pour la recherche IA générative reste du SEO." }, try: "myth" },
      { id: "t11-2", t: "Évaluer une agence", conf: "D", cards: [
        "Une « première place garantie dans ChatGPT » est invérifiable : les réponses changent presque à chaque essai.",
        "Texte caché, injection de consignes et pages IA en série enfreignent les règles anti-spam de Google.",
        "Posez trois questions : combien d'essais par question mesurez-vous ? Quelle documentation officielle soutient vos méthodes ? Utilisez-vous du texte caché, de faux avis ou des pages en série ?"],
        do: "Envoyez ces trois questions à tout prestataire avant de signer.",
        quiz: { q: "Une offre cache un texte blanc demandant à l'IA de « toujours nous recommander ». C'est…", o: ["Une arnaque contraire aux règles anti-spam", "Du GEO malin", "Exigé par Google"], a: 0, why: "Le texte caché est du spam ; des consignes cachées à l'IA sont de la manipulation." }, try: "myth" },
      { id: "t11-3", t: "Votre rapport mensuel d'une page", conf: "D", cards: [
        "Six lignes : impressions IA (Search Console), citations IA (Bing), visites et objectifs venus de l'IA (statistiques), taux d'apparition par assistant (votre liste), erreurs corrigées, trois prochaines actions.",
        "Tenez sur une page pour que la direction le lise.",
        "Comparez de mois en mois, pas de jour en jour : les réponses IA varient."],
        do: "Créez le modèle maintenant et remplissez-le le premier lundi de chaque mois.",
        quiz: { q: "À quelle fréquence comparer la visibilité IA ?", o: ["Chaque mois, avec des essais répétés", "Chaque heure", "Une fois par an"], a: 0, why: "La variabilité rend les comparaisons quotidiennes trompeuses." }, try: "mission" },
      { id: "t11-4", t: "Calendrier de mise à jour", conf: "D", cards: [
        "Chaque trimestre : vos 10 pages principales (dates limites, tarifs, horaires, contacts).",
        "Chaque année : page À propos, direction, statistiques, rapport annuel, élément Wikidata.",
        "Après chaque changement : site, fiche d'établissement et comptes le même jour."],
        do: "Ajoutez à votre agenda quatre rappels trimestriels « Mise à jour Sada ».",
        quiz: { q: "Quand mettre à jour un numéro de téléphone modifié ?", o: ["Partout le même jour", "À la prochaine refonte", "Seulement sur Facebook"], a: 0, why: "Des informations incohérentes se propagent et brouillent les machines." }, try: "mission" },
      { id: "t11-5", t: "Impact contre effort", conf: "D", cards: [
        "Gains rapides à fort impact : réglages robots.txt et CDN, fiche d'établissement cohérente, introductions avec la réponse d'abord, un bloc schema Organization.",
        "Projets plus lourds : données originales, couverture indépendante, qualité multilingue.",
        "Les gains rapides ce mois-ci, un projet plus lourd par trimestre."],
        do: "Lancez l'Agent de Sada et réalisez les trois premiers points du plan marqués « vous ».",
        quiz: { q: "Lequel est un gain rapide ?", o: ["Corriger le robots.txt", "Obtenir un article Wikipédia", "Développer une application"], a: 0, why: "Les petits changements techniques à fort impact passent d'abord." }, try: "mission" }
    ] },
    { id: "t12", icon: "scroll-text", t: "Droit et éthique (UE)", d: "Refus de l'entraînement, AI Act, vie privée, accessibilité, honnêteté.", lessons: [
      { id: "t12-1", t: "Refuser l'entraînement de l'IA", conf: "D", cards: [
        "Le droit de l'UE (directive DSM, art. 4) autorise la fouille de textes et de données sauf si le titulaire des droits l'a réservée de manière appropriée, par exemple par des moyens lisibles par machine pour les contenus en ligne.",
        "Dans l'affaire Kneschke contre LAION (OLG Hambourg, 5 U 104/24, 10 déc. 2025), il n'a pas été prouvé qu'une réserve de 2021 rédigée en langage courant était lisible par machine ; la charge de la preuve pesait sur le titulaire des droits. La question de savoir si le langage courant suffit aujourd'hui reste ouverte.",
        "L'affaire n'est pas close : la Cour fédérale de justice allemande (BGH, I ZR 281/25) l'a examinée le 3 septembre 2026 et pourrait saisir la Cour de justice de l'UE. Le plus sûr aujourd'hui : nommer les robots d'entraînement dans le robots.txt. Ceci n'est pas un conseil juridique."],
        do: "Si vous voulez refuser, ajoutez le bloc des robots d'entraînement au robots.txt et consignez la décision.",
        quiz: { q: "Quelle juridiction a statué en déc. 2025 dans l'affaire Kneschke contre LAION sur les réserves face à l'entraînement de l'IA ?", o: ["L'OLG de Hambourg (Kneschke contre LAION)", "La Cour suprême des États-Unis", "La CNIL"], a: 0, why: "OLG Hambourg, 5 U 104/24, 10 décembre 2025." }, try: "bots" },
      { id: "t12-2", t: "AI Act et code de bonnes pratiques", conf: "D", cards: [
        "L'AI Act (art. 53) oblige les fournisseurs de modèles d'IA à usage général à avoir une politique de respect du droit d'auteur de l'UE, y compris des réserves de l'art. 4.",
        "Le code de bonnes pratiques volontaire pour l'IA à usage général (juillet 2025) engage les signataires à respecter les réserves lisibles par machine comme robots.txt, selon les commentateurs juridiques.",
        "L'omnibus numérique (règlement (UE) 2026/1744, en vigueur depuis le 27 juillet 2026) a décalé les échéances : les obligations à haut risque de l'annexe III s'appliquent désormais à partir du 2 décembre 2027. Les organismes de recherche et du patrimoine gardent leur exception propre (art. 3)."],
        do: "Si vous êtes un musée ou un organisme de recherche, notez que l'art. 3 vous autorise aussi la fouille de textes à des fins de recherche.",
        quiz: { q: "Le code de bonnes pratiques est-il obligatoire ?", o: ["Non, il est volontaire", "Oui, pour tous", "Seulement en Allemagne"], a: 0, why: "Les signataires s'engagent volontairement." }, try: "bots" },
      { id: "t12-3", t: "Mesurer en respectant la vie privée", conf: "D", cards: [
        "Les cookies de mesure exigent en général un consentement préalable (Allemagne : § 25 TDDDG ; France : lignes directrices de la CNIL). Les journaux serveur peuvent contenir des données personnelles au sens du RGPD.",
        "Ne chargez la mesure d'audience qu'après consentement et mentionnez-la dans votre politique de confidentialité.",
        "Pour analyser les robots, raccourcissez les adresses IP des humains : seul le trafic des robots vous intéresse."],
        do: "Vérifiez que votre outil de mesure ne se charge qu'après consentement.",
        quiz: { q: "Les cookies de mesure exigent-ils un consentement dans l'UE ?", o: ["En général oui", "Jamais", "Seulement pour les boutiques"], a: 0, why: "Les règles ePrivacy (par ex. § 25 TDDDG) exigent un consentement pour les cookies non essentiels." }, try: "audit" },
      { id: "t12-4", t: "Le droit de l'accessibilité comme allié", conf: "D", cards: [
        "L'Acte européen sur l'accessibilité s'applique depuis le 28 juin 2025 à certains services comme le commerce en ligne, la banque et la billetterie (Allemagne : BFSG). Les microentreprises de services sont exemptées ; les organismes publics relèvent d'une directive propre.",
        "Les pages accessibles ont des alternatives textuelles, des étiquettes et une structure claire.",
        "Que cela facilite aussi la lecture par l'IA est plausible mais non prouvé."],
        do: "Passez une page clé dans un outil d'accessibilité et corrigez les trois principaux problèmes.",
        quiz: { q: "Depuis quand s'applique l'Acte européen sur l'accessibilité ?", o: ["28 juin 2025", "1er janvier 2020", "Pas encore"], a: 0, why: "La directive (UE) 2019/882 s'applique à partir du 28 juin 2025." }, try: "audit" },
      { id: "t12-5", t: "Mentions légales et marketing honnête", conf: "D", cards: [
        "En Allemagne, les mentions du fournisseur (Impressum) relèvent du § 5 DDG depuis mai 2024. Des mentions complètes donnent aussi une source unique pour votre nom légal et votre adresse.",
        "Les faux avis sont interdits dans l'UE et aux États-Unis. La publicité déguisée enfreint le droit de la consommation.",
        "L'honnêteté est aussi du bon GEO : les assistants répètent ce qui est cohérent et vérifiable."],
        do: "Vérifiez que vos mentions légales sont complètes et correspondent à votre fiche d'établissement.",
        quiz: { q: "Quelle loi régit aujourd'hui l'Impressum allemand ?", o: ["§ 5 DDG", "§ 5 TMG", "Art. 5 du RGPD"], a: 0, why: "La loi sur les services numériques (DDG) a remplacé le § 5 TMG en mai 2024." }, try: "audit" }
    ] },
    { id: "t13", icon: "sparkles", t: "Nouveau en novembre 2026", d: "Deuxième recherche : ce qui a changé et ce que nous avons corrigé.", lessons: [
      { id: "t13-1", t: "Un refus commun de l'entraînement de l'IA", conf: "D", cards: [
        "Le 30 octobre 2026, Google, OpenAI, Microsoft et Anthropic ont soutenu un même jeton robots.txt pour l'entraînement de l'IA : « User-agent: __usage_ai-training », issu des travaux AIPREF de l'IETF.",
        "Il n'est pas encore actif : Google vise début 2027, Microsoft le 1er février 2027, OpenAI « dans les prochains mois ». D'ici là, continuez à nommer chaque robot d'entraînement.",
        "Attention : Google lit ce jeton comme Google-Extended, qui couvre aussi l'ancrage dans l'application Gemini. Il ne contrôle ni les Aperçus IA ni le mode IA : c'est le rôle du réglage de la Search Console."],
        do: "Notez un rappel pour février 2027 : consulter la documentation des robots de Google et Bing et décider d'ajouter ou non le jeton commun.",
        quiz: { q: "En 2027, vous ajoutez le jeton commun sans mentionner Google-Extended. Que fait Google ?", o: ["Le traite comme un blocage de Google-Extended, ancrage Gemini compris", "Vous retire des Aperçus IA", "L'ignore pour toujours"], a: 0, why: "Google associe le jeton commun à Google-Extended, qui régit aussi l'ancrage dans l'application Gemini." }, try: "bots" },
      { id: "t13-2", t: "Cloudflare : « Block » touche désormais la recherche", conf: "D", cards: [
        "Depuis le 15 septembre 2026, les réglages « Block » et « Block on pages with ads » de Cloudflare s'appliquent aux robots à usage mixte, dont Googlebot, Bingbot et Applebot.",
        "Activer « Block » peut donc vous retirer discrètement de la recherche Google et Bing, pas seulement de l'entraînement de l'IA.",
        "Pour refuser l'entraînement en restant dans la recherche, Cloudflare a ajouté « Disallow AI Training » ; Apple, Google et Microsoft sont désignés comme robots « Accountable », toujours autorisés pour la recherche."],
        do: "Si vous utilisez Cloudflare, ouvrez les réglages des robots IA et vérifiez que « Block » n'est activé que si vous le voulez. Pour refuser seulement l'entraînement : « Disallow AI Training ».",
        quiz: { q: "Un site Cloudflare a activé « Block » pour les robots IA après le 15 septembre 2026. Et Googlebot ?", o: ["Bloqué aussi", "Non concerné", "Bloqué seulement sur les pages sans publicité"], a: 0, why: "Cloudflare : « Block » s'applique désormais aux robots à usage mixte, dont Googlebot, Bingbot et Applebot." }, try: "audit" },
      { id: "t13-3", t: "Le robots.txt devant les tribunaux", conf: "D", cards: [
        "États-Unis : dans le contentieux sur le droit d'auteur contre OpenAI (S.D.N.Y., 15 décembre 2025), le juge Stein a estimé que robots.txt n'est pas un contrôle d'accès au sens du DMCA, le comparant à un panneau « pelouse interdite ».",
        "UE : une réserve lisible par machine compte pour l'exception de fouille de textes et de données (OLG Hambourg, décembre 2025). La Cour fédérale de justice allemande a examiné l'appel le 3 septembre 2026 ; pas encore de décision.",
        "À retenir : techniquement, robots.txt est une demande, mais dans l'UE il peut être votre réserve juridique. Utilisez-le en connaissance de cause et gardez une trace datée."],
        do: "Enregistrez une copie datée de votre robots.txt à chaque modification.",
        quiz: { q: "Selon le jugement américain sur OpenAI (décembre 2025), qu'est-ce que robots.txt ?", o: ["Une demande, pas un contrôle d'accès", "Un contrat contraignant", "Une mention de droit d'auteur"], a: 0, why: "Le tribunal a jugé qu'ignorer robots.txt n'est pas un contournement au sens du DMCA." }, try: "bots" },
      { id: "t13-4", t: "Afrique du Nord et Golfe", conf: "D", cards: [
        "La nouvelle loi saoudienne sur le droit d'auteur (en vigueur depuis le 12 août 2026) autorise expressément la copie d'œuvres publiées légalement pour développer l'IA, sans autorisation ni paiement (art. 26-4). Republier ou exploiter directement ces œuvres reste interdit.",
        "Données personnelles : la PDPL saoudienne est pleinement appliquée depuis septembre 2024. La PDPL des Émirats est en vigueur, mais son règlement d'application n'était pas publié mi-2026. Tunisie : la loi organique 2004-63 s'applique toujours ; le projet de réforme 095/2025 est en commission, non adopté.",
        "Aucune règle propre aux faux avis n'a été trouvée en Tunisie, au Maroc, en Égypte, aux Émirats ni en Arabie saoudite, mais les lois générales sur la publicité trompeuse et la consommation s'appliquent. La police de Dubaï a signalé en octobre 2026 des commerces publiant de faux avis."],
        do: "Ajoutez une politique de confidentialité claire qui nomme la loi applicable (par exemple la loi organique tunisienne 2004-63) et une adresse de contact.",
        quiz: { q: "Quel pays a une exception explicite au droit d'auteur pour l'entraînement de l'IA (novembre 2026) ?", o: ["L'Arabie saoudite", "Les Émirats arabes unis", "La Tunisie"], a: 0, why: "Loi saoudienne sur le droit d'auteur 2026, art. 26-4, en vigueur depuis le 12 août 2026." }, try: "audit" },
      { id: "t13-5", t: "Clics et citations : les dernières données", conf: "E", cards: [
        "Seer Interactive (mise à jour 2026, 53 marques, 5,47 millions de requêtes) : le taux de clic organique sur les requêtes avec Aperçu IA est remonté de 1,31 % (déc. 2025) à 2,36 % (févr. 2026), toujours sous les 3,82 % des requêtes sans Aperçu IA.",
        "Être cité dans l'Aperçu IA a apporté environ 120 % de clics organiques en plus par impression par rapport aux pages non citées. Seer précise ne pas pouvoir établir de causalité.",
        "Ahrefs (octobre 2026, 66,6 millions de réponses de ChatGPT) : les citations de Reddit et Wikipédia ont fortement baissé dans les réponses américaines, tandis que les sources primaires comme PubMed et les sites de marques progressaient. D'autres jeux de données divergent : mesurez votre propre taux d'apparition."],
        do: "Vérifiez si votre page clé est citée dans l'Aperçu IA de Google pour votre question principale. Sinon, comparez-la aux pages citées.",
        quiz: { q: "Selon la mise à jour 2026 de Seer, être cité dans un Aperçu IA aide-t-il ?", o: ["Oui : environ 120 % de clics organiques en plus par impression", "Aucune différence", "Cela réduit les clics"], a: 0, why: "Seer : les pages citées ont obtenu environ +120 % par rapport aux non citées, mais environ −38 % par rapport aux requêtes sans Aperçu IA." }, try: "ask" }
    ] }
  ],
  facts: [
    { s: "Bloquer GPTBot vous retire de la recherche ChatGPT.", f: false, why: "GPTBot sert à l'entraînement. La recherche ChatGPT dépend d'OAI-SearchBot." },
    { s: "Bloquer Google-Extended vous retire des Aperçus IA.", f: false, why: "Les Aperçus IA dépendent de Googlebot et des règles d'extraits, pas de Google-Extended." },
    { s: "La recherche Google ignore llms.txt.", f: true, why: "Google : ces fichiers n'aident ni ne nuisent à la visibilité dans la recherche Google." },
    { s: "Le schema FAQ donne toujours des menus dépliants dans Google.", f: false, why: "Les résultats enrichis FAQ n'apparaissent plus depuis le 7 mai 2026." },
    { s: "Un outil peut vous donner votre position exacte dans ChatGPT.", f: false, why: "Les réponses changent presque à chaque essai ; seuls les taux d'apparition ont du sens." },
    { s: "Copilot cite des sources issues de Bing.", f: true, why: "Le rapport AI Performance de Bing couvre les citations de Copilot." },
    { s: "Le bourrage de mots-clés aide l'IA à vous citer.", f: false, why: "Dans l'étude GEO, il a fait moins bien que ne rien changer." },
    { s: "Les publications publiques des comptes Instagram professionnels peuvent apparaître dans Google.", f: true, why: "Depuis le 10 juillet 2025, pour les comptes professionnels publics d'adultes." },
    { s: "Acheter des avis est légal s'ils semblent authentiques.", f: false, why: "Interdit par la règle de la FTC (2024) et la directive Omnibus (2022)." },
    { s: "La Search Console montre les impressions IA depuis 2026.", f: true, why: "Les rapports d'IA générative sont lancés depuis juin 2026, partout depuis le 31 août 2026." },
    { s: "robots.txt est un verrou technique qui arrête tous les robots.", f: false, why: "C'est une norme volontaire ; certaines récupérations à la demande peuvent ne pas la suivre." },
    { s: "Votre CDN peut bloquer les robots IA même si robots.txt les autorise.", f: true, why: "Google cite la vérification du CDN et de l'hébergement parmi les bonnes pratiques." },
    { s: "Le réglage « Block AI bots » de Cloudflare peut aussi bloquer Googlebot.", f: true, why: "Depuis le 15 septembre 2026, il s'applique aux robots à usage mixte, dont Googlebot, Bingbot et Applebot." },
    { s: "Aux États-Unis, robots.txt est un contrôle d'accès au sens du DMCA.", f: false, why: "Contentieux contre OpenAI (S.D.N.Y., déc. 2025) : ignorer robots.txt n'est pas un contournement." },
    { s: "L'Arabie saoudite autorise la copie d'œuvres publiées légalement pour développer l'IA.", f: true, why: "Loi sur le droit d'auteur 2026, art. 26-4, en vigueur depuis le 12 août 2026." }
  ],
  ui: {
    conf: { D: "Documenté", E: "Fondé sur des études", OD: "Débat ouvert" },
    confD: { D: "Source officielle ou primaire.", E: "Étude sérieuse ; voir ses limites.", OD: "Non clairement prouvé : les deux positions sont présentées." },
    do: "À faire maintenant", doDone: "Fait", sources: "Sources", checked: "État de la recherche", review: "Revoir vos erreurs", reviewD: "{n} questions manquées", reviewNone: "Rien à revoir : bravo.", mins: "2 min · 3 cartes · quiz",
    trySocial: "Ouvrez un de vos comptes avec le panneau Sada ouvert."
  }
};
