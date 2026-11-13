// Sada · sectors. Each subtype carries what it is called in EN/FR/DE/AR,
// so the questions read like a person wrote them (articles, plurals, gender).
//
// en: [singular, plural]                      → "a university", "universities"
// fr: [singular with article, plural, f]      → "une université", "universités", feminine
// de: [singular with article, plural, gender] → "eine Hochschule", "Hochschulen", "f"
// ar: [indefinite singular, definite plural]  → "جامعة", "الجامعات"

const B = "(?<![\\p{L}\\p{N}])";
const E = "(?![\\p{L}\\p{N}])";
const rx = (alts) => new RegExp(`${B}(?:${alts.join("|")})${E}`, "giu");

export const SUBTYPES = [
  // ── higher education
  { id: "uas", kind: "uni", re: rx(["universit(?:y|ies) of applied sciences?", "hochschulen? für angewandte wissenschaften", "fachhochschulen?", "haw", "hochschule für technik(?: und wirtschaft)?", "haute école spécialisée", "hes-so", "université des sciences appliquées", "جامعة العلوم التطبيقية"]),
    en: ["university of applied sciences", "universities of applied sciences"], fr: ["une université de sciences appliquées", "universités de sciences appliquées", 1], de: ["eine Hochschule für angewandte Wissenschaften", "Hochschulen für angewandte Wissenschaften", "f"], ar: ["جامعة للعلوم التطبيقية", "جامعات العلوم التطبيقية"] },
  { id: "university", kind: "uni", re: rx(["universit(?:y|ies)", "universität(?:en)?", "université(?:s)?", "universidad", "università", "hochschulen?", "technische universität", "business school", "école de commerce", "grande école", "school of (?:economics|management|business)", "college of (?:arts|art|design|music)", "kunsthochschule", "musikhochschule", "جامعة", "الجامعة", "كلية"]),
    en: ["university", "universities"], fr: ["une université", "universités", 1], de: ["eine Hochschule", "Hochschulen", "f"], ar: ["جامعة", "الجامعات"] },

  // ── schools and training
  { id: "language-school", kind: "school", re: rx(["language schools?", "sprachschulen?", "écoles? de langues?", "sprachkurse?", "cours de langues?", "مدرسة لغات", "معهد لغات"]),
    en: ["language school", "language schools"], fr: ["une école de langues", "écoles de langues", 1], de: ["eine Sprachschule", "Sprachschulen", "f"], ar: ["مدرسة لغات", "مدارس اللغات"] },
  { id: "driving-school", kind: "school", re: rx(["driving schools?", "fahrschulen?", "auto-écoles?", "auto école", "مدرسة تعليم السياقة", "مدرسة قيادة"]),
    en: ["driving school", "driving schools"], fr: ["une auto-école", "auto-écoles", 1], de: ["eine Fahrschule", "Fahrschulen", "f"], ar: ["مدرسة لتعليم القيادة", "مدارس تعليم القيادة"] },
  { id: "music-school", kind: "school", re: rx(["music schools?", "musikschulen?", "écoles? de musique", "conservatoire", "konservatorium", "معهد موسيقى"]),
    en: ["music school", "music schools"], fr: ["une école de musique", "écoles de musique", 1], de: ["eine Musikschule", "Musikschulen", "f"], ar: ["مدرسة موسيقى", "مدارس الموسيقى"] },
  { id: "daycare", kind: "school", re: rx(["kindergartens?", "kitas?", "kindertagesstätten?", "kinderkrippen?", "daycare", "nursery school", "crèches?", "garderie", "روضة", "حضانة"]),
    en: ["daycare centre", "daycare centres"], fr: ["une crèche", "crèches", 1], de: ["eine Kita", "Kitas", "f"], ar: ["روضة أطفال", "رياض الأطفال"] },
  { id: "school", kind: "school", re: rx(["schools?", "\\p{L}*(?<!hoch|fach|sprach|fahr|musik|kunst)schulen?", "gymnasium", "realschule", "grundschule", "école(?:s)?", "lycée", "collège", "مدرسة", "ثانوية"]),
    en: ["school", "schools"], fr: ["une école", "écoles", 1], de: ["eine Schule", "Schulen", "f"], ar: ["مدرسة", "المدارس"] },
  { id: "training", kind: "training", re: rx(["training (?:centre|center|provider|courses?)", "courses?", "workshops?", "academy", "weiterbildung(?:en)?", "fortbildung(?:en)?", "seminare?", "kurse?", "bildungsträger", "bildungszentrum", "akademie", "formations?", "organisme de formation", "ateliers?", "تكوين", "دورات?", "أكاديمية", "اكاديمية"]),
    en: ["training provider", "training providers"], fr: ["un organisme de formation", "organismes de formation", 0], de: ["ein Bildungsanbieter", "Bildungsanbieter", "m"], ar: ["مركز تدريب", "مراكز التدريب"] },

  // ── culture and memory
  { id: "memorial", kind: "culture", re: rx(["memorial(?: site| museum)?", "gedenkstätten?", "erinnerungsorte?", "dokumentationszentrum", "documentation centre", "lieu de mémoire", "mémorial", "نصب تذكاري"]),
    en: ["memorial site", "memorial sites"], fr: ["un lieu de mémoire", "lieux de mémoire", 0], de: ["eine Gedenkstätte", "Gedenkstätten", "f"], ar: ["موقع تذكاري", "المواقع التذكارية"] },
  { id: "museum", kind: "culture", re: rx(["museums?", "museen", "\\p{L}*museum", "musées?", "muséum", "متحف", "المتحف"]),
    en: ["museum", "museums"], fr: ["un musée", "musées", 0], de: ["ein Museum", "Museen", "n"], ar: ["متحف", "المتاحف"] },
  { id: "gallery", kind: "culture", re: rx(["(?:art )?galler(?:y|ies)", "galerien?", "galeries?", "kunsthalle", "kunstverein", "معرض فني", "رواق"]),
    en: ["art gallery", "art galleries"], fr: ["une galerie d'art", "galeries d'art", 1], de: ["eine Galerie", "Galerien", "f"], ar: ["معرض فني", "المعارض الفنية"] },
  { id: "theatre", kind: "culture", re: rx(["theat(?:re|er)s?", "\\p{L}*theater", "théâtres?", "opera house", "opernhaus", "opéra", "مسرح"]),
    en: ["theatre", "theatres"], fr: ["un théâtre", "théâtres", 0], de: ["ein Theater", "Theater", "n"], ar: ["مسرح", "المسارح"] },
  { id: "library", kind: "culture", re: rx(["librar(?:y|ies)", "bibliothek(?:en)?", "stadtbücherei", "bücherei", "bibliothèques?", "médiathèque", "مكتبة"]),
    en: ["library", "libraries"], fr: ["une bibliothèque", "bibliothèques", 1], de: ["eine Bibliothek", "Bibliotheken", "f"], ar: ["مكتبة", "المكتبات"] },
  { id: "festival", kind: "culture", re: rx(["festivals?", "biennale", "triennale", "مهرجان"]),
    en: ["festival", "festivals"], fr: ["un festival", "festivals", 0], de: ["ein Festival", "Festivals", "n"], ar: ["مهرجان", "المهرجانات"] },
  { id: "culture-centre", kind: "culture", re: rx(["cultural (?:centre|center|association|space|venue)", "arts? (?:centre|center|space|project)", "kulturzentrum", "kulturverein", "kunstverein", "soziokultur\\p{L}*", "kulturprojekt\\p{L}*", "kunstprojekt\\p{L}*", "centre culturel", "tiers-lieu", "espace culturel", "مركز ثقافي", "فضاء ثقافي"]),
    en: ["cultural venue", "cultural venues"], fr: ["un lieu culturel", "lieux culturels", 0], de: ["ein Kulturort", "Kulturorte", "m"], ar: ["فضاء ثقافي", "الفضاءات الثقافية"] },

  // ── civil society
  { id: "foundation", kind: "nonprofit", re: rx(["foundations?", "stiftung(?:en)?", "\\p{L}*stiftung", "fondations?", "fondation", "مؤسسة خيرية"]),
    en: ["foundation", "foundations"], fr: ["une fondation", "fondations", 1], de: ["eine Stiftung", "Stiftungen", "f"], ar: ["مؤسسة", "المؤسسات"] },
  { id: "association", kind: "nonprofit", re: rx(["e\\.\\s?v\\.", "eingetragener verein", "vereins?", "\\p{L}+verein", "non-?profit(?: organi[sz]ation)?", "charit(?:y|ies)", "ngos?", "ong", "associations?(?: loi 1901)?", "initiatives?", "gemeinnützig\\p{L}*", "ehrenamt\\p{L}*", "bénévol\\p{L}*", "volunteers?", "جمعية", "منظمة غير حكومية"]),
    en: ["non-profit organisation", "non-profit organisations"], fr: ["une association", "associations", 1], de: ["ein Verein", "Vereine", "m"], ar: ["جمعية", "الجمعيات"] },

  // ── awards, prizes, calls
  { id: "award", kind: "award", re: rx(["awards?", "prizes?", "competitions?", "scholarships?", "fellowships?", "grants?", "\\p{L}*preis(?:e|es|träger\\p{L}*)?", "auszeichnung(?:en)?", "wettbewerbe?", "stipendi(?:um|en)", "prix", "concours", "bourses?", "lauréats?", "جائزة", "مسابقة", "منحة"]),
    en: ["award", "awards and competitions"], fr: ["un prix", "prix et concours", 0], de: ["ein Preis", "Preise und Wettbewerbe", "m"], ar: ["جائزة", "الجوائز والمسابقات"] },

  // ── knowledge and education resources
  { id: "atlas", kind: "knowledge", re: rx(["atlas", "digital map", "interactive map", "online map", "digitale karte", "interaktive karte", "carte interactive", "أطلس", "خريطة تفاعلية"]),
    en: ["online atlas", "online atlases and maps"], fr: ["un atlas en ligne", "atlas et cartes en ligne", 0], de: ["ein Online-Atlas", "Online-Atlanten und Karten", "m"], ar: ["أطلس إلكتروني", "الأطلسات والخرائط الإلكترونية"] },
  { id: "archive", kind: "knowledge", re: rx(["archives?", "database", "datenbank", "base de données", "digital collection", "digitale sammlung", "online-archiv", "encyclop(?:a)?edia", "lexikon", "wiki", "أرشيف", "قاعدة بيانات"]),
    en: ["online archive", "online archives and databases"], fr: ["une archive en ligne", "archives et bases de données en ligne", 1], de: ["ein Online-Archiv", "Online-Archive und Datenbanken", "n"], ar: ["أرشيف إلكتروني", "الأرشيفات وقواعد البيانات الإلكترونية"] },
  { id: "learning-app", kind: "knowledge", re: rx(["\\p{L}*history ?-?app", "\\p{L}*geschichts-?app", "learning app", "lern-?app", "educational app", "bildungsangebot", "digitale geschichtsvermittlung", "digital history", "e-learning", "application éducative", "تطبيق تعليمي"]),
    en: ["learning app", "learning apps and platforms"], fr: ["une application éducative", "applications et plateformes éducatives", 1], de: ["eine Lern-App", "Lern-Apps und Bildungsplattformen", "f"], ar: ["تطبيق تعليمي", "التطبيقات والمنصات التعليمية"] },
  { id: "research", kind: "knowledge", re: rx(["research (?:project|centre|center|institute|group)", "forschungsprojekt\\p{L}*", "forschungsinstitut\\p{L}*", "forschungsstelle", "projet de recherche", "laboratoire", "institut für", "institute for", "institut de recherche", "مشروع بحثي", "مركز أبحاث"]),
    en: ["research project", "research projects"], fr: ["un projet de recherche", "projets de recherche", 0], de: ["ein Forschungsprojekt", "Forschungsprojekte", "n"], ar: ["مشروع بحثي", "المشاريع البحثية"] },

  // ── public sector
  { id: "municipality", kind: "public", re: rx(["city council", "city hall", "municipality", "town hall", "stadtverwaltung", "gemeindeverwaltung", "rathaus", "bürgerservice", "bürgerbüro", "landratsamt", "marktgemeinde", "mairie", "hôtel de ville", "commune de", "ville de", "بلدية"]),
    en: ["town hall", "town halls"], fr: ["une mairie", "mairies", 1], de: ["eine Stadtverwaltung", "Stadtverwaltungen", "f"], ar: ["بلدية", "البلديات"] },
  { id: "authority", kind: "public", re: rx(["ministry", "ministerium", "ministère", "behörde", "\\p{L}+amt", "agentur für arbeit", "public authority", "government agency", "administration publique", "وزارة", "إدارة عمومية"]),
    en: ["public office", "public offices"], fr: ["un service public", "services publics", 0], de: ["eine Behörde", "Behörden", "f"], ar: ["إدارة عمومية", "الإدارات العمومية"] },

  // ── hospitality
  { id: "hotel", kind: "stay", re: rx(["hotels?", "hôtels?", "resorts?", "فندق", "نزل"]),
    en: ["hotel", "hotels"], fr: ["un hôtel", "hôtels", 0], de: ["ein Hotel", "Hotels", "n"], ar: ["فندق", "الفنادق"] },
  { id: "guesthouse", kind: "stay", re: rx(["guest ?houses?", "b&b", "bed and breakfast", "maisons? d'hôtes", "chambres? d'hôtes", "gîtes?", "gästehaus", "pension", "ferienwohnung(?:en)?", "holiday (?:apartments?|homes?|rentals?)", "riads?", "hostels?", "auberges?", "camping", "دار ضيافة"]),
    en: ["guest house", "guest houses"], fr: ["une maison d'hôtes", "maisons d'hôtes", 1], de: ["eine Unterkunft", "Unterkünfte", "f"], ar: ["دار ضيافة", "دور الضيافة"] },
  { id: "restaurant", kind: "food", re: rx(["restaurants?", "bistros?", "brasseries?", "trattoria", "pizzeria", "gasthaus", "gaststätte", "wirtshaus", "مطعم"]),
    en: ["restaurant", "restaurants"], fr: ["un restaurant", "restaurants", 0], de: ["ein Restaurant", "Restaurants", "n"], ar: ["مطعم", "المطاعم"] },
  { id: "cafe", kind: "food", re: rx(["caf[eé]s?", "coffee (?:shop|bar|roaster)", "bakery", "bakeries", "boulangerie", "pâtisserie", "bäckerei", "konditorei", "bars?", "مقهى", "مخبزة"]),
    en: ["café", "cafés"], fr: ["un café", "cafés", 0], de: ["ein Café", "Cafés", "n"], ar: ["مقهى", "المقاهي"] },

  // ── health
  { id: "dentist", kind: "health", re: rx(["dentists?", "dental (?:clinic|practice|care)", "zahnarzt\\p{L}*", "zahnärzt\\p{L}*", "dentiste", "cabinet dentaire", "طبيب أسنان"]),
    en: ["dentist", "dentists"], fr: ["un dentiste", "dentistes", 0], de: ["eine Zahnarztpraxis", "Zahnarztpraxen", "f"], ar: ["عيادة أسنان", "عيادات الأسنان"] },
  { id: "physio", kind: "health", re: rx(["physio\\p{L}*", "kinésithérap\\p{L}*", "kiné", "osteopath\\p{L}*", "ostéopath\\p{L}*", "ergotherapie", "logopädie", "علاج طبيعي"]),
    en: ["physiotherapy practice", "physiotherapy practices"], fr: ["un cabinet de kinésithérapie", "cabinets de kinésithérapie", 0], de: ["eine Physiotherapiepraxis", "Physiotherapiepraxen", "f"], ar: ["عيادة علاج طبيعي", "عيادات العلاج الطبيعي"] },
  { id: "psych", kind: "health", re: rx(["psychotherap\\p{L}*", "psycholog\\p{L}*", "counselling", "therapists?", "psychiatr\\p{L}*", "معالج نفسي"]),
    en: ["therapist", "therapists"], fr: ["un psychothérapeute", "psychothérapeutes", 0], de: ["eine psychotherapeutische Praxis", "psychotherapeutische Praxen", "f"], ar: ["معالج نفسي", "المعالجين النفسيين"] },
  { id: "vet", kind: "health", re: rx(["vets?", "veterinar\\p{L}*", "tierarzt\\p{L}*", "tierärzt\\p{L}*", "vétérinaire", "طبيب بيطري"]),
    en: ["vet", "vets"], fr: ["un vétérinaire", "vétérinaires", 0], de: ["eine Tierarztpraxis", "Tierarztpraxen", "f"], ar: ["عيادة بيطرية", "العيادات البيطرية"] },
  { id: "clinic", kind: "health", re: rx(["clinics?", "hospitals?", "medical (?:centre|center|practice)", "doctors?", "physicians?", "gp", "klinik(?:en|um)?", "krankenhaus", "arztpraxis", "praxis für", "facharzt\\p{L}*", "hausarzt\\p{L}*", "cliniques?", "hôpital", "médecins?", "cabinet médical", "pharmac(?:y|ies)", "apotheken?", "pharmacies?", "عيادة", "طبيب", "مستشفى", "صيدلية"]),
    en: ["medical practice", "medical practices"], fr: ["un cabinet médical", "cabinets médicaux", 0], de: ["eine Arztpraxis", "Arztpraxen", "f"], ar: ["عيادة", "العيادات"] },

  // ── professional services
  { id: "law", kind: "legal", re: rx(["law (?:firm|office)s?", "lawyers?", "attorneys?", "solicitors?", "rechtsanw\\p{L}*", "anwaltskanzlei", "kanzlei", "notar\\p{L}*", "avocats?", "cabinet d'avocats", "notaires?", "محام\\p{L}*", "مكتب محاماة"]),
    en: ["law firm", "law firms"], fr: ["un cabinet d'avocats", "cabinets d'avocats", 0], de: ["eine Kanzlei", "Kanzleien", "f"], ar: ["مكتب محاماة", "مكاتب المحاماة"] },
  { id: "tax", kind: "finance", re: rx(["tax (?:advisers?|advisors?|consultants?)", "accountants?", "accounting firm", "bookkeeping", "steuerberat\\p{L}*", "steuerkanzlei", "buchhaltung", "wirtschaftsprüf\\p{L}*", "expert-comptable", "experts-comptables", "cabinet comptable", "comptabilité", "محاسب\\p{L}*", "مستشار جبائي"]),
    en: ["tax adviser", "tax advisers"], fr: ["un expert-comptable", "experts-comptables", 0], de: ["eine Steuerkanzlei", "Steuerkanzleien", "f"], ar: ["مكتب محاسبة", "مكاتب المحاسبة"] },
  { id: "insurance", kind: "finance", re: rx(["insurance (?:broker|agency|agent)s?", "financial (?:advisers?|advisors?|planning)", "versicherungs(?:makler|agentur|büro)", "finanzberat\\p{L}*", "courtier", "assurances?", "تأمين"]),
    en: ["insurance broker", "insurance brokers"], fr: ["un courtier en assurances", "courtiers en assurances", 0], de: ["ein Versicherungsmakler", "Versicherungsmakler", "m"], ar: ["وسيط تأمين", "وسطاء التأمين"] },
  { id: "agency", kind: "agency", re: rx(["agenc(?:y|ies)", "agentur(?:en)?", "\\p{L}+agentur", "agences?", "studios?", "consultanc(?:y|ies)", "consultants?", "consulting", "beratung", "unternehmensberatung", "conseil", "web ?design", "seo", "marketing", "branding", "werbeagentur", "translation (?:agency|services)", "übersetzungsbüro", "it services?", "it-dienstleister", "freelancer?", "وكالة", "استشارات"]),
    en: ["agency", "agencies"], fr: ["une agence", "agences", 1], de: ["eine Agentur", "Agenturen", "f"], ar: ["وكالة", "الوكالات"] },
  { id: "software", kind: "saas", re: rx(["saas", "software", "logiciels?", "platform", "plateforme", "plattform", "apps?", "api", "dashboard", "free trial", "essai gratuit", "kostenlos testen", "start free", "منصة", "برنامج", "تطبيق"]),
    en: ["software tool", "software tools"], fr: ["un logiciel", "logiciels", 0], de: ["eine Software", "Software-Lösungen", "f"], ar: ["برنامج", "البرامج"] },

  // ── shops and local trades
  { id: "shop", kind: "shop", re: rx(["online ?shops?", "shops?", "stores?", "boutiques?", "magasins?", "laden", "läden", "onlineshop", "e-shop", "add to cart", "ajouter au panier", "in den warenkorb", "warenkorb", "متجر", "أضف إلى السلة"]),
    en: ["shop", "shops"], fr: ["une boutique", "boutiques", 1], de: ["ein Geschäft", "Geschäfte", "n"], ar: ["متجر", "المتاجر"] },
  { id: "trades", kind: "trades", re: rx(["plumb\\p{L}*", "electricians?", "carpent\\p{L}*", "roof\\p{L}*", "painters? and decorators?", "handwerk\\p{L}*", "sanitär", "heizung", "elektriker", "elektrotechnik", "schreiner\\p{L}*", "tischler\\p{L}*", "dachdecker\\p{L}*", "maler(?:betrieb|meister)?", "plombier", "électricien", "menuisier", "couvreur", "artisan", "garage", "kfz-werkstatt", "autowerkstatt", "werkstatt", "سباك", "كهربائي", "نجار"]),
    en: ["tradesperson", "tradespeople"], fr: ["un artisan", "artisans", 0], de: ["ein Handwerksbetrieb", "Handwerksbetriebe", "m"], ar: ["حرفي", "الحرفيين"] },
  { id: "salon", kind: "beauty", re: rx(["hair ?(?:salon|dresser)s?", "barbers?", "beauty (?:salon|studio)s?", "nail (?:salon|studio)s?", "spas?", "friseur\\p{L}*", "kosmetik\\p{L}*", "nagelstudio", "salon de coiffure", "coiffeur", "institut de beauté", "esthéticienne", "صالون", "حلاق"]),
    en: ["salon", "salons"], fr: ["un salon", "salons", 0], de: ["ein Salon", "Salons", "m"], ar: ["صالون", "الصالونات"] },
  { id: "gym", kind: "fitness", re: rx(["gyms?", "fitness (?:studio|club|centre|center)s?", "yoga (?:studio|school)s?", "pilates", "personal trainers?", "crossfit", "fitnessstudio", "salle de sport", "salle de fitness", "صالة رياضية", "نادي رياضي"]),
    en: ["gym", "gyms"], fr: ["une salle de sport", "salles de sport", 1], de: ["ein Fitnessstudio", "Fitnessstudios", "n"], ar: ["صالة رياضية", "الصالات الرياضية"] },
  { id: "realestate", kind: "realestate", re: rx(["real estate", "estate agents?", "realtors?", "property management", "immobilien\\p{L}*", "makler", "immobilier", "agence immobilière", "عقار\\p{L}*"]),
    en: ["estate agent", "estate agents"], fr: ["une agence immobilière", "agences immobilières", 1], de: ["ein Immobilienmakler", "Immobilienmakler", "m"], ar: ["وكالة عقارية", "الوكالات العقارية"] },
  { id: "tourism", kind: "travel", re: rx(["tour operators?", "travel agenc(?:y|ies)", "tours?", "excursions?", "guided tours?", "tourist (?:office|information)", "tourist-?info", "reisebüro", "reiseveranstalter", "stadtführung(?:en)?", "agence de voyages?", "office de tourisme", "visites? guidées?", "وكالة أسفار", "جولات"]),
    en: ["tour operator", "tour operators"], fr: ["un organisateur de voyages", "organisateurs de voyages", 0], de: ["ein Reiseveranstalter", "Reiseveranstalter", "m"], ar: ["وكالة أسفار", "وكالات الأسفار"] },
  { id: "media", kind: "media", re: rx(["magazines?", "newspapers?", "news (?:site|portal)", "podcasts?", "zeitschrift(?:en)?", "zeitung(?:en)?", "magazin", "journal", "revue", "médias?", "مجلة", "جريدة"]),
    en: ["magazine", "magazines and news sites"], fr: ["un magazine", "magazines et sites d'information", 0], de: ["ein Magazin", "Magazine und Nachrichtenseiten", "n"], ar: ["مجلة", "المجلات والمواقع الإخبارية"] }
];

