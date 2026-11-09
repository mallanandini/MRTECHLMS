/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Sun, Moon, Palette, Check, ChevronDown, Sparkles } from "lucide-react";
import { useTheme } from "../context/ThemeContext.js";
import { ThemeId } from "../types.js";

interface ThemeQuickControlsProps {
  onOpenPreferences?: () => void;
  compact?: boolean;
  className?: string;
  showModeToggle?: boolean;
}

const THEME_SWATCH_COLORS: Record<string, { primary: string; secondary: string; darkPrimary: string }> = {
  "default-blue": { primary: "#2563eb", secondary: "#eff6ff", darkPrimary: "#3b82f6" },
  "ocean-teal": { primary: "#0d9488", secondary: "#f0fdfa", darkPrimary: "#14b8a6" },
  "royal-indigo": { primary: "#4f46e5", secondary: "#eef2ff", darkPrimary: "#6366f1" },
  "emerald-green": { primary: "#059669", secondary: "#ecfdf5", darkPrimary: "#10b981" },
  "graphite": { primary: "#52525b", secondary: "#f4f4f5", darkPrimary: "#a1a1aa" },
  "royal-purple": { primary: "#9333ea", secondary: "#faf5ff", darkPrimary: "#a855f7" },
  "sunset-orange": { primary: "#ea580c", secondary: "#fff7ed", darkPrimary: "#f97316" },
  "ruby-red": { primary: "#dc2626", secondary: "#fef2f2", darkPrimary: "#ef4444" },
  "midnight-navy": { primary: "#1d4ed8", secondary: "#e2e8f0", darkPrimary: "#3b82f6" },
  "rose-pink": { primary: "#db2777", secondary: "#fdf2f8", darkPrimary: "#ec4899" },
  // aliases
  "emerald": { primary: "#059669", secondary: "#ecfdf5", darkPrimary: "#10b981" },
  "purple-royal": { primary: "#9333ea", secondary: "#faf5ff", darkPrimary: "#a855f7" },
  "cyber-dark": { primary: "#1d4ed8", secondary: "#e2e8f0", darkPrimary: "#3b82f6" },
  "high-contrast": { primary: "#52525b", secondary: "#f4f4f5", darkPrimary: "#a1a1aa" }
};

export function ThemeQuickControls({ 
  onOpenPreferences, 
  compact = false, 
  className = "",
  showModeToggle = true
}: ThemeQuickControlsProps) {
  const { mode, setMode, toggleMode, theme, setTheme, availableThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const activeDef = availableThemes.find(t => t.id === theme) || availableThemes[0];
  const activeSwatch = THEME_SWATCH_COLORS[theme] || THEME_SWATCH_COLORS["default-blue"];

  return (
    <div ref={containerRef} className={`relative inline-flex items-center gap-1.5 sm:gap-2 shrink-0 ${className}`}>
      {/* 1. Theme Selector Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="h-8.5 sm:h-9 px-2.5 sm:px-3 rounded-xl border border-slate-200 dark:border-[#263449] bg-white dark:bg-[#111C30] hover:bg-slate-50 dark:hover:bg-[#16243D] text-slate-800 dark:text-[#F1F5F9] transition cursor-pointer shadow-2xs flex items-center gap-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
        title="Change LMS Color Theme"
        aria-label="Change LMS Color Theme"
      >
        <span className="flex items-center gap-1">
          <span 
            className="w-3 h-3 rounded-full shrink-0 border border-black/15 dark:border-white/20 shadow-2xs transition-colors" 
            style={{ backgroundColor: mode === "dark" ? activeSwatch.darkPrimary : activeSwatch.primary }}
          />
          <Palette className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
        </span>
        
        {!compact && (
          <span className="hidden sm:inline font-bold truncate max-w-[110px]">
            {activeDef?.name || "Theme"}
          </span>
        )}

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-150 shrink-0 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* 2. Fast Dark/Light Mode Toggle */}
      {showModeToggle && (
        <button
          type="button"
          onClick={toggleMode}
          className={`h-8.5 sm:h-9 rounded-xl border border-slate-200 dark:border-[#263449] bg-slate-50/80 dark:bg-[#111C30] hover:bg-slate-100 dark:hover:bg-[#16243D] hover:border-slate-300 dark:hover:border-[#384b66] text-slate-700 dark:text-[#F1F5F9] transition cursor-pointer shadow-2xs flex items-center justify-center text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] ${
            compact ? "w-8.5 sm:w-9 px-0" : "px-2.5 sm:px-3 gap-1.5"
          }`}
          title={`Switch to ${mode === "light" ? "Dark" : "Light"} Mode`}
          aria-label={`Switch to ${mode === "light" ? "Dark" : "Light"} mode`}
        >
          {mode === "light" ? (
            <>
              <Moon className="w-3.5 h-3.5 text-slate-700 shrink-0" />
              {!compact && <span className="hidden sm:inline font-medium">Dark</span>}
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              {!compact && <span className="hidden sm:inline font-medium">Light</span>}
            </>
          )}
        </button>
      )}

      {/* 3. Dropdown Popover */}
      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-2 w-72 sm:w-84 max-h-[80vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#111c30] border border-slate-200 dark:border-[#263449] shadow-2xl z-50 p-3 animate-in fade-in zoom-in-95 duration-100 font-sans"
          role="menu"
          aria-orientation="vertical"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-2 py-1.5 pb-2.5 border-b border-slate-100 dark:border-[#1e2c42]">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">Color Theme</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 leading-none">Select Workspace Palette</p>
              </div>
            </div>
            <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
              {availableThemes.length} Themes
            </span>
          </div>

          {/* Theme Options */}
          <div className="py-2 space-y-1">
            {availableThemes.map((item) => {
              const isActive = item.id === theme;
              const swatch = THEME_SWATCH_COLORS[item.id] || THEME_SWATCH_COLORS["default-blue"];
              const primaryHex = mode === "dark" ? swatch.darkPrimary : swatch.primary;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTheme(item.id as ThemeId);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition cursor-pointer group ${
                    isActive 
                      ? "bg-slate-100 dark:bg-slate-800/90 text-slate-950 dark:text-white ring-1 ring-[var(--color-primary)]" 
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Swatch dots */}
                    <div className="flex items-center -space-x-1 shrink-0">
                      <span 
                        className="w-4 h-4 rounded-full border border-black/10 dark:border-white/20 shadow-2xs" 
                        style={{ backgroundColor: primaryHex }}
                      />
                      <span 
                        className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/20 shadow-2xs" 
                        style={{ backgroundColor: swatch.secondary }}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${isActive ? "text-slate-950 dark:text-white" : "group-hover:text-slate-900 dark:group-hover:text-white"}`}>
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {isActive && (
                    <Check className="w-4 h-4 text-[var(--color-primary)] shrink-0 font-bold" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Light / Dark Mode Segment Controls */}
          <div className="pt-2 border-t border-slate-100 dark:border-[#1e2c42] space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Display Mode</span>
              <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setMode("light")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                    mode === "light" 
                      ? "bg-white text-slate-900 shadow-2xs" 
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <Sun className="w-3 h-3 text-amber-500" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("dark")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                    mode === "dark" 
                      ? "bg-[#16243D] text-white shadow-2xs" 
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <Moon className="w-3 h-3 text-blue-400" />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            {onOpenPreferences && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenPreferences();
                }}
                className="w-full text-center py-1.5 text-[11px] font-semibold text-[var(--color-primary)] hover:underline cursor-pointer block"
              >
                More Profile Preferences →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
