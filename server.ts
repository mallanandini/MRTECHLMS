/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "./server/env.js";
import express from "express";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import * as XLSX from "xlsx";
import fs from "fs";
import multer from "multer";

import jwt from "jsonwebtoken";
import helmet from "helmet";
import cors from "cors";

import { 
  usersDb, coursesDb, modulesDb, lessonsDb, enrollmentsDb, 
  progressDb, assessmentsDb, questionsDb, submissionsDb, 
  codingSubmissionsDb, blogsDb, commentsDb, reviewsDb, userPreferencesDb,
  learningPathsDb, learningPathSectionsDb, learningPathItemsDb, learningPathAssignmentsDb, learningPathProgressDb,
  codingChallengesDb, codingSavedCodeDb, assessmentAssignmentsDb,
  codingChaptersDb, codingTopicsDb, studentPlaygroundProgramsDb,
  groupsDb, groupMembersDb, assessmentAttemptsDb
} from "./server/db.js";
import { UserRole, LessonType, QuestionType, LearningPathItemType, TestCase } from "./src/types.js";
import { initializeDatabase } from "./server/seed.js";
import { detectAvailableRuntimes, executeProgram, evaluateTestCases } from "./server/codeExecution.js";
import { CodingExecutionService } from "./server/services/coding/coding-execution.service.js";
import { validateStrongPassword } from "./server/create-admin.js";
import { getJwtSecret } from "./server/jwt-secret.js";

import { pool } from "./server/mysql.js";
import { createRateLimiter, getClientIp } from "./server/rateLimiter.js";
import { logAuditEvent } from "./server/audit.js";
import { sendApiError, sendInternalError } from "./server/errorHandler.js";
import { validateBody, loginSchema, createUserSchema, updateProfileSchema, executeCodeSchema, aiExplainSchema } from "./server/validation.js";
import { tenantsRouter } from "./server/routes/tenants.routes.js";
import { certificatesRouter } from "./server/routes/certificates.routes.js";
import { organizationRouter } from "./server/routes/organization.routes.js";
import { CourseService } from "./server/services/course.service.js";
import { AccessControlService } from "./server/services/access-control.service.js";
import { CertificationService } from "./server/services/certification.service.js";
import { OrganizationService } from "./server/services/organization.service.js";
import { AnalyticsService } from "./server/services/analytics.service.js";
import { StudentLearningService } from "./server/services/student-learning.service.js";
import notificationsRouter from "./server/routes/notification.routes.js";
import { analyticsRouter } from "./server/routes/analytics.routes.js";
import { gamificationRouter } from "./server/routes/gamification.routes.js";
import { GamificationService } from "./server/services/gamification.service.js";
import { integrationsRouter } from "./server/routes/integrations.routes.js";
import { v1Router } from "./server/routes/v1.routes.js";
import { AIMentorService } from "./server/services/ai/ai-mentor.service.js";
import { aiRouter } from "./server/routes/ai.routes.js";
import { batchRouter } from "./server/routes/batch.routes.js";
import { BatchService } from "./server/services/batch.service.js";
import { schedulerService } from "./server/services/scheduler.service.js";
import { NotificationService } from "./server/services/notification.service.js";

dotenv.config();

const app = express();
const PORT = 3000;

// Security: Helmet HTTP security headers with customized Content-Security-Policy
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      mediaSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", "https:", "https://cdn.jsdelivr.net"],
      workerSrc: ["'self'", "blob:", "https://cdn.jsdelivr.net"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));


// Security: CORS configuration allowing trusted frontend origins and credentials
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(",").map(o => o.trim())
  : [process.env.APP_URL, "http://localhost:3000", "http://127.0.0.1:3000"].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== "production") {
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS policy violation: origin not allowed"));
  },
  credentials: true
}));

app.use(express.json());

// Health Check Endpoint
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", backend: "running", database: "connected", timestamp: new Date().toISOString() });
  } catch (err) {
    sendInternalError(res, "Database connection failure during health check", err);
  }
});

// Ensure storage directories exist for physical assets
const storageDir = path.join(process.cwd(), "storage");
const thumbnailsDir = path.join(storageDir, "course-thumbnails");
const materialsDir = path.join(storageDir, "materials");
const videosDir = path.join(storageDir, "videos");
const avatarsDir = path.join(storageDir, "avatars");

[storageDir, thumbnailsDir, materialsDir, videosDir, avatarsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Serve physical asset uploads with defensive sandbox headers and no directory listing
app.use("/storage", express.static(storageDir, {
  dotfiles: "ignore",
  index: false,
  setHeaders: (res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'; media-src 'self'; img-src 'self'");
  }
}));

// Serve local monaco-editor distribution to provide zero-latency, offline-capable code editor assets
const monacoVsDir = path.join(process.cwd(), "node_modules", "monaco-editor", "min", "vs");
if (fs.existsSync(monacoVsDir)) {
  app.use("/monaco/vs", express.static(monacoVsDir, {
    dotfiles: "ignore",
    index: false,
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
  }));
}

// Whitelist rules for upload validation
const ALLOWED_UPLOAD_EXTENSIONS: Record<string, string[]> = {
  thumbnail: [".jpg", ".jpeg", ".png", ".webp"],
  video: [".mp4", ".webm", ".ogg", ".mov"],
  materials: [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".txt", ".zip", ".xlsx", ".xls", ".csv"],
  avatar: [".jpg", ".jpeg", ".png", ".webp"]
};

const ALLOWED_UPLOAD_MIME_TYPES: Record<string, string[]> = {
  thumbnail: ["image/jpeg", "image/png", "image/webp"],
  video: ["video/mp4", "video/webm", "video/ogg", "video/quicktime"],
  materials: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
    "text/plain",
    "application/zip",
    "application/x-zip-compressed"
  ],
  avatar: ["image/jpeg", "image/png", "image/webp"]
};

const FOLDER_SIZE_LIMITS: Record<string, number> = {
  thumbnail: 5 * 1024 * 1024,  // 5 MB max for thumbnails
  materials: 30 * 1024 * 1024, // 30 MB max for materials (PDFs, docs)
  video: 150 * 1024 * 1024,    // 150 MB max for video
  avatar: 5 * 1024 * 1024      // 5 MB max for avatar photos
};

const DANGEROUS_EXTENSIONS = new Set([
  ".html", ".htm", ".xhtml", ".svg", ".js", ".mjs", ".cjs", ".ts",
  ".php", ".phtml", ".php3", ".php4", ".php5", ".phps",
  ".exe", ".bat", ".cmd", ".sh", ".bash", ".vbs", ".ps1",
  ".jsp", ".asp", ".aspx", ".cgi", ".pl", ".py", ".rb", ".jar", ".war"
]);

// Validate image file content against magic bytes to prevent masqueraded files
function isValidImageContent(filePath: string, ext: string): boolean {
  try {
    const fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(12);
    const bytesRead = fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    if (bytesRead < 4) return false;

    // JPEG: FF D8 FF
    if (ext === ".jpg" || ext === ".jpeg") {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (ext === ".png") {
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    }

    // WebP: RIFF .... WEBP
    if (ext === ".webp") {
      const isRiff = buffer.toString("ascii", 0, 4) === "RIFF";
      const isWebp = buffer.toString("ascii", 8, 12) === "WEBP";
      return isRiff && isWebp;
    }

    return true;
  } catch {
    return false;
  }
}

// Multer storage setup for Admin Course Creator assets
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = (req.query.folder as string) || "materials";
    if (folder === "thumbnail") cb(null, thumbnailsDir);
    else if (folder === "video") cb(null, videosDir);
    else if (folder === "avatar") cb(null, avatarsDir);
    else cb(null, materialsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 150 * 1024 * 1024 }, // 150MB max file size
  fileFilter: (req, file, cb) => {
    const folder = (req.query.folder as string) || "materials";
    const ext = path.extname(file.originalname).toLowerCase();

    // 1. Immediately reject dangerous script/executable extensions
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      return cb(new Error(`File extension '${ext}' is strictly prohibited for security reasons.`));
    }

    // 2. Validate against category extension whitelist
    const allowedExts = ALLOWED_UPLOAD_EXTENSIONS[folder] || ALLOWED_UPLOAD_EXTENSIONS.materials;
    if (!allowedExts.includes(ext)) {
      return cb(new Error(`Invalid file extension '${ext}' for folder '${folder}'. Allowed extensions: ${allowedExts.join(", ")}`));
    }

    // 3. Validate against category MIME whitelist
    const allowedMimes = ALLOWED_UPLOAD_MIME_TYPES[folder] || ALLOWED_UPLOAD_MIME_TYPES.materials;
    if (!allowedMimes.includes(file.mimetype.toLowerCase())) {
      return cb(new Error(`Invalid MIME type '${file.mimetype}' for folder '${folder}'.`));
    }

    cb(null, true);
  }
});

// ==========================================
// SECURITY: RATE LIMITERS
// ==========================================

// 1. Authentication rate limiter (10 attempts / 15 minutes / IP)
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 10,
  message: "Too many failed login attempts. Please try again in 15 minutes."
});

// 2. Code execution rate limiter (30 executions / 5 minutes / IP)
const codeExecutionRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxAttempts: 30,
  message: "Code execution rate limit exceeded. Please wait a few minutes before executing more code."
});

// 3. File upload rate limiter (30 uploads / 15 minutes / user)
const uploadRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 30,
  keyGenerator: (req) => req.user?.id || getClientIp(req),
  message: "Upload rate limit exceeded. Please wait before uploading additional files."
});

// 4. AI explanation rate limiter (20 requests / 10 minutes / user)
const aiRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxAttempts: 20,
  keyGenerator: (req) => req.user?.id || getClientIp(req),
  message: "AI explanation rate limit exceeded. Please wait before asking more questions."
});

if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error("FATAL SECURITY ERROR: Strong JWT_SECRET (minimum 32 chars) must be set in production!");
}
if (!process.env.JWT_SECRET) {
  console.warn("⚠️  SECURITY WARNING: JWT_SECRET environment variable is not set. Using local development fallback secret.");
}

function isPlatformAdmin(role: UserRole | string | undefined): boolean {
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}

function generateToken(user: { id: string; role: string; email: string }) {
  return jwt.sign(
    { sub: user.id, userId: user.id },
    getJwtSecret(),
    { algorithm: "HS256", expiresIn: "24h" }
  );
}

// Cryptographic JWT Authentication & Authorization Middleware
async function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token is missing" });
  }

  try {
    // Explicitly enforce HS256 to reject alg:none, malformed, and tampered tokens
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] }) as any;
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
    req.user = { id: user.id, role: user.role as UserRole, email: user.email, organizationId: user.organizationId || "org-default" };
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token has expired", expired: true });
    }
    return res.status(401).json({ error: "Invalid or corrupted token" });
  }
}

// Extend Express Request interface to include user
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

// Mount Multi-Tenancy Organization Router
app.use("/api/tenants", tenantsRouter);

// Mount Certification System Router
app.use("/api", certificatesRouter);

// Mount Organization Management Router
app.use("/api", organizationRouter);

// Mount Notification and Reminder System Router
app.use("/api", notificationsRouter);

// Mount Analytics and Reporting Engine Router
app.use("/api", analyticsRouter);

// Mount Gamification System Router
app.use("/api", gamificationRouter);

// Mount Enterprise Integrations Router
app.use("/api", integrationsRouter);

// Mount Public API v1 Router
app.use("/api/v1", v1Router);

// Mount AI Learning Layer Router
app.use("/api", aiRouter);

// Mount Batch Management Router
app.use("/api", batchRouter);

// ==========================================
// 1. AUTHENTICATION API
// ==========================================

app.post("/api/auth/register", async (req, res) => {
  return res.status(403).json({
    error: "Public registration is disabled. Please contact your LMS Administrator to obtain an account."
  });
});

app.post("/api/auth/admin-register", async (req, res) => {
  return res.status(403).json({
    error: "Public administrator registration is disabled for enterprise security. Administrator accounts must be provisioned via the secure CLI tool ('npm run create-admin') or authorized by an existing administrator."
  });
});

app.post("/api/auth/login", authRateLimiter.middleware, validateBody(loginSchema), async (req, res) => {
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
  if (portal === "student" && (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN)) {
    authRateLimiter.recordHit(req);
    return res.status(403).json({ error: "Access denied. Student portal accounts only." });
  }
  if (portal === "admin" && user.role === UserRole.STUDENT) {
    authRateLimiter.recordHit(req);
    return res.status(403).json({ error: "Access denied. This account does not have administrative privileges." });
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

app.get("/api/auth/me", authenticateToken, async (req, res) => {
  const user = await usersDb.findOne({ id: req.user!.id });
  if (!user) return res.status(404).json({ error: "User not found" });

  const { passwordHash: _, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
});

// ==========================================
// 1.1 USER PREFERENCES API
// ==========================================

const ALLOWED_THEMES = ["default-blue", "purple-royal", "emerald-green", "sunset-orange", "cyber-dark", "high-contrast"];
const ALLOWED_MODES = ["light", "dark"];
const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

app.get("/api/user/preferences", authenticateToken, async (req, res) => {
  const userId = req.user!.id;
  const pref = await userPreferencesDb.findOne({ userId });
  
  if (!pref) {
    // Return sensible defaults without mutating database until user saves
    return res.json({
      id: "default",
      userId,
      theme: "default-blue",
      primaryColor: "#2563eb",
      secondaryColor: "#4f46e5",
      backgroundColor: "#f8fafc",
      surfaceColor: "#ffffff",
      textColor: "#0f172a",
      mode: "light",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  res.json(pref);
});

app.put("/api/user/preferences", authenticateToken, async (req, res) => {
  const userId = req.user!.id;
  const { theme, mode, primaryColor, secondaryColor, backgroundColor, surfaceColor, textColor } = req.body;

  // Validate theme
  if (theme !== undefined && !ALLOWED_THEMES.includes(theme)) {
    return res.status(400).json({ error: "Invalid theme value" });
  }

  // Validate mode
  if (mode !== undefined && !ALLOWED_MODES.includes(mode)) {
    return res.status(400).json({ error: "Invalid mode value. Must be 'light' or 'dark'" });
  }

  // Validate color hex codes to prevent arbitrary CSS injection
  const colorProps: { [key: string]: string | undefined } = {
    primaryColor,
    secondaryColor,
    backgroundColor,
    surfaceColor,
    textColor
  };

  for (const [key, val] of Object.entries(colorProps)) {
    if (val !== undefined && !HEX_COLOR_REGEX.test(val)) {
      return res.status(400).json({ error: `Invalid hex color value for ${key}` });
    }
  }

  const existing = await userPreferencesDb.findOne({ userId });
  const now = new Date().toISOString();

  if (existing) {
    const updates: any = { updatedAt: now };
    if (theme !== undefined) updates.theme = theme;
    if (mode !== undefined) updates.mode = mode;
    if (primaryColor !== undefined) updates.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updates.secondaryColor = secondaryColor;
    if (backgroundColor !== undefined) updates.backgroundColor = backgroundColor;
    if (surfaceColor !== undefined) updates.surfaceColor = surfaceColor;
    if (textColor !== undefined) updates.textColor = textColor;

    const updated = await userPreferencesDb.update(existing.id, updates);
    return res.json(updated);
  } else {
    const created = await userPreferencesDb.insert({
      userId,
      theme: theme || "default-blue",
      primaryColor: primaryColor || "#2563eb",
      secondaryColor: secondaryColor || "#4f46e5",
      backgroundColor: backgroundColor || "#f8fafc",
      surfaceColor: surfaceColor || "#ffffff",
      textColor: textColor || "#0f172a",
      mode: mode || "light",
      createdAt: now,
      updatedAt: now
    });
    return res.json(created);
  }
});



// ==========================================
// 2. STUDENT API
// ==========================================

app.get("/api/student/dashboard", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const orgId = req.user!.organizationId || "org-default";
    const data = await StudentLearningService.getStudentHomeData(studentId, orgId);
    res.json(data);
  } catch (err: any) {
    console.error("Error in GET /api/student/dashboard:", err);
    res.status(500).json({ error: err.message || "Failed to load student dashboard" });
  }
});

// GET /api/student/courses/:courseId/overview - Comprehensive course syllabus & enrollment progress
app.get("/api/student/courses/:courseId/overview", authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const access = await CourseService.checkCourseAccess(req.user!, courseId);
    if (!access.allowed) {
      return res.status(access.status).json({ error: access.message });
    }
    const studentId = req.user!.id;
    const data = await StudentLearningService.getCourseOverview(courseId, studentId);
    res.json(data);
  } catch (err: any) {
    console.error(`Error in GET /api/student/courses/${req.params.courseId}/overview:`, err);
    const status = err.message === "Course not found" ? 404 : 500;
    res.status(status).json({ error: err.message || "Failed to load course overview" });
  }
});

// GET /api/student/profile/learning-profile - Comprehensive learning stats, achievements & credentials
app.get("/api/student/profile/learning-profile", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const orgId = req.user!.organizationId || "org-default";
    const data = await StudentLearningService.getStudentProfileData(studentId, orgId);
    res.json(data);
  } catch (err: any) {
    console.error("Error in GET /api/student/profile/learning-profile:", err);
    res.status(500).json({ error: err.message || "Failed to load student profile data" });
  }
});

app.get("/api/student/courses", authenticateToken, async (req, res) => {
  const studentId = req.user!.id;
  const effectiveCourses = await AccessControlService.getStudentEffectiveCourses(studentId);
  const effectiveMap = new Map(effectiveCourses.map(e => [e.courseId, e]));
  const effectiveCourseIds = new Set(effectiveCourses.map(e => e.courseId));

  const enrollments = await enrollmentsDb.find({ studentId });
  const enrollmentMap = new Map(enrollments.map(e => [e.courseId, e]));

  const allCourses = await coursesDb.find();
  // Filter courses student has effective access to AND that are published or archived
  // (Students cannot view courses in draft or review mode)
  const courses = allCourses
    .filter(c => effectiveCourseIds.has(c.id) && (c.status === "published" || c.status === "archived"))
    .map(c => {
      const enr = enrollmentMap.get(c.id);
      const eff = effectiveMap.get(c.id);
      const effectiveStatus = eff?.status || (enr ? AccessControlService.evaluateAccessStatus(enr) : "assigned");
      const isOverdue = enr ? AccessControlService.isOverdue(enr) : false;
      return {
        ...c,
        accessStatus: effectiveStatus,
        statusBadge: effectiveStatus,
        dueDate: enr?.dueDate || null,
        isOverdue,
        isMandatory: Boolean(enr?.isMandatory),
        isRevoked: false,
        assignmentSource: eff?.assignmentSource || enr?.assignmentSource || "individual",
        sourceDetails: eff?.sourceDetails || null,
        assignedAt: enr?.assignedAt || enr?.enrolledAt || eff?.enrolledAt,
        progressPercentage: enr?.progressPercentage || 0,
        completedAt: enr?.completedAt || null,
        lastLessonId: enr?.lastLessonId || null,
        lastAccessedAt: enr?.lastAccessedAt || null
      };
    });

  res.json(courses);
});

app.post("/api/student/courses/:courseId/enroll", authenticateToken, async (req, res) => {
  return res.status(403).json({
    error: "Self-enrollment is disabled. Course access must be assigned by an Administrator."
  });
});

// Resume Learning: fetch last accessed lesson and playback position
app.get("/api/student/courses/:courseId/resume", authenticateToken, async (req, res) => {
  try {
    const resumeInfo = await CourseService.getResumePosition(req.user!.id, req.params.courseId);
    res.json(resumeInfo);
  } catch (err: any) {
    if (err.message?.includes("Access denied") || err.message?.includes("revoked") || err.message?.includes("not enrolled")) {
      return res.status(403).json({ error: err.message });
    }
    res.status(404).json({ error: err.message || "Resume position unavailable" });
  }
});

// Record Lesson Activity Progress & Recalculate Course Completion Reliably
app.post("/api/student/lessons/:lessonId/progress", authenticateToken, async (req, res) => {
  const studentId = req.user!.id;
  const { lessonId } = req.params;

  try {
    const result = await CourseService.recordLessonProgress(studentId, lessonId, req.body);
    res.json(result);
  } catch (err: any) {
    if (err.message?.includes("Access denied") || err.message?.includes("revoked") || err.message?.includes("not enrolled")) {
      return res.status(403).json({ error: err.message });
    }
    if (err.message?.includes("not found")) {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || "Failed to update lesson progress" });
  }
});

app.get("/api/student/courses/:courseId/progress", authenticateToken, async (req, res) => {
  const studentId = req.user!.id;
  const { courseId } = req.params;

  if (req.user!.role === UserRole.STUDENT) {
    const access = await CourseService.checkCourseAccess(req.user!, courseId);
    if (!access.allowed) {
      return res.status(access.status).json({ error: access.message });
    }
  }

  const progress = await progressDb.find({ studentId, courseId });
  const enrollment = await enrollmentsDb.findOne({ studentId, courseId });
  res.json({
    progress,
    progressPercentage: enrollment?.progressPercentage || 0,
    lastLessonId: enrollment?.lastLessonId || null,
    lastAccessedAt: enrollment?.lastAccessedAt || null,
    completedAt: enrollment?.completedAt || null,
    status: enrollment ? AccessControlService.evaluateAccessStatus(enrollment) : "assigned",
    dueDate: enrollment?.dueDate || null,
    isMandatory: Boolean(enrollment?.isMandatory)
  });
});

app.put("/api/student/profile", authenticateToken, async (req, res) => {
  const { name, profilePhoto, password, phoneNumber, location } = req.body;
  
  const updates: any = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (profilePhoto !== undefined) updates.profilePhoto = profilePhoto;
  if (phoneNumber !== undefined) {
    const trimmedPhone = String(phoneNumber).trim();
    if (trimmedPhone) {
      const phoneCheck = isValidPhoneNumber(trimmedPhone);
      if (!phoneCheck.valid) {
        return res.status(400).json({ error: phoneCheck.reason });
      }
      updates.phoneNumber = trimmedPhone;
    }
  }
  if (location !== undefined) {
    const trimmedLoc = String(location).trim();
    if (trimmedLoc) {
      const locCheck = isValidLocation(trimmedLoc);
      if (!locCheck.valid) {
        return res.status(400).json({ error: locCheck.reason });
      }
      updates.location = trimmedLoc;
    }
  }
  if (password) {
    const validation = validateStrongPassword(String(password));
    if (!validation.valid) {
      return res.status(400).json({ error: `Password complexity requirement not met: ${validation.reason}` });
    }
    updates.passwordHash = await bcrypt.hash(String(password), 12);
  }

  const updated = await usersDb.update(req.user!.id, updates);
  if (!updated) return res.status(404).json({ error: "User not found" });

  if (password) {
    logAuditEvent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: "change_password",
      resourceType: "user",
      resourceId: req.user!.id,
      ipAddress: getClientIp(req),
      userAgent: req.headers["user-agent"]
    });
  }

  const { passwordHash: _, ...userWithoutPassword } = updated;
  res.json(userWithoutPassword);
});

// ==========================================
// USER AVATAR UPLOAD API
// ==========================================
app.post("/api/user/avatar", authenticateToken, uploadRateLimiter.middleware, (req, res, next) => {
  req.query.folder = "avatar";
  upload.single("file")(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Avatar upload failed validation" });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No avatar image file uploaded" });
  }

  const maxLimit = FOLDER_SIZE_LIMITS.avatar || (5 * 1024 * 1024);
  if (req.file.size > maxLimit) {
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (e) {}
    return res.status(400).json({
      error: `File size (${(req.file.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit for avatar (5 MB)`
    });
  }

  uploadRateLimiter.recordHit(req);

  const fileUrl = `/storage/avatars/${req.file.filename}`;

  logAuditEvent({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: "upload_avatar",
    resourceType: "user",
    resourceId: req.user!.id,
    details: { filename: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype, url: fileUrl },
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"],
    status: "success"
  });

  res.json({
    url: fileUrl,
    filename: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

app.get("/api/student/bookmarks", authenticateToken, async (req, res) => {
  const studentId = req.user!.id;
  const user = await usersDb.findOne({ id: studentId });
  if (!user) return res.status(404).json({ error: "User not found" });

  const bookmarkIds = user.bookmarkedBlogIds || [];
  const allBlogs = await blogsDb.find();
  const bookmarkedBlogs = allBlogs.filter(b => bookmarkIds.includes(b.id));
  res.json(bookmarkedBlogs);
});

app.get("/api/student/assessments", authenticateToken, async (req, res) => {
  const studentId = req.user!.id;
  const enrollments = await enrollmentsDb.find({ studentId });
  const activeEnrollments = enrollments.filter(e => e.status !== "revoked");
  const enrolledCourseIds = activeEnrollments.map(e => e.courseId);

  const allAssessments = await assessmentsDb.find({ status: "published" });
  const authorizedAssessments = allAssessments.filter(a => a.courseId && enrolledCourseIds.includes(a.courseId));
  const submissions = await submissionsDb.find({ studentId });
  const allCourses = await coursesDb.find();

  const courseAssessmentResults = authorizedAssessments.map(assessment => {
    const course = allCourses.find(c => c.id === assessment.courseId);
    const enr = activeEnrollments.find(e => e.courseId === assessment.courseId);
    
    // Find submissions for this specific student and assessment
    const studentSubmissions = submissions.filter(s => s.assessmentId === assessment.id);
    const highestSubmission = studentSubmissions.length > 0 
      ? studentSubmissions.reduce((prev, current) => (prev.score > current.score) ? prev : current)
      : null;
    const latestSubmission = studentSubmissions.length > 0
      ? studentSubmissions.slice().sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0]
      : null;

    return {
      ...assessment,
      courseTitle: course ? course.title : "Unknown Course",
      isEnrolled: true,
      isStandalone: false,
      status: highestSubmission ? (highestSubmission.passed ? "passed" : "failed") : "unattempted",
      bestScore: highestSubmission ? highestSubmission.score : null,
      latestScore: latestSubmission ? latestSubmission.score : null,
      attemptsCount: studentSubmissions.length,
      lastAttemptedAt: latestSubmission ? latestSubmission.submittedAt : null,
      dueDate: enr?.dueDate || null,
      isOverdue: enr ? AccessControlService.isOverdue(enr) : false,
      isMandatory: Boolean(enr?.isMandatory)
    };
  });

  // Standalone Assessments assigned directly to student (excluding revoked)
  const standaloneAssignments = await assessmentAssignmentsDb.find({ studentId });
  const activeAssignments = standaloneAssignments.filter(a => a.status !== "revoked");
  const standaloneAssessmentIds = activeAssignments.map(a => a.assessmentId);
  const standaloneAssessments = allAssessments.filter(a => standaloneAssessmentIds.includes(a.id));

  const standaloneResults = standaloneAssessments.map(assessment => {
    const assignment = activeAssignments.find(a => a.assessmentId === assessment.id);
    const studentSubmissions = submissions.filter(s => s.assessmentId === assessment.id);
    const highestSubmission = studentSubmissions.length > 0 
      ? studentSubmissions.reduce((prev, current) => (prev.score > current.score) ? prev : current)
      : null;
    const latestSubmission = studentSubmissions.length > 0
      ? studentSubmissions.slice().sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0]
      : null;

    let testStatus: "unattempted" | "in_progress" | "passed" | "failed" = "unattempted";
    if (studentSubmissions.length > 0) {
      testStatus = highestSubmission?.passed ? "passed" : "failed";
    } else if (assignment?.status === "in_progress") {
      testStatus = "in_progress";
    }

    return {
      ...assessment,
      courseTitle: assessment.category || "General Assessment",
      isEnrolled: true,
      isStandalone: true,
      assignmentId: assignment?.id,
      dueDate: assignment?.dueDate || null,
      isOverdue: assignment ? AccessControlService.isOverdue(assignment) : false,
      isMandatory: Boolean(assignment?.isMandatory),
      assignedAt: assignment?.assignedAt || null,
      status: testStatus,
      bestScore: highestSubmission ? highestSubmission.score : null,
      latestScore: latestSubmission ? latestSubmission.score : null,
      attemptsCount: studentSubmissions.length,
      lastAttemptedAt: latestSubmission ? latestSubmission.submittedAt : null
    };
  });

  res.json([...courseAssessmentResults, ...standaloneResults]);
});


// ==========================================
// 3. TRAINER API
// ==========================================

app.get("/api/trainer/dashboard", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.TRAINER && req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Trainer role required" });
  }

  const instructorId = req.user!.id;
  const myCourses = await coursesDb.find({ instructorId });
  const myCourseIds = myCourses.map(c => c.id);

  // Enrollments in trainer's courses
  const allEnrollments = await enrollmentsDb.find();
  const enrollments = allEnrollments.filter(e => myCourseIds.includes(e.courseId));
  const totalStudents = new Set(enrollments.map(e => e.studentId)).size;

  // Assessments created
  const allAssessments = await assessmentsDb.find();
  const assessments = allAssessments.filter(a => myCourseIds.includes(a.courseId));
  const blogs = await blogsDb.find({ authorId: instructorId });

  const allUsers = await usersDb.find();

  res.json({
    coursesCount: myCourses.length,
    studentsCount: totalStudents,
    assessmentsCount: assessments.length,
    blogsCount: blogs.length,
    recentCourses: myCourses.slice(-3),
    recentEnrollments: enrollments.slice(-5).map(e => {
      const student = allUsers.find(u => u.id === e.studentId);
      const course = myCourses.find(c => c.id === e.courseId);
      return {
        id: e.id,
        studentName: student ? student.name : "Unknown",
        courseTitle: course ? course.title : "Unknown",
        enrolledAt: e.enrolledAt
      };
    })
  });
});

// Course Creation CRUD
app.post("/api/trainer/courses", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.TRAINER && req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Trainer role required" });
  }

  const { title, description, thumbnail, banner, category, requirements, skillsCovered } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: "Title and description are required" });
  }

  const trainer = await usersDb.findOne({ id: req.user!.id })!;
  if (!trainer) return res.status(404).json({ error: "Trainer profile not found" });

  const course = await coursesDb.insert({
    title,
    description,
    thumbnail: thumbnail || "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80",
    banner: banner || "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&auto=format&fit=crop&q=80",
    instructorId: trainer.id,
    instructorName: trainer.name,
    category: category || "General",
    requirements: requirements || [],
    skillsCovered: skillsCovered || [],
    status: req.user!.role === UserRole.ADMIN ? "published" : "draft", // Admins auto-publish
    isFeatured: false,
    rating: 5.0,
    reviewsCount: 0,
    createdAt: new Date().toISOString()
  });

  res.status(201).json(course);
});

app.put("/api/trainer/courses/:id", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.TRAINER && req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Trainer role required" });
  }

  const course = await coursesDb.findOne({ id: req.params.id });
  if (!course) return res.status(404).json({ error: "Course not found" });

  // Security: Ensure trainer owns the course or is admin
  if (course.instructorId !== req.user!.id && req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Not authorized to modify this course" });
  }

  // Security: Whitelist updatable fields to prevent mass assignment
  const allowedCourseFields = ["title", "description", "thumbnail", "banner", "category", "requirements", "skillsCovered"];
  const safeCourseUpdates: any = {};
  for (const f of allowedCourseFields) {
    if (req.body[f] !== undefined) safeCourseUpdates[f] = req.body[f];
  }
  // Admins can also update status and isFeatured
  if (req.user!.role === UserRole.ADMIN) {
    if (req.body.status !== undefined) safeCourseUpdates.status = req.body.status;
    if (req.body.isFeatured !== undefined) safeCourseUpdates.isFeatured = req.body.isFeatured;
  }

  const updated = await coursesDb.update(req.params.id, safeCourseUpdates);
  res.json(updated);
});

app.delete("/api/trainer/courses/:id", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.TRAINER && req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Trainer role required" });
  }

  const course = await coursesDb.findOne({ id: req.params.id });
  if (!course) return res.status(404).json({ error: "Course not found" });

  if (course.instructorId !== req.user!.id && req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Not authorized to delete this course" });
  }

  await coursesDb.delete(req.params.id);
  res.json({ success: true });
});

// Modules and Lessons Creation
app.post("/api/trainer/courses/:courseId/modules", authenticateToken, async (req, res) => {
  const { title, order } = req.body;
  const { courseId } = req.params;

  const course = await coursesDb.findOne({ id: courseId });
  if (!course) return res.status(404).json({ error: "Course not found" });

  if (course.instructorId !== req.user!.id && req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const mod = await modulesDb.insert({
    courseId,
    title,
    order: order || 1
  });

  res.status(201).json(mod);
});

app.post("/api/trainer/modules/:moduleId/lessons", authenticateToken, async (req, res) => {
  const { title, type, content, videoUrl, fileUrl, codingPrompt, order, durationMinutes } = req.body;
  const { moduleId } = req.params;

  const mod = await modulesDb.findOne({ id: moduleId });
  if (!mod) return res.status(404).json({ error: "Module not found" });

  const course = await coursesDb.findOne({ id: mod.courseId });
  if (!course || (course.instructorId !== req.user!.id && req.user!.role !== UserRole.ADMIN)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const lesson = await lessonsDb.insert({
    moduleId,
    courseId: mod.courseId,
    title,
    type: type as LessonType,
    content,
    videoUrl,
    fileUrl,
    codingPrompt,
    order: order || 1,
    durationMinutes: durationMinutes || 10
  });

  res.status(201).json(lesson);
});

// Update Module
app.put("/api/trainer/modules/:id", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.TRAINER && req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Trainer role required" });
  }
  const mod = await modulesDb.findOne({ id: req.params.id });
  if (!mod) return res.status(404).json({ error: "Module not found" });

  const course = await coursesDb.findOne({ id: mod.courseId });
  if (!course || (course.instructorId !== req.user!.id && req.user!.role !== UserRole.ADMIN)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { title, order } = req.body;
  const updated = await modulesDb.update(req.params.id, { title, order });
  res.json(updated);
});

// Delete Module
app.delete("/api/trainer/modules/:id", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.TRAINER && req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Trainer role required" });
  }
  const mod = await modulesDb.findOne({ id: req.params.id });
  if (!mod) return res.status(404).json({ error: "Module not found" });

  const course = await coursesDb.findOne({ id: mod.courseId });
  if (!course || (course.instructorId !== req.user!.id && req.user!.role !== UserRole.ADMIN)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  await modulesDb.delete(req.params.id);
  res.json({ success: true });
});

