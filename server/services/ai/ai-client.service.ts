/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

export interface AiGenerationOptions {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  responseMimeType?: string;
}

export interface AiGenerationResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  isFallback: boolean;
}

export class AiClientService {
  private static instance: AiClientService;
  private client: GoogleGenAI | null = null;
  private isKeyAvailable = false;

  private constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 0 && apiKey !== "your_gemini_api_key_here") {
      try {
        this.client = new GoogleGenAI({ apiKey });
        this.isKeyAvailable = true;
      } catch (err) {
        console.warn("[AiClientService] Failed to initialize GoogleGenAI client:", err);
        this.client = null;
        this.isKeyAvailable = false;
      }
    }
  }

  public static getInstance(): AiClientService {
    if (!AiClientService.instance) {
      AiClientService.instance = new AiClientService();
    }
    return AiClientService.instance;
  }

  /**
   * Approximate token count based on standard ~4 chars per token rule
   */
  public estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.max(1, Math.ceil(text.length / 4));
  }

  /**
   * Main text generation method with automatic latency measurement, token accounting, and fallback
   */
  public async generateText(
    options: AiGenerationOptions,
    fallbackFactory?: () => string
  ): Promise<AiGenerationResult> {
    const startTime = Date.now();
    const promptTokens = this.estimateTokens((options.systemPrompt || "") + options.userPrompt);

    // If Gemini key is available and client exists, try live model call
    if (this.isKeyAvailable && this.client) {
      try {
        const fullPrompt = options.systemPrompt 
          ? `${options.systemPrompt}\n\nUser Request:\n${options.userPrompt}`
          : options.userPrompt;

        const response = await this.client.models.generateContent({
          model: "gemini-2.5-flash",
          contents: fullPrompt,
          config: {
            temperature: options.temperature ?? 0.3,
            maxOutputTokens: options.maxTokens ?? 1500
          }
        });

        const completionText = response.text || "";
        const completionTokens = this.estimateTokens(completionText);
        const latencyMs = Date.now() - startTime;

        return {
          text: completionText,
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          latencyMs,
          isFallback: false
        };
      } catch (error: any) {
        console.warn("[AiClientService] Live Gemini API call failed, engaging fallback engine:", error.message || error);
      }
    }

    // Engaging high-fidelity fallback generator
    const fallbackText = fallbackFactory 
      ? fallbackFactory() 
      : this.getDefaultFallbackResponse(options.userPrompt);

    const completionTokens = this.estimateTokens(fallbackText);
    const latencyMs = Date.now() - startTime;

    return {
      text: fallbackText,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      latencyMs,
      isFallback: true
    };
  }

  /**
   * Generate structured JSON with error parsing and fallback handling
   */
  public async generateJson<T>(
    options: AiGenerationOptions,
    fallbackFactory: () => T
  ): Promise<{ data: T; tokens: number; latencyMs: number; isFallback: boolean }> {
    const systemPromptWithJsonInstruction = `
${options.systemPrompt || ""}
CRITICAL: Respond ONLY with valid, raw JSON conforming to the requested schema. Do NOT include markdown code blocks, backticks, or explanatory text.
    `.trim();

    const result = await this.generateText(
      {
        ...options,
        systemPrompt: systemPromptWithJsonInstruction
      },
      () => JSON.stringify(fallbackFactory())
    );

    try {
      // Strip potential markdown wrapping if returned by model
      const cleaned = result.text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const parsed: T = JSON.parse(cleaned);
      return {
        data: parsed,
        tokens: result.totalTokens,
        latencyMs: result.latencyMs,
        isFallback: result.isFallback
      };
    } catch {
      return {
        data: fallbackFactory(),
        tokens: result.totalTokens,
        latencyMs: result.latencyMs,
        isFallback: true
      };
    }
  }

  private getDefaultFallbackResponse(query: string): string {
    return `### Academic AI Guidance\n\nRegarding your inquiry:\n> "${query.substring(0, 120)}..."\n\nKey takeaways from the authoritative curriculum:\n- Ensure you understand core foundational concepts before building complex abstractions.\n- Review the lesson code examples and verify your understanding of each component.\n- Try applying this concept in a small playground experiment.`;
  }
}
