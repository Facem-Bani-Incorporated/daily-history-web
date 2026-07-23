// build/lib/render.js — the HTML. Every page is fully formed here at build time;
// nothing on a story page waits for JavaScript to become readable.
'use strict';

const { SITE_URL, SITE_NAME, LANGS, DEFAULT_LANG } = require('./config');
const { t, categoryLabel, formatDate, formatDateShort } = require('./i18n');
const {
  esc, clamp, head, jsonLd, jsonLdIndex, storyPath, indexPath, landingPath,
} = require('./seo');

/* ------------------------------- shared chrome ------------------------------- */

function shell({ lang, headTags, bodyClass = '', content, assetPrefix = '' }) {
  return `<!DOCTYPE html>
<html lang="${t(lang, 'htmlLang')}">
<head>
  ${headTags}

  <link rel="icon" href="${assetPrefix}/favicon.png" />
  <link rel="apple-touch-icon" href="${assetPrefix}/logo-sm.jpg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="${assetPrefix}/assets/site.css" />
  <link rel="stylesheet" href="${assetPrefix}/assets/story.css" />
  <script src="${assetPrefix}/assets/site.js" defer></script>
</head>
<body class="${bodyClass}">
  <div class="bg"></div>
  <div class="vignette"></div>
${content}
</body>
</html>
`;
}

function siteHeader(lang) {
  return `  <header class="doc-head">
    <a class="doc-brand" href="${landingPath(lang)}">
      <img src="/logo-sm.jpg" alt="" width="30" height="30" class="doc-brand-logo" />
      <span class="doc-brand-name">Daily&nbsp;History</span>
    </a>
    <a class="doc-archive-link" href="${indexPath(lang)}">${esc(t(lang, 'allStories'))}</a>
  </header>`;
}

function siteFooter(lang, available, pathFor) {
  const langLinks = LANGS.filter((l) => available.includes(l)).map((l) =>
    `<a href="${pathFor(l)}" hreflang="${l}"${l === lang ? ' class="on" aria-current="true"' : ''}>${esc(t(l, 'langName'))}</a>`,
  ).join('');

  return `  <!-- ad slot: footer (intentionally empty) -->
  <div class="ad-slot ad-slot--footer" data-ad-slot="footer"></div>

  <footer>
    <div class="langs langs--wide">${langLinks}</div>
    <div class="foot-links">
      <a href="${indexPath(lang)}">${esc(t(lang, 'allStories'))}</a>
      <a href="/privacy.html">Privacy</a>
      <a href="/terms.html">Terms</a>
      <a href="mailto:razvanstefan.dogaru@gmail.com">Contact</a>
    </div>
    © ${new Date().getUTCFullYear()} ${esc(SITE_NAME)}
  </footer>`;
}

/** Store buttons. Markup matches the landing page so site.js keeps working:
 *  it finds .store-btn for click tracking and rewrites the Play href to carry
 *  the install referrer. Nothing here may be renamed without updating site.js. */
function storeButtons(lang) {
  return `<div class="stores">
        <a class="store-btn primary" data-store="ios" data-placement="story" href="https://apps.apple.com/us/app/daily-history-on-this-day/id6768552706" target="_blank" rel="noopener">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.365 1.43c0 1.14-.42 2.21-1.13 3.02-.86.99-2.27 1.76-3.42 1.66-.14-1.1.42-2.27 1.06-3 .73-.84 2.04-1.49 3.49-1.68zM20.94 17.06c-.52 1.2-1.16 2.39-2.16 3.77-.92 1.27-2.01 2.85-3.42 2.87-1.26.02-1.58-.83-3.29-.82-1.71.01-2.06.84-3.32.81-1.4-.02-2.45-1.43-3.37-2.7C1.69 17.66.78 12.4 2.94 8.99c.99-1.59 2.65-2.62 4.41-2.65 1.27-.02 2.47.86 3.29.86.82 0 2.42-1.06 4.08-.9.7.03 2.66.28 3.92 2.13-.1.06-2.34 1.37-2.31 4.07.02 3.23 2.83 4.31 2.86 4.32-.02.07-.45 1.55-1.48 3.14z"/></svg>
          <span class="lbl"><small>Download on the</small><span>App Store</span></span>
        </a>
        <a class="store-btn secondary" data-store="android" data-placement="story" href="https://play.google.com/store/apps/details?id=com.rexinus.dailyhistorymobile" target="_blank" rel="noopener">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3.9 2.4c-.3.3-.5.7-.5 1.3v16.6c0 .6.2 1 .5 1.3l9.1-9.3L3.9 2.4z"/><path fill="currentColor" d="m13 12.3 3.8 3.8 3.9-2.2c.7-.4.7-1.4 0-1.8l-3.9-2.2L13 12.3z"/><path fill="currentColor" d="M4 2.3 16.4 9l-3.4 3.3L4 2.3z"/><path fill="currentColor" d="M4 22.3 13 13l3.4 3.3L4 22.3z"/></svg>
          <span class="lbl"><small>Get it on</small><span>Google Play</span></span>
        </a>
      </div>`;
}

