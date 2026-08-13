# Screenshot fixtures

Two things the site reads change on their own schedule — the events calendar
and the content the client edits — and both would make baselines stale without
anyone touching the code. The visual tests build against fixtures for both, so
a failing screenshot always means the layout moved.

## `events.ics` — the homepage event feed

`events.ics` is the calendar the homepage is built against during the visual
tests. It replaces the live Google Calendar feed, which changes daily and would
make the homepage baseline stale within a week.

It is a real iCalendar file parsed by the real `util/googleCalendar.js`, not a
list of pre-normalized event objects — so the `[PUBLIC]` filter, the recurring
event expansion and the date normalization are all exercised on the way to the
screenshot.

`getUpcomingEvents` takes its calendar source and its clock as arguments, so
swapping in this file needs no test hook in the data path. The substitution
happens in `calendarOptionsFromEnv`, the one function that reads the
environment, via two variables `playwright.config.mjs` pins for the build:

| Variable | Value | Why |
| --- | --- | --- |
| `CALENDAR_FIXTURE_ICS` | `tests/visual/fixtures/events.ics` | Selects `icsFileSource` instead of the live `icsUrlSource` |
| `CALENDAR_NOW` | `2026-05-04T14:00:00Z` | Freezes "now", so the 30-day window always selects the same events and prints the same dates |

### What the entries are for

| Entry | Covers |
| --- | --- |
| Spring Plant Sale Opening Day | Timed event with a location, a short description and a `URL` (the modal's "View original" link) |
| Compost Program Drop-In | Description past the 50-word preview limit — exercises truncation, the "(see more)" affordance, and linkifying a bare URL and a `#hashtag` |
| Summer Faire | `VALUE=DATE` all-day event — renders without a time |
| Mindful Movement in the Garden | Weekly `RRULE`, expanded to one card per occurrence inside the window |
| Board meeting | No `[PUBLIC]` prefix — must *not* appear; the baseline is the assertion |
| Seed Swap | Starts before the frozen now — must *not* appear |

## `content/` — posts, recipes and the section pages

`content/_posts/`, `content/_recipes/` and `content/_nav/` replace the repo's
own copies for the duration of the test build.

Without this, the blog and recipe indexes would list whatever the client had
published, so **every post would change `posts-index`'s baseline and fail the
Screenshots check on a commit that touched no code**. Publishing would mean
regenerating baselines, which is not a thing to ask of someone writing about a
plant sale. Against a fixture these baselines move only when the layout does.

It also buys back coverage that would otherwise be gone: `_posts/` and
`_recipes/` are empty in the repo, so with no fixture there is nothing to
render and the article and recipe layouts have no screenshots at all.

The substitution happens in `contentDirsFromEnv`, the one function that reads
the variable — the loaders take their directory as an argument, so nothing
further down the path knows about it:

| Variable | Value | Why |
| --- | --- | --- |
| `CONTENT_FIXTURE_DIR` | `tests/visual/fixtures/content` | Points `getAllPosts`, `getPostForSlug`, `getAllRecipes`, `getAllNavPages` and both build-time generators at `<dir>/_posts`, `<dir>/_recipes` and `<dir>/_nav` |

These are real Markdown files with real frontmatter, read by the real loaders
and rendered by the real `processMarkdown`, so the frontmatter parsing, the
date normalization and the GFM rendering are all exercised on the way to the
screenshot.

### What the entries are for

| Entry | Covers |
| --- | --- |
| `spring-plant-sale-is-open.md` | The article layout carrying its full range: `h2`/`h3`, ordered and unordered lists, bold and italic, a link, a blockquote, and a GFM table |
| `notes-from-the-compost-pile.md` | A post with **no `pubdate`** — the byline renders without a `<time>` rather than throwing, and it sorts after every dated post on the index |
| `roasted-roots-with-herb-oil.md` | The recipe layout: nested `h2`/`h3` sections, task-list ingredients, numbered steps |

Two posts also means `posts-index` shows an actual list and its ordering,
rather than one entry or an empty state.

Nothing here is named `template` or `test-*`; those are draft slugs
(`util/contentFiles.mjs`) and would be filtered out of the build.

### Why `_nav/` is fixtured too

For a stronger version of the same reason. A post only reaches the blog pages,
but `_nav/` decides what is in the header — which is on **every** page. The
client reordering a section, renaming one, or turning one on would move all
sixty-odd baselines at once, on a commit that touched no code.

It also fixes what the section pages themselves are built from, so the eight
`about` / `compost` / `plant-sale` … baselines describe a known page rather than
whatever the copy says this week.

The files started as copies of the repo's `_nav/`. They are expected to diverge
as the client rewrites the real ones, and that is the point — this directory is
a layout fixture, not a mirror. What matters is that it keeps exercising every
optional block: a `schedule` table, `store_link`, `contact_details`, a `note`,
an `intro`, and a Markdown body with headings and lists.

Adding a page here without adding it to `routes.mjs` fails the coverage guard in
`pages.spec.mjs`, which is the intended way round.

---

Editing either fixture changes the baselines that depend on it, so regenerate
them in the same commit — see the "Screenshot tests" section of the root
README.
