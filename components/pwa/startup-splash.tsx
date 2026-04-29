"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function StartupSplash() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    let timeoutId = 0;

    const hide = () => {
      raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => {
          timeoutId = window.setTimeout(() => setHidden(true), 380);
        });
      });
    };

    if (document.readyState === "complete") {
      hide();
    } else {
      window.addEventListener("load", hide, { once: true });
    }

    return () => {
      if (raf1) window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
      if (timeoutId) window.clearTimeout(timeoutId);
      window.removeEventListener("load", hide);
    };
  }, []);

  return (
    <div
      aria-hidden
      className={`startup-splash fixed inset-0 z-[9999] flex items-center justify-center bg-[#14121c] transition-opacity duration-500 ${
        hidden ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative flex items-center justify-center">
        <div className="loading-icon-pulse absolute h-[15.5rem] w-[15.5rem] rounded-full bg-white/10 blur-3xl" />
        <Image
          src="/icons/icon-512.png"
          alt=""
          width={256}
          height={256}
          priority
          className="loading-icon-pulse relative h-48 w-48 select-none rounded-[22%] sm:h-56 sm:w-56"
        />
      </div>
    </div>
  );
}
