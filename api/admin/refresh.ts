import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from "../../src/db/index.js";
import { adminUsers } from "../../src/db/schema.js";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../_utils/auth.js";
import { setCorsHeaders, validateCsrf } from "../_utils/security.js";
import {
  validateRefreshToken,
  revokeRefreshToken,
  createRefreshToken,
  buildRefreshCookie,
  clearRefreshCookie,
} from "../_utils/tokens.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCorsHeaders(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
  if (!validateCsrf(req, res)) return;

  const rawToken = req.cookies?.refresh_token;
  if (!rawToken) {
    return res.status(401).json({ error: "No refresh token" });
  }

  try {
    // Validate the refresh token against the DB
    const valid = await validateRefreshToken(rawToken);
    if (!valid) {
      // Token invalid/expired/revoked — clear cookie, force re-login
      res.setHeader('Set-Cookie', [
        `admin_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
        clearRefreshCookie(),
      ]);
      return res.status(401).json({ error: "Invalid refresh token", code: "REFRESH_INVALID" });
    }

    // Revoke the old refresh token (rotation)
    await revokeRefreshToken(valid.tokenId);

    // Look up the user to build a fresh access token
    const users = await db.select().from(adminUsers).where(eq(adminUsers.id, valid.userId));
    if (users.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = users[0];

    // Issue new access token (15 min)
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Issue new refresh token (rotation — new token replaces old)
    const newRawRefresh = await createRefreshToken(user.id);

    res.setHeader('Set-Cookie', [
      `admin_token=${accessToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=900`,
      buildRefreshCookie(newRawRefresh),
    ]);

    res.json({ message: "Token refreshed" });
  } catch (error) {
    console.error("[REFRESH] Unexpected error");
    res.status(500).json({ error: "Server error" });
  }
}
