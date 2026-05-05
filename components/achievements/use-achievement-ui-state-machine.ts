"use client";

import { useCallback, useMemo, useReducer } from "react";

type OverlayState = "closed" | "create" | "detail-view" | "detail-edit";

type UiState = {
  overlay: OverlayState;
  detailAchievementId: string | null;
  deleteConfirmId: string | null;
};

type UiAction =
  | { type: "open-create" }
  | { type: "open-detail-view"; achievementId: string }
  | { type: "enter-detail-edit" }
  | { type: "exit-detail-edit" }
  | { type: "close-overlay" }
  | { type: "request-delete"; achievementId: string }
  | { type: "clear-delete" };

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
      };
    case "request-delete":
      return { ...state, deleteConfirmId: action.achievementId };
    case "clear-delete":
      return { ...state, deleteConfirmId: null };
    default:
      return state;
  }
}

export function useAchievementUiStateMachine() {
  const [state, dispatch] = useReducer(reduceUiState, {
    overlay: "closed",
    detailAchievementId: null,
    deleteConfirmId: null,
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

  return useMemo(
    () => ({
      isCreating,
      detailMode,
      detailAchievementId: state.detailAchievementId,
      deleteConfirmId: state.deleteConfirmId,
      achievementOverlayOpen,
      openCreate,
      openDetailView,
      enterDetailEdit,
      exitDetailEdit,
      closeOverlay,
      requestDelete,
      clearDelete,
    }),
    [
      achievementOverlayOpen,
      clearDelete,
      closeOverlay,
      detailMode,
      enterDetailEdit,
      exitDetailEdit,
      isCreating,
      openCreate,
      openDetailView,
      requestDelete,
      state.deleteConfirmId,
      state.detailAchievementId,
    ],
  );
}

export type AchievementUiStateMachine = ReturnType<typeof useAchievementUiStateMachine>;
