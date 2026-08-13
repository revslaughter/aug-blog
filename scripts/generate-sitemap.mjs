// Generates public/sitemap.xml at build time (runs as `prebuild`).
// Reads static routes plus every published post and recipe, so the sitemap
// stays in sync as content grows — no runtime cost on the static export.
//
// Which slugs count as published is defined once, in util/contentFiles.mjs,
// and shared with the page loaders. Keeping that rule here as a second copy
// is what let /posts/template ship as a page while being absent from the
// sitemap.

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  publishableSlugs,
  listContentDir,
  contentDirsFromEnv,
  toIsoDate,
} from "../util/contentFiles.mjs";
import { getAllNavPages } from "../util/navPages.mjs";

const SITE_URL = "https://www.antiochurbangrowers.com";
const {
  postsDir: POSTS_DIR,
  recipesDir: RECIPES_DIR,
  navDir: NAV_DIR,
} = contentDirsFromEnv();
const OUT_FILE = path.join(process.cwd(), "public", "sitemap.xml");

// Routes that are code, not content, plus a relative priority hint.
const STATIC_ROUTES = [
  { path: "/", priority: "1.0" },
  { path: "/posts", priority: "0.8" },
  { path: "/recipes", priority: "0.8" },
];

/**
 * The section pages, read from `_nav/` rather than listed here.
 *
 * This list used to be hand-written, which put it one commit behind every
 * change to the sections — exactly the drift this file's header warns about for
 * posts. Now a section added in the CMS is in the sitemap on the next build.
 *
 * Every section page is included, not only the ones in the nav bar: `in_nav`
 * governs the header, and a page kept out of it while its copy is finished is
 * still a real page at a real URL.
 */
function getNavEntries() {
  return getAllNavPages(fs, NAV_DIR).map((page) => ({
    path: `/${page.slug}`,
    priority: "0.8",
  }));
}

/**
 * @param {string} dir Content directory
 * @param {string} routePrefix URL prefix for the generated entries
 * @param {string} priority
 * @param {boolean} withLastmod Recipes carry no date, so they get no lastmod
 */
function getContentEntries(dir, routePrefix, priority, withLastmod) {
  return publishableSlugs(listContentDir(dir, fs)).map((slug) => {
    const entry = { path: `${routePrefix}/${slug}`, priority };
    if (!withLastmod) return entry;

    const file = fs.readFileSync(path.join(dir, `${slug}.md`), "utf-8");
    // Shared with the loaders so an oddly-typed date degrades here too — a
    // bare `new Date(...)` on unparseable text throws in toISOString and
    // would fail the build before Next even starts.
    const lastmod = toIsoDate(matter(file).data.pubdate);
    return lastmod ? { ...entry, lastmod: lastmod.slice(0, 10) } : entry;
  });
}

function urlTag({ path: route, priority, lastmod }) {
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";
  return `  <url>
    <loc>${SITE_URL}${route}</loc>${lastmodTag}
    <priority>${priority}</priority>
  </url>`;
}

const entries = [
  ...STATIC_ROUTES,
  ...getNavEntries(),
  ...getContentEntries(POSTS_DIR, "/posts", "0.6", true),
  ...getContentEntries(RECIPES_DIR, "/recipes", "0.6", false),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(urlTag).join("\n")}
</urlset>
`;

fs.writeFileSync(OUT_FILE, xml);
console.log(`Generated sitemap with ${entries.length} URLs -> ${OUT_FILE}`);
