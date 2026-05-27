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
  onShareShowcase: () => void;
  onDedicateInvite: () => void;
  onEmbed: () => void;
};

export function AchievementDetailShareMenu({
  disabled = false,
  busy = false,
  onShareShowcase,
  onDedicateInvite,
  onEmbed,
}: AchievementDetailShareMenuProps) {
  const isDisabled = disabled || busy;

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
          disabled={isDisabled}
          onSelect={() => {
            onShareShowcase();
          }}
        >
          <Share2 className="h-4 w-4" aria-hidden />
          {ACHIEVEMENT_UI_COPY.shareMenuShowcase}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isDisabled}
          onSelect={() => {
            onDedicateInvite();
          }}
        >
          <Gift className="h-4 w-4" aria-hidden />
          {ACHIEVEMENT_UI_COPY.shareMenuDedicate}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isDisabled}
          onSelect={() => {
            onEmbed();
          }}
        >
          <Code2 className="h-4 w-4" aria-hidden />
          {ACHIEVEMENT_UI_COPY.shareMenuEmbed}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