function installCta(lang) {
  return `    <aside class="story-cta">
      <div class="cta-inner">
        <span class="sec-eyebrow">${esc(t(lang, 'todayEyebrow'))}</span>
        <h2>${esc(t(lang, 'ctaTitle'))}</h2>
        <p>${esc(t(lang, 'ctaBody'))}</p>
        ${storeButtons(lang)}
      </div>
    </aside>`;
}

/* --------------------------------- figures --------------------------------- */

function figure(image, alt, { lang, eager = false }) {
  const sorted = [...image.sources].sort((a, b) => a.width - b.width);
  const largest = sorted[sorted.length - 1];
  const srcset = sorted.map((s) => `${s.src} ${s.width}w`).join(', ');
  const credit = image.credit;

  // Explicit width/height on the <img> plus the same aspect ratio in CSS means
  // the browser reserves the exact box before the bytes land: no layout shift.
  const creditHtml = credit && (credit.artist || credit.license)
    ? `<figcaption class="fig-credit">${esc(t(lang, 'imageCredit'))}: ${
        credit.descriptionUrl
          ? `<a href="${esc(credit.descriptionUrl)}" rel="noopener nofollow" target="_blank">${esc(credit.artist || 'Wikimedia Commons')}</a>`
          : esc(credit.artist || 'Wikimedia Commons')
      }${credit.license ? ` · ${
        credit.licenseUrl
          ? `<a href="${esc(credit.licenseUrl)}" rel="license noopener nofollow" target="_blank">${esc(credit.license)}</a>`
          : esc(credit.license)
      }` : ''}</figcaption>`
    : '';

  return `<figure class="story-fig">
          <img src="${esc(largest.src)}" srcset="${esc(srcset)}"
               sizes="(min-width: 760px) 700px, 100vw"
               width="${largest.width}" height="${largest.height}"
               alt="${esc(alt)}"
               loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''} />
          ${creditHtml}
        </figure>`;
}

/* ------------------------------- story page -------------------------------- */

