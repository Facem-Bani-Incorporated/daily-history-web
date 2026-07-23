// build/lib/seo.js — URLs, head tags, hreflang clusters and structured data.
'use strict';

const { SITE_URL, SITE_NAME, LANGS, DEFAULT_LANG, ARCHIVE_SLUG } = require('./config');
const { t, formatDate } = require('./i18n');

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* ---------------- URL shapes — every generated link comes from here ---------------- */

const storyPath   = (lang, date) => `/${lang}/${ARCHIVE_SLUG}/${date}/`;
const indexPath   = (lang, page = 1) => page <= 1
  ? `/${lang}/${ARCHIVE_SLUG}/`
  : `/${lang}/${ARCHIVE_SLUG}/page/${page}/`;
const landingPath = (lang) => (lang === DEFAULT_LANG ? '/' : `/${lang}/`);
const abs = (p) => SITE_URL + p;

/**
 * hreflang for one page across languages.
 *
 * `available` is the languages that actually have this page. Advertising an
 * alternate that 404s invalidates the cluster, so a day missing German is
 * dropped from every other language's list too, not just its own.
 */
function alternates(available, pathFor) {
  const langs = LANGS.filter((l) => available.includes(l));
  const links = langs.map((l) =>
    `<link rel="alternate" hreflang="${l}" href="${esc(abs(pathFor(l)))}" />`);
  const xDefault = langs.includes(DEFAULT_LANG) ? DEFAULT_LANG : langs[0];
  if (xDefault) {
    links.push(`<link rel="alternate" hreflang="x-default" href="${esc(abs(pathFor(xDefault)))}" />`);
  }
  return links.join('\n  ');
}

/** Clip to a length search engines will actually display, without cutting a word. */
function clamp(text, max = 158) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:—-]$/, '') + '…';
}

function head({ lang, title, description, canonical, available, pathFor, image, publishedDate, modifiedDate, type = 'article', noindex = false }) {
  const ogLocale = t(lang, 'ogLocale');
  const otherLocales = LANGS.filter((l) => l !== lang && available.includes(l))
    .map((l) => `<meta property="og:locale:alternate" content="${t(l, 'ogLocale')}" />`)
    .join('\n  ');

  return `<meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  ${noindex ? '<meta name="robots" content="noindex, follow" />' : '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />'}
  <link rel="canonical" href="${esc(abs(canonical))}" />

  ${alternates(available, pathFor)}

  <meta property="og:type" content="${type}" />
  <meta property="og:site_name" content="${esc(SITE_NAME)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${esc(abs(canonical))}" />
  <meta property="og:locale" content="${ogLocale}" />
  ${otherLocales}
  ${image ? `<meta property="og:image" content="${esc(abs(image.src))}" />
  <meta property="og:image:width" content="${image.width}" />
  <meta property="og:image:height" content="${image.height}" />
  <meta property="og:image:alt" content="${esc(image.alt || title)}" />` : `<meta property="og:image" content="${esc(SITE_URL)}/logo-sm.jpg" />`}
  ${publishedDate ? `<meta property="article:published_time" content="${publishedDate}" />` : ''}
  ${modifiedDate ? `<meta property="article:modified_time" content="${modifiedDate}" />` : ''}

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  ${image ? `<meta name="twitter:image" content="${esc(abs(image.src))}" />
  <meta name="twitter:image:alt" content="${esc(image.alt || title)}" />` : ''}`;
}

const PUBLISHER = {
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo-sm.jpg`, width: 512, height: 512 },
};

/**
 * One Article per story plus a BreadcrumbList, emitted as a @graph so the page
 * carries a single script tag and the nodes can reference each other by @id.
 */
function jsonLd({ lang, date, stories, canonical, breadcrumb }) {
  const pageUrl = abs(canonical);
  const articles = stories.map((s, i) => ({
    '@type': 'Article',
    '@id': `${pageUrl}#story-${s.id}`,
    headline: clamp(s.title, 110),
    description: clamp(s.description, 300),
    articleSection: s.categoryLabel || undefined,
    inLanguage: lang,
    datePublished: `${date}T06:00:00+00:00`,
    dateModified: `${date}T06:00:00+00:00`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
    author: PUBLISHER,
    publisher: PUBLISHER,
    image: s.images.map((img) => ({
      '@type': 'ImageObject',
      url: abs(img.sources[img.sources.length - 1].src),
      width: img.width,
      height: img.height,
    })),
    about: s.location ? { '@type': 'Place', name: s.location } : undefined,
    temporalCoverage: s.eventDate,
    citation: s.sourceUrl || undefined,
    position: i + 1,
  }));

  const graph = [
    ...articles,
    {
      '@type': 'BreadcrumbList',
      '@id': `${pageUrl}#breadcrumb`,
      itemListElement: breadcrumb.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        item: abs(item.path),
      })),
    },
  ];

  return `<script type="application/ld+json">${JSON.stringify(
    { '@context': 'https://schema.org', '@graph': graph }, null, 0,
  ).replace(/</g, '\\u003c')}</script>`;
}

/** CollectionPage + ItemList for an archive index page. */
function jsonLdIndex({ lang, canonical, entries, breadcrumb }) {
  const pageUrl = abs(canonical);
  const graph = [
    {
      '@type': 'CollectionPage',
      '@id': pageUrl,
      name: t(lang, 'archiveTitle'),
      description: t(lang, 'archiveMetaDesc'),
      inLanguage: lang,
      isPartOf: { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SITE_NAME, url: SITE_URL },
      publisher: PUBLISHER,
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: entries.map((e, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: abs(storyPath(lang, e.date)),
          name: e.headline,
        })),
      },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${pageUrl}#breadcrumb`,
      itemListElement: breadcrumb.map((item, i) => ({
        '@type': 'ListItem', position: i + 1, name: item.name, item: abs(item.path),
      })),
    },
  ];
  return `<script type="application/ld+json">${JSON.stringify(
    { '@context': 'https://schema.org', '@graph': graph }, null, 0,
  ).replace(/</g, '\\u003c')}</script>`;
}

module.exports = {
  esc, clamp, abs, head, jsonLd, jsonLdIndex, alternates,
  storyPath, indexPath, landingPath, formatDate,
};
