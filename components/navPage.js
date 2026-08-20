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
			{intro && <p className={styles.pageInfo}>{intro}</p>}
			{schedule.length > 0 && (
				<dl className={styles.schedule}>
					{schedule.map(({ label, value }) => (
						<div key={label}>
							<dt>{label}</dt>
							<dd>{value}</dd>
						</div>
					))}
				</dl>
			)}
			{html && (
				<div
					className="article-content"
					dangerouslySetInnerHTML={{ __html: html }}
				/>
			)}
			{note && <p className={styles.note}>{note}</p>}
			{storeLink && (
				<p className={styles.storeLink}>
					<a href={ORGANIZATION.storeUrl} target="_blank" rel="noreferrer">
						Visit the store
					</a>
				</p>
			)}
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
		</article>
	);
}
