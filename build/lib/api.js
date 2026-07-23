// build/lib/api.js — talking to the content API, and never depending on it.
//
// Every day fetched is written to data/stories/YYYY-MM-DD.json and committed.
// That snapshot, not the API, is what the pages are rendered from. So a build
// that runs while the backend is down still reproduces every page it built
// before: the API is only ever asked for days we do not already have.
'use strict';

const fs = require('fs');
const path = require('path');
const { API_BASE, STORIES_DIR, USER_AGENT, LANGS, MIN_NARRATIVE_CHARS } = require('./config');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

async function request(url, { retries = 3 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(20000),
      });
      if (res.status === 404) return null;          // absent, not broken
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 * 2 ** (attempt - 1)));
      }
    }
  }
  throw new Error(`${url} failed after ${retries} attempts: ${lastErr.message}`);
}

/** Dates the archive can contain. Falls back to snapshots already on disk. */
async function fetchDates({ offline = false } = {}) {
  if (!offline) {
    try {
      const dates = await request(`${API_BASE}/daily-content/guest/dates`);
      if (Array.isArray(dates) && dates.length) {
        return dates.filter((d) => ISO_DATE.test(d)).sort().reverse();
      }
      console.warn('! /guest/dates returned nothing usable — falling back to local snapshots');
    } catch (err) {
      console.warn(`! /guest/dates unreachable (${err.message}) — falling back to local snapshots`);
    }
  }
  return listSnapshotDates();
}

function listSnapshotDates() {
  if (!fs.existsSync(STORIES_DIR)) return [];
  return fs.readdirSync(STORIES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .filter((d) => ISO_DATE.test(d))
    .sort()
    .reverse();
}

function snapshotPath(date) {
  return path.join(STORIES_DIR, `${date}.json`);
}

function readSnapshot(date) {
  const file = snapshotPath(date);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.warn(`! snapshot ${date} is corrupt (${err.message}) — will refetch`);
    return null;
  }
}

function writeSnapshot(date, events) {
  fs.mkdirSync(STORIES_DIR, { recursive: true });
  const payload = { date, fetchedAt: new Date().toISOString(), events };
  fs.writeFileSync(snapshotPath(date), JSON.stringify(payload, null, 2) + '\n');
  return payload;
}

/**
 * A day's events. Served from the snapshot when we have one — published days are
 * immutable, so re-fetching them would only risk replacing good content with a
 * bad response. `refresh` forces the network for today, whose content can still
 * be corrected upstream.
 */
async function fetchDay(date, { refresh = false, offline = false } = {}) {
  const cached = readSnapshot(date);
  if (cached && !refresh) return cached;
  if (offline) return cached;

  let events;
  try {
    events = await request(`${API_BASE}/daily-content/guest/by-date?date=${date}`);
  } catch (err) {
    console.warn(`! fetch ${date} failed (${err.message})`);
    return cached;                                  // last good copy wins
  }
  if (!Array.isArray(events) || events.length === 0) return cached;

  // Refreshing today must not downgrade a good snapshot into a worse one.
  if (cached && countValid(events) < countValid(cached.events)) {
    console.warn(`! ${date}: API returned fewer complete stories than the snapshot — keeping snapshot`);
    return cached;
  }
  return writeSnapshot(date, events);
}

function textFor(translations, lang) {
  if (!translations || typeof translations !== 'object') return '';
  const value = translations[lang];
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Is this event publishable in this language? Requires a real title and a real
 * narrative — not a stub, not another language's text. A page missing one of
 * these is skipped for that language rather than padded out with English.
 */
function isComplete(event, lang) {
  const title = textFor(event.titleTranslations, lang);
  const narrative = textFor(event.narrativeTranslations, lang);
  return title.length > 0 && narrative.length >= MIN_NARRATIVE_CHARS;
}

/** Languages in which *every* event of the day is publishable. */
function completeLanguages(events) {
  return LANGS.filter((lang) => events.length > 0 && events.every((e) => isComplete(e, lang)));
}

function countValid(events) {
  if (!Array.isArray(events)) return 0;
  return events.filter((e) => LANGS.some((l) => isComplete(e, l))).length;
}

module.exports = {
  fetchDates, fetchDay, readSnapshot, listSnapshotDates,
  isComplete, completeLanguages, textFor,
};
