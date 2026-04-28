import type { Metadata } from "next";
import { Suspense } from "react";

import { EmbedBadgeContent } from "./embed-badge-content";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Badge embed",
};

type PageProps = {
  params: Promise<{ token: string }>;
};

export default function EmbedBadgePage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh min-h-[100dvh] items-center justify-center bg-[#0c0a10] p-4">
          <div className="h-[min(88vmin,20rem)] w-[min(88vmin,20rem)] max-h-[90dvh] max-w-[90dvw] animate-pulse rounded-3xl bg-white/[0.06]" />
        </div>
      }
    >
      <EmbedBadgeContent params={params} />
    </Suspense>
  );
}
