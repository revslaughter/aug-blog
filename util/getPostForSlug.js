import fs from "fs";
import { join } from "path";
import matter from "gray-matter";

const POSTS_DIR = join(process.cwd(), "_posts");

/**
 * Datatype for post data and metadata
 * @typedef {{
 *   title: string,
 *   author: string,
 *   pubdate: string,
 *   slug: string,
 *   content: string}} Post
 */

/**
 * Given the url for the post, get the post info
 * @param {string} slug The filename of the post
 * @returns {Post} post metadata
 */
export function getPostForSlug(slug) {
  const filePath = join(POSTS_DIR, `${slug}.md`);
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(fileContent);
  const { pubdate, title, author } = data;
  return { title, author, pubdate: pubdate.toJSON(), slug, content };
}


export function getAllPosts() {
  const postFiles = fs.readdirSync(POSTS_DIR);
  return postFiles
    .map((name) => name.replace(/\.md$/, "")) //strip file extension
    .map((slug) => getPostForSlug(slug));
}

/**
 *
 * @param {number} limit The number of recent posts to return
 * @returns Array of post data, from most to least recent
 */
export function getRecentPosts(limit) {
  return getAllPosts()
    .sort((onePost, anotherPost) =>
      new Date(onePost.pubdate) > new Date(anotherPost.pubdate) ? -1 : 1
    )
    .slice(0, limit);
}

/**
 *
 * @param {Post} post
 * @returns
 */
export function getNextPost(post) {
  return getAllPosts();
}
