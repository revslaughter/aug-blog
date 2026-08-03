# Screenshot fixtures

`events.ics` is the calendar the homepage is built against during the visual
tests. It replaces the live Google Calendar feed, which changes daily and would
make the homepage baseline stale within a week.

It is a real iCalendar file parsed by the real `util/googleCalendar.js`, not a
list of pre-normalized event objects — so the `[PUBLIC]` filter, the recurring
event expansion and the date normalization are all exercised on the way to the
screenshot.

`playwright.config.mjs` pins two environment variables for the test build:

| Variable | Value | Why |
| --- | --- | --- |
| `GOOGLE_CALENDAR_ICS_URL` | `tests/visual/fixtures/events.ics` | Local path instead of the live feed |
| `CALENDAR_NOW` | `2026-05-04T14:00:00Z` | Freezes "now", so the 30-day window always selects the same events and prints the same dates |

## What the entries are for

| Entry | Covers |
| --- | --- |
| Spring Plant Sale Opening Day | Timed event with a location, a short description and a `URL` (the modal's "View original" link) |
| Compost Program Drop-In | Description past the 50-word preview limit — exercises truncation, the "(see more)" affordance, and linkifying a bare URL and a `#hashtag` |
| Summer Faire | `VALUE=DATE` all-day event — renders without a time |
| Mindful Movement in the Garden | Weekly `RRULE`, expanded to one card per occurrence inside the window |
| Board meeting | No `[PUBLIC]` prefix — must *not* appear; the baseline is the assertion |
| Seed Swap | Starts before the frozen now — must *not* appear |

Editing this file changes the homepage baselines, so regenerate them in the
same commit (see the "Screenshot tests" section of the root README).
