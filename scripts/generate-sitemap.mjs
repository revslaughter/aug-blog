// Generates public/sitemap.xml at build time (runs as `prebuild`).
// Reads static routes plus every published post in _posts/ so the sitemap
// stays in sync as the blog grows — no runtime cost on the static export.

import fs from "fs";
import path from "path";
import matter from "gray-matter";

const SITE_URL = "https://www.antiochurbangrowers.com";
const POSTS_DIR = path.join(process.cwd(), "_posts");
const OUT_FILE = path.join(process.cwd(), "public", "sitemap.xml");

// Static routes and a relative priority hint for crawlers.
const STATIC_ROUTES = [
  { path: "/", priority: "1.0" },
  { path: "/about", priority: "0.7" },
  { path: "/contact", priority: "0.7" },
  { path: "/posts", priority: "0.8" },
];

function getPostEntries() {
  return fs
    .readdirSync(POSTS_DIR)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.replace(/\.md$/, ""))
    // Skip scratch posts (gitignored test-*) and the authoring template.
    .filter((slug) => !slug.startsWith("test-") && slug !== "template")
    .map((slug) => {
      const file = fs.readFileSync(path.join(POSTS_DIR, `${slug}.md`), "utf-8");
      const { data } = matter(file);
      const lastmod = data.pubdate
        ? new Date(data.pubdate).toISOString().slice(0, 10)
        : undefined;
      return { path: `/posts/${slug}`, priority: "0.6", lastmod };
    });
}

function urlTag({ path: route, priority, lastmod }) {
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";
  return `  <url>
    <loc>${SITE_URL}${route}</loc>${lastmodTag}
    <priority>${priority}</priority>
  </url>`;
}

const entries = [...STATIC_ROUTES, ...getPostEntries()];
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(urlTag).join("\n")}
</urlset>
`;

fs.writeFileSync(OUT_FILE, xml);
console.log(`Generated sitemap with ${entries.length} URLs -> ${OUT_FILE}`);
