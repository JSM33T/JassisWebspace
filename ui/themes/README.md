# Theme Sets

This folder contains theme-set definitions consumed by the UI runtime theme engine.

## Add a new theme set

1. Create a new `*.json` file in this folder.
2. Follow the same shape as `slate-classic.json` or `sunset-copper.json`.
3. Register the file in `ui/themes/index.ts`.

## Notes

- Token keys map directly to CSS variables in `ui/app/globals.css`.
- Values should be valid CSS values (for example `oklch(...)`, hex, rem).
- The selected theme set is saved in localStorage under `jassspace.active-theme-set`.
