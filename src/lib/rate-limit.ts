import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
}

/**
 * Checks whether a given operation or client identifier has exceeded rate limits.
 * Uses PostgreSQL-backed atomic token bucket (`check_rate_limit` RPC).
 *
 * @param keyPrefix Action namespace (e.g. "auth:login", "order:place", "tenant:slug")
 * @param identifier Client IP, user ID, or email. Defaults to client IP from headers.
 * @param options Limit threshold and time window in seconds.
 * @returns true if allowed, false if rate limited.
 */
export async function checkRateLimit(
  keyPrefix: string,
  identifier?: string,
  options: RateLimitOptions = { limit: 10, windowSeconds: 60 }
): Promise<boolean> {
  let id = identifier;
  if (!id) {
    try {
      const h = await headers();
      id =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        h.get("x-real-ip") ||
        "127.0.0.1";
    } catch {
      id = "127.0.0.1";
    }
  }

  const rateKey = `${keyPrefix}:${id}`;
  const supabase = await createClient();

  try {
    type RateLimitRpc = {
      rpc: (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
    };

    const { data, error } = await (supabase as unknown as RateLimitRpc).rpc(
      "check_rate_limit",
      {
        p_key: rateKey,
        p_limit: options.limit,
        p_window_seconds: options.windowSeconds,
      }
    );

    if (error) {
      console.warn(
        "[checkRateLimit] Stored procedure error (failing open):",
        error.message
      );
      return true;
    }

    return data !== false;
  } catch (err) {
    console.warn("[checkRateLimit] Execution failed (failing open):", err);
    return true;
  }
}

