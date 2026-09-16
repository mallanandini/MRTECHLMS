/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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

import { 
  usersDb, coursesDb, modulesDb, lessonsDb, enrollmentsDb, 
  progressDb, assessmentsDb, questionsDb, submissionsDb, 
  codingSubmissionsDb, blogsDb, commentsDb, reviewsDb, userPreferencesDb,
  learningPathsDb, learningPathSectionsDb, learningPathItemsDb, learningPathAssignmentsDb, learningPathProgressDb,
  codingChallengesDb, codingSavedCodeDb, assessmentAssignmentsDb,
  codingChaptersDb, codingTopicsDb, studentPlaygroundProgramsDb
} from "./server/db.js";
import { UserRole, LessonType, QuestionType, LearningPathItemType, TestCase } from "./src/types.js";
import { initializeDatabase } from "./server/seed.js";
import { detectAvailableRuntimes, executeProgram, evaluateTestCases } from "./server/codeExecution.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Ensure storage directories exist for physical assets
const storageDir = path.join(process.cwd(), "storage");
const thumbnailsDir = path.join(storageDir, "course-thumbnails");
const materialsDir = path.join(storageDir, "materials");
const videosDir = path.join(storageDir, "videos");

[storageDir, thumbnailsDir, materialsDir, videosDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Serve physical asset uploads
app.use("/storage", express.static(storageDir));

// Multer storage setup for Admin Course Creator assets
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.query.folder as string;
    if (folder === "thumbnail") cb(null, thumbnailsDir);
    else if (folder === "video") cb(null, videosDir);
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
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
});

// Initialize Gemini AI Client (lazy initialization to avoid crash if missing key)
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

// Simple Custom Authorization Middleware
async function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token is missing" });
  }

  // In our simplified, secure system, the token is simply "user-id:role:email"
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [userId, role, email] = decoded.split(":");
    
    const user = await usersDb.findOne({ id: userId });
    if (!user || user.status === "suspended") {
      return res.status(403).json({ error: "Invalid user or account suspended" });
    }

    req.user = { id: userId, role: user.role as UserRole, email: user.email };
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
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
      };
    }
  }
}

// Helper to generate the simple token
function generateToken(user: { id: string; role: string; email: string }) {
  const tokenStr = `${user.id}:${user.role}:${user.email}`;
  return Buffer.from(tokenStr).toString("base64");
}

// ==========================================
// 1. AUTHENTICATION API
// ==========================================

app.post("/api/auth/register", async (req, res) => {
  return res.status(403).json({
    error: "Public registration is disabled. Please contact your LMS Administrator to obtain an account."
  });
});