// Update Lesson
app.put("/api/trainer/lessons/:id", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.TRAINER && req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Trainer role required" });
  }
  const lesson = await lessonsDb.findOne({ id: req.params.id });
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });

  const course = await coursesDb.findOne({ id: lesson.courseId });
  if (!course || (course.instructorId !== req.user!.id && req.user!.role !== UserRole.ADMIN)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  // Security: Whitelist lesson fields
  const allowedLessonFields = ["title", "type", "content", "videoUrl", "fileUrl", "codingPrompt", "order", "durationMinutes"];
  const safeLessonUpdates: any = {};
  for (const f of allowedLessonFields) {
    if (req.body[f] !== undefined) safeLessonUpdates[f] = req.body[f];
  }

  const updated = await lessonsDb.update(req.params.id, safeLessonUpdates);
  res.json(updated);
});

// Delete Lesson
app.delete("/api/trainer/lessons/:id", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.TRAINER && req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Trainer role required" });
  }
  const lesson = await lessonsDb.findOne({ id: req.params.id });
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });

  const course = await coursesDb.findOne({ id: lesson.courseId });
  if (!course || (course.instructorId !== req.user!.id && req.user!.role !== UserRole.ADMIN)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  await lessonsDb.delete(req.params.id);
  res.json({ success: true });
});

// Create Assessment for Course/Module
app.post("/api/trainer/courses/:courseId/assessments", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.TRAINER && req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Trainer role required" });
  }
  const { courseId } = req.params;
  const course = await coursesDb.findOne({ id: courseId });
  if (!course || (course.instructorId !== req.user!.id && req.user!.role !== UserRole.ADMIN)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { title, description, durationMinutes, passingScore, totalPoints, moduleId, status } = req.body;
  if (!title) return res.status(400).json({ error: "Assessment title is required" });

  const created = await assessmentsDb.insert({
    courseId,
    moduleId: moduleId || null,
    title,
    description: description || "",
    durationMinutes: durationMinutes || 15,
    passingScore: passingScore || 70,
    totalPoints: totalPoints || 10,
    questionsCount: 0,
    status: status || "published",
    createdAt: new Date().toISOString()
  });

  res.status(201).json(created);
});

// Update Assessment
app.put("/api/trainer/assessments/:id", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.TRAINER && req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Trainer role required" });
  }
  const assessment = await assessmentsDb.findOne({ id: req.params.id });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  const course = await coursesDb.findOne({ id: assessment.courseId });
  if (!course || (course.instructorId !== req.user!.id && req.user!.role !== UserRole.ADMIN)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  // Security: Whitelist assessment fields
  const allowedAssessmentFields = ["title", "description", "durationMinutes", "passingScore", "moduleId", "status"];
  const safeAssessmentUpdates: any = {};
  for (const f of allowedAssessmentFields) {
    if (req.body[f] !== undefined) safeAssessmentUpdates[f] = req.body[f];
  }

  const updated = await assessmentsDb.update(req.params.id, safeAssessmentUpdates);
  res.json(updated);
});

// Delete Assessment
app.delete("/api/trainer/assessments/:id", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.TRAINER && req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Trainer role required" });
  }
  const assessment = await assessmentsDb.findOne({ id: req.params.id });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  const course = await coursesDb.findOne({ id: assessment.courseId });
  if (!course || (course.instructorId !== req.user!.id && req.user!.role !== UserRole.ADMIN)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  await assessmentsDb.delete(req.params.id);
  res.json({ success: true });
});

// Add Question to Assessment
app.post("/api/trainer/assessments/:assessmentId/questions", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.TRAINER && req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Trainer role required" });
  }
  const { assessmentId } = req.params;
  const assessment = await assessmentsDb.findOne({ id: assessmentId });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  const course = await coursesDb.findOne({ id: assessment.courseId });
  if (!course || (course.instructorId !== req.user!.id && req.user!.role !== UserRole.ADMIN)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { type, questionText, options, correctAnswers, points, negativePoints } = req.body;
  if (!questionText || !type) return res.status(400).json({ error: "Question text and type are required" });

  const question = await questionsDb.insert({
    assessmentId,
    type,
    questionText,
    options: options || [],
    correctAnswers: correctAnswers || [],
    points: points || 5,
    negativePoints: negativePoints || 0
  });

  // Update questionsCount in assessment
  const existingQuestions = await questionsDb.find({ assessmentId });
  const totalPts = existingQuestions.reduce((sum, q) => sum + (q.points || 0), 0);
  await assessmentsDb.update(assessmentId, {
    questionsCount: existingQuestions.length,
    totalPoints: totalPts
  });

  res.status(201).json(question);
});

// Update Question
app.put("/api/trainer/questions/:id", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.TRAINER && req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Trainer role required" });
  }
  const question = await questionsDb.findOne({ id: req.params.id });
  if (!question) return res.status(404).json({ error: "Question not found" });

  const assessment = await assessmentsDb.findOne({ id: question.assessmentId });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  const course = await coursesDb.findOne({ id: assessment.courseId });
  if (!course || (course.instructorId !== req.user!.id && req.user!.role !== UserRole.ADMIN)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  // Security: Whitelist question fields
  const allowedQuestionFields = ["type", "questionText", "options", "correctAnswers", "points", "negativePoints"];
  const safeQuestionUpdates: any = {};
  for (const f of allowedQuestionFields) {
    if (req.body[f] !== undefined) safeQuestionUpdates[f] = req.body[f];
  }

  const updated = await questionsDb.update(req.params.id, safeQuestionUpdates);
  
  // Recalculate total points
  const existingQuestions = await questionsDb.find({ assessmentId: assessment.id });
  const totalPts = existingQuestions.reduce((sum, q) => sum + (q.points || 0), 0);
  await assessmentsDb.update(assessment.id, { totalPoints: totalPts });

  res.json(updated);
});

// Delete Question
app.delete("/api/trainer/questions/:id", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.TRAINER && req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Trainer role required" });
  }
  const question = await questionsDb.findOne({ id: req.params.id });
  if (!question) return res.status(404).json({ error: "Question not found" });

  const assessment = await assessmentsDb.findOne({ id: question.assessmentId });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  const course = await coursesDb.findOne({ id: assessment.courseId });
  if (!course || (course.instructorId !== req.user!.id && req.user!.role !== UserRole.ADMIN)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  await questionsDb.delete(req.params.id);

  // Recalculate count and total points
  const existingQuestions = await questionsDb.find({ assessmentId: assessment.id });
  const totalPts = existingQuestions.reduce((sum, q) => sum + (q.points || 0), 0);
  await assessmentsDb.update(assessment.id, {
    questionsCount: existingQuestions.length,
    totalPoints: totalPts
  });

  res.json({ success: true });
});

// View Enrolled Students for a Trainer's Course
app.get("/api/trainer/courses/:courseId/students", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.TRAINER && req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Trainer role required" });
  }
  const { courseId } = req.params;
  const course = await coursesDb.findOne({ id: courseId });
  if (!course || (course.instructorId !== req.user!.id && req.user!.role !== UserRole.ADMIN)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const enrollments = await enrollmentsDb.find({ courseId });
  const allUsers = await usersDb.find();
  const allLessons = await lessonsDb.find({ courseId });
  const allProgress = await progressDb.find({ courseId });

  const studentList = enrollments.map(e => {
    const user = allUsers.find(u => u.id === e.studentId);
    const studentProgress = allProgress.filter(p => p.studentId === e.studentId && p.completed);
    const percentage = allLessons.length > 0 ? Math.round((studentProgress.length / allLessons.length) * 100) : 0;

    return {
      enrollmentId: e.id,
      studentId: e.studentId,
      studentName: user ? user.name : "Unknown Student",
      studentEmail: user ? user.email : "",
      enrolledAt: e.enrolledAt,
      completedAt: e.completedAt,
      completedLessonsCount: studentProgress.length,
      totalLessonsCount: allLessons.length,
      percentage
    };
  });

  res.json(studentList);
});

// View Submissions for a Trainer's Assessment
app.get("/api/trainer/assessments/:assessmentId/submissions", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.TRAINER && req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Trainer role required" });
  }
  const { assessmentId } = req.params;
  const assessment = await assessmentsDb.findOne({ id: assessmentId });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  const course = await coursesDb.findOne({ id: assessment.courseId });
  if (!course || (course.instructorId !== req.user!.id && req.user!.role !== UserRole.ADMIN)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const submissions = await submissionsDb.find({ assessmentId });
  res.json(submissions.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
});

// Real Assessment Leaderboard from Submissions table
app.get("/api/assessments/:id/leaderboard", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const assessment = await assessmentsDb.findOne({ id });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  const submissions = await submissionsDb.find({ assessmentId: id });
  const sorted = submissions
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.timeTakenSeconds || 0) - (b.timeTakenSeconds || 0);
    })
    .slice(0, 10)
    .map((s, idx) => ({
      id: s.id,
      studentName: s.studentName,
      score: s.score,
      totalPoints: s.totalPoints,
      passed: s.passed,
      timeTakenSeconds: s.timeTakenSeconds,
      submittedAt: s.submittedAt,
      rank: idx + 1
    }));

  res.json(sorted);
});


// ==========================================
// 4. ADMIN API
// ==========================================

app.get("/api/admin/dashboard", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN && req.user!.role !== UserRole.SUPER_ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  try {
    const orgId = req.user!.organizationId || "org-default";
    const analytics = await AnalyticsService.getAdminOverviewAnalytics({ organizationId: orgId });

    // 1. Assessment statistics
    const [assessmentStatsRows]: any = await pool.query(
      `SELECT 
        COUNT(id) AS total,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft
       FROM assessments 
       WHERE (organizationId = ? OR organizationId IS NULL) AND deletedAt IS NULL`,
      [orgId]
    );
    const assessmentStats = {
      total: Number(assessmentStatsRows[0]?.total) || 0,
      published: Number(assessmentStatsRows[0]?.published) || 0,
      draft: Number(assessmentStatsRows[0]?.draft) || 0
    };

    // 2. Recent Courses (Top 5)
    const [recentCourses]: any = await pool.query(
      `SELECT c.id, c.title, c.category, c.status, c.updatedAt, c.createdAt,
              COUNT(e.id) AS enrollmentsCount
       FROM courses c
       LEFT JOIN enrollments e ON c.id = e.courseId AND e.deletedAt IS NULL AND e.status != 'revoked'
       WHERE (c.organizationId = ? OR c.organizationId IS NULL) AND c.deletedAt IS NULL
       GROUP BY c.id
       ORDER BY COALESCE(c.updatedAt, c.createdAt) DESC
       LIMIT 5`,
      [orgId]
    );

    // 3. Recent Assessments (Top 5)
    const [recentAssessments]: any = await pool.query(
      `SELECT a.id, a.title, a.category, a.status, a.passingScore, a.updatedAt, a.createdAt,
              COUNT(DISTINCT s.id) AS submissionsCount,
              COUNT(DISTINCT q.id) AS questionsCount
       FROM assessments a
       LEFT JOIN submissions s ON a.id = s.assessmentId
       LEFT JOIN questions q ON a.id = q.assessmentId AND q.deletedAt IS NULL
       WHERE (a.organizationId = ? OR a.organizationId IS NULL) AND a.deletedAt IS NULL
       GROUP BY a.id
       ORDER BY COALESCE(a.updatedAt, a.createdAt) DESC
       LIMIT 5`,
      [orgId]
    );

    // 4. Unified Real Recent Activity Stream (Top 10)
    const [recentActivity]: any = await pool.query(
      `SELECT * FROM (
        SELECT 
          s.id,
          'submission' AS activityType,
          u.name AS actorName,
          u.email AS actorEmail,
          a.title AS targetTitle,
          CONCAT(s.score, ' pts (', s.percentage, '%) • ', CASE WHEN s.passed = 1 THEN 'Passed' ELSE 'Failed' END) AS detail,
          s.submittedAt AS timestamp
        FROM submissions s
        JOIN users u ON s.studentId = u.id
        JOIN assessments a ON s.assessmentId = a.id
        WHERE (s.organizationId = ? OR s.organizationId IS NULL)

        UNION ALL

        SELECT 
          e.id,
          'enrollment' AS activityType,
          u.name AS actorName,
          u.email AS actorEmail,
          c.title AS targetTitle,
          CONCAT('Assigned via ', COALESCE(e.assignmentSource, 'direct')) AS detail,
          e.enrolledAt AS timestamp
        FROM enrollments e
        JOIN users u ON e.studentId = u.id
        JOIN courses c ON e.courseId = c.id
        WHERE (e.organizationId = ? OR e.organizationId IS NULL) AND e.deletedAt IS NULL AND e.status != 'revoked'

        UNION ALL

        SELECT 
          u.id,
          'user_onboarded' AS activityType,
          u.name AS actorName,
          u.email AS actorEmail,
          'Student Account' AS targetTitle,
          CONCAT('Role: Student • ', COALESCE(u.status, 'active')) AS detail,
          u.createdAt AS timestamp
        FROM users u
        WHERE (u.organizationId = ? OR u.organizationId IS NULL) AND u.role = 'student' AND u.deletedAt IS NULL
      ) AS recent_stream
      ORDER BY timestamp DESC
      LIMIT 10`,
      [orgId, orgId, orgId]
    );

    // 5. Active & Total Batch counts
    const [batchCountRows]: any = await pool.query(
      `SELECT 
        COUNT(id) AS total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active
       FROM batches 
       WHERE (organizationId = ? OR organizationId IS NULL) AND deletedAt IS NULL`,
      [orgId]
    );
    const batchesCount = Number(batchCountRows[0]?.total) || 0;
    const activeBatchesCount = Number(batchCountRows[0]?.active) || 0;

    res.json({
      studentsCount: analytics.totalLearners,
      trainersCount: 0,
      coursesCount: analytics.courses.total,
      enrollmentsCount: analytics.enrollments.total,
      submissionsCount: analytics.assessmentStats.totalAttempts,
      assessments: assessmentStats,
      recentCourses,
      recentAssessments,
      recentActivity,
      batchesCount,
      activeBatchesCount,
      ...analytics
    });
  } catch (err: any) {
    sendInternalError(res, "Failed to compute admin dashboard analytics", err);
  }
});

app.get("/api/admin/users", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const allUsers = await usersDb.find();
  const allAssessments = await assessmentsDb.find();
  const allSubmissions = await submissionsDb.find();

  // Query distinct active course access per student (direct + batch, deduplicated, excluding explicit revocations)
  const [effectiveCourseRows]: any = await pool.query(`
    SELECT e.studentId, e.courseId, c.title as courseTitle, c.category, 'individual' as source,
           CASE WHEN e.assignmentSource = 'bulk' THEN 'Bulk Assigned'
                WHEN e.assignmentSource = 'group' THEN 'Group Assigned'
                ELSE 'Individual Assignment' END as sourceDetails
    FROM enrollments e
    JOIN courses c ON e.courseId = c.id AND c.deletedAt IS NULL
    WHERE e.status != 'revoked' AND e.deletedAt IS NULL
    UNION
    SELECT bs.studentId, bc.courseId, c.title as courseTitle, c.category, 'batch' as source,
           CONCAT('Batch: ', b.name) as sourceDetails
    FROM batch_students bs
    JOIN batches b ON bs.batchId = b.id AND b.status = 'active' AND b.deletedAt IS NULL
    JOIN batch_courses bc ON bc.batchId = b.id AND bc.status = 'active'
    JOIN courses c ON bc.courseId = c.id AND c.deletedAt IS NULL
    WHERE bs.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM enrollments rev 
        WHERE rev.studentId = bs.studentId AND rev.courseId = bc.courseId 
          AND rev.status = 'revoked' AND rev.deletedAt IS NULL
      )
    UNION
    SELECT bs.studentId, b.courseId, c.title as courseTitle, c.category, 'batch' as source,
           CONCAT('Batch: ', b.name) as sourceDetails
    FROM batch_students bs
    JOIN batches b ON bs.batchId = b.id AND b.status = 'active' AND b.deletedAt IS NULL
    JOIN courses c ON b.courseId = c.id AND c.deletedAt IS NULL
    WHERE bs.status = 'active' AND b.courseId IS NOT NULL AND b.courseId != ''
      AND NOT EXISTS (
        SELECT 1 FROM enrollments rev 
        WHERE rev.studentId = bs.studentId AND rev.courseId = b.courseId 
          AND rev.status = 'revoked' AND rev.deletedAt IS NULL
      )
  `);

  interface UserAssignedCourseItem {
    id: string;
    title: string;
    category?: string;
    source?: string;
    sourceDetails?: string;
  }

  const userEffectiveCoursesMap = new Map<string, Map<string, UserAssignedCourseItem>>();
  for (const row of effectiveCourseRows) {
    if (!row.studentId || !row.courseId) continue;
    if (!userEffectiveCoursesMap.has(row.studentId)) {
      userEffectiveCoursesMap.set(row.studentId, new Map());
    }
    const studentMap = userEffectiveCoursesMap.get(row.studentId)!;
    if (!studentMap.has(row.courseId)) {
      studentMap.set(row.courseId, {
        id: row.courseId,
        title: row.courseTitle || `Course (${row.courseId.slice(0, 8)})`,
        category: row.category || undefined,
        source: row.source,
        sourceDetails: row.sourceDetails
      });
    } else {
      const existing = studentMap.get(row.courseId)!;
      if (existing.source !== row.source) {
        existing.source = "individual_and_batch";
        existing.sourceDetails = "Individual + Batch";
      }
    }
  }

  // Query active batch memberships per user
  const [userBatchRows]: any = await pool.query(`
    SELECT bs.studentId, b.id as batchId, b.name as batchName, b.code as batchCode, b.academicYear, bs.status as membershipStatus, bs.enrolledAt
    FROM batch_students bs
    JOIN batches b ON bs.batchId = b.id AND b.deletedAt IS NULL
    WHERE bs.status = 'active'
    ORDER BY b.academicYear DESC, b.name ASC
  `);

  const userBatchesMap = new Map<string, any[]>();
  for (const r of userBatchRows) {
    if (!userBatchesMap.has(r.studentId)) {
      userBatchesMap.set(r.studentId, []);
    }
    userBatchesMap.get(r.studentId)!.push({
      id: r.batchId,
      batchId: r.batchId,
      name: r.batchName,
      batchName: r.batchName,
      code: r.batchCode,
      batchCode: r.batchCode,
      academicYear: r.academicYear,
      status: r.membershipStatus,
      enrolledAt: r.enrolledAt
    });
  }

  const sanitizedUsers = allUsers.map(({ passwordHash: _, ...u }) => {
    const studentCourseMap = userEffectiveCoursesMap.get(u.id);
    const assignedCourses: UserAssignedCourseItem[] = studentCourseMap
      ? Array.from(studentCourseMap.values()).sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
      : [];
    const assignedCoursesCount = assignedCourses.length;
    const effectiveCourseIds = new Set(assignedCourses.map(c => c.id));
    const assignedAssessmentsCount = allAssessments.filter(a => effectiveCourseIds.has(a.courseId)).length;
    const completedAssessmentsCount = allSubmissions.filter(s => s.studentId === u.id && s.passed).length;
    const userBatches = userBatchesMap.get(u.id) || [];

    return {
      ...u,
      batches: userBatches,
      batchCount: userBatches.length,
      assignedCourses,
      assignedCoursesCount,
      assignedAssessmentsCount,
      completedAssessmentsCount
    };
  });
  res.json(sanitizedUsers);
});

// International phone number validator
// Accepts formats like: +1 555-123-4567, +91 9876543210, (555) 000-1234, +44 20 7946 0958, 080-12345678
export function isValidPhoneNumber(phone: string): { valid: boolean; reason?: string } {
  const trimmed = String(phone || "").trim();
  if (!trimmed) {
    return { valid: false, reason: "Phone number cannot be empty or whitespace only" };
  }
  const phoneRegex = /^\+?[0-9\s\-\(\)\.]{7,25}$/;
  if (!phoneRegex.test(trimmed)) {
    return { valid: false, reason: "Invalid phone number format. Allowed characters: digits, spaces, hyphens, dots, parentheses, and optional leading +" };
  }
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return { valid: false, reason: `Phone number must contain between 7 and 15 digits (found ${digitsOnly.length})` };
  }
  return { valid: true };
}

// Location validator (City, State/Region, Country)
export function isValidLocation(loc: string): { valid: boolean; reason?: string } {
  const trimmed = String(loc || "").trim();
  if (!trimmed) {
    return { valid: false, reason: "Location cannot be empty or whitespace only" };
  }
  if (trimmed.length < 2 || trimmed.length > 255) {
    return { valid: false, reason: "Location must be between 2 and 255 characters" };
  }
  return { valid: true };
}

// Admin Single User Creation
app.post("/api/admin/users", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { name, email, password, role, status, phoneNumber, location, batchIds: reqBatchIds, batches: reqBatches, batchId: reqBatchId } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }

  const trimmedName = String(name).trim();
  const trimmedEmail = String(email).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  const targetRole = role && Object.values(UserRole).includes(role) ? role : UserRole.STUDENT;

  // Extract and validate mandatory batch memberships
  const rawBatchList = reqBatchIds || reqBatches || (reqBatchId ? [reqBatchId] : []);
  const batchIdArray: string[] = Array.isArray(rawBatchList)
    ? rawBatchList.map((b: any) => typeof b === "string" ? b.trim() : (b?.id || b?.batchId || "").trim()).filter(Boolean)
    : (typeof rawBatchList === "string" && rawBatchList.trim() ? [rawBatchList.trim()] : []);
  const uniqueBatchIds = Array.from(new Set(batchIdArray));

  if (uniqueBatchIds.length === 0) {
    return res.status(400).json({ error: "At least one batch must be selected. Batch membership is mandatory for every user." });
  }

  // Verify all provided batch IDs exist, are active, and are not deleted
  const [batchRecords]: any = await pool.query(
    `SELECT id, name, code, academicYear, status FROM batches WHERE id IN (${uniqueBatchIds.map(() => "?").join(",")}) AND deletedAt IS NULL`,
    uniqueBatchIds
  );

  if (batchRecords.length !== uniqueBatchIds.length) {
    const foundIds = new Set(batchRecords.map((b: any) => b.id));
    const missing = uniqueBatchIds.filter(id => !foundIds.has(id));
    return res.status(400).json({ error: `Batch ID '${missing[0]}' does not exist or has been deleted.` });
  }

  for (const b of batchRecords) {
    if (b.status !== "active") {
      return res.status(400).json({ error: `Batch '${b.name}' (${b.code}) is '${b.status}'. Users may only be assigned to active batches.` });
    }
  }

  // Contact details validation
  const trimmedPhone = phoneNumber !== undefined && phoneNumber !== null ? String(phoneNumber).trim() : "";
  const trimmedLocation = location !== undefined && location !== null ? String(location).trim() : "";

  if (targetRole === UserRole.STUDENT) {
    if (!trimmedPhone) {
      return res.status(400).json({ error: "Phone number is required for student accounts" });
    }
    const phoneCheck = isValidPhoneNumber(trimmedPhone);
    if (!phoneCheck.valid) {
      return res.status(400).json({ error: phoneCheck.reason });
    }

    if (!trimmedLocation) {
      return res.status(400).json({ error: "Location is required for student accounts" });
    }
    const locCheck = isValidLocation(trimmedLocation);
    if (!locCheck.valid) {
      return res.status(400).json({ error: locCheck.reason });
    }
  } else {
    if (trimmedPhone) {
      const phoneCheck = isValidPhoneNumber(trimmedPhone);
      if (!phoneCheck.valid) {
        return res.status(400).json({ error: phoneCheck.reason });
      }
    }
    if (trimmedLocation) {
      const locCheck = isValidLocation(trimmedLocation);
      if (!locCheck.valid) {
        return res.status(400).json({ error: locCheck.reason });
      }
    }
  }

  // Enforce strong password complexity for administrators, and at least 8 chars for all accounts
  if (targetRole === UserRole.ADMIN) {
    const validation = validateStrongPassword(String(password));
    if (!validation.valid) {
      return res.status(400).json({ error: `Administrator password does not meet security requirements: ${validation.reason}` });
    }
  } else {
    if (String(password).length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long." });
    }
  }

  const existing = await usersDb.findOne({ email: trimmedEmail });
  if (existing) {
    return res.status(409).json({ error: "Email is already registered in the system" });
  }

  const targetStatus = status === "suspended" ? "suspended" : "active";
  const passwordHash = await bcrypt.hash(String(password), 12);
  const newUserId = "user-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex");
  const now = new Date().toISOString();

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(`
      INSERT INTO users (id, name, email, role, passwordHash, createdAt, status, phoneNumber, location, organizationId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newUserId,
      trimmedName,
      trimmedEmail,
      targetRole,
      passwordHash,
      now,
      targetStatus,
      trimmedPhone || null,
      trimmedLocation || null,
      req.user!.organizationId || "org-default"
    ]);

    for (const b of batchRecords) {
      const bsId = "bs-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex");
      await connection.query(`
        INSERT INTO batch_students (id, organizationId, batchId, studentId, enrolledAt, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
      `, [
        bsId,
        req.user!.organizationId || "org-default",
        b.id,
        newUserId,
        now,
        now,
        now
      ]);
    }

    await connection.commit();

    // Synchronize courses for each assigned batch
    for (const b of batchRecords) {
      try {
        await BatchService.syncStudentBatchCourseAccess(newUserId, b.id, req.user!);
      } catch (syncErr) {
        console.warn(`[BatchCourseSync] Sync warning for batch ${b.id}:`, syncErr);
      }
    }

    logAuditEvent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: "create_user",
      resourceType: "user",
      resourceId: newUserId,
      details: {
        targetRole,
        targetStatus,
        userEmail: trimmedEmail,
        hasPhone: Boolean(trimmedPhone),
        hasLocation: Boolean(trimmedLocation),
        batchIds: uniqueBatchIds,
        batches: batchRecords.map((b: any) => ({ id: b.id, name: b.name, code: b.code, academicYear: b.academicYear }))
      },
      ipAddress: getClientIp(req),
      userAgent: req.headers["user-agent"],
      status: "success"
    });

    res.status(201).json({
      id: newUserId,
      name: trimmedName,
      email: trimmedEmail,
      role: targetRole,
      status: targetStatus,
      phoneNumber: trimmedPhone || null,
      location: trimmedLocation || null,
      createdAt: now,
      batches: batchRecords.map((b: any) => ({
        id: b.id,
        batchId: b.id,
        name: b.name,
        batchName: b.name,
        code: b.code,
        batchCode: b.code,
        academicYear: b.academicYear,
        status: "active"
      })),
      batchCount: batchRecords.length
    });

  } catch (txErr: any) {
    await connection.rollback();
    throw txErr;
  } finally {
    connection.release();
  }
});

// Admin Download Excel Template for Bulk Student Import
app.get("/api/admin/users/template", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  // Fetch real active batch codes for reference in the template
  const [activeBatches]: any = await pool.query(
    "SELECT code FROM batches WHERE status = 'active' AND deletedAt IS NULL LIMIT 2"
  );
  const sampleCodes = activeBatches.map((b: any) => b.code).join(", ") || "AIPY-2026-COHORT";

  const templateData = [
    {
      "Full Name": "Alice Johnson",
      "Email Address": "alice.johnson@example.com",
      "Phone Number": "+1 555-0199",
      "Location": "New York, NY, USA",
      "Password": "StudentPass123!",
      "Status": "active",
      "Batch Codes": sampleCodes
    },
    {
      "Full Name": "Bob Smith",
      "Email Address": "bob.smith@example.com",
      "Phone Number": "+91 9876543210",
      "Location": "Bengaluru, Karnataka, India",
      "Password": "StudentPass123!",
      "Status": "active",
      "Batch Codes": sampleCodes
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  worksheet["!cols"] = [
    { wch: 22 },
    { wch: 30 },
    { wch: 20 },
    { wch: 28 },
    { wch: 18 },
    { wch: 12 },
    { wch: 30 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  res.setHeader("Content-Disposition", 'attachment; filename="student_import_template.xlsx"');
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buffer);
});

// Admin Bulk Validate Excel Rows
app.post("/api/admin/users/bulk-validate", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const rawRows: any[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
  const existingUsers = await usersDb.find();
  const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));

  // Load all active batches into lookup maps by code and by name
  const [activeBatches]: any = await pool.query(
    "SELECT id, name, code, academicYear, status FROM batches WHERE status = 'active' AND deletedAt IS NULL"
  );
  const batchLookup = new Map<string, any>();
  for (const b of activeBatches) {
    batchLookup.set(b.code.toUpperCase().trim(), b);
    batchLookup.set(b.name.toUpperCase().trim(), b);
    batchLookup.set(b.id, b);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const seenInFileEmails = new Set<string>();

  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  const validatedRows = rawRows.map((raw, idx) => {
    const rowNumber = idx + 2; // Excel row indexing (1 is header)
    const fullName = String(raw.fullName || raw["Full Name"] || raw.name || raw.Name || "").trim();
    const email = String(raw.email || raw["Email Address"] || raw.Email || "").trim().toLowerCase();
    const phoneNumber = String(raw.phoneNumber || raw["Phone Number"] || raw.phone || raw.Phone || "").trim();
    const location = String(raw.location || raw["Location"] || raw.city || raw.City || "").trim();
    const password = String(raw.password || raw["Password"] || "").trim();
    const rawStatus = String(raw.status || raw["Status"] || "active").trim().toLowerCase();
    const status = rawStatus === "suspended" ? "suspended" : "active";

    // Batch assignment resolution
    const rawBatchField = String(
      raw["Batch Codes"] || raw["Batch Code"] || raw["Batches"] || raw["Batch"] || raw.batchCodes || raw.batches || raw.batch || ""
    ).trim();

    const errors: string[] = [];

    if (!fullName) {
      errors.push("Full name is required");
    }

    if (!email) {
      errors.push("Email address is required");
    } else if (!emailRegex.test(email)) {
      errors.push("Invalid email format");
    } else if (seenInFileEmails.has(email)) {
      errors.push("Duplicate email in this spreadsheet");
      duplicateCount++;
    } else if (existingEmails.has(email)) {
      errors.push("Email already exists in LMS database");
      duplicateCount++;
    }

    if (email && emailRegex.test(email) && !seenInFileEmails.has(email)) {
      seenInFileEmails.add(email);
    }

    if (phoneNumber) {
      const phoneCheck = isValidPhoneNumber(phoneNumber);
      if (!phoneCheck.valid) {
        errors.push(phoneCheck.reason || "Invalid phone number format");
      }
    }

    if (location) {
      const locCheck = isValidLocation(location);
      if (!locCheck.valid) {
        errors.push(locCheck.reason || "Invalid location format");
      }
    }

    if (!password) {
      errors.push("Password is required");
    } else if (password.length < 6) {
      errors.push("Password must be at least 6 characters");
    }

    // Validate batch membership (Mandatory)
    const resolvedBatchRecords: any[] = [];
    if (!rawBatchField) {
      errors.push("At least one batch code is required (e.g. AIPY-2026-COHORT)");
    } else {
      const tokens = rawBatchField.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
      if (tokens.length === 0) {
        errors.push("At least one batch code is required");
      } else {
        const seenTokens = new Set<string>();
        for (const token of tokens) {
          const matched = batchLookup.get(token.toUpperCase()) || batchLookup.get(token);
          if (!matched) {
            errors.push(`Batch '${token}' does not exist or is inactive`);
          } else if (!seenTokens.has(matched.id)) {
            seenTokens.add(matched.id);
            resolvedBatchRecords.push(matched);
          }
        }
      }
    }

    const isValid = errors.length === 0;
    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
    }

    return {
      rowNumber,
      fullName,
      email,
      phoneNumber: phoneNumber || null,
      location: location || null,
      password: password ? "••••••••" : "",
      rawPassword: password,
      status,
      batchCodes: resolvedBatchRecords.map(b => b.code).join(", "),
      batchRecords: resolvedBatchRecords,
      isValid,
      errors
    };
  });

  res.json({
    total: rawRows.length,
    validCount,
    invalidCount,
    duplicateCount,
    rows: validatedRows
  });
});

// Admin Bulk Import Validated Students
app.post("/api/admin/users/bulk-import", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const rawRows: any[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
  const existingUsers = await usersDb.find();
  const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Active batches map
  const [activeBatches]: any = await pool.query(
    "SELECT id, name, code, academicYear, status FROM batches WHERE status = 'active' AND deletedAt IS NULL"
  );
  const batchLookup = new Map<string, any>();
  for (const b of activeBatches) {
    batchLookup.set(b.code.toUpperCase().trim(), b);
    batchLookup.set(b.name.toUpperCase().trim(), b);
    batchLookup.set(b.id, b);
  }

  const importedUsers = [];
  let failedCount = 0;

  for (const raw of rawRows) {
    const fullName = String(raw.fullName || raw["Full Name"] || raw.name || "").trim();
    const email = String(raw.email || raw["Email Address"] || raw.Email || "").trim().toLowerCase();
    const phoneNumber = String(raw.phoneNumber || raw["Phone Number"] || raw.phone || raw.Phone || "").trim();
    const location = String(raw.location || raw["Location"] || raw.city || raw.City || "").trim();
    const password = String(raw.rawPassword || raw.password || raw["Password"] || "").trim();
    const rawStatus = String(raw.status || raw["Status"] || "active").trim().toLowerCase();
    const status = rawStatus === "suspended" ? "suspended" : "active";

    // Resolve batches
    let targetBatches: any[] = Array.isArray(raw.batchRecords) && raw.batchRecords.length > 0 ? raw.batchRecords : [];
    if (targetBatches.length === 0) {
      const rawBatchStr = String(raw["Batch Codes"] || raw["Batch Code"] || raw["Batches"] || raw.batchCodes || raw.batches || raw.batch || "");
      const tokens = rawBatchStr.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
      for (const t of tokens) {
        const matched = batchLookup.get(t.toUpperCase()) || batchLookup.get(t);
        if (matched && !targetBatches.some(b => b.id === matched.id)) {
          targetBatches.push(matched);
        }
      }
    }

    if (!fullName || !email || !password || password.length < 6 || !emailRegex.test(email) || existingEmails.has(email) || targetBatches.length === 0) {
      failedCount++;
      continue;
    }

    existingEmails.add(email);
    const passwordHash = await bcrypt.hash(password, 10);
    const newUserId = "user-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex");
    const now = new Date().toISOString();

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(`
        INSERT INTO users (id, name, email, role, passwordHash, createdAt, status, phoneNumber, location, organizationId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newUserId,
        fullName,
        email,
        UserRole.STUDENT,
        passwordHash,
        now,
        status,
        phoneNumber || null,
        location || null,
        req.user!.organizationId || "org-default"
      ]);

      for (const b of targetBatches) {
        const bsId = "bs-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex");
        await connection.query(`
          INSERT INTO batch_students (id, organizationId, batchId, studentId, enrolledAt, status, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
        `, [
          bsId,
          req.user!.organizationId || "org-default",
          b.id,
          newUserId,
          now,
          now,
          now
        ]);
      }

      await connection.commit();

      for (const b of targetBatches) {
        try {
          await BatchService.syncStudentBatchCourseAccess(newUserId, b.id, req.user!);
        } catch (syncErr) {
          // Non-blocking sync warning
        }
      }

      importedUsers.push({
        id: newUserId,
        name: fullName,
        email,
        role: UserRole.STUDENT,
        status,
        phoneNumber: phoneNumber || null,
        location: location || null,
        createdAt: now,
        batches: targetBatches.map(b => ({ id: b.id, name: b.name, code: b.code, academicYear: b.academicYear }))
      });

    } catch (err) {
      await connection.rollback();
      failedCount++;
    } finally {
      connection.release();
    }
  }

  res.json({
    importedCount: importedUsers.length,
    failedCount,
    users: importedUsers
  });
});

