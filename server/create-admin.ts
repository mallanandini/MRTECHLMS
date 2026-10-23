/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";
import readline from "readline";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { pool } from "./mysql.js";
import { usersDb } from "./db.js";
import { UserRole } from "../src/types.js";

dotenv.config();

export function validateStrongPassword(password: string): { valid: boolean; reason?: string } {
  if (!password || password.length < 8) {
    return { valid: false, reason: "Password must be at least 8 characters long." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one uppercase letter (A-Z)." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one lowercase letter (a-z)." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one digit (0-9)." };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one special character (!@#$%^&*...)." };
  }
  return { valid: true };
}

function prompt(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function parseCliArgs() {
  const args = process.argv.slice(2);
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--email" && args[i + 1]) {
      result.email = args[++i];
    } else if (args[i] === "--password" && args[i + 1]) {
      result.password = args[++i];
    } else if (args[i] === "--name" && args[i + 1]) {
      result.name = args[++i];
    }
  }
  return result;
}

export async function createAdminUser(nameInput: string, emailInput: string, passwordInput: string) {
  const name = nameInput.trim();
  const email = emailInput.trim().toLowerCase();
  const password = passwordInput.trim();

  if (!name) {
    throw new Error("Administrator name is required.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    throw new Error("A valid email address is required.");
  }

  const validation = validateStrongPassword(password);
  if (!validation.valid) {
    throw new Error(`Password complexity requirement not met: ${validation.reason}`);
  }

  const existing = await usersDb.findOne({ email });
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();

  if (existing) {
    await usersDb.update(existing.id, {
      name,
      role: UserRole.ADMIN,
      passwordHash,
      status: "active"
    });
    return { id: existing.id, email, name, updated: true };
  } else {
    const id = "usr-adm-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex");
    await usersDb.insert({
      id,
      name,
      email,
      role: UserRole.ADMIN,
      passwordHash,
      status: "active",
      createdAt: now
    });
    return { id, email, name, updated: false };
  }
}

async function runCli() {
  console.log("=================================================");
  console.log("    MRTECHLMS - ADMINISTRATOR ACCOUNT PROVISIONING");
  console.log("=================================================\n");

  try {
    const cliArgs = parseCliArgs();
    let name = cliArgs.name;
    let email = cliArgs.email;
    let password = cliArgs.password;

    if (!name) {
      name = await prompt("Enter Administrator Full Name: ");
    }
    if (!email) {
      email = await prompt("Enter Administrator Email: ");
    }
    if (!password) {
      password = await prompt("Enter Strong Password (min 8 chars, A-Z, a-z, 0-9, symbol): ");
    }

    const result = await createAdminUser(name, email, password);
    if (result.updated) {
      console.log(`\n[SUCCESS] Existing user (${result.email}) promoted to Administrator with updated strong password.`);
    } else {
      console.log(`\n[SUCCESS] Administrator account successfully created for ${result.email} (ID: ${result.id}).`);
    }
    console.log("You can now log in to the Admin Portal using these credentials.\n");
    await pool.end();
    process.exit(0);
  } catch (err: any) {
    console.error(`\n[ERROR] ${err.message}\n`);
    await pool.end();
    process.exit(1);
  }
}

// Only run CLI if invoked directly
if (process.argv[1] && process.argv[1].endsWith("create-admin.ts")) {
  runCli();
}