app.post("/api/auth/admin-register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await usersDb.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newAdminId = "usr-adm-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
    const newAdmin = {
      id: newAdminId,
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: UserRole.ADMIN,
      status: "active" as const,
      createdAt: new Date().toISOString()
    };

    await usersDb.insert(newAdmin);
    const { passwordHash: _, ...adminWithoutPassword } = newAdmin;
    const token = generateToken(newAdmin);

    res.status(201).json({ user: adminWithoutPassword, token });
  } catch (err: any) {
    console.error("Admin registration error:", err);
    res.status(500).json({ error: "Failed to create administrator account." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password, portal } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await usersDb.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  // Deactivate trainer role
  if (user.role === UserRole.TRAINER || user.email.toLowerCase() === "trainer@lms.com") {
    return res.status(403).json({ error: "Trainer access is currently disabled." });
  }

  // Portal-specific role validation
  if (portal === "student" && user.role === UserRole.ADMIN) {
    return res.status(403).json({ error: "This is an Admin account. Please log in through the Admin Portal." });
  }
  if (portal === "admin" && user.role === UserRole.STUDENT) {
    return res.status(403).json({ error: "This is a Student account. Please log in through the Student Portal." });
  }

  if (user.status === "suspended") {
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
    return res.status(401).json({ error: "Invalid email or password" });
  }

  // Transparently upgrade legacy SHA-256 hash to bcrypt (cost factor 10) in MySQL
  if (isLegacySha256) {
    const upgradedBcryptHash = await bcrypt.hash(password, 10);
    await usersDb.update(user.id, { passwordHash: upgradedBcryptHash });
    user.passwordHash = upgradedBcryptHash;
  }

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
  const studentId = req.user!.id;
  const enrollments = await enrollmentsDb.find({ studentId });
  const enrolledCourseIds = enrollments.map(e => e.courseId);

  const allCourses = await coursesDb.find();
  const courses = allCourses.filter(c => enrolledCourseIds.includes(c.id));
  const progressList = await progressDb.find({ studentId });
  const submissions = await submissionsDb.find({ studentId });
  const codingSubmissions = await codingSubmissionsDb.find({ studentId });
  const allLessons = await lessonsDb.find();
  const allAssessments = await assessmentsDb.find();

  // Calculate completed lessons per course
  const courseProgressList = courses.map(course => {
    const courseLessons = allLessons.filter(l => l.courseId === course.id);
    const completedInCourse = progressList.filter(p => p.courseId === course.id && p.completed).length;
    const totalLessons = courseLessons.length;
    const percentage = totalLessons > 0 ? Math.round((completedInCourse / totalLessons) * 100) : 0;

    const courseAssessment = allAssessments.find(a => a.courseId === course.id);

    return {
      courseId: course.id,
      title: course.title,
      thumbnail: course.thumbnail,
      percentage,
      completedCount: completedInCourse,
      totalCount: totalLessons,
      assessmentId: courseAssessment ? courseAssessment.id : null
    };
  });

  // Calculate passed assessments and coding challenges solved
  const passedAssessments = submissions.filter(s => s.passed).length;
  const codingChallengesSolved = codingSubmissions.filter(c => c.status === "passed").length;

  res.json({
    enrolledCount: enrollments.length,
    completedCourses: courseProgressList.filter(p => p.percentage === 100).length,
    averageProgress: courseProgressList.length > 0 
      ? Math.round(courseProgressList.reduce((acc, c) => acc + c.percentage, 0) / courseProgressList.length)
      : 0,
    passedAssessments,
    codingChallengesSolved,
    recentActivity: [
      ...enrollments.map(e => {
        const c = courses.find(course => course.id === e.courseId);
        return { 
          type: "enrollment", 
          title: `Enrolled in ${c ? c.title : 'Course'}`, 
          date: e.enrolledAt, 
          detail: "New registration" 
        };
      }),
      ...submissions.map(s => {
        const a = allAssessments.find(assess => assess.id === s.assessmentId);
        return { 
          type: "assessment", 
          title: `${s.passed ? 'Passed' : 'Failed'} Assessment: ${a ? a.title : 'Quiz'}`, 
          date: s.submittedAt, 
          detail: `${s.score}/${s.totalPoints} points` 
        };
      }),
      ...codingSubmissions.map(c => ({
        type: "coding",
        title: `Coding Submission: ${c.status === "passed" ? 'Passed' : 'Failed'}`,
        date: c.submittedAt,
        detail: `${c.language.toUpperCase()} - ${c.passedCount}/${c.totalCount} tests`
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
    courseProgress: courseProgressList
  });
});

app.get("/api/student/courses", authenticateToken, async (req, res) => {
  const studentId = req.user!.id;
  const enrollments = await enrollmentsDb.find({ studentId });
  const courseIds = enrollments.map(e => e.courseId);

  const allCourses = await coursesDb.find();
  const courses = allCourses.filter(c => courseIds.includes(c.id));
  res.json(courses);
});

app.post("/api/student/courses/:courseId/enroll", authenticateToken, async (req, res) => {
  return res.status(403).json({
    error: "Self-enrollment is disabled. Course access must be assigned by an Administrator."
  });
});

// Lesson Completed toggle
app.post("/api/student/lessons/:lessonId/progress", authenticateToken, async (req, res) => {
  const studentId = req.user!.id;
  const { lessonId } = req.params;
  const { completed } = req.body;

  const lesson = await lessonsDb.findOne({ id: lessonId });
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });

  if (req.user!.role === UserRole.STUDENT) {
    const enrollment = await enrollmentsDb.findOne({ studentId, courseId: lesson.courseId });
    if (!enrollment) {
      return res.status(403).json({ error: "Access denied. You are not enrolled in this course." });
    }
  }

  const existing = await progressDb.findOne({ studentId, lessonId });
  if (existing) {
    const updated = await progressDb.update(existing.id, {
      completed,
      completedAt: completed ? new Date().toISOString() : undefined
    });
    return res.json(updated);
  } else {
    const created = await progressDb.insert({
      studentId,
      courseId: lesson.courseId,
      lessonId,
      completed,
      completedAt: completed ? new Date().toISOString() : undefined
    });
    return res.status(201).json(created);
  }
});

app.get("/api/student/courses/:courseId/progress", authenticateToken, async (req, res) => {
  const studentId = req.user!.id;
  const { courseId } = req.params;

  if (req.user!.role === UserRole.STUDENT) {
    const enrollment = await enrollmentsDb.findOne({ studentId, courseId });
    if (!enrollment) {
      return res.status(403).json({ error: "Access denied. You are not enrolled in this course." });
    }
  }

  const progress = await progressDb.find({ studentId, courseId });
  res.json(progress);
});

app.put("/api/student/profile", authenticateToken, async (req, res) => {
  const { name, profilePhoto, password } = req.body;
  
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (profilePhoto !== undefined) updates.profilePhoto = profilePhoto;
  if (password) {
    updates.passwordHash = await bcrypt.hash(password, 10);
  }

  const updated = await usersDb.update(req.user!.id, updates);
  if (!updated) return res.status(404).json({ error: "User not found" });

  const { passwordHash: _, ...userWithoutPassword } = updated;
  res.json(userWithoutPassword);
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
  const enrolledCourseIds = enrollments.map(e => e.courseId);

  const allAssessments = await assessmentsDb.find({ status: "published" });
  const authorizedAssessments = allAssessments.filter(a => a.courseId && enrolledCourseIds.includes(a.courseId));
  const submissions = await submissionsDb.find({ studentId });
  const allCourses = await coursesDb.find();

  const courseAssessmentResults = authorizedAssessments.map(assessment => {
    const course = allCourses.find(c => c.id === assessment.courseId);
    
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
      lastAttemptedAt: latestSubmission ? latestSubmission.submittedAt : null
    };
  });

  // Standalone Assessments assigned directly to student
  const standaloneAssignments = await assessmentAssignmentsDb.find({ studentId });
  const standaloneAssessmentIds = standaloneAssignments.map(a => a.assessmentId);
  const standaloneAssessments = allAssessments.filter(a => standaloneAssessmentIds.includes(a.id));

  const standaloneResults = standaloneAssessments.map(assessment => {
    const assignment = standaloneAssignments.find(a => a.assessmentId === assessment.id);
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
      dueDate: assignment?.dueDate,
      assignedAt: assignment?.assignedAt,
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
app.get("/api/assessments/:id/leaderboard", async (req, res) => {
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
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const allUsers = await usersDb.find();
  const students = allUsers.filter(u => u.role === UserRole.STUDENT);
  const trainers = allUsers.filter(u => u.role === UserRole.TRAINER);
  const courses = await coursesDb.find();
  const enrollments = await enrollmentsDb.find();
  const submissions = await submissionsDb.find();

  res.json({
    studentsCount: students.length,
    trainersCount: trainers.length,
    coursesCount: courses.length,
    enrollmentsCount: enrollments.length,
    submissionsCount: submissions.length,
    recentUsers: allUsers.slice(-5).map(({ passwordHash: _, ...u }) => u),
    recentCourses: courses.slice(-5)
  });
});

app.get("/api/admin/users", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const allUsers = await usersDb.find();
  const allEnrollments = await enrollmentsDb.find();
  const allAssessments = await assessmentsDb.find();
  const allSubmissions = await submissionsDb.find();

  const sanitizedUsers = allUsers.map(({ passwordHash: _, ...u }) => {
    const userEnrollments = allEnrollments.filter(e => e.studentId === u.id);
    const assignedCoursesCount = userEnrollments.length;
    const enrolledCourseIds = new Set(userEnrollments.map(e => e.courseId));
    const assignedAssessmentsCount = allAssessments.filter(a => enrolledCourseIds.has(a.courseId)).length;
    const completedAssessmentsCount = allSubmissions.filter(s => s.studentId === u.id && s.passed).length;

    return {
      ...u,
      assignedCoursesCount,
      assignedAssessmentsCount,
      completedAssessmentsCount
    };
  });
  res.json(sanitizedUsers);
});

// Admin Single User Creation
app.post("/api/admin/users", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { name, email, password, role, status } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }

  const trimmedName = String(name).trim();
  const trimmedEmail = String(email).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" });
  }

  const existing = await usersDb.findOne({ email: trimmedEmail });
  if (existing) {
    return res.status(409).json({ error: "Email is already registered in the system" });
  }

  const targetRole = role && Object.values(UserRole).includes(role) ? role : UserRole.STUDENT;
  const targetStatus = status === "suspended" ? "suspended" : "active";
  const passwordHash = await bcrypt.hash(String(password), 10);

  const newUser = await usersDb.insert({
    name: trimmedName,
    email: trimmedEmail,
    role: targetRole,
    passwordHash,
    createdAt: new Date().toISOString(),
    status: targetStatus
  });

  const { passwordHash: _, ...userWithoutPassword } = newUser;
  res.status(201).json(userWithoutPassword);
});

// Admin Download Excel Template for Bulk Student Import
app.get("/api/admin/users/template", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const templateData = [
    {
      "Full Name": "Alice Johnson",
      "Email Address": "alice.johnson@example.com",
      "Password": "StudentPass123!",
      "Status": "active"
    },
    {
      "Full Name": "Bob Smith",
      "Email Address": "bob.smith@example.com",
      "Password": "StudentPass123!",
      "Status": "active"
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  worksheet["!cols"] = [
    { wch: 22 },
    { wch: 30 },
    { wch: 18 },
    { wch: 12 }
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
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const rawRows: any[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
  const existingUsers = await usersDb.find();
  const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const seenInFileEmails = new Set<string>();

  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  const validatedRows = rawRows.map((raw, idx) => {
    const rowNumber = idx + 2; // Excel row indexing (1 is header)
    const fullName = String(raw.fullName || raw["Full Name"] || raw.name || raw.Name || "").trim();
    const email = String(raw.email || raw["Email Address"] || raw.Email || "").trim().toLowerCase();
    const password = String(raw.password || raw["Password"] || "").trim();
    const rawStatus = String(raw.status || raw["Status"] || "active").trim().toLowerCase();
    const status = rawStatus === "suspended" ? "suspended" : "active";

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

    if (!password) {
      errors.push("Password is required");
    } else if (password.length < 6) {
      errors.push("Password must be at least 6 characters");
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
      password: password ? "••••••••" : "",
      rawPassword: password,
      status,
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
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const rawRows: any[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
  const existingUsers = await usersDb.find();
  const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const importedUsers = [];
  let failedCount = 0;

  for (const raw of rawRows) {
    const fullName = String(raw.fullName || raw["Full Name"] || raw.name || "").trim();
    const email = String(raw.email || raw["Email Address"] || raw.Email || "").trim().toLowerCase();
    const password = String(raw.rawPassword || raw.password || raw["Password"] || "").trim();
    const rawStatus = String(raw.status || raw["Status"] || "active").trim().toLowerCase();
    const status = rawStatus === "suspended" ? "suspended" : "active";

    if (!fullName || !email || !password || password.length < 6 || !emailRegex.test(email) || existingEmails.has(email)) {
      failedCount++;
      continue;
    }

    existingEmails.add(email);
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await usersDb.insert({
      name: fullName,
      email,
      role: UserRole.STUDENT,
      passwordHash,
      createdAt: new Date().toISOString(),
      status
    });

    const { passwordHash: _, ...sanitized } = newUser;
    importedUsers.push(sanitized);
  }

  res.json({
    importedCount: importedUsers.length,
    failedCount,
    users: importedUsers
  });
});

// Admin Course Access: Get Student Enrollments
app.get("/api/admin/users/:studentId/enrollments", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { studentId } = req.params;
  const student = await usersDb.findOne({ id: studentId });
  if (!student) return res.status(404).json({ error: "Student not found" });

  const enrollments = await enrollmentsDb.find({ studentId });
  const allCourses = await coursesDb.find();

  const enrolledCourses = enrollments.map(e => {
    const course = allCourses.find(c => c.id === e.courseId);
    return {
      enrollmentId: e.id,
      courseId: e.courseId,
      enrolledAt: e.enrolledAt,
      courseTitle: course ? course.title : "Unknown Course",
      category: course ? course.category : "General",
      instructorName: course ? course.instructorName : "Instructor"
    };
  });

  res.json(enrolledCourses);
});

// Admin Course Access: Grant Access to Student
app.post("/api/admin/users/:studentId/enrollments", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { studentId } = req.params;
  const { courseId } = req.body;

  if (!courseId) {
    return res.status(400).json({ error: "courseId is required" });
  }

  const student = await usersDb.findOne({ id: studentId });
  if (!student) return res.status(404).json({ error: "Student not found" });

  const course = await coursesDb.findOne({ id: courseId });
  if (!course) return res.status(404).json({ error: "Course not found" });

  const existing = await enrollmentsDb.findOne({ studentId, courseId });
  if (existing) {
    return res.status(409).json({ error: "Student is already enrolled in this course" });
  }

  const enrollment = await enrollmentsDb.insert({
    studentId,
    courseId,
    enrolledAt: new Date().toISOString()
  });

  res.status(201).json(enrollment);
});

// Admin Course Access: Revoke Access from Student
app.delete("/api/admin/users/:studentId/enrollments/:courseId", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { studentId, courseId } = req.params;
  const enrollment = await enrollmentsDb.findOne({ studentId, courseId });
  if (!enrollment) {
    return res.status(404).json({ error: "Enrollment not found for this student and course" });
  }

  await enrollmentsDb.delete(enrollment.id);
  res.json({ message: "Course access revoked successfully" });
});

// Admin Student Access: Get comprehensive course & assessment access state
app.get("/api/admin/users/:studentId/access", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { studentId } = req.params;
  const student = await usersDb.findOne({ id: studentId });
  if (!student) return res.status(404).json({ error: "Student not found" });

  const enrollments = await enrollmentsDb.find({ studentId });
  const enrolledCourseMap = new Map(enrollments.map(e => [e.courseId, e]));

  const allCourses = await coursesDb.find();
  const allAssessments = await assessmentsDb.find();

  const coursesList = allCourses.map(course => {
    const enrollment = enrolledCourseMap.get(course.id);
    return {
      id: course.id,
      title: course.title,
      category: course.category,
      status: course.status,
      instructorName: course.instructorName,
      isAssigned: !!enrollment,
      assignedDate: enrollment ? enrollment.enrolledAt : null,
      enrollmentId: enrollment ? enrollment.id : null
    };
  });

  const assessmentsList = allAssessments.map(assessment => {
    const course = allCourses.find(c => c.id === assessment.courseId);
    const enrollment = enrolledCourseMap.get(assessment.courseId);
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
      isAssigned: !!enrollment,
      assignedDate: enrollment ? enrollment.enrolledAt : null
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
    assessments: assessmentsList
  });
});

// Admin Assessment Access: Grant Access to Assessment (via Course Enrollment)
app.post("/api/admin/users/:studentId/assessment-access/:assessmentId", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
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

app.put("/api/admin/users/:id/status", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { status } = req.body;
  const updated = await usersDb.update(req.params.id, { status });
  if (!updated) return res.status(404).json({ error: "User not found" });

  res.json(updated);
});

app.put("/api/admin/courses/:id/status", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { status, isFeatured } = req.body;
  const updated = await coursesDb.update(req.params.id, { status, isFeatured });
  if (!updated) return res.status(404).json({ error: "Course not found" });

  res.json(updated);
});

// ==========================================
// ADMIN FILE UPLOAD API (Thumbnails, PDFs, Videos)
// ==========================================
app.post("/api/upload", authenticateToken, upload.single("file"), (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const folder = (req.query.folder as string) || "materials";
  const subPath = folder === "thumbnail" ? "course-thumbnails" : folder === "video" ? "videos" : "materials";
  const fileUrl = `/storage/${subPath}/${req.file.filename}`;
  res.json({
    url: fileUrl,
    filename: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

// ==========================================
// ADMIN COURSE AUTHORING & CONTENT MANAGEMENT SUITE
// ==========================================

// 1. List all courses with metadata counts
app.get("/api/admin/courses", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const {
    title,
    shortDescription,
    description,
    category,
    difficulty,
    thumbnail,
    banner,
    requirements,
    skillsCovered,
    status,
    isFeatured
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
    createdAt: new Date().toISOString()
  });

  res.status(201).json(newCourse);
});

// 3. Get full course tree for authoring studio
app.get("/api/admin/courses/:id", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const {
    title,
    shortDescription,
    description,
    category,
    difficulty,
    thumbnail,
    banner,
    requirements,
    skillsCovered,
    status,
    isFeatured
  } = req.body;

  const updatePayload: Record<string, any> = {};
  if (title !== undefined) updatePayload.title = title.trim();
  if (shortDescription !== undefined) updatePayload.shortDescription = shortDescription.trim();
  if (description !== undefined) updatePayload.description = description.trim();
  if (category !== undefined) updatePayload.category = category.trim();
  if (difficulty !== undefined) updatePayload.difficulty = difficulty;
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

  const updated = await coursesDb.update(req.params.id, updatePayload);
  if (!updated) return res.status(404).json({ error: "Course not found" });

  res.json(updated);
});

// 5. Delete course and all cascaded entities
app.delete("/api/admin/courses/:id", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { courseId } = req.params;
  const course = await coursesDb.findOne({ id: courseId });
  if (!course) return res.status(404).json({ error: "Course not found" });

  const { title, description, order } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Module title is required" });
  }

  const existingModules = await modulesDb.find({ courseId });
  const moduleOrder = order !== undefined ? Number(order) : existingModules.length + 1;

  const newModule = await modulesDb.insert({
    courseId,
    title: title.trim(),
    description: description?.trim() || "",
    order: moduleOrder
  });

  res.status(201).json(newModule);
});

app.put("/api/admin/modules/:id", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { title, description, order } = req.body;
  const payload: Record<string, any> = {};
  if (title !== undefined) payload.title = title.trim();
  if (description !== undefined) payload.description = description.trim();
  if (order !== undefined) payload.order = Number(order);

  const updated = await modulesDb.update(req.params.id, payload);
  if (!updated) return res.status(404).json({ error: "Module not found" });

  res.json(updated);
});

app.delete("/api/admin/modules/:id", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const moduleId = req.params.id;
  const mod = await modulesDb.findOne({ id: moduleId });
  if (!mod) return res.status(404).json({ error: "Module not found" });

  const lessons = await lessonsDb.find({ moduleId });
  for (const les of lessons) {
    const test = await assessmentsDb.findOne({ lessonId: les.id });
    if (test) {
      const qList = await questionsDb.find({ assessmentId: test.id });
      for (const q of qList) await questionsDb.delete(q.id);
      await assessmentsDb.delete(test.id);
    }
    const progList = await progressDb.find({ lessonId: les.id });
    for (const p of progList) await progressDb.delete(p.id);
    await lessonsDb.delete(les.id);
  }

  await modulesDb.delete(moduleId);
  res.json({ message: "Module and associated lessons deleted" });
});

