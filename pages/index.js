import Image from "next/image";
import Layout from "../components/layout";
import Seo from "../components/seo";
import StructuredData from "../components/structuredData";
import ResponsiveSplit from "../components/responsiveSplit";
import EventFeed from "../components/eventFeed";
import PlantDivider from "../components/plantDivider";
import styles from "../styles/Home.module.css";
import { ORGANIZATION, FORMATTED_ADDRESS } from "../util/siteMeta";
import { calendarOptionsFromEnv, getUpcomingEvents } from "../util/googleCalendar";

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
							Taking over the world
							<br />
							one backyard at a time
						</p>
						<div>
							<a target="_blank" rel="noreferrer" href={ORGANIZATION.mapsUrl}>
								{FORMATTED_ADDRESS}
							</a>
						</div>
						<div>
							<a href={`tel:${ORGANIZATION.telephone}`}>
								{ORGANIZATION.telephoneDisplay}
							</a>
						</div>
						<PlantDivider />
						<div className={styles.storeLink}>
							<a href={ORGANIZATION.storeUrl} target="_blank" rel="noreferrer">
								Visit our Store
							</a>
						</div>
						<PlantDivider />
						<div className={styles.infoBlock}>
							<div className={styles.followText}>
								<div>
									<a
										href={ORGANIZATION.facebookUrl}
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
								Follow us on Facebook for events, videos, and education!
							</div>
						</div>
						<PlantDivider leaves />
					</main>
				}
				aside={<EventFeed events={events} />}
			/>
		</Layout>
	);
}

export async function getStaticProps() {
	const events = await getUpcomingEvents(calendarOptionsFromEnv());
	return {
		props: {
			events,
		},
	};
}
