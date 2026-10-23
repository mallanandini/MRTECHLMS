/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { userPreferencesDb } from "../db.js";

export const userRouter = express.Router();

const ALLOWED_THEMES = ["default-blue", "purple-royal", "emerald-green", "sunset-orange", "cyber-dark", "high-contrast"];
const ALLOWED_MODES = ["light", "dark"];
const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

// GET /api/user/preferences
userRouter.get("/preferences", authenticateToken, async (req, res) => {
  const userId = req.user!.id;
  const pref = await userPreferencesDb.findOne({ userId });
  
  if (!pref) {
    return res.json({
      id: "default",
      userId,
      theme: "default-blue",
      primaryColor: "#2563eb",
      secondaryColor: "#4f46e5",
      backgroundColor: "#f8fafc",
      surfaceColor: "#ffffff",
      textColor: "#0f172a",
      mode: "light",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  res.json(pref);
});

// PUT /api/user/preferences
userRouter.put("/preferences", authenticateToken, async (req, res) => {
  const userId = req.user!.id;
  const { theme, mode, primaryColor, secondaryColor, backgroundColor, surfaceColor, textColor } = req.body;

  if (theme !== undefined && !ALLOWED_THEMES.includes(theme)) {
    return res.status(400).json({ error: "Invalid theme value" });
  }

  if (mode !== undefined && !ALLOWED_MODES.includes(mode)) {
    return res.status(400).json({ error: "Invalid mode value. Must be 'light' or 'dark'" });
  }

  const colorProps: { [key: string]: string | undefined } = {
    primaryColor,
    secondaryColor,
    backgroundColor,
    surfaceColor,
    textColor
  };

  for (const [key, val] of Object.entries(colorProps)) {
    if (val !== undefined && !HEX_COLOR_REGEX.test(val)) {
      return res.status(400).json({ error: `Invalid hex color value for ${key}` });
    }
  }

  const existing = await userPreferencesDb.findOne({ userId });
  const now = new Date().toISOString();

  if (existing) {
    const updates: any = { updatedAt: now };
    if (theme !== undefined) updates.theme = theme;
    if (mode !== undefined) updates.mode = mode;
    if (primaryColor !== undefined) updates.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updates.secondaryColor = secondaryColor;
    if (backgroundColor !== undefined) updates.backgroundColor = backgroundColor;
    if (surfaceColor !== undefined) updates.surfaceColor = surfaceColor;
    if (textColor !== undefined) updates.textColor = textColor;

    const updated = await userPreferencesDb.update(existing.id, updates);
    return res.json(updated);
  } else {
    const created = await userPreferencesDb.insert({
      userId,
      theme: theme || "default-blue",
      primaryColor: primaryColor || "#2563eb",
      secondaryColor: secondaryColor || "#4f46e5",
      backgroundColor: backgroundColor || "#f8fafc",
      surfaceColor: surfaceColor || "#ffffff",
      textColor: textColor || "#0f172a",
      mode: mode || "light",
      createdAt: now,
      updatedAt: now
    });
    return res.json(created);
  }
});
