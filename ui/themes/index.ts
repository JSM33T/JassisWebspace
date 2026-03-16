import slateClassic from "./slate-classic.json";
import sunsetCopper from "./sunset-copper.json";
import lilacSoft from "./lilac-soft.json";
import emeraldGreen from "./emerald-green.json";
import ivoryTeal from "./ivory-teal.json";
import type { ThemeSet } from "./types";

export const themeSets: ThemeSet[] = [
  ivoryTeal as ThemeSet,
  slateClassic as ThemeSet,
  sunsetCopper as ThemeSet,
  lilacSoft as ThemeSet,
  emeraldGreen as ThemeSet,
];

export const DEFAULT_THEME_SET_ID = "ivory-teal";

export type { ThemeMode, ThemeSet, ThemeTokenMap } from "./types";
