import styles from "./responsiveSplit.module.css";

/**
 * Reusable responsive two-region layout.
 *
 * On small/portrait screens the two regions stack vertically, `main` first
 * and `aside` below it. On larger screens they sit side by side: `main`
 * becomes a narrow left-hand column (sidebar-width) and `aside` fills the
 * remaining space on the right.
 *
 * Not specific to events — any page that needs "existing content as a
 * sidebar + something bigger next to it" on wide screens can reuse this.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.main Left column on wide screens, shown first on narrow screens
 * @param {React.ReactNode} props.aside Right column on wide screens, shown below `main` on narrow screens
 */
export default function ResponsiveSplit({ main, aside }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.main}>{main}</div>
      <div className={styles.aside}>{aside}</div>
    </div>
  );
}
