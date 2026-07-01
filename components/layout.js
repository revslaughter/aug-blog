import Header from "./header";
import styles from "./layout.module.css";

// Nav scaffolding for the section overhaul in GitHub issue #13. Order
// follows the annual program flow the client described (Spring Plant Sale
// -> Produce Sale -> Summer Faire), with the two new weekly series after
// Faire and the year-round Compost Program last. Still an open discussion
// with the client — expect this order to be revisited.
const NAV_LINKS = [
  { title: "Home", href: "/" },
  { title: "Spring Plant Sale", href: "/plant-sale" },
  { title: "Produce Sale", href: "/produce-sale" },
  { title: "Summer Faire", href: "/summer-faire" },
  { title: "Sustainable Living Workshops", href: "/workshops" },
  { title: "Mindful Movement Series", href: "/mindful-movement" },
  { title: "Compost Program", href: "/compost" },
  { title: "Blog", href: "/posts" },
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
