import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateAdmin } from "../../_utils/auth.js";
import { db } from "../../../src/db/index.js";
import { appointments } from "../../../src/db/schema.js";
import { eq } from "drizzle-orm";
import { sendWhatsAppMessage } from "../../_utils/whatsapp.js";
import { setCorsHeaders, validateCsrf, safeError } from "../../_utils/security.js";
import { waitUntil } from "@vercel/functions";

const VALID_STATUSES = ['confirmed', 'completed', 'cancelled', 'no_show'] as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCorsHeaders(req, res)) return;
  if (req.method !== 'PATCH') return res.status(405).json({ error: "Method not allowed" });
  if (!validateCsrf(req, res)) return;
  
  const admin = authenticateAdmin(req, res);
  if (!admin) return;

  try {
    const { status } = req.body;
    const { id } = req.query;
    const appointmentId = parseInt(id as string, 10);
    
    if (isNaN(appointmentId)) return res.status(400).json({ error: "Invalid ID" });
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    // Soft delete: all status changes are updates, never physical DELETE
    await db.update(appointments)
      .set({ status })
      .where(eq(appointments.id, appointmentId));
    
    // Respond immediately
    res.json({ message: "Status updated" });

    // Background: send WhatsApp notification for completed appointments
    if (status === 'completed') {
      waitUntil(
        (async () => {
          try {
            const aptInfo = await db.select().from(appointments).where(eq(appointments.id, appointmentId));
            if (aptInfo.length > 0 && aptInfo[0].clientPhone) {
              const msg = `Olá, ${aptInfo[0].clientName}!\n\nAgradecemos a preferência pela *Coitz Barbearia*. Volte sempre!`;
              const success = await sendWhatsAppMessage(aptInfo[0].clientPhone, msg);
              
              await db.update(appointments)
                .set({ notificationStatus: success ? 'sent' : 'failed' })
                .where(eq(appointments.id, appointmentId));
            }
          } catch (err) {
            console.error(`[BG] WhatsApp completion notification failed for appointment ${appointmentId}`);
          }
        })()
      );
    }
  } catch (error) {
    safeError(res, error, "ADMIN_APPOINTMENT_UPDATE");
  }
}
