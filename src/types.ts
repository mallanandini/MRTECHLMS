export interface UserAssignedCourse {
  id: string;
  title: string;
  category?: string;
  source?: string;
  sourceDetails?: string;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  STUDENT = "student",
  TRAINER = "trainer",
  ADMIN = "admin",
  SUPER_ADMIN = "super_admin",
  MANAGER = "manager",
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logoUrl?: string;
  settings?: Record<string, any>;
  status: "active" | "inactive" | "suspended";
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId?: string;
  departmentId?: string | null;
  departmentName?: string | null;
  managerId?: string | null;
  managerName?: string | null;
  jobTitle?: string | null;
  profilePhoto?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  status: "active" | "suspended";
  phoneNumber?: string | null;
  location?: string | null;
  bookmarkedBlogIds?: string[];
  assignedCoursesCount?: number;
  assignedCourses?: UserAssignedCourse[];
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
  status: "draft" | "review" | "published" | "archived" | "rejected";
  isFeatured: boolean;
  rating: number;
  reviewsCount: number;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  organizationId?: string;
  estimatedDuration?: string;
  tags?: string[];
  prerequisites?: string[];
  version?: number;
  modulesCount?: number;
  lessonsCount?: number;
  assessmentsCount?: number;
  studentsCount?: number;
  certificateEnabled?: boolean;
  certificateTemplateId?: string;
  certificateTitle?: string;
  requireFinalAssessment?: boolean;
  validityMonths?: number | null;
  signatoryName?: string;
  signatoryTitle?: string;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  status?: "draft" | "published";
  deletedAt?: string;
  lessons?: Lesson[];
}

export enum LessonType {
  VIDEO = "video",
  PDF = "pdf",
  IMAGE = "image",
  TEXT = "text",
  CODING = "coding",
  ASSESSMENT = "assessment",
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
  assessmentId?: string; // If type is assessment
  order: number;
  durationMinutes: number; // For video/estimated reading
  status?: "draft" | "published";
  deletedAt?: string;
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

export type AccessStatus = "assigned" | "not_started" | "in_progress" | "completed" | "expired" | "revoked";
export type AssignmentSource = "individual" | "bulk" | "group" | "course" | "learning_path" | "self" | "batch";

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  organizationId?: string;
  enrolledAt: string;
  completedAt?: string;
  lastLessonId?: string;
  lastAccessedAt?: string;
  progressPercentage?: number;
  status?: AccessStatus;
  assignedBy?: string;
  assignedAt?: string;
  dueDate?: string | null;
  isMandatory?: boolean;
  assignmentSource?: AssignmentSource;
  assignmentSourceId?: string | null;
  isDenied?: boolean;
  revokedAt?: string | null;
  revokedBy?: string | null;
  revocationReason?: string | null;
  deletedAt?: string | null;
  // Enriched fields
  studentName?: string;
  studentEmail?: string;
  courseTitle?: string;
  isOverdue?: boolean;
}

export interface Progress {
  id: string;
  studentId: string;
  courseId: string;
  lessonId: string;
  completed: boolean;
  completedAt?: string;
  timeSpentSeconds?: number;
  status?: "not_started" | "in_progress" | "completed";
  lastAccessedAt?: string;
  progressPercent?: number;
  lastPositionSeconds?: number;
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
  deletedAt?: string;
}

export interface Assessment {
  id: string;
  organizationId?: string;
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
  dueDate?: string;
  questionNavigation?: "free" | "sequential";
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  revealAnswers?: boolean;
  authorId?: string;
  authorName?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
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
  organizationId?: string;
  assessmentId: string;
  studentId: string;
  assignedBy: string;
  assignedAt: string;
  dueDate?: string | null;
  status: AccessStatus;
  isMandatory?: boolean;
  assignmentSource?: AssignmentSource;
  assignmentSourceId?: string | null;
  isDenied?: boolean;
  revokedAt?: string | null;
  revokedBy?: string | null;
  revocationReason?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  // Enriched fields
  studentName?: string;
  studentEmail?: string;
  assessmentTitle?: string;
  attemptsCount?: number;
  bestScore?: number;
  latestScore?: number;
  completedAt?: string;
  isOverdue?: boolean;
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
  attemptId?: string;
  attemptNumber?: number;
  correctCount?: number;
  incorrectCount?: number;
  unansweredCount?: number;
  percentage?: number;
}

