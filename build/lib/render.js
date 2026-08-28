// build/lib/render.js — every page's HTML. Fully formed at build time; nothing
// here waits on JavaScript to become readable.
'use strict';

const { SITE_URL, SITE_NAME, LANGS, DEFAULT_LANG } = require('./config');
const { t, categoryLabel, formatDate, formatDateShort, INTL_LOCALE } = require('./i18n');
const {
  esc, clamp, head, jsonLd, jsonLdIndex, storyPath, indexPath, landingPath,
} = require('./seo');
const COPY = require('./landing-copy.json');

const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.rexinus.dailyhistorymobile';
const IOS_URL = 'https://apps.apple.com/us/app/daily-history-on-this-day/id6768552706';

const FONTS = 'https://fonts.googleapis.com/css2'
  + '?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600'
  + '&family=Inter:wght@400;500;600'
  + '&display=swap';

/* ------------------------------- shared chrome ------------------------------ */

function shell({ lang, headTags, bodyClass = '', content, extraCss = true }) {
  return `<!DOCTYPE html>
<html lang="${t(lang, 'htmlLang')}">
<head>
  ${headTags}

  <link rel="icon" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/logo-sm.jpg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="${FONTS}" />
  <link rel="stylesheet" href="/assets/site.css" />
  ${extraCss ? '<link rel="stylesheet" href="/assets/story.css" />' : ''}
  <script src="/assets/site.js" defer></script>
</head>
<body class="${bodyClass}">
  <div class="progress" aria-hidden="true"></div>
  <div class="glow" aria-hidden="true"></div>
${content}
</body>
</html>
`;
}

function masthead(lang) {
  return `  <header class="masthead" id="masthead">
    <a class="mast-brand" href="${landingPath(lang)}">
      <img class="mast-logo" src="/logo-sm.jpg" alt="" width="28" height="28" />
      <span class="mast-word">Daily&nbsp;History</span>
    </a>
    <nav class="mast-nav">
      <a class="mast-link mast-link--archive" href="${indexPath(lang)}">${esc(t(lang, 'allStories'))}</a>
      <a class="btn-app" data-store="android" data-smart-store data-placement="header"
         href="${PLAY_URL}" target="_blank" rel="noopener">${esc(t(lang, 'openApp'))}</a>
    </nav>
  </header>`;
}

function siteFooter(lang, available, pathFor) {
  const langLinks = LANGS.filter((l) => available.includes(l)).map((l) =>
    `<a href="${pathFor(l)}" hreflang="${l}"${l === lang ? ' class="on" aria-current="true"' : ''}>${esc(t(l, 'langName'))}</a>`,
  ).join('');

  return `  <!-- ad slot: footer (intentionally empty) -->
  <div class="ad-slot ad-slot--footer" data-ad-slot="footer"></div>

  <footer>
    <div class="foot-in">
      <div class="foot-langs">${langLinks}</div>
      <div class="foot-links">
        <a href="${indexPath(lang)}">${esc(t(lang, 'allStories'))}</a>
        <a href="/privacy.html">Privacy</a>
        <a href="/terms.html">Terms</a>
        <a href="mailto:razvanstefan.dogaru@gmail.com">Contact</a>
      </div>
      <div class="foot-rule"></div>
      <div class="foot-copy">© ${new Date().getUTCFullYear()} ${esc(SITE_NAME)}</div>
    </div>
  </footer>`;
}

/** Markup matches what site.js expects: .store-btn for tracking, a
 *  play.google.com href for the install referrer. Do not rename without
 *  updating site.js. */
