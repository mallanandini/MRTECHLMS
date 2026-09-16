/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ThemeId, ThemeMode, UserPreference, ThemeColors, ThemeDefinition } from "../types.js";

export const PREDEFINED_THEMES: Record<ThemeId, ThemeDefinition> = {
  "default-blue": {
    id: "default-blue",
    name: "Default Blue",
    description: "Professional academy blue with white/light surfaces and electric blue actions",
    light: {
      primaryColor: "#2563eb",
      secondaryColor: "#4f46e5",
      backgroundColor: "#f8fafc",
      surfaceColor: "#ffffff",
      textColor: "#0f172a"
    },
    dark: {
      primaryColor: "#3b82f6",
      secondaryColor: "#6366f1",
      backgroundColor: "#0b0f19",
      surfaceColor: "#111827",
      textColor: "#f8fafc"
    }
  },
  "purple-royal": {
    id: "purple-royal",
    name: "Purple Royal",
    description: "Royal deep violet primary with light lavender secondary surfaces and purple actions",
    light: {
      primaryColor: "#7c3aed",
      secondaryColor: "#9333ea",
      backgroundColor: "#faf5ff",
      surfaceColor: "#ffffff",
      textColor: "#2e1065"
    },
    dark: {
      primaryColor: "#a855f7",
      secondaryColor: "#c084fc",
      backgroundColor: "#0f0919",
      surfaceColor: "#191129",
      textColor: "#faf5ff"
    }
  },
  "emerald-green": {
    id: "emerald-green",
    name: "Emerald Green",
    description: "Botanical emerald primary with subtle mint-tinted surfaces and teal highlights",
    light: {
      primaryColor: "#059669",
      secondaryColor: "#0d9488",
      backgroundColor: "#f0fdf4",
      surfaceColor: "#ffffff",
      textColor: "#064e3b"
    },
    dark: {
      primaryColor: "#10b981",
      secondaryColor: "#14b8a6",
      backgroundColor: "#05140d",
      surfaceColor: "#0a2217",
      textColor: "#ecfdf5"
    }
  },
  "sunset-orange": {
    id: "sunset-orange",
    name: "Sunset Orange",
    description: "Warm terracotta amber primary with soft cream/warm surfaces and orange actions",
    light: {
      primaryColor: "#ea580c",
      secondaryColor: "#d97706",
      backgroundColor: "#fff7ed",
      surfaceColor: "#ffffff",
      textColor: "#431407"
    },
    dark: {
      primaryColor: "#f97316",
      secondaryColor: "#fbbf24",
      backgroundColor: "#180c05",
      surfaceColor: "#241408",
      textColor: "#fff7ed"
    }
  },
  "cyber-dark": {
    id: "cyber-dark",
    name: "Cyber Dark",
    description: "Electric cyan and cyber sky accents with adaptive high-readability surfaces",
    light: {
      primaryColor: "#0ea5e9",
      secondaryColor: "#06b6d4",
      backgroundColor: "#f8fafc",
      surfaceColor: "#ffffff",
      textColor: "#0f172a"
    },
    dark: {
      primaryColor: "#38bdf8",
      secondaryColor: "#22d3ee",
      backgroundColor: "#0b0f19",
      surfaceColor: "#111827",
      textColor: "#f8fafc"
    }
  },
  "high-contrast": {
    id: "high-contrast",
    name: "High Contrast",
    description: "Maximum accessibility with stark foreground separation and strong focus indicators",
    light: {
      primaryColor: "#000000",
      secondaryColor: "#000000",
      backgroundColor: "#ffffff",
      surfaceColor: "#ffffff",
      textColor: "#000000"
    },
    dark: {
      primaryColor: "#facc15",
      secondaryColor: "#ffffff",
      backgroundColor: "#000000",
      surfaceColor: "#0a0a0a",
      textColor: "#ffffff"
    }
  }
};

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
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const LOCAL_STORAGE_THEME_KEY = "mrtechlms_theme";
const LOCAL_STORAGE_MODE_KEY = "mrtechlms_mode";

export function ThemeProvider({ children, authToken }: { children: ReactNode; authToken?: string | null }) {
  // Initialize from localStorage for instant offline / startup render
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_THEME_KEY) as ThemeId;
    return saved && PREDEFINED_THEMES[saved] ? saved : "default-blue";
  });

  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_MODE_KEY) as ThemeMode;
    return saved === "dark" || saved === "light" ? saved : "light";
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute active colors from theme definition and mode
  const currentThemeDef = PREDEFINED_THEMES[theme] || PREDEFINED_THEMES["default-blue"];
  const colors = currentThemeDef[mode];

  // Helper to apply CSS variables and attributes to root element
  const applyThemeVariables = (_activeColors: ThemeColors, activeMode: ThemeMode, activeTheme: ThemeId) => {
    const root = document.documentElement;

    // Clean up any lingering inline properties so the two-layer stylesheet governs rendering cleanly
    root.style.removeProperty("--primary-color");
    root.style.removeProperty("--secondary-color");
    root.style.removeProperty("--background-color");
    root.style.removeProperty("--surface-color");
    root.style.removeProperty("--text-color");

    // Set root attributes for the two independent layers
    root.setAttribute("data-theme", activeTheme);
    root.setAttribute("data-mode", activeMode);
    root.setAttribute("data-theme-mode", activeMode);

    if (activeMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  // Synchronize CSS variables on every state change
  useEffect(() => {
    applyThemeVariables(colors, mode, theme);
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme);
    localStorage.setItem(LOCAL_STORAGE_MODE_KEY, mode);
  }, [theme, mode, colors]);

  // Load preferences from MySQL when user is authenticated
  const loadPreferences = async (token?: string) => {
    const activeToken = token || authToken || localStorage.getItem("lms_token");
    if (!activeToken) return;

    try {
      const res = await fetch("/api/user/preferences", {
        headers: { "Authorization": `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const pref: UserPreference = await res.json();
        if (pref.theme && PREDEFINED_THEMES[pref.theme]) {
          setThemeState(pref.theme);
        }
        if (pref.mode === "light" || pref.mode === "dark") {
          setModeState(pref.mode);
        }
      }
    } catch (err) {
      console.error("Failed to load user preferences from server", err);
    }
  };

  // Sync with server when authToken becomes available
  useEffect(() => {
    if (authToken) {
      loadPreferences(authToken);
    }
  }, [authToken]);

  // Save changes to MySQL backend
  const persistToServer = async (newTheme: ThemeId, newMode: ThemeMode) => {
    const activeToken = authToken || localStorage.getItem("lms_token");
    if (!activeToken) return; // User not logged in, localStorage is sufficient

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
        const errData = await res.json();
        setError(errData.error || "Failed to save theme preference.");
      }
    } catch (err) {
      setError("Network error while saving theme preference.");
    } finally {
      setIsSaving(false);
    }
  };

  const setTheme = async (newTheme: ThemeId) => {
    if (!PREDEFINED_THEMES[newTheme]) return;
    setThemeState(newTheme);
    await persistToServer(newTheme, mode);
  };

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    await persistToServer(theme, newMode);
  };

  const toggleMode = async () => {
    const nextMode: ThemeMode = mode === "light" ? "dark" : "light";
    setModeState(nextMode);
    await persistToServer(theme, nextMode);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        mode,
        colors,
        availableThemes: Object.values(PREDEFINED_THEMES),
        setTheme,
        setMode,
        toggleMode,
        loadPreferences,
        isSaving,
        error
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
