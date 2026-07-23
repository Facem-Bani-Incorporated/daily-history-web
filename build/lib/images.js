// build/lib/images.js — turn pipeline image URLs into local, sized, credited assets.
//
// The pipeline hands us Wikimedia Commons originals: 1–2 MB each, no dimensions,
// and no reliable way to ask Commons for a smaller copy (on-demand thumbnail
// generation answers 400 for plenty of files, only already-cached sizes work).
// Hotlinking them would mean shipping megabytes per page, no width/height to
// reserve space with, and no attribution. So each image is fetched once, resized
// locally, and recorded in data/images.json with the credit Commons requires.
'use strict';

const fs = require('fs');
const path = require('path');
const {
  IMAGE_MANIFEST, IMAGE_WIDTHS, IMAGE_QUALITY_STEPS, IMAGE_BUDGET_BYTES, USER_AGENT, ROOT,
} = require('./config');

let sharp;
try {
  sharp = require('sharp');
} catch {
  sharp = null;                                     // handled in processImage
}

function loadManifest() {
  if (!fs.existsSync(IMAGE_MANIFEST)) return {};
  try {
    return JSON.parse(fs.readFileSync(IMAGE_MANIFEST, 'utf8'));
  } catch {
    return {};
  }
}

function saveManifest(manifest) {
  fs.mkdirSync(path.dirname(IMAGE_MANIFEST), { recursive: true });
  const ordered = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(IMAGE_MANIFEST, JSON.stringify(ordered, null, 2) + '\n');
}

/**
 * "File:All_Gizah_Pyramids.jpg" out of either a direct upload URL or a /thumb/
 * one. Returns null for anything that is not a Commons upload, so a future
 * pipeline change to another host degrades to "no credit" instead of crashing.
 */
function commonsTitle(url) {
  try {
    const { hostname, pathname } = new URL(url);
    if (hostname !== 'upload.wikimedia.org') return null;
    const parts = pathname.split('/').filter(Boolean);
    const thumbAt = parts.indexOf('thumb');
    // /wikipedia/commons/a/af/Name.jpg          -> last segment
    // /wikipedia/commons/thumb/a/af/Name.jpg/800px-Name.jpg -> segment after the hashes
    const nameSegment = thumbAt >= 0 ? parts[thumbAt + 3] : parts[parts.length - 1];
    if (!nameSegment) return null;
    return 'File:' + decodeURIComponent(nameSegment);
  } catch {
    return null;
  }
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/** Author and licence for a Commons file, so the page can credit it properly. */
async function fetchCredit(url) {
  const title = commonsTitle(url);
  if (!title) return null;
  const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo'
    + '&iiprop=extmetadata&iiextmetadatafilter=Artist|LicenseShortName|LicenseUrl'
    + '&titles=' + encodeURIComponent(title);
  try {
    const res = await fetch(api, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const json = await res.json();
    const page = Object.values(json?.query?.pages || {})[0];
    const meta = page?.imageinfo?.[0]?.extmetadata;
    if (!meta) return null;
    return {
      artist: stripHtml(meta.Artist?.value).slice(0, 120) || null,
      license: stripHtml(meta.LicenseShortName?.value) || null,
      licenseUrl: meta.LicenseUrl?.value || null,
      descriptionUrl: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(title),
    };
  } catch {
    return null;
  }
}

async function download(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'image/*' },
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Encode to fit `budget`, trading quality first and then pixels.
 *
 * Quality is spent first because most images reach the budget on the first step
 * with no visible loss. Only when even the lowest quality overshoots — dense
 * engravings and lithographs do — is the width reduced, which for that kind of
 * image looks far better than pushing quality into the twenties. Figures render
 * at roughly 700 CSS px, so a shrunk copy is still oversampled.
 */
async function encodeToBudget(input, targetWidth, budget) {
  let best = null;
  for (const width of [targetWidth, Math.round(targetWidth * 0.82), Math.round(targetWidth * 0.68)]) {
    for (const quality of IMAGE_QUALITY_STEPS) {
      const buffer = await sharp(input)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality, effort: 6 })
        .toBuffer();
      if (!best || buffer.length < best.buffer.length) best = { buffer, quality, width };
      if (buffer.length <= budget) return { buffer, quality, width };
    }
  }
  return best;                                      // nothing fit; ship the smallest
}

/**
 * Fetch, resize and record one image. Returns a descriptor the templates can use
 * directly, or null if the image could not be had — a missing image degrades the
 * page, it must never fail the build.
 */
async function processImage(url, { date, eventId, index, manifest }) {
  if (manifest[url]) return manifest[url];
  if (!sharp) {
    console.warn('! sharp is not installed — skipping image processing');
    return null;
  }

  let input;
  try {
    input = await download(url);
  } catch (err) {
    console.warn(`!   image download failed (${err.message}): ${url}`);
    return null;
  }

  const relDir = path.join('assets', 'img', date);
  const absDir = path.join(ROOT, relDir);
  fs.mkdirSync(absDir, { recursive: true });

  let meta;
  try {
    meta = await sharp(input).metadata();
  } catch (err) {
    console.warn(`!   unreadable image (${err.message}): ${url}`);
    return null;
  }

  const sources = [];
  for (const width of IMAGE_WIDTHS) {
    // Never upscale: a 500px original blown up to 1100 is a bigger file that
    // looks worse. Cap at the real width and let srcset pick.
    const target = Math.min(width, meta.width || width);
    const base = `${eventId}-${index}-${target}.webp`;
    const absFile = path.join(absDir, base);
    const budget = IMAGE_BUDGET_BYTES[width] ?? Infinity;
    try {
      const { buffer: out, quality, width: finalWidth } = await encodeToBudget(input, target, budget);
      fs.writeFileSync(absFile, out);
      const outMeta = await sharp(out).metadata();
      if (out.length > budget) {
        console.warn(`!   ${base}: ${(out.length / 1024).toFixed(0)} KB — over budget even at q${quality}/${finalWidth}px`);
      }
      sources.push({
        width: outMeta.width,
        height: outMeta.height,
        src: '/' + path.join(relDir, base).split(path.sep).join('/'),
      });
    } catch (err) {
      console.warn(`!   resize to ${target}px failed (${err.message}): ${url}`);
    }
  }
  if (!sources.length) return null;

  // De-duplicate: a small original yields the same width twice.
  const unique = [];
  for (const s of sources.sort((a, b) => a.width - b.width)) {
    if (!unique.some((u) => u.width === s.width)) unique.push(s);
  }

  const credit = await fetchCredit(url);
  const record = {
    source: url,
    sources: unique,
    width: unique[unique.length - 1].width,
    height: unique[unique.length - 1].height,
    credit,
  };
  manifest[url] = record;
  return record;
}

module.exports = { loadManifest, saveManifest, processImage, commonsTitle };