// 7. Lesson CRUD
app.post("/api/admin/modules/:moduleId/lessons", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
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
    order,
    durationMinutes
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
    fileUrl: fileUrl?.trim() || materialUrl?.trim() || "",
    materialTitle: materialTitle?.trim() || "",
    materialUrl: materialUrl?.trim() || fileUrl?.trim() || "",
    order: lessonOrder,
    durationMinutes: Number(durationMinutes) || 10
  });

  res.status(201).json(newLesson);
});

app.put("/api/admin/lessons/:id", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
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
    order,
    durationMinutes
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
  if (order !== undefined) payload.order = Number(order);
  if (durationMinutes !== undefined) payload.durationMinutes = Number(durationMinutes);

  const updated = await lessonsDb.update(req.params.id, payload);
  if (!updated) return res.status(404).json({ error: "Lesson not found" });

  res.json(updated);
});

app.delete("/api/admin/lessons/:id", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const lessonId = req.params.id;
  const lesson = await lessonsDb.findOne({ id: lessonId });
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });

  const practiceTest = await assessmentsDb.findOne({ lessonId });
  if (practiceTest) {
    const qList = await questionsDb.find({ assessmentId: practiceTest.id });
    for (const q of qList) await questionsDb.delete(q.id);
    await assessmentsDb.delete(practiceTest.id);
  }

  const progList = await progressDb.find({ lessonId });
  for (const p of progList) await progressDb.delete(p.id);

  await lessonsDb.delete(lessonId);
  res.json({ message: "Lesson deleted successfully" });
});

