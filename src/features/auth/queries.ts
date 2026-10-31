import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { MyTenant } from "./types";

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser(nextPath?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    const query = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/login${query}`);
  }
  return user;
}

export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error || !data) return false;
  return Boolean(data);
}

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  status: "active" | "suspended";
}

interface MemberRow {
  role: "owner" | "admin" | "staff";
  tenants: TenantRow | null;
}

export async function getMyTenants(): Promise<MyTenant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenant_members")
    .select(`
      role,
      tenants (
        id,
        slug,
        name,
        status
      )
    `);

  if (error || !data) {
    return [];
  }

  const members = data as unknown as MemberRow[];

  return members
    .filter((item): item is MemberRow & { tenants: TenantRow } => item.tenants !== null)
    .map((item) => ({
      id: item.tenants.id,
      slug: item.tenants.slug,
      name: item.tenants.name,
      role: item.role,
      status: item.tenants.status,
    }));
}

export async function resolveHome(user?: User | null): Promise<string> {
  if (!user) {
    user = await getCurrentUser();
    if (!user) return "/login";
  }

  // 1. Super admin -> /super-admin
  const admin = await isPlatformAdmin();
  if (admin) {
    return "/super-admin";
  }

  // 2. Tenants owned / accessible
  const tenants = await getMyTenants();
  if (tenants.length === 1) {
    return `/dashboard/${tenants[0].slug}`;
  }
  if (tenants.length > 1) {
    return "/dashboard";
  }

  // 3. No store yet -> /onboarding
  return "/onboarding";
}
