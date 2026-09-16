/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import { pool } from "./mysql.js";
import { CODING_CHAPTERS, CODING_TOPICS, CODING_CHALLENGES_EXPANSION } from "./codingSeedData.js";

const DATA_DIR = path.join(process.cwd(), "data");

async function fileExistsAndNotEmpty(filepath: string): Promise<boolean> {
  if (!fs.existsSync(filepath)) return false;
  const content = await fs.promises.readFile(filepath, "utf-8");
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed.length > 0 : Object.keys(parsed).length > 0;
  } catch (e) {
    return false;
  }
}

async function loadJsonFile<T>(filename: string): Promise<T[]> {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) return [];
  const content = await fs.promises.readFile(filepath, "utf-8");
  try {
    return JSON.parse(content) as T[];
  } catch (e) {
    console.error(`Error parsing JSON file ${filename}:`, e);
    return [];
  }
}

export async function initializeDatabase() {
  console.log("Initializing MySQL database schema...");
  
  // Create database if not exists
  const dbName = process.env.DB_NAME || "mrtechlms";
  const initConnection = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    port: Number(process.env.DB_PORT) || 3306,
  });
  await initConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await initConnection.end();

  // 1. Create Tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      role ENUM('student', 'trainer', 'admin') NOT NULL,
      profilePhoto TEXT NULL,
      createdAt VARCHAR(50) NOT NULL,
      status ENUM('active', 'suspended') DEFAULT 'active',
      bookmarkedBlogIds JSON NULL,
      passwordHash VARCHAR(255) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      shortDescription TEXT NULL,
      difficulty VARCHAR(50) DEFAULT 'Beginner',
      thumbnail TEXT NULL,
      banner TEXT NULL,
      instructorId VARCHAR(36) NOT NULL,
      instructorName VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      requirements JSON NULL,
      skillsCovered JSON NULL,
      status ENUM('draft', 'published', 'rejected', 'archived') DEFAULT 'draft',
      isFeatured BOOLEAN DEFAULT FALSE,
      rating DECIMAL(3,2) DEFAULT 5.0,
      reviewsCount INT DEFAULT 0,
      createdAt VARCHAR(50) NOT NULL,
      FOREIGN KEY (instructorId) REFERENCES users(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS modules (
      id VARCHAR(36) PRIMARY KEY,
      courseId VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      \`order\` INT NOT NULL,
      FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lessons (
      id VARCHAR(36) PRIMARY KEY,
      moduleId VARCHAR(36) NOT NULL,
      courseId VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      type ENUM('video', 'pdf', 'image', 'text', 'coding') NOT NULL,
      content TEXT NULL,
      videoUrl TEXT NULL,
      fileUrl TEXT NULL,
      materialTitle VARCHAR(255) NULL,
      materialUrl TEXT NULL,
      codingPrompt JSON NULL,
      \`order\` INT NOT NULL,
      durationMinutes INT NOT NULL,
      FOREIGN KEY (moduleId) REFERENCES modules(id) ON DELETE CASCADE,
      FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id VARCHAR(36) PRIMARY KEY,
      studentId VARCHAR(36) NOT NULL,
      courseId VARCHAR(36) NOT NULL,
      enrolledAt VARCHAR(50) NOT NULL,
      completedAt VARCHAR(50) NULL,
      FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE,
      UNIQUE KEY student_course_uniq (studentId, courseId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS progress (
      id VARCHAR(36) PRIMARY KEY,
      studentId VARCHAR(36) NOT NULL,
      courseId VARCHAR(36) NOT NULL,
      lessonId VARCHAR(36) NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      completedAt VARCHAR(50) NULL,
      timeSpentSeconds INT DEFAULT 0,
      FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (lessonId) REFERENCES lessons(id) ON DELETE CASCADE,
      UNIQUE KEY student_lesson_uniq (studentId, lessonId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS assessments (
      id VARCHAR(36) PRIMARY KEY,
      courseId VARCHAR(36) NOT NULL,
      moduleId VARCHAR(36) NULL,
      lessonId VARCHAR(36) NULL,
      type ENUM('lesson_practice', 'course_final') DEFAULT 'course_final',
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      durationMinutes INT NOT NULL,
      passingScore INT NOT NULL,
      totalPoints INT NOT NULL,
      questionsCount INT NOT NULL,
      createdAt VARCHAR(50) NOT NULL,
      status ENUM('published', 'draft') DEFAULT 'draft',
      FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (moduleId) REFERENCES modules(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id VARCHAR(36) PRIMARY KEY,
      assessmentId VARCHAR(36) NOT NULL,
      type ENUM('mcq_single', 'mcq_multi', 'true_false', 'fill_blanks', 'subjective') NOT NULL,
      questionText TEXT NOT NULL,
      options JSON NULL,
      correctAnswers JSON NOT NULL,
      explanation TEXT NULL,
      points INT NOT NULL,
      negativePoints INT DEFAULT 0,
      difficulty VARCHAR(50) DEFAULT 'medium',
      \`order\` INT DEFAULT 1,
      FOREIGN KEY (assessmentId) REFERENCES assessments(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id VARCHAR(36) PRIMARY KEY,
      assessmentId VARCHAR(36) NOT NULL,
      studentId VARCHAR(36) NOT NULL,
      studentName VARCHAR(255) NOT NULL,
      answers JSON NOT NULL,
      score INT NOT NULL,
      totalPoints INT NOT NULL,
      passed BOOLEAN NOT NULL,
      submittedAt VARCHAR(50) NOT NULL,
      timeTakenSeconds INT NOT NULL,
      FOREIGN KEY (assessmentId) REFERENCES assessments(id) ON DELETE CASCADE,
      FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS coding_submissions (
      id VARCHAR(36) PRIMARY KEY,
      studentId VARCHAR(36) NOT NULL,
      studentName VARCHAR(255) NOT NULL,
      problemId VARCHAR(100) NOT NULL,
      language VARCHAR(50) NOT NULL,
      code TEXT NOT NULL,
      status ENUM('passed', 'failed', 'error') NOT NULL,
      output TEXT NULL,
      passedCount INT NOT NULL,
      totalCount INT NOT NULL,
      submittedAt VARCHAR(50) NOT NULL,
      FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS coding_challenges (
      id VARCHAR(100) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE,
      description TEXT NOT NULL,
      difficulty ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'easy',
      category VARCHAR(100) NOT NULL DEFAULT 'General',
      challengeType ENUM('programming', 'web') NOT NULL DEFAULT 'programming',
      supportedLanguages JSON NOT NULL,
      starterCode JSON NOT NULL,
      htmlStarterCode TEXT NULL,
      cssStarterCode TEXT NULL,
      javascriptStarterCode TEXT NULL,
      inputFormat TEXT NULL,
      outputFormat TEXT NULL,
      constraints TEXT NULL,
      examples JSON NULL,
      publicTestCases JSON NOT NULL,
      privateTestCases JSON NOT NULL,
      hints JSON NULL,
      solutionExplanation TEXT NULL,
      timeLimit INT NOT NULL DEFAULT 3000,
      memoryLimit INT NOT NULL DEFAULT 256,
      createdAt VARCHAR(50) NOT NULL,
      updatedAt VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS coding_saved_code (
      id VARCHAR(100) PRIMARY KEY,
      studentId VARCHAR(36) NOT NULL,
      challengeId VARCHAR(100) NOT NULL,
      language VARCHAR(50) NOT NULL,
      code TEXT NULL,
      htmlCode TEXT NULL,
      cssCode TEXT NULL,
      jsCode TEXT NULL,
      updatedAt VARCHAR(50) NOT NULL,
      FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY uk_student_challenge_lang (studentId, challengeId, language)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS coding_chapters (
      id VARCHAR(100) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      description TEXT NULL,
      icon VARCHAR(50) NULL,
      orderIndex INT NOT NULL DEFAULT 1,
      createdAt VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS coding_topics (
      id VARCHAR(100) PRIMARY KEY,
      chapterId VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      description TEXT NULL,
      orderIndex INT NOT NULL DEFAULT 1,
      createdAt VARCHAR(50) NOT NULL,
      FOREIGN KEY (chapterId) REFERENCES coding_chapters(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_playground_programs (
      id VARCHAR(100) PRIMARY KEY,
      studentId VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      language VARCHAR(50) NOT NULL,
      code TEXT NOT NULL,
      input TEXT NULL,
      createdAt VARCHAR(50) NOT NULL,
      updatedAt VARCHAR(50) NOT NULL,
      FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS blogs (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      summary TEXT NOT NULL,
      coverImage TEXT NULL,
      authorId VARCHAR(36) NOT NULL,
      authorName VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      tags JSON NULL,
      likesCount INT DEFAULT 0,
      bookmarksCount INT DEFAULT 0,
      status ENUM('published', 'draft') DEFAULT 'draft',
      createdAt VARCHAR(50) NOT NULL,
      FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id VARCHAR(36) PRIMARY KEY,
      blogId VARCHAR(36) NOT NULL,
      authorId VARCHAR(36) NOT NULL,
      authorName VARCHAR(255) NOT NULL,
      authorRole ENUM('student', 'trainer', 'admin') NOT NULL,
      content TEXT NOT NULL,
      createdAt VARCHAR(50) NOT NULL,
      FOREIGN KEY (blogId) REFERENCES blogs(id) ON DELETE CASCADE,
      FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id VARCHAR(36) PRIMARY KEY,
      courseId VARCHAR(36) NOT NULL,
      studentId VARCHAR(36) NOT NULL,
      studentName VARCHAR(255) NOT NULL,
      rating INT NOT NULL,
      comment TEXT NOT NULL,
      createdAt VARCHAR(50) NOT NULL,
      FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY student_course_review (studentId, courseId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id VARCHAR(36) PRIMARY KEY,
      userId VARCHAR(36) UNIQUE NOT NULL,
      theme VARCHAR(50) NOT NULL DEFAULT 'default-blue',
      primaryColor VARCHAR(50) NOT NULL DEFAULT '#2563eb',
      secondaryColor VARCHAR(50) NOT NULL DEFAULT '#4f46e5',
      backgroundColor VARCHAR(50) NOT NULL DEFAULT '#f8fafc',
      surfaceColor VARCHAR(50) NOT NULL DEFAULT '#ffffff',
      textColor VARCHAR(50) NOT NULL DEFAULT '#0f172a',
      mode ENUM('light', 'dark') NOT NULL DEFAULT 'light',
      createdAt VARCHAR(50) NOT NULL,
      updatedAt VARCHAR(50) NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_paths (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      shortDescription TEXT NULL,
      description TEXT NOT NULL,
      category VARCHAR(100) NOT NULL,
      difficulty VARCHAR(50) DEFAULT 'Beginner',
      thumbnail TEXT NULL,
      estimatedDuration VARCHAR(50) NULL,
      requirements JSON NULL,
      learningObjectives JSON NULL,
      status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
      authorId VARCHAR(36) NOT NULL,
      authorName VARCHAR(255) NOT NULL,
      finalAssessmentId VARCHAR(36) NULL,
      createdAt VARCHAR(50) NOT NULL,
      updatedAt VARCHAR(50) NOT NULL,
      FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_path_sections (
      id VARCHAR(36) PRIMARY KEY,
      learningPathId VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      \`order\` INT NOT NULL,
      createdAt VARCHAR(50) NOT NULL,
      FOREIGN KEY (learningPathId) REFERENCES learning_paths(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_path_items (
      id VARCHAR(36) PRIMARY KEY,
      sectionId VARCHAR(36) NOT NULL,
      learningPathId VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      type ENUM('text', 'video', 'pdf', 'assessment') NOT NULL,
      \`order\` INT NOT NULL,
      durationMinutes INT NOT NULL DEFAULT 10,
      isRequired BOOLEAN DEFAULT TRUE,
      content LONGTEXT NULL,
      videoSource ENUM('youtube', 'vimeo', 'upload') NULL,
      videoUrl TEXT NULL,
      fileUrl TEXT NULL,
      fileName VARCHAR(255) NULL,
      assessmentId VARCHAR(36) NULL,
      createdAt VARCHAR(50) NOT NULL,
      updatedAt VARCHAR(50) NOT NULL,
      FOREIGN KEY (sectionId) REFERENCES learning_path_sections(id) ON DELETE CASCADE,
      FOREIGN KEY (learningPathId) REFERENCES learning_paths(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_path_assignments (
      id VARCHAR(36) PRIMARY KEY,
      learningPathId VARCHAR(36) NOT NULL,
      studentId VARCHAR(36) NOT NULL,
      assignedBy VARCHAR(36) NOT NULL,
      assignedAt VARCHAR(50) NOT NULL,
      completedAt VARCHAR(50) NULL,
      FOREIGN KEY (learningPathId) REFERENCES learning_paths(id) ON DELETE CASCADE,
      FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (assignedBy) REFERENCES users(id) ON DELETE RESTRICT,
      UNIQUE KEY student_path_uniq (learningPathId, studentId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_path_progress (
      id VARCHAR(36) PRIMARY KEY,
      learningPathId VARCHAR(36) NOT NULL,
      studentId VARCHAR(36) NOT NULL,
      itemId VARCHAR(36) NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      completedAt VARCHAR(50) NULL,
      timeSpentSeconds INT DEFAULT 0,
      FOREIGN KEY (learningPathId) REFERENCES learning_paths(id) ON DELETE CASCADE,
      FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (itemId) REFERENCES learning_path_items(id) ON DELETE CASCADE,
      UNIQUE KEY student_path_item_uniq (studentId, itemId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS assessment_assignments (
      id VARCHAR(36) PRIMARY KEY,
      assessmentId VARCHAR(36) NOT NULL,
      studentId VARCHAR(36) NOT NULL,
      assignedBy VARCHAR(36) NOT NULL,
      assignedAt VARCHAR(50) NOT NULL,
      dueDate VARCHAR(50) NULL,
      status ENUM('assigned', 'in_progress', 'completed') DEFAULT 'assigned',
      createdAt VARCHAR(50) NOT NULL,
      updatedAt VARCHAR(50) NOT NULL,
      FOREIGN KEY (assessmentId) REFERENCES assessments(id) ON DELETE CASCADE,
      FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (assignedBy) REFERENCES users(id) ON DELETE RESTRICT,
      UNIQUE KEY student_assessment_uniq (assessmentId, studentId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Helper to add column safely if it does not exist
  const addColumnIfNotExists = async (table: string, column: string, columnDef: string) => {
    try {
      const [rows]: any = await pool.query(
        `SELECT COUNT(*) as count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
        [table, column]
      );
      if (rows[0].count === 0) {
        await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${columnDef}`);
        console.log(`[Migration] Added column ${column} to table ${table}`);
      }
    } catch (err) {
      console.error(`[Migration Error] Failed to check/add column ${column} to table ${table}:`, err);
    }
  };

  // Safe schema updates for existing database tables
  await addColumnIfNotExists("courses", "shortDescription", "TEXT NULL");
  await addColumnIfNotExists("courses", "difficulty", "VARCHAR(50) NOT NULL DEFAULT 'Beginner'");
  try {
    await pool.query("ALTER TABLE `courses` MODIFY COLUMN `status` ENUM('draft', 'published', 'rejected', 'archived') DEFAULT 'draft'");
  } catch (err) {
    console.error("[Migration] Could not modify courses.status enum:", err);
  }

  await addColumnIfNotExists("modules", "description", "TEXT NULL");
  await addColumnIfNotExists("lessons", "description", "TEXT NULL");
  await addColumnIfNotExists("lessons", "materialTitle", "VARCHAR(255) NULL");
  await addColumnIfNotExists("lessons", "materialUrl", "TEXT NULL");

  await addColumnIfNotExists("assessments", "lessonId", "VARCHAR(36) NULL");
  await addColumnIfNotExists("assessments", "learningPathId", "VARCHAR(36) NULL");
  await addColumnIfNotExists("assessments", "learningPathItemId", "VARCHAR(36) NULL");
  await addColumnIfNotExists("assessments", "shortDescription", "TEXT NULL");
  await addColumnIfNotExists("assessments", "instructions", "TEXT NULL");
  await addColumnIfNotExists("assessments", "category", "VARCHAR(100) NOT NULL DEFAULT 'General'");
  await addColumnIfNotExists("assessments", "difficulty", "VARCHAR(50) NOT NULL DEFAULT 'medium'");
  await addColumnIfNotExists("assessments", "assessmentType", "VARCHAR(50) NOT NULL DEFAULT 'practice_test'");
  await addColumnIfNotExists("assessments", "maxAttempts", "INT NOT NULL DEFAULT 1");
  await addColumnIfNotExists("assessments", "questionNavigation", "ENUM('free', 'sequential') DEFAULT 'free'");
  await addColumnIfNotExists("assessments", "randomizeQuestions", "BOOLEAN DEFAULT FALSE");
  await addColumnIfNotExists("assessments", "randomizeOptions", "BOOLEAN DEFAULT FALSE");
  await addColumnIfNotExists("assessments", "revealAnswers", "BOOLEAN DEFAULT TRUE");
  await addColumnIfNotExists("assessments", "authorId", "VARCHAR(36) NULL");
  await addColumnIfNotExists("assessments", "authorName", "VARCHAR(255) NULL");
  await addColumnIfNotExists("assessments", "updatedAt", "VARCHAR(50) NULL");
  try {
    await pool.query("ALTER TABLE `assessments` MODIFY COLUMN `courseId` VARCHAR(36) NULL");
  } catch (err) {
    console.error("[Migration] Could not make assessments.courseId nullable:", err);
  }
  try {
    await pool.query("ALTER TABLE `assessments` MODIFY COLUMN `status` ENUM('published', 'draft', 'archived') DEFAULT 'draft'");
  } catch (err) {
    console.error("[Migration] Could not update assessments.status enum:", err);
  }
  try {
    await pool.query("ALTER TABLE `assessments` MODIFY COLUMN `type` ENUM('lesson_practice', 'course_final', 'path_practice', 'path_final', 'standalone') DEFAULT 'standalone'");
  } catch (err) {
    console.error("[Migration] Could not update assessments.type enum:", err);
  }

  await addColumnIfNotExists("questions", "explanation", "TEXT NULL");
  await addColumnIfNotExists("questions", "difficulty", "VARCHAR(50) NOT NULL DEFAULT 'medium'");
  await addColumnIfNotExists("questions", "order", "INT NOT NULL DEFAULT 1");

  await addColumnIfNotExists("coding_challenges", "chapterId", "VARCHAR(100) NULL");
  await addColumnIfNotExists("coding_challenges", "topicId", "VARCHAR(100) NULL");
  await addColumnIfNotExists("coding_challenges", "orderIndex", "INT NOT NULL DEFAULT 1");

  console.log("MySQL tables and authoring schema configured successfully.");

  // 2. Perform Migration of Mock JSON data if tables are empty
  const [usersCountResult]: any = await pool.query("SELECT COUNT(*) as count FROM users");
  if (usersCountResult[0].count === 0) {
    console.log("MySQL database is empty. Starting migration of JSON mock data...");

    // Migrate Users
    const jsonUsers = await loadJsonFile<any>("users.json");
    for (const u of jsonUsers) {
      await pool.query(
        "INSERT INTO users (id, name, email, role, profilePhoto, createdAt, status, bookmarkedBlogIds, passwordHash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [u.id, u.name, u.email, u.role, u.profilePhoto || null, u.createdAt, u.status, JSON.stringify(u.bookmarkedBlogIds || []), u.passwordHash]
      );
    }
    console.log(`Migrated ${jsonUsers.length} users.`);

    // Migrate Courses
    const jsonCourses = await loadJsonFile<any>("courses.json");
    for (const c of jsonCourses) {
      await pool.query(
        "INSERT INTO courses (id, title, description, thumbnail, banner, instructorId, instructorName, category, requirements, skillsCovered, status, isFeatured, rating, reviewsCount, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [c.id, c.title, c.description, c.thumbnail || null, c.banner || null, c.instructorId, c.instructorName, c.category, JSON.stringify(c.requirements || []), JSON.stringify(c.skillsCovered || []), c.status || "published", c.isFeatured || false, c.rating || 5.0, c.reviewsCount || 0, c.createdAt]
      );
    }
    console.log(`Migrated ${jsonCourses.length} courses.`);

    // Migrate Modules
    const jsonModules = await loadJsonFile<any>("modules.json");
    for (const m of jsonModules) {
      await pool.query(
        "INSERT INTO modules (id, courseId, title, \`order\`) VALUES (?, ?, ?, ?)",
        [m.id, m.courseId, m.title, m.order]
      );
    }
    console.log(`Migrated ${jsonModules.length} modules.`);

    // Migrate Lessons
    const jsonLessons = await loadJsonFile<any>("lessons.json");
    for (const l of jsonLessons) {
      await pool.query(
        "INSERT INTO lessons (id, moduleId, courseId, title, type, content, videoUrl, fileUrl, codingPrompt, \`order\`, durationMinutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [l.id, l.moduleId, l.courseId, l.title, l.type, l.content || null, l.videoUrl || null, l.fileUrl || null, l.codingPrompt ? JSON.stringify(l.codingPrompt) : null, l.order, l.durationMinutes]
      );
    }
    console.log(`Migrated ${jsonLessons.length} lessons.`);

    // Migrate Enrollments
    const jsonEnrollments = await loadJsonFile<any>("enrollments.json");
    for (const e of jsonEnrollments) {
      await pool.query(
        "INSERT INTO enrollments (id, studentId, courseId, enrolledAt, completedAt) VALUES (?, ?, ?, ?, ?)",
        [e.id, e.studentId, e.courseId, e.enrolledAt, e.completedAt || null]
      );
    }
    console.log(`Migrated ${jsonEnrollments.length} enrollments.`);

    // Migrate Progress
    const jsonProgress = await loadJsonFile<any>("progress.json");
    for (const p of jsonProgress) {
      await pool.query(
        "INSERT INTO progress (id, studentId, courseId, lessonId, completed, completedAt, timeSpentSeconds) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [p.id, p.studentId, p.courseId, p.lessonId, p.completed || false, p.completedAt || null, p.timeSpentSeconds || 0]
      );
    }
    console.log(`Migrated ${jsonProgress.length} progress logs.`);

    // Migrate Assessments
    const jsonAssessments = await loadJsonFile<any>("assessments.json");
    for (const a of jsonAssessments) {
      await pool.query(
        "INSERT INTO assessments (id, courseId, moduleId, title, description, durationMinutes, passingScore, totalPoints, questionsCount, createdAt, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [a.id, a.courseId, a.moduleId || null, a.title, a.description, a.durationMinutes, a.passingScore, a.totalPoints, a.questionsCount, a.createdAt, a.status]
      );
    }
    console.log(`Migrated ${jsonAssessments.length} assessments.`);

    // Migrate Questions
    const jsonQuestions = await loadJsonFile<any>("questions.json");
    for (const q of jsonQuestions) {
      await pool.query(
        "INSERT INTO questions (id, assessmentId, type, questionText, options, correctAnswers, points, negativePoints) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [q.id, q.assessmentId, q.type, q.questionText, q.options ? JSON.stringify(q.options) : null, JSON.stringify(q.correctAnswers || []), q.points, q.negativePoints || 0]
      );
    }
    console.log(`Migrated ${jsonQuestions.length} questions.`);

    // Migrate Submissions
    const jsonSubmissions = await loadJsonFile<any>("submissions.json");
    for (const s of jsonSubmissions) {
      await pool.query(
        "INSERT INTO submissions (id, assessmentId, studentId, studentName, answers, score, totalPoints, passed, submittedAt, timeTakenSeconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [s.id, s.assessmentId, s.studentId, s.studentName, JSON.stringify(s.answers || {}), s.score, s.totalPoints, s.passed, s.submittedAt, s.timeTakenSeconds]
      );
    }
    console.log(`Migrated ${jsonSubmissions.length} submissions.`);

    // Migrate Coding Submissions
    const jsonCodingSub = await loadJsonFile<any>("coding_submissions.json");
    for (const cs of jsonCodingSub) {
      await pool.query(
        "INSERT INTO coding_submissions (id, studentId, studentName, problemId, language, code, status, output, passedCount, totalCount, submittedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [cs.id, cs.studentId, cs.studentName, cs.problemId, cs.language, cs.code, cs.status, cs.output || null, cs.passedCount, cs.totalCount, cs.submittedAt]
      );
    }
    console.log(`Migrated ${jsonCodingSub.length} coding submissions.`);

    // Migrate Blogs
    const jsonBlogs = await loadJsonFile<any>("blogs.json");
    for (const b of jsonBlogs) {
      await pool.query(
        "INSERT INTO blogs (id, title, content, summary, coverImage, authorId, authorName, category, tags, likesCount, bookmarksCount, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [b.id, b.title, b.content, b.summary, b.coverImage || null, b.authorId, b.authorName, b.category, JSON.stringify(b.tags || []), b.likesCount || 0, b.bookmarksCount || 0, b.status, b.createdAt]
      );
    }
    console.log(`Migrated ${jsonBlogs.length} blogs.`);

    // Migrate Comments
    const jsonComments = await loadJsonFile<any>("comments.json");
    for (const c of jsonComments) {
      await pool.query(
        "INSERT INTO comments (id, blogId, authorId, authorName, authorRole, content, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [c.id, c.blogId, c.authorId, c.authorName, c.authorRole, c.content, c.createdAt]
      );
    }
    console.log(`Migrated ${jsonComments.length} comments.`);

    // Migrate Reviews
    const jsonReviews = await loadJsonFile<any>("reviews.json");
    for (const r of jsonReviews) {
      await pool.query(
        "INSERT INTO reviews (id, courseId, studentId, studentName, rating, comment, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [r.id, r.courseId, r.studentId, r.studentName, r.rating, r.comment, r.createdAt]
      );
    }
    console.log(`Migrated ${jsonReviews.length} reviews.`);

    console.log("Migration complete!");
  } else {
    console.log("MySQL database already populated. Skipping JSON data migration.");
  }

  // Ensure default coding challenges are seeded
  await seedCodingChallenges(pool);
  await seedCodingHierarchy(pool);
}

async function seedCodingChallenges(pool: any) {
  const [rows]: any = await pool.query("SELECT COUNT(*) as count FROM coding_challenges");
  if (rows && rows[0] && rows[0].count > 0) {
    console.log(`Coding challenges already seeded (${rows[0].count} challenges present).`);
    return;
  }

  console.log("Seeding default coding challenges (Programming & Web Development)...");

  const challenges = [
    {
      id: "challenge-two-sum",
      title: "Two Sum",
      slug: "two-sum",
      description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nPrint the two space-separated indices in ascending order.",
      difficulty: "easy",
      category: "Arrays & Hashing",
      challengeType: "programming",
      supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
      starterCode: JSON.stringify({
        python: "import sys\n\ndef two_sum(nums, target):\n    # Write your solution here\n    seen = {}\n    for i, num in enumerate(nums):\n        comp = target - num\n        if comp in seen:\n            return f\"{seen[comp]} {i}\"\n        seen[num] = i\n    return \"\"\n\nif __name__ == \"__main__\":\n    lines = sys.stdin.read().strip().splitlines()\n    if len(lines) >= 2:\n        nums = [int(x) for x in lines[0].split()]\n        target = int(lines[1])\n        print(two_sum(nums, target))\n",
        javascript: "const fs = require('fs');\n\nfunction twoSum(nums, target) {\n    // Write your solution here\n    const seen = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const comp = target - nums[i];\n        if (seen.has(comp)) {\n            return `${seen.get(comp)} ${i}`;\n        }\n        seen.set(nums[i], i);\n    }\n    return \"\";\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim().split('\\n');\nif (input.length >= 2) {\n    const nums = input[0].trim().split(/\\s+/).map(Number);\n    const target = Number(input[1].trim());\n    console.log(twoSum(nums, target));\n}\n",
        java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String[] parts = sc.nextLine().trim().split(\"\\\\s+\");\n        int[] nums = new int[parts.length];\n        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);\n        if (!sc.hasNextInt()) return;\n        int target = sc.nextInt();\n        \n        Map<Integer, Integer> seen = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int comp = target - nums[i];\n            if (seen.containsKey(comp)) {\n                System.out.println(seen.get(comp) + \" \" + i);\n                return;\n            }\n            seen.put(nums[i], i);\n        }\n    }\n}\n"
      }),
      htmlStarterCode: null,
      cssStarterCode: null,
      javascriptStarterCode: null,
      inputFormat: "Line 1: space-separated integers for nums\nLine 2: single target integer",
      outputFormat: "Two space-separated indices (e.g. '0 1')",
      constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9",
      examples: JSON.stringify([
        { input: "2 7 11 15\n9", output: "0 1", explanation: "nums[0] + nums[1] == 9, so output is 0 1" },
        { input: "3 2 4\n6", output: "1 2", explanation: "nums[1] + nums[2] == 6, so output is 1 2" }
      ]),
      publicTestCases: JSON.stringify([
        { id: "tc-1", input: "2 7 11 15\n9", expectedOutput: "0 1", isPublic: true },
        { id: "tc-2", input: "3 2 4\n6", expectedOutput: "1 2", isPublic: true }
      ]),
      privateTestCases: JSON.stringify([
        { id: "tc-3", input: "3 3\n6", expectedOutput: "0 1", isPublic: false },
        { id: "tc-4", input: "1 5 8 12 14\n20", expectedOutput: "2 3", isPublic: false },
        { id: "tc-5", input: "-1 -2 -3 -4 -5\n-8", expectedOutput: "2 4", isPublic: false }
      ]),
      hints: JSON.stringify([
        "A brute force approach checks all pairs in O(n^2) time.",
        "Can you use a hash map to store previously seen numbers and their indices in O(n) time?"
      ]),
      solutionExplanation: "Iterate through the array while maintaining a hash map of value -> index. For each element x, check if target - x is already in the map. If so, return its index and current index.",
      timeLimit: 3000,
      memoryLimit: 256,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "challenge-prime",
      title: "Check If Prime Number",
      slug: "check-if-prime",
      description: "Given an integer `n`, determine whether `n` is a prime number. A prime number is a natural number strictly greater than 1 that has no positive divisors other than 1 and itself.\n\nPrint `true` if `n` is prime, and `false` otherwise.",
      difficulty: "easy",
      category: "Mathematics",
      challengeType: "programming",
      supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
      starterCode: JSON.stringify({
        python: "import sys\n\ndef is_prime(n):\n    # Write your logic here\n    if n <= 1: return False\n    if n <= 3: return True\n    if n % 2 == 0 or n % 3 == 0: return False\n    i = 5\n    while i * i <= n:\n        if n % i == 0 or n % (i + 2) == 0: return False\n        i += 6\n    return True\n\nif __name__ == \"__main__\":\n    line = sys.stdin.read().strip()\n    if line:\n        n = int(line)\n        print(\"true\" if is_prime(n) else \"false\")\n",
        javascript: "const fs = require('fs');\n\nfunction isPrime(n) {\n    // Write your logic here\n    if (n <= 1) return false;\n    if (n <= 3) return true;\n    if (n % 2 === 0 || n % 3 === 0) return false;\n    for (let i = 5; i * i <= n; i += 6) {\n        if (n % i === 0 || n % (i + 2) === 0) return false;\n    }\n    return true;\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif (input) {\n    const n = Number(input);\n    console.log(isPrime(n) ? \"true\" : \"false\");\n}\n",
        java: "import java.util.*;\n\npublic class Solution {\n    public static boolean isPrime(long n) {\n        if (n <= 1) return false;\n        if (n <= 3) return true;\n        if (n % 2 == 0 || n % 3 == 0) return false;\n        for (long i = 5; i * i <= n; i += 6) {\n            if (n % i == 0 || n % (i + 2) == 0) return false;\n        }\n        return true;\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextLong()) {\n            long n = sc.nextLong();\n            System.out.println(isPrime(n) ? \"true\" : \"false\");\n        }\n    }\n}\n"
      }),
      htmlStarterCode: null,
      cssStarterCode: null,
      javascriptStarterCode: null,
      inputFormat: "Single integer n",
      outputFormat: "'true' or 'false'",
      constraints: "-10^9 <= n <= 10^9",
      examples: JSON.stringify([
        { input: "5", output: "true" },
        { input: "4", output: "false" }
      ]),
      publicTestCases: JSON.stringify([
        { id: "tc-1", input: "5", expectedOutput: "true", isPublic: true },
        { id: "tc-2", input: "4", expectedOutput: "false", isPublic: true }
      ]),
      privateTestCases: JSON.stringify([
        { id: "tc-3", input: "1", expectedOutput: "false", isPublic: false },
        { id: "tc-4", input: "2", expectedOutput: "true", isPublic: false },
        { id: "tc-5", input: "29", expectedOutput: "true", isPublic: false },
        { id: "tc-6", input: "100", expectedOutput: "false", isPublic: false }
      ]),
      hints: JSON.stringify([
        "Numbers less than or equal to 1 are not prime.",
        "2 is the only even prime number.",
        "You only need to check divisors up to the square root of n."
      ]),
      solutionExplanation: "Check base cases, then skip multiples of 2 and 3. Loop from 5 up to sqrt(n) with step 6.",
      timeLimit: 3000,
      memoryLimit: 256,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "challenge-palindrome",
      title: "Valid Palindrome String",
      slug: "valid-palindrome",
      description: "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.\n\nPrint `true` if the input is a valid palindrome, and `false` otherwise.",
      difficulty: "easy",
      category: "Strings",
      challengeType: "programming",
      supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
      starterCode: JSON.stringify({
        python: "import sys\nimport re\n\ndef is_palindrome(s):\n    cleaned = re.sub(r'[^a-zA-Z0-9]', '', s).lower()\n    return cleaned == cleaned[::-1]\n\nif __name__ == \"__main__\":\n    s = sys.stdin.read().rstrip('\\r\\n')\n    print(\"true\" if is_palindrome(s) else \"false\")\n",
        javascript: "const fs = require('fs');\n\nfunction isPalindrome(s) {\n    const cleaned = s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();\n    return cleaned === cleaned.split('').reverse().join('');\n}\n\nconst input = fs.readFileSync(0, 'utf-8').replace(/[\\r\\n]+$/, '');\nconsole.log(isPalindrome(input) ? \"true\" : \"false\");\n",
        java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.hasNextLine() ? sc.nextLine() : \"\";\n        String cleaned = s.replaceAll(\"[^a-zA-Z0-9]\", \"\").toLowerCase();\n        String rev = new StringBuilder(cleaned).reverse().toString();\n        System.out.println(cleaned.equals(rev) ? \"true\" : \"false\");\n    }\n}\n"
      }),
      htmlStarterCode: null,
      cssStarterCode: null,
      javascriptStarterCode: null,
      inputFormat: "Single line string",
      outputFormat: "'true' or 'false'",
      constraints: "1 <= s.length <= 10^5",
      examples: JSON.stringify([
        { input: "racecar", output: "true" },
        { input: "hello", output: "false" }
      ]),
      publicTestCases: JSON.stringify([
        { id: "tc-1", input: "racecar", expectedOutput: "true", isPublic: true },
        { id: "tc-2", input: "hello", expectedOutput: "false", isPublic: true }
      ]),
      privateTestCases: JSON.stringify([
        { id: "tc-3", input: "A man a plan a canal Panama", expectedOutput: "true", isPublic: false },
        { id: "tc-4", input: "0P", expectedOutput: "false", isPublic: false }
      ]),
      hints: JSON.stringify(["Filter out non-alphanumerics and compare string with its reverse."]),
      solutionExplanation: "Sanitize characters to lowercase alphanumeric and test two pointers or reversed string equality.",
      timeLimit: 3000,
      memoryLimit: 256,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "challenge-reverse-words",
      title: "Reverse Words in a String",
      slug: "reverse-words",
      description: "Given an input string `s`, reverse the order of the words.\n\nA word is defined as a sequence of non-space characters. The words in `s` will be separated by at least one space.\n\nReturn a string of the words in reverse order concatenated by a single space.",
      difficulty: "medium",
      category: "Strings",
      challengeType: "programming",
      supportedLanguages: JSON.stringify(["python", "javascript", "java"]),
      starterCode: JSON.stringify({
        python: "import sys\n\ndef reverse_words(s):\n    words = s.strip().split()\n    return \" \".join(reversed(words))\n\nif __name__ == \"__main__\":\n    s = sys.stdin.read().strip()\n    print(reverse_words(s))\n",
        javascript: "const fs = require('fs');\n\nfunction reverseWords(s) {\n    return s.trim().split(/\\s+/).reverse().join(' ');\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim();\nconsole.log(reverseWords(input));\n",
        java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.hasNextLine() ? sc.nextLine().trim() : \"\";\n        String[] parts = s.split(\"\\\\s+\");\n        StringBuilder sb = new StringBuilder();\n        for (int i = parts.length - 1; i >= 0; i--) {\n            sb.append(parts[i]);\n            if (i > 0) sb.append(\" \");\n        }\n        System.out.println(sb.toString().trim());\n    }\n}\n"
      }),
      htmlStarterCode: null,
      cssStarterCode: null,
      javascriptStarterCode: null,
      inputFormat: "Single string containing words separated by whitespace",
      outputFormat: "Single string with words reversed and single spaced",
      constraints: "1 <= s.length <= 10^4",
      examples: JSON.stringify([
        { input: "the sky is blue", output: "blue is sky the" },
        { input: "  hello world  ", output: "world hello" }
      ]),
      publicTestCases: JSON.stringify([
        { id: "tc-1", input: "the sky is blue", expectedOutput: "blue is sky the", isPublic: true },
        { id: "tc-2", input: "  hello world  ", expectedOutput: "world hello", isPublic: true }
      ]),
      privateTestCases: JSON.stringify([
        { id: "tc-3", input: "a good   example", expectedOutput: "example good a", isPublic: false },
        { id: "tc-4", input: "single", expectedOutput: "single", isPublic: false }
      ]),
      hints: JSON.stringify(["Split by regular expression for one or more whitespaces, reverse list, and join with space."]),
      solutionExplanation: "Tokenize words ignoring variable length whitespace, then reconstruct in reverse order.",
      timeLimit: 3000,
      memoryLimit: 256,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "challenge-sql-grades",
      title: "Highest Scoring Students by Department",
      slug: "sql-highest-scoring-students",
      description: "You are given a table named `students` with columns: `id`, `name`, `department`, `score`.\n\nWrite an SQL query to retrieve the `name`, `department`, and `score` of all students who scored 85 or above, ordered by `score` in descending order.",
      difficulty: "easy",
      category: "Database & SQL",
      challengeType: "programming",
      supportedLanguages: JSON.stringify(["sql"]),
      starterCode: JSON.stringify({
        sql: "-- Write your SQL query below:\nSELECT name, department, score\nFROM students\nWHERE score >= 85\nORDER BY score DESC;\n"
      }),
      htmlStarterCode: null,
      cssStarterCode: null,
      javascriptStarterCode: null,
      inputFormat: "students table with (id, name, department, score)",
      outputFormat: "Pipe-delimited records matching: name|department|score",
      constraints: "Scores are integers between 0 and 100",
      examples: JSON.stringify([
        { input: "RUN_DEFAULT_TEST", output: "Alice|Computer Science|95\nCharlie|Electrical|90\nEve|Computer Science|88" }
      ]),
      publicTestCases: JSON.stringify([
        { id: "tc-1", input: "RUN_DEFAULT_TEST", expectedOutput: "Alice|Computer Science|95\nCharlie|Electrical|90\nEve|Computer Science|88", isPublic: true }
      ]),
      privateTestCases: JSON.stringify([
        { id: "tc-2", input: "RUN_EXTENDED_TEST", expectedOutput: "Alice|Computer Science|95\nCharlie|Electrical|90\nEve|Computer Science|88", isPublic: false }
      ]),
      hints: JSON.stringify(["Filter with WHERE score >= 85 and sort with ORDER BY score DESC."]),
      solutionExplanation: "Standard SELECT with conditional predicate and DESC order.",
      timeLimit: 3000,
      memoryLimit: 256,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "challenge-web-navbar",
      title: "Build a Responsive Navigation Bar",
      slug: "web-responsive-navbar",
      description: "Design and implement a modern, responsive navigation header with brand logo, navigation links, and an interactive CTA button. Verify how it renders on mobile, tablet, and desktop viewports in the live preview.",
      difficulty: "easy",
      category: "Web Development",
      challengeType: "web",
      supportedLanguages: JSON.stringify(["html", "css", "javascript"]),
      starterCode: JSON.stringify({}),
      htmlStarterCode: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Responsive Navbar</title>
</head>
<body>
  <nav class="navbar">
    <div class="logo">MR-<span>TECH</span></div>
    <ul class="nav-links" id="navLinks">
      <li><a href="#home" class="active">Home</a></li>
      <li><a href="#courses">Courses</a></li>
      <li><a href="#practice">Practice</a></li>
      <li><a href="#about">About</a></li>
    </ul>
    <button class="cta-btn" id="ctaBtn">Contact Us</button>
  </nav>

  <main class="content">
    <h1>MR-TECHNOLOGIES Learning Lab</h1>
    <p>Practice cutting-edge web design and software engineering skills.</p>
  </main>
</body>
</html>`,
      cssStarterCode: `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

body {
  background: #0f172a;
  color: #f8fafc;
  min-height: 100vh;
}

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: #1e293b;
  border-bottom: 1px solid #334155;
}

.logo {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #ffffff;
}

.logo span {
  color: #38bdf8;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
  list-style: none;
}

.nav-links a {
  color: #94a3b8;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-links a:hover,
.nav-links a.active {
  color: #38bdf8;
}

.cta-btn {
  background: #2563eb;
  color: white;
  border: none;
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.cta-btn:hover {
  background: #1d4ed8;
}

.content {
  padding: 4rem 2rem;
  text-align: center;
}

.content h1 {
  font-size: 2.25rem;
  margin-bottom: 1rem;
}

.content p {
  color: #94a3b8;
}`,
      javascriptStarterCode: `document.getElementById('ctaBtn').addEventListener('click', () => {
  alert('Welcome to MR-TECHNOLOGIES Web Development Sandbox!');
});

console.log('Responsive Navbar initialized.');`,
      inputFormat: "Interactive HTML / CSS / JS Preview",
      outputFormat: "Rendered interactive webpage",
      constraints: "Semantic HTML5, CSS Flexbox/Grid, vanilla JS",
      examples: JSON.stringify([
        { input: "Render page", output: "Interactive navbar with logo and styled links" }
      ]),
      publicTestCases: JSON.stringify([
        { id: "tc-web-1", input: "check-dom", expectedOutput: "navbar-rendered", isPublic: true }
      ]),
      privateTestCases: JSON.stringify([]),
      hints: JSON.stringify(["Use flexbox on the navbar container for clean horizontal alignment."]),
      solutionExplanation: "A standard flexbox navbar with responsive layout and semantic markup.",
      timeLimit: 3000,
      memoryLimit: 256,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "challenge-web-counter",
      title: "Interactive Counter Application",
      slug: "web-interactive-counter",
      description: "Build a functional digital counter with Increment, Decrement, and Reset controls. Dynamically style the counter text: green when positive, red when negative, and slate when zero.",
      difficulty: "easy",
      category: "Web Development",
      challengeType: "web",
      supportedLanguages: JSON.stringify(["html", "css", "javascript"]),
      starterCode: JSON.stringify({}),
      htmlStarterCode: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Interactive Counter</title>
</head>
<body>
  <div class="counter-card">
    <h2>Interactive Counter</h2>
    <div id="counterValue" class="count zero">0</div>
    <div class="btn-group">
      <button id="decBtn" class="btn btn-danger">- Decrement</button>
      <button id="resetBtn" class="btn btn-neutral">Reset</button>
      <button id="incBtn" class="btn btn-success">+ Increment</button>
    </div>
  </div>
</body>
</html>`,
      cssStarterCode: `body {
  background: #0f172a;
  color: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  margin: 0;
  font-family: sans-serif;
}
.counter-card {
  background: #1e293b;
  padding: 2.5rem;
  border-radius: 1rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
  text-align: center;
}
.count {
  font-size: 4rem;
  font-weight: 800;
  margin: 1.5rem 0;
  font-family: monospace;
}
.count.positive { color: #10b981; }
.count.negative { color: #ef4444; }
.count.zero { color: #94a3b8; }
.btn-group { display: flex; gap: 0.75rem; }
.btn {
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-success { background: #059669; color: white; }
.btn-danger { background: #dc2626; color: white; }
.btn-neutral { background: #475569; color: white; }`,
      javascriptStarterCode: `let count = 0;
const valEl = document.getElementById('counterValue');

function updateDisplay() {
  valEl.textContent = count;
  valEl.className = 'count ' + (count > 0 ? 'positive' : count < 0 ? 'negative' : 'zero');
}

document.getElementById('incBtn').onclick = () => { count++; updateDisplay(); };
document.getElementById('decBtn').onclick = () => { count--; updateDisplay(); };
document.getElementById('resetBtn').onclick = () => { count = 0; updateDisplay(); };`,
      inputFormat: "Interactive browser controls",
      outputFormat: "Dynamic DOM counter updates",
      constraints: "State persistence in memory, dynamic class switching",
      examples: JSON.stringify([]),
      publicTestCases: JSON.stringify([]),
      privateTestCases: JSON.stringify([]),
      hints: JSON.stringify(["Use addEventListener or onclick handlers to update variable and DOM."]),
      solutionExplanation: "Event listeners update count variable and mutate DOM class list for color states.",
      timeLimit: 3000,
      memoryLimit: 256,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "challenge-web-todo",
      title: "Interactive Todo List with Filter",
      slug: "web-todo-list",
      description: "Build a clean task management widget. Implement features to append new items, toggle completed state, and delete items from the list with dynamic counter updates.",
      difficulty: "medium",
      category: "Web Development",
      challengeType: "web",
      supportedLanguages: JSON.stringify(["html", "css", "javascript"]),
      starterCode: JSON.stringify({}),
      htmlStarterCode: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Task Tracker</title>
</head>
<body>
  <div class="todo-app">
    <h1>Today's Goals</h1>
    <div class="input-row">
      <input type="text" id="taskInput" placeholder="Enter a new coding goal...">
      <button id="addBtn">Add Task</button>
    </div>
    <ul id="taskList">
      <li class="done">Complete Algorithms Practice <button class="del">x</button></li>
      <li>Review System Design Whitepaper <button class="del">x</button></li>
    </ul>
  </div>
</body>
</html>`,
      cssStarterCode: `body {
  background: #0b0f19;
  color: #f1f5f9;
  font-family: sans-serif;
  display: flex;
  justify-content: center;
  padding: 3rem 1rem;
}
.todo-app {
  width: 100%;
  max-width: 440px;
  background: #1e293b;
  padding: 2rem;
  border-radius: 16px;
}
.input-row { display: flex; gap: 8px; margin: 1.5rem 0; }
input { flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: white; }
button { background: #2563eb; color: white; border: none; border-radius: 8px; padding: 10px 16px; font-weight: 600; cursor: pointer; }
ul { list-style: none; padding: 0; }
li { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #0f172a; margin-bottom: 8px; border-radius: 8px; cursor: pointer; }
li.done { text-decoration: line-through; opacity: 0.6; }
.del { background: #ef4444; padding: 4px 8px; font-size: 11px; }`,
      javascriptStarterCode: `const input = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const list = document.getElementById('taskList');

addBtn.onclick = () => {
  const text = input.value.trim();
  if (!text) return;
  const li = document.createElement('li');
  li.innerHTML = text + ' <button class=\"del\">x</button>';
  list.appendChild(li);
  input.value = '';
};

list.onclick = (e) => {
  if (e.target.classList.contains('del')) {
    e.target.parentElement.remove();
  } else if (e.target.tagName === 'LI') {
    e.target.classList.toggle('done');
  }
};`,
      inputFormat: "DOM input events",
      outputFormat: "Rendered list manipulation",
      constraints: "Event delegation on list element",
      examples: JSON.stringify([]),
      publicTestCases: JSON.stringify([]),
      privateTestCases: JSON.stringify([]),
      hints: JSON.stringify(["Use event delegation on the <ul> element to handle click toggles and deletions."]),
      solutionExplanation: "Event delegation captures clicks on li elements and delete buttons cleanly.",
      timeLimit: 3000,
      memoryLimit: 256,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  for (const c of challenges) {
    await pool.query(
      `INSERT INTO coding_challenges 
        (id, title, slug, description, difficulty, category, challengeType, supportedLanguages, starterCode, htmlStarterCode, cssStarterCode, javascriptStarterCode, inputFormat, outputFormat, constraints, examples, publicTestCases, privateTestCases, hints, solutionExplanation, timeLimit, memoryLimit, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.id, c.title, c.slug, c.description, c.difficulty, c.category, c.challengeType,
        c.supportedLanguages, c.starterCode, c.htmlStarterCode, c.cssStarterCode, c.javascriptStarterCode,
        c.inputFormat, c.outputFormat, c.constraints, c.examples, c.publicTestCases, c.privateTestCases,
        c.hints, c.solutionExplanation, c.timeLimit, c.memoryLimit, c.createdAt, c.updatedAt
      ]
    );
  }

  console.log(`Successfully seeded ${challenges.length} coding challenges.`);
}

async function seedCodingHierarchy(pool: any) {
  console.log("Seeding Coding Chapters and Topics hierarchy...");

  // 1. Seed Chapters
  for (const ch of CODING_CHAPTERS) {
    await pool.query(
      `INSERT INTO coding_chapters (id, title, slug, description, icon, orderIndex, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title = VALUES(title), slug = VALUES(slug), description = VALUES(description), icon = VALUES(icon), orderIndex = VALUES(orderIndex)`,
      [ch.id, ch.title, ch.slug, ch.description, ch.icon, ch.orderIndex, ch.createdAt]
    );
  }

  // 2. Seed Topics
  for (const t of CODING_TOPICS) {
    await pool.query(
      `INSERT INTO coding_topics (id, chapterId, title, slug, description, orderIndex, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE chapterId = VALUES(chapterId), title = VALUES(title), slug = VALUES(slug), description = VALUES(description), orderIndex = VALUES(orderIndex)`,
      [t.id, t.chapterId, t.title, t.slug, t.description, t.orderIndex, t.createdAt]
    );
  }

  // 3. Update existing default challenges with chapter and topic IDs if missing
  const defaultMappings: Record<string, { chapterId: string; topicId: string; orderIndex: number }> = {
    "challenge-two-sum": { chapterId: "chapter-dsa", topicId: "topic-dsa-arrays", orderIndex: 0 },
    "challenge-prime": { chapterId: "chapter-python", topicId: "topic-py-basics", orderIndex: 1 },
    "challenge-palindrome": { chapterId: "chapter-dsa", topicId: "topic-dsa-strings", orderIndex: 1 },
    "challenge-reverse-words": { chapterId: "chapter-dsa", topicId: "topic-dsa-strings", orderIndex: 2 },
    "challenge-sql-grades": { chapterId: "chapter-sql", topicId: "topic-sql-basics", orderIndex: 1 },
    "challenge-web-navbar": { chapterId: "chapter-web", topicId: "topic-web-css-layout", orderIndex: 1 },
    "challenge-web-counter": { chapterId: "chapter-web", topicId: "topic-web-dom", orderIndex: 1 },
    "challenge-web-todo": { chapterId: "chapter-web", topicId: "topic-web-projects", orderIndex: 1 }
  };
  for (const [chId, mapping] of Object.entries(defaultMappings)) {
    await pool.query(
      "UPDATE coding_challenges SET chapterId = ?, topicId = ?, orderIndex = ? WHERE id = ? AND (chapterId IS NULL OR chapterId = '')",
      [mapping.chapterId, mapping.topicId, mapping.orderIndex, chId]
    );
  }

  // 4. Seed expanded challenges
  let insertedCount = 0;
  for (const c of CODING_CHALLENGES_EXPANSION) {
    const [existing]: any = await pool.query("SELECT id FROM coding_challenges WHERE id = ?", [c.id]);
    if (!existing || existing.length === 0) {
      await pool.query(
        `INSERT INTO coding_challenges 
          (id, chapterId, topicId, orderIndex, title, slug, description, difficulty, category, challengeType, supportedLanguages, starterCode, htmlStarterCode, cssStarterCode, javascriptStarterCode, inputFormat, outputFormat, constraints, examples, publicTestCases, privateTestCases, hints, solutionExplanation, timeLimit, memoryLimit, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          c.id, c.chapterId, c.topicId, c.orderIndex, c.title, c.slug, c.description, c.difficulty, c.category, c.challengeType,
          c.supportedLanguages, c.starterCode, c.htmlStarterCode || null, c.cssStarterCode || null, c.javascriptStarterCode || null,
          c.inputFormat, c.outputFormat, c.constraints, c.examples, c.publicTestCases, c.privateTestCases,
          c.hints, c.solutionExplanation, c.timeLimit, c.memoryLimit, c.createdAt, c.updatedAt
        ]
      );
      insertedCount++;
    } else {
      await pool.query(
        "UPDATE coding_challenges SET chapterId = ?, topicId = ?, orderIndex = ? WHERE id = ?",
        [c.chapterId, c.topicId, c.orderIndex, c.id]
      );
    }
  }

  console.log(`Successfully seeded coding hierarchy: ${CODING_CHAPTERS.length} chapters, ${CODING_TOPICS.length} topics, and ${insertedCount} new problems.`);
}

if (process.argv[1] && process.argv[1].includes("seed")) {
  initializeDatabase().then(() => {
    console.log("Seeding process finished successfully.");
    process.exit(0);
  }).catch(e => {
    console.error("Seeding failed:", e);
    process.exit(1);
  });
}