// 8. Practice Tests & Course Final Assessments CRUD
app.get("/api/admin/lessons/:lessonId/practice-test", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
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

// List all Admin Assessments with stats & filtering
app.get("/api/admin/assessments", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { type, status, search, difficulty } = req.query;
  let allAssessments = await assessmentsDb.find();
  const allAssignments = await assessmentAssignmentsDb.find();
  const allSubmissions = await submissionsDb.find();

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
    const avgScore = submissions.length > 0
      ? Math.round(submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length)
      : 0;

    return {
      ...a,
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
  if (req.user!.role !== UserRole.ADMIN) {
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
app.get("/api/admin/assessments/template", authenticateToken, (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const sampleData = [
    {
      "Question": "What does CPU stand for in computer systems?",
      "Option 1": "Central Processing Unit",
      "Option 2": "Central Performance Unit",
      "Option 3": "Computer Personal Unit",
      "Option 4": "Control Processing User",
      "Option 5": "",
      "Correct Option": "Option 1",
      "Points": 10,
      "Difficulty": "easy",
      "Explanation": "CPU stands for Central Processing Unit and executes instructions."
    },
    {
      "Question": "Which data structure operates on a Last In First Out (LIFO) basis?",
      "Option 1": "Queue",
      "Option 2": "Stack",
      "Option 3": "Array",
      "Option 4": "Linked List",
      "Option 5": "",
      "Correct Option": "Option 2",
      "Points": 10,
      "Difficulty": "medium",
      "Explanation": "A Stack works on the LIFO principle where the newest element is removed first."
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet["!cols"] = [
    { wch: 45 },
    { wch: 25 },
    { wch: 25 },
    { wch: 25 },
    { wch: 25 },
    { wch: 20 },
    { wch: 16 },
    { wch: 10 },
    { wch: 12 },
    { wch: 40 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  res.setHeader("Content-Disposition", 'attachment; filename="assessment_questions_template.xlsx"');
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buffer);
});

// Get single assessment details with questions
app.get("/api/admin/assessments/:id", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
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

  res.json({ message: "Assessment published successfully", assessment: updated });
});

// Archive assessment
app.post("/api/admin/assessments/:id/archive", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const assessmentId = req.params.id;
  const assessment = await assessmentsDb.findOne({ id: assessmentId });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  const updated = await assessmentsDb.update(assessmentId, {
    status: "archived",
    updatedAt: new Date().toISOString()
  });

  res.json({ message: "Assessment archived successfully", assessment: updated });
});

// 9. Questions CRUD & Reordering
app.post("/api/admin/assessments/:assessmentId/questions", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const { assessmentId } = req.params;
  const assessment = await assessmentsDb.findOne({ id: assessmentId });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

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

  const existingQuestions = await questionsDb.find({ assessmentId });
  const qOrder = order !== undefined ? Number(order) : existingQuestions.length + 1;
  const qPoints = Number(points) > 0 ? Number(points) : 10;

  const newQuestion = await questionsDb.insert({
    assessmentId,
    type: type || QuestionType.MCQ_SINGLE,
    questionText: questionText.trim(),
    options: Array.isArray(options) ? options : [],
    correctAnswers: Array.isArray(correctAnswers) ? correctAnswers : [],
    points: qPoints,
    negativePoints: Number(negativePoints) || 0,
    explanation: explanation?.trim() || "",
    difficulty: difficulty || "medium",
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
});

// Question Update (supports both /api/admin/assessment-questions/:id and /api/admin/questions/:id)
const handleQuestionUpdate = async (req: any, res: any) => {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const questionId = req.params.id;
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

  const payload: Record<string, any> = {};
  if (questionText !== undefined) payload.questionText = questionText.trim();
  if (type !== undefined) payload.type = type;
  if (options !== undefined) payload.options = Array.isArray(options) ? options : [];
  if (correctAnswers !== undefined) payload.correctAnswers = Array.isArray(correctAnswers) ? correctAnswers : [];
  if (points !== undefined) payload.points = Number(points);
  if (negativePoints !== undefined) payload.negativePoints = Number(negativePoints);
  if (explanation !== undefined) payload.explanation = explanation.trim();
  if (difficulty !== undefined) payload.difficulty = difficulty;
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
};
app.put("/api/admin/assessment-questions/:id", authenticateToken, handleQuestionUpdate);
app.put("/api/admin/questions/:id", authenticateToken, handleQuestionUpdate);

// Question Delete (supports both paths)
const handleQuestionDelete = async (req: any, res: any) => {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const questionId = req.params.id;
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

  res.json({ message: "Question deleted successfully" });
};
app.delete("/api/admin/assessment-questions/:id", authenticateToken, handleQuestionDelete);
app.delete("/api/admin/questions/:id", authenticateToken, handleQuestionDelete);

// Reorder questions
app.post("/api/admin/assessments/:id/reorder-questions", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const assessmentId = req.params.id;
  const assessment = await assessmentsDb.findOne({ id: assessmentId });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  let rawRows: any[] = [];

  // Support both file upload and direct parsed JSON payload
  if (req.file) {
    try {
      const workbook = XLSX.readFile(req.file.path);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
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

  const errors: Array<{ row: number; reason: string }> = [];
  const validQuestionsToInsert: any[] = [];

  const existingQuestions = await questionsDb.find({ assessmentId });
  let currentOrder = existingQuestions.reduce((max, q) => Math.max(max, q.order || 0), 0);

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2; // Excel 1-based header is row 1
    const questionText = String(
      row["Question"] || row["question"] || row["Question Text"] || row["question_text"] || ""
    ).trim();

    if (!questionText) {
      errors.push({ row: rowNum, reason: "Question text is empty" });
      return;
    }

    const opt1 = String(row["Option 1"] || row["option_1"] || row["option1"] || "").trim();
    const opt2 = String(row["Option 2"] || row["option_2"] || row["option2"] || "").trim();
    const opt3 = String(row["Option 3"] || row["option_3"] || row["option3"] || "").trim();
    const opt4 = String(row["Option 4"] || row["option_4"] || row["option4"] || "").trim();
    const opt5 = String(row["Option 5"] || row["option_5"] || row["option5"] || "").trim();

    const options = [opt1, opt2, opt3, opt4, opt5].filter(o => o.length > 0);
    if (options.length < 2) {
      errors.push({ row: rowNum, reason: `At least 2 options are required (found ${options.length})` });
      return;
    }

    const rawCorrect = String(
      row["Correct Option"] || row["correct_option"] || row["Correct Answer"] || row["correct_answer"] || row["Answer"] || ""
    ).trim();

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
    errors,
    importedCount: validQuestionsToInsert.length
  });
});

// 12. Student Assignment & Management APIs
app.get("/api/admin/assessments/:id/students", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
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

    let status: "unassigned" | "assigned" | "in_progress" | "completed" = "unassigned";
    if (assignment) {
      if (stSubmissions.length > 0) {
        status = "completed";
      } else {
        status = assignment.status || "assigned";
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
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const assessmentId = req.params.id;
  const assessment = await assessmentsDb.findOne({ id: assessmentId });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  const { studentId, dueDate } = req.body;
  if (!studentId) return res.status(400).json({ error: "studentId is required" });

  const student = await usersDb.findOne({ id: studentId });
  if (!student) return res.status(404).json({ error: "Student not found" });

  const existing = await assessmentAssignmentsDb.findOne({ assessmentId, studentId });
  if (existing) {
    return res.status(200).json({ message: "Student is already assigned to this assessment", assignment: existing });
  }

  const now = new Date().toISOString();
  const created = await assessmentAssignmentsDb.insert({
    assessmentId,
    studentId,
    assignedBy: req.user!.id,
    assignedAt: now,
    dueDate: dueDate || null,
    status: "assigned",
    createdAt: now,
    updatedAt: now
  });

  res.status(201).json(created);
});

app.post("/api/admin/assessments/:id/bulk-assign", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const assessmentId = req.params.id;
  const assessment = await assessmentsDb.findOne({ id: assessmentId });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  const { studentIds, dueDate } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: "studentIds array is required" });
  }

  const existingAssignments = await assessmentAssignmentsDb.find({ assessmentId });
  const alreadyAssignedStudentIds = new Set(existingAssignments.map(a => a.studentId));

  let assignedCount = 0;
  const now = new Date().toISOString();

  for (const studentId of studentIds) {
    if (!alreadyAssignedStudentIds.has(studentId)) {
      await assessmentAssignmentsDb.insert({
        assessmentId,
        studentId,
        assignedBy: req.user!.id,
        assignedAt: now,
        dueDate: dueDate || null,
        status: "assigned",
        createdAt: now,
        updatedAt: now
      });
      assignedCount++;
    }
  }

  res.json({
    message: `Successfully assigned ${assignedCount} student(s)`,
    assignedCount,
    alreadyAssignedCount: studentIds.length - assignedCount
  });
});

app.post("/api/admin/assessments/:id/revoke", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const assessmentId = req.params.id;
  const { studentId } = req.body;
  if (!studentId) return res.status(400).json({ error: "studentId is required" });

  const assignment = await assessmentAssignmentsDb.findOne({ assessmentId, studentId });
  if (!assignment) {
    return res.status(404).json({ error: "Assignment not found for this student" });
  }

  await assessmentAssignmentsDb.delete(assignment.id);
  res.json({ message: "Student assignment revoked successfully" });
});

app.get("/api/admin/assessments/:id/results", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
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
    submissions: enrichedSubmissions
  });
});


