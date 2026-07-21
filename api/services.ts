import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from "../src/db/index.js";
import { services } from "../src/db/schema.js";
import { setCorsHeaders } from "./_utils/security.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCorsHeaders(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: "Method not allowed" });
  try {
    const allServices = await db.select().from(services);
    res.json(allServices);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}
