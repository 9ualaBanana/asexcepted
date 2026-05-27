"use client";

import { useCallback, useState } from "react";

import { PwaInstallTutorialToast } from "@/components/pwa/pwa-install-tutorial-toast";
import { needsHomeScreenInstallForPush } from "@/lib/pwa/install-context";
import { getTutorial, TUTORIAL_IDS, useTutorial, useTutorialToast } from "@/lib/tutorials";

/**
 * One-time PWA install tutorial (iOS Safari, not standalone).
 * Arms on the user's first follow.
 */
export function usePwaInstallTutorial() {
  const tutorial = useTutorial(TUTORIAL_IDS.pwaInstall);
  const [armed, setArmed] = useState(false);
  const installRelevant = needsHomeScreenInstallForPush();

  const onFirstFollow = useCallback(() => {
    if (!installRelevant || !tutorial.active) return;
    setArmed(true);
  }, [installRelevant, tutorial.active]);

  const tutorialDefinition = getTutorial(TUTORIAL_IDS.pwaInstall);

  const renderToast = useCallback(
    ({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) => (
      <PwaInstallTutorialToast visible={visible} onDismiss={onDismiss} />
    ),
    [],
  );

  useTutorialToast({
    tutorial: tutorialDefinition,
    active: armed && tutorial.active && installRelevant,
    onDismiss: tutorial.dismiss,
    render: renderToast,
  });

  return { onFirstFollow };
}