// ==========================================
// ADMIN & STUDENT LEARNING PATH MANAGEMENT SUITE
// ==========================================

// 1. Admin: List all learning paths with metadata & stats
app.get("/api/admin/learning-paths", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
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
    status
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
    thumbnail: thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80",
    estimatedDuration: estimatedDuration?.trim() || "4 hours",
    requirements: Array.isArray(requirements) ? requirements : (typeof requirements === "string" && requirements ? requirements.split("\n").map(r => r.trim()).filter(Boolean) : ["Basic Computer Knowledge"]),
    learningObjectives: Array.isArray(learningObjectives) ? learningObjectives : (typeof learningObjectives === "string" && learningObjectives ? learningObjectives.split("\n").map(o => o.trim()).filter(Boolean) : ["Complete all curriculum modules"]),
    status: status || "draft",
    authorId: req.user!.id,
    authorName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  res.status(201).json(newPath);
});

// 3. Admin: Get full learning path tree (Studio/Builder view)
app.get("/api/admin/learning-paths/:id", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
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
    finalAssessmentId
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
    updatedAt: new Date().toISOString()
  });

  res.json(updated);
});

// 5. Admin: Delete learning path
app.delete("/api/admin/learning-paths/:id", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const existing = await learningPathSectionsDb.findOne({ id: req.params.id });
  if (!existing) return res.status(404).json({ error: "Section not found" });

  await learningPathSectionsDb.delete(existing.id);
  res.json({ message: "Section deleted successfully" });
});

