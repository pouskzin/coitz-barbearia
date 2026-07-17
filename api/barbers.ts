import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from "../src/db/index.js";
import { barbers } from "../src/db/schema.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: "Method not allowed" });
  try {
    const allBarbers = await db.select().from(barbers);
    res.json(allBarbers);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}
