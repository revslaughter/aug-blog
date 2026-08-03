/**
 * Helpers that get a freshly loaded page into a state where two runs of the
 * same commit produce byte-identical screenshots.
 */

/**
 * Navigate to `path` and wait until nothing is left that could still move:
 * webfonts swapped in, every image decoded (including the lazy ones below the
 * fold), and CSS transitions finished.
 *
 * @param {import("@playwright/test").Page} page
 * @param {string} path route path, e.g. "/recipes/template"
 */
export async function gotoStable(page, path) {
  await page.goto(path, { waitUntil: "load" });

  // next/image defers off-screen images, and a full-page screenshot will
  // capture them mid-fade unless they have been scrolled into view first.
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let travelled = 0;
      const step = window.innerHeight;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        travelled += step;
        if (travelled >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 50);
    });
    window.scrollTo(0, 0);
  });

  await page.evaluate(() => document.fonts.ready);

  await page.waitForFunction(() =>
    Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0)
  );

  // One more frame so the scroll-back-to-top has settled before we capture.
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  );
}
