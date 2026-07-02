import Image from "next/image";
import styles from "./eventFeed.module.css";

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   start: string,
 *   end?: string,
 *   allDay?: boolean,
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
							<EventCard {...event} key={event.id} />
						))}
				</ul>
			)}
		</section>
	);
}

function EventCard({ title, start, allDay, location, description, url }) {
  const content = (
    <>
      <div className={styles.date}>{formatEventDate(start, allDay)}</div>
      <div className={styles.title}>{title}</div>
      {location && <div className={styles.location}>{location}</div>}
      {description && <p className={styles.description}>{description}</p>}
    </>
  );

  return (
    <li className={styles.card}>
      {url ? (
        <a
          className={styles.cardLink}
          href={url}
          target="_blank"
          rel="noreferrer"
        >
          {content}
        </a>
      ) : (
        content
      )}
    </li>
  );
}

// Fixed locale/timezone (not the visitor's) so the statically prerendered
// HTML always matches what the client renders on hydration, regardless of
// the browser's locale or how long after build the page is opened.
const DATE_LOCALE = "en-US";
const DATE_TIME_ZONE = "America/Chicago";

// Built from formatToParts rather than toLocaleString/toLocaleDateString:
// those insert engine-chosen literal separators (e.g. some ICU builds use
// a narrow no-break space before AM/PM, others a plain space), which can
// differ between Node's bundled ICU and a browser's, breaking hydration
// even with a fixed locale/timeZone. Assembling the string ourselves from
// the individual parts keeps every byte engine-independent.
function formatEventDate(start, allDay) {
  const date = new Date(start);
  const parts = new Intl.DateTimeFormat(DATE_LOCALE, {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: allDay ? undefined : "numeric",
		minute: allDay ? undefined : "2-digit",
		hour12: true,
		timeZone: DATE_TIME_ZONE,
	}).formatToParts(date);
	const get = (type) => parts.find((part) => part.type === type)?.value ?? "";

	const datePart = `${get("month")} ${get("day")}, ${get("year")}`;
	return allDay
		? datePart
		: `${datePart}, ${get("hour")}:${get("minute")} ${get("dayPeriod")}`;
}
