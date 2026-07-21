import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from "../../src/db/index.js";
import { appointments, refreshTokens } from "../../src/db/schema.js";
import { eq, inArray, and, or, lt, isNotNull, ne } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ---------------------------------------------------------------------------
  // CRON_SECRET validation (sent automatically by Vercel)
  // ---------------------------------------------------------------------------
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    let anonymizedCount = 0;
    let deletedTokensCount = 0;

    // ---------------------------------------------------------------------------
    // 1. LGPD Anonymization
    // Target: cancelled or no_show appointments created > 12 months ago.
    // Idempotent: clientName != '[Removido]'
    // ---------------------------------------------------------------------------
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const eligibleAppointments = await db.select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          inArray(appointments.status, ['cancelled', 'no_show']),
          lt(appointments.createdAt, twelveMonthsAgo),
          ne(appointments.clientName, '[Removido]') // Idempotency
        )
      );

    if (eligibleAppointments.length > 0) {
      const idsToAnonymize = eligibleAppointments.map(a => a.id);
      
      await db.update(appointments)
        .set({
          clientName: '[Removido]',
          clientPhone: '00000000000',
          clientEmail: null,
          notes: null,
        })
        .where(inArray(appointments.id, idsToAnonymize));
      
      anonymizedCount = idsToAnonymize.length;
    }

    // ---------------------------------------------------------------------------
    // 2. Refresh Token Cleanup
    // Target: tokens that expired > 30 days ago OR were revoked > 30 days ago.
    // ---------------------------------------------------------------------------
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const eligibleTokens = await db.select({ id: refreshTokens.id })
      .from(refreshTokens)
      .where(
        or(
          lt(refreshTokens.expiresAt, thirtyDaysAgo),
          and(isNotNull(refreshTokens.revokedAt), lt(refreshTokens.revokedAt, thirtyDaysAgo))
        )
      );

    if (eligibleTokens.length > 0) {
      const tokenIdsToDelete = eligibleTokens.map(t => t.id);
      
      await db.delete(refreshTokens)
        .where(inArray(refreshTokens.id, tokenIdsToDelete));
        
      deletedTokensCount = tokenIdsToDelete.length;
    }

    // Summary log
    console.log(`[LGPD-CLEANUP] Executed. Anonymized: ${anonymizedCount}, Deleted tokens: ${deletedTokensCount}`);

    return res.json({
      success: true,
      anonymizedCount,
      deletedTokensCount
    });
  } catch (error) {
    console.error("[LGPD-CLEANUP] Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
