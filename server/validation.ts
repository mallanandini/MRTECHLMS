/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { z } from "zod";
import { UserRole } from "../src/types.js";
import { validateStrongPassword } from "./create-admin.js";

// Common password refinement validator
const strongPasswordSchema = z.string().min(8, "Password must be at least 8 characters long").refine(
  val => validateStrongPassword(val).valid,
  { message: "Password must be at least 8 characters with upper, lower, number, and special character" }
);

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
  portal: z.enum(["student", "admin"]).optional()
});

export const createUserSchema = z.object({
  name: z.string().min(1, "Full name is required").max(100),
  email: z.string().email("Invalid email format"),
  password: strongPasswordSchema,
  role: z.nativeEnum(UserRole).optional().default(UserRole.STUDENT),
  status: z.enum(["active", "suspended"]).optional().default("active")
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  profilePhoto: z.string().max(500).optional(),
  password: strongPasswordSchema.optional()
});

export const submitAssessmentSchema = z.object({
  answers: z.record(z.string(), z.array(z.string())).optional().default({}),
  timeTakenSeconds: z.number().nonnegative().max(86400).optional().default(0)
});

export const executeCodeSchema = z.object({
  language: z.string().min(1, "Language is required"),
  code: z.string().optional().default(""),
  stdin: z.union([z.string(), z.number()]).optional().default("")
});

export const aiExplainSchema = z.object({
  code: z.string().optional().default(""),
  language: z.string().optional().default("text"),
  error: z.string().optional().default(""),
  topic: z.string().optional().default("General Programming")
});

/**
 * Express middleware helper to validate request body against a Zod schema.
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errorMessages = result.error.issues.map(err => `${err.path.join(".")}: ${err.message}`);
      return res.status(400).json({
        error: "Validation failed",
        details: errorMessages
      });
    }
    req.body = result.data;
    next();
  };
}
