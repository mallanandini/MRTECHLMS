/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { User, UserRole } from "../types.js";

export const ADMIN_TOKEN_KEY = "mrtechlms_admin_token";
export const STUDENT_TOKEN_KEY = "mrtechlms_student_token";

export interface AuthContextType {
  // Active portal-resolved state (adapts seamlessly based on current route/tab)
  currentUser: User | null;
  authToken: string | null;
  isAuthenticating: boolean;
  login: (email: string, password: string, portal?: "student" | "admin") => Promise<{ success: boolean; error?: string; user?: User }>;
  adminRegister: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: (portal?: "student" | "admin") => void;
  refreshUser: () => Promise<void>;

  // Dedicated Admin session state & methods
  adminUser: User | null;
  adminToken: string | null;
  isAdminAuthenticating: boolean;
  logoutAdmin: () => void;
  refreshAdmin: () => Promise<void>;

  // Dedicated Student session state & methods
  studentUser: User | null;
  studentToken: string | null;
  isStudentAuthenticating: boolean;
  logoutStudent: () => void;
  refreshStudent: () => Promise<void>;

  // Active portal descriptor
  activePortal: "admin" | "student" | "public";
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function useSafeLocation() {
  try {
    return useLocation();
  } catch {
    return { pathname: typeof window !== "undefined" ? window.location.pathname : "/" };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const location = useSafeLocation();
  const pathname = location.pathname;

  // Determine active portal context based on route
  const isAdminRoute = pathname.startsWith("/admin") || pathname === "/manage-portal" || pathname.startsWith("/manager");
  const isStudentRoute = pathname.startsWith("/student");
  const activePortal: "admin" | "student" | "public" = isAdminRoute ? "admin" : isStudentRoute ? "student" : "public";

  // Dedicated Admin Session State
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  });
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isAdminAuthenticating, setIsAdminAuthenticating] = useState<boolean>(() => {
    return !!localStorage.getItem(ADMIN_TOKEN_KEY);
  });

  // Dedicated Student Session State
  const [studentToken, setStudentToken] = useState<string | null>(() => {
    return localStorage.getItem(STUDENT_TOKEN_KEY);
  });
  const [studentUser, setStudentUser] = useState<User | null>(null);
  const [isStudentAuthenticating, setIsStudentAuthenticating] = useState<boolean>(() => {
    return !!localStorage.getItem(STUDENT_TOKEN_KEY);
  });

  // Profile verification per portal
  const fetchProfile = async (token: string, portal: "admin" | "student") => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const user: User = data.user;

        if (portal === "admin") {
          if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN || user.role === UserRole.MANAGER) {
            setAdminUser(user);
          } else {
            // Token is not an admin/manager token
            localStorage.removeItem(ADMIN_TOKEN_KEY);
            setAdminToken(null);
            setAdminUser(null);
          }
        } else {
          if (user.role === UserRole.STUDENT) {
            setStudentUser(user);
          } else {
            // Token is not a student token
            localStorage.removeItem(STUDENT_TOKEN_KEY);
            setStudentToken(null);
            setStudentUser(null);
          }
        }
      } else {
        // Token is invalid/expired
        if (portal === "admin") {
          localStorage.removeItem(ADMIN_TOKEN_KEY);
          setAdminToken(null);
          setAdminUser(null);
        } else {
          localStorage.removeItem(STUDENT_TOKEN_KEY);
          setStudentToken(null);
          setStudentUser(null);
        }
      }
    } catch (err) {
      console.error(`[Auth] Profile verification failed for ${portal}:`, err);
    } finally {
      if (portal === "admin") {
        setIsAdminAuthenticating(false);
      } else {
        setIsStudentAuthenticating(false);
      }
    }
  };

  // Initial and reactive verification for Admin session
  useEffect(() => {
    if (adminToken) {
      fetchProfile(adminToken, "admin");
    } else {
      setIsAdminAuthenticating(false);
    }
  }, [adminToken]);

  // Initial and reactive verification for Student session
  useEffect(() => {
    if (studentToken) {
      fetchProfile(studentToken, "student");
    } else {
      setIsStudentAuthenticating(false);
    }
  }, [studentToken]);

  // Transparent migration of legacy lms_token if present and dedicated tokens missing
  useEffect(() => {
    const legacyToken = localStorage.getItem("lms_token") || localStorage.getItem("token");
    if (legacyToken && !adminToken && !studentToken) {
      (async () => {
        try {
          const res = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${legacyToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            const user: User = data.user;
            if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN || user.role === UserRole.MANAGER) {
              localStorage.setItem(ADMIN_TOKEN_KEY, legacyToken);
              setAdminToken(legacyToken);
              setAdminUser(user);
            } else if (user.role === UserRole.STUDENT) {
              localStorage.setItem(STUDENT_TOKEN_KEY, legacyToken);
              setStudentToken(legacyToken);
              setStudentUser(user);
            }
          }
        } catch {
          // ignore
        } finally {
          localStorage.removeItem("lms_token");
          localStorage.removeItem("token");
        }
      })();
    }
  }, []);

  // Portal-aware Cross-Tab Storage Event Synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ADMIN_TOKEN_KEY) {
        if (e.newValue) {
          setAdminToken(e.newValue);
          fetchProfile(e.newValue, "admin");
        } else {
          setAdminToken(null);
          setAdminUser(null);
          setIsAdminAuthenticating(false);
        }
      } else if (e.key === STUDENT_TOKEN_KEY) {
        if (e.newValue) {
          setStudentToken(e.newValue);
          fetchProfile(e.newValue, "student");
        } else {
          setStudentToken(null);
          setStudentUser(null);
          setIsStudentAuthenticating(false);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Authenticated Login Handler
  const login = async (email: string, password: string, portal?: "student" | "admin") => {
    try {
      const targetPortal: "student" | "admin" = portal || (isAdminRoute ? "admin" : "student");

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          portal: targetPortal
        })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Login failed" };
      }

      const user: User = data.user;
      const token: string = data.token;

      if (targetPortal === "admin" || user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN || user.role === UserRole.MANAGER) {
        localStorage.setItem(ADMIN_TOKEN_KEY, token);
        setAdminToken(token);
        setAdminUser(user);
        setIsAdminAuthenticating(false);
      } else {
        localStorage.setItem(STUDENT_TOKEN_KEY, token);
        setStudentToken(token);
        setStudentUser(user);
        setIsStudentAuthenticating(false);
      }

      return { success: true, user };
    } catch (err) {
      console.error("[Auth] Login request error:", err);
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const adminRegister = async (name: string, email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/admin-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password
        })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Registration failed" };
      }

      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      setAdminToken(data.token);
      setAdminUser(data.user);
      setIsAdminAuthenticating(false);
      return { success: true, user: data.user };
    } catch (err) {
      console.error("[Auth] Admin registration request error:", err);
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const logoutAdmin = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdminToken(null);
    setAdminUser(null);
    setIsAdminAuthenticating(false);
  };

  const logoutStudent = () => {
    localStorage.removeItem(STUDENT_TOKEN_KEY);
    setStudentToken(null);
    setStudentUser(null);
    setIsStudentAuthenticating(false);
  };

  const logout = (portal?: "student" | "admin") => {
    if (portal === "admin") {
      logoutAdmin();
    } else if (portal === "student") {
      logoutStudent();
    } else {
      if (isAdminRoute) {
        logoutAdmin();
      } else {
        logoutStudent();
      }
    }
  };

  const refreshAdmin = async () => {
    if (adminToken) {
      await fetchProfile(adminToken, "admin");
    }
  };

  const refreshStudent = async () => {
    if (studentToken) {
      await fetchProfile(studentToken, "student");
    }
  };

  const refreshUser = async () => {
    if (isAdminRoute) {
      await refreshAdmin();
    } else {
      await refreshStudent();
    }
  };

  // Resolve active portal values
  // On admin/manager routes: returns admin user/token
  // On student routes: returns student user/token
  // On public routes: returns student user/token (or null) to protect admin anonymity
  const currentUser = isAdminRoute ? adminUser : studentUser;
  const authToken = isAdminRoute ? adminToken : studentToken;
  const isAuthenticating = isAdminRoute ? isAdminAuthenticating : isStudentAuthenticating;

  return (
    <AuthContext.Provider
      value={{
        // Active portal-resolved (backward compatible)
        currentUser,
        authToken,
        isAuthenticating,
        login,
        adminRegister,
        logout,
        refreshUser,

        // Dedicated Admin session
        adminUser,
        adminToken,
        isAdminAuthenticating,
        logoutAdmin,
        refreshAdmin,

        // Dedicated Student session
        studentUser,
        studentToken,
        isStudentAuthenticating,
        logoutStudent,
        refreshStudent,

        // Active portal descriptor
        activePortal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
