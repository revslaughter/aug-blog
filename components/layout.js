import Header from "./header";
import styles from "./layout.module.css";
import nav from "../util/nav.generated.json";

// The nav is authored in `_nav/` and compiled to nav.generated.json by
// scripts/generate-nav.mjs, which runs before both `dev` and `build`. Layout
// ships to the browser, so it cannot read _nav/ itself — see the header comment
// on that script for why this is a generated file rather than page props.
//
// Which sections appear here is the `in_nav` switch on each Markdown file, set
// from the CMS. That replaces the hand-maintained list this file used to carry:
// the nav held only About and Contact because the other sections' copy was
// still placeholder, and every change to that needed a commit. The client can
// now write the copy and turn the section on themselves.
//
// Home is prepended in `navLinks` rather than authored, so it cannot be
// reordered or switched off.
const NAV_LINKS = nav.links;

export default function Layout({ children }) {
  return (
		<div
			style={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				flexWrap: "nowrap",
				flexDirection: "column",
			}}
		>
			<Header links={NAV_LINKS} />
			<div className={styles.mainContent}>{children}</div>
		</div>
	);
}
