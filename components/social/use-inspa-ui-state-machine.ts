"use client";

import { useCallback, useEffect, useReducer } from "react";

export type SocialView = "followers" | "following";

type UiMode = "browse" | "search" | "discovery";

type InspaUiState = {
  activeView: SocialView;
  mode: UiMode;
  promptAnimationNonce: number;
  promptTarget: "u" | "?";
  query: string;
};

type InspaUiAction =
  | { type: "close-search"; zeroRelationshipMode: boolean }
  | { type: "open-search" }
  | { type: "replay-prompt-animation" }
  | { type: "set-query"; query: string }
  | { type: "sync-relationships"; zeroRelationshipMode: boolean }
  | { type: "toggle-view" };

const initialState: InspaUiState = {
  activeView: "following",
  mode: "browse",
  promptAnimationNonce: 0,
  promptTarget: "u",
  query: "",
};

function withPromptTarget(
  state: InspaUiState,
  promptTarget: "u" | "?",
): Pick<InspaUiState, "promptAnimationNonce" | "promptTarget"> {
  if (state.promptTarget === promptTarget) {
    return {
      promptAnimationNonce: state.promptAnimationNonce,
      promptTarget: state.promptTarget,
    };
  }

  return {
    promptAnimationNonce: state.promptAnimationNonce + 1,
    promptTarget,
  };
}

function reducer(state: InspaUiState, action: InspaUiAction): InspaUiState {
  switch (action.type) {
    case "open-search":
      return {
        ...state,
        ...withPromptTarget(state, "?"),
        mode: "search",
      };
    case "close-search":
      return {
        ...state,
        mode: action.zeroRelationshipMode ? "discovery" : "browse",
        ...withPromptTarget(state, action.zeroRelationshipMode ? "?" : "u"),
        query: "",
      };
    case "set-query":
      return { ...state, query: action.query };
    case "replay-prompt-animation":
      return {
        ...state,
        promptAnimationNonce: state.promptAnimationNonce + 1,
      };
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
          ...withPromptTarget(state, "?"),
          query: "",
        };
      }

      if (state.mode === "discovery") {
        return {
          ...state,
          mode: "browse",
          ...withPromptTarget(state, "u"),
          query: "",
        };
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
  promptAnimationNonce: number;
  promptTarget: "u" | "?";
  query: string;
  replayPromptAnimation: () => void;
  searchOpen: boolean;
  setQuery: (query: string) => void;
  toggleView: () => void;
};

export function useInspaUiStateMachine({
  zeroRelationshipMode,
}: UseInspaUiStateMachineArgs): InspaUiModel {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({ type: "sync-relationships", zeroRelationshipMode });
  }, [zeroRelationshipMode]);

  const openSearch = useCallback(() => {
    dispatch({ type: "open-search" });
  }, []);

  const replayPromptAnimation = useCallback(() => {
    dispatch({ type: "replay-prompt-animation" });
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
    promptAnimationNonce: state.promptAnimationNonce,
    promptTarget: state.promptTarget,
    query: state.query,
    replayPromptAnimation,
    searchOpen: state.mode === "search",
    setQuery,
    toggleView,
  };
}
