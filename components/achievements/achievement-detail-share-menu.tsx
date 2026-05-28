"use client";

import { Code2, Gift, Loader2, Share2 } from "lucide-react";

import { achievementDialogIconBtn } from "@/components/achievements/achievement-editor-shared";
import { ACHIEVEMENT_UI_COPY } from "@/components/achievements/achievement-ui-copy";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type AchievementDetailShareMenuProps = {
  disabled?: boolean;
  busy?: boolean;
  /** When false, Dedicate is hidden (received / claimed dedications). */
  showDedicateOption?: boolean;
  /** When set, Dedicate is disabled (e.g. 3D badge still uploading). */
  dedicateDisabledReason?: string | null;
  /** When false, embed copy is hidden (e.g. viewing someone else's achievement). */
  showEmbedOption?: boolean;
  /** When set, showcase share is disabled (e.g. badge still uploading). */
  showcaseDisabledReason?: string | null;
  onShareShowcase: () => void;
  onRequestDedicateInvite: () => void;
  onEmbed: () => void;
};

export function AchievementDetailShareMenu({
  disabled = false,
  busy = false,
  showDedicateOption = true,
  dedicateDisabledReason = null,
  showEmbedOption = true,
  showcaseDisabledReason = null,
  onShareShowcase,
  onRequestDedicateInvite,
  onEmbed,
}: AchievementDetailShareMenuProps) {
  const isDisabled = disabled || busy;
  const dedicateBlocked = Boolean(dedicateDisabledReason?.trim());
  const showcaseBlocked = Boolean(showcaseDisabledReason?.trim());

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Share achievement"
          className={cn(achievementDialogIconBtn, "data-[state=open]:bg-white/10")}
          disabled={isDisabled}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Share2 className="h-4 w-4" aria-hidden />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="left"
        className="z-[250] min-w-[11rem]"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <DropdownMenuItem
          disabled={isDisabled || showcaseBlocked}
          title={showcaseBlocked ? showcaseDisabledReason ?? undefined : undefined}
          onSelect={() => {
            if (showcaseBlocked) return;
            onShareShowcase();
          }}
        >
          <Share2 className="h-4 w-4" aria-hidden />
          {ACHIEVEMENT_UI_COPY.shareMenuShowcase}
        </DropdownMenuItem>
        {showDedicateOption ? (
          <DropdownMenuItem
            disabled={isDisabled || dedicateBlocked}
            title={dedicateBlocked ? dedicateDisabledReason ?? undefined : undefined}
            onSelect={() => {
              if (dedicateBlocked) return;
              onRequestDedicateInvite();
            }}
          >
            <Gift className="h-4 w-4" aria-hidden />
            {ACHIEVEMENT_UI_COPY.shareMenuDedicate}
          </DropdownMenuItem>
        ) : null}
        {showEmbedOption ? (
          <DropdownMenuItem
            disabled={isDisabled}
            onSelect={() => {
              onEmbed();
            }}
          >
            <Code2 className="h-4 w-4" aria-hidden />
            {ACHIEVEMENT_UI_COPY.shareMenuEmbed}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
