"use client";

import { AddToHomeScreenInstructions } from "@/components/pwa/add-to-home-screen-instructions";
import { TutorialToast } from "@/components/tutorials/tutorial-toast";
import { APP_DISPLAY_NAME } from "@/lib/brand";

type PwaInstallTutorialToastProps = {
  visible?: boolean;
  onDismiss: () => void;
};

export function PwaInstallTutorialToast({
  visible = true,
  onDismiss,
}: PwaInstallTutorialToastProps) {
  return (
    <TutorialToast
      visible={visible}
      onDismiss={onDismiss}
      className="max-w-[min(100vw-2rem,22rem)]"
    >
      <p className="text-sm font-medium leading-snug text-white/92">
        Get inspiring push notifications when people you follow unlock achievements.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-white/68">
        On iPhone, add {APP_DISPLAY_NAME} to your home screen, then enable notifications
        in Profile settings:
      </p>
      <div className="mt-3">
        <AddToHomeScreenInstructions />
      </div>
    </TutorialToast>
  );
}
