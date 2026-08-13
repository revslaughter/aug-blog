import Header from "./header";
import styles from "./layout.module.css";

// Nav for the section overhaul in GitHub issue #13. Only sections whose copy
// is final are linked — About and Contact — so the rest of the site stops
// being reachable by sitemap alone.
//
// Still to add, in the annual program flow the client described (Spring Plant
// Sale -> Produce Sale -> Summer Faire, then the two weekly series, then the
// year-round Compost Program): /plant-sale, /produce-sale, /summer-faire,
// /workshops, /mindful-movement, /compost. Their copy is still placeholder.
// /posts and /recipes are held back too — both indexes currently list only
// their template files.
const NAV_LINKS = [
	{ title: "Home", href: "/" },
	{ title: "About", href: "/about" },
	{ title: "Contact", href: "/contact" },
];

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
