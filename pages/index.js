import Image from "next/image";
import Layout from "../components/layout";
import Seo from "../components/seo";
import StructuredData from "../components/structuredData";
import ResponsiveSplit from "../components/responsiveSplit";
import EventFeed from "../components/eventFeed";
import PlantDivider from "../components/plantDivider";
import styles from "../styles/Home.module.css";

// Placeholder events so the responsive layout is demoable on its own.
// feature/google-calendar-integration replaces this with real data fetched
// at build time via getStaticProps — that's a separate workstream.
const PLACEHOLDER_EVENTS = [
	{
		id: "placeholder-1",
		title: "Community Placeholder Workday",
		start: "2026-08-15T15:00:00.000Z",
		allDay: false,
		location: "2727 NE 44th St, Kansas City, MO",
	},
	{
		id: "placeholder-2",
		title: "Composting 101 Placeholder",
		start: "2026-08-22T18:00:00.000Z",
		allDay: false,
		location: "2727 NE 44th St, Kansas City, MO",
	},
	{
		id: "placeholder-PAST",
		title: "Some other Placeholder",
		start: "2026-05-12T23:00:00.000Z",
		allDay: false,
		location: "Someplace, Somewhere",
	},
	{
		id: "placeholder-3",
		title: "Locavore Dinner Placeholder",
		start: "2026-07-12T23:00:00.000Z",
		allDay: false,
		location: "999 Some Ave, Someplace, Somewhere",
	},
];

// Filtered once, when this module runs at export/build time — this site
// is a static export rebuilt weekly, so an event going stale for a few
// days between builds is fine. Filtering by "now" on every client render
// instead would make the static HTML depend on when it's opened, which is
// the same class of hydration mismatch already hit once in EventFeed.
const UPCOMING_PLACEHOLDER_EVENTS = PLACEHOLDER_EVENTS.filter(
	(event) => new Date(event.start) >= new Date()
);

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
			<Seo path="/" />
			<StructuredData />
			<ResponsiveSplit
				main={
					<main className={styles.main}>
						<Image
							src="/AUG-logo-transparent-background-1.png"
							width={365}
							height={183}
							alt="Antioch Urban Growers"
							preload
						/>
						{/*
              Placeholder tagline for this design trial — easy to swap for
              real copy. Meant to set the "sunlit greenhouse, pull up a
              chair" tone the rest of the page follows.
            */}
						<p className={styles.tagline}>
							Quick wafting zephyrs vex bold Jim. Quick zephyrs blow, vexing
							daft Jim.
						</p>
						<div className={styles.storeLink}>
							<a
								href="https://antiochurbang.square.site"
								target="_blank"
								rel="noreferrer"
							>
								Store
							</a>
						</div>
						<PlantDivider />
						<div className={styles.infoBlock}>
							<div>
								<a
									target="_blank"
									rel="noreferrer"
									href="https://www.google.com/maps/place/Antioch+Urban+Growers/@39.1736056,-94.5500099,17z/data=!4m13!1m7!3m6!1s0x87c0f9c3c2452193:0xcff71674a50bec0a!2s2727+NE+44th+St,+Kansas+City,+MO+64117!3b1!8m2!3d39.1735968!4d-94.5478165!3m4!1s0x87c0f9c3def32867:0xf72ad06e93249453!8m2!3d39.1736056!4d-94.5478212"
								>
									2727 NE 44th St, Kansas City, MO 64117
								</a>
							</div>
							<div className={styles.followText}>
								Follow us on Facebook for events, videos, and education!
							</div>
							<div>
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
							</div>
							<div>
								<a href="tel:+18166994953">(816) 699-4953</a>
							</div>
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
				}
				aside={<EventFeed events={UPCOMING_PLACEHOLDER_EVENTS} />}
			/>
		</Layout>
	);
}
