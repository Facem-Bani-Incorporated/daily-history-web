// build/lib/i18n.js — every user-visible string the generator emits, per language.
//
// Nothing here falls back to English. A missing string would put English text on
// a /de/ page, which is exactly the mixed-language page the archive must avoid,
// so `t()` throws instead of degrading quietly.
'use strict';

const STRINGS = {
  en: {
    htmlLang: 'en',
    ogLocale: 'en_US',
    langName: 'English',
    archiveTitle: 'On This Day in History',
    archiveIntro: 'Every story we have published, newest first. One true, surprising story from history for each day.',
    archiveMetaDesc: 'The full archive of Daily History — one true story from history for every day, with maps, images and sources.',
    todayEyebrow: 'Today in history',
    storyEyebrow: 'On this day',
    readMore: 'Read the full story',
    prevDay: 'Previous day',
    nextDay: 'Next day',
    allStories: 'All stories',
    backToArchive: 'Browse the full archive',
    sourceLabel: 'Source',
    locationLabel: 'Where it happened',
    ctaTitle: 'A story like this, every morning',
    ctaBody: 'Daily History sends you one true story from the past each day — with the map, a quiz, and a streak worth keeping.',
    pageLabel: 'Page',
    olderStories: 'Older stories',
    newerStories: 'Newer stories',
    imageCredit: 'Image',
    storiesCount: (n) => `${n} ${n === 1 ? 'story' : 'stories'}`,
    metaDescFallback: (title) => `${title} — the full story, with images, location and sources.`,
    altText: (title, place) => place ? `${title} — ${place}` : title,
    titleSuffix: 'Daily History',
    // "23 July 1914" style, used inside prose where Intl's full date is too heavy
    breadcrumbHome: 'Home',
  },

  es: {
    htmlLang: 'es',
    ogLocale: 'es_ES',
    langName: 'Español',
    archiveTitle: 'Un día como hoy en la historia',
    archiveIntro: 'Todas las historias que hemos publicado, de la más reciente a la más antigua. Una historia real y sorprendente para cada día.',
    archiveMetaDesc: 'El archivo completo de Daily History: una historia real del pasado para cada día, con mapas, imágenes y fuentes.',
    todayEyebrow: 'Hoy en la historia',
    storyEyebrow: 'Un día como hoy',
    readMore: 'Leer la historia completa',
    prevDay: 'Día anterior',
    nextDay: 'Día siguiente',
    allStories: 'Todas las historias',
    backToArchive: 'Ver el archivo completo',
    sourceLabel: 'Fuente',
    locationLabel: 'Dónde ocurrió',
    ctaTitle: 'Una historia así, cada mañana',
    ctaBody: 'Daily History te envía una historia real del pasado cada día: con el mapa, un test y una racha que merece la pena mantener.',
    pageLabel: 'Página',
    olderStories: 'Historias anteriores',
    newerStories: 'Historias más recientes',
    imageCredit: 'Imagen',
    storiesCount: (n) => `${n} ${n === 1 ? 'historia' : 'historias'}`,
    metaDescFallback: (title) => `${title}: la historia completa, con imágenes, lugar y fuentes.`,
    altText: (title, place) => place ? `${title} — ${place}` : title,
    titleSuffix: 'Daily History',
    breadcrumbHome: 'Inicio',
  },

  de: {
    htmlLang: 'de',
    ogLocale: 'de_DE',
    langName: 'Deutsch',
    archiveTitle: 'Was geschah an diesem Tag',
    archiveIntro: 'Alle bisher veröffentlichten Geschichten, die neuesten zuerst. Für jeden Tag eine wahre, überraschende Geschichte.',
    archiveMetaDesc: 'Das vollständige Archiv von Daily History — für jeden Tag eine wahre Geschichte aus der Vergangenheit, mit Karten, Bildern und Quellen.',
    todayEyebrow: 'Heute in der Geschichte',
    storyEyebrow: 'An diesem Tag',
    readMore: 'Die ganze Geschichte lesen',
    prevDay: 'Vorheriger Tag',
    nextDay: 'Nächster Tag',
    allStories: 'Alle Geschichten',
    backToArchive: 'Zum vollständigen Archiv',
    sourceLabel: 'Quelle',
    locationLabel: 'Wo es geschah',
    ctaTitle: 'Jeden Morgen so eine Geschichte',
    ctaBody: 'Daily History schickt dir täglich eine wahre Geschichte aus der Vergangenheit — mit Karte, Quiz und einer Serie, die sich zu halten lohnt.',
    pageLabel: 'Seite',
    olderStories: 'Ältere Geschichten',
    newerStories: 'Neuere Geschichten',
    imageCredit: 'Bild',
    storiesCount: (n) => `${n} ${n === 1 ? 'Geschichte' : 'Geschichten'}`,
    metaDescFallback: (title) => `${title} — die ganze Geschichte, mit Bildern, Ort und Quellen.`,
    altText: (title, place) => place ? `${title} — ${place}` : title,
    titleSuffix: 'Daily History',
    breadcrumbHome: 'Startseite',
  },

  fr: {
    htmlLang: 'fr',
    ogLocale: 'fr_FR',
    langName: 'Français',
    archiveTitle: "C'est arrivé un jour comme aujourd'hui",
    archiveIntro: "Toutes les histoires publiées, de la plus récente à la plus ancienne. Une histoire vraie et surprenante pour chaque jour.",
    archiveMetaDesc: "Les archives complètes de Daily History : une histoire vraie du passé pour chaque jour, avec cartes, images et sources.",
    todayEyebrow: "Aujourd'hui dans l'histoire",
    storyEyebrow: 'Un jour comme aujourd’hui',
    readMore: "Lire l'histoire complète",
    prevDay: 'Jour précédent',
    nextDay: 'Jour suivant',
    allStories: 'Toutes les histoires',
    backToArchive: 'Parcourir toutes les archives',
    sourceLabel: 'Source',
    locationLabel: "Où cela s'est passé",
    ctaTitle: 'Une histoire comme celle-ci, chaque matin',
    ctaBody: "Daily History vous envoie chaque jour une histoire vraie du passé — avec la carte, un quiz et une série qui vaut la peine d'être tenue.",
    pageLabel: 'Page',
    olderStories: 'Histoires plus anciennes',
    newerStories: 'Histoires plus récentes',
    imageCredit: 'Image',
    storiesCount: (n) => `${n} ${n === 1 ? 'histoire' : 'histoires'}`,
    metaDescFallback: (title) => `${title} — l'histoire complète, avec images, lieu et sources.`,
    altText: (title, place) => place ? `${title} — ${place}` : title,
    titleSuffix: 'Daily History',
    breadcrumbHome: 'Accueil',
  },

  ro: {
    htmlLang: 'ro',
    ogLocale: 'ro_RO',
    langName: 'Română',
    archiveTitle: 'În această zi din istorie',
    archiveIntro: 'Toate poveștile publicate până acum, de la cele mai noi la cele mai vechi. O poveste adevărată și surprinzătoare pentru fiecare zi.',
    archiveMetaDesc: 'Arhiva completă Daily History — o poveste adevărată din trecut pentru fiecare zi, cu hărți, imagini și surse.',
    todayEyebrow: 'Astăzi în istorie',
    storyEyebrow: 'În această zi',
    readMore: 'Citește povestea completă',
    prevDay: 'Ziua anterioară',
    nextDay: 'Ziua următoare',
    allStories: 'Toate poveștile',
    backToArchive: 'Vezi arhiva completă',
    sourceLabel: 'Sursă',
    locationLabel: 'Unde s-a întâmplat',
    ctaTitle: 'O poveste ca asta, în fiecare dimineață',
    ctaBody: 'Daily History îți trimite zilnic o poveste adevărată din trecut — cu harta, un test și o serie pe care merită să o ții.',
    pageLabel: 'Pagina',
    olderStories: 'Povești mai vechi',
    newerStories: 'Povești mai noi',
    imageCredit: 'Imagine',
    storiesCount: (n) => `${n} ${n === 1 ? 'poveste' : 'povești'}`,
    metaDescFallback: (title) => `${title} — povestea completă, cu imagini, loc și surse.`,
    altText: (title, place) => place ? `${title} — ${place}` : title,
    titleSuffix: 'Daily History',
    breadcrumbHome: 'Acasă',
  },
};