function storeButtons(lang, placement) {
  const c = COPY[lang];
  return `<div class="stores">
        <a class="store-btn primary" data-store="ios" data-placement="${placement}" href="${IOS_URL}" target="_blank" rel="noopener">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.365 1.43c0 1.14-.42 2.21-1.13 3.02-.86.99-2.27 1.76-3.42 1.66-.14-1.1.42-2.27 1.06-3 .73-.84 2.04-1.49 3.49-1.68zM20.94 17.06c-.52 1.2-1.16 2.39-2.16 3.77-.92 1.27-2.01 2.85-3.42 2.87-1.26.02-1.58-.83-3.29-.82-1.71.01-2.06.84-3.32.81-1.4-.02-2.45-1.43-3.37-2.7C1.69 17.66.78 12.4 2.94 8.99c.99-1.59 2.65-2.62 4.41-2.65 1.27-.02 2.47.86 3.29.86.82 0 2.42-1.06 4.08-.9.7.03 2.66.28 3.92 2.13-.1.06-2.34 1.37-2.31 4.07.02 3.23 2.83 4.31 2.86 4.32-.02.07-.45 1.55-1.48 3.14z"/></svg>
          <span class="lbl"><small>${esc(c.iosSmall)}</small><span>App Store</span></span>
        </a>
        <a class="store-btn secondary" data-store="android" data-placement="${placement}" href="${PLAY_URL}" target="_blank" rel="noopener">
          <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3.9 2.4c-.3.3-.5.7-.5 1.3v16.6c0 .6.2 1 .5 1.3l9.1-9.3L3.9 2.4z"/><path fill="currentColor" d="m13 12.3 3.8 3.8 3.9-2.2c.7-.4.7-1.4 0-1.8l-3.9-2.2L13 12.3z"/><path fill="currentColor" d="M4 2.3 16.4 9l-3.4 3.3L4 2.3z"/><path fill="currentColor" d="M4 22.3 13 13l3.4 3.3L4 22.3z"/></svg>
          <span class="lbl"><small>${esc(c.androidSmall)}</small><span>Google Play</span></span>
        </a>
      </div>`;
}

function stickyBar(lang) {
  return `  <div class="app-bar" id="app-bar" hidden>
    <img src="/logo-sm.jpg" alt="" width="32" height="32" class="app-bar-logo" />
    <span class="app-bar-text">
      <strong>${esc(t(lang, 'stickyTitle'))}</strong>
      <small>${esc(t(lang, 'stickyBody'))}</small>
    </span>
    <a class="app-bar-cta" data-store="android" data-smart-store data-placement="sticky"
       href="${PLAY_URL}" target="_blank" rel="noopener">${esc(t(lang, 'stickyCta'))}</a>
    <button class="app-bar-close" type="button" aria-label="${esc(t(lang, 'stickyDismiss'))}">&times;</button>
  </div>`;
}

/* ---------------------------------- motion ---------------------------------- */

/**
 * Wrap each word so the reveal can cascade across a headline.
 *
 * The words stay ordinary text in the DOM: a crawler reads the headline exactly
 * as before, and it can still be selected and copied. Only the wrapper is new.
 * Escaping happens per word, so the markup is safe for any headline.
 */
function splitWords(text, { scroll = false } = {}) {
  const words = String(text).split(/\s+/).filter(Boolean);
  return `<span class="words${scroll ? ' w-scroll' : ''}">` + words.map((word, i) =>
    `<span class="w"${scroll ? '' : ` style="--i:${i}"`}><i>${esc(word)}</i></span>`,
  ).join(' ') + '</span>';
}

/**
 * Split "200+" into the number that counts up and the part that does not, so
 * the counter animates to a real value and the suffix stays put.
 */
function statParts(value) {
  const m = String(value).match(/^(\D*)(\d[\d\s.,]*)(.*)$/);
  if (!m) return { prefix: esc(value), n: null, suffix: '' };
  const n = parseInt(m[2].replace(/[\s.,]/g, ''), 10);
  if (!Number.isFinite(n)) return { prefix: esc(value), n: null, suffix: '' };
  return { prefix: esc(m[1]), n, suffix: esc(m[3]) };
}

function statMarkup(value) {
  const { prefix, n, suffix } = statParts(value);
  if (n === null) return prefix + suffix;
  return `${prefix}<span class="val" style="--to:${n}"></span>${suffix}`;
}