export interface AssessmentAttempt {
  id: string;
  organizationId?: string;
  assessmentId: string;
  studentId: string;
  attemptNumber: number;
  startedAt: string;
  expiresAt: string;
  submittedAt?: string | null;
  timeTakenSeconds?: number;
  status: "in_progress" | "submitted" | "timed_out" | "abandoned";
  questionOrder?: string[];
  answers?: Record<string, string[]>;
  score?: number | null;
  totalPoints?: number | null;
  percentage?: number | null;
  passed?: boolean | null;
  correctCount?: number;
  incorrectCount?: number;
  unansweredCount?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface AdminAssessmentResultRow {
  id: string; // submission id or assignment id if unattempted
  submissionId?: string;
  assignmentId?: string;
  assessmentId: string;
  assessmentTitle: string;
  assessmentCategory: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: "passed" | "failed" | "assigned" | "in_progress";
  score: number | null;
  totalPoints: number;
  percentage: number | null;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  timeTakenSeconds: number;
  submittedAt: string | null;
  assignedAt: string;
  dueDate?: string | null;
}

export interface AdminResultsSummary {
  totalAssigned: number;
  totalSubmissions: number;
  uniqueStudentsAttempted: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
  averageScore: number;
  results: AdminAssessmentResultRow[];
}

export interface QuestionPerformanceDetail {
  id: string;
  order: number;
  questionText: string;
  type: QuestionType;
  points: number;
  negativePoints: number;
  difficulty: string;
  options: string[];
  studentAnswers: string[];
  correctAnswers: string[];
  isCorrect: boolean;
  isAttempted: boolean;
  pointsEarned: number;
  explanation?: string | null;
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
  deletedAt?: string;
  organizationId?: string;
  // Computed / joined fields
  sectionsCount?: number;
  itemsCount?: number;
  assignedStudentsCount?: number;
  completionRate?: number;
  sections?: LearningPathSection[];
  finalAssessment?: Assessment;
  certificateEnabled?: boolean;
  certificateTemplateId?: string;
  certificateTitle?: string;
  validityMonths?: number | null;
  signatoryName?: string;
  signatoryTitle?: string;
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
  organizationId?: string;
  learningPathId: string;
  studentId: string;
  assignedBy: string;
  assignedAt: string;
  dueDate?: string | null;
  status?: AccessStatus;
  isMandatory?: boolean;
  assignmentSource?: AssignmentSource;
  assignmentSourceId?: string | null;
  isDenied?: boolean;
  revokedAt?: string | null;
  revokedBy?: string | null;
  revocationReason?: string | null;
  deletedAt?: string | null;
  completedAt?: string;
  studentName?: string;
  studentEmail?: string;
  progressPercent?: number;
  isOverdue?: boolean;
}

export type GroupType = "general" | "department" | "cohort" | "team" | "track";
export type OrganizationEntityStatus = "active" | "archived";
export type CohortStatus = "upcoming" | "active" | "completed" | "archived";

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string;
  managerId?: string | null;
  managerName?: string | null;
  managerEmail?: string | null;
  status: OrganizationEntityStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  memberCount?: number;
  members?: User[];
}

export interface DepartmentMember {
  id: string;
  organizationId: string;
  departmentId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user?: User;
}

export interface Cohort {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string;
  startDate?: string | null;
  endDate?: string | null;
  status: CohortStatus;
  managerId?: string | null;
  managerName?: string | null;
  managerEmail?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  memberCount?: number;
  members?: User[];
}

export interface CohortMember {
  id: string;
  organizationId: string;
  cohortId: string;
  userId: string;
  status: "active" | "completed" | "dropped";
  joinedAt: string;
  user?: User;
}

export interface Group {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  type?: GroupType;
  departmentId?: string | null;
  departmentName?: string | null;
  cohortId?: string | null;
  cohortName?: string | null;
  managerId?: string | null;
  managerName?: string | null;
  status?: OrganizationEntityStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  memberCount?: number;
  members?: User[];
}

export interface GroupMember {
  id: string;
  organizationId: string;
  groupId: string;
  userId: string;
  addedAt: string;
  user?: User;
}

// Manager Reporting & Scoping Data Models
export interface TeamLearnerSummary {
  id: string;
  name: string;
  email: string;
  jobTitle?: string | null;
  status: "active" | "suspended";
  profilePhoto?: string;
  department?: { id: string; name: string; code: string } | null;
  manager?: { id: string; name: string; email: string } | null;
  cohorts: Array<{ id: string; name: string; code: string }>;
  groups: Array<{ id: string; name: string; type: string }>;
  assignedCoursesCount: number;
  completedCoursesCount: number;
  assignedAssessmentsCount: number;
  completedAssessmentsCount: number;
  overdueCount: number;
  certificatesCount: number;
}

