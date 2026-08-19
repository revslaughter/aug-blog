import Head from 'next/head'
import { Vollkorn } from 'next/font/google'
import '../styles/globals.css'

// Vollkorn — the body face — is loaded here rather than as a
// styles/globals.css @import or a pages/_document.js <link>. next/font
// downloads it at build time and self-hosts the files as static assets, so
// there's no Google Fonts URL anywhere for next build's CSS pipeline to trip
// over (it silently drops any @import whose URL has a comma in it, which an
// italic request always does), and no runtime request to Google either.
//
// The loader only runs inside the component tree, not in _document.js, so
// the CSS variable it exposes is set on a wrapper div here rather than on
// <html>/<body> directly — styles/globals.css reads it back on `.font-root`.
const vollkorn = Vollkorn({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-body',
})

function MyApp({ Component, pageProps }) {
  return (
    <div className={`font-root ${vollkorn.variable}`}>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        {/* Kept in sync with --color-bg in styles/globals.css — meta
            tags can't reference CSS custom properties. */}
        <meta name="theme-color" content="#f3ecd9" />
      </Head>
      <Component {...pageProps} />
    </div>
  )
}

export default MyApp
