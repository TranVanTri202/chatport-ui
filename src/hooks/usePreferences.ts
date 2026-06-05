"use client";

import { useEffect } from "react";
import type { Preferences } from "@/types";
import { ACCENTS } from "@/constants/mockData";
import { translate } from "@/constants/i18n";
import { useAppContext } from "@/providers/AppProvider";

export interface UsePreferencesResult {
  readonly preferences: Preferences;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  /** Convenience translator bound to the current language. */
  t: (key: Parameters<typeof translate>[1]) => string;
}

/**
 * Owns the side-effect of reflecting preferences onto the document:
 * theme (`data-theme`), density (`data-density`) and accent CSS variables.
 * Keeping this in a hook means no component manually pokes the DOM.
 */
export function usePreferences(): UsePreferencesResult {
  const { preferences, setPreference } = useAppContext();

  useEffect(() => {
    const root = document.documentElement;
    if (preferences.theme === "light") root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme");
    root.setAttribute("data-density", preferences.density);

    const accent = ACCENTS[preferences.accent];
    root.style.setProperty("--accent", accent.accent);
    root.style.setProperty("--accent-dim", accent.dim);
    root.style.setProperty("--accent-border", accent.border);
  }, [preferences.theme, preferences.density, preferences.accent]);

  return {
    preferences,
    setPreference,
    t: (key) => translate(preferences.lang, key),
  };
}
