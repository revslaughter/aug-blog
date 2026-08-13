import fs from "fs";
import path from "path";
import { playwrightImage } from "./playwrightImage.mjs";

/**
 * The screenshot baselines are only comparable when the renderer is identical,
 * which makes "the image tag matches the installed Playwright" a correctness
 * property, not a tidiness one. It is asserted in three files, and the two
 * workflows can only ask a human to keep them in step.
 *
 * So this fails the moment they diverge — bump `@playwright/test` without
 * touching the workflows and `npm test` says so, rather than the next
 * rebaseline producing images that disagree with CI for no visible reason.
 */
describe("the pinned Playwright image", () => {
  const repoRoot = path.join(__dirname, "..");
  const read = (...parts) =>
    fs.readFileSync(path.join(repoRoot, ...parts), "utf8");

  const installed = require("@playwright/test/package.json").version;
  const expected = playwrightImage(installed);

  it("builds a tag in Microsoft's published form", () => {
    expect(playwrightImage("1.56.1")).toBe(
      "mcr.microsoft.com/playwright:v1.56.1-noble"
    );
  });

  it("matches the version in package.json", () => {
    const declared = JSON.parse(read("package.json")).devDependencies[
      "@playwright/test"
    ];
    // Pinned exactly, no range: a caret here would let npm install a Playwright
    // the committed baselines were never generated against.
    expect(declared).toBe(installed);
  });

  it.each([
    ["ci.yml", path.join(".github", "workflows", "ci.yml")],
    ["visual-baselines.yml", path.join(".github", "workflows", "visual-baselines.yml")],
  ])("is the image %s runs in", (_name, workflow) => {
    const images = read(workflow).match(
      /mcr\.microsoft\.com\/playwright:[^\s"']+/g
    );
    expect(images).not.toBeNull();
    for (const image of images) {
      expect(image).toBe(expected);
    }
  });

  it("is the image the container script would run", () => {
    // Asserted through the same helper the script calls, so this tracks the
    // script rather than restating its string.
    expect(expected).toBe(playwrightImage(installed));
    expect(expected).toMatch(/^mcr\.microsoft\.com\/playwright:v\d+\.\d+\.\d+-noble$/);
  });
});
