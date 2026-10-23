/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pool } from "../../mysql.js";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { logAuditEvent } from "../../audit.js";

export type ImportExportEntity = 
  | "users" 
  | "courses" 
  | "groups" 
  | "enrollments" 
  | "assessments" 
  | "results";

export interface IntegrationJob {
  id: string;
  organizationId: string;
  jobType: "import" | "export";
  entityType: ImportExportEntity;
  status: "queued" | "processing" | "completed" | "failed";
  totalRecords: number;
  processedRecords: number;
  successRecords: number;
  failedRecords: number;
  errorsLog: any[];
  fileUrl: string | null;
  createdBy: string;
  createdAt: string;
  completedAt: string | null;
}

export class ImportExportService {
  /**
   * Supported Entity Mappings and Template Schemas
   */
  public static readonly SCHEMAS: Record<ImportExportEntity, { importable: boolean; exportable: boolean; fields: string[] }> = {
    users: {
      importable: true,
      exportable: true,
      fields: ["name", "email", "role", "jobTitle", "departmentName"]
    },
    courses: {
      importable: true,
      exportable: true,
      fields: ["title", "shortDescription", "category", "level", "estimatedHours"]
    },
    groups: {
      importable: true,
      exportable: true,
      fields: ["name", "code", "description"]
    },
    enrollments: {
      importable: true,
      exportable: true,
      fields: ["studentEmail", "courseTitle", "dueDate"]
    },
    assessments: {
      importable: false,
      exportable: true,
      fields: ["title", "courseTitle", "passingScore", "totalPoints", "timeLimitMinutes"]
    },
    results: {
      importable: false,
      exportable: true,
      fields: ["studentEmail", "assessmentTitle", "score", "percentage", "passed", "submittedAt"]
    }
  };

  /**
   * Escape CSV values safely
   */
  private static escapeCsv(value: any): string {
    if (value === null || value === undefined) return "";
    const str = String(value).replace(/"/g, '""');
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
      return `"${str}"`;
    }
    return str;
  }

  /**
   * Generate CSV Template for bulk import
   */
  public static getCsvTemplate(entity: ImportExportEntity): string {
    const schema = this.SCHEMAS[entity];
    if (!schema || !schema.importable) {
      throw new Error(`Import template is not available for entity '${entity}'.`);
    }

    let sampleRow: string[] = [];
    switch (entity) {
      case "users":
        sampleRow = ["Alice Walker", "alice.walker@example.com", "student", "Software Engineer", "Engineering"];
        break;
      case "courses":
        sampleRow = ["Introduction to TypeScript", "Learn core TS syntax and types", "Programming", "beginner", "10"];
        break;
      case "groups":
        sampleRow = ["Engineering Cohort 2026", "ENG-2026", "Quarterly onboarding engineering cohort"];
        break;
      case "enrollments":
        sampleRow = ["alice.walker@example.com", "Introduction to TypeScript", "2026-10-31"];
        break;
      default:
        sampleRow = schema.fields.map(() => "sample");
    }

    return `${schema.fields.join(",")}\n${sampleRow.join(",")}`;
  }

  // =========================================================================
  // EXPORT HANDLERS
  // =========================================================================

