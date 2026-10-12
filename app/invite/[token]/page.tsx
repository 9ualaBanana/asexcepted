import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/achievements/badge/display/badge";
import { badgeOptionsForInvite } from "@/components/achievements/badge/display/badge-presets";
import { formatAchievedAt } from "@/lib/feed/format-feed-event-time";
import { createSignedBadgeModelUrl } from "@/lib/achievements/badge/shared/badge-assets-server";
import { APP_DISPLAY_NAME } from "@/lib/brand";
import { resolvePublicSiteOrigin } from "@/lib/public-site-origin";
import { resolveInviteOgBadgeImageUrl } from "@/lib/share-invites/invite-og-badge-image";
import {
  achievementShareInviteOgImagePath,
  achievementShareInvitePath,
  userAchievementDetail,
  userCollection,
} from "@/lib/routes";
import { getSharedAchievement } from "@/lib/achievements/application/share-invite";
import { AtomicLabeledText } from "@/components/ui/atomic-labeled-text";
import { clampNickname } from "@/lib/ui/dynamic-text";
import { ShareInviteClaimPanel } from "./share-invite-claim-panel";
import { achievementToViewModel } from "@/lib/achievements/presentation/collection-view-models";

type PageProps = {
  params: Promise<{ token: string }>;
};

function buildInviteMetadata(args: {
  title: string;
  description: string;
  pageUrl?: string;
  ogImageUrl?: string;
}) {
  const ogImage = args.ogImageUrl
    ? [
        {
          url: args.ogImageUrl,
          width: 1200,
          height: 630,
          type: "image/png" as const,
          alt: args.title,
        },
      ]
    : undefined;

  return {
    title: args.title,
    description: args.description,
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      title: args.title,
      description: args.description,
      siteName: APP_DISPLAY_NAME,
      url: args.pageUrl,
      images: ogImage,
    },
    twitter: {
      card: ogImage ? ("summary_large_image" as const) : "summary",
      title: args.title,
      description: args.description,
      images: args.ogImageUrl ? [args.ogImageUrl] : undefined,
    },
  } satisfies Metadata;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const result = await getSharedAchievement(token);
  const origin = await resolvePublicSiteOrigin();

  if (result.isErr()) {
    return buildInviteMetadata({
      title: "Achievement invite unavailable",
      description: "This shared achievement invite is no longer available.",
    });
  }

  const { invite, snapshot, senderDisplayName, ownerDisplayName } = result.value;
  const pageKind = invite.share_kind;
  const title = snapshot.title?.trim() || snapshot.category?.trim() || "Achievement invite";
  const description =
    snapshot.description?.trim() ||
    (pageKind === "showcase"
      ? `An achievement from ${ownerDisplayName}'s collection.`
      : pageKind === "collaborate"
        ? `${senderDisplayName} invited you to collaborate on an achievement.`
        : `${senderDisplayName} shared an achievement waiting in your collection.`);

  const pageUrl = origin ? `${origin}${achievementShareInvitePath(token)}` : undefined;
  const ogImageUrl = origin
    ? `${origin}${achievementShareInviteOgImagePath(token)}`
    : resolveInviteOgBadgeImageUrl(snapshot.icon_url) ?? undefined;

  return buildInviteMetadata({
    title: `${title} | ${APP_DISPLAY_NAME}`,
    description,
    pageUrl,
    ogImageUrl,
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
  const result = await getSharedAchievement(token);

  if (result.isErr()) {
    return <InviteUnavailableState claimed={false} />;
  }

  const {
    invite,
    snapshot,
    senderDisplayName,
    ownerUserId,
    ownerDisplayName,
  } = result.value;

  const pageKind = invite.share_kind;
  const ownerDetailPath = userAchievementDetail(ownerUserId, invite.source_achievement_id);
  const collectionOwnerPath = userCollection(ownerUserId);
  const inviteBadge = achievementToViewModel(snapshot);
  const signedModelUrl = inviteBadge.model
    ? await createSignedBadgeModelUrl(inviteBadge.model.assetPath)
    : null;

  const byline =
    pageKind === "showcase"
      ? {
          label: "by",
          href: collectionOwnerPath,
          name: clampNickname(ownerDisplayName),
          nameClass: "text-emerald-200/90",
        }
      : pageKind === "collaborate"
        ? {
            label: "in collaboration w/",
            href: userCollection(invite.sender_user_id),
            name: clampNickname(senderDisplayName),
            nameClass: "text-amber-200/95",
          }
        : {
            label: "dedicated by",
            href: userCollection(invite.sender_user_id),
            name: clampNickname(senderDisplayName),
            nameClass: "text-amber-200/95",
          };

  if (invite.status !== "pending") {
    return <InviteUnavailableState claimed={invite.status === "claimed"} />;
  }

  return (
    <main className="min-h-screen bg-[#14121c] px-6 py-10 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl flex-col items-center justify-center">
        <div className="w-full rounded-[2.25rem] border border-white/10 bg-[rgba(20,18,28,0.9)] px-6 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.36)] backdrop-blur-xl sm:px-8">
          <div className="mx-auto h-[18rem] w-full max-w-[18rem]">
            <div className="relative h-full w-full">
              {inviteBadge.renderSrc ? (
                <Badge
                  options={badgeOptionsForInvite({
                    inviteId: invite.id,
                    displaySrc: inviteBadge.renderSrc,
                    model: inviteBadge.model,
                    signedModelUrl,
                  })}
                />
              ) : null}
            </div>
          </div>

          <div className="mt-6 text-center">
            {snapshot.category?.trim() ? (
              <p className="text-xs uppercase tracking-[0.24em] text-white/38">
                {snapshot.category}
              </p>
            ) : null}
            {snapshot.title?.trim() ? (
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                {snapshot.title}
              </h1>
            ) : null}
            {snapshot.description?.trim() ? (
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/68">
                {snapshot.description}
              </p>
            ) : null}
            {snapshot.achieved_at ? (
              <p className="mt-4 text-sm text-white/48">
                {formatAchievedAt(snapshot.achieved_at)}
              </p>
            ) : null}
          </div>

          <AtomicLabeledText
            prefix={byline.label}
            className="mt-5 text-xs leading-snug text-white/55"
          >
            <Link
              href={byline.href}
              className={`font-semibold ${byline.nameClass} underline-offset-2 hover:underline`}
            >
              {byline.name}
            </Link>
          </AtomicLabeledText>

          <div className="mt-6 flex justify-center">
            <ShareInviteClaimPanel
              token={token}
              senderUserId={invite.sender_user_id}
              inviteStatus={invite.status}
              ownerDetailPath={ownerDetailPath}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

