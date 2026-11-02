import "./env.js";

const DEV_FALLBACK = "mrtechlms-dev-jwt-fallback-key-32chars-min!!";

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || DEV_FALLBACK;
}