/** "July 2026" in the page's own language, for the archive rails. */
function monthLabel(lang, isoDate) {
  const [y, m] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat(INTL_LOCALE[lang], { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, 1)));
}

/* ---------------------------------- figures --------------------------------- */

function imgTag(image, alt, { eager = false, sizes, className = '', vt = false }) {
  if (vt) className = (className ? className + ' ' : '') + 'vt-hero-img';
  const sorted = [...image.sources].sort((a, b) => a.width - b.width);
  const largest = sorted[sorted.length - 1];
  const srcset = sorted.map((s) => `${s.src} ${s.width}w`).join(', ');
  return `<img${className ? ` class="${className}"` : ''} src="${esc(largest.src)}" srcset="${esc(srcset)}"
               sizes="${esc(sizes)}" width="${largest.width}" height="${largest.height}"
               alt="${esc(alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''} />`;
}

function creditLine(lang, credit) {
  if (!credit || (!credit.artist && !credit.license)) return '';
  const who = credit.descriptionUrl
    ? `<a href="${esc(credit.descriptionUrl)}" rel="noopener nofollow" target="_blank">${esc(credit.artist || 'Wikimedia Commons')}</a>`
    : esc(credit.artist || 'Wikimedia Commons');
  const lic = credit.license
    ? ` · ${credit.licenseUrl
        ? `<a href="${esc(credit.licenseUrl)}" rel="license noopener nofollow" target="_blank">${esc(credit.license)}</a>`
        : esc(credit.license)}`
    : '';
  return `${esc(t(lang, 'imageCredit'))}: ${who}${lic}`;
}

/* ================================ LANDING ================================== */