function paragraphs(narrative) {
  return String(narrative).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

/**
 * Social cards crop to roughly 1.91:1. A tall portrait scan — common in this
 * archive, where the gallery is full of engravings and posters — gets centre-
 * cropped into nonsense, so prefer the widest landscape image on the page and
 * only fall back to the lead image when every candidate is portrait.
 */
function pickSocialImage(lead, stories) {
  const candidates = stories.flatMap((s) => s.images.map((img) => ({ img, alt: s.alt })));
  if (!candidates.length) return null;
  const landscape = candidates
    .filter(({ img }) => img.width > img.height)
    .sort((a, b) => b.img.width - a.img.width)[0];
  const chosen = landscape || { img: lead.images[0] || candidates[0].img, alt: lead.alt };
  const img = chosen.img;
  if (!img) return null;
  const largest = img.sources[img.sources.length - 1];
  return { ...largest, alt: chosen.alt };
}

function renderStoryPage({ lang, date, stories, available, prev, next }) {
  const dateLabel = formatDate(lang, date);
  const lead = stories[0];

  // The pipeline writes headlines of 60–90 characters. Clamping those to fit a
  // site-name suffix cuts the headline mid-word, which costs more in the results
  // than a long title does: search engines truncate the display, they do not
  // penalise the length. So the headline is never cut, and the suffix is only
  // added when it genuinely fits.
  const title = lead.title.length <= 45
    ? `${lead.title} | ${t(lang, 'titleSuffix')}`
    : lead.title;
  const description = clamp(lead.description || t(lang, 'metaDescFallback')(lead.title));
  const canonical = storyPath(lang, date);
  const ogImage = pickSocialImage(lead, stories);

  const breadcrumb = [
    { name: t(lang, 'breadcrumbHome'), path: landingPath(lang) },
    { name: t(lang, 'archiveTitle'), path: indexPath(lang) },
    { name: dateLabel, path: canonical },
  ];

  const headTags = head({
    lang, title, description, canonical, available,
    pathFor: (l) => storyPath(l, date),
    image: ogImage,
    publishedDate: `${date}T06:00:00+00:00`,
    modifiedDate: `${date}T06:00:00+00:00`,
    type: 'article',
  }) + '\n\n  ' + jsonLd({ lang, date, stories, canonical, breadcrumb });

  const articles = stories.map((s, idx) => {
    const paras = paragraphs(s.narrative);
    const cat = s.categoryLabel;

    // First image of the first story is the LCP candidate — eager, high priority.
    // Everything after it waits until it is nearly on screen.
    const figs = s.images.map((img, i) =>
      figure(img, s.alt, { lang, eager: idx === 0 && i === 0 }));

    const heroFig = figs[0] || '';
    const restFigs = figs.slice(1);

    // Remaining images are spread through the text instead of dumped at the end,
    // so a long narrative keeps a visual rhythm.
    const bodyParas = paras.map((p, i) =>
      `<p${i === 0 && idx === 0 ? ' class="lede"' : ''}>${esc(p)}</p>`);
    const woven = [];
    const step = restFigs.length ? Math.max(2, Math.floor(bodyParas.length / (restFigs.length + 1))) : 0;
    bodyParas.forEach((p, i) => {
      woven.push(p);
      if (step && i > 0 && i % step === 0 && restFigs.length) woven.push(restFigs.shift());
    });
    woven.push(...restFigs);

    // The lead story carries the page's h1: it is the headline a reader and a
    // crawler should see first. Later stories step down to h2, so the document
    // outline stays h1 → h2 with no level skipped.
    const H = idx === 0 ? 'h1' : 'h2';

    return `      <article class="story" id="story-${s.id}">
        <header class="story-head">
          ${cat ? `<span class="story-cat">${esc(cat)}</span>` : ''}
          <${H} class="story-title">${esc(s.title)}</${H}>
          <p class="story-when">
            <time datetime="${esc(s.eventDate)}">${esc(formatDate(lang, s.eventDate))}</time>${
              s.location ? ` <span class="dot">·</span> <span class="story-where">${esc(s.location)}</span>` : ''
            }
          </p>
        </header>
        ${heroFig}
        <div class="story-body">
          ${woven.join('\n          ')}
        </div>
        ${s.sourceUrl ? `<p class="story-source">${esc(t(lang, 'sourceLabel'))}: <a href="${esc(s.sourceUrl)}" rel="noopener nofollow" target="_blank">${esc(prettyUrl(s.sourceUrl))}</a></p>` : ''}
      </article>`;
  }).join('\n\n');

  const nav = `    <nav class="day-nav" aria-label="${esc(t(lang, 'allStories'))}">
      ${prev ? `<a class="day-nav-item prev" href="${storyPath(lang, prev)}" rel="prev">
        <span class="day-nav-label">← ${esc(t(lang, 'prevDay'))}</span>
        <span class="day-nav-date">${esc(formatDateShort(lang, prev))}</span>
      </a>` : '<span class="day-nav-item empty"></span>'}
      ${next ? `<a class="day-nav-item next" href="${storyPath(lang, next)}" rel="next">
        <span class="day-nav-label">${esc(t(lang, 'nextDay'))} →</span>
        <span class="day-nav-date">${esc(formatDateShort(lang, next))}</span>
      </a>` : '<span class="day-nav-item empty"></span>'}
    </nav>`;

  const content = `${siteHeader(lang)}
  <main class="doc">
    <div class="story-hero story-hero--date">
      <span class="sec-eyebrow">${esc(t(lang, 'storyEyebrow'))}</span>
      <p class="hero-date"><time datetime="${esc(date)}">${esc(dateLabel)}</time></p>
      <p class="story-hero-sub">${esc(t(lang, 'storiesCount')(stories.length))}</p>
      <div class="rule"></div>
    </div>

${articles}

    <!-- ad slot: between story and CTA (intentionally empty) -->
    <div class="ad-slot ad-slot--mid" data-ad-slot="mid"></div>

${installCta(lang)}

${nav}

    <p class="archive-back"><a href="${indexPath(lang)}">${esc(t(lang, 'backToArchive'))} →</a></p>
  </main>
${siteFooter(lang, available, (l) => storyPath(l, date))}`;

  return shell({ lang, headTags, bodyClass: 'doc-page', content });
}

function prettyUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') + decodeURIComponent(u.pathname).replace(/_/g, ' ');
  } catch {
    return url;
  }
}

