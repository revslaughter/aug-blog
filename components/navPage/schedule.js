import { Fragment } from "react";
import styles from "./schedule.module.css";

/**
 * The small table of days and seasons near the top, from the CMS `schedule`
 * list. Each row is a label/value pair rendered as a definition term and
 * detail.
 *
 * Renders nothing when there are no rows.
 *
 * @param {{schedule: {label: string, value: string}[]}} props
 */
export default function NavSchedule({ schedule }) {
  if (schedule.length === 0) return null;
  return (
    <dl className={styles.schedule}>
      {/* No per-row wrapper element: the grid lives on the <dl>, so its
          direct children are what flow into the `max-content 1fr` columns.
          Wrapping each row in a <div> made those wrappers the grid items,
          which laid N rows out as N columns. A keyed Fragment groups each
          term/detail pair for React without adding a box, so the <dt> and
          <dd> themselves are the grid children and land in the two columns,
          row by row. */}
      {schedule.map(({ label, value }) => (
        <Fragment key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