export const GENERIC = { id: "generic", kind: "generic", en: ["organisation", "organisations"], fr: ["une structure", "structures", 1], de: ["ein Anbieter", "Anbieter", "m"], ar: ["جهة", "الجهات"] };

// schema.org type → subtype
export const SCHEMA_SUB = [
  [/CollegeOrUniversity/, "university"], [/HighSchool|MiddleSchool|ElementarySchool|School\b/, "school"], [/Preschool|ChildCare/, "daycare"],
  [/EducationalOrganization/, "university"], [/Course\b|CourseInstance/, "training"],
  [/Museum/, "museum"], [/ArtGallery/, "gallery"], [/PerformingArtsTheater|Theater/, "theatre"], [/Library/, "library"], [/Festival/, "festival"], [/LandmarksOrHistoricalBuildings/, "memorial"],
  [/NGO|NonprofitOrganization|NonProfit/, "association"], [/Foundation/, "foundation"],
  [/GovernmentOrganization|GovernmentOffice|CityHall/, "municipality"],
  [/Hotel|Resort|Motel/, "hotel"], [/LodgingBusiness|BedAndBreakfast|Hostel|VacationRental|Campground/, "guesthouse"],
  [/Restaurant|FoodEstablishment/, "restaurant"], [/Cafe|Bakery|BarOrPub|CafeOrCoffeeShop/, "cafe"],
  [/Dentist/, "dentist"], [/Physiotherapy/, "physio"], [/VeterinaryCare/, "vet"], [/MedicalClinic|Physician|Hospital|Pharmacy|MedicalBusiness|MedicalOrganization/, "clinic"],
  [/LegalService|Attorney|Notary/, "law"], [/AccountingService|FinancialService|TaxAdvisor/, "tax"], [/InsuranceAgency/, "insurance"],
  [/SoftwareApplication|WebApplication|MobileApplication/, "software"],
  [/Store\b|OnlineStore|ClothingStore|BookStore|Product\b/, "shop"],
  [/HomeAndConstructionBusiness|Plumber|Electrician|RoofingContractor|HVACBusiness|AutoRepair|GeneralContractor/, "trades"],
  [/HairSalon|BeautySalon|NailSalon|DaySpa|HealthAndBeautyBusiness/, "salon"], [/ExerciseGym|SportsActivityLocation/, "gym"],
  [/RealEstateAgent/, "realestate"], [/TravelAgency|TouristInformationCenter|TouristTrip/, "tourism"],
  [/NewsMediaOrganization|Periodical|NewsArticle/, "media"],
  [/ProfessionalService|MarketingAgency|Agency/, "agency"],
  [/Dataset|Map\b/, "archive"], [/ResearchProject|ResearchOrganization/, "research"]
];

