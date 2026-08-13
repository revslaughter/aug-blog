/**
 * The top-level section pages — /about, /plant-sale, /compost and so on —
 * loaded from Markdown in `_nav/` instead of a hand-written file per page.
 *
 * These used to be eight near-identical files under `pages/`, each one a bit
 * of JSX wrapping copy the client wanted to change. Now `pages/[slug].js`
 * builds one static page per `_nav/*.md`, so adding or rewording a section is
 * an edit in the CMS rather than a pull request.
 *
 * `.mjs` for the same reason `contentFiles.mjs` is: the prebuild scripts run
 * under plain node and import this too, and a `.js` file using `export` would
 * be read as CommonJS and fail there.
 *
 * The frontmatter is the form the client fills in — see `public/admin/config.yml`,
 * where every field below appears as a labelled input. Everything except
 * `title` is optional, and a page missing all of it still renders: a section
 * whose copy is half-written should look unfinished, not fail the build.
 */

import path from "node:path";
import matter from "gray-matter";
import {
  publishableSlugs,
  listContentDir,
  contentDirsFromEnv,
} from "./contentFiles.mjs";

/** Resolved per call, so CONTENT_FIXTURE_DIR is read at build time. */
export const navDir = () => contentDirsFromEnv().navDir;

/**
 * Slugs `_nav/` may not claim, because something else already answers to them.
 *
 * This exists because of how Next resolves routes: a real file under `pages/`
 * always beats the dynamic `pages/[slug].js`, and it does it *silently*. Drop
 * in `_nav/posts.md` and you get no error, no warning, and no page — just
 * `pages/posts/index.js` continuing to serve /posts while the Markdown sits
 * there looking published. The client would have every reason to think the
 * site was broken.
 *
 * So the collision is turned into a build failure instead (see
 * `assertRoutable`). The names below are the ones no directory listing can
 * discover:
 *
 *   posts, recipes  Section indexes with their own loaders under `pages/`.
 *   admin           The Sveltia editor, served from `public/admin/`.
 *   404             Next's not-found page.
 *   index           Would emit out/index.html and overwrite the homepage.
 *   sitemap         `public/sitemap.xml`, written by prebuild.
 *
 * `_nav/` is not routed by Next itself — the underscore prefix only means
 * anything *inside* `pages/`, and this directory sits beside `_posts/`.
 */
export const RESERVED_SLUGS = new Set([
  "posts",
  "recipes",
  "admin",
  "404",
  "index",
  "sitemap",
]);

/**
 * Sections with no explicit order sort after the ones that have it, rather
 * than jumping to the front the way a missing-as-zero would.
 */
const UNORDERED = Number.MAX_SAFE_INTEGER;

/**
 * @typedef {{
 *   slug: string,
 *   title: string,
 *   navLabel: string,
 *   order: number,
 *   inNav: boolean,
 *   description: string|null,
 *   intro: string|null,
 *   schedule: {label: string, value: string}[],
 *   storeLink: boolean,
 *   contactDetails: boolean,
 *   note: string|null,
 *   content: string}} NavPage
 */

/**
 * Normalize one page's frontmatter into the shape the components expect.
 *
 * Split out from the file read so the tests can exercise the defaulting
 * without touching disk, and so both consumers — the page loader and the
 * prebuild generator — coerce identically.
 *
 * The optional-block flags (`store_link`, `contact_details`) are switches, not
 * content: they pull the store URL, phone and address from `util/siteMeta.js`
 * rather than letting those be retyped here. That is deliberate. Issue #9 was
 * the phone number living in two places and getting fixed in one of them, and
 * a CMS that invites the client to type the address into eight pages is that
 * bug with a nicer interface.
 *
 * @param {string} slug
 * @param {Record<string, unknown>} data Parsed frontmatter
 * @param {string} content Markdown body
 * @returns {NavPage}
 */