function renderLanding({ lang, day, stories, langAvailable, recent, archiveCount }) {
  const c = COPY[lang];
  const locale = INTL_LOCALE[lang];
  const [y, m, d] = day.date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayNum = new Intl.DateTimeFormat(locale, { day: 'numeric', timeZone: 'UTC' }).format(dt);
  const monthYear = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(dt);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(dt);

  const lead = stories[0];
  const second = stories[1] || null;

  const headTags = head({
    lang,
    title: c.metaTitle,
    description: c.metaDesc,
    canonical: landingPath(lang),
    available: LANGS,
    pathFor: (l) => landingPath(l),
    image: lead.images[0] ? { ...lead.images[0].sources[lead.images[0].sources.length - 1], alt: lead.alt } : null,
    type: 'website',
  }) + `
  <meta name="keywords" content="${esc(c.keywords)}" />
  <meta name="apple-itunes-app" content="app-id=6768552706">
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SITE_NAME, url: SITE_URL,
        inLanguage: lang,
        publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL, logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo-sm.jpg` } },
      },
      {
        '@type': 'SoftwareApplication', name: SITE_NAME,
        operatingSystem: 'iOS, Android', applicationCategory: 'EducationalApplication',
        offers: { '@type': 'Offer', price: '0', priceCurrency: c.currency || 'USD' },
        description: c.schemaDesc,
      },
    ],
  }).replace(/</g, '\\u003c')}</script>`;

  const leadFig = lead.images[0] ? `      <figure class="fig lead-figure">
        ${imgTag(lead.images[0], lead.alt, { eager: true, vt: true, sizes: '(min-width: 900px) 42vw, 100vw' })}
        <figcaption>${creditLine(lang, lead.images[0].credit)}</figcaption>
      </figure>` : '';

  const secondBlock = second ? `  <section class="shell runner">
    <div class="grid">
      ${second.images[0] ? `<figure class="fig runner-fig rv-wipe">
        ${imgTag(second.images[0], second.alt, { sizes: '(min-width: 900px) 38vw, 100vw' })}
        <figcaption>${creditLine(lang, second.images[0].credit)}</figcaption>
      </figure>` : ''}
      <div class="runner-text rv">
        ${second.categoryLabel ? `<span class="lead-cat">${esc(second.categoryLabel)}</span>` : ''}
        <h2 class="runner-title"><a class="link-draw" href="${storyPath(lang, day.date)}#story-${second.id}">${esc(second.title)}</a></h2>
        <p class="lead-hook">${esc(second.description)}</p>
        <p class="lead-meta">
          <time datetime="${esc(second.eventDate)}">${esc(formatDate(lang, second.eventDate))}</time>
          ${second.location ? `<span class="sep"></span><span>${esc(second.location)}</span>` : ''}
        </p>
      </div>
    </div>
  </section>` : '';

  const offers = c.features.map((f, i) => `        <div class="offer-item rv">
          <span class="offer-num">${String(i + 1).padStart(2, '0')}</span>
          <h3 class="offer-h">${esc(f.h)}</h3>
          <p class="offer-p">${esc(f.p)}</p>
        </div>`).join('\n');

  const stats = c.stats.map((s) => `        <div class="stat rv"><b>${statMarkup(s.n)}</b><span>${esc(s.l)}</span></div>`).join('\n');

  const strip = recent.map((e) => `        <a class="strip-row rv" href="${storyPath(lang, e.date)}">
          <span class="strip-date">${esc(formatDateShort(lang, e.date))}</span>
          <span class="strip-title">${esc(e.headline)}</span>
          <span class="strip-go" aria-hidden="true">→</span>
        </a>`).join('\n');

  const content = `${masthead(lang)}
  <main>

    <!-- The day's lead story, above everything else. -->
    <section class="shell lead">
      <div class="grid">
        <div class="lead-date enter enter-1">
          <span class="d-num">${esc(dayNum)}</span>
          <span class="d-rest">
            <span class="d-month">${esc(monthYear)}</span>
            <span class="d-meta">${esc(weekday)} · ${esc(t(lang, 'storiesCount')(archiveCount))}</span>
          </span>
        </div>

        <div class="lead-text">
          ${lead.categoryLabel ? `<span class="lead-cat enter enter-2">${esc(lead.categoryLabel)}</span>` : ''}
          <h1 class="lead-title enter enter-2">
            <a class="link-draw vt-hero-title" href="${storyPath(lang, day.date)}">${splitWords(lead.title)}</a>
          </h1>
          <p class="lead-hook enter enter-3">${esc(lead.description)}</p>
          <p class="lead-meta enter enter-3">
            <time datetime="${esc(lead.eventDate)}">${esc(formatDate(lang, lead.eventDate))}</time>
            ${lead.location ? `<span class="sep"></span><span>${esc(lead.location)}</span>` : ''}
          </p>
          <a class="lead-cta link-draw enter enter-4" href="${storyPath(lang, day.date)}">
            ${esc(t(lang, 'readMore'))} <span class="arrow">→</span>
          </a>
        </div>

${leadFig}
      </div>
    </section>

${secondBlock}

    <!-- What the app adds, as an editorial list rather than feature cards. -->
    <section class="shell section" id="app">
      <div class="grid">
        <div class="section-head rv">
          <span class="eyebrow">${esc(c.featEyebrow)}</span>
          <h2 class="section-title">${esc(c.featTitle)}</h2>
          <p class="lede section-intro">${esc(c.tagline)}</p>
        </div>
        <div class="offer">
${offers}
        </div>
      </div>
    </section>

    <section class="shell">
      <div class="grid">
        <div class="stats">
${stats}
        </div>
      </div>
    </section>

    <!-- ad slot: mid (intentionally empty) -->
    <div class="ad-slot ad-slot--mid" data-ad-slot="mid"></div>

    <section class="shell section">
      <div class="grid">
        <div class="section-head rv">
          <span class="eyebrow">${esc(t(lang, 'allStories'))}</span>
          <h2 class="section-title">${esc(t(lang, 'archiveTitle'))}</h2>
        </div>
        <div class="strip">
