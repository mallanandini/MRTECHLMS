/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { codingChallengesDb } from "../../db.js";
import { AiClientService } from "./ai-client.service.js";
import { AiSafetyService } from "./ai-safety.service.js";
import { AiQuotaService } from "./ai-quota.service.js";
import { CodingHintRequest, CodingHintResponse } from "./types.js";

export class AiCodingHintsService {
  private static aiClient = AiClientService.getInstance();

  /**
   * Provide progressive, Socratic hints for a coding challenge.
   * Strictly avoids revealing complete answers or copying full solution code.
   */
  public static async generateHint(params: {
    userId: string;
    organizationId: string;
    request: CodingHintRequest;
  }): Promise<CodingHintResponse> {
    const { userId, organizationId, request } = params;
    const hintLevel = request.hintLevel || 1;

    // 1. Quota & Permission Verification
    const quotaCheck = await AiQuotaService.verifyPermissionAndQuota({
      organizationId,
      userId,
      feature: "coding_hints"
    });
    if (!quotaCheck.allowed) {
      throw new Error(quotaCheck.error);
    }

    // 2. Fetch Coding Challenge Details
    const challenge = await codingChallengesDb.findOne({ id: request.challengeId }) || 
                      await codingChallengesDb.findOne({ slug: request.challengeId });
    if (!challenge) {
      throw new Error("Coding challenge not found.");
    }

    // 3. Sanitize student code & error telemetry
    const cleanStudentCode = AiSafetyService.sanitizePii(request.studentCode || "");
    const cleanError = AiSafetyService.sanitizePii(request.errorOutput || "");
    const cleanDescription = AiSafetyService.sanitizePii(challenge.description || request.problemDescription);

    const contextTag = AiSafetyService.wrapContext(
      "CHALLENGE_METADATA",
      `Challenge: ${challenge.title}\nDifficulty: ${challenge.difficulty}\nLanguage: ${request.language}\nProblem Description:\n${cleanDescription}`
    );

    const studentAttemptTag = AiSafetyService.wrapContext(
      "STUDENT_ATTEMPT",
      `Code:\n${cleanStudentCode}\nError/Test Failure:\n${cleanError || "Test cases failed"}`
    );

    const levelDescriptions = {
      1: "LEVEL 1 (Conceptual): Explain the core requirement, input/output contract, and mental model without discussing specific code lines.",
      2: "LEVEL 2 (Algorithmic Strategy): Suggest the algorithmic pattern, data structure, or math formula needed without writing syntax.",
      3: "LEVEL 3 (Targeted Bug / Edge Case Diagnosis): Identify the logical flaw, off-by-one error, edge case (e.g. empty input, negative numbers, boundary values) in the student's code without providing copy-paste code."
    };

    const promptText = `
You are a master computer science tutor. A student is stuck on a programming challenge.
${contextTag}

${studentAttemptTag}

Current Hint Request Tier: ${levelDescriptions[hintLevel as 1 | 2 | 3]}

CRITICAL SAFETY & PEDAGOGICAL POLICY:
1. NEVER output the full solution code or complete working functions.
2. DO NOT write code that the student can simply copy-paste to pass the challenge.
3. Use Socratic questioning, pseudo-code fragments (maximum 3 lines), or conceptual analogies.
4. Encourage independent problem solving.

Return a JSON object conforming strictly to this schema:
{
  "hintLevel": ${hintLevel},
  "hintTitle": "Concise, encouraging title (e.g., 'Conceptualizing the Boundary Conditions')",
  "hintContent": "Markdown formatted hint body following the level guidelines",
  "guidingQuestion": "A thoughtful Socratic question prompting the student's next step",
  "avoidSpoilersNotice": "MRTECHLMS AI tutor is configured to provide guidance without spoiling answers."
}
    `.trim();

    // Fallback generator for zero-API-key setups
    const fallbackFactory = (): CodingHintResponse => {
      if (hintLevel === 1) {
        return {
          hintLevel: 1,
          hintTitle: "Understanding the Core Contract",
          hintContent: `Break down the problem into smaller milestones. Verify that your solution handles the exact expected return type and format requested in **${challenge.title}**.`,
          guidingQuestion: "What is the simplest edge case input for this problem, and what should the output be?",
          avoidSpoilersNotice: "Complete solution code is withheld to preserve your learning journey."
        };
      } else if (hintLevel === 2) {
        return {
          hintLevel: 2,
          hintTitle: "Algorithmic Approach & Data Structures",
          hintContent: `Consider the time and space complexity required. In ${request.language}, look into whether a hash map, two-pointer pass, or standard array manipulation yields the optimal approach.`,
          guidingQuestion: "Can you iterate through the elements while keeping track of previously seen values?",
          avoidSpoilersNotice: "Complete solution code is withheld to preserve your learning journey."
        };
      } else {
        return {
          hintLevel: 3,
          hintTitle: "Edge Case & Debugging Clue",
          hintContent: `Examine how your loop boundaries handle the final element and empty input scenarios. When ${cleanError ? `errors like "${cleanError.substring(0, 50)}..." occur` : "tests fail"}, check variable initialization and type conversions.`,
          guidingQuestion: "What happens when the input array has length 0 or 1?",
          avoidSpoilersNotice: "Complete solution code is withheld to preserve your learning journey."
        };
      }
    };

    const aiResult = await this.aiClient.generateJson<CodingHintResponse>(
      {
        systemPrompt: "You are an elite coding mentor dedicated to fostering deep algorithmic mastery without giving away answers.",
        userPrompt: promptText,
        temperature: 0.2
      },
      fallbackFactory
    );

    // Audit log
    await AiQuotaService.recordInteraction({
      organizationId,
      userId,
      feature: "coding_hints",
      contextType: "coding_challenge",
      contextId: challenge.id,
      promptTokens: Math.ceil(aiResult.tokens * 0.4),
      completionTokens: Math.ceil(aiResult.tokens * 0.6),
      totalTokens: aiResult.tokens,
      latencyMs: aiResult.latencyMs,
      safetyPassed: true
    });

    return aiResult.data;
  }
}
