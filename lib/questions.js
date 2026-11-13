// Sada · the questions people ask AI assistants before they choose.
// Written per sector and per language, with real articles, plurals and
// place prepositions, so they read like a person typed them.
//
// Template: [intent, aspect, branded 0|1, text, flags]
// flags: "o" needs an offer · "!o" only without an offer · "i" only for international audiences · "!i" only otherwise
// Placeholders: {name} {sg} {pl} {Qpl} {bare} {other} {offer} {offer2} {aud} {people}
//               {in_area} {in_city} {in_wide}  (each includes its leading space, or disappears)

import { subById, defaultSubFor } from "./kinds.js";
import { inCity, inCountry, inRegion, norm } from "./geo.js";
import { isWide } from "./profile.js";

const BASE = {
  en: {
    U1: ["discover", "none", 0, "Which {pl}{in_area} would you recommend?"],
    U3: ["compare", "none", 0, "How do I choose {sg}{in_area}? What should I compare?"],
    B1: ["brand", "none", 1, "What is {name}, and who is it for?"],
    B2: ["trust", "reviews", 1, "Is {name} any good? What do {people} say?"],
    B3: ["practical", "contact", 1, "How do I contact {name}?"],
    B4: ["compare", "none", 1, "What are good alternatives to {name}{in_area}?"]
  },
  fr: {
    U1: ["discover", "none", 0, "{Qpl}{in_area} me conseilles-tu ?"],
    U3: ["compare", "none", 0, "Comment choisir {sg}{in_area} ? Que faut-il comparer ?"],
    B1: ["brand", "none", 1, "Qu'est-ce que {name}, et pour qui ?"],
    B2: ["trust", "reviews", 1, "{name}, c'est bien ? Qu'en disent les {people} ?"],
    B3: ["practical", "contact", 1, "Comment contacter {name} ?"],
    B4: ["compare", "none", 1, "Quelles alternatives à {name}{in_area} ?"]
  },
  de: {
    U1: ["discover", "none", 0, "Welche {pl}{in_area} kannst du empfehlen?"],
    U3: ["compare", "none", 0, "Wie finde ich {sg}{in_area}, die zu mir passt? Worauf sollte ich achten?"],
    B1: ["brand", "none", 1, "Was ist {name}, und für wen ist das Angebot?"],
    B2: ["trust", "reviews", 1, "Ist {name} gut? Was sagen {people}?"],
    B3: ["practical", "contact", 1, "Wie erreiche ich {name}?"],
    B4: ["compare", "none", 1, "Welche Alternativen zu {name} gibt es{in_area}?"]
  },
  ar: {
    U1: ["discover", "none", 0, "ما هي أفضل {pl}{in_area} التي تنصحني بها؟"],
    U3: ["compare", "none", 0, "كيف أختار {sg}{in_area}؟ ما الذي يجب أن أقارنه؟"],
    B1: ["brand", "none", 1, "عرّفني بـ{name}: ماذا يقدّم ولمن؟"],
    B2: ["trust", "reviews", 1, "هل {name} خيار جيد؟ ماذا يقول {people}؟"],
    B3: ["practical", "contact", 1, "كيف أتواصل مع {name}؟"],
    B4: ["compare", "none", 1, "ما البدائل عن {name}{in_area}؟"]
  }
};
// German "U3" needs the article to agree; fixed per gender below.
const DE_U3 = { f: "Wie finde ich {sg}{in_area}, die zu mir passt? Worauf sollte ich achten?", m: "Wie finde ich {sg_acc}{in_area}, der zu mir passt? Worauf sollte ich achten?", n: "Wie finde ich {sg}{in_area}, das zu mir passt? Worauf sollte ich achten?" };

const PEOPLE = {
  uni: ["students", "étudiants", "Studierende", "الطلاب"],
  school: ["parents and pupils", "parents et élèves", "Eltern und Schüler", "أولياء الأمور والتلاميذ"],
  training: ["participants", "participants", "Teilnehmende", "المشاركون"],
  culture: ["visitors", "visiteurs", "Besucher", "الزوار"],
  nonprofit: ["members", "membres", "Mitglieder", "الأعضاء"],
  award: ["participants", "participants", "Teilnehmende", "المشاركون"],
  knowledge: ["users", "utilisateurs", "Nutzer", "المستخدمون"],
  public: ["citizens", "habitants", "Bürger", "المواطنون"],
  stay: ["guests", "clients", "Gäste", "النزلاء"],
  food: ["guests", "clients", "Gäste", "الزبائن"],
  health: ["patients", "patients", "Patienten", "المرضى"],
  beauty: ["customers", "clients", "Kunden", "الزبائن"],
  fitness: ["members", "membres", "Mitglieder", "المشتركون"],
  generic: ["customers", "clients", "Kunden", "العملاء"]
};

