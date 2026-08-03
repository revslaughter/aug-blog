# Antioch Urban Growers

Marketing and blog site for [Antioch Urban Growers](https://www.antiochurbangrowers.com) —
a Kansas City urban farm. Built with Next.js and deployed as a fully static site
to Netlify.

## Tech stack

- **Next.js 16** (Pages Router) with **React 19**
- **Static export** (`output: "export"`) — the build emits plain HTML/CSS/JS to
  `out/`; there is no server runtime
- **Markdown blog** — posts live in `_posts/`, parsed with `gray-matter` and
  rendered with `remark`
- **ESLint 9** (flat config) + **Jest** / React Testing Library
- **Playwright** screenshot tests across four viewports
- **Node 22** (pinned via `.nvmrc`)

## Getting started

```bash
nvm use            # Node 22, per .nvmrc
npm ci             # install exact dependency versions
npm run dev        # dev server at http://localhost:3000
```

## Scripts

| Command          | What it does                                                        |
| ---------------- | ------------------------------------------------------------------- |
| `npm run dev`    | Start the local dev server                                          |
| `npm run build`  | Generate the sitemap, then build the static export into `out/`      |
| `npm run lint`   | Run ESLint                                                          |
| `npm test`       | Run the Jest test suite                                             |
| `npm run test:visual` | Build the site and compare every page against its screenshot baselines |
| `npm run test:visual:update` | Rewrite the baselines from the current build                 |
| `npm run test:visual:report` | Open the last screenshot run's HTML report (diffs included)  |

`npm run build` runs `scripts/generate-sitemap.mjs` first (via `prebuild`) to
regenerate `public/sitemap.xml` from the static routes and published posts.

## Project structure

```
pages/            Routes (Pages Router)
  index.js          Home
  about.js          About
  contact.js        Contact
  posts/            Blog index + dynamic post pages ([slug].js)
components/         Layout, header/footer, RecentPosts, Seo, StructuredData
util/              Post loading/markdown helpers, siteMeta (SEO source of truth)
_posts/            Blog posts (Markdown + frontmatter); template.md is the starter
public/            Static assets (logo, favicon, robots.txt)
scripts/           Build-time sitemap generator, static server + font cache for tests
styles/            CSS modules + globals
tests/visual/      Playwright screenshot tests and their committed baselines
```

## Upcoming events (Google Calendar)

The homepage shows upcoming events pulled from a public Google Calendar. Since
the site is a static export with no server runtime, the feed is fetched and
baked into the page at **build time** (`util/googleCalendar.js`, called from
`pages/index.js`'s `getStaticProps`) — not fetched by the visitor's browser.

Setup:

1. In Google Calendar, go to the calendar's **Settings and sharing** >
   **Integrate calendar**, and copy the **Secret address in iCal format**.
2. Set it as the `GOOGLE_CALENDAR_ICS_URL` environment variable in Netlify
   (Site configuration > Environment variables) and in your local `.env.local`
   for `npm run dev`.
3. If the calendar has no events, or the env var is unset, or the fetch
   fails, the homepage simply omits the events section — a bad calendar feed
   can never break the build.

**Publishing an event:** only events whose title starts with `[PUBLIC]` are
shown on the site — everything else on the calendar stays private. Just
prefix the title in Google Calendar, e.g. rename "Bunny Event" to
`[PUBLIC] Bunny Event`; the prefix is stripped automatically before display.

Because the data is baked in at build time, it only updates on a fresh
deploy. `.github/workflows/weekly-refresh.yml` triggers a Netlify rebuild
every Monday (via a `NETLIFY_BUILD_HOOK_URL` repo secret) so events stay
current even without a code push. Trigger it manually anytime from the
Actions tab, or just push a commit.

We are experimenting to find the right cadence.

## Writing a blog post

Copy `_posts/template.md`, rename it to your post's slug (e.g.
`spring-plant-sale.md`), and fill in the frontmatter:

```markdown
---
title: Your Title
author: Your Name
pubdate: 2026-06-25
---

Post body in Markdown…
```

The post is picked up automatically — it appears on the blog, gets its own page
at `/posts/<slug>`, and is added to the sitemap on the next build. Files named
`test-*` are gitignored scratch drafts.

## Screenshot tests

Every page is captured at four viewports and compared, pixel by pixel, against
a committed baseline image. A page fails if **more than 1% of its pixels
changed** — enough slack to absorb antialiasing noise, tight enough to catch a
heading that moved or a card that reflowed. This is the safety net for CSS
edits: a tweak to `globals.css` that quietly breaks the recipe pages on mobile
shows up as a failing check rather than a client email.

```
tests/visual/
  routes.mjs            The pages under test (add new pages here)
  pages.spec.mjs        One test per route per viewport, plus a coverage guard
  fixtures.mjs          Serves fonts offline, blocks all other network access
  stabilize.mjs         Waits out lazy images, webfonts and transitions
  font-cache/           Captured Google Fonts responses (see below)
  __screenshots__/      The baselines, one directory per viewport
```

Viewports: `mobile` 375×667, `tablet` 768×1024, `desktop` 1280×800,
`wide` 1920×1080. They live in `playwright.config.mjs` along with the 1%
threshold, which `VISUAL_MAX_DIFF_RATIO` overrides for a one-off run.

### Running them

```bash
npm run test:visual          # build, serve out/, compare against baselines
npm run test:visual:report   # open the report — expected/actual/diff, side by side
```

The config rebuilds the site and serves `out/` over
`scripts/serve-static.mjs`, which reproduces Netlify's clean URLs so the
screenshots match what actually ships.

### When a change is intentional

A failing screenshot means "something moved" — it does not mean "something
broke." Look at the diff in the report first. If the new rendering is what you
wanted, regenerate the baselines and commit them as part of the same change,
so the diff of the PR shows the visual change alongside the CSS that caused it.

**Regenerate in CI, not locally.** Pixel comparison is only meaningful when the
renderer is identical, and a Mac renders text differently from the Linux
container CI uses. Go to **Actions → Refresh screenshot baselines → Run
workflow**, pick your branch, say why, and it pushes the updated PNGs to that
branch. `npm run test:visual:update` is the same operation for anyone already
working inside `mcr.microsoft.com/playwright:v1.56.1-noble` — the image pinned
in both workflows, which must stay in step with the `@playwright/test` version
in `package.json`.

### What makes the screenshots reproducible

Two sources of drift are deliberately removed:

- **Fonts.** `globals.css` pulls Marcellus, Suranna and VT323 from the Google
  Fonts CDN. The tests intercept both font hosts and replay the responses
  committed under `tests/visual/font-cache/`, so a font revision bump on
  Google's side can't fail every page at once. Refresh it with
  `node scripts/update-font-cache.mjs` when you deliberately want newer files
  (or after changing the `@import`s), then regenerate the baselines.
  Everything else off-origin is blocked outright, so a slow third party can't
  turn a screenshot into a flake.
- **Events.** The homepage's event feed comes from a live calendar and would
  go stale within days, so the test build runs with `GOOGLE_CALENDAR_ICS_URL`
  unset and captures the feed's empty state. Populated states belong in the
  Jest/RTL component tests.

Adding a page under `pages/` without adding it to `routes.mjs` fails the
"every exported route has a screenshot baseline" test, so nothing slips out of
coverage silently.

## SEO

Site-wide SEO is centralized:

- `util/siteMeta.js` — single source of truth for URL, name, address, and social
  links. **Update business details here.**
- `components/seo.js` — per-page `<title>`, description, canonical, Open Graph,
  and Twitter Card tags.
- `components/structuredData.js` — `LocalBusiness` JSON-LD on the homepage.
- `public/robots.txt` and the generated `sitemap.xml`.

## Branching & deployment

```
feature/*  →  alpha  →  beta  →  main
```

- **`feature/*`** — individual pieces of work
- **`alpha`** — integration branch where features are merged and conflicts resolved
- **`beta`** — client preview (Netlify deploy preview)
- **`main`** — production (deploys to the live site)

CI (GitHub Actions) runs lint, build, unit tests, and the screenshot tests on
every push; a non-blocking `npm audit` reports advisories. Netlify builds with `npm ci && npm run build` and
publishes the `out/` directory.
