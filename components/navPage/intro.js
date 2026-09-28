/**
 * The optional opening line, from the CMS `intro` field. Sits just under the
 * heading, above everything else.
 *
 * Renders nothing when the field is empty, so a section with no intro looks
 * the same as one that never had the field.
 *
 * @param {{intro: string|null}} props
 */
export default function NavIntro({ intro }) {
  if (!intro) return null;
  return <p>{intro}</p>;
}
