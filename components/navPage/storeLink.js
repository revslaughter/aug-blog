import { ORGANIZATION } from "../../util/siteMeta";
import styles from "./storeLink.module.css";

/**
 * A "Visit the store" link near the bottom, shown when the CMS `store_link`
 * switch is on.
 *
 * Like the contact block, the prop is the switch and the URL comes from
 * `util/siteMeta.js` — the store address lives in one place for the whole site.
 *
 * @param {{show: boolean}} props Whether the section opted into the link.
 */
export default function NavStoreLink({ show }) {
  if (!show) return null;
  return (
    <p className={styles.storeLink}>
      <a href={ORGANIZATION.storeUrl} target="_blank" rel="noreferrer">
        Visit the store
      </a>
    </p>
  );
}