${strip}
        </div>
        <p class="archive-back rv" style="grid-column:1/-1;margin-top:1.6rem">
          <a class="link-draw" href="${indexPath(lang)}">${esc(t(lang, 'backToArchive'))} →</a>
        </p>
      </div>
    </section>

    <section class="shell section">
      <div class="grid">
        <div class="signup rv">
          <span class="eyebrow">${esc(t(lang, 'todayEyebrow'))}</span>
          <h2 class="section-title">${esc(c.captureH2)}</h2>
          <p class="lede section-intro">${esc(c.captureP)}</p>
          <form class="email-form" novalidate>
            <input type="email" name="email" placeholder="${esc(c.emailPlaceholder)}" autocomplete="email" required />
            <button type="submit">${esc(c.emailBtn)}</button>
          </form>
          <p class="email-done">${esc(c.emailDone)}</p>
          <p class="email-note">${esc(c.emailNote)}</p>
        </div>
      </div>
    </section>

    <section class="shell section" style="padding-top:0">
      <div class="grid">
        <div class="signup rv">
          <h2 class="section-title">${esc(t(lang, 'ctaTitle'))}</h2>
          <p class="lede section-intro" style="margin-bottom:1.8rem">${esc(t(lang, 'ctaBody'))}</p>
          ${storeButtons(lang, 'landing')}
        </div>
      </div>
    </section>

  </main>
${siteFooter(lang, langAvailable, (l) => landingPath(l))}
${stickyBar(lang)}`;

  return shell({ lang, headTags, bodyClass: 'landing', content });
}

/* ================================= STORY =================================== */

/**
 * "The Long Read" panel: the chapter list of the app's long-form article.
 *
 * Deliberately the table of contents and not the prose. Two reasons, and they point
 * the same way: the API never sends a guest the body text, and giving the long read
 * away on the web would remove the reason to subscribe in the app. A visible list of
 * six real chapter titles is a stronger install argument than any "download for more"
 * button — the reader can see precisely what they are not getting.
 *
 * For search it is the difference between another thin "on this day" page and one
 * that demonstrably sits on top of a 2,000-word researched article.
 */
function longReadBlock(lang, lr) {
  if (!lr) return '';
  const items = lr.chapters
    .map((c, i) => `            <li><span class="lr-num">${roman(i + 1)}</span>${esc(c)}</li>`)
    .join('\n');
  const meta = t(lang, 'longReadMeta')(lr.wordCount, lr.chapters.length, lr.minutes, lr.sourceCount);
  return `        <aside class="long-read" aria-labelledby="lr-${lr.chapters.length}-${lang}">
          <p class="lr-kicker" id="lr-${lr.chapters.length}-${lang}">${esc(t(lang, 'longReadLabel'))}</p>
          <p class="lr-meta">${esc(meta)}</p>
          ${lr.teaser ? `<p class="lr-teaser">${esc(lr.teaser)}</p>` : ''}
          <ol class="lr-chapters">
