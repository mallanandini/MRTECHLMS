/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  STUDENT = "student",
  TRAINER = "trainer",
  ADMIN = "admin",
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profilePhoto?: string;
  createdAt: string;
  status: "active" | "suspended";
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  banner: string;
  instructorId: string;
  instructorName: string;
  category: string;
  requirements: string[];
  skillsCovered: string[];
  status: "draft" | "published" | "rejected";
  isFeatured: boolean;
  rating: number;
  reviewsCount: number;
  createdAt: string;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  order: number;
}

export enum LessonType {
  VIDEO = "video",
  PDF = "pdf",
  IMAGE = "image",
  TEXT = "text",
  CODING = "coding",
}

export interface Lesson {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  type: LessonType;
  content?: string; // Text content, HTML or Markdown
  videoUrl?: string;
  fileUrl?: string; // For PDFs/images/downloadables
  codingPrompt?: CodingProblem; // If type is coding
  order: number;
  durationMinutes: number; // For video/estimated reading
}

export interface CodingProblem {
  id: string;
  title: string;
  description: string; // Markdown instructions
  difficulty: "easy" | "medium" | "hard";
  allowedLanguages: string[]; // ['python', 'javascript', 'cpp', 'java']
  starterCode: { [key: string]: string }; // Map of language to starter code
  testCases: TestCase[];
  hints?: string[];
  solutionCode?: string;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isPublic: boolean;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrolledAt: string;
  completedAt?: string;
}

export interface Progress {
  id: string;
  studentId: string;
  courseId: string;
  lessonId: string;
  completed: boolean;
  completedAt?: string;
  timeSpentSeconds?: number;
}

export enum QuestionType {
  MCQ_SINGLE = "mcq_single",
  MCQ_MULTI = "mcq_multi",
  TRUE_FALSE = "true_false",
  FILL_BLANKS = "fill_blanks",
  SUBJECTIVE = "subjective",
}

export interface Question {
  id: string;
  assessmentId: string;
  type: QuestionType;
  questionText: string;
  options?: string[]; // For MCQ
  correctAnswers: string[]; // For MCQ correct options, TF "true"/"false", FB matches
  points: number;
  negativePoints?: number;
}

export interface Assessment {
  id: string;
  courseId: string;
  moduleId?: string;
  title: string;
  description: string;
  durationMinutes: number;
  passingScore: number;
  totalPoints: number;
  questionsCount: number;
  createdAt: string;
  status: "published" | "draft";
}

export interface Submission {
  id: string;
  assessmentId: string;
  studentId: string;
  studentName: string;
  answers: { [questionId: string]: string[] }; // user selections/text
  score: number;
  totalPoints: number;
  passed: boolean;
  submittedAt: string;
  timeTakenSeconds: number;
}

export interface CodingSubmission {
  id: string;
  studentId: string;
  studentName: string;
  problemId: string;
  language: string;
  code: string;
  status: "passed" | "failed" | "error";
  output?: string;
  passedCount: number;
  totalCount: number;
  submittedAt: string;
}

export interface Blog {
  id: string;
  title: string;
  content: string; // Markdown format
  summary: string;
  coverImage?: string;
  authorId: string;
  authorName: string;
  category: string;
  tags: string[];
  likesCount: number;
  bookmarksCount: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface Comment {
  id: string;
  blogId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
}

export interface Review {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
}
