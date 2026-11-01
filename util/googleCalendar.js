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
 * `start`/`end` are ISO instants — the moment an event happens. Timed events
 * sort and filter on `start`. All-day events sort and filter on `startDate`
 * instead (see {@link UpcomingWindow} and {@link sortKey}).
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

  const window = upcomingWindow(now, windowDays);

  const events = Object.values(calendar)
    .filter((entry) => entry && entry.type === "VEVENT")
    .flatMap((entry) => publishedOccurrences(entry, window));

  // Array.prototype.sort is stable, so events with equal keys keep the order
  // the calendar gave them.
  events.sort((a, b) => sortKey(a) - sortKey(b));

  return events.slice(0, limit);
}

/**
 * One calendar entry's published occurrences. Each entry is normalized and
 * expanded inside its own try/catch, `rrule.between` included, so one bad
 * entry is warned about and dropped and the rest of the calendar still
 * publishes. This keeps the "never throws" contract of
 * {@link getUpcomingEvents} (#64).
 *
 * @param {object} entry a raw node-ical VEVENT
 * @param {UpcomingWindow} window
 * @returns {CalendarEvent[]}
 */
function publishedOccurrences(entry, window) {
  try {
    const normalized = normalizeEntry(entry);
    if (!normalized) return [];
    return expandOccurrences(normalized, window);
  } catch (err) {
    console.warn(`[googleCalendar] dropping event ${entryUid(entry)}: ${err?.message ?? err}`);
    return [];
  }
}

/**
 * A node-ical entry coerced into plain values. Every field has its declared
 * type, so no code after {@link normalizeEntry} sees node-ical's object model.
 *
 * @typedef {{
 *   uid: string,
 *   summary: string|null,
 *   location: string|null,
 *   description: string|null,
 *   url: string|null,
 *   start: Date,
 *   end: Date|null,
 *   allDay: boolean,
 *   rrule: {between: (after: Date, before: Date, inc: boolean) => Date[]}|null,
 *   exdate: Date[],
 *   overrides: NormalizedOverride[],
 * }} NormalizedEntry
 */

/**
 * One RECURRENCE-ID override: an occurrence of a series that the client edited
 * on its own ("this event only" in Google Calendar). `recurrenceId` is the
 * original slot it replaces; `entry` is the occurrence as it now stands.
 *
 * @typedef {{recurrenceId: Date, entry: NormalizedEntry}} NormalizedOverride
 */

/**
 * The adapter at the node-ical boundary (#79). It is the only code in this
 * module that reads `summary`, `location`, `description`, `url`, `start` and
 * `end` from a node-ical entry.
 *
 * node-ical gives a property that has parameters (`SUMMARY;LANGUAGE=en-US:`,
 * `DESCRIPTION;ALTREP=...`, `URL;VALUE=URI:`) as `{params, val}`, not as a
 * string. Each text field becomes a plain string here, or null.
 *
 * An entry whose DTSTART or DTEND does not parse is dropped with a warning
 * that names its UID. node-ical leaves such a value as the raw string (#64).
 *
 * @param {object} entry a raw node-ical VEVENT
 * @returns {NormalizedEntry|null} null when the entry is dropped
 */
function normalizeEntry(entry) {
  const uid = entryUid(entry);

  const start = validDate(entry.start);
  if (!start) {
    console.warn(`[googleCalendar] dropping event ${uid}: unparseable DTSTART`);
    return null;
  }

  let end = null;
  if (entry.end !== undefined && entry.end !== null) {
    end = validDate(entry.end);
    if (!end) {
      console.warn(`[googleCalendar] dropping event ${uid}: unparseable DTEND`);
      return null;
    }
  }

  return {
    uid,
    summary: plainText(entry.summary),
    location: plainText(entry.location),
    description: plainText(entry.description),
    url: webUrl(plainText(entry.url)),
    start,
    end,
    allDay: entry.datetype === "date",
    rrule: typeof entry.rrule?.between === "function" ? entry.rrule : null,
    exdate: uniqueValues(entry.exdate).map(validDate).filter(Boolean),
    overrides: uniqueValues(entry.recurrences).flatMap((override) => normalizeOverride(override, uid)),
  };
}

/**
 * node-ical keys each EXDATE and each RECURRENCE-ID override twice, by a date
 * string and by an ISO string, with the same value under both keys. This
 * gives each value once.
 *
 * @param {unknown} map
 * @returns {unknown[]}
 */
function uniqueValues(map) {
  if (!map || typeof map !== "object") return [];
  return [...new Set(Object.values(map))];
}

/**
 * @param {object} override a raw node-ical VEVENT that has a RECURRENCE-ID
 * @param {string} seriesUid
 * @returns {NormalizedOverride[]} empty when the override is dropped
 */
