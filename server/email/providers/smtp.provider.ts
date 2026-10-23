/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { EmailProvider, EmailMessage, EmailResult } from "../email.interface.js";

export interface SmtpConfig {
  host: string;
  port: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
}

export class SmtpEmailProvider implements EmailProvider {
  readonly name = "smtp";
  private transporter: Transporter | null = null;
  private defaultFrom: string;

  constructor(config?: Partial<SmtpConfig>) {
    const host = config?.host || process.env.SMTP_HOST || "localhost";
    const port = Number(config?.port || process.env.SMTP_PORT || 587);
    const secure = config?.secure !== undefined ? config.secure : process.env.SMTP_SECURE === "true";
    const user = config?.user || process.env.SMTP_USER;
    const pass = config?.pass || process.env.SMTP_PASS;

    this.defaultFrom = config?.from || process.env.EMAIL_FROM || "MRTECHLMS Notifications <notifications@mrtechlms.com>";

    const transportOptions: any = {
      host,
      port,
      secure
    };

    if (user && pass) {
      transportOptions.auth = { user, pass };
    }

    try {
      this.transporter = nodemailer.createTransport(transportOptions);
    } catch (err: any) {
      console.error("[SmtpEmailProvider] Failed to create nodemailer transporter:", err.message);
      this.transporter = null;
    }
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    if (!this.transporter) {
      return {
        success: false,
        error: "SMTP transporter is not configured or failed to initialize."
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: message.from || this.defaultFrom,
        to: message.toName ? `"${message.toName}" <${message.to}>` : message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        replyTo: message.replyTo
      });

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (err: any) {
      console.error(`[SmtpEmailProvider] Error sending email to ${message.to}:`, err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}
