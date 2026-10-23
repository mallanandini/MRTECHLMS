/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";
import { pool } from "./mysql.js";
import { 
  User, UserRole, Course, Module, Lesson, LessonType, 
  Enrollment, Progress, Assessment, AssessmentAssignment, Question, QuestionType, 
  Submission, CodingSubmission, Blog, Comment, Review, UserPreference,
  LearningPath, LearningPathSection, LearningPathItem, LearningPathAssignment, LearningPathProgress,
  CodingChallenge, CodingSavedCode, CodingChapter, CodingTopic, StudentPlaygroundProgram, Organization,
  Group, GroupMember, AssessmentAttempt, CertificateTemplate, Certificate,
  Department, DepartmentMember, Cohort, CohortMember,
  NotificationItem, EmailQueueItem, NotificationPreferences, ReminderLog, NotificationTemplate,
  Institution, Batch, BatchStudent, BatchCourse, BatchAssessment, BatchLearningPath
} from "../src/types.js";

const JSON_FIELDS: { [table: string]: string[] } = {
  users: ["bookmarkedBlogIds"],
  courses: ["requirements", "skillsCovered", "tags", "prerequisites"],
  lessons: ["codingPrompt"],
  questions: ["options", "correctAnswers"],
  submissions: ["answers"],
  assessment_attempts: ["questionOrder", "answers"],
  certificates: ["metadata"],
  blogs: ["tags"],
  learning_paths: ["requirements", "learningObjectives"],
  coding_challenges: ["supportedLanguages", "starterCode", "examples", "publicTestCases", "privateTestCases", "hints"],
  organizations: ["settings"],
  notifications: ["data"],
  institutions: ["academicYears"]
};

const SOFT_DELETABLE_TABLES = new Set([
  "users",
  "courses",
  "modules",
  "lessons",
  "assessments",
  "questions",
  "learning_paths",
  "organizations",
  "groups",
  "enrollments",
  "assessment_assignments",
  "learning_path_assignments",
  "assessment_attempts",
  "certificates",
  "certificate_templates",
  "departments",
  "cohorts",
  "notifications",
  "institutions",
  "batches"
]);

const TENANT_SCOPED_TABLES = new Set([
  "users",
  "courses",
  "assessments",
  "assessment_assignments",
  "assessment_attempts",
  "certificates",
  "certificate_templates",
  "submissions",
  "learning_paths",
  "learning_path_assignments",
  "enrollments",
  "blogs",
  "audit_logs",
  "groups",
  "group_members",
  "departments",
  "department_members",
  "cohorts",
  "cohort_members",
  "notifications",
  "email_queue",
  "notification_preferences",
  "reminder_logs",
  "notification_templates",
  "institutions",
  "batches",
  "batch_students",
  "batch_courses",
  "batch_assessments"
]);

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sort?: { [field: string]: "ASC" | "DESC" };
  includeDeleted?: boolean;
}

export class MySQLCollection<T extends { id: string }> {
  public readonly tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  private parseRow(row: any): T {
    if (!row) return row;
    const result = { ...row };
    const jsonFields = JSON_FIELDS[this.tableName];
    
    if (jsonFields) {
      for (const field of jsonFields) {
        if (result[field] !== undefined && result[field] !== null) {
          if (typeof result[field] === "string") {
            try {
              result[field] = JSON.parse(result[field]);
            } catch (e) {
              console.error(`Error parsing JSON field ${field} in table ${this.tableName}:`, e);
            }
          }
        }
      }
    }
    
    // Convert boolean values from 0/1 to false/true
    for (const key in result) {
      if (typeof result[key] === "number" && (key.startsWith("is") || key === "completed" || key === "passed" || key === "randomizeQuestions" || key === "randomizeOptions" || key === "revealAnswers")) {
        result[key] = result[key] === 1;
      }
    }
    return result as T;
  }

  private prepareValues(item: any): any {
    const result = { ...item };
    const jsonFields = JSON_FIELDS[this.tableName];
    
    if (jsonFields) {
      for (const field of jsonFields) {
        if (result[field] !== undefined && result[field] !== null) {
          if (typeof result[field] !== "string") {
            result[field] = JSON.stringify(result[field]);
          }
        }
      }
    }
    
    // Convert boolean to 0/1 for MySQL
    for (const key in result) {
      if (typeof result[key] === "boolean") {
        result[key] = result[key] ? 1 : 0;
      }
    }
    return result;
  }

