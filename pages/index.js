import Image from "next/image";
import { SocialIcon } from "react-social-icons";
import Layout from "../components/layout";
import styles from "../styles/Home.module.css";

/*
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
  margin: "0.5rem 0.5rem",
  display: "flex",
  justifyContent: "center",
};
*/

export default function Home() {
  return (
    <Layout>
      <main className={styles.main}>
        <Image
          src="/AUG-logo-transparent-background-1.png"
          width={365}
          height={183}
          alt="Antioch Urban Growers"
        />
        <div className="article-content">
          <div
            style={{
              height: "1px",
              width: "30rem",
              backgroundColor: "black",
              margin: "auto",
            }}
          />
          <ul style={{ margin:"auto" }}>
            <li>
              <a
                href="https://www.facebook.com/antiochurbangrowers"
                target="_blank"
                rel="noreferrer"
              >
                <Image
                  src="/fb.svg"
                  width={72}
                  height={72}
                  alt="Our Facebook Page"
                />
              </a>
            </li>
            <li style={{ fontWeight: "bold", paddingTop: 0, paddingBottom: "2rem" }}>
              Follow us on Facebook for events, videos, and education!
            </li>
            <li>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d3093.04905139692!2d-94.5500099!3d39.1736056!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x87c0f9c3def32867%3A0xf72ad06e93249453!2sAntioch%20Urban%20Growers!5e0!3m2!1sen!2sus!4v1668881845120!5m2!1sen!2sus"
                width="600"
                height="450"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </li>
            <li>
              <a
                target="_blank"
                rel="noreferrer"
                href="https://www.google.com/maps/place/Antioch+Urban+Growers/@39.1736056,-94.5500099,17z/data=!4m13!1m7!3m6!1s0x87c0f9c3c2452193:0xcff71674a50bec0a!2s2727+NE+44th+St,+Kansas+City,+MO+64117!3b1!8m2!3d39.1735968!4d-94.5478165!3m4!1s0x87c0f9c3def32867:0xf72ad06e93249453!8m2!3d39.1736056!4d-94.5478212"
              >
                2727 NE 44th St, Kansas City, MO 64117
              </a>
            </li>
            <li>
              <a href="tel:+18166884953">(816) 699-4953</a>
            </li>
          </ul>
        </div>
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
