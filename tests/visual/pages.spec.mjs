import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "./fixtures.mjs";
import { ROUTES } from "./routes.mjs";
import { gotoStable } from "./stabilize.mjs";

const OUT_DIR = fileURLToPath(new URL("../../out", import.meta.url));

test.describe("page screenshots", () => {
  for (const route of ROUTES) {
    test(`${route.name} matches its baseline`, async ({ page }) => {
      await gotoStable(page, route.path);
      await expect(page).toHaveScreenshot(`${route.name}.png`, { fullPage: true });
    });
  }
});

/**
 * The event modal is the one piece of the site behind an interaction, so a
 * plain page capture never sees it. Opened on the fixture's Compost Drop-In,
 * the one entry carrying every optional field — a description long enough to
 * be truncated on the card, a bare URL and a #hashtag for the linkifier to
 * pick up, and a `URL:` for the "View original" link.
 *
 * Viewport-sized rather than full-page: the dialog is fixed and centred, and
 * `showModal()` locks body scrolling.
 */
test("event modal matches its baseline", async ({ page }) => {
  await gotoStable(page, "/");
  await page.getByRole("button", { name: "View details for Compost Program Drop-In" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveScreenshot("home-event-modal.png");
});

/**
 * Coverage guard: a new page under `pages/` should not be able to ship without
 * a baseline. Runs once (the route list is viewport-independent) rather than
 * repeating in every project.
 */
test("every exported route has a screenshot baseline", async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "route list is viewport-independent");

  const covered = new Set(ROUTES.map((route) => route.path));
  const exported = [];

  // Static assets copied out of public/ that are not pages of the site.
  // /admin is the Sveltia CMS editor: a third-party single-page app loaded
  // from a CDN, so its markup is neither ours to review nor stable enough to
  // hold a pixel baseline against.
  const NOT_A_PAGE = new Set(["admin"]);

  const walk = (dir, prefix) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_")) continue; // _next build assets
      if (prefix === "" && NOT_A_PAGE.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, `${prefix}/${entry.name}`);
      } else if (entry.name.endsWith(".html")) {
        const base = entry.name.replace(/\.html$/, "");
        exported.push(base === "index" ? prefix || "/" : `${prefix}/${base}`);
      }
    }
  };
  walk(OUT_DIR, "");

  const uncovered = exported.filter((route) => !covered.has(route)).sort();
  expect(
    uncovered,
    "Add these routes to tests/visual/routes.mjs (or remove the page)"
  ).toEqual([]);
});
