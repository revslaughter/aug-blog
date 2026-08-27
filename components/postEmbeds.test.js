import { render, screen } from "@testing-library/react";
import PostEmbeds from "./postEmbeds";
import { normalizeEmbeds } from "../util/embeds";

/**
 * `util/embeds.test.js` covers which links are allowed. This covers what
 * reaches the browser once one is: the attributes on the frame, and the fact
 * that the component will not render a `src` it was handed directly rather
 * than through the validator.
 */

const VIDEO = {
  provider: "youtube",
  src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  caption: null,
};

/** iframes have no implicit role, so they are found by their accessible name. */
const frameNamed = (name) =>
  screen.getByTitle(name).closest("iframe") ?? screen.getByTitle(name);

describe("PostEmbeds", () => {
  it("renders nothing when a post has no embeds", () => {
    const { container } = render(<PostEmbeds embeds={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the prop is missing entirely", () => {
    // Posts written before this field existed have no `embeds` key at all.
    const { container } = render(<PostEmbeds />);
    expect(container).toBeEmptyDOMElement();
  });

  it("hardens the frame it renders", () => {
    render(<PostEmbeds embeds={[VIDEO]} />);
    const frame = frameNamed("YouTube video");
    expect(frame).toHaveAttribute("src", VIDEO.src);
    expect(frame).toHaveAttribute("loading", "lazy");
    expect(frame).toHaveAttribute(
      "referrerpolicy",
      "strict-origin-when-cross-origin"
    );
    expect(frame.getAttribute("sandbox")).toContain("allow-scripts");
    expect(frame.getAttribute("sandbox")).not.toContain("allow-top-navigation");
    expect(frame.getAttribute("allow")).not.toContain("autoplay");
  });

  it("names the frame with the caption when there is one", () => {
    // What a screen reader announces. "YouTube video" three times in a row is
    // not a description of anything.
    render(
      <PostEmbeds
        embeds={[{ ...VIDEO, caption: "The greenhouse in March" }]}
      />
    );
    expect(frameNamed("The greenhouse in March")).toBeInTheDocument();
    expect(screen.getByText("The greenhouse in March").tagName).toBe(
      "FIGCAPTION"
    );
  });

  it("renders a caption as text, never as markup", () => {
    render(
      <PostEmbeds embeds={[{ ...VIDEO, caption: "<b>Tomatoes</b> & figs" }]} />
    );
    const caption = screen.getByText("<b>Tomatoes</b> & figs");
    expect(caption.querySelector("b")).toBeNull();
  });

  it("keeps the order the author listed them in", () => {
    const embeds = normalizeEmbeds([
      { provider: "google_maps", url: "https://www.google.com/maps/@39.0997,-94.5786,15z", caption: "Where we are" },
      { provider: "youtube", url: "https://youtu.be/dQw4w9WgXcQ", caption: "How to get here" },
    ]);
    const { container } = render(<PostEmbeds embeds={embeds} />);
    expect(
      [...container.querySelectorAll("figcaption")].map((node) => node.textContent)
    ).toEqual(["Where we are", "How to get here"]);
  });

  it.each([
    ["a src on another host", { provider: "youtube", src: "https://evil.com/embed/x", caption: null }],
    ["a src on the wrong provider's host", { provider: "google_maps", src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", caption: null }],
    ["a javascript: src", { provider: "youtube", src: "javascript:alert(1)", caption: null }],
    ["a provider that does not exist", { provider: "facebook", src: "https://www.facebook.com/plugins/post.php", caption: null }],
    ["no src at all", { provider: "youtube", caption: null }],
  ])("refuses to render %s", (_name, embed) => {
    // Nothing produces these today — normalizeEmbeds cannot. The check is here
    // so that a future caller building the array by hand cannot either.
    const { container } = render(<PostEmbeds embeds={[embed]} />);
    expect(container.querySelector("iframe")).toBeNull();
  });
});
