/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { UserRole } from "../types.js";
import { TourStep, getTourStepsForRole } from "../components/tour/types.js";
import { useAuth } from "./AuthContext.js";

interface TourContextType {
  isTourActive: boolean;
  currentStepIndex: number;
  currentStep: TourStep | null;
  steps: TourStep[];
  isFirstTimeModalOpen: boolean;
  activeRole: UserRole;
  expandedSubmenuRequest: string | null;
  startTour: (force?: boolean) => void;
  stopTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  acceptFirstTimeModal: () => void;
  dismissFirstTimeModal: (neverAskAgain?: boolean) => void;
  resetTourStatus: () => void;
  clearSubmenuRequest: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

function getTourStorageKey(role: UserRole, userId?: string | null): string {
  const safeUser = userId ? `_${userId}` : "";
  return `mrtechlms_tour_completed_${role}${safeUser}`;
}

export function TourProvider({ children }: { children: ReactNode }) {
  const { currentUser, adminUser, studentUser, activePortal } = useAuth();

  // Determine current active role and user identity
  const resolvedUser = activePortal === "admin" ? adminUser : studentUser || currentUser;
  const activeRole: UserRole = resolvedUser?.role || (activePortal === "admin" ? UserRole.ADMIN : UserRole.STUDENT);
  const activeUserId = resolvedUser?.id || null;

  const steps = getTourStepsForRole(activeRole);

  const [isTourActive, setIsTourActive] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isFirstTimeModalOpen, setIsFirstTimeModalOpen] = useState<boolean>(false);
  const [expandedSubmenuRequest, setExpandedSubmenuRequest] = useState<string | null>(null);

  // Check if first-time tour modal should be displayed for current user
  useEffect(() => {
    if (!resolvedUser || !activeUserId) return;

    const storageKey = getTourStorageKey(activeRole, activeUserId);
    const hasSeenTour = localStorage.getItem(storageKey);

    if (!hasSeenTour) {
      // Delay prompt slightly so dashboard renders cleanly first
      const timer = setTimeout(() => {
        setIsFirstTimeModalOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [activeUserId, activeRole, resolvedUser]);

  // Handle auto-expanding parent submenus when step requests it
  useEffect(() => {
    if (!isTourActive) return;
    const current = steps[currentStepIndex];
    if (current?.parentSubmenuId) {
      setExpandedSubmenuRequest(current.parentSubmenuId);
    }
  }, [isTourActive, currentStepIndex, steps]);

  const clearSubmenuRequest = useCallback(() => {
    setExpandedSubmenuRequest(null);
  }, []);

  const markTourCompleted = useCallback(() => {
    if (activeUserId) {
      localStorage.setItem(getTourStorageKey(activeRole, activeUserId), "true");
    } else {
      localStorage.setItem(`mrtechlms_tour_completed_${activeRole}`, "true");
    }
  }, [activeRole, activeUserId]);

  const startTour = useCallback((_force = false) => {
    setIsFirstTimeModalOpen(false);
    setCurrentStepIndex(0);
    setIsTourActive(true);
  }, []);

  const stopTour = useCallback(() => {
    setIsTourActive(false);
    setCurrentStepIndex(0);
    markTourCompleted();
  }, [markTourCompleted]);

  const nextStep = useCallback(() => {
    if (currentStepIndex >= steps.length - 1) {
      stopTour();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [currentStepIndex, steps.length, stopTour]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < steps.length) {
      setCurrentStepIndex(index);
    }
  }, [steps.length]);

  const acceptFirstTimeModal = useCallback(() => {
    setIsFirstTimeModalOpen(false);
    startTour(true);
  }, [startTour]);

  const dismissFirstTimeModal = useCallback((neverAskAgain = true) => {
    setIsFirstTimeModalOpen(false);
    if (neverAskAgain) {
      markTourCompleted();
    }
  }, [markTourCompleted]);

  const resetTourStatus = useCallback(() => {
    if (activeUserId) {
      localStorage.removeItem(getTourStorageKey(activeRole, activeUserId));
    }
    localStorage.removeItem(`mrtechlms_tour_completed_${activeRole}`);
  }, [activeRole, activeUserId]);

  const currentStep = isTourActive && steps[currentStepIndex] ? steps[currentStepIndex] : null;

  return (
    <TourContext.Provider
      value={{
        isTourActive,
        currentStepIndex,
        currentStep,
        steps,
        isFirstTimeModalOpen,
        activeRole,
        expandedSubmenuRequest,
        startTour,
        stopTour,
        nextStep,
        prevStep,
        goToStep,
        acceptFirstTimeModal,
        dismissFirstTimeModal,
        resetTourStatus,
        clearSubmenuRequest,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour(): TourContextType {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
}
