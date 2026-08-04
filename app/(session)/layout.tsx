import type { ReactNode } from "react";

import { requireSessionUser } from "@/lib/auth/require-session-user";

export default async function SessionLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSessionUser();
  return children;
}
