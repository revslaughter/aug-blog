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
          width={745}
          height={375}
          alt="Antioch Urban Growers"
        />
        <p className="article-content">
          <ul>
            <li>
              <a target="_blank" rel="noreferrer" href="https://www.google.com/maps/place/Antioch+Urban+Growers/@39.1736056,-94.5500099,17z/data=!4m13!1m7!3m6!1s0x87c0f9c3c2452193:0xcff71674a50bec0a!2s2727+NE+44th+St,+Kansas+City,+MO+64117!3b1!8m2!3d39.1735968!4d-94.5478165!3m4!1s0x87c0f9c3def32867:0xf72ad06e93249453!8m2!3d39.1736056!4d-94.5478212">
                2727 NE 44th St, Kansas City, MO 64117
              </a>
            </li>
            <li>
              <a href="tel:+18166884953">(816) 699-4953</a>
            </li>
          </ul>
        </p>
        {/*
          <div style={LINK_CONTAINER}>
          <div style={LINK_ITEM}>Community Farms</div>
          <div style={LINK_ITEM}>Join our Discord</div>
          <div style={LINK_ITEM}>Blog</div>
          <div style={LINK_ITEM}>Our Store</div>
          </div>
        */}
      </main>
    </Layout>
  );
}
