/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { usersDb } from "../db.js";
import { UserRole } from "../../src/types.js";
import { authRateLimiter, getClientIp } from "../rateLimiter.js";
import { validateBody, loginSchema } from "../validation.js";
import { logAuditEvent } from "../audit.js";
import { authenticateToken, JWT_SECRET } from "../middleware/auth.js";

export const authRouter = express.Router();

/**
 * Generate cryptographically signed HMAC-SHA256 JWT
 */
export function generateToken(user: { id: string; role: UserRole; email: string; organizationId?: string }): string {
  return jwt.sign(
    {
      sub: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId || "org-default"
    },
    JWT_SECRET,
    { algorithm: "HS256", expiresIn: "24h" }
  );
}

// POST /api/auth/register (Permanently disabled)
authRouter.post("/register", async (_req, res) => {
  return res.status(403).json({
    error: "Public registration is disabled. Please contact your LMS Administrator to obtain an account."
  });
});

// POST /api/auth/admin-register (Permanently disabled)
authRouter.post("/admin-register", async (_req, res) => {
  return res.status(403).json({
    error: "Public administrator registration is disabled for enterprise security. Administrator accounts must be provisioned via the secure CLI tool ('npm run create-admin') or authorized by an existing administrator."
  });
});

// POST /api/auth/login
authRouter.post("/login", authRateLimiter.middleware, validateBody(loginSchema), async (req, res) => {
  const { email, password, portal } = req.body;

  const user = await usersDb.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    authRateLimiter.recordHit(req);
    logAuditEvent({
      userEmail: email,
      action: "user_login",
      resourceType: "auth",
      details: { portal, reason: "user_not_found" },
      ipAddress: getClientIp(req),
      userAgent: req.headers["user-agent"],
      status: "failure"
    });
    return res.status(401).json({ error: "Invalid email or password" });
  }

  // Deactivate trainer role
  if (user.role === UserRole.TRAINER || user.email.toLowerCase() === "trainer@lms.com") {
    authRateLimiter.recordHit(req);
    return res.status(403).json({ error: "Trainer access is currently disabled." });
  }

  // Portal-specific role validation
  if (portal === "student" && user.role === UserRole.ADMIN) {
    authRateLimiter.recordHit(req);
    return res.status(403).json({ error: "This is an Admin account. Please log in through the Admin Portal." });
  }
  if (portal === "admin" && user.role === UserRole.STUDENT) {
    authRateLimiter.recordHit(req);
    return res.status(403).json({ error: "This is a Student account. Please log in through the Student Portal." });
  }

  if (user.status === "suspended") {
    authRateLimiter.recordHit(req);
    logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "user_login",
      resourceType: "auth",
      details: { portal, reason: "account_suspended" },
      ipAddress: getClientIp(req),
      userAgent: req.headers["user-agent"],
      status: "failure"
    });
    return res.status(403).json({ error: "Your account has been suspended" });
  }

  let passwordValid = false;
  let isLegacySha256 = false;

  // Check if stored hash is a bcrypt hash ($2a$, $2b$, or $2y$)
  if (user.passwordHash && (user.passwordHash.startsWith("$2a$") || user.passwordHash.startsWith("$2b$") || user.passwordHash.startsWith("$2y$"))) {
    passwordValid = await bcrypt.compare(password, user.passwordHash);
  } else {
    // Backward-compatible legacy SHA-256 detection and comparison
    const sha256Hash = crypto.createHash("sha256").update(password).digest("hex");
    if (user.passwordHash === sha256Hash) {
      passwordValid = true;
      isLegacySha256 = true;
    }
  }

  if (!passwordValid) {
    authRateLimiter.recordHit(req);
    logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "user_login",
      resourceType: "auth",
      details: { portal, reason: "invalid_password" },
      ipAddress: getClientIp(req),
      userAgent: req.headers["user-agent"],
      status: "failure"
    });
    return res.status(401).json({ error: "Invalid email or password" });
  }

  // Transparently upgrade legacy SHA-256 hash to bcrypt (cost factor 10) in MySQL
  if (isLegacySha256) {
    const upgradedBcryptHash = await bcrypt.hash(password, 10);
    await usersDb.update(user.id, { passwordHash: upgradedBcryptHash });
    user.passwordHash = upgradedBcryptHash;
  }

  // Clear rate limiter upon successful authentication
  authRateLimiter.reset(req);

  logAuditEvent({
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
    action: "user_login",
    resourceType: "auth",
    resourceId: user.id,
    details: { portal, loginMethod: "password" },
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"],
    status: "success"
  });

  const { passwordHash: _, ...userWithoutPassword } = user;
  const token = generateToken(user);

  res.json({ user: userWithoutPassword, token });
});

// GET /api/auth/me
authRouter.get("/me", authenticateToken, async (req, res) => {
  const user = await usersDb.findOne({ id: req.user!.id });
  if (!user) return res.status(404).json({ error: "User not found" });

  const { passwordHash: _, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
});

// POST /api/auth/logout
authRouter.post("/logout", authenticateToken, async (req, res) => {
  logAuditEvent({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: "user_logout",
    resourceType: "auth"
  });
  res.json({ success: true, message: "Logged out successfully" });
});
