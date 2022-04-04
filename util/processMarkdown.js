import { remark } from "remark";
import html from "remark-html";

/**
 * @param {string} mdFileContent
 * @returns {string} html result
 */
export default async function processMarkdown(mdFileContent) {
  let htmlResult = await remark().use(html).process(mdFileContent);
  return htmlResult.toString();
}
