import fs from "fs";
import { join } from "path";
import matter from "gray-matter";
import {
	publishableSlugs,
	listContentDir,
	contentDirsFromEnv,
} from "./contentFiles.mjs";

/** Resolved per call, so CONTENT_FIXTURE_DIR is read at build time. */
const recipesDir = () => contentDirsFromEnv().recipesDir;

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
export function getRecipeForID(id, dir = recipesDir()) {
	const filePath = join(dir, `${id}.md`);
	const fileContent = fs.readFileSync(filePath, "utf-8");
	const { data, content } = matter(fileContent);
	const { author, title } = data;

	return { id, title: title ?? id, author: author ?? null, content };
}

/**
 * Every recipe that should become a page. Shares its publishability rules
 * with the blog and the sitemap generator — see util/contentFiles.mjs — so
 * the template and the test fixture are built in dev and under the screenshot
 * tests, but never deployed.
 *
 * @param {string} [dir] Directory to read from; overridable for tests
 * @param {{includeDrafts?: boolean}} [options]
 * @returns {Recipe[]}
 */
export function getAllRecipes(dir = recipesDir(), options) {
	return publishableSlugs(listContentDir(dir, fs), options).map((id) =>
		getRecipeForID(id, dir)
	);
}
