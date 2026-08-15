import fs from "fs";
import { join } from "path";
import matter from "gray-matter";
import {
  publishableSlugs,
  listContentDir,
  contentDirsFromEnv,
  toIsoDate,
  byNewestFirst,
} from "./contentFiles.mjs";
import { normalizeEmbeds } from "./embeds";

/** Resolved per call, so CONTENT_FIXTURE_DIR is read at build time. */
const postsDir = () => contentDirsFromEnv().postsDir;

/**
 * Datatype for post data and metadata
 * @typedef {{
 *   title: string,
 *   author: string,
 *   pubdate: string|null,
 *   slug: string,
 *   embeds: import("./embeds").ResolvedEmbed[],
 *   content: string}} Post
 */

/**
 * Given the url for the post, get the post info.
 *
 * `pubdate` comes back as an ISO string or null — see `toIsoDate` for why a
 * malformed date degrades instead of throwing.
 *
 * `embeds` is validated here rather than at render time for the same reason
 * the date is coerced here: this is the one place frontmatter stops being
 * whatever someone typed and becomes the shape the components are allowed to
 * assume. A link that does not resolve is dropped, so the post publishes
 * without it — see `util/embeds.js`.
 *
 * @param {string} slug The filename of the post, without extension
 * @param {string} [dir] Directory to read from; overridable for tests
 * @returns {Post} post metadata
 */
export function getPostForSlug(slug, dir = postsDir()) {
  const filePath = join(dir, `${slug}.md`);
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(fileContent);
  const { pubdate, title, author } = data;
  return {
    title: title ?? slug,
    author: author ?? null,
    pubdate: toIsoDate(pubdate),
    slug,
    embeds: normalizeEmbeds(data.embeds),
    content,
  };
}

/**
 * Every post that should become a page. Non-Markdown files and draft content
 * are excluded here rather than only in the sitemap generator, so the two
 * cannot disagree about what is published.
 *
 * Whether drafts count is decided by the environment — see
 * `includeDraftContent`. Production leaves them out; `next dev` and the
 * screenshot tests build them.
 *
 * @param {string} [dir] Directory to read from; overridable for tests
 * @param {{includeDrafts?: boolean}} [options]
 * @returns {Post[]}
 */
export function getAllPosts(dir = postsDir(), options) {
  return publishableSlugs(listContentDir(dir, fs), options).map((slug) =>
    getPostForSlug(slug, dir)
  );
}

/**
 * @param {number} limit The number of recent posts to return
 * @param {string} [dir] Directory to read from; overridable for tests
 * @param {{includeDrafts?: boolean}} [options]
 * @returns {Post[]} Post data, from most to least recent
 */
export function getRecentPosts(limit, dir = postsDir(), options) {
  return getAllPosts(dir, options).sort(byNewestFirst).slice(0, limit);
}