// Sector templates. Unbranded first: they decide whether AI recommends you.
const K = {
  uni: { skip: ["U3", "B1"], en: [
      ["discover", "none", 0, "Which {pl}{in_wide} would you recommend for studying {offer}?", "o"],
      ["discover", "none", 0, "Which {pl}{in_wide} offer degree programmes taught in English?", "i"],
      ["discover", "none", 0, "Where can I study {offer2}{in_wide}?", "o"],
      ["compare", "none", 0, "How do I choose {sg}{in_wide}? What should I compare?"],
      ["price", "price", 0, "How much does it cost to study{in_wide}, including living costs?"],
      ["brand", "none", 1, "What is {name} known for, and what can I study there?"],
      ["practical", "book", 1, "How do I apply to {name}, and what are the deadlines?"],
      ["practical", "none", 1, "What are the admission requirements at {name} for international students?", "i"],
      ["practical", "none", 1, "What are the admission requirements at {name}?", "!i"],
      ["price", "price", 1, "Does {name} charge tuition fees?"],
      ["practical", "where", 1, "What is student life like at {name}{in_city}?"],
      ["compare", "none", 1, "{name} or another {bare}: which is better for {offer}?", "o"]
    ], fr: [
      ["discover", "none", 0, "{Qpl}{in_wide} me conseilles-tu pour étudier {offer} ?", "o"],
      ["discover", "none", 0, "{Qpl}{in_wide} proposent des cursus enseignés en anglais ?", "i"],
      ["discover", "none", 0, "Où étudier {offer2}{in_wide} ?", "o"],
      ["compare", "none", 0, "Comment choisir {sg}{in_wide} ? Que faut-il comparer ?"],
      ["price", "price", 0, "Combien coûtent les études{in_wide}, logement compris ?"],
      ["brand", "none", 1, "{name} : quelle réputation, et que peut-on y étudier ?"],
      ["practical", "book", 1, "{name} : comment postuler, et quelles sont les dates limites ?"],
      ["practical", "none", 1, "{name} : quelles conditions d'admission pour les étudiants internationaux ?", "i"],
      ["practical", "none", 1, "{name} : quelles sont les conditions d'admission ?", "!i"],
      ["price", "price", 1, "{name} : y a-t-il des frais de scolarité ?"],
      ["practical", "where", 1, "{name} : comment est la vie étudiante{in_city} ?"],
      ["compare", "none", 1, "{name} ou {other} : que choisir pour {offer} ?", "o"]
    ], de: [
      ["discover", "none", 0, "Welche {pl}{in_wide} empfiehlst du für ein Studium in {offer}?", "o"],
      ["discover", "none", 0, "Welche {pl}{in_wide} bieten englischsprachige Studiengänge an?", "i"],
      ["discover", "none", 0, "Wo kann ich{in_wide} {offer2} studieren?", "o"],
      ["compare", "none", 0, "Wie finde ich die passende {bare}{in_wide}? Was sollte ich vergleichen?"],
      ["price", "price", 0, "Was kostet ein Studium{in_wide}, mit Lebenshaltungskosten?"],
      ["brand", "none", 1, "Wofür ist {name} bekannt, und was kann man dort studieren?"],
      ["practical", "book", 1, "{name}: Wie bewerbe ich mich, und welche Fristen gelten?"],
      ["practical", "none", 1, "{name}: Welche Zulassungsvoraussetzungen gelten für internationale Studierende?", "i"],
      ["practical", "none", 1, "{name}: Welche Zulassungsvoraussetzungen gibt es?", "!i"],
      ["price", "price", 1, "{name}: Gibt es Studiengebühren?"],
      ["practical", "where", 1, "{name}: Wie ist das Studentenleben{in_city}?"],
      ["compare", "none", 1, "{name} oder {other}: Was ist besser für {offer}?", "o"]
    ], ar: [
      ["discover", "none", 0, "أي {pl}{in_wide} تنصحني بها لدراسة {offer}؟", "o"],
      ["discover", "none", 0, "ما هي {pl}{in_wide} التي تقدم برامج دراسية باللغة الإنجليزية؟", "i"],
      ["discover", "none", 0, "أين يمكنني دراسة {offer2}{in_wide}؟", "o"],
      ["compare", "none", 0, "كيف أختار {sg}{in_wide}؟ ما الذي يجب أن أقارنه؟"],
      ["price", "price", 0, "كم تكلفة الدراسة{in_wide}، بما في ذلك تكاليف المعيشة؟"],
      ["brand", "none", 1, "بماذا تشتهر {name}، وماذا يمكنني أن أدرس فيها؟"],
      ["practical", "book", 1, "كيف أتقدم بطلب إلى {name}، وما هي المواعيد النهائية؟"],
      ["practical", "none", 1, "ما هي شروط القبول في {name} للطلاب الدوليين؟", "i"],
      ["practical", "none", 1, "ما هي شروط القبول في {name}؟", "!i"],
      ["price", "price", 1, "هل تفرض {name} رسومًا دراسية؟"],
      ["practical", "where", 1, "كيف هي الحياة الطلابية في {name}{in_city}؟"]
    ] },
  school: { skip: ["U1"], en: [
      ["discover", "none", 0, "Which {pl}{in_area} have the best reputation?"],
      ["discover", "none", 0, "Which {pl}{in_area} offer {offer}?", "o"],
      ["price", "price", 0, "How much does {sg}{in_area} cost?"],
      ["practical", "book", 1, "How do I enrol at {name}, and when does it start?"],
      ["price", "price", 1, "What are the fees at {name}?"],
      ["practical", "hours", 1, "What are the hours and schedules at {name}?"]
    ], fr: [
      ["discover", "none", 0, "{Qpl}{in_area} ont la meilleure réputation ?"],
      ["discover", "none", 0, "{Qpl}{in_area} proposent {offer} ?", "o"],
      ["price", "price", 0, "Combien coûte {sg}{in_area} ?"],
      ["practical", "book", 1, "{name} : comment s'inscrire, et quand cela commence-t-il ?"],
      ["price", "price", 1, "{name} : quels sont les tarifs ?"],
      ["practical", "hours", 1, "{name} : quels sont les horaires ?"]
    ], de: [
      ["discover", "none", 0, "Welche {pl}{in_area} haben den besten Ruf?"],
      ["discover", "none", 0, "Welche {pl}{in_area} bieten {offer} an?", "o"],
      ["price", "price", 0, "Was kostet {sg}{in_area}?"],
      ["practical", "book", 1, "{name}: Wie melde ich mich an, und wann geht es los?"],
      ["price", "price", 1, "{name}: Wie hoch sind die Gebühren?"],
      ["practical", "hours", 1, "{name}: Wie sind die Zeiten und der Stundenplan?"]
    ], ar: [
      ["discover", "none", 0, "ما هي {pl}{in_area} الأفضل سمعة؟"],
      ["discover", "none", 0, "ما هي {pl}{in_area} التي تقدم {offer}؟", "o"],
      ["price", "price", 0, "كم تكلفة {sg}{in_area}؟"],
      ["practical", "book", 1, "كيف أسجل في {name}، ومتى تبدأ الدراسة؟"],
      ["price", "price", 1, "ما هي رسوم {name}؟"],
      ["practical", "hours", 1, "ما هي مواعيد الدراسة في {name}؟"]
    ] },
  training: { en: [
      ["discover", "none", 0, "Where can I take a course in {offer}{in_area}?", "o"],
      ["discover", "none", 0, "Which {pl}{in_area} offer online or part-time courses?"],
      ["price", "price", 0, "How much does a course in {offer} cost?", "o"],
      ["practical", "book", 1, "How do I sign up for a course at {name}, and when are the next dates?"],
      ["trust", "none", 1, "Are the certificates from {name} recognised?"],
      ["price", "price", 1, "What do courses at {name} cost, and is funding available?"]
    ], fr: [
      ["discover", "none", 0, "Où suivre une formation en {offer}{in_area} ?", "o"],
      ["discover", "none", 0, "{Qpl}{in_area} proposent des formations en ligne ou à temps partiel ?"],
      ["price", "price", 0, "Combien coûte une formation en {offer} ?", "o"],
      ["practical", "book", 1, "{name} : comment s'inscrire, et quelles sont les prochaines dates ?"],
      ["trust", "none", 1, "{name} : les certificats sont-ils reconnus ?"],
      ["price", "price", 1, "{name} : combien coûtent les formations, et existe-t-il des financements ?"]
    ], de: [
      ["discover", "none", 0, "Wo kann ich{in_area} eine Weiterbildung in {offer} machen?", "o"],
      ["discover", "none", 0, "Welche {pl}{in_area} bieten Kurse online oder berufsbegleitend an?"],
      ["price", "price", 0, "Was kostet ein Kurs in {offer}?", "o"],
      ["practical", "book", 1, "{name}: Wie melde ich mich an, und wann sind die nächsten Termine?"],
      ["trust", "none", 1, "{name}: Sind die Zertifikate anerkannt?"],
      ["price", "price", 1, "{name}: Was kosten die Kurse, und gibt es Förderung?"]
    ], ar: [
      ["discover", "none", 0, "أين يمكنني أن أتابع دورة في {offer}{in_area}؟", "o"],
      ["discover", "none", 0, "ما هي {pl}{in_area} التي تقدم دورات عن بُعد أو بدوام جزئي؟"],
      ["price", "price", 0, "كم تكلفة دورة في {offer}؟", "o"],
      ["practical", "book", 1, "كيف أسجل في دورة لدى {name}، وما هي المواعيد القادمة؟"],
      ["trust", "none", 1, "هل شهادات {name} معترف بها؟"],
      ["price", "price", 1, "كم تكلفة الدورات في {name}، وهل يوجد دعم مالي؟"]
    ] },
  culture: { skip: ["U1", "U3", "B4"], en: [
      ["discover", "none", 0, "Which {pl}{in_area} are worth visiting?"],
      ["discover", "none", 0, "What exhibitions or events are on{in_area} at the moment?"],
      ["discover", "none", 0, "Where can I learn about {offer}{in_area}?", "o"],
      ["discover", "none", 0, "What can I do{in_area} with a school class or a group?"],
      ["practical", "hours", 1, "What are the opening hours of {name}, and how much is admission?"],
      ["practical", "where", 1, "How do I get to {name}, and is it accessible?"],
      ["practical", "book", 1, "Does {name} offer guided tours or programmes for school groups?"],
      ["brand", "none", 1, "What can I see at {name} right now?"]
    ], fr: [
      ["discover", "none", 0, "{Qpl}{in_area} valent le détour ?"],
      ["discover", "none", 0, "Quelles expositions ou quels événements y a-t-il en ce moment{in_area} ?"],
      ["discover", "none", 0, "Où en apprendre plus sur {offer}{in_area} ?", "o"],
      ["discover", "none", 0, "Que faire{in_area} avec une classe ou un groupe ?"],
      ["practical", "hours", 1, "{name} : quels horaires, et combien coûte l'entrée ?"],
      ["practical", "where", 1, "{name} : comment y aller, et le lieu est-il accessible ?"],
      ["practical", "book", 1, "{name} : y a-t-il des visites guidées ou des programmes pour les scolaires ?"],
      ["brand", "none", 1, "{name} : que voir en ce moment ?"]
    ], de: [
      ["discover", "none", 0, "Welche {pl}{in_area} lohnen einen Besuch?"],
      ["discover", "none", 0, "Welche Ausstellungen oder Veranstaltungen gibt es gerade{in_area}?"],
      ["discover", "none", 0, "Wo kann ich mich{in_area} über {offer} informieren?", "o"],
      ["discover", "none", 0, "Was kann ich{in_area} mit einer Schulklasse oder Gruppe unternehmen?"],
      ["practical", "hours", 1, "{name}: Wie sind die Öffnungszeiten, und was kostet der Eintritt?"],
      ["practical", "where", 1, "{name}: Wie komme ich hin, und ist es barrierefrei?"],
      ["practical", "book", 1, "{name}: Gibt es Führungen oder Angebote für Schulklassen?"],
      ["brand", "none", 1, "{name}: Was ist dort gerade zu sehen?"]
    ], ar: [
      ["discover", "none", 0, "ما هي {pl}{in_area} التي تستحق الزيارة؟"],
      ["discover", "none", 0, "ما هي المعارض أو الفعاليات الحالية{in_area}؟"],
      ["discover", "none", 0, "أين يمكنني التعرف على {offer}{in_area}؟", "o"],
      ["discover", "none", 0, "ماذا يمكنني أن أفعل{in_area} مع فصل دراسي أو مجموعة؟"],
      ["practical", "hours", 1, "ما هي مواعيد فتح {name}، وكم سعر الدخول؟"],
      ["practical", "where", 1, "كيف أصل إلى {name}، وهل المكان مهيأ لذوي الإعاقة؟"],
      ["practical", "book", 1, "هل تقدم {name} جولات إرشادية أو برامج للمدارس؟"],
      ["brand", "none", 1, "ماذا يمكنني أن أرى في {name} حاليًا؟"]
    ] },
  nonprofit: { skip: ["U3", "B2", "B4"], en: [
      ["discover", "none", 0, "Which {pl}{in_area} work on {offer}?", "o"],
      ["discover", "none", 0, "How can I get involved in {offer}{in_area}?", "o"],
      ["discover", "none", 0, "Which {pl}{in_area} can I support or volunteer with?", "!o"],
      ["brand", "none", 1, "What does {name} do, and what has it achieved?"],
      ["practical", "book", 1, "How can I become a member of {name} or volunteer?"],
      ["practical", "none", 1, "How can I donate to {name}, and are donations tax-deductible?"],
      ["trust", "none", 1, "Who is behind {name}, and how is it funded?"]
    ], fr: [
      ["discover", "none", 0, "{Qpl}{in_area} s'engagent pour {offer} ?", "o"],
      ["discover", "none", 0, "Comment m'engager pour {offer}{in_area} ?", "o"],
      ["discover", "none", 0, "{Qpl}{in_area} cherchent des bénévoles ou du soutien ?", "!o"],
      ["brand", "none", 1, "Que fait {name}, et avec quels résultats ?"],
      ["practical", "book", 1, "Comment devenir membre ou bénévole chez {name} ?"],
      ["practical", "none", 1, "{name} : comment faire un don, et est-il déductible des impôts ?"],
      ["trust", "none", 1, "Qui est derrière {name}, et comment le travail est-il financé ?"]
    ], de: [
      ["discover", "none", 0, "Welche {pl}{in_area} engagieren sich für {offer}?", "o"],
      ["discover", "none", 0, "Wie kann ich mich{in_area} für {offer} engagieren?", "o"],
      ["discover", "none", 0, "Welche {pl}{in_area} suchen Ehrenamtliche oder Unterstützung?", "!o"],
      ["brand", "none", 1, "Was macht {name}, und was wurde bisher erreicht?"],
      ["practical", "book", 1, "{name}: Wie werde ich Mitglied, oder wie kann ich mich ehrenamtlich engagieren?"],
      ["practical", "none", 1, "{name}: Wie kann ich spenden, und ist die Spende steuerlich absetzbar?"],
      ["trust", "none", 1, "Wer steht hinter {name}, und wie wird die Arbeit finanziert?"]
    ], ar: [
      ["discover", "none", 0, "ما هي {pl}{in_area} التي تعمل في مجال {offer}؟", "o"],
      ["discover", "none", 0, "كيف يمكنني المشاركة في {offer}{in_area}؟", "o"],
      ["discover", "none", 0, "ما هي {pl}{in_area} التي يمكنني دعمها أو التطوع معها؟", "!o"],
      ["brand", "none", 1, "ماذا تفعل {name}، وما الذي حققته؟"],
      ["practical", "book", 1, "كيف أصبح عضوًا في {name} أو متطوعًا معها؟"],
      ["practical", "none", 1, "كيف أتبرع لـ{name}، وهل التبرعات معفاة من الضرائب؟"],
      ["trust", "none", 1, "من يقف وراء {name}، وكيف يتم تمويل عملها؟"]
    ] },
  award: { skip: ["U1", "U3", "B1", "B2", "B3", "B4"], en: [
      ["discover", "none", 0, "Which {pl}{in_wide} exist for {offer}?", "o"],
      ["discover", "none", 0, "Which {pl}{in_wide} can I apply for this year?"],
      ["brand", "none", 1, "What is {name}, and who can apply?"],
      ["practical", "book", 1, "How do I apply for {name}, and what is the deadline?"],
      ["price", "price", 1, "How much is {name} worth, and what do winners receive?"],
      ["trust", "none", 1, "Who are past winners of {name}, and who is on the jury?"]
    ], fr: [
      ["discover", "none", 0, "Quels {pl}{in_wide} existent pour {offer} ?", "o"],
      ["discover", "none", 0, "Quels {pl}{in_wide} acceptent des candidatures cette année ?"],
      ["brand", "none", 1, "{name} : de quoi s'agit-il, et qui peut candidater ?"],
      ["practical", "book", 1, "{name} : comment candidater, et quelle est la date limite ?"],
      ["price", "price", 1, "{name} : quelle dotation, et que reçoivent les lauréats ?"],
      ["trust", "none", 1, "{name} : qui sont les anciens lauréats, et qui compose le jury ?"]
    ], de: [
      ["discover", "none", 0, "Welche {pl}{in_wide} gibt es für {offer}?", "o"],
      ["discover", "none", 0, "Für welche {pl}{in_wide} kann ich mich dieses Jahr bewerben?"],
      ["brand", "none", 1, "{name}: Worum geht es, und wer kann sich bewerben?"],
      ["practical", "book", 1, "{name}: Wie bewerbe ich mich, und wann ist Einsendeschluss?"],
      ["price", "price", 1, "{name}: Wie hoch ist die Dotierung, und was erhalten die Preisträger?"],
      ["trust", "none", 1, "{name}: Wer wurde bisher ausgezeichnet, und wer sitzt in der Jury?"]
    ], ar: [
      ["discover", "none", 0, "ما هي {pl}{in_wide} المخصصة لـ{offer}؟", "o"],
      ["discover", "none", 0, "ما هي {pl}{in_wide} التي يمكنني التقدم إليها هذا العام؟"],
      ["brand", "none", 1, "ما هي {name}، ومن يحق له التقدم؟"],
      ["practical", "book", 1, "كيف أتقدم إلى {name}، وما هو الموعد النهائي؟"],
      ["price", "price", 1, "ما قيمة {name}، وماذا يحصل الفائزون؟"],
      ["trust", "none", 1, "من هم الفائزون السابقون بـ{name}، ومن أعضاء لجنة التحكيم؟"]
    ] },
  knowledge: { skip: ["U3", "B1", "B2"], en: [
      ["discover", "none", 0, "Where can I find reliable information about {offer}{in_area}?", "o"],
      ["discover", "none", 0, "Which {pl} cover {offer}?", "o"],
      ["discover", "none", 0, "What are good online resources about {offer} for teaching?", "o"],
      ["brand", "none", 1, "What is {name}, and who created it?"],
      ["trust", "none", 1, "How reliable is {name}, and which sources does it use?"],
      ["practical", "none", 1, "Is {name} free to use, and can I use it in teaching?"]
    ], fr: [
      ["discover", "none", 0, "Où trouver des informations fiables sur {offer}{in_area} ?", "o"],
      ["discover", "none", 0, "Quels sont les {pl} sur {offer} ?", "o"],
      ["discover", "none", 0, "Quelles bonnes ressources en ligne sur {offer} pour l'enseignement ?", "o"],
      ["brand", "none", 1, "Qu'est-ce que {name}, et qui l'a créé ?"],
      ["trust", "none", 1, "{name} : quelle fiabilité, et sur quelles sources ?"],
      ["practical", "none", 1, "{name} : est-ce gratuit, et peut-on l'utiliser en classe ?"]
    ], de: [
      ["discover", "none", 0, "Wo finde ich verlässliche Informationen über {offer}{in_area}?", "o"],
      ["discover", "none", 0, "Welche {pl} gibt es zu {offer}?", "o"],
      ["discover", "none", 0, "Welche guten Online-Angebote zu {offer} gibt es für den Unterricht?", "o"],
      ["brand", "none", 1, "Was ist {name}, und wer steht dahinter?"],
      ["trust", "none", 1, "{name}: Wie verlässlich ist das, und auf welche Quellen stützt es sich?"],
      ["practical", "none", 1, "{name}: Ist die Nutzung kostenlos, und darf ich es im Unterricht einsetzen?"]
    ], ar: [
      ["discover", "none", 0, "أين أجد معلومات موثوقة عن {offer}{in_area}؟", "o"],
      ["discover", "none", 0, "ما هي {pl} التي تتناول {offer}؟", "o"],
      ["discover", "none", 0, "ما هي الموارد الجيدة على الإنترنت حول {offer} للتدريس؟", "o"],
      ["brand", "none", 1, "ما هو {name}، ومن أنشأه؟"],
      ["trust", "none", 1, "ما مدى موثوقية {name}، وما هي مصادره؟"],
      ["practical", "none", 1, "هل استخدام {name} مجاني، وهل يمكن استخدامه في التدريس؟"]
    ] },
  public: { skip: ["U1", "U3", "B1", "B2", "B4"], en: [
      ["discover", "none", 0, "What can I do{in_city} this weekend?", "m"],
      ["discover", "none", 0, "Is{in_city_bare} a good place to live? What are the pros and cons?", "m"],
      ["discover", "none", 0, "Which sights{in_city} are worth seeing?", "m"],
      ["practical", "none", 0, "How do I register my new address{in_city}?", "m"],
      ["practical", "book", 1, "What jobs does {name} offer, and how do I apply?", "m"],
      ["practical", "none", 0, "Where do I go for {offer}{in_city}?", "o"],
      ["discover", "none", 0, "What is happening{in_city} this week?"],
      ["practical", "hours", 1, "What are the opening hours of {name}, and do I need an appointment?"],
      ["practical", "book", 1, "How do I book an appointment with {name}?"],
      ["practical", "none", 1, "Which services can I complete online with {name}?"]
    ], fr: [
      ["discover", "none", 0, "Que faire{in_city} ce week-end ?", "m"],
      ["discover", "none", 0, "Fait-il bon vivre{in_city} ? Quels avantages et inconvénients ?", "m"],
      ["discover", "none", 0, "Quels sont les lieux à voir{in_city} ?", "m"],
      ["practical", "none", 0, "Comment déclarer ma nouvelle adresse{in_city} ?", "m"],
      ["practical", "book", 1, "{name} : quelles offres d'emploi, et comment postuler ?", "m"],
      ["practical", "none", 0, "Où m'adresser pour {offer}{in_city} ?", "o"],
      ["discover", "none", 0, "Que se passe-t-il{in_city} cette semaine ?"],
      ["practical", "hours", 1, "{name} : quels horaires, et faut-il un rendez-vous ?"],
      ["practical", "book", 1, "{name} : comment prendre rendez-vous ?"],
      ["practical", "none", 1, "{name} : quelles démarches peut-on faire en ligne ?"]
    ], de: [
      ["discover", "none", 0, "Was kann man am Wochenende{in_city} unternehmen?", "m"],
      ["discover", "none", 0, "Lebt es sich gut{in_city}? Was spricht dafür, was dagegen?", "m"],
      ["discover", "none", 0, "Welche Sehenswürdigkeiten{in_city} lohnen sich?", "m"],
      ["practical", "none", 0, "Wie melde ich meinen Wohnsitz{in_city} an?", "m"],
      ["practical", "book", 1, "{name}: Welche Stellen gibt es, und wie bewerbe ich mich?", "m"],
      ["practical", "none", 0, "Wohin wende ich mich{in_city} für {offer}?", "o"],
      ["discover", "none", 0, "Was ist diese Woche{in_city} los?"],
      ["practical", "hours", 1, "{name}: Wie sind die Öffnungszeiten, und brauche ich einen Termin?"],
      ["practical", "book", 1, "{name}: Wie buche ich einen Termin?"],
      ["practical", "none", 1, "{name}: Welche Anliegen kann ich online erledigen?"]
    ], ar: [
      ["discover", "none", 0, "ماذا يمكنني أن أفعل{in_city} في عطلة نهاية الأسبوع؟", "m"],
      ["discover", "none", 0, "هل العيش{in_city} جيد؟ ما الإيجابيات والسلبيات؟", "m"],
      ["discover", "none", 0, "ما هي المعالم التي تستحق الزيارة{in_city}؟", "m"],
      ["practical", "none", 0, "كيف أسجّل عنواني الجديد{in_city}؟", "m"],
      ["practical", "book", 1, "ما هي الوظائف التي تعرضها {name}، وكيف أتقدم إليها؟", "m"],
      ["practical", "none", 0, "إلى أين أتوجه من أجل {offer}{in_city}؟", "o"],
      ["discover", "none", 0, "ما الذي يحدث{in_city} هذا الأسبوع؟"],
      ["practical", "hours", 1, "ما هي مواعيد عمل {name}، وهل أحتاج إلى موعد؟"],
      ["practical", "book", 1, "كيف أحجز موعدًا لدى {name}؟"],
      ["practical", "none", 1, "ما هي الخدمات التي يمكنني إنجازها عبر الإنترنت لدى {name}؟"]
    ] },
  stay: { en: [
      ["discover", "none", 0, "Which {pl}{in_area} are good for families?"],
      ["discover", "none", 0, "Where should I stay{in_area} for a quiet, central base?"],
      ["price", "price", 0, "How much does {sg}{in_area} cost per night?"],
      ["practical", "where", 1, "Where exactly is {name}, and how do I get there?"],
      ["practical", "book", 1, "How do I book {name}, and is breakfast included?"]
    ], fr: [
      ["discover", "none", 0, "{Qpl}{in_area} pour une famille ?"],
      ["discover", "none", 0, "Où loger{in_area} pour être au calme et bien situé ?"],
      ["price", "price", 0, "Combien coûte une nuit{in_area} ?"],
      ["practical", "where", 1, "Où se trouve exactement {name}, et comment y aller ?"],
      ["practical", "book", 1, "Comment réserver chez {name}, et le petit-déjeuner est-il inclus ?"]
    ], de: [
      ["discover", "none", 0, "Welche {pl}{in_area} sind gut für Familien?"],
      ["discover", "none", 0, "Wo übernachte ich{in_area} ruhig und zentral?"],
      ["price", "price", 0, "Was kostet eine Übernachtung{in_area}?"],
      ["practical", "where", 1, "Wo genau liegt {name}, und wie komme ich hin?"],
      ["practical", "book", 1, "Wie buche ich {name}, und ist Frühstück inklusive?"]
    ], ar: [
      ["discover", "none", 0, "ما هي {pl}{in_area} المناسبة للعائلات؟"],
      ["discover", "none", 0, "أين أقيم{in_area} في مكان هادئ وقريب من المركز؟"],
      ["price", "price", 0, "كم تكلفة الليلة{in_area}؟"],
      ["practical", "where", 1, "أين يقع {name} بالضبط، وكيف أصل إليه؟"],
      ["practical", "book", 1, "كيف أحجز في {name}، وهل الفطور مشمول؟"]
    ] },
  food: { en: [
      ["discover", "none", 0, "Where can I eat well{in_area} tonight?"],
      ["discover", "none", 0, "Which {pl}{in_area} serve {offer}?", "o"],
      ["price", "price", 0, "How much does a meal at {sg}{in_area} cost?"],
      ["practical", "hours", 1, "When is {name} open?"],
      ["practical", "book", 1, "Can I book a table at {name}?"],
      ["practical", "none", 1, "Does {name} have vegetarian or vegan options?"]
    ], fr: [
      ["discover", "none", 0, "Où bien manger{in_area} ce soir ?"],
      ["discover", "none", 0, "{Qpl}{in_area} servent {offer} ?", "o"],
      ["price", "price", 0, "Combien coûte un repas dans {sg}{in_area} ?"],
      ["practical", "hours", 1, "Quels sont les horaires de {name} ?"],
      ["practical", "book", 1, "Peut-on réserver une table chez {name} ?"],
      ["practical", "none", 1, "{name} : y a-t-il des plats végétariens ou végans ?"]
    ], de: [
      ["discover", "none", 0, "Wo kann ich heute Abend{in_area} gut essen?"],
      ["discover", "none", 0, "Welche {pl}{in_area} bieten {offer} an?", "o"],
      ["price", "price", 0, "Mit welchen Preisen muss ich{in_area} für ein Abendessen rechnen?"],
      ["practical", "hours", 1, "Wann hat {name} geöffnet?"],
      ["practical", "book", 1, "Kann ich bei {name} einen Tisch reservieren?"],
      ["practical", "none", 1, "{name}: Gibt es vegetarische oder vegane Gerichte?"]
    ], ar: [
      ["discover", "none", 0, "أين آكل جيدًا{in_area} الليلة؟"],
      ["discover", "none", 0, "ما هي {pl}{in_area} التي تقدم {offer}؟", "o"],
      ["price", "price", 0, "كم تكلفة وجبة في {sg}{in_area}؟"],
      ["practical", "hours", 1, "متى يفتح {name}؟"],
      ["practical", "book", 1, "هل يمكن حجز طاولة في {name}؟"],
      ["practical", "none", 1, "هل يقدم {name} أطباقًا نباتية؟"]
    ] },
  health: { en: [
      ["discover", "none", 0, "Which {pl}{in_area} are taking new patients?"],
      ["discover", "none", 0, "Which {pl}{in_area} offer {offer}?", "o"],
      ["discover", "none", 0, "Which {pl}{in_area} speak English?"],
      ["practical", "book", 1, "How do I get an appointment at {name}, and how long is the wait?"],
      ["practical", "hours", 1, "What are {name}'s opening hours?"],
      ["price", "price", 1, "Does {name} accept my insurance, or do I pay privately?"]
    ], fr: [
      ["discover", "none", 0, "{Qpl}{in_area} acceptent de nouveaux patients ?"],
      ["discover", "none", 0, "{Qpl}{in_area} proposent {offer} ?", "o"],
      ["discover", "none", 0, "{Qpl}{in_area} parlent anglais ?"],
      ["practical", "book", 1, "Comment obtenir un rendez-vous chez {name}, et quel est le délai ?"],
      ["practical", "hours", 1, "Quels sont les horaires de {name} ?"],
      ["price", "price", 1, "{name} : quels remboursements, et faut-il avancer les frais ?"]
    ], de: [
      ["discover", "none", 0, "Welche {pl}{in_area} nehmen neue Patienten auf?"],
      ["discover", "none", 0, "Welche {pl}{in_area} bieten {offer} an?", "o"],
      ["discover", "none", 0, "In welchen {pl_dat}{in_area} wird Englisch gesprochen?"],
      ["practical", "book", 1, "Wie bekomme ich einen Termin bei {name}, und wie lange muss ich warten?"],
      ["practical", "hours", 1, "Wann hat {name} Sprechzeiten?"],
      ["price", "price", 1, "{name}: Werden gesetzlich Versicherte behandelt, oder nur privat?"]
    ], ar: [
      ["discover", "none", 0, "ما هي {pl}{in_area} التي تستقبل مرضى جددًا؟"],
      ["discover", "none", 0, "ما هي {pl}{in_area} التي تقدم {offer}؟", "o"],
      ["discover", "none", 0, "ما هي {pl}{in_area} التي يُتحدث فيها بالإنجليزية؟"],
      ["practical", "book", 1, "كيف أحصل على موعد في {name}، وكم مدة الانتظار؟"],
      ["practical", "hours", 1, "ما هي ساعات عمل {name}؟"],
      ["price", "price", 1, "هل يقبل {name} التأمين الصحي، أم أدفع على حسابي؟"]
    ] },
  legal: { en: [
      ["discover", "none", 0, "Which {pl}{in_area} handle {offer}?", "o"],
      ["discover", "none", 0, "Which {pl}{in_area} offer a free first consultation?"],
      ["price", "price", 0, "How much does a lawyer charge for {offer}{in_area}?", "o"],
      ["practical", "book", 1, "How do I get a first consultation with {name}?"],
      ["price", "price", 1, "How does {name} charge: fixed fee or hourly?"]
    ], fr: [
      ["discover", "none", 0, "{Qpl}{in_area} traitent {offer} ?", "o"],
      ["discover", "none", 0, "{Qpl}{in_area} proposent une première consultation gratuite ?"],
      ["price", "price", 0, "Combien coûte un avocat pour {offer}{in_area} ?", "o"],
      ["practical", "book", 1, "Comment obtenir une première consultation chez {name} ?"],
      ["price", "price", 1, "{name} : honoraires au forfait ou à l'heure ?"]
    ], de: [
      ["discover", "none", 0, "Welche {pl}{in_area} übernehmen {offer}?", "o"],
      ["discover", "none", 0, "Welche {pl}{in_area} bieten ein kostenloses Erstgespräch an?"],
      ["price", "price", 0, "Was kostet ein Anwalt für {offer}{in_area}?", "o"],
      ["practical", "book", 1, "Wie bekomme ich ein Erstgespräch bei {name}?"],
      ["price", "price", 1, "{name}: Pauschale oder Stundensatz?"]
    ], ar: [
      ["discover", "none", 0, "ما هي {pl}{in_area} التي تتولى {offer}؟", "o"],
      ["discover", "none", 0, "ما هي {pl}{in_area} التي تقدم استشارة أولى مجانية؟"],
      ["price", "price", 0, "كم يتقاضى المحامي في قضايا {offer}{in_area}؟", "o"],
      ["practical", "book", 1, "كيف أحصل على استشارة أولى لدى {name}؟"],
      ["price", "price", 1, "كيف يحتسب {name} أتعابه: مبلغ ثابت أم بالساعة؟"]
    ] },
  finance: { en: [
      ["discover", "none", 0, "Which {pl}{in_area} help with {offer}?", "o"],
      ["discover", "none", 0, "Which {pl}{in_area} work with small businesses and freelancers?"],
      ["price", "price", 0, "How much does {sg}{in_area} cost per month?"],
      ["practical", "book", 1, "How do I become a client of {name}?"],
      ["price", "price", 1, "How does {name} set its fees?"]
    ], fr: [
      ["discover", "none", 0, "{Qpl}{in_area} aident pour {offer} ?", "o"],
      ["discover", "none", 0, "{Qpl}{in_area} travaillent avec les petites entreprises et les indépendants ?"],
      ["price", "price", 0, "Combien coûte {sg}{in_area} par mois ?"],
      ["practical", "book", 1, "Comment devenir client de {name} ?"],
      ["price", "price", 1, "{name} : comment sont fixés les honoraires ?"]
    ], de: [
      ["discover", "none", 0, "Welche {pl}{in_area} helfen bei {offer}?", "o"],
      ["discover", "none", 0, "Welche {pl}{in_area} arbeiten mit kleinen Unternehmen und Selbstständigen?"],
      ["price", "price", 0, "Was kostet {sg}{in_area} im Monat?"],
      ["practical", "book", 1, "Wie werde ich Mandant bei {name}?"],
      ["price", "price", 1, "{name}: Wie werden die Honorare berechnet?"]
    ], ar: [
      ["discover", "none", 0, "ما هي {pl}{in_area} التي تساعد في {offer}؟", "o"],
      ["discover", "none", 0, "ما هي {pl}{in_area} التي تعمل مع الشركات الصغيرة والمستقلين؟"],
      ["price", "price", 0, "كم تكلفة {sg}{in_area} شهريًا؟"],
      ["practical", "book", 1, "كيف أصبح عميلًا لدى {name}؟"],
      ["price", "price", 1, "كيف يحدد {name} أتعابه؟"]
    ] },
  shop: { skip: ["U3"], en: [
      ["discover", "none", 0, "Where can I buy {offer} online?", "o"],
      ["discover", "none", 0, "Which {pl}{in_area} sell {offer2}?", "o"],
      ["price", "price", 0, "What does {offer} usually cost?", "o"],
      ["practical", "none", 1, "Does {name} deliver, and how do returns work?"],
      ["trust", "reviews", 1, "Is {name} a reliable shop?"],
      ["price", "price", 1, "Does {name} have discounts or free shipping?"]
    ], fr: [
      ["discover", "none", 0, "Où acheter {offer} en ligne ?", "o"],
      ["discover", "none", 0, "{Qpl}{in_area} vendent {offer2} ?", "o"],
      ["price", "price", 0, "Combien coûte {offer} en général ?", "o"],
      ["practical", "none", 1, "{name} livre-t-il, et comment fonctionnent les retours ?"],
      ["trust", "reviews", 1, "{name} est-il une boutique fiable ?"],
      ["price", "price", 1, "{name} : y a-t-il des promotions ou la livraison gratuite ?"]
    ], de: [
      ["discover", "none", 0, "Wo kann ich {offer} online kaufen?", "o"],
      ["discover", "none", 0, "Welche {pl}{in_area} verkaufen {offer2}?", "o"],
      ["price", "price", 0, "Was kostet {offer} normalerweise?", "o"],
      ["practical", "none", 1, "Liefert {name}, und wie funktionieren Rücksendungen?"],
      ["trust", "reviews", 1, "Ist {name} ein seriöser Shop?"],
      ["price", "price", 1, "{name}: Gibt es Rabatte oder kostenlosen Versand?"]
    ], ar: [
      ["discover", "none", 0, "أين أشتري {offer} عبر الإنترنت؟", "o"],
      ["discover", "none", 0, "ما هي {pl}{in_area} التي تبيع {offer2}؟", "o"],
      ["price", "price", 0, "كم يكلف {offer} عادة؟", "o"],
      ["practical", "none", 1, "هل يوصل {name}، وكيف يتم الإرجاع؟"],
      ["trust", "reviews", 1, "هل {name} متجر موثوق؟"],
      ["price", "price", 1, "هل لدى {name} تخفيضات أو توصيل مجاني؟"]
    ] },
  agency: { skip: ["U1", "U3", "B1", "B4"], en: [
      ["discover", "none", 0, "Which {pl} would you recommend for {aud}{in_area}?"],
      ["discover", "none", 0, "Who are the best providers of {offer}{in_area}?", "o"],
      ["service", "none", 0, "I need help with {offer2} for my business. Who should I hire?", "o"],
      ["discover", "none", 0, "What is {offer}, and do {aud} need it?", "o"],
      ["compare", "none", 0, "How do I choose {sg}? What should I compare?"],
      ["price", "price", 0, "How much does {offer} cost for {aud}{in_area}?", "o"],
      ["brand", "none", 1, "What does {name} do, and who is it for?"],
      ["compare", "none", 1, "What are the alternatives to {name}?"],
      ["service", "none", 1, "Can {name} help with {offer3}?", "o"],
      ["price", "price", 1, "How much does {name} charge?"],
      ["practical", "book", 1, "How do I start a project with {name}?"]
    ], fr: [
      ["discover", "none", 0, "{Qpl} me conseilles-tu pour les {aud}{in_area} ?"],
      ["discover", "none", 0, "Qui sont les meilleurs prestataires en {offer}{in_area} ?", "o"],
      ["service", "none", 0, "J'ai besoin d'aide en {offer2} pour mon entreprise. Qui engager ?", "o"],
      ["discover", "none", 0, "Qu'est-ce que {offer}, et les {aud} en ont-elles besoin ?", "o"],
      ["compare", "none", 0, "Comment choisir {sg} ? Que faut-il comparer ?"],
      ["price", "price", 0, "Quel budget prévoir pour {offer}{in_area} ?", "o"],
      ["brand", "none", 1, "Que fait {name}, et pour qui ?"],
      ["compare", "none", 1, "Quelles sont les alternatives à {name} ?"],
      ["service", "none", 1, "{name} peut-il aider en {offer3} ?", "o"],
      ["price", "price", 1, "Quels sont les tarifs de {name} ?"],
      ["practical", "book", 1, "Comment lancer un projet avec {name} ?"]
    ], de: [
      ["discover", "none", 0, "Welche {pl} empfiehlst du für {aud}{in_area}?"],
      ["discover", "none", 0, "Wer sind die besten Anbieter für {offer}{in_area}?", "o"],
      ["service", "none", 0, "Ich brauche Hilfe bei {offer2} für mein Unternehmen. Wen sollte ich beauftragen?", "o"],
      ["discover", "none", 0, "Was ist {offer}, und brauchen {aud} das?", "o"],
      ["compare", "none", 0, "Wie wähle ich {sg_acc} aus? Was sollte ich vergleichen?"],
      ["price", "price", 0, "Was kostet {offer} für {aud}{in_area}?", "o"],
      ["brand", "none", 1, "Was macht {name}, und für wen?"],
      ["compare", "none", 1, "Welche Alternativen gibt es zu {name}?"],
      ["service", "none", 1, "Kann {name} bei {offer3} helfen?", "o"],
      ["price", "price", 1, "Was kostet {name}?"],
      ["practical", "book", 1, "Wie starte ich ein Projekt mit {name}?"]
    ], ar: [
      ["discover", "none", 0, "أي {pl} تنصحني بها لـ{aud}{in_area}؟"],
      ["discover", "none", 0, "من أفضل مقدّمي خدمات {offer}{in_area}؟", "o"],
      ["service", "none", 0, "أحتاج مساعدة في {offer2} لشركتي. من أوظّف؟", "o"],
      ["discover", "none", 0, "ما هو {offer}، وهل تحتاجه {aud}؟", "o"],
      ["compare", "none", 0, "كيف أختار {sg}؟ ما الذي يجب أن أقارنه؟"],
      ["price", "price", 0, "كم تكلفة {offer} لـ{aud}{in_area}؟", "o"],
      ["brand", "none", 1, "ماذا تقدّم {name}، ولمن؟"],
      ["compare", "none", 1, "ما البدائل عن {name}؟"],
      ["service", "none", 1, "هل تستطيع {name} المساعدة في {offer3}؟", "o"],
      ["price", "price", 1, "كم تتقاضى {name}؟"],
      ["practical", "book", 1, "كيف أبدأ مشروعًا مع {name}؟"]
    ] },
  saas: { skip: ["U1", "U3", "B4"], en: [
      ["discover", "none", 0, "What is a good {bare} for {aud}?"],
      ["discover", "none", 0, "Which tool is best for {offer}?", "o"],
      ["compare", "none", 1, "What are the alternatives to {name}?"],
      ["price", "price", 1, "Does {name} have a free plan, and what do paid plans cost?"],
      ["practical", "none", 1, "Does {name} integrate with the tools I already use?"],
      ["trust", "none", 1, "Is {name} GDPR-compliant, and where is my data stored?"]
    ], fr: [
      ["discover", "none", 0, "Quel bon {bare} pour les {aud} ?"],
      ["discover", "none", 0, "Quel outil est le meilleur pour {offer} ?", "o"],
      ["compare", "none", 1, "Quelles sont les alternatives à {name} ?"],
      ["price", "price", 1, "{name} a-t-il une offre gratuite, et combien coûtent les offres payantes ?"],
      ["practical", "none", 1, "{name} s'intègre-t-il aux outils que j'utilise déjà ?"],
      ["trust", "none", 1, "{name} est-il conforme au RGPD, et où sont stockées mes données ?"]
    ], de: [
      ["discover", "none", 0, "Welche {bare} eignet sich für {aud}?"],
      ["discover", "none", 0, "Welches Tool ist am besten für {offer}?", "o"],
      ["compare", "none", 1, "Welche Alternativen gibt es zu {name}?"],
      ["price", "price", 1, "Hat {name} einen kostenlosen Tarif, und was kosten die bezahlten Tarife?"],
      ["practical", "none", 1, "Lässt sich {name} mit meinen bestehenden Tools verbinden?"],
      ["trust", "none", 1, "Ist {name} DSGVO-konform, und wo werden meine Daten gespeichert?"]
    ], ar: [
      ["discover", "none", 0, "ما هو أنسب {bare} لـ{aud}؟"],
      ["discover", "none", 0, "ما هي أفضل أداة لـ{offer}؟", "o"],
      ["compare", "none", 1, "ما البدائل عن {name}؟"],
      ["price", "price", 1, "هل لدى {name} خطة مجانية، وكم تكلف الخطط المدفوعة؟"],
      ["practical", "none", 1, "هل يتكامل {name} مع الأدوات التي أستخدمها؟"],
      ["trust", "none", 1, "هل {name} متوافق مع اللائحة العامة لحماية البيانات، وأين تُخزّن بياناتي؟"]
    ] },
  trades: { en: [
      ["discover", "none", 0, "Which {pl}{in_area} are reliable and available soon?"],
      ["discover", "none", 0, "Who can do {offer}{in_area}?", "o"],
      ["price", "price", 0, "How much does {offer} cost{in_area}?", "o"],
      ["price", "price", 0, "What does {sg}{in_area} charge per hour?", "!o"],
      ["practical", "book", 1, "How do I get a quote from {name}, and how soon can they come?"],
      ["practical", "where", 1, "Which areas does {name} cover?"]
    ], fr: [
      ["discover", "none", 0, "{Qpl}{in_area} sont fiables et disponibles rapidement ?"],
      ["discover", "none", 0, "Qui peut faire {offer}{in_area} ?", "o"],
      ["price", "price", 0, "Combien coûte {offer}{in_area} ?", "o"],
      ["price", "price", 0, "Quel est le tarif horaire de {sg}{in_area} ?", "!o"],
      ["practical", "book", 1, "Comment obtenir un devis de {name}, et dans quel délai ?"],
      ["practical", "where", 1, "{name} intervient dans quelles communes ?"]
    ], de: [
      ["discover", "none", 0, "Welche {pl}{in_area} sind zuverlässig und haben bald Zeit?"],
      ["discover", "none", 0, "Wer macht {offer}{in_area}?", "o"],
      ["price", "price", 0, "Was kostet {offer}{in_area}?", "o"],
      ["price", "price", 0, "Welchen Stundensatz verlangt {sg}{in_area}?", "!o"],
      ["practical", "book", 1, "Wie bekomme ich ein Angebot von {name}, und wie schnell geht es?"],
      ["practical", "where", 1, "In welchem Gebiet ist {name} tätig?"]
    ], ar: [
      ["discover", "none", 0, "من هم {pl}{in_area} الموثوقون والمتاحون قريبًا؟"],
      ["discover", "none", 0, "من يمكنه القيام بـ{offer}{in_area}؟", "o"],
      ["price", "price", 0, "كم تكلفة {offer}{in_area}؟", "o"],
      ["price", "price", 0, "كم يتقاضى {sg}{in_area} في الساعة؟", "!o"],
      ["practical", "book", 1, "كيف أحصل على عرض سعر من {name}، ومتى يمكنهم الحضور؟"],
      ["practical", "where", 1, "ما هي المناطق التي يغطيها {name}؟"]
    ] },
  beauty: { skip: ["U1"], en: [
      ["discover", "none", 0, "Which {pl}{in_area} have the best reviews?"],
      ["discover", "none", 0, "Where can I get {offer}{in_area}?", "o"],
      ["price", "price", 0, "How much does {offer} cost{in_area}?", "o"],
      ["practical", "book", 1, "How do I book an appointment at {name}?"],
      ["price", "price", 1, "What are {name}'s prices?"],
      ["practical", "hours", 1, "When is {name} open?"]
    ], fr: [
      ["discover", "none", 0, "{Qpl}{in_area} ont les meilleurs avis ?"],
      ["discover", "none", 0, "Où faire {offer}{in_area} ?", "o"],
      ["price", "price", 0, "Combien coûte {offer}{in_area} ?", "o"],
      ["practical", "book", 1, "Comment prendre rendez-vous chez {name} ?"],
      ["price", "price", 1, "Quels sont les tarifs de {name} ?"],
      ["practical", "hours", 1, "Quels sont les horaires de {name} ?"]
    ], de: [
      ["discover", "none", 0, "Welche {pl}{in_area} haben die besten Bewertungen?"],
      ["discover", "none", 0, "Wo bekomme ich {offer}{in_area}?", "o"],
      ["price", "price", 0, "Was kostet {offer}{in_area}?", "o"],
      ["practical", "book", 1, "Wie buche ich einen Termin bei {name}?"],
      ["price", "price", 1, "Was kostet es bei {name}?"],
      ["practical", "hours", 1, "Wann hat {name} geöffnet?"]
    ], ar: [
      ["discover", "none", 0, "ما هي {pl}{in_area} الأعلى تقييمًا؟"],
      ["discover", "none", 0, "أين يمكنني الحصول على {offer}{in_area}؟", "o"],
      ["price", "price", 0, "كم تكلفة {offer}{in_area}؟", "o"],
      ["practical", "book", 1, "كيف أحجز موعدًا في {name}؟"],
      ["price", "price", 1, "ما هي أسعار {name}؟"],
      ["practical", "hours", 1, "متى يفتح {name}؟"]
    ] },
  fitness: { en: [
      ["discover", "none", 0, "Which {pl}{in_area} are good for beginners?"],
      ["discover", "none", 0, "Where can I do {offer}{in_area}?", "o"],
      ["price", "price", 0, "How much does a membership cost{in_area}?"],
      ["practical", "book", 1, "Can I try {name} for free before I sign up?"],
      ["practical", "hours", 1, "What are {name}'s opening hours and class times?"],
      ["price", "price", 1, "What does a membership at {name} cost, and can I cancel monthly?"]
    ], fr: [
      ["discover", "none", 0, "{Qpl}{in_area} conviennent aux débutants ?"],
      ["discover", "none", 0, "Où faire du {offer}{in_area} ?", "o"],
      ["price", "price", 0, "Combien coûte un abonnement{in_area} ?"],
      ["practical", "book", 1, "Peut-on essayer {name} gratuitement avant de s'inscrire ?"],
      ["practical", "hours", 1, "{name} : quels horaires et quel planning des cours ?"],
      ["price", "price", 1, "{name} : combien coûte l'abonnement, et peut-on résilier chaque mois ?"]
    ], de: [
      ["discover", "none", 0, "Welche {pl}{in_area} sind gut für Anfänger?"],
      ["discover", "none", 0, "Wo kann ich{in_area} {offer} machen?", "o"],
      ["price", "price", 0, "Was kostet eine Mitgliedschaft{in_area}?"],
      ["practical", "book", 1, "Kann ich {name} vor der Anmeldung kostenlos testen?"],
      ["practical", "hours", 1, "{name}: Wie sind die Öffnungszeiten und Kurszeiten?"],
      ["price", "price", 1, "{name}: Was kostet die Mitgliedschaft, und ist sie monatlich kündbar?"]
    ], ar: [
      ["discover", "none", 0, "ما هي {pl}{in_area} المناسبة للمبتدئين؟"],
      ["discover", "none", 0, "أين يمكنني ممارسة {offer}{in_area}؟", "o"],
      ["price", "price", 0, "كم تكلفة الاشتراك{in_area}؟"],
      ["practical", "book", 1, "هل يمكنني تجربة {name} مجانًا قبل الاشتراك؟"],
      ["practical", "hours", 1, "ما هي مواعيد فتح {name} وأوقات الحصص؟"],
      ["price", "price", 1, "كم يكلف الاشتراك في {name}، وهل يمكن إلغاؤه شهريًا؟"]
    ] },
  realestate: { en: [
      ["discover", "none", 0, "Which {pl}{in_area} would you recommend for selling a property?"],
      ["discover", "none", 0, "How do I find a flat to rent or buy{in_area}?"],
      ["price", "price", 0, "How much commission does {sg}{in_area} charge?"],
      ["practical", "none", 1, "Which properties does {name} currently have on offer?"],
      ["practical", "book", 1, "How do I get a valuation from {name}?"]
    ], fr: [
      ["discover", "none", 0, "{Qpl}{in_area} me conseilles-tu pour vendre un bien ?"],
      ["discover", "none", 0, "Comment trouver un logement à louer ou à acheter{in_area} ?"],
      ["price", "price", 0, "Quels honoraires prend {sg}{in_area} ?"],
      ["practical", "none", 1, "Quels biens {name} propose-t-il en ce moment ?"],
      ["practical", "book", 1, "Comment obtenir une estimation de {name} ?"]
    ], de: [
      ["discover", "none", 0, "Welche {pl}{in_area} empfiehlst du für den Verkauf einer Immobilie?"],
      ["discover", "none", 0, "Wie finde ich{in_area} eine Wohnung zur Miete oder zum Kauf?"],
      ["price", "price", 0, "Wie hoch ist die Provision bei {sg_dat}{in_area}?"],
      ["practical", "none", 1, "Welche Objekte hat {name} gerade im Angebot?"],
      ["practical", "book", 1, "Wie bekomme ich eine Bewertung von {name}?"]
    ], ar: [
      ["discover", "none", 0, "ما هي {pl}{in_area} التي تنصحني بها لبيع عقار؟"],
      ["discover", "none", 0, "كيف أجد شقة للإيجار أو للشراء{in_area}؟"],
      ["price", "price", 0, "كم عمولة {sg}{in_area}؟"],
      ["practical", "none", 1, "ما هي العقارات التي يعرضها {name} حاليًا؟"],
      ["practical", "book", 1, "كيف أحصل على تقييم لعقاري من {name}؟"]
    ] },
  travel: { skip: ["U3"], en: [
      ["discover", "none", 0, "What are the best things to do{in_area}?"],
      ["discover", "none", 0, "Which tours or trips{in_area} would you recommend?"],
      ["discover", "none", 0, "Who offers {offer}{in_area}?", "o"],
      ["price", "price", 0, "How much does a guided tour{in_area} cost?"],
      ["practical", "book", 1, "How do I book with {name}, and what is the cancellation policy?"]
    ], fr: [
      ["discover", "none", 0, "Que faire{in_area} ?"],
      ["discover", "none", 0, "Quelles visites ou excursions{in_area} me conseilles-tu ?"],
      ["discover", "none", 0, "Qui propose {offer}{in_area} ?", "o"],
      ["price", "price", 0, "Combien coûte une visite guidée{in_area} ?"],
      ["practical", "book", 1, "Comment réserver avec {name}, et quelles sont les conditions d'annulation ?"]
    ], de: [
      ["discover", "none", 0, "Was sollte man{in_area} unbedingt machen?"],
      ["discover", "none", 0, "Welche Touren oder Ausflüge{in_area} empfiehlst du?"],
      ["discover", "none", 0, "Wer bietet {offer}{in_area} an?", "o"],
      ["price", "price", 0, "Was kostet eine Führung{in_area}?"],
      ["practical", "book", 1, "Wie buche ich bei {name}, und wie sind die Stornobedingungen?"]
    ], ar: [
      ["discover", "none", 0, "ما هي أفضل الأشياء التي يمكن القيام بها{in_area}؟"],
      ["discover", "none", 0, "ما هي الجولات أو الرحلات{in_area} التي تنصحني بها؟"],
      ["discover", "none", 0, "من يقدم {offer}{in_area}؟", "o"],
      ["price", "price", 0, "كم تكلفة جولة إرشادية{in_area}؟"],
      ["practical", "book", 1, "كيف أحجز مع {name}، وما هي شروط الإلغاء؟"]
    ] },
  media: { skip: ["U3", "B2", "B4"], en: [
      ["discover", "none", 0, "Which {pl} report reliably on {offer}?", "o"],
      ["trust", "none", 1, "How reliable is {name}, and who is behind it?"],
      ["practical", "none", 1, "How can I subscribe to {name}, and what does it cost?"],
      ["practical", "contact", 1, "How can I pitch a story to {name}?"]
    ], fr: [
      ["discover", "none", 0, "Quels {pl} traitent sérieusement de {offer} ?", "o"],
      ["trust", "none", 1, "{name} : quelle fiabilité, et qui est derrière ?"],
      ["practical", "none", 1, "Comment s'abonner à {name}, et combien cela coûte-t-il ?"],
      ["practical", "contact", 1, "Comment proposer un sujet à {name} ?"]
    ], de: [
      ["discover", "none", 0, "Welche {pl} berichten verlässlich über {offer}?", "o"],
      ["trust", "none", 1, "Wie verlässlich ist {name}, und wer steht dahinter?"],
      ["practical", "none", 1, "Wie kann ich {name} abonnieren, und was kostet das?"],
      ["practical", "contact", 1, "Wie biete ich {name} ein Thema an?"]
    ], ar: [
      ["discover", "none", 0, "ما هي {pl} التي تغطي {offer} بموثوقية؟", "o"],
      ["trust", "none", 1, "ما مدى موثوقية {name}، ومن يقف وراءه؟"],
      ["practical", "none", 1, "كيف أشترك في {name}، وكم التكلفة؟"],
      ["practical", "contact", 1, "كيف أقترح موضوعًا على {name}؟"]
    ] },
  generic: { en: [
      ["discover", "none", 0, "Who offers {offer}{in_area}?", "o"],
      ["practical", "where", 1, "Where is {name} based?"]
    ], fr: [
      ["discover", "none", 0, "Qui propose {offer}{in_area} ?", "o"],
      ["practical", "where", 1, "Où est situé {name} ?"]
    ], de: [
      ["discover", "none", 0, "Wer bietet {offer}{in_area} an?", "o"],
      ["practical", "where", 1, "Wo sitzt {name}?"]
    ], ar: [
      ["discover", "none", 0, "من يقدم {offer}{in_area}؟", "o"],
      ["practical", "where", 1, "أين يقع مقر {name}؟"]
    ] }
};

