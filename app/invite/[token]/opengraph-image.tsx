import { ImageResponse } from "next/og";

import {
  fetchInviteOgBadgeImageDataUrl,
  resolveInviteOgBadgeImageUrl,
} from "@/lib/share-invites/invite-og-badge-image";
import { getSharedAchievement } from "@/lib/achievements/application/share-invite";
import { achievementToViewModel } from "@/lib/achievements/presentation/collection-view-models";
import { clampNickname, labeledValueStacks } from "@/lib/ui/dynamic-text";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

type ImageProps = {
  params: Promise<{ token: string }>;
};

function OgUnavailableCard({ message }: { message: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#14121c",
        color: "#f5f3ff",
        fontSize: 42,
        fontWeight: 600,
      }}
    >
      {message}
    </div>
  );
}

export default async function Image({ params }: ImageProps) {
  const { token } = await params;
  const result = await getSharedAchievement(token);

  if (result.isErr()) {
    return new ImageResponse(<OgUnavailableCard message="Shared achievement unavailable" />, size);
  }

  const {
    invite,
    snapshot,
    senderDisplayName,
    ownerDisplayName,
  } = result.value;

  const pageKind = invite.share_kind;
  const title = snapshot.title?.trim() || snapshot.category?.trim() || "Achievement invite";
  const description =
    snapshot.description?.trim() ||
    (pageKind === "showcase"
      ? `An achievement from ${ownerDisplayName}'s collection.`
      : pageKind === "collaborate"
        ? `${senderDisplayName} invited you to collaborate on an achievement.`
        : `${senderDisplayName} shared this for your collection.`);

  const badgeImageUrl = resolveInviteOgBadgeImageUrl(snapshot.icon_url);
  const badgeImageSrc = badgeImageUrl
    ? await fetchInviteOgBadgeImageDataUrl(badgeImageUrl)
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top, rgba(109, 96, 255, 0.18), transparent 42%), #14121c",
          color: "#f5f3ff",
          padding: "48px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            borderRadius: "40px",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(20,18,28,0.9)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.36)",
            padding: "48px",
          }}
        >
          <div
            style={{
              width: "320px",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "40px",
            }}
          >
            {badgeImageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={badgeImageSrc}
                alt=""
                width="300"
                height="300"
                style={{
                  width: "300px",
                  height: "300px",
                  display: "flex",
                  objectFit: "contain",
                }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  fontSize: 96,
                  lineHeight: 1,
                  color: "rgba(245,243,255,0.28)",
                }}
              >
                ✦
              </div>
            )}
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            {snapshot.category?.trim() ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 18,
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  color: "rgba(245,243,255,0.42)",
                }}
              >
                {snapshot.category}
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                marginTop: "18px",
                fontSize: 56,
                fontWeight: 700,
                lineHeight: 1.08,
              }}
            >
              {title}
            </div>

            <div
              style={{
                display: "flex",
                marginTop: "18px",
                fontSize: 26,
                lineHeight: 1.45,
                color: "rgba(245,243,255,0.72)",
                maxWidth: "620px",
              }}
            >
              {description}
            </div>

            <OgByline
              prefix={
                pageKind === "showcase"
                  ? "by"
                  : pageKind === "collaborate"
                    ? "in collaboration w/"
                    : "dedicated by"
              }
              name={clampNickname(
                pageKind === "showcase" ? ownerDisplayName : senderDisplayName,
              )}
              nameColor={
                pageKind === "showcase"
                  ? "rgba(167,243,208,0.9)"
                  : "rgba(253,230,138,0.92)"
              }
            />
          </div>
        </div>
      </div>
    ),
    size,
  );
}

function OgByline({
  prefix,
  name,
  nameColor,
}: {
  prefix: string;
  name: string;
  nameColor: string;
}) {
  const stacks = labeledValueStacks({
    prefix,
    value: name,
    lineWidthPx: 648,
    fontSizePx: 20,
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: stacks ? "column" : "row",
        alignItems: stacks ? "flex-start" : "center",
        marginTop: "26px",
        fontSize: 20,
        gap: stacks ? "4px" : "0.35em",
      }}
    >
      <span style={{ color: "rgba(245,243,255,0.55)" }}>{prefix}</span>
      <span style={{ color: nameColor }}>{name}</span>
    </div>
  );
}
