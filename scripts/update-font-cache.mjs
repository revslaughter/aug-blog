/**
 * Rebuild the offline Google Fonts cache used by the screenshot tests.
 *
 * The site pulls Marcellus, Vollkorn and VT323 from the Google Fonts CDN:
 * Marcellus and VT323 through @imports in `styles/globals.css`, Vollkorn
 * through a <link> in `pages/_document.js` (that one's URL names an italic
 * axis, which `next build` will not carry through an @import — see the
 * comment at the top of globals.css). Both files are scanned below, so a
 * family stays cached whichever way it is loaded.
 *
 * Letting the browser fetch those during a visual run makes the baselines
 * depend on the network and on whatever Google is serving that day — a font
 * revision bump would fail every page at once, for no change of ours.
 *
 * So the tests intercept both font hosts and serve the byte-for-byte responses
 * captured here (see tests/visual/fixtures.mjs). Re-run this script — and
 * refresh the baselines with it — only when you deliberately want to move to
 * newer font files:
 *
 *   node scripts/update-font-cache.mjs && npm run test:visual:update
 *
 * Usage: node scripts/update-font-cache.mjs
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";
import { devices } from "@playwright/test";

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE_DIR = path.join(ROOT, "tests", "visual", "font-cache");
const GLOBALS_CSS = path.join(ROOT, "styles", "globals.css");
const DOCUMENT_JS = path.join(ROOT, "pages", "_document.js");

// Google Fonts serves different formats per user agent (woff2 for modern
// Chrome, ttf for anything it doesn't recognise). Ask as the exact browser the
// tests run in, or the cached CSS won't match what Chromium requests.
const USER_AGENT = devices["Desktop Chrome"].userAgent;

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
};

/** @param {string} url */
function cacheFileName(url) {
  const digest = createHash("sha256").update(url).digest("hex").slice(0, 12);
  const ext = url.includes("fonts.googleapis.com") ? ".css" : path.extname(new URL(url).pathname);
  const label =
    path.basename(new URL(url).pathname, ext).replace(/[^a-zA-Z0-9-]/g, "") || "font";
  return `${label}-${digest}${ext || ".bin"}`;
}

/** @param {string} url */
async function fetchOrThrow(url) {
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`GET ${url} -> ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

const globals = await readFile(GLOBALS_CSS, "utf8");
const documentJs = await readFile(DOCUMENT_JS, "utf8");

const importedUrls = [...globals.matchAll(/@import\s+url\(["']?(https:\/\/[^"')]+)["']?\)/g)].map(
  (match) => match[1]
);
// <link rel="stylesheet" href="https://fonts.googleapis.com/..."> in the Head.
// Matched on the href alone rather than the whole tag, because JSX puts the
// attributes on their own lines once Prettier has been through it.
const linkedUrls = [...documentJs.matchAll(/href=["'](https:\/\/fonts\.googleapis\.com\/[^"']+)["']/g)].map(
  (match) => match[1]
);

// Dedupe, so a family loaded both ways is fetched once.
const stylesheetUrls = [...new Set([...importedUrls, ...linkedUrls])];

if (stylesheetUrls.length === 0) {
  console.error(
    `No font stylesheet URLs found in ${path.relative(ROOT, GLOBALS_CSS)} or ` +
      `${path.relative(ROOT, DOCUMENT_JS)}.`
  );
  process.exit(1);
}

await rm(CACHE_DIR, { recursive: true, force: true });
await mkdir(CACHE_DIR, { recursive: true });

/** @type {Record<string, string>} url -> cache file name */
const manifest = {};

for (const stylesheetUrl of stylesheetUrls) {
  const css = await fetchOrThrow(stylesheetUrl);
  const fileName = cacheFileName(stylesheetUrl);
  await writeFile(path.join(CACHE_DIR, fileName), css);
  manifest[stylesheetUrl] = fileName;
  console.log(`css   ${stylesheetUrl}`);

  // The @font-face rules point at fonts.gstatic.com; cache those too, keeping
  // the original URLs so the stylesheet needs no rewriting.
  const fontUrls = [...css.toString("utf8").matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(
    (match) => match[1]
  );
  for (const fontUrl of fontUrls) {
    if (manifest[fontUrl]) continue;
    const body = await fetchOrThrow(fontUrl);
    const fontFileName = cacheFileName(fontUrl);
    await writeFile(path.join(CACHE_DIR, fontFileName), body);
    manifest[fontUrl] = fontFileName;
    console.log(`font  ${fontUrl}`);
  }
}

await writeFile(
  path.join(CACHE_DIR, "manifest.json"),
  `${JSON.stringify({ userAgent: USER_AGENT, contentTypes: CONTENT_TYPES, files: manifest }, null, 2)}\n`
);

console.log(`\nCached ${Object.keys(manifest).length} responses in ${path.relative(ROOT, CACHE_DIR)}`);
