import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateAdmin } from "../../_utils/auth.js";
import { db } from "../../../src/db/index.js";
import { appointments } from "../../../src/db/schema.js";
import { eq } from "drizzle-orm";
import { sendWhatsAppMessage } from "../../../src/lib/whatsapp.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: "Method not allowed" });
  
  const admin = authenticateAdmin(req, res);
  if (!admin) return;

  try {
    const { status } = req.body;
    const { id } = req.query;
    const appointmentId = parseInt(id as string, 10);
    
    if (isNaN(appointmentId)) return res.status(400).json({ error: "Invalid ID" });
    if (!['confirmed', 'completed', 'cancelled', 'no_show'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    await db.update(appointments)
      .set({ status })
      .where(eq(appointments.id, appointmentId));
      
    if (status === 'completed') {
      const aptInfo = await db.select().from(appointments).where(eq(appointments.id, appointmentId));
      if (aptInfo.length > 0 && aptInfo[0].clientPhone) {
        const msg = `Olá, ${aptInfo[0].clientName}!\n\nAgradecemos a preferência pela *Coitz Barbearia*. Volte sempre!`;
        await sendWhatsAppMessage(aptInfo[0].clientPhone, msg);
      }
    }
    res.json({ message: "Status updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}
