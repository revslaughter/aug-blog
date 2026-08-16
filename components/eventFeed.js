import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "./eventFeed.module.css";

/**
 * `start`/`end` are ISO instants, used here only for ordering. `displayDate` is
 * the finished date line to print — already formatted, already carrying the
 * `CDT`/`CST` label on timed events — see util/googleCalendar.js.
 *
 * @typedef {{
 *   id: string,
 *   title: string,
 *   start: string,
 *   end?: string,
 *   displayDate?: string,
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
      <div className={styles.date}>{event.displayDate}</div>
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
          <div className={styles.date}>{event.displayDate}</div>
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

