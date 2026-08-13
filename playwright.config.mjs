import { defineConfig, devices } from "@playwright/test";

/**
 * Screenshot ("visual regression") tests.
 *
 * Every page in `tests/visual/routes.js` is captured at each viewport below
 * and compared against a committed baseline. A run fails if more than
 * VISUAL_MAX_DIFF_RATIO of the pixels changed (0.1% by default) — see the
 * constant below for why that number, and what happens at 1%.
 *
 * Baselines are byte-comparable only when the renderer is identical, so they
 * are generated and checked in the pinned Playwright container that CI uses
 * (see README "Screenshot tests"). Running `--update-snapshots` on a Mac will
 * produce baselines that fail in CI.
 */

const PORT = Number(process.env.VISUAL_PORT || 4321);
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Fraction of pixels allowed to differ before a page is considered changed.
 *
 * 0.1%, chosen from measurement rather than feel. Restoring the nav bar was
 * the case that exposed the old 1%: it changed all 64 baselines but failed
 * only 36 of them, because on a sparse page most of what a 48px bar displaces
 * is flat background that looks identical shifted. Twenty-eight baselines
 * would have kept passing while depicting a site with no nav — a threshold
 * that hides a whole navigation bar is not protecting anything.
 *
 * The two numbers this sits between, both measured in the pinned container:
 *
 *   noise   0 pixels. Re-rendering a page whose baseline was generated in
 *           this image reproduces it exactly — 61 of 65 at zero difference,
 *           the other 4 being baselines that predated the current image.
 *   signal  5,126 pixels, the smallest change the nav produced anywhere.
 *
 * So there is no real tension to trade off: the gap is the whole range. This
 * sits near the bottom of it, leaving room for incidental variation without
 * leaving room for a structural change.
 *
 * Re-measure before loosening this. If it starts failing spuriously the cause
 * is a renderer that no longer matches the baselines — regenerate them (see
 * the README) rather than widening the tolerance to cover the drift.
 */
const MAX_DIFF_RATIO =
  process.env.VISUAL_MAX_DIFF_RATIO !== undefined &&
  process.env.VISUAL_MAX_DIFF_RATIO !== ""
    ? Number(process.env.VISUAL_MAX_DIFF_RATIO)
    : 0.001;

/**
 * The canonical viewport set. `deviceScaleFactor: 1` everywhere keeps the
 * baselines small and makes the diff ratio mean the same thing at every size.
 */
const VIEWPORTS = [
  { name: "mobile", width: 375, height: 667 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
  { name: "wide", width: 1920, height: 1080 },
];

export default defineConfig({
  testDir: "./tests/visual",
  outputDir: "./test-results",
  fullyParallel: true,
  // A committed baseline that no longer matches is the whole point of these
  // tests; refuse to let `test.only` or a stray `--update-snapshots` land.
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],

  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: MAX_DIFF_RATIO,
      // Per-pixel colour tolerance (0-1). The default; stated here so the two
      // knobs that decide pass/fail are visible in one place.
      threshold: 0.2,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },

  use: {
    baseURL: BASE_URL,
    // The diff image and the trace are what make a failed run actionable.
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },

  // One baseline directory per viewport, named for the route under test.
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}{ext}",

  projects: VIEWPORTS.map(({ name, width, height }) => ({
    name,
    use: {
      ...devices["Desktop Chrome"],
      viewport: { width, height },
      deviceScaleFactor: 1,
      isMobile: false,
    },
  })),

  webServer: {
    // Rebuild before serving so the screenshots always describe the working
    // tree rather than whatever `out/` happens to hold.
    command: `npm run build && node scripts/serve-static.mjs --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    env: {
      // Upcoming events come from a live calendar that changes day to day,
      // which would make the homepage baseline stale within a week. Build
      // against a fixture calendar instead, with the clock frozen so the same
      // events land in the 30-day window and print the same dates every time.
      // See tests/visual/fixtures/README.md.
      CALENDAR_FIXTURE_ICS: "tests/visual/fixtures/events.ics",
      CALENDAR_NOW: "2026-05-04T14:00:00Z",
      // Posts and recipes come from a fixture rather than _posts/ and
      // _recipes/, for the same reason the calendar does: the blog index lists
      // real content, so every post the client publishes would change its
      // baseline and turn this check red on a commit that touched no code.
      // Against the fixture these baselines move only when the layout does.
      // See tests/visual/fixtures/README.md.
      CONTENT_FIXTURE_DIR: "tests/visual/fixtures/content",
      // Draft content is deliberately left off, so these screenshots describe
      // exactly what deploys. It also keeps the run deterministic: a scratch
      // `test-*` draft in someone's working tree would otherwise appear on the
      // blog index and fail the comparison on their machine but nowhere else.
      INCLUDE_DRAFT_CONTENT: "false",
      // Belt and braces on dates: the formatter already pins UTC, so this
      // guards anything that reaches for the ambient zone in future.
      TZ: "UTC",
    },
  },
});
