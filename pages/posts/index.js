import Layout from "../../components/layout";
import RecentPosts from "../../components/recentPosts";
import { getRecentPosts } from "../../util/getPostForSlug";
export default function BlogHome(props) {
  return (
    <Layout>
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
