/**
 * Refresh token utilities.
 * Tokens are random UUIDs — only the SHA-256 hash is stored in the database.
 */
import { randomUUID, createHash } from 'crypto';
import { db } from "../../src/db/index.js";
import { refreshTokens } from "../../src/db/schema.js";
import { eq, and, isNull } from "drizzle-orm";

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

/**
 * Hash a raw token with SHA-256 for storage.
 */
export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Generate a new refresh token, store its hash in the DB, return the raw token.
 */
export async function createRefreshToken(userId: number): Promise<string> {
  const rawToken = randomUUID();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(refreshTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return rawToken;
}

/**
 * Validate a refresh token: check hash exists, not revoked, not expired.
 * Returns the userId if valid, null otherwise.
 */
export async function validateRefreshToken(rawToken: string): Promise<{ userId: number; tokenId: number } | null> {
  const tokenHash = hashToken(rawToken);

  const rows = await db.select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt)
      )
    );

  if (rows.length === 0) return null;

  const row = rows[0];

  // Check expiration
  if (new Date() > row.expiresAt) return null;

  return { userId: row.userId, tokenId: row.id };
}

/**
 * Revoke a refresh token by setting revokedAt.
 */
export async function revokeRefreshToken(tokenId: number): Promise<void> {
  await db.update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, tokenId));
}

/**
 * Revoke ALL refresh tokens for a user (used on logout).
 */
export async function revokeAllUserTokens(userId: number): Promise<void> {
  await db.update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokens.userId, userId),
        isNull(refreshTokens.revokedAt)
      )
    );
}

/**
 * Build the Set-Cookie string for the refresh token.
 * Path is restricted to /api/admin/refresh — browser won't send it on other routes.
 */
export function buildRefreshCookie(rawToken: string): string {
  const maxAge = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
  return `refresh_token=${rawToken}; HttpOnly; Secure; SameSite=Lax; Path=/api/admin/refresh; Max-Age=${maxAge}`;
}

/**
 * Build the Set-Cookie string to CLEAR the refresh token.
 */
export function clearRefreshCookie(): string {
  return `refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/api/admin/refresh; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
