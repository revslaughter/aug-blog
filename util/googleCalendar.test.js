import { getUpcomingEvents } from "./googleCalendar";

describe("getUpcomingEvents", () => {
  it("returns an empty array when no ICS URL is configured", async () => {
    const events = await getUpcomingEvents({ icsUrl: undefined });
    expect(events).toEqual([]);
  });

  it("returns an empty array when the feed fails to load", async () => {
    const events = await getUpcomingEvents({
      icsUrl: "https://example.invalid/not-a-real-calendar.ics",
    });
    expect(events).toEqual([]);
  });
});
