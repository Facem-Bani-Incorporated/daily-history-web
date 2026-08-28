#!/usr/bin/env node
// build/generate.js — build every story page, index page, and the sitemap.
//
// Safety model: this script only ever writes. It never deletes a page it did not
// just rebuild, so a day the API cannot serve keeps whatever HTML it had. The
// worst outcome of a total backend outage is a build that changes nothing.
'use strict';

const fs = require('fs');
const path = require('path');

const {
  ROOT, SITE_URL, LANGS, DEFAULT_LANG, ARCHIVE_SLUG, STORIES_PER_INDEX_PAGE,
} = require('./lib/config');
const api = require('./lib/api');
const { loadManifest, saveManifest, processImage } = require('./lib/images');
const { t, categoryLabel } = require('./lib/i18n');
const { clamp, storyPath, indexPath } = require('./lib/seo');
const { renderLanding, renderStoryPage, renderIndexPage } = require('./lib/render');

const args = process.argv.slice(2);
const OPTS = {
  offline: args.includes('--offline'),
  limit: numArg('--limit', Infinity),
  only: strArg('--date', null),
  skipImages: args.includes('--skip-images'),
};

function numArg(flag, fallback) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : fallback;
}
function strArg(flag, fallback) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

function writePage(relPath, html) {
  const file = path.join(ROOT, relPath, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

const todayIso = () => new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ */

async function main() {
  console.log('Daily History — static build');
  console.log(OPTS.offline ? '  mode: offline (snapshots only)' : '  mode: online');

  const manifest = loadManifest();

  let dates = await api.fetchDates({ offline: OPTS.offline });
  if (OPTS.only) dates = dates.filter((d) => d === OPTS.only);
  if (dates.length > OPTS.limit) dates = dates.slice(0, OPTS.limit);
  if (!dates.length) {
    console.error('! no dates to build — leaving the site untouched');
    return;
  }
  console.log(`  dates: ${dates.length} (${dates[dates.length - 1]} … ${dates[0]})`);

  // Pass 1 — gather content and images. Nothing is written to the site yet,
  // because page N needs to know whether N-1 and N+1 exist in its language.
  const days = [];
  const today = todayIso();

  for (const date of dates) {
    const snapshot = await api.fetchDay(date, { refresh: date === today, offline: OPTS.offline });
    if (!snapshot || !Array.isArray(snapshot.events) || !snapshot.events.length) {
      console.warn(`  ${date}: no content — skipped`);
      continue;
    }

    const langs = api.completeLanguages(snapshot.events);
    if (!langs.length) {
      console.warn(`  ${date}: no language has a complete set of stories — skipped`);
      continue;
    }

    const images = [];
    if (!OPTS.skipImages) {
      for (const [ei, event] of snapshot.events.entries()) {
        const perEvent = [];
        for (const [gi, url] of (event.gallery || []).entries()) {
          const rec = await processImage(url, { date, eventId: event.id, index: gi, manifest });
          if (rec) perEvent.push(rec);
        }
        images[ei] = perEvent;
      }
    }

    days.push({ date, events: snapshot.events, langs, images });
    console.log(`  ${date}: ${snapshot.events.length} stories · ${langs.join(',')}${
      OPTS.skipImages ? '' : ` · ${images.flat().length} images`}`);
  }

  saveManifest(manifest);

  if (!days.length) {
    console.error('! nothing publishable — leaving the site untouched');
    return;
  }

  days.sort((a, b) => (a.date < b.date ? 1 : -1));       // newest first

  // Pass 2 — story pages.
  const built = { pages: 0, byLang: {} };
  for (const lang of LANGS) {
    const inLang = days.filter((d) => d.langs.includes(lang));
    built.byLang[lang] = inLang.length;

    inLang.forEach((day, i) => {
      // Neighbours within this language only: linking to a day that has no page
      // in the reader's language would be a dead link.
      const newer = inLang[i - 1]?.date || null;
      const older = inLang[i + 1]?.date || null;

      const stories = day.events.map((event, ei) => buildStory(event, lang, day.images[ei] || []));
      const html = renderStoryPage({
        lang, date: day.date, stories,
        available: day.langs,
        prev: older, next: newer,
      });
      writePage(path.join(lang, ARCHIVE_SLUG, day.date), html);
      built.pages++;
    });
  }

  // Pass 3 — index pages, paginated.
  const langsWithContent = LANGS.filter((l) => days.some((d) => d.langs.includes(l)));

  // Languages do not always have the same number of days, so they do not always
  // have the same number of index pages. hreflang on page N may only name the
  // languages that actually have a page N.
  const pageCount = Object.fromEntries(langsWithContent.map((l) => [
    l, Math.max(1, Math.ceil(days.filter((d) => d.langs.includes(l)).length / STORIES_PER_INDEX_PAGE)),
  ]));

  for (const lang of langsWithContent) {
    const inLang = days.filter((d) => d.langs.includes(lang));
    const entries = inLang.map((day) => {
      const lead = day.events[0];
      const img = (day.images[0] || [])[0] || null;
      return {
        date: day.date,
        headline: api.textFor(lead.titleTranslations, lang),
        categoryLabel: categoryLabel(lang, lead.category),
        image: img,
      };
    });

    const totalPages = Math.max(1, Math.ceil(entries.length / STORIES_PER_INDEX_PAGE));
    for (let page = 1; page <= totalPages; page++) {
      const slice = entries.slice((page - 1) * STORIES_PER_INDEX_PAGE, page * STORIES_PER_INDEX_PAGE);
      const html = renderIndexPage({
        lang, page, totalPages, entries: slice,
        langAvailable: langsWithContent.filter((l) => pageCount[l] >= page),
      });
      writePage(page === 1
        ? path.join(lang, ARCHIVE_SLUG)
        : path.join(lang, ARCHIVE_SLUG, 'page', String(page)), html);
      built.pages++;
    }
  }

  writeLandings(days, langsWithContent);
  writeSitemap(days, langsWithContent);
  writeRobots();

  console.log(`\n  built ${built.pages} pages`);
  for (const lang of LANGS) console.log(`    ${lang}: ${built.byLang[lang]} days`);
  console.log('  sitemap.xml, robots.txt written');
}

/** Shape one event for the templates, in one language. */
function buildStory(event, lang, images) {
  const title = api.textFor(event.titleTranslations, lang);
  const narrative = api.textFor(event.narrativeTranslations, lang);
  const notifBody = api.textFor(event.notificationBodyTranslations, lang);
  const location = event.location || null;

  return {
    id: event.id,
    title,
    narrative,
    // The pipeline already writes a short localised hook per language; it beats
    // a truncated first paragraph as a meta description.
    description: clamp(notifBody || narrative, 158),
    eventDate: event.eventDate,
    location,
    categoryLabel: categoryLabel(lang, event.category),
    sourceUrl: event.sourceUrl || null,
    images,
    alt: t(lang, 'altText')(title, location),
    longRead: longReadFor(event, lang),
  };
}

/**
 * The chapter list of the app's long-form article, for this language.
 *
 * The API only ever sends the teaser to an unauthenticated caller — the body text of
 * a long read never leaves the server for a guest — so this is the whole of what the
 * public site can show, and that is the intent. The chapter titles are the pitch:
 * a reader who can see "The Emperor Who Loved Chickens More Than Rome" knows exactly
 * what is in the app, which is a far better install argument than "download for more".
 *
 * It also happens to be what separates this site from every other "on this day" page,
 * which is thin content by construction.
 */
function longReadFor(event, lang) {
  if (!event.deepDiveTeaser) return null;
  try {
    const parsed = JSON.parse(event.deepDiveTeaser);
    const d = parsed[lang] || parsed.en;
    if (!d || !Array.isArray(d.chapters) || d.chapters.length === 0) return null;
    return {
      teaser: d.teaser || '',
      chapters: d.chapters,
      wordCount: d.wordCount || 0,
      sourceCount: d.sourceCount || 0,
      minutes: Math.max(1, Math.round((d.wordCount || 0) / 200)),
    };
  } catch {
    return null;
  }
}

/* -------------------------------- landing pages --------------------------------
 * The five landing pages are generated, not hand-maintained: they share one
 * layout and differ only in translated copy, which lives in landing-copy.json
 * (extracted from the pages they replace). The day's lead story is the top of
 * the page, which also gives a crawler the shortest path into the archive:
 * home -> today -> index -> every day.
 */
function writeLandings(days, langsWithContent) {
  for (const lang of LANGS) {
    // Newest day this language actually has, which need not be today: a day
    // missing this translation must not put another language's story here.
    const day = days.find((d) => d.langs.includes(lang));
    if (!day) {
      console.warn(`  ! ${lang}: no complete day — landing left as it was`);
      continue;
    }
    const stories = day.events.map((event, ei) => buildStory(event, lang, day.images[ei] || []));
    const recent = days.filter((d) => d.langs.includes(lang)).slice(0, 6).map((d) => ({
      date: d.date,
      headline: api.textFor(d.events[0].titleTranslations, lang),
    }));

    const html = renderLanding({
      lang, day, stories,
      langAvailable: LANGS,
      recent,
      // Stories, not days — the label says "stories", and each day carries two.
      archiveCount: days.filter((d) => d.langs.includes(lang))
        .reduce((total, d) => total + d.events.length, 0),
    });

    const file = lang === DEFAULT_LANG
      ? path.join(ROOT, 'index.html')
      : path.join(ROOT, lang, 'index.html');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, html);
  }
}

/* ------------------------------- sitemap ------------------------------- */

const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function urlEntry(loc, { lastmod, changefreq, priority, alternates }) {
  const links = (alternates || []).map(({ lang, href }) =>
    `    <xhtml:link rel="alternate" hreflang="${lang}" href="${xmlEsc(href)}" />`).join('\n');
  return `  <url>
    <loc>${xmlEsc(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}${
    changefreq ? `\n    <changefreq>${changefreq}</changefreq>` : ''}${
    priority ? `\n    <priority>${priority}</priority>` : ''}${links ? '\n' + links : ''}
  </url>`;
}

function writeSitemap(days, langsWithContent) {
  const urls = [];
  const today = todayIso();

  // Landing pages
  const landingAlts = LANGS.map((l) => ({ lang: l, href: SITE_URL + (l === DEFAULT_LANG ? '/' : `/${l}/`) }));
  landingAlts.push({ lang: 'x-default', href: SITE_URL + '/' });
  for (const lang of LANGS) {
    urls.push(urlEntry(SITE_URL + (lang === DEFAULT_LANG ? '/' : `/${lang}/`), {
      lastmod: today, changefreq: 'daily', priority: '1.0', alternates: landingAlts,
    }));
  }

  // Archive indexes, including every paginated page. Listing only page 1 leaves
  // the rest reachable by crawling alone, which is slower and easily missed.
  for (const lang of langsWithContent) {
    const pages = Math.max(1, Math.ceil(
      days.filter((d) => d.langs.includes(lang)).length / STORIES_PER_INDEX_PAGE));
    for (let page = 1; page <= pages; page++) {
      // Alternates are per page number: /es/…/page/2/ belongs with /de/…/page/2/,
      // not with everyone's page 1. A language with fewer pages simply drops out.
      const alts = langsWithContent.filter((l) => Math.ceil(
        days.filter((d) => d.langs.includes(l)).length / STORIES_PER_INDEX_PAGE) >= page,
      ).map((l) => ({ lang: l, href: SITE_URL + indexPath(l, page) }));
      if (alts.some((a) => a.lang === DEFAULT_LANG)) {
        alts.push({ lang: 'x-default', href: SITE_URL + indexPath(DEFAULT_LANG, page) });
      }
      urls.push(urlEntry(SITE_URL + indexPath(lang, page), {
        lastmod: today, changefreq: page === 1 ? 'daily' : 'weekly',
        priority: page === 1 ? '0.8' : '0.5', alternates: alts,
      }));
    }
  }

  // Story pages — alternates list only the languages that day actually has.
  for (const day of days) {
    const alts = day.langs.map((l) => ({ lang: l, href: SITE_URL + storyPath(l, day.date) }));
    if (day.langs.includes(DEFAULT_LANG)) {
      alts.push({ lang: 'x-default', href: SITE_URL + storyPath(DEFAULT_LANG, day.date) });
    }
    for (const lang of day.langs) {
      urls.push(urlEntry(SITE_URL + storyPath(lang, day.date), {
        lastmod: day.date, changefreq: 'monthly', priority: day.date === today ? '0.9' : '0.6',
        alternates: alts,
      }));
    }
  }

  // Google's limit is 50,000 URLs (or 50 MB) per file. Past that, split and
  // publish an index instead — silently truncating would drop pages from search.
  const LIMIT = 45000;
  if (urls.length <= LIMIT) {
    fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`);
    return;
  }

  const chunks = [];
  for (let i = 0; i < urls.length; i += LIMIT) chunks.push(urls.slice(i, i + LIMIT));
  chunks.forEach((chunk, i) => {
    fs.writeFileSync(path.join(ROOT, `sitemap-${i + 1}.xml`),
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${chunk.join('\n')}
</urlset>
`);
  });
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${chunks.map((_, i) => `  <sitemap>
    <loc>${SITE_URL}/sitemap-${i + 1}.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>
`);
}

function writeRobots() {
  fs.writeFileSync(path.join(ROOT, 'robots.txt'),
    `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`);
}

main().catch((err) => {
  console.error('\n! build failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
