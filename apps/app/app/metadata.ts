import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://blog.poesyliang.com"
  ),
  title: {
    default: "POESY 小詩",
    template: "%s | POESY 小詩",
  },
  description:
    "POESY 小詩 - Artist",
  icons: {
    icon: "/images/poesy-logo-pink.png",
    shortcut: "/images/poesy-logo-pink.png",
    apple: "/images/poesy-logo-pink.png",
  },
  openGraph: {
    title: "POESY 小詩 - Artist",
    description:
      "Artist",
    url: "https://blog.poesyliang.com",
    siteName: "POESY 小詩",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/images/poesy-logo-pink.png",
        width: 1200,
        height: 630,
        alt: "POESY 小詩",
      },
    ],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  twitter: {
    title: "POESY 小詩",
    card: "summary_large_image",
    site: "@poesyliang",
    creator: "@poesyliang",
  },

  verification: {
    google: "K1pkJ72cY3DylswXke2MHJGxmjJ91WXwgozcCICvFrU",
    // TODO: Add yandex verification key here
  },
};
