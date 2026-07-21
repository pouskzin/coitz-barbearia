import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable is not set.");
}

export { JWT_SECRET };

export function authenticateAdmin(req: VercelRequest, res: VercelResponse): any | null {
  const token = req.cookies?.admin_token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Authorization check: not just authenticated, must be admin
    if (decoded.role !== 'admin') {
      res.status(403).json({ error: "Forbidden" });
      return null;
    }

    return decoded;
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
    } else {
      res.status(401).json({ error: "Invalid token" });
    }
    return null;
  }
}

