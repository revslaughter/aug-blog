import { render, screen } from "@testing-library/react";
import EventFeed from "./eventFeed";
import { getUpcomingEvents, icsFileSource } from "../util/googleCalendar";

/**
 * A calendar event as `util/googleCalendar.js` hands them over: `start` is
 * always an ISO instant, `allDay` says whether that instant means a moment in
 * time or just a date on a wall calendar, and `startDate` carries that date as
 * a floating `YYYY-MM-DD` string when it does.
 */
function event(overrides) {
  return {
    id: "fixture",
    title: "Summer Faire",
    start: "2026-05-23T00:00:00.000Z",
    end: "2026-05-24T00:00:00.000Z",
    allDay: false,
    startDate: null,
    ...overrides,
  };
}

// The component pins both the locale and the timezone it formats in rather
// than taking the viewer's, so these expectations hold whatever TZ Jest
// happens to run under.
describe("EventFeed date formatting", () => {
  // node-ical's async parser defers through Node's `setImmediate`, which
  // jsdom — the environment this project's Jest runs in — intentionally
  // omits, since browsers have no such global.
  const noSetImmediate = typeof globalThis.setImmediate === "undefined";
  beforeAll(() => {
    if (noSetImmediate) {
      globalThis.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
      globalThis.clearImmediate = (handle) => clearTimeout(handle);
    }
  });
  afterAll(() => {
    if (noSetImmediate) {
      delete globalThis.setImmediate;
      delete globalThis.clearImmediate;
    }
  });

  // #30 end to end. Feeding a literal `start` here would prove nothing: the
  // bug is that node-ical parses `DTSTART;VALUE=DATE:20260523` at the build
  // machine's *local* midnight, so any hardcoded instant silently assumes the
  // zone under test. Only the real parse can fail when the build zone moves —
  // before the fix this printed "May 22, 2026" under TZ=Asia/Tokyo.
  it("prints an all-day event on its own date, whatever zone the build runs in", async () => {
    const events = await getUpcomingEvents({
      now: new Date("2026-05-04T14:00:00Z"),
      loadCalendar: icsFileSource("tests/visual/fixtures/events.ics"),
      windowDays: 60,
    });
    const faire = events.filter((candidate) => candidate.title === "Summer Faire");
    expect(faire).toHaveLength(1);

    render(<EventFeed events={faire} />);
    expect(screen.getByText("May 23, 2026")).toBeInTheDocument();
  });

  it("keeps timed events in the display timezone", () => {
    // 14:00 UTC is 9:00 AM in Chicago (CDT in May) — a timed event carries a
    // real instant, so it must still be converted rather than shown in UTC.
    render(
      <EventFeed
        events={[
          event({ title: "Spring Plant Sale", start: "2026-05-07T14:00:00.000Z" }),
        ]}
      />
    );
    expect(screen.getByText("May 7, 2026, 9:00 AM")).toBeInTheDocument();
  });

  // `startDate` is what the date is read from, so a card and its modal cannot
  // disagree, and a hand-built event without one still renders.
  it("falls back to the instant when an all-day event has no startDate", () => {
    render(<EventFeed events={[event({ allDay: true, startDate: undefined })]} />);
    expect(screen.getByText("May 23, 2026")).toBeInTheDocument();
  });
});