// Admin Course Access: Get Student Enrollments
app.get("/api/admin/users/:studentId/enrollments", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { studentId } = req.params;
  const student = await usersDb.findOne({ id: studentId });
  if (!student) return res.status(404).json({ error: "Student not found" });

  try {
    const enrolledCourses = await AccessControlService.getStudentEffectiveCourses(studentId);
    res.json(enrolledCourses);
  } catch (err: any) {
    sendInternalError(res, "Failed to load student enrollments", err);
  }
});

// Admin Course Access: Grant Access to Student (Single or Multiple Courses)
app.post("/api/admin/users/:studentId/enrollments", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { studentId } = req.params;
  const { courseId, courseIds, dueDate, isMandatory } = req.body;

  const targetCourseIds: string[] = Array.isArray(courseIds) 
    ? courseIds.filter(Boolean)
    : (courseId ? [courseId] : []);

  if (targetCourseIds.length === 0) {
    return res.status(400).json({ error: "courseId or non-empty courseIds array is required" });
  }

  const student = await usersDb.findOne({ id: studentId });
  if (!student) {
    return res.status(404).json({ error: "Student not found" });
  }

  const results: Array<{ courseId: string; title: string; success: boolean; enrollment?: any; error?: string }> = [];
  const successfulEnrollments: any[] = [];

  for (const cId of targetCourseIds) {
    const course = await coursesDb.findOne({ id: cId });
    if (!course) {
      results.push({ courseId: cId, title: "Unknown", success: false, error: "Course not found" });
      continue;
    }

    try {
      const enrollment = await AccessControlService.assignCourseToStudent({
        courseId: cId,
        studentId,
        assignedBy: req.user!.id,
        assignedByEmail: req.user!.email,
        assignedByRole: req.user!.role,
        dueDate,
        isMandatory,
        source: "individual",
        organizationId: req.user!.organizationId
      });
      successfulEnrollments.push(enrollment);
      results.push({ courseId: cId, title: course.title, success: true, enrollment });
    } catch (err: any) {
      results.push({ courseId: cId, title: course.title, success: false, error: err.message });
    }
  }

  if (courseId && !Array.isArray(courseIds)) {
    if (results[0].success) {
      return res.status(201).json(results[0].enrollment);
    } else {
      return res.status(400).json({ error: results[0].error });
    }
  }

  const assignedCount = successfulEnrollments.length;
  res.status(201).json({
    message: `Successfully assigned ${assignedCount} of ${targetCourseIds.length} course(s)`,
    assignedCount,
    enrollments: successfulEnrollments,
    results
  });
});

// Admin Course Access: Revoke Access or Remove Direct Grant
app.delete("/api/admin/users/:studentId/enrollments/:courseId", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { studentId, courseId } = req.params;
  const { reason, mode } = req.body || {};
  const queryMode = req.query.mode as string;
  const isDirectOnly = mode === "direct_only" || queryMode === "direct_only";

  const student = await usersDb.findOne({ id: studentId });
  if (!student) {
    return res.status(404).json({ error: "Student not found" });
  }

  const course = await coursesDb.findOne({ id: courseId });
  if (!course) {
    return res.status(404).json({ error: "Course not found" });
  }

  try {
    if (isDirectOnly) {
      await AccessControlService.removeDirectCourseAssignment(courseId, studentId, req.user!);
      res.json({ message: "Direct course assignment removed successfully. Batch access preserved if present." });
    } else {
      await AccessControlService.revokeCourseAccess(courseId, studentId, req.user!, reason);
      res.json({ message: "Course access revoked successfully (all grants blocked)." });
    }
  } catch (err: any) {
    const status = err.message?.includes("not found") ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

// Admin Course Access: Restore Access (clears explicit denial, restoring batch/direct grant)
app.post("/api/admin/users/:studentId/enrollments/:courseId/restore", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { studentId, courseId } = req.params;
  const student = await usersDb.findOne({ id: studentId });
  if (!student) return res.status(404).json({ error: "Student not found" });

  const course = await coursesDb.findOne({ id: courseId });
  if (!course) return res.status(404).json({ error: "Course not found" });

  try {
    await AccessControlService.restoreCourseAccess(courseId, studentId, req.user!);
    res.json({ message: "Course access restored successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Course Access: Explicit Revoke All Access / Block
app.post("/api/admin/users/:studentId/enrollments/:courseId/revoke-all", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { studentId, courseId } = req.params;
  const { reason } = req.body || {};

  const student = await usersDb.findOne({ id: studentId });
  if (!student) return res.status(404).json({ error: "Student not found" });

  const course = await coursesDb.findOne({ id: courseId });
  if (!course) return res.status(404).json({ error: "Course not found" });

  try {
    await AccessControlService.revokeCourseAccess(courseId, studentId, req.user!, reason);
    res.json({ message: "Course access revoked and blocked successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// UNIFIED ACCESS MANAGEMENT ENDPOINTS
// ==========================================

// 1. Get Comprehensive Access Roster across all students and courses
app.get("/api/admin/access/roster", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }
  try {
    const roster = await AccessControlService.getFullAccessRoster();
    res.json(roster);
  } catch (err: any) {
    sendInternalError(res, "Failed to load access roster", err);
  }
});

// 2. Grant Access: Multi-Course, Multi-Student, Multi-Batch in one workflow
app.post("/api/admin/access/grant", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { courseIds, assignTo, studentIds, batchIds, dueDate, isMandatory } = req.body;

  if (!Array.isArray(courseIds) || courseIds.length === 0) {
    return res.status(400).json({ error: "At least one courseId is required" });
  }

  const mode = assignTo || "student";
  const targetsStudents = (mode === "student" || mode === "students" || mode === "both") && Array.isArray(studentIds) && studentIds.length > 0;
  const targetsBatches = (mode === "batch" || mode === "batches" || mode === "both") && Array.isArray(batchIds) && batchIds.length > 0;

  if (!targetsStudents && !targetsBatches) {
    return res.status(400).json({ error: "Please select at least one student or batch to assign courses to" });
  }

  let studentEnrollmentsCount = 0;
  let batchAssignmentsCount = 0;

  if (targetsStudents) {
    for (const sId of studentIds) {
      for (const cId of courseIds) {
        try {
          await AccessControlService.assignCourseToStudent({
            courseId: cId,
            studentId: sId,
            assignedBy: req.user!.id,
            assignedByEmail: req.user!.email,
            assignedByRole: req.user!.role,
            dueDate,
            isMandatory,
            source: "individual",
            organizationId: req.user!.organizationId
          });
          studentEnrollmentsCount++;
        } catch (e) {
          // ignore already enrolled
        }
      }
    }
  }

  if (targetsBatches) {
    for (const bId of batchIds) {
      for (const cId of courseIds) {
        try {
          await BatchService.assignCourseToBatch(bId, cId, req.user!);
          batchAssignmentsCount++;
        } catch (e) {
          // ignore already assigned
        }
      }
    }
  }

  res.status(201).json({
    success: true,
    message: `Access granted successfully (${studentEnrollmentsCount} individual assignment(s), ${batchAssignmentsCount} batch allocation(s))`,
    studentEnrollmentsCount,
    batchAssignmentsCount
  });
});

// 3. Revoke Access: Supports explicit override (blocks all) or direct_only removal
app.post("/api/admin/access/revoke", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { studentId, courseId, mode, reason } = req.body;
  if (!studentId || !courseId) {
    return res.status(400).json({ error: "studentId and courseId are required" });
  }

  try {
    if (mode === "direct_only") {
      await AccessControlService.removeDirectCourseAssignment(courseId, studentId, req.user!);
      res.json({ success: true, message: "Direct course assignment removed. Batch access remains active if applicable." });
    } else {
      await AccessControlService.revokeCourseAccess(courseId, studentId, req.user!, reason || "Access revoked by administrator");
      res.json({ success: true, message: "Course access revoked and blocked successfully for this student." });
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Restore Access: Clears explicit denial or reactivates direct grant
app.post("/api/admin/access/restore", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { studentId, courseId } = req.body;
  if (!studentId || !courseId) {
    return res.status(400).json({ error: "studentId and courseId are required" });
  }

  try {
    await AccessControlService.restoreCourseAccess(courseId, studentId, req.user!);
    res.json({ success: true, message: "Course access restored successfully for this student." });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Course Access: Bulk Enrollment
app.post("/api/admin/enrollments/bulk", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }
  const { courseId, studentIds, dueDate, isMandatory } = req.body;
  if (!courseId || !Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: "courseId and non-empty studentIds array are required" });
  }
  try {
    const result = await AccessControlService.assignCourseBulk(courseId, studentIds, req.user!, {
      dueDate,
      isMandatory
    });
    res.json({ message: `Successfully assigned ${result.assignedCount} student(s)`, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Course Access: Group Enrollment
app.post("/api/admin/enrollments/group", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }
  const { courseId, groupId, dueDate, isMandatory } = req.body;
  if (!courseId || !groupId) {
    return res.status(400).json({ error: "courseId and groupId are required" });
  }
  try {
    const result = await AccessControlService.assignCourseToGroup(courseId, groupId, req.user!, {
      dueDate,
      isMandatory
    });
    res.json({ message: `Course assigned to group "${result.groupName}" (${result.assignedCount} members)`, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Course Access: Revoke Access (POST endpoint)
app.post("/api/admin/enrollments/revoke", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }
  const { courseId, studentId, reason } = req.body;
  if (!courseId || !studentId) {
    return res.status(400).json({ error: "courseId and studentId are required" });
  }
  try {
    await AccessControlService.revokeCourseAccess(courseId, studentId, req.user!, reason);
    res.json({ message: "Course access revoked successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Course Access: Update Enrollment parameters (Due Date, Mandatory status)
app.put("/api/admin/enrollments/:enrollmentId", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }
  const { enrollmentId } = req.params;
  const { dueDate, isMandatory } = req.body;
  try {
    const updated = await AccessControlService.updateCourseEnrollment(enrollmentId, { dueDate, isMandatory }, req.user!);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Course Access: Full Access Inspection Matrix
app.get("/api/admin/courses/:id/access", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }
  try {
    const matrix = await AccessControlService.getCourseAccessMatrix(req.params.id, req.user!.organizationId);
    res.json(matrix);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// GROUPS & COHORTS API
// ==========================================
app.get("/api/admin/groups", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }
  try {
    const groups = await OrganizationService.getEnhancedGroups(req.user!.organizationId);
    res.json(groups);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/groups", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }
  const { name, description, type, departmentId, cohortId, managerId } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Group name is required" });
  try {
    const group = await OrganizationService.createEnhancedGroup({
      name,
      description,
      type,
      departmentId,
      cohortId,
      managerId,
      organizationId: req.user!.organizationId
    }, req.user!);
    res.status(201).json(group);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/admin/groups/:id", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }
  try {
    const group = await OrganizationService.getEnhancedGroupById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    res.json(group);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/admin/groups/:id", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }
  try {
    const updated = await OrganizationService.updateEnhancedGroup(req.params.id, req.body, req.user!);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/admin/groups/:id", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }
  try {
    await OrganizationService.archiveGroup(req.params.id, req.user!);
    res.json({ message: "Group archived successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/admin/groups/:id/members", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }
  const { userIds } = req.body;
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: "userIds array is required" });
  }
  try {
    const result = await AccessControlService.addMembersToGroup(req.params.id, userIds, req.user!.organizationId);
    res.json({ message: `Added ${result.addedCount} member(s) to group`, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/admin/groups/:id/members/:userId", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }
  try {
    await AccessControlService.removeMemberFromGroup(req.params.id, req.params.userId);
    res.json({ message: "Member removed from group" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Security & Audit Log Inspection API
app.get("/api/admin/audit-logs", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }
  const { action, resourceType, limit = 100 } = req.query;
  try {
    let sql = "SELECT * FROM audit_logs WHERE 1=1";
    const params: any[] = [];
    if (action) {
      sql += " AND action LIKE ?";
      params.push(`%${action}%`);
    }
    if (resourceType) {
      sql += " AND resourceType = ?";
      params.push(resourceType);
    }
    sql += " ORDER BY createdAt DESC LIMIT ?";
    params.push(Number(limit) || 100);

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Student Access: Get comprehensive course & assessment access state
app.get("/api/admin/users/:studentId/access", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { studentId } = req.params;
  const student = await usersDb.findOne({ id: studentId });
  if (!student) return res.status(404).json({ error: "Student not found" });

  try {
    const effectiveCourses = await AccessControlService.getStudentEffectiveCourses(studentId);
    const effectiveMap = new Map(effectiveCourses.map(c => [c.courseId, c]));

    const effectiveLearningPaths = await AccessControlService.getStudentEffectiveLearningPaths(studentId);
    const effLPMap = new Map(effectiveLearningPaths.map(p => [p.learningPathId, p]));

    const allCourses = await coursesDb.find();
    const allAssessments = await assessmentsDb.find();
    const allLearningPaths = await learningPathsDb.find();

    const coursesList = allCourses.map(course => {
      const eff = effectiveMap.get(course.id);
      return {
        id: course.id,
        title: course.title,
        category: course.category,
        status: course.status,
        instructorName: course.instructorName,
        isAssigned: !!eff,
        assignmentSource: eff ? eff.assignmentSource : null,
        sourceDetails: eff ? eff.sourceDetails : null,
        canRevoke: eff ? eff.canRevoke : false,
        assignedDate: eff ? eff.enrolledAt : null,
        enrollmentId: eff ? eff.enrollmentId : null
      };
    });

    const assessmentsList = allAssessments.map(assessment => {
      const course = allCourses.find(c => c.id === assessment.courseId);
      const eff = effectiveMap.get(assessment.courseId);
      return {
        id: assessment.id,
        title: assessment.title,
        courseId: assessment.courseId,
        courseTitle: course ? course.title : "Unknown Course",
        durationMinutes: assessment.durationMinutes,
        totalPoints: assessment.totalPoints,
        passingScore: assessment.passingScore,
        questionsCount: assessment.questionsCount,
        status: assessment.status,
        isAssigned: !!eff,
        assignedDate: eff ? eff.enrolledAt : null
      };
    });

    const learningPathsList = allLearningPaths.map(lp => {
      const eff = effLPMap.get(lp.id);
      return {
        id: lp.id,
        title: lp.title,
        category: lp.category,
        status: lp.status,
        isAssigned: !!eff && eff.effectiveStatus === "active" && !eff.isDenied,
        isDenied: eff ? eff.isDenied : false,
        effectiveStatus: eff ? eff.effectiveStatus : "unassigned",
        assignmentSource: eff ? eff.assignmentSource : null,
        sourceDetails: eff ? eff.sourceDetails : null,
        hasDirectAccess: eff ? eff.hasDirectAccess : false,
        hasBatchAccess: eff ? eff.hasBatchAccess : false,
        batches: eff ? eff.batches : [],
        canRevoke: eff ? eff.canRevoke : false,
        canRemoveDirect: eff ? eff.hasDirectAccess : false,
        canRevokeAll: eff ? (eff.effectiveStatus === "active" && !eff.isDenied) : false,
        canRestore: eff ? eff.isDenied : false,
        assignedDate: eff ? eff.assignedAt : null
      };
    });

    res.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        status: student.status,
        createdAt: student.createdAt,
        role: student.role
      },
      courses: coursesList,
      assessments: assessmentsList,
      learningPaths: learningPathsList
    });
  } catch (err: any) {
    sendInternalError(res, "Failed to load student access details", err);
  }
});

// Admin Assessment Access: Grant Access to Assessment (via Course Enrollment)
app.post("/api/admin/users/:studentId/assessment-access/:assessmentId", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { studentId, assessmentId } = req.params;
  const student = await usersDb.findOne({ id: studentId });
  if (!student) return res.status(404).json({ error: "Student not found" });

  const assessment = await assessmentsDb.findOne({ id: assessmentId });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  const existing = await enrollmentsDb.findOne({ studentId, courseId: assessment.courseId });
  if (existing) {
    return res.status(200).json({ message: "Student already has access to this assessment's course", enrollment: existing });
  }

  const enrollment = await enrollmentsDb.insert({
    studentId,
    courseId: assessment.courseId,
    enrolledAt: new Date().toISOString()
  });

  res.status(201).json({ message: "Assessment access granted via course enrollment", enrollment });
});

// Admin Assessment Access: Revoke Access from Assessment (via Course Enrollment)
app.delete("/api/admin/users/:studentId/assessment-access/:assessmentId", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { studentId, assessmentId } = req.params;
  const assessment = await assessmentsDb.findOne({ id: assessmentId });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  const enrollment = await enrollmentsDb.findOne({ studentId, courseId: assessment.courseId });
  if (!enrollment) {
    return res.status(404).json({ error: "Enrollment not found for this assessment's course" });
  }

  await enrollmentsDb.delete(enrollment.id);
  res.json({ message: "Assessment access revoked successfully" });
});

// Admin Student Access: Grant Direct Learning Path Access
app.post("/api/admin/users/:studentId/learning-paths/:learningPathId", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }
  const { studentId, learningPathId } = req.params;
  const { dueDate, isMandatory } = req.body || {};

  const student = await usersDb.findOne({ id: studentId });
  if (!student) return res.status(404).json({ error: "Student not found" });

  const path = await learningPathsDb.findOne({ id: learningPathId });
  if (!path) return res.status(404).json({ error: "Learning Path not found" });

  try {
    const assignment = await AccessControlService.assignLearningPathToStudent({
      learningPathId,
      studentId,
      assignedBy: req.user!.id,
      assignedByEmail: req.user!.email,
      assignedByRole: req.user!.role,
      dueDate,
      isMandatory,
      source: "individual",
      organizationId: req.user!.organizationId
    });
    res.status(201).json({ message: "Learning Path assigned directly to student", assignment });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Student Access: Remove Direct Learning Path Assignment (preserves batch access if present)
app.delete("/api/admin/users/:studentId/learning-paths/:learningPathId", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }
  const { studentId, learningPathId } = req.params;

  try {
    await AccessControlService.removeStudentDirectLearningPathAssignment(learningPathId, studentId, req.user!);
    res.json({ message: "Direct learning path assignment removed successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Student Access: Revoke All Access / Block (explicit denial overriding batch membership)
app.post("/api/admin/users/:studentId/learning-paths/:learningPathId/revoke-all", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }
  const { studentId, learningPathId } = req.params;
  const { reason } = req.body || {};

  try {
    await AccessControlService.revokeAllStudentLearningPathAccess(learningPathId, studentId, req.user!, reason);
    res.json({ message: "All learning path access revoked and blocked successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Student Access: Restore Access (clears explicit denial)
app.post("/api/admin/users/:studentId/learning-paths/:learningPathId/restore", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }
  const { studentId, learningPathId } = req.params;

  try {
    await AccessControlService.restoreStudentLearningPathAccess(learningPathId, studentId, req.user!);
    res.json({ message: "Learning path access restored successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/admin/users/:id/status", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { status } = req.body;
  if (status !== "active" && status !== "suspended") {
    return res.status(400).json({ error: "Invalid status value. Must be 'active' or 'suspended'." });
  }

  if (req.params.id === req.user!.id && status === "suspended") {
    return res.status(400).json({ error: "You cannot suspend your own administrative account." });
  }

  const targetUser = await usersDb.findOne({ id: req.params.id });
  if (!targetUser) return res.status(404).json({ error: "User not found" });

  const updated = await usersDb.update(req.params.id, { status });
  if (!updated) return res.status(404).json({ error: "User not found" });

  logAuditEvent({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: status === "suspended" ? "suspend_user" : "activate_user",
    resourceType: "user",
    resourceId: req.params.id,
    details: { targetEmail: targetUser.email, previousStatus: targetUser.status, newStatus: status },
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"],
    status: "success"
  });

  const { passwordHash: _, ...sanitizedStatusUser } = updated;
  res.json(sanitizedStatusUser);
});

// Admin Password Reset for Student Accounts
app.post("/api/admin/users/:id/reset-password", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { newPassword, confirmPassword } = req.body;

  if (!newPassword || typeof newPassword !== "string") {
    return res.status(400).json({ error: "New password is required" });
  }

  if (!confirmPassword || typeof confirmPassword !== "string") {
    return res.status(400).json({ error: "Confirm password is required" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match" });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long" });
  }

  const targetUser = await usersDb.findOne({ id: req.params.id });
  if (!targetUser) {
    return res.status(404).json({ error: "User not found" });
  }

  if (targetUser.role !== UserRole.STUDENT) {
    return res.status(400).json({ error: "Admin password reset is only supported for student accounts" });
  }

  // Hash new password using bcrypt cost factor 12
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await usersDb.update(targetUser.id, { passwordHash });

  // Security audit log - NEVER log the password, hashes, or plain request bodies!
  logAuditEvent({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: "admin_reset_student_password",
    resourceType: "user",
    resourceId: targetUser.id,
    details: { targetEmail: targetUser.email, targetRole: targetUser.role },
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"],
    status: "success"
  });

  return res.json({ 
    success: true, 
    message: `Password has been successfully updated for ${targetUser.name}.` 
  });
});

// Admin Update User Details (Name, Phone Number, Location, Status)
app.put("/api/admin/users/:id", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const targetUser = await usersDb.findOne({ id: req.params.id });
  if (!targetUser) {
    return res.status(404).json({ error: "User not found" });
  }

  const { name, phoneNumber, location, status } = req.body;
  const updates: any = {};

  if (name !== undefined) {
    const trimmedName = String(name).trim();
    if (!trimmedName) {
      return res.status(400).json({ error: "Name cannot be empty" });
    }
    updates.name = trimmedName;
  }

  if (phoneNumber !== undefined) {
    const trimmedPhone = String(phoneNumber).trim();
    if (trimmedPhone) {
      const phoneCheck = isValidPhoneNumber(trimmedPhone);
      if (!phoneCheck.valid) {
        return res.status(400).json({ error: phoneCheck.reason });
      }
      updates.phoneNumber = trimmedPhone;
    } else {
      if (targetUser.role === UserRole.STUDENT) {
        return res.status(400).json({ error: "Phone number is required for student accounts" });
      }
      updates.phoneNumber = null;
    }
  }

  if (location !== undefined) {
    const trimmedLoc = String(location).trim();
    if (trimmedLoc) {
      const locCheck = isValidLocation(trimmedLoc);
      if (!locCheck.valid) {
        return res.status(400).json({ error: locCheck.reason });
      }
      updates.location = trimmedLoc;
    } else {
      if (targetUser.role === UserRole.STUDENT) {
        return res.status(400).json({ error: "Location is required for student accounts" });
      }
      updates.location = null;
    }
  }

  if (status !== undefined) {
    if (status !== "active" && status !== "suspended") {
      return res.status(400).json({ error: "Invalid status value. Must be 'active' or 'suspended'." });
    }
    if (req.params.id === req.user!.id && status === "suspended") {
      return res.status(400).json({ error: "You cannot suspend your own administrative account." });
    }
    updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No fields provided to update" });
  }

  const updatedUser = await usersDb.update(targetUser.id, updates);
  if (!updatedUser) {
    return res.status(404).json({ error: "User not found" });
  }

  logAuditEvent({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: "update_user_details",
    resourceType: "user",
    resourceId: targetUser.id,
    details: { 
      targetEmail: targetUser.email,
      updatedFields: Object.keys(updates)
    },
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"],
    status: "success"
  });

  const { passwordHash: _, ...sanitized } = updatedUser;
  res.json(sanitized);
});

app.put("/api/admin/courses/:id/status", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { status, isFeatured } = req.body;
  const targetCourse = await coursesDb.findOne({ id: req.params.id });
  if (!targetCourse) return res.status(404).json({ error: "Course not found" });

  const updated = await coursesDb.update(req.params.id, { status, isFeatured });
  if (!updated) return res.status(404).json({ error: "Course not found" });

  logAuditEvent({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: "update_course_status",
    resourceType: "course",
    resourceId: req.params.id,
    details: { courseTitle: targetCourse.title, previousStatus: targetCourse.status, newStatus: status, isFeatured },
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"],
    status: "success"
  });

  // If newly published, notify active students
  if (status === "published" && targetCourse.status !== "published") {
    NotificationService.notifyCoursePublished(updated, req.user!.organizationId)
      .catch(err => console.error("[Notification] Failed to notify course published:", err));
  }

  res.json(updated);
});

// ==========================================
// ADMIN FILE UPLOAD API (Thumbnails, PDFs, Videos)
// ==========================================
app.post("/api/upload", authenticateToken, uploadRateLimiter.middleware, (req, res, next) => {
  upload.single("file")(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || "File upload failed validation" });
    }
    next();
  });
}, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN && req.user!.role !== UserRole.SUPER_ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const folder = (req.query.folder as string) || "materials";
  const maxLimit = FOLDER_SIZE_LIMITS[folder] || FOLDER_SIZE_LIMITS.materials;

  if (req.file.size > maxLimit) {
    // Delete file from disk if oversized for its specific category
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (e) {}
    return res.status(400).json({
      error: `File size (${(req.file.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit for ${folder} (${Math.round(maxLimit / 1024 / 1024)} MB)`
    });
  }

  // Validate actual file magic bytes for image uploads
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (folder === "thumbnail" || folder === "avatar") {
    if (!isValidImageContent(req.file.path, ext)) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (e) {}
      return res.status(400).json({
        error: "File content does not match a valid JPEG, PNG, or WebP image."
      });
    }
  }

  uploadRateLimiter.recordHit(req);

  const subPath = folder === "thumbnail" ? "course-thumbnails" : folder === "video" ? "videos" : "materials";
  const fileUrl = `/storage/${subPath}/${req.file.filename}`;

  logAuditEvent({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: "upload_file",
    resourceType: "file",
    resourceId: fileUrl,
    details: { filename: req.file.originalname, size: req.file.size, folder, mimetype: req.file.mimetype },
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"],
    status: "success"
  });

  res.json({
    url: fileUrl,
    filename: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

// Admin File Deletion Endpoint (cleans up physical assets when replaced or removed)
app.delete("/api/upload", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN && req.user!.role !== UserRole.SUPER_ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const fileUrl = (req.body?.fileUrl || req.query?.fileUrl) as string;
  if (!fileUrl || typeof fileUrl !== "string") {
    return res.status(400).json({ error: "fileUrl parameter is required" });
  }

  // Prevent path traversal
  if (!fileUrl.startsWith("/storage/") || fileUrl.includes("..")) {
    return res.status(400).json({ error: "Invalid file URL" });
  }

  const relativePath = fileUrl.replace(/^\/storage\//, "");
  const fullPath = path.resolve(storageDir, relativePath);

  // Ensure resolved path is strictly within storageDir
  if (!fullPath.startsWith(storageDir)) {
    return res.status(400).json({ error: "Invalid file path traversal attempt" });
  }

  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: "File not found on server" });
  }

  // Preserve files still referenced in courses or learning paths
  const [coursesWithFile, pathsWithFile] = await Promise.all([
    coursesDb.find({ thumbnail: fileUrl }),
    learningPathsDb.find({ thumbnail: fileUrl })
  ]);

  if (coursesWithFile.length > 0 || pathsWithFile.length > 0) {
    return res.json({ 
      success: true, 
      message: "File retained on server because it is referenced by other published or draft resources", 
      preserved: true 
    });
  }

  try {
    fs.unlinkSync(fullPath);
    logAuditEvent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: "delete_file",
      resourceType: "file",
      resourceId: fileUrl,
      details: { fileUrl },
      ipAddress: getClientIp(req),
      userAgent: req.headers["user-agent"],
      status: "success"
    });
    return res.json({ success: true, message: "File removed from storage" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete file from disk" });
  }
});

// ==========================================
// ADMIN COURSE AUTHORING & CONTENT MANAGEMENT SUITE
// ==========================================

// 1. List all courses with metadata counts
app.get("/api/admin/courses", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const allCourses = await coursesDb.find();
  const allModules = await modulesDb.find();
  const allLessons = await lessonsDb.find();
  const allAssessments = await assessmentsDb.find();
  const allEnrollments = await enrollmentsDb.find();

  const enriched = allCourses.map(course => {
    const courseModules = allModules.filter(m => m.courseId === course.id);
    const courseLessons = allLessons.filter(l => l.courseId === course.id);
    const courseAssessments = allAssessments.filter(a => a.courseId === course.id);
    const courseEnrollments = allEnrollments.filter(e => e.courseId === course.id);

    return {
      ...course,
      modulesCount: courseModules.length,
      lessonsCount: courseLessons.length,
      assessmentsCount: courseAssessments.length,
      studentsCount: courseEnrollments.length
    };
  });

  enriched.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  res.json(enriched);
});

// 2. Create course (default draft)
app.post("/api/admin/courses", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const {
    title,
    shortDescription,
    description,
    category,
    difficulty,
    estimatedDuration,
    tags,
    prerequisites,
    thumbnail,
    banner,
    requirements,
    skillsCovered,
    status,
    isFeatured,
    certificateEnabled,
    certificateTemplateId,
    certificateTitle,
    requireFinalAssessment,
    validityMonths,
    signatoryName,
    signatoryTitle
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Course title is required" });
  }

  const adminUser = await usersDb.findOne({ id: req.user!.id });
  const instructorName = adminUser?.name || "Administrator";

  const newCourse = await coursesDb.insert({
    title: title.trim(),
    shortDescription: shortDescription?.trim() || "",
    description: description?.trim() || "",
    category: category?.trim() || "General",
    difficulty: difficulty || "Beginner",
    estimatedDuration: estimatedDuration?.trim() || "",
    tags: Array.isArray(tags) ? tags : (typeof tags === "string" && tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : []),
    prerequisites: Array.isArray(prerequisites) ? prerequisites : (typeof prerequisites === "string" && prerequisites ? prerequisites.split(",").map(p => p.trim()).filter(Boolean) : []),
    version: 1,
    thumbnail: thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80",
    banner: banner || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1600&auto=format&fit=crop&q=80",
    instructorId: req.user!.id,
    instructorName,
    requirements: Array.isArray(requirements) ? requirements : (typeof requirements === "string" && requirements ? requirements.split(",").map(r => r.trim()).filter(Boolean) : ["Basic Computer Knowledge"]),
    skillsCovered: Array.isArray(skillsCovered) ? skillsCovered : (typeof skillsCovered === "string" && skillsCovered ? skillsCovered.split(",").map(s => s.trim()).filter(Boolean) : [category?.trim() || "General Knowledge"]),
    status: status || "draft",
    isFeatured: !!isFeatured,
    rating: 5.0,
    reviewsCount: 0,
    certificateEnabled: certificateEnabled !== undefined ? !!certificateEnabled : true,
    certificateTemplateId: certificateTemplateId || null,
    certificateTitle: certificateTitle?.trim() || null,
    requireFinalAssessment: requireFinalAssessment !== undefined ? !!requireFinalAssessment : false,
    validityMonths: validityMonths ? Number(validityMonths) : null,
    signatoryName: signatoryName?.trim() || null,
    signatoryTitle: signatoryTitle?.trim() || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  res.status(201).json(newCourse);
});

// 3. Get full course tree for authoring studio
app.get("/api/admin/courses/:id", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const course = await coursesDb.findOne({ id: req.params.id });
  if (!course) return res.status(404).json({ error: "Course not found" });

  const allModules = await modulesDb.find({ courseId: course.id });
  const modules = allModules.sort((a, b) => a.order - b.order);

  const allLessons = await lessonsDb.find({ courseId: course.id });
  const lessons = allLessons.sort((a, b) => a.order - b.order);

  const allAssessments = await assessmentsDb.find({ courseId: course.id });
  const allQuestions = await questionsDb.find();

  // Attach questions to each assessment
  const assessmentsWithQuestions = allAssessments.map(ass => {
    const qList = allQuestions
      .filter(q => q.assessmentId === ass.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    return {
      ...ass,
      questions: qList
    };
  });

  // Attach practice tests to lessons & group lessons into modules
  const modulesWithLessons = modules.map(mod => {
    const modLessons = lessons
      .filter(l => l.moduleId === mod.id)
      .map(les => {
        const practiceTest = assessmentsWithQuestions.find(a => a.lessonId === les.id || (a.type === "lesson_practice" && a.lessonId === les.id));
        return {
          ...les,
          practiceTest: practiceTest || null
        };
      });
    return {
      ...mod,
      lessons: modLessons
    };
  });

  const finalAssessment = assessmentsWithQuestions.find(a => !a.lessonId || a.type === "course_final") || null;
  const enrollments = await enrollmentsDb.find({ courseId: course.id });

  res.json({
    course,
    modules: modulesWithLessons,
    assessments: assessmentsWithQuestions,
    finalAssessment,
    enrolledStudentsCount: enrollments.length
  });
});

// 4. Update course metadata / status
app.put("/api/admin/courses/:id", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const {
    title,
    shortDescription,
    description,
    category,
    difficulty,
    estimatedDuration,
    tags,
    prerequisites,
    version,
    thumbnail,
    banner,
    requirements,
    skillsCovered,
    status,
    isFeatured,
    certificateEnabled,
    certificateTemplateId,
    certificateTitle,
    requireFinalAssessment,
    validityMonths,
    signatoryName,
    signatoryTitle
  } = req.body;

  const updatePayload: Record<string, any> = {};
  if (title !== undefined) updatePayload.title = title.trim();
  if (shortDescription !== undefined) updatePayload.shortDescription = shortDescription.trim();
  if (description !== undefined) updatePayload.description = description.trim();
  if (category !== undefined) updatePayload.category = category.trim();
  if (difficulty !== undefined) updatePayload.difficulty = difficulty;
  if (estimatedDuration !== undefined) updatePayload.estimatedDuration = estimatedDuration.trim();
  if (tags !== undefined) {
    updatePayload.tags = Array.isArray(tags) ? tags : (typeof tags === "string" ? tags.split(",").map(t => t.trim()).filter(Boolean) : []);
  }
  if (prerequisites !== undefined) {
    updatePayload.prerequisites = Array.isArray(prerequisites) ? prerequisites : (typeof prerequisites === "string" ? prerequisites.split(",").map(p => p.trim()).filter(Boolean) : []);
  }
  if (version !== undefined) updatePayload.version = Number(version);
  if (thumbnail !== undefined) updatePayload.thumbnail = thumbnail;
  if (banner !== undefined) updatePayload.banner = banner;
  if (requirements !== undefined) {
    updatePayload.requirements = Array.isArray(requirements) ? requirements : (typeof requirements === "string" ? requirements.split(",").map(r => r.trim()).filter(Boolean) : []);
  }
  if (skillsCovered !== undefined) {
    updatePayload.skillsCovered = Array.isArray(skillsCovered) ? skillsCovered : (typeof skillsCovered === "string" ? skillsCovered.split(",").map(s => s.trim()).filter(Boolean) : []);
  }
  if (status !== undefined) updatePayload.status = status;
  if (isFeatured !== undefined) updatePayload.isFeatured = !!isFeatured;
  if (certificateEnabled !== undefined) updatePayload.certificateEnabled = !!certificateEnabled;
  if (certificateTemplateId !== undefined) updatePayload.certificateTemplateId = certificateTemplateId || null;
  if (certificateTitle !== undefined) updatePayload.certificateTitle = certificateTitle?.trim() || null;
  if (requireFinalAssessment !== undefined) updatePayload.requireFinalAssessment = !!requireFinalAssessment;
  if (validityMonths !== undefined) updatePayload.validityMonths = validityMonths ? Number(validityMonths) : null;
  if (signatoryName !== undefined) updatePayload.signatoryName = signatoryName?.trim() || null;
  if (signatoryTitle !== undefined) updatePayload.signatoryTitle = signatoryTitle?.trim() || null;
  updatePayload.updatedAt = new Date().toISOString();

  const updated = await coursesDb.update(req.params.id, updatePayload);
  if (!updated) return res.status(404).json({ error: "Course not found" });

  res.json(updated);
});

// 4b. Pre-publish Content Validation Check
app.get("/api/admin/courses/:id/validate", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const result = await CourseService.validateCourseForPublishing(req.params.id);
  res.json(result);
});

// 4c. Publish Course with Verification Guard & Safe Versioning
app.post("/api/admin/courses/:id/publish", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const result = await CourseService.publishCourse(req.params.id, req.body);
  if (!result.success) {
    return res.status(422).json({
      error: "Course validation failed before publishing",
      issues: result.issues
    });
  }

  logAuditEvent({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: "publish_course",
    resourceType: "course",
    resourceId: req.params.id,
    details: { courseTitle: result.course?.title, version: result.course?.version },
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"],
    status: "success"
  });

  res.json({ message: "Course published successfully", course: result.course });
});

// 5. Delete course and all cascaded entities
app.delete("/api/admin/courses/:id", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const courseId = req.params.id;
  const course = await coursesDb.findOne({ id: courseId });
  if (!course) return res.status(404).json({ error: "Course not found" });

  // Delete assessments, questions, submissions
  const courseAssessments = await assessmentsDb.find({ courseId });
  for (const ass of courseAssessments) {
    const qList = await questionsDb.find({ assessmentId: ass.id });
    for (const q of qList) await questionsDb.delete(q.id);
    const subList = await submissionsDb.find({ assessmentId: ass.id });
    for (const sub of subList) await submissionsDb.delete(sub.id);
    await assessmentsDb.delete(ass.id);
  }

  // Delete lessons and progress
  const courseLessons = await lessonsDb.find({ courseId });
  for (const les of courseLessons) {
    const progList = await progressDb.find({ lessonId: les.id });
    for (const p of progList) await progressDb.delete(p.id);
    await lessonsDb.delete(les.id);
  }

  // Delete modules
  const courseModules = await modulesDb.find({ courseId });
  for (const mod of courseModules) {
    await modulesDb.delete(mod.id);
  }

  // Delete enrollments
  const courseEnrollments = await enrollmentsDb.find({ courseId });
  for (const enr of courseEnrollments) {
    await enrollmentsDb.delete(enr.id);
  }

  // Delete reviews
  const courseReviews = await reviewsDb.find({ courseId });
  for (const rev of courseReviews) {
    await reviewsDb.delete(rev.id);
  }

  // Delete course
  await coursesDb.delete(courseId);

  res.json({ message: "Course and all associated content deleted successfully" });
});

// 6. Module CRUD
app.post("/api/admin/courses/:courseId/modules", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { courseId } = req.params;
  const course = await coursesDb.findOne({ id: courseId });
  if (!course) return res.status(404).json({ error: "Course not found" });

  const { title, description, order, status } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Module title is required" });
  }

  const existingModules = await modulesDb.find({ courseId });
  const moduleOrder = order !== undefined ? Number(order) : existingModules.length + 1;

  const newModule = await modulesDb.insert({
    courseId,
    title: title.trim(),
    description: description?.trim() || "",
    order: moduleOrder,
    status: status || "published"
  });

  res.status(201).json(newModule);
});

// Reorder modules within course
app.put("/api/admin/courses/:courseId/modules/reorder", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }
  const { moduleIds } = req.body;
  if (!Array.isArray(moduleIds)) {
    return res.status(400).json({ error: "moduleIds array is required" });
  }
  await CourseService.reorderModules(req.params.courseId, moduleIds);
  res.json({ message: "Modules reordered successfully" });
});

app.put("/api/admin/modules/:id", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { title, description, order, status } = req.body;
  const payload: Record<string, any> = {};
  if (title !== undefined) payload.title = title.trim();
  if (description !== undefined) payload.description = description.trim();
  if (order !== undefined) payload.order = Number(order);
  if (status !== undefined) payload.status = status;

  const updated = await modulesDb.update(req.params.id, payload);
  if (!updated) return res.status(404).json({ error: "Module not found" });

  res.json(updated);
});

app.delete("/api/admin/modules/:id", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const moduleId = req.params.id;
  const deleted = await CourseService.softDeleteModule(moduleId);
  if (!deleted) return res.status(404).json({ error: "Module not found" });

  res.json({ message: "Module and associated lessons archived successfully" });
});

// 7. Lesson CRUD
app.post("/api/admin/modules/:moduleId/lessons", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { moduleId } = req.params;
  const mod = await modulesDb.findOne({ id: moduleId });
  if (!mod) return res.status(404).json({ error: "Module not found" });

  const {
    title,
    description,
    type,
    content,
    videoUrl,
    fileUrl,
    materialTitle,
    materialUrl,
    codingPrompt,
    assessmentId,
    order,
    durationMinutes,
    status
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Lesson title is required" });
  }

  const existingLessons = await lessonsDb.find({ moduleId });
  const lessonOrder = order !== undefined ? Number(order) : existingLessons.length + 1;

  const newLesson = await lessonsDb.insert({
    moduleId,
    courseId: mod.courseId,
    title: title.trim(),
    description: description?.trim() || "",
    type: type || LessonType.VIDEO,
    content: content || "",
    videoUrl: videoUrl?.trim() || "",
    fileUrl: fileUrl?.trim() || materialUrl?.trim() || (type === "pdf" || type === "image" ? content?.trim() : "") || "",
    materialTitle: materialTitle?.trim() || "",
    materialUrl: materialUrl?.trim() || fileUrl?.trim() || (type === "pdf" || type === "image" ? content?.trim() : "") || "",
    codingPrompt,
    assessmentId: assessmentId || null,
    order: lessonOrder,
    durationMinutes: Number(durationMinutes) || 10,
    status: status || "published"
  });

  res.status(201).json(newLesson);
});

// Reorder lessons within module
app.put("/api/admin/modules/:moduleId/lessons/reorder", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }
  const { lessonIds } = req.body;
  if (!Array.isArray(lessonIds)) {
    return res.status(400).json({ error: "lessonIds array is required" });
  }
  await CourseService.reorderLessons(req.params.moduleId, lessonIds);
  res.json({ message: "Lessons reordered successfully" });
});

// Duplicate lesson
app.post("/api/admin/lessons/:lessonId/duplicate", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }
  try {
    const duplicated = await CourseService.duplicateLesson(req.params.lessonId);
    res.status(201).json(duplicated);
  } catch (err: any) {
    res.status(err.message === "Lesson not found" ? 404 : 500).json({ error: err.message });
  }
});

app.put("/api/admin/lessons/:id", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const {
    title,
    description,
    type,
    content,
    videoUrl,
    fileUrl,
    materialTitle,
    materialUrl,
    codingPrompt,
    assessmentId,
    order,
    durationMinutes,
    status
  } = req.body;

  const payload: Record<string, any> = {};
  if (title !== undefined) payload.title = title.trim();
  if (description !== undefined) payload.description = description.trim();
  if (type !== undefined) payload.type = type;
  if (content !== undefined) payload.content = content;
  if (videoUrl !== undefined) payload.videoUrl = videoUrl.trim();
  if (fileUrl !== undefined) payload.fileUrl = fileUrl.trim();
  if (materialTitle !== undefined) payload.materialTitle = materialTitle.trim();
  if (materialUrl !== undefined) {
    payload.materialUrl = materialUrl.trim();
    if (!payload.fileUrl) payload.fileUrl = materialUrl.trim();
  }
  if (codingPrompt !== undefined) payload.codingPrompt = codingPrompt;
  if (assessmentId !== undefined) payload.assessmentId = assessmentId;
  if (order !== undefined) payload.order = Number(order);
  if (durationMinutes !== undefined) payload.durationMinutes = Number(durationMinutes);
  if (status !== undefined) payload.status = status;

  const updated = await lessonsDb.update(req.params.id, payload);
  if (!updated) return res.status(404).json({ error: "Lesson not found" });

  res.json(updated);
});

app.delete("/api/admin/lessons/:id", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const lessonId = req.params.id;
  const deleted = await CourseService.softDeleteLesson(lessonId);
  if (!deleted) return res.status(404).json({ error: "Lesson not found" });

  res.json({ message: "Lesson archived successfully" });
});

// 8. Practice Tests & Course Final Assessments CRUD
app.get("/api/admin/lessons/:lessonId/practice-test", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { lessonId } = req.params;
  const assessment = await assessmentsDb.findOne({ lessonId });
  if (!assessment) return res.json({ assessment: null, questions: [] });

  const questions = await questionsDb.find({ assessmentId: assessment.id });
  questions.sort((a, b) => (a.order || 0) - (b.order || 0));

  res.json({ assessment, questions });
});

app.post("/api/admin/lessons/:lessonId/practice-test", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { lessonId } = req.params;
  const lesson = await lessonsDb.findOne({ id: lessonId });
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });

  const { title, description, durationMinutes, passingScore } = req.body;

  let assessment = await assessmentsDb.findOne({ lessonId });
  if (assessment) {
    const updated = await assessmentsDb.update(assessment.id, {
      title: title?.trim() || assessment.title,
      description: description?.trim() || assessment.description,
      durationMinutes: durationMinutes ? Number(durationMinutes) : assessment.durationMinutes,
      passingScore: passingScore ? Number(passingScore) : assessment.passingScore
    });
    return res.json(updated);
  }

  assessment = await assessmentsDb.insert({
    courseId: lesson.courseId,
    moduleId: lesson.moduleId,
    lessonId: lesson.id,
    type: "lesson_practice",
    title: title?.trim() || `${lesson.title} - Practice Test`,
    description: description?.trim() || `Practice assessment for lesson: ${lesson.title}`,
    durationMinutes: Number(durationMinutes) || 15,
    passingScore: Number(passingScore) || 70,
    totalPoints: 0,
    questionsCount: 0,
    createdAt: new Date().toISOString(),
    status: "published"
  });

  res.status(201).json(assessment);
});

app.post("/api/admin/courses/:courseId/final-assessment", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { courseId } = req.params;
  const course = await coursesDb.findOne({ id: courseId });
  if (!course) return res.status(404).json({ error: "Course not found" });

  const { title, description, durationMinutes, passingScore } = req.body;

  const allCourseAssessments = await assessmentsDb.find({ courseId });
  let finalAss = allCourseAssessments.find(a => !a.lessonId || a.type === "course_final");

  if (finalAss) {
    const updated = await assessmentsDb.update(finalAss.id, {
      title: title?.trim() || finalAss.title,
      description: description?.trim() || finalAss.description,
      durationMinutes: durationMinutes ? Number(durationMinutes) : finalAss.durationMinutes,
      passingScore: passingScore ? Number(passingScore) : finalAss.passingScore
    });
    return res.json(updated);
  }

  finalAss = await assessmentsDb.insert({
    courseId,
    lessonId: null as any,
    type: "course_final",
    title: title?.trim() || `${course.title} - Final Certification Assessment`,
    description: description?.trim() || `Final comprehensive examination for ${course.title}`,
    durationMinutes: Number(durationMinutes) || 30,
    passingScore: Number(passingScore) || 70,
    totalPoints: 0,
    questionsCount: 0,
    createdAt: new Date().toISOString(),
    status: "published"
  });

  res.status(201).json(finalAss);
});

// ==========================================
// 8. STANDALONE ADMIN ASSESSMENTS & ASSIGNMENTS SUITE
// ==========================================

// Get distinct assessment categories
app.get("/api/admin/assessments/categories", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  try {
    const allAssessments = await assessmentsDb.find();
    const categoriesSet = new Set<string>();

    for (const a of allAssessments) {
      if (a.category && typeof a.category === "string" && a.category.trim()) {
        categoriesSet.add(a.category.trim());
      }
    }

    if (categoriesSet.size === 0) {
      categoriesSet.add("General");
      categoriesSet.add("Computer Science");
      categoriesSet.add("Software Engineering");
    }

    const sortedCategories = Array.from(categoriesSet).sort((a, b) => a.localeCompare(b));
    res.json(sortedCategories);
  } catch (err: any) {
    console.error("Failed to load assessment categories:", err);
    res.status(500).json({ error: "Failed to load assessment categories" });
  }
});

// List all Admin Assessments with stats & filtering
app.get("/api/admin/assessments", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { type, status, search, difficulty, category } = req.query;
  let allAssessments = await assessmentsDb.find();
  const allAssignments = await assessmentAssignmentsDb.find();
  const allSubmissions = await submissionsDb.find();
  const allQuestions = await questionsDb.find();

  if (category && category !== "all") {
    allAssessments = allAssessments.filter(a => 
      a.category && a.category.trim().toLowerCase() === (category as string).trim().toLowerCase()
    );
  }
  if (type && type !== "all") {
    allAssessments = allAssessments.filter(a => (a.type || "standalone") === type);
  }
  if (status && status !== "all") {
    allAssessments = allAssessments.filter(a => a.status === status);
  }
  if (difficulty && difficulty !== "all") {
    allAssessments = allAssessments.filter(a => (a.difficulty || "medium").toLowerCase() === (difficulty as string).toLowerCase());
  }
  if (search) {
    const q = (search as string).toLowerCase().trim();
    allAssessments = allAssessments.filter(a =>
      a.title.toLowerCase().includes(q) ||
      (a.category && a.category.toLowerCase().includes(q)) ||
      (a.description && a.description.toLowerCase().includes(q))
    );
  }

  const enriched = allAssessments.map(a => {
    const assignments = allAssignments.filter(as => as.assessmentId === a.id);
    const submissions = allSubmissions.filter(s => s.assessmentId === a.id);
    const questions = allQuestions.filter(q => q.assessmentId === a.id);
    const avgScore = submissions.length > 0
      ? Math.round(submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length)
      : 0;

    return {
      ...a,
      questionsCount: questions.length > 0 ? questions.length : (a.questionsCount || 0),
      assignedStudentsCount: assignments.length,
      attemptsCount: submissions.length,
      averageScore: avgScore
    };
  });

  enriched.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  res.json(enriched);
});

// Create new standalone assessment (draft)
app.post("/api/admin/assessments", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const {
    title,
    description,
    shortDescription,
    instructions,
    category,
    difficulty,
    type,
    assessmentType,
    durationMinutes,
    passingScore,
    maxAttempts,
    questionNavigation,
    randomizeQuestions,
    randomizeOptions,
    revealAnswers,
    status
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Assessment title is required" });
  }

  const validArchitecturalTypes = ['lesson_practice', 'course_final', 'path_practice', 'path_final', 'standalone'];
  const finalType = type && validArchitecturalTypes.includes(type) ? type : "standalone";

  const adminUser = await usersDb.findOne({ id: req.user!.id });
  const authorName = adminUser?.name || "Administrator";
  const now = new Date().toISOString();

  const newAssessment = await assessmentsDb.insert({
    title: title.trim(),
    description: description?.trim() || "",
    shortDescription: shortDescription?.trim() || "",
    instructions: instructions?.trim() || "",
    category: category?.trim() || "General",
    difficulty: difficulty || "medium",
    assessmentType: assessmentType || "practice_test",
    type: finalType,
    durationMinutes: Number(durationMinutes) > 0 ? Number(durationMinutes) : 15,
    passingScore: Number(passingScore) > 0 ? Number(passingScore) : 70,
    maxAttempts: Number(maxAttempts) > 0 ? Number(maxAttempts) : 1,
    questionNavigation: questionNavigation === "sequential" ? "sequential" : "free",
    randomizeQuestions: Boolean(randomizeQuestions),
    randomizeOptions: Boolean(randomizeOptions),
    revealAnswers: revealAnswers !== false,
    authorId: req.user!.id,
    authorName,
    status: status === "published" ? "published" : "draft",
    totalPoints: 0,
    questionsCount: 0,
    createdAt: now,
    updatedAt: now
  });

  res.status(201).json(newAssessment);
});