const AUD = { en: "small businesses", fr: "petites entreprises", de: "kleine Unternehmen", ar: "الشركات الصغيرة" };

// German case forms: accusative / dative of the singular noun phrase
function deCases(sg, gender) {
  if (gender === "m") return { acc: sg.replace(/^ein /, "einen "), dat: sg.replace(/^ein /, "einem ") };
  if (gender === "n") return { acc: sg, dat: sg.replace(/^ein /, "einem ") };
  return { acc: sg, dat: sg.replace(/^eine /, "einer ") };
}
const DE_DAT_PL = (pl) => /n$/.test(pl) || /s$/.test(pl) ? pl : pl + "n";

function nouns(p, L) {
  let sub = subById(p.sub) || defaultSubFor(p.kind);
  const custom = p.customCategory && !p.customMatched ? p.customCategory : "";
  if (p.customMatched) sub = subById(p.sub) || sub;
  if (L === "en") {
    const bare = custom || sub.en[0];
    const pl = custom ? custom : sub.en[1];
    return { sg: (/^[aeiou]/i.test(bare) && !/^(uni|eu|one|use)/i.test(bare) ? "an " : "a ") + bare, pl, Qpl: "Which " + pl, bare, other: "another " + bare };
  }
  if (L === "fr") {
    const [sg, pl, f] = custom ? [(/e$/i.test(custom) ? "une " : "un ") + custom, custom, /e$/i.test(custom) ? 1 : 0] : sub.fr;
    const bare = sg.replace(/^(un|une)\s+/, "");
    return { sg, pl, Qpl: (f ? "Quelles " : "Quels ") + pl, bare, other: (f ? "une autre " : "un autre ") + bare };
  }
  if (L === "de") {
    const [sg, pl, g] = custom ? ["ein Anbieter für " + custom, "Anbieter für " + custom, "m"] : sub.de;
    const bare = sg.replace(/^(ein|eine)\s+/, "");
    const c = deCases(sg, g);
    return { sg, pl, Qpl: "Welche " + pl, bare, other: (g === "f" ? "eine andere " : g === "m" ? "ein anderer " : "ein anderes ") + bare, sg_acc: c.acc, sg_dat: c.dat, pl_dat: DE_DAT_PL(pl), g };
  }
  const [sg, pl] = custom ? [custom, custom] : sub.ar;
  return { sg, pl, Qpl: pl, bare: sg, other: "خيار آخر" };
}