// Sector names for the profile editor
export const KIND_LABEL = {
  uni: { en: "University or college", fr: "Université ou école supérieure", de: "Hochschule oder Universität", ar: "جامعة أو معهد عالٍ" },
  school: { en: "School", fr: "École", de: "Schule", ar: "مدرسة" },
  training: { en: "Courses and training", fr: "Formation", de: "Kurse und Weiterbildung", ar: "تكوين ودورات" },
  culture: { en: "Museum, memorial or cultural venue", fr: "Musée, lieu de mémoire ou lieu culturel", de: "Museum, Gedenkstätte oder Kulturort", ar: "متحف أو موقع تذكاري أو فضاء ثقافي" },
  nonprofit: { en: "Association, foundation or NGO", fr: "Association, fondation ou ONG", de: "Verein, Stiftung oder NGO", ar: "جمعية أو مؤسسة أو منظمة" },
  award: { en: "Award, prize or competition", fr: "Prix ou concours", de: "Preis oder Wettbewerb", ar: "جائزة أو مسابقة" },
  knowledge: { en: "Archive, atlas, research or learning app", fr: "Archive, atlas, recherche ou appli éducative", de: "Archiv, Atlas, Forschung oder Lern-App", ar: "أرشيف أو أطلس أو بحث أو تطبيق تعليمي" },
  public: { en: "Public office or town hall", fr: "Service public ou mairie", de: "Behörde oder Stadtverwaltung", ar: "إدارة عمومية أو بلدية" },
  stay: { en: "Hotel or guest house", fr: "Hôtel ou maison d'hôtes", de: "Hotel oder Unterkunft", ar: "فندق أو دار ضيافة" },
  food: { en: "Restaurant or café", fr: "Restaurant ou café", de: "Restaurant oder Café", ar: "مطعم أو مقهى" },
  health: { en: "Health practice or clinic", fr: "Cabinet médical ou clinique", de: "Praxis oder Klinik", ar: "عيادة أو مركز صحي" },
  legal: { en: "Law firm", fr: "Cabinet d'avocats", de: "Kanzlei", ar: "مكتب محاماة" },
  finance: { en: "Tax, accounting or insurance", fr: "Comptabilité, fiscalité ou assurance", de: "Steuer, Buchhaltung oder Versicherung", ar: "محاسبة أو جباية أو تأمين" },
  agency: { en: "Agency or consultancy", fr: "Agence ou conseil", de: "Agentur oder Beratung", ar: "وكالة أو استشارات" },
  saas: { en: "Software or app", fr: "Logiciel ou application", de: "Software oder App", ar: "برنامج أو تطبيق" },
  shop: { en: "Shop", fr: "Boutique", de: "Geschäft oder Onlineshop", ar: "متجر" },
  trades: { en: "Trades and repairs", fr: "Artisan", de: "Handwerk", ar: "حِرف وصيانة" },
  beauty: { en: "Hair and beauty", fr: "Coiffure et beauté", de: "Friseur und Kosmetik", ar: "حلاقة وتجميل" },
  fitness: { en: "Gym or sports", fr: "Salle de sport", de: "Fitness und Sport", ar: "رياضة ولياقة" },
  realestate: { en: "Real estate", fr: "Immobilier", de: "Immobilien", ar: "عقارات" },
  travel: { en: "Tourism and travel", fr: "Tourisme et voyages", de: "Tourismus und Reisen", ar: "سياحة وأسفار" },
  media: { en: "Media or publication", fr: "Média ou publication", de: "Medien oder Publikation", ar: "إعلام أو نشر" },
  generic: { en: "Other", fr: "Autre", de: "Sonstiges", ar: "أخرى" }
};
export const KINDS = Object.keys(KIND_LABEL);

export const subById = (id) => SUBTYPES.find((s) => s.id === id) || (id === "generic" ? GENERIC : null);
const DEFAULT_SUB = { uni: "university", school: "school", culture: "culture-centre", nonprofit: "association", knowledge: "archive", public: "municipality", stay: "hotel", food: "restaurant", health: "clinic", finance: "tax" };
export const defaultSubFor = (kind) => (DEFAULT_SUB[kind] && SUBTYPES.find((s) => s.id === DEFAULT_SUB[kind])) || SUBTYPES.find((s) => s.kind === kind) || GENERIC;

// Find the subtype that a free-text label (typed by the user) refers to.
export function subFromLabel(label) {
  const s = String(label || "");
  if (!s.trim()) return null;
  let best = null, bestLen = 0;
  for (const st of SUBTYPES) {
    st.re.lastIndex = 0;
    const m = st.re.exec(s);
    st.re.lastIndex = 0;
    if (m && m[0].length > bestLen) { best = st; bestLen = m[0].length; }
  }
  return best;
}