// Download assessment questions Excel template (MUST be defined before /:id)
app.get("/api/admin/assessments/template", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }
  const headers = [
    "Question",
    "Option 1",
    "Option 2",
    "Option 3",
    "Option 4",
    "Option 5",
    "Correct Option",
    "Points",
    "Difficulty",
    "Explanation"
  ];

  const questionsWs = XLSX.utils.aoa_to_sheet([headers]);
  questionsWs["!cols"] = [
    { wch: 45 },
    { wch: 25 },
    { wch: 25 },
    { wch: 25 },
    { wch: 25 },
    { wch: 20 },
    { wch: 18 },
    { wch: 10 },
    { wch: 14 },
    { wch: 45 }
  ];

  const instructions = [
    ["Assessment Question Import Template - Instructions & Guidelines"],
    [""],
    ["Column Name", "Required", "Allowed Format / Values", "Default Value", "Description"],
    ["Question", "Yes", "Non-empty text string", "-", "The full prompt / text of the MCQ question."],
    ["Option 1", "Yes", "Non-empty text string", "-", "First multiple choice option."],
    ["Option 2", "Yes", "Non-empty text string", "-", "Second multiple choice option."],
    ["Option 3", "No", "Text string", "(empty)", "Third multiple choice option (optional)."],
    ["Option 4", "No", "Text string", "(empty)", "Fourth multiple choice option (optional)."],
    ["Option 5", "No", "Text string", "(empty)", "Fifth multiple choice option (optional)."],
    ["Correct Option", "Yes", "'Option 1' - 'Option 5', or '1' - '5', or exact option text", "-", "Specifies which option is correct."],
    ["Points", "No", "Positive integer (e.g. 10)", "10", "Score awarded for answering this question correctly."],
    ["Difficulty", "No", "'easy', 'medium', or 'hard'", "medium", "Question difficulty tier."],
    ["Explanation", "No", "Text string", "(empty)", "Rationale or feedback shown to students during review."],
    [""],
    ["Format Notes:"],
    ["1. At least 2 options (Option 1 and Option 2) are required for every question."],
    ["2. The 'Correct Option' can be specified as 'Option 1', 'Option 2', '1', '2', or the exact matching text of the option."],
    ["3. Example rows starting with '[EXAMPLE]' are ignored by the importer and will not be added as real questions."],
    [""],
    ["Example Question Rows (Reference):"],
    ["Question", "Option 1", "Option 2", "Option 3", "Option 4", "Option 5", "Correct Option", "Points", "Difficulty", "Explanation"],
    ["What does CPU stand for in computer systems?", "Central Processing Unit", "Central Performance Unit", "Computer Personal Unit", "Control Processing User", "", "Option 1", 10, "easy", "CPU stands for Central Processing Unit and executes instructions."],
    ["Which data structure operates on a Last In First Out (LIFO) basis?", "Queue", "Stack", "Array", "Linked List", "", "Option 2", 10, "medium", "A Stack works on the LIFO principle where the newest element is removed first."]
  ];

  const instructionsWs = XLSX.utils.aoa_to_sheet(instructions);
  instructionsWs["!cols"] = [
    { wch: 18 },
    { wch: 12 },
    { wch: 45 },
    { wch: 15 },
    { wch: 55 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, questionsWs, "Questions");
  XLSX.utils.book_append_sheet(workbook, instructionsWs, "Instructions");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  res.setHeader("Content-Disposition", 'attachment; filename="assessment_questions_template.xlsx"');
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buffer);
});

// Get single assessment details with questions
app.get("/api/admin/assessments/:id", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const assessment = await assessmentsDb.findOne({ id: req.params.id });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  const questions = await questionsDb.find({ assessmentId: assessment.id });
  questions.sort((a, b) => (a.order || 0) - (b.order || 0));

  const assignments = await assessmentAssignmentsDb.find({ assessmentId: assessment.id });
  const submissions = await submissionsDb.find({ assessmentId: assessment.id });
  const avgScore = submissions.length > 0
    ? Math.round(submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length)
    : 0;

  res.json({
    assessment: {
      ...assessment,
      assignedStudentsCount: assignments.length,
      attemptsCount: submissions.length,
      averageScore: avgScore
    },
    questions
  });
});

// Update assessment details & settings
app.put("/api/admin/assessments/:id", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const assessmentId = req.params.id;
  const existing = await assessmentsDb.findOne({ id: assessmentId });
  if (!existing) return res.status(404).json({ error: "Assessment not found" });

  const {
    title,
    description,
    shortDescription,
    instructions,
    category,
    difficulty,
    type,
    assessmentType,
    durationMinutes,
    passingScore,
    maxAttempts,
    questionNavigation,
    randomizeQuestions,
    randomizeOptions,
    revealAnswers,
    status
  } = req.body;

  const validArchitecturalTypes = ['lesson_practice', 'course_final', 'path_practice', 'path_final', 'standalone'];
  const payload: Record<string, any> = { updatedAt: new Date().toISOString() };
  if (title !== undefined) {
    if (!title.trim()) {
      return res.status(400).json({ error: "Assessment title cannot be empty" });
    }
    payload.title = title.trim();
  }
  if (description !== undefined) payload.description = description.trim();
  if (shortDescription !== undefined) payload.shortDescription = shortDescription.trim();
  if (instructions !== undefined) payload.instructions = instructions.trim();
  if (category !== undefined) payload.category = category.trim();
  if (difficulty !== undefined) payload.difficulty = difficulty;
  if (type !== undefined) {
    if (validArchitecturalTypes.includes(type)) {
      payload.type = type;
    } else {
      return res.status(400).json({ error: `Invalid assessment architectural type: ${type}` });
    }
  }
  if (assessmentType !== undefined) payload.assessmentType = assessmentType;
  if (durationMinutes !== undefined) {
    const d = Number(durationMinutes);
    if (isNaN(d) || d <= 0) {
      return res.status(400).json({ error: "Duration must be greater than 0 minutes" });
    }
    payload.durationMinutes = d;
  }
  if (passingScore !== undefined) {
    const p = Number(passingScore);
    if (isNaN(p) || p <= 0 || p > 100) {
      return res.status(400).json({ error: "Passing score percentage must be between 1 and 100" });
    }
    payload.passingScore = p;
  }
  if (maxAttempts !== undefined) payload.maxAttempts = Number(maxAttempts) > 0 ? Number(maxAttempts) : 1;
  if (questionNavigation !== undefined) payload.questionNavigation = questionNavigation;
  if (randomizeQuestions !== undefined) payload.randomizeQuestions = Boolean(randomizeQuestions);
  if (randomizeOptions !== undefined) payload.randomizeOptions = Boolean(randomizeOptions);
  if (revealAnswers !== undefined) payload.revealAnswers = Boolean(revealAnswers);
  if (status !== undefined) payload.status = status;

  const updated = await assessmentsDb.update(assessmentId, payload);
  res.json(updated);
});

// Safe Delete Assessment (rejects if submissions exist unless forced)
app.delete("/api/admin/assessments/:id", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const assessmentId = req.params.id;
  const ass = await assessmentsDb.findOne({ id: assessmentId });
  if (!ass) return res.status(404).json({ error: "Assessment not found" });

  const subList = await submissionsDb.find({ assessmentId });
  const isForce = req.query.force === "true" || req.body?.force === true;
  if (subList.length > 0 && !isForce) {
    return res.status(400).json({
      error: "Cannot delete assessment with existing submissions. Archive it instead to preserve student attempt records, or confirm force delete.",
      submissionsCount: subList.length
    });
  }

  const qList = await questionsDb.find({ assessmentId });
  for (const q of qList) await questionsDb.delete(q.id);

  const assignList = await assessmentAssignmentsDb.find({ assessmentId });
  for (const a of assignList) await assessmentAssignmentsDb.delete(a.id);

  for (const s of subList) await submissionsDb.delete(s.id);

  await assessmentsDb.delete(assessmentId);
  res.json({ message: "Assessment and associated questions deleted successfully" });
});

// Publish validation checklist
app.post("/api/admin/assessments/:id/publish", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const assessmentId = req.params.id;
  const assessment = await assessmentsDb.findOne({ id: assessmentId });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  const questions = await questionsDb.find({ assessmentId });
  const checklistErrors: string[] = [];

  if (!assessment.title || !assessment.title.trim()) {
    checklistErrors.push("Assessment title cannot be empty");
  }
  if (!assessment.durationMinutes || assessment.durationMinutes <= 0) {
    checklistErrors.push("Duration must be greater than 0 minutes");
  }
  if (!assessment.passingScore || assessment.passingScore <= 0) {
    checklistErrors.push("Passing score percentage must be greater than 0%");
  }
  if (questions.length === 0) {
    checklistErrors.push("Assessment must contain at least 1 question");
  } else {
    questions.forEach((q, idx) => {
      const qNum = idx + 1;
      if (!q.questionText || !q.questionText.trim()) {
        checklistErrors.push(`Question #${qNum} is missing question text`);
      }
      if (!q.options || q.options.length < 2) {
        checklistErrors.push(`Question #${qNum} must have at least 2 answer options`);
      }
      if (!q.correctAnswers || q.correctAnswers.length === 0 || !q.correctAnswers[0]) {
        checklistErrors.push(`Question #${qNum} must specify a correct answer`);
      }
      if (!q.points || q.points <= 0) {
        checklistErrors.push(`Question #${qNum} points must be greater than 0`);
      }
    });
  }

  if (checklistErrors.length > 0) {
    return res.status(400).json({
      error: "Assessment does not satisfy publish validation requirements",
      checklistErrors
    });
  }

  const updated = await assessmentsDb.update(assessmentId, {
    status: "published",
    updatedAt: new Date().toISOString()
  });

  logAuditEvent({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: "publish_assessment",
    resourceType: "assessment",
    resourceId: assessmentId,
    details: { assessmentTitle: assessment.title, questionsCount: questions.length },
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"],
    status: "success"
  });

  res.json({ message: "Assessment published successfully", assessment: updated });
});

// Archive assessment
app.post("/api/admin/assessments/:id/archive", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const assessmentId = req.params.id;
  const assessment = await assessmentsDb.findOne({ id: assessmentId });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  const updated = await assessmentsDb.update(assessmentId, {
    status: "archived",
    updatedAt: new Date().toISOString()
  });

  logAuditEvent({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: "archive_assessment",
    resourceType: "assessment",
    resourceId: assessmentId,
    details: { assessmentTitle: assessment.title },
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"],
    status: "success"
  });

  res.json({ message: "Assessment archived successfully", assessment: updated });
});

