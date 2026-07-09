
import Link from "next/link";
import Layout from "../../components/layout";
import Seo from "../../components/seo";

export default function Recipes() {

	const meal = "template"

	return (
		<Layout>
			<Seo title="Recipes" description="Eat up!" path="/recipes" />

			<article>
				<header>
					<h1>Recipes</h1>
				</header>
				Yum! Cooking is great.

				<p>
					<Link href={`/recipes/${meal}`}>{meal}</Link>
				</p>

			</article>
		</Layout>
	);
}