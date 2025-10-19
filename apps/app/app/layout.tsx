import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { Header } from "@/components/header";
import { ThemeProvider } from "./theme-provider";
import Providers from "@/components/providers";
import { LoadingProvider } from "@/components/loading-provider";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://onurhan.dev"
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
    url: "https://onurhan.dev",
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
    site: "@onurhan1337",
    creator: "@onurhan1337",
  },
  verification: {
    google: "K1pkJ72cY3DylswXke2MHJGxmjJ91WXwgozcCICvFrU",
    // TODO: Add yandex verification key here
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="icon" type="image/png" href="/images/poesy-logo-pink.png" />
          <link rel="shortcut icon" type="image/png" href="/images/poesy-logo-pink.png" />
        </head>
        <body
          className={`${inter.className} bg-background text-foreground overflow-y-scroll`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            storageKey="theme"
          >
            <LoadingProvider>
              {children}
            </LoadingProvider>
          </ThemeProvider>
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </Providers>
  );
}
