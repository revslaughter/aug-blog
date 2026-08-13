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
 * The three detail routes below are the authoring templates and the recipe
 * fixture. Production does not build them (util/contentFiles.mjs), so they
 * exist here only because playwright.config.mjs sets INCLUDE_DRAFT_CONTENT
 * for the build behind these tests. They are the repo's only post and recipe,
 * so without them the blog and recipe layouts have no coverage at all.
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
  { name: "post-detail", path: "/posts/template" },
  { name: "recipes-index", path: "/recipes" },
  { name: "recipe-detail", path: "/recipes/template" },
  { name: "recipe-detail-test", path: "/recipes/test" },
  { name: "not-found", path: "/404" },
];