function wherePhrases(p, L) {
  const city = p.city ? inCity(L, p.city) : "";
  const reg = p.region ? inRegion(L, p.region) : "";
  const ctry = p.country ? inCountry(L, p.country) : "";
  const wide = ctry || reg || city;
  const area = isWide(p.kind) ? (reg || ctry || city) : (city || reg || ctry);
  return { in_city: city, in_wide: wide, in_area: area, in_city_bare: p.city ? " " + p.city : "" };
}

function casing(offer, L) {
  if (!offer) return "";
  if (L === "ar") return offer;
  if (L === "de") {
    // adjectives are lower-case inside a sentence: "zeitgenössische Kunst"
    return offer.replace(/^([A-ZÄÖÜ][a-zäöüß]+(?:e|en|er|es|em))\s+(?=[A-ZÄÖÜ])/, (m, a) => /^(Deutsche|Europäische)$/.test(a) ? m : a.toLowerCase() + " ");
  }
  if (/^[A-Z0-9]{2,}\b/.test(offer)) return offer; // acronyms
  if (/^[A-Z][\p{L}-]*\s+(?:(?:and|of|&|et|de|des|du)\s+)?[A-Z]/u.test(offer)) return offer; // Title Case names: "Business Administration"
  return offer[0].toLowerCase() + offer.slice(1);
}
function fill(tpl, v) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
}
export function polish(t, L) {
  if (L === "en") t = t.replace(/\ba ([aeiouAEIOU][a-z])/g, (m, w) => /^(uni|eu|use|one)/i.test(w) ? m : "an " + w).replace(/\ban (uni|eu|use|one)/gi, "a $1");
  if (L === "fr") t = t.replace(/\b(de|que|le|la|à le|du) (?=[aeiouyàâéèêëîïôûhAEIOUYÀÂÉÈÊÎÔÛ])/g, (_, w) => w === "que" ? "qu'" : w === "de" ? "d'" : w === "du" ? "de l'" : "l'").replace(/\bà les\b/g, "aux").replace(/\bà le\b/g, "au").replace(/\bde les\b/g, "des").replace(/\bde le\b/g, "du").replace(/d'\{/g, "de {");
  return t.replace(/\s+([?؟!:])/g, L === "fr" ? " $1" : "$1").replace(/ ,/g, ",").replace(/\s{2,}/g, " ").replace(/^\s+|\s+$/g, "").replace(/^([a-zà-ÿ])/, (c) => c.toUpperCase());
}

export function predict(p, extra = []) {
  const L = ["en", "fr", "de", "ar"].includes(p.lang) ? p.lang : "en";
  const kd = K[p.kind] || K.generic;
  const n = nouns(p, L);
  const offers = (p.services || []).map((o) => casing(o, L));
  const where = wherePhrases(p, L);
  const people = (PEOPLE[p.kind] || PEOPLE.generic)[["en", "fr", "de", "ar"].indexOf(L)];
  const aud = p.audience || AUD[L];
  const v = { ...n, ...where, name: p.name, people, aud, offer: offers[0] || "", offer2: offers[1] || offers[0] || "", offer3: offers[2] || offers[1] || offers[0] || "" };
  const intl = !!p.intl;
  const base = BASE[L];
  const baseList = ["U1", "U3", "B1", "B2", "B3", "B4"].filter((id) => !(kd.skip || []).includes(id)).map((id) => {
    const t = [...base[id]];
    if (L === "de" && id === "U3") t[3] = DE_U3[n.g] || DE_U3.f;
    return t;
  });
  const spec = kd[L] || [];
  const k2 = p.kind2 && K[p.kind2] && p.kind2 !== p.kind ? K[p.kind2][L] || [] : [];
  const n2 = k2.length ? nouns({ ...p, sub: p.sub2, kind: p.kind2, customCategory: "" }, L) : null;
  const extra2 = k2.filter((t) => !t[2] && !/\{(sg|pl|Qpl|bare|other|sg_acc|sg_dat|pl_dat)\}/.test(t[3]) === false).slice(0, 2).map((t) => [...t.slice(0, 3), t[3], t[4] || "", n2]);
  const ordered = [
    ...spec.filter((t) => !t[2]),
    ...extra2,
    ...baseList.filter((t) => !t[2]),
    ...spec.filter((t) => t[2]),
    ...baseList.filter((t) => t[2])
  ];
  const out = [];
  for (const [intent, aspect, branded, tpl, flags = "", alt] of ordered) {
    const f = flags.split(/\s+/);
    if (f.includes("o") && !offers.length) continue;
    if (f.includes("!o") && offers.length) continue;
    if (f.includes("i") && !intl) continue;
    if (f.includes("!i") && intl) continue;
    if (f.includes("m") && !(p.sub === "municipality" && p.city)) continue;
    if (!p.name && branded) continue;
    let s = polish(fill(tpl, alt ? { ...v, ...alt } : v), L);
    if (!s || s.length < 8) continue;
    if (out.some((q) => norm(q.text) === norm(s))) continue;
    out.push({ id: "q" + (out.length + 1), text: s, intent, aspect, branded: !!branded, by: "sada" });
  }
  for (const e of extra) {
    const s = String(e).replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").replace(/\*\*/g, "").replace(/^["“«]|["”»]$/g, "").trim();
    if (s.length < 12 || s.length > 180 || out.some((q) => norm(q.text) === norm(s))) continue;
    const branded = !!p.name && norm(s).includes(norm(p.name));
    out.push({ id: "q" + (out.length + 1), text: s, intent: guessIntent(s), aspect: guessAspect(s), branded, by: "ai" });
  }
  // unbranded first (stable), keep the list short enough to test
  const unb = out.filter((q) => !q.branded), br = out.filter((q) => q.branded);
  return [...unb.slice(0, 9), ...br.slice(0, 9)].map((q, i) => ({ ...q, id: "q" + (i + 1) }));
}

const ASPECT_Q = [
  ["price", /(price|cost|how much|fee|tuition|budget|cheap|prix|tarif|coût|combien|frais|preis|kosten|kostet|gebühr|günstig|سعر|اسعار|تكلف|كم|رسوم)/i],
  ["hours", /(open|hours|horaire|ouvert|öffnungszeit|geöffnet|sprechzeit|ساعات|يفتح|مواعيد)/i],
  ["book", /(book|reserv|appointment|apply|application|enrol|sign up|rendez-vous|réserv|postuler|candidat|inscri|buchen|termin|bewerb|anmeld|حجز|موعد|أتقدم|أسجل)/i],
  ["where", /(where|located|address|get there|où|adresse|wo |liegt|anfahrt|أين|عنوان)/i],
  ["reviews", /(review|rating|reliable|trust|what do .* say|avis|fiable|bewertung|seriös|was sagen|تقييم|موثوق)/i],
  ["contact", /(contact|phone|email|call|joindre|kontakt|erreich|تواصل|هاتف)/i]
];
export function guessAspect(s) {
  for (const [a, re] of ASPECT_Q) if (re.test(s)) return a;
  return "none";
}
export function guessIntent(s) {
  const a = guessAspect(s);
  if (a === "price") return "price";
  if (a === "reviews") return "trust";
  if (a !== "none") return "practical";
  if (/(vs|versus|compare|alternative|choose|choisir|comparer|wählen|vergleich|بدائل|أختار|or another|ou un autre|oder ein)/i.test(s)) return "compare";
  return "discover";
}

// Prompt for the on-device model (Gemini Nano). Gives it the sector so it stops guessing.
export function aiPrompt(p) {
  const L = { en: "English", fr: "French", de: "German", ar: "Arabic" }[p.lang] || "English";
  const sub = subById(p.sub) || defaultSubFor(p.kind);
  const who = { uni: "prospective students", school: "parents and pupils", training: "people looking for a course", culture: "visitors, teachers and tourists", nonprofit: "volunteers, donors and partners", award: "applicants, artists and journalists", knowledge: "teachers, students, researchers and journalists", public: "residents", agency: "business owners", saas: "teams choosing software" }[p.kind] || "customers";
  const where = [p.city, p.region, p.country].filter(Boolean).join(", ");
  return {
    system: `You predict what people ask AI assistants. Write in ${L}. Output only a numbered list, one question per line.`,
    user: `Organisation: "${p.name}". Type: ${sub.en[0]}.${where ? ` Location: ${where}.` : ""}${p.services?.length ? ` Main offers or topics: ${p.services.slice(0, 4).join(", ")}.` : ""}${p.audience ? ` Audience: ${p.audience}.` : ""}
Write 6 different questions that ${who} type into ChatGPT, Perplexity or Google AI Mode BEFORE they choose an organisation like this one. Use the real words of that sector (for example "study programme", "admission", "opening hours", "exhibition", "donate"). Mix: finding options, comparing, cost or practical details, trust. At most 2 questions may contain "${p.name}". Never mention languages as places.`
  };
}
