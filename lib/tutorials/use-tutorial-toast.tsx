"use client";

import { useEffect } from "react";

import { TutorialToast } from "@/components/tutorials/tutorial-toast";
import { toast } from "@/lib/toast";
import type { TutorialDefinition } from "@/lib/tutorials/registry";

type UseTutorialToastArgs = {
  tutorial: TutorialDefinition;
  active: boolean;
  onDismiss: () => void;
};

export function useTutorialToast({
  tutorial,
  active,
  onDismiss,
}: UseTutorialToastArgs) {
  useEffect(() => {
    const id = `tutorial:${tutorial.id}`;

    if (!active) {
      toast.dismiss(id);
      return;
    }

    toast.custom(
      (t) => (
        <TutorialToast
          message={tutorial.message}
          visible={t.visible}
          onDismiss={() => {
            toast.dismiss(id);
            onDismiss();
          }}
        />
      ),
      {
        id,
        duration: Infinity,
        position: "top-center",
      },
    );

    return () => {
      toast.dismiss(id);
    };
  }, [active, onDismiss, tutorial]);
}
