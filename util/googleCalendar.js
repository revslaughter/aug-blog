import ical from "node-ical";
// Temporal is native from Node 26; .nvmrc pins 22, so the polyfill stands in
// for it. On a bump to 26+ this import can be deleted outright — every use
// below is through the `Temporal` global's own API, so nothing else changes.
//
// The polyfill is ~2.9 MB unpacked and pulls in jsbi, so it must never reach
// the browser. It cannot: this module is imported only by `getStaticProps`,
// which runs at build time, and the props boundary between it and the feed is
// JSON. See the note above `formatDisplayDate`.
import { Temporal } from "@js-temporal/polyfill";

/**
 * Build-time Google Calendar integration. The site is a static export with
 * no server runtime, so this runs inside `getStaticProps` — the result is
 * baked into the page at build/deploy time, not fetched by the browser.
 * Refreshing events therefore means re-deploying (see
 * .github/workflows/daily-refresh.yml for a scheduled rebuild).
 *
 * Configure via the GOOGLE_CALENDAR_ICS_URL env var (Netlify site settings):
 * the calendar's "Secret address in iCal format" from Google Calendar
 * Settings > Settings for my calendars > [calendar] > Integrate calendar.
 * That URL is unauthenticated but unguessable, so no API key/OAuth needed.
 *
 * Where the calendar comes from and what "now" means are both arguments to
 * `getUpcomingEvents` — see `calendarOptionsFromEnv`, the single place that
 * turns environment variables into those arguments.
 *
 * Only events whose title is prefixed with "[PUBLIC]" are published to the
 * site (see #17) — the prefix is stripped before display. This lets a
 * non-technical client control what's public just by editing event titles
 * in Google Calendar.
 */

const DEFAULT_LIMIT = 6;
const DEFAULT_WINDOW_DAYS = 30;
const PUBLIC_PREFIX = "[PUBLIC]";

/**
 * `start`/`end` are ISO instants — the moment an event happens — and are what
 * everything sorts and filters on.
 *
 * `startDate` is the extra channel all-day events need. An all-day entry names
 * a date on a wall calendar, not a moment, and no instant can carry that date
 * unambiguously: see {@link floatingCalendarDate}. For an all-day event it
 * holds that date as a floating `YYYY-MM-DD` string, with no zone attached;
 * for a timed event it is null.
 *
 * `displayDate` is the finished, human-readable line the event feed prints —
 * `"Sep 19, 2026, 6:00 PM CDT"` for a timed event, `"May 23, 2026"` for an
 * all-day one. See {@link formatDisplayDate} for why the formatting lives here
 * and not in the component.
 *
 * @typedef {{
 *   id: string,
 *   title: string,
 *   start: string,
 *   end: string,
 *   allDay: boolean,
 *   startDate: string|null,
 *   displayDate: string,
 *   location: string|null,
 *   description: string|null,
 *   url: string|null
 * }} CalendarEvent
 */

/**
 * Somewhere to get a parsed calendar from. Everything downstream works on the
 * node-ical object model, so a source's only job is producing one.
 *
 * @typedef {() => Promise<Record<string, object>>} CalendarSource
 */

/**
 * Select and normalize the upcoming events from a calendar.
 *
 * Takes its calendar and its clock as arguments and reads no globals, so a
 * caller can hand it a live feed, a file on disk, or a literal object. Never
 * throws — a source that rejects resolves to an empty array, so a flaky
 * calendar can never break the site build.
 *
 * An event is published only if it starts within the next `windowDays` days,
 * so the six cards are always genuinely "upcoming" rather than whatever the
 * calendar happens to hold next.
 *
 * @param {{
 *   loadCalendar?: CalendarSource|null,
 *   now?: Date,
 *   limit?: number,
 *   windowDays?: number,
 * }} [options]
 * @returns {Promise<CalendarEvent[]>}
 */
