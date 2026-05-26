import { ImageResponse } from "next/og";

import { APP_DISPLAY_NAME } from "@/lib/brand";
import { formatAchievedAt } from "@/components/achievements/achievement-editor-shared";
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

export default async function Image({ params }: ImageProps) {
  const { token } = await params;
  const result = await getAchievementShareInvitePresentationByToken(token);

  if (result.isErr()) {
    return new ImageResponse(
      (
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
          Shared achievement unavailable
        </div>
      ),
      size,
    );
  }

  const { invite, senderDisplayName } = result.value;
  const pageKind = getAchievementShareInviteKind(invite);
  const title = invite.title?.trim() || "Shared achievement";
  const category = invite.category?.trim() || null;
  const description =
    invite.description?.trim() ||
    (pageKind === "showcase"
      ? `${senderDisplayName} shared this from their collection.`
      : `${senderDisplayName} shared this for your collection.`);
  const achievedAtLabel = formatAchievedAt(invite.achieved_at);

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
          padding: "36px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: "1000px",
            minHeight: "558px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "40px",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(20,18,28,0.9)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 80px rgba(0,0,0,0.36)",
            padding: "40px 52px 36px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={invite.icon_url}
              alt=""
              width="248"
              height="248"
              style={{
                width: "248px",
                height: "248px",
                display: "flex",
                objectFit: "contain",
                filter: "drop-shadow(0 22px 46px rgba(0,0,0,0.34))",
              }}
            />
          </div>

          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              marginTop: "28px",
            }}
          >
            {category ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 15,
                  fontWeight: 500,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "rgba(245,243,255,0.45)",
                }}
              >
                {category}
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                marginTop: category ? "14px" : "6px",
                maxWidth: "720px",
                justifyContent: "center",
                textAlign: "center",
                fontSize: 46,
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
              }}
            >
              {title}
            </div>

            <div
              style={{
                display: "flex",
                marginTop: "18px",
                maxWidth: "760px",
                justifyContent: "center",
                textAlign: "center",
                fontSize: 22,
                lineHeight: 1.42,
                color: "rgba(245,243,255,0.72)",
              }}
            >
              {description}
            </div>

            {achievedAtLabel ? (
              <div
                style={{
                  display: "flex",
                  marginTop: "18px",
                  fontSize: 16,
                  color: "rgba(245,243,255,0.4)",
                }}
              >
                {achievedAtLabel}
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                marginTop: achievedAtLabel ? "20px" : "26px",
                fontSize: 18,
                color:
                  pageKind === "showcase"
                    ? "rgba(167,243,208,0.9)"
                    : "rgba(253,230,138,0.92)",
              }}
            >
              {pageKind === "showcase"
                ? `by ${senderDisplayName}`
                : `dedicated by ${senderDisplayName}`}
            </div>

            <div
              style={{
                display: "flex",
                marginTop: "8px",
                fontSize: 16,
                color: "rgba(245,243,255,0.34)",
              }}
            >
              {APP_DISPLAY_NAME}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