  public async find(query: Partial<T> = {}, options: QueryOptions = {}): Promise<T[]> {
    let sql = `SELECT * FROM \`${this.tableName}\``;
    const IDENTIFIER_REGEX = /^[a-zA-Z0-9_]+$/;
    const whereClauses: string[] = [];
    const vals: any[] = [];

    const keys = Object.keys(query).filter(k => (query as any)[k] !== undefined && IDENTIFIER_REGEX.test(k));
    for (const k of keys) {
      const val = (query as any)[k];
      if (val === null) {
        whereClauses.push(`\`${k}\` IS NULL`);
      } else {
        whereClauses.push(`\`${k}\` = ?`);
        if (JSON_FIELDS[this.tableName]?.includes(k) && typeof val !== "string") {
          vals.push(JSON.stringify(val));
        } else {
          vals.push(val);
        }
      }
    }

    // Auto filter soft-deleted rows if applicable and not explicitly requested
    if (SOFT_DELETABLE_TABLES.has(this.tableName) && !options.includeDeleted && (query as any).deletedAt === undefined) {
      whereClauses.push("`deletedAt` IS NULL");
    }

    if (whereClauses.length > 0) {
      sql += " WHERE " + whereClauses.join(" AND ");
    }

    if (options.sort) {
      const sortKeys = Object.keys(options.sort).filter(k => IDENTIFIER_REGEX.test(k));
      if (sortKeys.length > 0) {
        const orderClauses = sortKeys.map(k => `\`${k}\` ${options.sort![k] === "DESC" ? "DESC" : "ASC"}`);
        sql += " ORDER BY " + orderClauses.join(", ");
      }
    }

    if (options.limit !== undefined) {
      sql += " LIMIT ?";
      vals.push(Number(options.limit));
      if (options.offset !== undefined) {
        sql += " OFFSET ?";
        vals.push(Number(options.offset));
      }
    }

    const [rows]: any = await pool.query(sql, vals);
    return rows.map((r: any) => this.parseRow(r));
  }

  public async count(query: Partial<T> = {}, options: { includeDeleted?: boolean } = {}): Promise<number> {
    let sql = `SELECT COUNT(*) as total FROM \`${this.tableName}\``;
    const IDENTIFIER_REGEX = /^[a-zA-Z0-9_]+$/;
    const whereClauses: string[] = [];
    const vals: any[] = [];

    const keys = Object.keys(query).filter(k => (query as any)[k] !== undefined && IDENTIFIER_REGEX.test(k));
    for (const k of keys) {
      const val = (query as any)[k];
      if (val === null) {
        whereClauses.push(`\`${k}\` IS NULL`);
      } else {
        whereClauses.push(`\`${k}\` = ?`);
        vals.push(val);
      }
    }

    if (SOFT_DELETABLE_TABLES.has(this.tableName) && !options.includeDeleted && (query as any).deletedAt === undefined) {
      whereClauses.push("`deletedAt` IS NULL");
    }

    if (whereClauses.length > 0) {
      sql += " WHERE " + whereClauses.join(" AND ");
    }

    const [rows]: any = await pool.query(sql, vals);
    return Number(rows[0]?.total || 0);
  }

  public async findOne(query: Partial<T>, options: { includeDeleted?: boolean } = {}): Promise<T | null> {
    const items = await this.find(query, { ...options, limit: 1 });
    return items.length > 0 ? items[0] : null;
  }

  public async insert(item: Omit<T, "id"> & { id?: string; organizationId?: string }): Promise<T> {
    const IDENTIFIER_REGEX = /^[a-zA-Z0-9_]+$/;
    const id = item.id || crypto.randomUUID();
    const withDefaults: any = { ...item, id };
    
    // Auto-assign default tenant for tenant-scoped records if not provided
    if (TENANT_SCOPED_TABLES.has(this.tableName) && !withDefaults.organizationId) {
      withDefaults.organizationId = "org-default";
    }

    const preparedItem = this.prepareValues(withDefaults);
    const keys = Object.keys(preparedItem).filter(k => IDENTIFIER_REGEX.test(k));
    const placeholders = keys.map(() => "?").join(", ");
    const columns = keys.map(k => `\`${k}\``).join(", ");
    const vals = keys.map(k => preparedItem[k]);

    const sql = `INSERT INTO \`${this.tableName}\` (${columns}) VALUES (${placeholders})`;
    await pool.query(sql, vals);
    return { ...withDefaults } as unknown as T;
  }

  public async update(id: string, updates: Partial<T>): Promise<T | null> {
    const IDENTIFIER_REGEX = /^[a-zA-Z0-9_]+$/;
    const preparedUpdates = this.prepareValues(updates);
    delete preparedUpdates.id; // Exclude id from being updated

    const keys = Object.keys(preparedUpdates).filter(k => IDENTIFIER_REGEX.test(k));
    if (keys.length === 0) {
      return this.findOne({ id } as any, { includeDeleted: true });
    }

    const setClause = keys.map(k => `\`${k}\` = ?`).join(", ");
    const vals = keys.map(k => preparedUpdates[k]);
    vals.push(id); // for the WHERE id = ? clause

    const sql = `UPDATE \`${this.tableName}\` SET ${setClause} WHERE \`id\` = ?`;
    await pool.query(sql, vals);

    return this.findOne({ id } as any, { includeDeleted: true });
  }

  public async softDelete(id: string): Promise<boolean> {
    if (SOFT_DELETABLE_TABLES.has(this.tableName)) {
      const sql = `UPDATE \`${this.tableName}\` SET \`deletedAt\` = ? WHERE \`id\` = ?`;
      const [result]: any = await pool.query(sql, [new Date().toISOString(), id]);
      return result.affectedRows > 0;
    }
    return this.delete(id);
  }

