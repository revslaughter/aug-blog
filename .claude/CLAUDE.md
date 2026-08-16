# Working in this repository

Read [CONTRIBUTING.md](../CONTRIBUTING.md) for the conventions and the reasoning
behind them. [README.md](../README.md) covers architecture and setup. This file
is the short list of things that go wrong most often here.

## Rules that are load-bearing

**Open PRs against `alpha`, not `main`.** The flow is
`feature/* → alpha → beta → main`. Targeting `main` skips integration.

**Display components render props; they do not process data.** Sorting,
deriving, parsing and formatting belong in the data layer, before the component
sees anything. A component that re-derives a value the data layer already
produced will eventually disagree with it, and both halves will look correct in
isolation.

**Never hand-roll timezone or DST logic.** Zone abbreviations come from
`Intl.DateTimeFormat`; calendar dates use `Temporal.PlainDate`. All-day events
are floating `YYYY-MM-DD` values, never instants — a date has no timezone and
must not acquire one. Event times always display in `America/Chicago`, never
converted to the visitor's zone. Do this work at build time; the Temporal
polyfill must not reach the browser bundle.

**Raw HTML stays off in the Markdown pipeline.** `util/processMarkdown.test.js`
fails on purpose if anyone enables it. If your change requires editing those
assertions, your change is wrong — embeds belong in constrained components with
a provider allowlist, where the author supplies data and the code supplies
markup.

**Never regenerate screenshot baselines locally.** They are pinned to the CI
container's renderer. Use `npm run baseline` or the "Refresh screenshot
baselines" workflow. Also: the diff budget is sized for structural change, so
text changes pass below threshold — a green screenshot run says nothing about
whether rendered text is right.

**Build artefacts are not committed** — `util/nav.generated.json` and
`public/sitemap.xml` are rewritten by `prebuild`.

## Before you say you are done

Run `npm run lint` and `npm test`; add `npm run build` if the export could be
affected. Run the suite once at a non-zero offset (`TZ=Asia/Tokyo npm test`) —
CI runs UTC, which hides a whole class of date bug. There is a known
pre-existing failure at non-zero offsets; confirm which failures are yours by
stashing and re-running rather than assuming.

**Verify a new test by reverting the code it covers and confirming it fails.**
A test written from the same assumption as the implementation passes while
proving nothing. This has already happened here.

## When working alongside other agents

Touch only the files assigned to you. Agents cannot see each other, so file
ownership is the only thing preventing two of them from clobbering the same
work. Screenshot baselines are binary and unmergeable — at most one agent may
own them at a time.

If you find a real problem outside your scope, report it or open an issue.
Do not fix it mid-run, especially in a file someone else owns.

## Reporting

Say what you verified and what you assumed, and keep them distinct. If you could
not check something — no network, no browser, a tool that would not run — say so
plainly. An honest gap is useful; a confident guess that later turns out wrong
costs more than the check would have.
