/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useLayoutEffect, ReactNode, useCallback } from "react";
import { ThemeId, ThemeMode, UserPreference, ThemeColors, ThemeDefinition } from "../types.js";
import { SEMANTIC_THEME_TOKENS } from "./ThemeTokens.js";

function buildThemeDef(
  id: ThemeId,
  name: string,
  description: string
): ThemeDefinition {
  const lightTokens = SEMANTIC_THEME_TOKENS[id]?.light || SEMANTIC_THEME_TOKENS["default-blue"].light;
  const darkTokens = SEMANTIC_THEME_TOKENS[id]?.dark || SEMANTIC_THEME_TOKENS["default-blue"].dark;

  return {
    id,
    name,
    description,
    light: {
      primaryColor: lightTokens.colorPrimary,
      secondaryColor: lightTokens.colorSecondary,
      backgroundColor: lightTokens.colorBackground,
      surfaceColor: lightTokens.colorSurface,
      textColor: lightTokens.colorTextPrimary,
      ...lightTokens
    },
    dark: {
      primaryColor: darkTokens.colorPrimary,
      secondaryColor: darkTokens.colorSecondary,
      backgroundColor: darkTokens.colorBackground,
      surfaceColor: darkTokens.colorSurface,
      textColor: darkTokens.colorTextPrimary,
      ...darkTokens
    }
  };
}

export const PREDEFINED_THEMES: Record<ThemeId, ThemeDefinition> = {
  "default-blue": buildThemeDef(
    "default-blue",
    "Default Blue",
    "Classic authoritative enterprise blue palette with balanced neutral surfaces"
  ),
  "ocean-teal": buildThemeDef(
    "ocean-teal",
    "Ocean Teal",
    "Deep sea teal and crisp cyan accents with clean medical/tech contrast"
  ),
  "royal-indigo": buildThemeDef(
    "royal-indigo",
    "Royal Indigo",
    "Prestigious deep indigo and electric violet for modern academic styling"
  ),
  "emerald-green": buildThemeDef(
    "emerald-green",
    "Emerald Green",
    "Vibrant emerald green inspiring focus, growth, and natural clarity"
  ),
  "graphite": buildThemeDef(
    "graphite",
    "Graphite",
    "Ultra-clean monochrome charcoal and zinc palette with focused readability"
  ),
  "royal-purple": buildThemeDef(
    "royal-purple",
    "Royal Purple",
    "Regal amethyst and violet accents delivering high visual distinction"
  ),
  "sunset-orange": buildThemeDef(
    "sunset-orange",
    "Sunset Orange",
    "Energetic burnt orange and amber hues delivering warmth and productivity"
  ),
  "ruby-red": buildThemeDef(
    "ruby-red",
    "Ruby Red",
    "Bold crimson ruby red and rose highlights for dynamic, high-impact presence"
  ),
  "midnight-navy": buildThemeDef(
    "midnight-navy",
    "Midnight Navy",
    "Deep nocturnal navy with crisp glacial blue accents for focused study"
  ),
  "rose-pink": buildThemeDef(
    "rose-pink",
    "Rose Pink",
    "Sophisticated magenta rose and soft blush with elegant contrast"
  ),
  // Backward-compatible alias definitions
  "emerald": buildThemeDef(
    "emerald-green",
    "Emerald Green",
    "Vibrant emerald green inspiring focus, growth, and natural clarity"
  ),
  "purple-royal": buildThemeDef(
    "royal-purple",
    "Royal Purple",
    "Regal amethyst and violet accents delivering high visual distinction"
  ),
  "cyber-dark": buildThemeDef(
    "midnight-navy",
    "Midnight Navy",
    "Deep nocturnal navy with crisp glacial blue accents for focused study"
  ),
  "high-contrast": buildThemeDef(
    "graphite",
    "Graphite",
    "Ultra-clean monochrome charcoal and zinc palette with focused readability"
  )
};

