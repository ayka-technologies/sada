// Sada · which website system runs this site, and where to make each fix in it.
// Detection reads only the page HTML Sada already has. Menu names can differ
// by version and interface language; the guide says so.

export function detectCms(html, url = "") {
  const h = String(html || "").slice(0, 400000);
  const gen = (/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i.exec(h) || /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']generator["']/i.exec(h) || [])[1] || "";
  const t = (re) => re.test(h) || re.test(gen);
  if (/wordpress/i.test(gen) || /\/wp-content\/|\/wp-includes\/|wp-json/i.test(h)) return "wordpress";
  if (/wix\.com|wixstatic\.com|_wixCssImports|X-Wix/i.test(h) || /wix/i.test(gen)) return "wix";
  if (/cdn\.shopify\.com|Shopify\.theme|shopify-section/i.test(h)) return "shopify";
  if (/squarespace/i.test(gen) || /static1\.squarespace\.com|Static\.SQUARESPACE_CONTEXT/i.test(h)) return "squarespace";
  if (/jimdo/i.test(gen) || /jimdo(cdn|site|free)?\.com|jimstatic\.com/i.test(h)) return "jimdo";
  if (t(/TYPO3/i) || /\/typo3conf\/|\/typo3temp\/|_assets\/[0-9a-f]{32}\//i.test(h)) return "typo3";
  if (/data-wf-site|webflow\.js|assets\.website-files\.com|cdn\.prod\.website-files\.com/i.test(h) || /webflow/i.test(gen)) return "webflow";
  if (/joomla/i.test(gen) || /\/media\/jui\/|\/media\/system\/js\/|joomla-script-options/i.test(h)) return "joomla";
  if (/drupal/i.test(gen) || /drupal-settings-json|\/sites\/default\/files\/|Drupal\.settings/i.test(h)) return "drupal";
  if (/ghost/i.test(gen) || /ghost-(portal|search)|\/ghost\/api\//i.test(h)) return "ghost";
  if (/weebly/i.test(h) || /editmysite\.com/i.test(h)) return "weebly";
  if (/img1\.wsimg\.com|godaddy/i.test(h) || /Website Builder/i.test(gen)) return "godaddy";
  return "";
}

export const CMS_NAME = { wordpress: "WordPress", wix: "Wix", shopify: "Shopify", squarespace: "Squarespace", jimdo: "Jimdo", typo3: "TYPO3", webflow: "Webflow", joomla: "Joomla", drupal: "Drupal", ghost: "Ghost", weebly: "Weebly", godaddy: "GoDaddy Website Builder", "": "" };

export function cmsAdmin(id, origin) {
  switch (id) {
    case "wordpress": return origin + "/wp-admin/";
    case "typo3": return origin + "/typo3/";
    case "joomla": return origin + "/administrator/";
    case "drupal": return origin + "/user/login";
    case "ghost": return origin + "/ghost/";
    case "wix": return "https://manage.wix.com/";
    case "shopify": return "https://admin.shopify.com/";
    case "squarespace": return "https://account.squarespace.com/";
    case "webflow": return "https://webflow.com/dashboard";
    default: return "";
  }
}

// Four tasks: meta = page title and description · code = add the JSON-LD block to <head>
// robots = robots.txt / llms.txt · social = links to your channels on the site
const G = {
  en: {
    wordpress: {
      meta: "Edit the page, then open the SEO box of your SEO plugin (Yoast SEO, Rank Math or similar) below the editor: set the SEO title and meta description.",
      code: "Use your SEO plugin's schema settings, or a header-code plugin (for example WPCode) to paste the JSON-LD block into the <head> of all pages.",
      robots: "Yoast: Yoast SEO → Tools → File editor. Rank Math: General Settings → Edit robots.txt. Upload llms.txt to the main folder with your host's file manager.",
      social: "Yoast: Settings → Site representation → Other profiles. Also add the links to your footer menu or a Social Icons block."
    },
    wix: {
      meta: "Pages menu → ⋯ next to the page → SEO basics: title and meta description.",
      code: "Page → SEO → Advanced SEO → Structured data markup: paste the JSON-LD without the <script> tags.",
      robots: "Dashboard → Marketing & SEO → SEO → Robots.txt editor. Wix does not let you upload your own llms.txt file.",
      social: "Add a Social Bar element in the editor and enter each channel's link."
    },
    shopify: {
      meta: "Open the page, product or collection → Search engine listing → Edit. Home page: Online Store → Preferences.",
      code: "Online Store → Themes → ⋯ → Edit code → layout/theme.liquid: paste the JSON-LD before </head>. Make a theme copy first.",
      robots: "Edit code → Add a new template → robots.txt (robots.txt.liquid). Shopify recommends changing it only if you know the rules.",
      social: "Online Store → Themes → Customize → Theme settings → Social media: enter each channel's link."
    },
    squarespace: {
      meta: "Pages → gear icon next to the page → SEO tab: title and description. Site-wide: Marketing → SEO.",
      code: "Settings → Developer tools → Code injection → Header (available on Business plans and higher).",
      robots: "Squarespace manages robots.txt itself; under Settings → Crawlers you can block AI crawlers or search engines. Do not block search crawlers.",
      social: "Settings → Social links: add each channel; many templates show them in the header or footer."
    },
    jimdo: {
      meta: "Open the page's SEO settings (Settings → SEO in Jimdo Creator) and set title and description.",
      code: "Jimdo Creator: Settings → Edit head (paid plans). The newer Jimdo builder may not allow your own code; then ask Jimdo support.",
      robots: "Jimdo generates robots.txt itself; it cannot be edited. Check that pages are not hidden from search engines in the SEO settings.",
      social: "Add a social media element (Share/Social buttons) to the footer or a page and enter each channel's link."
    },
    typo3: {
      meta: "Page module → edit page properties → SEO tab: title for search engines and description.",
      code: "Ask your integrator to add the JSON-LD with TypoScript (page.headerData) or a schema extension. Changes need admin rights.",
      robots: "Sites module → edit site configuration → Static Routes: add robots.txt (and llms.txt) as static text.",
      social: "Edit the footer content element or the site package's footer template and add each channel's link."
    },
    webflow: {
      meta: "Pages panel → gear icon next to the page → SEO settings: title tag and meta description.",
      code: "Page settings → Custom code → Inside <head> tag (or Site settings → Custom code for all pages), then publish.",
      robots: "Site settings → SEO → Indexing → robots.txt. Host llms.txt only if your plan allows file hosting; otherwise skip it.",
      social: "Add link blocks with the channels' URLs to your footer symbol (component) and publish."
    },
    joomla: {
      meta: "Menus → the menu item → Metadata tab (and Articles → Publishing tab → Meta description).",
      code: "Joomla 5 has built-in Schema.org plugins (System → Plugins → Schema.org). For a custom block use a head-code extension or the template.",
      robots: "robots.txt is a file in the main folder: edit it with your host's file manager or FTP. Put llms.txt next to it.",
      social: "Add a custom module in the footer position with each channel's link."
    },
    drupal: {
      meta: "Install the Metatag module, then set title and description per content type and per page.",
      code: "Use the Schema.org Metatag module, or ask your developer to add the JSON-LD in the theme's html.html.twig.",
      robots: "Edit robots.txt in the main folder, or use the RobotsTxt module to edit it in the admin. Put llms.txt next to it.",
      social: "Add a custom block in the footer region with each channel's link."
    },
    ghost: {
      meta: "Post or page → settings (gear) → Meta data. Site-wide: Settings → General → Meta data.",
      code: "Settings → Code injection → Site header.",
      robots: "Add a robots.txt file to your theme and upload the theme again (Settings → Design).",
      social: "Settings → General → Social accounts (Facebook and X); add other channels to the footer navigation."
    },
    weebly: {
      meta: "Pages → the page → SEO settings: page title and description.",
      code: "Settings → SEO → Header code.",
      robots: "Weebly generates robots.txt; you can hide single pages from search engines in the page's SEO settings.",
      social: "Drag the Social Icons element into the footer and enter each channel's link."
    },
    godaddy: {
      meta: "Edit website → Settings → Search engine optimisation (SEO), or the page settings.",
      code: "Add an HTML section only where the builder allows it; structured data in <head> may not be possible. Ask GoDaddy support.",
      robots: "The builder manages robots.txt itself.",
      social: "Settings → Social media links: add each channel."
    },
    "": {
      meta: "In your website system, open the page's SEO or page settings: set the page title (about 50–60 characters) and a meta description (about 140–160 characters).",
      code: "Add the JSON-LD block inside <head> of every page, usually in the theme or template's header area, or in a 'custom code' setting.",
      robots: "robots.txt and llms.txt must be at the root of your domain (for example example.org/robots.txt). Ask your host or web agency if you cannot upload files.",
      social: "Put links to all your channels in the footer of every page."
    }
  },
  de: {
    wordpress: {
      meta: "Seite bearbeiten, dann unter dem Editor die Box Ihres SEO-Plugins öffnen (Yoast SEO, Rank Math o. Ä.): SEO-Titel und Meta-Beschreibung eintragen.",
      code: "Schema-Einstellungen Ihres SEO-Plugins nutzen oder ein Header-Code-Plugin (z. B. WPCode), um den JSON-LD-Block in den <head> aller Seiten einzufügen.",
      robots: "Yoast: Yoast SEO → Werkzeuge → Datei-Editor. Rank Math: Allgemeine Einstellungen → robots.txt bearbeiten. llms.txt mit dem Dateimanager Ihres Hosters in den Hauptordner laden.",
      social: "Yoast: Einstellungen → Website-Darstellung → Andere Profile. Die Links zusätzlich ins Footer-Menü oder in einen Social-Icons-Block setzen."
    },
    wix: {
      meta: "Menü Seiten → ⋯ neben der Seite → SEO-Grundlagen: Titel und Meta-Beschreibung.",
      code: "Seite → SEO → Erweitertes SEO → Strukturierte Daten: JSON-LD ohne die <script>-Tags einfügen.",
      robots: "Dashboard → Marketing & SEO → SEO → Robots.txt-Editor. Eine eigene llms.txt-Datei lässt Wix nicht zu.",
      social: "Im Editor ein Social-Bar-Element einfügen und die Links der Kanäle eintragen."
    },
    shopify: {
      meta: "Seite, Produkt oder Kollektion öffnen → Suchmaschinen-Eintrag → Bearbeiten. Startseite: Onlineshop → Einstellungen.",
      code: "Onlineshop → Themes → ⋯ → Code bearbeiten → layout/theme.liquid: JSON-LD vor </head> einfügen. Vorher eine Theme-Kopie anlegen.",
      robots: "Code bearbeiten → Neue Vorlage hinzufügen → robots.txt (robots.txt.liquid). Shopify rät, nur mit Kenntnis der Regeln zu ändern.",
      social: "Onlineshop → Themes → Anpassen → Theme-Einstellungen → Social Media: Links der Kanäle eintragen."
    },
    squarespace: {
      meta: "Seiten → Zahnrad neben der Seite → Reiter SEO: Titel und Beschreibung. Für die ganze Website: Marketing → SEO.",
      code: "Einstellungen → Entwicklertools → Code-Injektion → Header (ab Business-Tarif).",
      robots: "Squarespace verwaltet die robots.txt selbst; unter Einstellungen → Crawler lassen sich KI-Crawler oder Suchmaschinen sperren. Suchmaschinen-Crawler nicht sperren.",
      social: "Einstellungen → Social-Media-Links: jeden Kanal eintragen; viele Vorlagen zeigen sie im Header oder Footer."
    },
    jimdo: {
      meta: "SEO-Einstellungen der Seite öffnen (in Jimdo Creator: Einstellungen → SEO) und Titel und Beschreibung setzen.",
      code: "Jimdo Creator: Einstellungen → Head bearbeiten (bezahlte Tarife). Der neuere Jimdo-Baukasten erlaubt eigenen Code eventuell nicht; dann beim Jimdo-Support nachfragen.",
      robots: "Jimdo erzeugt die robots.txt selbst; sie ist nicht bearbeitbar. In den SEO-Einstellungen prüfen, dass Seiten nicht vor Suchmaschinen verborgen sind.",
      social: "Ein Social-Media-Element (Teilen-/Social-Buttons) in Footer oder Seite einfügen und die Links eintragen."
    },
    typo3: {
      meta: "Modul Seite → Seiteneigenschaften bearbeiten → Reiter SEO: Titel für Suchmaschinen und Beschreibung.",
      code: "Ihre Agentur kann das JSON-LD per TypoScript (page.headerData) oder mit einer Schema-Extension einbinden. Dafür sind Admin-Rechte nötig.",
      robots: "Modul Sites → Site-Konfiguration bearbeiten → Static Routes: robots.txt (und llms.txt) als statischen Text anlegen.",
      social: "Footer-Inhaltselement oder Footer-Template des Sitepackages bearbeiten und die Links der Kanäle ergänzen."
    },
    webflow: {
      meta: "Pages-Panel → Zahnrad neben der Seite → SEO-Einstellungen: Title-Tag und Meta-Beschreibung.",
      code: "Seiteneinstellungen → Custom Code → Inside <head> tag (oder Site-Einstellungen → Custom Code für alle Seiten), dann veröffentlichen.",
      robots: "Site-Einstellungen → SEO → Indexing → robots.txt. llms.txt nur hosten, wenn Ihr Tarif Dateien erlaubt; sonst weglassen.",
      social: "Link-Blöcke mit den Kanal-URLs ins Footer-Symbol (Komponente) setzen und veröffentlichen."
    },
    joomla: {
      meta: "Menüs → Menüeintrag → Reiter Metadaten (und Beiträge → Reiter Veröffentlichung → Meta-Beschreibung).",
      code: "Joomla 5 hat eingebaute Schema.org-Plugins (System → Plugins → Schema.org). Für einen eigenen Block eine Head-Code-Erweiterung oder das Template nutzen.",
      robots: "robots.txt ist eine Datei im Hauptordner: mit dem Dateimanager des Hosters oder per FTP bearbeiten. llms.txt daneben ablegen.",
      social: "Ein eigenes Modul in der Footer-Position mit den Links der Kanäle anlegen."
    },
    drupal: {
      meta: "Modul Metatag installieren, dann Titel und Beschreibung pro Inhaltstyp und pro Seite setzen.",
      code: "Modul Schema.org Metatag nutzen oder Ihre Entwickler das JSON-LD in html.html.twig des Themes einfügen lassen.",
      robots: "robots.txt im Hauptordner bearbeiten oder das Modul RobotsTxt nutzen. llms.txt daneben ablegen.",
      social: "Einen eigenen Block in der Footer-Region mit den Links der Kanäle anlegen."
    },
    ghost: {
      meta: "Beitrag oder Seite → Einstellungen (Zahnrad) → Meta data. Für die Website: Settings → General → Meta data.",
      code: "Settings → Code injection → Site header.",
      robots: "Eine robots.txt-Datei ins Theme legen und das Theme neu hochladen (Settings → Design).",
      social: "Settings → General → Social accounts (Facebook und X); weitere Kanäle in die Footer-Navigation."
    },
    weebly: {
      meta: "Seiten → Seite → SEO-Einstellungen: Seitentitel und Beschreibung.",
      code: "Einstellungen → SEO → Header-Code.",
      robots: "Weebly erzeugt die robots.txt selbst; einzelne Seiten lassen sich in den SEO-Einstellungen vor Suchmaschinen verbergen.",
      social: "Element Social Icons in den Footer ziehen und die Links eintragen."
    },
    godaddy: {
      meta: "Website bearbeiten → Einstellungen → Suchmaschinenoptimierung (SEO) oder die Seiteneinstellungen.",
      code: "Einen HTML-Abschnitt nur dort einfügen, wo der Baukasten es zulässt; strukturierte Daten im <head> sind evtl. nicht möglich. Beim GoDaddy-Support nachfragen.",
      robots: "Der Baukasten verwaltet die robots.txt selbst.",
      social: "Einstellungen → Social-Media-Links: jeden Kanal eintragen."
    },
    "": {
      meta: "Im Website-System die SEO- oder Seiteneinstellungen öffnen: Seitentitel (ca. 50–60 Zeichen) und Meta-Beschreibung (ca. 140–160 Zeichen) setzen.",
      code: "Den JSON-LD-Block in den <head> jeder Seite einfügen, meist im Header-Bereich des Themes/Templates oder in einer Einstellung für eigenen Code.",
      robots: "robots.txt und llms.txt müssen im Stamm der Domain liegen (z. B. beispiel.de/robots.txt). Können Sie keine Dateien hochladen, fragen Sie Ihren Hoster oder Ihre Agentur.",
      social: "Links zu allen Kanälen in den Footer jeder Seite setzen."
    }
  },
  fr: {
    wordpress: {
      meta: "Modifiez la page, puis ouvrez sous l'éditeur le bloc de votre extension SEO (Yoast SEO, Rank Math…) : titre SEO et méta-description.",
      code: "Utilisez les réglages schema de votre extension SEO, ou une extension de code d'en-tête (par exemple WPCode) pour coller le bloc JSON-LD dans le <head> de toutes les pages.",
      robots: "Yoast : Yoast SEO → Outils → Éditeur de fichiers. Rank Math : Réglages généraux → Modifier robots.txt. Déposez llms.txt à la racine avec le gestionnaire de fichiers de votre hébergeur.",
      social: "Yoast : Réglages → Représentation du site → Autres profils. Ajoutez aussi les liens au menu du pied de page ou à un bloc Icônes sociales."
    },
    wix: {
      meta: "Menu Pages → ⋯ à côté de la page → Bases du SEO : titre et méta-description.",
      code: "Page → SEO → SEO avancé → Balisage des données structurées : collez le JSON-LD sans les balises <script>.",
      robots: "Tableau de bord → Marketing et SEO → SEO → Éditeur robots.txt. Wix ne permet pas de déposer votre propre fichier llms.txt.",
      social: "Ajoutez un élément Barre sociale dans l'éditeur et saisissez le lien de chaque chaîne."
    },
    shopify: {
      meta: "Ouvrez la page, le produit ou la collection → Aperçu de la liste des moteurs de recherche → Modifier. Accueil : Boutique en ligne → Préférences.",
      code: "Boutique en ligne → Thèmes → ⋯ → Modifier le code → layout/theme.liquid : collez le JSON-LD avant </head>. Dupliquez le thème avant.",
      robots: "Modifier le code → Ajouter un modèle → robots.txt (robots.txt.liquid). Shopify conseille de ne le modifier qu'en connaissant les règles.",
      social: "Boutique en ligne → Thèmes → Personnaliser → Paramètres du thème → Réseaux sociaux : saisissez chaque lien."
    },
    squarespace: {
      meta: "Pages → roue dentée à côté de la page → onglet SEO : titre et description. Pour tout le site : Marketing → SEO.",
      code: "Paramètres → Outils pour développeurs → Injection de code → En-tête (forfaits Business et plus).",
      robots: "Squarespace gère robots.txt lui-même ; dans Paramètres → Robots d'exploration, vous pouvez bloquer les robots IA ou les moteurs. Ne bloquez pas les moteurs de recherche.",
      social: "Paramètres → Liens vers les réseaux sociaux : ajoutez chaque chaîne ; beaucoup de modèles les affichent en en-tête ou en pied de page."
    },
    jimdo: {
      meta: "Ouvrez les réglages SEO de la page (Jimdo Creator : Paramètres → SEO) et saisissez titre et description.",
      code: "Jimdo Creator : Paramètres → Modifier l'en-tête (forfaits payants). Le nouvel éditeur Jimdo peut ne pas accepter de code ; demandez alors au support Jimdo.",
      robots: "Jimdo génère robots.txt lui-même ; il n'est pas modifiable. Vérifiez dans les réglages SEO qu'aucune page n'est masquée aux moteurs.",
      social: "Ajoutez un élément réseaux sociaux (boutons de partage) au pied de page ou à une page avec le lien de chaque chaîne."
    },
    typo3: {
      meta: "Module Page → modifier les propriétés de la page → onglet SEO : titre pour les moteurs et description.",
      code: "Votre intégrateur peut ajouter le JSON-LD via TypoScript (page.headerData) ou une extension schema. Il faut des droits administrateur.",
      robots: "Module Sites → modifier la configuration du site → Static Routes : ajoutez robots.txt (et llms.txt) en texte statique.",
      social: "Modifiez l'élément de contenu du pied de page ou le modèle du site package et ajoutez le lien de chaque chaîne."
    },
    webflow: {
      meta: "Panneau Pages → roue dentée à côté de la page → réglages SEO : balise title et méta-description.",
      code: "Réglages de la page → Custom code → Inside <head> tag (ou Réglages du site → Custom code pour toutes les pages), puis publiez.",
      robots: "Réglages du site → SEO → Indexing → robots.txt. N'hébergez llms.txt que si votre forfait permet d'héberger des fichiers.",
      social: "Ajoutez des blocs de liens vers vos chaînes dans le symbole (composant) du pied de page, puis publiez."
    },
    joomla: {
      meta: "Menus → l'élément de menu → onglet Métadonnées (et Articles → onglet Publication → Méta-description).",
      code: "Joomla 5 a des plugins Schema.org intégrés (Système → Plugins → Schema.org). Pour un bloc libre, utilisez une extension de code d'en-tête ou le template.",
      robots: "robots.txt est un fichier à la racine : modifiez-le via le gestionnaire de fichiers de l'hébergeur ou en FTP. Déposez llms.txt à côté.",
      social: "Créez un module personnalisé en position pied de page avec le lien de chaque chaîne."
    },
    drupal: {
      meta: "Installez le module Metatag, puis réglez titre et description par type de contenu et par page.",
      code: "Utilisez le module Schema.org Metatag, ou faites ajouter le JSON-LD dans html.html.twig du thème.",
      robots: "Modifiez robots.txt à la racine ou utilisez le module RobotsTxt. Déposez llms.txt à côté.",
      social: "Créez un bloc personnalisé dans la région pied de page avec le lien de chaque chaîne."
    },
    ghost: {
      meta: "Article ou page → réglages (roue dentée) → Meta data. Pour le site : Settings → General → Meta data.",
      code: "Settings → Code injection → Site header.",
      robots: "Ajoutez un fichier robots.txt à votre thème et téléversez le thème (Settings → Design).",
      social: "Settings → General → Social accounts (Facebook et X) ; ajoutez les autres chaînes à la navigation du pied de page."
    },
    weebly: {
      meta: "Pages → la page → réglages SEO : titre et description.",
      code: "Paramètres → SEO → Code d'en-tête.",
      robots: "Weebly génère robots.txt ; vous pouvez masquer une page aux moteurs dans ses réglages SEO.",
      social: "Glissez l'élément Icônes sociales dans le pied de page et saisissez chaque lien."
    },
    godaddy: {
      meta: "Modifier le site → Paramètres → Optimisation pour les moteurs de recherche (SEO), ou réglages de la page.",
      code: "Ajoutez une section HTML seulement là où l'éditeur le permet ; les données structurées dans le <head> peuvent être impossibles. Demandez au support GoDaddy.",
      robots: "L'éditeur gère robots.txt lui-même.",
      social: "Paramètres → Liens vers les réseaux sociaux : ajoutez chaque chaîne."
    },
    "": {
      meta: "Dans votre outil de site, ouvrez les réglages SEO ou de page : titre (environ 50–60 caractères) et méta-description (environ 140–160 caractères).",
      code: "Ajoutez le bloc JSON-LD dans le <head> de chaque page, en général dans l'en-tête du thème ou un réglage « code personnalisé ».",
      robots: "robots.txt et llms.txt doivent être à la racine du domaine (par exemple exemple.fr/robots.txt). Demandez à votre hébergeur ou agence si vous ne pouvez pas déposer de fichiers.",
      social: "Mettez les liens de toutes vos chaînes dans le pied de page de chaque page."
    }
  },
  ar: {
    wordpress: {
      meta: "حرّر الصفحة ثم افتح تحت المحرر مربع إضافة SEO لديك (Yoast SEO أو Rank Math أو غيرهما): عنوان SEO والوصف التعريفي.",
      code: "استخدم إعدادات Schema في إضافة SEO، أو إضافة لشيفرة الترويسة (مثل WPCode) للصق كتلة JSON-LD داخل <head> في كل الصفحات.",
      robots: "Yoast: ‏Yoast SEO ← الأدوات ← محرر الملفات. Rank Math: الإعدادات العامة ← تحرير robots.txt. ارفع llms.txt إلى المجلد الرئيسي عبر مدير ملفات الاستضافة.",
      social: "Yoast: الإعدادات ← تمثيل الموقع ← ملفات تعريف أخرى. وأضف الروابط أيضًا إلى قائمة التذييل أو كتلة أيقونات التواصل."
    },
    wix: {
      meta: "قائمة الصفحات ← ⋯ بجانب الصفحة ← أساسيات SEO: العنوان والوصف التعريفي.",
      code: "الصفحة ← SEO ← SEO متقدّم ← ترميز البيانات المنظّمة: الصق JSON-LD دون وسوم <script>.",
      robots: "لوحة التحكم ← التسويق وSEO ← SEO ← محرر Robots.txt. لا يسمح Wix برفع ملف llms.txt خاص بك.",
      social: "أضف عنصر شريط التواصل الاجتماعي في المحرر وأدخل رابط كل قناة."
    },
    shopify: {
      meta: "افتح الصفحة أو المنتج أو المجموعة ← قائمة محركات البحث ← تحرير. الصفحة الرئيسية: المتجر الإلكتروني ← التفضيلات.",
      code: "المتجر الإلكتروني ← القوالب ← ⋯ ← تحرير الشيفرة ← layout/theme.liquid: الصق JSON-LD قبل ‎</head>‎. أنشئ نسخة من القالب أولًا.",
      robots: "تحرير الشيفرة ← إضافة قالب جديد ← robots.txt ‏(robots.txt.liquid). تنصح Shopify بعدم تغييره إلا مع معرفة القواعد.",
      social: "المتجر الإلكتروني ← القوالب ← تخصيص ← إعدادات القالب ← وسائل التواصل: أدخل رابط كل قناة."
    },
    squarespace: {
      meta: "الصفحات ← أيقونة الترس بجانب الصفحة ← تبويب SEO: العنوان والوصف. للموقع كله: التسويق ← SEO.",
      code: "الإعدادات ← أدوات المطوّرين ← حقن الشيفرة ← الترويسة (في باقات Business وما فوق).",
      robots: "يدير Squarespace ملف robots.txt بنفسه؛ ومن الإعدادات ← الزواحف يمكنك حجب زواحف الذكاء الاصطناعي أو محركات البحث. لا تحجب محركات البحث.",
      social: "الإعدادات ← روابط التواصل: أضف كل قناة؛ وتعرضها قوالب كثيرة في الترويسة أو التذييل."
    },
    jimdo: {
      meta: "افتح إعدادات SEO للصفحة (في Jimdo Creator: الإعدادات ← SEO) وحدّد العنوان والوصف.",
      code: "Jimdo Creator: الإعدادات ← تحرير الترويسة (في الباقات المدفوعة). قد لا يسمح محرر Jimdo الأحدث بشيفرة خاصة؛ اسأل دعم Jimdo.",
      robots: "يولّد Jimdo ملف robots.txt بنفسه ولا يمكن تحريره. تحقق في إعدادات SEO من أن الصفحات غير مخفية عن محركات البحث.",
      social: "أضف عنصر وسائل التواصل (أزرار المشاركة) إلى التذييل أو إلى صفحة وأدخل رابط كل قناة."
    },
    typo3: {
      meta: "وحدة Page ← تحرير خصائص الصفحة ← تبويب SEO: العنوان لمحركات البحث والوصف.",
      code: "يمكن لمطوّر موقعك إضافة JSON-LD عبر TypoScript ‏(page.headerData) أو إضافة Schema. يتطلب ذلك صلاحيات المسؤول.",
      robots: "وحدة Sites ← تحرير إعدادات الموقع ← Static Routes: أضف robots.txt (وllms.txt) كنص ثابت.",
      social: "حرّر عنصر محتوى التذييل أو قالب التذييل في حزمة الموقع وأضف رابط كل قناة."
    },
    webflow: {
      meta: "لوحة Pages ← أيقونة الترس بجانب الصفحة ← إعدادات SEO: وسم العنوان والوصف التعريفي.",
      code: "إعدادات الصفحة ← Custom code ← Inside <head> tag (أو إعدادات الموقع ← Custom code لكل الصفحات)، ثم انشر.",
      robots: "إعدادات الموقع ← SEO ← Indexing ← robots.txt. استضف llms.txt فقط إن كانت باقتك تسمح باستضافة الملفات.",
      social: "أضف كتل روابط بعناوين القنوات إلى رمز (مكوّن) التذييل ثم انشر."
    },
    joomla: {
      meta: "القوائم ← عنصر القائمة ← تبويب البيانات الوصفية (والمقالات ← تبويب النشر ← الوصف التعريفي).",
      code: "في Joomla 5 إضافات Schema.org مدمجة (النظام ← الإضافات ← Schema.org). لكتلة خاصة استخدم امتدادًا لشيفرة الترويسة أو القالب.",
      robots: "robots.txt ملف في المجلد الرئيسي: حرّره عبر مدير ملفات الاستضافة أو FTP، وضع llms.txt بجانبه.",
      social: "أنشئ وحدة مخصّصة في موضع التذييل تتضمن رابط كل قناة."
    },
    drupal: {
      meta: "ثبّت وحدة Metatag ثم حدّد العنوان والوصف لكل نوع محتوى ولكل صفحة.",
      code: "استخدم وحدة Schema.org Metatag، أو اطلب من مطوّرك إضافة JSON-LD في html.html.twig الخاص بالقالب.",
      robots: "حرّر robots.txt في المجلد الرئيسي أو استخدم وحدة RobotsTxt، وضع llms.txt بجانبه.",
      social: "أنشئ كتلة مخصّصة في منطقة التذييل تتضمن رابط كل قناة."
    },
    ghost: {
      meta: "المقال أو الصفحة ← الإعدادات (الترس) ← Meta data. للموقع: Settings ← General ← Meta data.",
      code: "Settings ← Code injection ← Site header.",
      robots: "أضف ملف robots.txt إلى القالب وارفع القالب من جديد (Settings ← Design).",
      social: "Settings ← General ← Social accounts (فيسبوك وX)؛ وأضف القنوات الأخرى إلى روابط التذييل."
    },
    weebly: {
      meta: "الصفحات ← الصفحة ← إعدادات SEO: العنوان والوصف.",
      code: "الإعدادات ← SEO ← شيفرة الترويسة.",
      robots: "يولّد Weebly ملف robots.txt؛ ويمكن إخفاء صفحة عن محركات البحث من إعدادات SEO الخاصة بها.",
      social: "اسحب عنصر أيقونات التواصل إلى التذييل وأدخل رابط كل قناة."
    },
    godaddy: {
      meta: "تحرير الموقع ← الإعدادات ← تحسين محركات البحث (SEO)، أو إعدادات الصفحة.",
      code: "أضف قسم HTML حيث يسمح المحرر فقط؛ قد لا تكون البيانات المنظّمة داخل <head> ممكنة. اسأل دعم GoDaddy.",
      robots: "يدير المحرر ملف robots.txt بنفسه.",
      social: "الإعدادات ← روابط التواصل الاجتماعي: أضف كل قناة."
    },
    "": {
      meta: "افتح في نظام موقعك إعدادات SEO أو إعدادات الصفحة: العنوان (نحو 50–60 حرفًا) والوصف التعريفي (نحو 140–160 حرفًا).",
      code: "أضف كتلة JSON-LD داخل <head> في كل صفحة، عادةً في منطقة ترويسة القالب أو في إعداد «شيفرة مخصّصة».",
      robots: "يجب أن يكون robots.txt وllms.txt في جذر النطاق (مثل example.tn/robots.txt). إن لم تستطع رفع ملفات فاسأل الاستضافة أو وكالتك.",
      social: "ضع روابط كل قنواتك في تذييل كل صفحة."
    }
  }
};
export function cmsGuide(id, lang) {
  const L = G[lang] ? lang : "en";
  return G[L][id] || G[L][""];
}
