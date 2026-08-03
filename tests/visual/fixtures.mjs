import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test as base } from "@playwright/test";

const CACHE_DIR = fileURLToPath(new URL("./font-cache", import.meta.url));
const manifest = JSON.parse(readFileSync(path.join(CACHE_DIR, "manifest.json"), "utf8"));

/**
 * Screenshot test fixture: a page that cannot reach the internet.
 *
 * Two things follow from that. Google Fonts are served from the committed
 * cache, so type rendering is identical on every machine and immune to a CDN
 * revision bump. And everything else off-origin is refused outright rather
 * than left to hang — the site links out to Facebook, Google Maps and the
 * Square store, and a slow third party must not be able to turn a screenshot
 * into a flake.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Registered first, so it is consulted last: Playwright tries route
    // handlers in reverse registration order.
    await page.route("**/*", async (route) => {
      const { hostname } = new URL(route.request().url());
      if (hostname === "127.0.0.1" || hostname === "localhost") {
        await route.fallback();
        return;
      }
      await route.abort("blockedbyclient");
    });

    await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, async (route) => {
      const url = route.request().url();
      const fileName = manifest.files[url];

      if (!fileName) {
        // Google shipped a new font revision, or globals.css changed its
        // @import. Fail loudly instead of silently screenshotting fallback
        // type, which would look like an unrelated site-wide regression.
        await route.abort("failed");
        throw new Error(
          `No cached response for ${url}.\n` +
            "Run `node scripts/update-font-cache.mjs` and refresh the baselines."
        );
      }

      await route.fulfill({
        status: 200,
        contentType: manifest.contentTypes[path.extname(fileName)],
        headers: { "cache-control": "no-store" },
        body: readFileSync(path.join(CACHE_DIR, fileName)),
      });
    });

    await use(page);
  },
});

export { expect } from "@playwright/test";
