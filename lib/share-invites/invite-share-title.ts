type InviteTitleSource = {
  title?: string | null;
  category?: string | null;
};

export function resolveInviteShareTitle(
  invite: InviteTitleSource,
  fallback = "Achievement invite",
): string {
  return invite.title?.trim() || invite.category?.trim() || fallback;
}

export function resolveInviteOgImageTitle(
  invite: InviteTitleSource,
  fallback = "Shared achievement",
): string {
  return invite.title?.trim() || invite.category?.trim() || fallback;
}
