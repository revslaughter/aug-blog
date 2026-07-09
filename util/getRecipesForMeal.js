import fs from "fs";
import { join } from "path";
import matter from "gray-matter";

const RECIPES_DIR = join(process.cwd(), "_recipes");

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   author: string,
 *   content: string
 * }} Recipe
 */

/**
 * Get the recipe for the recipe name
 * @param {string} id
 * @returns {Recipe}
 */
export function getRecipeForID(id) {
	const filePath = join(RECIPES_DIR, `${id}.md`);
	const fileContent = fs.readFileSync(filePath, "utf-8");
	const { data, content } = matter(fileContent);
	const { author, title } = data;

	return { id, title, author, content };
}

export function getAllRecipes() {
	return [getRecipeForID("template"), getRecipeForID("test")];
}
