"use client";

import Link from "next/link";

import { NoiseBackground } from "@/components/ui/noise-background";
import { ROUTES } from "@/lib/routes";

/** Aceternity noise-background demo style CTA → sign up. */
export function WelcomeCollectButton() {
  return (
    <Link href={ROUTES.signUp} className="inline-flex justify-center">
      <NoiseBackground
        containerClassName="mx-auto w-fit rounded-full p-2"
        gradientColors={[
          "rgb(255, 100, 150)",
          "rgb(100, 150, 255)",
          "rgb(255, 200, 100)",
        ]}
        noiseIntensity={0.2}
        speed={0.1}
      >
        <span
          className={[
            "inline-flex h-full w-full cursor-pointer items-center justify-center gap-2",
            "rounded-full bg-gradient-to-r from-neutral-100 via-neutral-200 to-neutral-100",
            "px-6 py-2.5 text-sm font-semibold text-neutral-900",
            "dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 dark:text-neutral-100",
            "uppercase",
          ].join(" ")}
        >
          To collection
          <span aria-hidden>&rarr;</span>
        </span>
      </NoiseBackground>
    </Link>
  );
}
