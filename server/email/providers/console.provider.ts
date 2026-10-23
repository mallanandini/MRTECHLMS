/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailProvider, EmailMessage, EmailResult } from "../email.interface.js";

export class ConsoleEmailProvider implements EmailProvider {
  readonly name = "console";

  async send(message: EmailMessage): Promise<EmailResult> {
    console.log("==================== [OUTGOING EMAIL] ====================");
    console.log(`From:    ${message.from || "system"}`);
    console.log(`To:      ${message.toName ? `"${message.toName}" <${message.to}>` : message.to}`);
    console.log(`Subject: ${message.subject}`);
    console.log("-------------------- [BODY (TEXT)] --------------------");
    console.log(message.text);
    console.log("==========================================================");

    return {
      success: true,
      messageId: `console-${Date.now()}`
    };
  }

  async verifyConnection(): Promise<boolean> {
    return true;
  }
}
