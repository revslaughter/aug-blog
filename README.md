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
_posts/            Blog posts (Markdown + frontmatter), written via /admin
_recipes/          Recipes, same shape as posts but undated
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

`getUpcomingEvents` takes the calendar and the clock as arguments and reads no
globals; `calendarOptionsFromEnv` is the single place that turns environment
variables into those arguments. Two more it understands — `CALENDAR_FIXTURE_ICS`
(a local `.ics` path, which wins over the live feed) and `CALENDAR_NOW` (freezes
the start of the "upcoming" window) — exist so the screenshot tests can build
against a fixed calendar. Leave both unset in Netlify.

**Publishing an event:** only events whose title starts with `[PUBLIC]` are
shown on the site — everything else on the calendar stays private. Just
prefix the title in Google Calendar, e.g. rename "Bunny Event" to
`[PUBLIC] Bunny Event`; the prefix is stripped automatically before display.

Because the data is baked in at build time, it only updates on a fresh
deploy. `.github/workflows/daily-refresh.yml` triggers a Netlify rebuild
every morning (via a `NETLIFY_BUILD_HOOK_URL` repo secret) so events stay
current even without a code push. Trigger it manually anytime from the
Actions tab, or just push a commit.

Daily bounds how stale the feed can get to 24 hours, but it is a schedule and
not a publish hook: an event added this afternoon appears tomorrow morning. For
a same-day addition, run the workflow by hand.

## Writing a blog post

