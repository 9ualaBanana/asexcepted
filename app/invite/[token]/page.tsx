import type { Metadata } from "next";
import Link from "next/link";

import { AchievementBadge3DViewer } from "@/components/achievements/badge/achievement-badge-3d-viewer";
import { BadgeAttributionPopover } from "@/components/achievements/badge/badge-attribution-popover";
import { AchievementBadgeModelViewer } from "@/components/achievements/badge/achievement-badge-model-viewer";
import { formatAchievedAt } from "@/components/achievements/achievement-editor-shared";
import { isModelBadgeAssetKind } from "@/lib/achievements/badge-assets";
import { createSignedAchievementBadgeModelUrl } from "@/lib/achievements/badge-assets-server";
import { APP_DISPLAY_NAME } from "@/lib/brand";
import { resolvePublicSiteOrigin } from "@/lib/public-site-origin";
import { resolveInviteShareTitle } from "@/lib/share-invites/invite-share-title";
import {
  achievementShareInviteOgImagePath,
  userCollection,
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
      title: args.title,
      description: args.description,
      siteName: APP_DISPLAY_NAME,
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
  const title = resolveInviteShareTitle(invite);
  const description =
    invite.description?.trim() ||
    (pageKind === "showcase"
      ? `${senderDisplayName} shared an achievement from their collection.`
      : `${senderDisplayName} shared an achievement waiting in your collection.`);

  return buildInviteMetadata({
    title: `${title} | ${APP_DISPLAY_NAME}`,
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
  const senderCollectionPath = userCollection(invite.sender_user_id);
  const liveModelUrl =
    isModelBadgeAssetKind(invite.icon_asset_kind) && invite.icon_asset_path?.trim()
      ? await createSignedAchievementBadgeModelUrl(invite.icon_asset_path)
      : null;

  if (invite.status !== "pending") {
    return <InviteUnavailableState claimed={invite.status === "claimed"} />;
  }

  return (
    <main className="min-h-screen bg-[#14121c] px-6 py-10 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl flex-col items-center justify-center">
        <div className="w-full rounded-[2.25rem] border border-white/10 bg-[rgba(20,18,28,0.9)] px-6 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.36)] backdrop-blur-xl sm:px-8">
          <div className="mx-auto h-[18rem] w-full max-w-[18rem]">
            <div className="relative h-full w-full">
              {liveModelUrl ? (
                <AchievementBadgeModelViewer
                  signedModelUrl={liveModelUrl}
                  previewSrc={invite.icon_url}
                  float
                  motionSeed={invite.id}
                  initialYaw={invite.icon_model_yaw ?? 0}
                  initialPitch={invite.icon_model_pitch ?? 0}
                  className="mx-auto"
                />
              ) : (
                <AchievementBadge3DViewer
                  src={invite.icon_url}
                  float
                  motionSeed={invite.id}
                  className="mx-auto"
                />
              )}
              {(invite.icon_asset_kind === "model_glb" || invite.icon_cc_attribution?.trim()) && (
                <BadgeAttributionPopover
                  value={invite.icon_cc_attribution ?? ""}
                  emptyState="No attribution was provided for this 3D badge."
                />
              )}
            </div>
          </div>

          <div className="mt-6 text-center">
            {invite.category?.trim() ? (
              <p className="text-xs uppercase tracking-[0.24em] text-white/38">
                {invite.category}
              </p>
            ) : null}
            {invite.title?.trim() ? (
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                {invite.title}
              </h1>
            ) : null}
            {invite.description?.trim() ? (
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/68">
                {invite.description}
              </p>
            ) : null}
            {invite.achieved_at ? (
              <p className="mt-4 text-sm text-white/48">
                {formatAchievedAt(invite.achieved_at)}
              </p>
            ) : null}
          </div>

          <div className="mt-5 flex justify-center text-center">
            {pageKind === "showcase" ? (
              <p className="text-xs leading-snug text-white/55">
                from{" "}
                <Link
                  href={senderCollectionPath}
                  className="font-semibold text-emerald-200/90 underline-offset-2 hover:underline"
                >
                  {senderDisplayName}
                </Link>
              </p>
            ) : (
              <p className="text-xs leading-snug text-white/55">
                dedicated by{" "}
                <Link
                  href={senderCollectionPath}
                  className="font-semibold text-amber-200/95 underline-offset-2 hover:underline"
                >
                  {senderDisplayName}
                </Link>
              </p>
            )}
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

