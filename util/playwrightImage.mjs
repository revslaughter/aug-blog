/**
 * The one place that knows how a @playwright/test version maps to a container
 * image tag.
 *
 * Pixel comparison only means anything when the renderer is identical, so the
 * image and the installed Playwright have to be the same version. That pairing
 * is currently asserted in three places — `ci.yml`, `visual-baselines.yml` and
 * `scripts/visual-container.mjs` — and the workflows carry a comment asking
 * whoever bumps the dependency to remember. `util/playwrightImage.test.js`
 * checks they agree instead of asking.
 *
 * `.mjs` so the container script can import it under plain node.
 */

/** The Ubuntu release the pinned image is built on. */
export const IMAGE_FLAVOUR = "noble";

/**
 * @param {string} version A @playwright/test version, e.g. "1.56.1"
 * @returns {string} e.g. "mcr.microsoft.com/playwright:v1.56.1-noble"
 */
export function playwrightImage(version) {
  return `mcr.microsoft.com/playwright:v${version}-${IMAGE_FLAVOUR}`;
}
