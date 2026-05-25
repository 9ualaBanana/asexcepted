"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const NavigationSequenceContext = createContext(0);

type AppNavigationProviderProps = {
  children: ReactNode;
};

export function AppNavigationProvider({
  children,
}: AppNavigationProviderProps) {
  const previousPathnameRef = useRef<string | null>(null);
  const [navigationSequence, setNavigationSequence] = useState(0);

  useEffect(() => {
    const readPathname = () => window.location.pathname;
    const scheduleSequenceBump = () => {
      queueMicrotask(() => {
        setNavigationSequence((current) => current + 1);
      });
    };

    const bumpIfPathChanged = () => {
      const nextPathname = readPathname();
      if (previousPathnameRef.current === nextPathname) {
        return;
      }

      previousPathnameRef.current = nextPathname;
      scheduleSequenceBump();
    };

    previousPathnameRef.current = readPathname();

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      originalPushState.apply(window.history, args);
      bumpIfPathChanged();
    };

    window.history.replaceState = function (...args) {
      originalReplaceState.apply(window.history, args);
      bumpIfPathChanged();
    };

    window.addEventListener("popstate", bumpIfPathChanged);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", bumpIfPathChanged);
    };
  }, []);

  return (
    <NavigationSequenceContext.Provider value={navigationSequence}>
      {children}
    </NavigationSequenceContext.Provider>
  );
}

export function useNavigationSequence() {
  return useContext(NavigationSequenceContext);
}