// Strings for the app-promotion surfaces. Kept in their own table because they
// share one job — the web page tells the story, the app is where the quiz, the
// map and the streak live — and that promise has to read the same in every
// language. Merged into STRINGS below so t() reaches them normally.
const APP_STRINGS = {
  en: {
    openApp: 'Get the app',
    stickyTitle: 'Read tomorrow’s story first',
    stickyBody: 'Quiz, map and streak',
    stickyCta: 'Get it',
    stickyDismiss: 'Dismiss',
    kbdHint: "Use the arrow keys to move between days",
    quizCardTitle: 'This story has a quiz waiting',
    quizCardBody: 'Answer three questions in the app, earn XP, and keep your streak alive.',
    quizCardCta: 'Open in Daily History',
  },
  es: {
    openApp: 'Descargar la app',
    stickyTitle: 'Lee antes la historia de mañana',
    stickyBody: 'Test, mapa y racha',
    stickyCta: 'Descargar',
    stickyDismiss: 'Cerrar',
    kbdHint: "Usa las flechas para moverte entre días",
    quizCardTitle: 'Esta historia tiene un test esperándote',
    quizCardBody: 'Responde tres preguntas en la app, gana XP y mantén viva tu racha.',
    quizCardCta: 'Abrir en Daily History',
  },
  de: {
    openApp: 'App holen',
    stickyTitle: 'Lies die Geschichte von morgen zuerst',
    stickyBody: 'Quiz, Karte und Serie',
    stickyCta: 'Holen',
    stickyDismiss: 'Schließen',
    kbdHint: "Mit den Pfeiltasten zwischen den Tagen wechseln",
    quizCardTitle: 'Zu dieser Geschichte wartet ein Quiz',
    quizCardBody: 'Beantworte drei Fragen in der App, sammle XP und halte deine Serie am Leben.',
    quizCardCta: 'In Daily History öffnen',
  },
  fr: {
    openApp: "Obtenir l'app",
    stickyTitle: "Lisez l'histoire de demain en avant-première",
    stickyBody: 'Quiz, carte et série',
    stickyCta: 'Obtenir',
    stickyDismiss: 'Fermer',
    kbdHint: "Utilisez les flèches pour naviguer entre les jours",
    quizCardTitle: 'Un quiz vous attend sur cette histoire',
    quizCardBody: "Répondez à trois questions dans l'app, gagnez de l'XP et gardez votre série.",
    quizCardCta: 'Ouvrir dans Daily History',
  },
  ro: {
    openApp: 'Ia aplicația',
    stickyTitle: 'Citește prima povestea de mâine',
    stickyBody: 'Test, hartă și serie',
    stickyCta: 'Descarcă',
    stickyDismiss: 'Închide',
    kbdHint: "Folosește săgețile ca să treci de la o zi la alta",
    quizCardTitle: 'Povestea asta are un test care te așteaptă',
    quizCardBody: 'Răspunde la trei întrebări în aplicație, câștigi XP și îți ții seria.',
    quizCardCta: 'Deschide în Daily History',
  },
};

