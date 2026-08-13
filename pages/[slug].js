import fs from "fs";
import Layout from "../components/layout";
import Seo from "../components/seo";
import NavPageBody from "../components/navPage";
import processMarkdown from "../util/processMarkdown";
import { getAllNavPages, getNavPageForSlug } from "../util/navPages.mjs";

/**
 * Every top-level section page — /about, /contact, /plant-sale and the rest —
 * built from one Markdown file each in `_nav/`.
 *
 * This is the only route file for those eight pages. It sits at the root of
 * `pages/`, so it answers any single-segment path that no real file under
 * `pages/` already claims; nested routes like /posts/x are unaffected, and the
 * indexes at /posts and /recipes keep winning over it. `util/navPages.mjs`
 * turns the shadowing that implies into a build error rather than a mystery.
 *
 * `fs` is passed into the loader rather than imported by it so the module
 * stays importable from the prebuild scripts and from jsdom tests. Both this
 * file's data functions run only at build time, so Next drops the import from
 * the client bundle.
 */
export default function NavPage({ page, html }) {
  return (
    <Layout>
      <Seo
        title={page.title}
        // Falling through to the site-wide default when the client has not
        // written one, rather than shipping an empty description tag.
        {...(page.description ? { description: page.description } : {})}
        path={`/${page.slug}`}
      />
      <NavPageBody page={page} html={html} />
    </Layout>
  );
}

export async function getStaticPaths() {
  return {
    paths: getAllNavPages(fs).map((page) => ({ params: { slug: page.slug } })),
    // Required by `output: "export"` — there is no server to render a path
    // that was not built, so the set of section pages is fixed at build time.
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const page = getNavPageForSlug(params.slug, fs);
  return {
    props: {
      page,
      html: await processMarkdown(page.content),
    },
  };
}
