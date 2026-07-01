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
 */

const DEFAULT_LIMIT = 6;
const DEFAULT_WINDOW_DAYS = 90;

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
 * Fetch and normalize upcoming events from the configured Google Calendar.
 * Never throws — any misconfiguration or fetch failure resolves to an empty
 * array so a flaky calendar can never break the site build.
 *
 * @param {{limit?: number, windowDays?: number, icsUrl?: string}} [options]
 * @returns {Promise<CalendarEvent[]>}
 */
export async function getUpcomingEvents({
  limit = DEFAULT_LIMIT,
  windowDays = DEFAULT_WINDOW_DAYS,
  icsUrl = process.env.GOOGLE_CALENDAR_ICS_URL,
} = {}) {
  if (!icsUrl) {
    return [];
  }

  let calendar;
  try {
    calendar = await ical.async.fromURL(icsUrl);
  } catch (err) {
    console.warn(`[googleCalendar] failed to fetch calendar feed: ${err.message}`);
    return [];
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);

  const events = Object.values(calendar)
    .filter((entry) => entry.type === "VEVENT")
    .flatMap((entry) => expandOccurrences(entry, now, windowEnd));

  events.sort((a, b) => new Date(a.start) - new Date(b.start));

  return events.slice(0, limit);
}

/**
 * A VEVENT is either a single occurrence or, if it has an RRULE, a
 * recurring series. Expand recurring events to their occurrences within
 * the lookahead window; pass single occurrences through if they're upcoming.
 *
 * @param {import("node-ical").VEvent} entry
 * @param {Date} now
 * @param {Date} windowEnd
 * @returns {CalendarEvent[]}
 */
function expandOccurrences(entry, now, windowEnd) {
  if (!entry.rrule) {
    const start = entry.start && new Date(entry.start);
    if (!start || start < now) return [];
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
 * @param {import("node-ical").VEvent} entry
 * @param {Date|string} start
 * @param {Date|string} end
 * @param {string} [idSuffix]
 * @returns {CalendarEvent}
 */
function toCalendarEvent(entry, start, end, idSuffix = "") {
  return {
    id: `${entry.uid}${idSuffix}`,
    title: entry.summary || "Untitled event",
    start: new Date(start).toISOString(),
    end: end ? new Date(end).toISOString() : new Date(start).toISOString(),
    allDay: entry.datetype === "date",
    location: entry.location || null,
    description: entry.description || null,
    url: entry.url || null,
  };
}
