/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Response } from "express";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Standard Success Response Helper
 */
export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200, meta?: Record<string, any>) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {})
  });
}

/**
 * Standard Paginated Response Helper
 */
export function sendPaginated<T>(
  res: Response,
  items: T[],
  total: number,
  page: number = 1,
  limit: number = 20,
  extraMeta?: Record<string, any>
) {
  const totalPages = Math.ceil(total / limit) || 1;
  const pagination: PaginationMeta = {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };

  return res.status(200).json({
    success: true,
    data: items,
    pagination,
    ...(extraMeta ? { meta: extraMeta } : {})
  });
}

/**
 * Standard Error Response Helper
 */
export function sendError(
  res: Response,
  message: string,
  statusCode: number = 400,
  code?: string,
  details?: any
) {
  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(code ? { code } : {}),
    ...(details !== undefined ? { details } : {})
  });
}
