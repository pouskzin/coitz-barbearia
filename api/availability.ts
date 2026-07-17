import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from "../src/db/index.js";
import { appointments, barbers } from "../src/db/schema.js";
import { eq, and, gte, lt, or } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: "Method not allowed" });
  
  const { date, barberId } = req.query;
  if (!date || typeof date !== 'string') return res.status(400).json({ error: "Date is required" });
  
  const startDate = new Date(`${date}T00:00:00`); 
  
  try {
    let query = db.select().from(appointments).where(
      and(
        gte(appointments.startTime, `${date}T00:00:00`),
        lt(appointments.startTime, `${date}T23:59:59`),
        or(eq(appointments.status, 'confirmed'), eq(appointments.status, 'completed'))
      )
    );
    
    const booked = await query;
    const bookedByBarber = barberId ? booked.filter(a => a.barberId === Number(barberId)) : booked;
    const dayOfWeek = startDate.getDay();
    if (dayOfWeek === 0) return res.json({ availableSlots: [] });
    
    const closingHour = dayOfWeek === 6 ? 18 : 20;
    const allBarbers = barberId 
      ? await db.select().from(barbers).where(eq(barbers.id, Number(barberId)))
      : await db.select().from(barbers);
      
    const availableSlots = [];
    for (let hour = 9; hour < closingHour; hour++) {
      for (const b of allBarbers) {
        const slotTimeString = `${date}T${hour.toString().padStart(2, '0')}:00:00`;
        const isBooked = booked.some(a => a.barberId === b.id && a.startTime === slotTimeString);
        if (!isBooked) {
           availableSlots.push({ time: slotTimeString, barberId: b.id });
        }
      }
    }
    res.json({ availableSlots });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}
