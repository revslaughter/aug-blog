import {
  publishableSlugs,
  toIsoDate,
  formatDisplayDate,
  byNewestFirst,
} from "./contentFiles.mjs";

describe("publishableSlugs", () => {
  // Regression: getAllPosts used to map every directory entry to `${slug}.md`
  // and read it, so a non-Markdown file failed the build with ENOENT. This is
  // reachable by anyone authoring through the GitHub web UI — the two open
  // client branches both add a file with no extension.
  it("ignores files that are not Markdown", () => {
    expect(
      publishableSlugs([
        "spring-sale.md",
        ".DS_Store",
        "photo.jpg",
        "Hello world",
        "About AUG",
      ])
    ).toEqual(["spring-sale"]);
  });

  it("excludes the authoring template", () => {
    expect(publishableSlugs(["template.md", "real-post.md"])).toEqual([
      "real-post",
    ]);
  });

  it("excludes scratch drafts", () => {
    expect(publishableSlugs(["test-draft.md", "real-post.md"])).toEqual([
      "real-post",
    ]);
  });

  it("sorts so the build is reproducible regardless of readdir order", () => {
    expect(publishableSlugs(["b.md", "a.md", "c.md"])).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("returns nothing for a directory holding only a template", () => {
    expect(publishableSlugs(["template.md"])).toEqual([]);
  });
});

describe("toIsoDate", () => {
  // YAML coerces a bare ISO date to a Date, so this is the only shape the
  // old `pubdate.toJSON()` handled.
  it("accepts a Date, as YAML produces for a bare ISO date", () => {
    expect(toIsoDate(new Date("2026-09-01T00:00:00Z"))).toBe(
      "2026-09-01T00:00:00.000Z"
    );
  });

  // Regression: quoting the date in frontmatter made YAML hand back a string,
  // and `.toJSON()` threw "is not a function", failing the build.
  it("accepts a quoted ISO string", () => {
    expect(toIsoDate("2026-09-01")).toBe("2026-09-01T00:00:00.000Z");
  });

  it("accepts a date typed the way a person writes one", () => {
    expect(toIsoDate("June 25, 2026")).toBe("2026-06-25T00:00:00.000Z");
  });

  // Regression: omitting pubdate threw "Cannot read properties of undefined".
  it.each([
    ["undefined", undefined],
    ["null", null],
    ["an empty string", ""],
    ["unparseable text", "sometime next spring"],
  ])("returns null rather than throwing for %s", (_label, value) => {
    expect(toIsoDate(value)).toBeNull();
  });
});

describe("formatDisplayDate", () => {
  // Regression: the old formatter rendered in the running machine's timezone,
  // so a post dated the 1st showed as the previous day on any build agent west
  // of UTC. Pinning to UTC makes the output independent of who builds.
  it("renders in UTC regardless of the machine's timezone", () => {
    const original = process.env.TZ;
    try {
      process.env.TZ = "America/Chicago";
      expect(formatDisplayDate("2026-09-01T00:00:00.000Z")).toBe(
        "September 1, 2026"
      );
    } finally {
      process.env.TZ = original;
    }
  });

  it("returns null for a missing date so callers can omit the byline", () => {
    expect(formatDisplayDate(null)).toBeNull();
  });
});

describe("byNewestFirst", () => {
  it("orders most recent first", () => {
    const posts = [
      { slug: "old", pubdate: "2024-01-01T00:00:00.000Z" },
      { slug: "new", pubdate: "2026-01-01T00:00:00.000Z" },
      { slug: "middle", pubdate: "2025-01-01T00:00:00.000Z" },
    ];
    expect([...posts].sort(byNewestFirst).map((p) => p.slug)).toEqual([
      "new",
      "middle",
      "old",
    ]);
  });

  it("puts undated entries last instead of scattering them", () => {
    const posts = [
      { slug: "undated", pubdate: null },
      { slug: "dated", pubdate: "2025-01-01T00:00:00.000Z" },
    ];
    expect([...posts].sort(byNewestFirst).map((p) => p.slug)).toEqual([
      "dated",
      "undated",
    ]);
  });
});
