import { ImageResponse } from "next/og";

import { resolveInviteOgImageTitle } from "@/lib/share-invites/invite-share-title";
import {
  fetchInviteOgBadgeImageDataUrl,
  resolveInviteOgBadgeImageUrl,
} from "@/lib/share-invites/invite-og-badge-image";
import {
  getAchievementShareInviteKind,
  getAchievementShareInvitePresentationByToken,
} from "@/lib/share-invites/server";

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
  const result = await getAchievementShareInvitePresentationByToken(token);

  if (result.isErr()) {
    return new ImageResponse(<OgUnavailableCard message="Shared achievement unavailable" />, size);
  }

  const {
    invite,
    senderDisplayName: rawSenderName,
    collectionOwnerDisplayName: rawOwnerName,
  } = result.value;
  const senderDisplayName = rawSenderName.trim() || "Someone";
  const collectionOwnerName = rawOwnerName?.trim() || senderDisplayName;
  const pageKind = getAchievementShareInviteKind(invite);
  const title = resolveInviteOgImageTitle(invite);
  const description =
    invite.description?.trim() ||
    (pageKind === "showcase"
      ? `An achievement from ${collectionOwnerName}'s collection.`
      : `${senderDisplayName} shared this for your collection.`);

  const badgeImageUrl = resolveInviteOgBadgeImageUrl(invite);
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
            {invite.category?.trim() ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 18,
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  color: "rgba(245,243,255,0.42)",
                }}
              >
                {invite.category}
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

            <div
              style={{
                display: "flex",
                marginTop: "26px",
                fontSize: 20,
                alignItems: "center",
                gap: "0.35em",
              }}
            >
              <span style={{ color: "rgba(245,243,255,0.55)" }}>
                {pageKind === "showcase" ? "by" : "dedicated by"}
              </span>
              <span
                style={{
                  color:
                    pageKind === "showcase"
                      ? "rgba(167,243,208,0.9)"
                      : "rgba(253,230,138,0.92)",
                }}
              >
                {pageKind === "showcase" ? collectionOwnerName : senderDisplayName}
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