  public async restore(id: string): Promise<boolean> {
    if (SOFT_DELETABLE_TABLES.has(this.tableName)) {
      const sql = `UPDATE \`${this.tableName}\` SET \`deletedAt\` = NULL WHERE \`id\` = ?`;
      const [result]: any = await pool.query(sql, [id]);
      return result.affectedRows > 0;
    }
    return false;
  }

  public async delete(id: string): Promise<boolean> {
    const sql = `DELETE FROM \`${this.tableName}\` WHERE \`id\` = ?`;
    const [result]: any = await pool.query(sql, [id]);
    return result.affectedRows > 0;
  }
}

// Exporting MySQL-backed collections
export const organizationsDb = new MySQLCollection<Organization>("organizations");
export const usersDb = new MySQLCollection<{
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId?: string;
  departmentId?: string | null;
  managerId?: string | null;
  jobTitle?: string | null;
  profilePhoto?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  status: "active" | "suspended";
  bookmarkedBlogIds?: string[];
  passwordHash: string;
  phoneNumber?: string | null;
  location?: string | null;
}>("users");
export const coursesDb = new MySQLCollection<Course>("courses");
export const modulesDb = new MySQLCollection<Module>("modules");
export const lessonsDb = new MySQLCollection<Lesson>("lessons");
export const enrollmentsDb = new MySQLCollection<Enrollment>("enrollments");
export const progressDb = new MySQLCollection<Progress>("progress");
export const assessmentsDb = new MySQLCollection<Assessment>("assessments");
export const questionsDb = new MySQLCollection<Question>("questions");
export const submissionsDb = new MySQLCollection<Submission>("submissions");
export const codingSubmissionsDb = new MySQLCollection<CodingSubmission>("coding_submissions");
export const blogsDb = new MySQLCollection<Blog>("blogs");
export const commentsDb = new MySQLCollection<Comment>("comments");
export const reviewsDb = new MySQLCollection<Review>("reviews");
export const userPreferencesDb = new MySQLCollection<UserPreference>("user_preferences");
export const learningPathsDb = new MySQLCollection<LearningPath>("learning_paths");
export const learningPathSectionsDb = new MySQLCollection<LearningPathSection>("learning_path_sections");
export const learningPathItemsDb = new MySQLCollection<LearningPathItem>("learning_path_items");
export const learningPathAssignmentsDb = new MySQLCollection<LearningPathAssignment>("learning_path_assignments");
export const learningPathProgressDb = new MySQLCollection<LearningPathProgress>("learning_path_progress");
export const codingChallengesDb = new MySQLCollection<CodingChallenge>("coding_challenges");
export const codingSavedCodeDb = new MySQLCollection<CodingSavedCode>("coding_saved_code");
export const assessmentAssignmentsDb = new MySQLCollection<AssessmentAssignment>("assessment_assignments");
export const codingChaptersDb = new MySQLCollection<CodingChapter>("coding_chapters");
export const codingTopicsDb = new MySQLCollection<CodingTopic>("coding_topics");
export const studentPlaygroundProgramsDb = new MySQLCollection<StudentPlaygroundProgram>("student_playground_programs");
export const groupsDb = new MySQLCollection<Group>("groups");
export const groupMembersDb = new MySQLCollection<GroupMember>("group_members");
export const assessmentAttemptsDb = new MySQLCollection<AssessmentAttempt>("assessment_attempts");
export const certificateTemplatesDb = new MySQLCollection<CertificateTemplate>("certificate_templates");
export const certificatesDb = new MySQLCollection<Certificate>("certificates");
export const departmentsDb = new MySQLCollection<Department>("departments");
export const departmentMembersDb = new MySQLCollection<DepartmentMember>("department_members");
export const cohortsDb = new MySQLCollection<Cohort>("cohorts");
export const cohortMembersDb = new MySQLCollection<CohortMember>("cohort_members");
export const notificationsDb = new MySQLCollection<NotificationItem>("notifications");
export const emailQueueDb = new MySQLCollection<EmailQueueItem>("email_queue");
export const notificationPreferencesDb = new MySQLCollection<NotificationPreferences>("notification_preferences");
export const reminderLogsDb = new MySQLCollection<ReminderLog>("reminder_logs");
export const notificationTemplatesDb = new MySQLCollection<NotificationTemplate>("notification_templates");
export const institutionsDb = new MySQLCollection<Institution>("institutions");
export const batchesDb = new MySQLCollection<Batch>("batches");
export const batchStudentsDb = new MySQLCollection<BatchStudent>("batch_students");
export const batchCoursesDb = new MySQLCollection<BatchCourse>("batch_courses");
export const batchAssessmentsDb = new MySQLCollection<BatchAssessment>("batch_assessments");
export const batchLearningPathsDb = new MySQLCollection<BatchLearningPath>("batch_learning_paths");

