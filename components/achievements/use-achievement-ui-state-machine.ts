"use client";

import { useCallback, useMemo, useReducer } from "react";

type OverlayState = "closed" | "create" | "detail-view" | "detail-edit";

type UiState = {
  overlay: OverlayState;
  detailAchievementId: string | null;
  deleteConfirmId: string | null;
  discardEditConfirmOpen: boolean;
};

type UiAction =
  | { type: "open-create" }
  | { type: "open-detail-view"; achievementId: string }
  | { type: "enter-detail-edit" }
  | { type: "exit-detail-edit" }
  | { type: "close-overlay" }
  | { type: "request-delete"; achievementId: string }
  | { type: "clear-delete" }
  | { type: "request-discard-edit" }
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
        discardEditConfirmOpen: false,
      };
    case "request-delete":
      return { ...state, deleteConfirmId: action.achievementId };
    case "clear-delete":
      return { ...state, deleteConfirmId: null };
    case "request-discard-edit":
      return { ...state, discardEditConfirmOpen: true };
    case "clear-discard-edit":
      return { ...state, discardEditConfirmOpen: false };
    default:
      return state;
  }
}

export function useAchievementUiStateMachine() {
  const [state, dispatch] = useReducer(reduceUiState, {
    overlay: "closed",
    detailAchievementId: null,
    deleteConfirmId: null,
    discardEditConfirmOpen: false,
  });

  const isCreating = state.overlay === "create";
  const detailMode: "view" | "edit" = state.overlay === "detail-edit" ? "edit" : "view";
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

  const requestDiscardEdit = useCallback(() => {
    dispatch({ type: "request-discard-edit" });
  }, []);

  const clearDiscardEdit = useCallback(() => {
    dispatch({ type: "clear-discard-edit" });
  }, []);

  const actions: AchievementUiStateActions = useMemo(
    () => ({
      openCreate,
      openDetailView,
      enterDetailEdit,
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
      detailAchievementId: state.detailAchievementId,
      deleteConfirmId: state.deleteConfirmId,
      discardEditConfirmOpen: state.discardEditConfirmOpen,
      achievementOverlayOpen,
      actions,
    }),
    [
      actions,
      achievementOverlayOpen,
      detailMode,
      isCreating,
      state.deleteConfirmId,
      state.discardEditConfirmOpen,
      state.detailAchievementId,
    ],
  );
}

export type AchievementUiStateMachine = ReturnType<typeof useAchievementUiStateMachine>;
export type AchievementUiStateActions = {
  openCreate: () => void;
  openDetailView: (achievementId: string) => void;
  enterDetailEdit: () => void;
  exitDetailEdit: () => void;
  closeOverlay: () => void;
  requestDelete: (achievementId: string) => void;
  clearDelete: () => void;
  requestDiscardEdit: () => void;
  clearDiscardEdit: () => void;
};
