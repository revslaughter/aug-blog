import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "./eventFeed.module.css";

/**
 * `start`/`end` are ISO instants. `startDate` is a floating `YYYY-MM-DD`
 * calendar date, present only on all-day events — see util/googleCalendar.js.
 *
 * @typedef {{
 *   id: string,
 *   title: string,
 *   start: string,
 *   end?: string,
 *   allDay?: boolean,
 *   startDate?: string|null,
 *   location?: string|null,
 *   description?: string|null,
 *   url?: string|null
 * }} CalendarEvent
 */

/**
 * Presentational card list for upcoming events. Data-source agnostic — it
 * just renders whatever event objects it's given (see
 * util/googleCalendar.js on feature/google-calendar-integration for a real
 * data source).
 *
 * @param {{events: CalendarEvent[]}} props
 */
export default function EventFeed({ events }) {
  const [selectedEvent, setSelectedEvent] = useState(null);

  return (
		<section className={styles.feed} aria-label="Upcoming events">
			<h2 className={styles.heading}>
				<Image
					src="/grape-cluster.svg"
					width={28}
					height={28}
					alt=""
					aria-hidden="true"
					className={styles.headingIcon}
				/>
				Upcoming Events
			</h2>
			{events.length === 0 ? (
				<p className={styles.empty}>
					No upcoming events right now — check back soon!
				</p>
			) : (
				<ul className={styles.list}>
					{[...events]
						.sort((event, anotherEvent) => new Date(event.start) - new Date(anotherEvent.start))
						.map((event) => (
							<EventCard
								event={event}
								key={event.id}
								isSelected={selectedEvent?.id === event.id}
								onSelect={setSelectedEvent}
							/>
						))}
				</ul>
			)}
			<EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
		</section>
	);
}

const DESCRIPTION_PREVIEW_WORD_LIMIT = 50;

/**
 * Truncates a description to its first `wordLimit` words for the card
 * preview, slicing the original string (rather than rejoining split words)
 * so line breaks within the preview are preserved.
 *
 * @param {string} description
 * @param {number} [wordLimit]
 * @returns {{preview: string, isTruncated: boolean}}
 */
function truncateDescription(description, wordLimit = DESCRIPTION_PREVIEW_WORD_LIMIT) {
  const trimmed = description.trim();
  const words = [...trimmed.matchAll(/\S+/g)];
  if (words.length <= wordLimit) {
    return { preview: trimmed, isTruncated: false };
  }
  const lastWord = words[wordLimit - 1];
  const cutoffIndex = lastWord.index + lastWord[0].length;
  return { preview: trimmed.slice(0, cutoffIndex), isTruncated: true };
}

