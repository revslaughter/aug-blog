import Layout from "../../components/layout";
import RecentPosts from "../../components/recentPosts";
import { getRecentPosts } from "../../util/getPostForSlug";
export default function BlogHome(props) {
  return (
    <Layout>
      <RecentPosts posts={props.posts} />
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
