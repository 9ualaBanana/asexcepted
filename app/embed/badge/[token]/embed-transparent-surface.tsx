"use client";

import { useEffect } from "react";

/**
 * Make iframe root transparent for hosts that support transparent embeds.
 * Scoped to embed route mount/unmount only.
 */
export function EmbedTransparentSurface() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;
    html.style.backgroundColor = "transparent";
    body.style.backgroundColor = "transparent";
    return () => {
      html.style.backgroundColor = prevHtmlBg;
      body.style.backgroundColor = prevBodyBg;
    };
  }, []);

  return null;
}
