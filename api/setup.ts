import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from "../src/db/index.js";
import { adminUsers, barbers, services } from "../src/db/schema.js";
import bcrypt from "bcryptjs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  // ---------------------------------------------------------------------------
  // Security: This route is protected by ALLOW_SEED env var.
  // NEVER set this on Vercel Production — only use locally or in dev.
  // After initial setup, this route has no further purpose.
  // ---------------------------------------------------------------------------
  if (process.env.ALLOW_SEED !== 'true') {
    return res.status(403).json({ error: "Forbidden: seed route is disabled in this environment" });
  }

  try {
    const existingAdmins = await db.select().from(adminUsers);
    if (existingAdmins.length > 0) {
      return res.status(400).json({ message: "Already setup" });
    }

    // Passwords should be changed immediately after first login
    const felipeHash = await bcrypt.hash("felipe123", 12);
    const otavioHash = await bcrypt.hash("otavio123", 12);
    await db.insert(adminUsers).values([
      { name: "Felipe Coitinho", email: "felipe@coitz.com", passwordHash: felipeHash, phone: "+554391970920" },
      { name: "Otávio Lavoratto", email: "otavio@coitz.com", passwordHash: otavioHash, phone: "+554391970920" }
    ]);
    await db.insert(barbers).values([
      { name: "Felipe Coitinho", bio: "Dono", photoUrl: "" },
      { name: "Otávio Lavoratto", bio: "Sócio", photoUrl: "" }
    ]);
    await db.insert(services).values([
      { name: "Corte e sobrancelha", description: "Corte com acabamento impecável e design de sobrancelha.", price: 3500, durationMinutes: 60 },
      { name: "Corte e barba", description: "Corte e alinhamento de barba com toalha quente.", price: 4500, durationMinutes: 60 }
    ]);
    res.json({ message: "Setup completed successfully" });
  } catch (error) {
    console.error("[SETUP] Error");
    res.status(500).json({ error: "Server error" });
  }
}
