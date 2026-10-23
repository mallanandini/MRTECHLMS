/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class AiSafetyService {
  public static readonly MAX_INPUT_CHARS = 1200;
  public static readonly MAX_OUTPUT_CHARS = 4000;

  // Regex patterns for detecting and scrubbing Personally Identifiable Information (PII)
  private static readonly EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  private static readonly PHONE_REGEX = /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g;
  private static readonly IP_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  private static readonly SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
  private static readonly BEARER_REGEX = /Bearer\s+[A-Za-z0-9-_=.]+/gi;

  // Prompt injection & jailbreak detection patterns
  private static readonly JAILBREAK_PATTERNS = [
    /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions/i,
    /disregard\s+(?:all\s+)?(?:previous|prior|above)\s+rules/i,
    /system\s+prompt(?:\s+leak|\s+reveal|\s+dump)/i,
    /reveal\s+(?:your|the)\s+(?:system\s+prompt|initial\s+prompt|developer\s+instructions)/i,
    /you\s+are\s+now\s+in\s+developer\s+mode/i,
    /\bDAN\s+mode\b/i,
    /bypass\s+(?:all\s+)?safety\s+guidelines/i,
    /act\s+as\s+an\s+unfiltered\s+AI/i,
    /print\s+everything\s+above/i
  ];

  /**
   * Scrub personally identifiable information (PII) from prompt contents before transmission
   */
  public static sanitizePii(text: string): string {
    if (!text) return "";
    return text
      .replace(this.EMAIL_REGEX, "[REDACTED_EMAIL]")
      .replace(this.PHONE_REGEX, "[REDACTED_PHONE]")
      .replace(this.IP_REGEX, "[REDACTED_IP]")
      .replace(this.SSN_REGEX, "[REDACTED_ID]")
      .replace(this.BEARER_REGEX, "Bearer [REDACTED_TOKEN]");
  }

  /**
   * Validate that input respects maximum character boundaries
   */
  public static validateInput(text: string, maxChars = this.MAX_INPUT_CHARS): { valid: boolean; error?: string } {
    if (!text || text.trim().length === 0) {
      return { valid: false, error: "Input prompt cannot be empty." };
    }
    if (text.length > maxChars) {
      return {
        valid: false,
        error: `Input query exceeds maximum allowed length of ${maxChars} characters (${text.length} characters received).`
      };
    }
    return { valid: true };
  }

  /**
   * Detect potential prompt injection or jailbreak attempts
   */
  public static inspectPromptSafety(text: string): { safe: boolean; reason?: string } {
    for (const pattern of this.JAILBREAK_PATTERNS) {
      if (pattern.test(text)) {
        return {
          safe: false,
          reason: "Prompt rejected: detected potential prompt injection or security boundary violation."
        };
      }
    }
    return { safe: true };
  }

  /**
   * Wrap authoritative learning context in robust cryptographic boundary tags
   * to prevent student prompts from altering system instructions
   */
  public static wrapContext(tag: string, content: string): string {
    const cleanContent = this.sanitizePii(content.trim());
    return `<<<SECURE_CONTEXT_BOUNDARY: ${tag}>>>\n${cleanContent}\n<<<END_SECURE_CONTEXT: ${tag}>>>`;
  }

  /**
   * Enforce maximum output limit and strip internal delimiters
   */
  public static sanitizeOutput(output: string, maxChars = this.MAX_OUTPUT_CHARS): string {
    if (!output) return "";
    let sanitized = output
      .replace(/<<<SECURE_CONTEXT_BOUNDARY:.*?>>>/g, "")
      .replace(/<<<END_SECURE_CONTEXT:.*?>>>/g, "")
      .trim();

    if (sanitized.length > maxChars) {
      sanitized = sanitized.substring(0, maxChars) + "\n\n... [Response capped to safe limit]";
    }
    return sanitized;
  }
}
