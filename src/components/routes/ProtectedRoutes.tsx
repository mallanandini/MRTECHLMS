/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.js";
import { UserRole } from "../../types.js";

export function StudentProtectedRoute() {
  const { currentUser, authToken, isAuthenticating } = useAuth();
  const location = useLocation();

  if (isAuthenticating) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900 flex flex-col justify-center items-center font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-xs font-semibold text-slate-500 font-mono uppercase tracking-wider">Verifying Student Session...</p>
      </div>
    );
  }

  if (!currentUser || !authToken) {
    return <Navigate to="/student/login" state={{ from: location }} replace />;
  }

  if (currentUser.role === UserRole.ADMIN) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (currentUser.role !== UserRole.STUDENT) {
    return <Navigate to="/student/login" replace />;
  }

  return <Outlet />;
}

export function AdminProtectedRoute() {
  const { currentUser, authToken, isAuthenticating } = useAuth();
  const location = useLocation();

  if (isAuthenticating) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900 flex flex-col justify-center items-center font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mb-4"></div>
        <p className="text-xs font-semibold text-slate-500 font-mono uppercase tracking-wider">Verifying Admin Session...</p>
      </div>
    );
  }

  if (!currentUser || !authToken) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (currentUser.role === UserRole.STUDENT) {
    return <Navigate to="/student/dashboard" replace />;
  }

  if (currentUser.role !== UserRole.ADMIN) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
