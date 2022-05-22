import { useRouter } from "next/router";
import ErrorPage from "next/error";
import Layout from "../../components/layout";
import { getAllPosts, getPostForSlug } from "../../util/getPostForSlug";
import processMarkdown from "../../util/processMarkdown";

export default function Post(props) {
  const router = useRouter();
  if (cantFindPage(router, props)) {
    return <ErrorPage statusCode={404} />;
  }

  return (
    <Layout>
      <article>
        <header>
          <h1 className="article-title">{props.title}</h1>
          <div className="byline">
            <address className="author">By {props.author}</address>
            <time pubdate dateTime={props.pubdate}>
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
    },
  };
}

export async function getStaticPaths() {
  const posts = getAllPosts();
  return {
    paths: posts.map((p) => ({ params: { slug: p.slug } })),
    fallback: false,
  };
}
