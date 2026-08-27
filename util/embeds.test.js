import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { EMBED_PROVIDERS, resolveEmbed, normalizeEmbeds } from "./embeds";

/**
 * These are the tests that matter most in this repository.
 *
 * Everything else here degrades when it is wrong — a bad date renders no date,
 * a bad slug fails the build with an explanation. This one decides what goes
 * inside an iframe on a page the client's readers open, from a string that
 * arrives out of a text file, so a rule that is nearly right is a rule that
 * lets someone else's page render inside our layout.
 *
 * The hostile cases below are not hypothetical shapes: host suffixes that look
 * like a match, credentials that move the real host somewhere else,
 * protocol-relative URLs that skip the scheme check, `javascript:`, and quotes
 * and angle brackets in the part of the link we keep.
 */

const VIDEO_ID = "dQw4w9WgXcQ";
const EMBEDDED = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`;

/** @param {string} url */
const video = (url) => resolveEmbed({ provider: "youtube", url });

/** @param {string} url */
const map = (url) => resolveEmbed({ provider: "google_maps", url });

describe("YouTube links", () => {
  it.each([
    ["a watch link", `https://www.youtube.com/watch?v=${VIDEO_ID}`],
    ["no www", `https://youtube.com/watch?v=${VIDEO_ID}`],
    ["the mobile site", `https://m.youtube.com/watch?v=${VIDEO_ID}`],
    ["a share link", `https://youtu.be/${VIDEO_ID}`],
    ["a share link with a timestamp", `https://youtu.be/${VIDEO_ID}?t=42`],
    ["an embed link", `https://www.youtube.com/embed/${VIDEO_ID}`],
    ["the nocookie host", `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`],
    ["a short", `https://www.youtube.com/shorts/${VIDEO_ID}`],
    ["a stream", `https://www.youtube.com/live/${VIDEO_ID}`],
    ["the old /v/ shape", `https://www.youtube.com/v/${VIDEO_ID}`],
    ["a bare video id", VIDEO_ID],
    ["a link with spaces round it", `  https://youtu.be/${VIDEO_ID}  `],
  ])("accepts %s", (_name, url) => {
    expect(video(url).src).toBe(EMBEDDED);
  });

  it("accepts an http link but never emits one", () => {
    // An author copying an old link should not get a blank space and no
    // explanation; the URL we build is ours, and it is https.
    expect(video(`http://www.youtube.com/watch?v=${VIDEO_ID}`).src).toBe(
      EMBEDDED
    );
  });

  it("keeps the video id and discards everything else on the link", () => {
    // Playlists, timestamps, and whatever tracking parameter is fashionable
    // this year. "Keep only the id" stays correct as that list grows.
    expect(
      video(
        `https://www.youtube.com/watch?v=${VIDEO_ID}&list=PLabcdef&index=3&t=90s&si=xyz`
      ).src
    ).toBe(EMBEDDED);
  });

  it.each([
    ["a javascript: URL", "javascript:alert(1)"],
    ["a javascript: URL dressed as a link", "javascript:void('youtu.be/x')"],
    ["a data: URL", "data:text/html,<script>alert(1)</script>"],
    ["a protocol-relative URL", `//www.youtube.com/watch?v=${VIDEO_ID}`],
    ["a lookalike host", `https://youtube.com.evil.com/watch?v=${VIDEO_ID}`],
    ["a lookalike subdomain", `https://youtube.com.evil.com/embed/${VIDEO_ID}`],
    ["a host that merely ends the same", `https://notyoutube.com/watch?v=${VIDEO_ID}`],
    ["the real host in the path", `https://evil.com/www.youtube.com/watch?v=${VIDEO_ID}`],
    // Reads left-to-right as youtube.com; the host is evil.com.
    ["the real host as a username", `https://www.youtube.com@evil.com/watch?v=${VIDEO_ID}`],
    // The reverse: the host really is YouTube, but the link carries
    // credentials, which have no business in a link pasted into a form.
    ["credentials on the real host", `https://evil.com@www.youtube.com/watch?v=${VIDEO_ID}`],
    // Cyrillic "о" in place of the ASCII one.
    ["a unicode lookalike host", `https://www.yоutube.com/watch?v=${VIDEO_ID}`],
    ["an id with quotes and a tag in it", 'https://www.youtube.com/watch?v="><script>alert(1)</script>'],
    ["an id with a slash in it", "https://www.youtube.com/watch?v=abc/../../xyz"],
    ["an id that is too short", "https://www.youtube.com/watch?v=abc"],
    ["an id that is too long", "https://www.youtube.com/watch?v=dQw4w9WgXcQextra"],
    ["a watch link with no id", "https://www.youtube.com/watch"],
    ["the front page", "https://www.youtube.com/"],
    ["a search", "https://www.youtube.com/results?search_query=compost"],
    ["a channel", "https://www.youtube.com/@antiochurbangrowers"],
    ["a bare word that is not an id", "compost"],
    ["a sentence", "the one about the compost pile"],
    ["an empty string", ""],
    ["only whitespace", "   "],
  ])("rejects %s", (_name, url) => {
    expect(video(url)).toBeNull();
  });

  it("rejects a Google Maps link chosen as a video", () => {
    // The provider is what the author picked in the form; there is no falling
    // back to whichever rule happens to match.
    expect(video("https://www.google.com/maps/@39.0997,-94.5786,15z")).toBeNull();
  });
});

