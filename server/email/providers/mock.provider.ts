/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailProvider, EmailMessage, EmailResult } from "../email.interface.js";

/**
 * Mock email provider that stores sent messages in memory for test assertions
 * and dev inspection without opening network connections.
 */
export class MockEmailProvider implements EmailProvider {
  readonly name = "mock";
  private sentMessages: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<EmailResult> {
    const id = `mock-email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.sentMessages.push({ ...message });

    // Keep memory bounded to last 200 emails
    if (this.sentMessages.length > 200) {
      this.sentMessages.shift();
    }

    // Optional verbose logging in dev if DEBUG_EMAIL is set
    if (process.env.DEBUG_EMAIL === "true") {
      console.log(`[MockEmailProvider] Stored email to ${message.to}: "${message.subject}"`);
    }

    return {
      success: true,
      messageId: id
    };
  }

  async verifyConnection(): Promise<boolean> {
    return true;
  }

  getSentMessages(): EmailMessage[] {
    return [...this.sentMessages];
  }

  getLastSentMessage(): EmailMessage | undefined {
    return this.sentMessages[this.sentMessages.length - 1];
  }

  clear(): void {
    this.sentMessages = [];
  }
}
