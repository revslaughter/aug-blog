import processMarkdown from "./processMarkdown";

/**
 * Rendered post bodies go through `dangerouslySetInnerHTML`, which is only
 * safe because remark-html drops raw HTML by default. Nothing asserted that,
 * so the guarantee rested on a default nobody had written down.
 *
 * The pressure to change it is real: dropping raw HTML is also why an author
 * cannot embed a video or a map in a post. If that gets fixed by enabling raw
 * HTML — `sanitize: false`, or adding rehype-raw — these tests fail, which is
 * the point. Embeds should arrive as a constrained component, not by opening
 * the whole pipeline to arbitrary markup.
 */
describe("processMarkdown", () => {
  it("renders ordinary Markdown", async () => {
    const html = await processMarkdown("# Hello\n\nSome *text*.\n");
    expect(html).toContain("<h1>Hello</h1>");
    expect(html).toContain("<em>text</em>");
  });

  it("supports GitHub-flavoured tables", async () => {
    const html = await processMarkdown("| a | b |\n| - | - |\n| 1 | 2 |\n");
    expect(html).toContain("<table>");
  });

  it("strips script tags from post bodies", async () => {
    const html = await processMarkdown("Hi\n\n<script>alert(1)</script>\n");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert(1)");
  });

  it("strips inline event handlers from post bodies", async () => {
    const html = await processMarkdown('<img src="x" onerror="alert(1)">\n');
    expect(html).not.toContain("onerror");
  });

  it("strips iframes from post bodies", async () => {
    const html = await processMarkdown(
      '<iframe src="https://example.com"></iframe>\n'
    );
    expect(html).not.toContain("<iframe");
  });

  /**
   * CommonMark line-break semantics, asserted because they are a deliberate
   * choice that a one-line change would silently reverse.
   *
   * A single newline is whitespace and a blank line starts a paragraph. That is
   * the default, and it is what makes hard-wrapped Markdown safe to write — the
   * source in `_nav/` and `_posts/` is wrapped at about 80 columns, and every
   * one of those wraps would become a visible line break if this changed.
   *
   * The change that would do it is `remark-breaks`, which turns every newline
   * into a `<br>`. It gets added when someone pastes text with intentional
   * single-newline line breaks and finds them collapsing — poetry, an address,
   * a list typed without list syntax. The fix for that case is the two-space
   * hard break or real list markup, not reinterpreting every newline in the
   * corpus.
   */
  describe("line breaks", () => {
    it("treats a single newline as whitespace, not a line break", async () => {
      const html = await processMarkdown(
        "One line\nwrapped onto a second line.\n"
      );
      expect(html).not.toContain("<br");
      expect(html.match(/<p>/g)).toHaveLength(1);
    });

    it("starts a new paragraph on a blank line", async () => {
      const html = await processMarkdown("First.\n\nSecond.\n");
      expect(html.match(/<p>/g)).toHaveLength(2);
      expect(html).not.toContain("<br");
    });

    it("still honours an explicit hard break", async () => {
      // Two trailing spaces: the escape hatch for the cases that actually want
      // a line break inside a paragraph.
      const html = await processMarkdown("Line one  \nLine two\n");
      expect(html).toContain("<br");
      expect(html.match(/<p>/g)).toHaveLength(1);
    });
  });
});
