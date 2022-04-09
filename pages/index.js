import Head from "next/head";
import Image from "next/image";
import Layout from "../components/layout";
import styles from "../styles/Home.module.css";

const LINK_CONTAINER = {
  display: "flex",
  flexDirection: "row",
  maxWidth: "15rem",
  flexBasis: "7rem",
  justifyContent: "space-evenly",
  alignContent: "space-around",
  flexWrap: "wrap",
};

const LINK_ITEM = {
  margin: "0px 0.5rem",
  display: "flex",
  justifyContent: "center",
};

export default function Home() {
  return (
    <Layout>
      <main className={styles.main}>
        <Image
          src="/AUG-logo-transparent-background-1.png"
          width={365}
          height={183}
        />
        <h1>Welcome to Our Growing Community!</h1>
        <p className="article-content">
          We are a network of farms in the Kansas City area: taking over the
          world, one back yard at a time!
        </p>
        <div style={LINK_CONTAINER}>
          <div style={LINK_ITEM}>Community Farms</div>
          <div style={LINK_ITEM}>Join our Discord</div>
          <div style={LINK_ITEM}>Blog</div>
          <div style={LINK_ITEM}>Our Store</div>
        </div>
      </main>
    </Layout>
  );
}