// 9. Questions CRUD & Reordering
app.post("/api/admin/assessments/:assessmentId/questions", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { assessmentId } = req.params;
  const assessment = await assessmentsDb.findOne({ id: assessmentId });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  try {
    const {
      questionText,
      type,
      options,
      correctAnswers,
      points,
      negativePoints,
      explanation,
      difficulty,
      order
    } = req.body;

    if (!questionText || !questionText.trim()) {
      return res.status(400).json({ error: "Question text is required" });
    }

    const rawType = type || QuestionType.MCQ_SINGLE;
    let qType: any = rawType;
    if (rawType === "single_choice" || rawType === "mcq") qType = QuestionType.MCQ_SINGLE;
    if (rawType === "multiple_choice") qType = QuestionType.MCQ_MULTI;

    const validQuestionTypes = Object.values(QuestionType);
    if (!validQuestionTypes.includes(qType)) {
      return res.status(400).json({ error: `Invalid question type '${type}'. Supported types: ${validQuestionTypes.join(", ")}` });
    }

    // Check for duplicate question text in this assessment
    const existingQuestions = await questionsDb.find({ assessmentId });
    const normalizedQuestion = questionText.trim().toLowerCase();
    const duplicateQuestion = existingQuestions.find(
      q => q.questionText && q.questionText.trim().toLowerCase() === normalizedQuestion
    );
    if (duplicateQuestion) {
      return res.status(409).json({ 
        error: "A question with this exact text already exists in this assessment." 
      });
    }

    let optionsToSave: string[] = [];
    let correctAnswersToSave: string[] = [];

    if (qType === QuestionType.MCQ_SINGLE || qType === "mcq_single" || qType === QuestionType.MCQ_MULTI || qType === "mcq_multi") {
      if (!Array.isArray(options)) {
        return res.status(400).json({ error: "MCQ questions must have an options array." });
      }
      const cleanOpts = options.map(o => String(o || "").trim()).filter(Boolean);
      if (cleanOpts.length < 2) {
        return res.status(400).json({ error: `MCQ questions must have at least 2 non-empty options (found ${cleanOpts.length}).` });
      }
      if (cleanOpts.length > 10) {
        return res.status(400).json({ error: "MCQ questions cannot exceed 10 options." });
      }

      // Check for duplicate options within the question
      const lowerOpts = cleanOpts.map(o => o.toLowerCase());
      if (new Set(lowerOpts).size !== cleanOpts.length) {
        return res.status(400).json({ error: "Duplicate options detected. Each option must have distinct text." });
      }

      if (!Array.isArray(correctAnswers)) {
        return res.status(400).json({ error: "MCQ questions must have a correctAnswers array." });
      }
      const cleanCorrect = correctAnswers.map(c => String(c || "").trim()).filter(Boolean);

      if (qType === QuestionType.MCQ_SINGLE || qType === "mcq_single") {
        if (cleanCorrect.length !== 1) {
          return res.status(400).json({ error: "MCQ single-choice questions must have exactly one correct option." });
        }
        const rawAns = cleanCorrect[0];
        let resolvedCorrect: string | null = null;
        if (cleanOpts.includes(rawAns)) {
          resolvedCorrect = rawAns;
        } else {
          const ciMatch = cleanOpts.find(o => o.toLowerCase() === rawAns.toLowerCase());
          if (ciMatch) {
            resolvedCorrect = ciMatch;
          } else {
            const optIndexMatch = rawAns.match(/^(?:option\s*|#)?([1-9]\d*)$/i);
            if (optIndexMatch) {
              const idx = parseInt(optIndexMatch[1], 10) - 1;
              if (idx >= 0 && idx < cleanOpts.length) {
                resolvedCorrect = cleanOpts[idx];
              }
            }
          }
        }

        if (!resolvedCorrect) {
          return res.status(400).json({ error: `The chosen correct answer '${rawAns}' must match one of the provided options.` });
        }
        optionsToSave = cleanOpts;
        correctAnswersToSave = [resolvedCorrect];
      } else {
        // Multi-choice
        if (cleanCorrect.length < 1) {
          return res.status(400).json({ error: "Multiple-choice questions must have at least one correct option." });
        }
        const resolvedMulti: string[] = [];
        for (const rawAns of cleanCorrect) {
          let matched: string | null = null;
          if (cleanOpts.includes(rawAns)) {
            matched = rawAns;
          } else {
            const ciMatch = cleanOpts.find(o => o.toLowerCase() === rawAns.toLowerCase());
            if (ciMatch) {
              matched = ciMatch;
            } else {
              const optIndexMatch = rawAns.match(/^(?:option\s*|#)?([1-9]\d*)$/i);
              if (optIndexMatch) {
                const idx = parseInt(optIndexMatch[1], 10) - 1;
                if (idx >= 0 && idx < cleanOpts.length) {
                  matched = cleanOpts[idx];
                }
              }
            }
          }
          if (!matched) {
            return res.status(400).json({ error: `The chosen correct answer '${rawAns}' must match one of the provided options.` });
          }
          if (!resolvedMulti.includes(matched)) {
            resolvedMulti.push(matched);
          }
        }
        optionsToSave = cleanOpts;
        correctAnswersToSave = resolvedMulti;
      }
    } else {
      optionsToSave = Array.isArray(options) ? options.map(o => String(o || "").trim()).filter(Boolean) : [];
      correctAnswersToSave = Array.isArray(correctAnswers) ? correctAnswers.map(c => String(c || "").trim()).filter(Boolean) : [];
    }

    const qOrder = order !== undefined ? Number(order) : existingQuestions.length + 1;
    const rawPoints = Number(points);
    const qPoints = !isNaN(rawPoints) && rawPoints > 0 ? rawPoints : 10;
    const rawNeg = Number(negativePoints);
    const qNegPoints = !isNaN(rawNeg) && rawNeg >= 0 ? rawNeg : 0;
    const rawDiff = String(difficulty || "medium").toLowerCase();
    const qDifficulty: "easy" | "medium" | "hard" = (rawDiff === "easy" || rawDiff === "hard") ? rawDiff : "medium";

    const newQuestion = await questionsDb.insert({
      assessmentId,
      type: qType,
      questionText: questionText.trim(),
      options: optionsToSave,
      correctAnswers: correctAnswersToSave,
      points: qPoints,
      negativePoints: qNegPoints,
      explanation: explanation ? String(explanation).trim() : "",
      difficulty: qDifficulty,
      order: qOrder
    });

    const allQuestions = await questionsDb.find({ assessmentId });
    const totalPoints = allQuestions.reduce((sum, q) => sum + (q.points || 0), 0);
    await assessmentsDb.update(assessmentId, {
      questionsCount: allQuestions.length,
      totalPoints,
      updatedAt: new Date().toISOString()
    });

    res.status(201).json(newQuestion);
  } catch (err: any) {
    sendInternalError(res, "Failed to create question", err);
  }
});

// Question Update (supports both /api/admin/assessment-questions/:id and /api/admin/questions/:id)
const handleQuestionUpdate = async (req: any, res: any) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const questionId = req.params.id;
  try {
    const existing = await questionsDb.findOne({ id: questionId });
    if (!existing) return res.status(404).json({ error: "Question not found" });

    const {
      questionText,
      type,
      options,
      correctAnswers,
      points,
      negativePoints,
      explanation,
      difficulty,
      order
    } = req.body;

    if (questionText !== undefined && questionText.trim()) {
      const normalizedQuestion = questionText.trim().toLowerCase();
      const existingInAss = await questionsDb.find({ assessmentId: existing.assessmentId });
      const duplicateQuestion = existingInAss.find(
        q => q.id !== questionId && q.questionText && q.questionText.trim().toLowerCase() === normalizedQuestion
      );
      if (duplicateQuestion) {
        return res.status(409).json({ 
          error: "A question with this exact text already exists in this assessment." 
        });
      }
    }

    const targetType = type !== undefined ? type : existing.type;
    let optionsToSave: string[] | undefined = undefined;
    let correctAnswersToSave: string[] | undefined = undefined;

    if (targetType === QuestionType.MCQ_SINGLE || targetType === "mcq_single" || targetType === QuestionType.MCQ_MULTI || targetType === "mcq_multi") {
      const optsToCheck = options !== undefined ? options : existing.options;
      const correctToCheck = correctAnswers !== undefined ? correctAnswers : existing.correctAnswers;

      if (options !== undefined || correctAnswers !== undefined) {
        if (!Array.isArray(optsToCheck)) {
          return res.status(400).json({ error: "MCQ questions must have an options array." });
        }
        const cleanOpts = optsToCheck.map((o: any) => String(o || "").trim()).filter(Boolean);
        if (cleanOpts.length < 2) {
          return res.status(400).json({ error: `MCQ questions must have at least 2 non-empty options (found ${cleanOpts.length}).` });
        }
        if (cleanOpts.length > 10) {
          return res.status(400).json({ error: "MCQ questions cannot exceed 10 options." });
        }

        // Check for duplicate options
        const lowerOpts = cleanOpts.map(o => o.toLowerCase());
        if (new Set(lowerOpts).size !== cleanOpts.length) {
          return res.status(400).json({ error: "Duplicate options detected. Each option must have distinct text." });
        }

        if (!Array.isArray(correctToCheck)) {
          return res.status(400).json({ error: "MCQ questions must have a correctAnswers array." });
        }
        const cleanCorrect = correctToCheck.map((c: any) => String(c || "").trim()).filter(Boolean);

        if (targetType === QuestionType.MCQ_SINGLE || targetType === "mcq_single") {
          if (cleanCorrect.length !== 1) {
            return res.status(400).json({ error: "MCQ single-choice questions must have exactly one correct option." });
          }
          const rawAns = cleanCorrect[0];
          let resolvedCorrect: string | null = null;
          if (cleanOpts.includes(rawAns)) {
            resolvedCorrect = rawAns;
          } else {
            const ciMatch = cleanOpts.find(o => o.toLowerCase() === rawAns.toLowerCase());
            if (ciMatch) {
              resolvedCorrect = ciMatch;
            } else {
              const optIndexMatch = rawAns.match(/^(?:option\s*|#)?([1-9]\d*)$/i);
              if (optIndexMatch) {
                const idx = parseInt(optIndexMatch[1], 10) - 1;
                if (idx >= 0 && idx < cleanOpts.length) {
                  resolvedCorrect = cleanOpts[idx];
                }
              }
            }
          }

          if (!resolvedCorrect) {
            return res.status(400).json({ error: `The chosen correct answer '${rawAns}' must match one of the provided options.` });
          }
          optionsToSave = cleanOpts;
          correctAnswersToSave = [resolvedCorrect];
        } else {
          if (cleanCorrect.length < 1) {
            return res.status(400).json({ error: "Multiple-choice questions must have at least one correct option." });
          }
          const resolvedMulti: string[] = [];
          for (const rawAns of cleanCorrect) {
            let matched: string | null = null;
            if (cleanOpts.includes(rawAns)) {
              matched = rawAns;
            } else {
              const ciMatch = cleanOpts.find(o => o.toLowerCase() === rawAns.toLowerCase());
              if (ciMatch) {
                matched = ciMatch;
              } else {
                const optIndexMatch = rawAns.match(/^(?:option\s*|#)?([1-9]\d*)$/i);
                if (optIndexMatch) {
                  const idx = parseInt(optIndexMatch[1], 10) - 1;
                  if (idx >= 0 && idx < cleanOpts.length) {
                    matched = cleanOpts[idx];
                  }
                }
              }
            }
            if (!matched) {
              return res.status(400).json({ error: `The chosen correct answer '${rawAns}' must match one of the provided options.` });
            }
            if (!resolvedMulti.includes(matched)) {
              resolvedMulti.push(matched);
            }
          }
          optionsToSave = cleanOpts;
          correctAnswersToSave = resolvedMulti;
        }
      }
    }

    const payload: Record<string, any> = {};
    if (questionText !== undefined) payload.questionText = questionText.trim();
    if (type !== undefined) payload.type = type;
    if (optionsToSave !== undefined) {
      payload.options = optionsToSave;
    } else if (options !== undefined) {
      payload.options = Array.isArray(options) ? options.map((o: any) => String(o || "").trim()).filter(Boolean) : [];
    }
    if (correctAnswersToSave !== undefined) {
      payload.correctAnswers = correctAnswersToSave;
    } else if (correctAnswers !== undefined) {
      payload.correctAnswers = Array.isArray(correctAnswers) ? correctAnswers.map((c: any) => String(c || "").trim()).filter(Boolean) : [];
    }
    if (points !== undefined) {
      const rawPoints = Number(points);
      payload.points = !isNaN(rawPoints) && rawPoints > 0 ? rawPoints : 10;
    }
    if (negativePoints !== undefined) {
      const rawNeg = Number(negativePoints);
      payload.negativePoints = !isNaN(rawNeg) && rawNeg >= 0 ? rawNeg : 0;
    }
    if (explanation !== undefined) payload.explanation = explanation.trim();
    if (difficulty !== undefined) {
      const rawDiff = String(difficulty).toLowerCase();
      payload.difficulty = ["easy", "medium", "hard"].includes(rawDiff) ? rawDiff : "medium";
    }
    if (order !== undefined) payload.order = Number(order);

    const updated = await questionsDb.update(questionId, payload);

    const allQuestions = await questionsDb.find({ assessmentId: existing.assessmentId });
    const totalPoints = allQuestions.reduce((sum, q) => sum + (q.points || 0), 0);
    await assessmentsDb.update(existing.assessmentId, {
      questionsCount: allQuestions.length,
      totalPoints,
      updatedAt: new Date().toISOString()
    });

    res.json(updated);
  } catch (err: any) {
    sendInternalError(res, "Failed to update question", err);
  }
};
app.put("/api/admin/assessment-questions/:id", authenticateToken, handleQuestionUpdate);
app.put("/api/admin/questions/:id", authenticateToken, handleQuestionUpdate);

// Question Delete (supports both paths)
const handleQuestionDelete = async (req: any, res: any) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const questionId = req.params.id;
  try {
    const existing = await questionsDb.findOne({ id: questionId });
    if (!existing) return res.status(404).json({ error: "Question not found" });

    await questionsDb.delete(questionId);

    const allQuestions = await questionsDb.find({ assessmentId: existing.assessmentId });
    const totalPoints = allQuestions.reduce((sum, q) => sum + (q.points || 0), 0);
    await assessmentsDb.update(existing.assessmentId, {
      questionsCount: allQuestions.length,
      totalPoints,
      updatedAt: new Date().toISOString()
    });

    res.json({ success: true, message: "Question deleted successfully" });
  } catch (err: any) {
    sendInternalError(res, "Failed to delete question", err);
  }
};
app.delete("/api/admin/assessment-questions/:id", authenticateToken, handleQuestionDelete);
app.delete("/api/admin/questions/:id", authenticateToken, handleQuestionDelete);

// Reorder questions
app.post("/api/admin/assessments/:id/reorder-questions", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { questionIds } = req.body;
  if (!Array.isArray(questionIds)) {
    return res.status(400).json({ error: "questionIds array is required" });
  }

  for (let i = 0; i < questionIds.length; i++) {
    await questionsDb.update(questionIds[i], { order: i + 1 });
  }

  const questions = await questionsDb.find({ assessmentId: req.params.id });
  questions.sort((a, b) => (a.order || 0) - (b.order || 0));
  res.json({ message: "Questions reordered successfully", questions });
});

// Duplicate question
app.post("/api/admin/assessment-questions/:id/duplicate", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const question = await questionsDb.findOne({ id: req.params.id });
  if (!question) return res.status(404).json({ error: "Question not found" });

  const allInAssessment = await questionsDb.find({ assessmentId: question.assessmentId });
  const maxOrder = allInAssessment.reduce((max, q) => Math.max(max, q.order || 0), 0);

  const duplicated = await questionsDb.insert({
    assessmentId: question.assessmentId,
    type: question.type,
    questionText: `${question.questionText} (Copy)`,
    options: question.options ? [...question.options] : [],
    correctAnswers: question.correctAnswers ? [...question.correctAnswers] : [],
    points: question.points,
    negativePoints: question.negativePoints || 0,
    explanation: question.explanation || "",
    difficulty: question.difficulty || "medium",
    order: maxOrder + 1
  });

  const updatedQuestions = await questionsDb.find({ assessmentId: question.assessmentId });
  const totalPoints = updatedQuestions.reduce((sum, q) => sum + (q.points || 0), 0);
  await assessmentsDb.update(question.assessmentId, {
    questionsCount: updatedQuestions.length,
    totalPoints,
    updatedAt: new Date().toISOString()
  });

  res.status(201).json(duplicated);
});

// 10. Question Bank APIs
app.get("/api/admin/question-bank", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { search, difficulty, type, excludeAssessmentId } = req.query;
  let allQuestions = await questionsDb.find();
  const allAssessments = await assessmentsDb.find();
  const assessmentMap = new Map(allAssessments.map(a => [a.id, a.title]));

  if (excludeAssessmentId) {
    allQuestions = allQuestions.filter(q => q.assessmentId !== excludeAssessmentId);
  }
  if (difficulty && difficulty !== "all") {
    allQuestions = allQuestions.filter(q => (q.difficulty || "medium").toLowerCase() === (difficulty as string).toLowerCase());
  }
  if (type && type !== "all") {
    allQuestions = allQuestions.filter(q => q.type === type);
  }
  if (search) {
    const q = (search as string).toLowerCase().trim();
    allQuestions = allQuestions.filter(qu =>
      qu.questionText.toLowerCase().includes(q) ||
      (qu.explanation && qu.explanation.toLowerCase().includes(q))
    );
  }

  const enriched = allQuestions.map(q => ({
    ...q,
    sourceAssessmentTitle: assessmentMap.get(q.assessmentId) || "Other Assessment"
  }));

  res.json(enriched);
});

app.post("/api/admin/assessments/:id/add-from-bank", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const assessmentId = req.params.id;
  const assessment = await assessmentsDb.findOne({ id: assessmentId });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  const { questionId } = req.body;
  const sourceQuestion = await questionsDb.findOne({ id: questionId });
  if (!sourceQuestion) return res.status(404).json({ error: "Question not found in bank" });

  const existingQuestions = await questionsDb.find({ assessmentId });
  const maxOrder = existingQuestions.reduce((max, q) => Math.max(max, q.order || 0), 0);

  const cloned = await questionsDb.insert({
    assessmentId,
    type: sourceQuestion.type,
    questionText: sourceQuestion.questionText,
    options: sourceQuestion.options ? [...sourceQuestion.options] : [],
    correctAnswers: sourceQuestion.correctAnswers ? [...sourceQuestion.correctAnswers] : [],
    points: sourceQuestion.points || 10,
    negativePoints: sourceQuestion.negativePoints || 0,
    explanation: sourceQuestion.explanation || "",
    difficulty: sourceQuestion.difficulty || "medium",
    order: maxOrder + 1
  });

  const allQuestions = await questionsDb.find({ assessmentId });
  const totalPoints = allQuestions.reduce((sum, q) => sum + (q.points || 0), 0);
  await assessmentsDb.update(assessmentId, {
    questionsCount: allQuestions.length,
    totalPoints,
    updatedAt: new Date().toISOString()
  });

  res.status(201).json(cloned);
});

// 11. Excel Bulk Question Import
app.post("/api/admin/assessments/:id/import-questions", authenticateToken, upload.single("file"), async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const assessmentId = req.params.id;
  const assessment = await assessmentsDb.findOne({ id: assessmentId });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  let rawRows: any[] = [];

  // Support both file upload and direct parsed JSON payload
  if (req.file) {
    try {
      const fileBuf = fs.readFileSync(req.file.path);
      const readFn = (XLSX as any).read || (XLSX as any).default?.read;
      const workbook = readFn(fileBuf, { type: "buffer" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const sheetToJson = (XLSX as any).utils?.sheet_to_json || (XLSX as any).default?.utils?.sheet_to_json;
      rawRows = sheetToJson(worksheet, { defval: "" });
      try { await fs.promises.unlink(req.file.path); } catch (e) {}
    } catch (err: any) {
      return res.status(400).json({ error: "Failed to parse Excel file: " + err.message });
    }
  } else if (Array.isArray(req.body?.rows)) {
    rawRows = req.body.rows;
  } else {
    return res.status(400).json({ error: "No Excel file or rows provided for import" });
  }

  if (rawRows.length === 0) {
    return res.status(400).json({ error: "The provided Excel file is empty." });
  }

  // Header column presence validation
  const firstRow = rawRows[0];
  const keys = Object.keys(firstRow);
  const hasQuestion = keys.some(k => /question/i.test(k));
  const hasOption1 = keys.some(k => /option\s*1/i.test(k) || /option1/i.test(k) || /option_1/i.test(k));
  const hasOption2 = keys.some(k => /option\s*2/i.test(k) || /option2/i.test(k) || /option_2/i.test(k));
  const hasCorrect = keys.some(k => /correct/i.test(k) || /answer/i.test(k));

  if (!hasQuestion || !hasOption1 || !hasOption2 || !hasCorrect) {
    return res.status(400).json({
      error: "Invalid template format: Missing required columns (Question, Option 1, Option 2, Correct Option). Please use the official template."
    });
  }

  const errors: Array<{ row: number; reason: string }> = [];
  const validQuestionsToInsert: any[] = [];
  let exampleCount = 0;
  const seenQuestionsInFile = new Map<string, number>();

  const existingQuestions = await questionsDb.find({ assessmentId });
  let currentOrder = existingQuestions.reduce((max, q) => Math.max(max, q.order || 0), 0);

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2; // Excel 1-based header is row 1
    const questionText = String(
      row["Question"] || row["question"] || row["Question Text"] || row["question_text"] || ""
    ).trim();

    const opt1 = String(row["Option 1"] || row["option_1"] || row["option1"] || "").trim();
    const opt2 = String(row["Option 2"] || row["option_2"] || row["option2"] || "").trim();
    const opt3 = String(row["Option 3"] || row["option_3"] || row["option3"] || "").trim();
    const opt4 = String(row["Option 4"] || row["option_4"] || row["option4"] || "").trim();
    const opt5 = String(row["Option 5"] || row["option_5"] || row["option5"] || "").trim();

    const rawCorrect = String(
      row["Correct Option"] || row["correct_option"] || row["Correct Answer"] || row["correct_answer"] || row["Answer"] || ""
    ).trim();

    // Skip completely blank rows without generating an error
    if (!questionText && !opt1 && !opt2 && !opt3 && !opt4 && !opt5 && !rawCorrect) {
      return;
    }

    if (!questionText) {
      errors.push({ row: rowNum, reason: "Question text is empty" });
      return;
    }

    // Skip example / sample instruction rows if present in data
    if (
      questionText.toLowerCase().startsWith("[example") ||
      questionText.toLowerCase().startsWith("example:") ||
      questionText.toLowerCase().startsWith("[sample")
    ) {
      exampleCount++;
      return;
    }

    // Duplicate question validation (within spreadsheet and against assessment DB)
    const normalizedQuestion = questionText.toLowerCase().trim();
    if (seenQuestionsInFile.has(normalizedQuestion)) {
      errors.push({
        row: rowNum,
        reason: `Duplicate question: A question with this exact text was already included in this spreadsheet (Row ${seenQuestionsInFile.get(normalizedQuestion)})`
      });
      return;
    }
    seenQuestionsInFile.set(normalizedQuestion, rowNum);

    const existingMatch = existingQuestions.find(q => q.questionText.trim().toLowerCase() === normalizedQuestion);
    if (existingMatch) {
      errors.push({
        row: rowNum,
        reason: `Duplicate question: This question already exists in this assessment.`
      });
      return;
    }

    const options = [opt1, opt2, opt3, opt4, opt5].filter(o => o.length > 0);
    if (options.length < 2) {
      errors.push({ row: rowNum, reason: `At least 2 options are required (found ${options.length})` });
      return;
    }

    // Duplicate options validation within the question
    const lowerOptions = options.map(o => o.toLowerCase());
    const uniqueOptions = new Set(lowerOptions);
    if (uniqueOptions.size !== options.length) {
      errors.push({ row: rowNum, reason: "Duplicate options detected. Each option must have distinct text." });
      return;
    }

    if (!rawCorrect) {
      errors.push({ row: rowNum, reason: "Correct option is required" });
      return;
    }

    // Resolve correct answer: can be "Option 1", "1", "option_1", or exact text of an option
    let resolvedCorrectAnswer: string | null = null;
    const optionMap: { [key: string]: string } = {
      "1": opt1, "option 1": opt1, "option_1": opt1,
      "2": opt2, "option 2": opt2, "option_2": opt2,
      "3": opt3, "option 3": opt3, "option_3": opt3,
      "4": opt4, "option 4": opt4, "option_4": opt4,
      "5": opt5, "option 5": opt5, "option_5": opt5
    };

    const normalizedKey = rawCorrect.toLowerCase();
    if (optionMap[normalizedKey] && optionMap[normalizedKey].length > 0) {
      resolvedCorrectAnswer = optionMap[normalizedKey];
    } else {
      const matched = options.find(o => o.toLowerCase() === rawCorrect.toLowerCase());
      if (matched) {
        resolvedCorrectAnswer = matched;
      }
    }

    if (!resolvedCorrectAnswer) {
      errors.push({
        row: rowNum,
        reason: `Correct option '${rawCorrect}' does not match any provided options (Options: 1 to ${options.length})`
      });
      return;
    }

    const rawPoints = Number(row["Points"] || row["points"] || 10);
    const points = (!isNaN(rawPoints) && rawPoints > 0) ? rawPoints : 10;

    const rawDiff = String(row["Difficulty"] || row["difficulty"] || "medium").toLowerCase();
    const difficulty = ["easy", "medium", "hard"].includes(rawDiff) ? rawDiff : "medium";

    const explanation = String(row["Explanation"] || row["explanation"] || "").trim();

    currentOrder++;
    validQuestionsToInsert.push({
      assessmentId,
      type: QuestionType.MCQ_SINGLE,
      questionText,
      options,
      correctAnswers: [resolvedCorrectAnswer],
      points,
      negativePoints: 0,
      explanation,
      difficulty,
      order: currentOrder
    });
  });

  // If preview mode, return validation preview without modifying database
  const isPreview = Boolean(req.body?.preview || req.query?.preview === "true");
  if (isPreview) {
    return res.json({
      preview: true,
      totalRows: rawRows.length,
      validCount: validQuestionsToInsert.length,
      invalidCount: errors.length,
      exampleCount,
      errors,
      previewQuestions: validQuestionsToInsert.map(q => ({
        questionText: q.questionText,
        options: q.options,
        correctAnswers: q.correctAnswers,
        points: q.points,
        difficulty: q.difficulty,
        explanation: q.explanation
      }))
    });
  }

  // Insert valid questions
  for (const q of validQuestionsToInsert) {
    await questionsDb.insert(q);
  }

  // Recalculate totals
  const allQuestions = await questionsDb.find({ assessmentId });
  const totalPoints = allQuestions.reduce((sum, q) => sum + (q.points || 0), 0);
  await assessmentsDb.update(assessmentId, {
    questionsCount: allQuestions.length,
    totalPoints,
    updatedAt: new Date().toISOString()
  });

  res.json({
    totalRows: rawRows.length,
    validCount: validQuestionsToInsert.length,
    invalidCount: errors.length,
    exampleCount,
    errors,
    importedCount: validQuestionsToInsert.length
  });
});

// 12. Student Assignment & Management APIs
app.get("/api/admin/assessments/:id/students", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const assessmentId = req.params.id;
  const assessment = await assessmentsDb.findOne({ id: assessmentId });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  const allUsers = await usersDb.find();
  const students = allUsers.filter(u => u.role === UserRole.STUDENT);
  const assignments = await assessmentAssignmentsDb.find({ assessmentId });
  const submissions = await submissionsDb.find({ assessmentId });

  const studentList = students.map(st => {
    const assignment = assignments.find(a => a.studentId === st.id);
    const stSubmissions = submissions.filter(s => s.studentId === st.id);
    const highestSubmission = stSubmissions.length > 0
      ? stSubmissions.reduce((prev, current) => (prev.score > current.score ? prev : current))
      : null;
    const latestSubmission = stSubmissions.length > 0
      ? stSubmissions.slice().sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0]
      : null;

    let status: "unassigned" | "assigned" | "in_progress" | "completed" | "expired" | "revoked" = "unassigned";
    if (assignment) {
      if (stSubmissions.length > 0) {
        status = "completed";
      } else if (assignment.status === "not_started") {
        status = "assigned";
      } else {
        status = (assignment.status as any) || "assigned";
      }
    }

    return {
      id: st.id,
      name: st.name,
      email: st.email,
      isAssigned: Boolean(assignment),
      assignmentId: assignment?.id,
      assignedAt: assignment?.assignedAt,
      dueDate: assignment?.dueDate,
      status,
      attemptsCount: stSubmissions.length,
      bestScore: highestSubmission ? highestSubmission.score : null,
      latestScore: latestSubmission ? latestSubmission.score : null,
      lastAttemptedAt: latestSubmission ? latestSubmission.submittedAt : null
    };
  });

  res.json(studentList);
});

