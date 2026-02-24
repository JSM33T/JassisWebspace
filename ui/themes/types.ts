export type ThemeMode = "light" | "dark";

export type ThemeTokenMap = Record<string, string>;

export interface ThemeSet {
  id: string;
  name: string;
  description?: string;
  tokens: {
    light: ThemeTokenMap;
    dark?: ThemeTokenMap;
  };
}
