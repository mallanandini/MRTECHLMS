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
  bookmarkedBlogIds?: string[];
  assignedCoursesCount?: number;
  assignedAssessmentsCount?: number;
  completedAssessmentsCount?: number;
}

export interface Course {
  id: string;
  title: string;
  shortDescription?: string;
  description: string;
  difficulty?: string;
  thumbnail: string;
  banner: string;
  instructorId: string;
  instructorName: string;
  category: string;
  requirements: string[];
  skillsCovered: string[];
  status: "draft" | "published" | "archived" | "rejected";
  isFeatured: boolean;
  rating: number;
  reviewsCount: number;
  createdAt: string;
  modulesCount?: number;
  lessonsCount?: number;
  assessmentsCount?: number;
  studentsCount?: number;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  lessons?: Lesson[];
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
  description?: string;
  type: LessonType;
  content?: string; // Text content, HTML or Markdown
  videoUrl?: string;
  fileUrl?: string; // For PDFs/images/downloadables
  materialTitle?: string;
  materialUrl?: string;
  codingPrompt?: CodingProblem; // If type is coding
  order: number;
  durationMinutes: number; // For video/estimated reading
  practiceTest?: Assessment;
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

export type ChallengeType = "programming" | "web";

export interface CodingChallenge {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  challengeType: ChallengeType;
  supportedLanguages: string[]; // ["python", "javascript", "java", "sql", "c", "cpp"]
  starterCode: { [key: string]: string };
  htmlStarterCode?: string;
  cssStarterCode?: string;
  javascriptStarterCode?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  examples?: Array<{ input: string; output: string; explanation?: string }>;
  publicTestCases: TestCase[];
  privateTestCases?: TestCase[]; // Only in DB or admin, never sent to student
  hints?: string[];
  solutionExplanation?: string;
  timeLimit?: number; // ms
  memoryLimit?: number; // MB
  createdAt: string;
  updatedAt: string;
  chapterId?: string;
  topicId?: string;
  orderIndex?: number;
  // Dynamic computed fields for student:
  isSolved?: boolean;
  hasAttempted?: boolean;
  status?: "not_started" | "in_progress" | "solved";
  lastSubmittedAt?: string;
  savedCode?: CodingSavedCode;
}

export interface CodingChapter {
  id: string;
  title: string;
  slug: string;
  description?: string;
  icon?: string;
  orderIndex: number;
  topicsCount?: number;
  problemsCount?: number;
  solvedCount?: number;
  progressPercent?: number;
  createdAt?: string;
  updatedAt?: string;
  topics?: CodingTopic[];
}

export interface CodingTopic {
  id: string;
  chapterId: string;
  title: string;
  slug: string;
  description?: string;
  orderIndex: number;
  problemsCount?: number;
  solvedCount?: number;
  progressPercent?: number;
  easyCount?: number;
  mediumCount?: number;
  hardCount?: number;
  createdAt?: string;
  updatedAt?: string;
  problems?: CodingChallenge[];
}

export interface StudentPlaygroundProgram {
  id: string;
  studentId: string;
  title: string;
  language: string;
  code: string;
  input?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CodingSavedCode {
  id: string;
  studentId: string;
  challengeId: string;
  language: string;
  code?: string;
  htmlCode?: string;
  cssCode?: string;
  jsCode?: string;
  updatedAt: string;
}

export interface TestCaseResult {
  id: string;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  passed: boolean;
  status: "passed" | "failed" | "error" | "time_limit_exceeded";
  error?: string;
  executionTimeMs?: number;
}

export interface ExecutionResult {
  status: "passed" | "failed" | "compilation_error" | "runtime_error" | "time_limit_exceeded";
  stdout: string;
  stderr?: string;
  error?: string;
  executionTimeMs?: number;
  results?: TestCaseResult[];
  passedCount?: number;
  totalCount?: number;
}

export interface RuntimeInfo {
  id: string;
  name: string;
  version: string;
  available: boolean;
  executable: boolean;
  icon?: string;
  fileExtension: string;
  monacoLanguage: string;
  description: string;
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
  explanation?: string;
  difficulty?: "easy" | "medium" | "hard";
  order?: number;
}

export interface Assessment {
  id: string;
  courseId?: string;
  learningPathId?: string;
  learningPathItemId?: string;
  moduleId?: string;
  lessonId?: string;
  type?: "lesson_practice" | "course_final" | "path_practice" | "path_final" | "standalone";
  title: string;
  description: string;
  shortDescription?: string;
  instructions?: string;
  category?: string;
  difficulty?: "beginner" | "intermediate" | "advanced" | "easy" | "medium" | "hard" | string;
  assessmentType?: string;
  durationMinutes: number;
  passingScore: number;
  totalPoints: number;
  questionsCount: number;
  maxAttempts?: number;
  questionNavigation?: "free" | "sequential";
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  revealAnswers?: boolean;
  authorId?: string;
  authorName?: string;
  createdAt: string;
  updatedAt?: string;
  status: "published" | "draft" | "archived";
  questions?: Question[];
  // Enriched metric fields
  assignedStudentsCount?: number;
  attemptsCount?: number;
  averageScore?: number;
  submission?: Submission;
  assignment?: AssessmentAssignment;
}

export interface AssessmentAssignment {
  id: string;
  assessmentId: string;
  studentId: string;
  assignedBy: string;
  assignedAt: string;
  dueDate?: string;
  status: "assigned" | "in_progress" | "completed";
  createdAt: string;
  updatedAt: string;
  // Enriched fields
  studentName?: string;
  studentEmail?: string;
  assessmentTitle?: string;
  attemptsCount?: number;
  bestScore?: number;
  latestScore?: number;
  completedAt?: string;
}

export interface QuestionImportResult {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  errors: Array<{ row: number; reason: string }>;
  importedCount?: number;
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

export type ThemeId = 
  | "default-blue" 
  | "purple-royal" 
  | "emerald-green" 
  | "sunset-orange" 
  | "cyber-dark" 
  | "high-contrast";

export type ThemeMode = "light" | "dark";

export interface UserPreference {
  id: string;
  userId: string;
  theme: ThemeId;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mode: ThemeMode;
  createdAt: string;
  updatedAt: string;
}

export interface ThemeColors {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  light: ThemeColors;
  dark: ThemeColors;
}

export type LearningPathItemType = "text" | "video" | "pdf" | "assessment";

export interface LearningPath {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  description: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "Beginner" | "Intermediate" | "Advanced";
  thumbnail?: string;
  estimatedDuration?: string;
  requirements: string[];
  learningObjectives: string[];
  status: "draft" | "published" | "archived";
  authorId: string;
  authorName: string;
  finalAssessmentId?: string;
  createdAt: string;
  updatedAt: string;
  // Computed / joined fields
  sectionsCount?: number;
  itemsCount?: number;
  assignedStudentsCount?: number;
  completionRate?: number;
  sections?: LearningPathSection[];
  finalAssessment?: Assessment;
}

export interface LearningPathSection {
  id: string;
  learningPathId: string;
  title: string;
  description?: string;
  order: number;
  createdAt: string;
  items?: LearningPathItem[];
}

export interface LearningPathItem {
  id: string;
  sectionId: string;
  learningPathId: string;
  title: string;
  description?: string;
  type: LearningPathItemType;
  order: number;
  durationMinutes: number;
  isRequired: boolean;
  content?: string;
  videoSource?: "youtube" | "vimeo" | "upload";
  videoUrl?: string;
  fileUrl?: string;
  fileName?: string;
  assessmentId?: string;
  assessment?: Assessment;
  status?: "completed" | "current" | "locked";
  createdAt: string;
  updatedAt: string;
}

export interface LearningPathAssignment {
  id: string;
  learningPathId: string;
  studentId: string;
  assignedBy: string;
  assignedAt: string;
  completedAt?: string;
  studentName?: string;
  studentEmail?: string;
  progressPercent?: number;
}

export interface LearningPathProgress {
  id: string;
  learningPathId: string;
  studentId: string;
  itemId: string;
  completed: boolean;
  completedAt?: string;
  timeSpentSeconds?: number;
}