${items}
          </ol>
          <p class="lr-cta">${esc(t(lang, 'longReadCta'))}</p>
        </aside>`;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const roman = (n) => ROMAN[n - 1] || String(n);

function paragraphs(narrative) {
  return String(narrative).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

/** Social cards crop to about 1.91:1, so a tall scan — common in this archive —
 *  gets centre-cropped into nonsense. Prefer the widest landscape image. */
function pickSocialImage(lead, stories) {
  const candidates = stories.flatMap((s) => s.images.map((img) => ({ img, alt: s.alt })));
  if (!candidates.length) return null;
  const landscape = candidates.filter(({ img }) => img.width > img.height)
    .sort((a, b) => b.img.width - a.img.width)[0];
  const chosen = landscape || { img: lead.images[0] || candidates[0].img, alt: lead.alt };
  if (!chosen.img) return null;
  const largest = chosen.img.sources[chosen.img.sources.length - 1];
  return { ...largest, alt: chosen.alt };
}

function quizCard(lang) {
  return `      <aside class="quiz-card rv">
        <!-- Not a heading: an offer is not a section of the story, and an h3
             here would precede the second story's h2 in the outline. -->
        <p class="quiz-card-title">${esc(t(lang, 'quizCardTitle'))}</p>
        <p>${esc(t(lang, 'quizCardBody'))}</p>
        <a class="quiz-card-cta" data-store="android" data-smart-store data-placement="inline"
           href="${PLAY_URL}" target="_blank" rel="noopener">${esc(t(lang, 'quizCardCta'))} →</a>
      </aside>`;
}

function renderStoryPage({ lang, date, stories, available, prev, next }) {
  const dateLabel = formatDate(lang, date);
  const lead = stories[0];

  // Headlines run 60–90 characters. Cutting one to fit a site-name suffix costs
  // more than a long title does — search engines truncate the display, they do
  // not penalise the length — so nothing here clips the headline.
  //
  // The headline alone is not unique: the pipeline reuses one for consecutive
  // days of the same event ("Genocidul din Rwanda" on both 6 and 7 April), and
  // proper nouns like "Juneteenth" are identical across languages. The event's
  // own historical date separates them, and it is what a reader is searching
  // for anyway. The publication date would read as if the event happened in
  // 2026, so it is deliberately not used here.
  const eventDay = formatDate(lang, lead.eventDate);
  const base = `${lead.title} — ${eventDay}`;
  const title = base.length + t(lang, 'titleSuffix').length + 3 <= 62
    ? `${base} | ${t(lang, 'titleSuffix')}`
    : base;
  const description = clamp(lead.description || t(lang, 'metaDescFallback')(lead.title));
  const canonical = storyPath(lang, date);

  const breadcrumb = [
    { name: t(lang, 'breadcrumbHome'), path: landingPath(lang) },
    { name: t(lang, 'archiveTitle'), path: indexPath(lang) },
    { name: dateLabel, path: canonical },
  ];

  const headTags = head({
    lang, title, description, canonical, available,
    pathFor: (l) => storyPath(l, date),
    image: pickSocialImage(lead, stories),
    publishedDate: `${date}T06:00:00+00:00`,
    modifiedDate: `${date}T06:00:00+00:00`,
    type: 'article',
  }) + '\n\n  ' + jsonLd({ lang, date, stories, canonical, breadcrumb });

  const articles = stories.map((s, idx) => {
    const paras = paragraphs(s.narrative);
    const H = idx === 0 ? 'h1' : 'h2';

    const figs = s.images.map((img, i) => `        <figure class="fig story-fig${i % 2 ? ' story-fig--right' : ''}${idx === 0 && i === 0 ? '' : ' rv-wipe'}">
          ${imgTag(img, s.alt, {
            eager: idx === 0 && i === 0,
            // Only the lead story's first image may carry the shared name: a
            // view-transition-name must be unique in the document.
            vt: idx === 0 && i === 0,
            sizes: '(min-width: 1000px) 780px, 100vw',
          })}
          <figcaption class="fig-credit">${creditLine(lang, img.credit)}</figcaption>
        </figure>`);

    const hero = figs[0] || '';
    const rest = figs.slice(1);
    const body = paras.map((p, i) => `<p${i === 0 && idx === 0 ? ' class="lede"' : ''}>${esc(p)}</p>`);

    // Spread the remaining images through the text so a long read keeps a
    // visual rhythm instead of ending in a pile of pictures.
    const woven = [];
    const step = rest.length ? Math.max(2, Math.floor(body.length / (rest.length + 1))) : 0;
    body.forEach((p, i) => {
      woven.push(p);
      if (step && i > 0 && i % step === 0 && rest.length) woven.push(rest.shift());
    });
    woven.push(...rest);

    return `      <article class="story" id="story-${s.id}">
        ${s.categoryLabel ? `<span class="story-cat">${esc(s.categoryLabel)}</span>` : ''}
        <${H} class="story-title${idx === 0 ? ' vt-hero-title' : ''}">${
          idx === 0 ? splitWords(s.title) : splitWords(s.title, { scroll: true })
        }</${H}>
        <p class="story-when">
          <time datetime="${esc(s.eventDate)}">${esc(formatDate(lang, s.eventDate))}</time>
          ${s.location ? `<span class="sep"></span><span class="story-where">${esc(s.location)}</span>` : ''}
        </p>
