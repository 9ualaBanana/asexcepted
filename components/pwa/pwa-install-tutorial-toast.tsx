"use client";

import { AddToHomeScreenInstallBlock } from "@/components/pwa/add-to-home-screen-instructions";
import { TutorialToast } from "@/components/tutorials/tutorial-toast";

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
      <div className="mt-3">
        <AddToHomeScreenInstallBlock variant="tutorial" />
      </div>
    </TutorialToast>
  );
}
