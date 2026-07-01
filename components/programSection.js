import { ORGANIZATION } from "../util/siteMeta";
import styles from "./programSection.module.css";

/**
 * Shared scaffold for a nav "section" page (produce sale, plant sale,
 * workshops, etc. — see GitHub issue #13). Keeps these pages consistent
 * while their real content is still being finalized with the client.
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.intro]
 * @param {{label: string, value: string}[]} [props.schedule]
 * @param {boolean} [props.storeLink] Show a link to the online store
 * @param {string} [props.note] Small italic note, e.g. flagging TBD details
 */
export default function ProgramSection({ title, intro, schedule, storeLink, note }) {
  return (
    <article>
      <header>
        <h1>{title}</h1>
      </header>
      {intro && <p>{intro}</p>}
      {schedule && schedule.length > 0 && (
        <dl className={styles.schedule}>
          {schedule.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {storeLink && (
        <p className={styles.storeLink}>
          <a href={ORGANIZATION.storeUrl} target="_blank" rel="noreferrer">
            Visit the store
          </a>
        </p>
      )}
      {note && <p className={styles.note}>{note}</p>}
    </article>
  );
}
