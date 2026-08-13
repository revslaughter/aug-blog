import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  normalizeNavPage,
  getAllNavPages,
  navLinks,
  assertRoutable,
  pageRoutesFrom,
  RESERVED_SLUGS,
} from "./navPages.mjs";

/**
 * A stand-in for `fs` holding Markdown in memory, so the ordering and
 * defaulting rules can be exercised without a fixture directory on disk.
 *
 * @param {Record<string, string>} files Filename -> file contents
 */
function fakeFs(files) {
  return {
    readdirSync: () => Object.keys(files),
    readFileSync: (filePath) => {
      const name = path.basename(filePath);
      if (!(name in files)) {
        const err = new Error(`ENOENT: ${name}`);
        err.code = "ENOENT";
        throw err;
      }
      return files[name];
    },
  };
}

/** @param {Record<string, unknown>} frontmatter */
function md(frontmatter, body = "") {
  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  return `---\n${yaml}\n---\n${body}`;
}

describe("normalizeNavPage", () => {
  it("falls back to the slug when the title is missing", () => {
    // A page with no title still has to render — the filename is the one
    // thing that always exists.
    expect(normalizeNavPage("plant-sale", {}, "").title).toBe("plant-sale");
  });

  it("uses the title as the nav label unless one is given", () => {
    expect(normalizeNavPage("x", { title: "Compost Program" }, "").navLabel).toBe(
      "Compost Program"
    );
    expect(
      normalizeNavPage("x", { title: "Compost Program", nav_label: "Compost" }, "")
        .navLabel
    ).toBe("Compost");
  });

  it("keeps a page out of the nav unless in_nav is explicitly true", () => {
    expect(normalizeNavPage("x", {}, "").inNav).toBe(false);
    expect(normalizeNavPage("x", { in_nav: false }, "").inNav).toBe(false);
    // A stray string must not read as truthy — the CMS writes a real boolean,
    // but a hand-edited file can say anything.
    expect(normalizeNavPage("x", { in_nav: "no" }, "").inNav).toBe(false);
    expect(normalizeNavPage("x", { in_nav: true }, "").inNav).toBe(true);
  });

  it("drops schedule rows with no label, and tolerates a non-list", () => {
    const page = normalizeNavPage(
      "x",
      { schedule: [{ label: "Season", value: "March – May" }, { value: "orphan" }] },
      ""
    );
    expect(page.schedule).toEqual([{ label: "Season", value: "March – May" }]);
    expect(normalizeNavPage("x", { schedule: "Saturdays" }, "").schedule).toEqual(
      []
    );
  });

  it("defaults a row with a label but no value to an empty string", () => {
    // Half-filled rows are what a form produces mid-edit; rendering `undefined`
    // into the <dd> is worse than rendering nothing.
    expect(
      normalizeNavPage("x", { schedule: [{ label: "When" }] }, "").schedule
    ).toEqual([{ label: "When", value: "" }]);
  });

  it("treats the optional blocks as switches, not content", () => {
    const off = normalizeNavPage("x", {}, "");
    expect(off.storeLink).toBe(false);
    expect(off.contactDetails).toBe(false);
    const on = normalizeNavPage("x", { store_link: true, contact_details: true }, "");
    expect(on.storeLink).toBe(true);
    expect(on.contactDetails).toBe(true);
  });
});

describe("getAllNavPages", () => {
  it("sorts by order, and by title when two pages share one", () => {
    const pages = getAllNavPages(
      fakeFs({
        "compost.md": md({ title: "Compost", order: 60 }),
        "plant-sale.md": md({ title: "Plant Sale", order: 10 }),
        "beta.md": md({ title: "Beta", order: 10 }),
      }),
      "_nav",
      { includeDrafts: false }
    );
    expect(pages.map((page) => page.slug)).toEqual([
      "beta",
      "plant-sale",
      "compost",
    ]);
  });

  it("sorts pages with no order after the ones that have it", () => {
    const pages = getAllNavPages(
      fakeFs({
        "unordered.md": md({ title: "Unordered" }),
        "first.md": md({ title: "First", order: 10 }),
      }),
      "_nav",
      { includeDrafts: false }
    );
    expect(pages.map((page) => page.slug)).toEqual(["first", "unordered"]);
  });

  it("ignores files that are not Markdown", () => {
    const pages = getAllNavPages(
      fakeFs({ "about.md": md({ title: "About" }), ".DS_Store": "" }),
      "_nav",
      { includeDrafts: false }
    );
    expect(pages.map((page) => page.slug)).toEqual(["about"]);
  });

  it("treats a missing _nav directory as empty rather than throwing", () => {
    const missing = {
      readdirSync: () => {
        const err = new Error("ENOENT");
        err.code = "ENOENT";
        throw err;
      },
      readFileSync: () => "",
    };
    expect(getAllNavPages(missing, "_nav", { includeDrafts: false })).toEqual([]);
  });
});

describe("navLinks", () => {
  it("puts Home first and includes only pages marked in_nav", () => {
    const pages = getAllNavPages(
      fakeFs({
        "about.md": md({ title: "About", order: 70, in_nav: true }),
        "compost.md": md({ title: "Compost Program", nav_label: "Compost", order: 60, in_nav: true }),
        "draft-section.md": md({ title: "Not Ready", order: 5 }),
      }),
      "_nav",
      { includeDrafts: false }
    );
    expect(navLinks(pages)).toEqual([
      { title: "Home", href: "/" },
      { title: "Compost", href: "/compost" },
      { title: "About", href: "/about" },
    ]);
  });

  it("keeps Home even when nothing is in the nav", () => {
    // A nav with no route back to the homepage is a broken site, so Home is
    // not something `in_nav` can switch off.
    expect(navLinks([])).toEqual([{ title: "Home", href: "/" }]);
  });
});

