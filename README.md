# Antioch Urban Growers

Marketing and blog site for [Antioch Urban Growers](https://www.antiochurbangrowers.com)
— a Kansas City urban farm. Next.js, exported as a fully static site to Netlify.

The client writes the site themselves: the top-level pages, blog posts and
recipes are all Markdown in this repo, edited through a CMS at `/admin` and
published without a developer in the loop.

- **Live site** — `main`, deployed by Netlify
- **What's outstanding** — [the issue tracker](https://github.com/revslaughter/aug-blog/issues), which is the only roadmap

## Contents

- [Quick start](#quick-start) · [Scripts](#scripts) · [Project structure](#project-structure)
- [Section pages](#section-pages-_nav) · [Posts and recipes](#posts-and-recipes) · [Events](#upcoming-events-google-calendar)
- [The editor](#the-editor-admin) · [SEO](#seo)

See also: [CONTRIBUTING.md](CONTRIBUTING.md) for the branching model and CI,
[docs/TESTING.md](docs/TESTING.md) for the screenshot-testing workflow.

## Tech stack

- **Next.js 16** (Pages Router) with **React 19**
- **Static export** (`output: "export"`) — the build emits plain HTML/CSS/JS to
  `out/`; there is no server runtime
- **Markdown content** parsed with `gray-matter`, rendered with `remark`
- **Sveltia CMS** at `/admin`, loaded from a CDN — no dependency, no build step
- **ESLint 9** (flat config) + **Jest** / React Testing Library
- **Playwright** screenshot tests, every page at four viewports
- **Node 22** (pinned via `.nvmrc`)

## Quick start

```bash
nvm use            # Node 22, per .nvmrc
npm ci             # install exact dependency versions
npm run dev        # dev server at http://localhost:3000
```

## Scripts

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Start the local dev server |
| `npm run build` | Generate nav and sitemap, then build the static export into `out/` |
| `npm run generate` | Rewrite `util/nav.generated.json` and `public/sitemap.xml` from content |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Jest test suite |
| `npm run test:visual` | Build the site and compare every page against its baselines |
| `npm run test:visual:report` | Open the last screenshot run's report, diffs included |
| `npm run baseline` | Regenerate baselines in the pinned Playwright container |
| `npm run baseline:check` | Run the comparison in that container without rewriting anything |

`npm run test:visual:update` also exists, but prefer `npm run baseline` — see
[Rebaselining](docs/TESTING.md#when-a-change-is-intentional) for why running it
on the host is a trap.

`dev` and `build` both run `generate` first (via `predev`/`prebuild`), which
rewrites two build artefacts. Neither is committed:

- `util/nav.generated.json` — the header links, from `_nav/`
- `public/sitemap.xml` — from the section pages and published posts

Editing a file in `_nav/` while `next dev` is running needs a restart before it
shows up in the nav bar, because the generated file is read at import time. The
page content itself hot-reloads normally.

## Project structure

```
pages/
  index.js            Home
  [slug].js           Every top-level section page, built from _nav/
  posts/              Blog index + dynamic post pages
  recipes/            Recipe index + dynamic recipe pages
  _app.js             Global shell
components/           Layout, header, NavPage, RecentPosts, Seo, StructuredData,
                       EventFeed, PlantDivider, ResponsiveSplit
util/                 Content loaders, navPages, siteMeta (SEO source of truth)
_nav/                 The top-level pages and the nav bar, written via /admin
_posts/               Blog posts (Markdown + frontmatter), written via /admin
_recipes/             Recipes, same shape as posts but undated
public/               Static assets; public/admin/ is the CMS
scripts/              Nav + sitemap generators, static server, container runner
styles/               CSS modules + globals
tests/visual/         Playwright screenshot tests and their committed baselines
.github/workflows/    CI, daily calendar rebuild, baseline refresh, publish sync,
                      alpha/beta back-merge
```

## Section pages (`_nav/`)

The top-level pages — About, Contact, and the six program pages — are one
Markdown file each in `_nav/`, all built by `pages/[slug].js`. There is no file
under `pages/` per section, and adding one back for a section would break it: a
real file always beats the dynamic route, silently. `scripts/generate-nav.mjs`
turns that into a build failure rather than a missing page, and refuses the
handful of slugs that are spoken for (`posts`, `recipes`, `admin`, `404`,
`index`, `sitemap`).

The filename is the URL, which is why the CMS cannot create or delete these — a
slug is permanent once it has been linked to and indexed. Adding or removing a
section is a maintainer job; everything else about one is client-editable.

Frontmatter drives the page's structure: `in_nav` decides whether it appears in
the header, `order` where, and `schedule` / `store_link` / `contact_details`
switch on the structured blocks. The address and phone in that last one come
from `util/siteMeta.js`, never from the Markdown — that is issue #9's lesson,
and a CMS that invited the client to retype the address on eight pages would be
the same bug with a better interface.

`in_nav: false` is not the same as unpublished. The six program pages are live
at their URLs and in the sitemap; they are simply not advertised in the header
until their copy is signed off. Flipping one on is a CMS edit, not a commit.

> **Known gap:** `/posts` and `/recipes` are code routes rather than `_nav/`
> entries, so they are not in the header yet — see #47.

## Posts and recipes

**Use the editor at [`/admin`](#the-editor-admin).** It generates the filename,
enforces the fields, and commits for you. What follows describes what it writes,
and is the fallback for editing by hand.

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
`/posts/<slug>`, and joins the sitemap on the next build. Recipes work the same
way in `_recipes/`, with `title` and `author` but no date.

`pubdate` is forgiving: a bare date (`2026-06-25`), a quoted one, or one written
out (`June 25, 2026`) all work, and a post with no date still publishes — it
just sorts last and shows no date. Nothing you can type in frontmatter will fail
the build.

`_posts/` and `_recipes/` are empty apart from a `.gitkeep`, which is only there
because git does not track empty directories.

### Draft content

Files named `test-*` are scratch drafts. They are gitignored, so they never
leave your machine, and they are **not built into anything that deploys** —
you can leave one half-written without it reaching the site. The bare slugs
`test` and `template` are excluded from the build the same way but are *not*
gitignored, kept only so a file literally named `test.md` or `template.md`
can't ship by accident.

The switch is `INCLUDE_DRAFT_CONTENT`, defined in `util/contentFiles.mjs`:

| Where | Drafts built? | How |
| ----- | ------------- | --- |
| `npm run dev` | yes | `NODE_ENV=development` |
| `npm run build` locally | no | matches what deploys |
| `npm run test:visual` | no | screenshots describe what deploys |
| Netlify (all contexts) | no | pinned in `netlify.toml` |

It fails closed: anything that isn't an explicit opt-in leaves drafts out, so a
misconfigured environment under-publishes rather than leaking a draft to the
live site. To preview a production build with drafts,
`INCLUDE_DRAFT_CONTENT=true npm run build`.

## Upcoming events (Google Calendar)

The homepage shows upcoming events from a public Google Calendar. The site is a
static export with no server runtime, so the feed is fetched and baked into the
page at **build time** (`util/googleCalendar.js`, called from `pages/index.js`'s
`getStaticProps`) — not fetched by the visitor's browser.

Setup:

1. In Google Calendar: **Settings and sharing → Integrate calendar**, and copy
   the **Secret address in iCal format**.
2. Set it as `GOOGLE_CALENDAR_ICS_URL` in Netlify (Project configuration →
   Environment variables), and in `.env.local` for `npm run dev`.
3. If the calendar is empty, the variable is unset, or the fetch fails, the
   homepage simply omits the events section — a bad feed can never break the
   build.

**Publishing an event:** only events whose title starts with `[PUBLIC]` appear
on the site; everything else on the calendar stays private. Prefix the title in
Google Calendar — e.g. rename "Bunny Event" to `[PUBLIC] Bunny Event` — and the
prefix is stripped before display.

`getUpcomingEvents` takes the calendar and the clock as arguments and reads no
globals; `calendarOptionsFromEnv` is the single place that turns environment
variables into those arguments. Two more it understands — `CALENDAR_FIXTURE_ICS`
(a local `.ics` path, which wins over the live feed) and `CALENDAR_NOW` (freezes
the start of the "upcoming" window) — exist so the screenshot tests can build
against a fixed calendar. Leave both unset in Netlify.

Because the data is baked in, it only updates on a fresh deploy.
`.github/workflows/daily-refresh.yml` triggers a Netlify rebuild every morning
via a `NETLIFY_BUILD_HOOK_URL` repo secret, so events stay current without a
code push. Daily bounds staleness to 24 hours, but it is a schedule and not a
publish hook: an event added this afternoon appears tomorrow morning. For a
same-day addition, run the workflow by hand from the Actions tab.

> GitHub silently disables scheduled workflows in repositories with no activity
> for 60 days. If events stop refreshing, check that first.

## The editor (`/admin`)

[Sveltia CMS](https://sveltiacms.app) runs at `/admin` on the deployed site. It
is a writing interface over this repo: entries are saved as Markdown in `_nav/`,
`_posts/` and `_recipes/` and committed to **`publish`**, a content-only branch
that Netlify builds as a preview. Content stays in git — the CMS is a front end
onto it, not a separate store, so it can be removed at any time and every post
remains a file in this repo.

It exists because publishing by hand meant a GitHub account, a branch, a pull
request, an exact filename, and correct YAML. That is not a hypothetical
friction: client-written posts ended up stuck in pull requests that were never
merged, and one arrived as `_posts/Hello world` — a filename with a space and no
extension, which used to fail the build outright. The editor generates the
filename, enforces the fields, and commits.

**Setup is two files** — `public/admin/index.html` and `public/admin/config.yml`.
There is nothing in `package.json`; the CMS is a single-page app from a CDN.

### Signing in

Sveltia needs a way to authenticate against GitHub. Two options, in order of
preference:

**1. GitHub OAuth through Netlify (recommended for the client).** Netlify hosts
the OAuth flow, so there is nothing to deploy and no change to `config.yml`.

1. On GitHub: **Settings → Developer settings → OAuth Apps → New OAuth App**.
   Set the callback URL to `https://api.netlify.com/auth/done`.
2. On Netlify: **Project configuration → Access & security → OAuth → Install
   provider**, choose GitHub, and paste the Client ID and Secret. (Netlify
   renamed "Site configuration" to "Project configuration"; older guides,
   including Decap's, still say the former.)
3. Anyone with write access to the repo can now sign in at `/admin`.

**2. Personal access token (fine for a quick trial).** Choose "Sign In with
Token" and paste a GitHub token — the login screen links to a pre-scoped token
page. It is kept in the browser's local storage. Good for verifying the setup;
not what you hand a non-technical author.

A [Cloudflare Worker authenticator](https://github.com/sveltia/sveltia-cms-auth)
is also supported via `backend.base_url`, and is the route to take if the site
ever leaves Netlify.

### Publishing behaviour

Saving commits to **`publish`** — a branch that carries content and nothing
else. Netlify builds it as a branch deploy, so the author writes, saves, and
sees their work on that preview a few minutes later, without needing anybody's
help and without it being live.

Going live is a separate, deliberate act: merge `publish` into `main`.

Keeping `publish` current afterwards is automatic.
`.github/workflows/sync-publish.yml` rebases it onto `main` on every push to
`main`, so the branch deploy always previews the client's writing on production
code rather than on whatever shipped last release.

The branch therefore stays exactly what this section says it is: `main`, plus
the entries the editor has added since. That is the reason it rebases rather
than merging `main` in — a merge works too, but leaves a merge commit on
`publish` for every push to `main`, and all of them land in `main`'s history
when `publish` is merged back, on the branch whose whole selling point is that
its diff is content and nothing else.

Once `publish` has been merged into `main`, replaying its commits produces
nothing, so they are dropped and `publish` ends up equal to `main`. The re-cut
below happens by itself, without the step that discards work.

What makes that safe is that the force-push is **leased against the SHA the run
fetched**. If the editor commits while the workflow is running, the push is
refused and the run retries against the new tip. Automating the re-cut instead
would delete a post saved at 10am when a code fix lands at 11am, silently, from
the author's point of view — the difference is that rebasing replays those
commits rather than discarding them.

Rebasing `publish` onto `main` does not weaken the guarantee below — `main` is
released code. What `publish` must never carry is `alpha` or `beta`.

The two branches write to different places — `publish` only ever touches
`_nav/`, `_posts/`, `_recipes/` and `public/uploads/` — so a conflict means the
same content file was changed on both sides. The run fails having pushed
nothing. Resolve it by hand; do not re-cut, which resolves it by discarding the
author's side.

Re-cutting is still the right move by hand — when you have looked at the branch
and know it holds nothing you want:

```bash
git fetch origin
git checkout -B publish origin/main
git push --force-with-lease
```

**Why not `beta` or `alpha`.** Those are integration branches — they hold code
that is not released yet. Merging one to publish a blog post would release that
code at the same time. `publish` is cut from `main` and only ever receives
commits from the editor, so merging it back is a content-only diff. Content and
code move at different speeds and on different authority: the client decides
when a post is ready, you decide when code ships.

There is no review step inside the editor by design — that is the step that left
posts sitting unmerged. The branch provides the "look before it ships" safety
instead, without blocking the writing. If you do want review in the editor, add
`publish_mode: editorial_workflow` to the `backend` block in `config.yml`; the
CMS then opens a pull request per entry and somebody has to merge each one.

### Before handing `/admin` to the client

The repo side is done. What is left is account setup that cannot be done from a
pull request:

- [ ] Add a Netlify **branch deploy for `publish`** (Build & deploy → Branch
      deploys), so the author has somewhere to preview
- [ ] Register the **GitHub OAuth app** and install it in Netlify, per
      [Signing in](#signing-in)
- [ ] Sign in to `/admin` and publish a **test post end to end**, then delete it

There is no written guide to hand over: the client was walked through the
editor in person instead. If that ever needs to become a document again, the
thing it has to stay in step with is `public/admin/config.yml` — the fields in
the editor are defined there, and a guide describing different ones is worse
than none.

## SEO

Site-wide SEO is centralized:

- `util/siteMeta.js` — single source of truth for URL, name, address, and social
  links. **Update business details here.**
- `components/seo.js` — per-page `<title>`, description, canonical, Open Graph,
  and Twitter Card tags.
- `components/structuredData.js` — `LocalBusiness` JSON-LD on the homepage.
- `public/robots.txt` and the generated `sitemap.xml`.

## Contributing

For the git branching model, deployment tracks and CI pipeline, see
[CONTRIBUTING.md](CONTRIBUTING.md). For the screenshot-testing workflow, see
[docs/TESTING.md](docs/TESTING.md).
