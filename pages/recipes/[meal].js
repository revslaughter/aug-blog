import Layout from "../../components/layout";
import Seo from "../../components/seo";
import { getRecipeForID, getAllRecipes } from "../../util/getRecipesForMeal";
import processMarkdown from "../../util/processMarkdown";

export default function MealRecipe(props) {
	return (
		<Layout>
			<Seo
				title={props.title}
				description={`A recipe by ${props.author}`}
				path={`/recipes/${props.id}`}
				type="article"
			/>
			<article>
				<header>
					<h1 className="article-title">{props.title}</h1>
					<div className="byline">
						<address className="author">By {props.author}</address>
					</div>
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
	return {
		paths: recipes.map((p) => ({ params: { meal: p.id } })),
		fallback: false,
	};
}