app.post("/api/admin/assessments/:id/assign", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const assessmentId = req.params.id;
  const assessment = await assessmentsDb.findOne({ id: assessmentId });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  const { studentId, studentIds, groupId, dueDate, isMandatory } = req.body;

  try {
    if (groupId) {
      const result = await AccessControlService.assignAssessmentToGroup(assessmentId, groupId, req.user!, {
        dueDate,
        isMandatory
      });
      return res.json({ message: `Assessment assigned to group "${result.groupName}" (${result.assignedCount} students)`, ...result });
    }

    if (Array.isArray(studentIds) && studentIds.length > 0) {
      const result = await AccessControlService.assignAssessmentBulk(assessmentId, studentIds, req.user!, {
        dueDate,
        isMandatory
      });
      return res.json({ message: `Successfully assigned ${result.assignedCount} student(s)`, ...result });
    }

    if (studentId) {
      const assignment = await AccessControlService.assignAssessmentToStudent({
        assessmentId,
        studentId,
        assignedBy: req.user!.id,
        assignedByEmail: req.user!.email,
        assignedByRole: req.user!.role,
        dueDate,
        isMandatory,
        source: "individual",
        organizationId: req.user!.organizationId
      });
      return res.status(201).json(assignment);
    }

    return res.status(400).json({ error: "studentId, studentIds, or groupId is required" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/admin/assessments/:id/bulk-assign", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const assessmentId = req.params.id;
  const { studentIds, dueDate, isMandatory } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: "studentIds array is required" });
  }

  try {
    const result = await AccessControlService.assignAssessmentBulk(assessmentId, studentIds, req.user!, {
      dueDate,
      isMandatory
    });
    res.json({ message: `Successfully assigned ${result.assignedCount} student(s)`, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/admin/assessments/:id/revoke", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const assessmentId = req.params.id;
  const { studentId, reason } = req.body;
  if (!studentId) return res.status(400).json({ error: "studentId is required" });

  try {
    await AccessControlService.revokeAssessmentAccess(assessmentId, studentId, req.user!, reason);
    res.json({ message: "Student assignment revoked successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/admin/assessments/:id/access", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }
  try {
    const matrix = await AccessControlService.getAssessmentAccessMatrix(req.params.id, req.user!.organizationId);
    res.json(matrix);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/admin/assessments/:id/results", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const assessmentId = req.params.id;
  const assessment = await assessmentsDb.findOne({ id: assessmentId });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  const assignments = await assessmentAssignmentsDb.find({ assessmentId });
  const submissions = await submissionsDb.find({ assessmentId });
  const allUsers = await usersDb.find();
  const userMap = new Map(allUsers.map(u => [u.id, u]));

  const uniqueStudents = new Set(submissions.map(s => s.studentId));
  const passedSubmissions = submissions.filter(s => s.passed);
  const totalSubmissions = submissions.length;
  const avgScore = totalSubmissions > 0
    ? Math.round(submissions.reduce((sum, s) => sum + s.score, 0) / totalSubmissions)
    : 0;
  const passRate = totalSubmissions > 0
    ? Math.round((passedSubmissions.length / totalSubmissions) * 100)
    : 0;

  const enrichedSubmissions = submissions.map(s => {
    const student = userMap.get(s.studentId);
    const scorePct = s.totalPoints > 0 ? Math.round((s.score / s.totalPoints) * 100) : 0;
    return {
      ...s,
      studentName: student?.name || s.studentName,
      studentEmail: student?.email || "",
      scorePercentage: scorePct
    };
  });

  enrichedSubmissions.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  const allQuestions = await questionsDb.find({ assessmentId });
  allQuestions.sort((a, b) => (a.order || 0) - (b.order || 0));

  const questionStats = allQuestions.map(q => {
    let timesAnswered = 0;
    let timesCorrect = 0;
    let timesIncorrect = 0;
    let timesUnanswered = 0;
    const optionDistribution: Record<string, number> = {};
    if (Array.isArray(q.options)) {
      q.options.forEach(opt => { optionDistribution[opt] = 0; });
    }

    submissions.forEach(sub => {
      const studentAns = sub.answers?.[q.id];
      const hasAnswer = Array.isArray(studentAns) && studentAns.filter(Boolean).length > 0;
      if (!hasAnswer) {
        timesUnanswered++;
      } else {
        timesAnswered++;
        const correctOnes = Array.isArray(q.correctAnswers) ? q.correctAnswers : [];
        const isCorrect = studentAns.length === correctOnes.length && studentAns.every(v => correctOnes.includes(v));
        if (isCorrect) timesCorrect++;
        else timesIncorrect++;

        studentAns.forEach(ans => {
          optionDistribution[ans] = (optionDistribution[ans] || 0) + 1;
        });
      }
    });

    const accuracyRate = timesAnswered > 0 ? Math.round((timesCorrect / timesAnswered) * 100) : 0;

    return {
      questionId: q.id,
      questionText: q.questionText,
      type: q.type,
      difficulty: q.difficulty,
      points: q.points,
      timesAnswered,
      timesCorrect,
      timesIncorrect,
      timesUnanswered,
      accuracyRate,
      optionDistribution
    };
  });

  const allAttempts = await assessmentAttemptsDb.find({ assessmentId });
  const completionRate = assignments.length > 0
    ? Math.round((uniqueStudents.size / assignments.length) * 100)
    : (totalSubmissions > 0 ? 100 : 0);

  res.json({
    assessmentTitle: assessment.title,
    totalAssigned: assignments.length,
    totalSubmissions,
    uniqueStudentsAttempted: uniqueStudents.size,
    completedCount: uniqueStudents.size,
    passedCount: passedSubmissions.length,
    failedCount: totalSubmissions - passedSubmissions.length,
    passRate,
    averageScore: avgScore,
    completionRate,
    questionStats,
    attempts: allAttempts,
    submissions: enrichedSubmissions
  });
});

app.get("/api/admin/assessments/:id/analytics", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const assessmentId = req.params.id;
  const assessment = await assessmentsDb.findOne({ id: assessmentId });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  const assignments = await assessmentAssignmentsDb.find({ assessmentId });
  const submissions = await submissionsDb.find({ assessmentId });
  const attempts = await assessmentAttemptsDb.find({ assessmentId });
  const questions = await questionsDb.find({ assessmentId });
  questions.sort((a, b) => (a.order || 0) - (b.order || 0));

  const uniqueStudents = new Set(submissions.map(s => s.studentId));
  const passedCount = submissions.filter(s => s.passed).length;
  const passRate = submissions.length > 0 ? Math.round((passedCount / submissions.length) * 100) : 0;
  const avgScore = submissions.length > 0
    ? Math.round(submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length)
    : 0;
  const avgTimeTaken = submissions.length > 0
    ? Math.round(submissions.reduce((sum, s) => sum + (s.timeTakenSeconds || 0), 0) / submissions.length)
    : 0;

  const questionAnalytics = questions.map(q => {
    let timesAnswered = 0;
    let timesCorrect = 0;
    let timesIncorrect = 0;
    let timesUnanswered = 0;
    const optionCounts: Record<string, number> = {};
    if (Array.isArray(q.options)) {
      q.options.forEach(opt => { optionCounts[opt] = 0; });
    }

    submissions.forEach(sub => {
      const studentAns = sub.answers?.[q.id];
      const hasAnswer = Array.isArray(studentAns) && studentAns.filter(Boolean).length > 0;
      if (!hasAnswer) {
        timesUnanswered++;
      } else {
        timesAnswered++;
        const correctOnes = Array.isArray(q.correctAnswers) ? q.correctAnswers : [];
        const isCorrect = studentAns.length === correctOnes.length && studentAns.every(v => correctOnes.includes(v));
        if (isCorrect) timesCorrect++;
        else timesIncorrect++;

        studentAns.forEach(ans => {
          optionCounts[ans] = (optionCounts[ans] || 0) + 1;
        });
      }
    });

    const accuracyRate = timesAnswered > 0 ? Math.round((timesCorrect / timesAnswered) * 100) : 0;

    return {
      questionId: q.id,
      questionText: q.questionText,
      type: q.type,
      difficulty: q.difficulty || "medium",
      points: q.points,
      timesAnswered,
      timesCorrect,
      timesIncorrect,
      timesUnanswered,
      accuracyRate,
      optionCounts
    };
  });

  res.json({
    assessmentId: assessment.id,
    title: assessment.title,
    category: assessment.category,
    difficulty: assessment.difficulty,
    totalPoints: assessment.totalPoints,
    passingScore: assessment.passingScore,
    durationMinutes: assessment.durationMinutes,
    totalAssigned: assignments.length,
    totalSubmissions: submissions.length,
    totalAttempts: attempts.length,
    uniqueStudentsCount: uniqueStudents.size,
    passedCount,
    failedCount: submissions.length - passedCount,
    passRate,
    averageScore: avgScore,
    averageTimeTakenSeconds: avgTimeTaken,
    completionRate: assignments.length > 0 ? Math.round((uniqueStudents.size / assignments.length) * 100) : 100,
    questions: questionAnalytics
  });
});


// ==========================================
// ADMIN & STUDENT LEARNING PATH MANAGEMENT SUITE
// ==========================================

// 1. Admin: List all learning paths with metadata & stats
app.get("/api/admin/learning-paths", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const allPaths = await learningPathsDb.find();
  const allSections = await learningPathSectionsDb.find();
  const allItems = await learningPathItemsDb.find();
  const allAssignments = await learningPathAssignmentsDb.find();

  const enriched = allPaths.map(path => {
    const pathSections = allSections.filter(s => s.learningPathId === path.id);
    const pathItems = allItems.filter(i => i.learningPathId === path.id);
    const pathAssignments = allAssignments.filter(a => a.learningPathId === path.id);
    const completedAssignments = pathAssignments.filter(a => !!a.completedAt);
    const completionRate = pathAssignments.length > 0 
      ? Math.round((completedAssignments.length / pathAssignments.length) * 100) 
      : 0;

    return {
      ...path,
      sectionsCount: pathSections.length,
      itemsCount: pathItems.length,
      assignedStudentsCount: pathAssignments.length,
      completionRate
    };
  });

  enriched.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  res.json(enriched);
});

// Helper to generate unique slug
async function generateUniqueSlug(title: string, currentId?: string): Promise<string> {
  const baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "learning-path";
  
  let candidateSlug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await learningPathsDb.findOne({ slug: candidateSlug });
    if (!existing || (currentId && existing.id === currentId)) {
      return candidateSlug;
    }
    candidateSlug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// 2. Admin: Create learning path
app.post("/api/admin/learning-paths", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN && req.user!.role !== UserRole.SUPER_ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const {
    title,
    slug,
    shortDescription,
    description,
    category,
    difficulty,
    thumbnail,
    estimatedDuration,
    requirements,
    learningObjectives,
    status,
    certificateEnabled,
    certificateTemplateId,
    certificateTitle,
    validityMonths,
    signatoryName,
    signatoryTitle
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Learning Path title is required" });
  }

  const adminUser = await usersDb.findOne({ id: req.user!.id });
  const authorName = adminUser?.name || "Administrator";
  const finalSlug = slug?.trim() ? await generateUniqueSlug(slug.trim()) : await generateUniqueSlug(title.trim());

  const newPath = await learningPathsDb.insert({
    title: title.trim(),
    slug: finalSlug,
    shortDescription: shortDescription?.trim() || "",
    description: description?.trim() || "",
    category: category?.trim() || "Technology",
    difficulty: difficulty || "Beginner",
    thumbnail: thumbnail !== undefined ? thumbnail : "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80",
    estimatedDuration: estimatedDuration?.trim() || "4 hours",
    requirements: Array.isArray(requirements) ? requirements : (typeof requirements === "string" && requirements ? requirements.split("\n").map(r => r.trim()).filter(Boolean) : ["Basic Computer Knowledge"]),
    learningObjectives: Array.isArray(learningObjectives) ? learningObjectives : (typeof learningObjectives === "string" && learningObjectives ? learningObjectives.split("\n").map(o => o.trim()).filter(Boolean) : ["Complete all curriculum modules"]),
    status: status || "draft",
    certificateEnabled: certificateEnabled !== undefined ? !!certificateEnabled : true,
    certificateTemplateId: certificateTemplateId || null,
    certificateTitle: certificateTitle?.trim() || null,
    validityMonths: validityMonths ? Number(validityMonths) : null,
    signatoryName: signatoryName?.trim() || null,
    signatoryTitle: signatoryTitle?.trim() || null,
    authorId: req.user!.id,
    authorName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  res.status(201).json(newPath);
});

// 3. Admin: Get full learning path tree (Studio/Builder view)
app.get("/api/admin/learning-paths/:id", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN && req.user!.role !== UserRole.SUPER_ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const path = await learningPathsDb.findOne({ id: req.params.id });
  if (!path) return res.status(404).json({ error: "Learning Path not found" });

  const allSections = await learningPathSectionsDb.find({ learningPathId: path.id });
  const sections = allSections.sort((a, b) => a.order - b.order);

  const allItems = await learningPathItemsDb.find({ learningPathId: path.id });
  const items = allItems.sort((a, b) => a.order - b.order);

  const allAssessments = await assessmentsDb.find({ learningPathId: path.id });
  const allQuestions = await questionsDb.find();

  // Attach questions to assessments
  const assessmentsWithQuestions = allAssessments.map(ass => {
    const qList = allQuestions
      .filter(q => q.assessmentId === ass.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    return { ...ass, questions: qList };
  });

  // Attach assessments to items and items to sections
  const enrichedSections = sections.map(section => {
    const sectionItems = items
      .filter(it => it.sectionId === section.id)
      .map(it => {
        const itemAss = assessmentsWithQuestions.find(a => a.id === it.assessmentId || a.learningPathItemId === it.id);
        return {
          ...it,
          assessment: itemAss || null
        };
      });

    return {
      ...section,
      items: sectionItems
    };
  });

  // Attach final assessment if present
  let finalAssessment: any = null;
  if (path.finalAssessmentId) {
    finalAssessment = assessmentsWithQuestions.find(a => a.id === path.finalAssessmentId) || null;
  }

  // Count assigned students
  const assignments = await learningPathAssignmentsDb.find({ learningPathId: path.id });

  res.json({
    ...path,
    sections: enrichedSections,
    finalAssessment,
    assignedStudentsCount: assignments.length
  });
});

// 4. Admin: Update learning path basic details
app.put("/api/admin/learning-paths/:id", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN && req.user!.role !== UserRole.SUPER_ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const existing = await learningPathsDb.findOne({ id: req.params.id });
  if (!existing) return res.status(404).json({ error: "Learning Path not found" });

  const {
    title,
    slug,
    shortDescription,
    description,
    category,
    difficulty,
    thumbnail,
    estimatedDuration,
    requirements,
    learningObjectives,
    status,
    finalAssessmentId,
    certificateEnabled,
    certificateTemplateId,
    certificateTitle,
    validityMonths,
    signatoryName,
    signatoryTitle
  } = req.body;

  let cleanSlug = existing.slug;
  if (slug && slug.trim() !== existing.slug) {
    cleanSlug = await generateUniqueSlug(slug.trim(), existing.id);
  }

  const updated = await learningPathsDb.update(existing.id, {
    title: title !== undefined ? title.trim() : existing.title,
    slug: cleanSlug,
    shortDescription: shortDescription !== undefined ? shortDescription.trim() : existing.shortDescription,
    description: description !== undefined ? description.trim() : existing.description,
    category: category !== undefined ? category.trim() : existing.category,
    difficulty: difficulty || existing.difficulty,
    thumbnail: thumbnail !== undefined ? thumbnail : existing.thumbnail,
    estimatedDuration: estimatedDuration !== undefined ? estimatedDuration.trim() : existing.estimatedDuration,
    requirements: requirements !== undefined ? (Array.isArray(requirements) ? requirements : [requirements]) : existing.requirements,
    learningObjectives: learningObjectives !== undefined ? (Array.isArray(learningObjectives) ? learningObjectives : [learningObjectives]) : existing.learningObjectives,
    status: status || existing.status,
    finalAssessmentId: finalAssessmentId !== undefined ? finalAssessmentId : existing.finalAssessmentId,
    certificateEnabled: certificateEnabled !== undefined ? !!certificateEnabled : existing.certificateEnabled,
    certificateTemplateId: certificateTemplateId !== undefined ? certificateTemplateId : existing.certificateTemplateId,
    certificateTitle: certificateTitle !== undefined ? certificateTitle?.trim() || null : existing.certificateTitle,
    validityMonths: validityMonths !== undefined ? (validityMonths ? Number(validityMonths) : null) : existing.validityMonths,
    signatoryName: signatoryName !== undefined ? signatoryName?.trim() || null : existing.signatoryName,
    signatoryTitle: signatoryTitle !== undefined ? signatoryTitle?.trim() || null : existing.signatoryTitle,
    updatedAt: new Date().toISOString()
  });

  res.json(updated);
});

// 5. Admin: Delete learning path
app.delete("/api/admin/learning-paths/:id", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const existing = await learningPathsDb.findOne({ id: req.params.id });
  if (!existing) return res.status(404).json({ error: "Learning Path not found" });

  // Delete assessments associated with this learning path
  const pathAssessments = await assessmentsDb.find({ learningPathId: existing.id });
  for (const ass of pathAssessments) {
    await assessmentsDb.delete(ass.id);
  }

  await learningPathsDb.delete(existing.id);
  res.json({ message: "Learning Path deleted successfully" });
});

// 6. Admin: Duplicate learning path
app.post("/api/admin/learning-paths/:id/duplicate", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const existing = await learningPathsDb.findOne({ id: req.params.id });
  if (!existing) return res.status(404).json({ error: "Learning Path not found" });

  const adminUser = await usersDb.findOne({ id: req.user!.id });
  const authorName = adminUser?.name || "Administrator";
  const newSlug = await generateUniqueSlug(`${existing.slug}-copy`);

  const clonedPath = await learningPathsDb.insert({
    title: `${existing.title} (Copy)`,
    slug: newSlug,
    shortDescription: existing.shortDescription,
    description: existing.description,
    category: existing.category,
    difficulty: existing.difficulty,
    thumbnail: existing.thumbnail,
    estimatedDuration: existing.estimatedDuration,
    requirements: existing.requirements,
    learningObjectives: existing.learningObjectives,
    status: "draft",
    authorId: req.user!.id,
    authorName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Clone sections and items
  const sections = await learningPathSectionsDb.find({ learningPathId: existing.id });
  for (const sec of sections) {
    const clonedSec = await learningPathSectionsDb.insert({
      learningPathId: clonedPath.id,
      title: sec.title,
      description: sec.description,
      order: sec.order,
      createdAt: new Date().toISOString()
    });

    const items = await learningPathItemsDb.find({ sectionId: sec.id });
    for (const it of items) {
      let clonedAssessmentId: string | undefined = undefined;

      if (it.type === "assessment" && it.assessmentId) {
        const origAss = await assessmentsDb.findOne({ id: it.assessmentId });
        if (origAss) {
          const newAss = await assessmentsDb.insert({
            learningPathId: clonedPath.id,
            title: origAss.title,
            description: origAss.description,
            type: origAss.type || "path_practice",
            durationMinutes: origAss.durationMinutes,
            passingScore: origAss.passingScore,
            totalPoints: origAss.totalPoints,
            questionsCount: origAss.questionsCount,
            status: origAss.status,
            createdAt: new Date().toISOString()
          });
          clonedAssessmentId = newAss.id;

          const origQuestions = await questionsDb.find({ assessmentId: origAss.id });
          for (const q of origQuestions) {
            await questionsDb.insert({
              assessmentId: newAss.id,
              type: q.type,
              questionText: q.questionText,
              options: q.options,
              correctAnswers: q.correctAnswers,
              explanation: q.explanation,
              points: q.points,
              negativePoints: q.negativePoints,
              difficulty: q.difficulty,
              order: q.order
            });
          }
        }
      }

      await learningPathItemsDb.insert({
        sectionId: clonedSec.id,
        learningPathId: clonedPath.id,
        title: it.title,
        description: it.description,
        type: it.type,
        order: it.order,
        durationMinutes: it.durationMinutes,
        isRequired: it.isRequired,
        content: it.content,
        videoSource: it.videoSource,
        videoUrl: it.videoUrl,
        fileUrl: it.fileUrl,
        fileName: it.fileName,
        assessmentId: clonedAssessmentId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  // Clone final assessment if present
  if (existing.finalAssessmentId) {
    const origFinal = await assessmentsDb.findOne({ id: existing.finalAssessmentId });
    if (origFinal) {
      const clonedFinal = await assessmentsDb.insert({
        learningPathId: clonedPath.id,
        title: origFinal.title,
        description: origFinal.description,
        type: "path_final",
        durationMinutes: origFinal.durationMinutes,
        passingScore: origFinal.passingScore,
        totalPoints: origFinal.totalPoints,
        questionsCount: origFinal.questionsCount,
        status: origFinal.status,
        createdAt: new Date().toISOString()
      });
      const origFinalQuestions = await questionsDb.find({ assessmentId: origFinal.id });
      for (const q of origFinalQuestions) {
        await questionsDb.insert({
          assessmentId: clonedFinal.id,
          type: q.type,
          questionText: q.questionText,
          options: q.options,
          correctAnswers: q.correctAnswers,
          explanation: q.explanation,
          points: q.points,
          negativePoints: q.negativePoints,
          difficulty: q.difficulty,
          order: q.order
        });
      }
      await learningPathsDb.update(clonedPath.id, { finalAssessmentId: clonedFinal.id });
    }
  }

  res.status(201).json(clonedPath);
});

// 7. Admin: Validation check
app.get("/api/admin/learning-paths/:id/validation", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const path = await learningPathsDb.findOne({ id: req.params.id });
  if (!path) return res.status(404).json({ error: "Learning Path not found" });

  const sections = await learningPathSectionsDb.find({ learningPathId: path.id });
  const items = await learningPathItemsDb.find({ learningPathId: path.id });
  const assessments = await assessmentsDb.find({ learningPathId: path.id });

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!path.title || !path.title.trim()) errors.push("Learning Path title is required");
  if (!path.description || !path.description.trim()) errors.push("Learning Path description is required");
  if (sections.length === 0) errors.push("At least one section is required to publish");
  if (items.length === 0) errors.push("At least one learning item is required across sections");

  for (const sec of sections) {
    const secItems = items.filter(i => i.sectionId === sec.id);
    if (secItems.length === 0) {
      warnings.push(`Section "${sec.title}" has no learning items`);
    }
  }

  if (!path.finalAssessmentId) {
    warnings.push("No Final Assessment configured for this Learning Path");
  }

  res.json({
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      sectionsCount: sections.length,
      itemsCount: items.length,
      assessmentsCount: assessments.length,
      hasFinalAssessment: !!path.finalAssessmentId
    }
  });
});

// 8. Admin: Publish learning path
app.post("/api/admin/learning-paths/:id/publish", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const path = await learningPathsDb.findOne({ id: req.params.id });
  if (!path) return res.status(404).json({ error: "Learning Path not found" });

  const sections = await learningPathSectionsDb.find({ learningPathId: path.id });
  const items = await learningPathItemsDb.find({ learningPathId: path.id });

  const errors: string[] = [];
  if (!path.title?.trim()) errors.push("Title is required");
  if (sections.length === 0) errors.push("At least one section is required");
  if (items.length === 0) errors.push("At least one learning item is required");

  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed before publish", errors });
  }

  const updated = await learningPathsDb.update(path.id, {
    status: "published",
    updatedAt: new Date().toISOString()
  });

  res.json(updated);
});

// 9. Admin: Archive learning path
app.post("/api/admin/learning-paths/:id/archive", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const path = await learningPathsDb.findOne({ id: req.params.id });
  if (!path) return res.status(404).json({ error: "Learning Path not found" });

  const updated = await learningPathsDb.update(path.id, {
    status: "archived",
    updatedAt: new Date().toISOString()
  });

  res.json(updated);
});

// 10. Admin: Section endpoints
app.post("/api/admin/learning-paths/:id/sections", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { title, description } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Section title is required" });
  }

  const existingSections = await learningPathSectionsDb.find({ learningPathId: req.params.id });
  const maxOrder = existingSections.reduce((max, s) => Math.max(max, s.order || 0), 0);

  const section = await learningPathSectionsDb.insert({
    learningPathId: req.params.id,
    title: title.trim(),
    description: description?.trim() || "",
    order: maxOrder + 1,
    createdAt: new Date().toISOString()
  });

  res.status(201).json(section);
});

app.put("/api/admin/learning-path-sections/:id", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const existing = await learningPathSectionsDb.findOne({ id: req.params.id });
  if (!existing) return res.status(404).json({ error: "Section not found" });

  const { title, description } = req.body;
  const updated = await learningPathSectionsDb.update(existing.id, {
    title: title !== undefined ? title.trim() : existing.title,
    description: description !== undefined ? description.trim() : existing.description
  });

  res.json(updated);
});

app.delete("/api/admin/learning-path-sections/:id", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const existing = await learningPathSectionsDb.findOne({ id: req.params.id });
  if (!existing) return res.status(404).json({ error: "Section not found" });

  await learningPathSectionsDb.delete(existing.id);
  res.json({ message: "Section deleted successfully" });
});

app.put("/api/admin/learning-paths/:id/sections/reorder", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { sectionIds } = req.body;
  if (!Array.isArray(sectionIds)) {
    return res.status(400).json({ error: "sectionIds array is required" });
  }

  for (let i = 0; i < sectionIds.length; i++) {
    await learningPathSectionsDb.update(sectionIds[i], { order: i + 1 });
  }

  res.json({ message: "Sections reordered successfully" });
});

// 11. Admin: Learning Path Items endpoints
app.post("/api/admin/learning-path-sections/:sectionId/items", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const section = await learningPathSectionsDb.findOne({ id: req.params.sectionId });
  if (!section) return res.status(404).json({ error: "Section not found" });

  const {
    title,
    description,
    type,
    durationMinutes,
    isRequired,
    content,
    videoSource,
    videoUrl,
    fileUrl,
    fileName,
    assessmentId
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Item title is required" });
  }

  const existingItems = await learningPathItemsDb.find({ sectionId: section.id });
  const maxOrder = existingItems.reduce((max, it) => Math.max(max, it.order || 0), 0);

  const item = await learningPathItemsDb.insert({
    sectionId: section.id,
    learningPathId: section.learningPathId,
    title: title.trim(),
    description: description?.trim() || "",
    type: type || "text",
    order: maxOrder + 1,
    durationMinutes: Number(durationMinutes) || 10,
    isRequired: isRequired !== undefined ? !!isRequired : true,
    content: content || "",
    videoSource: videoSource || null,
    videoUrl: videoUrl || "",
    fileUrl: fileUrl || "",
    fileName: fileName || "",
    assessmentId: assessmentId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  res.status(201).json(item);
});

app.put("/api/admin/learning-path-items/:id", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const existing = await learningPathItemsDb.findOne({ id: req.params.id });
  if (!existing) return res.status(404).json({ error: "Item not found" });

  const {
    title,
    description,
    type,
    durationMinutes,
    isRequired,
    content,
    videoSource,
    videoUrl,
    fileUrl,
    fileName,
    assessmentId
  } = req.body;

  const updated = await learningPathItemsDb.update(existing.id, {
    title: title !== undefined ? title.trim() : existing.title,
    description: description !== undefined ? description.trim() : existing.description,
    type: type || existing.type,
    durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : existing.durationMinutes,
    isRequired: isRequired !== undefined ? !!isRequired : existing.isRequired,
    content: content !== undefined ? content : existing.content,
    videoSource: videoSource !== undefined ? videoSource : existing.videoSource,
    videoUrl: videoUrl !== undefined ? videoUrl : existing.videoUrl,
    fileUrl: fileUrl !== undefined ? fileUrl : existing.fileUrl,
    fileName: fileName !== undefined ? fileName : existing.fileName,
    assessmentId: assessmentId !== undefined ? assessmentId : existing.assessmentId,
    updatedAt: new Date().toISOString()
  });

  res.json(updated);
});

app.delete("/api/admin/learning-path-items/:id", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const existing = await learningPathItemsDb.findOne({ id: req.params.id });
  if (!existing) return res.status(404).json({ error: "Item not found" });

  if (existing.assessmentId) {
    await assessmentsDb.delete(existing.assessmentId);
  }

  await learningPathItemsDb.delete(existing.id);
  res.json({ message: "Item deleted successfully" });
});

app.put("/api/admin/learning-path-sections/:sectionId/items/reorder", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { itemIds } = req.body;
  if (!Array.isArray(itemIds)) {
    return res.status(400).json({ error: "itemIds array is required" });
  }

  for (let i = 0; i < itemIds.length; i++) {
    await learningPathItemsDb.update(itemIds[i], { order: i + 1 });
  }

  res.json({ message: "Items reordered successfully" });
});

// 12. Admin: Practice Assessment & Final Assessment Builders
app.post("/api/admin/learning-path-items/:itemId/assessment", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const item = await learningPathItemsDb.findOne({ id: req.params.itemId });
  if (!item) return res.status(404).json({ error: "Learning Path item not found" });

  const { title, description, durationMinutes, passingScore, questions } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Assessment title is required" });
  }

  const questionsList: any[] = Array.isArray(questions) ? questions : [];
  const totalPoints = questionsList.reduce((sum, q) => sum + (Number(q.points) || 1), 0);

  // If item already had an assessment, delete old one and questions
  if (item.assessmentId) {
    await assessmentsDb.delete(item.assessmentId);
  }

  const assessment = await assessmentsDb.insert({
    learningPathId: item.learningPathId,
    learningPathItemId: item.id,
    type: "path_practice",
    title: title.trim(),
    description: description?.trim() || "",
    durationMinutes: Number(durationMinutes) || 15,
    passingScore: Number(passingScore) || 70,
    totalPoints,
    questionsCount: questionsList.length,
    status: "published",
    createdAt: new Date().toISOString()
  });

  for (let i = 0; i < questionsList.length; i++) {
    const q = questionsList[i];
    await questionsDb.insert({
      assessmentId: assessment.id,
      type: q.type || QuestionType.MCQ_SINGLE,
      questionText: q.questionText || "Question",
      options: q.options || ["Option A", "Option B", "Option C", "Option D"],
      correctAnswers: q.correctAnswers || [q.options?.[0] || "Option A"],
      explanation: q.explanation || "",
      points: Number(q.points) || 1,
      negativePoints: Number(q.negativePoints) || 0,
      difficulty: q.difficulty || "medium",
      order: i + 1
    });
  }

  await learningPathItemsDb.update(item.id, {
    assessmentId: assessment.id,
    type: "assessment"
  });

  const insertedQuestions = await questionsDb.find({ assessmentId: assessment.id });
  res.status(201).json({ ...assessment, questions: insertedQuestions });
});

app.post("/api/admin/learning-paths/:id/final-assessment", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const path = await learningPathsDb.findOne({ id: req.params.id });
  if (!path) return res.status(404).json({ error: "Learning Path not found" });

  const { title, description, durationMinutes, passingScore, questions } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Final Assessment title is required" });
  }

  const questionsList: any[] = Array.isArray(questions) ? questions : [];
  const totalPoints = questionsList.reduce((sum, q) => sum + (Number(q.points) || 1), 0);

  if (path.finalAssessmentId) {
    await assessmentsDb.delete(path.finalAssessmentId);
  }

  const assessment = await assessmentsDb.insert({
    learningPathId: path.id,
    type: "path_final",
    title: title.trim(),
    description: description?.trim() || "",
    durationMinutes: Number(durationMinutes) || 30,
    passingScore: Number(passingScore) || 75,
    totalPoints,
    questionsCount: questionsList.length,
    status: "published",
    createdAt: new Date().toISOString()
  });

  for (let i = 0; i < questionsList.length; i++) {
    const q = questionsList[i];
    await questionsDb.insert({
      assessmentId: assessment.id,
      type: q.type || QuestionType.MCQ_SINGLE,
      questionText: q.questionText || "Question",
      options: q.options || ["Option A", "Option B", "Option C", "Option D"],
      correctAnswers: q.correctAnswers || [q.options?.[0] || "Option A"],
      explanation: q.explanation || "",
      points: Number(q.points) || 1,
      negativePoints: Number(q.negativePoints) || 0,
      difficulty: q.difficulty || "medium",
      order: i + 1
    });
  }

  await learningPathsDb.update(path.id, {
    finalAssessmentId: assessment.id,
    updatedAt: new Date().toISOString()
  });

  const insertedQuestions = await questionsDb.find({ assessmentId: assessment.id });
  res.status(201).json({ ...assessment, questions: insertedQuestions });
});

// 13. Admin: Student Assignments & Metrics
app.get("/api/admin/learning-paths/:id/students", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const path = await learningPathsDb.findOne({ id: req.params.id });
  if (!path) return res.status(404).json({ error: "Learning Path not found" });

  try {
    const roster = await AccessControlService.getLearningPathStudentAccessRoster(path.id);
    res.json(roster);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to load student access roster" });
  }
});