describe("Google Maps links", () => {
  it("passes through the token from Google's own embed dialog", () => {
    const pb = "!1m18!1m12!1m3!1d3096.9!2d-94.5786!3d39.0997!2m3!1f0!2f0!3f0";
    expect(map(`https://www.google.com/maps/embed?pb=${pb}`).src).toBe(
      `https://www.google.com/maps/embed?pb=${pb}`
    );
  });

  it.each([
    [
      "a place link from the address bar",
      "https://www.google.com/maps/place/Antioch+Urban+Growers/@39.0997,-94.5786,17z/data=!3m1!4b1",
      "!1m3!2m1!1s39.0997,-94.5786!6i17",
    ],
    [
      "a plain coordinate link",
      "https://www.google.com/maps/@39.0997,-94.5786,12z",
      "!1m3!2m1!1s39.0997,-94.5786!6i12",
    ],
    [
      "the older q= shape",
      "https://maps.google.com/maps?q=39.0997,-94.5786&z=18",
      "!1m3!2m1!1s39.0997,-94.5786!6i18",
    ],
    [
      "the older ll= shape",
      "https://maps.google.com/?ll=39.0997,-94.5786&z=9",
      "!1m3!2m1!1s39.0997,-94.5786!6i9",
    ],
    [
      "coordinates south and west of zero",
      "https://www.google.com/maps/@-33.8688,-151.2093,14z",
      "!1m3!2m1!1s-33.8688,-151.2093!6i14",
    ],
  ])("builds an embed from %s", (_name, url, pb) => {
    expect(map(url).src).toBe(`https://www.google.com/maps/embed?pb=${pb}`);
  });

  it.each([
    ["no zoom at all", "https://www.google.com/maps/place/Somewhere/@39.0997,-94.5786"],
    ["a zoom past what Google accepts", "https://www.google.com/maps/@39.0997,-94.5786,99z"],
    ["a zoom that is not a number", "https://maps.google.com/maps?q=39.0997,-94.5786&z=close"],
  ])("falls back to street-level zoom given %s", (_name, url) => {
    // A zoom nobody can read is not worth losing the whole map over — the
    // place is still the place.
    expect(map(url).src).toBe(
      "https://www.google.com/maps/embed?pb=!1m3!2m1!1s39.0997,-94.5786!6i15"
    );
  });

  it.each([
    ["a share shortlink", "https://maps.app.goo.gl/AbCdEfGh12345"],
    ["the older shortlink", "https://goo.gl/maps/AbCdEfGh12345"],
    ["a lookalike host", "https://www.google.com.evil.com/maps/@39.0997,-94.5786,15z"],
    ["a lookalike path", "https://evil.com/www.google.com/maps/@39.0997,-94.5786,15z"],
    ["a protocol-relative URL", "//www.google.com/maps/@39.0997,-94.5786,15z"],
    ["a javascript: URL", "javascript:alert('maps')"],
    ["credentials on the real host", "https://evil.com@www.google.com/maps/@39.0997,-94.5786,15z"],
    ["something else on google.com", "https://www.google.com/search?q=39.0997,-94.5786"],
    ["a place with no coordinates in the link", "https://www.google.com/maps/place/Antioch+Urban+Growers"],
    ["an impossible latitude", "https://www.google.com/maps/@100.5,-94.5786,15z"],
    ["an impossible longitude", "https://www.google.com/maps/@39.0997,-200.5,15z"],
    ["an embed link with no pb", "https://www.google.com/maps/embed"],
    ["an empty string", ""],
  ])("rejects %s", (_name, url) => {
    expect(map(url)).toBeNull();
  });

  it.each([
    ['a quote and a tag', 'https://www.google.com/maps/embed?pb=!1m18"><script>alert(1)</script>'],
    ["an angle bracket", "https://www.google.com/maps/embed?pb=!1m18<img>"],
    ["a backslash", "https://www.google.com/maps/embed?pb=!1m18\\evil"],
  ])("rejects a pb token containing %s", (_name, url) => {
    expect(map(url)).toBeNull();
  });

  it("rejects a YouTube link chosen as a map", () => {
    expect(map(`https://www.youtube.com/watch?v=${VIDEO_ID}`)).toBeNull();
  });
});

