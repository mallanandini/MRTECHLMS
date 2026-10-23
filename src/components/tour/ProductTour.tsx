/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { 
  Sparkles, X, ChevronRight, ChevronLeft, CheckCircle2, ArrowRight, Compass 
} from "lucide-react";
import { useTour } from "../../context/TourContext.js";

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export function ProductTour() {
  const {
    isTourActive,
    currentStepIndex,
    currentStep,
    steps,
    isFirstTimeModalOpen,
    activeRole,
    startTour,
    stopTour,
    nextStep,
    prevStep,
    goToStep,
    dismissFirstTimeModal,
  } = useTour();

  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Measure target element position
  const updateTargetRect = useCallback(() => {
    if (!isTourActive || !currentStep?.target) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(currentStep.target);
    if (element) {
      // Auto-scroll target into view if needed
      element.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      const rect = element.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right,
      });
    } else {
      setTargetRect(null);
    }
  }, [isTourActive, currentStep]);

  // Keep target rect updated on step change, resize, and scroll
  useEffect(() => {
    if (!isTourActive) return;

    // Small delay to allow any submenu transitions to complete
    const timer = setTimeout(() => {
      updateTargetRect();
    }, 150);

    const handleUpdate = () => updateTargetRect();
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
    };
  }, [isTourActive, currentStepIndex, updateTargetRect]);

  // Keyboard navigation: Escape to exit, Arrows to navigate
  useEffect(() => {
    if (!isTourActive && !isFirstTimeModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isTourActive) stopTour();
        else if (isFirstTimeModalOpen) dismissFirstTimeModal(true);
      } else if (isTourActive && e.key === "ArrowRight") {
        nextStep();
      } else if (isTourActive && e.key === "ArrowLeft") {
        prevStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTourActive, isFirstTimeModalOpen, stopTour, dismissFirstTimeModal, nextStep, prevStep]);

  // If neither tour nor welcome modal is active, render nothing
  if (!isTourActive && !isFirstTimeModalOpen) {
    return null;
  }

  // 1. FIRST-TIME ONBOARDING WELCOME MODAL
  if (isFirstTimeModalOpen && !isTourActive) {
    return (
      <div 
        className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-welcome-title"
      >
        <div 
          style={{ 
            backgroundColor: "var(--theme-surface)", 
            color: "var(--theme-text)",
            borderColor: "var(--theme-border)" 
          }}
          className="relative w-full max-w-lg rounded-2xl border shadow-2xl p-6 sm:p-7 overflow-hidden select-none"
        >
          {/* Decorative background glow */}
          <div 
            className="absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ backgroundColor: "var(--theme-primary)" }}
          />

          {/* Dismiss button */}
          <button
            type="button"
            onClick={() => dismissFirstTimeModal(true)}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Skip tour"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon Badge */}
          <div 
            style={{ 
              backgroundColor: "var(--theme-primary-light)", 
              color: "var(--theme-primary)" 
            }}
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-xs"
          >
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>

          <h2 
            id="tour-welcome-title"
            style={{ color: "var(--theme-text)" }}
            className="text-xl sm:text-2xl font-bold tracking-tight mb-2"
          >
            Welcome to MRTECHLMS!
          </h2>
          <p 
            style={{ color: "var(--theme-text-muted)" }}
            className="text-sm leading-relaxed mb-5"
          >
            Take a 60-second interactive tour to explore your new redesigned navigation, 
            key workflows, and productivity tools tailored for {activeRole === "admin" ? "Academy Administrators" : "Learners"}.
          </p>

          <div 
            style={{ 
              backgroundColor: "var(--theme-sidebar-card)", 
              borderColor: "var(--theme-border)" 
            }}
            className="rounded-xl border p-4 mb-6 space-y-2.5 text-xs font-medium"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "var(--theme-primary)" }} />
              <span>Clean, structured navigation with instant search & collapsible views</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "var(--theme-primary)" }} />
              <span>{activeRole === "admin" ? "Unified management for users, courses, and grading" : "Track course progress, coding challenges, and certificates"}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "var(--theme-primary)" }} />
              <span>Relaunch this tour anytime with one click from the navigation sidebar</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => dismissFirstTimeModal(true)}
              style={{ color: "var(--theme-text-muted)" }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Skip for Now
            </button>
            <button
              type="button"
              onClick={() => startTour(true)}
              style={{ 
                backgroundColor: "var(--theme-primary)", 
                color: "var(--theme-button-text)" 
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md hover:opacity-90 active:scale-98 transition cursor-pointer"
            >
              <span>Start Interactive Tour</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. INTERACTIVE PRODUCT TOUR OVERLAY & SPOTLIGHT
  const isCentered = !targetRect || !currentStep?.target;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Calculate Popover Position
  let popoverStyle: React.CSSProperties = {};
  if (isCentered) {
    popoverStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 9999,
    };
  } else if (targetRect) {
    const popoverWidth = 340;
    const padding = 16;
    
    // Check if target is on the left side of screen (e.g. sidebar)
    const placeRight = targetRect.right + popoverWidth + padding <= window.innerWidth;
    
    let left = placeRight ? targetRect.right + padding : targetRect.left - popoverWidth - padding;
    if (left < padding) left = padding;

    // Align vertically with target top, clamping to viewport
    const popoverHeight = 240;
    let top = Math.max(padding, Math.min(window.innerHeight - popoverHeight - padding, targetRect.top));

    popoverStyle = {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 9999,
      width: `${popoverWidth}px`,
    };
  }

  return (
    <div className="fixed inset-0 z-[9995] pointer-events-auto select-none" role="region" aria-label="Interactive Product Tour">
      {/* Target Spotlight Highlight Ring */}
      {targetRect && (
        <div
          style={{
            position: "fixed",
            top: `${Math.max(0, targetRect.top - 6)}px`,
            left: `${Math.max(0, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
            borderRadius: "14px",
            borderColor: "var(--theme-primary)",
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.72), 0 0 28px rgba(37, 99, 235, 0.45)",
            zIndex: 9998,
          }}
          className="pointer-events-none border-2 transition-all duration-300 ease-out"
        />
      )}

      {/* Full backdrop when step is centered */}
      {isCentered && (
        <div 
          className="fixed inset-0 z-[9998] bg-slate-950/72 backdrop-blur-xs transition-opacity duration-300"
          onClick={stopTour}
        />
      )}

      {/* Popover Step Card */}
      <div
        ref={popoverRef}
        style={{
          ...popoverStyle,
          backgroundColor: "var(--theme-surface)",
          borderColor: "var(--theme-border)",
          color: "var(--theme-text)",
        }}
        className="w-[340px] max-w-[90vw] rounded-2xl border shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span
              style={{
                backgroundColor: "var(--theme-primary-light)",
                color: "var(--theme-primary)",
              }}
              className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider"
            >
              {currentStep?.badge || "Tour"}
            </span>
            <span
              style={{ color: "var(--theme-text-muted)" }}
              className="text-xs font-mono font-medium"
            >
              {currentStepIndex + 1} of {steps.length}
            </span>
          </div>

          <button
            type="button"
            onClick={stopTour}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Exit tour"
            title="Exit tour (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-4">
          <h3
            style={{ color: "var(--theme-text)" }}
            className="text-sm font-bold tracking-tight mb-1.5 flex items-center gap-2"
          >
            {isCentered && <Compass className="w-4 h-4 shrink-0 text-[var(--theme-primary)]" />}
            <span>{currentStep?.title}</span>
          </h3>
          <p
            style={{ color: "var(--theme-text-muted)" }}
            className="text-xs leading-relaxed"
          >
            {currentStep?.content}
          </p>
        </div>

        {/* Step dots indicator */}
        <div className="flex items-center justify-center gap-1.5 mb-4 py-1">
          {steps.map((step, idx) => (
            <button
              key={step.id}
              type="button"
              onClick={() => goToStep(idx)}
              style={{
                backgroundColor:
                  idx === currentStepIndex
                    ? "var(--theme-primary)"
                    : idx < currentStepIndex
                    ? "var(--theme-text-muted)"
                    : "var(--theme-border)",
                width: idx === currentStepIndex ? "18px" : "6px",
              }}
              className="h-1.5 rounded-full transition-all duration-200 cursor-pointer"
              title={`Go to step ${idx + 1}`}
              aria-label={`Go to step ${idx + 1}`}
            />
          ))}
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--theme-border)]">
          <button
            type="button"
            onClick={stopTour}
            style={{ color: "var(--theme-text-muted)" }}
            className="text-[11px] font-semibold hover:text-[var(--theme-text)] transition cursor-pointer px-1 py-1"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={prevStep}
                style={{
                  backgroundColor: "var(--theme-sidebar-card)",
                  borderColor: "var(--theme-border)",
                  color: "var(--theme-text)",
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold hover:opacity-80 transition cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={nextStep}
              style={{
                backgroundColor: "var(--theme-primary)",
                color: "var(--theme-button-text)",
              }}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs hover:opacity-90 active:scale-98 transition cursor-pointer"
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Finish</span>
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
