import styles from "./title.module.css";

/**
 * The page's big heading, from the CMS `title` field.
 *
 * Always present — `normalizeNavPage` falls `title` back to the slug, so there
 * is nothing to guard against here.
 *
 * @param {{title: string}} props
 */
export default function NavTitle({title}) {
  return (
    <header>
      <h1 className={styles.navHeading}>{title}</h1>
    </header>
  );
}
