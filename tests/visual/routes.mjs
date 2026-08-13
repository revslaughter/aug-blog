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
 * Posts and recipes come from tests/visual/fixtures/content, not from _posts/
 * and _recipes/, so the entries below are fixture content and do not change
 * when the client publishes. See tests/visual/fixtures/README.md.
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
  { name: "post-detail", path: "/posts/spring-plant-sale-is-open" },
  { name: "post-detail-undated", path: "/posts/notes-from-the-compost-pile" },
  { name: "recipes-index", path: "/recipes" },
  { name: "recipe-detail", path: "/recipes/roasted-roots-with-herb-oil" },
  { name: "not-found", path: "/404" },
];
