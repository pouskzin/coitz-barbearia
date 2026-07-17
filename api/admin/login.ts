import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from "../../src/db/index.js";
import { adminUsers } from "../../src/db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-default-key-change-in-prod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
  
  try {
    const { email, password } = loginSchema.parse(req.body);
    const users = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    if (users.length === 0) return res.status(401).json({ error: "Invalid credentials" });
    
    const user = users[0];
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '1d' });
    
    res.setHeader('Set-Cookie', `admin_token=${token}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=86400`);
    res.json({ message: "Logged in successfully" });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Validation error", issues: error.issues });
    res.status(500).json({ error: "Server error" });
  }
}
