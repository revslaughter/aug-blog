/**
 * Embedded video and maps: the allowlist that turns a link the author pasted
 * into a URL this site is willing to put inside an iframe.
 *
 * Why this exists as a validator rather than as markup in the post text.
 * Post bodies render through `dangerouslySetInnerHTML`, and that is only safe
 * because remark-html drops raw HTML on the way through — `util/processMarkdown.test.js`
 * pins that, and says at length why it must stay pinned. The obvious way to
 * support embeds is to stop dropping raw HTML so a pasted `<iframe>` survives,
 * and that would hand anyone who can save a Markdown file the ability to run
 * script on the site. The whole point of the editor at /admin is that people
 * who are not developers write those files.
 *
 * So the author supplies *data* and this file supplies the *markup*. Nothing
 * the author types is ever interpolated into HTML. What crosses out of here is
 * one of exactly two URL shapes:
 *
 *   https://www.youtube-nocookie.com/embed/<11-char id>
 *   https://www.google.com/maps/embed?pb=<token>
 *
 * — and everything variable in them has been through a strict character test
 * first. From a YouTube link we keep the video id and nothing else: no
 * playlist, no timestamp, no tracking parameters, because "keep only the id"
 * is a rule that stays true as YouTube adds query parameters and "strip the
 * ones we know about" does not. From a Google Maps link we keep either the
 * `pb` token out of Google's own embed dialog or a pair of numeric
 * coordinates, which we re-emit as numbers we parsed rather than as text the
 * author supplied.
 *
 * Adding a third provider is deliberately a small change: one entry in
 * EMBED_PROVIDERS with a `resolve` that returns a full URL or null, one option
 * in the `embeds` field in `public/admin/config.yml`, and an aspect-ratio
 * class in `components/postEmbeds.module.css`. Nothing else in the render path
 * knows which providers exist. Facebook posts were asked for at the same time
 * as these two and are deliberately not here — their embed wants Facebook's
 * SDK script on the page, and the plugin-iframe alternative takes a URL
 * containing another URL, which is a much larger thing to validate than an id.
 * It can be added the same way when someone is willing to work through that.
 */

/**
 * @typedef {{provider: string, src: string, caption: string|null}} ResolvedEmbed
 */

/**
 * Where each provider's embeds must live.
 *
 * Split out from the `resolve` functions so the two cannot disagree: the
 * resolvers build their URLs from these prefixes, and `components/postEmbeds.js`
 * refuses to render a `src` that does not start with one. That second check is
 * redundant today — everything reaching the component came from `resolveEmbed`
 * — and it is there so that it stays redundant if someone later passes the
 * component a hand-built object.
 */
const YOUTUBE_EMBED_PREFIX = "https://www.youtube-nocookie.com/embed/";
const GOOGLE_MAPS_EMBED_PREFIX = "https://www.google.com/maps/embed?pb=";

/**
 * Hosts, matched exactly and never by suffix.
 *
 * A `hostname.endsWith(".youtube.com")` test is the version of this that gets
 * written by accident, and `youtube.com.evil.com` walks straight through it.
 * `new URL()` lowercases the hostname and punycodes it, so a Cyrillic
 * lookalike arrives here as `xn--...` and misses the set, which is what we
 * want.
 */
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

/**
 * Only the three Google hosts that serve maps. Country domains
 * (google.co.uk and the rest) are left out because the list is unbounded and
 * every one of them redirects to these anyway.
 *
 * `maps.app.goo.gl` — what "Share → Copy link" produces — is deliberately not
 * here. Resolving a shortlink needs a network request at build time, and a
 * shortlink is a promise about a destination that the person who created it
 * can change afterwards. An embed URL has to be something we can check by
 * looking at it.
 */
const GOOGLE_MAPS_HOSTS = new Set([
  "google.com",
  "www.google.com",
  "maps.google.com",
]);

/** A YouTube video id, which is eleven characters of URL-safe base64. */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** Path shapes that carry the id in the segment after the marker. */
const YOUTUBE_ID_PATHS = new Set(["embed", "shorts", "live", "v"]);

/**
 * The `pb` token from Google's "Embed a map" dialog: a run of `!`-separated
 * fields. The character class is what those tokens actually contain plus the
 * rest of the unreserved/sub-delims set that could legitimately appear once
 * something in the map's name is percent-encoded. What it excludes is the
 * point — no quotes, no angle brackets, no `&`, no `#`, no whitespace, no
 * backslash — so the token cannot end the query string or the attribute it
 * lands in. (React sets `src` as a DOM property rather than by writing
 * markup, so it could not break out of an attribute regardless; this is the
 * belt to that's braces.)
 */
const GOOGLE_MAPS_PB = /^[A-Za-z0-9!%._~*'()+-]{1,2048}$/;

/** `@39.0997,-94.5786,15z` as it appears in the path of a map link. */
const MAP_COORDINATES_IN_PATH =
  /@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)(?:,(\d{1,2}(?:\.\d+)?)z)?/;