export async function getUpcomingEvents({
  loadCalendar = null,
  now = new Date(),
  limit = DEFAULT_LIMIT,
  windowDays = DEFAULT_WINDOW_DAYS,
} = {}) {
  if (!loadCalendar) {
    return [];
  }

  let calendar;
  try {
    calendar = await loadCalendar();
  } catch (err) {
    console.warn(`[googleCalendar] failed to fetch calendar feed: ${err.message}`);
    return [];
  }

  const windowEnd = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);

  const events = Object.values(calendar)
    .filter((entry) => entry.type === "VEVENT" && isPublicSummary(entry.summary))
    .flatMap((entry) => expandOccurrences(entry, now, windowEnd));

  events.sort((a, b) => new Date(a.start) - new Date(b.start));

  return events.slice(0, limit);
}

/**
 * The production source: Google's hosted iCal feed.
 *
 * @param {string} icsUrl
 * @returns {CalendarSource}
 */
export function icsUrlSource(icsUrl) {
  return () => ical.async.fromURL(icsUrl);
}

/**
 * A calendar checked into the repository. Used by the screenshot tests, whose
 * baselines would rot within a week against the live feed.
 *
 * @param {string} filePath
 * @returns {CalendarSource}
 */
export function icsFileSource(filePath) {
  return () => ical.async.parseFile(filePath);
}

/**
 * The composition root: the only place that reads the environment and decides
 * which source and which clock `getStaticProps` gets. It lives here rather
 * than in the page because `getStaticProps` takes no arguments — a static
 * export gives the build no other channel to configure itself through.
 *
 * - `GOOGLE_CALENDAR_ICS_URL` — the live feed (Netlify site settings).
 * - `CALENDAR_FIXTURE_ICS` — a local .ics path; wins over the live feed.
 * - `CALENDAR_NOW` — freezes the start of the "upcoming" window, so a fixture
 *   calendar yields the same events with the same printed dates on every
 *   build. Set both of these in tests/visual only.
 *
 * @param {Record<string, string|undefined>} [env]
 * @returns {{loadCalendar: CalendarSource|null, now: Date}}
 */
export function calendarOptionsFromEnv(env = process.env) {
  const fixturePath = env.CALENDAR_FIXTURE_ICS;
  const icsUrl = env.GOOGLE_CALENDAR_ICS_URL;

  let loadCalendar = null;
  if (fixturePath) {
    loadCalendar = icsFileSource(fixturePath);
  } else if (icsUrl) {
    loadCalendar = icsUrlSource(icsUrl);
  }

  return { loadCalendar, now: resolveNow(env.CALENDAR_NOW) };
}

/**
 * @param {string|undefined} frozen
 * @returns {Date}
 */
function resolveNow(frozen) {
  if (!frozen) return new Date();

  const parsed = new Date(frozen);
  if (Number.isNaN(parsed.getTime())) {
    console.warn(`[googleCalendar] ignoring unparseable CALENDAR_NOW: ${frozen}`);
    return new Date();
  }
  return parsed;
}

/**
 * A VEVENT is either a single occurrence or, if it has an RRULE, a
 * recurring series. Either way only the part of it falling inside
 * [now, windowEnd] is published: recurring events are expanded to their
 * occurrences in that range, single occurrences pass through if they land
 * in it. Both bounds apply to both kinds, so `windowDays` means the same
 * thing for a one-off in September as it does for a weekly class (#31).
 *
 * @param {import("node-ical").VEvent} entry
 * @param {Date} now
 * @param {Date} windowEnd
 * @returns {CalendarEvent[]}
 */
function expandOccurrences(entry, now, windowEnd) {
  if (!entry.rrule) {
    const start = entry.start && new Date(entry.start);
    if (!start || start < now || start > windowEnd) return [];
    return [toCalendarEvent(entry, entry.start, entry.end)];
  }

  const durationMs =
    entry.start && entry.end ? new Date(entry.end) - new Date(entry.start) : 0;
  const excludedDays = new Set(
    Object.keys(entry.exdate || {}).map((key) => new Date(entry.exdate[key]).toDateString())
  );

  return entry.rrule
    .between(now, windowEnd, true)
    .filter((occurrenceStart) => !excludedDays.has(occurrenceStart.toDateString()))
    .map((occurrenceStart) => {
      const occurrenceEnd = new Date(occurrenceStart.getTime() + durationMs);
      return toCalendarEvent(entry, occurrenceStart, occurrenceEnd, occurrenceStart.toISOString());
    });
}

