import { remark } from "remark";
import html from "remark-html";
import gfm from "remark-gfm";

/**
 * @param {string} mdFileContent
 * @returns {string} html result
 */
export default async function processMarkdown(mdFileContent) {
	let htmlResult = await remark().use(html).use(gfm).process(mdFileContent);
	return htmlResult.toString();
}
