import {
  listContentDir,
  contentDirsFromEnv,
  publishableSlugs,
  includeDraftContent,
  isDraftSlug,
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

  it("excludes drafts by default", () => {
    expect(
      publishableSlugs([
        "template.md",
        "test.md",
        "test-draft.md",
        "real-post.md",
      ])
    ).toEqual(["real-post"]);
  });

  // `next dev` opts in, so a scratch draft is visible while you write it.
  it("includes drafts when asked", () => {
    expect(
      publishableSlugs(["template.md", "test.md", "real-post.md"], {
        includeDrafts: true,
      })
    ).toEqual(["real-post", "template", "test"]);
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

describe("contentDirsFromEnv", () => {
  it("reads the repo's own content directories by default", () => {
    expect(contentDirsFromEnv({}, "/repo")).toEqual({
      postsDir: "/repo/_posts",
      recipesDir: "/repo/_recipes",
      navDir: "/repo/_nav",
    });
  });

  // The screenshot tests build against fixture content so the blog index
  // baseline does not move every time the client publishes a post — and, for
  // _nav/, so that editable nav copy cannot move every baseline at once.
  it("redirects all three directories at a fixture", () => {
    expect(
      contentDirsFromEnv(
        { CONTENT_FIXTURE_DIR: "tests/visual/fixtures/content" },
        "/repo"
      )
    ).toEqual({
      postsDir: "/repo/tests/visual/fixtures/content/_posts",
      recipesDir: "/repo/tests/visual/fixtures/content/_recipes",
      navDir: "/repo/tests/visual/fixtures/content/_nav",
    });
  });

  it("accepts an absolute fixture path", () => {
    expect(
      contentDirsFromEnv({ CONTENT_FIXTURE_DIR: "/tmp/fx" }, "/repo")
    ).toEqual({
      postsDir: "/tmp/fx/_posts",
      recipesDir: "/tmp/fx/_recipes",
      navDir: "/tmp/fx/_nav",
    });
  });

  // Netlify sets empty strings for unset build variables; that must not be
  // read as "there is a fixture directory at the repo root".
  it("ignores an empty value", () => {
    expect(contentDirsFromEnv({ CONTENT_FIXTURE_DIR: "" }, "/repo")).toEqual({
      postsDir: "/repo/_posts",
      recipesDir: "/repo/_recipes",
      navDir: "/repo/_nav",
    });
  });
});

describe("listContentDir", () => {
  const fakeFs = (impl) => ({ readdirSync: impl });

  it("lists the directory", () => {
    const fs = fakeFs(() => ["a.md", "b.md"]);
    expect(listContentDir("_posts", fs)).toEqual(["a.md", "b.md"]);
  });

  // _posts/ and _recipes/ hold only a .gitkeep now that the templates are
  // gone, and git does not track empty directories — losing that file makes
  // the directory vanish on a fresh clone. An empty content directory is a
  // normal state for a site with nothing published, not a build failure.
  it("treats a missing directory as empty", () => {
    const fs = fakeFs(() => {
      const err = new Error("ENOENT");
      err.code = "ENOENT";
      throw err;
    });
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(listContentDir("_posts", fs)).toEqual([]);
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  // A directory that exists but cannot be read is a real problem, not an
  // empty blog; don't paper over it.
  it("rethrows anything that is not ENOENT", () => {
    const fs = fakeFs(() => {
      const err = new Error("EACCES");
      err.code = "EACCES";
      throw err;
    });
    expect(() => listContentDir("_posts", fs)).toThrow("EACCES");
  });
});

describe("isDraftSlug", () => {
  it.each(["template", "test", "test-wip"])("treats %s as a draft", (slug) => {
    expect(isDraftSlug(slug)).toBe(true);
  });

  it.each(["spring-plant-sale", "testimonials", "template-for-beds"])(
    "treats %s as publishable",
    (slug) => {
      // "testimonials" and "template-for-beds" are the near-misses worth
      // pinning: a substring match rather than a prefix/exact match would
      // silently unpublish a real post.
      expect(isDraftSlug(slug)).toBe(false);
    }
  );
});

describe("includeDraftContent", () => {
  // Fails closed. An environment that says nothing gets the production answer,
  // so a misconfigured deploy under-publishes instead of leaking a template.
  it.each([
    ["nothing is set", {}],
    ["a production build", { NODE_ENV: "production" }],
    ["a test run", { NODE_ENV: "test" }],
    ["the flag is empty", { INCLUDE_DRAFT_CONTENT: "" }],
    ["the flag is anything else", { INCLUDE_DRAFT_CONTENT: "yes please" }],
  ])("excludes drafts when %s", (_label, env) => {
    expect(includeDraftContent(env)).toBe(false);
  });

  it("includes drafts under next dev", () => {
    expect(includeDraftContent({ NODE_ENV: "development" })).toBe(true);
  });

  it.each(["true", "1"])("includes drafts when the flag is %s", (flag) => {
    expect(includeDraftContent({ INCLUDE_DRAFT_CONTENT: flag })).toBe(true);
  });

  // An explicit opt-in beats a production build, which is how you preview a
  // scratch draft against a real build: INCLUDE_DRAFT_CONTENT=true npm run build
  it("lets the flag override a production build", () => {
    expect(
      includeDraftContent({
        NODE_ENV: "production",
        INCLUDE_DRAFT_CONTENT: "true",
      })
    ).toBe(true);
  });

  // Netlify pins this to "false" in netlify.toml.
  it("lets the flag override next dev", () => {
    expect(
      includeDraftContent({
        NODE_ENV: "development",
        INCLUDE_DRAFT_CONTENT: "false",
      })
    ).toBe(false);
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
  // Matching toDateString's format exactly is what keeps this fix invisible to
  // the screenshot baselines. If this expectation is ever updated, the
  // post-detail baselines have to be regenerated in the same change.
  it("matches toDateString's format", () => {
    expect(formatDisplayDate("2022-05-05T00:00:00.000Z")).toBe(
      "Thu May 05 2022"
    );
  });

  // Regression: the old formatter rendered in the running machine's timezone,
  // so a post dated the 1st showed as the previous day on any build agent west
  // of UTC — the site's dates depended on who ran the build.
  it("renders the same date west of UTC", () => {
    const original = process.env.TZ;
    try {
      process.env.TZ = "America/Chicago";
      expect(formatDisplayDate("2026-09-01T00:00:00.000Z")).toBe(
        "Tue Sep 01 2026"
      );
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });

  it("zero-pads single-digit days, as toDateString does", () => {
    expect(formatDisplayDate("2026-01-05T00:00:00.000Z")).toBe(
      "Mon Jan 05 2026"
    );
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
