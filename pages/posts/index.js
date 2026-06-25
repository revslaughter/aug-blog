import Layout from "../../components/layout";
import Seo from "../../components/seo";
import RecentPosts from "../../components/recentPosts";
import { getRecentPosts } from "../../util/getPostForSlug";
export default function BlogHome(props) {
  return (
    <Layout>
      <Seo
        title="Blog"
        description="News, events, and education from Antioch Urban Growers — growing food and community in Kansas City."
        path="/posts"
      />
      <div style={{ padding: "4rem" }}>
        <RecentPosts posts={props.posts} />
      </div>
    </Layout>
  );
}

export async function getStaticProps() {
  let posts = getRecentPosts(3);
  return {
    props: {
      posts,
    },
  };
}
