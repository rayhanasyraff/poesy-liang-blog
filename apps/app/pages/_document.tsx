import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html>
      <Head>
        {process.env.NODE_ENV === "development" && (
          <Script src="//unpkg.com/react-grab/dist/index.global.js" strategy="beforeInteractive" />
        )}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
