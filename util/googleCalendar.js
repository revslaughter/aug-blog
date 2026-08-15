import ical from "node-ical";

/**
 * Build-time Google Calendar integration. The site is a static export with
 * no server runtime, so this runs inside `getStaticProps` — the result is
 * baked into the page at build/deploy time, not fetched by the browser.
 * Refreshing events therefore means re-deploying (see
 * .github/workflows/weekly-refresh.yml for a scheduled rebuild).
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
 * @typedef {{
 *   id: string,
 *   title: string,
 *   start: string,
 *   end: string,
 *   allDay: boolean,
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
  return {
    id: `${entry.uid}${idSuffix}`,
    title: stripPublicPrefix(entry.summary),
    start: new Date(start).toISOString(),
    end: end ? new Date(end).toISOString() : new Date(start).toISOString(),
    allDay: entry.datetype === "date",
    location: entry.location || null,
    description: entry.description || null,
    url: entry.url || null,
  };
}
