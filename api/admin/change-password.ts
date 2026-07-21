import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateAdmin } from "../_utils/auth.js";
import { db } from "../../src/db/index.js";
import { adminUsers } from "../../src/db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { setCorsHeaders, validateCsrf, safeError } from "../_utils/security.js";

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres").max(128),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCorsHeaders(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
  if (!validateCsrf(req, res)) return;
  
  const admin = authenticateAdmin(req, res);
  if (!admin) return;

  try {
    const { oldPassword, newPassword } = changePasswordSchema.parse(req.body);

    const users = await db.select().from(adminUsers).where(eq(adminUsers.id, admin.id));
    if (users.length === 0) return res.status(404).json({ error: "User not found" });

    const user = users[0];
    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Senha atual incorreta" });

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.update(adminUsers).set({ passwordHash: newHash }).where(eq(adminUsers.id, user.id));
    res.json({ message: "Senha atualizada com sucesso!" });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || "Validation error" });
    safeError(res, error, "CHANGE_PASSWORD");
  }
}
