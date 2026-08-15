jest.mock("node-ical", () => ({
  async: { fromURL: jest.fn(), parseFile: jest.fn() },
}));

import ical from "node-ical";
import {
  calendarOptionsFromEnv,
  getUpcomingEvents,
  icsFileSource,
  icsUrlSource,
} from "./googleCalendar";

const ICS_URL = "https://example.invalid/calendar.ics";

function vevent(uid, summary, { daysFromNow = 1 } = {}) {
  const start = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { type: "VEVENT", uid, summary, start, end };
}

/** A public VEVENT at an exact instant, for tests that inject their own `now`. */
function at(title, iso) {
  return {
    type: "VEVENT",
    uid: title,
    summary: `[PUBLIC] ${title}`,
    start: new Date(iso),
    end: new Date(iso),
  };
}

/** A calendar source that resolves to a literal calendar object. */
function sourceOf(calendar) {
  return () => Promise.resolve(calendar);
}

/**
 * Lets a suite call node-ical's async parser. It defers work through Node's
 * `setImmediate`, which jsdom — the environment this project's Jest runs in —
 * intentionally omits, since browsers have no such global. Scoped to the
 * calling `describe` so nothing else sees the added global.
 */
function usePolyfilledSetImmediate() {
  const absent = typeof globalThis.setImmediate === "undefined";
  beforeAll(() => {
    if (absent) {
      globalThis.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
      globalThis.clearImmediate = (handle) => clearTimeout(handle);
    }
  });
  afterAll(() => {
    if (absent) {
      delete globalThis.setImmediate;
      delete globalThis.clearImmediate;
    }
  });
}

// `getUpcomingEvents` takes its calendar and its clock as arguments, so these
// need no module mocking and no fake timers.
describe("getUpcomingEvents", () => {
  it("returns an empty array when no source is configured", async () => {
    const events = await getUpcomingEvents({ loadCalendar: null });
    expect(events).toEqual([]);
  });

  it("returns an empty array when the source rejects", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const events = await getUpcomingEvents({
      loadCalendar: () => Promise.reject(new Error("network error")),
    });
    expect(events).toEqual([]);
    console.warn.mockRestore();
  });

  describe("public event filtering", () => {
    it("excludes events without the [PUBLIC] prefix", async () => {
      const events = await getUpcomingEvents({
        loadCalendar: sourceOf({ a: vevent("a", "Staff Meeting") }),
      });
      expect(events).toEqual([]);
    });

    it("includes [PUBLIC]-prefixed events with the prefix stripped", async () => {
      const events = await getUpcomingEvents({
        loadCalendar: sourceOf({ a: vevent("a", "[PUBLIC] Bunny Event") }),
      });
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe("Bunny Event");
    });

    it("is tolerant of casing and whitespace variations", async () => {
      const events = await getUpcomingEvents({
        loadCalendar: sourceOf({
          a: vevent("a", "[public]Yoga Class", { daysFromNow: 1 }),
          b: vevent("b", "  [PUBLIC]   Fun Day", { daysFromNow: 2 }),
        }),
      });
      expect(events.map((e) => e.title)).toEqual(["Yoga Class", "Fun Day"]);
    });

    it("returns only the public events from a mixed feed, in date order", async () => {
      const events = await getUpcomingEvents({
        loadCalendar: sourceOf({
          a: vevent("a", "[PUBLIC] Later Public Event", { daysFromNow: 3 }),
          b: vevent("b", "Private Event", { daysFromNow: 1 }),
          c: vevent("c", "[PUBLIC] Sooner Public Event", { daysFromNow: 2 }),
        }),
      });
      expect(events.map((e) => e.title)).toEqual([
        "Sooner Public Event",
        "Later Public Event",
      ]);
    });
  });

  it("measures the upcoming window from the injected `now`", async () => {
    const calendar = sourceOf({
      before: at("Week Before", "2026-04-28T14:00:00Z"),
      after: at("Week After", "2026-05-11T14:00:00Z"),
    });

    expect(
      (await getUpcomingEvents({ now: new Date("2026-05-04T14:00:00Z"), loadCalendar: calendar }))
        .map((e) => e.title)
    ).toEqual(["Week After"]);

    // Same calendar, clock moved back a fortnight: both are now upcoming.
    expect(
      (await getUpcomingEvents({ now: new Date("2026-04-20T14:00:00Z"), loadCalendar: calendar }))
        .map((e) => e.title)
    ).toEqual(["Week Before", "Week After"]);
  });

  // `windowDays` bounds the far end of the window too, and does so for one-off
  // events as well as recurring ones — before #31 a lone event months out was
  // still eligible and could take one of the six card slots.
  describe("the far end of the window", () => {
    const now = new Date("2026-05-04T14:00:00Z"); // default window ends 2026-06-03
    const calendar = sourceOf({
      near: at("Next Week", "2026-05-11T14:00:00Z"),
      far: at("Six Months Out", "2026-11-04T14:00:00Z"),
    });

    it("excludes a one-off event starting past the window", async () => {
      const events = await getUpcomingEvents({ now, loadCalendar: calendar });
      expect(events.map((e) => e.title)).toEqual(["Next Week"]);
    });

    it("keeps one starting inside it", async () => {
      const events = await getUpcomingEvents({
        now,
        loadCalendar: sourceOf({ edge: at("Last Day", "2026-06-03T09:00:00Z") }),
      });
      expect(events.map((e) => e.title)).toEqual(["Last Day"]);
    });

    it("moves with `windowDays`, so a wider window reaches the distant event", async () => {
      const events = await getUpcomingEvents({ now, loadCalendar: calendar, windowDays: 365 });
      expect(events.map((e) => e.title)).toEqual(["Next Week", "Six Months Out"]);
    });
  });
});

