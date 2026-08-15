import { render, screen } from "@testing-library/react";
import EventFeed from "./eventFeed";

/**
 * A calendar event as `util/googleCalendar.js` hands them over: `start` is
 * always an ISO instant, and `allDay` says whether that instant means a
 * moment in time or just a date on a wall calendar.
 */
function event(overrides) {
  return {
    id: "fixture",
    title: "Summer Faire",
    start: "2026-05-23T00:00:00.000Z",
    end: "2026-05-24T00:00:00.000Z",
    allDay: false,
    ...overrides,
  };
}

// The component pins both the locale and the timezone it formats in rather
// than taking the viewer's, so these expectations hold whatever TZ Jest
// happens to run under.
describe("EventFeed date formatting", () => {
  it("prints an all-day event on its own date, not the evening before", () => {
    // The regression in #30: an all-day entry for the 23rd arrives as
    // UTC midnight, which is 7pm on the 22nd in America/Chicago. Formatting
    // it in the display zone printed "May 22, 2026".
    render(<EventFeed events={[event({ allDay: true })]} />);
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
});
