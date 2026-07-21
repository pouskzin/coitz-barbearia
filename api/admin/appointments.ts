import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateAdmin } from "../_utils/auth.js";
import { db } from "../../src/db/index.js";
import { appointments } from "../../src/db/schema.js";
import { setCorsHeaders, safeError } from "../_utils/security.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCorsHeaders(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: "Method not allowed" });
  
  const admin = authenticateAdmin(req, res);
  if (!admin) return;

  try {
    const allAppointments = await db.select().from(appointments).orderBy(appointments.startTime);
    res.json(allAppointments);
  } catch (error) {
    safeError(res, error, "ADMIN_APPOINTMENTS_LIST");
  }
}
