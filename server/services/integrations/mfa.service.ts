/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pool } from "../../mysql.js";
import crypto from "crypto";
import { logAuditEvent } from "../../audit.js";

export interface UserMfaSettings {
  userId: string;
  organizationId: string;
  isEnabled: boolean;
  enrolledAt: string | null;
  lastVerifiedAt: string | null;
  recoveryCodesRemaining: number;
}

export class MfaService {
  private static readonly TIME_STEP_SECONDS = 30;
  private static readonly DIGITS = 6;

  // Base32 alphabet for TOTP secrets
  private static readonly BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

  /**
   * Generate a cryptographically secure Base32 secret for TOTP (160 bits / 20 bytes)
   */
  public static generateSecret(length: number = 32): string {
    const randomBytes = crypto.randomBytes(length);
    let secret = "";
    for (let i = 0; i < length; i++) {
      secret += this.BASE32_CHARS[randomBytes[i] % this.BASE32_CHARS.length];
    }
    return secret;
  }

  /**
   * Decode Base32 string to Buffer
   */
  private static base32ToBuffer(base32: string): Buffer {
    let cleanBase32 = base32.toUpperCase().replace(/=+$/, "");
    let bits = "";
    for (let i = 0; i < cleanBase32.length; i++) {
      const val = this.BASE32_CHARS.indexOf(cleanBase32.charAt(i));
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, "0");
    }
    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }
    return Buffer.from(bytes);
  }

  /**
   * Calculate RFC 6238 TOTP code for a given timestamp
   */
  public static generateTotpCode(secret: string, timestampSeconds: number = Math.floor(Date.now() / 1000)): string {
    const key = this.base32ToBuffer(secret);
    const counter = Math.floor(timestampSeconds / this.TIME_STEP_SECONDS);

    // 8-byte big-endian counter
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter), 0);

    const hmac = crypto.createHmac("sha1", key);
    hmac.update(counterBuffer);
    const hash = hmac.digest();

    // Dynamic truncation (RFC 4226)
    const offset = hash[hash.length - 1] & 0x0f;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const otp = binary % Math.pow(10, this.DIGITS);
    return otp.toString().padStart(this.DIGITS, "0");
  }

  /**
   * Verify TOTP code with clock-skew tolerance (+/- 1 time step = 30 seconds)
   */
  public static verifyTotpCode(secret: string, code: string): boolean {
    if (!code || code.trim().length !== this.DIGITS) return false;
    const cleanCode = code.trim();
    const currentSeconds = Math.floor(Date.now() / 1000);

    // Check t - 1, t, t + 1
    for (let delta = -1; delta <= 1; delta++) {
      const candidateTime = currentSeconds + delta * this.TIME_STEP_SECONDS;
      const expectedCode = this.generateTotpCode(secret, candidateTime);
      if (crypto.timingSafeEqual(Buffer.from(cleanCode), Buffer.from(expectedCode))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generate 8 cryptographically secure recovery codes
   */
  public static generateRecoveryCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const part1 = crypto.randomBytes(2).toString("hex").toUpperCase();
      const part2 = crypto.randomBytes(2).toString("hex").toUpperCase();
      codes.push(`${part1}-${part2}`);
    }
    return codes;
  }

  /**
   * Hash a recovery code with SHA-256 for secure database storage
   */
  private static hashRecoveryCode(code: string): string {
    const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    return crypto.createHash("sha256").update(clean).digest("hex");
  }

  /**
   * Retrieve student/user MFA settings
   */
  public static async getMfaSettings(userId: string, organizationId: string): Promise<UserMfaSettings> {
    const [rows]: any = await pool.query(
      `SELECT * FROM user_mfa_settings WHERE userId = ?`,
      [userId]
    );

    if (rows && rows.length > 0) {
      const r = rows[0];
      const hashes = typeof r.recoveryCodesHash === "string" ? JSON.parse(r.recoveryCodesHash) : (r.recoveryCodesHash || []);
      return {
        userId: r.userId,
        organizationId: r.organizationId,
        isEnabled: Boolean(r.isEnabled),
        enrolledAt: r.enrolledAt,
        lastVerifiedAt: r.lastVerifiedAt,
        recoveryCodesRemaining: Array.isArray(hashes) ? hashes.length : 0
      };
    }

    return {
      userId,
      organizationId,
      isEnabled: false,
      enrolledAt: null,
      lastVerifiedAt: null,
      recoveryCodesRemaining: 0
    };
  }

  /**
   * Step 1: Initiate MFA Enrollment (generates secret, QR URI, and plaintext recovery codes)
   */
  public static async startEnrollment(userId: string, organizationId: string, userEmail: string) {
    const secret = this.generateSecret();
    const recoveryCodes = this.generateRecoveryCodes(8);
    const issuer = encodeURIComponent("MRTECHLMS");
    const account = encodeURIComponent(userEmail);
    const otpAuthUri = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    // Store in temporary/pending state
    const now = new Date().toISOString();
    await pool.query(
      `INSERT INTO user_mfa_settings 
       (userId, organizationId, isEnabled, totpSecret, recoveryCodesHash, enrolledAt, lastVerifiedAt, updatedAt)
       VALUES (?, ?, 0, ?, ?, NULL, NULL, ?)
       ON DUPLICATE KEY UPDATE totpSecret = VALUES(totpSecret), updatedAt = VALUES(updatedAt)`,
      [userId, organizationId, secret, JSON.stringify([]), now]
    );

    return {
      secret,
      otpAuthUri,
      recoveryCodes,
      instructions: "Scan the QR code with your authenticator app (e.g. Google Authenticator, Microsoft Authenticator) or enter the secret key manually."
    };
  }

  /**
   * Step 2: Confirm and finalize MFA Enrollment with verification code
   */
  public static async confirmEnrollment(
    userId: string,
    organizationId: string,
    totpCode: string,
    recoveryCodes: string[]
  ): Promise<{ success: boolean; error?: string }> {
    const [rows]: any = await pool.query(
      `SELECT totpSecret FROM user_mfa_settings WHERE userId = ?`,
      [userId]
    );

    if (!rows || rows.length === 0 || !rows[0].totpSecret) {
      return { success: false, error: "MFA enrollment not initiated. Please start enrollment first." };
    }

    const secret = rows[0].totpSecret;
    const isValid = this.verifyTotpCode(secret, totpCode);
    if (!isValid) {
      return { success: false, error: "Invalid 6-digit code. Please check your authenticator clock and try again." };
    }

    // Hash recovery codes and save
    const hashedCodes = recoveryCodes.map(c => this.hashRecoveryCode(c));
    const now = new Date().toISOString();

    await pool.query(
      `UPDATE user_mfa_settings 
       SET isEnabled = 1, recoveryCodesHash = ?, enrolledAt = ?, lastVerifiedAt = ?, updatedAt = ?
       WHERE userId = ?`,
      [JSON.stringify(hashedCodes), now, now, now, userId]
    );

    await logAuditEvent({
      organizationId,
      userId,
      userEmail: "user",
      userRole: "student",
      action: "mfa_enrolled",
      resourceType: "mfa_settings",
      resourceId: userId,
      details: { method: "totp" }
    });

    return { success: true };
  }

  /**
   * Step 3: Verify TOTP Code OR Single-Use Recovery Code during login challenge
   */
  public static async verifyTotpOrRecovery(
    userId: string,
    organizationId: string,
    code: string
  ): Promise<{ verified: boolean; usedRecoveryCode: boolean; remainingRecoveryCodes?: number; error?: string }> {
    const [rows]: any = await pool.query(
      `SELECT * FROM user_mfa_settings WHERE userId = ? AND isEnabled = 1`,
      [userId]
    );

    if (!rows || rows.length === 0) {
      return { verified: false, usedRecoveryCode: false, error: "MFA is not enabled for this user." };
    }

    const r = rows[0];
    const secret = r.totpSecret;
    const now = new Date().toISOString();

    // 1. Check if 6-digit TOTP matches
    if (secret && code.trim().length === 6 && this.verifyTotpCode(secret, code.trim())) {
      await pool.query(
        `UPDATE user_mfa_settings SET lastVerifiedAt = ?, updatedAt = ? WHERE userId = ?`,
        [now, now, userId]
      );
      return { verified: true, usedRecoveryCode: false };
    }

    // 2. Check if single-use recovery code matches
    let recoveryHashes: string[] = [];
    try {
      recoveryHashes = typeof r.recoveryCodesHash === "string" ? JSON.parse(r.recoveryCodesHash) : (r.recoveryCodesHash || []);
    } catch (e) {
      recoveryHashes = [];
    }

    const inputHash = this.hashRecoveryCode(code);
    const matchedIdx = recoveryHashes.indexOf(inputHash);

    if (matchedIdx !== -1) {
      // Consume the recovery code (single use)
      recoveryHashes.splice(matchedIdx, 1);
      await pool.query(
        `UPDATE user_mfa_settings 
         SET recoveryCodesHash = ?, lastVerifiedAt = ?, updatedAt = ? 
         WHERE userId = ?`,
        [JSON.stringify(recoveryHashes), now, now, userId]
      );

      await logAuditEvent({
        organizationId,
        userId,
        userEmail: "user",
        userRole: "student",
        action: "mfa_recovery_code_used",
        resourceType: "mfa_settings",
        resourceId: userId,
        details: { remaining: recoveryHashes.length }
      });

      return {
        verified: true,
        usedRecoveryCode: true,
        remainingRecoveryCodes: recoveryHashes.length
      };
    }

    return {
      verified: false,
      usedRecoveryCode: false,
      error: "Invalid authentication code or expired recovery code."
    };
  }

  /**
   * Disable MFA (requires valid TOTP code verification)
   */
  public static async disableMfa(
    userId: string,
    organizationId: string,
    totpCode: string
  ): Promise<{ success: boolean; error?: string }> {
    const [rows]: any = await pool.query(
      `SELECT totpSecret FROM user_mfa_settings WHERE userId = ? AND isEnabled = 1`,
      [userId]
    );

    if (!rows || rows.length === 0) {
      return { success: false, error: "MFA is not currently active." };
    }

    if (!this.verifyTotpCode(rows[0].totpSecret, totpCode)) {
      return { success: false, error: "Invalid verification code. Cannot disable MFA." };
    }

    const now = new Date().toISOString();
    await pool.query(
      `UPDATE user_mfa_settings 
       SET isEnabled = 0, totpSecret = NULL, recoveryCodesHash = JSON_ARRAY(), updatedAt = ?
       WHERE userId = ?`,
      [now, userId]
    );

    await logAuditEvent({
      organizationId,
      userId,
      userEmail: "user",
      userRole: "student",
      action: "mfa_disabled",
      resourceType: "mfa_settings",
      resourceId: userId,
      details: {}
    });

    return { success: true };
  }
}