describe("what the renderer is handed", () => {
  it.each([
    ["youtube", `https://www.youtube.com/watch?v=${VIDEO_ID}`],
    ["google_maps", "https://www.google.com/maps/@39.0997,-94.5786,15z"],
  ])("only ever produces a %s URL on that provider's embed prefix", (provider, url) => {
    const { src } = resolveEmbed({ provider, url });
    expect(src.startsWith(EMBED_PROVIDERS[provider].embedPrefix)).toBe(true);
  });

  it("hands over an https URL and nothing else that could be markup", () => {
    const { src } = video(`https://www.youtube.com/watch?v=${VIDEO_ID}`);
    expect(src.startsWith("https://")).toBe(true);
    expect(src).not.toMatch(/["'<>\s\\]/);
  });
});

describe("resolveEmbed", () => {
  it.each(["vimeo", "facebook", "", "YouTube", "youtube "])(
    "rejects the unknown provider %p",
    (provider) => {
      expect(
        resolveEmbed({ provider, url: `https://youtu.be/${VIDEO_ID}` })
      ).toBeNull();
    }
  );

  it.each(["constructor", "__proto__", "toString", "hasOwnProperty"])(
    "does not find a provider called %p on Object's prototype",
    (provider) => {
      expect(
        resolveEmbed({ provider, url: `https://youtu.be/${VIDEO_ID}` })
      ).toBeNull();
    }
  );

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a string", `https://youtu.be/${VIDEO_ID}`],
    ["a number", 7],
    ["an empty row", {}],
    ["a row with no link", { provider: "youtube" }],
    ["a link that is not a string", { provider: "youtube", url: 12 }],
    ["a link that is an object", { provider: "youtube", url: { href: "x" } }],
  ])("rejects %s", (_name, entry) => {
    expect(resolveEmbed(entry)).toBeNull();
  });

  it("keeps the caption as the author wrote it", () => {
    // Captions are rendered as text by React, never as markup, so they need no
    // scrubbing here — and scrubbing them would mangle an apostrophe.
    const embed = resolveEmbed({
      provider: "youtube",
      url: `https://youtu.be/${VIDEO_ID}`,
      caption: "  Maggie's tour of the hoop houses <spring 2026>  ",
    });
    expect(embed.caption).toBe("Maggie's tour of the hoop houses <spring 2026>");
  });

  it.each([
    ["no caption", undefined],
    ["an empty caption", ""],
    ["a caption of spaces", "   "],
    ["a caption that is not text", 42],
  ])("stores no caption for %s", (_name, caption) => {
    expect(
      resolveEmbed({
        provider: "youtube",
        url: `https://youtu.be/${VIDEO_ID}`,
        caption,
      }).caption
    ).toBeNull();
  });
});

