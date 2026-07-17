import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from "../src/db/index.js";
import { appointments, services } from "../src/db/schema.js";
import { eq, and, or } from "drizzle-orm";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { sendWhatsAppMessage } from "../src/lib/whatsapp.js";

const appointmentSchema = z.object({
  clientName: z.string().min(2),
  clientPhone: z.string().min(10),
  clientEmail: z.string().email().optional().or(z.literal("")),
  barberId: z.number(),
  serviceId: z.number(),
  startTime: z.string(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
  
  try {
    const data = appointmentSchema.parse(req.body);
    const serviceData = await db.select().from(services).where(eq(services.id, data.serviceId));
    if (serviceData.length === 0) return res.status(400).json({ error: "Invalid service" });
    
    const price = serviceData[0].price;
    const localStartTime = data.startTime.replace('Z', '').substring(0, 19);
    const startTimeObj = new Date(localStartTime);
    const durationMs = (serviceData[0].durationMinutes || 60) * 60 * 1000;
    const endTimeObj = new Date(startTimeObj.getTime() + durationMs);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const localEndTime = `${endTimeObj.getFullYear()}-${pad(endTimeObj.getMonth()+1)}-${pad(endTimeObj.getDate())}T${pad(endTimeObj.getHours())}:${pad(endTimeObj.getMinutes())}:00`;
    
    const conflicts = await db.select().from(appointments).where(
      and(
        eq(appointments.barberId, data.barberId),
        eq(appointments.startTime, localStartTime),
        or(eq(appointments.status, 'confirmed'), eq(appointments.status, 'completed'))
      )
    );
    if (conflicts.length > 0) return res.status(400).json({ error: "Time slot already booked" });
    
    await db.insert(appointments).values({
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      clientEmail: data.clientEmail || null,
      barberId: data.barberId,
      serviceId: data.serviceId,
      startTime: localStartTime,
      endTime: localEndTime,
      totalPrice: price,
      status: "confirmed"
    });
    
    const formattedDate = format(startTimeObj, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
    const message = `Olá, ${data.clientName}!\n\nSeu agendamento na *Coitz Barbearia* está confirmado para:\n📅 ${formattedDate}\n\n📍 Av. Dr. João de Aguiar, 500 - Jacarezinho/PR\n\nAté lá!`;
    await sendWhatsAppMessage(data.clientPhone, message);
    
    res.json({ message: "Appointment confirmed" });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ errors: error.issues });
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}
