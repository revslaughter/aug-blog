import fs from "fs";
import { join } from "path";
import matter from "gray-matter";
import { publishableSlugs } from "./contentFiles.mjs";

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
 * @param {string} [dir] Directory to read from; overridable for tests
 * @returns {Recipe}
 */
export function getRecipeForID(id, dir = RECIPES_DIR) {
	const filePath = join(dir, `${id}.md`);
	const fileContent = fs.readFileSync(filePath, "utf-8");
	const { data, content } = matter(fileContent);
	const { author, title } = data;

	return { id, title: title ?? id, author: author ?? null, content };
}

/**
 * Every recipe that should become a page. Shares its publishability rules
 * with the blog and the sitemap generator — see util/contentFiles.mjs.
 *
 * @param {string} [dir] Directory to read from; overridable for tests
 * @returns {Recipe[]}
 */
export function getAllRecipes(dir = RECIPES_DIR) {
	return publishableSlugs(fs.readdirSync(dir)).map((id) =>
		getRecipeForID(id, dir)
	);
}
