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
  CodingChallenge, CodingSavedCode, CodingChapter, CodingTopic, StudentPlaygroundProgram
} from "../src/types.js";

const JSON_FIELDS: { [table: string]: string[] } = {
  users: ["bookmarkedBlogIds"],
  courses: ["requirements", "skillsCovered"],
  lessons: ["codingPrompt"],
  questions: ["options", "correctAnswers"],
  submissions: ["answers"],
  blogs: ["tags"],
  learning_paths: ["requirements", "learningObjectives"],
  coding_challenges: ["supportedLanguages", "starterCode", "examples", "publicTestCases", "privateTestCases", "hints"]
};

class MySQLCollection<T extends { id: string }> {
  private tableName: string;

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
      if (typeof result[key] === "number" && (key.startsWith("is") || key === "completed" || key === "passed")) {
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

  public async find(query: Partial<T> = {}): Promise<T[]> {
    let sql = `SELECT * FROM \`${this.tableName}\``;
    const IDENTIFIER_REGEX = /^[a-zA-Z0-9_]+$/;
    const keys = Object.keys(query).filter(k => (query as any)[k] !== undefined && IDENTIFIER_REGEX.test(k));
    const vals = keys.map(k => {
      const val = (query as any)[k];
      if (JSON_FIELDS[this.tableName]?.includes(k) && typeof val !== "string") {
        return JSON.stringify(val);
      }
      return val;
    });

    if (keys.length > 0) {
      sql += " WHERE " + keys.map(k => `\`${k}\` = ?`).join(" AND ");
    }

    const [rows]: any = await pool.query(sql, vals);
    return rows.map((r: any) => this.parseRow(r));
  }

  public async findOne(query: Partial<T>): Promise<T | null> {
    const items = await this.find(query);
    return items.length > 0 ? items[0] : null;
  }

  public async insert(item: Omit<T, "id"> & { id?: string }): Promise<T> {
    const IDENTIFIER_REGEX = /^[a-zA-Z0-9_]+$/;
    const id = item.id || crypto.randomUUID();
    const preparedItem = this.prepareValues({ ...item, id });
    const keys = Object.keys(preparedItem).filter(k => IDENTIFIER_REGEX.test(k));
    const placeholders = keys.map(() => "?").join(", ");
    const columns = keys.map(k => `\`${k}\``).join(", ");
    const vals = keys.map(k => preparedItem[k]);

    const sql = `INSERT INTO \`${this.tableName}\` (${columns}) VALUES (${placeholders})`;
    await pool.query(sql, vals);
    return { ...item, id } as unknown as T;
  }

  public async update(id: string, updates: Partial<T>): Promise<T | null> {
    const IDENTIFIER_REGEX = /^[a-zA-Z0-9_]+$/;
    const preparedUpdates = this.prepareValues(updates);
    delete preparedUpdates.id; // Exclude id from being updated

    const keys = Object.keys(preparedUpdates).filter(k => IDENTIFIER_REGEX.test(k));
    if (keys.length === 0) {
      return this.findOne({ id } as any);
    }

    const setClause = keys.map(k => `\`${k}\` = ?`).join(", ");
    const vals = keys.map(k => preparedUpdates[k]);
    vals.push(id); // for the WHERE id = ? clause

    const sql = `UPDATE \`${this.tableName}\` SET ${setClause} WHERE \`id\` = ?`;
    await pool.query(sql, vals);

    return this.findOne({ id } as any);
  }

  public async delete(id: string): Promise<boolean> {
    const sql = `DELETE FROM \`${this.tableName}\` WHERE \`id\` = ?`;
    const [result]: any = await pool.query(sql, [id]);
    return result.affectedRows > 0;
  }
}

// Exporting MySQL-backed collections
export const usersDb = new MySQLCollection<{ id: string; name: string; email: string; role: UserRole; profilePhoto?: string; createdAt: string; status: "active" | "suspended"; bookmarkedBlogIds?: string[]; passwordHash: string }>("users");
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