${hero}
        <div class="story-body">
          ${woven.join('\n          ')}
        </div>
${longReadBlock(lang, s.longRead)}
        ${s.sourceUrl ? `<p class="story-source">${esc(t(lang, 'sourceLabel'))}: <a href="${esc(s.sourceUrl)}" rel="noopener nofollow" target="_blank">${esc(prettyUrl(s.sourceUrl))}</a></p>` : ''}
      </article>`;
  });

  const articlesHtml = articles.length > 1
    ? [articles[0], quizCard(lang), ...articles.slice(1)].join('\n\n')
    : articles.join('\n\n');

  const nav = `      <nav class="day-nav" aria-label="${esc(t(lang, 'allStories'))}">
        ${prev ? `<a class="day-nav-item prev" href="${storyPath(lang, prev)}" rel="prev">
          <span class="day-nav-label">← ${esc(t(lang, 'prevDay'))}</span>
          <span class="day-nav-date">${esc(formatDateShort(lang, prev))}</span>
        </a>` : '<span class="day-nav-item empty"></span>'}
        ${next ? `<a class="day-nav-item next" href="${storyPath(lang, next)}" rel="next">
          <span class="day-nav-label">${esc(t(lang, 'nextDay'))} →</span>
          <span class="day-nav-date">${esc(formatDateShort(lang, next))}</span>
        </a>` : '<span class="day-nav-item empty"></span>'}
      </nav>
      <p class="kbd-hint">${esc(t(lang, 'kbdHint'))} <kbd>←</kbd><kbd>→</kbd></p>`;

  const content = `${masthead(lang)}
  <main>
    <div class="article-shell">
      <div class="dateline">
        <span class="eyebrow">${esc(t(lang, 'storyEyebrow'))}</span>
        <p class="dateline-date"><time datetime="${esc(date)}">${esc(dateLabel)}</time></p>
        <p class="dateline-count">${esc(t(lang, 'storiesCount')(stories.length))}</p>
      </div>

${articlesHtml}

      <!-- ad slot: between story and CTA (intentionally empty) -->
      <div class="ad-slot ad-slot--mid" data-ad-slot="mid"></div>

      <aside class="story-cta rv">
        <span class="eyebrow">${esc(t(lang, 'todayEyebrow'))}</span>
        <h2>${esc(t(lang, 'ctaTitle'))}</h2>
        <p>${esc(t(lang, 'ctaBody'))}</p>
        ${storeButtons(lang, 'story')}
      </aside>

${nav}

      <p class="archive-back"><a class="link-draw" href="${indexPath(lang)}">${esc(t(lang, 'backToArchive'))} →</a></p>
    </div>
  </main>
${siteFooter(lang, available, (l) => storyPath(l, date))}
${stickyBar(lang)}`;

  return shell({ lang, headTags, bodyClass: 'doc-page', content });
}

function prettyUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') + decodeURIComponent(u.pathname).replace(/_/g, ' ');
  } catch { return url; }
}

/* ================================= INDEX =================================== */

function renderIndexPage({ lang, page, totalPages, entries, langAvailable }) {
  const canonical = indexPath(lang, page);
  const isFirst = page <= 1;
  const title = isFirst
    ? `${t(lang, 'archiveTitle')} | ${t(lang, 'titleSuffix')}`
    : `${t(lang, 'archiveTitle')} — ${t(lang, 'pageLabel')} ${page} | ${t(lang, 'titleSuffix')}`;

  const breadcrumb = [
    { name: t(lang, 'breadcrumbHome'), path: landingPath(lang) },
    { name: t(lang, 'archiveTitle'), path: indexPath(lang) },
  ];

  const headTags = head({
    lang, title, description: clamp(t(lang, 'archiveMetaDesc')), canonical,
    available: langAvailable, pathFor: (l) => indexPath(l, page), type: 'website',
  })
    + (page > 1 ? `\n  <link rel="prev" href="${SITE_URL}${indexPath(lang, page - 1)}" />` : '')
    + (page < totalPages ? `\n  <link rel="next" href="${SITE_URL}${indexPath(lang, page + 1)}" />` : '')
    + '\n\n  ' + jsonLdIndex({ lang, canonical, entries, breadcrumb });

  // Group by month so a 60-entry page reads as a timeline rather than a list,
  // and so the jump rail above it has something to land on.
  const months = [];
  for (const e of entries) {
    const key = e.date.slice(0, 7);
    if (!months.length || months[months.length - 1].key !== key) {
      months.push({ key, label: monthLabel(lang, e.date), entries: [] });
    }
    months[months.length - 1].entries.push(e);
  }

  const jump = months.length > 1 ? `      <nav class="month-jump" aria-label="${esc(t(lang, 'pageLabel'))}">
