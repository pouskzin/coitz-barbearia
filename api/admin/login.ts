import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from "../../src/db/index.js";
import { adminUsers } from "../../src/db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { JWT_SECRET } from "../_utils/auth.js";
import { setCorsHeaders, validateCsrf } from "../_utils/security.js";
import { checkLoginRateLimit } from "../_utils/ratelimit.js";
import { createRefreshToken, buildRefreshCookie } from "../_utils/tokens.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCorsHeaders(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
  if (!validateCsrf(req, res)) return;
  
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Rate limiting: 5 attempts per 15 minutes per IP+email
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
    const rateCheck = await checkLoginRateLimit(clientIp, email);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: "Muitas tentativas de login. Tente novamente em 15 minutos." });
    }

    const users = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    if (users.length === 0) return res.status(401).json({ error: "Invalid credentials" });
    
    const user = users[0];
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    
    // Access token: short-lived (15 minutes)
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Refresh token: long-lived (7 days), stored as hash in DB
    const rawRefreshToken = await createRefreshToken(user.id);
    
    // Set both cookies
    res.setHeader('Set-Cookie', [
      `admin_token=${accessToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=900`,
      buildRefreshCookie(rawRefreshToken),
    ]);
    res.json({ message: "Logged in successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Validation error", issues: error.issues });
    console.error("[LOGIN] Unexpected error");
    res.status(500).json({ error: "Server error" });
  }
}