  /**
   * Export Users to CSV
   */
  public static async exportUsers(organizationId: string): Promise<string> {
    const [rows]: any = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.jobTitle, u.status, d.name AS departmentName, u.createdAt
       FROM users u
       LEFT JOIN departments d ON u.departmentId = d.id
       WHERE u.organizationId = ? AND u.deletedAt IS NULL
       ORDER BY u.createdAt DESC`,
      [organizationId]
    );

    const headers = ["ID", "Name", "Email", "Role", "Job Title", "Department", "Status", "Created At"];
    const csvLines = [headers.join(",")];

    for (const r of rows) {
      csvLines.push([
        this.escapeCsv(r.id),
        this.escapeCsv(r.name),
        this.escapeCsv(r.email),
        this.escapeCsv(r.role),
        this.escapeCsv(r.jobTitle),
        this.escapeCsv(r.departmentName),
        this.escapeCsv(r.status),
        this.escapeCsv(r.createdAt)
      ].join(","));
    }

    return csvLines.join("\n");
  }

  /**
   * Export Courses to CSV
   */
  public static async exportCourses(organizationId: string): Promise<string> {
    const [rows]: any = await pool.query(
      `SELECT c.id, c.title, c.category, c.difficulty AS level, c.status, c.createdAt,
        (SELECT COUNT(l.id) FROM lessons l WHERE l.courseId = c.id) AS lessonCount,
        (SELECT COUNT(e.id) FROM enrollments e WHERE e.courseId = c.id) AS enrollmentCount
       FROM courses c
       WHERE (c.organizationId = ? OR c.organizationId = 'org-default') AND c.deletedAt IS NULL
       ORDER BY c.createdAt DESC`,
      [organizationId]
    );

    const headers = ["ID", "Title", "Category", "Level", "Status", "Lessons Count", "Total Enrollments", "Created At"];
    const csvLines = [headers.join(",")];

    for (const r of rows) {
      csvLines.push([
        this.escapeCsv(r.id),
        this.escapeCsv(r.title),
        this.escapeCsv(r.category),
        this.escapeCsv(r.level),
        this.escapeCsv(r.status),
        this.escapeCsv(r.lessonCount),
        this.escapeCsv(r.enrollmentCount),
        this.escapeCsv(r.createdAt)
      ].join(","));
    }

    return csvLines.join("\n");
  }

  /**
   * Export Groups to CSV
   */
  public static async exportGroups(organizationId: string): Promise<string> {
    const [rows]: any = await pool.query(
      `SELECT g.id, g.name, g.code, g.description, g.createdAt,
        (SELECT COUNT(gm.id) FROM group_members gm WHERE gm.groupId = g.id AND gm.deletedAt IS NULL) AS memberCount
       FROM groups g
       WHERE g.organizationId = ? AND g.deletedAt IS NULL
       ORDER BY g.createdAt DESC`,
      [organizationId]
    );

    const headers = ["ID", "Name", "Code", "Description", "Member Count", "Created At"];
    const csvLines = [headers.join(",")];

    for (const r of rows) {
      csvLines.push([
        this.escapeCsv(r.id),
        this.escapeCsv(r.name),
        this.escapeCsv(r.code),
        this.escapeCsv(r.description),
        this.escapeCsv(r.memberCount),
        this.escapeCsv(r.createdAt)
      ].join(","));
    }

    return csvLines.join("\n");
  }

  /**
   * Export Enrollments to CSV
   */
  public static async exportEnrollments(organizationId: string): Promise<string> {
    const [rows]: any = await pool.query(
      `SELECT e.id, u.name AS studentName, u.email AS studentEmail, c.title AS courseTitle,
        e.progressPercentage, e.status, e.dueDate, e.completedAt, e.createdAt
       FROM enrollments e
       JOIN users u ON e.studentId = u.id
       JOIN courses c ON e.courseId = c.id
       WHERE (e.organizationId = ? OR u.organizationId = ?)
       ORDER BY e.createdAt DESC`,
      [organizationId, organizationId]
    );

    const headers = ["Enrollment ID", "Student Name", "Student Email", "Course Title", "Progress %", "Status", "Due Date", "Completed At", "Assigned At"];
    const csvLines = [headers.join(",")];

    for (const r of rows) {
      csvLines.push([
        this.escapeCsv(r.id),
        this.escapeCsv(r.studentName),
        this.escapeCsv(r.studentEmail),
        this.escapeCsv(r.courseTitle),
        this.escapeCsv(r.progressPercentage),
        this.escapeCsv(r.status),
        this.escapeCsv(r.dueDate),
        this.escapeCsv(r.completedAt),
        this.escapeCsv(r.createdAt)
      ].join(","));
    }

    return csvLines.join("\n");
  }

  /**
   * Export Assessment Results to CSV
   */
  public static async exportResults(organizationId: string): Promise<string> {
    const [rows]: any = await pool.query(
      `SELECT s.id, a.title AS assessmentTitle, u.name AS studentName, u.email AS studentEmail,
        s.score, s.totalPoints, s.percentage, s.passed, s.attemptNumber, s.timeTakenSeconds, s.submittedAt
       FROM submissions s
       JOIN assessments a ON s.assessmentId = a.id
       JOIN users u ON s.studentId = u.id
       WHERE s.organizationId = ? OR u.organizationId = ?
       ORDER BY s.submittedAt DESC`,
      [organizationId, organizationId]
    );

    const headers = ["Submission ID", "Assessment Title", "Student Name", "Student Email", "Score", "Total Points", "Percentage", "Passed", "Attempt #", "Time Taken (s)", "Submitted At"];
    const csvLines = [headers.join(",")];

    for (const r of rows) {
      csvLines.push([
        this.escapeCsv(r.id),
        this.escapeCsv(r.assessmentTitle),
        this.escapeCsv(r.studentName),
        this.escapeCsv(r.studentEmail),
        this.escapeCsv(r.score),
        this.escapeCsv(r.totalPoints),
        this.escapeCsv(r.percentage),
        this.escapeCsv(r.passed ? "YES" : "NO"),
        this.escapeCsv(r.attemptNumber),
        this.escapeCsv(r.timeTakenSeconds),
        this.escapeCsv(r.submittedAt)
      ].join(","));
    }

    return csvLines.join("\n");
  }

  // =========================================================================
  // IMPORT HANDLERS
  // =========================================================================

  /**
   * Bulk Import Users from CSV Content
   */
  public static async importUsersFromCsv(
    organizationId: string,
    csvContent: string,
    actor: { id: string; email: string; role: string }
  ): Promise<{ total: number; imported: number; failed: number; errors: any[] }> {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) {
      return { total: 0, imported: 0, failed: 0, errors: ["CSV file is empty or only contains headers."] };
    }

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const emailIdx = headers.indexOf("email");
    const nameIdx = headers.indexOf("name");
    const roleIdx = headers.indexOf("role");
    const jobTitleIdx = headers.indexOf("jobtitle") !== -1 ? headers.indexOf("jobtitle") : headers.indexOf("job title");

    if (emailIdx === -1 || nameIdx === -1) {
      return { total: 0, imported: 0, failed: 0, errors: ["CSV must contain at least 'name' and 'email' columns."] };
    }

    const dataRows = lines.slice(1);
    let imported = 0;
    let failed = 0;
    const errors: any[] = [];
    const defaultPasswordHash = await bcrypt.hash("Welcome123!", 10);
    const now = new Date().toISOString();

    for (let i = 0; i < dataRows.length; i++) {
      const line = dataRows[i];
      const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      const email = cols[emailIdx]?.toLowerCase();
      const name = cols[nameIdx];
      const role = (roleIdx !== -1 && cols[roleIdx]) ? cols[roleIdx].toLowerCase() : "student";
      const jobTitle = jobTitleIdx !== -1 ? cols[jobTitleIdx] : null;

      if (!email || !name) {
        failed++;
        errors.push({ row: i + 2, error: "Missing email or name" });
        continue;
      }

      // Check duplicate
      const [existing]: any = await pool.query(
        `SELECT id FROM users WHERE email = ?`,
        [email]
      );
      if (existing && existing.length > 0) {
        failed++;
        errors.push({ row: i + 2, email, error: "User with this email already exists" });
        continue;
      }

      const id = randomUUID();
      try {
        await pool.query(
          `INSERT INTO users 
           (id, organizationId, name, email, passwordHash, role, status, jobTitle, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
          [id, organizationId, name, email, defaultPasswordHash, role, jobTitle, now]
        );
        imported++;
      } catch (err: any) {
        failed++;
        errors.push({ row: i + 2, email, error: err.message });
      }
    }

    await logAuditEvent({
      organizationId,
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      action: "users_bulk_imported",
      resourceType: "users",
      resourceId: organizationId,
      details: { totalRows: dataRows.length, imported, failed }
    });

    return { total: dataRows.length, imported, failed, errors };
  }

  /**
   * Bulk Import Enrollments from CSV Content
   */
  public static async importEnrollmentsFromCsv(
    organizationId: string,
    csvContent: string,
    actor: { id: string; email: string; role: string }
  ): Promise<{ total: number; imported: number; failed: number; errors: any[] }> {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) {
      return { total: 0, imported: 0, failed: 0, errors: ["CSV file is empty or only contains headers."] };
    }

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const emailIdx = headers.indexOf("studentemail") !== -1 ? headers.indexOf("studentemail") : headers.indexOf("email");
    const courseIdx = headers.indexOf("coursetitle") !== -1 ? headers.indexOf("coursetitle") : headers.indexOf("course");
    const dueDateIdx = headers.indexOf("duedate") !== -1 ? headers.indexOf("duedate") : headers.indexOf("due date");

    if (emailIdx === -1 || courseIdx === -1) {
      return { total: 0, imported: 0, failed: 0, errors: ["CSV must contain 'studentEmail' and 'courseTitle' columns."] };
    }

    const dataRows = lines.slice(1);
    let imported = 0;
    let failed = 0;
    const errors: any[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < dataRows.length; i++) {
      const line = dataRows[i];
      const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      const email = cols[emailIdx]?.toLowerCase();
      const courseTitle = cols[courseIdx];
      const dueDate = dueDateIdx !== -1 ? cols[dueDateIdx] : null;

      if (!email || !courseTitle) {
        failed++;
        errors.push({ row: i + 2, error: "Missing email or course title" });
        continue;
      }

      // Lookup student
      const [uRows]: any = await pool.query(
        `SELECT id FROM users WHERE email = ? AND organizationId = ? AND deletedAt IS NULL`,
        [email, organizationId]
      );
      if (!uRows || uRows.length === 0) {
        failed++;
        errors.push({ row: i + 2, email, error: "Student not found in this organization" });
        continue;
      }
      const studentId = uRows[0].id;

      // Lookup course
      const [cRows]: any = await pool.query(
        `SELECT id FROM courses WHERE title = ? AND (organizationId = ? OR organizationId = 'org-default') AND deletedAt IS NULL`,
        [courseTitle, organizationId]
      );
      if (!cRows || cRows.length === 0) {
        failed++;
        errors.push({ row: i + 2, courseTitle, error: "Course not found" });
        continue;
      }
      const courseId = cRows[0].id;

      // Check existing enrollment
      const [eRows]: any = await pool.query(
        `SELECT id FROM enrollments WHERE studentId = ? AND courseId = ?`,
        [studentId, courseId]
      );
      if (eRows && eRows.length > 0) {
        failed++;
        errors.push({ row: i + 2, email, courseTitle, error: "Student is already enrolled in this course" });
        continue;
      }

      const id = randomUUID();
      try {
        await pool.query(
          `INSERT INTO enrollments 
           (id, organizationId, studentId, courseId, progressPercentage, status, dueDate, createdAt)
           VALUES (?, ?, ?, ?, 0, 'active', ?, ?)`,
          [id, organizationId, studentId, courseId, dueDate || null, now]
        );
        imported++;
      } catch (err: any) {
        failed++;
        errors.push({ row: i + 2, email, error: err.message });
      }
    }

    await logAuditEvent({
      organizationId,
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      action: "enrollments_bulk_imported",
      resourceType: "enrollments",
      resourceId: organizationId,
      details: { totalRows: dataRows.length, imported, failed }
    });

    return { total: dataRows.length, imported, failed, errors };
  }
}
