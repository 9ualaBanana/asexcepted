"use client";

import { useCallback, useMemo, useReducer } from "react";

import type {
  DomRectLite,
  OverlayPhase,
  OverlayTransitionState,
} from "@/lib/achievements/ui/overlay-transition";
import {
  isOverlayTransitionMotionEnabled,
  overlayMotionFromOrigin,
} from "@/lib/achievements/ui/overlay-transition";

type OverlayState =
  | "closed"
  | "create"
  | "detail-view"
  | "detail-edit"
  | "dedicated-detail-edit";

export type DiscardEditIntent = "back" | "close";

type UiState = {
  overlay: OverlayState;
  overlayPhase: OverlayPhase;
  overlayOriginRect: DomRectLite | null;
  detailAchievementId: string | null;
  detailViewSessionKey: number;
  deleteConfirmId: string | null;
  discardEditIntent: DiscardEditIntent | null;
};

type UiAction =
  | { type: "open-create"; originRect: DomRectLite | null }
  | {
      type: "open-detail-view";
      achievementId: string;
      originRect: DomRectLite | null;
    }
  | { type: "enter-detail-edit" }
  | { type: "enter-dedicated-detail-edit" }
  | { type: "exit-detail-edit" }
  | { type: "settle-overlay-open" }
  | { type: "request-close-overlay" }
  | { type: "settle-overlay-close" }
  | { type: "close-overlay" }
  | { type: "request-delete"; achievementId: string }
  | { type: "clear-delete" }
  | { type: "request-discard-edit"; intent: DiscardEditIntent }
  | { type: "clear-discard-edit" };

function closedOverlayState(state: UiState): UiState {
  return {
    ...state,
    overlay: "closed",
    overlayPhase: "open",
    overlayOriginRect: null,
    detailAchievementId: null,
    discardEditIntent: null,
  };
}

function openOverlayPhase(): OverlayPhase {
  return isOverlayTransitionMotionEnabled() ? "opening" : "open";
}

function openOverlayOriginRect(
  originRect: DomRectLite | null,
): DomRectLite | null {
  return isOverlayTransitionMotionEnabled() ? originRect : null;
}

function reduceUiState(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case "open-create":
      return {
        ...state,
        overlay: "create",
        overlayPhase: openOverlayPhase(),
        overlayOriginRect: openOverlayOriginRect(action.originRect),
        detailAchievementId: null,
        discardEditIntent: null,
      };
    case "open-detail-view":
      return {
        ...state,
        overlay: "detail-view",
        overlayPhase: openOverlayPhase(),
        overlayOriginRect: openOverlayOriginRect(action.originRect),
        detailAchievementId: action.achievementId,
        detailViewSessionKey: state.detailViewSessionKey + 1,
        discardEditIntent: null,
      };
    case "enter-detail-edit":
      if (!state.detailAchievementId) return state;
      return { ...state, overlay: "detail-edit", overlayPhase: "open" };
    case "enter-dedicated-detail-edit":
      if (!state.detailAchievementId) return state;
      return {
        ...state,
        overlay: "dedicated-detail-edit",
        overlayPhase: "open",
      };
    case "exit-detail-edit":
      if (!state.detailAchievementId) {
        return {
          ...state,
          overlay: "closed",
          overlayPhase: "open",
          overlayOriginRect: null,
          discardEditIntent: null,
        };
      }
      return {
        ...state,
        overlay: "detail-view",
        overlayPhase: "open",
        detailViewSessionKey: state.detailViewSessionKey + 1,
      };
    case "settle-overlay-open":
      if (state.overlay === "closed" || state.overlayPhase !== "opening") {
        return state;
      }
      return { ...state, overlayPhase: "open" };
    case "request-close-overlay":
      if (state.overlay === "closed") return state;
      if (!isOverlayTransitionMotionEnabled()) {
        return closedOverlayState(state);
      }
      if (state.overlayPhase === "closing") return state;
      return { ...state, overlayPhase: "closing", discardEditIntent: null };
    case "settle-overlay-close":
    case "close-overlay":
      return closedOverlayState(state);
    case "request-delete":
      return { ...state, deleteConfirmId: action.achievementId };
    case "clear-delete":
      return { ...state, deleteConfirmId: null };
    case "request-discard-edit":
      return { ...state, discardEditIntent: action.intent };
    case "clear-discard-edit":
      return { ...state, discardEditIntent: null };
    default:
      return state;
  }
}

