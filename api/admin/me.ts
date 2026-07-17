import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateAdmin } from "../_utils/auth.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: "Method not allowed" });
  const admin = authenticateAdmin(req, res);
  if (!admin) return; // Response is already sent inside authenticateAdmin
  res.json({ user: admin });
}
