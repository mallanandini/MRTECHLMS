/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext.js";

interface ThemeQuickControlsProps {
  onOpenPreferences?: () => void;
  compact?: boolean;
  className?: string;
}

export function ThemeQuickControls({ 
  onOpenPreferences, 
  compact = false, 
  className = "" 
}: ThemeQuickControlsProps) {
  const { mode, toggleMode, theme, availableThemes } = useTheme();
  const activeDef = availableThemes.find(t => t.id === theme);

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 shrink-0 ${className}`}>
      <button
        type="button"
        onClick={toggleMode}
        className={`h-8.5 sm:h-9 rounded-xl border border-slate-200 dark:border-[#263449] bg-slate-50/80 dark:bg-[#111C30] hover:bg-slate-100 dark:hover:bg-[#16243D] hover:border-slate-300 dark:hover:border-[#384b66] text-slate-700 dark:text-[#F1F5F9] transition cursor-pointer shadow-2xs flex items-center justify-center text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
          compact ? "w-8.5 sm:w-9 px-0" : "px-2.5 sm:px-3 gap-1.5"
        }`}
        title={`Switch to ${mode === "light" ? "Dark" : "Light"} Mode`}
        aria-label={`Switch to ${mode === "light" ? "Dark" : "Light"} mode`}
      >
        {mode === "light" ? (
          <>
            <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700 shrink-0" />
            {!compact && <span className="hidden sm:inline font-medium">Dark</span>}
          </>
        ) : (
          <>
            <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
            {!compact && <span className="hidden sm:inline font-medium">Light</span>}
          </>
        )}
      </button>

      {onOpenPreferences && (
        <button
          type="button"
          onClick={onOpenPreferences}
          className="h-9 sm:h-9.5 px-2.5 sm:px-3 rounded-xl border border-slate-200 dark:border-[#263449] bg-white dark:bg-[#111C30] hover:bg-slate-50 dark:hover:bg-[#16243D] text-slate-700 dark:text-[#F1F5F9] transition cursor-pointer shadow-2xs flex items-center gap-2"
          title="Open Theme & Display Preferences"
          aria-label="Open Theme & Display Preferences"
        >
          <span 
            className="w-3 h-3 rounded-full shrink-0 border border-black/10 dark:border-white/10 shadow-xs" 
            style={{ backgroundColor: "var(--theme-primary)" }}
          />
          <span className="hidden sm:inline text-xs font-bold font-mono truncate max-w-[100px] sm:max-w-[130px]">
            {activeDef?.name || "Theme"}
          </span>
        </button>
      )}
    </div>
  );
}
