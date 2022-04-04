import fs from "fs";
import { join } from "path";
import matter from "gray-matter";

const POSTS_DIR = join(process.cwd(), "_posts");

/**
 *
 * @param {string} slug The filename of the post
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