/* ------------------------------- index page -------------------------------- */

function renderIndexPage({ lang, page, totalPages, entries, availableByDate, langAvailable }) {
  const canonical = indexPath(lang, page);
  const isFirst = page <= 1;
  const title = isFirst
    ? `${t(lang, 'archiveTitle')} | ${t(lang, 'titleSuffix')}`
    : `${t(lang, 'archiveTitle')} — ${t(lang, 'pageLabel')} ${page} | ${t(lang, 'titleSuffix')}`;
  const description = clamp(t(lang, 'archiveMetaDesc'));

  const breadcrumb = [
    { name: t(lang, 'breadcrumbHome'), path: landingPath(lang) },
    { name: t(lang, 'archiveTitle'), path: indexPath(lang) },
  ];

  const headTags = head({
    lang, title, description, canonical,
    available: langAvailable,
    pathFor: (l) => indexPath(l, page),
    type: 'website',
  })
    + (page > 1 ? `\n  <link rel="prev" href="${SITE_URL}${indexPath(lang, page - 1)}" />` : '')
    + (page < totalPages ? `\n  <link rel="next" href="${SITE_URL}${indexPath(lang, page + 1)}" />` : '')
    + '\n\n  ' + jsonLdIndex({ lang, canonical, entries, breadcrumb });

  const cards = entries.map((e) => {
    const thumb = e.image ? e.image.sources[0] : null;
    return `      <li class="arch-item">
        <a class="arch-link" href="${storyPath(lang, e.date)}">
          ${thumb ? `<img class="arch-thumb" src="${esc(thumb.src)}" width="${thumb.width}" height="${thumb.height}" alt="" loading="lazy" decoding="async" />`
                  : '<span class="arch-thumb arch-thumb--empty" aria-hidden="true"></span>'}
          <span class="arch-text">
            <time class="arch-date" datetime="${esc(e.date)}">${esc(formatDateShort(lang, e.date))}</time>
            <span class="arch-title">${esc(e.headline)}</span>
            ${e.categoryLabel ? `<span class="arch-cat">${esc(e.categoryLabel)}</span>` : ''}
          </span>
        </a>
      </li>`;
  }).join('\n');

  const pager = totalPages > 1 ? `    <nav class="pager" aria-label="${esc(t(lang, 'pageLabel'))}">
      ${page > 1 ? `<a class="pager-btn" href="${indexPath(lang, page - 1)}" rel="prev">← ${esc(t(lang, 'newerStories'))}</a>` : '<span class="pager-btn disabled"></span>'}
      <span class="pager-status">${esc(t(lang, 'pageLabel'))} ${page} / ${totalPages}</span>
      ${page < totalPages ? `<a class="pager-btn" href="${indexPath(lang, page + 1)}" rel="next">${esc(t(lang, 'olderStories'))} →</a>` : '<span class="pager-btn disabled"></span>'}
    </nav>` : '';

  const content = `${siteHeader(lang)}
  <main class="doc">
    <div class="story-hero">
      <span class="sec-eyebrow">${esc(t(lang, 'allStories'))}</span>
      <h1>${esc(t(lang, 'archiveTitle'))}</h1>
      <p class="story-hero-sub">${esc(t(lang, 'archiveIntro'))}</p>
      <div class="rule"></div>
    </div>

    <ol class="arch-list">
${cards}
    </ol>

${pager}

${installCta(lang)}
  </main>
${siteFooter(lang, langAvailable, (l) => indexPath(l, page))}`;

  return shell({ lang, headTags, bodyClass: 'doc-page', content });
}

module.exports = { renderStoryPage, renderIndexPage, storeButtons, figure };