function normalizeOverride(override, seriesUid) {
  if (!override || typeof override !== "object") return [];
  const recurrenceId = validDate(override.recurrenceid);
  if (!recurrenceId) {
    console.warn(`[googleCalendar] ignoring override of ${seriesUid}: unparseable RECURRENCE-ID`);
    return [];
  }
  const entry = normalizeEntry({ uid: seriesUid, ...override, recurrences: undefined });
  return entry ? [{ recurrenceId, entry: { ...entry, rrule: null } }] : [];
}

/**
 * @param {unknown} entry
 * @returns {string} the entry's UID, for ids and warnings
 */
function entryUid(entry) {
  return typeof entry?.uid === "string" && entry.uid ? entry.uid : "(no UID)";
}

/**
 * node-ical's text value as a plain string: a string as it is, `{params, val}`
 * by its `val`. Anything else, and a blank string, is null.
 *
 * @param {unknown} value
 * @returns {string|null}
 */
function plainText(value) {
  if (value && typeof value === "object" && "val" in value) {
    return plainText(value.val);
  }
  if (typeof value !== "string") return null;
  return value.trim() === "" ? null : value;
}

/**
 * A link a visitor can follow: an absolute `http` or `https` URL. Any other
 * value is null, so no `javascript:` or relative link reaches the page.
 *
 * @param {string|null} value
 * @returns {string|null}
 */
function webUrl(value) {
  if (!value) return null;
  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    return null;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:" ? value.trim() : null;
}

/**
 * node-ical gives a parsed date as a Date. An unparseable one stays a string.
 *
 * @param {unknown} value
 * @returns {Date|null} null unless `value` is a Date with a real time
 */
