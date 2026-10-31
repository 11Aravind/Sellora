import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

interface CachedDomainResolution {
  slug: string | null;
  expiresAt: number;
}

interface StorefrontTenantRow {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  settings: Record<string, unknown> | null;
  is_open: boolean;
}

type RpcCaller = (
  fn: string,
  args?: Record<string, unknown>
) => Promise<{ data: StorefrontTenantRow[] | null; error: { message: string } | null }>;

const domainCache = new Map<string, CachedDomainResolution>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Resolves a custom domain to a tenant slug using Supabase RPC `storefront_tenant`.
 * In-memory results are cached for 60 seconds per host.
 */
export async function resolveCustomDomain(domain: string): Promise<string | null> {
  const normalizedDomain = domain.toLowerCase().trim();
  const now = Date.now();

  const cached = domainCache.get(normalizedDomain);
  if (cached && cached.expiresAt > now) {
    return cached.slug;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error("[resolveCustomDomain] Missing Supabase environment variables.");
    return null;
  }

  try {
    const supabase = createClient<Database>(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const callRpc = supabase.rpc as unknown as RpcCaller;
    const { data, error } = await callRpc("storefront_tenant", {
      p_domain: normalizedDomain,
    });

    if (error) {
      console.error(`[resolveCustomDomain] RPC error for domain "${normalizedDomain}":`, error.message);
      return null;
    }

    const tenant = data?.[0];
    const resolvedSlug = tenant?.slug || null;

    domainCache.set(normalizedDomain, {
      slug: resolvedSlug,
      expiresAt: now + CACHE_TTL_MS,
    });

    return resolvedSlug;
  } catch (err) {
    console.error(`[resolveCustomDomain] Unexpected error resolving domain "${normalizedDomain}":`, err);
    return null;
  }
}
