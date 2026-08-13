/**
 * The canonical set of pages covered by the screenshot tests.
 *
 * `name` becomes the baseline filename, so keep it stable — renaming an entry
 * orphans its baselines and the next run will report a missing snapshot.
 *
 * When you add a page under `pages/`, add it here too; `pages.spec.js` has a
 * guard test that fails if an exported route is missing from this list, so
 * nothing silently escapes visual coverage.
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

// No post or recipe detail route is covered here at the moment, because none
// is exported: _posts/ and _recipes/ hold only their authoring templates, and
// templates are no longer built as pages (util/contentFiles.mjs). The detail
// pages previously covered — /posts/template, /recipes/template and
// /recipes/test — were those templates and a leftover fixture, shipping to
// production as if they were real content.
//
// When the first real post or recipe lands, add a detail route here so the
// layout is covered again. The guard test at the bottom of pages.spec.mjs
// will fail the build until you do.

