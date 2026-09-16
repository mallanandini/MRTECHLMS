/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, UserRole } from "../types.js";

interface AuthContextType {
  currentUser: User | null;
  authToken: string | null;
  isAuthenticating: boolean;
  login: (email: string, password: string, portal?: "student" | "admin") => Promise<{ success: boolean; error?: string; user?: User }>;
  adminRegister: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem("lms_token"));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(true);

  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      } else {
        // Token is invalid/expired
        localStorage.removeItem("lms_token");
        setAuthToken(null);
        setCurrentUser(null);
      }
    } catch (err) {
      console.error("Profile check failed:", err);
      localStorage.removeItem("lms_token");
      setAuthToken(null);
      setCurrentUser(null);
    } finally {
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchProfile(authToken);
    } else {
      setIsAuthenticating(false);
    }
  }, [authToken]);

  const login = async (email: string, password: string, portal?: "student" | "admin") => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          portal
        })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Login failed" };
      }

      localStorage.setItem("lms_token", data.token);
      setAuthToken(data.token);
      setCurrentUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      console.error("Login request error:", err);
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

      localStorage.setItem("lms_token", data.token);
      setAuthToken(data.token);
      setCurrentUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      console.error("Admin registration request error:", err);
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const logout = () => {
    localStorage.removeItem("lms_token");
    setAuthToken(null);
    setCurrentUser(null);
  };

  const refreshUser = async () => {
    if (authToken) {
      await fetchProfile(authToken);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        authToken,
        isAuthenticating,
        login,
        adminRegister,
        logout,
        refreshUser
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
