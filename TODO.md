# Antioch Urban Growers — Development Roadmap

## Overview
Preparing the site for expanded functionality: events page, blog, SEO/social media, and general content pages. Using feature branches with alpha (integration) and beta (preview) branches.

---

## Branching Strategy

```
main (production)
  ↑
  ├─ beta (Netlify preview for client)
  │   ↑
  │   └─ alpha (integration branch, conflict resolution)
  │       ↑
  │       ├─ feature/seo
  │       └─ feature/security
```

- **feature/seo**: SEO enhancements (meta tags, sitemap, Open Graph, schema)
- **feature/security**: Dependency updates + security vulnerability fixes
- **alpha**: Merge features here, resolve conflicts, test integration
- **beta**: Deploy to Netlify for client preview
- **main**: Production

---

## Phase 1: CI/CD Setup (PRIORITY)

### GitHub Actions Workflow
- [ ] Create `.github/workflows/build.yml`
  - Run on: `push` to `feature/*`, `alpha`, `beta`, `main`
  - Jobs:
    - Lint (ESLint)
    - Type check (if applicable)
    - Build (next build)
    - Security audit (npm audit)
- [ ] Add branch protection rules
  - Require passing checks before merge to `main`
  - Require passing checks before merge to `alpha`
- [ ] Add status badges to README

### Netlify Deployment
- [ ] Update `netlify.toml`:
  - Build command: `npm install && npm run build`
  - Publish directory: `.next` (confirm static export still works)
  - Environment: Node 18+
- [ ] Configure deploy previews:
  - Deploy previews from: `beta` branch (for client testing)
  - Production deploys from: `main` branch
- [ ] Add deploy status notifications (optional)

### Local Setup
- [ ] Document dev environment setup in CLAUDE.md or README
  - `npm install`
  - `npm run dev` → http://localhost:3000
  - `npm run build && npm run export` → static export to `out/`

---

## Phase 2: Security Updates (`feature/security`)

### Dependencies Update
- [ ] Run `npm audit fix --force` OR staged updates:
  - [ ] Next.js 12 → 14 → 16
  - [ ] React 17 → 18 → 19
  - [ ] ESLint 8 → 10
- [ ] Update `next.config.js` for Next.js 16+ compatibility
  - [ ] Check image loader config
  - [ ] Remove deprecated options
- [ ] Update ESLint config (`.eslintrc.json`) for new version
- [ ] Test build: `npm run build`
- [ ] Test dev server: `npm run dev`
- [ ] Commit and PR to `alpha`

### Current Vulnerabilities (18 total)
- 1 CRITICAL: Next.js image optimization (DoS, auth bypass)
- 9 moderate: js-yaml, postcss, nanoid, diff
- 1 low

---

## Phase 3: SEO Implementation (`feature/seo`)

### Meta Tags & Head Setup
- [ ] Install/use `next/head` (already in Next.js)
- [ ] Create shared `Head` component with defaults (title, description, og:image, etc.)
- [ ] Add to all pages:
  - [ ] `pages/index.js` — homepage
  - [ ] `pages/about.js` — about
  - [ ] `pages/contact.js` — contact (ALSO needs Layout wrapper fix)
  - [ ] `pages/posts/index.js` — blog index
  - [ ] `pages/posts/[slug].js` — individual blog posts
- [ ] Add OpenGraph tags (og:title, og:description, og:image, og:url)
- [ ] Add Twitter card meta tags

### Sitemap & Robots
- [ ] Create `public/sitemap.xml` with:
  - Homepage
  - Static pages (about, contact, blog)
  - Dynamic blog post URLs
- [ ] Create `public/robots.txt`
  - Allow: /
  - Sitemap: https://www.antiochurbangrowers.com/sitemap.xml

### Structured Data
- [ ] Add Organization schema (homepage JSON-LD)
  - Name, description, location, phone, social profiles
- [ ] Add LocalBusiness schema
- [ ] Optional: Event schema (when events page is added)

### Image Optimization
- [ ] Review `next.config.js` image loader
- [ ] Ensure images have descriptive alt text
- [ ] Optimize images (size, format)

### Content & Keywords
- [ ] Review page titles & descriptions (SEO optimized)
- [ ] Update About page (currently minimal)
- [ ] Update Contact page layout + SEO
- [ ] Add meta descriptions to all pages

### Testing
- [ ] Validate with: [Google Search Central](https://search.google.com/search-console)
- [ ] Check Open Graph tags: [Meta Debugger](https://developers.facebook.com/tools/debug/)
- [ ] Validate schema: [Schema.org Validator](https://validator.schema.org/)

### Commit and PR to `alpha`

---

## Phase 4: Feature Development (after CI/CD + Security + SEO)

### Blog Enhancement
- [ ] Ensure blog post frontmatter is standardized (title, date, author, excerpt, etc.)
- [ ] Add post listing page (`pages/posts/index.js`) with filtering/search
- [ ] Add "Recent Posts" component to homepage

### Events Page
- [ ] Create `pages/events.js`
- [ ] Decide on data source: markdown files, hardcoded, or CMS
- [ ] Design layout (list, calendar, or upcoming)
- [ ] Add to navigation

### Pages Enhancement
- [ ] Improve About page (add more content, mission, team)
- [ ] Improve Contact page (form? or keep as info listing?)
- [ ] Add navigation header (commented out in `components/layout.js`)

---

## Phase 5: Launch & Monitoring

### Pre-Launch Checklist
- [ ] All features tested on beta (preview)
- [ ] Client approval on beta
- [ ] Final review for broken links, typos, images
- [ ] Backup current production

### Deployment
- [ ] Merge beta → main
- [ ] Verify production deployment
- [ ] Smoke test production site

### Post-Launch
- [ ] Submit sitemap to Google Search Console
- [ ] Monitor analytics
- [ ] Check for build/deployment errors

---

## Notes

**Current Status:**
- Dependencies: current (Next.js 16, React 19, ESLint 9, Node 22)
- Security: `npm audit --audit-level=high` runs in CI and is non-blocking; see
  issue #32 for why it is permanently red
- SEO: shipped — meta/OG/Twitter tags, canonical URLs, JSON-LD, generated
  sitemap, robots.txt
- Events: homepage feed from a public Google Calendar, baked in at build time
  and refreshed daily by `.github/workflows/daily-refresh.yml`
- Tests: Jest for units, Playwright screenshot diffing across four viewports
- Branches: `alpha` and `beta` exist, but work has largely gone straight to
  `main` via PR. Either adopt the documented flow or simplify it to match
  what actually happens.

**Client Requirements (from meetings):**
- Events page
- Blog enhancements
- SEO / social media exposure
- General pages (contact/about improvements)

**Tech Debt:**
- Publishing is a git workflow, which is the main blocker on the client
  writing anything — two attempts so far have produced files that fail the
  build rather than posts. A git-backed CMS (Sveltia/Decap) writing into
  `_posts/` would remove the frontmatter and filename traps entirely.
- Nav lists only Home/About/Contact. The six program pages still have
  placeholder copy, and `/posts` and `/recipes` have no real content yet.
- `_posts/` and `_recipes/` hold only their templates, so both indexes render
  an empty state. First real post or recipe should also get a detail route
  added back to `tests/visual/routes.mjs`.
- Post bodies go through `dangerouslySetInnerHTML`; safe because remark-html
  drops raw HTML, which is also why embeds (video, maps) do not work. Add
  embeds as a constrained component rather than by enabling raw HTML.
- Image loader config may need review after Next.js update
