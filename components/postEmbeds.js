import { EMBED_PROVIDERS } from "../util/embeds";
import styles from "./postEmbeds.module.css";

/**
 * The videos and maps attached to a post, rendered under the post's text.
 *
 * Position is fixed here, and that is the awkward part of this design, so it
 * is worth writing down rather than discovering later.
 *
 * The author fills in a list of embeds in a form field; this component decides
 * where they land. That means an embed cannot sit halfway down the writing the
 * way it would if the author typed something into the text — the video that
 * belongs next to the third paragraph appears after the last one instead.
 *
 * The alternative is a marker typed into the post body, `[video: ...]` or
 * similar, that the renderer swaps out. It was not chosen, for three reasons:
 *
 *   It is a syntax. Everything else in this editor is a labelled box, and the
 *   one person this site is built for should not have to remember punctuation
 *   that only works here. A typo in a form field is a field that looks wrong;
 *   a typo in a marker is text that shows up in the finished post.
 *
 *   The body has two editing modes and rich text is the default one — see the
 *   note on the `body` field in public/admin/config.yml. In rich text the
 *   author is editing a document, not source, so a marker is just words on the
 *   page until it is not.
 *
 *   It reopens the door this feature exists to keep shut. A marker means
 *   post-processing the rendered HTML, and something that edits the HTML on
 *   its way to `dangerouslySetInnerHTML` is one refactor away from being the
 *   raw-HTML passthrough `util/processMarkdown.test.js` is there to prevent.
 *
 * What actually recovers the lost placement is the caption. "The tour we
 * mention above" reads fine under a video at the end of a post; the thing the
 * reader needs is to know what they are looking at and why, and that is text,
 * not a position. Section pages already work this way — see the comment on
 * block order in components/navPage.js — so a post with an embed under its
 * text is the site being consistent rather than a compromise made once.
 *
 * If it does turn out that mid-article is needed, the next step is a per-embed
 * position field with a small fixed set of slots (above the text, below it),
 * which is data with a handful of legal values and no new syntax. It is not
 * here because two slots that nobody asked for is a setting to get wrong.
 *
 * @param {Object} props
 * @param {import("../util/embeds").ResolvedEmbed[]} [props.embeds] From
 *   `normalizeEmbeds`; already validated, already dropped if invalid.
 */
export default function PostEmbeds({ embeds }) {
  const renderable = (embeds ?? []).filter(isRenderable);
  if (renderable.length === 0) return null;

  return (
    <section className={styles.embeds} aria-label="Videos and maps">
      {renderable.map((embed, index) => {
        const provider = EMBED_PROVIDERS[embed.provider];
        return (
          <figure className={styles.figure} key={`${embed.src}-${index}`}>
            <iframe
              className={`${styles.frame} ${styles[provider.shape]}`}
              src={embed.src}
              // Every frame needs a name a screen reader can announce, and
              // "YouTube video" on its own is no help when a post has three.
              // The caption is what the author wrote about this one.
              title={embed.caption ?? provider.label}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow={provider.allow}
              sandbox={provider.sandbox}
              allowFullScreen
            />
            {embed.caption && (
              <figcaption className={styles.caption}>
                {embed.caption}
              </figcaption>
            )}
          </figure>
        );
      })}
    </section>
  );
}

/**
 * The same check `util/embeds.js` already did, done again at the point the
 * `src` is handed to the browser.
 *
 * Redundant today: everything here came from `normalizeEmbeds`, which cannot
 * produce anything else. It is here so that it is still true if some later
 * caller builds the array itself — this is the one line in the render path
 * where a URL becomes a live frame, and it should not be possible to read this
 * component and wonder where the src came from.
 *
 * @param {import("../util/embeds").ResolvedEmbed} embed
 * @returns {boolean}
 */
function isRenderable(embed) {
  if (!embed || typeof embed.src !== "string") return false;
  const provider = Object.prototype.hasOwnProperty.call(
    EMBED_PROVIDERS,
    embed.provider
  )
    ? EMBED_PROVIDERS[embed.provider]
    : null;
  return Boolean(provider) && embed.src.startsWith(provider.embedPrefix);
}
