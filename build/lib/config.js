// build/lib/config.js — one place for every constant the generator needs.
'use strict';

const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

module.exports = {
  ROOT,
  DATA_DIR: path.join(ROOT, 'data'),
  STORIES_DIR: path.join(ROOT, 'data', 'stories'),
  IMAGE_MANIFEST: path.join(ROOT, 'data', 'images.json'),
  IMAGE_OUT_DIR: path.join(ROOT, 'assets', 'img'),

  SITE_URL: 'https://daily-history-app.com',
  SITE_NAME: 'Daily History',
  API_BASE: 'https://daily-history-server-production.up.railway.app/api/v1',

  // Wikimedia asks that automated clients identify themselves and give a way to
  // get in touch. Requests without this are rate-limited or refused outright.
  USER_AGENT: 'DailyHistoryBot/1.0 (https://daily-history-app.com; razvanstefan.dogaru@gmail.com)',

  // The landing page lives at "/" for English and "/{lang}/" for the rest, but
  // story pages always carry an explicit language prefix. Mixing prefixed and
  // unprefixed URLs inside one hreflang cluster is a classic way to get the
  // whole cluster ignored, so the archive keeps /en/ even though "/" is English.
  LANGS: ['en', 'es', 'de', 'fr', 'ro'],
  DEFAULT_LANG: 'en',

  ARCHIVE_SLUG: 'on-this-day',

  // Widths generated per image. Two sizes cover phone and desktop; every extra
  // size is committed to git forever, so the archive pays for it permanently.
  // Figures display at ~700 CSS px at most, so 1100 covers retina comfortably.
  IMAGE_WIDTHS: [640, 1100],

  // Encoded to a byte budget rather than a fixed quality. Most pipeline images
  // are photographs that reach ~25 KB at q74; the occasional dense engraving or
  // lithograph would blow past 600 KB at the same setting. Starting high and
  // stepping down only when a file misses its budget keeps the common case sharp
  // and stops the pathological case from bloating the repo and wrecking LCP.
  IMAGE_QUALITY_STEPS: [74, 64, 54, 44, 36],
  IMAGE_BUDGET_BYTES: { 640: 70 * 1024, 1100: 210 * 1024 },

  STORIES_PER_INDEX_PAGE: 60,

  // Guards. A page that trips one of these is skipped rather than published
  // half-built — a thin or mixed-language page is worse than no page.
  MIN_NARRATIVE_CHARS: 400,
};
