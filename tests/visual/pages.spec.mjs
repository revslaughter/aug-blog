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
 * Coverage guard: a new page under `pages/` should not be able to ship without
 * a baseline. Runs once (the route list is viewport-independent) rather than
 * repeating in every project.
 */
test("every exported route has a screenshot baseline", async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "route list is viewport-independent");

  const covered = new Set(ROUTES.map((route) => route.path));
  const exported = [];

  const walk = (dir, prefix) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_")) continue; // _next build assets
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
