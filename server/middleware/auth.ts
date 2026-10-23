/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import jwt from "jsonwebtoken";
import { usersDb } from "../db.js";
import { UserRole } from "../../src/types.js";

export const JWT_SECRET = process.env.JWT_SECRET || "mrtechlms-prod-jwt-secret-key-32chars-minimum!";

// Extend Express Request interface to include user and tenant
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
        email: string;
        organizationId?: string;
      };
      tenantId?: string;
    }
  }
}

/**
 * Cryptographic JWT Authentication Middleware
 */
export async function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({ error: "Access token is missing" });
  }

  try {
    // Explicitly enforce HS256 to reject alg:none, malformed, and tampered tokens
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as any;
    const userId = decoded.userId || decoded.sub;

    if (!userId) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    // Always fetch fresh user from database - NEVER trust role or status from client claims!
    const user = await usersDb.findOne({ id: userId });
    if (!user) {
      return res.status(401).json({ error: "User account not found" });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ error: "Your account has been suspended" });
    }

    // Role is strictly retrieved from the database
    req.user = {
      id: user.id,
      role: user.role as UserRole,
      email: user.email,
      organizationId: user.organizationId || "org-default"
    };
    req.tenantId = user.organizationId || "org-default";
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token has expired", expired: true });
    }
    return res.status(401).json({ error: "Invalid or corrupted token" });
  }
}

/**
 * Role-Based Access Control Middleware Generator
 */
export function requireRole(...roles: UserRole[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!roles.includes(req.user.role) && req.user.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: `Access denied: requires one of [${roles.join(", ")}]` });
    }
    next();
  };
}

export const requireAdmin = requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN);
export const requireManager = requireRole(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN);
export const requireStudent = requireRole(UserRole.STUDENT, UserRole.ADMIN, UserRole.SUPER_ADMIN);
