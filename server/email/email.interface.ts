/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EmailMessage {
  to: string;
  toName?: string | null;
  subject: string;
  text: string;
  html: string;
  from?: string;
  replyTo?: string;
  metadata?: Record<string, any>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailResult>;
  verifyConnection?(): Promise<boolean>;
}
