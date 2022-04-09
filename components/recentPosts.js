import Link from "next/link";

export default function RecentPosts({ posts }) {
  return (
    <div>
      {posts.map((p) => (
        <PostPreview {...p} key={p.slug} />
      ))}
    </div>
  );
}

function PostPreview({ title, author, slug }) {
  return (
    <div>
      <Link href={`/posts/${slug}`}>
        <a>{title}</a>
      </Link>
      {` (by ${author})`}
    </div>
  );
}
