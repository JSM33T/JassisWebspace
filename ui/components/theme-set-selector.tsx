"use client";

import { Palette } from "lucide-react";
import { useThemeSet } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function ThemeSetSelector({ className }: { className?: string }) {
  const { activeThemeSetId, setActiveThemeSetId, themeSets } = useThemeSet();

  const activeThemeName =
    themeSets.find((themeSet) => themeSet.id === activeThemeSetId)?.name ?? "Theme";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-8 px-2 hover:bg-accent/50", className)}
          title={`Theme set: ${activeThemeName}`}
        >
          <Palette className="h-4 w-4" />
          <span className="sr-only">Select theme set</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Theme Set</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={activeThemeSetId} onValueChange={setActiveThemeSetId}>
          {themeSets.map((themeSet) => (
            <DropdownMenuRadioItem key={themeSet.id} value={themeSet.id}>
              {themeSet.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
