import { createHmac, timingSafeEqual } from "node:crypto";

export type EmbedBadgeTokenPayload = {
  achievementId: string;
};

const TOKEN_PREFIX = "v1";

function base64UrlEncode(data: string | Buffer): string {
  return Buffer.from(typeof data === "string" ? data : data)
    .toString("base64url");
}

function base64UrlDecodeToBuffer(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

export function mintEmbedBadgeToken(secret: string, achievementId: string): string {
  const inner = JSON.stringify({ v: 1, i: achievementId });
  const payloadB = base64UrlEncode(inner);
  const sig = createHmac("sha256", secret).update(payloadB).digest();
  const sigB = base64UrlEncode(sig);
  return `${TOKEN_PREFIX}.${payloadB}.${sigB}`;
}

export function verifyEmbedBadgeToken(
  secret: string,
  token: string,
): EmbedBadgeTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) return null;
  const [, payloadB, sigB] = parts;
  if (!payloadB || !sigB) return null;

  const expectedSig = createHmac("sha256", secret).update(payloadB).digest();
  let providedSig: Buffer;
  try {
    providedSig = base64UrlDecodeToBuffer(sigB);
  } catch {
    return null;
  }
  if (expectedSig.length !== providedSig.length) return null;
  if (!timingSafeEqual(expectedSig, providedSig)) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(base64UrlDecodeToBuffer(payloadB).toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
  const keys = Object.keys(parsed).sort().join(",");
  if (keys !== "i,v") return null;
  if (parsed.v !== 1 || typeof parsed.i !== "string") return null;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.i)
  ) {
    return null;
  }

  return { achievementId: parsed.i };
}
