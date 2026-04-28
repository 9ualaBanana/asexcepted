import { NextResponse } from "next/server";

import { withVercelDeploymentProtectionBypassForEmbed } from "@/lib/embed-vercel-bypass-url";

type Context = {
  params: Promise<{ token: string }>;
};

export async function GET(request: Request, { params }: Context) {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken).trim();
  if (!token) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const target = new URL(`/embed/badge/${encodeURIComponent(token)}`, request.url).toString();
  const redirectUrl = withVercelDeploymentProtectionBypassForEmbed(target);
  return NextResponse.redirect(redirectUrl, 307);
}
