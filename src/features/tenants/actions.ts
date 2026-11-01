"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, isPlatformAdmin } from "@/features/auth/queries";
import { parseDbError, friendlyMessage, type ActionResult } from "@/lib/errors";
import {
  storeSettingsSchema,
  customDomainSchema,
  addMemberSchema,
  updateMemberRoleSchema,
  type StoreSettingsInput,
  type AddMemberInput,
  type UpdateMemberRoleInput,
} from "./schemas";

type RpcCaller = (
  fn: string,
  args?: Record<string, unknown>
) => Promise<{ data: unknown; error: { message: string } | null }>;

/**
 * Super Admin action to suspend or reactivate a store.
 */
export async function adminSetTenantStatusAction(
  tenantId: string,
  status: "active" | "suspended"
): Promise<ActionResult<void>> {
  const admin = await isPlatformAdmin();
  if (!admin) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "You are not authorized to perform super-admin operations.",
    };
  }

  if (status !== "active" && status !== "suspended") {
    return {
      ok: false,
      code: "INVALID_STATUS",
      message: "Invalid status value provided.",
    };
  }

  const supabase = await createClient();
  const callRpc = supabase.rpc as unknown as RpcCaller;

  const { error } = await callRpc("admin_set_tenant_status", {
    p_tenant: tenantId,
    p_status: status,
  });

  if (error) {
    return {
      ok: false,
      code: "RPC_ERROR",
      message: error.message || "Failed to update tenant status.",
    };
  }

  revalidatePath("/super-admin");
  revalidatePath("/super-admin/stores");
  revalidatePath(`/super-admin/stores/${tenantId}`);

  return { ok: true, data: undefined };
}

/**
 * Helper to ensure current user is an owner or admin of the tenant.
 */
async function verifyTenantAdmin(tenantId: string): Promise<ActionResult<{ userId: string; role: string }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, code: "AUTH_REQUIRED", message: "You must be signed in." };
  }

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  const mem = member as unknown as { role: string } | null;

  if (!mem || (mem.role !== "owner" && mem.role !== "admin")) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Only store owners and admins can manage store settings and team members.",
    };
  }

  return { ok: true, data: { userId: user.id, role: mem.role } };
}

/**
 * Updates general store settings and branding theme attributes.
 */
export async function updateStoreSettingsAction(
  tenantId: string,
  data: StoreSettingsInput
): Promise<ActionResult<void>> {
  const authCheck = await verifyTenantAdmin(tenantId);
  if (!authCheck.ok) return authCheck;

  const parsed = storeSettingsSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "Invalid store settings data.",
    };
  }

  const supabase = await createClient();

  const newSettings = {
    primaryColor: parsed.data.primaryColor,
    tagline: parsed.data.tagline || null,
    bannerUrl: parsed.data.bannerUrl || null,
    contactEmail: parsed.data.contactEmail || null,
    contactPhone: parsed.data.contactPhone || null,
    address: parsed.data.address || null,
  };

  type TenantUpdate = {
    update: (vals: Record<string, unknown>) => {
      eq: (col: string, val: unknown) => Promise<{ error: Error | null }>;
    };
  };

  const { error } = await (supabase.from("tenants") as unknown as TenantUpdate)
    .update({
      name: parsed.data.name,
      logo_url: parsed.data.logoUrl || null,
      settings: newSettings,
    })
    .eq("id", tenantId);

  if (error) {
    return {
      ok: false,
      code: parseDbError(error),
      message: error.message || "Failed to update store settings.",
    };
  }

  revalidatePath(`/dashboard`);
  return { ok: true, data: undefined };
}

/**
 * Updates or removes custom domain for the store.
 */
export async function updateCustomDomainAction(
  tenantId: string,
  data: { customDomain?: string | null }
): Promise<ActionResult<void>> {
  const authCheck = await verifyTenantAdmin(tenantId);
  if (!authCheck.ok) return authCheck;

  const parsed = customDomainSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "Invalid custom domain.",
    };
  }

  const domain = parsed.data.customDomain || null;
  const supabase = await createClient();

  type TenantUpdate = {
    update: (vals: Record<string, unknown>) => {
      eq: (col: string, val: unknown) => Promise<{ error: Error | null }>;
    };
  };

  const { error } = await (supabase.from("tenants") as unknown as TenantUpdate)
    .update({ custom_domain: domain })
    .eq("id", tenantId);

  if (error) {
    const code = parseDbError(error);
    return {
      ok: false,
      code,
      message: friendlyMessage(code),
    };
  }

  revalidatePath(`/dashboard`);
  return { ok: true, data: undefined };
}

