"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

const NavigationSequenceContext = createContext(0);

type AppNavigationProviderProps = {
  children: ReactNode;
};

export function AppNavigationProvider({
  children,
}: AppNavigationProviderProps) {
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);
  const [navigationSequence, setNavigationSequence] = useState(0);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) {
      return;
    }

    previousPathnameRef.current = pathname;
    setNavigationSequence((current) => current + 1);
  }, [pathname]);

  return (
    <NavigationSequenceContext.Provider value={navigationSequence}>
      {children}
    </NavigationSequenceContext.Provider>
  );
}

export function useNavigationSequence() {
  return useContext(NavigationSequenceContext);
}
