import Image from "next/image";
import Layout from "../components/layout";
import Seo from "../components/seo";
import StructuredData from "../components/structuredData";
import styles from "../styles/Home.module.css";
import { getUpcomingEvents } from "../util/googleCalendar";

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

export default function Home({ events }) {
	return (
		<Layout>
			<Seo path="/" />
			<StructuredData />
			<main className={styles.main}>
				<Image
					src="/AUG-logo-transparent-background-1.png"
					width={365}
					height={183}
					alt="Antioch Urban Growers"
				/>
				<div style={{ paddingBottom: "2rem", fontSize: "3rem" }}>
					<a
						href="https://antiochurbang.square.site"
						target="_blank"
						rel="noreferrer"
					>
						Store
					</a>
				</div>
				<div>
					<a
						target="_blank"
						rel="noreferrer"
						href="https://www.google.com/maps/place/Antioch+Urban+Growers/@39.1736056,-94.5500099,17z/data=!4m13!1m7!3m6!1s0x87c0f9c3c2452193:0xcff71674a50bec0a!2s2727+NE+44th+St,+Kansas+City,+MO+64117!3b1!8m2!3d39.1735968!4d-94.5478165!3m4!1s0x87c0f9c3def32867:0xf72ad06e93249453!8m2!3d39.1736056!4d-94.5478212"
					>
						2727 NE 44th St, Kansas City, MO 64117
					</a>
				</div>
				<div
					style={{
						fontWeight: "bold",
						paddingTop: 0,
						textAlign: "center",
						lineHeight: 1.5,
					}}
				>
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
				{/*
          <div style={LINK_CONTAINER}>
          <div style={LINK_ITEM}>Community Farms</div>
          <div style={LINK_ITEM}>Join our Discord</div>
          <div style={LINK_ITEM}>Blog</div>
          <div style={LINK_ITEM}>Our Store</div>
          </div>
        */}
				{/*
          Plain list for now — the responsive sidebar/card layout for this
          feed is a separate workstream (feature/responsive-event-layout).
        */}
				{events.length > 0 && (
					<div style={{ paddingTop: "2rem", width: "100%", maxWidth: "30rem" }}>
						<h2>Upcoming Events</h2>
						<ul>
							{events.map((event) => (
								<li key={event.id} style={{ display: "block", textAlign: "left" }}>
									<strong>{event.title}</strong>
									<div>{formatEventDate(event)}</div>
									{event.location && <div>{event.location}</div>}
								</li>
							))}
						</ul>
					</div>
				)}
			</main>
		</Layout>
	);
}

// Fixed locale/timezone (not the visitor's) so the statically prerendered
// HTML always matches what the client renders on hydration, regardless of
// the browser's locale or how long after build the page is opened.
const DATE_LOCALE = "en-US";
const DATE_TIME_ZONE = "America/Chicago";

function formatEventDate({ start, allDay }) {
	const date = new Date(start);
	return allDay
		? date.toLocaleDateString(DATE_LOCALE, { dateStyle: "medium", timeZone: DATE_TIME_ZONE })
		: date.toLocaleString(DATE_LOCALE, {
				dateStyle: "medium",
				timeStyle: "short",
				timeZone: DATE_TIME_ZONE,
		  });
}

export async function getStaticProps() {
	const events = await getUpcomingEvents();
	return {
		props: {
			events,
		},
	};
}
