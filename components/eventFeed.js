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
      <h2 className={styles.heading}>Upcoming Events</h2>
      {events.length === 0 ? (
        <p className={styles.empty}>
          No upcoming events right now — check back soon!
        </p>
      ) : (
        <ul className={styles.list}>
          {events.map((event) => (
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

function formatEventDate(start, allDay) {
  const date = new Date(start);
  return allDay
    ? date.toLocaleDateString(DATE_LOCALE, {
        dateStyle: "medium",
        timeZone: DATE_TIME_ZONE,
      })
    : date.toLocaleString(DATE_LOCALE, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: DATE_TIME_ZONE,
      });
}
