"use client";

import '../lib/patch-url-parse';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

import { Header } from "@/components/header";
import { ThemeProvider } from "./theme-provider";
import Providers from "@/components/providers";
import { LoadingProvider } from "@/components/loading-provider";


const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/poesy-logo-pink.png" />
        <link rel="shortcut icon" type="image/png" href="/poesy-logo-pink.png" />
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
        <Script
          src="//unpkg.com/react-scan/dist/auto.global.js"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
        <Script src="https://www.instagram.com/embed.js" strategy="afterInteractive" />
      </head>
      <body
        className={`${inter.className} bg-background text-foreground overflow-y-scroll`}
      >
        <Providers>
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
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