export function normalizeNavPage(slug, data, content) {
  const title = typeof data.title === "string" && data.title ? data.title : slug;
  const order = Number(data.order);
  return {
    slug,
    title,
    navLabel:
      typeof data.nav_label === "string" && data.nav_label
        ? data.nav_label
        : title,
    order: Number.isFinite(order) ? order : UNORDERED,
    // Absent means "not in the nav". A section is published to the nav bar by
    // an explicit decision, so a page whose copy is still a draft cannot reach
    // the nav just by existing.
    inNav: data.in_nav === true,
    description: data.description || null,
    intro: data.intro || null,
    schedule: Array.isArray(data.schedule)
      ? data.schedule
          .filter((row) => row && row.label)
          .map(({ label, value }) => ({ label, value: value ?? "" }))
      : [],
    storeLink: data.store_link === true,
    contactDetails: data.contact_details === true,
    note: data.note || null,
    content,
  };
}

/**
 * @param {string} slug
 * @param {typeof import("fs")} fs
 * @param {string} [dir]
 * @returns {NavPage}
 */
export function getNavPageForSlug(slug, fs, dir = navDir()) {
  const file = fs.readFileSync(path.join(dir, `${slug}.md`), "utf-8");
  const { data, content } = matter(file);
  return normalizeNavPage(slug, data, content);
}

/**
 * Every section page, in nav order.
 *
 * Ties break on title so the build is reproducible when two pages share an
 * `order` — which they will, because the CMS offers a free-text number and
 * nothing stops the client putting 20 on two of them.
 *
 * Draft rules are shared with posts and recipes via `publishableSlugs`, so a
 * `test-*` section behaves the way a `test-*` post does.
 *
 * @param {typeof import("fs")} fs
 * @param {string} [dir]
 * @param {{includeDrafts?: boolean}} [options]
 * @returns {NavPage[]}
 */
export function getAllNavPages(fs, dir = navDir(), options) {
  return publishableSlugs(listContentDir(dir, fs), options)
    .map((slug) => getNavPageForSlug(slug, fs, dir))
    .sort((one, another) =>
      one.order === another.order
        ? one.title.localeCompare(another.title)
        : one.order - another.order
    );
}

/**
 * The header links, Home first.
 *
 * Home is prepended here rather than living in `_nav/` because it is not a
 * section page — `pages/index.js` renders the logo, the event feed and the
 * store link, none of which comes from Markdown. It is also the one link that
 * must never be removable: a nav with no way back to the homepage is a broken
 * site, and this keeps that out of reach of a mis-set `in_nav`.
 *
 * @param {NavPage[]} pages
 * @returns {{title: string, href: string}[]}
 */
export function navLinks(pages) {
  return [
    { title: "Home", href: "/" },
    ...pages
      .filter((page) => page.inNav)
      .map((page) => ({ title: page.navLabel, href: `/${page.slug}` })),
  ];
}

/**
 * Fail the build on a slug that cannot become a page.
 *
 * Called from the prebuild generator, so this runs once per build and before
 * Next starts — the error names the file and says what to do about it, which
 * is the whole point compared to the silent shadowing described on
 * `RESERVED_SLUGS`.
 *
 * @param {string[]} slugs
 * @param {string[]} pageRoutes Top-level route names already taken by `pages/`
 * @throws {Error} on the first collision
 */
export function assertRoutable(slugs, pageRoutes = []) {
  const taken = new Set([...RESERVED_SLUGS, ...pageRoutes]);
  const collisions = slugs.filter((slug) => taken.has(slug));
  if (collisions.length === 0) return;
  throw new Error(
    `_nav/ contains ${collisions
      .map((slug) => `"${slug}.md"`)
      .join(", ")}, but ${
      collisions.length === 1 ? "that route is" : "those routes are"
    } already served by something else.\n` +
      `A file under pages/ silently wins over pages/[slug].js, so this page would never render.\n` +
      `Rename the file in _nav/ (its filename is its web address).`
  );
}

/**
 * The top-level routes `pages/` already owns, read from disk.
 *
 * Derived rather than listed so that adding a hand-written page later cannot
 * quietly start shadowing a section: whatever is in `pages/` is what the check
 * runs against. `[slug].js` is skipped — it is the dynamic route itself, not a
 * competitor for these paths.
 *
 * @param {string} pagesDir
 * @param {typeof import("fs")} fs
 * @returns {string[]}
 */
export function pageRoutesFrom(pagesDir, fs) {
  return listContentDir(pagesDir, fs)
    .filter((entry) => !entry.startsWith("_") && !entry.startsWith("["))
    .map((entry) => entry.replace(/\.(js|jsx|ts|tsx)$/, ""));
}
