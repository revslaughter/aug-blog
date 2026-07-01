# Antioch Urban Growers site — project memory

Marketing + blog site for a Kansas City urban farm. Next.js 16 (Pages Router),
React 19, statically exported (`output: "export"`) and deployed to Netlify —
**there is no server runtime**, so anything dynamic must happen at build time
or via client-side fetch to a third party.

## How it fits together

- `pages/*.js` are routes. Each page wraps its content in `<Layout>` and
  renders `<Seo .../>` (and `<StructuredData />` on the homepage) for
  head/meta tags.
- Blog posts are Markdown files in `_posts/`, read at build time
  (`util/getPostForSlug.js`) and rendered to HTML (`util/processMarkdown.js`)
  via `getStaticProps`/`getStaticPaths` in `pages/posts/[slug].js`.
- `scripts/generate-sitemap.mjs` runs as `prebuild` (see `package.json`) and
  writes `public/sitemap.xml` from the static routes + published posts.
- Site-wide facts (URL, name, address, phone, social links) live in
  `util/siteMeta.js` — the single source of truth consumed by `seo.js` and
  `structuredData.js`.
- Styling: `styles/globals.css` (fonts, color palette, article typography)
  + CSS Modules per component/page (`*.module.css`). Palette is earthy
  (`#dcdfd1` bg, `#483527` text, serif "Suranna" font).

## Branching & deploy

```
feature/*  →  alpha  →  beta  →  main
```

- `feature/*` — individual work, branched from `alpha`
- `alpha` — integration branch, conflicts resolved here
- `beta` — client preview (Netlify deploy preview)
- `main` — production (live site)

CI (`.github/workflows/ci.yml`) runs lint → build/test on push to
`main`/`alpha`/`beta`/`feature/**` and on PRs into `main`/`alpha`/`beta`.
Netlify builds with `npm ci && npm run build`, publishes `out/`.
**Never push feature work straight to `alpha`/`beta`/`main`** — branch from
`alpha`, open a PR into `alpha`.

## File index

### Root
- `README.md` — human-facing project overview, scripts, structure, SEO notes.
- `TODO.md` — development roadmap (CI/CD, security updates, SEO, events page,
  launch checklist). Written when the project still had a lot of tech debt;
  check it for what's already done vs. still open.
- `package.json` — scripts: `dev`, `build` (runs `prebuild` sitemap gen
  first), `lint`, `test`, `test:ci`. Deps: `next`, `react`, `gray-matter`
  (frontmatter parsing), `remark`/`remark-html` (markdown → HTML).
- `next.config.js` — `output: "export"` (static export), unoptimized images
  (no image server at runtime).
- `netlify.toml` — build command `npm ci && npm run build`, publish dir
  `out`, Node 22.
- `.nvmrc` — pins Node 22.
- `jest.config.js` / `jest.setup.js` — Jest via `next/jest`, jsdom env,
  `@testing-library/jest-dom` matchers. No test files exist yet.
- `eslint.config.mjs` — flat config, `eslint-config-next/core-web-vitals`.
- `.github/workflows/ci.yml` — lint/build/test/`npm audit` (audit is
  non-blocking, high/critical only).

### `pages/`
- `_app.js` — imports `styles/globals.css`, otherwise default.
- `index.js` — homepage: logo, store link, address, Facebook prompt/icon,
  phone. No `getStaticProps` currently (fully static JSX). Has commented-out
  nav-link grid experiment.
- `about.js` — mission/commitments list. Simple, wrapped in `Layout`.
- `contact.js` — address + phone list. (TODO.md previously flagged this as
  missing a Layout wrapper — it now has one.)
- `posts/index.js` — blog index, `getStaticProps` calls
  `getRecentPosts(3)`, renders `<RecentPosts>`.
- `posts/[slug].js` — single post page. `getStaticProps` reads the post,
  renders markdown to HTML, builds a meta-description excerpt.
  `getStaticPaths` enumerates all posts, `fallback: false`.

### `components/`
- `layout.js` + `layout.module.css` — page chrome: centers a flex column,
  wraps children in a card (`.mainContent`, `#ebeee3` bg, rounded corners).
  Has a commented-out `<Header>` (nav is currently disabled site-wide).
- `header.js` — nav component (`<Header links={[{title,href}]}>`), currently
  unused/commented out in `layout.js`.
- `footer.js` — **empty file** (0 bytes), not wired up anywhere.
- `sidebar.js` — **empty file** (0 bytes), not wired up anywhere. (Pre-existing
  placeholder — not related to the event-feed sidebar work below unless
  reused deliberately.)
- `seo.js` — reusable `<Seo>`: title/description/canonical + Open
  Graph + Twitter Card tags, pulls defaults from `util/siteMeta.js`.
- `structuredData.js` — `LocalBusiness` JSON-LD, homepage only.
- `recentPosts.js` — renders a list of post previews (title + author, linked
  to `/posts/<slug>`).

### `util/`
- `siteMeta.js` — `SITE_URL`, `SITE_NAME`, `DEFAULT_DESCRIPTION`,
  `DEFAULT_OG_IMAGE`, `ORGANIZATION` (address/geo/phone/social/store URL).
- `getPostForSlug.js` — `getPostForSlug(slug)`, `getAllPosts()`,
  `getRecentPosts(limit)` (sorted by `pubdate` desc), `getNextPost` (stub,
  returns all posts — looks unfinished).
- `processMarkdown.js` — `remark` + `remark-html`, markdown string → HTML
  string.

### `scripts/`
- `generate-sitemap.mjs` — build-time sitemap generator, run via `prebuild`.
  Skips `test-*` and `template` posts.

### `_posts/`
- `template.md` — starter template + authoring instructions (frontmatter:
  `title`, `author`, `pubdate`). `test-*` files are gitignored scratch drafts.
  No real posts published yet.

### `public/`
- `AUG-logo-transparent-background-1.png` — logo, used on homepage + as
  default OG image.
- `favicon.ico`, `fb.svg` (Facebook icon), `vercel.svg`, `robots.txt`.
- `sitemap.xml` — **generated**, gitignored, not committed.
- `qr-code.png` — present on `alpha` (merged via `feat/qr-code`), not yet on
  `main`.

### `styles/`
- `globals.css` — fonts (Suranna/Marcellus/VT323 via Google Fonts), color
  vars-by-value, `.article-*` typography, list reset, commented-out
  `.headerNav` styles (paired with the disabled `Header` component).
- `Home.module.css` — mostly Next.js starter boilerplate
  (`.container`/`.grid`/`.card`/etc.); only `.main` is actually used by
  `pages/index.js` today.

## Gotchas / known state

- `alpha` is currently *ahead* of `main` (has an extra QR-code merge);
  `main` is ahead of `beta`. Always diff before assuming one is a strict
  superset of another.
- Nav header exists as code but is fully commented out — the site currently
  has no navigation between pages other than direct links.
- `footer.js` and `sidebar.js` are empty placeholder files.
- No blog posts are published yet, only the template.
- No test files exist despite Jest/RTL being fully configured.
