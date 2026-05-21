"use client";

import { useCallback, useEffect, useState } from "react";

import {
  isTutorialCompleted,
  markTutorialCompleted,
} from "@/lib/tutorials/completed-store";
import type { TutorialId } from "@/lib/tutorials/registry";

export function useTutorial(tutorialId: TutorialId) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(!isTutorialCompleted(tutorialId));
  }, [tutorialId]);

  const dismiss = useCallback(() => {
    markTutorialCompleted(tutorialId);
    setActive(false);
  }, [tutorialId]);

  return { active, dismiss };
}
