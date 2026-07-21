import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from "../src/db/index.js";
import { appointments, services } from "../src/db/schema.js";
import { eq, and, or, sql } from "drizzle-orm";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { sendWhatsAppMessage } from "./_utils/whatsapp.js";
import { setCorsHeaders, validateCsrf, safeError, maskPhone, maskName } from "./_utils/security.js";
import { checkAppointmentRateLimit } from "./_utils/ratelimit.js";
import { waitUntil } from "@vercel/functions";

// ---------------------------------------------------------------------------
// Input schema — rigorous sanitization
// ---------------------------------------------------------------------------
const appointmentSchema = z.object({
  clientName: z.string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome muito longo")
    .transform(s => s.replace(/[<>"'`;]/g, '')),   // strip dangerous chars
  clientPhone: z.string()
    .trim()
    .min(10, "Telefone inválido")
    .max(20, "Telefone muito longo")
    .regex(/^[\d\s()+-]+$/, "Telefone contém caracteres inválidos"),
  clientEmail: z.string().email().optional().or(z.literal("")),
  barberId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  startTime: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/, "Formato de horário inválido (esperado: YYYY-MM-DDTHH:mm:ss)"),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  if (setCorsHeaders(req, res)) return;
  
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  // CSRF
  if (!validateCsrf(req, res)) return;

  // Rate limiting
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
  const rateCheck = await checkAppointmentRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: "Muitas tentativas. Aguarde um momento." });
  }

  try {
    const data = appointmentSchema.parse(req.body);

    // Validate service exists
    const serviceData = await db.select().from(services).where(eq(services.id, data.serviceId));
    if (serviceData.length === 0) return res.status(400).json({ error: "Invalid service" });
    
    const price = serviceData[0].price;
    const startTimeStr = data.startTime;
    const startTimeObj = new Date(startTimeStr);
    const durationMs = (serviceData[0].durationMinutes || 60) * 60 * 1000;
    const endTimeObj = new Date(startTimeObj.getTime() + durationMs);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const endTimeStr = `${endTimeObj.getFullYear()}-${pad(endTimeObj.getMonth()+1)}-${pad(endTimeObj.getDate())}T${pad(endTimeObj.getHours())}:${pad(endTimeObj.getMinutes())}:00`;

    // ---------------------------------------------------------------------------
    // Idempotency: check for duplicate within last 60 seconds
    // Key = clientPhone + barberId + startTime (natural composite key)
    // ---------------------------------------------------------------------------
    const recentDuplicate = await db.select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.clientPhone, data.clientPhone),
          eq(appointments.barberId, data.barberId),
          eq(appointments.startTime, startTimeStr),
          or(eq(appointments.status, 'confirmed'), eq(appointments.status, 'completed'))
        )
      );
    
    if (recentDuplicate.length > 0) {
      // Idempotent response — same success message, no duplicate created
      return res.json({ message: "Appointment confirmed" });
    }

    // ---------------------------------------------------------------------------
    // Atomic transaction with row-level lock to prevent double-booking.
    // SELECT ... FOR UPDATE locks the matching rows for the duration of the
    // transaction. A concurrent request for the same slot will WAIT for this
    // transaction to commit, then find the row and correctly abort.
    // ---------------------------------------------------------------------------
    await db.transaction(async (tx) => {
      // Lock existing appointments for this barber+time slot
      const conflicts = await tx
        .select({ id: appointments.id })
        .from(appointments)
        .where(
          and(
            eq(appointments.barberId, data.barberId),
            eq(appointments.startTime, startTimeStr),
            or(eq(appointments.status, 'confirmed'), eq(appointments.status, 'completed'))
          )
        )
        .for('update');

      if (conflicts.length > 0) {
        throw new DoubleBookingError();
      }

      await tx.insert(appointments).values({
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail || null,
        barberId: data.barberId,
        serviceId: data.serviceId,
        startTime: startTimeStr,
        endTime: endTimeStr,
        totalPrice: price,
        status: "confirmed",
        notificationStatus: "pending",
      });
    });
    
    // ---------------------------------------------------------------------------
    // Respond immediately — WhatsApp runs in background via waitUntil
    // ---------------------------------------------------------------------------
    res.json({ message: "Appointment confirmed" });

    // Background task: send WhatsApp notification
    const formattedDate = format(startTimeObj, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
    const message = `Olá, ${data.clientName}!\n\nSeu agendamento na *Coitz Barbearia* está confirmado para:\n📅 ${formattedDate}\n\n📍 Av. Dr. João de Aguiar, 500 - Jacarezinho/PR\n\nAté lá!`;

    waitUntil(
      sendWhatsAppMessage(data.clientPhone, message)
        .then(async (success) => {
          // Update notification status for admin visibility
          try {
            const status = success ? 'sent' : 'failed';
            await db.update(appointments)
              .set({ notificationStatus: status })
              .where(
                and(
                  eq(appointments.clientPhone, data.clientPhone),
                  eq(appointments.startTime, startTimeStr),
                  eq(appointments.status, 'confirmed')
                )
              );
          } catch (dbErr) {
            console.error(`[BG] Failed to update notification status for appointment`);
          }
        })
        .catch(err => {
          console.error(`[BG] WhatsApp send failed for phone ***${data.clientPhone.slice(-4)}`);
        })
    );

  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ errors: error.issues });
    if (error instanceof DoubleBookingError) return res.status(400).json({ error: "Time slot already booked" });
    safeError(res, error, "APPOINTMENTS");
  }
}

// Typed error for double-booking detection in catch block
class DoubleBookingError extends Error {
  constructor() {
    super("Time slot already booked");
    this.name = "DoubleBookingError";
  }
}
