import { clampNickname } from "@/lib/ui/dynamic-text";

/** Readable label for a profile row (directory display name, else short id). */
export function profileListLabel(row: { user_id: string; display_name: string | null }) {
  const d = clampNickname(row.display_name ?? "");
  if (d) return d;
  const id = row.user_id;
  if (id.length >= 8) return `User ${id.slice(0, 8)}…`;
  return "User";
}
