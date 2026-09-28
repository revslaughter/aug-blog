/**
 * The page body — the CMS `body` field, already rendered from Markdown to HTML
 * by `util/processMarkdown` before it reaches here.
 *
 * Renders nothing when the body is empty.
 *
 * @param {{html: string}} props Rendered HTML, trusted because it is produced
 *   at build time from the site's own Markdown, not from user input.
 */
export default function NavContent({ html }) {
  if (!html) return null;
  return (
    <div
      className="article-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
