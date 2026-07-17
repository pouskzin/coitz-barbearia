import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateAdmin } from "../_utils/auth.js";
import { db } from "../../src/db/index.js";
import { adminUsers } from "../../src/db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
  
  const admin = authenticateAdmin(req, res);
  if (!admin) return;

  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: "Preencha ambas as senhas" });

    const users = await db.select().from(adminUsers).where(eq(adminUsers.id, admin.id));
    if (users.length === 0) return res.status(404).json({ error: "User not found" });

    const user = users[0];
    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Senha atual incorreta" });

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.update(adminUsers).set({ passwordHash: newHash }).where(eq(adminUsers.id, user.id));
    res.json({ message: "Senha atualizada com sucesso!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}