export function useAchievementUiStateMachine() {
  const [state, dispatch] = useReducer(reduceUiState, {
    overlay: "closed",
    overlayPhase: "open",
    overlayOriginRect: null,
    detailAchievementId: null,
    detailViewSessionKey: 0,
    deleteConfirmId: null,
    discardEditIntent: null,
  });

  const isCreating = state.overlay === "create";
  const isVisibilityOnlyEdit = state.overlay === "dedicated-detail-edit";
  const detailMode: "view" | "edit" =
    state.overlay === "detail-edit" || isVisibilityOnlyEdit ? "edit" : "view";
  const achievementOverlayOpen = state.overlay !== "closed";

  const openCreate = useCallback((originRect: DomRectLite | null) => {
    dispatch({ type: "open-create", originRect });
  }, []);

  const openDetailView = useCallback(
    (achievementId: string, originRect: DomRectLite | null) => {
      dispatch({ type: "open-detail-view", achievementId, originRect });
    },
    [],
  );

  const enterDetailEdit = useCallback(() => {
    dispatch({ type: "enter-detail-edit" });
  }, []);

  const enterDetailVisibilityEdit = useCallback(() => {
    dispatch({ type: "enter-dedicated-detail-edit" });
  }, []);

  const exitDetailEdit = useCallback(() => {
    dispatch({ type: "exit-detail-edit" });
  }, []);

  const settleOverlayOpen = useCallback(() => {
    dispatch({ type: "settle-overlay-open" });
  }, []);

  const requestCloseOverlay = useCallback(() => {
    dispatch({ type: "request-close-overlay" });
  }, []);

  const settleOverlayClose = useCallback(() => {
    dispatch({ type: "settle-overlay-close" });
  }, []);

  const closeOverlay = useCallback(() => {
    dispatch({ type: "close-overlay" });
  }, []);

  const requestDelete = useCallback((achievementId: string) => {
    dispatch({ type: "request-delete", achievementId });
  }, []);

  const clearDelete = useCallback(() => {
    dispatch({ type: "clear-delete" });
  }, []);

  const requestDiscardEdit = useCallback((intent: DiscardEditIntent) => {
    dispatch({ type: "request-discard-edit", intent });
  }, []);

  const clearDiscardEdit = useCallback(() => {
    dispatch({ type: "clear-discard-edit" });
  }, []);

  const actions: AchievementUiStateActions = useMemo(
    () => ({
      openCreate,
      openDetailView,
      enterDetailEdit,
      enterDetailVisibilityEdit,
      exitDetailEdit,
      settleOverlayOpen,
      requestCloseOverlay,
      settleOverlayClose,
      closeOverlay,
      requestDelete,
      clearDelete,
      requestDiscardEdit,
      clearDiscardEdit,
    }),
    [
      clearDelete,
      clearDiscardEdit,
      closeOverlay,
      enterDetailEdit,
      enterDetailVisibilityEdit,
      exitDetailEdit,
      openCreate,
      openDetailView,
      requestCloseOverlay,
      requestDelete,
      requestDiscardEdit,
      settleOverlayClose,
      settleOverlayOpen,
    ],
  );

  return useMemo(() => {
    const overlayTransition: OverlayTransitionState = {
      phase: achievementOverlayOpen ? state.overlayPhase : null,
      motion: overlayMotionFromOrigin(state.overlayOriginRect),
      originRect: state.overlayOriginRect,
    };
    return {
      isCreating,
      detailMode,
      isVisibilityOnlyEdit,
      detailAchievementId: state.detailAchievementId,
      detailViewSessionKey: state.detailViewSessionKey,
      deleteConfirmId: state.deleteConfirmId,
      discardEditIntent: state.discardEditIntent,
      achievementOverlayOpen,
      overlayTransition,
      actions,
    };
  }, [
    actions,
    achievementOverlayOpen,
    detailMode,
    isVisibilityOnlyEdit,
    isCreating,
    state.deleteConfirmId,
    state.discardEditIntent,
    state.detailAchievementId,
    state.detailViewSessionKey,
    state.overlayOriginRect,
    state.overlayPhase,
  ]);
}

export type AchievementUiStateActions = {
  openCreate: (originRect: DomRectLite | null) => void;
  openDetailView: (
    achievementId: string,
    originRect: DomRectLite | null,
  ) => void;
  enterDetailEdit: () => void;
  enterDetailVisibilityEdit: () => void;
  exitDetailEdit: () => void;
  settleOverlayOpen: () => void;
  requestCloseOverlay: () => void;
  settleOverlayClose: () => void;
  closeOverlay: () => void;
  requestDelete: (achievementId: string) => void;
  clearDelete: () => void;
  requestDiscardEdit: (intent: DiscardEditIntent) => void;
  clearDiscardEdit: () => void;
};
