/**
 * Load .env before any module reads process.env for secrets or DB config.
 * Import this module first from server.ts and JWT/auth helpers.
 */
import dotenv from "dotenv";

dotenv.config();
