import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EventFeed from "./eventFeed";
import { getUpcomingEvents, icsFileSource } from "../util/googleCalendar";

/**
 * A calendar event as `util/googleCalendar.js` hands them over. `displayDate`
 * is the finished date line: that module formats it once at build time, and
 * the feed's whole job here is to print it. What that string *contains* — the
 * CDT/CST label, the bare all-day date — is asserted in
 * util/googleCalendar.test.js, where it is produced.
 */
function event(overrides) {
  return {
    id: "fixture",
    title: "Summer Faire",
    start: "2026-05-23T00:00:00.000Z",
    end: "2026-05-24T00:00:00.000Z",
    displayDate: "May 23, 2026",
    ...overrides,
  };
}

describe("EventFeed date rendering", () => {
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

  it("prints the date line it is handed, verbatim", () => {
    render(
      <EventFeed
        events={[
          event({ title: "Spring Plant Sale", displayDate: "May 7, 2026, 9:00 AM CDT" }),
        ]}
      />
    );
    expect(screen.getByText("May 7, 2026, 9:00 AM CDT")).toBeInTheDocument();
  });

  // One field feeds both the card and its modal, so the two cannot drift apart
  // the way two separate format calls could.
  it("shows the same line in the modal as on the card", async () => {
    // jsdom implements <dialog> but not its modal methods, and the feed calls
    // showModal in a layout effect. Nothing here depends on real modality —
    // the dialog's children are rendered either way — so a flag is enough.
    const dialog = window.HTMLDialogElement.prototype;
    dialog.showModal = function () {
      this.open = true;
    };
    dialog.close = function () {
      this.open = false;
    };

    const user = userEvent.setup();
    render(<EventFeed events={[event({ displayDate: "Nov 2, 2026, 12:00 PM CST" })]} />);

    await user.click(screen.getByRole("button", { name: /View details for Summer Faire/ }));

    expect(screen.getAllByText("Nov 2, 2026, 12:00 PM CST")).toHaveLength(2);
  });

  // #30 end to end, and the one test here that spans the whole pipeline: real
  // `.ics` on disk -> node-ical -> googleCalendar -> rendered DOM. Feeding a
  // literal event would prove nothing, because the bug is that node-ical parses
  // `DTSTART;VALUE=DATE:20260523` at the build machine's *local* midnight, so a
  // hardcoded instant silently assumes the zone under test. Only the real parse
  // can fail when the build zone moves — before the fix this printed
  // "May 22, 2026" under TZ=Asia/Tokyo.
  it("renders an all-day event on its own date, whatever zone the build runs in", async () => {
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
});
