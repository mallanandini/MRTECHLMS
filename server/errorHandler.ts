/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";

export interface StandardApiError {
  error: string;
  code?: string;
  details?: any;
}

/**
 * Sends a sanitized API client error (4xx).
 */
export function sendApiError(
  res: express.Response,
  statusCode: number,
  message: string,
  code?: string,
  details?: any
) {
  const payload: StandardApiError = { error: message };
  if (code) payload.code = code;
  if (details) payload.details = details;
  return res.status(statusCode).json(payload);
}

/**
 * Handles internal server exceptions (500).
 * Logs the raw error on the server, but masks details from the HTTP response
 * to prevent leaking database names, filesystem paths, credentials, or stack traces.
 */
export function sendInternalError(
  res: express.Response,
  publicMessage: string,
  internalErr?: any
) {
  console.error(`[Internal Exception] ${publicMessage}:`, internalErr?.stack || internalErr?.message || internalErr);
  return res.status(500).json({
    error: publicMessage,
    code: "INTERNAL_SERVER_ERROR"
  });
}