/**
 * Adds an existing user to the tenant team by email.
 */
export async function addTeamMemberAction(
  tenantId: string,
  data: AddMemberInput
): Promise<ActionResult<{ id: string }>> {
  const authCheck = await verifyTenantAdmin(tenantId);
  if (!authCheck.ok) return authCheck;

  const parsed = addMemberSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "Invalid member data.",
    };
  }

  const targetEmail = parsed.data.email.toLowerCase().trim();
  const adminClient = createAdminClient();

  // Find target user by email in auth.users
  const { data: usersData, error: listErr } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listErr || !usersData?.users) {
    return {
      ok: false,
      code: "AUTH_ERROR",
      message: "Could not query user records.",
    };
  }

  const targetUser = usersData.users.find(
    (u) => u.email?.toLowerCase().trim() === targetEmail
  );

  if (!targetUser) {
    return {
      ok: false,
      code: "USER_NOT_FOUND",
      message: "Ask them to sign up first, then add them.",
    };
  }

  // Check if target user is already a member of this tenant
  const { data: existing } = await adminClient
    .from("tenant_members")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", targetUser.id)
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      code: "ALREADY_MEMBER",
      message: "This user is already a member of this store team.",
    };
  }

  // Insert into tenant_members (enforcing trigger tenant_members_enforce_limit)
  type MemberInsert = {
    insert: (vals: Record<string, unknown>) => {
      select: (col: string) => {
        single: () => Promise<{ data: { id: string } | null; error: Error | null }>;
      };
    };
  };

  const { data: newMem, error: insertErr } = await (
    adminClient.from("tenant_members") as unknown as MemberInsert
  )
    .insert({
      tenant_id: tenantId,
      user_id: targetUser.id,
      role: parsed.data.role,
    })
    .select("id")
    .single();

  if (insertErr || !newMem) {
    const code = parseDbError(insertErr);
    return {
      ok: false,
      code,
      message: friendlyMessage(code),
    };
  }

  revalidatePath(`/dashboard`);
  return { ok: true, data: { id: newMem.id } };
}

/**
 * Changes a team member's role (admin <-> staff).
 */
export async function updateTeamMemberRoleAction(
  tenantId: string,
  memberId: string,
  data: UpdateMemberRoleInput
): Promise<ActionResult<void>> {
  const authCheck = await verifyTenantAdmin(tenantId);
  if (!authCheck.ok) return authCheck;

  const parsed = updateMemberRoleSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Invalid role selection.",
    };
  }

  const adminClient = createAdminClient();

  // Verify target is not an owner
  const { data: targetMem } = await adminClient
    .from("tenant_members")
    .select("role")
    .eq("id", memberId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const mem = targetMem as unknown as { role: string } | null;
  if (!mem) {
    return { ok: false, code: "NOT_FOUND", message: "Team member not found." };
  }

  if (mem.role === "owner") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "The store owner role cannot be changed.",
    };
  }

  type MemberUpdate = {
    update: (vals: Record<string, unknown>) => {
      eq: (col: string, val: unknown) => Promise<{ error: Error | null }>;
    };
  };

  const { error } = await (
    adminClient.from("tenant_members") as unknown as MemberUpdate
  )
    .update({ role: parsed.data.role })
    .eq("id", memberId);

  if (error) {
    const code = parseDbError(error);
    return { ok: false, code, message: friendlyMessage(code) };
  }

  revalidatePath(`/dashboard`);
  return { ok: true, data: undefined };
}

/**
 * Removes a member from the store team.
 */
export async function removeTeamMemberAction(
  tenantId: string,
  memberId: string
): Promise<ActionResult<void>> {
  const authCheck = await verifyTenantAdmin(tenantId);
  if (!authCheck.ok) return authCheck;

  const adminClient = createAdminClient();

  // Verify target is not an owner
  const { data: targetMem } = await adminClient
    .from("tenant_members")
    .select("role")
    .eq("id", memberId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const mem = targetMem as unknown as { role: string } | null;
  if (!mem) {
    return { ok: false, code: "NOT_FOUND", message: "Team member not found." };
  }

  if (mem.role === "owner") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "The store owner cannot be removed from the team.",
    };
  }

  const { error } = await adminClient
    .from("tenant_members")
    .delete()
    .eq("id", memberId)
    .eq("tenant_id", tenantId);

  if (error) {
    const code = parseDbError(error);
    return { ok: false, code, message: friendlyMessage(code) };
  }

  revalidatePath(`/dashboard`);
  return { ok: true, data: undefined };
}
