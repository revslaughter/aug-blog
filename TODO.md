# Antioch Urban Growers — Roadmap

Where the project actually stands, and what is left.

Last reviewed: 2026-08-13.

---

## Branching

Two tracks, meeting only at `main`.

```
code:     feature/*  →  alpha  →  beta  →  main
content:                        main  →  publish  →  main
```

- **`feature/*`** — individual pieces of work
- **`alpha`** — integration; features merge here first
- **`beta`** — client preview of *code*
- **`main`** — production
- **`publish`** — content only, written by the CMS at `/admin`, merged back to
  `main` to go live, then re-cut from `main`

Keeping content off the integration branches means publishing a post cannot
ship a half-finished feature, and a code release cannot be held up waiting on
content.

---

## Blocked on setup outside the repo

Nothing here can be done from a pull request. These are the only things
standing between the client and publishing.

- [X] **Create the `publish` branch** — exists, cut from `main` at `be76b73`.
      Keeping it in step with `main` is automated; see Done.
- [ ] **Add a Netlify branch deploy for `publish`** so there is somewhere to preview
- [ ] **Register a GitHub OAuth app** — callback `https://api.netlify.com/auth/done`
- [ ] **Install it in Netlify** under Access & security → OAuth
- [ ] **Sign in to `/admin` and publish a test post end to end**, then delete it
- [ ] **Fill in `docs/writing-for-the-website.md`** and walk the client through
      the first post in person rather than sending it cold

See the README's "The editor (`/admin`)" section for the detail.

---

## Now

- [ ] **Program page copy.** Six pages — plant sale, produce sale, summer
      faire, workshops, mindful movement, compost — carry sample copy written
      to show the shape of the page, which is why they are still `in_nav: false`.
      No longer blocked on a developer: the client rewrites them under **Pages**
      in the editor and turns each one on when it reads right.

## Next

- [ ] **`/posts` and `/recipes` in the nav.** The section pages are CMS-
      controlled now, but these two are code routes rather than `_nav/` entries,
      so they still need adding to the header by hand once there is content to
      show. Worth deciding whether they become `_nav/` entries that link out
      instead. (Not started — nothing in PR #40 touches this.)
- [ ] **Embeds in posts.** Video, maps and Facebook posts do not work: post
      bodies go through `dangerouslySetInnerHTML` and are only safe because
      remark-html drops raw HTML. Add embeds as a constrained component — a
      shortcode or a CMS widget — rather than by enabling raw HTML, which would
      open a real XSS hole. `util/processMarkdown.test.js` fails if anyone does.
- [ ] **Open event-feed bugs.** #30 all-day events display a day early, #31
      `windowDays` only bounds recurring events, #26 line breaks from Google
      Calendar.
- [ ] **#21** vine divider not rendering. **#12** QR code. **#5** favicon.
- [ ] **Close the issues that are already done.** #16, #17, #25 and #28 are
      shipped but still open, so the issue list overstates what is outstanding.
      Verified in the code, not just assumed — but worth a glance before
      closing.

## Later

- [ ] **Same-day events.** The calendar rebuild runs daily, so an event added
      this afternoon appears tomorrow morning. Only a publish-time build hook
      fixes that properly; the manual workflow run is the current answer.
- [ ] **#32 — Security Audit is permanently red.** Non-blocking
      (`continue-on-error`), but a check that is always red trains people to
      ignore checks — it failed on all three pushes to PR #40 and was correctly
      ignored each time, which is the habit the check is teaching. Six high
      advisories, all in `next`/`postcss`/`sharp` and none reachable at runtime
      on a static export. Either fix them or stop running it.
- [ ] **#22** — documentation pass over inline comments.
- [ ] **Analytics.** Nothing is measuring whether any of the SEO work landed.
- [ ] **Submit the sitemap to Google Search Console.** No longer waiting on
      anything — `main` carries the generated sitemap and the real copy now.

---

## Done

Kept short; the detail is in the git history.

**Stack and CI** — Next 16, React 19, ESLint 9 flat config, Node 22, true
static export. GitHub Actions runs lint, build, unit tests and screenshots on
every push. Netlify builds `npm ci && npm run build` and publishes `out/`.

**SEO** — meta/OG/Twitter tags, canonical URLs, `LocalBusiness` JSON-LD,
generated sitemap, robots.txt. `util/siteMeta.js` is the single source of truth
and is now actually used, rather than being contradicted by hardcoded copies in
`index.js` and `contact.js` (the cause of issue #9).

**Events** — homepage feed from a public Google Calendar, baked in at build
time, `[PUBLIC]`-prefix filter (#17), recurring-event expansion, detail modal
(#28), truncation and linkifying (#25). Rebuilt daily by
`.github/workflows/daily-refresh.yml`.

**Recipes** (#16) — `/recipes` and `/recipes/[meal]`.

**Content pipeline hardening** (#36) — authoring can no longer break the build.
Non-Markdown files are ignored instead of throwing `ENOENT`; `pubdate` accepts
a bare, quoted or written-out date and a post with none still publishes;
display dates render from UTC so they no longer depend on who ran the build;
publishability is defined once and shared by the loaders and the sitemap
generator, so templates cannot ship as pages again. 72 unit tests, up from 6.

**Screenshot tests** — every page at four viewports against committed
baselines, built against fixture calendar *and* fixture content so neither a
passing day nor a published post can turn the check red. The tolerance is 0.1%,
set from a measured zero-pixel noise floor rather than by feel (#35).

**About copy and nav** (#35) — the client's own About text is on the page, and
Home / About / Contact are reachable by people rather than only by crawlers.

**The editor** (#37) — Sveltia CMS at `/admin`, writing Markdown to `publish`.
Content stays in git; no dependency, no build step, no recurring cost.

**The section pages in the CMS** (PR #40) — About, Contact and the six program
pages are Markdown in `_nav/`, built by one `pages/[slug].js` rather than a file
each. The client writes the copy and decides what appears in the top menu, and
in what order, without a commit. A slug that collides with an existing route
fails the build with an explanation, rather than silently never rendering.

**Rebaselining off CI** (PR #40) — `npm run baseline` runs the screenshot
update inside the same pinned Playwright container CI uses, so it works from
macOS. This closed a real gap: the only sanctioned route was a workflow that
could not be dispatched at the time, and `--update-snapshots` on the host
rewrites every baseline that differs, not only the intended ones. The image tag
is derived from the installed `@playwright/test`, and a test fails if either
workflow drifts from it.

**Promoted `beta` to `main`** — everything since June is on the live site: the
content-pipeline hardening, the screenshot tests, the About copy, the nav and
the editor. `main` had been parked at `be76b73` while the work accumulated on
`beta`.

**`publish` stays in step with `main`** — `sync-publish.yml` merges `main` into
`publish` on every push, so the client's branch deploy previews their writing on
production code instead of drifting a release behind. It merges and never
forces: pending content survives, and the re-cut chore is gone. Automating the
re-cut instead would have deleted a post saved between a merge and the next code
push.

**`visual-baselines.yml` dispatchable** — GitHub only offers
`workflow_dispatch` for workflows that exist on the default branch, and this
one lived on `alpha`/`beta` only. The promotion put it on `main`, so **Actions
→ Refresh screenshot baselines** works. `npm run baseline` stays the everyday
route; the workflow is the fallback for anyone without Docker.
