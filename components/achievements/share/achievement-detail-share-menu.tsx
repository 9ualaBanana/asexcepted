"use client";

import { Code2, Gift, Loader2, Share2 } from "lucide-react";

import { ACHIEVEMENT_UI_COPY } from "@/components/achievements/share/achievement-ui-copy";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BubbleButton,
  type BubbleButtonMotion,
} from "@/components/ui/bubble-button";

type AchievementDetailShareMenuProps = {
  disabled?: boolean;
  busy?: boolean;
  showDedicateOption?: boolean;
  dedicateDisabledReason?: string | null;
  showEmbedOption?: boolean;
  showcaseDisabledReason?: string | null;
  motion?: BubbleButtonMotion | null;
  index?: number;
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
  motion,
  index = 0,
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
        <BubbleButton
          aria-label="Share achievement"
          className="data-[state=open]:bg-white/10"
          motion={motion}
          index={index}
          disabled={isDisabled}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Share2 className="h-4 w-4" aria-hidden />
          )}
        </BubbleButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="left"
        className="z-[250] min-w-[11rem]"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <DropdownMenuItem
          disabled={isDisabled || showcaseBlocked}
          title={
            showcaseBlocked ? (showcaseDisabledReason ?? undefined) : undefined
          }
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
            title={
              dedicateBlocked
                ? (dedicateDisabledReason ?? undefined)
                : undefined
            }
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
