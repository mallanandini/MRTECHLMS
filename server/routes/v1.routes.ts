/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { PublicApiService } from "../services/integrations/public-api.service.js";
import { pool } from "../mysql.js";
import { randomUUID } from "crypto";

export const v1Router = express.Router();

/**
 * GET /api/v1/courses
 * Requires scope: 'courses:read'
 */
v1Router.get("/courses", PublicApiService.requireApiKey("courses:read"), async (req, res) => {
  try {
    const orgId = req.tenantId || "org-default";
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [rows]: any = await pool.query(
      `SELECT id, title, shortDescription, category, difficulty, status, createdAt, updatedAt
       FROM courses 
       WHERE (organizationId = ? OR organizationId = 'org-default') AND deletedAt IS NULL
       ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      [orgId, limit, offset]
    );

    const [countRows]: any = await pool.query(
      `SELECT COUNT(id) AS total FROM courses WHERE (organizationId = ? OR organizationId = 'org-default') AND deletedAt IS NULL`,
      [orgId]
    );

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: Number(countRows[0]?.total) || 0
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/**
 * GET /api/v1/users
 * Requires scope: 'users:read'
 */
v1Router.get("/users", PublicApiService.requireApiKey("users:read"), async (req, res) => {
  try {
    const orgId = req.tenantId || "org-default";
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [rows]: any = await pool.query(
      `SELECT id, name, email, role, jobTitle, status, createdAt
       FROM users 
       WHERE organizationId = ? AND deletedAt IS NULL
       ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      [orgId, limit, offset]
    );

    const [countRows]: any = await pool.query(
      `SELECT COUNT(id) AS total FROM users WHERE organizationId = ? AND deletedAt IS NULL`,
      [orgId]
    );

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: Number(countRows[0]?.total) || 0
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/**
 * POST /api/v1/enrollments
 * Requires scope: 'enrollments:write'
 */
v1Router.post("/enrollments", PublicApiService.requireApiKey("enrollments:write"), async (req, res) => {
  try {
    const orgId = req.tenantId || "org-default";
    const { studentId, courseId, dueDate } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({ error: "Bad Request", message: "studentId and courseId are required." });
    }

    // Verify student belongs to this organization
    const [uRows]: any = await pool.query(
      `SELECT id, name, email FROM users WHERE id = ? AND organizationId = ? AND deletedAt IS NULL`,
      [studentId, orgId]
    );
    if (!uRows || uRows.length === 0) {
      return res.status(404).json({ error: "Not Found", message: "Student not found in your organization." });
    }

    // Verify course
    const [cRows]: any = await pool.query(
      `SELECT id, title FROM courses WHERE id = ? AND (organizationId = ? OR organizationId = 'org-default') AND deletedAt IS NULL`,
      [courseId, orgId]
    );
    if (!cRows || cRows.length === 0) {
      return res.status(404).json({ error: "Not Found", message: "Course not found." });
    }

    // Check existing
    const [existing]: any = await pool.query(
      `SELECT id, status, progressPercentage FROM enrollments WHERE studentId = ? AND courseId = ?`,
      [studentId, courseId]
    );
    if (existing && existing.length > 0) {
      return res.status(409).json({
        error: "Conflict",
        message: "Student is already enrolled in this course.",
        enrollmentId: existing[0].id
      });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO enrollments 
       (id, organizationId, studentId, courseId, progressPercentage, status, dueDate, createdAt)
       VALUES (?, ?, ?, ?, 0, 'active', ?, ?)`,
      [id, orgId, studentId, courseId, dueDate || null, now]
    );

    res.status(201).json({
      id,
      organizationId: orgId,
      studentId,
      courseId,
      status: "active",
      progressPercentage: 0,
      dueDate: dueDate || null,
      createdAt: now
    });
  } catch (err: any) {
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/**
 * GET /api/v1/reports/completions
 * Requires scope: 'reports:read'
 */
v1Router.get("/reports/completions", PublicApiService.requireApiKey("reports:read"), async (req, res) => {
  try {
    const orgId = req.tenantId || "org-default";
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [rows]: any = await pool.query(
      `SELECT e.id AS enrollmentId, u.id AS studentId, u.name AS studentName, u.email AS studentEmail,
              c.id AS courseId, c.title AS courseTitle, e.progressPercentage, e.status, e.completedAt, e.createdAt AS enrolledAt
       FROM enrollments e
       JOIN users u ON e.studentId = u.id
       JOIN courses c ON e.courseId = c.id
       WHERE (e.organizationId = ? OR u.organizationId = ?)
       ORDER BY e.completedAt DESC, e.createdAt DESC
       LIMIT ? OFFSET ?`,
      [orgId, orgId, limit, offset]
    );

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: rows.length
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});
