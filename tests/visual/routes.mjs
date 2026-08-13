/**
 * The canonical set of pages covered by the screenshot tests.
 *
 * `name` becomes the baseline filename, so keep it stable — renaming an entry
 * orphans its baselines and the next run will report a missing snapshot.
 *
 * When you add a page under `pages/`, add it here too; `pages.spec.js` has a
 * guard test that fails if an exported route is missing from this list, so
 * nothing silently escapes visual coverage.
 *
 * There is no post or recipe detail route here, because there is no post or
 * recipe: content is written through the CMS at /admin now, and the authoring
 * templates that used to stand in for real entries are gone. Both indexes
 * render their empty state.
 *
 * When the first real post or recipe is published, add a detail route so the
 * article layout is covered again. The guard test at the bottom of
 * pages.spec.mjs will fail until you do.
 */
export const ROUTES = [
  { name: "home", path: "/" },
  { name: "about", path: "/about" },
  { name: "compost", path: "/compost" },
  { name: "contact", path: "/contact" },
  { name: "mindful-movement", path: "/mindful-movement" },
  { name: "plant-sale", path: "/plant-sale" },
  { name: "produce-sale", path: "/produce-sale" },
  { name: "summer-faire", path: "/summer-faire" },
  { name: "workshops", path: "/workshops" },
  { name: "posts-index", path: "/posts" },
  { name: "recipes-index", path: "/recipes" },
  { name: "not-found", path: "/404" },
];