describe("normalizeEmbeds", () => {
  it.each([
    ["nothing", undefined],
    ["null", null],
    ["a string", "https://youtu.be/x"],
    ["an object", { provider: "youtube" }],
  ])("returns an empty list given %s", (_name, value) => {
    expect(normalizeEmbeds(value)).toEqual([]);
  });

  it("keeps the author's order and drops what does not validate", () => {
    // The house rule: a post with a mistyped link publishes without that one
    // embed. It does not fail the build, and it does not render a frame
    // pointing somewhere nobody chose.
    const embeds = normalizeEmbeds([
      { provider: "youtube", url: `https://youtu.be/${VIDEO_ID}` },
      { provider: "youtube", url: "https://youtube.com.evil.com/watch?v=x" },
      { provider: "google_maps", url: "https://www.google.com/maps/@39.0997,-94.5786,15z" },
      "javascript:alert(1)",
    ]);
    expect(embeds.map((embed) => embed.provider)).toEqual([
      "youtube",
      "google_maps",
    ]);
  });

  it("returns an empty list when none of them validate", () => {
    expect(
      normalizeEmbeds([
        { provider: "youtube", url: "https://vimeo.com/12345" },
        { provider: "google_maps", url: "https://maps.app.goo.gl/abc" },
      ])
    ).toEqual([]);
  });
});

/**
 * The editor's form and this module are two descriptions of the same
 * allowlist, in different files and different languages, and nothing makes
 * them agree at runtime — the same problem `util/navPages.test.js` covers for
 * the section pages. An option offered in the form that the code does not know
 * about is a box the client can fill in that produces nothing on the page, and
 * no error anywhere says so.
 */
describe("the CMS form for embeds", () => {
  const repoRoot = path.join(__dirname, "..");
  const config = matter.engines.yaml.parse(
    fs.readFileSync(path.join(repoRoot, "public", "admin", "config.yml"), "utf8")
  );
  const posts = config.collections.find((entry) => entry.name === "posts");
  const embeds = posts.fields.find((field) => field.name === "embeds");

  it("is a list on the blog post form", () => {
    expect(embeds.widget).toBe("list");
    expect(embeds.required).toBe(false);
  });

  it("asks for exactly what resolveEmbed reads", () => {
    expect(embeds.fields.map((field) => field.name).sort()).toEqual([
      "caption",
      "provider",
      "url",
    ]);
  });

  it("offers the providers this module implements, and no others", () => {
    const provider = embeds.fields.find((field) => field.name === "provider");
    expect(provider.options.map((option) => option.value).sort()).toEqual(
      Object.keys(EMBED_PROVIDERS).sort()
    );
    expect(provider.default).toBe("youtube");
  });

  it("requires the link, so a row cannot be saved empty", () => {
    const url = embeds.fields.find((field) => field.name === "url");
    expect(url.required).toBe(true);
  });
});

describe("the provider table", () => {
  it.each(Object.entries(EMBED_PROVIDERS))(
    "%s embeds from one https origin, sandboxed, without autoplay",
    (_name, provider) => {
      expect(provider.embedPrefix.startsWith("https://")).toBe(true);
      expect(provider.sandbox).toContain("allow-scripts");
      // The tokens that would let an embed act on the page around it.
      expect(provider.sandbox).not.toContain("allow-top-navigation");
      expect(provider.sandbox).not.toContain("allow-forms");
      expect(provider.sandbox).not.toContain("allow-modals");
      expect(provider.sandbox).not.toContain("allow-downloads");
      // `allow` denies anything it does not list. Video starts when the reader
      // asks for it.
      expect(provider.allow).not.toContain("autoplay");
      expect(provider.allow).not.toContain("camera");
      expect(provider.allow).not.toContain("microphone");
      expect(provider.allow).not.toContain("geolocation");
    }
  );
});
