import { ImageResponse } from "next/og";

import { APP_DISPLAY_NAME } from "@/lib/brand";
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
  const description =
    invite.description?.trim() ||
    (pageKind === "showcase"
      ? `${senderDisplayName} shared this from their collection.`
      : `${senderDisplayName} shared this for your collection.`);

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
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "40px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={invite.icon_url}
              alt=""
              width="300"
              height="300"
              style={{
                width: "300px",
                height: "300px",
                display: "flex",
                objectFit: "contain",
                filter: "drop-shadow(0 18px 36px rgba(0,0,0,0.34))",
              }}
            />
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
                color: pageKind === "showcase" ? "rgba(167,243,208,0.9)" : "rgba(253,230,138,0.92)",
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
                fontSize: 18,
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

