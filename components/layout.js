import Header from "./header";
import styles from "./layout.module.css";
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
      <Header
        links={[
          { title: "Home", href: "/" },
          { title: "About", href: "/about" },
          { title: "Blog", href: "/posts" },
        ]}
      />
      <div className={styles.mainContent}>{children}</div>
    </div>
  );
}
