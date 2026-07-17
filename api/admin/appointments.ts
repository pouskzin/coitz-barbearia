import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateAdmin } from "../_utils/auth.js";
import { db } from "../../src/db/index.js";
import { appointments } from "../../src/db/schema.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: "Method not allowed" });
  
  const admin = authenticateAdmin(req, res);
  if (!admin) return;

  try {
    const allAppointments = await db.select().from(appointments).orderBy(appointments.startTime);
    res.json(allAppointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}
