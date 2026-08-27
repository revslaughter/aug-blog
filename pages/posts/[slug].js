import { useRouter } from "next/router";
import ErrorPage from "next/error";
import Layout from "../../components/layout";
import PostEmbeds from "../../components/postEmbeds";
import Seo from "../../components/seo";
import { getAllPosts, getPostForSlug } from "../../util/getPostForSlug";
import { formatDisplayDate } from "../../util/contentFiles.mjs";
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
            {props.author && (
              <address className="author">By {props.author}</address>
            )}
            {props.publishDate && (
              <time dateTime={props.pubdate}>{props.publishDate}</time>
            )}
          </div>
        </header>
        <div
          className="article-content"
          dangerouslySetInnerHTML={{ __html: props.renderedContent }}
        ></div>
        {/* Videos and maps come from a form field rather than from the text
            above, because that text reaches the browser through
            dangerouslySetInnerHTML and is only safe while remark-html keeps
            dropping raw HTML. See util/embeds.js for the whole argument, and
            components/postEmbeds.js for why they sit here and not mid-post. */}
        <PostEmbeds embeds={props.embeds} />
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
  return {
    props: {
      ...post,
      renderedContent,
      publishDate: formatDisplayDate(post.pubdate),
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
