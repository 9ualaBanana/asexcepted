import type { ReactNode } from "react";

import { DedicationByline } from "@/components/achievements/dedication/dedication-byline";
import {
  achievementBadgeChromeWidth,
  achievementDialogChromeInset,
  achievementDialogIconSideSlot,
} from "@/components/achievements/achievement-editor-shared";
import { cn } from "@/lib/utils";

const chromeSideSpacer = (
  <span className="inline-flex h-10 w-10 shrink-0" aria-hidden />
);

type DedicationBylineChromeRowProps = {
  senderUserId: string;
  senderDisplayName?: string | null;
  senderNameLoading?: boolean;
  startSlot?: ReactNode;
  endSlot?: ReactNode;
  className?: string;
};

/**
 * Same three-column chrome as the achievement detail panel: optional side actions
 * with “dedicated by …” centered (where public/private sits in visibility edit).
 */
export function DedicationBylineChromeRow({
  senderUserId,
  senderDisplayName,
  senderNameLoading = false,
  startSlot,
  endSlot,
  className,
}: DedicationBylineChromeRowProps) {
  return (
    <div
      className={cn(
        achievementBadgeChromeWidth,
        achievementDialogChromeInset,
        "mt-3 flex min-h-10 items-center",
        className,
      )}
    >
      <div className={cn(achievementDialogIconSideSlot, "justify-start")}>
        {startSlot ?? chromeSideSpacer}
      </div>
      <div className="flex min-w-0 flex-1 justify-center">
        <DedicationByline
          senderUserId={senderUserId}
          senderDisplayName={senderDisplayName}
          senderNameLoading={senderNameLoading}
          className="mt-0 px-1"
        />
      </div>
      <div className={cn(achievementDialogIconSideSlot, "justify-end")}>
        {endSlot ?? chromeSideSpacer}
      </div>
    </div>
  );
}