**Use the editor at [`/admin`](#the-editor-admin).** It generates the filename,
enforces the fields, and commits for you. Everything below describes what it
writes, and is the fallback for editing a post by hand.

A post is a Markdown file in `_posts/`, named for its slug (e.g.
`spring-plant-sale.md`), with YAML frontmatter:

```markdown
---
title: Your Title
author: Your Name
pubdate: 2026-06-25
---

Post body in Markdown…
```

It is picked up automatically — it appears on the blog, gets its own page at
`/posts/<slug>`, and is added to the sitemap on the next build. Recipes work
the same way in `_recipes/`, with `title` and `author` but no date.

`pubdate` is forgiving: a bare date (`2026-06-25`), a quoted one
(`"2026-06-25"`), or one written out (`June 25, 2026`) all work, and a post
with no date still publishes — it just sorts last and shows no date. Nothing
you can type in frontmatter will fail the build.

`_posts/` and `_recipes/` are empty apart from a `.gitkeep`, which is only
there because git does not track empty directories. Delete it and a fresh
clone has no `_posts/` at all; the build survives that, but the file costs
nothing.

### Draft content

Files named `test-*` are scratch drafts. They are gitignored, so they never
leave your machine, and they are **not built into anything that deploys** —
you can leave one half-written without it reaching the site.

The switch is `INCLUDE_DRAFT_CONTENT`, defined in `util/contentFiles.mjs`:

| Where | Drafts built? | How |
| ----- | ------------- | --- |
| `npm run dev` | yes | `NODE_ENV=development` |
| `npm run build` locally | no | matches what deploys |
| `npm run test:visual` | no | screenshots describe what deploys |
| Netlify (all contexts) | no | pinned in `netlify.toml` |

It fails closed: anything that isn't an explicit opt-in leaves drafts out, so a
misconfigured environment under-publishes rather than leaking a draft to the
live site. To preview a production build locally, just `npm run build` — to
preview it *with* drafts, `INCLUDE_DRAFT_CONTENT=true npm run build`.

## The editor (`/admin`)

[Sveltia CMS](https://sveltiacms.app) runs at `/admin` on the deployed site. It
is a writing interface over this repo: entries are saved as Markdown in
`_posts/` and `_recipes/` and committed to **`publish`**, a content-only branch
that Netlify builds as a preview. Content stays in git — the CMS is a front end
onto it, not a separate store, so it can be removed at any time and every post
remains a file in this repo.

It exists because publishing by hand meant a GitHub account, a branch, a pull
request, an exact filename, and correct YAML. The editor generates the
filename, enforces the fields, and commits.

**Setup is two files** — `public/admin/index.html` and
`public/admin/config.yml`. There is no dependency, no build step, and nothing
in `package.json`; the CMS is a single-page app loaded from a CDN.

### Signing in

Sveltia needs a way to authenticate against GitHub. Two options, in order of
preference:

**1. GitHub OAuth through Netlify (recommended for the client).** Netlify hosts
the OAuth flow, so there is nothing to deploy and no change to `config.yml`.

1. On GitHub: **Settings → Developer settings → OAuth Apps → New OAuth App**.
   Set the callback URL to `https://api.netlify.com/auth/done`.
2. On Netlify: **Site configuration → Access & security → OAuth → Install
   provider**, choose GitHub, and paste the Client ID and Secret.
3. Anyone with write access to the repo can now sign in at `/admin` with
   "Sign in with GitHub".

**2. Personal access token (fine for a quick trial).** Choose "Sign In with
Token" on the login screen and paste a GitHub token — the login screen links to
a pre-scoped token page. The token is kept in the browser's local storage. Good
for verifying the setup; not what you want to hand a non-technical author.

A [Cloudflare Worker authenticator](https://github.com/sveltia/sveltia-cms-auth)
is also supported via `backend.base_url`, and is the route to take if the site
ever leaves Netlify.

### Publishing behaviour

Saving commits to **`publish`** — a branch that carries content and nothing
else. Netlify builds it as a branch deploy, so the author writes, saves, and
sees their work on that preview a few minutes later, without needing anybody's
help and without it being live.

Going live is a separate, deliberate act: merge `publish` into `main`.

**Why not `beta` or `alpha`.** Those are integration branches — they hold code
that is not released yet. Merging one of them to publish a blog post would
release that code at the same time. `publish` is cut from `main` and only ever
receives commits from the editor, so merging it back is a content-only diff.
Content and code move at different speeds and on different authority: the
client decides when a post is ready, you decide when code ships.

There is no review step inside the editor by design — that step is what left
two client-written posts sitting unmerged. The branch provides the "look before
it ships" safety instead, without blocking the writing. If you do want review
in the editor, add `publish_mode: editorial_workflow` to the `backend` block in
`config.yml`; the CMS then opens a pull request per entry and grows a
draft → in review → ready workflow, and somebody has to merge each one.

#### Setting up the branch

Not yet created — do this before handing `/admin` to anyone:

```bash
git fetch origin
git checkout -B publish origin/main
git push -u origin publish
```

Then in Netlify, add `publish` to the branches that get deploys (Site
configuration → Build & deploy → Branch deploys) so the author has somewhere to
preview.

After each `publish` → `main` merge, re-cut the branch so it never drifts from
production:

```bash
git checkout -B publish origin/main
git push --force-with-lease
```

## Screenshot tests

Every page is captured at four viewports and compared, pixel by pixel, against
a committed baseline image. A page fails if **more than 0.1% of its pixels
changed**. This is the safety net for CSS edits: a tweak to `globals.css` that
quietly breaks the recipe pages on mobile shows up as a failing check rather
than a client email.

That threshold is deliberately tight, and it is set from measurement — the
reasoning is in `playwright.config.mjs`. The short version: baselines generated
in the pinned container reproduce **exactly**, so there is no antialiasing
noise to leave room for, and slack only buys the chance to miss something. At
the previous 1%, restoring the nav bar changed all 64 baselines but failed only
36 of them — on a sparse page, most of what a 48px bar displaces is flat
background that looks identical shifted, so 28 baselines would have gone on
passing while depicting a site with no navigation.

```
tests/visual/
  routes.mjs            The pages under test (add new pages here)
  pages.spec.mjs        One test per route per viewport, plus a coverage guard
  fixtures.mjs          Serves fonts offline, blocks all other network access
  stabilize.mjs         Waits out lazy images, webfonts and transitions
  fixtures/events.ics   The fixed calendar the homepage is built against
  font-cache/           Captured Google Fonts responses (see below)
  __screenshots__/      The baselines, one directory per viewport
```

Beyond the pages themselves, one interaction is captured: the event modal,
opened on the fixture entry that carries every optional field (long
description, linkified URL and hashtag, "View original" link).

Viewports: `mobile` 375×667, `tablet` 768×1024, `desktop` 1280×800,
`wide` 1920×1080. They live in `playwright.config.mjs` along with the 0.1%
threshold, which `VISUAL_MAX_DIFF_RATIO` overrides for a one-off run — useful
for measuring how far off a change actually is before deciding what to do
about it.

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
- **Events.** The homepage's event feed comes from a live calendar and would go
  stale within days, so the test build points `CALENDAR_FIXTURE_ICS` at
  `tests/visual/fixtures/events.ics` and freezes the clock with `CALENDAR_NOW`.
  Same 30-day window, same six cards, same printed dates on every build. The
  fixture is a real iCalendar file parsed by the real `util/googleCalendar.js`,
  so the `[PUBLIC]` filter and the recurring-event expansion are exercised on
  the way to the screenshot — see `tests/visual/fixtures/README.md` for what
  each entry covers.
- **Build timezone.** `formatDisplayDate` already renders post dates from UTC
  parts, so this is belt and braces: the test build also pins `TZ=UTC` to catch
  anything that reaches for the ambient zone later.
- **Draft content.** The test build sets `INCLUDE_DRAFT_CONTENT=false`, so a
  scratch `test-*` draft in your working tree can't appear on the blog index
  and fail the comparison on your machine but nowhere else.

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

Two tracks, meeting only at `main`.

**Code** moves through integration:

```
feature/*  →  alpha  →  beta  →  main
```

- **`feature/*`** — individual pieces of work
- **`alpha`** — integration branch where features are merged and conflicts resolved
- **`beta`** — client preview (Netlify deploy preview)
- **`main`** — production (deploys to the live site)

**Content** does not:

```
main  →  publish  →  main
```

- **`publish`** — cut from `main`, receives commits only from the editor at
  `/admin`, and is merged back into `main` to go live. Re-cut from `main` after
  each merge.

Keeping them apart is the point: `publish` never carries unreleased code, so
putting a blog post live cannot ship a half-finished feature with it, and a
code release cannot be held up waiting on content.

CI (GitHub Actions) runs lint, build, unit tests, and the screenshot tests on
every push; a non-blocking `npm audit` reports advisories. Netlify builds with `npm ci && npm run build` and
publishes the `out/` directory.
