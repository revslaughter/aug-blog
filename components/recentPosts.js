import Link from "next/link";

export default function RecentPosts({ posts }) {
  return (
    <div>
      <h1>Recent posts</h1>
      {posts.map((p) => (
        <PostPreview {...p} key={p.slug} />
      ))}
    </div>
  );
}

function PostPreview({ title, author, slug }) {
  return (
    <div style={{ fontSize: "x-large" }}>
      <Link href={`/posts/${slug}`}>{title}</Link>
      {` (by ${author})`}
    </div>
  );
}
