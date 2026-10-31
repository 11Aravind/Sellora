import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { StorefrontTenant } from "./types";

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

/**
 * Fetches public storefront tenant data by store slug.
 * Wrapped in React cache() to deduplicate requests across layouts and pages within a single render cycle.
 */
export const getStorefrontTenant = cache(
  async (slug: string): Promise<StorefrontTenant | null> => {
    if (!slug) return null;

    const supabase = await createClient();
    const callRpc = supabase.rpc as unknown as RpcCaller;

    const { data, error } = await callRpc("storefront_tenant", {
      p_slug: slug.toLowerCase(),
    });

    if (error) {
      console.error(`[getStorefrontTenant] RPC error for slug "${slug}":`, error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const tenant = data[0];
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      logo_url: tenant.logo_url,
      settings: (tenant.settings as Record<string, unknown>) ?? null,
      is_open: Boolean(tenant.is_open),
    };
  }
);
