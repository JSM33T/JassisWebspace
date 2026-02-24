"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { DEFAULT_THEME_SET_ID, themeSets } from "@/themes";
import type { ThemeSet } from "@/themes";
import {
  applyThemeSet,
  getStoredThemeSetId,
  resolveThemeSet,
  saveThemeSetId,
} from "@/lib/theme/theme-engine";

type ThemeSetContextValue = {
  themeSets: ThemeSet[];
  activeThemeSetId: string;
  activeThemeSet: ThemeSet;
  setActiveThemeSetId: (themeSetId: string) => void;
};

const ThemeSetContext = React.createContext<ThemeSetContextValue | undefined>(undefined);

function ThemeSetProvider({ children }: { children: React.ReactNode }) {
  const [activeThemeSetId, setActiveThemeSetIdState] = React.useState<string>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_THEME_SET_ID;
    }

    return getStoredThemeSetId() ?? DEFAULT_THEME_SET_ID;
  });

  const activeThemeSet = React.useMemo(
    () => resolveThemeSet(activeThemeSetId),
    [activeThemeSetId]
  );

  React.useEffect(() => {
    applyThemeSet(activeThemeSet);
    saveThemeSetId(activeThemeSet.id);
  }, [activeThemeSet]);

  const setActiveThemeSetId = React.useCallback((themeSetId: string) => {
    const nextThemeSet = resolveThemeSet(themeSetId);
    setActiveThemeSetIdState(nextThemeSet.id);
  }, []);

  const value = React.useMemo(
    () => ({
      themeSets,
      activeThemeSetId: activeThemeSet.id,
      activeThemeSet,
      setActiveThemeSetId,
    }),
    [activeThemeSet, setActiveThemeSetId]
  );

  return <ThemeSetContext.Provider value={value}>{children}</ThemeSetContext.Provider>;
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <ThemeSetProvider>{children}</ThemeSetProvider>
    </NextThemesProvider>
  );
}

export function useThemeSet() {
  const context = React.useContext(ThemeSetContext);

  if (!context) {
    throw new Error("useThemeSet must be used inside ThemeProvider");
  }

  return context;
}
