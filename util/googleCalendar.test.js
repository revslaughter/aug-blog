jest.mock("node-ical", () => ({
  async: { fromURL: jest.fn(), parseFile: jest.fn() },
}));

import ical from "node-ical";
import { getUpcomingEvents } from "./googleCalendar";

const ICS_URL = "https://example.invalid/calendar.ics";

function vevent(uid, summary, { daysFromNow = 1 } = {}) {
  const start = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { type: "VEVENT", uid, summary, start, end };
}

describe("getUpcomingEvents", () => {
  beforeEach(() => {
    ical.async.fromURL.mockReset();
    ical.async.parseFile.mockReset();
    delete process.env.CALENDAR_NOW;
  });

  it("returns an empty array when no ICS URL is configured", async () => {
    const events = await getUpcomingEvents({ icsUrl: "" });
    expect(events).toEqual([]);
  });

  it("returns an empty array when the feed fails to load", async () => {
    ical.async.fromURL.mockRejectedValue(new Error("network error"));
    const events = await getUpcomingEvents({ icsUrl: ICS_URL });
    expect(events).toEqual([]);
  });

  describe("public event filtering", () => {
    it("excludes events without the [PUBLIC] prefix", async () => {
      ical.async.fromURL.mockResolvedValue({
        a: vevent("a", "Staff Meeting"),
      });

      const events = await getUpcomingEvents({ icsUrl: ICS_URL });
      expect(events).toEqual([]);
    });

    it("includes [PUBLIC]-prefixed events with the prefix stripped", async () => {
      ical.async.fromURL.mockResolvedValue({
        a: vevent("a", "[PUBLIC] Bunny Event"),
      });

      const events = await getUpcomingEvents({ icsUrl: ICS_URL });
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe("Bunny Event");
    });

    it("is tolerant of casing and whitespace variations", async () => {
      ical.async.fromURL.mockResolvedValue({
        a: vevent("a", "[public]Yoga Class", { daysFromNow: 1 }),
        b: vevent("b", "  [PUBLIC]   Fun Day", { daysFromNow: 2 }),
      });

      const events = await getUpcomingEvents({ icsUrl: ICS_URL });
      expect(events.map((e) => e.title)).toEqual(["Yoga Class", "Fun Day"]);
    });

    it("returns only the public events from a mixed feed, in date order", async () => {
      ical.async.fromURL.mockResolvedValue({
        a: vevent("a", "[PUBLIC] Later Public Event", { daysFromNow: 3 }),
        b: vevent("b", "Private Event", { daysFromNow: 1 }),
        c: vevent("c", "[PUBLIC] Sooner Public Event", { daysFromNow: 2 }),
      });

      const events = await getUpcomingEvents({ icsUrl: ICS_URL });
      expect(events.map((e) => e.title)).toEqual([
        "Sooner Public Event",
        "Later Public Event",
      ]);
    });
  });

  // A local .ics path and a frozen clock are what let the screenshot tests
  // build the homepage against a fixture calendar (tests/visual/fixtures).
  describe("fixture calendars", () => {
    it("reads a local file when the source is not an http(s) URL", async () => {
      ical.async.parseFile.mockResolvedValue({ a: vevent("a", "[PUBLIC] Fixture Event") });

      const events = await getUpcomingEvents({ icsUrl: "tests/visual/fixtures/events.ics" });

      expect(ical.async.parseFile).toHaveBeenCalledWith("tests/visual/fixtures/events.ics");
      expect(ical.async.fromURL).not.toHaveBeenCalled();
      expect(events.map((e) => e.title)).toEqual(["Fixture Event"]);
    });

    it("still fetches over the network for an http(s) URL", async () => {
      ical.async.fromURL.mockResolvedValue({});

      await getUpcomingEvents({ icsUrl: ICS_URL });

      expect(ical.async.fromURL).toHaveBeenCalledWith(ICS_URL);
      expect(ical.async.parseFile).not.toHaveBeenCalled();
    });

    it("measures the upcoming window from an injected `now`", async () => {
      const now = new Date("2026-05-04T14:00:00Z");
      ical.async.fromURL.mockResolvedValue({
        past: {
          type: "VEVENT",
          uid: "past",
          summary: "[PUBLIC] Last Week",
          start: new Date("2026-04-28T14:00:00Z"),
          end: new Date("2026-04-28T15:00:00Z"),
        },
        soon: {
          type: "VEVENT",
          uid: "soon",
          summary: "[PUBLIC] Next Week",
          start: new Date("2026-05-11T14:00:00Z"),
          end: new Date("2026-05-11T15:00:00Z"),
        },
      });

      const events = await getUpcomingEvents({ icsUrl: ICS_URL, now });
      expect(events.map((e) => e.title)).toEqual(["Next Week"]);
    });

    it("freezes the clock from CALENDAR_NOW when no `now` is passed", async () => {
      process.env.CALENDAR_NOW = "2026-05-04T14:00:00Z";
      ical.async.fromURL.mockResolvedValue({
        a: {
          type: "VEVENT",
          uid: "a",
          summary: "[PUBLIC] Inside The Frozen Window",
          start: new Date("2026-05-11T14:00:00Z"),
          end: new Date("2026-05-11T15:00:00Z"),
        },
      });

      const events = await getUpcomingEvents({ icsUrl: ICS_URL });
      expect(events.map((e) => e.title)).toEqual(["Inside The Frozen Window"]);
    });

    it("falls back to the real clock when CALENDAR_NOW is unparseable", async () => {
      process.env.CALENDAR_NOW = "not a date";
      jest.spyOn(console, "warn").mockImplementation(() => {});
      ical.async.fromURL.mockResolvedValue({ a: vevent("a", "[PUBLIC] Tomorrow") });

      const events = await getUpcomingEvents({ icsUrl: ICS_URL });

      expect(events.map((e) => e.title)).toEqual(["Tomorrow"]);
      console.warn.mockRestore();
    });
  });
});
