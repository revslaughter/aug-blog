Answer in Simplified Technical English (STE): short declarative sentences, one idea each, no metaphors, steps numbered

## File index

- `pages/` — Routes. `index.js` is home. `[slug].js` builds every `_nav/` page. `posts/` and `recipes/` are the blog and recipe routes.
- `components/` — React components and their CSS modules (layout, header, navPage, eventFeed, recentPosts, seo, structuredData, plantDivider, responsiveSplit).
- `util/` — Content loaders and helpers: `contentFiles.mjs`, `getPostForSlug.js`, `getRecipesForMeal.js`, `googleCalendar.js`, `navPages.mjs`, `playwrightImage.mjs`, `processMarkdown.js`, `siteMeta.js`.
- `_nav/` — Top-level page content (Markdown), edited via `/admin`.
- `_posts/`, `_recipes/` — Blog posts and recipes (Markdown), edited via `/admin`. Empty in git except `.gitkeep`.
- `public/` — Static assets. `public/admin/` is the CMS.
- `scripts/` — Build-time generators (nav, sitemap), test tooling (static server, container runner, font cache), and the agent helpers `scrum.py` and `merge-gate.py` (Python 3, `gh`).
- `styles/` — Global CSS and CSS modules.
- `tests/visual/` — Playwright screenshot tests and baselines.
- `.github/workflows/` — CI and scheduled jobs.
- `docs/TESTING.md` — Screenshot-testing workflow.
- `docs/agentic-development.md` — Rules for agent work: WP issues, labels, reviews, merge gate.
- `.claude/skills/` — `/scrum` (groom the backlog into WPs) and `/orchestrate` (run WPs, review, merge into `alpha`).
- `.claude/agents/` — `implementer`, `pr-reviewer` (layer 1), `pr-reviewer-l2` (layer 2).

See [CONTRIBUTING.md](CONTRIBUTING.md) for the branching model and CI pipeline.
