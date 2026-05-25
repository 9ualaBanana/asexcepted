"use client";

import { useCallback, useEffect, useReducer } from "react";

export type SocialView = "followers" | "following";

type UiMode = "browse" | "search" | "discovery";

type InspaUiState = {
  activeView: SocialView;
  mode: UiMode;
  query: string;
};

type InspaUiAction =
  | { type: "close-search"; zeroRelationshipMode: boolean }
  | { type: "open-search" }
  | { type: "set-query"; query: string }
  | { type: "sync-relationships"; zeroRelationshipMode: boolean }
  | { type: "toggle-view" };

const initialState: InspaUiState = {
  activeView: "following",
  mode: "browse",
  query: "",
};

function reducer(state: InspaUiState, action: InspaUiAction): InspaUiState {
  switch (action.type) {
    case "open-search":
      return { ...state, mode: "search" };
    case "close-search":
      return {
        ...state,
        mode: action.zeroRelationshipMode ? "discovery" : "browse",
        query: "",
      };
    case "set-query":
      return { ...state, query: action.query };
    case "toggle-view":
      if (state.mode !== "browse") return state;
      return {
        ...state,
        activeView: state.activeView === "following" ? "followers" : "following",
      };
    case "sync-relationships":
      if (action.zeroRelationshipMode) {
        if (state.mode === "search" || state.mode === "discovery") {
          return state;
        }
        return {
          ...state,
          activeView: "following",
          mode: "discovery",
          query: "",
        };
      }

      if (state.mode === "discovery") {
        return { ...state, mode: "browse", query: "" };
      }

      return state;
    default:
      return state;
  }
}

type UseInspaUiStateMachineArgs = {
  zeroRelationshipMode: boolean;
};

type InspaUiModel = {
  activeView: SocialView;
  canToggleView: boolean;
  collapseSearch: () => void;
  isDiscoveryMode: boolean;
  openSearch: () => void;
  promptTarget: "u" | "?";
  query: string;
  searchOpen: boolean;
  setQuery: (query: string) => void;
  toggleView: () => void;
};

export function useInspaUiStateMachine({
  zeroRelationshipMode,
}: UseInspaUiStateMachineArgs): InspaUiModel {
  const [state, dispatch] = useReducer(reducer, initialState);
  const promptTarget: "u" | "?" = state.mode === "browse" ? "u" : "?";

  useEffect(() => {
    dispatch({ type: "sync-relationships", zeroRelationshipMode });
  }, [zeroRelationshipMode]);

  const openSearch = useCallback(() => {
    dispatch({ type: "open-search" });
  }, []);

  const collapseSearch = useCallback(() => {
    dispatch({ type: "close-search", zeroRelationshipMode });
  }, [zeroRelationshipMode]);

  const setQuery = useCallback((query: string) => {
    dispatch({ type: "set-query", query });
  }, []);

  const toggleView = useCallback(() => {
    dispatch({ type: "toggle-view" });
  }, []);

  return {
    activeView: state.activeView,
    canToggleView: state.mode === "browse",
    collapseSearch,
    isDiscoveryMode: state.mode === "discovery",
    openSearch,
    promptTarget,
    query: state.query,
    searchOpen: state.mode === "search",
    setQuery,
    toggleView,
  };
}
