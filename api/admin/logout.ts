import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from "../_utils/security.js";
import {
  validateRefreshToken,
  revokeAllUserTokens,
  clearRefreshCookie,
} from "../_utils/tokens.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCorsHeaders(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  // Best-effort: revoke all refresh tokens for the user in DB
  try {
    const rawToken = req.cookies?.refresh_token;
    if (rawToken) {
      const valid = await validateRefreshToken(rawToken);
      if (valid) {
        await revokeAllUserTokens(valid.userId);
      }
    }
  } catch {
    // Revocation failure must not prevent cookie clearing
  }

  // Clear both cookies regardless of DB result
  res.setHeader('Set-Cookie', [
    `admin_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    clearRefreshCookie(),
  ]);
  res.json({ message: "Logged out" });
}
