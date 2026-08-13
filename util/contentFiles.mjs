/**
 * Shared rules for turning a content directory listing into publishable
 * slugs, and for reading a publish date out of frontmatter.
 *
 * This lives in one module because the rules have two consumers that run in
 * different places: the page loaders (`util/getPostForSlug.js`,
 * `util/getRecipesForMeal.js`, bundled by Next) and the sitemap generator
 * (`scripts/generate-sitemap.mjs`, run by plain node as `prebuild`). They
 * previously each carried their own copy, and drifted — the sitemap excluded
 * templates and scratch drafts while `getStaticPaths` did not, so
 * /posts/template shipped to production but never appeared in the sitemap.
 *
 * `.mjs` so plain node can import it from the prebuild script; a `.js` file
 * using `export` would be read as CommonJS and fail there.
 */

/** Starter file authors copy; never a page in its own right. */
const TEMPLATE_SLUG = "template";

/** Scratch drafts. Gitignored, but present in a working tree. */
const SCRATCH_PREFIX = "test-";

/**
 * Whether a directory entry is a Markdown file at all.
 *
 * Content directories accumulate things nobody meant to publish — .DS_Store,
 * an image dragged in through the GitHub web UI, a file saved without an
 * extension. Callers used to strip a `.md` suffix that might not be there and
 * then read `${slug}.md`, so any such file failed the build with ENOENT.
 *
 * @param {string} filename
 * @returns {boolean}
 */
export function isMarkdownFile(filename) {
  return filename.endsWith(".md");
}

/**
 * @param {string} filename
 * @returns {string}
 */
export function slugFromFilename(filename) {
  return filename.replace(/\.md$/, "");
}

/**
 * Whether a slug should become a page and a sitemap entry.
 *
 * @param {string} slug
 * @returns {boolean}
 */
export function isPublishableSlug(slug) {
  return slug !== TEMPLATE_SLUG && !slug.startsWith(SCRATCH_PREFIX);
}

/**
 * The single definition of "what's publishable in this directory": Markdown
 * only, no template, no scratch drafts. Sorted so builds are reproducible —
 * readdir order is filesystem-dependent.
 *
 * @param {string[]} filenames Raw directory listing
 * @returns {string[]} Publishable slugs
 */
export function publishableSlugs(filenames) {
  return filenames
    .filter(isMarkdownFile)
    .map(slugFromFilename)
    .filter(isPublishableSlug)
    .sort();
}

/**
 * Coerce a frontmatter date into an ISO string, or null.
 *
 * YAML only auto-coerces a *bare* ISO date to a Date, so `pubdate: 2026-09-01`
 * arrives as a Date while `pubdate: "2026-09-01"` arrives as a string and
 * `June 25, 2026` arrives as a different string again. Calling `.toJSON()` on
 * the result assumed the first case and threw on the other two — and on a
 * missing date — which failed the whole build rather than the one post.
 *
 * A date the author typed oddly should degrade, not take the site down, so
 * anything unparseable returns null and callers render without a date.
 *
 * @param {Date|string|number|null|undefined} value
 * @returns {string|null} ISO 8601 string, or null if absent/unparseable
 */
export function toIsoDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Format an ISO date for display.
 *
 * Pinned to UTC deliberately. The previous implementation passed an *array*
 * to the Date constructor and then called `toDateString()`, which renders in
 * the running machine's timezone — so a date rendered a day early whenever
 * the build agent sat west of UTC. Netlify builds in UTC and a contributor's
 * laptop does not, which made the output depend on who ran the build.
 *
 * @param {string|null} isoDate
 * @returns {string|null}
 */
export function formatDisplayDate(isoDate) {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Sort comparator putting the most recent first. Undated entries sort last
 * rather than throwing or landing arbitrarily among the dated ones.
 *
 * @param {{pubdate: string|null}} one
 * @param {{pubdate: string|null}} another
 * @returns {number}
 */
export function byNewestFirst(one, another) {
  if (!one.pubdate && !another.pubdate) return 0;
  if (!one.pubdate) return 1;
  if (!another.pubdate) return -1;
  return new Date(another.pubdate) - new Date(one.pubdate);
}
