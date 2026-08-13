import Layout from "../components/layout";
import Seo from "../components/seo";
import { ORGANIZATION, FORMATTED_ADDRESS } from "../util/siteMeta";

export default function Contact() {
  return (
		<Layout>
			<Seo
				title="Contact"
				description={`Visit Antioch Urban Growers at ${FORMATTED_ADDRESS}, or give us a call. We'd love to hear from you.`}
				path="/contact"
			/>
			<article>
				<header>
					<h1>Contact</h1>
				</header>
				<ul>
					<li>
						<a target="_blank" rel="noreferrer" href={ORGANIZATION.mapsUrl}>
							{FORMATTED_ADDRESS}
						</a>
					</li>
					<li>
						<a href={`tel:${ORGANIZATION.telephone}`}>
							{ORGANIZATION.telephoneDisplay}
						</a>
					</li>
				</ul>
			</article>
		</Layout>
	);
}
