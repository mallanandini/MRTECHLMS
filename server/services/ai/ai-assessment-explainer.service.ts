/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { assessmentsDb, questionsDb, coursesDb } from "../../db.js";
import { AiClientService } from "./ai-client.service.js";
import { AiSafetyService } from "./ai-safety.service.js";
import { AiQuotaService } from "./ai-quota.service.js";

export interface ExplainAssessmentParams {
  userId: string;
  organizationId: string;
  assessmentId: string;
  questionId: string;
  studentAnswer: string;
}

export class AiAssessmentExplainerService {
  private static aiClient = AiClientService.getInstance();

  /**
   * Explain an assessment question answer in pedagogical depth,
   * clarifying why the student's chosen option was incorrect or correct.
   */
  public static async explainAnswer(params: ExplainAssessmentParams) {
    const { userId, organizationId, assessmentId, questionId, studentAnswer } = params;

    // 1. Quota & Permission Verification
    const quotaCheck = await AiQuotaService.verifyPermissionAndQuota({
      organizationId,
      userId,
      feature: "assessment_explanation"
    });
    if (!quotaCheck.allowed) {
      throw new Error(quotaCheck.error);
    }

    // 2. Fetch Assessment and Question
    const assessment = await assessmentsDb.findOne({ id: assessmentId });
    if (!assessment) {
      throw new Error("Assessment not found.");
    }

    const question = await questionsDb.findOne({ id: questionId });
    if (!question || question.assessmentId !== assessmentId) {
      throw new Error("Question not found in this assessment.");
    }

    // 3. Multi-Tenancy Check: Ensure course belongs to organization
    let courseTitle = "Curriculum Topic";
    if (assessment.courseId) {
      const course = await coursesDb.findOne({ id: assessment.courseId });
      if (course) {
        if (course.organizationId && course.organizationId !== organizationId && organizationId !== "org-default") {
          throw new Error("Unauthorized access to assessment from another organization.");
        }
        courseTitle = course.title;
      }
    }

    const cleanQuestion = AiSafetyService.sanitizePii(question.questionText);
    const cleanStudentAnswer = AiSafetyService.sanitizePii(studentAnswer || "No answer provided");
    const correctAnswers = (question.correctAnswers || []) as string[];
    const isCorrect = correctAnswers.some(ans => ans.trim().toLowerCase() === cleanStudentAnswer.trim().toLowerCase());
    const correctAnswerStr = correctAnswers.join(" OR ");

    const contextTag = AiSafetyService.wrapContext(
      "ASSESSMENT_QUESTION_CONTEXT",
      `Course: ${courseTitle}\nAssessment: ${assessment.title}\nQuestion: ${cleanQuestion}\nAvailable Options:\n${(question.options || []).map((o, i) => `${i + 1}. ${o}`).join("\n")}\nCorrect Answer: ${correctAnswerStr}\nInstructor Base Explanation: ${question.explanation || "Standard curriculum rationale"}`
    );

    const promptText = `
You are an empathetic, academically rigorous university professor.
A student just reviewed their assessment performance.
${contextTag}

Student Selected Choice: "${cleanStudentAnswer}"
Is Correct: ${isCorrect ? "YES" : "NO"}

Provide a clear, pedagogical breakdown:
1. Identify why the student's selected choice is ${isCorrect ? "accurate" : "incorrect or misleading"}.
2. Explain the core engineering/domain principle from "${courseTitle}".
3. Provide an intuitive mental model or practical rule of thumb so the student retains this concept permanently.

Keep the tone encouraging and academic. Format in clean markdown with concise bullet points.
    `.trim();

    // Fallback generator for zero-API-key setups
    const fallbackFactory = (): string => {
      if (isCorrect) {
        return `### Conceptual Review: Correct!\n\nYour selection **"${cleanStudentAnswer}"** is accurate.\n\n- **Core Rationale:** In the context of *${courseTitle}*, this option correctly implements the required specifications without introducing side effects.\n- **Key Takeaway:** Always prioritize clarity and modularity when applying this principle in practical implementations.`;
      } else {
        return `### Conceptual Breakdown\n\nYou selected: **"${cleanStudentAnswer}"**\nCorrect Answer: **"${correctAnswerStr}"**\n\n- **Why this was incorrect:** "${cleanStudentAnswer}" fails to satisfy the foundational requirements of *${courseTitle}*, as it introduces antipatterns or invalid assumptions.\n- **Why "${correctAnswerStr}" is correct:** It directly adheres to the established standard explained in the course material (${question.explanation || "adherence to foundational principles"}).\n- **Study Tip:** Review the corresponding lesson module on this topic to solidify your grasp of this principle.`;
      }
    };

    const aiResult = await this.aiClient.generateText(
      {
        systemPrompt: "You are a master educator providing insightful, personalized assessment feedback.",
        userPrompt: promptText,
        temperature: 0.2,
        maxTokens: 450
      },
      fallbackFactory
    );

    const cleanExplanation = AiSafetyService.sanitizeOutput(aiResult.text);

    // Audit log
    await AiQuotaService.recordInteraction({
      organizationId,
      userId,
      feature: "assessment_explanation",
      contextType: "assessment",
      contextId: assessmentId,
      promptTokens: aiResult.promptTokens,
      completionTokens: aiResult.completionTokens,
      totalTokens: aiResult.totalTokens,
      latencyMs: aiResult.latencyMs,
      safetyPassed: true
    });

    return {
      questionId,
      isCorrect,
      studentAnswer: cleanStudentAnswer,
      correctAnswer: correctAnswerStr,
      explanation: cleanExplanation,
      courseTitle,
      tokensUsed: aiResult.totalTokens
    };
  }
}
