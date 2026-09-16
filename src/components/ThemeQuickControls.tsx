/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext.js";

interface ThemeQuickControlsProps {
  onOpenPreferences?: () => void;
}

export function ThemeQuickControls({ onOpenPreferences }: ThemeQuickControlsProps) {
  const { mode, toggleMode, theme, availableThemes } = useTheme();
  const activeDef = availableThemes.find(t => t.id === theme);

  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
      <button
        type="button"
        onClick={toggleMode}
        className="p-2 rounded-xl border border-slate-200/80 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shadow-xs flex items-center gap-1.5 text-xs font-semibold"
        title={`Switch to ${mode === "light" ? "Dark" : "Light"} Mode`}
      >
        {mode === "light" ? (
          <>
            <Moon className="w-4 h-4" style={{ color: "var(--theme-primary)" }} />
            <span className="hidden sm:inline">Dark</span>
          </>
        ) : (
          <>
            <Sun className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Light</span>
          </>
        )}
      </button>

      {onOpenPreferences && (
        <button
          type="button"
          onClick={onOpenPreferences}
          className="flex items-center gap-2 py-1.5 px-2.5 sm:px-3 rounded-xl border border-slate-200/80 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer shadow-xs"
          title="Open Theme & Display Preferences"
        >
          <span 
            className="w-3 h-3 rounded-full shrink-0 border border-black/10 shadow-xs" 
            style={{ backgroundColor: "var(--theme-primary)" }}
          />
          <span className="text-xs font-bold font-mono truncate max-w-[100px] sm:max-w-[130px]">
            {activeDef?.name || "Theme"}
          </span>
        </button>
      )}
    </div>
  );
}
