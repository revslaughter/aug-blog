jest.mock("node-ical", () => ({
  async: { fromURL: jest.fn() },
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
});
