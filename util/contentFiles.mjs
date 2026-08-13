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

/**
 * Draft content: the starter files authors copy, and fixtures the screenshot
 * tests capture. Kept in the repo on purpose — `npm run dev` and the visual
 * suite both need a post and a recipe to render — but never deployed, so the
 * live site does not serve "Put Your Title Here" or Dante's spaghetti.
 *
 * `test-*` is the scratch-draft convention from .gitignore; `test` is the
 * recipe fixture, which predates it.
 */
const DRAFT_SLUGS = new Set(["template", "test"]);
const DRAFT_PREFIX = "test-";

/**
 * @param {string} slug
 * @returns {boolean}
 */
export function isDraftSlug(slug) {
  return DRAFT_SLUGS.has(slug) || slug.startsWith(DRAFT_PREFIX);
}

/**
 * Whether draft content is built as pages.
 *
 * Fails closed: anything that is not an explicit opt-in excludes drafts, so a
 * misconfigured environment under-publishes rather than leaking a template to
 * production. `next dev` opts in automatically; everything else — including a
 * local `npm run build`, so it matches what deploys — has to ask.
 *
 * The visual suite opts in through playwright.config.mjs, which is what keeps
 * the detail-page baselines meaningful.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {boolean}
 */
export function includeDraftContent(env = process.env) {
  const flag = env.INCLUDE_DRAFT_CONTENT;
  if (flag !== undefined && flag !== "") {
    return flag === "true" || flag === "1";
  }
  return env.NODE_ENV === "development";
}

/**
 * List a content directory, treating a missing one as empty.
 *
 * `_posts/` and `_recipes/` each hold only a .gitkeep now that the templates
 * are gone, and git does not track empty directories — delete that file and
 * the directory stops existing on a fresh clone, which made `readdirSync`
 * throw ENOENT and failed the build. An empty content directory is a normal
 * state for a site with nothing published yet, so it renders the empty state
 * rather than stopping the build.
 *
 * @param {string} dir
 * @param {typeof import("fs")} fs
 * @returns {string[]}
 */
export function listContentDir(dir, fs) {
  try {
    return fs.readdirSync(dir);
  } catch (err) {
    if (err.code === "ENOENT") {
      console.warn(`[content] ${dir} does not exist; treating as empty.`);
      return [];
    }
    throw err;
  }
}

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
 * The single definition of "what's publishable in this directory": Markdown
 * only, and drafts only where they are wanted. Sorted so builds are
 * reproducible — readdir order is filesystem-dependent.
 *
 * @param {string[]} filenames Raw directory listing
 * @param {{includeDrafts?: boolean}} [options] Defaults to reading the environment
 * @returns {string[]} Publishable slugs
 */
export function publishableSlugs(filenames, { includeDrafts } = {}) {
  const withDrafts = includeDrafts ?? includeDraftContent();
  return filenames
    .filter(isMarkdownFile)
    .map(slugFromFilename)
    .filter((slug) => withDrafts || !isDraftSlug(slug))
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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Format an ISO date for display, as `Thu May 05 2022`.
 *
 * That is `Date.prototype.toDateString`'s format, reproduced from UTC parts
 * rather than called directly, and deliberately so: `toDateString()` renders
 * in the running machine's timezone, so a post dated the 1st displayed as the
 * previous day on any agent west of UTC. Netlify builds in UTC and a
 * contributor's laptop does not, which made the rendered date depend on who
 * ran the build. (The caller made it worse by passing an *array* to the Date
 * constructor, which parsed only by accident.)
 *
 * Keeping the exact format is what makes this fix invisible to the screenshot
 * baselines. It is not a good format for a byline — "May 5, 2022" would read
 * better — but changing it is a design decision and a baseline refresh, not a
 * bug fix, so it is left alone here.
 *
 * @param {string|null} isoDate
 * @returns {string|null}
 */
export function formatDisplayDate(isoDate) {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${WEEKDAYS[date.getUTCDay()]} ${MONTHS[date.getUTCMonth()]} ${day} ${date.getUTCFullYear()}`;
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
