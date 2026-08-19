import styles from "./intro.module.css";

/**
 * The optional opening line, from the CMS `intro` field. Sits just under the
 * heading, above everything else, styled as a lead paragraph so it reads as an
 * introduction rather than as the first line of body copy.
 *
 * Renders nothing when the field is empty, so a section with no intro looks
 * the same as one that never had the field.
 *
 * @param {{intro: string|null}} props
 */
export default function NavIntro({ intro }) {
  if (!intro) return null;
  return <p className={styles.intro}>{intro}</p>;
}