/** `39.0997,-94.5786` as it appears in a `q=` or `ll=` parameter. */
const MAP_COORDINATES_IN_PARAM =
  /^(-?\d{1,3}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)$/;

/**
 * Zoom when the link does not carry one. 15 is street level — close enough to
 * see which building, wide enough to show the junction you turn at.
 */
const DEFAULT_MAP_ZOOM = 15;

/**
 * The providers the editor offers, and everything the renderer needs to know
 * about each one.
 *
 * `allow` and `sandbox` are per provider rather than shared because the two
 * need different things, and because a provider that turns out to break under
 * a sandbox token should be fixable here without weakening the other one.
 *
 * On `sandbox`: `allow-scripts` with `allow-same-origin` is the combination
 * that is a no-op *when the framed page is same-origin with the embedder* —
 * it can then reach into this document and drop its own sandbox. These frames
 * are cross-origin, so `allow-same-origin` only means the frame keeps its own
 * origin (which both providers need for storage and postMessage), and the
 * tokens we withhold keep their bite. The withheld ones that matter:
 * `allow-top-navigation`, so an embed cannot navigate the page around the
 * reader; `allow-forms`, `allow-modals` and `allow-downloads`, none of which
 * a video player or a map has any business doing here.
 *
 * `allow` is a Permissions-Policy delegation and defaults to denying
 * everything not listed. `autoplay` is not listed on purpose: video on this
 * site starts when the reader asks for it.
 */
export const EMBED_PROVIDERS = {
  youtube: {
    label: "YouTube video",
    // Picks the aspect-ratio class in components/postEmbeds.module.css.
    shape: "video",
    embedPrefix: YOUTUBE_EMBED_PREFIX,
    allow:
      "accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen",
    sandbox:
      "allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox",
    resolve: resolveYouTube,
  },
  google_maps: {
    label: "Google map",
    shape: "map",
    embedPrefix: GOOGLE_MAPS_EMBED_PREFIX,
    allow: "fullscreen",
    sandbox:
      "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox",
    resolve: resolveGoogleMaps,
  },
};

/**
 * Parse a link the author pasted, or return null.
 *
 * Everything hostile that gets typed into a URL box dies here rather than in
 * the provider rules: `javascript:` and `data:` fail the protocol test,
 * `//youtube.com/...` is not a URL without a base and throws, and a userinfo
 * trick like `https://youtube.com@evil.com/` parses with hostname `evil.com`
 * and misses every allowlist. Credentials are refused outright even though we
 * rebuild the URL from scratch afterwards and could never carry them through.
 *
 * `http:` is accepted as input and never emitted — the embed URL this file
 * builds is always https. Refusing it would only mean an author who copied an
 * old link gets a blank space and no idea why.
 *
 * @param {string} raw
 * @returns {URL|null}
 */
function parseHttpUrl(raw) {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  return url;
}

/**
 * The video id out of any YouTube link shape, or null.
 *
 * A bare id is accepted because short links get passed around as one, and
 * because the id is the only thing we were going to keep anyway. It is checked
 * against the same pattern as an extracted one, so a stray sentence cannot
 * arrive this way.
 *
 * @param {string} raw
 * @returns {string|null}
 */
function youTubeId(raw) {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (YOUTUBE_ID.test(trimmed)) return trimmed;

  const url = parseHttpUrl(trimmed);
  if (!url || !YOUTUBE_HOSTS.has(url.hostname)) return null;

  const segments = url.pathname.split("/").filter(Boolean);
  let candidate = null;
  if (url.hostname === "youtu.be" || url.hostname === "www.youtu.be") {
    // youtu.be/<id>, where the whole path is the id.
    candidate = segments[0];
  } else if (segments[0] === "watch") {
    candidate = url.searchParams.get("v");
  } else if (YOUTUBE_ID_PATHS.has(segments[0])) {
    candidate = segments[1];
  }

  return candidate && YOUTUBE_ID.test(candidate) ? candidate : null;
}

/**
 * @param {string} raw
 * @returns {string|null} A full embed URL, or null if the link is not one we
 *   can vouch for.
 */
function resolveYouTube(raw) {
  const id = youTubeId(raw);
  return id ? `${YOUTUBE_EMBED_PREFIX}${id}` : null;
}

/**
 * Coordinates out of a map link, as numbers, or null.
 *
 * The path is checked first because that is where the address bar puts them —
 * open a place in Google Maps and the URL carries `@lat,lng,zoomz` whatever
 * else is in it. `q=` and `ll=` are the older shapes, still produced by
 * "What's here?" and by hand-written links.
 *
 * Out-of-range values are rejected rather than clamped. A latitude of 500 is
 * not a place someone meant to point at, it is a link that was mangled on its
 * way here, and pointing the map at the equator instead would be the
 * best-effort render this file exists to avoid.
 *
 * @param {URL} url
 * @returns {{lat: number, lng: number, zoom: number}|null}
 */