app.post("/api/admin/learning-paths/:id/assign", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const learningPathId = req.params.id;
  const { studentId, studentIds, groupId, dueDate, isMandatory } = req.body;

  try {
    if (groupId) {
      const result = await AccessControlService.assignLearningPathToGroup(learningPathId, groupId, req.user!, {
        dueDate,
        isMandatory
      });
      return res.json({ message: `Learning path assigned to group "${result.groupName}" (${result.assignedCount} students)`, ...result });
    }

    if (Array.isArray(studentIds) && studentIds.length > 0) {
      const result = await AccessControlService.assignLearningPathBulk(learningPathId, studentIds, req.user!, {
        dueDate,
        isMandatory
      });
      return res.json({ message: "Students assigned successfully", assignedCount: result.assignedCount });
    }

    if (studentId) {
      const assignment = await AccessControlService.assignLearningPathToStudent({
        learningPathId,
        studentId,
        assignedBy: req.user!.id,
        assignedByEmail: req.user!.email,
        assignedByRole: req.user!.role,
        dueDate,
        isMandatory,
        source: "individual",
        organizationId: req.user!.organizationId
      });
      return res.status(201).json(assignment);
    }

    return res.status(400).json({ error: "studentId, studentIds, or groupId is required" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/admin/learning-paths/:id/revoke", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const learningPathId = req.params.id;
  const { studentId, studentIds, reason, mode } = req.body;

  try {
    const targetIds = Array.isArray(studentIds) ? studentIds : (studentId ? [studentId] : []);
    if (targetIds.length === 0) {
      return res.status(400).json({ error: "studentId or studentIds array is required" });
    }

    for (const sid of targetIds) {
      if (mode === "direct") {
        await AccessControlService.removeStudentDirectLearningPathAssignment(learningPathId, sid, req.user!);
      } else {
        await AccessControlService.revokeAllStudentLearningPathAccess(learningPathId, sid, req.user!, reason);
      }
    }

    res.json({ 
      message: mode === "direct" ? "Direct assignment removed successfully" : "All access revoked and blocked successfully", 
      revokedCount: targetIds.length 
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/admin/learning-paths/:id/restore", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const learningPathId = req.params.id;
  const { studentId, studentIds } = req.body;

  try {
    const targetIds = Array.isArray(studentIds) ? studentIds : (studentId ? [studentId] : []);
    if (targetIds.length === 0) {
      return res.status(400).json({ error: "studentId or studentIds array is required" });
    }

    for (const sid of targetIds) {
      await AccessControlService.restoreStudentLearningPathAccess(learningPathId, sid, req.user!);
    }

    res.json({ message: "Access restored successfully", restoredCount: targetIds.length });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// STUDENT LEARNING PATH PORTAL APIs
// ==========================================

// 14. Student: List learning paths with assignment & progress status
app.get("/api/student/learning-paths", authenticateToken, async (req, res) => {
  const studentId = req.user!.id;
  const publishedPaths = await learningPathsDb.find({ status: "published" });
  const effectivePaths = await AccessControlService.getStudentEffectiveLearningPaths(studentId);
  const effectiveMap = new Map(effectivePaths.map(p => [p.learningPathId, p]));

  // Active assigned paths for the student
  const activeEffectiveMap = new Map(
    effectivePaths
      .filter(eff => eff.effectiveStatus === "active" && !eff.isDenied)
      .map(eff => [eff.learningPathId, eff])
  );

  // Include all published paths, plus any assigned paths that are in draft/unpublished status
  const allPathIds = new Set<string>([
    ...publishedPaths.map(p => p.id),
    ...Array.from(activeEffectiveMap.keys())
  ]);

  const allSections = await learningPathSectionsDb.find();
  const allItems = await learningPathItemsDb.find();
  const myProgress = await learningPathProgressDb.find({ studentId, completed: true });

  const pathsList: any[] = [];
  for (const pid of allPathIds) {
    const pub = publishedPaths.find(p => p.id === pid);
    if (pub) {
      pathsList.push(pub);
    } else {
      const p = await learningPathsDb.findOne({ id: pid });
      if (p && !p.deletedAt) {
        pathsList.push(p);
      }
    }
  }

  const result = pathsList.map(path => {
    const eff = effectiveMap.get(path.id);
    const pathSections = allSections.filter(s => s.learningPathId === path.id);
    const pathItems = allItems.filter(i => i.learningPathId === path.id);
    const completedItems = myProgress.filter(p => p.learningPathId === path.id);
    const progressPercent = pathItems.length > 0
      ? Math.round((completedItems.length / pathItems.length) * 100)
      : 0;

    const isAssigned = !!eff && eff.effectiveStatus === "active" && !eff.isDenied;
    const isUnpublished = path.status !== "published";
    const isIncomplete = pathSections.length === 0 || pathItems.length === 0;

    return {
      id: path.id,
      title: path.title,
      slug: path.slug,
      shortDescription: path.shortDescription,
      description: path.description,
      category: path.category,
      difficulty: path.difficulty,
      thumbnail: path.thumbnail,
      estimatedDuration: path.estimatedDuration,
      status: path.status,
      isAssigned,
      isUnpublished,
      isIncomplete,
      isDenied: eff ? eff.isDenied : false,
      assignmentSource: eff ? eff.assignmentSource : null,
      sourceDetails: eff ? eff.sourceDetails : null,
      assignedAt: eff?.assignedAt || null,
      dueDate: eff?.dueDate || null,
      completedAt: eff?.status === "completed" ? eff.assignedAt : null,
      sectionsCount: pathSections.length,
      itemsCount: pathItems.length,
      progressPercent
    };
  });

  res.json(result);
});

// 15. Student: Get assigned learning path details & player tree (STRICT 403 ACCESS CONTROL)
app.get("/api/student/learning-paths/:id", authenticateToken, async (req, res) => {
  const studentId = req.user!.id;
  const path = await learningPathsDb.findOne({ id: req.params.id });
  if (!path) return res.status(404).json({ error: "Learning Path not found" });

  // STRICT ACCESS RULE: Student must have active assignment (not revoked, not expired)
  if (req.user!.role === UserRole.STUDENT) {
    const access = await AccessControlService.checkLearningPathAccess(studentId, path.id, req.user!.organizationId);
    if (!access.allowed) {
      return res.status(access.status).json({ 
        error: access.error || "Access denied.",
        restricted: true,
        isUnpublished: !!access.isUnpublished,
        learningPathTitle: path.title,
        status: path.status
      });
    }
  }

  const allSections = await learningPathSectionsDb.find({ learningPathId: path.id });
  const sections = allSections.sort((a, b) => a.order - b.order);

  const allItems = await learningPathItemsDb.find({ learningPathId: path.id });
  const items = allItems.sort((a, b) => a.order - b.order);

  const studentProgress = await learningPathProgressDb.find({ learningPathId: path.id, studentId });
  const completedItemIds = new Set(studentProgress.filter(p => p.completed).map(p => p.itemId));

  const allAssessments = await assessmentsDb.find({ learningPathId: path.id });
  const allQuestions = await questionsDb.find();

  // Strip correctAnswers for student safety
  const safeAssessments = allAssessments.map(ass => {
    const qList = allQuestions
      .filter(q => q.assessmentId === ass.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(q => {
        const { correctAnswers: _, ...safeQ } = q;
        return safeQ;
      });
    return { ...ass, questions: qList };
  });

  // Linear progression logic across all items in sequence
  // Flatten items by section order then item order
  const flatItems: any[] = [];
  for (const sec of sections) {
    const secItems = items.filter(it => it.sectionId === sec.id);
    for (const it of secItems) {
      flatItems.push(it);
    }
  }

  let foundCurrent = false;
  const itemStatusMap: Record<string, "completed" | "current" | "locked"> = {};

  for (let idx = 0; idx < flatItems.length; idx++) {
    const it = flatItems[idx];
    if (completedItemIds.has(it.id)) {
      itemStatusMap[it.id] = "completed";
    } else if (!foundCurrent) {
      itemStatusMap[it.id] = "current";
      foundCurrent = true;
    } else {
      itemStatusMap[it.id] = "locked";
    }
  }

  // If all items completed, nothing is current
  const enrichedSections = sections.map(section => {
    const secItems = items
      .filter(it => it.sectionId === section.id)
      .map(it => {
        const itemAss = safeAssessments.find(a => a.id === it.assessmentId || a.learningPathItemId === it.id);
        return {
          ...it,
          status: itemStatusMap[it.id] || "locked",
          assessment: itemAss || null
        };
      });

    return {
      ...section,
      items: secItems
    };
  });

  // Final assessment status
  let finalAssessment: any = null;
  let finalAssessmentStatus: "completed" | "unlocked" | "locked" = "locked";
  if (path.finalAssessmentId) {
    const rawFinal = safeAssessments.find(a => a.id === path.finalAssessmentId);
    if (rawFinal) {
      const finalSub = await submissionsDb.findOne({ assessmentId: rawFinal.id, studentId, passed: true });
      const reqItems = items.filter(it => it.isRequired !== false);
      const allReqDone = reqItems.every(it => completedItemIds.has(it.id));

      if (finalSub) {
        finalAssessmentStatus = "completed";
      } else if (allReqDone) {
        finalAssessmentStatus = "unlocked";
      } else {
        finalAssessmentStatus = "locked";
      }

      finalAssessment = {
        ...rawFinal,
        status: finalAssessmentStatus,
        lastScore: finalSub?.score ?? null
      };
    }
  }

  const progressPercent = items.length > 0 
    ? Math.round((completedItemIds.size / items.length) * 100) 
    : 0;

  res.json({
    ...path,
    sections: enrichedSections,
    finalAssessment,
    progressPercent,
    completedItemsCount: completedItemIds.size,
    totalItemsCount: items.length
  });
});

// 16. Student: Track progress / complete learning item
app.post("/api/student/learning-path-items/:id/progress", authenticateToken, async (req, res) => {
  const studentId = req.user!.id;
  const item = await learningPathItemsDb.findOne({ id: req.params.id });
  if (!item) return res.status(404).json({ error: "Item not found" });

  // STRICT ACCESS RULE
  const access = await AccessControlService.checkLearningPathAccess(studentId, item.learningPathId, req.user!.organizationId);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.error || "Access denied. You are not assigned to this Learning Path." });
  }

  const { completed, timeSpentSeconds } = req.body;
  const isCompleted = completed !== undefined ? !!completed : true;

  const existing = await learningPathProgressDb.findOne({ studentId, itemId: item.id });
  let progressRecord: any;

  if (existing) {
    progressRecord = await learningPathProgressDb.update(existing.id, {
      completed: isCompleted,
      completedAt: isCompleted ? new Date().toISOString() : null,
      timeSpentSeconds: (existing.timeSpentSeconds || 0) + (Number(timeSpentSeconds) || 0)
    });
  } else {
    progressRecord = await learningPathProgressDb.insert({
      learningPathId: item.learningPathId,
      studentId,
      itemId: item.id,
      completed: isCompleted,
      completedAt: isCompleted ? new Date().toISOString() : null,
      timeSpentSeconds: Number(timeSpentSeconds) || 0
    });
  }

  // Check if all items & final assessment are complete
  const allItems = await learningPathItemsDb.find({ learningPathId: item.learningPathId });
  const reqItems = allItems.filter(it => it.isRequired !== false);
  const myProgress = await learningPathProgressDb.find({ learningPathId: item.learningPathId, studentId, completed: true });
  const completedIds = new Set(myProgress.map(p => p.itemId));
  const allReqDone = reqItems.every(it => completedIds.has(it.id));

  const path = await learningPathsDb.findOne({ id: item.learningPathId });
  let finalAssDone = true;
  if (path && path.finalAssessmentId) {
    const finalSub = await submissionsDb.findOne({ assessmentId: path.finalAssessmentId, studentId, passed: true });
    finalAssDone = !!finalSub;
  }

  const pathCompleted = allReqDone && finalAssDone;
  const lpAssignment = access.assignment;
  if (pathCompleted && lpAssignment && !lpAssignment.completedAt) {
    await learningPathAssignmentsDb.update(lpAssignment.id, {
      completedAt: new Date().toISOString()
    });
    GamificationService.awardPointsForEvent({
      organizationId: req.user!.organizationId || "org-default",
      studentId,
      eventType: "learning_path_completed",
      eventReferenceId: item.learningPathId,
      description: `Completed learning path: ${path?.title || item.learningPathId}`
    }).catch(gErr => console.warn("[Gamification] Error awarding learning path points:", gErr));
  }

  res.json({
    progress: progressRecord,
    isPathCompleted: pathCompleted,
    progressPercent: allItems.length > 0 ? Math.round((completedIds.size / allItems.length) * 100) : 100
  });
});



app.get("/api/courses", async (req, res) => {
  const publishedCourses = await coursesDb.find({ status: "published" });
  res.json(publishedCourses);
});

app.get("/api/courses/:id", authenticateToken, async (req, res) => {
  const access = await CourseService.checkCourseAccess(req.user!, req.params.id);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.message });
  }

  const course = access.course!;
  const isStudent = req.user!.role === UserRole.STUDENT;

  const allModules = await modulesDb.find({ courseId: course.id });
  const modules = allModules
    .filter(m => !isStudent || (m.status || "published") === "published")
    .sort((a, b) => a.order - b.order);

  const publishedModuleIds = new Set(modules.map(m => m.id));

  const allLessons = await lessonsDb.find({ courseId: course.id });
  const lessons = allLessons
    .filter(l => publishedModuleIds.has(l.moduleId) && (!isStudent || (l.status || "published") === "published"))
    .sort((a, b) => a.order - b.order);

  const allAssessments = await assessmentsDb.find({ courseId: course.id });
  const finalAssessment = allAssessments.find(a => !a.lessonId || a.type === "course_final") || null;

  // Attach practice tests to lessons
  const lessonsWithPractice = lessons.map(lesson => {
    const practiceTest = allAssessments.find(a => a.lessonId === lesson.id || (a.type === "lesson_practice" && a.lessonId === lesson.id));
    return {
      ...lesson,
      practiceTest: practiceTest ? {
        id: practiceTest.id,
        title: practiceTest.title,
        description: practiceTest.description,
        durationMinutes: practiceTest.durationMinutes,
        passingScore: practiceTest.passingScore,
        totalPoints: practiceTest.totalPoints,
        questionsCount: practiceTest.questionsCount,
        status: practiceTest.status
      } : null
    };
  });

  const reviews = await reviewsDb.find({ courseId: course.id });

  res.json({
    course,
    modules,
    lessons: lessonsWithPractice,
    reviews,
    finalAssessment: finalAssessment ? {
      id: finalAssessment.id,
      title: finalAssessment.title,
      description: finalAssessment.description,
      durationMinutes: finalAssessment.durationMinutes,
      passingScore: finalAssessment.passingScore,
      totalPoints: finalAssessment.totalPoints,
      questionsCount: finalAssessment.questionsCount,
      status: finalAssessment.status
    } : null,
    enrollment: access.enrollment || null
  });
});

app.post("/api/courses/:id/reviews", authenticateToken, async (req, res) => {
  const { rating, comment } = req.body;
  const courseId = req.params.id;

  if (!rating || !comment) {
    return res.status(400).json({ error: "Rating and comment are required" });
  }

  const numericRating = Math.min(5, Math.max(1, Math.round(Number(rating))));
  if (isNaN(numericRating)) {
    return res.status(400).json({ error: "Rating must be a valid number between 1 and 5" });
  }

  const user = await usersDb.findOne({ id: req.user!.id });
  if (!user) return res.status(404).json({ error: "User not found" });

  const existingReview = await reviewsDb.findOne({ courseId, studentId: user.id });
  if (existingReview) {
    return res.status(400).json({ error: "You have already reviewed this course" });
  }

  const review = await reviewsDb.insert({
    courseId,
    studentId: user.id,
    studentName: user.name,
    rating: numericRating,
    comment: String(comment).slice(0, 2000),
    createdAt: new Date().toISOString()
  });

  // Re-calculate average rating
  const reviews = await reviewsDb.find({ courseId });
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  await coursesDb.update(courseId, {
    rating: Number(avg.toFixed(1)),
    reviewsCount: reviews.length
  });

  res.status(201).json(review);
});


// Helper: Deterministic PRNG and Fisher-Yates shuffle for reproducible student assessment randomization
function seededRandom(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(array: T[], seedStr: string): T[] {
  const rng = seededRandom(seedStr);
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ==========================================
// 6. ASSESSMENT & CODING GRADING ENGINE
// ==========================================

app.get("/api/assessments/:id", authenticateToken, async (req, res) => {
  const assessment = await assessmentsDb.findOne({ id: req.params.id });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  if (req.user!.role === UserRole.STUDENT) {
    if (assessment.status !== "published") {
      return res.status(403).json({ error: "Assessment is not published." });
    }
    const accessCheck = await AccessControlService.checkAssessmentAccess(req.user!.id, assessment.id, req.user!.organizationId);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.status).json({ error: accessCheck.error });
    }
  }

  const questions = await questionsDb.find({ assessmentId: assessment.id });
  questions.sort((a, b) => (a.order || 0) - (b.order || 0));

  let userAttemptsCount = 0;
  let activeAttempt: any = null;

  if (req.user!.role === UserRole.STUDENT) {
    const studentId = req.user!.id;
    const now = Date.now();
    const allAttempts = await assessmentAttemptsDb.find({ assessmentId: assessment.id, studentId });
    const inProg = allAttempts.find(a => a.status === "in_progress");
    if (inProg) {
      const expiresMs = new Date(inProg.expiresAt).getTime();
      if (now > expiresMs + 15000) {
        await assessmentAttemptsDb.update(inProg.id, {
          status: "timed_out",
          timeTakenSeconds: (assessment.durationMinutes || 15) * 60,
          updatedAt: new Date().toISOString()
        });
      } else {
        activeAttempt = {
          id: inProg.id,
          attemptNumber: inProg.attemptNumber,
          startedAt: inProg.startedAt,
          expiresAt: inProg.expiresAt,
          secondsRemaining: Math.max(0, Math.floor((expiresMs - now) / 1000)),
          answers: inProg.answers || {},
          proctoringEvents: inProg.proctoringEvents || []
        };
      }
    }
    const completedAttempts = allAttempts.filter(a => a.status === "submitted" || a.status === "timed_out");
    userAttemptsCount = completedAttempts.length;
  }

  let finalQuestions: any[] = questions;
  const canSeeAnswerKeys = isPlatformAdmin(req.user!.role);
  if (!canSeeAnswerKeys) {
    const rawAss = assessment as any;
    const shouldRandomizeQuestions = Boolean(
      rawAss.randomizeQuestions &&
      rawAss.randomizeQuestions !== 0 &&
      rawAss.randomizeQuestions !== "0" &&
      rawAss.randomizeQuestions !== "false"
    );
    const shouldRandomizeOptions = Boolean(
      rawAss.randomizeOptions &&
      rawAss.randomizeOptions !== 0 &&
      rawAss.randomizeOptions !== "0" &&
      rawAss.randomizeOptions !== "false"
    );

    const attemptNum = activeAttempt ? activeAttempt.attemptNumber : userAttemptsCount + 1;

    if (req.user!.role === UserRole.STUDENT && shouldRandomizeQuestions) {
      finalQuestions = seededShuffle(finalQuestions, `${req.user!.id}-${assessment.id}-attempt-${attemptNum}`);
    }

    finalQuestions = finalQuestions.map(q => {
      let options = q.options;
      if (req.user!.role === UserRole.STUDENT && shouldRandomizeOptions && Array.isArray(options) && options.length > 1) {
        options = seededShuffle(options, `${req.user!.id}-${q.id}-attempt-${attemptNum}`);
      }
      const { correctAnswers: _, explanation: __, ...rest } = q;
      const rawText = q.questionText || "";
      const cleanedQuestionText = rawText.replace(/\s*\(\d{10,14}\)$/, "").trim();
      return { ...rest, questionText: cleanedQuestionText, options };
    });
  }

  res.json({
    assessment,
    questions: finalQuestions,
    userAttemptsCount,
    activeAttempt
  });
});

app.post("/api/assessments/:id/start", authenticateToken, async (req, res) => {
  const assessment = await assessmentsDb.findOne({ id: req.params.id });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  if (req.user!.role === UserRole.STUDENT) {
    if (assessment.status !== "published") {
      return res.status(403).json({ error: "Assessment is not published." });
    }
    const accessCheck = await AccessControlService.checkAssessmentAccess(req.user!.id, assessment.id, req.user!.organizationId);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.status).json({ error: accessCheck.error });
    }
  }

  const studentId = req.user!.id;
  const now = Date.now();
  const allAttempts = await assessmentAttemptsDb.find({ assessmentId: assessment.id, studentId });
  
  // Check for existing in_progress attempt
  const inProg = allAttempts.find(a => a.status === "in_progress");
  if (inProg) {
    const expiresMs = new Date(inProg.expiresAt).getTime();
    if (now > expiresMs + 15000) {
      await assessmentAttemptsDb.update(inProg.id, {
        status: "timed_out",
        timeTakenSeconds: (assessment.durationMinutes || 15) * 60,
        updatedAt: new Date().toISOString()
      });
    } else {
      // Resume active attempt
      const questions = await questionsDb.find({ assessmentId: assessment.id });
      questions.sort((a, b) => (a.order || 0) - (b.order || 0));

      let finalQuestions: any[] = questions;
      const rawAss = assessment as any;
      const shouldRandomizeQuestions = Boolean(
        rawAss.randomizeQuestions &&
        rawAss.randomizeQuestions !== 0 &&
        rawAss.randomizeQuestions !== "0" &&
        rawAss.randomizeQuestions !== "false"
      );
      const shouldRandomizeOptions = Boolean(
        rawAss.randomizeOptions &&
        rawAss.randomizeOptions !== 0 &&
        rawAss.randomizeOptions !== "0" &&
        rawAss.randomizeOptions !== "false"
      );

      if (shouldRandomizeQuestions) {
        finalQuestions = seededShuffle(finalQuestions, `${studentId}-${assessment.id}-attempt-${inProg.attemptNumber}`);
      }

      finalQuestions = finalQuestions.map(q => {
        let options = q.options;
        if (shouldRandomizeOptions && Array.isArray(options) && options.length > 1) {
          options = seededShuffle(options, `${studentId}-${q.id}-attempt-${inProg.attemptNumber}`);
        }
        const { correctAnswers: _, explanation: __, ...rest } = q;
        const rawText = q.questionText || "";
        const cleanedQuestionText = rawText.replace(/\s*\(\d{10,14}\)$/, "").trim();
        return { ...rest, questionText: cleanedQuestionText, options };
      });

      return res.json({
        resumed: true,
        attempt: inProg,
        secondsRemaining: Math.max(0, Math.floor((expiresMs - now) / 1000)),
        questions: finalQuestions,
        answers: inProg.answers || {},
        proctoringEvents: inProg.proctoringEvents || []
      });
    }
  }

  // Count completed attempts
  const completedAttempts = allAttempts.filter(a => a.status === "submitted" || a.status === "timed_out");
  const completedCount = completedAttempts.length;

  if (assessment.maxAttempts && assessment.maxAttempts > 0) {
    if (completedCount >= assessment.maxAttempts) {
      return res.status(400).json({ error: `Maximum attempts (${assessment.maxAttempts}) reached for this assessment.` });
    }
  }

  const attemptNumber = completedCount + 1;
  const startedAt = new Date().toISOString();
  const durationMinutes = Number(assessment.durationMinutes) > 0 ? Number(assessment.durationMinutes) : 15;
  const expiresAt = new Date(now + durationMinutes * 60 * 1000).toISOString();

  const questions = await questionsDb.find({ assessmentId: assessment.id });
  questions.sort((a, b) => (a.order || 0) - (b.order || 0));

  let finalQuestions: any[] = questions;
  const rawAss = assessment as any;
  const shouldRandomizeQuestions = Boolean(
    rawAss.randomizeQuestions &&
    rawAss.randomizeQuestions !== 0 &&
    rawAss.randomizeQuestions !== "0" &&
    rawAss.randomizeQuestions !== "false"
  );
  const shouldRandomizeOptions = Boolean(
    rawAss.randomizeOptions &&
    rawAss.randomizeOptions !== 0 &&
    rawAss.randomizeOptions !== "0" &&
    rawAss.randomizeOptions !== "false"
  );

  if (shouldRandomizeQuestions) {
    finalQuestions = seededShuffle(finalQuestions, `${studentId}-${assessment.id}-attempt-${attemptNumber}`);
  }

  const questionOrder = finalQuestions.map(q => q.id);

  finalQuestions = finalQuestions.map(q => {
    let options = q.options;
    if (shouldRandomizeOptions && Array.isArray(options) && options.length > 1) {
      options = seededShuffle(options, `${studentId}-${q.id}-attempt-${attemptNumber}`);
    }
    const { correctAnswers: _, explanation: __, ...rest } = q;
    const rawText = q.questionText || "";
    const cleanedQuestionText = rawText.replace(/\s*\(\d{10,14}\)$/, "").trim();
    return { ...rest, questionText: cleanedQuestionText, options };
  });

  const newAttempt = await assessmentAttemptsDb.insert({
    organizationId: req.user!.organizationId || "org-default",
    assessmentId: assessment.id,
    studentId,
    attemptNumber,
    startedAt,
    expiresAt,
    status: "in_progress",
    questionOrder,
    answers: {},
    proctoringEvents: [],
    timeTakenSeconds: 0,
    createdAt: startedAt,
    updatedAt: startedAt
  });

  // Update standalone assignment status to in_progress if currently assigned
  const standaloneAssignment = await assessmentAssignmentsDb.findOne({ studentId, assessmentId: assessment.id });
  if (standaloneAssignment && (standaloneAssignment.status === "assigned" || standaloneAssignment.status === "not_started")) {
    await assessmentAssignmentsDb.update(standaloneAssignment.id, {
      status: "in_progress",
      updatedAt: startedAt
    });
  }

  res.status(201).json({
    resumed: false,
    attempt: newAttempt,
    secondsRemaining: durationMinutes * 60,
    questions: finalQuestions
  });
});

app.post("/api/assessments/:id/submit", authenticateToken, async (req, res) => {
  const studentId = req.user!.id;
  const studentUser = await usersDb.findOne({ id: studentId });
  if (!studentUser) return res.status(404).json({ error: "Student not found" });
  const studentName = studentUser.name;
  
  const { id } = req.params;
  const rawAnswers = req.body?.answers;
  const answers: Record<string, string[]> = (typeof rawAnswers === "object" && rawAnswers !== null && !Array.isArray(rawAnswers)) ? rawAnswers : {};
  const requestedAttemptId = req.body?.attemptId;

  const assessment = await assessmentsDb.findOne({ id });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  if (assessment.status !== "published" && req.user!.role === UserRole.STUDENT) {
    return res.status(403).json({ error: "Assessment is not currently published for submissions." });
  }

  if (req.user!.role === UserRole.STUDENT) {
    const accessCheck = await AccessControlService.checkAssessmentAccess(studentId, assessment.id, req.user!.organizationId);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.status).json({ error: accessCheck.error });
    }
  }

  // Find or resolve the attempt
  let attempt: any = null;
  if (requestedAttemptId) {
    attempt = await assessmentAttemptsDb.findOne({ id: requestedAttemptId });
    if (attempt && attempt.studentId !== studentId) {
      return res.status(403).json({ error: "Access denied: you cannot submit an attempt belonging to another student." });
    }
    if (!attempt || attempt.assessmentId !== id) {
      return res.status(400).json({ error: "Invalid attempt specified." });
    }
  } else {
    // Look for active in_progress attempt
    const activeAttempts = await assessmentAttemptsDb.find({ assessmentId: id, studentId, status: "in_progress" });
    if (activeAttempts.length > 0) {
      attempt = activeAttempts[0];
    }
  }

  if (attempt) {
    if (attempt.status === "submitted") {
      return res.status(400).json({ error: "This attempt has already been submitted. Duplicate submission rejected." });
    }
  } else {
    // If no attempt record exists yet, check max attempts
    if (req.user!.role === UserRole.STUDENT && assessment.maxAttempts && assessment.maxAttempts > 0) {
      const priorSubmissions = await submissionsDb.find({ assessmentId: id, studentId });
      if (priorSubmissions.length >= assessment.maxAttempts) {
        return res.status(400).json({ error: `Maximum attempts (${assessment.maxAttempts}) reached for this assessment.` });
      }
    }
  }

  const now = Date.now();
  const submittedAt = new Date().toISOString();

  // Server-side timer calculation
  let isTimedOut = false;
  let serverTimeTakenSeconds = 0;
  const durationSeconds = (Number(assessment.durationMinutes) || 15) * 60;

  if (attempt && attempt.startedAt && attempt.expiresAt) {
    const expiresMs = new Date(attempt.expiresAt).getTime();
    const startedMs = new Date(attempt.startedAt).getTime();
    const gracePeriodMs = 15000; // 15s grace for network latency

    if (now > expiresMs + gracePeriodMs) {
      isTimedOut = true;
      serverTimeTakenSeconds = durationSeconds;
    } else {
      serverTimeTakenSeconds = Math.max(1, Math.min(durationSeconds, Math.round((now - startedMs) / 1000)));
    }
  } else {
    const clientTime = Number(req.body?.timeTakenSeconds);
    serverTimeTakenSeconds = (!isNaN(clientTime) && clientTime > 0) ? Math.min(clientTime, durationSeconds) : Math.min(60, durationSeconds);
  }

  const attemptStatus = isTimedOut ? "timed_out" : "submitted";

  // Server-side scoring calculation
  const questions = await questionsDb.find({ assessmentId: id });
  questions.sort((a, b) => (a.order || 0) - (b.order || 0));

  let earnedScore = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  questions.forEach(q => {
    const rawStudentAns = answers[q.id];
    const studentAnswer = Array.isArray(rawStudentAns) 
      ? rawStudentAns.filter(v => v !== null && v !== undefined && String(v).trim() !== "") 
      : [];
    const correctOnes = Array.isArray(q.correctAnswers) ? q.correctAnswers : [];

    if (studentAnswer.length === 0) {
      unansweredCount++;
    } else {
      const isCorrect = studentAnswer.length === correctOnes.length && 
                        studentAnswer.every(val => correctOnes.includes(val));

      if (isCorrect) {
        earnedScore += q.points;
        correctCount++;
      } else {
        incorrectCount++;
        if (q.negativePoints && q.negativePoints > 0) {
          earnedScore -= q.negativePoints;
        }
      }
    }
  });

  earnedScore = Math.max(0, earnedScore);
  const percentage = assessment.totalPoints > 0 
    ? Number(((earnedScore / assessment.totalPoints) * 100).toFixed(2)) 
    : 0;

  const passingThreshold = (assessment.passingScore <= 100 && assessment.totalPoints > 0)
    ? (assessment.totalPoints * assessment.passingScore) / 100
    : assessment.passingScore;
  const passed = earnedScore >= passingThreshold;

  const priorSubs = await submissionsDb.find({ assessmentId: id, studentId });
  const attemptNumber = attempt?.attemptNumber || priorSubs.length + 1;

  if (attempt) {
    await assessmentAttemptsDb.update(attempt.id, {
      status: attemptStatus,
      submittedAt,
      timeTakenSeconds: serverTimeTakenSeconds,
      answers,
      score: earnedScore,
      totalPoints: assessment.totalPoints,
      percentage,
      passed,
      correctCount,
      incorrectCount,
      unansweredCount,
      updatedAt: submittedAt
    });
  } else {
    attempt = await assessmentAttemptsDb.insert({
      organizationId: req.user!.organizationId || "org-default",
      assessmentId: id,
      studentId,
      attemptNumber,
      startedAt: new Date(now - serverTimeTakenSeconds * 1000).toISOString(),
      expiresAt: new Date(now + 60000).toISOString(),
      submittedAt,
      timeTakenSeconds: serverTimeTakenSeconds,
      status: attemptStatus,
      answers,
      score: earnedScore,
      totalPoints: assessment.totalPoints,
      percentage,
      passed,
      correctCount,
      incorrectCount,
      unansweredCount,
      createdAt: submittedAt,
      updatedAt: submittedAt
    });
  }

  const submission = await submissionsDb.insert({
    organizationId: req.user!.organizationId || "org-default",
    assessmentId: id,
    studentId,
    studentName,
    attemptId: attempt.id,
    attemptNumber,
    answers,
    score: earnedScore,
    totalPoints: assessment.totalPoints,
    passed,
    submittedAt,
    timeTakenSeconds: serverTimeTakenSeconds,
    correctCount,
    incorrectCount,
    unansweredCount,
    percentage
  });

  // In-app & email notification trigger for assessment result
  NotificationService.notifyAssessmentResult(
    studentId,
    assessment,
    {
      id: submission.id,
      score: earnedScore,
      totalPoints: assessment.totalPoints,
      percentage,
      passed
    },
    req.user!.organizationId || "org-default"
  ).catch(err => console.error("[Notification] Failed to notify assessment result:", err));

  // Gamification Integration: Award points if assessment passed
  if (passed) {
    GamificationService.awardPointsForEvent({
      organizationId: req.user!.organizationId || "org-default",
      studentId,
      eventType: "assessment_passed",
      eventReferenceId: `${id}:${attempt.id}`,
      description: `Passed assessment: ${assessment.title}`
    }).catch(err => console.warn("[Gamification] Assessment points award failed:", err));
  }

  // If standalone assessment assigned to student, update assignment status
  const standaloneAssignment = await assessmentAssignmentsDb.findOne({ studentId, assessmentId: id });
  if (standaloneAssignment) {
    await assessmentAssignmentsDb.update(standaloneAssignment.id, {
      status: "completed",
      updatedAt: submittedAt
    });
  }

  // If attached to a lesson and passed, complete the lesson automatically
  let targetLessonId = assessment.lessonId;
  if (!targetLessonId) {
    const parentLesson = await lessonsDb.findOne({ assessmentId: id });
    if (parentLesson) targetLessonId = parentLesson.id;
  }
  if (passed && targetLessonId) {
    await CourseService.recordLessonProgress(studentId, targetLessonId, {
      progressPercent: 100,
      completed: true,
      isAssessmentPassed: true
    }).catch(err => console.error("[CourseService] Lesson progress auto-update failed on assessment pass:", err));
  }

  // If attached to a course (e.g. course_final or practice test in a course), re-evaluate course completion
  if (assessment.courseId) {
    await CourseService.evaluateCourseCompletion(studentId, assessment.courseId)
      .catch(err => console.error("[CourseService] Course completion re-eval failed on assessment submit:", err));
  }

  // If learning path assessment and student passed, update learning path progress
  if (assessment.learningPathId && passed) {
    if (assessment.learningPathItemId) {
      const existingProg = await learningPathProgressDb.findOne({ studentId, itemId: assessment.learningPathItemId });
      if (existingProg) {
        await learningPathProgressDb.update(existingProg.id, {
          completed: true,
          completedAt: submittedAt
        });
      } else {
        await learningPathProgressDb.insert({
          learningPathId: assessment.learningPathId,
          studentId,
          itemId: assessment.learningPathItemId,
          completed: true,
          completedAt: submittedAt,
          timeSpentSeconds: serverTimeTakenSeconds
        });
      }
    }
    const allItems = await learningPathItemsDb.find({ learningPathId: assessment.learningPathId });
    const reqItems = allItems.filter(it => it.isRequired !== false);
    const studentProgs = await learningPathProgressDb.find({ learningPathId: assessment.learningPathId, studentId, completed: true });
    const completedItemIds = new Set(studentProgs.map(p => p.itemId));
    const allReqItemsDone = reqItems.every(it => completedItemIds.has(it.id));
    
    const path = await learningPathsDb.findOne({ id: assessment.learningPathId });
    let finalAssDone = true;
    if (path && path.finalAssessmentId) {
      if (assessment.id === path.finalAssessmentId) {
        finalAssDone = passed;
      } else {
        const finalSub = await submissionsDb.findOne({ assessmentId: path.finalAssessmentId, studentId, passed: true });
        finalAssDone = !!finalSub;
      }
    }

    if (allReqItemsDone && finalAssDone) {
      const assign = await learningPathAssignmentsDb.findOne({ learningPathId: assessment.learningPathId, studentId });
      if (assign && !assign.completedAt) {
        await learningPathAssignmentsDb.update(assign.id, { completedAt: submittedAt });
        GamificationService.awardPointsForEvent({
          organizationId: req.user!.organizationId || "org-default",
          studentId,
          eventType: "learning_path_completed",
          eventReferenceId: assessment.learningPathId,
          description: `Completed learning path: ${path?.title || assessment.learningPathId}`
        }).catch(err => console.warn("[Gamification] Learning path points award failed:", err));
      }
    }
  }

  const showExplanations = assessment.revealAnswers !== false || req.user!.role !== UserRole.STUDENT;
  res.json({
    submission,
    attempt: {
      id: attempt.id,
      attemptNumber,
      status: attemptStatus,
      timeTakenSeconds: serverTimeTakenSeconds
    },
    score: earnedScore,
    totalPoints: assessment.totalPoints,
    percentage,
    correctCount,
    incorrectCount,
    unansweredCount,
    passed,
    status: attemptStatus,
    isTimedOut,
    questions: showExplanations ? questions : undefined
  });
});

// Save progressive answers during active assessment
app.post("/api/assessments/:id/save-answers", authenticateToken, async (req, res) => {
  const studentId = req.user!.id;
  const { id } = req.params;
  const { attemptId, answers } = req.body;

  if (!attemptId || typeof answers !== "object") {
    return res.status(400).json({ error: "Invalid attemptId or answers payload" });
  }

  const attempt = await assessmentAttemptsDb.findOne({ id: attemptId });
  if (!attempt || attempt.assessmentId !== id || attempt.studentId !== studentId) {
    return res.status(403).json({ error: "Attempt not found or access denied" });
  }

  if (attempt.status !== "in_progress") {
    return res.status(400).json({ error: "Cannot save answers for an attempt that is not in progress" });
  }

  const now = Date.now();
  const expiresMs = new Date(attempt.expiresAt).getTime();
  if (now > expiresMs + 15000) {
    await assessmentAttemptsDb.update(attempt.id, {
      status: "timed_out",
      updatedAt: new Date().toISOString()
    });
    return res.status(400).json({ error: "Exam session has expired" });
  }

  await assessmentAttemptsDb.update(attempt.id, {
    answers,
    updatedAt: new Date().toISOString()
  });

  return res.json({ success: true, savedAt: new Date().toISOString() });
});

