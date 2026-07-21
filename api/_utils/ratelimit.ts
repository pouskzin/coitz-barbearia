/**
 * Rate limiting with Upstash Redis (free tier).
 * 
 * Graceful Degradation: FAIL-OPEN
 * If Redis is unavailable, requests are ALLOWED through.
 * Rationale: In a pre-revenue MVP, losing a real appointment is worse
 * than allowing occasional spam. Rate limiting is defense-in-depth,
 * not the sole control (double-booking is prevented by DB transaction).
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn("[RATELIMIT] Upstash env vars not set — rate limiting disabled (fail-open).");
    return null;
  }
  redis = new Redis({ url, token });
  return redis;
}

// ---------------------------------------------------------------------------
// Appointment rate limiter: 5 requests per 60 seconds per IP (configurable)
// ---------------------------------------------------------------------------
function parseLimit(envValue: string | undefined, defaultRequests: number, defaultWindow: string): { requests: number; window: string } {
  if (!envValue) return { requests: defaultRequests, window: defaultWindow };
  // Format: "requests,window" e.g. "5,60s" or "10,1m"
  const [r, w] = envValue.split(',');
  return { requests: parseInt(r, 10) || defaultRequests, window: w || defaultWindow };
}

export async function checkAppointmentRateLimit(ip: string): Promise<{ allowed: boolean; remaining?: number }> {
  const r = getRedis();
  if (!r) return { allowed: true }; // fail-open

  try {
    const { requests, window } = parseLimit(
      process.env.RATE_LIMIT_APPOINTMENTS,
      5,
      "60 s" as any
    );

    const limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(requests, window as any),
      prefix: "rl:appointments",
    });

    const result = await limiter.limit(ip);
    return { allowed: result.success, remaining: result.remaining };
  } catch (error) {
    console.error("[RATELIMIT] Redis error, failing open:", error instanceof Error ? error.message : 'Unknown');
    return { allowed: true }; // fail-open
  }
}

// ---------------------------------------------------------------------------
// Login rate limiter: 5 attempts per 15 minutes per IP+email (anti brute-force)
// ---------------------------------------------------------------------------
export async function checkLoginRateLimit(ip: string, email: string): Promise<{ allowed: boolean; remaining?: number }> {
  const r = getRedis();
  if (!r) return { allowed: true }; // fail-open

  try {
    const limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(5, "900 s" as any),
      prefix: "rl:login",
    });

    // Combine IP + email for the identifier
    const identifier = `${ip}:${email.toLowerCase()}`;
    const result = await limiter.limit(identifier);
    return { allowed: result.success, remaining: result.remaining };
  } catch (error) {
    console.error("[RATELIMIT] Redis error, failing open:", error instanceof Error ? error.message : 'Unknown');
    return { allowed: true }; // fail-open
  }
}