// Everything above hands `getUpcomingEvents` literal objects, which is enough
// for filtering and windowing but useless for #30: the bug lives in what
// node-ical produces for a `VALUE=DATE` property, so a hand-written `start`
// just bakes in whatever assumption the test author already held. These run
// the real parser over the real fixture instead.
describe("all-day events, parsed for real", () => {
  const realIcal = jest.requireActual("node-ical");
  const FIXTURE = "tests/visual/fixtures/events.ics";
  // node-ical's async API defers through setImmediate, which jsdom (this
  // project's Jest environment) deliberately does not provide.
  usePolyfilledSetImmediate();
  // The fixture's Summer Faire is `DTSTART;VALUE=DATE:20260523`.
  const now = new Date("2026-05-04T14:00:00Z");

  async function faire() {
    const events = await getUpcomingEvents({
      now,
      loadCalendar: () => realIcal.async.parseFile(FIXTURE),
      windowDays: 60,
    });
    return events.find((event) => event.title === "Summer Faire");
  }

  it("carries the calendar date the feed named, whatever zone the build runs in", async () => {
    // node-ical parses a date-only DTSTART at *local* midnight, so under
    // TZ=Asia/Tokyo this event's instant is 2026-05-22T15:00:00Z. `startDate`
    // is the floating date, and stays the 23rd regardless.
    expect((await faire()).startDate).toBe("2026-05-23");
  });

  it("marks it all-day", async () => {
    expect((await faire()).allDay).toBe(true);
  });

  // The instant is deliberately left alone — sorting and windowing still use
  // it, and it is only the *date* that an instant cannot express.
  it("still exposes an ISO instant on `start`", async () => {
    expect((await faire()).start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("leaves `startDate` null on timed events", async () => {
    const events = await getUpcomingEvents({
      now,
      loadCalendar: () => realIcal.async.parseFile(FIXTURE),
      windowDays: 60,
    });
    const timed = events.find((event) => event.title === "Spring Plant Sale Opening Day");
    expect(timed.allDay).toBe(false);
    expect(timed.startDate).toBeNull();
  });
});

describe("calendar sources", () => {
  beforeEach(() => {
    ical.async.fromURL.mockReset();
    ical.async.parseFile.mockReset();
  });

  it("icsUrlSource fetches over the network", async () => {
    ical.async.fromURL.mockResolvedValue({});
    await icsUrlSource(ICS_URL)();
    expect(ical.async.fromURL).toHaveBeenCalledWith(ICS_URL);
    expect(ical.async.parseFile).not.toHaveBeenCalled();
  });

  it("icsFileSource reads from disk", async () => {
    ical.async.parseFile.mockResolvedValue({});
    await icsFileSource("tests/visual/fixtures/events.ics")();
    expect(ical.async.parseFile).toHaveBeenCalledWith("tests/visual/fixtures/events.ics");
    expect(ical.async.fromURL).not.toHaveBeenCalled();
  });
});

describe("calendarOptionsFromEnv", () => {
  beforeEach(() => {
    ical.async.fromURL.mockReset().mockResolvedValue({});
    ical.async.parseFile.mockReset().mockResolvedValue({});
  });

  it("has no source when nothing is configured", () => {
    expect(calendarOptionsFromEnv({}).loadCalendar).toBeNull();
  });

  it("uses the live feed when GOOGLE_CALENDAR_ICS_URL is set", async () => {
    const { loadCalendar } = calendarOptionsFromEnv({ GOOGLE_CALENDAR_ICS_URL: ICS_URL });
    await loadCalendar();
    expect(ical.async.fromURL).toHaveBeenCalledWith(ICS_URL);
  });

  it("never treats the live feed URL as a file path", async () => {
    const { loadCalendar } = calendarOptionsFromEnv({
      GOOGLE_CALENDAR_ICS_URL: "oops-a-typo-not-a-url",
    });
    await loadCalendar();
    expect(ical.async.fromURL).toHaveBeenCalledWith("oops-a-typo-not-a-url");
    expect(ical.async.parseFile).not.toHaveBeenCalled();
  });

  it("prefers a fixture calendar over the live feed", async () => {
    const { loadCalendar } = calendarOptionsFromEnv({
      GOOGLE_CALENDAR_ICS_URL: ICS_URL,
      CALENDAR_FIXTURE_ICS: "tests/visual/fixtures/events.ics",
    });
    await loadCalendar();
    expect(ical.async.parseFile).toHaveBeenCalledWith("tests/visual/fixtures/events.ics");
    expect(ical.async.fromURL).not.toHaveBeenCalled();
  });

  it("defaults `now` to the wall clock", () => {
    const before = Date.now();
    const { now } = calendarOptionsFromEnv({});
    expect(now.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("freezes `now` from CALENDAR_NOW", () => {
    const { now } = calendarOptionsFromEnv({ CALENDAR_NOW: "2026-05-04T14:00:00Z" });
    expect(now.toISOString()).toBe("2026-05-04T14:00:00.000Z");
  });

  it("falls back to the wall clock when CALENDAR_NOW is unparseable", () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const before = Date.now();
    const { now } = calendarOptionsFromEnv({ CALENDAR_NOW: "not a date" });
    expect(now.getTime()).toBeGreaterThanOrEqual(before);
    console.warn.mockRestore();
  });
});