function mapCoordinates(url) {
  const inPath = MAP_COORDINATES_IN_PATH.exec(url.pathname);
  if (inPath) {
    return toPoint(inPath[1], inPath[2], inPath[3] ?? url.searchParams.get("z"));
  }
  const inParam =
    MAP_COORDINATES_IN_PARAM.exec(url.searchParams.get("q") ?? "") ??
    MAP_COORDINATES_IN_PARAM.exec(url.searchParams.get("ll") ?? "");
  return inParam
    ? toPoint(inParam[1], inParam[2], url.searchParams.get("z"))
    : null;
}

/**
 * @param {string} lat
 * @param {string} lng
 * @param {string|null|undefined} zoom
 * @returns {{lat: number, lng: number, zoom: number}|null}
 */
function toPoint(lat, lng, zoom) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90) return null;
  if (!Number.isFinite(longitude) || Math.abs(longitude) > 180) return null;
  // An unreadable zoom is not worth rejecting the whole link over — the place
  // is still the place. Anything outside what Google accepts falls back.
  const requested = Number(zoom);
  const usable = Number.isFinite(requested) && requested >= 1 && requested <= 21;
  return {
    lat: latitude,
    lng: longitude,
    zoom: usable ? Math.round(requested) : DEFAULT_MAP_ZOOM,
  };
}

/**
 * @param {string} raw
 * @returns {string|null} A full embed URL, or null.
 */
function resolveGoogleMaps(raw) {
  const url = parseHttpUrl(raw);
  if (!url || !GOOGLE_MAPS_HOSTS.has(url.hostname)) return null;

  const isMapsPath =
    url.pathname === "/maps" ||
    url.pathname.startsWith("/maps/") ||
    url.hostname === "maps.google.com";
  if (!isMapsPath) return null;

  // The link out of "Share → Embed a map", minus the markup around it. Its
  // `pb` token already describes the whole view, so it is passed through
  // as-is once it has survived the character test.
  if (url.pathname === "/maps/embed") {
    const pb = url.searchParams.get("pb");
    return pb && GOOGLE_MAPS_PB.test(pb)
      ? `${GOOGLE_MAPS_EMBED_PREFIX}${pb}`
      : null;
  }

  // Anything else has to give up coordinates, which we turn into the same
  // `pb` shape Google's own `?output=embed` redirect produces for a point.
  // Building it here rather than pointing the iframe at the redirect keeps
  // the frame on a URL verified to be framable — the redirect itself answers
  // with `X-Frame-Options: SAMEORIGIN`, and whether a browser honours that on
  // a hop it never displays is not something to bet a feature on.
  const point = mapCoordinates(url);
  return point
    ? `${GOOGLE_MAPS_EMBED_PREFIX}!1m3!2m1!1s${point.lat},${point.lng}!6i${point.zoom}`
    : null;
}

/**
 * Turn one row of the editor's "Videos and maps" list into something
 * renderable, or null if it is not one we will render.
 *
 * Null is the whole error handling. A row that does not resolve renders
 * nothing at all, which follows the rule the rest of the content pipeline
 * works to: a half-written page should look unfinished, not fail the build.
 * The alternative — rendering the frame anyway and letting the provider show
 * its own error — is exactly the "best effort" that turns a mistyped link into
 * an attacker-chosen page inside our layout.
 *
 * The provider is looked up with `hasOwnProperty` so that a frontmatter value
 * of `constructor` or `toString` finds nothing instead of finding something
 * off Object's prototype.
 *
 * @param {unknown} entry One list row, as it comes out of frontmatter
 * @returns {ResolvedEmbed|null}
 */
export function resolveEmbed(entry) {
  if (!entry || typeof entry !== "object") return null;
  const { provider, url, caption } = /** @type {Record<string, unknown>} */ (
    entry
  );
  if (
    typeof provider !== "string" ||
    !Object.prototype.hasOwnProperty.call(EMBED_PROVIDERS, provider)
  ) {
    return null;
  }
  if (typeof url !== "string") return null;

  const src = EMBED_PROVIDERS[provider].resolve(url);
  if (!src) return null;

  const text = typeof caption === "string" ? caption.trim() : "";
  return { provider, src, caption: text || null };
}

/**
 * Every embed on one post, in the order the author listed them, with the ones
 * that did not validate dropped.
 *
 * Tolerates a non-list because frontmatter is a text file that can be edited
 * by hand as well as through the editor — `embeds: a video` should be nothing,
 * not a crash on `.map`.
 *
 * @param {unknown} value The `embeds` frontmatter key
 * @returns {ResolvedEmbed[]}
 */
export function normalizeEmbeds(value) {
  if (!Array.isArray(value)) return [];
  return value.map(resolveEmbed).filter(Boolean);
}
