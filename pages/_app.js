import Head from 'next/head'
import '../styles/globals.css'

function MyApp({ Component, pageProps }) {
  return (
    <>
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
    </>
  )
}

export default MyApp
