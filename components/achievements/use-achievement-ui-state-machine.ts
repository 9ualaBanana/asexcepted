"use client";

import { useCallback, useMemo, useReducer } from "react";

type OverlayState =
  | "closed"
  | "create"
  | "detail-view"
  | "detail-edit"
  | "detail-visibility-edit";

export type DiscardEditIntent = "back" | "close";

type UiState = {
  overlay: OverlayState;
  detailAchievementId: string | null;
  deleteConfirmId: string | null;
  discardEditIntent: DiscardEditIntent | null;
};

type UiAction =
  | { type: "open-create" }
  | { type: "open-detail-view"; achievementId: string }
  | { type: "enter-detail-edit" }
  | { type: "enter-detail-visibility-edit" }
  | { type: "exit-detail-edit" }
  | { type: "close-overlay" }
  | { type: "request-delete"; achievementId: string }
  | { type: "clear-delete" }
  | { type: "request-discard-edit"; intent: DiscardEditIntent }
  | { type: "clear-discard-edit" };

function reduceUiState(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case "open-create":
      return {
        ...state,
        overlay: "create",
        detailAchievementId: null,
      };
    case "open-detail-view":
      return {
        ...state,
        overlay: "detail-view",
        detailAchievementId: action.achievementId,
      };
    case "enter-detail-edit":
      if (!state.detailAchievementId) return state;
      return { ...state, overlay: "detail-edit" };
    case "enter-detail-visibility-edit":
      if (!state.detailAchievementId) return state;
      return { ...state, overlay: "detail-visibility-edit" };
    case "exit-detail-edit":
      if (!state.detailAchievementId) {
        return { ...state, overlay: "closed" };
      }
      return { ...state, overlay: "detail-view" };
    case "close-overlay":
      return {
        ...state,
        overlay: "closed",
        detailAchievementId: null,
        discardEditIntent: null,
      };
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
    detailAchievementId: null,
    deleteConfirmId: null,
    discardEditIntent: null,
  });

  const isCreating = state.overlay === "create";
  const isVisibilityOnlyEdit = state.overlay === "detail-visibility-edit";
  const detailMode: "view" | "edit" =
    state.overlay === "detail-edit" || isVisibilityOnlyEdit ? "edit" : "view";
  const achievementOverlayOpen = state.overlay !== "closed";

  const openCreate = useCallback(() => {
    dispatch({ type: "open-create" });
  }, []);

  const openDetailView = useCallback((achievementId: string) => {
    dispatch({ type: "open-detail-view", achievementId });
  }, []);

  const enterDetailEdit = useCallback(() => {
    dispatch({ type: "enter-detail-edit" });
  }, []);

  const enterDetailVisibilityEdit = useCallback(() => {
    dispatch({ type: "enter-detail-visibility-edit" });
  }, []);

  const exitDetailEdit = useCallback(() => {
    dispatch({ type: "exit-detail-edit" });
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
      requestDelete,
      requestDiscardEdit,
    ],
  );

  return useMemo(
    () => ({
      isCreating,
      detailMode,
      isVisibilityOnlyEdit,
      detailAchievementId: state.detailAchievementId,
      deleteConfirmId: state.deleteConfirmId,
      discardEditIntent: state.discardEditIntent,
      achievementOverlayOpen,
      actions,
    }),
    [
      actions,
      achievementOverlayOpen,
      detailMode,
      isVisibilityOnlyEdit,
      isCreating,
      state.deleteConfirmId,
      state.discardEditIntent,
      state.detailAchievementId,
    ],
  );
}

export type AchievementUiStateMachine = ReturnType<typeof useAchievementUiStateMachine>;
export type AchievementUiStateActions = {
  openCreate: () => void;
  openDetailView: (achievementId: string) => void;
  enterDetailEdit: () => void;
  enterDetailVisibilityEdit: () => void;
  exitDetailEdit: () => void;
  closeOverlay: () => void;
  requestDelete: (achievementId: string) => void;
  clearDelete: () => void;
  requestDiscardEdit: (intent: DiscardEditIntent) => void;
  clearDiscardEdit: () => void;
};
