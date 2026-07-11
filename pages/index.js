import Image from "next/image";
import Layout from "../components/layout";
import Seo from "../components/seo";
import StructuredData from "../components/structuredData";
import ResponsiveSplit from "../components/responsiveSplit";
import EventFeed from "../components/eventFeed";
import PlantDivider from "../components/plantDivider";
import styles from "../styles/Home.module.css";
import { getUpcomingEvents } from "../util/googleCalendar";

export default function Home({ events }) {
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
							height={165}
							sizes="100vw"
							style={{
								maxWidth: "100%",
								height: "auto",
							}}
							alt="Antioch Urban Growers"
							priority
						/>
						<p className={styles.tagline}>
							Bringing you the true look, scent, and taste of nature.
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
						<PlantDivider />
					</main>
				}
				aside={<EventFeed events={events} />}
			/>
		</Layout>
	);
}

export async function getStaticProps() {
	const events = await getUpcomingEvents();
	return {
		props: {
			events,
		},
	};
}