export const CURATED_THEMES: ThemeDefinition[] = [
  PREDEFINED_THEMES["default-blue"],
  PREDEFINED_THEMES["ocean-teal"],
  PREDEFINED_THEMES["royal-indigo"],
  PREDEFINED_THEMES["emerald-green"],
  PREDEFINED_THEMES["graphite"],
  PREDEFINED_THEMES["royal-purple"],
  PREDEFINED_THEMES["sunset-orange"],
  PREDEFINED_THEMES["ruby-red"],
  PREDEFINED_THEMES["midnight-navy"],
  PREDEFINED_THEMES["rose-pink"]
];

interface ThemeContextType {
  theme: ThemeId;
  mode: ThemeMode;
  colors: ThemeColors;
  availableThemes: ThemeDefinition[];
  setTheme: (themeId: ThemeId) => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleMode: () => Promise<void>;
  loadPreferences: (token?: string) => Promise<void>;
  isSaving: boolean;
  error: string | null;
  activePortal: "admin" | "student";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const LOCAL_STORAGE_THEME_KEY = "mrtechlms_theme";
const LOCAL_STORAGE_MODE_KEY = "mrtechlms_mode";

function detectPortal(): "admin" | "student" {
  if (typeof window === "undefined") return "student";
  const path = window.location.pathname;
  if (path.startsWith("/admin") || path === "/manage-portal" || path.startsWith("/manager")) {
    return "admin";
  }
  return "student";
}

function getPortalThemeKey(portal: "admin" | "student"): string {
  return `mrtechlms_theme_${portal}`;
}

function getPortalModeKey(portal: "admin" | "student"): string {
  return `mrtechlms_mode_${portal}`;
}

function resolveSavedTheme(portal: "admin" | "student"): ThemeId {
  if (typeof window === "undefined") return "default-blue";
  try {
    const saved = localStorage.getItem(getPortalThemeKey(portal)) as ThemeId;
    if (saved && PREDEFINED_THEMES[saved]) return saved;
    const globalSaved = localStorage.getItem(LOCAL_STORAGE_THEME_KEY) as ThemeId;
    if (globalSaved && PREDEFINED_THEMES[globalSaved]) return globalSaved;
  } catch {}
  return "default-blue";
}

function resolveSavedMode(portal: "admin" | "student"): ThemeMode {
  if (typeof window === "undefined") return "light";
  try {
    const saved = localStorage.getItem(getPortalModeKey(portal)) as ThemeMode;
    if (saved === "light" || saved === "dark") return saved;
    const globalSaved = localStorage.getItem(LOCAL_STORAGE_MODE_KEY) as ThemeMode;
    if (globalSaved === "light" || globalSaved === "dark") return globalSaved;
  } catch {}
  return "light";
}

// Global helper to apply CSS custom properties directly to document root
export function applyThemeVariablesToRoot(activeTheme: ThemeId, activeMode: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  const tokens = SEMANTIC_THEME_TOKENS[activeTheme]?.[activeMode] || SEMANTIC_THEME_TOKENS["default-blue"][activeMode];

  // 1. Mandatory Semantic CSS Custom Properties
  root.style.setProperty("--color-primary", tokens.colorPrimary);
  root.style.setProperty("--color-primary-hover", tokens.colorPrimaryHover);
  root.style.setProperty("--color-primary-foreground", tokens.colorPrimaryForeground);
  root.style.setProperty("--color-secondary", tokens.colorSecondary);
  root.style.setProperty("--color-accent", tokens.colorAccent);
  root.style.setProperty("--color-background", tokens.colorBackground);
  root.style.setProperty("--color-surface", tokens.colorSurface);
  root.style.setProperty("--color-surface-elevated", tokens.colorSurfaceElevated);
  root.style.setProperty("--color-sidebar", tokens.colorSidebar);
  root.style.setProperty("--color-sidebar-text", tokens.colorSidebarForeground);
  root.style.setProperty("--color-sidebar-foreground", tokens.colorSidebarForeground);
  root.style.setProperty("--color-sidebar-muted", tokens.colorSidebarMuted);
  root.style.setProperty("--color-sidebar-active", tokens.colorSidebarActive);
  root.style.setProperty("--color-sidebar-active-foreground", tokens.colorSidebarActiveForeground);
  root.style.setProperty("--color-button-primary", tokens.colorButtonPrimary);
  root.style.setProperty("--color-button-primary-foreground", tokens.colorButtonPrimaryForeground);
  root.style.setProperty("--color-button-secondary", tokens.colorButtonSecondary);
  root.style.setProperty("--color-button-secondary-foreground", tokens.colorButtonSecondaryForeground);
  root.style.setProperty("--color-button-outline", tokens.colorButtonOutline);
  root.style.setProperty("--color-button-outline-foreground", tokens.colorButtonOutlineForeground);
  root.style.setProperty("--color-button-danger", tokens.colorButtonDanger);
  root.style.setProperty("--color-button-danger-foreground", tokens.colorButtonDangerForeground);
  root.style.setProperty("--color-header", tokens.colorHeader);
  root.style.setProperty("--color-text-primary", tokens.colorTextPrimary);
  root.style.setProperty("--color-text-secondary", tokens.colorTextSecondary);
  root.style.setProperty("--color-text-muted", tokens.colorTextMuted);
  root.style.setProperty("--color-border", tokens.colorBorder);
  root.style.setProperty("--color-input-background", tokens.colorInputBackground);
  root.style.setProperty("--color-input-border", tokens.colorInputBorder);
  root.style.setProperty("--color-focus-ring", tokens.colorFocusRing);
  root.style.setProperty("--color-success", tokens.colorSuccess);
  root.style.setProperty("--color-warning", tokens.colorWarning);
  root.style.setProperty("--color-danger", tokens.colorDanger);
  root.style.setProperty("--color-info", tokens.colorInfo);

  // 2. Backward-compatible aliases
  root.style.setProperty("--theme-primary", tokens.colorPrimary);
  root.style.setProperty("--theme-primary-hover", tokens.colorPrimaryHover);
  root.style.setProperty("--theme-primary-light", tokens.colorSecondary);
  root.style.setProperty("--theme-primary-dark", tokens.colorPrimaryHover);
  root.style.setProperty("--theme-secondary", tokens.colorSecondary);
  root.style.setProperty("--theme-accent", tokens.colorAccent);
  root.style.setProperty("--theme-background", tokens.colorBackground);
  root.style.setProperty("--theme-background-alt", tokens.colorSurfaceElevated);
  root.style.setProperty("--theme-surface", tokens.colorSurface);
  root.style.setProperty("--theme-card", tokens.colorSurface);
  root.style.setProperty("--theme-card-elevated", tokens.colorSurfaceElevated);
  root.style.setProperty("--theme-card-hover", tokens.colorSurfaceElevated);
  root.style.setProperty("--theme-sidebar", tokens.colorSidebar);
  root.style.setProperty("--theme-sidebar-text", tokens.colorSidebarForeground);
  root.style.setProperty("--theme-sidebar-foreground", tokens.colorSidebarForeground);
  root.style.setProperty("--theme-sidebar-muted", tokens.colorSidebarMuted);
  root.style.setProperty("--theme-sidebar-active", tokens.colorSidebarActive);
  root.style.setProperty("--theme-sidebar-active-foreground", tokens.colorSidebarActiveForeground);
  root.style.setProperty("--theme-sidebar-card", tokens.colorSurfaceElevated);
  root.style.setProperty("--theme-sidebar-border", tokens.colorBorder);
  root.style.setProperty("--theme-sidebar-hover", "rgba(255, 255, 255, 0.1)");
  root.style.setProperty("--theme-border", tokens.colorBorder);
  root.style.setProperty("--theme-border-subtle", tokens.colorBorder);
  root.style.setProperty("--theme-text", tokens.colorTextPrimary);
  root.style.setProperty("--theme-text-secondary", tokens.colorTextSecondary);
  root.style.setProperty("--theme-text-muted", tokens.colorTextMuted);
  root.style.setProperty("--theme-input-bg", tokens.colorInputBackground);
  root.style.setProperty("--theme-input-border", tokens.colorInputBorder);
  root.style.setProperty("--theme-input-text", tokens.colorTextPrimary);
  root.style.setProperty("--theme-button-text", tokens.colorButtonPrimaryForeground);
  root.style.setProperty("--theme-button-primary", tokens.colorButtonPrimary);
  root.style.setProperty("--theme-button-primary-foreground", tokens.colorButtonPrimaryForeground);
  root.style.setProperty("--theme-button-secondary", tokens.colorButtonSecondary);
  root.style.setProperty("--theme-button-secondary-foreground", tokens.colorButtonSecondaryForeground);
  root.style.setProperty("--primary-color", tokens.colorPrimary);
  root.style.setProperty("--secondary-color", tokens.colorSecondary);
  root.style.setProperty("--background-color", tokens.colorBackground);
  root.style.setProperty("--surface-color", tokens.colorSurface);
  root.style.setProperty("--text-color", tokens.colorTextPrimary);

  // 3. Root attributes and Tailwind dark mode class
  root.setAttribute("data-theme", activeTheme);
  root.setAttribute("data-mode", activeMode);
  root.setAttribute("data-theme-mode", activeMode);

  if (activeMode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // 4. Dispatch event for instant listener updates
  try {
    window.dispatchEvent(
      new CustomEvent("mrtechlms-theme-changed", {
        detail: { theme: activeTheme, mode: activeMode, tokens }
      })
    );
  } catch {}
}

export function ThemeProvider({ children, authToken }: { children: ReactNode; authToken?: string | null }) {
  const [currentPortal, setCurrentPortal] = useState<"admin" | "student">(() => detectPortal());

  // Initialize from portal-scoped storage for instant startup render
  const [theme, setThemeState] = useState<ThemeId>(() => resolveSavedTheme(currentPortal));
  const [mode, setModeState] = useState<ThemeMode>(() => resolveSavedMode(currentPortal));

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Apply immediately on first paint
  useLayoutEffect(() => {
    applyThemeVariablesToRoot(theme, mode);
  }, [theme, mode]);

  // Synchronize CSS variables and portal-scoped localStorage on every state change
  useEffect(() => {
    applyThemeVariablesToRoot(theme, mode);
    try {
      localStorage.setItem(getPortalThemeKey(currentPortal), theme);
      localStorage.setItem(getPortalModeKey(currentPortal), mode);
      localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme);
      localStorage.setItem(LOCAL_STORAGE_MODE_KEY, mode);
    } catch {}
  }, [theme, mode, currentPortal]);

  // Keep track of route / portal transitions so switching between /admin and /student reloads appropriate theme
  useEffect(() => {
    const checkPortal = () => {
      const detected = detectPortal();
      if (detected !== currentPortal) {
        setCurrentPortal(detected);
        const targetTheme = resolveSavedTheme(detected);
        const targetMode = resolveSavedMode(detected);
        setThemeState(targetTheme);
        setModeState(targetMode);
        applyThemeVariablesToRoot(targetTheme, targetMode);
      }
    };

    window.addEventListener("popstate", checkPortal);
    const timer = setInterval(checkPortal, 1000);

    return () => {
      window.removeEventListener("popstate", checkPortal);
      clearInterval(timer);
    };
  }, [currentPortal]);

  // Load preferences from MySQL when user is authenticated
  const loadPreferences = useCallback(async (token?: string) => {
    const portal = detectPortal();
    let activeToken = token || authToken;
    if (!activeToken) {
      if (portal === "admin") {
        activeToken = localStorage.getItem("mrtechlms_admin_token") || localStorage.getItem("lms_token");
      } else {
        activeToken = localStorage.getItem("mrtechlms_student_token") || localStorage.getItem("lms_token");
      }
    }
    if (!activeToken) return;

    try {
      const res = await fetch("/api/user/preferences", {
        headers: { "Authorization": `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const pref: UserPreference = await res.json();
        const locallySavedTheme = localStorage.getItem(getPortalThemeKey(portal));
        const locallySavedMode = localStorage.getItem(getPortalModeKey(portal));

        // Only adopt server preference if user has not explicitly set a local preference
        if (!locallySavedTheme && pref.theme && PREDEFINED_THEMES[pref.theme]) {
          setThemeState(pref.theme);
          try {
            localStorage.setItem(getPortalThemeKey(portal), pref.theme);
          } catch {}
        }
        if (!locallySavedMode && (pref.mode === "light" || pref.mode === "dark")) {
          setModeState(pref.mode);
          try {
            localStorage.setItem(getPortalModeKey(portal), pref.mode);
          } catch {}
        }

        const effectiveTheme = locallySavedTheme && PREDEFINED_THEMES[locallySavedTheme as ThemeId]
          ? (locallySavedTheme as ThemeId)
          : (pref.theme && PREDEFINED_THEMES[pref.theme] ? pref.theme : theme);
        const effectiveMode = (locallySavedMode === "light" || locallySavedMode === "dark")
          ? (locallySavedMode as ThemeMode)
          : ((pref.mode === "light" || pref.mode === "dark") ? pref.mode : mode);

        applyThemeVariablesToRoot(effectiveTheme, effectiveMode);
      }
    } catch (err) {
      console.error("Failed to load user preferences from server", err);
    }
  }, [authToken, theme, mode]);

  // Sync with server when authToken becomes available
  useEffect(() => {
    if (authToken) {
      loadPreferences(authToken);
    }
  }, [authToken, loadPreferences]);

  // Save changes to MySQL backend
  const persistToServer = async (newTheme: ThemeId, newMode: ThemeMode) => {
    const portal = detectPortal();
    let activeToken = authToken;
    if (!activeToken) {
      if (portal === "admin") {
        activeToken = localStorage.getItem("mrtechlms_admin_token") || localStorage.getItem("lms_token");
      } else {
        activeToken = localStorage.getItem("mrtechlms_student_token") || localStorage.getItem("lms_token");
      }
    }
    if (!activeToken) return;

    setIsSaving(true);
    setError(null);
    try {
      const targetColors = PREDEFINED_THEMES[newTheme][newMode];
      const res = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          theme: newTheme,
          mode: newMode,
          primaryColor: targetColors.primaryColor,
          secondaryColor: targetColors.secondaryColor,
          backgroundColor: targetColors.backgroundColor,
          surfaceColor: targetColors.surfaceColor,
          textColor: targetColors.textColor
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to save theme preference.");
      }
    } catch {
      setError("Network error while saving theme preference.");
    } finally {
      setIsSaving(false);
    }
  };

  const setTheme = async (newTheme: ThemeId) => {
    if (!PREDEFINED_THEMES[newTheme]) return;
    setThemeState(newTheme);
    // Instant synchronous application with 0ms lag
    applyThemeVariablesToRoot(newTheme, mode);
    try {
      localStorage.setItem(getPortalThemeKey(currentPortal), newTheme);
      localStorage.setItem(LOCAL_STORAGE_THEME_KEY, newTheme);
    } catch {}
    await persistToServer(newTheme, mode);
  };

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    applyThemeVariablesToRoot(theme, newMode);
    try {
      localStorage.setItem(getPortalModeKey(currentPortal), newMode);
      localStorage.setItem(LOCAL_STORAGE_MODE_KEY, newMode);
    } catch {}
    await persistToServer(theme, newMode);
  };

  const toggleMode = async () => {
    const nextMode: ThemeMode = mode === "light" ? "dark" : "light";
    setModeState(nextMode);
    applyThemeVariablesToRoot(theme, nextMode);
    try {
      localStorage.setItem(getPortalModeKey(currentPortal), nextMode);
      localStorage.setItem(LOCAL_STORAGE_MODE_KEY, nextMode);
    } catch {}
    await persistToServer(theme, nextMode);
  };

  const currentThemeDef = PREDEFINED_THEMES[theme] || PREDEFINED_THEMES["default-blue"];
  const colors = currentThemeDef[mode];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        mode,
        colors,
        availableThemes: CURATED_THEMES,
        setTheme,
        setMode,
        toggleMode,
        loadPreferences,
        isSaving,
        error,
        activePortal: currentPortal
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
