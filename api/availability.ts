import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from "../src/db/index.js";
import { appointments, barbers } from "../src/db/schema.js";
import { eq, and, gte, lt, or } from "drizzle-orm";
import { setCorsHeaders } from "./_utils/security.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS (GET is safe but needs CORS headers for frontend fetch)
  if (setCorsHeaders(req, res)) return;
  
  if (req.method !== 'GET') return res.status(405).json({ error: "Method not allowed" });
  
  const { date, barberId } = req.query;
  if (!date || typeof date !== 'string') return res.status(400).json({ error: "Date is required" });
  
  // Validate date format: YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
  }

  try {
    // ---------------------------------------------------------------------------
    // Timezone fix: We store times as local strings (e.g. "2025-07-21T09:00:00")
    // WITHOUT timezone suffix. The frontend sends date as "YYYY-MM-DD".
    // We query by string prefix match — no Date object parsing needed.
    // This avoids the bug where new Date("2025-07-21T00:00:00") on Vercel (UTC)
    // returns a different getDay() than the user's local timezone.
    // ---------------------------------------------------------------------------
    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59`;

    const booked = await db.select().from(appointments).where(
      and(
        gte(appointments.startTime, dayStart),
        lt(appointments.startTime, dayEnd),
        or(eq(appointments.status, 'confirmed'), eq(appointments.status, 'completed'))
      )
    );
    
    const allBarbers = barberId 
      ? await db.select().from(barbers).where(eq(barbers.id, Number(barberId)))
      : await db.select().from(barbers);

    // Day-of-week: parse from date string directly to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    // month - 1 because Date constructor uses 0-indexed months.
    // This creates a date at local midnight, and getDay() returns correctly
    // regardless of the server's timezone since we're using explicit Y/M/D.

    // Sunday = closed
    if (dayOfWeek === 0) return res.json({ availableSlots: [] });
    
    const closingHour = dayOfWeek === 6 ? 18 : 20;
    const pad = (n: number) => n.toString().padStart(2, '0');
      
    const availableSlots = [];
    for (let hour = 9; hour < closingHour; hour++) {
      for (const b of allBarbers) {
        const slotTimeString = `${date}T${pad(hour)}:00:00`;
        const isBooked = booked.some(a => a.barberId === b.id && a.startTime === slotTimeString);
        if (!isBooked) {
          availableSlots.push({ time: slotTimeString, barberId: b.id });
        }
      }
    }
    res.json({ availableSlots });
  } catch (error) {
    console.error("[AVAILABILITY]", error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ error: "Server error" });
  }
}
