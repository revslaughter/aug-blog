import styles from "./note.module.css";

/**
 * The little italic line at the very bottom, from the CMS `note` field — good
 * for "times change each year, check back nearer the date".
 *
 * Renders nothing when the field is empty.
 *
 * @param {{note: string|null}} props
 */
export default function NavNote({ note }) {
  if (!note) return null;
  return <p className={styles.note}>{note}</p>;
}
