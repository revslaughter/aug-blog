import fs from "fs";
import os from "os";
import { join } from "path";
import { getAllPosts, getPostForSlug, getRecentPosts } from "./getPostForSlug";

/**
 * These run against a real directory rather than a mocked fs, because the
 * bugs they cover were all in how the loader treats a directory listing —
 * mocking readdir would mock out the thing under test.
 */
let dir;

beforeEach(() => {
  dir = fs.mkdtempSync(join(os.tmpdir(), "aug-posts-"));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function writePost(filename, contents) {
  fs.writeFileSync(join(dir, filename), contents);
}

const POST = `---
title: Spring Plant Sale
author: Maggie
pubdate: 2026-09-01
---

We are opening for the season.
`;

describe("getAllPosts", () => {
  // Regression: the loader mapped every entry to `${slug}.md` and read it, so
  // a file without a .md extension threw ENOENT and failed the whole build.
  // Both open client branches add exactly this — a file saved with no
  // extension through the GitHub web UI.
  it("does not fail the build on a file that is not Markdown", () => {
    writePost("spring-plant-sale.md", POST);
    writePost("Hello world", "");
    writePost(".DS_Store", "");

    expect(() => getAllPosts(dir)).not.toThrow();
    expect(getAllPosts(dir).map((p) => p.slug)).toEqual(["spring-plant-sale"]);
  });

  // Regression: /posts/template shipped to production, so the blog index read
  // "Put Your Title Here (by Put your name here)".
  it("does not publish the authoring template", () => {
    writePost("template.md", POST);
    expect(getAllPosts(dir)).toEqual([]);
  });

  it("does not publish scratch drafts", () => {
    writePost("test-wip.md", POST);
    writePost("real.md", POST);
    expect(getAllPosts(dir).map((p) => p.slug)).toEqual(["real"]);
  });
});

describe("getPostForSlug", () => {
  it("reads frontmatter and body", () => {
    writePost("spring-plant-sale.md", POST);
    const post = getPostForSlug("spring-plant-sale", dir);

    expect(post.title).toBe("Spring Plant Sale");
    expect(post.author).toBe("Maggie");
    expect(post.pubdate).toBe("2026-09-01T00:00:00.000Z");
    expect(post.content).toContain("opening for the season");
  });

  // Regression: quoting the date made YAML hand back a string and
  // `pubdate.toJSON()` threw, failing the build.
  it("accepts a quoted date", () => {
    writePost(
      "quoted.md",
      `---\ntitle: T\nauthor: A\npubdate: "2026-09-01"\n---\n\nBody\n`
    );
    expect(getPostForSlug("quoted", dir).pubdate).toBe(
      "2026-09-01T00:00:00.000Z"
    );
  });

  // Regression: omitting the date threw "Cannot read properties of undefined".
  it("survives a post with no date at all", () => {
    writePost("undated.md", `---\ntitle: T\nauthor: A\n---\n\nBody\n`);
    expect(getPostForSlug("undated", dir).pubdate).toBeNull();
  });

  it("falls back to the slug when a title is missing", () => {
    writePost("no-title.md", `---\nauthor: A\n---\n\nBody\n`);
    expect(getPostForSlug("no-title", dir).title).toBe("no-title");
  });
});

describe("getRecentPosts", () => {
  it("returns the newest posts first, limited", () => {
    writePost("old.md", `---\ntitle: Old\npubdate: 2024-01-01\n---\n\nx\n`);
    writePost("new.md", `---\ntitle: New\npubdate: 2026-01-01\n---\n\nx\n`);
    writePost("mid.md", `---\ntitle: Mid\npubdate: 2025-01-01\n---\n\nx\n`);

    expect(getRecentPosts(2, dir).map((p) => p.slug)).toEqual(["new", "mid"]);
  });

  it("does not throw when a post is undated", () => {
    writePost("dated.md", `---\ntitle: D\npubdate: 2025-01-01\n---\n\nx\n`);
    writePost("undated.md", `---\ntitle: U\n---\n\nx\n`);

    expect(getRecentPosts(5, dir).map((p) => p.slug)).toEqual([
      "dated",
      "undated",
    ]);
  });
});
