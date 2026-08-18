import NavTitle from "./title";
import NavIntro from "./intro";
import NavSchedule from "./schedule";
import NavContactDetails from "./contactDetails";
import NavContent from "./content";
import NavStoreLink from "./storeLink";
import NavNote from "./note";
import styles from "./navPage.module.css";

/**
 * Renders one top-level section page from `_nav/` by composing a component per
 * CMS field. Each field owns its own markup and decides whether it renders, so
 * this file is only the running order.
 *
 * Block order is fixed here rather than authorable. The client controls the
 * words; the shape of a section page is a design decision, and a CMS that lets
 * copy land anywhere on the page is one where the site slowly stops matching
 * itself.
 *
 * This is the successor to `ProgramSection`; the field components inherited its
 * class names so migrating these eight pages to Markdown was not also a design
 * change. The screenshot baselines are the check on that.
 *
 * @param {Object} props
 * @param {import("../../util/navPages.mjs").NavPage} props.page
 * @param {string} props.html Body Markdown, already rendered
 */
export default function NavPage({ page, html }) {
  const { title, intro, schedule, storeLink, contactDetails, note } = page;
  return (
    <article className={styles.navPage}>
      <NavTitle title={title} />
      <NavIntro intro={intro} />
      <NavSchedule schedule={schedule} />
      <NavContactDetails show={contactDetails} />
      <NavContent html={html} />
      <NavStoreLink show={storeLink} />
      <NavNote note={note} />
    </article>
  );
}
