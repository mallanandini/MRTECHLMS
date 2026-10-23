/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";

export interface RateLimiterOptions {
  windowMs: number;
  maxAttempts: number;
  message?: string;
  keyGenerator?: (req: express.Request) => string;
  skipSuccessfulRequests?: boolean;
}

interface RateLimitRecord {
  attempts: number;
  resetAt: number;
}

export function getClientIp(req: express.Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "127.0.0.1";
}

/**
 * Creates an Express middleware for rate limiting specific API endpoints.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const {
    windowMs,
    maxAttempts,
    message = "Too many requests. Please try again later.",
    keyGenerator = getClientIp
  } = options;

  const records = new Map<string, RateLimitRecord>();

  // Prune expired entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of records.entries()) {
      if (now > record.resetAt) {
        records.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  const middleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const record = records.get(key);

    if (record) {
      if (now > record.resetAt) {
        records.delete(key);
      } else if (record.attempts >= maxAttempts) {
        const remainingSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
        res.setHeader("Retry-After", String(remainingSeconds));
        return res.status(429).json({
          error: message,
          retryAfter: remainingSeconds
        });
      }
    }

    next();
  };

  const recordHit = (req: express.Request) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const record = records.get(key);

    if (!record || now > record.resetAt) {
      records.set(key, {
        attempts: 1,
        resetAt: now + windowMs
      });
    } else {
      record.attempts += 1;
    }
  };

  const reset = (req: express.Request) => {
    const key = keyGenerator(req);
    records.delete(key);
  };

  return {
    middleware,
    recordHit,
    reset
  };
}

// Enterprise Pre-Configured Rate Limiter Singletons
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 10,
  message: "Too many authentication attempts. Please wait 15 minutes before retrying."
});

export const codeExecutionRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxAttempts: 30,
  message: "Code execution rate limit exceeded. Please wait 5 minutes before running more code."
});

export const uploadRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 30,
  message: "Upload rate limit exceeded. Please wait 15 minutes before uploading more files."
});

export const aiRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxAttempts: 20,
  message: "AI explanation rate limit exceeded. Please wait 10 minutes before requesting more explanations."
});

