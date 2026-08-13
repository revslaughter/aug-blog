// Runs the screenshot tests inside the pinned Playwright container, so
// baselines regenerated on a laptop match the ones CI compares against.
//
// This exists because `npm run test:visual:update` on a Mac quietly produces
// wrong baselines. Text rendering differs between macOS and the Linux image CI
// uses, and `--update-snapshots` rewrites *every* baseline that differs — not
// only the ones you meant to change. So a rebaseline of six pages on a Mac also
// silently rewrites pages you never touched, and CI goes red on all of them.
// Measured on this repo: /404 renders 1037 pixels different outside the image,
// on a page nothing had touched.
//
// Going through Docker makes the host irrelevant. Same image, same Chromium,
// same FreeType, same fontconfig as the `visual` job in ci.yml.
//
// The image tag is derived from the installed @playwright/test rather than
// written here, because it is already pinned in ci.yml and
// visual-baselines.yml, and a fourth hand-maintained copy is a fourth thing to
// forget. `util/playwrightImage.test.js` checks the two workflows agree with
// package.json.

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { playwrightImage } from "../util/playwrightImage.mjs";

const require = createRequire(import.meta.url);

/** Whatever is actually installed, not what package.json asks for. */
function installedPlaywrightVersion() {
  try {
    return require("@playwright/test/package.json").version;
  } catch {
    console.error(
      "@playwright/test is not installed. Run `npm ci` on the host first —\n" +
        "this script reads the version from it to pick the matching image."
    );
    process.exit(1);
  }
}

function requireDocker() {
  const probe = spawnSync("docker", ["info"], { stdio: "ignore" });
  if (probe.status === 0) return;
  console.error(
    "Docker is not available (the `docker info` probe failed).\n\n" +
      "Start Docker Desktop and try again. If you cannot run Docker, use\n" +
      "Actions -> Refresh screenshot baselines instead, which does the same\n" +
      "thing in CI. Do not fall back to `npm run test:visual:update` on the\n" +
      "host — see the comment at the top of this file for why."
  );
  process.exit(1);
}

// `update` regenerates baselines; anything else just compares.
const mode = process.argv[2] === "update" ? "update" : "check";
const passthrough = process.argv.slice(3);

const image = playwrightImage(installedPlaywrightVersion());
const script = mode === "update" ? "test:visual:update" : "test:visual";

// Host ownership: the container runs as root, so on Linux the regenerated PNGs
// come back root-owned. Handing the ids in and chowning on the way out is
// simpler than running the whole thing as a non-root user, which would need a
// writable HOME for npm. Docker Desktop already maps this on macOS, where the
// chown is a harmless no-op.
const ids =
  typeof process.getuid === "function"
    ? `${process.getuid()}:${process.getgid()}`
    : null;
const chown = ids
  ? ` ; chown -R ${ids} tests/visual/__screenshots__ test-results playwright-report 2>/dev/null || true`
  : "";

const inner = [
  "npm ci --no-audit --no-fund",
  `npx playwright test ${
    mode === "update" ? "--update-snapshots" : ""
  } ${passthrough.map((arg) => JSON.stringify(arg)).join(" ")}`.trim(),
].join(" && ");

const args = [
  "run",
  "--rm",
  "--init",
  // Chromium needs more shared memory than Docker's 64MB default or it crashes
  // partway through a run. This is Playwright's documented fix.
  "--ipc=host",
  "-v",
  `${process.cwd()}:/work`,
  // An anonymous volume over node_modules, so the Linux install inside the
  // container does not overwrite the host's. Without this a rebaseline leaves a
  // macOS checkout with Linux binaries and `npm run dev` stops working until
  // you re-run `npm ci`.
  "-v",
  "/work/node_modules",
  // Named, so it survives between runs and `npm ci` is not a cold download
  // every time.
  "-v",
  "aug-blog-visual-npm-cache:/root/.npm",
  "-w",
  "/work",
  // Take the same branch of playwright.config.mjs that CI takes: two workers,
  // no server reuse, and `forbidOnly` on so a stray `test.only` cannot quietly
  // rebaseline a subset. Fewer workers than a laptop could manage, which is the
  // point — this run is meant to match CI, not to be fast.
  "-e",
  "CI=1",
  image,
  "bash",
  "-lc",
  `set -o pipefail ; ${inner}${chown}`,
];

// Print the command without running it — the way to see what this does, and
// the reason the Docker probe comes after rather than before.
if (process.env.VISUAL_CONTAINER_PRINT) {
  console.log(["docker", ...args].join(" \\\n  "));
  process.exit(0);
}

requireDocker();

console.log(
  `Running \`npm run ${script}\` in ${image}\n` +
    (mode === "update"
      ? "Regenerating baselines. Expect only the pages you changed in `git status`.\n"
      : "")
);

const run = spawnSync("docker", args, { stdio: "inherit" });
process.exit(run.status ?? 1);
