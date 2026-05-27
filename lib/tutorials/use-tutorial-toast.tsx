"use client";

import { useEffect, type ReactNode } from "react";

import { TutorialToast } from "@/components/tutorials/tutorial-toast";
import { toast } from "@/lib/toast";
import type { TutorialDefinition } from "@/lib/tutorials/registry";

type UseTutorialToastArgs = {
  tutorial: TutorialDefinition;
  active: boolean;
  onDismiss: () => void;
  render?: (args: { visible: boolean; onDismiss: () => void }) => ReactNode;
};

export function useTutorialToast({
  tutorial,
  active,
  onDismiss,
  render,
}: UseTutorialToastArgs) {
  useEffect(() => {
    const id = `tutorial:${tutorial.id}`;

    if (!active) {
      toast.dismiss(id);
      return;
    }

    const dismiss = () => {
      toast.dismiss(id);
      onDismiss();
    };

    toast.custom(
      (t) => (
        <>
          {render ? (
            render({ visible: t.visible, onDismiss: dismiss })
          ) : (
            <TutorialToast
              message={tutorial.message}
              visible={t.visible}
              onDismiss={dismiss}
            />
          )}
        </>
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
  }, [active, onDismiss, render, tutorial]);
}
