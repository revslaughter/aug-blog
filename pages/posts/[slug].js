import { useRouter } from "next/router";
import ErrorPage from "next/error";
import Layout from "../../components/layout";
import Seo from "../../components/seo";
import { getAllPosts, getPostForSlug } from "../../util/getPostForSlug";
import processMarkdown from "../../util/processMarkdown";

export default function Post(props) {
  const router = useRouter();
  if (cantFindPage(router, props)) {
    return <ErrorPage statusCode={404} />;
  }

  return (
    <Layout>
      <Seo
        title={props.title}
        description={props.excerpt}
        path={`/posts/${props.slug}`}
        type="article"
      />
      <article>
        <header>
          <h1 className="article-title">{props.title}</h1>
          <div className="byline">
            <address className="author">By {props.author}</address>
            <time dateTime={props.pubdate}>
              {props.publishDate}
            </time>
          </div>
        </header>
        <div
          className="article-content"
          dangerouslySetInnerHTML={{ __html: props.renderedContent }}
        ></div>
      </article>
    </Layout>
  );
}

/**
 *
 * @param {import("next/router").NextRouter} router
 * @param {string} post
 * @returns {boolean}
 */
function cantFindPage(router, post) {
  return router.isFallback || post.slug === null || post.slug === undefined;
}

export async function getStaticProps({ params }) {
  const post = getPostForSlug(params.slug);
  const renderedContent = await processMarkdown(post.content);
  let publishDate = new Date(post.pubdate.split("T")[0].split("-"));
  publishDate = publishDate.toDateString();
  return {
    props: {
      ...post,
      renderedContent,
      publishDate,
      excerpt: makeExcerpt(post.content),
    },
  };
}

/**
 * Build a plain-text meta description from markdown body (~155 chars).
 * @param {string} markdown
 * @returns {string}
 */
function makeExcerpt(markdown) {
  return markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // [text](url) -> text
    .replace(/[#>*_`~]/g, "") // strip common markdown syntax
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 155);
}

export async function getStaticPaths() {
  const posts = getAllPosts();
  return {
    paths: posts.map((p) => ({ params: { slug: p.slug } })),
    fallback: false,
  };
}
