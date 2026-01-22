/**
 * Simple in-memory rate limiter for MVP
 * For production, consider using Redis or similar
 */

import { env } from '@/env.mjs';

const rateLimitMap = new Map<string, number[]>();

/**
 * Check if a request should be rate limited
 * @param key - Identifier (e.g., IP address)
 * @param maxRequests - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = env.VERCEL_URL ? 10 : 1000,
  windowMs: number = 3600000, // 1 hour
): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(key) || [];

  // Remove timestamps outside the window
  const recentTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (recentTimestamps.length >= maxRequests) {
    return false; // Rate limited
  }

  // Add current timestamp
  recentTimestamps.push(now);
  rateLimitMap.set(key, recentTimestamps);

  return true; // Request allowed
}

/**
 * Clean up old entries periodically to prevent memory leak
 * Call this on server startup
 */
export function startRateLimitCleanup(intervalMs: number = 3600000) {
  setInterval(() => {
    const now = Date.now();
    const windowMs = 3600000;

    for (const [key, timestamps] of rateLimitMap.entries()) {
      const recent = timestamps.filter((t) => now - t < windowMs);
      if (recent.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, recent);
      }
    }
  }, intervalMs);
}

/**
 * Get the client IP address from request headers
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}
