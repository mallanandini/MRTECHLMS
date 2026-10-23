/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AiFeatureType = 
  | "course_generator"
  | "quiz_generator"
  | "lesson_tutor"
  | "coding_hints"
  | "assessment_explanation"
  | "skill_gap_analysis";

export interface AiOrganizationSettings {
  organizationId: string;
  aiEnabled: boolean;
  courseGeneratorEnabled: boolean;
  quizGeneratorEnabled: boolean;
  lessonTutorEnabled: boolean;
  codingHintsEnabled: boolean;
  assessmentExplanationsEnabled: boolean;
  skillGapAnalysisEnabled: boolean;
  monthlyTokenQuota: number;
  monthlyTokensUsed: number;
  dailyUserRequestLimit: number;
  quotaResetMonth: string;
  updatedAt: string;
}

export interface AiInteractionLog {
  id: string;
  organizationId: string;
  userId: string;
  feature: AiFeatureType;
  contextType?: string;
  contextId?: string;
  promptTokensEstimate: number;
  completionTokensEstimate: number;
  totalTokens: number;
  latencyMs: number;
  safetyPassed: boolean;
  safetyNotes?: string;
  createdAt: string;
}

export interface CourseGenerationPromptInput {
  topic: string;
  targetAudience: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  durationHours: number;
  learningObjectives: string[];
}

export interface GeneratedLessonDraft {
  title: string;
  type: "video" | "article" | "coding";
  durationMinutes: number;
  contentSummary: string;
  codingPrompt?: {
    language: string;
    starterCode: string;
    instructions: string;
  };
}

export interface GeneratedModuleDraft {
  title: string;
  description: string;
  orderIndex: number;
  lessons: GeneratedLessonDraft[];
}

export interface GeneratedCourseStructure {
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedHours: number;
  tags: string[];
  skillsCovered: string[];
  prerequisites: string[];
  modules: GeneratedModuleDraft[];
}

export interface AiGeneratedCourseRecord {
  id: string;
  organizationId: string;
  adminUserId: string;
  topic: string;
  targetAudience: string;
  difficulty: string;
  durationHours: number;
  learningObjectives: string[];
  generatedStructure: GeneratedCourseStructure;
  reviewStatus: "draft" | "reviewed" | "published" | "rejected";
  publishedCourseId?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
}

export interface QuizGenerationInput {
  courseId: string;
  lessonId?: string;
  questionsCount?: number;
  difficulty?: "beginner" | "intermediate" | "advanced";
}

export interface GeneratedQuizQuestion {
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  points: number;
  difficulty: string;
  skillTag?: string;
}

export interface AiGeneratedQuizRecord {
  id: string;
  organizationId: string;
  adminUserId: string;
  courseId: string;
  lessonId?: string | null;
  questionsCount: number;
  difficulty: string;
  generatedQuestions: GeneratedQuizQuestion[];
  reviewStatus: "draft" | "reviewed" | "published" | "rejected";
  publishedAssessmentId?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
}

export interface LessonTutorMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LessonTutorContext {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  lessonType: string;
  lessonContent: string;
  moduleTitle?: string;
  messages: LessonTutorMessage[];
  studentQuery: string;
}

export interface CodingHintRequest {
  challengeId: string;
  challengeTitle: string;
  problemDescription: string;
  language: string;
  studentCode: string;
  errorOutput?: string;
  hintLevel?: 1 | 2 | 3; // 1: Conceptual, 2: Algorithmic, 3: Debugging
  failedTestCasesSummary?: string;
}

export interface CodingHintResponse {
  hintLevel: 1 | 2 | 3;
  hintTitle: string;
  hintContent: string;
  guidingQuestion: string;
  avoidSpoilersNotice: string;
}

export interface AssessmentExplanationRequest {
  assessmentId: string;
  assessmentTitle: string;
  questionText: string;
  studentAnswer: string;
  correctAnswer?: string;
  options: string[];
  isCorrect: boolean;
  courseContextSummary?: string;
}

export interface SkillGapAnalysisResult {
  studentId: string;
  analyzedAt: string;
  overallMasteryPercentage: number;
  proficientSkills: Array<{
    skill: string;
    masteryLevel: "high" | "moderate";
    evidence: string;
  }>;
  identifiedGaps: Array<{
    skill: string;
    severity: "critical" | "moderate" | "minor";
    gapReason: string;
    recommendedActions: string[];
  }>;
  remedialStudyPlan: Array<{
    priority: number;
    resourceType: "lesson" | "challenge" | "assessment";
    title: string;
    targetSkill: string;
    actionDescription: string;
  }>;
  summaryExecutive: string;
}