// The hashtag branch requires a non-word, non-# character (or start of
// string) before the "#" so it doesn't fire inside a URL fragment like
// "https://example.com#section" — the URL branch, tried first, already
// consumes those whole.
const LINKIFY_PATTERN = /(https?:\/\/\S+)|(?<![\w#])(#[A-Za-z0-9_]+)/g;

/**
 * Splits plain text on bare URLs and #hashtags, turning both into real
 * links — URLs as-is, hashtags out to Instagram's tag search. Calendar
 * descriptions come back as plain text (see #26/#28 discussion); this is
 * the markup we add back in ourselves.
 *
 * @param {string} text
 * @returns {Array<string|JSX.Element>}
 */
function linkifyText(text) {
  const nodes = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(LINKIFY_PATTERN)) {
    const [fullMatch, url, hashtag] = match;
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const href = url
      ? url
      : `https://www.instagram.com/explore/tags/${hashtag.slice(1)}/`;
    nodes.push(
      <a
        key={key++}
        href={href}
        target="_blank"
        rel="noreferrer"
        className={styles.inlineLink}
      >
        {fullMatch}
      </a>
    );

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function EventCard({ event, isSelected, onSelect }) {
  const { title, location, description } = event;
  const { preview, isTruncated } = description
    ? truncateDescription(description)
    : {};

  return (
    <li className={`${styles.card} ${isSelected ? styles.cardHidden : ""}`}>
      <button
        type="button"
        className={styles.cardStretchedButton}
        onClick={() => onSelect(event)}
        aria-haspopup="dialog"
        aria-label={`View details for ${title}`}
      />
      <div className={styles.date}>{formatEventDate(event)}</div>
      <div className={styles.title}>{title}</div>
      {location && <div className={styles.location}>{location}</div>}
      {description && (
        <p className={styles.description}>
          {linkifyText(preview)}
          {isTruncated && (
            <>
              {"… "}
              <a
                href="#"
                className={styles.seeMore}
                onClick={(clickEvent) => {
                  clickEvent.preventDefault();
                  onSelect(event);
                }}
              >
                (see more)
              </a>
            </>
          )}
        </p>
      )}
    </li>
  );
}

function EventModal({ event, onClose }) {
  const dialogRef = useRef(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (event) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
    } else if (dialog.open) {
      dialog.close();
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [event]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.modal}
      aria-label={event?.title}
      onClose={onClose}
      onClick={(clickEvent) => {
        if (clickEvent.target === dialogRef.current) onClose();
      }}
    >
      {event && (
        <div className={styles.modalCard}>
          <button
            type="button"
            className={styles.modalCloseButton}
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
          <div className={styles.date}>{formatEventDate(event)}</div>
          <h3 className={styles.modalTitle}>{event.title}</h3>
          {event.location && (
            <div className={styles.location}>{event.location}</div>
          )}
          {event.description && (
            <p className={styles.description}>
              {linkifyText(event.description)}
            </p>
          )}
          {event.url && (
            <a
              className={styles.modalLink}
              href={event.url}
              target="_blank"
              rel="noreferrer"
            >
              View original &#8599;
            </a>
          )}
        </div>
      )}
    </dialog>
  );
}

// Fixed locale/timezone (not the visitor's) so the statically prerendered
// HTML always matches what the client renders on hydration, regardless of
// the browser's locale or how long after build the page is opened.
const DATE_LOCALE = "en-US";
const DATE_TIME_ZONE = "America/Chicago";

// An all-day event's date is a date on a wall calendar, not a moment, so it
// must never be read out of an instant — the instant node-ical builds for a
// date-only entry sits at the build machine's local midnight, which is the
// previous day in UTC anywhere east of Greenwich. util/googleCalendar.js
// therefore hands all-day events a floating `startDate` ("2026-05-23"), and
// this is where we spend it: the date parts are taken from that string
// directly, never converted through any zone. Timed events do carry a real
// moment, so they keep being rendered in DATE_TIME_ZONE. See #30.
//
// The only Date built here is `Date.UTC(...)` from those same parts, read
// back in UTC — an identity round trip whose output cannot depend on the
// build machine's zone. It exists solely because Intl needs a Date to hang
// a localized month name off.
function allDayInstant(startDate) {
	const [year, month, day] = startDate.split("-").map(Number);
	return new Date(Date.UTC(year, month - 1, day));
}

// Built from formatToParts rather than toLocaleString/toLocaleDateString:
// those insert engine-chosen literal separators (e.g. some ICU builds use
// a narrow no-break space before AM/PM, others a plain space), which can
// differ between Node's bundled ICU and a browser's, breaking hydration
// even with a fixed locale/timeZone. Assembling the string ourselves from
// the individual parts keeps every byte engine-independent.
//
// Takes the whole CalendarEvent rather than loose fields so that adding
// `startDate` to the data couldn't leave one call site reading the old shape.
function formatEventDate({ start, allDay, startDate }) {
	// An all-day event predating `startDate` (or one hand-built by a caller)
	// still has to render something; falling back to the instant is the old
	// #30 behaviour, right whenever the build machine runs at or west of UTC.
	const isFloating = Boolean(allDay && startDate);
	const date = isFloating ? allDayInstant(startDate) : new Date(start);
	const parts = new Intl.DateTimeFormat(DATE_LOCALE, {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: allDay ? undefined : "numeric",
		minute: allDay ? undefined : "2-digit",
		hour12: true,
		timeZone: allDay ? "UTC" : DATE_TIME_ZONE,
	}).formatToParts(date);
	const get = (type) => parts.find((part) => part.type === type)?.value ?? "";

	const datePart = `${get("month")} ${get("day")}, ${get("year")}`;
	return allDay
		? datePart
		: `${datePart}, ${get("hour")}:${get("minute")} ${get("dayPeriod")}`;
}