for (const lang of Object.keys(APP_STRINGS)) {
  Object.assign(STRINGS[lang], APP_STRINGS[lang]);
}

// The API's ECategory enum, spelled out per language. Used as a visible label and
// as the Article's articleSection, so it has to read naturally, not like an enum.
const CATEGORIES = {
  war_conflict:      { en: 'War & conflict',       es: 'Guerra y conflicto',      de: 'Krieg & Konflikt',        fr: 'Guerre et conflit',        ro: 'Război și conflict' },
  tech_innovation:   { en: 'Technology',           es: 'Tecnología',              de: 'Technik',                 fr: 'Technologie',              ro: 'Tehnologie' },
  science_discovery: { en: 'Science & discovery',  es: 'Ciencia y descubrimiento',de: 'Wissenschaft & Entdeckung',fr: 'Science et découverte',   ro: 'Știință și descoperire' },
  politics_state:    { en: 'Politics & state',     es: 'Política y Estado',       de: 'Politik & Staat',         fr: 'Politique et État',        ro: 'Politică și stat' },
  culture_arts:      { en: 'Culture & arts',       es: 'Cultura y arte',          de: 'Kultur & Kunst',          fr: 'Culture et arts',          ro: 'Cultură și artă' },
  natural_disaster:  { en: 'Natural disaster',     es: 'Desastre natural',        de: 'Naturkatastrophe',        fr: 'Catastrophe naturelle',    ro: 'Dezastru natural' },
  exploration:       { en: 'Exploration',          es: 'Exploración',             de: 'Entdeckungsreisen',       fr: 'Exploration',              ro: 'Explorare' },
  religion_phil:     { en: 'Religion & philosophy',es: 'Religión y filosofía',    de: 'Religion & Philosophie',  fr: 'Religion et philosophie',  ro: 'Religie și filosofie' },
  media:             { en: 'Media',                es: 'Medios',                  de: 'Medien',                  fr: 'Médias',                   ro: 'Media' },
  sport:             { en: 'Sport',                es: 'Deporte',                 de: 'Sport',                   fr: 'Sport',                    ro: 'Sport' },
  personalities:     { en: 'People',               es: 'Personajes',              de: 'Persönlichkeiten',        fr: 'Personnalités',            ro: 'Personalități' },
};

const INTL_LOCALE = { en: 'en-GB', es: 'es-ES', de: 'de-DE', fr: 'fr-FR', ro: 'ro-RO' };

function t(lang, key) {
  const table = STRINGS[lang];
  if (!table) throw new Error(`i18n: unknown language "${lang}"`);
  const value = table[key];
  if (value === undefined) throw new Error(`i18n: missing key "${key}" for language "${lang}"`);
  return value;
}

function categoryLabel(lang, category) {
  const row = CATEGORIES[category];
  // An unmapped category is a new enum value on the server. Returning null lets
  // the template omit the chip rather than print a raw enum at the reader.
  if (!row || !row[lang]) return null;
  return row[lang];
}

/** "23 July 1914" / "23 iulie 1914" — the historical date, spelled out. */
function formatDate(lang, isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat(INTL_LOCALE[lang], {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Short form for dense lists: "23 Jul 1914". */
function formatDateShort(lang, isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat(INTL_LOCALE[lang], {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

module.exports = { t, categoryLabel, formatDate, formatDateShort, STRINGS, CATEGORIES, INTL_LOCALE };