/**
 * Whether an event's title marks it for publication. Case-insensitive and
 * tolerant of stray whitespace, since the client hand-types this into
 * Google Calendar rather than through any validated UI.
 *
 * @param {unknown} summary
 * @returns {boolean}
 */
function isPublicSummary(summary) {
  return (
    typeof summary === "string" &&
    summary.trim().toUpperCase().startsWith(PUBLIC_PREFIX)
  );
}

/**
 * Strip the "[PUBLIC]" prefix (and surrounding whitespace) from a title
 * that has already passed {@link isPublicSummary}.
 *
 * @param {string} summary
 * @returns {string}
 */
function stripPublicPrefix(summary) {
  return summary.trim().slice(PUBLIC_PREFIX.length).trim() || "Untitled event";
}

/**
 * @param {import("node-ical").VEvent} entry
 * @param {Date|string} start
 * @param {Date|string} end
 * @param {string} [idSuffix]
 * @returns {CalendarEvent}
 */
function toCalendarEvent(entry, start, end, idSuffix = "") {
  const allDay = entry.datetype === "date";
  const startDate = allDay ? floatingCalendarDate(start) : null;
  return {
    id: `${entry.uid}${idSuffix}`,
    title: stripPublicPrefix(entry.summary),
    start: new Date(start).toISOString(),
    end: end ? new Date(end).toISOString() : new Date(start).toISOString(),
    allDay,
    startDate,
    displayDate: formatDisplayDate({ start, allDay, startDate }),
    location: entry.location || null,
    description: entry.description || null,
    url: entry.url || null,
  };
}

/**
 * The calendar date an all-day entry names, as a floating `YYYY-MM-DD` string.
 *
 * node-ical parses a date-only property (`DTSTART;VALUE=DATE:20260523`) into a
 * Date at *local* midnight on whatever machine is running the build, tagged
 * `dateOnly: true`. Its calendar parts are the ones the feed meant; its instant
 * is an accident of the build machine's zone. `.toISOString()` therefore
 * destroys the date anywhere east of Greenwich — under TZ=Asia/Tokyo the 23rd
 * becomes `2026-05-22T15:00:00Z`, indistinguishable from a timed event at 3pm
 * UTC on the 22nd, and no amount of care downstream can tell them apart. That
 * lossy round trip is #30.
 *
 * So read the local parts straight off the Date. They are the intended date in
 * every zone, because local midnight is exactly how node-ical built it. The
 * same holds for the occurrences `rrule.between` yields for a recurring all-day
 * series: those land on local midnight too.
 *
 * (This is the *start* date only. A multi-day all-day event's end date is #66.)
 *
 * `Temporal.PlainDate` is that type by name — "a date with no timezone" — so it
 * is what the parts go into and what serializes them back out. Its `toString`
 * is ISO 8601 by specification, which is the same `YYYY-MM-DD` this used to
 * assemble by hand, and it rejects an impossible date rather than printing one.
 *
 * @param {Date|string} start
 * @returns {string} the date as `YYYY-MM-DD`, with no timezone attached
 */
function floatingCalendarDate(start) {
  const date = new Date(start);
  return new Temporal.PlainDate(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  ).toString();
}

// Fixed locale and timezone, neither of them the visitor's. These are events at
// a physical place in Kansas City, so venue-local time is the useful time: a
// reader in Singapore wants to know when to show up at the garden, not what
// their own clock will say at that moment. The zone abbreviation is rendered
// alongside (see below) so nobody has to guess whose 6pm it is.
const DISPLAY_LOCALE = "en-US";
const DISPLAY_TIME_ZONE = "America/Chicago";

