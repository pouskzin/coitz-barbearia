/**
 * Sentry initialization for Vercel Serverless Functions.
 * Free tier: 5,000 errors/month.
 * 
 * PII scrubbing: masks phone numbers, client names, and emails
 * before any data leaves the server (LGPD compliance).
 */
import * as Sentry from '@sentry/node';

const SENTRY_DSN = process.env.SENTRY_DSN;

let initialized = false;

export function initSentry(): void {
  if (initialized || !SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.VERCEL_ENV || 'development',
    tracesSampleRate: 0, // No performance tracing on free tier

    beforeSend(event) {
      // Scrub PII from exception values and breadcrumbs
      return scrubPii(event);
    },
  });

  initialized = true;
}

/**
 * Capture an exception in Sentry (fire-and-forget).
 * Never throws — isolated from the main request flow.
 */
export function captureError(error: unknown, context?: string): void {
  if (!SENTRY_DSN) return;

  try {
    initSentry();
    Sentry.withScope((scope) => {
      if (context) scope.setTag('context', context);
      scope.setFingerprint(context ? [context] : undefined as any);
      Sentry.captureException(error);
    });
  } catch {
    // Sentry failure must never affect the request
  }
}

// ---------------------------------------------------------------------------
// PII Scrubbing
// ---------------------------------------------------------------------------
const PHONE_REGEX = /(\+?\d[\d\s()-]{8,18}\d)/g;
const EMAIL_REGEX = /[\w.-]+@[\w.-]+\.\w{2,}/g;

function scrubPii(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  // Scrub exception messages
  if (event.exception?.values) {
    for (const ex of event.exception.values) {
      if (ex.value) {
        ex.value = maskString(ex.value);
      }
    }
  }

  // Scrub breadcrumb messages
  if (event.breadcrumbs) {
    for (const bc of event.breadcrumbs) {
      if (bc.message) {
        bc.message = maskString(bc.message);
      }
    }
  }

  // Scrub request body (if captured)
  if (event.request?.data) {
    if (typeof event.request.data === 'string') {
      event.request.data = maskString(event.request.data);
    } else if (typeof event.request.data === 'object') {
      const data = event.request.data as Record<string, any>;
      if (data.clientName) data.clientName = '[REDACTED]';
      if (data.clientPhone) data.clientPhone = '[REDACTED]';
      if (data.clientEmail) data.clientEmail = '[REDACTED]';
      if (data.client_name) data.client_name = '[REDACTED]';
      if (data.client_phone) data.client_phone = '[REDACTED]';
      if (data.client_email) data.client_email = '[REDACTED]';
    }
  }

  return event;
}

function maskString(str: string): string {
  return str
    .replace(PHONE_REGEX, '[PHONE_REDACTED]')
    .replace(EMAIL_REGEX, '[EMAIL_REDACTED]');
}
