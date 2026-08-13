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
});
