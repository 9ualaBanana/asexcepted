import type { Metadata } from "next";

import { AchievementDetailMeta } from "@/components/achievements/achievement-detail-meta";
import { AchievementBadge3DViewer } from "@/components/achievements/badge/achievement-badge-3d-viewer";
import { achievementBadgeChromeWidth } from "@/components/achievements/achievement-editor-shared";
import { DedicationByline } from "@/components/achievements/dedication/dedication-byline";
import { APP_DISPLAY_NAME } from "@/lib/brand";
import { resolvePublicSiteOrigin } from "@/lib/public-site-origin";
import {
  achievementShareInviteOgImagePath,
} from "@/lib/routes";
import { getAchievementShareInvitePresentationByToken } from "@/lib/share-invites/server";
import {
  getAchievementShareInviteKind,
  getAchievementShareInviteOwnerDetailPath,
} from "@/lib/share-invites/server";
import { ShareInviteClaimPanel } from "./share-invite-claim-panel";

type PageProps = {
  params: Promise<{ token: string }>;
};

function buildInviteMetadata(args: {
  title: string;
  description: string;
  imageUrl?: string | null;
}) {
  return {
    title: args.title,
    description: args.description,
    robots: { index: false, follow: false },
    openGraph: {
      siteName: APP_DISPLAY_NAME,
      title: args.title,
      description: args.description,
      images: args.imageUrl ? [{ url: args.imageUrl }] : undefined,
    },
    twitter: {
      card: args.imageUrl ? "summary_large_image" : "summary",
      title: args.title,
      description: args.description,
      images: args.imageUrl ? [args.imageUrl] : undefined,
    },
  } satisfies Metadata;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const result = await getAchievementShareInvitePresentationByToken(token);
  const origin = await resolvePublicSiteOrigin();

  if (result.isErr()) {
    return buildInviteMetadata({
      title: "Achievement invite unavailable",
      description: "This shared achievement invite is no longer available.",
    });
  }

  const { invite, senderDisplayName } = result.value;
  const pageKind = getAchievementShareInviteKind(invite);
  const title =
    invite.title?.trim() || invite.category?.trim() || "Achievement invite";
  const description =
    invite.description?.trim() ||
    (pageKind === "showcase"
      ? `${senderDisplayName} shared an achievement from their collection.`
      : `${senderDisplayName} shared an achievement waiting in your collection.`);

  return buildInviteMetadata({
    title,
    description,
    imageUrl: origin
      ? `${origin}${achievementShareInviteOgImagePath(token)}`
      : invite.icon_url,
  });
}

function InviteUnavailableState({ claimed }: { claimed: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#14121c] px-6 py-16 text-white">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 px-6 py-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.24em] text-white/38">
          Shared achievement
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">
          {claimed ? "Already claimed" : "Invite unavailable"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/62">
          {claimed
            ? "This one-time achievement invite has already been claimed."
            : "This achievement invite is no longer available."}
        </p>
      </section>
    </main>
  );
}

export default async function Page({ params }: PageProps) {
  const { token } = await params;
  const result = await getAchievementShareInvitePresentationByToken(token);

  if (result.isErr()) {
    return <InviteUnavailableState claimed={false} />;
  }

  const { invite, senderDisplayName } = result.value;
  const pageKind = getAchievementShareInviteKind(invite);
  const ownerDetailPath = getAchievementShareInviteOwnerDetailPath(invite);

  if (invite.status !== "pending") {
    return <InviteUnavailableState claimed={invite.status === "claimed"} />;
  }

  return (
    <main className="min-h-screen bg-[#14121c] px-6 py-10 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl flex-col items-center justify-center">
        <div className="w-full rounded-[2.25rem] border border-white/10 bg-[rgba(20,18,28,0.9)] px-6 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.36)] backdrop-blur-xl sm:px-8">
          <div className={achievementBadgeChromeWidth}>
            <div className="flex justify-center">
              <div className="mx-auto h-[18rem] w-full max-w-[18rem]">
                <AchievementBadge3DViewer
                  src={invite.icon_url}
                  float
                  motionSeed={invite.id}
                  className="mx-auto"
                />
              </div>
            </div>

            <AchievementDetailMeta
              achievedAt={invite.achieved_at}
              category={invite.category?.trim() ?? null}
              title={invite.title?.trim() || "Untitled"}
              description={invite.description?.trim() || "No description yet."}
            />

            <div className="mt-2 flex justify-center text-center">
              <DedicationByline
                senderUserId={invite.sender_user_id}
                senderDisplayName={senderDisplayName}
                prefix={pageKind === "showcase" ? "by" : "dedicated by"}
                accentClassName={
                  pageKind === "showcase" ? "text-emerald-200/90" : undefined
                }
                className="mt-0"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <ShareInviteClaimPanel
              token={token}
              senderUserId={invite.sender_user_id}
              inviteStatus={invite.status}
              pageKind={pageKind}
              ownerDetailPath={ownerDetailPath}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