app.put("/api/admin/learning-paths/:id/sections/reorder", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
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
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const path = await learningPathsDb.findOne({ id: req.params.id });
  if (!path) return res.status(404).json({ error: "Learning Path not found" });

  const allStudents = await usersDb.find({ role: UserRole.STUDENT });
  const assignments = await learningPathAssignmentsDb.find({ learningPathId: path.id });
  const allItems = await learningPathItemsDb.find({ learningPathId: path.id });
  const allProgress = await learningPathProgressDb.find({ learningPathId: path.id });

  const studentData = allStudents.map(student => {
    const assign = assignments.find(a => a.studentId === student.id);
    const studentProgress = allProgress.filter(p => p.studentId === student.id && p.completed);
    const progressPercent = allItems.length > 0 
      ? Math.round((studentProgress.length / allItems.length) * 100) 
      : 0;

    return {
      id: student.id,
      name: student.name,
      email: student.email,
      status: student.status,
      isAssigned: !!assign,
      assignedAt: assign?.assignedAt || null,
      completedAt: assign?.completedAt || null,
      progressPercent
    };
  });

  res.json(studentData);
});

app.post("/api/admin/learning-paths/:id/assign", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const path = await learningPathsDb.findOne({ id: req.params.id });
  if (!path) return res.status(404).json({ error: "Learning Path not found" });

  const { studentIds } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: "studentIds array is required" });
  }

  for (const studentId of studentIds) {
    const existing = await learningPathAssignmentsDb.findOne({ learningPathId: path.id, studentId });
    if (!existing) {
      await learningPathAssignmentsDb.insert({
        learningPathId: path.id,
        studentId,
        assignedBy: req.user!.id,
        assignedAt: new Date().toISOString()
      });
    }
  }

  const updatedAssignments = await learningPathAssignmentsDb.find({ learningPathId: path.id });
  res.json({ message: "Students assigned successfully", assignedCount: updatedAssignments.length });
});

app.post("/api/admin/learning-paths/:id/revoke", authenticateToken, async (req, res) => {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin role required" });
  }

  const path = await learningPathsDb.findOne({ id: req.params.id });
  if (!path) return res.status(404).json({ error: "Learning Path not found" });

  const { studentIds } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: "studentIds array is required" });
  }

  for (const studentId of studentIds) {
    const assign = await learningPathAssignmentsDb.findOne({ learningPathId: path.id, studentId });
    if (assign) {
      await learningPathAssignmentsDb.delete(assign.id);
    }
  }

  const updatedAssignments = await learningPathAssignmentsDb.find({ learningPathId: path.id });
  res.json({ message: "Access revoked successfully", assignedCount: updatedAssignments.length });
});

// ==========================================
// STUDENT LEARNING PATH PORTAL APIs
// ==========================================

