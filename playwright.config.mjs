import { defineConfig, devices } from "@playwright/test";

/**
 * Screenshot ("visual regression") tests.
 *
 * Every page in `tests/visual/routes.js` is captured at each viewport below
 * and compared against a committed baseline. A run fails if more than
 * VISUAL_MAX_DIFF_RATIO of the pixels changed (1% by default) — small enough
 * to catch a shifted heading, loose enough to tolerate the sub-pixel noise
 * antialiasing produces between otherwise identical runs.
 *
 * Baselines are byte-comparable only when the renderer is identical, so they
 * are generated and checked in the pinned Playwright container that CI uses
 * (see README "Screenshot tests"). Running `--update-snapshots` on a Mac will
 * produce baselines that fail in CI.
 */

const PORT = Number(process.env.VISUAL_PORT || 4321);
const BASE_URL = `http://127.0.0.1:${PORT}`;

/** Fraction of pixels allowed to differ before a page is considered changed. */
const MAX_DIFF_RATIO = Number(process.env.VISUAL_MAX_DIFF_RATIO || 0.01);

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
      // The templates in _posts/ and _recipes/ are the only post and recipe
      // the repo carries, and production deliberately does not build them
      // (util/contentFiles.mjs). Opt in here so the detail-page routes exist
      // to be captured — without this the blog and recipe layouts have no
      // screenshot coverage at all.
      INCLUDE_DRAFT_CONTENT: "true",
      // Belt and braces on dates: the formatter already pins UTC, so this
      // guards anything that reaches for the ambient zone in future.
      TZ: "UTC",
    },
  },
});
