import Link from "next/link";
import Layout from "../../components/layout";
import Seo from "../../components/seo";
import { getAllRecipes } from "../../util/getRecipesForMeal";

export default function Recipes({ recipes }) {
	return (
		<Layout>
			<Seo title="Recipes" description="Eat up!" path="/recipes" />

			<article>
				<header>
					<h1>Recipes</h1>
				</header>
				Yum! Cooking is great.
				{recipes.map((recipe) => (
					<p key={recipe.id}>
						<Link href={`/recipes/${recipe.id}`}>{recipe.title}</Link>
						{` (by ${recipe.author})`}
					</p>
				))}
			</article>
		</Layout>
	);
}

export async function getStaticProps() {
	const recipes = getAllRecipes();
	return {
		props: {
			recipes,
		},
	};
}