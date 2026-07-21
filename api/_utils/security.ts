import type { VercelRequest, VercelResponse } from '@vercel/node';
import { captureError } from './sentry.js';

// ---------------------------------------------------------------------------
// CORS helper — sets headers on every response, handles OPTIONS preflight
// ---------------------------------------------------------------------------
const ALLOWED_ORIGIN = process.env.APP_ORIGIN || '';

export function setCorsHeaders(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin || '';

  // In development, allow localhost origins
  const isAllowed =
    origin === ALLOWED_ORIGIN ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:');

  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true; // caller should return early
  }

  return false;
}

// ---------------------------------------------------------------------------
// CSRF protection — validates Origin header on mutating requests
// With SameSite=Lax cookies, this is defense-in-depth.
// ---------------------------------------------------------------------------
export function validateCsrf(req: VercelRequest, res: VercelResponse): boolean {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method || '')) return true;

  const origin = req.headers.origin;
  // If Origin header is absent (same-origin requests in some browsers), allow
  if (!origin) return true;

  const isAllowed =
    origin === ALLOWED_ORIGIN ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:');

  if (!isAllowed) {
    res.status(403).json({ error: "Forbidden: invalid origin" });
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Safe error response — never leak internal details to client
// ---------------------------------------------------------------------------
export function safeError(res: VercelResponse, error: unknown, context: string): void {
  // Log full error server-side (Vercel Runtime Logs)
  // Mask PII: do not include client names, phones, emails in log context
  console.error(`[${context}]`, error instanceof Error ? error.message : 'Unknown error');

  // Send to Sentry (fire-and-forget — never blocks response)
  captureError(error, context);

  // Generic response to client
  res.status(500).json({ error: "Server error" });
}

// ---------------------------------------------------------------------------
// Mask PII for safe logging (LGPD compliance)
// ---------------------------------------------------------------------------
export function maskPhone(phone: string): string {
  if (phone.length <= 4) return '****';
  return '***' + phone.slice(-4);
}

export function maskName(name: string): string {
  if (name.length <= 2) return '**';
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
}
