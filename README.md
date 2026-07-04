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
scripts/           Build-time sitemap generator
styles/            CSS modules + globals
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

Because the data is baked in at build time, it only updates on a fresh
deploy. `.github/workflows/weekly-refresh.yml` triggers a Netlify rebuild
every Monday (via a `NETLIFY_BUILD_HOOK_URL` repo secret) so events stay
current even without a code push. Trigger it manually anytime from the
Actions tab, or just push a commit.

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

CI (GitHub Actions) runs lint, build, and tests on every push; a non-blocking
`npm audit` reports advisories. Netlify builds with `npm ci && npm run build` and
publishes the `out/` directory.
