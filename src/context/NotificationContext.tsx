/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

interface ToastMethods {
  (message: string, type?: ToastType, duration?: number): string;
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  warning: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
  showSuccess: (message: string, duration?: number) => string;
  showError: (message: string, duration?: number) => string;
  dismiss: (id: string) => void;
}

interface NotificationContextValue {
  toast: ToastMethods;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (val: boolean) => void;
  } | null>(null);

  const confirmCancelRef = useRef<HTMLButtonElement | null>(null);

  // Toast handlers
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = "info", duration = 4000): string => {
    let assignedId = "";
    let isDuplicate = false;

    setToasts(prev => {
      // Check if an identical toast with the same message and type is already active
      const existing = prev.find(t => t.message === message && t.type === type);
      if (existing) {
        assignedId = existing.id;
        isDuplicate = true;
        return prev;
      }
      assignedId = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      return [...prev.slice(-4), { id: assignedId, type, message, duration }];
    });

    if (duration > 0 && !isDuplicate && assignedId) {
      setTimeout(() => {
        dismissToast(assignedId);
      }, duration);
    }
    return assignedId;
  }, [dismissToast]);

  const toastMethods: ToastMethods = Object.assign(
    (message: string, type?: ToastType, duration?: number) => addToast(message, type, duration),
    {
      success: (message: string, duration?: number) => addToast(message, "success", duration),
      error: (message: string, duration?: number) => addToast(message, "error", duration),
      showSuccess: (message: string, duration?: number) => addToast(message, "success", duration),
      showError: (message: string, duration?: number) => addToast(message, "error", duration),
      warning: (message: string, duration?: number) => addToast(message, "warning", duration),
      info: (message: string, duration?: number) => addToast(message, "info", duration),
      dismiss: dismissToast
    }
  );

  // Confirm dialog handler (Promise-based)
  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        options: {
          confirmText: "Confirm",
          cancelText: "Cancel",
          variant: "danger",
          ...options
        },
        resolve
      });
    });
  }, []);

  const handleConfirmAction = (result: boolean) => {
    if (confirmState) {
      confirmState.resolve(result);
      setConfirmState(null);
    }
  };

  // Focus cancel button on confirm modal open & handle Escape key
  useEffect(() => {
    if (!confirmState) return;

    confirmCancelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleConfirmAction(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmState]);

  return (
    <NotificationContext.Provider value={{ toast: toastMethods, confirm }}>
      {children}

      {/* Global Toast Container */}
      <div 
        aria-live="polite"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map(t => {
          const isError = t.type === "error";
          const isSuccess = t.type === "success";
          const isWarning = t.type === "warning";

          return (
            <div
              key={t.id}
              role={isError ? "alert" : "status"}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-xl shadow-lg border text-xs font-semibold backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
                isSuccess
                  ? "bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100"
                  : isError
                  ? "bg-rose-50/95 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100"
                  : isWarning
                  ? "bg-amber-50/95 dark:bg-amber-950/90 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100"
                  : "bg-white/95 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                {isError && <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                {isWarning && <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
              </div>

              <div className="flex-1 leading-snug break-words">
                {t.message}
              </div>

              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                aria-label="Dismiss notification"
                className="shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Global In-App Confirmation Modal */}
      {confirmState && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          aria-describedby="confirm-modal-desc"
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs font-sans animate-in fade-in duration-150"
          onClick={() => handleConfirmAction(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                confirmState.options.variant === "warning"
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                  : confirmState.options.variant === "info"
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                  : "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
              }`}>
                {confirmState.options.variant === "warning" ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : confirmState.options.variant === "info" ? (
                  <Info className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
              </div>

              <div className="space-y-1">
                <h3 id="confirm-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                  {confirmState.options.title}
                </h3>
                <p id="confirm-modal-desc" className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {confirmState.options.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                ref={confirmCancelRef}
                type="button"
                onClick={() => handleConfirmAction(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {confirmState.options.cancelText || "Cancel"}
              </button>

              <button
                type="button"
                onClick={() => handleConfirmAction(true)}
                className={`px-4 py-2 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs ${
                  confirmState.options.variant === "warning"
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : confirmState.options.variant === "info"
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-rose-600 hover:bg-rose-700 text-white"
                }`}
              >
                {confirmState.options.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useToast(): ToastMethods {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useToast must be used within a NotificationProvider");
  }
  return ctx.toast;
}

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a NotificationProvider");
  }
  return ctx.confirm;
}
