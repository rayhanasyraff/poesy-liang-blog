"use client";

import React, { useEffect, useRef, useState } from "react";

type InstagramGlobal = { instgrm?: { Embeds?: { process?: () => void } } };

type Props = {
  url: string;
};

export default function InstagramEmbed({ url }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [useIframe, setUseIframe] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const win = window as unknown as InstagramGlobal;

    function ensureScript(): Promise<void> {
      return new Promise((resolve) => {
        if (!document.querySelector('script[src="https://www.instagram.com/embed.js"]')) {
          const s = document.createElement("script");
          s.src = "https://www.instagram.com/embed.js";
          s.async = true;
          document.head.appendChild(s);
          s.onload = () => {
            try {
              win.instgrm?.Embeds?.process?.();
            } catch (e) {
              void e;
            }
            resolve();
          };
          s.onerror = () => resolve();
        } else {
          resolve();
        }
      });
    }

    let observer: IntersectionObserver | null = null;
    let checkTimeout: number | null = null;

    function processEmbed() {
      if (!containerRef.current) return;
      // show the blockquote
      const block = containerRef.current.querySelector("blockquote.instagram-media") as HTMLElement | null;
      if (block) block.style.display = "";

      try {
        if (win.instgrm && win.instgrm.Embeds && typeof win.instgrm.Embeds.process === "function") {
          win.instgrm.Embeds.process?.();
        }
      } catch (e) {
        void e;
      }

      // if embed appeared, hide loader
      const hasEmbedNow = containerRef.current && containerRef.current.querySelector("iframe, .EmbeddedMedia, .instagram-media");
      if (hasEmbedNow) setShowLoader(false);

      // fallback to iframe if embed doesn't appear after short timeout
      if (checkTimeout) window.clearTimeout(checkTimeout);
      checkTimeout = window.setTimeout(() => {
        // if still empty, use iframe fallback
        const hasEmbed = containerRef.current && containerRef.current.querySelector("iframe, .EmbeddedMedia, .instagram-media") ;
        if (!hasEmbed) {
          setUseIframe(true);
          setShowLoader(false);
        }
      }, 2000);
    }

    function onIntersect(entries: IntersectionObserverEntry[]) {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          ensureScript().then(() => processEmbed());
          if (observer && containerRef.current) observer.unobserve(containerRef.current);
        }
      });
    }

    if (containerRef.current) {
      observer = new IntersectionObserver(onIntersect, { threshold: 0.1 });
      observer.observe(containerRef.current);
    }

    // watch for changes (SPA navigation may re-insert content)
    const mo = new MutationObserver(() => {
      if (loaded) {
        try {
          win.instgrm?.Embeds?.process?.();
        } catch (e) {
          void e;
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      if (observer && containerRef.current) observer.unobserve(containerRef.current);
      mo.disconnect();
      if (checkTimeout) window.clearTimeout(checkTimeout);
    };
  }, [url, loaded]);

  // compute iframe src fallback
  function iframeSrcFor(url: string) {
    try {
      const u = new URL(url);
      // Instagram embed endpoints: /p/SHORTCODE/embed, /reel/ID/embed, /tv/ID/embed
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        const kind = parts[0];
        const id = parts[1];
        return `https://www.instagram.com/${kind}/${id}/embed`;
      }
    } catch (e) {
      void e;
    }
    return url;
  }

  return (
    <div ref={containerRef} className="instagram-embed-container" style={{ position: "relative", margin: "1rem 0" }}>
      {showLoader && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-sm text-neutral-500 dark:text-neutral-400">Loading...</div>
        </div>
      )}

      {!useIframe ? (
        <blockquote
          className="instagram-media"
          data-instgrm-permalink={url}
          data-instgrm-version="14"
          style={{ background: "#FFF", border: 0, margin: "0 auto", maxWidth: "540px", width: "100%", display: loaded ? "" : "none" }}
        />
      ) : (
        <div style={{ width: "100%", height: 600 }}>
          <iframe
            title="Instagram"
            src={iframeSrcFor(url)}
            style={{ width: "100%", height: "100%", border: 0 }}
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
}
