/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
}

/**
 * Safely parses a fetch Response without throwing "Unexpected end of JSON input".
 * Gracefully handles valid JSON, empty bodies (204 or empty string), HTML error pages,
 * and extracts human-readable error messages without leaking internal traces or parser errors.
 */
export async function safeFetchJson<T = any>(
  response: Response,
  fallback: T = {} as T
): Promise<ApiResponse<T>> {
  const status = response.status;
  const ok = response.ok;

  // 1. Handle HTTP 204 No Content
  if (status === 204) {
    return { ok, status, data: fallback };
  }

  // 2. Read body as text first to inspect content safely
  let text = "";
  try {
    text = await response.text();
  } catch (err: any) {
    return {
      ok: false,
      status,
      data: fallback,
      error: `Network connection error: ${err.message || "Failed to read response"}`
    };
  }

  // 3. Handle empty response body
  if (!text || !text.trim()) {
    return {
      ok,
      status,
      data: fallback,
      error: ok ? undefined : `Server returned status ${status} with an empty response.`
    };
  }

  // 4. Parse JSON safely
  try {
    const data = JSON.parse(text);
    const errorMsg = !ok
      ? (data.error || data.message || `Request failed with status ${status}`)
      : undefined;

    return {
      ok,
      status,
      data,
      error: errorMsg
    };
  } catch {
    // Non-JSON responses (HTML error page, gateway error, etc.)
    const cleanSnippet = text.replace(/<[^>]*>?/gm, "").trim().slice(0, 140);
    return {
      ok: false,
      status,
      data: fallback,
      error: cleanSnippet ? `Server response (${status}): ${cleanSnippet}` : `Unexpected response format from server (HTTP ${status}).`
    };
  }
}