function validDate(value) {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value : null;
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
 * The "upcoming" window, held two ways.
 *
 * Timed events are moments, so they are compared by instant: a timed event
 * is in the window when `now <= start <= windowEnd`.
 *
 * All-day events are calendar dates, not moments, so they are compared by
 * date in the venue's zone, America/Chicago:
 *
 * - Near edge: the event's date is on or after `today`, the date of `now` in
 *   America/Chicago. An all-day event therefore stays upcoming for the whole
 *   of its own date (#78).
 * - Far edge: the event's date is on or before `lastDate`, the date of
 *   `windowEnd` in America/Chicago. An all-day event on that date is in,
 *   whatever the hour of `windowEnd` (#76).
 *
 * Both dates come from the injected `now`. Neither the wall clock nor the
 * build machine's zone takes part.
 *
 * @typedef {{
 *   now: Date,
 *   windowEnd: Date,
 *   today: Temporal.PlainDate,
 *   lastDate: Temporal.PlainDate,
 * }} UpcomingWindow
 */

/**
 * @param {Date} now
 * @param {number} windowDays
 * @returns {UpcomingWindow}
 */
function upcomingWindow(now, windowDays) {
  const windowEnd = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);
  return { now, windowEnd, today: venueDate(now), lastDate: venueDate(windowEnd) };
}

/**
 * The date an instant falls on in the venue's zone.
 *
 * @param {Date} instant
 * @returns {Temporal.PlainDate}
 */
function venueDate(instant) {
  return Temporal.Instant.fromEpochMilliseconds(instant.getTime())
    .toZonedDateTimeISO(DISPLAY_TIME_ZONE)
    .toPlainDate();
}

/**
 * Whether a normalized event is in the window. {@link UpcomingWindow} states
 * the rule.
 *
 * @param {CalendarEvent} event
 * @param {UpcomingWindow} window
 * @returns {boolean}
 */
function isInWindow(event, { now, windowEnd, today, lastDate }) {
  if (event.allDay) {
    const date = Temporal.PlainDate.from(event.startDate);
    return (
      Temporal.PlainDate.compare(date, today) >= 0 &&
      Temporal.PlainDate.compare(date, lastDate) <= 0
    );
  }
  const start = new Date(event.start);
  return start >= now && start <= windowEnd;
}

/**
 * The instant an event sorts by. A timed event sorts by its own instant. An
 * all-day event sorts at the start of its date in America/Chicago. Its
 * `start` is not used: node-ical puts it at the build machine's local
 * midnight, which moves with the build zone (#70).
 *
 * @param {CalendarEvent} event
 * @returns {number} epoch milliseconds
 */
function sortKey(event) {
  if (event.allDay) {
    return Temporal.PlainDate.from(event.startDate).toZonedDateTime(DISPLAY_TIME_ZONE)
      .epochMilliseconds;
  }
  return new Date(event.start).getTime();
}

/**
 * How far past each edge of the window `rrule.between` looks. An all-day
 * occurrence comes back at the build machine's local midnight, which can be
 * up to a day away from the same date in America/Chicago. Two days covers
 * every zone. {@link isInWindow} then applies the real rule.
 */
const RRULE_MARGIN_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * A VEVENT is either a single occurrence or, if it has an RRULE, a
 * recurring series. Either way only the part of it in the window is
 * published: recurring events are expanded to their occurrences, single
 * occurrences pass through if they land in it. Both kinds go through
 * {@link isInWindow}, so `windowDays` means the same thing for a one-off in
 * September as it does for a weekly class (#31).
 *
 * @param {NormalizedEntry} normalized
 * @param {UpcomingWindow} window
 * @returns {CalendarEvent[]}
 */
function expandOccurrences(normalized, window) {
  if (!normalized.rrule) {
    if (!isPublicSummary(normalized.summary)) return [];
    const event = toCalendarEvent(normalized, normalized.start, normalized.end);
    return isInWindow(event, window) ? [event] : [];
  }

  // Each occurrence of a series has a slot: its instant for a timed series,
  // its calendar date for an all-day one (see `slotKey`). EXDATE cancels a
  // slot. A RECURRENCE-ID override takes a slot away from the series and
  // publishes its own start, end, title and place instead.
  const slotKey = (date) => occurrenceSlot(date, normalized.allDay);
  const cancelled = new Set(normalized.exdate.map(slotKey));
  const overridden = new Set(normalized.overrides.map((o) => slotKey(o.recurrenceId)));

  const generated = isPublicSummary(normalized.summary)
    ? generatedOccurrences(normalized, window).filter((occurrenceStart) => {
        const key = slotKey(occurrenceStart);
        return !cancelled.has(key) && !overridden.has(key);
      })
    : [];

  const durationMs = normalized.end ? normalized.end.getTime() - normalized.start.getTime() : 0;
  const seriesEvents = generated.map((occurrenceStart) => {
    const occurrenceEnd = new Date(occurrenceStart.getTime() + durationMs);
    return toCalendarEvent(normalized, occurrenceStart, occurrenceEnd, occurrenceStart.toISOString());
  });

  // Overrides are not taken from `rrule.between`: an override can move an
  // occurrence into the window from a slot outside it, or out of the window
  // from a slot inside it. Each one is judged on its own new start and its
  // own title.
  const overrideEvents = normalized.overrides
    .filter(({ recurrenceId, entry }) =>
      !cancelled.has(slotKey(recurrenceId)) && isPublicSummary(entry.summary)
    )
    .map(({ recurrenceId, entry }) =>
      toCalendarEvent(entry, entry.start, entry.end, recurrenceId.toISOString())
    );

  return [...seriesEvents, ...overrideEvents].filter((event) => isInWindow(event, window));
}

/**
 * The start of each occurrence `rrule.between` yields near the window.
 *
 * @param {NormalizedEntry} normalized
 * @param {UpcomingWindow} window
 * @returns {Date[]}
 */
function generatedOccurrences(normalized, window) {
  return normalized.rrule.between(
    new Date(window.now.getTime() - RRULE_MARGIN_MS),
    new Date(window.windowEnd.getTime() + RRULE_MARGIN_MS),
    true
  );
}

/**
 * The slot an occurrence of a series fills, as a string that EXDATE and
 * RECURRENCE-ID values are matched against.
 *
 * - Timed series: the instant, in epoch milliseconds. Two occurrences on the
 *   same day are two slots, so one EXDATE cancels one of them only.
 * - All-day series: the floating calendar date (see
 *   {@link floatingCalendarDate}). node-ical builds every date-only value at
 *   the build machine's local midnight, the generated occurrences and the
 *   EXDATE and RECURRENCE-ID values alike, so their local parts agree in
 *   every build zone.
 *
 * `toDateString` is not used: it matches at day resolution and in the build
 * machine's zone.
 *
 * @param {Date} date
 * @param {boolean} allDay
 * @returns {string}
 */
function occurrenceSlot(date, allDay) {
  return allDay ? floatingCalendarDate(date) : String(date.getTime());
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
 * @param {NormalizedEntry} normalized
 * @param {Date|string} start
 * @param {Date|string} end
 * @param {string} [idSuffix]
 * @returns {CalendarEvent}
 */
function toCalendarEvent(normalized, start, end, idSuffix = "") {
  const allDay = normalized.allDay;
  const startDate = allDay ? floatingCalendarDate(start) : null;
  return {
    id: `${normalized.uid}${idSuffix}`,
    title: stripPublicPrefix(normalized.summary),
    start: new Date(start).toISOString(),
    end: end ? new Date(end).toISOString() : new Date(start).toISOString(),
    allDay,
    startDate,
    displayDate: formatDisplayDate({ start, allDay, startDate }),
    location: normalized.location,
    description: normalized.description,
    url: normalized.url,
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