export interface TeamCourseProgressItem {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  departmentName?: string | null;
  courseId: string;
  courseTitle: string;
  courseCategory?: string;
  courseThumbnail?: string;
  progressPercent: number;
  status: AccessStatus;
  assignedAt: string;
  dueDate?: string | null;
  isOverdue: boolean;
  completedAt?: string | null;
  lastAccessedLessonId?: string | null;
}

export interface TeamAssessmentResultItem {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  departmentName?: string | null;
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  passingScore: number;
  submittedAt: string;
  attemptNumber?: number;
}

export interface TeamOverdueItem {
  id: string;
  type: "course" | "assessment" | "learning_path";
  itemId: string;
  itemTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  departmentName?: string | null;
  assignedAt: string;
  dueDate: string;
  daysOverdue: number;
  isMandatory: boolean;
}

export interface TeamStatsSummary {
  totalLearners: number;
  totalAssignedCourses: number;
  totalCompletedCourses: number;
  courseCompletionRate: number;
  totalAssignedAssessments: number;
  totalPassedAssessments: number;
  assessmentPassRate: number;
  totalOverdueItems: number;
  totalCertificatesEarned: number;
  departmentBreakdown: Array<{ name: string; count: number }>;
}

export interface StudentOrganizationAffiliation {
  department: { id: string; name: string; code: string; managerName?: string | null } | null;
  manager: { id: string; name: string; email: string } | null;
  cohorts: Array<{ id: string; name: string; code: string; status: string; startDate?: string | null; endDate?: string | null }>;
  groups: Array<{ id: string; name: string; type: string; description?: string }>;
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

export type CertificateStyle = "classic_gold" | "modern_emerald" | "executive_navy" | "tech_violet";
export type CertificateStatus = "active" | "revoked" | "expired";

export interface CertificateTemplate {
  id: string;
  organizationId?: string;
  name: string;
  description?: string;
  style: CertificateStyle;
  primaryColor: string;
  accentColor: string;
  badgeIcon: string;
  borderStyle: string;
  defaultSignatoryName: string;
  defaultSignatoryTitle: string;
  organizationName: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Certificate {
  id: string;
  certificateNumber: string;
  verificationCode: string;
  organizationId?: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  type: "course" | "learning_path";
  courseId?: string | null;
  learningPathId?: string | null;
  title: string;
  certificateTitle: string;
  templateId?: string | null;
  templateStyle: CertificateStyle;
  scorePercentage?: number | null;
  issuedAt: string;
  expiresAt?: string | null;
  status: CertificateStatus;
  signatoryName: string;
  signatoryTitle: string;
  organizationName: string;
  isDenied?: boolean;
  revokedAt?: string | null;
  revokedBy?: string | null;
  revocationReason?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface PublicCertificateVerification {
  valid: boolean;
  status: CertificateStatus;
  certificateNumber: string;
  recipientName: string;
  title: string;
  certificateTitle: string;
  type: "course" | "learning_path";
  organizationName: string;
  issuedAt: string;
  expiresAt?: string | null;
  signatoryName: string;
  signatoryTitle: string;
  isDenied?: boolean;
  revokedAt?: string | null;
  revocationReason?: string | null;
}

// ==========================================
// NOTIFICATION & REMINDER SYSTEM TYPES
// ==========================================

export type NotificationType =
  | "course_assigned"
  | "learning_path_assigned"
  | "assessment_assigned"
  | "approaching_due_date"
  | "overdue_learning"
  | "assessment_result"
  | "certificate_issued"
  | "certificate_expiring"
  | "course_published"
  | "admin_announcement";

export type NotificationChannel = "in_app" | "email" | "both";
export type NotificationDeliveryStatus = "pending" | "delivered" | "failed";

export interface NotificationItem {
  id: string;
  organizationId?: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any> | null;
  read: boolean;
  readAt?: string | null;
  channel: NotificationChannel;
  deliveryStatus: NotificationDeliveryStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type EmailQueueStatus = "pending" | "processing" | "sent" | "failed";

export interface EmailQueueItem {
  id: string;
  organizationId?: string;
  recipientEmail: string;
  recipientName?: string | null;
  userId?: string | null;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  notificationType: string;
  status: EmailQueueStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string | null;
  scheduledAt: string;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  organizationId?: string;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  courseAssigned: boolean;
  learningPathAssigned: boolean;
  assessmentAssigned: boolean;
  dueDateReminders: boolean;
  overdueAlerts: boolean;
  assessmentResults: boolean;
  certificateAlerts: boolean;
  coursePublished: boolean;
  announcements: boolean;
  reminderDaysBefore: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationTemplate {
  id: string;
  organizationId?: string;
  type: NotificationType;
  name: string;
  description?: string | null;
  inAppTitleTemplate: string;
  inAppBodyTemplate: string;
  emailSubjectTemplate: string;
  emailBodyTemplate: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderLog {
  id: string;
  organizationId?: string;
  userId: string;
  entityType: "course" | "learning_path" | "assessment" | "certificate";
  entityId: string;
  reminderType: string;
  dedupKey: string;
  sentAt: string;
}

export interface ReminderSweepResult {
  coursesReminded: number;
  assessmentsReminded: number;
  learningPathsReminded: number;
  overdueAlerts: number;
  certReminders: number;
  processed: number;
  skipped: number;
  failed: number;
  timestamp: string;
}

export interface Institution {
  id: string;
  organizationId?: string;
  name: string;
  code: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  academicYears?: string[];
  status: "active" | "inactive" | "archived";
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  batchCount?: number;
  studentCount?: number;
}

export interface Batch {
  id: string;
  organizationId?: string;
  institutionId: string;
  institutionName?: string;
  institutionCode?: string;
  name: string;
  code: string;
  academicYear: string;
  courseId?: string | null;
  courseName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  maxStudents?: number | null;
  description?: string | null;
  status: "active" | "inactive" | "archived";
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  studentCount?: number;
  courseCount?: number;
  assessmentCount?: number;
}

export interface BatchStudent {
  id: string;
  organizationId?: string;
  batchId: string;
  batchName?: string;
  batchCode?: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  enrolledAt: string;
  status: "active" | "inactive" | "completed" | "dropped";
  createdAt: string;
  updatedAt: string;
  batches?: { id: string; name: string; code: string; status: string }[];
}

export interface BatchCourse {
  id: string;
  organizationId?: string;
  batchId: string;
  courseId: string;
  courseTitle?: string;
  courseThumbnail?: string;
  assignedAt: string;
  assignedBy?: string | null;
  status: "active" | "revoked";
}

export interface BatchAssessment {
  id: string;
  organizationId?: string;
  batchId: string;
  assessmentId: string;
  assessmentTitle?: string;
  assignedAt: string;
  assignedBy?: string | null;
  status: "active" | "revoked";
}

export interface BatchLearningPath {
  id: string;
  organizationId?: string;
  batchId: string;
  learningPathId: string;
  learningPathTitle?: string;
  learningPathThumbnail?: string;
  category?: string;
  assignedAt: string;
  assignedBy?: string | null;
  status: "active" | "revoked";
}

export interface EffectiveLearningPathAccess {
  learningPathId: string;
  learningPathTitle: string;
  category?: string;
  thumbnail?: string;
  description?: string;
  shortDescription?: string;
  estimatedDuration?: string;
  difficulty?: string;
  pathStatus?: string;
  assignmentSource: string;
  sourceDetails: string;
  status: string;
  assignedAt: string;
  dueDate?: string | null;
  isMandatory?: boolean;
  canRevoke: boolean;
  hasDirectAccess: boolean;
  hasBatchAccess: boolean;
  isDenied: boolean;
  effectiveStatus: "active" | "revoked" | "unassigned";
  batches: Array<{ id: string; name: string; code: string; assignedAt: string }>;
}

export interface BatchExcelPreviewRow {
  rowNumber: number;
  name: string;
  code: string;
  institutionCode: string;
  academicYear: string;
  startDate?: string;
  endDate?: string;
  maxStudents?: number;
  description?: string;
  isValid: boolean;
  errors: string[];
}

export interface BatchStudentAssignPreviewRow {
  rowNumber: number;
  studentEmail: string;
  batchCode: string;
  studentName?: string;
  batchName?: string;
  isValid: boolean;
  errors: string[];
}

export interface BatchHierarchyYear {
  year: string;
  batchesCount: number;
  totalStudentsCount: number;
  totalCoursesCount: number;
  batches: Array<Batch & {
    students?: Array<{ id: string; name: string; email: string; role?: string }>;
    courses?: Array<{ id: string; title: string; category?: string; thumbnail?: string; instructorName?: string }>;
  }>;
}

export interface BatchHierarchyInstitution {
  id: string;
  name: string;
  code: string;
  totalBatches: number;
  years: BatchHierarchyYear[];
}

export interface EffectiveCourseAccess {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  category: string;
  instructorName: string;
  enrolledAt: string;
  status: string;
  assignmentSource: "individual" | "batch" | "individual_and_batch" | string;
  sourceDetails: string;
  canRevoke: boolean;
  hasDirectAccess: boolean;
  hasBatchAccess: boolean;
  batches: Array<{ id: string; name: string; code: string }>;
}

