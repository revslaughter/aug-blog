# Unit test fixtures

Fixtures for the Jest suite. Separate from `tests/visual/fixtures/`, which feeds
the screenshot tests, and the separation is the point: anything added to the
visual calendar shows up as a card on the rendered homepage and moves the
committed baselines. A fixture that exists purely to pin down parsing behaviour
has no business changing a screenshot.

Playwright never looks here — its `testDir` is `./tests/visual`.

## `recurring-all-day.ics`

A weekly all-day event, `DTSTART;VALUE=DATE:20260304` with `RRULE:FREQ=WEEKLY;BYDAY=WE`.

Recurring and non-recurring entries take different branches through
`expandOccurrences` in `util/googleCalendar.js`, and only the non-recurring one
was covered by a real parse. This closes that gap: `rrule.between` returns its
occurrences at *local* midnight, the same way node-ical parses a date-only
`DTSTART`, so the floating-date handling has to be applied on both branches or
recurring all-day events regress on their own.

The dates are chosen to straddle a DST transition — US DST begins 8 March 2026,
so the 4 March occurrence falls before it and the rest after. The underlying
instants therefore shift by an hour partway through the series while the
calendar dates stay on consecutive Wednesdays, which is exactly the slippage a
date-from-instant derivation would produce.
