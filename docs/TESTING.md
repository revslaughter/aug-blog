# Screenshot tests

Every page is captured at four viewports and compared, pixel by pixel, against a
committed baseline. A page fails if **more than 0.1% of its pixels changed**.
This is the safety net for CSS edits: a tweak to `globals.css` that quietly
breaks the recipe pages on mobile shows up as a failing check rather than a
client email.

That threshold is deliberately tight, and set from measurement — the reasoning
is in `playwright.config.mjs`. The short version: baselines generated in the
pinned container reproduce **exactly**, so there is no antialiasing noise to
leave room for, and slack only buys the chance to miss something. At the
previous 1%, restoring the nav bar changed all 64 baselines but failed only 36
of them — on a sparse page, most of what a 48px bar displaces is flat background
that looks identical shifted, so 28 baselines would have gone on passing while
depicting a site with no navigation.

```
tests/visual/
  routes.mjs            The pages under test (add new pages here)
  pages.spec.mjs        One test per route per viewport, plus a coverage guard
  fixtures.mjs          Serves fonts offline, blocks all other network access
  stabilize.mjs         Waits out lazy images, webfonts and transitions
  fixtures/events.ics   The fixed calendar the homepage is built against
  fixtures/content/     The fixed posts and recipes the blog is built against
  font-cache/           Captured Google Fonts responses
  __screenshots__/      The baselines, one directory per viewport
```

Fifteen routes plus one interaction — the event modal, opened on the fixture
entry that carries every optional field — at four viewports: 64 baselines.
Viewports are `mobile` 375×667, `tablet` 768×1024, `desktop` 1280×800, `wide`
1920×1080, defined in `playwright.config.mjs` alongside the threshold.
`VISUAL_MAX_DIFF_RATIO` overrides it for a one-off run, which is useful for
measuring how far off a change actually is before deciding what to do.

Adding a page under `pages/` without adding it to `routes.mjs` fails the "every
exported route has a screenshot baseline" test, so nothing slips out of coverage
silently.

## Running them

```bash
npm run test:visual          # build, serve out/, compare against baselines
npm run test:visual:report   # open the report — expected/actual/diff, side by side
```

The config rebuilds the site and serves `out/` over `scripts/serve-static.mjs`,
which reproduces Netlify's clean URLs so the screenshots match what ships.

## When a change is intentional

A failing screenshot means "something moved", not "something broke". Look at the
diff in the report first. If the new rendering is what you wanted, regenerate the
baselines and commit them as part of the same change, so the PR shows the visual
change alongside the CSS that caused it.

**Never regenerate on the host.** Pixel comparison is only meaningful when the
renderer is identical, and a Mac renders text differently from the Linux
container CI uses. The trap is that `--update-snapshots` rewrites *every*
baseline that differs, not only the ones you meant to change — so rebaselining
six pages on a Mac also silently rewrites pages you never touched, and CI goes
red on all of them. Measured on this repo: `/404` renders 1037 pixels different
outside the image, on a page nothing had touched.

Two ways to do it correctly.

**Locally, through Docker** — the everyday route:

```bash
npm run baseline          # regenerate baselines in the pinned container
npm run baseline:check    # run the comparison there, without rewriting anything
```

`scripts/visual-container.mjs` mounts the working tree into
`mcr.microsoft.com/playwright:v1.56.1-noble` and runs `test:visual:update`
inside it, so the host OS stops mattering. It masks `node_modules` with a
container-only volume, so the Linux install does not overwrite your native
binaries and break `npm run dev`; caches npm downloads in a named volume; and
hands ownership back on Linux, where the container would otherwise leave
root-owned PNGs. Extra arguments pass through —
`npm run baseline:check -- --project=desktop`. Set `VISUAL_CONTAINER_PRINT=1` to
print the `docker run` command instead of executing it.

Run `npm run baseline:check` before pushing and confirm it is green, then check
`git status`: only the pages you actually changed should appear. Anything else in
that diff means the renderer disagreed and is worth stopping for.

**In CI** — when Docker is not available: **Actions → Refresh screenshot
baselines → Run workflow**, pick your branch, say why, and it pushes the updated
PNGs to that branch.

The image tag is derived from the installed `@playwright/test` rather than
written into the script, and `util/playwrightImage.test.js` fails if either
workflow drifts from it — so bumping the dependency without updating the
workflows is caught by `npm test` rather than by a confusing rebaseline later.

## What makes the screenshots reproducible

Four sources of drift are deliberately removed:

- **Fonts.** `globals.css` pulls Marcellus, Suranna and VT323 from the Google
  Fonts CDN. The tests intercept both font hosts and replay the responses
  committed under `tests/visual/font-cache/`, so a font revision bump on
  Google's side can't fail every page at once. Refresh it with
  `node scripts/update-font-cache.mjs` when you deliberately want newer files
  (or after changing the `@import`s), then regenerate the baselines. Everything
  else off-origin is blocked outright, so a slow third party can't turn a
  screenshot into a flake.
- **Events.** The homepage feed comes from a live calendar and would go stale
  within days, so the test build points `CALENDAR_FIXTURE_ICS` at
  `tests/visual/fixtures/events.ics` and freezes the clock with `CALENDAR_NOW`.
  The fixture is a real iCalendar file parsed by the real `util/googleCalendar.js`,
  so the `[PUBLIC]` filter and recurring-event expansion are exercised on the way
  to the screenshot — `tests/visual/fixtures/README.md` covers what each entry is
  for.
- **Published content.** The blog and recipe indexes list real posts, so every
  post the client publishes would change `posts-index`'s baseline and fail this
  check on a commit that touched no code. The test build points
  `CONTENT_FIXTURE_DIR` at `tests/visual/fixtures/content`, so these baselines
  move only when the layout does. It also buys back coverage: `_posts/` and
  `_recipes/` are empty in the repo, so without it the article and recipe layouts
  would have no screenshots at all.
- **Time and drafts.** The test build pins `TZ=UTC` (belt and braces —
  `formatDisplayDate` already renders post dates from UTC parts) and sets
  `INCLUDE_DRAFT_CONTENT=false`, so a scratch `test-*` draft in your working tree
  can't appear on the blog index and fail the comparison on your machine but
  nowhere else.