describe("assertRoutable", () => {
  it("accepts slugs that nothing else claims", () => {
    expect(() => assertRoutable(["about", "compost"], ["index"])).not.toThrow();
  });

  it.each([...RESERVED_SLUGS])("rejects the reserved slug %s", (slug) => {
    expect(() => assertRoutable([slug])).toThrow(/already served by something else/);
  });

  it("rejects a slug shadowed by a real file under pages/", () => {
    // The failure this exists to prevent: Next serves pages/gallery.js and the
    // Markdown never renders, with no error anywhere.
    expect(() => assertRoutable(["gallery"], ["gallery"])).toThrow(
      /pages\/\[slug\]\.js/
    );
  });

  it("names every colliding file, not just the first", () => {
    const thrown = (() => {
      try {
        assertRoutable(["posts", "recipes"]);
      } catch (err) {
        return err.message;
      }
    })();
    expect(thrown).toContain('"posts.md"');
    expect(thrown).toContain('"recipes.md"');
  });
});

describe("pageRoutesFrom", () => {
  it("lists top-level routes, skipping the dynamic route and Next internals", () => {
    const routes = pageRoutesFrom(
      "pages",
      fakeFs({
        "[slug].js": "",
        "_app.js": "",
        "index.js": "",
        posts: "",
      })
    );
    expect(routes.sort()).toEqual(["index", "posts"]);
  });
});

describe("the repository's own _nav/", () => {
  const repoRoot = path.join(__dirname, "..");
  const pages = getAllNavPages(fs, path.join(repoRoot, "_nav"), {
    includeDrafts: false,
  });

  it("has section pages", () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  it("can route every one of them", () => {
    // The guard that matters in CI: this is the check prebuild runs, asserted
    // here too so a bad slug fails `npm test` and not only the build.
    expect(() =>
      assertRoutable(
        pages.map((page) => page.slug),
        pageRoutesFrom(path.join(repoRoot, "pages"), fs)
      )
    ).not.toThrow();
  });

  it("gives every page a title and a description", () => {
    // Both reach the browser — the title as the <h1> and the tab, the
    // description as the meta tag search results quote.
    for (const page of pages) {
      expect(page.title).not.toBe(page.slug);
      expect(page.description).toBeTruthy();
    }
  });

  it("gives every page in the nav a distinct order", () => {
    const orders = pages.map((page) => page.order);
    expect(new Set(orders).size).toBe(orders.length);
  });
});

/**
 * The CMS form and the Markdown are two descriptions of the same thing, kept in
 * different files and different languages. Nothing makes them agree at runtime:
 * a field renamed in the loader but not in config.yml leaves the client filling
 * in a box that no longer does anything, and the reverse leaves a setting they
 * cannot reach at all. Neither shows up as an error anywhere.
 *
 * `matter.engines.yaml` rather than a direct js-yaml import — gray-matter is a
 * declared dependency and its YAML engine is public API; js-yaml only happens
 * to be underneath it.
 */
describe("the CMS form for _nav/", () => {
  const repoRoot = path.join(__dirname, "..");
  const config = matter.engines.yaml.parse(
    fs.readFileSync(path.join(repoRoot, "public", "admin", "config.yml"), "utf8")
  );
  const collection = config.collections.find((entry) => entry.name === "nav");
  const fieldNames = collection.fields.map((field) => field.name);
  // `body` is the document body, not frontmatter, so it never appears as a key.
  const frontmatterFields = fieldNames.filter((name) => name !== "body");
  const requiredFields = collection.fields
    .filter((field) => field.required === true)
    .map((field) => field.name);

  const navFiles = fs
    .readdirSync(path.join(repoRoot, "_nav"))
    .filter((name) => name.endsWith(".md"))
    .map((name) => ({
      name,
      data: matter(fs.readFileSync(path.join(repoRoot, "_nav", name), "utf8"))
        .data,
    }));

  it("points at the directory the loader reads", () => {
    expect(collection.folder).toBe("_nav");
  });

  it("cannot create or delete pages, because slugs are permanent URLs", () => {
    expect(collection.create).toBe(false);
    expect(collection.delete).toBe(false);
  });

  it("offers a field for everything the loader understands", () => {
    expect(frontmatterFields.sort()).toEqual(
      [
        "contact_details",
        "description",
        "in_nav",
        "intro",
        "nav_label",
        "note",
        "order",
        "schedule",
        "store_link",
        "title",
      ].sort()
    );
  });

  it.each(["title", "order", "description"])(
    "marks %s required, so a page cannot be saved without it",
    (field) => {
      expect(requiredFields).toContain(field);
    }
  );

  describe.each(navFiles.map(({ name, data }) => [name, data]))(
    "%s",
    (_name, data) => {
      it("uses no frontmatter key the form cannot set", () => {
        expect(Object.keys(data).sort()).toEqual(
          Object.keys(data)
            .filter((key) => frontmatterFields.includes(key))
            .sort()
        );
      });

      it("fills in every field the form requires", () => {
        for (const field of requiredFields) {
          expect(data[field]).toBeDefined();
        }
      });
    }
  );
});
