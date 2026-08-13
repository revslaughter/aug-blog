import fs from "fs";
import { join } from "path";
import matter from "gray-matter";
import {
  publishableSlugs,
  toIsoDate,
  byNewestFirst,
} from "./contentFiles.mjs";

const POSTS_DIR = join(process.cwd(), "_posts");

/**
 * Datatype for post data and metadata
 * @typedef {{
 *   title: string,
 *   author: string,
 *   pubdate: string|null,
 *   slug: string,
 *   content: string}} Post
 */

/**
 * Given the url for the post, get the post info.
 *
 * `pubdate` comes back as an ISO string or null — see `toIsoDate` for why a
 * malformed date degrades instead of throwing.
 *
 * @param {string} slug The filename of the post, without extension
 * @param {string} [dir] Directory to read from; overridable for tests
 * @returns {Post} post metadata
 */
export function getPostForSlug(slug, dir = POSTS_DIR) {
  const filePath = join(dir, `${slug}.md`);
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(fileContent);
  const { pubdate, title, author } = data;
  return {
    title: title ?? slug,
    author: author ?? null,
    pubdate: toIsoDate(pubdate),
    slug,
    content,
  };
}

/**
 * Every post that should become a page. Non-Markdown files, the authoring
 * template, and scratch drafts are excluded here rather than only in the
 * sitemap generator, so the two cannot disagree about what is published.
 *
 * @param {string} [dir] Directory to read from; overridable for tests
 * @returns {Post[]}
 */
export function getAllPosts(dir = POSTS_DIR) {
  return publishableSlugs(fs.readdirSync(dir)).map((slug) =>
    getPostForSlug(slug, dir)
  );
}

/**
 * @param {number} limit The number of recent posts to return
 * @param {string} [dir] Directory to read from; overridable for tests
 * @returns {Post[]} Post data, from most to least recent
 */
export function getRecentPosts(limit, dir = POSTS_DIR) {
  return getAllPosts(dir).sort(byNewestFirst).slice(0, limit);
}
