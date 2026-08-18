import { Fragment } from "react";
import { ORGANIZATION, FORMATTED_ADDRESS } from "../util/siteMeta";
import styles from "./navPage.module.css";

/**
 * Renders one top-level section page from `_nav/`.
 *
 * This is the successor to `ProgramSection`, and inherited its stylesheet
 * deliberately: the schedule list, the store link and the note keep the exact
 * class names they had as JSX, so migrating these eight pages to Markdown is
 * not also a design change. The screenshot baselines are the check on that.
 *
 * Block order is fixed here rather than authorable. The client controls the
 * words; the shape of a section page is a design decision, and a CMS that lets
 * copy land anywhere on the page is one where the site slowly stops matching
 * itself.
 *
 * @param {Object} props
 * @param {import("../util/navPages.mjs").NavPage} props.page
 * @param {string} props.html Body Markdown, already rendered
 */
export default function NavPage({ page, html }) {
  const { title, intro, schedule, storeLink, contactDetails, note } = page;
  return (
    <article>
      <header>
        <h1>{title}</h1>
      </header>
      {intro && <p>{intro}</p>}
      {schedule.length > 0 && (
        <dl className={styles.schedule}>
          {/* No per-row wrapper element: the grid lives on the <dl>, so its
              direct children are what flow into the `max-content 1fr` columns.
              Wrapping each row in a <div> made those wrappers the grid items,
              which laid N rows out as N columns. A keyed Fragment groups each
              term/detail pair for React without adding a box, so the <dt> and
              <dd> themselves are the grid children and land in the two
              columns, row by row. */}
          {schedule.map(({ label, value }) => (
            <Fragment key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </Fragment>
          ))}
        </dl>
      )}
      {/* Address and phone come from siteMeta, never from the Markdown — see
          normalizeNavPage for why this is a switch and not a text field. */}
      {contactDetails && (
        <ul>
          <li>
            <a target="_blank" rel="noreferrer" href={ORGANIZATION.mapsUrl}>
              {FORMATTED_ADDRESS}
            </a>
          </li>
          <li>
            <a href={`tel:${ORGANIZATION.telephone}`}>
              {ORGANIZATION.telephoneDisplay}
            </a>
          </li>
        </ul>
      )}
      {html && (
        <div
          className="article-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
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