/**
 * The finished date line for an event card, formatted once here at build time.
 *
 * **Formatting lives in this module, not in the component.** Two things follow
 * from that, and both break if it moves back:
 *
 * 1. *The browser never formats, so it can never disagree.* `components/
 *    eventFeed.js` is a client component: anything it formats runs twice, once
 *    in Node during the static export and once in the browser on hydration, and
 *    the two must agree byte for byte. They need not — `toLocaleString` inserts
 *    engine-chosen literal separators (some ICU builds use a narrow no-break
 *    space before AM/PM, others a plain space) that differ between Node's
 *    bundled ICU and a browser's, even with the locale and zone pinned. With
 *    the string computed once and shipped as data there is no second formatter.
 * 2. *Neither Temporal nor the IANA zone data reaches the client bundle.* The
 *    props boundary is JSON, so what crosses it is a plain string.
 *
 * The parts are still assembled by hand from `formatToParts` rather than taken
 * from `toLocaleString`. That is no longer load-bearing for hydration, but it
 * keeps every separator ours rather than the engine's, so the output does not
 * shift under an ICU upgrade — which the checked-in screenshot baselines and
 * the string assertions in the tests both depend on.
 *
 * All-day events render bare. A calendar date names no moment, so there is no
 * zone to label it with, and labelling one anyway would put back exactly the
 * confusion #30 removed. Timed events carry a real instant and get `CDT` or
 * `CST` as the date dictates — `timeZoneName: "short"` reads that off the IANA
 * database, so no DST transition is ever computed here.
 *
 * @param {{start: Date|string, allDay: boolean, startDate: string|null}} event
 * @returns {string}
 */
function formatDisplayDate({ start, allDay, startDate }) {
  const parts = allDay
    ? allDayParts(startDate)
    : timedParts(new Date(start));
  const get = (type) => parts.find((part) => part.type === type)?.value ?? "";

  const datePart = `${get("month")} ${get("day")}, ${get("year")}`;
  if (allDay) return datePart;

  const timePart = `${get("hour")}:${get("minute")}${NBSP}${get("dayPeriod")}${NBSP}${get("timeZoneName")}`;
  return `${datePart}, ${timePart}`;
}

/**
 * The clock time and its zone are bound together with non-breaking spaces, so
 * the only place this line can wrap is the comma after the year.
 *
 * The narrowest place it has to fit is the card at the 375px viewport, where
 * the date line gets 218px. In Suranna, the face the site actually loads, the
 * longest line this can produce — "Sep 30, 2026, 12:00 PM CDT" — measures
 * 197px, so the label costs a line break nowhere: every card stays one line at
 * every viewport, which is why adding it moves so few pixels.
 *
 * The binding is for the fallback font. globals.css loads Suranna with
 * `display=swap`, so the first paint of every visit renders in the fallback
 * serif, as does the whole visit for anyone whose browser cannot reach
 * fonts.googleapis.com. That face is wider: the same line measures 221.5px,
 * three and a half pixels over, and with ordinary spaces it wraps and leaves
 * the bare word "CDT" alone on the second line, detached from the time it
 * qualifies. Bound, it breaks at the comma instead — "May 13, 2026," /
 * "7:00 AM CDT" — which still reads as a date and a time.
 *
 * When the line fits, bound and unbound render identically, so this costs
 * nothing in the common case.
 *
 * Two notes for anyone re-measuring. The figures above come from a browser
 * with the real faces available — not from the pinned Playwright container,
 * which has neither Suranna nor Georgia installed and substitutes a different
 * face again, so it cannot answer this question. And `.date` is bold while
 * Suranna ships only weight 400: a probe that omits `font-weight` measures a
 * synthesised face and comes out around 9px narrow, which is enough to draw
 * the opposite conclusion.
 *
 * Written as an escape rather than a literal so it cannot be mistaken for an
 * ordinary space, here or in a diff.
 */
const NBSP = "\u00A0";

/**
 * The date parts of a floating `YYYY-MM-DD`, with nothing converted through any
 * zone. `Temporal.PlainDate` parses the string back into calendar fields; the
 * only `Date` here is `Date.UTC(...)` built from those fields and read back in
 * UTC — an identity round trip whose output cannot depend on the build
 * machine's zone. It exists solely because `Intl` needs a `Date` to hang a
 * localized month name off.
 *
 * @param {string} startDate
 * @returns {Intl.DateTimeFormatPart[]}
 */
function allDayParts(startDate) {
  const plainDate = Temporal.PlainDate.from(startDate);
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(
    new Date(Date.UTC(plainDate.year, plainDate.month - 1, plainDate.day))
  );
}

/**
 * @param {Date} instant
 * @returns {Intl.DateTimeFormatPart[]}
 */
function timedParts(instant) {
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: DISPLAY_TIME_ZONE,
    timeZoneName: "short",
  }).formatToParts(instant);
}
