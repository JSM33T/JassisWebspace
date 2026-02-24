import { DEFAULT_THEME_SET_ID, themeSets } from "@/themes";
import type { ThemeSet, ThemeTokenMap } from "@/themes";

export const ACTIVE_THEME_SET_STORAGE_KEY = "jassspace.active-theme-set";

const THEME_STYLE_ELEMENT_ID = "jassspace-theme-set-overrides";

const THEME_VARIABLE_KEYS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "radius",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
  "font-sans",
  "font-serif",
  "font-mono",
  "shadow-color",
  "shadow-opacity",
  "shadow-blur",
  "shadow-spread",
  "shadow-offset-x",
  "shadow-offset-y",
  "letter-spacing",
  "spacing",
  "shadow-2xs",
  "shadow-xs",
  "shadow-sm",
  "shadow",
  "shadow-md",
  "shadow-lg",
  "shadow-xl",
  "shadow-2xl",
  "tracking-normal",
];

const fallbackThemeSet =
  themeSets.find((themeSet) => themeSet.id === DEFAULT_THEME_SET_ID) ?? themeSets[0];

let baselineVariables: ThemeTokenMap | null = null;

function readCurrentThemeVariables(): ThemeTokenMap {
  const style = getComputedStyle(document.documentElement);
  const values: ThemeTokenMap = {};

  for (const key of THEME_VARIABLE_KEYS) {
    values[key] = style.getPropertyValue(`--${key}`).trim();
  }

  return values;
}

function getBaselineVariables(): ThemeTokenMap {
  if (baselineVariables) {
    return baselineVariables;
  }

  baselineVariables = readCurrentThemeVariables();
  return baselineVariables;
}

function buildResolvedTokens(themeTokens: ThemeTokenMap, baseTokens: ThemeTokenMap): ThemeTokenMap {
  const resolved: ThemeTokenMap = {};

  for (const key of THEME_VARIABLE_KEYS) {
    resolved[key] = themeTokens[key] ?? baseTokens[key];
  }

  return resolved;
}

function toCssBlock(selector: string, tokens: ThemeTokenMap): string {
  const cssLines = THEME_VARIABLE_KEYS.map((key) => `  --${key}: ${tokens[key]};`).join("\n");
  return `${selector} {\n${cssLines}\n}`;
}

function ensureStyleElement(): HTMLStyleElement {
  const existing = document.getElementById(THEME_STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (existing) {
    return existing;
  }

  const style = document.createElement("style");
  style.id = THEME_STYLE_ELEMENT_ID;
  document.head.appendChild(style);
  return style;
}

export function resolveThemeSet(themeSetId?: string | null): ThemeSet {
  if (!fallbackThemeSet) {
    throw new Error("No theme sets are configured.");
  }

  if (!themeSetId) {
    return fallbackThemeSet;
  }

  return themeSets.find((themeSet) => themeSet.id === themeSetId) ?? fallbackThemeSet;
}

export function getStoredThemeSetId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACTIVE_THEME_SET_STORAGE_KEY);
}

export function saveThemeSetId(themeSetId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACTIVE_THEME_SET_STORAGE_KEY, themeSetId);
}

export function applyThemeSet(themeSet: ThemeSet): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const baseTokens = getBaselineVariables();
  const lightTokens = buildResolvedTokens(themeSet.tokens.light, baseTokens);
  const darkTokens = buildResolvedTokens(
    {
      ...themeSet.tokens.light,
      ...(themeSet.tokens.dark ?? {}),
    },
    baseTokens
  );

  root.setAttribute("data-theme-set", themeSet.id);

  const style = ensureStyleElement();
  style.textContent = [
    toCssBlock(`:root[data-theme-set=\"${themeSet.id}\"]`, lightTokens),
    toCssBlock(`:root.dark[data-theme-set=\"${themeSet.id}\"]`, darkTokens),
  ].join("\n\n");
}
