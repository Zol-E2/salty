// Database-backed rate limiting using the rate_limits table
// Uses atomic INSERT ... ON CONFLICT for race-condition safety
// Fails open on DB errors (don't block users due to rate limit infrastructure issues)

import { createClient } from 'npm:@supabase/supabase-js@2';

interface RateLimitConfig {
  maxRequests: number;
  windowMinutes: number;
}

// Rate limit defaults per endpoint
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'generate-meal-plan': { maxRequests: 10, windowMinutes: 60 },
};

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit(
  identifier: string,
  endpoint: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[endpoint];
  if (!config) {
    return { allowed: true, remaining: 999, resetAt: new Date() };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    // Fail open if config is missing
    console.error('Rate limit: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return { allowed: true, remaining: 0, resetAt: new Date() };
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const windowMs = config.windowMinutes * 60 * 1000;
  const windowStart = new Date(
    Math.floor(Date.now() / windowMs) * windowMs
  );
  const resetAt = new Date(windowStart.getTime() + windowMs);

  try {
    const { data, error } = await supabaseAdmin.rpc('increment_rate_limit', {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_window_start: windowStart.toISOString(),
    });

    if (error) {
      // Fail open on rate limit errors
      console.error('Rate limit check failed:', error);
      return { allowed: true, remaining: 0, resetAt };
    }

    const count = data as number;
    const remaining = Math.max(0, config.maxRequests - count);

    return {
      allowed: count <= config.maxRequests,
      remaining,
      resetAt,
    };
  } catch (err) {
    // Fail open on unexpected errors
    console.error('Rate limit unexpected error:', err);
    return { allowed: true, remaining: 0, resetAt };
  }
}
