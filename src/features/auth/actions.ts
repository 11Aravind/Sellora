"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseDbError, friendlyMessage, type ActionResult } from "@/lib/errors";
import type { Database } from "@/types/database";
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  onboardingSchema,
  SLUG_REGEX,
  type LoginInput,
  type SignupInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type OnboardingInput,
} from "./schemas";
import { resolveHome } from "./queries";

type PlanRow = Database["public"]["Tables"]["plans"]["Row"];

const RESERVED_SLUGS = new Set([
  "www",
  "app",
  "admin",
  "api",
  "dashboard",
  "super-admin",
  "static",
  "assets",
  "mail",
  "support",
  "help",
  "blog",
  "docs",
  "status",
  "login",
  "signup",
  "stores",
  "pricing",
]);

export async function loginAction(
  input: LoginInput
): Promise<ActionResult<{ redirectUrl: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      ok: false,
      code: error.code ?? "AUTH_FAILED",
      message: error.message || "Invalid email or password",
    };
  }

  const redirectUrl = await resolveHome(data.user);
  return { ok: true, data: { redirectUrl } };
}

export async function signupAction(
  input: SignupInput
): Promise<ActionResult<{ requiresEmailConfirmation: boolean }>> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const headerList = await headers();
  const origin = headerList.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    return {
      ok: false,
      code: error.code ?? "SIGNUP_FAILED",
      message: error.message,
    };
  }

  // If user session is returned immediately, email confirmation is off
  const requiresEmailConfirmation = !data.session;

  return { ok: true, data: { requiresEmailConfirmation } };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPasswordAction(
  input: ForgotPasswordInput
): Promise<ActionResult<{ message: string }>> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid email",
    };
  }

  const headerList = await headers();
  const origin = headerList.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return {
      ok: false,
      code: error.code ?? "FORGOT_PASSWORD_FAILED",
      message: error.message,
    };
  }

  return {
    ok: true,
    data: {
      message: "If an account exists with this email, a password reset link has been sent.",
    },
  };
}

export async function resetPasswordAction(
  input: ResetPasswordInput
): Promise<ActionResult<{ message: string }>> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid password",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      ok: false,
      code: error.code ?? "RESET_PASSWORD_FAILED",
      message: error.message,
    };
  }

  return {
    ok: true,
    data: { message: "Password updated successfully. You can now sign in." },
  };
}

export async function checkSlugAvailability(
  slug: string
): Promise<{ available: boolean; message?: string }> {
  const normalized = slug.trim().toLowerCase();

  if (normalized.length < 3) {
    return { available: false, message: "Store link must be at least 3 characters." };
  }

  if (!SLUG_REGEX.test(normalized)) {
    return {
      available: false,
      message: "Use 3-40 lowercase letters, numbers, or hyphens.",
    };
  }

  if (RESERVED_SLUGS.has(normalized)) {
    return { available: false, message: "This store link is reserved." };
  }

  try {
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("tenants")
      .select("id")
      .eq("slug", normalized)
      .maybeSingle();

    if (error) {
      console.error("[checkSlugAvailability error]:", error);
      return { available: true };
    }

    return { available: !data, message: data ? "That store link is already taken." : undefined };
  } catch (err) {
    console.error("[checkSlugAvailability exception]:", err);
    return { available: true };
  }
}

export async function createTenantAction(
  input: OnboardingInput
): Promise<ActionResult<{ redirectUrl: string }>> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      code: "AUTH_REQUIRED",
      message: "You must be signed in to create a store.",
    };
  }

  // 1. Fetch chosen plan to know pricing/trial logic
  const { data: rawPlan, error: planError } = await supabase
    .from("plans")
    .select("id, code, price_paise, trial_days, is_active")
    .eq("code", parsed.data.planCode)
    .single();

  const plan = rawPlan as Pick<PlanRow, "id" | "code" | "price_paise" | "trial_days" | "is_active"> | null;

  if (planError || !plan || !plan.is_active) {
    return {
      ok: false,
      code: "PLAN_NOT_FOUND",
      message: "The selected subscription plan is no longer active. Please choose another plan.",
    };
  }

  // 2. Call RPC create_tenant(p_name, p_slug, p_plan_code)
  const { error: rpcError } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: string | null; error: Error | null }>)("create_tenant", {
    p_name: parsed.data.name.trim(),
    p_slug: parsed.data.slug.trim().toLowerCase(),
    p_plan_code: parsed.data.planCode,
  });

  if (rpcError) {
    console.error("[create_tenant RPC error]:", rpcError);
    const code = parseDbError(rpcError);
    if (code === "23505") {
      return {
        ok: false,
        code: "23505",
        message: "That store link is taken.",
      };
    }
    return {
      ok: false,
      code,
      message: friendlyMessage(code),
    };
  }

  // 3. Determine redirect URL:
  // If plan has trial_days > 0 or price is 0 -> /dashboard/{slug}
  // Otherwise (paid, no trial) -> /dashboard/{slug}/billing?subscribe=1
  const slug = parsed.data.slug.trim().toLowerCase();
  const hasTrial = (plan.trial_days ?? 0) > 0;
  const isFree = (plan.price_paise ?? 0) === 0;

  const redirectUrl =
    hasTrial || isFree
      ? `/dashboard/${slug}`
      : `/dashboard/${slug}/billing?subscribe=1`;

  return {
    ok: true,
    data: { redirectUrl },
  };
}
