#!/usr/bin/env node
// build/validate.js — checks the generated site the way a crawler would.
//
// Everything here has burned a real site at some point: hreflang that points at
// a page which does not exist, clusters that are not reciprocal, two pages
// claiming the same canonical, JSON-LD that does not parse.
'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, SITE_URL } = require('./lib/config');

let failures = 0;
let checks = 0;

function fail(msg) { failures++; console.error(`  FAIL  ${msg}`); }
function ok(msg) { checks++; console.log(`  ok    ${msg}`); }

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name === 'index.html') out.push(full);
  }
  return out;
}

const urlToFile = (url) => {
  const rel = url.replace(SITE_URL, '').replace(/^\//, '');
  return path.join(ROOT, rel, rel.endsWith('.html') ? '' : 'index.html');
};

function attrAll(html, re) {
  return [...html.matchAll(re)].map((m) => m[1]);
}

const pages = walk(ROOT).map((file) => ({
  file,
  url: SITE_URL + '/' + path.relative(ROOT, file).split(path.sep).join('/').replace(/index\.html$/, ''),
  html: fs.readFileSync(file, 'utf8'),
}));

console.log(`Validating ${pages.length} pages\n`);

/* ---- 1. canonical present, self-referencing, unique ---- */
const canonicals = new Map();
for (const p of pages) {
  const canonical = (p.html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (!canonical) { fail(`${rel(p.file)}: no canonical`); continue; }
  if (canonical !== p.url) fail(`${rel(p.file)}: canonical ${canonical} != own URL ${p.url}`);
  if (canonicals.has(canonical)) fail(`duplicate canonical ${canonical} in ${rel(p.file)} and ${rel(canonicals.get(canonical))}`);
  canonicals.set(canonical, p.file);
}
ok(`${pages.length} canonicals present and self-referencing`);

/* ---- 2. hreflang: targets exist, and the cluster is reciprocal ---- */
const clusters = new Map();
for (const p of pages) {
  const links = [...p.html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)]
    .map((m) => ({ lang: m[1], href: m[2] }));
  if (!links.length) continue;

  for (const { lang, href } of links) {
    if (!href.startsWith('https://')) fail(`${rel(p.file)}: hreflang ${lang} is not absolute: ${href}`);
    if (!fs.existsSync(urlToFile(href))) fail(`${rel(p.file)}: hreflang ${lang} points at a missing page: ${href}`);
  }

  const self = links.filter((l) => l.lang !== 'x-default').find((l) => l.href === p.url);
  if (!self) fail(`${rel(p.file)}: hreflang cluster does not include the page itself`);

  const key = links.filter((l) => l.lang !== 'x-default').map((l) => `${l.lang}=${l.href}`).sort().join('|');
  if (!clusters.has(key)) clusters.set(key, []);
  clusters.get(key).push(p.url);
}

// Reciprocity: every page in a cluster must advertise the identical set.
for (const [key, members] of clusters) {
  const expected = key.split('|').map((s) => s.split('=')[1]).sort();
  const got = [...members].sort();
  if (JSON.stringify(expected) !== JSON.stringify(got)) {
    fail(`hreflang cluster not reciprocal.\n        declared: ${expected.join(', ')}\n        declaring: ${got.join(', ')}`);
  }
}
ok(`${clusters.size} hreflang clusters, all reciprocal, all targets exist`);

/* ---- 3. exactly one h1, no skipped heading level ---- */
for (const p of pages) {
  const h1s = (p.html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) fail(`${rel(p.file)}: ${h1s} <h1> elements (expected 1)`);
  if (/<h4[\s>]/.test(p.html) && !/<h3[\s>]/.test(p.html)) fail(`${rel(p.file)}: h4 without h3`);
}
ok('every page has exactly one <h1>');

/* ---- 4. title and description present, sane length, unique per language ---- */
const titles = new Map();
for (const p of pages) {
  const title = (p.html.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
  const desc = (p.html.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  if (!title) fail(`${rel(p.file)}: no <title>`);
  if (!desc) fail(`${rel(p.file)}: no meta description`);
  if (desc && desc.length > 170) fail(`${rel(p.file)}: meta description ${desc.length} chars (>170)`);
  if (title) {
    if (titles.has(title)) fail(`duplicate <title> in ${rel(p.file)} and ${rel(titles.get(title))}`);
    titles.set(title, p.file);
  }
}
ok('titles and descriptions present, descriptions within length, titles unique');

/* ---- 5. html lang matches the URL prefix ---- */
for (const p of pages) {
  const declared = (p.html.match(/<html lang="([^"]+)"/) || [])[1];
  const fromUrl = (p.url.replace(SITE_URL + '/', '').split('/')[0] || 'en');
  const expected = /^(en|es|de|fr|ro)$/.test(fromUrl) ? fromUrl : 'en';
  if (declared !== expected) fail(`${rel(p.file)}: <html lang="${declared}"> but URL says "${expected}"`);
}
ok('<html lang> matches every URL prefix');

/* ---- 6. JSON-LD parses ---- */
for (const p of pages) {
  for (const block of attrAll(p.html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(block.replace(/\\u003c/g, '<')); }
    catch (err) { fail(`${rel(p.file)}: JSON-LD does not parse — ${err.message}`); }
  }
}
ok('all JSON-LD blocks parse');

/* ---- 7. images have dimensions and alt ---- */
for (const p of pages) {
  for (const tag of attrAll(p.html, /(<img[^>]*>)/g)) {
    if (!/\swidth="\d+"/.test(tag) || !/\sheight="\d+"/.test(tag)) fail(`${rel(p.file)}: <img> without width/height — ${tag.slice(0, 90)}`);
    if (!/\salt="/.test(tag)) fail(`${rel(p.file)}: <img> without alt — ${tag.slice(0, 90)}`);
  }
}
ok('every <img> has explicit width, height and alt');

/* ---- 8. internal links resolve ---- */
for (const p of pages) {
  for (const href of attrAll(p.html, /href="(\/[^"#?]*)"/g)) {
    if (/\.(css|js|png|jpg|jpeg|webp|xml|txt|ico)$/.test(href)) {
      if (!fs.existsSync(path.join(ROOT, href))) fail(`${rel(p.file)}: dead asset link ${href}`);
    } else if (!fs.existsSync(path.join(ROOT, href, 'index.html')) && !fs.existsSync(path.join(ROOT, href))) {
      fail(`${rel(p.file)}: dead internal link ${href}`);
    }
  }
}
ok('internal links resolve');

/* ---- 9. sitemap: well formed, every URL exists, alternates match ---- */
const sitemapFile = path.join(ROOT, 'sitemap.xml');
if (!fs.existsSync(sitemapFile)) fail('sitemap.xml missing');
else {
  const xml = fs.readFileSync(sitemapFile, 'utf8');
  const locs = attrAll(xml, /<loc>([^<]+)<\/loc>/g);
  for (const loc of locs) {
    if (loc.endsWith('.xml')) continue;
    if (!fs.existsSync(urlToFile(loc))) fail(`sitemap lists a missing page: ${loc}`);
  }
  const indexed = new Set(locs);
  for (const p of pages) {
    if (!indexed.has(p.url) && !locs.some((l) => l.endsWith('.xml'))) {
      fail(`page not in sitemap: ${p.url}`);
    }
  }
  ok(`sitemap lists ${locs.length} URLs, all resolve, no page missing`);
}

if (!fs.existsSync(path.join(ROOT, 'robots.txt'))) fail('robots.txt missing');
else ok('robots.txt present');

function rel(f) { return path.relative(ROOT, f).split(path.sep).join('/'); }

console.log(`\n${failures ? `${failures} FAILURE(S)` : `all ${checks} checks passed`}`);
process.exit(failures ? 1 : 0);
