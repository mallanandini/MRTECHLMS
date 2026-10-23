/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.js";
import { UserRole } from "../../types.js";

export function StudentProtectedRoute() {
  const { studentUser, studentToken, isStudentAuthenticating } = useAuth();
  const location = useLocation();

  if (isStudentAuthenticating) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900 flex flex-col justify-center items-center font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-xs font-semibold text-slate-500 font-mono uppercase tracking-wider">Verifying Student Session...</p>
      </div>
    );
  }

  if (!studentUser || !studentToken) {
    return <Navigate to="/student/login" state={{ from: location }} replace />;
  }

  if (studentUser.role !== UserRole.STUDENT) {
    return <Navigate to="/student/login" replace />;
  }

  return <Outlet />;
}

export function AdminProtectedRoute() {
  const { adminUser, adminToken, isAdminAuthenticating } = useAuth();
  const location = useLocation();

  if (isAdminAuthenticating) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900 flex flex-col justify-center items-center font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mb-4"></div>
        <p className="text-xs font-semibold text-slate-500 font-mono uppercase tracking-wider">Verifying Admin Session...</p>
      </div>
    );
  }

  if (!adminUser || !adminToken) {
    return <Navigate to="/manage-portal" state={{ from: location }} replace />;
  }

  if (adminUser.role !== UserRole.ADMIN && adminUser.role !== UserRole.SUPER_ADMIN) {
    return <Navigate to="/manage-portal" replace />;
  }

  return <Outlet />;
}

export function ManagerProtectedRoute() {
  const { adminUser, adminToken, isAdminAuthenticating } = useAuth();
  const location = useLocation();

  if (isAdminAuthenticating) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900 flex flex-col justify-center items-center font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-4"></div>
        <p className="text-xs font-semibold text-slate-500 font-mono uppercase tracking-wider">Verifying Manager Session...</p>
      </div>
    );
  }

  if (!adminUser || !adminToken) {
    return <Navigate to="/manage-portal" state={{ from: location }} replace />;
  }

  if (adminUser.role !== UserRole.MANAGER && adminUser.role !== UserRole.ADMIN && adminUser.role !== UserRole.SUPER_ADMIN) {
    return <Navigate to="/manage-portal" replace />;
  }

  return <Outlet />;
}