// Record proctoring events during active assessment
app.post("/api/assessments/:id/proctoring-event", authenticateToken, async (req, res) => {
  const studentId = req.user!.id;
  const { id } = req.params;
  const { attemptId, eventType, details, timestamp, severity } = req.body;

  if (!attemptId || !eventType) {
    return res.status(400).json({ error: "Missing attemptId or eventType" });
  }

  const attempt = await assessmentAttemptsDb.findOne({ id: attemptId });
  if (!attempt || attempt.assessmentId !== id || attempt.studentId !== studentId) {
    return res.status(403).json({ error: "Attempt not found or access denied" });
  }

  const currentEvents = Array.isArray(attempt.proctoringEvents) ? [...attempt.proctoringEvents] : [];
  const newEvent: any = {
    attemptId,
    eventType,
    details: details || `Proctoring event: ${eventType}`,
    timestamp: timestamp || new Date().toISOString(),
    severity: severity || "warning"
  };
  currentEvents.push(newEvent);

  await assessmentAttemptsDb.update(attempt.id, {
    proctoringEvents: currentEvents,
    updatedAt: new Date().toISOString()
  });

  return res.json({ success: true, count: currentEvents.length });
});

// Student: Get their own result/submission for an assessment
app.get("/api/student/assessments/:id/result", authenticateToken, async (req, res) => {
  const studentId = req.user!.id;
  const { id } = req.params;

  const assessment = await assessmentsDb.findOne({ id });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  const submissions = await submissionsDb.find({ assessmentId: id, studentId });
  if (submissions.length === 0) {
    return res.status(404).json({ error: "No submission found for this assessment." });
  }

  // Sort by submittedAt descending to get latest
  submissions.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  const latestSubmission = submissions[0];

  const questions = await questionsDb.find({ assessmentId: id });
  questions.sort((a, b) => (a.order || 0) - (b.order || 0));

  const allAttempts = await assessmentAttemptsDb.find({ assessmentId: id, studentId });
  allAttempts.sort((a, b) => (b.attemptNumber || 0) - (a.attemptNumber || 0));

  const showAnswers = assessment.revealAnswers !== false || req.user!.role !== UserRole.STUDENT;

  res.json({
    assessment,
    submission: latestSubmission,
    allSubmissions: submissions,
    attemptHistory: allAttempts,
    questions: showAnswers ? questions : undefined
  });
});

// Admin: Global Assessment Results & Analytics endpoint
app.get("/api/admin/results", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { assessmentId, category, status, search } = req.query as Record<string, string>;

  const allAssessments = await assessmentsDb.find();
  const assessmentMap = new Map(allAssessments.map(a => [a.id, a]));

  const allUsers = await usersDb.find();
  const userMap = new Map(allUsers.map(u => [u.id, u]));

  const allAssignments = await assessmentAssignmentsDb.find();
  const allSubmissions = await submissionsDb.find();

  // Build unified result rows
  const rows: any[] = [];
  const submittedKeySet = new Set<string>(); // "assessmentId:studentId"

  for (const s of allSubmissions) {
    const assessment = assessmentMap.get(s.assessmentId);
    const student = userMap.get(s.studentId);
    submittedKeySet.add(`${s.assessmentId}:${s.studentId}`);

    const pct = s.percentage !== undefined && s.percentage !== null
      ? Number(s.percentage)
      : (s.totalPoints > 0 ? Number(((s.score / s.totalPoints) * 100).toFixed(2)) : 0);

    rows.push({
      id: s.id,
      submissionId: s.id,
      assessmentId: s.assessmentId,
      assessmentTitle: assessment?.title || "Assessment",
      assessmentCategory: assessment?.category || "General",
      studentId: s.studentId,
      studentName: student?.name || s.studentName,
      studentEmail: student?.email || "",
      status: s.passed ? "passed" : "failed",
      score: s.score,
      totalPoints: s.totalPoints,
      percentage: pct,
      correctCount: s.correctCount ?? 0,
      incorrectCount: s.incorrectCount ?? 0,
      unansweredCount: s.unansweredCount ?? 0,
      timeTakenSeconds: s.timeTakenSeconds || 0,
      submittedAt: s.submittedAt,
      assignedAt: s.submittedAt
    });
  }

  for (const a of allAssignments) {
    const key = `${a.assessmentId}:${a.studentId}`;
    if (!submittedKeySet.has(key)) {
      const assessment = assessmentMap.get(a.assessmentId);
      const student = userMap.get(a.studentId);
      rows.push({
        id: a.id,
        assignmentId: a.id,
        assessmentId: a.assessmentId,
        assessmentTitle: assessment?.title || "Assessment",
        assessmentCategory: assessment?.category || "General",
        studentId: a.studentId,
        studentName: student?.name || "Student",
        studentEmail: student?.email || "",
        status: a.status === "in_progress" ? "in_progress" : "assigned",
        score: null,
        totalPoints: assessment?.totalPoints || 0,
        percentage: null,
        correctCount: 0,
        incorrectCount: 0,
        unansweredCount: 0,
        timeTakenSeconds: 0,
        submittedAt: null,
        assignedAt: a.assignedAt,
        dueDate: a.dueDate
      });
    }
  }

  let filtered = rows;
  if (assessmentId && assessmentId !== "all") {
    filtered = filtered.filter(r => r.assessmentId === assessmentId);
  }
  if (category && category !== "all") {
    filtered = filtered.filter(r => r.assessmentCategory.toLowerCase() === category.toLowerCase());
  }
  if (status && status !== "all") {
    filtered = filtered.filter(r => r.status === status);
  }
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(r => 
      r.studentName.toLowerCase().includes(q) || 
      r.studentEmail.toLowerCase().includes(q) ||
      r.assessmentTitle.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => {
    if (a.submittedAt && b.submittedAt) {
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    }
    if (a.submittedAt) return -1;
    if (b.submittedAt) return 1;
    return new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime();
  });

  const completedSubmissions = filtered.filter(r => r.submittedAt !== null);
  const totalSubmissions = completedSubmissions.length;
  const passedCount = completedSubmissions.filter(r => r.status === "passed").length;
  const failedCount = totalSubmissions - passedCount;
  const passRate = totalSubmissions > 0 ? Math.round((passedCount / totalSubmissions) * 100) : 0;
  const avgScore = totalSubmissions > 0
    ? Math.round(completedSubmissions.reduce((sum, r) => sum + (r.percentage || 0), 0) / totalSubmissions)
    : 0;

  const uniqueCandidates = new Set(filtered.map(r => r.studentId)).size;

  res.json({
    totalAssigned: filtered.length,
    totalSubmissions,
    uniqueStudentsAttempted: uniqueCandidates,
    passedCount,
    failedCount,
    passRate,
    averageScore: avgScore,
    results: filtered
  });
});

// Admin: Detailed question-wise submission breakdown for modal
app.get("/api/admin/results/submission/:submissionId", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { submissionId } = req.params;
  const submission = await submissionsDb.findOne({ id: submissionId });
  if (!submission) return res.status(404).json({ error: "Submission not found" });

  const assessment = await assessmentsDb.findOne({ id: submission.assessmentId });
  const student = await usersDb.findOne({ id: submission.studentId });
  const questions = await questionsDb.find({ assessmentId: submission.assessmentId });
  questions.sort((a, b) => (a.order || 0) - (b.order || 0));

  const questionDetails = questions.map((q, idx) => {
    const studentAns = Array.isArray(submission.answers[q.id]) ? submission.answers[q.id] : [];
    const correctAns = Array.isArray(q.correctAnswers) ? q.correctAnswers : [];
    const isAttempted = studentAns.length > 0;
    const isCorrect = isAttempted && 
                      studentAns.length === correctAns.length && 
                      studentAns.every(val => correctAns.includes(val));

    let pointsEarned = 0;
    if (isCorrect) {
      pointsEarned = q.points;
    } else if (isAttempted && q.negativePoints) {
      pointsEarned = -q.negativePoints;
    }

    return {
      id: q.id,
      order: q.order || (idx + 1),
      questionText: q.questionText,
      type: q.type,
      points: q.points,
      negativePoints: q.negativePoints || 0,
      difficulty: q.difficulty || "medium",
      options: q.options || [],
      studentAnswers: studentAns,
      correctAnswers: correctAns,
      isCorrect,
      isAttempted,
      pointsEarned,
      explanation: q.explanation || null
    };
  });

  res.json({
    submission,
    assessment,
    student: {
      id: student?.id,
      name: student?.name || submission.studentName,
      email: student?.email || ""
    },
    questions: questionDetails
  });
});

// ==========================================
// 6. PROFESSIONAL CODING PLATFORM APIS
// ==========================================

// Get all available and executable runtimes via isolated sandbox driver
app.get("/api/coding/runtimes", async (_req, res) => {
  try {
    const runtimes = await CodingExecutionService.getAvailableRuntimes();
    res.json(runtimes);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to probe runtimes: " + err.message });
  }
});

// Chapters & Topics Hierarchy Endpoints
app.get("/api/coding/chapters", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user?.id;
    const chapters = await codingChaptersDb.find();
    chapters.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    const allTopics = await codingTopicsDb.find();
    const allChallenges = await codingChallengesDb.find();
    const studentSubs = studentId ? await codingSubmissionsDb.find({ studentId, status: "passed" }) : [];
    const solvedProblemIds = new Set(studentSubs.map(s => s.problemId));

    const enriched = chapters.map(ch => {
      const chapterTopics = allTopics.filter(t => t.chapterId === ch.id);
      const chapterChallenges = allChallenges.filter(c => c.chapterId === ch.id);
      const solvedInChapter = chapterChallenges.filter(c => solvedProblemIds.has(c.id)).length;

      return {
        ...ch,
        topicsCount: chapterTopics.length,
        problemsCount: chapterChallenges.length,
        solvedCount: solvedInChapter
      };
    });

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch coding chapters: " + err.message });
  }
});

app.get("/api/coding/chapters/:chapterId", authenticateToken, async (req, res) => {
  try {
    const { chapterId } = req.params;
    const studentId = req.user?.id;

    let chapter = await codingChaptersDb.findOne({ id: chapterId });
    if (!chapter) {
      chapter = await codingChaptersDb.findOne({ slug: chapterId });
    }
    if (!chapter) {
      return res.status(404).json({ error: "Chapter not found" });
    }

    const topics = await codingTopicsDb.find({ chapterId: chapter.id });
    topics.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    const allChallenges = await codingChallengesDb.find({ chapterId: chapter.id });
    const studentSubs = studentId ? await codingSubmissionsDb.find({ studentId, status: "passed" }) : [];
    const solvedProblemIds = new Set(studentSubs.map(s => s.problemId));

    const enrichedTopics = topics.map(t => {
      const topicChallenges = allChallenges.filter(c => c.topicId === t.id);
      const solvedInTopic = topicChallenges.filter(c => solvedProblemIds.has(c.id)).length;
      return {
        ...t,
        problemsCount: topicChallenges.length,
        solvedCount: solvedInTopic
      };
    });

    res.json({
      ...chapter,
      topics: enrichedTopics,
      problemsCount: allChallenges.length,
      solvedCount: allChallenges.filter(c => solvedProblemIds.has(c.id)).length
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch chapter details: " + err.message });
  }
});

app.get("/api/coding/topics/:topicId", authenticateToken, async (req, res) => {
  try {
    const { topicId } = req.params;
    const studentId = req.user?.id;

    let topic = await codingTopicsDb.findOne({ id: topicId });
    if (!topic) {
      topic = await codingTopicsDb.findOne({ slug: topicId });
    }
    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    const chapter = await codingChaptersDb.findOne({ id: topic.chapterId });

    const challenges = await codingChallengesDb.find({ topicId: topic.id });
    challenges.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    const studentSubs = studentId ? await codingSubmissionsDb.find({ studentId }) : [];
    const solvedProblemIds = new Set(studentSubs.filter(s => s.status === "passed").map(s => s.problemId));
    const attemptedProblemIds = new Set(studentSubs.map(s => s.problemId));

    const enrichedProblems = challenges.map(c => {
      let problemStatus: "not_started" | "in_progress" | "solved" = "not_started";
      let hasAttempted = false;
      if (solvedProblemIds.has(c.id)) {
        problemStatus = "solved";
        hasAttempted = true;
      } else if (attemptedProblemIds.has(c.id)) {
        problemStatus = "in_progress";
        hasAttempted = true;
      }

      // NEVER leak private test cases, raw solutions, or solution explanations in catalog/topic listings
      const {
        privateTestCases,
        solution,
        solutionCode,
        referenceSolution,
        answerCode,
        privateSolution,
        solutionExplanation,
        ...safeChallenge
      } = c as any;

      return {
        ...safeChallenge,
        status: problemStatus,
        isSolved: problemStatus === "solved",
        hasAttempted
      };
    });

    res.json({
      ...topic,
      chapterTitle: chapter?.title || "",
      problems: enrichedProblems,
      problemsCount: enrichedProblems.length,
      solvedCount: enrichedProblems.filter(p => p.isSolved).length
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch topic details: " + err.message });
  }
});

// List Coding Challenges with filtering & student progress
app.get("/api/coding/challenges", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user?.id;
    const { difficulty, type, language, search, status, chapterId, topicId } = req.query;

    let challenges = await codingChallengesDb.find();

    if (chapterId && chapterId !== "all") {
      challenges = challenges.filter(c => c.chapterId === chapterId);
    }
    if (topicId && topicId !== "all") {
      challenges = challenges.filter(c => c.topicId === topicId);
    }
    challenges.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    if (difficulty && difficulty !== "all") {
      challenges = challenges.filter(c => c.difficulty === difficulty);
    }
    if (type && type !== "all") {
      challenges = challenges.filter(c => c.challengeType === type);
    }
    if (language && language !== "all") {
      challenges = challenges.filter(c => c.supportedLanguages && c.supportedLanguages.includes(language as string));
    }
    if (search) {
      const q = String(search).toLowerCase();
      challenges = challenges.filter(c => 
        c.title.toLowerCase().includes(q) || 
        c.description.toLowerCase().includes(q) ||
        (c.category && c.category.toLowerCase().includes(q))
      );
    }

    // Get student's submission history and saved code
    const studentSubs = studentId ? await codingSubmissionsDb.find({ studentId }) : [];
    const studentSaved = studentId ? await codingSavedCodeDb.find({ studentId }) : [];

    const solvedProblemIds = new Set(studentSubs.filter(s => s.status === "passed").map(s => s.problemId));
    const attemptedProblemIds = new Set([
      ...studentSubs.map(s => s.problemId),
      ...studentSaved.map(s => s.challengeId)
    ]);

    const enriched = challenges.map(c => {
      let challengeStatus: "not_started" | "in_progress" | "solved" = "not_started";
      let hasAttempted = false;
      if (solvedProblemIds.has(c.id)) {
        challengeStatus = "solved";
        hasAttempted = true;
      } else if (attemptedProblemIds.has(c.id)) {
        challengeStatus = "in_progress";
        hasAttempted = true;
      }

      // NEVER send private test cases, raw solutions, or solution explanations in catalog listing
      const {
        privateTestCases,
        solution,
        solutionCode,
        referenceSolution,
        answerCode,
        privateSolution,
        solutionExplanation,
        ...safeChallenge
      } = c as any;

      return {
        ...safeChallenge,
        status: challengeStatus,
        isSolved: challengeStatus === "solved",
        hasAttempted
      };
    });

    let filtered = enriched;
    if (status && status !== "all") {
      filtered = filtered.filter(c => c.status === status);
    }

    res.json(filtered);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch coding challenges: " + err.message });
  }
});

// Get Single Challenge by ID or Slug (Private test cases & solutions stripped; explanation gated)
app.get("/api/coding/challenges/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user?.id;

    let challenge = await codingChallengesDb.findOne({ id });
    if (!challenge) {
      challenge = await codingChallengesDb.findOne({ slug: id });
    }
    if (!challenge) {
      return res.status(404).json({ error: "Coding challenge not found" });
    }

    let challengeStatus: "not_started" | "in_progress" | "solved" = "not_started";
    let savedCode: any = null;
    let hasAttempted = false;

    if (studentId) {
      const subs = await codingSubmissionsDb.find({ studentId, problemId: challenge.id });
      if (subs.some(s => s.status === "passed")) {
        challengeStatus = "solved";
        hasAttempted = true;
      } else if (subs.length > 0) {
        challengeStatus = "in_progress";
        hasAttempted = true;
      }

      const saved = await codingSavedCodeDb.findOne({ studentId, challengeId: challenge.id });
      if (saved) {
        savedCode = saved;
        if (challengeStatus === "not_started") challengeStatus = "in_progress";
      }
    }

    // NEVER expose privateTestCases or raw solution codes to student responses
    const {
      privateTestCases,
      solution,
      solutionCode,
      referenceSolution,
      answerCode,
      privateSolution,
      solutionExplanation,
      ...safeChallenge
    } = challenge as any;

    res.json({
      ...safeChallenge,
      status: challengeStatus,
      isSolved: challengeStatus === "solved",
      hasAttempted,
      // Solution explanation is only accessible after the student has attempted/submitted
      solutionExplanation: hasAttempted ? solutionExplanation : null,
      savedCode
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch challenge: " + err.message });
  }
});

// Run Code Endpoint (Public test cases or custom input in isolated sandbox)
app.post("/api/coding/run", authenticateToken, codeExecutionRateLimiter.middleware, async (req, res) => {
  const { challengeId, problemId, language, code, customInput } = req.body;
  if (!language) {
    return res.status(400).json({ error: "Language is required" });
  }

  codeExecutionRateLimiter.recordHit(req);

  // 1. Custom input execution
  if (customInput !== undefined && customInput !== null) {
    try {
      const result = await CodingExecutionService.runProgram({
        userId: req.user!.id,
        organizationId: req.user!.organizationId || "org-default",
        language,
        code: code || "",
        stdin: String(customInput),
        timeLimitMs: 3000
      });

      return res.json({
        stdout: result.stdout,
        stderr: result.stderr,
        error: result.error,
        executionTimeMs: result.executionTimeMs,
        memoryBytes: result.memoryBytes,
        timedOut: result.timedOut,
        exitCode: result.exitCode,
        status: result.status || (result.timedOut ? "time_limit_exceeded" : (result.exitCode === 0 ? "success" : "error")),
        driverUsed: result.driverUsed
      });
    } catch (err: any) {
      return res.status(500).json({ error: "Execution failure: " + err.message });
    }
  }

  // 2. Run public test cases
  try {
    const targetId = challengeId || problemId;
    let testCases: TestCase[] = [];
    if (targetId) {
      const challenge = await codingChallengesDb.findOne({ id: targetId }) || await codingChallengesDb.findOne({ slug: targetId });
      if (challenge && challenge.publicTestCases) {
        testCases = challenge.publicTestCases;
      }
    }

    if (testCases.length === 0) {
      const result = await CodingExecutionService.runProgram({
        userId: req.user!.id,
        organizationId: req.user!.organizationId || "org-default",
        language,
        code: code || "",
        stdin: "",
        timeLimitMs: 3000
      });
      return res.json({
        status: result.status || (result.exitCode === 0 ? "passed" : "error"),
        stdout: result.stdout || "Program executed with no output.",
        stderr: result.stderr,
        executionTimeMs: result.executionTimeMs,
        memoryBytes: result.memoryBytes,
        passedCount: result.exitCode === 0 ? 1 : 0,
        totalCount: 1,
        driverUsed: result.driverUsed,
        results: [{
          id: "default-run",
          input: "",
          expectedOutput: "",
          actualOutput: result.stdout,
          passed: result.exitCode === 0,
          status: result.exitCode === 0 ? "passed" : "error",
          error: result.stderr
        }]
      });
    }

    const evaluation = await CodingExecutionService.evaluateTestCases({
      userId: req.user!.id,
      organizationId: req.user!.organizationId || "org-default",
      challengeId: targetId,
      language,
      code: code || "",
      testCases,
      timeLimitMs: 3000
    });
    res.json(evaluation);
  } catch (err: any) {
    res.status(500).json({ error: "Evaluation failed: " + err.message });
  }
});

// Enqueue an Asynchronous Code Execution Job
app.post("/api/coding/jobs", authenticateToken, codeExecutionRateLimiter.middleware, async (req, res) => {
  try {
    const { challengeId, language, code, stdin, jobType, timeLimitMs, testCases } = req.body;
    if (!language) {
      return res.status(400).json({ error: "Language is required" });
    }
    codeExecutionRateLimiter.recordHit(req);

    const jobId = await CodingExecutionService.enqueueJob({
      userId: req.user!.id,
      organizationId: req.user!.organizationId || "org-default",
      challengeId,
      language,
      code: code || "",
      stdin,
      jobType,
      timeLimitMs,
      testCases
    });

    res.status(202).json({
      jobId,
      status: "queued",
      message: "Code execution job enqueued successfully"
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to enqueue job: " + err.message });
  }
});

// Poll/Retrieve Status of an Asynchronous Code Execution Job
app.get("/api/coding/jobs/:id", authenticateToken, async (req, res) => {
  try {
    const job = await CodingExecutionService.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.json(job);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to retrieve job: " + err.message });
  }
});

// Submit Coding Practice Code (Full evaluation including hidden private test cases)
app.post("/api/coding/submit", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const { challengeId, problemId, language, code, htmlCode, cssCode, jsCode } = req.body;
    const targetId = challengeId || problemId;

    if (!targetId) {
      return res.status(400).json({ error: "Challenge ID is required" });
    }

    const result = await CodingExecutionService.submitSolution({
      userId: studentId,
      organizationId: req.user!.organizationId || "org-default",
      challengeId: targetId,
      language,
      code,
      htmlCode,
      cssCode,
      jsCode
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Submission failed: " + err.message });
  }
});

// Get Student's Saved Code
app.get("/api/coding/saved/:challengeId", authenticateToken, async (req, res) => {
  const studentId = req.user!.id;
  const { challengeId } = req.params;
  const { language } = req.query;

  try {
    const filter: any = { studentId, challengeId };
    if (language) filter.language = language as string;
    const saved = await codingSavedCodeDb.findOne(filter);
    res.json(saved || null);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch saved code: " + err.message });
  }
});

// Save Student's Code Draft
app.post("/api/coding/save", authenticateToken, async (req, res) => {
  const studentId = req.user!.id;
  const { challengeId, language, code, htmlCode, cssCode, jsCode } = req.body;

  if (!challengeId || !language) {
    return res.status(400).json({ error: "challengeId and language are required" });
  }

  try {
    const existing = await codingSavedCodeDb.findOne({ studentId, challengeId, language });
    const now = new Date().toISOString();

    if (existing) {
      await codingSavedCodeDb.update(existing.id, {
        code: code !== undefined ? code : existing.code,
        htmlCode: htmlCode !== undefined ? htmlCode : existing.htmlCode,
        cssCode: cssCode !== undefined ? cssCode : existing.cssCode,
        jsCode: jsCode !== undefined ? jsCode : existing.jsCode,
        updatedAt: now
      });
      return res.json({ success: true, id: existing.id, updatedAt: now });
    } else {
      const created = await codingSavedCodeDb.insert({
        studentId,
        challengeId,
        language,
        code: code || null,
        htmlCode: htmlCode || null,
        cssCode: cssCode || null,
        jsCode: jsCode || null,
        updatedAt: now
      });
      return res.json({ success: true, id: created.id, updatedAt: now });
    }
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save code: " + err.message });
  }
});

// ==========================================
// 6.1 FREE CODING PLAYGROUND APIS
// ==========================================

// GET /api/playground/runtimes (Only genuinely working runtimes on host)
app.get("/api/playground/runtimes", async (_req, res) => {
  try {
    const runtimes = await CodingExecutionService.getAvailableRuntimes();
    const active = runtimes.filter(r => r.available);
    res.json(active);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to probe playground runtimes: " + err.message });
  }
});

// POST /api/playground/run (Authenticated code execution with rate limiting and sandbox isolation)
app.post("/api/playground/run", authenticateToken, codeExecutionRateLimiter.middleware, validateBody(executeCodeSchema), async (req, res) => {
  try {
    const { language, code, stdin } = req.body;
    codeExecutionRateLimiter.recordHit(req);

    const result = await CodingExecutionService.runProgram({
      userId: req.user!.id,
      organizationId: req.user!.organizationId || "org-default",
      language,
      code: code || "",
      stdin: stdin !== undefined && stdin !== null ? String(stdin) : "",
      timeLimitMs: 5000
    });

    res.json({
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.error,
      executionTimeMs: result.executionTimeMs,
      memoryBytes: result.memoryBytes,
      timedOut: result.timedOut,
      exitCode: result.exitCode,
      status: result.status,
      driverUsed: result.driverUsed
    });
  } catch (err: any) {
    sendInternalError(res, "Playground execution failed", err);
  }
});

// GET /api/playground/programs (List student's saved programs - strictly isolated)
app.get("/api/playground/programs", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const programs = await studentPlaygroundProgramsDb.find({ studentId });
    programs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    res.json(programs);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to list playground programs: " + err.message });
  }
});

// POST /api/playground/programs (Create new saved program)
app.post("/api/playground/programs", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const { title, language, code, input } = req.body;

    if (!title || !language) {
      return res.status(400).json({ error: "Title and language are required" });
    }

    const now = new Date().toISOString();
    const created = await studentPlaygroundProgramsDb.insert({
      studentId,
      title: title.trim(),
      language,
      code: code || "",
      input: input || "",
      createdAt: now,
      updatedAt: now
    });

    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create program: " + err.message });
  }
});

// GET /api/playground/programs/:id (Fetch program with strict ownership verification)
app.get("/api/playground/programs/:id", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const { id } = req.params;

    const program = await studentPlaygroundProgramsDb.findOne({ id });
    if (!program) {
      return res.status(404).json({ error: "Program not found" });
    }

    if (program.studentId !== studentId) {
      return res.status(403).json({ error: "Unauthorized access to this program" });
    }

    res.json(program);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch program: " + err.message });
  }
});

// PUT /api/playground/programs/:id (Update program with ownership verification)
app.put("/api/playground/programs/:id", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const { id } = req.params;
    const { title, language, code, input } = req.body;

    const program = await studentPlaygroundProgramsDb.findOne({ id });
    if (!program) {
      return res.status(404).json({ error: "Program not found" });
    }

    if (program.studentId !== studentId) {
      return res.status(403).json({ error: "Unauthorized access to this program" });
    }

    const now = new Date().toISOString();
    const updated = await studentPlaygroundProgramsDb.update(id, {
      title: title !== undefined ? title.trim() : program.title,
      language: language !== undefined ? language : program.language,
      code: code !== undefined ? code : program.code,
      input: input !== undefined ? input : program.input,
      updatedAt: now
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update program: " + err.message });
  }
});

// DELETE /api/playground/programs/:id (Delete program with ownership verification)
app.delete("/api/playground/programs/:id", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const { id } = req.params;

    const program = await studentPlaygroundProgramsDb.findOne({ id });
    if (!program) {
      return res.status(404).json({ error: "Program not found" });
    }

    if (program.studentId !== studentId) {
      return res.status(403).json({ error: "Unauthorized access to this program" });
    }

    await studentPlaygroundProgramsDb.delete(id);
    res.json({ success: true, message: "Program deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete program: " + err.message });
  }
});

// ==========================================
// 7. BLOG PORTAL API
// ==========================================

app.get("/api/blogs", async (req, res) => {
  const approved = await blogsDb.find({ status: "approved" });
  res.json(approved);
});

app.get("/api/blogs/all", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.TRAINER && req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Unauthorized access to drafts" });
  }
  const allBlogs = await blogsDb.find();
  res.json(allBlogs);
});

app.post("/api/blogs", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.TRAINER && req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Only Trainers and Admins can publish blogs" });
  }

  const { title, content, summary, coverImage, category, tags } = req.body;
  if (!title || !content || !summary) {
    return res.status(400).json({ error: "Title, content and summary are required" });
  }

  const author = await usersDb.findOne({ id: req.user!.id });
  if (!author) return res.status(404).json({ error: "Author profile not found" });

  const blog = await blogsDb.insert({
    title,
    content,
    summary,
    coverImage: coverImage || "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&auto=format&fit=crop&q=80",
    authorId: author.id,
    authorName: author.name,
    category: category || "General",
    tags: tags || [],
    likesCount: 0,
    bookmarksCount: 0,
    status: req.user!.role === UserRole.ADMIN ? "approved" : "pending", 
    createdAt: new Date().toISOString()
  });

  res.status(201).json(blog);
});

app.put("/api/blogs/:id/status", authenticateToken, async (req, res) => {
  if (!isPlatformAdmin(req.user!.role)) {
    return res.status(403).json({ error: "Admin approval required" });
  }

  const { status } = req.body;
  const updated = await blogsDb.update(req.params.id, { status });
  if (!updated) return res.status(404).json({ error: "Blog not found" });

  res.json(updated);
});

app.post("/api/blogs/:id/like", authenticateToken, async (req, res) => {
  const blog = await blogsDb.findOne({ id: req.params.id });
  if (!blog) return res.status(404).json({ error: "Blog not found" });

  const updated = await blogsDb.update(blog.id, {
    likesCount: blog.likesCount + 1
  });
  res.json(updated);
});

app.post("/api/blogs/:id/bookmark", authenticateToken, async (req, res) => {
  const studentId = req.user!.id;
  const blogId = req.params.id;

  const blog = await blogsDb.findOne({ id: blogId });
  if (!blog) return res.status(404).json({ error: "Blog not found" });

  const user = await usersDb.findOne({ id: studentId });
  if (!user) return res.status(404).json({ error: "User not found" });

  const bookmarks = user.bookmarkedBlogIds || [];
  const isBookmarked = bookmarks.includes(blogId);

  let updatedBookmarks;
  let bookmarksCountChange = 0;

  if (isBookmarked) {
    updatedBookmarks = bookmarks.filter(id => id !== blogId);
    bookmarksCountChange = -1;
  } else {
    updatedBookmarks = [...bookmarks, blogId];
    bookmarksCountChange = 1;
  }

  await usersDb.update(studentId, { bookmarkedBlogIds: updatedBookmarks });

  const newCount = Math.max(0, (blog.bookmarksCount || 0) + bookmarksCountChange);
  const updatedBlog = await blogsDb.update(blogId, { bookmarksCount: newCount });

  res.json({
    bookmarked: !isBookmarked,
    bookmarksCount: newCount,
    bookmarkedBlogIds: updatedBookmarks
  });
});

app.get("/api/blogs/:id/comments", async (req, res) => {
  const allComments = await commentsDb.find({ blogId: req.params.id });
  const comments = allComments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  res.json(comments);
});

app.post("/api/blogs/:id/comments", authenticateToken, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "Comment content is required" });

  const user = await usersDb.findOne({ id: req.user!.id });
  if (!user) return res.status(404).json({ error: "User not found" });

  const comment = await commentsDb.insert({
    blogId: req.params.id,
    authorId: user.id,
    authorName: user.name,
    authorRole: user.role,
    content,
    createdAt: new Date().toISOString()
  });

  res.status(201).json(comment);
});


// ==========================================
// 8. SERVER-SIDE GEMINI AI EXPLAINER ROUTE
// ==========================================

// GET /api/ai/status (Inspect AI configuration status - never leaks credentials)
app.get("/api/ai/status", authenticateToken, (_req, res) => {
  res.json(AIMentorService.getStatus());
});

// POST /api/ai/explain (Student AI Learning Mentor & Course Player AI Instructor)
app.post("/api/ai/explain", authenticateToken, aiRateLimiter.middleware, async (req, res) => {
  try {
    const { content, context, history, previousAnswer } = req.body;
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "Content is required to explain" });
    }

    aiRateLimiter.recordHit(req);

    const result = await AIMentorService.explain({
      content,
      context,
      history,
      previousAnswer,
      userId: req.user?.id
    });

    res.json(result);
  } catch (err: any) {
    const status = err.status || 500;
    const message = err.message || "An unexpected error occurred while communicating with the AI Mentor.";
    res.status(status).json({ error: message });
  }
});

// Explicit 404 Handler for Unmatched API routes
// Guarantees that any unmatched /api/* request returns a valid JSON error response
// rather than an empty body or HTML error page.
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API endpoint '${req.method} ${req.originalUrl}' not found` });
});

// Centralized Error Handling Middleware
// Prevents leaking internal stack traces, file paths, or raw database exceptions to clients
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error("[Internal Server Error]:", err?.message || err);

  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "Malformed JSON payload in request body" });
  }

  return res.status(500).json({ error: "An internal server error occurred" });
});

// ==========================================
// 9. VITE DEV SERVER AND PRODUCTION INDEX fallbacks
// ==========================================

async function startServer() {
  // Initialize MySQL tables and migrate static JSON records if needed
  try {
    await initializeDatabase();
    await CertificationService.ensureDefaultTemplates();
  } catch (error) {
    console.error("Failed to initialize database schema & migrate data:", error);
    process.exit(1);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is booted and listening on http://localhost:${PORT}`);
    schedulerService.start();
  });
}

startServer();
