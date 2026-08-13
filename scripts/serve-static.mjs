/**
 * Minimal static file server for the `out/` directory produced by
 * `next build` (the site is `output: "export"`, so there is no Next server
 * to run in production).
 *
 * Netlify serves the export with "clean URLs" — `/about` resolves to
 * `out/about.html`. Playwright's visual tests need the same behaviour so the
 * screenshots match what ships, hence this ~100 line server rather than a
 * dependency. Not hardened for anything but localhost test traffic.
 *
 * Usage: node scripts/serve-static.mjs [--root out] [--port 4321]
 */
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

function readOption(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const root = path.resolve(process.cwd(), readOption("--root", "out"));
const port = Number(readOption("--port", process.env.PORT || "4321"));

/**
 * Resolve a request path to a file on disk, trying the Netlify clean-URL
 * candidates in the same order: exact file, `<path>.html`, `<path>/index.html`.
 *
 * @param {string} urlPath
 * @returns {Promise<string|null>} absolute file path, or null if nothing matched
 */
async function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const requested = path.resolve(root, `.${path.posix.normalize(decoded)}`);

  // Refuse anything that escaped the root via `..` segments.
  if (requested !== root && !requested.startsWith(root + path.sep)) return null;

  const candidates =
    decoded.endsWith("/")
      ? [path.join(requested, "index.html")]
      : [requested, `${requested}.html`, path.join(requested, "index.html")];

  for (const candidate of candidates) {
    try {
      const stats = await stat(candidate);
      if (stats.isFile()) return candidate;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

function send(res, status, filePath) {
  res.writeHead(status, {
    "content-type": MIME_TYPES[path.extname(filePath)] ?? "application/octet-stream",
    // Screenshot runs rebuild the site between passes; never let the browser
    // reuse a previous build's assets.
    "cache-control": "no-store",
  });
  createReadStream(filePath).pipe(res);
}

const server = createServer(async (req, res) => {
  const filePath = await resolveFile(req.url || "/");

  if (filePath) {
    send(res, 200, filePath);
    return;
  }

  const notFoundPage = await resolveFile("/404.html");
  if (notFoundPage) {
    send(res, 404, notFoundPage);
    return;
  }

  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}`);
});
