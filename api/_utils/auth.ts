import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-default-key-change-in-prod";

export function authenticateAdmin(req: VercelRequest, res: VercelResponse): any | null {
  // Check cookies or Authorization header
  const token = req.cookies.admin_token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
    return null;
  }
}