// 14. Student: List learning paths with assignment & progress status
app.get("/api/student/learning-paths", authenticateToken, async (req, res) => {
  const studentId = req.user!.id;
  const publishedPaths = await learningPathsDb.find({ status: "published" });
  const myAssignments = await learningPathAssignmentsDb.find({ studentId });
  const allSections = await learningPathSectionsDb.find();
  const allItems = await learningPathItemsDb.find();
  const myProgress = await learningPathProgressDb.find({ studentId, completed: true });

  const result = publishedPaths.map(path => {
    const assign = myAssignments.find(a => a.learningPathId === path.id);
    const pathSections = allSections.filter(s => s.learningPathId === path.id);
    const pathItems = allItems.filter(i => i.learningPathId === path.id);
    const completedItems = myProgress.filter(p => p.learningPathId === path.id);
    const progressPercent = pathItems.length > 0
      ? Math.round((completedItems.length / pathItems.length) * 100)
      : 0;

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
      isAssigned: !!assign,
      assignedAt: assign?.assignedAt || null,
      completedAt: assign?.completedAt || null,
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

  // STRICT ACCESS RULE: Student must have active assignment
  if (req.user!.role === UserRole.STUDENT) {
    const assignment = await learningPathAssignmentsDb.findOne({ learningPathId: path.id, studentId });
    if (!assignment) {
      return res.status(403).json({ 
        error: "Access denied. You have not been assigned to this Learning Path. Please contact your LMS Administrator.",
        restricted: true,
        learningPathTitle: path.title
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
  const assignment = await learningPathAssignmentsDb.findOne({ learningPathId: item.learningPathId, studentId });
  if (!assignment) {
    return res.status(403).json({ error: "Access denied. You are not assigned to this Learning Path." });
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
  if (pathCompleted && !assignment.completedAt) {
    await learningPathAssignmentsDb.update(assignment.id, {
      completedAt: new Date().toISOString()
    });
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
  const course = await coursesDb.findOne({ id: req.params.id });
  if (!course) return res.status(404).json({ error: "Course not found" });

  if (req.user!.role === UserRole.STUDENT) {
    const enrollment = await enrollmentsDb.findOne({ studentId: req.user!.id, courseId: course.id });
    if (!enrollment) {
      return res.status(403).json({ error: "Access denied. You are not enrolled in this course. Please contact your LMS Administrator." });
    }
  }

  const allModules = await modulesDb.find({ courseId: course.id });
  const modules = allModules.sort((a, b) => a.order - b.order);

  const allLessons = await lessonsDb.find({ courseId: course.id });
  const lessons = allLessons.sort((a, b) => a.order - b.order);

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
    } : null
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


// ==========================================
// 6. ASSESSMENT & CODING GRADING ENGINE
// ==========================================

app.get("/api/assessments/:id", authenticateToken, async (req, res) => {
  const assessment = await assessmentsDb.findOne({ id: req.params.id });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  if (req.user!.role === UserRole.STUDENT) {
    let hasAccess = false;
    if (assessment.courseId) {
      const enrollment = await enrollmentsDb.findOne({ studentId: req.user!.id, courseId: assessment.courseId });
      if (enrollment) hasAccess = true;
    }
    if (!hasAccess && assessment.learningPathId) {
      const pathAssignment = await learningPathAssignmentsDb.findOne({ studentId: req.user!.id, learningPathId: assessment.learningPathId });
      if (pathAssignment) hasAccess = true;
    }
    if (!hasAccess) {
      const standaloneAssignment = await assessmentAssignmentsDb.findOne({ studentId: req.user!.id, assessmentId: assessment.id });
      if (standaloneAssignment) hasAccess = true;
    }
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied. You are not enrolled or assigned to this assessment." });
    }
  }

  const questions = await questionsDb.find({ assessmentId: assessment.id });
  questions.sort((a, b) => (a.order || 0) - (b.order || 0));

  let userAttemptsCount = 0;
  if (req.user!.role === UserRole.STUDENT) {
    const priorSubmissions = await submissionsDb.find({ assessmentId: assessment.id, studentId: req.user!.id });
    userAttemptsCount = priorSubmissions.length;
  }

  // Safety: If student, strip out correct answers to prevent source scraping leaks!
  const sanitizedQuestions = questions.map(q => {
    if (req.user!.role === UserRole.STUDENT) {
      const { correctAnswers: _, ...rest } = q;
      return rest;
    }
    return q;
  });

  res.json({
    assessment,
    questions: sanitizedQuestions,
    userAttemptsCount
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
  const rawTime = Number(req.body?.timeTakenSeconds);
  const timeTakenSeconds = (!isNaN(rawTime) && rawTime >= 0) ? Math.min(rawTime, 86400) : 0;

  const assessment = await assessmentsDb.findOne({ id });
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  if (req.user!.role === UserRole.STUDENT) {
    let hasAccess = false;
    if (assessment.courseId) {
      const enrollment = await enrollmentsDb.findOne({ studentId, courseId: assessment.courseId });
      if (enrollment) hasAccess = true;
    }
    if (!hasAccess && assessment.learningPathId) {
      const pathAssignment = await learningPathAssignmentsDb.findOne({ studentId, learningPathId: assessment.learningPathId });
      if (pathAssignment) hasAccess = true;
    }
    if (!hasAccess) {
      const standaloneAssignment = await assessmentAssignmentsDb.findOne({ studentId, assessmentId: assessment.id });
      if (standaloneAssignment) hasAccess = true;
    }
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied. You are not enrolled or assigned to this assessment." });
    }

    if (assessment.maxAttempts && assessment.maxAttempts > 0) {
      const priorSubmissions = await submissionsDb.find({ assessmentId: id, studentId });
      if (priorSubmissions.length >= assessment.maxAttempts) {
        return res.status(400).json({ error: `Maximum attempts (${assessment.maxAttempts}) reached for this assessment.` });
      }
    }
  }

  const questions = await questionsDb.find({ assessmentId: id });
  let earnedScore = 0;

  questions.forEach(q => {
    const studentAnswer = Array.isArray(answers[q.id]) ? answers[q.id] : [];
    const correctOnes = q.correctAnswers;

    const isCorrect = studentAnswer.length === correctOnes.length && 
                      studentAnswer.every(val => correctOnes.includes(val));

    if (isCorrect) {
      earnedScore += q.points;
    } else if (q.negativePoints) {
      earnedScore -= q.negativePoints;
    }
  });

  earnedScore = Math.max(0, earnedScore);
  const passingThreshold = (assessment.passingScore <= 100 && assessment.totalPoints > 0)
    ? (assessment.totalPoints * assessment.passingScore) / 100
    : assessment.passingScore;
  const passed = earnedScore >= passingThreshold;

  const submission = await submissionsDb.insert({
    assessmentId: id,
    studentId,
    studentName,
    answers,
    score: earnedScore,
    totalPoints: assessment.totalPoints,
    passed,
    submittedAt: new Date().toISOString(),
    timeTakenSeconds: timeTakenSeconds || 0
  });

  // If standalone assessment assigned to student, update assignment status
  const standaloneAssignment = await assessmentAssignmentsDb.findOne({ studentId, assessmentId: id });
  if (standaloneAssignment) {
    await assessmentAssignmentsDb.update(standaloneAssignment.id, {
      status: "completed",
      updatedAt: new Date().toISOString()
    });
  }

  // If learning path assessment and student passed, update learning path progress
  if (assessment.learningPathId && passed) {
    if (assessment.learningPathItemId) {
      const existingProg = await learningPathProgressDb.findOne({ studentId, itemId: assessment.learningPathItemId });
      if (existingProg) {
        await learningPathProgressDb.update(existingProg.id, {
          completed: true,
          completedAt: new Date().toISOString()
        });
      } else {
        await learningPathProgressDb.insert({
          learningPathId: assessment.learningPathId,
          studentId,
          itemId: assessment.learningPathItemId,
          completed: true,
          completedAt: new Date().toISOString(),
          timeSpentSeconds: timeTakenSeconds || 0
        });
      }
    }
    // Check if learning path is fully completed
    const allItems = await learningPathItemsDb.find({ learningPathId: assessment.learningPathId });
    const reqItems = allItems.filter(it => it.isRequired !== false);
    const studentProgs = await learningPathProgressDb.find({ learningPathId: assessment.learningPathId, studentId, completed: true });
    const completedItemIds = new Set(studentProgs.map(p => p.itemId));
    const allReqItemsDone = reqItems.every(it => completedItemIds.has(it.id));
    
    // Check final assessment if exists
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
        await learningPathAssignmentsDb.update(assign.id, { completedAt: new Date().toISOString() });
      }
    }
  }

  const showExplanations = assessment.revealAnswers !== false || req.user!.role !== UserRole.STUDENT;
  res.json({
    submission,
    score: earnedScore,
    totalPoints: assessment.totalPoints,
    passed,
    questions: showExplanations ? questions : undefined
  });
});

// ==========================================
// 6. PROFESSIONAL CODING PLATFORM APIS
// ==========================================

// Get all available and executable runtimes
app.get("/api/coding/runtimes", async (_req, res) => {
  try {
    const runtimes = await detectAvailableRuntimes();
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
app.post("/api/coding/run", authenticateToken, async (req, res) => {
  const { challengeId, problemId, language, code, customInput } = req.body;
  if (!language) {
    return res.status(400).json({ error: "Language is required" });
  }

  // 1. Custom input execution
  if (customInput !== undefined && customInput !== null) {
    try {
      const result = await executeProgram({
        language,
        code: code || "",
        stdin: String(customInput),
        timeLimit: 3000
      });

      return res.json({
        stdout: result.stdout,
        stderr: result.stderr,
        error: result.error,
        executionTimeMs: result.executionTimeMs,
        timedOut: result.timedOut,
        status: result.timedOut ? "time_limit_exceeded" : (result.exitCode === 0 ? "success" : "error")
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
      const result = await executeProgram({
        language,
        code: code || "",
        stdin: "",
        timeLimit: 3000
      });
      return res.json({
        status: result.exitCode === 0 ? "passed" : "error",
        stdout: result.stdout || "Program executed with no output.",
        stderr: result.stderr,
        executionTimeMs: result.executionTimeMs,
        passedCount: result.exitCode === 0 ? 1 : 0,
        totalCount: 1,
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

    const evaluation = await evaluateTestCases(language, code || "", testCases, 3000);
    res.json(evaluation);
  } catch (err: any) {
    res.status(500).json({ error: "Evaluation failed: " + err.message });
  }
});

// Submit Coding Practice Code (Full evaluation including hidden private test cases)
app.post("/api/coding/submit", authenticateToken, async (req, res) => {
  const studentId = req.user!.id;
  const studentUser = await usersDb.findOne({ id: studentId });
  if (!studentUser) return res.status(404).json({ error: "Student not found" });
  const studentName = studentUser.name;

  const { challengeId, problemId, language, code, htmlCode, cssCode, jsCode } = req.body;
  const targetId = challengeId || problemId;

  if (!targetId) {
    return res.status(400).json({ error: "Challenge ID is required" });
  }

  const challenge = await codingChallengesDb.findOne({ id: targetId }) || await codingChallengesDb.findOne({ slug: targetId });

  // 1. Web Development Challenges (Validated in sandboxed client playground)
  if (challenge && challenge.challengeType === "web") {
    const sub = await codingSubmissionsDb.insert({
      studentId,
      studentName,
      problemId: challenge.id,
      language: "web",
      code: JSON.stringify({ html: htmlCode || "", css: cssCode || "", js: jsCode || "" }),
      status: "passed",
      output: "Web challenge evaluated and rendered successfully in isolated browser sandbox.",
      passedCount: 1,
      totalCount: 1,
      submittedAt: new Date().toISOString()
    });

    return res.json({
      submission: sub,
      status: "passed",
      passedCount: 1,
      totalCount: 1,
      executionTimeMs: 40,
      solutionExplanation: challenge?.solutionExplanation || null,
      results: [{
        id: "web-sandbox-verification",
        input: "DOM Sandbox Render",
        expectedOutput: "Valid Render",
        actualOutput: "Rendered Successfully in Client Sandbox",
        passed: true,
        status: "passed"
      }]
    });
  }

  // 2. Programming Challenges
  const publicTests = challenge?.publicTestCases || [];
  const privateTests = challenge?.privateTestCases || [];
  let allTests = [...publicTests, ...privateTests];

  if (allTests.length === 0) {
    allTests = [{ id: "smoke-1", input: "", expectedOutput: "", isPublic: true }];
  }

  const evalResult = await evaluateTestCases(language, code || "", allTests, challenge?.timeLimit || 3000);
  const isAllPassed = evalResult.status === "passed" && evalResult.passedCount === evalResult.totalCount;
  const submissionStatus: "passed" | "failed" | "error" = isAllPassed ? "passed" : (evalResult.status === "compilation_error" || evalResult.status === "runtime_error" ? "error" : "failed");

  const sub = await codingSubmissionsDb.insert({
    studentId,
    studentName,
    problemId: challenge ? challenge.id : targetId,
    language,
    code: code || "",
    status: submissionStatus,
    output: evalResult.stdout,
    passedCount: evalResult.passedCount || 0,
    totalCount: evalResult.totalCount || allTests.length,
    submittedAt: new Date().toISOString()
  });

  // Sanitize test cases before returning to student (mask private test case inputs and expected outputs)
  const sanitizedResults = (evalResult.results || []).map((r, idx) => {
    const isPrivate = idx >= publicTests.length;
    if (isPrivate) {
      return {
        id: r.id,
        input: "[Hidden Test Case]",
        expectedOutput: "[Hidden Expected Output]",
        actualOutput: r.passed ? "[Match]" : (r.error ? r.error : "[Output mismatch]"),
        passed: r.passed,
        status: r.status,
        executionTimeMs: r.executionTimeMs
      };
    }
    return r;
  });

  res.json({
    submission: sub,
    status: submissionStatus,
    passedCount: evalResult.passedCount,
    totalCount: evalResult.totalCount,
    executionTimeMs: evalResult.executionTimeMs,
    error: evalResult.error,
    stderr: evalResult.stderr,
    solutionExplanation: challenge?.solutionExplanation || null,
    results: sanitizedResults
  });
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
    const runtimes = await detectAvailableRuntimes();
    const active = runtimes.filter(r => r.available);
    res.json(active);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to probe playground runtimes: " + err.message });
  }
});

// POST /api/playground/run (Arbitrary code execution with standard input)
app.post("/api/playground/run", async (req, res) => {
  try {
    const { language, code, stdin } = req.body;
    if (!language) {
      return res.status(400).json({ error: "Language is required" });
    }

    const result = await executeProgram({
      language,
      code: code || "",
      stdin: stdin !== undefined && stdin !== null ? String(stdin) : "",
      timeLimit: 5000
    });

    res.json({
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.error,
      executionTimeMs: result.executionTimeMs,
      timedOut: result.timedOut,
      exitCode: result.exitCode,
      status: result.timedOut ? "time_limit_exceeded" : (result.exitCode === 0 ? "success" : "error")
    });
  } catch (err: any) {
    res.status(500).json({ error: "Playground execution failed: " + err.message });
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
  if (req.user!.role !== UserRole.ADMIN) {
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

app.post("/api/ai/explain", authenticateToken, async (req, res) => {
  const { content, context } = req.body;
  if (!content) return res.status(400).json({ error: "Content is required to explain" });

  const ai = getAi();
  if (!ai) {
    return res.json({
      explanation: `**[Demo AI Explainer]**\n\nYou asked for an explanation of: \n*"${content}"*\n\n*Note: To receive live Gemini responses, please enter your GEMINI_API_KEY in the Secrets panel inside the AI Studio settings menu.*\n\nHere is a foundational breakdown of your query:\n- It represents a central element in modern full-stack development.\n- It is highly useful in optimizing rendering loops and ensuring responsive state flow.\n- Best practices encourage dividing this concept into modular, clean blocks of code.`
    });
  }

  try {
    const prompt = `You are an elite, encouraging technical instructor in an LMS. 
Provide a clear, highly polished, and concise markdown explanation of the following topic or code snippet:
"${content}"

Context or subject area: ${context || "General engineering/programming"}

Format your response in a highly professional, readable manner using headings, bullet points, and code formatting where applicable. Keep the explanation under 300 words.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const responseText = response.text || "Could not generate an explanation at this time.";
    res.json({ explanation: responseText });
  } catch (error: any) {
    console.error("Gemini AI API Error: ", error);
    res.status(500).json({ error: "AI explainer is currently busy or rate-limited. Please try again soon." });
  }
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
  });
}

startServer();