${months.map((m) => `        <a href="#m-${m.key}">${esc(m.label)}</a>`).join('\n')}
      </nav>` : '';

  const items = months.map((m) => `        <li class="month-head" id="m-${m.key}" role="presentation">
          ${esc(m.label)} <span>${esc(t(lang, 'storiesCount')(m.entries.length))}</span>
        </li>
${m.entries.map((e) => {
    const thumb = e.image ? e.image.sources[0] : null;
    return `        <li class="arch-item">
          <a class="arch-link" href="${storyPath(lang, e.date)}">
            ${thumb ? `<img class="arch-thumb" src="${esc(thumb.src)}" width="${thumb.width}" height="${thumb.height}" alt="" loading="lazy" decoding="async" />`
                    : '<span class="arch-thumb arch-thumb--empty" aria-hidden="true"></span>'}
            <span class="arch-text">
              <time class="arch-date" datetime="${esc(e.date)}">${esc(formatDateShort(lang, e.date))}</time>
              <span class="arch-title">${esc(e.headline)}</span>
              ${e.categoryLabel ? `<span class="arch-cat">${esc(e.categoryLabel)}</span>` : ''}
            </span>
            <span class="arch-go" aria-hidden="true">→</span>
          </a>
        </li>`;
  }).join('\n')}`).join('\n');

  const pager = totalPages > 1 ? `      <nav class="pager" aria-label="${esc(t(lang, 'pageLabel'))}">
        ${page > 1 ? `<a class="pager-btn" href="${indexPath(lang, page - 1)}" rel="prev">← ${esc(t(lang, 'newerStories'))}</a>` : '<span class="pager-btn disabled"></span>'}
        <span class="pager-status">${esc(t(lang, 'pageLabel'))} ${page} / ${totalPages}</span>
        ${page < totalPages ? `<a class="pager-btn" href="${indexPath(lang, page + 1)}" rel="next">${esc(t(lang, 'olderStories'))} →</a>` : '<span class="pager-btn disabled"></span>'}
      </nav>` : '';

  const content = `${masthead(lang)}
  <main>
    <div class="article-shell">
      <div class="dateline">
        <span class="eyebrow">${esc(t(lang, 'allStories'))}</span>
        <h1 class="dateline-date">${esc(t(lang, 'archiveTitle'))}</h1>
        <p class="dateline-count">${esc(t(lang, 'archiveIntro'))}</p>
      </div>

${jump}

      <ol class="arch-list">
${items}
      </ol>

${pager}

      <aside class="story-cta rv">
        <span class="eyebrow">${esc(t(lang, 'todayEyebrow'))}</span>
        <h2>${esc(t(lang, 'ctaTitle'))}</h2>
        <p>${esc(t(lang, 'ctaBody'))}</p>
        ${storeButtons(lang, 'archive')}
      </aside>
    </div>
  </main>
${siteFooter(lang, langAvailable, (l) => indexPath(l, page))}
${stickyBar(lang)}`;

  return shell({ lang, headTags, bodyClass: 'doc-page', content });
}

module.exports = { renderLanding, renderStoryPage, renderIndexPage };
