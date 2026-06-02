/** POST /api/embed/badge-token */
export type MintEmbedBadgeTokenRequestBody = {
  achievementId?: string;
};

export type MintEmbedBadgeTokenSuccessBody = {
  embedUrl: string;
};

export type MintEmbedBadgeTokenErrorJson = {
  error: string;
};
