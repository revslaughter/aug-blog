import { Html, Head, Main, NextScript } from 'next/document'

/**
 * Exists for the webfont links below.
 *
 * Merriweather — the body face — cannot be loaded by `@import` from
 * globals.css the way Marcellus and VT323 are: its Google Fonts URL names two
 * axes (`opsz,wght`), and the CSS pipeline in `next build` drops an @import
 * whose URL carries a comma-separated axis list, without a word in the build
 * log. The page then renders in the Georgia fallback, which reads as "the type
 * looks a bit off" rather than as a broken build. A <link> never goes near that
 * pipeline.
 *
 * It goes here rather than in a `next/head` block in _app.js because a font
 * that every page needs belongs in the document rather than being re-declared
 * per page — which is also what `@next/next/no-page-custom-font` asks for.
 *
 * scripts/update-font-cache.mjs reads the stylesheet href out of this file, so
 * the screenshot tests keep serving the font from their offline cache. Change
 * the URL here and re-run it, or the visual suite fails on a cache miss.
 */
export default function Document() {
  return (
    <Html>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Merriweather:ital,opsz,wght@0,18..144,300..900;1,18..144,300..900&display=swap"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
