import Layout from "../../components/layout";
import { getRecipeForID, getAllRecipes } from "../../util/getRecipesForMeal";
import processMarkdown from "../../util/processMarkdown";

export default function MealRecipe(props) {
	return (
		<Layout>
			<article>
				<header>
					<h1 className="article-title">{props.title}</h1>
				</header>
				<div
					className="article-content"
					dangerouslySetInnerHTML={{ __html: props.renderedContent }}
				></div>
			</article>
		</Layout>
	);
}

export async function getStaticProps({ params }) {
	const recipe = getRecipeForID(params.meal);
	const renderedContent = await processMarkdown(recipe.content);

	return {
		props: {
			...recipe,
			renderedContent,
		},
	};
}

export async function getStaticPaths() {
	const recipes = getAllRecipes();
	console.log(recipes)
	return {
		paths: recipes.map((p) => ({ params: { meal: p.id } })),
		fallback: false,
	};
}
