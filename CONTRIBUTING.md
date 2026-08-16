# Contributing

The [README](README.md) explains what this site is and how it is built. This
file covers the things that are easy to get wrong — the conventions that are
not obvious from reading the code, and the reasoning behind them.

## Getting set up

```bash
nvm use     # Node 22, per .nvmrc
npm ci
npm run dev
```

`npm run dev` and `npm run build` both regenerate `util/nav.generated.json` and
`public/sitemap.xml` first. Neither is committed — they are build artefacts, and
a hand-edit to either is erased by the next build.

## Branching

```
feature/*  →  alpha  →  beta  →  main
```

**Open pull requests against `alpha`, not `main`.** `alpha` is where work
integrates and conflicts get resolved; `main` is the live site. A PR aimed at
`main` skips the integration step that exists to catch exactly the problems
integration catches.

`publish` is a separate track. It carries content written through the CMS at
`/admin` and nothing else, and is kept in step with `main` automatically. Do not
put code on it.

## Conventions

### Display components render props; they do not process data

Deriving, sorting, filtering, parsing and formatting all happen before the data
reaches a component. A component's job is to turn values into markup.

This is not style preference. A component that re-derives something the data
layer already produced will eventually disagree with it, and the disagreement
will be invisible because both halves look correct in isolation. That has
already happened here once, with event ordering computed in two places against
two different notions of the same date.

In practice that means `getStaticProps` and the modules it calls do the work,
and the component receives finished values.

### Dates and timezones

This is the area that has produced the most bugs, so the rules are specific.

**Event times display in `America/Chicago` for every visitor**, never converted
to the viewer's zone. These are events at a physical place; venue-local time is
the useful time. A visitor abroad seeing their own local equivalent is reading
something technically accurate and practically useless.

**A calendar date is not an instant.** An all-day event is a date on a wall
calendar — it has no timezone and cannot be shifted by one. A timed event is a
moment. JavaScript's `Date` can only represent the second kind, which is the
root of every bug this project has had here. All-day dates are carried as
floating `YYYY-MM-DD` values, never as instants.

**Never hand-roll timezone or DST logic.** Zone abbreviations come from
`Intl.DateTimeFormat`'s `timeZoneName`, which reads the IANA database and
already knows when the rules change. Calendar dates use `Temporal.PlainDate`.
Writing your own is how you get a bug that appears twice a year.

**Do date work at build time**, in the data layer. `@js-temporal/polyfill` is
large and must never reach the browser bundle — Node ships Temporal natively
from v26, at which point the polyfill import can be dropped for the global.

### Post bodies must never allow raw HTML

Rendered Markdown goes through `dangerouslySetInnerHTML`, which is only safe
because `remark-html` drops raw HTML on the way through. The CMS exists so that
people who are not developers can write these files, so that guarantee is the
only thing between a Markdown file and script injection.

`util/processMarkdown.test.js` fails deliberately if anyone enables raw HTML —
`rehype-raw`, `sanitize: false`, or similar. If a change requires editing those
assertions, the change is wrong.

Embeds arrive as constrained components instead: the author supplies a URL or an
ID, the code validates it against an allowlist and emits a known-good iframe.
Author input is data; markup comes from the code.

### Screenshot baselines

Baselines are pixel-pinned to the Playwright container image that CI uses.
Regenerate them with `npm run baseline`, or the "Refresh screenshot baselines"
workflow — never with `npx playwright test -u` on your own machine, which
produces PNGs from a different renderer.

Know what the suite does and does not catch: the diff budget is sized for
structural change, so **small text changes are below threshold and pass
silently**. A green screenshot run is not evidence that rendered text is
correct.

## Testing

Run `npm run lint` and `npm test` before opening a PR. `npm run build` too if
you touched anything the static export depends on.

**A test must fail without the change it covers.** Revert your fix, keep the
test, and confirm it goes red. A test written from the same assumption as the
code proves nothing, and this is the single cheapest way to find out.

**Run the suite at a non-zero UTC offset**, e.g. `TZ=Asia/Tokyo npm test`. CI
runs UTC, which is the one offset where several date bugs are invisible. Note
there is a known pre-existing failure at non-zero offsets — check whether a
failure is yours by stashing your changes and re-running.

## Pull requests

Open as a draft until it is ready to look at. Describe what changed and why,
and be precise about what you verified versus what you assumed — a PR body
claiming a check that did not happen is worse than one that says nothing.

If you find a problem outside the scope of your change, note it or open an
issue rather than widening the PR. The issue tracker is this project's only
roadmap.
